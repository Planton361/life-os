import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-151");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture(),
  require = createRequire(import.meta.url);
const { SqliteRuntime } = require(join(f.compiled, "runtime.js"));
const { issueOwnerContext } = require(join(f.compiled, "owner-context.js"));
const Database = require("better-sqlite3"),
  ids = Object.fromEntries(
    [
      "staleProject",
      "timestampProject",
      "statusProject",
      "staleTask",
      "timestampTask",
      "statusTask",
      "standalone",
      "positive",
    ].map((k) => [k, randomUUID()]),
  );
const store = new SqliteRuntime(f.path, { syntheticProof: true });
try {
  store.command(
    issueOwnerContext(f.ownerId),
    "synthetic.initialize",
    (db, owner) => {
      for (const key of ["stale", "timestamp", "status"]) {
        db.prepare(
          "INSERT INTO projects(id,user_id,title,status,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,life_now(),life_now())",
        ).run(
          ids[key + "Project"],
          owner,
          `#151 ${key} ${randomUUID()}`,
          key === "status" ? "archived" : "active",
          key === "timestamp" ? new Date().toISOString() : null,
        );
        db.prepare(
          "INSERT INTO tasks(id,user_id,title,status,project_id,created_at,updated_at) VALUES(?,?,?,'planned',?,life_now(),life_now())",
        ).run(
          ids[key + "Task"],
          owner,
          `#151 ${key} ${randomUUID()}`,
          ids[key + "Project"],
        );
      }
      for (const key of ["standalone", "positive"])
        db.prepare(
          "INSERT INTO tasks(id,user_id,title,status,project_id,created_at,updated_at) VALUES(?,?,?,'planned',?,life_now(),life_now())",
        ).run(
          ids[key],
          owner,
          `#151 ${key} ${randomUUID()}`,
          key === "positive" ? f.ids.project : null,
        );
    },
  );
} finally {
  store.close();
}
const snapshot = (taskId) => {
  const db = new Database(f.path, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare(
        "SELECT id,title,status,completed_at,project_id FROM tasks WHERE user_id=? AND id=?",
      )
      .get(f.ownerId, taskId);
  } finally {
    db.close();
  }
};
let app, browser;
const errors = [],
  network = [],
  evidence = [];
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
  const page = await context.newPage(),
    editor = await context.newPage(),
    project = await context.newPage();
  for (const p of [page, editor, project]) p.setDefaultTimeout(10_000);
  const negativeMessage =
    "Das Project ist archiviert. Diese Task kann nicht abgeschlossen werden.";
  await step(
    "stale real Completion control rejects after canonical Project archive, visible alert and reload",
    async () => {
      await page.goto(`${app.origin}/tasks/${ids.staleTask}`);
      const completion = page.getByRole("form", {
        name: "Erledigt",
        exact: true,
      });
      await expect(
        completion.getByRole("button", { name: "Erledigt", exact: true }),
      ).toBeEnabled();
      await editor.goto(`${app.origin}/tasks/${ids.staleTask}`);
      await editor
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      await expect(editor.getByRole("dialog")).toBeVisible();
      await project.goto(`${app.origin}/projects/${ids.staleProject}`);
      await project.getByRole("button", { name: "Mehr", exact: true }).click();
      const management = project.getByRole("dialog", {
        name: "Project verwalten",
      });
      await management
        .getByRole("button", { name: "Project archivieren", exact: true })
        .click();
      await expect(management).toBeHidden();
      const before = snapshot(ids.staleTask);
      await completion
        .getByRole("button", { name: "Erledigt", exact: true })
        .click();
      await expect(completion.getByRole("alert")).toHaveText(negativeMessage);
      assert.deepEqual(snapshot(ids.staleTask), before);
      for (const [width, height] of [
        [3840, 2160],
        [1920, 1080],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await expect(completion.getByRole("alert")).toBeVisible();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.screenshot({
          path: join(output, `stale-completion-error-${width}.png`),
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await expect(
        page
          .locator('[aria-label="Task-Aktionen"]')
          .getByRole("button", { name: "Erledigt", exact: true }),
      ).toHaveCount(0);
      assert.deepEqual(snapshot(ids.staleTask), before);
    },
  );
  await step(
    "stale Task editor cannot detach Parent and set done in the same submitted update",
    async () => {
      const dialog = editor.getByRole("dialog");
      await dialog.locator('[name="status"]').evaluate((input) => {
        input.value = "done";
      });
      const projectChoice = dialog.locator('[name="projectId"]');
      await projectChoice.selectOption("");
      const before = snapshot(ids.staleTask);
      await dialog
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toHaveText(negativeMessage);
      assert.deepEqual(snapshot(ids.staleTask), before);
      await editor.reload();
      assert.deepEqual(snapshot(ids.staleTask), before);
    },
  );
  for (const key of ["timestamp", "status"])
    await step(
      `alternative Deep-Link target ${key} rejects server-side, forged owner fields cannot bypass`,
      async () => {
        await page.goto(`${app.origin}/tasks/${ids.standalone}`);
        const form = page.getByRole("form", { name: "Erledigt", exact: true }),
          before = snapshot(ids[key + "Task"]);
        await form.locator('[name="taskId"]').evaluate(
          (input, id) => {
            input.value = id;
          },
          ids[key + "Task"],
        );
        await form.evaluate((el) => {
          for (const name of ["userId", "profileId"]) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = "15100000-0000-4000-8000-000000000099";
            el.append(input);
          }
        });
        await form
          .getByRole("button", { name: "Erledigt", exact: true })
          .click();
        await expect(form.getByRole("alert")).toHaveText(negativeMessage);
        assert.deepEqual(snapshot(ids[key + "Task"]), before);
        await page.goto(`${app.origin}/tasks/${ids[key + "Task"]}`);
        await page.reload();
        await expect(
          page
            .locator('[aria-label="Task-Aktionen"]')
            .getByRole("button", { name: "Erledigt", exact: true }),
        ).toHaveCount(0);
        assert.deepEqual(snapshot(ids[key + "Task"]), before);
      },
    );
  for (const key of ["standalone", "positive"])
    await step(
      `${key} real Completion, success feedback and persisted reload`,
      async () => {
        await page.goto(`${app.origin}/tasks/${ids[key]}`);
        const complete = page
          .getByRole("form", { name: "Erledigt", exact: true })
          .getByRole("button", { name: "Erledigt", exact: true });
        if (key === "standalone") {
          await expect(complete).toBeEnabled();
          await complete.focus();
          await expect(complete).toBeFocused();
          await complete.press("Enter");
        } else await complete.click();
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: "Task abgeschlossen." })
            .last(),
        ).toBeVisible();
        await page.reload();
        assert.equal(snapshot(ids[key]).status, "done");
        assert.ok(snapshot(ids[key]).completed_at);
        await expect(
          page
            .locator('[aria-label="Task-Aktionen"]')
            .getByRole("button", { name: "Erledigt", exact: true }),
        ).toHaveCount(0);
      },
    );
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ])
    await step(`archived Task bounds and screenshot ${width}`, async () => {
      await page.setViewportSize({ width, height });
      await page.goto(`${app.origin}/tasks/${ids.staleTask}`);
      await expect(page.locator("h1")).toHaveCount(1);
      const bounds = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        controls: [
          ...document.querySelectorAll("#main-content button,#main-content a"),
        ]
          .filter((el) => el.getClientRects().length)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { text: el.textContent, left: r.left, right: r.right };
          }),
      }));
      assert.ok(bounds.width <= bounds.viewport + 1);
      assert.ok(
        bounds.controls.every((c) => c.left >= -1 && c.right <= width + 1),
        JSON.stringify(bounds.controls),
      );
      await page.screenshot({
        path: join(output, `archived-task-${width}.png`),
        fullPage: true,
      });
    });
  await step(
    "Demo and Empty do not expose Manual Completion controls",
    async () => {
      for (const profile of ["demo", "empty"]) {
        await context.addCookies([
          { name: "life_os_profile", value: profile, url: app.origin },
        ]);
        await page.goto(`${app.origin}/tasks/${ids.staleTask}`);
        await expect(
          page.getByRole("button", { name: "Erledigt", exact: true }),
        ).toHaveCount(0);
      }
    },
  );
  await context.close();
  await app.stop();
  app = await startApplication(f, { authentication: "blocked" });
  await step("Auth-blocked never admits Completion", async () => {
    const blocked = await browser.newContext();
    await blocked.addCookies([
      { name: "life_os_profile", value: "manual", url: app.origin },
    ]);
    const p = await blocked.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error" || /hydration/i.test(m.text()))
        errors.push(m.text());
    });
    await p.goto(`${app.origin}/tasks/${ids.staleTask}`);
    await expect(
      p.getByRole("button", { name: "Erledigt", exact: true }),
    ).toHaveCount(0);
    await expect(p.locator("#main-content").getByRole("status")).toContainText(
      "lokale Anmeldung",
    );
    assert.equal(snapshot(ids.staleTask).status, "planned");
    await blocked.close();
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
    JSON.stringify(
      { evidence, errors, network, fixtureDirectory: f.directory },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
