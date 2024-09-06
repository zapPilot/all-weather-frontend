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
    Where does the yield come from?
    1. Ethereum staking rewards
    2. Swap fees
    3. Farming rewards from protocols (non-sustainable)
    4. Trading of Principal Tokens (similar to zero-coupon bonds)
    `}
      </ReactMarkdown>
    );
  }
}
