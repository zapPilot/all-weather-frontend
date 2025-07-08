// WalletModeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { notification } from "antd";
import openNotificationWithIcon from "../../utils/notification";
const WalletModeContext = createContext();

export default function WalletModeProvider({ children }) {
  const router = useRouter();
  const [aaOn, setAaOn] = useState(true); // Default to AA mode
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  const [notificationAPI, notificationContextHolder] =
    notification.useNotification();

  useEffect(() => {
    // Only set from URL on initial mount, not on every route change
    if (!initializedFromUrl && router.isReady) {
      const { mode, walletMode } = router.query;

      // Support both ?mode=aa/eoa and ?walletMode=aa/eoa
      const urlMode = (mode || walletMode)?.toString().toLowerCase();

      if (urlMode === "aa") {
        setAaOn(true);
      } else if (urlMode === "eoa") {
        setAaOn(false);
      }
      // If no valid URL param, keep default (AA mode = true)

      setInitializedFromUrl(true);
    }
  }, [router.isReady, router.query, initializedFromUrl]);

  // Show EOA mode notification when user is in EOA mode
  useEffect(() => {
    // Only show notification when:
    // 1. User is in EOA mode (!aaOn)
    // 2. Context has been initialized from URL
    // 3. Haven't shown this session
    if (!aaOn && initializedFromUrl) {
      const hasShownEOANotice = sessionStorage.getItem(
        "eoa-metamask-notice-v1",
      );

      if (!hasShownEOANotice) {
        openNotificationWithIcon(
          notificationAPI,
          "EOA Mode Active",
          "info",
          "EOA mode currently works best with MetaMask wallet. For other wallets, consider using AA mode for optimal compatibility.",
          6000, // 6 second duration
        );

        // Mark as shown for this session
        sessionStorage.setItem("eoa-metamask-notice-v1", "true");
      }
    }
  }, [aaOn, initializedFromUrl, notificationAPI]);

  return (
    <WalletModeContext.Provider value={{ aaOn, setAaOn, initializedFromUrl }}>
      {notificationContextHolder}
      {children}
    </WalletModeContext.Provider>
  );
}
export const useWalletMode = () => useContext(WalletModeContext);
