import { BasePortfolio } from "../BasePortfolio";
import { ApolloX20240806 } from "../ApolloX/ApolloX20240806";
import { ApolloX20240813 } from "../ApolloX/ApolloX20240813";
import { ApolloX20240820 } from "../ApolloX/ApolloX20240820";
import { Vela } from "../Vela/Vela";
import { BaseConvex } from "../Convex/BaseConvex";
import { BaseEquilibria } from "../Pendle/BaseEquilibria";
export class StablecoinVault extends BasePortfolio {
  constructor(address) {
    super(
      {
        gold: {
          arbitrum: [
            {
              interface: new ApolloX20240806(
                "arbitrum",
                42161,
                ["btc", "dai", "eth", "usdc(bridged)", "usdt"],
                "single",
                {
                  stakeFarmContractAddress:
                    "0xD2e71125ec0313874d578454E28086fba7444c0c",
                },
              ),
              weight: 0,
            },
            {
              interface: new ApolloX20240813(
                "arbitrum",
                42161,
                ["btc", "dai", "eth", "usdc(bridged)", "usdt"],
                "single",
                {
                  stakeFarmContractAddress:
                    "0x97E3384447B52A63374EBA93cb36e02a20633926",
                },
              ),
              weight: 0,
            },
            {
              interface: new ApolloX20240820(
                "arbitrum",
                42161,
                ["btc", "dai", "eth", "usdc(bridged)", "usdt"],
                "single",
                {
                  stakeFarmContractAddress:
                    "0xaA0DE632A4071642d72Ceb03577F5534ea196927",
                },
              ),
              weight: 0,
            },
            {
              interface: new Vela(
                "arbitrum",
                42161,
                ["usdc(bridged)"],
                "single",
                {},
              ),
              weight: 0.25,
              address,
            },
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["dai", "pt gdai 27mar2025"],
                "single",
                {
                  assetAddress: "0xA9104b8B6698979568852C30231871e28A482b3C",
                  symbolOfBestTokenToZapOut: "gdai",
                  bestTokenAddressToZapOut:
                    "0xd85E038593d7A098614721EaE955EC2022B9B91B",
                  decimalOfBestTokenToZapOut: 18,
                  pidOfEquilibria: 48,
                },
              ),
              weight: 0,
            },
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["usdc", "pt gusdc 26dec2024"],
                "single",
                {
                  assetAddress: "0xa877a0E177b54A37066c1786F91a1DAb68F094AF",
                  symbolOfBestTokenToZapOut: "gusdc",
                  bestTokenAddressToZapOut:
                    "0xd3443ee1e91af28e5fb858fbd0d72a63ba8046e0",
                  decimalOfBestTokenToZapOut: 6,
                  pidOfEquilibria: 45,
                },
              ),
              weight: 0.25,
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
              weight: 0.25,
            },
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["ausdc", "pt ausdc 26dec2024"],
                "single",
                {
                  assetAddress: "0x875F154f4eC93255bEAEA9367c3AdF71Cdcb4Cc0",
                  symbolOfBestTokenToZapOut: "ausdc",
                  bestTokenAddressToZapOut:
                    "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                  decimalOfBestTokenToZapOut: 6,
                  pidOfEquilibria: 43,
                },
              ),
              weight: 0,
            },
            {
              interface: new BaseConvex(
                "arbitrum",
                42161,
                ["usde", "usdx"],
                "LP",
                {
                  pid: 34,
                  assetDecimals: 18,
                  assetAddress: "0x096A8865367686290639bc50bF8D85C0110d9Fea",
                  protocolAddress: "0x096A8865367686290639bc50bF8D85C0110d9Fea",
                  convexRewardPool:
                    "0xe062e302091f44d7483d9D6e0Da9881a0817E2be",
                  lpTokens: [
                    ["usde", "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34", 18],
                    ["susd", "0xb2f30a7c980f052f02563fb518dcc39e6bf38175", 18],
                  ],
                  rewards: [
                    {
                      symbol: "crv",
                      coinmarketcapApiId: 6538,
                      address: "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
                      decimals: 18,
                    },
                    {
                      symbol: "cvx",
                      coinmarketcapApiId: 9903,
                      address: "0xaAFcFD42c9954C6689ef1901e03db742520829c5",
                      decimals: 18,
                    },
                  ],
                },
              ),
              weight: 0.25,
            },
          ],
        },
      },
      {
        gold: 1,
      },
    );
    this.validateStrategyWeights();
  }
  denomination() {
    return "$";
  }
  async lockUpPeriod(address) {
    // Get lockUpPeriods from all protocols
    const lockUpPeriodsPromises = this.strategy.gold.arbitrum.map(
      (protocol) => {
        if (protocol.interface.lockUpPeriod) {
          return protocol.interface.lockUpPeriod(address);
        } else {
          return Promise.resolve(0);
        }
      },
    );
    // Wait for all lockUpPeriods to resolve
    const lockUpPeriodsArray = await Promise.all(lockUpPeriodsPromises);
    // Get the maximum lockUpPeriod
    const lockUpPeriods = Math.max(...lockUpPeriodsArray);
    return lockUpPeriods;
  }
}
