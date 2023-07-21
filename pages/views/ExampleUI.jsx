import { Affix, Button } from "antd";
import { MessageFilled } from "@ant-design/icons";
import React from "react";
import RebalancerWidget from "./Rebalancer";
export default function ExampleUI({
  address,
}) {
  return (
    <div style={{ padding: 30 }}>
      <RebalancerWidget address={address} />
      <Affix style={{ position: "fixed", bottom: "20px", right: "20px" }}>
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
