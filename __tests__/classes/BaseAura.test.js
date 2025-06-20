import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import axios from "axios";
import { BaseAura } from "../../classes/Aura/BaseAura.js";
import { PROVIDER } from "../../utils/general.js";
import { AddLiquidityKind, RemoveLiquidityKind, Slippage } from "@balancer/sdk";

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
    address: "0xMockAddress",
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

vi.mock("@balancer/sdk", () => ({
  AddLiquidityKind: {
    Proportional: "proportional",
  },
  RemoveLiquidityKind: {
    Proportional: "proportional",
  },
  Slippage: {
    fromPercentage: vi.fn((percent) => ({ value: percent })),
  },
  AddLiquidity: vi.fn(() => ({
    query: vi.fn(),
    buildCall: vi.fn(),
  })),
  RemoveLiquidity: vi.fn(() => ({
    query: vi.fn(),
    buildCall: vi.fn(),
  })),
  BalancerApi: vi.fn(() => ({
    pools: {
      fetchPoolState: vi.fn(),
    },
  })),
}));

// Mock ethers contracts
const mockContractFunctions = {
  poolInfo: vi.fn(),
  earned: vi.fn(),
  balanceOf: vi.fn(),
};

vi.mock("ethers", async () => {
  const actual = await vi.importActual("ethers");
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(() => ({
        functions: mockContractFunctions,
        address: "0xMockContractAddress",
      })),
      BigNumber: {
        from: vi.fn((value) => ({
          mul: vi.fn(() => ({
            div: vi.fn(() => ethers.BigNumber.from("1000")),
          })),
          div: vi.fn(() => ethers.BigNumber.from("100")),
          toString: () => value.toString(),
        })),
      },
      utils: {
        formatUnits: vi.fn(() => "100.0"),
        parseUnits: vi.fn(() => ethers.BigNumber.from("1000000000000000000")),
      },
    },
  };
});

