import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SocialShareModal from "../../components/modals/SocialShareModal";

// Mock Modal component to avoid portal issues in tests
vi.mock("antd", () => ({
  Modal: ({ children, open }) =>
    open ? <div data-testid="modal">{children}</div> : null,
  Button: ({ children, onClick, icon }) => (
    <button onClick={onClick}>
      {icon}
      {children}
    </button>
  ),
}));

beforeEach(() => {
  cleanup();
});

describe("SocialShareModal ETH Enhancement", () => {
  const mockConversionData = {
    totalValue: 127.43,
    tokenCount: 23,
    transactionHash: "0x123...abc",
    explorerUrl: "https://etherscan.io",
    ethAmount: 0.041234,
  };

  it("should display ETH conversion amount in summary", () => {
    render(
      <SocialShareModal
        visible={true}
        onClose={() => {}}
        conversionData={mockConversionData}
      />,
    );

    // Check that modal is visible
    expect(screen.getByTestId("modal")).toBeInTheDocument();

    // Check that ETH amount is displayed
    expect(screen.getByText(/0.041234 ETH/)).toBeInTheDocument();

    // Check that USD value is still prominent
    expect(screen.getByText("$127.43")).toBeInTheDocument();

    // Check updated subtext
    expect(screen.getByText(/Dust cleanup complete/)).toBeInTheDocument();
  });

  it("should handle missing ethAmount gracefully", () => {
    const dataWithoutEth = {
      totalValue: 127.43,
      tokenCount: 23,
      transactionHash: "0x123...abc",
      explorerUrl: "https://etherscan.io",
      // ethAmount missing
    };

    render(
      <SocialShareModal
        visible={true}
        onClose={() => {}}
        conversionData={dataWithoutEth}
      />,
    );

    // Should default to 0.0000 ETH when ethAmount is missing
    expect(screen.getByText(/0.0000 ETH/)).toBeInTheDocument();
  });

  it("should format small ETH amounts correctly", () => {
    const smallEthData = {
      ...mockConversionData,
      ethAmount: 0.00000123,
    };

    render(
      <SocialShareModal
        visible={true}
        onClose={() => {}}
        conversionData={smallEthData}
      />,
    );

    // Should show 8 decimal places for very small amounts
    expect(screen.getByText(/0.00000123 ETH/)).toBeInTheDocument();
  });

  it("should include share buttons", () => {
    const { container } = render(
      <SocialShareModal
        visible={true}
        onClose={() => {}}
        conversionData={mockConversionData}
      />,
    );

    // Use container.querySelector to avoid multiple element issues
    const twitterButton = container.querySelector("button");
    expect(twitterButton).toBeInTheDocument();
    expect(container.textContent).toContain("Share on Twitter/X");
    expect(container.textContent).toContain("Share on Farcaster");
  });
});
