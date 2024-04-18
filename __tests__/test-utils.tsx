import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import { ThirdwebProvider } from "thirdweb/react";

const MyApp = ({ children }) => <ThirdwebProvider>{children}</ThirdwebProvider>;
