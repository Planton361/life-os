import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test.use({ actionTimeout: 15000 });

const viewports = [
  { width: 3840, height: 2160 },
  { width: 1920, height: 1080 },
  { width: 1440, height: 1080 },
  { width: 390, height: 844 },
];
async function screenshot(page: Page, info: TestInfo, name: string) {
  if (name.startsWith("project-")) {
    await expect(
      page.getByRole("region", { name: "Tasks & Progress", exact: true }),
    ).toBeVisible();
  }
  const path = info.outputPath(`${name}.png`);
  const modalOpen = await page.locator("dialog:modal").count();
  await page.screenshot({
    path,
    fullPage: true,
    caret: "initial",
    style: "nextjs-portal { display:none!important }",
    mask: modalOpen
      ? []
      : [
          page.getByText("Anton", { exact: true }),
          page.getByText("Student · Werkstudent", { exact: true }),
        ],
  });
  await info.attach(name, { path, contentType: "image/png" });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function fixture(page: Page, prefix: string) {
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, prefix, stamp);
  const cookie = (await page.context().cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  const uid = (await api.auth.getUser()).data.user!.id;
  return { api, uid, stamp };
}

test("#85 Project Work states, lifecycle guards and shared accessible Task edit", async ({
  page,
}, info) => {
  test.setTimeout(360000);
  const { api, uid, stamp } = await fixture(page, "issue85work");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Final Project ${stamp}`,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const visit = () => page.goto(`/projects/${project.id}`);
  const work = () =>
    page.getByRole("region", { name: "Tasks & Progress", exact: true });
  const row = (id: string) => work().locator(`[data-project-task="${id}"]`);
  const captureState = async (name: string) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await noOverflow(page);
      await screenshot(page, info, `${name}-${viewport.width}`);
    }
    await page.setViewportSize(viewports[1]);
  };
  await visit();
  await expect(
    work().getByRole("link", { name: "Erste Task anlegen", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Project Context Rail" }),
  ).toHaveCount(0);
  await expect(
    work().getByRole("region", { name: "Ohne Milestone", exact: true }),
  ).toHaveCount(0);
  await captureState("project-empty");
  // Exercise the actual capture entry and no-write cancellation.
  await work()
    .getByRole("link", { name: "Erste Task anlegen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/new\?project=/);
  await page.getByRole("link", { name: "Abbrechen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  const task = (
    await api
      .from("tasks")
      .insert({
        user_id: uid,
        project_id: project.id,
        title: `Execute once ${stamp}`,
        status: "planned",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  expect(
    (
      await api.rpc("write_project_milestone", {
        p_project_id: project.id,
        p_operation: "save",
        p_title: `Quiet milestone ${stamp}`,
      })
    ).error,
  ).toBeNull();
  const milestone = (
    await api
      .from("project_milestones")
      .select()
      .eq("project_id", project.id)
      .single()
      .throwOnError()
  ).data!;
  await visit();
  await expect(
    work().getByRole("link", { name: task.title, exact: true }),
  ).toHaveCount(1);
  await expect(work()).not.toContainText("Dependency READY 1");
  await expect(work()).not.toContainText("0 erledigt");
  await expect(row(task.id)).toHaveAttribute("data-primary-task", "true");
  await expect(
    row(task.id).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  const emptyMilestone = work().getByRole("region", {
    name: `Milestone: ${milestone.title}`,
    exact: true,
  });
  await expect(emptyMilestone).toContainText("Noch keine Tasks.");
  expect((await emptyMilestone.boundingBox())!.height).toBeLessThan(160);
  await expect(
    work().getByRole("region", { name: "Ohne Milestone", exact: true }),
  ).toContainText(task.title);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    const workspace = await page
      .locator("[data-project-workspace]")
      .boundingBox();
    const bounds = await work().boundingBox();
    expect(bounds!.width).toBeGreaterThan(workspace!.width * 0.95);
    await screenshot(page, info, `project-one-ready-${viewport.width}`);
  }
  await page.setViewportSize(viewports[1]);
  const trigger = row(task.id).getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  const dialog = () =>
    page.getByRole("dialog", { name: "Task bearbeiten", exact: true });
  const title = () => dialog().getByLabel("Titel", { exact: true });
  await expect(
    page.getByRole("form", { name: "Task bearbeiten", exact: true }),
  ).toHaveCount(0);
  await trigger.click();
  await expect(title()).toBeFocused();
  const editFieldOrder = await dialog()
    .locator("input[name], textarea[name], select[name]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("name")),
    );
  await expect(
    dialog().getByRole("button", { name: "Task abschließen", exact: true }),
  ).toHaveCount(0);
  await expect(dialog().getByLabel("Status", { exact: true })).toHaveCount(0);
  expect(await dialog().evaluate((e) => e.matches(":modal"))).toBe(true);
  await page
    .getByRole("button", { name: "Project verwalten", exact: true })
    .evaluate((e) => (e as HTMLElement).focus());
  expect(
    await dialog().evaluate((e) => e.contains(document.activeElement)),
  ).toBe(true);
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog().evaluate((e) => e.contains(document.activeElement)),
    ).toBe(true);
  }
  await title().fill("Discard Escape");
  await page.keyboard.press("Escape");
  await expect(dialog()).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(row(task.id)).toContainText(task.title);
  await trigger.click();
  await title().fill("Discard Cancel");
  await dialog()
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(row(task.id)).toContainText(task.title);
  await trigger.click();
  await title().fill("Validation draft");
  // Tamper only the client min guard to exercise the real server Zod rejection.
  await dialog()
    .getByLabel("Duration (min)", { exact: true })
    .evaluate((e) => e.removeAttribute("min"));
  await dialog().getByLabel("Duration (min)", { exact: true }).fill("-1");
  await dialog()
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(dialog().getByRole("alert")).toBeVisible();
  await expect(title()).toHaveValue("Validation draft");
  await dialog().getByRole("alert").scrollIntoViewIfNeeded();
  await screenshot(page, info, "task-modal-validation-error");
  await dialog().getByLabel("Duration (min)", { exact: true }).fill("");
  const projectSelect = dialog().getByLabel("Project", { exact: true });
  const invalidProject = "00000000-0000-4000-8000-000000000085";
  await projectSelect.evaluate((element, id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = "Unavailable Project";
    element.append(option);
  }, invalidProject);
  await projectSelect.selectOption(invalidProject);
  await dialog()
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(dialog().getByRole("alert")).toContainText(
    "Project konnte nicht bestätigt",
  );
  await expect(title()).toHaveValue("Validation draft");
  await projectSelect.selectOption(project.id);
  const edited = `Edited once ${stamp}`;
  await title().fill(edited);
  await dialog()
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(dialog()).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole("status").filter({ hasText: "gespeichert" }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(row(task.id)).toContainText(edited);
  // Details is a real depth navigation; the same dialog is used here.
  await row(task.id)
    .getByRole("link", { name: `${edited}: Details öffnen`, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(edited);
  const detailEdit = page.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  for (const viewport of [viewports[0], viewports[1]]) {
    await page.setViewportSize(viewport);
    await screenshot(page, info, `task-detail-${viewport.width}`);
  }
  await detailEdit.click();
  await expect(title()).toBeFocused();
  expect(
    await dialog()
      .locator("input[name], textarea[name], select[name]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("name")),
      ),
  ).toEqual(editFieldOrder);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    const geometry = await dialog().evaluate((e) => ({
      x: e.getBoundingClientRect().x,
      width: e.getBoundingClientRect().width,
      height: e.getBoundingClientRect().height,
      scroll: e.scrollHeight,
      client: e.clientHeight,
    }));
    expect(geometry.width).toBeLessThan(viewport.width);
    expect(
      Math.abs(geometry.x - (viewport.width - geometry.width) / 2),
    ).toBeLessThan(2);
    expect(geometry.height).toBeLessThan(viewport.height);
    if (viewport.width === 390)
      expect(geometry.scroll).toBeGreaterThan(geometry.client);
    await screenshot(page, info, `task-modal-${viewport.width}`);
  }
  await title().fill("Discard Detail Cancel");
  await dialog()
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  await expect(detailEdit).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(edited);
  await detailEdit.click();
  const detailTitle = `Detail edited ${stamp}`;
  await title().fill(detailTitle);
  await dialog()
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(dialog()).not.toBeVisible();
  await expect(detailEdit).toBeFocused();
  await expect(
    page.getByRole("status").filter({ hasText: "gespeichert" }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(detailTitle);
  await page.goto(`/tasks/${task.id}?edit=1`);
  await expect(dialog()).toBeVisible();
  await title().fill("Discard direct-edit Escape");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
  await expect(detailEdit).toBeFocused();
  await page.reload();
  await expect(dialog()).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(detailTitle);
  await page.setViewportSize(viewports[1]);
  await visit();
  // Existing completion boundary, feedback, reload, no automatic parent completion.
  await row(task.id)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task abgeschlossen" }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(row(task.id)).toContainText("done");
  await expect(
    row(task.id).getByRole("button", { name: "Erledigt", exact: true }),
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
        .from("project_milestones")
        .select("status")
        .eq("id", milestone.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe("open");
  const extra = (
    await api
      .from("tasks")
      .insert([
        {
          user_id: uid,
          project_id: project.id,
          title: `Choice A ${stamp}`,
          status: "planned",
        },
        {
          user_id: uid,
          project_id: project.id,
          title: `Choice B ${stamp}`,
          status: "active",
        },
        {
          user_id: uid,
          project_id: project.id,
          title: `Waiting predecessor ${stamp}`,
          status: "waiting",
        },
        {
          user_id: uid,
          project_id: project.id,
          title: `Archived ${stamp}`,
          status: "planned",
          archived_at: new Date().toISOString(),
        },
      ])
      .select()
      .throwOnError()
  ).data!;
  const [a, b, predecessor, archived] = extra;
  await visit();
  await expect(work()).toContainText("Wähle selbst");
  await expect(work().locator('[data-primary-task="true"]')).toHaveCount(0);
  await expect(
    row(a.id).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await expect(
    row(b.id).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await expect(row(archived.id)).toHaveCount(0);
  await captureState("project-multiple-ready");
  // Stale rendered eligibility: add a real Dependency after read, then click existing control.
  expect(
    (
      await api.from("task_dependencies").insert({
        user_id: uid,
        project_id: project.id,
        predecessor_task_id: predecessor.id,
        successor_task_id: a.id,
      })
    ).error,
  ).toBeNull();
  await row(a.id)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(row(a.id).getByRole("alert")).toBeVisible();
  expect(
    (
      await api
        .from("tasks")
        .select("status")
        .eq("id", a.id)
        .single()
        .throwOnError()
    ).data!.status,
  ).toBe("planned");
  expect(
    (
      await api.from("task_dependencies").insert({
        user_id: uid,
        project_id: project.id,
        predecessor_task_id: predecessor.id,
        successor_task_id: b.id,
      })
    ).error,
  ).toBeNull();
  await page.reload();
  await expect(work()).toContainText("Alle ausführbaren Tasks sind BLOCKED");
  await expect(
    row(a.id).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await expect(
    row(b.id).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await row(a.id)
    .getByRole("link", { name: predecessor.title, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${predecessor.id}$`));
  await visit();
  await captureState("project-all-blocked");
  const meal = (
    await api
      .from("meals")
      .insert({
        user_id: uid,
        date: "2026-10-01",
        meal_type: "lunch",
        title: `Source meal ${stamp}`,
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const linked = await api.rpc("schedule_linked_source", {
    p_source_type: "meal",
    p_source_id: meal.id,
    p_planned_date: "2026-10-01",
    p_scheduled_start_at: "2026-10-01T10:00:00Z",
    p_duration_minutes: 30,
  });
  expect(linked.error).toBeNull();
  const sourceTask = linked.data as unknown as { id: string };
  await api
    .from("tasks")
    .update({ project_id: project.id })
    .eq("id", sourceTask.id)
    .throwOnError();
  await visit();
  await expect(row(sourceTask.id)).toBeVisible();
  await expect(
    row(sourceTask.id).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await row(sourceTask.id)
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  await expect(dialog()).toContainText(
    "Planung über die verantwortliche Quelle",
  );
  await dialog()
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  const goal = (
    await api
      .from("goals")
      .insert({ user_id: uid, title: `Meaningful Goal ${stamp}` })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .from("projects")
    .update({ goal_id: goal.id })
    .eq("id", project.id)
    .throwOnError();
  await visit();
  const rail = page.getByRole("complementary", {
    name: "Project Context Rail",
    exact: true,
  });
  await expect(rail).toContainText(goal.title);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    await screenshot(
      page,
      info,
      `project-meaningful-context-${viewport.width}`,
    );
  }
  await rail.getByRole("link", { name: goal.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${goal.id}$`));
  await visit();
  await page
    .getByRole("button", { name: "Beziehungen verwalten", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Beziehungen verwalten", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await work()
    .getByRole("button", { name: "Weitere Work-Optionen", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Weitere Work-Optionen", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await emptyMilestone
    .getByRole("button", { name: "Milestone verwalten", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Milestone verwalten", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("#85 canonical Task Create inner composition and bounded desktop/portrait width", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await fixture(page, "issue85width");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/tasks/new");
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(form.getByLabel("Titel", { exact: true })).toBeVisible();
    const optional = form.getByRole("button", {
      name: "Weitere Angaben (optional)",
      exact: true,
    });
    await expect(optional).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("heading", { name: "Task erstellen", exact: true }),
    ).toBeVisible();
    const width = (await form.boundingBox())!.width;
    if (viewport.width >= 1920) {
      expect(width).toBeGreaterThan(1000);
      expect(width).toBeLessThanOrEqual(1440);
    }
    if (viewport.width === 1440) expect(width).toBeGreaterThan(1000);
    await noOverflow(page);
    await screenshot(page, info, `task-create-collapsed-${viewport.width}`);
    await optional.click();
    await expect(optional).toHaveAttribute("aria-expanded", "true");
    // Assert real input geometry, not just a CSS class.
    const priority = await form
      .getByLabel("Priority", { exact: true })
      .boundingBox();
    const energy = await form
      .getByLabel("Energy", { exact: true })
      .boundingBox();
    if (viewport.width >= 1440) {
      expect(Math.abs(priority!.y - energy!.y)).toBeLessThan(4);
      expect(energy!.x).toBeGreaterThan(priority!.x);
    } else expect(energy!.y).toBeGreaterThan(priority!.y);
    await noOverflow(page);
    await screenshot(page, info, `task-create-expanded-${viewport.width}`);
    await optional.click();
  }
  await page.goto("/projects/new");
  expect(
    (await page
      .getByRole("form", { name: "Project erstellen", exact: true })
      .boundingBox())!.width,
  ).toBeLessThanOrEqual(1000);
  expect(errors).toEqual([]);
});
