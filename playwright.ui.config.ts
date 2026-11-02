import { defineConfig, devices } from "@playwright/test";

// UI-only checks mock the local API. They do not create accounts or need Docker.
export default defineConfig({
  testDir: "./tests/ui",
  workers: 1,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:4176", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 4176 --strictPort",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:55421",
      VITE_SUPABASE_ANON_KEY: "ui-only-public-key",
      VITE_APP_ENV: "local",
    },
  },
});
