import { BasePortfolio } from "../BasePortfolio";
import { BaseCamelot } from "../camelot/BaseCamelot";
import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import { BaseMoonwell } from "../Moonwell/BaseMoonwell";
import { BaseAerodrome } from "../Aerodrome/BaseAerodrome";
import { BaseAura } from "../Aura/BaseAura";
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
              weight: 0.25,
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
              weight: 0.25,
            },
            {
              interface: new BaseCamelot(
                "arbitrum",
                42161,
                ["tia", "eth"],
                "LP",
                {
                  assetDecimals: 18,
                  assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                  // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                  protocolAddress: "0x1818FF61ba19C06A554C803eD98B603D5b7D1B43",
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                    ["tia", "0xD56734d7f9979dD94FAE3d67C7e928234e71cD4C", 6],
                  ],
                  tickers: {
                    //   const minPrice =
                    //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                    // const maxPrice =
                    //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                    // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                    tickLower: -228420,
                    tickUpper: -204180,
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
                      symbol: "tia",
                      priceId: {
                        coinmarketcapApiId: 22861,
                      },
                      address: "0xD56734d7f9979dD94FAE3d67C7e928234e71cD4C",
                      decimals: 6,
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
            {
              interface: new BaseCamelot(
                "arbitrum",
                42161,
                ["sol", "usdc"],
                "LP",
                {
                  assetDecimals: 18,
                  assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                  // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                  protocolAddress: "0x622B5186384783BB805c12A808cCF07F41DE1Ff0",
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    ["sol", "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07", 9],
                    ["usdc", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 6],
                  ],
                  tickers: {
                    //   const minPrice =
                    //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                    // const maxPrice =
                    //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                    // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                    tickLower: -887220,
                    tickUpper: 887220,
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
                      symbol: "sol",
                      priceId: {
                        coinmarketcapApiId: 5426,
                      },
                      address: "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07",
                      decimals: 9,
                    },
                    {
                      symbol: "usdc",
                      priceId: {
                        coinmarketcapApiId: 3408,
                      },
                      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                      decimals: 6,
                    },
                  ],
                },
              ),
              weight: 0,
            },
            {
              interface: new BaseCamelot(
                "arbitrum",
                42161,
                ["gmx", "eth"],
                "LP",
                {
                  assetDecimals: 18,
                  assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                  // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                  protocolAddress: "0xC99be44383BC8d82357F5A1D9ae9976EE9d75bee",
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                    ["gmx", "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", 18],
                  ],
                  tickers: {
                    //   const minPrice =
                    //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                    // const maxPrice =
                    //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                    // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                    tickLower: -887220,
                    tickUpper: 887220,
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
                      symbol: "weth",
                      priceId: {
                        coinmarketcapApiId: 2396,
                      },
                      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                      decimals: 18,
                    },
                    {
                      symbol: "gmx",
                      priceId: {
                        coinmarketcapApiId: 11857,
                      },
                      address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
                      decimals: 18,
                    },
                  ],
                },
              ),
              weight: 0,
            },
            {
              interface: new BaseCamelot(
                "arbitrum",
                42161,
                ["wsteth", "eth"],
                "LP",
                {
                  assetDecimals: 18,
                  assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                  // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                  protocolAddress: "0xdEb89DE4bb6ecf5BFeD581EB049308b52d9b2Da7",
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    [
                      "wsteth",
                      "0x5979D7b546E38E414F7E9822514be443A4800529",
                      18,
                    ],
                    ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                  ],
                  tickers: {
                    //   const minPrice =
                    //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                    // const maxPrice =
                    //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                    // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                    tickLower: -887220,
                    tickUpper: 887220,
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
                      symbol: "weth",
                      priceId: {
                        coinmarketcapApiId: 2396,
                      },
                      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                      decimals: 18,
                    },
                    {
                      symbol: "wsteth",
                      priceId: {
                        coinmarketcapApiId: 12409,
                      },
                      address: "0x5979D7b546E38E414F7E9822514be443A4800529",
                      decimals: 18,
                    },
                  ],
                },
              ),
              weight: 0,
            },
            {
              interface: new BaseCamelot(
                "arbitrum",
                42161,
                ["magic", "eth"],
                "LP",
                {
                  assetDecimals: 18,
                  assetAddress: "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15",
                  // protocolAddress: NFT manager.factory() -> poolByPair(token0, token1)
                  protocolAddress: "0x1106dB7165A8d4a8559B441eCdEe14a5d5070DbC",
                  rewardPoolAddress:
                    "0xB312638B4C0d7b49E47057ba1E4feBF4f6aC5A01",
                  lpTokens: [
                    ["magic", "0x539bdE0d7Dbd336b79148AA742883198BBF60342", 18],
                    ["weth", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18],
                  ],
                  tickers: {
                    //   const minPrice =
                    //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                    // const maxPrice =
                    //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                    // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                    tickLower: -887220,
                    tickUpper: 887220,
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
                      symbol: "weth",
                      priceId: {
                        coinmarketcapApiId: 2396,
                      },
                      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                      decimals: 18,
                    },
                    {
                      symbol: "magic",
                      priceId: {
                        coinmarketcapApiId: 14783,
                      },
                      address: "0x539bdE0d7Dbd336b79148AA742883198BBF60342",
                      decimals: 18,
                    },
                  ],
                },
              ),
              weight: 0,
            },
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["usdc", "pt gusdc 26jun2025"],
                "single",
                {
                  assetAddress: "0x22e0F26320aCE985e3CB2434095F18Bfe114E28e",
                  symbolOfBestTokenToZapOut: "gusdc",
                  bestTokenAddressToZapOut:
                    "0xd3443ee1e91af28e5fb858fbd0d72a63ba8046e0",
                  decimalOfBestTokenToZapOut: 6,
                  pidOfEquilibria: 59,
                },
              ),
              weight: 0.065,
            },
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["usdc", "pt dusdc 26jun2025"],
                "single",
                {
                  assetAddress: "0x0bD6890b3Bb15f16430546147734b254d0B03059",
                  symbolOfBestTokenToZapOut: "dusdc",
                  bestTokenAddressToZapOut:
                    "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                  decimalOfBestTokenToZapOut: 6,
                  pidOfEquilibria: 52,
                },
              ),
              weight: 0.06,
            },
            {
              interface: new BaseAura(
                "arbitrum",
                42161,
                ["wausdcn", "gho"],
                "LP",
                {
                  pid: 69,
                  // poolId: asset.getPoolId()
                  assetAddress: "0x46472CBA35E6800012aA9fcC7939Ff07478C473E",
                  assetDecimals: 18,
                  poolId:
                    "0x46472cba35e6800012aa9fcc7939ff07478c473e00020000000000000000056c",
                  lpTokens: [
                    [
                      "wausdcn",
                      "0x7CFaDFD5645B50bE87d546f42699d863648251ad",
                      6,
                    ],
                    ["gho", "0x7dfF72693f6A4149b17e7C6314655f6A9F7c8B33", 18],
                  ],
                  originalRewards: [
                    {
                      symbol: "bal",
                      priceId: {
                        coinmarketcapApiId: 5728,
                      },
                      address: "0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8",
                      decimals: 18,
                    },
                  ],
                  rewards: [
                    {
                      symbol: "aura",
                      priceId: {
                        coinmarketcapApiId: 21532,
                      },
                      address: "0x1509706a6c66ca549ff0cb464de88231ddbe213b",
                      stashAddress:
                        "0xDfb793eE33AF74ad17E86B337b5996e75bf16cfd",
                      decimals: 18,
                    },
                    {
                      symbol: "gho",
                      priceId: {
                        coinmarketcapApiId: 23508,
                      },
                      address: "0x7dff72693f6a4149b17e7c6314655f6a9f7c8b33",
                      stashAddress:
                        "0x3ABC7f66972C06eBa17Bf5fbd4C78076c3fd5E16",
                      decimals: 18,
                    },
                  ],
                },
              ),
              weight: 0.06,
            },
            {
              interface: new BaseAura(
                "arbitrum",
                42161,
                ["usdx", "usdt"],
                "LP",
                {
                  pid: 94,
                  assetAddress: "0x85564af67760063b994599b640552614238c9ee6",
                  assetDecimals: 18,
                  poolId:
                    "0x85564af67760063b994599b640552614238c9ee60000000000000000000005e3",
                  lpTokens: [
                    ["usdx", "0xf3527ef8de265eaa3716fb312c12847bfba66cef", 18],
                    ["usdt", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 6],
                  ],
                  originalRewards: [
                    {
                      symbol: "bal",
                      priceId: {
                        coinmarketcapApiId: 5728,
                      },
                      address: "0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8",
                      decimals: 18,
                    },
                  ],
                  rewards: [
                    {
                      symbol: "aura",
                      priceId: {
                        coinmarketcapApiId: 21532,
                      },
                      address: "0x1509706a6c66ca549ff0cb464de88231ddbe213b",
                      stashAddress:
                        "0xDfb793eE33AF74ad17E86B337b5996e75bf16cfd",
                      decimals: 18,
                    },
                  ],
                },
              ),
              weight: 0.065,
            },
          ],
          base: [
            {
              interface: new BaseMoonwell("base", 8453, ["eurc"], "single", {
                symbolOfBestTokenToZapInOut: "eurc",
                zapInOutTokenAddress:
                  "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
                decimalsOfZapInOutToken: 6,
                assetAddress: "0xb682c840B5F4FC58B20769E691A6fa1305A501a2",
                protocolAddress: "0xb682c840B5F4FC58B20769E691A6fa1305A501a2",
                assetDecimals: 8,
              }),
              weight: 0.02,
            },
            {
              interface: new BaseAerodrome(
                "base",
                8453,
                ["msusd", "usdc"],
                "LP",
                {
                  assetAddress: "0xcEFC8B799a8EE5D9b312aeca73262645D664AaF7",
                  assetDecimals: 18,
                  guageAddress: "0xDBF852464fC906C744E52Dbd68C1b07dD33A922a",
                  lpTokens: [
                    ["msusd", "0x526728DBc96689597F85ae4cd716d4f7fCcBAE9d", 18],
                    ["usdc", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6],
                  ],
                },
              ),
              weight: 0.23,
            },
          ],
        },
      },
      {
        long_term_bond: 1,
      },
      "All Weather Vault",
    );
    this.validateStrategyWeights();
  }
}
