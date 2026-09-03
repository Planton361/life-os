import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

function tomorrowIso() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function createTask(page: Page, title: string, planToday = false) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  if (planToday) await form.getByLabel("Heute planen").check();
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
}

test("C3 keeps capture, execution, plan-vs-done and Daily Review on one reload-stable daily loop", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const stamp = Date.now();
  const capture = `C3 capture ${stamp}`;
  const completedTask = `C3 scheduled done ${stamp}`;
  const openTask = `C3 open carry ${stamp}`;
  const tomorrow = tomorrowIso();

  await signUpTechnicalManualUser(page, "c3-loop", stamp);

  await page.goto("/dashboard");
  const quickThought = page.locator('[aria-labelledby="quick-thought-title"]');
  await quickThought.getByLabel("Quick Thought").fill(capture);
  await quickThought.getByRole("button", { name: "In Inbox speichern" }).click();
  await expect(quickThought.getByRole("status")).toHaveText("In der Inbox gespeichert.");
  await quickThought.getByRole("link", { name: "Inbox öffnen" }).click();
  const inboxQueue = page.locator('[data-inbox-section="queue"]');
  await expect(inboxQueue.getByText(capture, { exact: true })).toBeVisible();
  await page.reload();
  await expect(inboxQueue.getByText(capture, { exact: true })).toBeVisible();

  await createTask(page, completedTask);
  await page.getByRole("button", { name: "Heute planen" }).click();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();
  await page.getByRole("button", { name: "Heute terminieren" }).click();
  await expect(page.getByRole("button", { name: "Entterminieren" })).toBeVisible();

  await page.goto("/calendar");
  const calendarWeek = page.locator('[data-calendar-section="week-grid"]');
  await expect(calendarWeek.getByRole("button", { name: new RegExp(completedTask) })).toBeVisible();

  await createTask(page, openTask, true);

  await page.goto("/today");
  const activity = page.locator('[data-today-section="activity-stream"]');
  const delta = page.locator('[data-today-section="delta-summary"]');
  await expect(activity.getByText(completedTask, { exact: true })).toBeVisible();
  await expect(activity.getByText(openTask, { exact: true })).toBeVisible();
  await expect(delta).toContainText("Planned today");
  await expect(delta).toContainText("Time scheduled");
  await expect(delta).toContainText("Open plan");
  await expect(activity.getByText("Scheduled", { exact: true })).toBeVisible();
  await expect(activity.getByText("Open planned", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  const agenda = page.locator('section[aria-labelledby="today-agenda-title"]');
  await expect(agenda.getByText(completedTask, { exact: true })).toBeVisible();
  await expect(agenda.getByText(openTask, { exact: true })).toBeVisible();

  await page.goto("/today");
  await activity
    .getByRole("form", { name: `${completedTask} abschließen` })
    .getByRole("button", { name: "Abschließen" })
    .click();
  await expect(
    activity.getByRole("form", { name: `${completedTask} wieder öffnen` }),
  ).toBeVisible();
  await expect(activity.getByText("Done", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    activity.getByRole("form", { name: `${completedTask} wieder öffnen` }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(agenda.getByText(completedTask, { exact: true })).toBeVisible();
  await expect(agenda).toContainText("Done");

  await page.goto("/calendar");
  await expect(
    calendarWeek.getByRole("button", { name: new RegExp(`${completedTask}.*done`) }),
  ).toBeVisible();

  await page.goto("/review/daily");
  const carryOver = page.locator('[data-review-section="carry-over"]');
  await expect(carryOver.getByText(openTask, { exact: true })).toBeVisible();
  await carryOver.getByRole("checkbox", { name: new RegExp(openTask) }).check();
  await page.getByRole("textbox", { name: "Outcome" }).fill("Completed the scheduled task; carry the open task deliberately.");
  await page.getByRole("textbox", { name: "Tomorrow focus" }).fill(openTask);
  await page.getByRole("button", { name: "Complete Daily Review" }).click();
  await expect(page.getByRole("status")).toHaveText("Daily Review gespeichert.");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Outcome" })).toHaveValue(
    "Completed the scheduled task; carry the open task deliberately.",
  );
  await expect(carryOver.getByRole("checkbox", { name: new RegExp(openTask) })).toBeChecked();

  await page.goto("/today");
  const closingReview = page.locator('[data-today-section="closing-review"]');
  await expect(closingReview.getByRole("heading", { name: openTask, exact: true })).toBeVisible();
  await expect(closingReview.getByRole("heading", { name: "Carry Forward", exact: true })).toBeVisible();
  await page.reload();
  await expect(closingReview.getByRole("heading", { name: openTask, exact: true })).toBeVisible();

  await page.goto("/portfolio?view=tasks");
  await page.getByText(openTask, { exact: true }).first().click();
  const taskEdit = page.locator('form[aria-label="Task bearbeiten"]');
  await expect(taskEdit.locator('input[name="plannedDate"]')).toHaveValue(tomorrow);
  await page.reload();
  await expect(taskEdit.locator('input[name="plannedDate"]')).toHaveValue(tomorrow);
});

test("C3 keeps Meal completion on its existing canonical UI boundary", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const stamp = Date.now();
  const recipe = `C3 meal recipe ${stamp}`;
  const meal = `C3 completed meal ${stamp}`;

  await signUpTechnicalManualUser(page, "c3-meal", stamp);

  await page.goto("/nutrition/recipes");
  const recipeForm = page
    .getByRole("heading", { name: "Recipe erstellen" })
    .locator("xpath=ancestor::section[1]");
  await recipeForm.getByLabel("Title").fill(recipe);
  await recipeForm.getByLabel("Tags").fill("c3, proof");
  await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
  await expect(page.getByText(recipe, { exact: true }).first()).toBeVisible();

  await page.goto("/nutrition");
  const mealForm = page
    .getByRole("heading", { name: "Meal erstellen" })
    .locator("xpath=ancestor::section[1]");
  await mealForm.getByLabel("Title").fill(meal);
  await mealForm.getByLabel("Date").fill(todayIso());
  await mealForm.getByLabel("Type").selectOption("dinner");
  await mealForm.getByLabel("Recipe").selectOption({ label: recipe });
  await mealForm.getByRole("button", { exact: true, name: "Meal erstellen" }).click();
  await expect(page.getByText(meal, { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Gegessen" }).click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Recent Meals" }).getByText(meal),
  ).toBeVisible();
});
