import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const manualProfilePath = join(
  process.cwd(),
  ".local",
  "life-os",
  "manual-profile.json",
);
const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

type ProfileId = "demo" | "empty" | "manual";

type StoredCookie = {
  domain?: string;
  expires?: number;
  httpOnly?: boolean;
  name: string;
  path?: string;
  sameSite?: "Strict" | "Lax" | "None";
  secure?: boolean;
  url?: string;
  value: string;
};

async function applySupabaseAuthState(page: Page) {
  const storageStatePath = process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE;

  if (!storageStatePath) return false;

  const storageState = JSON.parse(await readFile(storageStatePath, "utf8")) as {
    cookies?: StoredCookie[];
  };

  if (storageState.cookies?.length) {
    await page.context().addCookies(storageState.cookies);
  }

  return true;
}

async function readProfileDataTaskCount(page: Page) {
  await page.goto("/settings");

  const profileDataPanel = page
    .getByText("Profile Data Source")
    .locator("xpath=ancestor::section[1]");
  const taskCount = profileDataPanel
    .locator("dt")
    .filter({ hasText: "Tasks" })
    .locator("xpath=following-sibling::dd[1]");
  const countText = (await taskCount.textContent())?.trim() ?? "";

  return Number(countText);
}

async function captureAndTriageManualInboxTask(
  page: Page,
  title: string,
  note: string,
) {
  await setProfile(page, "manual");
  await applySupabaseAuthState(page);
  await expectNoHydrationErrors(page, async () => {
    await page.goto("/inbox");
  });
  await skipIfManualDbUnavailable(page);
  await page
    .getByRole("textbox", { exact: true, name: "Quick Capture" })
    .fill(title);
  await page.getByRole("textbox", { name: "Quick Capture note" }).fill(note);
  await page.getByRole("button", { name: "Capture" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(title).first()).toBeVisible();
  await page.getByRole("button", { name: /Standalone Task/ }).click();
  await expect(page.getByRole("heading", { name: "Task Draft" })).toBeVisible();
  await page
    .getByRole("button", { exact: true, name: "Task erstellen" })
    .click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Task erstellt").first()).toBeVisible();
}

async function skipIfManualDbUnavailable(page: Page) {
  const quickCapture = page.getByRole("textbox", {
    exact: true,
    name: "Quick Capture",
  });

  await expect(quickCapture).toBeVisible();

  if (!(await quickCapture.isEnabled())) {
    test.skip(
      true,
      "Requires a local authenticated Supabase Browser/Playwright session.",
    );
  }
}

async function captureManualInboxItem(page: Page, title: string, note: string) {
  await page
    .getByRole("textbox", { exact: true, name: "Quick Capture" })
    .fill(title);
  await page.getByRole("textbox", { name: "Quick Capture note" }).fill(note);
  await page.getByRole("button", { name: "Capture" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(title).first()).toBeVisible();
}

async function openAddToExistingDraft(page: Page) {
  const activeItem = page.locator('[data-inbox-section="active-item"]');

  await activeItem.locator('[data-outcome-route="add_to_existing"]').click();

  const addToExistingDraft = activeItem
    .getByRole("heading", { name: "Bestehendem Objekt zuordnen" })
    .locator("xpath=ancestor::section[1]");
  await expect(addToExistingDraft).toBeVisible();

  return addToExistingDraft;
}

async function selectFirstExistingProjectOrGoalTarget(
  addToExistingDraft: Locator,
) {
  for (const target of [
    { label: "Project", relationLabel: "Project" },
    { label: "Goal", relationLabel: "Goal" },
  ]) {
    await addToExistingDraft
      .getByRole("button", {
        name: new RegExp(`^${target.label} \\d+ DB-Ziel(?:e)?$`),
      })
      .click();

    const select = addToExistingDraft.getByLabel("Existing target");

    if (await select.isDisabled()) continue;

    const option = select.locator("option[value]:not([value=''])").first();
    const value = await option.getAttribute("value");
    const title = (await option.textContent())?.trim() ?? "";

    if (!value) continue;

    await select.selectOption(value);

    return {
      relationLabel: target.relationLabel,
      targetId: value,
      targetTitle: title,
    };
  }

  return null;
}

async function selectExistingProjectTargetByTitle(
  addToExistingDraft: Locator,
  targetTitle: string,
) {
  await addToExistingDraft
    .getByRole("button", { name: /^Project \d+ DB-Ziel(?:e)?$/ })
    .click();

  const select = addToExistingDraft.getByLabel("Existing target");
  await expect(select).toBeEnabled();

  const option = select
    .locator("option")
    .filter({ hasText: targetTitle })
    .first();
  const value = await option.getAttribute("value");

  expect(value).toBeTruthy();
  await select.selectOption(value ?? "");

  return value ?? "";
}

async function selectExistingGoalTargetByTitle(
  addToExistingDraft: Locator,
  targetTitle: string,
) {
  await addToExistingDraft
    .getByRole("button", { name: /^Goal \d+ DB-Ziel(?:e)?$/ })
    .click();

  const select = addToExistingDraft.getByLabel("Existing target");
  await expect(select).toBeEnabled();

  const option = select
    .locator("option")
    .filter({ hasText: targetTitle })
    .first();
  const value = await option.getAttribute("value");

  expect(value).toBeTruthy();
  await select.selectOption(value ?? "");

  return value ?? "";
}

async function openPortfolioTaskPlanningControls(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  await expect(page.getByText(title).first()).toBeVisible();
  await page
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .click();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);
}

async function clickPortfolioContextButton(page: Page, name: string) {
  const button = page
    .locator('[data-portfolio-section="context-panel"]')
    .getByRole("button", { exact: true, name })
    .first();

  await button.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await expect(button).toBeVisible();
  await button.focus();
  await expect(button).toBeFocused();
  await button.press("Enter");
}

async function openManualPortfolioWithDb(page: Page) {
  await setProfile(page, "manual");
  await applySupabaseAuthState(page);
  await expectNoHydrationErrors(page, async () => {
    await page.goto("/inbox");
  });
  await skipIfManualDbUnavailable(page);
  await page.goto("/portfolio");
}

async function createPortfolioProjectTarget(
  page: Page,
  title: string,
  description: string,
) {
  const form = page.locator('form[aria-label="Project erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Project-Titel").fill(title);
  await form.getByLabel("Beschreibung").fill(description);
  await form.getByRole("button", { name: "Project erstellen" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Project erstellt.").first()).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
}

async function createPortfolioGoalTarget(
  page: Page,
  title: string,
  description: string,
) {
  const form = page.locator('form[aria-label="Goal erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Goal-Titel").fill(title);
  await form.getByLabel("Beschreibung").fill(description);
  await form.getByRole("button", { name: "Goal erstellen" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Goal erstellt.").first()).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
}

async function createPortfolioTaskTarget(
  page: Page,
  title: string,
  nextAction: string,
  description: string,
) {
  const form = page.locator('form[aria-label="Task erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByLabel("Next Action").fill(nextAction);
  await form.getByLabel("Kontext").fill(description);
  await form.getByLabel("Priorität").selectOption("P2");
  await form.getByLabel("Energie").selectOption("medium");
  await form.getByLabel("Minuten").fill("25");
  await form.getByLabel("Heute planen").check();
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Task erstellt.").first()).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
}

async function createProjectWorkbenchTask(
  page: Page,
  title: string,
  nextAction: string,
  description: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Project Task erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByLabel("Next Action").fill(nextAction);
  await form.getByLabel("Kontext").fill(description);
  await form.getByLabel("Priorität").selectOption("P2");
  await form.getByLabel("Energie").selectOption("medium");
  await form.getByLabel("Minuten").fill("25");
  await form.getByLabel("Heute planen").check();
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Task erstellt.").first()).toBeVisible();
  await expect(contextPanel.getByText(title).first()).toBeVisible();
}

async function createGoalWorkbenchTask(
  page: Page,
  title: string,
  nextAction: string,
  description: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Goal Task erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByLabel("Next Action").fill(nextAction);
  await form.getByLabel("Kontext").fill(description);
  await form.getByLabel("Priorität").selectOption("P2");
  await form.getByLabel("Energie").selectOption("medium");
  await form.getByLabel("Minuten").fill("25");
  await form.getByLabel("Heute planen").check();
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Task erstellt.").first()).toBeVisible();
  await expect(contextPanel.getByText(title).first()).toBeVisible();
}

async function createGoalWorkbenchProject(
  page: Page,
  title: string,
  description: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Goal Project erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Project-Titel").fill(title);
  await form.getByLabel("Beschreibung").fill(description);
  await form.getByRole("button", { name: "Project erstellen" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Project erstellt.").first()).toBeVisible();
  await expect(contextPanel.getByText(title).first()).toBeVisible();
}

async function setProfile(page: Page, profile: ProfileId) {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: playwrightBaseUrl,
      value: profile,
    },
  ]);
}

async function resetManualProfileFile() {
  await rm(manualProfilePath, { force: true });
}

async function writeManualProfile(profile: Record<string, unknown>) {
  await mkdir(dirname(manualProfilePath), { recursive: true });
  await writeFile(
    manualProfilePath,
    `${JSON.stringify(
      {
        goals: [],
        habits: [],
        inboxItems: [],
        meals: [],
        mood: null,
        projects: [],
        tasks: [],
        updatedAt: new Date().toISOString(),
        version: 1,
        ...profile,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function manualHabit(index: number) {
  return {
    areaId: "health",
    createdAt: "2026-06-24T08:00:00.000Z",
    currentValue: 0,
    id: `habit-${index}`,
    label: `Manual Habit ${index}`,
    marker: `H`,
    stepValue: 1,
    targetValue: 1,
    total: 5,
    window: "Morning",
  };
}

function manualProject(index: number) {
  return {
    activity: [],
    areaId: "coding",
    deadline: "2026-06-24",
    description: `Manual Project ${index}`,
    focusThisWeek: true,
    id: `project-${index}`,
    milestoneIds: [],
    nextStep: `Move project ${index}`,
    notes: [],
    phase: "Manual",
    priority: "P1",
    progress: index * 10,
    status: "active",
    taskIds: [],
    title: `Manual Project ${index}`,
  };
}

function manualGoal(index: number) {
  return {
    areaId: "education",
    currentValue: "0 drafts",
    description: `Manual Goal ${index}`,
    horizon: "month",
    id: `goal-${index}`,
    linkedProjectIds: [],
    linkedTaskIds: [],
    measure: "Draft progress",
    milestoneIds: [],
    nextStep: `Move goal ${index}`,
    progress: index * 15,
    remaining: "1 draft",
    reviewNotes: [],
    status: "active",
    targetValue: "1 draft",
    title: `Manual Goal ${index}`,
    why: "Manual goal context.",
  };
}

function manualMeal(type: "Breakfast" | "Lunch" | "Dinner", index: number) {
  return {
    id: `meal-${type.toLowerCase()}`,
    kcal: `${480 + index * 40} kcal`,
    macros: [`P ${30 + index}g`, `C ${44 + index}g`, `F ${12 + index}g`],
    name: `Manual ${type}`,
    state: "planned",
    time: type === "Breakfast" ? "08:00" : type === "Lunch" ? "12:30" : "19:00",
    type,
    updatedAt: "2026-06-24T08:00:00.000Z",
  };
}

function manualTimedTask() {
  return {
    areaId: "work",
    date: "2026-06-24",
    description: "Manual timed dashboard task.",
    durationMinutes: 30,
    energy: "medium",
    evidence: [],
    id: "task-manual-2000-agenda-task",
    nextStep: "Open task detail.",
    priority: "P1",
    reviewNeeded: false,
    source: "Manual Local Profile",
    startTime: "20:00",
    status: "planned",
    timeline: [],
    title: "Manual 20:00 Agenda Task",
    type: "task",
  };
}

function manualTodayInboxItem() {
  return {
    age: "Local",
    areaId: "review",
    createdAt: "2026-06-24T08:30:00.000Z",
    id: "inbox-manual-today-capture",
    next: "Clarify the manual today capture.",
    note: "Manual inbox capture for Today.",
    stage: "raw",
    title: "Manual Today Inbox Capture",
    type: "note",
  };
}

async function expectOnlyProductContentStates(page: Page) {
  const states = await page
    .locator("[data-content-state]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-content-state")),
    );

  expect(states.length).toBeGreaterThan(10);
  expect(states).not.toContain("ready");
  expect(states).not.toContain("loading");
  expect(states).not.toContain("error");

  for (const state of states) {
    expect(["empty", "partial", "filled"]).toContain(state);
  }

  await expect(
    page.locator(
      '[data-content-state="ready"], [data-content-state="loading"], [data-content-state="error"]',
    ),
  ).toHaveCount(0);
}

async function expectWidgetContract(
  widget: ReturnType<Page["locator"]>,
  profile: ProfileId,
  capacity: string,
) {
  await expect(widget).toHaveAttribute("data-profile-id", profile);
  await expect(widget).toHaveAttribute(
    "data-content-state",
    /^(empty|partial|filled)$/,
  );
  await expect(widget).toHaveAttribute("data-item-count", /^\d+$/);
  await expect(widget).toHaveAttribute("data-capacity", capacity);
}

async function expectDashboardWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator(`header[data-profile-id="${profile}"]`),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Quick Thought" }),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Daily Control" }),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.getByRole("link", { name: "Open year timeline" }),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Mood" }),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Meals Today" }),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Today Agenda" }),
    profile,
    "9",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Habit Trackers" }),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Active Portfolio" }),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.getByRole("region", {
      name: "Anti-Rot Actions / Bad Habit Reset Row",
    }),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.getByRole("region", { name: "Challenges" }),
    profile,
    "3",
  );
}

const inboxBlockedDemoStrings = [
  "Data access setup question",
  "Article on calm dashboards",
  "Life OS MVP",
  "AI Agent Workflow",
  "Data model notes",
  "Calm dashboard article",
  "No inbox item selected",
  "No manual inbox entries yet",
  "No inbox item",
  "No local entry",
] as const;

async function expectInboxWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#inbox-page"), profile, "8");
  await expectWidgetContract(
    page.locator('[data-inbox-section="header-metrics"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-inbox-section="queue"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-inbox-section="active-item"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-inbox-section="ai-assistant"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-inbox-section="decision-checklist"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-inbox-section="related-context"]'),
    profile,
    "5",
  );
}

async function expectNoInboxDemoStrings(page: Page) {
  const mainText = await page.getByRole("main").innerText();

  for (const blocked of inboxBlockedDemoStrings) {
    expect(mainText, `inbox demo string visible: ${blocked}`).not.toContain(
      blocked,
    );
  }
}

const todayBlockedDemoStrings = [
  "Morning baseline checked",
  "Revise literature structure",
  "Supabase RLS setup question",
  "Command Center stays dashboard-only",
  "Life OS moved from routing to page design",
  "Daily Review panel opened",
  "Today Page V2",
  "Dashboard route link pass",
  "Dashboard V5 design direction",
  "Today concept correction",
  "Local profile day",
  "Noch keine lokalen Eintraege",
] as const;

async function expectTodayWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#today-page"), profile, "9");
  await expectWidgetContract(
    page.locator('[data-today-section="header"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="activity-stream"]'),
    profile,
    "9",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="today-planner"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="opening-review"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="delta-summary"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="decisions-artifacts"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="closing-review"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-today-section="carry-forward"]'),
    profile,
    "4",
  );
}

async function expectNoTodayDemoStrings(page: Page) {
  const mainText = await page.getByRole("main").innerText();

  for (const blocked of todayBlockedDemoStrings) {
    expect(mainText, `today demo string visible: ${blocked}`).not.toContain(
      blocked,
    );
  }
}

const calendarBlockedDemoStrings = [
  "Literature source deadline",
  "Deep Work: Masterarbeit",
  "Team Standup",
  "Task Block: Literaturstruktur",
  "Protein Bowl",
  "Hyperskill lesson",
] as const;

const portfolioBlockedDemoStrings = [
  "Life OS App",
  "Calendar page implementieren",
  "Portfolio page in Figma finalisieren",
  "Literature source deadline",
  "Masterarbeit",
  "Java / Hyperskill",
  "AI Agent Workflow",
] as const;

const resourcesBlockedDemoStrings = [
  "Literature Review Search Strategy",
  "Codex Prompt Pattern: Design to Implementation",
  "Figma Layout Rules for Life OS Pages",
  "Masterarbeit Argumentation Notes",
  "FI Work Notes: Meeting Patterns",
  "React Query Decision Note",
  "AI Agent Workflow Learnings",
  "local mock",
  "not wired",
  "No local entry",
] as const;

const educationOverviewBlockedDemoStrings = [
  "KI-Agenten als persönliche Produktivitätsassistenten",
  "Human-AI Interaction",
  "Personal Knowledge Management",
  "Wie kann Review-Pflicht Vertrauen in Agentenoutputs erhöhen?",
  "Human-AI Collaboration in Knowledge Work",
  "Designing Calm Technology",
  "3 Kernquellen lesen",
  "5 ideas",
  "6 fields",
] as const;

const scientificWorkBlockedDemoStrings = [
  "Masterarbeit: KI-gestützte persönliche Produktivitätssysteme",
  "Local profile state",
  "Wie kann Review-Pflicht Vertrauen und Kontrolle",
  "Forschungsfrage schärfen und 5 Kernquellen prüfen",
  "Forschungsfrage ist noch zu breit",
  "KI-Agenten als persönliche Produktivitätsassistenten",
  "Life OS als persönliches Wissens- und Steuerungssystem",
  "18%",
] as const;

const literatureBlockedDemoStrings = [
  "Personal Knowledge Management Revisited",
  "Self-Regulated Learning and Digital Tools",
  "Human-AI Collaboration in Knowledge Work",
  "Designing Calm Technology",
  "Privacy by Design in Personal Data Systems",
  "Mock sources",
  "5 sources",
] as const;

const learningLogBlockedDemoStrings = [
  "Java / Hyperskill",
  "Collections",
  "Hyperskill: Collections Practice",
  "Java Foundations",
  "41%",
  "3h 20m",
  "4 tracks",
  "5 practice items",
] as const;

async function expectNoMainStrings(
  page: Page,
  blockedStrings: readonly string[],
  scope: string,
) {
  const mainText = await page.getByRole("main").innerText();

  for (const blocked of blockedStrings) {
    expect(
      mainText,
      `${scope} blocked string visible: ${blocked}`,
    ).not.toContain(blocked);
  }
}

async function expectNoGenericPlannerRelationLabels(page: Page, scope: string) {
  const mainText = await page.getByRole("main").innerText();

  for (const blocked of [
    "Project + Goal linked",
    "Project linked",
    "Goal linked",
  ]) {
    expect(
      mainText,
      `${scope} generic relation label visible: ${blocked}`,
    ).not.toContain(blocked);
  }
}

async function expectCalendarWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-calendar-section="page"]'),
    profile,
    "16",
  );
  await expectWidgetContract(
    page.locator('[data-calendar-section="week-grid"]'),
    profile,
    "16",
  );
  await expectWidgetContract(
    page.locator('[data-calendar-section="inspector"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-calendar-section="planning-queue"]').first(),
    profile,
    "4",
  );
}

async function expectPortfolioWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#portfolio-page"), profile, "8");
  await expectWidgetContract(
    page.locator('[data-portfolio-section="entity-list"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-portfolio-section="context-panel"]'),
    profile,
    "1",
  );
}

async function expectResourcesWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#resources-page"), profile, "8");
  await expectWidgetContract(
    page.locator('[data-resources-section="summary"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-resources-section="relation-inspector"]'),
    profile,
    "1",
  );
}

const shopBlockedDemoStrings = [
  "42 LC",
  "18 LC",
  "10 LC",
  "30 min phone time",
  "1 CS match",
  "1 episode break",
  "60 min free time",
  "Coffee outside",
  "Deep recovery evening",
  "8 rewards",
  "3 suggestions",
  "Mock currency",
  "+0 LC",
] as const;

const challengesBlockedDemoStrings = [
  "Weekly Review completed",
  "10-minute walk",
  "Inbox zero attempt",
  "No phone during first focus block",
  "Read 20 pages",
  "Clean desk reset",
  "58 LC available",
  "12 LC",
  "4 LC",
  "6 LC",
  "5 LC",
  "No random loot",
  "No real money",
] as const;

async function expectShopWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#shop-page"), profile, "8");
  await expectWidgetContract(
    page.locator('[data-shop-section="reward-balance"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-shop-section="reward-shop"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-shop-section="recommended-rewards"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-shop-section="reward-rules"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-shop-section="earning-sources"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-shop-section="reward-history"]'),
    profile,
    "4",
  );
}

async function expectChallengesWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#challenges-page"), profile, "8");
  await expectWidgetContract(
    page.locator('[data-challenges-section="active-challenge-focus"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-challenges-section="challenge-board"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-challenges-section="challenge-rhythm"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-challenges-section="challenge-ideas"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-challenges-section="challenge-rules"]'),
    profile,
    "4",
  );
}

async function expectSettingsWidgetContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(page.locator("#settings-page"), profile, "6");
  await expectWidgetContract(
    page.locator('[data-settings-section="profile-settings"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-settings-section="appearance"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-settings-section="privacy"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-settings-section="app-preferences"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-settings-section="data-export"]'),
    profile,
    "2",
  );
  await expectWidgetContract(
    page.locator('[data-settings-section="system-info"]'),
    profile,
    "5",
  );
}

async function expectEducationOverviewContracts(
  page: Page,
  profile: ProfileId,
) {
  await expectWidgetContract(page.locator("#education-page"), profile, "8");
  await expectWidgetContract(
    page.locator('[data-education-section="summary"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-education-section="filters"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-education-section="current-research-focus"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-education-section="research-idea-pipeline"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-education-section="research-fields"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-education-section="literature-queue"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-education-section="recent-research-notes"]'),
    profile,
    "5",
  );
}

async function expectScientificWorkContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="search-filter"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="master-thesis-focus"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="research-ideas"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="research-questions"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="research-fields"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="scientific-work-papers"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-scientific-work-section="recent-research-notes"]'),
    profile,
    "5",
  );
}

async function expectLiteratureContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-literature-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-literature-section="search-filter"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-literature-section="literature-queue"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-literature-section="extraction-focus"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-literature-section="high-relevance-sources"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-literature-section="status-summary"]'),
    profile,
    "6",
  );
}

async function expectLearningLogContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-learning-log-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-learning-log-section="search-filter"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-learning-log-section="current-learning-focus"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-learning-log-section="weekly-rhythm"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-learning-log-section="track-summary"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-learning-log-section="active-tracks"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-learning-log-section="practice-queue"]'),
    profile,
    "5",
  );
}

const workOverviewBlockedDemoStrings = [
  "Schnittstellenverhalten nachvollzogen",
  "Validierungsschicht",
  "Architekturbeziehung zwischen Prüfung und Import klären",
  "Unklaren Prozessschritt im nächsten Termin fragen",
  "Wiki-Notiz zu Validierung ergänzen",
  "3 this week",
  "4 open",
  "6 linked",
  "2 unclear",
] as const;

const workLogBlockedDemoStrings = [
  "Schnittstellenverhalten nachvollzogen",
  "Testfall rekonstruiert",
  "Validierungsschicht im Wiki ergänzen",
  "4 activities logged this week",
  "2 follow-ups open",
  "3 wiki notes linked",
  "1 activity needs review",
] as const;

const workWikiBlockedDemoStrings = [
  "Testdaten prüfen: Vorgehen",
  "Review vor Änderung: Checkliste",
  "Begriff: Fachlicher Schlüssel",
  "Schnittstelle vs. Prozessschritt",
  "Validierungsschicht: Überblick",
  "Batch-Prozess: Grundidee",
  "Datenfluss: Eingabe → Prüfung → Verarbeitung",
  "3 pinned",
  "2 review",
  "6 results",
] as const;

async function expectWorkOverviewContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-work-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="search-filters"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="current-work-journal"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="quick-actions"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="open-follow-ups"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="work-signals"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="recent-work-log"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-work-section="architecture-snapshot"]'),
    profile,
    "4",
  );
}

async function expectWorkLogContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-work-log-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="search-filters"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="current-work-entry"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="quick-actions"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="open-follow-ups"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="task-context"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="activity-timeline"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="work-log-signals"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="recent-work-logs"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-work-log-section="linked-wiki-notes"]'),
    profile,
    "5",
  );
}

async function expectWorkWikiContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="search-filters"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="pinned-references"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="needs-review"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="wiki-lookup"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="architecture-notes"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-work-wiki-section="wiki-categories"]'),
    profile,
    "8",
  );
}

async function expectNoResourceKpiLeaks(page: Page) {
  const summary = page.locator('[data-resources-section="summary"]');

  for (const value of ["128", "12", "34", "9", "21", "46"]) {
    await expect(summary.getByText(value, { exact: true })).toHaveCount(0);
  }
}

const codingOverviewBlockedDemoStrings = [
  "Life OS Coding Area",
  "AI Agent Workflow",
  "Java / Hyperskill",
  "Repository-Detail-Inspector prüfen",
  "Repository-Detail-Inspector pruefen",
  "Codex output: Coding route draft",
  "Type-safe server actions",
  "Repository inspector sketch",
  "RLS policy pattern for user-owned rows",
] as const;

const codingRepositoryBlockedDemoStrings = [
  "anton/life-os-app",
  "anton/agent-prompts",
  "anton/java-training",
  "anton/supabase-sandbox",
  "anton/master-thesis-tools",
] as const;

const codingAgentBlockedDemoStrings = [
  "PREPARED ERROR STATE",
  "Prepared error state",
  "Future agent run failed",
  "Repository Workbench implementation diff",
  "Implement /coding repositories page",
] as const;

const codingSkillMapBlockedDemoStrings = [
  "React",
  "TypeScript Strictness",
  "Supabase",
  "Row Level Security",
  "PostgreSQL",
  "Playwright",
  "Code Review",
] as const;

async function expectNoHydrationErrors(
  page: Page,
  action: () => Promise<void>,
) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      errors.push(message.text());
    }
  });

  await action();

  expect(errors.join("\n")).not.toMatch(
    /hydration|did not match|Encountered two children with the same key/i,
  );
}

test.beforeEach(async () => {
  await resetManualProfileFile();
});

test.afterEach(async () => {
  await resetManualProfileFile();
});

test.describe("Coding content states", () => {
  for (const profile of ["empty", "manual"] as const) {
    test(`keeps coding overview state-proof for ${profile}`, async ({
      page,
    }) => {
      await setProfile(page, profile);
      await expectNoHydrationErrors(page, async () => {
        await page.goto("/coding");
      });

      await expect(
        page.getByRole("heading", { name: "Coding Overview" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Active Work" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Agent Queue" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Repositories requiring attention" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Recent Sessions" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Skill Focus" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Knowledge Updates" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Coding Rhythm" }),
      ).toBeVisible();
      await expectNoMainStrings(
        page,
        codingOverviewBlockedDemoStrings,
        "/coding",
      );
    });

    test(`keeps repositories workbench shell for ${profile}`, async ({
      page,
    }) => {
      await setProfile(page, profile);
      await expectNoHydrationErrors(page, async () => {
        await page.goto("/coding/repositories");
      });

      for (const heading of [
        "Repository List",
        "Attention Queue",
        "Selected Repository",
        "Linked Tasks",
        "Resource Map",
        "Repository Health",
        "Recent Repository Activity",
      ]) {
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("button", { name: "Sync GitHub" }),
      ).toBeDisabled();
      await expectNoMainStrings(
        page,
        codingRepositoryBlockedDemoStrings,
        "/coding/repositories",
      );
    });

    test(`hides prepared agent errors and fake runs for ${profile}`, async ({
      page,
    }) => {
      await setProfile(page, profile);
      await expectNoHydrationErrors(page, async () => {
        await page.goto("/coding/agents");
      });

      for (const heading of [
        "Agent Mission Control",
        "Review Queue",
        "Assignment Queue",
        "Worker Pool",
        "Recent Agent Sessions",
        "Prompt Library Snapshot",
        "Context Bundles",
      ]) {
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible();
      }
      await expectNoMainStrings(
        page,
        codingAgentBlockedDemoStrings,
        "/coding/agents",
      );
    });

    test(`keeps skill map workbench shell for ${profile}`, async ({ page }) => {
      await setProfile(page, profile);
      await expectNoHydrationErrors(page, async () => {
        await page.goto("/coding/skill-map");
      });

      for (const heading of [
        "Skill Network Map",
        "Selected Skill Inspector",
        "Project Skill Gaps",
        "Skill Gap Matrix",
        "Learning Recommendations",
        "Evidence Timeline",
      ]) {
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible();
      }
      await expectNoMainStrings(
        page,
        codingSkillMapBlockedDemoStrings,
        "/coding/skill-map",
      );
    });
  }
});

test.describe("Nutrition content states", () => {
  const nutritionBlockedDemoStrings = [
    "Protein Bowl",
    "Skyr",
    "Paprika",
    "3 missing ingredients",
    "-0.4 kg",
    "No planned meal open",
    "No intake logged today",
  ] as const;

  async function expectNoNutritionDemoStrings(page: Page) {
    await expectNoMainStrings(page, nutritionBlockedDemoStrings, "nutrition");
  }

  test("keeps demo nutrition routes as the curated reference", async ({
    page,
  }) => {
    await setProfile(page, "demo");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/nutrition");
    });
    await expect(page.locator("#nutrition-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(page.getByText("Protein Bowl").first()).toBeVisible();

    await page.goto("/nutrition/meal-planner");
    await expect(page.locator("#meal-planner-page")).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(page.getByText("15 / 21").first()).toBeVisible();

    await page.goto("/nutrition/recipes");
    await expect(page.locator("#recipes-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(
      page.getByText("Skyr with oats and berries").first(),
    ).toBeVisible();

    await page.goto("/nutrition/grocery");
    await expect(page.locator("#grocery-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(page.getByText("Oats").first()).toBeVisible();
  });

  test("renders empty nutrition overview without demo leaks", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/nutrition");
    });

    await expect(page.locator("#nutrition-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expectNoNutritionDemoStrings(page);
    await expect(
      page.getByRole("region", { name: "Today Nutrition" }),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByText("Keine offene Mahlzeit")).toBeVisible();
    await expect(page.getByText("Noch keine Prioritäten")).toBeVisible();
    await expect(page.getByText("Noch kein Gewichtstrend")).toBeVisible();
    await expect(page.getByText("Keine Einkaufssignale")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log meal" })).toBeDisabled();
  });

  test("renders empty meal planner, recipes and grocery shells", async ({
    page,
  }) => {
    await setProfile(page, "empty");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/nutrition/meal-planner");
    });
    await expect(page.locator("#meal-planner-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Zielprofil nicht gesetzt")).toBeVisible();
    await expect(page.getByText("0 / 21").first()).toBeVisible();
    await expect(page.getByText("Keine passenden Rezepte")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save week" }),
    ).toBeDisabled();

    await page.goto("/nutrition/recipes");
    await expect(page.locator("#recipes-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Noch keine Rezepte")).toBeVisible();
    await expect(page.getByText("Kein Rezept ausgewählt")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New recipe" }),
    ).toBeDisabled();

    await page.goto("/nutrition/grocery");
    await expect(page.locator("#grocery-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Keine Einkaufspunkte offen")).toBeVisible();
    await expect(page.getByText("Noch keine Vorräte erfasst")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copy shopping text" }),
    ).toBeDisabled();
  });

  test("projects manual nutrition meals without recipe or grocery demo fallback", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      meals: [
        {
          ...manualMeal("Breakfast", 1),
          state: "logged",
        },
        manualMeal("Lunch", 2),
      ],
    });

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/nutrition");
    });
    await expect(page.locator("#nutrition-page")).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expectNoNutritionDemoStrings(page);
    await expect(page.getByText("Manual Breakfast").first()).toBeVisible();
    await expect(page.getByText("Manual Lunch").first()).toBeVisible();
    await expect(
      page.getByText("Lokale Mahlzeiten sind sichtbar").first(),
    ).toBeVisible();

    await page.goto("/nutrition/meal-planner");
    await expect(page.locator("#meal-planner-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Keine passenden Rezepte")).toBeVisible();
  });
});

test.describe("Dashboard content states", () => {
  test.describe.configure({ mode: "serial" });

  test("keeps demo filled and profile-independent time progress", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });

    await expect(page.locator('header[data-profile-id="demo"]')).toBeVisible();
    await expect(page.locator("[data-profile]")).toHaveCount(0);
    await expectDashboardWidgetContracts(page, "demo");
    await expectOnlyProductContentStates(page);
    const contentStates = await page
      .locator("[data-content-state]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-content-state")),
      );
    expect(contentStates).toContain("filled");
    expect(contentStates).toContain("partial");
    await expect(
      page.getByText(/Good (morning|afternoon|evening), Anton/),
    ).toBeVisible();
    await expect(
      page.locator("header").getByText("Week").first(),
    ).toBeVisible();
    await expect(
      page.locator("header").getByText("Month").first(),
    ).toBeVisible();
    await expect(
      page.locator("header").getByText("Year").first(),
    ).toBeVisible();
    await expect(page.getByText("Life OS App").first()).toBeVisible();
  });

  test("renders empty dashboard without demo strings or collapsed fixed slots", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });
    await expectDashboardWidgetContracts(page, "empty");
    await expectOnlyProductContentStates(page);

    const bodyText = await page.locator("body").innerText();
    for (const blocked of [
      "Life OS App",
      "Masterarbeit",
      "Skyr with oats and berries",
      "Protein bowl with vegetables",
      "Manual local profile",
      "Empty profile",
      "not wired",
    ]) {
      expect(bodyText).not.toContain(blocked);
    }

    await expect(
      page.getByRole("link", { name: /Sleep: No data/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Tracke deinen Schlaf/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Review Status: No review/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Start Capturing/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Nutrition: No plan/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Create Plan/ })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Kein aktueller Fokus/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Create task/ })).toBeVisible();
    await expect(page.getByText("Keine Mahlzeit")).toHaveCount(3);
    await expect(
      page.getByRole("region", { name: "Meals Today" }),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByRole("region", { name: "Today Agenda" }),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByRole("region", { name: "Habit Trackers" }),
    ).toHaveAttribute("data-item-count", "0");
    await expect(
      page.getByRole("region", { name: "Active Portfolio" }),
    ).toHaveAttribute("data-item-count", "0");
  });

  test("keeps manual reset aligned with empty dashboard state", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });

    await expectDashboardWidgetContracts(page, "manual");
    await expectOnlyProductContentStates(page);
    await expect(page.getByText("Keine Mahlzeit")).toHaveCount(3);
    await expect(
      page.getByRole("region", { name: "Meals Today" }),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByRole("region", { name: "Today Agenda" }),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByRole("region", { name: "Habit Trackers" }),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByRole("region", { name: "Active Portfolio" }),
    ).toHaveAttribute("data-content-state", "empty");
  });

  test("captures a manual dashboard quick thought into the DB inbox", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const thought = `Manual dashboard quick thought ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });
    const quickThought = page.getByRole("region", { name: "Quick Thought" });
    await expect(quickThought.getByLabel("Inbox-Typ")).toHaveCount(0);
    await expect(
      quickThought.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
    await page.getByRole("textbox", { name: "Quick Thought" }).fill(thought);
    await page.getByRole("button", { name: "In Inbox speichern" }).click();
    await expect(page.getByText("In der Inbox gespeichert.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Inbox öffnen" }),
    ).toBeVisible();

    await page.goto("/inbox");
    await expect(page.getByText(thought).first()).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
  });

  test("projects a manual DB task into Today Agenda", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Dashboard DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Schedule this task for the Dashboard Today Agenda.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute terminieren");
    await page.waitForLoadState("networkidle");
    await page.goto("/dashboard");

    await expectOnlyProductContentStates(page);
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda).toHaveAttribute("data-content-state", "partial");
    await expect(todayAgenda.getByText(title).first()).toBeVisible();
  });

  test("reports habit and active portfolio capacity states", async ({
    page,
  }) => {
    await setProfile(page, "manual");

    await writeManualProfile({});
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });
    await expectOnlyProductContentStates(page);
    await expect(
      page.getByRole("region", { name: "Habit Trackers" }),
    ).toHaveAttribute("data-item-count", "0");
    await expect(
      page.getByRole("region", { name: "Active Portfolio" }),
    ).toHaveAttribute("data-item-count", "0");

    await writeManualProfile({
      habits: [manualHabit(1)],
      projects: [manualProject(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.reload();
    });
    await expectOnlyProductContentStates(page);
    await expect(
      page.getByRole("region", { name: "Habit Trackers" }),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.getByRole("region", { name: "Active Portfolio" }),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.getByRole("region", { name: "Meals Today" }),
    ).toHaveAttribute("data-content-state", "empty");

    await writeManualProfile({
      habits: Array.from({ length: 8 }, (_, index) => manualHabit(index + 1)),
      projects: Array.from({ length: 4 }, (_, index) =>
        manualProject(index + 1),
      ),
      meals: [
        manualMeal("Breakfast", 1),
        manualMeal("Lunch", 2),
        manualMeal("Dinner", 3),
      ],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.reload();
    });
    await expectOnlyProductContentStates(page);
    await expect(
      page.getByRole("region", { name: "Habit Trackers" }),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(
      page.getByRole("region", { name: "Active Portfolio" }),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(
      page.getByRole("region", { name: "Meals Today" }),
    ).toHaveAttribute("data-content-state", "filled");
  });
});

test.describe("Inbox content states", () => {
  test("keeps demo inbox filled with the V5 reference queue", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    await expectInboxWidgetContracts(page, "demo");
    await expect(page.locator("#inbox-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(page.locator('[data-inbox-section="queue"]')).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(
      page.getByText("Data access setup question").first(),
    ).toBeVisible();
    await expect(page.getByText("Life OS MVP").first()).toBeVisible();
  });

  test("renders empty inbox without demo strings", async ({ page }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    await expectInboxWidgetContracts(page, "empty");
    await expectNoInboxDemoStrings(page);
    await expect(page.locator("#inbox-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.locator('[data-inbox-section="queue"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(
      page.getByText("Inbox ist leer", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Capture Gedanken, Aufgaben oder Fragen, wenn sie entstehen.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { exact: true, name: "Quick Capture" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { exact: true, name: "Quick Capture" }),
    ).toBeDisabled();

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(activeItem).toHaveAttribute("data-content-state", "empty");
    await expect(
      activeItem.getByRole("heading", { name: "Kein Eintrag ausgewählt" }),
    ).toBeVisible();
    await expect(activeItem.getByText("Original Capture")).toHaveCount(0);

    const aiAssistant = page.locator('[data-inbox-section="ai-assistant"]');
    await expect(aiAssistant).toHaveAttribute("data-content-state", "empty");
    await expect(aiAssistant.getByText("—")).toHaveCount(4);
    await expect(
      aiAssistant.getByText("Vorschlagsschicht. Keine automatische Übernahme."),
    ).toBeVisible();

    const checklist = page.locator('[data-inbox-section="decision-checklist"]');
    await expect(checklist).toHaveAttribute("data-content-state", "empty");
    await expect(checklist.getByText("0 / 4 ready")).toBeVisible();
    await expect(checklist.getByText("done", { exact: true })).toHaveCount(0);

    const related = page.locator('[data-inbox-section="related-context"]');
    await expect(related).toHaveAttribute("data-content-state", "empty");
    await expect(related.getByText("Kein verwandter Kontext")).toBeVisible();
  });

  test("keeps manual reset empty with visible quick capture", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    await expectInboxWidgetContracts(page, "manual");
    await expectNoInboxDemoStrings(page);
    const inboxState = await page
      .locator("#inbox-page")
      .getAttribute("data-content-state");

    if (hasSupabaseAuth && inboxState !== "empty") {
      test.skip(
        true,
        "Manual DB contains persisted Inbox rows; empty-shell assertion requires a fresh Manual DB.",
      );
    }

    await expect(page.locator("#inbox-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(
      page.getByText("Inbox ist leer", { exact: true }),
    ).toBeVisible();
    const quickCapture = page.getByRole("textbox", {
      exact: true,
      name: "Quick Capture",
    });
    await expect(quickCapture).toBeVisible();

    if (hasSupabaseAuth && (await quickCapture.isEnabled())) {
      await expect(quickCapture).toBeEnabled();
    } else {
      await expect(quickCapture).toBeDisabled();
    }
  });

  test("renders the Inbox Outcome Router with connected and prepared routes", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(
      activeItem.getByRole("heading", { name: "Outcome Route" }),
    ).toBeVisible();
    await expect(
      activeItem.locator('[data-outcome-route="standalone_task"]'),
    ).toContainText("Status: Verbunden");
    await expect(
      activeItem.locator('[data-outcome-route="add_to_existing"]'),
    ).toContainText("Status: Teilweise verbunden");
    await expect(
      activeItem.locator('[data-outcome-route="knowledge_resource"]'),
    ).toContainText("Status: Verbunden");

    await expect(
      activeItem.locator('[data-outcome-route="create_new"]'),
    ).toContainText("Status: Noch nicht verbunden");

    await expect(
      activeItem.locator('[data-outcome-route="solved_archive"]'),
    ).toContainText("Status: Verbunden");
  });

  test("keeps the empty draft message inside the Draft Slot until a route is selected", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    const draftSlot = activeItem.locator('[data-inbox-section="draft-slot"]');
    const outcomeRoutes = activeItem.getByRole("heading", {
      name: "Outcome Route",
    });
    const planningSignals = activeItem.getByRole("heading", {
      name: "Planning Signals",
    });

    await expect(draftSlot).toBeVisible();
    await expect(
      draftSlot.getByText("Noch kein Draft ausgewählt"),
    ).toBeVisible();
    await expect(outcomeRoutes).toBeVisible();
    await expect(planningSignals).toBeVisible();

    const routeBox = await outcomeRoutes.boundingBox();
    const draftBox = await draftSlot.boundingBox();
    const planningBox = await planningSignals.boundingBox();
    expect(routeBox).not.toBeNull();
    expect(draftBox).not.toBeNull();
    expect(planningBox).not.toBeNull();
    expect(draftBox!.y).toBeGreaterThan(routeBox!.y);
    expect(planningBox!.y).toBeGreaterThan(draftBox!.y);
  });

  test("opens the connected Solved / Archive draft without target-object actions", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await activeItem.locator('[data-outcome-route="solved_archive"]').click();
    const closeDraft = activeItem
      .getByRole("heading", { name: "Solved / Archive Draft" })
      .locator("xpath=ancestor::section[1]");
    await expect(closeDraft).toBeVisible();
    await expect(
      closeDraft.getByText(
        "Kein Zielobjekt nötig. Dieses Capture wird aus der aktiven Inbox entfernt und archiviert.",
      ),
    ).toBeVisible();
    await expect(
      closeDraft.getByRole("button", { name: "Als erledigt archivieren" }),
    ).toBeDisabled();
    await expect(
      activeItem.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
    await expect(
      activeItem.getByRole("link", { name: "Portfolio öffnen" }),
    ).toHaveCount(0);
    await expect(
      activeItem.getByRole("heading", { name: "Resource Draft" }),
    ).toHaveCount(0);
    await expect(
      activeItem.getByRole("heading", { name: "Create New Draft" }),
    ).toHaveCount(0);
  });

  test("opens the Task Draft from the Standalone Task route", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await activeItem.getByRole("button", { name: /Standalone Task/ }).click();
    await expect(
      activeItem.getByRole("heading", { name: "Task Draft" }),
    ).toBeVisible();
    await expect(
      activeItem.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toBeVisible();
    await expect(
      page.getByText("Hinweise für spätere Planung.").first(),
    ).toBeVisible();
  });

  test("Add to Existing opens the Target Picker with scoped contribution states", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await activeItem.locator('[data-outcome-route="add_to_existing"]').click();
    const addToExistingDraft = activeItem
      .getByRole("heading", { name: "Bestehendem Objekt zuordnen" })
      .locator("xpath=ancestor::section[1]");
    await expect(addToExistingDraft).toBeVisible();
    await expect(
      addToExistingDraft.getByText("Beitrag: Ziel fehlt"),
    ).toBeVisible();
    await expect(
      activeItem.getByText("Noch kein Draft ausgewählt"),
    ).toHaveCount(0);
    await expect(
      addToExistingDraft.getByLabel("Existing target"),
    ).toBeDisabled();
    await expect(
      addToExistingDraft
        .locator("p")
        .filter({ hasText: "Noch keine bestehenden Projects vorhanden." }),
    ).toBeVisible();
    await expect(
      addToExistingDraft.getByRole("button", {
        name: "Task-Beitrag erstellen",
      }),
    ).toBeDisabled();
    await addToExistingDraft
      .getByRole("button", { name: "Resource Link" })
      .click();
    await expect(
      addToExistingDraft.getByText("Beitrag: Vorbereitet"),
    ).toBeVisible();
    await expect(
      addToExistingDraft.getByText("Resource Link vorbereitet"),
    ).toBeVisible();
    await addToExistingDraft.getByRole("button", { name: "Note" }).click();
    await expect(
      addToExistingDraft.getByText("Beitrag: Noch nicht verbunden"),
    ).toBeVisible();
    await expect(
      addToExistingDraft.getByText("Beitragstyp noch nicht verbunden"),
    ).toBeVisible();
    await addToExistingDraft
      .getByRole("button", { name: "Resource 0 DB-Ziele" })
      .click();
    await addToExistingDraft
      .getByRole("button", { name: "Resource Link" })
      .click();
    await expect(
      addToExistingDraft.getByText("Resource Link vorbereitet"),
    ).toBeVisible();
    await expect(
      addToExistingDraft.getByText("Kein Resource Graph", { exact: false }),
    ).toBeVisible();
  });

  test("keeps the Add to Existing draft reachable inside the active item scroll area", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 720, width: 1600 });
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    const activeBody = activeItem.locator(
      '[data-inbox-section="active-item-body"]',
    );

    await activeItem.locator('[data-outcome-route="add_to_existing"]').click();
    await expect(
      activeItem.getByRole("heading", { name: "Bestehendem Objekt zuordnen" }),
    ).toBeVisible();
    await expect(
      activeItem.getByRole("button", { name: "Project 0 DB-Ziele" }),
    ).toBeVisible();
    await expect(
      activeItem.getByRole("button", { name: "Resource Link" }),
    ).toBeVisible();

    const scrollMetrics = await activeBody.evaluate((node) => ({
      clientHeight: node.clientHeight,
      overflowY: window.getComputedStyle(node).overflowY,
      scrollHeight: node.scrollHeight,
    }));

    expect(scrollMetrics.overflowY).toBe("auto");
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(
      scrollMetrics.clientHeight,
    );

    await activeItem
      .getByRole("button", { name: "Task-Beitrag erstellen" })
      .scrollIntoViewIfNeeded();
    await expect(
      activeItem.getByRole("button", { name: "Task-Beitrag erstellen" }),
    ).toBeVisible();

    await activeItem
      .getByRole("heading", { name: "Planning Signals" })
      .scrollIntoViewIfNeeded();
    await expect(
      activeItem.getByRole("heading", { name: "Planning Signals" }),
    ).toBeVisible();

    await expect
      .poll(() => activeBody.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0);
  });

  test("Manual Inbox Add to Existing empty Project targets stay non-persistent", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const title = `Manual Inbox empty existing target ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(
      page,
      title,
      "Keep Add to Existing blocked when no real Project target is present.",
    );

    const addToExistingDraft = await openAddToExistingDraft(page);

    await addToExistingDraft
      .getByRole("button", { name: /^Project \d+ DB-Ziel(?:e)?$/ })
      .click();

    if (await addToExistingDraft.getByLabel("Existing target").isEnabled()) {
      test.skip(
        true,
        "Local DB has real Project targets; persistence proof covers the connected path.",
      );
    }

    await expect(
      addToExistingDraft.getByLabel("Existing target"),
    ).toBeDisabled();
    await expect(
      addToExistingDraft
        .locator("p")
        .filter({ hasText: "Noch keine bestehenden Projects vorhanden." }),
    ).toBeVisible();
    await expect(
      addToExistingDraft.getByRole("button", {
        name: "Task-Beitrag erstellen",
      }),
    ).toBeDisabled();
    await expect(addToExistingDraft.getByText("Life OS MVP")).toHaveCount(0);
    await expect(
      addToExistingDraft.getByText("Stable MVP daily flow"),
    ).toHaveCount(0);
  });

  test("Manual Inbox Add to Existing task persists to a real Project or Goal target", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const captureTitle = `Manual Inbox existing target source ${Date.now()}`;
    const taskTitle = `Manual Inbox existing target task ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    const taskCountBefore = await readProfileDataTaskCount(page);

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(
      page,
      captureTitle,
      "Create a task contribution against an existing Project or Goal.",
    );

    const addToExistingDraft = await openAddToExistingDraft(page);
    const selectedTarget =
      await selectFirstExistingProjectOrGoalTarget(addToExistingDraft);

    if (!selectedTarget) {
      test.skip(
        true,
        "Requires at least one real Supabase Project or Goal target for the authenticated user.",
      );
      return;
    }

    await expect(
      addToExistingDraft.getByText("Beitrag: Verbunden"),
    ).toBeVisible();
    await addToExistingDraft.getByLabel("Titel").fill(taskTitle);
    await addToExistingDraft
      .getByLabel("Beschreibung / Kontext")
      .fill(
        `Task contribution for ${selectedTarget.relationLabel}: ${selectedTarget.targetTitle}`,
      );
    await expect(
      addToExistingDraft.getByRole("button", {
        name: "Task-Beitrag erstellen",
      }),
    ).toBeEnabled();
    await addToExistingDraft
      .getByRole("button", { name: "Task-Beitrag erstellen" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Task erstellt").first()).toBeVisible();
    await expect
      .poll(async () => readProfileDataTaskCount(page))
      .toBeGreaterThan(taskCountBefore);
    const taskCountAfterTriage = await readProfileDataTaskCount(page);

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(taskTitle).first()).toBeVisible();
    await page
      .getByRole("link", { name: new RegExp(taskTitle) })
      .first()
      .click();
    await expect(page.locator("#selected-entity-heading")).toHaveText(
      taskTitle,
    );
    const contextPanel = page.locator(
      '[data-portfolio-section="context-panel"]',
    );
    await expect(
      contextPanel.getByText(selectedTarget.relationLabel).first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByText(selectedTarget.targetTitle).first(),
    ).toBeVisible();
    await expect(contextPanel.getByText(selectedTarget.targetId)).toHaveCount(
      0,
    );

    await page.reload();
    await expect(page.locator("#selected-entity-heading")).toHaveText(
      taskTitle,
    );
    await expect(
      contextPanel.getByText(selectedTarget.targetTitle).first(),
    ).toBeVisible();
    await expect(contextPanel.getByText(selectedTarget.targetId)).toHaveCount(
      0,
    );

    await page.goto("/inbox");
    await expect(page.getByText(captureTitle).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Task-Beitrag erstellen" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Task-Beitrag erstellen" }),
    ).toHaveCount(0);
    await expect(await readProfileDataTaskCount(page)).toBe(
      taskCountAfterTriage,
    );
  });

  test("prepared Create New route stays a non-persistent draft shell", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    const activeItem = page.locator('[data-inbox-section="active-item"]');

    await activeItem.locator('[data-outcome-route="create_new"]').click();
    const createNewDraft = activeItem
      .getByRole("heading", { name: "Create New Draft" })
      .locator("xpath=ancestor::section[1]");
    await expect(createNewDraft).toBeVisible();
    await expect(
      createNewDraft.getByText("Noch nicht verbunden").first(),
    ).toBeVisible();
    await expect(
      createNewDraft.getByText(
        "Diese Auswahl erzeugt keinen Submit und schreibt keine Daten.",
      ),
    ).toBeVisible();
  });

  test("Manual missing auth state stays visible across daily core routes", async ({
    page,
  }) => {
    await setProfile(page, "manual");

    for (const route of [
      "/inbox",
      "/portfolio?view=tasks",
      "/today",
      "/dashboard",
      "/calendar",
    ]) {
      await expectNoHydrationErrors(page, async () => {
        await page.goto(route);
      });

      await expect(
        page.getByText("Manual DB benötigt Supabase Anmeldung").first(),
      ).toBeVisible();
      await expect(
        page
          .getByText("Melde dich an, um lokale DB-backed Tasks zu laden")
          .first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Supabase anmelden" }).first(),
      ).toHaveAttribute("href", "/settings#supabase-session");
    }
  });

  test("captures a manual inbox item from the inbox page", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const title = `Manual inbox page capture ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await page
      .getByRole("textbox", { exact: true, name: "Quick Capture" })
      .fill(title);
    await page
      .getByRole("textbox", { name: "Quick Capture note" })
      .fill("Local note from inbox page.");
    await page.getByRole("button", { name: "Capture" }).click();
    await page.waitForLoadState("networkidle");

    await expectNoInboxDemoStrings(page);
    await expect(page.locator("#inbox-page")).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
    await expect(
      page.locator('[data-inbox-section="queue"]'),
    ).not.toHaveAttribute("data-item-count", "0");
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(
      page.locator('[data-inbox-section="active-item"]'),
    ).toHaveAttribute("data-content-state", "filled");
  });

  test("Manual Inbox DB persistence", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Inbox DB persistence ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await page
      .getByRole("textbox", { exact: true, name: "Quick Capture" })
      .fill(title);
    await page
      .getByRole("textbox", { name: "Quick Capture note" })
      .fill("DB persistence check from the inbox page.");
    await page.getByRole("button", { name: "Capture" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(title).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();
    await expectNoInboxDemoStrings(page);
  });

  test("Manual Inbox Solved Archive removes the item from active inbox", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Inbox solved archive ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await page
      .getByRole("textbox", { exact: true, name: "Quick Capture" })
      .fill(title);
    await page
      .getByRole("textbox", { name: "Quick Capture note" })
      .fill("Close this capture without creating a target object.");
    await page.getByRole("button", { name: "Capture" }).click();
    await page.waitForLoadState("networkidle");

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(page.getByText(title).first()).toBeVisible();
    await activeItem.locator('[data-outcome-route="solved_archive"]').click();
    await expect(
      activeItem.getByRole("heading", { name: "Solved / Archive Draft" }),
    ).toBeVisible();
    await expect(
      activeItem.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
    await activeItem
      .getByRole("button", { name: "Als erledigt archivieren" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(title)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Portfolio öffnen" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(title)).toHaveCount(0);
    await expectNoInboxDemoStrings(page);
  });

  test("Manual Inbox Resource Draft creates a real Resource", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Inbox resource ${Date.now()}`;
    const draftTitle = `${title} draft`;
    const note = "Save this capture as reusable reference material.";

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(page, title, note);

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await activeItem
      .locator('[data-outcome-route="knowledge_resource"]')
      .click();
    const resourceDraft = activeItem
      .getByRole("heading", { name: "Resource Draft" })
      .locator("xpath=ancestor::section[1]");
    await expect(resourceDraft).toBeVisible();
    await expect(resourceDraft.getByText("Verbunden")).toBeVisible();
    await expect(resourceDraft.getByLabel("Titel")).toBeVisible();
    await expect(resourceDraft.getByLabel("Resource Typ")).toBeVisible();
    await expect(resourceDraft.getByLabel("Kurzfassung")).toBeVisible();
    await expect(resourceDraft.getByLabel("Inhalt / Notiz")).toBeVisible();
    await expect(resourceDraft.getByLabel("URL optional")).toBeVisible();
    await expect(
      resourceDraft.getByRole("button", {
        exact: true,
        name: "Task erstellen",
      }),
    ).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();
    await page.goto("/resources");
    await expect(page.getByText(draftTitle)).toHaveCount(0);
    await page.goto("/inbox");
    await expect(page.getByText(title).first()).toBeVisible();

    const activeItemAfterReload = page.locator(
      '[data-inbox-section="active-item"]',
    );
    await activeItemAfterReload
      .locator('[data-outcome-route="knowledge_resource"]')
      .click();
    const resourceDraftAfterReload = activeItemAfterReload
      .getByRole("heading", { name: "Resource Draft" })
      .locator("xpath=ancestor::section[1]");

    await resourceDraftAfterReload.getByLabel("Titel").fill(draftTitle);
    await resourceDraftAfterReload
      .getByLabel("Resource Typ")
      .selectOption("link");
    await resourceDraftAfterReload
      .getByLabel("URL optional")
      .fill("https://example.test/life-os-resource");
    await resourceDraftAfterReload
      .getByRole("button", { exact: true, name: "Resource erstellen" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(
      activeItemAfterReload.getByRole("heading", { name: "Resource erstellt" }),
    ).toBeVisible();
    await expect(
      activeItemAfterReload.getByText(
        "Diese Inbox wurde als Resource gespeichert.",
      ),
    ).toBeVisible();
    await expect(
      activeItemAfterReload.getByRole("link", { name: "Resources öffnen" }),
    ).toBeVisible();
    await expect(activeItemAfterReload.getByText("Task erstellt")).toHaveCount(
      0,
    );

    await activeItemAfterReload
      .getByRole("link", { name: "Resources öffnen" })
      .click();
    await expect(page.locator("#resources-page")).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
    await expect(page.getByText(draftTitle).first()).toBeVisible();
    await expectNoMainStrings(page, resourcesBlockedDemoStrings, "resources");
    await page.reload();
    await expect(page.getByText(draftTitle).first()).toBeVisible();

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(draftTitle)).toHaveCount(0);

    await page.goto("/inbox");
    await expect(page.getByText(draftTitle)).toHaveCount(0);
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("Manual Inbox triage to task", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Inbox triage to task ${Date.now()}`;
    const draftTitle = `${title} drafted`;
    const draftDescription = "Create a task from this edited draft.";
    const draftNextAction = "Open the drafted task in Portfolio.";

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await page
      .getByRole("textbox", { exact: true, name: "Quick Capture" })
      .fill(title);
    await page
      .getByRole("textbox", { name: "Quick Capture note" })
      .fill("Create a task from this inbox item.");
    await page.getByRole("button", { name: "Capture" }).click();
    await page.waitForLoadState("networkidle");

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText("Outcome Route gewählt").first()).toBeVisible();
    await expect(page.getByText("3 / 4 ready").first()).toBeVisible();
    await page.getByRole("button", { name: /Standalone Task/ }).click();
    await expect(
      activeItem.getByRole("heading", { name: "Task Draft" }),
    ).toBeVisible();
    await expect(activeItem.getByLabel("Titel")).toBeVisible();
    await expect(activeItem.getByLabel("Beschreibung / Kontext")).toBeVisible();
    await expect(activeItem.getByLabel("Nächste Aktion")).toBeVisible();
    await expect(activeItem.getByLabel("Area")).toBeVisible();
    await expect(activeItem.getByLabel("Priorität")).toBeVisible();
    await expect(activeItem.getByLabel("Effort / Dauer")).toBeVisible();
    await expect(activeItem.getByLabel("Energie")).toBeVisible();
    await expect(activeItem.getByText("Review nötig")).toBeVisible();
    await activeItem.getByLabel("Titel").fill(draftTitle);
    await activeItem
      .getByLabel("Beschreibung / Kontext")
      .fill(draftDescription);
    await activeItem.getByLabel("Nächste Aktion").fill(draftNextAction);
    await activeItem.getByLabel("Priorität").selectOption("P1");
    await activeItem.getByLabel("Effort / Dauer").selectOption("60");
    await activeItem.getByLabel("Energie").selectOption("high");
    await expect(activeItem.getByLabel("Titel")).toHaveValue(draftTitle);
    await expect(activeItem.getByLabel("Beschreibung / Kontext")).toHaveValue(
      draftDescription,
    );
    await expect(activeItem.getByLabel("Nächste Aktion")).toHaveValue(
      draftNextAction,
    );
    await expect(activeItem.getByLabel("Priorität")).toHaveValue("P1");
    await expect(activeItem.getByLabel("Effort / Dauer")).toHaveValue("60");
    await expect(activeItem.getByLabel("Energie")).toHaveValue("high");
    await expect(page.getByText("4 / 4 ready").first()).toBeVisible();
    await page
      .getByRole("button", { exact: true, name: "Task erstellen" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(activeItem.getByText("Task erstellt")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Portfolio öffnen" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Portfolio öffnen" }).first().click();
    await expect(page).toHaveURL(/\/portfolio\?view=tasks/);
    await expect(page.getByText(draftTitle).first()).toBeVisible();
    await expect(page.getByText("P1 / high").first()).toBeVisible();
    await expect(page.getByText("60 min").first()).toBeVisible();
    await expect(page.getByText(draftNextAction).first()).toBeVisible();
    await page.goto("/inbox");
    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(activeItem.getByText("Task erstellt")).toHaveCount(1);
    await expect(
      page.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Portfolio öffnen" }),
    ).toBeVisible();
    await expectNoInboxDemoStrings(page);
  });

  test("Manual Inbox triage exposes DB task read model", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Inbox task read model ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    const taskCountBefore = await readProfileDataTaskCount(page);

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await page
      .getByRole("textbox", { exact: true, name: "Quick Capture" })
      .fill(title);
    await page
      .getByRole("textbox", { name: "Quick Capture note" })
      .fill("Expose this triaged item through the task read model.");
    await page.getByRole("button", { name: "Capture" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Standalone Task/ }).click();
    await page
      .getByRole("button", { exact: true, name: "Task erstellen" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Task erstellt").first()).toBeVisible();
    await expect
      .poll(async () => readProfileDataTaskCount(page))
      .toBeGreaterThan(taskCountBefore);
    await expectNoInboxDemoStrings(page);
  });

  test("Manual Inbox triaged task cannot be submitted twice", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Inbox no duplicate task ${Date.now()}`;
    const taskCountBefore = await readProfileDataTaskCount(page);

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Keep this inbox item linked to one task.",
    );

    await expect
      .poll(async () => readProfileDataTaskCount(page))
      .toBeGreaterThan(taskCountBefore);
    const taskCountAfterTriage = await readProfileDataTaskCount(page);

    await page.goto("/inbox");
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("button", { exact: true, name: "Task erstellen" }),
    ).toHaveCount(0);
    await expect(await readProfileDataTaskCount(page)).toBe(
      taskCountAfterTriage,
    );
  });
});

