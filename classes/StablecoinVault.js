import { BasePortfolio } from "./BasePortfolio";
import { ApolloX } from "./ApolloX/ApolloX";
export class StablecoinVault extends BasePortfolio {
  constructor() {
    super(
      {
        gold: {
          arbitrum: [
            {
              interface: new ApolloX(
                "arbitrum",
                42161,
                ["btc", "dai", "eth", "usdc(bridged)", "usdt"],
                "single",
                {},
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
}
