import React, { useState } from 'react';
import { describe, it, vi, expect } from "vitest";
import { render, screen, fireEvent } from "./test-utils.tsx";
import BasePage from "../pages/basePage";

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

// mock the thirdweb react module
vi.mock("thirdweb/react", async () => {
  const actual = await vi.importActual("thirdweb/react");
  let currentAddress = null; // mock current address
  const mockUseActiveAccount = vi.fn(() => ({ address: currentAddress }));

  // mock ConnectButton component
  const ConnectButton = () => {
    // useState to store the button text
    const [buttonText, setButtonText] = useState("Connect Wallet");

    return (
      <button onClick={() => {
        currentAddress = "0x123456789abcdef"; // mock connect wallet address
        mockUseActiveAccount.mockReturnValue({ address: currentAddress });
        setButtonText(currentAddress || "Connect Wallet"); // update button text
      }}>
        {buttonText}
      </button>
    );
  };

  return {
    ...actual,
    useActiveAccount: mockUseActiveAccount,
    ConnectButton,
  };
});

describe("basePage Component", () => {
  it("Connect Wallet", async () => {
    render(<BasePage />);
    
    // check if the connect button is rendered
    const connectButton = screen.getByRole('button', { name: 'Connect Wallet' });
    fireEvent.click(connectButton);

    // check if the address is rendered
    const address = screen.getByText("0x123456789abcdef");
    expect(address).toBeInTheDocument();
  });
});
