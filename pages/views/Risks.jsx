import React from "react";
import { Descriptions } from "antd";
const items = [
  {
    key: "1",
    label: <div style={{ color: "red" }}>Max Drawback</div>,
    children: "~0%",
  },
  {
    key: "2",
    label: <div style={{ color: "red" }}>Lock</div>,
    children: "2 days, due to ApolloX's constraint",
  },
  {
    key: "3",
    label: <div style={{ color: "red" }}>Impermanent Loss</div>,
    children: "~0%",
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
