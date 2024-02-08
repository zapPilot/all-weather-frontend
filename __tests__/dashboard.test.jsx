import { test, vi, expect } from "vitest";
import { render } from "./test-utils.tsx";
import { screen, fireEvent } from "@testing-library/react";
import Dashboard from "../pages/dashboard";
import { waitFor } from "@testing-library/dom";

/**
 * @vitest-environment jsdom
 */

const { useRouter, mockedRouterPush } = vi.hoisted(() => {
  const mockedRouterPush = vi.fn();
  return {
    useRouter: () => ({ push: mockedRouterPush }),
    mockedRouterPush,
  };
});

// vi.mock("next/navigation", async () => {
//   const actual = await vi.importActual("next/navigation");
//   return {
//     ...actual,
//     useRouter,
//   };
// });

test("Connect Wallet", async () => {
  // render(<Dashboard />);
  // const button = await screen.getAllByRole("button", {
  //   name: "Connect Wallet",
  // });
  // fireEvent.click(button[0]);
  // const modal = await screen.queryByRole("dialog");
  // expect(modal).not.toBeNull();
  // const metaMaskButton = screen.getAllByRole("button", { name: "Rainbow" });
  // expect(metaMaskButton).not.toBeNull();
});
