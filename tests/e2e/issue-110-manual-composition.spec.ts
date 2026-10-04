import { expect, test } from "@playwright/test";
import { expectHybridGoalLayout } from "./support/goal-workbench-layout";

// Explicitly supplied, existing test-profile session; no technical sign-up,
// database seeding, runtime startup or credential logging in this proof.
const authState = process.env.LIFE_OS_110_AUTH_STATE;
const fixtures = {
  projectContext: process.env.LIFE_OS_110_PROJECT_CONTEXT,
  projectNoContext: process.env.LIFE_OS_110_PROJECT_NO_CONTEXT,
  projectLong: process.env.LIFE_OS_110_PROJECT_LONG,
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
        await expect(
          page.locator('.life-os-sidebar a[aria-current="page"]').first(),
        ).toBeAttached();
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
        if (name.startsWith("project")) {
          const rail = page.getByRole("complementary", {
            name: "Project Context Rail",
            exact: true,
          });
          if (name === "projectNoContext") await expect(rail).toHaveCount(0);
          if (name === "projectContext") {
            await expect(rail).toHaveCount(1);
            const r = (await rail.boundingBox())!;
            const w = (await page
              .locator("[data-project-workspace]")
              .boundingBox())!;
            if (canvas >= 880) expect(r.x).toBeGreaterThan(w.x + w.width / 2);
            else
              expect(r.y).toBeGreaterThan(
                (await page
                  .getByRole("region", {
                    name: "Tasks & Progress",
                    exact: true,
                  })
                  .boundingBox())!.y,
              );
          }
          if (name === "projectLong") {
            expect(
              await root.locator("[data-project-task]").count(),
            ).toBeGreaterThanOrEqual(30);
            expect(
              await page.evaluate(() => document.documentElement.scrollHeight),
            ).toBeGreaterThan(viewport.height);
            expect(
              await root
                .locator("[data-project-task-list]")
                .evaluateAll((nodes) =>
                  nodes.some((e) =>
                    ["auto", "scroll"].includes(getComputedStyle(e).overflowY),
                  ),
                ),
            ).toBe(false);
          }
          const first = root.locator("[data-project-task]").first();
          await expect(first).toBeVisible();
          const actions = first.locator('[aria-label^="Aktionen:"]');
          const bounds = await actions
            .locator(":scope > :is(a, button, form)")
            .evaluateAll((nodes) =>
              nodes.map((e) => e.getBoundingClientRect().toJSON()),
            );
          expect(bounds.length).toBeGreaterThanOrEqual(2);
          expect(bounds.length).toBeLessThanOrEqual(3);
          for (const b of bounds)
            expect(b.right).toBeLessThanOrEqual(viewport.width);
          // Existing direct controls remain interactive. Cancel does not mutate.
          await first
            .getByRole("button", { name: "Bearbeiten", exact: true })
            .click();
          await expect(page.getByRole("dialog")).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
        if (name === "goal") await expectHybridGoalLayout(page);
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

  test("open Task editor survives the real viewport transitions", async ({
    page,
  }, info) => {
    expect(fixtures.projectContext).toMatch(/^[0-9a-f-]{36}$/i);
    await page
      .context()
      .addCookies([
        {
          name: "life_os_profile",
          value: "manual",
          url: info.project.use.baseURL!,
        },
      ]);
    await page.goto(`/projects/${fixtures.projectContext}`);
    await page
      .locator("[data-project-task]")
      .first()
      .getByRole("button", { name: "Bearbeiten", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Task bearbeiten",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const title = dialog.getByLabel("Titel", { exact: true });
    const draft = `#110 unsaved viewport draft ${Date.now()}`;
    await title.fill(draft);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(dialog).toBeVisible();
      await expect(title).toHaveValue(draft);
      expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(
        viewport.width,
      );
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("Manual Dashboard Quick Thought uses the same real control and survives reload", async ({
    page,
  }, info) => {
    await page.context().addCookies([
      {
        name: "life_os_profile",
        value: "manual",
        url: info.project.use.baseURL!,
      },
    ]);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard");
    const title = `#110 viewport capture ${Date.now()}`;
    const quick = page.locator(".dashboard-quick");
    await quick
      .getByRole("textbox", { name: "Quick Thought", exact: true })
      .fill(title);
    await quick
      .getByRole("button", { name: "In Inbox speichern", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "In der Inbox gespeichert." }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { name: "Inbox", exact: true })
      .click();
    await expect(
      page.locator("#inbox-page").getByText(title, { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.locator("#inbox-page").getByText(title, { exact: true }),
    ).toBeVisible();
    // The uniquely named proof item is deliberately left in the test profile.
  });
});
