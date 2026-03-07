import React from "react";
import { InputNumber } from "antd";

const NumericInput = (props) => {
  const { value, onChange, placeholder, style, min, ...restProps } = props;

  return (
    <InputNumber
      className="rounded-md py-0 border-[#d9d9d9]"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: "50%", ...style }}
      maxLength={8}
      min={min}
      {...restProps}
    />
  );
};

export default NumericInput;
