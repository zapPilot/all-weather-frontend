import React, { ReactElement } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/index.scss";
import { ThirdwebProvider } from "thirdweb/react";
import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "../lib/store";
import { RouterContext } from "next/dist/shared/lib/router-context";
import memoryRouter from "next-router-mock";

// Create a store for testing
const store = makeStore();

const MyApp = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <RouterContext.Provider value={memoryRouter}>
      <ThirdwebProvider>{children}</ThirdwebProvider>
    </RouterContext.Provider>
  </Provider>
);

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: MyApp, ...options });

export * from "@testing-library/react";
export { customRender as render };
