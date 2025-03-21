import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { CHART_CONFIGS } from "./chartConfig";
const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
  },
);
const Column = dynamic(
  () => import("@ant-design/plots").then((item) => item.Column),
  {
    ssr: false,
  },
);
const HistoricalGenericDataChart = ({
  title,
  apiUrl,
  dataTransformCallback,
  yLabel,
  option = "line",
}) => {
  const [data, setData] = useState([]);
  const [calculatedTitle, setCalculatedTitle] = useState(title);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl);
        const transformedData = await dataTransformCallback(response);
        setData(transformedData);

        // Get the title from the config
        const config =
          CHART_CONFIGS[
            option === "line"
              ? "historicalBalances"
              : option === "column" && title.includes("ROI")
              ? "dailyROI"
              : "dailyPnL"
          ];

        if (config?.calculateTitle) {
          setCalculatedTitle(config.calculateTitle(transformedData));
        } else {
          setCalculatedTitle(title);
        }
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      }
    };

    fetchData();
  }, [apiUrl, dataTransformCallback, title, option]);

  const config = useMemo(() => {
    const minValue = Math.min(...data.map((item) => Number(item[yLabel])));
    const maxValue = Math.max(...data.map((item) => Number(item[yLabel])));

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
        grid: {
          line: {
            style: {
              stroke: "#303030",
              lineWidth: 1,
              lineDash: [4, 5],
            },
          },
        },
      },
      smooth: true,
    };
  }, [data, yLabel]);

  const chartConfig = useMemo(() => {
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

  if (data.length === 0) {
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
};
export default HistoricalGenericDataChart;
