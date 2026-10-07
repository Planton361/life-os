import { defineConfig } from "@playwright/test";

const baseURL = process.env.LIFE_OS_112_GATEWAY_ORIGIN;
if (!baseURL || !/^https:\/\/[^/]+\.ts\.net$/.test(baseURL))
  throw new Error("#112 requires the real private Tailscale gateway");

export default defineConfig({
  testDir: "./e2e",
  testMatch: /issue-112-dashboard-(manual|cockpit)\.spec\.ts/,
  outputDir: process.env.LIFE_OS_112_OUTPUT,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    viewport: { width: 769, height: 413 },
    deviceScaleFactor: 2,
    screenshot: "only-on-failure",
    trace: "off",
  },
});
