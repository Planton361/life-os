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
    await expect(page).toHaveURL(/health=saved/); await page.reload(); await expect(panel.getByText("7h 42m", { exact: false }).first()).toBeVisible();
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

async function cleanHabitProofData(page: Page) {
  await page.goto("/health/habits");
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inputs = page.locator('[data-habits-section="management"] input[name="name"]');
    let input = null;
    for (let index = 0; index < await inputs.count(); index += 1) {
      const candidate = inputs.nth(index);
      if ((await candidate.inputValue()).startsWith("E2E H1")) { input = candidate; break; }
    }
    if (!input) return;
    await input.locator("xpath=ancestor::article[1]").getByRole("button", { name: "Habit archivieren" }).click();
    await page.waitForLoadState("networkidle");
  }
}

async function activeDashboardWindow(page: Page) {
  await page.goto("/dashboard");
  const tracker = page.getByRole("region", { name: "Habit Trackers" });
  return (await tracker.getByRole("button", { pressed: true, name: /Morning|Midday|Evening/ }).textContent())?.trim() ?? "Morning";
}

async function createHabit(page: Page, input: { name: string; unit?: string; target?: string; increment?: string; window: string; slot: string }) {
  await page.goto("/health/habits");
  const form = page.locator('[data-habits-section="create-form"]');
  await form.getByLabel("Name").fill(input.name);
  await form.getByLabel("Einheit").fill(input.unit ?? "");
  await form.getByLabel("Tagesziel optional").fill(input.target ?? "");
  await form.getByLabel("Standard-Increment").fill(input.increment ?? "1");
  await form.getByLabel("Zeitfenster").selectOption(input.window);
  await form.getByLabel("Dashboard-Slot 1–8").fill(input.slot);
  await form.getByRole("button", { name: "Habit erstellen" }).click();
  await expect(page).toHaveURL(/habit=saved/);
}

test.describe("H1.1 Habit Tracking", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => { await authenticatedManual(page); await cleanHabitProofData(page); });

  test("creates a habit in the active Dashboard window, increments and survives reload", async ({ page }) => {
    const window = await activeDashboardWindow(page);
    const name = `E2E H1 Water ${Date.now()}`;
    await createHabit(page, { name, unit: "ml", target: "2000", increment: "200", window, slot: "1" });
    await page.goto("/dashboard");
    const tracker = page.getByRole("region", { name: "Habit Trackers" });
    await tracker.scrollIntoViewIfNeeded();
    let dashboardHabit = tracker.getByRole("article", { name: new RegExp(name) });
    await expect(dashboardHabit).toBeVisible();
    await dashboardHabit.getByRole("button", { name: new RegExp(`${name} um 200 ml erhöhen`) }).click();
    await expect(page).toHaveURL(/habit=saved/); await page.reload();
    dashboardHabit = tracker.getByRole("article", { name: new RegExp(name) });
    await expect(dashboardHabit).toContainText("200 / 2000 ml");
    await page.goto("/health");
    await expect(page.getByRole("region", { name: "Habits" }).getByText(new RegExp(name))).toBeVisible();
  });

  test("supports flexible units, multiple increments and honest overachievement", async ({ page }) => {
    const name = `E2E H1 Meditation ${Date.now()}`;
    await createHabit(page, { name, unit: "Minuten", target: "20", increment: "5", window: "Morning", slot: "2" });
    for (let count = 0; count < 5; count += 1) {
      await page.locator('[data-habits-section="today"] [data-habit-id]').filter({ hasText: name }).getByRole("button", { name: "+ 5 Minuten" }).click();
      await page.waitForLoadState("networkidle");
    }
    const card = page.locator('[data-habits-section="today"] [data-habit-id]').filter({ hasText: name });
    await expect(card.getByText("25 Minuten / 20 Minuten")).toBeVisible();
    await expect(card.getByText("125% · über Ziel")).toBeVisible();
  });

  test("undo removes only the latest log and keeps reload/history correct", async ({ page }) => {
    const name = `E2E H1 Vitamins ${Date.now()}`;
    await createHabit(page, { name, target: "1", increment: "1", window: "Midday", slot: "3" });
    let card = page.locator('[data-habits-section="today"] [data-habit-id]').filter({ hasText: name });
    await card.getByRole("button", { name: "+ 1 Count" }).click(); await page.waitForLoadState("networkidle");
    card = page.locator('[data-habits-section="today"] [data-habit-id]').filter({ hasText: name });
    await card.getByRole("button", { name: "+ 1 Count" }).click(); await page.waitForLoadState("networkidle");
    card = page.locator('[data-habits-section="today"] [data-habit-id]').filter({ hasText: name });
    const previousUpdate = new URL(page.url()).searchParams.get("habitUpdate");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("habitUpdate") !== previousUpdate),
      card.getByRole("button", { name: "Letzten Log rückgängig" }).click(),
    ]);
    await page.reload();
    card = page.locator('[data-habits-section="today"] [data-habit-id]').filter({ hasText: name });
    await expect(card.getByText("1 / 1")).toBeVisible();
    await expect(page.locator('[data-habits-section="history"] article').filter({ hasText: name }).getByText(/1 timestamped Logs/)).toBeVisible();
  });

  test("edits and archives a habit while preserving its history", async ({ page }) => {
    const name = `E2E H1 Archive ${Date.now()}`;
    const edited = `${name} edited`;
    await createHabit(page, { name, unit: "Wiederholungen", target: "10", increment: "2", window: "Evening", slot: "4" });
    let management = page.locator('[data-habits-section="management"] article').filter({ has: page.locator(`input[name="name"][value="${name}"]`) });
    await management.getByLabel("Name").fill(edited);
    await management.getByLabel("Dashboard-Slot 1–8").fill("5");
    await management.getByRole("button", { name: "Habit speichern" }).click(); await page.waitForLoadState("networkidle");
    management = page.locator('[data-habits-section="management"] article').filter({ has: page.locator(`input[name="name"][value="${edited}"]`) });
    const previousUpdate = new URL(page.url()).searchParams.get("habitUpdate");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("habitUpdate") !== previousUpdate),
      management.getByRole("button", { name: "Habit archivieren" }).click(),
    ]);
    await page.reload();
    await expect(page.locator('[data-habits-section="today"]').getByText(edited)).toHaveCount(0);
    await expect(page.locator('[data-habits-section="history"] article').filter({ hasText: edited }).getByText("Archiviert")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Habit Trackers" }).getByText(edited)).toHaveCount(0);
  });
});
