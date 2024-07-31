import React from "react";
import { ConfigProvider, Row, Col, Card, Statistic } from "antd";
import RebalanceChart from "./RebalanceChart";
import { useSelector } from "react-redux";
import { useWindowWidth } from "../../utils/chartUtils";
import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";

const Performance = ({ portfolioApr, sharpeRatio, ROI, maxDrawdown }) => {
  const windowWidth = useWindowWidth();
  const { data } = useSelector((state) => state.api);
  const account = useActiveAccount();
  const [exchangeRates, setExchangeRates] = useState({});
  const [currency, setCurrenty] = useState("USD");
  const [currencyError, setCurrencyError] = useState(false);
  useEffect(() => {
    async function fetchExchangeRate() {
      fetch("https://api.exchangerate-api.com/v4/latest/USD", {
        // Replace with your API endpoint
        method: "GET",
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw response;
        })
        .then((data) => {
          setExchangeRates(data.rates);
        })
        .catch((error) => {
          setCurrencyError(error);
        });
    }
    const fetchCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        setCurrenty(data.currency);
      } catch (error) {
        setCurrencyError(true);
      }
    };
    fetchExchangeRate();
    fetchCountry();
  }, []);
  const calculateMonthlyEarnings = (deposit, apr, exchangeRate = 1) => {
    return (((deposit * apr) / 100 / 12) * exchangeRate).toFixed(2);
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
                value={`${data?.net_worth}`}
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
                value={
                  currencyError === false
                    ? calculateMonthlyEarnings(
                        data?.net_worth,
                        portfolioApr,
                        exchangeRates[currency],
                      )
                    : calculateMonthlyEarnings(data?.net_worth, portfolioApr)
                }
                precision={0}
                valueStyle={colorLogic(0)}
                prefix={`${currencyError === false ? currency : "USD"}`}
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
      {account ? (
        <RebalanceChart
          key="double_layer_pie_chart"
          rebalanceSuggestions={data?.suggestions}
          netWorth={data?.net_worth}
          windowWidth={windowWidth}
          showCategory={true}
          account={account}
          portfolio_apr={data?.portfolio_apr}
          color="white"
        />
      ) : null}
    </>
  );
};
export default Performance;
