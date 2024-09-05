import { BasePortfolio } from "../BasePortfolio";
import { YearnV3Vault } from "../Yearn/YearnV3Vault";
import ReactMarkdown from "react-markdown";
export class EthVault extends BasePortfolio {
  constructor() {
    super(
      {
        long_term_bond: {
          arbitrum: [
            {
              interface: new YearnV3Vault(
                "arbitrum",
                42161,
                ["eth"],
                "single",
                {},
              ),
              weight: 1,
            },
          ],
        },
      },
      {
        long_term_bond: 1,
      },
    );
    this.validateStrategyWeights();
  }
  description() {
    return (
      <ReactMarkdown className="text-base text-gray-500">
        {`
    Where does the revenue come from?
    1. Liquidation fees from perpetual exchanges
    2. Farming rewards from new protocols (non-sustainable)
    3. Swap fees
    4. Interest from lending
    `}
      </ReactMarkdown>
    );
  }
}
