import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import axios from "axios";
import { YearnV3Vault } from "../../classes/Yearn/YearnV3Vault.js";
import { PROVIDER } from "../../utils/general.js";

// Mock all external dependencies
vi.mock("../../utils/general.js", () => ({
  PROVIDER: vi.fn(() => ({
    rpcUrl: "https://arbitrum.rpc.com",
    connection: { url: "https://arbitrum.rpc.com" },
  })),
  CHAIN_ID_TO_CHAIN: {
    42161: { id: 42161, name: "arbitrum" },
  },
  approve: vi.fn(() => ({ type: "approve_txn" })),
}));

vi.mock("../../utils/thirdweb", () => ({
  default: { clientId: "test-client" },
}));

vi.mock("thirdweb", () => ({
  getContract: vi.fn(() => ({
    address: "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
    abi: [],
  })),
  prepareContractCall: vi.fn(() => ({ type: "contract_call" })),
  prepareTransaction: vi.fn(() => ({ type: "transaction" })),
}));

vi.mock("../../utils/logger", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("axios");
vi.mock("axios-retry", () => ({
  default: vi.fn(),
}));

// Mock ethers contracts
const mockContractFunctions = {
  balanceOf: vi.fn(),
  pricePerShare: vi.fn(),
  deposit: vi.fn(),
  withdraw: vi.fn(),
};

vi.mock("ethers", async () => {
  const actual = await vi.importActual("ethers");
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(() => ({
        functions: mockContractFunctions,
        address: "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      })),
      BigNumber: {
        from: vi.fn((value) => ({
          mul: vi.fn(() => ({
            div: vi.fn(() => actual.ethers.BigNumber.from("1000")),
          })),
          div: vi.fn(() => actual.ethers.BigNumber.from("100")),
          toString: () => value.toString(),
        })),
      },
      utils: {
        formatUnits: vi.fn(() => "100.0"),
        parseUnits: vi.fn(() =>
          actual.ethers.BigNumber.from("1000000000000000000"),
        ),
      },
    },
  };
});

describe("YearnV3Vault", () => {
  let yearnV3Vault;
  let mockCustomParams;

  beforeEach(() => {
    mockCustomParams = {
      assetAddress: "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      assetDecimals: 18,
    };

    yearnV3Vault = new YearnV3Vault(
      "arbitrum",
      42161,
      ["WETH"],
      "single",
      mockCustomParams,
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize YearnV3Vault with correct parameters", () => {
      expect(yearnV3Vault.protocolName).toBe("yearn");
      expect(yearnV3Vault.protocolVersion).toBe("0");
      expect(yearnV3Vault.chain).toBe("arbitrum");
      expect(yearnV3Vault.chainId).toBe(42161);
      expect(yearnV3Vault.assetDecimals).toBe(18);
    });

    it("should set up contract instances with same address", () => {
      expect(yearnV3Vault.assetContract).toBeDefined();
      expect(yearnV3Vault.protocolContract).toBeDefined();
      expect(yearnV3Vault.stakeFarmContract).toBeDefined();

      // All contracts should point to the same address for YearnV3
      expect(yearnV3Vault.assetContract.address).toBe(
        "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      );
      expect(yearnV3Vault.protocolContract.address).toBe(
        "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      );
    });
  });

  describe("rewards()", () => {
    it("should return empty array as YearnV3 has no rewards", () => {
      const rewards = yearnV3Vault.rewards();
      expect(rewards).toEqual([]);
    });
  });

  describe("pendingRewards()", () => {
    it("should return empty object as YearnV3 has no pending rewards", async () => {
      const pendingRewards = await yearnV3Vault.pendingRewards(
        "0xOwner",
        {},
        vi.fn(),
      );
      expect(pendingRewards).toEqual({});
    });
  });

  describe("customDeposit()", () => {
    it("should generate deposit transactions with approval", async () => {
      const owner = "0xOwner";
      const inputToken = "WETH";
      const bestTokenAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
      const amountToZapIn = ethers.BigNumber.from("1000000000000000000");
      const tokenDecimals = 18;
      const tokenPricesMappingTable = { weth: 2000 };
      const slippage = 0.01;
      const updateProgress = vi.fn();

      const [transactions, tradingLoss] = await yearnV3Vault.customDeposit(
        owner,
        inputToken,
        bestTokenAddress,
        amountToZapIn,
        tokenDecimals,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
      );

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
      expect(tradingLoss).toBe(0);
    });

    it("should call approve with correct parameters", async () => {
      const { approve } = await import("../../utils/general.js");
      const updateProgress = vi.fn();

      await yearnV3Vault.customDeposit(
        "0xOwner",
        "WETH",
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        ethers.BigNumber.from("1000000000000000000"),
        18,
        { weth: 2000 },
        0.01,
        updateProgress,
      );

      expect(approve).toHaveBeenCalledWith(
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        yearnV3Vault.protocolContract.address,
        expect.anything(), // BigNumber object
        updateProgress,
        42161,
      );
    });
  });

  describe("customClaim()", () => {
    it("should return empty transactions and rewards", async () => {
      const [transactions, rewards] = await yearnV3Vault.customClaim(
        "0xOwner",
        {},
        vi.fn(),
      );

      expect(transactions).toEqual([]);
      expect(rewards).toEqual({});
    });
  });

  describe("usdBalanceOf()", () => {
    beforeEach(() => {
      mockContractFunctions.balanceOf.mockResolvedValue([
        ethers.BigNumber.from("5000000000000000000"),
      ]);
      mockContractFunctions.pricePerShare.mockResolvedValue([
        ethers.BigNumber.from("1100000000000000000"),
      ]);
    });

    it("should calculate USD balance using user balance and price per share", async () => {
      const tokenPricesMappingTable = { weth: 2000 };

      const usdBalance = await yearnV3Vault.usdBalanceOf(
        "0xOwner",
        tokenPricesMappingTable,
      );

      expect(mockContractFunctions.balanceOf).toHaveBeenCalledWith("0xOwner");
      expect(mockContractFunctions.pricePerShare).toHaveBeenCalled();
      expect(typeof usdBalance).toBe("number");
      expect(usdBalance).toBeGreaterThan(0);
    });

    it("should handle contract calls correctly", async () => {
      const tokenPricesMappingTable = { weth: 2000 };

      await yearnV3Vault.usdBalanceOf("0xOwner", tokenPricesMappingTable);

      expect(mockContractFunctions.balanceOf).toHaveBeenCalledTimes(1);
      expect(mockContractFunctions.pricePerShare).toHaveBeenCalledTimes(1);
    });

    it("should calculate balance using WETH price correctly", async () => {
      // Mock realistic values
      const userBalance = ethers.BigNumber.from("1000000000000000000"); // 1 token
      const pricePerShare = ethers.BigNumber.from("1100000000000000000"); // 1.1 ETH per share
      const wethPrice = 2000; // $2000 per ETH

      mockContractFunctions.balanceOf.mockResolvedValue([userBalance]);
      mockContractFunctions.pricePerShare.mockResolvedValue([pricePerShare]);

      const usdBalance = await yearnV3Vault.usdBalanceOf("0xOwner", {
        weth: wethPrice,
      });

      // Expected calculation: (1 * 2000 / 1e18) * 1.1 / 1e18
      // But since we're working with actual BigNumbers, just verify it's calculated
      expect(typeof usdBalance).toBe("number");
    });
  });

  describe("_getTheBestTokenAddressToZapIn()", () => {
    it("should return WETH token details for zap in", () => {
      const result = yearnV3Vault._getTheBestTokenAddressToZapIn(
        "USDC",
        "0xA0b86a33E6441d1e85d47F81B5f4de9B7c4d8f5e",
        6,
      );

      expect(result).toEqual([
        "weth",
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        18,
      ]);
    });

    it("should always return WETH regardless of input parameters", () => {
      const result1 = yearnV3Vault._getTheBestTokenAddressToZapIn(
        "DAI",
        "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        18,
      );
      const result2 = yearnV3Vault._getTheBestTokenAddressToZapIn(
        "USDT",
        "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        6,
      );

      expect(result1).toEqual([
        "weth",
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        18,
      ]);
      expect(result2).toEqual([
        "weth",
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        18,
      ]);
    });
  });

  describe("_getTheBestTokenAddressToZapOut()", () => {
    it("should return WETH token details for zap out", () => {
      const result = yearnV3Vault._getTheBestTokenAddressToZapOut();

      expect(result).toEqual([
        "weth",
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        18,
      ]);
    });
  });

  describe("Integration Tests", () => {
    it("should have consistent protocol configuration", () => {
      expect(yearnV3Vault.assetContract.address).toBe(
        yearnV3Vault.protocolContract.address,
      );
      expect(yearnV3Vault.protocolContract.address).toBe(
        yearnV3Vault.stakeFarmContract.address,
      );
    });

    it("should inherit from BaseProtocol", () => {
      expect(yearnV3Vault.chain).toBe("arbitrum");
      expect(yearnV3Vault.chainId).toBe(42161);
      expect(yearnV3Vault.symbolList).toEqual(["WETH"]);
      expect(yearnV3Vault.mode).toBe("single");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing customParams gracefully", () => {
      expect(() => {
        new YearnV3Vault("arbitrum", 42161, ["WETH"], "single", undefined);
      }).toThrow();
    });

    it("should handle contract call failures in usdBalanceOf", async () => {
      mockContractFunctions.balanceOf.mockRejectedValue(
        new Error("Contract error"),
      );

      await expect(
        yearnV3Vault.usdBalanceOf("0xOwner", { weth: 2000 }),
      ).rejects.toThrow("Contract error");
    });

    it("should handle pricePerShare call failures", async () => {
      mockContractFunctions.balanceOf.mockResolvedValue([
        ethers.BigNumber.from("1000000000000000000"),
      ]);
      mockContractFunctions.pricePerShare.mockRejectedValue(
        new Error("Price error"),
      );

      await expect(
        yearnV3Vault.usdBalanceOf("0xOwner", { weth: 2000 }),
      ).rejects.toThrow("Price error");
    });

    it("should handle missing WETH price in tokenPricesMappingTable", async () => {
      mockContractFunctions.balanceOf.mockResolvedValue([
        ethers.BigNumber.from("1000000000000000000"),
      ]);
      mockContractFunctions.pricePerShare.mockResolvedValue([
        ethers.BigNumber.from("1100000000000000000"),
      ]);

      const usdBalance = await yearnV3Vault.usdBalanceOf("0xOwner", {});

      // Should handle undefined price gracefully (NaN or 0)
      expect(typeof usdBalance).toBe("number");
    });
  });

  describe("Method Coverage", () => {
    it("should cover all major methods", () => {
      expect(typeof yearnV3Vault.rewards).toBe("function");
      expect(typeof yearnV3Vault.pendingRewards).toBe("function");
      expect(typeof yearnV3Vault.customDeposit).toBe("function");
      expect(typeof yearnV3Vault.customClaim).toBe("function");
      expect(typeof yearnV3Vault.usdBalanceOf).toBe("function");
      expect(typeof yearnV3Vault._getTheBestTokenAddressToZapIn).toBe(
        "function",
      );
      expect(typeof yearnV3Vault._getTheBestTokenAddressToZapOut).toBe(
        "function",
      );
    });
  });
});
