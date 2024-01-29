import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID =
  "bee6af70ea57e6499462532060febf40";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
