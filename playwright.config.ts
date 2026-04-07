import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3001",
  },
  // Run tests serially — they share one server instance
  workers: 1,
});
