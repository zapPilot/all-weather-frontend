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
const protocolAssetDustInWalletLoading = true;
const onlyThisChain = false;
describe("Camelot Vault", () => {
  it("should be able to zap-in Camelot Vault", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 10000;
    const tokenDecimals = 18;
    const zapOutPercentage = undefined;
    const portfolioHelper = getPortfolioHelper("Camelot Vault");
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: arbitrum,
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
      protocolAssetDustInWalletLoading,
      onlyThisChain,
    });
    expect(txns.length).toBe(7);
    // referral fee
    expect(await encode(txns[0])).includes(
      "210050bb080155aec4eae79a2aac5fe78fd738e1",
    );
    // referral fee
    expect(await encode(txns[1])).includes(
      "2ecbc6f229fed06044cdb0dd772437a30190cd50",
    );
    // approve before swap
    expect(await encode(txns[2])).includes("0x095ea7b3");

    // approve to Camelot
    expect(await encode(txns[4])).includes("0x095ea7b3");
    expect(await encode(txns[5])).includes("0x095ea7b3");
    // approve to Camelot

    // mint
    expect(txns[6].to).toBe("0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15");
  });
  // it("should be able to zap-out Camelot Vault", async () => {
  //   const actionName = "zapOut";
  //   const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
  //   const tokenSymbol = "weth";
  //   const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  //   const investmentAmount = 1;
  //   const tokenDecimals = 18;
  //   const zapOutPercentage = 1;
  //   const setTradingLoss = () => {};
  //   const setStepName = () => {};
  //   const slippage = 0.5;
  //   const portfolioHelper = getPortfolioHelper("Camelot Vault");
  //   const txns = await generateIntentTxns({
  //     actionName,
  //     chainMetadata: arbitrum,
  //     portfolioHelper,
  //     accountAddress: userAddress,
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
  //     recipient: userAddress,
  //     protocolAssetDustInWallet,
  //     protocolAssetDustInWalletLoading,
  //     onlyThisChain,
  //   });
  //   const camelotNFTAddress = "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15";
  //   const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
  //   if (txns.length === 9) {
  //     expect(txns.length).toBe(9);
  //     // decrease liquidity
  //     expect(await encode(txns[0])).includes("0c49ccbe");
  //     expect(txns[0].to).toBe(camelotNFTAddress);
  //     // collect fees
  //     expect(await encode(txns[1])).includes("fc6f7865");
  //     expect(txns[1].to).toBe(camelotNFTAddress);
  //     // burn NFT
  //     expect(await encode(txns[2])).includes("42966c68");
  //     // harvest camelot reward
  //     expect(await encode(txns[3])).includes("bb43878e");
  //     //   redeem xgrail
  //     expect(await encode(txns[4])).includes("7cbc2373");

  //     // approve to 1inch
  //     expect(await encode(txns[5])).includes("095ea7b3");
  //     // swap
  //     const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
  //     const zeroxProxyAddress = "0x0000000000001ff3684f28c67538d4d072c22734";
  //     const paraswapProxyAddress = "0xdef171fe48cf0115b1d80b88dc8eab59176fee57";
  //     expect(txns[6].to.toLowerCase()).to.be.oneOf([
  //       oneInchArbAddress.toLowerCase(),
  //       zeroxProxyAddress.toLowerCase(),
  //       paraswapProxyAddress.toLowerCase(),
  //     ]);
  //     // fee: send referral fee
  //     expect(await encode(txns[7])).includes(
  //       "210050bb080155aec4eae79a2aac5fe78fd738e1",
  //     );
  //     // fee: send platform fee
  //     expect(await encode(txns[8])).includes(
  //       "2ecbc6f229fed06044cdb0dd772437a30190cd50",
  //     );
  //   } else {
  //     expect(txns.length).toBe(5);
  //     // decrease liquidity
  //     expect(await encode(txns[0])).includes("0c49ccbe");
  //     expect(txns[0].to).toBe(camelotNFTAddress);
  //     // collect fees
  //     expect(await encode(txns[1])).includes("fc6f7865");
  //     expect(txns[1].to).toBe(camelotNFTAddress);
  //     // burn NFT
  //     expect(await encode(txns[2])).includes("42966c68");

  //     //   // approve to 1inch
  //     //   expect(await encode(txns[3])).includes("095ea7b3");
  //     //   // swap
  //     //   expect(txns[4].to).toBe(oneInchArbAddress);
  //   }
  // });
  it("should be able to claim from Camelot Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0xaf88d065e77c8cc2239327c5edb3a432268e5831 0 6 1 0.5
    const actionName = "claimAndSwap";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 0;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Camelot Vault");
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: arbitrum,
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
      protocolAssetDustInWalletLoading,
      onlyThisChain,
    });

    if (txns.length === 6) {
      // harvest camelot reward
      expect(await encode(txns[0])).includes("bb43878e");
      //   redeem xgrail
      expect(await encode(txns[1])).includes("7cbc2373");

      // approve to 1inch
      expect(await encode(txns[2])).includes("095ea7b3");
      // swap
      expect(txns[3].to).toBe(oneInchArbAddress);
      // fee: send referral fee
      expect(await encode(txns[4])).includes(
        "210050bb080155aec4eae79a2aac5fe78fd738e1",
      );
      // fee: send platform fee
      expect(await encode(txns[5])).includes(
        "2ecbc6f229fed06044cdb0dd772437a30190cd50",
      );
    } else if (txns.length === 1) {
      expect(txns.length).toBe(1);
    } else {
      expect(txns.length).toBe(3);
    }
  });
});
