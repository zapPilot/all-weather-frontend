import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Row, Col, Spin } from "antd";
import SuggestionsForBetterStableCoins from "./views/SuggestionsForBetterStableCoins.jsx";
import SuggestionsForLPTokens from "./views/SuggestionsForLPTokens";
import TopNLowestAprPools from "./views/TopNLowestAprPools";
import useRebalanceSuggestions from "../utils/rebalanceSuggestions";
import { useWindowHeight } from "../utils/chartUtils";

const BetterPools: NextPage = () => {
  const {
    portfolioApr,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  } = useRebalanceSuggestions();
  const windowHeight = useWindowHeight();
  const divBetterPools = {
    padding: "0 8px",
    minHeight: windowHeight,
    color: "#ffffff",
  }

  return (
    <BasePage>
      <div style={divBetterPools}>
        <center>
          <h1>Better Pools</h1>
        </center>
          {topNLowestAprPools.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "15rem",
              }}
            >
              <Spin size="large" />
            </div>
          ) : (
            <Row gutter={{ xs: 8, md: 16 }}>
              <Col
                xs={{
                  span: 24,
                  offset: 0,
                }}
                md={{
                  span: 9,
                  offset: 4,
                }}  
              >
                <TopNLowestAprPools
                  wording="TopN Lowest APR Pools"
                  topNData={topNLowestAprPools}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
              <Col
                xs={{
                  span: 24,
                  offset: 0,
                }}
                md={{
                  span: 9,
                  offset: 0,
                }}
              >
                <SuggestionsForLPTokens
                  wording="Better Pool for LP Tokens"
                  topNData={topNPoolConsistOfSameLpToken}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
              <Col
                xs={{
                  span: 24,
                  offset: 0,
                }} 
                md={{
                  span: 18,
                  offset: 4,
                }}
              >
                <SuggestionsForBetterStableCoins
                  wording="Better Stable Coin Pools"
                  topNData={topNStableCoins}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
            </Row>
          )}
        
      </div>
    </BasePage>
  );
};

export default BetterPools;
