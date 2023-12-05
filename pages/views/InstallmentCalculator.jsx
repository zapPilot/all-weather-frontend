import React, { useContext, useEffect, useState, useRef } from "react";
import {
  Row,
  Col,
  Space,
  Button,
  ConfigProvider,
  InputNumber,
  Modal,
} from "antd";
import { web3Context } from "./Web3DataProvider";
import InstallmentInput from "./InstallmentInput";
import styles from "../../styles/Installment.module.css";

const InstallmentCalculator = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [amount, setAmount] = useState(1000);
  const [planA, setPlanA] = useState({});
  const [planB, setPlanB] = useState({});
  const [interestA, setInterestA] = useState(0);
  const [interestB, setInterestB] = useState(0);
  const [msgResult, setMsgResult] = useState("Please Calculate!");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 0;

  const amountChange = (value) => {
    setAmount(value);
  };

  const planAData = (value) => {
    setPlanA(value);
  };

  const planBData = (value) => {
    setPlanB(value);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const inputStyle = {
    width: "200px",
  };

  const divResult = {
    marginBottom: "24px",
    padding: "8px",
    backgroundColor: "#333333",
    color: "#5DFDCB",
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
      return (
        ((((amount / plan.installment) *
          (1 + plan.installment) *
          plan.installment) /
          2) *
          (portfolioApr.toFixed(2) / 100 - plan.interestRate / 100)) /
        12
      ).toFixed(2);
    };

    const interestA = calculateInterest(planA);
    const interestB = calculateInterest(planB);

    setInterestA(interestA);
    setInterestB(interestB);

    interestA === interestB
      ? setMsgResult("is eaqul.")
      : interestA > interestB
      ? setMsgResult("A is better!")
      : setMsgResult("B is better!");

    windowWidth < 767.98 ? setIsModalOpen(true) : setIsModalOpen(false);
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          InputNumber: {
            colorPrimaryHover: "#5DFDCB",
            colorFillAlter: "white",
          },
          Select: {
            colorPrimaryHover: "#5DFDCB",
          },
          Button: {
            colorPrimaryActive: "#5DFDCB",
            colorPrimaryHover: "#5DFDCB",
            colorText: "#5DFDCB",
          },
          Modal: {
            contentBg: "#333333",
            headerBg: "#333333",
            titleColor: "white",
            colorText: "white",
            colorIcon: "white",
          },
        },
      }}
    >
      <Row gutter={{ xs: 8, md: 16 }}>
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 12,
            offset: 4,
          }}
        >
          <h2 className={styles.title}>Calculator</h2>
          <div style={{ marginBottom: "25px" }}>
            <Space direction="vertical" size="small">
              <h3>Amount :</h3>
              <InputNumber
                addonBefore="$"
                defaultValue={1000}
                formatter={(value) =>
                  value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                style={inputStyle}
                onChange={amountChange}
              />
            </Space>
          </div>
          <Row gutter={[0, { xs: 24, md: 0 }]}>
            <Col xs={24} md={12}>
              <h4>Plan A</h4>
              <InstallmentInput planData={planAData} />
            </Col>
            <Col xs={24} md={12}>
              <h4>Plan B</h4>
              <InstallmentInput planData={planBData} />
            </Col>
          </Row>
          <div>
            <Button onClick={updateInterest}>Calculate</Button>
          </div>
        </Col>
        <Col xs={24} md={6} className={styles.divResult}>
          <h2 className={styles.title}>Result</h2>
          <div style={divResult}>
            <h3>Plan {msgResult}</h3>
            <h3>
              {interestA === interestB
                ? ""
                : interestA > interestB
                ? "$" + interestA
                : "$" + interestB}
            </h3>
          </div>
          <div>
            <h4>Detail</h4>
            <p>Plan A Interest : ${interestA}</p>
            <p>Plan B Interest : ${interestB}</p>
            <p>All Weather Protocol APR : {portfolioApr.toFixed(2)}%</p>
            <p>
              Formula : (Amount / Installment) * (1 + Installment) * Installment
              / 2 * (All Weather Protocol APR - Interest Rate ) / 12{" "}
            </p>
          </div>
        </Col>
      </Row>
      <Modal
        title="Result"
        centered
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
      >
        <div style={divResult}>
          <h3>Plan {msgResult}</h3>
          <h3>
            {interestA === interestB
              ? ""
              : interestA > interestB
              ? "$" + interestA
              : "$" + interestB}
          </h3>
        </div>
        <div>
          <h4>Detail</h4>
          <p>Plan A Interest : ${interestA}</p>
          <p>Plan B Interest : ${interestB}</p>
          <p>All Weather Protocol APR : {portfolioApr.toFixed(2)}%</p>
          <p>
            Formula : (Amount / Installment) * (1 + Installment) * Installment /
            2 * (All Weather Protocol APR - Interest Rate ) / 12{" "}
          </p>
        </div>
      </Modal>
    </ConfigProvider>
  );
};

export default InstallmentCalculator;
