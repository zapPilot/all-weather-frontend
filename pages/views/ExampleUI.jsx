import React, { use } from "react";
import { useEffect } from "react";
import RebalancerWidget from "./Rebalancer";
import { convertPortfolioStrategyToChartData } from "./RebalanceChart.jsx";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Row, Col, ConfigProvider } from "antd";
import Image from "next/image";
import { useWindowHeight } from "../../utils/chartUtils";
import styles from "../../styles/Home.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useActiveAccount } from "thirdweb/react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import {
  fetchDataStart,
  fetchDataSuccess,
  fetchDataFailure,
} from "../../lib/features/apiSlice";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { walletAddressChanged } from "../../lib/features/subscriptionSlice";
import axios from "axios";
import { Spin } from "antd";
import { useRouter } from "next/router";
import RoutesPreview from "../RoutesPreview/index.tsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ExampleUI() {
  const windowHeight = useWindowHeight();
  const dispatch = useDispatch();
  const { data, loading } = useSelector((state) => state.api);
  const account = useActiveAccount();
  const walletAddress = account?.address.toLocaleLowerCase();
  const { strategyMetadata, strategyLoading, error } = useSelector(
    (state) => state.strategyMetadata,
  );
  const portfolioHelper = React.useMemo(
    () => getPortfolioHelper("AllWeatherPortfolio"),
    [],
  );
  const router = useRouter();

  const { query } = router;
  const searchWalletAddress = query.address;

  useEffect(() => {
    dispatch(fetchStrategyMetadata());
  }, []);
  useEffect(() => {
    if (!walletAddress) return;
    dispatch(walletAddressChanged({ walletAddress: walletAddress }));
  }, [account]);
  useEffect(() => {
    if (!walletAddress && !searchWalletAddress) return;
    dispatch(fetchDataStart());
    axios
      .get(
        `${API_URL}/bundle_portfolio/${
          searchWalletAddress === undefined
            ? walletAddress
            : searchWalletAddress.toLowerCase().trim().replace("/", "")
        }?refresh=true`,
      )
      .then((response) => response.data)
      .then((data) => dispatch(fetchDataSuccess(data)))
      .catch((error) => dispatch(fetchDataFailure(error.toString())));
  }, [searchWalletAddress, walletAddress]);
  useEffect(() => {
    if (strategyMetadata && !strategyLoading) {
      portfolioHelper.reuseFetchedDataFromRedux(strategyMetadata);
    }
  }, [strategyMetadata, strategyLoading, portfolioHelper]);

  return (
    <div className={styles.divInstallment}>
      <Row
        gutter={{
          xs: 8,
          md: 16,
        }}
      >
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 20,
            offset: 2,
          }}
          className={styles.bgStyle}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: windowHeight,
            }}
          >
            <center>
              <Image src="/logo.png" alt="logo" width={100} height={100} />
              <h1
                style={{ color: "#5DFDCB" }}
                className="text-5xl tracking-tight mb-8"
              >
                All Weather Protocol
              </h1>
              <h2 className="heading-subtitle">Your Web3 S&P 500</h2>
              <p className="heading-subtitle">Click Once, Diversify Forever!</p>
              <p className="heading-subtitle">
                Enjoy
                <span
                  style={{ color: "#5DFDCB" }}
                  className="text-5xl tracking-tight"
                  data-testid="apr"
                >
                  {" "}
                  {strategyLoading ? (
                    <Spin />
                  ) : (
                    convertPortfolioStrategyToChartData(
                      portfolioHelper,
                    )[1].toFixed(2)
                  )}
                  %{" "}
                </span>
                APR
              </p>
              <ConfigProvider
                theme={{
                  token: {
                    colorPrimary: "#5DFDCB",
                    colorPrimaryBorder: "#5DFDCB",
                  },
                }}
              >
                <RoutesPreview
                  portfolioName="AllWeatherPortfolio"
                  role="portfolio_in_transaction_preview"
                />
              </ConfigProvider>
            </center>
          </div>
        </Col>
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 18,
            offset: 3,
          }}
        >
          <center>
            <PortfolioMetaTab />
          </center>
        </Col>
        <Col
          xs={{
            span: 24,
            offset: 0,
          }}
          md={{
            span: 10,
            offset: 7,
          }}
        >
          <RebalancerWidget />
          {/* TODO(david): Use this historical chart to track portfolio's APR */}
          {/* {subscriptionStatus ? (
            <>
              <p
                className="heading-subtitle"
                style={{
                  margin: "32px 0",
                }}
              >
                Historical Reward
              </p>
              <HistoricalDataChart />
            </>
          ) : (
            <SubscribeWording />
          )} */}
        </Col>
      </Row>
    </div>
  );
}
