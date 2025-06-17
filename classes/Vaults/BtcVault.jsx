import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import { BaseVelodrome } from "../Velodrome/BaseVelodrome";
import { BaseVault } from "./BaseVault";
export class BtcVault extends BaseVault {
  constructor() {
    const strategies = {
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
          //   weight: 0.2,
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
            weight: 0.8,
          },
        ],
      },
    };
    const weightMapping = {
      btc: 1,
    };
    super(strategies, weightMapping, "BTC Vault");
  }
}
