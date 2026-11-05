import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// #190: narrow Week view opens on the relevant day beside a sticky time
// gutter, keeps manual horizontal scrolling, and leaves pointer scheduling
// and desktop geometry intact. Disposable synthetic SQLite only.
const source = process.cwd();
const out = resolve("test-results/issue-190");
mkdirSync(out, { recursive: true });
const require = createRequire(join(source, "package.json"));
const { chromium, expect } = require("@playwright/test");
const Database = require("better-sqlite3");
const { createApplicationFixture, releaseApplicationFixture } = await import(
  pathToFileURL(join(source, "tests/sqlite/application-fixture.mjs"))
);
const { startApplication } = await import(
  pathToFileURL(join(source, "tests/sqlite/application-process.mjs"))
);
const f = await createApplicationFixture();
const { SqliteRuntime } = require(join(f.compiled, "runtime.js"));
const { issueOwnerContext } = require(join(f.compiled, "owner-context.js"));
const evidence = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  runId: randomUUID(),
  checks: [],
  errors: [],
  screenshots: [],
};
const pass = (name, detail = {}) => {
  evidence.checks.push({ name, status: "PASS", ...detail });
  console.log("PASS", name, JSON.stringify(detail));
};
const read = (sql, ...args) => {
  const db = new Database(f.path, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(sql).all(...args);
  } finally {
    db.close();
  }
};
const task = (id) =>
  read(
    "SELECT scheduled_start_at, duration_minutes FROM tasks WHERE user_id=? AND id=?",
    f.ownerId,
    id,
  )[0];
const berlin = (iso) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));

// A fixed future week: Thursday is the selected date, Saturday holds the
// handoff Task. Neither is the real today, so focus never relies on today.
const week = { thu: "2026-12-10", fri: "2026-12-11", sat: "2026-12-12" };
const ids = { thu: randomUUID(), sat: randomUUID() };
const titles = { thu: "190 Thursday block", sat: "190 Saturday block" };
{
  const s = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    s.command(issueOwnerContext(f.ownerId), "synthetic.seed", (db, owner) => {
      const insert = db.prepare(
        "INSERT INTO tasks(id,user_id,title,status,priority,planned_date,scheduled_start_at,duration_minutes,created_at,updated_at) VALUES(?,?,?,'planned','none',?,?,60,life_now(),life_now())",
      );
      insert.run(ids.thu, owner, titles.thu, week.thu, "2026-12-10T08:00:00.000000Z");
      insert.run(ids.sat, owner, titles.sat, week.sat, "2026-12-12T09:00:00.000000Z");
    });
  } finally {
    s.close();
  }
}

let app, browser, page;
const scroller = () =>
  page.locator('[data-calendar-section="week-grid"] .calendar-grid-scroll');
// Visible horizontal span of a day column beside the 56px sticky gutter.
const columnVisibility = (date) =>
  scroller().evaluate((sc, d) => {
    const r = sc.getBoundingClientRect();
    const c = sc.querySelector(`[data-calendar-date="${d}"]`).getBoundingClientRect();
    return {
      fullyVisible: c.left >= r.left + 56 - 1 && c.right <= r.right + 1,
      scrollLeft: Math.round(sc.scrollLeft),
    };
  }, date);
const gutter = () =>
  scroller().evaluate((sc) => {
    const r = sc.getBoundingClientRect();
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left - r.left, right: b.right - r.left, top: b.top, bottom: b.bottom };
    };
    const allDay = [...sc.querySelectorAll("div")].find(
      (d) => d.children.length === 0 && d.textContent.trim() === "All day",
    );
    const hour = sc.querySelector('[data-calendar-hour-line="12:00"]');
    const hb = hour.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + 20, hb.top + hb.height / 2);
    const line = sc.querySelector("[data-calendar-current-time-line]").getBoundingClientRect();
    return {
      start: box(sc.querySelector('[data-calendar-time-boundary="start"]')),
      end: box(sc.querySelector('[data-calendar-time-boundary="end"]')),
      allDay: box(allDay),
      hitIsGutter: hit?.closest("[data-calendar-hour-line]") !== null,
      lineTop: line.top,
      pill: box(sc.querySelector('[data-calendar-hour-line="06:00"] span')),
    };
  });
