import { Button } from "antd";
import DecimalStep from "../../pages/indexes/DecimalStep";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import ActionItem from "../common/ActionItem";

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
      <ActionItem
        actionName="Withdraw"
        availableAssetChains={availableAssetChains}
        currentChain={currentChain}
        chainStatus={chainStatus}
        theme="dark"
      />
      {Object.values(chainStatus).every((status) => status) && (
        <div className={"text-green-400 text-center mb-2"}>
          <CheckCircleIcon className="w-12 h-12 mx-auto" />
          <p>You have completed all withdraw actions.</p>
        </div>
      )}

      {Object.values(chainStatus).some((status) => status) ? null : (
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
      ) : Object.values(chainStatus).filter((status) => status).length &&
        Object.values(chainStatus).filter((status) => status).length <
          availableAssetChains.length &&
        currentChain !==
          availableAssetChains.find((chain) => !chainStatus[chain]) ? (
        <Button
          type="primary"
          className="w-full"
          onClick={() =>
            switchChain(
              CHAIN_ID_TO_CHAIN[
                CHAIN_TO_CHAIN_ID[
                  availableAssetChains.find((chain) => !chainStatus[chain])
                ]
              ],
            )
          }
        >
          Switch to {availableAssetChains.find((chain) => !chainStatus[chain])}
        </Button>
      ) : Object.values(chainStatus).every((status) => status) ? null : (
        <Button
          type="primary"
          className={`w-full 
              ${
                Object.values(chainStatus).filter((status) => status).length ===
                availableAssetChains.length
                  ? "hidden"
                  : ""
              }`}
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
      )}
    </div>
  );
}
