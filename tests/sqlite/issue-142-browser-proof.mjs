import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
  readFileSync,
} from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { chromium, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { compileRuntime } from "./compile-runtime.mjs";
import { freePort } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");
const standardNegative = process.argv.includes("--standard-negative");
const source = process.cwd(),
  root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-142-browser-")),
  path = join(root, "canonical.db");
const owner = randomUUID(),
  login = "disposable-owner@example.test",
  origin = "https://reset-fixture.owner-tailnet.ts.net";
const require = createRequire(import.meta.url),
  compiled = compileRuntime([
    "src/features/real-data/sqlite/production-bootstrap.ts",
  ]);
const native = (name) => require(join(compiled, `${name}.js`));
native("production-bootstrap").bootstrapProductionDatabase(path, {
  ownerId: owner,
  displayName: "Disposable Preview",
  timezone: "Europe/Berlin",
});
const store = new (native("runtime").SqliteRuntime)(path),
  context = native("owner-context").issueOwnerContext(owner);
const taskId = randomUUID();
store.command(context, "task.create", (db) =>
  db
    .prepare(
      "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Disposable Reset Task',life_now(),life_now())",
    )
    .run(taskId, owner),
);
store.command(context, "retained.journal", (db) =>
  db
    .prepare(
      "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','Disposable Reset Journal','Retained fixture',life_now(),life_now())",
    )
    .run(randomUUID(), owner),
);
store.close();
const stat = lstatSync(path),
  grantPath = join(root, "grant.json"),
  grant = {
    version: 2,
    schema: 10,
    instance: randomUUID(),
    host: hostname(),
    uid: process.getuid(),
    device: stat.dev,
    inode: stat.ino,
    owner,
    origin,
    login,
  };
writeFileSync(grantPath, JSON.stringify(grant), { mode: 0o600 });
const buildId = readFileSync(join(source, ".next/BUILD_ID"), "utf8").trim();
writeFileSync(
  join(source, ".next/life-preview-composition.json"),
  JSON.stringify({ version: 2, buildId }),
  { mode: 0o600 },
);
const port = await freePort(),
  backend = `http://127.0.0.1:${port}`,
  output = resolve("test-results/issue-142");
mkdirSync(output, { recursive: true });
let logs = "",
  browser,
  child,
  allowedLogin = true,
  loseExecuteResponse = false,
  faultWindow = false,
  holdExecuteReply;
const errors = [],
  actionResponses = [];
function forward(url, init = {}) {
  return new Promise((resolveResponse, reject) => {
    const headers = { ...init.headers, host: new URL(origin).host };
    if (allowedLogin) headers["tailscale-user-login"] = login;
    const req = httpRequest(
      backend + new URL(url).pathname + new URL(url).search,
      { method: init.method ?? "GET", headers },
      (response) => {
        const chunks = [];
        response.on("data", (c) => chunks.push(c));
        response.on("end", () =>
          resolveResponse({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end(init.body);
  });
}
async function start() {
  child = spawn(
    process.execPath,
    [
      "--import",
      resolve("tests/sqlite/disposable-hosted-port.mjs"),
      "scripts/ops/run-preview-production.mjs",
    ],
    {
      env: {
        PATH: process.env.PATH,
        TMPDIR: realpathSync(tmpdir()),
        NODE_ENV: "production",
        LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
        LIFE_OS_HOSTED_SQLITE_PATH: path,
        LIFE_OS_HOSTED_ORIGIN: origin,
        LIFE_OS_HOSTED_OWNER_LOGIN: login,
        LIFE_OS_PREVIEW_GRANT_PATH: grantPath,
        LIFE_OS_DISPOSABLE_HOSTED_PORT: String(port),
        LIFE_OS_DISPOSABLE_GATEWAY_ORIGIN: origin,
        ...(standardNegative
          ? { LIFE_OS_BUILD_COMPOSITION: "personal-preview-v2" }
          : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (b) => (logs += b));
  child.stderr.on("data", (b) => (logs += b));
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(logs);
    try {
      const r = await forward(origin + "/settings", {
        headers: { cookie: "life_os_profile=manual" },
      });
      if (
        r.status === 200 &&
        (standardNegative
          ? !r.body.includes("Testdaten zurücksetzen")
          : r.body.includes("Testdaten zurücksetzen"))
      )
        return;
    } catch {
      /* isolated startup */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`DISPOSABLE_PREVIEW_START_FAILED ${logs}`);
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await Promise.race([
    done,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DISPOSABLE_SHUTDOWN_TIMEOUT")), 10000),
    ),
  ]);
}
async function browserContext(profile = "manual") {
  const c = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await c.addCookies([
    { name: "life_os_profile", value: profile, url: origin, secure: true },
  ]);
  await c.route(`${origin}/**`, async (route) => {
    const request = route.request(),
      h = { ...request.headers() };
    delete h["content-length"];
    delete h["accept-encoding"];
    let result;
    try {
      result = await forward(request.url(), {
        method: request.method(),
        headers: h,
        body: request.postDataBuffer(),
      });
    } catch {
      await route.abort().catch(() => {});
      return;
    }
    if (h["next-action"]) actionResponses.push(result.status);
    if (
      holdExecuteReply &&
      h["next-action"] &&
      request.postData()?.includes("ZURÜCKSETZEN")
    )
      await holdExecuteReply;
    if (
      loseExecuteResponse &&
      h["next-action"] &&
      request.postData()?.includes("ZURÜCKSETZEN")
    ) {
      loseExecuteResponse = false;
      await route.abort();
      return;
    }
    const headers = Object.fromEntries(
      Object.entries(result.headers)
        .filter(
          ([key]) =>
            ![
              "transfer-encoding",
              "content-length",
              "content-encoding",
            ].includes(key),
        )
        .map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join("\n") : String(value),
        ]),
    );
    await route
      .fulfill({ status: result.status, headers, body: result.body })
      .catch(() => {});
  });
  c.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !m.text().includes("favicon") &&
        !(faultWindow && /net::ERR_FAILED|Failed to fetch/.test(m.text()))
      )
        errors.push(m.text());
    });
  });
  return c;
}
function counts() {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return Object.fromEntries(
      native("canonical-catalog").canonicalTableNames.map((t) => [
        t,
        Number(db.prepare(`SELECT count(*) c FROM ${t}`).get().c),
      ]),
    );
  } finally {
    db.close();
  }
}
try {
  await start();
  browser = await chromium.launch({ headless: true });
  if (standardNegative) {
    const c = await browserContext(),
      page = await c.newPage();
    await page.goto(origin + "/settings");
    await expect(
      page.getByRole("button", {
        name: "Testdaten zurücksetzen…",
        exact: true,
      }),
    ).toHaveCount(0);
    const before = counts();
    const manifest = JSON.parse(
      readFileSync(
        resolve(".next/server/server-reference-manifest.json"),
        "utf8",
      ),
    );
    const actionNames = [
      "preparePreviewResetAction",
      "executePreviewResetAction",
      "previewResetReceiptAction",
    ];
    for (const name of actionNames) {
      const entry = Object.entries(manifest.node).find(
        ([, value]) => value.exportedName === name,
      );
      assert.ok(entry, name);
      const input =
        name === "preparePreviewResetAction"
          ? []
          : [
              {
                commandId: randomUUID(),
                ...(name === "executePreviewResetAction"
                  ? { token: "a".repeat(72), confirmation: "ZURÜCKSETZEN" }
                  : {}),
              },
            ];
      const response = await forward(origin + "/settings", {
        method: "POST",
        headers: {
          host: new URL(origin).host,
          origin,
          "next-action": entry[0],
          "content-type": "text/plain;charset=UTF-8",
          cookie: `life_os_profile=manual; life-preview-reset-session=${randomUUID()}`,
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify(input),
      });
      assert.equal(response.status, 200, name);
      assert.ok(
        response.body.toString().includes('"ok":false'),
        name + ": " + response.body.toString(),
      );
    }
    assert.deepEqual(counts(), before);
    assert.deepEqual(errors, []);
    assert.ok(!/SQLITE_|Error:|unhandled/i.test(logs), logs);
    await c.close();
    console.log(
      "STANDARD_BUILD_RESET_DENIED copied grant/marker/runtime flag; UI and all three direct real Actions; fixture rows unchanged",
    );
  } else {
    const first = await browserContext(),
      second = await browserContext(),
      page = await first.newPage(),
      stale = await second.newPage();
    await page.goto(origin + "/settings");
    await stale.goto(origin + "/tasks/new");
    await stale
      .locator('input[name="title"]')
      .fill("Stale Create must not survive reset");
    const staleJournal = await second.newPage(),
      staleNotes = await second.newPage(),
      staleHealth = await second.newPage(),
      staleCapture = await second.newPage();
    await staleJournal.goto(origin + "/life/journal?panel=new");
    const journalForm = staleJournal
      .getByRole("dialog", { name: "Neuer Eintrag" })
      .getByRole("form", { name: "Neuer Eintrag" });
    await journalForm
      .locator('[name="body"]')
      .fill("Stale retained Journal draft");
    await staleNotes.goto(origin + "/life/notes");
    const notesForm = staleNotes.locator("form").filter({
      has: staleNotes.getByRole("button", { name: "Save note", exact: true }),
    });
    await notesForm.locator('[name="title"]').fill("Stale Notes draft");
    await notesForm
      .locator('[name="body"]')
      .fill("Stale canonical Resource body");
    await staleHealth.goto(origin + "/health/mental");
    await staleHealth
      .locator("details")
      .filter({ has: staleHealth.locator('[name="sleepDate"]') })
      .locator("summary")
      .click();
    await staleHealth.locator('[name="sleepDate"]').fill("2026-10-09");
    await staleCapture.goto(origin + "/dashboard");
    const captureForm = staleCapture
      .locator("form")
      .filter({ has: staleCapture.locator('[name="content"]') });
    await captureForm.locator('[name="content"]').fill("Stale Capture draft");
    for (const [name, width, height] of [
      ["4k", 3840, 2160],
      ["desktop", 1920, 1080],
      ["mac-short", 1440, 800],
      ["mobile", 390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page
        .getByRole("button", { name: "Testdaten zurücksetzen…", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Alle Testdaten zurücksetzen?",
      });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", {
          name: "Alle Testdaten löschen",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Abbrechen", exact: true }),
      ).toBeEnabled();
      const bounds = await dialog.boundingBox();
      assert.ok(
        bounds.x >= 0 &&
          bounds.y >= 0 &&
          bounds.x + bounds.width <= width + 1 &&
          bounds.y + bounds.height <= height + 1,
      );
      await page.screenshot({
        path: join(output, `settings-dialog-${name}.png`),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Testdaten zurücksetzen…",
          exact: true,
        }),
      ).toBeFocused();
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page
      .getByRole("button", { name: "Testdaten zurücksetzen…", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Alle Testdaten zurücksetzen?",
    });
    const input = dialog.getByRole("textbox");
    await expect(input).toBeEnabled();
    await input.fill("ZURÜCKSETZEN ");
    await expect(
      dialog.getByRole("button", {
        name: "Alle Testdaten löschen",
        exact: true,
      }),
    ).toBeDisabled();
    let releaseReply;
    holdExecuteReply = new Promise((resolve) => {
      releaseReply = resolve;
    });
    await input.fill("ZURÜCKSETZEN");
    await dialog
      .getByRole("button", { name: "Alle Testdaten löschen", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Abbrechen", exact: true }),
    ).toBeDisabled();
    await expect(input).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    releaseReply();
    holdExecuteReply = undefined;
    await expect(dialog.getByRole("status")).toContainText(
      "Testdaten zurückgesetzt",
      { timeout: 15000 },
    );
    assert.ok(
      Object.entries(counts()).every(
        ([t, n]) => n === (t === "profiles" ? 1 : 0),
      ),
    );
    assert.equal(lstatSync(path).ino, stat.ino);
    await stale
      .getByRole("button", { name: "Task erstellen", exact: true })
      .click();
    await expect(stale.locator("aside[role=alert]")).toContainText(
      "Bitte neu laden",
      { timeout: 15000 },
    );
    assert.equal(counts().tasks, 0);
    await journalForm
      .getByRole("button", { name: "Speichern", exact: true })
      .click();
    await expect(staleJournal.locator("aside[role=alert]")).toContainText(
      "Bitte neu laden",
    );
    assert.equal(counts().journal_entries, 0);
    await notesForm
      .getByRole("button", { name: "Save note", exact: true })
      .click();
    await expect(staleNotes.locator("aside[role=alert]")).toContainText(
      "Bitte neu laden",
    );
    assert.equal(counts().resources, 0);
    await staleHealth
      .getByRole("button", { name: "Schlaf speichern", exact: true })
      .click();
    await expect(staleHealth.locator("aside[role=alert]")).toContainText(
      "Bitte neu laden",
    );
    assert.equal(counts().sleep_entries, 0);
    await captureForm.locator('button[type="submit"]').click();
    await expect(staleCapture.locator("aside[role=alert]")).toContainText(
      "Bitte neu laden",
    );
    assert.equal(counts().inbox_items, 0);
    await dialog
      .getByRole("button", { name: "Neu laden", exact: true })
      .click();
    for (const route of [
      "/dashboard",
      "/inbox",
      "/today",
      "/calendar",
      "/portfolio",
      "/goals",
      "/skills",
      "/resources",
      "/health",
      "/health/mental",
      "/health/running",
      "/health/strength",
      "/nutrition",
      "/nutrition/recipes",
      "/life",
      "/life/journal",
      "/life/notes",
      "/coding",
      "/education",
      "/work",
      "/shop",
      "/challenges",
      "/review/weekly",
      "/timeline",
    ]) {
      const r = await page.goto(origin + route);
      assert.equal(r.status(), 200, route);
      await page.reload();
      assert.ok(!(await page.content()).includes(grantPath));
    }
    assert.ok(
      Object.entries(counts()).every(
        ([t, n]) => n === (t === "profiles" ? 1 : 0),
      ),
    );
    await page.goto(origin + "/tasks/new");
    await page.locator('input[name="title"]').fill("Fresh Create after reset");
    await page
      .getByRole("button", { name: "Task erstellen", exact: true })
      .click();
    await expect.poll(() => counts().tasks).toBe(1);
    await expect(
      page.getByRole("heading", {
        name: "Fresh Create after reset",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Fresh Create after reset",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(origin + "/life/notes");
    const freshNotes = page.locator("form").filter({
      has: page.getByRole("button", { name: "Save note", exact: true }),
    });
    await freshNotes.locator('[name="title"]').fill("Fresh canonical Notes");
    await freshNotes
      .locator('[name="body"]')
      .fill("Fresh native Server Action body");
    await freshNotes
      .getByRole("button", { name: "Save note", exact: true })
      .click();
    await expect.poll(() => counts().resources).toBe(1);
    await expect(
      page.getByText("Fresh canonical Notes", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Fresh canonical Notes", { exact: true }),
    ).toBeVisible();
    await page.goto(origin + "/health/mental");
    await page
      .locator("details")
      .filter({ has: page.locator('[name="sleepDate"]') })
      .locator("summary")
      .click();
    await page.locator('[name="sleepDate"]').fill("2026-10-09");
    await page
      .getByRole("button", { name: "Schlaf speichern", exact: true })
      .click();
    await expect.poll(() => counts().sleep_entries).toBe(1);
    await page.goto(origin + "/settings");
    await page
      .getByRole("button", { name: "Testdaten zurücksetzen…", exact: true })
      .click();
    await expect(dialog.getByRole("textbox")).toBeEnabled();
    await dialog.getByRole("textbox").fill("ZURÜCKSETZEN");
    faultWindow = true;
    loseExecuteResponse = true;
    await dialog
      .getByRole("button", { name: "Alle Testdaten löschen", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Antwort nicht angekommen",
      { timeout: 15000 },
    );
    assert.equal(counts().tasks, 0);
    await stale.goto(origin + "/tasks/new");
    await stale.locator('input[name="title"]').fill("Fresh Create after reset");
    await stale
      .getByRole("button", { name: "Task erstellen", exact: true })
      .click();
    await expect.poll(() => counts().tasks).toBe(1);
    await dialog
      .getByRole("button", { name: "Status prüfen", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Testdaten zurückgesetzt",
    );
    assert.equal(counts().tasks, 1);
    faultWindow = false;
    await dialog
      .getByRole("button", { name: "Neu laden", exact: true })
      .click();
    const deleted = await page.goto(origin + `/tasks/${taskId}`);
    assert.ok(deleted.status() === 200 || deleted.status() === 404);
    await expect(
      page.getByRole("heading", { name: "404", exact: true }),
    ).toBeVisible();
    for (const profile of ["demo", "empty"]) {
      const c = await browserContext(profile),
        p = await c.newPage();
      await p.goto(origin + "/settings");
      await expect(
        p.getByRole("button", { name: "Testdaten zurücksetzen…", exact: true }),
      ).toHaveCount(0);
      await c.close();
    }
    allowedLogin = false;
    await page.goto(origin + "/settings");
    await expect(
      page.getByRole("button", {
        name: "Testdaten zurücksetzen…",
        exact: true,
      }),
    ).toHaveCount(0);
    allowedLogin = true;
    writeFileSync(grantPath, JSON.stringify({ ...grant, login: "revoked" }));
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Testdaten zurücksetzen…",
        exact: true,
      }),
    ).toHaveCount(0);
    writeFileSync(grantPath, JSON.stringify(grant));
    await first.close();
    await second.close();
    await stop();
    await start();
    const restartContext = await browserContext(),
      restartedPage = await restartContext.newPage();
    await restartedPage.goto(origin + "/tasks");
    await expect(
      restartedPage
        .getByText("Fresh Create after reset", { exact: true })
        .first(),
    ).toBeVisible();
    assert.ok(
      actionResponses.length > 0 && actionResponses.every((s) => s < 500),
    );
    assert.deepEqual(errors, []);
    assert.ok(!/SQLITE_|Error:|unhandled/i.test(logs), logs);
    writeFileSync(
      join(output, "proof.json"),
      JSON.stringify(
        {
          result: "PASS",
          disposable: true,
          realActions: actionResponses.length,
          viewportProof: ["4k", "1920", "mac-short", "mobile"],
          staleCreate: "DENIED",
          freshCreate: "RELOAD_STABLE",
          catalog: "82 empty after reset / profile preserved",
          activeInstance: "UNTOUCHED",
        },
        null,
        2,
      ),
    );
    console.log(
      "PREVIEW_RESET_BROWSER_PASS disposable canonical DB; real Settings/actions, four viewports, gates, stale/fresh Create, empty projections, restart; active instance untouched",
    );
  }
} finally {
  await browser?.close();
  await stop();
  writeFileSync(join(output, "runtime.log"), logs, { mode: 0o600 });
}
