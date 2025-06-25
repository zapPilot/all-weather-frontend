import "../styles/index.scss";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import ThirdPartyPlugin from "./thirdPartyPlugin.jsx";
import { ThirdwebProvider } from "thirdweb/react";
import StoreProvider from "./StoreProvider.jsx";
import WalletModeProvider from "./contextWrappers/WalletModeContext.jsx";
const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ThirdwebProvider>
      <StoreProvider>
        <WalletModeProvider>
          <ThirdPartyPlugin />
          <Component {...pageProps} />
        </WalletModeProvider>
      </StoreProvider>
    </ThirdwebProvider>
  );
};
export default App;
