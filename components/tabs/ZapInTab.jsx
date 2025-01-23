import { Button, Statistic } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { getCurrentTimeSeconds } from "@across-protocol/app-sdk";
import { useState } from "react";
import { TOKEN_ADDRESS_MAP } from "../../utils/general";
import { chain } from "lodash";
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
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const countdownTime = 9;
  const handleSwitchChain = async () => {
    setIsLoading(true);
    const deadlineTime = getCurrentTimeSeconds() + countdownTime;
    setDeadline(deadlineTime * 1000); // Convert to milliseconds for antd Countdown
    setShowCountdown(true);

    switchNextStepChain(nextStepChain);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className={`mt-4 sm:mt-0 ${nextStepChain ? "hidden" : "block"}`}>
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
                handleAAWalletAction("zapIn", false);
              }}
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
        <div className={`mt-4 ${nextStepChain ? "block" : "hidden"}`}>
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
            onClick={() => {
              handleSwitchChain();
            }}
            loading={isLoading}
          >
            switch to {nextStepChain} Chain
          </Button>
        </div>
        <div
          className={`mt-4 ${
            nextStepChain === chainId?.name?.toLowerCase()?.replace(" one", "")
              ? "block"
              : "hidden"
          }`}
          // className={'mt-4 block'}
        >
          <Button
            type="primary"
            className={`w-full my-2 ${showZapIn ? "hidden" : "block"}`}
            onClick={() => {
              setInvestmentAmount(walletBalanceData?.displayValue);
              setFinishedTxn(false);
              setShowZapIn(true);
            }}
          >
            Set Investment Amount to{" "}
            {walletBalanceData?.displayValue !== undefined
              ? Number(walletBalanceData.displayValue).toFixed(2)
              : "0.00"}{" "}
            on {nextStepChain} Chain
          </Button>
          <Button
            type="primary"
            className={`w-full my-2 ${showZapIn ? "block" : "hidden"}`}
            onClick={() => {
              handleAAWalletAction("zapIn", true);
            }}
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
