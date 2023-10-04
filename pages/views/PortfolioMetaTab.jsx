import React, { useContext, useState, useEffect } from "react";
import { Tabs } from "antd";
import Fees from "./Fees.jsx";
import Performance from "./Performance.jsx";
import Assets from "./Assets.jsx";
import { web3Context } from "./Web3DataProvider";

const TabWordings = [
  "Overview",
  "Performance",
  "Assets",
  "Fees",
  "Portfolio Composition & Strategy",
  "Risks",
  "Maintenance & Policies",
  "Depositors",
];

const PortfolioMetaTab = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [portfolioApr, setPortfolioApr] = useState(0);

  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT) {
        setPortfolioApr(
          WEB3_CONTEXT.portfolioApr === undefined
            ? 0
            : WEB3_CONTEXT.portfolioApr,
        );
      }
    }
    fetchPortfolioMetadata();
  }, [WEB3_CONTEXT, portfolioApr]);

  const tabs = TabWordings.map((wording, index) => ({
    label: wording,
    key: index,
    children: _getChildrenTab(wording, index, portfolioApr),
  }));

  return (
    <Tabs
      defaultActiveKey="0" // Adjusted to start with the first tab
      centered
      style={{ color: "white", marginRight: 15 }}
      items={tabs}
    />
  );
};

const _getChildrenTab = (wording, index, portfolioApr) => {
  if (index === 0) {
    // only shows the Pie Chart
    return;
  }
  if (wording === "Performance") {
    return <Performance portfolioApr={portfolioApr} />;
  } else if (wording === "Assets") {
    return <Assets />;
  } else if (wording === "Fees") {
    return <Fees />;
  }
};

export default PortfolioMetaTab;
