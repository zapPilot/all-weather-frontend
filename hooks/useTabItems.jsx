import ZapInTab from "../components/tabs/ZapInTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import ClaimTab from "../components/tabs/ClaimTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import TransferTab from "../components/tabs/TransferTab";
import { Typography, Spin } from "antd";
import APRComposition from "../pages/views/components/APRComposition";
import React, { useMemo, memo } from "react";

// Extract RebalanceLabel component
const RebalanceLabel = memo(function RebalanceLabel({
  currentAPR,
  targetAPR,
  isLoading,
}) {
  if (currentAPR >= targetAPR) {
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
        <span className="text-green-400">{targetAPR.toFixed(2)}%</span>
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
          {sumOfPendingRewards.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
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

export default function useTabItems(props) {
  const {
    pendingRewards,
    pendingRewardsLoading,
    rebalancableUsdBalanceDict,
    rebalancableUsdBalanceDictLoading,
    portfolioApr,
    portfolioName,
  } = props;

  // Memoize calculations
  const sumOfPendingRewards = useMemo(
    () => calculateSumOfPendingRewards(pendingRewards),
    [pendingRewards],
  );

  const currentAPR = useMemo(
    () => calCurrentAPR(rebalancableUsdBalanceDict),
    [rebalancableUsdBalanceDict],
  );

  const targetAPR = useMemo(
    () => portfolioApr[portfolioName]?.portfolioAPR * 100,
    [portfolioApr, portfolioName],
  );

  // Check if URL starts with 'app'
  const isAppDomain = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.location.hostname.startsWith("app"),
    [],
  );

  // Memoize tab items
  const tabItems = useMemo(() => {
    const items = [
      {
        key: "1",
        label: "Deposit",
        children: <ZapInTab {...props} />,
      },
      {
        key: "2",
        label: "Withdraw",
        children: <ZapOutTab {...props} />,
      },
      {
        key: "3",
        label: (
          <RebalanceLabel
            currentAPR={currentAPR}
            targetAPR={targetAPR}
            isLoading={rebalancableUsdBalanceDictLoading}
          />
        ),
        children: <RebalanceTab {...props} />,
      },
      {
        key: "4",
        label: (
          <ClaimLabel
            pendingRewards={pendingRewards}
            pendingRewardsLoading={pendingRewardsLoading}
            sumOfPendingRewards={sumOfPendingRewards}
          />
        ),
        children: <ClaimTab {...props} pendingRewards={pendingRewards} />,
      },
    ];

    // Only add the Transfer tab if not on app domain
    if (!isAppDomain) {
      items.push({
        key: "5",
        label: "Transfer",
        children: <TransferTab {...props} />,
      });
    }

    return items;
  }, [
    props,
    currentAPR,
    targetAPR,
    rebalancableUsdBalanceDictLoading,
    pendingRewards,
    pendingRewardsLoading,
    sumOfPendingRewards,
    isAppDomain,
  ]);

  return tabItems;
}

function calculateSumOfPendingRewards(pendingRewards) {
  return Object.values(pendingRewards).reduce(
    (acc, reward) => acc + (reward.usdDenominatedValue || 0),
    0,
  );
}

const calCurrentAPR = (rebalancableUsdBalanceDict) =>
  Object.entries(rebalancableUsdBalanceDict)
    .filter(([key]) => !["pendingRewards", "metadata"].includes(key))
    .reduce((sum, [_, { currentWeight, APR }]) => {
      return currentWeight * APR + sum;
    }, 0) || 0;
