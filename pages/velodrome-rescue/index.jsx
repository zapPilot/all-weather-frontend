import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  InputNumber,
  Spin,
  Typography,
  notification,
} from "antd";
import {
  useActiveAccount,
  useActiveWalletChain,
  useSwitchActiveWalletChain,
  useSendAndConfirmTransaction,
} from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { ethers } from "ethers";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import BasePage from "../basePage";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { CHAIN_ID_TO_CHAIN, LOCK_EXPLORER_URLS } from "../../utils/general";
import { useWalletMode } from "../contextWrappers/WalletModeContext";
import openNotificationWithIcon from "../../utils/notification.js";
import RouterABI from "../../lib/contracts/Aerodrome/Router.json" assert { type: "json" };
import GaugeABI from "../../lib/contracts/Aerodrome/Guage.json" assert { type: "json" };
import PoolABI from "../../lib/contracts/Aerodrome/Pool.json" assert { type: "json" };

const { Title, Text, Paragraph } = Typography;

const OPTIMISM_CHAIN_ID = 10;
const OPTIMISM = CHAIN_ID_TO_CHAIN[OPTIMISM_CHAIN_ID];
const EXPLORER = LOCK_EXPLORER_URLS[OPTIMISM_CHAIN_ID];

// Velodrome v2 USDC/sUSD sAMM pool on Optimism. Gauge resolved on-chain via
// Voter.gauges(pool) and cross-checked with gauge.stakingToken() == pool.
const ROUTER_ADDRESS = "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858";
const POOL_ADDRESS = "0xbC26519f936A90E78fe2C9aA2A03CC208f041234";
const GAUGE_ADDRESS = "0x0E4c56B4a766968b12c286f67aE341b11eDD8b8d";

const TOKEN_SYMBOLS = {
  "0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USDC",
  "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9": "sUSD",
};

const VELO_DECIMALS = 18;
const LP_DECIMALS = 18;
const DEADLINE_SECONDS = 1200;
const DEFAULT_SLIPPAGE_PCT = 0.5;

const poolContract = getContract({
  client: THIRDWEB_CLIENT,
  chain: OPTIMISM,
  address: POOL_ADDRESS,
  abi: PoolABI,
});
const gaugeContract = getContract({
  client: THIRDWEB_CLIENT,
  chain: OPTIMISM,
  address: GAUGE_ADDRESS,
  abi: GaugeABI,
});
const routerContract = getContract({
  client: THIRDWEB_CLIENT,
  chain: OPTIMISM,
  address: ROUTER_ADDRESS,
  abi: RouterABI,
});

// metadata() returns dec0/dec1 as 10**decimals
const decimalsFromPow10 = (pow) => String(pow).length - 1;

const formatUnits = (value, decimals, maxDigits = 6) => {
  const asString = ethers.utils.formatUnits(value.toString(), decimals);
  return Number(asString).toLocaleString("en-US", {
    maximumFractionDigits: maxDigits,
  });
};

const symbolOf = (address) =>
  TOKEN_SYMBOLS[address?.toLowerCase()] ||
  `${address?.slice(0, 6)}...${address?.slice(-4)}`;

const txLink = (hash) => `${EXPLORER}tx/${hash}`;

function StepStatus({ status }) {
  if (!status) return null;
  if (status.state === "pending") {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Spin size="small" />
        <Text type="secondary">Waiting for confirmation...</Text>
      </div>
    );
  }
  if (status.state === "success") {
    return (
      <div className="mt-2">
        <Text type="success">Confirmed ✓ </Text>
        <a href={txLink(status.hash)} target="_blank" rel="noreferrer">
          View on Etherscan
        </a>
      </div>
    );
  }
  if (status.state === "error") {
    return (
      <Alert
        className="mt-2"
        type="error"
        showIcon
        message="Transaction failed"
        description={status.message}
      />
    );
  }
  return null;
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
      <Text type="secondary">{label}</Text>
      <Text strong className="text-right">
        {value}
      </Text>
    </div>
  );
}

