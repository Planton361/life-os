import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("Project milestones: CRUD, grouping, ordering, progress, archive and ownership", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "r209milestone", stamp);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const cookie = (await context.cookies()).find((c) =>
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
  const projects = (
    await api
      .from("projects")
      .insert([
        { user_id: uid, title: `Thesis ${stamp}` },
        { user_id: uid, title: `Other ${stamp}` },
      ])
      .select()
  ).data!;
  const p = projects[0];
  const tasks = (
    await api
      .from("tasks")
      .insert(
        ["Read paper", "Build prototype", "Backlog"].map((title) => ({
          user_id: uid,
          project_id: p.id,
          title: `${title} ${stamp}`,
        })),
      )
      .select()
  ).data!;
  const work = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  const group = (title: string) =>
    work.getByRole("region", { name: `Milestone: ${title}`, exact: true });
  const saved = () =>
    page
      .getByRole("status")
      .filter({ hasText: "Milestone gespeichert" })
      .last();
  await page.goto(`/projects/${p.id}`);
  await expect(
    work.getByRole("region", { name: "Ohne Milestone", exact: true }),
  ).toContainText(tasks[0].title);
  await expect(work).toContainText("Noch keine Milestones.");
  await expect(
    work.locator(
      "input:not([type=hidden]):visible, select:visible, textarea:visible",
    ),
  ).toHaveCount(0);
  const assignmentTrigger = work.getByRole("button", {
    name: "Tasks zuordnen",
    exact: true,
  });
  await assignmentTrigger.click();
  await expect(assignmentTrigger).toHaveAttribute("aria-expanded", "true");
  await work.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(assignmentTrigger).toBeFocused();
  await assignmentTrigger.click();
  await page.keyboard.press("Escape");
  await expect(assignmentTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(assignmentTrigger).toBeFocused();
  for (const title of ["Research", "Implementation"]) {
    await work
      .getByRole("button", { name: "Milestone hinzufügen", exact: true })
      .click();
    const form = work.getByRole("form", {
      name: "Milestone erstellen",
      exact: true,
    });
    await form.getByLabel("Titel", { exact: true }).fill(title);
    await form
      .getByLabel("Outcome / Beschreibung")
      .fill(`${title} Ergebnis überprüfbar`);
    await form.getByLabel("Target Date").fill("2026-10-20");
    await form
      .getByRole("button", { name: "Milestone erstellen", exact: true })
      .click();
    await expect(saved()).toBeVisible();
    await page.reload();
    await expect(group(title)).toBeVisible();
  }
  const stages = (
    await api
      .from("project_milestones")
      .select("*")
      .eq("project_id", p.id)
      .order("sort_order")
  ).data!;
  async function assign(taskId: string, stageId: string) {
    await work
      .getByRole("button", { name: "Tasks zuordnen", exact: true })
      .click();
    const form = work.getByRole("form", {
      name: "Task-Milestone speichern",
      exact: true,
    });
    await form.getByLabel("Task", { exact: true }).selectOption(taskId);
    await form
      .getByLabel("Milestone (keine Auswahl = Ohne Milestone)")
      .selectOption(stageId);
    await form.getByRole("button").click();
    await expect(saved()).toBeVisible();
    await expect(form).toBeHidden();
    await expect(assignmentTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(assignmentTrigger).toBeFocused();
    const destination = stageId
      ? group(stages.find((stage) => stage.id === stageId)!.title)
      : work.getByRole("region", { name: "Ohne Milestone", exact: true });
    await expect(destination).toContainText(
      tasks.find((task) => task.id === taskId)!.title,
    );
    await page.reload();
  }
  await assign(tasks[0].id, stages[0].id);
  await assign(tasks[1].id, stages[1].id);
  await assign(tasks[2].id, stages[0].id);
  await assign(tasks[2].id, stages[1].id);
  await assign(tasks[2].id, "");
  await expect(
    work.locator(
      "input:not([type=hidden]):visible, select:visible, textarea:visible",
    ),
  ).toHaveCount(0);
  await expect(group("Research")).toContainText(tasks[0].title);
  await expect(group("Implementation")).toContainText(tasks[1].title);
  await group("Research")
    .getByRole("link", { name: tasks[0].title, exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Task Milestone", exact: true }),
  ).toContainText("Research");
  await page
    .getByRole("button", { name: "Task abschließen", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /abgeschlossen|erledigt|gespeichert/ })
      .last(),
  ).toBeVisible();
  await page.goto(`/projects/${p.id}`);
  await expect(group("Research")).toContainText("1/1 Tasks erledigt");
  await expect(group("Research")).toContainText("Offen"); // never auto-completed
  await page.reload();
  await expect(work).toContainText("1/3 Tasks erledigt");
  await page.goto(`/tasks/${tasks[0].id}`);
  const taskContext = page.getByRole("region", {
    name: "Task Milestone",
    exact: true,
  });
  await taskContext
    .getByRole("button", { name: "Milestone-Zuordnung ändern", exact: true })
    .click();
  await taskContext
    .getByLabel("Milestone (keine Auswahl = Ohne Milestone)")
    .selectOption("");
  await taskContext
    .getByRole("button", { name: "Task-Milestone speichern", exact: true })
    .click();
  await expect(saved()).toBeVisible();
  await page.reload();
  await expect(taskContext).toContainText("Ohne Milestone");
  await taskContext
    .getByRole("link", { name: "Project Workbench öffnen" })
    .click();
  await expect(
    work.getByRole("region", { name: "Ohne Milestone", exact: true }),
  ).toContainText(tasks[0].title);
  await group("Implementation")
    .getByRole("button", { name: "Milestone verwalten", exact: true })
    .click();
  await group("Implementation")
    .getByRole("button", { name: "Nach oben", exact: true })
    .click();
  await expect(saved()).toBeVisible();
  await page.reload();
  await expect(work.locator("[data-milestone-id]").first()).toHaveAttribute(
    "data-milestone-id",
    stages[1].id,
  );
  await group("Implementation")
    .getByRole("button", { name: "Milestone verwalten", exact: true })
    .click();
  await group("Implementation")
    .getByRole("button", { name: "Nach unten", exact: true })
    .click();
  await expect(saved()).toBeVisible();
  await page.reload();
  await expect(work.locator("[data-milestone-id]").first()).toHaveAttribute(
    "data-milestone-id",
    stages[0].id,
  );
  async function edit(title: string, status: string) {
    await group(title)
      .getByRole("button", { name: "Milestone verwalten", exact: true })
      .click();
    const form = group(title).getByRole("form", {
      name: "Milestone speichern",
      exact: true,
    });
    await form.getByLabel("Status", { exact: true }).selectOption(status);
    await form.getByRole("button").click();
    await expect(saved()).toBeVisible();
    await page.reload();
  }
  await edit("Implementation", "active");
  await edit("Research", "active");
  await expect(group("Implementation")).toContainText("Offen");
  await expect(group("Research")).toContainText("Aktuell");
  await edit("Research", "done");
  await expect(work).toContainText("1/2 Milestones erledigt");
  await expect(work.locator("[data-milestone-id]").last()).toHaveAttribute(
    "data-milestone-id",
    stages[0].id,
  );
  await edit("Research", "open");
  await group("Research")
    .getByRole("button", { name: "Milestone verwalten", exact: true })
    .click();
  const update = group("Research").getByRole("form", {
    name: "Milestone speichern",
    exact: true,
  });
  await update.getByLabel("Titel", { exact: true }).fill("Research refined");
  await update.getByLabel("Outcome / Beschreibung").fill("Evidence reviewed");
  await update.getByLabel("Target Date").fill("2026-11-01");
  await update.getByRole("button").click();
  await expect(saved()).toBeVisible();
  await page.reload();
  await expect(group("Research refined")).toContainText("Evidence reviewed");
  await expect(group("Research refined")).toContainText("01.11.2026");
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`milestones-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
    await assignmentTrigger.click();
    const assignment = work.getByRole("form", {
      name: "Task-Milestone speichern",
      exact: true,
    });
    await expect(assignment).toBeVisible();
    const bounds = await assignment.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`assignment-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(assignment).toBeHidden();
  }
  // Owned foreign Project still cannot supply a stage or receive an assigned task.
  const other = (
    await api
      .from("project_milestones")
      .insert({
        user_id: uid,
        project_id: projects[1].id,
        title: "Foreign Project",
      })
      .select()
      .single()
  ).data!;
  expect(
    (
      await api
        .from("tasks")
        .update({ milestone_id: other.id })
        .eq("id", tasks[1].id)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await api
        .from("tasks")
        .update({ project_id: projects[1].id })
        .eq("id", tasks[1].id)
    ).error,
  ).not.toBeNull();
  expect(
    (await api.from("tasks").update({ project_id: null }).eq("id", tasks[1].id))
      .error,
  ).not.toBeNull();
  expect(
    (
      await api.rpc("write_project_milestone", {
        p_project_id: p.id,
        p_operation: "assign",
        p_task_id: tasks[1].id,
        p_milestone_id: other.id,
      })
    ).error,
  ).not.toBeNull();
  // Cross-user denial through both direct API and RPC.
  const stranger = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signup = await stranger.auth.signUp({
    email: `r209foreign-${stamp}@example.test`,
    password: `Test-only-${stamp}-Aa!`,
  });
  expect(signup.error).toBeNull();
  expect(
    (
      await stranger.rpc("write_project_milestone", {
        p_project_id: p.id,
        p_operation: "save",
        p_title: "forbidden",
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await stranger.from("project_milestones").insert({
        user_id: signup.data.user!.id,
        project_id: p.id,
        title: "forbidden",
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await stranger
        .from("project_milestones")
        .select("id")
        .eq("project_id", p.id)
    ).data,
  ).toEqual([]);
  const strangerProject = (
    await stranger
      .from("projects")
      .insert({ user_id: signup.data.user!.id, title: "Stranger project" })
      .select()
      .single()
  ).data!;
  const strangerStage = (
    await stranger
      .from("project_milestones")
      .insert({
        user_id: signup.data.user!.id,
        project_id: strangerProject.id,
        title: "Stranger stage",
      })
      .select()
      .single()
  ).data!;
  expect(
    (
      await api
        .from("tasks")
        .update({ milestone_id: strangerStage.id })
        .eq("id", tasks[1].id)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await api.rpc("write_project_milestone", {
        p_project_id: p.id,
        p_operation: "assign",
        p_task_id: tasks[1].id,
        p_milestone_id: strangerStage.id,
      })
    ).error,
  ).not.toBeNull();
  const anonymous = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (
      await anonymous.rpc("write_project_milestone", {
        p_project_id: p.id,
        p_operation: "save",
        p_title: "forbidden",
      })
    ).error,
  ).not.toBeNull();
  // Concurrent current-stage selection remains a single active milestone.
  const results = await Promise.all(
    stages.map((m) =>
      api.rpc("write_project_milestone", {
        p_project_id: p.id,
        p_operation: "save",
        p_milestone_id: m.id,
        p_title: m.title,
        p_status: "active",
      }),
    ),
  );
  results.forEach((r) => expect(r.error).toBeNull());
  expect(
    (
      await api
        .from("project_milestones")
        .select("id")
        .eq("project_id", p.id)
        .eq("status", "active")
    ).data,
  ).toHaveLength(1);
  await page.reload();
  await group("Implementation")
    .getByRole("button", { name: "Milestone verwalten", exact: true })
    .click();
  await group("Implementation")
    .getByRole("button", { name: "Milestone archivieren", exact: true })
    .click();
  await expect(saved()).toBeVisible();
  await page.reload();
  await expect(
    work.getByRole("region", { name: "Ohne Milestone", exact: true }),
  ).toContainText(tasks[1].title);
  await expect(group("Implementation")).toHaveCount(0);
  await work
    .getByRole("button", { name: "Archivierte Milestones · 1", exact: true })
    .click();
  await expect(work).toContainText("Implementation · Archiviert");
  expect(
    (
      await api
        .from("tasks")
        .update({ milestone_id: stages[1].id })
        .eq("id", tasks[1].id)
    ).error,
  ).not.toBeNull();
  expect(
    (await api.from("tasks").select("id").eq("project_id", p.id)).data,
  ).toHaveLength(3);
  // Archiving a Project must not trap a still-active Task in its former stage.
  const oldTask = (
    await api
      .from("tasks")
      .insert({
        user_id: uid,
        project_id: projects[1].id,
        milestone_id: other.id,
        title: "Move after Project archive",
      })
      .select()
      .single()
  ).data!;
  await api
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", projects[1].id);
  await page.goto(`/tasks/${oldTask.id}`);
  await taskContext
    .getByRole("button", { name: "Milestone-Zuordnung ändern", exact: true })
    .click();
  await taskContext
    .getByRole("button", { name: "Task-Milestone speichern", exact: true })
    .click();
  await expect(saved()).toBeVisible();
  await page.reload();
  await expect(taskContext).toContainText("Ohne Milestone");
  expect(
    (
      await api
        .from("tasks")
        .update({ milestone_id: other.id })
        .eq("id", oldTask.id)
    ).error,
  ).not.toBeNull();
  expect(
    (await api.from("tasks").update({ project_id: p.id }).eq("id", oldTask.id))
      .error,
  ).toBeNull();
  // A stage archived after opening the picker fails visibly, without assigning.
  await page.goto(`/tasks/${tasks[2].id}`);
  await taskContext
    .getByRole("button", { name: "Milestone-Zuordnung ändern", exact: true })
    .click();
  await taskContext
    .getByLabel("Milestone (keine Auswahl = Ohne Milestone)")
    .selectOption(stages[0].id);
  expect(
    (
      await api
        .from("project_milestones")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", stages[0].id)
    ).error,
  ).toBeNull();
  await taskContext
    .getByRole("button", { name: "Task-Milestone speichern", exact: true })
    .click();
  await expect(taskContext.getByRole("alert")).toContainText(
    "Prüfe die Angaben",
  );
  await page.reload();
  await expect(taskContext).toContainText("Ohne Milestone");
  expect(errors).toEqual([]);
});
