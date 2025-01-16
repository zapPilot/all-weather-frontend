// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import exp from "constants";
const equilibriaVaultAssetAddress =
  "0x3E4e3291Ed667FB4Dee680D19e5702eF8275493D";
describe("Stake module", () => {
  it(
    "should be able to stake",
    async () => {
      const userAddress = "0x39551EC839f10C235ec8DB062A93e89d3c0E6134";
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
          dust.arbitrum[equilibriaVaultAssetAddress].assetBalance.toString(),
        ),
      ).equals(0);
      expect(
        dust.arbitrum[equilibriaVaultAssetAddress].assetUsdBalanceOf,
      ).equals(0);
    },
    { timeout: 140000 },
  );
});
