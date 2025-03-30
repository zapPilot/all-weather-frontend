import ZapInTab from "../components/tabs/ZapInTab";
import ZapOutTab from "../components/tabs/ZapOutTab";
import ClaimTab from "../components/tabs/ClaimTab";
import RebalanceTab from "../components/tabs/RebalanceTab";
import TransferTab from "../components/tabs/TransferTab";
import { Typography, Spin } from "antd";
import APRComposition from "../pages/views/components/APRComposition";
import React, { useState } from "react";

export default function useTabItems(props) {
  const [showModal, setShowModal] = useState(false);

  const sumOfPendingRewards = calculateSumOfPendingRewards(
    props.pendingRewards,
  );
  const tabItems = [
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
      label: "Transfer",
      children: <TransferTab {...props} />,
    },
    {
      key: "4",
      label: (
        <div className="flex flex-col items-center">
          {shouldDisplayAPRComparison(props) && (
            <div className="flex items-center text-xs bg-opacity-20 bg-blue-500 rounded-full px-2 py-0.5 mb-1">
              <span className="text-red-500">
                {calCurrentAPR(props.rebalancableUsdBalanceDict).toFixed(2)}%
              </span>
              {" → "}
              <span className="text-green-400">
                {(
                  props.portfolioApr[props.portfolioName]?.portfolioAPR * 100
                ).toFixed(2)}
                %
              </span>
              <span className="text-yellow-400 animate-spin ml-2">✨</span>
            </div>
          )}
          <button
            className="flex items-center gap-2 text-white bg-gradient-to-r from-purple-500 to-indigo-500 font-bold py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-110"
            onClick={() => setShowModal(true)}
          >
            Rebalance
          </button>
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                <h2 className="text-xl font-bold mb-4">Boost Your APR!</h2>
                <p>
                  Rebalancing can optimize your portfolio and potentially
                  increase your APR. Adjust your investments to maximize
                  returns.
                </p>
                <button
                  className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-full hover:bg-blue-700 transition"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      ),
      children: <RebalanceTab {...props} />,
    },
    // claim is just for testing
    {
      key: "5",
      label: (
        <span>
          Claim (
          {props.pendingRewardsLoading ? (
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
            APRData={props.pendingRewards}
            mode="pendingRewards"
            currency="$"
            exchangeRateWithUSD={1}
            pendingRewardsLoading={props.pendingRewardsLoading}
          />
        </span>
      ),
      children: (
        <ClaimTab {...props} sumOfPendingRewards={sumOfPendingRewards} />
      ),
    },
  ];

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
    .reduce(
      (sum, [_, { currentWeight, APR }]) => currentWeight * APR + sum,
      0,
    ) || 0;

function shouldDisplayAPRComparison(props) {
  // Implement the logic to determine if the APR comparison should be displayed
  // This is a placeholder and should be replaced with the actual implementation
  return true;
}