test.describe("Today content states", () => {
  test("keeps demo today as the filled V5 day memory reference", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/today");
    });

    await expectTodayWidgetContracts(page, "demo");
    await expect(page.locator("#today-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(page.getByText("Morning baseline checked")).toBeVisible();
    await expect(page.getByText("Revise literature structure")).toBeVisible();
    await expect(page.getByText("Today mode")).toBeVisible();
    await expect(page.getByText("6h 12m")).toBeVisible();
  });

  test("renders empty today without demo strings", async ({ page }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/today");
    });

    await expectTodayWidgetContracts(page, "empty");
    await expectNoTodayDemoStrings(page);
    await expect(page.locator("#today-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.locator('[data-today-section="today-planner"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByText("Keine offenen Kandidaten für heute."),
    ).toBeVisible();
    await expect(
      page.getByText("Für heute wurde noch nichts erfasst."),
    ).toBeVisible();
    await expect(page.getByText("Noch keine Tagesereignisse")).toBeVisible();
    await expect(page.getByText("Nicht gesetzt").first()).toBeVisible();
    await expect(
      page.locator('[data-today-section="delta-summary"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByText("Noch keine Entscheidungen oder Artefakte"),
    ).toBeVisible();
    await expect(page.getByText("Nicht gestartet").first()).toBeVisible();
    await expect(page.getByText("Nicht gespeichert").first()).toBeVisible();
    await expect(page.getByText("Kein Carry Forward")).toBeVisible();
    await expect(
      page.getByText("Ersten Tagespunkt erfassen oder Aufgabe planen."),
    ).toBeVisible();
  });

  test("keeps manual reset as a designed empty today shell", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/today");
    });

    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    await expectNoGenericPlannerRelationLabels(page, "today empty manual");
    await expect(page.locator("#today-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Manual").first()).toBeVisible();
    await expect(page.getByText("Noch keine Tagesereignisse")).toBeVisible();
    await expect(
      page.locator('[data-today-section="today-planner"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByText("Keine offenen Kandidaten für heute."),
    ).toBeVisible();
    await expect(
      page.locator('[data-today-section="opening-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.locator('[data-today-section="closing-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
  });

  test("projects manual today inbox and project data without demo fallback", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      inboxItems: [manualTodayInboxItem()],
      projects: [manualProject(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/today");
    });

    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    await expectNoGenericPlannerRelationLabels(
      page,
      "today manual project data",
    );
    await expect(page.locator("#today-page")).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toHaveAttribute("data-item-count", "1");
    await expect(
      page.locator('[data-today-section="today-planner"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByText("Manual Today Inbox Capture").first(),
    ).toBeVisible();
    await expect(page.getByText("Manual Project 1").first()).toBeVisible();
    await expect(
      page.locator('[data-today-section="carry-forward"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.locator('[data-today-section="opening-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.locator('[data-today-section="closing-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
  });

  test("Manual Today shows DB task candidate before planning", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Today Candidate ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Keep this task as an unplanned Today candidate.",
    );
    await page.goto("/today");

    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    const todayPlanner = page.locator('[data-today-section="today-planner"]');
    const activityTimeline = page.locator(
      '[data-today-section="activity-stream"] ol',
    );

    await expect(todayPlanner).toHaveAttribute("data-content-state", "partial");
    await expect(todayPlanner.getByText(title).first()).toBeVisible();
    await expectNoGenericPlannerRelationLabels(page, "today manual candidate");
    await expect(activityTimeline.getByText(title)).toHaveCount(0);
  });

  test("Manual Planner relation labels resolve a created Project target through Today and Calendar", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const projectTitle = `Manual Planner Relation Project ${Date.now()}`;
    const captureTitle = `Manual Planner Relation Source ${Date.now()}`;
    const taskTitle = `Manual Planner Relation Task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Resolve this Project title in Today and Calendar planner queues.",
    );

    await page.goto("/inbox");
    await captureManualInboxItem(
      page,
      captureTitle,
      "Create a Project-linked task for planner relation label proof.",
    );

    const addToExistingDraft = await openAddToExistingDraft(page);
    const targetId = await selectExistingProjectTargetByTitle(
      addToExistingDraft,
      projectTitle,
    );

    await addToExistingDraft.getByLabel("Titel").fill(taskTitle);
    await addToExistingDraft
      .getByLabel("Beschreibung / Kontext")
      .fill(`Task contribution for created Project: ${projectTitle}`);
    await addToExistingDraft
      .getByRole("button", { name: "Task-Beitrag erstellen" })
      .click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Task erstellt").first()).toBeVisible();

    await page.goto("/today");
    const todayPlanner = page.locator('[data-today-section="today-planner"]');
    await expect(todayPlanner.getByText(taskTitle).first()).toBeVisible();
    await expect(todayPlanner.getByText(projectTitle).first()).toBeVisible();
    await expect(todayPlanner.getByText(targetId)).toHaveCount(0);
    await expectNoGenericPlannerRelationLabels(page, "today relation labels");

    await todayPlanner
      .getByRole("form", { name: `${taskTitle} heute planen` })
      .getByRole("button", { name: "Heute planen" })
      .click();
    await page.waitForLoadState("networkidle");

    await page.goto("/calendar");
    const calendarPlannerQueue = page
      .locator('[data-calendar-section="planning-queue"]')
      .first();
    await expect(
      calendarPlannerQueue.getByText(taskTitle).first(),
    ).toBeVisible();
    await expect(
      calendarPlannerQueue.getByText(projectTitle).first(),
    ).toBeVisible();
    await expect(calendarPlannerQueue.getByText(targetId)).toHaveCount(0);
    await expectNoGenericPlannerRelationLabels(
      page,
      "calendar relation labels",
    );
  });

  test("Manual Today Planner plans DB task into Today, Dashboard and Calendar queue", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Today Planner DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Plan this task from the Today Planner queue.",
    );
    await page.goto("/today");
    const todayPlanner = page.locator('[data-today-section="today-planner"]');
    const planForm = todayPlanner.getByRole("form", {
      name: `${title} heute planen`,
    });

    await expect(todayPlanner.getByText(title).first()).toBeVisible();
    await planForm.getByRole("button", { name: "Heute planen" }).click();
    await page.waitForLoadState("networkidle");

    const activityTimeline = page.locator(
      '[data-today-section="activity-stream"] ol',
    );
    await expect(todayPlanner.getByText(title)).toHaveCount(0);
    await expect(activityTimeline.getByText(title).first()).toBeVisible();
    await page.reload();
    await expect(activityTimeline.getByText(title).first()).toBeVisible();

    await page.goto("/dashboard");
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda.getByText(title).first()).toBeVisible();

    await page.goto("/calendar");
    const calendarPlannerQueue = page
      .locator('[data-calendar-section="planning-queue"]')
      .first();
    const weekGrid = page.locator('[data-calendar-section="week-grid"]');
    await expect(calendarPlannerQueue.getByText(title).first()).toBeVisible();
    await expectNoGenericPlannerRelationLabels(
      page,
      "calendar queue after today planning",
    );
    await expect(weekGrid.getByText(title)).toHaveCount(0);
  });

  test("Manual Today completes DB task and removes it from Dashboard agenda", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Today Complete DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Complete this task from Today and remove it from Dashboard agenda.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");

    await page.goto("/today");
    await page
      .getByRole("form", { name: `${title} abschließen` })
      .getByRole("button", { name: "Abschließen" })
      .click();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("form", { name: `${title} wieder öffnen` }),
    ).toBeVisible();

    await page.goto("/dashboard");
    await expect(
      page.getByRole("region", { name: "Today Agenda" }).getByText(title),
    ).toHaveCount(0);
  });

  test("Manual Today keeps scheduled DB task out of planner candidates", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Today Scheduled ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Schedule this task and keep it out of the Today Planner queue.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute terminieren");
    await page.waitForLoadState("networkidle");

    await page.goto("/today");
    const todayPlanner = page.locator('[data-today-section="today-planner"]');
    const activityTimeline = page.locator(
      '[data-today-section="activity-stream"] ol',
    );

    await expect(activityTimeline.getByText(title).first()).toBeVisible();
    await expect(todayPlanner.getByText(title)).toHaveCount(0);
  });

  test("Manual Today and Dashboard project planned DB task", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Today DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Plan this task for the daily core views.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");

    await page.goto("/today");
    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    await expect(page.getByText(title).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();

    await page.goto("/dashboard");
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
    await expect(todayAgenda.getByText(title).first()).toBeVisible();
    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Today Agenda" })
        .getByText(title)
        .first(),
    ).toBeVisible();
  });
});

test.describe("Calendar content states", () => {
  test("keeps demo calendar as the filled planning reference", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/calendar");
    });

    await expectCalendarWidgetContracts(page, "demo");
    await expectNoGenericPlannerRelationLabels(page, "calendar demo");
    await expect(
      page.locator('[data-calendar-section="page"]'),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(
      page.getByText("Deep Work: Masterarbeit").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Literature source deadline").first(),
    ).toBeVisible();
  });

  test("renders empty calendar without demo blocks", async ({ page }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/calendar");
    });

    await expectCalendarWidgetContracts(page, "empty");
    await expectNoMainStrings(page, calendarBlockedDemoStrings, "calendar");
    await expectNoGenericPlannerRelationLabels(page, "calendar empty");
    await expect(
      page.locator('[data-calendar-section="week-grid"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.getByText("Noch keine Termine oder Zeitblöcke"),
    ).toBeVisible();
    await expect(
      page.getByText("Keine geplanten Tasks ohne Uhrzeit."),
    ).toBeVisible();
  });

  test("Manual Calendar plans DB task through queue and schedules reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Calendar DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Plan this task into the Calendar Planner Queue before scheduling it.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");

    await expectCalendarWidgetContracts(page, "manual");
    await expectNoMainStrings(page, calendarBlockedDemoStrings, "calendar");
    await expectNoGenericPlannerRelationLabels(page, "calendar manual queue");
    const weekGrid = page.locator('[data-calendar-section="week-grid"]');
    const plannerQueue = page
      .locator('[data-calendar-section="planning-queue"]')
      .first();

    await expect(weekGrid).toHaveAttribute("data-content-state", "empty");
    await expect(plannerQueue.getByText(title).first()).toBeVisible();
    await expect(weekGrid.getByText(title)).toHaveCount(0);

    const scheduleForm = plannerQueue.getByRole("form", {
      name: `${title} terminieren`,
    });
    await scheduleForm.getByLabel("Uhrzeit").fill("10:15");
    await scheduleForm.getByLabel("Dauer").selectOption("45");
    await scheduleForm.getByRole("button", { name: "Terminieren" }).click();
    await page.waitForLoadState("networkidle");

    await expect(plannerQueue.getByText(title)).toHaveCount(0);
    await expect(weekGrid.getByText(title).first()).toBeVisible();
    await page.reload();
    await expect(weekGrid.getByText(title).first()).toBeVisible();

    await page.goto("/today");
    await expect(page.getByText(title).first()).toBeVisible();

    await page.goto("/dashboard");
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda.getByText(title).first()).toBeVisible();
  });

  test("Manual Calendar unschedules DB task back into planner queue", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Calendar Unschedule DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Schedule then unschedule this task from Calendar.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");

    const plannerQueue = page
      .locator('[data-calendar-section="planning-queue"]')
      .first();
    await plannerQueue
      .getByRole("form", { name: `${title} terminieren` })
      .getByLabel("Uhrzeit")
      .fill("11:15");
    await plannerQueue
      .getByRole("form", { name: `${title} terminieren` })
      .getByRole("button", { name: "Terminieren" })
      .click();
    await page.waitForLoadState("networkidle");
    await page.reload();

    const weekGrid = page.locator('[data-calendar-section="week-grid"]');
    await weekGrid.getByRole("button", { name: new RegExp(title) }).click();
    await page.getByRole("button", { name: "Move later" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(
      weekGrid.getByRole("button", {
        name: new RegExp(`${title}, 11:45 to 12:15`),
      }),
    ).toBeVisible();

    await weekGrid.getByRole("button", { name: new RegExp(title) }).click();
    await page.getByRole("button", { exact: true, name: "Unschedule" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();

    await expect(weekGrid.getByText(title)).toHaveCount(0);
    await expect(plannerQueue.getByText(title).first()).toBeVisible();
  });
});

test.describe("Portfolio content states", () => {
  test("keeps demo portfolio as the filled entity reference", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/portfolio");
    });

    await expectPortfolioWidgetContracts(page, "demo");
    await expect(page.locator("#portfolio-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(page.getByText("Life OS App").first()).toBeVisible();
    await expect(page.getByText("Masterarbeit").first()).toBeVisible();
  });

  test("renders empty portfolio views without demo entities", async ({
    page,
  }) => {
    await setProfile(page, "empty");

    for (const [view, emptyTitle] of [
      ["tasks", "Noch keine Portfolio-Tasks"],
      ["projects", "Noch keine Portfolio-Projekte"],
      ["goals", "Noch keine Portfolio-Ziele"],
      ["skills", "Noch keine Skills im Portfolio"],
    ] as const) {
      await expectNoHydrationErrors(page, async () => {
        await page.goto(`/portfolio?view=${view}`);
      });

      await expectPortfolioWidgetContracts(page, "empty");
      await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
      await expect(page.locator("#portfolio-page")).toHaveAttribute(
        "data-content-state",
        "empty",
      );
      await expect(page.getByText(emptyTitle)).toBeVisible();
      await expect(
        page.getByText("Keine Entity ausgewählt").first(),
      ).toBeVisible();
    }
  });

  test("projects manual projects and goals without demo fallback", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      goals: [manualGoal(1)],
      projects: [manualProject(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/portfolio");
    });

    await expectPortfolioWidgetContracts(page, "manual");
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
    await expect(page.locator("#portfolio-page")).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(page.getByText("Manual Project 1").first()).toBeVisible();
    await expect(page.getByText("Manual Goal 1").first()).toBeVisible();

    await page.goto("/portfolio?view=skills");
    await expect(
      page.getByText("Noch keine Skills im Portfolio"),
    ).toBeVisible();
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
  });

  test("Portfolio Contextual Create routes each view to the matching create model", async ({
    page,
  }) => {
    await setProfile(page, "manual");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/portfolio?view=tasks");
    });

    await expect(page.getByRole("heading", { name: "Task erstellen" })).toBeVisible();
    await expect(page.locator('form[aria-label="Task erstellen"]')).toBeVisible();
    await expect(
      page.locator('form[aria-label="Project erstellen"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('form[aria-label="Goal erstellen"]'),
    ).toHaveCount(0);

    await page.goto("/portfolio?view=projects");
    await expect(
      page.getByRole("heading", { name: "Project erstellen" }),
    ).toBeVisible();
    await expect(
      page.locator('form[aria-label="Project erstellen"]'),
    ).toBeVisible();
    await expect(
      page.locator('form[aria-label="Task erstellen"]'),
    ).toHaveCount(0);

    await page.goto("/portfolio?view=goals");
    await expect(page.getByRole("heading", { name: "Goal erstellen" })).toBeVisible();
    await expect(page.locator('form[aria-label="Goal erstellen"]')).toBeVisible();
    await expect(
      page.locator('form[aria-label="Project erstellen"]'),
    ).toHaveCount(0);

    await page.goto("/portfolio?view=skills");
    await expect(
      page.getByRole("heading", { name: "Skill Model folgt" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Skill später" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Skill später" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Skill erstellen" })).toHaveCount(0);

    await page.goto("/portfolio");
    await expect(page.getByRole("heading", { name: "Typ wählen" })).toBeVisible();
    await expect(page.locator('form[aria-label="Task erstellen"]')).toBeVisible();
    await expect(
      page.locator('form[aria-label="Project erstellen"]'),
    ).toBeVisible();
    await expect(page.locator('form[aria-label="Goal erstellen"]')).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Skill Model folgt" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /löschen|archivieren/i }),
    ).toHaveCount(0);
  });

  test("Project Workbench shows overview, linked tasks and prepared sections without fake data", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      projects: [manualProject(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/portfolio?view=projects");
    });

    const contextPanel = page.locator('[data-portfolio-section="context-panel"]');

    await expect(
      contextPanel.getByRole("heading", { name: "Project Overview" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Linked Tasks" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Task für Project erstellen" }),
    ).toBeVisible();
    await expect(
      contextPanel
        .locator('form[aria-label="Project Task erstellen"]')
        .getByRole("button", { name: "Task erstellen" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Keine verknüpften Tasks.").first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Prepared Sections" }),
    ).toBeVisible();
    const projectPreparedSections = contextPanel
      .getByRole("heading", { name: "Prepared Sections" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      contextPanel.getByRole("heading", { name: "Milestones" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Resources" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Keine verknüpften Resources.").first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Project Log" }),
    ).toBeVisible();
    await expect(
      projectPreparedSections.getByText("Vorbereitet", { exact: true }),
    ).toHaveCount(2);
    await expect(
      contextPanel.getByText("Future Scope: Project Workbench"),
    ).toBeVisible();
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
  });

  test("Goal Workbench shows overview, linked projects, linked tasks and prepared sections without fake data", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      goals: [manualGoal(1)],
      projects: [
        {
          ...manualProject(1),
          goalId: "goal-1",
        },
      ],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/portfolio?view=goals");
    });

    const contextPanel = page.locator('[data-portfolio-section="context-panel"]');

    await expect(
      contextPanel.getByRole("heading", { name: "Goal Overview" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Linked Projects" }),
    ).toBeVisible();
    await expect(contextPanel.getByText("Manual Project 1").first()).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Linked Tasks" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Task für Goal erstellen" }),
    ).toBeVisible();
    await expect(
      contextPanel
        .locator('form[aria-label="Goal Task erstellen"]')
        .getByRole("button", { name: "Task erstellen" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Project für Goal erstellen" }),
    ).toBeVisible();
    await expect(
      contextPanel
        .locator('form[aria-label="Goal Project erstellen"]')
        .getByRole("button", { name: "Project erstellen" }),
    ).toBeVisible();
    await expect(contextPanel.getByText("Keine verknüpften Tasks.")).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Prepared Sections" }),
    ).toBeVisible();
    const goalPreparedSections = contextPanel
      .getByRole("heading", { name: "Prepared Sections" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      contextPanel.getByRole("heading", { name: "Milestones" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Review Cadence" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Resources" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Keine verknüpften Resources.").first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Goal Log" }),
    ).toBeVisible();
    await expect(
      goalPreparedSections.getByText("Vorbereitet", { exact: true }),
    ).toHaveCount(3);
    await expect(
      contextPanel.getByText("Future Scope: Goal Workbench"),
    ).toBeVisible();
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
  });

  test("Project and Goal Workbench keep create controls and prepared sections reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 720, width: 1600 });
    await setProfile(page, "manual");
    await writeManualProfile({
      goals: [manualGoal(1)],
      projects: [
        {
          ...manualProject(1),
          goalId: "goal-1",
        },
      ],
    });

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/portfolio?view=projects");
    });
    let contextPanel = page.locator('[data-portfolio-section="context-panel"]');
    await contextPanel
      .locator('form[aria-label="Project Task erstellen"]')
      .getByRole("button", { name: "Task erstellen" })
      .scrollIntoViewIfNeeded();
    await expect(
      contextPanel
        .locator('form[aria-label="Project Task erstellen"]')
        .getByRole("button", { name: "Task erstellen" }),
    ).toBeVisible();
    await contextPanel
      .getByRole("heading", { name: "Project Log" })
      .scrollIntoViewIfNeeded();
    await expect(
      contextPanel.getByRole("heading", { name: "Project Log" }),
    ).toBeVisible();

    await page.goto("/portfolio?view=goals");
    contextPanel = page.locator('[data-portfolio-section="context-panel"]');
    await contextPanel
      .locator('form[aria-label="Goal Task erstellen"]')
      .getByRole("button", { name: "Task erstellen" })
      .scrollIntoViewIfNeeded();
    await expect(
      contextPanel
        .locator('form[aria-label="Goal Task erstellen"]')
        .getByRole("button", { name: "Task erstellen" }),
    ).toBeVisible();
    await contextPanel
      .locator('form[aria-label="Goal Project erstellen"]')
      .getByRole("button", { name: "Project erstellen" })
      .scrollIntoViewIfNeeded();
    await expect(
      contextPanel
        .locator('form[aria-label="Goal Project erstellen"]')
        .getByRole("button", { name: "Project erstellen" }),
    ).toBeVisible();
    await contextPanel
      .getByRole("heading", { name: "Goal Log" })
      .scrollIntoViewIfNeeded();
    await expect(
      contextPanel.getByRole("heading", { name: "Goal Log" }),
    ).toBeVisible();
  });

  test("Manual Portfolio Task erstellen persists reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const title = `Manual Portfolio Created Task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=tasks");
    await createPortfolioTaskTarget(
      page,
      title,
      "Review the Portfolio-created task.",
      "Created directly from Portfolio contextual create.",
    );
    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();
    await page.goto("/today");
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("Manual Project Workbench creates linked Project task reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const projectTitle = `Manual Workbench Project ${Date.now()}`;
    const taskTitle = `Manual Workbench Project Task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Project Workbench v1 target.",
    );
    await page
      .getByRole("link", { name: new RegExp(projectTitle) })
      .first()
      .click();
    await expect(page.locator("#selected-entity-heading")).toHaveText(
      projectTitle,
    );
    await createProjectWorkbenchTask(
      page,
      taskTitle,
      "Review the project task.",
      "Created inside Project Workbench v1.",
    );
    await page.reload();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText(taskTitle)
        .first(),
    ).toBeVisible();

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(taskTitle).first()).toBeVisible();
    await page
      .getByRole("link", { name: new RegExp(taskTitle) })
      .first()
      .click();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText(projectTitle)
        .first(),
    ).toBeVisible();
  });

  test("Manual Portfolio Project erstellen and Goal erstellen persist reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const projectTitle = `Manual Portfolio Project Target ${Date.now()}`;
    const goalTitle = `Manual Portfolio Goal Target ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Minimal Project target for Add to Existing.",
    );
    await page.reload();
    await expect(page.getByText(projectTitle).first()).toBeVisible();

    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Minimal Goal target for Add to Existing.",
    );
    await page.reload();
    await expect(page.getByText(goalTitle).first()).toBeVisible();
  });

  test("Manual Project Workbench keeps linked task lifecycle intact", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const projectTitle = `Manual Workbench Lifecycle Project ${Date.now()}`;
    const taskTitle = `Manual Workbench Lifecycle Task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Project Workbench lifecycle target.",
    );
    await page
      .getByRole("link", { name: new RegExp(projectTitle) })
      .first()
      .click();
    await createProjectWorkbenchTask(
      page,
      taskTitle,
      "Complete and reopen this project task.",
      "Lifecycle proof inside Project Workbench v1.",
    );

    await clickPortfolioContextButton(page, "Abschließen");
    await page.waitForLoadState("networkidle");
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText("Completed"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Wieder öffnen" }).first(),
    ).toBeVisible();

    await clickPortfolioContextButton(page, "Wieder öffnen");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Abschließen" }).first(),
    ).toBeVisible();
  });

  test("Manual Goal Workbench creates linked Goal task reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const goalTitle = `Manual Workbench Goal ${Date.now()}`;
    const taskTitle = `Manual Workbench Goal Task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Goal Workbench v1 target.",
    );
    await page
      .getByRole("link", { name: new RegExp(goalTitle) })
      .first()
      .click();
    await expect(page.locator("#selected-entity-heading")).toHaveText(goalTitle);
    await createGoalWorkbenchTask(
      page,
      taskTitle,
      "Review the goal task.",
      "Created inside Goal Workbench v1.",
    );
    await page.reload();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText(taskTitle)
        .first(),
    ).toBeVisible();

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(taskTitle).first()).toBeVisible();
    await page
      .getByRole("link", { name: new RegExp(taskTitle) })
      .first()
      .click();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText(goalTitle)
        .first(),
    ).toBeVisible();
  });

  test("Manual Goal Workbench creates linked Goal project reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const goalTitle = `Manual Workbench Project Goal ${Date.now()}`;
    const projectTitle = `Manual Workbench Goal Project ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Goal Workbench project target.",
    );
    await page
      .getByRole("link", { name: new RegExp(goalTitle) })
      .first()
      .click();
    await createGoalWorkbenchProject(
      page,
      projectTitle,
      "Created inside Goal Workbench v1.",
    );
    await page.reload();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText(projectTitle)
        .first(),
    ).toBeVisible();
  });

  test("Manual Goal Workbench keeps linked task lifecycle intact", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const goalTitle = `Manual Workbench Lifecycle Goal ${Date.now()}`;
    const taskTitle = `Manual Workbench Goal Lifecycle Task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Goal Workbench lifecycle target.",
    );
    await page
      .getByRole("link", { name: new RegExp(goalTitle) })
      .first()
      .click();
    await createGoalWorkbenchTask(
      page,
      taskTitle,
      "Complete and reopen this goal task.",
      "Lifecycle proof inside Goal Workbench v1.",
    );

    await clickPortfolioContextButton(page, "Abschließen");
    await page.waitForLoadState("networkidle");
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText("Completed"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Wieder öffnen" }).first(),
    ).toBeVisible();

    await clickPortfolioContextButton(page, "Wieder öffnen");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Abschließen" }).first(),
    ).toBeVisible();
  });

  test("Manual Add to Existing uses a Project target created in Portfolio", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const projectTitle = `Manual Existing Project Target ${Date.now()}`;
    const captureTitle = `Manual created target source ${Date.now()}`;
    const taskTitle = `Manual created target task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Use this Project as an Add to Existing target.",
    );

    await page.goto("/inbox");
    await captureManualInboxItem(
      page,
      captureTitle,
      "Attach this capture to the Project created in Portfolio.",
    );

    const addToExistingDraft = await openAddToExistingDraft(page);
    const targetId = await selectExistingProjectTargetByTitle(
      addToExistingDraft,
      projectTitle,
    );

    await expect(
      addToExistingDraft.getByText("Beitrag: Verbunden"),
    ).toBeVisible();
    await addToExistingDraft.getByLabel("Titel").fill(taskTitle);
    await addToExistingDraft
      .getByLabel("Beschreibung / Kontext")
      .fill(`Task contribution for created Project: ${projectTitle}`);
    await addToExistingDraft
      .getByRole("button", { name: "Task-Beitrag erstellen" })
      .click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Task erstellt").first()).toBeVisible();

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(taskTitle).first()).toBeVisible();
    await page
      .getByRole("link", { name: new RegExp(taskTitle) })
      .first()
      .click();
    const contextPanel = page.locator(
      '[data-portfolio-section="context-panel"]',
    );
    await expect(contextPanel.getByText(projectTitle).first()).toBeVisible();
    await expect(contextPanel.getByText(targetId)).toHaveCount(0);
    await page.reload();
    await expect(contextPanel.getByText(projectTitle).first()).toBeVisible();
  });

  test("Manual Add to Existing uses a Goal target created in Portfolio", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const goalTitle = `Manual Existing Goal Target ${Date.now()}`;
    const captureTitle = `Manual created goal source ${Date.now()}`;
    const taskTitle = `Manual created goal task ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Use this Goal as an Add to Existing target.",
    );

    await page.goto("/inbox");
    await captureManualInboxItem(
      page,
      captureTitle,
      "Attach this capture to the Goal created in Portfolio.",
    );

    const addToExistingDraft = await openAddToExistingDraft(page);
    const targetId = await selectExistingGoalTargetByTitle(
      addToExistingDraft,
      goalTitle,
    );

    await expect(
      addToExistingDraft.getByText("Beitrag: Verbunden"),
    ).toBeVisible();
    await addToExistingDraft.getByLabel("Titel").fill(taskTitle);
    await addToExistingDraft
      .getByLabel("Beschreibung / Kontext")
      .fill(`Task contribution for created Goal: ${goalTitle}`);
    await addToExistingDraft
      .getByRole("button", { name: "Task-Beitrag erstellen" })
      .click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Task erstellt").first()).toBeVisible();

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(taskTitle).first()).toBeVisible();
    await page
      .getByRole("link", { name: new RegExp(taskTitle) })
      .first()
      .click();
    const contextPanel = page.locator(
      '[data-portfolio-section="context-panel"]',
    );
    await expect(contextPanel.getByText(goalTitle).first()).toBeVisible();
    await expect(contextPanel.getByText(targetId)).toHaveCount(0);
    await page.reload();
    await expect(contextPanel.getByText(goalTitle).first()).toBeVisible();
  });

  test("Manual Portfolio projects triaged DB task reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Portfolio DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Project this task into Portfolio.",
    );
    await page.goto("/portfolio?view=tasks");

    await expectPortfolioWidgetContracts(page, "manual");
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
    await expect(page.getByText(title).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("Manual Portfolio completes and reopens DB task reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Portfolio Lifecycle DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Complete and reopen this Portfolio task.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Abschließen");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();

    await clickPortfolioContextButton(page, "Wieder öffnen");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Abschließen" })).toBeVisible();
  });

  test("Manual Portfolio archives DB task out of active views", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = `Manual Portfolio Archive DB Task ${Date.now()}`;

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Archive this task out of active Portfolio views.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Archivieren");
    await page.waitForLoadState("networkidle");
    await page.reload();

    await expect(page.getByText(title)).toHaveCount(0);
    await page.goto("/today");
    await expect(page.getByText(title)).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page.getByText(title)).toHaveCount(0);
    await page.goto("/calendar");
    await expect(page.getByText(title)).toHaveCount(0);
  });
});

