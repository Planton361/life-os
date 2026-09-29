import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("Issue 58 Task read-first, Project guidance and task-aware Calendar loop", async ({
  page,
  context,
}, info) => {
  test.setTimeout(300000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "issue58loop", stamp);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });

  const cookie = (await context.cookies()).find((item) =>
    item.name.includes("auth-token"),
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
  const userId = (await api.auth.getUser()).data.user!.id;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
  const tomorrowDate = new Date(`${today}T12:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const berlinInstant = (date: string, time: string) => {
    const initial = new Date(date + "T" + time + ":00Z");
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(initial);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "0";
    const observedMinutes = Number(part("hour")) * 60 + Number(part("minute"));
    const requestedMinutes =
      Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    return new Date(
      initial.getTime() + (requestedMinutes - observedMinutes) * 60_000,
    ).toISOString();
  };

  const createProject = async (
    title: string,
    values: Partial<Database["public"]["Tables"]["projects"]["Insert"]> = {},
  ) =>
    (
      await api
        .from("projects")
        .insert({ user_id: userId, title, ...values })
        .select()
        .single()
        .throwOnError()
    ).data;
  const createTask = async (
    title: string,
    values: Partial<Database["public"]["Tables"]["tasks"]["Insert"]> = {},
  ) =>
    (
      await api
        .from("tasks")
        .insert({ user_id: userId, title, ...values })
        .select()
        .single()
        .throwOnError()
    ).data;

  const goal = (
    await api
      .from("goals")
      .insert({ user_id: userId, title: `Goal ${stamp}` })
      .select()
      .single()
      .throwOnError()
  ).data;
  const emptyProject = await createProject(`First Task Project ${stamp}`, {
    goal_id: goal.id,
    next_step: `Stored Project focus ${stamp}`,
    status: "active",
  });
  const activeMilestone = (
    await api
      .from("project_milestones")
      .insert({
        user_id: userId,
        project_id: emptyProject.id,
        title: `Current milestone ${stamp}`,
        status: "active",
        sort_order: 0,
      })
      .select()
      .single()
      .throwOnError()
  ).data;
  const choiceProject = await createProject(`Choice Project ${stamp}`, {
    goal_id: goal.id,
    status: "active",
  });
  const blockedProject = await createProject(`Blocked Project ${stamp}`, {
    status: "active",
  });
  const noMilestoneProject = await createProject(`No Milestones ${stamp}`, {
    status: "active",
  });
  const completedProject = await createProject(`Completed Project ${stamp}`, {
    status: "completed",
  });
  const archivedProject = await createProject(`Archived Project ${stamp}`, {
    archived_at: new Date().toISOString(),
    status: "paused",
  });

  const resource = (
    await api
      .from("resources")
      .insert({
        user_id: userId,
        title: `Primary work artifact ${stamp}`,
        type: "link",
        url: "https://example.org/issue-58-artifact",
      })
      .select()
      .single()
      .throwOnError()
  ).data;
  expect(
    (
      await api.rpc("set_project_resource_role", {
        p_project_id: emptyProject.id,
        p_resource_id: resource.id,
        p_role: "primary_artifact",
      })
    ).error,
  ).toBeNull();

  const inboxTask = await createTask(`Minimal Inbox ${stamp}`, {
    status: "inbox",
  });
  const activeTask = await createTask(`Active Task ${stamp}`, {
    project_id: choiceProject.id,
    status: "active",
    planned_date: today,
    due_at: `${tomorrow}T12:00:00.000Z`,
  });
  const readyA = await createTask(`Choice A ${stamp}`, {
    project_id: choiceProject.id,
    status: "planned",
  });
  const readyB = await createTask(`Choice B ${stamp}`, {
    project_id: choiceProject.id,
    status: "planned",
  });
  const satisfiedPredecessor = await createTask(`Satisfied ${stamp}`, {
    project_id: choiceProject.id,
    status: "done",
    completed_at: new Date().toISOString(),
  });
  const waitingPredecessor = await createTask(`Waiting ${stamp}`, {
    project_id: choiceProject.id,
    status: "waiting",
  });
  const multiBlockedTask = await createTask(`Multiple blockers ${stamp}`, {
    project_id: choiceProject.id,
    status: "planned",
  });
  const waitingAllBlocked = await createTask(`Waiting source ${stamp}`, {
    project_id: blockedProject.id,
    status: "waiting",
  });
  const allBlockedOne = await createTask(`All blocked one ${stamp}`, {
    project_id: blockedProject.id,
    status: "planned",
  });
  const allBlockedTwo = await createTask(`All blocked two ${stamp}`, {
    project_id: blockedProject.id,
    status: "planned",
  });
  const noMilestoneTask = await createTask(`No stage ready ${stamp}`, {
    project_id: noMilestoneProject.id,
    status: "planned",
  });
  const completedTask = await createTask(`Completed work ${stamp}`, {
    project_id: completedProject.id,
    status: "done",
    completed_at: new Date().toISOString(),
  });

  expect(
    (
      await api.from("task_dependencies").insert([
        {
          user_id: userId,
          project_id: choiceProject.id,
          predecessor_task_id: satisfiedPredecessor.id,
          successor_task_id: multiBlockedTask.id,
        },
        {
          user_id: userId,
          project_id: choiceProject.id,
          predecessor_task_id: waitingPredecessor.id,
          successor_task_id: multiBlockedTask.id,
        },
        {
          user_id: userId,
          project_id: blockedProject.id,
          predecessor_task_id: waitingAllBlocked.id,
          successor_task_id: allBlockedOne.id,
        },
        {
          user_id: userId,
          project_id: blockedProject.id,
          predecessor_task_id: waitingAllBlocked.id,
          successor_task_id: allBlockedTwo.id,
        },
      ])
    ).error,
  ).toBeNull();

  const guidance = (label: string) =>
    page.getByRole("region", { name: label, exact: true });
  const taskContext = () =>
    page.locator("[data-task-context]");
  const visitProject = async (projectId: string) => {
    await page.goto(`/projects/${projectId}`);
    await expect(guidance("Project Task guidance")).toBeVisible();
  };

  await visitProject(emptyProject.id);
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "empty",
  );
  await expect(guidance("Project-Fokus")).toContainText(
    emptyProject.next_step!,
  );
  const primaryArtifact = page.getByRole("region", {
    name: "Primary Work Artifact",
    exact: true,
  });
  await expect(primaryArtifact).toContainText(resource.title);
  const firstTaskLink = guidance("Project Task guidance").getByRole("link", {
    name: "Erste Task anlegen",
    exact: true,
  });
  await firstTaskLink.click();
  const capture = page.getByRole("form", {
    name: "Task erstellen",
    exact: true,
  });
  await expect(capture).toHaveAttribute(
    "data-task-capture-title-first",
    "true",
  );
  await expect(capture.getByLabel("Titel", { exact: true })).toBeVisible();
  const captureContext = capture.locator("[data-task-capture-context]");
  await expect(
    captureContext.getByRole("link", {
      name: emptyProject.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(captureContext).toContainText(activeMilestone.title);
  await expect(
    captureContext.getByRole("link", { name: goal.title, exact: true }),
  ).toHaveAttribute("href", `/goals/${goal.id}`);
  const optional = capture.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await expect(optional).toHaveAttribute("aria-expanded", "false");
  await expect(capture.getByLabel("Project", { exact: true })).toBeHidden();
  await page.reload();
  await expect(
    captureContext.getByRole("link", {
      name: emptyProject.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(captureContext).toContainText(activeMilestone.title);
  await expect(
    captureContext.getByRole("link", { name: goal.title, exact: true }),
  ).toHaveAttribute("href", `/goals/${goal.id}`);
  await optional.click();
  await expect(capture.getByLabel("Project", { exact: true })).toHaveValue(
    emptyProject.id,
  );
  await expect(
    capture.getByLabel("Project Milestone", { exact: true }),
  ).toHaveValue(activeMilestone.id);
  await capture.getByLabel("Geplantes Datum", { exact: true }).fill(today);
  const createdTitle = `First real Task ${stamp}`;
  await capture.getByLabel("Titel", { exact: true }).fill(createdTitle);
  await capture
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${emptyProject.id}$`));
  await expect(
    page.getByRole("status").filter({ hasText: "Task erstellt." }).last(),
  ).toBeVisible();
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "single-ready",
  );
  await expect(guidance("Project Task guidance")).toContainText(createdTitle);
  await page.reload();
  await expect(guidance("Project Task guidance")).toContainText(createdTitle);
  await expect(primaryArtifact).toContainText(resource.title);

  const createdTask = (
    await api
      .from("tasks")
      .select("id,planned_date,status,project_id,milestone_id")
      .eq("user_id", userId)
      .eq("title", createdTitle)
      .single()
      .throwOnError()
  ).data;
  expect(createdTask).toMatchObject({
    project_id: emptyProject.id,
    milestone_id: activeMilestone.id,
    status: "planned",
  });

  await guidance("Project Task guidance")
    .getByRole("link", { name: createdTitle, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${createdTask.id}$`));
  await expect(
    page.getByRole("heading", { name: createdTitle, exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-task-detail-variant="B"]')).toBeVisible();
  const identity = page.locator('[data-task-order="identity"]');
  await expect(identity).toContainText("Geplant");
  await expect(identity).toContainText("Bereit");
  await expect(identity).toContainText("Ohne Priorität");
  await expect(identity).toContainText("Erstellt am");
  await expect(identity.locator('[data-task-readiness="READY"]')).toHaveCount(1);
  await expect(taskContext()).toContainText(emptyProject.title);
  await expect(taskContext()).toContainText(activeMilestone.title);
  await expect(taskContext()).toContainText(goal.title);
  await expect(
    taskContext().getByRole("link", { name: goal.title, exact: true }),
  ).toHaveAttribute("href", `/goals/${goal.id}`);
  const planning = page.locator('[data-task-order="planning"]');
  await expect(planning).toContainText("Geplant");
  await expect(planning).toContainText("Termin");
  await expect(planning).toContainText("Deadline");
  for (const heading of [
    "Worum geht es?",
    "Arbeitsnotiz",
    "Arbeitsschritte",
    "Voraussetzung",
    "Planung",
    "Zurück zum Zusammenhang",
  ])
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await expect(page.locator("[data-task-guidance]")).toHaveCount(1);
  for (const rejected of [
    "Project / Goal Context",
    "Dependency + Planning Depth",
    "Purpose / Beschreibung / Arbeitsinhalt",
  ])
    await expect(
      page.getByRole("heading", { name: rejected, exact: true }),
    ).toHaveCount(0);
  await expect(
    page.getByText(/Lifecycle:|Dependency Readiness:/),
  ).toHaveCount(0);
  const taskGuidance = guidance("Dein nächster Schritt");
  await expect(taskGuidance).toHaveAttribute(
    "data-task-guidance",
    "Im Calendar planen",
  );
  await taskGuidance.getByRole("link", { name: "Im Calendar planen" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/calendar\\?task=${createdTask.id}`),
  );
  const calendarUrl = new URL(page.url());
  const plannedTimeBlockDate = calendarUrl.searchParams.get("date")!;
  expect(calendarUrl.pathname).toBe("/calendar");
  expect(calendarUrl.searchParams.get("task")).toBe(createdTask.id);
  expect(calendarUrl.searchParams.get("date")).toBeTruthy();
  expect(calendarUrl.searchParams.get("view")).toBe("day");
  const queueSchedule = page.locator(
    '[data-calendar-section="queue-schedule"]',
  );
  await expect(queueSchedule).toContainText(createdTitle);
  await expect(queueSchedule.getByLabel("Weekday")).toHaveValue(
    calendarUrl.searchParams.get("date")!,
  );
  await page.reload();
  await expect(queueSchedule).toContainText(createdTitle);
  const scheduledTime = "10:30";
  await queueSchedule.getByLabel("Start time").fill(scheduledTime);
  await queueSchedule.getByLabel("Duration").selectOption("30");
  await queueSchedule
    .getByRole("button", { name: "Schedule task", exact: true })
    .click();
  await expect
    .poll(async () => {
      const { data } = await api
        .from("tasks")
        .select("scheduled_start_at")
        .eq("id", createdTask.id)
        .single();
      return data?.scheduled_start_at ?? null;
    })
    .not.toBeNull();
  const scheduledTaskRecord = await api
    .from("tasks")
    .select("planned_date,scheduled_start_at")
    .eq("id", createdTask.id)
    .single()
    .throwOnError();
  expect(scheduledTaskRecord.data.scheduled_start_at).not.toBeNull();
  const scheduledBerlinDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date(scheduledTaskRecord.data.scheduled_start_at!));
  expect(scheduledBerlinDate).toBe(plannedTimeBlockDate);
  await expect(
    page.locator('[data-calendar-section="queue-schedule"]'),
  ).toHaveCount(0);
  const timedBlock = page
    .locator('[data-calendar-section="day-surface"]')
    .getByRole("button", { name: new RegExp(createdTitle) });
  await page.reload();
  await expect(page).toHaveURL(
    new RegExp(`task=${createdTask.id}.*date=${plannedTimeBlockDate}.*view=day`),
  );
  await expect(timedBlock).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`task=${createdTask.id}`));
  await expect(
    page.getByRole("link", { name: "Open task", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open task", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${createdTask.id}$`));
  const taskEditTrigger = page.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await taskEditTrigger.click();
  const taskEditForm = page.getByRole("form", {
    name: "Task bearbeiten",
    exact: true,
  });
  await taskEditForm
    .getByLabel("Geplantes Datum", { exact: true })
    .fill(tomorrow);
  await taskEditForm
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task gespeichert." }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(planning).toContainText(
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${tomorrow}T12:00:00Z`)),
  );
  await expect(planning).toContainText(
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: "Europe/Berlin",
    }).format(new Date(`${plannedTimeBlockDate}T10:30:00`)),
  );
  const scheduledGuidanceLink = guidance(
    "Dein nächster Schritt",
  ).getByRole("link", {
    name: "Geplanten Termin öffnen",
    exact: true,
  });
  await expect(scheduledGuidanceLink).toHaveAttribute(
    "href",
    new RegExp(`/calendar\\?task=${createdTask.id}&date=${plannedTimeBlockDate}&view=day`),
  );
  await scheduledGuidanceLink.click();
  const scheduledDayBlock = page
    .locator('[data-calendar-section="day-surface"]')
    .getByRole("button", { name: new RegExp(createdTitle) });
  await expect(scheduledDayBlock).toBeVisible();
  await page.reload();
  await expect(scheduledDayBlock).toBeVisible();
  await page
    .getByRole("button", { name: "Inspector schließen", exact: true })
    .click();
  await expect(scheduledDayBlock).toBeFocused();
  await expect(page).not.toHaveURL(/(?:\?|&)task=/);
  await page.goto(
    `/calendar?task=${createdTask.id}&date=${plannedTimeBlockDate}&view=day`,
  );
  await page
    .locator('[data-calendar-section="day-surface"]')
    .getByRole("button", { name: /Select free slot .* at 08:00/ })
    .click();
  await expect(page).not.toHaveURL(/(?:\?|&)task=/);
  await page.reload();
  await expect(page).not.toHaveURL(/(?:\?|&)task=/);
  await page.goto(
    `/calendar?task=${createdTask.id}&date=${plannedTimeBlockDate}&view=day`,
  );
  await expect(scheduledDayBlock).toBeVisible();
  await scheduledDayBlock.click();
  await page.getByRole("link", { name: "Open task", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${createdTask.id}$`));
  await expect(
    guidance("Dein nächster Schritt").getByRole("link", {
      name: "Geplanten Termin öffnen",
      exact: true,
    }),
  ).toHaveAttribute(
    "href",
    new RegExp(`/calendar\\?task=${createdTask.id}&date=.*&view=day`),
  );
  await page.reload();
  const lifecycleTrigger = page.getByRole("button", {
    name: "Mehr verwalten",
    exact: true,
  });
  await lifecycleTrigger.click();
  await page
    .getByRole("button", { name: "Status verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Task abschließen", exact: true })
    .click();
  await expect(
    guidance("Dein nächster Schritt").getByRole("link", {
      name: `Zurück zu ${emptyProject.title}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await guidance("Dein nächster Schritt")
    .getByRole("link", { name: `Zurück zu ${emptyProject.title}`, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${emptyProject.id}$`));
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "no-open-work",
  );
  await expect(
    page.getByRole("region", { name: "Tasks & Progress", exact: true }),
  ).toContainText("1/1 Tasks erledigt");
  await page.reload();
  await expect(guidance("Project Task guidance")).toContainText(
    "Keine ausführbaren Tasks",
  );

  await page.goto(`/tasks/${inboxTask.id}`);
  const inboxIdentity = page.locator('[data-task-order="identity"]');
  await expect(inboxIdentity).toContainText("Inbox");
  await expect(inboxIdentity.locator('[data-task-readiness="READY"]')).toHaveCount(1);
  const inboxGuidance = guidance("Dein nächster Schritt");
  await expect(inboxGuidance).toHaveAttribute(
    "data-task-guidance",
    "Einordnen",
  );
  await inboxGuidance
    .getByRole("link", { name: "Einordnen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${inboxTask.id}\\?edit=1$`));
  const editTrigger = page.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await expect(editTrigger).toHaveAttribute("aria-expanded", "true");
  const editForm = page.getByRole("form", {
    name: "Task bearbeiten",
    exact: true,
  });
  await expect(editForm.getByLabel("Titel", { exact: true })).toBeFocused();
  await editForm.getByLabel("Titel", { exact: true }).press("Escape");
  await expect(page).toHaveURL(new RegExp(`/tasks/${inboxTask.id}$`));
  await expect(editTrigger).toBeFocused();
  await expect(editTrigger).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(editTrigger).toHaveAttribute("aria-expanded", "false");

  await page.goto(`/tasks/${multiBlockedTask.id}`);
  const multiBlockedIdentity = page.locator('[data-task-order="identity"]');
  await expect(multiBlockedIdentity).toContainText("Geplant");
  await expect(multiBlockedIdentity).toContainText("Blockiert");
  await expect(
    multiBlockedIdentity.locator('[data-task-readiness="BLOCKED"]'),
  ).toHaveCount(1);
  await expect(guidance("Dein nächster Schritt")).toHaveAttribute(
    "data-task-guidance",
    "Blocker prüfen",
  );
  const dependencies = page.getByRole("region", {
    name: "Voraussetzung",
    exact: true,
  });
  await expect(
    dependencies.getByRole("link", {
      name: satisfiedPredecessor.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dependencies.getByRole("link", {
      name: waitingPredecessor.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(dependencies).toContainText("Erfüllt");
  await expect(dependencies).toContainText("Offen · blockiert");

  await page.goto(`/tasks/${waitingAllBlocked.id}`);
  const waitingIdentity = page.locator('[data-task-order="identity"]');
  await expect(waitingIdentity).toContainText("Wartend");
  await expect(waitingIdentity).toContainText("Bereit");
  await expect(waitingIdentity.locator('[data-task-readiness="READY"]')).toHaveCount(1);
  await expect(guidance("Dein nächster Schritt")).toHaveAttribute(
    "data-task-guidance",
    "Warte-Status einordnen",
  );

  await page.goto(`/tasks/${allBlockedOne.id}`);
  const singleBlockedIdentity = page.locator('[data-task-order="identity"]');
  await expect(singleBlockedIdentity).toContainText("Geplant");
  await expect(singleBlockedIdentity).toContainText("Blockiert");
  await expect(
    singleBlockedIdentity.locator('[data-task-readiness="BLOCKED"]'),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Voraussetzung", exact: true })
      .getByRole("link", { name: waitingAllBlocked.title, exact: true }),
  ).toBeVisible();

  await page.goto(`/tasks/${activeTask.id}`);
  await expect(page.locator('[data-task-order="identity"]')).toContainText(
    "In Arbeit",
  );
  await expect(guidance("Dein nächster Schritt")).toHaveAttribute(
    "data-task-guidance",
    "Arbeit fortsetzen",
  );
  await expect(
    page.locator('[data-task-order="planning"]'),
  ).toContainText(
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${today}T12:00:00Z`)),
  );
  await expect(
    page.locator('[data-task-order="planning"]'),
  ).toContainText(
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${tomorrow}T12:00:00Z`)),
  );

  await visitProject(choiceProject.id);
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "multiple-ready",
  );
  await expect(guidance("Project Task guidance")).toContainText("Wähle selbst");
  await expect(guidance("Project Task guidance")).not.toContainText(
    "Nächste ausführbare Task",
  );
  const choiceWork = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  await expect(choiceWork).toContainText(readyA.title);
  await expect(choiceWork).toContainText(readyB.title);
  await expect(choiceWork).toContainText(multiBlockedTask.title);
  await expect(choiceWork).toContainText(waitingPredecessor.title);
  await expect(choiceWork).toContainText(satisfiedPredecessor.title);

  await visitProject(blockedProject.id);
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "all-blocked",
  );
  await expect(guidance("Project Task guidance")).toContainText(
    "Alle ausführbaren Tasks sind BLOCKED",
  );
  const blockedWork = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  await expect(blockedWork).toContainText(waitingAllBlocked.title);
  const blockedRow = blockedWork.getByRole("region", {
    name: "Ohne Milestone",
    exact: true,
  });
  await expect(
    blockedRow.getByRole("link", {
      name: `${waitingAllBlocked.title}: Details öffnen`,
      exact: true,
    }),
  ).toBeVisible();
  for (const blockedTask of [allBlockedOne, allBlockedTwo]) {
    const row = blockedRow
      .getByRole("listitem")
      .filter({ hasText: blockedTask.title });
    await expect(
      row.getByRole("link", {
        name: waitingAllBlocked.title,
        exact: true,
      }),
    ).toBeVisible();
  }

  await visitProject(noMilestoneProject.id);
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "single-ready",
  );
  await expect(
    page.getByRole("region", { name: "Tasks & Progress", exact: true }),
  ).toContainText("Noch keine Milestones.");
  await expect(
    page.getByRole("region", { name: "Tasks & Progress", exact: true }),
  ).toContainText(noMilestoneTask.title);

  await visitProject(completedProject.id);
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "no-open-work",
  );
  await expect(
    page.getByRole("region", { name: "Tasks & Progress", exact: true }),
  ).toContainText(completedTask.title);
  await expect(
    (
      await api
        .from("projects")
        .select("status")
        .eq("id", completedProject.id)
        .single()
        .throwOnError()
    ).data.status,
  ).toBe("completed");

  await visitProject(archivedProject.id);
  await expect(guidance("Project Task guidance")).toHaveAttribute(
    "data-project-task-guidance",
    "archived",
  );
  await expect(
    page.getByRole("button", { name: "Milestone hinzufügen", exact: true }),
  ).toHaveCount(0);

  await page.goto(`/tasks/${completedTask.id}`);
  await expect(
    guidance("Dein nächster Schritt").getByRole("link", {
      name: `Zurück zu ${completedProject.title}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/tasks/${noMilestoneTask.id}`);
  const editTriggerForKeyboard = page.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await editTriggerForKeyboard.focus();
  await editTriggerForKeyboard.press("Enter");
  await expect(editTriggerForKeyboard).toHaveAttribute("aria-expanded", "true");
  await editTriggerForKeyboard.press("Tab");
  await expect(
    page
      .getByRole("form", { name: "Task bearbeiten", exact: true })
      .getByLabel("Titel", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(editTriggerForKeyboard).toBeFocused();

  const visualGoal = (
    await api
      .from("goals")
      .insert({
        user_id: userId,
        title: "Eine realistische Woche mit Life OS planen",
      })
      .select()
      .single()
      .throwOnError()
  ).data;
  const visualProject = await createProject("Daily Planning Loop", {
    goal_id: visualGoal.id,
    status: "active",
  });
  const visualMilestone = (
    await api
      .from("project_milestones")
      .insert({
        user_id: userId,
        project_id: visualProject.id,
        title: "Task → Day Handoff",
        status: "active",
        sort_order: 0,
      })
      .select()
      .single()
      .throwOnError()
  ).data;
  const visualPredecessor = await createTask("Feste Termine zusammentragen", {
    project_id: visualProject.id,
    milestone_id: visualMilestone.id,
    status: "done",
    completed_at: new Date().toISOString(),
    priority: "P2",
  });
  const visualTaskTitle = "Wöchentliche Planung scharfstellen";
  const visualTaskDescription =
    "Eine realistische Woche mit Life OS planen: feste Termine, Fokuszeit und Erholung berücksichtigen.\n\nNächste Aktion: Vorhandene Termine und verfügbare Fokusfenster für die kommende Woche zusammentragen.";
  const visualTask = await createTask(visualTaskTitle, {
    project_id: visualProject.id,
    milestone_id: visualMilestone.id,
    goal_id: visualGoal.id,
    status: "planned",
    priority: "P1",
    planned_date: today,
    scheduled_start_at: berlinInstant(today, "09:30"),
    duration_minutes: 45,
    due_at: tomorrow + "T12:00:00.000Z",
    description: visualTaskDescription,
  });
  expect(
    (
      await api.from("task_dependencies").insert({
        user_id: userId,
        project_id: visualProject.id,
        predecessor_task_id: visualPredecessor.id,
        successor_task_id: visualTask.id,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await api.from("task_steps").insert([
        {
          user_id: userId,
          task_id: visualTask.id,
          title: "Feste Termine und Verpflichtungen zusammentragen",
          position: 0,
          completed_at: new Date().toISOString(),
        },
        {
          user_id: userId,
          task_id: visualTask.id,
          title: "Fokusfenster und Erholung einplanen",
          position: 1,
        },
      ])
    ).error,
  ).toBeNull();

  const visualDate = today;
  await page.goto("/tasks/" + visualTask.id);
  const visualIdentity = page.locator('[data-task-order="identity"]');
  const visualGuidance = guidance("Dein nächster Schritt");
  const visualContext = taskContext();
  const visualWork = page.locator('[data-task-order="work"]');
  const visualPrerequisite = page.locator(
    '[data-task-order="prerequisite"]',
  );
  const visualPlanning = page.locator('[data-task-order="planning"]');
  await expect(visualIdentity).toContainText("Geplant");
  await expect(visualIdentity).toContainText("Bereit");
  await expect(visualIdentity).toContainText("P1");
  await expect(visualContext).toContainText(visualProject.title);
  await expect(visualContext).toContainText(visualMilestone.title);
  await expect(visualContext).toContainText(visualGoal.title);
  await expect(visualWork).toContainText(visualTaskDescription.split("\n\n")[0]);
  await expect(visualWork).toContainText(
    "Vorhandene Termine und verfügbare Fokusfenster",
  );
  await expect(visualWork).toContainText("1 von 2 erledigt");
  const visualSteps = visualWork.getByRole("list").getByRole("listitem");
  await expect(visualSteps.nth(0)).toContainText(
    "Feste Termine und Verpflichtungen zusammentragen",
  );
  await expect(visualSteps.nth(0)).toContainText("Erledigt");
  await expect(visualSteps.nth(1)).toContainText(
    "Fokusfenster und Erholung einplanen",
  );
  await expect(visualSteps.nth(1)).toContainText("Offen");
  await expect(
    visualWork.getByRole("button", { name: "Schritt speichern", exact: true }),
  ).toHaveCount(0);
  await expect(
    visualWork.getByRole("button", {
      name: "Arbeitsschritte verwalten",
      exact: true,
    }),
  ).toBeVisible();
  await expect(visualPrerequisite).toContainText("1 Vorgänger · erfüllt");
  await expect(
    visualPrerequisite.getByRole("link", {
      name: visualPredecessor.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(visualPlanning).toContainText("09:30–10:15");
  await expect(visualPlanning).toContainText("45 Minuten · Europe/Berlin");
  await expect(visualGuidance).toHaveAttribute(
    "data-task-guidance",
    "Geplanten Termin öffnen",
  );

  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [surface, url] of [
      ["task", `/tasks/${visualTask.id}`],
      ["project", `/projects/${visualProject.id}`],
      [
        "calendar",
        `/calendar?task=${visualTask.id}&date=${visualDate}&view=day`,
      ],
    ]) {
      await page.goto(url);
      const surfaceReady =
        surface === "task"
          ? page.locator('[data-task-detail-variant="B"]')
          : surface === "project"
            ? page.getByRole("heading", {
                name: visualProject.title,
                exact: true,
              })
            : page.getByRole("heading", { name: "Calendar", exact: true });
      await expect(surfaceReady).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      if (surface === "task") {
        await expect(
          page.locator('[data-task-detail-variant="B"]'),
        ).toBeVisible();
        await expect(page.locator("[data-task-guidance]")).toHaveCount(1);
        const orderedSections = await page
          .locator('[data-task-order]')
          .evaluateAll((elements) =>
            elements.map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                bottom: rect.bottom,
                order: element.getAttribute("data-task-order"),
                top: rect.top,
                width: rect.width,
              };
            }),
          );
        expect(orderedSections.map((item) => item.order)).toEqual([
          "identity",
          "guidance",
          "context",
          "work",
          "prerequisite",
          "planning",
          "return",
        ]);
        if (width === 390)
          for (let index = 1; index < orderedSections.length; index += 1)
            expect(orderedSections[index].top).toBeGreaterThanOrEqual(
              orderedSections[index - 1].bottom,
            );
        if (width >= 1920)
          expect(orderedSections[0].width).toBeGreaterThan(1280);
      }
      if (surface === "task" && width === 390) {
        await page.getByRole("link", { name: "Inhalt", exact: true }).click();
        await expect(
          page.getByRole("link", {
            name: "Geplanten Termin öffnen",
            exact: true,
          }),
        ).toBeInViewport();
      }
      const path = info.outputPath(`issue-58-${surface}-${width}.png`);
      await page.screenshot({
        path,
        fullPage: surface !== "task",
        caret: "initial",
      });
      await info.attach(`issue-58-${surface}-${width}`, {
        path,
        contentType: "image/png",
      });
      if (surface === "task") {
        const fullPagePath = info.outputPath(
          `issue-58-task-${width}-full.png`,
        );
        await page.screenshot({
          path: fullPagePath,
          fullPage: true,
          caret: "initial",
        });
        await info.attach(`issue-58-task-${width}-full`, {
          path: fullPagePath,
          contentType: "image/png",
        });
      }
    }
  }
  expect(errors).toEqual([]);
});
