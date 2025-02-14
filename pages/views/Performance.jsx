import React from "react";
import { ConfigProvider, Row, Col, Card, Statistic } from "antd";
import RebalanceChart from "./RebalanceChart";
import { useWindowWidth } from "../../utils/chartUtils";
import APRDetails from "./APRrelated.jsx";
import { ReloadOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { timeAgo } from "../../utils/general";
import axios from "axios";
import {
  fetchDataStart,
  fetchDataSuccess,
  fetchDataFailure,
} from "../../lib/features/apiSlice";
import { useRouter } from "next/router";
import { useActiveAccount } from "thirdweb/react";
import HistoricalGenericDataChart from "./HistoricalGenericDataChart";

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

  const calculateMonthlyEarnings = (deposit, apr) => {
    if (isNaN(deposit) || isNaN(apr)) return 0;
    return ((deposit * apr) / 100 / 12).toFixed(2);
  };
  const colorLogic = (value, notSharpe = true) => {
    if (notSharpe === false) {
      if (value < 2) {
        return { color: "#FF6347" };
      } else if (value >= 2 && value < 3) {
        return { color: "yellow" };
      } else if (value >= 3) {
        return { color: "#FF6347" };
      }
    } else {
      return { color: value < 0 ? "#FF6347" : "#5DFDCB" };
    }
  };
  const fetchBundlePortfolio = (refresh) => {
    dispatch(fetchDataStart());
    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/bundle_portfolio/${
          searchWalletAddress === undefined
            ? walletAddress
            : searchWalletAddress
        }?refresh=${refresh}`,
      )
      .then((response) => response.data)
      .then((data) => {
        dispatch(fetchDataSuccess(data));
      })
      .catch((error) => dispatch(fetchDataFailure(error.toString())));
  };

  return (
    <>
      <ConfigProvider
        theme={{
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
        }}
      >
        <Row
          gutter={[
            {
              xs: 8,
              md: 16,
            },
            8,
          ]}
        >
          <Col xs={24} md={6}>
            <Card>
              <Statistic
                title="Reward APR of Your Portfolio"
                value={portfolioApr}
                precision={2}
                valueStyle={colorLogic(portfolioApr)}
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
                valueStyle={colorLogic(0)}
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
                valueStyle={colorLogic(0)}
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
                valueStyle={colorLogic(0)}
                prefix="$"
              />
            </Card>
          </Col>
          {/* <Col xs={12} md={8}>
            <Card>
              <Statistic
                title={
                  <>
                    <a href="https://www.pm-research.com/content/iijpormgmt/32/1/108">
                      SDR Sharpe Ratio
                    </a>{" "}
                    365 days
                  </>
                }
                value="WIP"
                precision={2}
                valueStyle={colorLogic(sharpeRatio["SDR Sharpe Ratio"], false)}
                suffix=""
              />
            </Card>
          </Col> */}
          {/* <Col xs={12} md={8}>
            <Card>
              <Statistic
                title="Beta"
                value="WIP"
                precision={2}
                valueStyle={colorLogic(-sharpeRatio["SDR Sharpe Ratio"], false)}
                suffix=""
              />
            </Card>
          </Col> */}
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
      {(account?.address || searchWalletAddress) && (
        <HistoricalGenericDataChart
          title="Historical Balances"
          apiUrl={`${process.env.NEXT_PUBLIC_SDK_API_URL}/balances/${
            searchWalletAddress === undefined
              ? walletAddress
              : searchWalletAddress
          }/history`}
          dataTransformCallback={(response) => response.json()}
          yLabel={"usd_value"}
          option="line"
        />
      )}
      {(account?.address || searchWalletAddress) && (
        <HistoricalGenericDataChart
          title="Daily Balance Change"
          apiUrl={`${process.env.NEXT_PUBLIC_SDK_API_URL}/balances/${
            searchWalletAddress === undefined
              ? walletAddress
              : searchWalletAddress
          }/history`}
          dataTransformCallback={async (response) => {
            const data = await response.json();
            // Configuration for outlier detection
            const STD_DEV_THRESHOLD = 1; // Number of standard deviations to use as threshold

            // Sort data by date
            data.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate daily differences first
            const dailyDifferences = data.map((entry, index) => {
              if (index === 0)
                return {
                  date: entry.date,
                  usd_value: 0,
                };

              return {
                date: entry.date,
                usd_value: entry.usd_value - data[index - 1].usd_value,
              };
            });

            const values = dailyDifferences
              .map((d) => d.usd_value)
              .filter((v) => v !== 0);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(
              values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) /
                values.length,
            );

            const threshold = STD_DEV_THRESHOLD * stdDev;
            const filteredDifferences = dailyDifferences.map((entry) => ({
              date: entry.date,
              usd_value:
                Math.abs(entry.usd_value - mean) > threshold
                  ? 0
                  : entry.usd_value,
            }));
            return filteredDifferences;
          }}
          yLabel={"usd_value"}
          option="column"
        />
      )}
      {data ? (
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
      ) : null}
      <div className="ps-4">
        <APRDetails />
      </div>
    </>
  );
};
export default Performance;
