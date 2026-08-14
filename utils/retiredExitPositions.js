// Positions no vault strategy lists any more, but wallets can still hold.
// collectExitProtocols discovers positions by walking the vault strategies, so a
// pool commented out of — or deleted from — a strategy becomes invisible to the
// exit pages while the funds are still staked. Equilibria pid 45 sat unreachable
// for a wallet holding ~$3.2k of it, and pid 53 was the whole BTC Vault for seven
// months before it was deleted outright.
//
// Deliberately NOT weight-0 entries in a vault strategy. Weight 0 stops zap-in
// and hides a pool from the composition table, but every main-UI balance read
// still walks it: BasePortfolio._getBalances, pendingRewards and
// calProtocolAssetDustInWalletDictionary all skip the weight filter (unlike
// _getProtocolUsdBalanceDictionary right next to it), two of them price the
// position through the Pendle API, and they share one Promise.all whose rejection
// wipes the whole vault page. Worse, _calculateZapOutPercentage suggests a 100%
// zap out for any weight-0 position with a balance, which routes an expired
// market into the Pendle SDK. A price feed that stopped answering is exactly why
// pid 45 was commented out (3ca7d3f2, 24196bd7 — those lines are still in
// StablecoinVault.jsx as a record). The exit path never prices anything, so
// listing a position here rescues it without putting that feed back in front of
// the vault page.
//
// Its own leaf module so utils/aaExit.js keeps knowing vault names only rather
// than importing protocol classes, and so the next retired pool has an obvious
// home instead of being commented out and forgotten.

import { BaseEquilibria } from "../classes/Pendle/BaseEquilibria";
import { BaseMoonwell } from "../classes/Moonwell/BaseMoonwell";
import { BasePendlePT } from "../classes/Pendle/BasePendlePT";
import { BaseVelodrome } from "../classes/Velodrome/BaseVelodrome";
import { BaseVelodromeV3 } from "../classes/Velodrome/BaseVelodromeV3";
import logger from "./logger";

const AERODROME_REWARDS = [
  {
    symbol: "aero",
    priceId: {
      coinmarketcapApiId: 29270,
    },
    address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
    decimals: 18,
  },
];

