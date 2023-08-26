// import suggestions from "./suggestions.json";
import { Spin, Row, Col } from "antd";
import { useEffect, useState } from "react";
import useRebalanceSuggestions from "../../utils/rebalanceSuggestions";
import RebalanceChart from "./RebalanceChart";
import SuggestionsForBetterStableCoins from "./SuggestionsForBetterStableCoins";
import SuggestionsForLPTokens from "./SuggestionsForLPTokens";
import TopNLowestAprPools from "./TopNLowestAprPools";
import ZapInButton from "./ZapInButton";
import ZapOutButton from "./ZapOutButton";
import APRPopOver from "./APRPopOver";
import UserBalanceInfo from "./UserBalanceInfo";

const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(0); // 視窗高度狀態

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth); // 調整視窗高度並減去 Header 的高度（64）
    };

    window.addEventListener("resize", handleResize); // 監聽視窗大小改變事件

    handleResize(); // 初始化視窗高度

    return () => {
      window.removeEventListener("resize", handleResize); // 移除事件監聽器
    };
  }, []);

  return windowWidth;
};

const RebalancerWidget = ({ address }) => {
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
    if (netWorth > 0) {
      setIsLoading(false);
    }
  }, [netWorth]);

  const windowWidth = useWindowWidth();

  if (isLoading) {
    return (
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
    );
  }

  return (
    <>
      <Row gutter={[16, 20]} align="center">
        <Col xl={10} md={24} xs={24} align="center">
          <Row gutter={[30, 20]} align="center">
            <Col span={24} align="center">
              <RebalanceChart
                rebalanceSuggestions={rebalanceSuggestions}
                netWorth={netWorth}
                windowWidth={windowWidth}
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
                marginLeft: "1.5rem",
              }}
            >
              <div style={{ position: "relative" }}>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <text style={{ color: "#BEED54", fontSize: 12 }}>
                    Current Strategy: Permanent Portfolio
                  </text>
                </div>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <strong style={{ color: "white", fontSize: 26 }}>
                    TVL: ${netWorth.toFixed(2)}
                  </strong>
                </div>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <strong style={{ color: "white", fontSize: 26 }}>
                    <text>
                      Reward APR: {portfolioApr ? portfolioApr.toFixed(2) : 0}%{" "}
                      <APRPopOver
                        address={address}
                        mode="percentage"
                        portfolioApr={portfolioApr}
                      />
                    </text>
                  </strong>
                </div>
                <UserBalanceInfo tvl={netWorth} />
                <div style={{ textAlign: "left", marginBottom: 20 }}>
                  <text style={{ color: "white", fontSize: 12 }}>
                    Monthly Interest: ${(totalInterest / 12).toFixed(2)}
                  </text>
                </div>
                <div style={{ textAlign: "left" }}>
                  <ZapInButton />
                  <ZapOutButton />
                  <APRPopOver address={address} mode="price" />
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
      </Row>
    </>
  );
};

export default RebalancerWidget;
