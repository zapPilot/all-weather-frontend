import { useState } from "react";
import { Button } from "antd";
import TokenDropdownInput from "../views/TokenDropdownInput";
import ConfiguredConnectButton from "../ConnectButton";

export default function ZapInSteps({
  account,
  chainId,
  nextStepChain,
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  handleAAWalletAction,
  protocolAssetDustInWallet,
  usdBalance,
  protocolAssetDustInWalletLoading,
  usdBalanceLoading,
  zapInIsLoading,
  investmentAmount,
  tokenBalance,
  walletBalanceData,
  nextChainInvestmentAmount,
  switchNextStepChain,
  setNextChainInvestmentAmount,
  calCrossChainInvestmentAmount,
  setPreviousTokenSymbol,
}) {
  const [showZapIn, setShowZapIn] = useState(false);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        {/* Step 1 */}
        <div className={`mt-4 sm:mt-0 ${nextStepChain ? "hidden" : "block"}`}>
          <p>Step 1: Choose a chain to zap in and bridge to another chain.</p>
          <TokenDropdownInput
            selectedToken={selectedToken}
            setSelectedToken={handleSetSelectedToken}
            setInvestmentAmount={handleSetInvestmentAmount}
          />
          {account === undefined ? (
            <ConfiguredConnectButton />
          ) : Object.values(
              protocolAssetDustInWallet?.[
                chainId?.name.toLowerCase().replace(" one", "")
              ] || {},
            ).reduce(
              (sum, protocolObj) =>
                sum + (protocolObj.assetUsdBalanceOf || 0),
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
                  chainId?.name.toLowerCase().replace(" one", "")
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

        {/* Step 2 */}
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
          <Button
            type="primary"
            className={`w-full my-2 
              ${
                chainId?.name.toLowerCase().replace(" one", "").trim() ===
                nextStepChain
                  ? "hidden"
                  : "block"
              }`}
            onClick={() => {
              setPreviousTokenSymbol(
                selectedToken.split("-")[0].toLowerCase(),
              );
              switchNextStepChain(nextStepChain);
              setNextChainInvestmentAmount(
                calCrossChainInvestmentAmount(nextStepChain),
              );
            }}
          >
            switch to {nextStepChain} Chain
          </Button>
        </div>

        {/* Step 3 */}
        <div
          className={`mt-4 ${
            nextChainInvestmentAmount > 0 &&
            nextStepChain === chainId?.name.toLowerCase().replace(" one", "")
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
              handleSetInvestmentAmount(
                nextChainInvestmentAmount >
                  parseFloat(walletBalanceData?.displayValue)
                  ? parseFloat(walletBalanceData?.displayValue)
                  : nextChainInvestmentAmount,
              );
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