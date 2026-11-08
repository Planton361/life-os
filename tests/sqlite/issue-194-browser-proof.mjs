import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// #194: the standard Areas are selectable when creating and editing Tasks,
// Projects, Goals and Skills; the assignment is visible in each detail and
// survives reload.
assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-194");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture(),
  require = createRequire(import.meta.url),
  Database = require("better-sqlite3");
function read(sql, ...args) {
  const db = new Database(f.path, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(sql).all(...args);
  } finally {
    db.close();
  }
}
const areas = Object.fromEntries(
  read(
    "SELECT key,id,name FROM areas WHERE user_id=? AND archived_at IS NULL",
    f.ownerId,
  ).map((a) => [a.key, a]),
);
assert.deepEqual(Object.keys(areas).sort(), [
  "coding",
  "education",
  "life",
  "work",
]);
const areaOf = (table, id) =>
  read(`SELECT area_id FROM ${table} WHERE id=?`, id)[0]?.area_id ?? null;
const marker = randomUUID().slice(0, 8);
const evidence = [],
  errors = [],
  network = [];
let app, browser;
const step = async (name, body) => {
  await body();
  evidence.push({ name, status: "PASS" });
  console.log("PASS", name);
};
try {
  app = await startApplication(f);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  context.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error" || /hydration/i.test(m.text()))
        errors.push(m.text());
    });
  });
  context.on("request", (r) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\//i.test(r.url()))
      network.push(r.url());
  });
  context.on("response", (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const created = async (kind) => {
    await expect(page).toHaveURL(
      new RegExp(`/${kind}s/[0-9a-f-]{36}(\\?|$)`),
    );
    return new URL(page.url()).pathname.split("/")[2];
  };
  const shot = (name) =>
    page.screenshot({ path: join(output, `${name}-1920.png`), fullPage: true });
  const ids = {};
  // Goal header meta line: "<Area> · <Horizont> · …".
  const goalMeta = (name) =>
    page
      .locator("main p")
      .filter({ hasText: new RegExp(`^${name}( · |$)`) });

  await step("Task create with Area Life; visible in Task detail after reload", async () => {
    await page.goto(`${app.origin}/tasks/new`);
    const form = page.getByRole("form", { name: "Task erstellen" });
    await form.getByLabel("Titel", { exact: true }).fill(`#194 Task ${marker}`);
    await form.getByRole("button", { name: "Zuordnung (optional)" }).click();
    await form.getByLabel("Area", { exact: true }).selectOption({ label: "Life" });
    await form.getByRole("button", { name: "Task erstellen" }).click();
    ids.task = await created("task");
    assert.equal(areaOf("tasks", ids.task), areas.life.id);
    for (const pass of [0, 1]) {
      const fact = page
        .getByRole("complementary", { name: "Task-Kontext" })
        .locator("dl > div", { has: page.locator("dt", { hasText: /^Area$/ }) });
      await expect(fact.locator("dd")).toHaveText("Life");
      if (pass === 0) await page.reload();
    }
    await shot("task-detail");
    // An Area alone is no dependency context: predecessor management stays reachable.
    await page.getByRole("button", { name: "Task-Verwaltung" }).click();
    await expect(
      page.getByRole("button", { name: "Vorgänger verwalten", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await step("Task edit changes the Area to Coding; reload-stable", async () => {
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Task bearbeiten" });
    await dialog.getByLabel("Area", { exact: true }).selectOption({ label: "Coding" });
    await dialog.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect.poll(() => areaOf("tasks", ids.task)).toBe(areas.coding.id);
    await page.reload();
    await expect(
      page
        .getByRole("complementary", { name: "Task-Kontext" })
        .locator("dl > div", { has: page.locator("dt", { hasText: /^Area$/ }) })
        .locator("dd"),
    ).toHaveText("Coding");
  });

  await step("Project create with Area Work; visible in Project detail after reload", async () => {
    await page.goto(`${app.origin}/projects/new`);
    const form = page.getByRole("form", { name: "Project erstellen" });
    await form.getByLabel("Titel", { exact: true }).fill(`#194 Project ${marker}`);
    await form.getByLabel("Area", { exact: true }).selectOption({ label: "Work" });
    await form.getByRole("button", { name: "Project erstellen" }).click();
    ids.project = await created("project");
    assert.equal(areaOf("projects", ids.project), areas.work.id);
    for (const pass of [0, 1]) {
      await expect(
        page.locator("main dl > div", { has: page.locator("dt", { hasText: /^Area$/ }) }).locator("dd"),
      ).toHaveText("Work");
      if (pass === 0) await page.reload();
    }
    await shot("project-detail");
  });

  await step("Project edit removes the Area; reload-stable", async () => {
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).first().click();
    const edit = page.getByRole("dialog").filter({ has: page.getByLabel("Area", { exact: true }) });
    await edit.getByLabel("Area", { exact: true }).selectOption("");
    await edit.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect.poll(() => areaOf("projects", ids.project)).toBe(null);
    await page.reload();
    await expect(
      page.locator("main dl > div", { has: page.locator("dt", { hasText: /^Area$/ }) }),
    ).toHaveCount(0);
  });

  await step("Goal create with Area Education; preselected in Goal edit after reload", async () => {
    await page.goto(`${app.origin}/goals/new`);
    const form = page.getByRole("form", { name: "Ziel erstellen" });
    await form.getByLabel("Titel", { exact: true }).fill(`#194 Goal ${marker}`);
    await form.getByRole("button", { name: "Weitere Angaben (optional)" }).click();
    await form.getByLabel("Area", { exact: true }).selectOption({ label: "Education" });
    await form.getByRole("button", { name: "Ziel erstellen" }).click();
    ids.goal = await created("goal");
    assert.equal(areaOf("goals", ids.goal), areas.education.id);
    await page.reload();
    await expect(goalMeta("Education")).toHaveCount(1);
    await shot("goal-detail");
  });

  await step("Goal edit changes the Area to Life; reload-stable", async () => {
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).first().click();
    const edit = page.getByRole("dialog").filter({ has: page.getByLabel("Area", { exact: true }) });
    await expect(edit.getByLabel("Area", { exact: true })).toHaveValue(areas.education.id);
    await edit.getByLabel("Area", { exact: true }).selectOption({ label: "Life" });
    await edit.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect.poll(() => areaOf("goals", ids.goal)).toBe(areas.life.id);
    await page.reload();
    await expect(goalMeta("Life")).toHaveCount(1);
    await expect(goalMeta("Education")).toHaveCount(0);
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).first().click();
    await expect(
      page.getByRole("dialog").filter({ has: page.getByLabel("Area", { exact: true }) }).getByLabel("Area", { exact: true }),
    ).toHaveValue(areas.life.id);
    await page.keyboard.press("Escape");
  });

  await step("Skill create with Area Coding; visible in Skill identity after reload", async () => {
    await page.goto(`${app.origin}/skills/new`);
    const form = page.getByRole("form", { name: "Skill erstellen" });
    await form.getByLabel("Name", { exact: true }).fill(`#194 Skill ${marker}`);
    await form.getByLabel("Area", { exact: true }).selectOption({ label: "Coding" });
    await form.getByRole("button", { name: "Skill erstellen" }).click();
    ids.skill = await created("skill");
    assert.equal(areaOf("skills", ids.skill), areas.coding.id);
    for (const pass of [0, 1]) {
      await expect(page.getByLabel("Skillidentität")).toContainText("Coding");
      if (pass === 0) await page.reload();
    }
    await shot("skill-detail");
  });

  await step("Skill edit changes the Area to Work; reload-stable", async () => {
    await page.getByLabel("Skillaktionen").getByText("Skill verwalten", { exact: true }).click();
    const edit = page.getByRole("form", { name: "Skill speichern" });
    await edit.getByLabel("Area", { exact: true }).selectOption({ label: "Work" });
    await edit.getByRole("button", { name: "Skill speichern" }).click();
    await expect.poll(() => areaOf("skills", ids.skill)).toBe(areas.work.id);
    await page.reload();
    await expect(page.getByLabel("Skillidentität")).toContainText("Work");
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  console.log("Browser-Proof: PASS", evidence.length, "groups");
} finally {
  if (browser) await browser.close();
  if (app && app.child.exitCode === null && app.child.signalCode === null)
    await app.stop();
  writeFileSync(
    join(output, "proof.json"),
    JSON.stringify({ evidence, errors, network, fixtureDirectory: f.directory }, null, 2),
    { mode: 0o600 },
  );
}
