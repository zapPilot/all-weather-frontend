// AA Exit: move everything an AA (smart) wallet holds to the user's own EOA on
// one chain, using only operations that cannot be priced wrong — unstake so the
// position becomes transferable, then a plain ERC20/ERC721 transfer. No swaps,
// no remove-liquidity, no price lookups on the principal path, so a depegged or
// unpriceable token cannot block the exit.
import { ethers } from "ethers";
import { getContract, prepareContractCall, prepareTransaction } from "thirdweb";
import { prepareUserOp } from "thirdweb/wallets/smart";
import ERC20_ABI from "../lib/contracts/ERC20.json" assert { type: "json" };
import THIRDWEB_CLIENT from "./thirdweb";
import { PROVIDER } from "./general";
import { fetchWalletTokens } from "./dustConversion";
import { getPortfolioHelper } from "./thirdwebSmartWallet.ts";
import {
  classifyEmergencyExitBatchError,
  EMERGENCY_EXIT_FAILURE_KIND as FAILURE,
} from "./emergencyExitExecution";
import logger from "./logger";

// Every vault a user can actually enter. Test-only vaults are excluded: their
// protocols either duplicate production ones or lack _unstake entirely.
export const AA_EXIT_VAULTS = [
  "Stable+ Vault",
  "ETH Vault",
  "BTC Vault",
  "Index 500 Vault",
  "Index 500+ Vault",
  "Deprecated Vault",
  "Vela Vault (Deprecated)",
];

// Strategy objects key their chains by these normalized names — note "op",
// not "optimism"
export const AA_EXIT_CHAINS = ["arbitrum", "base", "op"];

export const AA_EXIT_CHAIN_IDS = { arbitrum: 42161, base: 8453, op: 10 };

// Kept local and deliberately tiny: transformToDebankChainName in chainHelper
// silently passes unknown names through, which would build a URL the backend
// answers with an error rather than a list
const DEBANK_CHAIN_CODE = { arbitrum: "arb", base: "base", op: "op" };
const AA_EXIT_WALLET_TOKEN_CACHE_TTL_MS = 10 * 60 * 1000;
const AA_EXIT_WALLET_TOKEN_STORAGE_PREFIX = "aa-exit-wallet-tokens:v1:";
const aaExitWalletTokenCache = new Map();
const aaExitWalletTokenRequests = new Map();
let aaExitWalletTokenCacheGeneration = 0;

export const EXIT_FEE_USD = 1;

// Same treasury as the platform fee in classes/BasePortfolio.jsx:22, which
// keeps it module-private
export const PROTOCOL_TREASURY_ADDRESS =
  "0x2eCBC6f229feD06044CDb0dD772437a30190CD50";

// A stablecoin's price cannot be far wrong, so charging in one keeps the fee
// closest to its intended $1 — but any priced token will do rather than waive it
const STABLE_PRICE_BAND = [0.98, 1.02];

// Finer failure isolation in the per-group phase: one blacklisted airdrop token
// then costs its chunk of ten rather than the whole sweep
const SWEEP_CHUNK_SIZE = 10;

// Price and USD amounts are floats from a third party; 18 decimals of fixed
// point is far more than either carries meaningfully
const USD_SCALE = 18;

const ZERO = ethers.constants.Zero;
const noop = () => {};
const emitProgress = (callback, payload) => {
  try {
    callback(payload);
  } catch (error) {
    logger.warn("AA Exit: progress callback failed", error);
  }
};
const ERC20_EXIT_INTERFACE = new ethers.utils.Interface([
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

export const debankChainCode = (chainName) => {
  const code = DEBANK_CHAIN_CODE[chainName];
  if (!code) throw new Error(`Unsupported chain for AA Exit: ${chainName}`);
  return code;
};

const aaExitWalletTokenCacheKey = (chainName, owner) =>
  `${debankChainCode(chainName)}:${owner.toLowerCase()}`;

const aaExitWalletTokenStorageKey = (key) =>
  `${AA_EXIT_WALLET_TOKEN_STORAGE_PREFIX}${key}`;

const aaExitWalletTokenStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    logger.warn("AA Exit: local token cache unavailable", error);
    return null;
  }
};

const readStoredAaExitWalletTokens = (key, now) => {
  const storage = aaExitWalletTokenStorage();
  if (!storage) return null;
  const storageKey = aaExitWalletTokenStorageKey(key);
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (
      !Array.isArray(cached?.tokens) ||
      typeof cached?.fetchedAt !== "number" ||
      now - cached.fetchedAt >= AA_EXIT_WALLET_TOKEN_CACHE_TTL_MS
    ) {
      storage.removeItem(storageKey);
      return null;
    }
    return cached;
  } catch (error) {
    storage.removeItem(storageKey);
    logger.warn("AA Exit: could not read local token cache", error);
    return null;
  }
};

const storeAaExitWalletTokens = (key, cached) => {
  const storage = aaExitWalletTokenStorage();
  if (!storage) return;
  try {
    storage.setItem(aaExitWalletTokenStorageKey(key), JSON.stringify(cached));
  } catch (error) {
    logger.warn("AA Exit: could not persist local token cache", error);
  }
};

export const clearAaExitWalletTokenCache = () => {
  aaExitWalletTokenCacheGeneration += 1;
  aaExitWalletTokenCache.clear();
  aaExitWalletTokenRequests.clear();

  const storage = aaExitWalletTokenStorage();
  if (!storage) return;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(AA_EXIT_WALLET_TOKEN_STORAGE_PREFIX)) {
      storage.removeItem(key);
    }
  }
};

export const clearAaExitWalletTokenMemoryCache = () => {
  aaExitWalletTokenCache.clear();
  aaExitWalletTokenRequests.clear();
};

