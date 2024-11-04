import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
  },
);
const HistoricalGenericDataChart = ({
  apiUrl,
  dataTransformCallback,
  yLabel,
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    asyncFetch();
  }, [apiUrl]);

  const asyncFetch = () => {
    fetch(apiUrl)
      // .then((response) => response.json())
      .then(dataTransformCallback)
      .then((json) => setData(json))
      .catch((error) => {
        console.log("fetch HistoricalGenericDataChart data failed", error);
      });
  };
  if (data.length === 0) {
    // need to zap in at least once to get the data
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Need at least one deposit transaction to get the data</p>
      </div>
    );
  }
  const config = {
    data,
    padding: "auto",
    xField: "date",
    yField: yLabel,
    xAxis: {
      type: "timeCat",
      tickCount: 5,
    },
    lineStyle: {
      stroke: "#5DFDCB",
    },
  };

  return <Line {...config} />;
};
export default HistoricalGenericDataChart;
