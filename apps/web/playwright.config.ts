import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: baseURL || "http://127.0.0.1",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
