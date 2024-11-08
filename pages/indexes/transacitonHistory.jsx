// copy from this Tailwind template: https://tailwindui.com/components/application-ui/page-examples/detail-screens
"use client";
import { useState, useEffect } from "react";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { useActiveAccount } from "thirdweb/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { timeAgo, unixToCustomFormat } from "../../utils/general";
import { useRouter } from "next/router";

export default function TransacitonHistory({
  setPrincipalBalance,
  tokenPricesMappingTable,
}) {
  const router = useRouter();
  const { portfolioName } = router.query;

  const [transacitonHistoryData, setTransactionHistoryData] = useState([]);
  const account = useActiveAccount();

  useEffect(() => {
    async function fetchTransactionHistory() {
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
      const resp = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/transaction/category/${account.address}`,
      );
      setTransactionHistoryData(resp.data.transactions);
      let principalBalance = {};
      for (const txn of resp.data.transactions) {
        if (txn.metadata.portfolioName !== portfolioName) continue;
        const principalSymbol = refineSymbol(txn.metadata.tokenSymbol);
        if (txn.metadata.actionName === "zapIn") {
          const investmentAmount =
            parseFloat(txn.metadata.investmentAmount) || 0;
          principalBalance = {
            ...principalBalance,
            [principalSymbol]:
              (principalBalance[principalSymbol] || 0) + investmentAmount,
          };
        } else if (
          txn.metadata.actionName === "zapOut" ||
          txn.metadata.actionName === "transfer"
        ) {
          const zapOutAmount = parseFloat(txn.metadata.zapOutAmount) || 0;
          principalBalance = {
            ...principalBalance,
            ["usd"]: (principalBalance["usd"] || 0) - zapOutAmount,
          };
        }
        if (
          ["zapOut", "rebalance", "transfer"].includes(txn.metadata.actionName)
        ) {
          for (const tokenMetadata of Object.values(txn.gotRefundData)) {
            const symbol = refineSymbol(tokenMetadata.symbol);
            principalBalance = {
              ...principalBalance,
              [symbol]: (principalBalance[symbol] || 0) + tokenMetadata.amount,
            };
          }
        }
      }
      if (Object.values(tokenPricesMappingTable).length === 0) return;
      if (portfolioName === "ETH Vault") {
        const ethPrincipalBalance =
          (principalBalance["weth"] || 0) +
          (principalBalance["usd"] || 0) / tokenPricesMappingTable["weth"] +
          ((principalBalance["wbtc"] || 0) * tokenPricesMappingTable["wbtc"]) /
            tokenPricesMappingTable["weth"];
        setPrincipalBalance(ethPrincipalBalance);
      } else if (portfolioName === "Stablecoin Vault") {
        const usdPrincipalBalance =
          (principalBalance["usd"] || 0) +
          (principalBalance["weth"] || 0) * tokenPricesMappingTable["weth"];
        setPrincipalBalance(usdPrincipalBalance);
      } else if (portfolioName === "BTC Vault") {
        const btcPrincipalBalance =
          (principalBalance["wbtc"] || 0) +
          (principalBalance["usd"] || 0) / tokenPricesMappingTable["wbtc"] +
          ((principalBalance["weth"] || 0) * tokenPricesMappingTable["weth"]) /
            tokenPricesMappingTable["wbtc"];

        setPrincipalBalance(btcPrincipalBalance);
      }
    }
    if (account?.address === undefined) return;
    fetchTransactionHistory();
  }, [account, tokenPricesMappingTable]);
  function refineSymbol(tokenSymbol) {
    return tokenSymbol.includes("usd") || tokenSymbol.includes("dai")
      ? "usd"
      : tokenSymbol;
  }
  function rendersingleTransaction(activityItem) {
    const tokenDict = {};
    if (["zapOut", "rebalance"].includes(activityItem.metadata.actionName)) {
      for (const tokenMetadata of Object.values(activityItem.gotRefundData)) {
        const symbol = tokenMetadata.symbol;
        tokenDict[symbol] = (tokenDict[symbol] || 0) + tokenMetadata.amount;
      }
    }
    const actionAmount =
      activityItem.metadata.actionName === "zapIn"
        ? parseFloat(activityItem.metadata.investmentAmount)
        : activityItem.metadata.actionName === "zapOut" ||
          activityItem.metadata.actionName === "transfer"
        ? parseFloat(activityItem.metadata.zapOutAmount)
        : 0;
    const actionTokenSymbol = activityItem.metadata.tokenSymbol;
    if (actionAmount) {
      tokenDict[actionTokenSymbol] =
        (tokenDict[actionTokenSymbol] || 0) + actionAmount;
    }
    let tokenSum = Object.values(tokenDict).reduce((acc, amount) => {
      acc += amount;
      return acc;
    }, 0);
    const actionLabel =
      activityItem.metadata.actionName === "zapIn"
        ? "Deposit"
        : activityItem.metadata.actionName === "zapOut"
        ? "Withdraw"
        : activityItem.metadata.actionName === "transfer"
        ? "Transfer"
        : activityItem.metadata.actionName === "rebalance"
        ? `rebalance ${
            tokenSum > 0 ? "(refund)" : tokenSum < 0 ? "(cost)" : ""
          }`
        : activityItem.metadata.actionName;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <span
            className={classNames(
              activityItem.metadata.actionName === "zapIn"
                ? "text-green-500"
                : activityItem.metadata.actionName === "zapOut" ||
                  activityItem.metadata.actionName === "transfer"
                ? "text-orange-500"
                : "text-blue-500",
            )}
          >
            {actionLabel}
          </span>
        </div>
        {Object.entries(tokenDict).map(([symbol, amount]) => {
          return (
            <div key={symbol} className="flex gap-1 items-center">
              {activityItem.metadata.actionName === "zapOut" ||
                (activityItem.metadata.actionName === "transfer" && "$")}
              {amount > 0.01 ? amount.toFixed(2) : "< 0.01"}
              {activityItem.metadata.actionName === "zapOut" ||
                (activityItem.metadata.actionName === "transfer" &&
                  " worth of ")}
              {activityItem.metadata.actionName === "transfer" ? (
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
        })}
      </div>
    );
  }

  function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
  }
  return (
    <>
      {transacitonHistoryData.map((activityItem, activityItemIdx) => {
        if (activityItem.metadata.portfolioName !== portfolioName) return null;
        return (
          <li key={activityItemIdx} className="relative flex gap-x-4">
            <div
              className={classNames(
                activityItemIdx === transacitonHistoryData.length - 1
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
                  aria-hidden="true"
                  className="h-6 w-6 text-indigo-600"
                />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300"></div>
              )}
            </div>
            <p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
              <span className="font-medium text-white">
                {rendersingleTransaction(activityItem)}
              </span>{" "}
              <a
                href={`https://arbitrum.blockscout.com/tx/${activityItem.tx_hash}`}
                target="_blank"
              >
                tx:{" "}
                {activityItem.tx_hash.slice(0, 4) +
                  "..." +
                  activityItem.tx_hash.slice(-4)}
              </a>
            </p>
            <time
              dateTime={activityItem.metadata.timestamp}
              className="flex-none py-0.5 text-xs leading-5 text-gray-500"
            >
              {timeAgo(unixToCustomFormat(activityItem.metadata.timestamp))}
            </time>
          </li>
        );
      })}
    </>
  );
}
