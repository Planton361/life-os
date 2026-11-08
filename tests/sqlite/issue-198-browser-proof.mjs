import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// #198: a Project is completed directly with the header „Erledigt“ — no
// result, Criteria or Review — and can be reopened any number of times. Every
// completion/Reopen is in History; explicit Review and legacy completions keep
// their labels. Read-only DB snapshots prove persistence and untouched work.
assert.equal(process.versions.node, "24.21.0");
const require = createRequire(import.meta.url),
  Database = require("better-sqlite3");
const out = resolve("test-results/issue-198");
mkdirSync(out, { recursive: true });
const tag = `F198-${Date.now().toString(36)}`;
const f = await createApplicationFixture();
const native = (name) => require(join(f.compiled, `${name}.js`));
const legacyId = randomUUID(),
  archivedId = randomUUID();
{
  // Legacy shapes exist only from before Project Depth; seed them directly.
  const { SqliteRuntime } = native("runtime"),
    { issueOwnerContext } = native("owner-context");
  const store = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    store.command(
      issueOwnerContext(f.ownerId),
      "synthetic.initialize",
      (db) => {
        for (const [id, title, status, archived] of [
          [legacyId, `${tag} Legacy`, "completed", null],
          [
            archivedId,
            `${tag} Archiviert`,
            "archived",
            new Date().toISOString(),
          ],
        ])
          db.prepare(
            "INSERT INTO projects(id,user_id,title,status,created_at,updated_at,archived_at) VALUES(?,?,?,?,life_now(),life_now(),?)",
          ).run(id, f.ownerId, title, status, archived);
      },
    );
  } finally {
    store.close();
  }
}
const log = [];
const step = (s) => {
  log.push(s);
  process.stdout.write(`PASS ${s}\n`);
};
const db = (fn) => {
  const r = new Database(f.path, { readonly: true });
  try {
    return fn(r);
  } finally {
    r.close();
  }
};
const projectRow = (id) =>
  db((r) =>
    r
      .prepare(
        "SELECT status,completion_revision,completion_cycle FROM projects WHERE id=?",
      )
      .get(id),
  );
const events = (id) =>
  db((r) =>
    r
      .prepare(
        "SELECT event_kind,prior_status,resulting_status,cycle_before,cycle_after,prior_completion_kind,recorded_at FROM project_lifecycle_events WHERE project_id=? ORDER BY revision_after",
      )
      .all(id),
  );
const reviewCount = (id) =>
  db(
    (r) =>
      r
        .prepare("SELECT count(*) AS n FROM project_reviews WHERE project_id=?")
        .get(id).n,
  );
const work = (id) =>
  db((r) => ({
    tasks: r
      .prepare(
        "SELECT id,title,status,completed_at,milestone_id,updated_at FROM tasks WHERE project_id=? ORDER BY id",
      )
      .all(id),
    milestones: r
      .prepare(
        "SELECT id,title,status,updated_at FROM project_milestones WHERE project_id=? ORDER BY id",
      )
      .all(id),
  }));
let app,
  browser,
  passed = false;
