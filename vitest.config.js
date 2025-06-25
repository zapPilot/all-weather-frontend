import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    forceExit: true,
    setupFiles: ["./vitest.setup.js"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["**/*.{js,ts,jsx,tsx}"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        ...configDefaults.exclude,
        "**/out/**",
        "**/.next/**",
        "**/*.config.{js,ts}",
        "__tests__/**",
        "*.test.{js,ts,jsx,tsx}",
        "*.spec.{js,ts,jsx,tsx}",
        "utils/logger.js",
      ],
      all: false,
      skipFull: true,
      thresholds: {
        lines: 74,
        functions: 63,
        branches: 86,
        statements: 74,
      },
    },
    env: {
      ...config({ path: "./.env" }).parsed,
      ...config({ path: "./.env.local" }).parsed,
    },
    testTimeout: 140000,
  },
});
