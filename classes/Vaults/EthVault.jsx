import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import { BaseConvex } from "../Convex/BaseConvex";
import { BaseVelodrome } from "../Velodrome/BaseVelodrome";
import { BasePendlePT } from "../Pendle/BasePendlePT";
import { BaseAave } from "../Aave/BaseAave";
import { BaseVault } from "./BaseVault";
import { BaseVelodromeV3 } from "../Velodrome/BaseVelodromeV3";
export class EthVault extends BaseVault {
  constructor() {
    const strategies = {
      long_term_bond: {
        arbitrum: [
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt rseth 26dec2024", "rseth"],
              "single",
              {
                assetAddress: "0xcB471665BF23B2Ac6196D84D947490fd5571215f",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 47,
              },
            ),
            weight: 0,
          },
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt bedrock unieth 26dec2024", "unieth"],
              "single",
              {
                assetAddress: "0x279b44E48226d40Ec389129061cb0B56C5c09e46",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 44,
              },
            ),
            weight: 0,
          },
          {
            interface: new BaseConvex(
              "arbitrum",
              42161,
              ["zuneth", "weth"],
              "LP",
              {
                pid: 28,
                assetDecimals: 18,
                assetAddress: "0xEBEEC2EDbbc66eB9055fe772b154f34d3dd686C8",
                protocolAddress: "0xEBEEC2EDbbc66eB9055fe772b154f34d3dd686C8",
                convexRewardPool: "0x3708CFD102799F71DE70aeB9cbBE3A3b10529607",
                lpTokens: [
                  ["zuneth", "0x06d65ec13465ac5a4376dc101e1141252c4addf8", 18],
                  ["weth", "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", 18],
                ],
                rewards: [
                  {
                    symbol: "crv",
                    priceId: {
                      coinmarketcapApiId: 6538,
                    },
                    address: "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
                    decimals: 18,
                  },
                  {
                    symbol: "cvx",
                    priceId: {
                      coinmarketcapApiId: 9903,
                    },
                    address: "0xaAFcFD42c9954C6689ef1901e03db742520829c5",
                    decimals: 18,
                  },
                  {
                    symbol: "zuneth",
                    priceId: {
                      geckoterminal: {
                        chain: "arbitrum",
                        address: "0x06d65ec13465ac5a4376dc101e1141252c4addf8",
                      },
                    },
                    address: "0x06D65eC13465Ac5A4376dc101e1141252c4adDf8",
                    decimals: 18,
                  },
                ],
              },
            ),
            weight: 0.0,
          },
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt bedrock unieth 26jun2025", "unieth"],
              "single",
              {
                assetAddress: "0x3E4e3291Ed667FB4Dee680D19e5702eF8275493D",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 57,
              },
            ),
            weight: 0,
          },
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt rseth 26jun2025", "rseth"],
              "single",
              {
                assetAddress: "0x816F59FfA2239Fd7106F94eAbdC0a9547a892F2f",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 56,
              },
            ),
            weight: 0,
          },
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt eeth 26jun2025", "eeth"],
              "single",
              {
                assetAddress: "0xBf5E60ddf654085F80DAe9DD33Ec0E345773E1F8",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 55,
              },
            ),
            weight: 0,
          },
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt reth 26jun2025", "reth"],
              "single",
              {
                assetAddress: "0x14FbC760eFaF36781cB0eb3Cb255aD976117B9Bd",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 8,
              },
            ),
            weight: 0,
          },
          {
            interface: new BaseEquilibria(
              "arbitrum",
              42161,
              ["pt wsteth 26jun2025", "wsteth"],
              "single",
              {
                assetAddress: "0x08a152834de126d2ef83D612ff36e4523FD0017F",
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
                pidOfEquilibria: 7,
              },
            ),
            weight: 0,
          },
          {
            interface: new BasePendlePT(
              "arbitrum",
              42161,
              ["pt wsteth 26jun2025"],
              "single",
              {
                marketAddress: "0x08a152834de126d2ef83D612ff36e4523FD0017F",
                assetAddress: "0x1255638EFeca62e12E344E0b6B22ea853eC6e2c7",
                ytAddress: "0xC8D9369809e48d03FF7B69D7979b174e2D34874C",
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0,
          },
          {
            interface: new BasePendlePT(
              "arbitrum",
              42161,
              ["pt eeth 26jun2025"],
              "single",
              {
                marketAddress: "0xbf5e60ddf654085f80dae9dd33ec0e345773e1f8",
                assetAddress: "0xb33808ea0e883138680BA29311a220A7377cdb92",
                ytAddress: "0xCf1699A84F9eAC75e049ca8134C602cE24509Db6",
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0,
          },
          {
            interface: new BasePendlePT(
              "arbitrum",
              42161,
              ["pt wsteth 25jun2026"],
              "single",
              {
                marketAddress: "0xf78452e0f5C0B95fc5dC8353B8CD1e06E53fa25B",
                assetAddress: "0x71fBF40651E9D4278a74586AfC99F307f369Ce9A",
                ytAddress: "0x25BdA1EDd6aF17C61399aA0eb84b93dAA3069764",
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0,
          },
          {
            interface: new BasePendlePT(
              "arbitrum",
              42161,
              ["pt eeth 25jun2026"],
              "single",
              {
                marketAddress: "0x46d62a8dede1bf2d0de04f2ed863245cbba5e538",
                assetAddress: "0xaB7F3837E6e721abBc826927B655180Af6A04388",
                ytAddress: "0xfF9826C358a822D00187B487C349BC5E7F30788A",
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0.1,
          },
        ],
        base: [
          {
            interface: new BaseAave("base", 8453, ["weth"], "single", {
              symbolOfBestTokenToZapInOut: "weth",
              zapInOutTokenAddress:
                "0x4200000000000000000000000000000000000006",
              assetAddress: "0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7",
              protocolAddress: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
              assetDecimals: 18,
            }),
            weight: 0.05,
          },
          {
            interface: new BaseVelodrome(
              "base",
              8453,
              ["weth", "mseth"],
              "LP",
              {
                protocolName: "aerodrome-v1",
                protocolVersion: "0",
                assetAddress: "0xDE4FB30cCC2f1210FcE2c8aD66410C586C8D1f9A",
                assetDecimals: 18,
                routerAddress: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
                guageAddress: "0x62940D9643a130b80CA0f8bc7e94De5b7ec496C5",
                lpTokens: [
                  ["weth", "0x4200000000000000000000000000000000000006", 18],
                  ["mseth", "0x7Ba6F01772924a82D9626c126347A28299E98c98", 18],
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
            weight: 0,
          },
          {
            interface: new BaseVelodromeV3(
              "base",
              8453,
              ["weth", "mseth"],
              "LP",
              {
                protocolName: "aerodrome",
                protocolVersion: "v3",
                assetDecimals: 18,
                assetAddress: "0x827922686190790b37229fd06084350E74485b72",
                poolAddress: "0x74F72788F4814D7fF3C49B44684aa98Eee140C0E",
                guageAddress: "0x4f665e05d23a5AB1D1A581e8040B585Fb4d0453d",
                lpTokens: [
                  ["weth", "0x4200000000000000000000000000000000000006", 18],
                  ["mseth", "0x7Ba6F01772924a82D9626c126347A28299E98c98", 18],
                ],
                tickers: {
                  //   const minPrice =
                  //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                  // const maxPrice =
                  //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                  // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                  tickLower: -50,
                  tickUpper: 50,
                  tickSpacing: 50,
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
            weight: 0.4,
          },
          {
            interface: new BaseVelodromeV3(
              "base",
              8453,
              ["wsteth", "wrseth"],
              "LP",
              {
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
                  //   const minPrice =
                  //   1.0001 ** tickLower * 10 ** (18 * 2 - 18 - 6);
                  // const maxPrice =
                  //   1.0001 ** tickUpper * 10 ** (18 * 2 - 18 - 6);
                  // if minPirnce = 3000, then tickLower = log(3000/10^12)/log(1.0001)
                  tickLower: 1411,
                  tickUpper: 1415,
                  tickSpacing: 1,
                },
                rewards: [],
              },
            ),
            weight: 0.3,
          },
          {
            interface: new BasePendlePT(
              "base",
              8453,
              ["pt yoeth 26sep2025"],
              "single",
              {
                marketAddress: "0xee2058f408a43f6d952ebd55812b4bf0d1ca8854",
                assetAddress: "0xDe4f5ADc052AEd60000F3171785B168A3d27Dcd7",
                ytAddress: "0x621beDE1CA0043E96735BF7D1BEde903d55Cd62A",
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x4200000000000000000000000000000000000006",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0.1,
          },
          {
            interface: new BasePendlePT(
              "base",
              8453,
              ["pt wsuperOETHb 26jun2026"],
              "single",
              {
                marketAddress: "0x9621342d8fb87359abe8ab2270f402f202f87b67",
                assetAddress: "0x5FAB08F1Ec79cA9C21C4516AA38a12EF2c42c0Cc",
                ytAddress: "0x0000fcEc03d0B1FA261985175b3F0e2D98e3CA24",
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x4200000000000000000000000000000000000006",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0.1,
          },
        ],
      },
    };
    const weightMapping = {
      long_term_bond: 1,
    };
    super(strategies, weightMapping, "ETH Vault");
  }
}
