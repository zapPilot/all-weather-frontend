// import suggestions from "./suggestions.json";
import { Spin, Row, Col, Button } from "antd";
import { DollarOutlined, FireOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import useRebalanceSuggestions from "../../utils/rebalanceSuggestions";
import RebalanceChart from "./RebalanceChart";
import SuggestionsForBetterStableCoins from "./SuggestionsForBetterStableCoins";
import SuggestionsForLPTokens from "./SuggestionsForLPTokens";
import TopNLowestAprPools from "./TopNLowestAprPools";

const useWindowHeight = () => {
  const [windowHeight, setWindowHeight] = useState(0); // 視窗高度狀態

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight((window.innerHeight - 75) / 4); // 調整視窗高度並減去 Header 的高度（64）
    };

    window.addEventListener("resize", handleResize); // 監聽視窗大小改變事件

    handleResize(); // 初始化視窗高度

    return () => {
      window.removeEventListener("resize", handleResize); // 移除事件監聽器
    };
  }, []);

  return windowHeight;
};

const RebalancerWidget = (address) => {
  const {
    netWorth,
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  } = useRebalanceSuggestions(address);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (rebalanceSuggestions && rebalanceSuggestions.length > 0) {
      setIsLoading(false);
    }
  }, [rebalanceSuggestions]);

  const windowHeight = useWindowHeight();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: windowHeight,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Row gutter={[30, 20]} align="center">
        <Col xl={10} md={24} xs={24} align="center">
          <Row gutter={[30, 20]} align="center">
            <Col span={24} align="center">
              <RebalanceChart
                rebalanceSuggestions={rebalanceSuggestions}
                netWorth={netWorth}
              />
            </Col>
            <div
              style={{
                display: "flex",
                width: 375,
                justifyContent: "left",
                padding: 10,
                alignItems: "center",
                height: "100%",
              }}
            >
              <div style={{ position: "relative" }}>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <text style={{ color: "#BEED54", fontSize: 12 }}>
                    All Weather Portfolio
                  </text>
                </div>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <strong style={{ color: "white", fontSize: 26 }}>
                    Net Worth: ${netWorth.toFixed(2)}
                  </strong>
                </div>
                <div style={{ textAlign: "left", marginBottom: 20 }}>
                  <text
                    style={{ color: "white", fontSize: 12, marginRight: 15 }}
                  >
                    Monthly Interest: ${(totalInterest / 12).toFixed(2)}
                  </text>
                  <text style={{ color: "white", fontSize: 12 }}>
                    Portfolio APR: {portfolioApr.toFixed(2)}%
                  </text>
                </div>
                <div style={{ textAlign: "left" }}>
                  <Button
                    style={{
                      color: "white",
                      borderColor: "white",
                      paddingInline: 10,
                      lineHeight: 1,
                      marginRight: 15,
                    }}
                    shape="round"
                    icon={<DollarOutlined />}
                    size="small"
                  >
                    Buy eth
                  </Button>
                  <Button
                    style={{
                      color: "white",
                      borderColor: "white",
                      paddingInline: 10,
                      lineHeight: 1,
                    }}
                    shape="round"
                    icon={<FireOutlined />}
                    size="small"
                  >
                    Gas：12g
                  </Button>
                </div>
              </div>
            </div>
          </Row>
        </Col>
        <Col xl={14} md={24} xs={24} align="center">
          <Row gutter={[30, 20]} align="center">
            <Col xl={12} md={24} xs={24} align="left">
              <TopNLowestAprPools
                wording="TopN Lowest APR Pools"
                topNData={topNLowestAprPools}
                portfolioApr={portfolioApr}
                windowHeight={windowHeight}
              />
            </Col>
            <Col xl={12} md={24} xs={24} align="left">
              <SuggestionsForLPTokens
                wording="Better Pool for LP Tokens"
                topNData={topNPoolConsistOfSameLpToken}
                portfolioApr={portfolioApr}
                windowHeight={windowHeight}
              />
            </Col>
            <Col span={24} align="left">
              <SuggestionsForBetterStableCoins
                wording="Better Stable Coin Pools"
                topNData={topNStableCoins}
                portfolioApr={portfolioApr}
                windowHeight={windowHeight}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
};

export default RebalancerWidget;
