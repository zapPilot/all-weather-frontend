import React, {ReactElement} from 'react'
import {render, RenderOptions} from '@testing-library/react'
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { arbitrum, bsc, bscTestnet, goerli } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import type { AppProps } from "next/app";

import ThirdPartyPlugin from "../pages/thirdPartyPlugin.jsx";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [bsc, bscTestnet, arbitrum],
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

const AllTheProviders = ({children}: {children: React.ReactNode}) => {
  return (
    <WagmiConfig config={wagmiConfig}>
    <RainbowKitProvider chains={chains} theme={darkTheme()}>
      {process.env.NODE_ENV !== 'test' && <ThirdPartyPlugin />}
        {children}
    </RainbowKitProvider>
  </WagmiConfig>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, {wrapper: AllTheProviders, ...options})

export * from '@testing-library/react'
export {customRender as render}