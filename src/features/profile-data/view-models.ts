import "server-only";

import {
  buildCalendarTimedBlocks,
  getCalendarViewModel as getDemoCalendarViewModel,
} from "@/features/calendar/calendar-view-model";
import {
  calendarFilters,
  calendarHours,
  calendarViewSwitches,
} from "@/features/calendar/calendar-mock-data";
import type {
  CalendarAllDayBlockViewModel,
  CalendarDayViewModel,
  CalendarTimedBlockViewModel,
  CalendarViewModel,
} from "@/features/calendar";
import { getDashboardViewModel as getDemoDashboardViewModel } from "@/features/dashboard/dashboard-view-model";
import type {
  DashboardAccent,
  DashboardAgendaEvent,
  DashboardArea,
  DashboardPortfolioItem,
  DashboardPriority,
  DashboardViewModel,
} from "@/features/dashboard";
import { entityCollection as demoEntityCollection } from "@/features/entities/mock-entity-data";
import type {
  EntityArea,
  EntityCollection,
  EntityPriority,
  LifeSkill,
  LifeGoal,
  LifeProject,
  LifeTask,
  TaskStatus,
} from "@/features/entities/types";
import {
  createManualGoal,
  createManualInboxItem,
  createManualProject,
  createManualTask,
  readManualProfile,
  resetManualProfile as resetManualProfileFile,
} from "./manual-profile-store";
import { getInboxViewModel as getDemoInboxViewModel } from "@/features/inbox/inbox-view-model";
import type {
  InboxQueueItem,
  InboxStage,
  InboxViewModel,
} from "@/features/inbox";
import {
  getMentalHealthViewModel as getDemoMentalHealthViewModel,
  type MentalHealthPageViewModel,
} from "@/features/health/mental-health-view-model";
import { getTodayViewModel as getDemoTodayViewModel } from "@/features/today/today-view-model";
import type {
  TodayActivityEventViewModel,
  TodayViewModel,
} from "@/features/today";
import {
  getCurrentLifeOsProfileId,
  getLifeOsProfileSummary,
} from "./profile-cookie";
import { getPortfolioViewModel as getDemoPortfolioViewModel } from "@/features/portfolio/portfolio-view-model";
import type {
  PortfolioDecision,
  PortfolioEntity,
  PortfolioFocusLevel,
  PortfolioPriority,
  PortfolioStatus,
  PortfolioViewModel,
} from "@/features/portfolio";
import type {
  CreateGoalInput,
  CreateInboxItemInput,
  CreateProjectInput,
  CreateTaskInput,
  LifeOsDataSource,
  LifeOsProfileId,
  ManualInboxItem,
  ManualProfileData,
} from "./types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptyManualProfile(): ManualProfileData {
  return {
    version: 1,
    updatedAt: null,
    tasks: [],
    projects: [],
    goals: [],
    inboxItems: [],
  };
}

async function getProfileData(profileId: LifeOsProfileId) {
  return profileId === "manual" ? readManualProfile() : emptyManualProfile();
}

function areaLabel(area: EntityArea) {
  if (area === "review") return "Review";
  return `${area.charAt(0).toUpperCase()}${area.slice(1)}`;
}

function areaAccent(area: EntityArea): DashboardAccent {
  if (area === "work") return "var(--accent-green)";
  if (area === "health") return "var(--accent-red)";
  if (area === "nutrition") return "var(--accent-yellow)";
  if (area === "personal") return "var(--accent-purple)";
  if (area === "review" || area === "system") return "var(--accent-cyan)";
  return "var(--accent-blue)";
}

function profileTitle(profileId: LifeOsProfileId) {
  return profileId === "manual" ? "Manual local profile" : "Empty profile";
}

function dashboardPriority(priority: EntityPriority): DashboardPriority {
  return priority === "none" ? "P3" : priority;
}

function boundedProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function minutesFromTime(value?: string) {
  if (!value) return null;
  const [hours = "0", minutes = "0"] = value.split(":");
  const total = Number(hours) * 60 + Number(minutes);
  return Number.isFinite(total) ? total : null;
}