const errors = [];
try {
  app = await startApplication(f, {
    distDir: process.env.LIFE_OS_E2E_DIST_DIR,
  });
  assert.notEqual(new URL(app.origin).port, "3000");
  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await ctx.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const listen = (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error" || /hydration/i.test(m.text()))
        errors.push(m.text());
    });
  };
  listen(page);
  const root = page.locator('[data-entity-workbench="project"]');
  const header = root.locator("header");
  const closure = root.getByRole("region", {
    name: "Project Abschluss",
    exact: true,
  });
  const done = header.getByRole("button", { name: "Erledigt", exact: true });
  const history = page.getByRole("dialog", {
    name: "Abschlussverlauf",
    exact: true,
  });
  const reload = async () => {
    await page.reload();
    await expect(root).toBeVisible();
  };
  const go = async (id) => {
    await page.goto(`${app.origin}/projects/${id}`);
    await expect(root).toBeVisible();
  };
  async function createProject(title) {
    await page.goto(`${app.origin}/projects/new`);
    await page.getByLabel("Titel", { exact: true }).fill(title);
    await page.locator('select[name="status"]').selectOption("active");
    await page
      .getByRole("button", { name: "Project erstellen", exact: true })
      .click();
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
    await expect(root.locator("h1")).toHaveText(title);
    return page.url().match(/\/projects\/([0-9a-f-]{36})/)[1];
  }
  async function reopen() {
    await closure
      .getByRole("button", { name: "Project wieder öffnen", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Wiederöffnung bestätigen",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Project wieder öffnen", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(header).toContainText("Aktiv");
  }
  async function openHistory() {
    await root
      .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
      .click();
    await expect(history).toBeVisible();
    const text = (await history.innerText()).replace(/\s+/g, " ");
    await page.keyboard.press("Escape");
    await expect(history).toBeHidden();
    return text;
  }
  const today = new Date().toLocaleDateString("de-DE");

  // ---- 1: direct completion without result/Criteria, with open work ----
  const pid = await createProject(`${tag} Direkt`);
  await expect(
    root.getByRole("region", {
      name: "Project Ergebnis und Kriterien",
      exact: true,
    }),
  ).toHaveCount(0);
  await root.getByRole("button", { name: "+ Milestone", exact: true }).click();
  const ms = page.getByRole("dialog", {
    name: "Weitere Work-Optionen",
    exact: true,
  });
  await ms.locator('[name="title"]').first().fill(`${tag} Offener Milestone`);
  await ms
    .getByRole("button", { name: "Milestone erstellen", exact: true })
    .click();
  await expect(ms).toBeHidden();
  await page.goto(
    `${app.origin}/tasks/new?${new URLSearchParams({ project: pid })}`,
  );
  await page.locator('input[name="title"]').fill(`${tag} Offene Task`);
  await page
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await page.waitForURL((u) => !u.pathname.endsWith("/tasks/new"));
  await go(pid);
  const before = work(pid);
  assert.equal(before.tasks.length, 1);
  assert.equal(before.milestones.length, 1);
  await expect(done).toBeVisible();
  await expect(done).toHaveClass(/primaryAction/);
  await page.screenshot({
    path: join(out, "active-header-1920.png"),
    fullPage: true,
  });
  await done.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Project abgeschlossen." }),
  ).toBeVisible();
  await expect(header).toContainText("Abgeschlossen");
  await reload();
  await expect(header).toContainText("Abgeschlossen");
  await expect(closure).toContainText("Project abgeschlossen");
  await expect(closure).toContainText(
    `Zyklus 1 · Direkt abgeschlossen am ${today}`,
  );
  await expect(closure).not.toContainText("Ohne gespeicherten Review");
  await expect(
    closure.getByRole("link", { name: "Abschluss-Review ansehen" }),
  ).toHaveCount(0);
  for (const name of ["Erledigt", "Bearbeiten", "Mehr", "Abschluss prüfen"])
    await expect(root.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  assert.equal(projectRow(pid).status, "completed");
  assert.equal(reviewCount(pid), 0);
  const first = events(pid);
  assert.equal(first.length, 1);
  assert.deepEqual(
    {
      ...first[0],
      recorded_at: typeof first[0].recorded_at,
    },
    {
      event_kind: "completed",
      prior_status: "active",
      resulting_status: "completed",
      cycle_before: 0,
      cycle_after: 0,
      prior_completion_kind: null,
      recorded_at: "string",
    },
  );
  assert.deepEqual(work(pid), before, "Tasks/Milestones are not changed");
  let text = await openHistory();
  assert.match(text, /Direkt abgeschlossen · active → completed/);
  assert.doesNotMatch(text, /ohne gespeicherten Review/);
  step(
    "Direct: header „Erledigt“ (primary) completes a Project without result/Criteria/Review; toast; reload shows „Direkt abgeschlossen am <heute>“, no Review link, edit/review controls hidden; DB one `completed` fact, 0 Reviews, Task+Milestone unchanged; History lists it",
  );
  await page.screenshot({
    path: join(out, "completed-direct-1920.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 3840, height: 2160 });
  await expect(closure).toContainText("Direkt abgeschlossen");
  await page.screenshot({
    path: join(out, "completed-direct-3840.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });

  // ---- 2: repeated cycles ----
  await reopen();
  await reload();
  await expect(done).toBeVisible();
  await done.click();
  await expect(header).toContainText("Abgeschlossen");
  await reload();
  await expect(closure).toContainText("Zyklus 2 · Direkt abgeschlossen am");
  await reopen();
  await reload();
  await expect(header).toContainText("Aktiv");
  await expect(done).toBeVisible();
  assert.deepEqual(
    events(pid).map((e) => [e.event_kind, e.prior_completion_kind]),
    [
      ["completed", null],
      ["reopened", "direct"],
      ["completed", null],
      ["reopened", "direct"],
    ],
  );
  assert.equal(projectRow(pid).completion_cycle, 2);
  assert.equal(reviewCount(pid), 0);
  assert.deepEqual(work(pid), before);
  text = await openHistory();
  assert.equal(
    text.match(/Direkt abgeschlossen · active → completed/g).length,
    2,
  );
  assert.equal(text.match(/Wieder geöffnet · completed → active/g).length, 2);
  assert.equal(text.match(/vorher direkt abgeschlossen/g).length, 2);
  step(
    "Cycles: complete → reopen → complete → reopen through the UI; each reload stable; DB 4 lifecycle facts (completed / reopened·direct ×2), cycle 2, still 0 Reviews, work unchanged; History shows both completions and both Reopens as „vorher direkt abgeschlossen“",
  );

  // ---- 3: stale second tab is refused visibly ----
  const other = await ctx.newPage();
  listen(other);
  await other.goto(`${app.origin}/projects/${pid}`);
  const otherDone = other
    .locator('[data-entity-workbench="project"] header')
    .getByRole("button", { name: "Erledigt", exact: true });
  await expect(otherDone).toBeVisible();
  await done.click();
  await expect(header).toContainText("Abgeschlossen");
  const eventsAfter = events(pid).length;
  await otherDone.click();
  await expect(
    other
      .locator('[data-entity-workbench="project"] header')
      .getByText("Project wurde inzwischen geändert", { exact: false }),
  ).toBeVisible();
  assert.equal(events(pid).length, eventsAfter);
  await other.close();
  await reopen();
  step(
    "Stale: a second tab's „Erledigt“ on an already completed revision shows the visible stale message and records no second fact",
  );

  // ---- 4: explicit Review completion remains and stays labelled ----
  const rid = await createProject(`${tag} Review`);
  await root
    .getByRole("button", {
      name: "Gewünschtes Ergebnis und Kriterien festlegen",
      exact: true,
    })
    .click();
  const manage = page.getByRole("dialog", {
    name: "Ergebnis und Kriterien verwalten",
    exact: true,
  });
  await manage
    .getByLabel("Gewünschtes Ergebnis", { exact: true })
    .fill(`${tag} Ergebnis`);
  await manage
    .getByRole("button", { name: "Ergebnis speichern", exact: true })
    .click();
  await expect(manage.getByRole("status").first()).toContainText("gespeichert");
  const add = manage.getByRole("form", {
    name: "Kriterium hinzufügen",
    exact: true,
  });
  await add.getByLabel("Neues Kriterium", { exact: true }).fill(`${tag} K1`);
  await add
    .getByRole("button", { name: "Kriterium hinzufügen", exact: true })
    .click();
  await expect(
    manage.getByRole("group", { name: `Kriterium: ${tag} K1` }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await closure
    .getByRole("button", { name: "Abschluss prüfen", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Project Review",
    exact: true,
  });
  await review.locator('[name="decision"]').selectOption("completed");
  await review.locator('[name="resultAccepted"]').check();
  await review.locator('select[name^="assessment-"]').selectOption("satisfied");
  await review.getByLabel("Begründung", { exact: true }).fill(`${tag} Review`);
  await review
    .getByRole("button", { name: "Review speichern", exact: true })
    .click();
  await expect(review).toBeHidden();
  await reload();
  await expect(closure).toContainText(`Zyklus 1 · Review am ${today}`);
  await expect(closure).not.toContainText("Direkt abgeschlossen");
  await expect(
    closure.getByRole("link", { name: "Abschluss-Review ansehen" }),
  ).toBeVisible();
  await reopen();
  await reload();
  await done.click();
  await expect(header).toContainText("Abgeschlossen");
  await reload();
  await expect(closure).toContainText("Zyklus 2 · Direkt abgeschlossen am");
  assert.equal(reviewCount(rid), 1);
  assert.deepEqual(
    events(rid).map((e) => [e.event_kind, e.prior_completion_kind]),
    [
      ["reopened", "review"],
      ["completed", null],
    ],
  );
  text = await openHistory();
  assert.match(text, /Abgeschlossen · Zyklus 1/);
  assert.match(text, /Direkt abgeschlossen · active → completed/);
  step(
    "Review path: explicit Review completion still works (Review date + „Abschluss-Review ansehen“); after Reopen a direct completion is labelled direct; the Review stays the only Review",
  );

  // ---- 5: legacy and archived ----
  await go(legacyId);
  await expect(closure).toContainText("Ohne gespeicherten Review");
  text = await openHistory();
  assert.match(text, /Abgeschlossen ohne gespeicherten Review/);
  await reopen();
  await reload();
  await done.click();
  await expect(header).toContainText("Abgeschlossen");
  await reload();
  await expect(closure).toContainText("Direkt abgeschlossen am");
  await expect(closure).not.toContainText("Ohne gespeicherten Review");
  await reopen();
  assert.deepEqual(
    events(legacyId).map((e) => [e.event_kind, e.prior_completion_kind]),
    [
      ["reopened", "legacy_without_review"],
      ["completed", null],
      ["reopened", "direct"],
    ],
  );
  text = await openHistory();
  assert.match(text, /vorher ohne gespeicherten Review/);
  assert.match(text, /vorher direkt abgeschlossen/);
  await go(archivedId);
  await expect(header).toContainText("Archiviert");
  await expect(root.getByRole("button", { name: "Erledigt" })).toHaveCount(0);
  step(
    "Legacy/Archived: legacy completion stays „Ohne gespeicherten Review“ and its Reopen „vorher ohne gespeicherten Review“; a later direct completion is never labelled legacy; archived Projects offer no „Erledigt“",
  );

  // ---- 6: mobile guard ----
  await page.setViewportSize({ width: 390, height: 844 });
  await go(pid);
  await expect(done).toBeInViewport();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: join(out, "active-header-390.png"),
    fullPage: true,
  });
  step(
    "Mobile 390×844: „Erledigt“ reachable in the header, no horizontal overflow",
  );

  assert.deepEqual(errors, [], "console/hydration errors");
  step("Console/hydration: no errors or hydration warnings across the run");
  passed = true;
} finally {
  writeFileSync(
    join(out, "proof.json"),
    JSON.stringify({ passed, tag, log, errors, synthetic: true }, null, 2),
  );
  await browser?.close();
  await app?.stop();
  if (passed) releaseApplicationFixture(f);
  else process.stderr.write(`Failure fixture retained: ${f.directory}\n`);
}
