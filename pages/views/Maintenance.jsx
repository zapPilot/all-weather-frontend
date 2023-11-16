import React from "react";
import { Descriptions } from "antd";
const items = [
  {
    key: "1",
    label: "Rebalance Frequency",
    children: "Monthly (if needed)",
  },
  {
    key: "2",
    label: "Gas Fee for Rebalance",
    children:
      "Currently paid by the protocol treasury, but it might change once ownership has been transferred to the DAO.",
  },
];
const Fees = () => (
  <Descriptions
    title=""
    items={items}
    contentStyle={{
      color: "white",
      borderColor: "white",
      paddingInline: 10,
      lineHeight: 1,
      marginRight: 15,
    }}
    labelStyle={{
      color: "white",
      borderColor: "white",
      paddingInline: 10,
      lineHeight: 1,
      marginRight: 15,
    }}
  />
);
export default Fees;
