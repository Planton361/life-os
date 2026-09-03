import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const baseUrl = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

async function selectProfile(page: Page, profile: "demo" | "empty" | "manual") {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: baseUrl,
      value: profile,
    },
  ]);
}

async function openPortfolioTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const task = page.locator("a").filter({ hasText: title }).first();
  await expect(task).toBeVisible();
  await task.click();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);
}

async function expectPlannedAcrossDailySurfaces(page: Page, title: string) {
  await page.goto("/calendar");
  await expect(
    page.locator('[data-calendar-section="week-grid"]').getByText(title),
  ).toBeVisible();

  await page.goto("/today");
  await expect(
    page.locator('[data-today-section="activity-stream"]').getByText(title).first(),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.locator('section[aria-labelledby="today-agenda-title"]').getByText(title).first(),
  ).toBeVisible();
}

async function activeHabitWindow(page: Page) {
  await page.goto("/dashboard");
  const tracker = page.getByRole("region", { name: "Habit Trackers" });
  return (
    (await tracker
      .getByRole("button", { pressed: true, name: /Morning|Midday|Evening/ })
      .textContent())?.trim() ?? "Morning"
  );
}

test("H1/H2 keeps canonical health records and source-linked fitness execution coherent", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const habitName = `H1H2 habit ${stamp}`;
  const runningPlanName = `H1H2 running plan ${stamp}`;
  const runningUnitName = `H1H2 run ${stamp}`;
  const strengthPlanName = `H1H2 strength plan ${stamp}`;
  const exerciseName = `H1H2 row ${stamp}`;

  await signUpTechnicalManualUser(page, "h1-h2", stamp);

  // H1 facts and logs are canonical records, not Task fields or estimates.
  await page.goto("/dashboard");
  const mood = page.getByRole("region", { name: "Mood" });
  await mood.getByRole("button", { name: "Focused" }).click();
  await expect(page).toHaveURL(/health=saved/);
  await page.reload();
  await expect(mood.getByText("Focused", { exact: true })).toBeVisible();

  await page.goto("/health/mental");
  const sleep = page.getByRole("region", { name: "Manual sleep log" });
  await sleep.getByLabel("Night/date").fill(todayIso());
  await sleep.getByLabel("Hours").fill("7");
  await sleep.getByLabel("Minutes").fill("42");
  await sleep.getByRole("button", { name: "Save sleep" }).click();
  await expect(page).toHaveURL(/health=saved/);
  await page.reload();
  await expect(sleep.getByText("7h 42m", { exact: false }).first()).toBeVisible();

  await page.goto("/health");
  const weight = page.getByRole("region", { name: "Weight history & goal" });
  await weight.getByLabel("Date", { exact: true }).fill(todayIso());
  await weight.getByLabel("Weight (kg)").fill("79.40");
  await weight.getByRole("button", { name: "Save", exact: true }).click();
  await weight.getByLabel("Target (kg)").fill("76");
  await weight.getByRole("button", { name: "Set goal" }).click();
  await page.reload();
  await expect(weight.getByText("79.40 kg", { exact: false }).first()).toBeVisible();

  const habitWindow = await activeHabitWindow(page);
  await page.goto("/health/habits");
  const habitForm = page.locator('[data-habits-section="create-form"]');
  await habitForm.getByLabel("Name").fill(habitName);
  await habitForm.getByLabel("Tagesziel optional").fill("1");
  await habitForm.getByLabel("Standard-Increment").fill("1");
  await habitForm.getByLabel("Zeitfenster").selectOption(habitWindow);
  await habitForm.getByLabel("Dashboard-Slot 1–8").fill("1");
  await habitForm.getByRole("button", { name: "Habit erstellen" }).click();
  await expect(page).toHaveURL(/habit=saved/);
  await page.goto("/dashboard");
  const dashboardHabit = page
    .getByRole("region", { name: "Habit Trackers" })
    .getByRole("article", { name: new RegExp(habitName) });
  await dashboardHabit
    .getByRole("button", { name: new RegExp(`${habitName} um 1 Count erhöhen`) })
    .click();
  await expect(page).toHaveURL(/habit=saved/);
  await page.reload();
  await expect(dashboardHabit).toContainText("1 / 1");
  await page.goto("/health/habits");
  await expect(
    page
      .locator('[data-habits-section="history"] article')
      .filter({ hasText: habitName })
      .getByText(/1 timestamped Logs/),
  ).toBeVisible();

  // A plan is scheduling intent only: its generated Task is visible on all
  // daily projections, but generic Task completion cannot create a run.
  await page.goto("/health/running");
  const runningPlans = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Running plans" }),
  });
  const createRunningPlan = runningPlans.locator("form").first();
  await createRunningPlan.getByLabel("Plan name").fill(runningPlanName);
  await createRunningPlan.getByLabel("Goal").fill("H1/H2 source proof");
  await createRunningPlan.getByRole("button", { name: "Create plan" }).click();
  await page.waitForLoadState("networkidle");

  const runningPlan = runningPlans.locator('[data-testid^="running-plan-"]').first();
  await runningPlan.getByText("Add planned unit").click();
  const addRunningUnit = runningPlan
    .locator("details")
    .filter({ hasText: "Add planned unit" })
    .locator("form");
  await addRunningUnit.getByLabel("Title").fill(runningUnitName);
  await addRunningUnit.getByLabel("Distance km").fill("4.2");
  await addRunningUnit.getByLabel("Duration min").fill("28");
  await addRunningUnit.getByRole("button", { name: "Add unit" }).click();
  await page.waitForLoadState("networkidle");
  await runningPlan
    .locator('[data-testid^="schedule-running_plan_item-"]')
    .getByRole("button", { name: "Schedule / reschedule" })
    .click();
  await page.waitForLoadState("networkidle");

  const runningTaskTitle = `Run: ${runningUnitName}`;
  await expectPlannedAcrossDailySurfaces(page, runningTaskTitle);
  await openPortfolioTask(page, runningTaskTitle);
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Abschließen" })).toBeVisible();

  await page.goto("/health/running");
  const plannedRun = page
    .locator('[data-testid^="running-plan-"]')
    .first()
    .getByText("Complete this planned run")
    .locator("xpath=ancestor::div[1]");
  await plannedRun.getByText("Complete this planned run").click();
  const completeRun = plannedRun
    .getByRole("button", { name: "Complete run + task" })
    .locator("xpath=ancestor::form[1]");
  await completeRun.getByLabel("Distance km").fill("4.2");
  await completeRun.getByLabel("Duration min").fill("28");
  const runningUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
  await completeRun.getByRole("button", { name: "Complete run + task" }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("trainingUpdate"))
    .not.toBe(runningUpdate);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Running history" }).locator("xpath=ancestor::section[1]").getByText("4.2 km", { exact: false }).first(),
  ).toBeVisible();
  await openPortfolioTask(page, runningTaskTitle);
  await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("4.2 km", { exact: true }).first()).toBeVisible();

  // Strength follows the same plan → Task boundary. A real Session and a
  // real Set Log are required before the Task can become done.
  await page.goto("/health/strength");
  const exerciseForm = page
    .locator("form")
    .filter({ has: page.getByRole("group", { name: "Muscle groups" }) })
    .first();
  await exerciseForm.getByLabel("Name").fill(exerciseName);
  await exerciseForm.getByLabel("Equipment").fill("Dumbbell");
  await exerciseForm.getByLabel("Back").check();
  await exerciseForm.getByRole("button", { name: "Create exercise" }).click();
  await page.waitForLoadState("networkidle");

  const strengthPlans = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Strength plans" }),
  });
  const createStrengthPlan = strengthPlans.locator("form").first();
  await createStrengthPlan.getByLabel("Plan name").fill(strengthPlanName);
  await createStrengthPlan.getByLabel("Goal").fill("H1/H2 real set proof");
  await createStrengthPlan.getByRole("button", { name: "Create plan" }).click();
  await page.waitForLoadState("networkidle");

  let strengthPlan = strengthPlans.locator('[data-testid^="strength-plan-"]').first();
  await strengthPlan.getByText("Add plan exercise").click();
  const addStrengthItem = strengthPlan
    .getByRole("button", { name: "Add exercise" })
    .locator("xpath=ancestor::form[1]");
  await addStrengthItem.getByLabel("Exercise").selectOption({ label: exerciseName });
  await addStrengthItem.getByLabel("Sets").fill("1");
  await addStrengthItem.getByLabel("Reps").fill("10");
  await addStrengthItem.getByLabel("Weight kg").fill("25");
  await addStrengthItem.getByRole("button", { name: "Add exercise" }).click();
  await page.waitForLoadState("networkidle");

  strengthPlan = strengthPlans.locator('[data-testid^="strength-plan-"]').first();
  await strengthPlan
    .locator('[data-testid^="schedule-strength_plan-"]')
    .getByRole("button", { name: "Schedule / reschedule" })
    .click();
  await page.waitForLoadState("networkidle");
  await expect(strengthPlan.getByText("Scheduled task linked")).toBeVisible();

  const strengthTaskTitle = `Strength: ${strengthPlanName}`;
  await expectPlannedAcrossDailySurfaces(page, strengthTaskTitle);
  await openPortfolioTask(page, strengthTaskTitle);
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Abschließen" })).toBeVisible();

  await page.goto("/health/strength");
  strengthPlan = page.locator('[data-testid^="strength-plan-"]').first();
  await strengthPlan.getByRole("button", { name: "Start session" }).click();
  await page.waitForLoadState("networkidle");
  const session = page
    .locator('[data-testid^="strength-session-"]')
    .filter({ hasText: strengthPlanName })
    .filter({ hasText: "in_progress" })
    .first();
  const setForm = session
    .getByRole("button", { name: "Log set" })
    .locator("xpath=ancestor::form[1]");
  await setForm.getByLabel("Repetitions").fill("10");
  await setForm.getByLabel("Weight kg (optional)").fill("25");
  await setForm.getByRole("button", { name: "Log set" }).click();
  await page.waitForLoadState("networkidle");
  const strengthUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
  await page
    .locator('[data-testid^="strength-session-"]')
    .filter({ hasText: strengthPlanName })
    .filter({ hasText: "in_progress" })
    .first()
    .getByRole("button", { name: "Complete session + task" })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("trainingUpdate"))
    .not.toBe(strengthUpdate);
  await page.reload();
  await expect(page.getByText("250.0 kg weighted volume").first()).toBeVisible();
  await openPortfolioTask(page, strengthTaskTitle);
  await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Muscle" }).click();
  const trainingPanel = page
    .getByRole("link", { name: "Running Tracker" })
    .locator("xpath=ancestor::section[1]");
  await expect(trainingPanel.getByText(/Back · 1 sets/)).toBeVisible();
  await expect(trainingPanel.getByText("Latest completed session", { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Muscle" }).click();
  await expect(trainingPanel.getByText(/Back · 1 sets/)).toBeVisible();
});

test("H1/H2 keeps Demo, Empty and auth-blocked health modes visibly separate", async ({ page }) => {
  await selectProfile(page, "demo");
  await page.goto("/health/running");
  await expect(page.locator('[data-running-section="page"]')).toBeVisible();
  await expect(page.getByTestId("running-session-form")).toHaveCount(0);

  await selectProfile(page, "empty");
  await page.goto("/health/strength");
  await expect(page.locator('[data-strength-section="page"]')).toHaveAttribute(
    "data-content-state",
    "empty",
  );
  await expect(
    page
      .getByRole("region", { name: "Strength Session Planner" })
      .getByText("Noch kein Krafttrainingskontext")
      .first(),
  ).toBeVisible();

  await selectProfile(page, "manual");
  await page.goto("/health/running");
  await expect(page.getByText("Authentication required")).toBeVisible();
  await expect(page.getByTestId("running-session-form")).toHaveCount(0);
});
