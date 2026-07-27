import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Collapse, Input, Spin } from "antd";
import ConfiguredConnectButton from "../../pages/ConnectButton";

const STATUS_COLOR = {
  pending: "text-gray-400",
  sending: "text-blue-400",
  success: "text-green-400",
  failed: "text-red-400",
};

const STATUS_ICON = {
  success: "✅",
  failed: "❌",
};

function ResultRow({ uniqueId, result, onRetry, disabled }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 text-sm">
      <div className="min-w-0">
        <span className={STATUS_COLOR[result.status] || STATUS_COLOR.pending}>
          {result.status === "sending" ? (
            <Spin size="small" />
          ) : (
            STATUS_ICON[result.status] || "…"
          )}
        </span>{" "}
        <span className="text-gray-200">{result.label || uniqueId}</span>
        {result.error && (
          <div className="text-red-400 text-xs mt-0.5 break-words">
            {result.error}
          </div>
        )}
        {result.txnLink && (
          <div className="text-xs mt-0.5">
            <a
              href={result.txnLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              View transaction
            </a>
          </div>
        )}
      </div>
      {result.status === "failed" && (
        <Button
          size="small"
          disabled={disabled}
          onClick={() => onRetry(uniqueId)}
        >
          Retry
        </Button>
      )}
    </div>
  );
}

export default function EmergencyExitPanel({
  recipient,
  recipientError,
  validateRecipient,
  handleEmergencyExit,
  emergencyExitStatus = {},
  account,
  chainId,
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Drop the confirmation whenever the destination changes, so a ticked box
  // can't carry over to an address pasted afterwards
  useEffect(() => {
    setConfirmed(false);
  }, [recipient]);

  const chainName = chainId?.name || "this network";
  const results = Object.entries(emergencyExitStatus);
  const canSubmit = confirmed && recipient && !recipientError && !isRunning;

  const run = async (uniqueIds) => {
    setIsRunning(true);
    try {
      await handleEmergencyExit(uniqueIds);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Collapse
      ghost
      items={[
        {
          key: "emergency-exit",
          label: (
            <span className="text-red-400 font-semibold">
              🚨 Emergency Exit — send positions straight to your own wallet
            </span>
          ),
          children: (
            <div className="flex flex-col gap-3">
              <Alert
                type="error"
                showIcon
                message="Use this only when the normal Withdraw fails"
                description={
                  <div className="text-sm">
                    <p className="mb-1">
                      This unstakes every position on {chainName} and sends the
                      raw LP / receipt tokens to the address below.{" "}
                      <span className="font-bold">
                        No swaps, no slippage, no price lookups
                      </span>{" "}
                      — so it still works when a token has depegged and breaks
                      the normal withdraw path.
                    </p>
                    <p className="mb-1">
                      Each position is sent as its own transaction. If one
                      fails, the rest still go through and you can retry just
                      that one.
                    </p>
                    <p className="mb-0">
                      You will receive{" "}
                      <span className="font-bold">LP tokens</span>, not
                      stablecoins. To cash out you then remove liquidity
                      yourself on the protocol&apos;s own site (e.g.
                      velodrome.finance for Velodrome pools).
                    </p>
                  </div>
                }
              />

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Your own wallet address
                </label>
                <Input
                  status={recipientError ? "error" : ""}
                  placeholder="0x..."
                  onChange={(e) => validateRecipient(e.target.value)}
                  value={recipient}
                />
                {recipientError && (
                  <div className="text-red-500 text-sm mt-1">
                    Please enter a valid Ethereum address different from your
                    own
                  </div>
                )}
              </div>

              <Alert
                type="warning"
                showIcon
                message="⚠️ Never use an exchange address"
                description={
                  <div className="text-sm">
                    <p className="mb-1">
                      • Must be a wallet whose private key or seed phrase{" "}
                      <span className="font-bold">you control</span> (MetaMask,
                      Rabby, a hardware wallet)
                    </p>
                    <p className="mb-1">
                      • Sending LP tokens to a centralized exchange deposit
                      address means{" "}
                      <span className="font-bold">
                        permanent, unrecoverable loss
                      </span>{" "}
                      — exchanges do not recognize these tokens and cannot
                      return them
                    </p>
                    <p className="mb-0">
                      • Double-check the address supports {chainName}
                    </p>
                  </div>
                }
              />

              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              >
                <span className="text-gray-200 text-sm">
                  I confirm this address is a wallet I hold the keys to, not an
                  exchange deposit address.
                </span>
              </Checkbox>

              {account === undefined ? (
                <ConfiguredConnectButton />
              ) : (
                <Button
                  danger
                  type="primary"
                  className="w-full"
                  loading={isRunning}
                  disabled={!canSubmit}
                  onClick={() => run(null)}
                >
                  Emergency Exit everything on {chainName}
                </Button>
              )}

              {results.length > 0 && (
                <div className="border-t border-gray-700 pt-2">
                  <p className="text-sm text-gray-300 mb-1">Results</p>
                  {results.map(([uniqueId, result]) => (
                    <ResultRow
                      key={uniqueId}
                      uniqueId={uniqueId}
                      result={result}
                      disabled={isRunning}
                      onRetry={(id) => run([id])}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400">
                Pending reward tokens stay credited to this wallet and can still
                be collected from the Claim tab afterwards. Positions held as
                NFTs cannot be moved this way and will show as failed.
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
