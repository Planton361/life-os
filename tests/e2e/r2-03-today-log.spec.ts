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

const stream = (page: Page) =>
  page.getByRole("region", { name: "Activity Stream", exact: true });
test("R2-03 Today is a source-first local day log without planning controls", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "r2-today", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/today");
  await expect(stream(page)).toContainText("Noch keine Aktivität heute.");
  await expect(
    page.locator("#today-page form, #today-page button"),
  ).toHaveCount(0);
  await expect(page.locator("#today-page")).not.toContainText(
    "Wiederkehrende Aufgaben",
  );
  await expect(page.locator("#today-page")).not.toContainText("Heute planen");
  const title = `R2 day task ${Date.now()}`,
    capture = `R2 day capture ${Date.now()}`;
  await page.goto("/dashboard");
  const quick = page.locator('[aria-labelledby="quick-thought-title"]');
  await quick.getByLabel("Quick Thought", { exact: true }).fill(capture);
  await quick.getByRole("button", { name: "In Inbox speichern" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /gespeichert/i })
      .last(),
  ).toBeVisible();
  await page.goto("/today");
  await page.reload();
  await expect(
    stream(page).locator('[data-event-kind="INBOX CAPTURE"]'),
  ).toContainText(capture);
  await page.goto("/portfolio?view=tasks");
  const create = page.getByRole("form", {
    name: "Task erstellen",
    exact: true,
  });
  await create.getByLabel("Task-Titel").fill(title);
  await create
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
  const api = await browserClient(page);
  const record = (
    await api.from("tasks").select("id").eq("title", title).single()
  ).data!;
  const href = `/portfolio?view=tasks&selected=${record.id}`;
  await page.goto("/today");
  await page.reload();
  await expect(
    stream(page).locator('[data-event-kind="TASK CREATED"]'),
  ).toContainText(title);
  await expect(
    stream(page).locator('[data-event-kind="TASK SCHEDULED"]'),
  ).toHaveCount(0);
  await page.goto(href);
  await page.getByRole("button", { name: "Heute planen", exact: true }).click();
  await page
    .getByRole("button", { name: "Heute terminieren", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Entterminieren", exact: true }),
  ).toBeVisible();
  await page.goto("/calendar");
  await expect(
    page
      .locator('[data-calendar-section="week-grid"]')
      .getByRole("button", { name: new RegExp(title) }),
  ).toBeVisible();
  await page.goto("/today");
  await page.reload();
  await expect(
    stream(page).locator('[data-event-kind="TASK SCHEDULED"]'),
  ).toContainText(title);
  await page.goto(href);
  await page.getByRole("button", { name: "Abschließen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Wieder öffnen", exact: true }),
  ).toBeVisible();
  await page.goto("/today");
  await page.reload();
  await expect(
    stream(page).locator('[data-event-kind="TASK COMPLETED"]'),
  ).toContainText(title);
  const times = await stream(page)
    .locator("[data-event-at]")
    .evaluateAll((rows) =>
      rows.map((row) => Date.parse(row.getAttribute("data-event-at")!)),
    );
  expect(times).toEqual([...times].sort((a, b) => a - b));
  const urls = await page
    .locator("#today-page a")
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute("href")!)),
    ]);
  for (const url of urls) {
    await page.goto("/today");
    await page.locator(`#today-page a[href="${url}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(url.split("?")[0]));
    await expect(page.locator("main")).toBeVisible();
  }
  await page.goto("/today");
  await page.reload();
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(size.width);
    if (size.width > 1000) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(size.height + 2);
      const main = await stream(page).boundingBox(),
        rail = await page
          .getByRole("complementary", { name: "Tageskontext" })
          .boundingBox();
      expect(main!.x + main!.width).toBeLessThanOrEqual(rail!.x);
      expect(main!.width).toBeGreaterThan(rail!.width);
      expect(rail!.y + rail!.height).toBeLessThanOrEqual(size.height);
    }
    const path = info.outputPath(`today-${size.width}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`today-${size.width}`, {
      path,
      contentType: "image/png",
    });
  }
  expect(errors).toEqual([]);
});

