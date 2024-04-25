import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { useActiveAccount } from "thirdweb/react";

const Line = dynamic(
  () => import("@ant-design/plots").then((item) => item.Line),
  {
    ssr: false,
  },
);
const HistoricalDataChart = () => {
  const [data, setData] = useState([]);
  const [userAddress, setUserAddress] = useState("");
  const account = useActiveAccount();
  const address = account?.address;

  useEffect(() => {
    if (address) {
      setUserAddress(address.toLowerCase());
      // if user is vip, fetch claimable reward
      userAddress == "0x038919c63aff9c932c77a0c9c9d98eabc1a4dd08"
        ? fetchClaimableReward()
        : asyncFetch();
    }
  }, [address, userAddress]);

  const asyncFetch = () => {
    fetch(`${process.env.NEXT_PUBLIC_SDK_API_URL}/apr/historical-data`)
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) => {
        console.log("fetch HistoricalDataChart data failed", error);
      });
  };
  const fetchClaimableReward = () => {
    axios
      .get(
        `${process.env.NEXT_PUBLIC_SDK_API_URL}/rewards/historical-data?claimableUser=${userAddress}`,
      )
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => console.log("fetchClaimableReward", error));
  };

  const config = {
    data,
    padding: "auto",
    xField: "Date",
    yField:
      userAddress == "0x038919c63aff9c932c77a0c9c9d98eabc1a4dd08"
        ? "Rewards"
        : "APR",
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
export default HistoricalDataChart;
