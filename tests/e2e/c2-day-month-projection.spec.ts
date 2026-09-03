import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

function addDays(iso: string, amount: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + amount));

  return value.toISOString().slice(0, 10);
}

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
  await expect(
    page.getByText("Project erstellt.", { exact: true }),
  ).toBeVisible();

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

async function updateGoalDate(
  page: Page,
  goalId: string,
  targetDate: string,
) {
  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  const form = page.locator('form[aria-label="Goal bearbeiten"]');
  await form.getByLabel("Target date").fill(targetDate);
  await form.getByRole("button", { name: "Goal speichern" }).click();
  await expect(page.getByText("Goal aktualisiert.", { exact: true })).toBeVisible();
}

async function updateProjectContext(
  page: Page,
  projectId: string,
  goalId: string,
  deadline: string,
) {
  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  const form = page.locator('form[aria-label="Project bearbeiten"]');
  await form.getByLabel("Goal-Kontext").selectOption(goalId);
  await form.getByLabel("Deadline").fill(deadline);
  await form.getByRole("button", { name: "Project speichern" }).click();
  await expect(
    page.getByText("Project aktualisiert.", { exact: true }),
  ).toBeVisible();
}

async function updateTaskContext(
  page: Page,
  taskId: string,
  options: Readonly<{
    dueAt: string;
    projectId?: string;
    status?: "done";
  }>,
) {
  await page.goto(`/portfolio?view=tasks&selected=${taskId}`);
  const form = page.locator('form[aria-label="Task bearbeiten"]');
  if (options.projectId) {
    await form.getByLabel("Project").selectOption(options.projectId);
  }
  await form.getByLabel("Deadline").fill(options.dueAt);
  if (options.status) {
    await form.getByLabel("Status").selectOption(options.status);
  }
  await form.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.getByText("Task gespeichert.", { exact: true })).toBeVisible();
}

