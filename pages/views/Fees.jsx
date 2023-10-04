import React from "react";
import { Descriptions, Button } from "antd";
const items = [
  {
    key: "1",
    label: "Expense Ratio",
    children: "0.3%",
  },
  {
    key: "2",
    label: "Deposit Fee",
    children: "0.3% (will be replaced by performance fee mentioned below)",
  },
  {
    key: "3",
    label: "Exit Fee",
    children: "0%",
  },
  {
    key: "4",
    label: "Management Fee",
    children: "0%",
  },
  {
    key: "5",
    label: "Performance Fee",
    children:
      "0% (In V2, users will not lose any rewards if they lock their dLP and join the governance)",
  },
  {
    key: "6",
    label: "Tokenomics",
    children: (
      <a href="https://all-weather.gitbook.io/all-weather-protocol/overview/tokenomics">
        {" "}
        <Button type="primary" style={{ color: "white" }}>
          Check the tokenomics for more details
        </Button>
      </a>
    ),
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