function timeFromMinutes(value: number) {
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function taskEndTime(task: LifeTask) {
  const start = minutesFromTime(task.startTime);
  if (start === null) return null;
  return timeFromMinutes(start + (task.durationMinutes ?? 30));
}

function taskDurationLabel(task: LifeTask) {
  return `${task.durationMinutes ?? 30} min`;
}

function taskStatusLabel(task: LifeTask) {
  if (task.status === "active") return "Active";
  if (task.status === "done") return "Done";
  if (task.status === "waiting") return "Blocked";
  if (task.status === "inbox") return "Inbox";
  return "Planned";
}

function taskAgendaStatus(task: LifeTask): DashboardAgendaEvent["status"] {
  if (task.status === "active") return "active";
  if (task.status === "done") return "done";
  if (task.status === "waiting") return "blocked";
  return "planned";
}

function taskToAgendaEvent(
  task: LifeTask,
  index: number,
): DashboardAgendaEvent {
  const endTime = taskEndTime(task);
  const priority = dashboardPriority(task.priority);
  const accent = areaAccent(task.areaId);

  return {
    id: task.id,
    title: task.title,
    time: `${task.startTime ?? "Flexible"}${
      endTime ? `-${endTime}` : ""
    } · ${taskDurationLabel(task)}`,
    note: task.description || task.nextStep,
    areaLabel: areaLabel(task.areaId),
    type: "task",
    typeLabel: "Task",
    status: taskAgendaStatus(task),
    statusLabel: taskStatusLabel(task),
    relevanceLabel: priority,
    nextAction: task.nextStep,
    attentionLabel: task.reviewNeeded ? "Review needed" : undefined,
    tags: [areaLabel(task.areaId), task.energy ?? "medium"],
    accent,
    area: task.areaId as DashboardArea,
    energy: task.energy ?? "medium",
    priority,
    active: task.status === "active",
    strong: priority === "P0" || priority === "P1",
    tall: index === 0 && (task.durationMinutes ?? 30) >= 60,
    href: `/tasks/${task.id}`,
  };
}

function taskToQueueItem(task: LifeTask) {
  return {
    id: task.id,
    title: task.title,
    meta: `${task.date ?? "unscheduled"} · ${
      task.startTime ?? "flexible"
    } · ${taskDurationLabel(task)}`,
    tag: task.priority === "none" ? "Task" : task.priority,
    area: task.areaId as DashboardArea,
    href: `/tasks/${task.id}` as `/${string}`,
  };
}

function taskToCurrentTask(task: LifeTask) {
  const endTime = taskEndTime(task);

  return {
    id: task.id,
    sectionLabel: "Current Task",
    timeRemainingLabel: task.startTime
      ? `${task.startTime}${endTime ? `-${endTime}` : ""}`
      : "Flexible block",
    statusLabel: taskStatusLabel(task),
    title: task.title,
    contextLabel: `${areaLabel(task.areaId)} · ${task.priority}`,
    actionLabel: "Open task",
    progress: task.status === "done" ? 100 : task.status === "active" ? 42 : 0,
    accent: areaAccent(task.areaId),
    area: task.areaId as DashboardArea,
    href: `/tasks/${task.id}` as `/${string}`,
  };
}

function projectToPortfolioItem(project: LifeProject): DashboardPortfolioItem {
  return {
    id: project.id,
    title: project.title,
    label: areaLabel(project.areaId),
    next: project.nextStep,
    meta: project.deadline ? `Due ${project.deadline}` : project.phase,
    progress: boundedProgress(project.progress),
    accent: areaAccent(project.areaId),
    area: project.areaId as DashboardArea,
    kind: "project",
    href: `/projects/${project.id}`,
  };
}

function goalToPortfolioItem(goal: LifeGoal): DashboardPortfolioItem {
  return {
    id: goal.id,
    title: goal.title,
    label: areaLabel(goal.areaId),
    next: goal.nextStep,
    meta: goal.horizon,
    progress: boundedProgress(goal.progress),
    accent: areaAccent(goal.areaId),
    area: goal.areaId as DashboardArea,
    kind: "goal",
    href: `/goals/${goal.id}`,
  };
}

function portfolioPriority(priority: EntityPriority): PortfolioPriority {
  if (priority === "P0" || priority === "P1") return "P1";
  if (priority === "P2") return "P2";
  if (priority === "P3") return "P3";
  return "none";
}

function portfolioFocusLevel(priority: EntityPriority): PortfolioFocusLevel {
  if (priority === "P0" || priority === "P1") return "high";
  if (priority === "P2") return "medium";
  return "low";
}

function taskPortfolioStatus(status: TaskStatus): PortfolioStatus {
  if (status === "active") return "active";
  if (status === "waiting") return "blocked";
  if (status === "done" || status === "canceled") return "done";
  return "planned";
}

function dueRankFromDate(value?: string) {
  return value ? 1 : 3;
}

function relation(label: string, value?: string) {
  return value ? [{ label, value }] : [];
}

function taskToPortfolioEntity(task: LifeTask, index: number): PortfolioEntity {
  const blocked = task.status === "waiting";

  return {
    id: task.id,
    type: "task",
    title: task.title,
    description: task.description,
    area: task.areaId,
    status: taskPortfolioStatus(task.status),
    priority: portfolioPriority(task.priority),
    focusLevel: portfolioFocusLevel(task.priority),
    nextAction: task.nextStep,
    dueLabel: task.date ?? "No date",
    dueRank: dueRankFromDate(task.date),
    progress: task.status === "done" ? 100 : task.status === "active" ? 42 : 0,
    countLabel: `${task.durationMinutes ?? 30} min`,
    lastTouched: "today",
    recentRank: index + 1,
    reviewNeeded: task.reviewNeeded,
    blocked,
    relations: [
      ...relation("Project", task.projectId),
      ...relation("Goal", task.goalId),
      ...relation("Skill", task.skillId),
    ],
    decisions: blocked
      ? [
          {
            title: "Resolve waiting state",
            detail: task.nextStep,
            state: "blocked",
          },
        ]
      : [],
    sourceLinks: [{ label: "Task", href: `/tasks/${task.id}` }],
    noteSnippet: task.resultNote ?? task.description,
  };
}

function projectPortfolioStatus(project: LifeProject): PortfolioStatus {
  if (project.status === "active") return "active";
  if (project.status === "blocked") return "blocked";
  if (project.status === "completed" || project.status === "archived") {
    return "done";
  }
  return "planned";
}

function projectToPortfolioEntity(
  project: LifeProject,
  index: number,
): PortfolioEntity {
  const blocked = Boolean(project.blocker) || project.status === "blocked";
  const decisions: PortfolioDecision[] = blocked
    ? [
        {
          title: "Project blocker",
          detail: project.blocker ?? project.nextStep,
          state: "blocked",
        },
      ]
    : [];

  return {
    id: project.id,
    type: "project",
    title: project.title,
    description: project.description,
    area: project.areaId,
    status: projectPortfolioStatus(project),
    priority: portfolioPriority(project.priority),
    focusLevel: project.focusThisWeek
      ? "high"
      : portfolioFocusLevel(project.priority),
    nextAction: project.nextStep,
    dueLabel: project.deadline ?? "No deadline",
    dueRank: dueRankFromDate(project.deadline),
    progress: boundedProgress(project.progress),
    countLabel: `${project.taskIds.length} tasks`,
    lastTouched: "today",
    recentRank: index + 1,
    reviewNeeded: false,
    blocked,
    relations: [
      ...relation("Goal", project.goalId),
      { label: "Phase", value: project.phase },
    ],
    decisions,
    sourceLinks: [{ label: "Project", href: `/projects/${project.id}` }],
    noteSnippet: project.risk ?? project.description,
  };
}

function goalPortfolioStatus(goal: LifeGoal): PortfolioStatus {
  if (goal.status === "active") return "active";
  if (goal.status === "achieved" || goal.status === "archived") return "done";
  return "planned";
}

function goalToPortfolioEntity(goal: LifeGoal, index: number): PortfolioEntity {
  return {
    id: goal.id,
    type: "goal",
    title: goal.title,
    description: goal.description,
    area: goal.areaId,
    status: goalPortfolioStatus(goal),
    priority: "P1",
    focusLevel: goal.progress >= 50 ? "medium" : "high",
    nextAction: goal.nextStep,
    dueLabel: goal.horizon,
    dueRank: goal.horizon === "week" || goal.horizon === "month" ? 1 : 2,
    progress: boundedProgress(goal.progress),
    countLabel: `${goal.linkedProjectIds.length} projects`,
    lastTouched: "today",
    recentRank: index + 1,
    reviewNeeded: goal.reviewNotes.length > 0,
    blocked: false,
    relations: [
      { label: "Measure", value: goal.measure },
      { label: "Target", value: goal.targetValue },
    ],
    decisions: [],
    sourceLinks: [{ label: "Goal", href: `/goals/${goal.id}` }],
    noteSnippet: goal.why,
  };
}

function skillToPortfolioEntity(
  skill: LifeSkill,
  index: number,
): PortfolioEntity {
  return {
    id: skill.id,
    type: "skill",
    title: skill.title,
    description: skill.description,
    area: skill.areaId,
    status: skill.status === "paused" ? "planned" : "practicing",
    priority: "P2",
    focusLevel: skill.progress >= 65 ? "medium" : "low",
    nextAction: skill.nextPractice,
    dueLabel: skill.practiceFrequency,
    dueRank: skill.practiceFrequency ? 2 : 3,
    progress: boundedProgress(skill.progress),
    countLabel: `${skill.learningPath.length} steps`,
    lastTouched: skill.lastPracticedAt || "not practiced",
    recentRank: index + 1,
    reviewNeeded: false,
    blocked: false,
    relations: [
      { label: "Current", value: skill.currentLevel },
      { label: "Target", value: skill.targetLevel },
    ],
    decisions: [],
    sourceLinks: [{ label: "Skill", href: `/skills/${skill.id}` }],
    noteSnippet: skill.description,
    skillContext: {
      practiceStatus: skill.status,
      confidence:
        skill.progress >= 70 ? "high" : skill.progress >= 35 ? "medium" : "low",
      nextSession: skill.nextPractice,
      evidence: `${skill.evidence.length} evidence records`,
    },
  };
}

function collectionToPortfolioEntities(collection: EntityCollection) {
  return [
    ...collection.tasks.map(taskToPortfolioEntity),
    ...collection.projects.map(projectToPortfolioEntity),
    ...collection.goals.map(goalToPortfolioEntity),
    ...collection.skills.map(skillToPortfolioEntity),
  ];
}

function buildProfilePortfolioViewModel(
  profileId: LifeOsProfileId,
  collection: EntityCollection,
): PortfolioViewModel {
  const entityCount =
    collection.tasks.length +
    collection.projects.length +
    collection.goals.length +
    collection.skills.length;

  return getDemoPortfolioViewModel(collectionToPortfolioEntities(collection), {
    summary:
      profileId === "manual"
        ? "Lokale Tasks, Projekte und Ziele aus dem Manual Local Profile steuern. Demo-Fixtures bleiben ausgeblendet."
        : "Leere Portfolio-Struktur ohne Demo-Tasks, Demo-Projekte, Demo-Ziele oder Demo-Skills.",
    dateRange:
      profileId === "manual"
        ? `${entityCount} local entities`
        : "0 local entities",
    pageType: "Portfolio / Profile-aware Entity Workbench",
    canonicalSource:
      profileId === "manual"
        ? "Portfolio reads the local Manual profile entity collection. It does not duplicate demo fixtures."
        : "Portfolio reads the Empty profile entity collection. Demo fixtures are disabled outside the Demo profile.",
  });
}

function buildProfileMentalHealthViewModel(
  profileId: LifeOsProfileId,
): MentalHealthPageViewModel {
  const profileLabel = profileTitle(profileId);

  return {
    header: {
      breadcrumb: ["Life OS", "Health & Fitness", "Mental Health"],
      title: "Mental Health",
      subtitle:
        "Self-checks, mood patterns and routines without labels or pressure.",
      pills: [
        { label: "Self-check only", accent: "var(--accent-purple)" },
        { label: profileLabel, accent: "var(--accent-cyan)" },
        { label: "Noch leer", accent: "var(--accent-green)" },
      ],
      signal: {
        label: "Local signal",
        value: "Noch kein Eintrag",
        detail: "Lokales Profil",
        accent: "var(--accent-purple)",
        progress: 0,
        progressLabel: "kein Check-in erfasst",
      },
    },
    checkIn: {
      title: "Today Check-In",
      subtitle: "Capture the signal, then choose the smallest useful repair.",
      badge: "Primary action",
      messageTitle: "Noch kein Check-in",
      message:
        "Erfasse spaeter einen kurzen lokalen Check-in, um diese Card zu fuellen.",
      items: [],
      nextRepair: {
        label: "Next repair",
        value: "Noch keine Repair-Routine ausgewaehlt.",
      },
      actionLabel: "Open check-in",
    },
    moodPattern: {
      title: "Local Signal Pattern",
      subtitle:
        "Show your tendency in text. Color is always paired with label.",
      rangeLabel: "7 days",
      moods: [],
      interpretation: "Noch kein Stimmungsverlauf erfasst.",
    },
    currentSignal: {
      title: "Current Signal",
      subtitle: "What needs review, without turning the page into analytics.",
      metrics: [],
      interpretation: {
        label: "Signal interpretation",
        value: "Noch kein Signal fuer eine Interpretation.",
        detail: "Erfasse zuerst einen Check-in, bevor ein Muster entsteht.",
      },
      nextStep: {
        label: "Next step",
        value:
          "Check-in erfassen, sobald lokale Mental-Health-Daten aktiv sind.",
        detail: "Bis dahin bleibt die Shell ohne Demo-Inhalte sichtbar.",
      },
    },
    sleepRecovery: {
      title: "Sleep & Recovery",
      subtitle: "Sleep rhythm as context for mood and focus.",
      metrics: [],
      bars: [],
      tonightCue: {
        label: "Tonight cue",
        value: "Noch kein Abend-Cue gespeichert.",
        detail: "Lokale Mental-Health-Daten sind noch leer.",
      },
    },
    journalRhythm: {
      title: "Journal / Reflection Rhythm",
      subtitle: "Small reflection loops, not a second inbox.",
      value: "0 / 7 days",
      pattern: [],
      focus: {
        label: "Reflection focus",
        value: "Noch kein Reflexionsfokus gespeichert.",
      },
      lastReflection: {
        label: "Last reflection",
        value: "Noch keine Reflexion erfasst.",
        detail: "Journal-Eintraege werden spaeter in diese Seite projiziert.",
      },
      prompt: {
        label: "Daily prompt",
        value: "Lokalen Journal-Eintrag erfassen, sobald die Quelle aktiv ist.",
        detail: "Die Page Shell bleibt stabil, solange die Daten leer sind.",
      },
      actionLabel: "Open Journal",
      href: "/life/journal",
    },
    repairRoutines: {
      title: "Local Support Routines",
      subtitle: "Predefined actions to avoid overthinking when signals rise.",
      routines: [],
      recommendedToday: {
        label: "Recommended today",
        value: "Noch keine Empfehlung ohne lokale Signale.",
        detail: "Demo recommendations stay limited to the Demo profile.",
      },
    },
    actions: {
      title: "Mental Health Actions",
      subtitle: "Today - choose the smallest viable repair.",
      badge: "Today",
      items: [],
      decisionRule: {
        label: "Decision rule",
        value: "Do not interpret empty data as a personal signal.",
        detail:
          "R1.2 preserves the page shell and waits for local mental-health entries.",
        progress: 0,
        progressLabel: "keine lokalen Eintraege",
      },
      todayHref: "/today",
      todayLabel: "Open Today",
      journalHref: "/life/journal",
      journalLabel: "Open Journal",
    },
    safety: {
      title: "Safety & Boundaries",
      subtitle:
        "This page surfaces patterns and small actions. It does not rank your mind or turn signals into care claims.",
      items: [
        {
          title: "Self-check only",
          detail: "Personal signal capture, not assessment.",
          accent: "var(--accent-purple)",
        },
        {
          title: "No condition labels",
          detail: "No severity claims or identity framing.",
          accent: "var(--accent-cyan)",
        },
        {
          title: "No shame mechanics",
          detail: "Missed routines are context, not failure.",
          accent: "var(--accent-green)",
        },
        {
          title: "Trend-aware routines",
          detail: "Patterns lead to small repair actions.",
          accent: "var(--accent-orange)",
        },
      ],
    },
  };
}

function buildProfileDashboardViewModel(
  profileId: LifeOsProfileId,
  profile: ManualProfileData,
): DashboardViewModel {
  const viewModel = clone(getDemoDashboardViewModel());
  const tasks = profile.tasks;
  const inboxItems = profile.inboxItems;
  const scheduledTasks = tasks
    .filter((task) => task.startTime)
    .sort((left, right) =>
      `${left.date ?? ""}${left.startTime ?? ""}`.localeCompare(
        `${right.date ?? ""}${right.startTime ?? ""}`,
      ),
    );
  const activeTask =
    tasks.find((task) => task.status === "active") ??
    scheduledTasks[0] ??
    tasks[0] ??
    null;
  const doneTaskCount = tasks.filter((task) => task.status === "done").length;
  const focusMinutes = tasks.reduce(
    (sum, task) => sum + (task.startTime ? (task.durationMinutes ?? 30) : 0),
    0,
  );
  const profileLabel = profileTitle(profileId);

  viewModel.commandCenter.commandCenter = {
    ...viewModel.commandCenter.commandCenter,
    greeting: profileLabel,
    dateLabel: "Local profile data source",
    dayTypeLabel:
      profileId === "manual"
        ? "Manual entries only"
        : "No entries stored locally",
    metrics: [
      {
        label: "Tasks",
        value: `${doneTaskCount} / ${tasks.length}`,
        detail: tasks.length > 0 ? "manual tasks" : "no tasks yet",
        progress: tasks.length > 0 ? (doneTaskCount / tasks.length) * 100 : 0,
        accent: "var(--accent-blue)",
        area: "review",
        href: "/tasks?filter=all",
      },
      {
        label: "Focus Time",
        value: `${focusMinutes}m`,
        detail:
          focusMinutes > 0 ? "scheduled manually" : "no focus block planned",
        progress: Math.min(100, (focusMinutes / 180) * 100),
        accent: "var(--accent-blue)",
        area: "education",
        href: "/calendar",
      },
      {
        label: "Inbox",
        value: `${inboxItems.length} open`,
        detail: inboxItems.length > 0 ? "manual captures" : "no inbox entries",
        progress: Math.min(100, inboxItems.length * 18),
        accent: "var(--accent-green)",
        area: "review",
        href: "/inbox",
      },
      {
        label: "Nutrition",
        value: "0",
        detail: "no meals captured",
        progress: 0,
        accent: "var(--accent-yellow)",
        area: "nutrition",
        href: "/nutrition/meal-planner?view=today",
      },
      {
        label: "Review Status",
        value: "No review",
        detail: "manual profile only",
        progress: 0,
        accent: "var(--accent-cyan)",
        area: "review",
        href: "/review/daily",
      },
      {
        label: "Sleep",
        value: "Noch leer",
        detail: "Health-Daten spaeter",
        progress: 0,
        accent: "var(--accent-blue)",
        area: "health",
        href: "/health/mental?section=sleep",
      },
    ],
    moodCheck: {
      ...viewModel.commandCenter.commandCenter.moodCheck,
      moodLabel: "Not logged",
      detail: "noch kein Mood-Eintrag",
      progressLabel: "Manual profile",
      scoreLabel: "0 / 10",
      progress: 0,
      activeOption: "Calm",
    },
    timeProgress: [
      {
        label: "Profile",
        value: profileId === "manual" ? "manual" : "empty",
        progress: profileId === "manual" ? 100 : 0,
      },
      {
        label: "Tasks",
        value: String(tasks.length),
        progress: Math.min(100, tasks.length * 12),
      },
      {
        label: "Inbox",
        value: String(inboxItems.length),
        progress: Math.min(100, inboxItems.length * 20),
      },
    ],
    weather: {
      temperatureLabel: "Kein Wetter",
      periodLabel: "Manual",
      conditionLabel: "not connected",
    },
  };

  viewModel.commandCenter.dailyControl = {
    ...viewModel.commandCenter.dailyControl,
    subtitle: "Local profile task state",
    focus: activeTask
      ? {
          label: "Tagesfokus",
          title: activeTask.title,
          detail: activeTask.description,
          blockLabel: activeTask.startTime ? "Fokusblock" : "Flexible Aufgabe",
          block: activeTask.startTime
            ? `${activeTask.startTime}${
                taskEndTime(activeTask) ? `-${taskEndTime(activeTask)}` : ""
              } · ${taskDurationLabel(activeTask)}`
            : "ohne Uhrzeit",
        }
      : {
          label: "Tagesfokus",
          title: "Noch keine Tagesstruktur",
          detail: "Lege 1-3 Aufgaben fuer heute an.",
          blockLabel: "Fokusblock",
          block: "nicht geplant",
        },
    nextStep: activeTask
      ? {
          label: "Nächster Schritt",
          title: activeTask.nextStep,
          detail: "Aus dem Manual Local Profile",
        }
      : {
          label: "Nächster Schritt",
          title: "Erste Aufgabe anlegen",
          detail: "Manual Profile oder Inbox nutzen.",
        },
    currentTask: activeTask
      ? taskToCurrentTask(activeTask)
      : {
          id: "empty-current-task",
          sectionLabel: "Current Task",
          timeRemainingLabel: "Kein Block gewaehlt",
          statusLabel: "Empty",
          title: "Noch keine aktive Aufgabe",
          contextLabel: "Lege eine Aufgabe an",
          actionLabel: "Open tasks",
          progress: 0,
          accent: "var(--text-muted)",
          area: "review",
          href: "/tasks",
        },
    signals: [
      {
        kind: "energy",
        label: "Energy",
        value: "Not logged",
        detail: "manual profile",
        accent: "var(--text-muted)",
      },
      {
        kind: "inbox",
        label: "Inbox",
        value: `${inboxItems.length} open`,
        detail: "local entries",
        accent: "var(--accent-green)",
      },
      {
        kind: "review",
        label: "Review",
        value: "Open",
        detail: "not wired",
        accent: "var(--accent-cyan)",
      },
    ],
    queueSummary: `${Math.max(0, tasks.length - (activeTask ? 1 : 0))} queued`,
    queue: tasks
      .filter((task) => task.id !== activeTask?.id)
      .slice(0, 3)
      .map(taskToQueueItem),
  };

  viewModel.todayAgenda = {
    ...viewModel.todayAgenda,
    preparedViewsLabel:
      profileId === "manual"
        ? "Manual tasks projected into the same agenda"
        : "Empty agenda state",
    events: scheduledTasks.slice(0, 9).map(taskToAgendaEvent),
  };

  viewModel.healthNutrition.weightLossGoal = {
    ...viewModel.healthNutrition.weightLossGoal,
    currentWeight: "- kg",
    targetLabel: "Noch kein Health-Ziel",
    remainingLabel: "not tracked",
    weeklyStatusLabel: "Empty",
    weeklyStatusAccent: "var(--text-muted)",
    progress: 0,
  };
  viewModel.healthNutrition.nutrientBalance = {
    ...viewModel.healthNutrition.nutrientBalance,
    lastUpdatedLabel: "No meals captured in this profile",
    items: [
      {
        label: "Protein",
        value: "0 / 0 g",
        status: "Under",
        progress: 0,
        accent: "var(--accent-red)",
        statusAccent: "var(--text-muted)",
      },
      {
        label: "Carbs",
        value: "0 / 0 g",
        status: "Under",
        progress: 0,
        accent: "var(--accent-blue)",
        statusAccent: "var(--text-muted)",
      },
      {
        label: "Fat",
        value: "0 / 0 g",
        status: "Under",
        progress: 0,
        accent: "var(--accent-yellow)",
        statusAccent: "var(--text-muted)",
      },
    ],
  };
  viewModel.healthNutrition.meals = {
    ...viewModel.healthNutrition.meals,
    items: [],
    recipeOptions: [],
  };
  viewModel.healthNutrition.runningRecovery = {
    ...viewModel.healthNutrition.runningRecovery,
    stats: [
      { label: "Distance", value: "0 km", delta: "no run" },
      { label: "Pace", value: "-", delta: "no data" },
      { label: "Time", value: "0m", delta: "no data" },
    ],
    rhythm: {
      title: "Noch keine Laufeinheit",
      detail: "Workout-Daten erscheinen nach der ersten lokalen Einheit.",
      progress: 0,
      statusLabel: "Empty",
      accent: "var(--text-muted)",
    },
    todayGoalLabel: "Today goal: not set",
    lastSyncLabel: "No health sync in this phase",
    muscle: {
      ...viewModel.healthNutrition.runningRecovery.muscle,
      title: "No strength session planned",
      detail: "Workout-Daten erscheinen nach der ersten lokalen Einheit.",
      focusGroups: [],
      nextStep: "Add workout later",
      statusLabel: "Planned",
    },
  };

  viewModel.habitTrackers = {
    ...viewModel.habitTrackers,
    totalSlotsLabel: "0 active habits",
    habitsByWindow: {
      Morning: [],
      Midday: [],
      Evening: [],
    },
  };
  viewModel.activePortfolio = {
    ...viewModel.activePortfolio,
    subtitle:
      profile.projects.length + profile.goals.length > 0
        ? "Manual projects and goals"
        : "No active projects or goals",
    items: [
      ...profile.projects.map(projectToPortfolioItem),
      ...profile.goals.map(goalToPortfolioItem),
    ],
  };
  viewModel.antiRotActions = {
    ...viewModel.antiRotActions,
    donePrompt: "No reset actions in this profile",
    actions: [],
  };
  viewModel.challengesRewardFocus = {
    ...viewModel.challengesRewardFocus,
    summary: "No challenges active",
    measurementLabel: "0 measurable",
    rewardFocus: "No reward focus",
    items: [],
  };

  return viewModel;
}

function inboxStageAccent(stage: InboxStage) {
  if (stage === "ready") return "var(--accent-green)";
  if (stage === "review") return "var(--accent-red)";
  if (stage === "clarify") return "var(--accent-orange)";
  return "var(--accent-blue)";
}

function manualInboxToQueueItem(
  item: ManualInboxItem,
  active: boolean,
): InboxQueueItem {
  return {
    id: item.id,
    title: item.title,
    stage: item.stage,
    type: item.type,
    next: item.next,
    age: item.age,
    note: item.note,
    accent: inboxStageAccent(item.stage),
    active,
  };
}

function buildProfileInboxViewModel(
  profile: ManualProfileData,
): InboxViewModel {
  const viewModel = clone(getDemoInboxViewModel());
  const queue = profile.inboxItems.map((item, index) =>
    manualInboxToQueueItem(item, index === 0),
  );
  const active = profile.inboxItems[0] ?? null;

  viewModel.signals = [
    {
      label: "Open",
      value: String(profile.inboxItems.length),
      sublabel: "manual",
      accent: "var(--accent-blue)",
    },
    {
      label: "Clarify",
      value: String(
        profile.inboxItems.filter((item) => item.stage === "clarify").length,
      ),
      sublabel: "need info",
      accent: "var(--accent-orange)",
    },
    {
      label: "Ready",
      value: String(
        profile.inboxItems.filter((item) => item.stage === "ready").length,
      ),
      sublabel: "exit clear",
      accent: "var(--accent-green)",
    },
    {
      label: "Review",
      value: String(
        profile.inboxItems.filter((item) => item.stage === "review").length,
      ),
      sublabel: "last step",
      accent: "var(--accent-red)",
    },
  ];
  viewModel.queue = queue;
  viewModel.activeItem = {
    title: active?.title ?? "No inbox item selected",
    stage: "Clarify",
    type: "Question",
    originalCapture: active?.note ?? "No manual inbox entries yet.",
    source: "Manual Local Profile",
    fields: [
      {
        label: "Clean Title",
        value: active?.title ?? "No inbox item",
      },
      {
        label: "Description / Context",
        value: active?.note ?? "Create a manual inbox item to start triage.",
      },
      {
        label: "Next Action",
        value: active?.next ?? "Capture the first item.",
      },
      {
        label: "Missing Info",
        value: active ? "Choose an outcome route." : "Noch kein Eintrag.",
      },
    ],
    planningSignals: [
      {
        label: "Area",
        value: active ? areaLabel(active.areaId) : "None",
        source: "Manual",
        accent: active ? areaAccent(active.areaId) : "var(--text-muted)",
      },
    ],
  };
  viewModel.aiAssistant = {
    ...viewModel.aiAssistant,
    description: "No AI or remote processing runs in the manual local profile.",
    planning: [],
    outcomes: [],
  };
  viewModel.checklist = {
    ...viewModel.checklist,
    progress: active ? "1 / 6 ready" : "0 / 6 ready",
    items: [
      {
        label: active ? "Manual capture exists" : "No manual capture",
        state: active ? "done" : "missing",
      },
      {
        label: "Outcome route selected",
        state: "missing",
      },
    ],
  };
  viewModel.relatedContext = {
    ...viewModel.relatedContext,
    items: [],
  };

  return viewModel;
}

function taskToTodayEvent(task: LifeTask): TodayActivityEventViewModel {
  return {
    id: `today-${task.id}`,
    timeLabel: task.startTime ?? "Task",
    dateTime: task.startTime,
    status:
      task.status === "done"
        ? "completed"
        : task.status === "active"
          ? "current"
          : "planned",
    statusLabel: taskStatusLabel(task).toLowerCase(),
    eventType: "task",
    eventTypeLabel: "Task",
    title: task.title,
    description: task.description,
    sourceLabel: "Tasks",
    areaLabel: areaLabel(task.areaId),
    linkedEntityType: "task",
    linkedEntityId: task.id,
    sourceHref: `/tasks/${task.id}`,
    sourceActionLabel: "Open source",
    accent: areaAccent(task.areaId),
  };
}

function inboxToTodayEvent(item: ManualInboxItem): TodayActivityEventViewModel {
  return {
    id: `today-${item.id}`,
    timeLabel: "Inbox",
    status: "needs_review",
    statusLabel: "needs review",
    eventType: "capture",
    eventTypeLabel: "Inbox capture",
    title: item.title,
    description: item.note,
    sourceLabel: "Inbox",
    areaLabel: areaLabel(item.areaId),
    linkedEntityType: "inbox_item",
    linkedEntityId: item.id,
    sourceHref: "/inbox",
    sourceActionLabel: "Open source",
    accent: areaAccent(item.areaId),
  };
}

function buildProfileTodayViewModel(
  profile: ManualProfileData,
): TodayViewModel {
  const viewModel = clone(getDemoTodayViewModel());
  const events = [
    ...profile.tasks.map(taskToTodayEvent),
    ...profile.inboxItems.map(inboxToTodayEvent),
  ];

  viewModel.header = {
    ...viewModel.header,
    dateLabel: "Local profile day",
    summary:
      profile.tasks.length + profile.inboxItems.length > 0
        ? "Manual local entries projected into the Today memory log."
        : "Noch keine lokalen Eintraege. Today bleibt in derselben Struktur leer.",
    statusPills: [
      {
        label: `${profile.tasks.length} tasks`,
        accent: "var(--accent-blue)",
      },
      {
        label: `${profile.inboxItems.length} inbox`,
        accent: "var(--accent-green)",
      },
    ],
  };
  viewModel.activityStream = {
    ...viewModel.activityStream,
    events,
  };
  viewModel.openingReview = {
    ...viewModel.openingReview,
    items: [],
  };
  viewModel.deltaSummary = {
    ...viewModel.deltaSummary,
    metrics: [
      {
        label: "Manual tasks",
        value: String(profile.tasks.length),
        detail: "local profile",
        accent: "var(--accent-blue)",
      },
      {
        label: "Inbox",
        value: String(profile.inboxItems.length),
        detail: "local captures",
        accent: "var(--accent-green)",
      },
      {
        label: "Projects",
        value: String(profile.projects.length),
        detail: "manual",
        accent: "var(--accent-orange)",
      },
    ],
  };
  viewModel.decisionsLedger = {
    ...viewModel.decisionsLedger,
    decisions: [],
  };
  viewModel.closingReview = {
    ...viewModel.closingReview,
    signals: [],
  };
  viewModel.carryForward = {
    ...viewModel.carryForward,
    items: profile.tasks
      .filter((task) => task.status !== "done")
      .slice(0, 4)
      .map((task) => ({
        label: task.title,
        description: task.nextStep,
        accent: areaAccent(task.areaId),
      })),
    firstMove:
      profile.tasks[0]?.nextStep ?? "Create one task or inbox item to start.",
  };
  viewModel.evidenceArtifacts = {
    ...viewModel.evidenceArtifacts,
    artifacts: [
      ...profile.projects.slice(0, 3).map((project) => ({
        type: "Project",
        title: project.title,
        detail: project.nextStep,
        accent: areaAccent(project.areaId),
      })),
      ...profile.goals.slice(0, 3).map((goal) => ({
        type: "Goal",
        title: goal.title,
        detail: goal.nextStep,
        accent: areaAccent(goal.areaId),
      })),
    ],
  };

  return viewModel;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(date.getUTCDate() + amount);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayIdFromDate(date: string) {
  return `day-${date}`;
}

function startOfWeek(date: Date) {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(date);
}

function buildManualCalendarDays(
  profile: ManualProfileData,
): CalendarDayViewModel[] {
  const firstDate =
    profile.tasks.find((task) => task.date)?.date ??
    profile.projects.find((project) => project.deadline)?.deadline ??
    toIsoDate(new Date());
  const start = startOfWeek(new Date(`${firstDate}T00:00:00.000Z`));

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(start, index);
    const isoDate = toIsoDate(date);

    return {
      id: dayIdFromDate(isoDate),
      date: isoDate,
      weekday: formatWeekday(date),
      dayNumber: isoDate.slice(8, 10),
      fullLabel: formatFullDate(date),
      isToday: isoDate === firstDate,
    };
  });
}

