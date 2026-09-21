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
  await form
    .getByLabel("Was möchtest du erreichen?", { exact: true })
    .fill(description);
  const optional = form.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await expect(optional).toHaveAttribute("aria-expanded", "false");
  await optional.click();
  await expect(optional).toHaveAttribute("aria-expanded", "true");
  await form.getByLabel("Warum / welcher Nutzen?", { exact: true }).fill(why);
  await form.getByLabel("Horizont", { exact: true }).selectOption("quarter");
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await expect(page.getByText("Goal erstellt.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/i);
  await expect(outcome(page).locator("[data-goal-status]")).toHaveText(
    "Entwurf",
  );
  const edit = await openDetailsForm(page, "Bearbeiten", "Goal bearbeiten");
  await edit.getByLabel("Status", { exact: true }).selectOption("active");
  await edit.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(
    page.getByText("Goal aktualisiert.", { exact: true }),
  ).toBeVisible();
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
  const trigger =
    label === "Ziel wieder öffnen"
      ? scope
          .locator("button[aria-expanded]")
          .filter({ hasText: "Wieder öffnen" })
      : scope.getByRole("button", { name: label, exact: true });
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
  await openManagement(workbench, "Ergebnis prüfen");
  const form = workbench.locator('form[aria-label="Ergebnis bestätigen"]');
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

async function assertGoalComposition(page: Page) {
  const workbench = outcome(page);
  const planning = workbench.locator("[data-goal-planning-surface]");

  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await planning.evaluate((node) => {
      const path = node
        .querySelector<HTMLElement>("#weg-zum-ziel")
        ?.getBoundingClientRect();
      const success = node
        .querySelector<HTMLElement>("#erfolg-erkennen")
        ?.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        path: path
          ? { left: path.left, top: path.top, width: path.width }
          : null,
        success: success
          ? { left: success.left, top: success.top, width: success.width }
          : null,
      };
    });
    expect(geometry.path).not.toBeNull();
    expect(geometry.success).not.toBeNull();
    expect(geometry.path!.left).toBeLessThan(geometry.success!.left);
    expect(geometry.path!.width).toBeGreaterThan(geometry.success!.width);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileGeometry = await planning.evaluate((node) => {
    const path = node
      .querySelector<HTMLElement>("#weg-zum-ziel")
      ?.getBoundingClientRect();
    const success = node
      .querySelector<HTMLElement>("#erfolg-erkennen")
      ?.getBoundingClientRect();
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      pathTop: path?.top ?? 0,
      successTop: success?.top ?? 0,
    };
  });
  expect(mobileGeometry.successTop).toBeLessThan(mobileGeometry.pathTop);
  expect(mobileGeometry.scrollWidth).toBeLessThanOrEqual(
    mobileGeometry.clientWidth,
  );

  const edit = workbench.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(edit).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(edit).toHaveAttribute("aria-expanded", "false");
  await expect(edit).toBeFocused();
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
    "Erfolg definieren",
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
    if (message.type() === "error" || /hydration/i.test(message.text())) {
      consoleErrors.push(message.text());
    }
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
  const history = outcome(page).locator("#verlauf-belege");
  await expect(outcome(page)).toContainText(goalDescription);
  await expect(outcome(page)).toContainText(`Warum: ${goalWhy}`);
  await expect(outcome(page)).toContainText("Nächster Schritt");
  await expect(outcome(page)).toContainText("Erfolg festlegen");
  await expect(outcome(page)).not.toContainText("Goal Review");
  await expect(outcome(page)).not.toContainText("0 von 0");
  await expect(outcome(page)).not.toContainText("Weitere Verwaltung");
  await expect(
    outcome(page).getByRole("button", { name: "Bearbeiten" }),
  ).toBeVisible();
  await expect(
    outcome(page).getByRole("button", { name: "Weitere Optionen" }),
  ).toBeVisible();
  await expect(
    outcome(page).locator('form[aria-label="Etappe erstellen"]'),
  ).toBeHidden();
  await expect(
    outcome(page).locator('form[aria-label="Erfolgskriterium erstellen"]'),
  ).toBeHidden();
  await expect(
    outcome(page).getByRole("button", {
      name: "Erfolg definieren",
      exact: true,
    }),
  ).toBeVisible();

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
      .getByRole("link", { name: "Task öffnen" }),
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
  const episodeAAchieve = currentCard.locator('form[aria-label="Erreicht"]');
  await episodeAAchieve
    .getByLabel("Notiz (optional)")
    .fill(`Etappe Episode A ${stamp}`);
  await episodeAAchieve.getByRole("button", { name: "Erreicht" }).click();
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
  const milestoneAmend = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Etappen-Verlauf ergänzen"]',
  );
  await milestoneAmend
    .getByLabel("Korrigierter Zeitpunkt (optional)")
    .fill("2026-09-20T08:15");
  await milestoneAmend
    .getByLabel("Korrigierte Verlaufsnotiz")
    .fill(`Etappe zeitlich präzisiert ${stamp}`);
  await milestoneAmend
    .getByLabel("Begründung")
    .fill("Etappenzeitpunkt nach dem Review präzisiert.");
  await milestoneAmend
    .getByRole("button", { name: "Etappen-Verlauf ergänzen" })
    .click();
  await expect(
    page.getByText("Etappen-Verlauf ergänzt.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const preservedMilestoneEvidence = milestoneCard(
    page,
    milestoneTitle,
  ).locator('form[aria-label="Etappen-Belegverlauf ändern"]');
  await expect(
    preservedMilestoneEvidence
      .getByLabel("Bisherige Referenz für Ersatz / Zurücknehmen")
      .locator("option")
      .filter({ hasText: `Task · ${taskTitle}` }),
  ).toHaveCount(1);
  await expect(milestoneCard(page, milestoneTitle)).toContainText(
    "1 aktive Belege im aktuellen Ergebnis.",
  );

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

  await page.reload();
  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  await milestoneCard(page, milestoneTitle)
    .getByRole("button", { name: "Wieder aktivieren" })
    .click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(milestoneCard(page, milestoneTitle)).toContainText("aktiv");

  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const episodeBAchieve = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Erreicht"]',
  );
  await episodeBAchieve
    .getByLabel("Notiz (optional)")
    .fill(`Etappe Episode B ${stamp}`);
  await episodeBAchieve.getByRole("button", { name: "Erreicht" }).click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();

  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const episodeBEvidence = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Etappen-Belegverlauf ändern"]',
  );
  await episodeBEvidence
    .getByLabel("Neue zulässige Quelle")
    .selectOption({ label: `Project · ${replacementProjectTitle}` });
  await episodeBEvidence.getByLabel("Belegänderung").selectOption("attached");
  await episodeBEvidence
    .getByRole("button", { name: "Etappen-Belegverlauf ändern" })
    .click();
  await expect(
    page.getByText("Etappen-Beleg gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openMilestoneManagement(milestoneCard(page, milestoneTitle));
  const episodeBAmend = milestoneCard(page, milestoneTitle).locator(
    'form[aria-label="Etappen-Verlauf ergänzen"]',
  );
  await episodeBAmend
    .getByLabel("Korrigierter Zeitpunkt (optional)")
    .fill("2026-09-20T07:45");
  await episodeBAmend
    .getByLabel("Korrigierte Verlaufsnotiz")
    .fill(`Etappe Episode B korrigiert ${stamp}`);
  await episodeBAmend
    .getByLabel("Begründung")
    .fill("Aktuelle Etappenfolge zeitlich präzisiert.");
  await episodeBAmend
    .getByRole("button", { name: "Etappen-Verlauf ergänzen" })
    .click();
  await expect(
    page.getByText("Etappen-Verlauf ergänzt.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  const episodeAHistory = history
    .locator("article")
    .filter({ hasText: `Etappe zeitlich präzisiert ${stamp}` })
    .first();
  await openManagement(episodeAHistory, "Verlaufseintrag verwalten");
  const closedMilestoneEpisodeAAmend = episodeAHistory.locator(
    'form[aria-label="Etappen-Verlauf ergänzen"]',
  );
  await closedMilestoneEpisodeAAmend
    .getByLabel("Korrigierter Zeitpunkt (optional)")
    .fill("2026-09-19T06:30");
  await closedMilestoneEpisodeAAmend
    .getByLabel("Korrigierte Verlaufsnotiz")
    .fill(`Geschlossene Etappe Episode A korrigiert ${stamp}`);
  await closedMilestoneEpisodeAAmend
    .getByLabel("Begründung")
    .fill("Geschlossene Etappe bleibt historische Folge.");
  await closedMilestoneEpisodeAAmend
    .getByRole("button", { name: "Etappen-Verlauf ergänzen" })
    .click();
  await expect(
    page.getByText("Etappen-Verlauf ergänzt.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(milestoneCard(page, milestoneTitle)).toContainText(
    "1 aktive Belege im aktuellen Ergebnis.",
  );
  await expect(history).toContainText(
    `Belegverlauf: ${replacementProjectTitle}`,
  );

  const review = outcome(page).locator("#erfolg-erkennen");
  await expect(review).toContainText("Ergebnis bereit");
  await expect(
    review.getByRole("button", { name: "Ergebnis prüfen" }),
  ).toBeVisible();
  const achieve = await openGoalReview(page);
  await achieve
    .getByLabel("Erfolgsnotiz (optional)")
    .fill(`Review outcome ${stamp}`);
  await achieve
    .getByLabel("Entscheidungsbeleg (optional)")
    .selectOption({ label: `Project · ${projectTitle}` });
  page.once("dialog", (dialog) => dialog.accept());
  await achieve.getByRole("button", { name: "Ergebnis bestätigen" }).click();
  await expect(page.getByText("Ziel erreicht.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText("Erreichtes Ergebnis");
  await expect(outcome(page)).toContainText("Ergebnis bestätigt");
  await expect(
    outcome(page).locator('form[aria-label="Ergebnis bestätigen"]'),
  ).toBeHidden();
  await expect(
    outcome(page).locator('form[aria-label="Goal-Belegverlauf ändern"]'),
  ).toBeHidden();
  await expect(outcome(page)).toContainText(
    "Grundlage: 1 Erfolgskriterien · 1 Etappen · 1 Belege",
  );
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
  await openManagement(achievedHistory, "Verlaufseintrag verwalten");
  const goalAmend = achievedHistory.locator(
    'form[aria-label="Goal-Verlauf ergänzen"]',
  );
  await goalAmend
    .getByLabel("Korrigierter Zeitpunkt (optional)")
    .fill("2026-09-20T09:30");
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
  await expect(amendedHistory).toContainText(
    `Kriterium-Basis: ${criterionTitle}`,
  );
  await expect(amendedHistory).toContainText(
    `Etappen-Basis: ${milestoneTitle}`,
  );
  await expect(amendedHistory).toContainText("1 aktive Belege");
  await expect(amendedHistory).toContainText(`Belegverlauf: ${projectTitle}`);
  await expect(outcome(page)).toContainText("Ergebnis bestätigt am");

  const secondAmendedHistory = history
    .locator("article")
    .filter({ hasText: "Ziel Verlauf ergänzt" })
    .first();
  await openManagement(secondAmendedHistory, "Verlaufseintrag verwalten");
  const secondGoalAmend = secondAmendedHistory.locator(
    'form[aria-label="Goal-Verlauf ergänzen"]',
  );
  await secondGoalAmend
    .getByLabel("Korrigierter Zeitpunkt (optional)")
    .fill("2026-09-20T10:30");
  await secondGoalAmend
    .getByLabel("Korrigierte Erfolgsnotiz")
    .fill(`Zweifach bestätigtes Ergebnis ${stamp}`);
  await secondGoalAmend
    .getByLabel("Begründung")
    .fill("Zweite historische Präzisierung.");
  await secondGoalAmend
    .getByRole("button", { name: "Goal-Verlauf ergänzen" })
    .click();
  await expect(
    page.getByText("Goal-Verlauf ergänzt.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const latestAmendedHistory = history
    .locator("article")
    .filter({ hasText: "Ziel Verlauf ergänzt" })
    .first();
  await expect(latestAmendedHistory).toContainText(
    `Kriterium-Basis: ${criterionTitle}`,
  );
  await expect(latestAmendedHistory).toContainText(
    `Etappen-Basis: ${milestoneTitle}`,
  );
  await expect(outcome(page)).toContainText("Ergebnis bestätigt am");

  await openManagement(latestAmendedHistory, "Verlaufseintrag verwalten");
  const goalEvidence = latestAmendedHistory.locator(
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
  await openManagement(amendedHistoryAfterAttach, "Verlaufseintrag verwalten");
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
  await openManagement(amendedHistoryAfterReplace, "Verlaufseintrag verwalten");
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
  await openManagement(
    amendedHistoryAfterWithdraw,
    "Verlaufseintrag verwalten",
  );
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
    outcome(page).locator("#erfolg-erkennen"),
    "Ziel wieder öffnen",
  );
  await outcome(page)
    .locator("#erfolg-erkennen")
    .locator('form[aria-label="Ziel wieder öffnen"]')
    .getByRole("button", { name: "Ziel wieder öffnen" })
    .click();
  await expect(
    page.getByText("Ziel wieder geöffnet.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(outcome(page).locator("[data-goal-status]")).toHaveText("aktiv");
  await expect(outcome(page)).toContainText("Ziel wieder geöffnet");
  await expect(outcome(page)).toContainText("Ziel erreicht");

  const episodeBNote = `Episode B outcome ${stamp}`;
  const episodeBReview = await openGoalReview(page);
  await episodeBReview.getByLabel("Erfolgsnotiz (optional)").fill(episodeBNote);
  await episodeBReview
    .getByLabel("Entscheidungsbeleg (optional)")
    .selectOption({ label: `Project · ${replacementProjectTitle}` });
  page.once("dialog", (dialog) => dialog.accept());
  await episodeBReview
    .getByRole("button", { name: "Ergebnis bestätigen" })
    .click();
  await expect(page.getByText("Ziel erreicht.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText(episodeBNote);
  await expect(outcome(page)).toContainText(
    "Grundlage: 1 Erfolgskriterien · 1 Etappen · 1 Belege",
  );
  const episodeBHistory = history
    .locator("article")
    .filter({ hasText: episodeBNote })
    .first();
  await expect(episodeBHistory).toContainText(
    `Kriterium-Basis: ${criterionTitle}`,
  );
  await expect(episodeBHistory).toContainText(
    `Etappen-Basis: ${milestoneTitle}`,
  );
  await expect(episodeBHistory).toContainText(
    `Belegverlauf: ${replacementProjectTitle}`,
  );

  const closedEpisodeA = history
    .locator("article")
    .filter({ hasText: `Zweifach bestätigtes Ergebnis ${stamp}` })
    .first();
  await openManagement(closedEpisodeA, "Verlaufseintrag verwalten");
  const closedEpisodeAAmend = closedEpisodeA.locator(
    'form[aria-label="Goal-Verlauf ergänzen"]',
  );
  await closedEpisodeAAmend
    .getByLabel("Korrigierter Zeitpunkt (optional)")
    .fill("2026-09-19T07:15");
  await closedEpisodeAAmend
    .getByLabel("Korrigierte Erfolgsnotiz")
    .fill(`Geschlossene Episode A korrigiert ${stamp}`);
  await closedEpisodeAAmend
    .getByLabel("Begründung")
    .fill("Alte Episode bleibt als Historie korrigierbar.");
  await closedEpisodeAAmend
    .getByRole("button", { name: "Goal-Verlauf ergänzen" })
    .click();
  await expect(
    page.getByText("Goal-Verlauf ergänzt.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(outcome(page)).toContainText(episodeBNote);
  await expect(outcome(page)).toContainText("Ergebnis bestätigt");
  await expect(outcome(page)).toContainText(
    "Grundlage: 1 Erfolgskriterien · 1 Etappen · 1 Belege",
  );
  await expect(
    history.locator("article").filter({ hasText: episodeBNote }).first(),
  ).toContainText(`Belegverlauf: ${replacementProjectTitle}`);

  await openManagement(
    outcome(page).locator("#erfolg-erkennen"),
    "Ziel wieder öffnen",
  );
  await outcome(page)
    .locator("#erfolg-erkennen")
    .locator('form[aria-label="Ziel wieder öffnen"]')
    .getByRole("button", { name: "Ziel wieder öffnen" })
    .click();
  await expect(
    page.getByText("Ziel wieder geöffnet.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(outcome(page).locator("[data-goal-status]")).toHaveText("aktiv");

  await page.goto("/today");
  const stream = page.getByRole("region", { name: "Activity Stream" });
  await expect(
    stream
      .locator('[data-event-kind="GOAL ACHIEVED"]')
      .filter({
        hasText: goalTitle,
      })
      .first(),
  ).toContainText(goalTitle);
  await expect(
    stream
      .locator('[data-event-kind="GOAL REOPENED"]')
      .filter({
        hasText: goalTitle,
      })
      .first(),
  ).toContainText(goalTitle);
  await expect(
    stream
      .locator('[data-event-kind="ETAPPE ACHIEVED"]')
      .filter({
        hasText: goalTitle,
      })
      .first(),
  ).toContainText(goalTitle);
  await expect(
    stream
      .locator('[data-event-kind="GOAL ACHIEVED"]')
      .filter({ hasText: goalTitle })
      .first()
      .getByRole("link", {
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
  await assertGoalComposition(page);
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
