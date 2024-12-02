import {
  ConnectButton,
  useActiveWalletChain,
  useActiveAccount,
} from "thirdweb/react";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { arbitrum, optimism, base } from "thirdweb/chains";
import Image from "next/image";

export default function ConfiguredConnectButton() {
  const wallets = [
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
  const activeChain = useActiveWalletChain();
  const chainName =
    activeChain && activeChain.name ? activeChain.name.split(" ")[0] : "";
  const activeAccount = useActiveAccount();
  return (
    <ConnectButton
      client={THIRDWEB_CLIENT}
      autoConnect={true}
      wallets={wallets}
      theme={"light"}
      // here are all the supported chains
      // https://portal.thirdweb.com/connect/account-abstraction/infrastructure
      chains={[arbitrum, base]}
      accountAbstraction={{
        chain: arbitrum,
        sponsorGas: true,
      }}
      connectModal={{
        size: "compact",
        title: "Create Your AA Wallet",
      }}
      detailsButton={{
        render() {
          return (
            <div className="flex items-center gap-3 p-2 rounded-md bg-white/90 text-xs cursor-pointer">
              <div className="flex items-center gap-2 p-1">
                <Image
                  src={`/chainPicturesWebp/${
                    chainName ? chainName : "arbitrum"
                  }.webp`}
                  alt={chainName}
                  height={16}
                  width={16}
                  className="rounded-full"
                />
                <span className="font-mono inline">
                  {activeAccount?.address
                    ? `${activeAccount.address.slice(
                        0,
                        5,
                      )}...${activeAccount.address.slice(-4)}`
                    : "No Address"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
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
        },
        style: {
          borderRadius: "9999px",
        },
      }}
    />
  );
}