const inGutter = (b) => b.left >= -1 && b.right <= 57;
async function shot(name) {
  const file = join(out, `${name}.png`);
  await page.locator('[data-calendar-section="week-grid"]').screenshot({ path: file });
  evidence.screenshots.push(file);
}
async function open(path) {
  await page.goto(app.origin + path);
  await expect(page.locator('[data-calendar-section="week-grid"]')).toBeVisible();
  await page.waitForTimeout(400);
}
async function drag(from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10);
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

try {
  app = await startApplication(f, {
    timeZone: "UTC",
    distDir: process.env.LIFE_OS_E2E_DIST_DIR,
  });
  assert.notEqual(new URL(app.origin).port, "3000");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Europe/Berlin",
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => evidence.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydrat/i.test(m.text()))
      evidence.errors.push(m.text());
  });

  // 1. Direct open on the selected Thursday.
  await open(`/calendar?view=week&date=${week.thu}`);
  let v = await columnVisibility(week.thu);
  assert.ok(v.fullyVisible && v.scrollLeft > 0, JSON.stringify(v));
  pass("mobile direct open shows selected Thursday", v);
  await shot("mobile-1-direct");

  // 2. Task → Calendar handoff shows the selected Saturday block.
  await page.goto(`${app.origin}/tasks/${ids.sat}`);
  await page.getByRole("link", { name: "Termin im Kalender öffnen" }).first().click();
  await page.waitForURL(/\/calendar\?task=/);
  await page.waitForTimeout(400);
  v = await columnVisibility(week.sat);
  const satBlock = page
    .locator(`[data-calendar-date="${week.sat}"]`)
    .getByRole("button", { name: new RegExp(titles.sat) });
  await expect(satBlock).toHaveAttribute("aria-pressed", "true");
  assert.ok(v.fullyVisible, JSON.stringify(v));
  pass("mobile handoff shows selected Saturday block", v);
  await shot("mobile-2-handoff");

  // 3. Another week, Today, reload.
  await open(`/calendar?view=week&date=${week.thu}`);
  await page.getByRole("button", { name: "Next period" }).click();
  await page.waitForURL(/date=2026-12-17/);
  await page.waitForTimeout(400);
  v = await columnVisibility("2026-12-17");
  assert.ok(v.fullyVisible, JSON.stringify(v));
  pass("mobile next week shows the moved selected date", v);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.waitForTimeout(600);
  const today = new URL(page.url()).searchParams.get("date");
  v = await columnVisibility(today);
  assert.ok(v.fullyVisible, JSON.stringify({ today, ...v }));
  pass("mobile Today shows today's column", { today, ...v });
  await page.reload();
  await page.waitForTimeout(600);
  v = await columnVisibility(today);
  assert.ok(v.fullyVisible, JSON.stringify(v));
  pass("mobile reload keeps today's column visible", v);
  const pillMobile = await gutter();
  // Same geometry as the former label nested in the line (`-top-2`).
  assert.ok(Math.abs(pillMobile.pill.top - (pillMobile.lineTop - 8)) <= 1, JSON.stringify(pillMobile));
  assert.ok(inGutter(pillMobile.pill), JSON.stringify(pillMobile));
  pass("mobile current-time label aligned with time line", {
    offset: pillMobile.pill.top - pillMobile.lineTop,
  });

  // 4. Manual horizontal scroll survives selection, Escape and idle time.
  await open(`/calendar?view=week&date=${week.thu}`);
  await scroller().evaluate((sc) => {
    sc.scrollLeft -= 60;
  });
  await page.waitForTimeout(300);
  const manual = (await columnVisibility(week.thu)).scrollLeft;
  const thuBlock = page
    .locator(`[data-calendar-date="${week.thu}"]`)
    .getByRole("button", { name: new RegExp(titles.thu) });
  assert.ok((await columnVisibility(week.thu)).fullyVisible);
  await thuBlock.click();
  await expect(thuBlock).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(400);
  assert.equal((await columnVisibility(week.thu)).scrollLeft, manual);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
  assert.equal((await columnVisibility(week.thu)).scrollLeft, manual);
  pass("manual horizontal scroll survives selection, Escape and idle", { manual });

  // 5. Sticky gutter after scrolling to the far right.
  await scroller().evaluate((sc) => {
    sc.scrollLeft = sc.scrollWidth;
  });
  await page.waitForTimeout(300);
  const g = await gutter();
  for (const part of ["start", "end", "allDay"]) assert.ok(inGutter(g[part]), JSON.stringify(g));
  assert.equal(g.hitIsGutter, true, "gutter paints above day columns");
  pass("time gutter, All day and 00:00 stay visible at far right", g);
  await shot("mobile-3-far-right");

  // 6. Mobile pointer move within the visible span.
  await open(`/calendar?view=week&date=${week.thu}`);
  const before = (await columnVisibility(week.thu)).scrollLeft;
  // Bring the block into the page viewport vertically; horizontal position
  // must stay the one chosen by the Week surface.
  await thuBlock.scrollIntoViewIfNeeded();
  assert.equal((await columnVisibility(week.thu)).scrollLeft, before);
  const thuBox = await thuBlock.boundingBox();
  const friBox = await page.locator(`[data-calendar-date="${week.fri}"]`).boundingBox();
  await drag(
    { x: thuBox.x + thuBox.width / 2, y: thuBox.y + 10 },
    { x: friBox.x + friBox.width / 2, y: thuBox.y + 10 },
  );
  await expect
    .poll(() => berlin(task(ids.thu).scheduled_start_at).slice(0, 10))
    .toBe(week.fri);
  pass("mobile pointer move Thursday → Friday persisted", {
    scheduled: berlin(task(ids.thu).scheduled_start_at),
  });

  // 7. Desktop: no horizontal shift for a visible day, drag and resize.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(`/calendar?view=week&date=${week.thu}`);
  v = await columnVisibility(week.thu);
  assert.equal(v.scrollLeft, 0, JSON.stringify(v));
  pass("desktop opens unshifted with Thursday visible", v);
  await shot("desktop-1-open");
  const friBlock = page
    .locator(`[data-calendar-date="${week.fri}"]`)
    .getByRole("button", { name: new RegExp(titles.thu) });
  const fb = await friBlock.boundingBox();
  const thuCol = await page.locator(`[data-calendar-date="${week.thu}"]`).boundingBox();
  await drag(
    { x: fb.x + fb.width / 2, y: fb.y + 8 },
    { x: thuCol.x + thuCol.width / 2, y: fb.y + 8 },
  );
  await expect
    .poll(() => berlin(task(ids.thu).scheduled_start_at).slice(0, 10))
    .toBe(week.thu);
  pass("desktop pointer move Friday → Thursday persisted", {
    scheduled: berlin(task(ids.thu).scheduled_start_at),
  });
  const block = page
    .locator(`[data-calendar-date="${week.thu}"] [data-calendar-timed-block]`)
    .filter({ has: page.getByRole("button", { name: new RegExp(titles.thu) }) });
  const handle = block.locator("[data-calendar-resize-handle]");
  await block.hover();
  const hb = await handle.boundingBox();
  const hourHeight = await page
    .locator('[data-calendar-hour-line="12:00"]')
    .evaluate((e) => e.getBoundingClientRect().height);
  await drag(
    { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 },
    { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 + hourHeight / 2 },
  );
  await expect.poll(() => task(ids.thu).duration_minutes).toBe(90);
  pass("desktop resize +30 min persisted", task(ids.thu));
  await page.reload();
  await page.waitForTimeout(400);
  await expect(block).toBeVisible();
  pass("desktop block survives reload", task(ids.thu));

  assert.deepEqual(evidence.errors, []);
  pass("console and hydration clean");
  evidence.result = "PASS";
  console.log("PASS #190 browser", evidence.checks.length, "checks");
} catch (e) {
  evidence.result = "HARNESS_OR_ASSERTION_FAILURE";
  evidence.failure = String(e.stack || e);
  console.error(e);
  process.exitCode = 1;
} finally {
  writeFileSync(join(out, "evidence.json"), JSON.stringify(evidence, null, 2));
  if (browser) await browser.close();
  if (app) await app.stop("SIGKILL");
  if (!process.exitCode) releaseApplicationFixture(f);
}
