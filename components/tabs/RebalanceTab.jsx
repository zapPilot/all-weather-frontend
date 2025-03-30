import { Button, Spin } from "antd";
import { useState } from "react";
import ActionItem from "../common/ActionItem";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import { actionNameMap } from "../common/ActionItem";
import { formatLockUpPeriod } from "../../utils/general";
// Add sleep utility function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function RebalanceTab({
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
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  investmentAmount,
  tokenPricesMappingTable,
  lockUpPeriod,
  account,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const currentChain = chainId?.name
    ?.toLowerCase()
    .replace(" one", "")
    .replace(" mainnet", "")
    .trim();
  return (
    <div>
      {Object.keys(rebalancableUsdBalanceDict || {}).length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
      ) : (
        <ActionItem
          tab="Rebalance"
          actionName={rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.map(
            (action) => action.actionName,
          )}
          availableAssetChains={rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.map(
            (action) => action.chain,
          )}
          currentChain={currentChain}
          chainStatus={chainStatus}
          theme="dark"
          isStarted={Object.values(chainStatus || {}).some((status) => status)}
          account={account}
        />
      )}

      {rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.every(
        (action) => chainStatus[action.chain],
      )
        ? null
        : rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain?.map(
            (data, index) => {
              // Normalize chain names for comparison
              const currentChainName = chainId?.name?.toLowerCase().trim();
              const targetChainName = data.chain.toLowerCase().trim();
              const isCurrentChain =
                currentChainName.includes(targetChainName) ||
                targetChainName.includes(currentChainName);
              // Only show the current step
              if (index !== currentStep) {
                return null;
              }
              return (
                <div key={`${data.chain}-${data.actionName}`} className="mb-4">
                  {data.actionName === "localRebalance" && (
                    <TokenDropdownInput
                      selectedToken={selectedToken}
                      setSelectedToken={handleSetSelectedToken}
                      setInvestmentAmount={handleSetInvestmentAmount}
                      tokenPricesMappingTable={tokenPricesMappingTable}
                    />
                  )}
                  {isCurrentChain ? (
                    <Button
                      type="primary"
                      className="w-full"
                      onClick={async () => {
                        handleAAWalletAction(data.actionName, true);
                        // Only increment step if there are more actions
                        await sleep(3000);
                        if (
                          currentStep <
                          rebalancableUsdBalanceDict.metadata
                            .rebalanceActionsByChain.length -
                            1
                        ) {
                          setCurrentStep(currentStep + 1);
                        }
                      }}
                      disabled={
                        usdBalance <= 0 ||
                        (data.actionName === "localRebalance" &&
                          Number(investmentAmount) === 0) ||
                        lockUpPeriod > 0
                      }
                    >
                      {lockUpPeriod > 0
                        ? `Rebalance (unlocks in ${formatLockUpPeriod(
                            lockUpPeriod,
                          )})`
                        : actionNameMap[data.actionName]}{" "}
                      on {data.chain}
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
                      disabled={lockUpPeriod > 0}
                    >
                      {lockUpPeriod > 0
                        ? `Switch to ${
                            data.chain
                          } Chain (unlocks in ${formatLockUpPeriod(
                            lockUpPeriod,
                          )})`
                        : `Switch to ${data.chain} Chain`}
                    </Button>
                  )}
                </div>
              );
            },
          )}
    </div>
  );
}
