import { BasePortfolio } from "./BasePortfolio";
import { ApolloX20240806 } from "./ApolloX/ApolloX20240806";
import { ApolloX20240813 } from "./ApolloX/ApolloX20240813";
import { ApolloX20240820 } from "./ApolloX/ApolloX20240820";
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
              weight: 1,
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
      <ReactMarkdown className="text-base text-gray-500">
        {`
    Where does the revenue come from?:
    1. Liquidation fees from perpetual exchanges
    2. Farming rewards from new protocols (non-sustainable)
    3. Swap fees
    4. Interest from lending
    `}
      </ReactMarkdown>
    );
  }
}
