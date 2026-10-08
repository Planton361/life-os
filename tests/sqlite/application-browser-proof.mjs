import { surfaceProof } from "./application-surface-proof.mjs";
import { boundaryAndRecoveryProof } from "./application-browser-boundaries.mjs";
import { additionalWriteFlows } from "./application-browser-flows.mjs";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

let passed = false;
const fixture = await createApplicationFixture();
let app = await startApplication(fixture);
const browser = await chromium.launch({ headless: true });
let context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
});
await context.addCookies([
  { name: "life_os_profile", value: "manual", url: app.origin },
]);
let page = await context.newPage();
page.setDefaultTimeout(10000);
let browserTask;
const errors = [];
const network = [];
const evidence = [];
const payloadChecks = new Set();
function observeBrowser() {
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  context.on("request", (r) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\//i.test(r.url()))
      network.push(r.url());
  });
  context.on("response", (response) => {
    if (new URL(response.url()).origin !== app.origin ||
        !/text\/(?:html|x-component)/.test(response.headers()["content-type"] ?? "")) return;
    const check = response.text().then((body) => {
      if (body.includes(fixture.ownerId) || body.includes(fixture.path) || body.includes("OwnerContext"))
        errors.push(`Private runtime material in HTML/RSC: ${new URL(response.url()).pathname}`);
    }).catch(() => { /* Aborted navigation/prefetch has no consumed client payload. */ });
    payloadChecks.add(check);
    void check.finally(() => payloadChecks.delete(check));
  });
}
observeBrowser();
async function resetBrowserContext() {
  await context.close();
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: app.origin },
  ]);
  page = await context.newPage();
  observeBrowser();
  return { page, context };
}
const status = (text) =>
  page.getByRole("status").filter({ hasText: text }).last();
const formWithButton = (name) =>
  page
    .locator("form")
    .filter({ has: page.getByRole("button", { name, exact: true }) });
