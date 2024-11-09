"use client";
import { useState, useEffect } from "react";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useActiveAccount } from "thirdweb/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { timeAgo, unixToCustomFormat } from "../../utils/general";
import { useRouter } from "next/router";

// Constants
const VAULT_CONFIGS = {
  "ETH Vault": {
    baseDenom: "weth",
    tokens: ["weth", "usd", "wbtc"],
  },
  "BTC Vault": {
    baseDenom: "wbtc",
    tokens: ["wbtc", "usd", "weth"],
  },
  "Stablecoin Vault": {
    baseDenom: "usd",
    tokens: ["usd", "weth", "wbtc"],
  },
};

const ACTION_LABELS = {
  zapIn: "Deposit",
  zapOut: "Withdraw",
  transfer: "Transfer",
  rebalance: "Rebalance",
};

const ACTION_COLORS = {
  zapIn: "text-green-500",
  zapOut: "text-orange-500",
  transfer: "text-orange-500",
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
    // here's the sample data of txn
    // {
    //   "gotRefundData": {
    //     "0xaf88d065e77c8cc2239327c5edb3a432268e5831": {
    //       "amount": 8.149597999999997,
    //       "symbol": "usdc"
    //     },
    //     "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": {
    //       "amount": 0.0006669999999999732,
    //       "symbol": "usdc"
    //     }
    //   },
    //   "metadata": {
    //     "actionName": "zapOut",
    //     "investmentAmount": 0,
    //     "portfolioName": "Stablecoin Vault",
    //     "referralFeeRate": 0.7,
    //     "swapFeeRate": 0.00299,
    //     "timestamp": 1729756193,
    //     "tokenSymbol": "usdc",
    //     "zapOutAmount": 1.0000000000000002
    //   },
    //   "tx_hash": "0x5d41e027678cb6fdc6fa9aac2631af15d222a62d47fcf98af6458ab736372156",
    //   "user_address": "0x210050bB080155AEc4EAE79a2aAC5fe78FD738E1"
    // }
    let balance = {};

    for (const txn of transactions) {
      if (txn.metadata.portfolioName !== portfolioName) continue;

      const { actionName, tokenSymbol, investmentAmount, zapOutAmount } =
        txn.metadata;
      const principalSymbol = refineSymbol(tokenSymbol);

      if (actionName === "zapIn") {
        balance = updateBalance(
          balance,
          principalSymbol,
          parseFloat(investmentAmount) || 0,
        );
      }

      if (["zapOut", "transfer"].includes(actionName)) {
        balance = updateBalance(
          balance,
          principalSymbol,
          -(parseFloat(zapOutAmount) || 0),
        );
      }

      if (["zapOut", "rebalance"].includes(actionName)) {
        Object.values(txn.gotRefundData || {}).forEach(({ symbol, amount }) => {
          balance = updateBalance(balance, refineSymbol(symbol), -amount);
        });
      }
    }

    return balance;
  };

  const calculateTotalBalance = (principalBalance) => {
    const convertDenomination = (amount, fromToken, toToken) => {
      if (fromToken === toToken) return amount;
      if (fromToken === "usd") return amount / tokenPricesMappingTable[toToken];
      if (toToken === "usd") return amount * tokenPricesMappingTable[fromToken];
      return (
        (amount * tokenPricesMappingTable[fromToken]) /
        tokenPricesMappingTable[toToken]
      );
    };

    const config = VAULT_CONFIGS[portfolioName];
    if (!config) return 0;

    return config.tokens.reduce((total, token) => {
      const amount = principalBalance[token] || 0;
      return total + convertDenomination(amount, token, config.baseDenom);
    }, 0);
  };

  // Transaction rendering
  const renderTokenAmount = (symbol, amount, actionName, isStablecoin) => {
    const showDollarSign =
      !isStablecoin || ["zapOut", "transfer"].includes(actionName);
    const amountDisplay = amount > 0.01 ? amount.toFixed(2) : "< 0.01";

    return (
      <div key={symbol} className="flex gap-1 items-center">
        {showDollarSign && "$"}
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
      metadata: { actionName, tokenSymbol, investmentAmount, zapOutAmount },
      gotRefundData,
    } = activityItem;
    const tokenDict = {};

    // Calculate token amounts
    if (["zapOut", "rebalance"].includes(actionName)) {
      Object.values(gotRefundData || {}).forEach(({ symbol, amount }) => {
        tokenDict[symbol] = (tokenDict[symbol] || 0) + amount;
      });
    }

    const actionAmount =
      actionName === "zapIn"
        ? parseFloat(investmentAmount)
        : ["zapOut", "transfer"].includes(actionName)
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
      actionName === "rebalance"
        ? getRebalanceLabel(tokenSum)
        : ACTION_LABELS[actionName] || actionName;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <span className={ACTION_COLORS[actionName] || ACTION_COLORS.default}>
            {actionLabel}
          </span>
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
        Object.values(tokenPricesMappingTable).length === 0
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
                href={`https://arbitrum.blockscout.com/tx/${activityItem.tx_hash}`}
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
