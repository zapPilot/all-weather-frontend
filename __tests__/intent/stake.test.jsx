// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import exp from "constants";
describe("Stake module", () => {
  it(
    "should be able to stake",
    async () => {
      const userAddress = "0x04B79E6394a8200DF40d1b7fb2eC310B2e45D232";
      const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
      const dust = await portfolioHelper.calProtocolAssetDustInWalletDictionary(
        userAddress,
        {
          usdc: 1,
          weth: 4000,
          dai: 1,
          mseth: 4000,
          usdt: 1,
        },
      );
      expect(
        Number(
          dust.arbitrum[
            "0x279b44E48226d40Ec389129061cb0B56C5c09e46"
          ].assetBalance.toString(),
        ),
      ).greaterThan(0);
      expect(
        dust.arbitrum["0x279b44E48226d40Ec389129061cb0B56C5c09e46"]
          .assetUsdBalanceOf,
      ).greaterThan(0);
    },
    { timeout: 70000 },
  );
});
