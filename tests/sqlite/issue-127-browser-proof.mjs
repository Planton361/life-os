import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// Existing disposable native harness only; no personal database/server access.
assert.equal(process.versions.node, "24.21.0");
const output = resolve(
  process.argv.find((value) => value.startsWith("--output="))?.slice(9) ??
    "test-results/issue-127",
);
mkdirSync(output, { recursive: true });
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const { SqliteRuntime } = require(join(fixture.compiled, "runtime.js"));
const { timestamp } = require(join(fixture.compiled, "codecs.js"));
const { issueOwnerContext } = require(
  join(fixture.compiled, "owner-context.js"),
);
const ids = Object.fromEntries(
  ["sparse", "empty", "noContext", "stepOnly", "archivedStepOnly", "long"].map(
    (key) => [key, randomUUID()],
  ),
);
const store = new SqliteRuntime(fixture.path, { syntheticProof: true });
try {
  store.command(issueOwnerContext(fixture.ownerId), "task.update", (db) => {
    const now = timestamp(new Date().toISOString());
    const description =
      "Qualitative und quantitative Ansätze für die Forschungsfrage gegenüberstellen.";
    const note = "Drei Methodenquellen anhand gleicher Kriterien vergleichen.";
    const text = `${description}\n\nNächste Aktion: ${note}`;
    for (const [key, id] of Object.entries(ids)) {
      const body =
        key === "sparse"
          ? text
          : key === "noContext"
            ? `Nächste Aktion: ${note}`
            : key === "long"
              ? Array.from(
                  { length: 80 },
                  (_, index) => `Abschnitt ${index + 1}: ${description}`,
                ).join("\n\n")
              : null;
      db.prepare(
        "INSERT INTO tasks(id,user_id,title,status,description,priority,planned_date,project_id,created_at,updated_at) VALUES(?,?,?,'planned',?,'P1',?,?,?,?)",
      ).run(
        id,
        fixture.ownerId,
        "Forschungsmethoden vergleichen",
        body,
        key === "noContext" ? null : "2026-10-09",
        key === "long" ? fixture.ids.project : null,
        now,
        now,
      );
    }
    db.prepare("UPDATE tasks SET description=? WHERE id=?").run(
      text,
      fixture.ids.task,
    );
    for (const [taskId, title, archived] of [
      [ids.sparse, "Methodenquellen auswählen", false],
      [ids.sparse, "Entscheidungsnotiz vorbereiten", false],
      [ids.stepOnly, "Erster Arbeitsschritt", false],
      [ids.archivedStepOnly, "Archivierter Arbeitsschritt", true],
    ]) {
      db.prepare(
        "INSERT INTO task_steps(id,user_id,task_id,title,position,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      ).run(
        randomUUID(),
        fixture.ownerId,
        taskId,
        title,
        0,
        archived ? now : null,
        now,
        now,
      );
    }
  });
} finally {
  store.close();
}

