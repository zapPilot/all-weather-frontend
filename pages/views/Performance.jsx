import React from "react";
import { ConfigProvider, Row, Col, Card, Statistic } from "antd";
const Performance = ({ portfolioApr, sharpeRatio, ROI, maxDrawdown }) => {
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
                title={`ROI (365 days)`}
                value="WIP"
                precision={2}
                valueStyle={colorLogic(0)}
              />
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card>
              <Statistic
                title={`Sharpe Ratio (365 days)`}
                value="WIP"
                precision={2}
                valueStyle={colorLogic(0)}
                suffix=""
              />
            </Card>
          </Col>
          {/* <Col xs={12} md={8}>
            <Card>
              <Statistic
                title={`MAX Drawdown (365 days)`}
                value="WIP"
                precision={2}
                valueStyle={{ color: "#FF6347" }}
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
                    365 days
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
          </Col> */}
        </Row>
      </ConfigProvider>
    </>
  );
};
export default Performance;
