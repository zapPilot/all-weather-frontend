import React, { memo } from "react";
import HistoricalDataChart from "../views/HistoricalDataChart";

const HistoricalData = memo(function HistoricalData({ portfolioName }) {
  return (
    <div className="lg:col-span-2 lg:row-span-1 lg:row-end-2 h-full border border-white/50">
      <div className="p-6">
        <h2 className="text-base font-semibold leading-6 text-white">
          Historical Data
        </h2>
        <HistoricalDataChart portfolioName={portfolioName} />
      </div>
    </div>
  );
});

export default HistoricalData;
