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
describe("Equilibria ETH Vault", () => {
  // it("should be able to zap-in Equilibria's ETH Vault", async () => {
  //   const actionName = "zapIn";
  //   const userAddress = "0x39551EC839f10C235ec8DB062A93e89d3c0E6134";
  //   const tokenSymbol = "weth";
  //   const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  //   const investmentAmount = 1;
  //   const tokenDecimals = 18;
  //   const zapOutPercentage = NaN;
  //   const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
  //   const txns = await generateIntentTxns(
  //     actionName,
  //     arbitrum,
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
  //   expect(txns.length).toBe(7);
  //   expect(await encode(txns[0])).toBe(
  //     "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000de0b6b3a7640000",
  //   );
  //   // referral fee
  //   expect(await encode(txns[1])).includes(
  //     "2ecbc6f229fed06044cdb0dd772437a30190cd50",
  //   );
  //   expect(await encode(txns[2])).includes(
  //     "2ecbc6f229fed06044cdb0dd772437a30190cd50",
  //   );
  //   expect(await encode(txns[3])).includes(
  //     "0x095ea7b3000000000000000000000000888888888889758f76e7103c6cbf23abbf58f946",
  //   );
  //   expect(
  //     (await encode(txns[4])).includes(
  //       userAddress.replace("0x", "").toLowerCase(),
  //     ),
  //   ).toBe(true);
  //   // asset address
  //   expect(txns[5].to).toBe("0x3E4e3291Ed667FB4Dee680D19e5702eF8275493D");
  //   expect(
  //     (await encode(txns[5])).includes(
  //       "4d32c8ff2facc771ec7efc70d6a8468bc30c26bf",
  //     ),
  //   ).toBe(true);
  //   expect(txns[6].to).toBe("0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF");
  // });
  it("should be able to zap-out Equilibria's ETH Vault", async () => {
    const actionName = "zapOut";
    const userAddress = "0x39551EC839f10C235ec8DB062A93e89d3c0E6134";
    const recipientInEncodeData = "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 100;
    const tokenDecimals = 18;
    const zapOutPercentage = 0.00022992956568238272;
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
    try {
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
        onlyThisChain,
      });
      expect(await encode(txns[0])).includes(
        "c7517f481cc0a645e63f870830a4b2e580421e32",
      );
      expect(txns[1].to).toBe("0xc7517f481Cc0a645e63f870830A4B2e580421e32");
      expect(txns[2].to).toBe("0x279b44E48226d40Ec389129061cb0B56C5c09e46");
      expect(
        (await encode(txns[2])).includes(
          "888888888889758f76e7103c6cbf23abbf58f946",
        ),
      ).toBe(true);
      expect(txns[3].to).toBe("0x888888888889758F76e7103c6CbF23ABbF58F946");
      expect(
        (await encode(txns[3])).includes(
          userAddress.replace("0x", "").toLowerCase(),
        ),
      ).toBe(true);

      // redeem
      expect(txns[4].to).toBe("0x96c4a48abdf781e9c931cfa92ec0167ba219ad8e");

      // swap
      expect(txns[6].to).toBe("0x1111111254EEB25477B68fb85Ed929f73A960582");
      expect(txns[8].to).toBe("0x82af49447d8a07e3bd95bd0d56f35241523fbab1");
    } catch (error) {
      expect(error.message).toBe("No protocol txns");
    }
  });
  it("should be able to claim from Equilibria Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0xaf88d065e77c8cc2239327c5edb3a432268e5831 0 6 1 0.5
    const actionName = "claimAndSwap";
    const userAddress = "0x39551EC839f10C235ec8DB062A93e89d3c0E6134";
    const recipientInEncodeData = "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 0;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
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
      onlyThisChain,
    });
    // claim
    expect(txns[0].to).toBe("0xc7517f481Cc0a645e63f870830A4B2e580421e32");
    // redeem xEqbContract
    // if xeqb is 0, then no redeem
    // expect(txns[1][0].to).toBe("0x96c4a48abdf781e9c931cfa92ec0167ba219ad8e");

    if (txns.length === 4) {
      // approve and swap * 2
      expect(
        (await encode(txns[2])).includes(
          "1111111254eeb25477b68fb85ed929f73a960582",
        ),
      ).toBe(true);
      expect(txns[3].to).toBe("0x1111111254EEB25477B68fb85Ed929f73A960582");
    } else {
      expect(txns.length).toBe(1);
    }
  });
});
