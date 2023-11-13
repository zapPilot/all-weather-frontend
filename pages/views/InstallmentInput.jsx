import React, { useState } from "react";
import { InputNumber, Select, Button } from "antd";

const InstallmentInput = ({portfolioApr}) => {
  const [amount, setAmount] = useState(1000);
  const [interestRate, setInterestRate] = useState(11);
  const [installment, setInstallment] = useState(12);

  const amountChange = (value) => {
    setAmount(value)
  };

  const interestRateChange = (value) => {
    setInterestRate(value)
  };

  const installmentChange = (value) => {
    setInstallment(value)
  };

  const divInput = {
    display: 'flex',
    alignItems: 'center'
  }

  const labelStyle = {
    display: 'inline-block',
    width: '100px',
    fontWeight: 'Bold'
  };
  
  const inputStyle = {
    width: '200px',
    margin: '10px 0'
  };

  return (
    <div>
      <div style={divInput}>
        <p style={labelStyle}>Amount :</p>
          <InputNumber
            addonBefore="$"
            defaultValue={1000}
            formatter={(value) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            style={inputStyle}
            onChange={amountChange}
          />
      </div>
      <div style={divInput}>
        <p style={labelStyle}>Interest Rate :</p>
        <InputNumber
          addonAfter="%"
          defaultValue={11}
          style={inputStyle}
          onChange={interestRateChange}
        />
      </div>
      <div style={divInput}>
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
      </div>
    </div>
  )
}

export default InstallmentInput