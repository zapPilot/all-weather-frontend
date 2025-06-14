import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import {
  fetchDustConversionRoutes,
  handleDustConversion,
  getTokens,
} from "../utils/dustConversion";
import swap from "../utils/swapHelper";
import logger from "../utils/logger";

// Mock dependencies
vi.mock("../utils/swapHelper");
vi.mock("../utils/logger");

// Mock global fetch
global.fetch = vi.fn();

describe("Dust Conversion Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getTokens", () => {
    const mockChainName = "arbitrum";
    const mockAccountAddress = "0x123...abc";
    const mockApiUrl = "https://api.example.com";

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", mockApiUrl);
    });

    it("should fetch and filter tokens correctly", async () => {
      const mockTokens = [
        {
          optimized_symbol: "WBTC",
          price: 45000,
          amount: 0.001,
          protocol_id: "uniswap-v3",
          id: "0xtoken1",
        },
        {
          optimized_symbol: "ARB",
          price: 1.5,
          amount: 10,
          protocol_id: "velodrome",
          id: "0xtoken2",
        },
        {
          optimized_symbol: "USDC",
          price: 1,
          amount: 100,
          protocol_id: "curve",
          id: "0xtoken3",
        },
        {
          optimized_symbol: "ETH",
          price: 3000,
          amount: 0.1,
          protocol_id: "compound",
          id: "0xtoken4",
        },
        {
          optimized_symbol: "DUST-TOKEN",
          price: 0.1,
          amount: 0.01,
          protocol_id: "pancakeswap",
          id: "0xtoken5",
        },
        {
          optimized_symbol: "AAVE-TOKEN",
          price: 100,
          amount: 0.1,
          protocol_id: "aave-v3",
          id: "0xtoken6",
        },
        {
          optimized_symbol: "SMALL-TOKEN",
          price: 0.001,
          amount: 1,
          protocol_id: "sushiswap",
          id: "0xtoken7",
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      const result = await getTokens(mockChainName, mockAccountAddress);

      // Verify API call
      expect(fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/user/${mockAccountAddress}/${mockChainName}/tokens`,
      );

      // Should filter out:
      // - USDC, ETH (excluded symbols)
      // - DUST-TOKEN (contains "-")
      // - AAVE-TOKEN (aave protocol)
      // - SMALL-TOKEN (amount * price < 0.005)
      // Should include: WBTC, ARB
      expect(result).toHaveLength(2);
      expect(result[0].optimized_symbol).toBe("WBTC"); // Higher value, should be first
      expect(result[1].optimized_symbol).toBe("ARB");
    });

    it("should handle empty response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await getTokens(mockChainName, mockAccountAddress);
      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        getTokens(mockChainName, mockAccountAddress),
      ).rejects.toThrow("Failed to fetch tokens");
    });

    it("should sort tokens by USD value descending", async () => {
      const mockTokens = [
        {
          optimized_symbol: "TOKEN_A",
          price: 1,
          amount: 10, // $10 value
          protocol_id: "uniswap",
          id: "0xtokenA",
        },
        {
          optimized_symbol: "TOKEN_B",
          price: 100,
          amount: 1, // $100 value
          protocol_id: "sushiswap",
          id: "0xtokenB",
        },
        {
          optimized_symbol: "TOKEN_C",
          price: 10,
          amount: 5, // $50 value
          protocol_id: "curve",
          id: "0xtokenC",
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      const result = await getTokens(mockChainName, mockAccountAddress);

      expect(result).toHaveLength(3);
      expect(result[0].optimized_symbol).toBe("TOKEN_B"); // $100
      expect(result[1].optimized_symbol).toBe("TOKEN_C"); // $50
      expect(result[2].optimized_symbol).toBe("TOKEN_A"); // $10
    });

    it("should filter out tokens with zero or negative prices", async () => {
      const mockTokens = [
        {
          optimized_symbol: "VALID_TOKEN",
          price: 1,
          amount: 10,
          protocol_id: "uniswap",
          id: "0xvalid",
        },
        {
          optimized_symbol: "ZERO_PRICE",
          price: 0,
          amount: 100,
          protocol_id: "sushiswap",
          id: "0xzero",
        },
        {
          optimized_symbol: "NEGATIVE_PRICE",
          price: -1,
          amount: 50,
          protocol_id: "curve",
          id: "0xnegative",
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      const result = await getTokens(mockChainName, mockAccountAddress);

      expect(result).toHaveLength(1);
      expect(result[0].optimized_symbol).toBe("VALID_TOKEN");
    });
  });

  describe("fetchDustConversionRoutes", () => {
    const mockTokens = [
      {
        optimized_symbol: "WBTC",
        symbol: "WBTC",
        price: 45000,
        amount: 0.001,
        decimals: 8,
        id: "0xwbtc",
        raw_amount_hex_str: "0x186a0",
      },
      {
        optimized_symbol: "ARB",
        symbol: "ARB",
        price: 1.5,
        amount: 10,
        decimals: 18,
        id: "0xarb",
        raw_amount_hex_str: "0x8ac7230489e80000",
      },
      {
        optimized_symbol: "LINK",
        symbol: "LINK",
        price: 15,
        amount: 1,
        decimals: 18,
        id: "0xlink",
        raw_amount_hex_str: "0xde0b6b3a7640000",
      },
    ];

    const mockParams = {
      tokens: mockTokens,
      chainId: 42161,
      accountAddress: "0x123...abc",
      tokenPricesMappingTable: { eth: 3000 },
      slippage: 1,
      handleStatusUpdate: vi.fn(),
    };

    beforeEach(() => {
      swap.mockImplementation(() =>
        Promise.resolve([
          [{ data: "0x123", to: "0xto" }], // txns
          "1000000000000000000", // amount out
          0.01, // trading loss
        ]),
      );
    });

    // it('should process tokens in batches with proper delays', async () => {
    //   const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    //   const result = await fetchDustConversionRoutes(mockParams);

    //   // Should return transactions and trading loss
    //   expect(result).toHaveLength(2);
    //   expect(result[0]).toBeInstanceOf(Array); // txns
    //   expect(typeof result[1]).toBe('number'); // total trading loss

    //   // Verify swap was called for each token
    //   expect(swap).toHaveBeenCalledTimes(3);

    //   // Verify batch processing delay
    //   expect(setTimeoutSpy).toHaveBeenCalled();

    //   setTimeoutSpy.mockRestore();
    // });

    it("should call swap with correct parameters for each token", async () => {
      await fetchDustConversionRoutes(mockParams);

      // Check first token (WBTC)
      expect(swap).toHaveBeenCalledWith(
        mockParams.accountAddress,
        mockParams.chainId,
        "placeHolder",
        expect.any(Function),
        "0xwbtc",
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        expect.any(Object), // BigNumber
        mockParams.slippage,
        null,
        "wbtc",
        8,
        "eth",
        18,
        expect.objectContaining({
          eth: 3000,
          wbtc: 45000,
        }),
        mockParams.handleStatusUpdate,
      );
    });

    it("should handle swap failures gracefully", async () => {
      swap.mockImplementation(
        (account, chainId, protocol, updateFn, fromToken) => {
          if (fromToken === "0xarb") {
            throw new Error("Swap failed for ARB");
          }
          return Promise.resolve([
            [{ data: "0x123", to: "0xto" }],
            "1000000000000000000",
            0.01,
          ]);
        },
      );

      const result = await fetchDustConversionRoutes(mockParams);

      // Should still return results for successful swaps
      expect(result[0].length).toBeGreaterThan(0);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch route for ARB:",
        expect.any(Error),
      );
    });

    it("should accumulate trading losses correctly", async () => {
      swap.mockImplementation(() =>
        Promise.resolve([
          [{ data: "0x123", to: "0xto" }],
          "1000000000000000000",
          0.05, // 0.05 trading loss per token
        ]),
      );

      const result = await fetchDustConversionRoutes(mockParams);

      // Total trading loss should be 0.05 * 3 = 0.15 (with floating point tolerance)
      expect(result[1]).toBeCloseTo(0.15, 10);
    });

    // it('should process batches with correct size', async () => {
    //   const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    //   const largeTokenArray = Array(10).fill(mockTokens[0]).map((token, index) => ({
    //     ...token,
    //     id: `0xtoken${index}`,
    //     optimized_symbol: `TOKEN${index}`,
    //     symbol: `TOKEN${index}`
    //   }));

    //   await fetchDustConversionRoutes({
    //     ...mockParams,
    //     tokens: largeTokenArray
    //   });

    //   // Should be called 10 times (one for each token)
    //   expect(swap).toHaveBeenCalledTimes(10);

    //   // Should have proper delays between batches
    //   // With batch size 3: batches at indices 0, 3, 6, 9
    //   // So 3 delays should be scheduled
    //   expect(setTimeoutSpy).toHaveBeenCalled();

    //   setTimeoutSpy.mockRestore();
    // });

    // it('should update token price mapping for each token', async () => {
    //   await fetchDustConversionRoutes(mockParams);

    //   // Verify that each swap call includes the token's price in the mapping
    //   const swapCalls = swap.mock.calls;

    //   // Check WBTC call includes wbtc price
    //   const wbtcCall = swapCalls.find(call => call[9] === 'wbtc');
    //   expect(wbtcCall[12]).toHaveProperty('wbtc', 45000);

    //   // Check ARB call includes arb price
    //   const arbCall = swapCalls.find(call => call[9] === 'arb');
    //   expect(arbCall[12]).toHaveProperty('arb', 1.5);
    // });
  });

  describe("handleDustConversion", () => {
    const mockParams = {
      chainId: 42161,
      chainName: "arbitrum",
      accountAddress: "0x123...abc",
      tokenPricesMappingTable: { eth: 3000 },
      slippage: 1,
      handleStatusUpdate: vi.fn(),
    };

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");

      // Mock successful token fetch
      fetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            optimized_symbol: "WBTC",
            price: 45000,
            amount: 0.001,
            decimals: 8,
            id: "0xwbtc",
            raw_amount_hex_str: "0x186a0",
            protocol_id: "uniswap",
          },
        ],
      });

      // Mock successful swap
      swap.mockResolvedValue([
        [{ data: "0x123", to: "0xto" }],
        "1000000000000000000",
        0.01,
      ]);
    });

    it("should successfully handle dust conversion", async () => {
      const result = await handleDustConversion(mockParams);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.example.com/user/${mockParams.accountAddress}/${mockParams.chainName}/tokens`,
      );
    });

    it("should handle token fetch errors gracefully", async () => {
      fetch.mockRejectedValue(new Error("Network error"));

      const result = await handleDustConversion(mockParams);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Dust conversion failed:",
        expect.any(Error),
      );
    });

    it("should handle empty token list", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await handleDustConversion(mockParams);

      expect(result).toEqual([]);
    });

    // it('should handle swap route fetch errors', async () => {
    //   swap.mockRejectedValue(new Error('Swap route error'));

    //   const result = await handleDustConversion(mockParams);

    //   expect(result).toEqual([]);
    //   expect(logger.error).toHaveBeenCalledWith(
    //     'Dust conversion failed:',
    //     expect.any(Error)
    //   );
    // });
  });

  describe("Integration Tests", () => {
    it("should handle end-to-end dust conversion workflow", async () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");

      // Mock API response with realistic token data
      const mockTokensResponse = [
        {
          optimized_symbol: "ARB",
          symbol: "ARB",
          price: 1.2,
          amount: 5,
          decimals: 18,
          id: "0xarb",
          raw_amount_hex_str: "0x4563918244f40000",
          protocol_id: "uniswap-v3",
        },
        {
          optimized_symbol: "USDC", // Should be filtered out
          symbol: "USDC",
          price: 1,
          amount: 100,
          decimals: 6,
          id: "0xusdc",
          raw_amount_hex_str: "0x5f5e100",
          protocol_id: "curve",
        },
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokensResponse,
      });

      swap.mockResolvedValue([
        [{ data: "0xswapdata", to: "0xswapcontract" }],
        "2000000000000000000", // 2 ETH out
        0.02, // 2% trading loss
      ]);

      const result = await handleDustConversion({
        chainId: 42161,
        chainName: "arbitrum",
        accountAddress: "0x123...abc",
        tokenPricesMappingTable: { eth: 3000 },
        slippage: 1,
        handleStatusUpdate: vi.fn(),
      });

      // Should process only ARB (USDC filtered out)
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("data", "0xswapdata");
      expect(result[0]).toHaveProperty("to", "0xswapcontract");

      // Verify swap was called with ARB parameters
      expect(swap).toHaveBeenCalledWith(
        "0x123...abc",
        42161,
        "placeHolder",
        expect.any(Function),
        "0xarb",
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        expect.any(Object),
        1,
        null,
        "arb",
        18,
        "eth",
        18,
        expect.objectContaining({
          eth: 3000,
          arb: 1.2,
        }),
        expect.any(Function),
      );
    });

    // it('should handle rate limiting with proper batch delays', async () => {
    //   vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');

    //   // Create 7 tokens to test multiple batches (batch size is 3)
    //   const mockTokens = Array(7).fill().map((_, index) => ({
    //     optimized_symbol: `TOKEN${index}`,
    //     symbol: `TOKEN${index}`,
    //     price: 1,
    //     amount: 10,
    //     decimals: 18,
    //     id: `0xtoken${index}`,
    //     raw_amount_hex_str: '0x8ac7230489e80000',
    //     protocol_id: 'uniswap'
    //   }));

    //   fetch.mockResolvedValue({
    //     ok: true,
    //     json: async () => mockTokens
    //   });

    //   swap.mockResolvedValue([
    //     [{ data: '0x123', to: '0xto' }],
    //     '1000000000000000000',
    //     0.01
    //   ]);

    //   const promise = handleDustConversion({
    //     chainId: 42161,
    //     chainName: 'arbitrum',
    //     accountAddress: '0x123...abc',
    //     tokenPricesMappingTable: { eth: 3000 },
    //     slippage: 1,
    //     handleStatusUpdate: vi.fn()
    //   });

    //   // Fast-forward timers to handle batch delays
    //   await vi.runAllTimersAsync();

    //   const result = await promise;

    //   // Should process all 7 tokens
    //   expect(result).toHaveLength(7);
    //   expect(swap).toHaveBeenCalledTimes(7);

    //   // Should have scheduled delays (for batches 1 and 2)
    //   expect(setTimeout).toHaveBeenCalled();
    // });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle malformed token data gracefully", async () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");

      const malformedTokens = [
        {
          optimized_symbol: "VALID_TOKEN",
          symbol: "VALID_TOKEN",
          price: 1,
          amount: 10,
          decimals: 18,
          id: "0xvalid",
          raw_amount_hex_str: "0x8ac7230489e80000",
          protocol_id: "uniswap",
        },
        {
          optimized_symbol: "INVALID_TOKEN",
          symbol: "INVALID_TOKEN",
          // Missing required fields
          protocol_id: "sushiswap",
        },
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => malformedTokens,
      });

      swap.mockImplementation(
        (account, chainId, protocol, updateFn, fromToken) => {
          if (fromToken === "0xvalid") {
            return Promise.resolve([
              [{ data: "0x123", to: "0xto" }],
              "1000000000000000000",
              0.01,
            ]);
          }
          throw new Error("Invalid token data");
        },
      );

      const result = await handleDustConversion({
        chainId: 42161,
        chainName: "arbitrum",
        accountAddress: "0x123...abc",
        tokenPricesMappingTable: { eth: 3000 },
        slippage: 1,
        handleStatusUpdate: vi.fn(),
      });

      // Should process only the valid token
      expect(result).toHaveLength(1);
    });

    it("should handle BigNumber conversion errors", async () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");

      const tokenWithInvalidHex = [
        {
          optimized_symbol: "INVALID_HEX",
          symbol: "INVALID_HEX",
          price: 1,
          amount: 10,
          decimals: 18,
          id: "0xinvalid",
          raw_amount_hex_str: "invalid_hex_string",
          protocol_id: "uniswap",
        },
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => tokenWithInvalidHex,
      });

      const result = await handleDustConversion({
        chainId: 42161,
        chainName: "arbitrum",
        accountAddress: "0x123...abc",
        tokenPricesMappingTable: { eth: 3000 },
        slippage: 1,
        handleStatusUpdate: vi.fn(),
      });

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
