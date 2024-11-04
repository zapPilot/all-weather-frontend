// copy from this Tailwind template: https://tailwindui.com/components/application-ui/page-examples/detail-screens
"use client";
import BasePage from "../basePage.tsx";
import { useState, useCallback, useEffect } from "react";
import DecimalStep from "./DecimalStep";
import Image from "next/image";
import Link from "next/link";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useDispatch, useSelector } from "react-redux";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import TransacitonHistory from "./transacitonHistory.jsx";
import HistoricalDataChart from "../views/HistoricalDataChart.jsx";
import ConfiguredConnectButton from "../ConnectButton";
import {
  Button,
  Progress,
  ConfigProvider,
  Radio,
  notification,
  Modal,
  Spin,
  Tabs,
  Dropdown,
  Popover,
} from "antd";
import TokenDropdownInput from "../views/TokenDropdownInput.jsx";
import {
  useActiveAccount,
  useSendBatchTransaction,
  useActiveWalletChain,
  useWalletBalance,
} from "thirdweb/react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { formatBalance } from "../../utils/general.js";
import axios from "axios";
import openNotificationWithIcon from "../../utils/notification.js";
import { selectBefore } from "../../utils/contractInteractions";
import APRComposition from "../views/components/APRComposition";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { generateIntentTxns } from "../../classes/main.js";
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { SettingOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { arbitrum } from "thirdweb/chains";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
export default function IndexOverviews() {
  const router = useRouter();
  const { portfolioName } = router.query;
  const account = useActiveAccount();
  const chainId = useActiveWalletChain();
  const [selectedToken, setSelectedToken] = useState(
    "USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831-6",
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
  const [rebalancableUsdBalanceDict, setrebalancableUsdBalanceDict] =
    useState(0);
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
    const [tokenSymbol, tokenAddress, tokenDecimals] =
      tokenSymbolAndAddress.split("-");
    try {
      const txns = await generateIntentTxns(
        actionName,
        portfolioHelper,
        account.address,
        tokenSymbol,
        tokenAddress,
        investmentAmount,
        tokenDecimals,
        zapOutPercentage,
        setProgress,
        setStepName,
        slippage,
        rebalancableUsdBalanceDict,
      );
      // Call sendBatchTransaction and wait for the result
      try {
        await new Promise((resolve, reject) => {
          sendBatchTransaction(txns.flat(Infinity), {
            onSuccess: async (data) => {
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
                    timestamp: Math.floor(Date.now() / 1000),
                    swapFeeRate: portfolioHelper.swapFeeRate(),
                    referralFeeRate: portfolioHelper.referralFeeRate(),
                  }),
                },
              });
              openNotificationWithIcon(
                notificationAPI,
                "Transaction Result",
                "success",
                `${data.chain.blockExplorers[0].url}/tx/${data.transactionHash}`,
              );
              resolve(data); // Resolve the promise successfully
              setFinishedTxn(true);
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
        openNotificationWithIcon(
          notificationAPI,
          "Transaction Result",
          "error",
          `Transaction failed\n
        1. Probably out of gas\n
        2. Or still in the lock-up period\n
        ${error.message}`,
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
    }
  };

  const onChange = (key) => {
    setTabKey(key);
  };

  const tokenAddress = selectedToken?.split("-")[1];
  const { data: walletBalanceData, isLoading: walletBalanceLoading } =
    useWalletBalance({
      chain: arbitrum,
      address: account?.address,
      client: THIRDWEB_CLIENT,
      tokenAddress,
    });
  const [tokenBalance, setTokenBalance] = useState(0);

  const items = [
    {
      key: "1",
      label: "Zap In",
      children: (
        <div>
          <TokenDropdownInput
            selectedToken={selectedToken}
            setSelectedToken={handleSetSelectedToken}
            setInvestmentAmount={handleSetInvestmentAmount}
          />
          {account === undefined ? (
            <ConfiguredConnectButton />
          ) : (
            <Button
              type="primary"
              className="w-full mt-2"
              onClick={() => handleAAWalletAction("zapIn")}
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
      ),
    },
    {
      key: "2",
      label: "Zap Out",
      children: (
        <div>
          <DecimalStep
            selectedToken={selectedToken}
            setSelectedToken={handleSetSelectedToken}
            depositBalance={usdBalance}
            setZapOutPercentage={setZapOutPercentage}
            currency="$"
          />
          {account === undefined ? (
            <ConfiguredConnectButton />
          ) : (
            <Button
              type="primary"
              className="w-full"
              onClick={() => handleAAWalletAction("zapOut")}
              loading={zapOutIsLoading || usdBalanceLoading}
              disabled={usdBalance < 0.01}
            >
              Withdraw
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "3",
      label: "Convert Rewards",
      children: (
        <div>
          {selectBefore(handleSetSelectedToken, chainId?.id, selectedToken)}
          {account === undefined ? (
            <ConfiguredConnectButton />
          ) : (
            <Button
              type="primary"
              className="w-full mt-2"
              onClick={() => handleAAWalletAction("claimAndSwap")}
              loading={claimIsLoading || pendingRewardsLoading}
              disabled={
                portfolioHelper?.sumUsdDenominatedValues(pendingRewards) < 1
              }
            >
              Convert
              {formatBalance(
                portfolioHelper?.sumUsdDenominatedValues(pendingRewards),
              )}{" "}
              Rewards to {selectedToken.split("-")[0]}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const yieldContent = (
    <>
      {portfolioHelper?.description()}
      <br />
      Click{" "}
      <Link
        href="https://all-weather.gitbook.io/all-weather-protocol"
        target="_blank"
        className="text-blue-400"
      >
        here
      </Link>{" "}
      for more information
    </>
  );

  function ModalContent() {
    // remove the transition animation effect, still need to figure out that re-render issue
    return (
      <Modal
        transitionName=""
        maskTransitionName=""
        title={
          finishedTxn === false ? "Transaction Preview" : "Transaction Result"
        }
        open={open}
        onCancel={() => {
          setOpen(false);
          if (finishedTxn) {
            window.location.reload();
          }
        }}
        footer={<></>}
      >
        {finishedTxn === false ? (
          <>
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
                zapInIsLoading || zapOutIsLoading || claimIsLoading
                  ? "active"
                  : ""
              }
              size={[400, 10]}
              showInfo={true}
              format={(percent) => `${percent}%`}
            />
            {stepName}
          </>
        ) : (
          <>
            <div className="flex flex-col items-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckIcon
                  aria-hidden="true"
                  className="h-6 w-6 text-green-600"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    🎉 Success! Click Once 🌟, Yield Forever 🌿
                  </p>
                  <a
                    href={txnLink}
                    target="_blank"
                    className="flex justify-center mt-2"
                  >
                    <ArrowTopRightOnSquareIcon className="h-6 w-5 text-gray-500" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  window.open("https://t.me/all_weather_protocol_bot", "_blank")
                }
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Subscribe for Rebalance Notifications
                <span className="fi fi-brands-telegram ml-2"></span>
              </button>
            </div>
          </>
        )}
      </Modal>
    );
  }

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
    if (portfolioApr[portfolioName] === undefined) return;
    const fetchUsdBalance = async () => {
      setUsdBalanceLoading(true);
      setPendingRewardsLoading(true);
      setrebalancableUsdBalanceDictLoading(true);

      const tokenPricesMappingTable =
        await portfolioHelper.getTokenPricesMappingTable(() => {});
      setTokenPricesMappingTable(tokenPricesMappingTable);
      const [usdBalance, usdBalanceDict] = await portfolioHelper.usdBalanceOf(
        account.address,
        portfolioApr[portfolioName],
      );
      const portfolioLockUpPeriod = await portfolioHelper.lockUpPeriod(account.address);
      setLockUpPeriod(portfolioLockUpPeriod)
      setUsdBalance(usdBalance);
      setUsdBalanceLoading(false);
      setrebalancableUsdBalanceDict(usdBalanceDict);
      setrebalancableUsdBalanceDictLoading(false);
      setPendingRewards(usdBalanceDict.pendingRewards.pendingRewardsDict);
      setPendingRewardsLoading(false);

      const dust = await portfolioHelper.calProtocolAssetDustInWalletDictionary(
        account.address,
      );

      setProtocolAssetDustInWallet(dust);
    };
    fetchUsdBalance();
    console.log("lockUpPeriod", lockUpPeriod)
  }, [portfolioName, account, portfolioApr, lockUpPeriod]);

  useEffect(() => {
    const balance = walletBalanceData?.displayValue;
    setTokenBalance(balance);
  }, [selectedToken, walletBalanceData, investmentAmount]);

  return (
    <BasePage>
      {notificationContextHolder}
      <ModalContent />
      <main>
        <header className="relative isolate pt-6">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute left-16 top-full -mt-16 transform-gpu opacity-50 blur-3xl xl:left-1/2 xl:-ml-80">
              <div
                style={{
                  clipPath:
                    "polygon(100% 38.5%, 82.6% 100%, 60.2% 37.7%, 52.4% 32.1%, 47.5% 41.8%, 45.2% 65.6%, 27.5% 23.4%, 0.1% 35.3%, 17.9% 0%, 27.7% 23.4%, 76.2% 2.5%, 74.2% 56%, 100% 38.5%)",
                }}
                className="aspect-[1154/678] w-[72.125rem] bg-gradient-to-br from-[#5dfdcb] to-[#5dfdcb]"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gray-900/5" />
          </div>
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
          <div className="mb-8 p-4 ring-1 ring-white/10 rounded-lg relative">
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
            <div className="w-16 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 rounded-full absolute top-7 right-4">
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
                      {[0.5, 1, 3].map((slippageValue) => (
                        <Radio.Button value={slippageValue} key={slippageValue}>
                          {slippageValue}%
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                )}
                trigger={["click"]}
              >
                <a className="text-white" onClick={(e) => e.preventDefault()}>
                  <SettingOutlined />
                </a>
              </Dropdown>
            </div>
            <div className="mt-2 flex align-items-center">
              ⛽<span className="text-emerald-400">Free</span>
              {tabKey === "2" ? (
                <span className="text-gray-400">
                  , Transaction Fee: {portfolioHelper?.swapFeeRate() * 100}%
                </span>
              ) : null}
            </div>
          </div>
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Invoice summary */}
            <div className="lg:col-start-3 lg:row-end-1">
              <div className="rounded-lg bg-gray-800 shadow-sm ring-1 ring-white/10">
                <dl className="flex flex-wrap">
                  <div className="flex-auto pl-6 pt-6">
                    <dt className="text-sm font-semibold leading-6 text-white">
                      Your Balance
                    </dt>
                    <dd className="mt-1 text-base font-semibold leading-6 text-white flex">
                      <span class="mr-2">
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
                  <div className="flex-none self-end px-6 pt-4 w-full">
                    <ConfigProvider
                      theme={{
                        token: {
                          colorBgContainerDisabled: "rgb(156, 163, 175)",
                        },
                      }}
                    >
                      <Button
                        className="w-full mt-2"
                        type="primary"
                        onClick={() => handleAAWalletAction("rebalance")}
                        loading={
                          rebalanceIsLoading ||
                          rebalancableUsdBalanceDictLoading
                        }
                        disabled={
                          getRebalanceReinvestUsdAmount() / usdBalance <
                            portfolioHelper?.rebalanceThreshold() ||
                          usdBalance <= 0
                        }
                      >
                        {calCurrentAPR(rebalancableUsdBalanceDict) >
                        portfolioApr[portfolioName]?.portfolioAPR * 100 ? (
                          "Take Profit"
                        ) : (
                          <>
                            Boost APR from{" "}
                            <span className="text-red-500">
                              {calCurrentAPR(
                                rebalancableUsdBalanceDict,
                              ).toFixed(2)}
                              %{" "}
                            </span>
                            to{" "}
                            <span className="text-green-400">
                              {(
                                portfolioApr[portfolioName]?.portfolioAPR * 100
                              ).toFixed(2)}
                              %
                            </span>{" "}
                            for $
                            {formatBalance(getRebalanceReinvestUsdAmount())}
                          </>
                        )}
                      </Button>
                    </ConfigProvider>
                    <ul className="mt-3 text-white">
                      <li>
                        <div className="text-gray-400">
                          Transaction Fee:{" "}
                          {portfolioHelper?.swapFeeRate() * 100}%
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
                  <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-white/5 px-6 pt-6">
                    <dt className="flex-none">
                      <UserCircleIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      <Link
                        href={`/profile?address=${account?.address}`}
                        target="_blank"
                        className="text-blue-400"
                      >
                        Check Your Portfolio
                      </Link>{" "}
                    </dd>
                  </div>
                  <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-white/5 px-6 pt-6">
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
                  <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-white/5 px-6 pt-6">
                    <dt className="flex-none">
                      <CurrencyDollarIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      PnL:{" "}
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
                  </div>
                  <div className="my-4 flex w-full flex-none gap-x-4 border-t border-white/5 px-6 pt-6">
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
            <div className="lg:col-span-2 lg:row-span-2 lg:row-end-2">
              <div className="rounded-lg bg-gray-800 shadow-sm ring-1 ring-white/10 p-6">
                <h2 className="text-base font-semibold leading-6 text-white">
                  Allocations
                </h2>
                {portfolioHelper &&
                  Object.entries(portfolioHelper.strategy).map(
                    ([category, protocols]) =>
                      Object.entries(protocols).map(
                        ([chain, protocolArray], index) => (
                          <div key={`${chain}-${index}`}>
                            <table className="mt-3 w-full whitespace-nowrap text-left text-sm leading-6">
                              <thead className="border-b border-gray-200 text-white">
                                <tr>
                                  <th
                                    scope="col"
                                    className="py-3 font-semibold"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span>Protocols in</span>
                                      <Image
                                        src={`/chainPicturesWebp/${chain}.webp`}
                                        alt={chain}
                                        height={25}
                                        width={25}
                                        className="rounded-full"
                                      />
                                    </div>
                                  </th>
                                  <th
                                    scope="col"
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
                                      <tr
                                        key={index}
                                        className="border-b border-gray-100"
                                      >
                                        <td className="max-w-0 px-0 py-5 align-top">
                                          <div className="flex items-center space-x-2 truncate font-medium text-white">
                                            <Image
                                              src={`/projectPictures/${protocol.interface.protocolName}.webp`}
                                              alt={
                                                protocol.interface.protocolName
                                              }
                                              height={25}
                                              width={25}
                                              className="rounded-full"
                                            />
                                            <span>
                                              {protocol.interface.protocolName}-
                                              {(protocol.weight * 100).toFixed(
                                                0,
                                              )}
                                              %
                                            </span>
                                          </div>
                                          <div className="truncate text-gray-500">
                                            <div className="mt-2 flex items-center">
                                              {protocol.interface.symbolList.map(
                                                (symbol, idx) => {
                                                  return (
                                                    <ImageWithFallback
                                                      key={idx}
                                                      className="me-1 rounded-full"
                                                      domKey={`${symbol}-${index}`}
                                                      // use usdc instead of usdc(bridged), aka, usdc.e for the image
                                                      token={symbol.replace(
                                                        "(bridged)",
                                                        "",
                                                      )}
                                                      height={20}
                                                      width={20}
                                                    />
                                                  );
                                                },
                                              )}
                                              {protocol.interface.symbolList.join(
                                                "-",
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-5 pl-8 pr-0 text-right align-top tabular-nums text-white">
                                          {(
                                            portfolioApr?.[portfolioName]?.[
                                              protocol.interface.uniqueId()
                                            ]?.apr * 100
                                          ).toFixed(2)}
                                          %
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <th
                                    scope="row"
                                    className="pt-6 font-semibold text-white"
                                  >
                                    Avg. APR
                                  </th>
                                  <td className="pt-6 font-semibold text-right text-green-500">
                                    {(
                                      portfolioApr[portfolioName]
                                        ?.portfolioAPR * 100
                                    ).toFixed(2)}
                                    %
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ),
                      ),
                  )}
                  <div>
                    <span className="text-gray-500">Lock-up Period</span>{" "}
                      {loading === true
                        ? <Spin />
                        : lockUpPeriod !== 0
                        ? (
                        <span className="text-red-500">
                          {Math.floor(lockUpPeriod / 86400)} d {" "}
                          {
                            Math.ceil((lockUpPeriod % 86400) / 3600)
                            ? Math.ceil((lockUpPeriod % 86400) / 3600) + "h"
                            : null
                          }
                        </span>
                        )
                        : <span className="text-green-500">Unlocked</span>
                      }
                  </div>
              </div>
              <HistoricalDataChart portfolioName={portfolioName} />
            </div>
            <div className="lg:col-start-3">
              {/* Activity feed */}
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
      </main>
    </BasePage>
  );
}
