import { describe, it, vi, expect } from "vitest";
import { render, screen, waitFor, fireEvent } from "./test-utils.tsx";
import BasePage from "../pages/basePage";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import THIRDWEB_CLIENT from "../utils/thirdweb";
import { arbitrum, optimism } from "thirdweb/chains";

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

// mock the thirdweb provider
vi.mock("thirdweb/react", async () => {
  const actual = await vi.importActual("thirdweb/react");
  return {
    ...actual,
    ThirdwebProvider: ({ children }) => <div>{children}</div>,
    ConnectButton: () => <button>Connect Wallet</button>,
    useActiveAccount: () => ({ address: "0x123456789abcdef" }),
  };
});

const WALLETS = [
  createWallet("io.rabby"),
  createWallet("me.rainbow"),
  createWallet("io.metamask"),
  createWallet("app.phantom"),
  walletConnect(),
  inAppWallet({
    auth: {
      options: ["email", "google", "apple", "facebook"],
    },
  }),
];

describe("basePage Component", () => {
  const account = useActiveAccount();

  it("Connect Wallet", async () => {
    render(
      <ThirdwebProvider>
        <BasePage>
          <>
            <ConnectButton
              client={THIRDWEB_CLIENT}
              autoConnect={true}
              wallets={WALLETS}
              theme={"light"}
              connectModal={{ size: "compact" }}
              chains={[arbitrum, optimism]}
              accountAbstraction={{
                chain: arbitrum,
                // sponsorGas: true,
                sponsorGas: false,
              }}
            />
            <p>{account?.address}</p>
          </>
        </BasePage>
      </ThirdwebProvider>
    );

    // Click on the connect wallet button
    const connectButtons = await screen.findAllByRole("button", {
      name: "Connect Wallet",
    });
    fireEvent.click(connectButtons[0]);

    // Wait for the modal to appear
    waitFor(() => {
      const modal = screen.findByRole("dialog");
      expect(modal).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find the "Connect a wallet" button and click it
    waitFor(() => {
      const connectWalletButton = screen.findByRole("button", {
        name: "Connect a wallet",
      });
      fireEvent.click(connectWalletButton);
    }, { timeout: 3000 });

    // Find the Rabby Wallet button by partial name and click it
    waitFor(() => {
      const rabbyWalletButton = screen.getByRole("button", {
        name: /rabby wallet/i,
      });
      fireEvent.click(rabbyWalletButton);
    }, { timeout: 3000 });

    // Wait for the wallet address to appear
    await waitFor(() => {
      expect(screen.getByText(account?.address)).toBeInTheDocument();
    }, { timeout: 5000 });  // Increase timeout if necessary
  });
});