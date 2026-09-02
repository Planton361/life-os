import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function createGoal(page: Page, title: string) {
  await page.goto("/portfolio?view=goals");
  const form = page.locator('form[aria-label="Goal erstellen"]');
  await form.getByLabel("Goal-Titel").fill(title);
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await expect(page.getByText("Goal erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function createProject(page: Page, title: string) {
  await page.goto("/portfolio?view=projects");
  const form = page.locator('form[aria-label="Project erstellen"]');
  await form.getByLabel("Project-Titel").fill(title);
  await form.getByRole("button", { name: "Project erstellen" }).click();
  await expect(page.getByText("Project erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function createTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function createSkill(page: Page, title: string) {
  await page.goto("/portfolio?view=skills");
  const form = page.locator('form[aria-label="Skill erstellen"]');
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByRole("button", { name: "Skill erstellen" }).click();
  await expect(page.getByText("Skill erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function createResource(page: Page, title: string) {
  await page.goto("/resources");
  const form = page.locator('form[aria-label="Resource erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Resource speichern" }).click();
  await expect(page.getByText("Resource erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function linkResourceTarget(
  page: Page,
  resourceId: string,
  targetId: string,
  targetType: "goal" | "project" | "skill" | "task",
  expected: "saved" | "existing" = "saved",
) {
  await page.goto(`/resources?selected=${resourceId}`);
  const form = page.locator('form[aria-label="Resource Beziehung hinzufügen"]');
  await form.getByLabel("Zieltyp").selectOption(targetType);
  await form.getByLabel("Ziel", { exact: true }).selectOption(targetId);
  await form.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByText(
      expected === "saved" ? "Beziehung gespeichert." : "Beziehung besteht bereits.",
      { exact: true },
    ),
  ).toBeVisible();
}

test("C1.1 proves one reload-stable canonical core work graph", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const goalTitle = `C11 graph goal ${stamp}`;
  const projectTitle = `C11 graph project ${stamp}`;
  const taskTitle = `C11 graph task ${stamp}`;
  const skillTitle = `C11 graph skill ${stamp}`;
  const resourceTitle = `C11 graph resource ${stamp}`;

  await signUpTechnicalManualUser(page, "c1-1-05", stamp);
  const goalId = await createGoal(page, goalTitle);
  const projectId = await createProject(page, projectTitle);
  const taskId = await createTask(page, taskTitle);
  const skillId = await createSkill(page, skillTitle);
  const resourceId = await createResource(page, resourceTitle);

  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  const projectForm = page.locator('form[aria-label="Project bearbeiten"]');
  await projectForm.getByLabel("Goal-Kontext").selectOption(goalId);
  await projectForm.getByRole("button", { name: "Project speichern" }).click();
  await expect(page.getByText("Project aktualisiert.", { exact: true })).toBeVisible();

  await page.goto(`/portfolio?view=tasks&selected=${taskId}`);
  const taskForm = page.locator('form[aria-label="Task bearbeiten"]');
  await taskForm.getByLabel("Project").selectOption(projectId);
  await taskForm.getByLabel("Goal").selectOption(goalId);
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();

  const taskRegion = page.locator('[data-task-skill-region="task"]');
  const taskSkillForm = taskRegion.getByRole("form", {
    name: "Skill mit Task verknüpfen",
  });
  await taskSkillForm.getByLabel("Skill suchen / auswählen").selectOption(skillId);
  await taskSkillForm.getByRole("button", { name: "Skill verknüpfen" }).click();
  await expect(page.getByText("Skill mit Task verknüpft.", { exact: true })).toBeVisible();
  await expect(taskRegion.locator(`[data-task-skill-link="${skillId}"]`)).toHaveCount(1);
  await expect(
    taskSkillForm.getByRole("option", { name: skillTitle, exact: true }),
  ).toHaveCount(0);

  await linkResourceTarget(page, resourceId, projectId, "project");
  await linkResourceTarget(page, resourceId, goalId, "goal");
  await linkResourceTarget(page, resourceId, taskId, "task");
  await linkResourceTarget(page, resourceId, skillId, "skill");
  await linkResourceTarget(page, resourceId, skillId, "skill", "existing");

  await page.goto(`/portfolio?view=skills&selected=${skillId}`);
  const evidenceForm = page.locator('form[aria-label="Evidence hinzufügen"]');
  await evidenceForm
    .getByLabel("Evidence Source")
    .selectOption(`resource:${resourceId}`);
  await evidenceForm.getByLabel("Evidence-Titel").fill(`C11 graph evidence ${stamp}`);
  await evidenceForm.getByLabel("Datum").fill("2026-09-02");
  await evidenceForm.getByRole("button", { name: "Evidence hinzufügen" }).click();
  await expect(page.getByText("Skill Evidence erstellt.", { exact: true })).toBeVisible();

  const relatedResources = page.locator("[data-skill-related-resources]");
  const relatedResource = relatedResources.locator(
    `[data-skill-related-resource="${resourceId}"]`,
  );
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toBeVisible();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();
  const skillContext = page.locator("[data-connected-context]");
  const semanticResource = skillContext.locator(
    `[data-connected-context-entry="resource:${resourceId}"]`,
  );
  await expect(semanticResource).toHaveCount(1);
  await expect(semanticResource).toContainText("Context + Evidence");
  await page.reload();
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toBeVisible();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();

  await page.goto(`/tasks/${taskId}`);
  await expect(
    page.getByRole("link", { name: `Project: ${projectTitle}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: `Goal · Direct and via Project: ${goalTitle}`,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `Skill: ${skillTitle}` })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", {
      name: `Goal · Direct and via Project: ${goalTitle}`,
    }),
  ).toBeVisible();

  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  const projectWorkbench = page.locator(
    "section[aria-labelledby='project-workbench-heading']",
  );
  await expect(projectForm.getByLabel("Goal-Kontext")).toHaveValue(goalId);
  await expect(projectWorkbench.getByText(taskTitle, { exact: true })).toHaveCount(1);
  const projectResource = projectWorkbench
    .locator("article")
    .filter({ hasText: resourceTitle });
  await expect(projectResource).toHaveCount(1);
  await expect(projectResource.getByRole("link", { name: "Öffnen" })).toBeVisible();
  await projectWorkbench.getByRole("link", { name: taskTitle }).click();
  await expect(page).toHaveURL(
    new RegExp(`/portfolio\\?view=tasks&selected=${taskId}$`),
  );
  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  await page.reload();
  await expect(projectWorkbench.getByText(taskTitle, { exact: true })).toHaveCount(1);

  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  const goalWorkbench = page.locator(
    "section[aria-labelledby='goal-workbench-heading']",
  );
  await expect(goalWorkbench.getByText(projectTitle, { exact: true })).toHaveCount(1);
  await expect(goalWorkbench.getByText(taskTitle, { exact: true })).toHaveCount(1);
  await goalWorkbench.getByRole("link", { name: projectTitle }).click();
  await expect(page).toHaveURL(
    new RegExp(`/portfolio\\?view=projects&selected=${projectId}$`),
  );
  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  await expect(
    goalWorkbench.locator("article").filter({ hasText: resourceTitle }),
  ).toHaveCount(1);

  await page.goto(`/resources?selected=${resourceId}`);
  const inspector = page.locator('[data-resources-section="relation-inspector"]');
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Projects" }).getByText(projectTitle, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Goals" }).getByText(goalTitle, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Tasks" }).getByText(taskTitle, {
      exact: true,
    }),
  ).toBeVisible();
  const linkedSkills = inspector.getByRole("region", { name: "Verknüpfte Skills" });
  await expect(linkedSkills.getByText(skillTitle, { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(linkedSkills.getByText(skillTitle, { exact: true })).toHaveCount(1);

  const skillCard = linkedSkills.locator("article").filter({ hasText: skillTitle });
  await skillCard.getByRole("button", { name: "Verknüpfung lösen" }).click();
  await expect(page.getByText("Resource-Verknüpfung gelöst.", { exact: true })).toBeVisible();
  await page.goto(`/portfolio?view=skills&selected=${skillId}`);
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toHaveCount(0);
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();
  await page.reload();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();
});
