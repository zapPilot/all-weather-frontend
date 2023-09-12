import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Row, Col } from "antd";
import SuggestionsForBetterStableCoins from "./views/SuggestionsForBetterStableCoins.jsx";
import SuggestionsForLPTokens from "./views/SuggestionsForLPTokens";
import TopNLowestAprPools from "./views/TopNLowestAprPools";
import { useAccount } from "wagmi";
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
        <Col xl={14} md={24} xs={24} align="center">
          <Row gutter={[30, 20]} align="center">
            <Col xl={12} md={24} xs={24} align="left">
              <TopNLowestAprPools
                wording="TopN Lowest APR Pools"
                topNData={topNLowestAprPools}
                portfolioApr={portfolioApr}
                windowHeight={300}
              />
            </Col>
            <Col xl={12} md={24} xs={24} align="left">
              <SuggestionsForLPTokens
                wording="Better Pool for LP Tokens"
                topNData={topNPoolConsistOfSameLpToken}
                portfolioApr={portfolioApr}
                windowHeight={300}
              />
            </Col>
            <Col span={24} align="left">
              <SuggestionsForBetterStableCoins
                wording="Better Stable Coin Pools"
                topNData={topNStableCoins}
                portfolioApr={portfolioApr}
                windowHeight={300}
              />
            </Col>
          </Row>
        </Col>
      </center>
    </BasePage>
  );
};

export default BetterPools;
