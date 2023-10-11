import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import HistoricalDataChart from "./HistoricalDataChart";

const Performance = ({ portfolioApr, sharpeRatio, ROI, maxDrawdown }) => {
  const colorLogic = (value) => ({
    color: value < 0 ? "#cf1322" : "#3f8600",
  });
  return (
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
              value={(ROI.total * 100).toFixed(2)}
              precision={2}
              valueStyle={colorLogic(ROI.total)}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Card bordered={false}>
            <Statistic
              title={`Sharpe Ratio (${sharpeRatio.days} days)`}
              value={sharpeRatio.value}
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
              value={(maxDrawdown * 100).toFixed(2)}
              precision={2}
              valueStyle={{ color: "#cf1322" }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
      <h2>Historical Reward APRs</h2>
      <HistoricalDataChart />
    </>
  );
};
export default Performance;
