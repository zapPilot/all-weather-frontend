import { Button, Statistic, Switch } from "antd";
import TokenDropdownInput from "../../pages/views/TokenDropdownInput.jsx";
import ConfiguredConnectButton from "../../pages/ConnectButton";
import { getCurrentTimeSeconds } from "@across-protocol/app-sdk";
import { useState, useRef, useCallback, useMemo, memo } from "react";
import { TOKEN_ADDRESS_MAP } from "../../utils/general";
import ActionItem from "../common/ActionItem";
import { getMinimumTokenAmount } from "../../utils/environment.js";
import { getNextChain } from "../../utils/chainOrder";

const { Countdown } = Statistic;
const COUNTDOWN_TIME = 4;

const formatMinimumAmount = (amount) => {
  return amount
    ? `(min ${Number(amount)
        .toFixed(3)
        .replace(/\.?0+$/, "")})`
    : "";
};

const getCurrentChain = (chainId) => {
  return chainId?.name
    ?.toLowerCase()
    .replace(" one", "")
    .replace(" mainnet", "")
    .trim();
};

function ZapInTab({
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
  errorMsg,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [enableBridging, setEnableBridging] = useState(true);
  const enableBridgingRef = useRef(enableBridging);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const currentChain = useMemo(() => getCurrentChain(chainId), [chainId]);

  const falseChains = useMemo(
    () => availableAssetChains.filter((chain) => !chainStatus[chain]),
    [availableAssetChains, chainStatus],
  );

  const skipBridge = useMemo(
    () => availableAssetChains.length > falseChains.length,
    [availableAssetChains.length, falseChains.length],
  );

  const shouldSkipBridge = useCallback(() => {
    if (enableBridgingRef.current === false) {
      return true;
    }
    return skipBridge;
  }, [skipBridge]);

  const handleSwitchChain = useCallback(
    async (chain) => {
      setIsLoading(true);
      const deadlineTime = getCurrentTimeSeconds() + COUNTDOWN_TIME;
      setDeadline(deadlineTime * 1000);
      setShowCountdown(true);
      switchNextStepChain(chain);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    await new Promise((resolve) => {
      timeoutRef.current = setTimeout(resolve, COUNTDOWN_TIME * 1000);
    });


      setPreviousTokenSymbol(selectedToken.split("-")[0].toLowerCase());
      const tokenSymbol = selectedToken.split("-")[0].toLowerCase();
      if (tokenSymbol === "usdt") {
        const newSelectedToken = `usdc-${TOKEN_ADDRESS_MAP["usdc"][nextStepChain]}-6`;
        handleSetSelectedToken(newSelectedToken);
      }

      setShowCountdown(false);
      setIsLoading(false);
    },
    [
      selectedToken,
      nextStepChain,
      switchNextStepChain,
      handleSetSelectedToken,
      setPreviousTokenSymbol,
    ],
  );

  const renderCountdown = () => {
    if (!showCountdown || !deadline) return null;

    return (
      <div className="mb-4">
        <Countdown
          title="Bridging tokens..."
          value={deadline}
          onFinish={() => setShowCountdown(false)}
          style={{
            backgroundColor: "#ffffff",
            padding: "10px",
            borderRadius: "8px",
          }}
          className="text-white"
        />
      </div>
    );
  };

  const renderActionButton = () => {
    if (account === undefined) {
      return <ConfiguredConnectButton />;
    }

    const minimumTokenAmount = getMinimumTokenAmount(
      selectedToken,
      shouldSkipBridge(),
      portfolioHelper,
      tokenPricesMappingTable,
      currentChain,
    );

    const isButtonDisabled =
      Number(investmentAmount) === 0 ||
      Number(investmentAmount) > tokenBalance ||
      Number(investmentAmount) < minimumTokenAmount;

    return (
      <>
        <Button
          type="primary"
          className="w-full my-2"
          onClick={() => handleAAWalletAction("zapIn", shouldSkipBridge())}
          disabled={isButtonDisabled}
        >
          Zap In {formatMinimumAmount(minimumTokenAmount)}
        </Button>
        <Switch
          checkedChildren="Cross Chain"
          unCheckedChildren="Single Chain"
          defaultChecked={true}
          onChange={(checked) => {
            setEnableBridging(checked);
            enableBridgingRef.current = checked;
          }}
        />
      </>
    );
  };

  const renderSwitchChainButton = () => {
    const nextChain = getNextChain(
      availableAssetChains,
      chainStatus,
      currentChain,
    );
    const shouldShow = currentChain !== nextChain;

    if (!shouldShow) return null;

    return (
      <Button
        type="primary"
        className="w-full my-2"
        onClick={() => {
          handleSwitchChain(nextChain);
          setFinishedTxn(false);
        }}
        loading={isLoading}
      >
        Switch to {nextChain} Chain
      </Button>
    );
  };
  return (
    <div>
      <ActionItem
        tab="ZapIn"
        actionName="zapIn"
        availableAssetChains={availableAssetChains}
        currentChain={currentChain}
        chainStatus={chainStatus}
        theme="dark"
        isStarted={Object.values(chainStatus || {}).some((status) => status)}
        account={account}
        errorMsg={errorMsg}
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
        {renderActionButton()}
      </div>

      <div
        className={`mt-4 ${
          chainStatus[currentChain] && falseChains.length > 0
            ? "block"
            : "hidden"
        }`}
      >
        {renderCountdown()}
        {renderSwitchChainButton()}
      </div>
    </div>
  );
}

export default memo(ZapInTab);
