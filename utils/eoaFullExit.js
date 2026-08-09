import { ethers } from "ethers";
import ERC20_ABI from "../lib/contracts/ERC20.json" assert { type: "json" };
import { PriceService, TokenPriceBatcher } from "../classes/TokenPriceService";
import { collectExitProtocols, debankChainCode } from "./aaExit";
import { fetchWalletTokens } from "./dustConversion";
import { PROVIDER } from "./general";
import logger from "./logger";

const noop = () => {};
const READ_CONCURRENCY = 8;

const symbolOf = (token) =>
  String(token?.optimized_symbol || token?.symbol || "").toLowerCase();

const dedupeTokens = (tokens) => {
  const byAddress = new Map();
  for (const token of tokens || []) {
    const address = token?.address || token?.id;
    if (!address || !ethers.utils.isAddress(address)) continue;
    const key = address.toLowerCase();
    const current = byAddress.get(key) || {};
    byAddress.set(key, {
      ...current,
      ...token,
      id: address,
      address,
      symbol: symbolOf(token) || symbolOf(current),
      optimized_symbol: symbolOf(token) || symbolOf(current),
    });
  }
  return [...byAddress.values()];
};

const mapInBatches = async (items, batchSize, mapper) => {
  const results = [];
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    results.push(...(await Promise.all(batch.map(mapper))));
  }
  return results;
};

export async function buildEoaFullExitPriceMapping({
  protocols,
  walletTokens = [],
  ethPrice,
}) {
  const mapping = { ...PriceService.STATIC_PRICES };
  for (const token of walletTokens) {
    const symbol = symbolOf(token);
    const price = Number(token?.price);
    if (symbol && Number.isFinite(price) && price > 0) mapping[symbol] = price;
  }
  if (Number.isFinite(Number(ethPrice)) && Number(ethPrice) > 0) {
    mapping.eth = Number(ethPrice);
    mapping.weth = Number(ethPrice);
  }

  const priceIds = new Map();
  for (const protocol of protocols || []) {
    try {
      for (const token of protocol.interface.rewards?.() || []) {
        const symbol = String(token?.symbol || "").toLowerCase();
        if (!symbol || !token?.priceId || mapping[symbol] > 0) continue;
        priceIds.set(symbol, token.priceId);
      }
    } catch (error) {
      logger.warn(
        `EOA full exit: could not inspect prices for ${protocol.uniqueId}`,
        error,
      );
    }
  }

  if (priceIds.size > 0) {
    try {
      const priceService = new PriceService(process.env.NEXT_PUBLIC_API_URL);
      const batcher = new TokenPriceBatcher(priceService);
      const fetched = await batcher.fetchPrices([...priceIds.entries()]);
      Object.assign(mapping, fetched);
    } catch (error) {
      // Price lookup should not stop the unwind. Protocols whose builders truly
      // need a missing price will fail as their own isolated row instead.
      logger.warn(
        "EOA full exit: some protocol prices were unavailable",
        error,
      );
    }
  }

  return mapping;
}

export async function buildEoaFullExitPlan({
  chainName,
  owner,
  slippage,
  walletTokens = [],
  ethPrice,
  protocols: suppliedProtocols,
  onProgress = noop,
}) {
  const protocols = suppliedProtocols || collectExitProtocols(chainName);
  const tokenPricesMappingTable = await buildEoaFullExitPriceMapping({
    protocols,
    walletTokens,
    ethPrice,
  });
  let completed = 0;
  onProgress({ completed, total: protocols.length, stage: "positions" });

  const settled = await mapInBatches(
    protocols,
    READ_CONCURRENCY,
    async (protocol) => {
      try {
        const value = await protocol.interface.fullExitUnwind(
          owner,
          slippage,
          tokenPricesMappingTable,
          noop,
        );
        completed += 1;
        onProgress({
          completed,
          total: protocols.length,
          stage: "positions",
          protocol,
          found: (value?.txns || []).length > 0,
          failed: false,
        });
        return { status: "fulfilled", protocol, value };
      } catch (error) {
        completed += 1;
        onProgress({
          completed,
          total: protocols.length,
          stage: "positions",
          protocol,
          found: false,
          failed: true,
        });
        return { status: "rejected", protocol, reason: error };
      }
    },
  );

  const groups = [];
  const failures = [];
  const expectedTokens = [];
  for (const result of settled) {
    if (result.status === "rejected") {
      failures.push({
        uniqueId: result.protocol.uniqueId,
        label: result.protocol.label,
        error: result.reason?.message || String(result.reason),
      });
      continue;
    }
    const txns = result.value?.txns || [];
    if (!txns.length) continue;
    groups.push({
      uniqueId: result.protocol.uniqueId,
      label: result.protocol.label,
      txns,
    });
    expectedTokens.push(...(result.value?.expectedTokens || []));
  }

  return {
    groups,
    failures,
    expectedTokens: dedupeTokens(expectedTokens),
    tokenPricesMappingTable,
  };
}

export async function refreshEoaFullExitTokens({
  chainName,
  owner,
  expectedTokens = [],
  tokenPricesMappingTable = {},
}) {
  let debankTokens = [];
  try {
    // Deliberately bypass the AA-exit cache: the EOA has just received new
    // assets, so a cached pre-unwind snapshot would be wrong.
    debankTokens = await fetchWalletTokens(debankChainCode(chainName), owner);
  } catch (error) {
    logger.warn(
      "EOA full exit: fresh wallet discovery failed; checking expected outputs on-chain",
      error,
    );
  }

  const candidates = dedupeTokens([...debankTokens, ...expectedTokens]);
  const provider = PROVIDER(chainName);
  const refreshed = await mapInBatches(
    candidates,
    READ_CONCURRENCY,
    async (candidate) => {
      try {
        const address = candidate.address || candidate.id;
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        let decimals = Number(candidate.decimals);
        let symbol = symbolOf(candidate);
        const reads = [contract.balanceOf(owner)];
        if (!Number.isInteger(decimals) || decimals < 0)
          reads.push(contract.decimals());
        else reads.push(Promise.resolve(decimals));
        if (!symbol) reads.push(contract.symbol());
        else reads.push(Promise.resolve(symbol));
        const [balance, resolvedDecimals, resolvedSymbol] =
          await Promise.all(reads);
        if (balance.isZero()) return null;

        decimals = Number(resolvedDecimals);
        symbol = String(resolvedSymbol).toLowerCase();
        const mappedPrice = Number(
          candidate.price ??
            tokenPricesMappingTable[symbol] ??
            (symbol === "weth" ? tokenPricesMappingTable.eth : 0),
        );
        const price =
          Number.isFinite(mappedPrice) && mappedPrice > 0 ? mappedPrice : 0;
        const amount = Number(ethers.utils.formatUnits(balance, decimals));
        return {
          ...candidate,
          id: address,
          address,
          symbol,
          optimized_symbol: symbol,
          decimals,
          amount,
          price,
          raw_amount_hex_str: balance.toHexString(),
        };
      } catch (error) {
        logger.warn(
          `EOA full exit: could not refresh ${
            candidate.symbol || candidate.id
          }`,
          error,
        );
        return null;
      }
    },
  );

  return refreshed
    .filter(Boolean)
    .sort((a, b) => b.amount * b.price - a.amount * a.price);
}
