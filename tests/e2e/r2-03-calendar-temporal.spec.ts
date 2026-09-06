import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
function client() {
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Disposable runtime required");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
async function browserClient(page: Page) {
  const cookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = client();
  await api.auth.setSession(session);
  return api;
}

test("R2-03 Calendar proportional time geometry and planning-only controls", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "r2-calendar", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const api = await browserClient(page),
    user = (await api.auth.getUser()).data.user!.id;
  const day = "2026-09-08";
  const records = await api
    .from("tasks")
    .insert(
      [30, 15, 60, 90].map((duration, i) => ({
        user_id: user,
        title: `Geometry ${duration} min`,
        planned_date: day,
        scheduled_start_at: `${day}T${String([6, 7, 10, 12][i]).padStart(2, "0")}:00:00Z`,
        duration_minutes: duration,
      })),
    )
    .select("id,title");
  expect(records.error).toBeNull();
  expect(
    (
      await api.from("tasks").insert(
        Array.from({ length: 12 }, (_, i) => ({
          user_id: user,
          title: `Backlog ${i + 1}`,
        })),
      )
    ).error,
  ).toBeNull();
  const thirty = records.data!.find((t) => t.title === "Geometry 30 min")!;
  const base = `/calendar?date=${day}&view=week`;
  await page.goto(base);
  const block = (duration: number) =>
    page.locator("[data-calendar-timed-block]").filter({
      has: page.getByRole("button", {
        name: new RegExp(`^Geometry ${duration} min,`),
      }),
    });
  const select = () =>
    block(30).locator("button:not([data-calendar-resize-handle])").click();
  const rail = page.locator("[data-calendar-rail-mode]");
  const inspector = page.locator("[data-calendar-inspector]");
  const planner = page.locator('[data-calendar-section="planning-queue"]');
  await expect(rail).toHaveAttribute("data-calendar-rail-mode", "queue");
  await expect(inspector).toHaveCount(0);
  const settings = page.getByRole("region", {
    name: "Time Settings",
    exact: true,
  });
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const duration of [15, 30, 60, 90]) {
      const outer = (await block(duration).boundingBox())!;
      const inner = (await block(duration)
        .locator("button:not([data-calendar-resize-handle])")
        .boundingBox())!;
      const column = (await block(duration).locator("..").boundingBox())!;
      expect(outer.height / column.height).toBeCloseTo(duration / 990, 3);
      expect(inner.height).toBeCloseTo(outer.height, 0);
    }
    const half = (await block(30).boundingBox())!,
      whole = (await block(60).boundingBox())!;
    expect(half.height / whole.height).toBeCloseTo(0.5, 2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(size.width);
    if (size.width > 1000) {
      const docBounds = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        main: document.querySelector("main")!.getBoundingClientRect().toJSON(),
        workspace: document
          .querySelector("#calendar-workspace")!
          .getBoundingClientRect()
          .toJSON(),
      }));
      expect(docBounds.height, JSON.stringify(docBounds)).toBeLessThanOrEqual(
        size.height + 2,
      );
      const grid = (await page.locator(".calendar-timegrid").boundingBox())!;
      expect(grid.y + grid.height).toBeGreaterThan(size.height - 45);
      expect(grid.y + grid.height).toBeLessThanOrEqual(size.height);
    }
    // Normal mode always starts with the full rail dedicated to the queue.
    if (await inspector.count())
      await page
        .getByRole("button", { name: "Inspector schließen", exact: true })
        .click();
    await expect(rail).toHaveAttribute("data-calendar-rail-mode", "queue");
    await expect(inspector).toHaveCount(0);
    if (size.width > 1000) {
      const rb = (await rail.boundingBox())!,
        qb = (await planner.boundingBox())!;
      expect(qb.height).toBeGreaterThan(rb.height - 3);
    }
    await page.screenshot({
      path: info.outputPath(`queue-${size.width}.png`),
      fullPage: true,
    });
    await select();
    await expect(rail).toHaveAttribute("data-calendar-rail-mode", "selection");
    await expect(inspector).toContainText("Geometry 30 min");
    await expect(inspector).toContainText("08:00–08:30".replace("–", "-"));
    await expect(planner).toBeVisible();
    if (size.width > 1000) {
      const qb = (await planner.boundingBox())!,
        ib = (await inspector.boundingBox())!;
      expect(qb.y).toBeGreaterThanOrEqual(ib.y + ib.height);
      expect(qb.y + qb.height).toBeLessThanOrEqual(size.height);
      const docBounds = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        main: document.querySelector("main")!.getBoundingClientRect().toJSON(),
        workspace: document
          .querySelector("#calendar-workspace")!
          .getBoundingClientRect()
          .toJSON(),
      }));
      expect(docBounds.height, JSON.stringify(docBounds)).toBeLessThanOrEqual(
        size.height + 2,
      );
    }
    await expect(
      page.getByRole("button", { name: /Mark done|Completing/ }),
    ).toHaveCount(0);
    const buttons = settings.locator("form button[type=submit]");
    await expect(buttons).toHaveText([
      "Reschedule",
      "Unschedule",
      "15 min früher",
      "15 min später",
      "Dauer +15 min",
      "Dauer -15 min",
    ]);
    await page.screenshot({
      path: info.outputPath(`calendar-${size.width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Inspector schließen", exact: true })
    .click();
  await expect(inspector).toHaveCount(0);
  await select();
  await page.keyboard.press("Escape");
  await expect(inspector).toHaveCount(0);
  await page.reload();
  await expect(rail).toHaveAttribute("data-calendar-rail-mode", "queue");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(base);
  await select();
  await page
    .locator("[data-calendar-day]")
    .first()
    .getByRole("button", { name: /Select free slot .* at 10:00/ })
    .click();
  await expect(rail).toHaveAttribute("data-calendar-rail-mode", "queue");
  await select();
  const assertTime = async (start: string, duration: number) => {
    await expect
      .poll(async () => {
        const { data } = await api
          .from("tasks")
          .select("scheduled_start_at,duration_minutes")
          .eq("id", thirty.id)
          .single();
        return [data?.scheduled_start_at, data?.duration_minutes];
      })
      .toEqual([
        new Date(`${day}T${start}:00+02:00`)
          .toISOString()
          .replace(".000Z", "+00:00"),
        duration,
      ]);
    await page.reload();
    await select();
    await expect(
      settings.getByLabel("Start time", { exact: true }),
    ).toHaveValue(start);
  };
  await settings.getByLabel("Start time", { exact: true }).fill("10:00");
  await settings.getByLabel("End time", { exact: true }).fill("10:30");
  await settings
    .getByRole("button", { name: "Reschedule", exact: true })
    .click();
  await assertTime("10:00", 30);
  for (const [name, start, duration] of [
    ["15 min früher", "09:45", 30],
    ["15 min später", "10:00", 30],
    ["Dauer +15 min", "10:00", 45],
    ["Dauer -15 min", "10:00", 30],
  ] as const) {
    await settings.getByRole("button", { name, exact: true }).click();
    await assertTime(start, duration);
  }
  await page.getByRole("link", { name: "Open task", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(thirty.id));
  for (const view of ["day", "month", "week"]) {
    await page.goto(base);
    await page
      .getByRole("button", {
        name: view[0].toUpperCase() + view.slice(1),
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp("view=" + view));
    await expect(page.getByRole("button", { name: /Mark done/ })).toHaveCount(
      0,
    );
    const periodUrl = page.url();
    await page
      .getByRole("button", { name: "Next period", exact: true })
      .click();
    await expect(page).not.toHaveURL(periodUrl);
    await page
      .getByRole("button", { name: "Previous period", exact: true })
      .click();
    await expect(page).toHaveURL(periodUrl);
    if (view === "month") {
      const monthSource = page
        .locator('[data-calendar-section="month-surface"]')
        .getByRole("link")
        .first();
      const sourceHref = await monthSource.getAttribute("href");
      await monthSource.click();
      await expect(page).toHaveURL(new RegExp(sourceHref! + "$"));
      await page.goto(periodUrl);
    }
    if (view === "day") {
      await expect(block(30)).toHaveCount(1);
      await select();
      await expect(inspector).toBeVisible();
      await page
        .getByRole("button", { name: "Inspector schließen", exact: true })
        .click();
      await expect(inspector).toHaveCount(0);

      expect(
        (await block(30).boundingBox())!.height /
          (await block(60).boundingBox())!.height,
      ).toBeCloseTo(0.5, 2);
    }
  }
  await page.goto(base);
  await select();
  await settings
    .getByRole("button", { name: "Unschedule", exact: true })
    .click();
  await expect(block(30)).toHaveCount(0);
  await page.reload();
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  await queue.getByRole("button", { name: /Geometry 30 min/ }).click();
  const form = page.getByRole("form", {
    name: "Geometry 30 min planen",
    exact: true,
  });
  await form.getByLabel("Weekday").fill(day);
  await form.getByLabel("Start time").fill("10:00");
  await form.getByLabel("Duration").selectOption("30");
  await form
    .getByRole("button", { name: "Schedule task", exact: true })
    .click();
  await expect(block(30)).toHaveCount(1);
  await page.reload();
  await expect(block(30)).toHaveCount(1);
  expect(
    (await api.from("tasks").select("status").eq("id", thirty.id).single())
      .data!.status,
  ).not.toBe("done");
  await expect(page.locator("#calendar-page")).not.toContainText(
    /Page Type:|Calendar projects source entities|Color supports scanning/,
  );
  expect(errors).toEqual([]);
});
