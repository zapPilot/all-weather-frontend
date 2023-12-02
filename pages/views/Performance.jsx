import React from "react";
import { ConfigProvider, Row, Col, Card, Statistic } from "antd";
import HistoricalDataChart from "./HistoricalDataChart";

const Performance = ({ portfolioApr, sharpeRatio, ROI, maxDrawdown }) => {
  const colorLogic = (value, notSharpe = true) => {
    if (notSharpe === false) {
      if (value < 2) {
        return { color: "#e63a8b" };
      } else if (value >= 2 && value < 3) {
        return { color: "yellow" };
      } else if (value >= 3) {
        return { color: "#beed54" };
      }
    } else {
      return { color: value < 0 ? "#e63a8b" : "#beed54" };
    }
  };
  return ROI && ROI.days ? (
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
                title="Reward APR"
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
                title={`ROI (${ROI.days} days)`}
                value="WIP"
                precision={2}
                valueStyle={colorLogic(ROI.total)}
              />
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card>
              <Statistic
                title={`Sharpe Ratio (${sharpeRatio.days} days)`}
                value="WIP"
                precision={2}
                valueStyle={colorLogic(sharpeRatio.value)}
                suffix=""
              />
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card>
              <Statistic
                title={`MAX Drawdown (${ROI.days} days)`}
                value="WIP"
                precision={2}
                valueStyle={{ color: "#e63a8b" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card>
              <Statistic
                title={
                  <>
                    <a href="https://www.pm-research.com/content/iijpormgmt/32/1/108">
                      SDR Sharpe Ratio
                    </a>{" "}
                    ({sharpeRatio.days} days)
                  </>
                }
                value="WIP"
                precision={2}
                valueStyle={colorLogic(sharpeRatio["SDR Sharpe Ratio"], false)}
                suffix=""
              />
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card>
              <Statistic
                title="Beta"
                value="WIP"
                precision={2}
                valueStyle={colorLogic(-sharpeRatio["SDR Sharpe Ratio"], false)}
                suffix=""
              />
            </Card>
          </Col>
        </Row>
      </ConfigProvider>
      <p
        className="heading-subtitle"
        style={{
          margin: "32px 0",
        }}
      >
        Historical Reward APRs
      </p>
      <HistoricalDataChart />
    </>
  ) : (
    <></>
  );
};
export default Performance;
