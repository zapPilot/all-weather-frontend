import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Progress,
  Spin,
  Switch,
  Tag,
  Typography,
  notification,
} from "antd";
import {
  useActiveAccount,
  useActiveWalletChain,
  useAdminWallet,
  useSwitchActiveWalletChain,
} from "thirdweb/react";
import { ethers } from "ethers";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import BasePage from "../basePage";
import { useWalletMode } from "../contextWrappers/WalletModeContext";
import openNotificationWithIcon from "../../utils/notification.js";
import { normalizeChainName } from "../../utils/chainHelper";
import {
  CHAIN_ID_TO_CHAIN,
  CHAIN_ID_TO_CHAIN_STRING,
  LOCK_EXPLORER_URLS,
} from "../../utils/general";
import {
  AA_EXIT_CHAINS,
  AA_EXIT_CHAIN_IDS,
  EXIT_FEE_USD,
  PROTOCOL_TREASURY_ADDRESS,
  aaExitPendingDirectTransactionStorageKey,
  aaExitPendingUserOpStorageKey,
  buildClaimedRewardsGroup,
  buildProtocolGroups,
  clearPendingAaExitDirectTransaction,
  clearPendingAaExitUserOp,
  createPendingAaExitDirectTransaction,
  createPendingAaExitUserOp,
  diagnoseAaBatchFailure,
  diagnoseAaBatchFailureDirect,
  executeAaExitPlan,
  isAaExitUserOpReceiptFailure,
  isPendingAaExitUserOpDead,
  materializeExitCandidate,
  planAaExitBatches,
  probeAaBatch,
  probeAaBatchDirect,
  readPendingAaExitDirectTransaction,
  readPendingAaExitUserOp,
  runAaExitGroups,
  scanAaExit,
  sendAaExitBatch,
  sendAaExitBatchDirect,
  transactionHashFromAaExitUserOpError,
  waitForPendingAaExitDirectTransaction,
  waitForPendingAaExitUserOp,
  writePendingAaExitDirectTransaction,
  writePendingAaExitUserOp,
} from "../../utils/aaExit";
import logger from "../../utils/logger";

const { Title, Text, Paragraph } = Typography;

const CHAIN_LABEL = { arbitrum: "Arbitrum", base: "Base", op: "Optimism" };

const KIND_TAG = {
  protocol: { color: "blue", text: "Position" },
  rewards: { color: "purple", text: "Rewards" },
  fee: { color: "gold", text: "Fee" },
  sweep: { color: "cyan", text: "Wallet" },
  native: { color: "geekblue", text: "ETH" },
};

const STATUS_COLOR = {
  pending: "text-gray-400",
  sending: "text-blue-500",
  success: "text-green-600",
  partial: "text-orange-500",
  failed: "text-red-500",
  cancelled: "text-yellow-600",
  unknown: "text-yellow-600",
  submitted: "text-blue-500",
};

const STATUS_ICON = {
  success: "✅",
  partial: "⚠️",
  failed: "❌",
  cancelled: "⏹️",
  unknown: "⚠️",
  submitted: "⏳",
};

const LEVEL_TAG = { 1: "no-claim", 2: "split" };

const PAGE_SURFACE =
  "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100";

const toRow = (group) => ({
  uniqueId: group.uniqueId,
  kind: group.kind,
  label: group.label,
  level: group.level,
  status: group.buildError ? "failed" : "pending",
  error: group.buildError || undefined,
  txnCount: group.txns.length,
});

const formatAmount = (raw, decimals) =>
  Number(ethers.utils.formatUnits(raw, decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });

const shortAddress = (address) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

