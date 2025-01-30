"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import DemoFlowDirectionGraph from "../FlowChart";
import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { Popover, Spin } from "antd";

const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return <Spin />;

  const absAmount = Math.abs(amount);
  return absAmount < 0.01 ? "< $0.01" : `$${absAmount.toFixed(2)}`;
};

const AmountDisplay = ({
  propKey,
  amount,
  showEmoji = false,
  isGreen = false,
  isLoading = false,
  showOnlyPercentage = false,
  portfolioHelper,
  portfolioAPR,
}) => {
  if (showOnlyPercentage) {
    return (
      <span className={isGreen ? "text-green-500" : ""} key={propKey}>
        {isLoading ? (
          <Spin key={`spin-${amount}`} />
        ) : (
          `${(
            (((portfolioHelper?.constructor?.name === "EthVault" ? 0 : 4) *
              0.00299 *
              2 *
              0.5 +
              0.00299 * 2) /
              portfolioAPR) *
            100
          ).toFixed(2)}%`
        )}
      </span>
    );
  }

  return (
    <span className={isGreen ? "text-green-500" : ""} key={propKey}>
      {showEmoji && "🎉 Earned "}
      {isLoading ? <Spin key={`spin-${amount}`} /> : formatAmount(amount)}
    </span>
  );
};

export default function PopUpModal({
  portfolioHelper,
  stepName,
  tradingLoss,
  totalTradingLoss,
  open,
  setOpen,
  chainId,
  finishedTxn,
  txnLink,
  portfolioAPR,
  actionName,
  selectedToken,
  investmentAmount,
  costsCalculated,
  platformFee,
  rebalancableUsdBalanceDict,
  chainMetadata,
  rebalanceAmount,
  zapOutAmount,
}) {
  return (
    <Dialog
      open={Boolean(open)} // Ensure boolean conversion
      onClose={() => {
        setOpen(false);
      }}
      className="relative z-10"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/95 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-gray-300 px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-5xl sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div className="flex flex-col h-full">
              <div>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100">
                  {costsCalculated === false ? (
                    <Spin />
                  ) : (
                    <CheckIcon
                      aria-hidden="true"
                      className="size-6 text-green-600"
                    />
                  )}
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    {finishedTxn === false
                      ? "Bundling transactions..."
                      : "Transaction Complete"}
                  </DialogTitle>
                </div>
              </div>
              <div className="flex-grow">
                {finishedTxn === false &&
                actionName !== "" &&
                actionName !== "claimAndSwap" ? (
                  <DemoFlowDirectionGraph
                    data={portfolioHelper?.getFlowChartData(actionName, {
                      tokenInSymbol:
                        selectedToken?.toLowerCase()?.split("-")[0] === "eth"
                          ? "weth"
                          : selectedToken?.toLowerCase()?.split("-")[0],
                      tokenInAddress: selectedToken
                        ?.toLowerCase()
                        ?.split("-")[1],
                      outputToken: selectedToken?.toLowerCase()?.split("-")[0],
                      outputTokenAddress: selectedToken
                        ?.toLowerCase()
                        ?.split("-")[1],
                      rebalancableUsdBalanceDict,
                      chainMetadata,
                    })}
                    stepName={stepName}
                    tradingLoss={tradingLoss}
                    currentChain={chainId?.name}
                  />
                ) : (
                  <a
                    href={txnLink}
                    target="_blank"
                    className="flex justify-center"
                  >
                    <ArrowTopRightOnSquareIcon className="h-6 w-5 text-gray-500" />
                  </a>
                )}
              </div>
              {/* Cost summary */}
              <dl className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex items-center text-sm text-gray-600">
                    <span>
                      {totalTradingLoss > 0
                        ? "Arbitrage profit estimate"
                        : "Transaction cost estimate"}
                    </span>
                    <a
                      href="#"
                      className="ml-2 shrink-0 text-gray-400 hover:text-gray-500"
                    >
                      <Popover
                        content={
                          <>
                            Transaction cost estimate:
                            <br />
                            1. DEX slippage
                            <br />
                            2. Deposit fee charged by protocols like Pendle,
                            Curve, etc.
                            <br />
                            3. Withdrawal fee charged by protocols like Pendle,
                            Curve, etc.
                            <br />
                            <br />
                            Arbitrage profit estimate:
                            <br />
                            1. Market inefficiencies between protocols may
                            create opportunities for profitable trades
                            <br />
                          </>
                        }
                        title="How is this calculated?"
                        trigger="hover"
                      >
                        <QuestionMarkCircleIcon
                          aria-hidden="true"
                          className="size-5"
                        />
                      </Popover>
                    </a>
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    <AmountDisplay
                      propKey="tansaction-costs"
                      amount={totalTradingLoss}
                      showEmoji={totalTradingLoss > 0 && costsCalculated}
                      isGreen={totalTradingLoss > 0}
                      isLoading={!costsCalculated}
                      portfolioHelper={portfolioHelper}
                      portfolioAPR={portfolioAPR}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex items-center text-sm text-gray-600">
                    <span>Platform fee estimate</span>
                    <a
                      href="#"
                      className="ml-2 shrink-0 text-gray-400 hover:text-gray-500"
                    >
                      <Popover
                        content={
                          <>
                            1. Zap in: 0.299%
                            <br />
                            2. Zap out: 0.299%
                            <br />
                            3. Rebalance: 0.598%
                            <br />
                            <br />
                            (zap-in * 1 time + zap-out * 1 time + rebalance *
                            {portfolioHelper?.constructor?.name === "EthVault"
                              ? 0
                              : 4}
                            {""}
                            times per year * 50%) / APR = <br />
                            (usually of 50% of your money needs to be
                            rebalanced) <br />
                            (0.00299 * 1 + 0.00299 * 1 + 0.00598 *{" "}
                            {portfolioHelper?.constructor?.name === "EthVault"
                              ? 0
                              : 4}{" "}
                            * 0.5) / {portfolioAPR} = <br />
                            {(
                              ((0.00299 * 1 +
                                0.00299 * 1 +
                                0.00598 *
                                  (portfolioHelper?.constructor?.name ===
                                  "EthVault"
                                    ? 0
                                    : 4) *
                                  0.5) /
                                portfolioAPR) *
                              100
                            ).toFixed(2)}
                            %
                          </>
                        }
                        title="How is Performance fee calculated?"
                        trigger="hover"
                      >
                        <QuestionMarkCircleIcon
                          aria-hidden="true"
                          className="size-5"
                        />
                      </Popover>
                    </a>
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    Performance fee{" "}
                    <AmountDisplay
                      propKey="platformFee"
                      amount={platformFee}
                      showEmoji={false}
                      isGreen={false}
                      isLoading={!costsCalculated}
                      showOnlyPercentage={true}
                      portfolioHelper={portfolioHelper}
                      portfolioAPR={portfolioAPR}
                    />
                  </dd>
                </div>
              </dl>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      "https://t.me/all_weather_protocol_bot",
                      "_blank",
                    )
                  }
                  className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  Subscribe for Rebalance Notifications
                  <span className="fi fi-brands-telegram ml-2"></span>
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
