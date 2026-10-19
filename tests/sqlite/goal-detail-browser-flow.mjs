import { expect } from "@playwright/test";

// Shared focused Goal flow: normal Manual controls, canonical commands and reload.
export async function goalDetailBrowserFlow({ page, origin, goalId, taskId }) {
  const go = async () => {
    await page.goto(`${origin}/goals/${goalId}`);
    await expect(page.locator('[data-goal-detail-variant="B8"]')).toBeVisible();
  };
  const root = page.locator('[data-goal-detail-variant="B8"]');
  const dialog = (name) => page.getByRole("dialog", { name, exact: true });
  await go();
  await root
    .locator("header")
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  let panel = dialog("Ziel bearbeiten");
  await panel.locator('[name="status"]').selectOption("active");
  await panel
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(panel).not.toBeVisible();
  await page.reload();
  await root
    .getByRole("region", { name: "Erfolgskriterien", exact: true })
    .getByRole("button")
    .click();
  panel = dialog("Erfolgskriterien prüfen");
  await panel
    .getByRole("button", { name: "Erfolgskriterium hinzufügen", exact: true })
    .click();
  let form = panel.getByRole("form", {
    name: "Erfolgskriterium erstellen",
    exact: true,
  });
  await form
    .getByLabel("Titel", { exact: true })
    .fill("SQLite browser Goal criterion");
  await form
    .getByLabel("Erfolg prüfen als", { exact: true })
    .selectOption("boolean");
  await form
    .getByRole("button", { name: "Erfolgskriterium erstellen", exact: true })
    .click();
  await expect(
    panel.getByRole("button", {
      name: "Erfolgskriterium hinzufügen",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(root.locator("[data-goal-criteria-summary]")).toContainText(
    "SQLite browser Goal criterion",
  );
  await root
    .getByRole("region", { name: "Erfolgskriterien", exact: true })
    .getByRole("button")
    .click();
  panel = dialog("Erfolgskriterien prüfen");
  const criterion = panel
    .locator("[data-goal-criterion-id]")
    .filter({ hasText: "SQLite browser Goal criterion" });
  await criterion
    .getByRole("button", { name: "Kriterium verwalten", exact: true })
    .click();
  form = criterion.getByRole("form", {
    name: "Bewertung speichern",
    exact: true,
  });
  await form.locator('[name="evaluationState"]').selectOption("value");
  await form.locator('[name="booleanValue"]').selectOption("true");
  await form
    .getByRole("button", { name: "Bewertung speichern", exact: true })
    .click();
  // Nested disclosure closes; the parent review dialog stays available.
  await expect(
    criterion.getByRole("button", { name: "Kriterium verwalten", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(root.locator("[data-goal-criteria-summary]")).toContainText(
    "erfüllt",
  );
  await root
    .getByRole("button", { name: "+ Zwischenziel", exact: true })
    .click();
  panel = dialog("Zwischenziel hinzufügen");
  form = panel.getByRole("form", {
    name: "Zwischenziel erstellen",
    exact: true,
  });
  await form
    .getByLabel("Titel", { exact: true })
    .fill("SQLite browser Goal milestone");
  await form
    .getByRole("button", { name: "Zwischenziel erstellen", exact: true })
    .click();
  await expect(panel).not.toBeVisible();
  await page.reload();
  const stage = root.locator("[data-goal-work-milestone]").filter({
    has: page.getByRole("heading", {
      name: "SQLite browser Goal milestone",
      exact: true,
    }),
  });
  await stage.getByRole("button", { name: "+ Task", exact: true }).click();
  panel = dialog("Task zu „SQLite browser Goal milestone“ hinzufügen");
  await panel
    .getByRole("button", { name: "Zwischenziel aktivieren", exact: true })
    .click();
  await expect(panel).not.toBeVisible();
  await page.reload();
  await expect(stage).toHaveAttribute("data-current", "true");
  await stage
    .getByRole("button", { name: "Weitere Optionen", exact: true })
    .click();
  panel = dialog("Zwischenziel verwalten: SQLite browser Goal milestone");
  await panel
    .getByRole("button", { name: "Bestehende Task zuordnen", exact: true })
    .click();
  form = panel.getByRole("form", { name: "Aufgabe verknüpfen", exact: true });
  await form.locator('[name="taskId"]').selectOption(taskId);
  await form
    .getByRole("button", { name: "Aufgabe verknüpfen", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(stage.locator(`[data-goal-task="${taskId}"]`)).toBeVisible();
  await expect(root.locator(`[data-goal-task="${taskId}"]`)).toHaveCount(1);
  await stage
    .locator(`[data-goal-task="${taskId}"]`)
    .getByRole("link", { name: /: Öffnen$/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}$`));
  await page.getByRole("button", { name: "Erledigt", exact: true }).click();
  await expect(page.locator('[data-task-lifecycle="done"]')).toBeVisible();
  await go();
  await page.reload();
  await expect(stage).toHaveAttribute("data-current", "true");
  await expect(root.locator("[data-goal-status]")).toHaveText("aktiv");
  await stage
    .getByRole("button", { name: "Zwischenziel prüfen", exact: true })
    .click();
  panel = dialog("Zwischenziel prüfen");
  page.once("dialog", (d) => d.accept());
  await panel
    .getByRole("button", {
      name: "Zwischenziel erreicht bestätigen",
      exact: true,
    })
    .click();
  await expect(panel).not.toBeVisible();
  await page.reload();
  await expect(stage).not.toHaveAttribute("data-current", "true");
  await expect(stage).toContainText("erreicht");
  await expect(root.locator("[data-goal-status]")).toHaveText("aktiv");
  await root
    .locator("footer")
    .getByRole("button", { name: "Ziel prüfen", exact: true })
    .click();
  panel = dialog("Ziel prüfen");
  page.once("dialog", (d) => d.accept());
  await panel
    .getByRole("button", { name: "Ziel erreicht bestätigen", exact: true })
    .click();
  await expect(panel).not.toBeVisible();
  await page.reload();
  await expect(root.locator("[data-goal-status]")).toHaveText("erreicht");
  await expect(
    root.getByRole("link", { name: "+ Task", exact: true }),
  ).toHaveCount(0);
  await root
    .locator("footer")
    .getByRole("button", { name: "Ziel prüfen", exact: true })
    .click();
  panel = dialog("Ziel prüfen");
  page.once("dialog", (d) => d.accept());
  await panel
    .getByRole("button", { name: "Ziel wieder öffnen", exact: true })
    .click();
  await expect(panel).not.toBeVisible();
  await page.reload();
  await expect(root.locator("[data-goal-status]")).toHaveText("aktiv");
  await root
    .getByRole("link", { name: "Verlauf ansehen", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Verlauf & Belege", exact: true }),
  ).toContainText(/Kriterium|Zwischenziel|Etappe/);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Verlauf & Belege", exact: true }),
  ).toBeVisible();
}
