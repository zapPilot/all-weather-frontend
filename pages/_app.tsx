// import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import type { AppProps } from "next/app";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import {
  arbitrum,
  goerli,
  mainnet,
  optimism,
  polygon,
  zora,
  arbitrumGoerli,
} from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    arbitrum,
    arbitrumGoerli,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true" ? [goerli] : []),
  ],
  [publicProvider()],
);

const { connectors } = getDefaultWallets({
  appName: "RainbowKit App",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} theme={darkTheme()}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default MyApp;
