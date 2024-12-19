// copy from this Tailwind template: https://tailwindui.com/components/application-ui/page-examples/detail-screens
"use client";
import BasePage from "../basePage.tsx";
import { useState, useCallback, useEffect } from "react";
import DecimalStep from "./DecimalStep";
import Image from "next/image";
import Link from "next/link";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useDispatch, useSelector } from "react-redux";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import TransacitonHistory from "./transactionHistory.jsx";
import HistoricalDataChart from "../views/HistoricalDataChart.jsx";
import ConfiguredConnectButton from "../ConnectButton";
import { base, arbitrum } from "thirdweb/chains";
import PopUpModal from "../Modal";
import {
  Button,
  ConfigProvider,
  Radio,
  notification,
  Spin,
  Tabs,
  Dropdown,
  Popover,
  Input,
  Space,
} from "antd";
import TokenDropdownInput from "../views/TokenDropdownInput.jsx";
import {
  useActiveAccount,
  useSendBatchTransaction,
  useActiveWalletChain,
  useWalletBalance,
  useSwitchActiveWalletChain,
} from "thirdweb/react";

import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { formatBalance } from "../../utils/general.js";
import axios from "axios";
import openNotificationWithIcon from "../../utils/notification.js";
import APRComposition from "../views/components/APRComposition";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { generateIntentTxns } from "../../classes/main.js";
import {
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
} from "@heroicons/react/20/solid";
import {
  SettingOutlined,
  InfoCircleOutlined,
  DownOutlined,
} from "@ant-design/icons";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { isAddress } from "ethers/lib/utils";
import styles from "../../styles/indexOverviews.module.css";
import tokens from "../views/components/tokens.json";
export default function IndexOverviews() {
  const router = useRouter();
  const { portfolioName } = router.query;
  const account = useActiveAccount();
  const chainId = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const switchItems = [
    {
      key: "1",
      label: (
        <Button type="link" onClick={() => switchChain(arbitrum)}>
          <Image
            src={`/chainPicturesWebp/arbitrum.webp`}
            alt="arbitrum"
            height={22}
            width={22}
            className="rounded-full"
          />
        </Button>
      ),
    },
    {
      key: "2",
      label: (
        <Button type="link" onClick={() => switchChain(base)}>
          <Image
            src={`/chainPicturesWebp/base.webp`}
            alt="base"
            height={22}
            width={22}
            className="rounded-full"
          />
        </Button>
      ),
    },
  ];

  const getDefaultToken = (chainId) => {
    if (!chainId) return null;

    const chainTokens =
      tokens.props.pageProps.tokenList[String(chainId?.id)] || [];
    if (!Array.isArray(chainTokens)) {
      return null;
    }

    const usdcToken = chainTokens.find(
      (token) => token.symbol?.toLowerCase() === "usdc",
    );

    if (!usdcToken) {
      return null;
    }

    return `${usdcToken.symbol}-${usdcToken.value}-${usdcToken.decimals}`;
  };

  const [selectedToken, setSelectedToken] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [zapInIsLoading, setZapInIsLoading] = useState(false);
  const [zapOutIsLoading, setZapOutIsLoading] = useState(false);
  const [claimIsLoading, setClaimIsLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [rebalanceIsLoading, setRebalanceIsLoading] = useState(false);
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
  const [stepName, setStepName] = useState("");
  const [slippage, setSlippage] = useState(
    portfolioName === "Stablecoin Vault" ? 0.5 : 3,
  );
  const [zapOutPercentage, setZapOutPercentage] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [rebalancableUsdBalanceDict, setrebalancableUsdBalanceDict] =
    useState(0);
  const [recipient, setRecipient] = useState("");
  const [protocolAssetDustInWallet, setProtocolAssetDustInWallet] = useState(
    {},
  );

  const [usdBalanceLoading, setUsdBalanceLoading] = useState(false);
  const [pendingRewardsLoading, setPendingRewardsLoading] = useState(false);
  const [
    rebalancableUsdBalanceDictLoading,
    setrebalancableUsdBalanceDictLoading,
  ] = useState(false);

  const [principalBalance, setPrincipalBalance] = useState(0);
  const [open, setOpen] = useState(false);
  const [finishedTxn, setFinishedTxn] = useState(false);
  const [txnLink, setTxnLink] = useState("");
  const [tokenPricesMappingTable, setTokenPricesMappingTable] = useState({});
  const [tabKey, setTabKey] = useState("");
  const [lockUpPeriod, setLockUpPeriod] = useState(0);

  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();
  const [recipientError, setRecipientError] = useState(false);

  const handleSetSelectedToken = useCallback((token) => {
    setSelectedToken(token);
  }, []);
  const handleSetInvestmentAmount = useCallback((amount) => {
    setInvestmentAmount(amount);
  }, []);
  const portfolioHelper = getPortfolioHelper(portfolioName);
  const { mutate: sendBatchTransaction } = useSendBatchTransaction();
  const {
    strategyMetadata: portfolioApr,
    loading,
    error,
  } = useSelector((state) => state.strategyMetadata);
  const dispatch = useDispatch();

  const handleAAWalletAction = async (actionName, onlyThisChain = false) => {
    setOpen(true);
    setActionName(actionName);
    setOnlyThisChain(onlyThisChain);
    setCostsCalculated(false);
    setFinishedTxn(false);
    setPlatformFee(0);
    setTotalTradingLoss(0);
    setTradingLoss(0);
    setStepName("");

    const tokenSymbolAndAddress = selectedToken.toLowerCase();
    if (!tokenSymbolAndAddress) {
      alert("Please select a token");
      return;
    }
    if (actionName === "zapIn") {
      setZapInIsLoading(true);
    } else if (actionName === "zapOut") {
      setZapOutIsLoading(true);
    } else if (actionName === "claimAndSwap") {
      setClaimIsLoading(true);
    } else if (actionName === "rebalance") {
      setRebalanceIsLoading(true);
    } else if (actionName === "transfer") {
      setTransferLoading(true);
    } else if (actionName === "stake") {
      setZapInIsLoading(true);
    } else {
      throw new Error(`Invalid action name: ${actionName}`);
    }
    if (!account) return;
    const [tokenSymbol, tokenAddress, tokenDecimals] =
      tokenSymbolAndAddress.split("-");
    try {
      const txns = await generateIntentTxns(
        actionName,
        chainId,
        portfolioHelper,
        account.address,
        tokenSymbol,
        tokenAddress,
        investmentAmount,
        tokenDecimals,
        zapOutPercentage,
        setTradingLoss,
        setStepName,
        setTotalTradingLoss,
        setPlatformFee,
        slippage,
        rebalancableUsdBalanceDict,
        recipient,
        protocolAssetDustInWallet[
          chainId?.name.toLowerCase().replace(" one", "")
        ],
        onlyThisChain,
      );
      setCostsCalculated(true);
      if (txns.length < 2) {
        throw new Error("No transactions to send");
      }
      // Call sendBatchTransaction and wait for the result
      try {
        await new Promise((resolve, reject) => {
          sendBatchTransaction(txns.flat(Infinity), {
            onSuccess: async (data) => {
              try {
                await axios({
                  method: "post",
                  url: `${process.env.NEXT_PUBLIC_API_URL}/transaction/category`,
                  headers: {
                    "Content-Type": "application/json",
                  },
                  data: {
                    user_api_key: "placeholder",
                    tx_hash: data.transactionHash,
                    address: account.address,
                    metadata: JSON.stringify({
                      portfolioName,
                      actionName,
                      tokenSymbol,
                      investmentAmount:
                        investmentAmount *
                        (1 - slippage / 100 - portfolioHelper.swapFeeRate()),
                      zapOutAmount: usdBalance * zapOutPercentage,
                      rebalanceAmount: getRebalanceReinvestUsdAmount(),
                      timestamp: Math.floor(Date.now() / 1000),
                      swapFeeRate: portfolioHelper.swapFeeRate(),
                      referralFeeRate: portfolioHelper.referralFeeRate(),
                      chain: chainId.name.toLowerCase(),
                    }),
                  },
                });
              } catch (error) {
                console.log("error", error);
              }
              openNotificationWithIcon(
                notificationAPI,
                "Transaction Result",
                "success",
                `${data.chain.blockExplorers[0].url}/tx/${data.transactionHash}`,
              );
              resolve(data); // Resolve the promise successfully
              setFinishedTxn(true);
              // get current chain from Txn data
              const newNextChain = switchNextChain(data.chain.name);
              setNextStepChain(newNextChain);
              setTxnLink(
                `${data.chain.blockExplorers[0].url}/tx/${data.transactionHash}`,
              );
            },
            onError: (error) => {
              reject(error); // Reject the promise with the error
            },
          });
        });
      } catch (error) {
        let errorReadableMsg;
        if (
          error.message.includes("0x495d907f") ||
          error.message.includes("0x203d82d8")
        ) {
          errorReadableMsg = "Bridge quote expired, please try again";
        } else if (error.message.includes("User rejected the request")) {
          return;
        } else {
          errorReadableMsg =
            "Increase Slippage and Try Again! error:" + error.message;
        }
        openNotificationWithIcon(
          notificationAPI,
          "Transaction Result",
          "error",
          errorReadableMsg,
        );
      }
    } catch (error) {
      const errorMsg =
        error.name === "AxiosError"
          ? error.response?.data?.message
          : error.message;
      openNotificationWithIcon(
        notificationAPI,
        "Generate Transaction Error",
        "error",
        errorMsg,
      );
    }
    if (actionName === "zapIn") {
      setZapInIsLoading(false);
    } else if (actionName === "zapOut") {
      setZapOutIsLoading(false);
    } else if (actionName === "claimAndSwap") {
      setClaimIsLoading(false);
    } else if (actionName === "rebalance") {
      setRebalanceIsLoading(false);
    } else if (actionName === "stake") {
      setZapInIsLoading(false);
    }
  };

  const [nextStepChain, setNextStepChain] = useState("");
  const switchNextChain = (chain) => {
    const nextChain = chain.includes(" ")
      ? chain.toLowerCase().replace(" one", "")
      : chain;
    return nextChain === "arbitrum" ? "base" : "arbitrum";
  };
  const switchNextStepChain = (chain, action) => {
    chain === "arbitrum" ? switchChain(arbitrum) : switchChain(base);
  };

  // calculate the total investment amount
  const allInvestmentAmount =
    investmentAmount * (1 - slippage / 100 - portfolioHelper?.swapFeeRate());
  // calculate the investment amount for next chain
  const calCrossChainInvestmentAmount = (nextChain) => {
    const chainWeight = Object.entries(portfolioHelper.strategy).reduce(
      (sum, [category, protocols]) => {
        return (
          sum +
          Object.entries(protocols).reduce(
            (innerSum, [chain, protocolArray]) => {
              if (chain === nextChain) {
                console.log("nextChain", nextChain);
                return (
                  innerSum +
                  protocolArray.reduce((weightSum, protocol) => {
                    console.log("protocol", protocol);
                    console.log("weightSum", weightSum);
                    return weightSum + protocol.weight;
                  }, 0)
                );
              }
              return innerSum;
            },
            0,
          )
        );
      },
      0,
    );
    return allInvestmentAmount * chainWeight;
  };
  const [nextChainInvestmentAmount, setNextChainInvestmentAmount] = useState(0);

  const onChange = (key) => {
    setTabKey(key);
  };

  const tokenAddress = selectedToken?.split("-")[1];
  const { data: walletBalanceData, isLoading: walletBalanceLoading } =
    useWalletBalance({
      chain: chainId,
      address: account?.address,
      client: THIRDWEB_CLIENT,
      tokenAddress,
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

  const getRebalanceReinvestUsdAmount = () => {
    return (
      Object.values(rebalancableUsdBalanceDict).reduce(
        (sum, { usdBalance, zapOutPercentage }) => {
          return zapOutPercentage > 0
            ? sum + usdBalance * zapOutPercentage
            : sum;
        },
        0,
      ) + portfolioHelper?.sumUsdDenominatedValues(pendingRewards)
    );
  };
  const calCurrentAPR = (rebalancableUsdBalanceDict) =>
    Object.values(rebalancableUsdBalanceDict).reduce(
      (sum, { currentWeight, APR }) => currentWeight * APR + sum,
      0,
    ) || 0;

  const items = [
    {
      key: "1",
      label: "Zap In",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div
              className={`mt-4 sm:mt-0 ${nextStepChain ? "hidden" : "block"}`}
            >
              <p>
                Step 1: Choose a chain to zap in and bridge to another chain.
              </p>
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
                  switchNextStepChain(nextStepChain);
                  setNextChainInvestmentAmount(
                    calCrossChainInvestmentAmount(nextStepChain),
                  );
                }}
              >
                switch to {nextStepChain} Chain
              </Button>
            </div>
            <div
              className={`mt-4 ${
                nextChainInvestmentAmount > 0 ? "block" : "hidden"
              }`}
            >
              <p>
                Step 3: After calculating the investment amount, click to zap
                in.
              </p>
              {slippage > 1 ? (
                ((nextChainInvestmentAmount -
                  parseFloat(walletBalanceData?.displayValue)) /
                  nextChainInvestmentAmount) *
                  100 >
                slippage
              ) : ((nextChainInvestmentAmount -
                  parseFloat(walletBalanceData?.displayValue)) /
                  nextChainInvestmentAmount) *
                  100 >
                1 ? (
                <p className="text-red-400">
                  Please send more tokens to your AA Wallet to continue.
                  <br />
                  Click on the top-right corner to get your AA Wallet address.
                </p>
              ) : ((nextChainInvestmentAmount -
                  parseFloat(walletBalanceData?.displayValue)) /
                  nextChainInvestmentAmount) *
                  100 >
                0 ? (
                <Button
                  type="primary"
                  className={`w-full my-2 ${
                    investmentAmount > 0 ? "hidden" : "block"
                  }`}
                  onClick={() => {
                    setInvestmentAmount(
                      parseFloat(walletBalanceData?.displayValue),
                    );
                    setFinishedTxn(false);
                  }}
                >
                  Set Investment Amount to{" "}
                  {parseFloat(walletBalanceData?.displayValue)} on{" "}
                  {nextStepChain} Chain
                </Button>
              ) : (
                <Button
                  type="primary"
                  className={`w-full my-2 ${
                    investmentAmount > 0 ? "hidden" : "block"
                  }`}
                  onClick={() => {
                    setInvestmentAmount(nextChainInvestmentAmount);
                    setFinishedTxn(false);
                  }}
                >
                  Set Investment Amount to {nextChainInvestmentAmount} on{" "}
                  {nextStepChain} Chain
                </Button>
              )}
              <Button
                type="primary"
                className={`w-full my-2 ${
                  investmentAmount > 0 ? "block" : "hidden"
                }`}
                onClick={() => handleAAWalletAction("zapIn", true)}
                loading={zapInIsLoading}
                disabled={
                  Number(investmentAmount) === 0 ||
                  Number(investmentAmount) > tokenBalance
                }
              >
                Zap In
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: "Rebalance",
      children: (
        <div>
          <p>Step 1: Rebalance to boost APR on arbitrum chain.</p>
          <Button
            className="w-full mt-2"
            type="primary"
            onClick={() => handleAAWalletAction("rebalance", true)}
            loading={rebalanceIsLoading || rebalancableUsdBalanceDictLoading}
            disabled={
              getRebalanceReinvestUsdAmount() / usdBalance <
                portfolioHelper?.rebalanceThreshold() || usdBalance <= 0
            }
          >
            {calCurrentAPR(rebalancableUsdBalanceDict) >
            portfolioApr[portfolioName]?.portfolioAPR * 100 ? (
              "Take Profit"
            ) : (
              <>
                Boost APR from{" "}
                <span className="text-red-500">
                  {calCurrentAPR(rebalancableUsdBalanceDict).toFixed(2)}%{" "}
                </span>
                to{" "}
                <span className="text-green-400">
                  {(portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(2)}
                  %
                </span>{" "}
                for
                {formatBalance(getRebalanceReinvestUsdAmount())}
              </>
            )}
          </Button>
          <p>Step 2: Switch to base chain and zap in again.</p>
          <Button
            type="primary"
            className={`w-full my-2 
              ${
                chainId?.name.toLowerCase().replace(" one", "").trim() ===
                "arbitrum"
                  ? "block"
                  : "hidden"
              }`}
            onClick={() => switchChain(base)}
            loading={rebalanceIsLoading || rebalancableUsdBalanceDictLoading}
            disabled={
              getRebalanceReinvestUsdAmount() / usdBalance <
                portfolioHelper?.rebalanceThreshold() || usdBalance <= 0
            }
          >
            switch to base Chain
          </Button>
          <div
            className={`mt-4 ${
              chainId?.name.toLowerCase().replace(" one", "").trim() === "base"
                ? "block"
                : "hidden"
            }`}
          >
            <TokenDropdownInput
              selectedToken={selectedToken}
              setSelectedToken={handleSetSelectedToken}
              setInvestmentAmount={handleSetInvestmentAmount}
            />
            <Button
              type="primary"
              className="w-full my-2"
              onClick={() => handleAAWalletAction("zapIn", true)}
              loading={zapInIsLoading}
              disabled={
                Number(investmentAmount) === 0 ||
                Number(investmentAmount) > tokenBalance
              }
            >
              Enter amount to Zap In on current chain
            </Button>
          </div>
          <div className="text-gray-400">
            Rebalance Cost: {portfolioHelper?.swapFeeRate() * 100}%
          </div>
          {calCurrentAPR(rebalancableUsdBalanceDict) >
          portfolioApr[portfolioName]?.portfolioAPR * 100 ? (
            <>
              {formatBalance(getRebalanceReinvestUsdAmount())} has outperformed.
              It&apos;s time to rebalance and take the profit!
            </>
          ) : null}
        </div>
      ),
    },
    {
      key: "3",
      label: "Zap Out",
      children: (
        <div>
          <DecimalStep
            selectedToken={selectedToken}
            setSelectedToken={handleSetSelectedToken}
            depositBalance={usdBalance}
            setZapOutPercentage={setZapOutPercentage}
            currency="$"
            noTokenSelect={false}
          />
          {account === undefined ? (
            <ConfiguredConnectButton />
          ) : (
            <Button
              type="primary"
              className="w-full"
              onClick={() => handleAAWalletAction("zapOut", true)}
              loading={zapOutIsLoading || usdBalanceLoading}
              disabled={usdBalance < 0.01 || zapOutPercentage === 0}
            >
              Withdraw
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "4",
      label: "Transfer",
      children: (
        <div>
          <DecimalStep
            selectedToken={selectedToken}
            setSelectedToken={handleSetSelectedToken}
            depositBalance={usdBalance}
            setZapOutPercentage={setZapOutPercentage}
            currency="$"
            noTokenSelect={true}
          />
          <Input
            status={recipientError ? "error" : ""}
            placeholder="Recipient Address"
            onChange={(e) => validateRecipient(e.target.value)}
            value={recipient}
          />
          {recipientError && (
            <div className="text-red-500 text-sm mt-1">
              Please enter a valid Ethereum address different from your own
            </div>
          )}
          {account === undefined ? (
            <ConfiguredConnectButton />
          ) : (
            <Button
              type="primary"
              className="w-full"
              onClick={() => handleAAWalletAction("transfer", true)}
              loading={transferLoading || usdBalanceLoading}
              disabled={usdBalance < 0.01 || recipientError}
            >
              Transfer
            </Button>
          )}
        </div>
      ),
    },
  ];
  useEffect(() => {
    if (
      portfolioApr[portfolioName] === undefined ||
      Object.keys(portfolioApr).length === 0
    ) {
      dispatch(fetchStrategyMetadata());
      setSlippage(portfolioName === "Stablecoin Vault" ? 0.5 : 3);
    }
  }, [portfolioName]);
  useEffect(() => {
    if (!portfolioName || account === undefined) return;
    if (portfolioApr[portfolioName] === undefined) return;
    const fetchUsdBalance = async () => {
      setUsdBalanceLoading(true);
      setPendingRewardsLoading(true);
      setrebalancableUsdBalanceDictLoading(true);
      setProtocolAssetDustInWalletLoading(true);

      const tokenPricesMappingTable =
        await portfolioHelper.getTokenPricesMappingTable(() => {});
      setTokenPricesMappingTable(tokenPricesMappingTable);
      const [usdBalance, usdBalanceDict] = await portfolioHelper.usdBalanceOf(
        account.address,
        portfolioApr[portfolioName],
      );
      const portfolioLockUpPeriod = await portfolioHelper.lockUpPeriod(
        account.address,
      );
      setLockUpPeriod(portfolioLockUpPeriod);
      setUsdBalance(usdBalance);
      setUsdBalanceLoading(false);
      setrebalancableUsdBalanceDict(usdBalanceDict);
      setrebalancableUsdBalanceDictLoading(false);
      setPendingRewards(usdBalanceDict.pendingRewards.pendingRewardsDict);
      setPendingRewardsLoading(false);

      if (Object.values(tokenPricesMappingTable).length === 0) return;
      const dust = await portfolioHelper.calProtocolAssetDustInWalletDictionary(
        account.address,
        tokenPricesMappingTable,
      );
      setProtocolAssetDustInWallet(dust);
      setProtocolAssetDustInWalletLoading(false);
    };
    fetchUsdBalance();
  }, [portfolioName, account, portfolioApr]);
  useEffect(() => {}, [lockUpPeriod]);
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
    const defaultToken = getDefaultToken(chainId);
    if (defaultToken) {
      setSelectedToken(defaultToken);
    }
  }, [chainId]);

  return (
    <BasePage>
      {notificationContextHolder}
      <PopUpModal
        portfolioHelper={portfolioHelper}
        stepName={stepName}
        tradingLoss={tradingLoss}
        totalTradingLoss={totalTradingLoss}
        open={open}
        setOpen={setOpen}
        chainId={chainId}
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
        rebalanceAmount={getRebalanceReinvestUsdAmount()}
        zapOutAmount={usdBalance * zapOutPercentage}
      />
      <main className={styles.bgStyle}>
        <header className="relative isolate pt-6">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="sm:flex items-center justify-between gap-x-6">
              <div className="flex items-center">
                <img
                  alt=""
                  src={`/indexFunds/${portfolioName?.toLowerCase()}.webp`}
                  className="h-8 w-8 rounded-full me-2"
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
                    content="All Weather Protocol is a zero-smart-contract protocol. It’s a pure JavaScript project built with an Account Abstraction (AA) wallet. Here is the audit report for the AA wallet."
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
                        onChange={(e) => setSlippage(e.target.value)}
                      >
                        {[0.5, 1, 3, 5, 7].map((slippageValue) => (
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
                    <SettingOutlined />
                  </a>
                </Dropdown>
              </div>
              <div>
                <Dropdown
                  menu={{
                    items: switchItems,
                  }}
                  trigger="click"
                >
                  <Button onClick={(e) => e.preventDefault()}>
                    <Space>
                      <Image
                        src={
                          chainId?.name
                            ? `/chainPicturesWebp/${chainId.name
                                .toLowerCase()
                                .replace(" one", "")}.webp`
                            : "/chainPicturesWebp/arbitrum.webp"
                        }
                        alt={chainId ? chainId.name : "arbitrum"}
                        height={22}
                        width={22}
                        className="rounded-full ms-1"
                      />
                      <DownOutlined />
                    </Space>
                  </Button>
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
                onChange={onChange}
              />
            </ConfigProvider>

            <div className="mt-2 flex align-items-center">
              ⛽<span className="text-emerald-400">Free</span>
              {tabKey === "3" ? (
                <span className="text-gray-400">
                  , Exit Fee: {portfolioHelper?.swapFeeRate() * 100}%
                </span>
              ) : null}
            </div>
          </div>
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Invoice summary */}
            <div className="lg:col-start-3 lg:row-span-1 lg:row-end-1 h-full shadow-sm border border-white/50">
              <div className="p-6">
                <dl className="flex flex-wrap">
                  <div className="flex-auto">
                    <dt className="text-sm font-semibold leading-6 text-white">
                      Your Balance
                    </dt>
                    <dd className="mt-1 text-base font-semibold leading-6 text-white flex">
                      <span className="mr-2">
                        {usdBalanceLoading === true ||
                        Object.values(tokenPricesMappingTable).length === 0 ? (
                          <Spin />
                        ) : portfolioName === "ETH Vault" ? (
                          <>
                            ${usdBalance.toFixed(2)}
                            <div className="text-gray-500">
                              {portfolioHelper?.denomination()}
                              {(
                                usdBalance / tokenPricesMappingTable["weth"]
                              ).toFixed(2)}
                            </div>
                          </>
                        ) : (
                          `$${usdBalance.toFixed(2)}`
                        )}
                      </span>
                      <a
                        href={`https://debank.com/profile/${account?.address}`}
                        target="_blank"
                      >
                        <ArrowTopRightOnSquareIcon className="h-6 w-5 text-gray-500" />
                      </a>
                    </dd>
                  </div>
                  <div className="flex-none self-end w-full">
                    <ul className="mt-3 text-white">
                      <li>
                        <div className="text-gray-400">
                          Rebalance Cost: {portfolioHelper?.swapFeeRate() * 100}
                          %
                        </div>
                        {calCurrentAPR(rebalancableUsdBalanceDict) >
                        portfolioApr[portfolioName]?.portfolioAPR * 100 ? (
                          <>
                            {formatBalance(getRebalanceReinvestUsdAmount())} has
                            outperformed. It&apos;s time to rebalance and take
                            the profit!
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              "https://t.me/all_weather_protocol_bot",
                              "_blank",
                            )
                          }
                          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          Subscribe for Rebalance Notifications
                          <span className="fi fi-brands-telegram ml-2"></span>
                        </button>
                      </li>
                    </ul>
                  </div>
                  {/* <div className="mt-6 flex w-full flex-none gap-x-4">
                    <dt className="flex-none">
                      <BanknotesIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      Principal:{" "}
                      {usdBalanceLoading && principalBalance === 0 ? (
                        <Spin />
                      ) : (
                        `${portfolioHelper?.denomination()}${
                          principalBalance > 0.01
                            ? principalBalance?.toFixed(2)
                            : "< 0.01"
                        }`
                      )}
                    </dd>
                  </div>
                  <div className="mt-6 flex w-full flex-none gap-x-4">
                    <dt className="flex-none">
                      <CurrencyDollarIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      Profit:{" "}
                      {usdBalanceLoading ||
                      Object.values(tokenPricesMappingTable).length === 0 ? (
                        <Spin />
                      ) : (
                        <span
                          className={
                            portfolioName === "Stablecoin Vault"
                              ? usdBalance - principalBalance < 0
                                ? "text-red-500"
                                : "text-green-500"
                              : portfolioName === "ETH Vault"
                              ? usdBalance / tokenPricesMappingTable["weth"] -
                                  principalBalance <
                                0
                                ? "text-red-500"
                                : "text-green-500"
                              : portfolioName === "BTC Vault"
                              ? usdBalance / tokenPricesMappingTable["wbtc"] -
                                  principalBalance <
                                0
                                ? "text-red-500"
                                : "text-green-500"
                              : "text-white"
                          }
                        >
                          {portfolioHelper?.denomination()}
                          {usdBalance === 0
                            ? 0
                            : portfolioName === "ETH Vault"
                            ? (
                                usdBalance / tokenPricesMappingTable["weth"] -
                                principalBalance
                              ).toFixed(2)
                            : portfolioName === "BTC Vault"
                            ? (
                                usdBalance / tokenPricesMappingTable["wbtc"] -
                                principalBalance
                              ).toFixed(2)
                            : (usdBalance - principalBalance).toFixed(2)}
                        </span>
                      )}
                    </dd>
                  </div> */}
                  <div className="mt-6 flex w-full flex-none gap-x-4">
                    <dt className="flex-none">
                      <ChartBarIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      <Link
                        href={`/profile/#historical-balances?address=${account?.address}`}
                        target="_blank"
                        className="text-blue-400"
                      >
                        Historical Balances
                      </Link>{" "}
                    </dd>
                  </div>

                  <div className="mt-6 flex w-full flex-none gap-x-4">
                    <dt className="flex-none">
                      <APRComposition
                        APRData={pendingRewards}
                        mode="pendingRewards"
                        currency="$"
                        exchangeRateWithUSD={1}
                        pendingRewardsLoading={pendingRewardsLoading}
                      />
                    </dt>
                    <dd className="text-sm leading-6 text-white">
                      Rewards:{" "}
                      {pendingRewardsLoading === true ? (
                        <Spin />
                      ) : (
                        <span className="text-green-500">
                          {formatBalance(
                            portfolioHelper?.sumUsdDenominatedValues(
                              pendingRewards,
                            ),
                          )}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Invoice */}
            <div className="lg:col-span-2 lg:row-span-1">
              <div className="shadow-sm border border-white/50 p-6">
                <h2 className="text-base font-semibold leading-6 text-white">
                  {portfolioName} Composition
                </h2>
                {portfolioHelper &&
                  Object.entries(portfolioHelper.strategy).map(
                    ([category, protocols]) =>
                      Object.entries(protocols).map(
                        ([chain, protocolArray], index) => (
                          <div key={`${chain}-${index}`}>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-semibold">
                                Protocols on
                              </span>
                              <Image
                                src={`/chainPicturesWebp/${chain}.webp`}
                                alt={chain}
                                height={25}
                                width={25}
                                className="rounded-full"
                              />
                            </div>
                            <table className="mt-3 w-full whitespace-nowrap text-left text-sm leading-6">
                              <thead className="border-b border-gray-200 text-white">
                                <tr>
                                  <th
                                    scope="col"
                                    className="py-3 font-semibold"
                                  >
                                    <span>POOL</span>
                                  </th>
                                  <th
                                    scope="col"
                                    width={50}
                                    className="py-3 text-right font-semibold"
                                  >
                                    <span>APR</span>
                                    <Popover
                                      content={yieldContent}
                                      title="Source of Yield"
                                      trigger="hover"
                                    >
                                      <InfoCircleOutlined className="ms-2 text-gray-500" />
                                    </Popover>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {protocolArray
                                  .sort((a, b) => b.weight - a.weight)
                                  .sort(
                                    (a, b) =>
                                      portfolioApr?.[portfolioName]?.[
                                        b.interface.uniqueId()
                                      ]?.apr -
                                      portfolioApr?.[portfolioName]?.[
                                        a.interface.uniqueId()
                                      ]?.apr,
                                  )
                                  .map((protocol, index) => {
                                    // set weight to 0 for old protocols, these are protocols used to be the best choice but its reward decreased
                                    // so we opt out of them
                                    // need to keep them in the portfolio so users can zap out
                                    if (protocol.weight === 0) return null;
                                    return (
                                      <tr key={index} className="">
                                        <td className="max-w-0 px-0 py-4">
                                          <div className="text-white flex items-center gap-3">
                                            <div className="relative flex items-center gap-1">
                                              <div className="relative flex items-center">
                                                {protocol.interface.symbolList.map(
                                                  (symbol, idx) => {
                                                    return (
                                                      <ImageWithFallback
                                                        key={idx}
                                                        className="me-1 rounded-full"
                                                        domKey={`${protocol.interface.protocolName}-${symbol}-${index}-${idx}`}
                                                        token={symbol.replace(
                                                          "(bridged)",
                                                          "",
                                                        )}
                                                        height={25}
                                                        width={25}
                                                      />
                                                    );
                                                  },
                                                )}
                                              </div>
                                              <div className="absolute -bottom-3 -right-3 sm:-bottom-1 sm:-right-1">
                                                <Image
                                                  src={`/projectPictures/${protocol.interface.protocolName}.webp`}
                                                  alt={
                                                    protocol.interface
                                                      .protocolName
                                                  }
                                                  height={20}
                                                  width={20}
                                                  className="rounded-full"
                                                />
                                              </div>
                                            </div>
                                            <div className="ms-2 truncate">
                                              <p className="font-semibold truncate ...">
                                                {protocol.interface.symbolList.join(
                                                  "-",
                                                )}
                                              </p>
                                              <p className="text-gray-500 truncate ...">
                                                {
                                                  protocol.interface
                                                    .protocolName
                                                }
                                                -
                                                {(
                                                  protocol.weight * 100
                                                ).toFixed(0)}
                                                %
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-4 pl-8 pr-0 text-right tabular-nums text-white">
                                          <span>
                                            {isNaN(
                                              portfolioApr?.[portfolioName]?.[
                                                protocol.interface.uniqueId()
                                              ]?.apr * 100,
                                            ) ? (
                                              <Spin />
                                            ) : (
                                              `${(
                                                portfolioApr?.[portfolioName]?.[
                                                  protocol.interface.uniqueId()
                                                ]?.apr * 100 || 0
                                              ).toFixed(2)}%`
                                            )}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        ),
                      ),
                  )}
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <th scope="row" className="pt-6 font-semibold text-white">
                      Avg. APR
                    </th>
                    <td className="pt-6 font-semibold text-right text-green-500">
                      {loading ? (
                        <Spin />
                      ) : (
                        `${(
                          (portfolioApr[portfolioName]?.portfolioAPR || 0) * 100
                        ).toFixed(2)}%`
                      )}
                    </td>
                  </tr>
                </tfoot>
                <div>
                  <span className="text-gray-500">Lock-up Period</span>{" "}
                  {usdBalanceLoading === true ? (
                    <Spin />
                  ) : typeof lockUpPeriod === "number" ? (
                    lockUpPeriod === 0 ? (
                      <span className="text-green-500" role="lockUpPeriod">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-red-500" role="lockUpPeriod">
                        {Math.floor(lockUpPeriod / 86400)} d{" "}
                        {Math.ceil((lockUpPeriod % 86400) / 3600)
                          ? Math.ceil((lockUpPeriod % 86400) / 3600) + "h"
                          : null}
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 lg:row-span-1 lg:row-end-2 h-full border border-white/50">
              <div className="p-6">
                <h2 className="text-base font-semibold leading-6 text-white">
                  Historical Data
                </h2>
                <HistoricalDataChart portfolioName={portfolioName} />
              </div>
            </div>
            <div className="lg:col-start-3 h-full border border-white/50">
              {/* Activity feed */}
              <div className="h-96 overflow-y-scroll shadow-sm p-6">
                <h2 className="text-sm font-semibold leading-6 text-white">
                  History
                </h2>
                <ul role="list" className="mt-6 space-y-6">
                  <TransacitonHistory
                    setPrincipalBalance={setPrincipalBalance}
                    tokenPricesMappingTable={tokenPricesMappingTable}
                  />
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </BasePage>
  );
}
