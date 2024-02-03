import { render } from "@testing-library/react";
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

const MyApp = ({ children }) => (
  <WagmiConfig config={wagmiConfig}>
    <RainbowKitProvider chains={chains} theme={darkTheme()}>
      {children}
    </RainbowKitProvider>
  </WagmiConfig>
);

// 一个辅助函数来渲染组件并提供必要的上下文
const customRender = (ui, options) =>
  render(ui, { wrapper: MyApp, ...options });

// 导出 customRender 以便在测试中使用
export * from "@testing-library/react";
export { customRender as render };
