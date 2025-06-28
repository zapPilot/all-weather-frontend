import { BasePortfolio } from "../../BasePortfolio";
import { BaseEquilibria } from "../../Pendle/BaseEquilibria";
export class EquilibriaETHVault extends BasePortfolio {
  constructor() {
    super(
      {
        long_term_bond: {
          arbitrum: [
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["pt bedrock unieth 26jun2025", "unieth"],
                "single",
                {
                  assetAddress: "0x7b8aec3d1986b4becbf1c651ff6a953cc0117b05",
                  symbolOfBestTokenToZapOut: "weth",
                  bestTokenAddressToZapOut:
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                  decimalOfBestTokenToZapOut: 18,
                  pidOfEquilibria: 57,
                },
              ),
              weight: 1,
            },
          ],
        },
      },
      {
        long_term_bond: 1,
      },
      "Equilibria ETH Vault",
    );
    this.validateStrategyWeights();
  }
}
