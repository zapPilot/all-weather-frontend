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

  // A wallet without EIP-5792 rejects before broadcasting, so the per-group
  // retry cannot duplicate anything
  it("treats a wallet that cannot batch as safe to fall back", () => {
    [
      new Error("wallet MetaMask does not support EIP-5792"),
      new Error("errored calling wallet_sendCalls: not supported"),
      new Error("The method does not exist / is not available (-32601)"),
      new Error("atomicity not supported (5740)"),
    ].forEach((error) =>
      expect(classifyEmergencyExitBatchError(error)).toBe(
        EMERGENCY_EXIT_FAILURE_KIND.SAFE_TO_FALLBACK,
      ),
    );
    // a wallet_sendCalls failure with no capability wording may have broadcast
    expect(
      classifyEmergencyExitBatchError(
        new Error("wallet_sendCalls something else"),
      ),
    ).toBe(EMERGENCY_EXIT_FAILURE_KIND.UNKNOWN);
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

  it("asks an EOA for one atomic signature covering every group", async () => {
    const sendCalls = vi.fn((_payload, callbacks) =>
      callbacks.onSuccess({ receipts: [{ transactionHash: "0xeoa" }] }),
    );
    const { sendBatchTransaction, statuses, result } = await run({
      aaOn: false,
      sendCalls,
    });

    expect(sendBatchTransaction).not.toHaveBeenCalled();
    expect(sendCalls).toHaveBeenCalledTimes(1);
    expect(sendCalls.mock.calls[0][0]).toEqual({
      calls: ["claim-a", "transfer-a", "rewards", "native"],
      atomicRequired: true,
    });
    expect(result).toEqual({ status: "success", transactionHash: "0xeoa" });
    Object.values(statuses).forEach((status) =>
      expect(status).toMatchObject({
        status: "success",
        transactionHash: "0xeoa",
      }),
    );
  });

  it("falls back to isolated non-atomic EOA groups when the wallet cannot batch", async () => {
    let attempt = 0;
    const sendCalls = vi.fn((_payload, callbacks) => {
      attempt += 1;
      if (attempt === 1) {
        callbacks.onError(new Error("wallet does not support EIP-5792"));
      } else {
        callbacks.onSuccess({
          receipts: [{ transactionHash: `0x${attempt}` }],
        });
      }
    });
    const { statuses, onFallback } = await run({ aaOn: false, sendCalls });

    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(sendCalls).toHaveBeenCalledTimes(1 + groups.length);
    sendCalls.mock.calls
      .slice(1)
      .forEach(([payload]) => expect(payload.atomicRequired).toBe(false));
    Object.values(statuses).forEach((status) =>
      expect(status.status).toBe("success"),
    );
  });

  // thirdweb resolves an atomic bundle that reverted wholesale instead of
  // rejecting, so an unguarded success path would paint every failed exit green
  it("treats a resolved atomic failure as a failure, not a success", async () => {
    let attempt = 0;
    const sendCalls = vi.fn((_payload, callbacks) => {
      attempt += 1;
      if (attempt === 1) {
        callbacks.onSuccess({ status: "failure" });
      } else {
        callbacks.onError(new Error("still broken"));
      }
    });
    const onGroupError = vi.fn(async () => "still broken");
    const { statuses, onFallback } = await run({
      aaOn: false,
      sendCalls,
      onGroupError,
    });

    expect(onFallback).toHaveBeenCalledTimes(1);
    Object.values(statuses).forEach((status) =>
      expect(status.status).toBe("failed"),
    );
  });

  it("does not fall back after an EOA rejection or an unknown result", async () => {
    for (const [error, expected] of [
      [{ code: 4001 }, "cancelled"],
      [new Error("Bundle not confirmed after 100 blocks"), "unknown"],
    ]) {
      const sendCalls = vi.fn((_payload, callbacks) =>
        callbacks.onError(error),
      );
      const { statuses, onFallback } = await run({ aaOn: false, sendCalls });

      expect(sendCalls).toHaveBeenCalledTimes(1);
      expect(onFallback).not.toHaveBeenCalled();
      Object.values(statuses).forEach((status) =>
        expect(status.status).toBe(expected),
      );
    }
  });

  // A lone group is already one signature; a combined attempt could only add a
  // second one when the wallet turns out not to support batching
  it("skips the combined attempt for a single EOA group", async () => {
    const sendCalls = vi.fn((_payload, callbacks) =>
      callbacks.onSuccess({ receipts: [{ transactionHash: "0xsolo" }] }),
    );
    const { statuses } = await run({
      aaOn: false,
      sendCalls,
      groups: [groups[0]],
    });

    expect(sendCalls).toHaveBeenCalledTimes(1);
    expect(sendCalls.mock.calls[0][0].atomicRequired).toBe(false);
    expect(statuses["protocol-a"]).toMatchObject({
      status: "success",
      transactionHash: "0xsolo",
    });
  });
});
