import { expect, test } from "@playwright/test";
import { expectHybridGoalLayout } from "./support/goal-workbench-layout";

// Existing profile is read-only. Synthetic Project states are proved separately.
const authState = process.env.LIFE_OS_110_AUTH_STATE;
const fixtures = {
  goal: process.env.LIFE_OS_110_GOAL,
  skill: process.env.LIFE_OS_110_SKILL,
};
const viewports = [
  { name: "mac", width: 769, height: 413, deviceScaleFactor: 2 },
  { name: "gigabyte", width: 2560, height: 589, deviceScaleFactor: 1 },
  { name: "asus", width: 2560, height: 639, deviceScaleFactor: 1.5 },
  { name: "desktop", width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
  { name: "4k", width: 3840, height: 2160, deviceScaleFactor: 1 },
];

test.describe("#110 existing authenticated Manual test profile", () => {
  test.skip(
    !authState,
    "Existing test-profile session must be explicitly provided; signup/runtime guard stays intact.",
  );
  test.use({ storageState: authState });

  for (const viewport of viewports) {
    test(`real detail matrix ${viewport.name}`, async ({ browser }, info) => {
      test.setTimeout(120_000);
      for (const [name, id] of Object.entries(fixtures)) {
        expect(
          id,
          `Provide an existing ${name} fixture from the test profile`,
        ).toMatch(/^[0-9a-f-]{36}$/i);
      }
      const context = await browser.newContext({
        storageState: authState,
        viewport,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      await context.addCookies([
        {
          name: "life_os_profile",
          value: "manual",
          url: info.project.use.baseURL!,
        },
      ]);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" || /hydration/i.test(m.text()))
          errors.push(m.text());
      });
      for (const [name, id] of Object.entries(fixtures)) {
        const kind = name.startsWith("project") ? "projects" : `${name}s`;
        await page.goto(`/${kind}/${id}`);
        const root = page.locator(
          name === "goal"
            ? '[data-goal-outcome="workbench"]'
            : name === "skill"
              ? "[data-skill-development]"
              : '[data-entity-workbench="project"]',
        );
        await expect(root).toBeVisible();
        const canvas = await page
          .locator(".life-os-canvas")
          .evaluate((e) => e.getBoundingClientRect().width);
        expect(
          await page.evaluate(
            () =>
              Math.max(
                document.body.scrollWidth,
                document.documentElement.scrollWidth,
              ) - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        const frame = page.locator(
          name === "goal"
            ? ".entity-composition"
            : name === "skill"
              ? ".skill-composition"
              : "[data-project-frame]",
        );
        const fill = await frame.evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--composition-fill").trim(),
        );
        expect(fill).toBe(viewport.height >= 720 && canvas >= 880 ? "1" : "0");
        if (name === "goal") {
          await expectHybridGoalLayout(page);
          await root
            .getByRole("button", { name: "Planung bearbeiten", exact: true })
            .click();
          await expect(root).toHaveAttribute(
            "data-goal-planning-mode",
            "editing",
          );
          await root
            .getByRole("button", { name: "Fertig", exact: true })
            .click();
          await expect(root).toHaveAttribute("data-goal-planning-mode", "read");
          const options = root.getByRole("button", {
            name: "Weitere Optionen",
            exact: true,
          });
          await options.click();
          await expect(options).toHaveAttribute("aria-expanded", "true");
          await page.keyboard.press("Escape");
          await expect(options).toHaveAttribute("aria-expanded", "false");
        }
        if (name === "skill") {
          await expect(
            root.getByRole("region", { name: "Lernweg", exact: true }),
          ).toBeVisible();
          await expect(root.locator("[data-skill-primary]")).not.toContainText(
            "Entwicklungsfokus festlegen",
          );
          await root
            .getByRole("link", { name: "Skill verwalten", exact: true })
            .click();
          await expect(
            root.locator("#skill-management details").first(),
          ).toHaveAttribute("open", "");
          await page.keyboard.press("Escape");
        }
        const path = info.outputPath(`${name}-${viewport.name}.png`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path,
          fullPage: true,
          style: "nextjs-portal {display:none!important}",
        });
        await info.attach(name, { path, contentType: "image/png" });
        await page.reload();
        await expect(root).toBeVisible();
      }
      expect(errors).toEqual([]);
      await context.close();
    });
  }
});