function taskToCalendarBlock(
  task: LifeTask,
): Omit<
  CalendarTimedBlockViewModel,
  "compact" | "density" | "durationMinutes" | "layout"
> | null {
  const startMinutes = minutesFromTime(task.startTime);
  const endTime = taskEndTime(task);
  const endMinutes = minutesFromTime(endTime ?? undefined);

  if (
    !task.date ||
    !task.startTime ||
    startMinutes === null ||
    endMinutes === null
  ) {
    return null;
  }

  return {
    id: `task-block-${task.id}`,
    dayId: dayIdFromDate(task.date),
    date: task.date,
    title: task.title,
    type: "task_block",
    status:
      task.status === "done"
        ? "done"
        : task.status === "active"
          ? "active"
          : task.status === "waiting"
            ? "needs_decision"
            : "planned",
    source: "task",
    area: areaLabel(task.areaId),
    sourceEntity: {
      type: "task",
      label: `Task / ${areaLabel(task.areaId)}`,
      href: `/tasks/${task.id}`,
    },
    accent: areaAccent(task.areaId),
    meta: task.priority,
    linkedEntity: task.title,
    plannedOutcome: task.nextStep,
    timeLabel: `${task.startTime}-${endTime}`,
    priority: dashboardPriority(task.priority),
    project: task.projectId,
    taskId: task.id,
    goalId: task.goalId,
    startTime: task.startTime,
    endTime: endTime ?? task.startTime,
    startMinutes,
    endMinutes,
  };
}

