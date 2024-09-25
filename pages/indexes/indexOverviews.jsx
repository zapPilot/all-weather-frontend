// copy from this Tailwind template: https://tailwindui.com/components/application-ui/page-examples/detail-screens
"use client";
import BasePage from "../basePage.tsx";
import { useState, useCallback, useEffect } from "react";
import DecimalStep from "./DecimalStep";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import TransacitonHistory from "./transacitonHistory.jsx";
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
} from "antd";
import TokenDropdownInput from "../views/TokenDropdownInput.jsx";
import {
  useActiveAccount,
  useSendBatchTransaction,
  useActiveWalletChain,
} from "thirdweb/react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import axios from "axios";
import openNotificationWithIcon from "../../utils/notification.js";
import { selectBefore } from "../../utils/contractInteractions";
import APRComposition from "../views/components/APRComposition";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { generateIntentTxns } from "../../classes/main.js";
import { CurrencyDollarIcon, BanknotesIcon } from "@heroicons/react/20/solid";
import { SettingOutlined } from "@ant-design/icons";
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
  const [usdBalanceLoading, setUsdBalanceLoading] = useState(false);
  const [pendingRewardsLoading, setPendingRewardsLoading] = useState(false);
  const [principalBalance, setPrincipalBalance] = useState(0);
  const [open, setOpen] = useState(false);
  const [tokenPricesMappingTable, setTokenPricesMappingTable] = useState({});

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
    );

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
                  investmentAmount,
                  zapOutAmount: usdBalance * zapOutPercentage,
                  timestamp: Math.floor(Date.now() / 1000),
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

  const onChange = (key) => {};
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
          <Button
            type="primary"
            className="w-full mt-2"
            onClick={() => handleAAWalletAction("zapIn")}
            loading={zapInIsLoading}
            disabled={investmentAmount === 0}
          >
            Zap In
          </Button>
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
          <Button
            type="primary"
            className="w-full"
            onClick={() => handleAAWalletAction("zapOut")}
            loading={zapOutIsLoading || usdBalanceLoading}
            disabled={usdBalance === 0}
          >
            Withdraw
          </Button>
        </div>
      ),
    },
    {
      key: "3",
      label: "Convert Rewards",
      children: (
        <div>
          {selectBefore(handleSetSelectedToken, chainId?.id, selectedToken)}
          <Button
            type="primary"
            className="w-full mt-2"
            onClick={() => handleAAWalletAction("claimAndSwap")}
            loading={claimIsLoading || pendingRewardsLoading}
          >
            Convert $
            {portfolioHelper?.sumUsdDenominatedValues(pendingRewards) > 0.01
              ? portfolioHelper
                  ?.sumUsdDenominatedValues(pendingRewards)
                  .toFixed(2)
              : portfolioHelper?.sumUsdDenominatedValues(pendingRewards)}{" "}
            Rewards to {selectedToken.split("-")[0]}
          </Button>
        </div>
      ),
    },
  ];

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
      setUsdBalanceLoading(false);

      const tokenPricesMappingTable =
        await portfolioHelper.getTokenPricesMappingTable(() => {});
      setTokenPricesMappingTable(tokenPricesMappingTable);

      const pendingRewards = await portfolioHelper.pendingRewards(
        account.address,
        () => {},
      );
      setPendingRewards(pendingRewards);

      setPendingRewardsLoading(false);
    };
    fetchUsdBalance();
  }, [portfolioName, account]);

  return (
    <BasePage>
      {notificationContextHolder}
      <ModalContent />
      <main>
        <header className="relative isolate pt-16">
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
            <div className="flex items-center justify-between gap-x-6">
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
              <div className="flex items-center gap-x-8 text-white">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    $ {portfolioApr[portfolioName]?.portfolioTVL}
                  </p>
                  <p className="font-medium">TVL</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" role="apr">
                    {(portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(
                      2,
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
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 p-4 ring-1 ring-white/10 sm:rounded-lg relative">
            <ConfigProvider
              theme={{
                components: {},
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
              <span className="text-gray-400">, Performance Fee: 9.9%</span>
            </div>
          </div>
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Invoice summary */}
            <div className="lg:col-start-3 lg:row-end-1">
              <h2 className="sr-only">Summary</h2>
              <div className="rounded-lg bg-gray-800 shadow-sm ring-1 ring-white/10">
                <dl className="flex flex-wrap">
                  <div className="flex-auto pl-6 pt-6">
                    <dt className="text-sm font-semibold leading-6 text-white">
                      Your Balance
                    </dt>
                    <dd className="mt-1 text-base font-semibold leading-6 text-white">
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
                    </dd>
                  </div>
                  <div className="flex-none self-end px-6 pt-4">
                    <dt className="sr-only">Rebalance</dt>
                    <dd className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-600/20">
                      Rebalance (wip)
                    </dd>
                  </div>
                  <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-white/5 px-6 pt-6">
                    <dt className="flex-none">
                      <span className="sr-only">Principal</span>
                      <BanknotesIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      Principal: {portfolioHelper?.denomination()}
                      {principalBalance?.toFixed(2)}
                    </dd>
                  </div>
                  <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-white/5 px-6 pt-6">
                    <dt className="flex-none">
                      <span className="sr-only">
                        Earned(Performance fee deducted, no fee if no earnings.)
                      </span>
                      <CurrencyDollarIcon
                        aria-hidden="true"
                        className="h-6 w-5 text-gray-500"
                      />
                    </dt>
                    <dd className="text-sm font-medium leading-6 text-white">
                      PnL: WIP
                      {/* TODO(David): uncomment this part once we have take asset price into account */}
                      {/* {usdBalanceLoading || Object.values(tokenPricesMappingTable).length ===0 ? (
                        <Spin />
                      ) : (
                        <span
                          className={
                            usdBalance - principalBalance < 0 || usdBalance / tokenPricesMappingTable["weth"] - principalBalance < 0
                              ? "text-red-500"
                              : "text-green-500"
                          }
                        >
                          {portfolioHelper?.denomination()}{
                            portfolioName === 'ETH Vault' ? (
                              usdBalance / tokenPricesMappingTable["weth"] - principalBalance
                            ).toFixed(2) : (
                              usdBalance - principalBalance
                            ).toFixed(2)
                          }
                        </span>
                      )} */}
                      <div className="text-gray-500">
                        Performance fee deducted, no fee if no earnings
                      </div>
                    </dd>
                  </div>
                  <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
                    <dt className="flex-none">
                      <span className="sr-only">Rewards</span>
                      <APRComposition
                        APRData={pendingRewards}
                        mode="pendingRewards"
                        currency="$"
                        exchangeRateWithUSD={1}
                        pendingRewardsLoading={pendingRewardsLoading}
                      />
                    </dt>
                    <dd className="text-sm leading-6 text-white">
                      Rewards: $
                      {portfolioHelper?.sumUsdDenominatedValues(
                        pendingRewards,
                      ) > 0.01
                        ? portfolioHelper
                            ?.sumUsdDenominatedValues(pendingRewards)
                            .toFixed(2)
                        : portfolioHelper?.sumUsdDenominatedValues(
                            pendingRewards,
                          )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Invoice */}
            <div className="-mx-4 px-4 py-8 shadow-sm ring-1 ring-white/10 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20 xl:pt-16">
              <h2 className="text-base font-semibold leading-6 text-white">
                Allocations
              </h2>
              {portfolioHelper &&
                Object.entries(portfolioHelper.strategy).map(
                  ([category, protocols]) =>
                    Object.entries(protocols).map(
                      ([chain, protocolArray], index) => (
                        <div key={`${chain}-${index}`}>
                          <table className="mt-16 w-full whitespace-nowrap text-left text-sm leading-6">
                            <colgroup>
                              <col className="w-full" />
                              <col />
                              <col />
                              <col />
                            </colgroup>
                            <thead className="border-b border-gray-200 text-white">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-0 py-3 font-semibold"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span>Protocols in</span>
                                    <Image
                                      src={`/chainPicturesWebp/${chain}.webp`}
                                      alt={chain}
                                      height={25}
                                      width={25}
                                    />
                                  </div>
                                </th>
                                {/* <th
                                        scope="col"
                                        className="hidden py-3 pl-8 pr-0 text-right font-semibold sm:table-cell"
                                      >
                                        APR
                                      </th> */}
                                <th
                                  scope="col"
                                  className="py-3 pl-8 pr-0 text-right font-semibold"
                                >
                                  APR
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {protocolArray
                                .sort((a, b) => b.weight - a.weight)
                                .map((protocol, index) => {
                                  // set weight to 0 for old protocols, these are protocols used to be the best choice but its reward decreased
                                  // so we opt out of them
                                  // need to keep them in the portfolio so users can zap out
                                  if (protocol.weight === 0) return null;
                                  return (
                                    // {invoice.items.map((item) => (
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
                                          />
                                          {protocol.interface.protocolName}-
                                          {protocol.weight * 100}%
                                        </div>
                                        <div className="truncate text-gray-500">
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
                                  colSpan={3}
                                  className="hidden px-0 pb-0 pt-6 text-right font-normal text-gray-300 sm:table-cell"
                                >
                                  Avg. APR
                                </th>
                                <td className="pb-0 pl-8 pr-0 pt-6 text-right tabular-nums text-white">
                                  {(
                                    portfolioApr[portfolioName]?.portfolioAPR *
                                    100
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
              <h2 className="text-base font-semibold leading-6 text-white">
                Where Does the Yield Come from?
              </h2>
              <dl className="mt-6 grid grid-cols-1 text-sm leading-6 sm:grid-cols-2">
                <div>{portfolioHelper?.description()}</div>
                {portfolioHelper?.lockUpPeriod() !== 0 ? (
                  <div className="sm:pr-4">
                    <dt className="inline text-gray-500">Lock-up Period</dt>{" "}
                    <dd className="inline text-gray-300">
                      <time dateTime="2023-23-01">
                        {portfolioHelper?.lockUpPeriod()} Days
                      </time>
                    </dd>
                  </div>
                ) : null}
              </dl>
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
