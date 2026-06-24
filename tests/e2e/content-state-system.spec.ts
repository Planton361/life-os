import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

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

function manualMeal(
  type: "Breakfast" | "Lunch" | "Dinner",
  index: number,
) {
  return {
    id: `meal-${type.toLowerCase()}`,
    kcal: `${480 + index * 40} kcal`,
    macros: [`P ${30 + index}g`, `C ${44 + index}g`, `F ${12 + index}g`],
    name: `Manual ${type}`,
    state: "planned",
    time:
      type === "Breakfast" ? "08:00" : type === "Lunch" ? "12:30" : "19:00",
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
  const states = await page.locator("[data-content-state]").evaluateAll((nodes) =>
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

async function expectNoMainStrings(
  page: Page,
  blockedStrings: readonly string[],
  scope: string,
) {
  const mainText = await page.getByRole("main").innerText();

  for (const blocked of blockedStrings) {
    expect(mainText, `${scope} blocked string visible: ${blocked}`).not.toContain(
      blocked,
    );
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

async function expectNoResourceKpiLeaks(page: Page) {
  const summary = page.locator('[data-resources-section="summary"]');

  for (const value of ["128", "12", "34", "9", "21", "46"]) {
    await expect(summary.getByText(value, { exact: true })).toHaveCount(0);
  }
}

async function expectNoHydrationErrors(page: Page, action: () => Promise<void>) {
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
    await expect(page.getByText("Skyr with oats and berries").first()).toBeVisible();

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
    await expect(page.getByRole("button", { name: "Save week" })).toBeDisabled();

    await page.goto("/nutrition/recipes");
    await expect(page.locator("#recipes-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Noch keine Rezepte")).toBeVisible();
    await expect(page.getByText("Kein Rezept ausgewählt")).toBeVisible();
    await expect(page.getByRole("button", { name: "New recipe" })).toBeDisabled();

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
    await expect(page.getByText(/Good (morning|afternoon|evening), Anton/)).toBeVisible();
    await expect(page.locator("header").getByText("Week").first()).toBeVisible();
    await expect(page.locator("header").getByText("Month").first()).toBeVisible();
    await expect(page.locator("header").getByText("Year").first()).toBeVisible();
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

    await expect(page.getByRole("link", { name: /Sleep: No data/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tracke deinen Schlaf/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Review Status: No review/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Capturing/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Nutrition: No plan/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create Plan/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kein aktueller Fokus/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create task/ })).toBeVisible();
    await expect(page.getByText("Keine Mahlzeit")).toHaveCount(3);
    await expect(page.getByRole("region", { name: "Meals Today" })).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByRole("region", { name: "Today Agenda" })).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByRole("region", { name: "Habit Trackers" })).toHaveAttribute("data-item-count", "0");
    await expect(page.getByRole("region", { name: "Active Portfolio" })).toHaveAttribute("data-item-count", "0");
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
    await expect(page.getByRole("region", { name: "Meals Today" })).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByRole("region", { name: "Today Agenda" })).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByRole("region", { name: "Habit Trackers" })).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByRole("region", { name: "Active Portfolio" })).toHaveAttribute("data-content-state", "empty");
  });

  test("captures a manual quick thought into inbox", async ({ page }) => {
    const thought = "Manual dashboard quick thought";

    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });
    await page.getByRole("textbox", { name: "Quick Thought" }).fill(thought);
    await page.getByLabel("Capture type").selectOption("Note");
    await page.getByRole("button", { name: "Capture" }).click();
    await expect(page.getByText("Gespeichert. Der Eintrag liegt in der Inbox.")).toBeVisible();

    await page.goto("/inbox");
    await expect(page.getByText(thought).first()).toBeVisible();
  });

  test("projects a manual 20:00 task into Today Agenda", async ({ page }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      tasks: [manualTimedTask()],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });

    await expectOnlyProductContentStates(page);
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda).toHaveAttribute("data-content-state", "partial");
    await expect(
      todayAgenda.getByRole("link", {
        name: /Open agenda item: Manual 20:00 Agenda Task|Manual 20:00 Agenda Task/,
      }),
    ).toBeVisible();
    await expect(todayAgenda.getByText(/20:00[–-]20:30/)).toBeVisible();
  });

  test("reports habit and active portfolio capacity states", async ({ page }) => {
    await setProfile(page, "manual");

    await writeManualProfile({});
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/dashboard");
    });
    await expectOnlyProductContentStates(page);
    await expect(page.getByRole("region", { name: "Habit Trackers" })).toHaveAttribute("data-item-count", "0");
    await expect(page.getByRole("region", { name: "Active Portfolio" })).toHaveAttribute("data-item-count", "0");

    await writeManualProfile({
      habits: [manualHabit(1)],
      projects: [manualProject(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.reload();
    });
    await expectOnlyProductContentStates(page);
    await expect(page.getByRole("region", { name: "Habit Trackers" })).toHaveAttribute("data-content-state", "partial");
    await expect(page.getByRole("region", { name: "Active Portfolio" })).toHaveAttribute("data-content-state", "partial");
    await expect(page.getByRole("region", { name: "Meals Today" })).toHaveAttribute("data-content-state", "empty");

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
    await expect(page.getByRole("region", { name: "Habit Trackers" })).toHaveAttribute("data-content-state", "filled");
    await expect(page.getByRole("region", { name: "Active Portfolio" })).toHaveAttribute("data-content-state", "filled");
    await expect(page.getByRole("region", { name: "Meals Today" })).toHaveAttribute("data-content-state", "filled");
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
    await expect(
      page.locator('[data-inbox-section="queue"]'),
    ).toHaveAttribute("data-content-state", "filled");
    await expect(page.getByText("Data access setup question").first()).toBeVisible();
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
    await expect(
      page.locator('[data-inbox-section="queue"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByText("Inbox ist leer", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Capture Gedanken, Aufgaben oder Fragen, wenn sie entstehen."),
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
    await expect(aiAssistant.getByRole("button", { name: "Apply" })).toBeDisabled();

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
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });

    await expectInboxWidgetContracts(page, "manual");
    await expectNoInboxDemoStrings(page);
    await expect(page.locator("#inbox-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Inbox ist leer", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("textbox", { exact: true, name: "Quick Capture" }),
    ).toBeEnabled();
  });

  test("captures a manual inbox item from the inbox page", async ({ page }) => {
    const title = "Manual inbox page capture";

    await setProfile(page, "manual");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
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
      "partial",
    );
    await expect(
      page.locator('[data-inbox-section="queue"]'),
    ).toHaveAttribute("data-item-count", "1");
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(
      page.locator('[data-inbox-section="active-item"]'),
    ).toHaveAttribute("data-content-state", "filled");
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
    await expect(page.locator("#today-page")).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Manual").first()).toBeVisible();
    await expect(page.getByText("Noch keine Tagesereignisse")).toBeVisible();
    await expect(
      page.locator('[data-today-section="opening-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.locator('[data-today-section="closing-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
  });

  test("projects manual today data without demo fallback", async ({ page }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      inboxItems: [manualTodayInboxItem()],
      projects: [manualProject(1)],
      tasks: [manualTimedTask()],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/today");
    });

    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    await expect(page.locator("#today-page")).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.locator('[data-today-section="activity-stream"]'),
    ).toHaveAttribute("data-item-count", "2");
    await expect(page.getByText("Manual 20:00 Agenda Task").first()).toBeVisible();
    await expect(page.getByText("Manual Today Inbox Capture").first()).toBeVisible();
    await expect(page.getByText("Manual Project 1").first()).toBeVisible();
    await expect(
      page.locator('[data-today-section="carry-forward"]'),
    ).toHaveAttribute("data-content-state", "partial");
    await expect(
      page.locator('[data-today-section="opening-review"]'),
    ).toHaveAttribute("data-content-state", "empty");
    await expect(
      page.locator('[data-today-section="closing-review"]'),
    ).toHaveAttribute("data-content-state", "empty");

    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Today Agenda" })).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(page.getByText("Manual 20:00 Agenda Task").first()).toBeVisible();
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
    await expect(page.locator('[data-calendar-section="page"]')).toHaveAttribute(
      "data-content-state",
      "filled",
    );
    await expect(page.getByText("Deep Work: Masterarbeit").first()).toBeVisible();
    await expect(page.getByText("Literature source deadline").first()).toBeVisible();
  });

  test("renders empty calendar without demo blocks", async ({ page }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/calendar");
    });

    await expectCalendarWidgetContracts(page, "empty");
    await expectNoMainStrings(page, calendarBlockedDemoStrings, "calendar");
    await expect(page.locator('[data-calendar-section="week-grid"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await expect(page.getByText("Noch keine Termine oder Zeitblöcke")).toBeVisible();
    await expect(page.getByText("Keine ungeplanten Aufgaben")).toBeVisible();
  });

  test("projects manual timed tasks into the calendar grid", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      tasks: [manualTimedTask()],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/calendar");
    });

    await expectCalendarWidgetContracts(page, "manual");
    await expectNoMainStrings(page, calendarBlockedDemoStrings, "calendar");
    await expect(page.locator('[data-calendar-section="week-grid"]')).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(page.getByText("Manual 20:00 Agenda Task").first()).toBeVisible();
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
      await expect(page.getByText("Keine Entity ausgewählt").first()).toBeVisible();
    }
  });

  test("projects manual tasks, projects and goals without demo fallback", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await writeManualProfile({
      goals: [manualGoal(1)],
      projects: [manualProject(1)],
      tasks: [manualTimedTask()],
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
    await expect(page.getByText("Manual 20:00 Agenda Task").first()).toBeVisible();

    await page.goto("/portfolio?view=skills");
    await expect(page.getByText("Noch keine Skills im Portfolio")).toBeVisible();
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
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
    await expect(page.locator('[data-resources-section="summary"]').getByText("128")).toBeVisible();
  });

  test("renders empty resources without demo library or KPI leaks", async ({
    page,
  }) => {
    await setProfile(page, "empty");

    for (const route of ["/resources", "/resources?view=map", "/resources?view=review"]) {
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
      await expect(page.getByText("Keine Ressource ausgewählt").first()).toBeVisible();

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
    await expect(page.getByText("Keine Review-Punkte offen").first()).toBeVisible();
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
    await expect(page.getByText("Keine Ressource ausgewählt").first()).toBeVisible();
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
    await expect(page.locator('[data-health-section="mental"]')).toHaveAttribute(
      "data-content-state",
      "partial",
    );
    await expect(page.locator('[data-health-section="habits"]')).toHaveAttribute(
      "data-content-state",
      "partial",
    );
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
    await expect(page.getByText("Noch kein Stimmungsverlauf").first()).toBeVisible();
    await expect(page.getByText("Noch keine Schlafdaten").first()).toBeVisible();
    await expect(
      page.getByText("Noch keine Mental-Health-Aktionen").first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open check-in" })).toBeDisabled();
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
    await expect(page.getByText("Noch keine Habit-Signale").first()).toBeVisible();
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
    await expect(page.locator('[data-strength-section="page"]')).toHaveAttribute(
      "data-content-state",
      "empty",
    );
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
