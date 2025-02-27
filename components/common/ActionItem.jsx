import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

const ActionItem = ({
  actionName,
  availableAssetChains,
  currentChain,
  chainStatus,
  theme,
}) => {
  const actionIsArray = Array.isArray(actionName);
  const actionNameMap = {
    zapIn: "Deposit",
    zapOut: "Withdraw",
    rebalance: "Rebalance",
  };
  return (
    <>
      <div className="flex justify-center text-base font-semibold">
        {availableAssetChains?.map((chain, index) => (
          <div
            className={`flex flex-col items-center mx-2 ${
              chainStatus[chain]
                ? "text-green-500"
                : currentChain === chain
                ? theme === "light"
                  ? "text-gray-900"
                  : "text-white"
                : "text-gray-500"
            }`}
            key={index}
          >
            <div
              className={`w-10 h-10 border-2 rounded-full flex items-center justify-center relative ${
                chainStatus[chain]
                  ? "border-green-500"
                  : currentChain === chain
                  ? theme === "light"
                    ? "border-gray-900"
                    : "border-white"
                  : "border-gray-500"
              }`}
            >
              {!chainStatus[chain] && (
                <div className="absolute -top-2">
                  <span class="relative flex size-3">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex size-3 rounded-full bg-red-500"></span>
                  </span>
                </div>
              )}

              {index + 1}
            </div>
            <p>
              {actionIsArray
                ? actionNameMap[actionName[index]]
                : actionNameMap[actionName]}{" "}
              on {chain}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        {availableAssetChains.every((chain) => chainStatus[chain]) && (
          <div className={"text-green-500 text-center mb-2"}>
            <CheckCircleIcon className="w-12 h-12 mx-auto" />
            <p>You have completed all actions.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ActionItem;
