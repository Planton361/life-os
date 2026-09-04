import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function createSkill(page: Page, title: string) {
  await page.goto("/portfolio?view=skills");
  const form = page.locator('form[aria-label="Skill erstellen"]');
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByRole("button", { name: "Skill erstellen" }).click();
  await expect(
    page.getByText("Skill erstellt.", { exact: true }),
  ).toBeVisible();
  return new URL(page.url()).searchParams.get("selected")!;
}

async function dragToDay(
  page: Page,
  source: Locator,
  day: Locator,
  relativeY: number,
) {
  const [sourceBounds, targetBounds] = await Promise.all([
    source.boundingBox(),
    day.boundingBox(),
  ]);
  expect(sourceBounds).not.toBeNull();
  expect(targetBounds).not.toBeNull();
  const sourceX = (sourceBounds?.x ?? 0) + (sourceBounds?.width ?? 0) / 2;
  const sourceY = (sourceBounds?.y ?? 0) + (sourceBounds?.height ?? 0) / 2;
  const targetX = (targetBounds?.x ?? 0) + (targetBounds?.width ?? 0) / 2;
  const targetY =
    (targetBounds?.y ?? 0) + (targetBounds?.height ?? 0) * relativeY;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(sourceX + 12, sourceY + 12);
  await page.mouse.move(targetX, targetY, { steps: 8 });
  await page.mouse.up();
}

function calendarTaskBlock(page: Page, title: string) {
  return page
    .locator("[data-calendar-timed-block]")
    .filter({ has: page.getByRole("button", { name: new RegExp(title) }) })
    .first();
}

function calendarTaskButton(block: Locator) {
  return block.locator("button:not([data-calendar-resize-handle])");
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
  await expect(
    page.getByText("Project aktualisiert.", { exact: true }),
  ).toBeVisible();

  await page.goto(`/portfolio?view=tasks&selected=${taskId}`);
  const taskForm = page.locator('form[aria-label="Task bearbeiten"]');
  await taskForm.getByLabel("Project").selectOption(projectId);
  await taskForm.getByRole("button", { name: "Task speichern" }).click();
  await expect(
    page.getByText("Task gespeichert.", { exact: true }),
  ).toBeVisible();

  const taskSkills = page.locator('[data-task-skill-region="task"]');
  const taskSkillForm = taskSkills.getByRole("form", {
    name: "Skill mit Task verknüpfen",
  });
  await taskSkillForm
    .getByLabel("Skill suchen / auswählen")
    .selectOption(skillId);
  await taskSkillForm.getByRole("button", { name: "Skill verknüpfen" }).click();
  await expect(
    page.getByText("Skill mit Task verknüpft.", { exact: true }),
  ).toBeVisible();

  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  const queueItem = queue.getByRole("button", { name: new RegExp(taskTitle) });
  await expect(queueItem).toBeVisible();
  await expect(queueItem).toContainText(projectTitle);
  await expect(queueItem).toContainText(goalTitle);
  await expect(queueItem).toContainText(skillTitle);
  await queueItem.click();

  const schedule = page.locator('[data-calendar-section="queue-schedule"]');
  const scheduleForm = schedule.getByRole("form", {
    name: `${taskTitle} planen`,
  });
  await expect(scheduleForm).toBeVisible();
  const plannedDate = await scheduleForm.getByLabel("Weekday").inputValue();
  expect(plannedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await scheduleForm.getByLabel("Start time").fill("09:00");
  await scheduleForm.getByLabel("Duration").selectOption("45");
  await scheduleForm.getByRole("button", { name: "Schedule task" }).click();
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  const taskBlock = weekGrid.getByRole("button", {
    name: new RegExp(taskTitle),
  });
  await expect(taskBlock).toBeVisible();
  await expect(taskBlock).toHaveAccessibleName(
    new RegExp(`${taskTitle}.*09:00 to 09:45`),
  );
  await page.reload();
  await expect(taskBlock).toBeVisible();
  await expect(
    queue.getByRole("button", { name: new RegExp(taskTitle) }),
  ).toHaveCount(0);

  await taskBlock.click();
  const inspector = page.locator('[data-calendar-section="inspector"]');
  await inspector.getByRole("button", { name: "15 min später" }).click();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(`${taskTitle}.*09:15`) }),
  ).toBeVisible();
  await page.reload();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(`${taskTitle}.*09:15`) }),
  ).toBeVisible();

  await weekGrid.getByRole("button", { name: new RegExp(taskTitle) }).click();
  await inspector.getByRole("button", { name: "Dauer +15 min" }).click();
  await expect(
    weekGrid.getByRole("button", {
      name: new RegExp(`${taskTitle}.*09:15 to 10:15`),
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    weekGrid.getByRole("button", {
      name: new RegExp(`${taskTitle}.*09:15 to 10:15`),
    }),
  ).toBeVisible();

  await weekGrid.getByRole("button", { name: new RegExp(taskTitle) }).click();
  await inspector.getByRole("button", { name: "Unschedule" }).click();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(taskTitle) }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    weekGrid.getByRole("button", { name: new RegExp(taskTitle) }),
  ).toHaveCount(0);
  await expect(
    queue.getByRole("button", { name: new RegExp(taskTitle) }),
  ).toBeVisible();

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.reload();
  await expect(weekGrid).toBeVisible();
  await expect(queue).toBeVisible();
});

