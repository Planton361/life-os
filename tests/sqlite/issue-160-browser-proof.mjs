import assert from "node:assert/strict";
import { createRouteDiagnostics } from "./browser-route-diagnostics.mjs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { compileRuntime } from "./compile-runtime.mjs";
import { startApplication } from "./application-process.mjs";
import { surfaceProof } from "./application-surface-proof.mjs";
import {
  cockpitGeometry,
  cockpitViewports,
  scrollProof,
} from "../e2e/support/dashboard-cockpit.ts";

assert.equal(process.versions.node, "24.21.0");

const output = resolve("test-results/issue-160");
mkdirSync(output, { recursive: true });
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { SqliteRuntime } = require(join(fixture.compiled, "runtime.js"));
const { issueOwnerContext } = require(
  join(fixture.compiled, "owner-context.js"),
);
const projectDepthCompiled = compileRuntime([
  "src/features/real-data/sqlite/repositories/project-depth-repository.ts",
]);
fixture.disposableDirectories.push(projectDepthCompiled);
const { projectDepthCommand, readSqliteProjectDepth } = require(
  join(projectDepthCompiled, "repositories/project-depth-repository.js"),
);
const { sqliteApplicationRepositories } = require(
  join(
    fixture.compiled,
    "dependencies/src/features/real-data/runtime/sqlite-adapter.js",
  ),
);
const agendaTasks = [];
const fixtureStore = new SqliteRuntime(fixture.path, { syntheticProof: true });
try {
  const context = issueOwnerContext(fixture.ownerId);
  const repositories = sqliteApplicationRepositories(fixtureStore, context);
  const scope = { userId: fixture.ownerId, profileId: fixture.ownerId };
  for (let index = 0; index < 12; index++) {
    const durationMinutes = index === 0 ? 30 : 60;
    const scheduledStartAt = `${fixture.day}T${index < 3 ? "07" : String(index + 5).padStart(2, "0")}:${index === 1 ? "30" : "00"}:00Z`;
    const title = `#164 ${randomUUID()} ${"Long scheduled task content ".repeat(8)}`;
    const description =
      "A long canonical task note that must not stretch an hour. ".repeat(20);
    const result = await repositories.tasks.createTask({
      ...scope,
      title,
      description,
      plannedDate: fixture.day,
      status: "done",
      scheduledStartAt,
      durationMinutes,
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    agendaTasks.push({
      ...result.data,
      title,
      description,
      scheduledStartAt,
      durationMinutes,
    });
  }
  const project = readSqliteProjectDepth(
    fixtureStore,
    context,
    fixture.ids.work,
  ).context;
  projectDepthCommand(fixtureStore, context, {
    projectId: fixture.ids.work,
    commandId: randomUUID(),
    expectedRevision: project.completion_revision,
    expectedCycle: project.completion_cycle,
    operation: "project.archive",
    payload: {
      reason: "Synthetic proof leaves one Project placeholder available",
    },
  });
} finally {
  fixtureStore.close();
}
const evidence = {
  revision: "unknown",
  runtime: "sqlite-synthetic",
  presentation: "manual",
  sealedDisposable: true,
  fixturePreparation:
    "archived one synthetic project; twelve completed scheduled tasks isolate Agenda long-content geometry from Daily Control current-work composition",
  portIs3000: false,
  viewChecks: [],
  agendaChecks: [],
  errors: [],
};
let app;
let browser;
let exitCode = 0;
const syntheticFailure = process.env.LIFE_OS_174_SYNTHETIC_FAILURE === "160";
const syntheticMatcherFailure =
  process.env.LIFE_OS_174_SYNTHETIC_FAILURE === "160-matcher";
const diagnostics = createRouteDiagnostics({
  output,
  synthetic: syntheticMatcherFailure ? "matcher" : syntheticFailure,
});

function readEntities() {
  const db = new Database(fixture.path, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return {
      projects: db
        .prepare(
          "SELECT id,title,status FROM projects WHERE user_id=? ORDER BY id",
        )
        .all(fixture.ownerId),
      goals: db
        .prepare(
          "SELECT id,title,status FROM goals WHERE user_id=? ORDER BY id",
        )
        .all(fixture.ownerId),
      skills: db
        .prepare(
          "SELECT id,name,status FROM skills WHERE user_id=? ORDER BY id",
        )
        .all(fixture.ownerId),
    };
  } finally {
    db.close();
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(
    Math.max(dimensions.documentWidth, dimensions.bodyWidth) <=
      dimensions.viewportWidth + 1,
    `${label}: horizontal overflow ${JSON.stringify(dimensions)}`,
  );
}

async function periodGeometry(period) {
  return period.evaluate((grid) => {
    const frame = grid.parentElement;
    const cells = [...grid.children].map((cell) =>
      cell.getBoundingClientRect(),
    );
    const bounds = frame.getBoundingClientRect();
    return {
      count: cells.length,
      rows: new Set(cells.map((r) => r.top)).size,
      heights: cells.map((r) => r.height),
      columns: new Set(cells.map((r) => r.left)).size,
      remaining:
        bounds.top +
        frame.clientHeight -
        Math.max(...cells.map((r) => r.bottom)) -
        parseFloat(getComputedStyle(grid).paddingBottom),
      scroll: frame.scrollHeight - frame.clientHeight,
      contentContained: [...grid.querySelectorAll("a")].every((link) => {
        const r = link.getBoundingClientRect();
        const cell = link.closest("section").getBoundingClientRect();
        return r.top >= cell.top && r.bottom <= cell.bottom;
      }),
    };
  });
}

try {
  const { execFileSync } = await import("node:child_process");
  evidence.revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  app = await startApplication(fixture);
  const port = new URL(app.origin).port;
  assert.notEqual(port, "3000");
  evidence.port = Number(port);
  evidence.portIs3000 = port === "3000";
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await context.newPage();
  diagnostics.attach(page, app);
  const display = await context.newCDPSession(page);
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => evidence.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      evidence.errors.push(message.text());
  });
  context.on("request", (request) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\//i.test(request.url()))
      evidence.errors.push("UNEXPECTED_SUPABASE_BROWSER_REQUEST");
  });

  const entityBaseline = readEntities();
  const portfolio = page.locator(".dashboard-portfolio");
  const createRoutes = [
    {
      view: "Project View",
      linkName: "project erstellen",
      path: "/projects/new",
      formName: "Project erstellen",
    },
    {
      view: "Goal View",
      linkName: "goal erstellen",
      path: "/goals/new",
      formName: "Ziel erstellen",
    },
    {
      view: "Skill View",
      linkName: "skill erstellen",
      path: "/skills/new",
      formName: "Skill erstellen",
    },
  ];

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${app.origin}/dashboard`);
    await expect(portfolio).toBeVisible();
    await assertNoHorizontalOverflow(page, `dashboard-${viewport.width}`);

    for (const route of createRoutes) {
      await portfolio
        .getByRole("button", { name: route.view, exact: true })
        .click();

      const placeholders = portfolio.locator("[data-portfolio-placeholder]");
      const availablePlaceholders = await placeholders.count();
      assert.ok(
        availablePlaceholders > 0,
        `${route.view} has no available create placeholder in the SQLite fixture`,
      );
      const link = portfolio
        .getByRole("link", { name: route.linkName, exact: true })
        .first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", route.path);
      await assertNoHorizontalOverflow(
        page,
        `dashboard-${route.view}-${viewport.width}`,
      );

      await link.focus();
      await expect(link).toBeFocused();
      diagnostics.begin(route.path, "keyboard");
      await page.keyboard.press("Enter");
      await page.waitForURL(
        (url) => `${url.pathname}${url.search}${url.hash}` === route.path,
      );
      diagnostics.matched();
      assert.equal(new URL(page.url()).pathname, route.path);
      if (syntheticFailure && route.path === "/goals/new")
        assert.fail("explicit synthetic failure fixture");
      if (syntheticMatcherFailure && route.path === "/goals/new") {
        diagnostics.assertionStart("toBeVisible", 5000);
        await expect(
          page.locator("[data-synthetic-absent-form]"),
        ).toBeVisible();
      }
      const form = page.getByRole("form", {
        name: route.formName,
        exact: true,
      });
      diagnostics.assertionStart("toBeVisible", 5000);
      await expect(form).toBeVisible();
      diagnostics.assertionPassed();
      diagnostics.visible();
      diagnostics.assertionStart("toBeVisible", 5000);
      await expect(
        page.getByRole("heading", { name: route.formName, exact: true }),
      ).toBeVisible();
      diagnostics.assertionPassed();
      await assertNoHorizontalOverflow(page, `${route.path}-${viewport.width}`);
      assert.deepEqual(
        readEntities(),
        entityBaseline,
        `${route.path} navigation must not create or change an entity`,
      );

      evidence.viewChecks.push({
        viewport,
        view: route.view,
        route: route.path,
        form: route.formName,
        availablePlaceholders,
        keyboard: "focus+Enter",
        entitySnapshotUnchanged: true,
        horizontalOverflow: false,
      });

      await page.goto(`${app.origin}/dashboard`);
      await expect(portfolio).toBeVisible();
      await assertNoHorizontalOverflow(
        page,
        `dashboard-return-${route.view}-${viewport.width}`,
      );
    }
  }

  // #164 extends this existing disposable Dashboard proof; no personal runtime.
  const agenda = page.locator(".dashboard-agenda");
  const selectors = [
    ".dashboard-agenda",
    ".dashboard-agenda > :first-child",
    ".dashboard-daily",
    ".dashboard-quick",
    ".dashboard-priority",
    ".dashboard-supporting",
  ];
  async function geometry() {
    return page.evaluate(
      (selectors) => ({
        dpr: devicePixelRatio,
        canvas: document.querySelector(".life-os-canvas").clientWidth,
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        zones: selectors.map((selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return {
            selector,
            x: r.x + scrollX,
            y: r.y + scrollY,
            width: r.width,
            height: r.height,
          };
        }),
        hours: [...document.querySelectorAll("[data-agenda-hour-lines]")].map(
          (e) => e.getBoundingClientRect().height,
        ),
        dayOverview:
          getComputedStyle(
            document.querySelector(".agenda-body") ?? document.body,
          )
            .getPropertyValue("--agenda-day-overview")
            .trim() === "1",
      }),
      selectors,
    );
  }
  for (const profile of ["manual", "demo", "empty"]) {
    await context.addCookies([
      { name: "life_os_profile", value: profile, url: app.origin },
    ]);
    for (const target of [
      ...cockpitViewports,
      { width: 1440, height: 900, deviceScaleFactor: 1 },
    ]) {
      const viewport = { width: target.width, height: target.height };
      await page.setViewportSize(viewport);
      await display.send("Emulation.setDeviceMetricsOverride", {
        ...viewport,
        deviceScaleFactor: target.deviceScaleFactor,
        mobile: false,
      });
      await page.goto(`${app.origin}/dashboard`);
      await expect(agenda).toHaveAttribute("data-profile-id", profile);
      await agenda.getByRole("button", { name: "Day", exact: true }).click();
      const baseline = await geometry();
      assert.equal(baseline.dpr, target.deviceScaleFactor);
      const bounded =
        baseline.canvas >= 1440 ||
        (baseline.canvas >= 880 && viewport.height >= 720);
      const record = { profile, viewport, baseline, views: [] };
      record.cockpit = await cockpitGeometry(page);
      const g = record.cockpit;
      assert.equal(g.width, viewport.width);
      assert.equal(g.height, viewport.height);
      if (profile === "manual" && viewport.height === 1355)
        record.controls = await page
          .locator(".dashboard-composition :is(button,a,textarea)")
          .evaluateAll((nodes) =>
            nodes.map((e) => ({
              tag: e.tagName,
              name: (e.getAttribute("aria-label") || e.textContent).slice(
                0,
                160,
              ),
              href: e.getAttribute("href"),
              disabled: e.matches(":disabled"),
            })),
          );
      assert.deepEqual(g.overlaps, []);
      assert.deepEqual(g.clipped, []);
      assert.equal(g.scaled, 0);
      record.mealRows = await page
        .locator(".dashboard-meal-list > article")
        .evaluateAll((rows) =>
          rows.map((row) => {
            const bounds = row.getBoundingClientRect();
            return {
              y: bounds.y,
              bottom: bounds.bottom,
              containedLinks: [...row.querySelectorAll("a")].every((link) => {
                const r = link.getBoundingClientRect();
                return r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
              }),
            };
          }),
        );
      assert.ok(record.mealRows.every((row) => row.containedLinks));
      if (g.canvas >= 1440) {
        assert.ok(g.documentHeight <= viewport.height + 1, JSON.stringify(g));
        for (const zone of g.zones)
          assert.ok(
            zone.y >= 0 &&
              zone.bottom <= viewport.height + 1 &&
              zone.height > 40,
            JSON.stringify(zone),
          );
        const zone = (name) =>
          g.zones.find((z) => z.selector === `.dashboard-${name}`);
        const center = zone("agenda");
        for (const name of ["weight", "nutrients", "meals", "running"])
          assert.ok(
            zone(name).right <= center.x + 1,
            `${name} must be left of Agenda`,
          );
        for (const name of ["habits", "portfolio"])
          assert.ok(
            zone(name).x >= center.right - 1,
            `${name} must be right of Agenda`,
          );
        assert.ok(zone("habits").bottom <= zone("portfolio").y + 1);
        assert.ok(zone("meals").bottom <= zone("running").y + 1);
        assert.ok(center.width > zone("habits").width);
        if (viewport.height >= 900) {
          assert.ok(Math.abs(zone("portfolio").bottom - center.bottom) <= 1);
          for (const name of ["daily", "quick", "mood"])
            assert.ok(
              Math.abs(zone(name).bottom - zone("stats").bottom) <= 1,
              `${name}: hole in Command band`,
            );
        }
        await scrollProof(page);
      }
      evidence.agendaChecks.push(record);
      for (const view of ["Week", "Month", "Day"]) {
        const control = agenda.getByRole("button", { name: view, exact: true });
        await control.focus();
        await page.keyboard.press("Enter");
        await expect(control).toHaveAttribute("aria-pressed", "true");
        await expect(control).toBeFocused();
        const current = await geometry();
        record.views.push({ view, geometry: current });
        assert.ok(
          current.documentWidth <= viewport.width + 1,
          `${profile} ${view}: horizontal overflow`,
        );
        if (bounded) {
          for (let i = 0; i < baseline.zones.length; i++)
            for (const key of ["x", "y", "width", "height"])
              assert.ok(
                Math.abs(current.zones[i][key] - baseline.zones[i][key]) <= 1,
                `${profile} ${viewport.width}x${viewport.height} ${view} ${selectors[i]} ${key}: ${baseline.zones[i][key]} -> ${current.zones[i][key]}`,
              );
          assert.ok(
            Math.abs(current.documentHeight - baseline.documentHeight) <= 1,
          );
        }
        if (baseline.canvas >= 1440)
          assert.ok(current.documentHeight <= viewport.height + 1);
        if (view !== "Day") {
          const period = agenda.locator(".dashboard-agenda-period");
          const measure = () => periodGeometry(period);
          const fill = await measure();
          record.views.at(-1).period = fill;
          assert.equal(fill.count, view === "Week" ? 7 : 42);
          assert.equal(fill.contentContained, true);
          if (bounded) assert.ok(fill.remaining <= 1, JSON.stringify(fill));
          if (bounded && profile === "empty") {
            // Short frames retain readable intrinsic rows and internal scroll.
            if (fill.scroll <= 1) assert.ok(Math.abs(fill.remaining) <= 1);
            // Equal Empty rows are a roomy Wide contract. Split date labels
            // may wrap and must retain their intrinsic readable heights.
            if (baseline.canvas >= 1440)
              assert.ok(
                Math.max(...fill.heights) - Math.min(...fill.heights) <= 1,
                JSON.stringify(fill),
              );
          }
          if (view === "Month" && baseline.canvas >= 1440) {
            assert.equal(fill.columns, 7);
            assert.equal(fill.rows, 6);
          }
          if (viewport.height === 1355 && profile !== "demo") {
            // CSS A/B against main's intrinsic period sizing, on the very same
            // sealed fixture/page. Only #167's min-height declaration is undone.
            const original = await page.addStyleTag({
              content: ".dashboard-agenda-period { min-height: 0; }",
            });
            await agenda
              .locator(".agenda-scroll")
              .evaluate((e) => (e.scrollTop = 0));
            record.views.at(-1).before = await measure();
            await page.screenshot({
              path: join(output, `period-${profile}-${view}-before.png`),
              fullPage: true,
            });
            await original.evaluate((e) => e.remove());
            await page.screenshot({
              path: join(output, `period-${profile}-${view}-after.png`),
              fullPage: true,
            });
          }
        }
        if (view === "Day") {
          assert.equal(current.hours.length, 19);
          assert.ok(
            Math.max(...current.hours) - Math.min(...current.hours) <= 1,
            `Unequal hour sizes: ${current.hours}`,
          );
          if (current.dayOverview) {
            const fullDay = await agenda
              .locator(".agenda-scroll")
              .evaluate((frame) => {
                const bounds = frame.getBoundingClientRect();
                const labels = [
                  ...frame.querySelectorAll(".agenda-hour-label"),
                ];
                return {
                  labels: labels.map((e) => e.firstChild.textContent),
                  allVisible: labels.every((e) => {
                    const r = e.getBoundingClientRect();
                    return (
                      r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1
                    );
                  }),
                  scroll: frame.scrollHeight - frame.clientHeight,
                  timeLabelsContained: [
                    ...frame.querySelectorAll(".agenda-event-time"),
                  ].every((e) => {
                    const r = e.getBoundingClientRect(),
                      card = e
                        .closest(".agenda-event-card")
                        .getBoundingClientRect();
                    return r.top >= card.top - 1 && r.bottom <= card.bottom + 1;
                  }),
                };
              });
            assert.equal(fullDay.labels[0], "06:00");
            assert.equal(fullDay.labels.at(-1), "24:00");
            assert.equal(fullDay.allVisible, true);
            assert.ok(fullDay.scroll <= 1);
            assert.equal(fullDay.timeLabelsContained, true);
            record.fullDay = fullDay;
          } else {
            assert.ok(
              current.hours.every((height) => Math.abs(height - 96) <= 1),
            );
          }
          if (viewport.height === 1355 || viewport.height === 2160)
            assert.equal(current.dayOverview, true);
        }
        if (bounded && profile === "manual") {
          const region = agenda.getByRole("region", {
            name:
              view === "Day" ? "Agenda time content" : "Agenda period content",
            exact: true,
          });
          const scrollable = await region.evaluate(
            (e) => e.scrollHeight > e.clientHeight + 1,
          );
          if (scrollable) {
            await region.focus();
            await page.keyboard.press("End");
            await expect
              .poll(() => region.evaluate((e) => e.scrollTop))
              .toBeGreaterThan(0);
            await region.evaluate((e) => (e.scrollTop = 0));
            const box = await region.boundingBox();
            await page.mouse.move(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            await page.mouse.wheel(0, 240);
            await expect
              .poll(() => region.evaluate((e) => e.scrollTop))
              .toBeGreaterThan(0);
          }
          record.views.at(-1).internalScroll = scrollable;
          assert.equal(
            await region.evaluate((e) => e.scrollWidth > e.clientWidth + 1),
            false,
          );
        }
        if (profile === "manual") {
          if (view === "Day") {
            await agenda
              .locator(`a[href="/tasks/${agendaTasks[0].id}"]`)
              .scrollIntoViewIfNeeded();
          } else {
            await agenda
              .locator(`section[aria-label="${fixture.day}"] > a`)
              .scrollIntoViewIfNeeded();
          }
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: join(
              output,
              `agenda-${viewport.width}x${viewport.height}-${view}.png`,
            ),
            fullPage: true,
          });
        }
        if (profile === "empty" && viewport.height === 1355 && view === "Day")
          await page.screenshot({
            path: join(output, "pg27-empty-after.png"),
            fullPage: true,
          });
      }
      await page.reload();
      await expect(
        agenda.getByRole("button", { name: "Day", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await agenda.getByRole("button", { name: "Week", exact: true }).click();
      await agenda.getByRole("button", { name: "Day", exact: true }).click();
      const reloaded = await geometry();
      assert.deepEqual(reloaded.hours, baseline.hours);
      if (profile === "manual") {
        const task = agendaTasks[0];
        const link = agenda.locator(`a[href="/tasks/${task.id}"]`);
        await expect(link).toHaveCount(1);
        const formatTime = (value) =>
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Berlin",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(value));
        for (const scheduled of agendaTasks.slice(0, 2)) {
          const item = agenda.locator(`a[href="/tasks/${scheduled.id}"]`);
          const start = formatTime(scheduled.scheduledStartAt);
          const end = formatTime(
            Date.parse(scheduled.scheduledStartAt) +
              scheduled.durationMinutes * 60_000,
          );
          await expect(item).toContainText(
            `${start}-${end} · ${scheduled.durationMinutes} min`,
          );
          await expect(item).toHaveAccessibleDescription(
            new RegExp("A long canonical task note"),
          );
        }
        const hour = agenda
          .locator("[data-agenda-hour-lines]")
          .filter({ has: page.locator(`a[href="/tasks/${task.id}"]`) });
        await hour.focus();
        const siblings = hour.locator("a");
        for (let index = 0; index < (await siblings.count()); index++) {
          await page.keyboard.press("Tab");
          const sibling = siblings.nth(index);
          await expect(sibling).toBeFocused();
          await expect
            .poll(
              () =>
                sibling.evaluate((e) => {
                  const r = e.getBoundingClientRect();
                  return e.contains(
                    document.elementFromPoint(
                      r.x + r.width / 2,
                      r.y + r.height / 2,
                    ),
                  );
                }),
              {
                message:
                  "Same-hour event is keyboard reachable without overlap",
              },
            )
            .toBe(true);
        }
        // All full text stays available to assistive technology or the real detail link.
        await expect(link).toHaveAccessibleName(
          new RegExp(task.title.slice(0, 41)),
        );
        await link.focus();
        await page.keyboard.press("Enter");
        await page.waitForURL(`**/tasks/${task.id}`);
        await expect(
          page.getByRole("heading", { name: task.title, exact: true }),
        ).toBeVisible({ timeout: 12000 });
        if (baseline.canvas >= 1440 && viewport.height < 720) {
          for (const slot of ["breakfast", "lunch", "dinner"]) {
            await page.goto(`${app.origin}/dashboard`);
            const href = `/nutrition/meal-planner?slot=${slot}`;
            await page
              .locator(`.dashboard-meal-list a[href="${href}"]`)
              .click();
            await page.waitForURL((url) => url.pathname + url.search === href);
          }
          await page.goto(`${app.origin}/dashboard`);
          const running = page.locator(".dashboard-running");
          await running
            .getByRole("button", { name: "Muscle", exact: true })
            .click();
          await running.getByRole("link", { name: /^Open workout:/ }).click();
          await page.waitForURL("**/health/strength");
          record.shortStackNavigation =
            "all three meal Planen links and Muscle link clicked through bounded bodies";
        }
      }
    }
  }
  // Verify the same source interval in Calendar, then all affected Agenda links.
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${app.origin}/calendar?date=${fixture.day}&view=day`);
  const time = (value) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  for (const task of agendaTasks.slice(0, 2)) {
    const start = time(task.scheduledStartAt);
    const end = time(
      Date.parse(task.scheduledStartAt) + task.durationMinutes * 60_000,
    );
    await expect(
      page
        .locator("[data-calendar-timed-block] > button")
        .filter({ hasText: task.title }),
    ).toHaveAccessibleName(new RegExp(`${start} to ${end}`));
  }
  for (const view of ["Day", "Week", "Month"]) {
    await page.goto(`${app.origin}/dashboard`);
    await agenda.getByRole("button", { name: view, exact: true }).click();
    const links = await agenda.locator("a[href]").evaluateAll((nodes) =>
      nodes.map((e) => ({
        href: e.getAttribute("href"),
        name: e.getAttribute("aria-label") || e.textContent,
      })),
    );
    for (const { href } of links) {
      await page.goto(`${app.origin}/dashboard`);
      await agenda.getByRole("button", { name: view, exact: true }).click();
      await agenda
        .locator(`a[href=${JSON.stringify(href)}]`)
        .first()
        .click();
      await page.waitForURL((url) => url.pathname + url.search === href);
      await expect(page.locator("#main-content")).not.toContainText(
        "This page could not be found",
      );
    }
    evidence.agendaChecks.push({
      view,
      controlInventory: links,
      navigation: "PASS",
    });
  }

  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const primary = evidence.agendaChecks.find((record) => record.controls);
  evidence.dashboardLinks = [];
  for (const href of new Set(
    primary.controls.map((c) => c.href).filter(Boolean),
  )) {
    await page.goto(`${app.origin}/dashboard`);
    await page
      .locator(`.dashboard-composition a[href=${JSON.stringify(href)}]`)
      .first()
      .click();
    await page.waitForURL((url) => url.pathname + url.search === href);
    await expect(page.locator("#main-content")).not.toContainText(
      "This page could not be found",
    );
    evidence.dashboardLinks.push({ href, navigation: "PASS" });
  }
  await surfaceProof({
    page,
    app,
    fixture,
    step: async (name, run) => {
      if (!name.startsWith("Dashboard existing visible controls")) return;
      await run();
      evidence.dashboardControls = name + ": PASS (existing proof reused)";
    },
  });
  await expect(
    page
      .locator(".dashboard-mood")
      .getByRole("button", { name: "Happy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const habit = page.getByRole("button", {
    name: "SQLite browser surface Habit erhöhen",
    exact: true,
  });
  await habit.click();
  await page.reload();
  await page.getByRole("button", { name: "Morning", exact: true }).click();
  await expect(habit).toContainText("1 / 2");
  await page
    .getByRole("button", {
      name: "SQLite browser surface Habit: Letzten Eintrag rückgängig machen",
      exact: true,
    })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Morning", exact: true }).click();
  await expect(habit).toContainText("0 / 2");
  const capture = `#112 layout ${randomUUID()}`;
  const quick = page.locator(".dashboard-quick");
  await quick
    .getByRole("button", { name: "In Inbox speichern", exact: true })
    .click();
  await expect(quick.getByRole("alert")).toBeVisible();
  await quick
    .getByRole("textbox", { name: "Quick Thought", exact: true })
    .fill(capture);
  await quick
    .getByRole("button", { name: "In Inbox speichern", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "In der Inbox gespeichert." }),
  ).toBeVisible();
  await page.goto(`${app.origin}/inbox`);
  const captured = page
    .locator('[data-inbox-section="queue"]')
    .getByRole("button", { name: new RegExp(`^${capture}`) });
  await expect(captured).toBeVisible();
  await page.reload();
  await expect(captured).toBeVisible();
  evidence.writeReload =
    "Capture/error feedback, Mood and Habit increment/undo PASS on disposable fixture";

  // Retain the original twelve-task overflow/navigation regression above, then
  // prove a realistic sparse Manual week/month on that same disposable owner.
  await page.goto("about:blank");
  assert.ok(!app.output().includes("SQLITE_PROOF_SUPABASE_NETWORK_DENIED"));
  // Reuse the existing forced cleanup for this owned test server: aborted Next
  // prefetches can remain pending after leaving the page.
  await app.stop("SIGKILL");
  app = undefined;
  const sparseStore = new SqliteRuntime(fixture.path, { syntheticProof: true });
  try {
    const repositories = sqliteApplicationRepositories(
      sparseStore,
      issueOwnerContext(fixture.ownerId),
    );
    for (const task of agendaTasks.slice(3)) {
      const result = await repositories.tasks.archiveTask({
        userId: fixture.ownerId,
        profileId: fixture.ownerId,
        taskId: task.id,
      });
      assert.equal(result.ok, true, JSON.stringify(result));
    }
  } finally {
    sparseStore.close();
  }
  app = await startApplication(fixture, { port: evidence.port });
  await page.setViewportSize({ width: 2560, height: 1355 });
  await display.send("Emulation.setDeviceMetricsOverride", {
    width: 2560,
    height: 1355,
    deviceScaleFactor: 1.5,
    mobile: false,
  });
  await page.goto(`${app.origin}/dashboard`);
  const sparseBaseline = await geometry();
  evidence.sparsePeriod = [];
  for (const view of ["Week", "Month"]) {
    await agenda.getByRole("button", { name: view, exact: true }).click();
    const period = agenda.locator(".dashboard-agenda-period");
    const original = await page.addStyleTag({
      content: ".dashboard-agenda-period { min-height: 0; }",
    });
    const before = await periodGeometry(period);
    await page.screenshot({
      path: join(output, `period-sparse-manual-${view}-before.png`),
      fullPage: true,
    });
    await original.evaluate((e) => e.remove());
    const after = await periodGeometry(period);
    assert.ok(Math.abs(after.remaining) <= 1, JSON.stringify(after));
    assert.equal(after.contentContained, true);
    assert.equal(after.scroll, 0);
    const current = await geometry();
    assert.deepEqual(current.zones, sparseBaseline.zones);
    assert.equal(current.documentHeight, 1355);
    await page.screenshot({
      path: join(output, `period-sparse-manual-${view}-after.png`),
      fullPage: true,
    });
    evidence.sparsePeriod.push({ view, before, after });
  }

  assert.ok(
    !app.output().includes("SQLITE_PROOF_SUPABASE_NETWORK_DENIED"),
    "application attempted a Supabase network request",
  );
  assert.deepEqual(evidence.errors, []);
  evidence.supabaseNetworkGuard = "PASS";
  evidence.result = "PASS";
  console.log(
    "PASS #160/#164 native SQLite Dashboard browser proof",
    evidence.viewChecks.length,
    "create view checks;",
    evidence.agendaChecks.length,
    "Agenda matrix/inventory checks",
  );
} catch (error) {
  diagnostics.failure(error);
  evidence.result = "HARNESS_OR_ASSERTION_FAILURE";
  evidence.failure = "ASSERTION_OR_HARNESS_FAILURE";
  console.error("ISSUE_160_ASSERTION_OR_HARNESS_FAILURE");
  exitCode = 1;
} finally {
  try {
    await diagnostics.finish({ failed: exitCode !== 0, app });
  } catch {
    console.error("ISSUE_160_DIAGNOSTIC_FAILED");
    exitCode = 1;
  }
  try {
    writeFileSync(
      join(output, "evidence.json"),
      JSON.stringify(evidence, null, 2),
    );
  } catch {
    console.error("ISSUE_160_EVIDENCE_FAILED");
    exitCode = 1;
  }
  try {
    if (browser) await browser.close();
  } catch {
    console.error("ISSUE_160_BROWSER_CLEANUP_FAILED");
    exitCode = 1;
  }
  try {
    if (app) await app.stop("SIGKILL");
  } catch {
    console.error("ISSUE_160_APPLICATION_CLEANUP_FAILED");
    exitCode = 1;
  }
  try {
    if (!exitCode) releaseApplicationFixture(fixture);
  } catch {
    console.error("ISSUE_160_FIXTURE_CLEANUP_FAILED");
    exitCode = 1;
  }
}

if (exitCode) process.exitCode = exitCode;
