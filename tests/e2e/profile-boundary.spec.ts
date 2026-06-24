import { rm } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const manualProfilePath = join(
  process.cwd(),
  ".local",
  "life-os",
  "manual-profile.json",
);
const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

const blockedDemoStrings = [
  "Steady",
  "5-minute self-check",
  "10-minute walk after deep work",
  "Mood Pattern",
  "Repair Routines",
  "Today Signal",
  "Life OS App",
  "Masterarbeit",
  "Finanzinformatik",
  "Literature source deadline",
  "Literature source deadline klären",
  "Calendar page implementieren",
  "Portfolio page in Figma finalisieren",
  "Weekly review vorbereiten",
  "Hyperskill",
  "Data access setup question",
  "Article on calm dashboards",
  "Water",
  "Coffee",
  "Skyr",
  "Skyr with oats and berries",
  "Protein Bowl",
  "Agent Workflow",
  "Data model notes",
  "No local entry",
  "No local data",
  "Manual-Profil: Noch keine lokalen Daten",
  "Manual profile has no",
] as const;

const areaShellRoutes = [
  ["/resources", "Resources"],
  ["/health", "Health & Fitness"],
  ["/health/habits", "Habits"],
  ["/health/running", "Running Tracker"],
  ["/health/strength", "Strength Tracker"],
  ["/nutrition", "Nutrition"],
  ["/nutrition/meal-planner", "Meal Planner"],
  ["/nutrition/recipes", "Recipes"],
  ["/nutrition/grocery", "Grocery"],
  ["/coding", "Coding"],
  ["/coding/repositories", "Repositories"],
  ["/coding/agents", "Agent Hub"],
  ["/coding/skill-map", "Skill Map"],
  ["/coding/knowledge", "Coding Knowledge"],
  ["/life", "Life"],
  ["/life/journal", "Journal"],
  ["/life/notes", "Notes"],
  ["/life/entertainment", "Entertainment"],
  ["/life/entertainment/games", "Games"],
  ["/life/entertainment/books", "Books"],
  ["/life/entertainment/series", "Series"],
  ["/life/entertainment/movies", "Movies"],
  ["/life/inventory", "Inventory"],
  ["/education", "Education"],
  ["/education/scientific-work", "Scientific Work"],
  ["/education/literature", "Literature"],
  ["/education/learning-log", "Learning Log"],
  ["/work", "Work"],
  ["/work/log", "Work Log"],
  ["/work/wiki", "Wiki"],
  ["/shop", "Shop"],
  ["/challenges", "Challenges"],
] as const;

async function resetManualProfileFile() {
  await rm(manualProfilePath, { force: true });
}

async function setProfile(page: Page, profile: "demo" | "empty" | "manual") {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: profile,
      url: playwrightBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function expectNoBlockedDemoStrings(page: Page) {
  const mainText = await page.getByRole("main").innerText();

  for (const blocked of blockedDemoStrings) {
    expect(mainText, `blocked demo string visible: ${blocked}`).not.toContain(
      blocked,
    );
  }
}

async function expectNoTechnicalEmptyCopy(page: Page) {
  const bodyText = await page.locator("body").innerText();

  for (const blocked of [
    "No local entry",
    "No local data",
    "Manual-Profil: Noch keine lokalen Daten",
    "Manual profile has no",
  ] as const) {
    expect(bodyText, `technical empty copy visible: ${blocked}`).not.toContain(
      blocked,
    );
  }
}

async function expectTextAtMostOnce(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true })).toHaveCount(
    await page
      .getByText(text, { exact: true })
      .count()
      .then((count) => (count > 0 ? 1 : 0)),
  );
}

async function expectHealthNaturalEmptyStates(page: Page) {
  await expectNoTechnicalEmptyCopy(page);

  for (const text of [
    "Noch keine Check-ins",
    "Noch keine Routinen",
    "Noch keine Laufeinheiten",
    "Noch keine Krafteinheiten",
    "Noch kein Health-Zeitplan",
  ] as const) {
    await expectTextAtMostOnce(page, text);
  }
}

async function expectResourcesNaturalEmptyStates(page: Page) {
  await expectNoTechnicalEmptyCopy(page);

  for (const text of [
    "Noch keine Ressourcen",
    "Noch keine Ressource im Inspector",
    "Noch keine Learnings",
  ] as const) {
    await expectTextAtMostOnce(page, text);
  }

  await expect(
    page
      .getByRole("main")
      .getByText("Keine Review-Punkte offen", { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(1);
}

async function expectAreaShell(page: Page, heading: string) {
  await expect(
    page.getByRole("heading", { level: 1, name: heading }),
  ).toBeVisible();
  await expectNoGenericProfileBoundary(page);
}

async function expectMentalHealthBaseShell(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: "Mental Health" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Today Check-In" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current Signal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sleep & Recovery" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Journal / Reflection Rhythm" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mental Health Actions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Safety & Boundaries" }),
  ).toBeVisible();
}

