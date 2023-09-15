import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import { useAccount } from "wagmi";
import styles from "../styles/Home.module.css";
import NavBar from "./views/NavBar.jsx";
import Header from "./views/Header";
import Web3DataProvider from "./views/Web3DataProvider";

import {
  HomeFilled,
  TwitterCircleFilled,
  AuditOutlined,
} from "@ant-design/icons";
interface BasePageProps {
  children: React.ReactNode;
}

const BasePage: NextPage<BasePageProps> = ({ children }) => {
  const { address } = useAccount();
  return (
    <div>
      <Head>
        <title>All Weather Protocol</title>
        <meta content="All Weather Protocol" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <Header>
        <NavBar />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ConnectButton />
        </div>
      </Header>
      <Web3DataProvider address={address}>
        <div>{children}</div>
      </Web3DataProvider>

      <footer className={styles.footer} style={{ color: "white" }}>
        <a
          href="https://all-weather.webflow.io/"
          rel="noopener noreferrer"
          target="_blank"
        >
          <HomeFilled />
          Landing Page
        </a>
        <a
          href="https://all-weather.gitbook.io/all-weather-protocol/"
          rel="noopener noreferrer"
          target="_blank"
        >
          <AuditOutlined />
          Documentation
        </a>
        <a
          href="https://twitter.com/all_weather_p"
          rel="noopener noreferrer"
          target="_blank"
        >
          <TwitterCircleFilled />
          Twitter
        </a>
        <a
          href="https://discord.gg/sNsMmtsCCV"
          rel="noopener noreferrer"
          target="_blank"
        >
          Discord
        </a>
      </footer>
    </div>
  );
};

export default BasePage;
