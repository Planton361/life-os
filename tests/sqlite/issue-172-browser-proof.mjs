import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect as baseExpect } from "@playwright/test";

import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";
import {
  assertCockpit,
  cockpitGeometry,
  cockpitViewports,
  consoleProof,
} from "../e2e/support/dashboard-cockpit.ts";

const expect = baseExpect.configure({ timeout: 12000 });

const output = resolve("test-results/issue-172");
mkdirSync(output, { recursive: true });
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const native = (name) => require(join(fixture.compiled, `${name}.js`));
const { SqliteRuntime } = native("runtime");
const { issueOwnerContext } = native("owner-context");
const { createSqliteTaskStepRepository } = native(
  "repositories/task-step-repository",
);
const { sqliteApplicationRepositories } = require(
  join(
    fixture.compiled,
    "dependencies/src/features/real-data/runtime/sqlite-adapter.js",
  ),
);
const owner = issueOwnerContext(fixture.ownerId);
const title = `#172 Current Task · ${randomUUID()}`;
const nextTitle = `#172 Next Task · ${randomUUID()}`;
const proof = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  matrix: [],
  controls: [],
  errors: [],
  flows: [],
};
const store = new SqliteRuntime(fixture.path, { syntheticProof: true });
try {
  store.command(owner, "task.update", (db) =>
    db
      .prepare(
        "UPDATE tasks SET title=?,status='active',duration_minutes=45 WHERE user_id=? AND id=?",
      )
      .run(title, fixture.ownerId, fixture.ids.task),
  );
  const repo = createSqliteTaskStepRepository(store, owner);
  for (let i = 0; i < 4; i++)
    assert.ok(
      repo.write("create", {
        taskId: fixture.ids.task,
        title: `#172 Step ${i + 1}`,
        position: i,
      }),
    );
  for (const s of repo.read(fixture.ids.task).slice(0, 2))
    assert.ok(
      repo.write("update", {
        taskId: fixture.ids.task,
        stepId: s.id,
        title: s.title,
        position: s.position,
        completed: true,
      }),
    );
  const repositories = sqliteApplicationRepositories(store, owner);
  const next = await repositories.tasks.createTask({
    userId: fixture.ownerId,
    profileId: fixture.ownerId,
    title: nextTitle,
    plannedDate: fixture.day,
  });
  assert.ok(next.ok, JSON.stringify(next));
  fixture.nextTask = next.data.id;
} finally {
  store.close();
}

