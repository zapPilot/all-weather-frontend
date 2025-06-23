import { describe, it, expect } from "vitest";
import {
  normalizeChainName,
  transformToDebankChainName,
  calCrossChainInvestmentAmount,
  getAvailableAssetChains,
} from "../utils/chainHelper";

describe("chainHelper", () => {
  describe("normalizeChainName", () => {
    it("should normalize chain names by removing suffixes and converting to lowercase", () => {
      expect(normalizeChainName("Ethereum Mainnet")).toBe("ethereum");
      expect(normalizeChainName("Arbitrum One")).toBe("arbitrum");
      expect(normalizeChainName("BSC Mainnet")).toBe("bsc");
      expect(normalizeChainName("Polygon Mainnet")).toBe("polygon");
    });

    it("should handle case insensitive input", () => {
      expect(normalizeChainName("ETHEREUM MAINNET")).toBe("ethereum");
      expect(normalizeChainName("arbitrum ONE")).toBe("arbitrum");
      expect(normalizeChainName("MiXeD CaSe OnE")).toBe("mixed case");
    });

    it("should trim whitespace", () => {
      expect(normalizeChainName("  ethereum mainnet  ")).toBe("ethereum");
      expect(normalizeChainName("\tethereum one\n")).toBe("ethereum");
      expect(normalizeChainName("   arbitrum   one   ")).toBe("arbitrum");
    });

    it("should handle edge cases with falsy inputs", () => {
      expect(normalizeChainName(null)).toBe("");
      expect(normalizeChainName(undefined)).toBe("");
      expect(normalizeChainName("")).toBe("");
      expect(normalizeChainName("   ")).toBe("");
    });

    it("should handle chains without suffixes", () => {
      expect(normalizeChainName("ethereum")).toBe("ethereum");
      expect(normalizeChainName("base")).toBe("base");
      expect(normalizeChainName("polygon")).toBe("polygon");
    });

    it("should handle chains with only one suffix", () => {
      expect(normalizeChainName("ethereum one")).toBe("ethereum");
      expect(normalizeChainName("polygon mainnet")).toBe("polygon");
    });

    it("should handle chains with both suffixes", () => {
      expect(normalizeChainName("arbitrum one mainnet")).toBe("arbitrum");
      expect(normalizeChainName("test one test mainnet")).toBe("test test");
    });

    it("should handle special characters and numbers", () => {
      expect(normalizeChainName("chain-name-1 mainnet")).toBe("chain-name-1");
      expect(normalizeChainName("test_chain_v2 one")).toBe("test_chain_v2");
    });

    it("should remove only first occurrence of ' one' and ' mainnet' suffixes", () => {
      expect(normalizeChainName("Ethereum One One")).toBe("ethereum one");
      expect(normalizeChainName("Polygon Mainnet Mainnet")).toBe(
        "polygon mainnet",
      );
      expect(normalizeChainName("Test One Mainnet One")).toBe("test one");
    });

    it("should remove suffixes even if they appear in the middle of the string", () => {
      expect(normalizeChainName("My One Chain")).toBe("my chain");
      expect(normalizeChainName("Another Mainnet Test")).toBe("another test");
    });
  });

  describe("transformToDebankChainName", () => {
    it("should transform known chain names to debank format", () => {
      expect(transformToDebankChainName("ethereum")).toBe("eth");
      expect(transformToDebankChainName("arbitrum one")).toBe("arb");
      expect(transformToDebankChainName("bsc")).toBe("bsc");
      expect(transformToDebankChainName("base")).toBe("base");
      expect(transformToDebankChainName("op mainnet")).toBe("op");
    });

    it("should return original chain name for unknown chains", () => {
      expect(transformToDebankChainName("polygon")).toBe("polygon");
      expect(transformToDebankChainName("avalanche")).toBe("avalanche");
      expect(transformToDebankChainName("fantom")).toBe("fantom");
      expect(transformToDebankChainName("unknown-chain")).toBe("unknown-chain");
    });

    it("should handle case sensitivity correctly", () => {
      expect(transformToDebankChainName("ETHEREUM")).toBe("ETHEREUM");
      expect(transformToDebankChainName("Ethereum")).toBe("Ethereum");
      expect(transformToDebankChainName("ethereum")).toBe("eth");
    });

    it("should handle edge cases with falsy inputs", () => {
      expect(transformToDebankChainName(null)).toBe(null);
      expect(transformToDebankChainName(undefined)).toBe(undefined);
      expect(transformToDebankChainName("")).toBe("");
    });

    it("should handle numeric and special character inputs", () => {
      expect(transformToDebankChainName("123")).toBe("123");
      expect(transformToDebankChainName("chain-1")).toBe("chain-1");
      expect(transformToDebankChainName("test_chain")).toBe("test_chain");
    });
  });

  describe("calCrossChainInvestmentAmount", () => {
    const mockPortfolioHelper = {
      strategy: {
        category1: {
          arbitrum: [{ weight: 0.3 }, { weight: 0.2 }],
          optimism: [{ weight: 0.3 }, { weight: 0.2 }],
        },
        category2: {
          arbitrum: [{ weight: 0.5 }],
          ethereum: [{ weight: 0.4 }, { weight: 0.1 }],
        },
      },
    };

    it("should calculate correct investment amount for arbitrum chain", () => {
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        mockPortfolioHelper,
      );
      // category1.arbitrum: 0.3 + 0.2 = 0.5
      // category2.arbitrum: 0.5
      // Total: 0.5 + 0.5 = 1.0
      expect(result).toBe(1.0);
    });

    it("should calculate correct investment amount for optimism chain", () => {
      const result = calCrossChainInvestmentAmount(
        "optimism",
        mockPortfolioHelper,
      );
      // category1.optimism: 0.3 + 0.2 = 0.5
      // Total: 0.5
      expect(result).toBe(0.5);
    });

    it("should calculate correct investment amount for ethereum chain", () => {
      const result = calCrossChainInvestmentAmount(
        "ethereum",
        mockPortfolioHelper,
      );
      // category2.ethereum: 0.4 + 0.1 = 0.5
      // Total: 0.5
      expect(result).toBe(0.5);
    });

    it("should handle case insensitive chain names", () => {
      const result1 = calCrossChainInvestmentAmount(
        "ARBITRUM",
        mockPortfolioHelper,
      );
      const result2 = calCrossChainInvestmentAmount(
        "ArBiTrUm",
        mockPortfolioHelper,
      );
      expect(result1).toBe(1.0);
      expect(result2).toBe(1.0);
    });

    it("should normalize chain names before comparison", () => {
      const portfolioWithMainnet = {
        strategy: {
          staking: {
            "arbitrum mainnet": [{ weight: 0.6 }],
            "ethereum one": [{ weight: 0.4 }],
          },
        },
      };

      expect(
        calCrossChainInvestmentAmount("arbitrum", portfolioWithMainnet),
      ).toBe(0.6);
      expect(
        calCrossChainInvestmentAmount("ethereum", portfolioWithMainnet),
      ).toBe(0.4);
    });

    it("should return 0 for chains not in strategy", () => {
      const result = calCrossChainInvestmentAmount(
        "polygon",
        mockPortfolioHelper,
      );
      expect(result).toBe(0);
    });

    it("should handle undefined strategy", () => {
      const portfolioWithoutStrategy = {};
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        portfolioWithoutStrategy,
      );
      expect(result).toBe(0);
    });

    it("should handle null portfolio helper", () => {
      const result = calCrossChainInvestmentAmount("arbitrum", null);
      expect(result).toBe(0);
    });

    it("should handle undefined portfolio helper", () => {
      const result = calCrossChainInvestmentAmount("arbitrum", undefined);
      expect(result).toBe(0);
    });

    it("should handle empty strategy", () => {
      const emptyPortfolio = { strategy: {} };
      const result = calCrossChainInvestmentAmount("arbitrum", emptyPortfolio);
      expect(result).toBe(0);
    });

    it("should handle empty categories", () => {
      const portfolioWithEmptyCategory = {
        strategy: {
          category1: {},
        },
      };
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        portfolioWithEmptyCategory,
      );
      expect(result).toBe(0);
    });

    it("should handle empty protocol arrays", () => {
      const portfolioWithEmptyProtocols = {
        strategy: {
          category1: {
            arbitrum: [],
          },
        },
      };
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        portfolioWithEmptyProtocols,
      );
      expect(result).toBe(0);
    });

    it("should handle protocols without weight property", () => {
      const portfolioWithMissingWeights = {
        strategy: {
          category1: {
            arbitrum: [
              { weight: 0.3 },
              {}, // Missing weight
              { weight: 0.2 },
            ],
          },
        },
      };
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        portfolioWithMissingWeights,
      );
      // Missing weight becomes undefined, 0.3 + undefined + 0.2 = NaN
      expect(result).toBeNaN();
    });

    it("should handle edge cases with falsy inputs", () => {
      expect(calCrossChainInvestmentAmount(null, mockPortfolioHelper)).toBe(0);
      expect(
        calCrossChainInvestmentAmount(undefined, mockPortfolioHelper),
      ).toBe(0);
      expect(calCrossChainInvestmentAmount("", mockPortfolioHelper)).toBe(0);
    });

    it("should correctly sum weights when weight is 0", () => {
      const portfolioWithZeroWeight = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0.5 }, { weight: 0 }],
          },
        },
      };
      expect(
        calCrossChainInvestmentAmount("arbitrum", portfolioWithZeroWeight),
      ).toBe(0.5);
    });

    it("should handle protocol.weight as a string by resulting in string concatenation", () => {
      const portfolioWithStringWeight = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0.5 }, { weight: "0.2" }],
          },
        },
      };
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        portfolioWithStringWeight,
      );
      expect(result).toBe(0.7);
    });

    it("should handle protocolArray containing null elements by throwing an error", () => {
      const portfolioWithNullProtocols = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0.5 }, null, { weight: 0.2 }],
          },
        },
      };
      expect(() =>
        calCrossChainInvestmentAmount("arbitrum", portfolioWithNullProtocols),
      ).toThrow(TypeError);
    });

    it("should handle protocol.weight being NaN", () => {
      const portfolioWithNaNWeight = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0.5 }, { weight: NaN }, { weight: 0.2 }],
          },
        },
      };
      const result = calCrossChainInvestmentAmount(
        "arbitrum",
        portfolioWithNaNWeight,
      );
      expect(result).toBeNaN();
    });

    it("should handle negative weights correctly", () => {
      const portfolioWithNegativeWeights = {
        strategy: {
          category1: {
            arbitrum: [{ weight: 0.5 }, { weight: -0.3 }, { weight: 0.1 }],
          },
        },
      };
      expect(
        calCrossChainInvestmentAmount("arbitrum", portfolioWithNegativeWeights),
      ).toBeCloseTo(0.3, 5);
    });
  });

  describe("getAvailableAssetChains", () => {
    const mockPortfolioHelper = {
      strategy: {
        category1: {
          arbitrum: [{ weight: 0.3 }],
          optimism: [{ weight: 0.2 }],
          ethereum: [{ weight: 0.5 }],
        },
        category2: {
          arbitrum: [{ weight: 0.4 }], // Duplicate chain
          base: [{ weight: 0.3 }],
          polygon: [{ weight: 0.3 }],
        },
      },
    };

    it("should return unique list of available chains", () => {
      const result = getAvailableAssetChains(mockPortfolioHelper);
      expect(result).toEqual(
        expect.arrayContaining([
          "arbitrum",
          "optimism",
          "ethereum",
          "base",
          "polygon",
        ]),
      );
      expect(result).toHaveLength(5);
    });

    it("should deduplicate chains across categories", () => {
      const portfolioWithDuplicates = {
        strategy: {
          staking: {
            arbitrum: [{ weight: 0.5 }],
            ethereum: [{ weight: 0.5 }],
          },
          lending: {
            arbitrum: [{ weight: 0.3 }], // Duplicate
            ethereum: [{ weight: 0.4 }], // Duplicate
            base: [{ weight: 0.3 }],
          },
        },
      };

      const result = getAvailableAssetChains(portfolioWithDuplicates);
      expect(result).toEqual(
        expect.arrayContaining(["arbitrum", "ethereum", "base"]),
      );
      expect(result).toHaveLength(3);
    });

    it("should handle undefined strategy", () => {
      const portfolioWithoutStrategy = {};
      const result = getAvailableAssetChains(portfolioWithoutStrategy);
      expect(result).toEqual([]);
    });

    it("should handle null portfolio helper", () => {
      const result = getAvailableAssetChains(null);
      expect(result).toEqual([]);
    });

    it("should handle undefined portfolio helper", () => {
      const result = getAvailableAssetChains(undefined);
      expect(result).toEqual([]);
    });

    it("should handle empty strategy", () => {
      const emptyPortfolio = { strategy: {} };
      const result = getAvailableAssetChains(emptyPortfolio);
      expect(result).toEqual([]);
    });

    it("should handle empty categories", () => {
      const portfolioWithEmptyCategories = {
        strategy: {
          category1: {},
          category2: {},
        },
      };
      const result = getAvailableAssetChains(portfolioWithEmptyCategories);
      expect(result).toEqual([]);
    });

    it("should handle single category with single chain", () => {
      const singleChainPortfolio = {
        strategy: {
          staking: {
            ethereum: [{ weight: 1.0 }],
          },
        },
      };
      const result = getAvailableAssetChains(singleChainPortfolio);
      expect(result).toEqual(["ethereum"]);
    });

    it("should handle mixed empty and populated categories", () => {
      const mixedPortfolio = {
        strategy: {
          emptyCategory: {},
          populatedCategory: {
            arbitrum: [{ weight: 0.5 }],
            base: [{ weight: 0.5 }],
          },
          anotherEmptyCategory: {},
        },
      };
      const result = getAvailableAssetChains(mixedPortfolio);
      expect(result).toEqual(expect.arrayContaining(["arbitrum", "base"]));
      expect(result).toHaveLength(2);
    });

    it("should preserve chain name formatting", () => {
      const portfolioWithFormattedNames = {
        strategy: {
          category1: {
            "arbitrum-one": [{ weight: 0.5 }],
            ethereum_mainnet: [{ weight: 0.3 }],
            "base chain": [{ weight: 0.2 }],
          },
        },
      };
      const result = getAvailableAssetChains(portfolioWithFormattedNames);
      expect(result).toEqual(
        expect.arrayContaining([
          "arbitrum-one",
          "ethereum_mainnet",
          "base chain",
        ]),
      );
    });

    it("should handle categories being null by throwing an error", () => {
      const portfolioWithNullCategory = {
        strategy: {
          category1: null,
          category2: {
            arbitrum: [{ weight: 0.5 }],
          },
        },
      };
      expect(() => getAvailableAssetChains(portfolioWithNullCategory)).toThrow(
        TypeError,
      );
    });

    it("should handle categories being undefined by throwing an error", () => {
      const portfolioWithUndefinedCategory = {
        strategy: {
          category1: undefined,
          category2: {
            arbitrum: [{ weight: 0.5 }],
          },
        },
      };
      expect(() =>
        getAvailableAssetChains(portfolioWithUndefinedCategory),
      ).toThrow(TypeError);
    });

    it("should handle categories being non-object types by returning unexpected chain names", () => {
      const portfolioWithNonObjectCategory = {
        strategy: {
          category1: "invalid",
          category2: {
            arbitrum: [{ weight: 0.5 }],
          },
        },
      };
      const result = getAvailableAssetChains(portfolioWithNonObjectCategory);
      expect(result).toEqual(
        expect.arrayContaining(["0", "1", "2", "3", "4", "5", "6", "arbitrum"]),
      );
      expect(result).toHaveLength(8);
    });
  });
});
