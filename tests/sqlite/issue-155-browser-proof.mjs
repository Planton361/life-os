import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");
const red = process.argv.includes("--base-red");
const output = resolve("test-results/issue-155");
mkdirSync(output, { recursive: true });
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { SqliteRuntime } = require(join(fixture.compiled, "runtime.js"));
const { issueOwnerContext } = require(
  join(fixture.compiled, "owner-context.js"),
);
const inboxId = randomUUID(),
  title = `#155 Deadline ${randomUUID()}`;
function command(body) {
  const store = new SqliteRuntime(fixture.path, { syntheticProof: true });
  try {
    return store.command(
      issueOwnerContext(fixture.ownerId),
      "synthetic.initialize",
      body,
    );
  } finally {
    store.close();
  }
}
command((db, owner) => {
  db.prepare("UPDATE profiles SET timezone='Europe/Berlin' WHERE id=?").run(
    owner,
  );
  db.prepare(
    "INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,?,'Deadline roundtrip',life_now(),life_now(),life_now())",
  ).run(inboxId, owner, title);
});
function task(id) {
  const db = new Database(fixture.path, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return db
      .prepare("SELECT * FROM tasks WHERE user_id=? AND id=?")
      .get(fixture.ownerId, id);
  } finally {
    db.close();
  }
}
const evidence = {
  mode: red ? "BASE_RED" : "HEAD_GREEN",
  owner: fixture.ownerId,
  profileTimezone: "Europe/Berlin",
  browserTimezone: "America/Los_Angeles",
  serverTimezone: "UTC",
  steps: [],
  errors: [],
};
let app, browser;
try {
  app = await startApplication(fixture, { timeZone: "UTC" });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    timezoneId: evidence.browserTimezone,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await context.newPage();
  page.on("pageerror", (e) => evidence.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      evidence.errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400)
      evidence.errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  await page.goto(`${app.origin}/inbox?item=${inboxId}`);
  const active = page.locator('[data-inbox-section="active-item"]');
  await active.getByLabel("Deadline hint", { exact: true }).fill("2026-10-12");
  await active
    .getByRole("button", { name: "Standalone Task", exact: true })
    .click();
  await active
    .getByRole("button", { name: "Einordnen & abschließen", exact: true })
    .click();
  const target = page
    .locator('[aria-label="Letztes Routing"]')
    .getByRole("link", { name: "Ziel öffnen", exact: true });
  await expect(target).toBeVisible();
  const db = new Database(fixture.path, {
    readonly: true,
    fileMustExist: true,
  });
  const taskId = db
    .prepare("SELECT id FROM tasks WHERE user_id=? AND source_inbox_item_id=?")
    .get(fixture.ownerId, inboxId).id;
  db.close();
  const before = task(taskId);
  assert.equal(before.due_at, "2026-10-12T21:59:59.000000Z");
  await target.click();
  await page.goto(`${app.origin}/tasks/${taskId}`);
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Task bearbeiten",
    exact: true,
  });
  await expect(dialog.getByLabel("Deadline", { exact: true })).toHaveValue(
    "2026-10-12",
  );
  await dialog.getByLabel("Titel", { exact: true }).fill(title + " title only");
  await dialog
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.reload();
  const after = task(taskId);
  assert.equal(
    after.due_at,
    red ? "2026-10-12T23:59:59.000000Z" : before.due_at,
  );
  evidence.steps.push({
    name: "real Inbox Confirm → B8 title-only save → reload",
    before: before.due_at,
    after: after.due_at,
    defectReproduced: red,
  });
  if (!red) {
    for (const key of [
      "planned_date",
      "scheduled_start_at",
      "duration_minutes",
      "status",
      "project_id",
      "goal_id",
      "source_inbox_item_id",
    ])
      assert.equal(after[key], before[key], key);
    async function reseed(body) {
      const port = Number(new URL(app.origin).port);
      await page.goto("about:blank");
      const previous = app;
      app = undefined;
      await previous.stop("SIGKILL");
      command(body);
      app = await startApplication(fixture, { port, timeZone: "UTC" });
    }
    const cases = [
      ["Europe/Berlin", "2026-01-31", "2026-01-31T22:59:59.000000Z"],
      ["Europe/Berlin", "2026-03-28", "2026-03-28T22:59:59.000000Z"],
      ["Europe/Berlin", "2026-03-29", "2026-03-29T21:59:59.000000Z"],
      ["Europe/Berlin", "2026-10-24", "2026-10-24T21:59:59.000000Z"],
      ["Europe/Berlin", "2026-10-25", "2026-10-25T22:59:59.000000Z"],
      ["Europe/Berlin", "2026-12-31", "2026-12-31T22:59:59.000000Z"],
      ["America/Los_Angeles", "2026-03-08", "2026-03-09T06:59:59.000000Z"],
      ["America/Los_Angeles", "2026-11-01", "2026-11-02T07:59:59.000000Z"],
      ["America/Los_Angeles", "2026-12-31", "2027-01-01T07:59:59.000000Z"],
      ["Asia/Tokyo", "2027-01-01", "2027-01-01T14:59:59.000000Z"],
      ["Pacific/Auckland", "2026-09-27", "2026-09-27T10:59:59.000000Z"],
    ];
    async function openEditor(id) {
      await page.goto(`${app.origin}/tasks/${id}`);
      await page
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", {
          name: "Änderungen speichern",
          exact: true,
        }),
      ).toBeEnabled();
    }
    async function save() {
      await dialog
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(dialog).toBeHidden();
      await page.reload();
    }
    for (const [zone, day, instant] of cases) {
      const id = randomUUID(),
        name = `#155 ${zone} ${day} ${randomUUID().slice(0, 8)}`;
      await reseed((db, owner) => {
        db.prepare("UPDATE profiles SET timezone=? WHERE id=?").run(
          zone,
          owner,
        );
        db.prepare(
          "INSERT INTO tasks(id,user_id,title,status,planned_date,scheduled_start_at,duration_minutes,created_at,updated_at) VALUES(?,?,?,'planned','2026-10-12','2026-10-12T10:00:00.123456Z',17,life_now(),life_now())",
        ).run(id, owner, name);
      });
      await openEditor(id);
      await expect(dialog.getByLabel("Deadline", { exact: true })).toHaveValue(
        "",
      );
      await dialog.getByLabel("Deadline", { exact: true }).fill(day);
      await save();
      assert.equal(task(id).due_at, instant);
      const added = task(id);
      await openEditor(id);
      await expect(dialog.getByLabel("Deadline", { exact: true })).toHaveValue(
        day,
      );
      await dialog.getByLabel("Titel", { exact: true }).fill(name + " no-op");
      await save();
      assert.equal(task(id).due_at, instant);
      for (const key of [
        "planned_date",
        "scheduled_start_at",
        "duration_minutes",
        "status",
        "project_id",
        "goal_id",
      ])
        assert.equal(task(id)[key], added[key], key);
      await page.goto(`${app.origin}/calendar?date=${day}&view=week`);
      const marker = page.locator(`#calendar-focus-block-task-deadline-${id}`);
      await expect(marker).toBeVisible();
      await expect(marker.locator("xpath=../..")).toHaveAttribute(
        "data-calendar-current-date",
        "true",
      );
      await marker.click();
      await expect(marker).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(marker.locator("xpath=../..")).toHaveAttribute(
        "data-calendar-current-date",
        "true",
      );
      await openEditor(id);
      await dialog.getByLabel("Deadline", { exact: true }).fill("");
      await save();
      assert.equal(task(id).due_at, null);
      evidence.steps.push({
        name: "real editor add / same-day no-op / explicit clear / reload",
        zone,
        day,
        instant,
      });
    }
    // A pre-existing atypical instant is never normalized by an editor roundtrip.
    await reseed((db, owner) => {
      db.prepare("UPDATE profiles SET timezone='Europe/Berlin' WHERE id=?").run(
        owner,
      );
      db.prepare(
        "UPDATE tasks SET due_at='2026-10-12T23:59:59.123456Z' WHERE user_id=? AND id=?",
      ).run(owner, taskId);
    });
    await openEditor(taskId);
    await expect(dialog.getByLabel("Deadline", { exact: true })).toHaveValue(
      "2026-10-13",
    );
    await dialog
      .getByLabel("Titel", { exact: true })
      .fill(title + " historical");
    await save();
    assert.equal(task(taskId).due_at, "2026-10-12T23:59:59.123456Z");
    await openEditor(taskId);
    await dialog.getByLabel("Deadline", { exact: true }).fill("2026-10-12");
    await save();
    assert.equal(task(taskId).due_at, before.due_at);
    evidence.steps.push({
      name: "historical microsecond no-op and deliberate date replacement",
      status: "PASS",
    });
    // The real B8 edit entry is also reachable from the Portfolio inspector.
    await page.goto(`${app.origin}/portfolio?view=tasks&selected=${taskId}`);
    const inspector = page.getByRole("complementary", {
      name: "Selected Entity",
      exact: true,
    });
    await expect(
      inspector.getByRole("heading", {
        name: title + " historical",
        exact: true,
      }),
    ).toBeVisible();
    await expect(inspector).toContainText("2026-10-12");
    const editLink = inspector.getByRole("link", {
      name: "Details öffnen",
      exact: true,
    });
    if (await editLink.count()) {
      await editLink.click();
      await page
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      await expect(dialog.getByLabel("Deadline", { exact: true })).toHaveValue(
        "2026-10-12",
      );
      await dialog
        .getByLabel("Titel", { exact: true })
        .fill(title + " portfolio");
      await save();
      assert.equal(task(taskId).due_at, before.due_at);
      evidence.steps.push({
        name: "Portfolio edit navigation / real B8 save / reload",
        status: "PASS",
      });
    } else throw new Error("Portfolio edit entry missing");
    // Real validation feedback, stale editor denial, and reload keep current data.
    await openEditor(taskId);
    await dialog.getByLabel("Deadline", { exact: true }).evaluate((el) => {
      el.type = "text";
      el.value = "2026-02-30";
    });
    await dialog
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog
      .getByRole("button", { name: "Abbrechen", exact: true })
      .last()
      .click();
    await openEditor(taskId);
    const staleBefore = task(taskId);
    const second = await context.newPage();
    await second.goto(`${app.origin}/tasks/${taskId}`);
    await second
      .getByRole("button", { name: "Bearbeiten", exact: true })
      .click();
    const secondDialog = second.getByRole("dialog", {
      name: "Task bearbeiten",
      exact: true,
    });
    await secondDialog
      .getByLabel("Titel", { exact: true })
      .fill(title + " concurrent");
    await secondDialog
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await expect(secondDialog).toBeHidden();
    await second.close();
    const concurrent = task(taskId);
    await dialog
      .getByLabel("Titel", { exact: true })
      .fill(title + " stale overwrite");
    await dialog
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("zwischenzeitlich");
    assert.notEqual(concurrent.updated_at, staleBefore.updated_at);
    assert.deepEqual(task(taskId), concurrent);
    await page.reload();
    evidence.steps.push({
      name: "visible validation / stale editor error / no partial mutation",
      status: "PASS",
    });
    // Scoped surface inventory, full screenshots and bounds at all contract viewports.
    evidence.inventory = [];
    for (const [surface, route] of [
      ["task", `/tasks/${taskId}`],
      ["portfolio", `/portfolio?view=tasks&selected=${taskId}`],
      ["calendar", "/calendar?date=2026-10-12&view=week"],
    ]) {
      await page.goto(app.origin + route);
      for (const [width, height] of [
        [3840, 2160],
        [1920, 1080],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        const bounds = await page.locator("#main-content").evaluate((el) => ({
          scrollWidth: document.documentElement.scrollWidth,
          controls: [
            ...el.querySelectorAll("button,a,input,select,textarea,summary"),
          ]
            .filter((c) => c.getClientRects().length)
            .map((c) => ({
              tag: c.tagName,
              label: c.getAttribute("aria-label") || c.textContent?.trim(),
              left: c.getBoundingClientRect().left,
              right: c.getBoundingClientRect().right,
            })),
        }));
        assert.ok(
          bounds.scrollWidth <= width + 1,
          `${surface} overflow ${width}`,
        );
        evidence.inventory.push({ surface, width, ...bounds });
        await page.screenshot({
          path: join(output, `${surface}-${width}.png`),
          fullPage: true,
        });
      }
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openEditor(taskId);
    for (const [width, height] of [
      [3840, 2160],
      [1920, 1080],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      const bounds = await dialog.boundingBox();
      assert.ok(
        bounds &&
          bounds.x >= -1 &&
          bounds.y >= -1 &&
          bounds.x + bounds.width <= width + 1 &&
          bounds.y + bounds.height <= height + 1,
      );
      await expect(
        dialog.getByLabel("Deadline", { exact: true }),
      ).toBeVisible();
      await dialog.getByLabel("Deadline", { exact: true }).scrollIntoViewIfNeeded();
      await expect(dialog.getByLabel("Deadline", { exact: true })).toBeInViewport();
      await page.screenshot({
        path: join(output, `editor-${width}.png`),
        fullPage: true,
      });
    }
    await dialog.getByLabel("Deadline", { exact: true }).focus();
    await expect(dialog.getByLabel("Deadline", { exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Bearbeiten", exact: true }),
    ).toBeFocused();
    await openEditor(taskId);
    await dialog.getByLabel("Deadline", { exact: true }).fill("2026-10-13");
    await save();
    assert.equal(task(taskId).due_at, "2026-10-13T21:59:59.000000Z");
    await openEditor(taskId);
    await dialog.getByLabel("Deadline", { exact: true }).fill("2026-10-12");
    await save();
    assert.equal(task(taskId).due_at, before.due_at);
    evidence.steps.push({ name: "Mobile internal scroll / actual deadline change / Save / reload", status: "PASS" });
    for (const profile of ["demo", "empty"]) {
      await context.addCookies([
        { name: "life_os_profile", value: profile, url: app.origin },
      ]);
      await page.goto(`${app.origin}/portfolio?view=tasks`);
      await expect(
        page.getByRole("form", { name: "Task bearbeiten", exact: true }),
      ).toHaveCount(0);
      assert.equal(task(taskId).due_at, before.due_at);
    }
    evidence.steps.push({
      name: "4K / Desktop / Mobile surface bounds, keyboard focus, Demo / Empty write guards",
      status: "PASS",
    });
    await browser.close();
    browser = undefined;
    await app.stop("SIGKILL");
    app = await startApplication(fixture, {
      authentication: "blocked",
      timeZone: "UTC",
    });
    browser = await chromium.launch({ headless: true });
    const blocked = await browser.newContext();
    await blocked.addCookies([
      { name: "life_os_profile", value: "manual", url: app.origin },
    ]);
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(`${app.origin}/tasks/${taskId}`);
    await expect(
      blockedPage.getByRole("button", { name: "Bearbeiten", exact: true }),
    ).toHaveCount(0);
    assert.equal(task(taskId).due_at, before.due_at);
    evidence.steps.push({
      name: "own disposable cold restart / Auth-blocked no writes",
      status: "PASS",
    });
  }
  assert.deepEqual(evidence.errors, []);
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.failure = String(error);
  console.error(error);
  if (app) console.error(app.output());
  throw error;
} finally {
  writeFileSync(
    join(output, red ? "base-red.json" : "proof.json"),
    JSON.stringify(evidence, null, 2),
  );
  await browser?.close();
  await app?.stop("SIGKILL");
  releaseApplicationFixture(fixture);
}
