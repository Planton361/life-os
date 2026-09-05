import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

function disposableClient() {
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Atomic Habit proof requires the disposable runner.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("atomic Habit RPC caps concurrent authenticated writes and rejects foreign/archived Habits", async () => {
  const client = disposableClient();
  const other = disposableClient();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const signup = async (api: typeof client, suffix: string) => {
    const { data, error } = await api.auth.signUp({ email: `r2-atomic-${stamp}-${suffix}@example.test`, password: `R2-atomic-${stamp}!` });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
    const user = data.user!.id;
    expect((await api.from("profiles").upsert({ id: user, timezone: "Pacific/Kiritimati" })).error).toBeNull();
    return user;
  };
  const owner = await signup(client, "owner");
  await signup(other, "other");
  let slot = 0;
  const habit = async (target: number | null, increment: number) => {
    const result = await client.from("habits").insert({ user_id: owner, profile_id: owner, name: `Atomic ${stamp} ${++slot}`, daily_target: target, default_increment: increment, time_window: "Morning", sort_order: slot }).select("id").single();
    expect(result.error).toBeNull();
    return result.data!.id;
  };
  const increment = async (id: string, api = client) => {
    const result = await api.rpc("increment_habit_for_local_day", { p_habit_id: id });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    return result.data![0];
  };
  const logs = async (id: string) => {
    const result = await client.from("habit_logs").select("*").eq("habit_id", id).is("archived_at", null).order("recorded_at");
    expect(result.error).toBeNull();
    const rows = result.data!;
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.user_id).toBe(owner);
      expect(row.profile_id).toBe(owner);
      expect(row.value).toBeGreaterThan(0);
      expect(row.timezone).toBe("Pacific/Kiritimati");
      expect(row.local_date).toBe(new Intl.DateTimeFormat("en-CA", { timeZone: row.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
    }
    return rows;
  };
  const concurrent = await habit(5, 3);
  expect((await increment(concurrent)).increment_value).toBe(3);
  const results = await Promise.all([increment(concurrent), increment(concurrent)]);
  expect(results.map(row => row.status).sort()).toEqual(["already_at_target", "incremented"]);
  expect((await logs(concurrent)).map(row => row.value).sort()).toEqual([2, 3]);
  expect((await logs(concurrent)).reduce((sum, row) => sum + row.value, 0)).toBe(5);

  const single = await habit(1, 1);
  const burst = await Promise.all(Array.from({ length: 8 }, () => increment(single)));
  expect(burst.filter(row => row.status === "incremented")).toHaveLength(1);
  expect(burst.filter(row => row.status === "already_at_target")).toHaveLength(7);
  expect((await logs(single)).map(row => row.value)).toEqual([1]);

  const sequence = await habit(10, 3);
  for (const total of [3, 6, 9, 10]) {
    expect((await increment(sequence)).status).toBe("incremented");
    expect((await logs(sequence)).reduce((sum, row) => sum + row.value, 0)).toBe(total);
  }
  expect(await increment(sequence)).toEqual({ status: "already_at_target", log_id: null, increment_value: null });
  expect((await logs(sequence)).map(row => row.value).sort()).toEqual([1, 3, 3, 3]);
  expect((await increment(sequence, other)).status).toBe("failure");
  expect((await other.from("habit_logs").select("id").eq("habit_id", sequence)).data).toEqual([]);

  const archived = await habit(5, 3);
  expect((await client.from("habits").update({ archived_at: new Date().toISOString() }).eq("id", archived)).error).toBeNull();
  expect((await increment(archived)).status).toBe("failure");
  expect(await logs(archived)).toHaveLength(0);
  const uncapped = await habit(null, 3);
  await Promise.all(Array.from({ length: 3 }, () => increment(uncapped)));
  expect((await logs(uncapped)).map(row => row.value)).toEqual([3, 3, 3]);
  expect((await disposableClient().rpc("increment_habit_for_local_day", { p_habit_id: sequence })).error).not.toBeNull();
});

test("Dashboard Habit whole-card cap, stale no-op, dots, Undo and period survive reload", async ({ page }, info) => {
  test.setTimeout(120_000);
  await signUpTechnicalManualUser(page, "r2-atomic-ui", Date.now());
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/dashboard");
  const region = page.locator(".dashboard-habits");
  for (const period of ["Morning", "Midday", "Evening"]) {
    await region.getByRole("button", { name: period, exact: true }).click();
    await expect(region.getByRole("button", { name: period, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(region.locator(".habit-slots > *")).toHaveCount(8);
  }
  const dialog = page.getByRole("dialog");
  for (const viewport of [{ width: 2560, height: 1440 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await region.getByRole("button", { name: /Add habit/i }).click();
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
    expect(box.width).toBeLessThan(viewport.width);
    expect(box.height).toBeLessThan(viewport.height);
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    expect(await dialog.evaluate(el => getComputedStyle(el, "::backdrop").backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({ path: info.outputPath(`habit-dialog-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(region.getByRole("button", { name: /Add habit/i })).toBeFocused();
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await region.getByRole("button", { name: /Add habit/i }).click();
  await expect(dialog.getByLabel(/slot/i)).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
  const name = `Atomic UI ${Date.now()}`;
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Target", { exact: true }).fill("10");
  await dialog.getByLabel("Increment", { exact: true }).fill("3");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const toast = page.locator('[aria-label="Benachrichtigungen"]');
  await expect(toast.getByRole("status").locator("p")).toHaveText("Habit gespeichert.");
  const toastBounds = (await toast.boundingBox())!;
  expect(toastBounds.y).toBe(16);
  expect(toastBounds.x + toastBounds.width).toBe(1904);
  await expect(toast.getByRole("status")).toHaveCount(0, { timeout: 7000 });
  await page.reload();
  const card = region.getByRole("article");
  const button = card.getByRole("button", { name: `${name} erhöhen` });
  await expect(button).toBeVisible();
  await expect(card.getByRole("button", { name: "+", exact: true })).toHaveCount(0);
  const stale = await page.context().newPage();
  await stale.goto("/dashboard?habitWindow=Evening");
  const staleButton = stale.getByRole("button", { name: `${name} erhöhen` });
  await expect(staleButton).toBeEnabled();
  for (const [index, total] of [3, 6, 9, 10].entries()) {
    await button.click();
    await expect(card).toContainText(`${total} / 10`);
    const dots = card.locator(`[aria-label="${index + 1} / 4 Schritte"] > span`);
    await expect(dots).toHaveCount(4);
    expect(await dots.evaluateAll(nodes => nodes.filter(node => node.className.includes("bg-[var(--accent-purple)]")).length)).toBe(index + 1);
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.reload();
    await expect(card).toContainText(`${total} / 10`);
    await expect(region.getByRole("button", { name: "Evening", exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await expect(button).toBeDisabled();
  // A genuinely stale enabled card still submits, exercising the action's no-op branch.
  await staleButton.click();
  await expect(stale.locator(".dashboard-habits").getByRole("article")).toContainText("10 / 10");
  await expect(stale.getByRole("status")).toHaveCount(0);
  await expect(stale).not.toHaveURL(/habit=saved/);
  await stale.reload();
  await expect(staleButton).toBeDisabled();
  await expect(stale.getByRole("status")).toHaveCount(0);
  await stale.close();
  await card.getByRole("button", { name: /rückgängig/ }).click();
  await expect(card).toContainText("9 / 10");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.reload();
  await expect(card).toContainText("9 / 10");
  await expect(button).toBeEnabled();
  await expect(region.getByRole("button", { name: "Evening", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.locator(".habit-slots > *")).toHaveCount(8);
  await page.screenshot({ path: info.outputPath("atomic-habit-dashboard.png"), fullPage: true });
  for (const slot of ["Breakfast", "Lunch", "Dinner"]) {
    const plan = page.getByRole("link", { name: `Planen ${slot}`, exact: true });
    const box = (await plan.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(72);
    expect(box.height).toBeGreaterThanOrEqual(36);
    const meal = (await plan.locator("..").boundingBox())!;
    expect(Math.abs(box.y + box.height / 2 - meal.y - meal.height / 2)).toBeLessThan(2);
    await plan.click();
    await expect(page).toHaveURL(new RegExp(`meal-planner\\?slot=${slot.toLowerCase()}`));
    await page.goto("/dashboard");
  }
  expect(errors).toEqual([]);
});
