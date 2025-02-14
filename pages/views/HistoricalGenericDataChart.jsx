import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

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
  const [calculatedTitle, setCalculatedTitle] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl);
        const json = await dataTransformCallback(response);
        setData(json);
        
        const newTitle = option === "column" 
          ? `${title} (P&L: $${calculateTotal(json)})`
          : title;
        setCalculatedTitle(newTitle);
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      }
    };

    fetchData();
  }, [apiUrl, dataTransformCallback, option, title, yLabel]);

  const calculateTotal = (data) => {
    return data.reduce((sum, item) => sum + item[yLabel], 0).toFixed(2);
  };

  const config = useMemo(() => ({
    data,
    padding: "auto",
    xField: "date",
    yField: yLabel,
    xAxis: {
      type: "timeCat",
      tickCount: 5,
    },
  }), [data, yLabel]);

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
      {option === "column" ? <Column {...chartConfig} /> : <Line {...chartConfig} />}
    </div>
  );
};
export default HistoricalGenericDataChart;
