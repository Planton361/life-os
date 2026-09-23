import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const workbench = (page: Page) =>
  page.locator('[data-goal-outcome="workbench"]');
const areas = (page: Page) => workbench(page).locator("[data-goal-areas]");

async function area(
  page: Page,
  name: "Überblick" | "Arbeit" | "Erfolg" | "Verlauf",
) {
  await areas(page).getByRole("link", { name, exact: true }).click();
  await expect(
    areas(page).getByRole("link", { name, exact: true }),
  ).toHaveAttribute("aria-current", "page");
}

async function createStage(
  page: Page,
  title: string,
  status: "active" | "planned",
) {
  await area(page, "Arbeit");
  await workbench(page)
    .getByRole("button", { name: "Etappe hinzufügen" })
    .click();
  const form = workbench(page).locator('form[aria-label="Etappe erstellen"]');
  await form.getByLabel("Titel", { exact: true }).fill(title);
  await form
    .getByLabel("Beschreibung")
    .fill(`Ein überprüfbares Zwischenresultat: ${title}.`);
  await form.getByLabel("Startstatus").selectOption(status);
  await form.getByRole("button", { name: "Etappe erstellen" }).click();
  await expect(
    page.getByText("Etappe erstellt.", { exact: true }).first(),
  ).toBeVisible();
  const row = workbench(page)
    .locator("[data-goal-progression] li")
    .filter({ hasText: title });
  await expect(row).toHaveAttribute("data-goal-stage-status", status);
  await row.getByRole("link", { name: title }).click();
  await expect(
    workbench(page).locator("[data-goal-selected-work]"),
  ).toContainText(title);
  return (await workbench(page)
    .locator("[data-goal-selected-work] [data-goal-milestone-id]")
    .getAttribute("data-goal-milestone-id"))!;
}

