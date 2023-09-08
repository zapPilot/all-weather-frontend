import React from "react";
import Image from "next/image";

export default function Header({ ...props }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            alignItems: "start",
          }}
        ></div>
        {props.children}
      </div>
    </>
  );
}
