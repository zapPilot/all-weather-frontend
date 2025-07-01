"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import DemoFlowDirectionGraph from "../FlowChart";
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import { Popover, Spin } from "antd";
import ActionItem from "../../components/common/ActionItem";
import { getNextChain } from "../../utils/chainOrder";
import React from "react";
import flowChartEventEmitter from "../../utils/FlowChartEventEmitter";
import TenderlySimulation from "../../components/TenderlySimulation";

const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return <Spin />;
  const absAmount = Math.abs(amount);
  return absAmount < 0.01 ? "< $0.01" : `$${absAmount.toFixed(2)}`;
};

const calculatePerformanceFee = (portfolioHelper, portfolioAPR) => {
  const rebalanceMultiplier =
    portfolioHelper?.constructor?.name === "EthVault" ? 0 : 4;
  return (
    ((rebalanceMultiplier * 0.00299 * 2 * 0.5 + 0.00299 * 2) / portfolioAPR) *
    100
  ).toFixed(2);
};
function entryFeeToPerformanceFee(entryFee, apr) {
  if (apr === 0) {
    return 0; // Avoid division by zero — no profit, no performance fee equivalent
  }

  const performanceFee = entryFee / apr;
  return performanceFee * 100; // return as percentage
}

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
  const className = isGreen ? "text-green-500" : "";

  if (isLoading) {
    return <Spin key={`spin-${amount}`} />;
  }

  if (showOnlyPercentage) {
    return (
      <span className={className} key={propKey}>
        {`${calculatePerformanceFee(portfolioHelper, portfolioAPR)}%`}
      </span>
    );
  }

  return (
    <span className={className} key={propKey}>
      {showEmoji && "🎉 Earned "}
      {formatAmount(amount)}
    </span>
  );
};

