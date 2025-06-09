import ZapInTab from "../components/tabs/ZapInTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import ClaimTab from "../components/tabs/ClaimTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import TransferTab from "../components/tabs/TransferTab";
import ConvertDustTab from "../components/tabs/ConvertDustTab";
import { Typography, Spin } from "antd";
import APRComposition from "../pages/views/components/APRComposition";
import React, { useMemo, memo } from "react";
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
      <APRComposition
        APRData={pendingRewards}
        mode="pendingRewards"
        currency="$"
        exchangeRateWithUSD={1}
        pendingRewardsLoading={pendingRewardsLoading}
      />
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

  // Memoized tab items
  const tabItems = useMemo(() => {
    const baseItems = [
      {
        key: TAB_KEYS.DEPOSIT,
        label: "Deposit",
        children: <ZapInTab {...props} />,
      },
      {
        key: TAB_KEYS.WITHDRAW,
        label: "Withdraw",
        children: <ZapOutTab {...props} />,
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
          <RebalanceTab
            {...props}
            rebalancableUsdBalanceDict={rebalancableUsdBalanceDict}
          />
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
        children: <ClaimTab {...props} pendingRewards={pendingRewards} />,
      },
      {
        key: TAB_KEYS.DUST_ZAP,
        label: <DustZapLabel />,
        children: <ConvertDustTab {...props} />,
      },
      {
        key: TAB_KEYS.TRANSFER,
        label: "Transfer",
        children: <TransferTab {...props} />,
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
