import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
async function browserClient(page: Page) {
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Disposable only");
  const cookie = (await page.context().cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  return api;
}
const route = {
  Task: "tasks",
  Project: "projects",
  Goal: "goals",
  Skill: "skills",
  Resource: "resources",
};
type Kind = keyof typeof route;
async function save(page: Page, kind: Kind) {
  const form = page.getByRole("form", {
    name: `${kind} bearbeiten`,
    exact: true,
  });
  await form.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /gespeichert|aktualisiert/ })
      .last(),
  ).toBeVisible();
}
async function create(
  page: Page,
  kind: Kind,
  title: string,
  project?: string,
  goal?: string,
) {
  await page.goto(`/${route[kind]}/new`);
  const form = page.getByRole("form", {
    name: `${kind} erstellen`,
    exact: true,
  });
  await form
    .getByLabel(kind === "Skill" ? "Name" : "Titel", { exact: true })
    .fill(title);
  await form.getByLabel("Beschreibung / Kontext").fill(`Context ${title}`);
  if (kind === "Task") {
    await form.getByLabel("Next Action").fill("Read source");
    await form.getByLabel("Duration (min)").fill("45");
    await form.getByLabel("Priority", { exact: true }).selectOption("P1");
    await form.getByLabel("Energy", { exact: true }).selectOption("high");
    await form.getByLabel("Deadline", { exact: true }).fill("2026-10-01");
    await form.getByLabel("Geplantes Datum").fill("2026-09-08");
  }
  if (kind === "Project")
    await form.getByLabel("Next Step").fill("First real step");
  if (kind === "Goal")
    await form
      .getByLabel("Desired Outcome / Warum")
      .fill("A meaningful outcome");
  if (kind === "Resource") {
    await form.getByLabel("Typ", { exact: true }).selectOption("link");
    await form
      .getByLabel("URL", { exact: true })
      .fill("https://example.com/reference");
  }
  if (kind === "Goal") {
    await form.getByLabel("Horizon", { exact: true }).selectOption("quarter");
    await form.getByLabel("Target Date").fill("2027-01-02");
  }
  if (kind === "Project") {
    await form.getByLabel("Priority", { exact: true }).selectOption("P1");
    await form.getByLabel("Deadline", { exact: true }).fill("2027-05-01");
  }
  if (kind === "Skill") await form.getByLabel("Kategorie").fill("Research");
  if (project)
    await form.getByLabel("Project", { exact: true }).selectOption(project);
  if (goal) await form.getByLabel("Direktes Goal").selectOption(goal);
  await form
    .getByRole("button", { name: `${kind} erstellen`, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${route[kind]}/[0-9a-f-]{36}$`));
  const id = page.url().split("/").at(-1)!;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const edit = page.getByRole("form", {
    name: `${kind} bearbeiten`,
    exact: true,
  });
  await expect(edit.getByLabel("Beschreibung / Kontext")).toHaveValue(
    `Context ${title}`,
  );
  if (kind === "Task") {
    await expect(edit.getByLabel("Priority", { exact: true })).toHaveValue(
      "P1",
    );
    await expect(edit.getByLabel("Energy", { exact: true })).toHaveValue(
      "high",
    );
    await expect(edit.getByLabel("Duration (min)")).toHaveValue("45");
    await expect(edit.getByLabel("Deadline", { exact: true })).toHaveValue(
      "2026-10-01",
    );
    await expect(edit.getByLabel("Geplantes Datum")).toHaveValue("2026-09-08");
    await expect(edit.getByLabel("Next Action")).toHaveValue("Read source");
  }
  if (kind === "Resource")
    await expect(edit.getByLabel("URL", { exact: true })).toHaveValue(
      "https://example.com/reference",
    );
  if (kind === "Project")
    await expect(edit.getByLabel("Deadline", { exact: true })).toHaveValue(
      "2027-05-01",
    );
  if (kind === "Goal")
    await expect(edit.getByLabel("Target Date")).toHaveValue("2027-01-02");
  await edit.getByLabel("Beschreibung / Kontext").fill(`Updated ${title}`);
  await save(page, kind);
  await page.reload();
  await expect(edit.getByLabel("Beschreibung / Kontext")).toHaveValue(
    `Updated ${title}`,
  );
  await edit.getByLabel("Beschreibung / Kontext").fill("");
  await save(page, kind);
  await page.reload();
  await expect(edit.getByLabel("Beschreibung / Kontext")).toHaveValue("");
  if (kind === "Task")
    await expect(edit.getByLabel("Next Action")).toHaveValue("Read source");
  await edit.getByLabel("Beschreibung / Kontext").fill(`Updated ${title}`);
  await save(page, kind);
  await page.reload();
  return id;
}
async function operate(
  page: Page,
  label: string,
  choose?: { label: string; id: string },
) {
  const f = page.getByRole("form", { name: label, exact: true });
  if (choose)
    await f.getByLabel(choose.label, { exact: true }).selectOption(choose.id);
  await f.getByRole("button", { name: label, exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({
        hasText:
          /gespeichert|verknüpft|gelöst|entfernt|hinzugefügt|abgeschlossen|geöffnet|aktualisiert|Evidence/,
      })
      .last(),
  ).toBeVisible();
  await page.reload();
}

test("R2-04 all canonical creates, detail edits, relations, steps, lists, lifecycle and viewport proof", async ({
  page,
}, info) => {
  test.setTimeout(420000);
  page.setDefaultTimeout(15000);
  await signUpTechnicalManualUser(page, "r204", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors.push(m.text());
      console.log("BROWSER ERROR", m.text());
    }
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  console.log("CREATE ALL ENTITY TYPES");
  const goal = await create(page, "Goal", `Goal ${stamp}`);
  const project = await create(
    page,
    "Project",
    `Project ${stamp}`,
    undefined,
    goal,
  );
  const skill = await create(page, "Skill", `Skill ${stamp}`);
  const resource = await create(page, "Resource", `Resource ${stamp}`);
  const task = await create(page, "Task", `Task ${stamp}`, project, goal);
  await operate(page, "Resource verknüpfen", {
    label: "Resource",
    id: resource,
  });
  await expect(
    page
      .getByRole("region", { name: "Beziehungen" })
      .getByRole("link", { name: new RegExp(`Resource ${stamp}`) }),
  ).toBeVisible();
  await operate(page, "Practice verknüpfen", { label: "Skill", id: skill });
  await expect(
    page.getByRole("link", { name: `Skill ${stamp} · Practice` }),
  ).toBeVisible();
  const add = page.getByRole("form", { name: "Schritt hinzufügen" });
  await add.getByLabel("Neuer Arbeitsschritt").fill("Read source material");
  await operate(page, "Schritt hinzufügen");
  await expect(
    page.getByRole("region", { name: "Arbeitsschritte" }),
  ).toContainText("0 / 1 Schritte erledigt · 0 %");
  const step = page.getByRole("form", { name: "Schritt speichern" });
  await step.getByLabel("Erledigt", { exact: true }).check();
  await operate(page, "Schritt speichern");
  await expect(
    page.getByRole("region", { name: "Arbeitsschritte" }),
  ).toContainText("1 / 1 Schritte erledigt · 100 %");
  await step.getByLabel("Erledigt", { exact: true }).uncheck();
  await operate(page, "Schritt speichern");
  await expect(
    page.getByRole("region", { name: "Arbeitsschritte" }),
  ).toContainText("0 / 1");
  await operate(page, "Schritt entfernen");
  await expect(
    page.getByRole("region", { name: "Arbeitsschritte" }),
  ).toContainText("0 / 0");
  await operate(page, "Practice-Verknüpfung lösen");
  await expect(
    page.getByRole("link", { name: `Skill ${stamp} · Practice` }),
  ).toHaveCount(0);
  await operate(page, "Resource-Verknüpfung lösen");
  await expect(
    page
      .getByRole("region", { name: "Beziehungen" })
      .getByRole("link", { name: new RegExp(`Resource ${stamp}`) }),
  ).toHaveCount(0);
  await operate(page, "Task abschließen");
  await expect(
    page.getByRole("button", { name: "Task wieder öffnen", exact: true }),
  ).toBeVisible();
  await operate(page, "Task wieder öffnen");
  for (const [kind, id] of [
    ["Project", project],
    ["Goal", goal],
    ["Skill", skill],
  ] as const) {
    await page.goto(`/${route[kind]}/${id}`);
    await operate(page, "Resource verknüpfen", {
      label: "Resource",
      id: resource,
    });
    await expect(
      page.getByRole("region", { name: "Beziehungen" }),
    ).toContainText(`Resource ${stamp}`);
    await operate(page, "Resource-Verknüpfung lösen");
  }
  await page.goto(`/skills/${skill}`);
  const evidence = page.getByRole("form", { name: "Evidence hinzufügen" });
  await evidence.getByLabel("Evidence-Quelle").selectOption(`task:${task}`);
  await evidence.getByLabel("Titel", { exact: true }).fill("Applied practice");
  await evidence.getByLabel("Datum").fill("2026-09-06");
  await evidence
    .getByLabel("Evidence / Kontext")
    .fill("Source-backed observation");
  await operate(page, "Evidence hinzufügen");
  await expect(
    page.getByRole("region", { name: "Practice & Evidence" }),
  ).toContainText("Applied practice");
  await page.getByRole("link", { name: "Quelle öffnen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task}$`));
  await page.goto(`/projects/${project}`);
  await operate(page, "Task-Zuordnung lösen");
  await operate(page, "Task zuordnen", { label: "Task", id: task });
  await page.goto(`/goals/${goal}`);
  await operate(page, "Task-Zuordnung lösen");
  await operate(page, "Task zuordnen", { label: "Task", id: task });
  await operate(page, "Project-Zuordnung lösen");
  await operate(page, "Project zuordnen", { label: "Project", id: project });
  console.log("RESOURCE RELATIONS");
  await page.goto(`/resources/${resource}`);
  await page.getByText("Task verknüpfen", { exact: true }).first().click();
  await operate(page, "Task verknüpfen", { label: "Task", id: task });
  await expect(page.getByRole("region", { name: "Beziehungen" })).toContainText(
    `Task ${stamp}`,
  );
  await operate(page, "Resource-Verknüpfung lösen");
  for (const [kind, id] of [
    ["Task", task],
    ["Project", project],
    ["Goal", goal],
    ["Skill", skill],
  ] as const) {
    await page.goto(`/${route[kind]}`);
    await page.getByLabel("Suche", { exact: true }).fill(`${kind} ${stamp}`);
    await page.getByRole("button", { name: "Anwenden" }).click();
    await page
      .getByRole("region", { name: "Entity-Liste" })
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(new RegExp(`/${route[kind]}/${id}$`));
  }
  await page.goto(`/portfolio?selected=${task}&view=tasks`);
  const portfolioControls = page.getByRole("region", {
    name: "Portfolio view, scope and sort controls",
  });
  const controls = await portfolioControls
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((l) => ({
        text: l.textContent!.trim(),
        href: l.getAttribute("href")!,
      })),
    );
  for (const control of controls) {
    await page.goto(`/portfolio?selected=${task}&view=tasks`);
    await portfolioControls
      .locator(`a[href="${control.href}"]`)
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(control.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
    );
  }
  for (const kind of [
    "Task",
    "Project",
    "Goal",
    "Skill",
    "Resource",
  ] as const) {
    await page.goto("/portfolio");
    await page
      .getByRole("navigation", { name: "Entity erstellen" })
      .getByRole("link", { name: `${kind} erstellen`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${route[kind]}/new$`));
    await expect(
      page.getByRole("form", { name: `${kind} erstellen`, exact: true }),
    ).toBeVisible({ timeout: 15000 });
  }
  await page.goto(`/portfolio?selected=${task}&view=tasks`);
  await expect(page.getByText("Typ wählen", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Details öffnen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task}$`));
  console.log("RESPONSIVE SCREENSHOTS");
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const path of [
      "/portfolio",
      "/tasks/new",
      "/projects/new",
      "/goals/new",
      "/skills/new",
      "/resources/new",
      `/tasks/${task}`,
      `/projects/${project}`,
      `/goals/${goal}`,
      `/skills/${skill}`,
      `/resources/${resource}`,
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(size.width + 1);
      const geometry = await page.evaluate(() => {
        const primary = document.querySelector('[aria-label="Informationen bearbeiten"]') ?? document.querySelector('[aria-labelledby="active-portfolio-heading"]');
        const rail = document.querySelector('[data-entity-workbench] aside') ?? document.querySelector('[aria-label="Selected Entity"]');
        if (!primary || !rail) return null;
        const a = primary.getBoundingClientRect();
        const b = rail.getBoundingClientRect();
        return { separated: a.right <= b.left + 1 || a.bottom <= b.top + 1, railRight: b.right };
      });
      if (geometry) {
        expect(geometry.separated).toBe(true);
        expect(geometry.railRight).toBeLessThanOrEqual(size.width + 1);
      }
      await page.screenshot({
        path: info.outputPath(`${path.replaceAll("/", "-")}-${size.width}.png`),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/skills/${skill}`);
  await operate(page, "Evidence entfernen");
  await page.reload();
  await expect(page.getByRole("region", { name: "Practice & Evidence" }).getByText("Applied practice", { exact: true })).toHaveCount(0);
  const api = await browserClient(page);
  const own = (await api.auth.getUser()).data.user!.id;
  const outsider = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  await outsider.auth.signUp({
    email: `r204-outsider-${stamp}@example.local`,
    password: `R204-password-${stamp}`,
  });
  const foreign = (await outsider.auth.getUser()).data.user!.id;
  expect(
    (await outsider.from("tasks").select("id").eq("id", task)).data,
  ).toEqual([]);
  expect(
    (
      await outsider
        .from("task_steps")
        .insert({ user_id: foreign, task_id: task, title: "Forbidden" })
    ).error,
  ).not.toBeNull();
  const alien = await outsider
    .from("tasks")
    .insert({ user_id: foreign, title: "Private task" })
    .select("id")
    .single();
  expect(alien.error).toBeNull();
  expect(
    (
      await api
        .from("task_steps")
        .insert({ user_id: own, task_id: alien.data!.id, title: "Forbidden" })
    ).error,
  ).not.toBeNull();
  await page.goto(`/tasks/${alien.data!.id}`);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  for (const [kind, id] of [
    ["Task", task],
    ["Project", project],
    ["Goal", goal],
    ["Skill", skill],
    ["Resource", resource],
  ] as const) {
    await page.goto(`/${route[kind]}/${id}`);
    await page
      .getByRole("button", { name: `${kind} archivieren`, exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /archiviert|Status gespeichert/ })
        .last(),
    ).toBeVisible();
    expect(
      (
        await api
          .from(route[kind] as "tasks")
          .select("archived_at")
          .eq("id", id)
          .single()
      ).data?.archived_at,
    ).not.toBeNull();
    await expect(
      page.getByText("Archiviert · historische Ansicht"),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Änderungen speichern" }),
    ).toBeDisabled();
  }
  for (const [kind, id] of [["Task", task], ["Project", project], ["Goal", goal], ["Skill", skill]] as const) {
    await page.goto(`/${route[kind]}`);
    await page.getByRole("combobox", { name: "Lifecycle" }).selectOption("archived");
    await page.getByRole("combobox", { name: "Sortierung" }).selectOption("title");
    await page.getByRole("button", { name: "Anwenden" }).click();
    await expect(page.getByRole("region", { name: "Entity-Liste" }).locator(`a[href="/${route[kind]}/${id}"]`)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Lifecycle" })).toHaveValue("archived");
  }
  await page.goto(`/resources/${resource}`);
  await page.getByRole("button", { name: "Resource wiederherstellen" }).click();
  await expect(
    page.getByRole("button", { name: "Änderungen speichern" }),
  ).toBeEnabled();
  expect(errors.filter((e) => !e.includes("404 (Not Found)"))).toEqual([]);
});

test("R2-04 Inbox routing creates exactly one existing Task and Project detail", async ({
  page,
}) => {
  test.setTimeout(180000);
  await signUpTechnicalManualUser(page, "r204-inbox", Date.now());
  const api = await browserClient(page);
  for (const [label, table] of [
    ["Standalone Task", "tasks"],
    ["New Project", "projects"],
  ] as const) {
    const title = `R204 capture ${table} ${Date.now()}`;
    await page.goto("/dashboard");
    const quick = page.locator('[aria-labelledby="quick-thought-title"]');
    await quick.getByLabel("Quick Thought", { exact: true }).fill(title);
    await quick.getByRole("button", { name: "In Inbox speichern" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /gespeichert|aktualisiert/i }),
    ).toBeVisible();
    await page.goto("/inbox");
    await page
      .getByRole("region", { name: "Inbox Queue" })
      .getByRole("button")
      .filter({ hasText: title })
      .click();
    const item = new URL(page.url()).searchParams.get("item")!;
    await page
      .getByLabel("Description / Context")
      .fill("Captured detail context");
    await page
      .getByRole("region", { name: "Outcome Route", exact: true })
      .getByRole("button", { name: label, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Einordnen & abschließen", exact: true })
      .click();
    await expect(page.getByLabel("Letztes Routing")).toBeVisible();
    const rows = await api
      .from(table)
      .select("id,description")
      .eq("title", title);
    expect(rows.data).toHaveLength(1);
    expect(rows.data![0].description).toContain("Captured detail context");
    expect(
      (await api.from("inbox_items").select("status").eq("id", item).single())
        .data!.status,
    ).not.toBe("raw");
    await page
      .getByLabel("Letztes Routing")
      .getByRole("link", { name: "Ziel öffnen" })
      .click();
    await page
      .getByRole("link", { name: "Details öffnen", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${table}/${rows.data![0].id}$`));
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Beschreibung / Kontext")).toHaveValue(
      "Captured detail context",
    );
    expect(
      (await api.from(table).select("id").eq("title", title)).data,
    ).toHaveLength(1);
  }
});

