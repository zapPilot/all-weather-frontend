import { Affix, Button } from "antd";
import { MessageFilled } from "@ant-design/icons";
import React from "react";
import { useEffect, useState } from "react";
import RebalancerWidget from "./Rebalancer";

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
        <h1 className="ant-table-title">All Weather Portfolio</h1>
      </center>
      <center>
        <h2 className="ant-table-title">
          Click Once, Diversify Forever. Why Gamble with Volatility?
        </h2>
      </center>
      <RebalancerWidget address={address} />
      <Affix style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem" }}>
        <Button
          shape="circle"
          size="large"
          icon={<MessageFilled style={{ color: "white" }} />}
          style={{ backgroundColor: "#5C7724", borderColor: "#5C7724" }}
        />
      </Affix>
    </div>
  );
}
