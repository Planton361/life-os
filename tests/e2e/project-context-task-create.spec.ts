import {
  expectTaskCaptureParity,
  standaloneTaskCapture,
} from "./support/task-create-parity";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("canonical Task create from Project, Milestone and Backlog preserves context and returns", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "project-create", stamp);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const cookie = (await context.cookies()).find((c) =>
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
  const projects = (
    await api
      .from("projects")
      .insert([
        { user_id: uid, title: `Context ${stamp}`, status: "active" },
        { user_id: uid, title: `Alternative ${stamp}`, status: "active" },
      ])
      .select()
      .throwOnError()
  ).data!;
  const project = projects[0];
  const stages = (
    await api
      .from("project_milestones")
      .insert(
        ["Research", "Build"].map((title, sort_order) => ({
          sort_order,
          status: sort_order === 0 ? ("active" as const) : ("open" as const),
          user_id: uid,
          project_id: project.id,
          title,
        })),
      )
      .select()
      .throwOnError()
  ).data!;
  const alternativeStages = (
    await api
      .from("project_milestones")
      .insert({
        sort_order: 0,
        status: "active",
        user_id: uid,
        project_id: projects[1].id,
        title: "Alternative research",
      })
      .select()
      .throwOnError()
  ).data!;
  const work = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  const backlog = work.getByRole("region", {
    name: "Ohne Milestone",
    exact: true,
  });
  const stage = (id: string) => work.locator(`[data-milestone-id="${id}"]`);
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  const submit = () =>
    form.getByRole("button", { name: "Task erstellen", exact: true }).click();
  const baseline = await standaloneTaskCapture(page);
  const created: string[] = [];
  for (const mode of [
    "project",
    "milestone",
    "unassigned",
    "change-stage",
    "switch-project",
  ]) {
    await page.goto(`/projects/${project.id}`);
    const trigger =
      mode === "project"
        ? work.getByRole("link", {
            name: "Erste Task anlegen",
            exact: true,
          })
        : work.getByRole("link", { name: "+ Task", exact: true });
    const triggerHref = await trigger.getAttribute("href");
    await trigger.click();
    await expect(page).toHaveURL(/\/tasks\/new\?project=/);
    await expect(form).toHaveAttribute("data-task-capture-title-first", "true");
    const preset =
      new URL(triggerHref!, "http://localhost").searchParams.get("milestone") ??
      "";
    await expect(form.getByLabel("Titel", { exact: true })).toBeVisible();
    await expect(
      form.getByRole("link", { name: "Abbrechen", exact: true }),
    ).toHaveAttribute("href", `/projects/${project.id}`);
    await expectTaskCaptureParity(page, baseline);
    const optionalDetails = form.getByRole("button", {
      name: "Weitere Angaben (optional)",
      exact: true,
    });
    await expect(optionalDetails).toHaveAttribute("aria-expanded", "false");
    await expect(form.getByLabel("Project", { exact: true })).toBeHidden();
    await page.reload();
    await expectTaskCaptureParity(page, baseline);
    await expect(optionalDetails).toHaveAttribute("aria-expanded", "false");
    await optionalDetails.click();
    const projectSelect = form.getByLabel("Project", { exact: true });
    const milestoneSelect = form.getByLabel("Project Milestone", {
      exact: true,
    });
    await expect(projectSelect).toHaveValue(project.id);
    await expect(projectSelect).toHaveAttribute("required", "");
    await expect(projectSelect.locator('option[value=""]')).toHaveCount(0);
    await expect(milestoneSelect).toHaveValue(preset);
    let destination =
      mode === "change-stage"
        ? stages[1].id
        : mode === "unassigned"
          ? ""
          : preset;
    let targetProject = project;
    if (mode === "switch-project") {
      targetProject = projects[1];
      await projectSelect.selectOption(targetProject.id);
      await expect(milestoneSelect).toHaveValue("");
      await expect(
        milestoneSelect.locator(`option[value="${stages[0].id}"]`),
      ).toHaveCount(0);
      await expect(projectSelect).toHaveValue(targetProject.id);
      await expect(form.locator("[data-task-capture-context]")).toHaveCount(0);
      destination = alternativeStages[0].id;
      await milestoneSelect.selectOption(destination);
    }
    if (mode === "change-stage")
      await milestoneSelect.selectOption(destination);
    if (mode === "unassigned") await milestoneSelect.selectOption("");
    const title = `${mode} task ${stamp}`;
    await form.getByLabel("Titel", { exact: true }).fill(title);
    await submit();
    await expect(page).toHaveURL(new RegExp(`/projects/${targetProject.id}$`));
    await expect(
      page.getByRole("status").filter({ hasText: "Task erstellt." }).last(),
    ).toBeVisible();
    const region = destination ? stage(destination) : backlog;
    await expect(
      region.getByRole("link", { name: title, exact: true }),
    ).toHaveCount(1);
    await page.reload();
    await expect(
      region.getByRole("link", { name: title, exact: true }),
    ).toHaveCount(1);
    const rows = (
      await api
        .from("tasks")
        .select("id,project_id,milestone_id,status")
        .eq("user_id", uid)
        .eq("title", title)
    ).data!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      project_id: targetProject.id,
      milestone_id: destination || null,
      status: "planned",
    });
    created.push(rows[0].id);
    await region.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${rows[0].id}$`));
    const taskContext = page.locator("[data-task-context]");
    await expect(taskContext).toContainText(targetProject.title);
    const destinationMilestone = [...stages, ...alternativeStages].find(
      (milestone) => milestone.id === destination,
    );
    if (destinationMilestone)
      await expect(taskContext).toContainText(destinationMilestone.title);
    else await expect(taskContext).not.toContainText("Milestone");
  }
  const standaloneTitle = `global task ${stamp}`;
  await page.goto("/tasks/new");
  await form.getByLabel("Titel", { exact: true }).fill(standaloneTitle);
  await submit();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  const standaloneRows = (
    await api
      .from("tasks")
      .select("id,project_id")
      .eq("user_id", uid)
      .eq("title", standaloneTitle)
  ).data!;
  expect(standaloneRows).toHaveLength(1);
  expect(standaloneRows[0].project_id).toBeNull();
  await expect(page).toHaveURL(new RegExp(`/tasks/${standaloneRows[0].id}$`));
  expect(
    (await api.from("task_dependencies").select("id").eq("user_id", uid)).data,
  ).toEqual([]);
  await page.goto(`/tasks/${created[0]}`);
  await page.getByRole("button", { name: "Erledigt", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /abgeschlossen|erledigt/ })
      .last(),
  ).toBeVisible();
  await page.goto(`/projects/${project.id}`);
  await expect(work.locator("[data-project-task]")).toHaveCount(4);
  await expect(work.locator(`[data-project-task="${created[0]}"]`)).toContainText("done");
  await expect(work).toContainText("3 Tasks sind READY");
  await expect(
    work.getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(3);
  await expect(work).not.toContainText("Dependency BLOCKED 0");
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`project-create-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  // Project-origin creation keeps an owning Project selected; Cancel still
  // returns to the originating Project after the selection changes.
  await work.getByRole("link", { name: "+ Task", exact: true }).click();
  const cancelDetails = form.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await cancelDetails.click();
  const cancelProject = form.getByLabel("Project", { exact: true });
  await expect(cancelProject).toHaveAttribute("required", "");
  await expect(cancelProject.locator('option[value=""]')).toHaveCount(0);
  await cancelProject.selectOption(projects[1].id);
  await form.getByRole("link", { name: "Abbrechen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  // A compatible Project switch clears the old stage and returns to the new owner.
  await work.getByRole("link", { name: "+ Task", exact: true }).click();
  const switchDetails = form.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await switchDetails.click();
  await expect(switchDetails).toHaveAttribute("aria-expanded", "true");
  await expect(form.getByLabel("Project", { exact: true })).toBeVisible();
  await form
    .getByLabel("Project", { exact: true })
    .selectOption(projects[1].id);
  await expect(
    form.getByLabel("Project Milestone", { exact: true }),
  ).toHaveValue("");
  await form.getByLabel("Titel", { exact: true }).fill(`switch ${stamp}`);
  await submit();
  await expect(page).toHaveURL(new RegExp(`/projects/${projects[1].id}$`));
  await expect(backlog).toContainText(`switch ${stamp}`);
  // Existing global creation still goes to the canonical Task detail.
  await page.goto("/tasks/new");
  await expect(form).toHaveAttribute("data-task-capture-title-first", "true");
  await expect(
    form.getByRole("button", {
      name: "Weitere Angaben (optional)",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    form.getByRole("link", { name: "Abbrechen", exact: true }),
  ).toHaveAttribute("href", "/tasks");
  await form.getByLabel("Titel", { exact: true }).fill(`global ${stamp}`);
  await submit();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: `global ${stamp}`, exact: true }),
  ).toBeVisible();
  // Incompatible URL context fails rather than silently dropping the milestone.
  await page.goto(
    `/tasks/new?project=${projects[1].id}&milestone=${stages[0].id}`,
  );
  await expect(form).toHaveCount(0);
  // Forged form values cannot create cross-Project or cross-user membership.
  const otherStage = (
    await api
      .from("project_milestones")
      .insert({
        user_id: uid,
        project_id: projects[1].id,
        title: "Other stage",
        sort_order: 1,
      })
      .select()
      .single()
  ).data!;
  const stranger = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signup = await stranger.auth.signUp({
    email: `create-stranger-${stamp}@example.test`,
    password: `Test-only-${stamp}-Aa!`,
  });
  expect(signup.error).toBeNull();
  const foreignProject = (
    await stranger
      .from("projects")
      .insert({ user_id: signup.data.user!.id, title: "Foreign context" })
      .select()
      .single()
  ).data!;
  const foreignStage = (
    await stranger
      .from("project_milestones")
      .insert({
        user_id: signup.data.user!.id,
        project_id: foreignProject.id,
        title: "Foreign milestone",
      })
      .select()
      .single()
  ).data!;
  for (const target of [otherStage.id, foreignStage.id]) {
    await page.goto(`/tasks/new?project=${project.id}`);
    const forgedDetails = form.getByRole("button", {
      name: "Weitere Angaben (optional)",
      exact: true,
    });
    await forgedDetails.click();
    await expect(forgedDetails).toHaveAttribute("aria-expanded", "true");
    await form.getByLabel("Titel", { exact: true }).fill(`forged ${target}`);
    const select = form.getByLabel("Project Milestone");
    await select.evaluate((el, id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = "Forged test";
      el.appendChild(option);
    }, target);
    await select.selectOption(target);
    await submit();
    await expect(form.getByRole("alert")).toBeVisible();
    expect(
      (await api.from("tasks").select("id").eq("title", `forged ${target}`))
        .data,
    ).toEqual([]);
  }
  await page.goto(`/tasks/new?project=${foreignProject.id}`);
  await expect(form).toHaveCount(0);
  // A milestone archived after opening the form must fail without a partial Task.
  await page.goto(`/tasks/new?project=${project.id}&milestone=${stages[0].id}`);
  await form.getByLabel("Titel", { exact: true }).fill(`stale ${stamp}`);
  expect(
    (
      await api
        .from("project_milestones")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", stages[0].id)
    ).error,
  ).toBeNull();
  await submit();
  await expect(form.getByRole("alert")).toBeVisible();
  expect(
    (await api.from("tasks").select("id").eq("title", `stale ${stamp}`)).data,
  ).toEqual([]);
  await page.goto(`/tasks/new?project=${project.id}&milestone=${stages[0].id}`);
  await expect(form).toHaveCount(0);
  expect(errors).toEqual([]);
});
