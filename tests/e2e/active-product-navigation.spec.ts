import { expect, type Page, test } from "@playwright/test";

const primary = [
  ["Dashboard", "/dashboard"],
  ["Inbox", "/inbox"],
  ["Today", "/today"],
  ["Calendar", "/calendar"],
  ["Portfolio", "/portfolio"],
  ["Resources", "/resources"],
] as const;
const domain = [
  ["Health & Fitness Area öffnen", "/health"],
  ["Mental Health", "/health/mental"],
  ["Habits", "/health/habits"],
  ["Running Tracker", "/health/running"],
  ["Strength Tracker", "/health/strength"],
  ["Ernährung Area öffnen", "/nutrition"],
  ["Essensplan", "/nutrition/meal-planner"],
  ["Rezepte", "/nutrition/recipes"],
  ["Einkauf", "/nutrition/grocery"],
  ["Journal", "/life/journal"],
  ["Settings", "/settings"],
] as const;
const forbidden =
  /^(?:\/(?:coding|education|work|challenges|shop)(?:\/|\?|$)|\/life(?:$|\?)|\/life\/(?:notes|inventory|entertainment)(?:\/|\?|$))/;
const sizes = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 390, height: 844 },
];

async function profile(page: Page, value: "demo" | "empty" | "manual") {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value,
      httpOnly: true,
      sameSite: "Lax",
      url: test.info().project.use.baseURL!,
    },
  ]);
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydrat/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

async function expectNavigation(page: Page) {
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("heading")).toHaveText([
    "Health & Fitness",
    "Ernährung",
    "Personal",
  ]);
  for (const [, href] of [...primary, ...domain]) {
    await expect(nav.locator(`a[href="${href}"]`)).toBeVisible();
  }
  const links = await nav
    .locator("a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  expect(links.filter((href) => forbidden.test(href))).toEqual([]);
  await expect(nav.locator('a[href="/coding/skill-map"]')).toHaveCount(0);
  return nav;
}

async function expectNoLegacyEntryPoints(page: Page) {
  const hrefs = await page
    .locator("#main-content a[href]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  expect(hrefs.filter((href) => forbidden.test(href))).toEqual([]);
}

async function expectBounds(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const bounds = await nav.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const links = Array.from(element.querySelectorAll("a")).map((link) =>
      link.getBoundingClientRect(),
    );
    return {
      horizontal: links.every(
        (link) => link.left >= box.left && link.right <= box.right + 1,
      ),
      noScroll: element.scrollHeight <= element.clientHeight + 1,
    };
  });
  expect(bounds.horizontal).toBe(true);
  expect(bounds.noScroll).toBe(true);
}

test.describe("Product scope consolidation navigation", () => {
  for (const size of sizes) {
    test(`clicks all active navigation and Portfolio children at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const errors = collectErrors(page);
      await page.setViewportSize(size);
      await profile(page, "manual"); // No auth/DB needed: shared navigation + honest auth-blocked reads.
      await page.goto("/dashboard");
      await expectNavigation(page);
      for (const [, href] of [...primary, ...domain]) {
        const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
        await nav.locator(`a[href="${href}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        await expect(page.locator("#main-content h1").first()).toBeVisible();
        await expectNoLegacyEntryPoints(page);
      }
      for (const type of ["tasks", "projects", "goals", "skills"]) {
        const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
        const portfolio = nav.locator('a[href="/portfolio"]');
        await portfolio.focus();
        await portfolio.press("ArrowRight");
        const child = nav.locator(`a[href="/portfolio?type=${type}"]`);
        await expect(child).toBeVisible();
        const box = await child.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
        await child.click();
        await expect(page).toHaveURL(new RegExp(`/portfolio\\?type=${type}$`));
      }
      const nav = await expectNavigation(page);
      const portfolio = nav.locator('a[href="/portfolio"]');
      await portfolio.focus();
      await portfolio.press("ArrowRight");
      await page.keyboard.press("Escape");
      await expect(portfolio).toBeFocused();
      await expect(portfolio).toHaveAttribute("aria-expanded", "false");
      await nav.locator('a[href="/life/journal"]').click();
      await nav.locator('a[href="/resources"]').click();
      await expect(page).toHaveURL(/\/resources$/);
      await nav.locator('a[href="/life/journal"]').click();
      await page.reload();
      await expectNavigation(page);
      await expectNoLegacyEntryPoints(page);
      await expectBounds(page);
      if (size.width < 1024) {
        await page.locator('aside a[href="#main-content"]').click();
        await expect(page.locator("#main-content")).toBeFocused();
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: test.info().outputPath(`navigation-${size.width}.png`),
        fullPage: true,
      });
      await nav.screenshot({
        path: test.info().outputPath(`sidebar-${size.width}.png`),
      });
      expect(errors).toEqual([]);
    });
  }

  test("preserves navigation in Demo and Empty with no active legacy cross-links", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    await page.setViewportSize(sizes[0]);
    for (const mode of ["demo", "empty"] as const) {
      await profile(page, mode);
      for (const route of [
        "/dashboard",
        "/calendar",
        "/portfolio",
        "/portfolio?type=projects",
        "/portfolio?type=skills",
        "/life/journal",
      ]) {
        await page.goto(route);
        await expectNavigation(page);
        await expectNoLegacyEntryPoints(page);
      }
      await page.reload();
      await expectNavigation(page);
    }
    expect(errors).toEqual([]);
  });

  test("retains direct legacy routes in Demo and auth-blocked Manual", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = collectErrors(page);
    await page.setViewportSize(sizes[0]);
    for (const mode of ["demo", "manual"] as const) {
      await profile(page, mode);
      for (const route of [
        "/coding",
        "/coding/repositories",
        "/coding/skill-map",
        "/coding/knowledge",
        "/education",
        "/education/literature",
        "/work",
        "/work/wiki",
        "/life",
        "/life/notes",
        "/life/inventory",
        "/life/inventory?view=wishlist",
      ]) {
        const response = await page.goto(route);
        expect(response?.status()).toBe(200);
        await expect(page.locator("#main-content h1").first()).toBeVisible();
        await expectNavigation(page);
      }
      await page.reload();
      await expectNavigation(page);
    }
    expect(errors).toEqual([]);
  });
});
