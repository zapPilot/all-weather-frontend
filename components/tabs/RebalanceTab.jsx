import { Button, Spin } from "antd";
import { useRouter } from "next/router";
import ActionItem from "../common/ActionItem";

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
  chainStatus,
}) {
  const calCurrentAPR = (rebalancableUsdBalanceDict) =>
    Object.entries(rebalancableUsdBalanceDict)
      .filter(([key]) => !["pendingRewards", "metadata"].includes(key))
      .reduce(
        (sum, [_, { currentWeight, APR }]) => currentWeight * APR + sum,
        0,
      ) || 0;
  const router = useRouter();
  const currentChain = chainId?.name?.toLowerCase().replace(" one", "").trim();

  return (
    <div>
      {rebalancableUsdBalanceDictLoading ? <Spin /> : null}
      <ActionItem
        actionName={rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.map(
          (action) => action.actionName,
        )}
        availableAssetChains={rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.map(
          (action) => action.chain,
        )}
        currentChain={currentChain}
        chainStatus={chainStatus}
        theme="dark"
      />
      {rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.every(
        (action) => chainStatus[action.chain],
      )
        ? null
        : rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain?.map(
            (data, index) => {
              const isCurrentChain =
                chainId?.name?.toLowerCase().replace(" one", "").trim() ===
                data.chain;

              if (
                Object.values(chainStatus).every((status) => !status) &&
                index > 0
              ) {
                return null;
              }

              return (
                <div
                  key={`${data.chain}-${data.actionName}`}
                  className={!chainStatus[data.chain] ? "mb-4" : "hidden"}
                >
                  {isCurrentChain ? (
                    <Button
                      type="primary"
                      className="w-full"
                      onClick={() => {
                        handleAAWalletAction(data.actionName, true);
                      }}
                      loading={
                        rebalanceIsLoading || rebalancableUsdBalanceDictLoading
                      }
                      disabled={usdBalance <= 0}
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
            {rebalancableUsdBalanceDictLoading ? (
              <Spin />
            ) : (
              calCurrentAPR(rebalancableUsdBalanceDict).toFixed(2)
            )}
          </span>
          <span>→</span>
          <span className="text-green-400">
            {portfolioApr[portfolioName]?.portfolioAPR ? (
              (portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(2)
            ) : (
              <Spin />
            )}
            %
          </span>
        </div>
      </div>
    </div>
  );
}
