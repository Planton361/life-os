import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function createTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
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

async function scheduleQueueTask(
  page: Page,
  title: string,
  date: string,
  startTime: string,
  duration: string,
) {
  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  await queue.getByRole("button", { name: new RegExp(title) }).click();
  const form = page
    .locator('[data-calendar-section="queue-schedule"]')
    .getByRole("form", { name: `${title} planen` });
  await form.getByLabel("Weekday").fill(date);
  await form.getByLabel("Start time").fill(startTime);
  await form.getByLabel("Duration").selectOption(duration);
  await form.getByRole("button", { name: "Schedule task" }).click();
  await expect(calendarTaskBlock(page, title)).toBeVisible();
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

function pointerConflict(page: Page) {
  return page.locator('[data-calendar-section="pointer-scheduling-status"]');
}

test("Z1 uses one visible conflict gate for inspector, pointer resize and Meal scheduling", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const stamp = Date.now();
  const date = todayIso();
  const blocker = `Z1 conflict blocker ${stamp}`;
  const candidate = `Z1 conflict candidate ${stamp}`;
  const movable = `Z1 conflict movable ${stamp}`;
  const resizeTarget = `Z1 conflict resize target ${stamp}`;
  const resizeBlocker = `Z1 conflict resize blocker ${stamp}`;
  const recipe = `Z1 conflict recipe ${stamp}`;
  const meal = `Z1 conflict meal ${stamp}`;

  await signUpTechnicalManualUser(page, "z1-calendar-conflict", stamp);
  await createTask(page, blocker);
  await createTask(page, candidate);
  await createTask(page, movable);
  await createTask(page, resizeTarget);
  await createTask(page, resizeBlocker);

  await scheduleQueueTask(page, blocker, date, "09:00", "30");

  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  await queue.getByRole("button", { name: new RegExp(candidate) }).click();
  const candidateForm = page
    .locator('[data-calendar-section="queue-schedule"]')
    .getByRole("form", { name: `${candidate} planen` });
  await candidateForm.getByLabel("Weekday").fill(date);
  await candidateForm.getByLabel("Start time").fill("09:00");
  await candidateForm.getByLabel("Duration").selectOption("30");
  await expect(candidateForm).toContainText("Sichtbarer Konflikt");
  await candidateForm.getByRole("button", { name: "Konflikt prüfen" }).click();
  await expect(candidateForm.getByRole("button", { name: "Abbrechen" })).toBeVisible();
  await candidateForm.getByRole("button", { name: "Abbrechen" }).click();
  await page.reload();
  await expect(calendarTaskBlock(page, candidate)).toHaveCount(0);
  await expect(queue.getByRole("button", { name: new RegExp(candidate) })).toBeVisible();

  await page.goto("/today");
  const todayActivity = page.locator('[data-today-section="activity-stream"]');
  await expect(todayActivity.getByText(blocker, { exact: true })).toBeVisible();
  await expect(todayActivity.getByText(candidate, { exact: true })).toHaveCount(0);

  await page.goto("/dashboard");
  const agenda = page.locator('section[aria-labelledby="today-agenda-title"]');
  await expect(agenda.getByText(blocker, { exact: true })).toBeVisible();
  await expect(agenda.getByText(candidate, { exact: true })).toHaveCount(0);

  await page.goto("/calendar");
  const retryQueue = page.locator('[data-calendar-section="planning-queue"]');
  await retryQueue.getByRole("button", { name: new RegExp(candidate) }).click();
  const retryCandidateForm = page
    .locator('[data-calendar-section="queue-schedule"]')
    .getByRole("form", { name: `${candidate} planen` });
  await retryCandidateForm.getByLabel("Weekday").fill(date);
  await retryCandidateForm.getByLabel("Start time").fill("09:00");
  await retryCandidateForm.getByLabel("Duration").selectOption("30");
  await retryCandidateForm
    .getByRole("button", { name: "Konflikt prüfen" })
    .click();
  await retryCandidateForm
    .getByRole("button", { name: "Trotzdem terminieren" })
    .click();
  await expect(calendarTaskBlock(page, candidate)).toBeVisible();
  await page.reload();
  await expect(calendarTaskBlock(page, candidate)).toBeVisible();

  const candidateBlock = calendarTaskBlock(page, candidate);
  const candidateBeforeReschedule = await calendarTaskButton(
    candidateBlock,
  ).getAttribute("aria-label");
  await calendarTaskButton(candidateBlock).click();
  const inspector = page.locator('[data-calendar-section="inspector"]');
  const rescheduleForm = inspector.getByRole("form", {
    name: "Reschedule 09:00-09:30",
  });
  await rescheduleForm.getByRole("button", { name: "Konflikt prüfen" }).click();
  await rescheduleForm.getByRole("button", { name: "Abbrechen" }).click();
  await page.reload();
  await expect(calendarTaskButton(candidateBlock)).toHaveAttribute(
    "aria-label",
    candidateBeforeReschedule ?? "",
  );

  await scheduleQueueTask(page, movable, date, "12:00", "30");
  await page.goto("/calendar");
  const week = page.locator('[data-calendar-section="week-grid"]');
  const day = week.locator(`[data-calendar-date="${date}"]`);
  const movableBlock = calendarTaskBlock(page, movable);
  const movableBefore = await calendarTaskButton(movableBlock).getAttribute(
    "aria-label",
  );
  await dragToDay(page, movableBlock, day, 3 / 16);
  await expect(pointerConflict(page)).toContainText("Sichtbarer Konflikt");
  await pointerConflict(page).getByRole("button", { name: "Abbrechen" }).click();
  await page.reload();
  await expect(calendarTaskButton(movableBlock)).toHaveAttribute(
    "aria-label",
    movableBefore ?? "",
  );

  await scheduleQueueTask(page, resizeTarget, date, "10:00", "30");
  await scheduleQueueTask(page, resizeBlocker, date, "10:30", "30");
  await page.goto("/calendar");
  const resizeBlock = calendarTaskBlock(page, resizeTarget);
  const resizeBefore = await calendarTaskButton(resizeBlock).getAttribute(
    "aria-label",
  );
  const resizeHandle = resizeBlock.locator("[data-calendar-resize-handle]");
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
  await expect(pointerConflict(page)).toContainText("Sichtbarer Konflikt");
  await pointerConflict(page).getByRole("button", { name: "Abbrechen" }).click();
  await page.reload();
  await expect(calendarTaskButton(resizeBlock)).toHaveAttribute(
    "aria-label",
    resizeBefore ?? "",
  );

  await page.goto("/nutrition/recipes");
  const recipeForm = page
    .getByRole("heading", { name: "Recipe erstellen" })
    .locator("xpath=ancestor::section[1]");
  await recipeForm.getByLabel("Title").fill(recipe);
  await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
  await expect(page.getByText(recipe, { exact: true }).first()).toBeVisible();

  await page.goto("/nutrition");
  const mealForm = page
    .getByRole("heading", { name: "Meal erstellen" })
    .locator("xpath=ancestor::section[1]");
  await mealForm.getByLabel("Title").fill(meal);
  await mealForm.getByLabel("Date").fill(date);
  await mealForm.getByLabel("Type").selectOption("lunch");
  await mealForm.getByLabel("Planned").fill(`${date}T12:30`);
  await mealForm.getByLabel("Recipe").selectOption({ label: recipe });
  await mealForm.getByRole("button", { name: "Meal erstellen" }).click();
  await expect(page.getByText(meal, { exact: true }).first()).toBeVisible();

  await page.goto("/nutrition/meal-planner");
  const mealSlot = page.getByRole("button").filter({ hasText: recipe }).first();
  await mealSlot.click();
  await page
    .locator(`form[aria-label="${meal} als Zeitblock planen"]`)
    .getByRole("button", { name: "Im Calendar planen" })
    .click();

  await page.goto("/calendar");
  const mealBlock = calendarTaskBlock(page, meal);
  await expect(mealBlock).toBeVisible();
  const mealBefore = await calendarTaskButton(mealBlock).getAttribute("aria-label");
  await dragToDay(
    page,
    mealBlock,
    page.locator(`[data-calendar-section="week-grid"] [data-calendar-date="${date}"]`),
    3 / 16,
  );
  await expect(pointerConflict(page)).toContainText("Sichtbarer Konflikt");
  await pointerConflict(page)
    .getByRole("button", { name: "Trotzdem terminieren" })
    .click();
  await expect
    .poll(() => calendarTaskButton(mealBlock).getAttribute("aria-label"))
    .not.toBe(mealBefore);
  const mealAfter = await calendarTaskButton(mealBlock).getAttribute("aria-label");
  await page.reload();
  await expect(calendarTaskButton(mealBlock)).toHaveAttribute(
    "aria-label",
    mealAfter ?? "",
  );
});
