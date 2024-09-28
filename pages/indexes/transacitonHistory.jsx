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

  function getPrincipalSymbol(txn) {
    const principalSymbol = txn.metadata.tokenSymbol.includes("usd")
      ? "usd"
      : txn.metadata.tokenSymbol;
    return principalSymbol;
  }
  function updatePrincipalMappingTable(
    principalBalance,
    principalSymbol,
    amount,
  ) {
    return {
      ...principalBalance,
      [principalSymbol]: (principalBalance[principalSymbol] || 0) + amount,
    };
  }
  useEffect(() => {
    async function fetchTransactionHistory() {
      const resp = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/transaction/category/${account.address}`,
      );
      setTransactionHistoryData(resp.data.transactions);
      let principalBalance = {};
      for (const txn of resp.data.transactions) {
        if (txn.metadata.portfolioName !== portfolioName) continue;
        const principalSymbol = getPrincipalSymbol(txn);
        const principalAppreciationUsdDenominated =
          txn.metadata.principalAppreciation || 0;
        const symbolOfPrincipalAppreciation = "usd";
        const performanceFee = parseFloat(txn.metadata.performanceFee) || 0;

        // how do I record principalAppreciation for USDC/ETH or pendle in the future?
        if (txn.metadata.actionName === "zapIn") {
          const investmentAmount =
            parseFloat(txn.metadata.investmentAmount) || 0;
          principalBalance = updatePrincipalMappingTable(
            principalBalance,
            principalSymbol,
            investmentAmount,
          );
          principalBalance = updatePrincipalMappingTable(
            principalBalance,
            "usd",
            -performanceFee,
          );
        } else if (txn.metadata.actionName === "zapOut") {
          const zapOutAmount = parseFloat(txn.metadata.zapOutAmount) || 0;
          principalBalance = updatePrincipalMappingTable(
            principalBalance,
            principalSymbol,
            -zapOutAmount,
          );
        } else if (txn.metadata.actionName === "claimAndSwap") {
          principalBalance = {
            ...principalBalance,
            [principalSymbol]:
              (principalBalance[principalSymbol] || 0) - performanceFee,
          };
        } else if (
          txn.metadata.performanceFeeActionName === "unchargedPerformanceFee"
        ) {
          principalBalance = {
            ...principalBalance,
            [principalSymbol]:
              (principalBalance[principalSymbol] || 0) - performanceFee,
          };
        }
      }
      if (Object.values(tokenPricesMappingTable).length === 0) return;
      if (portfolioName === "ETH Vault") {
        const ethPrincipalBalance =
          (principalBalance["weth"] || 0) +
          (principalBalance["usd"] || 0) / tokenPricesMappingTable["weth"];
        setPrincipalBalance(ethPrincipalBalance);
      } else {
        // todo: handle other portfolio types
        const totalBalance =
          (principalBalance["usd"] || 0) +
          Object.keys(principalBalance)
            .filter((token) => token !== "usd")
            .reduce(
              (sum, token) =>
                sum +
                (principalBalance[token] || 0) *
                  (tokenPricesMappingTable[token] || 0),
              0,
            );

        // const usdPrincipalBalance =
        //   (principalBalance["usd"] || 0) +
        //   (principalBalance["weth"] || 0) * tokenPricesMappingTable["weth"];
        setPrincipalBalance(totalBalance);
      }
    }
    if (account?.address === undefined) return;
    fetchTransactionHistory();
  }, [account, tokenPricesMappingTable]);
  function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
  }
  return (
    <>
      {transacitonHistoryData.map((activityItem, activityItemIdx) => {
        if (activityItem.metadata.portfolioName !== portfolioName) return null;
        return (
          <li key={activityItem.id} className="relative flex gap-x-4">
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
            <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-gray-900">
              {activityItem.type === "paid" ? (
                <CheckCircleIcon
                  aria-hidden="true"
                  className="h-6 w-6 text-indigo-600"
                />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
              )}
            </div>
            <p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
              <span className="font-medium text-white">
                {activityItem.metadata.actionName === "zapIn" ? (
                  <span className="flex gap-1">
                    <span className="text-green-600">Deposit </span>
                    {activityItem.metadata.investmentAmount}
                    <ImageWithFallback
                      token={activityItem.metadata.tokenSymbol}
                      height={20}
                      width={20}
                    />
                  </span>
                ) : activityItem.metadata.actionName === "zapOut" ? (
                  <span className="flex gap-1">
                    <span className="text-orange-400">Withdraw </span>
                    {activityItem.metadata.zapOutAmount}
                    <ImageWithFallback
                      token={activityItem.metadata.tokenSymbol}
                      height={20}
                      width={20}
                    />
                  </span>
                ) : (
                  <span className="flex gap-1">
                    <span className="text-blue-400">
                      {activityItem.metadata.actionName}
                    </span>
                  </span>
                )}
              </span>{" "}
              <a
                href={`https://arbitrum.blockscout.com/tx/${activityItem.tx_hash}`}
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
