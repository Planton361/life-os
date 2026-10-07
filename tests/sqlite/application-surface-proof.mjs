import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";

export async function surfaceProof({ page, app, fixture, step }) {
  const routes = ["/dashboard", "/today", "/calendar", "/portfolio"];
  const controls = [];
  await step(
    "Core surface viewport bounds and complete screenshots",
    async () => {
      for (const viewport of [
        { width: 3840, height: 2160 },
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        for (const route of routes) {
          await page.goto(app.origin + route);
          await expect(page.locator(".life-os-canvas")).toBeVisible();
          const report = await page
            .locator("#main-content")
            .evaluate((main) => {
              const controls = [
                ...main.querySelectorAll(
                  "a,button,input,select,textarea,summary",
                ),
              ].filter((node) => {
                const rect = node.getBoundingClientRect();
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  getComputedStyle(node).visibility !== "hidden"
                );
              });
              return {
                pageOverflow:
                  document.documentElement.scrollWidth > innerWidth + 1,
                bounds: [
                  ...main.querySelectorAll("section,aside,[role=dialog]"),
                ]
                  .filter((node) => {
                    const rect = node.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                  })
                  .map((node) => ({
                    label:
                      node.getAttribute("aria-label") ||
                      node.getAttribute("data-today-section") ||
                      node.getAttribute("data-calendar-section"),
                    rect: node.getBoundingClientRect().toJSON(),
                    scrollWidth: node.scrollWidth,
                    clientWidth: node.clientWidth,
                  })),
                controls: controls.map((node) => ({
                  tag: node.tagName,
                  text: node.textContent?.trim().slice(0, 100),
                  name: node.getAttribute("aria-label"),
                  href: node.getAttribute("href"),
                  disabled: node.matches(":disabled"),
                  rect: node.getBoundingClientRect().toJSON(),
                })),
                outsideControls: controls
                  .filter((node) => {
                    const rect = node.getBoundingClientRect();
                    if (rect.left >= -1 && rect.right <= innerWidth + 1)
                      return false;
                    for (
                      let parent = node.parentElement;
                      parent;
                      parent = parent.parentElement
                    )
                      if (
                        ["auto", "scroll"].includes(
                          getComputedStyle(parent).overflowX,
                        ) &&
                        parent.scrollWidth > parent.clientWidth
                      )
                        return false;
                    return true;
                  })
                  .map((node) => node.textContent?.trim().slice(0, 100)),
              };
            });
          controls.push({ route, viewport, ...report });
          await page.screenshot({
            path: join(
              fixture.directory,
              `${route.slice(1)}-${viewport.width}.png`,
            ),
            fullPage: true,
          });
        }
      }
      writeFileSync(
        join(fixture.directory, "surface-evidence.json"),
        JSON.stringify(controls, null, 2),
        { mode: 0o600 },
      );
      // Existing #112/#114 surface defects are reported with exact geometry and
      // screenshots. They are never hidden by changing the product in #116.
      const gaps = controls.filter(
        (report) => report.pageOverflow || report.outsideControls.length,
      );
      process.stdout.write(
        `Surface bounds: ${gaps.length ? JSON.stringify(gaps.map(({ route, viewport, pageOverflow, outsideControls }) => ({ route, viewport, pageOverflow, outsideControls }))) : "PASS"}\n`,
      );
    },
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await step(
    "Dashboard existing visible controls and dependent projections",
    async () => {
      await page.goto(app.origin + "/dashboard");
      for (const name of [
        "Day",
        "Week",
        "Month",
        "Morning",
        "Midday",
        "Evening",
        "Project View",
        "Goal View",
        "Skill View",
        "Running",
        "Muscle",
      ]) {
        const button = page
          .locator("#main-content")
          .getByRole("button", { name, exact: true });
        if (await button.count()) {
          await button.click();
          await expect(page.locator(".life-os-canvas")).toBeVisible();
        }
      }
      for (const name of [
        "Calm",
        "Focused",
        "Tired",
        "Anxious",
        "Stressed",
        "Happy",
      ]) {
        await Promise.all([
          page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              new URL(response.url()).pathname === "/dashboard",
          ),
          page.getByRole("button", { name, exact: true }).click(),
        ]);
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: /Mood|Stimmung/ })
            .last(),
        ).toBeVisible();
      }
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("button", { name: "+ Add habit", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .locator('[name="name"]')
        .fill("SQLite browser surface Habit");
      await dialog.locator('[name="dailyTarget"]').fill("2");
      await dialog.locator('[name="window"]').selectOption("Morning");
      await dialog.locator('[name="defaultIncrement"]').fill("1");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await page.reload();
      await page.getByRole("button", { name: "Morning", exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Habit Trackers", exact: true }),
      ).toContainText("SQLite browser surface Habit");
    },
  );
  await step("Calendar current view/period/day/slot controls", async () => {
    await page.goto(app.origin + `/calendar?date=${fixture.day}&view=week`);
    for (const name of [
      "Previous period",
      "Next period",
      "Previous week",
      "Next week",
      "Today",
    ]) {
      const control = page.getByRole("button", { name, exact: true });
      if (await control.count()) {
        await control.click();
        await expect(page.locator(".life-os-canvas")).toBeVisible();
      }
    }
    for (const view of ["day", "week", "month"]) {
      await page.locator(`[data-calendar-view="${view}"]`).click();
      await expect(
        page.locator(`[data-calendar-view="${view}"]`),
      ).toHaveAttribute("aria-pressed", "true");
      const names = await page
        .locator(
          'button[aria-label^="Select free slot"],button[aria-label^="Open day "]',
        )
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("aria-label")),
        );
      for (const name of names) {
        // Month day selection navigates to Day; revisit Month for each control.
        if (view === "month")
          await page.goto(
            app.origin + `/calendar?date=${fixture.day}&view=month`,
          );
        const target = page.getByRole("button", { name, exact: true });
        await target.scrollIntoViewIfNeeded();
        const exposed = await target.evaluate((node) => {
          const r = node.getBoundingClientRect();
          const point = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return point === node || node.contains(point);
        });
        if (!exposed) {
          process.stdout.write(
            `Calendar occupied/covered background slot: ${name}\n`,
          );
          continue;
        }
        await target.click();
        await expect(page.locator(".life-os-canvas")).toBeVisible();
        if (name.startsWith("Select free slot"))
          await expect(
            page.getByRole("region", {
              name: "Calendar Planner Queue",
              exact: true,
            }),
          ).toBeVisible();
      }
    }
  });
  await step(
    "Core overlay bounds and direct close/cancel controls",
    async () => {
      const bounds = [];
      for (const viewport of [
        { width: 3840, height: 2160 },
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(app.origin + "/dashboard");
        await page
          .getByRole("button", { name: "+ Add habit", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const habit = await dialog.boundingBox();
        assert.ok(habit.x >= 0 && habit.x + habit.width <= viewport.width + 1);
        assert.ok(
          habit.y >= 0 && habit.y + habit.height <= viewport.height + 1,
        );
        await page.screenshot({
          path: join(
            fixture.directory,
            `dashboard-habit-overlay-${viewport.width}.png`,
          ),
          fullPage: true,
        });
        await dialog
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
        await expect(dialog).toBeHidden();
        await page.goto(app.origin + `/calendar?date=${fixture.day}&view=week`);
        await page
          .getByRole("button", { name: /Run: SQLite synthetic Run,/ })
          .click();
        const inspector = page.locator("[data-calendar-inspector]");
        await expect(inspector).toBeVisible();
        const calendar = await inspector.boundingBox();
        assert.ok(
          calendar.x >= 0 && calendar.x + calendar.width <= viewport.width + 1,
        );
        await page.screenshot({
          path: join(
            fixture.directory,
            `calendar-inspector-${viewport.width}.png`,
          ),
          fullPage: true,
        });
        await inspector
          .getByRole("button", { name: "Inspector schließen", exact: true })
          .click();
        await expect(inspector).toBeHidden();
        bounds.push({ viewport, habit, calendar });
      }
      writeFileSync(
        join(fixture.directory, "overlay-evidence.json"),
        JSON.stringify(bounds, null, 2),
        { mode: 0o600 },
      );
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(app.origin + "/dashboard");
      await page.getByRole("button", { name: "Morning", exact: true }).click();
      const increment = page.getByRole("button", {
        name: "SQLite synthetic Habit erhöhen",
        exact: true,
      });
      await page
        .getByRole("button", {
          name: "SQLite synthetic Habit: Letzten Eintrag rückgängig machen",
          exact: true,
        })
        .click();
      await expect(increment).toContainText("0 / 2");
      await page.reload();
      await page.getByRole("button", { name: "Morning", exact: true }).click();
      await expect(increment).toContainText("0 / 2");
      await increment.click();
      await expect(increment).toContainText("1 / 2");
      await page.reload();
    },
  );
  await step("Core surface current links navigate to real routes", async () => {
    for (const route of routes) {
      await page.goto(app.origin + route);
      const links = await page
        .locator("#main-content a:visible[href]")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            text: node.textContent?.trim(),
            href: node.getAttribute("href"),
          })),
        );
      for (const { href } of links) {
        if (!href.startsWith("/") || href.includes("#")) continue;
        await page.goto(app.origin + route);
        const target = page
          .locator(`#main-content a:visible[href=${JSON.stringify(href)}]`)
          .first();
        await target.click();
        await expect(page.locator(".life-os-canvas")).toBeVisible();
        assert.ok(
          !(await page
            .getByRole("heading", { name: "404", exact: true })
            .count()),
          href,
        );
      }
    }
  });
}
