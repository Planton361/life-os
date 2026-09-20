import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function createGoal(page: Page, title: string) {
  await page.goto("/goals/new");
  const form = page.locator('form[aria-label="Goal erstellen"]');
  await form.getByLabel("Titel").fill(title);
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
  await booleanEvaluation.getByLabel("Wert").selectOption("false");
  await booleanEvaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(booleanCriterion).toContainText("nicht erfüllt");
  await expect(outcome.getByRole("button", { name: "Goal explizit erreichen" })).toBeDisabled();

  await booleanCriterion.locator('form[aria-label="Bewertung speichern"]').getByLabel("Wert").selectOption("true");
  await booleanCriterion.locator('form[aria-label="Bewertung speichern"]').getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();
  await numericCriterion.locator('form[aria-label="Bewertung speichern"]').getByLabel("Aktueller Wert").fill("-1");
  await numericCriterion.locator('form[aria-label="Bewertung speichern"]').getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(page.getByText("Kriterium bewertet.", { exact: true })).toBeVisible();

  const firstMilestone = outcome.locator("[data-goal-milestone-id]").filter({ hasText: milestoneOneTitle });
  const secondMilestone = outcome.locator("[data-goal-milestone-id]").filter({ hasText: milestoneTwoTitle });
  await firstMilestone.getByRole("button", { name: "Erreicht" }).click();
  await expect(page.getByText("Milestone-Status gespeichert.", { exact: true })).toBeVisible();
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
  await taskForm.getByLabel("Direktes Goal").selectOption({ label: goalTitle });
  await taskForm.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();

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
  await expect(booleanCriterion).toContainText("Verlauf anzeigen (2)");

  await outcome.getByRole("button", { name: "Goal wieder öffnen" }).click();
  await expect(page.getByText("Goal wieder geöffnet.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome).toContainText("Goal Outcome Workbench · active");
  await expect(booleanCriterion).toContainText("Verlauf anzeigen (2)");

  await secondMilestone.getByRole("button", { name: "Milestone archivieren" }).click();
  await expect(page.getByText("Milestone archiviert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(secondMilestone).toContainText("archiviert");

  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  await expect(page.locator('[data-entity-type="goal"]').filter({ hasText: goalTitle })).toContainText("Outcome");
  await expect(page.getByRole("complementary", { name: "Selected Entity" })).toContainText("Goal Outcome");
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Selected Entity" })).toContainText("Goal Outcome");

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