let app, browser, context, page, activeErrors;
const distDir = process.env.ISSUE172_DIST_DIR;
async function start(authentication = "issue", imports = []) {
  app = await startApplication(fixture, { authentication, imports, distDir });
  context = await browser.newContext();
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  page = await context.newPage();
  return observePage();
}
function observePage() {
  page.setDefaultTimeout(12000);
  const errors = consoleProof(page);
  activeErrors = errors;
  const origin = app.origin;
  page.on("response", (r) => {
    if (r.status() >= 500 && r.url().startsWith(origin))
      errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return errors;
}
async function stop(errors) {
  proof.errors.push(...errors);
  assert.deepEqual(errors, []);
  assert.ok(!app.output().includes("SQLITE_PROOF_SUPABASE_NETWORK_DENIED"));
  await context.close();
  await app.stop("SIGTERM");
  app = undefined;
}
const current = () => page.locator(".daily-control-current");
async function dashboard(expected) {
  await page.goto(app.origin + "/dashboard");
  await expect(current()).toContainText(title);
  await expect(current().getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    String(expected),
  );
  await page.reload();
  await expect(current().getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    String(expected),
  );
}
async function detail() {
  await current().getByRole("link", { name: "Open task", exact: true }).click();
  await page.waitForURL(`**/tasks/${fixture.ids.task}`);
  await expect(page.locator("h1")).toHaveText(title);
}
async function toggle(n, done) {
  const label = `${done ? "Schritt erledigen" : "Schritt wieder öffnen"}: #172 Step ${n}`;
  await page.getByRole("checkbox", { name: label, exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: `${done ? "Schritt wieder öffnen" : "Schritt erledigen"}: #172 Step ${n}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: `${done ? "Schritt wieder öffnen" : "Schritt erledigen"}: #172 Step ${n}`,
      exact: true,
    }),
  ).toBeVisible();
}

try {
  browser = await chromium.launch({ headless: true });
  let errors = await start();
  const display = await context.newCDPSession(page);
  for (const profile of ["manual", "demo", "empty"]) {
    await context.addCookies([
      { name: "life_os_profile", value: profile, url: app.origin },
    ]);
    for (const viewport of cockpitViewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await display.send("Emulation.setDeviceMetricsOverride", {
        ...viewport,
        mobile: false,
      });
      await page.goto(app.origin + "/dashboard");
      await expect(page.locator(".dashboard-daily")).toBeVisible();
      if (profile === "empty") {
        await expect(current().getByRole("progressbar")).toHaveCount(0);
        await expect(current()).not.toContainText(title);
        await expect(current()).not.toContainText("min geplant");
      } else {
        await expect(current().getByRole("progressbar")).toHaveAccessibleName(
          "2 von 4 Schritten erledigt · 50 %",
        );
        await expect(current()).toContainText(
          `${profile === "manual" ? 45 : 55} min geplant`,
        );
        await expect(current()).not.toContainText(/left|remaining|42\s*%/i);
      }
      const geometry = await assertCockpit(page);
      const bounds = await current().evaluate((e) => {
        const b = e.getBoundingClientRect();
        return [...e.querySelectorAll("p,button,a,[role=progressbar]")].map(
          (n) => ({
            text: n.textContent,
            inside:
              n.getBoundingClientRect().bottom <= b.bottom + 1 &&
              n.getBoundingClientRect().right <= b.right + 1,
          }),
        );
      });
      assert.ok(
        bounds.every((n) => n.inside),
        JSON.stringify({ profile, viewport, bounds }),
      );
      await page.screenshot({
        path: join(output, `${profile}-${viewport.name}.png`),
        fullPage: true,
        scale: "css",
      });
      proof.matrix.push({ profile, viewport, geometry, bounds });
    }
  }
  // Profile cookies above are set out of band for the screenshot matrix.
  // Start the real Manual workflow with a fresh router/prefetch cache, as a
  // normal browser opening this profile would. No navigation retry/reload is
  // used to make a failed Task link pass.
  proof.errors.push(...errors);
  assert.deepEqual(errors, []);
  await context.close();
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  page = await context.newPage();
  errors = observePage();
  await dashboard(50);
  proof.controls = await page
    .locator(".dashboard-daily a,.dashboard-daily button")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        text: n.textContent.trim(),
        href: n.getAttribute("href"),
      })),
    );
  await page
    .locator(`.daily-control-queue a[href="/tasks/${fixture.nextTask}"]`)
    .click();
  await page.waitForURL(`**/tasks/${fixture.nextTask}`);
  await expect(page.locator("h1")).toHaveText(nextTitle);
  await dashboard(50);
  await detail();
  await toggle(3, true);
  await dashboard(75);
  await detail();
  await toggle(3, false);
  await dashboard(50);
  await detail();
  await page.getByRole("button", { name: "+ Schritt", exact: true }).click();
  const create = page.getByRole("dialog", {
    name: "Arbeitsschritt anlegen",
    exact: true,
  });
  await create
    .getByLabel("Neuer Arbeitsschritt", { exact: true })
    .fill("#172 Added through real control");
  await create
    .getByRole("button", { name: "Schritt hinzufügen", exact: true })
    .click();
  await expect(create).not.toBeVisible();
  await page.reload();
  await expect(
    page
      .locator("[data-task-step]")
      .filter({ hasText: "#172 Added through real control" }),
  ).toBeVisible();
  await dashboard(40);
  await detail();
  const added = page
    .locator("[data-task-step]")
    .filter({ hasText: "#172 Added through real control" });
  await added
    .getByRole("button", {
      name: "Arbeitsschritt verwalten: #172 Added through real control",
      exact: true,
    })
    .click();
  page.once("dialog", (d) => d.accept());
  await added
    .getByRole("button", { name: "Schritt entfernen", exact: true })
    .click();
  await expect(added).toHaveCount(0);
  await dashboard(50);
  await detail();
  await toggle(3, true);
  await toggle(4, true);
  await dashboard(100);
  await expect(
    current().getByRole("button", { name: "Abschließen", exact: true }),
  ).toBeVisible();
  proof.flows.push(
    "create/check/reopen/archive/reload/projection; 100% steps keeps Task active",
  );
  // An inaccessible Task id exercises the existing Action's visible error path.
  await current()
    .locator('input[name="taskId"]')
    .evaluate((e, id) => {
      e.value = id;
    }, randomUUID());
  await current()
    .getByRole("button", { name: "Abschließen", exact: true })
    .click();
  await expect(page.getByRole("alert").last()).toBeVisible();
  await dashboard(100);
  await current()
    .getByRole("button", { name: "Abschließen", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task abgeschlossen" }).last(),
  ).toBeVisible();
  await expect(current()).toContainText(nextTitle);
  await page.reload();
  await expect(current()).toContainText(nextTitle);
  await expect(current().getByRole("progressbar")).toHaveCount(0);
  await expect(current()).not.toContainText("min geplant");
  const nextLink = current().getByRole("link", {
    name: "Open task",
    exact: true,
  });
  await nextLink.focus();
  await expect(nextLink).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForURL(`**/tasks/${fixture.nextTask}`);
  await page.goto(app.origin + "/dashboard");
  const today = page.locator('.dashboard-stats a[href="/today"]').first();
  await today.click();
  await page.waitForURL("**/today");
  proof.flows.push(
    "explicit Task completion/error; selected Task changes; no steps/no default duration; Task/Today navigation",
  );
  await stop(errors);
  errors = await start("issue", [
    new URL("./issue-172-read-fault.mjs", import.meta.url).pathname,
  ]);
  await page.goto(app.origin + "/dashboard");
  await expect(current()).toContainText("Schrittfortschritt nicht verfügbar");
  await expect(current().getByRole("progressbar")).toHaveCount(0);
  await page.reload();
  await expect(current()).toContainText("Schrittfortschritt nicht verfügbar");
  await page.screenshot({
    path: join(output, "unavailable-desktop.png"),
    fullPage: true,
  });
  await stop(errors);
  errors = await start("blocked");
  const blockedDisplay = await context.newCDPSession(page);
  for (const viewport of cockpitViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await blockedDisplay.send("Emulation.setDeviceMetricsOverride", {
      ...viewport,
      mobile: false,
    });
    assert.equal(
      await page.evaluate(() => devicePixelRatio),
      viewport.deviceScaleFactor,
    );
    await page.goto(app.origin + "/dashboard");
    await expect(current().getByRole("progressbar")).toHaveCount(0);
    await expect(
      current().getByRole("button", { name: "Abschließen", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".dashboard-portfolio")).toContainText(
      "Manual benötigt eine bestätigte Anmeldung.",
    );
    // Denied authentication has no Portfolio cards. Check the full geometry,
    // without applying the populated Portfolio's minimum slot-height rule.
    const geometry = await cockpitGeometry(page);
    assert.ok(geometry.overflow <= 1);
    assert.deepEqual(geometry.overlaps, []);
    assert.deepEqual(geometry.clipped, []);
    assert.equal(geometry.scaled, 0);
    if (geometry.canvas >= 1440) {
      assert.ok(geometry.documentHeight <= viewport.height + 1);
      for (const zone of geometry.zones) {
        assert.ok(zone.y >= 0 && zone.bottom <= viewport.height + 1);
        assert.ok(zone.height > 40);
      }
    }
    proof.matrix.push({ profile: "auth-blocked", viewport, geometry });
    await page.screenshot({
      path: join(output, `auth-blocked-${viewport.name}.png`),
      fullPage: true,
      scale: "css",
    });
  }
  await stop(errors);
  proof.status = "PASS";
} catch (e) {
  proof.status = "FAIL";
  proof.failure = e.stack;
  proof.failureConsole = activeErrors;
  proof.failureApplicationOutput = app?.output();
  await page
    ?.screenshot({ path: join(output, "failure.png"), fullPage: true })
    .catch(() => {});
  throw e;
} finally {
  await browser?.close();
  await app?.stop().catch(() => {});
  writeFileSync(join(output, "proof.json"), JSON.stringify(proof, null, 2));
}
console.log(
  JSON.stringify({
    status: proof.status,
    matrix: proof.matrix.length,
    flows: proof.flows,
    output,
  }),
);
