import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// #196 / F04: a Project is prepared, reviewed, completed and reopened only
// through the real UI. Read-only DB snapshots prove persistence and that
// Cancel/negative paths do not mutate. Regressions: a rejected completion
// without result shows a readable message, and closing History ends its deep
// link so Reopen/reload do not reopen a stale pinned History page.
assert.equal(process.versions.node, "24.21.0");
const Database = createRequire(import.meta.url)("better-sqlite3");
const out = resolve("test-results/issue-196");
mkdirSync(out, { recursive: true });
const tag = `F04-${Date.now().toString(36)}`;
const f = await createApplicationFixture();
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
        "SELECT status,desired_result,completion_revision,completion_cycle,archived_at,updated_at FROM projects WHERE id=?",
      )
      .get(id),
  );
const reviews = (id) =>
  db((r) =>
    r
      .prepare(
        "SELECT id,decision,completion_cycle,result_accepted,rationale,open_work_acknowledged,open_work_disposition,open_task_count,open_milestone_count,reviewed_at FROM project_reviews WHERE project_id=? ORDER BY revision_after",
      )
      .all(id),
  );
const reviewCriteria = (rid) =>
  db((r) =>
    r
      .prepare(
        "SELECT text_snapshot,decision,rationale FROM project_review_criteria WHERE review_id=? ORDER BY sort_order_snapshot",
      )
      .all(rid),
  );
const work = (id) =>
  db((r) => ({
    tasks: r
      .prepare(
        "SELECT title,status,completed_at,milestone_id FROM tasks WHERE project_id=? ORDER BY title",
      )
      .all(id),
    milestones: r
      .prepare(
        "SELECT title,status FROM project_milestones WHERE project_id=? ORDER BY title",
      )
      .all(id),
  }));
