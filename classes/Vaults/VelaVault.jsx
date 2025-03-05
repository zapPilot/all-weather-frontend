import { BasePortfolio } from "../BasePortfolio";
import { Vela } from "../Vela/Vela";
export class VelaVault extends BasePortfolio {
  constructor() {
    super(
      {
        gold: {
          arbitrum: [
            {
                interface: new Vela(
                  "arbitrum",
                  42161,
                  ["usdc(bridged)"],
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
      "Vela Vault (Deprecated)",
    );
    this.validateStrategyWeights();
  }
  denomination() {
    return "$";
  }
}
