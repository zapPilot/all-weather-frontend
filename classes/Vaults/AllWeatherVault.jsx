import { BasePortfolio } from "../BasePortfolio";
import { BaseCamelot } from "../camelot/BaseCamelot";
export class AllWeatherVault extends BasePortfolio {
  constructor() {
    super(
      {
        long_term_bond: {
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
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    [
                      "pendle",
                      "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                      18,
                    ],
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
              weight: 0.3,
            },
            {
              interface: new BaseCamelot(
                "arbitrum",
                42161,
                ["usdc", "eth"],
                "LP",
                {
                  assetDecimals: 18,
                  assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                  // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                  protocolAddress: "0xB1026b8e7276e7AC75410F1fcbbe21796e8f7526",
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                    ["usdc", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 6],
                  ],
                  tickers: {
                    //   const minPrice =
                    //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                    // const maxPrice =
                    //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                    // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                    tickLower: -196260,
                    tickUpper: -193380,
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
                      symbol: "usdc",
                      priceId: {
                        coinmarketcapApiId: 3408,
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
              weight: 0.4,
            },
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
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
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
              weight: 0.3,
            },
          ],
          base: [],
        },
      },
      {
        long_term_bond: 1,
      },
    );
    this.validateStrategyWeights();
  }
}
