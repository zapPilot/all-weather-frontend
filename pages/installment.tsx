import React, { useContext, useEffect, useState } from "react";
import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Row, Col, InputNumber, Select, Button, ConfigProvider } from "antd";
import { web3Context } from "./views/Web3DataProvider";

const Installment : NextPage = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [amount, setAmount] = useState(1000);
  const [interestRate, setInterestRate] = useState(11);
  const [installment, setInstallment] = useState(12);
  const [portfolioApr, setPortfolioApr] = useState(0);

  const amountChange = (value: number) => {
    setAmount(value)
  };

  const interestRateChange = (value: number) => {
    setInterestRate(value)
  };

  const installmentChange = (value: number) => {
    setInstallment(value)
  };

  const getAPR = () => {
    console.log(`amount: ${amount}, interestRate: ${interestRate}, installment: ${installment}`)
  }

  const colorWhite = {
    color: 'white'
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

  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT) {
        setPortfolioApr(
          WEB3_CONTEXT.portfolioApr === undefined
            ? 0
            : WEB3_CONTEXT.portfolioApr,
        );
      }
    }
      fetchPortfolioMetadata();
    }, [WEB3_CONTEXT, portfolioApr]);

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
            <ConfigProvider
              theme={{
                components: {
                  InputNumber: {
                    colorPrimaryHover: '#beed54',
                    colorFillAlter: 'white'
                  },
                  Select: {
                    colorPrimaryHover: '#beed54'
                  },
                  Button: {
                    colorPrimaryActive: '#beed54',
                    colorPrimaryHover: '#beed54',
                    colorText: '#beed54',
                  }
                },
              }}
            >
              <div style={divInput}>
                <p style={labelStyle}>Amount :</p>
                  <InputNumber
                    addonBefore="$"
                    defaultValue={1000}
                    formatter={(value:number) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
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
              <div>
                <Button
                  onClick={getAPR}
                >
                  Calculate
                </Button>
              </div>
            </ConfigProvider>
          </Col>
          <Col span={12}>
            <h2>Result</h2>
            APR{portfolioApr}
            <p>Interest :{Number((amount / installment) * (1 + installment) * installment / 2 * (0.2 - (interestRate / 100)) / 12).toFixed(2)}</p>
            <p>formula:(Amount / Installment) * (1 + Installment) * Installment / 2 * (0.2 - Interest Rate ) / 12 </p>
            
          </Col>
        </Row>
    </BasePage>
  );
};

export default Installment