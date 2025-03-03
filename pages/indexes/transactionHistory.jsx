"use client";
import { useState, useEffect } from "react";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useActiveAccount } from "thirdweb/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { timeAgo, unixToCustomFormat } from "../../utils/general";
import { useRouter } from "next/router";
import Image from "next/image";
import { token } from "@etherspot/prime-sdk/dist/sdk/contracts/@openzeppelin/contracts";
// Constants
const ACTION_LABELS = {
  zapIn: "Deposit",
  zapOut: "Withdraw",
  transfer: "Transfer",
  rebalance: "Rebalance",
  receive: "Receive",
  crossChainRebalance: "Cross-Chain Rebalance",
  localRebalance: "Local Rebalance",
};

const ACTION_COLORS = {
  zapIn: "text-green-500",
  zapOut: "text-orange-500",
  transfer: "text-orange-500",
  receive: "text-green-500",
  crossChainRebalance: "text-blue-500",
  localRebalance: "text-blue-500",
  default: "text-blue-500",
};

// Helper Functions
const classNames = (...classes) => classes.filter(Boolean).join(" ");

const refineSymbol = (tokenSymbol) =>
  tokenSymbol.includes("usd") || tokenSymbol.includes("dai")
    ? "usd"
    : tokenSymbol;

const updateBalance = (balance, symbol, amount) => ({
  ...balance,
  [symbol]: (balance[symbol] || 0) + amount,
});

// Add separate function for rebalance suffix
const getRebalanceLabel = (tokenSum) => {
  const baseLabel = ACTION_LABELS.rebalance;
  const suffix = tokenSum > 0 ? " (refund)" : tokenSum < 0 ? " (cost)" : "";
  return baseLabel + suffix;
};

