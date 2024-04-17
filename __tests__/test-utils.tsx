import React, { ReactElement } from "react";
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
import { render, RenderOptions } from "@testing-library/react";

const MyApp = ({ children }: { children: React.ReactNode }) => (
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

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: MyApp, ...options });

export * from "@testing-library/react";
export { customRender as render };