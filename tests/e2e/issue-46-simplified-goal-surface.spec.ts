import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const workbench = (page: Page) =>
  page.locator('[data-goal-outcome="workbench"]');

async function sessionClient(context: BrowserContext) {
  const cookie = (await context.cookies()).find((item) =>
    item.name.includes("auth-token"),
  );
  if (!cookie) throw new Error("Manual Supabase session cookie is missing");
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  const result = await api.auth.getUser();
  if (result.error || !result.data.user)
    throw new Error("Authenticated Manual user is missing");
  return { api, userId: result.data.user.id };
}

async function createIntermediateResult(page: Page, title: string) {
  const root = workbench(page);
  const prompt = root.getByRole("button", {
    name: "Was soll als Nächstes wahr sein?",
    exact: true,
  });
  if ((await prompt.getAttribute("aria-expanded")) !== "true")
    await prompt.click();
  const form = root.locator('form[aria-label="Zwischenziel erstellen"]');
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByLabel("Beschreibung", { exact: true })
    .fill(`Überprüfbares Zwischenergebnis: ${title}.`);
  await form.getByRole("button", { name: "Zwischenziel erstellen" }).click();
  await expect(
    page.getByText("Etappe erstellt.", { exact: true }),
  ).toBeVisible();
  const row = root
    .locator("[data-goal-progression] li[data-goal-milestone-id]")
    .filter({ hasText: title });
  await expect(row).toBeVisible();
  return (await row.getAttribute("data-goal-milestone-id")) ?? "";
}

async function activateIntermediateResult(page: Page, title: string) {
  const row = workbench(page)
    .locator("[data-goal-progression] li[data-goal-milestone-id]")
    .filter({ hasText: title });
  const href = await row
    .getByRole("link", { name: title })
    .getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  const currentRow = workbench(page)
    .locator("[data-goal-progression] li[data-goal-milestone-id]")
    .filter({ hasText: title });
  await currentRow
    .getByRole("button", { name: "Zwischenziel verwalten" })
    .click();
  await currentRow
    .locator('form[aria-label="Als aktuelles Zwischenziel festlegen"]')
    .getByRole("button", { name: "Als aktuelles Zwischenziel festlegen" })
    .click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }),
  ).toBeVisible();
  await expect(
    workbench(page)
      .locator("[data-goal-progression] li[data-goal-milestone-id]")
      .filter({ hasText: title }),
  ).toHaveAttribute("data-goal-stage-status", "active");
}