export default function TransactionHistory({
  setPrincipalBalance,
  tokenPricesMappingTable,
}) {
  const router = useRouter();
  const { portfolioName } = router.query;
  const [transactionHistoryData, setTransactionHistoryData] = useState([]);
  const account = useActiveAccount();

  // Balance calculation functions
  const calculatePrincipalBalance = (transactions) => {
    let balance = {};

    for (const txn of transactions) {
      if (txn.metadata.portfolioName !== portfolioName) continue;
      const {
        actionName,
        tokenSymbol,
        zapOutAmount = 0,
        zapInAmountOnThisChain = 0,
      } = txn.metadata || {};

      // Skip if required fields are missing
      if (!actionName || !tokenSymbol) continue;

      const principalSymbol = refineSymbol(tokenSymbol);

      if (["zapIn", "receive"].includes(actionName)) {
        if (!zapInAmountOnThisChain) continue;
        const amount = parseFloat(zapInAmountOnThisChain) || 0;
        balance = updateBalance(balance, principalSymbol, amount);
      }

      if (["zapOut", "transfer", "rebalance", "crossChainRebalance", "localRebalance"].includes(actionName)) {
        if (!zapOutAmount) continue;
        const amount = parseFloat(zapOutAmount) || 0;
        const price = tokenPricesMappingTable[principalSymbol];
        balance = updateBalance(balance, principalSymbol, -amount / price);
      }

      if (["zapOut", "rebalance", "crossChainRebalance", "localRebalance"].includes(actionName) && txn.gotRefundData) {
        Object.entries(txn.gotRefundData).forEach(([_, data]) => {
          if (!data?.symbol || !data?.amount) return;
          const price = tokenPricesMappingTable[data.symbol];
          balance = updateBalance(
            balance,
            refineSymbol(data.symbol),
            -data.amount / price,
          );
        });
      }
    }
    return balance;
  };

  const calculateTotalBalance = (principalBalance) => {
    // Ensure USD price is set
    tokenPricesMappingTable["usd"] = 1;
    return Object.entries(principalBalance).reduce((total, [token, amount]) => {
      // Get the token price, default to 0 if undefined
      const tokenPrice = tokenPricesMappingTable[token] || 0;

      // Ensure amount is a number
      const numericAmount = Number(amount) || 0;
      return total + numericAmount * tokenPrice;
    }, 0);
  };

  // Transaction rendering
  const renderTokenAmount = (symbol, amount, actionName, isStablecoin) => {
    const showDollarSign = !isStablecoin && actionName !== "zapIn";
    const amountDisplay = amount > 0.01 ? amount.toFixed(2) : "< 0.01";

    return (
      <div key={symbol} className="flex gap-1 items-center">
        {amountDisplay}
        {showDollarSign && " worth of "}
        {actionName === "transfer" ? (
          "LP tokens"
        ) : (
          <>
            <ImageWithFallback
              token={symbol}
              height={20}
              width={20}
              domKey={`${symbol}-${amount}`}
            />
            {symbol}
          </>
        )}
      </div>
    );
  };

  const renderSingleTransaction = (activityItem) => {
    const {
      metadata: {
        actionName,
        tokenSymbol,
        zapOutAmount,
        zapInAmountOnThisChain,
      },
      gotRefundData,
    } = activityItem;
    const tokenDict = {};

    // Calculate token amounts
    if (["zapOut", "rebalance", "crossChainRebalance", "localRebalance"].includes(actionName)) {
      Object.values(gotRefundData || {}).forEach(({ symbol, amount }) => {
        tokenDict[symbol] = (tokenDict[symbol] || 0) + amount;
      });
    }

    const actionAmount = ["receive", "zapIn"].includes(actionName)
      ? parseFloat(zapInAmountOnThisChain)
      : ["transfer", "zapOut"].includes(actionName)
      ? parseFloat(zapOutAmount)
      : 0;

    if (actionAmount) {
      tokenDict[tokenSymbol] = (tokenDict[tokenSymbol] || 0) + actionAmount;
    }

    const tokenSum = Object.values(tokenDict).reduce(
      (acc, amount) => acc + amount,
      0,
    );
    const actionLabel =
      actionName === "rebalance" || actionName === "crossChainRebalance" || actionName === "localRebalance"
        ? getRebalanceLabel(tokenSum)
        : ACTION_LABELS[actionName] || actionName;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <span className={ACTION_COLORS[actionName] || ACTION_COLORS.default}>
            {actionLabel}
          </span>{" "}
          on{" "}
          {
            <Image
              src={`/chainPicturesWebp/${activityItem.metadata.chain?.replace(
                " one",
                "",
              )}.webp`}
              height={20}
              width={20}
            />
          }
        </div>
        {Object.entries(tokenDict).map(([symbol, amount]) =>
          renderTokenAmount(
            symbol,
            amount,
            actionName,
            refineSymbol(symbol) === "usd",
          ),
        )}
      </div>
    );
  };

  // Data fetching
  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (
        !account?.address ||
        Object.values(tokenPricesMappingTable || {}).length === 0
      )
        return;

      const resp = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/transaction/category/${account.address}`,
      );

      setTransactionHistoryData(resp.data.transactions);
      const principalBalance = calculatePrincipalBalance(
        resp.data.transactions,
      );
      setPrincipalBalance(calculateTotalBalance(principalBalance));
    };

    fetchTransactionHistory();
  }, [account, tokenPricesMappingTable, portfolioName]);

  // Render
  return (
    <>
      {transactionHistoryData
        .filter((item) => item.metadata.portfolioName === portfolioName)
        .map((activityItem, activityItemIdx) => (
          <li key={activityItemIdx} className="relative flex gap-x-4">
            <div
              className={classNames(
                activityItemIdx === transactionHistoryData.length - 1
                  ? "h-6"
                  : "-bottom-6",
                "absolute left-0 top-0 flex w-6 justify-center",
              )}
            >
              <div className="w-px bg-gray-200" />
            </div>
            <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-black">
              {activityItem.type === "paid" ? (
                <CheckCircleIcon
                  className="h-6 w-6 text-indigo-600"
                  aria-hidden="true"
                />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
              )}
            </div>
            <p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
              <span className="font-medium text-white">
                {renderSingleTransaction(activityItem)}
              </span>{" "}
              <a
                href={`https://${activityItem.metadata.chain?.replace(
                  " one",
                  "",
                )}.blockscout.com/tx/${activityItem.tx_hash}`}
                target="_blank"
              >
                tx:{" "}
                {`${activityItem.tx_hash.slice(
                  0,
                  4,
                )}...${activityItem.tx_hash.slice(-4)}`}
              </a>
            </p>
            <time
              dateTime={activityItem.metadata.timestamp}
              className="flex-none py-0.5 text-xs leading-5 text-gray-500"
            >
              {timeAgo(unixToCustomFormat(activityItem.metadata.timestamp))}
            </time>
          </li>
        ))}
    </>
  );
}