function projectToAllDayBlock(
  project: LifeProject,
  fallbackDayId: string,
): CalendarAllDayBlockViewModel {
  return {
    id: `project-${project.id}`,
    dayId: project.deadline ? dayIdFromDate(project.deadline) : fallbackDayId,
    date: project.deadline,
    title: project.title,
    type: "deadline",
    status: project.blocker ? "needs_decision" : "planned",
    source: "project",
    area: areaLabel(project.areaId),
    sourceEntity: {
      type: "project",
      label: `Project / ${areaLabel(project.areaId)}`,
      href: `/projects/${project.id}`,
    },
    accent: areaAccent(project.areaId),
    timeLabel: project.deadline ? "Due" : "No deadline",
    linkedEntity: project.title,
    plannedOutcome: project.nextStep,
    priority: dashboardPriority(project.priority),
    project: project.title,
  };
}

function emptySelectedBlock(dayId: string): CalendarAllDayBlockViewModel {
  return {
    id: "empty-calendar-selection",
    dayId,
    title: "No time block selected",
    type: "event",
    status: "draft",
    source: "manual",
    area: "Review",
    sourceEntity: {
      type: "free_event",
      label: "Manual profile",
    },
    accent: "var(--text-muted)",
    timeLabel: "Empty",
    plannedOutcome: "Create a dated task to place it on the calendar.",
  };
}

