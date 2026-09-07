import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import { assertHealthWorkspace } from "./support/health-workspace-proof";
const routes = ["mental", "habits", "running", "strength"];
async function saved(page: Page, button: ReturnType<Page["getByRole"]>) {
  const before = new URL(page.url()).searchParams.get("trainingUpdate");
  await button.click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("trainingUpdate"))
    .not.toBe(before);
}

test("R2-05 empty and growing Health workspaces occupy the available viewport", async ({
  page,
}, info) => {
  test.setTimeout(360000);
  page.setDefaultTimeout(10000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (["error", "warning"].includes(e.type())) errors.push(e.text());
  });
  await signUpTechnicalManualUser(page, "health-layout", Date.now());
  await page.goto("/health/habits");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Zusammenfassung", exact: true }),
  ).toBeVisible();
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 3840, height: 2160 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const name of routes) {
      await page.goto(`/health/${name}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: info.outputPath(`empty-${name}-${size.width}.png`),
        fullPage: true,
      });
      if (size.width >= 1280)
        await info.attach(`${name}-${size.width}-bounds`, {
          body: JSON.stringify(await assertHealthWorkspace(page)),
          contentType: "application/json",
        });
      else
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(size.width);
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  // Populate through existing real controls. This is layout pressure, not a new data path.
  for (let i = 1; i <= 8; i++) {
    await page.goto("/dashboard?habitWindow=Morning");
    await page
      .getByRole("region", { name: "Habit Trackers" })
      .getByRole("button", { name: /Add habit/i })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill(`Layout Habit ${i}`);
    await dialog.getByLabel("Target", { exact: true }).fill("1");
    await dialog.getByLabel("Increment", { exact: true }).fill("1");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  for (let i = 1; i <= 12; i++) {
    await page.goto("/health/running");
    const run = page.getByTestId("running-session-form");
    await run.getByLabel("Distanz (km)", { exact: true }).fill("5");
    await run.getByLabel("Dauer (Minuten)", { exact: true }).fill("30");
    await saved(
      page,
      run.getByRole("button", { name: "Lauf speichern", exact: true }),
    );
    await page.goto("/health/strength");
    await page.getByText("Neue Übung", { exact: true }).click();
    const create = page.locator("details").filter({
      has: page.getByRole("button", { name: "Übung erstellen", exact: true }),
    });
    await create.getByLabel("Name", { exact: true }).fill(`Layout Übung ${i}`);
    await create.getByLabel("Rücken", { exact: true }).check();
    await saved(
      page,
      create.getByRole("button", { name: "Übung erstellen", exact: true }),
    );
  }
  for (let i = 1; i <= 8; i++) {
    await page.goto("/health/strength");
    await page
      .locator("summary")
      .filter({ hasText: /^Freie Session starten$/ })
      .click();
    await saved(
      page,
      page
        .getByTestId("free-strength-session")
        .getByRole("button", { name: "Freie Session starten", exact: true }),
    );
  }
  for (const [name, selectors] of [
    ["habits", ["[data-habits-section=history]"]],
    ["running", [".health-run-history > div"]],
    [
      "strength",
      [
        ".health-strength-history > div",
        ".health-exercise-library > div:last-child",
      ],
    ],
  ] as const) {
    await page.goto(`/health/${name}`);
    await page.reload();
    await assertHealthWorkspace(page);
    for (const selector of selectors) {
      const list = page.locator(selector);
      expect(
        await list.evaluate((e) => e.scrollHeight > e.clientHeight),
        `${name}: growing list scrolls internally`,
      ).toBe(true);
      await list.evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      expect(await list.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
      await expect(list.locator(":scope > :last-child")).toBeInViewport();
    }
    await page.screenshot({
      path: info.outputPath(`growing-${name}-1920.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
