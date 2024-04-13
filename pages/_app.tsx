import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import ThirdPartyPlugin from "./thirdPartyPlugin.jsx";
import {
  ThirdwebProvider,
  embeddedWallet,
  metamaskWallet,
  walletConnect,
  rainbowWallet,
  rabbyWallet,
} from "@thirdweb-dev/react";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ThirdwebProvider
      clientId={process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID}
      activeChain={"binance"}
      supportedWallets={[
        embeddedWallet({
          auth: {
            options: ["email", "google", "apple", "facebook"],
          },
        }),
        rabbyWallet(),
        rainbowWallet(),
        metamaskWallet(),
        walletConnect(),
      ]}
    >
      <ThirdPartyPlugin />
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
};
export default App;
