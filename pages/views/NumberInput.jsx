import React from "react";
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
    let valueTemp = String(value);
    if (String(value)?.charAt(value.length - 1) === "." || value === "-") {
      valueTemp = value.slice(0, -1);
    }
    onChange(valueTemp.replace(/0*(\d+)/, "$1"));
  };
  return (
    <Input
      className="rounded-md py-0 border-[#d9d9d9]"
      {...props}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={16}
      addonBefore={addonBefore}
      style={{ width: "50%" }}
    />
  );
};

const NumericInput = (props) => {
  const { value, onChange, placeholder, addonBefore } = props;
  return (
    <NumericInputComponent
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      addonBefore={addonBefore}
    />
  );
};
export default NumericInput;
