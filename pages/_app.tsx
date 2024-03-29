import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
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
import {
  ThirdwebProvider,
  smartWallet,
  embeddedWallet,
} from "@thirdweb-dev/react";

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
const activeChain = "optimism";
export const factoryAddress = "0xA4a0b37823a19541D0d2e049cC935E6398b5AB9F";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <ThirdwebProvider
            clientId={process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID}
            activeChain={activeChain}
            supportedWallets={[
              smartWallet(embeddedWallet(), {
                factoryAddress: factoryAddress,
                gasless: true,
              }),
            ]}
          >
            <ThirdPartyPlugin />
            <Component {...pageProps} />
          </ThirdwebProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
