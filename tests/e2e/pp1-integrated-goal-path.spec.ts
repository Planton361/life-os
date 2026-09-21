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

async function openManagement(scope: Locator, label: string) {
  const trigger = scope.getByRole("button", { name: label, exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  return trigger;
}

async function openCriterionManagement(criterion: Locator) {
  return openManagement(criterion, "Kriterium verwalten");
}

async function openMilestoneManagement(card: Locator) {
  return openManagement(card, "Etappe verwalten");
}

async function openGoalReview(page: Page) {
  const workbench = outcome(page);
  await openManagement(workbench, "Review verwalten");
  const form = workbench.locator('form[aria-label="Ziel explizit erreichen"]');
  await expect(form).toBeVisible();
  return form;
}

async function selectOptionContaining(select: Locator, text: string) {
  const option = select.locator("option").filter({ hasText: text }).first();
  await expect(option).toBeAttached();
  const value = await option.getAttribute("value");
  if (!value) throw new Error(`No option value found for ${text}`);
  await select.selectOption(value);
}

async function openDetailsForm(
  page: Page,
  triggerLabel: string,
  label: string,
) {
  const workbench = outcome(page);
  const form = workbench.locator(`form[aria-label="${label}"]`);
  if (!(await form.isVisible())) {
    const trigger = workbench.getByRole("button", {
      name: triggerLabel,
      exact: true,
    });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  }
  await expect(form).toBeVisible();
  return form;
}

async function createMilestone(page: Page, title: string) {
  const form = await openDetailsForm(
    page,
    "Etappe hinzufügen",
    "Etappe erstellen",
  );
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByLabel("Beschreibung", { exact: true })
    .fill(`Konkreter Wegabschnitt für ${title}.`);
  await form.getByLabel("Startstatus", { exact: true }).selectOption("active");
  await form.getByRole("button", { name: "Etappe erstellen" }).click();
  await expect(
    page.getByText("Etappe erstellt.", { exact: true }),
  ).toBeVisible();
}

async function createCriterion(
  page: Page,
  title: string,
  milestoneTitle: string,
) {
  const form = await openDetailsForm(
    page,
    "Erfolgskriterium hinzufügen",
    "Erfolgskriterium erstellen",
  );
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByLabel("Erfolg prüfen als", { exact: true })
    .selectOption("boolean");
  await form.getByLabel("Etappe (optional)").selectOption({
    label: milestoneTitle,
  });
  await form
    .getByRole("button", { name: "Erfolgskriterium erstellen" })
    .click();
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
  const replacementProjectTitle = `Slice 1 Replacement Project ${stamp}`;
  const taskTitle = `Slice 1 Next Task ${stamp}`;

  await signUpTechnicalManualUser(page, "pp1-integrated-goal", stamp);
  const goalId = await createGoal(page, goalTitle, goalDescription, goalWhy);
  expect(goalId).toMatch(/^[0-9a-f-]{36}$/i);

  await page.goto(`/goals/${goalId}`);
  await expect(outcome(page)).toContainText(goalDescription);
  await expect(outcome(page)).toContainText(`Warum: ${goalWhy}`);
  await expect(outcome(page)).toContainText("Nächster Schritt");
  await expect(outcome(page)).toContainText("Review-Bereitschaft: offen");
  await expect(
    outcome(page).locator('form[aria-label="Etappe erstellen"]'),
  ).toBeHidden();
  await expect(
    outcome(page).locator('form[aria-label="Erfolgskriterium erstellen"]'),
  ).toBeHidden();

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
  await expect(criterion).toContainText("Ja / Nein");
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
  await createContextEntity(
    page,
    "project",
    goalId,
    milestoneId!,
    replacementProjectTitle,
  );
  await page.reload();
  await expect(milestoneCard(page, milestoneTitle)).toContainText(
    replacementProjectTitle,
  );
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

  const criterionManagementTrigger = await openCriterionManagement(criterion);
  const evaluation = criterion.locator(
    'form[aria-label="Bewertung speichern"]',
  );
  await evaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await evaluation.getByLabel("Wert", { exact: true }).selectOption("true");
  await evaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(
    page.getByText("Kriterium bewertet.", { exact: true }),
  ).toBeVisible();
  await expect(criterionManagementTrigger).toBeFocused();
  await expect(evaluation).toBeHidden();
  await page.reload();
  await expect(evaluation).toBeHidden();
  await openCriterionManagement(criterion);
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

  await openCriterionManagement(criterion);
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

  await openCriterionManagement(criterion);
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

  await openCriterionManagement(criterion);
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
  await expect(criterion).toContainText("Frühere Entscheidungen anzeigen (5)");
  await openCriterionManagement(criterion);
  const criterionEvidence = criterion.locator(
    'form[aria-label="Belegverlauf ändern"]',
  );
  await criterionEvidence
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Project · ${projectTitle}` });
  await criterionEvidence.getByLabel("Belegänderung").selectOption("attached");
  await criterionEvidence
    .getByRole("button", { name: "Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Beleg an Bewertung angehängt.", { exact: true }),
  ).toBeVisible();
  await page.reload();

  await openCriterionManagement(criterion);
  const criterionReplace = criterion.locator(
    'form[aria-label="Belegverlauf ändern"]',
  );
  await criterionReplace.getByLabel("Belegänderung").selectOption("replaced");
  await criterionReplace
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Project · ${replacementProjectTitle}` });
  await selectOptionContaining(
    criterionReplace.getByLabel("Bisherige Referenz für Ersatz / Zurücknehmen"),
    `Project · ${projectTitle}`,
  );
  await criterionReplace
    .getByLabel("Grund für die Änderung")
    .fill("Neue Entscheidungsquelle ist belastbarer.");
  await criterionReplace
    .getByRole("button", { name: "Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Beleg an Bewertung angehängt.", { exact: true }),
  ).toBeVisible();
  await page.reload();

  await openCriterionManagement(criterion);
  const criterionWithdraw = criterion.locator(
    'form[aria-label="Belegverlauf ändern"]',
  );
  await criterionWithdraw.getByLabel("Belegänderung").selectOption("withdrawn");
  await selectOptionContaining(
    criterionWithdraw.getByLabel(
      "Bisherige Referenz für Ersatz / Zurücknehmen",
    ),
    `Project · ${replacementProjectTitle}`,
  );
  await criterionWithdraw
    .getByLabel("Grund für die Änderung")
    .fill("Beleg zurückgenommen: Kontext nicht mehr entscheidungsrelevant.");
  await criterionWithdraw
    .getByRole("button", { name: "Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Beleg an Bewertung angehängt.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(criterion).toContainText("Belegverlauf:");

  const currentCard = milestoneCard(page, milestoneTitle);
  await openMilestoneManagement(currentCard);
  await currentCard.getByRole("button", { name: "Erreicht" }).click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const achievedCard = milestoneCard(page, milestoneTitle);
  await openMilestoneManagement(achievedCard);
  const milestoneEvidence = achievedCard.locator(
    'form[aria-label="Etappen-Belegverlauf ändern"]',
  );
  await milestoneEvidence
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Task · ${taskTitle}` });
  await milestoneEvidence.getByLabel("Belegänderung").selectOption("attached");
  await milestoneEvidence
    .getByRole("button", { name: "Etappen-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Etappen-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const milestoneReplace = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Etappen-Belegverlauf ändern"]',
  );
  await milestoneReplace.getByLabel("Belegänderung").selectOption("replaced");
  await milestoneReplace
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Project · ${replacementProjectTitle}` });
  await selectOptionContaining(
    milestoneReplace.getByLabel("Bisherige Referenz für Ersatz / Zurücknehmen"),
    `Task · ${taskTitle}`,
  );
  await milestoneReplace
    .getByLabel("Grund für die Änderung")
    .fill("Neuer Etappenbeleg ist belastbarer.");
  await milestoneReplace
    .getByRole("button", { name: "Etappen-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Etappen-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const milestoneWithdraw = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Etappen-Belegverlauf ändern"]',
  );
  await milestoneWithdraw.getByLabel("Belegänderung").selectOption("withdrawn");
  await selectOptionContaining(
    milestoneWithdraw.getByLabel(
      "Bisherige Referenz für Ersatz / Zurücknehmen",
    ),
    `Project · ${replacementProjectTitle}`,
  );
  await milestoneWithdraw
    .getByLabel("Grund für die Änderung")
    .fill("Etappenbeleg zurückgenommen.");
  await milestoneWithdraw
    .getByRole("button", { name: "Etappen-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Etappen-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const milestoneSupplement = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Etappen-Belegverlauf ändern"]',
  );
  await milestoneSupplement
    .getByLabel("Belegänderung")
    .selectOption("supplemented");
  await milestoneSupplement
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Task · ${taskTitle}` });
  await milestoneSupplement
    .getByLabel("Grund für die Änderung")
    .fill("Retrospektiv dokumentierter Etappenbeleg.");
  await milestoneSupplement
    .getByLabel("Als retrospektive Ergänzung markieren")
    .check();
  await milestoneSupplement
    .getByRole("button", { name: "Etappen-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Etappen-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(outcome(page).locator("#verlauf-belege")).toContainText(
    "retrospektiv ergänzt",
  );

  const review = outcome(page).locator("#goal-review");
  await expect(review).toContainText("Review-Bereitschaft: bereit");
  await expect(
    review.getByRole("button", { name: "Review verwalten" }),
  ).toBeVisible();
  const achieve = await openGoalReview(page);
  await achieve
    .getByLabel("Erfolgsnotiz (optional)")
    .fill(`Review outcome ${stamp}`);
  await achieve
    .getByLabel("Entscheidungsbeleg (optional)")
    .selectOption({ label: `Project · ${projectTitle}` });
  page.once("dialog", (dialog) => dialog.accept());
  await achieve
    .getByRole("button", { name: "Ziel explizit erreichen" })
    .click();
  await expect(page.getByText("Ziel erreicht.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText("Erreichtes Ergebnis");
  await expect(outcome(page)).toContainText("Ergebnis akzeptiert");
  await expect(
    outcome(page).locator('form[aria-label="Ziel explizit erreichen"]'),
  ).toBeHidden();
  await expect(
    outcome(page).locator('form[aria-label="Goal-Belegverlauf ändern"]'),
  ).toBeHidden();
  await expect(outcome(page)).toContainText(
    "1 Kriterien · 1 Etappen · 1 aktive Belege",
  );
  const history = outcome(page).locator("#verlauf-belege");
  await expect(history).toContainText(`Kriterium-Basis: ${criterionTitle}`);
  await expect(history).toContainText(`Belegverlauf: ${projectTitle}`);
  await expect(history).toContainText(
    `Belegverlauf: retrospektiv ergänzt: ${taskTitle}`,
  );
  await expect(outcome(page)).toContainText(
    `Etappe erreicht: ${milestoneTitle}`,
  );
  await expect(outcome(page)).toContainText("· 1 aktive Belege");
  await expect(criterion).toContainText("Belegverlauf:");
  await expect(criterion).not.toContainText("Aktive Belege:");

  const achievedHistory = history
    .locator("article")
    .filter({ hasText: "Ziel erreicht" })
    .first();
  await openManagement(achievedHistory, "Goal-Verlauf verwalten");
  const goalAmend = achievedHistory.locator(
    'form[aria-label="Goal-Verlauf ergänzen"]',
  );
  await goalAmend
    .getByLabel("Korrigierte Erfolgsnotiz")
    .fill(`Retrospektiv bestätigtes Ergebnis ${stamp}`);
  await goalAmend
    .getByLabel("Begründung")
    .fill("Historische Erfolgsnotiz präzisiert.");
  await goalAmend.getByLabel("Als retrospektive Ergänzung markieren").check();
  await goalAmend
    .getByRole("button", { name: "Goal-Verlauf ergänzen" })
    .click();
  await expect(
    page.getByText("Goal-Verlauf ergänzt.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const amendedHistory = history
    .locator("article")
    .filter({ hasText: "Ziel Verlauf ergänzt" })
    .first();
  await expect(amendedHistory).toContainText("Retrospektiv ergänzt");
  await expect(amendedHistory).toContainText(
    "Historische Erfolgsnotiz präzisiert.",
  );
  await openManagement(amendedHistory, "Goal-Verlauf verwalten");
  const goalEvidence = amendedHistory.locator(
    'form[aria-label="Goal-Belegverlauf ändern"]',
  );
  await goalEvidence.getByLabel("Belegänderung").selectOption("attached");
  await goalEvidence
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Project · ${projectTitle}` });
  await goalEvidence
    .getByRole("button", { name: "Goal-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Goal-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  const amendedHistoryAfterAttach = history
    .locator("article")
    .filter({ hasText: "Ziel Verlauf ergänzt" })
    .first();
  await openManagement(amendedHistoryAfterAttach, "Goal-Verlauf verwalten");
  const goalReplace = amendedHistoryAfterAttach.locator(
    'form[aria-label="Goal-Belegverlauf ändern"]',
  );
  await goalReplace.getByLabel("Belegänderung").selectOption("replaced");
  await goalReplace
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Project · ${replacementProjectTitle}` });
  await selectOptionContaining(
    goalReplace.getByLabel("Bisherige Referenz für Ersatz / Zurücknehmen"),
    `Project · ${projectTitle}`,
  );
  await goalReplace
    .getByLabel("Grund für die Änderung")
    .fill("Goal-Beleg durch neue Quelle ersetzt.");
  await goalReplace
    .getByRole("button", { name: "Goal-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Goal-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  const amendedHistoryAfterReplace = history
    .locator("article")
    .filter({ hasText: "Ziel Verlauf ergänzt" })
    .first();
  await openManagement(amendedHistoryAfterReplace, "Goal-Verlauf verwalten");
  const goalWithdraw = amendedHistoryAfterReplace.locator(
    'form[aria-label="Goal-Belegverlauf ändern"]',
  );
  await goalWithdraw.getByLabel("Belegänderung").selectOption("withdrawn");
  await selectOptionContaining(
    goalWithdraw.getByLabel("Bisherige Referenz für Ersatz / Zurücknehmen"),
    `Project · ${replacementProjectTitle}`,
  );
  await goalWithdraw
    .getByLabel("Grund für die Änderung")
    .fill("Goal-Beleg zurückgenommen.");
  await goalWithdraw
    .getByRole("button", { name: "Goal-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Goal-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  const amendedHistoryAfterWithdraw = history
    .locator("article")
    .filter({ hasText: "Ziel Verlauf ergänzt" })
    .first();
  await openManagement(amendedHistoryAfterWithdraw, "Goal-Verlauf verwalten");
  const goalSupplement = amendedHistoryAfterWithdraw.locator(
    'form[aria-label="Goal-Belegverlauf ändern"]',
  );
  await goalSupplement.getByLabel("Belegänderung").selectOption("supplemented");
  await goalSupplement
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Task · ${taskTitle}` });
  await goalSupplement
    .getByLabel("Grund für die Änderung")
    .fill("Retrospektiv ergänzter Goal-Beleg.");
  await goalSupplement
    .getByLabel("Als retrospektive Ergänzung markieren")
    .check();
  await goalSupplement
    .getByRole("button", { name: "Goal-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Goal-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(history).toContainText("retrospektiv ergänzt");

  await openManagement(
    outcome(page).locator("#goal-review"),
    "Outcome verwalten",
  );
  await outcome(page)
    .locator("#goal-review")
    .getByRole("button", { name: "Ziel wieder öffnen" })
    .click();
  await expect(
    page.getByText("Ziel wieder geöffnet.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText("Stand: aktiv");
  await expect(outcome(page)).toContainText("Ziel wieder geöffnet");
  await expect(outcome(page)).toContainText("Ziel erreicht");

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
