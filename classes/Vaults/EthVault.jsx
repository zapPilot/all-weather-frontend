import { BasePortfolio } from "../BasePortfolio";
import { BaseEquilibria } from "../Pendle/BaseEquilibria";
import ReactMarkdown from "react-markdown";
export class EthVault extends BasePortfolio {
  constructor() {
    super(
      {
        long_term_bond: {
          arbitrum: [
            {
              interface: new BaseEquilibria(
                "arbitrum",
                42161,
                ["pt rseth 26dec2024", "rseth"],
                "single",
                {
                  assetAddress: "0xcB471665BF23B2Ac6196D84D947490fd5571215f",
                  symbolOfBestTokenToZapOut: "weth",
                  bestTokenAddressToZapOut:
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                  decimalOfBestTokenToZapOut: 18,
                  pidOfEquilibria: 47,
                },
              ),
              weight: 0.5,
            },
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
              weight: 0.5,
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
    1. Ethereum staking rewards
    2. Swap fees
    3. Farming rewards from protocols
    (non-sustainable)
    4. Trading of Principal Tokens
    (similar to zero-coupon bonds)
    `}
      </ReactMarkdown>
    );
  }
  denomination() {
    return "Ξ";
  }
  lockUpPeriod() {
    return 0;
  }
}
