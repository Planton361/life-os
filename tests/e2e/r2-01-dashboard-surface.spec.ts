import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function assertBounds(page: Page, desktop: boolean) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  if (desktop)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight - innerHeight,
      ),
    ).toBeLessThanOrEqual(1);
  const problems = await page
    .locator(".dashboard-main-grid")
    .evaluate((grid) => {
      const cards = [
        ...grid.querySelectorAll(
          ":scope > section, :scope > div > section, :scope > div > div > a, :scope > div > div > section",
        ),
      ];
      const bounds = cards.map((card) => ({
        name:
          card.getAttribute("aria-label") ??
          card.getAttribute("aria-labelledby"),
        rect: card.getBoundingClientRect(),
      }));
      return bounds.flatMap((a, i) =>
        bounds
          .slice(i + 1)
          .filter(
            (b) =>
              Math.min(a.rect.right, b.rect.right) -
                Math.max(a.rect.left, b.rect.left) >
                1 &&
              Math.min(a.rect.bottom, b.rect.bottom) -
                Math.max(a.rect.top, b.rect.top) >
                1,
          )
          .map((b) => `${a.name} overlaps ${b.name}`),
      );
    });
  expect(problems).toEqual([]);
  for (const selector of [
    ".dashboard-mood",
    '[aria-labelledby="running-tracker-title"]',
    '[aria-labelledby="meals-today-title"]',
  ]) {
    const card = page.locator(selector);
    expect(
      await card.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return [...el.querySelectorAll("button, article, form")].every(
          (child) => child.getBoundingClientRect().bottom <= bounds.bottom + 1,
        );
      }),
      `${selector} clips its contents`,
    ).toBe(true);
  }
  const mealOverflow = await page.locator('[aria-labelledby="meals-today-title"] article').evaluateAll(cards => cards.flatMap(card => {
    const bounds = card.getBoundingClientRect();
    return [...card.querySelectorAll("a, h3, span")].filter(el => {
      const child = el.getBoundingClientRect();
      return child.bottom > bounds.bottom + 1 || child.right > bounds.right + 1;
    }).map(el => el.textContent);
  }));
  expect(mealOverflow).toEqual([]);
  for (const selector of [".habit-slots", ".portfolio-slots"]) {
    const grid = page.locator(selector);
    expect(
      await grid.evaluate((el) =>
        [...el.children].every((child) => {
          const a = el.getBoundingClientRect();
          const b = child.getBoundingClientRect();
          return (
            b.left >= a.left - 1 &&
            b.right <= a.right + 1 &&
            b.bottom <= a.bottom + 1
          );
        }),
      ),
    ).toBe(true);
  }
}

for (const viewport of [
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  test(`R2-01 full dashboard ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Today Agenda" }),
    ).toBeVisible();
    await assertBounds(page, viewport.width >= 1800);
    const habits = page.locator(".dashboard-habits");
    for (const period of ["Morning", "Midday", "Evening"]) {
      await habits.getByRole("button", { name: period, exact: true }).click();
      await expect(
        habits.getByRole("button", { name: period, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".habit-slots > *")).toHaveCount(8);
    }
    await page.reload();
    await expect(
      habits.getByRole("button", { name: "Evening", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const portfolio = page.locator(".dashboard-portfolio");
    for (const view of ["Project View", "Goal View", "Skill View"]) {
      await portfolio.getByRole("button", { name: view, exact: true }).click();
      await expect(
        portfolio.getByRole("button", { name: view, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".portfolio-slots > *")).toHaveCount(4);
      await assertBounds(page, viewport.width >= 1800);
    }
    await expect(page.locator("[data-agenda-hour-lines] > div")).toHaveCount(
      19,
    );
    await page.screenshot({
      path: testInfo.outputPath("dashboard-full.png"),
      fullPage: true,
    });
    for (const view of ["Day", "Week", "Month"]) {
      await page
        .locator(".dashboard-agenda")
        .getByRole("button", { name: view, exact: true })
        .click();
      await expect(page.locator(".dashboard-agenda").getByRole("button", { name: view, exact: true })).toHaveAttribute("aria-pressed", "true");
      if (view !== "Day") await expect(page.locator(`[data-agenda-view="${view}"]`)).toBeVisible();
      await assertBounds(page, viewport.width >= 1800);
    }
    expect(errors).toEqual([]);
  });
}

test("R2-01 Manual habit increments preserve selected period and canonical quantity after reload", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "r2-habit", Date.now());
  await page.goto("/dashboard");
  const habits = page.locator(".dashboard-habits");
  for (const [period, target, increment, unit] of [
    ["Morning", "8", "1", "pages"],
    ["Midday", "2000", "250", "ml"],
    ["Evening", "2", "0.5", "h"],
  ]) {
    const name = `R2 ${period} ${Date.now()}`;
    await habits.getByRole("button", { name: period, exact: true }).click();
    await expect(
      habits.getByRole("button", { name: period, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await habits.getByRole("button", { name: /Add Habit/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill(name);
    await dialog.getByLabel("Target", { exact: true }).fill(target);
    await dialog.getByLabel("Increment", { exact: true }).fill(increment);
    await dialog.getByLabel(/^Unit/).fill(unit);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const card = habits
      .getByRole("article")
      .filter({ has: page.getByRole("button", { name: `${name} erhöhen`, exact: true }) });
    await expect(dialog).not.toBeVisible();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /erhöhen/ }).click();
    await expect(
      habits.getByRole("button", { name: period, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(card).toContainText(
      unit === "h" ? "0.5 / 2 h" : `${increment} / ${target} ${unit}`,
    );
    await page.reload();
    await expect(card).toContainText(
      unit === "h" ? "0.5 / 2 h" : `${increment} / ${target} ${unit}`,
    );
    await card
      .getByRole("button", { name: /Letzten Eintrag rückgängig machen/ })
      .click();
    await expect(card).toContainText(`0 / ${target} ${unit}`);
    await page.reload();
    await expect(card).toContainText(
      unit === "h" ? "0 / 2 h" : `0 / ${target} ${unit}`,
    );
    await expect(
      habits.getByRole("button", { name: period, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  const mood = page.locator(".dashboard-mood");
  await expect(mood.getByRole("button")).toHaveCount(6);
  await mood.getByRole("button", { name: "Happy", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Mood gespeichert." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    mood.getByRole("button", { name: "Happy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await assertBounds(page, true);
  const notice = page.getByRole("button", {
    name: "Benachrichtigung schließen",
  });
  while (await notice.count()) await notice.first().click();
  await page.screenshot({
    path: testInfo.outputPath("manual-dashboard.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 2560, height: 1440 });
  await assertBounds(page, true);
  await page.screenshot({
    path: testInfo.outputPath("manual-dashboard-primary.png"),
    fullPage: true,
  });
  await habits.getByRole("button", { name: /Add Habit/i }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Invalid target proof");
  await page
    .getByRole("dialog")
    .getByLabel("Target", { exact: true })
    .fill("-1");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("alert"),
  ).toContainText("Bitte prüfe");
  await page.reload();
  await expect(habits.getByRole("article")).toHaveCount(1);
  await expect(
    habits.getByRole("button", { name: "Evening", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
