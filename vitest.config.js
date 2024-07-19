import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.js"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      exclude: [
        ...configDefaults.exclude,
        "**/out/**",
        "**/.next/**",
        "**/*.config.{js,ts}",
      ],
    },
    env: {
      ...config({ path: "./.env.local" }).parsed,
    },
    testTimeout: 60000,
  },
});