export default function VelodromeRescue() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { aaOn } = useWalletMode();
  const { mutate: sendAndConfirmTx } = useSendAndConfirmTransaction();
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  const [chainState, setChainState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [txStatus, setTxStatus] = useState({});
  const [slippagePct, setSlippagePct] = useState(DEFAULT_SLIPPAGE_PCT);

  const fetchState = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [
        metadata,
        totalSupply,
        walletLp,
        allowance,
        stakedLp,
        earned,
        stakingToken,
      ] = await Promise.all([
        readContract({ contract: poolContract, method: "metadata" }),
        readContract({ contract: poolContract, method: "totalSupply" }),
        readContract({
          contract: poolContract,
          method: "balanceOf",
          params: [account.address],
        }),
        readContract({
          contract: poolContract,
          method: "allowance",
          params: [account.address, ROUTER_ADDRESS],
        }),
        readContract({
          contract: gaugeContract,
          method: "balanceOf",
          params: [account.address],
        }),
        readContract({
          contract: gaugeContract,
          method: "earned",
          params: [account.address],
        }),
        readContract({ contract: gaugeContract, method: "stakingToken" }),
      ]);
      const [dec0, dec1, r0, r1, stable, t0, t1] = metadata;
      setChainState({
        decimals0: decimalsFromPow10(dec0),
        decimals1: decimalsFromPow10(dec1),
        r0,
        r1,
        stable,
        t0,
        t1,
        totalSupply,
        walletLp,
        allowance,
        stakedLp,
        earned,
        gaugeOk: stakingToken.toLowerCase() === POOL_ADDRESS.toLowerCase(),
      });
    } catch (error) {
      setLoadError(error?.message || "Failed to load on-chain state");
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchState();
  }, [fetchState, refreshKey]);

  const derived = useMemo(() => {
    if (!chainState) return null;
    const { walletLp, stakedLp, r0, r1, totalSupply } = chainState;
    const slippageBps = BigInt(Math.round(slippagePct * 100));
    // Same floor division as Pool.burn: amount = liquidity * balance / totalSupply
    const expected0 = totalSupply > 0n ? (walletLp * r0) / totalSupply : 0n;
    const expected1 = totalSupply > 0n ? (walletLp * r1) / totalSupply : 0n;
    const min0 = (expected0 * (10000n - slippageBps)) / 10000n;
    const min1 = (expected1 * (10000n - slippageBps)) / 10000n;
    const totalLp = walletLp + stakedLp;
    const shareBps = totalSupply > 0n ? (totalLp * 1000000n) / totalSupply : 0n;
    return { expected0, expected1, min0, min1, totalLp, shareBps };
  }, [chainState, slippagePct]);

  const onOptimism = activeChain?.id === OPTIMISM_CHAIN_ID;
  const canTransact =
    !!account && !aaOn && onOptimism && !!chainState && chainState.gaugeOk;

  const dustLp =
    !!chainState &&
    chainState.walletLp > 0n &&
    derived &&
    (derived.expected0 === 0n || derived.expected1 === 0n);

  const allDone =
    !!chainState &&
    chainState.walletLp === 0n &&
    chainState.stakedLp === 0n &&
    chainState.earned === 0n &&
    !loading;

  const runStep = (stepKey, buildTx) => {
    let txn;
    try {
      txn = buildTx();
    } catch (error) {
      setTxStatus((s) => ({
        ...s,
        [stepKey]: { state: "error", message: error?.message },
      }));
      return;
    }
    setTxStatus((s) => ({ ...s, [stepKey]: { state: "pending" } }));
    sendAndConfirmTx(txn, {
      onSuccess: (receipt) => {
        setTxStatus((s) => ({
          ...s,
          [stepKey]: { state: "success", hash: receipt.transactionHash },
        }));
        openNotificationWithIcon(
          notificationAPI,
          "Transaction confirmed",
          "success",
          txLink(receipt.transactionHash),
        );
        setRefreshKey((k) => k + 1);
      },
      onError: (error) => {
        setTxStatus((s) => ({
          ...s,
          [stepKey]: {
            state: "error",
            message: error?.message || "Transaction failed",
          },
        }));
        openNotificationWithIcon(
          notificationAPI,
          "Transaction failed",
          "error",
          error?.message || "Unknown error",
        );
      },
    });
  };

  const handleClaim = () =>
    runStep("claim", () =>
      prepareContractCall({
        contract: gaugeContract,
        method: "getReward",
        params: [account.address],
      }),
    );

  const handleUnstake = () =>
    runStep("unstake", () =>
      prepareContractCall({
        contract: gaugeContract,
        method: "withdraw",
        params: [chainState.stakedLp],
      }),
    );

  const handleApprove = () =>
    runStep("approve", () =>
      prepareContractCall({
        contract: poolContract,
        method: "approve",
        params: [ROUTER_ADDRESS, chainState.walletLp],
      }),
    );

  const handleRemoveLiquidity = () =>
    runStep("remove", () => {
      // Deadline and mins are computed at click time from the freshest state
      const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);
      return prepareContractCall({
        contract: routerContract,
        method: "removeLiquidity",
        params: [
          chainState.t0,
          chainState.t1,
          chainState.stable,
          chainState.walletLp,
          derived.min0,
          derived.min1,
          account.address,
          deadline,
        ],
      });
    });

  if (!account) {
    return (
      <BasePage chainId={activeChain} switchChain={switchChain}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Card className="w-full max-w-md text-center shadow-xl border-0">
            <div className="p-8">
              <ExclamationTriangleIcon className="h-16 w-16 text-amber-500 mx-auto mb-6" />
              <Title level={3}>Wallet Required</Title>
              <Paragraph type="secondary">
                Connect the wallet that holds the Velodrome USDC/sUSD LP to use
                this rescue tool.
              </Paragraph>
            </div>
          </Card>
        </div>
      </BasePage>
    );
  }

  const symbol0 = chainState ? symbolOf(chainState.t0) : "token0";
  const symbol1 = chainState ? symbolOf(chainState.t1) : "token1";

  return (
    <BasePage chainId={activeChain} switchChain={switchChain}>
      {notificationContextHolder}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
          <Card>
            <Title level={3}>Velodrome sUSD Pool Rescue</Title>
            <Paragraph type="secondary">
              Manually exit the Velodrome v2 USDC/sUSD stable pool on Optimism.
              After the sUSD depeg the pool&apos;s USDC side is nearly drained;
              when the USDC reserve gets low enough, burning LP reverts with
              InsufficientLiquidityBurned() because the USDC amount rounds to
              zero — which is why exits through the official UI have been
              failing. This tool reads live on-chain state and builds each
              transaction with your full, real LP balance so you can exit while
              the USDC reserve allows it.
            </Paragraph>
            <Paragraph type="secondary" className="text-xs">
              Pool:{" "}
              <a
                href={`${EXPLORER}address/${POOL_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                {POOL_ADDRESS}
              </a>
              <br />
              Gauge:{" "}
              <a
                href={`${EXPLORER}address/${GAUGE_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                {GAUGE_ADDRESS}
              </a>
              <br />
              Router:{" "}
              <a
                href={`${EXPLORER}address/${ROUTER_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                {ROUTER_ADDRESS}
              </a>
            </Paragraph>
          </Card>

          {aaOn && (
            <Alert
              type="error"
              showIcon
              message="EOA mode required"
              description="Account-abstraction mode is enabled and the smart wallet is pinned to Base, but your LP lives under your EOA on Optimism. Switch to EOA mode (toggle in the header, or reload with ?mode=eoa) to continue."
            />
          )}

          {!aaOn && !onOptimism && (
            <Alert
              type="warning"
              showIcon
              message="Wrong network"
              description={
                <div className="flex items-center gap-4">
                  <span>This tool operates on Optimism (chain 10).</span>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => switchChain(OPTIMISM)}
                  >
                    Switch to Optimism
                  </Button>
                </div>
              }
            />
          )}

          {loadError && (
            <Alert
              type="error"
              showIcon
              message="Failed to load on-chain state"
              description={loadError}
              action={
                <Button
                  size="small"
                  onClick={() => setRefreshKey((k) => k + 1)}
                >
                  Retry
                </Button>
              }
            />
          )}

          {chainState && !chainState.gaugeOk && (
            <Alert
              type="error"
              showIcon
              message="Gauge sanity check failed"
              description="gauge.stakingToken() does not match the pool address. Do not proceed — the configured gauge is wrong."
            />
          )}

          <Card
            title="Your position"
            extra={
              <Button
                size="small"
                loading={loading}
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                Refresh
              </Button>
            }
          >
            {!chainState && loading ? (
              <div className="flex justify-center py-8">
                <Spin />
              </div>
            ) : chainState ? (
              <>
                <StatRow
                  label="Staked LP (in gauge)"
                  value={`${formatUnits(
                    chainState.stakedLp,
                    LP_DECIMALS,
                    12,
                  )} LP`}
                />
                <StatRow
                  label="LP in wallet"
                  value={`${formatUnits(
                    chainState.walletLp,
                    LP_DECIMALS,
                    12,
                  )} LP`}
                />
                <StatRow
                  label="Pending VELO rewards"
                  value={formatUnits(chainState.earned, VELO_DECIMALS)}
                />
                <StatRow
                  label={`Pool reserve ${symbol0}`}
                  value={formatUnits(chainState.r0, chainState.decimals0)}
                />
                <StatRow
                  label={`Pool reserve ${symbol1}`}
                  value={formatUnits(chainState.r1, chainState.decimals1)}
                />
                <StatRow
                  label="Your share of pool"
                  value={`${(Number(derived.shareBps) / 10000).toFixed(4)}%`}
                />
                <StatRow
                  label={`Estimated ${symbol0} out (wallet LP)`}
                  value={formatUnits(derived.expected0, chainState.decimals0)}
                />
                <StatRow
                  label={`Estimated ${symbol1} out (wallet LP)`}
                  value={formatUnits(derived.expected1, chainState.decimals1)}
                />
              </>
            ) : (
              <Text type="secondary">No data loaded yet.</Text>
            )}
          </Card>

          {allDone && (
            <Alert
              type="success"
              showIcon
              message="Nothing left to rescue"
              description="This wallet has no staked LP, no wallet LP, and no pending rewards for this pool."
            />
          )}

          {dustLp && (
            <Alert
              type="error"
              showIcon
              message="Cannot burn right now — one side would round to zero"
              description={`Burning your wallet LP would currently produce 0 raw units of ${
                derived.expected0 === 0n ? symbol0 : symbol1
              }, so the pool would revert with InsufficientLiquidityBurned() — the same failure the Velodrome UI hit. If you still have LP staked, unstake it first so the full position is burned in one call. Otherwise wait for the ${
                derived.expected0 === 0n ? symbol0 : symbol1
              } reserve to recover (someone swapping it back into the pool) and hit Refresh.`}
            />
          )}

          <Card title="Step 1 · Claim VELO rewards (optional)">
            <Paragraph type="secondary">
              Claims pending VELO from the gauge. Safe to skip — rewards stay
              claimable after unstaking.
            </Paragraph>
            {chainState && chainState.earned === 0n ? (
              <Text type="secondary">No pending rewards ✓</Text>
            ) : (
              <Button
                type="primary"
                disabled={
                  !canTransact ||
                  chainState.earned === 0n ||
                  txStatus.claim?.state === "pending"
                }
                loading={txStatus.claim?.state === "pending"}
                onClick={handleClaim}
              >
                Claim VELO
              </Button>
            )}
            <StepStatus status={txStatus.claim} />
          </Card>

          <Card title="Step 2 · Unstake all LP from gauge">
            <Paragraph type="secondary">
              Calls <Text code>gauge.withdraw(stakedBalance)</Text> to move your
              full staked LP back to your wallet.
            </Paragraph>
            {chainState && chainState.stakedLp === 0n ? (
              <Text type="secondary">Nothing staked in the gauge ✓</Text>
            ) : (
              <Button
                type="primary"
                disabled={
                  !canTransact ||
                  chainState.stakedLp === 0n ||
                  txStatus.unstake?.state === "pending"
                }
                loading={txStatus.unstake?.state === "pending"}
                onClick={handleUnstake}
              >
                Unstake{" "}
                {chainState
                  ? formatUnits(chainState.stakedLp, LP_DECIMALS, 12)
                  : ""}{" "}
                LP
              </Button>
            )}
            <StepStatus status={txStatus.unstake} />
          </Card>

          <Card title="Step 3 · Approve LP to router">
            <Paragraph type="secondary">
              Approves your full wallet LP balance to the Velodrome router.
            </Paragraph>
            {chainState &&
            chainState.walletLp > 0n &&
            chainState.allowance >= chainState.walletLp ? (
              <Text type="secondary">Already approved ✓</Text>
            ) : (
              <Button
                type="primary"
                disabled={
                  !canTransact ||
                  !chainState ||
                  chainState.walletLp === 0n ||
                  txStatus.approve?.state === "pending"
                }
                loading={txStatus.approve?.state === "pending"}
                onClick={handleApprove}
              >
                Approve LP
              </Button>
            )}
            <StepStatus status={txStatus.approve} />
          </Card>

          <Card title="Step 4 · Remove liquidity">
            <Paragraph type="secondary">
              Calls{" "}
              <Text code>
                router.removeLiquidity({symbol0}, {symbol1}, stable, walletLp,
                min0, min1, you, deadline)
              </Text>{" "}
              with your full wallet LP balance. Minimum amounts are computed
              from live reserves.
            </Paragraph>
            <div className="flex items-center gap-2 mb-3">
              <Text type="secondary">Slippage tolerance:</Text>
              <InputNumber
                min={0}
                max={50}
                step={0.1}
                value={slippagePct}
                onChange={(v) => setSlippagePct(v ?? DEFAULT_SLIPPAGE_PCT)}
                addonAfter="%"
                size="small"
                style={{ width: 120 }}
              />
            </div>
            {chainState && derived && chainState.walletLp > 0n && (
              <Paragraph type="secondary" className="text-xs">
                Min {symbol0}: {formatUnits(derived.min0, chainState.decimals0)}{" "}
                · Min {symbol1}:{" "}
                {formatUnits(derived.min1, chainState.decimals1)}
              </Paragraph>
            )}
            <Button
              type="primary"
              danger
              disabled={
                !canTransact ||
                !chainState ||
                chainState.walletLp === 0n ||
                chainState.allowance < chainState.walletLp ||
                dustLp ||
                txStatus.remove?.state === "pending"
              }
              loading={txStatus.remove?.state === "pending"}
              onClick={handleRemoveLiquidity}
            >
              Remove Liquidity
            </Button>
            <StepStatus status={txStatus.remove} />
          </Card>
        </div>
      </div>
    </BasePage>
  );
}
