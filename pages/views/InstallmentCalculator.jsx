import React, { useContext, useEffect, useState } from "react";
import { Row, Col, Button, ConfigProvider, InputNumber } from "antd";
import { web3Context } from "./Web3DataProvider";
import InstallmentInput from "./InstallmentInput";

const InstallmentCalculator = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [amount, setAmount] = useState(1000);
  const [planA, setPlanA] = useState({});
  const [planB, setPlanB] = useState({});
  const [interest, setInterest] = useState([]);

  const amountChange = (value) => {
    setAmount(value)
  };

  const planAData = (value) => {
    setPlanA(value)
  }

  const planBData = (value) => {
    setPlanB(value)
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
  }, [WEB3_CONTEXT, portfolioApr, amount]);

  const updateInterest = () => {
    const calculateInterest = (plan) => {
      return Number((amount / plan.installment) * (1 + plan.installment) * plan.installment / 2 * (Number(portfolioApr).toFixed(2) / 100 - (plan.interestRate / 100)) / 12).toFixed(2)
    }

    let interestA = calculateInterest(planA)
    let interestB = calculateInterest(planB)

    setInterest([interestA, interestB])
   
    if (interestA > interestB) {
      console.log('A')
    } else {
      console.log("B")
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
          <h2 style={{marginBottom: '50px'}}>Calculator</h2>
          <div>
            <h3>Amount: </h3>
              <InputNumber
                addonBefore="$"
                defaultValue={1000}
                formatter={(value) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                style={inputStyle}
                onChange={amountChange}
              />
          </div>
          <Row>
            <Col span={12}>
              <h4>Plan A</h4>
              <InstallmentInput planData={planAData}/>
            </Col>
            <Col span={12}>
              <h4>Plan B</h4>
              <InstallmentInput planData={planBData}/>
            </Col>
          </Row>
          <div>
            <Button onClick={updateInterest}>Calculate</Button>
          </div>
        </Col>
        <Col span={6}>
          <h2 style={{marginBottom: '50px'}}>Result</h2>
          <h3>Plan {(interest[0]>interest[1])?'A':'B'} is Better!</h3>
          <p>Plan A Interest: {interest[0]}</p>
          <p>Plan B Interest: {interest[1]}</p>
          <p>All Weather Portfolio APR:{Number(portfolioApr).toFixed(2)}</p>
          <p>formula:(Amount / Installment) * (1 + Installment) * Installment / 2 * (All Weather Portfolio APR - Interest Rate ) / 12 </p>
        </Col>
      </Row>
    </ConfigProvider>
  )
}

export default InstallmentCalculator