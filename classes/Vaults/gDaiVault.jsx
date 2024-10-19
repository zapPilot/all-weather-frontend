import { BasePortfolio1 } from "../BasePortfolio1";
import { Gdai } from "../Pendle/gdai";
import ReactMarkdown from "react-markdown";
export class gDaiVault extends BasePortfolio1 {
  constructor() {
    super(
      {
        gold: {
          arbitrum: [
            {
              interface: new Gdai(
                "arbitrum",
                42161,
                ["gdai", "pt gdai 27mar2025"],
                "single",
                {
                  assetAddress: "0xA9104b8B6698979568852C30231871e28A482b3C",
                  symbolOfBestTokenToZapOut: "gdai",
                  bestTokenAddressToZapOut:
                    "0xd85E038593d7A098614721EaE955EC2022B9B91B",
                  decimalOfBestTokenToZapOut: 18,
                  pidOfEquilibria: 48,
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
  description() {
    return (
      <ReactMarkdown>
        {`
    1. Liquidation fees from perpetual exchanges
    2. Farming rewards from new protocols
    (non-sustainable)
    3. Swap fees
    4. Interest from lending
    `}
      </ReactMarkdown>
    );
  }
  denomination() {
    return "$";
  }
  lockUpPeriod() {
    return 2;
  }
}