test("R2-03 local logs, review decisions, ownership and profile boundaries", async ({
  page,
}) => {
  test.setTimeout(150000);
  await signUpTechnicalManualUser(page, "r2-today-review", Date.now());
  const api = await browserClient(page),
    user = (await api.auth.getUser()).data.user!.id;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  expect(
    (await api.from("profiles").upsert({ id: user, timezone: "Europe/Berlin" }))
      .error,
  ).toBeNull();
  expect(
    (
      await api.from("mood_entries").insert({
        user_id: user,
        profile_id: user,
        local_date: day,
        timezone: "Europe/Berlin",
        mood: "calm",
      })
    ).error,
  ).toBeNull();
  const habit = await api
    .from("habits")
    .insert({
      user_id: user,
      profile_id: user,
      name: "Today proof habit",
      time_window: "Morning",
      sort_order: 1,
    })
    .select("id")
    .single();
  expect(habit.error).toBeNull();
  expect(
    (
      await api.from("habit_logs").insert({
        user_id: user,
        profile_id: user,
        habit_id: habit.data!.id,
        local_date: day,
        timezone: "Europe/Berlin",
        value: 1,
      })
    ).error,
  ).toBeNull();
  const title = `Today carry ${Date.now()}`;
  const task = await api
    .from("tasks")
    .insert({ user_id: user, title, planned_date: day })
    .select("id")
    .single();
  expect(task.error).toBeNull();
  const stranger = client();
  const other = await stranger.auth.signUp({
    email: `r2-today-foreign-${Date.now()}@example.test`,
    password: "Local-proof-password-456!",
  });
  expect(other.error).toBeNull();
  expect(
    (
      await stranger.from("tasks").insert({
        user_id: other.data.user!.id,
        title: "Foreign must not appear",
      })
    ).error,
  ).toBeNull();
  await page.goto("/today");
  await expect(stream(page)).not.toContainText("Foreign must not appear");
  await expect(stream(page).locator('[data-event-kind="MOOD"]')).toContainText(
    "calm",
  );
  await expect(stream(page).locator('[data-event-kind="HABIT"]')).toContainText(
    "Today proof habit",
  );
  for (const kind of ["MOOD", "HABIT"]) {
    await stream(page)
      .locator(`[data-event-kind="${kind}"]`)
      .getByRole("link")
      .click();
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/today");
  }
  await page
    .getByRole("link", { name: "Tagesabschluss öffnen", exact: true })
    .click();
  const carry = page.locator('[data-review-section="carry-over"]');
  await carry.getByRole("checkbox", { name: new RegExp(title) }).check();
  await page
    .getByRole("textbox", { name: "Outcome", exact: true })
    .fill("Day documented; one explicit carry decision.");
  await page
    .getByRole("button", { name: "Complete Daily Review", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Daily Review gespeichert." })
      .last(),
  ).toBeVisible();
  await page.goto("/today");
  await page.reload();
  await expect(
    stream(page).locator('[data-event-kind="REVIEW COMPLETED"]'),
  ).toContainText("Day documented");
  await expect(
    page.getByRole("region", {
      name: "Closing Review / Day Closeout",
      exact: true,
    }),
  ).toContainText("1 Carry Forward");
  const decisions = page.getByRole("region", {
    name: "Decisions & Artifacts",
    exact: true,
  });
  await expect(decisions.getByRole("link")).toHaveCount(1);
  await decisions.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`selected=${task.data!.id}`));
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "manual",
      url: `http://${process.env.PLAYWRIGHT_HOST}:${process.env.PLAYWRIGHT_PORT}`,
    },
  ]);
  await page.goto("/today");
  await expect(stream(page)).toContainText("Tagesdaten nicht verfügbar");
  await expect(
    page.locator("#today-page form, #today-page button"),
  ).toHaveCount(0);
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "demo",
      url: `http://${process.env.PLAYWRIGHT_HOST}:${process.env.PLAYWRIGHT_PORT}`,
    },
  ]);
  await page.goto("/today");
  await expect(page.locator("#today-page")).toContainText("Demo-Referenz");
  await expect(
    page.locator("#today-page form, #today-page button"),
  ).toHaveCount(0);
});

