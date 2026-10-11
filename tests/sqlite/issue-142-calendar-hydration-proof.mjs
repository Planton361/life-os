import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  lstatSync,
} from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { chromium, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { compileRuntime } from "./compile-runtime.mjs";
import { freePort } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");
const preview = process.argv.includes("--preview");
// Baseline mode requires a separate disposable checkout; candidate/CI mode
// always fails on every pageerror, console error and HTTP 5xx.
const baseline = process.argv.includes("--expect-mismatch");
const source = process.env.LIFE_OS_CALENDAR_BASELINE_SOURCE
  ? realpathSync(process.env.LIFE_OS_CALENDAR_BASELINE_SOURCE)
  : process.cwd();
assert.equal(Boolean(process.env.LIFE_OS_CALENDAR_BASELINE_SOURCE), baseline);
if (baseline)
  assert.ok(source.startsWith(`${realpathSync(tmpdir())}/life-os-`));
const root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-142-calendar-"));
const path = join(root, "canonical.db"),
  clock = join(root, "calendar-clock.txt");
const owner = randomUUID(),
  login = "disposable-owner@example.test";
const origin = "https://reset-fixture.owner-tailnet.ts.net";
const compiled = compileRuntime([
  "src/features/real-data/sqlite/production-bootstrap.ts",
]);
const require = createRequire(import.meta.url);
const native = (name) => require(join(compiled, `${name}.js`));
native("production-bootstrap").bootstrapProductionDatabase(path, {
  ownerId: owner,
  displayName: "Disposable Calendar",
  timezone: "Europe/Berlin",
});
const stat = lstatSync(path);
const grantPath = join(root, "grant.json");
if (preview) {
  writeFileSync(
    grantPath,
    JSON.stringify({
      version: 2,
      schema: 10,
      instance: randomUUID(),
      host: hostname(),
      uid: process.getuid(),
      device: stat.dev,
      inode: stat.ino,
      owner,
      origin,
      login,
    }),
    { mode: 0o600 },
  );
  writeFileSync(
    join(source, ".next/life-preview-composition.json"),
    JSON.stringify({
      version: 2,
      buildId: readFileSync(join(source, ".next/BUILD_ID"), "utf8").trim(),
    }),
    { mode: 0o600 },
  );
}
const output = resolve("test-results/issue-142-calendar");
mkdirSync(output, { recursive: true });
const label = baseline ? "baseline" : preview ? "preview" : "standard";
const port = await freePort(),
  backend = `http://127.0.0.1:${port}`;
const errors = [],
  consoleErrors = [],
  serverErrors = [],
  unexpectedRequests = [],
  failedGets = [];
let child,
  browser,
  logs = "";
function setClock(value) {
  writeFileSync(clock, value, { mode: 0o600 });
}
function fingerprint() {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return Object.fromEntries(
      native("canonical-catalog").canonicalTableNames.map((table) => {
        const rows = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
        return [
          table,
          {
            count: rows.length,
            hash: createHash("sha256")
              .update(JSON.stringify(rows))
              .digest("hex"),
          },
        ];
      }),
    );
  } finally {
    db.close();
  }
}
const before = fingerprint();
function forward(url, headers = {}, authenticated = true) {
  return new Promise((done, reject) => {
    const req = httpRequest(
      backend + new URL(url).pathname + new URL(url).search,
      {
        method: "GET",
        headers: {
          ...headers,
          host: new URL(authenticated ? origin : url).host,
          ...(authenticated ? { "tailscale-user-login": login } : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          done({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
        response.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}
async function context(
  profile = "manual",
  authenticated = true,
  javaScriptEnabled = true,
) {
  const c = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    javaScriptEnabled,
    timezoneId: "Europe/Berlin",
  });
  const browserOrigin = authenticated ? origin : `http://localhost:${port}`;
  await c.addCookies([
    {
      name: "life_os_profile",
      value: profile,
      url: browserOrigin,
      secure: authenticated,
    },
  ]);
  await c.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.method() !== "GET" ||
      new URL(request.url()).origin !== browserOrigin
    ) {
      unexpectedRequests.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
      });
      await route.abort();
      return;
    }
    const headers = { ...request.headers() };
    delete headers["content-length"];
    delete headers["accept-encoding"];
    try {
      const result = await forward(request.url(), headers, authenticated);
      if (result.status >= 500)
        serverErrors.push({
          path: new URL(request.url()).pathname,
          status: result.status,
        });
      const responseHeaders = Object.fromEntries(
        Object.entries(result.headers)
          .filter(
            ([key]) =>
              ![
                "transfer-encoding",
                "content-length",
                "content-encoding",
              ].includes(key),
          )
          .map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join("\n") : String(value),
          ]),
      );
      await route.fulfill({
        status: result.status,
        headers: responseHeaders,
        body: result.body,
      });
    } catch (error) {
      // A document navigation can cancel an already forwarded GET. Keep its
      // evidence separate; hydration errors are never filtered.
      if (
        !/Invalid InterceptionId|Target.*closed|Response has been disposed/i.test(
          String(error),
        )
      )
        throw error;
    }
  });
  c.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    p.on("requestfailed", (r) =>
      failedGets.push({
        method: r.method(),
        hydration: javaScriptEnabled,
        path: new URL(r.url()).pathname,
        type: r.resourceType(),
        error: r.failure()?.errorText,
      }),
    );
  });
  return c;
}
async function settled(page) {
  await expect(page.locator("#calendar-page")).toBeVisible();
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
  await page.waitForTimeout(200);
}
async function labels(page) {
  return page
    .locator(".calendar-grid-content > div:first-child > div")
    .allTextContents();
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await Promise.race([
    done,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DISPOSABLE_SHUTDOWN_TIMEOUT")), 10000),
    ),
  ]);
}
const evidence = {
  result: "FAIL",
  composition: label,
  disposable: true,
  personalInstance: "UNTOUCHED",
  cases: [],
};
try {
  setClock("2026-10-10T12:00:00.000Z");
  child = spawn(
    process.execPath,
    [
      "--import",
      resolve("tests/sqlite/disposable-hosted-port.mjs"),
      "--import",
      resolve("tests/sqlite/disposable-calendar-clock.mjs"),
      preview
        ? "scripts/ops/run-preview-production.mjs"
        : "scripts/ops/run-production.mjs",
    ],
    {
      cwd: source,
      env: {
        PATH: process.env.PATH,
        TMPDIR: realpathSync(tmpdir()),
        NODE_ENV: "production",
        LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
        LIFE_OS_HOSTED_SQLITE_PATH: path,
        LIFE_OS_HOSTED_ORIGIN: origin,
        LIFE_OS_HOSTED_OWNER_LOGIN: login,
        LIFE_OS_DISPOSABLE_HOSTED_PORT: String(port),
        LIFE_OS_DISPOSABLE_CALENDAR_CLOCK: clock,
        ...(preview ? { LIFE_OS_PREVIEW_GRANT_PATH: grantPath } : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (b) => (logs += b));
  child.stderr.on("data", (b) => (logs += b));
  let warm;
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(logs);
    try {
      warm = await forward(origin + "/calendar", {
        cookie: "life_os_profile=manual",
      });
    } catch {
      /* isolated startup */
    }
    if (warm?.status === 200 || warm?.status >= 500) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(warm?.status, 200, logs);
  assert.ok(warm.body.toString().includes("Sat"));
  const pid = child.pid;
  browser = await chromium.launch({ headless: true });
  const ssrContext = await context("manual", true, false),
    ssr = await ssrContext.newPage();
  await ssr.goto(origin + "/calendar");
  const initializationLabels = await labels(ssr);
  assert.ok(initializationLabels.some((s) => /Sat\s*10\s*Today/.test(s)));
  setClock("2026-10-11T12:00:00.000Z");
  const c = await context(),
    page = await c.newPage();
  await page.clock.setFixedTime(new Date("2026-10-11T12:00:00.000Z"));
  await ssr.goto(origin + "/calendar");
  const serverLabels = await labels(ssr);
  await page.goto(origin + "/today");
  await page.goto(origin + "/calendar");
  await settled(page);
  const navigationLabels = await labels(page);
  await page.reload();
  await settled(page);
  const reloadLabels = await labels(page);
  evidence.dayChange = {
    initialized: "2026-10-10",
    requested: "2026-10-11",
    sameServerProcess: child.pid === pid,
    initializationLabels,
    serverLabels,
    navigationLabels,
    reloadLabels,
  };
  assert.equal(child.pid, pid);
  if (baseline) {
    assert.equal(errors.filter((e) => e.includes("#418")).length, 2);
    assert.equal(errors.length, 2);
    assert.deepEqual(consoleErrors, []);
    assert.notDeepEqual(serverLabels, navigationLabels);
    assert.notDeepEqual(serverLabels, reloadLabels);
    evidence.result = "EXPECTED_MISMATCH_REPRODUCED";
  } else {
    assert.deepEqual(navigationLabels, serverLabels);
    assert.deepEqual(reloadLabels, serverLabels);
    assert.equal(serverLabels.filter((s) => s.includes("Today")).length, 1);
    assert.ok(serverLabels.some((s) => /Sun\s*11\s*Today/.test(s)));
    evidence.cases.push("long-lived server day change / navigation / reload");
    const calendar = page.locator("#calendar-page");
    for (const [view, date, nextDate] of [
      ["week", "2026-10-09", "2026-10-16"],
      ["day", "2026-10-09", "2026-10-10"],
      ["month", "2026-10-09", "2026-11-09"],
      ["year", "2025-10-09", "2026-10-09"],
    ]) {
      await page.goto(`${origin}/calendar?date=${date}&view=${view}`);
      await settled(page);
      await expect(
        calendar.locator(
          `[aria-labelledby="calendar-${view === "week" ? "week-surface" : view + "-surface"}-heading"]`,
        ),
      ).toBeVisible();
      const originalUrl = page.url();
      await calendar
        .getByRole("button", { name: "Next period", exact: true })
        .click();
      assert.equal(new URL(page.url()).searchParams.get("date"), nextDate);
      await expect(
        calendar.getByRole("button", { name: "Next period", exact: true }),
      ).toBeFocused();
      await calendar
        .getByRole("button", { name: "Previous period", exact: true })
        .click();
      assert.equal(page.url(), originalUrl);
      await calendar
        .getByRole("button", { name: "Today", exact: true })
        .click();
      await expect(
        calendar.getByRole("button", { name: "Today", exact: true }),
      ).toBeFocused();
      assert.equal(new URL(page.url()).searchParams.get("date"), "2026-10-11");
      assert.equal(new URL(page.url()).searchParams.get("view"), view);
      await page.reload();
      await settled(page);
      evidence.cases.push(
        `explicit ${view} / period controls / Today / reload`,
      );
    }
    await calendar.getByRole("button", { name: "Month", exact: true }).click();
    const monthDay = calendar.locator('[data-calendar-month-day="2026-10-11"]');
    await expect(monthDay).toHaveClass(/bg-\[rgba\(95,200,215,\.055\)\]/);
    await monthDay.getByRole("button", { name: /^Open day/ }).click();
    assert.equal(new URL(page.url()).searchParams.get("view"), "day");
    for (const view of ["Week", "Month", "Day"]) {
      await calendar.getByRole("button", { name: view, exact: true }).click();
      assert.equal(
        new URL(page.url()).searchParams.get("view"),
        view.toLowerCase(),
      );
    }
    evidence.cases.push("month Today highlight / open day / view buttons");
    // Berlin has already crossed midnight while the unchanged UTC policy has not.
    setClock("2026-10-10T22:30:00.000Z");
    await page.clock.setFixedTime(new Date("2026-10-10T22:30:00.000Z"));
    await page.goto(origin + "/calendar");
    await settled(page);
    await ssr.goto(origin + "/calendar");
    assert.deepEqual(await labels(page), await labels(ssr));
    await expect(
      calendar.locator(
        '.calendar-grid-content > div:first-child > [data-calendar-current-date="true"]',
      ),
    ).toContainText("Today");
    await calendar.getByRole("button", { name: "Today", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("date"), "2026-10-11");
    await page.goto(origin + "/calendar?date=2026-10-09&view=month");
    await settled(page);
    await expect(
      calendar.locator('[data-calendar-month-day="2026-10-11"]'),
    ).toHaveClass(/bg-\[rgba\(95,200,215,\.055\)\]/);
    await expect(
      calendar.locator('[data-calendar-month-day="2026-10-10"]'),
    ).not.toHaveClass(/bg-\[rgba\(95,200,215,\.055\)\]/);
    evidence.cases.push("UTC 10 / existing Berlin local 11");
    for (const [profile, authenticated, today] of [
      ["demo", true, "2026-10-10"],
      ["empty", true, "2026-10-10"],
      ["manual", false, "2026-10-11"],
    ]) {
      const other = await context(profile, authenticated),
        p = await other.newPage();
      await p.clock.setFixedTime(new Date("2026-10-10T22:30:00.000Z"));
      await p.goto(
        (authenticated ? origin : `http://localhost:${port}`) + "/calendar",
      );
      await settled(p);
      if (!authenticated)
        await expect(
          p.getByRole("complementary", { name: "Manual DB Auth Status" }),
        ).toContainText("Manual-Daten gesperrt");
      await p
        .locator("#calendar-page")
        .getByRole("button", { name: "Today", exact: true })
        .click();
      assert.equal(new URL(p.url()).searchParams.get("date"), today);
      await p.reload();
      await settled(p);
      for (const view of ["day", "month", "year"]) {
        const browserOrigin = authenticated
          ? origin
          : `http://localhost:${port}`;
        await p.goto(`${browserOrigin}/calendar?date=2026-10-09&view=${view}`);
        await settled(p);
        await expect(
          p.locator(`[aria-labelledby="calendar-${view}-surface-heading"]`),
        ).toBeVisible();
        if (view === "month")
          await expect(
            p.locator(`[data-calendar-month-day="${today}"]`),
          ).toHaveClass(/bg-\[rgba\(95,200,215,\.055\)\]/);
        await p
          .locator("#calendar-page")
          .getByRole("button", { name: "Today", exact: true })
          .click();
        assert.equal(new URL(p.url()).searchParams.get("date"), today);
        await p.reload();
        await settled(p);
      }
      evidence.cases.push(
        `${profile} ${authenticated ? "profile" : "localhost auth-blocked"} / all views / Today / reload`,
      );
      await other.close();
    }
    for (const route of ["/today", "/dashboard"]) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200);
      await page.reload();
      await page
        .getByRole("link", { name: "Calendar", exact: true })
        .first()
        .click();
      await settled(page);
    }
    evidence.cases.push("Today / Dashboard read projections");
    await page.goto(origin + "/calendar");
    await settled(page);
    for (const [name, width, height] of [
      ["4k", 3840, 2160],
      ["desktop", 1920, 1080],
      ["mobile", 390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      const bounds = await calendar.boundingBox();
      assert.ok(
        bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
        JSON.stringify(bounds),
      );
      await page.screenshot({
        path: join(output, `${label}-${name}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    evidence.cases.push("4K / desktop / mobile workspace bounds");
    evidence.result = "PASS";
  }
  assert.deepEqual(serverErrors, []);
  assert.deepEqual(unexpectedRequests, []);
  assert.ok(!/SQLITE_|Error:|unhandled/i.test(logs), logs);
  await c.close();
  await ssrContext.close();
} finally {
  await browser?.close();
  await stop();
  assert.deepEqual(
    fingerprint(),
    before,
    "83 canonical table counts and hashes unchanged",
  );
  assert.equal(lstatSync(path).ino, stat.ino);
  evidence.database =
    "83 table counts/hashes and inode unchanged; no reset, no Actions";
  evidence.pageerrors = errors;
  evidence.consoleErrors = consoleErrors;
  evidence.http5xx = serverErrors;
  evidence.unexpectedRequests = unexpectedRequests;
  evidence.failedGets = failedGets;
  writeFileSync(
    join(output, `${label}.json`),
    JSON.stringify(evidence, null, 2),
  );
  writeFileSync(join(output, `${label}.log`), logs, { mode: 0o600 });
}
console.log(
  `CALENDAR_HYDRATION_${evidence.result} ${label}: ${evidence.cases.length} cases; ${errors.length} pageerrors; ${failedGets.length} failed GETs (separate evidence)`,
);
