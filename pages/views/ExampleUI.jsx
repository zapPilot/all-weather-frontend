import React from "react";
import { useEffect, useState, useContext } from "react";
import RebalancerWidget from "./Rebalancer";
import PortfolioMetaTab from "./PortfolioMetaTab";
import {
  Row,
  Col,
  ConfigProvider,
  Button,
  Image,
} from "antd";
import Link from "next/link";
import { web3Context } from "./Web3DataProvider";
import { useWindowHeight } from "../../utils/chartUtils";

export default function ExampleUI() {
  const windowHeight = useWindowHeight();
  const WEB3_CONTEXT = useContext(web3Context);
  const [loadingState, setLoadingState] = useState(true);
  const [isHover, setIsHover] = useState(false);

   const handleMouseEnter = () => {
      setIsHover(true);
   };

   const handleMouseLeave = () => {
      setIsHover(false);
   };
  
  const divInstallment = {
    padding: "0 8px",
    color: "white",
    backgroundColor: '#000000',
  };
  
  const btnInvest = {
    marginTop: '32px',
    width: '200px',
    height: '48px',
    backgroundColor: isHover ? '#beed54' : 'transparent',
    color: isHover ? '#000000' : '#beed54',
    border: '1px solid #beed54',
    fontWeight: 500
  }

  const bgStyle = {
    backgroundImage: "url('../images/bg.jpg')",
    boxShadow: '0 0 100px 100px #000000 inset'
  }

  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT !== undefined) {
        setLoadingState(false);
      }
    }
    fetchPortfolioMetadata();
  }, [WEB3_CONTEXT]);
  return (
    <div style={divInstallment}>
      <Row 
        gutter={{ 
          xs: 8,
          md: 16
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
          style={bgStyle}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: windowHeight
            }}
          >
            <center>
              <h1
                style={{ 
                  marginBottom: '32px',
                  color: '#beed54' 
                }}
                className="heading-title"
              >
                All Weather Protocol
              </h1>
              <h1 className="heading-subtitle">Biggest Liquidity Mining Index Fund</h1>
              <h2 className="heading-subtitle">Click Once, Retire Forever.</h2>
              <ConfigProvider
                theme={{
                  token: {
                    colorPrimary: '#beed54',
                    colorPrimaryBorder: '#beed54',
                  }
                }}
              >
                <Link href="#zapSection">
                  <Button
                    type="primary"
                    loading={loadingState}
                    style={btnInvest}
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
          <RebalancerWidget />
        </Col>
      </Row>
    </div>
  );
}
