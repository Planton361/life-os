import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function createGoal(page: Page, title: string) {
  await page.goto("/goals/new");
  const form = page.locator('form[aria-label="Goal erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByLabel("Status", { exact: true }).selectOption("active");
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await expect(page.getByText("Goal erstellt.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/i);
  const goalId = page.url().match(/\/goals\/([^/?#]+)/)?.[1];
  expect(goalId).toBeTruthy();
  return goalId!;
}

async function createProject(page: Page, title: string) {
  await page.goto("/projects/new");
  const form = page.locator('form[aria-label="Project erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Project erstellen" }).click();
  await expect(page.getByText("Project erstellt.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/i);
  const projectId = page.url().match(/\/projects\/([^/?#]+)/)?.[1];
  expect(projectId).toBeTruthy();
  return projectId!;
}

async function createTask(page: Page, title: string) {
  await page.goto("/tasks/new");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/i);
  const taskId = page.url().match(/\/tasks\/([^/?#]+)/)?.[1];
  expect(taskId).toBeTruthy();
  return taskId!;
}

async function openMilestoneCreate(page: Page) {
  const outcome = page.locator('[data-goal-outcome="workbench"]');
  const form = outcome.locator('form[aria-label="Milestone erstellen"]');
  if (!(await form.isVisible())) {
    await outcome.getByText("Milestone definieren", { exact: true }).click();
  }
  return form;
}

async function openCriterionCreate(page: Page) {
  const outcome = page.locator('[data-goal-outcome="workbench"]');
  const form = outcome.locator('form[aria-label="Kriterium erstellen"]');
  if (!(await form.isVisible())) {
    await outcome.getByText("Kriterium definieren", { exact: true }).click();
  }
  return form;
}

test("PP1 goal outcome planning is a complete Manual vertical slice", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const stamp = Date.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const goalTitle = `PP1 outcome goal ${stamp}`;
  const milestoneOneTitle = `PP1 milestone one ${stamp}`;
  const milestoneTwoTitle = `PP1 milestone two ${stamp}`;
  const booleanTitle = `PP1 boolean criterion ${stamp}`;
  const numericTitle = `PP1 numeric criterion ${stamp}`;

  await signUpTechnicalManualUser(page, "pp1-goal-outcome", stamp);
  const goalId = await createGoal(page, goalTitle);

  await page.goto(`/goals/${goalId}`);
  const outcome = page.locator('[data-goal-outcome="workbench"]');
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText("Legacy progress and generic percentages are not used here.");
  await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeDisabled();

  let milestoneForm = await openMilestoneCreate(page);
  await milestoneForm.getByLabel("Titel").fill(milestoneOneTitle);
  await milestoneForm.getByLabel("Startstatus").selectOption("active");
  await milestoneForm.getByRole("button", { name: "Milestone erstellen" }).click();
  await expect(page.getByText("Milestone erstellt.", { exact: true })).toBeVisible();

  milestoneForm = await openMilestoneCreate(page);
  await milestoneForm.getByLabel("Titel").fill(milestoneTwoTitle);
  await milestoneForm.getByLabel("Startstatus").selectOption("planned");
  await milestoneForm.getByRole("button", { name: "Milestone erstellen" }).click();
  await expect(page.getByText("Milestone erstellt.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome.getByRole("heading", { name: milestoneOneTitle, exact: true })).toBeVisible();
  await expect(outcome.getByRole("heading", { name: milestoneTwoTitle, exact: true })).toBeVisible();

  let criterionForm = await openCriterionCreate(page);
  await criterionForm.getByLabel("Titel").fill(booleanTitle);
  await criterionForm.getByLabel("Typ").selectOption("boolean");
  await criterionForm.getByLabel("Milestone (optional)").selectOption({ label: milestoneOneTitle });
  await criterionForm.getByRole("button", { name: "Kriterium erstellen" }).click();
  await expect(page.getByText("Kriterium erstellt.", { exact: true })).toBeVisible();

  criterionForm = await openCriterionCreate(page);
  await criterionForm.getByLabel("Titel").fill(numericTitle);
  await criterionForm.getByLabel("Typ").selectOption("numeric");
  await criterionForm.getByLabel("Milestone (optional)").selectOption({ label: milestoneTwoTitle });
  await criterionForm.getByLabel("Einheit (numeric)").fill("hours");
  await criterionForm.getByLabel("Ziel (numeric)").fill("-2.5");
  await criterionForm.getByLabel("Richtung (numeric)").selectOption("at_least");
  await criterionForm.getByRole("button", { name: "Kriterium erstellen" }).click();
  await expect(page.getByText("Kriterium erstellt.", { exact: true })).toBeVisible();
  await page.reload();

  const booleanCriterion = outcome.locator("[data-goal-criterion-id]").filter({ hasText: booleanTitle });
  const numericCriterion = outcome.locator("[data-goal-criterion-id]").filter({ hasText: numericTitle });
  await expect(booleanCriterion).toBeVisible();
  await expect(numericCriterion).toContainText("at_least -2.5 hours");
  await expect(outcome).not.toContainText(/\d+%/);

  const booleanEvaluation = booleanCriterion.locator('form[aria-label="Bewertung speichern"]');
  await booleanEvaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await booleanEvaluation.getByLabel("Wert", { exact: true }).selectOption("false");
  await booleanEvaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(booleanCriterion).toContainText("nicht erfüllt");
  await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeDisabled();

  const deferredEvaluation = booleanCriterion.locator('form[aria-label="Bewertung speichern"]');
  await deferredEvaluation.getByLabel("Bewertungsstatus").selectOption("deferred");
  await deferredEvaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(booleanCriterion).toContainText("deferred");
  await expect(outcome).toContainText("Deferred: 1");
  await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeDisabled();

  const metBooleanEvaluation = booleanCriterion.locator('form[aria-label="Bewertung speichern"]');
  await metBooleanEvaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await metBooleanEvaluation.getByLabel("Wert", { exact: true }).selectOption("true");
  await metBooleanEvaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();
  const numericEvaluation = numericCriterion.locator('form[aria-label="Bewertung speichern"]');
  await numericEvaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await numericEvaluation.getByLabel("Aktueller Wert").fill("-1");
  await numericEvaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();

  const firstMilestone = outcome.locator("[data-goal-milestone-id]").filter({ hasText: milestoneOneTitle });
  const secondMilestone = outcome.locator("[data-goal-milestone-id]").filter({ hasText: milestoneTwoTitle });
  await firstMilestone.getByRole("button", { name: "Erreicht" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(firstMilestone).toContainText("achieved");
  await secondMilestone.getByRole("button", { name: "Aktivieren" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(secondMilestone).toContainText("active");
  await secondMilestone.getByRole("button", { name: "Erreicht" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome).toContainText("Readiness: bereit");
  await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeEnabled();

  const projectTitle = `PP1 support project ${stamp}`;
  const projectId = await createProject(page, projectTitle);
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  const projectForm = page.locator('form[aria-label="Project bearbeiten"]');
  await projectForm.getByLabel("Direktes Goal").selectOption({ label: goalTitle });
  await projectForm.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.getByText("Project aktualisiert.", { exact: true })).toBeVisible();

  const taskTitle = `PP1 support task ${stamp}`;
  const taskId = await createTask(page, taskTitle);
  await page.goto(`/tasks/${taskId}`);
  const taskForm = page.locator('form[aria-label="Task bearbeiten"]');
  await taskForm.getByLabel("Project").selectOption({ label: projectTitle });
  await taskForm.getByLabel("Direktes Goal").selectOption("");
  await taskForm.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(taskForm.getByLabel("Project")).toHaveValue(projectId);
  await expect(taskForm.getByLabel("Direktes Goal")).toHaveValue("");

  await page.goto(`/goals/${goalId}`);
  const projectSupportForm = outcome.locator('form[aria-label="Project verknüpfen"]');
  await projectSupportForm.getByLabel("Milestone").selectOption({ label: milestoneOneTitle });
  await projectSupportForm.getByLabel("Project").selectOption({ label: projectTitle });
  await projectSupportForm.getByRole("button", { name: "Project verknüpfen" }).click();
  await expect(page.getByText("Project als Support-Kontext verknüpft.", { exact: true })).toBeVisible();
  const taskSupportForm = outcome.locator('form[aria-label="Task verknüpfen"]');
  await taskSupportForm.getByLabel("Milestone").selectOption({ label: milestoneOneTitle });
  await taskSupportForm.getByLabel("Task").selectOption({ label: taskTitle });
  await taskSupportForm.getByRole("button", { name: "Task verknüpfen" }).click();
  await expect(page.getByText("Task als Support-Kontext verknüpft.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome).toContainText(projectTitle);
  await expect(outcome).toContainText(taskTitle);

  page.once("dialog", (dialog) => dialog.accept());
  await outcome.getByRole("button", { name: "Goal explizit erreichen" }).click();
  await expect(page.getByText("Goal erreicht.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome).toContainText("Goal Outcome Workbench · achieved");
  await expect(outcome.getByRole("button", { name: "Goal wieder öffnen" })).toBeVisible();
  await expect(booleanCriterion).toContainText("Verlauf anzeigen (3)");

  await outcome.getByRole("button", { name: "Goal wieder öffnen" }).click();
  await expect(page.getByText("Goal wieder geöffnet.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome).toContainText("Goal Outcome Workbench · active");
  await expect(booleanCriterion).toContainText("Verlauf anzeigen (3)");

  await secondMilestone.getByRole("button", { name: "Wieder aktivieren" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(secondMilestone).toContainText("active");
  await secondMilestone.getByRole("button", { name: "Planen" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(secondMilestone).toContainText("planned");
  await secondMilestone.getByRole("button", { name: "Aktivieren" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await secondMilestone.getByRole("button", { name: "Erreicht" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(secondMilestone).toContainText("achieved");

  await secondMilestone.getByRole("button", { name: "Milestone archivieren" }).click();
  await expect(page.getByText("Milestone archiviert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(secondMilestone).toContainText("archiviert");

  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  await expect(page.locator('[data-entity-type="goal"]').filter({ hasText: goalTitle })).toContainText("Outcome");
  await expect(page.getByRole("complementary", { name: "Selected Entity" })).toContainText("Goal Outcome");
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Selected Entity" })).toContainText("Goal Outcome");

  const portfolioUrl = `/portfolio?view=goals&selected=${goalId}`;
  const controls = page.getByRole("region", {
    name: "Portfolio view, scope and sort controls",
  });
  for (const [label, type] of [
    ["All", null],
    ["Tasks", "tasks"],
    ["Projects", "projects"],
    ["Goals", "goals"],
    ["Skills", "skills"],
  ] as const) {
    const links = controls.getByRole("link", { name: label, exact: true });
    const link = label === "All" ? links.first() : links;
    await link.click();
    if (type) await expect(page).toHaveURL(new RegExp(`type=${type}`));
    else await expect(page).not.toHaveURL(/type=/);
  }
  await page.goto(portfolioUrl);

  for (const [label, scope] of [
    ["All", null],
    ["Due this week", "due_this_week"],
    ["In progress", "in_progress"],
    ["Blocked", "blocked"],
    ["Needs decision", "needs_decision"],
    ["Review open", "review_open"],
    ["High focus", "high_focus"],
    ["Area: Education", "area_education"],
    ["Area: Work", "area_work"],
    ["Area: Coding", "area_coding"],
    ["Area: Health", "area_health"],
  ] as const) {
    const links = controls.getByRole("link", { name: label, exact: true });
    const link = label === "All" ? links.nth(1) : links;
    await link.click();
    if (scope) await expect(page).toHaveURL(new RegExp(`scope=${scope}`));
    else await expect(page).not.toHaveURL(/scope=/);
  }
  await page.goto(portfolioUrl);

  for (const [label, sort] of [
    ["Priority", null],
    ["Deadline", "deadline"],
    ["Recently touched", "recent"],
  ] as const) {
    await controls.getByRole("link", { name: label, exact: true }).click();
    if (sort) await expect(page).toHaveURL(new RegExp(`sort=${sort}`));
    else await expect(page).not.toHaveURL(/sort=/);
  }
  await page.goto(portfolioUrl);

  await page.locator('a[data-entity-type="goal"]').filter({ hasText: goalTitle }).click();
  await expect(page).toHaveURL(new RegExp(`selected=${goalId}`));
  await page.getByRole("complementary", { name: "Selected Entity" }).getByRole("link", { name: "Details öffnen" }).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${goalId}$`));

  for (const [label, path] of [
    ["Task", "/tasks/new"],
    ["Project", "/projects/new"],
    ["Goal", "/goals/new"],
    ["Skill", "/skills/new"],
    ["Resource", "/resources/new"],
  ] as const) {
    await page.goto(portfolioUrl);
    await page.getByRole("navigation", { name: "Entity erstellen" }).getByRole("link", { name: `${label} erstellen`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
  }
  await page.goto(portfolioUrl);

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.screenshot({ path: test.info().outputPath("portfolio-4k.png"), fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: test.info().outputPath("portfolio-1920.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath("portfolio-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: new RegExp(goalTitle) }).focus();
  await expect(page.getByRole("link", { name: new RegExp(goalTitle) })).toBeFocused();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Goal-level criterion persists without a milestone and only active Goals can achieve", async ({ page }) => {
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "pp1-goal-lifecycle", stamp);
  await createGoal(page, `PP1 lifecycle ${stamp}`);
  const outcome = page.locator('[data-goal-outcome="workbench"]');
  const form = await openCriterionCreate(page);
  await form.getByLabel("Titel").fill(`Goal-level ${stamp}`);
  await form.getByLabel("Typ", { exact: true }).selectOption("boolean");
  await expect(form.getByLabel("Milestone (optional)")).toHaveValue("");
  await form.getByRole("button", { name: "Kriterium erstellen" }).click();
  await expect(page.getByText("Kriterium erstellt.", { exact: true })).toBeVisible();
  await page.reload();
  const criterion = outcome.locator("[data-goal-criterion-id]").filter({ hasText: `Goal-level ${stamp}` });
  await expect(criterion).toContainText("Goal-weit");
  const evaluation = criterion.locator('form[aria-label="Bewertung speichern"]');
  await evaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await evaluation.getByLabel("Wert", { exact: true }).selectOption("true");
  await evaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(criterion).toContainText("Letzte Bewertung: true");
  const edit = page.locator('form[aria-label="Goal bearbeiten"]');
  for (const status of ["draft", "paused", "active"]) {
    await edit.getByLabel("Status", { exact: true }).selectOption(status);
    await edit.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByText("Goal aktualisiert.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(outcome).toContainText(`Goal Outcome Workbench · ${status}`);
    await expect(criterion).toContainText("Letzte Bewertung: true");
    if (status !== "active") {
      await expect(outcome.getByLabel("Achievement-Blocker")).toContainText("Nur aktive Goals können erreicht werden");
      await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeDisabled();
    }
  }
  await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeEnabled();
  page.once("dialog", (dialog) => dialog.accept());
  await outcome.getByRole("button", { name: "Goal explizit erreichen" }).click();
  await expect(page.getByText("Goal erreicht.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome).toContainText("Goal Outcome Workbench · achieved");
  await expect(criterion).toContainText("Goal-weit");
});

test("PP1 keeps Demo, Empty and auth-blocked Goal routes honest", async ({ page }) => {
  const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
  const port = process.env.PLAYWRIGHT_PORT ?? "3000";
  const origin = `http://${host}:${port}`;
  for (const profile of ["demo", "empty", "manual"]) {
    await page.context().addCookies([
      { httpOnly: true, name: "life_os_profile", sameSite: "Lax", url: origin, value: profile },
    ]);
    await page.goto("/goals/new");
    await expect(page.getByText("Diese Entity-Surface benötigt das Manual-Profil", { exact: false })).toBeVisible();
    await expect(page.locator('form[aria-label="Goal erstellen"]')).toHaveCount(0);
  }
});
