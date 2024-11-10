import { BasePortfolio } from "../BasePortfolio";
import { BaseEquilibria } from "../Pendle/BaseEquilibria";
export class BtcVault extends BasePortfolio {
  constructor() {
    super(
      {
        gold: {
          arbitrum: [
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["dwbtc", "pt dwbtc 26jun2025"],
                "single",
                {
                  assetAddress: "0x8cAB5Fd029ae2FBF28c53E965E4194C7260aDF0C",
                  symbolOfBestTokenToZapOut: "wbtc",
                  bestTokenAddressToZapOut:
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
                  decimalOfBestTokenToZapOut: 8,
                  pidOfEquilibria: 53,
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
  denomination() {
    return "₿";
  }
}
