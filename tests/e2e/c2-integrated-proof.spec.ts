import { expect, test, type Page } from "@playwright/test";
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

function calendarTimedBlock(page: Page, title: string) {
  return page
    .locator("[data-calendar-timed-block]")
    .filter({ has: page.getByRole("button", { name: new RegExp(title) }) });
}

test("C2-04 keeps one canonical scheduled task consistent across Calendar, Today and Dashboard", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const title = `C2 integrated task ${stamp}`;
  const date = todayIso();

  await signUpTechnicalManualUser(page, "c2-04", stamp);
  await createTask(page, title);

  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  const queueItem = queue.getByRole("button", { name: new RegExp(title) });
  await queueItem.focus();
  await queueItem.press("Enter");
  const schedule = page
    .locator('[data-calendar-section="queue-schedule"]')
    .getByRole("form", { name: `${title} planen` });
  await schedule.getByLabel("Weekday").fill(date);
  await schedule.getByLabel("Start time").fill("09:00");
  await schedule.getByLabel("Duration").selectOption("45");
  const scheduleButton = schedule.getByRole("button", {
    name: "Schedule task",
  });
  await scheduleButton.focus();
  await scheduleButton.press("Enter");

  const week = page.locator('[data-calendar-section="week-grid"]');
  const scheduledTask = week.getByRole("button", { name: new RegExp(title) });
  await expect(scheduledTask).toBeVisible();
  await expect(queue.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);
  await scheduledTask.focus();
  await scheduledTask.press("Enter");
  const inspector = page.locator('[data-calendar-section="inspector"]');
  const moveLater = inspector.getByRole("button", { name: "15 min später" });
  await moveLater.focus();
  await moveLater.press("Enter");
  await expect(
    week.getByRole("button", { name: new RegExp(`${title}.*09:15`) }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${date}.*view=day`));
  const day = page.locator('[data-calendar-section="day-surface"]');
  await expect(day.getByRole("button", { name: new RegExp(title) })).toBeVisible();

  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${date}.*view=month`));
  const month = page.locator('[data-calendar-section="month-surface"]');
  await expect(
    month
      .locator(`[data-calendar-month-day="${date}"]`)
      .locator('[data-calendar-marker-kind="scheduled_task"]'),
  ).toHaveAccessibleName(new RegExp(title));
  await page.reload();
  await expect(month).toBeVisible();

  await page.goto("/today");
  const today = page.locator('[data-today-section="activity-stream"]');
  await expect(today.getByText(title).first()).toBeVisible();
  await page.reload();
  await expect(today.getByText(title).first()).toBeVisible();

  await page.goto("/dashboard");
  const agenda = page.locator('section[aria-labelledby="today-agenda-title"]');
  await expect(agenda.getByText(title).first()).toBeVisible();
  await page.reload();
  await expect(agenda.getByText(title).first()).toBeVisible();
});

test("C2-04 keeps Review and Strength schedule sources as one reload-stable Calendar task each", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const strengthPlanTitle = `C2 integrated strength ${stamp}`;

  await signUpTechnicalManualUser(page, "c2-04-sources", stamp);

  await page.goto("/review/daily");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Daily Review gespeichert.")).toBeVisible();
  const reviewSchedule = page.locator(
    'form[aria-label="Daily Review als Zeitblock planen"]',
  );
  await reviewSchedule
    .getByRole("button", { name: "Im Calendar planen" })
    .click();

  await page.goto("/health/strength");
  const strengthPlans = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Strength plans" }),
  });
  const createStrengthPlan = strengthPlans.locator("form").first();
  await createStrengthPlan.getByLabel("Plan name").fill(strengthPlanTitle);
  await createStrengthPlan.getByLabel("Goal").fill("C2 source proof");
  await createStrengthPlan
    .getByRole("button", { name: "Create plan" })
    .click();
  await page.waitForLoadState("networkidle");
  const strengthPlan = strengthPlans
    .locator('[data-testid^="strength-plan-"]')
    .first();
  await expect(strengthPlan).toHaveCount(1);
  await expect(strengthPlan.getByLabel("Name")).toHaveValue(
    strengthPlanTitle,
  );
  await strengthPlan
    .locator('[data-testid^="schedule-strength_plan-"]')
    .getByRole("button", { name: "Schedule / reschedule" })
    .click();

  await page.goto("/calendar");
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  const reviewBlock = calendarTimedBlock(page, "Daily Review");
  const strengthBlock = calendarTimedBlock(
    page,
    `Strength: ${strengthPlanTitle}`,
  );
  await expect(reviewBlock).toHaveCount(1);
  await expect(strengthBlock).toHaveCount(1);
  await expect(
    queue.getByRole("button", { name: /Daily Review/ }),
  ).toHaveCount(0);
  await expect(
    queue.getByRole("button", { name: new RegExp(strengthPlanTitle) }),
  ).toHaveCount(0);

  await page.reload();
  await expect(reviewBlock).toHaveCount(1);
  await expect(strengthBlock).toHaveCount(1);
});