function buildProfileCalendarViewModel(
  profile: ManualProfileData,
): CalendarViewModel {
  const viewModel = clone(getDemoCalendarViewModel());
  const days = buildManualCalendarDays(profile);
  const firstDayId = days[0]?.id ?? "manual-week";
  const rawTimedBlocks = profile.tasks
    .map(taskToCalendarBlock)
    .filter(
      (
        block,
      ): block is Omit<
        CalendarTimedBlockViewModel,
        "compact" | "density" | "durationMinutes" | "layout"
      > => Boolean(block),
    );
  const timedBlocks = buildCalendarTimedBlocks(rawTimedBlocks);
  const allDayBlocks = profile.projects.map((project) =>
    projectToAllDayBlock(project, firstDayId),
  );
  const unscheduledTasks = profile.tasks.filter((task) => !task.startTime);

  viewModel.header = {
    ...viewModel.header,
    dateRange: `${days[0]?.fullLabel ?? "Manual week"} - ${
      days[6]?.fullLabel ?? "Manual week"
    }`,
    controls: {
      currentAction: "Today",
      views: calendarViewSwitches,
    },
  };
  viewModel.filters = calendarFilters;
  viewModel.projectsThisWeek = profile.projects.map((project) => ({
    label: project.title,
    count: project.taskIds.length,
    accent: areaAccent(project.areaId),
  }));
  viewModel.weekStats = {
    ...viewModel.weekStats,
    stats: [
      {
        label: "Tasks",
        value: String(profile.tasks.length),
        detail: "manual",
        accent: "var(--accent-blue)",
      },
      {
        label: "Projects",
        value: String(profile.projects.length),
        detail: "manual",
        accent: "var(--accent-cyan)",
      },
      {
        label: "Focus",
        value: String(timedBlocks.length),
        detail: "blocks",
        accent: "var(--accent-purple)",
      },
      {
        label: "Deadlines",
        value: String(allDayBlocks.length),
        detail: "visible",
        accent: "var(--accent-red)",
      },
      {
        label: "Reviews",
        value: "0",
        detail: "not wired",
        accent: "var(--accent-orange)",
      },
    ],
  };
  viewModel.days = days;
  viewModel.hours = calendarHours;
  viewModel.allDayBlocks = allDayBlocks;
  viewModel.timedBlocks = timedBlocks;
  viewModel.selectedBlock =
    timedBlocks[0] ?? allDayBlocks[0] ?? emptySelectedBlock(firstDayId);
  viewModel.schedulableTasks = unscheduledTasks.map((task) => ({
    id: task.id,
    title: task.title,
    priority: dashboardPriority(task.priority),
    area: areaLabel(task.areaId),
    project: task.projectId ?? "Manual",
    status:
      task.status === "done"
        ? "done"
        : task.status === "active"
          ? "in-progress"
          : "open",
    estimatedMinutes: task.durationMinutes ?? 30,
    dueDate: task.date,
    recentlyUpdated: "local",
    alreadyScheduled: false,
    accent: areaAccent(task.areaId),
  }));
  viewModel.rightPanel = {
    ...viewModel.rightPanel,
    selectedDay: days.find((day) => day.isToday)?.fullLabel ?? "Manual week",
    badge: profile.tasks.length > 0 ? "Manual active" : "Empty",
    metrics: [
      {
        label: "Manual tasks",
        value: String(profile.tasks.length),
        detail: "local",
        accent: "var(--accent-blue)",
      },
      {
        label: "Open loops",
        value: String(profile.inboxItems.length),
        detail: "inbox",
        accent: "var(--accent-red)",
      },
    ],
    openLoops: profile.inboxItems.slice(0, 4).map((item) => ({
      title: item.title,
      meta: `${areaLabel(item.areaId)} - ${item.stage}`,
      accent: areaAccent(item.areaId),
    })),
    unscheduledTasks: unscheduledTasks.slice(0, 4).map((task) => ({
      title: task.title,
      meta: `${task.priority} task - no time block yet`,
      accent: areaAccent(task.areaId),
    })),
    reviewsOpen: [],
    suggestedPlanningActions: [],
    selectedTimeSlot: {
      label: "Selected time slot",
      dayId: days[0]?.id,
      dayLabel: days[0]?.fullLabel ?? "Manual day",
      date: days[0]?.date ?? "",
      startTime: "20:00",
      endTime: "20:30",
    },
    planningAssistant: {
      title: "Planning Assistant",
      status: "suggestions only",
      suggestions: [],
    },
    weeklyReview: {
      ...viewModel.rightPanel.weeklyReview,
      status: "not wired",
      description: "Manual profile does not write review records in R1.",
    },
  };

  return viewModel;
}

