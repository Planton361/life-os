import { expect, test, type Page } from "@playwright/test";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseUrl = `http://${host}:${port}`;

async function authenticateManual(page: Page) {
  test.skip(
    !process.env.TARGET_EMAIL || !process.env.TARGET_PASSWORD,
    "Requires the authorized local Target credentials.",
  );

  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: baseUrl,
      value: "manual",
    },
  ]);
  await page.goto("/settings#supabase-session");

  const panel = page.locator("#supabase-session");
  await expect(panel.getByRole("button", { name: "Sign in" })).toBeVisible();
  await panel.getByLabel("Email").fill(process.env.TARGET_EMAIL!);
  await panel.getByLabel("Password").fill(process.env.TARGET_PASSWORD!);
  await panel.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox(?:#.*)?$/);
}

async function createResource(page: Page, title: string) {
  await page.goto("/resources");
  const form = page.locator('form[aria-label="Resource erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Resource speichern" }).click();
  await expect(page.getByText("Resource erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function createSkill(page: Page, title: string) {
  await page.goto("/portfolio?view=skills");
  const form = page.locator('form[aria-label="Skill erstellen"]');
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByRole("button", { name: "Skill erstellen" }).click();
  await expect(page.getByText("Skill erstellt.", { exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

async function linkContext(
  page: Page,
  resourceId: string,
  skillId: string,
  state: "saved" | "existing",
) {
  await page.goto(`/resources?selected=${resourceId}`);
  const form = page.locator('form[aria-label="Resource Beziehung hinzufügen"]');
  await form.getByLabel("Zieltyp").selectOption("skill");
  await form.getByLabel("Ziel", { exact: true }).selectOption(skillId);
  await expect(form.getByText(/Kontext-Verknüpfung/)).toBeVisible();
  await form.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByText(
      state === "saved" ? "Beziehung gespeichert." : "Beziehung besteht bereits.",
      { exact: true },
    ),
  ).toBeVisible();
}

test("C1.1-04 keeps Resource↔Skill context distinct from evidence across backlinks", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const resourceTitle = `C11 resource context ${stamp}`;
  const skillATitle = `C11 skill context A ${stamp}`;
  const skillBTitle = `C11 skill context B ${stamp}`;

  await authenticateManual(page);
  const resourceId = await createResource(page, resourceTitle);
  const skillAId = await createSkill(page, skillATitle);
  const skillBId = await createSkill(page, skillBTitle);

  await linkContext(page, resourceId, skillAId, "saved");
  await linkContext(page, resourceId, skillAId, "existing");
  await linkContext(page, resourceId, skillBId, "saved");

  const resourceInspector = page.locator(
    '[data-resources-section="relation-inspector"]',
  );
  const linkedSkills = resourceInspector.getByRole("region", {
    name: "Verknüpfte Skills",
  });
  await expect(linkedSkills.getByText(skillATitle, { exact: true })).toHaveCount(1);
  await expect(linkedSkills.getByText(skillBTitle, { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(linkedSkills.getByText(skillATitle, { exact: true })).toHaveCount(1);

  await page.goto(`/portfolio?view=skills&selected=${skillAId}`);
  const relatedResources = page.locator("[data-skill-related-resources]");
  const relatedResource = relatedResources.locator(
    `[data-skill-related-resource="${resourceId}"]`,
  );
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toBeVisible();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(relatedResource).toHaveCount(1);

  const evidenceForm = page.locator('form[aria-label="Evidence hinzufügen"]');
  await evidenceForm
    .getByLabel("Evidence Source")
    .selectOption(`resource:${resourceId}`);
  await evidenceForm.getByLabel("Evidence-Titel").fill(`C11 evidence ${stamp}`);
  await evidenceForm.getByLabel("Datum").fill("2026-09-02");
  await evidenceForm.getByRole("button", { name: "Evidence hinzufügen" }).click();
  await expect(page.getByText("Skill Evidence erstellt.", { exact: true })).toBeVisible();
  await expect(relatedResource).toHaveCount(1);
  await expect(relatedResource.getByText("Context", { exact: true })).toBeVisible();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();
  await page.reload();
  await expect(relatedResource.getByText("Evidence", { exact: true })).toBeVisible();

  await page.goto(`/resources?selected=${resourceId}`);
  const unlinkSkills = page.getByRole("region", { name: "Verknüpfte Skills" });
  const skillBCard = unlinkSkills.locator("article").filter({ hasText: skillBTitle });
  await skillBCard.getByRole("button", { name: "Verknüpfung lösen" }).click();
  await expect(page.getByText("Resource-Verknüpfung gelöst.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(unlinkSkills.getByText(skillBTitle, { exact: true })).toHaveCount(0);

  await page.goto(`/portfolio?view=skills&selected=${skillBId}`);
  await expect(page.locator("[data-skill-related-resources]").locator(
    `[data-skill-related-resource="${resourceId}"]`,
  )).toHaveCount(0);

  await page.goto(`/resources?selected=${resourceId}`);
  const skillACard = page
    .getByRole("region", { name: "Verknüpfte Skills" })
    .locator("article")
    .filter({ hasText: skillATitle });
  await skillACard.getByRole("button", { name: "Verknüpfung lösen" }).click();
  await expect(page.getByText("Resource-Verknüpfung gelöst.", { exact: true })).toBeVisible();

  await page.goto(`/portfolio?view=skills&selected=${skillAId}`);
  const evidenceOnly = page
    .locator("[data-skill-related-resources]")
    .locator(`[data-skill-related-resource="${resourceId}"]`);
  await expect(evidenceOnly).toHaveCount(1);
  await expect(evidenceOnly.getByText("Context", { exact: true })).toHaveCount(0);
  await expect(evidenceOnly.getByText("Evidence", { exact: true })).toBeVisible();
  await page.reload();
  await expect(evidenceOnly.getByText("Evidence", { exact: true })).toBeVisible();
});