function ResultRow({
  row,
  explorerUrl,
  smartAccountAddress,
  onRetry,
  disabled,
}) {
  const tag = KIND_TAG[row.kind] || KIND_TAG.protocol;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={STATUS_COLOR[row.status] || STATUS_COLOR.pending}>
            {row.status === "sending" ? (
              <Spin size="small" />
            ) : (
              STATUS_ICON[row.status] || "…"
            )}
          </span>
          <Tag color={tag.color}>{tag.text}</Tag>
          <Text className="break-all">{row.label}</Text>
          {LEVEL_TAG[row.level] && <Tag>{LEVEL_TAG[row.level]}</Tag>}
          {row.progress && <Text type="secondary">{row.progress}</Text>}
        </div>
        {row.note && (
          <Text type="secondary" className="text-xs block mt-1">
            {row.note}
          </Text>
        )}
        {row.error && (
          <Text type="danger" className="text-xs block mt-1 break-words">
            {row.error}
          </Text>
        )}
        {row.transactionHash && explorerUrl && (
          <a
            className="text-xs"
            href={`${explorerUrl}tx/${row.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        )}
        {row.userOpHash && (
          <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
            <Text code copyable={{ text: row.userOpHash }} className="text-xs">
              {shortAddress(row.userOpHash)}
            </Text>
            {explorerUrl && smartAccountAddress && (
              <a
                href={`${explorerUrl}txsAA?f=${smartAccountAddress}`}
                target="_blank"
                rel="noreferrer"
              >
                View AA transactions
              </a>
            )}
          </div>
        )}
      </div>
      {(row.status === "failed" || row.status === "partial") && (
        <Button size="small" disabled={disabled} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export default function AaExit() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const adminWallet = useAdminWallet();
  const { aaOn, initializedFromUrl } = useWalletMode();
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [rows, setRows] = useState([]);
  const [feePlan, setFeePlan] = useState(null);
  const [walletScanFailed, setWalletScanFailed] = useState(false);
  const [untransferableTokens, setUntransferableTokens] = useState([]);
  const [fellBack, setFellBack] = useState(false);
  const [retrying, setRetrying] = useState(null);
  const [directMode, setDirectMode] = useState(false);
  const [pendingUserOp, setPendingUserOp] = useState(null);
  const [pendingDirectTransaction, setPendingDirectTransaction] =
    useState(null);
  const [submissionStage, setSubmissionStage] = useState("");
  const [recoveredSubmission, setRecoveredSubmission] = useState(null);
  const [scanProgress, setScanProgress] = useState({
    percent: 0,
    message: "",
    discoveries: [],
  });

  // The live groups hold protocol instances and prepared transactions, neither
  // of which belongs in React state
  const groupsRef = useRef([]);
  // Preflighted AA batches. These contain the dynamically materialized rewards
  // transactions that correspond only to surviving protocol groups.
  const planRef = useRef(null);
  // The DeBank token list is recipient-independent. Keep the successful scan so
  // editing the destination can rebuild calldata without paying for another
  // wallet-token lookup, even after the normal 10-minute cache expires.
  const walletTokenSnapshotRef = useRef(null);
  // Prepared transactions embed the recipient in calldata. Never execute a plan
  // after the input changes until it has been rebound to the new destination.
  const planRecipientRef = useRef(null);
  const planDirectModeRef = useRef(null);
  // Mirrors each row's status outside React so a run can decide its final phase
  // without reading state it just queued an update for
  const statusRef = useRef({});

  const chainMetadata = useMemo(() => {
    if (!activeChain) return null;
    return activeChain.name
      ? activeChain
      : { ...activeChain, name: CHAIN_ID_TO_CHAIN_STRING[activeChain.id] };
  }, [activeChain]);
  const chainName = normalizeChainName(chainMetadata?.name);
  const onSupportedChain = AA_EXIT_CHAINS.includes(chainName);
  const explorerUrl = LOCK_EXPLORER_URLS[activeChain?.id];

  const sendExitBatchTransaction = useCallback(
    async (transactions, callbacks = {}) => {
      try {
        const adminAccount = adminWallet?.getAccount();
        let result;
        if (directMode) {
          if (adminWallet?.getChain()?.id !== chainMetadata?.id) {
            await adminWallet?.switchChain(chainMetadata);
          }
          if (adminWallet?.getChain()?.id !== chainMetadata?.id) {
            throw new Error(
              `AA Exit admin wallet is on chain ${
                adminWallet?.getChain()?.id ?? "unknown"
              }, expected ${chainMetadata?.id ?? "unknown"}`,
            );
          }
          result = await sendAaExitBatchDirect({
            transactions,
            adminAccount,
            chainMetadata,
            expectedSmartAccountAddress: account?.address,
            onStage: callbacks.onStage,
          });
        } else {
          result = await sendAaExitBatch({
            transactions,
            adminAccount,
            chainMetadata,
            expectedSmartAccountAddress: account?.address,
            onStage: callbacks.onStage,
          });
        }
        callbacks.onSuccess?.(result);
      } catch (error) {
        callbacks.onError?.(error);
      }
    },
    [adminWallet, chainMetadata, account?.address, directMode],
  );

  const resetResults = useCallback(() => {
    groupsRef.current = [];
    planRef.current = null;
    walletTokenSnapshotRef.current = null;
    planRecipientRef.current = null;
    planDirectModeRef.current = null;
    statusRef.current = {};
    setRows([]);
    setFeePlan(null);
    setWalletScanFailed(false);
    setUntransferableTokens([]);
    setFellBack(false);
    setSubmissionStage("");
    setRecoveredSubmission(null);
    setPendingDirectTransaction(null);
    setScanProgress({ percent: 0, message: "", discoveries: [] });
    setPhase("idle");
  }, []);

  useEffect(() => {
    setDirectMode(chainMetadata?.id === AA_EXIT_CHAIN_IDS.arbitrum);
  }, [chainMetadata?.id]);

  const restorePendingUserOp = useCallback(
    ({ fromStorageEvent = false } = {}) => {
      if (!account?.address || !chainMetadata?.id) {
        setPendingUserOp(null);
        return null;
      }
      const restored = readPendingAaExitUserOp({
        chainId: chainMetadata.id,
        smartAccountAddress: account.address,
      });
      setPendingUserOp(restored);
      if (restored) {
        setRecoveredSubmission(null);
        setSubmissionStage(restored.submissionStage || "submitted");
        setPhase("submitted");
      } else if (fromStorageEvent) {
        setRecoveredSubmission({ status: "cleared" });
        setPhase("idle");
      }
      return restored;
    },
    [account?.address, chainMetadata?.id],
  );

  const restorePendingDirectTransaction = useCallback(
    ({ fromStorageEvent = false } = {}) => {
      if (!account?.address || !chainMetadata?.id) {
        setPendingDirectTransaction(null);
        return null;
      }
      const restored = readPendingAaExitDirectTransaction({
        chainId: chainMetadata.id,
        smartAccountAddress: account.address,
      });
      setPendingDirectTransaction(restored);
      if (restored) {
        setRecoveredSubmission(null);
        setSubmissionStage("submitted");
        setPhase("submitted");
      } else if (fromStorageEvent) {
        setRecoveredSubmission({ status: "cleared" });
        setPhase("idle");
      }
      return restored;
    },
    [account?.address, chainMetadata?.id],
  );

  // A scan is only valid for the wallet and chain it was taken on
  useEffect(() => {
    resetResults();
  }, [account?.address, activeChain?.id, resetResults]);

  // A submitted hash survives reloads and is also observed across tabs so a
  // second AA Exit screen cannot silently create a duplicate UserOperation.
  useEffect(() => {
    restorePendingUserOp();
    restorePendingDirectTransaction();
  }, [restorePendingDirectTransaction, restorePendingUserOp]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !account?.address ||
      !chainMetadata?.id
    ) {
      return undefined;
    }
    const storageKey = aaExitPendingUserOpStorageKey(
      chainMetadata.id,
      account.address,
    );
    const directStorageKey = aaExitPendingDirectTransactionStorageKey(
      chainMetadata.id,
      account.address,
    );
    const handleStorage = (event) => {
      if (event.key === storageKey) {
        restorePendingUserOp({ fromStorageEvent: true });
      }
      if (event.key === directStorageKey) {
        restorePendingDirectTransaction({ fromStorageEvent: true });
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [
    account?.address,
    chainMetadata?.id,
    restorePendingDirectTransaction,
    restorePendingUserOp,
  ]);

  // useAdminWallet falls back to the active wallet when there is no admin, which
  // would prefill the smart wallet's own address — the one address this must not
  // send to
  useEffect(() => {
    if (recipientTouched) return;
    const adminAddress = adminWallet?.getAccount()?.address;
    if (
      adminAddress &&
      adminAddress.toLowerCase() !== account?.address?.toLowerCase()
    ) {
      setRecipient(adminAddress);
    }
  }, [adminWallet, account?.address, recipientTouched]);

  useEffect(() => {
    setConfirmed(false);
  }, [recipient]);

  const recipientError =
    recipient.length > 0 &&
    (!ethers.utils.isAddress(recipient) ||
      recipient.toLowerCase() === account?.address?.toLowerCase());
  const recipientPlanStale =
    !!planRecipientRef.current &&
    !!recipient &&
    ethers.utils.isAddress(recipient) &&
    planRecipientRef.current.toLowerCase() !== recipient.toLowerCase();
  const modePlanStale =
    planDirectModeRef.current !== null &&
    planDirectModeRef.current !== directMode;
  const exitPlanStale = recipientPlanStale || modePlanStale;

  const busy =
    phase === "scanning" ||
    phase === "running" ||
    phase === "submitted" ||
    !!pendingUserOp ||
    !!pendingDirectTransaction;
  const canScan =
    !!account &&
    aaOn &&
    onSupportedChain &&
    !!recipient &&
    !recipientError &&
    confirmed &&
    !busy;

  const updateGroup = useCallback((uniqueId, patch) => {
    if (patch.status) statusRef.current[uniqueId] = patch.status;
    setRows((current) =>
      current.map((row) =>
        row.uniqueId === uniqueId ? { ...row, ...patch } : row,
      ),
    );
  }, []);

  const handleBatchStage = useCallback(
    (event) => {
      setSubmissionStage(event.stage || "");
      logger.log(
        "AA Exit submission stage",
        `stage=${event.stage || "unknown"}`,
        `chain=${chainMetadata?.id || "unknown"}`,
        `smartAccount=${account?.address || "unknown"}`,
        `userOpHash=${event.userOpHash || "none"}`,
        `transactionHash=${event.transactionHash || "none"}`,
      );

      if (
        (event.stage === "submitting" || event.stage === "submitted") &&
        event.userOpHash
      ) {
        try {
          const existing = readPendingAaExitUserOp({
            chainId: chainMetadata.id,
            smartAccountAddress: account.address,
          });
          const pending = createPendingAaExitUserOp({
            chainId: chainMetadata.id,
            smartAccountAddress: account.address,
            recipient,
            userOpHash: event.userOpHash,
            groupIds: event.groupIds || [],
            batchIndex: event.batchIndex || 0,
            batchCount: event.batchCount || 1,
            transactionIndex: event.transactionIndex,
            transactionCount: event.transactionCount,
            submissionStage: event.stage,
            nonce: event.nonce,
            paymasterValidUntil: event.paymasterValidUntil,
            createdAt:
              existing?.userOpHash === event.userOpHash.toLowerCase()
                ? existing.createdAt
                : Date.now(),
          });
          const persisted = writePendingAaExitUserOp(pending);
          if (!persisted) {
            logger.error(
              "AA Exit could not persist pending UserOp",
              `chain=${chainMetadata.id}`,
              `smartAccount=${account.address}`,
              `userOpHash=${event.userOpHash}`,
            );
          }
          setPendingUserOp(pending);
        } catch (error) {
          logger.error("AA Exit could not track submitted UserOp", error);
        }
      }

      if (
        event.stage === "submitted" &&
        event.transactionHash &&
        !event.userOpHash
      ) {
        try {
          const existing = readPendingAaExitDirectTransaction({
            chainId: chainMetadata.id,
            smartAccountAddress: account.address,
          });
          const pending = createPendingAaExitDirectTransaction({
            chainId: chainMetadata.id,
            smartAccountAddress: account.address,
            recipient,
            transactionHash: event.transactionHash,
            groupIds: event.groupIds || [],
            batchIndex: event.batchIndex || 0,
            batchCount: event.batchCount || 1,
            transactionIndex: event.transactionIndex,
            transactionCount: event.transactionCount,
            createdAt:
              existing?.transactionHash === event.transactionHash.toLowerCase()
                ? existing.createdAt
                : Date.now(),
          });
          const persisted = writePendingAaExitDirectTransaction(pending);
          if (!persisted) {
            logger.error(
              "AA Exit could not persist pending direct transaction",
              `chain=${chainMetadata.id}`,
              `smartAccount=${account.address}`,
              `transactionHash=${event.transactionHash}`,
            );
          }
          setPendingDirectTransaction(pending);
        } catch (error) {
          logger.error(
            "AA Exit could not track submitted direct transaction",
            error,
          );
        }
      }

      if (event.stage === "rejected" && event.userOpHash) {
        clearPendingAaExitUserOp({
          chainId: chainMetadata.id,
          smartAccountAddress: account.address,
          userOpHash: event.userOpHash,
        });
        setPendingUserOp((current) =>
          current?.userOpHash === event.userOpHash.toLowerCase()
            ? null
            : current,
        );
      }

      if (event.stage === "confirmed" && event.userOpHash) {
        clearPendingAaExitUserOp({
          chainId: chainMetadata.id,
          smartAccountAddress: account.address,
          userOpHash: event.userOpHash,
        });
        setPendingUserOp((current) =>
          current?.userOpHash === event.userOpHash.toLowerCase()
            ? null
            : current,
        );
      }

      if (
        (event.stage === "confirmed" || event.stage === "reverted") &&
        event.transactionHash &&
        !event.userOpHash
      ) {
        clearPendingAaExitDirectTransaction({
          chainId: chainMetadata.id,
          smartAccountAddress: account.address,
          transactionHash: event.transactionHash,
        });
        setPendingDirectTransaction((current) =>
          current?.transactionHash === event.transactionHash.toLowerCase()
            ? null
            : current,
        );
      }
    },
    [account?.address, chainMetadata?.id, recipient],
  );

  const ensureNoPendingUserOp = useCallback(async () => {
    if (!account?.address || !chainMetadata?.id) return false;
    const directPending =
      pendingDirectTransaction ||
      readPendingAaExitDirectTransaction({
        chainId: chainMetadata.id,
        smartAccountAddress: account.address,
      });
    if (directPending) {
      setPendingDirectTransaction(directPending);
      setPhase("submitted");
      return false;
    }
    const existing =
      pendingUserOp ||
      readPendingAaExitUserOp({
        chainId: chainMetadata.id,
        smartAccountAddress: account.address,
      });
    if (!existing) return true;
    if (directMode) {
      const pendingState = await isPendingAaExitUserOpDead({
        pending: existing,
        chainMetadata,
      });
      if (pendingState === "dead") {
        clearPendingAaExitUserOp({
          chainId: chainMetadata.id,
          smartAccountAddress: account.address,
          userOpHash: existing.userOpHash,
        });
        setPendingUserOp(null);
        setSubmissionStage("");
        setRecoveredSubmission({
          status: "expired",
          userOpHash: existing.userOpHash,
        });
        setPhase("idle");
        openNotificationWithIcon(
          notificationAPI,
          "Previous sponsored operation expired",
          "info",
          "Its paymaster window expired without consuming the nonce. Direct mode may proceed after a fresh scan.",
        );
        return true;
      }
    }
    setPendingUserOp(existing);
    setPhase("submitted");
    return false;
  }, [
    account?.address,
    chainMetadata,
    directMode,
    notificationAPI,
    pendingDirectTransaction,
    pendingUserOp,
  ]);

  const withSubmissionLock = useCallback(
    async (submitPlan) => {
      const runIfClear = async () => {
        if (!(await ensureNoPendingUserOp())) {
          return { status: "blocked-pending" };
        }
        return submitPlan();
      };

      if (typeof navigator === "undefined" || !navigator.locks?.request) {
        return runIfClear();
      }
      const lockName = `aa-exit-submit:${
        chainMetadata.id
      }:${account.address.toLowerCase()}`;
      return navigator.locks.request(lockName, { ifAvailable: true }, (lock) =>
        lock ? runIfClear() : { status: "locked" },
      );
    },
    [account?.address, chainMetadata?.id, ensureNoPendingUserOp],
  );

  useEffect(() => {
    if (
      !pendingUserOp ||
      phase !== "submitted" ||
      pendingUserOp.chainId !== chainMetadata?.id
    ) {
      return undefined;
    }

    let cancelled = false;
    let retryTimer;
    const pollReceipt = async () => {
      try {
        if (directMode) {
          const pendingState = await isPendingAaExitUserOpDead({
            pending: pendingUserOp,
            chainMetadata,
          });
          if (cancelled) return;
          if (pendingState === "dead") {
            clearPendingAaExitUserOp({
              chainId: pendingUserOp.chainId,
              smartAccountAddress: pendingUserOp.smartAccountAddress,
              userOpHash: pendingUserOp.userOpHash,
            });
            setPendingUserOp(null);
            setSubmissionStage("");
            setRecoveredSubmission({
              status: "expired",
              userOpHash: pendingUserOp.userOpHash,
            });
            setPhase("idle");
            return;
          }
        }
        const receipt = await waitForPendingAaExitUserOp({
          chainMetadata,
          userOpHash: pendingUserOp.userOpHash,
        });
        if (cancelled) return;
        clearPendingAaExitUserOp({
          chainId: pendingUserOp.chainId,
          smartAccountAddress: pendingUserOp.smartAccountAddress,
          userOpHash: pendingUserOp.userOpHash,
        });
        const hasRemainingTransactions =
          Number.isInteger(pendingUserOp.transactionIndex) &&
          pendingUserOp.transactionIndex < pendingUserOp.transactionCount - 1;
        const recoveredRowStatus = hasRemainingTransactions
          ? "partial"
          : "success";
        pendingUserOp.groupIds.forEach((uniqueId) =>
          updateGroup(uniqueId, {
            status: recoveredRowStatus,
            error: hasRemainingTransactions
              ? "The submitted step confirmed. Scan again to rebuild the remaining steps from fresh balances."
              : undefined,
            userOpHash: pendingUserOp.userOpHash,
            transactionHash: receipt.transactionHash,
          }),
        );
        const hadCurrentRows = Object.keys(statusRef.current).length > 0;
        const nextStatuses = { ...statusRef.current };
        pendingUserOp.groupIds.forEach((uniqueId) => {
          nextStatuses[uniqueId] = recoveredRowStatus;
        });
        const stalled = Object.values(nextStatuses).some(
          (status) => status === "failed" || status === "partial",
        );
        setPendingUserOp(null);
        setRecoveredSubmission({
          status: "confirmed",
          userOpHash: pendingUserOp.userOpHash,
          transactionHash: receipt.transactionHash,
        });
        setPhase(
          hadCurrentRows
            ? stalled || pendingUserOp.batchIndex < pendingUserOp.batchCount - 1
              ? "partial"
              : "done"
            : "idle",
        );
      } catch (error) {
        if (cancelled) return;
        if (isAaExitUserOpReceiptFailure(error)) {
          const transactionHash = transactionHashFromAaExitUserOpError(error);
          clearPendingAaExitUserOp({
            chainId: pendingUserOp.chainId,
            smartAccountAddress: pendingUserOp.smartAccountAddress,
            userOpHash: pendingUserOp.userOpHash,
          });
          pendingUserOp.groupIds.forEach((uniqueId) =>
            updateGroup(uniqueId, {
              status: "failed",
              error: error.message,
              userOpHash: pendingUserOp.userOpHash,
              transactionHash,
            }),
          );
          setPendingUserOp(null);
          setRecoveredSubmission({
            status: "failed",
            error: error.message,
            userOpHash: pendingUserOp.userOpHash,
            transactionHash,
          });
          setPhase(
            Object.keys(statusRef.current).length > 0 ? "partial" : "idle",
          );
          return;
        }
        logger.warn(
          "AA Exit: pending UserOp is not confirmed yet",
          `chain=${pendingUserOp.chainId}`,
          `userOpHash=${pendingUserOp.userOpHash}`,
          error,
        );
        retryTimer = window.setTimeout(pollReceipt, 5_000);
      }
    };

    pollReceipt();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [chainMetadata, directMode, pendingUserOp, phase, updateGroup]);

  useEffect(() => {
    if (
      !pendingDirectTransaction ||
      (phase !== "submitted" && phase !== "unknown") ||
      pendingDirectTransaction.chainId !== chainMetadata?.id
    ) {
      return undefined;
    }

    let cancelled = false;
    let retryTimer;
    const pollReceipt = async () => {
      try {
        const receipt = await waitForPendingAaExitDirectTransaction({
          chainMetadata,
          transactionHash: pendingDirectTransaction.transactionHash,
        });
        if (cancelled) return;
        clearPendingAaExitDirectTransaction({
          chainId: pendingDirectTransaction.chainId,
          smartAccountAddress: pendingDirectTransaction.smartAccountAddress,
          transactionHash: pendingDirectTransaction.transactionHash,
        });
        const hasRemainingTransactions =
          Number.isInteger(pendingDirectTransaction.transactionIndex) &&
          pendingDirectTransaction.transactionIndex <
            pendingDirectTransaction.transactionCount - 1;
        const receiptReverted = receipt?.status === "reverted";
        const recoveredRowStatus = receiptReverted
          ? "failed"
          : hasRemainingTransactions
          ? "partial"
          : "success";
        pendingDirectTransaction.groupIds.forEach((uniqueId) =>
          updateGroup(uniqueId, {
            status: recoveredRowStatus,
            error: receiptReverted
              ? "The direct executeBatch transaction reverted atomically; no assets moved."
              : hasRemainingTransactions
              ? "The submitted step confirmed. Scan again to rebuild the remaining steps from fresh balances."
              : undefined,
            transactionHash: pendingDirectTransaction.transactionHash,
          }),
        );
        const hadCurrentRows = Object.keys(statusRef.current).length > 0;
        const nextStatuses = { ...statusRef.current };
        pendingDirectTransaction.groupIds.forEach((uniqueId) => {
          nextStatuses[uniqueId] = recoveredRowStatus;
        });
        const stalled = Object.values(nextStatuses).some(
          (status) => status === "failed" || status === "partial",
        );
        setPendingDirectTransaction(null);
        setRecoveredSubmission({
          status: receiptReverted ? "direct-failed" : "direct-confirmed",
          transactionHash: pendingDirectTransaction.transactionHash,
        });
        setPhase(
          hadCurrentRows
            ? stalled ||
              pendingDirectTransaction.batchIndex <
                pendingDirectTransaction.batchCount - 1
              ? "partial"
              : "done"
            : "idle",
        );
      } catch (error) {
        if (cancelled) return;
        logger.warn(
          "AA Exit: pending direct transaction is not confirmed yet",
          `chain=${pendingDirectTransaction.chainId}`,
          `transactionHash=${pendingDirectTransaction.transactionHash}`,
          error,
        );
        retryTimer = window.setTimeout(pollReceipt, 5_000);
      }
    };

    pollReceipt();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [chainMetadata, pendingDirectTransaction, phase, updateGroup]);

  const updateScanProgress = useCallback((event) => {
    setScanProgress((current) => {
      let percent = current.percent;
      let message = current.message;

      if (event.stage === "protocols") {
        const total = event.total || 0;
        percent = total
          ? 5 + Math.round(((event.completed || 0) / total) * 45)
          : 50;
        message = total
          ? `Scanning protocol positions… ${event.completed || 0}/${total}`
          : "No protocol integrations to scan on this network.";
      } else if (event.stage === "wallet-fetch") {
        percent = 55;
        message = "Loading loose wallet tokens…";
      } else if (event.stage === "tokens") {
        const total = event.total || 0;
        percent = total
          ? 60 + Math.round(((event.completed || 0) / total) * 15)
          : 75;
        message = total
          ? `Checking ${event.tokenSymbol || "wallet token"}… ${
              event.completed || 0
            }/${total}`
          : "No loose wallet tokens need transfer checks.";
      } else if (event.stage === "native") {
        percent = 80;
        message = "Checking native ETH balance…";
      }

      let discoveries = current.discoveries;
      if (
        event.found?.id &&
        !discoveries.some((item) => item.id === event.found.id)
      ) {
        discoveries = [...discoveries, event.found];
      }

      return {
        percent: Math.max(current.percent, percent),
        message,
        discoveries,
      };
    });
  }, []);

  // Level 1 sheds the claim leg; level 2 reuses whatever the group holds and
  // splits it. Rebuilding at any level re-reads balances, so a position an
  // earlier attempt already moved comes back empty instead of reverting.
  const rebuildGroup = useCallback(
    async (group, level, allGroups) => {
      if (group.kind === "protocol") {
        const [rebuilt] = await buildProtocolGroups({
          protocols: [group.protocol],
          owner: account.address,
          recipient,
          level,
        });
        return rebuilt || null;
      }
      if (group.kind === "rewards") {
        return buildClaimedRewardsGroup({
          protocolGroups: (allGroups || []).filter(
            (candidate) => candidate.kind === "protocol",
          ),
          chainMetadata,
          recipient,
        });
      }
      return group;
    },
    [account?.address, recipient, chainMetadata],
  );

  const prepareExitPlan = useCallback(
    async ({ walletTokensOverride } = {}) => {
      const adminAccount = adminWallet?.getAccount();
      if (!adminAccount?.address) {
        throw new Error(
          "AA Exit could not resolve the smart wallet admin account",
        );
      }

      const result = await scanAaExit({
        owner: account.address,
        recipient,
        chainName,
        chainMetadata,
        onScanProgress: updateScanProgress,
        walletTokensOverride,
      });
      setScanProgress((current) => ({
        ...current,
        percent: Math.max(current.percent, 82),
        message: "Dry-running the exit plan before you sign…",
      }));
      const probe = (candidateGroups) =>
        (directMode ? probeAaBatchDirect : probeAaBatch)({
          groups: candidateGroups,
          adminAccount,
          chainMetadata,
          smartAccountAddress: account.address,
        });
      const diagnose = (group) =>
        (directMode ? diagnoseAaBatchFailureDirect : diagnoseAaBatchFailure)({
          groups: materializeExitCandidate({
            units: [group],
            chainMetadata,
            recipient,
          }),
          adminAccount,
          chainMetadata,
          smartAccountAddress: account.address,
        });
      const plan = await planAaExitBatches({
        groups: result.groups,
        chainMetadata,
        recipient,
        probe,
        diagnose,
        onProbe: ({ probeCount, candidateCount }) =>
          setScanProgress((current) => ({
            ...current,
            percent: Math.max(
              current.percent,
              Math.min(96, 82 + probeCount * 2),
            ),
            message: `Dry-running exit batch ${probeCount} (${candidateCount} item${
              candidateCount === 1 ? "" : "s"
            })…`,
          })),
      });
      setScanProgress((current) => ({
        ...current,
        percent: 100,
        message: "Scan complete. Exit plan is ready.",
      }));
      return { result, plan, recipient, directMode };
    },
    [
      account?.address,
      adminWallet,
      recipient,
      chainName,
      chainMetadata,
      directMode,
      updateScanProgress,
    ],
  );

  const applyPreparedPlan = useCallback(
    ({
      result,
      plan,
      recipient: plannedRecipient,
      directMode: plannedDirectMode,
    }) => {
      groupsRef.current = result.groups;
      planRef.current = plan;
      walletTokenSnapshotRef.current = result.walletTokenSnapshot;
      planRecipientRef.current = plannedRecipient;
      planDirectModeRef.current = plannedDirectMode;
      statusRef.current = {};
      const excluded = new Map(
        (plan.excluded || []).map((item) => [item.group.uniqueId, item]),
      );
      setRows(
        result.groups.map((group) => {
          const row = toRow(group);
          const omitted = excluded.get(group.uniqueId);
          if (!omitted) return row;
          return {
            ...row,
            status: "failed",
            error:
              omitted.diagnosis?.message ||
              omitted.error?.message ||
              "UserOperation probe failed",
            note: "Excluded during dry-run so it cannot block the healthy exit batch.",
          };
        }),
      );
      excluded.forEach((_, uniqueId) => {
        statusRef.current[uniqueId] = "failed";
      });
      setFeePlan(result.feePlan);
      setWalletScanFailed(!!result.walletScanError);
      setUntransferableTokens(result.untransferableTokens || []);
      setFellBack(
        (plan.excluded || []).length > 0 || (plan.batches || []).length > 1,
      );
    },
    [],
  );

  const handleScan = useCallback(async () => {
    if (!(await ensureNoPendingUserOp())) return;
    setPhase("scanning");
    setFellBack(false);
    setRecoveredSubmission(null);
    setScanProgress({
      percent: 2,
      message: `Starting ${CHAIN_LABEL[chainName] || "network"} scan…`,
      discoveries: [],
    });
    try {
      const prepared = await prepareExitPlan();
      applyPreparedPlan(prepared);
      setPhase("ready");
    } catch (error) {
      openNotificationWithIcon(
        notificationAPI,
        "Scan failed",
        "error",
        error?.message || String(error),
      );
      setPhase("idle");
    }
  }, [
    ensureNoPendingUserOp,
    prepareExitPlan,
    applyPreparedPlan,
    notificationAPI,
    chainName,
  ]);

  const finishRun = useCallback((status) => {
    if (
      status === "cancelled" ||
      status === "unknown" ||
      status === "submitted"
    ) {
      setPhase(status);
      return;
    }
    const stalled = Object.values(statusRef.current).some(
      (rowStatus) => rowStatus === "failed" || rowStatus === "partial",
    );
    setPhase(stalled ? "partial" : "done");
  }, []);

  const handleRun = useCallback(async () => {
    const executePlan = (plan) =>
      executeAaExitPlan({
        plan,
        sendBatchTransaction: sendExitBatchTransaction,
        updateGroup,
        onBatchStage: handleBatchStage,
      });

    let activePlan = planRef.current || { batches: [], excluded: [] };
    const plannedRecipient = planRecipientRef.current?.toLowerCase();
    const currentRecipient = recipient.toLowerCase();
    const plannedDirectMode = planDirectModeRef.current;
    if (
      plannedRecipient !== currentRecipient ||
      plannedDirectMode !== directMode
    ) {
      setPhase("scanning");
      setScanProgress((current) => ({
        ...current,
        percent: 55,
        message:
          plannedRecipient !== currentRecipient
            ? "Updating the exit plan for the new destination without re-fetching wallet tokens…"
            : "Updating the exit plan for the selected submission mode without re-fetching wallet tokens…",
      }));
      try {
        const prepared = await prepareExitPlan({
          walletTokensOverride: walletTokenSnapshotRef.current,
        });
        applyPreparedPlan(prepared);
        activePlan = prepared.plan;
      } catch (error) {
        openNotificationWithIcon(
          notificationAPI,
          "Could not update destination",
          "error",
          error?.message || String(error),
        );
        setPhase("ready");
        return;
      }
    }

    const result = await withSubmissionLock(async () => {
      setPhase("running");
      return executePlan(activePlan);
    });

    if (result.status === "locked") {
      openNotificationWithIcon(
        notificationAPI,
        "AA Exit is already open in another tab",
        "warning",
        "Finish or close the other submission before trying again.",
      );
      setPhase("ready");
      return;
    }
    if (result.status === "blocked-pending") {
      return;
    }

    if (result.status === "pre-submit-failed") {
      openNotificationWithIcon(
        notificationAPI,
        "Transaction was not submitted",
        "error",
        result.error?.message ||
          "The wallet signed, but the UserOperation failed before submission. No automatic retry was attempted.",
      );
      setPhase("partial");
      return;
    }
    finishRun(result.status);
  }, [
    sendExitBatchTransaction,
    updateGroup,
    handleBatchStage,
    withSubmissionLock,
    prepareExitPlan,
    applyPreparedPlan,
    finishRun,
    recipient,
    directMode,
    notificationAPI,
  ]);

  const handleRetry = useCallback(
    async (uniqueId) => {
      const slot = groupsRef.current.find(
        (group) => group.uniqueId === uniqueId,
      );
      if (!slot) return;
      setRetrying(uniqueId);
      try {
        // rebuilt from fresh balances, so a row whose transactions actually
        // landed comes back empty rather than reverting a second time
        const rebuilt = await rebuildGroup(slot, slot.level, groupsRef.current);
        const target = { ...slot, txns: rebuilt ? rebuilt.txns : [] };
        const result = await withSubmissionLock(async () => {
          setPhase("running");
          return runAaExitGroups({
            groups: [target],
            sendBatchTransaction: sendExitBatchTransaction,
            updateGroup,
            rebuildGroup,
            onBatchStage: handleBatchStage,
            // a single group is already one signature, so there is no combined
            // attempt to make
            combinedAllowed: false,
          });
        });
        if (result.status === "locked") {
          openNotificationWithIcon(
            notificationAPI,
            "AA Exit is already open in another tab",
            "warning",
            "Finish or close the other submission before trying again.",
          );
          setPhase("partial");
          return;
        }
        if (result.status === "blocked-pending") return;
        groupsRef.current = groupsRef.current.map((group) =>
          group.uniqueId === uniqueId ? result.groups[0] || group : group,
        );
        if (result.status === "pre-submit-failed") {
          openNotificationWithIcon(
            notificationAPI,
            "Transaction was not submitted",
            "error",
            result.error?.message || "UserOperation failed before submission.",
          );
        }
        finishRun(result.status);
      } finally {
        setRetrying(null);
      }
    },
    [
      rebuildGroup,
      withSubmissionLock,
      sendExitBatchTransaction,
      updateGroup,
      handleBatchStage,
      notificationAPI,
      finishRun,
    ],
  );

  if (!account) {
    return (
      <BasePage chainId={activeChain} switchChain={switchChain}>
        {notificationContextHolder}
        {/* antd's default typography is dark, and the app shell is black, so
            this page paints its own light surface the way the other standalone
            rescue pages do */}
        <div className={PAGE_SURFACE}>
          <div className="max-w-2xl mx-auto px-4 py-8">
            <Card className="text-center">
              <ExclamationTriangleIcon className="h-14 w-14 text-amber-500 mx-auto mb-4" />
              <Title level={4}>Connect your wallet</Title>
              <Paragraph type="secondary">
                Connect in AA mode to exit everything your zapPilot smart wallet
                holds.
              </Paragraph>
            </Card>
          </div>
        </div>
      </BasePage>
    );
  }

  const movableRows = rows.filter((row) => row.txnCount > 0);
  const aaTransactionsUrl =
    explorerUrl && account?.address
      ? `${explorerUrl}txsAA?f=${account.address}`
      : "";

  return (
    <BasePage chainId={activeChain} switchChain={switchChain}>
      {notificationContextHolder}
      <div className={PAGE_SURFACE}>
        <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
          <Card>
            <Title level={3}>
              AA Exit — everything back to your own wallet
            </Title>
            <Paragraph type="secondary" className="mb-2">
              Hands over everything your zapPilot smart wallet holds on one
              chain: each position unstaked and sent as its raw LP / receipt
              token, NFT positions moved whole, plus every loose ERC20 and the
              native ETH.{" "}
              <Text strong>No swaps, no slippage, no price lookups</Text> — so
              it still works when a token has depegged and breaks the normal
              withdraw.
            </Paragraph>
            <Paragraph type="secondary" className="mb-0">
              Nothing is unwound: liquidity stays liquidity. You receive the LP
              and receipt tokens themselves and unwind them yourself on each
              protocol&apos;s own site. Only positions you actually hold
              something in are included, so a protocol you never entered costs
              nothing.
            </Paragraph>
          </Card>

          {initializedFromUrl && !aaOn && (
            <Alert
              type="error"
              showIcon
              message="AA mode required"
              description="This tool exits your zapPilot smart wallet. You are in EOA mode, where your wallet is already your own — switch with the AA/EOA toggle in the header, or reload with ?mode=aa."
            />
          )}

          {aaOn && !onSupportedChain && (
            <Alert
              type="warning"
              showIcon
              message="Unsupported network"
              description={
                <div className="flex items-center gap-2 flex-wrap">
                  <span>AA Exit runs on Arbitrum, Base and Optimism.</span>
                  {Object.entries(AA_EXIT_CHAIN_IDS).map(([key, id]) => (
                    <Button
                      key={key}
                      size="small"
                      type="primary"
                      onClick={() => switchChain(CHAIN_ID_TO_CHAIN[id])}
                    >
                      {CHAIN_LABEL[key]}
                    </Button>
                  ))}
                </div>
              }
            />
          )}

          {pendingUserOp && (
            <Alert
              type="warning"
              showIcon
              message={
                submissionStage === "submitting"
                  ? "UserOperation signed — checking bundler submission"
                  : "UserOperation submitted — waiting for confirmation"
              }
              description={
                <div className="text-sm">
                  <p className="mb-1">
                    This operation will not be signed or sent again until its
                    status is known. The page is checking
                    {` ${CHAIN_LABEL[chainName] || chainName}`} for its receipt,
                    including after a reload.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Text code copyable={{ text: pendingUserOp.userOpHash }}>
                      {shortAddress(pendingUserOp.userOpHash)}
                    </Text>
                    {aaTransactionsUrl && (
                      <a
                        href={aaTransactionsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View AA transactions
                      </a>
                    )}
                    {submissionStage && (
                      <Text type="secondary">Stage: {submissionStage}</Text>
                    )}
                  </div>
                </div>
              }
            />
          )}

          {pendingDirectTransaction && (
            <Alert
              type="warning"
              showIcon
              message="Direct admin transaction submitted — waiting for confirmation"
              description={
                <div className="text-sm">
                  <p className="mb-1">
                    This executeBatch transaction will not be sent again until
                    its receipt is known. The page resumes checking after a
                    reload.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Text
                      code
                      copyable={{
                        text: pendingDirectTransaction.transactionHash,
                      }}
                    >
                      {shortAddress(pendingDirectTransaction.transactionHash)}
                    </Text>
                    {explorerUrl && (
                      <a
                        href={`${explorerUrl}tx/${pendingDirectTransaction.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View transaction
                      </a>
                    )}
                  </div>
                </div>
              }
            />
          )}

          {!pendingUserOp &&
            !pendingDirectTransaction &&
            recoveredSubmission?.status === "confirmed" && (
              <Alert
                type="success"
                showIcon
                message="Previous UserOperation confirmed"
                description={
                  <div className="text-sm">
                    Its receipt was recovered after the page stopped waiting.
                    Scan again to rebuild any remaining batches from fresh
                    balances.{" "}
                    {recoveredSubmission.transactionHash && explorerUrl && (
                      <a
                        href={`${explorerUrl}tx/${recoveredSubmission.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View transaction
                      </a>
                    )}
                  </div>
                }
              />
            )}

          {!pendingUserOp &&
            !pendingDirectTransaction &&
            recoveredSubmission?.status === "failed" && (
              <Alert
                type="error"
                showIcon
                message="Submitted UserOperation reverted"
                description={recoveredSubmission.error}
              />
            )}

          {!pendingUserOp &&
            !pendingDirectTransaction &&
            recoveredSubmission?.status === "direct-confirmed" && (
              <Alert
                type="success"
                showIcon
                message="Previous direct transaction confirmed"
                description={
                  <span>
                    Its receipt was recovered. Scan fresh balances before
                    starting another exit.{" "}
                    {explorerUrl && recoveredSubmission.transactionHash && (
                      <a
                        href={`${explorerUrl}tx/${recoveredSubmission.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View transaction
                      </a>
                    )}
                  </span>
                }
              />
            )}

          {!pendingUserOp &&
            !pendingDirectTransaction &&
            recoveredSubmission?.status === "direct-failed" && (
              <Alert
                type="error"
                showIcon
                message="Direct transaction reverted atomically"
                description="No assets moved. Scan again to rebuild the exit from fresh balances."
              />
            )}

          {!pendingUserOp &&
            !pendingDirectTransaction &&
            recoveredSubmission?.status === "expired" && (
              <Alert
                type="info"
                showIcon
                message="Previous sponsored operation expired unexecuted"
                description="Its paymaster validity window expired and its nonce was not consumed. Direct mode is now safe to use after a fresh scan."
              />
            )}

          {!pendingUserOp &&
            !pendingDirectTransaction &&
            recoveredSubmission?.status === "cleared" && (
              <Alert
                type="info"
                showIcon
                message="Pending status changed in another tab"
                description="Scan fresh balances before starting another exit."
              />
            )}

          {aaOn && (
            <Card title="Where should everything go?">
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Text strong>Direct mode — admin pays gas</Text>
                    <Text type="secondary" className="block text-xs mt-1">
                      Sends one normal admin → AA.executeBatch transaction and
                      bypasses the Thirdweb bundler. Default on Arbitrum.
                    </Text>
                  </div>
                  <Switch
                    aria-label="Direct mode — admin pays gas"
                    checked={directMode}
                    disabled={busy}
                    onChange={(checked) => {
                      setDirectMode(checked);
                      setConfirmed(false);
                    }}
                  />
                </div>
              </div>
              <label className="block text-sm mb-1" htmlFor="aa-exit-recipient">
                Your own wallet address
              </label>
              <Input
                id="aa-exit-recipient"
                placeholder="0x..."
                status={recipientError ? "error" : ""}
                value={recipient}
                disabled={busy}
                onChange={(event) => {
                  setRecipientTouched(true);
                  setRecipient(event.target.value.trim());
                }}
              />
              {recipientError && (
                <Text type="danger" className="text-sm block mt-1">
                  Enter a valid address that is not this smart wallet itself.
                </Text>
              )}
              <Alert
                className="mt-3"
                type="warning"
                showIcon
                message="Never use an exchange deposit address"
                description={
                  <div className="text-sm">
                    <p className="mb-1">
                      Use a wallet whose keys <Text strong>you control</Text>{" "}
                      (MetaMask, Rabby, a hardware wallet). The address that
                      signs for this smart wallet is prefilled.
                    </p>
                    <p className="mb-0">
                      LP and receipt tokens sent to an exchange are{" "}
                      <Text strong>permanently lost</Text> — exchanges do not
                      recognise them and cannot return them.
                    </p>
                  </div>
                }
              />
              <Checkbox
                className="mt-3"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              >
                <span className="text-sm">
                  I confirm this is a wallet I hold the keys to, not an exchange
                  deposit address.
                </span>
              </Checkbox>
              {exitPlanStale && (
                <Alert
                  className="mt-3"
                  type="info"
                  showIcon
                  message={
                    recipientPlanStale
                      ? "Destination changed — no new wallet scan needed"
                      : "Submission mode changed — no new wallet scan needed"
                  }
                  description="Reconfirm the address, then use the Exit button below. The existing wallet-token snapshot will be reused and the exact batch will be dry-run again before signing."
                />
              )}
              <div className="mt-3">
                {!exitPlanStale && (
                  <Button
                    type="primary"
                    disabled={!canScan}
                    loading={phase === "scanning"}
                    onClick={handleScan}
                  >
                    Scan {CHAIN_LABEL[chainName] || "this network"}
                  </Button>
                )}
              </div>

              {phase === "scanning" && (
                <div
                  className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <Text strong>Scan in progress</Text>
                    <Text type="secondary">{scanProgress.percent}%</Text>
                  </div>
                  <Progress
                    percent={scanProgress.percent}
                    showInfo={false}
                    status="active"
                  />
                  <Text type="secondary" className="block text-sm mt-1">
                    {scanProgress.message || "Scanning wallet…"}
                  </Text>

                  {scanProgress.discoveries.length > 0 && (
                    <div className="mt-3">
                      <Text className="text-xs block mb-1">Found so far</Text>
                      <div className="flex flex-wrap gap-1">
                        {scanProgress.discoveries.map((item) => (
                          <Tag
                            key={item.id}
                            color={item.kind === "native" ? "geekblue" : "blue"}
                          >
                            {item.label}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  <Text type="secondary" className="block text-xs mt-2">
                    Keep this page open. The scan can take a while because each
                    discovered position is checked before anything is sent.
                  </Text>
                </div>
              )}
            </Card>
          )}

          {untransferableTokens.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${untransferableTokens.length} token${
                untransferableTokens.length === 1 ? "" : "s"
              } cannot be transferred`}
              description={
                <div className="text-xs">
                  These tokens were excluded before batching because their
                  contracts fail a transfer simulation. They remain in the smart
                  wallet and do not block the rest of the exit.
                  <div className="mt-1 break-all">
                    {untransferableTokens.map((token) => (
                      <div key={token.address}>
                        {token.symbol}: {shortAddress(token.address)}
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          )}

          {phase === "ready" && rows.length === 0 && (
            <Alert
              type="success"
              showIcon
              message={`Nothing transferable to exit on ${
                CHAIN_LABEL[chainName] || chainName
              }`}
              description={
                untransferableTokens.length > 0
                  ? "No transferable positions, tokens or ETH remain. The token warning above lists assets whose contracts prevent them from being moved, and no fee will be charged."
                  : "This smart wallet holds no positions, tokens or ETH on this chain, so there is nothing to move and no fee to charge."
              }
            />
          )}

          {rows.length > 0 && (
            <Card
              title={`Exit plan — ${movableRows.length} ${
                movableRows.length === 1 ? "item" : "items"
              }`}
            >
              {walletScanFailed && (
                <Alert
                  className="mb-3"
                  type="warning"
                  showIcon
                  message="Wallet token list unavailable"
                  description="Your positions still exit, but loose tokens were left behind and the gas fee is waived. Retry that row once the API recovers."
                />
              )}

              <div className="mb-3 text-sm">
                {feePlan ? (
                  <Text type="secondary">
                    Gas fee ~${EXIT_FEE_USD} →{" "}
                    <Text strong>
                      {formatAmount(feePlan.feeRaw, feePlan.decimals)}{" "}
                      {feePlan.symbol}
                    </Text>{" "}
                    to the protocol treasury (
                    {shortAddress(PROTOCOL_TREASURY_ADDRESS)}). Rounded down, so
                    it is never more than ${EXIT_FEE_USD}.
                  </Text>
                ) : (
                  <Text type="secondary">
                    Gas fee: waived — no priced token available to charge it in.
                  </Text>
                )}
              </div>

              {fellBack && (
                <Alert
                  className="mb-3"
                  type="info"
                  showIcon
                  message="Dry-run optimized the exit batches"
                  description={
                    directMode
                      ? "The full direct executeBatch did not pass preflight. Problematic items were excluded, while healthy items were kept in the largest safe batches."
                      : "The full sponsored UserOp did not pass preflight. Problematic items were excluded, or the healthy items were kept in a small number of large batches instead of being split one by one."
                  }
                />
              )}

              {phase === "unknown" && (
                <Alert
                  className="mb-3"
                  type="warning"
                  showIcon
                  message="One transaction's status is unknown"
                  description="Do not retry yet — it may still confirm. Check your wallet or the block explorer, then scan again."
                />
              )}

              {phase === "cancelled" && (
                <Alert
                  className="mb-3"
                  type="warning"
                  showIcon
                  message="Cancelled in your wallet"
                  description="Nothing further was sent. Scan again when you are ready."
                />
              )}

              {phase === "partial" && (
                <Alert
                  className="mb-3"
                  type="warning"
                  showIcon
                  message="Some items did not go through"
                  description="Everything that succeeded is done. Retry the rows below, or scan again to rebuild the plan from fresh balances."
                />
              )}

              {phase === "done" && (
                <Alert
                  className="mb-3"
                  type="success"
                  showIcon
                  message="Exit complete"
                  description="Everything listed below has been sent to your wallet."
                />
              )}

              <div>
                {rows.map((row) => (
                  <ResultRow
                    key={row.uniqueId}
                    row={row}
                    explorerUrl={explorerUrl}
                    smartAccountAddress={account.address}
                    disabled={busy || retrying !== null}
                    onRetry={() => handleRetry(row.uniqueId)}
                  />
                ))}
              </div>

              {/* Only a fresh scan may be run wholesale: after a run, rows that
                succeeded are done, and re-sending them would ask for balances
                that have already left the wallet. Individual rows retry above. */}
              <Button
                className="mt-4 w-full"
                danger
                type="primary"
                loading={phase === "running" && retrying === null}
                disabled={
                  phase !== "ready" ||
                  movableRows.length === 0 ||
                  !recipient ||
                  recipientError ||
                  !confirmed
                }
                onClick={handleRun}
              >
                Exit everything on {CHAIN_LABEL[chainName] || chainName}
              </Button>

              <Paragraph type="secondary" className="text-xs mt-3 mb-0">
                Scan dry-runs the exact fixed calldata without broadcasting it.
                Immediately before you sign,{" "}
                {directMode
                  ? "the deployed AA, admin permission, chain, gas limit and admin ETH balance are checked again"
                  : "only the nonce, gas estimates and sponsorship envelope are refreshed"}
                . If the full batch fails preflight, dependency-aware binary
                isolation removes only the broken group; if the issue is
                aggregate gas/paymaster size, healthy items stay in a few large
                batches instead of one signature per item. Claimed-reward
                transfers are rebuilt only from protocol groups that survive
                preflight. Amounts are fixed when you scan, so a little dust can
                stay behind.
              </Paragraph>
            </Card>
          )}
        </div>
      </div>
    </BasePage>
  );
}
