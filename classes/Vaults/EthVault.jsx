import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import { BaseConvex } from "../Convex/BaseConvex";
import { BaseVelodrome } from "../Velodrome/BaseVelodrome";
import { BasePendlePT } from "../Pendle/BasePendlePT";
import { BaseAave } from "../Aave/BaseAave";
import { BaseVault } from "./BaseVault";

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
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0.26,
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
                assetDecimals: 18,
                symbolOfBestTokenToZapOut: "weth",
                bestTokenAddressToZapOut:
                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                decimalOfBestTokenToZapOut: 18,
              },
            ),
            weight: 0.28,
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
            weight: 0.24,
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
            weight: 0.22,
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
