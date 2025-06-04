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
import { useEffect, memo, useCallback, useMemo } from "react";
import { useActiveAccount } from "thirdweb/react";
import openNotificationWithIcon from "../utils/notification";
import content from "../config/content";
import ChainDropdown from "../components/ChainDropdown";

const { Header, Footer, Content } = Layout;

interface ChainId {
  name: string;
  id?: number;
  blockExplorers?: Array<{ url: string }>;
}

interface BasePageProps {
  children: React.ReactNode;
  chainId?: ChainId;
  switchChain?: (chain: any) => void;
}

// Extract header component
const PageHeader = memo(function PageHeader({
  chainId,
  switchChain,
}: Pick<BasePageProps, "chainId" | "switchChain">) {
  return (
    <Affix offsetTop={0}>
      <Header className={`${styles.header} justify-between sm:h-24 h-auto`}>
        <div className="div-logo">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="logo"
              width={40}
              height={40}
              loading="lazy"
              quality={50}
              unoptimized={true}
            />
          </Link>
        </div>
        <HeaderInner />
        <div className="flex items-center gap-2">
          <ChainDropdown chainId={chainId} switchChain={switchChain} />
          <ConfiguredConnectButton />
        </div>
      </Header>
    </Affix>
  );
});

// Extract footer component
const PageFooter = memo(function PageFooter() {
  const socialLinks = useMemo(
    () => [
      {
        href: "https://all-weather-protocol.gitbook.io/",
        icon: "fi fi-rr-document",
        label: "Documentation",
      },
      {
        href: "https://twitter.com/all_weather_p",
        icon: "fi fi-brands-twitter-alt",
        label: "Twitter",
      },
      {
        href: "https://discord.gg/sNsMmtsCCV",
        icon: "fi fi-brands-discord",
        label: "Discord",
      },
    ],
    [],
  );

  return (
    <Footer className={styles.footer}>
      {socialLinks.map(({ href, icon, label }) => (
        <a
          key={href}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          aria-label={label}
        >
          <span className={icon}></span>
        </a>
      ))}
    </Footer>
  );
});

const BasePage: React.FC<BasePageProps> = memo(function BasePage({
  children,
  chainId,
  switchChain,
}) {
  const router = useRouter();
  const account = useActiveAccount();
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  const addReferrer = useCallback(
    async (currentInputValue: string) => {
      if (!account) return;

      try {
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
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        openNotificationWithIcon(
          notificationAPI,
          "Referral Program",
          "error",
          `Failed: ${errorMessage}`,
        );
      }
    },
    [account, notificationAPI],
  );

  useEffect(() => {
    const referrerParam = router.query.referrer as string;
    if (router.isReady && referrerParam && account) {
      addReferrer(referrerParam);
    }
  }, [router.isReady, router.query.referrer, account, addReferrer]);

  // Memoize head content
  const headContent = useMemo(
    () => (
      <Head>
        <title>{`Zap Pilot${
          content?.siteInfo?.tagline ? `: ${content.siteInfo.tagline}` : ""
        }`}</title>
        <meta content="Zap Pilot" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
    ),
    [],
  );

  return (
    <div>
      {headContent}
      {notificationContextHolder}
      <Layout style={{ background: "#000000" }}>
        <PageHeader chainId={chainId} switchChain={switchChain} />
        <Content>
          <div>{children}</div>
        </Content>
        <PageFooter />
      </Layout>
    </div>
  );
});

BasePage.displayName = "BasePage";

export default BasePage;
