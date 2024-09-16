import React from "react";
import { useEffect, useState } from "react";
import APRDetails from "./APRrelated.jsx";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Row, Col, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useWindowHeight } from "../../utils/chartUtils";
import styles from "../../styles/Home.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";
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
import { timeAgo } from "../../utils/general";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ExampleUI() {
  const [isHover, setIsHover] = useState(false);

  const handleMouseEnter = () => {
    setIsHover(true);
  };
  const handleMouseLeave = () => {
    setIsHover(false);
  };

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
    if (
      strategyMetadata === undefined ||
      Object.keys(strategyMetadata).length === 0
    ) {
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
                Your Intent Centric Yield Aggregator
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
                  {strategyLoading ||
                  isNaN(strategyMetadata["Stablecoin Vault"]?.portfolioAPR) ? (
                    <Spin />
                  ) : (
                    Math.max(
                      ...Object.values(strategyMetadata).map(
                        (strategy) => strategy.portfolioAPR * 100,
                      ),
                    )?.toFixed(2)
                  )}
                  %{" "}
                </span>
                APR
              </p>
              <Link href="/indexes">
                <Button
                  type="primary"
                  className={styles.btnInvest}
                  style={
                    isHover
                      ? { backgroundColor: "#5DFDCB", color: "#000000" }
                      : { backgroundColor: "transparent", color: "#5DFDCB" }
                  }
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  role="invest_now"
                >
                  Invest Now!
                </Button>
              </Link>
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
          <PortfolioMetaTab />
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
