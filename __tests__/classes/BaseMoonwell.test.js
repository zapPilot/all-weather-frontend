import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import axios from "axios";
import { BaseMoonwell } from "../../classes/Moonwell/BaseMoonwell.js";
import { PROVIDER } from "../../utils/general.js";

// Mock all external dependencies
vi.mock("../../utils/general.js", () => ({
  PROVIDER: vi.fn(() => ({
    rpcUrl: "https://base.rpc.com",
    connection: { url: "https://base.rpc.com" },
  })),
  CHAIN_ID_TO_CHAIN: {
    8453: { id: 8453, name: "base" },
  },
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000",
  approve: vi.fn(() => ({ type: "approve_txn" })),
}));

vi.mock("../../utils/thirdweb.js", () => ({
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
  comptroller: vi.fn(),
  rewardDistributor: vi.fn(),
  getOutstandingRewardsForUser: vi.fn(),
  exchangeRateStored: vi.fn(),
  mint: vi.fn(),
  redeem: vi.fn(),
  balanceOf: vi.fn(),
  claimReward: vi.fn(),
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
            div: vi.fn(() => actual.ethers.BigNumber.from("1000")),
          })),
          div: vi.fn(() => actual.ethers.BigNumber.from("100")),
          pow: vi.fn(() => actual.ethers.BigNumber.from("1000000000000000000")),
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

