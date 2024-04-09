import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import {
  useConnectionStatus,
  useWalletContext,
  useAddress,
} from "@thirdweb-dev/react";

import { Layout, Affix } from "antd";
import styles from "../styles/Home.module.css";
import HeaderInner from "./views/Header";
import "@flaticon/flaticon-uicons/css/brands/all.css";
import "@flaticon/flaticon-uicons/css/regular/all.css";
import { ConnectWallet } from "@thirdweb-dev/react";

const { Header, Footer, Content } = Layout;
interface BasePageProps {
  children: React.ReactNode;
}

const BasePage: NextPage<BasePageProps> = ({ children }) => {
  const connectionStatus = useConnectionStatus();
  const { isAutoConnecting } = useWalletContext();
  const address = useAddress();

  return (
    <div>
      <Head>
        <title>
          All Weather Protocol: An Omnichain Yield Aggregator with the Highest
          Yield
        </title>
        <meta content="All Weather Protocol" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <Layout style={{ background: "#000000" }}>
        <Affix offsetTop={0}>
          <Header className={styles.header}>
            <div className="div-logo">
              <Image src="/../logo.png" alt="logo" width={40} height={40} />
            </div>
            <HeaderInner />
            <div className="connect-button">
              <ConnectWallet theme={"light"} modalSize={"compact"} />
            </div>
          </Header>
        </Affix>

        <Content>
          <div>{children}</div>
        </Content>
        <Footer className={styles.footer}>
          <a
            href="https://all-weather-portfolio.webflow.io/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="fi fi-rr-home"></span>
          </a>
          <a
            href="https://all-weather.gitbook.io/all-weather-protocol/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="fi fi-rr-document"></span>
          </a>
          <a
            href="https://twitter.com/all_weather_p"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="fi fi-brands-twitter-alt"></span>
          </a>
          <a
            href="https://discord.gg/sNsMmtsCCV"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="fi fi-brands-discord"></span>
          </a>
        </Footer>
      </Layout>
    </div>
  );
};

export default BasePage;
