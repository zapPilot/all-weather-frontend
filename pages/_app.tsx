import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import ThirdPartyPlugin from "./thirdPartyPlugin.jsx";
import { ThirdwebProvider } from "thirdweb/react";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ThirdwebProvider>
      <ThirdPartyPlugin />
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
};
export default App;
