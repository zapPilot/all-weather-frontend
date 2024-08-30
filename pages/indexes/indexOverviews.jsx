"use client";
import BasePage from "../basePage.tsx";
import { useState, useCallback, useEffect } from "react";
import DecimalStep from "./DecimalStep";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import RebalanceChart from "../views/RebalanceChart";
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import { Button, Progress, ConfigProvider, Radio, notification } from "antd";
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
  const [progress, setProgress] = useState(0);
  const [stepName, setStepName] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [zapOutPercentage, setZapOutPercentage] = useState(1);
  const [usdBalance, setUsdBalance] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [exchangeRateWithUSD, setExchangeRateWithUSD] = useState(1);
  const [usdBalanceLoading, setUsdBalanceLoading] = useState(false);
  const [pendingRewardsLoading, setPendingRewardsLoading] = useState(false);
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
    }
    if (!account) return;
    const [tokenSymbol, tokenAddress] = tokenSymbolAndAddress.split("-");
    let txns;
    if (actionName === "zapIn") {
      txns = await portfolioHelper.portfolioAction("zapIn", {
        account,
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
        account,
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
        account,
        tokenOutAddress: tokenAddress,
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
  // Function to sum up the usdDenominatedValue
  function sumUsdDenominatedValues(mapping) {
    return Object.values(mapping).reduce((total, entry) => {
      return total + (entry.usdDenominatedValue || 0);
    }, 0);
  }
  useEffect(() => {
    if (Object.keys(portfolioApr).length === 0) {
      dispatch(fetchStrategyMetadata());
    }
  }, [portfolioName]);

  useEffect(() => {
    if (!portfolioName || account === undefined) return;
    const fetchUsdBalance = async () => {
      setUsdBalanceLoading(true);
      const usdBalance = await portfolioHelper.usdBalanceOf(account.address);
      setUsdBalance(usdBalance);
      const pendingRewards = await portfolioHelper.pendingRewards(
        account.address,
        (progressPercentage) => setProgress(progressPercentage),
      );
      setPendingRewards(pendingRewards);
      setUsdBalanceLoading(false);
    };
    fetchUsdBalance();
  }, [portfolioName, account]);
  useEffect(() => {
    if (!portfolioName || account === undefined) return;
    const fetchExchangeRateWithUSD = async () => {
      setPendingRewardsLoading(true);
      const { currency, exchangeRateWithUSD } =
        await getLocalizedCurrencyAndExchangeRate();
      setCurrency(currency);
      setExchangeRateWithUSD(exchangeRateWithUSD);
      setPendingRewardsLoading(false);
    };
    fetchExchangeRateWithUSD();
  }, [portfolioName, account]);
  return (
    <BasePage>
      {notificationContextHolder}
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          {/* Product details */}
          <div className="lg:max-w-lg lg:self-end">
            <nav aria-label="Breadcrumb">
              <ol role="list" className="flex items-center space-x-2">
                {product.breadcrumbs.map((breadcrumb, breadcrumbIdx) => (
                  <li key={breadcrumb.id}>
                    <div className="flex items-center text-sm">
                      <a
                        href={breadcrumb.href}
                        className="font-medium text-gray-500 hover:text-gray-900"
                      >
                        {breadcrumb.name}
                      </a>
                      {breadcrumbIdx !== product.breadcrumbs.length - 1 ? (
                        <svg
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          className="ml-2 h-5 w-5 flex-shrink-0 text-gray-300"
                        >
                          <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                        </svg>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-4">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {portfolioName}
              </h1>
            </div>

            <section aria-labelledby="information-heading" className="mt-4">
              <h2 id="information-heading" className="sr-only">
                Product information
              </h2>

              <div className="flex items-center">
                <p className="text-lg text-gray-900 sm:text-xl">
                  APR: {(portfolioApr?.portfolioAPR * 100).toFixed(2)}%
                </p>
                <a
                  href="#"
                  className="group inline-flex text-sm text-gray-500 hover:text-gray-700"
                >
                  <QuestionMarkCircleIcon
                    aria-hidden="true"
                    className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                  />
                </a>

                <div className="ml-4 border-l border-gray-300 pl-4">
                  <div className="flex items-center">
                    <p className="ml-2 text-sm text-gray-500">TVL: upcoming</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-6">
                <p className="text-base text-gray-500">
                  {portfolioHelper?.description()}
                </p>
              </div>
            </section>
          </div>

          {/* Product image */}
          <div className="mt-10 lg:col-start-2 lg:row-span-2 lg:mt-0 lg:self-center">
            <div className="aspect-h-1 aspect-w-1 overflow-hidden rounded-lg">
              {portfolioHelper && (
                <RebalanceChart
                  suggestions={[]}
                  netWorth={100}
                  showCategory={true}
                  mode="portfolioStrategy"
                  color="black"
                  wording={portfolioName}
                  portfolioStrategyName={portfolioName}
                />
              )}
            </div>
            Portfolio BreakDown
            <section aria-labelledby="cart-heading">
              <ul
                role="list"
                className="divide-y divide-gray-200 border-b border-t border-gray-200"
              >
                {portfolioHelper &&
                  Object.entries(portfolioHelper.strategy).map(
                    ([category, protocols]) => (
                      <li key={category} className="flex py-6">
                        <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                          <div>
                            <div className="flex justify-between">
                              <h4 className="text-sm">
                                <a className="font-medium text-gray-700 hover:text-gray-800">
                                  {category}:{" "}
                                  {portfolioHelper.weightMapping[category] *
                                    100}
                                  %
                                </a>
                              </h4>
                              <p className="ml-4 text-sm font-medium text-gray-900">
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
                                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                                    <Image
                                      src={`/chainPicturesWebp/${chain}.webp`}
                                      alt={chain}
                                      height={25}
                                      width={25}
                                    />
                                    <span className="ml-2">{chain}</span>
                                  </p>

                                  {protocolArray.map((protocol, index) => {
                                    // set weight to 0 for old protocols, these are protocols used to be the best choice but its reward decreased
                                    // so we opt out of them
                                    // need to keep them in the portfolio so users can zap out
                                    if (protocol.weight === 0) return null;
                                    return (
                                      <div
                                        className="mt-1 text-sm text-gray-500 flex items-center justify-between"
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
                                          {protocol.interface.protocolName}
                                          {protocol.interface.symbolList.map(
                                            (symbol, index) => (
                                              <Image
                                                key={`${symbol}-${index}`}
                                                // use usdc instead of usdc(bridged), aka, usdc.e for the image
                                                src={`/tokenPictures/${symbol.replace(
                                                  "(bridged)",
                                                  "",
                                                )}.webp`}
                                                alt={symbol}
                                                height={20}
                                                width={20}
                                              />
                                            ),
                                          )}
                                          {protocol.interface.symbolList.join(
                                            "-",
                                          )}
                                        </div>
                                        <span className="ml-4 text-sm font-medium text-gray-900">
                                          APR:{" "}
                                          {(
                                            portfolioApr[
                                              protocol.interface.uniqueId()
                                            ]?.apr * 100
                                          ).toFixed(2)}
                                          %
                                        </span>
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

          {/* Product form */}
          <div className="mt-10 lg:col-start-1 lg:row-start-2 lg:max-w-lg lg:self-start">
            <section aria-labelledby="options-heading">
              <h2 id="options-heading" className="sr-only">
                Product options
              </h2>

              <form>
                <div className="sm:flex sm:justify-between">
                  {/* Size selector */}
                  <fieldset>
                    <TokenDropdownInput
                      selectedToken={selectedToken}
                      setSelectedToken={handleSetSelectedToken}
                      setInvestmentAmount={handleSetInvestmentAmount}
                    />
                    <ConfigProvider
                      theme={{
                        token: {
                          colorPrimary: "#5DFDCB",
                          colorTextLightSolid: "#000000",
                        },
                      }}
                    >
                      Slippage:
                      <Radio.Group
                        value={slippage}
                        buttonStyle="solid"
                        onChange={(e) => setSlippage(e.target.value)}
                      >
                        {[0.5, 1, 3, 5].map((slippageValue) => (
                          <Radio.Button
                            value={slippageValue}
                            key={slippageValue}
                          >
                            {slippageValue}%
                          </Radio.Button>
                        ))}
                      </Radio.Group>
                      <div
                        style={{
                          marginTop: "5px",
                          fontSize: "0.9em",
                          color: "rgba(0, 0, 0, 0.45)",
                        }}
                      >
                        Minimum Receive: $
                        {investmentAmount * (1 - slippage / 100)}
                        {", "}
                        Refund to Your Wallet: $
                        {(investmentAmount * slippage) / 100}
                      </div>
                    </ConfigProvider>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Image
                        src="/icon/gas-station.png"
                        alt="gas fee"
                        width={20}
                        height={20}
                      />
                      :
                      <span style={{ fontWeight: "bold", color: "green" }}>
                        Free
                      </span>
                      <span style={{ marginLeft: "5px" }}>
                        Service Fee: $0 (will charge 0.1% in the future)
                      </span>
                    </div>
                  </fieldset>
                </div>
                {(zapInIsLoading || zapOutIsLoading || claimIsLoading) &&
                typeof progress === "number" ? (
                  <Progress
                    percent={progress.toFixed(2)}
                    status={
                      zapInIsLoading || zapOutIsLoading || claimIsLoading
                        ? "active"
                        : ""
                    }
                    size={[400, 10]}
                    showInfo={true}
                    format={(percent) => `${percent}% ${stepName}`}
                  />
                ) : null}
                <div className="mt-10">
                  <Button
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                    onClick={() => handleAAWalletAction("zapIn")}
                    loading={zapInIsLoading}
                    disabled={investmentAmount === 0}
                  >
                    Zap In
                  </Button>
                </div>
                <div className="mt-10">
                  <DecimalStep
                    depositBalance={usdBalance * exchangeRateWithUSD}
                    setZapOutPercentage={setZapOutPercentage}
                    currency={currency}
                  />
                  <Button
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
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
                <div className="mt-10">
                  <Button
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                    onClick={() => handleAAWalletAction("claimAndSwap")}
                    loading={claimIsLoading || pendingRewardsLoading}
                    disabled={sumUsdDenominatedValues(pendingRewards) === 0}
                  >
                    Dump{" "}
                    {formatBalanceWithLocalizedCurrency(
                      exchangeRateWithUSD,
                      sumUsdDenominatedValues(pendingRewards),
                      currency,
                    ).join(" ")}{" "}
                    Worth of Rewards to {selectedToken.split("-")[0]}
                  </Button>
                  <APRComposition
                    APRData={pendingRewards}
                    mode="pendingRewards"
                    currency={currency}
                    exchangeRateWithUSD={exchangeRateWithUSD}
                  />
                </div>
                {/* TODO: */}
                {/* <div className="mt-10">
                  <Button
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                    onClick={() => handleAAWalletAction("claimAndSwap")}
                    loading={claimIsLoading || pendingRewardsLoading}
                    disabled={sumUsdDenominatedValues(pendingRewards) === 0}
                  >
                    Unoptimized Positions{" "}
                    {formatBalanceWithLocalizedCurrency(
                      exchangeRateWithUSD,
                      sumUsdDenominatedValues(pendingRewards),
                      currency,
                    )}
                  </Button>
                </div> */}
              </form>
            </section>
          </div>
        </div>
      </div>
    </BasePage>
  );
}
