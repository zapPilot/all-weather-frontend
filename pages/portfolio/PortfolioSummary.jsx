import {
  ArrowTopRightOnSquareIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { Spin } from "antd";

export default function PortfolioSummary({
  usdBalanceLoading,
  tokenPricesMappingTable,
  usdBalance,
  account,
  principalBalance,
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
              <div>
                <div className="flex items-center justify-between">
                  <a
                    href={`https://debank.com/profile/${account?.address}`}
                    target="_blank"
                    className="flex items-center text-gray-500 hover:text-gray-400"
                  >
                    View on Debank
                    <ArrowTopRightOnSquareIcon className="h-6 w-5 ml-1" />
                  </a>
                </div>
                {usdBalanceLoading ? (
                  <Spin />
                ) : (
                  <div>
                    <div className="flex items-center mt-2">
                      <span>${usdBalance?.toFixed(2)}</span>
                    </div>
                    <div className="text-gray-500">
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
                    </div>
                  </div>
                )}
              </div>
            </dd>
          </div>

          <div className="mt-6 flex w-full flex-none gap-x-4">
            <dt className="flex-none">
              <CurrencyDollarIcon
                aria-hidden="true"
                className="h-6 w-5 text-gray-500"
              />
            </dt>
            <dd className="text-sm font-medium leading-6 text-white">
              Profit:{" "}
              {usdBalanceLoading ||
              Object.values(tokenPricesMappingTable || {}).length === 0 ||
              principalBalance === 0 ? (
                <Spin />
              ) : (
                <span
                  className={
                    usdBalance - principalBalance < 0
                      ? "text-red-500"
                      : "text-green-500"
                  }
                >
                  $
                  {usdBalance === 0
                    ? 0
                    : (usdBalance - principalBalance)?.toFixed(2)}
                </span>
              )}
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
        </dl>
      </div>
    </div>
  );
}
