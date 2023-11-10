import React, { useState } from "react";
import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Row, Col, InputNumber, Select, Button } from "antd";

const Installment : NextPage = () => {
  const [amount, setAmount] = useState(0);

  const colorWhite = {
    color: 'white'
  };

  const labelStyle = {
    display: 'inline-block',
    width: '100px',
    fontWeight: 'Bold'
  };
  
  const inputStyle = {
    width: '200px',
    margin: '10px 0',
  };

  return (
    <BasePage>
      <center style={colorWhite}>
        <h1>Installment</h1>
      </center>
      <Row 
        gutter={16}
        style={colorWhite}>
          <Col span={12}>
            <h2>Calculator</h2>
            <div>
              <p style={labelStyle}>Amount:</p>
              <InputNumber 
                defaultValue={1000}
                style={inputStyle}
                value={amount}
              />
            </div>
            <div>
              <p style={labelStyle}>Interest Rate:</p>
              <InputNumber
                defaultValue={10}
                style={inputStyle}
              />
            </div>
            <div>
              <p style={labelStyle}>Installment:</p>
              <Select
                defaultValue={3}
                style={inputStyle}
                options={[
                  { value: 3, label: 3 },
                  { value: 6, label: 6 },
                  { value: 12, label: 12 },
                  { value: 24, label: 24 },
                  { value: 30, label: 30 },
                ]}
              />
            </div>
            <div>
              <Button 
                type="primary"
                onClick={()=>{
                  console.log(amount)
                }}
              >
                Calculate
              </Button>
            </div>
          </Col>
          <Col span={12}>
            <h2>Result</h2>
          </Col>
        </Row>
    </BasePage>
  );
};

export default Installment