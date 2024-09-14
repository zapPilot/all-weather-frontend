"use client";
import BasePage from "../basePage.tsx";
import { useState, useCallback, useEffect } from "react";
import DecimalStep from "./DecimalStep";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useDispatch, useSelector } from "react-redux";
import RebalanceChart from "../views/RebalanceChart";
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import {
  Button,
  Progress,
  ConfigProvider,
  Radio,
  notification,
  Modal,
} from "antd";
import TokenDropdownInput from "../views/TokenDropdownInput.jsx";
import { useActiveAccount, useSendBatchTransaction } from "thirdweb/react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";

import openNotificationWithIcon from "../../utils/notification.js";
import {
  getLocalizedCurrencyAndExchangeRate,
  formatBalanceWithLocalizedCurrency,
} from "../../utils/general";
import APRComposition from "../views/components/APRComposition";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";

export default function IndexOverviews() {
  const router = useRouter();
  const { portfolioName } = router.query;
  const product = {
    breadcrumbs: [
      { id: 1, name: "Indexes", href: "/indexes" },
      {
        id: 2,
        name: portfolioName,
        href: `/indexes/indexOverviews/?portfolioName=${portfolioName}`,
      },
    ],
  };

  const account = useActiveAccount();
  const [selectedToken, setSelectedToken] = useState(
    "USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  );

  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [zapInIsLoading, setZapInIsLoading] = useState(false);
  const [zapOutIsLoading, setZapOutIsLoading] = useState(false);
  const [claimIsLoading, setClaimIsLoading] = useState(false);
  const [rebalanceIsLoading, setRebalanceIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepName, setStepName] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [zapOutPercentage, setZapOutPercentage] = useState(1);
  const [usdBalance, setUsdBalance] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [exchangeRateWithUSD, setExchangeRateWithUSD] = useState(1);
  const [usdBalanceLoading, setUsdBalanceLoading] = useState(false);
  const [pendingRewardsLoading, setPendingRewardsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();
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

  const handleAAWalletAction = async (actionName) => {
    setOpen(true);

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
    }
    if (!account) return;
    const [tokenSymbol, tokenAddress] = tokenSymbolAndAddress.split("-");
    let txns;
    if (actionName === "zapIn") {
      txns = await portfolioHelper.portfolioAction("zapIn", {
        account: account.address,
        tokenInSymbol: tokenSymbol,
        tokenInAddress: tokenAddress,
        zapInAmount: Number(investmentAmount),
        progressCallback: (progressPercentage) =>
          setProgress(progressPercentage),
        progressStepNameCallback: (stepName) => setStepName(stepName),
        slippage,
      });
    } else if (actionName === "zapOut") {
      txns = await portfolioHelper.portfolioAction("zapOut", {
        account: account.address,
        tokenOutSymbol: tokenSymbol,
        tokenOutAddress: tokenAddress,
        zapOutPercentage: Number(zapOutPercentage),
        progressCallback: (progressPercentage) =>
          setProgress(progressPercentage),
        progressStepNameCallback: (stepName) => setStepName(stepName),
        slippage,
      });
    } else if (actionName === "claimAndSwap") {
      txns = await portfolioHelper.portfolioAction(actionName, {
        account: account.address,
        tokenOutAddress: tokenAddress,
        progressCallback: (progressPercentage) =>
          setProgress(progressPercentage),
        progressStepNameCallback: (stepName) => setStepName(stepName),
        slippage,
      });
    } else if (actionName === "rebalance") {
      txns = await portfolioHelper.portfolioAction(actionName, {
        account: account.address,
        progressCallback: (progressPercentage) =>
          setProgress(progressPercentage),
        progressStepNameCallback: (stepName) => setStepName(stepName),
        slippage,
      });
    }

    if (actionName === "zapIn") {
      setZapInIsLoading(false);
    } else if (actionName === "zapOut") {
      setZapOutIsLoading(false);
    } else if (actionName === "claimAndSwap") {
      setClaimIsLoading(false);
    } else if (actionName === "rebance") {
      setRebalanceIsLoading(false);
    }
    // Call sendBatchTransaction and wait for the result
    try {
      await new Promise((resolve, reject) => {
        sendBatchTransaction(txns.flat(Infinity), {
          onSuccess: (data) => {
            openNotificationWithIcon(
              notificationAPI,
              "Transaction Result",
              "success",
              `${data.chain.blockExplorers[0].url}/tx/${data.transactionHash}`,
            );
            resolve(data); // Resolve the promise successfully
          },
          onError: (error) => {
            reject(error); // Reject the promise with the error
          },
        });
      });
    } catch (error) {
      openNotificationWithIcon(
        notificationAPI,
        "Transaction Result",
        "error",
        `Transaction failed: ${error.message}`,
      );
    }
  };
  function ModalContent() {
    return (
      <Modal
        title="Transaction Preview"
        open={open}
        onCancel={() => setOpen(false)}
        footer={<></>}
      >
        <div>
          <p>Tips:</p>
          <p>
            1. Test with $5–$10 first, as signature verification isn&apos;t
            available yet.
          </p>
          <p>
            2. Transaction simulation will be available in the next version.
          </p>
          <p>3. Increase your slippage if the transaction fails.</p>
        </div>

        <Progress
          percent={progress.toFixed(2)}
          footer={<></>}
          status={
            zapInIsLoading || zapOutIsLoading || claimIsLoading ? "active" : ""
          }
          size={[400, 10]}
          showInfo={true}
          format={(percent) => `${percent}%`}
        />
        {stepName}
      </Modal>
    );
  }

  // Function to sum up the usdDenominatedValue
  function sumUsdDenominatedValues(mapping) {
    return Object.values(mapping).reduce((total, entry) => {
      return total + (entry.usdDenominatedValue || 0);
    }, 0);
  }
  useEffect(() => {
    if (
      portfolioApr[portfolioName] === undefined ||
      Object.keys(portfolioApr).length === 0
    ) {
      dispatch(fetchStrategyMetadata());
    }
  }, [portfolioName]);

  useEffect(() => {
    if (!portfolioName || account === undefined) return;
    const fetchUsdBalance = async () => {
      setUsdBalanceLoading(true);
      setPendingRewardsLoading(true);

      const usdBalance = await portfolioHelper.usdBalanceOf(account.address);
      setUsdBalance(usdBalance);
      const pendingRewards = await portfolioHelper.pendingRewards(
        account.address,
        () => {},
      );
      setPendingRewards(pendingRewards);

      setUsdBalanceLoading(false);
      setPendingRewardsLoading(false);
    };
    fetchUsdBalance();
  }, [portfolioName, account]);
  useEffect(() => {
    if (!portfolioName || account === undefined) return;
    const fetchExchangeRateWithUSD = async () => {
      const { currency, exchangeRateWithUSD } =
        await getLocalizedCurrencyAndExchangeRate();
      setCurrency(currency);
      setExchangeRateWithUSD(exchangeRateWithUSD);
    };
    fetchExchangeRateWithUSD();
  }, [portfolioName, account]);
  return (
    <BasePage>
      {notificationContextHolder}
      <ModalContent />
      <div className="px-4 py-8">
        <nav aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-2">
            {product.breadcrumbs.map((breadcrumb, breadcrumbIdx) => (
              <li key={breadcrumb.id}>
                <div className="flex items-center text-sm">
                  <a
                    href={breadcrumb.href}
                    className="font-medium text-gray-400 hover:text-gray-300"
                  >
                    {breadcrumb.name}
                  </a>
                  {breadcrumbIdx !== product.breadcrumbs.length - 1 ? (
                    <svg
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </nav>
        <h1
          className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl"
          role="vault"
        >
          {portfolioName}
        </h1>
        <div className="w-2/4">
          <div className="mt-2 grid grid-cols-2 gap-2 divide-x divide-gray-400">
            <div>
              <p className="text-xl text-gray-400">
                APR
                <span className="text-emerald-400" role="apr">
                  {(portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(2)}
                  %
                </span>
                <a
                  href="#"
                  className="group inline-flex text-sm text-gray-400 hover:text-gray-300"
                >
                  <QuestionMarkCircleIcon
                    aria-hidden="true"
                    className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-300"
                  />
                </a>
              </p>
            </div>
            <div>
              <p className="ml-2 text-xl text-gray-400">
                TVL: $ {portfolioApr[portfolioName]?.portfolioTVL}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2 grid sm:grid-cols-2 lg:gap-x-8">
          <div>
            {/* Product details */}
            <div>{portfolioHelper?.description()}</div>
            {/* Product form */}
            <div className="mt-2 bg-gray-800 p-4 rounded">
              <p className="text-xl font-semibold text-white">Input</p>
              <form>
                <div>
                  {/* Size selector */}
                  <div className="mt-2">
                    <TokenDropdownInput
                      selectedToken={selectedToken}
                      setSelectedToken={handleSetSelectedToken}
                      setInvestmentAmount={handleSetInvestmentAmount}
                    />
                  </div>
                  <ConfigProvider
                    theme={{
                      token: {
                        colorPrimary: "#5DFDCB",
                        colorTextLightSolid: "#000000",
                      },
                    }}
                  >
                    <div className="mt-2 text-gray-400">
                      <span>Slippage: </span>
                      <Radio.Group
                        value={slippage}
                        buttonStyle="solid"
                        onChange={(e) => setSlippage(e.target.value)}
                      >
                        {[0.5, 1, 3].map((slippageValue) => (
                          <Radio.Button
                            value={slippageValue}
                            key={slippageValue}
                          >
                            {slippageValue}%
                          </Radio.Button>
                        ))}
                      </Radio.Group>
                    </div>
                    <div className="mt-2 text-gray-400">
                      Minimum Receive: $
                      {investmentAmount * (1 - slippage / 100)}
                      {", "}
                      Refund to Your Wallet: $
                      {(investmentAmount * slippage) / 100}
                    </div>
                  </ConfigProvider>
                  <div className="mt-2 flex align-items-center">
                    ⛽<span className="text-emerald-400">Free</span>
                    <span className="text-gray-400">
                      , Service Fee: $0 (will charge 0.099% in the future)
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <ConfigProvider
                    theme={{
                      token: {
                        colorPrimary: "#34d399",
                        colorBgContainerDisabled: "#9ca3af",
                      },
                    }}
                  >
                    <Button
                      className={"w-full"}
                      type="primary"
                      onClick={() => handleAAWalletAction("zapIn")}
                      loading={zapInIsLoading}
                      disabled={investmentAmount === 0}
                    >
                      Zap In
                    </Button>
                  </ConfigProvider>
                </div>
                <ConfigProvider
                  theme={{
                    token: {
                      colorPrimary: "#9ca3af",
                      colorBgContainerDisabled: "#9ca3af",
                    },
                  }}
                >
                  <div className="mt-4">
                    <p className="text-xl font-semibold text-white">Output</p>
                    <div className="mt-2">
                      <DecimalStep
                        depositBalance={usdBalance * exchangeRateWithUSD}
                        setZapOutPercentage={setZapOutPercentage}
                        currency={currency}
                      />
                    </div>
                    <Button
                      className={"mt-2 w-full"}
                      type="primary"
                      onClick={() => handleAAWalletAction("zapOut")}
                      loading={zapOutIsLoading || usdBalanceLoading}
                      disabled={usdBalance === 0}
                    >
                      Zap Out{" "}
                      {formatBalanceWithLocalizedCurrency(
                        exchangeRateWithUSD,
                        usdBalance * zapOutPercentage,
                        currency,
                      ).join(" ")}
                    </Button>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <p className="text-xl font-semibold text-white me-1">
                        Claim
                      </p>
                      <APRComposition
                        APRData={pendingRewards}
                        mode="pendingRewards"
                        currency={currency}
                        exchangeRateWithUSD={exchangeRateWithUSD}
                      />
                    </div>
                    <Button
                      className={"mt-2 w-full"}
                      type="primary"
                      onClick={() => handleAAWalletAction("claimAndSwap")}
                      loading={claimIsLoading || pendingRewardsLoading}
                      disabled={sumUsdDenominatedValues(pendingRewards) < 1}
                    >
                      Dump{" "}
                      {formatBalanceWithLocalizedCurrency(
                        exchangeRateWithUSD,
                        sumUsdDenominatedValues(pendingRewards),
                        currency,
                      ).join(" ")}{" "}
                      Worth of Rewards to {selectedToken.split("-")[0]}
                    </Button>
                  </div>
                </ConfigProvider>
                {/* TODO: */}
                {/* <div className="mt-10">
                  <Button
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                    onClick={() => handleAAWalletAction("rebalance")}
                    // loading={claimIsLoading || pendingRewardsLoading}
                    // disabled={sumUsdDenominatedValues(pendingRewards) === 0}
                  >
                    Rebalance
                    {/* {" "}
                    {formatBalanceWithLocalizedCurrency(
                      exchangeRateWithUSD,
                      sumUsdDenominatedValues(pendingRewards),
                      currency,
                    )} 
                  </Button>
                </div>*/}
              </form>
            </div>
          </div>
          {/* Product image */}
          <div className="p-4">
            <div className="aspect-h-1 aspect-w-1 overflow-hidden">
              {portfolioHelper && (
                <RebalanceChart
                  suggestions={[]}
                  netWorth={100}
                  showCategory={true}
                  mode="portfolioStrategy"
                  color="white"
                  wording={portfolioName}
                  portfolioStrategyName={portfolioName}
                />
              )}
            </div>
            <div className="mt-2 bg-gray-800 p-4 rounded">
              <p className="text-xl font-semibold text-white">
                Portfolio BreakDown
              </p>
              <section aria-labelledby="cart-heading">
                <ul
                  role="list"
                  className="divide-y divide-gray-200 border-gray-200"
                >
                  {portfolioHelper &&
                    Object.entries(portfolioHelper.strategy).map(
                      ([category, protocols]) => (
                        <li key={category} className="flex pt-4">
                          <div className="flex flex-1 flex-col">
                            <div>
                              <div className="flex justify-between">
                                <p className="text-sm text-gray-400">
                                  {category}:{" "}
                                  {portfolioHelper.weightMapping[category] *
                                    100}
                                  %
                                </p>
                                <p className="text-sm text-gray-400">
                                  $
                                  {(
                                    portfolioHelper.weightMapping[category] *
                                    investmentAmount
                                  ).toFixed(2)}
                                </p>
                              </div>
                              {Object.entries(protocols).map(
                                ([chain, protocolArray], index) => (
                                  <div key={`${chain}-${index}`}>
                                    <div className="mt-2 text-sm text-gray-400 flex items-center">
                                      <Image
                                        src={`/chainPicturesWebp/${chain}.webp`}
                                        alt={chain}
                                        height={25}
                                        width={25}
                                      />
                                      <span className="ml-2">{chain}</span>
                                    </div>
                                    {protocolArray.map((protocol, index) => {
                                      // set weight to 0 for old protocols, these are protocols used to be the best choice but its reward decreased
                                      // so we opt out of them
                                      // need to keep them in the portfolio so users can zap out
                                      if (protocol.weight === 0) return null;
                                      return (
                                        <div
                                          className="mt-2 border-b border-gray-400"
                                          key={`${protocol.interface.protocolName}-${index}`}
                                        >
                                          <div className="flex items-center">
                                            <Image
                                              src={`/projectPictures/${protocol.interface.protocolName}.webp`}
                                              alt={
                                                protocol.interface.protocolName
                                              }
                                              height={25}
                                              width={25}
                                            />
                                            <span className="text-gray-400 ml-2">
                                              {protocol.interface.protocolName}
                                            </span>
                                          </div>
                                          <div className="mt-2 flex items-center">
                                            {protocol.interface.symbolList.map(
                                              (symbol, index) => (
                                                <ImageWithFallback
                                                  className="me-1"
                                                  key={`${symbol}-${index}`}
                                                  // use usdc instead of usdc(bridged), aka, usdc.e for the image
                                                  token={symbol.replace(
                                                    "(bridged)",
                                                    "",
                                                  )}
                                                  height={20}
                                                  width={20}
                                                />
                                              ),
                                            )}
                                            <span className="text-gray-400 ml-1">
                                              {protocol.interface.symbolList.join(
                                                "-",
                                              )}
                                            </span>
                                          </div>
                                          <div className="mt-2 flex justify-between">
                                            <span className="text-gray-400">
                                              APR
                                            </span>
                                            <span className="text-emerald-400">
                                              {(
                                                portfolioApr?.[portfolioName]?.[
                                                  protocol.interface.uniqueId()
                                                ]?.apr * 100
                                              ).toFixed(2)}
                                              %
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </li>
                      ),
                    )}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </BasePage>
  );
}
