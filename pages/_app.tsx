import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { bscTestnet, bsc, arbitrum } from "wagmi/chains";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import type { AppProps } from "next/app";
import ThirdPartyPlugin from "./thirdPartyPlugin.js";

/* New API that includes Wagmi's createConfig and replaces getDefaultWallets and connectorsForWallets */
const config = getDefaultConfig({
  appName: "RainbowKit demo",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "",
  chains: [bsc, arbitrum, bscTestnet],
  transports: {
    [bsc.id]: http(),
  },
});

const queryClient = new QueryClient();

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ThirdPartyPlugin />
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
// function MyApp({ Component, pageProps }: AppProps) {
//   return (
//     <WagmiConfig config={wagmiConfig}>
//       <RainbowKitProvider chains={chains} theme={darkTheme()}>
//       </RainbowKitProvider>
//     </WagmiConfig>
//   );
// }

export default App;
