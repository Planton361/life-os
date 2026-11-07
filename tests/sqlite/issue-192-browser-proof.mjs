import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// #192: a Dashboard Quick Thought is stored as its full original text with
// title NULL; a Clean Title is required only for a target object.
assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-192");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture(),
  require = createRequire(import.meta.url),
  Database = require("better-sqlite3");
const { SqliteRuntime } = require(join(f.compiled, "runtime.js"));
const { issueOwnerContext } = require(join(f.compiled, "owner-context.js"));
const { saveInboxClarification } = require(
  join(f.compiled, "commands/inbox-commands.js"),
);
const marker = randomUUID().slice(0, 8);
const legacy = {
  id: randomUUID(),
  title: `#192 legacy titled capture ${marker}`,
  body: `Legacy body ${marker} keeps its stored title`,
};
const thought = `Quick Thought ${marker} über Wochenplanung, Lernzeiten am Dienstag und Donnerstag, offene Fragen zur Prüfung und was nächste Woche wirklich zählt`;
const cleanTitle = `#192 Wochenplanung klären ${marker}`;
const editedBody = `Bearbeitete Beschreibung ${marker}: nur Dienstag als Lerntag`;
const store = new SqliteRuntime(f.path, { syntheticProof: true });
try {
  store.command(
    issueOwnerContext(f.ownerId),
    "synthetic.initialize",
    (db, owner) =>
      db
        .prepare(
          "INSERT INTO inbox_items(id,user_id,title,body,source,captured_at,created_at,updated_at) VALUES(?,?,?,?,'inbox.quick_capture',life_now(),life_now(),life_now())",
        )
        .run(legacy.id, owner, legacy.title, legacy.body),
  );
} finally {
  store.close();
}
function read(sql, ...args) {
  const db = new Database(f.path, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(sql).all(...args);
  } finally {
    db.close();
  }
}
const captured = () =>
  read(
    "SELECT * FROM inbox_items WHERE user_id=? AND original_body=?",
    f.ownerId,
    thought,
  );
const targets = (id) =>
  read(
    "SELECT (SELECT count(*) FROM tasks WHERE source_inbox_item_id=?) AS tasks,(SELECT count(*) FROM projects) AS projects,(SELECT count(*) FROM goals) AS goals,(SELECT count(*) FROM resources) AS resources",
    id,
  )[0];
const evidence = [],
  errors = [],
  network = [],
  navigationAborts = [];
