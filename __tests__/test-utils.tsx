import { render } from "@testing-library/react";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { bscTestnet, bsc, arbitrum } from "wagmi/chains";
import {
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
  rabbyWallet,
} from '@rainbow-me/rainbowkit/wallets';

const config = getDefaultConfig({
  appName: "RainbowKit demo",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "",
  chains: [bsc, arbitrum, bscTestnet],
  transports: {
    [bsc.id]: http(),
    [arbitrum.id]: http(),
    [bscTestnet.id]: http(),
  },
  wallets: [
    {
      groupName: 'Suggested',
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        walletConnectWallet,
        rabbyWallet,
      ],
    },
  ],
});

const queryClient = new QueryClient();

const MyApp = ({ children }) => (
  <WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <RainbowKitProvider theme={darkTheme()}>
      {children}
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>
);

// 一个辅助函数来渲染组件并提供必要的上下文
const customRender = (ui, options) =>
  render(ui, { wrapper: MyApp, ...options });

// 导出 customRender 以便在测试中使用
export * from "@testing-library/react";
export { customRender as render };
