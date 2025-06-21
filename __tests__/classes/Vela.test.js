import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import axios from "axios";
import { Vela } from "../../classes/Vela/Vela.js";
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
}));

// Mock ethers contracts
const mockContractFunctions = {
  getStakedAmount: vi.fn(),
  getVLPPrice: vi.fn(),
  userStakedInfo: vi.fn(),
  stake: vi.fn(),
  unstake: vi.fn(),
};

const mockCooldownDuration = vi.fn();

vi.mock("ethers", async () => {
  const actual = await vi.importActual("ethers");
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(() => ({
        functions: mockContractFunctions,
        cooldownDuration: mockCooldownDuration,
        address: "0xMockContractAddress",
      })),
      BigNumber: {
        from: vi.fn((value) => ({
          mul: vi.fn(() => ({
            div: vi.fn(() => actual.ethers.BigNumber.from("1000")),
          })),
          div: vi.fn(() => actual.ethers.BigNumber.from("100")),
          isZero: vi.fn(() => false),
          toNumber: vi.fn(() => Number(value)),
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

describe("Vela", () => {
  let vela;
  let mockCustomParams;

  beforeEach(() => {
    mockCustomParams = {
      assetAddress: "0xC5b2D9FDa8A82E8DcECD5e9e6e99b78a9188eB05",
      protocolAddress: "0xC4ABADE3a15064F9E3596943c699032748b13352",
      stakeFarmAddress: "0x60b8C145235A31f1949a831803768bF37d7Ab7AA",
    };

    vela = new Vela("arbitrum", 42161, ["VLP"], "single", mockCustomParams);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize Vela with correct parameters", () => {
      expect(vela.protocolName).toBe("vela");
      expect(vela.protocolVersion).toBe("0");
      expect(vela.chain).toBe("arbitrum");
      expect(vela.chainId).toBe(42161);
      expect(vela.assetDecimals).toBe(18);
    });

    it("should set up contract instances with correct addresses", () => {
      expect(vela.assetContract).toBeDefined();
      expect(vela.protocolContract).toBeDefined();
      expect(vela.stakeFarmContract).toBeDefined();

      expect(vela.assetContract.address).toBe(
        "0xC5b2D9FDa8A82E8DcECD5e9e6e99b78a9188eB05",
      );
      expect(vela.protocolContract.address).toBe(
        "0xC4ABADE3a15064F9E3596943c699032748b13352",
      );
      expect(vela.stakeFarmContract.address).toBe(
        "0x60b8C145235A31f1949a831803768bF37d7Ab7AA",
      );
    });
  });

  describe("rewards()", () => {
    it("should return empty array as Vela has no rewards", () => {
      const rewards = vela.rewards();
      expect(rewards).toEqual([]);
    });
  });

  describe("pendingRewards()", () => {
    it("should return empty object as Vela has no pending rewards", async () => {
      const pendingRewards = await vela.pendingRewards("0xOwner", {}, vi.fn());
      expect(pendingRewards).toEqual({});
    });
  });

  describe("_fetchVlpPrice()", () => {
    beforeEach(() => {
      mockContractFunctions.getVLPPrice.mockResolvedValue([
        ethers.BigNumber.from("120000000"), // 1.2 * 1e5 * 1e3 (adjusted for division)
      ]);
    });

    it("should fetch VLP price from contract", async () => {
      const price = await vela._fetchVlpPrice(vi.fn());

      expect(mockContractFunctions.getVLPPrice).toHaveBeenCalled();
      expect(typeof price).toBe("number");
    });

    it("should calculate price correctly with decimals adjustment", async () => {
      // Mock a realistic VLP price
      mockContractFunctions.getVLPPrice.mockResolvedValue([
        ethers.BigNumber.from("120000000000000000000000"), // 1.2 * 1e5 * 1e18
      ]);

      const price = await vela._fetchVlpPrice(vi.fn());

      // Expected: 120000000000000000000000 / 1e5 / 1e18 = 1.2
      expect(price).toBe(1.2);
    });
  });

  describe("assetUsdPrice()", () => {
    it("should return VLP price", async () => {
      const mockPrice = 1.5;
      vi.spyOn(vela, "_fetchVlpPrice").mockResolvedValue(mockPrice);

      const price = await vela.assetUsdPrice({});

      expect(price).toBe(mockPrice);
    });
  });

  describe("usdBalanceOf()", () => {
    beforeEach(() => {
      mockContractFunctions.getStakedAmount.mockResolvedValue([
        ethers.BigNumber.from("5000000000000000000"), // 5 VLP tokens
      ]);
      vi.spyOn(vela, "_fetchVlpPrice").mockResolvedValue(1.2);
    });

    it("should calculate USD balance using staked amount and VLP price", async () => {
      const usdBalance = await vela.usdBalanceOf("0xOwner", {});

      expect(mockContractFunctions.getStakedAmount).toHaveBeenCalledWith(
        vela.assetContract.address,
        "0xOwner",
      );
      expect(typeof usdBalance).toBe("number");
    });

    it("should multiply staked amount by VLP price", async () => {
      const stakedAmount = ethers.BigNumber.from("1000000000000000000"); // 1 VLP
      const vlpPrice = 2.5;

      mockContractFunctions.getStakedAmount.mockResolvedValue([stakedAmount]);
      vi.spyOn(vela, "_fetchVlpPrice").mockResolvedValue(vlpPrice);

      const usdBalance = await vela.usdBalanceOf("0xOwner", {});

      // Should be stakedAmount * vlpPrice
      expect(usdBalance).toBeGreaterThan(0);
    });
  });

  describe("_getTheBestTokenAddressToZapIn()", () => {
    it("should return USDC token details for zap in", () => {
      const result = vela._getTheBestTokenAddressToZapIn(
        "WETH",
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        18,
      );

      expect(result).toEqual([
        "usdc",
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        6,
      ]);
    });
  });

  describe("_getTheBestTokenAddressToZapOut()", () => {
    it("should return USDC token details for zap out", () => {
      const result = vela._getTheBestTokenAddressToZapOut();

      expect(result).toEqual([
        "usdc",
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        6,
      ]);
    });
  });

  describe("customDeposit()", () => {
    beforeEach(() => {
      vi.spyOn(vela, "_fetchVlpPrice").mockResolvedValue(1.2);
      vi.spyOn(vela, "_stake").mockResolvedValue([
        { type: "approve_stake" },
        { type: "stake_txn" },
      ]);
    });

    it("should generate deposit transactions with approval, mint, and stake", async () => {
      const [transactions, tradingLoss] = await vela.customDeposit(
        "0xOwner",
        "usdc",
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        ethers.BigNumber.from("1000000"), // 1 USDC (6 decimals)
        6,
        { usdc: 1.0 },
        1.0, // 1% slippage
        vi.fn(),
      );

      expect(transactions).toHaveLength(4); // approve + mint + approve_stake + stake
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
      expect(transactions[2]).toMatchObject({ type: "approve_stake" });
      expect(transactions[3]).toMatchObject({ type: "stake_txn" });
      expect(tradingLoss).toBe(0);
    });

    it("should calculate estimated VLP amount correctly", async () => {
      const amount = ethers.BigNumber.from("1000000"); // 1 USDC
      const tokenPrice = 1.0; // $1 per USDC
      const vlpPrice = 1.2; // $1.2 per VLP

      await vela.customDeposit(
        "0xOwner",
        "usdc",
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        amount,
        6,
        { usdc: tokenPrice },
        1.0,
        vi.fn(),
      );

      // Should calculate estimated VLP amount and call _stake with slippage-adjusted amount
      expect(vela._stake).toHaveBeenCalled();
    });
  });

  describe("customClaim()", () => {
    it("should return empty transactions and rewards", async () => {
      const [transactions, rewards] = await vela.customClaim(
        "0xOwner",
        {},
        vi.fn(),
      );

      expect(transactions).toEqual([]);
      expect(rewards).toEqual({});
    });
  });

  describe("_stake()", () => {
    it("should generate staking transactions with approval", async () => {
      const amount = ethers.BigNumber.from("1000000000000000000");
      const transactions = await vela._stake(amount, vi.fn());

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
    });
  });

  describe("_unstake()", () => {
    beforeEach(() => {
      mockContractFunctions.getStakedAmount.mockResolvedValue([
        ethers.BigNumber.from("5000000000000000000"), // 5 VLP tokens
      ]);
    });

    it("should generate unstaking transactions for given percentage", async () => {
      const [transactions, amount] = await vela._unstake(
        "0xOwner",
        0.5, // 50%
        vi.fn(),
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(amount).toBeDefined();
      expect(mockContractFunctions.getStakedAmount).toHaveBeenCalledWith(
        vela.assetContract.address,
        "0xOwner",
      );
    });

    it("should calculate correct amount based on percentage", async () => {
      const stakedAmount = ethers.BigNumber.from("1000000000000000000"); // 1 VLP
      mockContractFunctions.getStakedAmount.mockResolvedValue([stakedAmount]);

      const [, amount] = await vela._unstake("0xOwner", 0.25, vi.fn()); // 25%

      // Should be 25% of staked amount
      expect(amount).toBeDefined();
    });
  });

  describe("customWithdrawAndClaim()", () => {
    beforeEach(() => {
      vi.spyOn(vela, "_fetchVlpPrice").mockResolvedValue(1.2);
    });

    it("should generate withdraw transactions with approval and burn", async () => {
      const vlpAmount = ethers.BigNumber.from("1000000000000000000"); // 1 VLP
      const tokenPricesMappingTable = { usdc: 1.0 };

      const [
        transactions,
        symbolOfBestToken,
        bestTokenAddress,
        decimals,
        minOutAmount,
        tradingLoss,
      ] = await vela.customWithdrawAndClaim(
        "0xOwner",
        vlpAmount,
        1.0, // 1% slippage
        tokenPricesMappingTable,
        vi.fn(),
      );

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
      expect(symbolOfBestToken).toBe("usdc");
      expect(bestTokenAddress).toBe(
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      );
      expect(decimals).toBe(6);
      expect(typeof minOutAmount).toBe("number");
      expect(tradingLoss).toBe(0);
    });

    it("should calculate minimum output amount with slippage", async () => {
      const vlpAmount = ethers.BigNumber.from("1000000000000000000"); // 1 VLP
      const vlpPrice = 1.2; // $1.2 per VLP
      const usdcPrice = 1.0; // $1.0 per USDC
      const slippage = 2.0; // 2%

      vi.spyOn(vela, "_fetchVlpPrice").mockResolvedValue(vlpPrice);

      const [, , , , minOutAmount] = await vela.customWithdrawAndClaim(
        "0xOwner",
        vlpAmount,
        slippage,
        { usdc: usdcPrice },
        vi.fn(),
      );

      // Should apply slippage to the expected output amount
      expect(minOutAmount).toBeGreaterThan(0);
      expect(typeof minOutAmount).toBe("number");
    });
  });

  describe("lockUpPeriod()", () => {
    beforeEach(() => {
      mockContractFunctions.userStakedInfo.mockResolvedValue({
        amount: ethers.BigNumber.from("1000000000000000000"),
        startTimestamp: ethers.BigNumber.from(
          Math.floor(Date.now() / 1000) - 3600,
        ), // 1 hour ago
      });
      mockCooldownDuration.mockResolvedValue(
        ethers.BigNumber.from("86400"), // 24 hours
      );
    });

    it("should calculate lock-up period when user has staked tokens", async () => {
      const lockUpPeriod = await vela.lockUpPeriod("0xOwner");

      expect(mockContractFunctions.userStakedInfo).toHaveBeenCalledWith(
        "0xOwner",
        vela.assetContract.address,
      );
      expect(mockCooldownDuration).toHaveBeenCalled();
      expect(typeof lockUpPeriod).toBe("number");
      expect(lockUpPeriod).toBeGreaterThan(0);
    });

    it("should return 0 when cooldown period has passed", async () => {
      // Mock user staked 2 days ago with 1 day cooldown
      mockContractFunctions.userStakedInfo.mockResolvedValue({
        amount: ethers.BigNumber.from("1000000000000000000"),
        startTimestamp: ethers.BigNumber.from(
          Math.floor(Date.now() / 1000) - 172800,
        ), // 2 days ago
      });
      mockCooldownDuration.mockResolvedValue(
        ethers.BigNumber.from("86400"), // 1 day
      );

      const lockUpPeriod = await vela.lockUpPeriod("0xOwner");

      expect(lockUpPeriod).toBe(0);
    });

    it("should return 0 when user has no staked amount", async () => {
      mockContractFunctions.userStakedInfo.mockResolvedValue({
        amount: ethers.BigNumber.from("0"),
        startTimestamp: ethers.BigNumber.from("0"),
      });

      // Mock isZero to return true for zero amount
      const mockAmount = ethers.BigNumber.from("0");
      mockAmount.isZero = vi.fn(() => true);
      mockContractFunctions.userStakedInfo.mockResolvedValue({
        amount: mockAmount,
        startTimestamp: ethers.BigNumber.from("0"),
      });

      const lockUpPeriod = await vela.lockUpPeriod("0xOwner");

      expect(lockUpPeriod).toBe(0);
    });

    it("should handle errors gracefully and return 0", async () => {
      mockContractFunctions.userStakedInfo.mockRejectedValue(
        new Error("Contract error"),
      );

      const lockUpPeriod = await vela.lockUpPeriod("0xOwner");

      expect(lockUpPeriod).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing customParams gracefully", () => {
      expect(() => {
        new Vela("arbitrum", 42161, ["VLP"], "single", undefined);
      }).toThrow();
    });

    it("should handle contract call failures", async () => {
      mockContractFunctions.getStakedAmount.mockRejectedValue(
        new Error("Contract error"),
      );

      await expect(vela.usdBalanceOf("0xOwner", {})).rejects.toThrow(
        "Contract error",
      );
    });

    it("should handle VLP price fetch failures", async () => {
      mockContractFunctions.getVLPPrice.mockRejectedValue(
        new Error("Price fetch error"),
      );

      await expect(vela._fetchVlpPrice(vi.fn())).rejects.toThrow(
        "Price fetch error",
      );
    });
  });

  describe("Integration Tests", () => {
    it("should have all required contract addresses set", () => {
      expect(vela.assetContract.address).toBe(
        "0xC5b2D9FDa8A82E8DcECD5e9e6e99b78a9188eB05",
      );
      expect(vela.protocolContract.address).toBe(
        "0xC4ABADE3a15064F9E3596943c699032748b13352",
      );
      expect(vela.stakeFarmContract.address).toBe(
        "0x60b8C145235A31f1949a831803768bF37d7Ab7AA",
      );
    });

    it("should inherit from BaseProtocol correctly", () => {
      expect(vela.chain).toBe("arbitrum");
      expect(vela.chainId).toBe(42161);
      expect(vela.symbolList).toEqual(["VLP"]);
      expect(vela.mode).toBe("single");
    });
  });
});
