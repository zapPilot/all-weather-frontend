import { useMemo, memo } from "react";
import CategoryTable from "./components/CategoryTable";
import CategoryHeader from "./components/CategoryHeader";
import PortfolioSummary from "./components/PortfolioSummary";

// Constants
export const categoryMapping = {
  eth: "ETH",
  btc: "BTC",
  long_term_bond: "ETH",
  intermediate_term_bond: "Zero Coupon Bonds",
  commodities: "Non-Financial Applications",
  gold: "Stablecoins",
  large_cap_us_stocks: "Large-Cap Tokens",
  small_cap_us_stocks: "Small-Cap Tokens",
  non_us_developed_market_stocks: "Non-EVM Large-Cap Tokens",
  non_us_emerging_market_stocks: "Non-EVM Small-Cap Tokens",
};

// Helper Functions
export const organizeByCategory = (portfolioHelper) => {
  const categoryMap = new Map();

  Object.entries(portfolioHelper?.strategy || {}).forEach(
    ([category, protocols]) => {
      Object.entries(protocols).forEach(([chain, protocolArray]) => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, new Map());
        }
        categoryMap.get(category).set(chain, protocolArray);
      });
    },
  );

  return categoryMap;
};

// Memoized category section component
const CategorySection = memo(
  ({
    category,
    chainProtocolMap,
    portfolioName,
    portfolioApr,
    yieldContent,
  }) => {
    const allProtocols = useMemo(
      () => Array.from(chainProtocolMap.values()).flat(),
      [chainProtocolMap],
    );

    const hasActiveProtocols = useMemo(
      () => allProtocols.some((protocol) => protocol.weight > 0),
      [allProtocols],
    );

    if (!hasActiveProtocols) return null;

    return (
      <div>
        <CategoryHeader category={category} />
        <div className="mt-2">
          <CategoryTable
            protocolArray={allProtocols}
            portfolioName={portfolioName}
            portfolioApr={portfolioApr}
            yieldContent={yieldContent}
          />
        </div>
      </div>
    );
  },
);

CategorySection.displayName = "CategorySection";

// Main Component
const PortfolioComposition = memo(
  ({
    portfolioName,
    portfolioHelper,
    portfolioApr,
    loading,
    usdBalanceLoading,
    lockUpPeriod,
    yieldContent,
  }) => {
    const organizedCategories = useMemo(() => {
      if (!portfolioHelper) return [];

      return Array.from(organizeByCategory(portfolioHelper))
        .map(([category, chainProtocolMap]) => {
          const allProtocols = Array.from(chainProtocolMap.values()).flat();
          const totalWeight = allProtocols.reduce(
            (sum, protocol) => sum + protocol.weight,
            0,
          );
          return { category, chainProtocolMap, totalWeight };
        })
        .sort((a, b) => b.totalWeight - a.totalWeight);
    }, [portfolioHelper]);

    return (
      <div className="lg:col-span-2 lg:row-span-1">
        <div className="shadow-sm border border-white/50 p-6 rounded-lg bg-white/5 backdrop-blur-sm">
          <h2 className="text-xl font-semibold leading-6 text-white mb-6">
            {portfolioName} Constituents
          </h2>
          {organizedCategories.map(({ category, chainProtocolMap }) => (
            <CategorySection
              key={category}
              category={category}
              chainProtocolMap={chainProtocolMap}
              portfolioName={portfolioName}
              portfolioApr={portfolioApr}
              yieldContent={yieldContent}
            />
          ))}
          <PortfolioSummary
            loading={loading}
            usdBalanceLoading={usdBalanceLoading}
            lockUpPeriod={lockUpPeriod}
            portfolioName={portfolioName}
            portfolioApr={portfolioApr}
          />
        </div>
      </div>
    );
  },
);

PortfolioComposition.displayName = "PortfolioComposition";

export default PortfolioComposition;
