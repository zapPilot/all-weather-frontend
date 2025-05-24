// File: tokenTransfer.test.js
import { describe, it, expect, afterEach } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { arbitrum } from "thirdweb/chains";

const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 0.5;
const rebalancableUsdBalanceDict = {};
const protocolAssetDustInWallet = {};
const onlyThisChain = false;

describe("Stable+ Vault", () => {
  // Add cleanup after each test
  afterEach(async () => {
    // Add any necessary cleanup here
    await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to allow cleanup
  });

  it("should be able to zap-in with BigNumber", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
    const investmentAmount = 100000;
    const tokenDecimals = 6;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");

    try {
      await generateIntentTxns({
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
        protocolAssetDustInWallet:
          protocolAssetDustInWallet[
            arbitrum?.name
              .toLowerCase()
              .replace(" one", "")
              .replace(" mainnet", "")
          ],
        onlyThisChain,
      });
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });

  it("should fail with very big number", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "usdc";
    const tokenAddress = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
    const investmentAmount = 10000000000000;
    const tokenDecimals = 6;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");

    await expect(async () => {
      await generateIntentTxns({
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
        protocolAssetDustInWallet:
          protocolAssetDustInWallet[
            arbitrum?.name
              .toLowerCase()
              .replace(" one", "")
              .replace(" mainnet", "")
          ],
        onlyThisChain,
      });
    }).rejects.toThrow("number overflow");
  });

  it("should be able to zap-in with Big ETH", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "eth";
    const tokenAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
    const investmentAmount = 100;
    const tokenDecimals = 18;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");

    try {
      await generateIntentTxns({
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
        protocolAssetDustInWallet:
          protocolAssetDustInWallet[
            arbitrum?.name
              .toLowerCase()
              .replace(" one", "")
              .replace(" mainnet", "")
          ],
        onlyThisChain,
      });
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });
});
