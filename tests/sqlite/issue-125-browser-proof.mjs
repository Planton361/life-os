import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

// Reuse the native application harness; never connect to the personal server/DB.
assert.equal(process.versions.node, "24.21.0");
const arg = (name) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const stage = arg("stage") ?? "after";
const reference = arg("reference");
const output = resolve(arg("output") ?? "/tmp/life-os-125-evidence");
mkdirSync(output, { recursive: true });
if (reference)
  assert.equal(
    createHash("sha256").update(readFileSync(reference)).digest("hex"),
    "6aacbf7f4ce6dcd23c884a2d046a5f9496b156ee6a61f0551b12205dd4993ae6",
  );
const fixture = await createApplicationFixture();
const require = createRequire(import.meta.url);
const { SqliteRuntime } = require(join(fixture.compiled, "runtime.js"));
const { timestamp } = require(join(fixture.compiled, "codecs.js"));
const { issueOwnerContext } = require(
  join(fixture.compiled, "owner-context.js"),
);
const store = new SqliteRuntime(fixture.path, { syntheticProof: true });
const emptyId = randomUUID();
const stateIds = {};
let sourceOwnedId;
const title = "Forschungsmethoden vergleichen";
const description =
  "Qualitative und quantitative Ansätze für die Forschungsfrage gegenüberstellen.";
const note =
  "Zuerst drei Methodenquellen nach den gleichen Kriterien vergleichen.";
const stepTitles = [
  "Drei relevante Methodenquellen auswählen",
  "Ansätze anhand gleicher Kriterien vergleichen",
  "Entscheidungsnotiz vorbereiten",
];
try {
  store.command(issueOwnerContext(fixture.ownerId), "task.update", (db) => {
    const now = timestamp(new Date().toISOString()),
      milestone = randomUUID();
    db.prepare("UPDATE goals SET title=? WHERE id=?").run(
      "Masterabschluss",
      fixture.ids.goal,
    );
    db.prepare("UPDATE projects SET title=? WHERE id=?").run(
      "Masterarbeit · Forschungsdesign",
      fixture.ids.project,
    );
    db.prepare(
      "INSERT INTO project_milestones(id,user_id,project_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,'open',99,?,?)",
    ).run(
      milestone,
      fixture.ownerId,
      fixture.ids.project,
      "Methodik",
      now,
      now,
    );
    db.prepare(
      "UPDATE tasks SET title=?,description=?,priority='P1',planned_date='2026-10-09',due_at='2026-10-15T12:00:00.000000Z',milestone_id=? WHERE id=?",
    ).run(
      title,
      `${description}\n\nNächste Aktion: ${note}`,
      milestone,
      fixture.ids.task,
    );
    db.prepare(
      "INSERT INTO tasks(id,user_id,title,priority,planned_date,created_at,updated_at) VALUES(?,?,?,'P1','2026-10-09',?,?)",
    ).run(emptyId, fixture.ownerId, title, now, now);
    for (const status of [
      "planned",
      "active",
      "inbox",
      "waiting",
      "someday",
      "done",
      "canceled",
      "archived",
    ]) {
      stateIds[status] = randomUUID();
      db.prepare(
        "INSERT INTO tasks(id,user_id,title,status,project_id,completed_at,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
      ).run(
        stateIds[status],
        fixture.ownerId,
        `B8 #125 ${status}`,
        status,
        status === "planned" ? fixture.ids.project : null,
        status === "done" ? now : null,
        status === "archived" ? now : null,
        now,
        now,
      );
    }
    stepTitles.forEach((name, position) =>
      db
        .prepare(
          "INSERT INTO task_steps(id,user_id,task_id,title,position,completed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          randomUUID(),
          fixture.ownerId,
          fixture.ids.task,
          name,
          position,
          position === 0 ? now : null,
          now,
          now,
        ),
    );
  });
  const { scheduleLinkedSource } = require(
    join(fixture.compiled, "commands/source-commands.js"),
  );
  sourceOwnedId = store.command(
    issueOwnerContext(fixture.ownerId),
    "source.schedule",
    (db, owner) =>
      scheduleLinkedSource(
        db,
        owner,
        "running_plan_item",
        fixture.ids.runItem,
        "2026-10-09",
        "2026-10-09T12:00:00.000000Z",
        30,
      ).id,
  );
} finally {
  store.close();
}
const app = await startApplication(fixture);
assert.notEqual(new URL(app.origin).port, "3000");
const browser = await chromium.launch({ headless: true });
const errors = [],
  measurements = [],
  checks = [];
