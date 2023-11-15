import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import HistoricalDataChart from "./HistoricalDataChart";

const Performance = ({ portfolioApr, sharpeRatio, ROI, maxDrawdown }) => {
  const colorLogic = (value, notSharpe = true) => {
    if (notSharpe === false) {
      if (value < 2) {
        return { color: "red" };
      } else if (value >= 2 && value < 3) {
        return { color: "yellow" };
      } else if (value >= 3) {
        return { color: "green" };
      }
    } else {
      return { color: value < 0 ? "red" : "green" };
    }
  };
  return ROI && ROI.days ? (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Card bordered={false}>
            <Statistic
              title="Reward APR"
              value={portfolioApr}
              precision={2}
              valueStyle={colorLogic(portfolioApr)}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false}>
            <Statistic
              title={`ROI (${ROI.days} days)`}
              value="WIP"
              precision={2}
              valueStyle={colorLogic(ROI.total)}
              // suffix="%"
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Card bordered={false}>
            <Statistic
              title={`Sharpe Ratio (${sharpeRatio.days} days)`}
              value="WIP"
              precision={2}
              valueStyle={colorLogic(sharpeRatio.value)}
              suffix=""
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false}>
            <Statistic
              title={`MAX Drawdown (${ROI.days} days)`}
              value="WIP"
              precision={2}
              valueStyle={{ color: "red" }}
              // suffix="%"
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Card bordered={false}>
            <Statistic
              title={
                <>
                  <a href="https://www.pm-research.com/content/iijpormgmt/32/1/108">
                    SDR Sharpe Ratio
                  </a>{" "}
                  ({sharpeRatio.days} days)
                </>
              }
              // value={sharpeRatio["SDR Sharpe Ratio"]}
              value="WIP"
              precision={2}
              valueStyle={colorLogic(sharpeRatio["SDR Sharpe Ratio"], false)}
              suffix=""
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false}>
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
      <h2>Historical Reward APRs</h2>
      <HistoricalDataChart />
    </>
  ) : (
    // loading
    <></>
  );
};
export default Performance;
