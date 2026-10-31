import assert from "node:assert/strict";
import { createRouteDiagnostics } from "./browser-route-diagnostics.mjs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";
import {
  assertCockpit,
  cockpitViewports,
  consoleProof,
  scrollProof,
} from "../e2e/support/dashboard-cockpit.ts";

assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-170");
mkdirSync(output, { recursive: true });
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const native = (name) => require(join(fixture.compiled, `${name}.js`));
const { SqliteRuntime } = native("runtime");
const { issueOwnerContext } = native("owner-context");
const { projectDepthCommand, readSqliteProjectDepth } = native(
  "repositories/project-depth-repository",
);
const { scheduleLinkedSource } = native("commands/source-commands");
const { sqliteApplicationRepositories } = require(
  join(
    fixture.compiled,
    "dependencies/src/features/real-data/runtime/sqlite-adapter.js",
  ),
);
const owner = issueOwnerContext(fixture.ownerId);
const proof = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  fixture: "sealed disposable sqlite-synthetic / Manual presentation",
  matrix: [],
  failures: [],
  errors: [],
  controls: [],
};
const projects = [];
let app, browser, context, page;
let success = false;
const syntheticFailure = process.env.LIFE_OS_174_SYNTHETIC_FAILURE === "170";
const syntheticMatcherFailure =
  process.env.LIFE_OS_174_SYNTHETIC_FAILURE === "170-matcher";
const diagnostics = createRouteDiagnostics({
  output,
  synthetic: syntheticMatcherFailure ? "matcher" : syntheticFailure,
});

async function prepare(count) {
  const store = new SqliteRuntime(fixture.path, { syntheticProof: true });
  try {
    if (!projects.length) {
      const repositories = sqliteApplicationRepositories(store, owner);
      const existingTasks = store.read(owner, (db) =>
        db
          .prepare(
            "SELECT id FROM tasks WHERE user_id=? AND archived_at IS NULL",
          )
          .all(fixture.ownerId),
      );
      for (const task of existingTasks) {
        const result = await repositories.tasks.archiveTask({
          userId: fixture.ownerId,
          profileId: fixture.ownerId,
          taskId: task.id,
        });
        assert.equal(result.ok, true, JSON.stringify(result));
      }
      const existing = store.read(owner, (db) =>
        db
          .prepare(
            "SELECT id FROM projects WHERE user_id=? AND archived_at IS NULL",
          )
          .all(fixture.ownerId),
      );
      for (const p of existing) {
        const current = readSqliteProjectDepth(store, owner, p.id).context;
        projectDepthCommand(store, owner, {
          projectId: p.id,
          commandId: randomUUID(),
          expectedRevision: current.completion_revision,
          expectedCycle: current.completion_cycle,
          operation: "project.archive",
          payload: { reason: "Disposable #170 fixture" },
        });
      }
    }
    for (let index = projects.length; index < count; index++) {
      const id = randomUUID();
      const title = `#170 ${index + 1} ${index === 0 ? "Sehr langer Projektname für den vollständigen kanonischen Arbeitsstand und die sichere Orientierung" : ["", "Nur explizite Meilensteine", "Alle erfassten Tasks erledigt, Project bleibt aktiv", "Noch keine Tasks oder Meilensteine", "Viele erfasste Tasks"][index]} · ${randomUUID()}`;
      const project = { id, title };
      store.command(owner, "synthetic.initialize", (db) => {
        const now = `2026-10-${String(index === 4 ? 21 : 20 - index).padStart(2, "0")}T10:00:00Z`;
        db.prepare(
          "INSERT INTO projects(id,user_id,title,status,next_step,progress,created_at,updated_at) VALUES(?,?,?,'active',?,'93',?,?)",
        ).run(
          id,
          fixture.ownerId,
          title,
          index === 0
            ? "Gespeicherter Fokus: " +
                "Eine bewusst lange Orientierung ohne algorithmisch abgeleitete nächste Task. ".repeat(
                  12,
                )
            : null,
          now,
          now,
        );
        const insert = db.prepare(
          "INSERT INTO tasks(id,user_id,project_id,title,status,completed_at,archived_at,created_at,updated_at) VALUES(?,?,?,'Synthetic recorded work',?,?,?,?,?)",
        );
        const statuses =
          index === 0
            ? [
                "done",
                "done",
                "done",
                "done",
                "planned",
                "active",
                "planned",
                "waiting",
                "canceled",
                "archived",
              ]
            : index === 2
              ? ["done", "done"]
              : index === 4
                ? Array(1200).fill("waiting")
                : [];
        const ids = statuses.map((status) => {
          const taskId = randomUUID();
          insert.run(
            taskId,
            fixture.ownerId,
            id,
            status,
            status === "done" ? now : null,
            status === "archived" ? now : null,
            now,
            now,
          );
          return taskId;
        });
        if (index === 0) {
          db.prepare(
            "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)",
          ).run(randomUUID(), fixture.ownerId, id, ids[4], ids[6], now);
        }
        if (index < 2) {
          const insertMilestone = db.prepare(
            "INSERT INTO project_milestones(id,user_id,project_id,title,status,sort_order,archived_at,created_at,updated_at) VALUES(?,?,?,'Explicit stage',?,?,?,?,?)",
          );
          for (let m = 0; m < 4; m++)
            insertMilestone.run(
              randomUUID(),
              fixture.ownerId,
              id,
              m === 0 || m === 3 ? "done" : "open",
              m,
              m === 3 ? now : null,
              now,
              now,
            );
        }
      });
      if (index === 0)
        store.command(owner, "source.schedule", (db) => {
          const tomorrow = new Date(`${fixture.day}T12:00:00Z`);
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          const day = tomorrow.toISOString().slice(0, 10);
          const source = scheduleLinkedSource(
            db,
            fixture.ownerId,
            "meal",
            fixture.ids.meal,
            day,
            `${day}T12:00:00Z`,
            30,
          );
          db.prepare(
            "UPDATE tasks SET project_id=? WHERE id=? AND user_id=?",
          ).run(id, source.id, fixture.ownerId);
        });
      projects.push(project);
    }
  } finally {
    store.close();
  }
}

