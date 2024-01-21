import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
require("dotenv").config({ path: ".env.local" }); // import environment variable

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "dotenv/config",
  },
});