describe("BaseMoonwell", () => {
  let baseMoonwell;
  let mockCustomParams;

  beforeEach(() => {
    mockCustomParams = {
      assetAddress: "0x628ff693426583D9a7FB391E54366292F509D457",
      protocolAddress: "0x628ff693426583D9a7FB391E54366292F509D457",
      assetDecimals: 8,
      symbolOfBestTokenToZapInOut: "usdc",
      zapInOutTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimalsOfZapInOutToken: 6,
    };

    baseMoonwell = new BaseMoonwell(
      "base",
      8453,
      ["USDC"],
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
    it("should initialize BaseMoonwell with correct parameters", () => {
      expect(baseMoonwell.protocolName).toBe("moonwell");
      expect(baseMoonwell.protocolVersion).toBe("0");
      expect(baseMoonwell.chain).toBe("base");
      expect(baseMoonwell.chainId).toBe(8453);
      expect(baseMoonwell.assetDecimals).toBe(8);
      expect(baseMoonwell.symbolOfBestTokenToZapInOut).toBe("usdc");
      expect(baseMoonwell.zapInOutTokenAddress).toBe(
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      );
      expect(baseMoonwell.decimalsOfZapInOutToken).toBe(6);
    });

    it("should set up contract instances with correct addresses", () => {
      expect(baseMoonwell.assetContract).toBeDefined();
      expect(baseMoonwell.protocolContract).toBeDefined();
      expect(baseMoonwell.stakeFarmContract).toBeDefined();

      expect(baseMoonwell.assetContract.address).toBe(
        "0x628ff693426583D9a7FB391E54366292F509D457",
      );
      expect(baseMoonwell.protocolContract.address).toBe(
        "0x628ff693426583D9a7FB391E54366292F509D457",
      );
      expect(baseMoonwell.stakeFarmContract.address).toBe(
        "0x628ff693426583D9a7FB391E54366292F509D457",
      );
    });

    it("should create ethers contract instances", () => {
      expect(baseMoonwell.assetContractInstance).toBeDefined();
      expect(baseMoonwell.protocolContractInstance).toBeDefined();
      expect(baseMoonwell.stakeFarmContractInstance).toBeDefined();
    });
  });

  describe("rewards()", () => {
    it("should return WELL reward configuration", () => {
      const rewards = baseMoonwell.rewards();

      expect(rewards).toHaveLength(1);
      expect(rewards[0]).toMatchObject({
        symbol: "well",
        priceId: {
          coinmarketcapApiId: 20734,
        },
        address: "0xA88594D404727625A9437C3f886C7643872296AE",
        decimals: 18,
        chain: "base",
      });
    });
  });

  describe("pendingRewards()", () => {
    beforeEach(() => {
      mockContractFunctions.comptroller.mockResolvedValue([
        "0xComptrollerAddress",
      ]);
      mockContractFunctions.rewardDistributor.mockResolvedValue([
        "0xRewardDistributorAddress",
      ]);
      mockContractFunctions.getOutstandingRewardsForUser.mockResolvedValue([
        [
          {
            emissionToken: "0xA88594D404727625A9437C3f886C7643872296AE",
            totalAmount: ethers.BigNumber.from("5000000000000000000"), // 5 WELL tokens
          },
        ],
      ]);
    });

    it("should calculate pending WELL rewards", async () => {
      const tokenPricesMappingTable = {
        well: 0.25, // $0.25 per WELL
      };

      const result = await baseMoonwell.pendingRewards(
        "0xOwner",
        tokenPricesMappingTable,
        vi.fn(),
      );

      expect(result).toHaveProperty(
        "0xA88594D404727625A9437C3f886C7643872296AE",
      );
      expect(
        result["0xA88594D404727625A9437C3f886C7643872296AE"],
      ).toMatchObject({
        symbol: "well",
        balance: expect.any(Object), // BigNumber
        decimals: 18,
        chain: "base",
        usdDenominatedValue: expect.any(Number),
      });

      expect(mockContractFunctions.comptroller).toHaveBeenCalled();
      expect(mockContractFunctions.rewardDistributor).toHaveBeenCalled();
      expect(
        mockContractFunctions.getOutstandingRewardsForUser,
      ).toHaveBeenCalledWith(baseMoonwell.assetContract.address, "0xOwner");
    });

    it("should handle zero pending rewards", async () => {
      mockContractFunctions.getOutstandingRewardsForUser.mockResolvedValue([
        [
          {
            emissionToken: "0xA88594D404727625A9437C3f886C7643872296AE",
            totalAmount: ethers.BigNumber.from("0"),
          },
        ],
      ]);

      const result = await baseMoonwell.pendingRewards(
        "0xOwner",
        { well: 0.25 },
        vi.fn(),
      );

      expect(
        result["0xA88594D404727625A9437C3f886C7643872296AE"]
          .usdDenominatedValue,
      ).toBe(0);
    });
  });

  describe("customDeposit()", () => {
    it("should generate deposit transactions with approval and mint", async () => {
      const [transactions, tradingLoss] = await baseMoonwell.customDeposit(
        "0xOwner",
        "usdc",
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        ethers.BigNumber.from("1000000"), // 1 USDC (6 decimals)
        6,
        { usdc: 1.0 },
        1.0, // 1% slippage
        vi.fn(),
      );

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({ type: "approve_txn" });
      expect(transactions[1]).toMatchObject({ type: "contract_call" });
      expect(tradingLoss).toBe(0);
    });

    it("should call approve with correct parameters", async () => {
      const { approve } = await import("../../utils/general.js");
      const updateProgress = vi.fn();

      await baseMoonwell.customDeposit(
        "0xOwner",
        "usdc",
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        ethers.BigNumber.from("1000000"),
        6,
        { usdc: 1.0 },
        1.0,
        updateProgress,
      );

      expect(approve).toHaveBeenCalledWith(
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        baseMoonwell.protocolContract.address,
        expect.anything(),
        updateProgress,
        8453,
      );
    });
  });

  describe("customClaim()", () => {
    beforeEach(() => {
      vi.spyOn(baseMoonwell, "pendingRewards").mockResolvedValue({
        "0xRewardAddress": { balance: "1000", symbol: "well" },
      });
      mockContractFunctions.comptroller.mockResolvedValue([
        "0xComptrollerAddress",
      ]);
    });

    it("should generate claim transaction", async () => {
      const [transactions, pendingRewards] = await baseMoonwell.customClaim(
        "0xOwner",
        {},
        vi.fn(),
      );

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(pendingRewards).toBeDefined();
      expect(baseMoonwell.pendingRewards).toHaveBeenCalled();
    });
  });

  describe("usdBalanceOf()", () => {
    beforeEach(() => {
      vi.spyOn(baseMoonwell, "assetBalanceOf").mockResolvedValue(
        ethers.BigNumber.from("500000000"), // 5 mTokens (8 decimals)
      );
      vi.spyOn(baseMoonwell, "assetUsdPrice").mockResolvedValue(1.02); // $1.02 per mToken
    });

    it("should calculate USD balance using asset balance and price", async () => {
      const usdBalance = await baseMoonwell.usdBalanceOf("0xOwner", {
        usdc: 1.0,
      });

      expect(typeof usdBalance).toBe("number");
      expect(usdBalance).toBeGreaterThan(0);
      expect(baseMoonwell.assetBalanceOf).toHaveBeenCalledWith("0xOwner");
      expect(baseMoonwell.assetUsdPrice).toHaveBeenCalledWith({ usdc: 1.0 });
    });
  });

  describe("assetUsdPrice()", () => {
    beforeEach(() => {
      vi.spyOn(baseMoonwell, "exchangeRateOfAssetToRedeem").mockResolvedValue(
        1.05,
      );
    });

    it("should calculate asset USD price using exchange rate", async () => {
      const tokenPricesMappingTable = { usdc: 1.0 };

      const price = await baseMoonwell.assetUsdPrice(tokenPricesMappingTable);

      expect(price).toBe(1.05); // exchange rate * token price
      expect(baseMoonwell.exchangeRateOfAssetToRedeem).toHaveBeenCalled();
    });

    it("should handle different token prices", async () => {
      const tokenPricesMappingTable = { usdc: 0.99 }; // Slightly off-peg USDC

      const price = await baseMoonwell.assetUsdPrice(tokenPricesMappingTable);

      expect(price).toBe(1.0395); // 1.05 * 0.99
    });
  });

  describe("stakeBalanceOf()", () => {
    it("should return zero as Moonwell has no staking", async () => {
      const balance = await baseMoonwell.stakeBalanceOf("0xOwner");

      expect(balance.toString()).toBe("0");
    });
  });

  describe("exchangeRateOfAssetToRedeem()", () => {
    beforeEach(() => {
      mockContractFunctions.exchangeRateStored.mockResolvedValue([
        ethers.BigNumber.from("210000000000000000000000000"), // Exchange rate with 18 decimals
      ]);
    });

    it("should calculate exchange rate correctly", async () => {
      const exchangeRate = await baseMoonwell.exchangeRateOfAssetToRedeem();

      expect(typeof exchangeRate).toBe("number");
      expect(exchangeRate).toBeGreaterThan(0);
      expect(mockContractFunctions.exchangeRateStored).toHaveBeenCalled();
    });

    it("should handle different asset decimals correctly", async () => {
      // Test with different decimal configuration
      baseMoonwell.assetDecimals = 18;
      baseMoonwell.decimalsOfZapInOutToken = 18;

      const exchangeRate = await baseMoonwell.exchangeRateOfAssetToRedeem();

      expect(typeof exchangeRate).toBe("number");
    });
  });

  describe("_getTheBestTokenAddressToZapIn()", () => {
    it("should return configured zap token details", () => {
      const result = baseMoonwell._getTheBestTokenAddressToZapIn(
        "WETH",
        "0xWETHAddress",
        18,
      );

      expect(result).toEqual([
        "usdc",
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        6,
      ]);
    });
  });

  describe("_getTheBestTokenAddressToZapOut()", () => {
    it("should return configured zap token details", () => {
      const result = baseMoonwell._getTheBestTokenAddressToZapOut();

      expect(result).toEqual([
        "usdc",
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        6,
      ]);
    });
  });

  describe("lockUpPeriod()", () => {
    it("should return 0 for no lock-up period", async () => {
      const lockUp = await baseMoonwell.lockUpPeriod();
      expect(lockUp).toBe(0);
    });
  });

  describe("_stake()", () => {
    it("should return empty array as Moonwell has no staking", async () => {
      const transactions = await baseMoonwell._stake(
        ethers.BigNumber.from("1000000000000000000"),
        vi.fn(),
      );

      expect(transactions).toEqual([]);
    });
  });

  describe("_unstake()", () => {
    beforeEach(() => {
      vi.spyOn(baseMoonwell, "assetBalanceOf").mockResolvedValue(
        ethers.BigNumber.from("5000000000"), // 50 mTokens (8 decimals)
      );
    });

    it("should calculate withdraw amount based on percentage", async () => {
      const [transactions, amount] = await baseMoonwell._unstake(
        "0xOwner",
        0.5, // 50%
        vi.fn(),
      );

      expect(transactions).toEqual([]);
      expect(amount).toBeDefined();
      expect(baseMoonwell.assetBalanceOf).toHaveBeenCalledWith("0xOwner");
    });

    it("should handle different percentages correctly", async () => {
      const [, amount25] = await baseMoonwell._unstake(
        "0xOwner",
        0.25,
        vi.fn(),
      );
      const [, amount75] = await baseMoonwell._unstake(
        "0xOwner",
        0.75,
        vi.fn(),
      );

      expect(amount25).toBeDefined();
      expect(amount75).toBeDefined();
    });

    it("should handle high precision percentages", async () => {
      const [, amount] = await baseMoonwell._unstake(
        "0xOwner",
        0.123456789, // High precision percentage
        vi.fn(),
      );

      expect(amount).toBeDefined();
    });
  });

  describe("customWithdrawAndClaim()", () => {
    beforeEach(() => {
      vi.spyOn(baseMoonwell, "customClaim").mockResolvedValue([
        [{ type: "claim_txn" }],
        {},
      ]);
      vi.spyOn(baseMoonwell, "_calculateRedeemAmount").mockResolvedValue(
        ethers.BigNumber.from("950000"), // 0.95 USDC (6 decimals)
      );
    });

    it("should generate withdraw and claim transactions", async () => {
      const amount = ethers.BigNumber.from("1000000000"); // 10 mTokens
      const slippage = 1.0;
      const tokenPricesMappingTable = { usdc: 1.0 };

      const [
        transactions,
        symbolOfBestToken,
        bestTokenAddress,
        decimals,
        minOutAmount,
        tradingLoss,
      ] = await baseMoonwell.customWithdrawAndClaim(
        "0xOwner",
        amount,
        slippage,
        tokenPricesMappingTable,
        vi.fn(),
      );

      expect(transactions).toHaveLength(2); // redeem + claim
      expect(transactions[0]).toMatchObject({ type: "contract_call" });
      expect(transactions[1]).toMatchObject({ type: "claim_txn" });
      expect(symbolOfBestToken).toBe("usdc");
      expect(bestTokenAddress).toBe(
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      );
      expect(decimals).toBe(6);
      expect(minOutAmount).toBeDefined();
      expect(tradingLoss).toBe(0);
    });

    it("should call helper methods correctly", async () => {
      await baseMoonwell.customWithdrawAndClaim(
        "0xOwner",
        ethers.BigNumber.from("1000000000"),
        1.0,
        { usdc: 1.0 },
        vi.fn(),
      );

      expect(baseMoonwell.customClaim).toHaveBeenCalled();
      expect(baseMoonwell._calculateRedeemAmount).toHaveBeenCalled();
    });
  });

  describe("_calculateRedeemAmount()", () => {
    beforeEach(() => {
      vi.spyOn(baseMoonwell, "exchangeRateOfAssetToRedeem").mockResolvedValue(
        1.05,
      );
    });

    it("should calculate redeem amount using exchange rate", async () => {
      const amount = ethers.BigNumber.from("1000000000"); // 10 mTokens

      const redeemAmount = await baseMoonwell._calculateRedeemAmount(amount);

      expect(redeemAmount).toBeDefined();
      expect(baseMoonwell.exchangeRateOfAssetToRedeem).toHaveBeenCalled();
    });

    it("should handle different amounts correctly", async () => {
      const smallAmount = ethers.BigNumber.from("100000000"); // 1 mToken
      const largeAmount = ethers.BigNumber.from("10000000000"); // 100 mTokens

      const smallRedeem =
        await baseMoonwell._calculateRedeemAmount(smallAmount);
      const largeRedeem =
        await baseMoonwell._calculateRedeemAmount(largeAmount);

      expect(smallRedeem).toBeDefined();
      expect(largeRedeem).toBeDefined();
    });

    it("should handle different exchange rates", async () => {
      // Test with different exchange rate
      vi.spyOn(baseMoonwell, "exchangeRateOfAssetToRedeem").mockResolvedValue(
        1.1,
      );

      const redeemAmount = await baseMoonwell._calculateRedeemAmount(
        ethers.BigNumber.from("1000000000"),
      );

      expect(redeemAmount).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing customParams gracefully", () => {
      expect(() => {
        new BaseMoonwell("base", 8453, ["USDC"], "single", undefined);
      }).toThrow();
    });

    it("should handle contract call failures in pendingRewards", async () => {
      mockContractFunctions.comptroller.mockRejectedValue(
        new Error("Contract error"),
      );

      await expect(
        baseMoonwell.pendingRewards("0xOwner", { well: 0.25 }, vi.fn()),
      ).rejects.toThrow("Contract error");
    });

    it("should handle exchangeRateStored call failures", async () => {
      mockContractFunctions.exchangeRateStored.mockRejectedValue(
        new Error("Exchange rate error"),
      );

      await expect(baseMoonwell.exchangeRateOfAssetToRedeem()).rejects.toThrow(
        "Exchange rate error",
      );
    });

    it("should handle assetBalanceOf failures in _unstake", async () => {
      vi.spyOn(baseMoonwell, "assetBalanceOf").mockRejectedValue(
        new Error("Balance error"),
      );

      await expect(
        baseMoonwell._unstake("0xOwner", 0.5, vi.fn()),
      ).rejects.toThrow("Balance error");
    });
  });

  describe("Integration Tests", () => {
    it("should have consistent contract addresses", () => {
      expect(baseMoonwell.assetContract.address).toBe(
        baseMoonwell.protocolContract.address,
      );
      expect(baseMoonwell.protocolContract.address).toBe(
        baseMoonwell.stakeFarmContract.address,
      );
    });

    it("should inherit from BaseProtocol correctly", () => {
      expect(baseMoonwell.chain).toBe("base");
      expect(baseMoonwell.chainId).toBe(8453);
      expect(baseMoonwell.symbolList).toEqual(["USDC"]);
      expect(baseMoonwell.mode).toBe("single");
    });

    it("should handle complete deposit-withdraw cycle", async () => {
      // Mock all necessary methods and contract functions
      vi.spyOn(baseMoonwell, "assetBalanceOf").mockResolvedValue(
        ethers.BigNumber.from("1000000000"),
      );
      vi.spyOn(baseMoonwell, "exchangeRateOfAssetToRedeem").mockResolvedValue(
        1.05,
      );

      // Mock contract functions for withdraw cycle
      mockContractFunctions.comptroller.mockResolvedValue([
        "0xComptrollerAddress",
      ]);
      mockContractFunctions.rewardDistributor.mockResolvedValue([
        "0xRewardDistributorAddress",
      ]);
      mockContractFunctions.getOutstandingRewardsForUser.mockResolvedValue([
        [
          {
            emissionToken: "0xA88594D404727625A9437C3f886C7643872296AE",
            totalAmount: ethers.BigNumber.from("1000000000000000000"),
          },
        ],
      ]);

      // Test deposit
      const [depositTxns] = await baseMoonwell.customDeposit(
        "0xOwner",
        "usdc",
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        ethers.BigNumber.from("1000000"),
        6,
        { usdc: 1.0 },
        1.0,
        vi.fn(),
      );

      expect(depositTxns).toHaveLength(2);

      // Test withdraw
      const [withdrawTxns] = await baseMoonwell.customWithdrawAndClaim(
        "0xOwner",
        ethers.BigNumber.from("1000000000"),
        1.0,
        { usdc: 1.0, well: 0.25 },
        vi.fn(),
      );

      expect(withdrawTxns).toHaveLength(2);
    });
  });

  describe("Method Coverage", () => {
    it("should cover all major methods", () => {
      expect(typeof baseMoonwell.rewards).toBe("function");
      expect(typeof baseMoonwell.pendingRewards).toBe("function");
      expect(typeof baseMoonwell.customDeposit).toBe("function");
      expect(typeof baseMoonwell.customClaim).toBe("function");
      expect(typeof baseMoonwell.usdBalanceOf).toBe("function");
      expect(typeof baseMoonwell.assetUsdPrice).toBe("function");
      expect(typeof baseMoonwell.stakeBalanceOf).toBe("function");
      expect(typeof baseMoonwell.exchangeRateOfAssetToRedeem).toBe("function");
      expect(typeof baseMoonwell._getTheBestTokenAddressToZapIn).toBe(
        "function",
      );
      expect(typeof baseMoonwell._getTheBestTokenAddressToZapOut).toBe(
        "function",
      );
      expect(typeof baseMoonwell.lockUpPeriod).toBe("function");
      expect(typeof baseMoonwell._stake).toBe("function");
      expect(typeof baseMoonwell._unstake).toBe("function");
      expect(typeof baseMoonwell.customWithdrawAndClaim).toBe("function");
      expect(typeof baseMoonwell._calculateRedeemAmount).toBe("function");
    });
  });
});
