import { Typography, Spin } from "antd";
import React, { useMemo, memo, lazy, Suspense } from "react";

// Lazy load APRComposition as well
const APRComposition = lazy(() =>
  import("../pages/views/components/APRComposition"),
);

// Lazy load heavy tab components to reduce initial bundle size
const ZapInTab = lazy(() => import("../components/tabs/ZapInTab"));
const ZapOutTab = lazy(() => import("../components/tabs/ZapOutTab"));
const ClaimTab = lazy(() => import("../components/tabs/ClaimTab"));
const RebalanceTab = lazy(() => import("../components/tabs/RebalanceTab"));
const TransferTab = lazy(() => import("../components/tabs/TransferTab"));
const ConvertDustTab = lazy(() => import("../components/tabs/ConvertDustTab"));
import { Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";

// Constants
const TAB_KEYS = {
  DEPOSIT: "1",
  WITHDRAW: "2",
  REBALANCE: "3",
  CLAIM: "4",
  DUST_ZAP: "5",
  TRANSFER: "6",
};

const CURRENCY_FORMAT_OPTIONS = {
  style: "currency",
  currency: "USD",
};

// Utility functions
const calculateSumOfPendingRewards = (pendingRewards) =>
  Object.values(pendingRewards).reduce(
    (acc, reward) => acc + (reward.usdDenominatedValue || 0),
    0,
  );

const calculateCurrentAPR = (rebalancableUsdBalanceDict) =>
  Object.entries(rebalancableUsdBalanceDict)
    .filter(([key]) => !["pendingRewards", "metadata"].includes(key))
    .reduce(
      (sum, [_, { currentWeight, APR }]) => currentWeight * APR + sum,
      0,
    ) || 0;

// Extract RebalanceLabel component
const RebalanceLabel = memo(function RebalanceLabel({
  currentAPR,
  targetAPR,
  isLoading,
}) {
  const isAboveTarget = currentAPR >= targetAPR;

  if (isAboveTarget) {
    return (
      <button className="flex items-center gap-2 text-white bg-gradient-to-r from-purple-500 to-indigo-500 font-bold py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-110">
        Rebalance
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center text-xs bg-opacity-20 bg-blue-500 rounded-full px-2 py-0.5 mb-1">
        <span className="text-red-500">
          {isLoading ? <Spin size="small" /> : currentAPR.toFixed(2)}%
        </span>
        {" → "}
        <span className="text-green-400">
          {isNaN(targetAPR) ? <Spin size="small" /> : targetAPR.toFixed(2)}%
        </span>
        <span className="text-yellow-400 animate-spin ml-2">✨</span>
      </div>
      <button className="flex items-center gap-2 text-white bg-gradient-to-r from-purple-500 to-indigo-500 font-bold py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-110">
        Rebalance
      </button>
    </div>
  );
});

// Extract ClaimLabel component
const ClaimLabel = memo(function ClaimLabel({
  pendingRewards,
  pendingRewardsLoading,
  sumOfPendingRewards,
}) {
  return (
    <span>
      Claim (
      {pendingRewardsLoading ? (
        <Spin size="small" />
      ) : (
        <Typography.Text
          style={{
            color: "#5DFDCB",
            fontSize: "1.1em",
            fontWeight: "bold",
            textShadow: "0 0 8px rgba(255, 184, 0, 0.3)",
          }}
        >
          {sumOfPendingRewards.toLocaleString("en-US", CURRENCY_FORMAT_OPTIONS)}
        </Typography.Text>
      )}
      ){" "}
      <Suspense fallback={<Spin size="small" />}>
        <APRComposition
          APRData={pendingRewards}
          mode="pendingRewards"
          currency="$"
          exchangeRateWithUSD={1}
          pendingRewardsLoading={pendingRewardsLoading}
        />
      </Suspense>
    </span>
  );
});

// Extract DustZapLabel component
const DustZapLabel = memo(function DustZapLabel() {
  return (
    <>
      DustZap
      <Popover
        style={{ width: "500px" }}
        content="Convert leftover tokens into ETH."
        title="DustZap"
        trigger="hover"
        overlayClassName="apr-composition-popover"
      >
        <InfoCircleOutlined
          aria-hidden="true"
          className="h-6 w-5 text-gray-500 ms-1 cursor-help"
        />
      </Popover>
    </>
  );
});

// PropTypes definitions
RebalanceLabel.propTypes = {
  currentAPR: PropTypes.number.isRequired,
  targetAPR: PropTypes.number.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

ClaimLabel.propTypes = {
  pendingRewards: PropTypes.object.isRequired,
  pendingRewardsLoading: PropTypes.bool.isRequired,
  sumOfPendingRewards: PropTypes.number.isRequired,
};

export default function useTabItems({
  pendingRewards,
  pendingRewardsLoading,
  rebalancableUsdBalanceDict,
  rebalancableUsdBalanceDictLoading,
  portfolioApr,
  portfolioName,
  ...props
}) {
  // Memoized calculations
  const sumOfPendingRewards = useMemo(
    () => calculateSumOfPendingRewards(pendingRewards),
    [pendingRewards],
  );

  const currentAPR = useMemo(
    () => calculateCurrentAPR(rebalancableUsdBalanceDict),
    [rebalancableUsdBalanceDict],
  );

  const targetAPR = useMemo(
    () => portfolioApr[portfolioName]?.portfolioAPR * 100,
    [portfolioApr, portfolioName],
  );

  // Memoized tab items with Suspense wrappers for lazy loading
  const tabItems = useMemo(() => {
    const baseItems = [
      {
        key: TAB_KEYS.DEPOSIT,
        label: "Deposit",
        children: (
          <Suspense fallback={<Spin size="large" />}>
            <ZapInTab {...props} />
          </Suspense>
        ),
      },
      {
        key: TAB_KEYS.WITHDRAW,
        label: "Withdraw",
        children: (
          <Suspense fallback={<Spin size="large" />}>
            <ZapOutTab {...props} />
          </Suspense>
        ),
      },
      {
        key: TAB_KEYS.REBALANCE,
        label: (
          <RebalanceLabel
            currentAPR={currentAPR}
            targetAPR={targetAPR}
            isLoading={rebalancableUsdBalanceDictLoading}
          />
        ),
        children: (
          <Suspense fallback={<Spin size="large" />}>
            <RebalanceTab
              {...props}
              rebalancableUsdBalanceDict={rebalancableUsdBalanceDict}
            />
          </Suspense>
        ),
      },
      {
        key: TAB_KEYS.CLAIM,
        label: (
          <ClaimLabel
            pendingRewards={pendingRewards}
            pendingRewardsLoading={pendingRewardsLoading}
            sumOfPendingRewards={sumOfPendingRewards}
          />
        ),
        children: (
          <Suspense fallback={<Spin size="large" />}>
            <ClaimTab {...props} pendingRewards={pendingRewards} />
          </Suspense>
        ),
      },
      {
        key: TAB_KEYS.DUST_ZAP,
        label: <DustZapLabel />,
        children: (
          <Suspense fallback={<Spin size="large" />}>
            <ConvertDustTab {...props} />
          </Suspense>
        ),
      },
      {
        key: TAB_KEYS.TRANSFER,
        label: "Transfer",
        children: (
          <Suspense fallback={<Spin size="large" />}>
            <TransferTab {...props} />
          </Suspense>
        ),
      },
    ];

    return baseItems;
  }, [
    props,
    currentAPR,
    targetAPR,
    rebalancableUsdBalanceDictLoading,
    pendingRewards,
    pendingRewardsLoading,
    sumOfPendingRewards,
  ]);

  return tabItems;
}

// PropTypes for the main hook
useTabItems.propTypes = {
  pendingRewards: PropTypes.object.isRequired,
  pendingRewardsLoading: PropTypes.bool.isRequired,
  rebalancableUsdBalanceDict: PropTypes.object.isRequired,
  rebalancableUsdBalanceDictLoading: PropTypes.bool.isRequired,
  portfolioApr: PropTypes.object.isRequired,
  portfolioName: PropTypes.string.isRequired,
};