test("C2-02 keeps Meal and Running source tasks on their canonical pointer path", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const recipeTitle = `C2 pointer recipe ${stamp}`;
  const mealTitle = `C2 pointer meal ${stamp}`;
  const runningTitle = `C2 pointer run ${stamp}`;
  const runningPlanTitle = `C2 pointer running plan ${stamp}`;

  await signUpTechnicalManualUser(page, "c2-02-sources", stamp);
  await page.goto("/nutrition/recipes");
  const recipeForm = page
    .getByRole("heading", { name: "Recipe erstellen" })
    .locator("xpath=ancestor::section[1]");
  await recipeForm.getByLabel("Title").fill(recipeTitle);
  await recipeForm.getByLabel("Tags").fill("lunch, proof");
  await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
  await expect(page.getByText(recipeTitle).first()).toBeVisible();

  await page.goto("/nutrition");
  const mealForm = page
    .getByRole("heading", { name: "Meal erstellen" })
    .locator("xpath=ancestor::section[1]");
  const calendarDate = await mealForm.getByLabel("Date").inputValue();
  await mealForm.getByLabel("Title").fill(mealTitle);
  await mealForm.getByLabel("Date").fill(calendarDate);
  await mealForm.getByLabel("Type").selectOption("lunch");
  await mealForm.getByLabel("Planned").fill(`${calendarDate}T12:30`);
  await mealForm.getByLabel("Recipe").selectOption({ label: recipeTitle });
  await mealForm
    .getByRole("button", { exact: true, name: "Meal erstellen" })
    .click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(mealTitle).first()).toBeVisible();
  await page.goto("/nutrition/meal-planner");
  const lunchSlot = page.getByRole("button").filter({ hasText: recipeTitle }).first();
  await lunchSlot.focus();
  await lunchSlot.press("Enter");
  const mealSchedule = page.locator(
    `form[aria-label="${mealTitle} als Zeitblock planen"]`,
  );
  await expect(mealSchedule).toBeVisible();
  await mealSchedule
    .getByRole("button", { name: "Im Calendar planen" })
    .click();

  await page.goto("/calendar");
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  const mealBlock = calendarTaskBlock(page, mealTitle);
  await expect(mealBlock).toBeVisible();
  const moveDay = weekGrid.locator("[data-calendar-day]").nth(2);
  const mealBeforeMove =
    await calendarTaskButton(mealBlock).getAttribute("aria-label");
  await dragToDay(page, mealBlock, moveDay, 0.6);
  await expect
    .poll(() => calendarTaskButton(mealBlock).getAttribute("aria-label"))
    .not.toBe(mealBeforeMove);
  const mealAfterMove =
    await calendarTaskButton(mealBlock).getAttribute("aria-label");
  await page.reload();
  await expect(calendarTaskButton(mealBlock)).toHaveAttribute(
    "aria-label",
    mealAfterMove ?? "",
  );

  await page.goto("/health/running");
  const runningPlans = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Running plans" }),
  });
  const createRunningPlan = runningPlans.locator("form").first();
  await createRunningPlan.getByLabel("Plan name").fill(runningPlanTitle);
  await createRunningPlan.getByLabel("Goal").fill("Pointer source proof");
  await createRunningPlan.getByRole("button", { name: "Create plan" }).click();
  const runningPlan = runningPlans
    .locator('[data-testid^="running-plan-"]')
    .first();
  await runningPlan.getByText("Add planned unit").click();
  const runningUnit = runningPlan
    .locator("details")
    .filter({ hasText: "Add planned unit" })
    .locator("form");
  await runningUnit.getByLabel("Title").fill(runningTitle);
  await runningUnit.getByLabel("Distance km").fill("5");
  await runningUnit.getByLabel("Duration min").fill("30");
  await runningUnit.getByRole("button", { name: "Add unit" }).click();
  const runningSchedule = page.locator(
    '[data-testid^="schedule-running_plan_item-"]',
  );
  await runningSchedule
    .getByRole("button", { name: "Schedule / reschedule" })
    .click();

  await page.goto("/calendar");
  const runningBlock = calendarTaskBlock(page, `Run: ${runningTitle}`);
  await expect(runningBlock).toBeVisible();
  const runningBeforeMove =
    await calendarTaskButton(runningBlock).getAttribute("aria-label");
  await dragToDay(
    page,
    runningBlock,
    page
      .locator('[data-calendar-section="week-grid"] [data-calendar-day]')
      .nth(4),
    0.7,
  );
  await expect
    .poll(() => calendarTaskButton(runningBlock).getAttribute("aria-label"))
    .not.toBe(runningBeforeMove);
  const runningAfterMove =
    await calendarTaskButton(runningBlock).getAttribute("aria-label");
  await page.reload();
  await expect(calendarTaskButton(runningBlock)).toHaveAttribute(
    "aria-label",
    runningAfterMove ?? "",
  );
});

