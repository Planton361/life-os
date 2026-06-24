import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";

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

async function isPartiallyVisible(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) {
    return false;
  }

  return (
    box.x < viewport.width &&
    box.x + box.width > 0 &&
    box.y < viewport.height &&
    box.y + box.height > 0
  );
}

async function saveScreenshot(page: Page, outputPath: string) {
  await mkdir(outputPath, { recursive: true });
  await page.screenshot({
    fullPage: false,
    path: join(outputPath, `dashboard-${page.viewportSize()?.width}x${page.viewportSize()?.height}.png`),
  });
}

test.describe("Dashboard viewport QA", () => {
  test("renders the V5 dashboard in a 2560x1440 viewport", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeAttached();

    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText(/Good (morning|afternoon|evening), Anton/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Daily Control" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today Agenda" })).toBeVisible();

    const antiRot = page.getByRole("heading", {
      name: "Anti-Rot Actions / Bad Habit Reset Row",
    });
    const challenges = page.getByRole("heading", { name: "Challenges" });
    const bottomZoneVisible =
      (await isPartiallyVisible(page, antiRot)) ||
      (await isPartiallyVisible(page, challenges));

    expect(bottomZoneVisible).toBe(true);
    await expectNoHorizontalOverflow(page);
    await saveScreenshot(page, testInfo.outputPath("screenshots"));
  });

  test("captures an optional 1440x900 desktop screenshot", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Today Agenda" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await saveScreenshot(page, testInfo.outputPath("screenshots"));
  });
});