test.describe("Education content states", () => {
  test("Education Overview demo keeps the filled reference shell", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/education");
    });

    await expectEducationOverviewContracts(page, "demo");
    await expect(page.locator("#education-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(
      page.getByRole("heading", {
        name: "KI-Agenten als persönliche Produktivitätsassistenten",
      }),
    ).toBeVisible();
  });

  test("Education Overview empty blocks demo data and keeps section selectors", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/education");
    });

    await expectEducationOverviewContracts(page, "empty");
    await expect(page.locator("#education-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expectNoMainStrings(
      page,
      educationOverviewBlockedDemoStrings,
      "education overview",
    );
    await expect(page.getByText("Noch kein Forschungsfokus")).toBeVisible();
    await expect(page.getByText("Noch keine Research-Ideen")).toBeVisible();
    await expect(page.getByText("Noch keine Forschungsfelder")).toBeVisible();
    await expect(page.getByText("Noch keine Literatur")).toBeVisible();
    await expect(page.getByText("Noch keine Research-Notizen")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add research idea" }),
    ).toBeDisabled();
  });

  test("Scientific Work empty removes the fake thesis focus", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/education/scientific-work");
    });

    await expectScientificWorkContracts(page, "empty");
    await expectNoMainStrings(
      page,
      scientificWorkBlockedDemoStrings,
      "scientific work",
    );
    await expect(
      page.getByText("Noch kein wissenschaftlicher Fokus"),
    ).toBeVisible();
    await expect(
      page.getByText("Keine nächste Forschungsaktion"),
    ).toBeVisible();
    await expect(page.getByText("Noch keine Forschungsfragen")).toBeVisible();
    await expect(
      page.getByText("Noch keine wissenschaftlichen Arbeiten"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Update next action" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Open focus" }),
    ).toBeDisabled();
  });

  test("Literature empty blocks mock source copy and demo sources", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/education/literature");
    });

    await expectLiteratureContracts(page, "empty");
    await expectNoMainStrings(page, literatureBlockedDemoStrings, "literature");
    await expect(page.getByText("Noch keine Literatur")).toBeVisible();
    await expect(page.getByText("Keine Quelle in Extraktion")).toBeVisible();
    await expect(page.getByText("Keine priorisierten Quellen")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add literature" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Review queue" }),
    ).toBeDisabled();
  });

  test("Learning Log empty disables Log Session without tracks", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/education/learning-log");
    });

    await expectLearningLogContracts(page, "empty");
    await expectNoMainStrings(
      page,
      learningLogBlockedDemoStrings,
      "learning log",
    );
    await expect(page.getByText("Noch kein Lernfokus")).toBeVisible();
    await expect(page.getByText("Noch keine Lerntracks")).toBeVisible();
    await expect(page.getByText("Keine Practice-Items")).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Log Session" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { exact: true, name: "Log learning session" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Add practice item" }),
    ).toBeDisabled();
  });

  test("Education manual empty keeps all scoped routes free of demo leaks", async ({
    page,
  }) => {
    await setProfile(page, "manual");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/education");
    });
    await expectEducationOverviewContracts(page, "manual");
    await expectNoMainStrings(
      page,
      educationOverviewBlockedDemoStrings,
      "education manual",
    );

    await page.goto("/education/scientific-work");
    await expectScientificWorkContracts(page, "manual");
    await expectNoMainStrings(
      page,
      scientificWorkBlockedDemoStrings,
      "scientific work manual",
    );

    await page.goto("/education/literature");
    await expectLiteratureContracts(page, "manual");
    await expectNoMainStrings(
      page,
      literatureBlockedDemoStrings,
      "literature manual",
    );

    await page.goto("/education/learning-log");
    await expectLearningLogContracts(page, "manual");
    await expectNoMainStrings(
      page,
      learningLogBlockedDemoStrings,
      "learning log manual",
    );
  });
});