async function expectNoGenericProfileBoundary(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Profile Data Source" }),
  ).toHaveCount(0);
  await expect(page.getByText("Profile boundary")).toHaveCount(0);
}

async function expectNoMentalHealthFixtureSignals(page: Page) {
  const bodyText = await page.locator("body").innerText();

  for (const blocked of [
    "Calm and social signals are visible",
    "Walk reset after deep work",
    "Midday repair before the next deep-work block",
    "7h 18m",
    "4 / 7 days",
    "Mood Pattern",
    "Repair Routines",
    "5-minute self-check",
  ] as const) {
    expect(
      bodyText,
      `mental health fixture signal visible: ${blocked}`,
    ).not.toContain(blocked);
  }
}

async function submitPanel(panel: Locator, buttonName: string) {
  const titleInput = panel.getByLabel("Title").first();

  await panel.getByRole("button", { name: buttonName }).click();
  await expect(titleInput).toHaveValue("");
}

async function debugTextMatches(page: Page, text: string) {
  const matches = await page.getByText(text).evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const element = node as HTMLElement;
      const section = element.closest("section");
      const main = element.closest("main");

      return {
        index,
        visible: Boolean(
          element.offsetWidth ||
          element.offsetHeight ||
          element.getClientRects().length,
        ),
        text: element.textContent,
        sectionText: section?.textContent?.slice(0, 500) ?? null,
        mainText: main?.textContent?.slice(0, 500) ?? null,
        className: element.getAttribute("class"),
      };
    }),
  );

  console.log(JSON.stringify({ text, matches }, null, 2));
}

async function expectManualTextNotVisible(
  page: Page,
  route: string,
  text: string,
) {
  try {
    await expect(page.getByText(text).filter({ visible: true })).toHaveCount(0);
  } catch (error) {
    console.log("reset verification route", route);
    await debugTextMatches(page, text);
    throw error;
  }
}

async function resetManualProfileFromSettings(page: Page) {
  await page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Manual Profile Reset" }),
    })
    .getByRole("button", { name: "Reset manual local profile" })
    .click();

  const profilePanel = panelByHeading(page, "Profile Data Source");
  await expect(profilePanel).toContainText(/Tasks\s*0/);
  await expect(profilePanel).toContainText(/Inbox\s*0/);
  await expect(profilePanel).toContainText(/Projects\s*0/);
  await expect(profilePanel).toContainText(/Goals\s*0/);
}

function panelByHeading(page: Page, heading: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading }) })
    .first();
}

test.beforeEach(async () => {
  await resetManualProfileFile();
});

test.afterEach(async () => {
  await resetManualProfileFile();
});

