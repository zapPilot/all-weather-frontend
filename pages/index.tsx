import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import { useAccount } from "wagmi";
import styles from "../styles/Home.module.css";
import ExampleUI from "./views/ExampleUI.jsx";
import Header from "./views/Header";
import Web3DataProvider from "./views/Web3DataProvider";

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
          All Weather Protocol
        </a>
      </footer>
    </div>
  );
};

export default Home;
