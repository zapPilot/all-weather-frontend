// File: tokenTransfer.test.js
import { describe, it, expect, afterEach, vi } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { arbitrum } from "thirdweb/chains";

// Mock TokenPriceService to avoid API calls in tests
vi.mock("../../classes/TokenPriceService.js", () => {
  const mockPrices = {
    usdc: 1,
    usdt: 1,
    cvx: 3.5,
    eth: 3000,
    weth: 3000,
    base: 1,
    xeqb: 0.5,
    gyd: 1.02,
    pendle: 2.5,
    eqb: 1.5,
    grail: 1.2,
    dai: 1,
    btc: 45000,
    wbtc: 45000,
    bold: 1,
    ousdt: 1,
  };

  return {
    PriceService: class MockPriceService {
      static get STATIC_PRICES() {
        return {
          usd: 1,
          usdc: 1,
          usdt: 1,
          dai: 1,
          frax: 0.997,
          usde: 1,
          gho: 0.9986,
        };
      }

      static async getAllTokenPrices() {
        return mockPrices;
      }

      async fetchPrices() {
        return mockPrices;
      }
    },
    TokenPriceBatcher: class MockTokenPriceBatcher {
      constructor() {}

      async fetchPrices(tokens) {
        // Comprehensive token price map for testing
        const allTokenPrices = {
          // Static stable coins
          usd: 1,
          usdc: 1,
          usdt: 1,
          dai: 1,
          frax: 0.997,
          usde: 1,
          gho: 0.9986,

          // Main tokens
          eth: 3000,
          weth: 3000,
          btc: 45000,
          wbtc: 45000,

          // DeFi tokens
          cvx: 3.5,
          pendle: 2.5,
          eqb: 1.5,
          xeqb: 0.5,
          grail: 1.2,
          gyd: 1.02,

          // Base chain tokens
          base: 1,
          bold: 1,
          ousdt: 1,
          msusd: 1,

          // Additional protocol tokens that might be needed
          aave: 95,
          crv: 0.35,
          bal: 2.8,
          ldo: 1.2,
          rpl: 25,
          "usdc.e": 1,

          // Override with mockPrices
          ...mockPrices,
        };

        // For any token not in our list, return price of 1
        const result = tokens.reduce((acc, token) => {
          acc[token] = allTokenPrices[token] || 1;
          return acc;
        }, {});

        // Always include essential tokens
        return {
          ...allTokenPrices,
          ...result,
        };
      }
    },
  };
});

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

    expect(async () => {
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
      }).toThrow("number overflow");
    });
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
