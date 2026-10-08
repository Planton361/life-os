import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test.use({ actionTimeout: 15000 });
const viewports = [
  { width: 3840, height: 2160 },
  { width: 1920, height: 1080 },
  { width: 769, height: 413 },
  { width: 390, height: 844 },
];
const header = (page: Page) => page.locator('[data-task-order="identity"]');
const edit = (page: Page) =>
  page.getByRole("dialog", { name: "Task bearbeiten", exact: true });

test("#123 B8 real Manual controls, state guards, races, reload and geometry", async ({
  page,
}, info) => {
  test.setTimeout(360000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "issue123", stamp);
  const cookie = (await page.context().cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(
    JSON.parse(
      Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
    ),
  );
  const uid = (await api.auth.getUser()).data.user!.id;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const goal = (
    await api
      .from("goals")
      .insert({ user_id: uid, title: `B8 Goal ${stamp}`, status: "active" })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Woche zuverlässig vorbereiten ${stamp}`,
        status: "active",
        goal_id: goal.id,
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .rpc("write_project_milestone", {
      p_project_id: project.id,
      p_operation: "save",
      p_title: "Fokusfenster sichern",
    })
    .throwOnError();
  const milestone = (
    await api
      .from("project_milestones")
      .select()
      .eq("project_id", project.id)
      .single()
      .throwOnError()
  ).data!;
  const today = new Date().toISOString().slice(0, 10);
  const task = (
    await api
      .from("tasks")
      .insert({
        user_id: uid,
        title: `Wochenplan klären ${stamp}`,
        status: "planned",
        priority: "P1",
        project_id: project.id,
        milestone_id: milestone.id,
        planned_date: today,
        due_at: today + "T20:00:00Z",
        description:
          "Termine und verfügbare Fokusfenster für die nächste Woche abgleichen.\n\nNächste Aktion: Feste Verpflichtungen zusammentragen.",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const visit = (id = task.id, query = "") => page.goto(`/tasks/${id}${query}`);
  await visit();
  await expect(
    header(page).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Task-Kontext" }),
  ).toContainText(goal.title);
  await expect(
    page.getByRole("complementary", { name: "Task-Kontext" }),
  ).toContainText("Ziel im Project");
  await expect(page.locator("[data-task-guidance]")).toHaveCount(1);
  await expect(page.locator("[data-task-supporting-depth]")).toHaveCount(0);
  // Header edit is the existing shared modal, with no hidden duplicate editor.
  const trigger = header(page).getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  await expect(edit(page).getByLabel("Titel", { exact: true })).toBeFocused();
  await expect(
    page.getByRole("form", { name: "Task bearbeiten", exact: true }),
  ).toHaveCount(1);
  for (let n = 0; n < 20; n++) {
    await page.keyboard.press("Tab");
    expect(
      await edit(page).evaluate((e) => e.contains(document.activeElement)),
    ).toBe(true);
  }
  await edit(page).getByLabel("Titel", { exact: true }).fill("Discard Escape");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: task.title, exact: true }),
  ).toBeVisible();
  await visit(task.id, "?edit=1");
  await expect(edit(page)).toBeVisible();
  await edit(page).getByLabel("Titel", { exact: true }).fill("Discard Cancel");
  await edit(page)
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  await expect(page).not.toHaveURL(/edit=1/);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await edit(page)
    .getByLabel("Titel", { exact: true })
    .fill("Wochenplan zuverlässig klären");
  await edit(page)
    .getByLabel("Duration (min)", { exact: true })
    .evaluate((e) => e.removeAttribute("min"));
  await edit(page).getByLabel("Duration (min)", { exact: true }).fill("-1");
  await edit(page)
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(edit(page).getByRole("alert")).toBeVisible();
  await expect(edit(page).getByLabel("Titel", { exact: true })).toHaveValue(
    "Wochenplan zuverlässig klären",
  );
  await edit(page).getByLabel("Duration (min)", { exact: true }).fill("45");
  await edit(page)
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task gespeichert." }).last(),
  ).toBeVisible();
  await expect(edit(page)).not.toBeVisible();
  await page.reload();
  await expect(header(page)).toContainText("Wochenplan zuverlässig klären");
  // Step operations remain independent from Task completion.
  await page
    .getByRole("button", { name: "Arbeitsschritte verwalten", exact: true })
    .click();
  await page
    .getByLabel("Neuer Arbeitsschritt", { exact: true })
    .fill("Verpflichtungen zusammentragen");
  await page
    .getByRole("button", { name: "Schritt hinzufügen", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Arbeitsschritt gespeichert." })
      .last(),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("region", { name: "Vorgehen" })
    .getByRole("button", { name: "Schritt erledigen", exact: true })
    .click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Vorgehen" })).toContainText(
    "1 von 1 erledigt",
  );
  await expect(header(page)).toContainText("Geplant");
  const inventories = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await visit();
    const canvas = page.locator('[data-task-detail-variant="B8"]');
    await expect(header(page)).toBeVisible();
    const geometry = await canvas.evaluate((e) => {
      const h = e.querySelector("header")!,
        w = e.querySelector('[data-task-order="work"]')!,
        c = e.querySelector("aside")!;
      const rect = (n: Element) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, bottom: r.bottom };
      };
      return {
        canvas: rect(e),
        header: rect(h),
        work: rect(w),
        context: rect(c),
        surface: getComputedStyle(h).backgroundColor,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.canvas.width).toBeLessThanOrEqual(1360);
    expect(geometry.header.x).toBe(geometry.canvas.x);
    expect(geometry.header.width).toBe(geometry.canvas.width);
    expect(geometry.surface).toBe("rgb(15, 23, 36)");
    if (viewport.width <= 930)
      expect(geometry.context.y).toBeGreaterThanOrEqual(geometry.work.bottom);
    else
      expect(geometry.context.x).toBeGreaterThanOrEqual(
        geometry.work.x + geometry.work.width,
      );
    inventories.push({
      viewport,
      geometry,
      controls: await canvas
        .locator("a,button,input,select,textarea")
        .evaluateAll((es) =>
          es
            .filter(
              (e) =>
                e.getClientRects().length && !e.closest("dialog:not([open])"),
            )
            .map((e) => ({
              tag: e.tagName,
              text: e.getAttribute("aria-label") ?? e.textContent?.trim(),
              href: e.getAttribute("href"),
            })),
        ),
    });
    const path = info.outputPath(`task-b8-${viewport.width}.png`);
    await page.screenshot({
      path,
      fullPage: true,
      style: "nextjs-portal{display:none!important}",
    });
    await info.attach(`task-b8-${viewport.width}`, {
      path,
      contentType: "image/png",
    });
    await trigger.click();
    await expect(edit(page)).toBeVisible();
    expect(
      await edit(page).evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
    ).toBe(true);
    await edit(page)
      .getByRole("button", { name: "Abbrechen", exact: true })
      .click();
  }
  await info.attach("B8 control inventory and geometry", {
    body: JSON.stringify(inventories, null, 2),
    contentType: "application/json",
  });
  await page.setViewportSize(viewports[1]);
  await visit();
  const calendar = header(page).getByRole("link", {
    name: "Im Calendar planen",
    exact: true,
  });
  await calendar.click();
  await expect(page).toHaveURL(new RegExp(`task=${task.id}.*view=week`));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Week", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    (
      await api
        .from("tasks")
        .select("scheduled_start_at")
        .eq("id", task.id)
        .single()
        .throwOnError()
    ).data!.scheduled_start_at,
  ).toBeNull();
  await page
    .getByRole("button", { name: "Schedule task", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await api
            .from("tasks")
            .select("scheduled_start_at")
            .eq("id", task.id)
            .single()
            .throwOnError()
        ).data!.scheduled_start_at,
    )
    .not.toBeNull();
  await visit();
  await header(page)
    .getByRole("link", { name: "Termin im Kalender öffnen", exact: true })
    .click();
  await expect(page.locator("[data-calendar-inspector]")).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Open task", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
  // A stale rendered completion must fail visibly when a predecessor is added.
  const predecessor = (
    await api
      .from("tasks")
      .insert({
        user_id: uid,
        project_id: project.id,
        title: `Blocker ${stamp}`,
        status: "planned",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await page
    .getByRole("button", { name: "Vorgänger verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Vorgänger hinzufügen", exact: true })
    .click();
  await page
    .getByLabel("Vorgänger", { exact: true })
    .selectOption(predecessor.id);
  await page
    .getByRole("button", { name: "Vorgänger speichern", exact: true })
    .click();
  await page.reload();
  await expect(
    header(page).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await header(page)
    .getByRole("link", { name: "Blocker prüfen", exact: true })
    .click();
  await expect(page).toHaveURL(/#task-dependencies/);
  await page
    .getByRole("button", { name: "Vorgänger verwalten", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Vorgänger entfernen: ${predecessor.title}`,
      exact: true,
    })
    .click();
  await page.reload();
  await expect(
    header(page).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  // Add behind the rendered page using the existing RPC (race fixture only).
  const add = await api.from("task_dependencies").insert({
    user_id: uid,
    project_id: project.id,
    predecessor_task_id: predecessor.id,
    successor_task_id: task.id,
  });
  expect(add.error).toBeNull();
  await header(page)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(header(page).getByRole("alert")).toBeVisible();
  expect(
    (
      await api
        .from("tasks")
        .select("status")
        .eq("id", task.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe("planned");
  await page.reload();
  await page
    .getByRole("button", { name: "Vorgänger verwalten", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Vorgänger entfernen: ${predecessor.title}`,
      exact: true,
    })
    .click();
  await page.reload();
  await header(page)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task abgeschlossen." }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(header(page)).toContainText("Abgeschlossen");
  await expect(
    header(page).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await api
        .from("projects")
        .select("status")
        .eq("id", project.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe("active");
  expect(
    (
      await api
        .from("goals")
        .select("status")
        .eq("id", goal.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe("active");
  expect(
    (
      await api
        .from("project_milestones")
        .select("status")
        .eq("id", milestone.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe(milestone.status);
  await page
    .getByRole("button", { name: "Mehr verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Status verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Task wieder öffnen", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Task wieder geöffnet." })
      .last(),
  ).toBeVisible();
  await page.reload();
  await expect(
    header(page).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  const otherGoal = (
    await api
      .from("goals")
      .insert({
        user_id: uid,
        title: `Direktes Ziel ${stamp}`,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .from("tasks")
    .update({ goal_id: goal.id })
    .eq("id", task.id)
    .throwOnError();
  await api
    .from("projects")
    .update({ goal_id: otherGoal.id })
    .eq("id", project.id)
    .throwOnError();
  await visit();
  const rail = page.getByRole("complementary", { name: "Task-Kontext" });
  await expect(rail).toContainText("unterschiedliche Ziele verknüpft");
  await expect(
    rail.getByRole("link", { name: goal.title, exact: true }),
  ).toHaveAttribute("href", `/goals/${goal.id}`);
  await expect(
    rail.getByRole("link", { name: otherGoal.title, exact: true }),
  ).toHaveAttribute("href", `/goals/${otherGoal.id}`);
  await rail.getByRole("link", { name: goal.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${goal.id}$`));
  await visit();
  await rail.getByRole("link", { name: project.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  await api
    .from("projects")
    .update({ goal_id: goal.id })
    .eq("id", project.id)
    .throwOnError();
  for (const state of [
    "inbox",
    "waiting",
    "active",
    "canceled",
    "done",
    "archived",
  ] as const) {
    const row = (
      await api
        .from("tasks")
        .insert({
          user_id: uid,
          title: `State ${state} ${stamp}`,
          status: state === "archived" ? "planned" : state,
          archived_at: state === "archived" ? new Date().toISOString() : null,
          completed_at: state === "done" ? new Date().toISOString() : null,
        })
        .select()
        .single()
        .throwOnError()
    ).data!;
    await visit(row.id);
    await expect(header(page)).toBeVisible();
    await expect(
      header(page).getByRole("button", { name: "Erledigt", exact: true }),
    ).toHaveCount(state === "active" ? 1 : 0);
    await expect(
      page.getByRole("complementary", { name: "Task-Kontext" }),
    ).toHaveCount(0);
    if (state === "active") {
      await page
        .getByRole("button", { name: "Mehr verwalten", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Status verwalten", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Task archivieren", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "Task archiviert." }).last(),
      ).toBeVisible();
      await page.reload();
      await expect(header(page)).toContainText("Archiviert");
      await expect(
        header(page).getByRole("button", { name: "Erledigt", exact: true }),
      ).toHaveCount(0);
    }
    if (state === "archived") await expect(trigger).toHaveCount(0);
  }
  // Source-owned review uses its own flow; forged generic completion is rejected.
  await page.goto("/review/daily");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Daily Review gespeichert." })
      .last(),
  ).toBeVisible();
  await page
    .locator('form[aria-label="Daily Review als Zeitblock planen"]')
    .getByRole("button", { name: "Im Calendar planen", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await api
            .from("schedule_source_links")
            .select("task_id")
            .eq("source_type", "review")
        ).data?.length ?? 0,
    )
    .toBe(1);
  const source = (
    await api
      .from("schedule_source_links")
      .select("task_id")
      .eq("source_type", "review")
      .single()
      .throwOnError()
  ).data!;
  await visit(source.task_id);
  await expect(
    header(page).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await header(page)
    .getByRole("link", { name: "Quelle öffnen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\/daily/);
  await visit();
  await page
    .getByRole("form", { name: "Erledigt", exact: true })
    .locator('input[name="taskId"]')
    .evaluate((e, id) => ((e as HTMLInputElement).value = id), source.task_id);
  await header(page)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(header(page).getByRole("alert")).toBeVisible();
  expect(
    (
      await api
        .from("tasks")
        .select("status")
        .eq("id", source.task_id)
        .single()
        .throwOnError()
    ).data!.status,
  ).not.toBe("done");
  await page.reload();
  await page
    .getByRole("form", { name: "Erledigt", exact: true })
    .locator('input[name="taskId"]')
    .evaluate((e) => ((e as HTMLInputElement).value = "not-a-task"));
  await header(page)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(header(page).getByRole("alert")).toBeVisible();
  expect(
    (
      await api
        .from("tasks")
        .select("status")
        .eq("id", task.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe("planned");
  // Fresh Manual profile has no borrowed Demo rows; unauthenticated detail has no writes.
  const anonymous = await page.context().browser()!.newContext();
  await anonymous.addCookies([
    {
      name: "life_os_profile",
      value: "manual",
      url: info.project.use.baseURL!,
    },
  ]);
  const blocked = await anonymous.newPage();
  await blocked.goto(`/tasks/${task.id}`);
  await expect(
    blocked
      .getByRole("status")
      .filter({
        hasText:
          "Diese Entity-Surface benötigt das Manual-Profil und eine lokale Anmeldung.",
      }),
  ).toBeVisible();
  await expect(
    blocked.getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await anonymous.close();
  expect(errors).toEqual([]);
});
