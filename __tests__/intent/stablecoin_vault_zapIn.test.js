// File: tokenTransfer.test.js
import { describe, it } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { arbitrum } from "thirdweb/chains";

describe("Stablecoin Vault", () => {
  it("should be able to zap-in with BigNumber", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
    const investmentAmount = 100;
    const tokenDecimals = 6;
    const zapOutPercentage = NaN;
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Stablecoin Vault");
    await generateIntentTxns(
      actionName,
      arbitrum,
      portfolioHelper,
      userAddress,
      tokenSymbol,
      tokenAddress,
      investmentAmount,
      tokenDecimals,
      zapOutPercentage,
      setProgress,
      setStepName,
      slippage,
      {},
      userAddress,
      {},
      false,
    );
  });
});
