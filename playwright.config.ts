import { defineConfig } from "@playwright/test";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: playwrightBaseUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev --hostname ${playwrightHost} --port ${playwrightPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: playwrightBaseUrl,
  },
});
