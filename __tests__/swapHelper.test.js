import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import swap from "../utils/swapHelper";
import { fetchSwapData } from "../utils/oneInch";
import { approve } from "../utils/general";
import { prepareTransaction } from "thirdweb";
import logger from "../utils/logger";

// Mock dependencies
vi.mock("../utils/oneInch");
vi.mock("../utils/general");
vi.mock("../utils/logger");
vi.mock("thirdweb");
vi.mock("../utils/thirdweb", () => ({
  default: "mock-client",
}));

describe("Swap Helper", () => {
  const mockParams = {
    walletAddress: "0x123...abc",
    chainId: 42161,
    protocolUniqueId: "test-protocol",
    fromTokenAddress: "0xfrom",
    toTokenAddress: "0xto",
    amount: ethers.BigNumber.from("1000000000000000000"), // 1 ETH
    slippage: 1,
    fromToken: "weth",
    fromTokenDecimals: 18,
    toTokenSymbol: "usdc",
    toTokenDecimals: 6,
    tokenPricesMappingTable: {
      eth: 3000,
      weth: 3000,
      usdc: 1,
    },
  };

  const mockUpdateProgressAndWait = vi.fn();
  const mockUpdateProgress = vi.fn();
  const mockHandleStatusUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock approve function
    approve.mockReturnValue({
      to: "0xtoken",
      data: "0xapprove",
      value: "0x0",
    });

    // Mock prepareTransaction
    prepareTransaction.mockReturnValue({
      to: "0xswapcontract",
      data: "0xswapdata",
      value: "0x0",
    });
  });

  describe("Basic Swap Functionality", () => {
    it("should return undefined when from and to tokens are the same", async () => {
      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        "0xsametoken",
        "0xsametoken", // Same as from
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toBeUndefined();
      expect(fetchSwapData).not.toHaveBeenCalled();
    });

    it("should successfully execute swap with single provider", async () => {
      const mockSwapData = {
        toAmount: "3000000000", // 3000 USDC
        minToAmount: "2970000000", // 2970 USDC after slippage
        approve_to: "0xspender",
        to: "0xswapcontract",
        data: "0xswapdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2980",
      };

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          if (provider === "1inch") {
            return Promise.resolve(mockSwapData);
          }
          return Promise.resolve({});
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(2); // approve + swap transactions
      expect(result[1]).toBe("2970000000"); // minToAmount
      expect(typeof result[2]).toBe("number"); // trading loss

      // Verify approve was called
      expect(approve).toHaveBeenCalledWith(
        mockParams.fromTokenAddress,
        "0xspender",
        mockParams.amount,
        expect.any(Function),
        mockParams.chainId,
      );

      // Verify progress update was called
      expect(mockUpdateProgressAndWait).toHaveBeenCalledWith(
        mockUpdateProgress,
        "test-protocol-weth-usdc-swap",
        expect.any(Number),
      );
    });

    it("should handle multiple providers and select the best one", async () => {
      const mockSwapData1inch = {
        toAmount: "3000000000",
        minToAmount: "2970000000",
        approve_to: "0xspender1",
        to: "0xswap1",
        data: "0xdata1",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2980",
      };

      const mockSwapDataParaswap = {
        toAmount: "3100000000", // Better rate
        minToAmount: "3069000000",
        approve_to: "0xspender2",
        to: "0xswap2",
        data: "0xdata2",
        gas: "140000",
        gasCostUSD: 4,
        toUsd: "3090",
      };

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          switch (provider) {
            case "1inch":
              return Promise.resolve(mockSwapData1inch);
            case "paraswap":
              return Promise.resolve(mockSwapDataParaswap);
            case "0x":
              return Promise.resolve({}); // Empty response
            default:
              return Promise.resolve({});
          }
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      // Should select paraswap as it has better toUsd value
      expect(result[1]).toBe("3069000000"); // paraswap minToAmount
      expect(approve).toHaveBeenCalledWith(
        mockParams.fromTokenAddress,
        "0xspender2", // paraswap spender
        mockParams.amount,
        expect.any(Function),
        mockParams.chainId,
      );
    });
  });

  describe("Provider Selection Logic", () => {
    it("should sort by toUsd when all providers have valid toUsd values", async () => {
      const providers = [
        { provider: "1inch", toUsd: "2980", minToAmount: "2970000000" },
        { provider: "paraswap", toUsd: "3090", minToAmount: "3000000000" },
        { provider: "0x", toUsd: "2950", minToAmount: "2940000000" },
      ];

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          const providerData = providers.find((p) => p.provider === provider);
          if (!providerData) return Promise.resolve({});

          return Promise.resolve({
            toAmount: "3000000000",
            minToAmount: providerData.minToAmount,
            approve_to: "0xspender",
            to: "0xswap",
            data: "0xdata",
            gas: "150000",
            gasCostUSD: 5,
            toUsd: providerData.toUsd,
          });
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      // Should select paraswap (highest toUsd: 3090)
      expect(result[1]).toBe("3000000000");
    });

    it("should fall back to minToAmount when toUsd values are invalid", async () => {
      const providers = [
        { provider: "1inch", toUsd: "0", minToAmount: "2970000000" },
        { provider: "paraswap", toUsd: null, minToAmount: "3100000000" }, // Highest minToAmount
        { provider: "0x", toUsd: undefined, minToAmount: "2950000000" },
      ];

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          const providerData = providers.find((p) => p.provider === provider);
          if (!providerData) return Promise.resolve({});

          return Promise.resolve({
            toAmount: "3000000000",
            minToAmount: providerData.minToAmount,
            approve_to: "0xspender",
            to: "0xswap",
            data: "0xdata",
            gas: "150000",
            gasCostUSD: 5,
            toUsd: providerData.toUsd,
          });
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      // Should select paraswap (highest minToAmount: 3100000000)
      expect(result[1]).toBe("3100000000");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when no providers return valid swap data", async () => {
      fetchSwapData.mockImplementation(() => Promise.resolve({}));

      await expect(
        swap(
          mockParams.walletAddress,
          mockParams.chainId,
          mockParams.protocolUniqueId,
          mockUpdateProgressAndWait,
          mockParams.fromTokenAddress,
          mockParams.toTokenAddress,
          mockParams.amount,
          mockParams.slippage,
          mockUpdateProgress,
          mockParams.fromToken,
          mockParams.fromTokenDecimals,
          mockParams.toTokenSymbol,
          mockParams.toTokenDecimals,
          mockParams.tokenPricesMappingTable,
          mockHandleStatusUpdate,
        ),
      ).rejects.toThrow("No valid swap data found from any provider");
    });

    it("should handle provider errors gracefully", async () => {
      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          if (provider === "1inch") {
            throw new Error("1inch API error");
          }
          if (provider === "paraswap") {
            return Promise.resolve({
              toAmount: "3000000000",
              minToAmount: "2970000000",
              approve_to: "0xspender",
              to: "0xswap",
              data: "0xdata",
              gas: "150000",
              gasCostUSD: 5,
              toUsd: "2980",
            });
          }
          return Promise.resolve({});
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to fetch swap data from 1inch:",
        expect.any(Error),
      );
    });

    it("should handle provider error responses", async () => {
      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          if (provider === "1inch") {
            return Promise.resolve({ error: "Insufficient liquidity" });
          }
          if (provider === "paraswap") {
            return Promise.resolve({
              toAmount: "3000000000",
              minToAmount: "2970000000",
              approve_to: "0xspender",
              to: "0xswap",
              data: "0xdata",
              gas: "150000",
              gasCostUSD: 5,
              toUsd: "2980",
            });
          }
          return Promise.resolve({});
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        "1inch swap failed:",
        "Insufficient liquidity",
      );
    });

    it("should throw error for missing eth price", async () => {
      const invalidPriceTable = {
        // eth: 3000, // Missing eth price
        weth: 3000,
        usdc: 1,
      };

      await expect(
        swap(
          mockParams.walletAddress,
          mockParams.chainId,
          mockParams.protocolUniqueId,
          mockUpdateProgressAndWait,
          mockParams.fromTokenAddress,
          mockParams.toTokenAddress,
          mockParams.amount,
          mockParams.slippage,
          mockUpdateProgress,
          mockParams.fromToken,
          mockParams.fromTokenDecimals,
          mockParams.toTokenSymbol,
          mockParams.toTokenDecimals,
          invalidPriceTable,
          mockHandleStatusUpdate,
        ),
      ).rejects.toThrow("eth_price is undefined");
    });

    it("should throw error for missing to token price", async () => {
      const invalidPriceTable = {
        eth: 3000,
        weth: 3000,
        // usdc: 1 // Missing to token price
      };

      await expect(
        swap(
          mockParams.walletAddress,
          mockParams.chainId,
          mockParams.protocolUniqueId,
          mockUpdateProgressAndWait,
          mockParams.fromTokenAddress,
          mockParams.toTokenAddress,
          mockParams.amount,
          mockParams.slippage,
          mockUpdateProgress,
          mockParams.fromToken,
          mockParams.fromTokenDecimals,
          mockParams.toTokenSymbol,
          mockParams.toTokenDecimals,
          invalidPriceTable,
          mockHandleStatusUpdate,
        ),
      ).rejects.toThrow("to_token_price is undefined for usdc");
    });
  });

  describe("Price Impact and Slippage Validation", () => {
    beforeEach(() => {
      // Enable price impact checking by setting TEST to false
      vi.stubEnv("TEST", "false");
    });

    afterEach(() => {
      vi.stubEnv("TEST", "true");
    });

    it("should pass when price impact is within acceptable range", async () => {
      // Setup a swap with minimal price impact
      const mockSwapData = {
        toAmount: "2990000000", // ~2990 USDC for 1 WETH (~$3000)
        minToAmount: "2960000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2980",
      };

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          if (provider === "1inch") {
            return Promise.resolve(mockSwapData);
          }
          return Promise.resolve({});
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toBeDefined();
    });

    it("should throw error when price impact exceeds threshold", async () => {
      // Setup a swap with high price impact (>50%)
      const mockSwapData = {
        toAmount: "1000000000", // Only 1000 USDC for 1 WETH (~$3000) - 66% price impact
        minToAmount: "990000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "1000",
      };

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          if (provider === "1inch") {
            return Promise.resolve(mockSwapData);
          }
          return Promise.resolve({});
        },
      );

      await expect(
        swap(
          mockParams.walletAddress,
          mockParams.chainId,
          mockParams.protocolUniqueId,
          mockUpdateProgressAndWait,
          mockParams.fromTokenAddress,
          mockParams.toTokenAddress,
          mockParams.amount,
          mockParams.slippage,
          mockUpdateProgress,
          mockParams.fromToken,
          mockParams.fromTokenDecimals,
          mockParams.toTokenSymbol,
          mockParams.toTokenDecimals,
          mockParams.tokenPricesMappingTable,
          mockHandleStatusUpdate,
        ),
      ).rejects.toThrow("Price impact is too high");
    });

    it("should allow favorable swaps (price ratio > 1)", async () => {
      // Setup a swap with favorable rate (more output value than input)
      const mockSwapData = {
        toAmount: "3200000000", // 3200 USDC for 1 WETH (~$3000) - favorable rate
        minToAmount: "3168000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "3200",
      };

      fetchSwapData.mockImplementation(
        (chainId, from, to, amount, wallet, slippage, provider) => {
          if (provider === "1inch") {
            return Promise.resolve(mockSwapData);
          }
          return Promise.resolve({});
        },
      );

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toBeDefined();
    });
  });

  describe("Trading Loss Calculation", () => {
    it("should calculate trading loss correctly", async () => {
      const mockSwapData = {
        toAmount: "2900000000", // 2900 USDC output
        minToAmount: "2871000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2900",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      // Input: 1 WETH = $3000
      // Output: 2900 USDC = $2900
      // Trading loss: $2900 - $3000 = -$100
      expect(result[2]).toBe(-100);
    });

    it("should calculate trading gain correctly", async () => {
      const mockSwapData = {
        toAmount: "3100000000", // 3100 USDC output
        minToAmount: "3069000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "3100",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      // Input: 1 WETH = $3000
      // Output: 3100 USDC = $3100
      // Trading gain: $3100 - $3000 = $100
      expect(result[2]).toBe(100);
    });
  });

  describe("Status Updates and Callbacks", () => {
    it("should call progress update callback with correct parameters", async () => {
      const mockSwapData = {
        toAmount: "2900000000",
        minToAmount: "2871000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2900",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(mockUpdateProgressAndWait).toHaveBeenCalledWith(
        mockUpdateProgress,
        "test-protocol-weth-usdc-swap",
        -100, // Trading loss
      );
    });

    it("should call status update handler when provided", async () => {
      const mockSwapData = {
        toAmount: "2900000000",
        minToAmount: "2871000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2900",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(mockHandleStatusUpdate).toHaveBeenCalledWith({
        dexAggregator: "1inch",
        fromToken: "weth",
        toToken: "usdc",
        amount: "1.0", // normalized input amount
        outputAmount: "2900.0", // normalized output amount
        tradingLoss: -100,
        inputValue: 3000,
      });
    });

    it("should not call status update handler when null", async () => {
      const mockSwapData = {
        toAmount: "2900000000",
        minToAmount: "2871000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2900",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        null, // null handler
      );

      expect(mockHandleStatusUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Transaction Preparation", () => {
    it("should prepare approve and swap transactions correctly", async () => {
      const mockSwapData = {
        toAmount: "2900000000",
        minToAmount: "2871000000",
        approve_to: "0xspender",
        to: "0xswapcontract",
        data: "0xswapdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "2900",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        mockParams.amount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      // Check transactions array
      expect(result[0]).toHaveLength(2);

      // Verify approve transaction preparation
      expect(approve).toHaveBeenCalledWith(
        mockParams.fromTokenAddress,
        "0xspender",
        mockParams.amount,
        expect.any(Function),
        mockParams.chainId,
      );

      // Verify swap transaction preparation
      expect(prepareTransaction).toHaveBeenCalledWith({
        to: "0xswapcontract",
        chain: expect.any(Object),
        client: "mock-client",
        data: "0xswapdata",
        extraGas: BigInt("150000"),
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small amounts", async () => {
      const smallAmount = ethers.BigNumber.from("1000"); // Very small amount

      const mockSwapData = {
        toAmount: "1",
        minToAmount: "1",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "0.000001",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        smallAmount,
        mockParams.slippage,
        mockUpdateProgress,
        mockParams.fromToken,
        mockParams.fromTokenDecimals,
        mockParams.toTokenSymbol,
        mockParams.toTokenDecimals,
        mockParams.tokenPricesMappingTable,
        mockHandleStatusUpdate,
      );

      expect(result).toBeDefined();
      expect(result[1]).toBe("1");
    });

    it("should handle different decimal combinations", async () => {
      // Test with tokens having different decimal places
      const mockSwapData = {
        toAmount: "1000000", // 6 decimals (USDC)
        minToAmount: "990000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xdata",
        gas: "150000",
        gasCostUSD: 5,
        toUsd: "1",
      };

      fetchSwapData.mockImplementation(() => Promise.resolve(mockSwapData));

      const result = await swap(
        mockParams.walletAddress,
        mockParams.chainId,
        mockParams.protocolUniqueId,
        mockUpdateProgressAndWait,
        mockParams.fromTokenAddress,
        mockParams.toTokenAddress,
        ethers.BigNumber.from("1000000000000000000"), // 18 decimals (WETH)
        mockParams.slippage,
        mockUpdateProgress,
        "wbtc", // 8 decimals typically
        8, // BTC decimals
        "usdc", // 6 decimals
        6, // USDC decimals
        {
          eth: 3000,
          wbtc: 45000,
          usdc: 1,
        },
        mockHandleStatusUpdate,
      );

      expect(result).toBeDefined();
    });
  });
});
