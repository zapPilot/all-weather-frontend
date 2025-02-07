import { Button, Spin } from "antd";
import { useState } from "react";

export default function RebalanceTab({
  rebalancableUsdBalanceDictLoading,
  rebalancableUsdBalanceDict,
  chainId,
  handleAAWalletAction,
  rebalanceIsLoading,
  getRebalanceReinvestUsdAmount,
  usdBalance,
  portfolioHelper,
  portfolioApr,
  portfolioName,
  switchChain,
  CHAIN_ID_TO_CHAIN,
  CHAIN_TO_CHAIN_ID,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const calCurrentAPR = (rebalancableUsdBalanceDict) =>
    Object.entries(rebalancableUsdBalanceDict)
      .filter(([key]) => !["pendingRewards", "metadata"].includes(key))
      .reduce(
        (sum, [_, { currentWeight, APR }]) => currentWeight * APR + sum,
        0,
      ) || 0;
  return (
    <div>
      {rebalancableUsdBalanceDictLoading ? <Spin /> : null}
      <div className="flex justify-center mb-4">
        {rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain?.map((data, index) => (
          <div
            className={`flex flex-col items-center mx-2 ${
              currentStep === index ? "text-white font-semibold" : "text-gray-500"
            }`}
          >
            <div
              className={`w-10 h-10 border-2 rounded-full flex items-center justify-center ${
                currentStep === index ? "border-white" : "border-gray-500"
              }`}
            >
              {index + 1}
            </div>
            <p>
              {data.actionName === "rebalance" ?
              "Rebalance"
              : data.actionName === "zapIn" ?
              "Deposit"
              : data.actionName}
            </p>
          </div>
        ))}
      </div>
      { currentStep == rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.length ?
        <div className="text-green-400 text-center mb-2">
          You have completed all rebalance actions.
        </div>
      : null}
      {rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain?.map(
        (data, index) => {
          const isCurrentChain =
            chainId?.name?.toLowerCase().replace(" one", "").trim() ===
            data.chain;
          const isFirstPendingAction = index === 0;

          return (
            <div
              key={`${data.chain}-${data.actionName}`}
              className={currentStep === index ? "mb-4" : "hidden"}
            >
              <p className="text-gray-400 text-center mb-2">
                { isCurrentChain ? (
                  (getRebalanceReinvestUsdAmount(chainId?.name) / usdBalance < portfolioHelper?.rebalanceThreshold() ||
                  Math.abs(
                    calCurrentAPR(rebalancableUsdBalanceDict) -
                      portfolioApr[portfolioName]?.portfolioAPR * 100,
                  ) < 5) ? "Your investment portfolio is still healthy, and no rebalancing is needed."
                  : null
                ) : (usdBalance <= 0
                  ? "You have no balance in your portfolio. Please deposit some assets."
                  : null)}
              </p>
              {isCurrentChain ? (
                <Button
                  type="primary"
                  className="w-full"
                  onClick={() => {
                    handleAAWalletAction(data.actionName, true);
                    setCurrentStep(currentStep + 1);
                  }}
                  loading={
                    rebalanceIsLoading || rebalancableUsdBalanceDictLoading
                  }
                  disabled={
                    getRebalanceReinvestUsdAmount(chainId?.name) / usdBalance <
                      portfolioHelper?.rebalanceThreshold() ||
                    usdBalance <= 0 ||
                    Math.abs(
                      calCurrentAPR(rebalancableUsdBalanceDict) -
                        portfolioApr[portfolioName]?.portfolioAPR * 100,
                    ) < 5
                  }
                >
                  {data.actionName} on {data.chain}
                </Button>
              ) : (
                <Button
                  type="primary"
                  className="w-full"
                  onClick={() =>
                    switchChain(
                      CHAIN_ID_TO_CHAIN[CHAIN_TO_CHAIN_ID[data.chain]],
                    )
                  }
                >
                  Switch to {data.chain} Chain
                </Button>
              )}
            </div>
          );
        },
      )}

      <div className="mt-4 text-gray-400">
        <p>Expected APR after rebalance: </p>
        <div className="flex items-center gap-2">
          <span className="text-red-500">
            {calCurrentAPR(rebalancableUsdBalanceDict).toFixed(2)}%
          </span>
          <span>→</span>
          <span className="text-green-400">
            {(portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
