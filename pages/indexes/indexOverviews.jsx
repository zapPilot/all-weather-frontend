// copy from this Tailwind template: https://tailwindui.com/components/application-ui/page-examples/detail-screens
"use client";
import BasePage from "../basePage.tsx";
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  Suspense,
  lazy,
} from "react";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import Link from "next/link";
import Image from "next/image";
import { Signer } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import logger from "../../utils/logger";
import { base, arbitrum, optimism } from "thirdweb/chains";
import PopUpModal from "../Modal";
import {
  TOKEN_ADDRESS_MAP,
  CHAIN_ID_TO_CHAIN,
  CHAIN_TO_CHAIN_ID,
  CHAIN_ID_TO_CHAIN_STRING,
} from "../../utils/general.js";
import {
  ConfigProvider,
  Radio,
  notification,
  Spin,
  Tabs,
  Dropdown,
  Popover,
} from "antd";
import {
  useActiveAccount,
  useSendBatchTransaction,
  useActiveWalletChain,
  useWalletBalance,
  useSwitchActiveWalletChain,
  useSendAndConfirmCalls
} from "thirdweb/react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import axios from "axios";
import openNotificationWithIcon from "../../utils/notification.js";
import APRComposition from "../views/components/APRComposition";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { generateIntentTxns } from "../../classes/main.js";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { isAddress } from "ethers/lib/utils";
import styles from "../../styles/indexOverviews.module.css";
import tokens from "../views/components/slim_tokens.json";
import useTabItems from "../../hooks/useTabItems";
// Lazy load heavy portfolio components
const PortfolioSummary = lazy(() => import("../portfolio/PortfolioSummary"));
const PortfolioComposition = lazy(() =>
  import("../portfolio/PortfolioComposition"),
);
const HistoricalData = lazy(() => import("../portfolio/HistoricalData"));
const TransactionHistoryPanel = lazy(() =>
  import("../portfolio/TransactionHistoryPanel"),
);
import {
  safeSetLocalStorage,
  safeGetLocalStorage,
} from "../../utils/localStorage";
import { determineSlippage } from "../../utils/slippage";
import {
  normalizeChainName,
  getAvailableAssetChains,
  calCrossChainInvestmentAmount,
} from "../../utils/chainHelper";
import {
  getRebalanceReinvestUsdAmount,
  getTokenMetadata,
} from "../../utils/portfolioCalculation";
import { handleTransactionError } from "../../utils/transactionErrorHandler";
import {
  checkGasPrice,
  prepareTransactionMetadata,
} from "../../utils/transactionHelpers.js";
import { getNextChain } from "../../utils/chainOrder";
import { SettingsIcon } from "../../utils/icons.jsx";
import { useWalletMode } from "../contextWrappers/WalletModeContext.jsx";

