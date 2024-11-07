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
  description() {
    return (
      <ReactMarkdown className="text-base text-gray-500">
        {`
    1. Ethereum staking rewards
    2. Swap fees
    3. Farming rewards from protocols (non-sustainable)
    4. Trading of Principal Tokens (similar to zero-coupon bonds)
    `}
      </ReactMarkdown>
    );
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
