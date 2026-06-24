import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

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