async function changeStage(
  page: Page,
  title: string,
  label: "Erreicht" | "Aktivieren",
) {
  await area(page, "Arbeit");
  await workbench(page)
    .locator("[data-goal-progression] li")
    .filter({ hasText: title })
    .getByRole("link", { name: title })
    .click();
  const card = workbench(page).locator(
    "[data-goal-selected-work] [data-goal-milestone-id]",
  );
  await expect(
    card.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Etappe bearbeiten" }).click();
  const form = card.locator(`form[aria-label="${label}"]`);
  await form.getByRole("button", { name: label }).click();
  await expect(
    page.getByText("Etappenstatus gespeichert.", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    workbench(page)
      .locator("[data-goal-progression] li")
      .filter({ hasText: title }),
  ).toHaveAttribute(
    "data-goal-stage-status",
    label === "Erreicht" ? "achieved" : "active",
  );
}

async function screenshotAt(
  page: Page,
  testInfo: { outputPath: (...parts: string[]) => string },
  state: string,
) {
  const closeToast = page.getByRole("button", {
    name: "Benachrichtigung schließen",
  });
  while (await closeToast.count()) await closeToast.first().click();
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(workbench(page)).toBeVisible();
    const geometry = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(
      geometry.scroll,
      `${state} ${viewport.width} horizontal overflow`,
    ).toBeLessThanOrEqual(geometry.client);
    await page.screenshot({
      path: testInfo.outputPath(
        `${state}-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}

test("Issue 28 A-v2 Goal states and progression remain real and reload-stable", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });
  await signUpTechnicalManualUser(page, "issue-28-a-v2", stamp);
  await page.goto("/goals/new");
  const create = page.locator('form[aria-label="Ziel erstellen"]');
  const goalTitle = `Vier Wochen verlässlich planen ${stamp}`;
  await create.getByLabel("Titel", { exact: true }).fill(goalTitle);
  await create
    .getByLabel("Was möchtest du erreichen?", { exact: true })
    .fill(
      "Ich plane jede Woche so, dass Arbeit, Erholung und private Termine realistisch zusammenpassen. Nach vier Wochen kann ich anhand meiner Wochenpläne erklären, was funktioniert hat und was angepasst wurde.",
    );
  await create
    .getByRole("button", { name: "Weitere Angaben (optional)" })
    .click();
  await create
    .getByLabel("Warum / welcher Nutzen?", { exact: true })
    .fill(
      "Weniger Zusagen auf Verdacht und mehr verlässliche Zeit für meine wichtigsten Vorhaben.",
    );
  await create.getByRole("button", { name: "Ziel erstellen" }).click();
  await expect(workbench(page).locator("[data-goal-status]")).toHaveText(
    "Entwurf",
  );
  await expect(
    workbench(page).getByRole("heading", { name: goalTitle }),
  ).toBeVisible();
  await expect(
    workbench(page).getByRole("link", { name: "Erfolg festlegen" }),
  ).toBeVisible();
  await expect(
    workbench(page).getByRole("button", { name: "Ergebnis prüfen" }),
  ).toHaveCount(0);
  const goalId = page.url().match(/\/goals\/([^/?#]+)/)?.[1];
  expect(goalId).toMatch(/^[0-9a-f-]{36}$/i);
  await page.reload();
  await expect(workbench(page).locator("[data-goal-status]")).toHaveText(
    "Entwurf",
  );

  await workbench(page)
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  const edit = workbench(page).locator('form[aria-label="Ziel bearbeiten"]');
  await edit.getByLabel("Status", { exact: true }).selectOption("active");
  await edit.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(workbench(page).locator("[data-goal-status]")).toHaveText(
    "aktiv",
  );

  const foundation = `Rahmen klären ${stamp}`;
  const pilot = `Pilotwochen durchführen ${stamp}`;
  const reflection = `Erkenntnisse sichern ${stamp}`;
  const foundationId = await createStage(page, foundation, "active");
  const stageEdit = workbench(page)
    .locator("[data-goal-selected-work]")
    .getByRole("button", { name: "Etappe bearbeiten" });
  await stageEdit.focus();
  await page.keyboard.press("Enter");
  await expect(stageEdit).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(stageEdit).toHaveAttribute("aria-expanded", "false");
  await expect(stageEdit).toBeFocused();
  await createStage(page, pilot, "active");
  await createStage(page, reflection, "planned");
  await expect(
    workbench(page).locator(
      '[data-goal-progression] [data-goal-stage-status="active"]',
    ),
  ).toHaveCount(2);
  await changeStage(page, foundation, "Erreicht");
  await expect(
    workbench(page).locator(
      '[data-goal-progression] [data-goal-stage-status="achieved"]',
    ),
  ).toHaveCount(1);
  await expect(
    workbench(page).locator(
      '[data-goal-progression] [data-goal-stage-status="active"]',
    ),
  ).toHaveCount(1);
  await expect(
    workbench(page).locator(
      '[data-goal-progression] [data-goal-stage-status="planned"]',
    ),
  ).toHaveCount(1);

  await workbench(page)
    .locator("[data-goal-progression] li")
    .filter({ hasText: foundation })
    .getByRole("link", { name: foundation })
    .click();
  const projectTitle = `Pilotalltag erproben ${stamp}`;
  await workbench(page)
    .locator("[data-goal-selected-work]")
    .getByRole("link", { name: "Projekt hinzufügen" })
    .click();
  const projectForm = page.locator('form[aria-label="Projekt erstellen"]');
  await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
  await projectForm.getByRole("button", { name: "Projekt erstellen" }).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${goalId}`));
  await expect(
    workbench(page).locator("[data-goal-selected-work]"),
  ).toContainText(projectTitle);
  await expect(
    workbench(page).getByRole("region", { name: "Projekte im Ziel" }),
  ).toContainText(projectTitle);
  await page.reload();
  await expect(
    workbench(page).locator("[data-goal-selected-work]"),
  ).toContainText(projectTitle);

  const taskTitle = `Wochenplan mit echten Terminen prüfen ${stamp}`;
  await workbench(page)
    .locator("[data-goal-selected-work]")
    .getByRole("link", { name: "Aufgabe hinzufügen" })
    .click();
  const taskForm = page.locator('form[aria-label="Aufgabe erstellen"]');
  await taskForm.getByLabel("Titel", { exact: true }).fill(taskTitle);
  await taskForm.getByRole("button", { name: "Aufgabe erstellen" }).click();
  await expect(
    workbench(page).locator("[data-goal-selected-work]"),
  ).toContainText(taskTitle);
  await expect(
    workbench(page).getByRole("region", { name: "Direkte Aufgaben im Ziel" }),
  ).toContainText(taskTitle);
  await workbench(page)
    .locator("[data-goal-progression] li")
    .filter({ hasText: pilot })
    .getByRole("link", { name: pilot })
    .click();
  await expect(
    workbench(page)
      .locator("[data-goal-selected-work]")
      .getByRole("heading", { name: pilot, exact: true }),
  ).toBeVisible();
  const pilotId = await workbench(page)
    .locator("[data-goal-selected-work] [data-goal-milestone-id]")
    .getAttribute("data-goal-milestone-id");
  expect(pilotId).not.toBe(foundationId);
  const secondProject = `Wochenrhythmus anpassen ${stamp}`;
  const pilotProjectLink = workbench(page)
    .locator("[data-goal-selected-work]")
    .getByRole("link", { name: "Projekt hinzufügen" });
  await expect(pilotProjectLink).toHaveAttribute(
    "href",
    new RegExp(`goalMilestone=${pilotId}`),
  );
  await pilotProjectLink.click();
  await expect(
    page.locator('form[aria-label="Projekt erstellen"]'),
  ).toContainText(pilot);
  await page
    .locator('form[aria-label="Projekt erstellen"]')
    .getByLabel("Titel", { exact: true })
    .fill(secondProject);
  await page
    .locator('form[aria-label="Projekt erstellen"]')
    .getByRole("button", { name: "Projekt erstellen" })
    .click();
  await expect(
    workbench(page).locator("[data-goal-selected-work]"),
  ).toContainText(secondProject);
  await expect(
    workbench(page).locator(
      "[data-goal-selected-work] [data-goal-milestone-id]",
    ),
  ).toHaveAttribute("data-goal-milestone-id", pilotId!);
  const secondTask = `Rückblick für Woche zwei schreiben ${stamp}`;
  await workbench(page)
    .locator("[data-goal-selected-work]")
    .getByRole("link", { name: "Aufgabe hinzufügen" })
    .click();
  await page
    .locator('form[aria-label="Aufgabe erstellen"]')
    .getByLabel("Titel", { exact: true })
    .fill(secondTask);
  await page
    .locator('form[aria-label="Aufgabe erstellen"]')
    .getByRole("button", { name: "Aufgabe erstellen" })
    .click();
  await expect(
    workbench(page).locator("[data-goal-selected-work]"),
  ).toContainText(secondTask);
  await expect
    .poll(async () =>
      (
        await workbench(page)
          .locator("#naechster-schritt, [data-goal-planning-surface]")
          .allInnerTexts()
      ).join("\n"),
    )
    .not.toMatch(/\bTask\b/);
  await area(page, "Überblick");
  await expect(
    workbench(page)
      .locator("[data-goal-progression] li")
      .filter({ hasText: foundation }),
  ).toContainText(projectTitle);

  await area(page, "Erfolg");
  await expect(
    workbench(page).getByRole("button", { name: "Ergebnis prüfen" }),
  ).toHaveCount(0);
  await workbench(page)
    .getByRole("button", { name: "Erfolg definieren" })
    .click();
  const criterionTitle = `Vier Wochenpläne nachvollziehbar geprüft ${stamp}`;
  const criterionForm = workbench(page).locator(
    'form[aria-label="Erfolgskriterium erstellen"]',
  );
  await criterionForm.getByLabel("Titel", { exact: true }).fill(criterionTitle);
  await criterionForm.getByLabel("Erfolg prüfen als").selectOption("boolean");
  await criterionForm
    .getByRole("button", { name: "Erfolgskriterium erstellen" })
    .click();
  const criterion = workbench(page)
    .locator("[data-goal-criterion-id]")
    .filter({ hasText: criterionTitle });
  await expect(criterion).toBeVisible();
  await criterion.getByRole("button", { name: "Kriterium verwalten" }).click();
  const evaluation = criterion.locator(
    'form[aria-label="Bewertung speichern"]',
  );
  await evaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await evaluation.getByLabel("Wert", { exact: true }).selectOption("true");
  await evaluation.getByRole("button", { name: "Bewertung speichern" }).click();
  await expect(criterion).toContainText("erfüllt");
  await workbench(page)
    .getByRole("button", { name: "Erfolgskriterium hinzufügen" })
    .click();
  const numericTitle = `Mindestens vier Wochenpläne reflektiert ${stamp}`;
  const numericForm = workbench(page).locator(
    'form[aria-label="Erfolgskriterium erstellen"]',
  );
  await numericForm.getByLabel("Titel", { exact: true }).fill(numericTitle);
  await numericForm.getByLabel("Erfolg prüfen als").selectOption("numeric");
  await numericForm.getByLabel("Einheit (Messwert)").fill("Wochenpläne");
  await numericForm.getByLabel("Zielwert").fill("4");
  await numericForm.getByLabel("Richtung").selectOption("at_least");
  await numericForm
    .getByRole("button", { name: "Erfolgskriterium erstellen" })
    .click();
  const numericCriterion = workbench(page)
    .locator("[data-goal-criterion-id]")
    .filter({ hasText: numericTitle });
  await expect(numericCriterion).toContainText("mindestens 4 Wochenpläne");
  await numericCriterion
    .getByRole("button", { name: "Kriterium verwalten" })
    .click();
  const numericEvaluation = numericCriterion.locator(
    'form[aria-label="Bewertung speichern"]',
  );
  await numericEvaluation.getByLabel("Bewertungsstatus").selectOption("value");
  await numericEvaluation.getByLabel("Aktueller Messwert").fill("4");
  await numericEvaluation
    .getByRole("button", { name: "Bewertung speichern" })
    .click();
  await expect(numericCriterion).toContainText("erfüllt");
  await expect(
    workbench(page).getByRole("button", { name: "Ergebnis prüfen" }),
  ).toHaveCount(0);
  await area(page, "Überblick");
  await screenshotAt(page, testInfo, "active");
  await area(page, "Arbeit");
  await page.screenshot({
    path: testInfo.outputPath("active-work-1920x1080.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Arbeit", "Erfolg", "Verlauf"] as const) {
    await area(page, name);
    const geometry = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(geometry.scroll, `${name} mobile overflow`).toBeLessThanOrEqual(
      geometry.client,
    );
  }
  await page.setViewportSize({ width: 1920, height: 1080 });

  await changeStage(page, pilot, "Erreicht");
  await changeStage(page, reflection, "Aktivieren");
  await changeStage(page, reflection, "Erreicht");
  await area(page, "Erfolg");
  await expect(workbench(page).locator("#naechster-schritt")).toContainText(
    "Ergebnis bewusst prüfen",
  );
  await expect(
    workbench(page)
      .locator("#naechster-schritt")
      .getByRole("link", { name: "Ergebnis prüfen" }),
  ).toBeVisible();
  await expect(
    workbench(page).getByRole("button", { name: "Ergebnis prüfen" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("review-ready-1920x1080.png"),
    fullPage: true,
  });
  await workbench(page)
    .getByRole("button", { name: "Ergebnis prüfen" })
    .click();
  const review = workbench(page).locator(
    'form[aria-label="Ergebnis bestätigen"]',
  );
  await review
    .getByLabel("Erfolgsnotiz (optional)")
    .fill("Vier Wochen lang bewusst geplant und die Grenzen dokumentiert.");
  page.once("dialog", (dialog) => dialog.accept());
  await review.getByRole("button", { name: "Ergebnis bestätigen" }).click();
  await expect(page.getByText("Ziel erreicht.", { exact: true })).toBeVisible();
  await area(page, "Überblick");
  await expect(
    workbench(page).locator("[data-goal-achieved-overview]"),
  ).toContainText(criterionTitle);
  await expect(
    workbench(page).getByRole("link", { name: "Aufgabe hinzufügen" }),
  ).toHaveCount(0);
  await expect(
    workbench(page).getByRole("link", { name: "Projekt hinzufügen" }),
  ).toHaveCount(0);
  await area(page, "Arbeit");
  await expect(
    workbench(page).getByRole("link", { name: "Aufgabe hinzufügen" }),
  ).toHaveCount(0);
  await expect(
    workbench(page).getByRole("link", { name: "Projekt hinzufügen" }),
  ).toHaveCount(0);
  await area(page, "Überblick");
  await screenshotAt(page, testInfo, "achieved");
  await page.reload();
  await expect(
    workbench(page).locator("[data-goal-achieved-overview]"),
  ).toContainText("Bestätigtes Ergebnis");
  await workbench(page)
    .getByRole("button", { name: "Ziel wieder öffnen" })
    .click();
  const reopen = workbench(page).locator(
    'form[aria-label="Ziel wieder öffnen"]',
  );
  await reopen.getByRole("button", { name: "Ziel wieder öffnen" }).click();
  await expect(
    page.getByText("Ziel wieder geöffnet.", { exact: true }),
  ).toBeVisible();
  await area(page, "Arbeit");
  await expect(
    workbench(page).getByRole("link", { name: "Aufgabe hinzufügen" }).first(),
  ).toBeVisible();
  await area(page, "Verlauf");
  await expect(workbench(page).locator("#verlauf-belege")).toContainText(
    "wieder geöffnet",
  );
  await page.reload();
  await expect(workbench(page).locator("#verlauf-belege")).toContainText(
    "wieder geöffnet",
  );
  expect(errors).toEqual([]);
  expect(foundationId).toMatch(/^[0-9a-f-]{36}$/i);
});
