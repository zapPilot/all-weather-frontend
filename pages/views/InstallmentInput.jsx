import React, { useState, useEffect } from "react";
import { InputNumber, Select, Space } from "antd";

const InstallmentInput = ({ planData }) => {
  const [interestRate, setInterestRate] = useState(11);
  const [installment, setInstallment] = useState(12);

  const interestRateChange = (value) => {
    setInterestRate(value);
  };

  const installmentChange = (value) => {
    setInstallment(value);
  };

  useEffect(() => {
    planData({
      interestRate,
      installment,
    });
  }, [
    interestRate,
    installment,
    planData,
  ]);

  const divInput = {
    display: "flex",
    alignItems: "center",
  };

  const labelStyle = {
    display: "inline-block",
    width: "100px",
    fontWeight: "Bold",
  };

  const inputStyle = {
    width: "200px",
  };

  return (
    <div>
      <Space direction="vertical" size="middle">
        <Space size="middle">
          <p style={labelStyle}>Interest Rate :</p>
          <InputNumber
            addonAfter="%"
            defaultValue={11}
            style={inputStyle}
            onChange={interestRateChange}
          />
        </Space>
        <Space size="middle">
          <p style={labelStyle}>Installment :</p>
          <Select
            defaultValue={12}
            style={inputStyle}
            options={[
              { value: 3, label: 3 },
              { value: 6, label: 6 },
              { value: 12, label: 12 },
              { value: 24, label: 24 },
              { value: 30, label: 30 },
            ]}
            onChange={installmentChange}
          />
        </Space>
      </Space>
    </div>
  );
};

export default InstallmentInput;
