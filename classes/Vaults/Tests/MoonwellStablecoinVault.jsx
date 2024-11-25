import { BasePortfolio } from "../../BasePortfolio";
import { BaseMoonwell } from "../../Moonwell/BaseMoonwell";
export class MoonwellStablecoinVault extends BasePortfolio {
  constructor() {
    super(
      {
        long_term_bond: {
          base: [
            {
              interface: new BaseMoonwell("base", 8453, ["eurc"], "single", {
                symbolOfBestTokenToZapInOut: "eurc",
                zapInOutTokenAddress:
                  "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
                decimalsOfZapInOutToken: 6,
                assetAddress: "0xb682c840B5F4FC58B20769E691A6fa1305A501a2",
                protocolAddress: "0xb682c840B5F4FC58B20769E691A6fa1305A501a2",
                assetDecimals: 8,
              }),
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
