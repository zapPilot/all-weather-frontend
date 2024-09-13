import { BasePortfolio } from "../BasePortfolio";
import { YearnV3Vault } from "../Yearn/YearnV3Vault";
import { RsETHPool26Dec2024 } from "../Pendle/rsETHPool26Dec2024";
import ReactMarkdown from "react-markdown";
export class EthVault extends BasePortfolio {
  constructor() {
    super(
      {
        long_term_bond: {
          arbitrum: [
            {
              interface: new YearnV3Vault(
                "arbitrum",
                42161,
                ["eth"],
                "single",
                {},
              ),
              weight: 0.01,
            },
            {
              interface: new RsETHPool26Dec2024(
                "arbitrum",
                42161,
                ["pt rseth 26dec2024-rseth"],
                "single",
                {
                  assetAddress: '0xcB471665BF23B2Ac6196D84D947490fd5571215f',
                  symbolOfBestTokenToZapOut: 'weth',
                  bestTokenAddressToZapOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                  decimalOfBestTokenToZapOut: 18
                },
              ),
              weight: 0.99,
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
