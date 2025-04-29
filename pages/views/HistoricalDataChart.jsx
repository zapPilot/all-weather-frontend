import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import performanceData from "../../public/performanceCharts/performance_data.json" assert { type: "json" };

const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
  },
);
const HistoricalDataChart = ({ portfolioName }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    asyncFetch();
  }, []);

  const asyncFetch = async () => {
    console.log("portfolioName", portfolioName);
    if (portfolioName === "Index 500 Vault") {
      try {
        // Extract BTC Benchmark data
        const btcData = performanceData["BTC Benchmark"];
        const portfolioData = performanceData[portfolioName];
        if (btcData) {
          // Create data for both lines
          const chartData = btcData.dates.flatMap((date, index) => [
            {
              Date: date,
              value: btcData.investment_values[index],
              category: "BTC Benchmark",
            },
            {
              Date: date,
              value: portfolioData?.investment_values[index] || 0,
              category: portfolioName,
            },
          ]);
          setData(chartData);
        }
      } catch (error) {
        console.error("Error loading performance data:", error);
      }
    } else {
      // Original fetch logic for other portfolios
      fetch(
        `${process.env.NEXT_PUBLIC_SDK_API_URL}/apr/${portfolioName}/historical-data`,
      )
        .then((response) => response.json())
        .then((json) => setData(json))
        .catch((error) => {
          console.error("fetch HistoricalDataChart data failed", error);
        });
    }
  };

  const config = {
    data,
    height: 312,
    padding: "auto",
    xField: "Date",
    yField: portfolioName === "Index 500 Vault" ? "value" : "APR",
    ...(portfolioName === "Index 500 Vault" && {
      seriesField: "category",
      legend: {
        position: "top",
      },
      color: ["#5DFDCB", "#FF6B6B"],
    }),
    xAxis: {
      type: "timeCat",
      tickCount: 5,
    },
  };

  return <Line {...config} />;
};
export default HistoricalDataChart;
