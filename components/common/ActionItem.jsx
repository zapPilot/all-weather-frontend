import React from 'react';

const ActionItem = ({ actionName, availableAssetChains, currentChain, chainStatus, theme }) => (
  <div className="flex justify-center text-base font-semibold">
    {availableAssetChains.map((chain, index) => (
      <div
        className={`flex flex-col items-center mx-2 ${
          chainStatus[chain]
            ? "text-green-500"
            : currentChain === chain
              ? (theme === "light" ? "text-gray-900" : "text-white")
              : "text-gray-500"
        }`}
        key={index}
      >
        <div
          className={`w-10 h-10 border-2 rounded-full flex items-center justify-center ${
            chainStatus[chain]  
              ? "border-green-500"
              : currentChain === chain
                ? (theme === "light" ? "border-gray-900" : "border-white")
                : "border-gray-500"
          }`}
        >
          {index + 1}
        </div>
        <p>
          {Array.isArray(actionName) 
            ? (actionName[index] === "zapIn" ? "Deposit"
            : actionName[index] && actionName[index].charAt(0).toUpperCase() + actionName[index].slice(1))
            : actionName.charAt(0).toUpperCase() + actionName.slice(1)}
          {" "} on {chain}
        </p>
      </div>
    ))}
  </div>
);

export default ActionItem; 