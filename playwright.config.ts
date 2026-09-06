import { defineConfig } from "@playwright/test";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: playwrightBaseUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    // POSIX exec makes the managed wrapper the actual WebServer group leader.
    // An intermediate pnpm can outlive Playwright and hide parent loss.
    command: `exec ${shellQuote(process.execPath)} scripts/ops/run-local-next-dev.mjs --hostname ${shellQuote(playwrightHost)} --port ${shellQuote(playwrightPort)}`,
    reuseExistingServer:
      process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE" && !process.env.CI,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    timeout: 120_000,
    url: playwrightBaseUrl,
  },
});
