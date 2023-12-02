import React from "react";

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

const listDisplay = {
  display: "grid",
  gridTemplateColumns: "150px auto",
  marginBottom: 10,
};

const labelStyle = {
  display: "block",
  marginRight: 10,
  padding: 10,
  backgroundColor: "#beed54",
  color: "#000000",
  fontWeight: 500,
};

const Fees = () => (
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
export default Fees;
