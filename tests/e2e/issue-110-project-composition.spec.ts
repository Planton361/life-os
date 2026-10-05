import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/features/real-data/supabase/database.types";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test.use({ actionTimeout: 15_000, navigationTimeout: 15_000 });

const viewports = [
  { name: "mac", width: 769, height: 413, deviceScaleFactor: 2 },
  { name: "gigabyte", width: 2560, height: 589, deviceScaleFactor: 1 },
  { name: "asus", width: 2560, height: 639, deviceScaleFactor: 1.5 },
  { name: "desktop", width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
  { name: "4k", width: 3840, height: 2160, deviceScaleFactor: 1 },
];

async function bounds(page: Page) {
  const result = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - innerWidth;
    const clipped = [
      ...document.querySelectorAll<HTMLElement>(
        "main button, main a, main input, main textarea",
      ),
    ].flatMap((e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return [];
      const failures: string[] = [];
      if (r.left < -1 || r.right > innerWidth + 1) failures.push("horizontal");
      for (
        let p = e.parentElement;
        p && p.tagName !== "MAIN";
        p = p.parentElement
      ) {
        const s = getComputedStyle(p),
          b = p.getBoundingClientRect();
        if (
          ["hidden", "clip"].includes(s.overflowY) &&
          (r.top < b.top - 1 || r.bottom > b.bottom + 1)
        )
          failures.push("vertical");
      }
      return failures.map((f) => `${e.textContent?.trim().slice(0, 60)}:${f}`);
    });
    return { overflow, clipped };
  });
  expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.clipped).toEqual([]);
}

