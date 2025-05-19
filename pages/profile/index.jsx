import React from "react";
import { useEffect } from "react";
import PortfolioMetaTab from "../views/PortfolioMetaTab.jsx";
import { Row, Col } from "antd";
import BasePage from "../basePage";
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
import { useRouter } from "next/router";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ExampleUI() {
  const dispatch = useDispatch();
  const account = useActiveAccount();
  const walletAddress = account?.address.toLocaleLowerCase();
  const router = useRouter();

  const { query } = router;
  const searchWalletAddress = query.address;

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
    <BasePage>
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
              span: 18,
              offset: 3,
            }}
          >
            <PortfolioMetaTab />
          </Col>
        </Row>
      </div>
    </BasePage>
  );
}