test("R2-04 empty/auth boundary, validation conflict and navigation history", async ({
  page,
}) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page
    .context()
    .addCookies([
      {
        name: "life_os_profile",
        value: "empty",
        url: process.env.PLAYWRIGHT_HOST
          ? `http://${process.env.PLAYWRIGHT_HOST}:${process.env.PLAYWRIGHT_PORT}`
          : "http://127.0.0.1:3000",
      },
    ]);
  await page.goto("/tasks/new");
  await expect(
    page.getByRole("button", { name: "Task erstellen", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Manual-Profil");
  await signUpTechnicalManualUser(page, "r204-validation", Date.now());
  await page.goto("/tasks");
  await expect(
    page.getByRole("region", { name: "Entity-Liste" }),
  ).toContainText("Keine passenden Einträge");
  const stamp = Date.now();
  const goal1 = await create(page, "Goal", `Aligned ${stamp}`);
  const goal2 = await create(page, "Goal", `Different ${stamp}`);
  const project = await create(
    page,
    "Project",
    `Context ${stamp}`,
    undefined,
    goal1,
  );
  await page.goto("/tasks/new");
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/new$/);
  await form
    .getByLabel("Titel", { exact: true })
    .fill(`Invalid relation ${stamp}`);
  await form.getByLabel("Project", { exact: true }).selectOption(project);
  await form.getByLabel("Direktes Goal").selectOption(goal2);
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText(/widerspricht/);
  const api = await browserClient(page);
  expect(
    (
      await api
        .from("tasks")
        .select("id")
        .eq("title", `Invalid relation ${stamp}`)
    ).data,
  ).toHaveLength(0);
  await form.getByLabel("Direktes Goal").selectOption(goal1);
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  const url = page.url();
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Tasks", exact: true })
    .click();
  await expect(page).toHaveURL(/\/portfolio\?type=tasks$/);
  await page.goBack();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("heading", {
      name: `Invalid relation ${stamp}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/portfolio\?type=tasks$/);
  const portfolioList = page.getByRole("region", { name: "Active Portfolio", exact: true });
  await expect(portfolioList.locator('[data-entity-type="task"]')).toHaveCount(1);
  await page.reload();
  await expect(portfolioList.locator('[data-entity-type="task"]')).toHaveCount(1);
});
