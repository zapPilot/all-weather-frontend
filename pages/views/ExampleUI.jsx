import React from "react";
import { useEffect } from "react";
import APRDetails from "./APRrelated.jsx";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Row, Col, ConfigProvider } from "antd";
import Image from "next/image";
import { useWindowHeight } from "../../utils/chartUtils";
import styles from "../../styles/Home.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useActiveAccount } from "thirdweb/react";
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
import { timeAgo } from "../../utils/general";

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
  const router = useRouter();

  const { query } = router;
  const searchWalletAddress = query.address;

  useEffect(() => {
    if (Object.keys(strategyMetadata).length === 0) {
      dispatch(fetchStrategyMetadata());
    }
  }, []);
  useEffect(() => {
    if (!walletAddress) return;
    dispatch(walletAddressChanged({ walletAddress: walletAddress }));
  }, [account]);
  useEffect(() => {
    if (!walletAddress && !searchWalletAddress) return;
    fetchBundlePortfolio(false);
  }, [searchWalletAddress, walletAddress]);
  const fetchBundlePortfolio = (refresh) => {
    dispatch(fetchDataStart());
    axios
      .get(
        `${API_URL}/bundle_portfolio/${
          searchWalletAddress === undefined
            ? walletAddress
            : searchWalletAddress.toLowerCase().trim().replace("/", "")
        }?refresh=${refresh}`,
      )
      .then((response) => response.data)
      .then((data) => dispatch(fetchDataSuccess(data)))
      .catch((error) => dispatch(fetchDataFailure(error.toString())));
  };
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
              <h2 className="heading-subtitle">
                Your Intent-Driven Yield Aggregator
              </h2>
              <p className="heading-subtitle">Click Once, Diversify Forever!</p>
              <p className="heading-subtitle">
                Enjoy Up to
                <span
                  style={{ color: "#5DFDCB" }}
                  className="text-5xl tracking-tight"
                  data-testid="apr"
                >
                  {" "}
                  {strategyLoading ? (
                    <Spin />
                  ) : (
                    (strategyMetadata.portfolioAPR * 100)?.toFixed(2)
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
          {data ? (
            <>
              <span>
                Data updated <b>{timeAgo(data.last_updated)}</b> ago
              </span>
              <button
                type="button"
                className="rounded-full bg-indigo-600 p-1 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => fetchBundlePortfolio(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
              <br />
              <span className="text-sm text-gray-500">
                (quota: {data?.user_record_update_times_today.counts}/
                {data?.user_record_update_times_today.limit})
              </span>
            </>
          ) : null}
          <APRDetails />
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
