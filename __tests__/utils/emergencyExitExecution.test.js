import { describe, expect, it, vi } from "vitest";
import {
  classifyEmergencyExitBatchError,
  EMERGENCY_EXIT_FAILURE_KIND,
  executeEmergencyExitGroups,
} from "../../utils/emergencyExitExecution";

const groups = [
  { uniqueId: "protocol-a", txns: ["claim-a", "transfer-a"] },
  { uniqueId: "claimed-rewards", txns: ["rewards"] },
  { uniqueId: "native", txns: ["native"] },
];

const run = async (overrides = {}) => {
  const statuses = {};
  const updateGroup = vi.fn((id, patch) => {
    statuses[id] = { ...statuses[id], ...patch };
  });
  const options = {
    groups,
    aaOn: true,
    sendBatchTransaction: vi.fn((_calls, callbacks) =>
      callbacks.onSuccess({ transactionHash: "0xcombined" }),
    ),
    sendCalls: vi.fn(),
    updateGroup,
    onFallback: vi.fn(),
    onGroupError: vi.fn(),
    ...overrides,
  };

  const result = await executeEmergencyExitGroups(options);
  return { ...options, result, statuses };
};

describe("classifyEmergencyExitBatchError", () => {
  it("distinguishes rejected, safe, and indeterminate failures", () => {
    expect(classifyEmergencyExitBatchError({ code: 4001 })).toBe(
      EMERGENCY_EXIT_FAILURE_KIND.USER_REJECTED,
    );
    expect(
      classifyEmergencyExitBatchError(
        new Error("UserOperation simulation reverted"),
      ),
    ).toBe(EMERGENCY_EXIT_FAILURE_KIND.SAFE_TO_FALLBACK);
    expect(
      classifyEmergencyExitBatchError(
        new Error("Timeout waiting for UserOp hash: 0x" + "a".repeat(64)),
      ),
    ).toBe(EMERGENCY_EXIT_FAILURE_KIND.UNKNOWN);
    expect(classifyEmergencyExitBatchError(new Error("unexpected error"))).toBe(
      EMERGENCY_EXIT_FAILURE_KIND.UNKNOWN,
    );
  });
});

describe("executeEmergencyExitGroups", () => {
  it("sends every AA group once in the existing order", async () => {
    const { sendBatchTransaction, statuses, result } = await run();

    expect(sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(sendBatchTransaction.mock.calls[0][0]).toEqual([
      "claim-a",
      "transfer-a",
      "rewards",
      "native",
    ]);
    expect(result).toEqual({
      status: "success",
      transactionHash: "0xcombined",
    });
    Object.values(statuses).forEach((status) =>
      expect(status).toMatchObject({
        status: "success",
        transactionHash: "0xcombined",
      }),
    );
  });

  it("falls back to isolated AA groups after a safe batch failure", async () => {
    let attempt = 0;
    const sendBatchTransaction = vi.fn((calls, callbacks) => {
      attempt += 1;
      if (attempt === 1) {
        callbacks.onError(new Error("simulation reverted"));
      } else if (calls.includes("rewards")) {
        callbacks.onError(new Error("reward transfer reverted"));
      } else {
        callbacks.onSuccess({ transactionHash: `0x${attempt}` });
      }
    });
    const onGroupError = vi.fn(async () => "reward failed");
    const { statuses, onFallback } = await run({
      sendBatchTransaction,
      onGroupError,
    });

    expect(sendBatchTransaction).toHaveBeenCalledTimes(4);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(statuses["protocol-a"].status).toBe("success");
    expect(statuses["claimed-rewards"]).toMatchObject({
      status: "failed",
      error: "reward failed",
    });
    expect(statuses.native.status).toBe("success");
  });

  it("does not fall back after rejection or an unknown result", async () => {
    for (const [error, expected] of [
      [{ code: 4001 }, "cancelled"],
      [new Error("network request failed"), "unknown"],
    ]) {
      const sendBatchTransaction = vi.fn((_calls, callbacks) =>
        callbacks.onError(error),
      );
      const { statuses, onFallback } = await run({ sendBatchTransaction });

      expect(sendBatchTransaction).toHaveBeenCalledTimes(1);
      expect(onFallback).not.toHaveBeenCalled();
      Object.values(statuses).forEach((status) =>
        expect(status.status).toBe(expected),
      );
    }
  });

  it("excludes build failures from the combined batch", async () => {
    const failedGroup = {
      uniqueId: "broken",
      txns: [],
      buildError: "could not build",
    };
    const { sendBatchTransaction, statuses } = await run({
      groups: [failedGroup, groups[0]],
    });

    expect(sendBatchTransaction.mock.calls[0][0]).toEqual([
      "claim-a",
      "transfer-a",
    ]);
    expect(statuses.broken).toMatchObject({
      status: "failed",
      error: "could not build",
    });
  });

  it("keeps EOA execution isolated and non-atomic", async () => {
    const sendCalls = vi.fn((_payload, callbacks) =>
      callbacks.onSuccess({ receipts: [{ transactionHash: "0xeoa" }] }),
    );
    const { sendBatchTransaction, statuses } = await run({
      aaOn: false,
      sendCalls,
    });

    expect(sendBatchTransaction).not.toHaveBeenCalled();
    expect(sendCalls).toHaveBeenCalledTimes(groups.length);
    sendCalls.mock.calls.forEach(([payload]) =>
      expect(payload.atomicRequired).toBe(false),
    );
    expect(statuses.native.transactionHash).toBe("0xeoa");
  });
});