const measurements = [];
const errors = [];
let app;
let browser;
try {
  app = await startApplication(fixture);
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
  const canvas = page.locator('[data-task-detail-variant="B8"]');
  const work = page.locator("#task-work-content");
  const go = async (id) => {
    await page.goto(`${app.origin}/tasks/${id}`);
    await expect(canvas).toBeVisible();
    await expect(page.locator("#task-work-heading")).toHaveText(
      "Was ist zu tun?",
    );
    await page.evaluate(() => document.fonts.ready);
  };
  const measure = async (label) => {
    const result = await page.evaluate(() => {
      const rect = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      };
      const frame = document.querySelector("[data-task-frame]");
      const context = document.querySelector("[data-task-context]");
      const style = getComputedStyle(frame);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        canvas: rect('[data-task-detail-variant="B8"]'),
        frame: rect("[data-task-frame]"),
        work: rect("#task-work-content"),
        context: rect("[data-task-context]"),
        frameOverflow: style.overflowY,
        frameBackground: style.backgroundColor,
        frameBorder: style.borderTopWidth,
        divider: context
          ? getComputedStyle(context, "::before").backgroundColor
          : null,
      };
    });
    assert.equal(
      result.documentWidth,
      result.viewport.width,
      `${label}: horizontal overflow`,
    );
    assert.equal(
      result.frameOverflow,
      "visible",
      `${label}: clipped/internal scroll`,
    );
    measurements.push({ label, ...result });
    return result;
  };
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
    { width: 769, height: 413 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await go(ids.sparse);
    await expect(canvas).toHaveAttribute("data-task-work-state", "populated");
    const sparse = await measure(`sparse-${viewport.width}x${viewport.height}`);
    if (viewport.width >= 1920) {
      assert.equal(viewport.height - sparse.frame.bottom, 24);
      assert.equal(
        sparse.documentHeight,
        viewport.height,
        "unnecessary body scroll",
      );
      assert.equal(sparse.canvas.width, 1360);
      assert.ok(sparse.work.width > sparse.context.width * 3);
      assert.equal(sparse.work.bottom, sparse.context.bottom);
      assert.equal(sparse.frameBackground, "rgb(15, 23, 36)");
      assert.equal(sparse.frameBorder, "1px");
      assert.equal(sparse.divider, "rgba(148, 163, 184, 0.12)");
      if (viewport.width === 1920) {
        await page.mouse.move(0, 0);
        await page.screenshot({
          path: join(output, "task-detail-1920x1080.png"),
          fullPage: false,
          animations: "disabled",
        });
      }
    } else {
      assert.ok(
        sparse.context.top >= sparse.work.bottom,
        "Work before Context",
      );
      assert.ok(sparse.work.height < 600, "no forced vertical fill");
      await page
        .getByRole("button", { name: "+ Schritt", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Arbeitsschritt anlegen",
        exact: true,
      });
      await expect(dialog.getByLabel("Neuer Arbeitsschritt")).toBeFocused();
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height);
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
    await go(ids.empty);
    await expect(canvas).toHaveAttribute("data-task-work-state", "empty");
    const empty = await measure(`empty-${viewport.width}x${viewport.height}`);
    assert.ok(empty.work.height < 600, "Empty remains content-sized");
    if (viewport.width >= 1920)
      assert.ok(empty.frame.bottom < viewport.height - 100);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const [label, id, state] of [
    ["project-handoff", fixture.ids.task, "populated"],
    ["note-only-no-context", ids.noContext, "populated"],
    ["step-only", ids.stepOnly, "populated"],
    ["archived-step-only", ids.archivedStepOnly, "empty"],
  ]) {
    await go(id);
    await expect(canvas).toHaveAttribute("data-task-work-state", state);
    const value = await measure(label);
    if (state === "populated") assert.equal(1080 - value.frame.bottom, 24);
    if (label === "project-handoff") {
      const back = work.getByRole("link", {
        name: "Zurück zum Project",
        exact: true,
      });
      await expect(back).toHaveAttribute(
        "href",
        `/projects/${fixture.ids.project}`,
      );
      assert.ok((await back.boundingBox()).y < value.frame.bottom - 24);
    }
    if (label === "note-only-no-context") {
      await expect(page.locator("[data-task-context]")).toHaveCount(0);
      assert.equal(value.work.width, value.frame.width - 2);
    }
  }
  await go(ids.long);
  const long = await measure("long-content");
  assert.ok(long.documentHeight > 1080 * 2);
  assert.ok(long.frame.bottom > 1080);
  await work
    .getByRole("button", { name: "+ Schritt", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    work.getByRole("button", { name: "+ Schritt", exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("link", { name: "Zurück zum Project", exact: true })
    .scrollIntoViewIfNeeded();
  assert.ok(
    await page.evaluate(() => scrollY > 0),
    "natural document scrolling",
  );

  // A single canonical note write proves Empty -> populated and reload stability.
  await go(ids.empty);
  await work
    .getByRole("button", { name: "Notiz bearbeiten", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Task bearbeiten",
    exact: true,
  });
  await expect(dialog.getByLabel("Titel", { exact: true })).toBeFocused();
  await dialog
    .locator('[name="nextAction"]')
    .fill("B8 #127 Arbeitsnotiz gespeichert");
  await dialog
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    work.getByRole("region", { name: "Arbeitsnotiz", exact: true }),
  ).toContainText("B8 #127 Arbeitsnotiz gespeichert");
  await expect(canvas).toHaveAttribute("data-task-work-state", "populated");
  assert.equal(1080 - (await measure("note-save-reload")).frame.bottom, 24);
  await go(ids.sparse);
  const checkbox = work.getByRole("checkbox").first();
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.reload();
  await expect(checkbox).toBeChecked();
  await expect(work).toContainText("1 von 2 Schritten erledigt");
  await page
    .locator('[aria-label="Task-Aktionen"]')
    .getByRole("link", { name: "Im Calendar planen", exact: true })
    .click();
  await expect(page).toHaveURL(/view=week/);
  assert.ok(page.url().includes(ids.sparse));
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, "proof.json"),
    JSON.stringify({ measurements, consoleErrors: errors }, null, 2),
  );
  console.log(
    `PASS: ${measurements.length} focused layout cases; note/step Save+Reload, Calendar handoff; screenshot: ${output}`,
  );
} finally {
  await browser?.close();
  if (app) await app.stop();
}
