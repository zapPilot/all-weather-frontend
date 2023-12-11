import React from "react";
import Image from "next/image";

export default function Header({ ...props }) {
  return (
    <div
      style={{
        margin: "0 auto",
        width: 300,
      }}
    >
      {props.children}
    </div>
  );
}
