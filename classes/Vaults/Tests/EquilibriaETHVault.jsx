import { BasePortfolio } from "../../BasePortfolio";
import { BaseEquilibria } from "../../Pendle/BaseEquilibria";
import ReactMarkdown from "react-markdown";
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
                ["pt bedrock unieth 26dec2024", "unieth"],
                "single",
                {
                  assetAddress: "0x279b44E48226d40Ec389129061cb0B56C5c09e46",
                  symbolOfBestTokenToZapOut: "weth",
                  bestTokenAddressToZapOut:
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                  decimalOfBestTokenToZapOut: 18,
                  pidOfEquilibria: 44,
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
    );
    this.validateStrategyWeights();
  }
  description() {
    return (
      <ReactMarkdown className="text-base text-gray-500">
        {`
    Where does the yield come from?
    1. Ethereum staking rewards
    2. Swap fees
    3. Farming rewards from protocols (non-sustainable)
    4. Trading of Principal Tokens (similar to zero-coupon bonds)
    `}
      </ReactMarkdown>
    );
  }
}
