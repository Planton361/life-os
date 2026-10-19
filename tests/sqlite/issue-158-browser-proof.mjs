import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const baseRed = process.argv.includes("--base-red");
const config = {
  source: process.cwd(),
  root: resolve("test-results/issue-158"),
  sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
};
process.chdir(config.source);
const require = createRequire(join(config.source, "package.json"));
const { chromium, expect } = require("@playwright/test");
const Database = require("better-sqlite3");
const { createApplicationFixture, releaseApplicationFixture } = await import(
  pathToFileURL(join(config.source, "tests/sqlite/application-fixture.mjs"))
);
const { startApplication } = await import(
  pathToFileURL(join(config.source, "tests/sqlite/application-process.mjs"))
);
const f = await createApplicationFixture();
const { SqliteRuntime } = require(join(f.compiled, "runtime.js"));
const { issueOwnerContext } = require(join(f.compiled, "owner-context.js"));
const out = join(config.root, baseRed ? "base-red" : "head-green");
mkdirSync(out, { recursive: true });
const evidence = {
  revision: config.sha,
  runId: randomUUID(),
  isolation: {
    runtime: "sqlite-synthetic",
    presentation: "manual",
    sealedDisposable: true,
    serverTimezone: "UTC",
    browserTimezone: "America/Los_Angeles",
    portIs3000: false,
  },
  matrix: [],
  guards: [],
  errors: [],
  screenshots: [],
  entryLinks: [],
};
function command(body) {
  const s = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    return s.command(issueOwnerContext(f.ownerId), "synthetic.seed", body);
  } finally {
    s.close();
  }
}
function read(sql, ...args) {
  const db = new Database(f.path, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(sql).all(...args);
  } finally {
    db.close();
  }
}
const byTitle = (title) =>
  read("SELECT * FROM tasks WHERE user_id=? AND title=?", f.ownerId, title);
const task = (id) =>
  read("SELECT * FROM tasks WHERE user_id=? AND id=?", f.ownerId, id)[0];
const ids = {
  projectMilestone: randomUUID(),
  goalMilestone: randomUUID(),
  inbox: randomUUID(),
};
command((db, owner) => {
  db.prepare("UPDATE profiles SET timezone='Europe/Berlin' WHERE id=?").run(
    owner,
  );
  db.prepare(
    "INSERT INTO project_milestones(id,user_id,project_id,title,status,created_at,updated_at) VALUES(?,?,?,'158 Project Milestone','active',life_now(),life_now())",
  ).run(ids.projectMilestone, owner, f.ids.project);
  db.prepare(
    "INSERT INTO goal_milestones(id,user_id,goal_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,'158 Goal Milestone','active',0,life_now(),life_now())",
  ).run(ids.goalMilestone, owner, f.ids.goal);
  db.prepare(
    "INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,?,'158 disposable only',life_now(),life_now(),life_now())",
  ).run(ids.inbox, owner, "158 Inbox " + evidence.runId);
});
let app, browser, context, page;
const form = () =>
  page.getByRole("form", { name: "Task erstellen", exact: true });
const dialog = () =>
  page.getByRole("dialog", { name: "Task bearbeiten", exact: true });
