import React, { useState, useEffect } from "react";
import { ConfigProvider, Tabs } from "antd";
import Fees from "./Fees.jsx";
import Performance from "./Performance.jsx";
import Strategy from "./Strategy.jsx";
import Risks from "./Risks.jsx";
import { useSelector } from "react-redux";

const TabWordings = ["Performance", "Fees", "Strategy", "Risks"];

const PortfolioMetaTab = () => {
  const [windowWidth, setWindowWidth] = useState(0);
  const { data } = useSelector((state) => state.api);

  useEffect(() => {
    const updateWindowWidth = () => {
      if (typeof window !== "undefined") {
        setWindowWidth(window.innerWidth);
      }
    };

    updateWindowWidth();
  }, []);

  const tabs = TabWordings.map((wording, index) => ({
    label: wording,
    key: index,
    children: _getChildrenTab(wording, {
      netWorth: data?.net_worth,
      netWorthWithCustomLogic: data?.netWorthWithCustomLogic,
      suggestions: data?.suggestions,
      totalInterest: data?.totalInterest,
      portfolioApr: data?.portfolioApr,
      sharpeRatio: data?.sharpeRatio,
      topNLowestAprPools: data?.topNLowestAprPools,
      topNPoolConsistOfSameLpToken: data?.topNPoolConsistOfSameLpToken,
      topNStableCoins: data?.topNStableCoins,
      aggregatedPositions: data?.aggregatedPositions,
      ROI: data?.ROI,
      maxDrawdown: data?.maxDrawdown,
      claimableRewards: data?.claimableRewards,
    }),
  }));

  return (
    <ConfigProvider
      theme={{
        components: {
          Tabs: {
            inkBarColor: "#5DFDCB",
            itemActiveColor: "#5DFDCB",
            itemHoverColor: "#5DFDCB",
            itemSelectedColor: "#5DFDCB",
            horizontalItemGutter: 40,
          },
        },
        token: {
          colorText: "#ffffff",
        },
      }}
    >
      <Tabs
        defaultActiveKey="0" // Adjusted to start with the first tab
        centered={windowWidth < 767 ? false : true}
        items={tabs}
      />
    </ConfigProvider>
  );
};

const _getChildrenTab = (
  wording,
  {
    netWorth,
    netWorthWithCustomLogic,
    suggestions,
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
  },
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
  } else if (wording === "Fees") {
    return <Fees />;
  } else if (wording === "Strategy") {
    return (
      <Strategy
        web3Context={{
          netWorth,
          netWorthWithCustomLogic,
          suggestions,
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
        }}
      />
    );
  } else if (wording === "Risks") {
    return <Risks />;
  }
};

export default PortfolioMetaTab;