async function createContextProject(
  page: Page,
  goalId: string,
  milestoneId: string,
  title: string,
) {
  await page.goto(`/projects/new?goal=${goalId}&goalMilestone=${milestoneId}`);
  await expect(page.getByText("Ziel-Kontext:")).toBeVisible();
  const form = page.locator('form[aria-label="Projekt erstellen"]');
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form.getByRole("button", { name: "Projekt erstellen" }).click();
  await expect(
    page.getByText("Projekt aus der Etappe erstellt.", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/goals/${goalId}`));
}

async function createCurrentTask(
  page: Page,
  goalId: string,
  title: string,
  projectId: string,
  fromPlanning = false,
) {
  const root = workbench(page);
  if (fromPlanning) {
    if ((await root.getAttribute("data-goal-planning-mode")) === "read") {
      await root
        .getByRole("button", { name: "Planung bearbeiten", exact: true })
        .click();
    }
    const associations = root.getByRole("button", {
      name: "Passt bereits etwas dazu?",
      exact: true,
    });
    if ((await associations.getAttribute("aria-expanded")) !== "true")
      await associations.click();
    await root
      .locator("[data-goal-current-workbench]")
      .getByRole("link", {
        name: "Aufgabe zum Zwischenziel hinzufügen",
        exact: true,
      })
      .click();
  } else {
    await root
      .locator("[data-goal-current-workbench]")
      .getByRole("link", { name: "Nächste Aufgabe planen", exact: true })
      .click();
  }

  const form = page.locator('form[aria-label="Aufgabe erstellen"]');
  await expect(form).toHaveAttribute(
    "data-goal-milestone-task-capture",
    "title-first",
  );
  const titleField = form.getByLabel("Titel", { exact: true });
  await titleField.fill(title);
  await form
    .getByLabel("Project-Kontext (optional)", { exact: true })
    .selectOption(projectId);
  const optional = form.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await expect(optional).toHaveAttribute("aria-expanded", "false");
  await expect(
    form.getByLabel("Beschreibung / Kontext", { exact: true }),
  ).toBeHidden();
  await form.getByRole("button", { name: "Aufgabe erstellen" }).click();
  await expect(
    page.getByText("Aufgabe aus der Etappe erstellt.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  const taskRow = workbench(page)
    .locator("[data-goal-current-task]")
    .filter({ hasText: title });
  await expect(taskRow).toBeVisible();
  const taskId = await taskRow.getAttribute("data-goal-current-task");
  expect(taskId).toMatch(/^[0-9a-f-]{36}$/i);
  return { goalId: goalId!, taskId: taskId! };
}

async function addDependency(
  page: Page,
  successorId: string,
  predecessorId: string,
) {
  await page.goto(`/tasks/${successorId}`);
  const dependencies = page.getByRole("region", {
    name: "Task Dependencies",
    exact: true,
  });
  await dependencies
    .getByRole("button", { name: "Dependencies verwalten", exact: true })
    .click();
  await dependencies
    .getByRole("button", { name: "Dependency hinzufügen", exact: true })
    .click();
  await dependencies
    .getByLabel("Vorgänger", { exact: true })
    .selectOption(predecessorId);
  await dependencies
    .getByRole("button", { name: "Dependency speichern", exact: true })
    .click();
  await expect(
    page.getByText("Dependency gespeichert.", { exact: true }),
  ).toBeVisible();
}

async function completeTask(page: Page, taskId: string) {
  await page.goto(`/tasks/${taskId}`);
  const form = page.locator('form[aria-label="Task abschließen"]');
  await form.getByRole("button", { name: "Task abschließen" }).click();
  await expect(
    page.getByText("Task abgeschlossen.", { exact: true }),
  ).toBeVisible();
}

async function captureViewports(
  page: Page,
  testInfo: { outputPath: (...parts: string[]) => string },
) {
  const root = workbench(page);
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      root.getByRole("region", { name: "Aktuelle Arbeit" }),
    ).toHaveCount(1);
    const bounds = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
    if (viewport.width >= 1920) {
      const order = await root
        .locator("[data-goal-journey-layout]")
        .evaluate((layout) => {
          const current = layout.querySelector("[data-goal-current-workbench]");
          const roadmap = layout.querySelector("[data-goal-journey]");
          const currentRect = current?.getBoundingClientRect();
          const roadmapRect = roadmap?.getBoundingClientRect();
          return {
            currentWidth: currentRect?.width ?? 0,
            currentBottom: currentRect?.bottom ?? 0,
            roadmapWidth: roadmapRect?.width ?? 0,
            roadmapTop: roadmapRect?.top ?? 0,
          };
        });
      expect(Math.abs(order.currentWidth - order.roadmapWidth)).toBeLessThan(2);
      expect(order.roadmapTop).toBeGreaterThan(order.currentBottom);
    }
    await page.screenshot({
      path: testInfo.outputPath(
        `issue-46-goal-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}

test("Issue 46 Manual Goal surface keeps current work singular and dependency-led", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await signUpTechnicalManualUser(page, "issue-46-goal-surface", stamp);
  const { api, userId } = await sessionClient(context);
  const goalTitle = `Life OS fertig bringen ${stamp}`;
  const goalOutcome =
    "Die priorisierten Life OS Abläufe sind im Manual Profil end-to-end verlässlich nutzbar, geprüft und dokumentiert.";
  const goalWhy =
    "Damit tägliche Planung und persönliche Arbeit auf einer stabilen, nachvollziehbaren Grundlage stattfinden.";
  await page.goto("/goals/new");
  const goalForm = page.locator('form[aria-label="Ziel erstellen"]');
  await goalForm.getByLabel("Titel", { exact: true }).fill(goalTitle);
  await goalForm
    .getByLabel("Was möchtest du erreichen?", { exact: true })
    .fill(goalOutcome);
  const optional = goalForm.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await optional.click();
  await goalForm
    .getByLabel("Warum / welcher Nutzen?", { exact: true })
    .fill(goalWhy);
  await goalForm.getByRole("button", { name: "Ziel erstellen" }).click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/i);
  const goalId = page.url().match(/\/goals\/([^/?#]+)/)?.[1];
  expect(goalId).toMatch(/^[0-9a-f-]{36}$/i);

  let root = workbench(page);
  await expect(root.locator("[data-goal-current-workbench]")).toHaveCount(1);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "define_outcome",
  );
  await expect(
    root.locator("[data-goal-now]").getByRole("heading", {
      name: "Woran erkennst du, dass es geschafft ist?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(root).toContainText(goalTitle);
  await expect(root).toContainText(goalWhy);

  const planningToggle = root.getByRole("button", {
    name: "Planung bearbeiten",
    exact: true,
  });
  if ((await root.getAttribute("data-goal-planning-mode")) !== "editing")
    await planningToggle.click();
  await expect(root).toHaveAttribute("data-goal-planning-mode", "editing");
  const identityPrompt = root.getByRole("button", {
    name: "Was willst du erreichen?",
    exact: true,
  });
  await identityPrompt.click();
  const identityForm = root.locator('form[aria-label="Ziel bearbeiten"]');
  await identityForm
    .getByLabel("Status", { exact: true })
    .selectOption("active");
  await identityForm
    .getByRole("button", { name: "Änderungen speichern" })
    .click();
  await expect(
    page.getByText("Ziel aktualisiert.", { exact: true }),
  ).toBeVisible();

  const criteriaPrompt = root.getByRole("button", {
    name: "Woran erkennst du, dass es geschafft ist?",
  });
  if ((await criteriaPrompt.getAttribute("aria-expanded")) !== "true")
    await criteriaPrompt.click();
  await root
    .getByRole("button", { name: "Erfolgskriterium festlegen", exact: true })
    .click();
  const criterionTitle = `Manual Kernabläufe bleiben reload-stabil ${stamp}`;
  const criterionForm = root.locator(
    'form[aria-label="Erfolgskriterium erstellen"]',
  );
  await criterionForm.getByLabel("Titel", { exact: true }).fill(criterionTitle);
  await criterionForm
    .getByLabel("Erfolg prüfen als", { exact: true })
    .selectOption("boolean");
  await criterionForm
    .getByRole("button", { name: "Erfolgskriterium erstellen" })
    .click();
  await expect(
    page.getByText("Kriterium erstellt.", { exact: true }),
  ).toBeVisible();

  const currentTitle = `PP1 Arbeitsablauf in Manual geprüft ${stamp}`;
  const futureTitle = `Fehlende Übergaben schließen ${stamp}`;
  const laterTitle = `Dokumentation und Wiederherstellung prüfen ${stamp}`;
  const currentId = await createIntermediateResult(page, currentTitle);
  await activateIntermediateResult(page, currentTitle);
  root = workbench(page);
  await expect(root.locator("[data-goal-journey]")).not.toHaveClass(
    /rounded-xl/,
  );
  await expect(root.locator("[data-goal-journey]")).toContainText(
    "Danach → Ziel prüfen",
  );
  await createIntermediateResult(page, futureTitle);
  await createIntermediateResult(page, laterTitle);
  root = workbench(page);
  const progression = root.locator("[data-goal-progression]");
  await expect(progression.locator("li[data-goal-milestone-id]")).toHaveCount(
    3,
  );
  await expect(
    progression.locator("li[data-goal-stage-status='active']"),
  ).toHaveCount(1);
  await expect(
    progression.locator("li[data-goal-stage-status='planned']"),
  ).toHaveCount(2);
  await expect(progression).not.toContainText(/Task|Aufgabe|READY|BLOCKED|%/i);

  const projectTitle = `Manual Goal delivery project ${stamp}`;
  await createContextProject(page, goalId!, currentId, projectTitle);
  root = workbench(page);
  const projectLink = root
    .locator("[data-goal-current-workbench]")
    .getByRole("link", { name: projectTitle, exact: true });
  await expect(projectLink).toBeVisible();
  const projectId = (await projectLink.getAttribute("href"))?.split("/").pop();
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/i);

  const blockerTitle = `Ungeklärte Voraussetzung beheben ${stamp}`;
  const blockerInsert = await api
    .from("tasks")
    .insert({
      user_id: userId,
      goal_id: goalId,
      project_id: projectId,
      title: blockerTitle,
      status: "planned",
      priority: "P1",
    })
    .select("id")
    .single();
  expect(blockerInsert.error).toBeNull();
  const blockerId = blockerInsert.data!.id;

  const readyTitle = `Manual Flow im Alltag pruefen ${stamp}`;
  const readyTask = await createCurrentTask(
    page,
    goalId!,
    readyTitle,
    projectId!,
  );
  root = workbench(page);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "open_ready_task",
  );
  await expect(
    root.locator("[data-goal-now]").getByRole("heading", {
      name: readyTitle,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    root.locator("[data-goal-now]").getByRole("link", {
      name: "Aufgabe öffnen",
      exact: true,
    }),
  ).toBeVisible();

  const blockedTitle = `Datenabgleich erst nach Voraussetzung prüfen ${stamp}`;
  const blockedTask = await createCurrentTask(
    page,
    goalId!,
    blockedTitle,
    projectId!,
    true,
  );
  await addDependency(page, blockedTask.taskId, blockerId);
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "open_ready_task",
  );
  await expect(
    root.locator("[data-goal-now]").getByRole("heading", {
      name: readyTitle,
      exact: true,
    }),
  ).toBeVisible();
  const taskRows = root.locator("[data-goal-current-task]");
  await expect(taskRows).toHaveCount(2);
  await expect(taskRows.first()).toHaveAttribute(
    "data-goal-current-task",
    readyTask.taskId,
  );
  const blockedRow = root
    .locator('[data-goal-current-task-state="blocked"]')
    .filter({ hasText: blockedTitle });
  await expect(blockedRow).toBeVisible();
  await expect(
    blockedRow.getByRole("link", { name: blockerTitle, exact: true }),
  ).toBeVisible();
  await expect(progression).not.toContainText(readyTitle);
  await expect(progression).not.toContainText(blockedTitle);
  await captureViewports(page, testInfo);

  await completeTask(page, readyTask.taskId);
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "resolve_blocker",
  );
  await expect(
    root.locator("[data-goal-now]").getByRole("heading", {
      name: "Was hält den nächsten Schritt auf?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    root.locator("[data-goal-now]").getByRole("link", {
      name: "Voraussetzung öffnen",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    root.locator('ul[aria-label="Offene Aufgaben-Voraussetzungen"]'),
  ).toContainText(blockerTitle);

  await completeTask(page, blockerId);
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "open_ready_task",
  );
  await expect(
    root.locator("[data-goal-now]").getByRole("heading", {
      name: blockedTitle,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    root.locator("[data-goal-current-task]").filter({
      hasText: blockedTitle,
    }),
  ).toHaveAttribute("data-goal-current-task-state", "ready");

  await completeTask(page, blockedTask.taskId);
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "review_milestone",
  );
  await expect(
    root.locator("[data-goal-now]").getByRole("heading", {
      name: "Ist das Zwischenziel erreicht?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    root.locator("[data-goal-current-workbench]").getByRole("link", {
      name: "Weitere Aufgabe planen",
      exact: true,
    }),
  ).toBeVisible();
  await expect(root.locator("[data-goal-now] select:visible")).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await root
    .getByRole("button", { name: "Zwischenziel erreicht", exact: true })
    .click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-current-workbench]")).toContainText(
    futureTitle,
  );
  await expect(
    root
      .locator("[data-goal-progression] li[data-goal-milestone-id]")
      .filter({ hasText: currentTitle }),
  ).toHaveAttribute("data-goal-stage-status", "achieved");
  await expect(
    root
      .locator("[data-goal-progression] li[data-goal-milestone-id]")
      .filter({ hasText: futureTitle }),
  ).toHaveAttribute("data-goal-stage-status", "active");

  const keyboardPlanningToggle = root.getByRole("button", {
    name: "Planung bearbeiten",
    exact: true,
  });
  await keyboardPlanningToggle.focus();
  await page.keyboard.press("Enter");
  const planningDoneToggle = root.getByRole("button", {
    name: "Fertig",
    exact: true,
  });
  await expect(planningDoneToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(keyboardPlanningToggle).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(keyboardPlanningToggle).toBeFocused();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
