import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import { useAccount } from "wagmi";
import styles from "../styles/Home.module.css";
import ExampleUI from "./views/ExampleUI.jsx";
// import NavBar from "./views/Navbar.jsx";
import Header from "./views/Header";
import Web3DataProvider from "./views/Web3DataProvider";
import { HomeFilled, TwitterCircleFilled } from "@ant-design/icons";

const Home: NextPage = () => {
  const { address } = useAccount();
  return (
    <div>
      <Head>
        <title>All Weather Protocol</title>
        <meta content="All Weather Protocol" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <Header>
        {/* <NavBar /> */}
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
        <ExampleUI address={address} />
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

export default Home;