// Extract chain switching logic
const useChainSwitching = (switchChain) => {
  const isProcessingChainChangeRef = useRef(false);
  const hasProcessedChainChangeRef = useRef(false);

  // Memoize chain mapping
  const chainMap = useMemo(
    () => ({
      arbitrum: arbitrum,
      base: base,
      op: optimism,
    }),
    [],
  );

  const switchNextStepChain = useCallback(
    (chain) => {
      const selectedChain = chainMap[chain];
      if (selectedChain) {
        switchChain(selectedChain);
      } else {
        logger.error(`Invalid chain: ${chain}`);
      }
    },
    [switchChain, chainMap],
  );

  return useMemo(
    () => ({
      switchNextStepChain,
      isProcessingChainChangeRef,
      hasProcessedChainChangeRef,
      chainMap,
    }),
    [switchNextStepChain, chainMap],
  );
};
const cleanupActionParams = (params) => {
  const cleanedParams = { ...params };

  // Clean up rebalancableUsdBalanceDict
  for (const key in cleanedParams.rebalancableUsdBalanceDict) {
    if (cleanedParams.rebalancableUsdBalanceDict[key].protocol) {
      delete cleanedParams.rebalancableUsdBalanceDict[key].protocol;
    }
  }

  // Remove non-serializable properties
  const propertiesToRemove = [
    "portfolioHelper",
    "chainMetadata",
    "setPlatformFee",
    "setTotalTradingLoss",
    "setTradingLoss",
  ];

  propertiesToRemove.forEach((prop) => {
    delete cleanedParams[prop];
  });

  return cleanedParams;
};
export default function IndexOverviews() {
  const router = useRouter();
  const { portfolioName } = router.query;
  const account = useActiveAccount();
  const chainId = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();

  // Use the extracted chain switching logic
  const {
    switchNextStepChain,
    isProcessingChainChangeRef,
    hasProcessedChainChangeRef,
  } = useChainSwitching(switchChain);

  const [selectedToken, setSelectedToken] = useState(null);
  const [previousTokenSymbol, setPreviousTokenSymbol] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [
    protocolAssetDustInWalletLoading,
    setProtocolAssetDustInWalletLoading,
  ] = useState(false);
  const [actionName, setActionName] = useState("");
  const [onlyThisChain, setOnlyThisChain] = useState(false);
  const [totalTradingLoss, setTotalTradingLoss] = useState(0);
  const [tradingLoss, setTradingLoss] = useState(0);
  const [platformFee, setPlatformFee] = useState(0);
  const [costsCalculated, setCostsCalculated] = useState(false);
  const [tabKey, setTabKey] = useState("");
  const [slippage, setSlippage] = useState(() =>
    determineSlippage({
      portfolioName,
      selectedTokenSymbol: selectedToken?.toLowerCase()?.split("-")[0],
      key: tabKey || "",
      actionName,
    }),
  );
  const [isSlippageManuallySet, setIsSlippageManuallySet] = useState(false);
  const [zapOutPercentage, setZapOutPercentage] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [rebalancableUsdBalanceDict, setRebalancableUsdBalanceDict] = useState(
    {},
  );
  const [recipient, setRecipient] = useState("");
  const [protocolAssetDustInWallet, setProtocolAssetDustInWallet] = useState(
    {},
  );

  const [usdBalanceLoading, setUsdBalanceLoading] = useState(false);
  const [pendingRewardsLoading, setPendingRewardsLoading] = useState(false);
  const [
    rebalancableUsdBalanceDictLoading,
    setRebalancableUsdBalanceDictLoading,
  ] = useState(false);

  const [principalBalance, setPrincipalBalance] = useState(0);
  const [open, setOpen] = useState(false);
  const [finishedTxn, setFinishedTxn] = useState(false);
  const [txnLink, setTxnLink] = useState("");
  const [tokenPricesMappingTable, setTokenPricesMappingTable] = useState({});
  const [lockUpPeriod, setLockUpPeriod] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();
  const [recipientError, setRecipientError] = useState(false);
  const [showZapIn, setShowZapIn] = useState(false);

  const preservedAmountRef = useRef(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { aaOn } = useWalletMode();
  const handleSetSelectedToken = useCallback((token) => {
    setSelectedToken(token);
    setPreviousTokenSymbol(token.split("-")[0].toLowerCase());
  }, []);
  const handleSetInvestmentAmount = useCallback((amount) => {
    setInvestmentAmount(amount);
  }, []);
  const portfolioHelper = getPortfolioHelper(portfolioName);
  const { mutate: sendBatchTransaction } = useSendBatchTransaction();
  const { mutate: sendCalls } = useSendAndConfirmCalls({ client: THIRDWEB_CLIENT });
  const {
    strategyMetadata: portfolioApr,
    loading,
    error,
  } = useSelector((state) => state.strategyMetadata);
  const dispatch = useDispatch();

  // Declare all state and derived values before callback functions
  const [nextStepChain, setNextStepChain] = useState("");
  const [chainStatus, setChainStatus] = useState({
    base: false,
    arbitrum: false,
    op: false,
  });
  const [nextChainInvestmentAmount, setNextChainInvestmentAmount] = useState(0);

  const currentChain = normalizeChainName(chainId?.name);
  const availableAssetChains = getAvailableAssetChains(portfolioHelper);

  const handleAAWalletAction = useCallback(
    async (actionName, onlyThisChain = false, handleStatusUpdate = null) => {
      const isGasPriceAcceptable = await checkGasPrice({
        chainId,
        THIRDWEB_CLIENT,
        notificationAPI,
      });
      if (!isGasPriceAcceptable) {
        return false;
      }
      if (actionName !== "convertDust") {
        setOpen(true);
      }
      setActionName(actionName);
      setOnlyThisChain(onlyThisChain);
      setCostsCalculated(false);
      setFinishedTxn(false);
      setPlatformFee(0);
      setTotalTradingLoss(0);
      setTradingLoss(0);
      setErrorMsg("");
      const tokenSymbolAndAddress = selectedToken.toLowerCase();

      if (!tokenSymbolAndAddress) {
        alert("Please select a token");
        return false;
      }
      if (!account) return false;

      const [tokenSymbol, tokenAddress, tokenDecimals] =
        tokenSymbolAndAddress.split("-");
      const actionParams = {
        actionName,
        chainMetadata:
          chainId?.name === undefined
            ? { name: CHAIN_ID_TO_CHAIN_STRING[chainId?.id], ...chainId }
            : chainId,
        portfolioHelper,
        accountAddress: account.address,
        tokenSymbol,
        tokenAddress,
        investmentAmount,
        tokenDecimals,
        zapOutPercentage,
        setTradingLoss,
        setTotalTradingLoss,
        setPlatformFee,
        slippage,
        rebalancableUsdBalanceDict,
        recipient,
        protocolAssetDustInWallet:
          protocolAssetDustInWallet?.[normalizeChainName(chainId?.name)] || {},
        protocolAssetDustInWalletLoading,
        onlyThisChain,
        usdBalance,
        tokenPricesMappingTable,
        handleStatusUpdate,
      };

      const handleError = async (error, context) => {
        const errorMessage = await handleTransactionError(
          context,
          error,
          notificationAPI,
          account?.address,
          chainId?.name,
          actionName,
          cleanupActionParams(actionParams),
        );
        if (errorMessage) {
          setErrorMsg(errorMessage);
        }
        return false;
      };

      try {
        const txns = await generateIntentTxns(actionParams);
        setCostsCalculated(true);
        if (
          [
            "zapIn",
            "zapOut",
            "crossChainRebalance",
            "localRebalance",
            "transfer",
            "convertDust",
          ].includes(actionName) &&
          txns.length < 2
        ) {
          throw new Error("No transactions to send");
        }
        // Reset the processing flag before changing chain
        hasProcessedChainChangeRef.current = false;
        preservedAmountRef.current = investmentAmount;
        const investmentAmountAfterFee =
          investmentAmount *
          (1 - portfolioHelper.entryFeeRate()) *
          (1 - slippage / 100);
        const chainWeight = calCrossChainInvestmentAmount(
          normalizeChainName(chainId?.name),
          portfolioHelper,
        );
        const chainWeightPerYourPortfolio =
          Object.values(rebalancableUsdBalanceDict)
            .filter(({ chain }) => chain === normalizeChainName(chainId?.name))
            .reduce((sum, value) => sum + value.usdBalance, 0) / usdBalance;
        // Return a promise that resolves when the transaction is successful
        return new Promise((resolve, reject) => {
          const transactionCallbacks = {
            onSuccess: async (data) => {
              console.log("transactionCallbacks data", data)
              const explorerUrl =
                data?.chain?.blockExplorers !== undefined
                  ? data.chain.blockExplorers[0].url
                  : `https://${CHAIN_ID_TO_CHAIN_STRING[
                    chainId?.id
                  ].toLowerCase()}.blockscout.com`;
  
              setChainStatus((prevStatus) => {
                const newStatus = { ...prevStatus, [currentChain]: true };
                const allChainsComplete = Object.values(newStatus).every(Boolean);
  
                if (allChainsComplete) {
                  (async () => {
                    try {
                      await axios({
                        method: "delete",
                        url: `${process.env.NEXT_PUBLIC_SDK_API_URL}/portfolio-cache/portfolio-${portfolioName}-${account.address}`,
                      });
                    } catch (error) {
                      logger.error("Failed to clear portfolio cache:", error);
                    }
                    setRefreshTrigger(Date.now());
                  })();
                }
  
                const nextChain = Object.entries(newStatus).find(
                  ([chain, isComplete]) => !isComplete,
                )?.[0];
                const notificationContent = allChainsComplete ? (
                  "All Chains Complete"
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Completed on</span>
                      <div className="flex items-center gap-1">
                        <Image
                          src={`/chainPicturesWebp/${currentChain?.toLowerCase()}.webp`}
                          alt={currentChain}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-medium">{currentChain}</span>
                      </div>
                      <span className="text-gray-500">→</span>
                      <div className="flex items-center gap-1">
                        <Image
                          src={`/chainPicturesWebp/${nextChain?.toLowerCase()}.webp`}
                          alt={nextChain}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-medium">{nextChain}</span>
                      </div>
                    </div>
                  </div>
                );
  
                openNotificationWithIcon(
                  notificationAPI,
                  notificationContent,
                  allChainsComplete ? "success" : "info",
                  `${explorerUrl}/tx/${data?.transactionHash || data?.receipts?.[0]?.transactionHash}`,
                );
  
                // Get the next chain using the updated status
                console.log("data?.chain?.name", data?.chain?.name, CHAIN_ID_TO_CHAIN?.[data?.chainId])
                const newNextChain = getNextChain(
                  availableAssetChains,
                  newStatus,
                  normalizeChainName(data?.chain?.name || CHAIN_ID_TO_CHAIN?.[data?.chainId]?.name)
                );
  
                // Update the next chain state
                setNextStepChain(newNextChain);
                return newStatus;
              });
  
              setFinishedTxn(true);
              setTxnLink(`${explorerUrl}/tx/${data.transactionHash}`);
  
              await axios({
                method: "post",
                url: `${process.env.NEXT_PUBLIC_API_URL}/transaction/category`,
                headers: { "Content-Type": "application/json" },
                data: {
                  user_api_key: "placeholder",
                  tx_hash: data.transactionHash,
                  address: account.address,
                  metadata: JSON.stringify(
                    prepareTransactionMetadata({
                      portfolioName,
                      actionName,
                      tokenSymbol,
                      investmentAmountAfterFee,
                      zapOutPercentage,
                      chainId,
                      chainWeightPerYourPortfolio,
                      usdBalance,
                      chainWeight,
                      rebalancableUsdBalanceDict,
                      pendingRewards,
                      portfolioHelper,
                      currentChain,
                      recipient,
                      protocolAssetDustInWallet,
                      onlyThisChain,
                    }),
                  ),
                  actionParams: cleanupActionParams(actionParams),
                },
              });
  
              if (actionName === "transfer") {
                await axios({
                  method: "post",
                  url: `${process.env.NEXT_PUBLIC_API_URL}/transaction/category`,
                  headers: { "Content-Type": "application/json" },
                  data: {
                    user_api_key: "placeholder",
                    tx_hash: data.transactionHash,
                    address: recipient,
                    metadata: JSON.stringify({
                      portfolioName,
                      actionName: "receive",
                      tokenSymbol,
                      investmentAmount: investmentAmountAfterFee,
                      timestamp: Math.floor(Date.now() / 1000),
                      chain: CHAIN_ID_TO_CHAIN_STRING[chainId?.id].toLowerCase(),
                      zapInAmountOnThisChain:
                        usdBalance *
                        zapOutPercentage *
                        chainWeightPerYourPortfolio,
                      sender: account.address,
                    }),
                  },
                });
              }
  
              // Resolve the promise with true to indicate success
              resolve(true);
            },
            onError: async (error) => {
              reject(await handleError(error, "Transaction Failed"));
            },
          };
          if (!aaOn) {
            sendCalls(
              {
                calls: txns.flat(Infinity).slice(0, 10),
                atomicRequired: true,
              },
              transactionCallbacks,
            );
          } else {
            sendBatchTransaction(txns.flat(Infinity), transactionCallbacks);
          }
        });
      } catch (error) {
        return handleError(error, "Transaction Failed");
      }
    },
    [
      chainId,
      notificationAPI,
      selectedToken,
      account,
      investmentAmount,
      zapOutPercentage,
      slippage,
      rebalancableUsdBalanceDict,
      recipient,
      protocolAssetDustInWallet,
      protocolAssetDustInWalletLoading,
      usdBalance,
      tokenPricesMappingTable,
      portfolioHelper,
      portfolioName,
      portfolioApr,
      pendingRewards,
      setOpen,
      setActionName,
      setOnlyThisChain,
      setCostsCalculated,
      setFinishedTxn,
      setPlatformFee,
      setTotalTradingLoss,
      setTradingLoss,
      setErrorMsg,
      setChainStatus,
      setNextStepChain,
      setTxnLink,
      setRefreshTrigger,
      currentChain,
      availableAssetChains,
      sendBatchTransaction,
    ],
  );

  // Handle tab changes
  const handleTabChange = (tabKey) => {
    setTabKey(tabKey);
    // Only set default slippage if user hasn't manually changed it
    if (!isSlippageManuallySet) {
      const newSlippage = determineSlippage({
        portfolioName,
        selectedTokenSymbol: selectedToken?.toLowerCase()?.split("-")[0],
        key: tabKey,
        actionName,
      });
      setSlippage(newSlippage);
    }
  };

  // Handle slippage input changes
  const handleSlippageChange = (e) => {
    const newSlippage = e.target.value;
    setSlippage(newSlippage);
    setIsSlippageManuallySet(true);
  };

  const tokenAddress = selectedToken?.split("-")[1];
  const { data: walletBalanceData } = useWalletBalance({
    chain: chainId,
    address: account?.address,
    client: THIRDWEB_CLIENT,
    ...(tokenAddress === "0x0000000000000000000000000000000000000000" &&
    nextStepChain === ""
      ? {}
      : tokenAddress === "0x0000000000000000000000000000000000000000" &&
        nextStepChain !== ""
      ? {
          tokenAddress:
            TOKEN_ADDRESS_MAP["weth"][normalizeChainName(chainId?.name)],
        }
      : { tokenAddress }),
  });
  const [tokenBalance, setTokenBalance] = useState(0);
  const yieldContent = (
    <>
      {portfolioHelper?.description()}
      <br />
      Click{" "}
      <Link
        href="https://all-weather-protocol.gitbook.io/all-weather-protocol/vault-strategy/stablecoin-vault"
        target="_blank"
        className="text-blue-400"
      >
        here
      </Link>{" "}
      for more information
    </>
  );

  useEffect(() => {
    if (
      portfolioApr[portfolioName] === undefined ||
      Object.keys(portfolioApr).length === 0
    ) {
      dispatch(fetchStrategyMetadata());
    }

    if (portfolioName !== undefined) {
      const selectedTokenSymbol = selectedToken?.toLowerCase()?.split("-")[0];
      const newSlippage = determineSlippage({
        portfolioName,
        selectedTokenSymbol,
        key: tabKey,
        actionName,
      });
      setSlippage(newSlippage);
    }
  }, [portfolioName, selectedToken, chainId, tabKey, actionName]);
  useEffect(() => {
    logger.time("🚀 Portfolio data fetch");
    // Clear states on initial load/refresh
    setUsdBalance(0);
    setUsdBalanceLoading(true);
    setPendingRewardsLoading(true);
    setRebalancableUsdBalanceDictLoading(true);
    setProtocolAssetDustInWalletLoading(true);

    if (!portfolioName || account === undefined || !chainId) {
      return;
    }

    // Add guard against multiple chain change processing
    if (isProcessingChainChangeRef.current) {
      return;
    }

    const fetchData = async () => {
      // TODO: use this signer to migrate to ZeroDev
      const signer = await ethers5Adapter.signer.toEthers({
        client: THIRDWEB_CLIENT,
        chain: chainId,
        account,
      });
      logger.log(`Signer is signer: ${Signer.isSigner(signer)}`);
      try {
        isProcessingChainChangeRef.current = true;
        // Check cache first
        const cachedData = await safeGetLocalStorage(
          `portfolio-${portfolioName}-${account.address}`,
          portfolioHelper,
          notificationAPI,
        );
        if (
          cachedData?.timestamp &&
          Date.now() - cachedData.timestamp < 3600 * 1000
        ) {
          // Use cached data - batch state updates to reduce re-renders
          const cachedUpdates = {
            tokenPricesMappingTable: cachedData.tokenPricesMappingTable,
            usdBalance: cachedData.usdBalance,
            usdBalanceLoading: false,
            rebalancableUsdBalanceDict: cachedData.usdBalanceDict,
            rebalancableUsdBalanceDictLoading: false,
            lockUpPeriod: cachedData.lockUpPeriod,
            pendingRewards: cachedData.pendingRewards,
            pendingRewardsLoading: false,
            protocolAssetDustInWallet: cachedData.dust,
            protocolAssetDustInWalletLoading: false,
          };

          // Apply all updates at once using React's batching
          setTokenPricesMappingTable(cachedUpdates.tokenPricesMappingTable);
          setUsdBalance(cachedUpdates.usdBalance);
          setUsdBalanceLoading(cachedUpdates.usdBalanceLoading);
          setRebalancableUsdBalanceDict(
            cachedUpdates.rebalancableUsdBalanceDict,
          );
          setRebalancableUsdBalanceDictLoading(
            cachedUpdates.rebalancableUsdBalanceDictLoading,
          );
          setLockUpPeriod(cachedUpdates.lockUpPeriod);
          setPendingRewards(cachedUpdates.pendingRewards);
          setPendingRewardsLoading(cachedUpdates.pendingRewardsLoading);
          setProtocolAssetDustInWallet(cachedUpdates.protocolAssetDustInWallet);
          setProtocolAssetDustInWalletLoading(
            cachedUpdates.protocolAssetDustInWalletLoading,
          );
          return;
        }

        // First fetch token prices if available for other calls
        const tokenPricesPromise =
          portfolioHelper.getTokenPricesMappingTable?.() || Promise.resolve({});
        const tokenPrices = await tokenPricesPromise;

        // Fetch ALL data in parallel instead of sequential calls
        const [usdBalanceResult, lockUpPeriod, pendingRewards, dust] =
          await Promise.all([
            portfolioHelper.usdBalanceOf(
              account.address,
              portfolioApr[portfolioName],
            ),
            portfolioHelper.lockUpPeriod(account.address),
            portfolioHelper.pendingRewards(
              account.address,
              () => {},
              tokenPrices,
            ),
            portfolioHelper.calProtocolAssetDustInWalletDictionary(
              account.address,
              tokenPrices,
            ),
          ]);

        logger.timeEnd("🚀 Portfolio data fetch");

        const [usdBalance, usdBalanceDict, tokenPricesMappingTable] =
          usdBalanceResult;
        // Calculate dust total USD balance efficiently
        const dustTotalUsdBalance = Object.values(dust).reduce(
          (sum, protocolObj) =>
            sum +
            Object.values(protocolObj).reduce(
              (protocolSum, asset) =>
                protocolSum + (Number(asset.assetUsdBalanceOf) || 0),
              0,
            ),
          0,
        );

        const finalUsdBalance = usdBalance + dustTotalUsdBalance;

        // Batch all state updates to minimize re-renders
        setTokenPricesMappingTable(tokenPricesMappingTable);
        setUsdBalance(finalUsdBalance);
        setUsdBalanceLoading(false);
        setRebalancableUsdBalanceDict(usdBalanceDict);
        setRebalancableUsdBalanceDictLoading(false);
        setLockUpPeriod(lockUpPeriod);
        setPendingRewards(pendingRewards.pendingRewardsDict);
        setPendingRewardsLoading(false);
        setProtocolAssetDustInWallet(dust);
        setProtocolAssetDustInWalletLoading(false);

        // Cache the fresh data
        try {
          await safeSetLocalStorage(
            `portfolio-${portfolioName}-${account.address}`,
            {
              tokenPricesMappingTable,
              usdBalance: finalUsdBalance,
              usdBalanceDict,
              lockUpPeriod: lockUpPeriod,
              pendingRewards: pendingRewards.pendingRewardsDict,
              dust,
              timestamp: Date.now(),
            },
            notificationAPI,
          );
        } catch (error) {
          logger.warn("Failed to cache portfolio data:", error);
        }
        setErrorMsg("");
      } catch (error) {
        handleTransactionError(
          "Fetching Data Failed",
          error,
          notificationAPI,
          account?.address,
          chainId?.name,
          "fetchData",
          {},
        );
        setErrorMsg(error.message);
      } finally {
        isProcessingChainChangeRef.current = false;
      }
    };

    const timeoutId = setTimeout(fetchData, 500);

    return () => {
      clearTimeout(timeoutId);
      isProcessingChainChangeRef.current = false;
    };
  }, [portfolioName, account, chainId, refreshTrigger]);
  useEffect(() => {
    return () => {
      isProcessingChainChangeRef.current = false;
      hasProcessedChainChangeRef.current = false;
    };
  }, []);
  useEffect(() => {
    const balance = walletBalanceData?.displayValue;
    setTokenBalance(balance);
  }, [selectedToken, walletBalanceData, investmentAmount]);

  const validateRecipient = (address) => {
    if (address === account?.address) {
      setRecipientError(true);
      return;
    }
    const isValid = isAddress(address);
    setRecipientError(!isValid);
    setRecipient(address);
  };

  useEffect(() => {
    let cleanupTimeoutId;

    const getDefaultTokenMetadata = () => {
      if (previousTokenSymbol) {
        const tokenSymbol =
          previousTokenSymbol === "eth" && nextStepChain !== ""
            ? "weth"
            : previousTokenSymbol;
        const metadata = getTokenMetadata(chainId, tokenSymbol, tokens);
        if (metadata) return { metadata, tokenSymbol };
      }
      return {
        metadata: getTokenMetadata(chainId, "usdc", tokens),
        tokenSymbol: "usdc",
      };
    };

    try {
      isProcessingChainChangeRef.current = true;

      const { metadata, tokenSymbol } = getDefaultTokenMetadata();

      if (metadata) {
        // For ETH -> WETH conversion
        if (previousTokenSymbol === "eth" && tokenSymbol === "weth") {
          if (!hasProcessedChainChangeRef.current && investmentAmount > 0) {
            preservedAmountRef.current = investmentAmount;
            hasProcessedChainChangeRef.current = true;
          }
        }

        setSelectedToken(metadata);

        // Use preserved amount if available
        if (preservedAmountRef.current !== null) {
          setInvestmentAmount(preservedAmountRef.current);
        }
      }
    } finally {
      // Reset processing flag after a short delay
      cleanupTimeoutId = setTimeout(() => {
        isProcessingChainChangeRef.current = false;
      }, 100);
    }

    return () => {
      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId);
      }
    };
  }, [chainId, previousTokenSymbol, nextStepChain]);

  // Add this function outside useEffect
  const handleRefresh = useCallback(async () => {
    if (!portfolioName || !account?.address) return;

    // Clear cached data
    await axios({
      method: "delete",
      url: `${process.env.NEXT_PUBLIC_SDK_API_URL}/portfolio-cache/portfolio-${portfolioName}-${account.address}`,
    });

    // Reset states
    setUsdBalance(0);
    setUsdBalanceLoading(true);
    setPendingRewardsLoading(true);
    setProtocolAssetDustInWalletLoading(true);

    // Trigger the useEffect by updating a dependency
    setRefreshTrigger(Date.now());
  }, [portfolioName, account]);

  const tabProps = useMemo(
    () => ({
      CHAIN_ID_TO_CHAIN,
      CHAIN_TO_CHAIN_ID,
      account,
      chainId,
      getRebalanceReinvestUsdAmount,
      handleAAWalletAction,
      handleSetInvestmentAmount,
      handleSetSelectedToken,
      investmentAmount,
      nextChainInvestmentAmount,
      nextStepChain,
      portfolioApr,
      portfolioHelper,
      portfolioName,
      protocolAssetDustInWallet,
      protocolAssetDustInWalletLoading,
      rebalancableUsdBalanceDict,
      recipient,
      recipientError,
      selectedToken,
      finishedTxn,
      setFinishedTxn,
      setInvestmentAmount,
      setNextChainInvestmentAmount,
      setPreviousTokenSymbol,
      setShowZapIn,
      setZapOutPercentage,
      showZapIn,
      switchChain,
      switchNextStepChain,
      tokenBalance,
      tokenPricesMappingTable,
      usdBalance,
      usdBalanceLoading,
      validateRecipient,
      walletBalanceData,
      zapOutPercentage,
      pendingRewards,
      pendingRewardsLoading,
      availableAssetChains,
      chainStatus,
      onRefresh: handleRefresh,
      lockUpPeriod,
      rebalancableUsdBalanceDictLoading,
      errorMsg,
    }),
    [
      account,
      chainId,
      handleAAWalletAction,
      handleSetInvestmentAmount,
      handleSetSelectedToken,
      investmentAmount,
      nextChainInvestmentAmount,
      nextStepChain,
      portfolioApr,
      portfolioHelper,
      portfolioName,
      protocolAssetDustInWallet,
      protocolAssetDustInWalletLoading,
      rebalancableUsdBalanceDict,
      recipient,
      recipientError,
      selectedToken,
      finishedTxn,
      tokenBalance,
      tokenPricesMappingTable,
      usdBalance,
      usdBalanceLoading,
      validateRecipient,
      walletBalanceData,
      zapOutPercentage,
      pendingRewards,
      pendingRewardsLoading,
      availableAssetChains,
      chainStatus,
      handleRefresh,
      lockUpPeriod,
      rebalancableUsdBalanceDictLoading,
      errorMsg,
    ],
  );

  const items = useTabItems({
    ...tabProps,
    // Add setSlippage to tabProps
    setSlippage,
    // Add portfolioName to tabProps if not already included
    portfolioName,
  });
  return (
    <BasePage chainId={chainId} switchChain={switchChain}>
      {notificationContextHolder}
      <PopUpModal
        account={account}
        portfolioHelper={portfolioHelper}
        tradingLoss={tradingLoss}
        totalTradingLoss={totalTradingLoss}
        open={open ?? false}
        setOpen={setOpen}
        chainId={
          chainId?.name === undefined
            ? { name: CHAIN_ID_TO_CHAIN_STRING[chainId?.id], ...chainId }
            : chainId
        }
        finishedTxn={finishedTxn}
        txnLink={txnLink}
        portfolioAPR={portfolioApr[portfolioName]?.portfolioAPR}
        actionName={actionName}
        onlyThisChain={onlyThisChain}
        selectedToken={selectedToken}
        investmentAmount={investmentAmount}
        costsCalculated={costsCalculated}
        platformFee={platformFee}
        rebalancableUsdBalanceDict={rebalancableUsdBalanceDict}
        chainMetadata={chainId}
        rebalanceAmount={getRebalanceReinvestUsdAmount(
          chainId?.name,
          rebalancableUsdBalanceDict,
          pendingRewards,
          portfolioHelper,
        )}
        zapOutAmount={usdBalance * zapOutPercentage}
        availableAssetChains={availableAssetChains}
        currentChain={currentChain}
        chainStatus={chainStatus || {}}
        currentTab={tabKey}
        allChainsComplete={Object.values(chainStatus || {}).every(Boolean)}
        errorMsg={errorMsg}
        tokenPricesMappingTable={tokenPricesMappingTable}
      />
      <main className={styles.bgStyle}>
        <header className="relative isolate pt-6">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="sm:flex items-center justify-between gap-x-6">
              <div className="flex items-center">
                <Image
                  alt={`${portfolioName} logo`}
                  src={`/indexFunds/${encodeURIComponent(
                    portfolioName?.toLowerCase(),
                  )}.webp`}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full me-2"
                  onError={(e) => {
                    e.target.src = "/tokenPictures/usdc.webp";
                  }}
                  priority
                />
                <h1 className="text-2xl font-bold text-white" role="vault">
                  {portfolioName}
                </h1>
              </div>
              <div className="flex items-center justify-between sm:justify-normal gap-x-8 text-white mt-3 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon
                    aria-hidden="true"
                    className="h-6 w-6 text-green-600"
                  />
                  <Popover
                    content="Zap Pilot is a zero-smart-contract protocol. It's a pure JavaScript project built with an Account Abstraction (AA) wallet. Here is the audit report for the AA wallet."
                    trigger="hover"
                  >
                    <span className="text-white">
                      Audit Report:{" "}
                      <a
                        href="https://thirdweb.com/explore/smart-wallet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline"
                      >
                        View here
                      </a>
                    </span>
                  </Popover>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    $ {portfolioApr[portfolioName]?.portfolioTVL}
                  </p>
                  <p className="font-medium">TVL</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" role="apr">
                    {loading === true ? (
                      <Spin />
                    ) : (
                      (portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(
                        2,
                      )
                    )}
                    %
                    <APRComposition
                      APRData={pendingRewards}
                      mode="pendingRewards"
                      currency="$"
                      exchangeRateWithUSD={1}
                      pendingRewardsLoading={pendingRewardsLoading}
                    />
                  </p>
                  <p className="font-medium">APR</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-8 p-4 border border-white/50 relative">
            <div className="flex items-center justify-end">
              <div className="w-20 h-8 flex items-center justify-center rounded-md bg-white text-black">
                <span className="me-2">{slippage}%</span>
                <Dropdown
                  dropdownRender={() => (
                    <div className="bg-gray-700 text-white rounded-xl p-4 shadow-lg space-y-4 pb-6">
                      <p>Max Slippage: </p>
                      <Radio.Group
                        value={slippage}
                        buttonStyle="solid"
                        size="small"
                        onChange={handleSlippageChange}
                      >
                        {[0.5, 1, 3, 5, 10, 50].map((slippageValue) => (
                          <Radio.Button
                            value={slippageValue}
                            key={slippageValue}
                          >
                            {slippageValue}%
                          </Radio.Button>
                        ))}
                      </Radio.Group>
                    </div>
                  )}
                  trigger={["click"]}
                  placement="bottom"
                >
                  <a className="text-black" onClick={(e) => e.preventDefault()}>
                    <SettingsIcon />
                  </a>
                </Dropdown>
              </div>
            </div>
            <ConfigProvider
              theme={{
                components: {
                  Tabs: {
                    horizontalItemGutter: 16,
                  },
                },
                token: {
                  colorBgContainerDisabled: "rgb(156, 163, 175)",
                },
              }}
            >
              <Tabs
                className="text-white"
                defaultActiveKey="1"
                items={items}
                onChange={handleTabChange}
              />
            </ConfigProvider>

            <div className="mt-2 flex align-items-center">
              ⛽<span className="text-emerald-400">Free</span>
            </div>
          </div>
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-2 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <Suspense
              fallback={
                <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>
              }
            >
              <PortfolioComposition
                portfolioName={portfolioName}
                portfolioHelper={portfolioHelper}
                portfolioApr={portfolioApr}
                loading={loading}
                usdBalanceLoading={usdBalanceLoading}
                lockUpPeriod={lockUpPeriod}
                yieldContent={yieldContent}
              />
            </Suspense>

            <Suspense
              fallback={
                <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>
              }
            >
              <PortfolioSummary
                usdBalanceLoading={usdBalanceLoading}
                tokenPricesMappingTable={tokenPricesMappingTable}
                usdBalance={usdBalance}
                account={account}
                principalBalance={principalBalance}
                onRefresh={handleRefresh}
                rebalancableUsdBalanceDict={rebalancableUsdBalanceDict}
                portfolioHelper={portfolioHelper}
              />
            </Suspense>

            <Suspense
              fallback={
                <div className="animate-pulse bg-gray-700 h-32 rounded-lg"></div>
              }
            >
              <HistoricalData portfolioName={portfolioName} />
            </Suspense>

            <Suspense
              fallback={
                <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>
              }
            >
              <TransactionHistoryPanel
                setPrincipalBalance={setPrincipalBalance}
                tokenPricesMappingTable={tokenPricesMappingTable}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </BasePage>
  );
}
