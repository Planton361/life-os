import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("R2-09 read-first Project: disclosure, edit, artifacts, relations and responsive proof", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await signUpTechnicalManualUser(page, "r209read", Date.now());
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
  const stamp = Date.now();
  const goal = (
    await api
      .from("goals")
      .insert({ user_id: uid, title: `Release ${stamp}` })
      .select()
      .single()
  ).data!;
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Life OS ${stamp}`,
        description:
          "Persönlichen Arbeitskontext verbinden und im Alltag verwenden.",
        next_step: "Read-first Project Workbench prüfen",
        status: "active",
        priority: "P1",
        goal_id: goal.id,
      })
      .select()
      .single()
  ).data!;
  const tasks = (
    await api
      .from("tasks")
      .insert([
        {
          user_id: uid,
          title: `Workbench prüfen ${stamp}`,
          project_id: project.id,
        },
        { user_id: uid, title: `Weiterer Task ${stamp}` },
      ])
      .select()
  ).data!;
  const resources = (
    await api
      .from("resources")
      .insert([
        {
          user_id: uid,
          title: `Repository ${stamp}`,
          type: "link" as const,
          url: "https://example.org/repository",
          summary: "Der primäre Arbeitsort für Implementierung und Releases.",
        },
        {
          user_id: uid,
          title: `Release Sheet ${stamp}`,
          type: "link" as const,
          url: "https://example.org/sheet",
          summary: "Release vorbereiten und prüfen.",
        },
        {
          user_id: uid,
          title: `Next.js Docs ${stamp}`,
          type: "link" as const,
          url: "https://example.org/docs",
        },
      ])
      .select()
  ).data!;
  for (const [i, role] of [
    [0, "primary_artifact"],
    [1, "additional_artifact"],
    [2, "reference"],
  ] as const) {
    expect(
      (
        await api.rpc("set_project_resource_role", {
          p_project_id: project.id,
          p_resource_id: resources[i].id,
          p_role: role,
        })
      ).error,
    ).toBeNull();
  }
  await page.goto(`/projects/${project.id}`);
  const main = page.locator("main");
  const primary = page.getByRole("region", {
    name: "Primary Work Artifact",
    exact: true,
  });
  const taskRegion = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  const editTrigger = page.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await expect(editTrigger).toBeEnabled();
  await expect(
    main.locator("input:visible, textarea:visible, select:visible"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Next Step", exact: true }),
  ).toContainText(project.next_step!);
  await expect(primary).toContainText(resources[0].title);
  await expect(taskRegion).toContainText("0/1 erledigt");
  await expect(
    page.getByRole("button", { name: "Verknüpfung entfernen", exact: true }),
  ).toHaveCount(0);
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1920) {
      expect(
        (await primary.boundingBox())!.y +
          (await primary.boundingBox())!.height,
      ).toBeLessThan(height);
      expect(
        (await taskRegion.boundingBox())!.y +
          (await taskRegion.boundingBox())!.height,
      ).toBeLessThan(height);
    }
    await page.screenshot({
      path: info.outputPath(`project-read-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
    for (const [label, regionName, suffix] of [
      ["Bearbeiten", "Project Header", "edit"],
      ["Artifact verwalten", "Primary Work Artifact", "artifact-management"],
      ["Beziehungen verwalten", "Project Context", "relations"],
    ]) {
      const region = page.getByLabel(regionName, { exact: true });
      const trigger = region.getByRole("button", { name: label, exact: true });
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`project-${suffix}-${width}.png`),
        fullPage: true,
        caret: "initial",
      });
      await region
        .getByRole("button", { name: "Schließen", exact: true })
        .click();
      await expect(trigger).toBeFocused();
    }
  }
  await context.route("https://example.org/repository", (r) =>
    r.fulfill({ status: 200, body: "Local link proof" }),
  );
  const popupPromise = context.waitForEvent("page");
  await primary.getByRole("link", { name: /Extern öffnen/ }).focus();
  await primary.getByRole("link", { name: /Extern öffnen/ }).press("Enter");
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe("https://example.org/repository");
  await popup.close();
  await primary
    .getByRole("link", { name: "Details öffnen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/resources/${resources[0].id}$`));
  await page.goto(`/projects/${project.id}`);
  await editTrigger.focus();
  await editTrigger.press("Enter");
  await expect(editTrigger).toHaveAttribute("aria-expanded", "true");
  await editTrigger.press("Tab");
  const edit = page.getByRole("form", {
    name: "Project bearbeiten",
    exact: true,
  });
  await expect(edit.getByLabel("Titel", { exact: true })).toBeFocused();
  await edit
    .getByLabel("Next Step", { exact: true })
    .fill("Nächsten konkreten Task bearbeiten");
  await edit
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /gespeichert|aktualisiert/ })
      .last(),
  ).toBeVisible();
  await expect(edit.getByLabel("Next Step", { exact: true })).toBeEnabled();
  await edit.getByLabel("Next Step", { exact: true }).focus();
  await edit.getByLabel("Next Step", { exact: true }).press("Escape");
  await expect(editTrigger).toBeFocused();
  await expect(editTrigger).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Next Step", exact: true }),
  ).toContainText("Nächsten konkreten Task bearbeiten");
  await expect(
    main.locator("input:visible, textarea:visible, select:visible"),
  ).toHaveCount(0);
  const additional = page.getByRole("region", {
    name: "Additional Work Artifacts",
    exact: true,
  });
  await primary
    .getByRole("button", { name: "Artifact verwalten", exact: true })
    .click();
  const replacement = primary.getByRole("form", {
    name: "Primary ändern",
    exact: true,
  });
  await replacement
    .getByLabel("Neues primäres Arbeitsartefakt")
    .selectOption(resources[1].id);
  await replacement
    .getByRole("button", { name: "Primary ändern", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Project-Verwendung gespeichert" })
      .last(),
  ).toBeVisible();
  await page.reload();
  await expect(primary).toContainText(resources[1].title);
  await expect(additional).toContainText(resources[0].title);
  expect((await api.from("resources").select("id")).data).toHaveLength(3);
  const add = additional.getByRole("button", {
    name: "+ Artifact hinzufügen",
    exact: true,
  });
  await add.click();
  await expect(
    additional.getByRole("form", {
      name: "Mit Project verknüpfen",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    additional.getByRole("link", { name: "Neue externe Referenz anlegen" }),
  ).toHaveAttribute("href", `/resources/new?project=${project.id}`);
  await additional
    .getByRole("button", { name: "Schließen", exact: true })
    .click();
  await expect(add).toBeFocused();
  const manage = page.getByRole("button", {
    name: "Beziehungen verwalten",
    exact: true,
  });
  await manage.click();
  const link = page.getByRole("form", { name: "Task zuordnen", exact: true });
  await link.getByLabel("Task", { exact: true }).selectOption(tasks[1].id);
  await link.getByRole("button").click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /gespeichert|verknüpft/ })
      .last(),
  ).toBeVisible();
  await page.reload();
  await expect(taskRegion).toContainText(tasks[1].title);
  await expect(taskRegion).toContainText("0/2 erledigt");
  await manage.click();
  const relation = page
    .getByRole("region", { name: "Beziehungen", exact: true })
    .locator("div.grid")
    .filter({ has: page.locator(`a[href="/tasks/${tasks[1].id}"]`) })
    .first();
  await relation
    .getByRole("button", { name: "Task-Zuordnung lösen", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /gespeichert|gelöst/ })
      .last(),
  ).toBeVisible();
  await page.reload();
  await expect(taskRegion).not.toContainText(tasks[1].title);
  await expect(
    main.locator("input:visible, textarea:visible, select:visible"),
  ).toHaveCount(0);
  await editTrigger.click();
  await page
    .getByRole("button", { name: "Project verwalten", exact: true })
    .click();
  await expect(editTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Project archivieren", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schließen", exact: true }).click();

  // Three composition states use the same canonical models and local user.
  const light = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: "Light Project",
        next_step: "Ersten Task bearbeiten",
      })
      .select()
      .single()
  ).data!;
  const empty = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: "Empty Project",
      })
      .select()
      .single()
  ).data!;
  expect(
    (
      await api.from("tasks").insert({
        user_id: uid,
        title: "Ein konkreter Task",
        project_id: light.id,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await api.rpc("set_project_resource_role", {
        p_project_id: light.id,
        p_resource_id: resources[0].id,
        p_role: "primary_artifact",
      })
    ).error,
  ).toBeNull();
  const skill = (
    await api
      .from("skills")
      .insert({
        user_id: uid,
        name: "TypeScript",
      })
      .select()
      .single()
  ).data!;
  expect(
    (
      await api.from("task_skill_links").insert({
        user_id: uid,
        task_id: tasks[0].id,
        skill_id: skill.id,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await api.from("tasks").insert(
        Array.from({ length: 24 }, (_, i) => ({
          user_id: uid,
          title: `Arbeitsschritt ${i + 1}`,
          project_id: project.id,
          status: i < 4 ? ("done" as const) : ("planned" as const),
        })),
      )
    ).error,
  ).toBeNull();
  for (const [state, record] of [
    ["rich", project],
    ["light", light],
    ["empty", empty],
  ] as const) {
    await page.goto(`/projects/${record.id}`);
    await expect(editTrigger).toBeEnabled();
    await expect(
      page.getByLabel("Project Header", { exact: true }),
    ).toContainText(record.title);
    await expect(
      main.locator("input:visible, textarea:visible, select:visible"),
    ).toHaveCount(0);
    if (state === "rich") {
      await expect(taskRegion).toContainText("4/25 erledigt");
      await expect(
        page.getByRole("region", { name: "Project Context", exact: true }),
      ).toContainText("TypeScript");
    } else {
      await expect(
        page.getByRole("region", {
          name: "Resources & References",
          exact: true,
        }),
      ).toContainText("Keine References.");
    }
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
      for (const surface of [
        page.getByLabel("Project Header", { exact: true }),
        page.locator("[data-project-workspace]"),
        page.locator("[data-project-secondary]"),
      ]) {
        expect(
          await surface.evaluate((el) => getComputedStyle(el).borderTopWidth),
        ).toBe("1px");
        expect(
          await surface.evaluate((el) => getComputedStyle(el).backgroundColor),
        ).not.toBe("rgba(0, 0, 0, 0)");
      }
      await expect(
        page
          .locator("[data-project-workspace]")
          .getByRole("complementary", { name: "Project Context Rail" }),
      ).toBeVisible();
      const workBox = (await taskRegion.boundingBox())!;
      if (width >= 1920) {
        const railBox = (await page
          .getByRole("complementary", { name: "Project Context Rail" })
          .boundingBox())!;
        expect(workBox.width / railBox.width).toBeGreaterThan(1.8);
        expect(workBox.y + workBox.height).toBeLessThanOrEqual(height);
        if (state !== "rich")
          expect(
            (await page.locator("[data-project-task-list]").boundingBox())!
              .height,
          ).toBeLessThan(180);
        const secondBox = (await page
          .locator("[data-project-secondary]")
          .boundingBox())!;
        expect(secondBox.y).toBeGreaterThanOrEqual(workBox.y + workBox.height);
        expect(secondBox.y + secondBox.height).toBeLessThan(height);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 2,
          ),
        ).toBe(true);
      }
      await page.screenshot({
        path: info.outputPath(`project-${state}-${width}.png`),
        fullPage: true,
        caret: "initial",
      });
      if (state === "rich") {
        const list = page.locator("[data-project-task-list]");
        expect(
          await list.evaluate((el) => el.scrollHeight > el.clientHeight),
        ).toBe(true);
        await list.focus();
        await list.press("End");
        await expect
          .poll(() => list.evaluate((el) => el.scrollTop))
          .toBeGreaterThan(0);
        await list.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
    }
  }
  await page.goto(`/projects/${light.id}`);
  const refs = page.getByRole("region", {
    name: "Resources & References",
    exact: true,
  });
  await refs
    .getByRole("button", { name: "+ Reference hinzufügen", exact: true })
    .click();
  const refForm = refs.getByRole("form", {
    name: "Reference verknüpfen",
    exact: true,
  });
  await refForm
    .getByLabel("Resource", { exact: true })
    .selectOption(resources[2].id);
  await refForm.getByRole("button").click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Project-Verwendung gespeichert" })
      .last(),
  ).toBeVisible();
  await page.reload();
  await expect(refs).toContainText(resources[2].title);
  await refs
    .getByRole("link", { name: resources[2].title, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/resources/${resources[2].id}$`));
  expect((await api.from("resources").select("id")).data).toHaveLength(3);
  expect(errors).toEqual([]);
});
