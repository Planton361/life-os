import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";
import {
  standaloneTaskCapture,
  expectTaskCaptureParity,
  expectOptionalTaskFieldParity,
  setTaskOptionalSections,
  taskOptionalSections,
} from "../e2e/support/task-create-parity.ts";

// Reuse the canonical native synthetic harness and #80 parity assertions.
// One disposable writer on a random port; no personal files or database.
assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-134");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture();
const require = createRequire(import.meta.url);
const native = (name) => require(join(f.compiled, `${name}.js`));
const { SqliteRuntime } = native("runtime");
const { issueOwnerContext } = native("owner-context");
const { createSqliteGoalOutcomeRepository } = native(
  "repositories/goal-outcome-repository",
);
const { sqliteApplicationRepositories } = require(
  join(
    f.compiled,
    "dependencies/src/features/real-data/runtime/sqlite-adapter.js",
  ),
);
const { projectDepthCommand, readSqliteProjectDepth } = native(
  "repositories/project-depth-repository",
);
const { skillDevelopmentCommand } = native(
  "repositories/skill-development-repository",
);
const ids = Object.fromEntries(
  [
    "empty",
    "emptyMobile",
    "switchProject",
    "otherGoal",
    "archivedProject",
    "archivedGoal",
    "milestone",
    "current",
    "next",
    "archivedSkill",
  ].map((key) => [key, randomUUID()]),
);
const store = new SqliteRuntime(f.path, { syntheticProof: true });
const owner = issueOwnerContext(f.ownerId);
const goalRepo = createSqliteGoalOutcomeRepository(store, owner);
try {
  const repos = sqliteApplicationRepositories(store, owner);
  for (const key of [
    "empty",
    "emptyMobile",
    "switchProject",
    "archivedProject",
  ]) {
    const created = await repos.projects.createProject({
      userId: f.ownerId,
      profileId: f.ownerId,
      title: `Synthetic ${key} Project`,
      status: "active",
      goalId: f.ids.goal,
    });
    assert.equal(created.ok, true);
    ids[key] = created.data.id;
  }
  const archivedContext = readSqliteProjectDepth(
    store,
    owner,
    ids.archivedProject,
  ).context;
  projectDepthCommand(store, owner, {
    projectId: ids.archivedProject,
    commandId: randomUUID(),
    expectedRevision: archivedContext.completion_revision,
    expectedCycle: archivedContext.completion_cycle,
    operation: "project.archive",
    payload: {},
  });
  ids.archivedSkill = skillDevelopmentCommand(store, owner, {
    operation: "skill.create",
    commandId: randomUUID(),
    skillId: null,
    expectedRevision: null,
    payload: { name: "Archived synthetic Skill" },
  }).skill_id;
  skillDevelopmentCommand(store, owner, {
    operation: "skill.archive",
    commandId: randomUUID(),
    skillId: ids.archivedSkill,
    expectedRevision: 0,
    payload: {},
  });
  store.command(owner, "synthetic.seed", (db) => {
    for (const [id, title, archived] of [
      [ids.otherGoal, "Other synthetic Goal", false],
      [ids.archivedGoal, "Archived synthetic Goal", true],
    ])
      db.prepare(
        "INSERT INTO goals(id,user_id,title,status,archived_at,created_at,updated_at) VALUES(?,?,?, ?,?,life_now(),life_now())",
      ).run(
        id,
        f.ownerId,
        title,
        archived ? "archived" : "active",
        archived ? "2026-10-08T10:00:00.000000Z" : null,
      );
    db.prepare(
      "INSERT INTO project_milestones(id,user_id,project_id,title,status,created_at,updated_at) VALUES(?,?,?,'Kernablauf prüfen','active',life_now(),life_now())",
    ).run(ids.milestone, f.ownerId, f.ids.project);
    for (const [key, status, order] of [
      ["current", "active", 0],
      ["next", "planned", 1],
    ])
      db.prepare(
        "INSERT INTO goal_milestones(id,user_id,goal_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?, ?,?,?,life_now(),life_now())",
      ).run(
        ids[key],
        f.ownerId,
        f.ids.goal,
        `Synthetic ${key} Goal Milestone`,
        status,
        order,
      );
    ids.area = db
      .prepare(
        "SELECT id FROM areas WHERE user_id=? AND archived_at IS NULL ORDER BY id LIMIT 1",
      )
      .get(f.ownerId).id;
  });
  const scope = { userId: f.ownerId, profileId: f.ownerId };
  for (const input of [
    { ...scope, userId: randomUUID(), milestoneId: ids.current },
    { ...scope, milestoneId: ids.next },
    { ...scope, milestoneId: ids.current, projectId: ids.archivedProject },
    { ...scope, milestoneId: randomUUID() },
  ]) {
    const result = await goalRepo.createGoalContextTask({
      ...input,
      goalId: f.ids.goal,
      title: "Denied native context",
    });
    assert.equal(
      result.ok,
      false,
      "foreign/stale/archived context denied atomically",
    );
  }
} finally {
  store.close();
}

