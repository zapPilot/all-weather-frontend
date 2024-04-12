import React from "react";
import { useEffect, useState, useContext } from "react";
import RebalancerWidget from "./Rebalancer";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Row, Col, ConfigProvider, Button } from "antd";
import Link from "next/link";
import Image from "next/image";
import { web3Context } from "./Web3DataProvider";
import { useWindowHeight } from "../../utils/chartUtils";
import styles from "../../styles/Home.module.css";

export default function ExampleUI() {
  const windowHeight = useWindowHeight();
  const WEB3_CONTEXT = useContext(web3Context);
  const [loadingState, setLoadingState] = useState(true);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [isHover, setIsHover] = useState(false);

  const handleMouseEnter = () => {
    setIsHover(true);
  };

  const handleMouseLeave = () => {
    setIsHover(false);
  };

  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT !== undefined) {
        setLoadingState(false);
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
    <div className={styles.divInstallment}>
      <Row
        gutter={{
          xs: 8,
          md: 16,
        }}
      >
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 20,
            offset: 2,
          }}
          className={styles.bgStyle}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: windowHeight,
            }}
          >
            <center>
              <Image src="../logo.png" alt="logo" width={100} height={100} />
              <h1
                style={{
                  marginBottom: 32,
                  color: "#5DFDCB",
                }}
                className="heading-title"
              >
                All Weather Protocol
              </h1>
              <h2 className="heading-subtitle">
                An Omnichain Yield Aggregator with the Highest Yield
              </h2>
              <p className="heading-subtitle">
                Click Once, Farm the Best Forever.
              </p>
              <p className="heading-subtitle">
                Enjoy
                <span
                  style={{
                    color: "#5DFDCB",
                  }}
                  className="heading-title"
                >
                  {" "}
                  {portfolioApr.toFixed(2)}%{" "}
                </span>
                APR
              </p>
              <ConfigProvider
                theme={{
                  token: {
                    colorPrimary: "#5DFDCB",
                    colorPrimaryBorder: "#5DFDCB",
                  },
                }}
              >
                <Link href="#zapSection">
                  <Button
                    type="primary"
                    loading={loadingState}
                    className={styles.btnInvest}
                    style={
                      isHover
                        ? { backgroundColor: "#5DFDCB", color: "#000000" }
                        : { backgroundColor: "transparent", color: "#5DFDCB" }
                    }
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    Invest Now!
                  </Button>
                </Link>
              </ConfigProvider>
            </center>
          </div>
        </Col>
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 18,
            offset: 3,
          }}
        >
          <center>
            <PortfolioMetaTab />
          </center>
        </Col>
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 10,
            offset: 7,
          }}
        >
          <RebalancerWidget />
        </Col>
      </Row>
    </div>
  );
}