describe("BaseAura", () => {
  let baseAura;
  let mockCustomParams;

  beforeEach(() => {
    mockCustomParams = {
      assetDecimals: 18,
      assetAddress: "0xAssetAddress",
      poolId: "0xPoolId",
      pid: 1,
      rewards: [
        {
          address: "0xRewardAddress",
          symbol: "REWARD",
          decimals: 18,
          stashAddress: "0xStashAddress",
        },
      ],
      originalRewards: [
        {
          address: "0xOriginalRewardAddress",
          symbol: "BAL",
          decimals: 18,
        },
      ],
      lpTokens: ["TOKEN1", "TOKEN2"],
    };

    baseAura = new BaseAura(
      "arbitrum",
      42161,
      ["TOKEN1", "TOKEN2"],
      "LP",
      mockCustomParams,
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize BaseAura with correct parameters", () => {
      expect(baseAura.protocolName).toBe("aura");
      expect(baseAura.protocolVersion).toBe("0");
      expect(baseAura.chain).toBe("arbitrum");
      expect(baseAura.chainId).toBe(42161);
      expect(baseAura.assetDecimals).toBe(18);
    });

    it("should set up contract instances", () => {
      expect(baseAura.assetContract).toBeDefined();
      expect(baseAura.protocolContract).toBeDefined();
      expect(baseAura.stakeFarmContract).toBeDefined();
    });
  });

  describe("rewards()", () => {
    it("should return rewards from customParams", () => {
      const rewards = baseAura.rewards();
      expect(rewards).toEqual(mockCustomParams.rewards);
    });
  });

  describe("pendingRewards()", () => {
    beforeEach(() => {
      mockContractFunctions.poolInfo.mockResolvedValue({
        crvRewards: "0xRewardPoolAddress",
      });
      mockContractFunctions.earned.mockResolvedValue([
        ethers.BigNumber.from("1000000000000000000"),
      ]);
    });

    it("should calculate pending rewards for original rewards", async () => {
      const tokenPricesMappingTable = {
        BAL: 5.0,
        REWARD: 2.0,
      };

      const result = await baseAura.pendingRewards(
        "0xOwner",
        tokenPricesMappingTable,
        vi.fn(),
      );

      expect(result).toHaveProperty("0xOriginalRewardAddress");
      expect(result["0xOriginalRewardAddress"]).toMatchObject({
        symbol: "BAL",
        balance: expect.any(Object),
        decimals: 18,
        chain: "arbitrum",
      });
    });

    it("should calculate pending rewards for additional rewards", async () => {
      const tokenPricesMappingTable = {
        BAL: 5.0,
        REWARD: 2.0,
      };

      const result = await baseAura.pendingRewards(
        "0xOwner",
        tokenPricesMappingTable,
        vi.fn(),
      );

      expect(result).toHaveProperty("0xRewardAddress");
      expect(result["0xRewardAddress"]).toMatchObject({
        symbol: "REWARD",
        balance: expect.any(Object),
        decimals: 18,
      });
    });
  });

  describe("stakeBalanceOf()", () => {
    beforeEach(() => {
      mockContractFunctions.poolInfo.mockResolvedValue({
        crvRewards: "0xRewardPoolAddress",
      });
      mockContractFunctions.balanceOf.mockResolvedValue([
        ethers.BigNumber.from("5000000000000000000"),
      ]);
    });

    it("should return staked balance for owner", async () => {
      const balance = await baseAura.stakeBalanceOf("0xOwner");
      expect(balance).toBeDefined();
      expect(mockContractFunctions.poolInfo).toHaveBeenCalledWith(1);
      expect(mockContractFunctions.balanceOf).toHaveBeenCalledWith("0xOwner");
    });
  });

  describe("_calculateLpPrice()", () => {
    it("should fetch LP price from API", async () => {
      const mockResponse = {
        data: {
          price: 1200000000000000000, // 1.2 * 10^18, will be divided by 10^18 (assetDecimals)
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const price = await baseAura._calculateLpPrice({});

      expect(price).toBe(1.2); // 1200000000000000000 / 10^18
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/pool/arbitrum/aura/0/wausdcn-gho/apr"),
      );
    });

    it("should handle API errors gracefully", async () => {
      axios.get.mockRejectedValue(new Error("API Error"));

      const price = await baseAura._calculateLpPrice({});

      expect(price).toBe(0);
    });
  });

  describe("assetUsdPrice()", () => {
    it("should return LP price", async () => {
      const mockPrice = 1.5;
      vi.spyOn(baseAura, "_calculateLpPrice").mockResolvedValue(mockPrice);

      const price = await baseAura.assetUsdPrice({});

      expect(price).toBe(mockPrice);
    });
  });

  describe("usdBalanceOf()", () => {
    it("should calculate USD balance correctly", async () => {
      const mockPrice = 1.2;
      const mockBalance = ethers.BigNumber.from("5000000000000000000");

      vi.spyOn(baseAura, "_calculateLpPrice").mockResolvedValue(mockPrice);
      vi.spyOn(baseAura, "stakeBalanceOf").mockResolvedValue(mockBalance);

      const usdBalance = await baseAura.usdBalanceOf("0xOwner", {});

      expect(typeof usdBalance).toBe("number");
    });
  });

  describe("customClaim()", () => {
    beforeEach(() => {
      mockContractFunctions.poolInfo.mockResolvedValue({
        crvRewards: "0xRewardPoolAddress",
      });
      vi.spyOn(baseAura, "pendingRewards").mockResolvedValue({
        "0xRewardAddress": { balance: "1000", symbol: "REWARD" },
      });
    });

    it("should generate claim transaction", async () => {
      const [transactions, pendingRewards] = await baseAura.customClaim(
        "0xOwner",
        {},
        vi.fn(),
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(pendingRewards).toBeDefined();
    });
  });

  describe("_stakeLP()", () => {
    it("should generate staking transactions", async () => {
      const amount = ethers.BigNumber.from("1000000000000000000");
      const transactions = await baseAura._stakeLP(amount, vi.fn());

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
    });
  });

  describe("_unstakeLP()", () => {
    beforeEach(() => {
      mockContractFunctions.poolInfo.mockResolvedValue({
        crvRewards: "0xRewardPoolAddress",
      });
      vi.spyOn(baseAura, "stakeBalanceOf").mockResolvedValue(
        ethers.BigNumber.from("5000000000000000000"),
      );
    });

    it("should generate unstaking transactions for given percentage", async () => {
      const [transactions, amount] = await baseAura._unstakeLP(
        "0xOwner",
        0.5, // 50%
        vi.fn(),
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(amount).toBeDefined();
    });
  });

  describe("_calculateTokenAmountsForLP()", () => {
    beforeEach(() => {
      vi.spyOn(baseAura, "_calculateMintLP").mockResolvedValue({
        maxAmountsIn: [
          { amount: 1000000000000000000n, decimalScale: 1000000000000000000n },
          { amount: 2000000000000000000n, decimalScale: 1000000000000000000n },
        ],
      });
    });

    it("should calculate token amounts for LP creation", async () => {
      const tokenMetadatas = [
        ["TOKEN1", "0xToken1", 18, "1000"],
        ["TOKEN2", "0xToken2", 18, "2000"],
      ];

      const result = await baseAura._calculateTokenAmountsForLP(
        1000,
        tokenMetadatas,
        ["TOKEN1", "TOKEN2"],
        { TOKEN1: 1.0, TOKEN2: 1.0 },
      );

      expect(result).toHaveLength(2);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle pools with zero amounts correctly", async () => {
      vi.spyOn(baseAura, "_calculateMintLP").mockResolvedValue({
        maxAmountsIn: [
          { amount: 1000000000000000000n, decimalScale: 1000000000000000000n },
          { amount: 0n, decimalScale: 1000000000000000000n },
          { amount: 2000000000000000000n, decimalScale: 1000000000000000000n },
        ],
      });

      const tokenMetadatas = [
        ["TOKEN1", "0xToken1", 18, "1000"],
        ["TOKEN2", "0xToken2", 18, "2000"],
      ];

      const result = await baseAura._calculateTokenAmountsForLP(
        1000,
        tokenMetadatas,
        ["TOKEN1", "TOKEN2"],
        { TOKEN1: 1.0, TOKEN2: 1.0 },
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("lockUpPeriod()", () => {
    it("should return 0 for no lock-up period", async () => {
      const lockUp = await baseAura.lockUpPeriod();
      expect(lockUp).toBe(0);
    });
  });

  describe("_calculateMinWithdrawAmount()", () => {
    it("should calculate minimum withdraw amount with slippage", () => {
      const lpAmount = ethers.BigNumber.from("1000000000000000000");
      const ratio = 0.5;
      const decimals = 18;
      const slippage = 0.01; // 1%
      const avgDecimals = 18;

      vi.spyOn(
        baseAura,
        "mul_with_slippage_in_bignumber_format",
      ).mockReturnValue(ethers.BigNumber.from("990000000000000000"));

      const [expectedAmount, minAmount] = baseAura._calculateMinWithdrawAmount(
        lpAmount,
        ratio,
        decimals,
        slippage,
        avgDecimals,
      );

      expect(typeof expectedAmount).toBe("number");
      expect(minAmount).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing customParams gracefully", () => {
      expect(() => {
        new BaseAura("arbitrum", 42161, ["TOKEN1"], "LP", undefined);
      }).toThrow();
    });

    it("should handle API failures in price calculation", async () => {
      axios.get.mockRejectedValue(new Error("Network error"));

      const price = await baseAura._calculateLpPrice({});
      expect(price).toBe(0);
    });

    it("should handle contract call failures", async () => {
      mockContractFunctions.poolInfo.mockRejectedValue(
        new Error("Contract error"),
      );

      await expect(baseAura.stakeBalanceOf("0xOwner")).rejects.toThrow(
        "Contract error",
      );
    });
  });
});
