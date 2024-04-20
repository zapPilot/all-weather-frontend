import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import ThirdPartyPlugin from "./thirdPartyPlugin.jsx";
import { ThirdwebProvider } from "thirdweb/react";
import StoreProvider from "./StoreProvider.jsx";
const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ThirdwebProvider>
      <StoreProvider>
        <ThirdPartyPlugin />
        <Component {...pageProps} />
      </StoreProvider>
    </ThirdwebProvider>
  );
};
export default App