test.describe("Work content states", () => {
  test("Work demo keeps the filled reference shells", async ({ page }) => {
    await setProfile(page, "demo");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/work");
    });
    await expectWorkOverviewContracts(page, "demo");
    await expect(page.locator('[data-work-section="page"]')).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(
      page.getByText("Schnittstellenverhalten nachvollzogen").first(),
    ).toBeVisible();

    await page.goto("/work/log");
    await expectWorkLogContracts(page, "demo");
    await expect(
      page.locator('[data-work-log-section="page"]'),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(
      page.getByText("Testfall rekonstruiert").first(),
    ).toBeVisible();

    await page.goto("/work/wiki");
    await expectWorkWikiContracts(page, "demo");
    await expect(
      page.locator('[data-work-wiki-section="page"]'),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(
      page.getByText("Testdaten prüfen: Vorgehen").first(),
    ).toBeVisible();
  });

  test("Work empty keeps shells and blocks demo data", async ({ page }) => {
    await setProfile(page, "empty");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/work");
    });
    await expectWorkOverviewContracts(page, "empty");
    await expect(page.locator('[data-work-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expectNoMainStrings(
      page,
      workOverviewBlockedDemoStrings,
      "work overview",
    );
    await expect(page.getByText("Noch kein Work-Journal")).toBeVisible();
    await expect(
      page.getByText("Keine offenen Follow-ups").first(),
    ).toBeVisible();
    await expect(page.getByText("Noch keine Work-Logs").first()).toBeVisible();
    await expect(
      page.getByText("Keine Architektur-Notizen").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Log work entry" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { exact: true, name: "Add wiki note" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { exact: true, name: "Add follow-up" }).first(),
    ).toBeDisabled();

    await page.goto("/work/log");
    await expectWorkLogContracts(page, "empty");
    await expect(
      page.locator('[data-work-log-section="page"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expectNoMainStrings(page, workLogBlockedDemoStrings, "work log");
    await expect(page.getByText("Noch kein Work-Eintrag")).toBeVisible();
    await expect(
      page.getByText("Keine verknüpften Work-Aufgaben"),
    ).toBeVisible();
    await expect(page.getByText("Keine Aktivitäten")).toBeVisible();
    await expect(
      page.getByText("Keine verknüpften Wiki-Notizen"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Log work" }).first(),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Add activity" }).first(),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Add task" }).first(),
    ).toBeDisabled();

    await page.goto("/work/wiki");
    await expectWorkWikiContracts(page, "empty");
    await expect(
      page.locator('[data-work-wiki-section="page"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expectNoMainStrings(page, workWikiBlockedDemoStrings, "work wiki");
    await expect(page.getByText("Keine gepinnten Referenzen")).toBeVisible();
    await expect(page.getByText("Keine Wiki-Einträge im Review")).toBeVisible();
    await expect(page.getByText("Noch keine Wiki-Einträge")).toBeVisible();
    await expect(page.getByText("Keine Architektur-Notizen")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add wiki entry" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Add architecture note" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Review entries" }),
    ).toBeDisabled();
  });

  test("Work manual empty and partial use only local Work data", async ({
    page,
  }) => {
    await setProfile(page, "manual");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/work");
    });
    await expectWorkOverviewContracts(page, "manual");
    await expect(page.locator('[data-work-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expectNoMainStrings(
      page,
      workOverviewBlockedDemoStrings,
      "work manual",
    );

    await page.goto("/work/log");
    await expectWorkLogContracts(page, "manual");
    await expect(
      page.locator('[data-work-log-section="page"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expectNoMainStrings(
      page,
      workLogBlockedDemoStrings,
      "work log manual",
    );

    await page.goto("/work/wiki");
    await expectWorkWikiContracts(page, "manual");
    await expect(
      page.locator('[data-work-wiki-section="page"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expectNoMainStrings(
      page,
      workWikiBlockedDemoStrings,
      "work wiki manual",
    );

    await writeManualProfile({
      tasks: [manualTimedTask()],
    });

    await page.goto("/work/log");
    await expectWorkLogContracts(page, "manual");
    await expect(
      page.locator('[data-work-log-section="page"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.locator('[data-work-log-section="task-context"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.getByText("Manual 20:00 Agenda Task").first(),
    ).toBeVisible();
    await expectNoMainStrings(
      page,
      workLogBlockedDemoStrings,
      "work log manual partial",
    );
  });
});

test.describe("Resources content states", () => {
  test("keeps demo resources as the filled knowledge reference", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/resources");
    });

    await expectResourcesWidgetContracts(page, "demo");
    await expectWidgetContract(
      page.locator('[data-resources-section="library"]'),
      "demo",
      "8",
    );
    await expectWidgetContract(
      page.locator('[data-resources-section="review-queue"]').first(),
      "demo",
      "4",
    );
    await expect(page.locator("#resources-page")).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(
      page.getByText("Literature Review Search Strategy").first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-resources-section="summary"]').getByText("128"),
    ).toBeVisible();
  });

  test("Resource Relations inspector exposes real relation sections without UUID labels", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/resources");
    });

    const inspector = page.locator(
      '[data-resources-section="relation-inspector"]',
    );

    await expect(
      inspector.getByRole("heading", { name: "Resource Overview" }),
    ).toBeVisible();
    await expect(
      inspector.getByRole("heading", { name: "Beziehungen" }),
    ).toBeVisible();
    await expect(
      inspector.getByRole("heading", { name: "Verknüpfte Projects" }),
    ).toBeVisible();
    await expect(
      inspector.getByRole("heading", { name: "Verknüpfte Goals" }),
    ).toBeVisible();
    await expect(
      inspector.getByRole("heading", { name: "Verknüpfte Tasks" }),
    ).toBeVisible();
    await expect(
      inspector.getByRole("heading", { name: "Verknüpfte Resources" }),
    ).toBeVisible();
    await expect(
      inspector.locator('[data-resource-relation-card]'),
    ).toHaveCount(0);
  });

  test("renders empty resources without demo library or KPI leaks", async ({
    page,
  }) => {
    await setProfile(page, "empty");

    for (const route of [
      "/resources",
      "/resources?view=map",
      "/resources?view=review",
    ]) {
      await expectNoHydrationErrors(page, async () => {
        await page.goto(route);
      });

      await expectResourcesWidgetContracts(page, "empty");
      await expectNoMainStrings(page, resourcesBlockedDemoStrings, "resources");
      await expectNoResourceKpiLeaks(page);
      await expect(page.locator("#resources-page")).toHaveAttribute(
        "data-content-state",
        "empty",
      );
      await expect(
        page.getByText("Keine Ressource ausgewählt").first(),
      ).toBeVisible();

      if (route === "/resources") {
        await expectWidgetContract(
          page.locator('[data-resources-section="library"]'),
          "empty",
          "8",
        );
        await expectWidgetContract(
          page.locator('[data-resources-section="review-queue"]').first(),
          "empty",
          "4",
        );
      }

      if (route === "/resources?view=map") {
        await expectWidgetContract(
          page.locator('[data-resources-section="knowledge-map"]'),
          "empty",
          "6",
        );
      }

      if (route === "/resources?view=review") {
        await expectWidgetContract(
          page.locator('[data-resources-section="review-workbench"]'),
          "empty",
          "4",
        );
      }
    }

    await page.goto("/resources");
    await expect(page.getByText("Noch keine Ressourcen")).toHaveCount(1);
    await expect(
      page.getByText("Keine Review-Punkte offen").first(),
    ).toBeVisible();
    await expect(page.getByText("Noch keine Learnings").first()).toBeVisible();

    await page.goto("/resources?view=review");
    await expect(page.getByText("Keine Ressourcen zur Prüfung")).toBeVisible();
  });

  test("keeps manual resources empty until a local source exists", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/resources");
    });

    await expectResourcesWidgetContracts(page, "manual");
    await expectWidgetContract(
      page.locator('[data-resources-section="library"]'),
      "manual",
      "8",
    );
    await expectWidgetContract(
      page.locator('[data-resources-section="review-queue"]').first(),
      "manual",
      "4",
    );
    await expectNoMainStrings(page, resourcesBlockedDemoStrings, "resources");
    await expectNoResourceKpiLeaks(page);
    await expect(page.locator("#resources-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Noch keine Ressourcen")).toHaveCount(1);
    await expect(
      page.getByText("Keine Ressource ausgewählt").first(),
    ).toBeVisible();
    await expect(page.locator('[data-resource-relation-card]')).toHaveCount(0);
  });

  test("Manual or empty resources do not render fake relation cards", async ({
    page,
  }) => {
    for (const profile of ["empty", "manual"] as const) {
      await setProfile(page, profile);
      await expectNoHydrationErrors(page, async () => {
        await page.goto("/resources");
      });

      await expectNoMainStrings(page, resourcesBlockedDemoStrings, "resources");
      await expect(page.locator('[data-resource-relation-card]')).toHaveCount(0);
    }
  });
});

