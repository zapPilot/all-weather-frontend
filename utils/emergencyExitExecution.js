const FAILURE_KIND = {
  USER_REJECTED: "user-rejected",
  SAFE_TO_FALLBACK: "safe-to-fallback",
  UNKNOWN: "unknown",
};

const collectErrorDetails = (error) => {
  const seen = new Set();
  const details = [];
  let current = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current.code !== undefined) details.push(String(current.code));
    if (current.message) details.push(current.message);
    if (current.shortMessage) details.push(current.shortMessage);
    if (current.details) details.push(current.details);
    current = current.cause || current.error;
  }

  return details.join(" ").toLowerCase();
};

export const classifyEmergencyExitBatchError = (error) => {
  const details = collectErrorDetails(error);

  if (
    details.includes("4001") ||
    details.includes("action_rejected") ||
    details.includes("user rejected") ||
    details.includes("user denied") ||
    details.includes("request rejected")
  ) {
    return FAILURE_KIND.USER_REJECTED;
  }

  // Once submission may have happened, retrying can duplicate an exit. Treat
  // transport failures and missing receipts conservatively, even when they may
  // eventually turn out to have failed before reaching the bundler.
  if (
    details.includes("timeout") ||
    details.includes("timed out") ||
    details.includes("network") ||
    details.includes("socket") ||
    details.includes("connection") ||
    details.includes("transport") ||
    details.includes("userop hash") ||
    details.includes("user operation hash")
  ) {
    return FAILURE_KIND.UNKNOWN;
  }

  if (
    details.includes("revert") ||
    details.includes("simulation") ||
    details.includes("estimate gas") ||
    details.includes("gas estimation") ||
    details.includes("bundler") ||
    details.includes("paymaster") ||
    details.includes("validation") ||
    details.includes("insufficient funds") ||
    /\baa\d{2}\b/.test(details)
  ) {
    return FAILURE_KIND.SAFE_TO_FALLBACK;
  }

  return FAILURE_KIND.UNKNOWN;
};

const submit = (send, payload) =>
  new Promise((resolve, reject) => {
    send(payload, { onSuccess: resolve, onError: reject });
  });

export const transactionHashFromResult = (data) =>
  data?.transactionHash || data?.receipts?.[0]?.transactionHash || "";

export async function executeEmergencyExitGroups({
  groups,
  aaOn,
  sendBatchTransaction,
  sendCalls,
  updateGroup,
  onFallback,
  onGroupError,
}) {
  const executableGroups = groups.filter((group) => !group.buildError);

  for (const group of groups) {
    if (group.buildError) {
      updateGroup(group.uniqueId, {
        status: "failed",
        error: group.buildError,
      });
    }
  }

  if (aaOn && executableGroups.length > 0) {
    executableGroups.forEach((group) =>
      updateGroup(group.uniqueId, { status: "sending", error: undefined }),
    );
    try {
      const calls = executableGroups.flatMap((group) =>
        group.txns.flat(Infinity),
      );
      const data = await submit(sendBatchTransaction, calls);
      const transactionHash = transactionHashFromResult(data);
      executableGroups.forEach((group) =>
        updateGroup(group.uniqueId, {
          status: "success",
          error: undefined,
          transactionHash,
        }),
      );
      return { status: "success", transactionHash };
    } catch (error) {
      const failureKind = classifyEmergencyExitBatchError(error);
      if (failureKind === FAILURE_KIND.USER_REJECTED) {
        executableGroups.forEach((group) =>
          updateGroup(group.uniqueId, {
            status: "cancelled",
            error: "Transaction cancelled.",
          }),
        );
        return { status: "cancelled", error };
      }
      if (failureKind === FAILURE_KIND.UNKNOWN) {
        executableGroups.forEach((group) =>
          updateGroup(group.uniqueId, {
            status: "unknown",
            error:
              "Batch status is unknown. Refresh balances and check your wallet before trying again.",
          }),
        );
        return { status: "unknown", error };
      }

      await onFallback?.(error);
      executableGroups.forEach((group) =>
        updateGroup(group.uniqueId, { status: "pending", error: undefined }),
      );
    }
  }

  for (const group of executableGroups) {
    updateGroup(group.uniqueId, { status: "sending", error: undefined });
    const calls = group.txns.flat(Infinity);
    try {
      const data = aaOn
        ? await submit(sendBatchTransaction, calls)
        : await submit(sendCalls, { calls, atomicRequired: false });
      updateGroup(group.uniqueId, {
        status: "success",
        error: undefined,
        transactionHash: transactionHashFromResult(data),
      });
    } catch (error) {
      const message = await onGroupError?.(error, group);
      updateGroup(group.uniqueId, {
        status: "failed",
        error: message || error?.message || "Transaction failed",
      });
    }
  }

  return { status: "completed-with-groups" };
}

export { FAILURE_KIND as EMERGENCY_EXIT_FAILURE_KIND };
