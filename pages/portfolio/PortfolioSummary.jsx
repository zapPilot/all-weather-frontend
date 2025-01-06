import { ChartBarIcon } from "@heroicons/react/20/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Spin } from "antd";
import APRComposition from "../views/components/APRComposition";
import { formatBalance } from "../../utils/general";

export default function PortfolioSummary({
  usdBalanceLoading,
  tokenPricesMappingTable,
  portfolioName,
  usdBalance,
  portfolioHelper,
  account,
  pendingRewards,
  pendingRewardsLoading,
}) {
  return (
    <div className="lg:col-start-3 lg:row-span-1 lg:row-end-1 h-full shadow-sm border border-white/50">
      <div className="p-6">
        <dl className="flex flex-wrap">
          <div className="flex-auto">
            <dt className="text-sm font-semibold leading-6 text-white">
              Your Balance
            </dt>
            <dd className="mt-1 text-base font-semibold leading-6 text-white flex">
              <span className="mr-2">
                {usdBalanceLoading === true ||
                Object.values(tokenPricesMappingTable).length === 0 ? (
                  <Spin />
                ) : portfolioName === "ETH Vault" ? (
                  <>
                    ${usdBalance.toFixed(2)}
                    <div className="text-gray-500">
                      {portfolioHelper?.denomination()}
                      {(usdBalance / tokenPricesMappingTable["weth"]).toFixed(
                        2,
                      )}
                    </div>
                  </>
                ) : (
                  `$${usdBalance.toFixed(2)}`
                )}
              </span>
              <a
                href={`https://debank.com/profile/${account?.address}`}
                target="_blank"
              >
                <ArrowTopRightOnSquareIcon className="h-6 w-5 text-gray-500" />
              </a>
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
            <dt className="flex-none">
              <APRComposition
                APRData={pendingRewards}
                mode="pendingRewards"
                currency="$"
                exchangeRateWithUSD={1}
                pendingRewardsLoading={pendingRewardsLoading}
              />
            </dt>
            <dd className="text-sm leading-6 text-white">
              Rewards:{" "}
              {pendingRewardsLoading === true ? (
                <Spin />
              ) : (
                <span className="text-green-500">
                  {formatBalance(
                    portfolioHelper?.sumUsdDenominatedValues(pendingRewards),
                  )}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
