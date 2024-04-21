// import suggestions from "./suggestions.json";
import { Spin, Row, Col } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import RebalanceChart from "./RebalanceChart";
import ZapInButton from "./ZapInButton";
import ZapOutButton from "./ZapOutButton";
import UserBalanceInfo from "./UserBalanceInfo";
import { useWindowWidth } from "../../utils/chartUtils";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const RebalancerWidget = () => {
  const windowWidth = useWindowWidth();
  const { data } = useSelector((state) => state.api);
  const divSpin = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100px",
  };
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
  const getRebalanceDom = () => {
    console.log("getRebalanceDom", data, data.net_worth);
    return (
      <>
        <div id="zapSection">
          <RebalanceChart
            rebalanceSuggestions={data.suggestions}
            netWorth={data.net_worth}
            windowWidth={windowWidth}
            showCategory={false}
          />
          <div>
            <div>
              <h3>
                {/* TVL: ${data?.netWorthWithCustomLogic}{" "} */}
                TVL: ${data?.net_worth}{" "}
                <a
                  href="https://debank.com/profile/0x9ad45d46e2a2ca19bbb5d5a50df319225ad60e0d"
                  target="_blank"
                >
                  <LinkOutlined />
                </a>
              </h3>
              <h3>
                Reward APR:{" "}
                {data?.portfolioApr ? data?.portfolioApr.toFixed(2) : 0}%{" "}
                {/* <APRPopOver mode="percentage" /> */}
              </h3>
            </div>
            <div>
              <UserBalanceInfo
                netWorth={data?.net_worth}
                netWorthWithCustomLogic={data?.net_worth}
                portfolioApr={data?.portfolioApr}
                claimableRewards={data?.claimableRewards}
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
    if (data) {
      setRenderContent(getRebalanceDom());
    } else {
      setRenderContent(getLoadingDom());
    }
  }, [data]);

  return renderContent;
};

export default RebalancerWidget;
