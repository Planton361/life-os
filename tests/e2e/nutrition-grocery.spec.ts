import { expect, test, type Page } from "@playwright/test";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;

    return {
      delta: Math.max(documentWidth, bodyWidth) - viewportWidth,
      documentWidth,
      bodyWidth,
      viewportWidth,
    };
  });

  expect(
    overflow.delta,
    `horizontal overflow detected: ${JSON.stringify(overflow)}`,
  ).toBeLessThanOrEqual(1);
}

test.describe("Nutrition grocery workflow", () => {
  test("renders to-buy, in-stock, must-list, copy and local review", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: playwrightBaseUrl,
    });
    await page.goto("/nutrition/grocery");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/nutrition\/grocery$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Grocery" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Muss noch geholt werden" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ist vorhanden" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Meal Availability" }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Must-have List" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Receipt Inbox" }),
    ).toBeVisible();
    await expect(page.getByText("To buy")).toBeVisible();
    await expect(page.getByText("From must-list")).toBeVisible();
    await expect(
      page.getByText("Receipt parsing stub - review required"),
    ).toBeVisible();
    await expect(page.getByAltText(/grocery placeholder/i).first()).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Copy shopping text" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review receipt" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add accepted items to pantry" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Review receipt" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add item" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("keeps grocery and meal planner availability usable on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/nutrition/grocery");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { level: 1, name: "Grocery" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Muss noch geholt werden" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/nutrition/meal-planner");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { level: 1, name: "Meal Planner" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Available|Partial|Missing/).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View grocery signal" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
