import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential to avoid port conflicts
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:test",
    port: 3100,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/refund_analytics_test",
    },
  },
});
