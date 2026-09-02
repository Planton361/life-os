import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function createGoal(page: Page, title: string) {
  await page.goto("/portfolio?view=goals");
  const form = page.locator('form[aria-label="Goal erstellen"]');
  await form.getByLabel("Goal-Titel").fill(title);
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await expect(page.getByText("Goal erstellt.", { exact: true })).toBeVisible();
  return new URL(page.url()).searchParams.get("selected")!;
}

async function createProject(page: Page, title: string) {
  await page.goto("/portfolio?view=projects");
  const form = page.locator('form[aria-label="Project erstellen"]');
  await form.getByLabel("Project-Titel").fill(title);
  await form.getByRole("button", { name: "Project erstellen" }).click();
  await expect(page.getByText("Project erstellt.", { exact: true })).toBeVisible();
  return new URL(page.url()).searchParams.get("selected")!;
}

async function createTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
  return new URL(page.url()).searchParams.get("selected")!;
}

async function createSkill(page: Page, title: string) {
  await page.goto("/portfolio?view=skills");
  const form = page.locator('form[aria-label="Skill erstellen"]');
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByRole("button", { name: "Skill erstellen" }).click();
  await expect(page.getByText("Skill erstellt.", { exact: true })).toBeVisible();
  return new URL(page.url()).searchParams.get("selected")!;
}

test("C2-01 schedules a canonical queue task through the Week inspector", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const goalTitle = `C2 weekly goal ${stamp}`;
  const projectTitle = `C2 weekly project ${stamp}`;
  const taskTitle = `C2 weekly task ${stamp}`;
  const skillTitle = `C2 weekly skill ${stamp}`;

  await signUpTechnicalManualUser(page, "c2-01", stamp);
  const goalId = await createGoal(page, goalTitle);
  const projectId = await createProject(page, projectTitle);
  const taskId = await createTask(page, taskTitle);
  const skillId = await createSkill(page, skillTitle);

  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  const projectForm = page.locator('form[aria-label="Project bearbeiten"]');
  await projectForm.getByLabel("Goal-Kontext").selectOption(goalId);
  await projectForm.getByRole("button", { name: "Project speichern" }).click();
  await expect(page.getByText("Project aktualisiert.", { exact: true })).toBeVisible();

  await page.goto(`/portfolio?view=tasks&selected=${taskId}`);
  const taskForm = page.locator('form[aria-label="Task bearbeiten"]');
  await taskForm.getByLabel("Project").selectOption(projectId);
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();

  const taskSkills = page.locator('[data-task-skill-region="task"]');
  const taskSkillForm = taskSkills.getByRole("form", {
    name: "Skill mit Task verknüpfen",
  });
  await taskSkillForm.getByLabel("Skill suchen / auswählen").selectOption(skillId);
  await taskSkillForm.getByRole("button", { name: "Skill verknüpfen" }).click();
  await expect(page.getByText("Skill mit Task verknüpft.", { exact: true })).toBeVisible();

  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  const queueItem = queue.getByRole("button", { name: new RegExp(taskTitle) });
  await expect(queueItem).toBeVisible();
  await expect(queueItem).toContainText(projectTitle);
  await expect(queueItem).toContainText(goalTitle);
  await expect(queueItem).toContainText(skillTitle);
  await queueItem.click();

  const schedule = page.locator('[data-calendar-section="queue-schedule"]');
  const scheduleForm = schedule.getByRole("form", { name: `${taskTitle} planen` });
  await expect(scheduleForm).toBeVisible();
  const plannedDate = await scheduleForm.getByLabel("Weekday").inputValue();
  expect(plannedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await scheduleForm.getByLabel("Start time").fill("09:00");
  await scheduleForm.getByLabel("Duration").selectOption("45");
  await scheduleForm.getByRole("button", { name: "Schedule task" }).click();
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  const taskBlock = weekGrid.getByRole("button", { name: new RegExp(taskTitle) });
  await expect(taskBlock).toBeVisible();
  await expect(taskBlock).toHaveAccessibleName(
    new RegExp(`${taskTitle}.*09:00 to 09:45`),
  );
  await page.reload();
  await expect(taskBlock).toBeVisible();
  await expect(queue.getByRole("button", { name: new RegExp(taskTitle) })).toHaveCount(0);

  await taskBlock.click();
  const inspector = page.locator('[data-calendar-section="inspector"]');
  await inspector.getByRole("button", { name: "15 min später" }).click();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(`${taskTitle}.*09:15`) }),
  ).toBeVisible();
  await page.reload();
  await expect(weekGrid.getByRole("button", { name: new RegExp(`${taskTitle}.*09:15`) })).toBeVisible();

  await weekGrid.getByRole("button", { name: new RegExp(taskTitle) }).click();
  await inspector.getByRole("button", { name: "Dauer +15 min" }).click();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(`${taskTitle}.*09:15 to 10:15`) }),
  ).toBeVisible();
  await page.reload();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(`${taskTitle}.*09:15 to 10:15`) }),
  ).toBeVisible();

  await weekGrid.getByRole("button", { name: new RegExp(taskTitle) }).click();
  await inspector.getByRole("button", { name: "Unschedule" }).click();
  await expect(weekGrid.getByRole("button", { name: new RegExp(taskTitle) })).toHaveCount(0);
  await page.reload();
  await expect(weekGrid.getByRole("button", { name: new RegExp(taskTitle) })).toHaveCount(0);
  await expect(queue.getByRole("button", { name: new RegExp(taskTitle) })).toBeVisible();

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.reload();
  await expect(weekGrid).toBeVisible();
  await expect(queue).toBeVisible();
});
