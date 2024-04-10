import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import "../styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { bscTestnet, bsc, arbitrum } from "wagmi/chains";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { getDefaultConfig, connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { AppProps } from "next/app";
import ThirdPartyPlugin from "./thirdPartyPlugin.jsx";
/* New API that includes Wagmi's createConfig and replaces getDefaultWallets and connectorsForWallets */
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
      groupName: "Suggested",
      wallets: [rainbowWallet, metaMaskWallet, rabbyWallet],
    },
  ],
});

const queryClient = new QueryClient();
const App = ({ Component, pageProps }: AppProps) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <ThirdPartyPlugin />
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
export default App;
