import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmergencyExitPanel from "../../components/tabs/EmergencyExitPanel";

vi.mock("antd", () => ({
  Alert: ({ message, description }) => (
    <section>
      <div>{message}</div>
      <div>{description}</div>
    </section>
  ),
  Button: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Checkbox: ({ children }) => <label>{children}</label>,
  Collapse: ({ items }) => (
    <div>
      {items.map((item) => (
        <section key={item.key}>
          {item.label}
          {item.children}
        </section>
      ))}
    </div>
  ),
  Input: (props) => <input {...props} />,
  Spin: () => <span>Sending</span>,
}));

vi.mock("../../pages/ConnectButton", () => ({
  default: () => <button>Connect</button>,
}));

const baseProps = {
  recipient: "0x1234567890123456789012345678901234567890",
  recipientError: false,
  validateRecipient: vi.fn(),
  handleEmergencyExit: vi.fn(),
  account: { address: "0xabc" },
  chainId: { name: "Optimism" },
};

afterEach(cleanup);

describe("EmergencyExitPanel batch states", () => {
  it("explains combined AA execution and isolated EOA execution", () => {
    render(<EmergencyExitPanel {...baseProps} />);

    expect(
      screen.getByText(/In AA mode, the app first tries to move everything/),
    ).toBeInTheDocument();
    expect(screen.getByText(/EOA mode continues to send/)).toBeInTheDocument();
  });

  it("shows when the combined exit falls back", () => {
    render(<EmergencyExitPanel {...baseProps} emergencyExitPhase="fallback" />);

    expect(
      screen.getByText("Combined exit failed — retrying positions separately"),
    ).toBeInTheDocument();
  });

  it("blocks per-row retry while a batch result is unknown", () => {
    render(
      <EmergencyExitPanel
        {...baseProps}
        emergencyExitPhase="unknown"
        emergencyExitStatus={{
          position: {
            label: "Position",
            status: "unknown",
            error: "Batch status is unknown.",
          },
        }}
      />,
    );

    expect(
      screen.getByText("The combined transaction status is unknown"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByText("Batch status is unknown.")).toBeInTheDocument();
  });
});
