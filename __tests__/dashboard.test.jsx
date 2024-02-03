import { test, vi, expect } from "vitest";
import { render } from "./test-utils.tsx";
import { screen, fireEvent } from "@testing-library/react";
import Dashboard from "../pages/dashboard";
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

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useRouter,
  };
});

test("Dashboard", () => {
  render(<Dashboard />);
});

test("Connect Wallet", async () => {
  render(<Dashboard />);
  const button = screen.getAllByRole("button", { name: "Connect Wallet" });
  fireEvent.click(button[0]);
  const modal = screen.queryByRole("dialog");
  expect(modal).not.toBeNull();
  const metaMaskButton = screen.getAllByRole("button", { name: "MetaMask" });
  expect(metaMaskButton).not.toBeNull();
});