export default function PopUpModal({
  account,
  portfolioHelper,
  tradingLoss,
  totalTradingLoss,
  open,
  setOpen,
  chainId,
  finishedTxn,
  txnLink,
  portfolioAPR,
  actionName,
  onlyThisChain,
  selectedToken,
  investmentAmount,
  costsCalculated,
  platformFee,
  rebalancableUsdBalanceDict,
  chainMetadata,
  rebalanceAmount,
  zapOutAmount,
  availableAssetChains,
  currentChain,
  chainStatus,
  currentTab,
  allChainsComplete,
  errorMsg,
  tokenPricesMappingTable,
  generatedTransactions = [],
  tenderlySimulationContext = {},
}) {
  // Move useEffect to top level, before any conditional returns
  const tokenInSymbol =
    selectedToken?.toLowerCase()?.split("-")[0] === "eth"
      ? "weth"
      : selectedToken?.toLowerCase()?.split("-")[0];
  const tokenInAddress = selectedToken?.toLowerCase()?.split("-")[1];
  const outputToken = selectedToken?.toLowerCase()?.split("-")[0];
  const outputTokenAddress = selectedToken?.toLowerCase()?.split("-")[1];
  React.useEffect(() => {
    if (!open || !actionName) return;

    const flowchartData = portfolioHelper?.getFlowChartData(
      actionName,
      {
        tokenInSymbol,
        tokenInAddress,
        outputToken,
        outputTokenAddress,
        rebalancableUsdBalanceDict,
        usdBalanceDict: rebalancableUsdBalanceDict,
        chainMetadata,
        investmentAmount,
        zapOutAmount,
        rebalanceAmount,
        onlyThisChain,
      },
      tokenPricesMappingTable,
    );

    if (flowchartData?.nodes) {
      // Get all node IDs from the flowchart data
      const allNodeIds = flowchartData.nodes.map((node) => node.id);

      // Clear and initialize all nodes
      flowChartEventEmitter.clearAll(allNodeIds).then(() => {
        // Add a small delay to ensure initialization is complete
        return new Promise((resolve) => setTimeout(resolve, 200));
      });
    }
  }, [
    open,
    actionName,
    portfolioHelper,
    selectedToken,
    rebalancableUsdBalanceDict,
    chainMetadata,
    investmentAmount,
    zapOutAmount,
    rebalanceAmount,
    onlyThisChain,
    tokenPricesMappingTable,
  ]);

  if (!actionName) return null;

  const flowchartData = portfolioHelper?.getFlowChartData(
    actionName,
    {
      tokenInSymbol:
        selectedToken?.toLowerCase()?.split("-")[0] === "eth"
          ? "weth"
          : selectedToken?.toLowerCase()?.split("-")[0],
      tokenInAddress: selectedToken?.toLowerCase()?.split("-")[1],
      outputToken: selectedToken?.toLowerCase()?.split("-")[0],
      outputTokenAddress: selectedToken?.toLowerCase()?.split("-")[1],
      rebalancableUsdBalanceDict,
      usdBalanceDict: rebalancableUsdBalanceDict,
      chainMetadata,
      investmentAmount,
      zapOutAmount,
      rebalanceAmount,
      onlyThisChain,
    },
    tokenPricesMappingTable,
  );

  const renderStatusIcon = () => {
    if (errorMsg) return <XMarkIcon className="h-5 w-5 text-red-500" />;
    if (!finishedTxn) return <Spin />;
    return null;
  };

  const getStatusMessage = () => {
    if (errorMsg) return errorMsg;
    if (!finishedTxn) return "Bundling transactions...";
    return "";
  };

  const getCurrentStep = () => {
    const completedSteps = Object.values(chainStatus || {}).filter(
      Boolean,
    ).length;
    return completedSteps + 1;
  };

  const getNextChainInfo = () => {
    const nextChain = getNextChain(
      availableAssetChains,
      chainStatus,
      currentChain,
    );
    return {
      name: nextChain,
      imagePath: `/chainPicturesWebp/${nextChain?.toLowerCase()}.webp`,
    };
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog
      open={Boolean(open)} // Ensure boolean conversion
      onClose={handleClose}
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
            <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="flex flex-col h-full">
              <div>
                <div className="text-center mt-5">
                  <ActionItem
                    tab="popupModal"
                    actionName={
                      currentTab === "3"
                        ? rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.map(
                            (action) => action.actionName,
                          )
                        : actionName
                    }
                    availableAssetChains={
                      currentTab === "3"
                        ? rebalancableUsdBalanceDict?.metadata?.rebalanceActionsByChain.map(
                            (action) => action.chain,
                          )
                        : availableAssetChains
                    }
                    currentChain={currentChain}
                    chainStatus={chainStatus}
                    theme="light"
                    isStarted={Object.values(chainStatus || {}).some(
                      (status) => status,
                    )}
                    account={account}
                    errorMsg={errorMsg}
                  />
                </div>
                <div className="mx-auto flex items-center justify-center rounded-full">
                  {renderStatusIcon()}
                  <DialogTitle as="h3" className="ms-2 text-base text-gray-900">
                    {getStatusMessage()}
                  </DialogTitle>
                </div>
              </div>
              <div className="flex-grow">
                {finishedTxn === false && actionName !== "" ? (
                  <div className="space-y-6">
                    <DemoFlowDirectionGraph
                      data={flowchartData}
                      tradingLoss={tradingLoss}
                      currentChain={chainId?.name}
                    />

                    {/* Tenderly Simulation Section */}
                    {generatedTransactions.length > 0 && costsCalculated && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            🔬 Transaction Simulation
                          </h4>
                          <span className="text-xs text-gray-500">
                            {generatedTransactions.length} transactions
                          </span>
                        </div>
                        <TenderlySimulation
                          transactions={generatedTransactions}
                          context={tenderlySimulationContext}
                          buttonText="Simulate Bundle"
                          size="small"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Test your transactions safely before execution
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-4 w-full mt-4">
                      {allChainsComplete === true ? null : (
                        <button
                          type="button"
                          onClick={handleClose}
                          className="w-full max-w-md flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-white shadow-md"
                        >
                          Step {getCurrentStep()}: {actionName} on
                          <Image
                            src={getNextChainInfo().imagePath}
                            alt={getNextChainInfo().name}
                            width={25}
                            height={25}
                            loading="lazy"
                            quality={50}
                            unoptimized={true}
                          />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Cost summary */}
              <dl className="mt-6 flex flex-col gap-4">
                {/* Gas Fee */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex items-center text-sm text-gray-600 font-medium">
                    ⛽ Gas Fee
                  </dt>
                  <dd className="text-sm font-semibold text-green-700">
                    <span className="bg-green-100 px-2 py-1 rounded-md">
                      Free
                    </span>
                  </dd>
                </div>
                {/* Transaction Cost or Arbitrage Profit */}
                <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center text-sm text-gray-600 font-medium">
                      {totalTradingLoss > 0
                        ? "🤑 Arbitrage profit estimate"
                        : "💳 Transaction cost estimate"}
                      <Popover
                        content={
                          <>
                            <div className="font-semibold mb-1">
                              How is this calculated?
                            </div>
                            <div className="text-xs text-gray-500">
                              Transaction cost estimate:
                              <br />
                              1. DEX slippage
                              <br />
                              2. Deposit fee charged by protocols like Pendle,
                              Curve, etc.
                              <br />
                              3. Withdrawal fee charged by protocols like
                              Pendle, Curve, etc.
                              <br />
                              <br />
                              Arbitrage profit estimate:
                              <br />
                              1. Market inefficiencies between protocols may
                              create opportunities for profitable trades
                              <br />
                            </div>
                          </>
                        }
                        title=""
                        trigger="hover"
                      >
                        <QuestionMarkCircleIcon
                          aria-hidden="true"
                          className="size-5 ml-2 text-gray-400 hover:text-gray-500"
                        />
                      </Popover>
                    </dt>
                    <dd className="text-sm font-semibold text-gray-900">
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
                </div>
                {Object.values(chainStatus || {}).every((v) => !v) && (
                  <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center text-sm text-gray-600 font-medium">
                        💵 Entry Fee
                        <Popover
                          content={
                            <>
                              <div>
                                <strong>
                                  Entry Fee / APR = Performance Fee Equivalent
                                </strong>
                              </div>
                              <div>
                                {portfolioHelper.entryFeeRate()} /{" "}
                                {portfolioAPR} ={" "}
                                {(
                                  (portfolioHelper.entryFeeRate() /
                                    portfolioAPR) *
                                  100
                                ).toFixed(2)}
                                %
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                This shows what the entry fee would be if it
                                were charged as a performance fee, given the
                                current APR.
                              </div>
                            </>
                          }
                          title="How is Performance Fee Equivalent calculated?"
                          trigger="hover"
                        >
                          <QuestionMarkCircleIcon
                            aria-hidden="true"
                            className="size-5 ml-2 text-gray-400 hover:text-gray-500"
                          />
                        </Popover>
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        $
                        {platformFee < 0
                          ? -platformFee.toFixed(2)
                          : "something goes wrong"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-gray-500">
                        Performance Fee Equivalent
                      </dt>
                      <dd className="text-xs font-semibold text-emerald-600">
                        {entryFeeToPerformanceFee(
                          portfolioHelper.entryFeeRate(),
                          portfolioAPR,
                        ).toFixed(2)}
                        %
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
