import React from "react";
import { useEffect, useState } from "react";
import RebalancerWidget from "./Rebalancer";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Button } from "antd";
import Link from "next/link";

const useWindowHeight = () => {
  const [windowHeight, setWindowHeight] = useState(0); // 視窗高度狀態

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight - 170); // 調整視窗高度並減去 Header 的高度（64）
    };

    window.addEventListener("resize", handleResize); // 監聽視窗大小改變事件

    handleResize(); // 初始化視窗高度

    return () => {
      window.removeEventListener("resize", handleResize); // 移除事件監聽器
    };
  }, []);

  return windowHeight;
};

export default function ExampleUI({ address }) {
  const windowHeight = useWindowHeight();

  return (
    <div style={{ padding: "3rem 1.5rem", minHeight: windowHeight }}>
      <center>
        <h1 className="ant-table-title">
          All Weather Portfolio: An Omnichain Index Fund
        </h1>
      </center>
      <center>
        <h3 className="ant-table-title">
          Don&apos;t trade your time for money to retire anymore. Click Once,
          Retire Forever!
        </h3>
        <Link href="#zapSection">
          <Button type="primary">Invest Now!</Button>
        </Link>
        <h5 className="ant-table-title">
          2. There&apos;s a 1-year lock on your deposit (by Radiant Protocol).
          This will also be improved in the beta version.
        </h5>
        <PortfolioMetaTab />
      </center>
      <RebalancerWidget address={address} />
    </div>
  );
}
