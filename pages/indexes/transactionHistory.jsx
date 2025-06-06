"use client";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useActiveAccount } from "thirdweb/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { timeAgo, unixToCustomFormat } from "../../utils/general";
import { useRouter } from "next/router";
import Image from "next/image";
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

// Memoized components
const ChainImage = memo(({ chain }) => (
  <Image
    src={`/chainPicturesWebp/${chain?.replace(" one", "")}.webp`}
    height={20}
    width={20}
    loading="lazy"
    quality={50}
    unoptimized={true}
  />
));

ChainImage.displayName = "ChainImage";

const TokenAmount = memo(({ symbol, amount, actionName, isStablecoin }) => {
  const showDollarSign = !isStablecoin && actionName !== "zapIn";
  const amountDisplay = amount > 0.01 ? amount.toFixed(2) : "< 0.01";

  return (
    <div className="flex gap-1 items-center">
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
});

TokenAmount.displayName = "TokenAmount";

const TransactionItem = memo(({ activityItem, isLast }) => {
  const {
    metadata: {
      actionName,
      tokenSymbol,
      zapOutAmount,
      zapInAmountOnThisChain,
      chain,
      timestamp,
      portfolioName,
    },
    gotRefundData,
    tx_hash,
    type,
  } = activityItem;

  const tokenDict = useMemo(() => {
    const dict = {};

    if (
      ["zapOut", "rebalance", "crossChainRebalance", "localRebalance"].includes(
        actionName,
      )
    ) {
      Object.values(gotRefundData || {}).forEach(({ symbol, amount }) => {
        dict[symbol] = (dict[symbol] || 0) + amount;
      });
    }

    const actionAmount = ["receive", "zapIn"].includes(actionName)
      ? parseFloat(zapInAmountOnThisChain)
      : ["transfer", "zapOut"].includes(actionName)
      ? parseFloat(zapOutAmount)
      : 0;

    if (actionAmount) {
      dict[tokenSymbol] = (dict[tokenSymbol] || 0) + actionAmount;
    }

    return dict;
  }, [
    actionName,
    gotRefundData,
    zapInAmountOnThisChain,
    zapOutAmount,
    tokenSymbol,
  ]);

  const tokenSum = useMemo(
    () => Object.values(tokenDict).reduce((acc, amount) => acc + amount, 0),
    [tokenDict],
  );

  const actionLabel = useMemo(() => {
    if (
      ["rebalance", "crossChainRebalance", "localRebalance"].includes(
        actionName,
      )
    ) {
      const suffix = tokenSum > 0 ? " (refund)" : tokenSum < 0 ? " (cost)" : "";
      return ACTION_LABELS[actionName] + suffix;
    }
    return ACTION_LABELS[actionName] || actionName;
  }, [actionName, tokenSum]);

  return (
    <li className="relative flex gap-x-4">
      <div
        className={classNames(
          isLast ? "h-6" : "-bottom-6",
          "absolute left-0 top-0 flex w-6 justify-center",
        )}
      >
        <div className="w-px bg-gray-200" />
      </div>
      <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-black">
        {type === "paid" ? (
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
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <span
                className={ACTION_COLORS[actionName] || ACTION_COLORS.default}
              >
                {actionLabel}
              </span>{" "}
              on <ChainImage chain={chain} />
            </div>
            {Object.entries(tokenDict).map(([symbol, amount]) => (
              <TokenAmount
                key={symbol}
                symbol={symbol}
                amount={amount}
                actionName={actionName}
                isStablecoin={refineSymbol(symbol) === "usd"}
              />
            ))}
          </div>
        </span>{" "}
        <a
          href={`https://${chain
            ?.replace(" one", "")
            .replace(" mainnet", "timism")}.blockscout.com/tx/${tx_hash}`}
          target="_blank"
        >
          tx: {`${tx_hash.slice(0, 4)}...${tx_hash.slice(-4)}`}
        </a>
      </p>
      <time
        dateTime={timestamp}
        className="flex-none py-0.5 text-xs leading-5 text-gray-500"
      >
        {timeAgo(unixToCustomFormat(timestamp))}
      </time>
    </li>
  );
});

TransactionItem.displayName = "TransactionItem";

export default function TransactionHistory({
  setPrincipalBalance,
  tokenPricesMappingTable,
}) {
  const router = useRouter();
  const { portfolioName } = router.query;
  const [transactionHistoryData, setTransactionHistoryData] = useState([]);
  const account = useActiveAccount();

  const calculatePrincipalBalance = useCallback(
    (transactions) => {
      let balance = {};

      for (const txn of transactions) {
        if (txn.metadata.portfolioName !== portfolioName) continue;
        const {
          actionName,
          tokenSymbol,
          zapOutAmount = 0,
          zapInAmountOnThisChain = 0,
        } = txn.metadata || {};

        if (!actionName || !tokenSymbol) continue;

        const principalSymbol = refineSymbol(tokenSymbol);

        if (["zapIn", "receive"].includes(actionName)) {
          if (!zapInAmountOnThisChain) continue;
          const amount = parseFloat(zapInAmountOnThisChain) || 0;
          balance = updateBalance(balance, principalSymbol, amount);
        }

        if (
          [
            "zapOut",
            "transfer",
            "rebalance",
            "crossChainRebalance",
            "localRebalance",
          ].includes(actionName)
        ) {
          if (!zapOutAmount) continue;
          const amount = parseFloat(zapOutAmount) || 0;
          const price = tokenPricesMappingTable[principalSymbol];
          balance = updateBalance(balance, principalSymbol, -amount / price);
        }

        if (
          [
            "zapOut",
            "rebalance",
            "crossChainRebalance",
            "localRebalance",
          ].includes(actionName) &&
          txn.gotRefundData
        ) {
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
    },
    [portfolioName, tokenPricesMappingTable],
  );

  const calculateTotalBalance = useCallback(
    (principalBalance) => {
      tokenPricesMappingTable["usd"] = 1;
      return Object.entries(principalBalance).reduce(
        (total, [token, amount]) => {
          const tokenPrice = tokenPricesMappingTable[token] || 0;
          const numericAmount = Number(amount) || 0;
          return total + numericAmount * tokenPrice;
        },
        0,
      );
    },
    [tokenPricesMappingTable],
  );

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (
        !account?.address ||
        Object.values(tokenPricesMappingTable || {}).length === 0
      )
        return;

      const resp = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/transaction/category/${account.address}?top_n=10`,
      );

      setTransactionHistoryData(resp.data.transactions);
      const principalBalance = calculatePrincipalBalance(
        resp.data.transactions,
      );
      setPrincipalBalance(calculateTotalBalance(principalBalance));
    };

    fetchTransactionHistory();
  }, [
    account,
    tokenPricesMappingTable,
    portfolioName,
    calculatePrincipalBalance,
    calculateTotalBalance,
  ]);

  const filteredTransactions = useMemo(
    () =>
      transactionHistoryData.filter(
        (item) => item.metadata.portfolioName === portfolioName,
      ),
    [transactionHistoryData, portfolioName],
  );

  if (filteredTransactions.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-4">
        Loading transaction history. This may take a few moments...
      </div>
    );
  }

  return (
    <>
      {filteredTransactions.map((activityItem, index) => (
        <TransactionItem
          key={activityItem.tx_hash}
          activityItem={activityItem}
          isLast={index === filteredTransactions.length - 1}
        />
      ))}
    </>
  );
}
