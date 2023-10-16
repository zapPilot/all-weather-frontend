import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Row, Col, Spin } from "antd";
import SuggestionsForBetterStableCoins from "./views/SuggestionsForBetterStableCoins.jsx";
import SuggestionsForLPTokens from "./views/SuggestionsForLPTokens.jsx";
import DOMforCefi from "./views/DOMforCefi.jsx";
import DOMforCefiUsers from "./views/DOMforCefiUsers.jsx";
import useRebalanceSuggestions from "../utils/rebalanceSuggestions.js";
import useBetterPoolsMetadata from "../utils/betterPoolsMetadata";

const Cefi: NextPage = () => {
  const {
    portfolioApr,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  } = useRebalanceSuggestions();
  const { betterPoolsMetadata } = useBetterPoolsMetadata();

  return (
    <BasePage>
      <center>
        <h1 className="ant-table-title">Discretionary Investment Service</h1>
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
                <h2 className="ant-table-title">Vault</h2>
                <DOMforCefi betterPoolsMetadata={betterPoolsMetadata} />
              </Col>
              <Col xl={12} md={24} xs={24}>
                <h2 className="ant-table-title">User Balances</h2>
                <DOMforCefiUsers betterPoolsMetadata={betterPoolsMetadata} />
              </Col>
              <Col xl={12} md={24} xs={24}>
                <SuggestionsForLPTokens
                  wording="Better Pools for ETH"
                  topNData={topNPoolConsistOfSameLpToken}
                  portfolioApr={portfolioApr}
                  windowHeight={300}
                />
              </Col>
              <Col xl={12} md={24} xs={24}>
                <SuggestionsForBetterStableCoins
                  wording="Better Pools for Stable Coin"
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

export default Cefi;
