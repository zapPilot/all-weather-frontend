import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Layout, Affix, notification } from "antd";
import styles from "../styles/Home.module.css";
import HeaderInner from "./views/Header";
import "@flaticon/flaticon-uicons/css/brands/all.css";
import "@flaticon/flaticon-uicons/css/regular/all.css";
import ConfiguredConnectButton from "./ConnectButton";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import openNotificationWithIcon from "../utils/notification";

const { Header, Footer, Content } = Layout;
interface BasePageProps {
  children: React.ReactNode;
}

const BasePage: NextPage<BasePageProps> = ({ children }) => {
  const router = useRouter();

  const account = useActiveAccount();
  const [referees, setReferees] = useState([]);
  const [open, setOpen] = useState(false);
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  useEffect(() => {
    const addReferrer = async (currentInputValue: string) => {
      try {
        if (!account) return;
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_SDK_API_URL
          }/referral/${account.address.toLowerCase()}/referrer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              referrer: currentInputValue.toLowerCase(),
            }),
          },
        );
        const resp = await response.json();

        if (response.ok) {
          openNotificationWithIcon(
            notificationAPI,
            "Referral Program",
            "success",
            `Successfully add referrer ${currentInputValue.toLowerCase()}, happy earning`,
          );
        } else if (
          resp.status ===
          "Referrer Already Exists! Or Your referrer cannot be referred by you"
        ) {
          return;
        } else {
          openNotificationWithIcon(
            notificationAPI,
            "Referral Program",
            "error",
            `Failed: ${resp.error}`,
          );
        }
      } catch (error) {
        openNotificationWithIcon(
          notificationAPI,
          "Referral Program",
          "error",
          `Failed: ${error.message}`,
        );
      }
    };

    const referrerParam = router.query.referrer as string;
    if (router.isReady && referrerParam && account) {
      addReferrer(referrerParam);
    }
  }, [router.isReady, router.query.referrer, account]);
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
      {notificationContextHolder}
      <Layout style={{ background: "#000000" }}>
        <Affix offsetTop={0}>
          <Header className={`${styles.header} sm:h-24 h-auto`}>
            <div className="div-logo">
              <Link href="/">
                <Image src="/logo.png" alt="logo" width={40} height={40} />
              </Link>
            </div>
            <HeaderInner />
            <div className="connect-button">
              <ConfiguredConnectButton />
            </div>
          </Header>
        </Affix>

        <Content>
          <div>{children}</div>
        </Content>
        <Footer className={styles.footer}>
          {/* comment it for now */}
          {/* <a
            href="https://all-weather-protocol.webflow.io/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="fi fi-rr-home"></span>
          </a> */}
          <a
            href="https://all-weather-protocol.gitbook.io/all-weather-protocol"
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
