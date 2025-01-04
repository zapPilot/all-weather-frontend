import { Button, Spin } from "antd";

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
  const calCurrentAPR = (rebalancableUsdBalanceDict) =>
    Object.entries(rebalancableUsdBalanceDict)
      .filter(([key]) => !["pendingRewards", "metadata"].includes(key))
      .reduce(
        (sum, [_, { currentWeight, APR }]) => currentWeight * APR + sum,
        0,
      ) || 0;
  return (
    <div>
      <p>Follow these steps to rebalance your portfolio:</p>
      {rebalancableUsdBalanceDictLoading ? <Spin /> : null}
      {rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain?.map(
        (data, index) => {
          const isCurrentChain =
            chainId?.name?.toLowerCase().replace(" one", "").trim() ===
            data.chain;
          const isFirstPendingAction = index === 0;

          return (
            <div key={`${data.chain}-${data.actionName}`} className="mb-4">
              <p className="text-gray-400 mb-2">
                Step {index + 1}: {isCurrentChain ? "Execute" : "Switch to"}{" "}
                {data.chain} chain
                {isCurrentChain ? ` and ${data.actionName}` : ""}
              </p>

              {isCurrentChain ? (
                <Button
                  type="primary"
                  className="w-full"
                  onClick={() => handleAAWalletAction(data.actionName, true)}
                  loading={
                    rebalanceIsLoading || rebalancableUsdBalanceDictLoading
                  }
                  disabled={
                    getRebalanceReinvestUsdAmount() / usdBalance <
                      portfolioHelper?.rebalanceThreshold() || usdBalance <= 0
                    //  ||
                    // Math.abs(
                    //   calCurrentAPR(rebalancableUsdBalanceDict) -
                    //     portfolioApr[portfolioName]?.portfolioAPR * 100,
                    // ) < 5
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
                  disabled={!isFirstPendingAction}
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
