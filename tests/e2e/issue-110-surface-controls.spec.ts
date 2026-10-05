import { expect, test, type Page } from "@playwright/test";

const authState = process.env.LIFE_OS_110_AUTH_STATE;
test.use({
  storageState: authState,
  actionTimeout: 15_000,
  navigationTimeout: 15_000,
});
test.skip(!authState, "Explicit existing read-only profile session required");

async function assertBounds(page: Page) {
  expect(
    await page.evaluate(
      () =>
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}
async function clickLinks(
  page: Page,
  route: string,
  setup?: () => Promise<void>,
  selector = "main a[href]",
) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await setup?.();
  const links = await page
    .locator(selector)
    .evaluateAll((es) => [
      ...new Set(
        es
          .filter((e) => e.getBoundingClientRect().width)
          .map((e) => e.getAttribute("href")!),
      ),
    ]);
  for (const href of links) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await setup?.();
    await page
      .locator("main a")
      .filter({ visible: true })
      .and(page.locator(`a[href=${JSON.stringify(href)}]`))
      .first()
      .click();
    if (href.startsWith("/"))
      await expect(page).toHaveURL(
        new URL(href, "http://localhost:3000").toString(),
      );
    await expect(page.locator("#main-content")).not.toContainText(
      "This page could not be found",
    );
    await assertBounds(page);
  }
  return links;
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
]) {
  test(`#110 read-only Manual surface controls ${viewport.width}`, async ({
    page,
  }, info) => {
    test.setTimeout(300_000);
    await page.setViewportSize(viewport);
    await page.context().addCookies([
      {
        name: "life_os_profile",
        value: "manual",
        url: info.project.use.baseURL!,
      },
    ]);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" || /hydration/i.test(m.text()))
        errors.push(m.text());
    });
    const inventory: Record<string, unknown> = {};
    inventory.dashboard = await clickLinks(page, "/dashboard");
    for (const name of ["Goal View", "Skill View", "Project View"]) {
      const setup = async () => {
        await page
          .locator(".dashboard-portfolio")
          .getByRole("button", { name, exact: true })
          .click();
      };
      inventory[name] = await clickLinks(
        page,
        "/dashboard",
        setup,
        ".dashboard-portfolio a[href]",
      );
    }
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    for (const group of [
      { root: ".dashboard-agenda", names: ["Week", "Month", "Day"] },
      { root: ".dashboard-habits", names: ["Midday", "Evening", "Morning"] },
      {
        root: '[aria-labelledby="running-tracker-title"]',
        names: ["Muscle", "Running"],
      },
    ])
      for (const name of group.names) {
        await page
          .locator(group.root)
          .getByRole("button", { name, exact: true })
          .click();
        await assertBounds(page);
      }
    await page
      .getByRole("button", { name: "+ Add habit", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    // Ordinary profile writes are intentionally never submitted.
    inventory.writeBoundary =
      "Quick Thought/Mood/Habit writes are proved in the separate isolated-user spec; ordinary data remains unchanged";
    inventory.today = await clickLinks(page, "/today");
    inventory.portfolio = await clickLinks(page, "/portfolio");
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    for (const name of [
      "Previous period",
      "Next period",
      "Today",
      "Day",
      "Week",
      "Month",
      "Week",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await assertBounds(page);
    }
    const slots = await page
      .getByRole("button", { name: /^Select free slot/ })
      .evaluateAll((es) => es.map((e) => e.getAttribute("aria-label")!));
    for (const name of slots) {
      await page.getByRole("button", { name, exact: true }).click();
      await assertBounds(page);
    }
    inventory.calendarSlots = slots;
    // Inspect queue items without committing scheduling changes.
    const queue = page.locator(
      '[data-calendar-section="planning-queue"] button',
    );
    for (const button of await queue.all()) {
      if (await button.isVisible()) {
        await button.click();
        await assertBounds(page);
      }
    }
    for (const route of ["dashboard", "today", "calendar", "portfolio"]) {
      await page.goto(`/${route}`, { waitUntil: "domcontentloaded" });
      await assertBounds(page);
      const path = info.outputPath(`manual-${route}-${viewport.width}.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path,
        fullPage: true,
        style: "nextjs-portal{display:none!important}",
      });
      await info.attach(route, { path, contentType: "image/png" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertBounds(page);
    }
    await info.attach("control-inventory", {
      body: JSON.stringify(inventory, null, 2),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
  });
}