async function openCreate(query = "") {
  await page.goto(app.origin + "/tasks/new" + query);
  await expect(form()).toBeVisible();
  await expect(form().locator('button[type="submit"]')).toBeEnabled();
}
async function create(name, day, query = "", beforeSubmit) {
  const title = "158 " + name + " " + randomUUID().slice(0, 8);
  await openCreate(query);
  await form().getByLabel("Titel", { exact: true }).fill(title);
  if (day !== undefined) {
    await form()
      .getByRole("button", { name: "Planung (optional)", exact: true })
      .click();
    await form().getByLabel("Deadline", { exact: true }).fill(day);
  }
  if (beforeSubmit) await beforeSubmit(form());
  await form().locator('button[type="submit"]').click();
  await expect.poll(() => byTitle(title).length).toBe(1);
  await expect(form()).toHaveCount(0);
  await page.reload();
  assert.equal(byTitle(title).length, 1);
  return { title, row: byTitle(title)[0] };
}
async function inspect(row) {
  await page.goto(app.origin + "/tasks/" + row.id);
  await page.reload();
  const planning = page.locator('[data-task-order="planning"]');
  const visiblePlanning = (await planning.innerText())
    .replace(/\s+/g, " ")
    .trim();
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  const localDay = await dialog()
    .getByLabel("Deadline", { exact: true })
    .inputValue();
  await dialog()
    .getByRole("button", { name: "Abbrechen", exact: true })
    .last()
    .click();
  return { localDay, visiblePlanning };
}
async function calendar(row, localDay) {
  await page.goto(app.origin + "/calendar?date=" + localDay + "&view=week");
  await page.reload();
  const m = page.locator("#calendar-focus-block-task-deadline-" + row.id);
  await expect(m).toBeVisible();
  await expect(m.locator("xpath=../..")).toHaveAttribute(
    "data-calendar-current-date",
    "true",
  );
  const visible = await m.innerText();
  await m.click();
  await expect(m).toHaveAttribute("aria-pressed", "true");
  return { day: localDay, visibleMarker: visible, selectedAfterClick: true };
}
async function profile(zone) {
  await page.goto("about:blank");
  await app.stop("SIGKILL");
  app = undefined;
  command((db, owner) =>
    db.prepare("UPDATE profiles SET timezone=? WHERE id=?").run(zone, owner),
  );
  app = await startApplication(f, { port: port, timeZone: "UTC" });
}
let port;
try {
  app = await startApplication(f, { timeZone: "UTC" });
  port = Number(new URL(app.origin).port);
  assert.notEqual(port, 3000);
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    timezoneId: evidence.isolation.browserTimezone,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => evidence.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      evidence.errors.push(m.text());
  });
  context.on("request", (r) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\//i.test(r.url()))
      evidence.errors.push("UNEXPECTED_PROVIDER_REQUEST");
  });
  const origins = [
    ["standalone", "", null, null],
    ["project", "?project=" + f.ids.project, f.ids.project, null],
    [
      "project-milestone",
      "?project=" + f.ids.project + "&milestone=" + ids.projectMilestone,
      f.ids.project,
      ids.projectMilestone,
    ],
    ["goal", "?goal=" + f.ids.goal, null, null],
    [
      "goal-milestone",
      "?goal=" + f.ids.goal + "&goalMilestone=" + ids.goalMilestone,
      null,
      null,
    ],
    ["skill", "?skill=" + f.ids.skill, null, null],
  ];
  for (const [name, query, project, milestone] of origins) {
    const result = await create(name, "2026-10-12", query),
      row = result.row;
    assert.equal(
      row.due_at,
      baseRed ? "2026-10-12T23:59:59.000000Z" : "2026-10-12T21:59:59.000000Z",
    );
    assert.equal(row.status, "planned");
    assert.equal(row.planned_date, null);
    assert.equal(row.scheduled_start_at, null);
    assert.equal(row.project_id, project);
    assert.equal(row.milestone_id, milestone);
    const ui = await inspect(row);
    assert.equal(ui.localDay, baseRed ? "2026-10-13" : "2026-10-12");
    const cal = await calendar(row, ui.localDay);
    if (name === "goal-milestone")
      assert.equal(
        read(
          "SELECT * FROM goal_milestone_task_support WHERE user_id=? AND task_id=? AND goal_milestone_id=?",
          f.ownerId,
          row.id,
          ids.goalMilestone,
        ).length,
        1,
      );
    if (name === "goal" || name === "goal-milestone")
      assert.equal(row.goal_id, f.ids.goal);
    if (name === "skill")
      assert.equal(
        read(
          "SELECT * FROM task_skill_links WHERE user_id=? AND task_id=? AND skill_id=?",
          f.ownerId,
          row.id,
          f.ids.skill,
        ).length,
        1,
      );
    evidence.matrix.push({
      origin: name,
      zone: "Europe/Berlin",
      input: "2026-10-12",
      actual: row.due_at,
      expected: "2026-10-12T21:59:59.000000Z",
      errorHours: baseRed ? 2 : 0,
      ...ui,
      calendar: cal,
      projectLinked: !!row.project_id,
      milestoneLinked: !!row.milestone_id,
    });
    console.log(baseRed ? "PASS RED origin" : "PASS GREEN origin", name);
    if (name === "standalone") {
      for (const [w, h] of [
        [3840, 2160],
        [1920, 1080],
        [390, 844],
      ]) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(app.origin + "/tasks/" + row.id);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        const name = "task-" + w + ".png";
        await page.screenshot({ path: join(out, name), fullPage: true });
        evidence.screenshots.push(name);
      }
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      await dialog()
        .getByLabel("Titel", { exact: true })
        .fill(result.title + " no-op");
      await dialog()
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(dialog()).toBeHidden();
      await page.reload();
      assert.equal(task(row.id).due_at, row.due_at);
      await page
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      await dialog().getByLabel("Deadline", { exact: true }).fill("2026-10-12");
      await dialog()
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(dialog()).toBeHidden();
      await page.reload();
      assert.equal(task(row.id).due_at, "2026-10-12T21:59:59.000000Z");
      evidence.guards.push({
        name: "#155 title-only preserves original bytes; deliberate day replacement fixes chosen task",
        status: "PASS",
        before: row.due_at,
        after: task(row.id).due_at,
      });
    }
  }
  await page.goto(app.origin + "/inbox?item=" + ids.inbox);
  const active = page.locator('[data-inbox-section="active-item"]');
  await active.getByLabel("Deadline hint", { exact: true }).fill("2026-10-12");
  await active
    .getByRole("button", { name: "Standalone Task", exact: true })
    .click();
  await active
    .getByRole("button", { name: "Einordnen & abschließen", exact: true })
    .click();
  await expect(
    page
      .locator('[aria-label="Letztes Routing"]')
      .getByRole("link", { name: "Ziel öffnen", exact: true }),
  ).toBeVisible();
  const inbox = read(
    "SELECT * FROM tasks WHERE user_id=? AND source_inbox_item_id=?",
    f.ownerId,
    ids.inbox,
  );
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].due_at, "2026-10-12T21:59:59.000000Z");
  const iu = await inspect(inbox[0]);
  assert.equal(iu.localDay, "2026-10-12");
  evidence.matrix.push({
    origin: "inbox-triage-control",
    zone: "Europe/Berlin",
    input: "2026-10-12",
    actual: inbox[0].due_at,
    expected: inbox[0].due_at,
    ...iu,
    calendar: await calendar(inbox[0], iu.localDay),
  });
  const cases = [
    [
      "Europe/Berlin",
      "2026-01-31",
      "2026-01-31T22:59:59.000000Z",
      "2026-02-01",
    ],
    [
      "Europe/Berlin",
      "2026-03-28",
      "2026-03-28T22:59:59.000000Z",
      "2026-03-29",
    ],
    [
      "Europe/Berlin",
      "2026-03-29",
      "2026-03-29T21:59:59.000000Z",
      "2026-03-30",
    ],
    [
      "Europe/Berlin",
      "2026-07-31",
      "2026-07-31T21:59:59.000000Z",
      "2026-08-01",
    ],
    [
      "Europe/Berlin",
      "2026-10-24",
      "2026-10-24T21:59:59.000000Z",
      "2026-10-25",
    ],
    [
      "Europe/Berlin",
      "2026-10-25",
      "2026-10-25T22:59:59.000000Z",
      "2026-10-26",
    ],
    [
      "Europe/Berlin",
      "2026-12-31",
      "2026-12-31T22:59:59.000000Z",
      "2027-01-01",
    ],
    [
      "America/Los_Angeles",
      "2026-03-08",
      "2026-03-09T06:59:59.000000Z",
      "2026-03-08",
    ],
    [
      "America/Los_Angeles",
      "2026-11-01",
      "2026-11-02T07:59:59.000000Z",
      "2026-11-01",
    ],
    [
      "America/Los_Angeles",
      "2026-12-31",
      "2027-01-01T07:59:59.000000Z",
      "2026-12-31",
    ],
    ["Asia/Tokyo", "2027-01-01", "2027-01-01T14:59:59.000000Z", "2027-01-02"],
    [
      "Pacific/Auckland",
      "2026-09-27",
      "2026-09-27T10:59:59.000000Z",
      "2026-09-28",
    ],
  ];
  let currentZone = "Europe/Berlin";
  for (const [zone, day, expected, shown] of cases) {
    if (zone !== currentZone) {
      await profile(zone);
      currentZone = zone;
    }
    const { row } = await create("matrix-" + zone + "-" + day, day);
    assert.equal(row.due_at, baseRed ? day + "T23:59:59.000000Z" : expected);
    const ui = await inspect(row);
    assert.equal(ui.localDay, baseRed ? shown : day);
    evidence.matrix.push({
      origin: "standalone",
      zone,
      input: day,
      actual: row.due_at,
      expected,
      errorHours: (Date.parse(row.due_at) - Date.parse(expected)) / 3600000,
      ...ui,
      calendar: await calendar(row, ui.localDay),
    });
    console.log(baseRed ? "PASS RED zone" : "PASS GREEN zone", zone, day);
  }
  await profile("Europe/Berlin");
  for (const kind of ["empty", "missing"]) {
    const { row } = await create(
      "no-deadline-" + kind,
      kind === "empty" ? "" : undefined,
      "",
      kind === "missing"
        ? async (f) => {
            await f.locator('[name="dueAt"]').evaluate((e) => e.remove());
          }
        : undefined,
    );
    assert.equal(row.due_at, null);
    assert.equal(row.planned_date, null);
    assert.equal(row.scheduled_start_at, null);
    evidence.guards.push({
      name: "deadline " + kind,
      status: "PASS",
      actual: null,
    });
  }
  const invalidTitle = "158 invalid " + randomUUID();
  await openCreate();
  await form().getByLabel("Titel", { exact: true }).fill(invalidTitle);
  await form()
    .getByRole("button", { name: "Planung (optional)", exact: true })
    .click();
  await form()
    .getByLabel("Deadline", { exact: true })
    .evaluate((e) => {
      e.type = "text";
      e.value = "2026-02-30";
    });
  await form().locator('button[type="submit"]').click();
  await expect(form().getByRole("alert")).toBeVisible();
  if (!baseRed)
    await expect(form().getByRole("alert")).toContainText(
      "Deadline oder Profil-Zeitzone",
    );
  assert.equal(byTitle(invalidTitle).length, 0);
  evidence.guards.push({
    name: "invalid calendar day server validation",
    status: "PASS",
    message: await form().getByRole("alert").innerText(),
    rows: 0,
  });
  const cancelTitle = "158 cancel " + randomUUID();
  await openCreate();
  await form().getByLabel("Titel", { exact: true }).fill(cancelTitle);
  await form().getByRole("link", { name: "Abbrechen", exact: true }).click();
  assert.equal(byTitle(cancelTitle).length, 0);
  evidence.guards.push({ name: "Cancel retains no Task", status: "PASS" });
  await openCreate();
  await form()
    .getByRole("button", { name: "Planung (optional)", exact: true })
    .click();
  await form().getByLabel("Deadline", { exact: true }).focus();
  await expect(form().getByLabel("Deadline", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    form().getByRole("button", { name: "Planung (optional)", exact: true }),
  ).toBeFocused();
  evidence.guards.push({
    name: "Create disclosure deadline keyboard/Escape focus",
    status: "PASS",
  });
  for (const mode of ["demo", "empty"]) {
    const count = read(
      "SELECT count(*) n FROM tasks WHERE user_id=?",
      f.ownerId,
    )[0].n;
    await context.addCookies([
      { name: "life_os_profile", value: mode, url: app.origin },
    ]);
    await page.goto(app.origin + "/tasks/new");
    assert.equal(await form().count(), 0);
    assert.equal(
      read("SELECT count(*) n FROM tasks WHERE user_id=?", f.ownerId)[0].n,
      count,
    );
    evidence.guards.push({
      name: mode + " no create form or write",
      status: "PASS",
    });
  }
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  await page.goto("about:blank");
  await app.stop("SIGKILL");
  app = await startApplication(f, {
    port,
    timeZone: "UTC",
    authentication: "blocked",
  });
  const count = read(
    "SELECT count(*) n FROM tasks WHERE user_id=?",
    f.ownerId,
  )[0].n;
  await page.goto(app.origin + "/tasks/new");
  assert.equal(await form().count(), 0);
  assert.equal(
    read("SELECT count(*) n FROM tasks WHERE user_id=?", f.ownerId)[0].n,
    count,
  );
  evidence.guards.push({
    name: "auth-blocked no create form or write",
    status: "PASS",
  });
  assert.deepEqual(evidence.errors, []);
  evidence.result = baseRed ? "PASS_BASE_RED" : "PASS_HEAD_GREEN";
  console.log(
    "PASS #158 browser",
    evidence.matrix.length,
    "matrix rows",
    evidence.guards.length,
    "guards",
  );
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