test("#110 synthetic Project no-context/context/33-task matrix and real controls", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(600_000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "issue110composition", stamp, {
    issue110ExistingLocalRuntime: true,
  });
  const cookies = (await page.context().cookies())
    .filter((c) => c.name.includes("auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const encoded = cookies
    .map((c) => c.value)
    .join("")
    .replace(/^base64-/, "");
  const session = JSON.parse(Buffer.from(encoded, "base64url").toString());
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const auth = await api.auth.setSession(session);
  expect(auth.error).toBeNull();
  const uid = (await api.auth.getUser()).data.user!.id;
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `#110 Composition ${stamp}`,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const task = (
    await api
      .from("tasks")
      .insert({
        user_id: uid,
        project_id: project.id,
        title: `#110 Direct ${stamp}`,
        status: "planned",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const storageState = await page.context().storageState(); // memory only, never logged
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const matrix = async (state: "no-context" | "context" | "long") => {
    for (const v of viewports) {
      const context = await browser.newContext({
        storageState,
        viewport: v,
        deviceScaleFactor: v.deviceScaleFactor,
      });
      const p = await context.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("console", (m) => {
        if (m.type() === "error" || /hydration/i.test(m.text()))
          errors.push(m.text());
      });
      await p.goto(`/projects/${project.id}`);
      const frame = p.locator("[data-project-frame]");
      await expect(frame).toBeVisible();
      const rail = p.getByRole("complementary", {
        name: "Project Context Rail",
        exact: true,
      });
      await expect(rail).toHaveCount(state === "no-context" ? 0 : 1);
      const work = p.getByRole("region", {
        name: "Tasks & Progress",
        exact: true,
      });
      await expect(work.locator("[data-project-task]")).toHaveCount(
        state === "long" ? 33 : 1,
      );
      const canvas = await p
        .locator(".life-os-canvas")
        .evaluate((e) => e.getBoundingClientRect().width);
      expect(
        await frame.evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--composition-fill").trim(),
        ),
      ).toBe(v.height >= 720 && canvas >= 880 ? "1" : "0");
      if (state !== "no-context") {
        const r = (await rail.boundingBox())!,
          w = (await work.boundingBox())!;
        if (canvas >= 880) expect(r.x).toBeGreaterThan(w.x + w.width / 2);
        else expect(r.y).toBeGreaterThan(w.y + w.height - 1);
      }
      if (state === "long") {
        expect(
          await p.evaluate(() => document.documentElement.scrollHeight),
        ).toBeGreaterThan(v.height);
        expect(
          await work
            .locator("[data-project-task-list]")
            .evaluateAll((es) =>
              es.some((e) =>
                ["auto", "scroll"].includes(getComputedStyle(e).overflowY),
              ),
            ),
        ).toBe(false);
      }
      const row = work.locator(`[data-project-task="${task.id}"]`);
      await row
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      const dialog = p.getByRole("dialog", {
        name: "Task bearbeiten",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await bounds(p);
      await p.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await bounds(p);
      for (const name of [
        "Gewünschtes Ergebnis und Kriterien festlegen",
        "Beziehungen verwalten",
        "Project verwalten",
      ]) {
        await p
          .getByLabel("Project Header", { exact: true })
          .getByRole("button", { name, exact: true })
          .click();
        await expect(p.getByRole("dialog")).toBeVisible();
        await bounds(p);
        await p.keyboard.press("Escape");
        await expect(p.getByRole("dialog")).toBeHidden();
      }
      const path = info.outputPath(`project-${state}-${v.name}.png`);
      await p.screenshot({
        path,
        fullPage: true,
        style: "nextjs-portal {display:none!important}",
      });
      await info.attach(`project-${state}-${v.name}`, {
        path,
        contentType: "image/png",
      });
      await p.reload();
      await expect(work.locator("[data-project-task]")).toHaveCount(
        state === "long" ? 33 : 1,
      );
      await context.close();
    }
  };
  await matrix("no-context");
  const goal = (
    await api
      .from("goals")
      .insert({ user_id: uid, title: `#110 Context ${stamp}` })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .from("projects")
    .update({ goal_id: goal.id })
    .eq("id", project.id)
    .eq("user_id", uid)
    .throwOnError();
  await matrix("context");
  await api
    .from("tasks")
    .insert(
      Array.from({ length: 32 }, (_, i) => ({
        user_id: uid,
        project_id: project.id,
        title: `#110 Long ${i} ${stamp}`,
        status: "planned" as const,
      })),
    )
    .throwOnError();
  await matrix("long");
  // Real write proof is restricted to the exact synthetic task, never ordinary data.
  await page.goto(`/projects/${project.id}`, { waitUntil: "domcontentloaded" });
  const row = page.locator(`[data-project-task="${task.id}"]`);
  await row.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Task bearbeiten",
    exact: true,
  });
  const title = dialog.getByLabel("Titel", { exact: true });
  await title.fill(`#110 Edited ${stamp}`);
  for (const v of viewports) {
    await page.setViewportSize(v);
    await expect(title).toHaveValue(`#110 Edited ${stamp}`);
    await bounds(page);
  }
  await page.keyboard.press("Escape");
  await row.getByRole("button", { name: "Erledigt", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task abgeschlossen" }).last(),
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    row.getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await row
    .getByRole("link", { name: `${task.title}: Details öffnen` })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
  // Additional technical-user UI writes explicitly authorized by the user.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const quick = page.locator(".dashboard-quick");
  const capture = `#110 Capture ${stamp}`;
  await quick
    .getByRole("textbox", { name: "Quick Thought", exact: true })
    .fill(capture);
  await quick
    .getByRole("button", { name: "In Inbox speichern", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "In der Inbox gespeichert." }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Inbox", exact: true })
    .click();
  await expect(
    page
      .locator("#inbox-page")
      .getByRole("heading", { name: capture, exact: true }),
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page
      .locator("#inbox-page")
      .getByRole("heading", { name: capture, exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const mood = page.locator(".dashboard-mood");
  for (const name of [
    "Calm",
    "Focused",
    "Tired",
    "Anxious",
    "Stressed",
    "Happy",
  ]) {
    await mood.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Mood gespeichert." }).last(),
    ).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      mood.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  const habits = page.locator(".dashboard-habits");
  await habits.getByRole("button", { name: "Morning", exact: true }).click();
  await habits.getByRole("button", { name: /Add habit/i }).click();
  const habitDialog = page.getByRole("dialog");
  const habit = `#110 Habit ${stamp}`;
  await habitDialog.getByLabel("Name", { exact: true }).fill(habit);
  await habitDialog.getByLabel("Target", { exact: true }).fill("-1");
  await habitDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(habitDialog.getByRole("alert")).toContainText("Bitte prüfe");
  // Reopen after the rejected submission: uncontrolled form reset is async.
  await habitDialog
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(habitDialog).toBeHidden();
  await habits.getByRole("button", { name: /Add habit/i }).click();
  await habitDialog.locator('input[name="name"]').fill(habit);
  await habitDialog.locator('input[name="dailyTarget"]').fill("2");
  await habitDialog.getByLabel("Increment", { exact: true }).fill("1");
  await habitDialog.getByLabel("Unit", { exact: true }).fill("checks");
  await habitDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(habitDialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "Habit gespeichert." }).last(),
  ).toBeVisible();
  const habitCard = habits.getByRole("article").filter({
    has: page.getByRole("button", { name: `${habit} erhöhen`, exact: true }),
  });
  await habitCard
    .getByRole("button", { name: `${habit} erhöhen`, exact: true })
    .click();
  await expect(habitCard).toContainText("1 / 2 checks");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(habitCard).toContainText("1 / 2 checks");
  await habitCard
    .getByRole("button", { name: /Letzten Eintrag rückgängig machen/ })
    .click();
  await expect(habitCard).toContainText("0 / 2 checks");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(habitCard).toContainText("0 / 2 checks");
  for (const v of viewports) {
    await page.setViewportSize(v);
    await bounds(page);
    const path = info.outputPath(`technical-dashboard-${v.name}.png`);
    await page.screenshot({
      path,
      fullPage: true,
      style: "nextjs-portal{display:none!important}",
    });
    await info.attach(`technical-dashboard-${v.name}`, {
      path,
      contentType: "image/png",
    });
  }
  const notices = page.getByRole("button", {
    name: "Benachrichtigung schließen",
  });
  while (await notices.count()) await notices.first().click();
  expect(errors).toEqual([]);
});
