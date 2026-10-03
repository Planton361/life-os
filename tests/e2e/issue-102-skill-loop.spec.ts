import {
  test,
  expect as baseExpect,
  type Page,
  type TestInfo,
  type Locator,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const expect = baseExpect.configure({ timeout: 15000 });

async function sessionApi(page: Page) {
  const cookie = (await page.context().cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(
    JSON.parse(
      Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
    ),
  );
  return api;
}
async function open(region: Locator, label: string) {
  const summary = region
    .locator("summary")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first();
  const details = summary.locator("..");
  if (!(await details.evaluate((e) => e.hasAttribute("open"))))
    await summary.click();
  return details;
}
async function proof(page: Page, info: TestInfo, name: string) {
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const violations = await page
      .locator(
        "main a:visible, main button:visible, main input:visible, main select:visible, main textarea:visible, main summary:visible",
      )
      .evaluateAll((elements) =>
        elements
          .filter((e) => {
            const r = e.getBoundingClientRect();
            const outside = r.left < -1 || r.right > innerWidth + 1;
            let parent = e.parentElement;
            while (parent) {
              const style = getComputedStyle(parent);
              if (
                ["auto", "scroll"].includes(style.overflowX) &&
                parent.scrollWidth > parent.clientWidth
              )
                return false;
              parent = parent.parentElement;
            }
            return outside;
          })
          .map((e) => e.textContent?.slice(0, 70)),
      );
    expect(violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`issue-102-${name}-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}

test("#102 real state matrix, bounded rich workbench, Portfolio, lifecycle and shared Detail family", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await signUpTechnicalManualUser(page, "skill-loop", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const api = await sessionApi(page);
  const uid = (await api.auth.getUser()).data.user!.id;
  let id: string | null = null,
    revision = 0;
  async function command(
    operation: string,
    payload: Record<string, unknown> = {},
  ) {
    const r = await api.rpc("skill_development_command", {
      p_skill_id: id,
      p_command_id: crypto.randomUUID(),
      p_expected_revision: id ? revision : null,
      p_operation: operation,
      p_payload: payload,
    });
    expect(r.error, operation).toBeNull();
    if (!id) id = r.data.skill_id;
    const read = await api.rpc("skill_development_read", { p_skill_id: id });
    expect(read.error).toBeNull();
    revision = read.data.skill.development_revision;
    return read.data;
  }
  const area = (
    await api
      .from("areas")
      .insert({ user_id: uid, name: "Zusammenarbeit", key: "education" })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const secondArea = (
    await api
      .from("areas")
      .insert({ user_id: uid, name: "Kommunikation", key: "coding" })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await page.goto("/skills/new");
  const create = page.getByRole("form", {
    name: "Skill erstellen",
    exact: true,
  });
  await create
    .getByLabel("Name", { exact: true })
    .fill("Gespräche klar führen");
  await create
    .getByLabel("Warum mir diese Fähigkeit wichtig ist")
    .fill(
      "Anforderungen präzise klären und konkrete nächste Schritte vereinbaren.",
    );
  await create.getByLabel("Area", { exact: true }).selectOption(area.id);
  await create
    .getByRole("button", { name: "Skill erstellen", exact: true })
    .click();
  await expect(page.locator("[data-skill-development] h1")).toHaveText(
    "Gespräche klar führen",
  );
  id = page.url().split("/").at(-1)!;
  await page.reload();
  await expect(
    page.locator("[data-skill-development] header").first(),
  ).toContainText("Zusammenarbeit");
  expect(
    (await api.rpc("skill_development_read", { p_skill_id: id })).data.skill
      .area_id,
  ).toBe(area.id);
  const url = () => `/skills/${id}`;
  const work = page.locator("[data-skill-development]");
  const primary = work.locator("[data-skill-primary]");
  await page.goto(url());
  await expect(primary.locator("summary")).toHaveText(
    "Entwicklungsfokus festlegen",
  );
  await expect(work.locator("form:visible")).toHaveCount(0);
  await expect(
    work.getByRole("complementary", { name: "Beobachtungen" }),
  ).toHaveCount(0);
  await proof(page, info, "empty");
  await expect
    .poll(async () => {
      await primary.locator("summary").focus();
      return primary
        .locator("summary")
        .evaluate((el) => el === document.activeElement);
    })
    .toBe(true);
  await primary.locator("summary").press("Enter");
  await expect(primary.getByRole("form")).toBeVisible();
  await primary.getByLabel("Was möchtest du besser können?").focus();
  await page.keyboard.press("Escape");
  await expect(primary.locator("summary")).toBeFocused();
  await expect(primary.getByRole("form")).not.toBeVisible();
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: "Gesprächsvorbereitung",
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const tasks = (
    await api
      .from("tasks")
      .insert(
        Array.from({ length: 18 }, (_, i) => ({
          user_id: uid,
          project_id: project.id,
          title: `Übung ${i + 1}: ${i === 0 ? "Stakeholder-Gespräch vorbereiten" : "Rückfragen bündeln"}`,
          status: i === 17 ? "done" : "planned",
          completed_at: i === 17 ? "2026-09-30T12:00:00Z" : null,
        })),
      )
      .select()
      .throwOnError()
  ).data!;
  await api
    .from("task_dependencies")
    .insert({
      user_id: uid,
      project_id: project.id,
      predecessor_task_id: tasks[0].id,
      successor_task_id: tasks[1].id,
    })
    .throwOnError();
  await api
    .from("task_dependencies")
    .insert({
      user_id: uid,
      project_id: project.id,
      predecessor_task_id: tasks[0].id,
      successor_task_id: tasks[2].id,
    })
    .throwOnError();
  await api
    .from("task_skill_links")
    .insert({ user_id: uid, task_id: tasks[0].id, skill_id: id })
    .throwOnError();
  await page.reload();
  await expect(
    primary.getByRole("link", { name: "Aufgabe öffnen" }),
  ).toHaveAttribute("href", `/tasks/${tasks[0].id}`);
  await expect(
    work.getByRole("region", { name: "Aktuelle Entwicklung" }),
  ).toContainText("Kein Entwicklungsfokus festgelegt.");
  await proof(page, info, "no-target");
  await primary.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${tasks[0].id}$`));
  await page.goto(url());
  await api
    .from("task_skill_links")
    .insert({ user_id: uid, task_id: tasks[1].id, skill_id: id })
    .throwOnError();
  await page.reload();
  await expect(primary.locator("summary")).toHaveText("Aufgabe auswählen");
  await primary.locator("summary").click();
  await expect(primary.getByRole("article")).toHaveCount(2);
  await expect(
    primary.getByRole("article", {
      name: `Übung ${tasks[0].title}`,
      exact: true,
    }),
  ).toContainText("Ausführbar");
  await expect(
    primary.getByRole("article", {
      name: `Übung ${tasks[1].title}`,
      exact: true,
    }),
  ).toContainText("Blockiert");
  await expect(primary.locator("input:checked")).toHaveCount(0);
  await primary
    .getByRole("link", {
      name: `Voraussetzung: ${tasks[0].title}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${tasks[0].id}$`));
  await page.goto(url());
  await api
    .from("task_skill_links")
    .delete()
    .eq("skill_id", id)
    .eq("task_id", tasks[0].id)
    .throwOnError();
  await page.reload();
  await expect(primary.locator("summary")).toHaveText("Blocker ansehen");
  await primary.locator("summary").click();
  await expect(primary).toContainText("Voraussetzung: Übung 1");
  await api.from("task_skill_links").delete().eq("skill_id", id).throwOnError();
  let r = await command("target.create", {
    title: "Gespräche selbstständig strukturieren",
    description: "Klare Rückfragen und überprüfbare Vereinbarungen",
  });
  const target = r.targets[0].id;
  await command("target.current", { target_id: target });
  await page.reload();
  await expect(primary.getByRole("link")).toHaveText("Übungsaufgabe anlegen");
  const path = work.getByRole("region", { name: "Lernweg", exact: true });
  await expect(path).toContainText("Noch keine Lernschritte");
  await expect(path.getByRole("form")).not.toBeVisible();
  const addSummary = path
    .locator("summary")
    .filter({ hasText: /^Lernschritt hinzufügen$/ });
  await addSummary.focus();
  await addSummary.press("Enter");
  await path.getByLabel("Titel", { exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(addSummary).toBeFocused();
  await expect(path.getByRole("form")).not.toBeVisible();
  await proof(page, info, "learning-empty");
  r = await command("milestone.create", {
    target_id: target,
    title: "Grundlagen erarbeiten",
    description: "Gespräche vorbereiten und aufmerksam zuhören.",
  });
  const completedStep = r.milestones.find(
    (m: { title: string }) => m.title === "Grundlagen erarbeiten",
  ).id;
  r = await command("milestone.create", {
    target_id: target,
    title: "Rückfragen bündeln",
  });
  const currentStep = r.milestones.find(
    (m: { title: string }) => m.title === "Rückfragen bündeln",
  ).id;
  await command("milestone.create", {
    target_id: target,
    title: "Vereinbarungen nachhalten",
  });
  await page.reload();
  await expect(path.locator("h4")).toHaveText([
    "Grundlagen erarbeiten · Geplant",
    "Rückfragen bündeln · Geplant",
    "Vereinbarungen nachhalten · Geplant",
  ]);
  await proof(page, info, "learning-planned");
  await api
    .from("task_skill_links")
    .insert(
      tasks
        .slice(0, 2)
        .map((t) => ({ user_id: uid, skill_id: id, task_id: t.id })),
    )
    .throwOnError();
  await page.reload();
  await expect(primary.locator("summary")).toHaveText("Aufgabe auswählen");
  await primary.locator("summary").click();
  const readinessBefore = await primary.getByRole("article").allTextContents();
  await expect(primary.getByRole("article").first()).toContainText(
    "Ausführbar",
  );
  await expect(primary.getByRole("article").nth(1)).toContainText("Blockiert");

  await command("review.submit", {
    target_id: target,
    milestone_id: completedStep,
    decision: "completed",
    note: "Grundlagen ausdrücklich überprüft",
    open_milestones_acknowledged: false,
    evidence: [],
  });
  await command("milestone.current", {
    target_id: target,
    milestone_id: currentStep,
  });
  await page.reload();
  await expect(path.locator("h4")).toHaveText([
    "Grundlagen erarbeiten · Abgeschlossen",
    "Rückfragen bündeln · Aktuell",
    "Vereinbarungen nachhalten · Geplant",
  ]);
  await expect(
    work.getByRole("article", {
      name: "Lernschritt Rückfragen bündeln",
      exact: true,
    }),
  ).toHaveCount(1);
  expect(
    await primary.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(
          el.parentElement!.querySelector('[aria-label="Lernweg"]')!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await expect(primary.locator("summary")).toHaveText("Aufgabe auswählen");
  await primary.locator("summary").click();
  await expect(primary.getByRole("article")).toHaveCount(2);
  expect(await primary.getByRole("article").allTextContents()).toEqual(
    readinessBefore,
  );
  await primary.locator("summary").click();
  await proof(page, info, "learning-mixed");
  await api.from("task_skill_links").delete().eq("skill_id", id).throwOnError();
  await api
    .from("task_skill_links")
    .insert({ user_id: uid, skill_id: id, task_id: tasks[0].id })
    .throwOnError();
  await page.reload();
  await expect(
    primary.getByRole("link", { name: "Aufgabe öffnen" }),
  ).toBeVisible();
  await proof(page, info, "focus-step-one-practice");
  await api.from("task_skill_links").delete().eq("skill_id", id).throwOnError();
  await api
    .from("task_skill_links")
    .insert(tasks.map((t) => ({ user_id: uid, skill_id: id, task_id: t.id })))
    .throwOnError();
  for (let i = 0; i < 24; i++)
    await command("evidence.create", {
      title: `Beobachtung ${String(i + 1).padStart(2, "0")}`,
      note:
        i === 23
          ? "Langer Kontext ".repeat(100)
          : "Rückfragen wurden klarer gebündelt.",
      evidence_date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      source_type: "manual_note",
      source_id: null,
    });
  r = await command("target.create", { title: "Früherer Fokus" });
  const prior = r.targets.find(
    (t: { title: string }) => t.title === "Früherer Fokus",
  ).id;
  await command("milestone.create", {
    target_id: prior,
    title: "Frühere Etappe",
  });
  await command("review.submit", {
    target_id: prior,
    milestone_id: null,
    decision: "continue",
    note: "Erster Zwischenstand",
    open_milestones_acknowledged: true,
    evidence: [],
  });
  r = await command("review.submit", {
    target_id: prior,
    milestone_id: null,
    decision: "completed",
    note: "Explizit abgeschlossen",
    open_milestones_acknowledged: true,
    evidence: [{ id: r.evidence[0].id, revision: r.evidence[0].revision }],
  });
  await command("review.amend", {
    review_id: r.reviews[0].id,
    kind: "clarification",
    note: "Der damalige Stand bleibt unverändert.",
  });
  await command("target.create", { title: "Geplanter Fokus" });
  await page.reload();
  const practice = work.getByRole("region", { name: "Üben & Anwenden" });
  const observations = work.getByRole("complementary", {
    name: "Beobachtungen",
  });
  await expect(practice.locator("article:visible")).toHaveCount(4);
  await expect(
    observations.getByRole("article").locator("visible=true"),
  ).toHaveCount(2);
  await expect(observations).toContainText("Zuletzt geübt");
  await expect(observations).toContainText("30.9.2026");
  await expect(observations).toContainText("2026-09-24");
  await expect(path).not.toContainText("Frühere Etappe");
  const depth = await open(work, "Entwicklungsfokusse & Überprüfungen");
  await expect(
    depth.getByRole("article", {
      name: "Lernschritt Frühere Etappe",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    depth.getByRole("article", {
      name: "Lernschritt Rückfragen bündeln",
      exact: true,
    }),
  ).toHaveCount(0);
  await depth.locator("summary").first().click();
  await proof(page, info, "rich");
  await open(observations, "Beobachtung vollständig lesen");
  await expect(observations.locator("details[open]").first()).toContainText(
    "Langer Kontext",
  );
  await page.keyboard.press("Escape");
  await open(practice, "Alle 17 Aufgaben ansehen");
  await expect(practice.getByRole("article")).toHaveCount(17);
  await open(observations, "Alle 24 Beobachtungen ansehen");
  await expect(observations.getByRole("article")).toHaveCount(24);
  await work
    .getByRole("link", { name: "Entscheidung im Verlauf ansehen" })
    .click();
  await expect(work.locator("#skill-history > details")).toHaveAttribute(
    "open",
    "",
  );
  await expect(work.locator("[data-target]")).toHaveCount(3);
  await expect(
    work.getByRole("article", { name: "Überprüfung Früherer Fokus" }).first(),
  ).toContainText("Der damalige Stand bleibt unverändert.");
  await page.goto(`/portfolio?view=skills&selected=${id}`);
  const inspector = page.getByRole("complementary", {
    name: "Selected Entity",
  });
  await expect(inspector).toContainText(
    "Fokus: Gespräche selbstständig strukturieren",
  );
  await expect(inspector).toContainText("15 ausführbar · 2 blockiert");
  await expect(inspector).toContainText("Area: Zusammenarbeit");
  await expect(
    inspector
      .getByRole("region", { name: "Verknüpfte Aufgaben", exact: true })
      .getByRole("heading", { name: "Verknüpfte Aufgaben", exact: true }),
  ).toBeVisible();
  await expect(inspector).not.toContainText("Practice Tasks");
  await expect(
    page.getByRole("region", { name: "Portfolio summary" }),
  ).toContainText("24 Beobachtungen");
  await expect(page.locator("#portfolio-page")).not.toContainText(
    "Evidence-Einträge",
  );
  await expect(inspector.getByText("Next Action", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    inspector.getByText("Aktueller Stand", { exact: true }),
  ).toHaveCount(0);
  await proof(page, info, "portfolio-rich");
  await inspector.getByRole("link", { name: "Skill öffnen" }).click();
  await expect(page).toHaveURL(new RegExp(`/skills/${id}$`));
  await page.reload();
  await work
    .getByRole("link", { name: "Skill verwalten", exact: true })
    .click();
  await expect(work.locator("#skill-management > details")).toHaveAttribute(
    "open",
    "",
  );
  const management = work.getByRole("form", {
    name: "Skill speichern",
    exact: true,
  });
  await management
    .getByLabel("Area", { exact: true })
    .selectOption(secondArea.id);
  await management
    .getByRole("button", { name: "Skill speichern", exact: true })
    .click();
  await expect(management.getByRole("status")).toContainText(
    "Skill gespeichert.",
  );
  expect(
    (await api.rpc("skill_development_read", { p_skill_id: id })).data.skill
      .area_id,
  ).toBe(secondArea.id);
  revision = (await api.rpc("skill_development_read", { p_skill_id: id })).data
    .skill.development_revision;
  await page.reload();
  await expect(work.locator("header").first()).toContainText("Kommunikation");
  await proof(page, info, "area-switch");
  await command("skill.edit", {
    name: "Gespräche klar führen",
    summary: "Klarheit im Alltag",
    status: "paused",
  });
  await page.reload();
  await expect(
    primary.getByRole("button", { name: "Entwicklung fortsetzen" }),
  ).toBeVisible();
  await proof(page, info, "paused");
  await primary.getByRole("button", { name: "Entwicklung fortsetzen" }).click();
  await expect(work.locator("header").first()).toContainText("Aktiv");
  await page.reload();
  await expect(work.locator("header").first()).toContainText("Kommunikation");
  await expect(work.locator("header").first()).toContainText("Aktiv");
  await proof(page, info, "area-resumed");
  r = (await api.rpc("skill_development_read", { p_skill_id: id })).data;
  revision = r.skill.development_revision;
  expect(r.skill.area_id).toBe(secondArea.id);
  expect(
    r.targets.find((t: { status: string }) => t.status === "current").id,
  ).toBe(target);
  await command("skill.archive");
  await page.reload();
  await expect(
    primary.getByRole("button", { name: "Skill wiederherstellen" }),
  ).toBeVisible();
  await proof(page, info, "archived");
  await open(work, "Entwicklungsfokusse & Überprüfungen");
  await open(
    work.getByRole("article", { name: "Überprüfung Früherer Fokus" }).first(),
    "Entscheidung ergänzen / korrigieren",
  );
  await expect(
    work.getByRole("form", { name: "Ergänzung speichern" }),
  ).toBeVisible();
  await primary.getByRole("button", { name: "Skill wiederherstellen" }).click();
  await expect(
    primary.getByRole("button", { name: "Entwicklung fortsetzen" }),
  ).toBeVisible();
  await page.reload();
  r = (await api.rpc("skill_development_read", { p_skill_id: id })).data;
  expect(r.skill.status).toBe("paused");
  expect(
    r.targets.some((t: { status: string }) => t.status === "current"),
  ).toBe(false);
  expect(
    r.milestones.some((m: { status: string }) => m.status === "current"),
  ).toBe(false);
  await page.goto(`/projects/${project.id}`);
  await expect(
    page.getByRole("heading", { name: project.title, exact: true }),
  ).toBeVisible();
  await proof(page, info, "family-project");
  const goal = (
    await api
      .from("goals")
      .insert({
        user_id: uid,
        title: "Bessere Zusammenarbeit",
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await page.goto(`/goals/${goal.id}`);
  await expect(
    page.getByRole("heading", { name: goal.title, exact: true }),
  ).toBeVisible();
  await proof(page, info, "family-goal");
  expect(errors).toEqual([]);
});

test("#102 canonical Task origin: one save, opt-out, link-only recovery, ambiguous Create, two-owner guards", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(180000);
  await signUpTechnicalManualUser(page, "skill-origin", Date.now());
  const api = await sessionApi(page);
  const created = await api.rpc("skill_development_command", {
    p_skill_id: null,
    p_command_id: crypto.randomUUID(),
    p_expected_revision: null,
    p_operation: "skill.create",
    p_payload: { name: "SQL-Abfragen entwickeln" },
  });
  expect(created.error).toBeNull();
  const id = created.data.skill_id;
  const origin = `/tasks/new?skill=${id}`;
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  await page.goto(origin);
  await expect(form).toContainText("Für Skill: SQL-Abfragen entwickeln");
  await expect(form.getByLabel("Titel", { exact: true })).toHaveValue("");
  await expect(form.locator('button[type="submit"]:visible')).toHaveCount(1);
  await proof(page, info, "task-origin");
  await form.getByRole("link", { name: "Abbrechen" }).click();
  await expect(page).toHaveURL(new RegExp(`/skills/${id}$`));
  await page.goto(origin);
  await form
    .getByLabel("Titel", { exact: true })
    .fill("Happy path explicit title");
  await form.getByRole("button", { name: "Übungsaufgabe erstellen" }).click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]+\?skill=/);
  const happyId = new URL(page.url()).pathname.split("/").at(-1)!;
  const recovery = page.getByRole("region", { name: "Skill-Verbindung" });
  await expect(recovery).toContainText(
    "Aufgabe erstellt und mit Skill verbunden.",
  );
  await page.reload();
  await expect(recovery).toContainText(
    "Aufgabe erstellt und mit Skill verbunden.",
  );
  await page.goto(`/skills/${id}`);
  await expect(
    page.getByRole("region", { name: "Üben & Anwenden" }),
  ).toContainText("Happy path explicit title");
  await page.goto(`/tasks/${happyId}`);
  await page
    .getByRole("button", { name: "Mehr verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Status verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Task abschließen", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task abgeschlossen." }).first(),
  ).toBeVisible();
  await page.goto(`/skills/${id}`);
  await expect(
    page.getByRole("complementary", { name: "Beobachtungen" }),
  ).toContainText("Zuletzt geübt");
  expect(
    (await api.rpc("skill_development_read", { p_skill_id: id })).data.evidence,
  ).toHaveLength(0);
  await page.goto(origin);
  await form
    .getByLabel("Titel", { exact: true })
    .fill("Opt out explicit title");
  await form.getByLabel("Ohne Skill-Verbindung erstellen").check();
  await expect(
    form.getByRole("button", { name: "Aufgabe erstellen", exact: true }),
  ).toBeVisible();
  await form
    .getByRole("button", { name: "Aufgabe erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]+$/);
  const optId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(
    (await api.from("task_skill_links").select().eq("task_id", optId)).data,
  ).toHaveLength(0);
  await page.goto(origin);
  let posts = 0;
  await page.route("**/tasks/**", async (route) => {
    if (route.request().method() === "POST" && ++posts === 2) {
      await api
        .rpc("skill_development_command", {
          p_skill_id: id,
          p_command_id: crypto.randomUUID(),
          p_expected_revision: 0,
          p_operation: "skill.archive",
          p_payload: {},
        })
        .throwOnError();
      await route.continue();
    } else await route.continue();
  });
  await form
    .getByLabel("Titel", { exact: true })
    .fill("Known Create link failure");
  await form.getByRole("button", { name: "Übungsaufgabe erstellen" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Aufgabe erstellt. Verbindung zum Skill nicht hergestellt.",
    }),
  ).toBeVisible();
  await api
    .rpc("skill_development_command", {
      p_skill_id: id,
      p_command_id: crypto.randomUUID(),
      p_expected_revision: 1,
      p_operation: "skill.restore",
      p_payload: {},
    })
    .throwOnError();
  await api
    .rpc("skill_development_command", {
      p_skill_id: id,
      p_command_id: crypto.randomUUID(),
      p_expected_revision: 2,
      p_operation: "skill.edit",
      p_payload: { name: "SQL-Abfragen entwickeln", status: "active" },
    })
    .throwOnError();
  const partialId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(posts).toBe(2);
  await page.unroute("**/tasks/**");
  await page.reload();
  await expect(
    recovery.getByRole("button", { name: "Verbindung erneut versuchen" }),
  ).toBeVisible();
  await proof(page, info, "link-failure");
  await recovery
    .getByRole("button", { name: "Verbindung erneut versuchen" })
    .click();
  await expect(recovery).toContainText(
    "Aufgabe erstellt und mit Skill verbunden.",
  );
  await page.reload();
  await expect(recovery.getByRole("button")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe(`/tasks/${partialId}`);
  expect(
    (
      await api
        .from("tasks")
        .select("id")
        .eq("title", "Known Create link failure")
    ).data,
  ).toEqual([{ id: partialId }]);
  await page.goto(origin);
  let ambiguousPosts = 0;
  await page.route("**/tasks/new?skill=*", async (route) => {
    if (route.request().method() === "POST") {
      ambiguousPosts++;
      const response = await route.fetch();
      const task = (
        await api
          .from("tasks")
          .select("id")
          .eq("title", "Ambiguous result no title dedupe")
          .single()
          .throwOnError()
      ).data!;
      await route.fulfill({
        response,
        body: (await response.text()).replaceAll(task.id, ""),
      });
    } else await route.continue();
  });
  await form
    .getByLabel("Titel", { exact: true })
    .fill("Ambiguous result no title dedupe");
  await form.getByRole("button", { name: "Übungsaufgabe erstellen" }).click();
  await expect(form.getByRole("alert")).toHaveText(
    "Speicherergebnis unklar — Aufgaben prüfen",
  );
  await expect(
    form.getByRole("button", { name: "Übungsaufgabe erstellen" }),
  ).toBeDisabled();
  expect(ambiguousPosts).toBe(1);
  expect(
    (
      await api
        .from("tasks")
        .select("id")
        .eq("title", "Ambiguous result no title dedupe")
    ).data,
  ).toHaveLength(1);
  await page.unroute("**/tasks/new?skill=*");
  await form.getByRole("link", { name: "Aufgaben prüfen" }).click();
  const second = await browser.newContext();
  const foreign = await second.newPage();
  await signUpTechnicalManualUser(foreign, "skill-foreign", Date.now());
  await foreign.goto(origin);
  await expect(foreign.locator("main").getByRole("alert")).toContainText(
    "nicht verfügbar",
  );
  await expect(
    foreign.getByRole("form", { name: "Task erstellen" }),
  ).toHaveCount(0);
  await expect(foreign.locator("main")).not.toContainText(
    "SQL-Abfragen entwickeln",
  );
  const b = await sessionApi(foreign);
  expect(
    (
      await b.from("task_skill_links").insert({
        user_id: (await b.auth.getUser()).data.user!.id,
        skill_id: id,
        task_id: happyId,
      })
    ).error,
  ).not.toBeNull();
  await second.close();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(origin);
  await expect(guest.getByRole("form", { name: "Task erstellen" })).toHaveCount(
    0,
  );
  await expect(guest.locator("main")).not.toContainText(
    "SQL-Abfragen entwickeln",
  );
  await expect(guest.locator("main")).toContainText("eine lokale Anmeldung");
  await guestContext.close();
  for (const forged of ["forged", "", `${id}&skill=forged`]) {
    await page.goto(`/tasks/new?skill=${forged}`);
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "nicht verfügbar",
    );
    await expect(form).toHaveCount(0);
  }
  await api
    .rpc("skill_development_command", {
      p_skill_id: id,
      p_command_id: crypto.randomUUID(),
      p_expected_revision: 3,
      p_operation: "skill.archive",
      p_payload: {},
    })
    .throwOnError();
  await page.goto(origin);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "archiviert",
  );
  await expect(form).toHaveCount(0);
});