async function start(options = {}) {
  app = await startApplication(fixture, options);
  assert.notEqual(new URL(app.origin).port, "3000");
  context = await browser.newContext({
    viewport: { width: 2560, height: 1355 },
    deviceScaleFactor: 1.5,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  page = await context.newPage();
  diagnostics.attach(page, app);
  const errors = consoleProof(page);
  page.setDefaultTimeout(12000);
  context.on("request", (r) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\//i.test(r.url()))
      errors.push("Unexpected remote request");
  });
  return errors;
}
async function stop(errors) {
  proof.errors.push(...errors);
  assert.deepEqual(errors, []);
  assert.ok(!app.output().includes("SQLITE_PROOF_SUPABASE_NETWORK_DENIED"));
  await context.close();
  await app.stop("SIGKILL");
  app = undefined;
}
const card = () =>
  page.locator(`.portfolio-project-card[href="/projects/${projects[0].id}"]`);
async function assertMixed() {
  await expect(card()).toHaveAccessibleDescription(
    "4/9 Tasks erledigt. 4 erledigt · 2 bereit · 1 blockiert · 2 sonstige offen. 1/3 Meilensteine erledigt.",
  );
  await expect(card().locator(".portfolio-task-count")).toHaveText(
    "4/9 Tasks erledigt",
  );
  await expect(card().getByRole("img")).toHaveAttribute(
    "aria-label",
    "Task-Arbeitsstand: 4 erledigt · 2 bereit · 1 blockiert · 2 sonstige offen",
  );
  await expect(card().locator(".portfolio-work-categories")).toHaveText(
    "2 bereit · 1 blockiert · 2 sonstige offen",
  );
  await expect(card()).not.toContainText("93%");
}

try {
  browser = await chromium.launch({ headless: true });
  for (const count of [1, 4, 5]) {
    await prepare(count);
    const errors = await start();
    const display = await context.newCDPSession(page);
    for (const viewport of cockpitViewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await display.send("Emulation.setDeviceMetricsOverride", {
        ...viewport,
        mobile: false,
      });
      await page.goto(`${app.origin}/dashboard`);
      await expect(page.locator(".dashboard-portfolio")).toBeVisible();
      await expect(page.locator(".portfolio-project-card")).toHaveCount(
        Math.min(count, 4),
      );
      await assertMixed();
      const geometry = await assertCockpit(page);
      assert.equal(geometry.width, viewport.width);
      assert.equal(geometry.height, viewport.height);
      assert.equal(
        await page.evaluate(() => devicePixelRatio),
        viewport.deviceScaleFactor,
      );
      if (count === 5)
        await expect(
          page.locator(
            `.portfolio-project-card[href="/projects/${projects[4].id}"]`,
          ),
        ).toContainText("0/1200 Tasks erledigt");
      const slots = page.locator(".portfolio-slots");
      const cards = await slots.locator("a").evaluateAll((nodes) =>
        nodes.map((a) => ({
          title: a.getAttribute("aria-label"),
          x: a.getBoundingClientRect().x,
          y: a.getBoundingClientRect().y,
          width: a.clientWidth,
          height: a.clientHeight,
        })),
      );
      assert.equal(new Set(cards.map((c) => c.x)).size, 2);
      assert.equal(new Set(cards.map((c) => c.y)).size, 2);
      const workBounds = await card().evaluate((e) => {
        const bounds = e.getBoundingClientRect();
        return [...e.querySelectorAll("h3,p,[role=img]")]
          .filter((n) => getComputedStyle(n).display !== "none")
          .map((n) => ({
            text: n.textContent,
            contained:
              n.getBoundingClientRect().bottom <= bounds.bottom &&
              n.getBoundingClientRect().right <= bounds.right,
          }));
      });
      assert.ok(
        workBounds.every((n) => n.contained),
        JSON.stringify({ viewport, workBounds }),
      );
      await page.screenshot({
        path: join(output, `manual-${count}-${viewport.name}.png`),
        scale: "css",
        fullPage: true,
      });
      await page.reload();
      await assertMixed();
      await slots.focus();
      const firstCard = page.locator(".portfolio-project-card").first();
      const firstHref = await firstCard.getAttribute("href");
      const firstTitle = await firstCard.locator("h3").textContent();
      await page.keyboard.press("Tab");
      await expect(firstCard).toBeFocused();
      diagnostics.begin(firstHref, "keyboard");
      await page.keyboard.press("Enter");
      await page.waitForURL(`**${firstHref}`);
      diagnostics.matched();
      if (syntheticFailure) assert.fail("explicit synthetic failure fixture");
      if (syntheticMatcherFailure) {
        diagnostics.assertionStart("toContainText", 5000);
        await expect(
          page.locator("[data-synthetic-absent-heading]"),
        ).toContainText("synthetic");
      }
      diagnostics.assertionStart("toContainText", 5000);
      await expect(page.locator("h1")).toContainText(firstTitle);
      diagnostics.assertionPassed();
      diagnostics.visible();
      await page.goto(`${app.origin}/dashboard`);
      const baseline = await assertCockpit(page);
      for (const view of ["Goal View", "Skill View", "Project View"]) {
        await page
          .locator(".dashboard-portfolio")
          .getByRole("button", { name: view, exact: true })
          .click();
        const after = await assertCockpit(page);
        if (geometry.canvas >= 1440)
          assert.deepEqual(after.zones, baseline.zones);
        if (view !== "Project View")
          await expect(page.locator(".portfolio-project-work")).toHaveCount(0);
      }
      const record = { count, viewport, geometry, cards, workBounds };
      if (count === 4 && viewport.name === "pg27ucdm") {
        record.reduction = [];
        // Test real assigned card dimensions at both sides of each reduction.
        for (const height of [240, 190, 156]) {
          await card().evaluate((e, h) => {
            e.style.height = `${h}px`;
            e.style.minHeight = `${h}px`;
          }, height);
          const milestoneVisible = await card()
            .locator(".portfolio-project-milestones")
            .isVisible();
          const focusVisible = await card()
            .locator(".portfolio-project-focus")
            .isVisible();
          assert.equal(milestoneVisible, height >= 190);
          assert.equal(focusVisible, height >= 240);
          record.reduction.push({
            height: await card().evaluate((e) => e.clientHeight),
            milestoneVisible,
            focusVisible,
          });
        }
        await page.reload();
        await scrollProof(page);
      }
      proof.matrix.push(record);
    }
    if (count === 4) {
      const panel = page.locator(".dashboard-portfolio");
      for (const p of projects) {
        const link = panel.locator(`a[href="/projects/${p.id}"]`);
        diagnostics.begin(`/projects/${p.id}`, "click");
        await link.click();
        await page.waitForURL(`**/projects/${p.id}`);
        diagnostics.matched();
        diagnostics.assertionStart("toContainText", 5000);
        await expect(page.locator("h1")).toContainText(p.title);
        diagnostics.assertionPassed();
        diagnostics.visible();
        proof.controls.push({ href: `/projects/${p.id}`, click: "PASS" });
        await page.goto(`${app.origin}/dashboard`);
      }
      const allDone = panel.locator(`a[href="/projects/${projects[2].id}"]`);
      await expect(allDone).toContainText("Alle erfassten Tasks erledigt");
      await expect(allDone).not.toContainText("Project completed");
      const onlyStages = panel.locator(`a[href="/projects/${projects[1].id}"]`);
      await expect(onlyStages).toContainText("Noch keine Tasks");
      await expect(onlyStages.locator(".portfolio-work-bar")).toHaveCount(0);
      await expect(
        onlyStages.locator(".portfolio-project-milestones"),
      ).toHaveText("1/3 Meilensteine erledigt");
      await expect(
        panel.locator(
          `a[href="/projects/${projects[3].id}"] .portfolio-project-milestones`,
        ),
      ).toHaveCount(0);
    }
    if (count === 5) {
      const panel = page.locator(".dashboard-portfolio");
      const links = await panel.locator("a").evaluateAll((nodes) =>
        nodes.map((n) => ({
          href: n.getAttribute("href"),
          label: n.getAttribute("aria-label") ?? n.textContent.trim(),
        })),
      );
      for (const link of links) {
        await panel.locator(`a[href="${link.href}"]`).first().click();
        await page.waitForURL((u) => u.pathname + u.search === link.href);
        proof.controls.push({ ...link, click: "PASS" });
        await page.goto(`${app.origin}/dashboard`);
      }
      for (const profile of ["demo", "empty"]) {
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
          await page.goto(`${app.origin}/dashboard`);
          await assertCockpit(page);
          if (profile === "empty") {
            await expect(panel.locator(".portfolio-project-card")).toHaveCount(
              0,
            );
            await expect(
              panel.locator("[data-portfolio-placeholder]"),
            ).toHaveCount(4);
          } else {
            await expect(
              panel
                .locator(".portfolio-project-card")
                .first()
                .locator("[data-work-state]"),
            ).toHaveAttribute("data-work-state", "available");
            await expect(panel).not.toContainText(projects[0].title);
          }
          await page.screenshot({
            path: join(output, `${profile}-${viewport.name}.png`),
            scale: "css",
            fullPage: true,
          });
          await page.reload();
          await assertCockpit(page);
        }
      }
    }
    await stop(errors);
  }
  for (const table of [
    "tasks",
    "task_dependencies",
    "schedule_source_links",
    "project_milestones",
  ]) {
    const errors = await start({
      imports: [
        new URL(`./issue-170-read-fault.mjs?table=${table}`, import.meta.url)
          .href,
      ],
    });
    await page.goto(`${app.origin}/dashboard`);
    await expect(card().locator("[data-work-state]")).toHaveAttribute(
      "data-work-state",
      table === "tasks"
        ? "unavailable"
        : ["task_dependencies", "schedule_source_links"].includes(table)
          ? "reduced"
          : "available",
    );
    if (table === "tasks")
      await expect(card()).toContainText("Arbeitsstand nicht verfügbar");
    else if (table !== "project_milestones") {
      await expect(card()).toContainText("4/9 Tasks erledigt");
      await expect(card()).toContainText("Ausführbarkeit unbekannt");
      await expect(card().locator(".portfolio-work-bar")).toHaveCount(0);
    } else
      await expect(card().locator(".portfolio-project-milestones")).toHaveText(
        "Meilensteine nicht verfügbar",
      );
    await page.screenshot({
      path: join(output, `failure-${table}.png`),
      fullPage: true,
    });
    await page.reload();
    proof.failures.push({
      table,
      state: await card()
        .locator("[data-work-state]")
        .getAttribute("data-work-state"),
      reload: "PASS",
    });
    await stop(errors);
  }
  const errors = await start({ authentication: "blocked" });
  await page.goto(`${app.origin}/dashboard`);
  await expect(page.locator(".dashboard-portfolio")).toContainText(
    "Manual benötigt eine bestätigte Anmeldung.",
  );
  await expect(
    page.locator(".portfolio-project-card,[data-portfolio-placeholder]"),
  ).toHaveCount(0);
  await page.screenshot({
    path: join(output, "auth-blocked.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".dashboard-portfolio")).toContainText(
    "Manual benötigt eine bestätigte Anmeldung.",
  );
  await stop(errors);
  proof.result = "PASS";
  success = true;
  console.log(
    "PASS #170",
    proof.matrix.length,
    "populated viewport cases; Demo/Empty, keyboard/reload, four read faults and Auth-blocked",
  );
} catch (error) {
  diagnostics.failure(error);
  proof.result = "FAIL";
  proof.error = "ASSERTION_OR_HARNESS_FAILURE";
  console.error("ISSUE_170_ASSERTION_OR_HARNESS_FAILURE");
  process.exitCode = 1;
} finally {
  try {
    await diagnostics.finish({ failed: !success, app });
  } catch {
    console.error("ISSUE_170_DIAGNOSTIC_FAILED");
    success = false;
    process.exitCode = 1;
  }
  try {
    writeFileSync(join(output, "proof.json"), JSON.stringify(proof, null, 2));
  } catch {
    console.error("ISSUE_170_EVIDENCE_FAILED");
    success = false;
    process.exitCode = 1;
  }
  try {
    if (browser) await browser.close();
  } catch {
    console.error("ISSUE_170_BROWSER_CLEANUP_FAILED");
    success = false;
    process.exitCode = 1;
  }
  try {
    if (app) await app.stop("SIGKILL");
  } catch {
    console.error("ISSUE_170_APPLICATION_CLEANUP_FAILED");
    success = false;
    process.exitCode = 1;
  }
  try {
    if (success) releaseApplicationFixture(fixture);
  } catch {
    console.error("ISSUE_170_FIXTURE_CLEANUP_FAILED");
    process.exitCode = 1;
  }
}
