import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/features/real-data/supabase/database.types";
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
  const addTaskLink = taskRegion.getByRole("link", {
    name: "+ Task",
    exact: true,
  });
  const projectManagement = page.getByRole("button", {
    name: "Project verwalten",
    exact: true,
  });
  const privacyMasks = [
    page.getByText("Anton", { exact: true }),
    page.getByText("Student · Werkstudent", { exact: true }),
  ];
  await expect(projectManagement).toBeEnabled();
  await expect(
    page
      .getByLabel("Project Header", { exact: true })
      .getByRole("button", { name: "Bearbeiten", exact: true }),
  ).toHaveCount(0);
  await expect(
    main.locator("input:visible, textarea:visible, select:visible"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Project-Fokus", exact: true }),
  ).toContainText(project.next_step!);
  await expect(primary).toContainText(resources[0].title);
  await expect(taskRegion.locator("[data-project-task]")).toHaveCount(1);
  await expect(addTaskLink).toBeVisible();
  const addTaskAppearance = await addTaskLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontWeight: style.fontWeight,
      textDecorationLine: style.textDecorationLine,
    };
  });
  const workOptionsAppearance = await taskRegion
    .getByRole("button", { name: "Meilenstein +", exact: true })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        fontWeight: style.fontWeight,
        textDecorationLine: style.textDecorationLine,
      };
    });
  expect(addTaskAppearance.color).toBe(workOptionsAppearance.color);
  expect(addTaskAppearance.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(addTaskAppearance.fontWeight).toBe("400");
  expect(addTaskAppearance.textDecorationLine).toBe("underline");
  await expect(
    page.getByRole("button", { name: "Verknüpfung entfernen", exact: true }),
  ).toHaveCount(0);
  for (const [width, height] of [
    [1920, 1080],
    [3840, 2160],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
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
      path: info.outputPath("project-read-" + width + ".png"),
      fullPage: true,
      caret: "initial",
      mask: privacyMasks,
      maskColor: "#121c2b",
    });
    await projectManagement.click();
    const manageDialog = page.getByRole("dialog", {
      name: "Project verwalten",
      exact: true,
    });
    await expect(manageDialog).toBeVisible();
    const editTrigger = manageDialog.getByRole("button", {
      name: "Bearbeiten",
      exact: true,
    });
    await editTrigger.click();
    await expect(editTrigger).toHaveAttribute("aria-expanded", "true");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1920) {
      await page.screenshot({
        path: info.outputPath("project-edit-management-1920.png"),
        fullPage: true,
        caret: "initial",
        mask: privacyMasks,
        maskColor: "#121c2b",
      });
    }
    await manageDialog
      .getByRole("button", { name: "Schließen", exact: true })
      .last()
      .click();
    await expect(editTrigger).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(manageDialog).toBeHidden();
    await expect(projectManagement).toHaveAttribute("aria-expanded", "false");
    await expect(projectManagement).toBeFocused();
    for (const [regionName, label, suffix] of [
      ["Primary Work Artifact", "Artifact verwalten", "artifact"],
      ["Project Header", "Beziehungen verwalten", "relations"],
    ]) {
      const region = page.getByLabel(regionName, { exact: true });
      const trigger = region.getByRole("button", { name: label, exact: true });
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      const dialog = page.getByRole("dialog", { name: label, exact: true });
      await expect(dialog).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 1920) {
        await page.screenshot({
          path: info.outputPath(`project-${suffix}-management-1920.png`),
          fullPage: true,
          caret: "initial",
          mask: privacyMasks,
          maskColor: "#121c2b",
        });
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
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
  await projectManagement.click();
  const manageDialog = page.getByRole("dialog", {
    name: "Project verwalten",
    exact: true,
  });
  const editTrigger = manageDialog.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
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
    .getByLabel("Project-Fokus", { exact: true })
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
  await expect(editTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(editTrigger).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Project-Fokus", exact: true }),
  ).toContainText("Nächsten konkreten Task bearbeiten");
  await expect(
    main.locator("input:visible, textarea:visible, select:visible"),
  ).toHaveCount(0);
  const additional = page.getByRole("region", {
    name: "Additional Work Artifacts",
    exact: true,
  });
  const supporting = page.getByRole("region", {
    name: "Weitere Inhalte",
    exact: true,
  });
  const supportingTrigger = supporting.getByRole("button", {
    name: "Weitere Inhalte ansehen und verwalten",
    exact: true,
  });
  await expect(supporting).toContainText("1 weiteres Arbeitsartefakt");
  await expect(supporting).toContainText(resources[1].title);
  await supportingTrigger.click();
  const supportingDialog = page.getByRole("dialog", {
    name: "Weitere Inhalte",
    exact: true,
  });
  await expect(
    supportingDialog.getByRole("region", {
      name: "Additional Work Artifacts",
      exact: true,
    }),
  ).toContainText(resources[1].title);
  await expect(
    supportingDialog.getByRole("region", {
      name: "References verwalten",
      exact: true,
    }),
  ).toContainText(resources[2].title);
  await page.keyboard.press("Escape");
  await expect(supportingTrigger).toBeFocused();
  await expect(
    page.getByRole("region", {
      name: "Additional Work Artifacts",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", {
      name: "Resources & References",
      exact: true,
    }),
  ).toHaveCount(0);
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
  await supportingTrigger.click();
  await expect(additional).toContainText(resources[0].title);
  await page.keyboard.press("Escape");
  await expect(supportingTrigger).toBeFocused();
  expect((await api.from("resources").select("id")).data).toHaveLength(3);
  const manageRelations = page.getByRole("button", {
    name: "Beziehungen verwalten",
    exact: true,
  });
  await manageRelations.click();
  const relationsDialog = page.getByRole("dialog", {
    name: "Beziehungen verwalten",
    exact: true,
  });
  await expect(
    relationsDialog.getByRole("form", {
      name: "Arbeitsartefakt verknüpfen",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    relationsDialog.getByRole("link", {
      name: "Neue externe Referenz anlegen",
    }),
  ).toHaveAttribute("href", `/resources/new?project=${project.id}`);
  await relationsDialog
    .getByRole("button", { name: "Schließen", exact: true })
    .first()
    .click();
  await expect(manageRelations).toBeFocused();
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
  await expect(taskRegion.locator("[data-project-task]")).toHaveCount(2);
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
  await projectManagement.click();
  await expect(editTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(
    manageDialog.getByRole("button", {
      name: "Project archivieren",
      exact: true,
    }),
  ).toBeVisible();
  await manageDialog
    .getByRole("button", { name: "Schließen", exact: true })
    .first()
    .click();

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
  const createdSkill = (
    await api
      .rpc("skill_development_command", {
        p_skill_id: null,
        p_command_id: crypto.randomUUID(),
        p_operation: "skill.create",
        p_expected_revision: null,
        p_payload: { name: "TypeScript" },
      })
      .throwOnError()
  ).data as { skill_id: string; development_revision: number };
  expect(createdSkill.development_revision).toBe(0);
  expect(
    (
      await api.from("task_skill_links").insert({
        user_id: uid,
        task_id: tasks[0].id,
        skill_id: createdSkill.skill_id,
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
    await expect(
      page.getByRole("button", { name: "Project verwalten", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByLabel("Project Header", { exact: true }),
    ).toContainText(record.title);
    await expect(
      main.locator("input:visible, textarea:visible, select:visible"),
    ).toHaveCount(0);
    if (state === "rich") {
      await expect(taskRegion.locator("[data-project-task]")).toHaveCount(25);
      await expect(
        page.getByRole("region", { name: "Project Context", exact: true }),
      ).toContainText("TypeScript");
    } else {
      await expect(
        page.getByRole("region", {
          name: "Weitere Inhalte",
          exact: true,
        }),
      ).toHaveCount(0);
    }
    if (state === "empty") {
      await expect(
        taskRegion.getByRole("link", {
          name: "Erste Task anlegen",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        taskRegion.getByRole("link", { name: "+ Task", exact: true }),
      ).toHaveCount(0);
      await expect(
        taskRegion.getByRole("button", {
          name: "Meilenstein +",
          exact: true,
        }),
      ).toBeVisible();
      await expect(taskRegion).not.toContainText(
        /0 Tasks|0 Milestones|READY 0|BLOCKED 0/,
      );
    }
    for (const [width, height] of [
      [3840, 2160],
      [1920, 1080],
      [390, 844],
    ]) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.setViewportSize({ width, height });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const surfaceLocators = [
        page.getByLabel("Project Header", { exact: true }),
        page.locator("[data-project-workspace]"),
      ];
      const secondary = page.locator("[data-project-secondary]");
      if ((await secondary.count()) > 0) surfaceLocators.push(secondary);
      for (const surface of surfaceLocators) {
        expect(
          await surface.evaluate((el) => getComputedStyle(el).borderTopWidth),
        ).toBe("1px");
        expect(
          await surface.evaluate((el) => getComputedStyle(el).backgroundColor),
        ).not.toBe("rgba(0, 0, 0, 0)");
      }
      const rail = page
        .locator("[data-project-workspace]")
        .getByRole("complementary", { name: "Project Context Rail" });
      if (state === "empty") await expect(rail).toHaveCount(0);
      else await expect(rail).toBeVisible();
      const workBox = (await taskRegion.boundingBox())!;
      if (width >= 1920 && state !== "empty") {
        const railBox = (await page
          .getByRole("complementary", { name: "Project Context Rail" })
          .boundingBox())!;
        expect(workBox.width / railBox.width).toBeGreaterThan(1.8);
        if (state !== "rich")
          expect(
            (await page.locator("[data-project-task-list]").boundingBox())!
              .height,
          ).toBeLessThan(260);
        if ((await secondary.count()) > 0) {
          const secondBox = (await secondary.boundingBox())!;
          expect(secondBox.y).toBeGreaterThanOrEqual(
            workBox.y + workBox.height,
          );
        }
      }
      if (state === "rich" && width === 3840) {
        await page.screenshot({
          path: info.outputPath(`project-${state}-${width}.png`),
          fullPage: true,
          caret: "initial",
          mask: privacyMasks,
          maskColor: "#121c2b",
        });
      }
      if (state === "rich") {
        const list = page.locator("[data-project-task-list]");
        expect(
          await list.evaluate(
            (el) =>
              el.scrollHeight <= el.clientHeight + 1 &&
              getComputedStyle(el).overflowY !== "auto" &&
              getComputedStyle(el).overflowY !== "scroll" &&
              el.tabIndex === -1,
          ),
        ).toBe(true);
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await expect
          .poll(() => page.evaluate(() => window.scrollY))
          .toBeGreaterThan(0);
      }
    }
  }
  await page.goto(`/projects/${light.id}`);
  const lightRelations = page.getByRole("button", {
    name: "Beziehungen verwalten",
    exact: true,
  });
  await lightRelations.click();
  const lightRelationsDialog = page.getByRole("dialog", {
    name: "Beziehungen verwalten",
    exact: true,
  });
  const refForm = lightRelationsDialog.getByRole("form", {
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
  const supportingAfterWrite = page.getByRole("region", {
    name: "Weitere Inhalte",
    exact: true,
  });
  await expect(supportingAfterWrite).toContainText(resources[2].title);
  const supportingAfterWriteTrigger = supportingAfterWrite.getByRole("button", {
    name: "Weitere Inhalte ansehen und verwalten",
    exact: true,
  });
  await supportingAfterWriteTrigger.click();
  const supportingAfterWriteDialog = page.getByRole("dialog", {
    name: "Weitere Inhalte",
    exact: true,
  });
  await supportingAfterWriteDialog
    .locator(`[data-project-resource="${resources[2].id}"]`)
    .getByRole("link", { name: "Details öffnen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/resources/${resources[2].id}$`));
  expect((await api.from("resources").select("id")).data).toHaveLength(3);
  expect(errors).toEqual([]);
});
