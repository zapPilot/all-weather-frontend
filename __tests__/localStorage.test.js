import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  safeSetLocalStorage,
  safeGetLocalStorage,
} from "../utils/localStorage.js";
import { ethers } from "ethers";

// Mock dependencies
vi.mock("../utils/logger.js", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("../utils/notification.js", () => ({
  default: vi.fn(),
}));

vi.mock("lz-string", () => ({
  default: {
    compressToUTF16: vi.fn(),
    decompressFromUTF16: vi.fn(),
  },
}));

vi.mock("ethers", () => ({
  ethers: {
    BigNumber: {
      from: vi.fn((value) => ({ hex: value, _hex: value, _isBigNumber: true })),
    },
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe("LocalStorage Utils", () => {
  const mockNotificationAPI = {
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SDK_API_URL = "https://test-api.example.com";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("safeSetLocalStorage", () => {
    it("should successfully store portfolio data via API", async () => {
      const { default: LZString } = await import("lz-string");

      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      LZString.compressToUTF16.mockReturnValue("compressed-data");

      const testData = {
        tokenPricesMappingTable: { eth: 3000, usdc: 1 },
        usdBalance: 1000,
        usdBalanceDict: { protocol1: { balance: 500 } },
        lockUpPeriod: 30,
        pendingRewards: { protocol1: 10 },
        timestamp: Date.now(),
      };

      const result = await safeSetLocalStorage(
        "test-key",
        testData,
        mockNotificationAPI,
      );

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://test-api.example.com/portfolio-cache",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining('"key":"test-key"'),
        },
      );
      expect(LZString.compressToUTF16).toHaveBeenCalledWith(
        JSON.stringify({
          tokenPricesMappingTable: testData.tokenPricesMappingTable,
          usdBalance: testData.usdBalance,
          usdBalanceDict: testData.usdBalanceDict,
          lockUpPeriod: testData.lockUpPeriod,
          pendingRewards: testData.pendingRewards,
          dust: {},
          timestamp: testData.timestamp,
          __className: "PortfolioCache",
        }),
      );
    });

    it("should handle API errors and return false", async () => {
      const { default: LZString } = await import("lz-string");

      // Mock API error
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      LZString.compressToUTF16.mockReturnValue("compressed-data");

      const testData = {
        tokenPricesMappingTable: { eth: 3000 },
        usdBalance: 500,
        usdBalanceDict: {},
        lockUpPeriod: 0,
        pendingRewards: {},
        timestamp: Date.now(),
      };

      const result = await safeSetLocalStorage(
        "test-key",
        testData,
        mockNotificationAPI,
      );

      expect(result).toBe(false);
    });

    it("should handle network errors", async () => {
      const { default: LZString } = await import("lz-string");

      // Mock network error
      fetch.mockRejectedValueOnce(new Error("Network error"));
      LZString.compressToUTF16.mockReturnValue("compressed-data");

      const testData = {
        tokenPricesMappingTable: {},
        usdBalance: 0,
        usdBalanceDict: {},
        lockUpPeriod: 0,
        pendingRewards: {},
        timestamp: Date.now(),
      };

      const result = await safeSetLocalStorage(
        "test-key",
        testData,
        mockNotificationAPI,
      );

      expect(result).toBe(false);
    });

    it("should handle compression errors", async () => {
      const { default: LZString } = await import("lz-string");

      // Mock compression error
      LZString.compressToUTF16.mockImplementation(() => {
        throw new Error("Compression failed");
      });

      const testData = {
        tokenPricesMappingTable: { eth: 3000 },
        usdBalance: 1000,
        usdBalanceDict: {},
        lockUpPeriod: 0,
        pendingRewards: {},
        timestamp: Date.now(),
      };

      const result = await safeSetLocalStorage(
        "test-key",
        testData,
        mockNotificationAPI,
      );

      expect(result).toBe(false);
    });
  });

  describe("safeGetLocalStorage", () => {
    it("should successfully retrieve and decompress portfolio data", async () => {
      const { default: LZString } = await import("lz-string");

      const mockCacheData = {
        tokenPricesMappingTable: { eth: 3000, usdc: 1 },
        usdBalance: 1000,
        usdBalanceDict: {},
        lockUpPeriod: 30,
        pendingRewards: {},
        dust: {},
        timestamp: Date.now(),
        __className: "PortfolioCache",
      };

      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "compressed-data" }),
      });

      LZString.decompressFromUTF16.mockReturnValue(
        JSON.stringify(mockCacheData),
      );

      const result = await safeGetLocalStorage(
        "test-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toEqual({
        tokenPricesMappingTable: mockCacheData.tokenPricesMappingTable,
        usdBalance: mockCacheData.usdBalance,
        usdBalanceDict: mockCacheData.usdBalanceDict,
        lockUpPeriod: mockCacheData.lockUpPeriod,
        pendingRewards: mockCacheData.pendingRewards,
        dust: mockCacheData.dust,
        timestamp: mockCacheData.timestamp,
      });
    });

    it("should return null for 404 responses", async () => {
      // Mock 404 response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await safeGetLocalStorage(
        "missing-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toBeNull();
    });

    it("should return null when no data is found", async () => {
      // Mock successful response but no data
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      const result = await safeGetLocalStorage(
        "empty-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toBeNull();
    });

    it("should handle decompression errors", async () => {
      const { default: LZString } = await import("lz-string");
      const { default: openNotificationWithIcon } = await import(
        "../utils/notification.js"
      );

      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "compressed-data" }),
      });

      // Mock decompression error
      LZString.decompressFromUTF16.mockImplementation(() => {
        throw new Error("Decompression failed");
      });

      const result = await safeGetLocalStorage(
        "test-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toBeNull();
      expect(openNotificationWithIcon).toHaveBeenCalledWith(
        mockNotificationAPI,
        "Error getting portfolio data",
        "error",
        "Failed to get portfolio data",
      );
    });

    it("should reconstruct dust objects with portfolio helper", async () => {
      const { default: LZString } = await import("lz-string");

      const mockProtocolInstance = {
        uniqueId: () => "protocol-123",
      };

      const mockPortfolioHelper = {
        strategy: {
          category1: {
            chain1: [{ interface: mockProtocolInstance }],
          },
        },
      };

      const mockCacheData = {
        tokenPricesMappingTable: { eth: 3000 },
        usdBalance: 1000,
        usdBalanceDict: {},
        lockUpPeriod: 0,
        pendingRewards: {},
        dust: {
          chain1: {
            protocol1: {
              assetBalance: { hex: "0x64" },
              assetUsdBalanceOf: 100,
              protocolId: "protocol-123",
            },
          },
        },
        timestamp: Date.now(),
        __className: "PortfolioCache",
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "compressed-data" }),
      });

      LZString.decompressFromUTF16.mockReturnValue(
        JSON.stringify(mockCacheData),
      );

      const result = await safeGetLocalStorage(
        "test-key",
        mockPortfolioHelper,
        mockNotificationAPI,
      );

      expect(result.dust.chain1.protocol1.protocol).toBe(mockProtocolInstance);
      expect(ethers.BigNumber.from).toHaveBeenCalledWith("0x64");
    });

    it("should reconstruct usdBalanceDict objects with portfolio helper", async () => {
      const { default: LZString } = await import("lz-string");

      const mockProtocolInstance = {
        uniqueId: () => "protocol-456",
      };

      const mockPortfolioHelper = {
        strategy: {
          category1: {
            chain1: [{ interface: mockProtocolInstance }],
          },
        },
      };

      const mockCacheData = {
        tokenPricesMappingTable: { eth: 3000 },
        usdBalance: 1000,
        usdBalanceDict: {
          "protocol-456/ClassName": {
            balance: 500,
            protocol: {
              name: "Test Protocol",
            },
          },
        },
        lockUpPeriod: 0,
        pendingRewards: {},
        dust: {},
        timestamp: Date.now(),
        __className: "PortfolioCache",
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "compressed-data" }),
      });

      LZString.decompressFromUTF16.mockReturnValue(
        JSON.stringify(mockCacheData),
      );

      const result = await safeGetLocalStorage(
        "test-key",
        mockPortfolioHelper,
        mockNotificationAPI,
      );

      expect(
        result.usdBalanceDict["protocol-456/ClassName"].protocol.interface,
      ).toBe(mockProtocolInstance);
    });

    it("should handle non-PortfolioCache data", async () => {
      const { default: LZString } = await import("lz-string");

      const mockData = {
        someOtherData: "test",
        __className: "SomeOtherClass",
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "compressed-data" }),
      });

      LZString.decompressFromUTF16.mockReturnValue(JSON.stringify(mockData));

      const result = await safeGetLocalStorage(
        "test-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toEqual(mockData);
    });

    it("should handle API errors gracefully", async () => {
      const { default: openNotificationWithIcon } = await import(
        "../utils/notification.js"
      );

      // Mock API error
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await safeGetLocalStorage(
        "test-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toBeNull();
      expect(openNotificationWithIcon).toHaveBeenCalledWith(
        mockNotificationAPI,
        "Error getting portfolio data",
        "error",
        "Failed to get portfolio data",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty environment variable", async () => {
      delete process.env.NEXT_PUBLIC_SDK_API_URL;

      const testData = {
        tokenPricesMappingTable: {},
        usdBalance: 0,
        usdBalanceDict: {},
        lockUpPeriod: 0,
        pendingRewards: {},
        timestamp: Date.now(),
      };

      const result = await safeSetLocalStorage(
        "test-key",
        testData,
        mockNotificationAPI,
      );

      expect(result).toBe(false);
    });

    it("should handle malformed JSON response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const result = await safeGetLocalStorage(
        "test-key",
        null,
        mockNotificationAPI,
      );

      expect(result).toBeNull();
    });

    it("should handle missing portfolio helper strategy", async () => {
      const { default: LZString } = await import("lz-string");

      const mockPortfolioHelper = {}; // Missing strategy

      const mockCacheData = {
        tokenPricesMappingTable: { eth: 3000 },
        usdBalance: 1000,
        usdBalanceDict: {},
        lockUpPeriod: 0,
        pendingRewards: {},
        dust: {
          chain1: {
            protocol1: {
              assetBalance: { hex: "0x64" },
              protocolId: "protocol-123",
            },
          },
        },
        timestamp: Date.now(),
        __className: "PortfolioCache",
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "compressed-data" }),
      });

      LZString.decompressFromUTF16.mockReturnValue(
        JSON.stringify(mockCacheData),
      );

      const result = await safeGetLocalStorage(
        "test-key",
        mockPortfolioHelper,
        mockNotificationAPI,
      );

      expect(result).toBeDefined();
      expect(result.dust.chain1.protocol1.assetBalance).toEqual({
        hex: "0x64",
      });
    });
  });
});
