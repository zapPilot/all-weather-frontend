import { expect, describe, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "./test-utils.tsx";
import React from "react";
import TokenDropdownInput from "../pages/views/TokenDropdownInput";
import * as thirdwebReact from "thirdweb/react";

// Mock the thirdweb hooks
vi.mock("thirdweb/react", async () => {
  const actual = await vi.importActual("thirdweb/react");
  return {
    ...actual,
    useWalletBalance: vi.fn(),
    useActiveWalletChain: vi.fn(),
    useActiveAccount: vi.fn(),
  };
});

// Mock the NumericInput component
vi.mock("../pages/views/NumberInput", () => ({
  default: ({ placeholder, value, onChange }) => (
    <input
      data-testid="numeric-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("TokenDropdownInput Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the hooks with default values
    thirdwebReact.useActiveAccount.mockReturnValue({
      address: "0xmockaddress",
    });
    thirdwebReact.useActiveWalletChain.mockReturnValue({ id: 8453 }); // base chain
    thirdwebReact.useWalletBalance.mockReturnValue({
      data: { displayValue: "1.5" },
      isLoading: false,
    });
  });

  // Clean up after each test
  afterEach(() => {
    cleanup();
  });

  // Simplest possible test
  it("renders without crashing", () => {
    const { container } = render(
      <TokenDropdownInput
        selectedToken="ETH-0x0000000000000000000000000000000000000000"
        setSelectedToken={() => {}}
        setInvestmentAmount={() => {}}
        tokenPricesMappingTable={{ eth: 3000 }}
        mode="invest"
      />,
    );

    // Check that the component rendered something
    expect(container.firstChild).not.toBeNull();
    // Check for the Max button
    expect(screen.getByRole("button", { name: "Max" })).toBeInTheDocument();
  });

  // Test for loading state
  it("shows loading state when balance is loading", () => {
    thirdwebReact.useWalletBalance.mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { container } = render(
      <TokenDropdownInput
        selectedToken="ETH-0x0000000000000000000000000000000000000000"
        setSelectedToken={() => {}}
        setInvestmentAmount={() => {}}
        tokenPricesMappingTable={{ eth: 3000 }}
        mode="invest"
      />,
    );

    // Use container.querySelector instead of screen.getByTestId to limit the search scope
    const input = container.querySelector('[data-testid="numeric-input"]');
    expect(input).toHaveAttribute("placeholder", "Loading...");
  });
});
