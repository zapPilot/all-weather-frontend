import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import Image from "next/image";
import { Popover, Spin } from "antd";
import EmailSubscription from "../emailsubscription";
export default function PortfolioSummary({
  usdBalanceLoading,
  tokenPricesMappingTable,
  usdBalance,
  account,
  principalBalance,
  onRefresh,
  rebalancableUsdBalanceDict,
}) {
  return (
    <div className="lg:col-start-3 lg:row-span-1 lg:row-end-1 h-full shadow-sm border border-white/50">
      <div className="p-6">
        <dl className="flex flex-wrap">
          <div className="flex-auto">
            <dt className="text-sm font-semibold leading-6 text-white">
              Your Balance
            </dt>
            <dd className="mt-1 text-base font-semibold leading-6 text-white">
              <div className="flex items-center space-x-3">
                {usdBalanceLoading ? (
                  <Spin />
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>${usdBalance?.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <a
                    href={`https://debank.com/profile/${account?.address}`}
                    target="_blank"
                    className="flex items-center text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    <Image
                      src="/projectPictures/debank.webp"
                      alt="debank"
                      height={25}
                      width={25}
                      className="hover:opacity-80"
                    />
                  </a>
                  <button
                    onClick={onRefresh}
                    disabled={usdBalanceLoading}
                    className="text-gray-500 hover:text-gray-400 disabled:opacity-50 transition-colors"
                    title="Refresh data"
                  >
                    <ArrowPathIcon className="h-6 w-5" />
                  </button>
                  <Popover
                    title="Balance Breakdown by Protocol"
                    trigger="hover"
                    content={
                      <div>
                        {principalBalance === 0 ? (
                          <Spin />
                        ) : (
                          <div>
                            principal: $
                            {principalBalance > 0.01
                              ? principalBalance?.toFixed(2)
                              : "< 0.01"}
                          </div>
                        )}

                        {rebalancableUsdBalanceDict ? (
                          Object.entries(rebalancableUsdBalanceDict)
                            .filter(([key, value]) => value.usdBalance > 0)
                            .sort(([, a], [, b]) => b.usdBalance - a.usdBalance)
                            .map(([key, value]) => (
                              <div key={key}>
                                {key}: ${value.usdBalance?.toFixed(2)}
                              </div>
                            ))
                        ) : (
                          <Spin />
                        )}
                      </div>
                    }
                  >
                    <InformationCircleIcon
                      aria-hidden="true"
                      className="size-5 text-gray-400 hover:text-gray-300 cursor-pointer"
                    />
                  </Popover>
                </div>
              </div>
            </dd>
          </div>
          <div className="mt-6 flex w-full flex-none gap-x-4">
            <dt className="flex-none">
              <ChartBarIcon
                aria-hidden="true"
                className="h-6 w-5 text-gray-500"
              />
            </dt>
            <dd className="text-sm font-medium leading-6 text-white">
              <Link
                href={`/profile/#historical-balances?address=${account?.address}`}
                target="_blank"
                className="text-blue-400"
              >
                Historical Balances
              </Link>
            </dd>
          </div>
          <div className="mt-6 flex w-full flex-none gap-x-4">
            <dd className="text-sm font-medium leading-6 text-white">
              <EmailSubscription />
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
