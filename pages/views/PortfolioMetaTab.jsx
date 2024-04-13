import React, { useContext, useState, useEffect } from "react";
import { ConfigProvider, Tabs } from "antd";
import Fees from "./Fees.jsx";
import Performance from "./Performance.jsx";
import Assets from "./Assets.jsx";
import Strategy from "./Strategy.jsx";
import Risks from "./Risks.jsx";
import Maintenance from "./Maintenance.jsx";
import useRebalanceSuggestions from "../../utils/rebalanceSuggestions";

const TabWordings = [
  "Performance",
  "Assets",
  "Fees",
  "Strategy",
  "Risks",
  "Maintenance",
];

const PortfolioMetaTab = () => {
  const [windowWidth, setWindowWidth] = useState(0);
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
  } else if (wording === "Assets") {
    return (
      <Assets
        web3Context={{
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
        }}
      />
    );
  } else if (wording === "Fees") {
    return <Fees />;
  } else if (wording === "Strategy") {
    return <Strategy  web3Context={{
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
    }}/>;
  } else if (wording === "Risks") {
    return <Risks />;
  } else if (wording === "Maintenance") {
    return <Maintenance />;
  }
};

export default PortfolioMetaTab;
