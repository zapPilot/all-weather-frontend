import { BasePortfolio } from "../BasePortfolio";
import { ApolloX20240806 } from "../ApolloX/ApolloX20240806";
import { ApolloX20240813 } from "../ApolloX/ApolloX20240813";
import { ApolloX20240820 } from "../ApolloX/ApolloX20240820";
import { Vela } from "../Vela/Vela";
import { BaseConvex } from "../Convex/BaseConvex";
import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import ReactMarkdown from "react-markdown";
export class StablecoinVault extends BasePortfolio {
  constructor() {
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
              weight: 0.2,
            },
            {
              interface: new Vela(
                "arbitrum",
                42161,
                ["usdc(bridged)"],
                "single",
                {},
              ),
              weight: 0.2,
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
              weight: 0.1,
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
                },
              ),
              weight: 0.5,
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
  description() {
    return (
      <ReactMarkdown>
        {`
    1. Liquidation fees from perpetual exchanges
    2. Farming rewards from new protocols
    (non-sustainable)
    3. Swap fees
    4. Interest from lending
    `}
      </ReactMarkdown>
    );
  }
  denomination() {
    return "$";
  }
  lockUpPeriod() {
    return 2;
  }
}
