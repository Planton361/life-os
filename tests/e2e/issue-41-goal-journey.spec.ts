import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const workbench = (page: Page) =>
  page.locator('[data-goal-outcome="workbench"]');

async function createMilestone(page: Page, title: string) {
  const root = workbench(page);
  const trigger = root.getByRole("button", {
    name: "Etappe hinzufügen",
    exact: true,
  });
  await trigger.click();
  const form = root.locator('form[aria-label="Etappe erstellen"]');
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByLabel("Beschreibung", { exact: true })
    .fill(`Das Zwischenresultat ${title} ist konkret überprüfbar.`);
  await form.getByRole("button", { name: "Etappe erstellen" }).click();
  await expect(
    page.getByText("Etappe erstellt.", { exact: true }).first(),
  ).toBeVisible();
  const row = root
    .getByRole("region", { name: "Langfristige Goal Journey" })
    .locator("[data-goal-progression] li")
    .filter({ hasText: title });
  await expect(row).toHaveAttribute("data-goal-stage-status", "planned");
  return (
    (await row.getAttribute("data-goal-milestone-id")) ??
    (await row.locator("a").getAttribute("href"))?.split("stage=")[1] ??
    ""
  );
}

async function activateMilestone(page: Page, title: string) {
  const root = workbench(page);
  const row = root
    .getByRole("region", { name: "Langfristige Goal Journey" })
    .locator("[data-goal-progression] li")
    .filter({ hasText: title });
  const href = await row
    .getByRole("link", { name: title })
    .getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  const card = root
    .getByRole("region", { name: "Langfristige Goal Journey" })
    .locator("[data-goal-progression] li[data-goal-milestone-id]")
    .filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Etappe bearbeiten" }).click();
  const activate = card.locator('form[aria-label="Aktivieren"]');
  await activate.getByRole("button", { name: "Aktivieren" }).click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    root
      .getByRole("region", { name: "Langfristige Goal Journey" })
      .locator("[data-goal-progression] li")
      .filter({ hasText: title }),
  ).toHaveAttribute("data-goal-stage-status", "active");
}

