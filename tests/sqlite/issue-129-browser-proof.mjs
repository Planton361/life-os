import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// Existing disposable native harness; never opens the personal database.
assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-129");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture();
const require = createRequire(import.meta.url);
const native = (name) => require(join(f.compiled, `${name}.js`));
const { SqliteRuntime } = native("runtime");
const { issueOwnerContext } = native("owner-context");
const { timestamp } = native("codecs");
const { projectDepthCommand, readSqliteProjectDepth } = native(
  "repositories/project-depth-repository",
);
const ids = { task: randomUUID(), empty: randomUUID() };
const store = new SqliteRuntime(f.path, { syntheticProof: true });
const owner = issueOwnerContext(f.ownerId);
try {
  store.command(owner, "synthetic.seed", (db) => {
    const now = timestamp(new Date().toISOString());
    for (const [key, id] of Object.entries(ids))
      db.prepare(
        "INSERT INTO tasks(id,user_id,title,status,description,priority,planned_date,created_at,updated_at) VALUES(?,?,?,'planned',?,'P1',?,?,?)",
      ).run(
        id,
        f.ownerId,
        "Forschungsmethoden vergleichen",
        key === "task"
          ? "Qualitative und quantitative Ansätze für die Forschungsfrage gegenüberstellen.\n\nNächste Aktion: Drei Methodenquellen anhand gleicher Kriterien vergleichen."
          : null,
        key === "task" ? "2026-10-09" : null,
        now,
        now,
      );
    for (const [position, title] of [
      "Methodenquellen auswählen",
      "Entscheidungsnotiz vorbereiten",
    ].entries())
      db.prepare(
        "INSERT INTO task_steps(id,user_id,task_id,title,position,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
      ).run(randomUUID(), f.ownerId, ids.task, title, position, now, now);
  });
  const context = readSqliteProjectDepth(store, owner, f.ids.project).context;
  projectDepthCommand(store, owner, {
    projectId: f.ids.project,
    commandId: randomUUID(),
    expectedRevision: context.completion_revision,
    expectedCycle: context.completion_cycle,
    operation: "project.archive",
    payload: {},
  });
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
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });
  const go = async (id) => {
    await page.goto(`${app.origin}/tasks/${id}`);
    await expect(page.locator('[data-task-detail-variant="B8"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  };
  const notes = page.getByRole("region", { name: "Task-Notizen", exact: true });
  const links = page.getByRole("region", {
    name: "Externe Links",
    exact: true,
  });
  await go(ids.empty);
  await expect(notes).toContainText("Noch keine Notizen");
  await expect(links).toContainText("Noch keine Links");
  await notes.getByRole("button", { name: "+ Notiz", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Task-Notiz hinzufügen" });
  await expect(
    dialog.getByRole("textbox", { name: "Notiz", exact: true }),
  ).toBeFocused();
  await dialog
    .getByRole("textbox", { name: "Notiz", exact: true })
    .fill("Abgebrochener Entwurf");
  await dialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await page.reload();
  await expect(notes).toContainText("Noch keine Notizen");
  await notes.getByRole("button", { name: "+ Notiz", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    notes.getByRole("button", { name: "+ Notiz", exact: true }),
  ).toBeFocused();
  checks.push("Projectless Empty, Cancel, keyboard/Escape and return focus");
  await go(ids.task);
  const addNote = async (body) => {
    await notes.getByRole("button", { name: "+ Notiz", exact: true }).click();
    const d = page.getByRole("dialog", { name: "Task-Notiz hinzufügen" });
    await d.getByRole("textbox", { name: "Notiz", exact: true }).fill(body);
    await d.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(d).not.toBeVisible();
    await expect(
      notes.getByRole("listitem").filter({ hasText: body }),
    ).toHaveCount(1);
  };
  const firstNote =
    "Für den Vergleich zuerst die Auswahlkriterien festhalten: Aufwand, Aussagekraft und verfügbare Daten.";
  await addNote(firstNote);
  await page.reload();
  await expect(notes).toContainText(firstNote);
  await addNote(
    "Literaturhinweis: Die Abgrenzung von explorativ und bestätigend noch einmal prüfen.",
  );
  await links.getByRole("button", { name: "+ Link", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Externen Link hinzufügen" });
  await dialog
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("HTTP(S)");
  await expect(
    dialog.getByRole("textbox", { name: "URL", exact: true }),
  ).toHaveValue("javascript:alert(1)");
  await expect(links).toContainText("Noch keine Links");
  await dialog
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("https://github.com/Planton361/life-os");
  await dialog
    .getByRole("textbox", { name: "Titel (optional)", exact: true })
    .fill("Life OS · GitHub-Repository");
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  const repository = links.getByRole("link", {
    name: "Life OS · GitHub-Repository",
  });
  await expect(repository).toHaveAttribute(
    "href",
    "https://github.com/Planton361/life-os",
  );
  await expect(repository).toHaveAttribute("target", "_blank");
  await expect(repository).toHaveAttribute("rel", "noopener noreferrer");
  await links.getByRole("button", { name: "+ Link", exact: true }).click();
  const longUrl = `https://docs.example.test/references/${"long-path-".repeat(40)}`;
  await dialog.getByRole("textbox", { name: "URL", exact: true }).fill(longUrl);
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    links.getByRole("link", { name: "docs.example.test", exact: true }),
  ).toHaveAttribute("href", longUrl);
  await expect(notes.getByRole("listitem")).toHaveCount(2);
  await expect(links.getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("region", { name: "Arbeitsnotiz", exact: true }),
  ).toContainText(
    "Drei Methodenquellen anhand gleicher Kriterien vergleichen.",
  );
  checks.push(
    "Note + HTTP(S) link Save/Reload, title fallback, invalid URL/draft retention, safe external opening, separate Work note",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const desktop = await page.evaluate(() => ({
    bottom: document.querySelector("[data-task-frame]").getBoundingClientRect()
      .bottom,
    height: innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
  }));
  assert.equal(desktop.height - desktop.bottom, 24);
  assert.equal(desktop.scrollHeight, 1080);
  assert.equal(desktop.width, 1920);
  await page.screenshot({
    path: join(output, "task-detail-1920x1080.png"),
    fullPage: false,
  });
  for (const viewport of [
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(notes).toBeVisible();
    await expect(links).toBeVisible();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      viewport.width,
    );
    await links.getByRole("button", { name: "+ Link", exact: true }).click();
    const bounds = await dialog.boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= viewport.height,
    );
    await dialog
      .getByRole("button", { name: "Abbrechen", exact: true })
      .click();
  }
  checks.push(
    "1920 shared frame/24px bottom/no scroll, Short-Mac/Mobile normal flow/no horizontal overflow/bounded dialogs",
  );
  await go(f.ids.task);
  await expect(notes.getByRole("button")).toHaveCount(0);
  await expect(links.getByRole("button")).toHaveCount(0);
  checks.push("Archived parent UI read-only");
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, "result.json"),
    JSON.stringify({ checks, desktop, consoleErrors: errors }, null, 2),
  );
  console.log(
    JSON.stringify({ status: "PASS", checks, desktop, consoleErrors: errors }),
  );
} finally {
  await browser?.close();
  await app?.stop();
}
