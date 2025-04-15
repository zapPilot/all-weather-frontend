// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { base } from "thirdweb/chains";
import { oneInchAddress } from "../../utils/oneInch.js";
const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 0.5;
const rebalancableUsdBalanceDict = {};
const protocolAssetDustInWallet = {};
const onlyThisChain = false;
const aerodromeRouterAddress = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";
describe("Aerodrome Vault", () => {
  //   it("should be able to zap-in Aerodrome Vault", async () => {
  //     const actionName = "zapIn";
  //     const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
  //     const tokenSymbol = "usdc";
  //     const tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  //     const investmentAmount = 100;
  //     const tokenDecimals = 18;
  //     const zapOutPercentage = NaN;
  //     const portfolioHelper = getPortfolioHelper("Aerodrome Vault");
  //     const txns = await generateIntentTxns(
  //       actionName,
  //       base,
  //       portfolioHelper,
  //       userAddress,
  //       tokenSymbol,
  //       tokenAddress,
  //       investmentAmount,
  //       tokenDecimals,
  //       zapOutPercentage,
  //       setTradingLoss,
  //       setStepName,
  //       setTotalTradingLoss,
  //       setPlatformFee,
  //       slippage,
  //       rebalancableUsdBalanceDict,
  //       userAddress,
  //       protocolAssetDustInWallet,
  //       onlyThisChain,
  //     );
  //     expect(txns.length).toBe(9);
  //     // approve to 1inch
  //     expect(await encode(txns[0])).toBe(
  //       "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000056bc75e2d63100000",
  //     );
  //     // referral fee
  //     expect(await encode(txns[1])).includes(
  //       "210050bb080155aec4eae79a2aac5fe78fd738e1",
  //     );
  //     // referral fee
  //     expect(await encode(txns[2])).includes(
  //       "2ecbc6f229fed06044cdb0dd772437a30190cd50",
  //     );
  //     // swap
  //     expect(await encode(txns[3])).includes(
  //       oneInchAddress.replace("0x", "").toLowerCase(),
  //     );

  //     // approve to Aerodrome
  //     expect(await encode(txns[4])).includes("0x095ea7b3");
  //     // approve to Aerodrome
  //     expect(await encode(txns[5])).includes("0x095ea7b3");

  //     // mint
  //     expect(txns[6].to).toBe(aerodromeRouterAddress);
  //     // approve to aerodrome
  //     expect(await encode(txns[7])).includes("0x095ea7b3");
  //     // stake
  //     expect(await encode(txns[8])).includes("b6b55f25");
  //   });
  // it("should be able to zap-out erodrome Vault", async () => {
  //   const actionName = "zapOut";
  //   const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
  //   const tokenSymbol = "usdc";
  //   const tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  //   const investmentAmount = 1;
  //   const tokenDecimals = 18;
  //   const zapOutPercentage = 1;
  //   const setTradingLoss = () => {};
  //   const setStepName = () => {};
  //   const slippage = 0.5;
  //   const portfolioHelper = getPortfolioHelper("Aerodrome Vault");
  //   const txns = await generateIntentTxns(
  //     actionName,
  //     base,
  //     portfolioHelper,
  //     userAddress,
  //     tokenSymbol,
  //     tokenAddress,
  //     investmentAmount,
  //     tokenDecimals,
  //     zapOutPercentage,
  //     setTradingLoss,
  //     setStepName,
  //     setTotalTradingLoss,
  //     setPlatformFee,
  //     slippage,
  //     rebalancableUsdBalanceDict,
  //     userAddress,
  //     protocolAssetDustInWallet,
  //     onlyThisChain,
  //   );
  //   const camelotNFTAddress = "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15";
  //   const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
  //   if (txns.length === 8) {
  //     expect(txns.length).toBe(8);
  //     // unstake
  //     expect(await encode(txns[0])).includes("2e1a7d4d");
  //     // approve aerodrome
  //     expect(await encode(txns[1])).includes("095ea7b3");
  //     // approve withdraw
  //     expect(await encode(txns[2])).includes("0dede6c4");
  //     // approve getReward
  //     expect(await encode(txns[3])).includes("c00007b0");
  //     // approve to 1inch
  //     expect(await encode(txns[4])).includes("095ea7b3");
  //     // // swap
  //     expect(txns[5].to).toBe(oneInchArbAddress);
  //     // swap
  //     expect(txns[5].to).toBe(oneInchArbAddress);
  //     // fee: send referral fee
  //     expect(await encode(txns[6])).includes(
  //       "210050bb080155aec4eae79a2aac5fe78fd738e1",
  //     );
  //     // fee: send platform fee
  //     expect(await encode(txns[7])).includes(
  //       "2ecbc6f229fed06044cdb0dd772437a30190cd50",
  //     );
  //   } else {
  //     expect(txns.length).toBe(6);
  //             // unstake
  //             expect(await encode(txns[0])).includes("2e1a7d4d");
  //     // approve aerodrome
  //     expect(await encode(txns[1])).includes("095ea7b3");
  //     // approve withdraw
  //     expect(await encode(txns[2])).includes("0dede6c4");
  //     // approve getReward
  //     expect(await encode(txns[3])).includes("c00007b0");
  //     // fee: send referral fee
  //     expect(await encode(txns[4])).includes(
  //       "210050bb080155aec4eae79a2aac5fe78fd738e1",
  //     );
  //     // fee: send platform fee
  //     expect(await encode(txns[5])).includes(
  //       "2ecbc6f229fed06044cdb0dd772437a30190cd50",
  //     );
  //   }
  // });
  it("should be able to claim from Aerodrome Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 0 6 1 0.5
    const actionName = "claimAndSwap";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const investmentAmount = 0;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Aerodrome Vault");
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: base,
      portfolioHelper,
      accountAddress: userAddress,
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
      recipient: userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    });
    if (txns.length === 1) {
      expect(await encode(txns[0])).includes("c00007b0");
    } else {
      expect(txns.length).toBe(3);
      // getReward
      expect(await encode(txns[0])).includes("c00007b0");
      // approve to 1inch
      expect(await encode(txns[1])).includes("095ea7b3");
      // The transaction right before bridging should be the aggregator swap
      const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
      // 1) Check the 'to' address is the 1inch aggregator
      const zeroxProxyAddress = "0x0000000000001ff3684f28c67538d4d072c22734";
      const paraswapProxyAddress = "0x93aAAe79a53759cD164340E4C8766E4Db5331cD7";
      expect(txns[2].to.toLowerCase()).to.be.oneOf([
        oneInchArbAddress.toLowerCase(),
        zeroxProxyAddress.toLowerCase(),
        paraswapProxyAddress.toLowerCase(),
      ]);
    }
  });
});