export async function getEntityCollection(): Promise<EntityCollection> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return clone(demoEntityCollection);
  }

  const profile = await getProfileData(profileId);

  return {
    tasks: profile.tasks,
    projects: profile.projects,
    goals: profile.goals,
    skills: [],
    milestones: [],
  };
}

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoDashboardViewModel();
  }

  return buildProfileDashboardViewModel(
    profileId,
    await getProfileData(profileId),
  );
}

export async function getInboxViewModel(): Promise<InboxViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoInboxViewModel();
  }

  return buildProfileInboxViewModel(await getProfileData(profileId));
}

export async function getTodayViewModel(): Promise<TodayViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoTodayViewModel();
  }

  return buildProfileTodayViewModel(await getProfileData(profileId));
}

export async function getCalendarViewModel(): Promise<CalendarViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoCalendarViewModel();
  }

  return buildProfileCalendarViewModel(await getProfileData(profileId));
}

export async function getPortfolioViewModel(): Promise<PortfolioViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoPortfolioViewModel();
  }

  return buildProfilePortfolioViewModel(profileId, await getEntityCollection());
}

export async function getMentalHealthViewModel(): Promise<MentalHealthPageViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoMentalHealthViewModel();
  }

  return buildProfileMentalHealthViewModel(profileId);
}

