import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

function sectionForHeading(page: Page, heading: string) {
  return page
    .getByRole("heading", { name: heading, exact: true })
    .locator("xpath=ancestor::section[1]");
}

async function setProfile(page: Page, profile: "demo" | "empty" | "manual") {
  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: playwrightBaseUrl,
      value: profile,
    },
  ]);
}

test("A1 keeps auth-blocked and empty agent surfaces honest", async ({ page }) => {
  await setProfile(page, "manual");
  await page.goto("/coding");
  await expect(page.getByText("Coding ist auth-blocked", { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Coding-Projekt erstellen" })).toHaveCount(0);

  await page.goto("/coding/agents");
  await expect(page.locator('[data-agent-hub-state="prepared"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Queue|Create agent task|New prompt|Add context/i })).toHaveCount(0);

  await setProfile(page, "empty");
  await page.goto("/coding/agents");
  await expect(page.locator('[data-agent-hub-state="prepared"]')).toBeVisible();
  await expect(page.getByText(/keine lokalen Tasks, Prompts, Context Bundles oder Review-Entscheidungen/i)).toBeVisible();

  await setProfile(page, "demo");
  await page.goto("/coding/agents");
  await expect(page.locator('[data-agent-hub-state="prepared"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create agent task" })).toBeVisible();
});

test("A1 keeps coding, education, work and inventory records canonical and reload-stable", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const stamp = Date.now();
  const codingProject = `A1 coding ${stamp}`;
  const updatedCodingDescription = `Updated A1 coding context ${stamp}`;
  const codingSession = `A1 coding session ${stamp}`;
  const educationProject = `A1 education ${stamp}`;
  const literature = `A1 literature ${stamp}`;
  const educationLog = `A1 learning ${stamp}`;
  const workProject = `A1 work ${stamp}`;
  const workLog = `A1 work log ${stamp}`;
  const wiki = `A1 wiki ${stamp}`;
  const inventory = `A1 inventory ${stamp}`;
  const updatedInventory = `A1 inventory updated ${stamp}`;
  const wishlist = `A1 wishlist ${stamp}`;
  const decision = `A1 purchase decision ${stamp}`;

  await signUpTechnicalManualUser(page, "a1-workspaces", stamp);

  await page.goto("/coding");
  const codingCreate = page.getByRole("form", { name: "Coding-Projekt erstellen" });
  await codingCreate.getByLabel("Titel").fill(codingProject);
  await codingCreate.getByLabel("Beschreibung").fill("Canonical A1 coding context");
  await codingCreate.getByLabel("Repository-URL").fill("https://example.local/a1");
  await codingCreate.getByRole("button", { name: "Coding-Projekt erstellen" }).click();
  await expect(page.locator('[data-coding-action-status]')).toHaveText("Coding-Projekt erstellt.");
  await expect(page.locator('[data-coding-region="projects"]')).toContainText(codingProject);
  await page.reload();
  await expect(page.locator('[data-coding-region="project-context"]')).toContainText(codingProject);
  await expect(
    page.locator('[data-coding-region="project-context"]').getByRole("link", { name: "Project öffnen" }),
  ).toHaveAttribute("href", /\/portfolio\?view=projects&selected=/);
  const codingEdit = page.getByRole("form", { name: "Coding-Projekt bearbeiten" });
  await codingEdit.getByLabel("Beschreibung").fill(updatedCodingDescription);
  await codingEdit.getByRole("button", { name: "Project speichern" }).click();
  await expect(page.locator('[data-coding-action-status]')).toHaveText("Coding-Projekt aktualisiert.");
  await page.reload();
  await expect(page.getByRole("form", { name: "Coding-Projekt bearbeiten" }).getByLabel("Beschreibung")).toHaveValue(updatedCodingDescription);

  const codingSessionForm = page.getByRole("form", { name: "Coding Session erfassen" });
  await codingSessionForm.getByLabel("Dauer (Minuten)").fill("45");
  await codingSessionForm.getByLabel("Tätigkeit / Fokus").fill(codingSession);
  await codingSessionForm.getByLabel("Ergebnis").fill("Reload-stable coding log");
  await codingSessionForm.getByRole("button", { name: "Session speichern" }).click();
  await expect(page.locator('[data-coding-action-status]')).toHaveText("Coding Session gespeichert.");
  await page.reload();
  await expect(page.locator('[data-coding-region="session-log"]')).toContainText(codingSession);

  await page.goto("/education");
  const educationCreate = page.getByRole("form", { name: "Education Project erstellen" });
  await educationCreate.getByLabel("Titel").fill(educationProject);
  await educationCreate.getByLabel("Beschreibung").fill("Canonical A1 research context");
  await educationCreate.getByRole("button", { name: "Education Project erstellen" }).click();
  await expect(page.locator('[data-education-action-status]')).toHaveText("Education Project erstellt.");
  await expect(page.locator('[data-education-region="project-context"]')).toContainText(educationProject);

  const literatureCreate = page.getByRole("form", { name: "Literatur erstellen" });
  await literatureCreate.getByLabel("Titel").fill(literature);
  await literatureCreate.getByLabel("Notiz").fill("Canonical Resource linked to the education project");
  await literatureCreate.getByRole("button", { name: "Literatur speichern und verknüpfen" }).click();
  await expect(page.locator('[data-education-action-status]')).toHaveText("Literatur erstellt und verknüpft.");
  await page.reload();
  await expect(page.locator('[data-education-region="literature"]')).toContainText(literature);
  await expect(
    page.locator('[data-education-region="project-context"]').getByRole("link", { name: "Project öffnen" }),
  ).toHaveAttribute("href", /\/portfolio\?view=projects&selected=/);

  const educationLogForm = page.getByRole("form", { name: "Education Log erstellen" });
  await educationLogForm.getByLabel("Dauer (Minuten)").fill("30");
  await educationLogForm.getByLabel("Fokus").fill(educationLog);
  await educationLogForm.getByLabel("Ergebnis").fill("Learning record persisted");
  await educationLogForm.getByRole("button", { name: "Log speichern" }).click();
  await expect(page.locator('[data-education-action-status]')).toHaveText("Education Log erstellt.");
  await page.reload();
  await expect(page.locator('[data-education-region="activity"]')).toContainText(educationLog);

  await page.goto("/work");
  const workCreate = page.getByRole("form", { name: "Work Project erstellen" });
  await workCreate.getByLabel("Titel").fill(workProject);
  await workCreate.getByLabel("Beschreibung").fill("Canonical A1 work context");
  await workCreate.getByRole("button", { name: "Work Project erstellen" }).click();
  await expect(page.locator('[data-work-action-status]')).toHaveText("Work Project erstellt.");
  await expect(page.locator('[data-work-region="project-context"]')).toContainText(workProject);

  const workLogForm = page.getByRole("form", { name: "Work Log erstellen" });
  await workLogForm.getByLabel("Dauer in Minuten").fill("30");
  await workLogForm.getByLabel("Tätigkeit / Fokus").fill(workLog);
  await workLogForm.getByLabel("Ergebnis").fill("Work record persisted");
  await workLogForm.getByRole("button", { name: "Work Log erfassen" }).click();
  await expect(page.locator('[data-work-action-status]')).toHaveText("Work Log erstellt.");
  await page.reload();
  await expect(page.locator('[data-work-region="logs"]')).toContainText(workLog);

  const wikiCreate = page.getByRole("form", { name: "Work Wiki erstellen" });
  await wikiCreate.getByLabel("Titel").fill(wiki);
  await wikiCreate.getByLabel("Inhalt").fill("Canonical Resource-backed wiki entry");
  await wikiCreate.getByRole("button", { name: "Wiki-Eintrag erstellen" }).click();
  await expect(page.locator('[data-work-action-status]')).toHaveText("Work Wiki erstellt.");
  await page.reload();
  await expect(page.locator('[data-work-region="wiki"]')).toContainText(wiki);

  await page.goto("/life/inventory");
  const inventoryCreate = sectionForHeading(page, "Add inventory item").locator("form");
  await inventoryCreate.getByLabel("Name").fill(inventory);
  await inventoryCreate.getByLabel("Category").fill("technical");
  await inventoryCreate.getByRole("button", { name: "Save inventory item" }).click();
  await expect(page.getByRole("status")).toContainText("Inventory item saved.");
  const inventoryCard = page.locator("article").filter({ hasText: inventory });
  await expect(inventoryCard).toHaveCount(1);
  await inventoryCard.getByText("Edit inventory item", { exact: true }).click();
  const inventoryEdit = inventoryCard.locator("form");
  await inventoryEdit.getByLabel("Name").fill(updatedInventory);
  await inventoryEdit.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Inventory item updated.");
  await page.reload();
  await expect(page.locator("article").filter({ hasText: updatedInventory })).toHaveCount(1);

  const wishlistCreate = sectionForHeading(page, "Add wishlist item").locator("form");
  await wishlistCreate.getByLabel("Title").fill(wishlist);
  await wishlistCreate.getByLabel("Category").fill("technical");
  await wishlistCreate.getByRole("button", { name: "Save wishlist item" }).click();
  await expect(page.getByRole("status")).toContainText("Wishlist item saved.");
  const activeWishlist = sectionForHeading(page, "Active wishlist & decisions");
  const wishlistCard = activeWishlist.locator("article").filter({ hasText: wishlist });
  await expect(wishlistCard).toHaveCount(1);
  await wishlistCard.getByText("Purchase decisions", { exact: true }).click();
  const decisionCreate = wishlistCard.locator("form").filter({ hasText: "New purchase decision" });
  await decisionCreate.getByLabel("Need or context").fill("A deliberate technical test purchase");
  await decisionCreate.getByLabel("Decision", { exact: true }).fill(decision);
  await decisionCreate.getByLabel("Rationale").fill("Validate the canonical purchase decision relation");
  await decisionCreate.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByRole("status")).toContainText("Purchase decision saved.");
  await expect(wishlistCard).toContainText(decision);

  const convertedWishlist = activeWishlist.locator("article").filter({ hasText: wishlist });
  await convertedWishlist.getByRole("button", { name: "In Inventory übernehmen" }).click();
  await expect(page.getByRole("status")).toContainText("Wishlist item transferred to inventory.");
  await page.reload();
  const reloadedWishlist = sectionForHeading(page, "Active wishlist & decisions")
    .locator("article")
    .filter({ hasText: wishlist });
  const transferredInventory = sectionForHeading(page, "Active inventory")
    .locator("article")
    .filter({ hasText: wishlist });
  await expect(reloadedWishlist).toContainText("acquired");
  await expect(reloadedWishlist).toContainText("Transferred to inventory");
  await expect(transferredInventory).toHaveCount(1);

  await page.goto("/coding/agents");
  await expect(page.locator('[data-agent-hub-state="prepared"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Queue|Create agent task|New prompt|Add context/i })).toHaveCount(0);
});
