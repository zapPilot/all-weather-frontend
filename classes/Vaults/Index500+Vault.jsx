import { BaseVault } from "./BaseVault";
import { BaseCamelot } from "../camelot/BaseCamelot";
import { StablecoinVault } from "./StablecoinVault";
import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import { BasePendlePT } from "../Pendle/BasePendlePT";
import { EthVault } from "./EthVault";
import { BaseVelodrome } from "../Velodrome/BaseVelodrome";
export class Index500VaultPlus extends BaseVault {
  constructor() {
    // Get StablecoinVault's strategy
    const stablecoinVault = new StablecoinVault();
    const ethVault = new EthVault();
    const strategies = {
      gold: {
        imports: [
          {
            strategy: stablecoinVault.strategy.gold,
            weight: 1,
          },
        ],
      },
      eth: {
        imports: [
          {
            strategy: ethVault.strategy.long_term_bond,
            weight: 1,
          },
        ],
      },
      intermediate_term_bond: {
        arbitrum: [
          {
            interface: new BaseCamelot(
              "arbitrum",
              42161,
              ["eth", "pendle"],
              "LP",
              {
                assetDecimals: 18,
                assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                protocolAddress: "0xE461f84C3fE6BCDd1162Eb0Ef4284F3bB6e4CAD3",
                rewardPoolAddress: "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                lpTokens: [
                  ["pendle", "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8", 18],
                  ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                ],
                tickers: {
                  tickLower: -73500,
                  tickUpper: -60120,
                },
                rewards: [
                  {
                    symbol: "grail",
                    priceId: {
                      coinmarketcapApiId: 22949,
                    },
                    address: "0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8",
                    decimals: 18,
                  },
                  {
                    symbol: "xgrail",
                    priceId: {
                      coinmarketcapApiId: 22949,
                    },
                    address: "0x3caae25ee616f2c8e13c74da0813402eae3f496b",
                    decimals: 18,
                  },
                  {
                    symbol: "pendle",
                    priceId: {
                      coinmarketcapApiId: 9481,
                    },
                    address: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                    decimals: 18,
                  },
                  {
                    symbol: "weth",
                    priceId: {
                      coinmarketcapApiId: 1027,
                    },
                    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                    decimals: 18,
                  },
                ],
              },
            ),
            weight: 0,
          },
        ],
      },
      large_cap_us_stocks: {
        arbitrum: [
          {
            interface: new BaseCamelot(
              "arbitrum",
              42161,
              ["link", "eth"],
              "LP",
              {
                assetDecimals: 18,
                assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                protocolAddress: "0xe8795cF9c2309eCfe05Df028eB0F21D5D6e3a951",
                rewardPoolAddress: "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                lpTokens: [
                  ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                  ["link", "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", 18],
                ],
                tickers: {
                  //   const minPrice =
                  //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                  // const maxPrice =
                  //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                  // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                  tickLower: 46050,
                  tickUpper: 58780,
                },
                rewards: [
                  {
                    symbol: "grail",
                    priceId: {
                      coinmarketcapApiId: 22949,
                    },
                    address: "0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8",
                    decimals: 18,
                  },
                  {
                    symbol: "xgrail",
                    priceId: {
                      coinmarketcapApiId: 22949,
                    },
                    address: "0x3caae25ee616f2c8e13c74da0813402eae3f496b",
                    decimals: 18,
                  },
                  {
                    symbol: "link",
                    priceId: {
                      coinmarketcapApiId: 1975,
                    },
                    address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
                    decimals: 18,
                  },
                  {
                    symbol: "weth",
                    priceId: {
                      coinmarketcapApiId: 1027,
                    },
                    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                    decimals: 18,
                  },
                ],
              },
            ),
            weight: 0,
          },
        ],
      },
      btc: {
        base: [
          {
            interface: new BaseEquilibria(
              "base",
              8453,
              ["pt mcbbtc 26jun2025", "mcbbtc"],
              "single",
              {
                assetAddress: "0xd94Fd7bcEb29159405Ae1E06Ce80e51EF1A484B0",
                symbolOfBestTokenToZapOut: "cbbtc",
                bestTokenAddressToZapOut:
                  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                decimalOfBestTokenToZapOut: 8,
                pidOfEquilibria: 1,
              },
            ),
            weight: 0,
          },
          // {
          //   interface: new BasePendlePT(
          //     "base",
          //     8453,
          //     ["pt mcbbtc 26jun2025"],
          //     "single",
          //     {
          //       marketAddress: "0xd94Fd7bcEb29159405Ae1E06Ce80e51EF1A484B0",
          //       assetAddress: "0x5C6593F57EE95519fF6a8Cd16A5e41Ff50af239a",
          //       assetDecimals: 8,
          //       symbolOfBestTokenToZapOut: "cbbtc",
          //       bestTokenAddressToZapOut:
          //         "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
          //       decimalOfBestTokenToZapOut: 8,
          //     },
          //   ),
          //   // weight: 0.6,
          //   weight: 1,
          // },
          {
            interface: new BaseVelodrome(
              "base",
              8453,
              ["tbtc", "cbbtc"],
              "LP",
              {
                protocolName: "aerodrome",
                routerAddress: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
                protocolVersion: "0",
                assetAddress: "0x488d6ea6064eEE9352fdCDB7BC50d98A7fF3AD4E",
                assetDecimals: 18,
                guageAddress: "0x80AAd55965d1eA36bAf15Ae6Ed798145ec65916F",
                lpTokens: [
                  ["tbtc", "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b", 18],
                  ["cbbtc", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", 8],
                ],
                rewards: [
                  {
                    symbol: "aero",
                    priceId: {
                      coinmarketcapApiId: 29270,
                    },
                    address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
                    decimals: 18,
                  },
                ],
              },
            ),
            weight: 0.4,
          },
        ],
      },
    };
    const weightMapping = {
      gold: 0.5,
      eth: 0.0795,
      large_cap_us_stocks: 0,
      intermediate_term_bond: 0,
      btc: 0.4205,
    };
    super(strategies, weightMapping, "Index 500+ Vault");
  }
}
