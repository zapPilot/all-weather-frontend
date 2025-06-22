import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSwapData } from "../utils/oneInch";
import logger from "../utils/logger";

// Mock dependencies
vi.mock("../utils/logger");

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OneInch Utils", () => {
  let originalApiUrl;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original environment variable
    originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    // Set default environment variable
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Restore original environment variable
    if (originalApiUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  describe("fetchSwapData", () => {
    const defaultParams = {
      chainId: 42161,
      fromTokenAddress: "0xfrom",
      toTokenAddress: "0xto",
      amount: "1000000000000000000",
      fromAddress: "0xwallet",
      slippage: 1,
      provider: "1inch",
      fromTokenDecimals: 18,
      toTokenDecimals: 6,
      eth_price: 3000,
      to_token_price: 1,
      to_token_decimals: 6,
    };

    it("should successfully fetch swap data", async () => {
      const mockResponse = {
        toAmount: "3000000000",
        minToAmount: "2970000000",
        approve_to: "0xspender",
        to: "0xswap",
        data: "0xswapdata",
        gas: "150000",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("the_best_swap_data"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`chainId=${defaultParams.chainId}`),
      );
    });

    it("should throw error when from wallet address equals to token address", async () => {
      await expect(
        fetchSwapData(
          defaultParams.chainId,
          defaultParams.fromTokenAddress,
          "0xto", // toTokenAddress
          defaultParams.amount,
          "0xto", // fromAddress same as toTokenAddress
          defaultParams.slippage,
          defaultParams.provider,
          defaultParams.fromTokenDecimals,
          defaultParams.toTokenDecimals,
          defaultParams.eth_price,
          defaultParams.to_token_price,
          defaultParams.to_token_decimals,
        ),
      ).rejects.toThrow("fromTokenAddress and toTokenAddress are the same");

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle HTTP error responses gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(result).toEqual({});
      expect(logger.error).not.toHaveBeenCalled(); // Should not log errors for HTTP errors
    });

    it("should handle network errors and log them", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(result).toEqual({});
      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching swap data:",
        networkError,
      );
    });

    it("should handle JSON parsing errors", async () => {
      const jsonError = new Error("Invalid JSON");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => {
          throw jsonError;
        },
      });

      const result = await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(result).toEqual({});
      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching swap data:",
        jsonError,
      );
    });

    it("should construct URL with all parameters correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/the_best_swap_data?chainId=42161&fromTokenAddress=0xfrom&toTokenAddress=0xto&amount=1000000000000000000&fromAddress=0xwallet&slippage=1&provider=1inch&fromTokenDecimals=18&toTokenDecimals=6&eth_price=3000&to_token_price=1",
        ),
      );
    });

    it("should handle BigNumber amount parameter", async () => {
      const bigNumberAmount = {
        toString: () => "2000000000000000000",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        bigNumberAmount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("amount=2000000000000000000"),
      );
    });

    it("should handle zero amount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        "0",
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("amount=0"),
      );
    });

    it("should handle very large amounts", async () => {
      const largeAmount = "999999999999999999999999999999";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        largeAmount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`amount=${largeAmount}`),
      );
    });

    it("should handle different slippage values", async () => {
      const testCases = [0.1, 0.5, 1, 5, 10, 50];

      for (const slippage of testCases) {
        vi.clearAllMocks();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await fetchSwapData(
          defaultParams.chainId,
          defaultParams.fromTokenAddress,
          defaultParams.toTokenAddress,
          defaultParams.amount,
          defaultParams.fromAddress,
          slippage,
          defaultParams.provider,
          defaultParams.fromTokenDecimals,
          defaultParams.toTokenDecimals,
          defaultParams.eth_price,
          defaultParams.to_token_price,
          defaultParams.to_token_decimals,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`slippage=${slippage}`),
        );
      }
    });

    it("should handle different providers", async () => {
      const providers = ["1inch", "paraswap", "0x"];

      for (const provider of providers) {
        vi.clearAllMocks();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await fetchSwapData(
          defaultParams.chainId,
          defaultParams.fromTokenAddress,
          defaultParams.toTokenAddress,
          defaultParams.amount,
          defaultParams.fromAddress,
          defaultParams.slippage,
          provider,
          defaultParams.fromTokenDecimals,
          defaultParams.toTokenDecimals,
          defaultParams.eth_price,
          defaultParams.to_token_price,
          defaultParams.to_token_decimals,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`provider=${provider}`),
        );
      }
    });

    it("should handle different chain IDs", async () => {
      const chainIds = [1, 42161, 10, 137, 56, 8453];

      for (const chainId of chainIds) {
        vi.clearAllMocks();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await fetchSwapData(
          chainId,
          defaultParams.fromTokenAddress,
          defaultParams.toTokenAddress,
          defaultParams.amount,
          defaultParams.fromAddress,
          defaultParams.slippage,
          defaultParams.provider,
          defaultParams.fromTokenDecimals,
          defaultParams.toTokenDecimals,
          defaultParams.eth_price,
          defaultParams.to_token_price,
          defaultParams.to_token_decimals,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`chainId=${chainId}`),
        );
      }
    });

    it("should include all required parameters in URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("chainId=42161");
      expect(callUrl).toContain("fromTokenAddress=0xfrom");
      expect(callUrl).toContain("toTokenAddress=0xto");
      expect(callUrl).toContain("amount=1000000000000000000");
      expect(callUrl).toContain("fromAddress=0xwallet");
      expect(callUrl).toContain("slippage=1");
      expect(callUrl).toContain("provider=1inch");
      expect(callUrl).toContain("fromTokenDecimals=18");
      expect(callUrl).toContain("toTokenDecimals=6");
      expect(callUrl).toContain("eth_price=3000");
      expect(callUrl).toContain("to_token_price=1");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      mockFetch.mockRejectedValueOnce(timeoutError);

      const result = await fetchSwapData(
        defaultParams.chainId,
        defaultParams.fromTokenAddress,
        defaultParams.toTokenAddress,
        defaultParams.amount,
        defaultParams.fromAddress,
        defaultParams.slippage,
        defaultParams.provider,
        defaultParams.fromTokenDecimals,
        defaultParams.toTokenDecimals,
        defaultParams.eth_price,
        defaultParams.to_token_price,
        defaultParams.to_token_decimals,
      );

      expect(result).toEqual({});
      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching swap data:",
        timeoutError,
      );
    });

    it("should handle case-insensitive address comparison", async () => {
      const upperCaseToAddress = "0XABC123";
      const lowerCaseFromAddress = "0xabc123"; // Same address, different case

      await expect(
        fetchSwapData(
          defaultParams.chainId,
          defaultParams.fromTokenAddress,
          upperCaseToAddress,
          defaultParams.amount,
          lowerCaseFromAddress, // fromAddress same as toTokenAddress (case insensitive)
          defaultParams.slippage,
          defaultParams.provider,
          defaultParams.fromTokenDecimals,
          defaultParams.toTokenDecimals,
          defaultParams.eth_price,
          defaultParams.to_token_price,
          defaultParams.to_token_decimals,
        ),
      ).rejects.toThrow("fromTokenAddress and toTokenAddress are the same");
    });

    it("should handle different decimal combinations", async () => {
      const decimalCombinations = [
        { from: 6, to: 18 }, // USDC to WETH
        { from: 18, to: 6 }, // WETH to USDC
        { from: 8, to: 18 }, // WBTC to WETH
        { from: 18, to: 8 }, // WETH to WBTC
      ];

      for (const { from, to } of decimalCombinations) {
        vi.clearAllMocks();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await fetchSwapData(
          defaultParams.chainId,
          defaultParams.fromTokenAddress,
          defaultParams.toTokenAddress,
          defaultParams.amount,
          defaultParams.fromAddress,
          defaultParams.slippage,
          defaultParams.provider,
          from,
          to,
          defaultParams.eth_price,
          defaultParams.to_token_price,
          to,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`fromTokenDecimals=${from}`),
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`toTokenDecimals=${to}`),
        );
      }
    });
  });
});
