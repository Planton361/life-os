import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("Canonical task graph: management, parallel readiness, completion guards and honest history", async ({
  page,
  context,
}, info) => {
  test.setTimeout(240000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "r210graph", stamp);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
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
  const { data: project, error: projectError } = await api
    .from("projects")
    .insert({ user_id: uid, title: `Work Graph ${stamp}`, status: "active" })
    .select()
    .single();
  expect(projectError).toBeNull();
  const p = project!.id;
  const milestones: string[] = [];
  for (const title of ["Discovery", "Build", "Ship"]) {
    expect(
      (
        await api.rpc("write_project_milestone", {
          p_project_id: p,
          p_operation: "save",
          p_title: title,
        })
      ).error,
    ).toBeNull();
    milestones.push(
      (
        await api
          .from("project_milestones")
          .select("id")
          .eq("project_id", p)
          .eq("title", title)
          .single()
      ).data!.id,
    );
  }
  const { data: rows, error: taskError } = await api
    .from("tasks")
    .insert(
      ["Research", "Design", "API", "UI", "Integration", "Release"].map(
        (title, i) => ({
          user_id: uid,
          project_id: p,
          milestone_id: milestones[i < 2 ? 0 : i < 5 ? 1 : 2],
          title: `${title} ${stamp}`,
          status: "planned" as const,
          planned_date: new Date().toLocaleDateString("en-CA", {
            timeZone: "Europe/Berlin",
          }),
        }),
      ),
    )
    .select();
  expect(taskError).toBeNull();
  const tasks = Object.fromEntries(
    rows!.map((row) => [row.title.split(" ")[0], row]),
  );
  const region = () =>
    page.getByRole("region", { name: "Voraussetzung", exact: true });
  const lifecycle = () =>
    page.getByRole("button", { name: "Mehr verwalten", exact: true });
  const openLifecycle = async () => {
    const trigger = lifecycle();
    if ((await trigger.getAttribute("aria-expanded")) !== "true")
      await trigger.click();
    const status = page.getByRole("button", {
      name: "Status verwalten",
      exact: true,
    });
    if ((await status.getAttribute("aria-expanded")) !== "true")
      await status.click();
  };
  const visit = async (name: string) => {
    await page.goto(`/tasks/${tasks[name].id}`);
    await expect(region()).toBeVisible();
  };
  const manage = async () => {
    await region()
      .getByRole("button", { name: "Vorgänger verwalten", exact: true })
      .click();
  };
  const add = async (before: string, after: string) => {
    await visit(after);
    await manage();
    await region()
      .getByRole("button", { name: "Vorgänger hinzufügen", exact: true })
      .click();
    await region()
      .getByLabel("Vorgänger", { exact: true })
      .selectOption(tasks[before].id);
    await region()
      .getByRole("button", { name: "Vorgänger speichern", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Dependency gespeichert." })
        .last(),
    ).toBeVisible();
    await page.reload();
    await expect(region()).toContainText("offen");
    await expect(
      region().getByRole("link", { name: tasks[before].title, exact: true }),
    ).toBeVisible();
  };
  for (const [a, b] of [
    ["Research", "Design"],
    ["Design", "API"],
    ["Design", "UI"],
    ["API", "Integration"],
    ["UI", "Integration"],
    ["Integration", "Release"],
  ])
    await add(a, b);
  await visit("Integration");
  await expect(region()).toContainText(tasks.API.title);
  await expect(region()).toContainText(tasks.UI.title);
  await expect(page.getByRole("button", { name: "Erledigt", exact: true })).toHaveCount(0);
  expect(
    (
      await api.rpc("complete_linked_task", {
        p_task_id: tasks.Integration.id,
        p_completed_at: new Date().toISOString(),
      })
    ).error?.message,
  ).toContain("DEPENDENCY_BLOCKED");
  expect(
    (
      await api
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", tasks.Integration.id)
    ).error?.message,
  ).toContain("DEPENDENCY_BLOCKED");
  // Forge a self option through the actual form: the Action must reject it.
  await manage();
  await region()
    .getByRole("button", { name: "Vorgänger hinzufügen", exact: true })
    .click();
  await region()
    .getByLabel("Vorgänger", { exact: true })
    .evaluate((element, id) => {
      const option = document.createElement("option");
      option.value = id;
      option.text = "Self";
      element.append(option);
    }, tasks.Integration.id);
  await region()
    .getByLabel("Vorgänger", { exact: true })
    .selectOption(tasks.Integration.id);
  await region()
    .getByRole("button", { name: "Vorgänger speichern", exact: true })
    .click();
  await expect(region().getByRole("alert")).toContainText("Self Dependency");
  await page.goto(`/projects/${p}`);
  const work = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  await expect(work).not.toContainText("Dependency READY 1");
  await expect(work.locator('[data-primary-task="true"]')).toHaveCount(1);
  await expect(
    work.getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(1);
  await expect(
    work
      .locator("[data-project-task]")
      .filter({ hasText: "Dependency-Readiness BLOCKED" }),
  ).toHaveCount(5);
  await expect(
    work.getByRole("region", { name: "Milestone: Build", exact: true }),
  ).toContainText("Dependency-Readiness BLOCKED");
  await expect(
    work.getByRole("region", { name: "Milestone: Build", exact: true }),
  ).toContainText(tasks.Design.title);
  await expect(work.locator("select:visible")).toHaveCount(0);
  const complete = async (name: string) => {
    await visit(name);
    await page
      .getByRole("button", { name: "Erledigt", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /Task abgeschlossen\./ })
        .last(),
    ).toBeVisible();
    await expect(page.locator('[data-task-lifecycle="done"]')).toContainText(
      "Abgeschlossen",
    );
    await openLifecycle();
    await expect(
      page.getByRole("button", { name: "Task wieder öffnen", exact: true }),
    ).toBeVisible();
    await page.reload();
    await openLifecycle();
    await expect(
      page.getByRole("button", { name: "Task wieder öffnen", exact: true }),
    ).toBeVisible();
  };
  await page.goto("/dashboard");
  const dailyControl = page.getByRole("region", {
    name: "Daily Control",
    exact: true,
  });
  await expect(dailyControl).toContainText(tasks.Research.title);
  for (const name of ["Design", "API", "UI", "Integration", "Release"]) {
    await expect(dailyControl).not.toContainText(tasks[name].title);
  }
  await dailyControl
    .getByRole("button", { name: "Abschließen", exact: true })
    .click();
  await expect(dailyControl).toContainText(tasks.Design.title);
  await page.reload();
  await expect(dailyControl).toContainText(tasks.Design.title);
  await visit("Design");
  await expect(region()).toContainText("1 Vorgänger · erfüllt");
  await complete("Design");
  for (const name of ["API", "UI"]) {
    await visit(name);
    await expect(region()).toContainText("1 Vorgänger · erfüllt");
  }
  await complete("API");
  await visit("Integration");
  await expect(region()).toContainText("2 Vorgänger · 1 offen");
  await expect(
    region().getByRole("link", { name: tasks.UI.title, exact: true }),
  ).toBeVisible();
  await complete("UI");
  await visit("Integration");
  await expect(region()).toContainText("2 Vorgänger · erfüllt");
  await complete("Integration");
  await visit("API");
  await openLifecycle();
  await page
    .getByRole("button", { name: "Task wieder öffnen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await visit("Integration");
  await expect(region()).toContainText(
    "Der Task bleibt abgeschlossen; mindestens ein Vorgänger ist inzwischen wieder offen oder archiviert.",
  );
  await openLifecycle();
  await expect(
    page.getByRole("button", { name: "Task wieder öffnen", exact: true }),
  ).toBeVisible();
  await visit("Design");
  await openLifecycle();
  await page
    .getByRole("button", { name: "Task wieder öffnen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await visit("API");
  await expect(region()).toContainText("1 Vorgänger · 1 offen");
  await manage();
  await region()
    .getByRole("button", {
      name: `Vorgänger entfernen: ${tasks.Design.title}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Dependency entfernt." }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(region()).toContainText("Keine offenen Voraussetzungen.");
  // Every dependency navigation is real; compact signal stays subordinate to stages.
  await region()
    .getByRole("link", { name: tasks.Integration.title, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${tasks.Integration.id}`));
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [surface, url] of [
      ["project", `/projects/${p}`],
      ["task", `/tasks/${tasks.Integration.id}`],
    ]) {
      await page.goto(url);
      await expect(
        page
          .getByRole("heading", {
            name:
              surface === "project" ? project!.title : tasks.Integration.title,
            exact: true,
          })
          .first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      if (surface === "project") {
        await page
          .getByRole("button", { name: "Meilenstein +", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Milestone erstellen",
            exact: true,
          }),
        ).toBeEnabled();
        await page.keyboard.press("Escape");
      }
      await expect(
        page.getByRole("button", {
          name:
            surface === "project"
              ? "Meilenstein +"
              : "Vorgänger verwalten",
          exact: true,
        }),
      ).toBeEnabled();
      const path = info.outputPath(`${surface}-${width}.png`);
      await page.screenshot({ path, fullPage: true, caret: "initial" });
      await info.attach(`${surface}-${width}`, {
        path,
        contentType: "image/png",
      });
    }
  }
  expect(errors).toEqual([]);
});
