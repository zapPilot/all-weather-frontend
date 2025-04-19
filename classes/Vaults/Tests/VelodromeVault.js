import { BasePortfolio } from "../../BasePortfolio";
import { BaseVelodrome } from "../../Velodrome/BaseVelodrome";
export class VelodromeVault extends BasePortfolio {
  constructor() {
    super(
      {
        stablecoin: {
          op: [
            {
              interface: new BaseVelodrome("op", 10, ["usdc", "msusd"], "LP", {
                protocolName: "velodrome",
                protocolVersion: "v2",
                assetAddress: "0xe148D6Ae042De77c1f9fe0d6c495EbfD7b705B4c",
                assetDecimals: 18,
                routerAddress: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858",
                guageAddress: "0xf9ddd38A4e0C3237563DBB651D1a155551e54ad6",
                lpTokens: [
                  ["usdc", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", 6],
                  ["msusd", "0x9dAbAE7274D28A45F0B65Bf8ED201A5731492ca0", 18],
                ],
                rewards: [
                  {
                    symbol: "velo",
                    priceId: {
                      coinmarketcapApiId: 20435,
                    },
                    address: "0x9560e827af36c94d2ac33a39bce1fe78631088db",
                    decimals: 18,
                  },
                ],
              }),
              weight: 1,
            },
          ],
        },
      },
      {
        stablecoin: 1,
      },
      "Velodrome Vault",
    );
    this.validateStrategyWeights();
  }
}
