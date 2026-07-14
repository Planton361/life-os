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

function clockFromMinutes(totalMinutes: number) {
  const minutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

function minutesFromClock(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function addClockMinutes(time: string, offsetMinutes: number) {
  return clockFromMinutes(minutesFromClock(time) + offsetMinutes);
}

function currentIsoWeekday() {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
}

function currentLocalDate() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function currentIsoWeekDate(dayOffset: number) {
  const date = new Date();
  const isoDay = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - isoDay + 1 + dayOffset);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function calendarDayColumnLabel(isoDate = currentLocalDate()) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}

function cssAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function nextIsoWeekday() {
  return (currentIsoWeekday() % 7) + 1;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueTitle(prefix: string) {
  const suffix = Math.random().toString(36).slice(2, 8);

  return `${prefix} ${Date.now()}-${suffix}`;
}

function calendarRangeOverlaps(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

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

async function expectInRegion(region: Locator, text: string | RegExp) {
  await expect(region.getByText(text).first()).toBeVisible();
}

async function selectCreatedInboxItem(page: Page, title: string) {
  const queueItem = page
    .locator("[data-inbox-queue-item]")
    .filter({ hasText: title })
    .first();

  await expect(queueItem).toBeVisible();
  await queueItem.click();
  await expect(
    page
      .locator('[data-inbox-section="active-item"]')
      .getByRole("heading", { name: title }),
  ).toBeVisible();
}

async function openPortfolioEntityByTitle(
  page: Page,
  view: "goals" | "projects" | "skills" | "tasks",
  title: string,
) {
  await page.goto(`/portfolio?view=${view}`);

  const entityList = page.locator('[data-portfolio-section="entity-list"]');
  const entityLink = entityList
    .getByRole("link", { name: new RegExp(escapeRegExp(title)) })
    .first();

  await expect(entityLink).toBeVisible();
  await entityLink.click();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);
}

async function expectSelectedPortfolioEntity(page: Page, title: string) {
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);
}

async function expectPortfolioContextText(page: Page, text: string) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const contextText = contextPanel.getByText(text).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(contextPanel).toBeVisible();

    if (await contextText.isVisible()) return contextPanel;

    await page.reload({ waitUntil: "networkidle" });
  }

  await expect(contextText).toBeVisible();

  return contextPanel;
}

async function openResourceByTitle(page: Page, title: string) {
  await page.goto("/resources");

  const resourceLink = page
    .locator('[data-resources-section="library"]')
    .getByRole("link", {
      name: new RegExp(`Select resource ${escapeRegExp(title)}`),
    })
    .first();
  const href = await resourceLink.getAttribute("href");

  expect(href).toBeTruthy();
  await page.goto(href ?? "/resources");
  await expect(page.locator("#selected-resource-heading")).toHaveText(title);
}

async function openNutritionMealByTitle(page: Page, title: string) {
  await page.goto("/nutrition");
  await expect(
    page.locator("#nutrition-page").getByText(title).first(),
  ).toBeVisible();
}

async function expectRecipeVisibleInRecipeResults(
  page: Page,
  title: string,
) {
  await expect(
    page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(title)) })
      .first(),
  ).toBeVisible();
}

async function expectRecipeAbsentFromRecipeResults(page: Page, title: string) {
  await expect(
    page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(title)) }),
  ).toHaveCount(0);
}

async function captureAndTriageManualInboxTask(
  page: Page,
  title: string,
  note: string,
  options: {
    durationMinutes?: string;
    energy?: string;
    priority?: string;
  } = {},
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
  await selectCreatedInboxItem(page, title);

  const activeItem = page.locator('[data-inbox-section="active-item"]');
  await activeItem.locator('[data-outcome-route="standalone_task"]').click();
  const taskDraft = activeItem
    .getByRole("heading", { name: "Task Draft" })
    .locator("xpath=ancestor::section[1]");
  await expect(taskDraft).toBeVisible();
  if (options.priority) {
    await taskDraft.locator('select[name="priority"]').selectOption(options.priority);
  }
  if (options.energy) {
    await taskDraft.locator('select[name="energy"]').selectOption(options.energy);
  }
  if (options.durationMinutes) {
    await taskDraft
      .locator('select[name="durationMinutes"]')
      .selectOption(options.durationMinutes);
  }
  await page
    .getByRole("button", { exact: true, name: "Task erstellen" })
    .click();
  await page.waitForLoadState("networkidle");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Diese Inbox wurde in eine Task umgewandelt" })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("Task erstellt").first()).toBeVisible();
}

async function openRecurringGenerationControl(page: Page) {
  await setProfile(page, "manual");
  await applySupabaseAuthState(page);
  await expectNoHydrationErrors(page, async () => {
    await page.goto("/today");
  });

  const recurringControl = page.locator(
    '[data-today-section="recurring-generation"]',
  );

  if ((await recurringControl.count()) === 0) {
    test.skip(
      true,
      "Requires a local authenticated Supabase Playwright session.",
    );
  }

  await expect(recurringControl).toBeVisible();

  return recurringControl;
}

async function createRecurringTemplateFromToday(
  page: Page,
  title: string,
  options: {
    durationMinutes?: string;
    frequency?: "daily" | "weekly";
    priority?: string;
    weekday?: number;
  } = {},
) {
  const recurringControl = await openRecurringGenerationControl(page);
  const setup = recurringControl.locator(
    '[data-today-section="recurring-template-setup"]',
  );

  await setup.locator("summary").click();
  await setup.getByLabel("Title").fill(title);
  await setup
    .getByLabel("Frequency")
    .selectOption(options.frequency ?? "daily");

  if (options.durationMinutes) {
    await setup.getByLabel("Duration").fill(options.durationMinutes);
  }

  if (options.priority) {
    await setup.getByLabel("Priorität").selectOption(options.priority);
  }

  if (options.frequency === "weekly" && options.weekday) {
    await setup
      .locator(`input[name="byWeekday"][value="${options.weekday}"]`)
      .check();
  }

  await setup.getByRole("button", { name: "Create template" }).click();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("Wiederkehrende Vorlage erstellt.").first(),
  ).toBeVisible();
}

async function generateRecurringTasksForToday(page: Page) {
  const recurringControl = await openRecurringGenerationControl(page);

  await recurringControl
    .getByRole("button", {
      name: "Wiederkehrende Aufgaben für heute erzeugen",
    })
    .click();
  await page.waitForLoadState("networkidle");
}

async function skipIfManualDbUnavailable(
  page: Page,
  reason = "Requires a local authenticated Supabase Browser/Playwright session.",
) {
  const quickCapture = page.getByRole("textbox", {
    exact: true,
    name: "Quick Capture",
  });

  await expect(quickCapture).toBeVisible();

  if (!(await quickCapture.isEnabled())) {
    test.skip(true, reason);
  }
}

async function captureManualInboxItem(page: Page, title: string, note: string) {
  await page
    .getByRole("textbox", { exact: true, name: "Quick Capture" })
    .fill(title);
  await page.getByRole("textbox", { name: "Quick Capture note" }).fill(note);
  await page.getByRole("button", { name: "Capture" }).click();
  await page.waitForLoadState("networkidle");
  await selectCreatedInboxItem(page, title);
}

async function expectManualInboxItemResolved(page: Page, title: string) {
  await expect(
    page.locator("[data-inbox-queue-item]").filter({ hasText: title }),
  ).toHaveCount(0);
  await expect(
    page
      .locator('[data-inbox-section="active-item"]')
      .getByRole("heading", { name: title }),
  ).toHaveCount(0);
}

async function generateInboxAISuggestion(page: Page) {
  const assistant = page.locator('[data-inbox-section="ai-assistant"]');
  const generateButton = assistant.getByRole("button", {
    name: "AI Vorschlag erzeugen",
  });

  await expect(generateButton).toBeEnabled();
  await generateButton.focus();
  await expect(generateButton).toBeFocused();
  await generateButton.click();
  await expect(assistant.getByLabel("AI Vorschlag Review")).toBeVisible();
  await expect(
    assistant.getByRole("button", { name: "Vorschlag übernehmen" }),
  ).toBeVisible();
  await expect(
    assistant.getByRole("button", { name: "Verwerfen" }),
  ).toBeVisible();

  return assistant;
}

async function applyInboxAISuggestion(page: Page) {
  const assistant = page.locator('[data-inbox-section="ai-assistant"]');

  await assistant.getByRole("button", { name: "Vorschlag übernehmen" }).click();
  await expect(
    page.locator('[data-inbox-section="draft-slot"]'),
  ).not.toContainText("Noch kein Draft ausgewählt");
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
  await openPortfolioEntityByTitle(page, "tasks", title);
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

async function scheduleCalendarQueueTask(
  page: Page,
  title: string,
  scheduledTime: string,
  durationMinutes: string,
) {
  const plannerQueue = await expectCalendarPlannerQueueTask(page, title);
  const scheduleForm = plannerQueue.getByRole("form", {
    name: `${title} terminieren`,
  });
  const scheduleButton = scheduleForm.getByRole("button", {
    name: "Terminieren",
  });

  await expect(scheduleForm.getByLabel("Uhrzeit")).toBeVisible();
  await expect(scheduleForm.getByLabel("Dauer")).toBeVisible();
  await scheduleForm.getByLabel("Uhrzeit").fill(scheduledTime);
  await scheduleForm.getByLabel("Dauer").selectOption(durationMinutes);
  await expect(scheduleButton).toBeEnabled();
  await scheduleButton.focus();
  await expect(scheduleButton).toBeFocused();
  await scheduleButton.click();
  await page.waitForLoadState("networkidle");
  await page.reload();
}

async function expectCalendarPlannerQueueTask(page: Page, title: string) {
  const plannerQueue = page
    .locator('[data-calendar-section="planning-queue"]')
    .first();
  const queueTask = plannerQueue.getByText(title).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(plannerQueue).toBeVisible();
    await expect(
      plannerQueue.getByText("Terminieren schreibt Task-Zeitfelder").first(),
    ).toBeVisible();
    await expect(
      plannerQueue.getByRole("heading", { name: "Calendar Planner Queue" }),
    ).toBeVisible();

    if (await queueTask.isVisible()) return plannerQueue;

    await page.reload({ waitUntil: "networkidle" });
  }

  await expect(queueTask).toBeVisible();

  return plannerQueue;
}

async function expectTodayTaskLifecycleForm(
  page: Page,
  title: string,
  action: "abschließen" | "wieder öffnen",
) {
  const activityStream = page.locator('[data-today-section="activity-stream"]');
  const form = activityStream.getByRole("form", {
    name: `${title} ${action}`,
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(activityStream).toBeVisible();

    if (await form.isVisible()) return form;

    await page.reload({ waitUntil: "networkidle" });
  }

  await expect(form).toBeVisible();

  return form;
}

async function expectTodayActivityText(page: Page, title: string) {
  const activityTimeline = page.locator(
    '[data-today-section="activity-stream"] ol',
  );
  const activityItem = activityTimeline.getByText(title).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(activityTimeline).toBeVisible();

    if (await activityItem.isVisible()) return activityTimeline;

    await page.reload({ waitUntil: "networkidle" });
  }

  await expect(activityItem).toBeVisible();

  return activityTimeline;
}

async function expectDashboardTodayAgendaText(page: Page, title: string) {
  const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
  const agendaItem = todayAgenda.getByText(title).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(todayAgenda).toBeVisible();

    if (await agendaItem.isVisible()) return todayAgenda;

    await page.reload({ waitUntil: "networkidle" });
  }

  await expect(todayAgenda).toHaveAttribute("data-content-state", "filled");
  expect(Number(await todayAgenda.getAttribute("data-item-count"))).toBeGreaterThanOrEqual(
    Number(await todayAgenda.getAttribute("data-capacity")),
  );

  return todayAgenda;
}

async function expectDashboardTodayAgendaItemDetail(
  page: Page,
  title: string,
  detail: string | RegExp,
) {
  const todayAgenda = await expectDashboardTodayAgendaText(page, title);
  const agendaItem = todayAgenda
    .getByRole("link", { name: `Open agenda item: ${title}` })
    .first();

  if ((await agendaItem.count()) === 0) return todayAgenda;

  await expect(agendaItem).toBeVisible();
  await expect(agendaItem).toContainText(detail);

  return agendaItem;
}

async function selectCalendarTimedBlock(page: Page, title: string) {
  const block = page
    .locator('[data-calendar-section="week-grid"]')
    .getByRole("button", { name: new RegExp(escapeRegExp(title)) })
    .first();

  await expect(block).toBeVisible();
  await block.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await block.focus();
  await expect(block).toBeFocused();
  await block.press("Enter");
}

async function expectCalendarTimedBlockRange(
  page: Page,
  title: string,
  startTime: string,
  endTime: string,
) {
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  const block = weekGrid
    .getByRole("button", {
      name: new RegExp(`${escapeRegExp(title)}, ${startTime} to ${endTime}`),
    })
    .first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(weekGrid).toBeVisible();

    if (await block.isVisible()) return block;

    await page.reload({ waitUntil: "networkidle" });
  }

  await expect(block).toBeVisible();

  return block;
}

async function expectNoCalendarTimedBlock(page: Page, title: string) {
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');

  await expect(
    weekGrid.getByRole("button", {
      name: new RegExp(escapeRegExp(title)),
    }),
  ).toHaveCount(0);
}

async function findFreeCalendarStartTime(
  page: Page,
  requiredWindowMinutes: number,
  preferredStartMinutes: number,
) {
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  const dayLabel = calendarDayColumnLabel();
  const dayColumn = weekGrid
    .locator(`[aria-label="${cssAttributeValue(dayLabel)}"]`)
    .first();

  await expect(weekGrid).toBeVisible();
  await expect(dayColumn).toBeVisible();

  const labels = await dayColumn
    .getByRole("button")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-label") ?? ""),
    );
  const occupiedRanges = labels
    .map((label) => label.match(/, (\d{2}:\d{2}) to (\d{2}:\d{2}),/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      end: minutesFromClock(match[2] ?? "00:00"),
      start: minutesFromClock(match[1] ?? "00:00"),
    }));

  const candidateStarts = [
    ...Array.from(
      { length: Math.ceil((24 * 60 - preferredStartMinutes) / 15) },
      (_, index) => preferredStartMinutes + index * 15,
    ),
    ...Array.from(
      { length: Math.ceil(preferredStartMinutes / 15) },
      (_, index) => index * 15,
    ),
  ];

  for (const candidateStart of candidateStarts) {
    const candidateEnd = candidateStart + requiredWindowMinutes;

    if (candidateEnd > 24 * 60) continue;

    const hasConflict = occupiedRanges.some((range) =>
      calendarRangeOverlaps(candidateStart, candidateEnd, range.start, range.end),
    );

    if (!hasConflict) return clockFromMinutes(candidateStart);
  }

  test.skip(
    true,
    `No conflict-free ${requiredWindowMinutes} min Calendar slot found on ${dayLabel}.`,
  );
  return clockFromMinutes(preferredStartMinutes);
}

async function openManualPortfolioWithDb(
  page: Page,
  dbUnavailableReason?: string,
) {
  await setProfile(page, "manual");
  await applySupabaseAuthState(page);
  await expectNoHydrationErrors(page, async () => {
    await page.goto("/inbox");
  });
  await skipIfManualDbUnavailable(page, dbUnavailableReason);
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
  await expectSelectedPortfolioEntity(page, title);
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
  await expectSelectedPortfolioEntity(page, title);
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
  await expectSelectedPortfolioEntity(page, title);
}

async function createPortfolioSkillTarget(
  page: Page,
  title: string,
  summary: string,
) {
  const form = page.locator('form[aria-label="Skill erstellen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByLabel("Summary").fill(summary);
  await form.getByLabel("Kategorie").fill("Coding");
  await form.getByLabel("Level").fill("Applied");
  const submitButton = form.getByRole("button", { name: "Skill erstellen" });
  await expect(submitButton).toBeEnabled();
  await submitButton.focus();
  await expect(submitButton).toBeFocused();
  await submitButton.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Skill erstellt.").first()).toBeVisible();
  await expectSelectedPortfolioEntity(page, title);
}

async function createSkillEvidenceTarget(
  page: Page,
  title: string,
  note: string,
  sourceLabel = "Manual note",
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Evidence hinzufügen"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Evidence Source").selectOption({ label: sourceLabel });
  await form.getByLabel("Evidence-Titel").fill(title);
  await form.getByLabel("Datum").fill(currentLocalDate());
  await form.getByLabel("Gewicht").fill("3");
  await form.getByLabel("Notiz").fill(note);
  const submitButton = form.getByRole("button", { name: "Evidence hinzufügen" });
  await expect(submitButton).toBeEnabled();
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Skill Evidence erstellt.").first()).toBeVisible();
  await expect(contextPanel.getByText(title).first()).toBeVisible();
}

async function editPortfolioSkillTarget(
  page: Page,
  title: string,
  summary: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Skill bearbeiten"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByLabel("Summary").fill(summary);
  await form.getByLabel("Kategorie").fill("Coding Core");
  await form.getByLabel("Level").fill("Maintained");
  await form.getByLabel("Status").selectOption("active");
  const submitButton = form.getByRole("button", { name: "Skill speichern" });
  await expect(submitButton).toBeEnabled();
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Skill aktualisiert.").first()).toBeVisible();
  await expectInRegion(contextPanel, title);
}

async function archivePortfolioSkillTarget(page: Page, title: string) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const archiveButton = contextPanel.getByRole("button", {
    name: "Skill archivieren",
  });

  await expect(archiveButton).toBeVisible();
  await expect(archiveButton).toBeEnabled();
  await archiveButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Skill archiviert.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
}

async function editPortfolioProjectTarget(
  page: Page,
  title: string,
  summary: string,
  nextAction: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Project bearbeiten"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Project-Titel").fill(title);
  await form.getByLabel("Summary").fill(summary);
  await form.getByLabel("Next Action").fill(nextAction);
  await form.getByLabel("Status").selectOption("blocked");
  const submitButton = form.getByRole("button", { name: "Project speichern" });
  await expect(submitButton).toBeEnabled();
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Project aktualisiert.").first()).toBeVisible();
  await expectSelectedPortfolioEntity(page, title);
  await expectInRegion(contextPanel, summary);
  await expectInRegion(contextPanel, nextAction);
  await expectInRegion(contextPanel, "blocked");
}

async function archivePortfolioProjectTarget(page: Page, title: string) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const archiveButton = contextPanel.getByRole("button", {
    name: "Project archivieren",
  });

  await expect(archiveButton).toBeVisible();
  await expect(archiveButton).toBeEnabled();
  await archiveButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Project archiviert.").first()).toBeVisible();
  await expect(
    page
      .locator('[data-portfolio-section="entity-list"]')
      .getByRole("link", { name: new RegExp(escapeRegExp(title)) }),
  ).toHaveCount(0);
}

async function editPortfolioGoalTarget(
  page: Page,
  title: string,
  summary: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator('form[aria-label="Goal bearbeiten"]');

  await expect(form).toBeVisible();
  await form.getByLabel("Goal-Titel").fill(title);
  await form.getByLabel("Summary").fill(summary);
  await form.getByLabel("Horizon").selectOption("month");
  await form.getByLabel("Status").selectOption("paused");
  const submitButton = form.getByRole("button", { name: "Goal speichern" });
  await expect(submitButton).toBeEnabled();
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Goal aktualisiert.").first()).toBeVisible();
  await expectSelectedPortfolioEntity(page, title);
  await expectInRegion(contextPanel, summary);
  await expectInRegion(contextPanel, "planned");
  await expect(form.getByLabel("Horizon")).toHaveValue("month");
  await expect(form.getByLabel("Status")).toHaveValue("paused");
}

async function archivePortfolioGoalTarget(page: Page, title: string) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const archiveButton = contextPanel.getByRole("button", {
    name: "Goal archivieren",
  });

  await expect(archiveButton).toBeVisible();
  await expect(archiveButton).toBeEnabled();
  await archiveButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Goal archiviert.").first()).toBeVisible();
  await expect(
    page
      .locator('[data-portfolio-section="entity-list"]')
      .getByRole("link", { name: new RegExp(escapeRegExp(title)) }),
  ).toHaveCount(0);
}

async function deleteSkillEvidenceTarget(page: Page, title: string) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const deleteButton = contextPanel.getByRole("button", {
    name: `Evidence löschen ${title}`,
  });

  await expect(deleteButton).toBeVisible();
  await expect(deleteButton).toBeEnabled();
  await deleteButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Skill Evidence gelöscht.").first()).toBeVisible();
  await expect(contextPanel.getByText(title)).toHaveCount(0);
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
  await expectPortfolioContextText(page, title);
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
  await expectPortfolioContextText(page, title);
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
  await expectPortfolioContextText(page, title);
}

async function createManualResourceFromInbox(
  page: Page,
  title: string,
  note: string,
  dbUnavailableReason?: string,
) {
  await page.goto("/inbox");
  await skipIfManualDbUnavailable(page, dbUnavailableReason);
  await captureManualInboxItem(page, `${title} capture`, note);
  await page.reload();

  const activeItem = page.locator('[data-inbox-section="active-item"]');
  await expect(
    activeItem.getByRole("heading", { name: `${title} capture` }),
  ).toBeVisible();
  await activeItem
    .locator('[data-outcome-route="knowledge_resource"]')
    .click();

  const resourceDraft = activeItem
    .getByRole("heading", { name: "Resource Draft" })
    .locator("xpath=ancestor::section[1]");

  await expect(resourceDraft).toBeVisible();
  await resourceDraft.getByLabel("Titel").fill(title);
  await resourceDraft.getByLabel("Resource Typ").selectOption("link");
  await resourceDraft
    .getByLabel("Kurzfassung")
    .fill("R1.7.3C Resource relation browser proof resource.");
  await resourceDraft
    .getByLabel("URL optional")
    .fill("https://example.test/life-os-resource-relation-proof");
  await resourceDraft
    .getByRole("button", { exact: true, name: "Resource erstellen" })
    .click();
  await page.waitForLoadState("networkidle");

  await openResourceByTitle(page, title);
}

async function selectedResourceInspector(page: Page) {
  const inspector = page.locator('[data-resources-section="relation-inspector"]');

  await expect(
    inspector.getByRole("heading", { name: "Resource Overview" }),
  ).toBeVisible();

  return inspector;
}

async function selectResourceByTitle(page: Page, title: string) {
  await openResourceByTitle(page, title);
}

async function linkSelectedResourceToTarget(
  page: Page,
  targetType: "goal" | "project",
  targetTitle: string,
) {
  const inspector = await selectedResourceInspector(page);
  const form = inspector.locator(
    'form[aria-label="Resource Beziehung hinzufügen"]',
  );

  await expect(form).toBeVisible();
  await expect(form.getByLabel("Zieltyp")).toBeVisible();
  await expect(form.getByLabel("Ziel", { exact: true })).toBeVisible();
  await expect(form.getByLabel("Relation")).toBeVisible();
  await form.getByLabel("Zieltyp").selectOption(targetType);

  const targetSelect = form.getByLabel("Ziel", { exact: true });
  await expect(targetSelect).toBeEnabled();

  const option = targetSelect
    .locator("option")
    .filter({ hasText: targetTitle })
    .first();
  const targetId = await option.getAttribute("value");

  expect(targetId).toBeTruthy();
  await targetSelect.selectOption(targetId ?? "");
  const saveButton = form.getByRole("button", { name: "Speichern" });
  await expect(saveButton).toBeEnabled();
  await saveButton.focus();
  await expect(saveButton).toBeFocused();
  await saveButton.press("Enter");
  await page.waitForLoadState("networkidle");

  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Beziehung gespeichert|Beziehung besteht bereits/ })
      .first(),
  ).toBeVisible();

  return targetId ?? "";
}

async function linkWorkbenchResourceToTarget(
  page: Page,
  targetType: "Goal" | "Project",
  resourceTitle: string,
) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const form = contextPanel.locator(
    `form[aria-label="${targetType} Resource verknüpfen"]`,
  );

  await expect(form).toBeVisible();
  await expect(form.getByLabel("Resource", { exact: true })).toBeVisible();
  await expect(form.getByLabel("Relation")).toBeVisible();

  const resourceSelect = form.getByLabel("Resource", { exact: true });
  await expect(resourceSelect).toBeEnabled();

  const option = resourceSelect
    .locator("option")
    .filter({ hasText: resourceTitle })
    .first();
  const resourceId = await option.getAttribute("value");

  expect(resourceId).toBeTruthy();
  await resourceSelect.selectOption(resourceId ?? "");
  await form.getByLabel("Relation").selectOption("supports");

  const saveButton = form.getByRole("button", {
    name: "Resource verknüpfen",
  });
  await expect(saveButton).toBeEnabled();
  await saveButton.focus();
  await expect(saveButton).toBeFocused();
  await saveButton.press("Enter");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Resource verknüpft.").first()).toBeVisible();

  return resourceId ?? "";
}

async function expectWorkbenchResourceVisible(page: Page, resourceTitle: string) {
  const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
  const resourceCard = contextPanel
    .locator("article")
    .filter({ hasText: resourceTitle })
    .filter({ hasText: "Resource" })
    .first();

  await expect(resourceCard).toBeVisible();
}

