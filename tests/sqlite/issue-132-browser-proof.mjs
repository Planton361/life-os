import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";
import { goalDetailBrowserFlow } from "./goal-detail-browser-flow.mjs";

assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-132");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture();
const require = createRequire(import.meta.url);
const native = (name) => require(join(f.compiled, `${name}.js`));
const { SqliteRuntime } = native("runtime");
const { issueOwnerContext } = native("owner-context");
const { createSqliteGoalOutcomeRepository } = native(
  "repositories/goal-outcome-repository",
);
const { createSqliteTaskRepository } = native("repositories/task-repository");
const store = new SqliteRuntime(f.path, { syntheticProof: true }),
  owner = issueOwnerContext(f.ownerId);
const repo = createSqliteGoalOutcomeRepository(store, owner),
  tasks = createSqliteTaskRepository(store, owner);
const scope = { userId: f.ownerId, profileId: f.ownerId };
const result = (r) => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.data;
};
const ids = { flow: randomUUID(), empty: randomUUID(), archived: randomUUID() };
try {
  store.command(owner, "synthetic.seed", (db) => {
    db.prepare(
      "UPDATE goals SET status='active',title=?,description=?,why=?,horizon='year',target_date='2027-03-31' WHERE id=? AND user_id=?",
    ).run(
      "Eine belastbare Forschungsrichtung finden",
      "Eine klar eingegrenzte Forschungsfrage mit tragfähigem methodischen Ansatz.",
      "Die Masterarbeit mit einer fundierten Entscheidung beginnen.",
      f.ids.goal,
      f.ownerId,
    );
    db.prepare(
      "UPDATE projects SET title='Forschungsnotizen' WHERE id=? AND user_id=?",
    ).run(f.ids.project, f.ownerId);
    db.prepare(
      "UPDATE tasks SET title='Erste Suchbegriffe sammeln' WHERE id=? AND user_id=?",
    ).run(f.ids.task, f.ownerId);
    for (const [key, id] of Object.entries(ids))
      db.prepare(
        "INSERT INTO goals(id,user_id,title,status,created_at,updated_at) VALUES(?,?,?,?,life_now(),life_now())",
      ).run(
        id,
        f.ownerId,
        `Synthetic ${key} Goal`,
        key === "archived" ? "archived" : "active",
      );
  });
  ids.flowTask = result(
    await tasks.createTask({
      ...scope,
      goalId: ids.flow,
      title: `Review Task ${randomUUID().slice(0, 8)}`,
      status: "planned",
    }),
  ).id;
  for (const [title, index] of [
    ["Forschungsfrage eingrenzen", 0],
    ["Methodischen Ansatz prüfen", 1],
  ]) {
    const m = result(
      await repo.createGoalMilestone({
        ...scope,
        goalId: f.ids.goal,
        title,
        status: "planned",
        sortOrder: index,
        description: index
          ? "Ansätze vergleichen und einen begründet auswählen."
          : "Drei Themen auf Relevanz und Machbarkeit prüfen.",
      }),
    );
    ids[index ? "next" : "current"] = m.id;
    if (!index)
      result(
        await repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.ids.goal,
          milestoneId: m.id,
          status: "active",
          expectedUpdatedAt: m.updatedAt,
        }),
      );
  }
  const c = result(
    await repo.createGoalCriterion({
      ...scope,
      goalId: f.ids.goal,
      title: "Forschungsfrage und Vorgehen sind schriftlich begründet",
      criterionType: "boolean",
    }),
  );
  ids.criterion = c.id;
  ids.ready = result(
    await repo.createGoalContextTask({
      ...scope,
      goalId: f.ids.goal,
      milestoneId: ids.current,
      title: "Drei mögliche Forschungsthemen vergleichen",
      projectId: f.ids.project,
      status: "planned",
    }),
  ).id;
  ids.blocked = result(
    await repo.createGoalContextTask({
      ...scope,
      goalId: f.ids.goal,
      milestoneId: ids.current,
      title: "Favorisierte Forschungsfrage formulieren",
      projectId: f.ids.project,
      status: "planned",
    }),
  ).id;
  store.command(owner, "synthetic.seed", (db) =>
    db
      .prepare(
        "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,life_now())",
      )
      .run(randomUUID(), f.ownerId, f.ids.project, ids.ready, ids.blocked),
  );
  const denied = await repo.addGoalTaskSupport({
    ...scope,
    userId: randomUUID(),
    goalId: f.ids.goal,
    goalMilestoneId: ids.current,
    taskId: f.ids.task,
  });
  assert.equal(denied.ok, false, "foreign scope rejected");
  const stale = await repo.setGoalMilestoneStatus({
    ...scope,
    goalId: f.ids.goal,
    milestoneId: ids.current,
    status: "active",
    expectedUpdatedAt: "2000-01-01T00:00:00Z",
  });
  assert.equal(stale.ok, false, "stale milestone write rejected");
} finally {
  store.close();
}
let app, browser;
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
  const go = async (id) => {
    await page.goto(`${app.origin}/goals/${id}`);
    await expect(page.locator('[data-goal-detail-variant="B8"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  };
  const root = page.locator('[data-goal-detail-variant="B8"]');
  const stage = root.locator(`[data-goal-work-milestone="${ids.current}"]`);
  await go(f.ids.goal);
  await expect(stage.locator(`[data-goal-task="${ids.ready}"]`)).toBeVisible();
  await expect(
    stage.locator(`[data-goal-task="${ids.blocked}"]`),
  ).toContainText("Wartet auf: Drei mögliche Forschungsthemen vergleichen");
  await expect(root.locator(`[data-goal-task="${f.ids.task}"]`)).toHaveCount(1);
  await expect(
    root.locator('[data-goal-work-milestone][data-current="true"]'),
  ).toHaveCount(1);
  await expect(root.locator("[data-goal-journey]")).toHaveCount(0);
  await page.screenshot({
    path: join(output, "goal-detail-1920x1080.png"),
    fullPage: true,
  });
  const ready = stage.locator(`[data-goal-task="${ids.ready}"]`);
  await ready.getByRole("link", { name: /: Im Calendar planen$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/calendar\\?.*task=${ids.ready}`));
  await expect(
    page
      .getByRole("complementary", {
        name: "Calendar planning rail",
        exact: true,
      })
      .getByRole("region", {
        name: "Drei mögliche Forschungsthemen vergleichen",
        exact: true,
      }),
  ).toBeVisible();
  await go(f.ids.goal);
  const nextStage = root.locator(`[data-goal-work-milestone="${ids.next}"]`);
  await nextStage.getByRole("button", { name: "+ Task", exact: true }).click();
  const activation = page.getByRole("dialog", {
    name: "Task zu „Methodischen Ansatz prüfen“ hinzufügen",
    exact: true,
  });
  await activation.locator('[name="expectedUpdatedAt"]').evaluate((input) => {
    input.value = "2000-01-01T00:00:00Z";
  });
  await activation
    .getByRole("button", { name: "Zwischenziel aktivieren", exact: true })
    .click();
  await expect(activation.getByRole("alert")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(stage).toHaveAttribute("data-current", "true");
  await expect(nextStage).not.toHaveAttribute("data-current", "true");
  checks.push(
    "stale activation error visible; failed write and reload retain exactly one unchanged Current",
  );
  await stage.getByRole("link", { name: "+ Task", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`goalMilestone=${ids.current}`));
  const create = page.getByRole("form", {
    name: "Task erstellen",
    exact: true,
  });
  const createdTitle = `Goal capture ${randomUUID().slice(0, 8)}`;
  await create.locator('[name="title"]').fill(createdTitle);
  await create
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/goals/${f.ids.goal}\\?`));
  await page.reload();
  await expect(stage).toContainText(createdTitle);
  await expect(root.locator('[data-goal-primary-task="true"]')).toHaveCount(0); // two eligible Tasks preserve choice
  checks.push(
    "real milestone Task Create/canonical context/reload; Calendar Week selected-task handoff; direct Task once; BLOCKED reason; one Current",
  );
  const editTrigger = root
    .locator("header")
    .getByRole("button", { name: "Bearbeiten", exact: true });
  await editTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Ziel bearbeiten", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editTrigger).toBeFocused();
  for (const viewport of [
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      viewport.width,
    );
    await editTrigger.click();
    const bounds = await page
      .getByRole("dialog", { name: "Ziel bearbeiten", exact: true })
      .boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y + bounds.height <= viewport.height,
    );
    await page.keyboard.press("Escape");
    await expect(editTrigger).toBeFocused();
  }
  checks.push(
    "desktop/Short Mac/mobile normal flow, no horizontal overflow; bounded dialog; keyboard Escape/focus return",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await go(ids.empty);
  await expect(root.locator("[data-goal-work-milestone]")).toHaveCount(0);
  await expect(
    root.getByRole("region", { name: "Direkte Goal Tasks", exact: true }),
  ).toContainText("Noch keine Tasks");
  await go(ids.flow);
  await expect(root.locator(`[data-goal-task="${ids.flowTask}"]`)).toHaveCount(
    1,
  );
  await goalDetailBrowserFlow({
    page,
    origin: app.origin,
    goalId: ids.flow,
    taskId: ids.flowTask,
  });
  checks.push(
    "flat and Empty Goal; identity/criterion/milestone/association writes reload; task completion does not achieve milestone or Goal; explicit milestone/Goal review, achieved/reopen/history",
  );
  await go(ids.archived);
  await expect(root.locator("button:visible")).toHaveCount(1); // read-only criterion viewer
  await expect(
    root.getByRole("link", { name: "+ Task", exact: true }),
  ).toHaveCount(0);
  checks.push("archive read-only; native foreign-owner/stale guards unchanged");
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, "result.json"),
    JSON.stringify({ status: "PASS", checks, consoleErrors: errors }, null, 2),
  );
  console.log(
    JSON.stringify({ status: "PASS", checks, consoleErrors: errors }),
  );
} finally {
  await browser?.close();
  await app?.stop();
}
