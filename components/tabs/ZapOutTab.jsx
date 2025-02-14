import { Button } from "antd";
import DecimalStep from "../../pages/indexes/DecimalStep";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

export default function ZapOutTab({
  selectedToken,
  handleSetSelectedToken,
  usdBalance,
  setZapOutPercentage,
  account,
  handleAAWalletAction,
  zapOutIsLoading,
  zapOutPercentage,
  usdBalanceLoading,
  portfolioHelper,
  pendingRewards,
  chainId,
  availableAssetChains,
  chainStatus,
  switchChain,
  CHAIN_ID_TO_CHAIN,
  CHAIN_TO_CHAIN_ID,
}) {
  const currentChain = chainId?.name?.toLowerCase().replace(" one", "").trim();

  return (
    <div>
      <div className="flex justify-center mb-4">
        {availableAssetChains
          .sort((a, b) => (a === "base" ? -1 : 1))
          .map((chain, index) => (
          <div
            className={`flex flex-col items-center mx-2 ${currentChain === chain ? "text-white" : "text-gray-500"}`}
            key={index}>
            <div className={`w-10 h-10 border-2 rounded-full flex items-center justify-center ${currentChain === chain ? "border-white" : "border-gray-500"}`}>
              {index + 1}
            </div>
            <p>Withdraw on {chain}</p>
          </div>
        ))}
      </div>
      {Object.values(chainStatus).every(status => status) && (
        <div className={"text-green-400 text-center mb-2"}>
          <CheckCircleIcon className="w-12 h-12 mx-auto" />
          <p>You have completed all withdraw actions.</p>
        </div>
      )}
      
      {Object.values(chainStatus).some(status => status) ? null : (
        <DecimalStep
          selectedToken={selectedToken}
          setSelectedToken={handleSetSelectedToken}
          depositBalance={usdBalance}
          setZapOutPercentage={setZapOutPercentage}
          currency="$"
          noTokenSelect={false}
          zapOutIsLoading={zapOutIsLoading}
          usdBalanceLoading={usdBalanceLoading}
          portfolioHelper={portfolioHelper}
          pendingRewards={pendingRewards}
        />
      )}
      {account === undefined ? (
        <ConfiguredConnectButton />
      ) : Object.values(chainStatus).filter(status => status).length &&
        Object.values(chainStatus).filter(status => status).length < availableAssetChains.length &&
        currentChain !== availableAssetChains.find((chain) => !chainStatus[chain]) ? (
          <Button
            type="primary"
            className="w-full"
            onClick={() =>
              switchChain(
                CHAIN_ID_TO_CHAIN[CHAIN_TO_CHAIN_ID[availableAssetChains.find((chain) => !chainStatus[chain])]]
              )
            }
          >
            Switch to {availableAssetChains.find((chain) => !chainStatus[chain])}
          </Button>
        ) : Object.values(chainStatus).every(status => status) ? null : (
          <Button
            type="primary"
            className={`w-full 
              ${Object.values(chainStatus).filter(status => status).length === availableAssetChains.length ? "hidden" : ""}`}
            onClick={() => handleAAWalletAction("zapOut", true)}
            loading={zapOutIsLoading || usdBalanceLoading}
            disabled={
              usdBalance < 0.01 ||
              zapOutPercentage === 0 ||
              selectedToken?.split("-")[0].toLowerCase() === "eth"
            }
          >
            Withdraw
          </Button>
        )
      }
    </div>
  );
}