export async function getLifeOsDataSource(): Promise<LifeOsDataSource> {
  const profileId = await getCurrentLifeOsProfileId();
  const profile = getLifeOsProfileSummary(profileId);
  const assertManualProfile = () => {
    if (profileId !== "manual") {
      throw new Error("Manual Local Profile is required for local mutations.");
    }
  };

  return {
    profile,
    getDashboardViewModel,
    getEntityCollection,
    async getTasks() {
      const collection = await getEntityCollection();
      return [...collection.tasks];
    },
    async createTask(input: CreateTaskInput) {
      assertManualProfile();
      return createManualTask(input);
    },
    async getInboxItems() {
      const viewModel = await getInboxViewModel();
      return [...viewModel.queue];
    },
    async createInboxItem(input: CreateInboxItemInput) {
      assertManualProfile();
      return createManualInboxItem(input);
    },
    async getProjects() {
      const collection = await getEntityCollection();
      return [...collection.projects];
    },
    async createProject(input: CreateProjectInput) {
      assertManualProfile();
      return createManualProject(input);
    },
    async getGoals() {
      const collection = await getEntityCollection();
      return [...collection.goals];
    },
    async createGoal(input: CreateGoalInput) {
      assertManualProfile();
      return createManualGoal(input);
    },
    getPortfolioViewModel,
    getMentalHealthViewModel,
    getInboxViewModel,
    getTodayViewModel,
    getCalendarViewModel,
    async resetManualProfile() {
      assertManualProfile();
      await resetManualProfileFile();
    },
  };
}
