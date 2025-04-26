import { Spin } from "antd";

const PortfolioSummary = ({
  loading,
  usdBalanceLoading,
  lockUpPeriod,
  portfolioName,
  portfolioApr,
}) => (
  <div className="mt-8 pt-4 border-t border-white/10">
    <div className="flex justify-between items-center">
      <div>
        <span className="text-gray-400" role="lockUpPeriod">
          Lock-up Period
        </span>{" "}
        {usdBalanceLoading === true ? (
          <Spin />
        ) : typeof lockUpPeriod === "number" ? (
          lockUpPeriod === 0 ? (
            <span className="text-green-500 ml-2">Unlocked</span>
          ) : (
            <span className="text-red-500 ml-2">
              {Math.floor(lockUpPeriod / 86400)} d{" "}
              {Math.ceil((lockUpPeriod % 86400) / 3600)
                ? Math.ceil((lockUpPeriod % 86400) / 3600) + "h"
                : null}
            </span>
          )
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Avg. APR</span>
        <span className="text-lg font-semibold text-green-500">
          {loading ? (
            <Spin />
          ) : (
            `${(
              (portfolioApr?.[portfolioName]?.portfolioAPR || 0) * 100
            ).toFixed(2)}%`
          )}
        </span>
      </div>
    </div>
  </div>
);

export default PortfolioSummary;