let app, browser, read;
const checks = [],
  errors = [],
  viewports = [],
  expectedRouteDenials = [];
let expectingNotFound = false;
try {
  app = await startApplication(f);
  assert.notEqual(new URL(app.origin).port, "3000");
  read = new Database(f.path, { readonly: true });
  const taskByTitle = (title) =>
    read
      .prepare("SELECT * FROM tasks WHERE user_id=? AND title=?")
      .all(f.ownerId, title);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: app.origin,
    viewport: { width: 1920, height: 1080 },
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (expectingNotFound && /Failed to load resource:.*404/.test(m.text())) {
      expectedRouteDenials.push(m.text());
      return;
    }
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  const root = page.locator('[data-task-create-variant="B8"]');
  const disclosure = form.getByRole("button", {
    name: "Zuordnung (optional)",
    exact: true,
  });
  const titleInput = form.getByLabel("Titel", { exact: true });
  const go = async (query = "") => {
    await page.goto(`/tasks/new${query}`);
    await expect(root).toBeVisible();
    await expect(form.locator('button[type="submit"]')).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
  };
  const geometry = async () => {
    const result = await root.evaluate((element) => {
      const header = element.querySelector("header").getBoundingClientRect();
      const surface = element
        .querySelector(":scope > div > section")
        .getBoundingClientRect();
      const form = element.querySelector("form").getBoundingClientRect();
      const canvas = element.getBoundingClientRect();
      const outside = Array.from(
        element.querySelectorAll("input,select,textarea,button,a"),
      )
        .filter((e) => e.getClientRects().length)
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.left < 0 || r.right > innerWidth + 1;
        })
        .map((e) => e.getAttribute("name") || e.textContent);
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        outside,
        aligned:
          Math.abs(header.x - surface.x) < 1 &&
          Math.abs(header.width - surface.width) < 1,
        centered:
          Math.abs(form.x - surface.x - (surface.right - form.right)) < 2,
        width: canvas.width,
        formWidth: form.width,
        surfaceHeight: surface.height,
      };
    });
    assert.equal(result.overflow, false);
    assert.deepEqual(result.outside, []);
    assert.equal(result.aligned, true);
    assert.equal(result.centered, true);
    assert.ok(result.width <= 1360 && result.formWidth <= 940);
    return result;
  };
  const origins = [
    { name: "global", query: "", cancel: "/tasks" },
    {
      name: "empty-project",
      query: `?project=${ids.empty}`,
      cancel: `/projects/${ids.empty}`,
      project: ids.empty,
    },
    {
      name: "project",
      query: `?project=${f.ids.project}`,
      cancel: `/projects/${f.ids.project}`,
      project: f.ids.project,
    },
    {
      name: "project-milestone",
      query: `?project=${f.ids.project}&milestone=${ids.milestone}`,
      cancel: `/projects/${f.ids.project}`,
      project: f.ids.project,
      milestone: ids.milestone,
    },
    {
      name: "goal",
      query: `?goal=${f.ids.goal}`,
      cancel: `/goals/${f.ids.goal}`,
      goal: f.ids.goal,
    },
    {
      name: "goal-milestone",
      query: `?goal=${f.ids.goal}&goalMilestone=${ids.current}`,
      cancel: `/goals/${f.ids.goal}?goalMilestone=${ids.current}`,
      goal: f.ids.goal,
      stage: ids.current,
    },
  ];
  await page.goto(`/projects/${ids.empty}`);
  await page
    .getByRole("region", { name: "Project Task guidance", exact: true })
    .getByRole("link", { name: "Erste Task anlegen", exact: true })
    .click();
  await expect(page).toHaveURL(
    new URL(`/tasks/new?project=${ids.empty}`, app.origin).href,
  );
  await expect(root).toBeVisible();
  await page.goto(`/projects/${f.ids.project}`);
  await page
    .getByRole("region", { name: "Tasks & Progress", exact: true })
    .getByRole("link", { name: "+ Task", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/tasks\/new\?project=/);
  await expect(root).toBeVisible();
  await page.goto(`/goals/${f.ids.goal}`);
  await page
    .locator(`[data-goal-work-milestone="${ids.current}"]`)
    .getByRole("link", { name: "+ Task", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`goalMilestone=${ids.current}`));
  await expect(root).toBeVisible();
  checks.push(
    "Real Empty/populated Project and Current Goal Milestone entry controls navigate to the same B8 /tasks/new capture",
  );
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const baseline = await standaloneTaskCapture(page);
    const viewportOrigins = origins.map((origin) =>
      viewport.width === 390 && origin.name === "empty-project"
        ? {
            ...origin,
            query: `?project=${ids.emptyMobile}`,
            cancel: `/projects/${ids.emptyMobile}`,
            project: ids.emptyMobile,
          }
        : origin,
    );
    for (const origin of viewportOrigins) {
      if (origin.name === "empty-project")
        assert.equal(
          read
            .prepare(
              "SELECT count(*) AS n FROM tasks WHERE user_id=? AND project_id=? AND archived_at IS NULL",
            )
            .get(f.ownerId, origin.project).n,
          0,
        );
      await go(origin.query);
      await expectTaskCaptureParity(page, baseline);
      await expect(form.locator("button[aria-expanded]")).toHaveCount(3);
      await page.reload();
      await expectTaskCaptureParity(page, baseline);
      const collapsed = await geometry();
      assert.ok(
        collapsed.surfaceHeight < 650,
        "collapsed capture is content-sized",
      );
      await setTaskOptionalSections(page, true);
      await expectOptionalTaskFieldParity(
        page,
        baseline,
        Boolean(origin.stage),
      );
      await geometry();
      if (origin.project) {
        await expect(form.getByLabel("Project", { exact: true })).toHaveValue(
          origin.project,
        );
        await expect(
          form.getByLabel("Project", { exact: true }),
        ).toHaveAttribute("required", "");
        await expect(
          form.getByLabel("Project Milestone", { exact: true }),
        ).toHaveValue(origin.milestone ?? "");
      }
      if (origin.goal)
        await expect(form.locator('[name="goalId"]')).toHaveValue(origin.goal);
      if (origin.stage)
        await expect(form.locator('[name="goalMilestoneId"]')).toHaveValue(
          origin.stage,
        );
      await setTaskOptionalSections(page, false);
      const cancelled = `Cancelled ${origin.name} ${viewport.width} ${randomUUID()}`;
      await titleInput.fill(cancelled);
      await expect(
        form.getByRole("link", { name: "Abbrechen", exact: true }),
      ).toHaveAttribute("href", origin.cancel);
      await form.getByRole("link", { name: "Abbrechen", exact: true }).click();
      await expect(page).toHaveURL(new URL(origin.cancel, app.origin).href);
      await page.reload();
      assert.deepEqual(taskByTitle(cancelled), []);
      await go(origin.query);
      const title = `Parity ${origin.name} ${viewport.width} ${randomUUID()}`;
      await titleInput.fill(title);
      await form
        .getByRole("button", { name: "Task erstellen", exact: true })
        .click();
      const destination = origin.project
        ? new RegExp(`/projects/${origin.project}$`)
        : origin.goal
          ? new RegExp(`/goals/${origin.goal}\\?created=task`)
          : /\/tasks\/[0-9a-f-]{36}$/;
      await expect(page).toHaveURL(destination);
      await page.reload();
      const rows = taskByTitle(title);
      assert.equal(rows.length, 1);
      const task = rows[0];
      assert.equal(task.status, "planned");
      assert.equal(task.project_id, origin.project ?? null);
      assert.equal(task.milestone_id, origin.milestone ?? null);
      assert.equal(task.goal_id, origin.goal ?? null);
      if (origin.stage)
        assert.deepEqual(
          read
            .prepare(
              "SELECT goal_id,goal_milestone_id FROM goal_milestone_task_support WHERE user_id=? AND task_id=?",
            )
            .get(f.ownerId, task.id),
          { goal_id: f.ids.goal, goal_milestone_id: origin.stage },
        );
      if (origin.project)
        await expect(
          page.locator(`[data-project-task="${task.id}"]`),
        ).toContainText(title);
      else if (origin.goal)
        await expect(
          page.locator(`[data-goal-task="${task.id}"]`),
        ).toContainText(title);
      else
        await expect(
          page.locator('[data-task-detail-variant="B8"] header h1'),
        ).toHaveText(title);
    }
    checks.push(
      `${viewport.width}: Global / Empty and populated Project / Project Milestone / Goal / Current Goal Milestone canonical parity, prefills, Save/Cancel, scoped projection and native relation readback after reload`,
    );
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await go();
  await expect(titleInput).toBeEmpty();
  for (const name of taskOptionalSections)
    await expect(
      form.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  // Decisive visual comparison: empty title, all three sections initially closed.
  await root.locator("h1").click();
  await page.screenshot({
    path: join(output, "task-create-1920x1080.png"),
    fullPage: true,
  });
  for (const viewport of [
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await geometry();
    await page.screenshot({
      path: join(
        output,
        `task-create-closed-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await titleInput.focus();
  for (const name of taskOptionalSections) {
    await page.keyboard.press("Tab");
    await expect(form.getByRole("button", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(form.locator('button[type="submit"]')).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    form.getByRole("link", { name: "Abbrechen", exact: true }),
  ).toBeFocused();
  await go(`?project=${f.ids.project}&milestone=${ids.milestone}`);
  for (const name of taskOptionalSections) {
    const trigger = form.getByRole("button", { name, exact: true });
    await trigger.focus();
    await trigger.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  }
  const fullTitle = `Forschungsmethoden vergleichen ${randomUUID().slice(0, 8)}`;
  await titleInput.fill(fullTitle);
  await form
    .getByLabel("Beschreibung / Purpose", { exact: true })
    .fill(
      "Qualitative und quantitative Ansätze für die Forschungsfrage gegenüberstellen.",
    );
  await form
    .getByLabel("Arbeitsnotiz / nächste Aktion", { exact: true })
    .fill("Drei Methodenquellen anhand gleicher Kriterien vergleichen.");
  await form.getByLabel("Priority", { exact: true }).selectOption("P1");
  await form.getByLabel("Energy", { exact: true }).selectOption("medium");
  await form.getByLabel("Duration (min)", { exact: true }).fill("45");
  await form.getByLabel("Deadline", { exact: true }).fill("2026-12-31");
  await form.getByLabel("Geplantes Datum", { exact: true }).fill(f.day);
  await form.getByLabel("Area", { exact: true }).selectOption(ids.area);
  await form
    .getByLabel("Goal-Kontext", { exact: true })
    .selectOption(f.ids.goal);
  await root.locator("h1").click();
  await page.screenshot({
    path: join(output, "task-create-all-open-1920x1080.png"),
    fullPage: true,
  });
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    viewports.push({ ...viewport, expanded: await geometry() });
    if (viewport.width !== 3840)
      await page.screenshot({
        path: join(
          output,
          `task-create-${viewport.width}x${viewport.height}.png`,
        ),
        fullPage: true,
      });
    for (const name of taskOptionalSections) {
      const trigger = form.getByRole("button", { name, exact: true });
      const panel = form.locator(
        `[id="${await trigger.getAttribute("aria-controls")}"]`,
      );
      await panel
        .getByRole("button", { name: "Schließen", exact: true })
        .click();
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      for (const other of taskOptionalSections.filter((n) => n !== name))
        await expect(
          form.getByRole("button", { name: other, exact: true }),
        ).toHaveAttribute("aria-expanded", "true");
      await trigger.press("Enter");
      await panel
        .locator("input:not([type=hidden]),select,textarea")
        .first()
        .focus();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await trigger.press("Space");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    }
    await setTaskOptionalSections(page, false);
    viewports.at(-1).collapsed = await geometry();
    await setTaskOptionalSections(page, true);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${f.ids.project}$`));
  await page.reload();
  const full = taskByTitle(fullTitle)[0];
  assert.equal(full.priority, "P1");
  assert.equal(full.energy, "medium");
  assert.equal(full.duration_minutes, 45);
  assert.equal(full.area_id, ids.area);
  assert.equal(full.goal_id, f.ids.goal);
  assert.equal(full.milestone_id, ids.milestone);
  assert.equal(full.planned_date, f.day);
  assert.ok(full.due_at.startsWith("2026-12-31"));
  assert.ok(full.description.includes("Nächste Aktion: Drei Methodenquellen"));
  checks.push(
    "All optional fields survive Save/reload; 1920 desktop screenshot; 4K, Mobile and Short-Mac bounds/centering/natural flow; three independent sections/all-open/all-closed; keyboard Tab/Enter/Space/Close/Escape/focus return",
  );

  // Invalid values traverse the existing real action; draft and feedback stay visible.
  await go();
  const invalidTitle = `Invalid ${randomUUID()}`;
  await titleInput.fill(invalidTitle);
  await setTaskOptionalSections(page, true);
  await form.getByLabel("Duration (min)", { exact: true }).fill("-1");
  assert.equal(
    await form
      .getByLabel("Duration (min)", { exact: true })
      .evaluate((input) => input.validity.rangeUnderflow),
    true,
  );
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  assert.deepEqual(taskByTitle(invalidTitle), []);
  await form.getByLabel("Duration (min)", { exact: true }).fill("30");
  // Exercise the server's minimum title length independently of HTML validation.
  await titleInput.fill("x");
  await titleInput.evaluate((input) => input.removeAttribute("minlength"));
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(titleInput).toHaveValue("x");
  assert.deepEqual(taskByTitle("x"), []);
  await titleInput.fill(invalidTitle);
  await form.getByLabel("Project", { exact: true }).selectOption(f.ids.project);
  await form
    .getByLabel("Goal-Kontext", { exact: true })
    .selectOption(ids.otherGoal);
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("widerspricht");
  assert.deepEqual(taskByTitle(invalidTitle), []);
  await go(`?project=${f.ids.project}&milestone=${ids.milestone}`);
  await disclosure.click();
  await form
    .getByLabel("Project", { exact: true })
    .selectOption(ids.switchProject);
  await expect(
    form.getByLabel("Project Milestone", { exact: true }),
  ).toHaveValue("");
  const switchedTitle = `Switched ${randomUUID()}`;
  await titleInput.fill(switchedTitle);
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${ids.switchProject}$`));
  await page.reload();
  assert.equal(taskByTitle(switchedTitle)[0].project_id, ids.switchProject);
  assert.equal(taskByTitle(switchedTitle)[0].milestone_id, null);
  checks.push(
    "Real validation error and Project/Goal conflict retain draft without writes; valid Project switch clears incompatible Milestone and returns to selected Project",
  );

  expectingNotFound = true;
  for (const query of [
    "?project=forged",
    `?project=${randomUUID()}`,
    `?project=${ids.archivedProject}`,
    `?project=${ids.empty}&milestone=${ids.milestone}`,
    `?goal=${randomUUID()}`,
    `?goal=${ids.archivedGoal}`,
    `?goal=${f.ids.goal}&goalMilestone=${ids.next}`,
    `?project=${f.ids.project}&goal=${ids.otherGoal}`,
  ]) {
    await page.goto(`/tasks/new${query}`);
    await expect(form).toHaveCount(0);
  }
  expectingNotFound = false;
  for (const skill of ["forged", randomUUID(), ids.archivedSkill]) {
    await page.goto(`/tasks/new?skill=${skill}`);
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "nicht verfügbar",
    );
    await expect(form).toHaveCount(0);
  }
  checks.push(
    "Forged/foreign/mismatched/archived Project/Goal/Skill and non-Current Goal Milestone deny capture; native wrong-owner scope and context writes denied",
  );

  const skillQuery = `?skill=${f.ids.skill}`;
  await go(skillQuery);
  await expect(form).toContainText("Für Skill: SQLite synthetic Skill");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  const cancelSkillTitle = `Cancelled Skill ${randomUUID()}`;
  await titleInput.fill(cancelSkillTitle);
  await form.getByRole("link", { name: "Abbrechen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/skills/${f.ids.skill}$`));
  await page.reload();
  assert.deepEqual(taskByTitle(cancelSkillTitle), []);
  await go(skillQuery);
  const skillTitle = `Practice ${randomUUID()}`;
  await titleInput.fill(skillTitle);
  let releaseSave;
  const saveGate = new Promise((resolve) => {
    releaseSave = resolve;
  });
  const holdSave = async (route) => {
    if (route.request().method() === "POST") await saveGate;
    await route.continue();
  };
  await page.route("**/tasks/new?skill=*", holdSave);
  await form
    .getByRole("button", { name: "Übungsaufgabe erstellen", exact: true })
    .click();
  await expect(
    form.getByRole("button", { name: "Speichern …", exact: true }),
  ).toBeDisabled();
  await expect(
    form.getByRole("link", { name: "Abbrechen", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await form
    .getByRole("link", { name: "Abbrechen", exact: true })
    .click({ force: true });
  await expect(page).toHaveURL(
    new URL(`/tasks/new${skillQuery}`, app.origin).href,
  );
  releaseSave();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}\?skill=/);
  await page.unroute("**/tasks/new?skill=*", holdSave);
  const recovery = page.getByRole("region", {
    name: "Skill-Verbindung",
    exact: true,
  });
  await page.reload();
  await expect(recovery).toContainText(
    "Aufgabe erstellt und mit Skill verbunden.",
  );
  const practice = taskByTitle(skillTitle)[0];
  assert.equal(
    read
      .prepare(
        "SELECT count(*) AS n FROM task_skill_links WHERE user_id=? AND task_id=? AND skill_id=?",
      )
      .get(f.ownerId, practice.id, f.ids.skill).n,
    1,
  );
  await go(skillQuery);
  const optTitle = `Opt out ${randomUUID()}`;
  await titleInput.fill(optTitle);
  await form.getByLabel("Ohne Skill-Verbindung erstellen").check();
  await form
    .getByRole("button", { name: "Aufgabe erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  await page.reload();
  const opt = taskByTitle(optTitle)[0];
  assert.equal(
    read
      .prepare("SELECT count(*) AS n FROM task_skill_links WHERE task_id=?")
      .get(opt.id).n,
    0,
  );

  // Remove only the link command's submitted skill ID. Create succeeds normally;
  // the actual server action rejects the missing link target, then reload recovers.
  await go(skillQuery);
  let posts = 0;
  const failedTitle = `Known ID recovery ${randomUUID()}`;
  await page.route("**/tasks/**", async (route) => {
    if (route.request().method() === "POST" && ++posts === 2)
      await route.continue({
        postData: route
          .request()
          .postData()
          .replaceAll(f.ids.skill, randomUUID()),
      });
    else await route.continue();
  });
  await titleInput.fill(failedTitle);
  await form
    .getByRole("button", { name: "Übungsaufgabe erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}\?skill=/);
  await expect(recovery).toContainText(
    "Verbindung zum Skill nicht hergestellt.",
  );
  const failed = taskByTitle(failedTitle)[0];
  assert.equal(posts, 2);
  await page.unroute("**/tasks/**");
  await page.reload();
  await recovery
    .getByRole("button", { name: "Verbindung erneut versuchen", exact: true })
    .click();
  await expect(recovery).toContainText(
    "Aufgabe erstellt und mit Skill verbunden.",
  );
  await page.reload();
  assert.equal(new URL(page.url()).pathname, `/tasks/${failed.id}`);
  assert.equal(taskByTitle(failedTitle).length, 1);
  await expect(recovery.getByRole("button")).toHaveCount(0);

  await go(skillQuery);
  let ambiguousPosts = 0;
  const ambiguousTitle = `Ambiguous create ${randomUUID()}`;
  await page.route("**/tasks/new?skill=*", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    ambiguousPosts++;
    const response = await route.fetch();
    const [saved] = taskByTitle(ambiguousTitle);
    assert.ok(saved);
    await route.fulfill({
      response,
      body: (await response.text()).replaceAll(saved.id, ""),
    });
  });
  await titleInput.fill(ambiguousTitle);
  await form
    .getByRole("button", { name: "Übungsaufgabe erstellen", exact: true })
    .click();
  await expect(form.getByRole("alert")).toHaveText(
    "Speicherergebnis unklar — Aufgaben prüfen",
  );
  await expect(
    form.getByRole("button", { name: "Übungsaufgabe erstellen", exact: true }),
  ).toBeDisabled();
  assert.equal(ambiguousPosts, 1);
  assert.equal(taskByTitle(ambiguousTitle).length, 1);
  await page.unroute("**/tasks/new?skill=*");
  await form
    .getByRole("link", { name: "Aufgaben prüfen", exact: true })
    .click();
  await expect(page).toHaveURL(new URL("/tasks", app.origin).href);
  checks.push(
    "Skill-origin Cancel/no-write, pending controls, actual create→link and opt-out/reload; actual rejected link and known-ID link-only recovery; ambiguous Create disables resubmit with exactly one Task",
  );

  await go();
  await root
    .getByRole("navigation", { name: "Breadcrumb", exact: true })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await expect(page).toHaveURL(new URL("/portfolio", app.origin).href);
  await go();
  await root
    .getByRole("navigation", { name: "Breadcrumb", exact: true })
    .getByRole("link", { name: "Tasks", exact: true })
    .click();
  await expect(page).toHaveURL(
    new URL("/portfolio?type=tasks", app.origin).href,
  );

  for (const route of [
    "/projects/new",
    "/goals/new",
    "/skills/new",
    `/tasks/${f.ids.task}`,
    `/projects/${f.ids.project}`,
    `/goals/${f.ids.goal}`,
    `/skills/${f.ids.skill}`,
  ]) {
    await page.goto(route);
    await expect(root).toHaveCount(0);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  checks.push(
    "Other Create and Task/Project/Goal/Skill Detail routes retain their existing shells; B8 styling only on /tasks/new",
  );
  const countBeforeBlocked = read
    .prepare("SELECT count(*) AS n FROM tasks")
    .get().n;
  // Close browser connections before the sequential auth-blocked restart.
  await browser.close();
  browser = undefined;
  read.close();
  read = undefined;
  const authenticatedApp = app;
  app = undefined;
  await authenticatedApp.stop();
  app = await startApplication(f, { authentication: "blocked" });
  browser = await chromium.launch({ headless: true });
  const blockedContext = await browser.newContext();
  await blockedContext.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const blockedPage = await blockedContext.newPage();
  blockedPage.on("pageerror", (e) => errors.push(e.message));
  blockedPage.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  await blockedPage.goto(`${app.origin}/tasks/new?skill=${f.ids.skill}`);
  await expect(
    blockedPage.getByRole("form", { name: "Task erstellen", exact: true }),
  ).toHaveCount(0);
  await expect(blockedPage.locator("main").getByRole("status")).toContainText(
    "eine lokale Anmeldung",
  );
  await expect(blockedPage.locator("main")).not.toContainText(
    "SQLite synthetic",
  );
  read = new Database(f.path, { readonly: true });
  assert.equal(
    read.prepare("SELECT count(*) AS n FROM tasks").get().n,
    countBeforeBlocked,
  );
  checks.push(
    "Auth-blocked capture has a visible reason, no form, no fixture leakage or writes",
  );
  assert.deepEqual(errors, []);
  const result = {
    status: "PASS",
    checks,
    viewports,
    consoleErrors: errors,
    expectedRouteDenials,
    screenshot: "task-create-1920x1080.png",
  };
  writeFileSync(join(output, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  writeFileSync(
    join(output, "failure.txt"),
    String(error) +
      "\n" +
      JSON.stringify(errors) +
      "\n" +
      (app?.output() ?? ""),
  );
  throw error;
} finally {
  read?.close();
  await browser?.close();
  await app?.stop();
}
