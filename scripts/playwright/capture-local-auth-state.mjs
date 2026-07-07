#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const SETTINGS_AUTH_URL = `${BASE_URL}/settings#supabase-session`;
const STORAGE_STATE_PATH = resolve(
  process.cwd(),
  ".local/playwright/supabase-auth-state-localhost.json",
);
const DISPLAY_STORAGE_STATE_PATH = relative(process.cwd(), STORAGE_STATE_PATH);

function requireInteractiveTerminal() {
  if (input.isTTY && output.isTTY) return;

  throw new Error(
    [
      "Interactive terminal required.",
      "Run this helper locally so the headed browser can be used for manual Supabase login.",
      `No auth state was saved to ${DISPLAY_STORAGE_STATE_PATH}.`,
    ].join(" "),
  );
}

async function assertLocalAppReachable() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(BASE_URL, {
      method: "GET",
      signal: controller.signal,
    });

    if (response.status >= 500) {
      throw new Error(`Local app responded with HTTP ${response.status}.`);
    }
  } catch (error) {
    const detail =
      error instanceof Error && error.name !== "AbortError"
        ? ` Detail: ${error.message}`
        : "";

    throw new Error(
      [
        `Local app is not reachable at ${BASE_URL}.`,
        "Start it in another terminal with `pnpm dev`, then rerun this helper.",
        `No auth state was saved to ${DISPLAY_STORAGE_STATE_PATH}.${detail}`,
      ].join(" "),
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForEnter() {
  const rl = createInterface({ input, output });

  try {
    await rl.question("Press Enter after the browser shows an active local Supabase session: ");
  } finally {
    rl.close();
  }
}

async function isVisible(locator, timeout = 1500) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function hasActiveSession(page) {
  const panel = page.locator("#supabase-session");
  const signedInLabelVisible =
    (await isVisible(panel.getByText("Signed in", { exact: true }), 4000)) ||
    (await isVisible(panel.getByText("signed in", { exact: true }), 4000));
  const signedOutMarkerVisible =
    (await isVisible(panel.getByText("Keine Supabase Session", { exact: true }), 500)) ||
    (await isVisible(panel.getByText("Invalid refresh token", { exact: true }), 500)) ||
    (await isVisible(panel.getByText("Missing local Supabase env", { exact: true }), 500));

  return signedInLabelVisible && !signedOutMarkerVisible;
}

async function main() {
  requireInteractiveTerminal();
  await assertLocalAppReachable();
  await mkdir(dirname(STORAGE_STATE_PATH), { recursive: true });

  let browser;

  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(SETTINGS_AUTH_URL, { waitUntil: "domcontentloaded" });

    console.log(`Browser opened at ${SETTINGS_AUTH_URL}.`);
    console.log("Log in with the local Supabase account. Do not paste credentials into chat or logs.");

    await waitForEnter();
    await page.goto(SETTINGS_AUTH_URL, { waitUntil: "networkidle" });

    if (!(await hasActiveSession(page))) {
      throw new Error(
        [
          "No active Supabase session indicator was detected on /settings#supabase-session.",
          `Auth state was not saved to ${DISPLAY_STORAGE_STATE_PATH}.`,
        ].join(" "),
      );
    }

    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`Auth state saved under ${DISPLAY_STORAGE_STATE_PATH}.`);
  } finally {
    await browser?.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
