// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";

describe("Referral Fee Module", () => {
  // it("should not charge fee for zap-in", async () => {
  //   const actionName = "zapIn";
  //   const userAddress = "0x210050bB080155AEc4EAE79a2aAC5fe78FD738E1";
  //   const tokenSymbol = "weth";
  //   const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  //   const investmentAmount = 1;
  //   const tokenDecimals = 18;
  //   const zapOutPercentage = NaN;
  //   const setProgress = () => {};
  //   const setStepName = () => {};
  //   const slippage = 0.5;
  //   const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
  //   const txns = await generateIntentTxns(
  //     actionName,
  //     portfolioHelper,
  //     userAddress,
  //     tokenSymbol,
  //     tokenAddress,
  //     investmentAmount,
  //     tokenDecimals,
  //     zapOutPercentage,
  //     setProgress,
  //     setStepName,
  //     slippage,
  //   );
  //   expect(txns.length).toBe(5);
  //   expect(await encode(txns[0])).toBe(
  //     "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000de0b6b3a7640000",
  //   );
  //   expect(await encode(txns[1])).toBe(
  //     "0x095ea7b3000000000000000000000000888888888889758f76e7103c6cbf23abbf58f9460000000000000000000000000000000000000000000000000de0b6b3a7640000",
  //   );
  // });
  it("should charge fee for zap-out", async () => {
    const actionName = "zapOut";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
    const txns = await generateIntentTxns(
      actionName,
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
    expect(await encode(txns[0])).toBe(
      "0x095ea7b3000000000000000000000000c7517f481cc0a645e63f870830a4b2e580421e3200000000000000000000000000000000000000000000000005092246729b8180",
    );
    expect(await encode(txns[9])).includes(
      "0xa9059cbb000000000000000000000000210050bb080155aec4eae79a2aac5fe78fd738e1",
    );
    expect(await encode(txns[10])).includes(
      "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd5",
    );
  });
});
