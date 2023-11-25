import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
  },
);
const HistoricalDataChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    asyncFetch();
  }, []);

  const asyncFetch = () => {
    fetch(`${process.env.NEXT_PUBLIC_SDK_API_URL}/apr/historical-data`)
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) => {
        console.log("fetch HistoricalDataChart data failed", error);
      });
  };
  const config = {
    data,
    padding: "auto",
    xField: "Date",
    yField: "APR",
    xAxis: {
      type: "timeCat",
      tickCount: 5,
    },
    lineStyle: {
      stroke: '#beed54',
    }
  };

  return <Line {...config} />;
};
export default HistoricalDataChart;
