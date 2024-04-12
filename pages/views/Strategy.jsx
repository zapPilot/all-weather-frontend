import React from "react";
import { useContext, useState, useEffect } from "react";
import { web3Context } from "./Web3DataProvider";
import { ConfigProvider, Image, Button, Spin } from "antd";
import RebalanceChart from "./RebalanceChart";
import { useWindowWidth } from "../../utils/chartUtils";

const columns = [
  {
    title: "Category",
    dataIndex: "category",
    key: "category",
    render: (text) => <span style={{ color: "#ffffff" }}>{text}</span>,
  },
  {
    title: "Target Weight",
    dataIndex: "weight",
    key: "weight",
    render: (weight) => {
      if (weight !== 0) {
        return <span style={{ color: "#ffffff" }}>{weight}%</span>;
      }
    },
  },
  {
    title: "Explanation",
    dataIndex: "explanation",
    key: "explanation",
    render: (explanation) => (
      <span style={{ color: "#ffffff" }}>{explanation}</span>
    ),
  },
  {
    title: "Examples",
    key: "examples",
    dataIndex: "examples",
    render: (_, { examples }) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto auto",
        }}
      >
        {examples.map((tokenSymbol, index) => {
          return (
            <span key={index}>
              <Image
                src={`tokenPictures/${tokenSymbol}.png`}
                height={20}
                width={20}
                alt={`${tokenSymbol}-token`}
              />
            </span>
          );
        })}
      </div>
    ),
  },
];

const Strategy = () => {
  const windowWidth = useWindowWidth();
  const WEB3_CONTEXT = useContext(web3Context);
  const [netWorth, setNetWorth] = useState(0);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);

  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (
        WEB3_CONTEXT !== undefined &&
        WEB3_CONTEXT.rebalanceSuggestions.length !== 0
      ) {
        setNetWorth(WEB3_CONTEXT.netWorth);
        setRebalanceSuggestions(WEB3_CONTEXT.rebalanceSuggestions);
      }
    }
    fetchPortfolioMetadata();
  }, [WEB3_CONTEXT]);

  if (rebalanceSuggestions.length === 0) {
    return <Spin size="large" />;
  }
  return (
    <>
      <Button type="primary" block>
        <a
          href="https://all-weather.gitbook.io/all-weather-protocol/investment-strategy/how-do-we-pick-cryptos"
          target="_blank"
        >
          Details
        </a>
      </Button>
      <p>
        Explanation: There are two layers in this pie chart because of the
        mapping from assets to categories. Please note that each asset may
        belong to multiple categories.
      </p>
      <RebalanceChart
        key="double_layer_pie_chart"
        rebalanceSuggestions={rebalanceSuggestions}
        netWorth={netWorth}
        windowWidth={windowWidth}
        showCategory={true}
      />
    </>
  );
};
export default Strategy;