async function fields(form, values) {
  for (const [name, value] of Object.entries(values))
    await form.locator(`[name="${name}"]`).fill(String(value));
}
async function step(name, body) {
  try {
    await body();
    await Promise.all([...payloadChecks]);
    const html = await page.content();
    assert.equal(html.includes(fixture.path), false, `${name}: DB path exposed`);
    assert.equal(html.includes(fixture.ownerId), false, `${name}: owner authentication identity exposed`);
    assert.equal(html.includes("OwnerContext"), false, `${name}: owner context exposed`);
    assert.equal(/SQLITE_PROOF_.*_DENIED/.test(app.output()), false);
    assert.deepEqual(errors, [], `${name} console/page errors`);
    assert.deepEqual(network, [], `${name} Supabase network`);
    evidence.push({ name, status: "PASS" });
    process.stdout.write(`${name}: PASS\n`);
  } catch (error) {
    evidence.push({ name, status: "FAIL", error: String(error) });
    const slug = name.replaceAll(/[^a-z0-9]+/gi, "-");
    await page.screenshot({
      path: join(fixture.directory, slug + ".png"),
      fullPage: true,
    });
    writeFileSync(
      join(fixture.directory, slug + ".txt"),
      String(error) + "\n" + (await page.locator("body").ariaSnapshot()),
      { mode: 0o600 },
    );
    process.stderr.write(`${name}: FAIL ${String(error).split("\n")[0]}\n`);
  }
}
try {
  await step("Server Component surface reads", async () => {
    const routes = [
      "/dashboard",
      "/today",
      "/calendar",
      "/portfolio",
      "/inbox",
      `/tasks/${fixture.ids.task}`,
      `/projects/${fixture.ids.project}`,
      `/goals/${fixture.ids.goal}`,
      `/skills/${fixture.ids.skill}`,
      "/resources",
      `/resources/${fixture.ids.resource}`,
      "/review/daily",
      "/health/habits",
      "/health/mental",
      "/nutrition",
      "/nutrition/meal-planner",
      "/nutrition/recipes",
      `/nutrition/recipes/${fixture.ids.recipe}`,
      "/health/running",
      "/health/strength",
      "/life/journal",
      "/coding",
      "/education",
      "/work",
      "/life/inventory",
      "/life",
      "/life/notes",
      "/life/entertainment",
      "/life/entertainment/books",
      "/life/entertainment/games",
      "/life/entertainment/movies",
      "/life/entertainment/series",
      "/coding/repositories",
      "/coding/agents",
      "/coding/skill-map",
      "/education/learning-log",
      "/education/scientific-work",
      "/education/literature",
      "/work/log",
      "/work/wiki",
      "/work/meetings",
      "/review/weekly",
      "/nutrition/grocery",
      "/challenges",
      "/shop",
      "/settings",
    ];
    const expectedCanonical = {
      "/dashboard": "SQLite synthetic Task",
      "/today": "SQLite synthetic Task",
      "/calendar": "SQLite synthetic Task",
      "/portfolio": "SQLite synthetic Project",
      "/inbox": "SQLite synthetic Inbox",
      [`/tasks/${fixture.ids.task}`]: "SQLite synthetic Task",
      [`/projects/${fixture.ids.project}`]: "SQLite synthetic Project",
      [`/goals/${fixture.ids.goal}`]: "SQLite synthetic Goal",
      [`/skills/${fixture.ids.skill}`]: "SQLite synthetic Skill",
      "/resources": "SQLite synthetic Resource",
      [`/resources/${fixture.ids.resource}`]: "SQLite synthetic Resource",
      "/health/habits": "SQLite synthetic Habit",
      "/nutrition": "SQLite synthetic Meal",
      "/health/running": "SQLite synthetic Run",
      "/health/strength": "SQLite synthetic Strength",
      "/life/journal": "SQLite synthetic Journal",
      "/coding": "SQLite synthetic coding Project",
      "/education": "SQLite synthetic education Project",
      "/work": "SQLite synthetic work Project",
      "/life/inventory": "SQLite synthetic Inventory",
      "/life": "1owned · 0 wishlist",
      "/life/entertainment": "SQLite synthetic Book",
      "/life/entertainment/books": "SQLite synthetic Book",
      "/challenges": "SQLite synthetic Challenge",
      "/shop": "SQLite synthetic Reward",
    };
    const inventories = [];
    for (const route of routes) {
      const response = await page.goto(app.origin + route);
      assert.equal(response.status(), 200, route);
      await expect(page.locator(".life-os-canvas")).toBeVisible();
      if (expectedCanonical[route])
        await expect(page.locator("#main-content")).toContainText(
          expectedCanonical[route],
        );
      const html = await page.content();
      assert.equal(html.includes(fixture.path), false);
      assert.equal(html.includes("OwnerContext"), false);
      assert.equal(
        html.includes(fixture.ownerId),
        false,
        "owner authentication identity exposed",
      );
      assert.deepEqual(errors, [], route + " console/page errors");
      process.stdout.write(`Read ${route}: PASS\n`);
      inventories.push({
        route,
        controls: await page
          .locator("button,a,input,select,textarea")
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              tag: n.tagName,
              text: n.textContent?.trim().slice(0, 100),
              label: n.getAttribute("aria-label"),
              name: n.getAttribute("name"),
              href: n.getAttribute("href"),
            })),
          ),
      });
    }
    writeFileSync(
      join(fixture.directory, "controls.json"),
      JSON.stringify(inventories, null, 2),
      { mode: 0o600 },
    );
  });
  await step("Dashboard Quick Thought + Inbox reload", async () => {
    await page.goto(app.origin + "/dashboard");
    const capture = page.locator('[aria-labelledby="quick-thought-title"]');
    await capture.getByLabel("Quick Thought").fill("SQLite browser capture");
    await capture.getByRole("button", { name: "In Inbox speichern" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "In der Inbox gespeichert." }),
    ).toContainText("In der Inbox gespeichert.");
    await page.goto(app.origin + "/inbox");
    const queue = page.locator('[data-inbox-section="queue"]');
    await expect(
      queue.getByRole("button", { name: /^SQLite browser capture/ }),
    ).toBeVisible();
    await page.reload();
    await expect(
      queue.getByRole("button", { name: /^SQLite browser capture/ }),
    ).toBeVisible();
  });
  await step("Task create, Today projection and reload", async () => {
    await page.goto(app.origin + "/tasks/new");
    const form = page.locator('form[data-task-capture-title-first="true"]');
    await form.getByLabel("Titel", { exact: true }).fill("SQLite browser Task");
    await form
      .getByRole("button", { name: "Weitere Angaben (optional)", exact: true })
      .click();
    await form
      .getByLabel("Project", { exact: true })
      .selectOption(fixture.ids.project);
    await form.getByLabel("Geplantes Datum", { exact: true }).fill(fixture.day);
    await form.getByRole("button", { name: "Task erstellen" }).click();
    await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]{36}$/);
    browserTask = new URL(page.url()).pathname.split("/").at(-1);
    await page.goto(app.origin + "/today");
    const activity = page.locator('[data-today-section="activity-stream"]');
    await expect(
      activity.getByText("SQLite browser Task", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      activity.getByText("SQLite browser Task", { exact: true }),
    ).toBeVisible();
  });
  await step("Task edit, complete/reopen, projection and reload", async () => {
    await page.goto(`${app.origin}/tasks/${browserTask}`);
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    const edit = page.getByRole("form", {
      name: "Task bearbeiten",
      exact: true,
    });
    await edit
      .getByLabel("Titel", { exact: true })
      .fill("SQLite browser Task edited");
    await edit
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await expect(status("Task gespeichert.")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "SQLite browser Task edited",
        exact: true,
      }),
    ).toHaveText("SQLite browser Task edited");
    await page.getByRole("button", { name: "Erledigt", exact: true }).click();
    await expect(page.locator('[data-task-lifecycle="done"]')).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Task-Verwaltung", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Status verwalten", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Task wieder öffnen", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Erledigt", exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.goto(app.origin + "/today");
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toContainText("SQLite browser Task edited");
  });
  await step("Dashboard Habit/Mood writes and Today reload", async () => {
    await page.goto(app.origin + "/dashboard");
    const tracker = page.getByRole("region", {
      name: "Habit Trackers",
      exact: true,
    });
    await tracker.getByRole("button", { name: "Morning", exact: true }).click();
    const habit = tracker.getByRole("button", {
      name: "SQLite synthetic Habit erhöhen",
      exact: true,
    });
    await habit.click();
    await expect(habit).toContainText("1 / 2");
    await page.reload();
    await tracker.getByRole("button", { name: "Morning", exact: true }).click();
    await expect(habit).toContainText("1 / 2");
    await formWithButton("Calm")
      .getByRole("button", { name: "Calm", exact: true })
      .click();
    await expect(status(/Mood|Stimmung/)).toBeVisible();
    await page.goto(app.origin + "/today");
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toContainText("SQLite synthetic Habit");
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toContainText("calm");
    await page.reload();
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toContainText("calm");
  });
  await step("Inbox canonical atomic final route", async () => {
    await page.goto(app.origin + "/inbox");
    await page
      .locator('[data-inbox-section="queue"]')
      .getByRole("button", { name: /^SQLite browser capture/ })
      .click();
    await page
      .getByLabel("Clean Title", { exact: true })
      .fill("SQLite browser Resource from Inbox");
    await page
      .getByRole("region", { name: "Outcome Route", exact: true })
      .getByRole("button", { name: "Resource", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Einordnen & abschließen", exact: true })
      .click();
    await expect(page.getByLabel("Letztes Routing")).toBeVisible();
    await page.reload();
    await expect(
      page
        .locator('[data-inbox-section="queue"]')
        .getByRole("button", { name: /^SQLite browser capture/ }),
    ).toHaveCount(0);
    await page.goto(app.origin + "/resources");
    await expect(
      page
        .locator("#main-content")
        .getByText("SQLite browser Resource from Inbox", { exact: true })
        .first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page
        .locator("#main-content")
        .getByText("SQLite browser Resource from Inbox", { exact: true })
        .first(),
    ).toBeVisible();
  });
  await step(
    "Daily Review carry-forward and planning snapshot reload",
    async () => {
      await page.goto(app.origin + "/review/daily");
      const carry = page.locator('[data-review-section="carry-over"]');
      await carry
        .getByRole("checkbox", { name: /SQLite browser Task edited/ })
        .check();
      await page
        .getByRole("textbox", { name: "Outcome", exact: true })
        .fill("SQLite browser daily outcome");
      await page
        .getByRole("button", { name: "Complete Daily Review", exact: true })
        .click();
      await expect(status("Daily Review gespeichert.")).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("textbox", { name: "Outcome", exact: true }),
      ).toHaveValue("SQLite browser daily outcome");
      await expect(
        carry.getByRole("checkbox", { name: /SQLite browser Task edited/ }),
      ).toBeChecked();
      await page.goto(app.origin + "/today");
      await expect(
        page.locator('[data-today-section="closing-review"]'),
      ).toContainText("1 Carry Forward");
      await page.reload();
      await expect(
        page.locator('[data-today-section="closing-review"]'),
      ).toContainText("1 Carry Forward");
    },
  );
  await step("Journal create/edit and reload", async () => {
    await page.goto(app.origin + "/life/journal");
    await page
      .getByRole("link", { name: "Neuer Eintrag", exact: true })
      .first()
      .click();
    const create = page.getByRole("dialog", {
      name: "Neuer Eintrag",
      exact: true,
    });
    await create.getByLabel("Titel (optional)").fill("SQLite browser Journal");
    await create
      .getByLabel("Inhalt", { exact: true })
      .fill("SQLite browser journal body");
    await create
      .getByRole("button", { name: "Speichern", exact: true })
      .click();
    await expect(status("Journal-Eintrag erstellt.")).toBeVisible();
    const selected = page.getByRole("region", {
      name: "Ausgewählter Eintrag",
      exact: true,
    });
    await expect(selected).toContainText("SQLite browser journal body");
    await page.reload();
    await selected
      .getByRole("link", { name: "Bearbeiten", exact: true })
      .click();
    const edit = page.getByRole("dialog", {
      name: "Eintrag bearbeiten",
      exact: true,
    });
    await edit
      .getByLabel("Inhalt", { exact: true })
      .fill("SQLite browser journal corrected");
    await edit.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(status("Journal-Eintrag gespeichert.")).toBeVisible();
    await page.reload();
    await expect(selected).toContainText("SQLite browser journal corrected");
  });
  await step("Education canonical Resource relation and reload", async () => {
    await page.goto(app.origin + "/education");
    const form = formWithButton("Literatur speichern und verknüpfen");
    await fields(form, {
      title: "SQLite browser Education Resource",
      body: "Canonical evidence",
    });
    await form
      .getByRole("button", {
        name: "Literatur speichern und verknüpfen",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/literature_created/);
    await page.reload();
    await expect(
      page
        .locator("#main-content")
        .getByText("SQLite browser Education Resource", { exact: true })
        .first(),
    ).toBeVisible();
    await page.goto(app.origin + "/resources");
    await expect(
      page
        .locator("#main-content")
        .getByText("SQLite browser Education Resource", { exact: true })
        .first(),
    ).toBeVisible();
  });
  await step("Work canonical knowledge operation and reload", async () => {
    await page.goto(app.origin + "/work");
    const form = formWithButton("Wiki-Eintrag erstellen");
    await fields(form, {
      title: "SQLite browser Work Wiki",
      body: "Work canonical evidence",
    });
    await form.locator('[name="projectId"]').selectOption(fixture.ids.work);
    await form
      .getByRole("button", { name: "Wiki-Eintrag erstellen", exact: true })
      .click();
    await expect(page).toHaveURL(/wiki_created/);
    await page.reload();
    await expect(
      page
        .locator("#main-content")
        .getByText("SQLite browser Work Wiki", { exact: true })
        .first(),
    ).toBeVisible();
  });
  await step("Running genuine session write and reload", async () => {
    await page.goto(app.origin + "/health/running");
    const form = formWithButton("Lauf speichern");
    await fields(form, {
      sessionDate: fixture.day,
      startTime: "10:00",
      distanceKm: "5",
      durationMinutes: "30",
      notes: "SQLite browser genuine Run",
    });
    await form
      .getByRole("button", { name: "Lauf speichern", exact: true })
      .click();
    await expect(page).toHaveURL(/saved|session/);
    await page.reload();
    await expect(page.locator("#main-content")).toContainText(
      "SQLite browser genuine Run",
    );
  });
  await step("Challenge credit and Shop redemption reload", async () => {
    await page.goto(app.origin + "/challenges");
    const progress = formWithButton("Log progress");
    await fields(progress, { increment: "1", note: "SQLite browser progress" });
    await progress
      .getByRole("button", { name: "Log progress", exact: true })
      .click();
    await expect(page).toHaveURL(/progress/);
    await page
      .getByRole("button", {
        name: /Complete.*reward|Complete challenge|Abschließen/i,
      })
      .click();
    await page.reload();
    await page.goto(app.origin + "/shop");
    await page.getByRole("button", { name: "Einlösen", exact: true }).click();
    await expect(page).toHaveURL(/redeemed/);
    await page.reload();
    await expect(page.locator("#main-content")).toContainText(
      "SQLite synthetic Reward",
    );
  });
  await step(
    "Anti-Rot explicit rotation/completion and immutable reload",
    async () => {
      await page.goto(app.origin + "/challenges");
      const current = page.getByRole("region", {
        name: "Current Anti-Rot recommendation",
        exact: true,
      });
      await current
        .getByRole("button", { name: "Aktion auswählen", exact: true })
        .click();
      await expect(current).toContainText("SQLite synthetic Anti-Rot");
      await page.reload();
      await current
        .getByRole("button", { name: "Erledigt", exact: true })
        .click();
      await page.reload();
      await expect(
        page.getByRole("region", {
          name: "Anti-Rot event history",
          exact: true,
        }),
      ).toContainText("SQLite synthetic Anti-Rot");
      await page.goto(app.origin + "/shop");
      await expect(page.locator("#main-content header")).toContainText(
        "7 coins",
      );
    },
  );
  await additionalWriteFlows({
    page,
    app,
    fixture,
    step,
    fields,
    formWithButton,
    browserTask,
  });
  await surfaceProof({ page, app, fixture, step });
  await boundaryAndRecoveryProof({
    page,
    context,
    fixture,
    step,
    getApp: () => app,
    resetBrowserContext,
    setApp: (next) => {
      app = next;
    },
  });
  await page.goto(app.origin + "/dashboard");
  await page.screenshot({
    path: join(fixture.directory, "dashboard.png"),
    fullPage: true,
  });
  writeFileSync(
    join(fixture.directory, "browser-evidence.json"),
    JSON.stringify(
      { evidence, errors, network, startupMs: app.startupMs },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  process.stdout.write(`Evidence: ${fixture.directory}\n`);
  assert.equal(
    evidence.filter((e) => e.status === "FAIL").length,
    0,
    JSON.stringify(evidence.filter((e) => e.status === "FAIL")),
  );
  passed = true;
} catch (error) {
  await page
    .screenshot({
      path: join(fixture.directory, "failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  writeFileSync(
    join(fixture.directory, "failure.txt"),
    String(error) +
      "\n" +
      JSON.stringify({ errors, network, evidence }) +
      "\n" +
      app.output(),
    { mode: 0o600 },
  );
  process.stderr.write(`Failure evidence: ${fixture.directory}\n`);
  throw error;
} finally {
  await browser.close();
  if (app.child.exitCode === null && app.child.signalCode === null)
    await app.stop();
  if (passed) releaseApplicationFixture(fixture);
}
