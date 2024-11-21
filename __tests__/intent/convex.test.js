// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
describe("Convex", () => {
  it("should be able to zap-in Convex's Stablecoin Vault", async () => {
    const actionName = "zapIn";
    const userAddress = "0x04B79E6394a8200DF40d1b7fb2eC310B2e45D232";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = NaN;
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Convex Stablecoin Vault");
    const txns = await generateIntentTxns(
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
    );
    expect(txns.length).toBe(8);
    expect(await encode(txns[0])).toBe(
      "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000de0b6b3a7640000",
    );

    expect(
      (await encode(txns[2])).includes(
        userAddress.replace("0x", "").toLowerCase(),
      ),
    ).toBe(true);
    expect(txns[3].to).toBe("0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34");
  });
  it("should be able to zap-out Convex's Stablecoin Vault", async () => {
    const actionName = "zapOut";
    const userAddress = "0x04B79E6394a8200DF40d1b7fb2eC310B2e45D232";
    const recipientInEncodeData = "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = 0.00022992956568238272;
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Convex Stablecoin Vault");
    const txns = await generateIntentTxns(
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
    );
    expect(txns.length).toBe(11);
    expect(txns[0].to).toBe("0xe062e302091f44d7483d9D6e0Da9881a0817E2be");
    expect(txns[1].to).toBe("0x096A8865367686290639bc50bF8D85C0110d9Fea");
    expect(txns[2].to).toBe("0xe062e302091f44d7483d9D6e0Da9881a0817E2be");
  });
  it("should be able to claim from Convex Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0xaf88d065e77c8cc2239327c5edb3a432268e5831 0 6 1 0.5
    const actionName = "claimAndSwap";
    const userAddress = "0x04B79E6394a8200DF40d1b7fb2eC310B2e45D232";
    const recipientInEncodeData = "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 0;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Convex Stablecoin Vault");
    const txns = await generateIntentTxns(
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
    );
    expect(txns.length).toBe(3);

    // claim
    expect(txns[0].to).toBe("0xe062e302091f44d7483d9D6e0Da9881a0817E2be");
    // approve and swap * 2
    expect(
      (await encode(txns[1])).includes(
        "1111111254eeb25477b68fb85ed929f73a960582",
      ),
    ).toBe(true);
  });
});
