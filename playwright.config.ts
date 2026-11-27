import { defineConfig, devices } from "@playwright/test";
import { browser, browserPort } from "./scripts/verification-target.mjs";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: browser,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
    launchOptions: {
      args: [
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.LIFTOFF_VERIFY_CHROME === "1" ? "chrome" : undefined,
      },
    },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${browserPort} --strictPort`,
    url: browser,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
