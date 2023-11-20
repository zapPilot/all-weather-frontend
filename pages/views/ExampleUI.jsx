import React from "react";
import { useEffect, useState, useContext } from "react";
import RebalancerWidget from "./Rebalancer";
import PortfolioMetaTab from "./PortfolioMetaTab";
import {
  Row,
  Col,
  Button,
} from "antd";
import Link from "next/link";
import { web3Context } from "./Web3DataProvider";
import { useWindowHeight } from "../../utils/chartUtils";

export default function ExampleUI() {
  const windowHeight = useWindowHeight();
  const WEB3_CONTEXT = useContext(web3Context);
  const [loadingState, setLoadingState] = useState(true);
  console.log('windowHeight:',windowHeight)
  const divInstallment = {
    padding: "0 8px",
    color: "white",
    backgroundColor: '#000000',
  };

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
      <Row gutter={{ xs: 8, md: 16 }}>
        <Col 
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 12,
            offset: 6,
          }}
        >
          <center style={{minHeight: windowHeight}}>
            <h1
              style={{color: '#beed54'}}
              className="heading-title"
            >
              All Weather Protocol
            </h1>
            <h1 className="heading-title">Biggest Liquidity Mining Index Fund</h1>
            <h2 className="heading-subtitle">Click Once, Retire Forever.</h2>
            <Link href="#zapSection">
              <Button type="primary" loading={loadingState}>
                Invest Now!
              </Button>
            </Link>
          </center>
          <center>
            <PortfolioMetaTab />
          </center>
          <RebalancerWidget />
        </Col>
      </Row>
    </div>
  );
}
