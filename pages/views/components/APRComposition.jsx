import React, { memo, useMemo } from "react";
import { Popover, Image, Spin } from "antd";
import { InfoIcon } from "../../../utils/icons.jsx";

// Extracted token display component for better performance
const TokenDisplay = memo(function TokenDisplay({ symbol, usdValue }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Image
        src={`/tokenPictures/${symbol}.webp`}
        width={20}
        height={20}
        alt={symbol}
        loading="lazy"
        quality={50}
        unoptimized={true}
        placeholder={
          <div className="w-5 h-5 bg-gray-200 animate-pulse rounded-full" />
        }
      />
      <span className="text-sm">
        {symbol} ${usdValue.toFixed(2)}
      </span>
    </div>
  );
});

TokenDisplay.displayName = "TokenDisplay";

const APRComposition = memo(function APRComposition({
  APRData,
  mode,
  currency,
  exchangeRateWithUSD,
  pendingRewardsLoading,
}) {
  // Memoize aggregated tokens calculation
  const aggregatedTokens = useMemo(() => {
    if (!APRData || pendingRewardsLoading) return [];

    return Object.values(
      Object.entries(APRData).reduce((acc, [_, value]) => {
        const symbol = value.symbol;
        if (!acc[symbol]) {
          acc[symbol] = {
            symbol,
            usdDenominatedValue: 0,
          };
        }
        acc[symbol].usdDenominatedValue += value.usdDenominatedValue || 0;
        return acc;
      }, {}),
    ).sort((a, b) => b.usdDenominatedValue - a.usdDenominatedValue);
  }, [APRData, pendingRewardsLoading]);

  const renderContent = () => {
    if (pendingRewardsLoading) {
      return (
        <div className="flex justify-center p-4">
          <Spin size="small" />
        </div>
      );
    }

    if (mode === "pendingRewards") {
      return (
        <div className="max-h-[300px] overflow-y-auto">
          {aggregatedTokens.map((value) => (
            <TokenDisplay
              key={value.symbol}
              symbol={value.symbol}
              usdValue={value.usdDenominatedValue}
            />
          ))}
        </div>
      );
    }

    return <div>Not implemented: {mode}</div>;
  };

  return (
    <Popover
      style={{ width: "500px" }}
      content={renderContent()}
      title="Data Breakdown"
      trigger="hover"
      overlayClassName="apr-composition-popover"
    >
      <span style={{ display: "inline-flex" }}>
        <InfoIcon
          style={{
            width: 15,
            height: 15,
          }}
        />
      </span>
    </Popover>
  );
});

APRComposition.displayName = "APRComposition";

export default APRComposition;
