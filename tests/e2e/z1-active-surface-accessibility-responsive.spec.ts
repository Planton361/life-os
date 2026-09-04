import { expect, type Page, test } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

const activeSurfaceRoutes = [
  "/dashboard",
  "/inbox",
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
] as const;

async function setProfile(page: Page, profile: "empty" | "manual") {
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

async function expectNoShellOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;

    return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth;
  });

  expect(overflow, "unexpected horizontal shell overflow").toBeLessThanOrEqual(1);
}

async function expectNamedVisibleControls(page: Page) {
  const unnamedButtons = await page.locator("button:visible").evaluateAll((buttons) =>
    buttons
      .filter((button) => {
        const label = button.getAttribute("aria-label");
        const labelledBy = button.getAttribute("aria-labelledby");
        const text = button.textContent?.trim();

        return !label && !labelledBy && !text;
      })
      .map((button) => button.outerHTML),
  );

  expect(unnamedButtons).toEqual([]);
}

async function expectSurface(page: Page, route: string) {
  await page.goto(route);
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expectNoShellOverflow(page);
  await expectNamedVisibleControls(page);
}

async function createTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.getByText("Task erstellt.", { exact: true })).toBeVisible();
}

test.describe("Z1 active-surface accessibility and responsive smoke", () => {
  test("keeps every active surface readable at standard desktop and mobile widths", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await setProfile(page, "empty");

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);

      for (const route of activeSurfaceRoutes) {
        await expectSurface(page, route);
      }
    }
  });

  test("preserves the V5 cockpit and Calendar planning surfaces at 4K", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await page.setViewportSize({ width: 3840, height: 2160 });

    await expectSurface(page, "/dashboard");
    await expect(page.getByRole("heading", { name: "Daily Control" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today Agenda" })).toBeVisible();

    await expectSurface(page, "/calendar");
    await expect(page.locator('[data-calendar-section="week-grid"]')).toBeVisible();
    await expect(page.locator('[data-calendar-section="planning-queue"]')).toBeVisible();
  });

  test("keeps shell navigation, prepared state and mobile Calendar inspector scheduling keyboard-accessible", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const title = `Z1 accessibility task ${stamp}`;

    await page.setViewportSize({ width: 390, height: 844 });
    await setProfile(page, "empty");
    await page.goto("/dashboard");

    await expect(page.locator("[data-prepared-command-search]")).toContainText("Prepared");
    await expect(page.getByRole("search")).toHaveCount(0);

    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await skipLink.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await expect(page.getByRole("main")).toBeInViewport();

    await page.setViewportSize({ width: 1920, height: 1080 });
    const portfolio = page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { name: "Portfolio", exact: true });
    await portfolio.focus();
    await portfolio.press("ArrowDown");
    const portfolioPages = page.getByLabel("Portfolio Unterseiten");
    await expect(portfolioPages).toBeVisible();
    await expect(portfolioPages.getByRole("link", { name: "Tasks", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(portfolioPages).toHaveCount(0);
    await expect(portfolio).toBeFocused();

    await signUpTechnicalManualUser(page, "z1-a11y", stamp);
    await createTask(page, title);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/calendar");

    const queue = page.locator('[data-calendar-section="planning-queue"]');
    const queueItem = queue.getByRole("button", { name: new RegExp(title) });
    await queueItem.focus();
    await queueItem.press("Enter");
    const schedule = page
      .locator('[data-calendar-section="queue-schedule"]')
      .getByRole("form", { name: `${title} planen` });
    await expect(schedule).toBeVisible();
    await schedule.getByLabel("Weekday").fill(new Date().toISOString().slice(0, 10));
    await schedule.getByLabel("Start time").fill("09:00");
    await schedule.getByLabel("Duration").selectOption("30");
    const scheduleButton = schedule.getByRole("button", { name: "Schedule task" });
    await scheduleButton.focus();
    await scheduleButton.press("Enter");
    await expect(
      page.locator('[data-calendar-section="week-grid"]').getByRole("button", {
        name: new RegExp(title),
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.locator('[data-calendar-section="week-grid"]').getByRole("button", {
        name: new RegExp(title),
      }),
    ).toBeVisible();
  });
});
