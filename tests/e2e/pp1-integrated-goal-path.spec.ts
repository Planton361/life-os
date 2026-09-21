import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function createGoal(
  page: Page,
  title: string,
  description: string,
  why: string,
) {
  await page.goto("/goals/new");
  const form = page.locator('form[aria-label="Goal erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByLabel("Beschreibung / Kontext").fill(description);
  await form.getByLabel("Desired Outcome / Warum").fill(why);
  await form.getByLabel("Status", { exact: true }).selectOption("active");
  await form.getByLabel("Horizon", { exact: true }).selectOption("quarter");
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await expect(page.getByText("Goal erstellt.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/i);
  return page.url().match(/\/goals\/([^/?#]+)/)?.[1] ?? "";
}

function outcome(page: Page) {
  return page.locator('[data-goal-outcome="workbench"]');
}

function milestoneCard(page: Page, title: string) {
  return outcome(page)
    .locator("[data-goal-milestone-id]")
    .filter({ hasText: title });
}

async function openDetailsForm(page: Page, summary: string, label: string) {
  const workbench = outcome(page);
  const form = workbench.locator(`form[aria-label="${label}"]`);
  if (!(await form.isVisible())) {
    await workbench.getByText(summary, { exact: true }).click();
  }
  return form;
}

async function createMilestone(page: Page, title: string) {
  const form = await openDetailsForm(
    page,
    "Milestone definieren",
    "Milestone erstellen",
  );
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByLabel("Beschreibung", { exact: true })
    .fill(`Konkreter Wegabschnitt für ${title}.`);
  await form.getByLabel("Startstatus", { exact: true }).selectOption("active");
  await form.getByRole("button", { name: "Milestone erstellen" }).click();
  await expect(
    page.getByText("Milestone erstellt.", { exact: true }),
  ).toBeVisible();
}

async function createCriterion(
  page: Page,
  title: string,
  milestoneTitle: string,
) {
  const form = await openDetailsForm(
    page,
    "Kriterium definieren",
    "Kriterium erstellen",
  );
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form.getByLabel("Typ", { exact: true }).selectOption("boolean");
  await form.getByLabel("Milestone (optional)").selectOption({
    label: milestoneTitle,
  });
  await form.getByRole("button", { name: "Kriterium erstellen" }).click();
  await expect(
    page.getByText("Kriterium erstellt.", { exact: true }),
  ).toBeVisible();
}

async function createContextEntity(
  page: Page,
  kind: "project" | "task",
  goalId: string,
  milestoneId: string,
  title: string,
) {
  await page.goto(
    `/${kind === "project" ? "projects" : "tasks"}/new?goal=${goalId}&goalMilestone=${milestoneId}`,
  );
  await expect(page.getByText("Goal-Kontext:", { exact: false })).toBeVisible();
  await expect(page.getByText("Etappe:", { exact: false })).toBeVisible();
  const form = page.locator(
    `form[aria-label="${kind === "project" ? "Project" : "Task"} erstellen"]`,
  );
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByRole("button", {
      name: kind === "project" ? "Project erstellen" : "Task erstellen",
    })
    .click();
  await expect(
    page.getByText(
      kind === "project"
        ? "Project aus der Etappe erstellt."
        : "Task aus der Etappe erstellt.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/goals/${goalId}`));
}

async function sourceHref(card: Locator, prefix: string, title: string) {
  const link = card.getByRole("link", {
    name: `${prefix} · ${title}`,
    exact: true,
  });
  await expect(link).toBeVisible();
  return (await link.getAttribute("href")) ?? "";
}

test("Slice 1 integrated Goal path remains truthful across Manual surfaces", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const goalTitle = `Slice 1 goal ${stamp}`;
  const goalDescription = `Read-first Beschreibung ${stamp}`;
  const goalWhy = `Bewusster Desired Outcome ${stamp}`;
  const milestoneTitle = `Slice 1 Etappe ${stamp}`;
  const criterionTitle = `Slice 1 Kriterium ${stamp}`;
  const projectTitle = `Slice 1 Project ${stamp}`;
  const taskTitle = `Slice 1 Next Task ${stamp}`;

  await signUpTechnicalManualUser(page, "pp1-integrated-goal", stamp);
  const goalId = await createGoal(page, goalTitle, goalDescription, goalWhy);
  expect(goalId).toMatch(/^[0-9a-f-]{36}$/i);

  await page.goto(`/goals/${goalId}`);
  await expect(outcome(page)).toContainText(goalDescription);
  await expect(outcome(page)).toContainText(`Warum: ${goalWhy}`);
  await expect(outcome(page)).toContainText("Nächster Schritt");
  await expect(outcome(page)).toContainText("Readiness: offen");

  await createMilestone(page, milestoneTitle);
  await page.reload();
  const card = milestoneCard(page, milestoneTitle);
  await expect(card).toContainText("aktiv");
  const milestoneId = await card.getAttribute("data-goal-milestone-id");
  expect(milestoneId).toMatch(/^[0-9a-f-]{36}$/i);

  await createCriterion(page, criterionTitle, milestoneTitle);
  await page.reload();
  const criterion = outcome(page)
    .locator("[data-goal-criterion-id]")
    .filter({ hasText: criterionTitle });
  await expect(criterion).toContainText("Ja/Nein");
  await expect(criterion).toContainText(milestoneTitle);

  await createContextEntity(
    page,
    "project",
    goalId,
    milestoneId!,
    projectTitle,
  );
  await page.reload();
  await expect(milestoneCard(page, milestoneTitle)).toContainText(projectTitle);
  await createContextEntity(page, "task", goalId, milestoneId!, taskTitle);
  await page.reload();
  await expect(milestoneCard(page, milestoneTitle)).toContainText(taskTitle);
  await expect(outcome(page).locator("#naechster-schritt")).toContainText(
    taskTitle,
  );
  await expect(
    outcome(page)
      .locator("#naechster-schritt")
      .getByRole("link", { name: "Kontext öffnen" }),
  ).toHaveAttribute("href", /\/tasks\/[0-9a-f-]{36}$/i);

  const projectHref = await sourceHref(
    milestoneCard(page, milestoneTitle),
    "Project",
    projectTitle,
  );
  const taskHref = await sourceHref(
    milestoneCard(page, milestoneTitle),
    "Task",
    taskTitle,
  );
  expect(projectHref).toMatch(/^\/projects\/[0-9a-f-]{36}$/i);
  expect(taskHref).toMatch(/^\/tasks\/[0-9a-f-]{36}$/i);

  const evaluation = criterion.locator(
    'form[aria-label="Bewertung speichern"]',
  );
  await evaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await evaluation.getByLabel("Wert", { exact: true }).selectOption("true");
  await evaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(
    page.getByText("Kriterium bewertet.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const falseCorrection = criterion.locator(
    'form[aria-label="Letzte Bewertung korrigieren"]',
  );
  await falseCorrection.getByLabel("Korrekturwert").selectOption("false");
  await falseCorrection
    .getByLabel("Korrekturgrund")
    .fill("Erste Entscheidung war zu früh.");
  await falseCorrection
    .getByRole("button", { name: "Letzte Bewertung korrigieren" })
    .click();
  await expect(
    page.getByText("Kriterium korrigiert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(criterion).toContainText("nicht erfüllt");

  const trueCorrection = criterion.locator(
    'form[aria-label="Letzte Bewertung korrigieren"]',
  );
  await trueCorrection.getByLabel("Korrekturwert").selectOption("true");
  await trueCorrection
    .getByLabel("Korrekturgrund")
    .fill("Korrigierte Entscheidung ist bestätigt.");
  await trueCorrection
    .getByRole("button", { name: "Letzte Bewertung korrigieren" })
    .click();
  await expect(
    page.getByText("Kriterium korrigiert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(criterion).toContainText("erfüllt");

  const retraction = criterion.locator(
    'form[aria-label="Bewertung zurücknehmen"]',
  );
  await retraction
    .getByLabel("Grund")
    .fill("Entscheidung zur Prüfung geöffnet.");
  await retraction
    .getByRole("button", { name: "Bewertung zurücknehmen" })
    .click();
  await expect(
    page.getByText("Bewertung zurückgenommen.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(criterion).toContainText("Bewertung zurückgenommen");

  const finalEvaluation = criterion.locator(
    'form[aria-label="Bewertung speichern"]',
  );
  await finalEvaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await finalEvaluation
    .getByLabel("Wert", { exact: true })
    .selectOption("true");
  await finalEvaluation
    .getByRole("button", { name: "Bewertung speichern" })
    .click();
  await expect(
    page.getByText("Kriterium bewertet.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(criterion).toContainText("Verlauf anzeigen (5)");
  const criterionEvidence = criterion.locator(
    'form[aria-label="Beleg an Bewertung hängen"]',
  );
  await criterionEvidence
    .getByLabel("Entscheidungsbeleg (optional)")
    .selectOption({ label: `Project · ${projectTitle}` });
  await criterionEvidence
    .getByRole("button", { name: "Beleg an Bewertung hängen" })
    .click();
  await expect(
    page.getByText("Beleg an Bewertung angehängt.", { exact: true }),
  ).toBeVisible();

  const currentCard = milestoneCard(page, milestoneTitle);
  await currentCard.getByRole("button", { name: "Erreicht" }).click();
  await expect(
    page.getByText("Milestone-Status gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const achievedCard = milestoneCard(page, milestoneTitle);
  const milestoneEvidence = achievedCard.locator(
    'form[aria-label="Beleg an Etappenentscheidung hängen"]',
  );
  await milestoneEvidence
    .getByLabel("Entscheidungsbeleg (optional)")
    .selectOption({ label: `Task · ${taskTitle}` });
  await milestoneEvidence
    .getByRole("button", { name: "Beleg an Etappenentscheidung hängen" })
    .click();
  await expect(
    page.getByText("Beleg an Etappe angehängt.", { exact: true }),
  ).toBeVisible();

  const review = outcome(page).locator("#goal-review");
  await expect(review).toContainText("Readiness: bereit");
  await expect(
    review.getByRole("button", { name: "Goal explizit erreichen" }),
  ).toBeEnabled();
  const achieve = review.locator('form[aria-label="Goal explizit erreichen"]');
  await achieve
    .getByLabel("Erfolgsnotiz (optional)")
    .fill(`Review outcome ${stamp}`);
  await achieve
    .getByLabel("Entscheidungsbeleg (optional)")
    .selectOption({ label: `Project · ${projectTitle}` });
  page.once("dialog", (dialog) => dialog.accept());
  await achieve
    .getByRole("button", { name: "Goal explizit erreichen" })
    .click();
  await expect(page.getByText("Goal erreicht.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText(
    "Goal Outcome Workbench · achieved",
  );
  await expect(outcome(page)).toContainText("Outcome erreicht");
  await expect(outcome(page)).toContainText("Goal erreicht");
  await expect(outcome(page)).toContainText(
    "1 Kriterien-Basen · 1 Etappen-Basen · 1 Belege",
  );
  const history = outcome(page).locator("#verlauf-belege");
  await expect(history).toContainText(`Kriterium-Basis: ${criterionTitle}`);
  await expect(history).toContainText(`Entscheidungsbelege: ${projectTitle}`);
  await expect(history).toContainText(`Entscheidungsbelege: ${taskTitle}`);
  await expect(outcome(page)).toContainText(
    `Etappe erreicht: ${milestoneTitle}`,
  );
  await expect(outcome(page)).toContainText("· 1 Belege");
  await expect(criterion).toContainText("1 Beleg(e)");

  await outcome(page)
    .getByRole("button", { name: "Goal wieder öffnen" })
    .click();
  await expect(
    page.getByText("Goal wieder geöffnet.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText("Goal Outcome Workbench · active");
  await expect(outcome(page)).toContainText("Goal wieder geöffnet");
  await expect(outcome(page)).toContainText("Goal erreicht");

  await page.goto("/today");
  const stream = page.getByRole("region", { name: "Activity Stream" });
  await expect(
    stream.locator('[data-event-kind="GOAL ACHIEVED"]'),
  ).toContainText(goalTitle);
  await expect(
    stream.locator('[data-event-kind="GOAL REOPENED"]'),
  ).toContainText(goalTitle);
  await expect(
    stream.locator('[data-event-kind="ETAPPE ACHIEVED"]'),
  ).toContainText(goalTitle);
  await expect(
    stream.locator('[data-event-kind="GOAL ACHIEVED"]').getByRole("link", {
      name: "Quelle öffnen",
    }),
  ).toHaveAttribute("href", `/goals/${goalId}`);

  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  await expect(
    page.locator('[data-entity-type="goal"]').filter({ hasText: goalTitle }),
  ).toContainText("Outcome");
  await expect(
    page.getByRole("complementary", { name: "Selected Entity" }),
  ).toContainText("Goal Outcome");
  await expect(
    page.getByRole("complementary", { name: "Selected Entity" }),
  ).toContainText("1 / 1 Kriterien erfüllt");

  await page.goto("/dashboard");
  const dashboardPortfolio = page.getByText("Active Portfolio", {
    exact: true,
  });
  await expect(dashboardPortfolio).toBeVisible();
  await page.getByRole("button", { name: "Goal View" }).click();
  const dashboardGoal = page.getByRole("link", {
    name: `Open portfolio item: ${goalTitle}`,
  });
  await expect(dashboardGoal).toBeVisible();
  await expect(dashboardGoal).toContainText("Bereit zur Review");
  await expect(dashboardGoal).toContainText("1/1 Kriterien");
  await expect(dashboardGoal).not.toContainText(/\d+%/);

  await page.goto(`/goals/${goalId}`);
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("goal-detail-4k.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("goal-detail-1920.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("goal-detail-mobile.png"),
    fullPage: true,
  });

  await page.goto("/today");
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("today-goal-events-4k.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("today-goal-events-1920.png"),
    fullPage: true,
  });

  await page.goto(`/portfolio?view=goals&selected=${goalId}`);
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("portfolio-goal-4k.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("portfolio-goal-1920.png"),
    fullPage: true,
  });

  await page.goto("/dashboard");
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("dashboard-goal-4k.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    caret: "initial",
    path: test.info().outputPath("dashboard-goal-1920.png"),
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