test("C2-02 uses pointer drag, move and resize through the canonical calendar actions", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const taskTitle = `C2 pointer task ${stamp}`;
  const conflictingTaskTitle = `C2 pointer conflict ${stamp}`;

  await signUpTechnicalManualUser(page, "c2-02", stamp);
  await createTask(page, taskTitle);
  await createTask(page, conflictingTaskTitle);

  await page.goto("/calendar");
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  const days = weekGrid.locator("[data-calendar-day]");
  const firstDay = days.nth(0);
  const crossDay = days.nth(2);
  const queueTask = queue.getByRole("button", { name: new RegExp(taskTitle) });

  await expect(queueTask).toBeVisible();
  await dragToDay(page, queueTask, firstDay, 0.25);
  const taskBlock = calendarTaskBlock(page, taskTitle);
  await expect(taskBlock).toBeVisible();
  await expect(
    queue.getByRole("button", { name: new RegExp(taskTitle) }),
  ).toHaveCount(0);
  const firstSlot =
    await calendarTaskButton(taskBlock).getAttribute("aria-label");
  await page.reload();
  await expect(taskBlock).toBeVisible();
  await expect(calendarTaskButton(taskBlock)).toHaveAttribute(
    "aria-label",
    firstSlot ?? "",
  );

  await dragToDay(page, taskBlock, crossDay, 0.45);
  await expect(taskBlock).toBeVisible();
  await expect
    .poll(() => calendarTaskButton(taskBlock).getAttribute("aria-label"))
    .not.toBe(firstSlot);
  const movedSlot =
    await calendarTaskButton(taskBlock).getAttribute("aria-label");
  await expect(
    crossDay.getByRole("button", { name: new RegExp(taskTitle) }),
  ).toBeVisible();
  await page.reload();
  await expect(calendarTaskButton(taskBlock)).toHaveAttribute(
    "aria-label",
    movedSlot ?? "",
  );

  const resizeHandle = taskBlock.locator("[data-calendar-resize-handle]");
  const resizeBounds = await resizeHandle.boundingBox();
  expect(resizeBounds).not.toBeNull();
  await page.mouse.move(
    (resizeBounds?.x ?? 0) + (resizeBounds?.width ?? 0) / 2,
    (resizeBounds?.y ?? 0) + (resizeBounds?.height ?? 0) / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    (resizeBounds?.x ?? 0) + (resizeBounds?.width ?? 0) / 2,
    (resizeBounds?.y ?? 0) + (resizeBounds?.height ?? 0) / 2 + 90,
  );
  await page.mouse.up();
  await expect
    .poll(() => calendarTaskButton(taskBlock).getAttribute("aria-label"))
    .not.toBe(movedSlot);
  const resizedSlot =
    await calendarTaskButton(taskBlock).getAttribute("aria-label");
  await page.reload();
  await expect(calendarTaskButton(taskBlock)).toHaveAttribute(
    "aria-label",
    resizedSlot ?? "",
  );

  const conflictQueueTask = queue.getByRole("button", {
    name: new RegExp(conflictingTaskTitle),
  });
  await expect(conflictQueueTask).toBeVisible();
  await conflictQueueTask.click();
  const schedule = page.locator('[data-calendar-section="queue-schedule"]');
  const scheduleForm = schedule.getByRole("form", {
    name: `${conflictingTaskTitle} planen`,
  });
  await scheduleForm
    .getByLabel("Weekday")
    .fill((await crossDay.getAttribute("data-calendar-date")) ?? "");
  await scheduleForm.getByLabel("Start time").fill("17:00");
  await scheduleForm.getByRole("button", { name: "Schedule task" }).click();
  const conflictingBlock = calendarTaskBlock(page, conflictingTaskTitle);
  await expect(conflictingBlock).toBeVisible();

  await dragToDay(page, taskBlock, crossDay, 2 / 3);
  const conflict = page.locator(
    '[data-calendar-section="pointer-scheduling-status"]',
  );
  await expect(conflict).toContainText("Sichtbarer Konflikt");
  await conflict
    .getByRole("button", { name: "Abbrechen" })
    .click();
  await page.reload();
  await expect(conflictingBlock).toBeVisible();
  await expect(calendarTaskButton(taskBlock)).toHaveAttribute(
    "aria-label",
    resizedSlot ?? "",
  );

  await dragToDay(
    page,
    taskBlock,
    page.locator('[data-calendar-section="inspector"]'),
    0.25,
  );
  await page.reload();
  await expect(conflictingBlock).toBeVisible();
  await expect(calendarTaskButton(taskBlock)).toHaveAttribute(
    "aria-label",
    resizedSlot ?? "",
  );

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.reload();
  await expect(weekGrid).toBeVisible();
  await expect(queue).toBeVisible();
  await expect(
    taskBlock.locator("[data-calendar-resize-handle]"),
  ).toBeVisible();
});
