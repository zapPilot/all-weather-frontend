import React from "react";
import { useEffect, useState } from "react";
import RebalancerWidget from "./Rebalancer";
import PortfolioMetaTab from "./PortfolioMetaTab";
import { Row, Col, ConfigProvider, Button } from "antd";
import Link from "next/link";
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
import { walletAddressChanged } from "../../lib/features/subscriptionSlice";
import axios from "axios";
import { Spin } from "antd";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ExampleUI() {
  const windowHeight = useWindowHeight();
  const [isHover, setIsHover] = useState(false);
  const handleMouseEnter = () => {
    setIsHover(true);
  };
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.api);
  const subscriptionStatus = useSelector(
    (state) => state.subscriptionStatus.subscriptionStatus,
  );
  const account = useActiveAccount();
  const walletAddress = account?.address.toLocaleLowerCase();

  useEffect(() => {
    if (!walletAddress) return;
    dispatch(walletAddressChanged({ walletAddress: walletAddress }));
    dispatch(fetchDataStart());
  }, [account]);

  useEffect(() => {
    if (subscriptionStatus) {
      axios
        .get(`${API_URL}/bundle_portfolio/${walletAddress}?refresh=true`)
        .then((response) => response.data)
        .then((data) => dispatch(fetchDataSuccess(data)))
        .catch((error) => dispatch(fetchDataFailure(error.toString())));
    }
  }, [subscriptionStatus]);

  const handleMouseLeave = () => {
    setIsHover(false);
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
              <Image src="../logo.png" alt="logo" width={100} height={100} />
              <h1
                style={{
                  marginBottom: 32,
                  color: "#5DFDCB",
                }}
                className="heading-title"
              >
                All Weather Protocol
              </h1>
              <h2 className="heading-subtitle">
                An AA Wallet-Based, Omnichain Index Fund
              </h2>
              <p className="heading-subtitle">Click Once, Diversify Forever!</p>
              <p className="heading-subtitle">
                Enjoy
                <span
                  style={{
                    color: "#5DFDCB",
                  }}
                  className="heading-title"
                >
                  {" "}
                  {loading ? (
                    <Spin />
                  ) : (
                    data?.portfolio_apr && `${data.portfolio_apr.toFixed(2)}%`
                  )}{" "}
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
                <Link href="#zapSection">
                  <Button
                    type="primary"
                    loading={data?.portfolio_apr === 0 ? true : false}
                    className={styles.btnInvest}
                    style={
                      isHover
                        ? { backgroundColor: "#5DFDCB", color: "#000000" }
                        : { backgroundColor: "transparent", color: "#5DFDCB" }
                    }
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    Invest Now!
                  </Button>
                </Link>
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
          {subscriptionStatus ? (
            <RebalancerWidget />
          ) : (
            <>
              <h3 className="text-base font-semibold leading-5">
                Please subscribe to access your personal profile.
              </h3>
              <div className="my-5">
                <Link
                  href="/subscription"
                  className="px-2 py-1 rounded ring-1 ring-inset ring-emerald-400 text-sm font-semibold leading-6 text-emerald-400 "
                >
                  Subscribe <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