async function fetchAaExitWalletTokens(chainName, owner) {
  const key = aaExitWalletTokenCacheKey(chainName, owner);
  const now = Date.now();
  const memoryCached = aaExitWalletTokenCache.get(key);
  const cached = memoryCached || readStoredAaExitWalletTokens(key, now);

  if (cached && now - cached.fetchedAt < AA_EXIT_WALLET_TOKEN_CACHE_TTL_MS) {
    aaExitWalletTokenCache.set(key, cached);
    return cached.tokens;
  }
  if (memoryCached) aaExitWalletTokenCache.delete(key);

  const pending = aaExitWalletTokenRequests.get(key);
  if (pending) return pending;

  const generation = aaExitWalletTokenCacheGeneration;
  const request = fetchWalletTokens(debankChainCode(chainName), owner)
    .then((tokens) => {
      // A request that started before an explicit cache clear must never
      // repopulate stale data after the clear. This also keeps a fresh scan
      // genuinely fresh when a previous request finishes late.
      if (generation === aaExitWalletTokenCacheGeneration) {
        const cached = {
          tokens,
          fetchedAt: Date.now(),
        };
        aaExitWalletTokenCache.set(key, cached);
        storeAaExitWalletTokens(key, cached);
      }
      return tokens;
    })
    .finally(() => {
      // Do not let an old request remove a newer coalesced request for the same
      // wallet after clear + refetch.
      if (aaExitWalletTokenRequests.get(key) === request) {
        aaExitWalletTokenRequests.delete(key);
      }
    });

  aaExitWalletTokenRequests.set(key, request);
  return request;
}

/**
 * Every protocol on `chainName` across every production vault, deduped.
 * Index vaults build their own instances of the component vaults' protocols, so
 * the same position appears more than once and must be deduped by uniqueId
 * string — object identity does not hold. Sending its transfer twice would ask
 * for twice the balance and revert.
 * `weight` is ignored on purpose: a deprecated protocol is zeroed out while
 * still holding user funds, which is exactly who needs this page.
 */
export function collectExitProtocols(chainName) {
  const seen = new Set();
  const protocols = [];
  for (const vaultName of AA_EXIT_VAULTS) {
    let portfolio;
    try {
      portfolio = getPortfolioHelper(vaultName);
    } catch (error) {
      logger.warn(`AA Exit: could not build ${vaultName}, skipping it`, error);
      continue;
    }
    if (!portfolio) continue;
    for (const categories of Object.values(portfolio.strategy || {})) {
      for (const [chainKey, list] of Object.entries(categories || {})) {
        if (chainKey.toLowerCase() !== chainName) continue;
        for (const protocol of list || []) {
          const uniqueId = protocol.interface.uniqueId();
          // Camelot V3 uses one shared NFT position manager for every pool. An
          // emergency exit must sweep the manager itself, not only the pool/range
          // combinations that happen to remain in today's vault config. Keep one
          // representative protocol instance per manager so every owned Camelot
          // NFT is transferred exactly once, including old/manual positions.
          const camelotManager =
            protocol.interface.protocolName === "camelot" &&
            protocol.interface.assetIsNFT
              ? protocol.interface.assetContract?.address?.toLowerCase()
              : null;
          const dedupeKey = camelotManager
            ? `camelot-manager:${camelotManager}`
            : uniqueId;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          protocols.push({
            uniqueId: camelotManager
              ? `${chainName}/camelot/v3/all-positions`
              : uniqueId,
            label: camelotManager
              ? "Camelot V3 positions"
              : protocol.interface.toString(),
            interface: protocol.interface,
          });
        }
      }
    }
  }
  return protocols;
}

const toScaled = (value) => {
  // toFixed keeps fixed notation, which parseUnits needs: String(1e-7) is
  // "1e-7". It rounds at the 18th decimal, which for a price is a relative
  // error below 1e-14.
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return ZERO;
  return ethers.utils.parseUnits(asNumber.toFixed(USD_SCALE), USD_SCALE);
};

/**
 * How many raw token units are worth `usd` at `price`, always rounded DOWN.
 * Integer math end to end — BigNumber division truncates — so the fee can only
 * ever come out under the target, never over it.
 */
export function usdToTokenRawFloor(usd, price, decimals) {
  const decimalCount = Number(decimals);
  if (!Number.isInteger(decimalCount) || decimalCount < 0) return ZERO;
  const usdScaled = toScaled(usd);
  const priceScaled = toScaled(price);
  if (usdScaled.isZero() || priceScaled.isZero()) return ZERO;
  return usdScaled
    .mul(ethers.BigNumber.from(10).pow(decimalCount))
    .div(priceScaled);
}

const rawAmountOf = (token) => {
  try {
    return ethers.BigNumber.from(token.raw_amount_hex_str);
  } catch (error) {
    logger.warn(
      `AA Exit: unreadable balance for ${token?.optimized_symbol || token?.id}`,
      error,
    );
    return null;
  }
};

const exitPreflightError = (error) =>
  error?.error?.message || error?.reason || error?.message || String(error);

