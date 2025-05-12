import React, { memo } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { arbitrum, optimism, base } from "thirdweb/chains";
import { defineChain } from "thirdweb";

// Extracted wallet configuration
const WALLETS = [
  createWallet("io.rabby"),
  createWallet("me.rainbow"),
  createWallet("io.metamask"),
  createWallet("app.phantom"),
  walletConnect(),
  inAppWallet({
    auth: {
      options: ["google", "telegram", "x", "passkey", "facebook", "apple"],
    },
  }),
];

// Extracted chains configuration
const SUPPORTED_CHAINS = [arbitrum, base, defineChain(1088), optimism];

// Extracted address display component
const AddressDisplay = memo(function AddressDisplay({ address }) {
  if (!address) return <span className="font-mono inline">No Address</span>;

  return (
    <span className="font-mono inline">
      {`${address.slice(0, 5)}...${address.slice(-4)}`}
    </span>
  );
});

// Extracted details button component
const DetailsButton = memo(function DetailsButton({ address }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-white/90 text-xs cursor-pointer">
      <div className="flex items-center gap-2 p-1">
        <AddressDisplay address={address} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
});

function ConfiguredConnectButton() {
  const activeAccount = useActiveAccount();

  return (
    <ConnectButton
      client={THIRDWEB_CLIENT}
      autoConnect={true}
      wallets={WALLETS}
      theme="light"
      chains={SUPPORTED_CHAINS}
      accountAbstraction={{
        chain: base,
        sponsorGas: true,
      }}
      connectModal={{
        size: "compact",
        title: "Create Your AA Wallet",
      }}
      detailsButton={{
        render() {
          return <DetailsButton address={activeAccount?.address} />;
        },
        style: {
          borderRadius: "9999px",
        },
      }}
    />
  );
}

export default memo(ConfiguredConnectButton);
