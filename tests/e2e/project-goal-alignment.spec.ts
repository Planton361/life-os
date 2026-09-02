import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function createGoal(page: Page, title: string) {
  await page.goto("/portfolio?view=goals");
  const form = page.locator('form[aria-label="Goal erstellen"]');
  await form.getByLabel("Goal-Titel").fill(title);
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await expect(page.getByText("Goal erstellt.", { exact: true })).toBeVisible();
  const goalId = new URL(page.url()).searchParams.get("selected");
  expect(goalId).toBeTruthy();
  return goalId!;
}

async function createProject(page: Page, title: string) {
  await page.goto("/portfolio?view=projects");
  const form = page.locator('form[aria-label="Project erstellen"]');
  await form.getByLabel("Project-Titel").fill(title);
  await form.getByRole("button", { name: "Project erstellen" }).click();
  await expect(page.getByText("Project erstellt.", { exact: true })).toBeVisible();
  const projectId = new URL(page.url()).searchParams.get("selected");
  expect(projectId).toBeTruthy();
  return projectId!;
}

async function createTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
  const taskId = new URL(page.url()).searchParams.get("selected");
  expect(taskId).toBeTruthy();
  return taskId!;
}

async function taskEditForm(page: Page, taskId: string) {
  await page.goto(`/portfolio?view=tasks&selected=${taskId}`);
  return page.locator('form[aria-label="Task bearbeiten"]');
}

test("C1.1-03 aligns direct and inherited task goals without silent conflicts", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const goalATitle = `C11 alignment goal A ${stamp}`;
  const goalBTitle = `C11 alignment goal B ${stamp}`;
  const projectTitle = `C11 alignment project ${stamp}`;
  const directTaskTitle = `C11 alignment direct task ${stamp}`;
  const inheritedTaskTitle = `C11 alignment inherited task ${stamp}`;

  await signUpTechnicalManualUser(page, "c1-1-03", stamp);
  const goalAId = await createGoal(page, goalATitle);
  await createGoal(page, goalBTitle);
  const projectId = await createProject(page, projectTitle);
  const directTaskId = await createTask(page, directTaskTitle);

  let taskForm = await taskEditForm(page, directTaskId);
  await taskForm.getByLabel("Goal").selectOption({ label: goalATitle });
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();

  taskForm = await taskEditForm(page, directTaskId);
  await taskForm.getByLabel("Project").selectOption({ label: projectTitle });
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();

  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  let projectForm = page.locator('form[aria-label="Project bearbeiten"]');
  await projectForm.getByLabel("Goal-Kontext").selectOption({ label: goalBTitle });
  await projectForm.getByRole("button", { name: "Project speichern" }).click();
  await expect(page.getByText(/Project kann dieses Goal nicht übernehmen/)).toBeVisible();
  await page.reload();
  projectForm = page.locator('form[aria-label="Project bearbeiten"]');
  await expect(projectForm.getByLabel("Goal-Kontext")).toHaveValue("");

  await projectForm.getByLabel("Goal-Kontext").selectOption({ label: goalATitle });
  await projectForm.getByRole("button", { name: "Project speichern" }).click();
  await expect(page.getByText("Project aktualisiert.", { exact: true })).toBeVisible();

  await page.goto(`/portfolio?view=tasks&selected=${directTaskId}`);
  const directContext = page.locator("[data-connected-context]");
  await expect(
    directContext.locator(`[data-connected-context-entry="goal:${goalAId}"]`),
  ).toHaveCount(1);
  await expect(directContext.getByText("Direkt und via Project", { exact: false })).toBeVisible();
  await page.reload();
  await expect(
    directContext.locator(`[data-connected-context-entry="goal:${goalAId}"]`),
  ).toHaveCount(1);

  const inheritedTaskId = await createTask(page, inheritedTaskTitle);
  taskForm = await taskEditForm(page, inheritedTaskId);
  await taskForm.getByLabel("Project").selectOption({ label: projectTitle });
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();
  await page.reload();
  const inheritedContext = page.locator("[data-connected-context]");
  await expect(inheritedContext.getByText("Via project", { exact: false })).toBeVisible();

  taskForm = await taskEditForm(page, inheritedTaskId);
  await taskForm.getByLabel("Goal").selectOption({ label: goalBTitle });
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText(/Dieses direkte Goal widerspricht/)).toBeVisible();
  await page.reload();
  taskForm = page.locator('form[aria-label="Task bearbeiten"]');
  await expect(taskForm.getByLabel("Goal")).toHaveValue("");

  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  const projectWorkbench = page.locator(
    "section[aria-labelledby='project-workbench-heading']",
  );
  await expect(projectWorkbench.getByText(directTaskTitle, { exact: true })).toBeVisible();
  await expect(projectWorkbench.getByText(inheritedTaskTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(projectWorkbench.getByText(inheritedTaskTitle, { exact: true })).toBeVisible();

  await page.goto(`/portfolio?view=goals&selected=${goalAId}`);
  const goalWorkbench = page.locator(
    "section[aria-labelledby='goal-workbench-heading']",
  );
  await expect(goalWorkbench.getByText(directTaskTitle, { exact: true })).toHaveCount(1);
  await expect(goalWorkbench.getByText(inheritedTaskTitle, { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(goalWorkbench.getByText(inheritedTaskTitle, { exact: true })).toHaveCount(1);

  await page.goto(`/tasks/${directTaskId}`);
  await expect(
    page.getByRole("link", { name: new RegExp(`Goal · Direct and via Project: ${goalATitle}`) }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: new RegExp(`Goal · Direct and via Project: ${goalATitle}`) }),
  ).toBeVisible();
});
