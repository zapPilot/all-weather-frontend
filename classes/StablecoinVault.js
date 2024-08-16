import { BasePortfolio } from "./BasePortfolio";
import { ApolloX } from "./ApolloX/ApolloX";
export class StablecoinVault extends BasePortfolio {
  constructor() {
    super({
      gold: {
        arbitrum: [
          {
            interface: new ApolloX(
              42161,
              ["btc", "dai", "eth", "usdc(bridged)", "usdt"],
              "single",
              {},
            ),
            weight: 1,
          },
        ],
      },
    });
    this.validateStrategyWeights();
  }
  reuseFetchedDataFromRedux(slice) {
    // get strategyMetadata data directly from the redux store. So that we don't need to run `initialize` function again
    // this data is for SunBurst chart to visualize the data
    this.portfolioAPR = slice;
  }
  reuseExistingInvestmentPositionsFromRedux(slice) {
    // get strategyMetadata data directly from the redux store. So that we don't need to run `initialize` function again
    // this data is for SunBurst chart to visualize the data
    this.existingInvestmentPositions = slice;
  }
}
