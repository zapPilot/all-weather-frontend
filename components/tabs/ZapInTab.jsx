import { Button, Statistic } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { getCurrentTimeSeconds } from "@across-protocol/app-sdk";
import { useState } from "react";
import { TOKEN_ADDRESS_MAP } from "../../utils/general";
import ActionItem from "../common/ActionItem";
const { Countdown } = Statistic;
export default function ZapInTab({
  nextStepChain,
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  tokenPricesMappingTable,
  account,
  protocolAssetDustInWallet,
  chainId,
  handleAAWalletAction,
  protocolAssetDustInWalletLoading,
  usdBalanceLoading,
  zapInIsLoading,
  investmentAmount,
  tokenBalance,
  setPreviousTokenSymbol,
  switchNextStepChain,
  walletBalanceData,
  showZapIn,
  setInvestmentAmount,
  setFinishedTxn,
  setShowZapIn,
  portfolioHelper,
  availableAssetChains,
  chainStatus,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const countdownTime = 9;
  const currentChain = chainId?.name?.toLowerCase().replace(" one", "").trim();
  const falseChains = availableAssetChains.filter(
    (chain) => !chainStatus[chain],
  );
  const skipBridge = availableAssetChains.length > falseChains.length;
  const handleSwitchChain = async (chain) => {
    setIsLoading(true);
    const deadlineTime = getCurrentTimeSeconds() + countdownTime;
    setDeadline(deadlineTime * 1000); // Convert to milliseconds for antd Countdown
    setShowCountdown(true);
    switchNextStepChain(chain);
    await new Promise((resolve) => setTimeout(resolve, countdownTime * 1000));

    setPreviousTokenSymbol(selectedToken.split("-")[0].toLowerCase());
    const tokenSymbol = selectedToken.split("-")[0].toLowerCase();
    if (tokenSymbol === "usdt") {
      const newSelectedToken = `usdc-${TOKEN_ADDRESS_MAP["usdc"][nextStepChain]}-6`;
      handleSetSelectedToken(newSelectedToken);
    }
    setShowCountdown(false);
    setIsLoading(false);
  };

  return (
    <div>
      <ActionItem
        actionName="zapIn"
        availableAssetChains={availableAssetChains}
        currentChain={currentChain}
        chainStatus={chainStatus}
        theme="dark"
      />
      <div
        className={`mt-4 sm:mt-0 ${
          chainStatus[currentChain] ? "hidden" : "block"
        }`}
      >
        <TokenDropdownInput
          selectedToken={selectedToken}
          setSelectedToken={handleSetSelectedToken}
          setInvestmentAmount={handleSetInvestmentAmount}
          tokenPricesMappingTable={tokenPricesMappingTable}
        />
        {account === undefined ? (
          <ConfiguredConnectButton />
        ) : Object.values(
            protocolAssetDustInWallet?.[
              chainId?.name?.toLowerCase()?.replace(" one", "")
            ] || {},
          ).reduce(
            (sum, protocolObj) => sum + (protocolObj.assetUsdBalanceOf || 0),
            0,
          ) > 100 ? (
          <Button
            type="primary"
            className="w-full my-2"
            onClick={() => {
              handleAAWalletAction("stake", true);
            }}
            loading={protocolAssetDustInWalletLoading}
            disabled={usdBalanceLoading}
          >
            {`Stake Available Assets ($${Object.values(
              protocolAssetDustInWallet?.[
                chainId?.name?.toLowerCase()?.replace(" one", "")
              ] || {},
            )
              .reduce(
                (sum, protocolObj) =>
                  sum + (Number(protocolObj.assetUsdBalanceOf) || 0),
                0,
              )
              .toFixed(2)})`}
          </Button>
        ) : (
          <Button
            type="primary"
            className="w-full my-2"
            onClick={() => {
              handleAAWalletAction("zapIn", skipBridge);
            }}
            // loading={zapInIsLoading}
            disabled={
              Number(investmentAmount) === 0 ||
              Number(investmentAmount) > tokenBalance
            }
          >
            Zap In
          </Button>
        )}
      </div>
      <div
        className={`mt-4 ${
          chainStatus[currentChain] && falseChains.length > 0
            ? "block"
            : "hidden"
        }`}
      >
        {showCountdown && deadline && (
          <div className="mb-4">
            <Countdown
              title="Bridging tokens..."
              value={deadline}
              onFinish={() => setShowCountdown(false)}
              style={{
                backgroundColor: "#ffffff", // Ant Design's default primary color
                padding: "10px",
                borderRadius: "8px",
              }}
              className="text-white"
            />
          </div>
        )}

        <Button
          type="primary"
          className={`w-full my-2 ${
            currentChain ===
            availableAssetChains.find((chain) => !chainStatus[chain])
              ? "hidden"
              : "block"
          }`}
          onClick={() => {
            handleSwitchChain(
              availableAssetChains.find((chain) => !chainStatus[chain]),
            );
            setFinishedTxn(false);
          }}
          loading={isLoading}
        >
          switch to {availableAssetChains.find((chain) => !chainStatus[chain])}{" "}
          Chain
        </Button>
      </div>
    </div>
  );
}
