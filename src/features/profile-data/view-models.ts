import "server-only";

import {
  buildCalendarTimedBlocks,
  getCalendarViewModel as getDemoCalendarViewModel,
  resolveCalendarContentStates,
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
import {
  getDashboardDateLabel,
  getDashboardGreeting,
  getDashboardViewModel as getDemoDashboardViewModel,
  getSystemTimeProgress,
} from "@/features/dashboard/dashboard-view-model";
import { resolveContentStateMeta } from "@/features/content-state";
import type {
  DashboardAccent,
  DashboardAgendaEvent,
  DashboardArea,
  DashboardHabit,
  DashboardMeal,
  DashboardPortfolioItem,
  DashboardPriority,
  DashboardViewModel,
  HabitTrackerWindow,
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
  captureInboxItemInputSchema,
  type InboxItem,
  type Task as RealDataTask,
} from "@/features/real-data";
import {
  createSupabaseInboxRepository,
  createSupabaseTaskRepository,
} from "@/features/real-data/supabase";
import {
  createManualHabit,
  createManualGoal,
  createManualProject,
  createManualTask,
  readManualProfile,
  resetManualProfile as resetManualProfileFile,
  saveManualMealSlot,
  setManualMood,
} from "./manual-profile-store";
import { getInboxViewModel as getDemoInboxViewModel } from "@/features/inbox/inbox-view-model";
import {
  buildInboxContentStates,
  getInboxCaptureTypeLabel,
  getInboxStageLabel,
  type InboxAISuggestion,
  InboxQueueItem,
  InboxStage,
  InboxViewModel,
} from "@/features/inbox";
import {
  getMentalHealthViewModel as getDemoMentalHealthViewModel,
  type MentalHealthPageViewModel,
} from "@/features/health/mental-health-view-model";
import {
  buildTodayContentStates,
  getTodayViewModel as getDemoTodayViewModel,
} from "@/features/today/today-view-model";
import type {
  TodayActivityEventViewModel,
  TodayReviewSignalViewModel,
  TodayViewModel,
} from "@/features/today";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
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
  CreateHabitInput,
  CreateInboxItemInput,
  CreateProjectInput,
  SaveMealSlotInput,
  SetMoodInput,
  CreateTaskInput,
  LifeOsDataSource,
  LifeOsProfileId,
  ManualHabit,
  ManualInboxItem,
  ManualMealSlot,
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
    habits: [],
    mood: null,
    meals: [],
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

const dashboardCapacity = {
  activePortfolio: 4,
  agenda: 9,
  dailyControl: 4,
  habits: 8,
  meals: 3,
} as const;

const taskPriorityOrder: Record<EntityPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  none: 4,
};

const appTimeZone = "Europe/Berlin";

const mealSlots: readonly Exclude<DashboardMeal["type"], "Snack">[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
];

