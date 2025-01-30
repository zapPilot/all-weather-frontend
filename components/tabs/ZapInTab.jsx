import { Button, Statistic } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { getCurrentTimeSeconds } from "@across-protocol/app-sdk";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="mb-2">
          <p className="text-base font-semibold leading-6">Complete chain</p>
          <div className="flex items-center">
            {availableAssetChains.map((chain, index) => (
              <img
                key={index}
                src={`/chainPicturesWebp/${chain}.webp`}
                alt={chain}
                className={`w-6 h-6 m-1 rounded-full ${
                  chainStatus[chain] ? "" : "opacity-10"
                }`}
              />
            ))}
          </div>
          {falseChains?.length === 0 && availableAssetChains?.length > 0 && (
            <div className="flex flex-col text-green-500 text-center">
              <CheckCircleIcon className="w-12 h-12 mx-auto" />
              <p className="mt-2">Deposit is complete!</p>
              <p className="mt-2">
                Your assets have been successfully deposited.
              </p>
              <Button
                type="primary"
                className="mt-4"
                onClick={() => {
                  navigate("/profile");
                }}
              >
                Go to Profile
              </Button>
            </div>
          )}
        </div>
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
                handleAAWalletAction("zapIn", false);
              }}
              loading={zapInIsLoading}
              disabled={
                Number(investmentAmount) === 0 ||
                Number(investmentAmount) > tokenBalance
              }
            >
              Zap In {falseChains.length === 1 ? "true" : "false"}
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
            switch to{" "}
            {availableAssetChains.find((chain) => !chainStatus[chain])} Chain
          </Button>
        </div>
      </div>
    </div>
  );
}
