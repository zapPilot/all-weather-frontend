// WalletModeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
const WalletModeContext = createContext();

export default function WalletModeProvider({ children }) {
  const router = useRouter();
  const [aaOn, setAaOn] = useState(true); // Default to AA mode
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

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

  return (
    <WalletModeContext.Provider value={{ aaOn, setAaOn, initializedFromUrl }}>
      {children}
    </WalletModeContext.Provider>
  );
}
export const useWalletMode = () => useContext(WalletModeContext);