async function createAndCompleteCurrentTask(
  page: Page,
  goalId: string,
  milestoneTitle: string,
  taskTitle: string,
) {
  const root = workbench(page);
  await expect(root.locator("[data-goal-current-workbench]")).toContainText(
    milestoneTitle,
  );
  if ((await root.getAttribute("data-goal-planning-mode")) === "read") {
    await root
      .getByRole("button", { name: "Planung bearbeiten", exact: true })
      .click();
  }
  await expect(
    root.locator(
      "[data-goal-current-workbench] [data-goal-current-planning-controls]",
    ),
  ).toBeVisible();
  await root
    .locator("[data-goal-current-workbench]")
    .getByRole("link", {
      name: "Aufgabe zur Etappe hinzufügen",
      exact: true,
    })
    .click();
  const form = page.locator('form[aria-label="Aufgabe erstellen"]');
  const contextualMilestoneId = await form
    .locator('input[name="goalMilestoneId"]')
    .inputValue();
  expect(contextualMilestoneId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(form).toHaveAttribute(
    "data-goal-milestone-task-capture",
    "title-first",
  );
  await expect(
    form.locator("[data-goal-milestone-task-default]"),
  ).toBeVisible();
  await expect(
    form.locator("[data-goal-milestone-task-context]"),
  ).toContainText(milestoneTitle);
  await expect(form.locator('input[name="goalId"]')).toHaveValue(goalId);
  await expect(form.locator('input[name="goalMilestoneId"]')).toHaveValue(
    contextualMilestoneId!,
  );
  await expect(form.getByLabel("Project-Kontext (optional)")).toBeVisible();
  const optionalDetails = form.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await expect(optionalDetails).toHaveAttribute("aria-expanded", "false");
  for (const label of [
    "Beschreibung / Kontext",
    "Next Action",
    "Priority",
    "Energy",
    "Duration (min)",
    "Deadline",
    "Geplantes Datum",
  ]) {
    await expect(form.getByLabel(label, { exact: true })).toBeHidden();
  }
  await optionalDetails.click();
  await expect(optionalDetails).toHaveAttribute("aria-expanded", "true");
  await expect(
    form.getByLabel("Beschreibung / Kontext", { exact: true }),
  ).toBeVisible();
  await optionalDetails.click();
  await expect(optionalDetails).toHaveAttribute("aria-expanded", "false");
  const title = form.getByLabel("Titel", { exact: true });
  await expect(title).toBeVisible();
  await expect(title).toBeEmpty();
  await title.fill(taskTitle);
  await expect(form.locator('input[name="title"]')).toBeVisible();
  await form.getByRole("button", { name: "Aufgabe erstellen" }).click();
  await expect(
    page.getByText("Aufgabe aus der Etappe erstellt.", { exact: true }).first(),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/goals/${goalId}\\?created=task`));
  await page.reload();

  const taskRow = root
    .locator("[data-goal-current-task]")
    .filter({ hasText: taskTitle });
  await expect(taskRow).toBeVisible();
  const taskId = await taskRow.getAttribute("data-goal-current-task");
  expect(taskId).toMatch(/^[0-9a-f-]{36}$/i);
  await page.goto(`/tasks/${taskId}`);
  const complete = page.locator('form[aria-label="Task abschließen"]');
  await complete.getByRole("button", { name: "Task abschließen" }).click();
  await expect(
    page.getByText("Task abgeschlossen.", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  const refreshed = workbench(page);
  await expect(
    refreshed.locator("[data-goal-current-workbench]"),
  ).toContainText(taskTitle);
  await expect(refreshed.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "review_milestone",
  );
  await expect(
    refreshed
      .getByRole("region", { name: "Langfristige Goal Journey" })
      .locator("[data-goal-progression] li")
      .filter({ hasText: milestoneTitle }),
  ).toHaveAttribute("data-goal-stage-status", "active");
  return refreshed;
}

async function reviewCurrentMilestone(page: Page, goalId: string) {
  const root = workbench(page);
  page.once("dialog", (dialog) => dialog.accept());
  await root
    .getByRole("button", { name: "Meilenstein erreicht", exact: true })
    .click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(`/goals/${goalId}`);
  await page.reload();
  return workbench(page);
}

async function screenshots(
  page: Page,
  testInfo: { outputPath: (...parts: string[]) => string },
) {
  const root = workbench(page);
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(root.locator("[data-goal-now]")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scroll,
      `${viewport.width} CSS px viewport horizontal overflow`,
    ).toBeLessThanOrEqual(dimensions.client);
    if (viewport.width >= 1920) {
      const widths = await root
        .locator("[data-goal-journey-layout]")
        .evaluate((layout) => {
          const current = layout.querySelector("[data-goal-current-workbench]");
          const journey = layout.querySelector("[data-goal-journey]");
          return {
            current: current?.getBoundingClientRect().width ?? 0,
            journey: journey?.getBoundingClientRect().width ?? 0,
          };
        });
      const ratio = widths.current / (widths.current + widths.journey);
      expect(ratio).toBeGreaterThan(0.64);
      expect(ratio).toBeLessThan(0.72);
    }
    await page.screenshot({
      path: testInfo.outputPath(
        `goal-journey-current-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}

test("Issue 41 Goal Journey is current-first, explicit and reload-stable", async ({
  page,
}, testInfo) => {
  test.setTimeout(360_000);
  const stamp = Date.now();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });

  const projectId = process.env.LIFE_OS_E2E_PROJECT_ID;
  expect(projectId).toMatch(/^life-os-z1-e2e-/);
  const dbContainer = `supabase_db_${projectId}`;
  const disposableWorkdir = process.env.TMPDIR;
  if (!disposableWorkdir)
    throw new Error("Disposable Supabase workdir is required for DB checks");
  execFileSync(
    "pnpm",
    [
      "exec",
      "supabase",
      "db",
      "lint",
      "--local",
      "--level",
      "warning",
      "--workdir",
      disposableWorkdir,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  execFileSync(
    "pnpm",
    [
      "exec",
      "supabase",
      "db",
      "advisors",
      "--local",
      "--type",
      "security",
      "--level",
      "warn",
      "--fail-on",
      "none",
      "--workdir",
      disposableWorkdir,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  const runSqlProof = (file: string, expected: string) => {
    const proof = execFileSync(
      "docker",
      [
        "exec",
        "-i",
        dbContainer,
        "psql",
        "-X",
        "-qAt",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        encoding: "utf8",
        input: readFileSync(
          resolve(process.cwd(), "tests/supabase", file),
          "utf8",
        ),
        timeout: 60_000,
      },
    );
    expect(proof).toContain(expected);
  };
  runSqlProof(
    "pp1-goal-current-milestone.sql",
    "PASS PP1_GOAL_CURRENT_MILESTONE_DB",
  );
  runSqlProof(
    "pp1-goal-history-ledger.sql",
    "PP1_GOAL_HISTORY_LEDGER_DB_PASS",
  );
  runSqlProof(
    "pp1-goal-outcome-repairs.sql",
    "PP1_GOAL_OUTCOME_REPAIRS_DB_PASS",
  );
  const concurrencyProof = execFileSync(
    process.execPath,
    [
      resolve(
        process.cwd(),
        "tests/supabase/pp1-goal-current-milestone-concurrency.mjs",
      ),
      dbContainer,
    ],
    { encoding: "utf8", timeout: 45_000 },
  );
  expect(concurrencyProof).toContain("PASS read committed:");
  expect(concurrencyProof).toContain("PASS repeatable read:");

  await signUpTechnicalManualUser(page, "issue-41-goal-journey", stamp);
  await page.goto("/goals/new");
  const createGoal = page.locator('form[aria-label="Ziel erstellen"]');
  const goalTitle = `Eine verlässliche Woche gestalten ${stamp}`;
  await createGoal.getByLabel("Titel", { exact: true }).fill(goalTitle);
  await createGoal
    .getByLabel("Was möchtest du erreichen?", { exact: true })
    .fill(
      "Nach vier Wochen sind Arbeit, Erholung und private Termine in einer verlässlichen Wochenplanung sichtbar.",
    );
  await createGoal.getByRole("button", { name: "Ziel erstellen" }).click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/i);
  const goalId = page.url().match(/\/goals\/([^/?#]+)/)?.[1];
  expect(goalId).toMatch(/^[0-9a-f-]{36}$/i);

  let root = workbench(page);
  await expect(root).toHaveAttribute("data-goal-read-first", "true");
  await expect(root.locator("[data-goal-now]")).toBeVisible();
  await expect(root.locator("[data-goal-journey-layout]")).toBeVisible();
  await expect(root.locator("[data-goal-journey-layout]")).toHaveCount(1);
  await expect(root.locator("[data-goal-current-workbench]")).toHaveCount(1);
  await expect(root.locator("[data-goal-journey]")).toHaveCount(1);
  await expect(
    root.locator('[data-goal-planning-controls="journey"]'),
  ).toBeHidden();
  await expect(root.locator("[data-goal-areas]")).toHaveCount(0);
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "define_outcome",
  );

  const goalEditTrigger = root.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await goalEditTrigger.click();
  const editGoal = root.locator('form[aria-label="Ziel bearbeiten"]');
  await editGoal.getByLabel("Status", { exact: true }).selectOption("active");
  await editGoal.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(root.locator("[data-goal-status]")).toHaveText("aktiv");
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-status]")).toHaveText("aktiv");

  const planToggle = root.getByRole("button", {
    name: /^(Planung bearbeiten|Fertig)$/,
  });
  await planToggle.focus();
  await page.keyboard.press("Enter");
  await expect(planToggle).toHaveAttribute("aria-expanded", "true");
  await expect(root).toHaveAttribute("data-goal-planning-mode", "editing");
  await expect(root.locator("[data-goal-journey-layout]")).toHaveCount(1);
  await expect(root.locator("[data-goal-current-workbench]")).toHaveCount(1);
  await expect(root.locator("[data-goal-journey]")).toHaveCount(1);
  await expect(
    root.locator('[data-goal-planning-controls="journey"]'),
  ).toBeVisible();
  await expect(
    root.locator('[data-goal-planning-controls="definition-of-done"]'),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(planToggle).toHaveAttribute("aria-expanded", "false");
  await expect(root).toHaveAttribute("data-goal-planning-mode", "read");
  await expect(
    root.locator('[data-goal-planning-controls="journey"]'),
  ).toBeHidden();
  await expect(planToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(planToggle).toHaveAttribute("aria-expanded", "true");
  await root.getByRole("button", { name: "Fertig", exact: true }).click();
  await expect(planToggle).toHaveAttribute("aria-expanded", "false");
  await expect(planToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(planToggle).toHaveAttribute("aria-expanded", "true");

  const outcomeTitle = `Ergebnis verlässlich geplant ${stamp}`;
  await root.getByRole("button", { name: "Erfolg definieren" }).click();
  const criterionCreate = root.locator(
    'form[aria-label="Erfolgskriterium erstellen"]',
  );
  await criterionCreate.getByLabel("Titel", { exact: true }).fill(outcomeTitle);
  await criterionCreate
    .getByLabel("Erfolg prüfen als", { exact: true })
    .selectOption("boolean");
  await criterionCreate
    .getByRole("button", { name: "Erfolgskriterium erstellen" })
    .click();
  await expect(
    page.getByText("Kriterium erstellt.", { exact: true }).first(),
  ).toBeVisible();
  const criterion = root
    .locator("[data-goal-criterion-id]")
    .filter({ hasText: outcomeTitle });
  await expect(criterion).toBeVisible();
  await criterion.getByRole("button", { name: "Kriterium verwalten" }).click();
  const evaluation = criterion.locator(
    'form[aria-label="Bewertung speichern"]',
  );
  await evaluation
    .getByLabel("Bewertungsstatus", { exact: true })
    .selectOption("value");
  await evaluation.getByLabel("Wert", { exact: true }).selectOption("true");
  await evaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(
    page.getByText("Kriterium bewertet.", { exact: true }).first(),
  ).toBeVisible();
  await expect(criterion).toContainText("erfüllt");

  const firstMilestone = `Woche planen ${stamp}`;
  const secondMilestone = `Erkenntnisse sichern ${stamp}`;
  await createMilestone(page, firstMilestone);
  await createMilestone(page, secondMilestone);
  await expect(
    root
      .getByRole("region", { name: "Langfristige Goal Journey" })
      .locator("[data-goal-progression] li[data-goal-stage-status='active']"),
  ).toHaveCount(0);
  await activateMilestone(page, firstMilestone);
  root = workbench(page);
  await expect(root.locator("[data-goal-current-workbench]")).toContainText(
    firstMilestone,
  );
  await expect(
    root.locator(
      "[data-goal-current-workbench] [data-goal-current-planning-controls]",
    ),
  ).toBeVisible();
  await expect(
    root
      .getByRole("region", { name: "Langfristige Goal Journey" })
      .locator("[data-goal-progression] li[data-goal-stage-status='active']"),
  ).toHaveCount(1);

  const firstTaskTitle = `Wochenrahmen festlegen ${stamp}`;
  root = await createAndCompleteCurrentTask(
    page,
    goalId!,
    firstMilestone,
    firstTaskTitle,
  );
  await screenshots(page, testInfo);

  root = await reviewCurrentMilestone(page, goalId!);
  await expect(root.locator("[data-goal-current-workbench]")).toContainText(
    secondMilestone,
  );
  await expect(
    root
      .getByRole("region", { name: "Langfristige Goal Journey" })
      .locator("[data-goal-progression] li[data-goal-stage-status='active']"),
  ).toHaveCount(1);
  await expect(
    root
      .getByRole("region", { name: "Langfristige Goal Journey" })
      .locator("[data-goal-progression] li")
      .filter({ hasText: firstMilestone }),
  ).toHaveAttribute("data-goal-stage-status", "achieved");

  const secondTaskTitle = `Wochenreview vorbereiten ${stamp}`;
  await createAndCompleteCurrentTask(
    page,
    goalId!,
    secondMilestone,
    secondTaskTitle,
  );
  root = await reviewCurrentMilestone(page, goalId!);
  await expect(root.locator("[data-goal-current-workbench]")).toContainText(
    "Keine aktuelle Etappe",
  );
  await expect(root.locator("[data-goal-journey-action]")).toHaveAttribute(
    "data-goal-journey-action",
    "review_goal",
  );
  await expect(
    root.getByRole("button", {
      name: "Ziel als erreicht bestätigen",
      exact: true,
    }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await root
    .getByRole("button", {
      name: "Ziel als erreicht bestätigen",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Ziel erreicht.", { exact: true }).first(),
  ).toBeVisible();
  await expect(root.locator("[data-goal-status]")).toHaveText("erreicht");
  await page.reload();
  root = workbench(page);
  await expect(root.locator("[data-goal-status]")).toHaveText("erreicht");
  await expect(root.locator("[data-goal-now]")).toContainText(
    "Erreichtes Ergebnis",
  );
  expect(errors).toEqual([]);
});