test.describe("Profile boundary", () => {
  test.describe.configure({ mode: "serial" });

  test("keeps Demo profile as the V5 fixture reference", async ({ page }) => {
    await setProfile(page, "demo");
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/portfolio");
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio" }),
    ).toBeVisible();
    await expect(page.getByText("Life OS App").first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeAttached();
    await expect(
      page.getByText(/Good (morning|afternoon|evening), Anton/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Today Agenda" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Daily Control" }),
    ).toBeVisible();

    await page.goto("/health/mental");
    await expectMentalHealthBaseShell(page);
    await expect(
      page.getByRole("heading", { name: "Mood Pattern" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Repair Routines" }),
    ).toBeVisible();
    await expectNoGenericProfileBoundary(page);
    await expect(page.getByText("Walk reset after deep work")).toBeVisible();
  });

  test("hides blocked Demo strings in Empty profile core routes", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const route of [
      "/dashboard",
      "/portfolio",
      "/inbox",
      "/tasks",
      "/projects",
      "/goals",
      "/review/daily",
    ]) {
      await page.goto(route);
      await expectNoBlockedDemoStrings(page);
    }

    await page.goto("/health/mental");
    await expectMentalHealthBaseShell(page);
    await expect(
      page.getByRole("heading", { name: "Local Signal Pattern" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Local Support Routines" }),
    ).toBeVisible();
    await expectNoGenericProfileBoundary(page);
    await expectNoBlockedDemoStrings(page);
    await expectNoMentalHealthFixtureSignals(page);
    await expect(
      page.getByText("Noch kein Signal fuer eine Interpretation."),
    ).toBeVisible();

    for (const [route, heading] of areaShellRoutes) {
      await page.goto(route);
      await expectAreaShell(page, heading);
      await expectNoBlockedDemoStrings(page);
    }

    await page.goto("/health");
    await expectAreaShell(page, "Health & Fitness");
    await expectHealthNaturalEmptyStates(page);

    await page.goto("/resources");
    await expectAreaShell(page, "Resources");
    await expectResourcesNaturalEmptyStates(page);

    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText("No entities match this scope")).toBeVisible();
    await expectNoBlockedDemoStrings(page);
  });

  test("projects Manual local entries without leaking Demo data, then resets", async ({
    page,
  }) => {
    const manualTask = "R1.1 Manual Task";
    const manualProject = "R1.1 Manual Project";
    const manualGoal = "R1.1 Manual Goal";
    const manualInbox = "R1.1 Manual Inbox";

    await setProfile(page, "manual");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/settings");

    await expect(page.getByText("Aktives Profil: manual")).toBeVisible();

    const taskPanel = panelByHeading(page, "Manual Task");
    await taskPanel.getByLabel("Title").fill(manualTask);
    await taskPanel.getByLabel("Date").fill("2026-06-24");
    await taskPanel.getByLabel("Start time").fill("20:00");
    await taskPanel.getByLabel("Duration").fill("30");
    await taskPanel.getByLabel("Priority").selectOption("P1");
    await taskPanel.getByLabel("Next step").fill("Execute the manual task.");
    await submitPanel(taskPanel, "Create task");
    await expect(page.getByText("Aktives Profil: manual")).toBeVisible();

    const inboxPanel = panelByHeading(page, "Manual Inbox Item");
    await inboxPanel.getByLabel("Title").fill(manualInbox);
    await inboxPanel
      .getByRole("textbox", { name: "Note" })
      .fill("Manual inbox capture.");
    await submitPanel(inboxPanel, "Create inbox item");
    await expect(page.getByText("Aktives Profil: manual")).toBeVisible();

    const projectPanel = panelByHeading(page, "Manual Project");
    await projectPanel.getByLabel("Title").fill(manualProject);
    await projectPanel.getByLabel("Deadline").fill("2026-06-24");
    await projectPanel.getByLabel("Next step").fill("Move the project once.");
    await submitPanel(projectPanel, "Create project");
    await expect(page.getByText("Aktives Profil: manual")).toBeVisible();

    const goalPanel = panelByHeading(page, "Manual Goal");
    await goalPanel.getByLabel("Title").fill(manualGoal);
    await goalPanel.getByLabel("Measure").fill("Manual goal exists");
    await goalPanel.getByLabel("Target").fill("Visible in profile routes");
    await goalPanel.getByLabel("Next step").fill("Review the local goal.");
    await submitPanel(goalPanel, "Create goal");
    await expect(page.getByText("Aktives Profil: manual")).toBeVisible();

    for (const [route, visibleText] of [
      ["/dashboard", manualTask],
      ["/today", manualTask],
      ["/calendar", manualTask],
      ["/portfolio?view=tasks", manualTask],
      ["/tasks", manualTask],
      ["/projects", manualProject],
      ["/goals", manualGoal],
      ["/inbox", manualInbox],
    ] as const) {
      await page.goto(route);
      await expect(page.getByText(visibleText).first()).toBeVisible();
      await expectNoBlockedDemoStrings(page);
    }

    await page.goto("/health/mental");
    await expectMentalHealthBaseShell(page);
    await expect(
      page.getByRole("heading", { name: "Local Signal Pattern" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Local Support Routines" }),
    ).toBeVisible();
    await expectNoGenericProfileBoundary(page);
    await expectNoBlockedDemoStrings(page);
    await expectNoMentalHealthFixtureSignals(page);
    await expect(page.getByText("Manual local profile")).toBeVisible();
    await expectNoTechnicalEmptyCopy(page);

    for (const [route, heading] of [
      ["/resources", "Resources"],
      ["/health/habits", "Habits"],
      ["/nutrition/grocery", "Grocery"],
      ["/coding/repositories", "Repositories"],
      ["/life/journal", "Journal"],
      ["/education/learning-log", "Learning Log"],
      ["/work/log", "Work Log"],
      ["/shop", "Shop"],
      ["/challenges", "Challenges"],
    ] as const) {
      await page.goto(route);
      await expectAreaShell(page, heading);
      await expectNoBlockedDemoStrings(page);
    }

    await page.goto("/health");
    await expectAreaShell(page, "Health & Fitness");
    await expectHealthNaturalEmptyStates(page);

    await page.goto("/resources");
    await expectAreaShell(page, "Resources");
    await expectResourcesNaturalEmptyStates(page);

    await page.goto("/settings");
    await resetManualProfileFromSettings(page);

    for (const route of ["/portfolio", "/dashboard"] as const) {
      await page.goto(route);
      await expectManualTextNotVisible(page, route, manualTask);
      await expectManualTextNotVisible(page, route, manualProject);
      await expectManualTextNotVisible(page, route, manualGoal);
      await expectNoBlockedDemoStrings(page);
    }
  });
});
