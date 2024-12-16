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
  const absAmount = Math.abs(amount);
  return absAmount === 0 ? (
    <Spin />
  ) : absAmount < 0.01 ? (
    "< $0.01"
  ) : (
    `$${absAmount.toFixed(2)}`
  );
};

const TotalAmountDisplay = ({ amount }) => {
  const isProfit = amount > 0;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      <dt className="text-base font-medium text-gray-900">
        {isProfit ? "Total profit" : "Total loss"}
      </dt>
      <dd className="text-base font-medium text-gray-900">
        <span className={isProfit ? "text-green-500" : ""}>
          {isProfit && "🎉 "}
          {formatAmount(amount)}
        </span>
      </dd>
    </div>
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
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
        if (finishedTxn) {
          window.location.reload();
        }
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
            className="relative transform overflow-hidden rounded-lg bg-gray-400 px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-5xl sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div className="flex flex-col h-full">
              <div>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100">
                  {finishedTxn === false ? (
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
                {finishedTxn === false ? (
                  <DemoFlowDirectionGraph
                    data={portfolioHelper?.getFlowChartData("zapIn", {
                      inputToken: "usdc",
                      inputTokenAddress:
                        "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                      amount: 1,
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
                    <span
                      className={totalTradingLoss > 0 ? "text-green-500" : ""}
                    >
                      {totalTradingLoss > 0 ? "🎉" : ""}{" "}
                      {formatAmount(totalTradingLoss)}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex text-sm text-gray-600">
                    <span>Performance fee estimate</span>
                    <a
                      href="#"
                      className="ml-2 shrink-0 text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">
                        Learn more about how tax is calculated
                      </span>
                      <QuestionMarkCircleIcon
                        aria-hidden="true"
                        className="size-5"
                      />
                    </a>
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {isNaN(
                      ((5 * 0.0029 * 2 * 0.5 + 0.0029 * 2) / portfolioAPR) *
                        100,
                    ) ? (
                      <Spin />
                    ) : (
                      `${(
                        ((5 * 0.0029 * 2 * 0.5 + 0.0029 * 2) / portfolioAPR) *
                        100
                      ).toFixed(2)}%`
                    )}
                  </dd>
                </div>
                <TotalAmountDisplay amount={totalTradingLoss} />
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
