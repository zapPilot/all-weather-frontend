import { Button, Statistic } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { getCurrentTimeSeconds } from "@across-protocol/app-sdk";
import { useState } from "react";
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
  usdBalance,
  handleAAWalletAction,
  protocolAssetDustInWalletLoading,
  usdBalanceLoading,
  zapInIsLoading,
  investmentAmount,
  tokenBalance,
  setPreviousTokenSymbol,
  switchNextStepChain,
  walletBalanceData,
  setNextChainInvestmentAmount,
  nextChainInvestmentAmount,
  showZapIn,
  setInvestmentAmount,
  setFinishedTxn,
  setShowZapIn,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [deadline, setDeadline] = useState(null);

  const handleSwitchChain = async () => {
    setIsLoading(true);
    const deadlineTime = getCurrentTimeSeconds() + 12;
    setDeadline(deadlineTime * 1000); // Convert to milliseconds for antd Countdown
    setShowCountdown(true);

    await new Promise((resolve) => setTimeout(resolve, 4000));

    setPreviousTokenSymbol(selectedToken.split("-")[0].toLowerCase());
    switchNextStepChain(nextStepChain);
    setNextChainInvestmentAmount(parseFloat(walletBalanceData?.displayValue));

    setShowCountdown(false);
    setIsLoading(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className={`mt-4 sm:mt-0 ${nextStepChain ? "hidden" : "block"}`}>
          <p>Step 1: Choose a chain to zap in and bridge to another chain.</p>
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
            ) /
              usdBalance >
            0.05 ? (
            <Button
              type="primary"
              className="w-full my-2"
              onClick={() => handleAAWalletAction("stake", true)}
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
              onClick={() => handleAAWalletAction("zapIn", false)}
              loading={zapInIsLoading}
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
          className={`mt-4 
              ${
                nextStepChain
                  ? nextChainInvestmentAmount > 0
                    ? "hidden"
                    : "block"
                  : "hidden"
              }
            `}
        >
          <p>
            Step 2: Once bridging is complete, switch to the other chain to
            calculate the investment amount.
          </p>

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
              chainId?.name?.toLowerCase()?.replace(" one", "").trim() ===
              nextStepChain
                ? "hidden"
                : "block"
            }`}
            onClick={handleSwitchChain}
            loading={isLoading}
          >
            switch to {nextStepChain} Chain
          </Button>
        </div>
        <div
          className={`mt-4 ${
            nextChainInvestmentAmount > 0 &&
            nextStepChain === chainId?.name?.toLowerCase()?.replace(" one", "")
              ? "block"
              : "hidden"
          }`}
        >
          <p>
            Step 3: After calculating the investment amount, click to zap in.
          </p>

          <Button
            type="primary"
            className={`w-full my-2 ${showZapIn ? "hidden" : "block"}`}
            onClick={() => {
              setInvestmentAmount(
                nextChainInvestmentAmount >
                  parseFloat(walletBalanceData?.displayValue)
                  ? parseFloat(walletBalanceData?.displayValue)
                  : nextChainInvestmentAmount,
              );
              setFinishedTxn(false);
              setShowZapIn(true);
            }}
          >
            Set Investment Amount to{" "}
            {nextChainInvestmentAmount >
            parseFloat(walletBalanceData?.displayValue)
              ? parseFloat(walletBalanceData?.displayValue) < 0.01
                ? "< 0.01"
                : parseFloat(walletBalanceData?.displayValue).toFixed(2)
              : nextChainInvestmentAmount < 0.01
              ? "< 0.01"
              : nextChainInvestmentAmount?.toFixed(2)}{" "}
            on {nextStepChain} Chain
          </Button>
          <Button
            type="primary"
            className={`w-full my-2 ${showZapIn ? "block" : "hidden"}`}
            onClick={() => handleAAWalletAction("zapIn", true)}
            loading={zapInIsLoading}
            disabled={
              Number(investmentAmount) === 0 ||
              Number(investmentAmount) > tokenBalance
            }
          >
            Zap In{" "}
            {Number(investmentAmount) < 0.01
              ? "< 0.01"
              : Number(investmentAmount)?.toFixed(2)}{" "}
            {selectedToken?.split("-")[0]} on {nextStepChain} Chain
          </Button>
        </div>
      </div>
    </div>
  );
}
