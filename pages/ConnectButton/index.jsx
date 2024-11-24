import { ConnectButton } from "thirdweb/react";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { arbitrum, optimism, base } from "thirdweb/chains";

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
  return (
    <ConnectButton
      client={THIRDWEB_CLIENT}
      autoConnect={true}
      wallets={wallets}
      theme={"light"}
      // here are all the supported chains
      // https://portal.thirdweb.com/connect/account-abstraction/infrastructure
      chains={[arbitrum, base, optimism]}
      accountAbstraction={{
        chain: arbitrum,
        sponsorGas: true,
      }}
      connectModal={{
        size: "compact",
        title: "Create Your AA Wallet",
      }}
    />
  );
}
