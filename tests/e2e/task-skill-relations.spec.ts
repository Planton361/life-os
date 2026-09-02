import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function openAuthenticatedManualPortfolio(page: Page, stamp: number) {
  await signUpTechnicalManualUser(page, "c1-1-02", stamp);

  await page.goto("/portfolio?view=tasks");
  await expect(page.locator('form[aria-label="Task erstellen"]')).toBeVisible();
}

async function createTask(page: Page, title: string) {
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByLabel("Next Action").fill("Task-Skill-Kontext prüfen");
  await form.getByLabel("Kontext").fill("Fokussierter C1.1-02 Browser-Proof");
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.").first()).toBeVisible();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);

  return new URL(page.url()).searchParams.get("selected");
}

async function createSkill(page: Page, title: string) {
  await page.goto("/portfolio?view=skills");
  const form = page.locator('form[aria-label="Skill erstellen"]');
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByLabel("Summary").fill("C1.1-02 context without Evidence");
  await form.getByLabel("Kategorie").fill("Coding");
  await form.getByRole("button", { name: "Skill erstellen" }).click();
  await expect(page.getByText("Skill erstellt.").first()).toBeVisible();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);

  return new URL(page.url()).searchParams.get("selected");
}

test("C1.1-02 links and unlinks Task Skill context on both projections", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const taskTitle = `C1.1-02 Task ${stamp}`;
  const skillTitle = `C1.1-02 Skill ${stamp}`;

  await openAuthenticatedManualPortfolio(page, stamp);
  const taskId = await createTask(page, taskTitle);
  expect(taskId).toBeTruthy();
  const skillId = await createSkill(page, skillTitle);
  expect(skillId).toBeTruthy();

  await page.goto(`/portfolio?view=tasks&selected=${taskId}`);
  const taskRegion = page.locator('[data-task-skill-region="task"]');
  const linkForm = taskRegion.getByRole("form", {
    name: "Skill mit Task verknüpfen",
  });
  await linkForm.getByLabel("Skill suchen / auswählen").selectOption({
    label: skillTitle,
  });
  await linkForm.getByRole("button", { name: "Skill verknüpfen" }).click();
  await expect(page.getByText("Skill mit Task verknüpft.").first()).toBeVisible();
  await expect(taskRegion.getByRole("link", { name: skillTitle })).toBeVisible();

  await page.reload();
  await expect(taskRegion.getByRole("link", { name: skillTitle })).toBeVisible();

  await taskRegion.getByRole("link", { name: skillTitle }).click();
  await expect(page).toHaveURL(
    new RegExp(`/portfolio\\?view=skills&selected=${skillId}$`),
  );
  const skillRegion = page.locator('[data-task-skill-region="skill"]');
  await expect(skillRegion.getByRole("link", { name: taskTitle })).toBeVisible();
  await expect(page.getByText("Noch keine Skill Evidence gespeichert.")).toBeVisible();

  await skillRegion.getByRole("link", { name: taskTitle }).click();
  const unlinkForm = taskRegion.getByRole("form", {
    name: `Skill-Verbindung entfernen ${skillTitle}`,
  });
  await unlinkForm.getByRole("button", { name: "Verbindung entfernen" }).click();
  await expect(page.getByText("Skill-Verbindung entfernt.").first()).toBeVisible();
  await expect(taskRegion.getByRole("link", { name: skillTitle })).toHaveCount(0);

  await page.reload();
  await expect(taskRegion.getByRole("link", { name: skillTitle })).toHaveCount(0);

  await page.goto(`/portfolio?view=skills&selected=${skillId}`);
  await expect(skillRegion.getByRole("link", { name: taskTitle })).toHaveCount(0);
  await page.reload();
  await expect(skillRegion.getByRole("link", { name: taskTitle })).toHaveCount(0);
});
