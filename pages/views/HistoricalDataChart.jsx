import React, { useState, useEffect } from 'react';
import dynamic from "next/dynamic";
const Line = dynamic(
    () => import("@ant-design/plots").then((item) => item.Line),
    {
      ssr: false,
    }
  )
const HistoricalDataChart = () => {
    const [data, setData] = useState([
        {
          "Date": "2023-10-05",
          "APR": 11.59
        },
        {
            "Date": "2023-10-06",
            "APR": 15.37
          },
          {
            "Date": "2023-10-07",
            "APR": 15.57
          },
          {
            "Date": "2023-10-08",
            "APR": 15.37
          },
        ]);
  
    // useEffect(() => {
    //   asyncFetch();
    // }, []);
  
    // const asyncFetch = () => {
    //   fetch('https://gw.alipayobjects.com/os/bmw-prod/1d565782-dde4-4bb6-8946-ea6a38ccf184.json')
    //     .then((response) => response.json())
    //     .then((json) => setData(json))
    //     .catch((error) => {
    //       console.log('fetch data failed', error);
    //     });
    // };
    const config = {
      data,
      padding: 'auto',
      xField: 'Date',
      yField: 'APR',
      xAxis: {
        type: 'timeCat',
        tickCount: 5,
      },
    };
  
    return <Line {...config} />;
  };
export default HistoricalDataChart;