// Thunks rather than instances: one entry whose constructor throws must not take
// the rest of the exit down with it, which needs a per-entry try/catch.
const RETIRED_POSITION_BUILDERS = [
  // BTC Vault's entire position (weight 1) from 2024-10-31 until 69e48b55
  // deleted it on 2025-06-17. Staked in the Equilibria booster, so the loose
  // ERC20 sweep cannot reach it.
  () =>
    new BaseEquilibria(
      "arbitrum",
      42161,
      ["dwbtc", "pt dwbtc 26jun2025"],
      "single",
      {
        assetAddress: "0x8cAB5Fd029ae2FBF28c53E965E4194C7260aDF0C",
        symbolOfBestTokenToZapOut: "wbtc",
        bestTokenAddressToZapOut: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
        decimalOfBestTokenToZapOut: 8,
        pidOfEquilibria: 53,
      },
    ),
  // Stable+ gold, commented out by 24196bd7 on 2025-11-05. Verified on-chain:
  // EqbZap withdraw(45, amount) approving poolInfo(45).token
  // (0xcf12c0268bd3038d7d811d72eb511cf3b050922c) is the same call Debank
  // proposes for this position.
  () =>
    new BaseEquilibria(
      "arbitrum",
      42161,
      ["usdc", "pt gusdc 26dec2024"],
      "single",
      {
        assetAddress: "0xa877a0E177b54A37066c1786F91a1DAb68F094AF",
        symbolOfBestTokenToZapOut: "gusdc",
        bestTokenAddressToZapOut: "0xd3443ee1e91af28e5fb858fbd0d72a63ba8046e0",
        decimalOfBestTokenToZapOut: 6,
        pidOfEquilibria: 45,
      },
    ),
  // ETH Vault long_term_bond at weight 0.3 until 51a0212b removed it on
  // 2025-09-15. An ERC721, and BaseVelodromeV3._getAllNftIDs filters by
  // token0/token1/tick range — so the wsteth-mseth position still in EthVault
  // shares this NFT manager without ever finding these tokens.
  () =>
    new BaseVelodromeV3("base", 8453, ["wsteth", "wrseth"], "LP", {
      protocolName: "aerodrome",
      protocolVersion: "v3",
      assetDecimals: 18,
      assetAddress: "0x827922686190790b37229fd06084350E74485b72",
      poolAddress: "0x14dcCDd311Ab827c42CCA448ba87B1ac1039e2A4",
      guageAddress: "0x4197186D3D65f694018Ae4B80355225Ce1dD64AD",
      lpTokens: [
        ["wsteth", "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", 18],
        ["wrseth", "0xEDfa23602D0EC14714057867A78d01e94176BEA0", 18],
      ],
      tickers: {
        tickLower: 1411,
        tickUpper: 1415,
        tickSpacing: 1,
      },
      rewards: [],
    }),
  // The three below hold their position as a plain ERC20 receipt token, which
  // the wallet sweep already transfers. Listed anyway because the sweep depends
  // on Debank listing the token, and a position with no balance produces no row
  // at all — so the only cost of being wrong here is a few extra reads.

  // Index 500 Vault btc at weight 1 until 78496126 commented it out and
  // 69e48b55 deleted it, both on 2025-06-17. Still commented out in
  // BtcVault.jsx:26-43.
  () =>
    new BasePendlePT("base", 8453, ["pt mcbbtc 26jun2025"], "single", {
      marketAddress: "0xd94Fd7bcEb29159405Ae1E06Ce80e51EF1A484B0",
      assetAddress: "0x5C6593F57EE95519fF6a8Cd16A5e41Ff50af239a",
      assetDecimals: 8,
      symbolOfBestTokenToZapOut: "cbbtc",
      bestTokenAddressToZapOut: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      decimalOfBestTokenToZapOut: 8,
    }),
  // ETH Vault long_term_bond at weight 0.4 for three months until 10765e84
  // removed it on 2025-04-14.
  () =>
    new BaseMoonwell("base", 8453, ["wsteth"], "single", {
      symbolOfBestTokenToZapInOut: "wsteth",
      zapInOutTokenAddress: "0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452",
      decimalsOfZapInOutToken: 18,
      assetAddress: "0x627Fe393Bc6EdDA28e99AE648fD6fF362514304b",
      protocolAddress: "0x627Fe393Bc6EdDA28e99AE648fD6fF362514304b",
      assetDecimals: 8,
    }),
  // Stable+ gold at weight 0.03 for two days: added by 805bb555 on 2024-12-13,
  // removed by 274ed6c9 on 2024-12-15. Built as BaseAerodrome back then, a class
  // deleted in a23c6060 — BaseVelodrome with protocolName "aerodrome" reaches
  // the same pool and gauge, so only the uniqueId's class segment differs from
  // what a 2024 wallet would have entered.
  () =>
    new BaseVelodrome("base", 8453, ["usdc", "zunusd"], "LP", {
      protocolName: "aerodrome",
      protocolVersion: "0",
      routerAddress: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
      assetAddress: "0x72c3eEd99b100526e1a25e04Ce7A22D7C3005c06",
      assetDecimals: 18,
      guageAddress: "0x55f9db31250D311c54D61F1384F75dbdF54b8305",
      lpTokens: [
        ["usdc", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6],
        ["zunusd", "0xD5B9dDB04f20eA773C9b56607250149B26049B1F", 18],
      ],
      rewards: AERODROME_REWARDS,
    }),
];

// Exported so a test can prove no entry is stranded on a chain the exit pages
// never scan: an entry keyed to an unsupported chain would silently never be
// returned, reading as rescued while staying unreachable.
export const RETIRED_POSITION_COUNT = RETIRED_POSITION_BUILDERS.length;

/**
 * Retired protocol instances on `chainName`.
 * Bare instances, not exit entries: collectExitProtocols owns the
 * uniqueId/label/dedupe shaping, so a retired position can never present itself
 * differently from a vault-derived one.
 * The chain is read off the instance rather than stored beside it — the vault
 * strategies key a chain and construct its protocols with the same string, and a
 * second copy here could drift from the one the exit actually reads.
 */
export function retiredExitPositions(chainName) {
  const positions = [];
  for (const build of RETIRED_POSITION_BUILDERS) {
    let instance;
    try {
      instance = build();
    } catch (error) {
      logger.warn(
        "AA Exit: could not build a retired position, skipping it",
        error,
      );
      continue;
    }
    if (instance.chain.toLowerCase() !== chainName) continue;
    positions.push(instance);
  }
  return positions;
}
