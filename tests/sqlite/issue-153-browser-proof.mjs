import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApplicationFixture } from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

assert.equal(process.versions.node, "24.21.0");
const output = resolve("test-results/issue-153");
mkdirSync(output, { recursive: true });
const f = await createApplicationFixture(),
  require = createRequire(import.meta.url),
  Database = require("better-sqlite3");
const { SqliteRuntime } = require(join(f.compiled, "runtime.js"));
const { issueOwnerContext } = require(join(f.compiled, "owner-context.js"));
const ids = Object.fromEntries(
  [
    "historical",
    "stale",
    "editorRace",
    "archiveTask",
    "archiveProject",
    "source",
    "sourceMeal",
    ...Array.from({ length: 4 }, (_, i) => "inbox" + i),
  ].map((k) => [k, randomUUID()]),
);
const titles = Object.fromEntries(
  Object.keys(ids).map((k) => [k, `#153 ${k} ${randomUUID().slice(0, 8)}`]),
);
const store = new SqliteRuntime(f.path, { syntheticProof: true });
try {
  store.command(
    issueOwnerContext(f.ownerId),
    "synthetic.initialize",
    (db, owner) => {
      db.prepare(
        "INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,?,'active',life_now(),life_now())",
      ).run(ids.archiveProject, owner, titles.archiveProject);
      for (const key of [
        "historical",
        "stale",
        "editorRace",
        "archiveTask",
        "source",
      ])
        db.prepare(
          "INSERT INTO tasks(id,user_id,title,description,status,project_id,goal_id,planned_date,scheduled_start_at,duration_minutes,due_at,created_at,updated_at) VALUES(?,?,?,'Preserve this context','inbox',?,?,?,?,?,?,life_now(),life_now())",
        ).run(
          ids[key],
          owner,
          titles[key],
          key === "archiveTask"
            ? ids.archiveProject
            : key === "historical"
              ? f.ids.project
              : null,
          key === "historical" ? f.ids.goal : null,
          key === "historical" ? f.day : null,
          key === "historical" ? `${f.day}T18:35:00.000000Z` : null,
          key === "historical" ? 17 : 30,
          key === "historical" ? "2026-10-25T22:59:59.000000Z" : null,
        );
      db.prepare(
        "INSERT INTO meals(id,user_id,date,meal_type,title,created_at,updated_at) VALUES(?,?,'2026-10-13','lunch','Source meal',life_now(),life_now())",
      ).run(ids.sourceMeal, owner);
      db.prepare(
        "INSERT INTO schedule_source_links(id,user_id,task_id,source_type,source_id,created_at,updated_at) VALUES(?,?,?,'meal',?,life_now(),life_now())",
      ).run(randomUUID(), owner, ids.source, ids.sourceMeal);
      for (let i = 0; i < 4; i++)
        db.prepare(
          "INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,?,'Original capture',life_now(),life_now(),life_now())",
        ).run(ids["inbox" + i], owner, titles["inbox" + i]);
    },
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
const task = (id) =>
  read("SELECT * FROM tasks WHERE user_id=? AND id=?", f.ownerId, id)[0];
const created = (id) =>
  read(
    "SELECT * FROM tasks WHERE user_id=? AND source_inbox_item_id=?",
    f.ownerId,
    id,
  );
const evidence = [],
  errors = [],
  network = [],
  inventory = [];
let app, browser;
const step = async (name, body) => {
  await body();
  evidence.push({ name, status: "PASS" });
  console.log("PASS", name);
};
const snapshots = async (page, surface) => {
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    const bounds = await page.locator("#main-content").evaluate((el) => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      controls: [
        ...el.querySelectorAll("button,a,input,select,textarea,summary"),
      ]
        .filter((c) => c.getClientRects().length)
        .map((c) => {
          const r = c.getBoundingClientRect();
          let scrollClipped = false;
          for (let a = c.parentElement; a && a !== el; a = a.parentElement) {
            const style = getComputedStyle(a);
            if (
              ["auto", "scroll"].includes(style.overflowX) &&
              a.scrollWidth > a.clientWidth + 1
            ) {
              const box = a.getBoundingClientRect();
              scrollClipped ||= r.left < box.left || r.right > box.right;
            }
          }
          return {
            tag: c.tagName,
            label: c.getAttribute("aria-label") || c.textContent?.trim(),
            left: r.left,
            right: r.right,
            scrollClipped,
          };
        }),
    }));
    assert.ok(bounds.width <= width + 1, JSON.stringify(bounds));
    assert.ok(
      bounds.controls.every(
        (c) => c.scrollClipped || (c.left >= -1 && c.right <= width + 1),
      ),
      JSON.stringify(bounds.controls),
    );
    inventory.push({ surface, width, controls: bounds.controls });
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
    second = await context.newPage();
  page.setDefaultTimeout(10_000);
  second.setDefaultTimeout(10_000);
  const inspector = () =>
    page.getByRole("complementary", { name: "Selected Entity", exact: true });
  await step(
    "historical Inbox lifecycle is honest in Portfolio inspector and rows",
    async () => {
      await page.goto(
        `${app.origin}/portfolio?view=tasks&selected=${ids.historical}`,
      );
      await expect(
        inspector().getByRole("heading", {
          name: titles.historical,
          exact: true,
        }),
      ).toBeVisible();
      await expect(inspector().locator("p").first()).toContainText("inbox");
      await snapshots(page, "portfolio-inbox");
      await page.reload();
      await expect(inspector().locator("p").first()).toContainText("inbox");
    },
  );
  await step(
    "historical status-only release, keyboard/success/reload, all metadata and existing real time block preserved",
    async () => {
      await page.goto(`${app.origin}/tasks/${ids.historical}`);
      const form = page.getByRole("form", {
          name: "Zur Planung freigeben",
          exact: true,
        }),
        button = form.getByRole("button", {
          name: "Zur Planung freigeben",
          exact: true,
        });
      await expect(button).toBeEnabled();
      await snapshots(page, "historical-task");
      const before = task(ids.historical);
      await form.evaluate((el) => {
        for (const [name, value] of Object.entries({
          userId: "15300000-0000-4000-8000-000000000099",
          profileId: "15300000-0000-4000-8000-000000000099",
          title: "Must not overwrite",
          dueAt: "",
          plannedDate: "",
          scheduledStartAt: "",
          projectId: "",
          goalId: "",
        })) {
          const i = document.createElement("input");
          i.type = "hidden";
          i.name = name;
          i.value = value;
          el.append(i);
        }
      });
      await button.focus();
      await expect(button).toBeFocused();
      await button.press("Enter");
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Task zur Planung freigegeben." })
          .last(),
      ).toBeVisible();
      await page.reload();
      const after = task(ids.historical);
      assert.equal(after.status, "planned");
      assert.notEqual(after.updated_at, before.updated_at);
      assert.deepEqual(after, {
        ...before,
        status: "planned",
        updated_at: after.updated_at,
      });
      await expect(page.locator('[aria-label="Task-Status"]')).toContainText(
        "Geplant",
      );
      await expect(
        page.getByRole("button", {
          name: "Zur Planung freigeben",
          exact: true,
        }),
      ).toHaveCount(0);
      await page.goto(
        `${app.origin}/portfolio?view=tasks&selected=${ids.historical}`,
      );
      await expect(inspector().locator("p").first()).toContainText("planned");
    },
  );
  await step(
    "stale release after a real editor write fails visibly and preserves the newer Task",
    async () => {
      await page.goto(`${app.origin}/tasks/${ids.stale}`);
      await second.goto(`${app.origin}/tasks/${ids.stale}`);
      await second
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      const dialog = second.getByRole("dialog");
      await dialog.locator('[name="title"]').fill(titles.stale + " updated");
      await dialog
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(dialog).toBeHidden();
      const before = task(ids.stale),
        form = page.getByRole("form", {
          name: "Zur Planung freigeben",
          exact: true,
        });
      await form.getByRole("button").click();
      await expect(form.getByRole("alert")).toContainText(
        "zwischenzeitlich geändert",
      );
      assert.deepEqual(task(ids.stale), before);
      await page.reload();
      assert.equal(task(ids.stale).status, "inbox");
    },
  );
  await step(
    "release wins before a stale editor: old hidden Inbox status and metadata cannot overwrite planned",
    async () => {
      await page.goto(`${app.origin}/tasks/${ids.editorRace}`);
      await second.goto(`${app.origin}/tasks/${ids.editorRace}`);
      await second
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      const dialog = second.getByRole("dialog");
      await page
        .getByRole("form", { name: "Zur Planung freigeben", exact: true })
        .getByRole("button")
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Task zur Planung freigegeben." })
          .last(),
      ).toBeVisible();
      const before = task(ids.editorRace);
      await dialog
        .locator('[name="title"]')
        .fill("Stale title must not overwrite");
      await dialog
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toContainText(
        "zwischenzeitlich geändert",
      );
      assert.deepEqual(task(ids.editorRace), before);
      await second.reload();
      assert.equal(task(ids.editorRace).status, "planned");
    },
  );
  await step(
    "real Parent archive after loading a release control rejects atomically and remains blocked after reload",
    async () => {
      await page.goto(`${app.origin}/tasks/${ids.archiveTask}`);
      await second.goto(`${app.origin}/projects/${ids.archiveProject}`);
      await second.getByRole("button", { name: "Mehr", exact: true }).click();
      const manage = second.getByRole("dialog", { name: "Project verwalten" });
      await manage
        .getByRole("button", { name: "Project archivieren", exact: true })
        .click();
      await expect(manage).toBeHidden();
      const before = task(ids.archiveTask),
        form = page.getByRole("form", {
          name: "Zur Planung freigeben",
          exact: true,
        });
      await form.getByRole("button").click();
      await expect(form.getByRole("alert")).toContainText(
        "Project ist archiviert",
      );
      assert.deepEqual(task(ids.archiveTask), before);
      await page.reload();
      await expect(
        page.getByRole("button", {
          name: "Zur Planung freigeben",
          exact: true,
        }),
      ).toHaveCount(0);
      assert.deepEqual(task(ids.archiveTask), before);
    },
  );
  await step(
    "Source-owned and forged target releases are denied server-side with visible feedback",
    async () => {
      await page.goto(`${app.origin}/tasks/${ids.source}`);
      await expect(
        page.getByRole("button", {
          name: "Zur Planung freigeben",
          exact: true,
        }),
      ).toHaveCount(0);
      await page.goto(`${app.origin}/tasks/${ids.stale}`);
      const before = task(ids.source),
        form = page.getByRole("form", {
          name: "Zur Planung freigeben",
          exact: true,
        });
      await form.locator('[name="taskId"]').evaluate((el, id) => {
        el.value = id;
      }, ids.source);
      await form.locator('[name="expectedUpdatedAt"]').evaluate((el, value) => {
        el.value = value;
      }, before.updated_at);
      await form.getByRole("button").click();
      await expect(form.getByRole("alert")).toContainText("Domain-Flow");
      assert.deepEqual(task(ids.source), before);
    },
  );
  const routes = [
    ["task", "Standalone Task", null],
    ["existing_project", "Existing Project", f.ids.project],
    ["existing_goal", "Existing Goal", f.ids.goal],
    ["existing_skill", "Existing Skill", f.ids.skill],
  ];
  for (let index = 0; index < routes.length; index++) {
    const [route, label, target] = routes[index],
      inboxId = ids["inbox" + index],
      title = titles["inbox" + index];
    await step(
      `${route}: real final Confirm creates one planned Task; selection alone is no write; reload/relations/idempotence`,
      async () => {
        await page.goto(`${app.origin}/inbox?item=${inboxId}`);
        const active = page.locator('[data-inbox-section="active-item"]');
        await expect(
          active.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        const form = page.getByRole("form", {
          name: "Active Item bearbeiten",
          exact: true,
        });
        await form
          .getByLabel("Description / Context")
          .fill("Confirmed context " + route);
        await active.getByRole("button", { name: label, exact: true }).click();
        if (target)
          await active
            .getByRole("combobox", { name: "Bestehendes Ziel", exact: true })
            .selectOption(target);
        assert.equal(created(inboxId).length, 0);
        if (index === 0) await snapshots(page, "inbox-confirm");
        await active
          .getByRole("button", { name: "Einordnen & abschließen", exact: true })
          .click();
        const result = page.locator('[aria-label="Letztes Routing"]');
        await expect(
          result.getByRole("link", { name: "Ziel öffnen", exact: true }),
        ).toBeVisible();
        const rows = created(inboxId);
        assert.equal(rows.length, 1);
        const made = rows[0];
        assert.equal(made.status, "planned");
        assert.equal(made.planned_date, null);
        assert.equal(made.scheduled_start_at, null);
        assert.equal(
          made.project_id,
          route === "existing_project" ? target : null,
        );
        assert.equal(made.goal_id, route === "existing_goal" ? target : null);
        if (route === "existing_skill")
          assert.equal(
            read(
              "SELECT count(*) AS n FROM task_skill_links WHERE task_id=? AND skill_id=?",
              made.id,
              target,
            )[0].n,
            1,
          );
        await result
          .getByRole("link", { name: "Ziel öffnen", exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`selected=${made.id}`));
        await expect(inspector().locator("p").first()).toContainText("planned");
        await inspector()
          .getByRole("link", { name: "Details öffnen", exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`/tasks/${made.id}`));
        await page.reload();
        assert.equal(created(inboxId).length, 1);
        await expect(
          page.getByRole("button", { name: "Erledigt", exact: true }),
        ).toBeEnabled();
        const calendar = page.locator(
          '[aria-label="Task-Aktionen"] a[href*="/calendar?"]',
        );
        await expect(calendar).toBeVisible();
        await calendar.click();
        await expect(page).toHaveURL(new RegExp(`task=${made.id}`));
        assert.equal(new URL(page.url()).searchParams.get("view"), "week");
        const schedule = page.getByRole("form", {
          name: title + " planen",
          exact: true,
        });
        await expect(schedule).toBeVisible();
        await schedule.locator('[name="plannedDate"]').fill(f.day);
        await schedule
          .locator('[name="scheduledTime"]')
          .fill(`2${1 + Math.floor(index / 2)}:${index % 2 ? "30" : "00"}`);
        await schedule.locator('[name="durationMinutes"]').selectOption("15");
        await schedule
          .getByRole("button", { name: "Schedule task", exact: true })
          .click();
        await expect
          .poll(() => task(made.id).scheduled_start_at)
          .not.toBeNull();
        await page.reload();
        assert.equal(task(made.id).planned_date, f.day);
        assert.equal(task(made.id).duration_minutes, 15);
        if (index === 0) await snapshots(page, "calendar-block");
        await page.goto(`${app.origin}/dashboard`);
        await page.reload();
        await expect(
          page.getByRole("link", {
            name: `Open agenda item: ${title}`,
            exact: true,
          }),
        ).toBeVisible();
        await page.goto(`${app.origin}/tasks/${made.id}`);
        await page
          .getByRole("form", { name: "Erledigt", exact: true })
          .getByRole("button")
          .click();
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: "Task abgeschlossen." })
            .last(),
        ).toBeVisible();
        await page.reload();
        assert.equal(task(made.id).status, "done");
        assert.ok(task(made.id).completed_at);
        await page.goto(
          `${app.origin}/portfolio?view=tasks&selected=${made.id}`,
        );
        await expect(inspector().locator("p").first()).toContainText("done");
        await page.goto(`${app.origin}/today`);
        await page.reload();
        const completed = page
          .getByRole("region", { name: "Activity Stream", exact: true })
          .locator("li")
          .filter({
            has: page.getByRole("heading", { name: title, exact: true }),
          })
          .filter({ hasText: "TASK COMPLETED" });
        await expect(completed).toHaveCount(1);
        await expect(
          completed.getByRole("link", { name: "Quelle öffnen", exact: true }),
        ).toHaveAttribute("href", `/portfolio?view=tasks&selected=${made.id}`);
        if (route === "existing_project") {
          await page.goto(`${app.origin}/projects/${target}`);
          await page.reload();
          const row = page
            .locator('[aria-label="Project Task List"] li')
            .filter({
              has: page.getByRole("link", { name: title, exact: true }),
            });
          await expect(row).toContainText("Erledigt");
          assert.equal(
            read("SELECT status FROM projects WHERE id=?", target)[0].status,
            "active",
          );
        }
      },
    );
  }
  await step(
    "Demo/Empty and Auth-blocked never expose or admit Manual release",
    async () => {
      for (const profile of ["demo", "empty"]) {
        await context.addCookies([
          { name: "life_os_profile", value: profile, url: app.origin },
        ]);
        await page.goto(`${app.origin}/tasks/${ids.stale}`);
        await expect(
          page.getByRole("button", {
            name: "Zur Planung freigeben",
            exact: true,
          }),
        ).toHaveCount(0);
      }
      await context.close();
      await app.stop();
      app = await startApplication(f, { authentication: "blocked" });
      const blocked = await browser.newContext();
      await blocked.addCookies([
        { name: "life_os_profile", value: "manual", url: app.origin },
      ]);
      const p = await blocked.newPage();
      await p.goto(`${app.origin}/tasks/${ids.stale}`);
      await expect(
        p.getByRole("button", { name: "Zur Planung freigeben", exact: true }),
      ).toHaveCount(0);
      await expect(
        p.locator("#main-content").getByRole("status"),
      ).toContainText("lokale Anmeldung");
      await blocked.close();
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
      { evidence, errors, network, inventory, fixtureDirectory: f.directory },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
