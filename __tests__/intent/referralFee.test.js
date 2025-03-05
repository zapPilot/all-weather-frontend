// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 0.5;
const rebalancableUsdBalanceDict = {};
const protocolAssetDustInWallet = {};
const onlyThisChain = false;
describe("Referral Fee Module", () => {
  // it("should not charge fee for zap-in", async () => {
  //   const actionName = "zapIn";
  //   const userAddress = "0x39551EC839f10C235ec8DB062A93e89d3c0E6134";
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
      const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
      const tokenSymbol = "usdc";
      const tokenAddress = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
      const investmentAmount = 1;
      const tokenDecimals = 6;
      const zapOutPercentage = 1;
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
        setTradingLoss,
        setStepName,
        setTotalTradingLoss,
        setPlatformFee,
        slippage,
        rebalancableUsdBalanceDict,
        userAddress,
        protocolAssetDustInWallet[
          arbitrum?.name.toLowerCase().replace(" one", "").replace(" mainnet", "")
        ],
        onlyThisChain,
      );
      // withdraw
      expect(await encode(txns[0])).includes("0x38d07436");
      if (txns.length === 9) {
        expect(txns.length).toBe(9);
        // transfer
        expect(await encode(txns[7])).includes(
          "0xa9059cbb000000000000000000000000210050bb080155aec4eae79a2aac5fe78fd738e1",
        );
        expect(await encode(txns[8])).includes(
          "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd50",
        );
      } else {
        expect(txns.length).toBe(11);
        // referral fee
        expect(await encode(txns[9])).includes(
          "0xa9059cbb000000000000000000000000210050bb080155aec4eae79a2aac5fe78fd738e1",
        );
        // platform fee
        expect(await encode(txns[10])).includes(
          "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd50",
        );
      }
    },
    { timeout: 140000 },
  );
});
