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
import { compileRuntime } from "./compile-runtime.mjs";
import { startApplication } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");

const output = resolve("test-results/issue-160");
mkdirSync(output, { recursive: true });
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { SqliteRuntime } = require(join(fixture.compiled, "runtime.js"));
const { issueOwnerContext } = require(
  join(fixture.compiled, "owner-context.js"),
);
const projectDepthCompiled = compileRuntime([
  "src/features/real-data/sqlite/repositories/project-depth-repository.ts",
]);
fixture.disposableDirectories.push(projectDepthCompiled);
const { projectDepthCommand, readSqliteProjectDepth } = require(
  join(projectDepthCompiled, "repositories/project-depth-repository.js"),
);
const fixtureStore = new SqliteRuntime(fixture.path, { syntheticProof: true });
try {
  const context = issueOwnerContext(fixture.ownerId);
  const project = readSqliteProjectDepth(
    fixtureStore,
    context,
    fixture.ids.work,
  ).context;
  projectDepthCommand(fixtureStore, context, {
    projectId: fixture.ids.work,
    commandId: randomUUID(),
    expectedRevision: project.completion_revision,
    expectedCycle: project.completion_cycle,
    operation: "project.archive",
    payload: { reason: "Synthetic proof leaves one Project placeholder available" },
  });
} finally {
  fixtureStore.close();
}
const evidence = {
  revision: "unknown",
  runtime: "sqlite-synthetic",
  presentation: "manual",
  sealedDisposable: true,
  fixturePreparation: "archived one synthetic project to expose an available create placeholder",
  portIs3000: false,
  viewChecks: [],
  errors: [],
};
let app;
let browser;
let exitCode = 0;

function readEntities() {
  const db = new Database(fixture.path, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return {
      projects: db
        .prepare(
          "SELECT id,title,status FROM projects WHERE user_id=? ORDER BY id",
        )
        .all(fixture.ownerId),
      goals: db
        .prepare("SELECT id,title,status FROM goals WHERE user_id=? ORDER BY id")
        .all(fixture.ownerId),
      skills: db
        .prepare("SELECT id,name,status FROM skills WHERE user_id=? ORDER BY id")
        .all(fixture.ownerId),
    };
  } finally {
    db.close();
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(
    Math.max(dimensions.documentWidth, dimensions.bodyWidth) <=
      dimensions.viewportWidth + 1,
    `${label}: horizontal overflow ${JSON.stringify(dimensions)}`,
  );
}

try {
  const { execFileSync } = await import("node:child_process");
  evidence.revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  app = await startApplication(fixture);
  const port = new URL(app.origin).port;
  assert.notEqual(port, "3000");
  evidence.port = Number(port);
  evidence.portIs3000 = port === "3000";
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => evidence.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      evidence.errors.push(message.text());
  });
  context.on("request", (request) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\//i.test(request.url()))
      evidence.errors.push("UNEXPECTED_SUPABASE_BROWSER_REQUEST");
  });

  const entityBaseline = readEntities();
  const portfolio = page.locator(".dashboard-portfolio");
  const createRoutes = [
    {
      view: "Project View",
      linkName: "project erstellen",
      path: "/projects/new",
      formName: "Project erstellen",
    },
    {
      view: "Goal View",
      linkName: "goal erstellen",
      path: "/goals/new",
      formName: "Ziel erstellen",
    },
    {
      view: "Skill View",
      linkName: "skill erstellen",
      path: "/skills/new",
      formName: "Skill erstellen",
    },
  ];

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${app.origin}/dashboard`);
    await expect(portfolio).toBeVisible();
    await assertNoHorizontalOverflow(page, `dashboard-${viewport.width}`);

    for (const route of createRoutes) {
      await portfolio
        .getByRole("button", { name: route.view, exact: true })
        .click();

      const placeholders = portfolio.locator("[data-portfolio-placeholder]");
      const availablePlaceholders = await placeholders.count();
      assert.ok(
        availablePlaceholders > 0,
        `${route.view} has no available create placeholder in the SQLite fixture`,
      );
      const link = portfolio
        .getByRole("link", { name: route.linkName, exact: true })
        .first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", route.path);
      await assertNoHorizontalOverflow(
        page,
        `dashboard-${route.view}-${viewport.width}`,
      );

      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await page.waitForURL(
        (url) => `${url.pathname}${url.search}${url.hash}` === route.path,
      );
      assert.equal(new URL(page.url()).pathname, route.path);
      const form = page.getByRole("form", {
        name: route.formName,
        exact: true,
      });
      await expect(form).toBeVisible();
      await expect(
        page.getByRole("heading", { name: route.formName, exact: true }),
      ).toBeVisible();
      await assertNoHorizontalOverflow(
        page,
        `${route.path}-${viewport.width}`,
      );
      assert.deepEqual(
        readEntities(),
        entityBaseline,
        `${route.path} navigation must not create or change an entity`,
      );

      evidence.viewChecks.push({
        viewport,
        view: route.view,
        route: route.path,
        form: route.formName,
        availablePlaceholders,
        keyboard: "focus+Enter",
        entitySnapshotUnchanged: true,
        horizontalOverflow: false,
      });

      await page.goto(`${app.origin}/dashboard`);
      await expect(portfolio).toBeVisible();
      await assertNoHorizontalOverflow(
        page,
        `dashboard-return-${route.view}-${viewport.width}`,
      );
    }
  }

  assert.ok(
    !app.output().includes("SQLITE_PROOF_SUPABASE_NETWORK_DENIED"),
    "application attempted a Supabase network request",
  );
  assert.deepEqual(evidence.errors, []);
  evidence.supabaseNetworkGuard = "PASS";
  evidence.result = "PASS";
  console.log(
    "PASS #160 native SQLite browser proof",
    evidence.viewChecks.length,
    "view checks",
  );
} catch (error) {
  evidence.result = "HARNESS_OR_ASSERTION_FAILURE";
  evidence.failure = String(error.stack || error);
  console.error(error);
  exitCode = 1;
} finally {
  writeFileSync(join(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  if (browser) await browser.close();
  if (app) await app.stop("SIGKILL");
  if (!exitCode) releaseApplicationFixture(fixture);
}

if (exitCode) process.exitCode = exitCode;
