import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  compareDashboardTasks,
  dashboardLocalDayProgress,
  dashboardTaskSelection,
} from "../../src/features/dashboard/dashboard-read-model";
import type { LifeTask } from "../../src/features/entities/types";

const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;

async function setProfile(page: Page, profile: "demo" | "empty" | "manual") {
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

function dashboardTask(id: string, input: Partial<LifeTask> = {}): LifeTask {
  return {
    areaId: "review",
    calendarBlockIds: [],
    createdAt: "2026-07-12T08:00:00.000Z",
    date: "2026-07-12",
    description: "",
    durationMinutes: 30,
    evidence: [],
    id,
    inboxItemIds: [],
    isGenerated: false,
    nextStep: "Open task",
    priority: "P2",
    reviewNeeded: false,
    status: "planned",
    timeline: [],
    title: id,
    type: "task",
    ...input,
  };
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;

    return {
      delta: Math.max(documentWidth, bodyWidth) - viewportWidth,
      documentWidth,
      bodyWidth,
      viewportWidth,
    };
  });

  expect(
    overflow.delta,
    `horizontal overflow detected: ${JSON.stringify(overflow)}`,
  ).toBeLessThanOrEqual(1);
}

async function isPartiallyVisible(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) {
    return false;
  }

  return (
    box.x < viewport.width &&
    box.x + box.width > 0 &&
    box.y < viewport.height &&
    box.y + box.height > 0
  );
}

async function saveScreenshot(page: Page, outputPath: string) {
  await mkdir(outputPath, { recursive: true });
  await page.screenshot({
    fullPage: false,
    path: join(
      outputPath,
      `dashboard-${page.viewportSize()?.width}x${page.viewportSize()?.height}.png`,
    ),
  });
}

test.describe("Dashboard viewport QA", () => {
  test("renders the V5 dashboard in a 2560x1440 viewport", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeAttached();

    await expect(page.locator("aside")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeVisible();
    await expect(page.locator("header")).toBeVisible();
    await expect(
      page.getByText(/Good (morning|afternoon|evening), Anton/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Daily Control" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Today Agenda" }),
    ).toBeVisible();

    const antiRot = page.getByRole("heading", {
      name: "Anti-Rot Actions / Bad Habit Reset Row",
    });
    const challenges = page.getByRole("heading", { name: "Challenges" });
    const bottomZoneVisible =
      (await isPartiallyVisible(page, antiRot)) ||
      (await isPartiallyVisible(page, challenges));

    expect(bottomZoneVisible).toBe(true);
    await expectNoHorizontalOverflow(page);
    await saveScreenshot(page, testInfo.outputPath("screenshots"));
  });

  test("captures an optional 1440x900 desktop screenshot", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Today Agenda" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await saveScreenshot(page, testInfo.outputPath("screenshots"));
  });
});

test.describe("Dashboard D1.1 read-model truth", () => {
  test("uses a deterministic current-task and Up Next policy", () => {
    const tasks = [
      dashboardTask("later-high", { priority: "P0", startTime: "15:00" }),
      dashboardTask("active", { status: "active", startTime: "13:00" }),
      dashboardTask("earlier", { priority: "P1", startTime: "09:00" }),
      dashboardTask("flexible", { priority: "P0", startTime: undefined }),
    ];
    const selection = dashboardTaskSelection(tasks);

    expect(selection.current?.id).toBe("active");
    expect(selection.upNext.map((task) => task.id)).toEqual([
      "earlier",
      "later-high",
      "flexible",
    ]);
    expect(
      [...tasks].sort(compareDashboardTasks).map((task) => task.id),
    ).toEqual(["active", "earlier", "later-high", "flexible"]);
  });

  test("represents only local-day time progress", () => {
    const progress = dashboardLocalDayProgress(
      new Date("2026-07-12T10:00:00.000Z"),
      "UTC",
    );

    expect(progress.label).toBe("Today");
    expect(progress.elapsedMinutes).toBe(600);
    expect(progress.progress).toBe(42);
  });

  test("shows honest Empty source states and navigates to responsible surfaces", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    const commandStats = page.getByRole("region", {
      name: "Command Center Stats",
    });
    await expect(
      commandStats.getByRole("link", { name: /Tasks:/ }),
    ).toHaveAttribute("href", "/today");
    await expect(
      commandStats.getByRole("link", { name: /Focus Time:/ }),
    ).toHaveAttribute("href", "/calendar");
    await expect(
      commandStats.getByRole("link", { name: /Inbox:/ }),
    ).toHaveAttribute("href", "/inbox");
    await expect(
      commandStats.getByRole("link", { name: /Review Status:/ }),
    ).toContainText("Prepared");
    await expect(
      commandStats.getByRole("link", { name: /Sleep:/ }),
    ).toContainText("Unavailable");

    const dashboard = page.getByRole("region", { name: "Dashboard-Zonen" });
    await expect(dashboard.getByText("Habit tracking prepared")).toBeVisible();
    await expect(
      dashboard.getByText(/Prepared · challenge source/),
    ).toBeVisible();
    await expect(
      page.getByText(/Prepared · mood entries and history/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Set · Calm|Calm$/ }),
    ).toHaveCount(0);

    await commandStats.getByRole("link", { name: /Tasks:/ }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Today" }),
    ).toBeVisible();

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Today Agenda" }).click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Calendar" }),
    ).toBeVisible();
  });

  test("does not expose Demo fixture data in Manual without an authenticated source", async ({
    page,
  }) => {
    await setProfile(page, "manual");
    await page.goto("/dashboard");

    const body = await page.locator("body").innerText();
    for (const fixture of [
      "Life OS App",
      "Masterarbeit",
      "Protein Bowl",
      "Literature source deadline",
      "Calendar page implementieren",
    ]) {
      expect(body).not.toContain(fixture);
    }
    await expect(
      page.getByText(/Supabase.*nicht|Melde dich an|Session/i).first(),
    ).toBeVisible();
  });
});
