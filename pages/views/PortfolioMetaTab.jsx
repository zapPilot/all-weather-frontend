import React, { useContext, useState, useEffect } from "react";
import { Tabs } from "antd";
import Fees from "./Fees.jsx";
import Performance from "./Performance.jsx";
import Assets from "./Assets.jsx";
import Strategy from "./Strategy.jsx";
import Risks from "./Risks.jsx";
import Maintenance from "./Maintenance.jsx";
import { web3Context } from "./Web3DataProvider";

const TabWordings = [
  "Performance",
  "Assets",
  "Fees",
  "Strategy",
  "Risks",
  "Maintenance",
];

const PortfolioMetaTab = () => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [sharpeRatio, setSharpeRatio] = useState({ days: 0, value: 0 });
  const [ROI, setROI] = useState({ days: 0, total: 0 });
  const [maxDrawdown, setMaxDrawdown] = useState(0);

  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT) {
        setPortfolioApr(
          WEB3_CONTEXT.portfolioApr === undefined
            ? 0
            : WEB3_CONTEXT.portfolioApr,
        );
        setSharpeRatio(
          WEB3_CONTEXT.sharpeRatio === undefined ? 0 : WEB3_CONTEXT.sharpeRatio,
        );
        setROI(WEB3_CONTEXT.ROI === undefined ? 0 : WEB3_CONTEXT.ROI);
        setMaxDrawdown(
          WEB3_CONTEXT.maxDrawdown === undefined ? 0 : WEB3_CONTEXT.maxDrawdown,
        );
      }
    }
    fetchPortfolioMetadata();
  }, [WEB3_CONTEXT, portfolioApr, sharpeRatio, ROI, maxDrawdown]);

  const tabs = TabWordings.map((wording, index) => ({
    label: wording,
    key: index,
    children: _getChildrenTab(
      wording,
      portfolioApr,
      sharpeRatio,
      ROI,
      maxDrawdown,
    ),
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

const _getChildrenTab = (
  wording,
  portfolioApr,
  sharpeRatio,
  ROI,
  maxDrawdown,
) => {
  if (wording === "Performance") {
    return (
      <Performance
        portfolioApr={portfolioApr}
        sharpeRatio={sharpeRatio}
        ROI={ROI}
        maxDrawdown={maxDrawdown}
      />
    );
  } else if (wording === "Assets") {
    return <Assets />;
  } else if (wording === "Fees") {
    return <Fees />;
  } else if (wording === "Strategy") {
    return <Strategy />;
  } else if (wording === "Risks") {
    return <Risks />;
  } else if (wording === "Maintenance") {
    return <Maintenance />;
  }
};

export default PortfolioMetaTab;
