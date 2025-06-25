import React, { memo, useState, useCallback } from "react";
import {
  ConnectButton,
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { arbitrum, optimism, base } from "thirdweb/chains";
import { defineChain } from "thirdweb";
import { Switch } from "antd";
import { useWalletMode } from "../contextWrappers/WalletModeContext.jsx";

const WALLETS = [
  createWallet("io.rabby"),
  createWallet("app.phantom"),
  createWallet("com.ambire"),
  walletConnect(),
  inAppWallet({
    auth: {
      options: ["google", "telegram", "x", "passkey", "facebook", "apple"],
    },
  }),
];

const SUPPORTED_CHAINS = [arbitrum, base, defineChain(1088), optimism];

const AddressDisplay = memo(function AddressDisplay({ address }) {
  if (!address) return <span className="font-mono inline">No Address</span>;
  return (
    <span className="font-mono inline">
      {`${address.slice(0, 5)}...${address.slice(-4)}`}
    </span>
  );
});

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
  const { aaOn, setAaOn } = useWalletMode();
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect, isLoading: isDisconnecting } = useDisconnect();

  const handleSwitch = useCallback(
    async (checked) => {
      if (activeWallet) {
        await disconnect(activeWallet);
      }
      setAaOn(checked);
    },
    [activeWallet, disconnect],
  );

  return (
    <>
      <Switch
        checked={aaOn}
        onChange={handleSwitch}
        disabled={isDisconnecting}
        checkedChildren="AA"
        unCheckedChildren="EOA"
      />
      <ConnectButton
        key={aaOn ? "aa-mode" : "eoa-mode"}
        client={THIRDWEB_CLIENT}
        autoConnect={true}
        wallets={WALLETS}
        theme="light"
        chains={SUPPORTED_CHAINS}
        accountAbstraction={
          aaOn ? { chain: base, sponsorGas: true } : undefined
        }
        connectModal={{
          size: "compact",
          title: aaOn ? "Create Your AA Wallet" : "Connect Wallet",
        }}
        detailsButton={{
          render() {
            return <DetailsButton address={activeAccount?.address} />;
          },
          style: { borderRadius: "9999px" },
        }}
      />
    </>
  );
}

export default ConfiguredConnectButton;