test("R2-03 meaningful habit/mood day memory survives increments, undo and reload", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "r2-memory", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/dashboard?habitWindow=Morning");
  const region = page.locator(".dashboard-habits");
  await region.getByRole("button", { name: /Add habit/i }).click();
  const dialog = page.getByRole("dialog"),
    name = "Dehnen " + Date.now();
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Target", { exact: true }).fill("5");
  await dialog.getByLabel("Increment", { exact: true }).fill("1");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const card = region.getByRole("article").filter({ hasText: name });
  const increment = card.getByRole("button", {
    name: name + " erhöhen",
    exact: true,
  });
  for (let n = 1; n <= 3; n++) {
    await increment.click();
    await expect(card).toContainText(n + " / 5");
  }
  const api = await browserClient(page);
  const habit = (
    await api.from("habits").select("id").eq("name", name).single()
  ).data!;
  const assertHabit = async (value: number) => {
    await page.goto("/today");
    await page.reload();
    const row = stream(page).locator('[data-event-kind="HABIT"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(name + " · " + value + "/5");
    await expect(row).toContainText(
      value === 5 ? "Tagesziel erreicht" : "Fortschritt heute",
    );
    await expect(stream(page)).not.toContainText("HABIT LOGGED");
    return row.getAttribute("data-event-at");
  };
  await assertHabit(3);
  await page.goto("/dashboard?habitWindow=Morning");
  for (let n = 4; n <= 5; n++) {
    await increment.click();
    await expect(card).toContainText(n + " / 5");
  }
  await assertHabit(5);
  await page.goto("/dashboard?habitWindow=Morning");
  await card.getByRole("button", { name: /rückgängig/ }).click();
  await expect(card).toContainText("4 / 5");
  await assertHabit(4);
  const logs = await api
    .from("habit_logs")
    .select("id,archived_at")
    .eq("habit_id", habit.id);
  expect(logs.error).toBeNull();
  expect(logs.data).toHaveLength(5);
  expect(logs.data!.filter((l) => !l.archived_at)).toHaveLength(4);
  await page.goto("/dashboard");
  for (const mood of ["Happy", "Focused"]) {
    await page
      .locator(".dashboard-mood")
      .getByRole("button", { name: mood, exact: true })
      .click();
    await expect(
      page
        .locator(".dashboard-mood")
        .getByRole("button", { name: mood, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  const quick = page.locator('[aria-labelledby="quick-thought-title"]');
  for (const capture of ["Gedanke A " + name, "Gedanke B " + name]) {
    await quick.getByLabel("Quick Thought", { exact: true }).fill(capture);
    await quick.getByRole("button", { name: "In Inbox speichern" }).click();
    await expect(
      quick.getByLabel("Quick Thought", { exact: true }),
    ).toHaveValue("");
  }
  await page.goto("/today");
  await page.reload();
  await expect(stream(page).locator('[data-event-kind="MOOD"]')).toHaveCount(1);
  await expect(stream(page).locator('[data-event-kind="MOOD"]')).toContainText(
    /focused/i,
  );
  await expect(
    stream(page).locator('[data-event-kind="INBOX CAPTURE"]'),
  ).toHaveCount(2);
  await expect(stream(page).locator('[data-event-kind="HABIT"]')).toHaveCount(
    1,
  );
  const order = await stream(page)
    .locator("[data-event-at]")
    .evaluateAll((nodes) =>
      nodes.map((n) => [
        n.getAttribute("data-event-kind"),
        n.getAttribute("data-event-at"),
        n.textContent,
      ]),
    );
  const times = order.map((row) => Date.parse(row[1]!));
  expect(times).toEqual([...times].sort((a, b) => a - b));
  await page.reload();
  expect(
    await stream(page)
      .locator("[data-event-at]")
      .evaluateAll((nodes) =>
        nodes.map((n) => [
          n.getAttribute("data-event-kind"),
          n.getAttribute("data-event-at"),
          n.textContent,
        ]),
      ),
  ).toEqual(order);
  for (const [kind, url] of [
    ["HABIT", /health\/habits/],
    ["MOOD", /health\/mental/],
  ] as const) {
    await stream(page)
      .locator(`[data-event-kind="${kind}"]`)
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(url);
    await page.goto("/today");
  }
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(size.width);
    await expect(
      page.locator("#today-page form, #today-page button"),
    ).toHaveCount(0);
    await expect(page.locator("#today-page")).not.toContainText(
      /Heute planen|Wiederkehrende Aufgaben/,
    );
    if (size.width > 1000) {
      const main = (await stream(page).boundingBox())!,
        rail = (await page
          .getByRole("complementary", { name: "Tageskontext" })
          .boundingBox())!;
      expect(main.x + main.width).toBeLessThanOrEqual(rail.x);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(size.height + 2);
    }
    await page.screenshot({
      path: info.outputPath(`memory-${size.width}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
