import React from "react";
import { ConfigProvider, Row, Col, Card, Statistic } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useActiveAccount } from "thirdweb/react";
import axios from "axios";
import { CHART_CONFIGS } from "./Charts/chartConfig";
import RebalanceChart from "./RebalanceChart";
import APRDetails from "./APRrelated.jsx";
import HistoricalGenericDataChart from "./Charts/HistoricalGenericDataChart.jsx";
import { useWindowWidth } from "../../utils/chartUtils";
import { timeAgo } from "../../utils/general";
import {
  fetchDataStart,
  fetchDataSuccess,
  fetchDataFailure,
} from "../../lib/features/apiSlice";

const getBalanceHistoryUrl = (searchWalletAddress, walletAddress) =>
  `${process.env.NEXT_PUBLIC_SDK_API_URL}/balances/${
    searchWalletAddress === undefined ? walletAddress : searchWalletAddress
  }/history`;

const getBundlePortfolioUrl = (searchWalletAddress, walletAddress) =>
  `${process.env.NEXT_PUBLIC_API_URL}/bundle_portfolio/${
    searchWalletAddress === undefined ? walletAddress : searchWalletAddress
  }`;

// Enhanced Chart Component
const ChartWithConfig = ({ chartId, searchWalletAddress, walletAddress }) => {
  const config = CHART_CONFIGS[chartId];
  if (!config) return null;

  return (
    <HistoricalGenericDataChart
      title={config.title}
      apiUrl={getBalanceHistoryUrl(searchWalletAddress, walletAddress)}
      dataTransformCallback={async (response) => {
        const transformedData = await config.dataTransform(response);
        return transformedData;
      }}
      yLabel={config.yLabel}
      option={config.option}
    />
  );
};

// Styling Functions
const getColorStyle = (value, notSharpe = true) => {
  if (!notSharpe) {
    if (value < 2) return { color: "#FF6347" };
    if (value >= 2 && value < 3) return { color: "yellow" };
    return { color: "#FF6347" };
  }
  return { color: value < 0 ? "#FF6347" : "#5DFDCB" };
};

const calculateMonthlyEarnings = (deposit, apr) => {
  if (isNaN(deposit) || isNaN(apr)) return 0;
  return ((deposit * apr) / 100 / 12).toFixed(2);
};

// Main Component
const Performance = ({ portfolioApr }) => {
  const windowWidth = useWindowWidth();
  const { data } = useSelector((state) => state.api);
  const dispatch = useDispatch();
  const router = useRouter();
  const { query } = router;
  const searchWalletAddress = query.address
    ?.toLowerCase()
    ?.trim()
    ?.replace("/", "");
  const account = useActiveAccount();
  const walletAddress = account?.address;

  const fetchBundlePortfolio = async (refresh = false) => {
    dispatch(fetchDataStart());
    try {
      const response = await axios.get(
        `${getBundlePortfolioUrl(
          searchWalletAddress,
          walletAddress,
        )}?refresh=${refresh}`,
      );
      dispatch(fetchDataSuccess(response.data));
    } catch (error) {
      dispatch(fetchDataFailure(error.toString()));
    }
  };

  // Theme Configuration
  const themeConfig = {
    components: {
      Statistic: {
        titleFontSize: 14,
      },
    },
    token: {
      colorBgContainer: "rgb(31, 41, 55)",
      colorBorderSecondary: "transparent",
      colorTextDescription: "white",
      borderRadiusLG: "0",
    },
  };

  const shouldShowCharts = account?.address || searchWalletAddress;

  return (
    <>
      <ConfigProvider theme={themeConfig}>
        <Row gutter={[{ xs: 8, md: 16 }, 8]}>
          <Col xs={24} md={6}>
            <Card>
              <Statistic
                title="Reward APR of Your Portfolio"
                value={portfolioApr}
                precision={2}
                valueStyle={getColorStyle(portfolioApr)}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card>
              <Statistic
                title="Net Worth"
                value={data?.net_worth}
                precision={0}
                valueStyle={getColorStyle(0)}
                prefix="$"
              />
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card>
              <Statistic
                title="Monthly Interest"
                value={calculateMonthlyEarnings(data?.net_worth, portfolioApr)}
                precision={0}
                valueStyle={getColorStyle(0)}
                prefix="$"
              />
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card>
              <Statistic
                title="Claimable Rewards"
                value={data?.claimable_rewards?.toFixed(2)}
                precision={2}
                valueStyle={getColorStyle(0)}
                prefix="$"
              />
            </Card>
          </Col>
        </Row>
      </ConfigProvider>

      <RebalanceChart
        key="double_layer_pie_chart"
        rebalanceSuggestions={data?.suggestions}
        netWorth={data?.net_worth}
        windowWidth={windowWidth}
        portfolio_apr={data?.portfolio_apr}
        color="white"
        wording="Your Portfolio Chart"
      />

      {shouldShowCharts && (
        <>
          <ChartWithConfig
            chartId="historicalBalances"
            searchWalletAddress={searchWalletAddress}
            walletAddress={walletAddress}
          />
          <ChartWithConfig
            chartId="dailyPnL"
            searchWalletAddress={searchWalletAddress}
            walletAddress={walletAddress}
          />
          <ChartWithConfig
            chartId="dailyROI"
            searchWalletAddress={searchWalletAddress}
            walletAddress={walletAddress}
          />
        </>
      )}

      {data && (
        <div className="mt-4 ps-4">
          <h4 className="text-xl font-semibold text-white">
            Current Portfolio Status Update
          </h4>
          <div className="flex items-center my-1">
            <span>
              Data updated <b>{timeAgo(data.last_updated)}</b> ago
            </span>
            <button
              type="button"
              className="ms-2 rounded-full p-1 text-white shadow-sm"
              style={{ backgroundColor: "#5DFDCB" }}
              onClick={() => fetchBundlePortfolio(true)}
            >
              <ReloadOutlined className="h-5 w-5 justify-center text-black" />
            </button>
          </div>
          <span className="text-sm text-gray-500">
            (quota: {data?.user_record_update_times_today.counts}/
            {data?.user_record_update_times_today.limit})
          </span>
        </div>
      )}

      <div className="ps-4">
        <APRDetails />
      </div>
    </>
  );
};

export default Performance;
