import logger from "../../../utils/logger";
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { CHART_CONFIGS } from "./chartConfig";

// Dynamically import chart components with loading fallback
const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
    loading: () => <div>Loading chart...</div>,
  },
);

const Column = dynamic(
  () => import("@ant-design/plots").then((item) => item.Column),
  {
    ssr: false,
    loading: () => <div>Loading chart...</div>,
  },
);

// Extract common chart styles
const CHART_STYLES = {
  grid: {
    line: {
      style: {
        stroke: "#303030",
        lineWidth: 1,
        lineDash: [4, 5],
      },
    },
  },
};

const HistoricalGenericDataChart = memo(function HistoricalGenericDataChart({
  title,
  apiUrl,
  dataTransformCallback,
  yLabel,
  option = "line",
}) {
  const [data, setData] = useState([]);
  const [calculatedTitle, setCalculatedTitle] = useState(title);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize fetch function
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const transformedData = await dataTransformCallback(response);
      setData(transformedData);

      // Get the title from the config
      const configType =
        option === "line"
          ? "historicalBalances"
          : option === "column" && title.includes("ROI")
          ? "dailyROI"
          : "dailyPnL";

      const config = CHART_CONFIGS[configType];
      setCalculatedTitle(config?.calculateTitle?.(transformedData) || title);
    } catch (error) {
      logger.error("Failed to fetch chart data:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, dataTransformCallback, title, option]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoize chart configuration
  const config = useMemo(() => {
    if (!data.length) return null;

    const values = data.map((item) => Number(item[yLabel]));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return {
      data,
      padding: "auto",
      xField: "date",
      yField: yLabel,
      xAxis: {
        type: "timeCat",
        tickCount: 5,
      },
      yAxis: {
        nice: true,
        min: minValue,
        max: maxValue,
        grid: CHART_STYLES.grid,
      },
      smooth: true,
    };
  }, [data, yLabel]);

  // Memoize chart style configuration
  const chartConfig = useMemo(() => {
    if (!config) return null;

    if (option === "column") {
      return {
        ...config,
        columnStyle: (datum) => ({
          fill: datum[yLabel] >= 0 ? "#3fb57d" : "#ff4d4f",
        }),
      };
    }
    return {
      ...config,
      color: "#3fb57d",
    };
  }, [config, option, yLabel]);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Error loading chart: {error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Need at least one deposit transaction to get the data</p>
      </div>
    );
  }

  return (
    <div>
      <center>
        <h2 className="text-xl font-semibold text-white mb-4">
          {calculatedTitle}
        </h2>
      </center>
      {option === "column" ? (
        <Column {...chartConfig} />
      ) : (
        <Line {...chartConfig} />
      )}
    </div>
  );
});

HistoricalGenericDataChart.displayName = "HistoricalGenericDataChart";

export default HistoricalGenericDataChart;