test.describe("Utility and system content states", () => {
  test("keeps demo shop and challenges as curated references", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/shop");
    });
    await expectShopWidgetContracts(page, "demo");
    await expect(page.getByText("30 min phone time").first()).toBeVisible();
    await expect(
      page.locator('[data-shop-section="reward-balance"]'),
    ).toContainText(/42\s*LC/);

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/challenges");
    });
    await expectChallengesWidgetContracts(page, "demo");
    await expect(
      page.getByText("Weekly Review completed").first(),
    ).toBeVisible();
    await expect(page.getByText("10-minute walk").first()).toBeVisible();
  });

  test("renders empty shop without reward fixture leaks", async ({ page }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/shop");
    });

    await expectShopWidgetContracts(page, "empty");
    await expectNoMainStrings(page, shopBlockedDemoStrings, "shop empty");
    await expect(page.getByText("0 LC").first()).toBeVisible();
    await expect(page.getByText("Noch keine Rewards")).toBeVisible();
    await expect(page.getByText("Keine Empfehlungen")).toBeVisible();
    await expect(page.getByText("Keine aktiven Quellen")).toBeVisible();
    await expect(page.getByText("Noch keine Reward-Historie")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create reward" }).first(),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Claim selected" }),
    ).toBeDisabled();
  });

  test("renders empty challenges without challenge fixture leaks", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/challenges");
    });

    await expectChallengesWidgetContracts(page, "empty");
    await expectNoMainStrings(
      page,
      challengesBlockedDemoStrings,
      "challenges empty",
    );
    await expect(page.getByText("Keine aktive Challenge")).toBeVisible();
    await expect(page.getByText("Keine Daily Challenges")).toBeVisible();
    await expect(page.getByText("Keine Weekly Challenges")).toBeVisible();
    await expect(page.getByText("Keine Monthly Challenges")).toBeVisible();
    await expect(page.getByText("Keine Challenge-Ideen")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create challenge" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Log completion" }),
    ).toBeDisabled();
  });

  test("keeps manual shop and challenges empty until durable local sources exist", async ({
    page,
  }) => {
    await resetManualProfileFile();
    await setProfile(page, "manual");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/shop");
    });
    await expectShopWidgetContracts(page, "manual");
    await expectNoMainStrings(page, shopBlockedDemoStrings, "shop manual");
    await expect(
      page.locator('[data-shop-section="reward-shop"]'),
    ).toHaveAttribute("data-item-count", "0");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/challenges");
    });
    await expectChallengesWidgetContracts(page, "manual");
    await expectNoMainStrings(
      page,
      challengesBlockedDemoStrings,
      "challenges manual",
    );
    await expect(
      page.locator('[data-challenges-section="challenge-board"]'),
    ).toHaveAttribute("data-item-count", "0");
  });

  test("keeps settings export and backup disabled until persistence exists", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/settings");
    });

    await expectSettingsWidgetContracts(page, "manual");
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Reset local changes" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Export data" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Backup settings" }),
    ).toBeDisabled();
    await expect(
      page.getByText(/local UI preview state only/i).first(),
    ).toBeVisible();

    await page
      .locator('[data-settings-section="appearance"]')
      .getByRole("button", { name: "Compact" })
      .click();
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Reset local changes" }),
    ).toBeEnabled();
  });
});

