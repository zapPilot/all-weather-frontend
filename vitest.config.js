import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.js"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
    },
    env: {
      ...config({ path: "./.env.local" }).parsed,
    }
  },
});
