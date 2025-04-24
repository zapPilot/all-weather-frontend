// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { optimism } from "thirdweb/chains";
const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 0.5;
const rebalancableUsdBalanceDict = {};
const protocolAssetDustInWallet = {};
const onlyThisChain = false;
const velodromeRouterAddress = "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858";
const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
const zeroxProxyAddress = "0x0000000000001ff3684f28c67538d4d072c22734";
const paraswapProxyAddress = "0xdef171fe48cf0115b1d80b88dc8eab59176fee57";
describe("Velodrome Vault", () => {
  it("should be able to zap-in Velodrome Vault", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    const investmentAmount = 20000;
    const tokenDecimals = 6;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: optimism,
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
    expect(txns.length).toBe(9);
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
    // swap
    expect(txns[3].to.toLowerCase()).to.be.oneOf([
      oneInchArbAddress.toLowerCase(),
      zeroxProxyAddress.toLowerCase(),
      paraswapProxyAddress.toLowerCase(),
    ]);

    // approve to Velodrome
    expect(await encode(txns[4])).includes("0x095ea7b3");
    // approve to Velodrome
    expect(await encode(txns[5])).includes("0x095ea7b3");

    // mint
    expect(txns[6].to).toBe(velodromeRouterAddress);
    // approve to velodrome
    expect(await encode(txns[7])).includes("0x095ea7b3");
    // stake
    expect(await encode(txns[8])).includes("b6b55f25");
  });
  it("should be able to zap-out Velodrome Vault", async () => {
    const actionName = "zapOut";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    const investmentAmount = 2000;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: optimism,
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
    const camelotNFTAddress = "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15";
    const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
    if (txns.length === 8) {
      expect(txns.length).toBe(8);
      // unstake
      expect(await encode(txns[0])).includes("2e1a7d4d");
      // approve velodrome
      expect(await encode(txns[1])).includes("095ea7b3");
      // approve withdraw
      expect(await encode(txns[2])).includes("0dede6c4");
      // approve getReward
      expect(await encode(txns[3])).includes("c00007b0");
      // approve to 1inch
      expect(await encode(txns[4])).includes("095ea7b3");
      // swap
      expect(txns[5].to.toLowerCase()).to.be.oneOf([
        oneInchArbAddress.toLowerCase(),
        zeroxProxyAddress.toLowerCase(),
        paraswapProxyAddress.toLowerCase(),
      ]);
      // fee: send referral fee
      expect(await encode(txns[6])).includes(
        "210050bb080155aec4eae79a2aac5fe78fd738e1",
      );
      // fee: send platform fee
      expect(await encode(txns[7])).includes(
        "2ecbc6f229fed06044cdb0dd772437a30190cd50",
      );
      // // approve rewards
      // expect(await encode(txns[6])).includes("095ea7b3");
      // // swap rewards
      // expect(txns[7].to.toLowerCase()).to.be.oneOf([
      //   oneInchArbAddress.toLowerCase(),
      //   zeroxProxyAddress.toLowerCase(),
      //   paraswapProxyAddress.toLowerCase(),
      // ]);
      // // fee: send referral fee
      // expect(await encode(txns[8])).includes(
      //   "210050bb080155aec4eae79a2aac5fe78fd738e1",
      // );
      // // fee: send platform fee
      // expect(await encode(txns[9])).includes(
      //   "2ecbc6f229fed06044cdb0dd772437a30190cd50",
      // );
    } else {
      expect(txns.length).toBe(6);
      // unstake
      expect(await encode(txns[0])).includes("2e1a7d4d");
      // approve velodrome
      expect(await encode(txns[1])).includes("095ea7b3");
      // approve withdraw
      expect(await encode(txns[2])).includes("0dede6c4");
      // approve getReward
      expect(await encode(txns[3])).includes("c00007b0");
      // fee: send referral fee
      expect(await encode(txns[4])).includes(
        "210050bb080155aec4eae79a2aac5fe78fd738e1",
      );
      // fee: send platform fee
      expect(await encode(txns[5])).includes(
        "2ecbc6f229fed06044cdb0dd772437a30190cd50",
      );
    }
  });
  it("should be able to claim from Velodrome Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0x7F5c764cBc14f9669B88837ca1490cCa17c31607 0 6 1 0.5
    const actionName = "claimAndSwap";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    const investmentAmount = 0;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: optimism,
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
      expect(txns[2].to.toLowerCase()).to.be.oneOf([
        oneInchArbAddress.toLowerCase(),
        zeroxProxyAddress.toLowerCase(),
        paraswapProxyAddress.toLowerCase(),
      ]);
    }
  });
});
