// import suggestions from "./suggestions.json";
import { Spin, Row, Col } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import RebalanceChart from "./RebalanceChart";
import ZapInButton from "./ZapInButton";
import ZapOutButton from "./ZapOutButton";
import UserBalanceInfo from "./UserBalanceInfo";
import { useWindowWidth } from "../../utils/chartUtils";
import { useEffect, useState } from "react";
import useRebalanceSuggestions from "../../utils/rebalanceSuggestions";

const RebalancerWidget = () => {
  const windowWidth = useWindowWidth();
  const divSpin = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100px",
  };
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
  const getLoadingDom = () => {
    return (
      <>
        <div style={divSpin}>
          <Spin size="large" />
        </div>
        <p style={{ textAlign: "center" }}>
          Please click the &apos;Connect Wallet&apos; button to connect your
          wallet.
        </p>
      </>
    );
  };
  const getRebalanceDom = ({
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
  }) => {
    return (
      <>
        <div id="zapSection">
          <RebalanceChart
            rebalanceSuggestions={rebalanceSuggestions}
            netWorth={
              process.env.NEXT_PUBLIC_DAVID_PORTFOLIO !== "true"
                ? (netWorth + 25873).toFixed(2)
                : netWorth.toFixed(2)
            }
            windowWidth={windowWidth}
            showCategory={false}
          />
          <div>
            <div>
              <h3>
                TVL: ${netWorthWithCustomLogic}{" "}
                <a
                  href="https://debank.com/profile/0x9ad45d46e2a2ca19bbb5d5a50df319225ad60e0d"
                  target="_blank"
                >
                  <LinkOutlined />
                </a>
              </h3>
              <h3>
                Reward APR: {portfolioApr ? portfolioApr.toFixed(2) : 0}%{" "}
                {/* <APRPopOver mode="percentage" /> */}
              </h3>
            </div>
            <div>
              <UserBalanceInfo
                netWorth={netWorth}
                netWorthWithCustomLogic={netWorthWithCustomLogic}
                portfolioApr={portfolioApr}
                claimableRewards={claimableRewards}
              />
            </div>
            <div>
              <ZapInButton />
              <ZapOutButton />
              {/* <APRPopOver mode="price" /> */}
            </div>
          </div>
        </div>
      </>
    );
  };
  const [renderContent, setRenderContent] = useState(null);

  useEffect(() => {
    console.log("netWorth", netWorth);
    if (netWorth !== 0) {
      console.log("in if");
      setRenderContent(
        getRebalanceDom({
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
        }),
      );
    } else {
      setRenderContent(getLoadingDom());
    }
  }, [netWorth]);

  return renderContent;
};

export default RebalancerWidget;
