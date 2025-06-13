import { describe, it, expect, vi } from "vitest";
import { getMinimumTokenAmount } from "../utils/environment.js";

// Mock the config imports
vi.mock("../config/minimumThresholds", () => ({
  MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD: 10,
  MINIMUM_BRIDGE_USD_THRESHOLD: 50,
}));

describe("Environment Utils", () => {
  describe("getMinimumTokenAmount", () => {
    const mockTokenPrices = {
      usdc: 1,
      eth: 3000,
      btc: 45000,
    };

    const mockPortfolioHelper = {
      strategy: {
        category1: {
          arbitrum: [{ weight: 0.3 }, { weight: 0.2 }],
          ethereum: [{ weight: 0.5 }],
        },
        category2: {
          optimism: [{ weight: 0.1 }, { weight: 0.4 }],
        },
      },
    };

    it("should handle token with dash in name", () => {
      const result = getMinimumTokenAmount(
        "usdc-test",
        true,
        mockPortfolioHelper,
        mockTokenPrices,
        "arbitrum",
      );

      // Should extract "usdc" from "usdc-test" and use its price (1)
      // Smallest weight in arbitrum is 0.2, sum is 0.5, normalized = 0.4
      // protocolMinZapInUSD = 10 / 0.4 = 25
      // minimumTokenAmount = 25 / 1 = 25
      expect(result).toBe(25);
    });

    it("should handle single chain mode (shouldSkipBridge = true)", () => {
      const result = getMinimumTokenAmount(
        "eth",
        true,
        mockPortfolioHelper,
        mockTokenPrices,
        "arbitrum",
      );

      // In arbitrum chain: weights [0.3, 0.2], smallest = 0.2, sum = 0.5
      // Normalized smallest = 0.2 / 0.5 = 0.4
      // protocolMinZapInUSD = 10 / 0.4 = 25
      // minimumTokenAmount = 25 / 3000 = 0.008333...
      expect(result).toBeCloseTo(0.008333, 5);
    });

    it("should handle cross chain mode (shouldSkipBridge = false)", () => {
      const result = getMinimumTokenAmount(
        "btc",
        false,
        mockPortfolioHelper,
        mockTokenPrices,
        "arbitrum",
      );

      // Smallest weight across all chains: min(0.3, 0.2, 0.5, 0.1, 0.4) = 0.1
      // protocolMinZapInUSD = 10 / 0.1 = 100

      // Chain weights: arbitrum = 0.5, ethereum = 0.5, optimism = 0.5
      // Total chain weight = 1.5, normalized: arbitrum = 1/3, ethereum = 1/3, optimism = 1/3
      // Bridge minimums: 50 / (1/3) = 150 for each chain
      // Max of (100, 150, 150, 150) = 150
      // minimumTokenAmount = 150 / 45000 = 0.003333...
      expect(result).toBeCloseTo(0.003333, 5);
    });

    it("should handle missing portfolio helper", () => {
      const result = getMinimumTokenAmount(
        "usdc",
        true,
        null,
        mockTokenPrices,
        "arbitrum",
      );

      // No portfolio helper, smallest weight defaults to 1, sum defaults to 1
      // Normalized smallest = 1 / 1 = 1
      // protocolMinZapInUSD = 10 / 1 = 10
      // minimumTokenAmount = 10 / 1 = 10
      expect(result).toBe(10);
    });

    it("should handle missing strategy", () => {
      const portfolioHelperNoStrategy = {};
      const result = getMinimumTokenAmount(
        "eth",
        true,
        portfolioHelperNoStrategy,
        mockTokenPrices,
        "arbitrum",
      );

      // No strategy, smallest weight defaults to 1, sum defaults to 1
      // minimumTokenAmount = 10 / 3000 = 0.003333...
      expect(result).toBeCloseTo(0.003333, 5);
    });

    it("should handle missing token price", () => {
      const result = getMinimumTokenAmount(
        "unknown-token",
        true,
        mockPortfolioHelper,
        mockTokenPrices,
        "arbitrum",
      );

      // Token price is undefined, calculation will result in NaN or Infinity
      expect(result).toBeNaN();
    });

    it("should handle empty chain in strategy", () => {
      const portfolioHelperEmptyChain = {
        strategy: {
          category1: {
            arbitrum: null,
            ethereum: [{ weight: 0.8 }],
          },
        },
      };

      const result = getMinimumTokenAmount(
        "usdc",
        true,
        portfolioHelperEmptyChain,
        mockTokenPrices,
        "arbitrum",
      );

      // No protocols in arbitrum chain, defaults apply
      expect(result).toBe(10);
    });

    it("should handle zero weights", () => {
      const portfolioHelperZeroWeights = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0 }, { weight: 0.5 }],
          },
        },
      };

      const result = getMinimumTokenAmount(
        "usdc",
        true,
        portfolioHelperZeroWeights,
        mockTokenPrices,
        "arbitrum",
      );

      // Smallest non-zero weight is 0.5, sum is 0.5
      // Normalized = 0.5 / 0.5 = 1
      // minimumTokenAmount = 10 / 1 = 10
      expect(result).toBe(10);
    });

    it("should handle cross chain with zero chain weights", () => {
      const portfolioHelperZeroChainWeight = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0 }],
            ethereum: [{ weight: 0.5 }],
          },
        },
      };

      const result = getMinimumTokenAmount(
        "usdc",
        false,
        portfolioHelperZeroChainWeight,
        mockTokenPrices,
        "arbitrum",
      );

      // Chain weights: arbitrum = 0, ethereum = 0.5
      // Only ethereum has weight, normalized weight = 1
      // Bridge minimum for ethereum = 50 / 1 = 50
      // protocolMinZapInUSD = 10 / 0.5 = 20
      // Max(20, 50) = 50
      expect(result).toBe(50);
    });

    it("should handle current chain not in strategy", () => {
      const result = getMinimumTokenAmount(
        "usdc",
        true,
        mockPortfolioHelper,
        mockTokenPrices,
        "polygon", // Not in strategy
      );

      // Current chain not in strategy, no protocols found
      // Defaults to smallest weight = 1, sum = 1
      expect(result).toBe(10);
    });

    it("should handle undefined token symbol", () => {
      const result = getMinimumTokenAmount(
        undefined,
        true,
        mockPortfolioHelper,
        mockTokenPrices,
        "arbitrum",
      );

      // Undefined token will cause issues in split and price lookup
      expect(result).toBeNaN();
    });

    it("should handle empty selected token", () => {
      const result = getMinimumTokenAmount(
        "",
        true,
        mockPortfolioHelper,
        mockTokenPrices,
        "arbitrum",
      );

      // Empty string token symbol
      expect(result).toBeNaN();
    });

    it("should calculate complex cross chain scenario correctly", () => {
      const complexPortfolio = {
        strategy: {
          defi: {
            arbitrum: [{ weight: 0.2 }, { weight: 0.3 }],
            ethereum: [{ weight: 0.1 }],
            optimism: [{ weight: 0.4 }],
          },
          stable: {
            arbitrum: [{ weight: 0.1 }],
            base: [{ weight: 0.2 }, { weight: 0.3 }],
          },
        },
      };

      const result = getMinimumTokenAmount(
        "usdc",
        false,
        complexPortfolio,
        mockTokenPrices,
        "arbitrum",
      );

      // Smallest weight across all: 0.1
      // protocolMinZapInUSD = 10 / 0.1 = 100

      // Chain weights:
      // arbitrum = 0.2 + 0.3 + 0.1 = 0.6
      // ethereum = 0.1
      // optimism = 0.4
      // base = 0.2 + 0.3 = 0.5
      // Total = 1.6

      // Normalized weights:
      // arbitrum = 0.6/1.6 = 0.375
      // ethereum = 0.1/1.6 = 0.0625
      // optimism = 0.4/1.6 = 0.25
      // base = 0.5/1.6 = 0.3125

      // Bridge minimums:
      // arbitrum: 50 / 0.375 = 133.33
      // ethereum: 50 / 0.0625 = 800
      // optimism: 50 / 0.25 = 200
      // base: 50 / 0.3125 = 160

      // Max(100, 133.33, 800, 200, 160) = 800
      expect(result).toBeCloseTo(800, 1);
    });
  });
});
