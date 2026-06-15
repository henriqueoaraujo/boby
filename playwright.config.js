import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 20000,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:4180",
    navigationTimeout: 10000,
    actionTimeout: 7000,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
