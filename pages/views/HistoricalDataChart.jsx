import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";

const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
  },
);

// Helper function to reduce data points by percentage
const sampleData = (data, keepPercentage = 5) => {
  if (!data.length) return data;
  
  // Calculate how many points to keep
  const pointsToKeep = Math.ceil(data.length * (keepPercentage / 100));
  if (pointsToKeep >= data.length) return data;
  
  // Calculate step size to achieve desired percentage
  const step = Math.ceil(data.length / pointsToKeep);
  
  // Sample data points
  return data.filter((_, index) => index % step === 0);
};

const HistoricalDataChart = ({ portfolioName }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let performanceData = null;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        if (portfolioName === "Index 500 Vault") {
          // Lazy load performance data
          performanceData = await import("../../public/performanceCharts/performance_data.json");
          
          if (!isMounted) return;

          const btcData = performanceData.default["BTC Benchmark"];
          const portfolioData = performanceData.default[portfolioName];
          if (btcData) {
            // Create combined data array
            const chartData = [];
            
            // Add BTC data
            btcData.dates.forEach((date, index) => {
              chartData.push({
                Date: date,
                value: btcData.investment_values[index],
                category: "BTC Benchmark"
              });
            });

            // Add portfolio data
            if (portfolioData && portfolioData.dates) {
              portfolioData.dates.forEach((date, index) => {
                chartData.push({
                  Date: date,
                  value: portfolioData.investment_values[index] || 0,
                  category: portfolioName
                });
              });
            }

            if (isMounted) {
              // Keep 20% of the data points
              setData(sampleData(chartData, 20));
            }
          }
        } else {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SDK_API_URL}/apr/${portfolioName}/historical-data`,
          );
          
          if (!isMounted) return;

          const json = await response.json();
          if (isMounted) {
            // Keep 20% of the data points
            setData(sampleData(json, 20));
          }
        }
      } catch (error) {
        console.error("Error loading performance data:", error);
        if (isMounted) {
          setError(error.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      // Clear references to help garbage collection
      performanceData = null;
    };
  }, [portfolioName]);

  // Memoize config to prevent unnecessary re-renders
  const config = useMemo(() => {
    return {
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
      // Add performance optimizations for the chart
      animation: false, // Disable animations for better performance
      smooth: false, // Disable smooth curves for better performance
      point: {
        size: 0, // Hide points to reduce memory usage
      },
    };
  }, [data, portfolioName]);

  if (loading) {
    return <div className="h-[312px] flex items-center justify-center"><Spin /></div>;
  }

  if (error) {
    return <div className="h-[312px] flex items-center justify-center text-red-500">Error loading data</div>;
  }

  return <Line {...config} />;
};

export default React.memo(HistoricalDataChart);