async function expectSingleResourceRelationCard(
  page: Page,
  targetTitle: string,
  targetId: string,
) {
  const inspector = await selectedResourceInspector(page);
  const cards = inspector
    .locator('[data-resource-relation-card]')
    .filter({ hasText: targetTitle });

  await expect(cards).toHaveCount(1);
  await expect(cards.first()).not.toContainText(targetId);
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
    page.getByRole("link", { name: "Open Today time progress" }),
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

test.describe("Work content states", () => {
  test("A1.1C1 creates edits and reloads a work project", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const title = `A1.1C1 Work Project ${stamp}`;
    const editedTitle = `A1.1C1 Edited Work Project ${stamp}`;

    await openManualPortfolioWithDb(page, "A1.1C1 requires the local Manual database.");
    await page.goto("/work");
    const projectsRegion = page.locator('[data-work-region="projects"]');
    const createForm = projectsRegion.getByRole("form", { name: "Work Project erstellen" });
    await createForm.getByLabel("Titel", { exact: true }).fill(title);
    await createForm.locator('textarea[name="description"]').fill("A1.1C1 canonical work context");
    await createForm.locator('select[name="status"]').selectOption("active");
    await createForm.getByRole("button", { name: "Work Project erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project erstellt.");
    const projectCard = projectsRegion.locator("[data-work-project-card]").filter({ hasText: title });
    await expect(projectCard).toHaveCount(1);

    const context = page.locator('[data-work-region="project-context"]');
    const editForm = context.getByRole("form", { name: "Work Project bearbeiten" });
    await expect(editForm).toBeVisible();
    await expect(context.getByRole("heading", { name: "Tasks & Deadlines" })).toBeVisible();
    await expect(context.getByRole("heading", { name: "Resources" })).toBeVisible();
    await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle);
    await editForm.locator('textarea[name="description"]').fill("A1.1C1 edited work context");
    await editForm.locator('select[name="status"]').selectOption("paused");
    await editForm.getByRole("button", { name: "Project speichern" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project aktualisiert.");
    await page.reload();

    const reloadedContext = page.locator('[data-work-region="project-context"]');
    const reloadedForm = reloadedContext.getByRole("form", { name: "Work Project bearbeiten" });
    await expect(reloadedForm.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle);
    await expect(reloadedForm.locator('textarea[name="description"]')).toHaveValue("A1.1C1 edited work context");
    await expect(reloadedForm.locator('select[name="status"]')).toHaveValue("paused");
  });

  test("A1.1C1 creates edits archives and reloads a work log", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1C1 Log Project ${stamp}`;
    const focus = `A1.1C1 Work Focus ${stamp}`;
    const editedFocus = `A1.1C1 Edited Work Focus ${stamp}`;
    const logDate = new Date().toISOString().slice(0, 10);

    await openManualPortfolioWithDb(page, "A1.1C1 requires the local Manual database.");
    await page.goto("/work");
    const projectsRegion = page.locator('[data-work-region="projects"]');
    const projectForm = projectsRegion.getByRole("form", { name: "Work Project erstellen" });
    await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await projectForm.getByRole("button", { name: "Work Project erstellen" }).click();

    const logsRegion = page.locator('[data-work-region="logs"]');
    const createForm = logsRegion.getByRole("form", { name: "Work Log erstellen" });
    await createForm.locator('input[name="logDate"]').fill(logDate);
    await createForm.locator('input[name="durationMinutes"]').fill("45");
    await createForm.locator('input[name="focus"]').fill(focus);
    await createForm.locator('textarea[name="outcome"]').fill("A1.1C1 work outcome");
    await createForm.locator('textarea[name="notes"]').fill("A1.1C1 work notes");
    await createForm.getByRole("button", { name: "Work Log erfassen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Log erstellt.");
    const activeCard = logsRegion.locator('[data-work-log-card]').filter({ hasText: focus });
    await expect(activeCard).toHaveCount(1);

    const editForm = logsRegion.getByRole("form", { name: "Work Log bearbeiten" });
    await expect(editForm).toBeVisible();
    await editForm.locator('input[name="focus"]').fill(editedFocus);
    await editForm.locator('textarea[name="outcome"]').fill("A1.1C1 edited work outcome");
    await editForm.locator('textarea[name="notes"]').fill("A1.1C1 edited work notes");
    await editForm.getByRole("button", { name: "Work Log speichern" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Log aktualisiert.");
    await page.reload();

    const reloadedLogs = page.locator('[data-work-region="logs"]');
    const reloadedEdit = reloadedLogs.getByRole("form", { name: "Work Log bearbeiten" });
    await expect(reloadedEdit.locator('input[name="focus"]')).toHaveValue(editedFocus);
    await expect(reloadedEdit.locator('textarea[name="outcome"]')).toHaveValue("A1.1C1 edited work outcome");
    await expect(reloadedEdit.locator('textarea[name="notes"]')).toHaveValue("A1.1C1 edited work notes");
    const reloadedCard = reloadedLogs.locator('[data-work-log-card]').filter({ hasText: editedFocus });
    await expect(reloadedCard).toHaveCount(1);
    await reloadedCard.getByRole("form", { name: `Work Log archivieren ${editedFocus}` }).getByRole("button", { name: "Archivieren" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Log archiviert.");
    await page.reload();

    const archivedCard = page.locator('[data-work-region="logs"] [data-work-log-card="archived"]').filter({ hasText: editedFocus });
    await expect(archivedCard).toHaveCount(1);
    await expect(archivedCard.getByRole("link", { name: "Bearbeiten" })).toHaveCount(0);
    await expect(archivedCard.getByRole("button", { name: "Archivieren" })).toHaveCount(0);
  });

  test("A1.1C2a creates edits archives and reloads a work wiki entry", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1C2a Wiki Project ${stamp}`;
    const title = `A1.1C2a Wiki ${stamp}`;
    const editedTitle = `A1.1C2a Edited Wiki ${stamp}`;
    await openManualPortfolioWithDb(page, "A1.1C2a requires the local Manual database.");
    await page.goto("/work");
    const projects = page.locator('[data-work-region="projects"]');
    const projectForm = projects.getByRole("form", { name: "Work Project erstellen" });
    await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await projectForm.getByRole("button", { name: "Work Project erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project erstellt.");
    await page.reload();

    const wiki = page.locator('[data-work-region="wiki"]');
    const createForm = wiki.getByRole("form", { name: "Work Wiki erstellen" });
    await createForm.getByLabel("Titel", { exact: true }).fill(title);
    await createForm.locator('textarea[name="body"]').fill("A1.1C2a wiki body");
    await createForm.locator('select[name="projectId"]').selectOption({ label: projectTitle });
    await createForm.getByRole("button", { name: "Wiki-Eintrag erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Wiki erstellt.");
    const card = wiki.locator('[data-work-wiki-card]').filter({ hasText: title });
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("link", { name: projectTitle })).toBeVisible();
    await card.getByRole("link", { name: title }).click();
    const editForm = wiki.getByRole("form", { name: "Work Wiki bearbeiten" });
    await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle);
    await editForm.locator('textarea[name="body"]').fill("A1.1C2a edited wiki body");
    await editForm.getByRole("button", { name: "Wiki-Eintrag speichern" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Wiki aktualisiert.");
    await page.reload();
    const reloadedWiki = page.locator('[data-work-region="wiki"]');
    const reloadedCard = reloadedWiki.locator('[data-work-wiki-card]').filter({ hasText: editedTitle });
    await expect(reloadedCard).toHaveCount(1);
    await expect(reloadedCard.getByRole("link", { name: projectTitle })).toBeVisible();
    await reloadedCard.getByRole("form", { name: `Work Wiki archivieren ${editedTitle}` }).getByRole("button", { name: "Archivieren" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Wiki archiviert.");
    await page.reload();
    const archivedCard = page.locator('[data-work-region="wiki"] [data-work-wiki-card="archived"]').filter({ hasText: editedTitle });
    await expect(archivedCard).toHaveCount(1);
    await expect(archivedCard.getByRole("link")).toHaveCount(0);
    await expect(archivedCard.getByRole("button", { name: "Archivieren" })).toHaveCount(0);
  });

  test("A1.1C2a creates edits revisits archives and reloads a work decision", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1C2a Decision Project ${stamp}`;
    const title = `A1.1C2a Decision ${stamp}`;
    const editedTitle = `A1.1C2a Edited Decision ${stamp}`;
    const decisionDate = new Date().toISOString().slice(0, 10);
    await openManualPortfolioWithDb(page, "A1.1C2a requires the local Manual database.");
    await page.goto("/work");
    const projects = page.locator('[data-work-region="projects"]');
    const projectForm = projects.getByRole("form", { name: "Work Project erstellen" });
    await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await projectForm.getByRole("button", { name: "Work Project erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project erstellt.");
    await page.reload();

    const decisions = page.locator('[data-work-region="decisions"]');
    const createForm = decisions.getByRole("form", { name: "Work Decision erstellen" });
    await createForm.locator('input[name="decisionDate"]').fill(decisionDate);
    await createForm.getByLabel("Titel / Fragestellung", { exact: true }).fill(title);
    await createForm.locator('textarea[name="decision"]').fill("A1.1C2a decision record");
    await createForm.locator('textarea[name="rationale"]').fill("A1.1C2a rationale");
    await createForm.getByRole("button", { name: "Decision erfassen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Decision erfasst.");
    const card = decisions.locator('[data-work-decision-card]').filter({ hasText: title });
    await expect(card).toHaveCount(1);
    await card.getByRole("link", { name: title }).click();
    const editForm = decisions.getByRole("form", { name: "Work Decision bearbeiten" });
    await editForm.getByLabel("Titel / Fragestellung", { exact: true }).fill(editedTitle);
    await editForm.locator('textarea[name="decision"]').fill("A1.1C2a edited decision record");
    await editForm.locator('textarea[name="rationale"]').fill("A1.1C2a edited rationale");
    await editForm.locator('select[name="status"]').selectOption("revisited");
    await editForm.getByRole("button", { name: "Decision speichern" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Decision aktualisiert.");
    await page.reload();
    const reloadedDecisions = page.locator('[data-work-region="decisions"]');
    const reloadedEdit = reloadedDecisions.getByRole("form", { name: "Work Decision bearbeiten" });
    await expect(reloadedEdit.getByLabel("Titel / Fragestellung", { exact: true })).toHaveValue(editedTitle);
    await expect(reloadedEdit.locator('textarea[name="decision"]')).toHaveValue("A1.1C2a edited decision record");
    await expect(reloadedEdit.locator('textarea[name="rationale"]')).toHaveValue("A1.1C2a edited rationale");
    await expect(reloadedEdit.locator('select[name="status"]')).toHaveValue("revisited");
    const reloadedCard = reloadedDecisions.locator('[data-work-decision-card]').filter({ hasText: editedTitle });
    await expect(reloadedCard).toHaveCount(1);
    await reloadedCard.getByRole("link", { name: "Project öffnen" }).click();
    await expect(page.locator("#selected-entity-heading")).toHaveText(projectTitle);
    await page.goBack();
    const archiveCard = page.locator('[data-work-region="decisions"] [data-work-decision-card]').filter({ hasText: editedTitle });
    await archiveCard.getByRole("form", { name: `Work Decision archivieren ${editedTitle}` }).getByRole("button", { name: "Archivieren" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Decision archiviert.");
    await page.reload();
    const archivedCard = page.locator('[data-work-region="decisions"] [data-work-decision-card="archived"]').filter({ hasText: editedTitle });
    await expect(archivedCard).toHaveCount(1);
    await expect(archivedCard.getByRole("link")).toHaveCount(0);
    await expect(archivedCard.getByRole("button", { name: "Archivieren" })).toHaveCount(0);
  });

  test("A1.1C2b creates edits archives and reloads a work meeting", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now(); const projectTitle = `A1.1C2b Meeting Project ${stamp}`; const title = `A1.1C2b Meeting ${stamp}`; const editedTitle = `A1.1C2b Edited Meeting ${stamp}`; const date = new Date().toISOString().slice(0, 10);
    await openManualPortfolioWithDb(page, "A1.1C2b requires the local Manual database."); await page.goto("/work");
    const projects = page.locator('[data-work-region="projects"]'); const projectForm = projects.getByRole("form", { name: "Work Project erstellen" }); await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle); await projectForm.getByRole("button", { name: "Work Project erstellen" }).click(); await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project erstellt."); await page.reload();
    const meetings = page.locator('[data-work-region="meetings"]'); const create = meetings.getByRole("form", { name: "Work Meeting erstellen" }); await create.locator('input[name="meetingDate"]').fill(date); await create.locator('input[name="startedAt"]').fill("09:30"); await create.locator('input[name="durationMinutes"]').fill("45"); await create.getByLabel("Titel", { exact: true }).fill(title); await create.locator('input[name="participants"]').fill("Anton, Team"); await create.locator('textarea[name="agenda"]').fill("A1.1C2b agenda"); await create.locator('textarea[name="outcome"]').fill("A1.1C2b outcome"); await create.locator('textarea[name="notes"]').fill("A1.1C2b notes"); await create.getByRole("button", { name: "Meeting erfassen" }).click(); await expect(page.locator("[data-work-action-status]")).toHaveText("Work Meeting erfasst.");
    const card = meetings.locator('[data-work-meeting-card]').filter({ hasText: title }); await expect(card).toHaveCount(1); await card.getByRole("link", { name: title }).click(); await page.reload(); const edit = page.locator('[data-work-region="meetings"]').getByRole("form", { name: "Work Meeting bearbeiten" }); await edit.getByLabel("Titel", { exact: true }).fill(editedTitle); await edit.locator('textarea[name="agenda"]').fill("A1.1C2b edited agenda"); await edit.locator('textarea[name="outcome"]').fill("A1.1C2b edited outcome"); await edit.locator('textarea[name="notes"]').fill("A1.1C2b edited notes"); await edit.getByRole("button", { name: "Meeting speichern" }).click(); await expect(page.locator("[data-work-action-status]")).toHaveText("Work Meeting aktualisiert."); await page.reload();
    const reloadedMeetings = page.locator('[data-work-region="meetings"]'); const reloadedEdit = reloadedMeetings.getByRole("form", { name: "Work Meeting bearbeiten" }); await expect(reloadedEdit.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle); await expect(reloadedEdit.locator('textarea[name="agenda"]')).toHaveValue("A1.1C2b edited agenda"); await expect(reloadedEdit.locator('textarea[name="outcome"]')).toHaveValue("A1.1C2b edited outcome"); await expect(reloadedEdit.locator('textarea[name="notes"]')).toHaveValue("A1.1C2b edited notes"); const reloadedCard = reloadedMeetings.locator('[data-work-meeting-card]').filter({ hasText: editedTitle }); await reloadedCard.getByRole("link", { name: editedTitle }).click(); await expect(page.locator('[data-work-region="project-context"]')).toContainText(projectTitle); await page.goBack();
    const archiveCard = page.locator('[data-work-region="meetings"] [data-work-meeting-card]').filter({ hasText: editedTitle }); await archiveCard.getByRole("form", { name: `Work Meeting archivieren ${editedTitle}` }).getByRole("button", { name: "Archivieren" }).click(); await expect(page.locator("[data-work-action-status]")).toHaveText("Work Meeting archiviert."); await page.reload(); const archivedCard = page.locator('[data-work-region="meetings"] [data-work-meeting-card="archived"]').filter({ hasText: editedTitle }); await expect(archivedCard).toHaveCount(1); await expect(archivedCard.getByRole("link")).toHaveCount(0); await expect(archivedCard.getByRole("button", { name: "Archivieren" })).toHaveCount(0);
  });

  test("A1.1C2b creates links unlinks and reloads meeting follow-ups", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1C2b Follow-up Project ${stamp}`;
    const meetingTitle = `A1.1C2b Follow-up Meeting ${stamp}`;
    const createdTaskTitle = `A1.1C2b Created Follow-up ${stamp}`;
    const existingTaskTitle = `A1.1C2b Existing Follow-up ${stamp}`;

    await openManualPortfolioWithDb(page, "A1.1C2b requires the local Manual database.");
    await page.goto("/work");
    const projects = page.locator('[data-work-region="projects"]');
    const projectForm = projects.getByRole("form", { name: "Work Project erstellen" });
    await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await projectForm.getByRole("button", { name: "Work Project erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project erstellt.");
    await page.reload();

    const meetings = page.locator('[data-work-region="meetings"]');
    const meetingForm = meetings.getByRole("form", { name: "Work Meeting erstellen" });
    await meetingForm.locator('input[name="durationMinutes"]').fill("30");
    await meetingForm.getByLabel("Titel", { exact: true }).fill(meetingTitle);
    await meetingForm.locator('textarea[name="outcome"]').fill("A1.1C2b follow-up context");
    await meetingForm.getByRole("button", { name: "Meeting erfassen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Meeting erfasst.");
    const meetingCard = meetings.locator('[data-work-meeting-card]').filter({ hasText: meetingTitle });
    const meetingLink = meetingCard.getByRole("link", { name: meetingTitle });
    const meetingHref = await meetingLink.getAttribute("href");
    expect(meetingHref).toBeTruthy();
    await meetingLink.click();

    const followups = page.locator('[data-work-region="followups"]');
    const createFollowup = followups.getByRole("form", { name: "Meeting Follow-up erstellen" });
    await createFollowup.getByLabel("Task-Titel", { exact: true }).fill(createdTaskTitle);
    await createFollowup.locator('textarea[name="description"]').fill("A1.1C2b atomic task");
    await createFollowup.getByRole("button", { name: "Follow-up erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Follow-up erstellt.");
    const createdCard = followups.locator('[data-work-followup-card]').filter({ hasText: createdTaskTitle });
    await expect(createdCard).toHaveCount(1);
    await expect(createdCard).toContainText("planned");
    const createdTaskHref = await createdCard.getByRole("link", { name: createdTaskTitle }).getAttribute("href");
    expect(createdTaskHref).toBeTruthy();
    await createdCard.getByRole("link", { name: createdTaskTitle }).click();
    await expect(page.locator("#selected-entity-heading")).toHaveText(createdTaskTitle);
    await page.goBack();
    await page.goto("/work");
    const reloadedMeetingCard = page.locator('[data-work-region="meetings"] [data-work-meeting-card]').filter({ hasText: meetingTitle });
    await reloadedMeetingCard.getByRole("link", { name: meetingTitle }).click();
    const persistedFollowups = page.locator('[data-work-region="followups"]');
    const persistedCreatedCard = persistedFollowups.locator('[data-work-followup-card]').filter({ hasText: createdTaskTitle });
    await expect(persistedCreatedCard).toHaveCount(1);
    await expect(persistedCreatedCard).toContainText("planned");

    const projectOpen = page.locator('[data-work-region="project-context"]').getByRole("link", { name: "Project öffnen" });
    const projectHref = await projectOpen.getAttribute("href");
    expect(projectHref).toBeTruthy();
    await page.goto(projectHref ?? "/portfolio?view=projects");
    const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
    const taskForm = contextPanel.locator('form[aria-label="Project Task erstellen"]');
    await expect(taskForm).toBeVisible();
    await taskForm.getByLabel("Task-Titel").fill(existingTaskTitle);
    await taskForm.getByLabel("Next Action").fill("A1.1C2b existing task");
    await taskForm.getByLabel("Kontext").fill("A1.1C2b canonical Work task");
    await taskForm.getByLabel("Priorität").selectOption("P2");
    await taskForm.getByLabel("Energie").selectOption("medium");
    await taskForm.getByLabel("Minuten").fill("25");
    await taskForm.getByLabel("Heute planen").check();
    await taskForm.getByRole("button", { name: "Task erstellen" }).click();

    await page.goto(meetingHref ?? "/work");
    const reloadedFollowups = page.locator('[data-work-region="followups"]');
    const linkForm = reloadedFollowups.getByRole("form", { name: "Bestehenden Follow-up verknüpfen" });
    await linkForm.locator('select[name="taskId"]').selectOption({ label: existingTaskTitle });
    await linkForm.getByRole("button", { name: "Task verknüpfen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Follow-up verknüpft.");
    const existingCard = reloadedFollowups.locator('[data-work-followup-card]').filter({ hasText: existingTaskTitle });
    await expect(existingCard).toHaveCount(1);
    await existingCard.getByRole("form", { name: `Follow-up lösen ${existingTaskTitle}` }).getByRole("button", { name: "Verknüpfung lösen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Follow-up-Verknüpfung gelöst.");
    await page.reload();
    await expect(page.locator('[data-work-region="followups"] [data-work-followup-card]').filter({ hasText: existingTaskTitle })).toHaveCount(0);

    const activeMeeting = page.locator('[data-work-region="meetings"] [data-work-meeting-card]').filter({ hasText: meetingTitle });
    await activeMeeting.getByRole("form", { name: `Work Meeting archivieren ${meetingTitle}` }).getByRole("button", { name: "Archivieren" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText("Work Meeting archiviert.");
    await page.reload();
    await expect(page.locator('[data-work-region="meetings"] [data-work-meeting-card="archived"]').filter({ hasText: meetingTitle })).toHaveCount(1);
    await page.goto(createdTaskHref ?? "/portfolio?view=tasks");
    await expect(page.locator("#selected-entity-heading")).toHaveText(createdTaskTitle);
  });
});

test.describe("A1.1D1 Life Journal and Notes", () => {
  test("A1.1D1 creates edits archives and reloads a journal entry", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const title = uniqueTitle("A1.1D1 Journal");
    const editedTitle = `${title} edited`;
    const entryDate = currentLocalDate();

    await openManualPortfolioWithDb(page, "A1.1D1 requires the local Manual database.");
    await page.goto("/life/journal");
    const journal = page.locator("main");
    const createRegion = journal.getByRole("heading", { name: "New journal entry", exact: true }).locator("xpath=ancestor::section[1]");
    const createForm = createRegion.locator("form");
    await createForm.locator('input[name="entryDate"]').fill(entryDate);
    await createForm.locator('input[name="title"]').fill(title);
    await createForm.locator('textarea[name="body"]').fill("A1.1D1 journal body");
    await createForm.getByRole("button", { name: "Save entry" }).click();
    await expect(journal.getByRole("status")).toHaveText(/Gespeichert/);

    const activeRegion = journal.getByRole("heading", { name: "Active entries", exact: true }).locator("xpath=ancestor::section[1]");
    const activeCard = activeRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(activeCard).toHaveCount(1);
    await activeCard.getByText("Edit entry", { exact: true }).click();
    const editForm = activeCard.locator("details form");
    await editForm.locator('input[name="title"]').fill(editedTitle);
    await editForm.locator('textarea[name="body"]').fill("A1.1D1 edited journal body");
    await editForm.getByRole("button", { name: "Save changes" }).click();
    await expect(journal.getByRole("status")).toHaveText(/Änderungen gespeichert/);
    await page.reload();

    const reloadedJournal = page.locator("main");
    const reloadedActive = reloadedJournal.getByRole("heading", { name: "Active entries", exact: true }).locator("xpath=ancestor::section[1]");
    const reloadedCard = reloadedActive.getByRole("heading", { name: editedTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(reloadedCard.locator('input[name="title"]')).toHaveValue(editedTitle);
    await expect(reloadedCard.locator('textarea[name="body"]')).toHaveValue("A1.1D1 edited journal body");
    await reloadedCard.getByText("Edit entry", { exact: true }).click();
    await reloadedCard.getByRole("button", { name: "Archive" }).click();
    await expect(reloadedJournal.getByRole("status")).toHaveText(/archiviert/);
    await page.reload();

    const archivedJournal = page.locator("main");
    const historyRegion = archivedJournal.getByRole("heading", { name: "Journal history", exact: true }).locator("xpath=ancestor::section[1]");
    const archivedCard = historyRegion.getByRole("heading", { name: editedTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(archivedCard).toContainText("A1.1D1 edited journal body");
    await expect(archivedCard.locator("details form")).toHaveCount(0);
    await expect(archivedCard.getByRole("button", { name: "Archive" })).toHaveCount(0);
  });

  test("A1.1D1 creates edits archives restores and reloads a life note", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const title = uniqueTitle("A1.1D1 Life Note");
    const editedTitle = `${title} edited`;

    await openManualPortfolioWithDb(page, "A1.1D1 requires the local Manual database.");
    await page.goto("/life/notes");
    const notes = page.locator("main");
    const createRegion = notes.getByRole("heading", { name: "New note", exact: true }).locator("xpath=ancestor::section[1]");
    const createForm = createRegion.locator("form");
    await createForm.locator('input[name="title"]').fill(title);
    await createForm.locator('textarea[name="body"]').fill("A1.1D1 note body");
    await createForm.getByRole("button", { name: "Save note" }).click();
    await expect(notes.getByRole("status")).toHaveText(/Gespeichert/);

    const activeRegion = notes.getByRole("heading", { name: "Active notes", exact: true }).locator("xpath=ancestor::section[1]");
    const activeCard = activeRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(activeCard).toHaveCount(1);
    await expect(activeCard.getByText("No Project, Goal or Task relations.", { exact: true })).toBeVisible();
    await activeCard.getByText("Edit note", { exact: true }).click();
    const editForm = activeCard.locator("details form");
    await editForm.locator('input[name="title"]').fill(editedTitle);
    await editForm.locator('textarea[name="body"]').fill("A1.1D1 edited note body");
    await editForm.getByRole("button", { name: "Save changes" }).click();
    await expect(notes.getByRole("status")).toHaveText(/Änderungen gespeichert/);
    await page.reload();

    const reloadedNotes = page.locator("main");
    const reloadedActive = reloadedNotes.getByRole("heading", { name: "Active notes", exact: true }).locator("xpath=ancestor::section[1]");
    const reloadedCard = reloadedActive.getByRole("heading", { name: editedTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(reloadedCard.locator('input[name="title"]')).toHaveValue(editedTitle);
    await expect(reloadedCard.locator('textarea[name="body"]')).toHaveValue("A1.1D1 edited note body");
    await reloadedCard.getByText("Edit note", { exact: true }).click();
    await reloadedCard.getByRole("button", { name: "Archive" }).click();
    await expect(reloadedNotes.getByRole("status")).toHaveText(/archiviert/);
    await page.reload();

    const archivedNotes = page.locator("main");
    const archivedRegion = archivedNotes.getByRole("heading", { name: "Archived notes", exact: true }).locator("xpath=ancestor::section[1]");
    const archivedCard = archivedRegion.getByRole("heading", { name: editedTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(archivedCard).toContainText("A1.1D1 edited note body");
    await expect(archivedCard.locator("details form")).toHaveCount(0);
    await archivedCard.getByRole("button", { name: "Restore note" }).click();
    await expect(archivedNotes.getByRole("status")).toHaveText(/wiederhergestellt/);
    await page.reload();

    const restoredNotes = page.locator("main");
    const restoredActive = restoredNotes.getByRole("heading", { name: "Active notes", exact: true }).locator("xpath=ancestor::section[1]");
    const restoredCard = restoredActive.getByRole("heading", { name: editedTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(restoredCard.locator('input[name="title"]')).toHaveValue(editedTitle);
    await expect(restoredCard.locator('textarea[name="body"]')).toHaveValue("A1.1D1 edited note body");
    await restoredCard.getByText("Edit note", { exact: true }).click();
    await expect(restoredCard.getByRole("button", { name: "Archive" })).toBeVisible();
  });
});

test.describe("A1.1D2 Entertainment Collections", () => {
  test("A1.1D2 creates edits filters and reloads entertainment items", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const bookTitle = uniqueTitle("A1.1D2 Book");
    const editedBookTitle = `${bookTitle} edited`;
    const gameTitle = uniqueTitle("A1.1D2 Game");

    await openManualPortfolioWithDb(page, "A1.1D2 requires the local Manual database.");
    await page.goto("/life/entertainment");
    const entertainment = page.locator("main");
    const createRegion = entertainment.getByRole("heading", { name: "Add media", exact: true }).locator("xpath=ancestor::section[1]");
    const createForm = createRegion.locator("form");
    await createForm.locator('select[name="mediaType"]').selectOption("book");
    await createForm.locator('input[name="title"]').fill(bookTitle);
    await createForm.locator('input[name="creatorOrStudio"]').fill("A1.1D2 Author");
    await createForm.locator('input[name="releaseYear"]').fill("2024");
    await createForm.locator('select[name="status"]').selectOption("in_progress");
    await createForm.locator('input[name="rating"]').fill("8");
    await createForm.locator('input[name="progressCurrent"]').fill("120");
    await createForm.locator('input[name="progressTotal"]').fill("300");
    await createForm.locator('select[name="progressUnit"]').selectOption("pages");
    await createForm.locator('textarea[name="notes"]').fill("A1.1D2 book notes");
    await createForm.getByRole("button", { name: "Save item" }).click();
    await expect(entertainment.getByRole("status")).toHaveText("Entertainment item saved.");

    const reloadedCreate = page.locator("main").getByRole("heading", { name: "Add media", exact: true }).locator("xpath=ancestor::section[1]").locator("form");
    await reloadedCreate.locator('select[name="mediaType"]').selectOption("game");
    await reloadedCreate.locator('input[name="title"]').fill(gameTitle);
    await reloadedCreate.locator('input[name="creatorOrStudio"]').fill("A1.1D2 Studio");
    await reloadedCreate.locator('input[name="releaseYear"]').fill("2025");
    await reloadedCreate.locator('select[name="status"]').selectOption("planned");
    await reloadedCreate.locator('input[name="rating"]').fill("7");
    await reloadedCreate.locator('input[name="progressCurrent"]').fill("3");
    await reloadedCreate.locator('input[name="progressTotal"]').fill("20");
    await reloadedCreate.locator('select[name="progressUnit"]').selectOption("hours");
    await reloadedCreate.locator('textarea[name="notes"]').fill("A1.1D2 game notes");
    await reloadedCreate.getByRole("button", { name: "Save item" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Entertainment item saved.");

    const activeRegion = page.locator("main").getByRole("heading", { name: "Active collection", exact: true }).locator("xpath=ancestor::section[1]");
    const bookCard = activeRegion.getByRole("heading", { name: bookTitle, exact: true }).locator("xpath=ancestor::article[1]");
    const gameCard = activeRegion.getByRole("heading", { name: gameTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(bookCard).toContainText("120 / 300 pages");
    await expect(gameCard).toContainText("3 / 20 hours");
    await bookCard.getByText("Edit item", { exact: true }).click();
    const editForm = bookCard.locator("details form");
    await editForm.locator('input[name="title"]').fill(editedBookTitle);
    await editForm.locator('input[name="creatorOrStudio"]').fill("A1.1D2 Edited Author");
    await editForm.locator('input[name="rating"]').fill("9");
    await editForm.locator('textarea[name="notes"]').fill("A1.1D2 edited book notes");
    await editForm.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Entertainment item updated.");
    await page.reload();

    const reloadedActive = page.locator("main").getByRole("heading", { name: "Active collection", exact: true }).locator("xpath=ancestor::section[1]");
    const reloadedBook = reloadedActive.getByRole("heading", { name: editedBookTitle, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(reloadedBook).toContainText("A1.1D2 Edited Author");
    await expect(reloadedBook).toContainText("9/10");
    await expect(reloadedBook).toContainText("A1.1D2 edited book notes");
    await expect(reloadedActive.getByRole("heading", { name: gameTitle, exact: true })).toBeVisible();

    const navigation = page.locator("main").getByRole("navigation", { name: "Entertainment collections" });
    await navigation.getByRole("link", { name: "Books", exact: true }).click();
    const booksPage = page.locator("main");
    const booksActive = booksPage.getByRole("heading", { name: "Active collection", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(booksPage.getByRole("heading", { name: "Book Collection", exact: true })).toBeVisible();
    await expect(booksActive.getByRole("heading", { name: editedBookTitle, exact: true })).toBeVisible();
    await expect(booksActive.getByRole("heading", { name: gameTitle, exact: true })).toHaveCount(0);
    await booksPage.getByRole("navigation", { name: "Entertainment collections" }).getByRole("link", { name: "Games", exact: true }).click();
    const gamesPage = page.locator("main");
    const gamesActive = gamesPage.getByRole("heading", { name: "Active collection", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(gamesActive.getByRole("heading", { name: gameTitle, exact: true })).toBeVisible();
    await expect(gamesActive.getByRole("heading", { name: editedBookTitle, exact: true })).toHaveCount(0);
    await gamesPage.getByRole("navigation", { name: "Entertainment collections" }).getByRole("link", { name: "Movies", exact: true }).click();
    await expect(page.locator("main").getByRole("heading", { name: editedBookTitle, exact: true })).toHaveCount(0);
    await expect(page.locator("main").getByRole("heading", { name: gameTitle, exact: true })).toHaveCount(0);
    await page.locator("main").getByRole("navigation", { name: "Entertainment collections" }).getByRole("link", { name: "Series", exact: true }).click();
    await expect(page.locator("main").getByRole("heading", { name: editedBookTitle, exact: true })).toHaveCount(0);
    await expect(page.locator("main").getByRole("heading", { name: gameTitle, exact: true })).toHaveCount(0);
    await page.locator("main").getByRole("navigation", { name: "Entertainment collections" }).getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page.locator("main").getByRole("heading", { name: "Entertainment", exact: true })).toBeVisible();
  });

  test("A1.1D2 archives restores and reloads entertainment lifecycle", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const title = uniqueTitle("A1.1D2 Lifecycle Series");

    await openManualPortfolioWithDb(page, "A1.1D2 requires the local Manual database.");
    await page.goto("/life/entertainment/series");
    const series = page.locator("main");
    const createForm = series.getByRole("heading", { name: "Add series", exact: true }).locator("xpath=ancestor::section[1]").locator("form");
    await createForm.locator('input[name="title"]').fill(title);
    await createForm.locator('input[name="creatorOrStudio"]').fill("A1.1D2 Series Studio");
    await createForm.locator('select[name="status"]').selectOption("in_progress");
    await createForm.locator('input[name="rating"]').fill("8");
    await createForm.locator('input[name="progressCurrent"]').fill("4");
    await createForm.locator('input[name="progressTotal"]').fill("12");
    await createForm.locator('select[name="progressUnit"]').selectOption("episodes");
    await createForm.locator('textarea[name="notes"]').fill("A1.1D2 lifecycle notes");
    await createForm.getByRole("button", { name: "Save item" }).click();
    await expect(series.getByRole("status")).toHaveText("Entertainment item saved.");

    const activeRegion = page.locator("main").getByRole("heading", { name: "Active collection", exact: true }).locator("xpath=ancestor::section[1]");
    const activeCard = activeRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await activeCard.getByText("Edit item", { exact: true }).click();
    await activeCard.getByRole("button", { name: "Archive" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText(/archived/);
    await page.reload();

    const archiveRegion = page.locator("main").getByRole("heading", { name: "Archive history", exact: true }).locator("xpath=ancestor::section[1]");
    const archivedCard = archiveRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(archivedCard).toContainText("In progress");
    await expect(archivedCard).toContainText("8/10");
    await expect(archivedCard).toContainText("4 / 12 episodes");
    await expect(archivedCard.locator("details form")).toHaveCount(0);
    await expect(archivedCard.getByRole("button", { name: "Archive" })).toHaveCount(0);
    await archivedCard.getByRole("button", { name: "Restore item" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText(/restored/);
    await page.reload();

    const restoredRegion = page.locator("main").getByRole("heading", { name: "Active collection", exact: true }).locator("xpath=ancestor::section[1]");
    const restoredCard = restoredRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await restoredCard.getByText("Edit item", { exact: true }).click();
    const restoredForm = restoredCard.locator("details form");
    await expect(restoredForm.locator('select[name="status"]')).toHaveValue("in_progress");
    await expect(restoredForm.locator('input[name="rating"]')).toHaveValue("8");
    await expect(restoredForm.locator('input[name="progressCurrent"]')).toHaveValue("4");
    await expect(restoredForm.locator('input[name="progressTotal"]')).toHaveValue("12");
    await expect(restoredForm.locator('select[name="progressUnit"]')).toHaveValue("episodes");
    await expect(restoredForm.getByRole("button", { name: "Archive" })).toBeVisible();
  });
});

test.describe("A1.1D3 Inventory, Wishlist & Purchase Decisions", () => {
  test("A1.1D3 creates edits archives restores and reloads inventory items", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const name = uniqueTitle("A1.1D3 Inventory");
    const editedName = `${name} edited`;

    await openManualPortfolioWithDb(page, "A1.1D3 requires the local Manual database.");
    await page.goto("/life/inventory");
    const inventory = page.locator("main");
    await expect(inventory.getByRole("heading", { name: "Inventory & Wishlist", exact: true })).toBeVisible();
    const createForm = inventory.getByRole("heading", { name: "Add inventory item", exact: true }).locator("xpath=ancestor::section[1]").locator("form");
    await createForm.locator('input[name="name"]').fill(name);
    await createForm.locator('input[name="category"]').fill("Tech");
    await createForm.locator('textarea[name="description"]').fill("A1.1D3 inventory description");
    await createForm.locator('input[name="quantity"]').fill("2");
    await createForm.locator('input[name="unit"]').fill("pieces");
    await createForm.locator('select[name="condition"]').selectOption("good");
    await createForm.locator('input[name="location"]').fill("Office shelf");
    await createForm.locator('input[name="acquiredOn"]').fill("2026-07-10");
    await createForm.locator('input[name="amount"]').fill("249.50");
    await createForm.locator('input[name="currency"]').fill("EUR");
    await createForm.getByRole("button", { name: "Save inventory item" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Inventory item saved.");

    const active = page.locator("main").getByRole("heading", { name: "Active inventory", exact: true }).locator("xpath=ancestor::section[1]");
    const card = active.getByRole("heading", { name, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(card).toContainText("2 pieces");
    await expect(card).toContainText("Office shelf");
    await card.getByText("Edit inventory item", { exact: true }).click();
    const editForm = card.locator("details form");
    await editForm.locator('input[name="name"]').fill(editedName);
    await editForm.locator('textarea[name="description"]').fill("A1.1D3 edited inventory description");
    await editForm.locator('input[name="location"]').fill("Studio cabinet");
    await editForm.locator('select[name="condition"]').selectOption("used");
    await editForm.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Inventory item updated.");
    await page.reload();

    const reloadedActive = page.locator("main").getByRole("heading", { name: "Active inventory", exact: true }).locator("xpath=ancestor::section[1]");
    const reloadedCard = reloadedActive.getByRole("heading", { name: editedName, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(reloadedCard).toContainText("Studio cabinet");
    await expect(reloadedCard).toContainText("used");
    await reloadedCard.getByText("Edit inventory item", { exact: true }).click();
    const reloadedForm = reloadedCard.locator("details form");
    await expect(reloadedForm.locator('textarea[name="description"]')).toHaveValue("A1.1D3 edited inventory description");
    await expect(reloadedForm.locator('input[name="quantity"]')).toHaveValue("2");
    await expect(reloadedForm.locator('input[name="amount"]')).toHaveValue("249.5");
    await expect(reloadedForm.locator('input[name="currency"]')).toHaveValue("EUR");
    await reloadedForm.getByRole("button", { name: "Archive" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Inventory item archived.");
    await page.reload();

    const history = page.locator("main").getByRole("heading", { name: "Inventory history", exact: true }).locator("xpath=ancestor::section[1]");
    const archivedCard = history.getByRole("heading", { name: editedName, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(archivedCard).toContainText("Archived");
    await expect(archivedCard.locator("details form")).toHaveCount(0);
    await expect(archivedCard.getByRole("button", { name: "Archive" })).toHaveCount(0);
    await archivedCard.getByRole("button", { name: "Restore item" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Inventory item restored.");
    await page.reload();

    const restoredActive = page.locator("main").getByRole("heading", { name: "Active inventory", exact: true }).locator("xpath=ancestor::section[1]");
    const restoredCard = restoredActive.getByRole("heading", { name: editedName, exact: true }).locator("xpath=ancestor::article[1]");
    await restoredCard.getByText("Edit inventory item", { exact: true }).click();
    await expect(restoredCard.locator("details form").getByRole("button", { name: "Archive" })).toBeVisible();
  });

  test("A1.1D3 decides converts and reloads wishlist inventory flow", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const title = uniqueTitle("A1.1D3 Wishlist");
    const decision = uniqueTitle("A1.1D3 Buy decision");
    const editedDecision = `${decision} edited`;

    await openManualPortfolioWithDb(page, "A1.1D3 requires the local Manual database.");
    await page.goto("/life/inventory");
    const wishlistForm = page.locator("main").getByRole("heading", { name: "Add wishlist item", exact: true }).locator("xpath=ancestor::section[1]").locator("form");
    await wishlistForm.locator('input[name="title"]').fill(title);
    await wishlistForm.locator('input[name="category"]').fill("Desk");
    await wishlistForm.locator('textarea[name="description"]').fill("A1.1D3 wishlist description");
    await wishlistForm.locator('select[name="priority"]').selectOption("high");
    await wishlistForm.locator('select[name="status"]').selectOption("approved");
    await wishlistForm.locator('input[name="targetDate"]').fill("2026-08-15");
    await wishlistForm.locator('input[name="amount"]').fill("399.90");
    await wishlistForm.locator('input[name="currency"]').fill("EUR");
    await wishlistForm.getByRole("button", { name: "Save wishlist item" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Wishlist item saved.");

    const wishlistRegion = page.locator("main").getByRole("heading", { name: "Active wishlist & decisions", exact: true }).locator("xpath=ancestor::section[1]");
    let wishlistCard = wishlistRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(wishlistCard).toContainText("high · approved");
    await wishlistCard.getByText("Purchase decisions", { exact: true }).click();
    const decisionForm = wishlistCard.getByRole("heading", { name: "New purchase decision", exact: true }).locator("xpath=ancestor::form[1]");
    await decisionForm.locator('input[name="decisionDate"]').fill("2026-07-14");
    await decisionForm.locator('textarea[name="context"]').fill("A1.1D3 original need context");
    await decisionForm.locator('textarea[name="criteria"]').fill("A1.1D3 original criteria");
    await decisionForm.locator('input[name="decision"]').fill(decision);
    await decisionForm.locator('select[name="status"]').selectOption("decided_buy");
    await decisionForm.locator('textarea[name="rationale"]').fill("A1.1D3 original rationale");
    await decisionForm.getByRole("button", { name: "Save decision" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Purchase decision saved.");

    const updatedWishlistRegion = page.locator("main").getByRole("heading", { name: "Active wishlist & decisions", exact: true }).locator("xpath=ancestor::section[1]");
    wishlistCard = updatedWishlistRegion.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await wishlistCard.getByText("Purchase decisions", { exact: true }).click();
    const decisionCard = wishlistCard.getByRole("heading", { name: decision, exact: true }).locator("xpath=ancestor::article[1]");
    await decisionCard.getByText("Edit decision", { exact: true }).click();
    const editDecision = decisionCard.locator("details form");
    await editDecision.locator('textarea[name="context"]').fill("A1.1D3 edited need context");
    await editDecision.locator('textarea[name="criteria"]').fill("A1.1D3 edited criteria");
    await editDecision.locator('input[name="decision"]').fill(editedDecision);
    await editDecision.locator('textarea[name="rationale"]').fill("A1.1D3 edited rationale");
    await editDecision.getByRole("button", { name: "Save decision" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Purchase decision updated.");
    await page.reload();

    const reloadedWishlist = page.locator("main").getByRole("heading", { name: "Active wishlist & decisions", exact: true }).locator("xpath=ancestor::section[1]");
    wishlistCard = reloadedWishlist.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await wishlistCard.getByText("Purchase decisions", { exact: true }).click();
    const reloadedDecision = wishlistCard.getByRole("heading", { name: editedDecision, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(reloadedDecision).toContainText("A1.1D3 edited need context");
    await expect(reloadedDecision).toContainText("A1.1D3 edited rationale");
    await wishlistCard.getByRole("button", { name: "In Inventory übernehmen" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Wishlist item transferred to inventory.");

    const acquiredWishlist = page.locator("main").getByRole("heading", { name: "Active wishlist & decisions", exact: true }).locator("xpath=ancestor::section[1]");
    const acquiredCard = acquiredWishlist.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(acquiredCard).toContainText("high · acquired");
    const activeInventory = page.locator("main").getByRole("heading", { name: "Active inventory", exact: true }).locator("xpath=ancestor::section[1]");
    const inventoryCard = activeInventory.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(inventoryCard).toHaveCount(1);
    await expect(inventoryCard).toContainText(`Origin: Wishlist · ${title}`);
    const acquiredSummary = acquiredCard.locator("summary").filter({ hasText: /^Purchase decisions$/ });
    const acquiredDecisions = acquiredSummary.locator("xpath=ancestor::details[1]");
    await acquiredSummary.click();
    await expect(acquiredDecisions).toHaveAttribute("open", "");
    await expect(acquiredDecisions.getByRole("heading", { name: editedDecision, exact: true })).toBeVisible();
    await expect(acquiredDecisions).toContainText("Inventory linked");
    await acquiredCard.getByRole("button", { name: "In Inventory übernehmen" }).click();
    await expect(page.locator("main").getByRole("status")).toHaveText("Wishlist item transferred to inventory.");
    await page.reload();

    const persistedInventory = page.locator("main").getByRole("heading", { name: "Active inventory", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(persistedInventory.getByRole("heading", { name: title, exact: true })).toHaveCount(1);
    await expect(persistedInventory.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]")).toContainText(`Origin: Wishlist · ${title}`);
    const persistedWishlist = page.locator("main").getByRole("heading", { name: "Active wishlist & decisions", exact: true }).locator("xpath=ancestor::section[1]");
    const persistedWishlistCard = persistedWishlist.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::article[1]");
    await expect(persistedWishlistCard).toContainText("acquired");
    const persistedSummary = persistedWishlistCard.locator("summary").filter({ hasText: /^Purchase decisions$/ });
    const persistedDecisions = persistedSummary.locator("xpath=ancestor::details[1]");
    await persistedSummary.click();
    await expect(persistedDecisions.getByRole("heading", { name: editedDecision, exact: true })).toBeVisible();
  });
});

test.describe("H2.1 Running Strength Workout core", () => {
  async function openManualTraining(page: Page, path: "/health/running" | "/health/strength") {
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires the authorized local Supabase Playwright auth state.");
    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await page.goto(path);
    await expect(page.locator(path.endsWith("running") ? "[data-h2-running=page]" : "[data-h2-strength=page]")).toBeVisible();
  }

  test("H2.1 Running creates edits and reloads a plan and completed session", async ({ page }) => {
    const planName = uniqueTitle("H2 Running Plan");
    const runDistance = "5.125";
    await openManualTraining(page, "/health/running");
    const planForm = page.locator("form").filter({ has: page.getByLabel("Plan name") }).first();
    await planForm.getByLabel("Plan name").fill(planName);
    await planForm.getByLabel("Goal").fill("Build a reload-stable 10K base");
    await planForm.getByRole("button", { name: "Create plan" }).click();
    await page.waitForLoadState("networkidle");
    const plan = page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`);
    await expect(plan).toHaveCount(1);
    await plan.getByLabel("Goal").first().fill("Updated 10K base goal");
    await plan.getByRole("button", { name: "Save plan" }).click();
    await page.waitForLoadState("networkidle");

    const sessionForm = page.getByTestId("running-session-form");
    await sessionForm.getByLabel("Distance (km)").fill(runDistance);
    await sessionForm.getByLabel("Duration (minutes)").fill("31");
    await sessionForm.getByLabel("Optional average heart rate").fill("142");
    expect(await sessionForm.locator("form").evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(true);
    const previousUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
    await sessionForm.getByRole("button", { name: "Save completed run" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("trainingUpdate")).not.toBe(previousUpdate);
    await page.reload();
    await expect(page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`).getByLabel("Goal")).toHaveValue("Updated 10K base goal");
    const history = page.getByRole("heading", { name: "Running history" }).locator("xpath=ancestor::section[1]");
    await expect(history.getByText(`${runDistance} km`, { exact: false }).first()).toBeVisible();
    const runCard = history.locator("article").filter({ hasText: `${runDistance} km` }).first();
    await runCard.getByText("Edit / archive").click();
    const editRun = runCard.getByRole("button", { name: "Save edits" }).locator("xpath=ancestor::form[1]");
    await editRun.getByLabel("Distance km").fill("5.25");
    await editRun.getByLabel("Optional start time").fill("07:15");
    await editRun.getByLabel("Optional notes").fill("Edited reload proof");
    const editUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
    await editRun.getByRole("button", { name: "Save edits" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("trainingUpdate")).not.toBe(editUpdate);
    await page.reload();
    await expect(history.getByText("5.25 km", { exact: false }).first()).toBeVisible();
    await expect(history.getByText("Edited reload proof")).toBeVisible();
  });

  test("H2.1 Workout schedules a running unit idempotently and synchronizes completion", async ({ page }) => {
    test.slow();
    const planName = uniqueTitle("H2 Scheduled Run Plan");
    const unitTitle = uniqueTitle("H2 Scheduled Run");
    await openManualTraining(page, "/health/running");
    const createPlan = page.locator("form").filter({ has: page.getByLabel("Plan name") }).first();
    await createPlan.getByLabel("Plan name").fill(planName);
    await createPlan.getByLabel("Goal").fill("Execute one scheduled run");
    await createPlan.getByRole("button", { name: "Create plan" }).click();
    await page.waitForLoadState("networkidle");
    const plan = page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`);
    await plan.getByText("Add planned unit").click();
    const addUnit = plan.getByRole("button", { name: "Add unit" }).locator("xpath=ancestor::form[1]");
    await addUnit.getByLabel("Title").fill(unitTitle);
    await addUnit.getByLabel("Distance km").fill("4.8");
    await addUnit.getByLabel("Duration min").fill("30");
    await addUnit.getByRole("button", { name: "Add unit" }).click();
    await page.waitForLoadState("networkidle");
    await plan.getByRole("button", { name: "Schedule / reschedule" }).click();
    await page.waitForLoadState("networkidle");
    await plan.getByRole("button", { name: "Schedule / reschedule" }).click();
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");
    await expect(page.locator('[data-calendar-section="week-grid"]').getByText(`Run: ${unitTitle}`)).toHaveCount(1);
    await page.goto("/health/running");
    const refreshedUnit = page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`).getByText("Complete this planned run").locator("xpath=ancestor::div[1]");
    await refreshedUnit.getByText("Complete this planned run").click();
    const completion = refreshedUnit.getByRole("button", { name: "Complete run + task" }).locator("xpath=ancestor::form[1]");
    await completion.getByLabel("Distance km").fill("4.8");
    await completion.getByLabel("Duration min").fill("30");
    await completion.getByRole("button", { name: "Complete run + task" }).click();
    await page.waitForLoadState("networkidle");
    await page.goto("/today");
    const event = page.locator('[data-today-section="activity-stream"]').getByText(`Run: ${unitTitle}`).first();
    await expect(event).toBeVisible();
  });

  test("H2.1 Strength creates edits and reloads exercise library and plan", async ({ page }) => {
    const exerciseName = uniqueTitle("H2 Squat");
    const planName = uniqueTitle("H2 Strength Plan");
    await openManualTraining(page, "/health/strength");
    const exerciseForm = page.locator("form").filter({ has: page.getByRole("group", { name: "Muscle groups" }) }).first();
    await exerciseForm.getByLabel("Name").fill(exerciseName);
    await exerciseForm.getByLabel("Equipment").fill("Barbell");
    await exerciseForm.getByLabel("Quadriceps").check();
    await exerciseForm.getByLabel("Glutes").check();
    await exerciseForm.getByRole("button", { name: "Create exercise" }).click();
    await page.waitForLoadState("networkidle");
    const createPlan = page.locator("form").filter({ has: page.getByLabel("Plan name") }).first();
    await createPlan.getByLabel("Plan name").fill(planName);
    await createPlan.getByLabel("Goal").fill("Three stable working sets");
    await createPlan.getByRole("button", { name: "Create plan" }).click();
    await page.waitForLoadState("networkidle");
    const plan = page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`);
    await plan.getByText("Add plan exercise").click();
    const addExercise = plan.getByRole("button", { name: "Add exercise" }).locator("xpath=ancestor::form[1]");
    await addExercise.getByLabel("Exercise").selectOption({ label: exerciseName });
    await addExercise.getByLabel("Sets").fill("3");
    await addExercise.getByLabel("Reps").fill("8");
    await addExercise.getByLabel("Weight kg").fill("60");
    const previousUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
    await addExercise.getByRole("button", { name: "Add exercise" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("trainingUpdate")).not.toBe(previousUpdate);
    await page.reload();
    await expect(page.getByText(exerciseName).first()).toBeVisible();
    await expect(page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`).getByText(/3 × 8 @ 60 kg/)).toBeVisible();
  });

  test("H2.1 Strength completes real set logs and projects muscle load to Dashboard", async ({ page }) => {
    test.slow();
    const exerciseName = uniqueTitle("H2 Row");
    const planName = uniqueTitle("H2 Pull Plan");
    await openManualTraining(page, "/health/strength");
    const exerciseForm = page.locator("form").filter({ has: page.getByRole("group", { name: "Muscle groups" }) }).first();
    await exerciseForm.getByLabel("Name").fill(exerciseName);
    await exerciseForm.getByLabel("Equipment").fill("Dumbbell");
    await exerciseForm.getByLabel("Back").check();
    await exerciseForm.getByLabel("Biceps").check();
    await exerciseForm.getByRole("button", { name: "Create exercise" }).click();
    await page.waitForLoadState("networkidle");
    const createPlan = page.locator("form").filter({ has: page.getByLabel("Plan name") }).first();
    await createPlan.getByLabel("Plan name").fill(planName);
    await createPlan.getByLabel("Goal").fill("Log real pulling volume");
    await createPlan.getByRole("button", { name: "Create plan" }).click();
    await page.waitForLoadState("networkidle");
    let plan = page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`);
    await plan.getByText("Add plan exercise").click();
    const addExercise = plan.getByRole("button", { name: "Add exercise" }).locator("xpath=ancestor::form[1]");
    await addExercise.getByLabel("Exercise").selectOption({ label: exerciseName });
    await addExercise.getByLabel("Sets").fill("2");
    await addExercise.getByLabel("Reps").fill("10");
    await addExercise.getByLabel("Weight kg").fill("25");
    await addExercise.getByRole("button", { name: "Add exercise" }).click();
    await page.waitForLoadState("networkidle");
    plan = page.locator(`article:has(input[name="name"][value="${cssAttributeValue(planName)}"])`);
    await plan.getByRole("button", { name: "Schedule / reschedule" }).click();
    await page.waitForLoadState("networkidle");
    await plan.getByRole("button", { name: "Start session" }).click();
    await page.waitForLoadState("networkidle");
    const session = page.locator('[data-testid^="strength-session-"]').filter({ hasText: planName }).filter({ hasText: "in_progress" }).first();
    const setForm = session.getByRole("button", { name: "Log set" }).locator("xpath=ancestor::form[1]");
    await setForm.getByLabel("Repetitions").fill("10");
    await setForm.getByLabel("Weight kg (optional)").fill("25");
    let previousUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
    await setForm.getByRole("button", { name: "Log set" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("trainingUpdate")).not.toBe(previousUpdate);
    const refreshed = page.locator('[data-testid^="strength-session-"]').filter({ hasText: planName }).filter({ hasText: "in_progress" }).first();
    previousUpdate = new URL(page.url()).searchParams.get("trainingUpdate");
    await refreshed.getByRole("button", { name: "Complete session + task" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("trainingUpdate")).not.toBe(previousUpdate);
    await page.reload();
    await expect(page.getByText("250.0 kg weighted volume").first()).toBeVisible();
    await expect(page.getByText("Back").last()).toBeVisible();
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Muscle" }).click();
    const runningPanel = page.getByRole("link", { name: "Running Tracker" }).locator("xpath=ancestor::section[1]");
    await expect(runningPanel.getByText(/Back · 1 sets/)).toBeVisible();
    await expect(runningPanel.getByText("Latest completed session", { exact: false })).toBeVisible();
    await page.goto("/health");
    const strengthOverview = page.locator('[data-health-section="strength"]');
    await expect(strengthOverview.getByText(planName)).toBeVisible();
    await expect(strengthOverview.getByText("Weighted volume")).toBeVisible();
    await expect(strengthOverview.getByText(/^\d+\.\d kg$/)).toBeVisible();
  });
});

test.afterEach(async () => {
  await resetManualProfileFile();
});

test.describe("Coding content states", () => {
  test("A1.1A creates edits and reloads a coding project", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const title = `A1.1A Coding Project ${stamp}`;
    const editedTitle = `A1.1A Edited Coding Project ${stamp}`;

    await openManualPortfolioWithDb(page, "A1.1A requires the local Manual database.");
    await page.goto("/coding");
    const projectsRegion = page.locator('[data-coding-region="projects"]');
    const createForm = page.getByRole("form", { name: "Coding-Projekt erstellen" });
    await createForm.getByLabel("Titel", { exact: true }).fill(title);
    await createForm.getByLabel("Beschreibung", { exact: true }).fill("A1.1A canonical project");
    await createForm.locator('select[name="status"]').selectOption("active");
    await createForm.getByLabel("Repository-URL", { exact: true }).fill(`https://example.test/a11a-${stamp}`);
    await createForm.getByRole("button", { name: "Coding-Projekt erstellen" }).click();
    await expect(page.locator("[data-coding-action-status]")).toHaveText("Coding-Projekt erstellt.");
    const projectCard = projectsRegion.locator("[data-coding-project-card]").filter({ hasText: title });
    await expect(projectCard).toHaveCount(1);

    const editForm = page.getByRole("form", { name: "Coding-Projekt bearbeiten" });
    await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle);
    await editForm.locator('textarea[name="description"]').fill("A1.1A edited context");
    await editForm.locator('select[name="status"]').selectOption("paused");
    await editForm.getByRole("button", { name: "Project speichern" }).click();
    await expect(page.locator("[data-coding-action-status]")).toHaveText("Coding-Projekt aktualisiert.");
    await page.reload();
    const reloadedForm = page.getByRole("form", { name: "Coding-Projekt bearbeiten" });
    await expect(reloadedForm.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle);
    await expect(reloadedForm.locator('textarea[name="description"]')).toHaveValue("A1.1A edited context");
    await expect(reloadedForm.locator('select[name="status"]')).toHaveValue("paused");
    await expect(reloadedForm.getByLabel("Repository-URL", { exact: true })).toHaveValue(`https://example.test/a11a-${stamp}`);
  });

  test("A1.1A logs edits archives and reloads a coding session", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1A Session Project ${stamp}`;
    const activity = `A1.1A Session Focus ${stamp}`;
    const editedActivity = `A1.1A Edited Session Focus ${stamp}`;

    await openManualPortfolioWithDb(page, "A1.1A requires the local Manual database.");
    await page.goto("/coding");
    const createProject = page.getByRole("form", { name: "Coding-Projekt erstellen" });
    await createProject.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await createProject.locator('select[name="status"]').selectOption("active");
    await createProject.getByRole("button", { name: "Coding-Projekt erstellen" }).click();
    await expect(page.locator("[data-coding-action-status]")).toHaveText("Coding-Projekt erstellt.");

    const sessionForm = page.getByRole("form", { name: "Coding Session erfassen" });
    await sessionForm.getByLabel("Dauer (Minuten)", { exact: true }).fill("45");
    await sessionForm.getByLabel("Tätigkeit / Fokus", { exact: true }).fill(activity);
    await sessionForm.getByLabel("Ergebnis", { exact: true }).fill("A1.1A initial result");
    await sessionForm.getByLabel("Notiz", { exact: true }).fill("A1.1A initial note");
    await sessionForm.getByRole("button", { name: "Session speichern" }).click();
    await expect(page.locator("[data-coding-action-status]")).toHaveText("Coding Session gespeichert.");
    const sessionLog = page.locator('[data-coding-region="session-log"]');
    const sessionCard = sessionLog.locator("[data-coding-session-card]").filter({ hasText: activity });
    await expect(sessionCard).toHaveCount(1);

    const editForm = sessionCard.getByRole("form", { name: `Coding Session bearbeiten ${activity}` });
    await editForm.getByLabel("Dauer (Minuten)", { exact: true }).fill("60");
    await editForm.getByLabel("Tätigkeit / Fokus", { exact: true }).fill(editedActivity);
    await editForm.locator('textarea[name="outcome"]').fill("A1.1A edited result");
    await editForm.getByRole("button", { name: "Session aktualisieren" }).click();
    await expect(page.locator("[data-coding-action-status]")).toHaveText("Coding Session aktualisiert.");
    await page.reload();
    const editedCard = sessionLog.locator("[data-coding-session-card]").filter({ hasText: editedActivity });
    await expect(editedCard).toHaveCount(1);
    await expect(editedCard).toContainText("60 min");
    await expect(editedCard).toContainText("A1.1A edited result");
    await editedCard.getByRole("form", { name: `Coding Session archivieren ${editedActivity}` }).getByRole("button", { name: "Session archivieren" }).click();
    await expect(page.locator("[data-coding-action-status]")).toHaveText("Coding Session archiviert.");
    await page.reload();
    const archivedCard = sessionLog.locator("[data-coding-session-card]").filter({ hasText: editedActivity });
    await expect(archivedCard).toContainText("archived");
    await expect(archivedCard.getByRole("form", { name: new RegExp(`Coding Session bearbeiten ${editedActivity}`) })).toHaveCount(0);
  });

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

  test("Manual Nutrition creates recipe meal and completes it reload-stable", async ({
    page,
  }) => {
    const recipeTitle = uniqueTitle("Manual Nutrition Recipe");
    const mealTitle = uniqueTitle("Manual Nutrition Meal");
    const mealDate = currentLocalDate();

    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);

    if (!hasSupabaseAuth) {
      test.skip(
        true,
        "Manual Supabase auth state unavailable; Nutrition DB proof skipped.",
      );
    }

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(
      page,
      "Manual Supabase auth state unavailable; Nutrition DB proof skipped.",
    );

    await page.goto("/nutrition/recipes");
    await expectNoNutritionDemoStrings(page);
    const recipeForm = page
      .getByRole("heading", { name: "Recipe erstellen" })
      .locator("xpath=ancestor::section[1]");

    await expect(recipeForm).toBeVisible();
    const recipeTitleInput = recipeForm.getByLabel("Title");
    await expect(recipeTitleInput).toBeVisible();
    await recipeTitleInput.focus();
    await expect(recipeTitleInput).toBeFocused();
    await recipeTitleInput.fill(recipeTitle);
    await expect(recipeForm.getByLabel("Summary")).toBeVisible();
    await expect(recipeForm.getByLabel("Tags")).toBeVisible();
    await recipeForm.getByLabel("Summary").fill("Browser proof recipe");
    await recipeForm.getByLabel("Tags").fill("lunch, proof");
    await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
    await page.waitForLoadState("networkidle");
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page.reload();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await expectNoNutritionDemoStrings(page);

    await page.goto("/nutrition");
    await expectNoNutritionDemoStrings(page);
    const mealForm = page
      .getByRole("heading", { name: "Meal erstellen" })
      .locator("xpath=ancestor::section[1]");

    await expect(mealForm).toBeVisible();
    const mealTitleInput = mealForm.getByLabel("Title");
    await expect(mealTitleInput).toBeVisible();
    await mealTitleInput.focus();
    await expect(mealTitleInput).toBeFocused();
    await mealTitleInput.fill(mealTitle);
    await expect(mealForm.getByLabel("Date")).toBeVisible();
    await expect(mealForm.getByLabel("Type")).toBeVisible();
    await expect(mealForm.getByLabel("Planned")).toBeVisible();
    await expect(mealForm.getByLabel("Recipe")).toBeVisible();
    await mealForm.getByLabel("Date").fill(mealDate);
    await mealForm.getByLabel("Type").selectOption("lunch");
    await mealForm.getByLabel("Planned").fill(`${mealDate}T12:30`);
    await mealForm.getByLabel("Recipe").selectOption({ label: recipeTitle });
    await mealForm
      .getByRole("button", { exact: true, name: "Meal erstellen" })
      .click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#nutrition-page")).toHaveAttribute(
      "data-content-state",
      /partial|filled/,
    );
    await openNutritionMealByTitle(page, mealTitle);
    await expect(page.getByText("Keine Nährwertschätzung").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("#nutrition-page").getByText(mealTitle).first()).toBeVisible();
    await expectNoNutritionDemoStrings(page);

    const createdMealRow = page.locator("article").filter({ hasText: mealTitle });

    if ((await createdMealRow.count()) > 0) {
      await createdMealRow
        .first()
        .getByRole("button", { name: "Gegessen" })
        .click();
    } else {
      await page.getByRole("button", { name: "Gegessen" }).first().click();
    }
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Recent Meals" }).getByText(mealTitle),
    ).toBeVisible();

    await page.goto("/nutrition/meal-planner");
    await expect(page.locator("#meal-planner-page")).not.toHaveAttribute(
      "data-content-state",
      "empty",
    );
    await page.goto("/nutrition/recipes");
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await expectNoNutritionDemoStrings(page);
  });

  test("Manual Meal Planner edits reschedules and relinks a completed Meal reload-stable", async ({ page }) => {
    test.setTimeout(90_000);
    const recipeA = uniqueTitle("Meal Planner Recipe A");
    const recipeB = uniqueTitle("Meal Planner Recipe B");
    const mealTitle = uniqueTitle("Meal Planner Edit Meal");
    const updatedTitle = `${mealTitle} updated`;
    const updatedNotes = "Reload-stable planner edit proof";
    const dateA = currentLocalDate();
    const dateB = currentIsoWeekDate(currentIsoWeekday() === 1 ? 1 : 0);

    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);
    if (!hasSupabaseAuth) test.skip(true, "Manual Supabase auth state unavailable; Meal Planner edit proof skipped.");
    await page.goto("/inbox");
    await skipIfManualDbUnavailable(page, "Manual Supabase auth state unavailable; Meal Planner edit proof skipped.");

    for (const title of [recipeA, recipeB]) {
      await page.goto("/nutrition/recipes");
      const recipeForm = page.getByRole("heading", { name: "Recipe erstellen" }).locator("xpath=ancestor::section[1]");
      await recipeForm.getByLabel("Title").fill(title);
      await recipeForm.getByLabel("Tags").fill("breakfast, dinner, proof");
      await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
      await expectRecipeVisibleInRecipeResults(page, title);
    }

    await page.goto("/nutrition");
    const mealForm = page.getByRole("heading", { name: "Meal erstellen" }).locator("xpath=ancestor::section[1]");
    await mealForm.getByLabel("Title").fill(mealTitle);
    await mealForm.getByLabel("Date").fill(dateA);
    await mealForm.getByLabel("Type").selectOption("breakfast");
    await mealForm.getByLabel("Planned").fill(`${dateA}T08:15`);
    await mealForm.getByLabel("Recipe").selectOption({ label: recipeA });
    await mealForm.getByLabel("Notes").fill("Before planner edit");
    await mealForm.getByRole("button", { exact: true, name: "Meal erstellen" }).click();

    await expect(page.locator("#nutrition-page").getByText(mealTitle).first()).toBeVisible();
    const mealArticle = page.locator("article").filter({ hasText: mealTitle }).first();
    if ((await mealArticle.count()) > 0) {
      await mealArticle.getByRole("button", { name: "Gegessen" }).click();
    } else {
      await page.getByRole("button", { name: "Gegessen" }).first().click();
    }
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("region", { name: "Recent Meals" }).getByText(mealTitle)).toBeVisible();

    await page.goto("/nutrition/meal-planner");
    const oldSlot = page.getByRole("button").filter({ hasText: recipeA }).first();
    await expect(oldSlot).toBeVisible();
    await oldSlot.focus();
    await oldSlot.press("Enter");
    const editForm = page.getByRole("heading", { name: "Meal bearbeiten" }).locator("xpath=ancestor::section[1]");
    await expect(editForm).toBeVisible();
    const plannedTimeBefore = await editForm.getByLabel("Geplante Zeit").inputValue();
    await editForm.getByLabel("Titel").fill(updatedTitle);
    await editForm.getByLabel("Notizen").fill(updatedNotes);
    await editForm.getByLabel("Datum").fill(dateB);
    await editForm.getByLabel("Meal Type").selectOption("dinner");
    await editForm.getByLabel("Recipe").selectOption({ label: recipeB });
    await expect(editForm.getByLabel("Geplante Zeit")).toHaveValue(`${dateB}${plannedTimeBefore.slice(10)}`);
    await editForm.getByRole("button", { name: "Meal speichern" }).click();
    await expect(editForm.getByRole("status")).toContainText("Meal aktualisiert.");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button").filter({ hasText: recipeA })).toHaveCount(0);
    const newSlot = page.getByRole("button").filter({ hasText: recipeB }).first();
    await expect(newSlot).toBeVisible();
    await newSlot.focus();
    await newSlot.press("Enter");
    const reloadedEditForm = page.getByRole("heading", { name: "Meal bearbeiten" }).locator("xpath=ancestor::section[1]");
    await expect(reloadedEditForm.getByLabel("Titel")).toHaveValue(updatedTitle);
    await expect(reloadedEditForm.getByLabel("Notizen")).toHaveValue(updatedNotes);
    await expect(reloadedEditForm.getByLabel("Datum")).toHaveValue(dateB);
    await expect(reloadedEditForm.getByLabel("Meal Type")).toHaveValue("dinner");
    await expect(reloadedEditForm.getByLabel("Recipe")).toHaveValue(/.+/);
    await expect(reloadedEditForm.getByText("Der Abschlussstatus bleibt unverändert.")).toBeVisible();
    await expect(reloadedEditForm.getByText("Status: Abgeschlossen")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button").filter({ hasText: recipeA })).toHaveCount(0);
    await expect(page.getByRole("button").filter({ hasText: recipeB }).first()).toBeVisible();
    await page.getByRole("button").filter({ hasText: recipeB }).first().focus();
    await page.getByRole("button").filter({ hasText: recipeB }).first().press("Enter");
    await expect(page.getByRole("heading", { name: "Meal bearbeiten" }).locator("xpath=ancestor::section[1]").getByText("Status: Abgeschlossen")).toBeVisible();
  });

  test("Manual Nutrition edits Recipe Entity reload-stable", async ({
    page,
  }) => {
    const recipeTitle = uniqueTitle("Manual Nutrition Edit Recipe");
    const updatedSummary = "Browser proof updated recipe summary";
    const updatedInstructions = [
      "Mix updated proof ingredients.",
      "Plate updated proof meal.",
    ].join("\n");

    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);

    if (!hasSupabaseAuth) {
      test.skip(
        true,
        "Manual Supabase auth state unavailable; Recipe edit proof skipped.",
      );
    }

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(
      page,
      "Manual Supabase auth state unavailable; Recipe edit proof skipped.",
    );

    await page.goto("/nutrition/recipes");
    await expectNoNutritionDemoStrings(page);
    const recipeForm = page
      .getByRole("heading", { name: "Recipe erstellen" })
      .locator("xpath=ancestor::section[1]");

    await recipeForm.getByLabel("Title").fill(recipeTitle);
    await recipeForm.getByLabel("Summary").fill("Browser proof pre-edit");
    await recipeForm.getByLabel("Tags").fill("lunch, proof");
    await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
    await page.waitForLoadState("networkidle");
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);

    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();
    const detailPanel = page.getByRole("region", { name: "Selected Recipe" });
    const editForm = detailPanel
      .getByRole("heading", { name: "Recipe bearbeiten" })
      .locator("xpath=ancestor::form[1]");

    await expect(editForm).toBeVisible();
    await editForm.getByLabel("Summary").fill(updatedSummary);
    await editForm.getByLabel("Instructions").fill(updatedInstructions);
    await editForm.getByLabel("Servings").fill("3");
    await editForm.getByLabel("Prep min").fill("12");
    await editForm.getByLabel("Tags").fill("dinner, proof");
    await editForm.getByRole("button", { name: "Recipe speichern" }).click();
    await expect(editForm.getByRole("status")).toContainText(
      "Recipe aktualisiert.",
    );

    await page.reload();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();
    const reloadedDetailPanel = page.getByRole("region", {
      name: "Selected Recipe",
    });

    await expect(reloadedDetailPanel.getByText(updatedSummary)).toBeVisible();
    const instructionsSection = reloadedDetailPanel
      .getByRole("heading", { name: "Instructions" })
      .locator("xpath=ancestor::section[1]");

    await expect(
      instructionsSection.getByText("Mix updated proof ingredients."),
    ).toBeVisible();
    await expect(
      instructionsSection.getByText("Plate updated proof meal."),
    ).toBeVisible();
    await expectNoNutritionDemoStrings(page);
  });

  test("Manual Nutrition manages Recipe Ingredients reload-stable", async ({
    page,
  }) => {
    const recipeTitle = uniqueTitle("Manual Nutrition Ingredient Recipe");
    const ingredientName = uniqueTitle("Manual Ingredient Olive Oil");
    const updatedIngredientName = uniqueTitle("Manual Ingredient Avocado Oil");

    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);

    if (!hasSupabaseAuth) {
      test.skip(
        true,
        "Manual Supabase auth state unavailable; Recipe ingredient proof skipped.",
      );
    }

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(
      page,
      "Manual Supabase auth state unavailable; Recipe ingredient proof skipped.",
    );

    await page.goto("/nutrition/recipes");
    await expectNoNutritionDemoStrings(page);
    const recipeForm = page
      .getByRole("heading", { name: "Recipe erstellen" })
      .locator("xpath=ancestor::section[1]");

    await recipeForm.getByLabel("Title").fill(recipeTitle);
    await recipeForm.getByLabel("Summary").fill("Browser proof ingredients");
    await recipeForm.getByLabel("Tags").fill("lunch, proof");
    await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
    await page.waitForLoadState("networkidle");
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);

    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();

    const detailPanel = page.getByRole("region", { name: "Selected Recipe" });
    await expect(
      detailPanel.getByText("Keine manuelle Nährwertschätzung hinterlegt."),
    ).toBeVisible();
    const ingredientManager = detailPanel
      .getByRole("heading", { name: "Zutaten verwalten" })
      .locator("xpath=ancestor::section[1]");
    const createIngredientForm = ingredientManager
      .getByRole("heading", { name: "Zutat hinzufügen" })
      .locator("xpath=ancestor::form[1]");

    await expect(createIngredientForm).toBeVisible();
    await createIngredientForm.getByLabel("Name").fill(ingredientName);
    await createIngredientForm.getByLabel("Menge").fill("2");
    await createIngredientForm.getByLabel("Einheit").fill("EL");
    await createIngredientForm
      .getByLabel("Notiz optional")
      .fill("kalt gepresst");
    await createIngredientForm
      .getByRole("button", { name: "Zutat hinzufügen" })
      .click();
    await expect(createIngredientForm.getByRole("status")).toContainText(
      "Zutat erstellt.",
    );
    await expect(
      ingredientManager.locator("[data-recipe-ingredient-id]"),
    ).toHaveCount(1);
    await expect(detailPanel.getByText(ingredientName).first()).toBeVisible();
    await expect(detailPanel.getByText("2 EL").first()).toBeVisible();

    await page.reload();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();
    const reloadedDetailPanel = page.getByRole("region", {
      name: "Selected Recipe",
    });
    const reloadedIngredientManager = reloadedDetailPanel
      .getByRole("heading", { name: "Zutaten verwalten" })
      .locator("xpath=ancestor::section[1]");
    const ingredientRow = reloadedIngredientManager
      .locator("[data-recipe-ingredient-id]")
      .first();

    await expect(reloadedDetailPanel.getByText(ingredientName).first()).toBeVisible();
    await expect(reloadedDetailPanel.getByText("2 EL").first()).toBeVisible();
    await ingredientRow.getByLabel("Name").fill(updatedIngredientName);
    await ingredientRow.getByLabel("Menge").fill("1.5");
    await ingredientRow.getByLabel("Einheit").fill("EL");
    await ingredientRow.getByLabel("Notiz optional").fill("mild");
    await ingredientRow
      .getByRole("button", { name: "Zutat speichern" })
      .click();
    await expect(ingredientRow.getByRole("status")).toContainText(
      "Zutat aktualisiert.",
    );
    await expect(
      reloadedDetailPanel.getByText(updatedIngredientName).first(),
    ).toBeVisible();

    await page.reload();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();
    const updatedDetailPanel = page.getByRole("region", {
      name: "Selected Recipe",
    });
    const updatedIngredientManager = updatedDetailPanel
      .getByRole("heading", { name: "Zutaten verwalten" })
      .locator("xpath=ancestor::section[1]");
    const updatedIngredientRow = updatedIngredientManager
      .locator("[data-recipe-ingredient-id]")
      .first();

    await expect(updatedDetailPanel.getByText(updatedIngredientName).first()).toBeVisible();
    await expect(updatedDetailPanel.getByText("1,5 EL").first()).toBeVisible();
    await updatedIngredientRow
      .getByRole("button", { name: "Zutat entfernen" })
      .click();
    await expect(
      updatedIngredientManager.locator("[data-recipe-ingredient-id]"),
    ).toHaveCount(0);
    await expect(
      updatedDetailPanel.getByText(updatedIngredientName),
    ).toHaveCount(0);

    await page.reload();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();
    const finalDetailPanel = page.getByRole("region", {
      name: "Selected Recipe",
    });
    const finalIngredientManager = finalDetailPanel
      .getByRole("heading", { name: "Zutaten verwalten" })
      .locator("xpath=ancestor::section[1]");

    await expect(
      finalIngredientManager.locator("[data-recipe-ingredient-id]"),
    ).toHaveCount(0);
    await expect(
      finalDetailPanel.getByText("Noch keine Zutaten hinterlegt.").first(),
    ).toBeVisible();
    await expectNoNutritionDemoStrings(page);
  });

  test("Manual Grocery generates a reload-stable weekly draft from every open Meal", async ({ page }) => {
    test.setTimeout(120_000);
    const recipeA = uniqueTitle("Grocery Recipe A");
    const recipeB = uniqueTitle("Grocery Recipe B");
    const recipeWithoutIngredients = uniqueTitle("Grocery Recipe Empty");
    const completedRecipe = uniqueTitle("Grocery Recipe Completed");
    const sharedIngredient = uniqueTitle("Grocery Shared Rice");
    const splitIngredient = uniqueTitle("Grocery Split Flour");
    const completedOnlyIngredient = uniqueTitle("Grocery Completed Only");
    const mealA = uniqueTitle("Grocery Same Slot A");
    const mealB = uniqueTitle("Grocery Same Slot B");
    const unresolvedNoRecipe = uniqueTitle("Grocery Missing Recipe");
    const unresolvedNoIngredients = uniqueTitle("Grocery Missing Ingredients");
    const completedMeal = uniqueTitle("Grocery Completed Meal");
    const mealDate = currentLocalDate();

    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);
    if (!hasSupabaseAuth) test.skip(true, "Manual Supabase auth state unavailable; Grocery proof skipped.");
    await page.goto("/inbox");
    await skipIfManualDbUnavailable(page, "Manual Supabase auth state unavailable; Grocery proof skipped.");

    async function createRecipe(title: string, ingredients: readonly { name: string; quantity: string; unit: string; note?: string }[]) {
      await page.goto("/nutrition/recipes");
      const recipeForm = page.getByRole("heading", { name: "Recipe erstellen" }).locator("xpath=ancestor::section[1]");
      await recipeForm.getByLabel("Title").fill(title);
      await recipeForm.getByLabel("Tags").fill("lunch, proof");
      await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
      await expectRecipeVisibleInRecipeResults(page, title);
      await page.getByRole("list", { name: "Recipe results" }).getByRole("button", { name: new RegExp(escapeRegExp(title)) }).first().click();
      const manager = page.getByRole("region", { name: "Selected Recipe" }).getByRole("heading", { name: "Zutaten verwalten" }).locator("xpath=ancestor::section[1]");
      for (const ingredient of ingredients) {
        const form = manager.getByRole("heading", { name: "Zutat hinzufügen" }).locator("xpath=ancestor::form[1]");
        await form.getByLabel("Name").fill(ingredient.name);
        await form.getByLabel("Menge").fill(ingredient.quantity);
        await form.getByLabel("Einheit").fill(ingredient.unit);
        if (ingredient.note) await form.getByLabel("Notiz optional").fill(ingredient.note);
        await form.getByRole("button", { name: "Zutat hinzufügen" }).click();
        await expect(form.getByRole("status")).toContainText("Zutat erstellt.");
      }
    }

    async function createMeal(title: string, recipe?: string) {
      await page.goto("/nutrition");
      const form = page.getByRole("heading", { name: "Meal erstellen" }).locator("xpath=ancestor::section[1]");
      await form.getByLabel("Title").fill(title);
      await form.getByLabel("Date").fill(mealDate);
      await form.getByLabel("Type").selectOption("lunch");
      await form.getByLabel("Planned").fill(`${mealDate}T12:30`);
      if (recipe) await form.getByLabel("Recipe").selectOption({ label: recipe });
      await form.getByRole("button", { exact: true, name: "Meal erstellen" }).click();
      await expect(page.locator("#nutrition-page").getByText(title).first()).toBeVisible();
    }

    await createRecipe(recipeA, [
      { name: sharedIngredient, quantity: "100", unit: "g", note: "rinse" },
      { name: splitIngredient, quantity: "1", unit: "g" },
    ]);
    await createRecipe(recipeB, [
      { name: sharedIngredient, quantity: "250", unit: "g", note: "rinse" },
      { name: splitIngredient, quantity: "1", unit: "kg" },
    ]);
    await createRecipe(recipeWithoutIngredients, []);
    await createRecipe(completedRecipe, [
      { name: completedOnlyIngredient, quantity: "5", unit: "piece" },
    ]);

    await createMeal(mealA, recipeA);
    await createMeal(mealB, recipeB);
    await createMeal(unresolvedNoRecipe);
    await createMeal(unresolvedNoIngredients, recipeWithoutIngredients);
    await createMeal(completedMeal, completedRecipe);
    const completedArticle = page.locator("article").filter({ hasText: completedMeal }).first();
    await completedArticle.getByRole("button", { name: "Gegessen" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Recent Meals" }).getByText(completedMeal),
    ).toBeVisible();

    await page.goto("/nutrition/grocery");
    const draft = page.locator('[data-grocery-section="draft"]');
    await expect(draft).toContainText(/\d+ offene Meals berücksichtigt/);
    const sharedRow = draft.locator("[data-grocery-item]").filter({ hasText: sharedIngredient });
    await expect(sharedRow).toContainText("350 g");
    await expect(sharedRow).toContainText("2 Meals");
    const splitRows = draft.locator("[data-grocery-item]").filter({ hasText: splitIngredient });
    await expect(splitRows).toHaveCount(2);
    await expect(splitRows.filter({ hasText: "1 g" })).toHaveCount(1);
    await expect(splitRows.filter({ hasText: "1 kg" })).toHaveCount(1);
    await expect(draft.getByText(completedOnlyIngredient)).toHaveCount(0);
    const unresolved = page.locator('[data-grocery-section="unresolved"]');
    await expect(unresolved.getByText(unresolvedNoRecipe)).toBeVisible();
    await expect(unresolved.getByText(unresolvedNoIngredients)).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-grocery-section="draft"]').locator("[data-grocery-item]").filter({ hasText: sharedIngredient })).toContainText("350 g");
    await expect(page.locator('[data-grocery-section="unresolved"]').getByText(unresolvedNoRecipe)).toBeVisible();
    await expect(page.getByText(completedOnlyIngredient)).toHaveCount(0);
  });

  test("Manual Nutrition archives Recipe Entity without deleting existing Meal", async ({
    page,
  }) => {
    const recipeTitle = uniqueTitle("Manual Nutrition Archive Recipe");
    const mealTitle = uniqueTitle("Manual Nutrition Archive Meal");
    const mealDate = currentLocalDate();

    await setProfile(page, "manual");
    const hasSupabaseAuth = await applySupabaseAuthState(page);

    if (!hasSupabaseAuth) {
      test.skip(
        true,
        "Manual Supabase auth state unavailable; Recipe archive proof skipped.",
      );
    }

    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(
      page,
      "Manual Supabase auth state unavailable; Recipe archive proof skipped.",
    );

    await page.goto("/nutrition/recipes");
    await expectNoNutritionDemoStrings(page);
    const recipeForm = page
      .getByRole("heading", { name: "Recipe erstellen" })
      .locator("xpath=ancestor::section[1]");

    await recipeForm.getByLabel("Title").fill(recipeTitle);
    await recipeForm.getByLabel("Summary").fill("Browser proof archive recipe");
    await recipeForm.getByLabel("Tags").fill("lunch, proof");
    await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
    await page.waitForLoadState("networkidle");
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);

    await page.goto("/nutrition");
    const mealForm = page
      .getByRole("heading", { name: "Meal erstellen" })
      .locator("xpath=ancestor::section[1]");

    await mealForm.getByLabel("Title").fill(mealTitle);
    await mealForm.getByLabel("Date").fill(mealDate);
    await mealForm.getByLabel("Type").selectOption("lunch");
    await mealForm.getByLabel("Planned").fill(`${mealDate}T12:45`);
    await mealForm.getByLabel("Recipe").selectOption({ label: recipeTitle });
    await mealForm
      .getByRole("button", { exact: true, name: "Meal erstellen" })
      .click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#nutrition-page").getByText(mealTitle).first()).toBeVisible();

    await page.goto("/nutrition/recipes");
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page
      .getByRole("list", { name: "Recipe results" })
      .getByRole("button", { name: new RegExp(escapeRegExp(recipeTitle)) })
      .first()
      .click();
    const detailPanel = page.getByRole("region", { name: "Selected Recipe" });
    const archiveForm = detailPanel
      .getByRole("heading", { name: "Recipe archivieren" })
      .locator("xpath=ancestor::form[1]");

    await archiveForm.getByRole("button", { name: "Recipe archivieren" }).click();
    await expect(archiveForm.getByRole("status")).toContainText(
      "Recipe archiviert.",
    );

    await page.reload();
    await expectRecipeAbsentFromRecipeResults(page, recipeTitle);
    await page.goto("/nutrition");
    await expect(page.locator("#nutrition-page").getByText(mealTitle).first()).toBeVisible();
    await page.reload();
    await expect(page.locator("#nutrition-page").getByText(mealTitle).first()).toBeVisible();
    await expectNoNutritionDemoStrings(page);
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
      page.getByRole("link", { name: /Sleep: Unknown/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /No sleep entry/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Review Status: Not started/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Daily and weekly review/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Nutrition: No meals/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Recipe estimates unavailable/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Kein aktueller Fokus/ }),
    ).toBeVisible();
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
    const quickThoughtInput = quickThought.getByRole("textbox", {
      name: "Quick Thought",
    });
    const quickThoughtSubmit = quickThought.getByRole("button", {
      name: "In Inbox speichern",
    });
    await expect(quickThoughtInput).toBeVisible();
    await quickThoughtInput.focus();
    await expect(quickThoughtInput).toBeFocused();
    await quickThoughtSubmit.click();
    await expect(
      quickThought.getByRole("alert").filter({
        hasText: "Erfasse zuerst einen Gedanken.",
      }),
    ).toBeVisible();
    await quickThoughtInput.fill(thought);
    await quickThoughtSubmit.click();
    await expect(
      quickThought.getByRole("status").filter({
        hasText: "In der Inbox gespeichert.",
      }),
    ).toBeVisible();
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
    await expect(todayAgenda).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
    await expectDashboardTodayAgendaText(page, title);
  });

  test("keeps unsupported Manual prototype widgets honest", async ({
    page,
  }) => {
    await setProfile(page, "manual");
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
    await expect(page.getByRole("button", { name: /Add habit/ })).toBeVisible();
    await expect(page.getByText(/Sign in to use Manual mood writes/)).toBeVisible();
    await expect(page.getByText(/Prepared · challenge source/)).toBeVisible();
  });
});

test.describe("D1.2 Daily and Weekly Review", () => {
  test.describe.configure({ mode: "serial" });

  test("saves Daily Review, carries a task atomically and updates projections reload-stable", async ({
    page,
  }) => {
    test.slow();
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const taskTitle = uniqueTitle("D1.2 Carry Task");
    const outcome = uniqueTitle("D1.2 Daily Outcome");
    const tomorrowFocus = uniqueTitle("D1.2 Tomorrow Focus");

    await captureAndTriageManualInboxTask(
      page,
      taskTitle,
      "Carry this task through the canonical Daily Review.",
      { durationMinutes: "15", priority: "P1" },
    );
    await openPortfolioTaskPlanningControls(page, taskTitle);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");

    await page.goto("/review/daily");
    const form = page.locator('[data-review-form="daily"]');
    await form.getByRole("textbox", { exact: true, name: "Outcome" }).fill(outcome);
    await form
      .getByRole("textbox", { exact: true, name: "Open loops · one per line" })
      .fill(taskTitle);
    await form
      .getByRole("textbox", { exact: true, name: "Tomorrow focus" })
      .fill(tomorrowFocus);
    await form.getByRole("checkbox", { name: new RegExp(taskTitle) }).check();
    await form.getByRole("button", { name: "Complete Daily Review" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/review\/daily\?review=saved/);
    await page.reload();
    await expect(page.locator('[data-review-section="status"]')).toContainText(
      "completed",
    );
    await expect(
      form.getByRole("textbox", { exact: true, name: "Outcome" }),
    ).toHaveValue(outcome);
    await expect(
      form.getByRole("checkbox", { name: new RegExp(taskTitle) }),
    ).toBeChecked();

    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: /Review Status: Complete/ }),
    ).toBeVisible();

    await page.goto("/today");
    const closingReview = page.locator('[data-today-section="closing-review"]');
    await expect(closingReview).toContainText(tomorrowFocus);
    await expect(closingReview).toContainText(taskTitle);
    await page.reload();
    await expect(
      page.locator('[data-today-section="closing-review"]'),
    ).toContainText(taskTitle);

    await page.goto("/calendar");
    const queue = page.locator('[data-calendar-section="planning-queue"]');
    await queue.getByRole("button", { name: "Review status context" }).click();
    await expect(queue.getByRole("link", { name: "Daily Review" })).toHaveCount(0);
    await queue
      .getByRole("button", { name: "Tasks planned without time" })
      .click();
    await expect(queue.getByText(taskTitle).first()).toBeVisible();
  });

  test("saves Weekly Review with canonical movement reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );
    const outcome = uniqueTitle("D1.2 Weekly Outcome");
    const nextWeek = uniqueTitle("D1.2 Next Week Focus");

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await page.goto("/review/weekly");
    const form = page.locator('[data-review-form="weekly"]');
    await expect(form.locator('[data-review-section="movement"]')).toBeVisible();
    await form.getByRole("textbox", { exact: true, name: "Outcome" }).fill(outcome);
    await form
      .getByRole("textbox", { exact: true, name: "Next-week focus" })
      .fill(nextWeek);
    await form.getByRole("button", { name: "Complete Weekly Review" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/review\/weekly\?review=saved/);
    await page.reload();
    await expect(page.locator('[data-review-section="status"]')).toContainText(
      "completed",
    );
    await expect(
      form.getByRole("textbox", { exact: true, name: "Next-week focus" }),
    ).toHaveValue(nextWeek);

    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", {
        name: /Review Status: Complete, Weekly completed/,
      }),
    ).toBeVisible();
  });

  test("keeps Empty and unauthenticated Manual review states honest", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await page.goto("/review/daily");
    await expect(
      page
        .locator('[data-review-form="daily"]')
        .getByRole("button", { name: "Complete Daily Review" }),
    ).toBeDisabled();

    await setProfile(page, "manual");
    await page.goto("/review/weekly");
    await expect(page.getByText(/Melde dich lokal mit Supabase an/)).toBeVisible();
    await expect(
      page
        .locator('[data-review-form="weekly"]')
        .getByRole("button", { name: "Complete Weekly Review" }),
    ).toBeDisabled();
  });
});

test.describe("D2.1 Schedule Source Links", () => {
  test("plans a Meal idempotently across Calendar Today Dashboard and completes it atomically", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase.");
    const recipeTitle = uniqueTitle("D2.1 Recipe");
    const mealTitle = uniqueTitle("D2.1 Meal");
    const mealDate = currentLocalDate();

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await page.goto("/nutrition/recipes");
    const recipeForm = page.getByRole("heading", { name: "Recipe erstellen" }).locator("xpath=ancestor::section[1]");
    await recipeForm.getByLabel("Title").fill(recipeTitle);
    await recipeForm.getByLabel("Tags").fill("lunch, proof");
    await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);

    await page.goto("/nutrition");
    const mealForm = page.getByRole("heading", { name: "Meal erstellen" }).locator("xpath=ancestor::section[1]");
    await mealForm.getByLabel("Title").fill(mealTitle);
    await mealForm.getByLabel("Date").fill(mealDate);
    await mealForm.getByLabel("Type").selectOption("dinner");
    await mealForm.getByLabel("Planned").fill(`${mealDate}T19:30`);
    await mealForm.getByLabel("Recipe").selectOption({ label: recipeTitle });
    await Promise.all([
      page.waitForEvent("load"),
      mealForm.getByRole("button", { exact: true, name: "Meal erstellen" }).click(),
    ]);

    await page.goto("/nutrition/meal-planner");
    const slot = page.getByRole("button").filter({ hasText: recipeTitle }).first();
    await slot.focus();
    await slot.press("Enter");
    const scheduleForm = page.getByRole("form", { name: `${mealTitle} als Zeitblock planen` });
    await scheduleForm.getByLabel("Blockzeit").fill("19:30");
    await scheduleForm.getByRole("button", { name: "Im Calendar planen" }).click();
    await page.waitForLoadState("networkidle");
    await scheduleForm.getByRole("button", { name: "Im Calendar planen" }).click();
    await page.waitForLoadState("networkidle");

    for (const route of ["/calendar", "/today", "/dashboard"]) {
      await page.goto(route);
      const projection = route === "/calendar"
        ? page.locator('[data-calendar-section="page"]')
        : route === "/today"
          ? page.locator('[data-today-section="activity-stream"]')
          : page.locator('section[aria-labelledby="today-agenda-title"]');
      await expect(projection.getByText(mealTitle).filter({ visible: true }).first()).toBeVisible();
      await page.reload();
      await expect(projection.getByText(mealTitle).filter({ visible: true }).first()).toBeVisible();
    }

    await page.goto("/calendar");
    await selectCalendarTimedBlock(page, mealTitle);
    const inspector = page.locator('aside[aria-labelledby="calendar-right-panel-heading"]');
    await expect(inspector).toContainText("Meal / Nutrition");
    await expect(inspector.getByRole("link", { name: "Open source" })).toHaveAttribute("href", "/nutrition/meal-planner");
    const completionForm = inspector.getByRole("form", { name: `${mealTitle} abschließen` });
    const taskIdInput = completionForm.locator('input[name="taskId"]');
    const linkedTaskId = await taskIdInput.inputValue();
    await taskIdInput.evaluate((input) => { (input as HTMLInputElement).value = "00000000-0000-4000-8000-000000000001"; });
    await completionForm.getByRole("button", { name: "Mark done" }).click();
    await expect(inspector.getByRole("alert").filter({ hasText: "Task konnte" })).toBeVisible();
    await taskIdInput.evaluate((input, value) => { (input as HTMLInputElement).value = value; }, linkedTaskId);
    await completionForm.getByRole("button", { name: "Mark done" }).click();
    await expect(inspector.getByRole("status")).toContainText("abgeschlossen");
    await page.waitForLoadState("networkidle");
    await page.goto("/nutrition");
    await expect(page.getByRole("region", { name: "Recent Meals" }).getByText(mealTitle)).toBeVisible();
  });

  for (const kind of ["daily", "weekly"] as const) {
    test(`plans and completes the ${kind} Review through its linked Calendar block`, async ({ page }) => {
      test.setTimeout(90_000);
      test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase.");
      const title = kind === "daily" ? "Daily Review" : "Weekly Review";
      await setProfile(page, "manual");
      await applySupabaseAuthState(page);
      await page.goto(`/review/${kind}`);
      const reviewForm = page.locator(`[data-review-form="${kind}"]`);
      await reviewForm.getByRole("button", { name: "Save draft" }).click();
      await page.waitForLoadState("networkidle");
      const scheduleForm = page.getByRole("form", { name: `${title} als Zeitblock planen` });
      await scheduleForm.getByLabel("Review-Blockdatum").fill(currentLocalDate());
      await scheduleForm.getByLabel("Review-Blockzeit").fill(kind === "daily" ? "20:30" : "18:00");
      await scheduleForm.getByRole("button", { name: "Im Calendar planen" }).click();
      await page.waitForLoadState("networkidle");
      await page.goto("/calendar");
      await selectCalendarTimedBlock(page, title);
      const inspector = page.locator('aside[aria-labelledby="calendar-right-panel-heading"]');
      await expect(inspector).toContainText("Review / Daily loop");
      await expect(inspector.getByRole("link", { name: "Open source" })).toHaveAttribute("href", `/review/${kind}`);
      await inspector.getByRole("button", { name: "Mark done" }).click();
      await page.waitForLoadState("networkidle");
      await page.goto(`/review/${kind}`);
      await expect(page.locator('[data-review-section="status"]')).toContainText("completed");
      await page.reload();
      await expect(page.locator('[data-review-section="status"]')).toContainText("completed");
    });
  }

  test("completes a linked Meal from Nutrition and keeps the Calendar task done idempotently", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase.");
    const recipeTitle = uniqueTitle("D2.1 Nutrition Completion Recipe");
    const mealTitle = uniqueTitle("D2.1 Nutrition Completion Meal");
    const mealDate = currentIsoWeekDate(6);
    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await page.goto("/nutrition/recipes");
    const recipeForm = page.getByRole("heading", { name: "Recipe erstellen" }).locator("xpath=ancestor::section[1]");
    await recipeForm.getByLabel("Title").fill(recipeTitle);
    await recipeForm.getByLabel("Tags").fill("lunch, proof");
    await recipeForm.getByRole("button", { name: "Recipe erstellen" }).click();
    await expectRecipeVisibleInRecipeResults(page, recipeTitle);
    await page.goto("/nutrition");
    const mealForm = page.getByRole("heading", { name: "Meal erstellen" }).locator("xpath=ancestor::section[1]");
    await mealForm.getByLabel("Title").fill(mealTitle);
    await mealForm.getByLabel("Date").fill(mealDate);
    await mealForm.getByLabel("Type").selectOption("breakfast");
    await mealForm.getByLabel("Planned").fill(`${mealDate}T08:15`);
    await mealForm.getByLabel("Recipe").selectOption({ label: recipeTitle });
    await mealForm.getByRole("button", { exact: true, name: "Meal erstellen" }).click();
    await expect(page.locator("#nutrition-page").getByText(mealTitle).first()).toBeVisible();
    await page.goto("/nutrition/meal-planner");
    const slot = page.getByRole("button").filter({ hasText: recipeTitle }).first();
    await slot.focus();
    await slot.press("Enter");
    const scheduleForm = page.getByRole("form", { name: `${mealTitle} als Zeitblock planen` });
    await scheduleForm.getByLabel("Blockzeit").fill("08:15");
    await scheduleForm.getByRole("button", { name: "Im Calendar planen" }).click();
    await page.waitForLoadState("networkidle");
    await page.goto("/nutrition");
    const mealArticle = page.locator("article").filter({ hasText: mealTitle }).first();
    if ((await mealArticle.count()) > 0) {
      await mealArticle.getByRole("button", { name: "Gegessen" }).click();
    } else {
      const nextMeal = page.getByRole("region", { name: "Next Meal" });
      await expect(nextMeal.getByText(mealTitle)).toBeVisible();
      await nextMeal.getByRole("button", { name: "Gegessen" }).first().click();
    }
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByRole("region", { name: "Recent Meals" }).getByText(mealTitle)).toBeVisible();
    await page.goto("/calendar");
    await selectCalendarTimedBlock(page, mealTitle);
    const inspector = page.locator('aside[aria-labelledby="calendar-right-panel-heading"]');
    await expect(inspector).toContainText("done");
    await expect(inspector.getByRole("button", { name: "Mark done" })).toBeDisabled();
    await page.reload();
    await selectCalendarTimedBlock(page, mealTitle);
    await expect(page.locator('aside[aria-labelledby="calendar-right-panel-heading"]').getByRole("button", { name: "Mark done" })).toBeDisabled();
  });

  test("completes a linked Review from its Review page and keeps the Calendar task done idempotently", async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase.");
    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await page.goto("/review/daily");
    const reviewForm = page.locator('[data-review-form="daily"]');
    await reviewForm.getByRole("button", { name: "Save draft" }).click();
    await page.waitForLoadState("networkidle");
    const scheduleForm = page.getByRole("form", { name: "Daily Review als Zeitblock planen" });
    await scheduleForm.getByLabel("Review-Blockdatum").fill(currentLocalDate());
    await scheduleForm.getByLabel("Review-Blockzeit").fill("21:15");
    await scheduleForm.getByRole("button", { name: "Im Calendar planen" }).click();
    await page.waitForLoadState("networkidle");
    await page.goto("/review/daily");
    await page.locator('[data-review-form="daily"]').getByRole("button", { name: "Complete Daily Review" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/review\/daily\?review=saved/);
    await page.reload();
    await expect(page.locator('[data-review-section="status"]')).toContainText("completed");
    await page.goto("/calendar");
    await selectCalendarTimedBlock(page, "Daily Review");
    const inspector = page.locator('aside[aria-labelledby="calendar-right-panel-heading"]');
    await expect(inspector).toContainText("done");
    await expect(inspector.getByRole("button", { name: "Mark done" })).toBeDisabled();
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
    ).toContainText("Status: Teilweise verbunden");

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
    await expect(activeItem.getByLabel("Titel")).toBeVisible();
    await expect(activeItem.getByLabel("Beschreibung / Kontext")).toBeVisible();
    await expect(activeItem.getByLabel("Nächste Aktion")).toBeVisible();
    await expect(activeItem.getByLabel("Priorität")).toBeVisible();
    await expect(activeItem.getByLabel("Effort / Dauer")).toBeVisible();
    await expect(activeItem.getByLabel("Energie")).toBeVisible();
    await expect(activeItem.getByLabel("Heute planen")).toBeVisible();
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

  test("Create New route exposes Project and Goal draft controls", async ({
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
      createNewDraft.getByText("Teilweise verbunden").first(),
    ).toBeVisible();
    await expect(
      createNewDraft.getByRole("button", { name: "Project erstellen" }),
    ).toBeDisabled();
    await createNewDraft
      .getByRole("button", { name: "Goal DB-Erstellung" })
      .click();
    await expect(
      createNewDraft.getByRole("button", { name: "Goal erstellen" }),
    ).toBeDisabled();
    await createNewDraft
      .getByRole("button", { name: "Resource Vorbereitet" })
      .click();
    await expect(createNewDraft.getByLabel("Status")).toHaveValue(
      "Resource nutzt eigene Inbox-Route",
    );
    await createNewDraft
      .getByRole("button", { name: "Skill Vorbereitet" })
      .click();
    await expect(createNewDraft.getByLabel("Status")).toHaveValue(
      "Future Scope",
    );
    await expect(
      createNewDraft.getByRole("link", { name: "Portfolio öffnen" }),
    ).toHaveCount(0);
  });

  test("Manual Inbox Create New Project persists and resolves", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const captureTitle = uniqueTitle("Manual Inbox create project source");
    const projectTitle = uniqueTitle("Manual Inbox created project");

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(
      page,
      captureTitle,
      "Create a new Project from this inbox capture.",
    );

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await activeItem.locator('[data-outcome-route="create_new"]').click();
    const createNewDraft = activeItem
      .getByRole("heading", { name: "Create New Draft" })
      .locator("xpath=ancestor::section[1]");
    await expect(createNewDraft).toBeVisible();
    await createNewDraft.getByLabel("Titel").fill(projectTitle);
    await createNewDraft
      .getByLabel("Beschreibung / Kontext")
      .fill("Project created from Inbox Create New.");
    await createNewDraft
      .getByLabel("Nächste Aktion")
      .fill("Review the created project.");
    await expect(
      createNewDraft.getByRole("button", { name: "Project erstellen" }),
    ).toBeEnabled();
    await createNewDraft
      .getByRole("button", { name: "Project erstellen" })
      .click();
    await expectManualInboxItemResolved(page, captureTitle);
    await page.reload();
    await expectManualInboxItemResolved(page, captureTitle);
  });

  test("Manual Inbox Create New Goal persists and resolves", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const captureTitle = uniqueTitle("Manual Inbox create goal source");
    const goalTitle = uniqueTitle("Manual Inbox created goal");

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(
      page,
      captureTitle,
      "Create a new Goal from this inbox capture.",
    );

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await activeItem.locator('[data-outcome-route="create_new"]').click();
    const createNewDraft = activeItem
      .getByRole("heading", { name: "Create New Draft" })
      .locator("xpath=ancestor::section[1]");
    await expect(createNewDraft).toBeVisible();
    await createNewDraft
      .getByRole("button", { name: "Goal DB-Erstellung" })
      .click();
    await createNewDraft.getByLabel("Titel").fill(goalTitle);
    await createNewDraft
      .getByLabel("Beschreibung / Kontext")
      .fill("Goal created from Inbox Create New.");
    await expect(
      createNewDraft.getByRole("button", { name: "Goal erstellen" }),
    ).toBeEnabled();
    await createNewDraft
      .getByRole("button", { name: "Goal erstellen" })
      .click();
    await expectManualInboxItemResolved(page, captureTitle);
    await page.reload();
    await expectManualInboxItemResolved(page, captureTitle);
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

  test("Manual AI Suggestion fills Task Draft and persists only after confirm", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const captureTitle = `Call dentist today ${timestamp}`;
    const editedTaskTitle = `AI Inbox task accepted ${timestamp}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    const taskCountBefore = await readProfileDataTaskCount(page);
    await expect(page.getByText("Aktives Profil: manual")).toBeVisible();
    await page.goto("/inbox");
    await captureManualInboxItem(
      page,
      captureTitle,
      "Call dentist today and prepare one short follow up.",
    );

    const assistant = await generateInboxAISuggestion(page);

    await expect(assistant.getByText("Route: Standalone Task")).toBeVisible();
    await expect(assistant.getByText("Confidence: high")).toBeVisible();
    await applyInboxAISuggestion(page);

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(
      activeItem.getByRole("heading", { name: "Task Draft" }),
    ).toBeVisible();
    await expect(activeItem.getByLabel("Titel")).toHaveValue(captureTitle);
    await expect(activeItem.getByLabel("Nächste Aktion")).toHaveValue(
      /Call dentist/,
    );
    await expect(activeItem.getByLabel("Priorität")).toHaveValue("P2");
    await expect(activeItem.getByLabel("Energie")).toHaveValue("low");
    await expect(activeItem.getByLabel("Heute planen")).toBeChecked();

    await activeItem.getByLabel("Titel").fill(editedTaskTitle);
    await activeItem
      .getByRole("button", { exact: true, name: "Task erstellen" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Task erstellt").first()).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Diese Inbox wurde in eine Task umgewandelt" })
        .first(),
    ).toBeVisible();
    await expect
      .poll(async () => readProfileDataTaskCount(page))
      .toBeGreaterThan(taskCountBefore);
    await openPortfolioEntityByTitle(page, "tasks", editedTaskTitle);
    await page.reload();
    await expectSelectedPortfolioEntity(page, editedTaskTitle);
  });

  test("Manual AI Suggestion does not auto-persist target objects", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const captureTitle = `Email pharmacy AI no persist ${timestamp}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    const taskCountBefore = await readProfileDataTaskCount(page);
    await page.goto("/inbox");
    await captureManualInboxItem(
      page,
      captureTitle,
      "Email pharmacy tomorrow but do not create the task yet.",
    );

    const assistant = await generateInboxAISuggestion(page);

    await expect(
      assistant.getByText("Deterministischer Mock.").first(),
    ).toBeVisible();
    await expect(assistant.getByText("keine Persistenz").first()).toBeVisible();
    await expect(assistant.getByText("Route: Standalone Task")).toBeVisible();
    await page.reload();
    await expect(page.getByText(captureTitle).first()).toBeVisible();
    await expect(await readProfileDataTaskCount(page)).toBe(taskCountBefore);
    await page.goto("/portfolio?view=tasks");
    await expect(page.getByText(captureTitle)).toHaveCount(0);
  });

  test("Manual AI Suggestion fills Resource Draft and persists after confirm", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const captureTitle = uniqueTitle("Read article AI inbox resource");
    const resourceTitle = uniqueTitle("AI Inbox resource accepted");

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(
      page,
      captureTitle,
      "Read article https://example.test/ai-inbox-suggestions for later reference.",
    );

    const assistant = await generateInboxAISuggestion(page);

    await expect(assistant.getByText("Route: Resource")).toBeVisible();
    await applyInboxAISuggestion(page);

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    const resourceDraft = activeItem
      .getByRole("heading", { name: "Resource Draft" })
      .locator("xpath=ancestor::section[1]");

    await expect(resourceDraft).toBeVisible();
    await expect(resourceDraft.getByLabel("Titel")).toHaveValue(captureTitle);
    await expect(resourceDraft.getByLabel("Resource Typ")).toHaveValue("link");
    await resourceDraft.getByLabel("Titel").fill(resourceTitle);
    await resourceDraft
      .getByRole("button", { exact: true, name: "Resource erstellen" })
      .click();
    await expectManualInboxItemResolved(page, captureTitle);
    await page.reload();
    await expectManualInboxItemResolved(page, captureTitle);
  });

  test("Manual AI Suggestion solved archive requires user confirmation", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const captureTitle = `Already solved AI inbox ${Date.now()}`;

    await setProfile(page, "manual");
    await applySupabaseAuthState(page);
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/inbox");
    });
    await skipIfManualDbUnavailable(page);
    await captureManualInboxItem(
      page,
      captureTitle,
      "Already solved and fixed. Keep it active until user confirmation.",
    );

    const assistant = await generateInboxAISuggestion(page);

    await expect(assistant.getByText("Route: Solved / Archive")).toBeVisible();
    await applyInboxAISuggestion(page);

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(
      activeItem.getByRole("heading", { name: "Solved / Archive Draft" }),
    ).toBeVisible();
    await expect(
      activeItem.getByRole("button", { name: "Als erledigt archivieren" }),
    ).toBeVisible();
    await expect(page.getByText(captureTitle).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(captureTitle).first()).toBeVisible();
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
    await page.reload();

    const activeItem = page.locator('[data-inbox-section="active-item"]');
    await expect(activeItem.getByRole("heading", { name: title })).toBeVisible();
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
    await expect(
      page
        .locator('[data-resources-section="library"]')
        .getByRole("link", {
          name: new RegExp(`Select resource ${escapeRegExp(draftTitle)}`),
        }),
    ).toHaveCount(0);
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

    await page.goto("/resources");
    await expect(page.locator("#resources-page")).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
    await openResourceByTitle(page, draftTitle);
    await expectNoMainStrings(page, resourcesBlockedDemoStrings, "resources");
    await page.reload();
    await expect(page.locator("#selected-resource-heading")).toHaveText(
      draftTitle,
    );

    await page.goto("/portfolio?view=tasks");
    await expect(
      page
        .locator('[data-portfolio-section="entity-list"]')
        .getByRole("link", { name: new RegExp(escapeRegExp(draftTitle)) }),
    ).toHaveCount(0);

    await page.goto("/inbox");
    await expect(
      page.locator('[data-inbox-section="queue"]').getByText(title),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-inbox-section="active-item"]').getByText(title),
    ).toHaveCount(0);
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

    await expect(
      activeItem.getByRole("heading", { name: "Task erstellt" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Portfolio öffnen" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Portfolio öffnen" }).first().click();
    await expect(page).toHaveURL(/\/portfolio\?view=tasks/);
    await expect(page.getByText(draftTitle).first()).toBeVisible();
    const taskHref = await page
      .getByRole("link", { name: new RegExp(draftTitle) })
      .first()
      .getAttribute("href");

    expect(taskHref).toBeTruthy();
    await page.goto(taskHref ?? "/portfolio?view=tasks");
    await expect(page.locator("#selected-entity-heading")).toHaveText(
      draftTitle,
    );
    await expect(page.getByText("P1 / high").first()).toBeVisible();
    await expect(page.getByText("60 min").first()).toBeVisible();
    await expect(page.getByText(draftNextAction).first()).toBeVisible();
    await page.goto("/inbox");
    await page.reload();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(
      activeItem.getByRole("heading", { name: "Task erstellt" }),
    ).toHaveCount(1);
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
      {
        durationMinutes: "15",
        energy: "high",
        priority: "P0",
      },
    );
    await page.goto("/today");

    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    const todayPlanner = page.locator('[data-today-section="today-planner"]');
    const activityTimeline = page.locator(
      '[data-today-section="activity-stream"] ol',
    );

    await expect(todayPlanner).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
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
      .locator('select[name="priority"]')
      .selectOption("P0");
    await addToExistingDraft
      .locator('select[name="energy"]')
      .selectOption("high");
    await addToExistingDraft
      .locator('select[name="durationMinutes"]')
      .selectOption("15");
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
      {
        durationMinutes: "15",
        energy: "high",
        priority: "P0",
      },
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
    await expectDashboardTodayAgendaItemDetail(page, title, "Flexible · 15 min");

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

  test("Manual Recurring generates task into Today, Dashboard and Calendar queue", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const title = uniqueTitle("Manual Recurring Today");

    await createRecurringTemplateFromToday(page, title, {
      durationMinutes: "15",
      frequency: "daily",
      priority: "P0",
    });
    await generateRecurringTasksForToday(page);
    await expect(
      page.getByText("Wiederkehrende Aufgaben erzeugt.").first(),
    ).toBeVisible();

    const activityTimeline = page.locator(
      '[data-today-section="activity-stream"] ol',
    );
    const generatedEvent = activityTimeline.locator("article").filter({
      hasText: title,
    });

    await expect(generatedEvent).toHaveCount(1);
    await expect(generatedEvent.getByText("Wiederkehrend")).toBeVisible();
    await page.reload();
    await expect(
      page.locator('[data-today-section="activity-stream"] ol').getByText(title),
    ).toHaveCount(1);

    await page.goto("/dashboard");
    await expectDashboardTodayAgendaItemDetail(page, title, "Flexible · 15 min");

    await page.goto("/calendar");
    const calendarPlannerQueue = page
      .locator('[data-calendar-section="planning-queue"]')
      .first();
    await expect(calendarPlannerQueue.getByText(title).first()).toBeVisible();
    await expect(
      calendarPlannerQueue.getByText("Wiederkehrend").first(),
    ).toBeVisible();

    await page.goto("/today");
    await generateRecurringTasksForToday(page);
    await expect(
      page.getByText("Keine neuen wiederkehrenden Aufgaben fällig.").first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-today-section="activity-stream"] ol').getByText(title),
    ).toHaveCount(1);
  });

  test("Manual Recurring creates and edits a template across reload", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const title = uniqueTitle("Manual Recurring Manage");
    const updatedTitle = `${title} Updated`;
    await createRecurringTemplateFromToday(page, title, {
      durationMinutes: "30",
      frequency: "daily",
    });

    const template = page
      .locator('[data-recurring-section="template-list"] details')
      .filter({ hasText: title });
    await expect(template).toHaveCount(1);
    await template.locator("summary").click();
    await template.getByLabel("Titel").fill(updatedTitle);
    await template.getByLabel("Intervall").fill("2");
    await template.getByLabel("Standarddauer").fill("45");
    await template.getByRole("button", { name: "Vorlage speichern" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Wiederkehrende Vorlage aktualisiert.")).toBeVisible();
    await page.reload();
    const updatedTemplate = page
      .locator('[data-recurring-section="template-list"] details')
      .filter({ hasText: updatedTitle });
    await expect(updatedTemplate).toHaveCount(1);
    await updatedTemplate.locator("summary").click();
    await expect(updatedTemplate.getByLabel("Intervall")).toHaveValue("2");
    await expect(updatedTemplate.getByLabel("Standarddauer")).toHaveValue("45");
  });

  test("Manual Recurring pauses and reactivates a template", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const title = uniqueTitle("Manual Recurring Pause");
    await createRecurringTemplateFromToday(page, title);
    let template = page
      .locator('[data-recurring-section="template-list"] details')
      .filter({ hasText: title });
    await template.locator("summary").click();
    await template.getByRole("button", { name: "Vorlage pausieren" }).click();
    await page.waitForLoadState("networkidle");
    template = page
      .locator('[data-recurring-section="template-list"] details')
      .filter({ hasText: title });
    await expect(template.locator("summary")).toContainText("Pausiert");
    await template.locator("summary").click();
    await template.getByRole("button", { name: "Vorlage reaktivieren" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    template = page
      .locator('[data-recurring-section="template-list"] details')
      .filter({ hasText: title });
    await expect(template.locator("summary")).toContainText("Aktiv");
  });

  test("Manual Recurring weekly rule respects ISO weekday", async ({ page }) => {
    test.slow();
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const dueTitle = uniqueTitle("Manual Recurring Weekly Due");
    const skippedTitle = uniqueTitle("Manual Recurring Weekly Skip");

    await createRecurringTemplateFromToday(page, dueTitle, {
      durationMinutes: "15",
      frequency: "weekly",
      weekday: currentIsoWeekday(),
    });
    await generateRecurringTasksForToday(page);
    await expect(
      page
        .locator('[data-today-section="activity-stream"] ol')
        .getByText(dueTitle),
    ).toHaveCount(1);

    await createRecurringTemplateFromToday(page, skippedTitle, {
      durationMinutes: "15",
      frequency: "weekly",
      weekday: nextIsoWeekday(),
    });
    await generateRecurringTasksForToday(page);
    await expect(
      page
        .locator('[data-today-section="activity-stream"] ol')
        .getByText(skippedTitle),
    ).toHaveCount(0);
  });

  test("Manual Today completes DB task and removes it from Dashboard agenda", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = uniqueTitle("Manual Today Complete DB Task");

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Complete this task from Today and remove it from Dashboard agenda.",
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");

    await page.goto("/today");
    const completeForm = await expectTodayTaskLifecycleForm(
      page,
      title,
      "abschließen",
    );
    await completeForm.getByRole("button", { name: "Abschließen" }).click();
    await page.waitForLoadState("networkidle");
    await expectTodayTaskLifecycleForm(page, title, "wieder öffnen");

    await page.goto("/dashboard");
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda.getByText(title)).toHaveCount(0);
    await page.reload();
    await expect(todayAgenda.getByText(title)).toHaveCount(0);

    await page.goto("/calendar");
    await expectNoCalendarTimedBlock(page, title);
    await expect(
      page
        .locator('[data-calendar-section="planning-queue"]')
        .first()
        .getByText(title),
    ).toHaveCount(0);

    await page.goto("/today");
    const reopenForm = await expectTodayTaskLifecycleForm(
      page,
      title,
      "wieder öffnen",
    );
    await reopenForm.getByRole("button", { name: "Wieder öffnen" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expectTodayTaskLifecycleForm(page, title, "abschließen");

    await page.goto("/dashboard");
    await expectDashboardTodayAgendaItemDetail(page, title, "Flexible");

    await page.goto("/calendar");
    await expectCalendarPlannerQueueTask(page, title);
  });

  test("Manual Today keeps scheduled DB task out of planner candidates", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = uniqueTitle("Manual Today Scheduled");

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

    await expectTodayActivityText(page, title);
    await expect(todayPlanner.getByText(title)).toHaveCount(0);
  });

  test("Manual Today and Dashboard project planned DB task", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = uniqueTitle("Manual Today DB Task");

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Plan this task for the daily core views.",
      { priority: "P0" },
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute terminieren");
    await page.waitForLoadState("networkidle");

    await page.goto("/today");
    await expectTodayWidgetContracts(page, "manual");
    await expectNoTodayDemoStrings(page);
    await expectTodayActivityText(page, title);
    await page.reload();
    await expectTodayActivityText(page, title);

    await page.goto("/dashboard");
    await page.reload();
    const todayAgenda = page.getByRole("region", { name: "Today Agenda" });
    await expect(todayAgenda).toHaveAttribute(
      "data-content-state",
      /^(partial|filled)$/,
    );
    const dashboardTask = todayAgenda.getByText(title).first();
    if (await dashboardTask.count()) {
      await expect(dashboardTask).toBeVisible();
    } else {
      await expect(todayAgenda).toHaveAttribute("data-content-state", "filled");
      expect(Number(await todayAgenda.getAttribute("data-item-count"))).toBeGreaterThanOrEqual(Number(await todayAgenda.getAttribute("data-capacity")));
    }
    await page.reload();
    if (await todayAgenda.getByText(title).count()) {
      await expectDashboardTodayAgendaText(page, title);
    } else {
      await expect(todayAgenda).toHaveAttribute("data-content-state", "filled");
    }
  });
});

test.describe("Calendar content states", () => {
  test.use({ viewport: { height: 1440, width: 2560 } });
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
    await expect(
      page.getByRole("button", { name: "Previous week" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next week" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Open prepared calendar create dialog" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Prepared calendar item" }),
    ).toBeVisible();
    await expect(
      page.getByText("Task scheduling is active in the Planner Queue and Inspector."),
    ).toBeVisible();
    await expect(
      page.getByText("freie Kalendertermine folgen später"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close scheduling dialog" })
      .click();
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

    const title = uniqueTitle("Manual Calendar DB Task");

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Plan this task into the Calendar Planner Queue before scheduling it.",
      {
        durationMinutes: "15",
        energy: "high",
        priority: "P0",
      },
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");

    await expectCalendarWidgetContracts(page, "manual");
    await expectNoMainStrings(page, calendarBlockedDemoStrings, "calendar");
    await expectNoGenericPlannerRelationLabels(page, "calendar manual queue");
    const freeWindowStartTime = await findFreeCalendarStartTime(
      page,
      75,
      8 * 60,
    );
    const startTime = addClockMinutes(freeWindowStartTime, 15);
    const scheduledEndTime = addClockMinutes(startTime, 45);
    const earlierStartTime = freeWindowStartTime;
    const earlierEndTime = addClockMinutes(earlierStartTime, 45);
    const extendedEndTime = addClockMinutes(startTime, 60);
    const plannerQueue = await expectCalendarPlannerQueueTask(page, title);

    await expectNoCalendarTimedBlock(page, title);

    const scheduleForm = plannerQueue.getByRole("form", {
      name: `${title} terminieren`,
    });
    await scheduleForm.getByLabel("Uhrzeit").fill(startTime);
    await scheduleForm.getByLabel("Dauer").selectOption("45");
    await scheduleForm.getByRole("button", { name: "Terminieren" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();

    await expect(plannerQueue.getByText(title)).toHaveCount(0);
    await expectCalendarTimedBlockRange(
      page,
      title,
      startTime,
      scheduledEndTime,
    );

    await selectCalendarTimedBlock(page, title);
    const moveEarlierButton = page.getByRole("button", {
      exact: true,
      name: "15 min früher",
    });

    await expect(moveEarlierButton).toBeEnabled();
    await moveEarlierButton.click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expectCalendarTimedBlockRange(
      page,
      title,
      earlierStartTime,
      earlierEndTime,
    );

    await selectCalendarTimedBlock(page, title);
    const moveLaterButton = page.getByRole("button", {
      exact: true,
      name: "15 min später",
    });

    await expect(moveLaterButton).toBeEnabled();
    await moveLaterButton.click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expectCalendarTimedBlockRange(
      page,
      title,
      startTime,
      scheduledEndTime,
    );

    await selectCalendarTimedBlock(page, title);
    const increaseDurationButton = page.getByRole("button", {
      exact: true,
      name: "Dauer +15 min",
    });

    await expect(increaseDurationButton).toBeEnabled();
    await increaseDurationButton.click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expectCalendarTimedBlockRange(
      page,
      title,
      startTime,
      extendedEndTime,
    );

    await selectCalendarTimedBlock(page, title);
    const decreaseDurationButton = page.getByRole("button", {
      exact: true,
      name: "Dauer -15 min",
    });

    await expect(decreaseDurationButton).toBeEnabled();
    await decreaseDurationButton.click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expectCalendarTimedBlockRange(
      page,
      title,
      startTime,
      scheduledEndTime,
    );

    await page.goto("/today");
    await expectTodayActivityText(page, title);
    await expect(
      page.locator('[data-today-section="today-planner"]').getByText(title),
    ).toHaveCount(0);

    await page.goto("/dashboard");
    await expectDashboardTodayAgendaItemDetail(
      page,
      title,
      `${startTime}-${scheduledEndTime} · 45 min`,
    );
  });

  test("Manual Calendar unschedules DB task back into planner queue", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const title = uniqueTitle("Manual Calendar Unschedule DB Task");

    await captureAndTriageManualInboxTask(
      page,
      title,
      "Schedule then unschedule this task from Calendar.",
      {
        durationMinutes: "30",
        energy: "high",
        priority: "P0",
      },
    );
    await openPortfolioTaskPlanningControls(page, title);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");

    const freeWindowStartTime = await findFreeCalendarStartTime(
      page,
      60,
      9 * 60,
    );
    const startTime = addClockMinutes(freeWindowStartTime, 15);
    const movedStartTime = addClockMinutes(startTime, 15);
    const scheduledEndTime = addClockMinutes(startTime, 30);
    const movedEndTime = addClockMinutes(movedStartTime, 30);

    await scheduleCalendarQueueTask(page, title, startTime, "30");
    await expectCalendarTimedBlockRange(
      page,
      title,
      startTime,
      scheduledEndTime,
    );

    await selectCalendarTimedBlock(page, title);
    const moveLaterButton = page.getByRole("button", {
      exact: true,
      name: "15 min später",
    });

    await expect(moveLaterButton).toBeEnabled();
    await moveLaterButton.click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expectCalendarTimedBlockRange(
      page,
      title,
      movedStartTime,
      movedEndTime,
    );

    await selectCalendarTimedBlock(page, title);
    await page.getByRole("button", { exact: true, name: "Unschedule" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();

    await expectNoCalendarTimedBlock(page, title);
    await expectCalendarPlannerQueueTask(page, title);

    await page.goto("/today");
    await expectTodayActivityText(page, title);
    await expect(
      page.locator('[data-today-section="today-planner"]').getByText(title),
    ).toHaveCount(0);

    await page.goto("/dashboard");
    await expectDashboardTodayAgendaItemDetail(page, title, "Flexible · 30 min");
  });

  test("Manual Calendar blocks visible conflicts without explicit override", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const timestamp = Date.now();
    const firstTitle = `Manual Calendar Conflict A ${timestamp}`;
    const secondTitle = `Manual Calendar Conflict B ${timestamp}`;

    await captureAndTriageManualInboxTask(
      page,
      firstTitle,
      "Create the visible conflict target for Calendar scheduling controls.",
      {
        durationMinutes: "30",
        energy: "high",
        priority: "P0",
      },
    );
    await openPortfolioTaskPlanningControls(page, firstTitle);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");

    const firstStartTime = await findFreeCalendarStartTime(page, 60, 10 * 60);
    const firstEndTime = addClockMinutes(firstStartTime, 30);
    const secondStartTime = addClockMinutes(firstStartTime, 30);
    const secondEndTime = addClockMinutes(secondStartTime, 30);

    await scheduleCalendarQueueTask(page, firstTitle, firstStartTime, "30");
    await expectCalendarTimedBlockRange(
      page,
      firstTitle,
      firstStartTime,
      firstEndTime,
    );
    await captureAndTriageManualInboxTask(
      page,
      secondTitle,
      "Create the adjacent Calendar block that should not silently overlap.",
      {
        durationMinutes: "30",
        energy: "high",
        priority: "P0",
      },
    );
    await openPortfolioTaskPlanningControls(page, secondTitle);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");
    await scheduleCalendarQueueTask(page, secondTitle, secondStartTime, "30");
    await expectCalendarTimedBlockRange(
      page,
      secondTitle,
      secondStartTime,
      secondEndTime,
    );

    const inspector = page.locator('[data-calendar-section="inspector"]');

    await selectCalendarTimedBlock(page, secondTitle);
    await expect(
      inspector.getByRole("button", { exact: true, name: "15 min früher" }),
    ).toBeDisabled();
    await expect(
      inspector.getByText("Sichtbarer Konflikt mit").first(),
    ).toBeVisible();
    await expect(
      inspector.getByText("Nur sichtbare Blöcke geprüft").first(),
    ).toBeVisible();
    await expect(
      inspector
        .getByRole("button", {
          name: /Trotzdem terminieren trotz sichtbarem Konflikt/,
        })
        .first(),
    ).toBeVisible();

    await page.reload();
    await expectCalendarTimedBlockRange(
      page,
      secondTitle,
      secondStartTime,
      secondEndTime,
    );
  });

  test("Manual Calendar executes explicit conflict override reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session; no broad DB cleanup action is available.",
    );

    const timestamp = Date.now();
    const firstTitle = `Manual Calendar Override A ${timestamp}`;
    const secondTitle = `Manual Calendar Override B ${timestamp}`;

    await captureAndTriageManualInboxTask(
      page,
      firstTitle,
      "Create the visible conflict target for Calendar override execution.",
      {
        durationMinutes: "30",
        energy: "high",
        priority: "P0",
      },
    );
    await openPortfolioTaskPlanningControls(page, firstTitle);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");

    const firstStartTime = await findFreeCalendarStartTime(page, 60, 11 * 60);
    const firstEndTime = addClockMinutes(firstStartTime, 30);
    const secondStartTime = addClockMinutes(firstStartTime, 30);
    const secondEndTime = addClockMinutes(secondStartTime, 30);
    const overrideStartTime = addClockMinutes(secondStartTime, -15);
    const overrideEndTime = addClockMinutes(overrideStartTime, 30);

    await scheduleCalendarQueueTask(page, firstTitle, firstStartTime, "30");
    await expectCalendarTimedBlockRange(
      page,
      firstTitle,
      firstStartTime,
      firstEndTime,
    );

    await captureAndTriageManualInboxTask(
      page,
      secondTitle,
      "Create the adjacent Calendar block that will be consciously overlapped.",
      {
        durationMinutes: "30",
        energy: "high",
        priority: "P0",
      },
    );
    await openPortfolioTaskPlanningControls(page, secondTitle);
    await clickPortfolioContextButton(page, "Heute planen");
    await page.waitForLoadState("networkidle");
    await page.goto("/calendar");
    await scheduleCalendarQueueTask(page, secondTitle, secondStartTime, "30");
    await expectCalendarTimedBlockRange(
      page,
      secondTitle,
      secondStartTime,
      secondEndTime,
    );

    const inspector = page.locator('[data-calendar-section="inspector"]');

    await selectCalendarTimedBlock(page, secondTitle);
    await expect(
      inspector.getByRole("button", { exact: true, name: "15 min früher" }),
    ).toBeDisabled();
    await expect(
      inspector.getByText("Sichtbarer Konflikt mit").first(),
    ).toBeVisible();
    await expect(
      inspector.getByText("Nur sichtbare Blöcke geprüft").first(),
    ).toBeVisible();

    const overrideButton = inspector
      .getByRole("button", {
        name: /Trotzdem terminieren trotz sichtbarem Konflikt/,
      })
      .first();

    await expect(overrideButton).toBeEnabled();
    await overrideButton.focus();
    await expect(overrideButton).toBeFocused();
    await overrideButton.click();
    await page.waitForLoadState("networkidle");
    await page.reload();

    await expectCalendarTimedBlockRange(
      page,
      firstTitle,
      firstStartTime,
      firstEndTime,
    );
    await expectCalendarTimedBlockRange(
      page,
      secondTitle,
      overrideStartTime,
      overrideEndTime,
    );

    await page.goto("/today");
    await expectTodayActivityText(page, secondTitle);
    await expect(
      page.locator('[data-today-section="today-planner"]').getByText(secondTitle),
    ).toHaveCount(0);

    await page.goto("/dashboard");
    await expectDashboardTodayAgendaItemDetail(
      page,
      secondTitle,
      `${overrideStartTime}-${overrideEndTime} · 30 min`,
    );
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
      page.getByRole("heading", { name: "Skill erstellen" }).first(),
    ).toBeVisible();
    await expect(
      page.locator('form[aria-label="Skill erstellen"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Skill erstellen" }),
    ).toBeVisible();

    await page.goto("/portfolio");
    await expect(page.getByRole("heading", { name: "Typ wählen" })).toBeVisible();
    await expect(page.locator('form[aria-label="Task erstellen"]')).toBeVisible();
    await expect(
      page.locator('form[aria-label="Project erstellen"]'),
    ).toBeVisible();
    await expect(page.locator('form[aria-label="Goal erstellen"]')).toBeVisible();
    await expect(
      page.locator('form[aria-label="Skill erstellen"]'),
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
      contextPanel.getByRole("heading", {
        name: "Linked Task für Project erstellen",
      }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText(
        "Persistiert eine Task mit diesem Project als Kontext.",
      ),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Task-basiertes Signal").first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByText(
        "Noch keine verknüpften Tasks; Fortschritt wird nur aus Tasks berechnet",
      ),
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
      contextPanel.getByRole("heading", {
        name: "Prepared / Future Sections",
      }),
    ).toBeVisible();
    const projectPreparedSections = contextPanel
      .getByRole("heading", { name: "Prepared / Future Sections" })
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
      contextPanel
        .locator('form[aria-label="Project Resource verknüpfen"]')
        .getByRole("button", { name: "Resource verknüpfen" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Skill Evidence" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Keine verknüpfte Skill Evidence.").first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Project Log" }),
    ).toBeVisible();
    await expect(
      projectPreparedSections.getByText(
        "Vorbereitet: noch nicht mit lokaler Datenquelle verbunden.",
      ),
    ).toBeVisible();
    await expect(
      projectPreparedSections.getByText("Vorbereitet", { exact: true }),
    ).toHaveCount(2);
    await expect(
      contextPanel.getByText(
        "Resource Relations lesen und schreiben über die bestehende Resource Action.",
      ),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Future Scope: Project Edit, Status"),
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
      contextPanel.getByRole("heading", {
        name: "Linked Task für Goal erstellen",
      }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText(
        "Persistiert eine Task mit diesem Goal als Kontext.",
      ),
    ).toBeVisible();
    await expect(
      contextPanel
        .locator('form[aria-label="Goal Task erstellen"]')
        .getByRole("button", { name: "Task erstellen" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", {
        name: "Linked Project für Goal erstellen",
      }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText(
        "Persistiert ein Project mit diesem Goal als Kontext.",
      ),
    ).toBeVisible();
    await expect(
      contextPanel
        .locator('form[aria-label="Goal Project erstellen"]')
        .getByRole("button", { name: "Project erstellen" }),
    ).toBeVisible();
    await expect(contextPanel.getByText("Keine verknüpften Tasks.")).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", {
        name: "Prepared / Future Sections",
      }),
    ).toBeVisible();
    const goalPreparedSections = contextPanel
      .getByRole("heading", { name: "Prepared / Future Sections" })
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
      contextPanel
        .locator('form[aria-label="Goal Resource verknüpfen"]')
        .getByRole("button", { name: "Resource verknüpfen" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Skill Evidence" }),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Keine verknüpfte Skill Evidence.").first(),
    ).toBeVisible();
    await expect(
      contextPanel.getByRole("heading", { name: "Goal Log" }),
    ).toBeVisible();
    await expect(
      goalPreparedSections.getByText(
        "Vorbereitet: Review-Rhythmus, nächster Review und Review Notes schreiben hier noch keine Persistenz.",
      ),
    ).toBeVisible();
    await expect(
      goalPreparedSections.getByText("Vorbereitet", { exact: true }),
    ).toHaveCount(3);
    await expect(
      contextPanel.getByText("Arbeitsbasiertes Signal"),
    ).toBeVisible();
    await expect(
      contextPanel.getByText("Future Scope: Goal Edit, Status"),
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

  test("Manual Portfolio Skill erstellen and Evidence hinzufügen persist reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const skillTitle = `Manual Portfolio Skill ${timestamp}`;
    const evidenceTitle = `Manual Skill Evidence ${timestamp}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=skills");
    await createPortfolioSkillTarget(
      page,
      skillTitle,
      "Manual Skill UI binding proof.",
    );
    await page.reload();
    await expect(page.getByText(skillTitle).first()).toBeVisible();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText("Noch keine Skill Evidence gespeichert.")
        .first(),
    ).toBeVisible();
    await createSkillEvidenceTarget(
      page,
      evidenceTitle,
      "Manual evidence added from Portfolio Skill Context.",
    );
    await page.reload();
    await expect(page.getByText(skillTitle).first()).toBeVisible();
    await expect(page.getByText(evidenceTitle).first()).toBeVisible();
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
  });

  test("Manual Portfolio Skill edit persists reload-stable", async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const skillTitle = `Manual Skill Edit Source ${timestamp}`;
    const updatedTitle = `Manual Skill Edit Updated ${timestamp}`;
    const updatedSummary = "Updated Manual Skill summary from Portfolio.";

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=skills");
    await createPortfolioSkillTarget(
      page,
      skillTitle,
      "Manual Skill edit proof.",
    );
    await editPortfolioSkillTarget(page, updatedTitle, updatedSummary);
    await page.reload();
    await expect(page.getByText(updatedTitle).first()).toBeVisible();
    await expect(page.getByText(updatedSummary).first()).toBeVisible();
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
  });

  test("Manual Portfolio Skill archive removes active skill reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const skillTitle = `Manual Skill Archive ${Date.now()}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=skills");
    await createPortfolioSkillTarget(
      page,
      skillTitle,
      "Manual Skill archive proof.",
    );
    await archivePortfolioSkillTarget(page, skillTitle);
    await page.reload();
    await expect(page.getByRole("link", { name: new RegExp(skillTitle) })).toHaveCount(0);
  });

  test("Manual Portfolio Skill Evidence delete persists reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const skillTitle = `Manual Skill Evidence Delete ${timestamp}`;
    const evidenceTitle = `Manual Evidence Delete ${timestamp}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=skills");
    await createPortfolioSkillTarget(
      page,
      skillTitle,
      "Manual Skill evidence delete proof.",
    );
    await createSkillEvidenceTarget(
      page,
      evidenceTitle,
      "Evidence row will be deleted.",
    );
    await deleteSkillEvidenceTarget(page, evidenceTitle);
    await page.reload();
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .getByText(evidenceTitle),
    ).toHaveCount(0);
    await expect(page.getByText(skillTitle).first()).toBeVisible();
  });

  test("Manual Portfolio Skill Evidence links Project, Goal and Resource sources reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const projectTitle = `Manual Skill Source Project ${timestamp}`;
    const goalTitle = `Manual Skill Source Goal ${timestamp}`;
    const resourceTitle = `Manual Skill Source Resource ${timestamp}`;
    const skillTitle = `Manual Skill Source Evidence ${timestamp}`;
    const projectEvidenceTitle = `Project Source Evidence ${timestamp}`;
    const goalEvidenceTitle = `Goal Source Evidence ${timestamp}`;
    const resourceEvidenceTitle = `Resource Source Evidence ${timestamp}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Manual Skill source project proof.",
    );
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Manual Skill source goal proof.",
    );
    await createManualResourceFromInbox(
      page,
      resourceTitle,
      "Manual Skill source resource proof.",
    );
    await page.goto("/portfolio?view=skills");
    await createPortfolioSkillTarget(
      page,
      skillTitle,
      "Manual Skill source evidence proof.",
    );
    await createSkillEvidenceTarget(
      page,
      projectEvidenceTitle,
      "Evidence linked to a Project source.",
      `project · ${projectTitle}`,
    );
    await createSkillEvidenceTarget(
      page,
      goalEvidenceTitle,
      "Evidence linked to a Goal source.",
      `goal · ${goalTitle}`,
    );
    await createSkillEvidenceTarget(
      page,
      resourceEvidenceTitle,
      "Evidence linked to a Resource source.",
      `resource · ${resourceTitle}`,
    );
    await page.reload();

    const contextPanel = page.locator('[data-portfolio-section="context-panel"]');
    const projectEvidence = contextPanel
      .locator("article")
      .filter({ hasText: projectEvidenceTitle });
    const goalEvidence = contextPanel
      .locator("article")
      .filter({ hasText: goalEvidenceTitle });
    const resourceEvidence = contextPanel
      .locator("article")
      .filter({ hasText: resourceEvidenceTitle });

    await expect(projectEvidence.first()).toBeVisible();
    await expect(goalEvidence.first()).toBeVisible();
    await expect(resourceEvidence.first()).toBeVisible();
    await expect(projectEvidence.getByText(projectTitle).first()).toBeVisible();
    await expect(goalEvidence.getByText(goalTitle).first()).toBeVisible();
    await expect(resourceEvidence.getByText(resourceTitle).first()).toBeVisible();

    await openPortfolioEntityByTitle(page, "projects", projectTitle);
    await expectPortfolioContextText(page, projectEvidenceTitle);
    await expectPortfolioContextText(page, skillTitle);
    await page.reload();
    await expectPortfolioContextText(page, projectEvidenceTitle);
    await expectPortfolioContextText(page, skillTitle);

    await openPortfolioEntityByTitle(page, "goals", goalTitle);
    await expectPortfolioContextText(page, goalEvidenceTitle);
    await expectPortfolioContextText(page, skillTitle);
    await page.reload();
    await expectPortfolioContextText(page, goalEvidenceTitle);
    await expectPortfolioContextText(page, skillTitle);
    await expectNoMainStrings(page, portfolioBlockedDemoStrings, "portfolio");
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

  test("Manual Project Workbench edits status and archives Project reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const projectTitle = `Manual Workbench Edit Project ${timestamp}`;
    const updatedTitle = `Manual Workbench Edited Project ${timestamp}`;
    const updatedSummary = `Project Workbench edit summary ${timestamp}`;
    const updatedNextAction = `Project Workbench next action ${timestamp}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "Project Workbench entity edit target.",
    );
    await openPortfolioEntityByTitle(page, "projects", projectTitle);
    await editPortfolioProjectTarget(
      page,
      updatedTitle,
      updatedSummary,
      updatedNextAction,
    );
    await page.reload();
    await expectSelectedPortfolioEntity(page, updatedTitle);
    await expectPortfolioContextText(page, updatedSummary);
    await expectPortfolioContextText(page, updatedNextAction);
    await expectPortfolioContextText(page, "blocked");

    await archivePortfolioProjectTarget(page, updatedTitle);
    await page.reload();
    await expect(
      page
        .locator('[data-portfolio-section="entity-list"]')
        .getByRole("link", { name: new RegExp(escapeRegExp(updatedTitle)) }),
    ).toHaveCount(0);
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
        .getByText("Completed", { exact: true }),
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

    const goalTitle = uniqueTitle("Manual Workbench Project Goal");
    const projectTitle = uniqueTitle("Manual Workbench Goal Project");

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Goal Workbench project target.",
    );
    await expectSelectedPortfolioEntity(page, goalTitle);
    await createGoalWorkbenchProject(
      page,
      projectTitle,
      "Created inside Goal Workbench v1.",
    );
    await openPortfolioEntityByTitle(page, "goals", goalTitle);
    await page.reload();
    await expectSelectedPortfolioEntity(page, goalTitle);
    await expectPortfolioContextText(page, projectTitle);
  });

  test("Manual Goal Workbench edits status and archives Goal reload-stable", async ({
    page,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires a local authenticated Supabase Playwright session.",
    );

    const timestamp = Date.now();
    const goalTitle = `Manual Workbench Edit Goal ${timestamp}`;
    const updatedTitle = `Manual Workbench Edited Goal ${timestamp}`;
    const updatedSummary = `Goal Workbench edit summary ${timestamp}`;
    const projectTitle = `Manual Workbench Goal Archive Project ${timestamp}`;
    const taskTitle = `Manual Workbench Goal Archive Task ${timestamp}`;

    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "Goal Workbench entity edit target.",
    );
    await createGoalWorkbenchProject(
      page,
      projectTitle,
      "Linked project must survive Goal archive.",
    );
    await createGoalWorkbenchTask(
      page,
      taskTitle,
      "Linked task must survive Goal archive.",
      "Linked task created before Goal archive.",
    );
    await openPortfolioEntityByTitle(page, "goals", goalTitle);
    await editPortfolioGoalTarget(page, updatedTitle, updatedSummary);
    await page.reload();
    await expectSelectedPortfolioEntity(page, updatedTitle);
    await expectPortfolioContextText(page, updatedSummary);
    await expectPortfolioContextText(page, "planned");
    await expect(
      page
        .locator('[data-portfolio-section="context-panel"]')
        .locator('form[aria-label="Goal bearbeiten"]')
        .getByLabel("Horizon"),
    ).toHaveValue("month");

    await archivePortfolioGoalTarget(page, updatedTitle);
    await page.reload();
    await expect(
      page
        .locator('[data-portfolio-section="entity-list"]')
        .getByRole("link", { name: new RegExp(escapeRegExp(updatedTitle)) }),
    ).toHaveCount(0);

    await page.goto("/portfolio?view=projects");
    await expect(
      page.getByRole("link", { name: new RegExp(escapeRegExp(projectTitle)) }),
    ).toBeVisible();
    await page.goto("/portfolio?view=tasks");
    await expect(
      page.getByRole("link", { name: new RegExp(escapeRegExp(taskTitle)) }),
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
        .getByText("Completed", { exact: true }),
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

  test("K1.1A Task detail edits fields and Project Goal relations reload-stable", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const title = `K1.1A Task ${stamp}`;
    const updatedTitle = `K1.1A Edited Task ${stamp}`;
    const projectTitle = `K1.1A Project ${stamp}`;
    const goalTitle = `K1.1A Goal ${stamp}`;
    await openManualPortfolioWithDb(page);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(page, projectTitle, "K1.1A project target");
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(page, goalTitle, "K1.1A goal target");
    await captureAndTriageManualInboxTask(page, title, "K1.1A task context");
    await openPortfolioTaskPlanningControls(page, title);
    const form = page.locator('form[aria-label="Task bearbeiten"]');
    await form.getByLabel("Titel").fill(updatedTitle);
    await form.getByLabel("Beschreibung / Kontext").fill("K1.1A updated context");
    await form.getByLabel("Next Action").fill("K1.1A execute next");
    await form.getByLabel("Status").selectOption("active");
    await form.getByLabel("Priorität").selectOption("P1");
    await form.getByLabel("Energie / Aufwand").selectOption("high");
    await form.getByLabel("Dauer (Min.)").fill("45");
    const projectId = await form.locator('select[name="projectId"] option').filter({ hasText: projectTitle }).getAttribute("value");
    const goalId = await form.locator('select[name="goalId"] option').filter({ hasText: goalTitle }).getAttribute("value");
    await form.locator('select[name="projectId"]').selectOption(projectId ?? "");
    await form.locator('select[name="goalId"]').selectOption(goalId ?? "");
    await form.getByRole("button", { name: "Task speichern" }).click();
    await expect(page.getByText("Task gespeichert.").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("#selected-entity-heading")).toHaveText(updatedTitle);
    const reloaded = page.locator('form[aria-label="Task bearbeiten"]');
    await expect(reloaded.getByLabel("Next Action")).toHaveValue("K1.1A execute next");
    await expect(reloaded.locator('select[name="projectId"]')).toHaveValue(/.+/);
    await expect(reloaded.locator('select[name="goalId"]')).toHaveValue(/.+/);
  });

  test("K1.1A Task resource relation links and unlinks reload-stable", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const taskTitle = `K1.1A Resource Task ${stamp}`;
    const resourceTitle = `K1.1A Resource ${stamp}`;
    await openManualPortfolioWithDb(page);
    await createManualResourceFromInbox(page, resourceTitle, "K1.1A relation resource", "K1.1A requires local Supabase auth.");
    await captureAndTriageManualInboxTask(page, taskTitle, "K1.1A relation task");
    await openPortfolioTaskPlanningControls(page, taskTitle);
    const resources = page.getByRole("region", { name: "Resources", exact: true });
    const resourceForm = resources.getByRole("form", {
      name: "Task Resource verknüpfen",
    });
    const resourceCard = resources.locator("article").filter({
      has: page.getByText(resourceTitle, { exact: true }),
    });
    const resourceId = await resourceForm
      .getByRole("option", { name: new RegExp(resourceTitle) })
      .getAttribute("value");
    await resourceForm
      .getByLabel("Resource", { exact: true })
      .selectOption(resourceId ?? "");
    await resourceForm
      .getByRole("button", { name: "Resource verknüpfen" })
      .click();
    await expect(resourceCard).toHaveCount(1);
    await expect(resourceCard.getByText(resourceTitle, { exact: true })).toBeVisible();
    await page.reload();
    await expect(resourceCard).toHaveCount(1);
    await expect(resourceCard.getByText(resourceTitle, { exact: true })).toBeVisible();
    await resourceCard
      .getByRole("button", { name: "Verknüpfung lösen" })
      .click();
    await page.reload();
    await expect(resourceCard).toHaveCount(0);
  });
});

test.describe("Education content states", () => {
  test("A1.1B2 creates edits and reloads a learning log", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1B2 Learning Project ${stamp}`;
    const focus = `A1.1B2 Learning Focus ${stamp}`;
    const editedFocus = `A1.1B2 Edited Learning Focus ${stamp}`;
    const logDate = new Date().toISOString().slice(0, 10);
    await openManualPortfolioWithDb(page, "A1.1B2 requires the local Manual database.");
    await page.goto("/education");
    const projectForm = page.getByRole("form", { name: "Education Project erstellen" });
    await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await projectForm.getByRole("button", { name: "Education Project erstellen" }).click();
    const activity = page.locator('[data-education-region="activity"]');
    const createForm = activity.getByRole("form", { name: "Education Log erstellen" });
    await createForm.locator('select[name="logType"]').selectOption("learning");
    await createForm.locator('input[name="logDate"]').fill(logDate);
    await createForm.locator('input[name="durationMinutes"]').fill("45");
    await createForm.locator('input[name="focus"]').fill(focus);
    await createForm.locator('textarea[name="outcome"]').fill("A1.1B2 learning outcome");
    await createForm.locator('input[name="unitsCompleted"]').fill("4");
    await createForm.locator('textarea[name="notes"]').fill("A1.1B2 learning notes");
    await createForm.getByRole("button", { name: "Log speichern" }).click();
    await expect(page.locator("[data-education-action-status]")).toHaveText("Education Log erstellt.");
    const card = activity.locator('[data-education-log-card][data-log-status="active"]').filter({ hasText: focus });
    await expect(card).toHaveCount(1);
    const editForm = activity.getByRole("form", { name: "Education Log bearbeiten" });
    await editForm.locator('input[name="focus"]').fill(editedFocus);
    await editForm.locator('textarea[name="outcome"]').fill("A1.1B2 edited learning outcome");
    await editForm.locator('textarea[name="notes"]').fill("A1.1B2 edited learning notes");
    await editForm.getByRole("button", { name: "Log aktualisieren" }).click();
    await expect(page.locator("[data-education-action-status]")).toHaveText("Education Log aktualisiert.");
    await page.reload();
    const reloadedActivity = page.locator('[data-education-region="activity"]');
    const reloadedEdit = reloadedActivity.getByRole("form", { name: "Education Log bearbeiten" });
    await expect(reloadedEdit.locator('input[name="focus"]')).toHaveValue(editedFocus);
    await expect(reloadedEdit.locator('textarea[name="outcome"]')).toHaveValue("A1.1B2 edited learning outcome");
    await expect(reloadedEdit.locator('textarea[name="notes"]')).toHaveValue("A1.1B2 edited learning notes");
  });

  test("A1.1B2 creates writing progress archives and reloads activity", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `A1.1B2 Writing Project ${stamp}`;
    const focus = `A1.1B2 Writing Focus ${stamp}`;
    const logDate = new Date().toISOString().slice(0, 10);
    await openManualPortfolioWithDb(page, "A1.1B2 requires the local Manual database.");
    await page.goto("/education");
    const projectForm = page.getByRole("form", { name: "Education Project erstellen" });
    await projectForm.getByLabel("Titel", { exact: true }).fill(projectTitle);
    await projectForm.getByRole("button", { name: "Education Project erstellen" }).click();
    const activity = page.locator('[data-education-region="activity"]');
    const createForm = activity.getByRole("form", { name: "Education Log erstellen" });
    await createForm.locator('select[name="logType"]').selectOption("writing");
    await createForm.locator('input[name="logDate"]').fill(logDate);
    await createForm.locator('input[name="durationMinutes"]').fill("60");
    await createForm.locator('input[name="focus"]').fill(focus);
    await createForm.locator('textarea[name="outcome"]').fill("A1.1B2 writing outcome");
    await createForm.locator('input[name="wordCountDelta"]').fill("120");
    await createForm.getByRole("button", { name: "Log speichern" }).click();
    await expect(page.locator("[data-education-action-status]")).toHaveText("Education Log erstellt.");
    await expect(activity.locator('[data-education-signal="7-days"]')).toContainText("1 Logs · 60 Min · 0 Einheiten · +120 Wörter");
    await expect(activity.locator('[data-education-signal="30-days"]')).toContainText("1 Logs · 60 Min · 0 Einheiten · +120 Wörter");
    const card = activity.locator('[data-education-log-card][data-log-status="active"]').filter({ hasText: focus });
    await expect(card).toHaveCount(1);
    await card.getByRole("form", { name: `Log archivieren ${focus}` }).getByRole("button", { name: "Archivieren" }).click();
    await expect(page.locator("[data-education-action-status]")).toHaveText("Education Log archiviert.");
    await page.reload();
    const reloadedActivity = page.locator('[data-education-region="activity"]');
    await expect(reloadedActivity.locator('[data-education-log-card][data-log-status="archived"]').filter({ hasText: focus })).toHaveCount(1);
    await expect(reloadedActivity.locator('[data-education-signal="7-days"]')).toContainText("0 Logs · 0 Min · 0 Einheiten · +0 Wörter");
    await expect(reloadedActivity.locator('[data-education-signal="30-days"]')).toContainText("0 Logs · 0 Min · 0 Einheiten · +0 Wörter");
  });

  test("A1.1B1 creates edits and reloads an education project", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires local authenticated Supabase state.",
    );
    const stamp = Date.now();
    const title = `A1.1B1 Education Project ${stamp}`;
    const editedTitle = `A1.1B1 Edited Education Project ${stamp}`;

    await openManualPortfolioWithDb(
      page,
      "A1.1B1 requires the local Manual database.",
    );
    await page.goto("/education");
    const projectsRegion = page.locator(
      '[data-education-region="projects"]',
    );
    const createForm = page.getByRole("form", {
      name: "Education Project erstellen",
    });
    await createForm.getByLabel("Titel", { exact: true }).fill(title);
    await createForm
      .locator('textarea[name="description"]')
      .fill("A1.1B1 canonical research context");
    await createForm.locator('select[name="status"]').selectOption("active");
    await createForm
      .getByRole("button", { name: "Education Project erstellen" })
      .click();
    await expect(page.locator("[data-education-action-status]")).toHaveText(
      "Education Project erstellt.",
    );
    await expect(
      projectsRegion
        .locator("[data-education-project-card]")
        .filter({ hasText: title }),
    ).toHaveCount(1);

    const editForm = page.getByRole("form", {
      name: "Education Project bearbeiten",
    });
    await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle);
    await editForm
      .locator('textarea[name="description"]')
      .fill("A1.1B1 edited research context");
    await editForm.locator('select[name="status"]').selectOption("paused");
    await editForm.getByRole("button", { name: "Project speichern" }).click();
    await expect(page.locator("[data-education-action-status]")).toHaveText(
      "Education Project aktualisiert.",
    );

    await page.reload();
    const reloadedForm = page.getByRole("form", {
      name: "Education Project bearbeiten",
    });
    await expect(
      reloadedForm.getByLabel("Titel", { exact: true }),
    ).toHaveValue(editedTitle);
    await expect(
      reloadedForm.locator('textarea[name="description"]'),
    ).toHaveValue("A1.1B1 edited research context");
    await expect(reloadedForm.locator('select[name="status"]')).toHaveValue(
      "paused",
    );
  });

  test("A1.1B1 creates links unlinks and reloads literature context", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Requires local authenticated Supabase state.",
    );
    const stamp = Date.now();
    const projectTitle = `A1.1B1 Literature Project ${stamp}`;
    const resourceTitle = `A1.1B1 Source ${stamp}`;
    const editedResourceTitle = `A1.1B1 Edited Source ${stamp}`;

    await openManualPortfolioWithDb(
      page,
      "A1.1B1 requires the local Manual database.",
    );
    await page.goto("/education");
    const createProjectForm = page.getByRole("form", {
      name: "Education Project erstellen",
    });
    await createProjectForm
      .getByLabel("Titel", { exact: true })
      .fill(projectTitle);
    await createProjectForm
      .locator('select[name="status"]')
      .selectOption("active");
    await createProjectForm
      .getByRole("button", { name: "Education Project erstellen" })
      .click();
    await expect(page.locator("[data-education-action-status]")).toHaveText(
      "Education Project erstellt.",
    );

    const literatureRegion = page.locator(
      '[data-education-region="literature"]',
    );
    const createLiteratureForm = literatureRegion.getByRole("form", {
      name: "Literatur erstellen",
    });
    await createLiteratureForm
      .getByLabel("Titel", { exact: true })
      .fill(resourceTitle);
    await createLiteratureForm
      .locator('textarea[name="body"]')
      .fill("A1.1B1 source note");
    await createLiteratureForm
      .locator('input[name="url"]')
      .fill(`https://example.test/a11b1-${stamp}`);
    await createLiteratureForm
      .locator('select[name="type"]')
      .selectOption("research");
    await createLiteratureForm
      .getByRole("button", { name: "Literatur speichern und verknüpfen" })
      .click();
    await expect(page.locator("[data-education-action-status]")).toHaveText(
      "Literatur erstellt und verknüpft.",
    );
    const resourceCard = literatureRegion
      .locator("[data-education-resource-card]")
      .filter({ hasText: resourceTitle });
    await expect(resourceCard).toHaveCount(1);

    const editForm = literatureRegion.getByRole("form", {
      name: "Literatur bearbeiten",
    });
    await editForm
      .getByLabel("Titel", { exact: true })
      .fill(editedResourceTitle);
    await editForm
      .locator('textarea[name="body"]')
      .fill("A1.1B1 edited source note");
    await editForm
      .locator('input[name="url"]')
      .fill(`https://example.test/a11b1-edited-${stamp}`);
    await editForm.locator('select[name="type"]').selectOption("source");
    await editForm
      .getByRole("button", { name: "Literatur aktualisieren" })
      .click();
    await expect(page.locator("[data-education-action-status]")).toHaveText(
      "Literatur aktualisiert.",
    );

    await page.reload();
    const editedCard = literatureRegion
      .locator("[data-education-resource-card]")
      .filter({ hasText: editedResourceTitle });
    await expect(editedCard).toHaveCount(1);
    const reloadedEditForm = literatureRegion.getByRole("form", {
      name: "Literatur bearbeiten",
    });
    await expect(
      reloadedEditForm.getByLabel("Titel", { exact: true }),
    ).toHaveValue(editedResourceTitle);
    await expect(
      reloadedEditForm.locator('textarea[name="body"]'),
    ).toHaveValue("A1.1B1 edited source note");
    await expect(
      reloadedEditForm.locator('select[name="type"]'),
    ).toHaveValue("source");

    await editedCard
      .getByRole("form", {
        name: `Literatur lösen ${editedResourceTitle}`,
      })
      .getByRole("button", { name: "Verknüpfung lösen" })
      .click();
    await expect(page.locator("[data-education-action-status]")).toHaveText(
      "Literaturverknüpfung gelöst.",
    );
    await page.reload();
    await expect(
      literatureRegion
        .locator("[data-education-resource-card]")
        .filter({ hasText: editedResourceTitle }),
    ).toHaveCount(0);
  });

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
  const resourceRelationDbProofSkipReason =
    "Manual Supabase auth state unavailable; Resource relation DB proof skipped.";

  async function createK11BResource(page: Page, title: string, body: string, url: string, type = "research") {
    await page.goto("/resources");
    const form = page.getByRole("form", { name: "Resource erstellen" });
    await expect(form).toBeVisible();
    await form.getByLabel("Titel", { exact: true }).fill(title);
    await form.getByLabel("Beschreibung / Notiz", { exact: true }).fill(body);
    await form.getByLabel("URL", { exact: true }).fill(url);
    await form.locator('select[name="type"]').selectOption(type);
    await form.getByRole("button", { name: "Resource speichern" }).click();
    await expect(page.locator("#resources-page").getByRole("status")).toContainText("Resource erstellt.");
    await expect(page.locator('[data-resources-section="relation-inspector"] #selected-resource-heading')).toHaveText(title);
  }

  test("K1.1B creates edits and reloads a resource", async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const title = `K1.1B Resource ${stamp}`;
    const editedTitle = `K1.1B Edited Resource ${stamp}`;
    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await createK11BResource(page, title, `K1.1B note ${stamp}`, `https://example.test/k11b-${stamp}`);
    const inspector = page.locator('[data-resources-section="relation-inspector"]');
    const editForm = inspector.getByRole("form", { name: "Resource bearbeiten" });
    await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle);
    await editForm.locator('textarea[name="body"]').fill(`K1.1B edited note ${stamp}`);
    await editForm.locator('select[name="type"]').selectOption("learning");
    await editForm.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.locator("#resources-page").getByRole("status")).toContainText("Resource aktualisiert.");
    await page.reload();
    await expect(inspector.locator("#selected-resource-heading")).toHaveText(editedTitle);
    await expect(inspector.getByRole("form", { name: "Resource bearbeiten" }).locator('textarea[name="body"]')).toHaveValue(`K1.1B edited note ${stamp}`);
  });

  test("K1.1B searches resources by canonical fields", async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const title = `K1.1B Search Resource ${stamp}`;
    const note = `Canonical Needle ${stamp}`;
    const url = `https://example.test/search-${stamp}`;
    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await createK11BResource(page, title, note, url, "research");
    const assertSearch = async (query: string, unique = true) => {
      await page.goto(`/resources?q=${encodeURIComponent(query)}`);
      const library = page.locator('[data-resources-section="library"]');
      await expect(library.getByRole("link", { name: `Select resource ${title}` })).toBeVisible();
      if (unique) await expect(library.locator("[data-resource-row]")).toHaveCount(1);
    };
    await assertSearch(title.toLocaleLowerCase());
    await assertSearch(note.toLocaleUpperCase());
    await assertSearch(`search-${stamp}`);
    await assertSearch("research", false);
  });

  test("K1.1B links unlinks archives and restores resource context", async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `K1.1B Project ${stamp}`;
    const resourceTitle = `K1.1B Lifecycle Resource ${stamp}`;
    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(page, projectTitle, "K1.1B relation target");
    await createK11BResource(page, resourceTitle, "K1.1B lifecycle note", `https://example.test/lifecycle-${stamp}`);
    await linkSelectedResourceToTarget(page, "project", projectTitle);
    const inspector = page.locator('[data-resources-section="relation-inspector"]');
    const projectSection = inspector.getByRole("region", { name: "Verknüpfte Projects" });
    const relationCard = projectSection.locator("[data-resource-relation-card]").filter({ hasText: projectTitle });
    await expect(relationCard).toHaveCount(1);
    await relationCard.getByRole("button", { name: "Verknüpfung lösen" }).click();
    await page.reload();
    await expect(relationCard).toHaveCount(0);
    await inspector.getByRole("form", { name: "Resource archivieren" }).getByRole("button", { name: "Resource archivieren" }).click();
    await expect(page.locator("#resources-page").getByRole("status")).toContainText("Resource archiviert.");
    await expect(inspector.getByRole("region", { name: "Resource Overview" }).getByText("Archived", { exact: true })).toBeVisible();
    await inspector.getByRole("form", { name: "Resource wiederherstellen" }).getByRole("button", { name: "Resource wiederherstellen" }).click();
    await expect(page.locator("#resources-page").getByRole("status")).toContainText("Resource wiederhergestellt.");
    await page.reload();
    await expect(inspector.getByRole("form", { name: "Resource bearbeiten" })).toBeVisible();
  });

  test("K1.1C projects canonical relations across task project goal and resource", async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const goalTitle = `K1.1C Goal ${stamp}`;
    const projectTitle = `K1.1C Project ${stamp}`;
    const taskTitle = `K1.1C Task ${stamp}`;
    const resourceTitle = `K1.1C Resource ${stamp}`;

    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(page, goalTitle, "K1.1C canonical goal");
    await createGoalWorkbenchProject(page, projectTitle, "K1.1C canonical project");
    await openPortfolioEntityByTitle(page, "projects", projectTitle);
    await createProjectWorkbenchTask(page, taskTitle, "K1.1C next", "K1.1C canonical task");
    await createK11BResource(page, resourceTitle, "K1.1C canonical resource", `https://example.test/k11c-${stamp}`);
    await linkSelectedResourceToTarget(page, "project", projectTitle);
    await linkSelectedResourceToTarget(page, "goal", goalTitle);

    const inspector = page.locator('[data-resources-section="relation-inspector"]');
    const relationForm = inspector.getByRole("form", { name: "Resource Beziehung hinzufügen" });
    await relationForm.getByLabel("Zieltyp").selectOption("task");
    const taskOption = relationForm
      .getByLabel("Ziel", { exact: true })
      .locator("option")
      .filter({ hasText: taskTitle });
    await expect(taskOption).toHaveCount(1);
    const taskId = await taskOption.getAttribute("value");
    await relationForm.getByLabel("Ziel", { exact: true }).selectOption(taskId ?? "");
    await relationForm.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Beziehung gespeichert" })).toBeVisible();

    const expectContextEntry = async (root: ReturnType<Page["locator"]>, type: string, title: string) => {
      const entry = root.locator(`[data-connected-context-entry^="${type}:"]`).filter({ hasText: title });
      await expect(entry).toHaveCount(1);
      await expect(entry).toContainText(/resource_relations|tasks\.project_id|tasks\.goal_id|projects\.goal_id/);
    };

    const resourceContext = inspector.locator("[data-connected-context]");
    await expectContextEntry(resourceContext, "task", taskTitle);
    await expectContextEntry(resourceContext, "project", projectTitle);
    await expectContextEntry(resourceContext, "goal", goalTitle);

    await openPortfolioEntityByTitle(page, "projects", projectTitle);
    const projectContext = page.locator('[data-portfolio-section="context-panel"] [data-connected-context]');
    await expectContextEntry(projectContext, "task", taskTitle);
    await expectContextEntry(projectContext, "goal", goalTitle);
    await expectContextEntry(projectContext, "resource", resourceTitle);

    await openPortfolioEntityByTitle(page, "goals", goalTitle);
    const goalContext = page.locator('[data-portfolio-section="context-panel"] [data-connected-context]');
    await expectContextEntry(goalContext, "project", projectTitle);
    await expectContextEntry(goalContext, "task", taskTitle);
    await expect(goalContext.locator(`[data-connected-context-entry^="task:"]`).filter({ hasText: taskTitle })).toContainText("Via project");
    await expectContextEntry(goalContext, "resource", resourceTitle);

    await openPortfolioEntityByTitle(page, "tasks", taskTitle);
    const taskContext = page.locator('[data-portfolio-section="context-panel"] [data-connected-context]');
    await expectContextEntry(taskContext, "project", projectTitle);
    await expectContextEntry(taskContext, "goal", goalTitle);
    await expectContextEntry(taskContext, "resource", resourceTitle);
  });

  test("K1.1C navigates connected context and remains reload stable", async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE, "Requires local authenticated Supabase state.");
    const stamp = Date.now();
    const projectTitle = `K1.1C Navigation Project ${stamp}`;
    const resourceTitle = `K1.1C Navigation Resource ${stamp}`;

    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(page, projectTitle, "K1.1C navigation target");
    await createK11BResource(page, resourceTitle, "K1.1C navigation resource", `https://example.test/k11c-nav-${stamp}`);
    await linkSelectedResourceToTarget(page, "project", projectTitle);
    await openPortfolioEntityByTitle(page, "projects", projectTitle);

    const portfolioContext = page.locator('[data-portfolio-section="context-panel"] [data-connected-context]');
    const resourceEntry = portfolioContext.locator('[data-connected-context-entry^="resource:"]').filter({ hasText: resourceTitle });
    await resourceEntry.getByRole("link", { name: "Öffnen" }).click();
    const resourceInspector = page.locator('[data-resources-section="relation-inspector"]');
    await expect(resourceInspector.locator("#selected-resource-heading")).toHaveText(resourceTitle);
    await page.reload();
    const resourceContext = resourceInspector.locator("[data-connected-context]");
    const projectEntry = resourceContext.locator('[data-connected-context-entry^="project:"]').filter({ hasText: projectTitle });
    await expect(projectEntry).toHaveCount(1);
    await projectEntry.getByRole("link", { name: "Öffnen" }).click();
    await expect(page.locator("#selected-entity-heading")).toHaveText(projectTitle);
  });

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

  test("Manual Resource to Project Relation Create persists through Resources and Project Workbench", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Manual Supabase auth state unavailable; Resource relation DB proof skipped.",
    );

    const projectTitle = uniqueTitle("R173C Project Proof");
    const resourceTitle = uniqueTitle("R173C Resource Project Proof");

    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "R1.7.3C Resource relation Project proof target.",
    );
    await createManualResourceFromInbox(
      page,
      resourceTitle,
      "Create a real resource for Project relation proof.",
      resourceRelationDbProofSkipReason,
    );
    await selectResourceByTitle(page, resourceTitle);

    const projectId = await linkSelectedResourceToTarget(
      page,
      "project",
      projectTitle,
    );

    await expectSingleResourceRelationCard(page, projectTitle, projectId);
    await page.reload();
    await expectSingleResourceRelationCard(page, projectTitle, projectId);

    await linkSelectedResourceToTarget(page, "project", projectTitle);
    await expect(
      page.getByText("Beziehung besteht bereits.").first(),
    ).toBeVisible();
    await expectSingleResourceRelationCard(page, projectTitle, projectId);

    await page.goto("/portfolio?view=projects");
    await page
      .getByRole("link", { name: new RegExp(projectTitle) })
      .first()
      .click();

    const contextPanel = page.locator('[data-portfolio-section="context-panel"]');

    await expect(page.locator("#selected-entity-heading")).toHaveText(
      projectTitle,
    );
    await expect(
      contextPanel.getByRole("heading", { name: "Resources" }),
    ).toBeVisible();
    await expectWorkbenchResourceVisible(page, resourceTitle);
  });

  test("Manual Resource to Goal Relation Create persists through Resources and Goal Workbench", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Manual Supabase auth state unavailable; Resource relation DB proof skipped.",
    );

    const goalTitle = uniqueTitle("R173C Goal Proof");
    const resourceTitle = uniqueTitle("R173C Resource Goal Proof");

    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "R1.7.3C Resource relation Goal proof target.",
    );
    await createManualResourceFromInbox(
      page,
      resourceTitle,
      "Create a real resource for Goal relation proof.",
      resourceRelationDbProofSkipReason,
    );
    await selectResourceByTitle(page, resourceTitle);

    const goalId = await linkSelectedResourceToTarget(page, "goal", goalTitle);

    await expectSingleResourceRelationCard(page, goalTitle, goalId);
    await page.reload();
    await expectSingleResourceRelationCard(page, goalTitle, goalId);

    await page.goto("/portfolio?view=goals");
    await page
      .getByRole("link", { name: new RegExp(goalTitle) })
      .first()
      .click();

    const contextPanel = page.locator('[data-portfolio-section="context-panel"]');

    await expect(page.locator("#selected-entity-heading")).toHaveText(goalTitle);
    await expect(
      contextPanel.getByRole("heading", { name: "Resources" }),
    ).toBeVisible();
    await expectWorkbenchResourceVisible(page, resourceTitle);
  });

  test("Manual Project and Goal Workbench Resource Relation Create persists reload-stable", async ({
    page,
  }) => {
    test.setTimeout(75_000);
    test.skip(
      !process.env.PLAYWRIGHT_SUPABASE_AUTH_STATE,
      "Manual Supabase auth state unavailable; Workbench Resource relation DB proof skipped.",
    );

    const projectTitle = uniqueTitle("F11F Workbench Resource Project");
    const goalTitle = uniqueTitle("F11F Workbench Resource Goal");
    const resourceTitle = uniqueTitle("F11F Workbench Resource");

    await openManualPortfolioWithDb(page, resourceRelationDbProofSkipReason);
    await page.goto("/portfolio?view=projects");
    await createPortfolioProjectTarget(
      page,
      projectTitle,
      "F1.1F Workbench Resource relation Project target.",
    );
    await page.goto("/portfolio?view=goals");
    await createPortfolioGoalTarget(
      page,
      goalTitle,
      "F1.1F Workbench Resource relation Goal target.",
    );
    await createManualResourceFromInbox(
      page,
      resourceTitle,
      "Create a real resource for Workbench relation proof.",
      resourceRelationDbProofSkipReason,
    );

    await openPortfolioEntityByTitle(page, "projects", projectTitle);
    await linkWorkbenchResourceToTarget(page, "Project", resourceTitle);
    await expectWorkbenchResourceVisible(page, resourceTitle);
    await page.reload();
    await expectSelectedPortfolioEntity(page, projectTitle);
    await expectWorkbenchResourceVisible(page, resourceTitle);

    await openPortfolioEntityByTitle(page, "goals", goalTitle);
    await linkWorkbenchResourceToTarget(page, "Goal", resourceTitle);
    await expectWorkbenchResourceVisible(page, resourceTitle);
    await page.reload();
    await expectSelectedPortfolioEntity(page, goalTitle);
    await expectWorkbenchResourceVisible(page, resourceTitle);
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

  test("keeps legacy manual habit fixtures out of the canonical Health overview", async ({
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
    ).toHaveAttribute("data-content-state", "empty");
    await expect(page.getByText("Manual Habit 1")).toHaveCount(0);
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

  test("keeps Empty and auth-blocked Habit management honest", async ({
    page,
  }) => {
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/habits");
    });

    await expectNoMainStrings(page, habitsBlockedDemoStrings, "habits");
    await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();
    await expect(page.locator('[data-habits-section="create-form"]')).toHaveCount(0);

    await setProfile(page, "manual");
    await writeManualProfile({
      habits: [manualHabit(1)],
    });
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/habits");
    });

    await expectNoMainStrings(page, habitsBlockedDemoStrings, "habits");
    await expect(page.getByText(/Melde dich lokal an, um Habits/)).toBeVisible();
    await expect(page.getByText("Manual Habit 1")).toHaveCount(0);
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
    await setProfile(page, "empty");
    await expectNoHydrationErrors(page, async () => {
      await page.goto("/health/strength");
    });

    await expectStrengthContracts(page, "empty");
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
