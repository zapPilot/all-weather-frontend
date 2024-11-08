import { BasePortfolio } from "../../BasePortfolio";
import { YearnV3Vault } from "../../Yearn/YearnV3Vault";
import ReactMarkdown from "react-markdown";
export class YearnVault extends BasePortfolio {
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
  lockUpPeriod() {
    return 0;
  }
}
