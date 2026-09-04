import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

async function setProfile(page: Page, profile: "demo" | "empty" | "manual") {
  await page.context().clearCookies();
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

test("Z1 keeps Empty Coding and Life surfaces non-persistent", async ({ page }) => {
  await setProfile(page, "empty");

  for (const [route, state] of [
    ["/coding", "data-coding-overview-state"],
    ["/coding/repositories", "data-repositories-state"],
    ["/coding/skill-map", "data-skill-map-state"],
    ["/life", "data-life-empty-state"],
    ["/life/journal", "data-life-empty-state"],
    ["/life/notes", "data-life-empty-state"],
    ["/life/inventory", "data-life-empty-state"],
  ] as const) {
    await page.goto(route);
    await expect(page.locator(`[${state}="prepared"]`)).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("button", {
        name: /add (repository|skill|evidence|practice)|new journal entry|start reflection|new note|add (inventory|wishlist) item/i,
      }),
    ).toHaveCount(0);
  }

  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Settings prepared" })).toBeDisabled();
  await expect(page.getByText(/bewusst read-only/i)).toBeVisible();
  await expect(page.getByLabel("Display Name *")).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: /create (task|inbox item|project|goal)|reset manual local profile/i,
    }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Inbox öffnen" })).toHaveAttribute(
    "href",
    "/inbox",
  );
});

test("Z1 keeps canonical Coding writes reachable while prepared routes stay honest", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const projectTitle = `Z1 UI truth coding ${stamp}`;

  await signUpTechnicalManualUser(page, "z1-ui-truth", stamp);
  await page.goto("/coding");

  const create = page.getByRole("form", { name: "Coding-Projekt erstellen" });
  await create.getByLabel("Titel").fill(projectTitle);
  await create.getByLabel("Beschreibung").fill("Canonical Coding project.");
  await create.getByRole("button", { name: "Coding-Projekt erstellen" }).click();
  await expect(page.locator('[data-coding-action-status]')).toHaveText(
    "Coding-Projekt erstellt.",
  );
  await page.reload();
  await expect(page.locator('[data-coding-region="projects"]')).toContainText(projectTitle);

  await page.goto("/coding/repositories");
  await expect(page.locator('[data-repositories-state="prepared"]')).toBeVisible();
  const codingProjects = page.getByRole("link", { name: "Coding-Projekte öffnen" });
  await expect(codingProjects).toHaveAttribute("href", "/coding");
  await codingProjects.click();
  await expect(page.locator('[data-coding-region="projects"]')).toContainText(projectTitle);

  await page.goto("/coding/skill-map");
  await expect(page.locator('[data-skill-map-state="prepared"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Skills öffnen" })).toHaveAttribute(
    "href",
    "/portfolio?view=skills",
  );
  await page.reload();
  await expect(page.locator('[data-skill-map-state="prepared"]')).toBeVisible();
});

test("Z1 keeps unauthenticated Manual Coding visibly blocked", async ({ page }) => {
  await setProfile(page, "manual");
  await page.goto("/coding");
  await expect(page.getByText("Coding ist auth-blocked", { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Coding-Projekt erstellen" })).toHaveCount(0);
});
