import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import {
  ThirdwebProvider,
  embeddedWallet,
  metamaskWallet,
  walletConnect,
  rainbowWallet,
  rabbyWallet,
} from "@thirdweb-dev/react";

const MyApp = ({ children }) => (
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
    {children}
  </ThirdwebProvider>
);
