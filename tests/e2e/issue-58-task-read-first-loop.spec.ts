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
    page.getByRole("region", {
      name: "Project und Goal Kontext",
      exact: true,
    });
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
  await expect(
    page.getByText("Lifecycle: Planned", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Task Identity", exact: true })
      .getByText("Dependency Readiness: READY", { exact: true }),
  ).toBeVisible();
  await expect(taskContext()).toContainText(emptyProject.title);
  await expect(taskContext()).toContainText(activeMilestone.title);
  await expect(taskContext()).toContainText(goal.title);
  await expect(
    taskContext().getByRole("link", { name: goal.title, exact: true }),
  ).toHaveAttribute("href", `/goals/${goal.id}`);
  const planning = page.getByRole("region", {
    name: "Task Planning",
    exact: true,
  });
  await expect(planning).toContainText("Tagesabsicht");
  await expect(planning).toContainText("Time Block");
  await expect(planning).toContainText("Deadline");
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
    name: "Task bearbeiten",
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
    name: "Lifecycle verwalten",
    exact: true,
  });
  await lifecycleTrigger.click();
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
  await expect(
    page.getByText("Lifecycle: Inbox", { exact: true }),
  ).toBeVisible();
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
    name: "Task bearbeiten",
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
  await expect(
    page.getByText("Lifecycle: Planned", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Task Identity", exact: true })
      .getByText("Dependency Readiness: BLOCKED", { exact: true }),
  ).toBeVisible();
  await expect(guidance("Dein nächster Schritt")).toHaveAttribute(
    "data-task-guidance",
    "Blocker prüfen",
  );
  const dependencies = page.getByRole("region", {
    name: "Task Dependencies",
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
  await expect(dependencies).toContainText("erfüllt");
  await expect(dependencies).toContainText("BLOCKED");

  await page.goto(`/tasks/${waitingAllBlocked.id}`);
  const waitingIdentity = page.getByRole("region", {
    name: "Task Identity",
    exact: true,
  });
  await expect(waitingIdentity).toContainText("Lifecycle: Wartend");
  await expect(waitingIdentity).toContainText("Dependency Readiness: READY");
  await expect(guidance("Dein nächster Schritt")).toHaveAttribute(
    "data-task-guidance",
    "Warte-Status einordnen",
  );

  await page.goto(`/tasks/${allBlockedOne.id}`);
  const singleBlockedIdentity = page.getByRole("region", {
    name: "Task Identity",
    exact: true,
  });
  await expect(singleBlockedIdentity).toContainText("Lifecycle: Planned");
  await expect(singleBlockedIdentity).toContainText(
    "Dependency Readiness: BLOCKED",
  );
  await expect(
    page
      .getByRole("region", { name: "Task Dependencies", exact: true })
      .getByRole("link", { name: waitingAllBlocked.title, exact: true }),
  ).toBeVisible();

  await page.goto(`/tasks/${activeTask.id}`);
  await expect(
    page.getByText("Lifecycle: Active / In Progress", { exact: true }),
  ).toBeVisible();
  await expect(guidance("Dein nächster Schritt")).toHaveAttribute(
    "data-task-guidance",
    "Arbeit fortsetzen",
  );
  await expect(
    page.getByRole("region", { name: "Task Planning", exact: true }),
  ).toContainText(
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${today}T12:00:00Z`)),
  );
  await expect(
    page.getByRole("region", { name: "Task Planning", exact: true }),
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
    name: "Task bearbeiten",
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

  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [surface, url] of [
      ["task", `/tasks/${createdTask.id}`],
      ["project", `/projects/${emptyProject.id}`],
      [
        "calendar",
        `/calendar?task=${createdTask.id}&date=${calendarUrl.searchParams.get("date")}&view=day`,
      ],
    ]) {
      await page.goto(url);
      const surfaceReady =
        surface === "task"
          ? page.locator('[data-task-detail-variant="B"]')
          : surface === "project"
            ? page.getByRole("heading", {
                name: emptyProject.title,
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
        const orderedSections = await page
          .locator(
            '[data-task-detail-variant="B"] > header, [data-task-detail-variant="B"] > section',
          )
          .evaluateAll((elements) =>
            elements.map((element) => {
              const rect = element.getBoundingClientRect();
              return { bottom: rect.bottom, top: rect.top };
            }),
          );
        for (let index = 1; index < orderedSections.length; index += 1)
          expect(orderedSections[index].top).toBeGreaterThanOrEqual(
            orderedSections[index - 1].bottom,
          );
      }
      const path = info.outputPath(`issue-58-${surface}-${width}.png`);
      await page.screenshot({ path, fullPage: true, caret: "initial" });
      await info.attach(`issue-58-${surface}-${width}`, {
        path,
        contentType: "image/png",
      });
    }
  }
  expect(errors).toEqual([]);
});
