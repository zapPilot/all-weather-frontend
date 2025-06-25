// WalletModeContext.js
import React, { createContext, useContext, useState } from "react";
const WalletModeContext = createContext();

export function WalletModeProvider({ children }) {
  const [aaOn, setAaOn] = useState(true);
  return (
    <WalletModeContext.Provider value={{ aaOn, setAaOn }}>
      {children}
    </WalletModeContext.Provider>
  );
}
export const useWalletMode = () => useContext(WalletModeContext);
