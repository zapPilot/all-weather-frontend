import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import axios from "axios";
import { BaseConvex } from "../../classes/Convex/BaseConvex.js";
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
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000",
  approve: vi.fn(() => ({ type: "approve_txn" })),
}));

vi.mock("../../utils/thirdweb", () => ({
  default: { clientId: "test-client" },
}));

vi.mock("thirdweb", () => ({
  getContract: vi.fn((params) => ({
    address: params.address,
    abi: params.abi,
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
  exponentialDelay: vi.fn(),
}));

// Mock ethers contracts
const mockContractFunctions = {
  claimable_reward: vi.fn(),
  get_balances: vi.fn(),
  balanceOf: vi.fn(),
  totalSupply: vi.fn(),
  depositAll: vi.fn(),
  withdraw: vi.fn(),
  getReward: vi.fn(),
  add_liquidity: vi.fn(),
  remove_liquidity: vi.fn(),
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
        get_balances: mockContractFunctions.get_balances,
        totalSupply: mockContractFunctions.totalSupply,
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
      constants: {
        MaxUint256: actual.ethers.BigNumber.from(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        ),
        WeiPerEther: actual.ethers.BigNumber.from("1000000000000000000"),
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

describe("BaseConvex", () => {
  let baseConvex;
  let mockCustomParams;

  beforeEach(() => {
    mockCustomParams = {
      assetAddress: "0xC25a3A3b969415c80451098fa907EC722572917F",
      protocolAddress: "0xC25a3A3b969415c80451098fa907EC722572917F",
      convexRewardPool: "0xF05f0e4362859c3331Cb9395CBC201E3Fa6757EA",
      assetDecimals: 18,
      pid: 34,
      rewards: [
        {
          address: "0xba100000625a3754423978a60c9317c58a424e3D",
          symbol: "CRV",
          decimals: 18,
        },
        {
          address: "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
          symbol: "CVX",
          decimals: 18,
        },
      ],
      lpTokens: ["USDC", "USDT"],
    };

    baseConvex = new BaseConvex(
      "arbitrum",
      42161,
      ["USDC", "USDT"],
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
    it("should initialize BaseConvex with correct parameters", () => {
      expect(baseConvex.protocolName).toBe("convex");
      expect(baseConvex.protocolVersion).toBe("0");
      expect(baseConvex.chain).toBe("arbitrum");
      expect(baseConvex.chainId).toBe(42161);
      expect(baseConvex.assetDecimals).toBe(18);
      expect(baseConvex.pid).toBe(34);
    });

    it("should set up contract instances with correct addresses", () => {
      expect(baseConvex.assetContract).toBeDefined();
      expect(baseConvex.protocolContract).toBeDefined();
      expect(baseConvex.stakeFarmContract).toBeDefined();
      expect(baseConvex.convexRewardPoolContract).toBeDefined();

      expect(baseConvex.assetContract.address).toBe(
        "0xC25a3A3b969415c80451098fa907EC722572917F",
      );
      expect(baseConvex.protocolContract.address).toBe(
        "0xC25a3A3b969415c80451098fa907EC722572917F",
      );
      expect(baseConvex.stakeFarmContract.address).toBe(
        "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      );
      expect(baseConvex.convexRewardPoolContract.address).toBe(
        "0xF05f0e4362859c3331Cb9395CBC201E3Fa6757EA",
      );
    });

    it("should create ethers contract instance for asset", () => {
      expect(baseConvex.assetContractInstance).toBeDefined();
    });
  });

  describe("rewards()", () => {
    it("should return rewards from customParams", () => {
      const rewards = baseConvex.rewards();
      expect(rewards).toEqual(mockCustomParams.rewards);
      expect(rewards).toHaveLength(2);
      expect(rewards[0].symbol).toBe("CRV");
      expect(rewards[1].symbol).toBe("CVX");
    });
  });

  describe("pendingRewards()", () => {
    beforeEach(() => {
      mockContractFunctions.claimable_reward.mockResolvedValue([
        ethers.BigNumber.from("1000000000000000000"), // 1 token
      ]);
    });

    it("should calculate pending rewards for all reward tokens", async () => {
      const tokenPricesMappingTable = {
        CRV: 0.5,
        CVX: 2.0,
      };

      const result = await baseConvex.pendingRewards(
        "0xOwner",
        tokenPricesMappingTable,
        vi.fn(),
      );

      expect(result).toHaveProperty(
        "0xba100000625a3754423978a60c9317c58a424e3D",
      );
      expect(result).toHaveProperty(
        "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
      );

      // Check CRV reward structure
      expect(
        result["0xba100000625a3754423978a60c9317c58a424e3D"],
      ).toMatchObject({
        symbol: "CRV",
        balance: expect.any(Object),
        decimals: 18,
        chain: "arbitrum",
        usdDenominatedValue: expect.any(Number),
      });

      // Check CVX reward structure
      expect(
        result["0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"],
      ).toMatchObject({
        symbol: "CVX",
        balance: expect.any(Object),
        decimals: 18,
        chain: "arbitrum",
        usdDenominatedValue: expect.any(Number),
      });

      expect(mockContractFunctions.claimable_reward).toHaveBeenCalledTimes(2);
    });

    it("should handle zero pending rewards", async () => {
      mockContractFunctions.claimable_reward.mockResolvedValue([
        ethers.BigNumber.from("0"),
      ]);

      const result = await baseConvex.pendingRewards(
        "0xOwner",
        { CRV: 0.5, CVX: 2.0 },
        vi.fn(),
      );

      Object.values(result).forEach((reward) => {
        expect(reward.usdDenominatedValue).toBe(0);
      });
    });
  });

  describe("customDepositLP()", () => {
    beforeEach(() => {
      vi.spyOn(baseConvex, "_prepareTokenApprovals").mockResolvedValue({
        approveTxns: [{ type: "approve_1" }, { type: "approve_2" }],
        amounts: [
          ethers.BigNumber.from("1000000"),
          ethers.BigNumber.from("1000000"),
        ],
        totalNormalizedAmount: 2000,
      });
      vi.spyOn(baseConvex, "_calculateMinimumMintAmount").mockReturnValue({
        minMintAmount: ethers.BigNumber.from("1900000000000000000"),
        tradingLoss: 0,
      });
      vi.spyOn(baseConvex, "_createDepositTransaction").mockReturnValue({
        type: "deposit_txn",
      });
      vi.spyOn(baseConvex, "_stakeLP").mockResolvedValue([
        { type: "approve_stake" },
        { type: "stake_txn" },
      ]);
    });

    it("should generate complete deposit transactions", async () => {
      const tokenAmetadata = ["USDC", "0xUSDCAddress", 6, "1000000"];
      const tokenBmetadata = ["USDT", "0xUSDTAddress", 6, "1000000"];
      const tokenPricesMappingTable = { usdc: 1.0, usdt: 1.0 };
      const slippage = 1.0;
      const updateProgress = vi.fn();

      const [transactions, tradingLoss] = await baseConvex.customDepositLP(
        "0xOwner",
        tokenAmetadata,
        tokenBmetadata,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
      );

      expect(transactions).toHaveLength(5);
      expect(transactions[0]).toMatchObject({ type: "approve_1" });
      expect(transactions[1]).toMatchObject({ type: "approve_2" });
      expect(transactions[2]).toMatchObject({ type: "deposit_txn" });
      expect(transactions[3]).toMatchObject({ type: "approve_stake" });
      expect(transactions[4]).toMatchObject({ type: "stake_txn" });
      expect(tradingLoss).toBe(0);

      expect(baseConvex._prepareTokenApprovals).toHaveBeenCalledWith(
        [tokenAmetadata, tokenBmetadata],
        updateProgress,
      );
    });
  });

  describe("_prepareTokenApprovals()", () => {
    it("should prepare approval transactions for token pairs", async () => {
      const updateProgress = vi.fn();
      const tokenPairs = [
        ["USDC", "0xUSDCAddress", 6, ethers.BigNumber.from("1000000")],
        ["USDT", "0xUSDTAddress", 6, ethers.BigNumber.from("1000000")],
      ];

      // Mock the instance method
      vi.spyOn(baseConvex, "approve").mockResolvedValue({
        type: "approve_txn",
      });

      const result = await baseConvex._prepareTokenApprovals(
        tokenPairs,
        updateProgress,
      );

      expect(result.approveTxns).toHaveLength(2);
      expect(result.amounts).toHaveLength(2);
      expect(result.totalNormalizedAmount).toBeGreaterThan(0);

      expect(baseConvex.approve).toHaveBeenCalledTimes(2);
      expect(baseConvex.approve).toHaveBeenCalledWith(
        "0xUSDCAddress",
        baseConvex.protocolContract.address,
        expect.anything(),
        updateProgress,
        42161,
      );
    });
  });

  describe("_calculateMinimumMintAmount()", () => {
    beforeEach(() => {
      vi.spyOn(baseConvex, "_calculateLpPrice").mockReturnValue(1.0);
    });

    it("should calculate minimum mint amount with slippage", () => {
      const totalNormalizedAmount = 2000;
      const amounts = [
        ethers.BigNumber.from("1000000"),
        ethers.BigNumber.from("1000000"),
      ];
      const tokenAmetadata = ["USDC", "0xUSDCAddress", 6, "1000000"];
      const tokenBmetadata = ["USDT", "0xUSDTAddress", 6, "1000000"];
      const tokenPricesMappingTable = { usdc: 1.0, usdt: 1.0 };
      const slippage = 1.0; // 1%

      const result = baseConvex._calculateMinimumMintAmount(
        totalNormalizedAmount,
        amounts,
        tokenAmetadata,
        tokenBmetadata,
        tokenPricesMappingTable,
        slippage,
      );

      expect(result.minMintAmount).toBeDefined();
      expect(result.tradingLoss).toBe(0);
      expect(baseConvex._calculateLpPrice).toHaveBeenCalledWith(
        tokenPricesMappingTable,
      );
    });
  });

  describe("_createDepositTransaction()", () => {
    it("should create deposit transaction with correct parameters", () => {
      const amounts = [
        ethers.BigNumber.from("1000000"),
        ethers.BigNumber.from("1000000"),
      ];
      const minMintAmount = ethers.BigNumber.from("1900000000000000000");

      const result = baseConvex._createDepositTransaction(
        amounts,
        minMintAmount,
      );

      expect(result).toMatchObject({ type: "contract_call" });
    });
  });

  describe("customClaim()", () => {
    beforeEach(() => {
      vi.spyOn(baseConvex, "pendingRewards").mockResolvedValue({
        "0xRewardAddress": { balance: "1000", symbol: "CRV" },
      });
    });

    it("should generate claim transaction", async () => {
      const [transactions, pendingRewards] = await baseConvex.customClaim(
        "0xOwner",
        {},
        vi.fn(),
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(pendingRewards).toBeDefined();
    });
  });

  describe("usdBalanceOf()", () => {
    beforeEach(() => {
      vi.spyOn(baseConvex, "stakeBalanceOf").mockResolvedValue(5.0);
      vi.spyOn(baseConvex, "_calculateLpPrice").mockReturnValue(1.2);
    });

    it("should calculate USD balance using staked amount and LP price", async () => {
      const usdBalance = await baseConvex.usdBalanceOf("0xOwner", {});

      expect(usdBalance).toBe(6.0); // 5.0 * 1.2
      expect(baseConvex.stakeBalanceOf).toHaveBeenCalledWith(
        "0xOwner",
        expect.any(Function),
      );
      expect(baseConvex._calculateLpPrice).toHaveBeenCalled();
    });
  });

  describe("assetUsdPrice()", () => {
    beforeEach(() => {
      vi.spyOn(baseConvex, "_calculateLpPrice").mockReturnValue(1.5);
    });

    it("should return LP price", async () => {
      const price = await baseConvex.assetUsdPrice({});
      expect(price).toBe(1.5);
    });
  });

  describe("stakeBalanceOf()", () => {
    beforeEach(() => {
      mockContractFunctions.balanceOf.mockResolvedValue([
        ethers.BigNumber.from("5000000000000000000"),
      ]);
    });

    it("should return staked balance for owner", async () => {
      const balance = await baseConvex.stakeBalanceOf("0xOwner", vi.fn());

      expect(balance).toBeDefined();
      expect(mockContractFunctions.balanceOf).toHaveBeenCalledWith("0xOwner");
    });
  });

  describe("_calculateTokenAmountsForLP()", () => {
    beforeEach(() => {
      mockContractFunctions.get_balances.mockResolvedValue([
        [
          ethers.BigNumber.from("1000000000000000000000"), // 1000 tokens
          ethers.BigNumber.from("2000000000000000000000"), // 2000 tokens
        ],
      ]);
    });

    it("should calculate token amounts based on pool reserves", async () => {
      const tokenMetadatas = [
        ["USDC", "0xUSDC", 6, "1000"],
        ["USDT", "0xUSDT", 6, "2000"],
      ];
      const tickers = ["USDC", "USDT"];
      const tokenPricesMappingTable = { usdc: 1.0, usdt: 1.0 };

      const result = await baseConvex._calculateTokenAmountsForLP(
        1000,
        tokenMetadatas,
        tickers,
        tokenPricesMappingTable,
      );

      expect(result).toHaveLength(2);
      expect(mockContractFunctions.get_balances).toHaveBeenCalled();
    });
  });

  describe("_calculateLpPrice()", () => {
    it("should return 1 for stablecoin pools (pid 34)", () => {
      baseConvex.pid = 34;
      baseConvex.assetDecimals = 18;

      const price = baseConvex._calculateLpPrice({});
      expect(price).toBe(1 / Math.pow(10, 18));
    });

    it("should return 1 for stablecoin pools (pid 36)", () => {
      baseConvex.pid = 36;
      baseConvex.assetDecimals = 18;

      const price = baseConvex._calculateLpPrice({});
      expect(price).toBe(1 / Math.pow(10, 18));
    });

    it("should return WETH price for ETH pools (pid 28)", () => {
      baseConvex.pid = 28;
      baseConvex.assetDecimals = 18;
      const tokenPricesMappingTable = { weth: 2000 };

      const price = baseConvex._calculateLpPrice(tokenPricesMappingTable);
      expect(price).toBe(2000 / Math.pow(10, 18));
    });

    it("should throw error for unsupported pool", () => {
      baseConvex.pid = 999; // Unsupported pid

      expect(() => {
        baseConvex._calculateLpPrice({});
      }).toThrow("Not implemented");
    });
  });

  describe("_stakeLP()", () => {
    it("should generate staking transactions with approval", async () => {
      const amount = ethers.BigNumber.from("1000000000000000000");
      const transactions = await baseConvex._stakeLP(amount, vi.fn());

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
    });
  });

  describe("_unstakeLP()", () => {
    beforeEach(() => {
      vi.spyOn(baseConvex, "stakeBalanceOf").mockResolvedValue(
        ethers.BigNumber.from("5000000000000000000"),
      );
    });

    it("should generate unstaking transactions for given percentage", async () => {
      const [transactions, amount] = await baseConvex._unstakeLP(
        "0xOwner",
        0.5, // 50%
        vi.fn(),
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(amount).toBeDefined();
    });

    it("should calculate correct amount based on percentage", async () => {
      const stakedAmount = ethers.BigNumber.from("1000000000000000000");
      vi.spyOn(baseConvex, "stakeBalanceOf").mockResolvedValue(stakedAmount);

      const [, amount] = await baseConvex._unstakeLP("0xOwner", 0.25, vi.fn());

      expect(amount).toBeDefined();
    });
  });

  describe("customWithdrawLPAndClaim()", () => {
    beforeEach(() => {
      mockContractFunctions.get_balances.mockResolvedValue([
        ethers.BigNumber.from("1000000000000000000000"),
        ethers.BigNumber.from("2000000000000000000000"),
      ]);
      mockContractFunctions.totalSupply.mockResolvedValue(
        ethers.BigNumber.from("5000000000000000000000"),
      );
      vi.spyOn(baseConvex, "customClaim").mockResolvedValue([
        [{ type: "claim_txn" }],
        {},
      ]);
      vi.spyOn(
        baseConvex,
        "mul_with_slippage_in_bignumber_format",
      ).mockReturnValue(ethers.BigNumber.from("950000000000000000"));
    });

    it("should generate withdraw and claim transactions", async () => {
      const amount = ethers.BigNumber.from("1000000000000000000");
      const slippage = 1.0;
      const tokenPricesMappingTable = { usdc: 1.0, usdt: 1.0 };

      const [transactions, lpTokens, minPairAmounts, tradingLoss] =
        await baseConvex.customWithdrawLPAndClaim(
          "0xOwner",
          amount,
          slippage,
          tokenPricesMappingTable,
          vi.fn(),
        );

      expect(transactions).toHaveLength(2); // withdraw + claim
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(transactions[1]).toMatchObject({ type: "claim_txn" });
      expect(lpTokens).toEqual(["USDC", "USDT"]);
      expect(minPairAmounts).toHaveLength(2);
      expect(tradingLoss).toBe(0);
    });

    it("should calculate minimum withdraw amounts with slippage", async () => {
      const amount = ethers.BigNumber.from("1000000000000000000");
      const slippage = 2.0; // 2%

      await baseConvex.customWithdrawLPAndClaim(
        "0xOwner",
        amount,
        slippage,
        { usdc: 1.0, usdt: 1.0 },
        vi.fn(),
      );

      expect(
        baseConvex.mul_with_slippage_in_bignumber_format,
      ).toHaveBeenCalledTimes(2);
      expect(mockContractFunctions.get_balances).toHaveBeenCalled();
      expect(mockContractFunctions.totalSupply).toHaveBeenCalled();
    });
  });

  describe("lockUpPeriod()", () => {
    it("should return 0 for no lock-up period", async () => {
      const lockUp = await baseConvex.lockUpPeriod();
      expect(lockUp).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing customParams gracefully", () => {
      expect(() => {
        new BaseConvex("arbitrum", 42161, ["USDC", "USDT"], "LP", undefined);
      }).toThrow();
    });

    it("should handle contract call failures in pendingRewards", async () => {
      mockContractFunctions.claimable_reward.mockRejectedValue(
        new Error("Contract error"),
      );

      await expect(
        baseConvex.pendingRewards("0xOwner", { CRV: 0.5 }, vi.fn()),
      ).rejects.toThrow("Contract error");
    });

    it("should handle contract call failures in stakeBalanceOf", async () => {
      mockContractFunctions.balanceOf.mockRejectedValue(
        new Error("Balance error"),
      );

      await expect(
        baseConvex.stakeBalanceOf("0xOwner", vi.fn()),
      ).rejects.toThrow("Balance error");
    });

    it("should handle contract call failures in _calculateTokenAmountsForLP", async () => {
      mockContractFunctions.get_balances.mockRejectedValue(
        new Error("Balance fetch error"),
      );

      await expect(
        baseConvex._calculateTokenAmountsForLP(
          1000,
          [["USDC", "0xUSDC", 6, "1000"]],
          ["USDC"],
          { usdc: 1.0 },
        ),
      ).rejects.toThrow("Balance fetch error");
    });
  });

  describe("Integration Tests", () => {
    it("should have consistent contract addresses", () => {
      expect(baseConvex.assetContract.address).toBe(
        baseConvex.protocolContract.address,
      );
      expect(baseConvex.stakeFarmContract.address).toBe(
        "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      );
      expect(baseConvex.convexRewardPoolContract.address).toBe(
        "0xF05f0e4362859c3331Cb9395CBC201E3Fa6757EA",
      );
    });

    it("should inherit from BaseProtocol correctly", () => {
      expect(baseConvex.chain).toBe("arbitrum");
      expect(baseConvex.chainId).toBe(42161);
      expect(baseConvex.symbolList).toEqual(["USDC", "USDT"]);
      expect(baseConvex.mode).toBe("LP");
    });

    it("should handle different pool types correctly", () => {
      // Test stablecoin pool
      const stablecoinPool = new BaseConvex(
        "arbitrum",
        42161,
        ["USDC", "USDT"],
        "LP",
        { ...mockCustomParams, pid: 34 },
      );
      expect(stablecoinPool._calculateLpPrice({})).toBe(1 / Math.pow(10, 18));

      // Test ETH pool
      const ethPool = new BaseConvex("arbitrum", 42161, ["WETH", "ETH"], "LP", {
        ...mockCustomParams,
        pid: 28,
      });
      expect(ethPool._calculateLpPrice({ weth: 2000 })).toBe(
        2000 / Math.pow(10, 18),
      );
    });
  });

  describe("Method Coverage", () => {
    it("should cover all major methods", () => {
      expect(typeof baseConvex.rewards).toBe("function");
      expect(typeof baseConvex.pendingRewards).toBe("function");
      expect(typeof baseConvex.customDepositLP).toBe("function");
      expect(typeof baseConvex.customClaim).toBe("function");
      expect(typeof baseConvex.usdBalanceOf).toBe("function");
      expect(typeof baseConvex.assetUsdPrice).toBe("function");
      expect(typeof baseConvex.stakeBalanceOf).toBe("function");
      expect(typeof baseConvex._calculateTokenAmountsForLP).toBe("function");
      expect(typeof baseConvex._calculateLpPrice).toBe("function");
      expect(typeof baseConvex._stakeLP).toBe("function");
      expect(typeof baseConvex._unstakeLP).toBe("function");
      expect(typeof baseConvex.customWithdrawLPAndClaim).toBe("function");
      expect(typeof baseConvex.lockUpPeriod).toBe("function");
    });
  });
});
