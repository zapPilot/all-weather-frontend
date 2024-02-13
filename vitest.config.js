import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID =
  "bee6af70ea57e6499462532060febf40";
process.env.NEXT_PUBLIC_API_URL =
  "https://portfolio-backend-e3gk6w67ba-uc.a.run.app";
export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.js"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
    },
  },
});