let app, browser, inboxId;
const step = async (name, body) => {
  await body();
  evidence.push({ name, status: "PASS" });
  console.log("PASS", name);
};
const snapshots = async (page, surface) => {
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    assert.ok(scrollWidth <= width + 1, `${surface} ${width}: ${scrollWidth}`);
    await page.screenshot({
      path: join(output, `${surface}-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
};
try {
  app = await startApplication(f);
  browser = await chromium.launch({ headless: true });
  // A fresh session per app start; the save step below restarts the app.
  let context, page;
  const openSession = async () => {
    context = await browser.newContext({
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
    context.on("requestfailed", (r) => {
      const failure = r.failure()?.errorText ?? "unknown";
      if (failure === "net::ERR_ABORTED")
        navigationAborts.push({ url: r.url(), failure });
      else errors.push(`Transport ${failure} ${r.url()}`);
    });
    page = await context.newPage();
    page.setDefaultTimeout(10_000);
  };
  await openSession();
  const active = () => page.locator('[data-inbox-section="active-item"]');
  const form = () =>
    page.getByRole("form", { name: "Active Item bearbeiten", exact: true });

  await step(
    "Dashboard Quick Thought stores the full original text with title NULL",
    async () => {
      await page.goto(`${app.origin}/dashboard`);
      const quick = page.locator('section[aria-labelledby="quick-thought-title"]');
      await quick.getByLabel("Quick Thought", { exact: true }).fill(thought);
      await snapshots(page, "dashboard-quick-thought");
      await quick.locator('button[type="submit"]').click();
      await expect
        .poll(() => captured().length, { timeout: 10_000 })
        .toBe(1);
      const [row] = captured();
      inboxId = row.id;
      assert.equal(row.title, null);
      assert.equal(row.body, thought);
      assert.equal(row.original_title, null);
      assert.equal(row.original_body, thought);
      assert.equal(row.status, "raw");
      assert.equal(row.source, "inbox.quick_capture");
    },
  );

  const assertUntitledWorkspace = async () => {
    const queueButton = page
      .locator('[aria-labelledby="inbox-queue-title"]')
      .getByRole("button", { name: new RegExp(`Quick Thought ${marker}`) });
    await expect(queueButton).toHaveCount(1);
    await expect(queueButton).toContainText(thought.slice(0, 40));
    await expect(
      active().getByRole("heading", { level: 2 }),
    ).toContainText(`Quick Thought ${marker}`);
    await expect(form().getByLabel("Clean Title", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      form().getByLabel("Description / Context"),
    ).toHaveValue(thought);
    await active().getByText("Original Capture", { exact: true }).click();
    await expect(active().locator("blockquote")).toHaveText(thought);
  };

  await step(
    "Inbox shows a derived preview, empty Clean Title and the full capture; stable after reload",
    async () => {
      await page.goto(`${app.origin}/inbox?item=${inboxId}`);
      await assertUntitledWorkspace();
      await snapshots(page, "inbox-untitled");
      await page.reload();
      await assertUntitledWorkspace();
      assert.equal(captured()[0].title, null);
    },
  );

  await step("Search finds the capture by its original text", async () => {
    const search = page.getByRole("searchbox");
    await search.fill("Lernzeiten am Dienstag");
    const queue = page.locator('[aria-labelledby="inbox-queue-title"]');
    await expect(
      queue.getByRole("button", { name: new RegExp(`Quick Thought ${marker}`) }),
    ).toHaveCount(1);
    await expect(
      queue.getByRole("button", { name: new RegExp(legacy.title) }),
    ).toHaveCount(0);
    await search.fill("");
  });

  await step(
    "Existing titled capture keeps its stored Clean Title",
    async () => {
      await page.goto(`${app.origin}/inbox?item=${legacy.id}`);
      await expect(
        form().getByLabel("Clean Title", { exact: true }),
      ).toHaveValue(legacy.title);
      await expect(
        active().getByRole("heading", { name: legacy.title, exact: true }),
      ).toBeVisible();
    },
  );

  await step(
    "Saved Description edit keeps the preview on the original capture after reload",
    async () => {
      // The Inbox UI has no save-only control (final commit only), so the edit
      // is persisted through the canonical save command while the app is stopped.
      const [before] = captured();
      await context.close();
      await app.stop();
      const writer = new SqliteRuntime(f.path, { syntheticProof: true });
      try {
        writer.command(
          issueOwnerContext(f.ownerId),
          "inbox.save",
          (db, owner) =>
            saveInboxClarification(db, owner, {
              inboxItemId: inboxId,
              expectedUpdatedAt: before.updated_at,
              title: null,
              body: editedBody,
              nextAction: null,
              missingInfo: null,
              priority: "P2",
              energy: null,
              durationMinutes: null,
              areaId: null,
              reviewNeeded: false,
              todayCandidate: false,
              deadlineHint: null,
            }),
        );
      } finally {
        writer.close();
      }
      const row = read(
        "SELECT title,body,original_title,original_body,status FROM inbox_items WHERE id=?",
        inboxId,
      )[0];
      assert.deepEqual(row, {
        title: null,
        body: editedBody,
        original_title: null,
        original_body: thought,
        status: "clarified",
      });
      app = await startApplication(f);
      await openSession();
      await page.goto(`${app.origin}/inbox?item=${inboxId}`);
      for (let pass = 0; pass < 2; pass++) {
        const queueButton = page
          .locator('[aria-labelledby="inbox-queue-title"]')
          .getByRole("button", { name: new RegExp(`Quick Thought ${marker}`) });
        await expect(queueButton).toHaveCount(1);
        await expect(
          active().getByRole("heading", { level: 2 }),
        ).toContainText(`Quick Thought ${marker}`);
        await expect(
          active().getByRole("heading", { level: 2 }),
        ).not.toContainText("Bearbeitete");
        await expect(
          form().getByLabel("Clean Title", { exact: true }),
        ).toHaveValue("");
        await expect(form().getByLabel("Description / Context")).toHaveValue(
          editedBody,
        );
        await active().getByText("Original Capture", { exact: true }).click();
        await expect(active().locator("blockquote")).toHaveText(thought);
        if (pass === 0) await page.reload();
      }
      assert.equal(captured().length, 1);
      assert.equal(
        read("SELECT original_body FROM inbox_items WHERE id=?", inboxId)[0]
          .original_body,
        thought,
      );
    },
  );

  await step(
    "Conversion without a Clean Title is rejected visibly and creates no object",
    async () => {
      await page.goto(`${app.origin}/inbox?item=${inboxId}`);
      const before = targets(inboxId);
      await active()
        .getByRole("button", { name: "Standalone Task", exact: true })
        .click();
      await active()
        .getByRole("button", { name: "Einordnen & abschließen", exact: true })
        .click();
      await expect(active().getByRole("alert")).toContainText(
        "Vergib zuerst einen Clean Title",
      );
      assert.deepEqual(targets(inboxId), before);
      const [row] = captured();
      assert.equal(row.status, "clarified");
      assert.equal(row.title, null);
      assert.equal(row.created_task_id, null);
      await snapshots(page, "inbox-title-required");
    },
  );

  await step(
    "A user-given Clean Title converts the thought into exactly one Task",
    async () => {
      await form().getByLabel("Clean Title", { exact: true }).fill(cleanTitle);
      await active()
        .getByRole("button", { name: "Einordnen & abschließen", exact: true })
        .click();
      const result = page.locator('[aria-label="Letztes Routing"]');
      await expect(
        result.getByRole("link", { name: "Ziel öffnen", exact: true }),
      ).toBeVisible();
      const tasks = read(
        "SELECT * FROM tasks WHERE user_id=? AND source_inbox_item_id=?",
        f.ownerId,
        inboxId,
      );
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].title, cleanTitle);
      assert.ok(tasks[0].description.startsWith(editedBody));
      const [row] = captured();
      assert.equal(row.status, "triaged");
      assert.equal(row.title, cleanTitle);
      assert.equal(row.created_task_id, tasks[0].id);
      assert.equal(row.original_title, null);
      assert.equal(row.original_body, thought);
      await result.getByRole("link", { name: "Ziel öffnen", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`selected=${tasks[0].id}`));
      await page.reload();
      await expect(
        page.getByRole("complementary", { name: "Selected Entity", exact: true }),
      ).toContainText(cleanTitle);
    },
  );

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
      { evidence, errors, network, navigationAborts, fixtureDirectory: f.directory },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