function localDateLabel(date = new Date(), timeZone = appTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function localTimeLabel(date: Date, timeZone = appTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone,
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("hour")}:${part("minute")}`;
}

function utcDateLabel(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function todayDateLabel() {
  return localDateLabel();
}

function scheduledTaskDate(task: RealDataTask) {
  if (!task.scheduledStartAt) return undefined;

  return localDateLabel(new Date(task.scheduledStartAt));
}

function scheduledTaskStartTime(task: RealDataTask) {
  if (!task.scheduledStartAt) return undefined;

  return localTimeLabel(new Date(task.scheduledStartAt));
}

function sortDashboardTasks(left: LifeTask, right: LifeTask) {
  const timeCompare = `${left.date ?? ""}${left.startTime ?? "99:99"}`.localeCompare(
    `${right.date ?? ""}${right.startTime ?? "99:99"}`,
  );

  if (timeCompare !== 0) return timeCompare;

  return taskPriorityOrder[left.priority] - taskPriorityOrder[right.priority];
}

function visibleDashboardTasks(tasks: readonly LifeTask[]) {
  const today = todayDateLabel();

  return [...tasks]
    .filter((task) => task.status !== "done" && task.status !== "canceled")
    .filter((task) => task.date === today)
    .sort(sortDashboardTasks);
}

function manualHabitToDashboardHabit(habit: ManualHabit): DashboardHabit {
  return {
    area: habit.areaId as DashboardArea,
    currentValue: habit.currentValue,
    id: habit.id,
    label: habit.label,
    marker: habit.marker,
    stepValue: habit.stepValue,
    targetValue: habit.targetValue,
    total: habit.total,
    unit: habit.unit,
  };
}

function emptyMealSlot(type: Exclude<DashboardMeal["type"], "Snack">): DashboardMeal {
  const defaultTimes: Record<Exclude<DashboardMeal["type"], "Snack">, string> = {
    Breakfast: "07:30",
    Dinner: "19:00",
    Lunch: "12:30",
  };

  return {
    area: "nutrition",
    ctaLabel: "Planen",
    href: "/nutrition/meal-planner?view=today",
    kcal: "-",
    macros: [],
    mealId: type.toLowerCase(),
    name: "Keine Mahlzeit",
    recipeId: "",
    state: "unplanned",
    time: defaultTimes[type],
    type,
  };
}

function manualMealToDashboardMeal(meal: ManualMealSlot): DashboardMeal {
  const fallback = emptyMealSlot(meal.type);

  return {
    ...fallback,
    ctaLabel: meal.state === "skipped" ? "Erfassen" : "Planen",
    kcal: meal.kcal ?? (meal.state === "skipped" ? "Ausgelassen" : "-"),
    macros: meal.macros,
    name:
      meal.state === "skipped"
        ? "Ausgelassen"
        : meal.name || fallback.name,
    state: meal.state,
    time: meal.time || fallback.time,
  };
}

function buildMealSlots(profile: ManualProfileData): DashboardMeal[] {
  return mealSlots.map((slot) => {
    const meal = profile.meals.find((item) => item.type === slot);

    return meal ? manualMealToDashboardMeal(meal) : emptyMealSlot(slot);
  });
}

function mealIsDecided(meal: DashboardMeal) {
  return meal.state !== "unplanned";
}

function moodAccent(label: string): DashboardAccent {
  if (label === "Calm" || label === "Content") return "var(--accent-cyan)";
  if (label === "Focused") return "var(--accent-blue)";
  if (label === "Happy") return "var(--accent-green)";
  if (label === "Anxious" || label === "Stressed") return "var(--accent-orange)";
  if (label === "Tired") return "var(--accent-purple)";

  return "var(--text-muted)";
}

function moodDetail(label: string) {
  if (label === "Empty") return "Noch kein Mood-Eintrag";
  if (label === "Calm") return "ruhig · stabil · langsam starten";
  if (label === "Content") return "stabil · fokusfähig · Stress im Blick";
  if (label === "Focused") return "klar · arbeitsbereit · geringe Ablenkung";
  if (label === "Tired") return "gedämpft · vorsichtig planen";
  if (label === "Happy") return "positiv · Energie verfügbar";
  if (label === "Anxious") return "angespannt · kleine nächste Aktion wählen";
  if (label === "Stressed") return "belastet · Druck reduzieren";

  return "Mood gespeichert";
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
    profileId,
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
  profile: ManualProfileData,
): MentalHealthPageViewModel {
  const hasMood = Boolean(profile.mood);
  const moodLabel = profile.mood?.label ?? "—";

  return {
    profileId,
    contentStates: {
      actions: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
      checkIn: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      currentSignal: resolveContentStateMeta({
        capacity: 3,
        itemCount: hasMood ? 1 : 0,
      }),
      header: resolveContentStateMeta({ capacity: 1, itemCount: hasMood ? 1 : 0 }),
      journalRhythm: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
      moodPattern: resolveContentStateMeta({
        capacity: 6,
        itemCount: hasMood ? 1 : 0,
      }),
      page: resolveContentStateMeta({ capacity: 8, itemCount: hasMood ? 1 : 0 }),
      repairRoutines: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
      safety: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
      sleepRecovery: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
    },
    header: {
      breadcrumb: ["Life OS", "Health & Fitness", "Mental Health"],
      title: "Mental Health",
      subtitle:
        "Self-checks, mood patterns and routines without labels or pressure.",
      pills: [
        { label: "Self-check only", accent: "var(--accent-purple)" },
        { label: "No diagnosis", accent: "var(--accent-cyan)" },
        {
          label: hasMood ? "Local mood" : "Noch leer",
          accent: "var(--accent-green)",
        },
      ],
      signal: {
        label: "Current signal",
        value: hasMood ? moodLabel : "Noch kein aktuelles Signal",
        detail: hasMood
          ? "Lokaler Mood-Eintrag gespeichert."
          : "Noch kein Check-in erfasst.",
        accent: "var(--accent-purple)",
        progress: hasMood ? 20 : 0,
        progressLabel: hasMood ? "lokaler Mood" : "kein Check-in erfasst",
      },
    },
    checkIn: {
      title: "Today Check-In",
      subtitle: "Capture the signal, then choose the smallest useful repair.",
      badge: "Primary action",
      messageTitle: "Noch kein Check-in",
      message:
        "Erfasse spaeter einen kurzen lokalen Check-in, um diese Card zu fuellen.",
      items: hasMood
        ? [
            {
              accent: "var(--accent-purple)",
              detail: "lokal gespeichert",
              label: "Mood",
              value: moodLabel,
            },
          ]
        : [],
      nextRepair: {
        label: "Next repair",
        value: "Noch keine Support-Routine ausgewaehlt.",
      },
      actionLabel: "Open check-in",
      actionDisabled: true,
    },
    moodPattern: {
      title: "Stimmungsverlauf",
      subtitle:
        "Show your tendency in text. Color is always paired with label.",
      rangeLabel: "7 days",
      moods: hasMood
        ? [
            {
              accent: "var(--accent-purple)",
              detail: "lokaler Mood",
              label: moodLabel,
              pattern: [true, false, false, false, false, false, false],
              value: "1 signal",
            },
          ]
        : [],
      interpretation: "Noch kein Stimmungsverlauf",
    },
    currentSignal: {
      title: "Current Signal",
      subtitle: "What needs review, without turning the page into analytics.",
      metrics: [],
      interpretation: {
        label: "Signal interpretation",
        value: hasMood ? moodLabel : "Noch kein aktuelles Signal",
        detail: hasMood
          ? "Ein einzelner lokaler Mood-Eintrag ist sichtbar; kein Muster wird abgeleitet."
          : "Erfasse zuerst einen Check-in, bevor ein Verlauf entsteht.",
      },
      nextStep: {
        label: "Next step",
        value: "Noch keine nächste Aktion",
        detail:
          "Aktionen erscheinen erst, wenn ein lokaler Check-in-Flow existiert.",
      },
    },
    sleepRecovery: {
      title: "Sleep & Recovery",
      subtitle: "Sleep rhythm as context for mood and focus.",
      metrics: [],
      bars: [],
      tonightCue: {
        label: "Tonight cue",
        value: "Noch keine Schlafdaten",
        detail: "Schlafdaten erscheinen erst, wenn eine lokale Quelle existiert.",
      },
    },
    journalRhythm: {
      title: "Journal / Reflection Rhythm",
      subtitle: "Small reflection loops, not a second inbox.",
      value: "0 / 7 days",
      pattern: [],
      focus: {
        label: "Reflection focus",
        value: "Noch keine Reflexion erfasst",
      },
      lastReflection: {
        label: "Last reflection",
        value: "Noch keine Reflexion erfasst.",
        detail: "Journal-Eintraege werden spaeter in diese Seite projiziert.",
      },
      prompt: {
        label: "Daily prompt",
        value: "Noch kein Journal-Kontext",
        detail: "Reflexionen erscheinen erst, wenn lokale Eintraege existieren.",
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
        value: "Noch keine Support-Routinen",
        detail: "Routinen erscheinen erst, wenn lokale Signale existieren.",
      },
    },
    actions: {
      title: "Mental Health Actions",
      subtitle: "Today - choose the smallest viable repair.",
      badge: "Today",
      items: [],
      decisionRule: {
        label: "Decision rule",
        value: "Noch keine Mental-Health-Aktionen",
        detail: "Diese Card bleibt leer, bis lokale Aktionen existieren.",
        progress: 0,
        progressLabel: "keine Aktionen",
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
  viewModel.profileId = profileId;
  viewModel.commandCenter.profileId = profileId;

  const tasks = visibleDashboardTasks(profile.tasks);
  const inboxItems = profile.inboxItems;
  const scheduledTasks = tasks
    .filter((task) => task.startTime)
    .sort(sortDashboardTasks);
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
  const meals = buildMealSlots(profile);
  const decidedMealCount = meals.filter(mealIsDecided).length;
  const activeMood = profile.mood?.label ?? "Empty";
  const dashboardHabits = {
    Morning: profile.habits
      .filter((habit) => habit.window === "Morning")
      .map(manualHabitToDashboardHabit)
      .slice(0, dashboardCapacity.habits),
    Midday: profile.habits
      .filter((habit) => habit.window === "Midday")
      .map(manualHabitToDashboardHabit)
      .slice(0, dashboardCapacity.habits),
    Evening: profile.habits
      .filter((habit) => habit.window === "Evening")
      .map(manualHabitToDashboardHabit)
      .slice(0, dashboardCapacity.habits),
  } satisfies Record<HabitTrackerWindow, DashboardHabit[]>;
  const activeHabitCount = dashboardHabits.Morning.length;
  const portfolioItems = [
    ...profile.projects.map(projectToPortfolioItem),
    ...profile.goals.map(goalToPortfolioItem),
  ];
  const activePortfolioView =
    profile.projects.length > 0
      ? "Project View"
      : profile.goals.length > 0
        ? "Goal View"
        : "Project View";

  viewModel.commandCenter.commandCenter = {
    ...viewModel.commandCenter.commandCenter,
    contentState: resolveContentStateMeta({
      capacity: 6,
      itemCount: 6,
    }),
    greeting: getDashboardGreeting(profileId === "manual" ? "User" : "Anton"),
    dateLabel: getDashboardDateLabel(),
    dayTypeLabel: "Work / Study Day",
    metrics: [
      {
        label: "Tasks",
        value: `${doneTaskCount} / ${tasks.length}`,
        detail: tasks.length > 0 ? "Tasks for today" : "Create task",
        progress: tasks.length > 0 ? (doneTaskCount / tasks.length) * 100 : 0,
        accent: "var(--accent-blue)",
        area: "review",
        contentState: resolveContentStateMeta({
          capacity: dashboardCapacity.dailyControl,
          itemCount: tasks.length,
        }),
        href: "/tasks?filter=all",
      },
      {
        label: "Focus Time",
        value: `${focusMinutes}m`,
        detail: focusMinutes > 0 ? "Scheduled today" : "No focus block planned",
        progress: Math.min(100, (focusMinutes / 180) * 100),
        accent: "var(--accent-blue)",
        area: "education",
        contentState: resolveContentStateMeta({
          hasPrimaryValue: focusMinutes > 0,
          itemCount: focusMinutes > 0 ? 1 : 0,
        }),
        href: "/calendar",
      },
      {
        label: "Inbox",
        value: `${inboxItems.length} open`,
        detail: inboxItems.length > 0 ? "Captured to Inbox" : "Capture thought",
        progress: Math.min(100, inboxItems.length * 18),
        accent: "var(--accent-green)",
        area: "review",
        contentState: resolveContentStateMeta({
          capacity: 8,
          itemCount: inboxItems.length,
        }),
        href: "/inbox",
      },
      {
        label: "Nutrition",
        value: decidedMealCount > 0 ? `${decidedMealCount} / 3` : "No plan",
        detail: decidedMealCount > 0 ? "Meal slots decided" : "Create Plan",
        progress: (decidedMealCount / dashboardCapacity.meals) * 100,
        accent: "var(--accent-yellow)",
        area: "nutrition",
        contentState: resolveContentStateMeta({
          capacity: dashboardCapacity.meals,
          itemCount: decidedMealCount,
        }),
        href: "/nutrition/meal-planner?view=today",
      },
      {
        label: "Review Status",
        value: "No review",
        detail: "Start Capturing",
        progress: 0,
        accent: "var(--accent-cyan)",
        area: "review",
        contentState: resolveContentStateMeta({
          hasPrimaryValue: false,
          itemCount: 0,
        }),
        href: "/review/daily",
      },
      {
        label: "Sleep",
        value: "No data",
        detail: "Tracke deinen Schlaf",
        progress: 0,
        accent: "var(--accent-blue)",
        area: "health",
        contentState: resolveContentStateMeta({
          hasPrimaryValue: false,
          itemCount: 0,
        }),
        href: "/health/mental?section=sleep",
      },
    ],
    moodCheck: {
      ...viewModel.commandCenter.commandCenter.moodCheck,
      activeOption: activeMood,
      detail: moodDetail(activeMood),
      moodLabel: activeMood,
      options: [
        "Calm",
        "Content",
        "Focused",
        "Tired",
        "Anxious",
        "Stressed",
        "Happy",
      ],
      progress: profile.mood ? 64 : 0,
      progressLabel: profile.mood ? "Current signal" : "No signal",
      scoreLabel: profile.mood ? "Saved" : "-",
      accent: moodAccent(activeMood),
    },
    timeProgress: getSystemTimeProgress(),
    weather: {
      temperatureLabel: "Local day",
      periodLabel: "System",
      conditionLabel: "profile independent",
    },
  };

  viewModel.commandCenter.quickCapture = {
    ...viewModel.commandCenter.quickCapture,
    contentState: resolveContentStateMeta({
      capacity: 1,
      itemCount: 0,
    }),
  };
  viewModel.commandCenter.dailyControl = {
    ...viewModel.commandCenter.dailyControl,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.dailyControl,
      itemCount: tasks.length,
    }),
    subtitle:
      tasks.length > 0 ? "Current task + next queue" : "No current task yet",
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
          title: "Kein aktueller Fokus",
          detail: "Wähle oder erstelle eine Aufgabe für heute.",
          blockLabel: "Fokusblock",
          block: "nicht geplant",
        },
    nextStep: activeTask
      ? {
          label: "Nächster Schritt",
          title: activeTask.nextStep,
          detail: "Aus deiner heutigen Aufgabenliste",
        }
      : {
          label: "Nächster Schritt",
          title: "Aufgabe für heute erstellen",
          detail: "Wähle oder erstelle eine Aufgabe für heute.",
        },
    currentTask: activeTask
      ? taskToCurrentTask(activeTask)
      : {
          id: "empty-current-task",
          sectionLabel: "Current Task",
          timeRemainingLabel: "Kein Block gewählt",
          statusLabel: "Empty",
          title: "Kein aktueller Fokus",
          contextLabel: "Wähle oder erstelle eine Aufgabe für heute.",
          actionLabel: "Create task",
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
        detail: "No signal",
        accent: "var(--text-muted)",
      },
      {
        kind: "inbox",
        label: "Inbox",
        value: `${inboxItems.length} open`,
        detail: inboxItems.length > 0 ? "Captured" : "No captures",
        accent: "var(--accent-green)",
      },
      {
        kind: "review",
        label: "Review",
        value: "No review",
        detail: "Start Capturing",
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
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.agenda,
      itemCount: tasks.length,
    }),
    preparedViewsLabel: "Week and month views prepared",
    events: tasks.slice(0, 9).map(taskToAgendaEvent),
  };

  viewModel.healthNutrition.weightLossGoal = {
    ...viewModel.healthNutrition.weightLossGoal,
    contentState: resolveContentStateMeta({
      hasPrimaryValue: false,
      itemCount: 0,
    }),
    currentWeight: "- kg",
    targetLabel: "Noch kein Health-Ziel",
    remainingLabel: "No data",
    weeklyStatusLabel: "No data",
    weeklyStatusAccent: "var(--text-muted)",
    progress: 0,
  };
  viewModel.healthNutrition.nutrientBalance = {
    ...viewModel.healthNutrition.nutrientBalance,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.meals,
      itemCount: decidedMealCount,
    }),
    lastUpdatedLabel:
      decidedMealCount > 0 ? "Meal slots updated locally" : "No plan",
    items: [
      {
        label: "Protein",
        value: "-",
        status: "On target",
        progress: 0,
        accent: "var(--accent-red)",
        statusAccent: "var(--text-muted)",
      },
      {
        label: "Carbs",
        value: "-",
        status: "On target",
        progress: 0,
        accent: "var(--accent-blue)",
        statusAccent: "var(--text-muted)",
      },
      {
        label: "Fat",
        value: "-",
        status: "On target",
        progress: 0,
        accent: "var(--accent-yellow)",
        statusAccent: "var(--text-muted)",
      },
    ],
  };
  viewModel.healthNutrition.meals = {
    ...viewModel.healthNutrition.meals,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.meals,
      itemCount: decidedMealCount,
    }),
    items: meals,
    recipeOptions: [],
  };
  viewModel.healthNutrition.runningRecovery = {
    ...viewModel.healthNutrition.runningRecovery,
    contentState: resolveContentStateMeta({
      hasPrimaryValue: false,
      itemCount: 0,
    }),
    stats: [
      { label: "Distance", value: "-", delta: "No data" },
      { label: "Pace", value: "-", delta: "No data" },
      { label: "Time", value: "-", delta: "No data" },
    ],
    rhythm: {
      title: "Noch keine Laufeinheit",
      detail: "Workout-Daten erscheinen nach der ersten lokalen Einheit.",
      progress: 0,
      statusLabel: "Empty",
      accent: "var(--text-muted)",
    },
    todayGoalLabel: "Today goal: not set",
    lastSyncLabel: "No health data",
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
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.habits,
      itemCount: activeHabitCount,
    }),
    totalSlotsLabel: `${activeHabitCount}/${dashboardCapacity.habits}`,
    habitsByWindow: dashboardHabits,
  };
  viewModel.activePortfolio = {
    ...viewModel.activePortfolio,
    activeView: activePortfolioView,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.activePortfolio,
      itemCount: Math.min(portfolioItems.length, dashboardCapacity.activePortfolio),
    }),
    subtitle:
      profile.projects.length + profile.goals.length > 0
        ? "Projects and goals"
        : "No active projects or goals",
    items: portfolioItems,
  };
  viewModel.antiRotActions = {
    ...viewModel.antiRotActions,
    contentState: resolveContentStateMeta({
      capacity: 5,
      itemCount: 0,
    }),
    donePrompt: "Open habits to configure reset actions",
    actions: [],
  };
  viewModel.challengesRewardFocus = {
    ...viewModel.challengesRewardFocus,
    contentState: resolveContentStateMeta({
      capacity: 3,
      itemCount: 0,
    }),
    summary: "No challenges active",
    measurementLabel: "0 measurable",
    rewardFocus: "Open Challenges",
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

function realInboxStatusToStage(status: InboxItem["status"]): InboxStage {
  if (status === "clarified") return "clarify";
  if (status === "triaged" || status === "processed") return "ready";
  if (status === "archived") return "review";

  return "raw";
}

function realInboxToManualInboxItem(item: InboxItem): ManualInboxItem {
  const stage = realInboxStatusToStage(item.status);

  return {
    age: "DB",
    areaId: "review",
    createdAt: item.createdAt,
    id: item.id,
    next:
      stage === "ready"
        ? "Review completed triage output."
        : "Clarify outcome and decide where it belongs.",
    note: item.body ?? "",
    priority: item.priority,
    stage,
    sourceAreaId: item.areaId,
    title: item.title,
    triagedTaskId: item.triagedTaskId,
    type: item.type,
  };
}

function realTaskStatusToLifeTaskStatus(
  status: RealDataTask["status"],
): TaskStatus | null {
  if (status === "archived") return null;

  return status;
}

function realTaskToLifeTask(task: RealDataTask): LifeTask | null {
  const status = realTaskStatusToLifeTaskStatus(task.status);

  if (!status) return null;

  const scheduledDate = scheduledTaskDate(task);
  const scheduledStartTime = scheduledTaskStartTime(task);

  return {
    areaId: "review",
    calendarBlockIds: [],
    date: task.plannedDate ?? scheduledDate,
    description: task.description ?? "",
    durationMinutes: task.durationMinutes ?? undefined,
    energy: task.energy ?? undefined,
    evidence: task.sourceInboxItemId
      ? [
          {
            detail: "Created from Inbox triage.",
            href: `/inbox`,
            sourceLabel: "Supabase",
            title: "Source Inbox Item",
          },
        ]
      : [],
    goalId: task.goalId ?? undefined,
    id: task.id,
    inboxItemIds: task.sourceInboxItemId ? [task.sourceInboxItemId] : [],
    nextStep:
      task.description ??
      (task.sourceInboxItemId
        ? "Review the task created from Inbox triage."
        : "Review the Supabase task."),
    priority: task.priority,
    projectId: task.projectId ?? undefined,
    resultNote: task.completedAt ? "Completed in Supabase." : undefined,
    reviewNeeded: status === "inbox",
    source: task.sourceInboxItemId ? "Supabase inbox triage" : "Supabase task",
    startTime: scheduledStartTime,
    status,
    timeline: [
      {
        dateLabel: "DB",
        detail: "Loaded from Supabase tasks.",
        label: "Read model",
      },
    ],
    title: task.title,
    type: "task",
  };
}

function manualDbUnavailableReason(
  error: "auth_error" | "invalid_session" | "missing_env" | "unauthenticated",
  actionLabel: string,
) {
  if (error === "missing_env") {
    return "Supabase ist lokal noch nicht konfiguriert.";
  }

  if (error === "invalid_session") {
    return "Die Supabase Session ist ungültig. Setze sie in den Settings zurück und melde dich neu an.";
  }

  if (error === "auth_error") {
    return "Supabase Auth konnte die Session nicht prüfen. Setze sie in den Settings zurück.";
  }

  return `Melde dich an, um ${actionLabel}.`;
}

async function getManualInboxProfileData(): Promise<{
  data: ManualProfileData;
  unavailableReason?: string;
}> {
  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      data: emptyManualProfile(),
      unavailableReason: manualDbUnavailableReason(
        auth.error,
        "DB-backed Inbox Items zu laden",
      ),
    };
  }

  const repository = createSupabaseInboxRepository(auth.client);
  const result = await repository.getInboxItemsByUser(auth.user.id, auth.user.id);

  if (!result.ok) {
    return {
      data: emptyManualProfile(),
      unavailableReason: "Inbox Items konnten nicht aus Supabase geladen werden.",
    };
  }

  return {
    data: {
      ...emptyManualProfile(),
      inboxItems: result.data.map(realInboxToManualInboxItem),
    },
  };
}

async function getManualTaskProfileData(): Promise<{
  tasks: LifeTask[];
  unavailableReason?: string;
}> {
  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      tasks: [],
      unavailableReason: manualDbUnavailableReason(
        auth.error,
        "DB-backed Tasks zu laden",
      ),
    };
  }

  const repository = createSupabaseTaskRepository(auth.client);
  const result = await repository.getTasksByUser({
    profileId: auth.user.id,
    sortBy: "created",
    userId: auth.user.id,
  });

  if (!result.ok) {
    return {
      tasks: [],
      unavailableReason: "Tasks konnten nicht aus Supabase geladen werden.",
    };
  }

  return {
    tasks: result.data
      .map(realTaskToLifeTask)
      .filter((task): task is LifeTask => Boolean(task)),
  };
}

async function getProfileDataWithManualTasks(profileId: LifeOsProfileId) {
  if (profileId !== "manual") {
    return getProfileData(profileId);
  }

  const [profile, manualTasks] = await Promise.all([
    readManualProfile(),
    getManualTaskProfileData(),
  ]);

  return {
    ...profile,
    tasks: manualTasks.tasks,
  };
}

function inboxEmptyPlanningSuggestions(): InboxAISuggestion[] {
  return [
    {
      label: "Area",
      value: "—",
      accent: "var(--accent-blue)",
    },
    {
      label: "Priority",
      value: "—",
      accent: "var(--accent-orange)",
    },
    {
      label: "Effort",
      value: "—",
      accent: "var(--accent-green)",
    },
    {
      label: "Energy",
      value: "—",
      accent: "var(--accent-cyan)",
    },
  ];
}

function buildProfileInboxViewModel(
  profile: ManualProfileData,
  profileId: Exclude<LifeOsProfileId, "demo">,
  options: Readonly<{
    unavailableReason?: string;
  }> = {},
): InboxViewModel {
  const viewModel = clone(getDemoInboxViewModel());
  const isManual = profileId === "manual";
  const queue = profile.inboxItems.map((item, index) =>
    manualInboxToQueueItem(item, index === 0),
  );
  const active = profile.inboxItems[0] ?? null;
  const activeIsTaskCapture = active?.type === "task";
  const activeIsTriaged = Boolean(active?.triagedTaskId);
  const activeHasExitDecision = Boolean(
    active && (activeIsTaskCapture || activeIsTriaged),
  );
  const checklistItems = [
    {
      label: "Capture vorhanden",
      state: active ? "done" : "missing",
    },
    {
      label: "Kontext geklärt",
      state: active?.note ? "done" : "missing",
    },
    {
      label: "Nächste Aktion festgelegt",
      state: active?.next ? "done" : "missing",
    },
    {
      label: activeIsTaskCapture
        ? "Task Draft vorhanden"
        : "Outcome Route gewählt",
      state: activeHasExitDecision ? "done" : "missing",
    },
  ] satisfies InboxViewModel["checklist"]["items"];
  const checklistDoneCount = checklistItems.filter(
    (item) => item.state === "done",
  ).length;
  const aiPlanning = active
    ? [
        {
          label: "Area",
          value: areaLabel(active.areaId),
          accent: areaAccent(active.areaId),
        },
        ...inboxEmptyPlanningSuggestions().slice(1),
      ]
    : inboxEmptyPlanningSuggestions();
  const quickCaptureDescription =
    isManual && !options.unavailableReason
      ? "Speichert neue Inbox-Einträge in Supabase."
      : options.unavailableReason
        ? "Manual Inbox ist auf Supabase umgestellt, aber aktuell nicht verfügbar."
        : "Quick Capture bleibt sichtbar; Speichern ist dem Manual-Profil vorbehalten.";

  viewModel.profileId = profileId;
  viewModel.contentStates = buildInboxContentStates({
    aiSuggestionCount: active ? 1 : 0,
    checklistDoneCount,
    hasActiveItem: Boolean(active),
    queueCount: queue.length,
    relatedContextCount: 0,
  });
  viewModel.quickCapture = {
    enabled: isManual && !options.unavailableReason,
    title: "Quick Capture",
    description: quickCaptureDescription,
    disabledReason: isManual
      ? options.unavailableReason
      : "Wechsle ins Manual-Profil, um lokale Einträge zu speichern.",
  };
  viewModel.queueEmptyState = {
    title: "Inbox ist leer",
    description: "Capture Gedanken, Aufgaben oder Fragen, wenn sie entstehen.",
  };
  viewModel.signals = [
    {
      label: "Open",
      value: String(profile.inboxItems.length),
      sublabel: isManual ? "db captures" : "captured",
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
    canTriageToTask: Boolean(
      isManual && active && activeIsTaskCapture && !activeIsTriaged,
    ),
    hasSelection: Boolean(active),
    id: active?.id,
    isTaskCapture: activeIsTaskCapture,
    persistedAreaId: active?.sourceAreaId ?? null,
    portfolioHref: activeIsTriaged ? "/portfolio?view=tasks" : undefined,
    priority: active?.priority ?? "P2",
    title: active?.title ?? "Kein Eintrag ausgewählt",
    triagedTaskId: active?.triagedTaskId ?? null,
    stage: activeIsTriaged
      ? "Triaged"
      : active
        ? getInboxStageLabel(active.stage)
        : "—",
    type: active ? getInboxCaptureTypeLabel(active.type) : "—",
    originalCapture: active?.note ?? "",
    source: isManual ? "Manual database" : "Empty profile",
    fields: [
      {
        label: "Clean Title",
        value: active?.title ?? "—",
      },
      {
        label: "Description / Context",
        value: active?.note ?? "—",
      },
      {
        label: "Next Action",
        value: active?.next ?? "—",
      },
      {
        label: "Missing Info",
        value: activeIsTriaged
          ? "Task erstellt. Planung und Terminierung passieren außerhalb der Inbox."
          : activeIsTaskCapture
            ? "Task Draft prüfen und erst danach erstellen."
            : active
              ? "Outcome Route wählen."
              : "—",
      },
    ],
    planningSignals: active
      ? [
          {
            label: "Area",
            value: areaLabel(active.areaId),
            source: "Local item",
            accent: areaAccent(active.areaId),
          },
        ]
      : [],
    actionsEnabled: false,
    emptyState: {
      title: "Kein Eintrag ausgewählt",
      description:
        "Wähle links einen Eintrag aus oder erfasse einen neuen Gedanken.",
    },
  };
  viewModel.outcome = {
    ...viewModel.outcome,
    description: activeIsTaskCapture
      ? "Task-Captures werden als Task Draft im Active Item geprüft."
      : viewModel.outcome.description,
    actionsEnabled: false,
  };
  viewModel.aiAssistant = {
    ...viewModel.aiAssistant,
    mode: active ? "local suggestion" : "waiting",
    description: active
      ? "Hinweise bleiben lokal und werden erst nach Review übernommen."
      : "Noch keine Empfehlung möglich.",
    planning: aiPlanning,
    outcomes: active && !activeIsTaskCapture ? ["Outcome Route prüfen"] : [],
    canApply: false,
    emptyState: {
      title: "Noch keine Empfehlung möglich",
      description: "Wähle einen echten Eintrag aus, bevor Vorschläge entstehen.",
    },
  };
  viewModel.checklist = {
    ...viewModel.checklist,
    progress: `${checklistDoneCount} / 4 ready`,
    items: checklistItems,
  };
  viewModel.relatedContext = {
    ...viewModel.relatedContext,
    items: [],
    actionsEnabled: false,
    emptyState: {
      title: "Kein verwandter Kontext",
      description:
        "Passende Projekte, Ziele oder Ressourcen erscheinen erst aus echten lokalen Daten.",
    },
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

function todayReviewNotSetItems(): TodayReviewSignalViewModel[] {
  return [
    {
      label: "Sleep",
      value: "—",
      detail: "Nicht gesetzt",
      accent: "var(--accent-blue)",
    },
    {
      label: "Mood",
      value: "Nicht gesetzt",
      detail: "Opening Review nicht gestartet",
      accent: "var(--accent-green)",
    },
    {
      label: "Energy",
      value: "—",
      detail: "Nicht gesetzt",
      accent: "var(--accent-cyan)",
    },
    {
      label: "Focus",
      value: "Nicht gesetzt",
      detail: "Noch nicht gestartet",
      accent: "var(--accent-purple)",
    },
    {
      label: "Intent",
      value: "Noch nicht gestartet",
      detail: "Keine Review-Daten gespeichert",
      accent: "var(--accent-orange)",
    },
    {
      label: "Planned",
      value: "—",
      detail: "Nicht aus Review abgeleitet",
      accent: "var(--accent-yellow)",
    },
  ];
}

function todayClosingNotStartedItems(
  carryForwardCount: number,
): TodayReviewSignalViewModel[] {
  return [
    {
      label: "Review",
      value: "Nicht gestartet",
      detail: "Noch kein Daily Review Record",
      accent: "var(--accent-orange)",
    },
    {
      label: "Status",
      value: "Nicht gespeichert",
      detail: "Day Closeout ist offen",
      accent: "var(--accent-purple)",
    },
    {
      label: "Carry Forward",
      value: String(carryForwardCount),
      detail: "aus heutigen offenen Tasks",
      accent: "var(--accent-blue)",
    },
    {
      label: "Tomorrow Hint",
      value: "—",
      detail: "nicht gesetzt",
      accent: "var(--accent-cyan)",
    },
  ];
}

function buildProfileTodayViewModel(
  profile: ManualProfileData,
  profileId: Exclude<LifeOsProfileId, "demo">,
): TodayViewModel {
  const viewModel = clone(getDemoTodayViewModel());
  const today = todayDateLabel();
  const todayTasks = profile.tasks.filter((task) => task.date === today);
  const events = [
    ...todayTasks.map(taskToTodayEvent),
    ...profile.inboxItems.map(inboxToTodayEvent),
  ];
  const artifacts = [
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
  ];
  const carryForwardItems = todayTasks
    .filter((task) => task.status !== "done")
    .slice(0, 4)
    .map((task) => ({
      label: task.title,
      description: task.nextStep,
      accent: areaAccent(task.areaId),
    }));
  const deltaValueCount =
    todayTasks.length +
    profile.inboxItems.length +
    profile.projects.length +
    profile.goals.length;
  const hasTodayData =
    events.length > 0 || artifacts.length > 0 || carryForwardItems.length > 0;

  viewModel.profileId = profileId;
  viewModel.contentStates = buildTodayContentStates({
    activityEventCount: events.length,
    carryForwardCount: carryForwardItems.length,
    closingReviewCount: 0,
    decisionsArtifactsCount: artifacts.length,
    deltaValueCount,
    openingReviewCount: 0,
  });
  viewModel.firstRunNotice = hasTodayData
    ? undefined
    : {
        title: "Für heute wurde noch nichts erfasst.",
        description:
          "Starte mit einem Task, einem Inbox-Eintrag oder dem Opening Review.",
      };
  viewModel.header = {
    ...viewModel.header,
    dateLabel: `${
      profileId === "manual" ? "Lokaler Tag" : "Leerer Tag"
    } · ${today}`,
    summary:
      hasTodayData && profileId === "manual"
        ? "Lokale Daten aus Tasks, Inbox und Portfolio erscheinen als Tageslog."
        : "Für heute liegen noch keine lokalen Ereignisse vor. Die Tagesstruktur bleibt bereit.",
    statusPills: [
      {
        label: profileId === "manual" ? "Manual" : "Empty",
        accent: "var(--accent-cyan)",
      },
      {
        label: `${todayTasks.length} today tasks`,
        accent: "var(--accent-blue)",
      },
      {
        label: `${profile.inboxItems.length} inbox`,
        accent: "var(--accent-green)",
      },
      {
        label: `${artifacts.length} artifacts`,
        accent: "var(--accent-purple)",
      },
    ],
  };
  viewModel.activityStream = {
    ...viewModel.activityStream,
    events,
    emptyState: {
      title: "Noch keine Tagesereignisse",
      description:
        "Geplante Aufgaben, aktuelle Blöcke und geloggte Entscheidungen erscheinen hier.",
    },
  };
  viewModel.openingReview = {
    ...viewModel.openingReview,
    items: todayReviewNotSetItems(),
  };
  viewModel.deltaSummary = {
    ...viewModel.deltaSummary,
    metrics: [
      {
        label: "Today tasks",
        value: String(todayTasks.length),
        detail: "echte Tasks mit heutigem Datum",
        accent: "var(--accent-blue)",
      },
      {
        label: "Inbox captures",
        value: String(profile.inboxItems.length),
        detail: "lokale Captures",
        accent: "var(--accent-green)",
      },
      {
        label: "Artifacts",
        value: String(artifacts.length),
        detail: "Projects und Goals",
        accent: "var(--accent-orange)",
      },
      {
        label: "Review records",
        value: "—",
        detail: "noch keine lokale Review-Quelle",
        accent: "var(--accent-purple)",
      },
    ],
  };
  viewModel.decisionsLedger = {
    ...viewModel.decisionsLedger,
    decisions: [],
    emptyState: {
      title: "Noch keine Entscheidungen oder Artefakte",
      description:
        "Gespeicherte Entscheidungen, Screenshots, Notizen oder Links erscheinen hier.",
    },
  };
  viewModel.closingReview = {
    ...viewModel.closingReview,
    signals: todayClosingNotStartedItems(carryForwardItems.length),
    emptyState: {
      title: "Closing Review nicht gestartet",
      description: "Der Tagesabschluss bleibt sichtbar, bis ein Review gespeichert wird.",
    },
  };
  viewModel.carryForward = {
    ...viewModel.carryForward,
    items: carryForwardItems,
    firstMove:
      carryForwardItems[0]?.description ??
      "Ersten Tagespunkt erfassen oder Aufgabe planen.",
    emptyState: {
      title: "Kein Carry Forward",
      description:
        "Offene heutige Aufgaben und nächste Bewegungen erscheinen hier.",
    },
  };
  viewModel.evidenceArtifacts = {
    ...viewModel.evidenceArtifacts,
    artifacts,
    emptyState: {
      title: "Noch keine Artefakte",
      description:
        "Gespeicherte Screenshots, Notizen, Links oder Projektbewegungen erscheinen hier.",
    },
  };

  return viewModel;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(date.getUTCDate() + amount);
  return next;
}

function toIsoDate(date: Date) {
  return utcDateLabel(date);
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
    todayDateLabel();
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

function buildProfileCalendarViewModel(
  profile: ManualProfileData,
  profileId: Exclude<LifeOsProfileId, "demo">,
): CalendarViewModel {
  const isManualProfile = profileId === "manual";
  const days = buildManualCalendarDays(profile);
  const firstDayId = days[0]?.id ?? "manual-week";
  const demoModel = getDemoCalendarViewModel();
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
  const timedBlocks = buildCalendarTimedBlocks(rawTimedBlocks, days);
  const allDayBlocks = profile.projects.map((project) =>
    projectToAllDayBlock(project, firstDayId),
  );
  const planningQueueTasks = profile.tasks.filter(
    (task) => task.date && !task.startTime,
  );

  const schedulableTasks: CalendarViewModel["schedulableTasks"] =
    planningQueueTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: dashboardPriority(task.priority),
      area: areaLabel(task.areaId),
      project: task.projectId ?? "Manual",
      status:
        task.status === "done"
          ? ("done" as const)
          : task.status === "active"
            ? ("in-progress" as const)
            : ("open" as const),
      estimatedMinutes: task.durationMinutes ?? 30,
      dueDate: task.date,
      recentlyUpdated: "local",
      alreadyScheduled: false,
      accent: areaAccent(task.areaId),
    }))
    .slice(0, 100);

  const rightPanel = {
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
        label: "Projects",
        value: String(profile.projects.length),
        detail: "local",
        accent: "var(--accent-cyan)",
      },
      {
        label: "Inbox",
        value: String(profile.inboxItems.length),
        detail: "local",
        accent: "var(--accent-orange)",
      },
      {
        label: "Timed blocks",
        value: String(timedBlocks.length),
        detail: "visible",
        accent: "var(--accent-green)",
      },
    ],
    openLoops: profile.inboxItems.map((item) => ({
      title: item.title,
      meta: `${areaLabel(item.areaId)} - ${item.stage}`,
      accent: areaAccent(item.areaId),
    })),
    unscheduledTasks: planningQueueTasks.map((task) => ({
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
      title: "Review",
      status: "offen",
      description: "Noch kein Wochenreview im lokalen Profil.",
      placeholder: "Review-Notiz erfassen...",
      actionLabel: "Review öffnen",
    },
  } satisfies CalendarViewModel["rightPanel"];
  const daysWithContent = days.filter(
    (day) =>
      timedBlocks.some((block) => block.dayId === day.id) ||
      allDayBlocks.some((block) => block.dayId === day.id),
  ).length;
  const headerItemCount = timedBlocks.length > 0 || allDayBlocks.length > 0 ? 1 : 0;
  const planningQueueCount = planningQueueTasks.length;
  const rightPanelItemCount =
    rightPanel.metrics.length +
    rightPanel.openLoops.length +
    rightPanel.unscheduledTasks.length +
    rightPanel.reviewsOpen.length +
    rightPanel.suggestedPlanningActions.length;
  const selectedBlock = timedBlocks[0] ?? allDayBlocks[0];

  return {
    ...demoModel,
    contentStates: resolveCalendarContentStates({
      allDayBlockCount: allDayBlocks.length,
      daysWithContent,
        dayColumnItemCount: daysWithContent,
      headerItemCount,
      planningQueueCount,
      rightPanelItemCount,
      scopeRowItemCount: calendarFilters.length + rightPanel.unscheduledTasks.length,
      timedBlockCount: timedBlocks.length,
      weekStatItemCount: demoModel.weekStats.stats.length,
      viewSwitcherItemCount: calendarViewSwitches.length,
      legendItemCount: 0,
    }),
    profileId,
    header: {
      ...demoModel.header,
      dateRange: `${days[0]?.fullLabel ?? "Manual week"} - ${
        days[6]?.fullLabel ?? "Manual week"
      }`,
      summary: isManualProfile
        ? "Calendar content comes from timed local tasks and local projects only."
        : "Calendar renders an empty shell in empty mode.",
      controls: {
        currentAction: "Today",
        views: calendarViewSwitches,
      },
    },
    filters: calendarFilters,
    projectsThisWeek: profile.projects.map((project) => ({
      label: project.title,
      count: project.taskIds.length,
      accent: areaAccent(project.areaId),
    })),
    weekStats: {
      ...demoModel.weekStats,
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
          detail: "local",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Focus",
          value: String(timedBlocks.length),
          detail: "visible",
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
        detail: "offen",
        accent: "var(--accent-orange)",
      },
    ],
    },
    days,
    hours: calendarHours,
    allDayBlocks,
    timedBlocks,
    selectedBlock,
    schedulableTasks,
    rightPanel,
  };
}

export async function getEntityCollection(): Promise<EntityCollection> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return clone(demoEntityCollection);
  }

  const profile = await getProfileDataWithManualTasks(profileId);

  return {
    tasks: profile.tasks,
    projects: profile.projects,
    goals: profile.goals,
    skills: [],
    milestones: [],
  };
}

export async function getTasks(): Promise<LifeTask[]> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return [...clone(demoEntityCollection.tasks)];
  }

  if (profileId === "manual") {
    const manualTasks = await getManualTaskProfileData();

    return manualTasks.tasks;
  }

  return [...(await getProfileData(profileId)).tasks];
}

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoDashboardViewModel();
  }

  return buildProfileDashboardViewModel(
    profileId,
    await getProfileDataWithManualTasks(profileId),
  );
}

export async function getInboxViewModel(): Promise<InboxViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoInboxViewModel();
  }

  if (profileId === "manual") {
    const manualInbox = await getManualInboxProfileData();

    return buildProfileInboxViewModel(manualInbox.data, profileId, {
      unavailableReason: manualInbox.unavailableReason,
    });
  }

  return buildProfileInboxViewModel(await getProfileData(profileId), profileId);
}

export async function getTodayViewModel(): Promise<TodayViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoTodayViewModel();
  }

  return buildProfileTodayViewModel(
    await getProfileDataWithManualTasks(profileId),
    profileId,
  );
}

export async function getCalendarViewModel(): Promise<CalendarViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoCalendarViewModel();
  }

  return buildProfileCalendarViewModel(
    await getProfileDataWithManualTasks(profileId),
    profileId,
  );
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

  return buildProfileMentalHealthViewModel(
    profileId,
    await getProfileData(profileId),
  );
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
    getTasks,
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
      const auth = await createAuthenticatedSupabaseServerClient();

      if (!auth.ok) {
        throw new Error("Authenticated Supabase user is required.");
      }

      const parsed = captureInboxItemInputSchema.safeParse({
        body: input.note,
        profileId: auth.user.id,
        source: "profile_data.manual_inbox",
        title: input.title,
        type: input.type ?? "note",
        userId: auth.user.id,
      });

      if (!parsed.success) {
        throw new Error("Valid inbox input is required.");
      }

      const repository = createSupabaseInboxRepository(auth.client);
      const result = await repository.createInboxItem(parsed.data);

      if (!result.ok) {
        throw new Error("Inbox item could not be created.");
      }

      return realInboxToManualInboxItem(result.data);
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
    async createHabit(input: CreateHabitInput) {
      assertManualProfile();
      return createManualHabit(input);
    },
    async setMood(input: SetMoodInput) {
      assertManualProfile();
      return setManualMood(input);
    },
    async saveMealSlot(input: SaveMealSlotInput) {
      assertManualProfile();
      return saveManualMealSlot(input);
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
