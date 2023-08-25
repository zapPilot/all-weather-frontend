import React, { useState } from "react";
import { Input, Tooltip } from "antd";
const NumericInputComponent = (props) => {
  const { value, onChange, placeholder, addonBefore } = props;
  const handleChange = (e) => {
    const { value: inputValue } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if (reg.test(inputValue) || inputValue === "" || inputValue === "-") {
      onChange(inputValue);
    }
  };

  // '.' at the end or only '-' in the input box.
  const handleBlur = () => {
    let valueTemp = value;
    if (value.charAt(value.length - 1) === "." || value === "-") {
      valueTemp = value.slice(0, -1);
    }
    onChange(valueTemp.replace(/0*(\d+)/, "$1"));
  };
  return (
    <Tooltip
      trigger={["focus"]}
      placement="topLeft"
      overlayClassName="numeric-input"
    >
      <Input
        {...props}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={16}
        addonBefore={addonBefore}
      />
    </Tooltip>
  );
};

const NumericInput = (props) => {
  const { value, onChange, placeholder, addonBefore } = props;
  return (
    <NumericInputComponent
      style={{
        width: 220,
      }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      addonBefore={addonBefore}
    />
  );
};
export default NumericInput;
