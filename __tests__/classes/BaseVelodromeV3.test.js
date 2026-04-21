import { describe, expect, it, vi } from "vitest";
import { ethers } from "ethers";
import BaseProtocol from "../../classes/BaseProtocol.js";
import { BaseVelodromeV3 } from "../../classes/Velodrome/BaseVelodromeV3.js";

vi.mock("../../utils/general.js", () => ({
  approve: vi.fn(() => ({ type: "approve_txn" })),
  CHAIN_ID_TO_CHAIN: {
    8453: { id: 8453, name: "base" },
  },
  CHAIN_TO_CHAIN_ID: {
    base: 8453,
  },
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000",
  PROVIDER: vi.fn(() => ({
    rpcUrl: "https://base.rpc.com",
    connection: { url: "https://base.rpc.com" },
  })),
}));

vi.mock("../../utils/thirdweb.js", () => ({
  default: { clientId: "test-client" },
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

describe("BaseVelodromeV3", () => {
  describe("pendingRewards()", () => {
    it("returns only LP fee rewards without market-maker or vesting reward calls", async () => {
      const protocol = Object.create(BaseVelodromeV3.prototype);
      const lpFeesRewards = {
        "0xToken0": {
          symbol: "weth",
          balance: ethers.BigNumber.from("100"),
          usdDenominatedValue: 200,
          decimals: 18,
        },
        "0xToken1": {
          symbol: "mseth",
          balance: ethers.BigNumber.from("50"),
          usdDenominatedValue: 100,
          decimals: 18,
          vesting: false,
        },
      };

      protocol.chain = "base";
      protocol.token_id = undefined;
      protocol._getNftID = vi.fn().mockResolvedValue(123);
      protocol._checkIfNFTExists = vi.fn().mockResolvedValue(true);
      protocol._getLPFeesRewards = vi.fn().mockResolvedValue(lpFeesRewards);
      protocol._getMarketMakerRewards = vi.fn(() => {
        throw new Error("market-maker rewards should not be fetched");
      });
      protocol._checkIfVestingRewardsFinished = vi.fn(() => {
        throw new Error("vesting rewards should not be checked");
      });

      const result = await protocol.pendingRewards(
        "0xOwner",
        { weth: 2, mseth: 2 },
        vi.fn(),
      );

      expect(protocol._getNftID).toHaveBeenCalledWith("0xOwner");
      expect(protocol._checkIfNFTExists).toHaveBeenCalledWith(123);
      expect(protocol._getLPFeesRewards).toHaveBeenCalledWith({
        weth: 2,
        mseth: 2,
      });
      expect(protocol._getMarketMakerRewards).not.toHaveBeenCalled();
      expect(protocol._checkIfVestingRewardsFinished).not.toHaveBeenCalled();
      expect(result).toEqual({
        "0xToken0": {
          ...lpFeesRewards["0xToken0"],
          chain: "base",
        },
        "0xToken1": {
          ...lpFeesRewards["0xToken1"],
          chain: "base",
        },
      });
    });
  });

  describe("customRedeemVestingRewards()", () => {
    it("uses the BaseProtocol no-op implementation", async () => {
      const protocol = Object.create(BaseVelodromeV3.prototype);

      expect(
        Object.prototype.hasOwnProperty.call(
          BaseVelodromeV3.prototype,
          "customRedeemVestingRewards",
        ),
      ).toBe(false);
      expect(protocol.customRedeemVestingRewards).toBe(
        BaseProtocol.prototype.customRedeemVestingRewards,
      );
      await expect(
        protocol.customRedeemVestingRewards({}, "0xOwner"),
      ).resolves.toEqual([]);
    });
  });
});
