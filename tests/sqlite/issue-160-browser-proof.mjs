import assert from "node:assert/strict";
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
import { cockpitGeometry } from "../e2e/support/dashboard-cockpit.ts";

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
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await context.newPage();
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
      await page.keyboard.press("Enter");
      await page.waitForURL(
        (url) => `${url.pathname}${url.search}${url.hash}` === route.path,
      );
      assert.equal(new URL(page.url()).pathname, route.path);
      const form = page.getByRole("form", {
        name: route.formName,
        exact: true,
      });
      await expect(form).toBeVisible();
      await expect(
        page.getByRole("heading", { name: route.formName, exact: true }),
      ).toBeVisible();
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
      }),
      selectors,
    );
  }
  for (const profile of ["manual", "demo", "empty"]) {
    await context.addCookies([
      { name: "life_os_profile", value: profile, url: app.origin },
    ]);
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 3840, height: 2160 },
      { width: 2560, height: 589 },
      { width: 2560, height: 639 },
      { width: 1440, height: 900 },
      { width: 769, height: 413 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await display.send("Emulation.setDeviceMetricsOverride", {
        ...viewport,
        deviceScaleFactor:
          viewport.width === 769 ? 2 : viewport.height === 639 ? 1.5 : 1,
        mobile: false,
        screenWidth: viewport.width,
        screenHeight: viewport.width === 2560 ? 1440 : viewport.height,
      });
      await page.goto(`${app.origin}/dashboard`);
      await expect(agenda).toHaveAttribute("data-profile-id", profile);
      const baseline = await geometry();
      const bounded =
        baseline.canvas >= 1440 ||
        (baseline.canvas >= 880 && viewport.height >= 720);
      const record = { profile, viewport, baseline, views: [] };
      record.cockpit = await cockpitGeometry(page);
      assert.deepEqual(record.cockpit.overlaps, []);
      assert.deepEqual(record.cockpit.clipped, []);
      assert.equal(record.cockpit.scaled, 0);
      if (baseline.canvas >= 1440) {
        for (const zone of record.cockpit.zones) {
          assert.ok(zone.y >= 0 && zone.bottom <= viewport.height + 1);
          assert.ok(zone.height > 40, JSON.stringify(zone));
        }
        const widths = record.cockpit.zones
          .filter((z) =>
            [
              ".dashboard-agenda",
              ".dashboard-habits",
              ".dashboard-portfolio",
            ].includes(z.selector),
          )
          .map((z) => z.width);
        assert.ok(
          Math.max(...widths) - Math.min(...widths) <= 1,
          `Workbench balance: ${widths}`,
        );
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
        if (view === "Day") {
          assert.equal(current.hours.length, 19);
          assert.ok(
            Math.max(...current.hours) - Math.min(...current.hours) <= 1,
            `Unequal hour sizes: ${current.hours}`,
          );
          assert.ok(
            Math.max(...current.hours) <= 96 + 1,
            "Text or event count inflated hour rows",
          );
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
  evidence.result = "HARNESS_OR_ASSERTION_FAILURE";
  evidence.failure = String(error.stack || error);
  if (browser) {
    const failedPage = browser.contexts()[0]?.pages()[0];
    if (failedPage) {
      await failedPage.screenshot({
        path: join(output, "failure.png"),
        fullPage: true,
      });
      evidence.focus = await failedPage.evaluate(() => ({
        scrollY,
        active: document.activeElement?.outerHTML.slice(0, 2000),
        rect: document.activeElement?.getBoundingClientRect().toJSON(),
        parent: document.activeElement?.parentElement && {
          rect: document.activeElement.parentElement
            .getBoundingClientRect()
            .toJSON(),
          scrollLeft: document.activeElement.parentElement.scrollLeft,
          scrollWidth: document.activeElement.parentElement.scrollWidth,
          overflowX: getComputedStyle(document.activeElement.parentElement)
            .overflowX,
        },
      }));
    }
  }
  console.error(error);
  exitCode = 1;
} finally {
  writeFileSync(
    join(output, "evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  if (browser) await browser.close();
  if (app) await app.stop("SIGKILL");
  if (!exitCode) releaseApplicationFixture(fixture);
}

if (exitCode) process.exitCode = exitCode;
