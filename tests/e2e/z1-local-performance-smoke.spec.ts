import { expect, type Page, test } from "@playwright/test";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

type RouteMeasurement = {
  domContentLoadedMs: number;
  domInteractiveMs: number;
  route: string;
  transferSize: number;
};

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

async function measureRoute(page: Page, route: string): Promise<RouteMeasurement> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.waitForLoadState("networkidle");

  return page.evaluate((currentRoute) => {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    return {
      domContentLoadedMs: entry?.domContentLoadedEventEnd ?? 0,
      domInteractiveMs: entry?.domInteractive ?? 0,
      route: currentRoute,
      transferSize: entry?.transferSize ?? 0,
    };
  }, route);
}

test.describe("Z1 canonical local performance smoke", () => {
  test("keeps active selected-Manual route navigation responsive without writes", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    if (process.env.LIFE_OS_E2E_RUNTIME !== "CANONICAL_TARGET") {
      throw new Error(
        "This read-only performance smoke must run through the canonical Target runtime.",
      );
    }

    await page.setViewportSize({ width: 1920, height: 1080 });
    await setManualProfile(page);
    const measurements: RouteMeasurement[] = [];

    measurements.push(await measureRoute(page, "/dashboard"));
    await expect(page.getByRole("heading", { name: "Daily Control" })).toBeVisible();
    await page.getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { name: "Inbox", exact: true })
      .click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();

    for (const route of [
      "/today",
      "/calendar",
      "/portfolio",
      "/resources",
      "/health",
      "/nutrition",
      "/coding",
      "/education",
      "/work",
      "/life",
      "/life/journal",
      "/life/notes",
      "/life/inventory",
      "/life/inventory?view=wishlist",
      "/settings",
    ]) {
      measurements.push(await measureRoute(page, route));
    }

    measurements.push(await measureRoute(page, "/calendar"));
    const calendar = page.locator('[data-calendar-section="week-grid"]');
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(calendar).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Day", exact: true })).toBeVisible();

    await testInfo.attach("local-route-measurements.json", {
      body: JSON.stringify(measurements),
      contentType: "application/json",
    });
  });
});