export async function preflightWalletTokens({
  walletTokens,
  owner,
  recipient,
  chainName,
  excludeAddresses = new Set(),
  provider,
  onTokenScanned = noop,
}) {
  const rpc = provider || PROVIDER(chainName);
  const candidates = new Map();

  for (const token of walletTokens || []) {
    if (!token?.id || !ethers.utils.isAddress(token.id)) continue;
    const key = token.id.toLowerCase();
    if (excludeAddresses.has(key) || candidates.has(key)) continue;
    const raw = rawAmountOf(token);
    if (!raw || raw.lte(0)) continue;
    candidates.set(key, token);
  }

  const candidateEntries = [...candidates.entries()];
  let completed = 0;
  emitProgress(onTokenScanned, {
    completed: 0,
    total: candidateEntries.length,
  });

  const results = await Promise.all(
    candidateEntries.map(async ([address, token]) => {
      try {
        const balanceResult = await rpc.call({
          to: address,
          data: ERC20_EXIT_INTERFACE.encodeFunctionData("balanceOf", [owner]),
        });
        const [balance] = ERC20_EXIT_INTERFACE.decodeFunctionResult(
          "balanceOf",
          balanceResult,
        );
        if (balance.lte(0)) {
          completed += 1;
          emitProgress(onTokenScanned, {
            completed,
            total: candidateEntries.length,
            token,
            transferable: false,
          });
          return null;
        }

        const transferResult = await rpc.call({
          from: owner,
          to: address,
          data: ERC20_EXIT_INTERFACE.encodeFunctionData("transfer", [
            recipient,
            balance,
          ]),
        });
        // Some legacy ERC20s return no data on success. When a token does return
        // the standard bool, false is still a failed transfer even without a
        // revert and must not be admitted to the atomic batch.
        if (transferResult && transferResult !== "0x") {
          const [wouldTransfer] = ERC20_EXIT_INTERFACE.decodeFunctionResult(
            "transfer",
            transferResult,
          );
          if (!wouldTransfer) throw new Error("ERC20 transfer returned false");
        }

        const result = {
          token: {
            ...token,
            raw_amount_hex_str: balance.toHexString(),
          },
        };
        completed += 1;
        emitProgress(onTokenScanned, {
          completed,
          total: candidateEntries.length,
          token,
          transferable: true,
        });
        return result;
      } catch (error) {
        logger.warn(
          `AA Exit: token ${
            token?.optimized_symbol || address
          } cannot be transferred, leaving it behind`,
          error,
        );
        const result = {
          untransferable: {
            address,
            symbol: token?.optimized_symbol || token?.symbol || "Unknown token",
            reason: exitPreflightError(error),
          },
        };
        completed += 1;
        emitProgress(onTokenScanned, {
          completed,
          total: candidateEntries.length,
          token,
          transferable: false,
        });
        return result;
      }
    }),
  );

  return {
    walletTokens: results
      .filter((result) => result?.token)
      .map((result) => result.token),
    untransferableTokens: results
      .filter((result) => result?.untransferable)
      .map((result) => result.untransferable),
  };
}

/**
 * Pick the token to take the exit fee from, and how much of it.
 * Preference order: covers the full fee > is a stablecoin > largest USD value.
 * Charging in a stablecoin keeps the amount closest to $1, but a wallet without
 * one is charged in whatever it does hold rather than let the fee go.
 * Returns null only when nothing is priced at all.
 */