const sizes = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
  { width: 769, height: 413 },
  { width: 390, height: 844 },
];
async function capture(page, name, selector) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: join(output, `${name}-viewport.png`),
    fullPage: true,
  });
  await page
    .locator(selector)
    .screenshot({ path: join(output, `${name}-surface.png`) });
  const actual = selector.includes("data-task");
  const values = await page.evaluate(
    ({ actual }) => {
      const selectors = actual
        ? {
            canvas: '[data-task-detail-variant="B8"]',
            header: '[aria-label="Aufgabenidentität"]',
            title: '[aria-label="Aufgabenidentität"] h1',
            work: "#task-work-content",
            context: "[data-task-context]",
          }
        : {
            canvas: ".frame",
            header: ".task-header",
            title: ".task-header h1",
            work: '[aria-label="Arbeitsinhalt"]',
            context: '[aria-label="Task-Kontext"]',
          };
      return Object.fromEntries(
        Object.entries(selectors).map(([key, query]) => {
          const element = document.querySelector(query);
          if (!element) return [key, null];
          const rect = element.getBoundingClientRect(),
            style = getComputedStyle(element);
          return [
            key,
            {
              width: rect.width,
              height: rect.height,
              fontSize: style.fontSize,
              lineHeight: style.lineHeight,
              letterSpacing: style.letterSpacing,
              padding: style.padding,
            },
          ];
        }),
      );
    },
    { actual },
  );
  measurements.push({ name, ...values });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    `${name}: horizontal overflow`,
  );
}
async function referencePage(page, state) {
  await page.goto(`file://${reference}`);
  if (state === "populated") {
    await page.locator('.navtabs [data-view="task"]').click();
  } else {
    await page.locator('.navtabs [data-view="create"]').click();
    await page.locator("#newTitle").fill(title);
    await page.locator("#detailsPlanning summary").click();
    await page.locator("#newPlanned").fill("2026-10-09");
    await page.locator("#newPriority").selectOption("P1");
    await page.locator('#createForm button[type="submit"]').click();
    // Derived Empty counterpart: remove only fictitious prototype relationships.
    // The original file and all reference styles are left unchanged.
    await page.evaluate(() => {
      document
        .querySelector('[aria-label="Task-Kontext"] .rail-group:first-child')
        ?.remove();
      document.querySelector("#dependenciesRegion")?.remove();
      document.querySelector(".b5-handoffs")?.remove();
      document.querySelector("#toast").hidden = true;
    });
  }
}
try {
  for (const viewport of sizes) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([
      { name: "life_os_profile", value: "manual", url: app.origin },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydration/i.test(message.text()))
        errors.push(message.text());
    });
    for (const [state, id] of [
      ["empty", emptyId],
      ["populated", fixture.ids.task],
    ]) {
      await page.goto(`${app.origin}/tasks/${id}`);
      await expect(
        page.locator('[data-task-detail-variant="B8"]'),
      ).toBeVisible();
      await capture(
        page,
        `${stage}-${state}-${viewport.width}x${viewport.height}`,
        '[data-task-detail-variant="B8"]',
      );
      if (stage === "after") {
        const header = page.locator('[aria-label="Aufgabenidentität"]');
        await expect(page.locator("#task-work-heading")).toHaveText(
          "Was ist zu tun?",
        );
        await expect(
          page.getByRole("button", { name: "Notiz bearbeiten", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "+ Schritt", exact: true }),
        ).toBeVisible();
        assert.equal(
          await header
            .getByRole("button", { name: "Erledigt", exact: true })
            .evaluate((element) => getComputedStyle(element).backgroundColor),
          "rgb(91, 124, 250)",
        );
        assert.equal(
          await header
            .locator("h1")
            .evaluate((element) => getComputedStyle(element).fontSize),
          viewport.width >= 1920 ? "36px" : "26px",
        );
        await expect(page.locator("#task-work-content")).toContainText(
          state === "empty"
            ? "0 von 0 Schritten erledigt"
            : "1 von 3 Schritten erledigt",
        );
        const noteTrigger = page.getByRole("button", {
          name: "Notiz bearbeiten",
          exact: true,
        });
        await noteTrigger.click();
        const dialog = page.getByRole("dialog", {
          name: "Task bearbeiten",
          exact: true,
        });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByLabel("Titel", { exact: true })).toBeFocused();
        const noteBounds = await dialog.boundingBox();
        assert.ok(
          noteBounds.x >= 0 &&
            noteBounds.y >= 0 &&
            noteBounds.x + noteBounds.width <= viewport.width &&
            noteBounds.y + noteBounds.height <= viewport.height,
        );
        const focusable = dialog
          .locator(
            'button:not(:disabled), input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)',
          )
          .filter({ visible: true });
        await focusable.first().focus();
        await page.keyboard.press("Shift+Tab");
        await expect(focusable.last()).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(focusable.first()).toBeFocused();

        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(noteTrigger).toBeFocused();
        await page
          .getByRole("button", { name: "+ Schritt", exact: true })
          .click();
        const stepDialog = page.getByRole("dialog", {
          name: "Arbeitsschritt anlegen",
          exact: true,
        });
        await expect(
          stepDialog.getByLabel("Neuer Arbeitsschritt"),
        ).toBeFocused();
        const bounds = await stepDialog.boundingBox();
        assert.ok(
          bounds.x >= 0 &&
            bounds.y >= 0 &&
            bounds.x + bounds.width <= viewport.width &&
            bounds.y + bounds.height <= viewport.height,
        );
        await page.screenshot({
          path: join(
            output,
            `step-dialog-${viewport.width}x${viewport.height}.png`,
          ),
        });
        await page.keyboard.press("Escape");
        const taskMenu = header.getByRole("button", {
          name: "Task-Verwaltung",
          exact: true,
        });
        await taskMenu.click();
        const menuBounds = await header
          .getByRole("group", { name: "Task-Verwaltung", exact: true })
          .boundingBox();
        assert.ok(
          menuBounds.x >= 0 &&
            menuBounds.x + menuBounds.width <= viewport.width,
        );
        await page.keyboard.press("Escape");
        await expect(taskMenu).toHaveAttribute("aria-expanded", "false");
        await expect(taskMenu).toBeFocused();
        checks.push(
          `Empty/Populated, typography, blue action, dialog bounds/focus/Escape ${viewport.width}x${viewport.height}`,
        );
      }
      if (reference) {
        const ref = await context.newPage();
        await referencePage(ref, state);
        await capture(
          ref,
          `reference-${state}-${viewport.width}x${viewport.height}`,
          ".frame",
        );
        const actualGeometry = measurements.find(
          (item) =>
            item.name ===
            `${stage}-${state}-${viewport.width}x${viewport.height}`,
        );
        const referenceGeometry = measurements.at(-1);
        if (stage === "after") {
          assert.equal(
            actualGeometry.canvas.width,
            referenceGeometry.canvas.width,
            "B8 canvas parity",
          );
          if (viewport.width >= 769) {
            assert.ok(
              Math.abs(
                actualGeometry.header.height - referenceGeometry.header.height,
              ) < 1,
              "B8 header parity",
            );
            assert.ok(
              Math.abs(
                actualGeometry.work.height - referenceGeometry.work.height,
              ) < 1,
              "B8 Work parity",
            );
          }
        }
        await ref.close();
      }
    }
    await context.close();
  }
  if (stage === "after") {
    const context = await browser.newContext({ viewport: sizes[0] });
    await context.addCookies([
      { name: "life_os_profile", value: "manual", url: app.origin },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydration/i.test(message.text()))
        errors.push(message.text());
    });
    const go = () => page.goto(`${app.origin}/tasks/${emptyId}`);
    const work = page.locator("#task-work-content");
    await go();
    await page
      .getByRole("button", { name: "Notiz bearbeiten", exact: true })
      .click();
    let dialog = page.getByRole("dialog", {
      name: "Task bearbeiten",
      exact: true,
    });
    await dialog
      .getByLabel("Titel", { exact: true })
      .fill("B8 #125 ungespeicherter Entwurf");
    await dialog
      .locator('select[name="priority"]')
      .evaluate((select) => select.add(new Option("Ungültig", "P99")));
    await dialog.locator('select[name="priority"]').selectOption("P99");
    await dialog
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByLabel("Titel", { exact: true })).toHaveValue(
      "B8 #125 ungespeicherter Entwurf",
    );
    await dialog.locator('select[name="priority"]').selectOption("P1");
    await dialog.getByLabel("Titel", { exact: true }).fill(title);
    await dialog
      .locator('[name="nextAction"]')
      .fill("B8 #125 gespeicherte Arbeitsnotiz");
    await dialog
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(
      work.getByRole("region", { name: "Arbeitsnotiz", exact: true }),
    ).toContainText("B8 #125 gespeicherte Arbeitsnotiz");
    await page.getByRole("button", { name: "+ Schritt", exact: true }).click();
    dialog = page.getByRole("dialog", {
      name: "Arbeitsschritt anlegen",
      exact: true,
    });
    await dialog
      .getByLabel("Neuer Arbeitsschritt")
      .fill("B8 #125 erster Schritt");
    await dialog
      .getByRole("button", { name: "Schritt hinzufügen", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    let row = page
      .locator("[data-task-step]")
      .filter({ hasText: "B8 #125 erster Schritt" });
    await row.getByRole("checkbox").click();
    await expect(row.getByRole("checkbox")).toBeChecked();
    await page.reload();
    await expect(work).toContainText("1 von 1 Schritten erledigt");
    await expect(page.locator('[data-task-lifecycle="planned"]')).toBeVisible();
    await row.getByRole("button", { name: /Arbeitsschritt verwalten/ }).click();
    await row
      .getByRole("button", { name: "Schritt bearbeiten", exact: true })
      .click();
    dialog = page.getByRole("dialog", { name: /Arbeitsschritt verwalten/ });
    await dialog
      .getByLabel("Schritt", { exact: true })
      .fill("B8 #125 Schritt geändert");
    await dialog
      .getByRole("button", { name: "Schritt speichern", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    row = page
      .locator("[data-task-step]")
      .filter({ hasText: "B8 #125 Schritt geändert" });
    await expect(row.getByRole("checkbox")).toBeChecked();
    await row.getByRole("checkbox").click();
    await expect(row.getByRole("checkbox")).not.toBeChecked();
    await page.reload();
    await row.getByRole("button", { name: /Arbeitsschritt verwalten/ }).click();
    page.once("dialog", (confirmation) => confirmation.accept());
    await row
      .getByRole("button", { name: "Schritt entfernen", exact: true })
      .click();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(work).toContainText("0 von 0 Schritten erledigt");
    await page.getByRole("button", { name: "Erledigt", exact: true }).click();
    await expect(page.locator('[data-task-lifecycle="done"]')).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Task-Verwaltung", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Status verwalten", exact: true })
      .click();
    dialog = page.getByRole("dialog", {
      name: "Status verwalten",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Task wieder öffnen", exact: true })
      .click();
    await expect(page.locator('[data-task-lifecycle="planned"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await page.reload();
    await page
      .getByRole("link", { name: "Im Calendar planen", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/view=week/);
    assert.ok(page.url().includes(emptyId));
    await page.reload();
    await expect(page).toHaveURL(/view=week/);
    for (const [status, id] of Object.entries(stateIds)) {
      await page.goto(`${app.origin}/tasks/${id}`);
      await expect(page.locator("[data-task-lifecycle]")).toHaveAttribute(
        "data-task-lifecycle",
        status,
      );
      const eligible = ["planned", "active"].includes(status);
      await expect(
        page
          .locator('[aria-label="Task-Aktionen"]')
          .getByRole("button", { name: "Erledigt", exact: true }),
      ).toHaveCount(eligible ? 1 : 0);
      if (status === "archived")
        await expect(
          page.getByRole("button", { name: "Notiz bearbeiten", exact: true }),
        ).toHaveCount(0);
      if (status !== "planned")
        await expect(page.locator("[data-task-context]")).toHaveCount(0);
    }
    await page.goto(`${app.origin}/tasks/${sourceOwnedId}`);
    await expect(
      page
        .locator('[aria-label="Task-Aktionen"]')
        .getByRole("button", { name: "Erledigt", exact: true }),
    ).toHaveCount(0);
    await page.goto(`${app.origin}/tasks/${fixture.ids.task}`);
    await page
      .getByRole("button", { name: "Zuordnung ändern", exact: true })
      .click();
    dialog = page.getByRole("dialog", {
      name: "Zuordnung ändern",
      exact: true,
    });
    await expect(
      dialog.getByLabel("Milestone (keine Auswahl = Ohne Milestone)"),
    ).toBeFocused();
    await dialog
      .getByRole("button", { name: "Task-Milestone speichern", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Zusammenhang", exact: true }),
    ).toContainText("Methodik");
    const stale = await context.newPage();
    stale.setDefaultTimeout(10000);
    await stale.goto(`${app.origin}/tasks/${fixture.ids.task}`);
    await expect(
      stale.getByRole("button", { name: "Erledigt", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Vorgänger verwalten", exact: true })
      .click();
    dialog = page.getByRole("dialog", {
      name: "Vorgänger verwalten",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Vorgänger hinzufügen", exact: true })
      .click();
    await dialog
      .getByLabel("Vorgänger", { exact: true })
      .selectOption(stateIds.planned);
    await dialog
      .getByRole("button", { name: "Vorgänger speichern", exact: true })
      .click();
    await expect(page.locator('[data-task-readiness="BLOCKED"]')).toBeVisible();
    await stale.getByRole("button", { name: "Erledigt", exact: true }).click();
    await expect(
      stale.locator('form[aria-label="Erledigt"] [role="alert"]'),
    ).toBeVisible();
    await stale.reload();
    await expect(
      stale.locator('[data-task-lifecycle="planned"]'),
    ).toBeVisible();
    await expect(
      stale.getByRole("button", { name: "Erledigt", exact: true }),
    ).toHaveCount(0);
    await stale.close();
    await page.goto(`${app.origin}/tasks/${fixture.ids.task}`);
    await page.getByRole("link", { name: "Zum Project", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Masterarbeit · Forschungsdesign",
        exact: true,
      }),
    ).toBeVisible();
    checks.push(
      "Validation error retains editor draft; lifecycle/source eligibility; missing Context collapses; milestone Save/Reload; explicit BLOCKED and stale completion rejected; Project navigation",
    );
    checks.push(
      "Canonical note Save/Reload; step create/toggle/edit/reopen/archive/Reload; independent Task completion/reopen; Calendar Week navigation/reload",
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, `${stage}-proof.json`),
    JSON.stringify(
      { stage, checks, consoleErrors: errors, measurements },
      null,
      2,
    ),
  );
  console.log(
    `${stage}: PASS; ${checks.length} focused groups; screenshots: ${output}`,
  );
} finally {
  await browser.close();
  await app.stop();
}
