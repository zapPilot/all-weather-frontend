// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
describe("Referral Fee Module", () => {
  // it("should not charge fee for zap-in", async () => {
  //   const actionName = "zapIn";
  //   const userAddress = "0x04B79E6394a8200DF40d1b7fb2eC310B2e45D232";
  //   const tokenSymbol = "weth";
  //   const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  //   const investmentAmount = 1;
  //   const tokenDecimals = 18;
  //   const zapOutPercentage = NaN;
  //   const setTradingLoss = () => {};
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
  //     setTradingLoss,
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
  it(
    "should charge fee for zap-out",
    async () => {
      const actionName = "zapOut";
      const userAddress = "0x04B79E6394a8200DF40d1b7fb2eC310B2e45D232";
      const tokenSymbol = "weth";
      const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
      const investmentAmount = 1;
      const tokenDecimals = 18;
      const zapOutPercentage = 1;
      const setTradingLoss = () => {};
      const setStepName = () => {};
      const slippage = 0.5;
      const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
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
        setTradingLoss,
        setStepName,
        slippage,
      );
      expect(await encode(txns[0])).includes(
        "0x095ea7b3000000000000000000000000c7517f481cc0a645e63f870830a4b2e580421e32000000000000000000000000000000000000000000000000",
      );
      if (txns.length === 9) {
        expect(txns.length).toBe(9);
        expect(await encode(txns[7])).includes(
          "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd50",
        );
        expect(await encode(txns[8])).includes(
          "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd50",
        );
      } else {
        expect(await encode(txns[5])).includes(
          "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd50",
        );
        expect(await encode(txns[6])).includes(
          "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd50",
        );
      }
    },
    { timeout: 70000 },
  );
});
