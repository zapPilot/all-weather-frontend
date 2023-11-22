// import suggestions from "./suggestions.json";
import { Spin, Row, Col } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import RebalanceChart from "./RebalanceChart";
import ZapInButton from "./ZapInButton";
import ZapOutButton from "./ZapOutButton";
import APRPopOver from "./APRPopOver";
import UserBalanceInfo from "./UserBalanceInfo";
import { useWindowWidth } from "../../utils/chartUtils";
import { useEffect, useContext, useState } from "react";
import { web3Context } from "./Web3DataProvider";

const RebalancerWidget = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [netWorth, setNetWorth] = useState(0);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const [totalInterest, setTotalInterest] = useState(0);
  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT !== undefined) {
        setPortfolioApr(WEB3_CONTEXT.portfolioApr);
        setNetWorth(WEB3_CONTEXT.netWorth);
        setRebalanceSuggestions(WEB3_CONTEXT.rebalanceSuggestions);
        setTotalInterest(WEB3_CONTEXT.totalInterest);
      }
    }
    fetchPortfolioMetadata();
  }, [WEB3_CONTEXT]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (netWorth > 0) {
      setIsLoading(false);
    }
  }, [netWorth]);

  const windowWidth = useWindowWidth();
  const divSpin = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "15rem",
  }

  if (isLoading) {
    return (
      <div style={divSpin}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <div id="zapSection">
        <RebalanceChart
          rebalanceSuggestions={rebalanceSuggestions}
          netWorth={netWorth}
          windowWidth={windowWidth}
          showCategory={false}
        />
        <div>
          <div>
            <p>Current Strategy: Permanent Portfolio</p>
            <p>
              TVL: ${netWorth.toFixed(2)}{" "}
              <a
                href="https://debank.com/bundles/136612/portfolio"
                target="_blank"
              >
                <LinkOutlined />
              </a>
            </p>
            <p>Data updated 5mins ago</p>
            <p>
              Reward APR: {portfolioApr ? portfolioApr.toFixed(2) : 0}%{" "}
              <APRPopOver mode="percentage" />
            </p>
          </div>
          <div>
            <UserBalanceInfo tvl={netWorth} />
            <p>Monthly Interest: ${(totalInterest / 12).toFixed(2)}</p>
          </div>
          <div>
            <ZapInButton />
            <ZapOutButton />
            <APRPopOver mode="price" />
          </div>
        </div>
      </div>
    </>
  );
};

export default RebalancerWidget;