const lifeOverviewBlockedDemoStrings = [
  "Wochenreflexion: mehr Ruhe nach Coding-Block",
  "Gedanke zu neuer Knowledge-Idee",
  "Laufschuhe Ersatz",
  "MacBook Pro Upgrade",
  "Severance",
  "Atomic Habits",
  "7-day review trace",
  "5 loose notes kept",
  "5 decisions open",
] as const;

const journalBlockedDemoStrings = [
  "Wochenreflexion: mehr Ruhe nach Coding-Block",
  "Abendnotiz: zu viele offene Loops",
  "Check-in: stabil, aber mental voll",
  "Gedanke nach Training",
  "Was hat heute unnoetig mentalen Druck erzeugt?",
  "4 entries this week",
  "Stable",
] as const;

const notesBlockedDemoStrings = [
  "Gedanke zu neuer Knowledge-Idee",
  "Warum Entertainment eher Sammlung als To-do sein sollte",
  "Zitat aus Podcast merken",
  "Persönlicher Gedanke, nicht als Task geeignet",
  "Idee fuer Inventory-Budget-Ansicht",
  "5 shown",
] as const;

const entertainmentBlockedDemoStrings = [
  "Severance",
  "Atomic Habits",
  "Dune: Part Two",
  "YouTube: Design Systems Talk",
  "Cyberpunk 2077",
  "Podcast: Lenny",
  "2 shown",
] as const;

