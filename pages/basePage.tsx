import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useAccount } from "wagmi";
import {
  Layout,
  Affix,
} from 'antd';
import styles from "../styles/Home.module.css";
import NavBar from "./views/NavBar.jsx";
import HeaderInner from "./views/Header";
import Web3DataProvider from "./views/Web3DataProvider";

import {
  HomeFilled,
  AuditOutlined,
  MenuOutlined,
} from "@ant-design/icons";

const { Header, Footer, Content } = Layout;
interface BasePageProps {
  children: React.ReactNode;
}

const BasePage: NextPage<BasePageProps> = ({ children }) => {
  const { address } = useAccount();
  const [menuShow, setMenuShow] = useState(false);
  const handleMenuShow = () => {
    setMenuShow(!menuShow);
 };

  return (
    <div>
      <Head>
        <title>All Weather Protocol: Biggest Liquidity Mining Index Fund</title>
        <meta content="All Weather Protocol" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <Layout
        style={{ background: '#000000' }}
      >
        <Affix offsetTop={0}>
          <Header className={styles.header}>
            <div className={styles.menuIcon}>
              <MenuOutlined onClick={handleMenuShow}/>
            </div>
            <HeaderInner>
              <div
                className={
                  menuShow
                  ? styles.menuBarShow
                  : styles.menuBar
                }
              >
                <NavBar />
              </div>
            </HeaderInner>
            <ConnectButton />
          </Header>
        </Affix>
        
        <Content>
          <Web3DataProvider address={address}>
            <div>{children}</div>
          </Web3DataProvider>
        </Content>
        <Footer className={styles.footer}>
          <a
            href="https://all-weather-portfolio.webflow.io/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              src="../socialIcon/home.png"
              alt="home"
            />
          </a>
          <a
            href="https://all-weather.gitbook.io/all-weather-protocol/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              src="../socialIcon/document.png"
              alt="document"
            />
          </a>
          <a
            href="https://twitter.com/all_weather_p"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              src="../socialIcon/twitterx.png"
              alt="twitter"
            />
          </a>
          <a
            href="https://discord.gg/sNsMmtsCCV"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              src="../socialIcon/discord.png"
              alt="discord"
            />
          </a>
        </Footer>
      </Layout>
    </div>
  );
};

export default BasePage;