export function selectFeeToken({
  walletTokens,
  excludeAddresses = new Set(),
  feeUsd = EXIT_FEE_USD,
}) {
  const candidates = [];
  for (const token of walletTokens || []) {
    // native is listed under a chain code rather than an address, and a token a
    // protocol group already hands over in full has nothing spare for a fee
    if (!token?.id || !ethers.utils.isAddress(token.id)) continue;
    if (excludeAddresses.has(token.id.toLowerCase())) continue;
    const price = Number(token.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const decimals = Number(token.decimals);
    if (!Number.isInteger(decimals) || decimals < 0) continue;
    const raw = rawAmountOf(token);
    if (!raw || raw.lte(0)) continue;
    const wanted = usdToTokenRawFloor(feeUsd, price, decimals);
    if (wanted.isZero()) continue;
    const coversFee = wanted.lte(raw);
    candidates.push({
      token,
      address: token.id,
      symbol: token.optimized_symbol || token.symbol || token.id,
      price,
      decimals,
      raw,
      // never more than the wallet holds: an oversized transfer would revert
      // the batch it rides in
      feeRaw: coversFee ? wanted : raw,
      effectiveRaw: raw,
      coversFee,
      usdValue: Number(ethers.utils.formatUnits(raw, decimals)) * price,
      isStable: price >= STABLE_PRICE_BAND[0] && price <= STABLE_PRICE_BAND[1],
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      Number(b.coversFee) - Number(a.coversFee) ||
      Number(b.isStable) - Number(a.isStable) ||
      b.usdValue - a.usdValue,
  );
  return candidates[0];
}

/**
 * Re-read the fee token's balance on-chain and cap the fee by it.
 * The wallet list is a third-party snapshot; if it reports more than the wallet
 * holds, fee + sweep of the same token would exceed the balance and revert the
 * whole atomic batch. One RPC call removes the vector the fee introduces.
 */
export async function clampFeeToChainBalance(feePlan, { owner, chainName }) {
  if (!feePlan) return null;
  try {
    const contract = new ethers.Contract(
      feePlan.address,
      ERC20_ABI,
      PROVIDER(chainName),
    );
    const onChain = await contract.balanceOf(owner);
    const effectiveRaw = onChain.lt(feePlan.raw) ? onChain : feePlan.raw;
    if (effectiveRaw.lte(0)) return null;
    const wanted = usdToTokenRawFloor(
      EXIT_FEE_USD,
      feePlan.price,
      feePlan.decimals,
    );
    const feeRaw = wanted.gt(effectiveRaw) ? effectiveRaw : wanted;
    return feeRaw.lte(0)
      ? null
      : {
          ...feePlan,
          effectiveRaw,
          feeRaw,
          coversFee: wanted.lte(effectiveRaw),
        };
  } catch (error) {
    // keep the snapshot numbers: an unverified fee is still capped at the
    // reported balance, and a failed RPC read is no reason to skip the exit
    logger.warn("AA Exit: could not verify fee token balance on-chain", error);
    return feePlan;
  }
}

const erc20TransferTxn = ({ address, amount, chainMetadata, recipient }) =>
  prepareContractCall({
    contract: getContract({
      client: THIRDWEB_CLIENT,
      address,
      chain: chainMetadata,
      abi: ERC20_ABI,
    }),
    method: "function transfer(address to, uint256 amount)",
    params: [recipient, amount],
  });

/**
 * One group per protocol the user still holds something in.
 * An empty result IS the "does the user have a position here" check: it costs
 * the same reads the transfer would need anyway and, unlike usdBalanceOf, never
 * touches a price feed.
 * level >= 1 drops the claim leg, which is the one part that reaches into
 * third-party APIs and protocol-specific reward assumptions.
 */
export async function buildProtocolGroups({
  protocols,
  owner,
  recipient,
  level = 0,
  updateProgress = noop,
  onProtocolScanned = noop,
}) {
  let completed = 0;
  const settled = await Promise.allSettled(
    protocols.map(async (protocol) => {
      try {
        const value = await protocol.interface.emergencyTransfer(
          owner,
          recipient,
          updateProgress,
          {
            skipRewards: level >= 1,
          },
        );
        completed += 1;
        emitProgress(onProtocolScanned, {
          protocol,
          completed,
          total: protocols.length,
          found: (value?.txns || []).length > 0,
          failed: false,
        });
        return value;
      } catch (error) {
        completed += 1;
        emitProgress(onProtocolScanned, {
          protocol,
          completed,
          total: protocols.length,
          found: false,
          failed: true,
        });
        throw error;
      }
    }),
  );

  const groups = [];
  protocols.forEach((protocol, index) => {
    const result = settled[index];
    const txns = result.status === "fulfilled" ? result.value?.txns || [] : [];
    const buildError =
      result.status === "rejected"
        ? result.reason?.message || String(result.reason)
        : null;
    // holds nothing here: no row, no signature
    if (txns.length === 0 && !buildError) return;
    groups.push({
      kind: "protocol",
      uniqueId: protocol.uniqueId,
      label: protocol.label,
      level,
      // approve -> withdraw -> transfer only works in order, so a failure part
      // way through kills the rest. NFT transfers are independent of each other.
      dependent: !protocol.interface.assetIsNFT,
      txns,
      buildError,
      rewardBalances:
        result.status === "fulfilled" ? result.value?.rewardBalances || [] : [],
      sweptAssetAddress: protocol.interface.sweptAssetAddress(),
      protocol,
    });
  });
  return groups;
}

/**
 * Addresses a protocol group already hands over in full, so neither the wallet
 * sweep nor the fee builds a second claim on the same balance.
 * Only groups that actually produced transactions count — a protocol that
 * failed to build moves nothing and its token stays eligible.
 */
export function sweptAddressesOf(protocolGroups) {
  return new Set(
    protocolGroups
      .filter((group) => !group.buildError && group.txns.length > 0)
      .map((group) => group.sweptAssetAddress)
      .filter(Boolean)
      .map((address) => address.toLowerCase()),
  );
}

export function buildFeeGroup({ feePlan, chainMetadata }) {
  if (!feePlan || feePlan.feeRaw.lte(0)) return null;
  return {
    kind: "fee",
    uniqueId: "exit-fee",
    label: `Gas fee (~$${EXIT_FEE_USD} in ${feePlan.symbol})`,
    level: 0,
    dependent: false,
    txns: [
      erc20TransferTxn({
        address: feePlan.address,
        amount: feePlan.feeRaw,
        chainMetadata,
        recipient: PROTOCOL_TREASURY_ADDRESS,
      }),
    ],
    buildError: null,
  };
}

/**
 * Every loose ERC20 in the wallet, chunked. The fee rides on one of these
 * balances, so that token is swept short by exactly the fee — sweeping the full
 * amount as well would ask for more than the wallet holds and revert.
 */
export function buildWalletSweepGroups({
  walletTokens,
  feePlan,
  excludeAddresses = new Set(),
  chainMetadata,
  recipient,
}) {
  const totals = {};
  for (const token of walletTokens || []) {
    if (!token?.id || !ethers.utils.isAddress(token.id)) continue;
    const key = token.id.toLowerCase();
    if (excludeAddresses.has(key)) continue;
    const raw = rawAmountOf(token);
    // one unreadable amount must not drop the tokens listed after it
    if (!raw) continue;
    totals[key] = (totals[key] || ZERO).add(raw);
  }

  if (feePlan) {
    const key = feePlan.address.toLowerCase();
    if (totals[key]) {
      const available = feePlan.effectiveRaw.lt(totals[key])
        ? feePlan.effectiveRaw
        : totals[key];
      const remaining = available.sub(feePlan.feeRaw);
      if (remaining.gt(0)) {
        totals[key] = remaining;
      } else {
        delete totals[key];
      }
    }
  }

  const txns = Object.entries(totals)
    .filter(([, amount]) => amount.gt(0))
    .map(([address, amount]) =>
      erc20TransferTxn({ address, amount, chainMetadata, recipient }),
    );

  const groups = [];
  const chunkCount = Math.ceil(txns.length / SWEEP_CHUNK_SIZE);
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = txns.slice(
      index * SWEEP_CHUNK_SIZE,
      (index + 1) * SWEEP_CHUNK_SIZE,
    );
    groups.push({
      kind: "sweep",
      uniqueId: `wallet-tokens-${index + 1}`,
      label:
        chunkCount === 1
          ? `Loose wallet tokens (${chunk.length})`
          : `Loose wallet tokens ${index + 1}/${chunkCount} (${chunk.length})`,
      level: 0,
      dependent: false,
      txns: chunk,
      buildError: null,
    });
  }
  return groups;
}

export function walletScanFailureGroup(error) {
  return {
    kind: "sweep",
    uniqueId: "wallet-tokens",
    label: "Loose wallet tokens",
    level: 0,
    dependent: false,
    txns: [],
    // surfaced as a failed row rather than swallowed, so the page can never
    // imply the wallet was emptied when its contents were never read
    buildError: `Could not list wallet tokens (${
      error?.message || error
    }). Loose tokens were left behind — retry this row once the API recovers.`,
  };
}

/**
 * Rewards only reach the wallet if the claim that pays them actually goes out.
 * A protocol group that failed, or that degraded to a claimless retry, drops
 * out — transferring rewards nobody claimed would revert.
 * At scan time no group has a status yet: they all ride the same atomic batch,
 * so every claim either lands or nothing does.
 */
export function buildClaimedRewardsGroup({
  protocolGroups,
  chainMetadata,
  recipient,
}) {
  const totals = {};
  for (const group of protocolGroups || []) {
    if (group.buildError) continue;
    if (group.level !== 0) continue;
    if (group.status !== undefined && group.status !== "success") continue;
    for (const { address, balance } of group.rewardBalances || []) {
      const key = address.toLowerCase();
      totals[key] = (totals[key] || ZERO).add(balance);
    }
  }
  const txns = Object.entries(totals)
    .filter(([, amount]) => amount.gt(0))
    .map(([address, amount]) =>
      erc20TransferTxn({ address, amount, chainMetadata, recipient }),
    );
  if (txns.length === 0) return null;
  return {
    kind: "rewards",
    uniqueId: "claimed-rewards",
    label: `Claimed rewards (${txns.length})`,
    level: 0,
    dependent: false,
    txns,
    buildError: null,
  };
}

const executableExitUnits = (groups) =>
  (groups || []).filter(
    (group) =>
      group.kind !== "rewards" &&
      !group.buildError &&
      (group.txns || []).flat(Infinity).length > 0,
  );

/**
 * Rewards are derived transactions, not an isolation unit. Rebuild them from
 * only the protocol units that are actually present in a candidate batch so a
 * removed producer can never leave behind a transfer for rewards it did not
 * claim.
 */
export function materializeExitCandidate({ units, chainMetadata, recipient }) {
  const materialized = [];
  let rewardsInserted = false;
  const insertRewards = () => {
    if (rewardsInserted) return;
    rewardsInserted = true;
    const rewards = buildClaimedRewardsGroup({
      protocolGroups: units.filter((group) => group.kind === "protocol"),
      chainMetadata,
      recipient,
    });
    if (rewards) materialized.push(rewards);
  };

  for (const unit of units) {
    if (unit.kind !== "protocol") insertRewards();
    materialized.push(unit);
  }
  insertRewards();
  return materialized;
}

const preparedTransactionsOf = (groups) =>
  (groups || []).flatMap((group) => (group.txns || []).flat(Infinity));

/**
 * Build the same unsigned smart-account UserOp Thirdweb would build for a real
 * batch and stop after sponsorship / gas estimation. prepareUserOp never calls
 * eth_sendUserOperation, so this is safe to use as a dry-run gate.
 *
 * Passing sponsorGas=false is used only for singleton diagnosis: if gas
 * estimation succeeds without sponsorship while the sponsored probe failed,
 * the failure is paymaster-specific rather than transaction execution itself.
 */
export async function probeAaBatch({
  groups,
  adminAccount,
  chainMetadata,
  smartAccountAddress,
  sponsorGas = true,
  prepareUserOpFn = prepareUserOp,
}) {
  const transactions = preparedTransactionsOf(groups);
  if (transactions.length === 0) return { ok: true, userOp: null };
  if (!adminAccount?.address) {
    throw new Error("AA Exit probe requires the smart wallet admin account");
  }
  if (!chainMetadata?.id) {
    throw new Error("AA Exit probe requires the active chain metadata");
  }

  const userOp = await prepareUserOpFn({
    transactions,
    adminAccount,
    client: THIRDWEB_CLIENT,
    smartWalletOptions: { chain: chainMetadata, sponsorGas },
    // A counterfactual smart account may legitimately not be deployed on this
    // chain yet. Probing must not mark it as "deploying" and then wait for a
    // transaction that, by definition, we never submit.
    waitForDeployment: false,
  });

  if (
    smartAccountAddress &&
    userOp?.sender &&
    userOp.sender.toLowerCase() !== smartAccountAddress.toLowerCase()
  ) {
    throw new Error(
      `AA Exit probe built UserOp for ${userOp.sender}, expected ${smartAccountAddress}`,
    );
  }
  return { ok: true, userOp };
}

export async function diagnoseAaBatchFailure(args) {
  try {
    await probeAaBatch({ ...args, sponsorGas: false });
    return {
      kind: "sponsorship",
      message:
        "Transaction simulation passed, but Thirdweb sponsorship failed.",
    };
  } catch (error) {
    return {
      kind: "execution",
      message: `Transaction simulation failed: ${exitPreflightError(error)}`,
    };
  }
}

const mergeAdjacentPassingChunks = async (chunks, probeUnits) => {
  const merged = chunks.map((chunk) => [...chunk]);
  let index = 0;
  while (index < merged.length - 1) {
    const candidate = [...merged[index], ...merged[index + 1]];
    const result = await probeUnits(candidate);
    if (result.ok) {
      merged.splice(index, 2, candidate);
      if (index > 0) index -= 1;
    } else {
      index += 1;
    }
  }
  return merged;
};

/**
 * Find the largest practical AA batches without degrading every healthy unit to
 * a separate signature. The recursion is dependency-aware because each group is
 * indivisible; a protocol's approve -> unstake -> transfer sequence is never
 * split during isolation.
 */
export async function planAaExitBatches({
  groups,
  chainMetadata,
  recipient,
  probe,
  diagnose,
  onProbe = noop,
}) {
  const units = executableExitUnits(groups);
  let probeCount = 0;
  const probeUnits = async (candidateUnits) => {
    const materialized = materializeExitCandidate({
      units: candidateUnits,
      chainMetadata,
      recipient,
    });
    try {
      probeCount += 1;
      emitProgress(onProbe, {
        probeCount,
        candidateCount: candidateUnits.length,
      });
      await probe(materialized);
      return { ok: true, groups: materialized };
    } catch (error) {
      return { ok: false, error, groups: materialized };
    }
  };

  if (units.length === 0) {
    return { batches: [], excluded: [], probeCount };
  }

  const full = await probeUnits(units);
  if (full.ok) {
    return {
      batches: [{ units, groups: full.groups }],
      excluded: [],
      probeCount,
    };
  }

  const isolate = async (candidateUnits, knownFailure = null) => {
    const result = knownFailure || (await probeUnits(candidateUnits));
    if (result.ok) return { chunks: [candidateUnits], excluded: [] };
    if (candidateUnits.length === 1) {
      const group = candidateUnits[0];
      const diagnosis = diagnose
        ? await diagnose(group, result.error)
        : { kind: "unknown", message: exitPreflightError(result.error) };
      return {
        chunks: [],
        excluded: [
          {
            group,
            error: result.error,
            diagnosis,
          },
        ],
      };
    }

    const middle = Math.ceil(candidateUnits.length / 2);
    const left = candidateUnits.slice(0, middle);
    const right = candidateUnits.slice(middle);
    const [leftResult, rightResult] = await Promise.all([
      isolate(left),
      isolate(right),
    ]);
    return {
      chunks: [...leftResult.chunks, ...rightResult.chunks],
      excluded: [...leftResult.excluded, ...rightResult.excluded],
    };
  };

  const isolated = await isolate(units, full);
  const excludedIds = new Set(
    isolated.excluded.map(({ group }) => group.uniqueId),
  );
  const healthy = units.filter((group) => !excludedIds.has(group.uniqueId));

  if (healthy.length === 0) {
    return { batches: [], excluded: isolated.excluded, probeCount };
  }

  // The common case: one or more bad units were removed, and every survivor can
  // still stay in one atomic UserOp.
  const healthyCombined = await probeUnits(healthy);
  if (healthyCombined.ok) {
    return {
      batches: [{ units: healthy, groups: healthyCombined.groups }],
      excluded: isolated.excluded,
      probeCount,
    };
  }

  // If every individual side passed but the aggregate still does not, this is
  // an aggregate-size/gas/paymaster limit. Repartition only the healthy units,
  // then greedily merge adjacent passing chunks so we keep a few large batches
  // rather than N singletons.
  const repartitioned = await isolate(healthy, healthyCombined);
  const allExcluded = [...isolated.excluded, ...repartitioned.excluded];
  const passingChunks = await mergeAdjacentPassingChunks(
    repartitioned.chunks,
    probeUnits,
  );
  const batches = [];
  for (const chunk of passingChunks) {
    const result = await probeUnits(chunk);
    if (result.ok) batches.push({ units: chunk, groups: result.groups });
  }

  return {
    batches,
    excluded: allExcluded,
    probeCount,
    aggregateLimited: batches.length > 1,
  };
}

export async function buildNativeGroup({
  owner,
  chainName,
  chainMetadata,
  recipient,
}) {
  try {
    const balance = await PROVIDER(chainName).getBalance(owner);
    if (balance.lte(0)) return null;
    return {
      kind: "native",
      uniqueId: "native",
      label: "Native ETH",
      level: 0,
      dependent: false,
      txns: [
        prepareTransaction({
          to: recipient,
          chain: chainMetadata,
          client: THIRDWEB_CLIENT,
          value: BigInt(balance.toString()),
        }),
      ],
      buildError: null,
    };
  } catch (error) {
    logger.warn("AA Exit: could not read native balance, skipping it", error);
    return null;
  }
}

/**
 * Everything the wallet can hand over on this chain, in the order it should go.
 * Protocol claims live inside their own groups, so reward transfers follow all
 * of them. The fee sits ahead of the sweeps: a single stablecoin transfer is the
 * least likely line to fail, and a blacklisted airdrop token reverting a sweep
 * chunk then cannot strand it. Native goes last by convention.
 */
export async function scanAaExit({
  owner,
  recipient,
  chainName,
  chainMetadata,
  updateProgress = noop,
  onScanProgress = noop,
  walletTokensOverride = null,
}) {
  const protocols = collectExitProtocols(chainName);
  emitProgress(onScanProgress, {
    stage: "protocols",
    completed: 0,
    total: protocols.length,
  });
  const protocolGroups = await buildProtocolGroups({
    protocols,
    owner,
    recipient,
    level: 0,
    updateProgress,
    onProtocolScanned: ({ protocol, completed, total, found, failed }) =>
      emitProgress(onScanProgress, {
        stage: "protocols",
        completed,
        total,
        found:
          found && !failed
            ? {
                kind: "protocol",
                id: protocol.uniqueId,
                label: protocol.label,
              }
            : null,
      }),
  });
  const excludeAddresses = sweptAddressesOf(protocolGroups);

  let walletTokens = [];
  let walletScanError = null;
  emitProgress(onScanProgress, { stage: "wallet-fetch" });
  try {
    walletTokens = Array.isArray(walletTokensOverride)
      ? walletTokensOverride
      : await fetchAaExitWalletTokens(chainName, owner);
  } catch (error) {
    walletScanError = error;
    logger.warn("AA Exit: wallet token scan unavailable", error);
  }
  const walletTokenSnapshot = walletScanError ? null : walletTokens;

  let untransferableTokens = [];
  if (!walletScanError) {
    const preflight = await preflightWalletTokens({
      walletTokens,
      owner,
      recipient,
      chainName,
      excludeAddresses,
      onTokenScanned: ({ completed, total, token, transferable }) => {
        const tokenLabel =
          token?.optimized_symbol || token?.symbol || token?.id || null;
        emitProgress(onScanProgress, {
          stage: "tokens",
          completed,
          total,
          tokenSymbol: tokenLabel,
          transferable,
          found:
            transferable && token?.id
              ? {
                  kind: "token",
                  id: token.id.toLowerCase(),
                  label: tokenLabel,
                }
              : null,
        });
      },
    });
    walletTokens = preflight.walletTokens;
    untransferableTokens = preflight.untransferableTokens;
  }

  let feePlan = walletScanError
    ? null
    : selectFeeToken({ walletTokens, excludeAddresses });
  if (feePlan) {
    feePlan = await clampFeeToChainBalance(feePlan, { owner, chainName });
  }

  // Rewards are intentionally NOT stored as their own isolation group. They are
  // materialized later from whichever protocol units survive UserOp probing.
  const groups = [...protocolGroups];

  const feeGroup = buildFeeGroup({ feePlan, chainMetadata });
  if (feeGroup) groups.push(feeGroup);

  if (walletScanError) {
    groups.push(walletScanFailureGroup(walletScanError));
  } else {
    groups.push(
      ...buildWalletSweepGroups({
        walletTokens,
        feePlan,
        excludeAddresses,
        chainMetadata,
        recipient,
      }),
    );
  }

  emitProgress(onScanProgress, { stage: "native" });
  const nativeGroup = await buildNativeGroup({
    owner,
    chainName,
    chainMetadata,
    recipient,
  });
  if (nativeGroup) {
    groups.push(nativeGroup);
    emitProgress(onScanProgress, {
      stage: "native",
      found: { kind: "native", id: "native", label: "Native ETH" },
    });
  }

  // Nothing to hand over means nothing to charge for — otherwise a wallet whose
  // only asset is under a dollar would pay the fee and receive nothing
  const movesSomething = groups.some(
    (group) => group.kind !== "fee" && group.txns.length > 0,
  );
  if (!movesSomething) {
    return {
      groups: groups.filter(
        (group) => group.kind !== "fee" && group.buildError,
      ),
      feePlan: null,
      walletScanError,
      walletTokenSnapshot,
      untransferableTokens,
    };
  }

  return {
    groups,
    feePlan,
    walletScanError,
    walletTokenSnapshot,
    untransferableTokens,
  };
}

// 0: as built. 1: rebuilt without the claim leg (protocols only). 2: the same
// transactions, one per userOp. Fee and native are a single transaction each, so
// splitting them would change nothing.
const NEXT_LEVEL = {
  protocol: { 0: 1, 1: 2 },
  rewards: { 0: 2 },
  sweep: { 0: 2 },
  fee: {},
  native: {},
};

export const nextExitLevel = (group) =>
  NEXT_LEVEL[group.kind]?.[group.level] ?? null;

export const LEVEL_LABEL = { 0: null, 1: "no-claim", 2: "split" };

// A run that stops leaves the same explanation on every row it touched, whether
// it stopped on a whole batch or part way through a split one
const TERMINAL_MESSAGE = {
  cancelled: "Transaction cancelled.",
  unknown:
    "This row's status is unknown. Check your wallet or the block explorer before trying again.",
};

const submit = (send, payload) =>
  new Promise((resolve, reject) => {
    send(payload, { onSuccess: resolve, onError: reject });
  });

export const transactionHashFromResult = (data) =>
  data?.transactionHash || data?.receipts?.[0]?.transactionHash || "";

/**
 * Send the groups, shrinking the batch every time one fails safely:
 * every group in one userOp -> one group per userOp -> one transaction per
 * userOp. A failure that may already have been submitted (timeout, missing
 * receipt) stops the whole run instead, because retrying it could exit twice.
 *
 * rebuildGroup(group, nextLevel, allGroups) returns a group with fresh
 * transactions for that level, or null when there is nothing left to move.
 */
export async function executeAaExitPlan({
  plan,
  sendBatchTransaction,
  updateGroup,
}) {
  let completedBatches = 0;
  for (const excluded of plan.excluded || []) {
    const reason =
      excluded.diagnosis?.message ||
      exitPreflightError(excluded.error) ||
      "UserOperation probe failed";
    updateGroup(excluded.group.uniqueId, {
      status: "failed",
      error: reason,
      note:
        excluded.diagnosis?.kind === "sponsorship"
          ? "Thirdweb sponsorship rejected this item; it was left in the smart wallet."
          : "This item failed dry-run simulation and was left in the smart wallet.",
    });
  }

  for (const batch of plan.batches || []) {
    const units = batch.units || [];
    const calls = preparedTransactionsOf(batch.groups);
    units.forEach((group) =>
      updateGroup(group.uniqueId, { status: "sending", error: undefined }),
    );
    try {
      const data = await submit(sendBatchTransaction, calls);
      const transactionHash = transactionHashFromResult(data);
      units.forEach((group) =>
        updateGroup(group.uniqueId, {
          status: "success",
          error: undefined,
          transactionHash,
        }),
      );
      completedBatches += 1;
    } catch (error) {
      const kind = classifyEmergencyExitBatchError(error);
      const status =
        kind === FAILURE.USER_REJECTED
          ? "cancelled"
          : kind === FAILURE.UNKNOWN
          ? "unknown"
          : "pre-submit-failed";
      const message =
        status === "cancelled"
          ? TERMINAL_MESSAGE.cancelled
          : status === "unknown"
          ? TERMINAL_MESSAGE.unknown
          : error?.message || "UserOperation failed before submission";
      const rowStatus = status === "pre-submit-failed" ? "failed" : status;
      units.forEach((group) =>
        updateGroup(group.uniqueId, { status: rowStatus, error: message }),
      );
      return {
        status,
        error,
        failedBatch: batch,
        completedBatches,
      };
    }
  }

  return {
    status:
      (plan.excluded || []).length > 0 ? "completed-with-groups" : "success",
    completedBatches,
  };
}

export async function runAaExitGroups({
  groups,
  sendBatchTransaction,
  updateGroup,
  rebuildGroup,
  onFallback,
  combinedAllowed = true,
}) {
  const live = groups.map((group) => ({ ...group }));

  for (const group of live) {
    if (group.buildError) {
      group.status = "failed";
      updateGroup(group.uniqueId, {
        status: "failed",
        error: group.buildError,
        level: group.level,
      });
    }
  }

  const executable = live.filter(
    (group) => !group.buildError && group.txns.length > 0,
  );
  // `live` carries the level and status each group ended on, so a caller
  // retrying a row later picks up where the degradation left off
  if (executable.length === 0) {
    return { status: "completed-with-groups", groups: live };
  }

  const markAll = (status, patch) =>
    executable.forEach((group) => {
      group.status = status;
      updateGroup(group.uniqueId, { status, ...patch });
    });

  if (combinedAllowed) {
    markAll("sending", { error: undefined });
    try {
      const calls = executable.flatMap((group) => group.txns.flat(Infinity));
      const data = await submit(sendBatchTransaction, calls);
      const transactionHash = transactionHashFromResult(data);
      markAll("success", { error: undefined, transactionHash });
      return { status: "success", transactionHash, groups: live };
    } catch (error) {
      const kind = classifyEmergencyExitBatchError(error);
      if (kind === FAILURE.USER_REJECTED) {
        markAll("cancelled", { error: TERMINAL_MESSAGE.cancelled });
        return { status: "cancelled", error, groups: live };
      }
      if (kind === FAILURE.UNKNOWN) {
        markAll("unknown", {
          error:
            "Batch status is unknown. Refresh balances and check your wallet before trying again.",
        });
        return { status: "unknown", error, groups: live };
      }
      await onFallback?.(error);
      markAll("pending", { error: undefined });
    }
  }

  const sendSplit = async (group) => {
    const txns = group.txns.flat(Infinity);
    let sent = 0;
    let lastError = null;
    for (const txn of txns) {
      updateGroup(group.uniqueId, {
        status: "sending",
        level: group.level,
        progress: `${sent}/${txns.length}`,
      });
      try {
        await submit(sendBatchTransaction, [txn]);
        sent += 1;
      } catch (error) {
        const kind = classifyEmergencyExitBatchError(error);
        if (kind === FAILURE.USER_REJECTED || kind === FAILURE.UNKNOWN) {
          return {
            stop: true,
            status: kind === FAILURE.USER_REJECTED ? "cancelled" : "unknown",
            error,
            sent,
            total: txns.length,
          };
        }
        lastError = error;
        // the rest of a dependent chain cannot run without this step
        if (group.dependent) break;
      }
    }
    return { sent, total: txns.length, error: lastError };
  };

  // `slot` is the object inside `live`, mutated in place so a later group's
  // rebuild sees which claims actually went out
  const sendGroup = async (slot) => {
    for (;;) {
      if (slot.txns.length === 0) {
        // an earlier attempt already moved it, or the claim it depended on
        // never happened
        slot.status = "success";
        updateGroup(slot.uniqueId, {
          status: "success",
          error: undefined,
          note: "nothing left to move",
          level: slot.level,
        });
        return {};
      }

      if (slot.level >= 2) {
        const outcome = await sendSplit(slot);
        if (outcome.stop) {
          slot.status = outcome.status;
          updateGroup(slot.uniqueId, {
            status: outcome.status,
            error: TERMINAL_MESSAGE[outcome.status],
            progress: `${outcome.sent ?? 0}/${
              outcome.total ?? slot.txns.length
            }`,
          });
          return outcome;
        }
        const allSent = outcome.sent === outcome.total;
        const status = allSent
          ? "success"
          : outcome.sent > 0
          ? "partial"
          : "failed";
        slot.status = status;
        updateGroup(slot.uniqueId, {
          status,
          level: slot.level,
          progress: `${outcome.sent}/${outcome.total}`,
          error: allSent
            ? undefined
            : outcome.error?.message || "Transaction failed",
        });
        return {};
      }

      updateGroup(slot.uniqueId, {
        status: "sending",
        error: undefined,
        level: slot.level,
      });
      let error;
      try {
        const data = await submit(
          sendBatchTransaction,
          slot.txns.flat(Infinity),
        );
        slot.status = "success";
        updateGroup(slot.uniqueId, {
          status: "success",
          error: undefined,
          level: slot.level,
          transactionHash: transactionHashFromResult(data),
        });
        return {};
      } catch (caught) {
        error = caught;
      }

      const kind = classifyEmergencyExitBatchError(error);
      if (kind === FAILURE.USER_REJECTED) {
        slot.status = "cancelled";
        updateGroup(slot.uniqueId, {
          status: "cancelled",
          error: TERMINAL_MESSAGE.cancelled,
        });
        return { stop: true, status: "cancelled", error };
      }
      if (kind === FAILURE.UNKNOWN) {
        slot.status = "unknown";
        updateGroup(slot.uniqueId, {
          status: "unknown",
          error: TERMINAL_MESSAGE.unknown,
        });
        return { stop: true, status: "unknown", error };
      }

      const next = nextExitLevel(slot);
      if (next === null) {
        slot.status = "failed";
        updateGroup(slot.uniqueId, {
          status: "failed",
          error: error?.message || "Transaction failed",
        });
        return {};
      }

      // A rebuild re-reads balances, so a position an earlier attempt already
      // half-moved comes back smaller — or empty, which the next pass resolves
      // as "nothing left to move". Returning null says exactly that; with no
      // rebuilder at all the same transactions carry over to be split.
      const rebuilt = rebuildGroup
        ? await rebuildGroup(slot, next, live)
        : slot;
      if (rebuilt?.buildError) {
        slot.status = "failed";
        updateGroup(slot.uniqueId, {
          status: "failed",
          level: next,
          error: rebuilt.buildError,
        });
        return {};
      }
      Object.assign(slot, {
        txns: rebuilt ? rebuilt.txns : [],
        level: next,
        status: undefined,
      });
    }
  };

  for (const slot of executable) {
    // recomputed here rather than at scan time: by now every protocol group has
    // its final level and status, so a degraded claim drops its rewards
    if (slot.kind === "rewards" && rebuildGroup) {
      const rebuilt = await rebuildGroup(slot, slot.level, live);
      slot.txns = rebuilt?.txns || [];
    }
    const outcome = await sendGroup(slot);
    if (outcome.stop) {
      return { status: outcome.status, error: outcome.error, groups: live };
    }
  }

  return { status: "completed-with-groups", groups: live };
}
