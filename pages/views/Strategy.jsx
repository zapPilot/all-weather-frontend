//@ts-nocheck
// All code in this file will be ignored by the TypeScript compiler
import React from "react";
import { Button } from "antd";
import RebalanceChart from "./RebalanceChart";
import { useWindowWidth } from "../../utils/chartUtils";

const Strategy = ({ web3Context }) => {
  const windowWidth = useWindowWidth();
  const { rebalanceSuggestions, netWorth } = web3Context;
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
