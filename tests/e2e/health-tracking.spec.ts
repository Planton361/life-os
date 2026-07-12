import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseUrl = `http://${host}:${port}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

async function profile(page: Page, value: "manual" | "empty") {
  await page.context().addCookies([{ httpOnly: true, name: "life_os_profile", sameSite: "Lax", url: baseUrl, value }]);
}
async function authenticatedManual(page: Page) {
  const path = process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE;
  test.skip(!path, "Requires a local authenticated Supabase Playwright session.");
  const state = JSON.parse(await readFile(path!, "utf8"));
  await page.context().addCookies(state.cookies ?? []);
  await profile(page, "manual");
}

test.describe("D1.3 Mood, Sleep & Weight", () => {
  test.describe.configure({ mode: "serial" });

  test("saves mood on Dashboard, survives reload, appears in Mental Health and can be undone", async ({ page }) => {
    await authenticatedManual(page); await page.goto("/dashboard");
    const mood = page.getByRole("region", { name: "Mood" });
    await mood.getByRole("button", { name: "Happy" }).click();
    await expect(page).toHaveURL(/health=saved/); await page.reload();
    await expect(mood.getByText("Happy", { exact: true })).toBeVisible();
    await page.goto("/health/mental");
    const history = page.getByRole("region", { name: "Mood history" });
    await expect(history.getByText(/happy/i).first()).toBeVisible();
    await history.getByRole("button", { name: "Undo latest mood today" }).click();
    await expect(page).toHaveURL(/health=saved/); await page.reload();
  });

  test("creates and edits sleep, updates Dashboard latest value and keeps history after reload", async ({ page }) => {
    await authenticatedManual(page); await page.goto("/health/mental");
    const panel = page.getByRole("region", { name: "Manual sleep log" });
    await panel.getByLabel("Night/date").fill(today()); await panel.getByLabel("Hours").fill("7"); await panel.getByLabel("Minutes").fill("42"); await panel.getByRole("button", { name: "Save sleep" }).click();
    await expect(page).toHaveURL(/health=saved/); await page.reload(); await expect(panel.getByText("7h 42m", { exact: false })).toBeVisible();
    await page.goto("/dashboard"); await expect(page.getByRole("link", { name: /Sleep: 7h 42m/ })).toBeVisible();
  });

  test("saves weight and goal, projects honest progress and keeps history after reload", async ({ page }) => {
    await authenticatedManual(page); await page.goto("/health");
    const panel = page.getByRole("region", { name: "Weight history & goal" });
    await panel.getByLabel("Date", { exact: true }).fill(today()); await panel.getByLabel("Weight (kg)").fill("82.50"); await panel.getByRole("button", { name: "Save", exact: true }).click();
    await page.goto("/health"); await panel.getByLabel("Target (kg)").fill("78"); await panel.getByRole("button", { name: "Set goal" }).click();
    await expect(page).toHaveURL(/health=saved/); await page.reload(); await expect(panel.getByText("82.50 kg", { exact: false }).first()).toBeVisible();
    await page.goto("/dashboard"); await expect(page.getByText("82.50 kg", { exact: true })).toBeVisible(); await expect(page.getByText(/Target 78.00 kg/)).toBeVisible();
  });

  test("keeps Empty truthful and unauthenticated Manual writes blocked", async ({ page }) => {
    await profile(page, "empty"); await page.goto("/health"); await expect(page.getByText("No weight entries yet.")).toBeVisible(); await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    await page.context().clearCookies(); await profile(page, "manual"); await page.goto("/dashboard"); await expect(page.getByText("Sign in to use Manual mood writes.")).toBeVisible(); await expect(page.getByRole("region", { name: "Mood" }).getByRole("button")).toHaveCount(0);
  });
});