const lifecycle = (id) =>
  db((r) =>
    r
      .prepare(
        "SELECT event_kind,cycle_before,cycle_after,prior_status,resulting_status,prior_completion_kind FROM project_lifecycle_events WHERE project_id=?",
      )
      .all(id),
  );
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
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const root = page.locator('[data-entity-workbench="project"]');
  const closure = root.getByRole("region", {
    name: "Project Abschluss",
    exact: true,
  });
  const reviewDialog = page.getByRole("dialog", {
    name: "Project Review",
    exact: true,
  });
  const panel = async (triggerText, label) => {
    await root
      .getByRole("button", { name: triggerText, exact: true })
      .first()
      .click();
    const d = page.getByRole("dialog", { name: label, exact: true });
    await expect(d).toBeVisible();
    return d;
  };
  const reload = async () => {
    await page.reload();
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
  async function setResult(text) {
    const p = await panel(
      /^(Gewünschtes Ergebnis und Kriterien festlegen|Ergebnis und Kriterien bearbeiten)$/,
      "Ergebnis und Kriterien verwalten",
    );
    await p.getByLabel("Gewünschtes Ergebnis", { exact: true }).fill(text);
    await p
      .getByRole("button", { name: "Ergebnis speichern", exact: true })
      .click();
    await expect(p.getByRole("status").first()).toContainText("gespeichert");
    return p;
  }
  async function addCriterion(p, text) {
    const form = p.getByRole("form", {
      name: "Kriterium hinzufügen",
      exact: true,
    });
    await form.getByLabel("Neues Kriterium", { exact: true }).fill(text);
    await form
      .getByRole("button", { name: "Kriterium hinzufügen", exact: true })
      .click();
    await expect(
      p.getByRole("group", { name: `Kriterium: ${text}`, exact: true }),
    ).toBeVisible();
  }
  async function openReview() {
    const trigger = closure.getByRole("button", {
      name: "Abschluss prüfen",
      exact: true,
    });
    await trigger.click();
    await expect(reviewDialog).toBeVisible();
    return trigger;
  }
  const save = () =>
    reviewDialog
      .getByRole("button", { name: "Review speichern", exact: true })
      .click();
  const nativeInvalid = (name) =>
    reviewDialog.locator(`[name="${name}"]`).evaluate((e) => !e.validity.valid);

  // ---------- A: prepare ----------
  const title = `${tag} Abschlussprojekt`;
  const pid = await createProject(title);
  const result = `${tag} Ergebnis: Life OS ist im Alltag verlässlich`;
  const c1 = `${tag} Kriterium Alpha`,
    c2 = `${tag} Kriterium Beta`;
  const p = await setResult(result);
  await addCriterion(p, c1);
  await addCriterion(p, c2);
  await page.keyboard.press("Escape");
  await expect(p).toBeHidden();
  const ms = await panel("+ Milestone", "Weitere Work-Optionen");
  await ms.locator('[name="title"]').first().fill(`${tag} Milestone M1`);
  await ms
    .getByRole("button", { name: "Milestone erstellen", exact: true })
    .click();
  await expect(ms).toBeHidden();
  await expect(
    root.getByRole("heading", { name: new RegExp(`^${tag} Milestone M1 ·`) }),
  ).toBeVisible();
  const milestoneId = await root
    .locator("[data-milestone-id]")
    .first()
    .getAttribute("data-milestone-id");
  for (const [taskTitle, withMilestone] of [
    [`${tag} Task Eins`, true],
    [`${tag} Task Zwei`, false],
  ]) {
    await page.goto(
      `${app.origin}/tasks/new?${new URLSearchParams({ project: pid, ...(withMilestone ? { milestone: milestoneId } : {}) })}`,
    );
    await page.locator('input[name="title"]').fill(taskTitle);
    await expect(page.locator('select[name="projectId"]')).toHaveValue(pid);
    if (withMilestone)
      await expect(page.locator('select[name="milestoneId"]')).toHaveValue(
        milestoneId,
      );
    await page
      .getByRole("button", { name: "Task erstellen", exact: true })
      .click();
    await page.waitForURL((u) => !u.pathname.endsWith("/tasks/new"));
  }
  await page.goto(`${app.origin}/projects/${pid}`);
  await reload();
  const resultRegion = root.getByRole("region", {
    name: "Project Ergebnis und Kriterien",
    exact: true,
  });
  await expect(resultRegion).toContainText(result);
  await expect(resultRegion).toContainText(c1);
  await expect(resultRegion).toContainText(c2);
  for (const t of ["Eins", "Zwei"])
    await expect(
      root
        .locator("[data-task-id], [data-work-category]")
        .filter({ hasText: `${tag} Task ${t}` })
        .first(),
    ).toBeVisible();
  const w0 = work(pid);
  assert.equal(w0.tasks.length, 2);
  assert.equal(w0.milestones.length, 1);
  assert.equal(
    w0.tasks.find((t) => t.title.endsWith("Eins")).milestone_id,
    milestoneId,
  );
  assert.equal(projectRow(pid).desired_result, result);
  step(
    "A: Project via /projects/new; result + 2 criteria via Ergebnis dialog; Milestone via + Milestone; 2 Tasks via /tasks/new (1 in Milestone); reload shows all; DB matches",
  );
  await page.screenshot({
    path: join(out, "a-prepared-1920.png"),
    fullPage: true,
  });

  // ---------- B: cancel/escape, then continue ----------
  const beforeCancel = { p: projectRow(pid), r: reviews(pid) };
  let trigger = await openReview();
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill("Nicht speichern");
  await reviewDialog
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  await expect(reviewDialog).toBeHidden();
  await expect(trigger).toBeFocused();
  trigger = await openReview();
  await page.keyboard.press("Escape");
  await expect(reviewDialog).toBeHidden();
  await expect(trigger).toBeFocused();
  trigger = await openReview();
  await reviewDialog
    .getByRole("button", { name: "Review schließen", exact: true })
    .click();
  await expect(reviewDialog).toBeHidden();
  await reload();
  assert.deepEqual({ p: projectRow(pid), r: reviews(pid) }, beforeCancel);
  await expect(
    root.getByRole("button", { name: "Abschlussverlauf ansehen", exact: true }),
  ).toHaveCount(0);
  step(
    "B1: Abbrechen, Escape and Schließen close the Review with focus return; reload + DB snapshot unchanged (0 reviews, same revision)",
  );
  await openReview();
  await expect(reviewDialog.locator('[name="decision"]')).toHaveValue(
    "continue",
  );
  await expect(reviewDialog.locator('[name="resultAccepted"]')).toHaveCount(0);
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill(`${tag} Weiterführen: Alltagsprobe läuft noch`);
  await save();
  await expect(reviewDialog).toBeHidden();
  await expect(closure.getByRole("status")).toContainText("gespeichert");
  await reload();
  await expect(root.locator("header")).toContainText("Aktiv");
  let r = reviews(pid);
  assert.equal(r.length, 1);
  assert.equal(r[0].decision, "continue");
  assert.equal(projectRow(pid).status, "active");
  await root
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  const history = page.getByRole("dialog", {
    name: "Abschlussverlauf",
    exact: true,
  });
  await expect(history).toContainText("Weitergeführt · Zyklus 1");
  await history.getByText("Weitergeführt · Zyklus 1").click();
  await expect(history).toContainText(`${tag} Weiterführen`);
  await page.keyboard.press("Escape");
  await expect(history).toBeHidden();
  step(
    "B2: Weiterführen Review saved with status feedback; reload: Project Aktiv, History shows 'Weitergeführt · Zyklus 1' with rationale; DB 1 continue review",
  );

  // ---------- C negatives ----------
  const snap = () => ({ p: projectRow(pid), r: reviews(pid).length });
  const s0 = snap();
  await openReview();
  await reviewDialog.locator('[name="decision"]').selectOption("completed");
  await expect(
    reviewDialog.getByText("Ergebnis ausdrücklich bestätigen"),
  ).toBeVisible();
  await expect(
    reviewDialog.getByRole("region", { name: "Offene Arbeit" }),
  ).toContainText("Offene Tasks und Milestones · 3");
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill(`${tag} negativ`);
  await save();
  assert.ok(
    await nativeInvalid("resultAccepted"),
    "result confirmation required natively",
  );
  await expect(reviewDialog).toBeVisible();
  assert.deepEqual(snap(), s0);
  step(
    "C-neg1: Abschließen without 'Ergebnis ausdrücklich bestätigen' → browser required-validation blocks submit; no mutation",
  );
  await reviewDialog.locator('[name="resultAccepted"]').check();
  await save();
  assert.ok(
    await nativeInvalid("openWorkAcknowledged"),
    "open work ack required",
  );
  await reviewDialog.locator('[name="openWorkAcknowledged"]').check();
  await save();
  assert.ok(await nativeInvalid("openWorkDisposition"), "disposition required");
  assert.deepEqual(snap(), s0);
  step(
    "C-neg2: open work (2 Tasks + 1 Milestone) acknowledgement and Disposition are each required before submit; no mutation",
  );
  await reviewDialog
    .locator('[name="openWorkDisposition"]')
    .fill("Tasks bleiben offen für Folgeprojekt");
  await save();
  await expect(reviewDialog.getByRole("alert")).toHaveText(
    "Ergebnis und alle aktiven Kriterien bestätigen.",
  );
  assert.deepEqual(snap(), s0);
  step(
    "C-neg3: criteria left 'Nicht bewertet' → visible alert 'Ergebnis und alle aktiven Kriterien bestätigen.'; dialog stays; no mutation",
  );
  const ids = await reviewDialog
    .locator('select[name^="assessment-"]')
    .evaluateAll((els) => els.map((e) => e.name));
  assert.equal(ids.length, 2);
  await reviewDialog.locator(`[name="${ids[0]}"]`).selectOption("satisfied");
  await reviewDialog
    .locator(`[name="${ids[1]}"]`)
    .selectOption("not_satisfied");
  await save();
  assert.ok(
    await nativeInvalid(ids[1].replace("assessment-", "note-")),
    "not_satisfied needs note",
  );
  await reviewDialog
    .locator(`[name="${ids[1].replace("assessment-", "note-")}"]`)
    .fill("Noch nicht belegt");
  await save();
  await expect(reviewDialog.getByRole("alert")).toHaveText(
    "Ergebnis und alle aktiven Kriterien bestätigen.",
  );
  assert.deepEqual(snap(), s0);
  step(
    "C-neg4: one criterion 'Nicht erfüllt' → note required natively, then visible alert; no mutation",
  );

  // ---------- C success ----------
  await reviewDialog.locator(`[name="${ids[1]}"]`).selectOption("satisfied");
  await reviewDialog
    .locator(`[name="${ids[1].replace("assessment-", "note-")}"]`)
    .fill("");
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill(`${tag} Abschluss: Ergebnis erreicht`);
  await save();
  await expect(reviewDialog).toBeHidden();
  await expect(closure.getByRole("status")).toContainText("gespeichert");
  await reload();
  await expect(root.locator("header")).toContainText("Abgeschlossen");
  await expect(closure).toContainText("Project abgeschlossen");
  await expect(closure).toContainText("Zyklus 1 · Review am");
  await expect(closure.locator("[data-completion-summary]")).toContainText(
    `${tag} Abschluss: Ergebnis erreicht`,
  );
  await expect(closure.locator("[data-completion-summary]")).toContainText(
    result.slice(0, 40),
  );
  r = reviews(pid);
  const done = r.find((x) => x.decision === "completed");
  assert.equal(r.length, 2);
  assert.ok(done);
  assert.equal(done.result_accepted, 1);
  assert.equal(done.open_work_acknowledged, 1);
  assert.equal(
    done.open_work_disposition,
    "Tasks bleiben offen für Folgeprojekt",
  );
  assert.equal(done.open_task_count, 2);
  assert.equal(done.open_milestone_count, 1);
  assert.deepEqual(
    reviewCriteria(done.id).map((c) => c.decision),
    ["satisfied", "satisfied"],
  );
  assert.equal(projectRow(pid).status, "completed");
  assert.deepEqual(
    work(pid),
    w0,
    "Tasks and Milestones are not auto-completed",
  );
  step(
    `C: Abschließen with all confirmations → status feedback; reload: header 'Abgeschlossen', 'Zyklus 1 · Review am <date>', summary with result + rationale; DB review completed (accepted, 2×satisfied, open 2 Tasks/1 Milestone + disposition); Tasks/Milestone unchanged`,
  );
  await page.screenshot({
    path: join(out, "c-completed-1920.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 3840, height: 2160 });
  await expect(closure).toContainText("Project abgeschlossen");
  await page.screenshot({
    path: join(out, "c-completed-3840.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });

  // ---------- D: completed state, history, reopen ----------
  for (const name of [
    "Bearbeiten",
    "Mehr",
    "Ergebnis und Kriterien bearbeiten",
    "Abschluss prüfen",
    "+ Milestone",
  ])
    await expect(root.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await expect(
    root.getByRole("link", { name: /^(\+ Task|Erste Task anlegen)$/ }),
  ).toHaveCount(0);
  await expect(
    root
      .getByRole("button", { name: "Für Obsidian exportieren", exact: true })
      .first(),
  ).toBeVisible();
  await closure
    .getByRole("link", { name: "Abschluss-Review ansehen", exact: true })
    .click();
  await expect(history).toBeVisible();
  const doneEntry = history.locator(`#project-review-${done.id}`);
  await expect(doneEntry).toHaveAttribute("open", "");
  await expect(doneEntry).toContainText("Abgeschlossen · Zyklus 1");
  await expect(doneEntry).toContainText(`${c1} · erfüllt`);
  await expect(doneEntry).toContainText(
    "Offene Arbeit bestätigt: Tasks bleiben offen für Folgeprojekt",
  );
  await expect(history).toContainText("Weitergeführt · Zyklus 1");
  await history
    .getByRole("button", { name: "Abschlussverlauf schließen", exact: true })
    .click();
  await expect(history).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/projects/${pid}$`));
  await reload();
  await expect(history).toBeHidden();
  await closure
    .getByRole("link", { name: "Abschluss-Review ansehen", exact: true })
    .click();
  await expect(doneEntry).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(history).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/projects/${pid}$`));
  step(
    "D1 (+#196: closing History clears deep link; reload stays closed; link still deep-opens): completed state hides Edit/Mehr/Ergebnis/Review/Work-create controls, keeps Export; 'Abschluss-Review ansehen' opens History at the completion Review (expanded, criteria 'erfüllt', disposition) + earlier continue Review",
  );
  const reopenDialog = await panel(
    "Project wieder öffnen",
    "Wiederöffnung bestätigen",
  );
  await expect(reopenDialog).toContainText(
    "Ein neuer Zyklus beginnt. Bisherige Reviews bleiben erhalten.",
  );
  await reopenDialog
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  await expect(reopenDialog).toBeHidden();
  await expect(closure.getByRole("status")).toContainText("gespeichert");
  await expect(root.locator("header")).toContainText("Aktiv");
  await page.waitForTimeout(1000);
  await expect(history).toBeHidden();
  await reload();
  await expect(history).toBeHidden();
  await expect(root.locator("header")).toContainText("Aktiv");
  for (const name of [
    "Bearbeiten",
    "Mehr",
    "Ergebnis und Kriterien bearbeiten",
  ])
    await expect(
      root.locator("header").getByRole("button", { name, exact: true }),
    ).toBeVisible();
  await expect(
    root.getByRole("button", { name: "+ Milestone", exact: true }),
  ).toBeVisible();
  await expect(
    root
      .getByRole("group", { name: /^Aktionen: .*Task Eins$/ })
      .or(root.getByLabel(`Aktionen: ${tag} Task Eins`))
      .getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await expect(
    closure.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toBeVisible();
  const pr = projectRow(pid);
  assert.equal(pr.status, "active");
  assert.equal(pr.completion_cycle, 1);
  assert.equal(reviews(pid).length, 2);
  assert.deepEqual(lifecycle(pid), [
    {
      event_kind: "reopened",
      cycle_before: 0,
      cycle_after: 1,
      prior_status: "completed",
      resulting_status: "active",
      prior_completion_kind: "review",
    },
  ]);
  assert.deepEqual(work(pid), w0);
  await root
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  await expect(history).toContainText("Wieder geöffnet · completed → active");
  await expect(history).toContainText("Abgeschlossen · Zyklus 1");
  await expect(history).toContainText("Weitergeführt · Zyklus 1");
  await page.keyboard.press("Escape");
  step(
    "D2 (+#196: no unrequested History after Reopen or reload): 'Project wieder öffnen' confirm → status feedback; reload: Aktiv, edit/review controls back; DB cycle 0→1, reopened lifecycle event (prior_completion_kind=review), 2 reviews retained, work unchanged; History shows reopen + both reviews",
  );
  // new cycle: criteria editable again and a fresh Review can be saved in Zyklus 2
  await openReview();
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill(`${tag} Zyklus 2 Weiterführen`);
  await save();
  await expect(reviewDialog).toBeHidden();
  await reload();
  r = reviews(pid);
  assert.equal(r.length, 3);
  assert.equal(r.at(-1).completion_cycle, 1);
  assert.equal(r.at(-1).decision, "continue");
  await root
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  await expect(history).toContainText("Weitergeführt · Zyklus 2");
  await page.keyboard.press("Escape");
  step(
    "D3: new cycle — Review saved in Zyklus 2 after reopen; History lists Zyklus 2 + Zyklus 1 entries after reload",
  );
  await page.screenshot({
    path: join(out, "d-reopened-1920.png"),
    fullPage: true,
  });

  // ---------- extra negatives: missing result / missing criteria ----------
  const noResult = await createProject(`${tag} Ohne Ergebnis`);
  const p2 = await panel(
    /^(Gewünschtes Ergebnis und Kriterien festlegen|Ergebnis und Kriterien bearbeiten)$/,
    "Ergebnis und Kriterien verwalten",
  );
  await addCriterion(p2, `${tag} Einziges Kriterium`);
  await page.goto(`${app.origin}/projects/${noResult}`);
  await openReview();
  await expect(reviewDialog).toContainText(
    "Gewünschtes Ergebnis: Noch nicht festgelegt",
  );
  await reviewDialog.locator('[name="decision"]').selectOption("completed");
  await reviewDialog.locator('[name="resultAccepted"]').check();
  await reviewDialog
    .locator('select[name^="assessment-"]')
    .selectOption("satisfied");
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill("Versuch ohne Ergebnis");
  await save();
  const noResultAlert = reviewDialog.getByRole("alert");
  await expect(noResultAlert).toBeVisible();
  const noResultMessage = (await noResultAlert.textContent()).trim();
  assert.equal(
    noResultMessage,
    "Für den Abschluss braucht das Project ein gewünschtes Ergebnis, mindestens ein aktives Kriterium und die ausdrückliche Bestätigung des Ergebnisses.",
  );
  assert.equal(projectRow(noResult).status, "active");
  assert.equal(reviews(noResult).length, 0);
  step(
    `C-neg5: no desired result → completion rejected with alert "${noResultMessage}"; no mutation`,
  );
  await page.keyboard.press("Escape");
  const noCriteria = await createProject(`${tag} Ohne Kriterien`);
  await setResult(`${tag} Ergebnis ohne Kriterien`);
  await page.goto(`${app.origin}/projects/${noCriteria}`);
  await openReview();
  await expect(reviewDialog).toContainText(
    "Für einen positiven Abschluss ist mindestens ein aktives Kriterium erforderlich.",
  );
  await reviewDialog.locator('[name="decision"]').selectOption("completed");
  await reviewDialog.locator('[name="resultAccepted"]').check();
  await reviewDialog
    .getByLabel("Begründung", { exact: true })
    .fill("Versuch ohne Kriterien");
  await save();
  await expect(reviewDialog.getByRole("alert")).toHaveText(
    "Ergebnis und alle aktiven Kriterien bestätigen.",
  );
  assert.equal(projectRow(noCriteria).status, "active");
  assert.equal(reviews(noCriteria).length, 0);
  step(
    "C-neg6: no criteria → hint shown in dialog, completion rejected with alert; no mutation",
  );

  // ---------- mobile guard on the completion path ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${app.origin}/projects/${pid}`);
  await openReview();
  const b = await reviewDialog.boundingBox();
  assert.ok(
    b.x >= 0 && b.x + b.width <= 390 && b.y >= 0 && b.y + b.height <= 844,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.keyboard.press("Escape");
  step(
    "Mobile 390×844: Review reachable, dialog within viewport, no horizontal overflow",
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
