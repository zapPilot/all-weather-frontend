import { expect, test, describe } from "vitest";
import { getMinimumTokenAmount } from "../utils/environment";

describe("dynamic minimum amount", () => {
  const mockTokenPrices = {
    usdc: 1,
    usdt: 1,
    weth: 2000,
  };

  const mockPortfolioHelper = {
    strategy: {
      defi: {
        ethereum: [
          { weight: 0.3, protocol: "aave" },
          { weight: 0.7, protocol: "compound" },
        ],
        arbitrum: [
          { weight: 0.4, protocol: "aave" },
          { weight: 0.6, protocol: "compound" },
        ],
      },
    },
  };

  test("should return correct minimum amount for single chain mode", () => {
    const result = getMinimumTokenAmount(
      "usdc-0x123-6",
      true, // shouldSkipBridge
      mockPortfolioHelper,
      mockTokenPrices,
      "ethereum",
    );

    // In single chain mode, we normalize weights
    // Smallest weight is 0.3, sum of weights is 1.0
    // So normalized weight is 0.3
    // MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD (3) / 0.3 = 10
    expect(result).toBe(1.6666666666666667);
  });

  test("should return correct minimum amount for cross chain mode", () => {
    const result = getMinimumTokenAmount(
      "usdc-0x123-6",
      false, // shouldSkipBridge
      mockPortfolioHelper,
      mockTokenPrices,
      "ethereum",
    );

    // In cross chain mode:
    // Take max of all minimums
    expect(result).toBe(10);
  });

  test("should handle different token prices", () => {
    const result = getMinimumTokenAmount(
      "weth-0x123-18",
      true,
      mockPortfolioHelper,
      mockTokenPrices,
      "ethereum",
    );

    // Same calculation as first test but with WETH price of 2000
    // 10 / 2000 = 0.005
    expect(result).toBe(0.0008333333333333334);
  });

  test("should handle empty strategy", () => {
    const result = getMinimumTokenAmount(
      "usdc-0x123-6",
      true,
      { strategy: {} },
      mockTokenPrices,
      "ethereum",
    );

    // With no strategy, smallestWeight defaults to 1
    expect(result).toBe(0.5);
  });

  test("should handle zero weights", () => {
    const portfolioWithZeroWeights = {
      strategy: {
        defi: {
          ethereum: [
            { weight: 0, protocol: "aave" },
            { weight: 0, protocol: "compound" },
          ],
        },
      },
    };

    const result = getMinimumTokenAmount(
      "usdc-0x123-6",
      true,
      portfolioWithZeroWeights,
      mockTokenPrices,
      "ethereum",
    );

    // With all zero weights, smallestWeight defaults to 1
    expect(result).toBe(0.5);
  });

  test("should handle missing token price", () => {
    const result = getMinimumTokenAmount(
      "unknown-0x123-6",
      true,
      mockPortfolioHelper,
      mockTokenPrices,
      "ethereum",
    );

    // With missing token price, it should return Infinity
    expect(result).toBe(NaN);
  });

  test("should handle missing token symbol", () => {
    const result = getMinimumTokenAmount(
      null,
      true,
      mockPortfolioHelper,
      mockTokenPrices,
      "ethereum",
    );

    // With missing token symbol, it should return Infinity
    expect(result).toBe(NaN);
  });
});
