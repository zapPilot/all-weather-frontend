import React from "react";
import { ConfigProvider, Button } from "antd";

const items = [
  {
    key: "1",
    label: "Expense Ratio",
    children: "0%",
  },
  {
    key: "2",
    label: "Deposit Fee",
    children: "0%",
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
      "9.7% (In V2, the performance fee will go to 0% if they lock their dLP and join the governance)",
  },
  {
    key: "6",
    label: "Tokenomics",
    children: (
      <ConfigProvider
        theme={{
          token: {
            colorLink: "#5DFDCB",
          },
        }}
      >
        <Button
          type="link"
          href="https://docs.zap-pilot.org/"
          target="_blank"
          style={{ textWrap: "wrap" }}
        >
          Check the tokenomics for more details
        </Button>
      </ConfigProvider>
    ),
  },
];

const listDisplay = {
  display: "grid",
  gridTemplateColumns: "150px auto",
  marginBottom: 10,
};

const labelStyle = {
  display: "block",
  marginRight: 10,
  padding: 10,
  backgroundColor: "#5DFDCB",
  color: "#000000",
  fontWeight: 500,
};

const Fees = () => {
  return (
    <div
      style={{
        textAlign: "left",
      }}
    >
      {items.map((item, key) => (
        <div style={listDisplay} key={item.key}>
          <p style={labelStyle}>{item.label}</p>
          <p
            style={{
              padding: 10,
            }}
          >
            {item.children}
          </p>
        </div>
      ))}
    </div>
  );
};
export default Fees;
