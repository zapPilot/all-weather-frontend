import React, { ReactElement } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import { ThirdwebProvider } from "thirdweb/react";
import { render, RenderOptions } from "@testing-library/react";

const MyApp = ({ children }: { children: React.ReactNode }) => (
  <ThirdwebProvider>
    {children}
  </ThirdwebProvider>
);

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: MyApp, ...options });

export * from "@testing-library/react";
export { customRender as render };