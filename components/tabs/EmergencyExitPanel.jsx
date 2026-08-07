import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Collapse, Input, Spin } from "antd";
import ConfiguredConnectButton from "../../pages/ConnectButton";

const STATUS_COLOR = {
  pending: "text-gray-400",
  sending: "text-blue-400",
  success: "text-green-400",
  failed: "text-red-400",
  cancelled: "text-yellow-400",
  unknown: "text-yellow-400",
};

const STATUS_ICON = {
  success: "✅",
  failed: "❌",
  cancelled: "⏹️",
  unknown: "⚠️",
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
  emergencyExitPhase = "idle",
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
                      This hands everything this app holds for you on{" "}
                      {chainName} to the address below: every position unstaked
                      and sent as raw LP / receipt tokens, NFT positions moved
                      whole, pending rewards claimed, plus any loose ERC20 and
                      ETH left in your smart wallet.{" "}
                      <span className="font-bold">
                        No swaps, no slippage, no price lookups
                      </span>{" "}
                      — so it still works when a token has depegged and breaks
                      the normal withdraw path. Native ETH goes last, so there
                      is gas left for everything ahead of it.
                    </p>
                    <p className="mb-1">
                      Only positions you actually hold something in are
                      included, so a protocol you never entered — or already
                      left — does not cost a signature. In both AA and EOA mode,
                      the app first tries to move everything in one atomic
                      transaction. If that transaction safely fails before
                      changing state, it automatically retries each line
                      separately, so one broken position cannot strand the rest.
                    </p>
                    <p className="mb-1">
                      The list of loose wallet tokens comes from our backend. If
                      that API is down you will see a failed{" "}
                      <span className="font-mono">Loose wallet tokens</span> row
                      — your positions still exit, but the loose tokens stay put
                      until you retry that row.
                    </p>
                    <p className="mb-0">
                      You will receive{" "}
                      <span className="font-bold">
                        raw LP / receipt tokens, plain ERC20s and ETH
                      </span>
                      , not stablecoins. Anything held as liquidity you then
                      unwind yourself on the protocol&apos;s own site (e.g.
                      velodrome.finance for Velodrome pools).
                    </p>
                  </div>
                }
              />

              {emergencyExitPhase === "fallback" && (
                <Alert
                  type="warning"
                  showIcon
                  message="Combined exit failed — retrying positions separately"
                  description="Completed positions will stay completed even if a later position fails."
                />
              )}

              {emergencyExitPhase === "unknown" && (
                <Alert
                  type="warning"
                  showIcon
                  message="The combined transaction status is unknown"
                  description="Do not retry yet. Refresh balances and check your wallet or block explorer first; the original transaction may still confirm."
                />
              )}

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
                Pending rewards are claimed first and then sent as a separate{" "}
                <span className="font-mono">Claimed rewards</span> row, so a
                protocol that over-reports what its claim will pay out can only
                cost you that row. Amounts are fixed while the transactions are
                built, so a little dust can stay behind, and rewards still
                locked in vesting are left alone because nothing can move them
                yet. Rewards are only claimed alongside a position&apos;s
                principal, so a protocol where you hold nothing is skipped even
                if dust rewards are still claimable there. Retrying a single
                position re-claims its rewards but does not re-send them — run
                the full exit again to sweep those up.
              </p>
              <p className="text-xs text-gray-400">
                NFT positions (Camelot, Velodrome V3) are moved whole, except
                any NFT you staked into a gauge or nitro pool outside zapPilot:
                only what the position manager reports for this wallet is
                visible here. Loose wallet tokens and ETH are only swept from a
                smart wallet — in <span className="font-mono">?mode=eoa</span>{" "}
                the exit touches your protocol positions and nothing else, so
                the rest of your wallet is left alone.
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
