import React, { useContext, useEffect, useState } from "react";
import { Row, Col, Button, ConfigProvider } from "antd";
import { web3Context } from "./Web3DataProvider";
import InstallmentInput from "./InstallmentInput";

const InstallmentCalculator = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [interest, setInterest] = useState(0);
  const { planAvalue, setplanAvalue } = useState(0);

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

  const updateInterest = () => {
    const calculateInterest = Number((amount / installment) * (1 + installment) * installment / 2 * (Number(portfolioApr).toFixed(2) / 100 - (interestRate / 100)) / 12).toFixed(2)
    setInterest(calculateInterest)
    console.log(`portfolioApr:${portfolioApr}`)
    if (calculateInterest > 0) {
      console.log('You should interest!')
    } else {
      console.log("You should'nt interest!")
    }
  }

  const test = () => {
    console.log(`planAvalue:${planAvalue}`)
  }

  return (
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
      <Row
        gutter={16}
        justify="center"
      >
        <Col span={12}>
          <h2>Calculator</h2>
          <Row>
            <Col span={12}>
              <h3>Plan A</h3>
              <InstallmentInput portfolioApr={portfolioApr}/>
            </Col>
            <Col span={12}>
              <h3>Plan B</h3>
              <InstallmentInput portfolioApr={portfolioApr} getNum={updateInterest}/>
            </Col>
          </Row>
          <div>
            <Button onClick={test}>Calculate</Button>
          </div>
        </Col>
        <Col span={6}>
          <h2>Result</h2>
          <p>Interest :{interest}</p>
          <p>All Weather Portfolio APR:{Number(portfolioApr).toFixed(2)}</p>
          <p>formula:(Amount / Installment) * (1 + Installment) * Installment / 2 * (All Weather Portfolio APR - Interest Rate ) / 12 </p>
        </Col>
      </Row>
    </ConfigProvider>
  )
}

export default InstallmentCalculator