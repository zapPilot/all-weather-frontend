import { BaseVault } from "./BaseVault";
import { BaseCamelot } from "../camelot/BaseCamelot";
import { EthVault } from "./EthVault";
import { BtcVault } from "./BtcVault";
export class Index500Vault extends BaseVault {
  constructor() {
    const btcVault = new BtcVault();
    const ethVault = new EthVault();
    const strategies = {
      btc: {
        imports: [
          {
            strategy: btcVault.strategy.btc,
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
    };
    const weightMapping = {
      eth: 0.0795 * 2,
      large_cap_us_stocks: 0,
      intermediate_term_bond: 0,
      btc: 0.4205 * 2,
    };
    super(strategies, weightMapping, "Index 500 Vault");
  }
}
