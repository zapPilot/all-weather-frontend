import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Row, Col, Spin } from "antd";
import SuggestionsForBetterStableCoins from "./views/SuggestionsForBetterStableCoins.jsx";
import SuggestionsForLPTokens from "./views/SuggestionsForLPTokens";
import TopNLowestAprPools from "./views/TopNLowestAprPools";
import useRebalanceSuggestions from "../utils/rebalanceSuggestions";

const BetterPools: NextPage = () => {
  const {
    portfolioApr,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  } = useRebalanceSuggestions();

  return (
    <BasePage>
      <center>
        <h1 className="ant-table-title">Analytics - Better Pools</h1>

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
          <Col xl={14} md={24} xs={24}>
            <Row gutter={[30, 20]}>
              <Col xl={12} md={24} xs={24}>
                <TopNLowestAprPools
                  wording="TopN Lowest APR Pools"
                  topNData={topNLowestAprPools}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
              <Col xl={12} md={24} xs={24}>
                <SuggestionsForLPTokens
                  wording="Better Pool for LP Tokens"
                  topNData={topNPoolConsistOfSameLpToken}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
              <Col span={24}>
                <SuggestionsForBetterStableCoins
                  wording="Better Stable Coin Pools"
                  topNData={topNStableCoins}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
            </Row>
          </Col>
        )}
      </center>
    </BasePage>
  );
};

export default BetterPools;
