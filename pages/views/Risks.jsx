import React from "react";
import { Descriptions } from "antd";
const items = [
  {
    key: "1",
    label: <div style={{ color: "red" }}>Max Drawback</div>,
    children: "?%",
  },
  {
    key: "2",
    label: <div style={{ color: "red" }}>1-year Lock</div>,
    children:
      "There's a 1-year lock on your deposit (by Radiant Protocol). This will also be improved in the beta version.",
  },
  {
    key: "3",
    label: <div style={{ color: "red" }}>Impermanent Loss</div>,
    children:
      "?% (If you're not a good trader, then accept the impermanent loss and be content with the average return. If you stay humble and are willing to get rich slowly, you can become a Buffett as well.)",
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
