import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-136"),
  images = resolve("docs/qa/b8-project-detail");
mkdirSync(output, { recursive: true });
mkdirSync(images, { recursive: true });
const f = await createApplicationFixture();
const require = createRequire(import.meta.url),
  native = (name) => require(join(f.compiled, `${name}.js`));
const { SqliteRuntime } = native("runtime"),
  { issueOwnerContext } = native("owner-context");
const { projectDepthCommand, readSqliteProjectDepth } = native(
  "repositories/project-depth-repository",
);
const { createSqliteTaskRepository } = native("repositories/task-repository");
const owner = issueOwnerContext(f.ownerId),
  store = new SqliteRuntime(f.path, { syntheticProof: true });
const ids = Object.fromEntries(
  [
    "empty",
    "stagedEmpty",
    "flat",
    "review",
    "reviewTask",
    "reviewStage",
    "reviewReference",
    "archived",
    "first",
    "current",
    "emptyStage",
    "done",
    "ready",
    "blocked",
    "waiting",
    "source",
    "canceled",
    "old",
  ].map((key) => [key, randomUUID()]),
);
const scope = { userId: f.ownerId, profileId: f.ownerId };
try {
  store.command(owner, "synthetic.initialize", (db) => {
    db.prepare(
      "UPDATE projects SET title=?,next_step=?,target_date='2026-12-31' WHERE id=? AND user_id=?",
    ).run(
      "Lokaler Life-OS-Prototyp",
      "Kernabläufe im Alltag prüfen.",
      f.ids.project,
      f.ownerId,
    );
    db.prepare(
      "UPDATE resources SET title='Referenzablauf.md' WHERE id=? AND user_id=?",
    ).run(f.ids.resource, f.ownerId);
    db.prepare(
      "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,project_role,created_at) VALUES(?,?,?,'project',?,'supports','primary_artifact',life_now())",
    ).run(randomUUID(), f.ownerId, f.ids.resource, f.ids.project);
    db.prepare("UPDATE goals SET title=? WHERE id=? AND user_id=?").run(
      "Life OS zuverlässig im Alltag nutzen",
      f.ids.goal,
      f.ownerId,
    );
    db.prepare(
      "UPDATE tasks SET project_id=NULL,goal_id=NULL WHERE id=? AND user_id=?",
    ).run(f.ids.task, f.ownerId);
    for (const key of ["empty", "stagedEmpty", "flat", "review", "archived"])
      db.prepare(
        "INSERT INTO projects(id,user_id,title,status,created_at,updated_at,archived_at) VALUES(?,?,?,?,life_now(),life_now(),?)",
      ).run(
        ids[key],
        f.ownerId,
        `Synthetic ${key} Project`,
        key === "archived" ? "archived" : "active",
        key === "archived" ? new Date().toISOString() : null,
      );
    db.prepare("UPDATE projects SET goal_id=? WHERE id=? AND user_id=?").run(
      f.ids.goal,
      ids.stagedEmpty,
      f.ownerId,
    );
    for (const [id, project, title, status, order] of [
      [ids.first, f.ids.project, "Referenzablauf ist klar", "done", 0],
      [ids.current, f.ids.project, "Kernabläufe prüfen", "active", 1],
      [ids.emptyStage, ids.stagedEmpty, "Optionale Etappe", "open", 0],
      [ids.reviewStage, ids.review, "Bewusst offene Etappe", "open", 0],
    ])
      db.prepare(
        "INSERT INTO project_milestones(id,user_id,project_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,life_now(),life_now())",
      ).run(id, f.ownerId, project, title, status, order);
    for (const [key, title, status, milestone] of [
      ["done", "Referenzablauf dokumentieren", "done", ids.first],
      [
        "ready",
        "Reload-Stabilität des Tagesplans prüfen",
        "planned",
        ids.current,
      ],
      ["blocked", "Alltagsprobe auswerten", "active", ids.current],
      ["waiting", "Rückmeldung zur Bedienung abwarten", "waiting", null],
      ["source", "Quellengebundene Arbeit", "planned", null],
      ["canceled", "Abgebrochene Arbeit", "canceled", null],
      ["old", "Archivierte Arbeit", "archived", null],
    ])
      db.prepare(
        "INSERT INTO tasks(id,user_id,project_id,milestone_id,title,status,completed_at,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,life_now())",
      ).run(
        ids[key],
        f.ownerId,
        f.ids.project,
        milestone,
        title,
        status,
        status === "done" ? new Date().toISOString() : null,
        key === "old" ? new Date().toISOString() : null,
        `2026-01-${String(["done", "ready", "blocked", "waiting", "source", "canceled", "old"].indexOf(key) + 1).padStart(2, "0")}T12:00:00.000Z`,
      );
    db.prepare(
      "INSERT INTO tasks(id,user_id,project_id,milestone_id,title,status,created_at,updated_at) VALUES(?,?,?,?,?,'planned',life_now(),life_now())",
    ).run(
      ids.reviewTask,
      f.ownerId,
      ids.review,
      ids.reviewStage,
      "Offene Task nach Project-Abschluss",
    );
    db.prepare(
      "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,project_role,created_at) VALUES(?,?,?,'project',?,'supports','primary_artifact',life_now())",
    ).run(randomUUID(), f.ownerId, f.ids.resource, ids.review);
    db.prepare(
      "INSERT INTO resources(id,user_id,type,title,created_at,updated_at) VALUES(?,?,'note','Review Reference',life_now(),life_now())",
    ).run(ids.reviewReference, f.ownerId);
    db.prepare(
      "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,project_role,created_at) VALUES(?,?,?,'project',?,'context','reference',life_now())",
    ).run(randomUUID(), f.ownerId, ids.reviewReference, ids.review);
    db.prepare(
      "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,life_now())",
    ).run(randomUUID(), f.ownerId, f.ids.project, ids.ready, ids.blocked);
    db.prepare(
      "INSERT INTO schedule_source_links(id,user_id,source_type,source_id,task_id,created_at,updated_at) VALUES(?,?,'meal',?,?,life_now(),life_now())",
    ).run(randomUUID(), f.ownerId, f.ids.meal, ids.source);
    db.prepare(
      "INSERT INTO tasks(id,user_id,project_id,title,status,created_at,updated_at) VALUES(?,?,?,'Einzelne konkrete Task','planned',life_now(),life_now())",
    ).run(randomUUID(), f.ownerId, ids.flat);
  });
  const command = (projectId, operation, payload) => {
    const c = readSqliteProjectDepth(store, owner, projectId).context;
    return projectDepthCommand(store, owner, {
      projectId,
      operation,
      payload,
      commandId: randomUUID(),
      expectedRevision: c.completion_revision,
      expectedCycle: c.completion_cycle,
    });
  };
  command(f.ids.project, "result.set", {
    desired_result:
      "Ein verlässlicher Arbeitsort für Erfassen, Planen und Abschließen.",
  });
  command(f.ids.project, "criterion.create", {
    text: "Kernabläufe sind im Alltag nachvollziehbar.",
    sort_order: "0",
  });
  command(f.ids.project, "criterion.create", {
    text: "Daten und Kontext bleiben nach Reload erhalten.",
    sort_order: "1",
  });
  command(ids.review, "result.set", {
    desired_result: "Ein ausdrücklich geprüftes Ergebnis",
  });
  ids.criterion = String(
    command(ids.review, "criterion.create", {
      text: "Ergebnis ist geprüft",
      sort_order: "0",
    }).criterion_id,
  );
  assert.throws(() =>
    projectDepthCommand(store, issueOwnerContext(randomUUID()), {
      projectId: f.ids.project,
      operation: "result.set",
      payload: { desired_result: "foreign" },
      commandId: randomUUID(),
      expectedRevision: "0",
      expectedCycle: "0",
    }),
  );
  const c = readSqliteProjectDepth(store, owner, f.ids.project).context;
  assert.throws(() =>
    projectDepthCommand(store, owner, {
      projectId: f.ids.project,
      operation: "result.set",
      payload: { desired_result: "stale" },
      commandId: randomUUID(),
      expectedRevision: "0",
      expectedCycle: c.completion_cycle,
    }),
  );
  const taskRepo = createSqliteTaskRepository(store, owner);
  assert.equal(
    (
      await taskRepo.createTask({
        ...scope,
        projectId: randomUUID(),
        title: "Invalid context",
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await taskRepo.updateTask({
        ...scope,
        userId: randomUUID(),
        taskId: ids.ready,
        title: "Foreign title",
      })
    ).ok,
    false,
  );
} finally {
  store.close();
}
let app,
  browser,
  passed = false;
const errors = [],
  checks = [];
try {
  app = await startApplication(f);
  assert.notEqual(new URL(app.origin).port, "3000");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const root = page.locator('[data-project-detail-variant="B8"]'),
    work = root.getByRole("region", { name: "Tasks & Progress", exact: true });
  const go = async (id) => {
    await page.goto(`${app.origin}/projects/${id}`);
    await expect(root).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  };
  const row = (id) => root.locator(`[data-project-task="${id}"]`);
  const balance = root.getByRole("region", {
    name: "Arbeitsstand",
    exact: true,
  });
  const geometry = async () => {
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "no horizontal overflow",
    );
    const bounds = await root.boundingBox();
    assert.ok(bounds.width <= 1361);
    const header = await root.locator("header").boundingBox(),
      workspace = await root.locator("[data-project-workspace]").boundingBox();
    assert.equal(Math.round(header.x), Math.round(workspace.x));
    assert.equal(Math.round(header.width), Math.round(workspace.width));
  };
  await go(f.ids.project);
  await expect(balance.getByRole("img")).toHaveAttribute(
    "aria-label",
    "1 erledigt, 1 bereit, 1 blockiert, 2 sonstige offen",
  );
  await expect(row(ids.source)).toHaveAttribute("data-work-category", "other");
  await expect(
    row(ids.source).getByRole("button", { name: "Erledigt", exact: true }),
  ).toHaveCount(0);
  await expect(row(ids.waiting)).toHaveAttribute("data-work-category", "other");
  await expect(row(ids.blocked)).toContainText(
    "Blockiert durch: Reload-Stabilität des Tagesplans prüfen",
  );
  await expect(root.locator('[data-primary-task="true"]')).toHaveCount(1);
  await expect(row(ids.ready)).toHaveAttribute("data-primary-task", "true");
  await expect(
    root.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toHaveCount(1);
  await expect(root.locator("[data-milestone-id]").first()).toHaveAttribute(
    "data-milestone-id",
    ids.current,
  );
  const currentRows = () =>
    root.locator(`[data-milestone-id="${ids.current}"] [data-project-task]`);
  assert.deepEqual(
    await currentRows().evaluateAll((rows) =>
      rows.map((row) => row.dataset.projectTask),
    ),
    [ids.blocked, ids.ready],
  );
  assert.deepEqual(
    await root
      .locator('[aria-label="Ohne Milestone"] [data-project-task]')
      .evaluateAll((rows) => rows.map((row) => row.dataset.projectTask)),
    [ids.canceled, ids.source, ids.waiting],
  );
  await expect(work.getByText("Work / Project", { exact: true })).toBeVisible();
  await expect(
    work.getByRole("heading", { name: "Tasks & Milestones", exact: true }),
  ).toBeVisible();
  const workTask = work
    .getByRole("link", { name: "+ Task", exact: true })
    .first();
  const workMilestone = work.getByRole("button", {
    name: "+ Milestone",
    exact: true,
  });
  assert.equal(
    await workTask.evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(217, 146, 79)",
  );
  assert.equal(
    await workMilestone.evaluate((el) => getComputedStyle(el).borderTopStyle),
    "solid",
  );
  assert.notEqual(
    await workMilestone.evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(217, 146, 79)",
  );
  for (const [key, color] of [
    ["done", "rgb(66, 184, 131)"],
    ["ready", "rgb(91, 124, 250)"],
    ["blocked", "rgb(217, 146, 79)"],
    ["other", "rgb(127, 141, 163)"],
  ]) {
    assert.equal(
      await balance
        .locator(`[data-work-segment="${key}"]`)
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      color,
    );
  }
  const groupBounds = await root
    .locator(`[data-milestone-id="${ids.current}"]`)
    .boundingBox();
  assert.ok(
    (await row(ids.ready).boundingBox()).x > groupBounds.x + 18,
    "Task rows are indented within their Milestone",
  );
  await expect(balance).toContainText("1 von 2");
  await geometry();
  await page.screenshot({
    path: join(images, "project-populated-1920.png"),
    fullPage: true,
  });
  const edit = root
    .locator("header")
    .getByRole("button", { name: "Bearbeiten", exact: true });
  await edit.focus();
  await page.keyboard.press("Enter");
  const projectEdit = page.getByRole("dialog", {
    name: "Project bearbeiten",
    exact: true,
  });
  await expect(projectEdit.locator('[name="title"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(edit).toBeFocused();
  await root.getByRole("button", { name: "Mehr", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Project verwalten", exact: true })
      .getByRole("button", { name: "Für Obsidian exportieren", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await root
    .getByRole("button", {
      name: "Ergebnis und Kriterien bearbeiten",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Ergebnis und Kriterien verwalten",
      exact: true,
    }),
  ).toContainText("Kernabläufe sind im Alltag nachvollziehbar.");
  await page.keyboard.press("Escape");
  await root
    .getByRole("button", { name: "Artifact verwalten", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Artifact verwalten", exact: true }),
  ).toContainText("Verwendung speichern");
  await page.keyboard.press("Escape");
  await root
    .getByRole("button", { name: "Beziehungen verwalten", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Beziehungen verwalten", exact: true }),
  ).toContainText("References verwalten");
  await page.keyboard.press("Escape");
  await row(ids.ready)
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  const taskEdit = page.getByRole("dialog", {
    name: "Task bearbeiten",
    exact: true,
  });
  const title = `Reload prüfen ${randomUUID().slice(0, 8)}`;
  await taskEdit.locator('[name="title"]').fill(title);
  await taskEdit
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(taskEdit).toBeHidden();
  await page.reload();
  await expect(row(ids.ready)).toContainText(title);
  assert.deepEqual(
    await currentRows().evaluateAll((rows) =>
      rows.map((row) => row.dataset.projectTask),
    ),
    [ids.blocked, ids.ready],
  );
  await expect(row(ids.blocked)).toContainText(`Blockiert durch: ${title}`);
  await row(ids.ready)
    .getByRole("link", { name: /Details öffnen$/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${ids.ready}`));
  await page
    .getByRole("link", { name: "Im Calendar planen", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/calendar\\?.*task=${ids.ready}`));
  await go(f.ids.project);
  await row(ids.ready)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(row(ids.ready)).toHaveAttribute("data-work-category", "done");
  await page.reload();
  await expect(balance.getByRole("img")).toHaveAttribute(
    "aria-label",
    "2 erledigt, 1 bereit, 0 blockiert, 2 sonstige offen",
  );
  await expect(row(ids.blocked)).toHaveAttribute("data-primary-task", "true");
  await expect(root.locator("header")).toContainText("Aktiv");
  checks.push(
    "B7 done green/ready blue/blocked orange/other neutral; orange + Task and outlined + Milestone; inherited Task order with READY emphasized in place; lifecycle-partitioned Milestones; real Task edit/complete/Details/Calendar; dependency/title/readiness reload; Project remains active",
  );
  const group = root.locator(`[data-milestone-id="${ids.current}"]`);
  const createName = `Grouped capture ${randomUUID().slice(0, 8)}`;
  await group.getByRole("link", { name: "+ Task", exact: true }).click();
  const create = page.getByRole("form", {
    name: "Task erstellen",
    exact: true,
  });
  await expect(page).toHaveURL(new RegExp(`milestone=${ids.current}`));
  for (const name of [
    "Arbeitsinhalt (optional)",
    "Planung (optional)",
    "Zuordnung (optional)",
  ])
    await expect(
      create.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  await create.locator('[name="title"]').fill(`Unsaved ${createName}`);
  await create.getByRole("link", { name: "Abbrechen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${f.ids.project}`));
  await page.reload();
  await expect(group).not.toContainText(`Unsaved ${createName}`);
  await group.getByRole("link", { name: "+ Task", exact: true }).click();
  await create.locator('[name="title"]').fill(createName);
  await create
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${f.ids.project}`));
  await page.reload();
  await expect(group).toContainText(createName);
  await expect(root.locator('[data-primary-task="true"]')).toHaveCount(0);
  checks.push(
    "canonical merged three-disclosure Task Create; milestone origin; Cancel/no write; Save/return/reload; multiple eligible Tasks preserve choice",
  );
  // Force a concurrent explicit predecessor after the displayed eligibility was read.
  // Drain background prefetch before deliberately stopping our synthetic writer.
  await page.waitForLoadState("networkidle");
  const proofPort = Number(new URL(app.origin).port);
  await app.stop();
  app = undefined;
  const mutate = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    mutate.command(owner, "synthetic.initialize", (db) =>
      db
        .prepare(
          "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,life_now())",
        )
        .run(randomUUID(), f.ownerId, f.ids.project, ids.waiting, ids.blocked),
    );
  } finally {
    mutate.close();
  }
  app = await startApplication(f, { port: proofPort });
  await row(ids.blocked)
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(row(ids.blocked).getByRole("alert")).toBeVisible();
  await page.reload();
  await expect(row(ids.blocked)).toHaveAttribute(
    "data-work-category",
    "blocked",
  );
  checks.push(
    "stale completion rejected with visible error; unchanged Task after reload",
  );
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await geometry();
    if (viewport.width === 390) {
      const w = await work.boundingBox(),
        rail = await root
          .getByRole("complementary", {
            name: "Project Context Rail",
            exact: true,
          })
          .boundingBox();
      assert.ok(rail.y >= w.y + w.height - 1, "Work before Context");
      await row(ids.blocked)
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      const b = await taskEdit.boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= 390 && b.height <= 844);
      await page.keyboard.press("Escape");
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await go(ids.empty);
  await expect(
    work.getByRole("heading", { name: "Tasks", exact: true }),
  ).toBeVisible();
  await expect(balance).toHaveCount(0);
  await expect(
    root.getByRole("link", { name: "Erste Task anlegen", exact: true }),
  ).toBeVisible();
  assert.ok((await work.boundingBox()).height < 350, "content-sized Empty");
  await geometry();
  await page.screenshot({
    path: join(images, "project-empty-1920.png"),
    fullPage: true,
  });
  await root
    .getByRole("link", { name: "Erste Task anlegen", exact: true })
    .click();
  const firstTitle = `First capture ${randomUUID().slice(0, 8)}`;
  await create.locator('[name="title"]').fill(firstTitle);
  await create
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${ids.empty}`));
  await page.reload();
  await expect(root.locator("[data-project-task-list]")).toContainText(
    firstTitle,
  );
  await expect(root.locator("[data-milestone-id]")).toHaveCount(0);
  await expect(balance).toContainText("0 von 1");
  await go(ids.stagedEmpty);
  await expect(balance.getByRole("img")).toHaveCount(0);
  await expect(balance).toContainText("0 von 1");
  await expect(
    root.locator(`[data-milestone-id="${ids.emptyStage}"]`),
  ).toContainText("Noch keine Tasks");
  await expect(
    work.getByRole("link", { name: "Erste Task anlegen", exact: true }),
  ).toHaveAttribute("href", `/tasks/new?project=${ids.stagedEmpty}`);
  await go(ids.flat);
  await expect(root.locator("[data-milestone-id]")).toHaveCount(0);
  await expect(root.locator("[data-project-task-list]")).toContainText(
    "Einzelne konkrete Task",
  );
  await root
    .locator("[data-project-task]")
    .getByRole("button", { name: "Erledigt", exact: true })
    .click();
  await expect(root.locator("[data-project-task]")).toHaveAttribute(
    "data-work-category",
    "done",
  );
  await page.reload();
  await expect(balance.getByRole("img")).toHaveAttribute(
    "aria-label",
    "1 erledigt, 0 bereit, 0 blockiert, 0 sonstige offen",
  );
  await expect(root.locator("header")).toContainText("Aktiv");
  for (const viewport of [
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await go(ids.stagedEmpty);
    await geometry();
    assert.ok(
      (await work.boundingBox()).height < 700,
      "Empty with stages stays content-sized",
    );
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  checks.push(
    "compact Empty/no fake bar; Empty with optional Milestone/no forced association; first Task real create/reload; one Task flat with no group chrome",
  );
  await go(ids.stagedEmpty);
  await work.getByRole("button", { name: "+ Milestone", exact: true }).click();
  const stageCreate = page.getByRole("dialog", {
    name: "Weitere Work-Optionen",
    exact: true,
  });
  const stageTitle = `Optional stage ${randomUUID().slice(0, 8)}`;
  await stageCreate.locator('[name="title"]').fill(stageTitle);
  await stageCreate
    .getByRole("button", { name: "Milestone erstellen", exact: true })
    .click();
  await expect(stageCreate).toBeHidden();
  await page.reload();
  await expect(root.locator("[data-milestone-id]")).toHaveCount(2);
  await expect(balance).toContainText("0 von 2");
  const newStage = root.getByRole("region", {
    name: `Milestone: ${stageTitle}`,
    exact: true,
  });
  await newStage
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  const stageEdit = page.getByRole("dialog", {
    name: "Milestone verwalten",
    exact: true,
  });
  await stageEdit
    .getByRole("button", { name: "Nach oben", exact: true })
    .click();
  await expect(stageEdit).toBeHidden();
  await page.reload();
  await expect(root.locator("[data-milestone-id]").first()).toContainText(
    stageTitle,
  );
  checks.push(
    "real Milestone create/reorder and stored order reload; optional stages remain separate from Task capture",
  );
  await go(ids.review);
  await root
    .getByRole("button", { name: "Abschluss prüfen", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Project Review",
    exact: true,
  });
  await review
    .getByLabel("Begründung", { exact: true })
    .fill("Continue decision recorded");
  await review
    .getByRole("button", { name: "Review speichern", exact: true })
    .click();
  await expect(review).toBeHidden();
  await page.reload();
  await expect(root.locator("header")).toContainText("Aktiv");
  await root
    .getByRole("button", { name: "Abschluss prüfen", exact: true })
    .click();
  await review.locator('[name="decision"]').selectOption("completed");
  await review.locator('[name="resultAccepted"]').check();
  await review.locator('[name="openWorkAcknowledged"]').check();
  await review
    .locator('[name="openWorkDisposition"]')
    .fill("Offene Arbeit bleibt für eine bewusste Wiederöffnung erhalten.");
  await review
    .locator(`[name="assessment-${ids.criterion}"]`)
    .selectOption("satisfied");
  await review
    .getByLabel("Begründung", { exact: true })
    .fill("Explicit result accepted");
  await review
    .getByRole("button", { name: "Review speichern", exact: true })
    .click();
  await expect(review).toBeHidden();
  await page.reload();
  await expect(
    root.getByRole("region", { name: "Project Abschluss", exact: true }),
  ).toContainText("Project abgeschlossen");
  await expect(row(ids.reviewTask)).toHaveAttribute(
    "data-work-category",
    "ready",
  );
  await expect(
    row(ids.reviewTask).getByRole("link", { name: /Details öffnen$/ }),
  ).toBeVisible();
  await expect(work.locator("form")).toHaveCount(0);
  await expect(
    work.getByRole("button", { name: "Bearbeiten", exact: true }),
  ).toHaveCount(0);
  await expect(
    work.getByRole("button", { name: "+ Milestone", exact: true }),
  ).toHaveCount(0);
  await expect(
    work.getByRole("link", { name: /^(\+ Task|Erste Task anlegen)$/ }),
  ).toHaveCount(0);
  await expect(root.locator('[data-primary-task="true"]')).toHaveCount(0);
  for (const name of [
    "Bearbeiten",
    "Mehr",
    "Ergebnis und Kriterien bearbeiten",
    "Beziehungen verwalten",
    "Artifact verwalten",
    "Abschluss prüfen",
  ]) {
    await expect(root.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await expect(
    root
      .locator("header")
      .getByRole("button", { name: "Für Obsidian exportieren", exact: true }),
  ).toBeVisible();
  const exportDownload = page.waitForEvent("download");
  await root
    .locator("header")
    .getByRole("button", { name: "Für Obsidian exportieren", exact: true })
    .click();
  const download = await exportDownload;
  assert.equal(await download.failure(), null);
  assert.match(download.suggestedFilename(), /\.zip$/);
  await expect(
    root.getByRole("link", { name: "Abschluss-Review ansehen", exact: true }),
  ).toBeVisible();
  await root
    .getByRole("button", { name: "Weitere Inhalte ansehen", exact: true })
    .click();
  const supporting = page.getByRole("dialog", {
    name: "Weitere Inhalte",
    exact: true,
  });
  await expect(supporting).toContainText("Review Reference");
  await expect(supporting.locator("form")).toHaveCount(0);
  await expect(
    supporting.getByRole("link", {
      name: "Neue externe Referenz anlegen",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await geometry();
  await expect(work.getByText(/Abgeschlossenes Project/)).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await root
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Abschlussverlauf", exact: true }),
  ).toContainText("Explicit result accepted");
  await page.keyboard.press("Escape");
  await root
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  const reopen = page.getByRole("dialog", {
    name: "Wiederöffnung bestätigen",
    exact: true,
  });
  await reopen
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  await expect(
    root
      .getByRole("region", { name: "Project Abschluss", exact: true })
      .getByRole("status"),
  ).toContainText("gespeichert");
  await expect(reopen).toBeHidden();
  await page.reload();
  await expect(root.locator("header")).toContainText("Aktiv");
  await expect(
    row(ids.reviewTask).getByRole("button", { name: "Erledigt", exact: true }),
  ).toBeVisible();
  await expect(
    row(ids.reviewTask).getByRole("button", {
      name: "Bearbeiten",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    work.getByRole("link", { name: "+ Task", exact: true }).first(),
  ).toBeVisible();
  await expect(
    work.getByRole("button", { name: "+ Milestone", exact: true }),
  ).toBeVisible();
  await expect(
    root
      .locator(`[data-milestone-id="${ids.reviewStage}"]`)
      .locator(":scope > div")
      .getByRole("button", { name: "Bearbeiten", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Ergebnis und Kriterien bearbeiten",
    "Beziehungen verwalten",
    "Artifact verwalten",
    "Mehr",
  ]) {
    await expect(root.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await expect(
    root.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toHaveCount(1);
  await go(ids.archived);
  await expect(
    root.getByRole("button", { name: "Bearbeiten", exact: true }),
  ).toHaveCount(0);
  await expect(
    root.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toHaveCount(0);
  await expect(
    root.getByRole("link", { name: "+ Task", exact: true }),
  ).toHaveCount(0);
  checks.push(
    "explicit Continue/completed Review retaining open Task/Milestone; completed header/work/relations/resources read-only with Review/History/Reopen/Export preserved; reload/mobile and actions return after Reopen; archived read-only; foreign/invalid/stale ownership guards",
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, "proof.json"),
    JSON.stringify(
      {
        checks,
        errors,
        base: "e97c90bfa7d8bb6ddb9d25cbc8b0042ef231ecb7",
        runtime: process.versions.node,
        synthetic: true,
      },
      null,
      2,
    ),
  );
  passed = true;
  process.stdout.write(`${checks.length} proof groups PASS\n`);
} finally {
  await browser?.close();
  await app?.stop();
  if (passed) releaseApplicationFixture(f);
  else process.stderr.write(`Failure fixture retained: ${f.directory}\n`);
}
