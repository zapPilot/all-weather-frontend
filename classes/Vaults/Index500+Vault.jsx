import { BaseVault } from "./BaseVault";
import { StablecoinVault } from "./StablecoinVault";
import { EthVault } from "./EthVault";
import { BtcVault } from "./BtcVault";
export class Index500VaultPlus extends BaseVault {
  constructor() {
    // Get StablecoinVault's strategy
    const stablecoinVault = new StablecoinVault();
    const ethVault = new EthVault();
    const btcVault = new BtcVault();
    const strategies = {
      gold: {
        imports: [
          {
            strategy: stablecoinVault.strategy.gold,
            weight: 1,
          },
        ],
      },
      btc: {
        imports: [
          {
            strategy: btcVault.strategy.btc,
            weight: 1,
          },
        ],
      },
      eth: {
        imports: [
          {
            strategy: ethVault.strategy.long_term_bond,
            weight: 1,
          },
        ],
      },
    };
    const weightMapping = {
      gold: 0.5,
      eth: 0.0795,
      btc: 0.4205,
    };
    super(strategies, weightMapping, "Index 500+ Vault");
  }
}
