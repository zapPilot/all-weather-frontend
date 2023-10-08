import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import HistoricalDataChart from "./HistoricalDataChart";

const Performance = ({ portfolioApr }) => (
  <>
    <Row gutter={16}>
      <Col span={12}>
        <Card bordered={false}>
          <Statistic
            title="Reward APR"
            value={portfolioApr}
            precision={2}
            valueStyle={{
              color: "#3f8600",
            }}
            suffix="%"
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card bordered={false}>
          <Statistic
            title="Sharpe Ratio"
            value="? (WIP)"
            precision={2}
            valueStyle={{
              color: "#cf1322",
            }}
          />
        </Card>
      </Col>
    </Row>
    <center>
      <HistoricalDataChart />
    </center>

    {/* </Row> */}
  </>
);
export default Performance;
