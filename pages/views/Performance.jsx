import React from "react";
import { ConfigProvider, Row, Col, Card, Statistic } from "antd";
import RebalanceChart from "./RebalanceChart";
import { useSelector } from "react-redux";
import { useWindowWidth } from "../../utils/chartUtils";

const Performance = ({ portfolioApr, sharpeRatio, ROI, maxDrawdown }) => {
  const windowWidth = useWindowWidth();
  const { data } = useSelector((state) => state.api);
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
  return (
    <>
      <ConfigProvider
        theme={{
          components: {
            Statistic: {
              titleFontSize: 16,
            },
          },
          token: {
            colorBgContainer: "transparent",
            colorBorderSecondary: "#999999",
            colorTextDescription: "white",
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
          <Col xs={12} md={8}>
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
          <Col xs={12} md={8}>
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
          <Col xs={12} md={8}>
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
          <Col xs={12} md={8}>
            <Card>
              <Statistic
                title="Claimable Rewards"
                value={data?.claimable_rewards}
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
        showCategory={true}
        portfolio_apr={data?.portfolio_apr}
        color="white"
        wording="Your Portfolio Chart"
      />
    </>
  );
};
export default Performance;
