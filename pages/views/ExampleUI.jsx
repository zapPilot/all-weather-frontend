import React from "react";
import { useEffect, useState, useContext } from "react";
import RebalancerWidget from "./Rebalancer";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Row, Col, ConfigProvider, Button } from "antd";
import Link from "next/link";
import Image from "next/image";
import { useWindowHeight } from "../../utils/chartUtils";
import styles from "../../styles/Home.module.css";
import useRebalanceSuggestions from "../../utils/rebalanceSuggestions";

export default function ExampleUI() {
  const windowHeight = useWindowHeight();
  const [isHover, setIsHover] = useState(false);
  const {
    netWorth,
    netWorthWithCustomLogic,
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    sharpeRatio,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
    aggregatedPositions,
    ROI,
    maxDrawdown,
    claimableRewards,
  } = useRebalanceSuggestions();
  const handleMouseEnter = () => {
    setIsHover(true);
  };

  const handleMouseLeave = () => {
    setIsHover(false);
  };

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
                    loading={portfolioApr === 0 ? true : false}
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
