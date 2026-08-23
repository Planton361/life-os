import { expect, type Page, test } from "@playwright/test";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

const primaryLinks = [
  "Dashboard",
  "Inbox",
  "Today",
  "Calendar",
  "Portfolio",
  "Resources",
] as const;

const areaLinks = [
  "Health & Fitness Area öffnen",
  "Nutrition Area öffnen",
  "Coding Area öffnen",
  "Life Area öffnen",
  "Education Area öffnen",
  "Work Area öffnen",
] as const;

async function setManualProfile(page: Page) {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: playwrightBaseUrl,
      value: "manual",
    },
  ]);
}

async function expectActiveProductNavigation(page: Page) {
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });

  await expect(navigation).toBeVisible();

  for (const name of primaryLinks) {
    await expect(navigation.getByRole("link", { name, exact: true })).toBeVisible();
  }

  for (const name of areaLinks) {
    await expect(navigation.getByRole("link", { name })).toBeVisible();
  }

  for (const name of ["Inventory", "Wishlist", "Settings"] as const) {
    await expect(navigation.getByRole("link", { name, exact: true })).toBeVisible();
  }

  for (const name of ["Entertainment", "Shop", "Challenges"] as const) {
    await expect(navigation.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
}

test.describe("C1.1-01 active product visibility", () => {
  test("keeps the daily-companion navigation stable across reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    await expectActiveProductNavigation(page);

    const dashboard = page.getByRole("region", { name: "Dashboard-Zonen" });
    await expect(
      dashboard.getByRole("heading", {
        name: "Anti-Rot Actions / Bad Habit Reset Row",
      }),
    ).toHaveCount(0);
    await expect(
      dashboard.getByRole("heading", { name: "Challenges" }),
    ).toHaveCount(0);

    await page.reload();
    await expectActiveProductNavigation(page);
    await expect(
      page
        .getByRole("region", { name: "Dashboard-Zonen" })
        .getByRole("heading", { name: "Challenges" }),
    ).toHaveCount(0);
  });

  test("keeps Inventory and Wishlist reachable without Entertainment entry points", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setManualProfile(page);
    await page.goto("/life");

    await expectActiveProductNavigation(page);
    await expect(
      page.locator("main").getByRole("link", { name: "Entertainment", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator("main").getByRole("button", { name: /media/i }),
    ).toHaveCount(0);

    const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });
    await navigation.getByRole("link", { name: "Wishlist", exact: true }).click();
    await expect(page).toHaveURL(/\/life\/inventory\?view=wishlist$/);
    await expect(
      page.getByRole("heading", { name: "Inventory & Wishlist", exact: true }),
    ).toBeVisible();

    const lifeContext = page.getByRole("navigation", { name: "Life context" });
    await expect(
      lifeContext.getByRole("link", { name: "Inventory", exact: true }),
    ).toBeVisible();
    await expect(
      lifeContext.getByRole("link", { name: "Wishlist", exact: true }),
    ).toBeVisible();
    await expect(
      lifeContext.getByRole("link", { name: "Entertainment", exact: true }),
    ).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/life\/inventory\?view=wishlist$/);
    await expectActiveProductNavigation(page);
    await expect(
      page.getByRole("heading", { name: "Inventory & Wishlist", exact: true }),
    ).toBeVisible();
  });
});
