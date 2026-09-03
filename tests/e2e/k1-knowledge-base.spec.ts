import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const baseUrl = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

async function createPortfolioEntity(
  page: Page,
  view: "goals" | "projects" | "skills" | "tasks",
  title: string,
) {
  await page.goto(`/portfolio?view=${view}`);
  const names = {
    goals: ["Goal erstellen", "Goal-Titel"],
    projects: ["Project erstellen", "Project-Titel"],
    skills: ["Skill erstellen", "Skill-Name"],
    tasks: ["Task erstellen", "Task-Titel"],
  } as const;
  const [formName, titleLabel] = names[view];
  const form = page.locator(`form[aria-label="${formName}"]`);
  await form.getByLabel(titleLabel).fill(title);
  await form.getByRole("button", { name: formName }).click();
  await expect(page.getByText(`${formName.replace(" erstellen", " erstellt")}.`, { exact: true })).toBeVisible();

  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function linkResource(
  page: Page,
  resourceId: string,
  targetId: string,
  targetType: "goal" | "project" | "skill" | "task",
) {
  await page.goto(`/resources?selected=${resourceId}`);
  const form = page.locator('form[aria-label="Resource Beziehung hinzufügen"]');
  await form.getByLabel("Zieltyp").selectOption(targetType);
  await form.getByLabel("Ziel", { exact: true }).selectOption(targetId);
  await form.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Beziehung gespeichert.", { exact: true })).toBeVisible();
}

test("K1 keeps Resources searchable, connected, evidence-aware and lifecycle-stable", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const stamp = Date.now();
  const bodyNeedle = `k1-body-needle-${stamp}`;
  const title = `K1 resource ${stamp}`;
  const editedTitle = `K1 resource edited ${stamp}`;
  const goalTitle = `K1 goal ${stamp}`;
  const projectTitle = `K1 project ${stamp}`;
  const skillTitle = `K1 skill ${stamp}`;
  const taskTitle = `K1 task ${stamp}`;

  await signUpTechnicalManualUser(page, "k1-knowledge", stamp);
  const goalId = await createPortfolioEntity(page, "goals", goalTitle);
  const projectId = await createPortfolioEntity(page, "projects", projectTitle);
  const taskId = await createPortfolioEntity(page, "tasks", taskTitle);
  const skillId = await createPortfolioEntity(page, "skills", skillTitle);

  await page.goto("/resources");
  const createForm = page.locator('form[aria-label="Resource erstellen"]');
  await createForm.getByLabel("Titel").fill(title);
  await createForm.getByLabel("Beschreibung / Notiz").fill(bodyNeedle);
  await createForm.getByLabel("URL").fill(`https://example.test/k1-${stamp}`);
  await createForm.locator('select[name="type"]').selectOption("research");
  await createForm.getByRole("button", { name: "Resource speichern" }).click();
  await expect(page.getByText("Resource erstellt.", { exact: true })).toBeVisible();
  const resourceId = new URL(page.url()).searchParams.get("selected");
  expect(resourceId).toBeTruthy();

  const inspector = page.locator('[data-resources-section="relation-inspector"]');
  await page.reload();
  await expect(inspector.locator("#selected-resource-heading")).toHaveText(title);

  const editForm = inspector.getByRole("form", { name: "Resource bearbeiten" });
  await editForm.getByLabel("Titel").fill(editedTitle);
  await editForm.getByLabel("Beschreibung / Notiz").fill(`${bodyNeedle} updated`);
  await editForm.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.getByText("Resource aktualisiert.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(inspector.locator("#selected-resource-heading")).toHaveText(editedTitle);

  await page.goto(`/resources?q=${bodyNeedle}`);
  const library = page.locator('[data-resources-section="library"]');
  const result = library.getByRole("link", {
    name: `Select resource ${editedTitle}`,
  });
  await expect(result).toBeVisible();
  await result.click();
  await expect(inspector.locator("#selected-resource-heading")).toHaveText(editedTitle);

  await linkResource(page, resourceId!, projectId, "project");
  await linkResource(page, resourceId!, goalId, "goal");
  await linkResource(page, resourceId!, taskId, "task");
  await linkResource(page, resourceId!, skillId, "skill");

  await page.goto(`/resources?selected=${resourceId}`);
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Projects" }).getByText(projectTitle, { exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Goals" }).getByText(goalTitle, { exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Tasks" }).getByText(taskTitle, { exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Skills" }).getByText(skillTitle, { exact: true }),
  ).toBeVisible();

  await page.goto(`/portfolio?view=projects&selected=${projectId}`);
  const projectWorkbench = page.locator("section[aria-labelledby='project-workbench-heading']");
  await expect(projectWorkbench.getByText(editedTitle, { exact: true })).toHaveCount(1);

  await page.goto(`/portfolio?view=skills&selected=${skillId}`);
  const evidenceForm = page.locator('form[aria-label="Evidence hinzufügen"]');
  await evidenceForm.getByLabel("Evidence Source").selectOption(`resource:${resourceId}`);
  await evidenceForm.getByLabel("Evidence-Titel").fill(`K1 evidence ${stamp}`);
  await evidenceForm.getByLabel("Datum").fill("2026-09-03");
  await evidenceForm.getByRole("button", { name: "Evidence hinzufügen" }).click();
  await expect(page.getByText("Skill Evidence erstellt.", { exact: true })).toBeVisible();

  const relatedResource = page
    .locator("[data-skill-related-resources]")
    .locator(`[data-skill-related-resource="${resourceId}"]`);
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toBeVisible();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();
  await page.reload();
  await expect(relatedResource).toHaveCount(1);

  await page.goto(`/resources?selected=${resourceId}`);
  await inspector
    .getByRole("form", { name: "Resource archivieren" })
    .getByRole("button", { name: "Resource archivieren" })
    .click();
  await expect(page.getByText("Resource archiviert.", { exact: true })).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Resource Overview" }).getByText("Archived", { exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("region", { name: "Verknüpfte Skills" }).getByText(skillTitle, { exact: true }),
  ).toBeVisible();
  await expect(
    library.getByRole("link", { name: `Select resource ${editedTitle}` }),
  ).toHaveCount(0);

  await page.goto(`/resources?q=${editedTitle}`);
  await expect(
    library.getByRole("link", { name: `Select resource ${editedTitle}` }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    library.getByRole("link", { name: `Select resource ${editedTitle}` }),
  ).toHaveCount(0);

  await page.goto(`/resources?selected=${resourceId}`);
  await inspector
    .getByRole("form", { name: "Resource wiederherstellen" })
    .getByRole("button", { name: "Resource wiederherstellen" })
    .click();
  await expect(page.getByText("Resource wiederhergestellt.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(inspector.getByRole("form", { name: "Resource bearbeiten" })).toBeVisible();

  await page.goto(`/portfolio?view=skills&selected=${skillId}`);
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toBeVisible();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();
});

test("K1 keeps unauthenticated Manual resource writes visibly blocked", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: baseUrl,
      value: "manual",
    },
  ]);
  await page.goto("/resources");

  const capture = page.locator('form[aria-label="Resource erstellen"]');
  await expect(capture.getByRole("button", { name: "Resource speichern" })).toBeDisabled();
  await expect(capture.locator("xpath=..").getByRole("status")).toHaveText(
    "Melde dich lokal an, um Resources zu speichern.",
  );
});