const inventoryBlockedDemoStrings = [
  "Monitor Arm",
  "Noise-Cancelling Headphones",
  "Software-Abo pruefen",
  "MacBook Pro Upgrade",
  "Schreibtischlampe",
  "USB-C Dock",
  "€95",
  "€240",
  "€2,400",
] as const;

async function expectLifeOverviewContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-life-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="personal-check-in"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="life-sections"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="loose-notes"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="inventory-focus"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="entertainment-shelf"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="recent-activity"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-life-section="personal-signals"]'),
    profile,
    "4",
  );
}

async function expectJournalContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-journal-section="page"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-journal-section="writing-focus"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-journal-section="recent-entries"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-journal-section="reflection-prompts"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-journal-section="journal-pattern"]'),
    profile,
    "3",
  );
}

async function expectNotesContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-notes-section="page"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-notes-section="brain-dump-history"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-notes-section="note-composer"]'),
    profile,
    "1",
  );
  await expectWidgetContract(
    page.locator('[data-notes-section="note-types"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-notes-section="capture-sources"]'),
    profile,
    "3",
  );
}

async function expectEntertainmentContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-entertainment-section="page"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-entertainment-section="shelf"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-entertainment-section="current-media"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-entertainment-section="wishlist"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-entertainment-section="finished-paused"]'),
    profile,
    "5",
  );
}