test("C2-03 projects canonical day and month scheduling signals without fake milestones", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const goalTitle = `C2 month goal ${stamp}`;
  const projectTitle = `C2 month project ${stamp}`;
  const taskTitle = `C2 month scheduled task ${stamp}`;
  const overdueTitle = `C2 month overdue task ${stamp}`;
  const completedTitle = `C2 month completed task ${stamp}`;

  await signUpTechnicalManualUser(page, "c2-03", stamp);
  await page.goto("/calendar");
  const weekDays = page
    .locator('[data-calendar-section="week-grid"] [data-calendar-day]');
  const scheduledDate = await weekDays.nth(1).getAttribute("data-calendar-date");
  const dueDate = await weekDays.nth(3).getAttribute("data-calendar-date");
  const projectDate = await weekDays.nth(4).getAttribute("data-calendar-date");
  const goalDate = await weekDays.nth(5).getAttribute("data-calendar-date");
  expect(scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(projectDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(goalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const overdueDate = addDays(scheduledDate!, -1);

  const goalId = await createGoal(page, goalTitle);
  const projectId = await createProject(page, projectTitle);
  const taskId = await createTask(page, taskTitle);
  const overdueTaskId = await createTask(page, overdueTitle);
  const completedTaskId = await createTask(page, completedTitle);

  await updateGoalDate(page, goalId, goalDate!);
  await updateProjectContext(page, projectId, goalId, projectDate!);
  await updateTaskContext(page, taskId, {
    dueAt: dueDate!,
    projectId,
  });
  await updateTaskContext(page, overdueTaskId, { dueAt: overdueDate });
  await updateTaskContext(page, completedTaskId, {
    dueAt: overdueDate,
    status: "done",
  });

  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  await queue.getByRole("button", { name: new RegExp(taskTitle) }).click();
  const scheduleForm = page
    .locator('[data-calendar-section="queue-schedule"]')
    .getByRole("form", { name: `${taskTitle} planen` });
  await scheduleForm.getByLabel("Weekday").fill(scheduledDate!);
  await scheduleForm.getByLabel("Start time").fill("09:00");
  await scheduleForm.getByLabel("Duration").selectOption("45");
  await scheduleForm.getByRole("button", { name: "Schedule task" }).click();
  await expect(
    page
      .locator('[data-calendar-section="week-grid"]')
      .getByRole("button", { name: new RegExp(taskTitle) }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Month", exact: true }).click();
  const month = page.locator('[data-calendar-section="month-surface"]');
  await expect(month).toBeVisible();

  const scheduledCell = month.locator(
    `[data-calendar-month-day="${scheduledDate}"]`,
  );
  const dueCell = month.locator(`[data-calendar-month-day="${dueDate}"]`);
  const projectCell = month.locator(
    `[data-calendar-month-day="${projectDate}"]`,
  );
  const goalCell = month.locator(`[data-calendar-month-day="${goalDate}"]`);
  const overdueCell = month.locator(
    `[data-calendar-month-day="${overdueDate}"]`,
  );

  await expect(
    scheduledCell.locator('[data-calendar-marker-kind="scheduled_task"]'),
  ).toHaveAccessibleName(new RegExp(taskTitle));
  await expect(
    dueCell.locator('[data-calendar-marker-kind="task_deadline"]'),
  ).toHaveAccessibleName(new RegExp(`Task due: ${taskTitle}`));
  await expect(
    projectCell.locator('[data-calendar-marker-kind="project_deadline"]'),
  ).toHaveAccessibleName(new RegExp(`Project due: ${projectTitle}`));
  await expect(
    goalCell.locator('[data-calendar-marker-kind="goal_target"]'),
  ).toHaveAccessibleName(new RegExp(`Goal target: ${goalTitle}`));
  await expect(
    overdueCell.getByRole("link", {
      name: `Task overdue: ${overdueTitle}`,
    }),
  ).toBeVisible();
  await expect(
    overdueCell.getByRole("link", {
      name: `Task overdue: ${completedTitle}`,
    }),
  ).toHaveCount(0);

  await expect(
    projectCell.locator('[data-calendar-marker-kind="project_deadline"]'),
  ).toHaveAttribute("href", `/projects/${projectId}`);
  await expect(
    goalCell.locator('[data-calendar-marker-kind="goal_target"]'),
  ).toHaveAttribute("href", `/goals/${goalId}`);

  await scheduledCell.getByRole("button", { name: /Open day/ }).click();
  await expect(page).toHaveURL(new RegExp(`date=${scheduledDate}.*view=day`));
  const day = page.locator('[data-calendar-section="day-surface"]');
  await expect(day).toBeVisible();
  await expect(day.getByRole("button", { name: new RegExp(taskTitle) })).toBeVisible();
  await page.reload();
  await expect(day.getByRole("button", { name: new RegExp(taskTitle) })).toBeVisible();

  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${scheduledDate}.*view=week`));
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${scheduledDate}.*view=month`));
  await page.reload();
  await expect(month).toBeVisible();
  await expect(
    scheduledCell.locator('[data-calendar-marker-kind="scheduled_task"]'),
  ).toBeVisible();
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.reload();
  await expect(month).toBeVisible();
  await expect(
    scheduledCell.locator('[data-calendar-marker-kind="scheduled_task"]'),
  ).toBeVisible();
});

test("C2-03 projects only a generated recurring occurrence, never its template", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const title = `C2 recurring occurrence ${stamp}`;

  await signUpTechnicalManualUser(page, "c2-03-recurring", stamp);
  await page.goto("/today");
  const recurring = page.locator('[data-today-section="recurring-generation"]');
  await expect(recurring).toBeVisible();
  const today = await recurring.locator('input[name="date"]').inputValue();
  const setup = recurring.locator('[data-today-section="recurring-template-setup"]');
  await setup.locator("summary").click();
  await setup.getByLabel("Title").fill(title);
  await setup.getByRole("button", { name: "Create template" }).click();
  await expect(
    page.getByText("Wiederkehrende Vorlage erstellt.", { exact: true }),
  ).toBeVisible();

  const generatedControl = page.locator(
    '[data-today-section="recurring-generation"]',
  );
  await generatedControl
    .getByRole("button", {
      name: "Wiederkehrende Aufgaben für heute erzeugen",
    })
    .click();
  await expect(
    page.getByText("Wiederkehrende Aufgaben erzeugt.", { exact: true }),
  ).toBeVisible();

  await page.goto("/calendar");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  const month = page.locator('[data-calendar-section="month-surface"]');
  const cell = month.locator(`[data-calendar-month-day="${today}"]`);
  const occurrence = cell.getByRole("link", {
    name: `Recurring task: ${title}`,
  });
  await expect(occurrence).toHaveCount(1);
  await expect(cell.locator('[data-calendar-marker-kind="planned_task"]')).toHaveCount(1);

  await cell.getByRole("button", { name: /Open day/ }).click();
  await expect(page).toHaveURL(new RegExp(`date=${today}.*view=day`));
  const day = page.locator('[data-calendar-section="day-surface"]');
  await expect(day.getByRole("button", { name: new RegExp(title) })).toBeVisible();
  await page.reload();
  await expect(day.getByRole("button", { name: new RegExp(title) })).toBeVisible();
});
