import { describe, expect, it, vi } from "vitest";
import {
  buildEoaFullExitPlan,
  getEoaFullExitTokenDeltas,
} from "../../utils/eoaFullExit";

const OWNER = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const protocol = (uniqueId, result) => ({
  uniqueId,
  label: uniqueId,
  interface: {
    rewards: () => [],
    fullExitUnwind:
      result instanceof Error
        ? vi.fn().mockRejectedValue(result)
        : vi.fn().mockResolvedValue(result),
  },
});

describe("EOA full exit token deltas", () => {
  it("only returns the token amount created by the position unwind", () => {
    const before = [
      {
        id: USDC,
        address: USDC,
        symbol: "usdc",
        optimized_symbol: "usdc",
        decimals: 6,
        amount: 10,
        price: 1,
        raw_amount_hex_str: "0x989680",
      },
    ];
    const after = [
      {
        ...before[0],
        amount: 13.5,
        raw_amount_hex_str: "0xcdfe60",
      },
    ];

    const deltas = getEoaFullExitTokenDeltas({
      beforeTokens: before,
      afterTokens: after,
      expectedTokens: [before[0]],
    });

    expect(deltas).toHaveLength(1);
    expect(deltas[0].amount).toBe(3.5);
    expect(deltas[0].raw_amount_hex_str).toBe("0x3567e0");
  });

  it("does not include unrelated loose wallet tokens", () => {
    const unrelated = "0x4200000000000000000000000000000000000006";
    const deltas = getEoaFullExitTokenDeltas({
      beforeTokens: [],
      afterTokens: [
        {
          id: USDC,
          address: USDC,
          symbol: "usdc",
          optimized_symbol: "usdc",
          decimals: 6,
          amount: 2,
          price: 1,
          raw_amount_hex_str: "0x1e8480",
        },
        {
          id: unrelated,
          address: unrelated,
          symbol: "weth",
          optimized_symbol: "weth",
          decimals: 18,
          amount: 1,
          price: 3000,
          raw_amount_hex_str: "0xde0b6b3a7640000",
        },
      ],
      expectedTokens: [
        {
          id: USDC,
          address: USDC,
          symbol: "usdc",
          decimals: 6,
        },
      ],
    });

    expect(deltas).toHaveLength(1);
    expect(deltas[0].address.toLowerCase()).toBe(USDC.toLowerCase());
  });
});

describe("EOA full exit planning", () => {
  it("keeps healthy unwind groups when another protocol cannot be prepared", async () => {
    const healthy = protocol("op/velodrome/usdc-msusd", {
      txns: ["unstake", "remove-liquidity"],
      expectedTokens: [
        {
          id: USDC,
          address: USDC,
          symbol: "usdc",
          optimized_symbol: "usdc",
          decimals: 6,
        },
      ],
    });
    const failed = protocol(
      "op/broken/position",
      new Error("position read failed"),
    );
    const onProgress = vi.fn();

    const plan = await buildEoaFullExitPlan({
      chainName: "op",
      owner: OWNER,
      slippage: 1,
      ethPrice: 3000,
      protocols: [healthy, failed],
      onProgress,
    });

    expect(plan.groups).toEqual([
      {
        uniqueId: healthy.uniqueId,
        label: healthy.label,
        txns: ["unstake", "remove-liquidity"],
      },
    ]);
    expect(plan.failures).toEqual([
      expect.objectContaining({
        uniqueId: failed.uniqueId,
        error: "position read failed",
      }),
    ]);
    expect(plan.expectedTokens).toHaveLength(1);
    expect(plan.expectedTokens[0].id.toLowerCase()).toBe(USDC.toLowerCase());
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ completed: 2, total: 2, failed: true }),
    );
  });

  it("dedupes expected output tokens by address", async () => {
    const first = protocol("base/aave/usdc", {
      txns: ["withdraw-aave"],
      expectedTokens: [
        {
          id: USDC,
          address: USDC,
          symbol: "usdc",
          optimized_symbol: "usdc",
          decimals: 6,
        },
      ],
    });
    const second = protocol("base/moonwell/usdc", {
      txns: ["redeem-moonwell"],
      expectedTokens: [
        {
          id: USDC.toLowerCase(),
          address: USDC.toLowerCase(),
          symbol: "USDC",
          decimals: 6,
        },
      ],
    });

    const plan = await buildEoaFullExitPlan({
      chainName: "base",
      owner: OWNER,
      slippage: 1,
      ethPrice: 3000,
      protocols: [first, second],
    });

    expect(plan.groups).toHaveLength(2);
    expect(plan.expectedTokens).toHaveLength(1);
    expect(plan.expectedTokens[0].optimized_symbol).toBe("usdc");
  });
});