async function expectInventoryContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-inventory-section="page"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-inventory-section="inventory-wishlist"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-inventory-section="wishlist-decisions"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-inventory-section="owned-items"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-inventory-section="budget-summary"]'),
    profile,
    "4",
  );
}

test.describe("Life content states", () => {
  test("keeps demo Life routes as curated references", async ({ page }) => {
    await setProfile(page, "demo");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/life");
    });
    await expectLifeOverviewContracts(page, "demo");
    await expect(
      page.getByText("Wochenreflexion: mehr Ruhe nach Coding-Block").first(),
    ).toBeVisible();

    await page.goto("/life/journal");
    await expectJournalContracts(page, "demo");
    await expect(
      page.getByText("Abendnotiz: zu viele offene Loops").first(),
    ).toBeVisible();

    await page.goto("/life/notes");
    await expectNotesContracts(page, "demo");
    await expect(
      page.getByText("Gedanke zu neuer Knowledge-Idee").first(),
    ).toBeVisible();

    await page.goto("/life/entertainment");
    await expectEntertainmentContracts(page, "demo");
    await expect(page.getByText("Severance").first()).toBeVisible();

    await page.goto("/life/inventory");
    await expectInventoryContracts(page, "demo");
    await expect(page.getByText("MacBook Pro Upgrade").first()).toBeVisible();
  });

  test("renders empty Life overview with section cards and no demo leaks", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/life");
    });

    await expectLifeOverviewContracts(page, "empty");
    await expect(page.locator('[data-life-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expectNoMainStrings(page, lifeOverviewBlockedDemoStrings, "/life");
    await expect(
      page.getByText("Noch kein persönlicher Check-in"),
    ).toBeVisible();
    await expect(page.getByText("Keine persönliche Aktivität")).toBeVisible();
    for (const sectionTitle of [
      "Journal",
      "Notes",
      "Entertainment",
      "Inventory",
    ]) {
      await expect(
        page
          .locator('[data-life-section="life-sections"]')
          .getByRole("heading", { name: sectionTitle }),
      ).toBeVisible();
    }
  });

  test("renders empty Life child pages without demo or stub leaks", async ({
    page,
  }) => {
    await setProfile(page, "empty");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/life/journal");
    });
    await expectJournalContracts(page, "empty");
    await expectNoMainStrings(page, journalBlockedDemoStrings, "/life/journal");
    await expect(page.getByText("Noch kein Schreibfokus")).toBeVisible();
    await expect(page.getByText("Noch keine Journal-Einträge")).toBeVisible();
    await expect(page.getByText("Keine offenen Prompts")).toBeVisible();
    await expect(page.getByText("Noch keine Einträge.")).toHaveCount(0);

    await page.goto("/life/notes");
    await expectNotesContracts(page, "empty");
    await expectNoMainStrings(page, notesBlockedDemoStrings, "/life/notes");
    await expect(
      page.getByText("Noch keine losen Notizen").first(),
    ).toBeVisible();
    await expect(page.getByText("Notiz erfassen")).toBeVisible();
    await expect(page.getByText("Noch keine Notiztypen")).toBeVisible();
    await expect(page.getByText("Noch keine Quellen")).toBeVisible();

    await page.goto("/life/entertainment");
    await expectEntertainmentContracts(page, "empty");
    await expectNoMainStrings(
      page,
      entertainmentBlockedDemoStrings,
      "/life/entertainment",
    );
    await expect(page.getByText("Noch keine Medien")).toBeVisible();
    await expect(page.getByText("Nichts aktuell")).toBeVisible();
    await expect(page.getByText("Keine Merkliste")).toBeVisible();
    await expect(
      page.getByText("Keine abgeschlossenen oder pausierten Medien"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open media" })).toHaveCount(
      0,
    );

    await page.goto("/life/inventory");
    await expectInventoryContracts(page, "empty");
    await expectNoMainStrings(
      page,
      inventoryBlockedDemoStrings,
      "/life/inventory",
    );
    await expectNoMainStrings(
      page,
      ["€95", "€240", "€2,400"],
      "/life/inventory",
    );
    await expect(page.getByText("Noch keine Inventareinträge")).toBeVisible();
    await expect(page.getByText("Keine Wishlist-Entscheidungen")).toBeVisible();
    await expect(page.getByText("Keine Besitz-Einträge")).toBeVisible();
    await expect(
      page.getByText("Budget Fit ist nur ein manuelles Planungssignal."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review budget" }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Open item" })).toHaveCount(
      0,
    );
  });

  test("keeps manual Life routes empty until a durable local source exists", async ({
    page,
  }) => {
    await setProfile(page, "manual");

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/life");
    });
    await expectLifeOverviewContracts(page, "manual");
    await expectNoMainStrings(page, lifeOverviewBlockedDemoStrings, "/life");
    await expect(page.locator('[data-life-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );

    await page.goto("/life/journal");
    await expectJournalContracts(page, "manual");
    await expectNoMainStrings(page, journalBlockedDemoStrings, "/life/journal");
    await expect(page.locator('[data-journal-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );

    await page.goto("/life/notes");
    await expectNotesContracts(page, "manual");
    await expectNoMainStrings(page, notesBlockedDemoStrings, "/life/notes");

    await page.goto("/life/entertainment");
    await expectEntertainmentContracts(page, "manual");
    await expectNoMainStrings(
      page,
      entertainmentBlockedDemoStrings,
      "/life/entertainment",
    );

    await page.goto("/life/inventory");
    await expectInventoryContracts(page, "manual");
    await expectNoMainStrings(
      page,
      inventoryBlockedDemoStrings,
      "/life/inventory",
    );
  });
});

const healthOverviewBlockedDemoStrings = [
  "18.4 km",
  "5:42 / km",
  "6.2 km",
  "Evening shutdown",
  "Tue · Full body",
  "Thu · 6.5 km easy run",
  "Morning Routine",
  "Easy Run",
  "Training Session",
] as const;

const mentalHealthBlockedDemoStrings = [
  "5-minute self-check",
  "Steady",
  "Mood Pattern",
  "Tension rose after long focus blocks",
  "Walk reset after deep work",
  "Social boundary",
  "Wind-down",
  "Do not interpret empty data",
] as const;

const habitsBlockedDemoStrings = [
  "78%",
  "54 / 69",
  "Evening fragile",
  "Morning routine",
  "Water target",
  "Study block",
  "Evening shutdown",
  "Start next repair",
  "No habit signals yet",
] as const;

const runningBlockedDemoStrings = [
  "18.6 / 24 km",
  "readiness 72%",
  "Easy run / walk",
  "Run / walk - 30 min",
  "Last run",
  "4.8 km",
  "6:18 / km",
  "Schedule for 17:30",
] as const;

const strengthBlockedDemoStrings = [
  "2 / 3",
  "76%",
  "Full body · technique focus",
  "Full body · 45 min",
  "stop before form breaks",
  "Goblet squat",
  "Cable row",
  "Last session",
  "upper body · 42 min",
] as const;

async function expectHealthOverviewContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-health-section="page"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-health-section="schedule"]'),
    profile,
    "10",
  );
  await expectWidgetContract(
    page.locator('[data-health-section="mental"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-health-section="running"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-health-section="habits"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-health-section="strength"]'),
    profile,
    "3",
  );
}

async function expectMentalHealthContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-mental-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="check-in"]'),
    profile,
    "5",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="mood-pattern"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="current-signal"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="sleep-recovery"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="journal-reflection"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="support-routines"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-mental-section="actions"]'),
    profile,
    "7",
  );
}

async function expectHabitsContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-habits-section="page"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-habits-section="summary"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-habits-section="heatmap"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-habits-section="pattern-table"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-habits-section="repair-loops"]'),
    profile,
    "3",
  );
  await expectWidgetContract(
    page.locator('[data-habits-section="today-schedule"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-habits-section="detail-focus"]'),
    profile,
    "1",
  );
}

async function expectRunningContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-running-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-running-section="summary"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-running-section="planner"]').first(),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-running-section="today-plan"]').first(),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-running-section="review"]').first(),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-running-section="rhythm"]').first(),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-running-section="load-recovery"]').first(),
    profile,
    "3",
  );
}

async function expectStrengthContracts(page: Page, profile: ProfileId) {
  await expectWidgetContract(
    page.locator('[data-strength-section="page"]'),
    profile,
    "8",
  );
  await expectWidgetContract(
    page.locator('[data-strength-section="summary"]'),
    profile,
    "6",
  );
  await expectWidgetContract(
    page.locator('[data-strength-section="planner"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-strength-section="today-plan"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-strength-section="review"]'),
    profile,
    "4",
  );
  await expectWidgetContract(
    page.locator('[data-strength-section="rhythm"]'),
    profile,
    "7",
  );
  await expectWidgetContract(
    page.locator('[data-strength-section="load-recovery"]'),
    profile,
    "4",
  );
}

test.describe("Health and Fitness content states", () => {
  test("keeps demo Health overview as the filled reference", async ({
    page,
  }) => {
    await setProfile(page, "demo");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health");
    });

    await expectHealthOverviewContracts(page, "demo");
    await expect(page.locator('[data-health-section="page"]')).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(page.getByText("Thu · 6.5 km easy run")).toBeVisible();
    await expect(page.getByText("Tue · Full body")).toBeVisible();
  });

  test("renders empty Health overview without demo health data", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health");
    });

    await expectHealthOverviewContracts(page, "empty");
    await expectNoMainStrings(
      page,
      healthOverviewBlockedDemoStrings,
      "health overview",
    );
    await expect(page.locator('[data-health-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Noch kein Health-Zeitplan")).toBeVisible();
    await expect(page.getByText("Noch kein Laufkontext").first()).toBeVisible();
    await expect(
      page.getByText("Noch kein Krafttrainingskontext").first(),
    ).toBeVisible();
  });

  test("projects existing manual mood and habits into Health overview", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      habits: [manualHabit(1)],
      mood: {
        label: "Focused",
        updatedAt: "2026-06-24T08:00:00.000Z",
      },
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health");
    });

    await expectHealthOverviewContracts(page, "manual");
    await expectNoMainStrings(
      page,
      healthOverviewBlockedDemoStrings,
      "health overview",
    );
    await expect(page.locator('[data-health-section="page"]')).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(
      page.locator('[data-health-section="mental"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.locator('[data-health-section="habits"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(page.getByText("Manual Habit 1").first()).toBeVisible();
    await expect(page.getByText("Focused").first()).toBeVisible();
  });

  test("renders empty Mental Health shell without demo actions", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/mental");
    });

    await expectMentalHealthContracts(page, "empty");
    await expectNoMainStrings(
      page,
      mentalHealthBlockedDemoStrings,
      "mental health",
    );
    await expect(page.locator('[data-mental-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Noch kein Check-in").first()).toBeVisible();
    await expect(
      page.getByText("Noch kein Stimmungsverlauf").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Noch keine Schlafdaten").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Noch keine Mental-Health-Aktionen").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open check-in" }),
    ).toBeDisabled();
  });

  test("renders empty Habits shell and manual partial habit rows", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/habits");
    });

    await expectHabitsContracts(page, "empty");
    await expectNoMainStrings(page, habitsBlockedDemoStrings, "habits");
    await expect(page.locator('[data-habits-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(
      page.getByText("Noch keine Habit-Signale").first(),
    ).toBeVisible();
    await expect(page.getByText("Noch keine Repair Loops")).toBeVisible();
    await expect(page.getByText("Noch kein Habit-Zeitplan")).toBeVisible();

    await setProfile(page, "manual");
    await writeManualProfile({
      habits: [manualHabit(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/habits");
    });

    await expectHabitsContracts(page, "manual");
    await expectNoMainStrings(page, habitsBlockedDemoStrings, "habits");
    await expect(page.locator('[data-habits-section="page"]')).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(
      page.locator('[data-habits-section="pattern-table"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(page.getByText("Manual Habit 1").first()).toBeVisible();
  });

  test("renders empty Running tracker without fake run plans", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/running");
    });

    await expectRunningContracts(page, "empty");
    await expectNoMainStrings(page, runningBlockedDemoStrings, "running");
    await expect(page.locator('[data-running-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(
      page
        .getByRole("region", { name: "Beginner Run Planner" })
        .getByText("Noch kein Laufkontext")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Today Run Plan" })
        .getByText("Noch kein Laufplan"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Recent Run Review" })
        .getByText("Noch kein letzter Lauf")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Recent Runs" })
        .getByText("Noch keine letzten Läufe"),
    ).toBeVisible();
  });

  test("renders empty Strength tracker without fake session plans", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/strength");
    });

    await expectStrengthContracts(page, "manual");
    await expectNoMainStrings(page, strengthBlockedDemoStrings, "strength");
    await expect(
      page.locator('[data-strength-section="page"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page
        .getByRole("region", { name: "Strength Session Planner" })
        .getByText("Noch kein Krafttrainingskontext")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Today Strength Plan" })
        .getByText("Noch keine Kraftsession geplant")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Recent Session Review" })
        .getByText("Noch keine letzte Session")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Recent Sets compact log" })
        .getByText("Noch keine Sets"),
    ).toBeVisible();
  });
});
