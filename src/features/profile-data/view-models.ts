import { readTaskDependencyGraph } from "@/features/real-data/supabase/repositories/task-dependency-repository";
import { taskDependencyContext } from "@/features/real-data/domain/task-dependencies";
import { isSqliteProofRuntime } from "../../../experiments/issue-37/proof-gate";
import { mapTaskRowToDomain } from "@/features/real-data/supabase/mappers/task.mapper";
import { mapProjectRowToDomain } from "@/features/real-data/supabase/mappers/project.mapper";
import { mapGoalRowToDomain } from "@/features/real-data/supabase/mappers/goal.mapper";
import { readTodayActivity } from "@/features/real-data/supabase/repositories/supabase-today-activity-repository";
import { emptyActivitySources, projectTodayActivity } from "@/features/today/activity-projection";
import "server-only";

import { cache } from "react";

import {
  buildCalendarTimedBlocks,
  getCalendarViewModel as getDemoCalendarViewModel,
  resolveCalendarContentStates,
} from "@/features/calendar/calendar-view-model";
import { buildCalendarTemporalSignals } from "@/features/calendar/calendar-temporal-projection";
import { buildPlannerQueue } from "@/features/calendar/planner-queue";
import {
  CALENDAR_DAY_START_MINUTES,
  CALENDAR_DAY_END_MINUTES,
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
} from "@/features/dashboard/dashboard-view-model";
import {
  compareDashboardTasks,
  dashboardCalendarTimeProgress,
  dashboardLocalDate,
  dashboardTaskSelection,
  dashboardTasksForDate,
} from "@/features/dashboard/dashboard-read-model";
import { resolveContentStateMeta } from "@/features/content-state";
import {
  buildSemanticConnectedContext,
  portfolioEntityHref,
  type SemanticRelationEntry,
} from "@/features/semantic-relations/read-model";
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
  type Goal as RealDataGoal,
  type InboxItem,
  type Meal as RealDataMeal,
  type Project as RealDataProject,
  type Recipe as RealDataRecipe,
  type ReviewRecord,
  type ReviewTaskDecision,
  type RecurringTaskTemplate,
  type HealthSnapshot,
  type HabitSnapshot,
  type TrainingSnapshot,
  formatPace,
  muscleLoad,
  aggregateHabitDay,
  orderedDashboardHabits,
  resolveHabitWindow,
  type Resource as RealDataResource,
  type Skill as RealDataSkill,
  type SkillEvidence as RealDataSkillEvidence,
  type TaskSkillLink as RealDataTaskSkillLink,
  type Task as RealDataTask,
} from "@/features/real-data";
import {
  createSupabaseGoalRepository,
  createSupabaseInboxRepository,
  createSupabaseNutritionRepository,
  createSupabaseProjectRepository,
  createSupabaseReviewRepository,
  createSupabaseScheduleSourceRepository,
  createSupabaseResourceRepository,
  createSupabaseSkillRepository,
  createSupabaseTaskRepository,
  createSupabaseHealthRepository,
  createSupabaseHabitRepository,
  createSupabaseTrainingRepository,
} from "@/features/real-data/supabase";
import { getGoalOutcomeSummaries } from "@/features/real-data/supabase/repositories/supabase-goal-outcome-repository";
import type { GoalOutcomeSummary } from "@/features/real-data/domain/goal-outcome";
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
  type InboxExistingTarget,
  type InboxExistingTargets,
  InboxQueueItem,
  InboxStage,
  InboxViewModel,
} from "@/features/inbox";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
  TableRow,
} from "@/features/real-data/supabase";
import {
  getMentalHealthViewModel as getDemoMentalHealthViewModel,
  type MentalHealthPageViewModel,
} from "@/features/health/mental-health-view-model";
import {
  buildTodayContentStates,
  getTodayViewModel as getDemoTodayViewModel,
} from "@/features/today/today-view-model";
import {
  buildDailyCompanionTaskProjection,
  dailyCompanionTaskStatusLabel,
} from "@/features/today/daily-companion-read-model";
import type {
  TodayActivityEventViewModel,
  TodayPlannerTaskViewModel,
  TodayReviewSignalViewModel,
  TodayViewModel,
} from "@/features/today";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { reviewWeek } from "@/features/review/review-period";
import {
  getCurrentLifeOsProfileId,
  getLifeOsProfileSummary,
} from "./profile-cookie";
import { getPortfolioViewModel as getDemoPortfolioViewModel } from "@/features/portfolio/portfolio-view-model";
import type {
  PortfolioDecision,
  PortfolioEntity,
  PortfolioFocusLevel,
  PortfolioLinkedResource,
  PortfolioPriority,
  PortfolioResourceLinkOption,
  PortfolioSkillRelatedResource,
  PortfolioSkillEvidence,
  PortfolioSkillSourceTarget,
  PortfolioTaskSkillLink,
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

async function getProofManualData(): Promise<{
  profile: ManualProfileData;
  authAvailable: boolean;
}> {
  const { getProofOwnerId, readProofSnapshot } = await import("../../../experiments/issue-37/sqlite-proof-runtime");
  const ownerId = await getProofOwnerId();
  if (!ownerId) return { profile: emptyManualProfile(), authAvailable: false };
  const snapshot = readProofSnapshot(ownerId);
  const tasks = snapshot.tasks
    .map((row) => realTaskToLifeTask(mapTaskRowToDomain(row)))
    .filter((task): task is LifeTask => Boolean(task))
    .map((task) => ({
      ...task,
      dependencyAvailability: taskDependencyContext(snapshot.dependencyGraph, task.id).availability,
    }));
  return {
    authAvailable: true,
    profile: {
      ...emptyManualProfile(),
      tasks,
      projects: snapshot.projects.map((row) => realProjectToLifeProject(mapProjectRowToDomain(row))),
      goals: snapshot.goals.map((row) => realGoalToLifeGoal(mapGoalRowToDomain(row))),
    },
  };
}

function emptyInboxExistingTargets(): InboxExistingTargets {
  return {
    goals: [],
    projects: [],
    resources: [],
    skills: [],
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

function isWorkoutScheduleSource(task: LifeTask) {
  return task.scheduleSource?.type === "running_plan_item" || task.scheduleSource?.type === "strength_plan";
}

function workoutSourceHref(task: LifeTask) {
  return task.scheduleSource?.type === "strength_plan" ? "/health/strength" : "/health/running";
}

function projectedScheduleSourceType(task: LifeTask): "meal" | "review" | "workout" | "task" {
  if (task.scheduleSource?.type === "meal") return "meal";
  if (task.scheduleSource?.type === "review") return "review";
  return isWorkoutScheduleSource(task) ? "workout" : "task";
}

function projectedAgendaType(task: LifeTask): DashboardAgendaEvent["type"] {
  if (isWorkoutScheduleSource(task)) return "training";
  const type = projectedScheduleSourceType(task);
  return type === "workout" ? "task" : type;
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
    areaLabel: task.scheduleSource?.type === "meal" ? "Nutrition" : isWorkoutScheduleSource(task) ? "Health" : areaLabel(task.areaId),
    type: projectedAgendaType(task),
    typeLabel: task.scheduleSource?.type === "meal" ? "Meal" : task.scheduleSource?.type === "review" ? "Review" : isWorkoutScheduleSource(task) ? "Workout" : "Task",
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
    href: task.scheduleSource?.type === "meal" ? "/nutrition/meal-planner" : task.scheduleSource?.type === "review" ? `/review/${task.title.startsWith("Weekly") ? "weekly" : "daily"}` : isWorkoutScheduleSource(task) ? workoutSourceHref(task) : `/tasks/${task.id}`,
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
  const lifecycleStatus: "planned" | "active" | "done" | "blocked" =
    task.status === "done"
      ? "done"
      : task.status === "waiting"
        ? "blocked"
        : task.status === "active"
          ? "active"
          : "planned";

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
    taskLifecycle: {
      status: lifecycleStatus,
      taskId: task.id,
    },
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

function goalToPortfolioItem(
  goal: LifeGoal,
  outcome?: GoalOutcomeSummary,
): DashboardPortfolioItem {
  const achieved = outcome?.status === "achieved";
  return {
    id: goal.id,
    title: goal.title,
    label: areaLabel(goal.areaId),
    next: outcome
      ? achieved
        ? "Outcome erreicht · Verlauf prüfen."
        : outcome.readyToAchieve
          ? "Goal Review · explizite Erreichung prüfen."
          : outcome.blockers[0] ?? "Nächsten Goal-Schritt klären."
      : goal.nextStep,
    meta: outcome
      ? `${outcome.metCriteriaCount}/${outcome.activeCriteriaCount} Kriterien · ${outcome.achievedMilestoneCount}/${outcome.activeMilestoneCount} Etappen`
      : goal.horizon,
    progress: outcome ? 0 : boundedProgress(goal.progress),
    progressLabel: outcome
      ? achieved
        ? "Erreicht · Verlauf verfügbar"
        : outcome.readyToAchieve
          ? "Bereit zur Review"
          : "Outcome-Basis offen"
      : undefined,
    accent: areaAccent(goal.areaId),
    area: goal.areaId as DashboardArea,
    kind: "goal",
    href: `/goals/${goal.id}`,
  };
}

function skillToPortfolioItem(skill: LifeSkill): DashboardPortfolioItem {
  return {
    id: skill.id,
    title: skill.title,
    label: areaLabel(skill.areaId),
    next: skill.nextPractice,
    meta: skill.status,
    progress: boundedProgress(skill.progress),
    accent: areaAccent(skill.areaId),
    area: skill.areaId as DashboardArea,
    kind: "skill",
    href: `/skills/${skill.id}`,
  };
}

type DashboardNutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  completedMealCount: number;
};

type DashboardReadSources = {
  authAvailable: boolean;
  dailyDecisions: readonly ReviewTaskDecision[];
  dailyReview: ReviewRecord | null;
  skills: readonly LifeSkill[];
  meals: readonly ManualMealSlot[];
  nutrition: DashboardNutritionTotals;
  weeklyReview: ReviewRecord | null;
  health: HealthSnapshot | null;
  habits: HabitSnapshot | null;
  training: TrainingSnapshot | null;
  scheduleLinks: readonly { source_id: string; source_type: "meal" | "review" | "running_plan_item" | "strength_plan"; task_id: string }[];
  goalOutcomeSummaries: ReadonlyMap<string, GoalOutcomeSummary>;
};

const emptyDashboardReadSources: DashboardReadSources = {
  authAvailable: false,
  dailyDecisions: [],
  dailyReview: null,
  skills: [],
  meals: [],
  nutrition: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    completedMealCount: 0,
  },
  weeklyReview: null,
  health: null,
  habits: null,
  training: null,
  scheduleLinks: [],
  goalOutcomeSummaries: new Map(),
};

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

function visibleDashboardAgendaTasks(tasks: readonly LifeTask[]) {
  return [...tasks]
    .sort(compareDashboardTasks)
    .slice(0, dashboardCapacity.agenda);
}

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

function dashboardAgendaPosition(date = new Date()) {
  const minutes = minutesFromTime(localTimeLabel(date)) ?? 0;
  const start = 7 * 60;
  const end = 23 * 60;
  return Math.max(0, Math.min(100, ((minutes - start) / (end - start)) * 100));
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
  return dashboardLocalDate();
}

function scheduledTaskDate(task: RealDataTask) {
  if (!task.scheduledStartAt) return undefined;

  return localDateLabel(new Date(task.scheduledStartAt));
}

function scheduledTaskStartTime(task: RealDataTask) {
  if (!task.scheduledStartAt) return undefined;

  return localTimeLabel(new Date(task.scheduledStartAt));
}

function visibleDashboardTasks(tasks: readonly LifeTask[]) {
  return dashboardTasksForDate(tasks);
}

function emptyMealSlot(
  type: Exclude<DashboardMeal["type"], "Snack">,
): DashboardMeal {
  const defaultTimes: Record<
    Exclude<DashboardMeal["type"], "Snack">,
    string
  > = {
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
    recipeId: meal.recipeId ?? "",
    ctaLabel: meal.state === "skipped" ? "Erfassen" : "Planen",
    kcal: meal.kcal ?? (meal.state === "skipped" ? "Ausgelassen" : "-"),
    macros: meal.macros,
    name: meal.state === "skipped" ? "Ausgelassen" : meal.name || fallback.name,
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
  if (label === "Anxious" || label === "Stressed")
    return "var(--accent-orange)";
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

type PortfolioRelationLabelLookups = {
  goalOutcomeSummaries: ReadonlyMap<string, import("@/features/real-data/domain/goal-outcome").GoalOutcomeSummary>;
  goalTitles: ReadonlyMap<string, string>;
  projectTitles: ReadonlyMap<string, string>;
  resourceLinkOptions: readonly PortfolioResourceLinkOption[];
  resourceLinksByTarget: ReadonlyMap<
    string,
    readonly PortfolioLinkedResource[]
  >;
  resourceOptionsById: ReadonlyMap<string, PortfolioResourceLinkOption>;
  skillRelatedResourcesBySkillId: ReadonlyMap<
    string,
    readonly PortfolioSkillRelatedResource[]
  >;
  skillEvidenceBySourceTarget: ReadonlyMap<
    string,
    readonly PortfolioSkillEvidence[]
  >;
  skillEvidenceSourceLabels: ReadonlyMap<string, string>;
  skillSourceTargets: readonly PortfolioSkillSourceTarget[];
  skillTitles: ReadonlyMap<string, string>;
  taskSkillLinksBySkillId: ReadonlyMap<
    string,
    readonly PortfolioTaskSkillLink[]
  >;
  taskSkillLinksByTaskId: ReadonlyMap<
    string,
    readonly PortfolioTaskSkillLink[]
  >;
};

function portfolioTaskSkillLinkLookups(
  tasks: readonly LifeTask[],
  skills: readonly LifeSkill[],
  links: readonly RealDataTaskSkillLink[],
) {
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  const skillTitles = new Map(skills.map((skill) => [skill.id, skill.title]));
  const bySkillId = new Map<string, PortfolioTaskSkillLink[]>();
  const byTaskId = new Map<string, PortfolioTaskSkillLink[]>();

  for (const link of links) {
    const taskTitle = taskTitles.get(link.taskId);
    const skillTitle = skillTitles.get(link.skillId);
    if (!taskTitle || !skillTitle) continue;

    const row: PortfolioTaskSkillLink = {
      createdAt: link.createdAt,
      relationId: link.id,
      skillId: link.skillId,
      skillTitle,
      taskId: link.taskId,
      taskTitle,
    };
    bySkillId.set(link.skillId, [...(bySkillId.get(link.skillId) ?? []), row]);
    byTaskId.set(link.taskId, [...(byTaskId.get(link.taskId) ?? []), row]);
  }

  for (const rows of [...bySkillId.values(), ...byTaskId.values()]) {
    rows.sort(
      (left, right) =>
        left.taskTitle.localeCompare(right.taskTitle) ||
        left.skillTitle.localeCompare(right.skillTitle) ||
        left.relationId.localeCompare(right.relationId),
    );
  }

  return { bySkillId, byTaskId };
}

function portfolioSkillRelatedResourceLookups(
  skills: readonly LifeSkill[],
  resourceLinksByTarget: ReadonlyMap<
    string,
    readonly PortfolioLinkedResource[]
  >,
  resourceOptionsById: ReadonlyMap<string, PortfolioResourceLinkOption>,
) {
  const result = new Map<string, PortfolioSkillRelatedResource[]>();

  for (const skill of skills) {
    const byResourceId = new Map<string, PortfolioSkillRelatedResource>();
    const contextLinks = resourceLinksByTarget.get(`skill:${skill.id}`) ?? [];

    for (const link of contextLinks) {
      byResourceId.set(link.id, {
        contextRelationId: link.relationId,
        id: link.id,
        origins: ["context"],
        source: link.source,
        title: link.title,
        type: link.type,
      });
    }

    for (const evidence of skill.evidence) {
      const sourceType = "sourceType" in evidence ? evidence.sourceType : undefined;
      const sourceId = "sourceId" in evidence ? evidence.sourceId : undefined;
      if (sourceType !== "resource" || typeof sourceId !== "string") continue;

      const resource = resourceOptionsById.get(sourceId);
      if (!resource) continue;
      const current = byResourceId.get(sourceId);
      byResourceId.set(sourceId, {
        archived: resource.archived,
        contextRelationId: current?.contextRelationId,
        id: sourceId,
        origins: current ? ["context", "evidence"] : ["evidence"],
        source: resource.source,
        title: resource.title,
        type: resource.type,
      });
    }

    const rows = Array.from(byResourceId.values()).sort(
      (left, right) =>
        left.title.localeCompare(right.title, undefined, { sensitivity: "base" }) ||
        left.id.localeCompare(right.id),
    );
    result.set(skill.id, rows);
  }

  return result;
}

function isPortfolioSkillEvidenceSourceType(
  value: unknown,
): value is NonNullable<PortfolioSkillEvidence["sourceType"]> {
  return (
    value === "goal" ||
    value === "manual_note" ||
    value === "project" ||
    value === "resource" ||
    value === "task"
  );
}

function portfolioSkillEvidenceRow(
  skill: LifeSkill,
  evidence: LifeSkill["evidence"][number],
  lookups: Pick<PortfolioRelationLabelLookups, "skillEvidenceSourceLabels">,
): PortfolioSkillEvidence {
  const sourceType = "sourceType" in evidence ? evidence.sourceType : undefined;
  const sourceId = "sourceId" in evidence ? evidence.sourceId : undefined;
  const sourceLabel =
    typeof sourceType === "string" &&
    typeof sourceId === "string" &&
    sourceId.length > 0
      ? (lookups.skillEvidenceSourceLabels.get(`${sourceType}:${sourceId}`) ??
        "Nicht mehr verfügbar")
      : evidence.sourceLabel;

  return {
    detail: evidence.detail,
    evidenceDate:
      "evidenceDate" in evidence && typeof evidence.evidenceDate === "string"
        ? evidence.evidenceDate
        : undefined,
    href: evidence.href,
    id:
      "id" in evidence && typeof evidence.id === "string"
        ? evidence.id
        : undefined,
    note:
      "note" in evidence && typeof evidence.note === "string"
        ? evidence.note
        : undefined,
    skillId: skill.id,
    skillTitle: skill.title,
    sourceLabel,
    sourceType: isPortfolioSkillEvidenceSourceType(sourceType)
      ? sourceType
      : undefined,
    title: evidence.title,
    weight:
      "weight" in evidence && typeof evidence.weight === "number"
        ? evidence.weight
        : undefined,
  };
}

function portfolioSkillEvidenceBySourceTarget(
  skills: readonly LifeSkill[],
  lookups: Pick<PortfolioRelationLabelLookups, "skillEvidenceSourceLabels">,
) {
  const evidenceBySource = new Map<string, PortfolioSkillEvidence[]>();

  for (const skill of skills) {
    for (const evidence of skill.evidence) {
      const sourceType =
        "sourceType" in evidence ? evidence.sourceType : undefined;
      const sourceId = "sourceId" in evidence ? evidence.sourceId : undefined;

      if (
        (sourceType !== "project" && sourceType !== "goal") ||
        typeof sourceId !== "string" ||
        sourceId.length === 0
      ) {
        continue;
      }

      const key = `${sourceType}:${sourceId}`;
      const rows = evidenceBySource.get(key) ?? [];
      rows.push(portfolioSkillEvidenceRow(skill, evidence, lookups));
      evidenceBySource.set(key, rows);
    }
  }

  return evidenceBySource;
}

function portfolioRelationLabelLookups(
  collection: EntityCollection,
  supplemental?: {
    goalTitles?: ReadonlyMap<string, string>;
    projectTitles?: ReadonlyMap<string, string>;
  },
): PortfolioRelationLabelLookups {
  const baseLookups: PortfolioRelationLabelLookups = {
    goalOutcomeSummaries: new Map(),
    goalTitles:
      supplemental?.goalTitles ??
      new Map(collection.goals.map((goal) => [goal.id, goal.title])),
    projectTitles:
      supplemental?.projectTitles ??
      new Map(
        collection.projects.map((project) => [project.id, project.title]),
      ),
    resourceLinkOptions: [],
    resourceLinksByTarget: new Map(),
    resourceOptionsById: new Map(),
    skillEvidenceBySourceTarget: new Map(),
    skillEvidenceSourceLabels: new Map(),
    skillRelatedResourcesBySkillId: new Map(),
    skillSourceTargets: [],
    skillTitles: new Map(
      collection.skills.map((skill) => [skill.id, skill.title]),
    ),
    taskSkillLinksBySkillId: new Map(),
    taskSkillLinksByTaskId: new Map(),
  };

  return {
    ...baseLookups,
    skillEvidenceBySourceTarget: portfolioSkillEvidenceBySourceTarget(
      collection.skills,
      baseLookups,
    ),
  };
}

function linkedTitle(
  id: string | undefined,
  titles: ReadonlyMap<string, string>,
  fallback: string,
) {
  return id ? (titles.get(id) ?? fallback) : null;
}

function taskPlannerRelationLabels(
  task: LifeTask,
  lookups: PortfolioRelationLabelLookups,
) {
  return [
    ...relation(
      "Project",
      linkedTitle(
        task.projectId,
        lookups.projectTitles,
        "Project nicht gefunden",
      ) ?? undefined,
    ).map((item) => `${item.label} · ${item.value}`),
    ...relation(
      "Goal",
      linkedTitle(task.goalId, lookups.goalTitles, "Goal nicht gefunden") ??
        undefined,
    ).map((item) => `${item.label} · ${item.value}`),
  ];
}

function taskPlannerContextLabel(
  task: LifeTask,
  lookups: PortfolioRelationLabelLookups,
  fallback: string,
) {
  const labels = taskPlannerRelationLabels(task, lookups);

  return labels.length > 0 ? labels.join(" · ") : fallback;
}

function taskPortfolioRelations(
  task: LifeTask,
  lookups: PortfolioRelationLabelLookups,
) {
  const linkedSkills = lookups.taskSkillLinksByTaskId.get(task.id) ?? [];

  return [
    {
      label: "Project",
      value:
        linkedTitle(
          task.projectId,
          lookups.projectTitles,
          "Project nicht gefunden",
        ) ?? "Kein Project verknüpft",
    },
    {
      label: "Goal",
      value:
        linkedTitle(task.goalId, lookups.goalTitles, "Goal nicht gefunden") ??
        "Kein Goal verknüpft",
    },
    ...linkedSkills.map((link) => ({ label: "Skill", value: link.skillTitle })),
    ...(linkedSkills.length === 0
      ? relation(
          "Skill",
          linkedTitle(task.skillId, lookups.skillTitles, "Skill nicht gefunden") ??
            undefined,
        )
      : []),
  ];
}

function taskToPortfolioEntity(
  task: LifeTask,
  index: number,
  lookups: PortfolioRelationLabelLookups,
): PortfolioEntity {
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
    goalId: task.goalId,
    nextAction: task.nextStep,
    dueLabel: task.date ?? "No date",
    dueRank: dueRankFromDate(task.date),
    energy: task.energy,
    progress: task.status === "done" ? 100 : task.status === "active" ? 42 : 0,
    countLabel: `${task.durationMinutes ?? 30} min`,
    lastTouched: "today",
    linkedResources: lookups.resourceLinksByTarget.get(`task:${task.id}`) ?? [],
    linkedSkills: lookups.taskSkillLinksByTaskId.get(task.id) ?? [],
    recentRank: index + 1,
    projectId: task.projectId,
    reviewNeeded: task.reviewNeeded,
    blocked,
    relations: taskPortfolioRelations(task, lookups),
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
    taskLifecycle: {
      durationMinutes: task.durationMinutes ?? 30,
      plannedDate: task.date,
      scheduledTime: task.startTime,
      status: task.status,
    },
    taskEditValues: {
      areaId: task.canonicalAreaId,
      description: task.description,
      dueAt: task.dueAt?.slice(0, 10),
      durationMinutes: task.durationMinutes,
      energy: task.energy,
      goalId: task.goalId,
      nextAction: task.nextStep,
      plannedDate: task.date,
      priority: task.priority,
      projectId: task.projectId,
      status: task.status,
      title: task.title,
    },
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
  lookups: PortfolioRelationLabelLookups,
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
    goalId: project.goalId,
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
      ...relation(
        "Goal",
        linkedTitle(
          project.goalId,
          lookups.goalTitles,
          "Goal nicht gefunden",
        ) ?? undefined,
      ),
      { label: "Phase", value: project.phase },
    ],
    decisions,
    sourceLinks: [{ label: "Project", href: `/projects/${project.id}` }],
    noteSnippet: project.risk ?? project.description,
    projectEditValues: {
      deadline: project.deadline,
      description: project.description,
      goalId: project.goalId,
      nextStep: project.nextStep,
      status: project.status,
      title: project.title,
    },
    linkedResources:
      lookups.resourceLinksByTarget.get(`project:${project.id}`) ?? [],
    linkedEvidence:
      lookups.skillEvidenceBySourceTarget.get(`project:${project.id}`) ?? [],
  };
}

function goalPortfolioStatus(goal: LifeGoal): PortfolioStatus {
  if (goal.status === "active") return "active";
  if (goal.status === "achieved" || goal.status === "archived") return "done";
  return "planned";
}

function goalToPortfolioEntity(
  goal: LifeGoal,
  index: number,
  lookups: PortfolioRelationLabelLookups,
): PortfolioEntity {
  const goalOutcome = lookups.goalOutcomeSummaries.get(goal.id);
  return {
    id: goal.id,
    type: "goal",
    title: goal.title,
    description: goal.description,
    area: goal.areaId,
    status: goalPortfolioStatus(goal),
    priority: "P1",
    focusLevel: goalOutcome
      ? goalOutcome.readyToAchieve
        ? "medium"
        : "high"
      : goal.progress >= 50
        ? "medium"
        : "high",
    nextAction: goal.nextStep,
    dueLabel: goal.targetDate ?? goal.horizon,
    dueRank: goal.targetDate
      ? dueRankFromDate(goal.targetDate)
      : goal.horizon === "week" || goal.horizon === "month"
        ? 1
        : 2,
    progress: goalOutcome ? 0 : boundedProgress(goal.progress),
    countLabel: goalOutcome
      ? `${goalOutcome.metCriteriaCount} / ${goalOutcome.activeCriteriaCount} Kriterien · ${goalOutcome.achievedMilestoneCount} / ${goalOutcome.activeMilestoneCount} Milestones`
      : `${goal.linkedProjectIds.length} projects`,
    goalOutcome,
    lastTouched: "today",
    recentRank: index + 1,
    reviewNeeded: goal.reviewNotes.length > 0,
    blocked: false,
    relations: goalOutcome
      ? [
          {
            label: "Outcome",
            value: goalOutcome.readyToAchieve
              ? "bereit zur expliziten Erreichung"
              : goalOutcome.blockers.join(" · "),
          },
        ]
      : [
          { label: "Measure", value: goal.measure },
          { label: "Target", value: goal.targetValue },
        ],
    decisions: [],
    sourceLinks: [{ label: "Goal", href: `/goals/${goal.id}` }],
    noteSnippet: goal.why,
    goalEditValues: {
      description: goal.description,
      horizon: goal.horizon,
      status: goal.status,
      targetDate: goal.targetDate,
      title: goal.title,
    },
    linkedResources: lookups.resourceLinksByTarget.get(`goal:${goal.id}`) ?? [],
    linkedEvidence:
      lookups.skillEvidenceBySourceTarget.get(`goal:${goal.id}`) ?? [],
  };
}

function skillToPortfolioEntity(
  skill: LifeSkill,
  index: number,
  lookups: PortfolioRelationLabelLookups,
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
    countLabel:
      skill.evidence.length > 0
        ? `${skill.evidence.length} evidence`
        : `${skill.learningPath.length} steps`,
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
      editValues: {
        category:
          skill.targetLevel === "Evidence ausbauen"
            ? undefined
            : skill.targetLevel,
        level:
          skill.currentLevel === "Nicht gesetzt"
            ? undefined
            : skill.currentLevel,
        name: skill.title,
        status: skill.status === "paused" ? "paused" : "active",
        summary: skill.description,
      },
      nextSession: skill.nextPractice,
      evidence: `${skill.evidence.length} evidence records`,
      evidenceRows: skill.evidence.map((evidence) =>
        portfolioSkillEvidenceRow(skill, evidence, lookups),
      ),
      linkedTasks: lookups.taskSkillLinksBySkillId.get(skill.id) ?? [],
      relatedResources:
        lookups.skillRelatedResourcesBySkillId.get(skill.id) ?? [],
      sourceTargets: lookups.skillSourceTargets,
    },
  };
}

function collectionToPortfolioEntities(
  collection: EntityCollection,
  lookups = portfolioRelationLabelLookups(collection),
) {
  const entities = [
    ...collection.tasks.map((task, index) =>
      taskToPortfolioEntity(task, index, lookups),
    ),
    ...collection.projects.map((project, index) =>
      projectToPortfolioEntity(project, index, lookups),
    ),
    ...collection.goals.map((goal, index) =>
      goalToPortfolioEntity(goal, index, lookups),
    ),
    ...collection.skills.map((skill, index) =>
      skillToPortfolioEntity(skill, index, lookups),
    ),
  ];

  const byId = new Map(entities.map((entity) => [`${entity.type}:${entity.id}`, entity]));
  const relationEntry = (
    target: PortfolioEntity,
    values: Omit<SemanticRelationEntry, "archived" | "href" | "targetId" | "targetTitle" | "targetType">,
  ): SemanticRelationEntry => ({
    ...values,
    archived: false,
    href: portfolioEntityHref(
      target.type as "task" | "project" | "goal" | "skill",
      target.id,
    ),
    targetId: target.id,
    targetTitle: target.title,
    targetType: target.type,
  });

  return entities.map((entity) => {
    const candidates: SemanticRelationEntry[] = [];
    const project = entity.projectId ? byId.get(`project:${entity.projectId}`) : undefined;
    const goal = entity.goalId ? byId.get(`goal:${entity.goalId}`) : undefined;

    if (entity.type === "task" && project) candidates.push(relationEntry(project, { direct: true, direction: "outgoing", relationType: "belongs to project", source: "tasks.project_id" }));
    if (entity.type === "task" && goal) {
      candidates.push(relationEntry(goal, { direct: true, direction: "outgoing", relationType: "supports goal", source: "tasks.goal_id", origins: ["direct"] }));
    }
    if (entity.type === "task" && project?.goalId) {
      const projectGoal = byId.get(`goal:${project.goalId}`);
      if (projectGoal) candidates.push(relationEntry(projectGoal, { direct: false, direction: "outgoing", relationType: "supports goal via project", source: "tasks.project_id → projects.goal_id", origins: ["via_project"], via: { id: project.id, title: project.title, type: "project" } }));
    }
    if (entity.type === "project" && goal) candidates.push(relationEntry(goal, { direct: true, direction: "outgoing", relationType: "supports goal", source: "projects.goal_id" }));

    if (entity.type === "task") {
      for (const link of entity.linkedSkills ?? []) {
        const skill = byId.get(`skill:${link.skillId}`);
        if (skill) candidates.push(relationEntry(skill, { direct: true, direction: "outgoing", relationType: "practices/applies skill", source: "task_skill_links" }));
      }
    }
    if (entity.type === "skill") {
      for (const link of entity.skillContext?.linkedTasks ?? []) {
        const task = byId.get(`task:${link.taskId}`);
        if (task) candidates.push(relationEntry(task, { direct: true, direction: "incoming", relationType: "task practices/applies skill", source: "task_skill_links" }));
      }
    }

    for (const candidate of entities) {
      if (candidate.type === "task" && entity.type === "project" && candidate.projectId === entity.id) candidates.push(relationEntry(candidate, { direct: true, direction: "incoming", relationType: "task in project", source: "tasks.project_id" }));
      if (candidate.type === "project" && entity.type === "goal" && candidate.goalId === entity.id) candidates.push(relationEntry(candidate, { direct: true, direction: "incoming", relationType: "project supports goal", source: "projects.goal_id" }));
      if (candidate.type === "task" && entity.type === "goal") {
        if (candidate.goalId === entity.id) candidates.push(relationEntry(candidate, { direct: true, direction: "incoming", relationType: "task supports goal", source: "tasks.goal_id", origins: ["direct"] }));
        if (candidate.projectId) {
          const candidateProject = byId.get(`project:${candidate.projectId}`);
          if (candidateProject?.goalId === entity.id) candidates.push(relationEntry(candidate, { direct: false, direction: "incoming", relationType: "task supports goal via project", source: "tasks.project_id → projects.goal_id", origins: ["via_project"], via: { id: candidateProject.id, title: candidateProject.title, type: "project" } }));
        }
      }
    }

    for (const resource of entity.linkedResources ?? []) candidates.push({ archived: false, direct: true, direction: "incoming", href: `/resources?selected=${resource.id}`, relationType: resource.relationType, source: "resource_relations", targetId: resource.id, targetTitle: resource.title, targetType: "resource" });
    if (entity.type === "skill") {
      for (const resource of entity.skillContext?.relatedResources ?? []) {
        for (const origin of resource.origins) {
          candidates.push({
            archived: Boolean(resource.archived),
            direct: true,
            direction: "incoming",
            href: `/resources?selected=${resource.id}`,
            origins: [origin],
            relationType: origin,
            source: origin === "context" ? "resource_relations" : "skill_evidence",
            targetId: resource.id,
            targetTitle: resource.title,
            targetType: "resource",
          });
        }
      }
    }

    return { ...entity, connectedContext: buildSemanticConnectedContext(candidates) };
  });
}

function buildProfilePortfolioViewModel(
  profileId: LifeOsProfileId,
  collection: EntityCollection,
  relationLookups?: PortfolioRelationLabelLookups,
): PortfolioViewModel {
  const entityCount =
    collection.tasks.length +
    collection.projects.length +
    collection.goals.length +
    collection.skills.length;

  return getDemoPortfolioViewModel(
    collectionToPortfolioEntities(collection, relationLookups),
    {
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
      resourceLinkOptions: relationLookups?.resourceLinkOptions ?? [],
    },
  );
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
      header: resolveContentStateMeta({
        capacity: 1,
        itemCount: hasMood ? 1 : 0,
      }),
      journalRhythm: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
      moodPattern: resolveContentStateMeta({
        capacity: 6,
        itemCount: hasMood ? 1 : 0,
      }),
      page: resolveContentStateMeta({
        capacity: 8,
        itemCount: hasMood ? 1 : 0,
      }),
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
        detail:
          "Schlafdaten erscheinen erst, wenn eine lokale Quelle existiert.",
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
        detail:
          "Reflexionen erscheinen erst, wenn lokale Eintraege existieren.",
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
  sources: DashboardReadSources = emptyDashboardReadSources,
): DashboardViewModel {
  const viewModel = clone(getDemoDashboardViewModel());
  viewModel.profileId = profileId;
  viewModel.commandCenter.profileId = profileId;

  const tasks = visibleDashboardTasks(profile.tasks);
  const allTodayTasks = profile.tasks
    .filter((task) => task.date === dashboardLocalDate())
    .filter((task) => task.status !== "canceled")
    .sort(compareDashboardTasks);
  const taskSelection = dashboardTaskSelection(tasks);
  const inboxItems = profile.inboxItems;
  const activeTask = taskSelection.current;
  const doneTaskCount = allTodayTasks.filter(
    (task) => task.status === "done",
  ).length;
  const meals = buildMealSlots({ ...profile, meals: [...sources.meals] });
  const decidedMealCount = meals.filter(mealIsDecided).length;
  const latestMood = sources.health?.moods.find((entry) => entry.localDate === dashboardLocalDate());
  const activeMood = latestMood ? `${latestMood.mood.charAt(0).toUpperCase()}${latestMood.mood.slice(1)}` : "Empty";
  const dashboardHabits = Object.fromEntries(
    (["Morning", "Midday", "Evening"] as const).map((window) => [
      window,
      orderedDashboardHabits(
        (sources.habits?.habits ?? []).filter(
          (habit) => habit.archivedAt === null && habit.window === window,
        ),
      ).map((habit) => ({
        area: "health" as const,
        currentValue: aggregateHabitDay(
          (sources.habits?.logs ?? []).filter(
            (log) =>
              log.habitId === habit.id &&
              log.localDate === dashboardLocalDate(),
          ),
        ),
        id: habit.id,
        label: habit.name,
        marker: habit.name.slice(0, 1).toUpperCase(),
        stepValue: habit.defaultIncrement,
        targetValue: habit.dailyTarget,
        total: 5,
        unit: habit.unit ?? undefined,
      })),
    ]),
  ) as Record<HabitTrackerWindow, DashboardHabit[]>;
  const activeHabitWindow = sources.habits
    ? resolveHabitWindow(
        localTimeLabel(new Date(), sources.habits.settings.timezone),
        sources.habits.settings,
      )
    : "Morning";
  const activeHabitCount = dashboardHabits[activeHabitWindow].length;
  const portfolioItems = [
    ...profile.projects.map(projectToPortfolioItem),
    ...profile.goals.map((goal) =>
      goalToPortfolioItem(goal, sources.goalOutcomeSummaries.get(goal.id)),
    ),
    ...sources.skills.map(skillToPortfolioItem),
  ];
  const activePortfolioView =
    profile.projects.length > 0
      ? "Project View"
      : profile.goals.length > 0
        ? "Goal View"
        : sources.skills.length > 0
          ? "Skill View"
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
        value: `${doneTaskCount} / ${allTodayTasks.length}`,
        detail: allTodayTasks.length > 0 ? "Tasks for today" : "No tasks today",
        progress:
          allTodayTasks.length > 0
            ? (doneTaskCount / allTodayTasks.length) * 100
            : 0,
        accent: "var(--accent-blue)",
        area: "review",
        contentState: resolveContentStateMeta({
          capacity: dashboardCapacity.dailyControl,
          itemCount: allTodayTasks.length,
        }),
        href: "/today",
      },
      {
        label: "Focus Time",
        value: "Unavailable",
        detail: "Focus classification not implemented",
        progress: 0,
        accent: "var(--accent-blue)",
        area: "education",
        contentState: resolveContentStateMeta({
          hasPrimaryValue: false,
          itemCount: 0,
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
        value:
          sources.nutrition.completedMealCount > 0
            ? `${sources.nutrition.completedMealCount} complete`
            : decidedMealCount > 0
              ? `${decidedMealCount} planned`
              : "No meals",
        detail:
          sources.nutrition.calories > 0
            ? `${sources.nutrition.calories} kcal estimated`
            : "Recipe estimates unavailable",
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
        value:
          sources.dailyReview?.status === "completed"
            ? "Complete"
            : sources.dailyReview?.status === "draft"
              ? "Draft"
              : "Not started",
        detail: sources.weeklyReview
          ? `Weekly ${sources.weeklyReview.status}`
          : "Daily and weekly review",
        progress:
          sources.dailyReview?.status === "completed"
            ? 100
            : sources.dailyReview
              ? 50
              : 0,
        accent: "var(--accent-cyan)",
        area: "review",
        contentState: resolveContentStateMeta({
          hasPrimaryValue: Boolean(sources.dailyReview),
          itemCount: sources.dailyReview ? 1 : 0,
        }),
        href: "/review/daily",
      },
      {
        label: "Sleep",
        value: sources.health?.sleep[0] ? `${Math.floor(sources.health.sleep[0].durationMinutes / 60)}h ${String(sources.health.sleep[0].durationMinutes % 60).padStart(2, "0")}m` : "Unknown",
        detail: sources.health?.sleep[0] ? `Night ${sources.health.sleep[0].sleepDate}` : "No sleep entry",
        progress: 0,
        accent: "var(--accent-blue)",
        area: "health",
        contentState: resolveContentStateMeta({
          hasPrimaryValue: Boolean(sources.health?.sleep[0]),
          itemCount: sources.health?.sleep[0] ? 1 : 0,
        }),
        href: "/health/mental?section=sleep",
      },
    ],
    moodCheck: {
      ...viewModel.commandCenter.commandCenter.moodCheck,
      activeOption: activeMood,
      detail: moodDetail(activeMood),
      moodLabel: activeMood,
      options: sources.authAvailable ? [
        "Calm",
        "Content",
        "Focused",
        "Tired",
        "Anxious",
        "Stressed",
        "Happy",
      ] : [],
      progress: latestMood ? 100 : 0,
      progressLabel: latestMood ? "Today's signal" : "No signal",
      scoreLabel: latestMood ? "Saved" : "-",
      accent: moodAccent(activeMood),
    },
    timeProgress: dashboardCalendarTimeProgress(),
    timeProgressHref: undefined,
    weather: {
      temperatureLabel: "Unavailable",
      periodLabel: "No weather source",
      conditionLabel: "Prepared without external API",
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
          detail: "Deine heutige Queue ist noch leer.",
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
          title: "Heute planen",
          detail: "Plane oder terminiere vorhandene Tasks in Today.",
        },
    currentTask: activeTask
      ? taskToCurrentTask(activeTask)
      : {
          id: "empty-current-task",
          sectionLabel: "Current Task",
          timeRemainingLabel: "Kein Block gewählt",
          statusLabel: "Empty",
          title: "Kein aktueller Fokus",
          contextLabel: "Plane oder terminiere vorhandene Tasks in Today.",
          actionLabel: "Noch kein Task ausgewählt",
          progress: 0,
          accent: "var(--text-muted)",
          area: "review",
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
        value:
          sources.dailyReview?.status === "completed"
            ? "Complete"
            : sources.dailyReview?.status === "draft"
              ? "Draft"
              : "Not started",
        detail: sources.dailyReview ? "Saved today" : "Open Daily Review",
        accent: "var(--accent-cyan)",
      },
    ],
    queueSummary: `${Math.max(0, tasks.length - (activeTask ? 1 : 0))} queued`,
    queue: taskSelection.upNext.map(taskToQueueItem),
  };

  viewModel.todayAgenda = {
    ...viewModel.todayAgenda,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.agenda,
      itemCount: allTodayTasks.length,
    }),
    preparedViewsLabel: "Week and month views prepared",
    currentTimeLabel: localTimeLabel(new Date()),
    currentTimePositionPercent: dashboardAgendaPosition(),
    href: "/calendar",
    events: visibleDashboardAgendaTasks(allTodayTasks).map(taskToAgendaEvent),
  };

  const latestWeight = sources.health?.weights[0];
  const oldestWeight = sources.health?.weights[sources.health.weights.length - 1];
  const weightGoal = sources.health?.weightGoal;
  const weightProgress = latestWeight && oldestWeight && weightGoal && oldestWeight.weightKg !== weightGoal.targetWeightKg
    ? Math.max(0, Math.min(100, Math.round(((oldestWeight.weightKg - latestWeight.weightKg) / (oldestWeight.weightKg - weightGoal.targetWeightKg)) * 100))) : latestWeight && weightGoal && latestWeight.weightKg === weightGoal.targetWeightKg ? 100 : 0;
  viewModel.healthNutrition.weightLossGoal = {
    ...viewModel.healthNutrition.weightLossGoal,
    contentState: resolveContentStateMeta({
      hasPrimaryValue: Boolean(latestWeight),
      itemCount: latestWeight ? 1 : 0,
    }),
    title: "Weight Goal",
    href: "/health",
    currentWeight: latestWeight ? `${latestWeight.weightKg.toFixed(2)} kg` : "Unknown",
    targetLabel: weightGoal ? `Target ${weightGoal.targetWeightKg.toFixed(2)} kg${weightGoal.targetDate ? ` · ${weightGoal.targetDate}` : ""}` : "No target set",
    remainingLabel: latestWeight && weightGoal ? `${Math.abs(latestWeight.weightKg - weightGoal.targetWeightKg).toFixed(2)} kg distance` : "Progress unknown",
    weeklyStatusLabel: latestWeight && weightGoal ? `${weightProgress}%` : "Unknown",
    weeklyStatusAccent: "var(--text-muted)",
    progress: weightProgress,
  };
  viewModel.healthNutrition.nutrientBalance = {
    ...viewModel.healthNutrition.nutrientBalance,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.meals,
      itemCount: decidedMealCount,
    }),
    href: "/nutrition/meal-planner?view=today",
    lastUpdatedLabel:
      sources.nutrition.completedMealCount > 0
        ? `${sources.nutrition.completedMealCount} completed meal(s); recipe estimates only`
        : "No completed meals with nutrition estimates",
    items: [
      {
        label: "Protein",
        value:
          sources.nutrition.protein > 0
            ? `${sources.nutrition.protein} g`
            : "-",
        status: "Unavailable",
        progress: 0,
        accent: "var(--accent-red)",
        statusAccent: "var(--text-muted)",
      },
      {
        label: "Carbs",
        value:
          sources.nutrition.carbs > 0 ? `${sources.nutrition.carbs} g` : "-",
        status: "Unavailable",
        progress: 0,
        accent: "var(--accent-blue)",
        statusAccent: "var(--text-muted)",
      },
      {
        label: "Fat",
        value: sources.nutrition.fat > 0 ? `${sources.nutrition.fat} g` : "-",
        status: "Unavailable",
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
  const completedRuns = (sources.training?.runningSessions ?? []).filter((session) => session.status === "completed" && !session.archivedAt);
  const latestRun = completedRuns[0];
  const scheduledRunSourceIds = new Set(sources.scheduleLinks.filter((link) => link.source_type === "running_plan_item").map((link) => link.source_id));
  const nextRunItem = (sources.training?.runningPlanItems ?? []).find((item) => !item.archivedAt && scheduledRunSourceIds.has(item.id));
  const completedStrengthSession = (sources.training?.strengthSessions ?? []).find((session) => session.status === "completed" && !session.archivedAt);
  const completedStrengthLogs = completedStrengthSession ? (sources.training?.strengthSetLogs ?? []).filter((log) => log.sessionId === completedStrengthSession.id) : [];
  const completedMuscleLoads = muscleLoad(completedStrengthLogs, sources.training?.exercises ?? []);
  const activeStrengthPlan = (sources.training?.strengthPlans ?? []).find((plan) => !plan.archivedAt);
  const plannedExerciseIds = new Set((sources.training?.strengthPlanItems ?? []).filter((item) => item.planId === activeStrengthPlan?.id).map((item) => item.exerciseId));
  const plannedMuscles = [...new Set((sources.training?.exercises ?? []).filter((exercise) => plannedExerciseIds.has(exercise.id)).flatMap((exercise) => exercise.muscles))];
  const muscleFocusGroups = completedMuscleLoads.length > 0 ? completedMuscleLoads.slice(0, 4).map(([muscle, load]) => `${muscle} · ${load.sets} sets`) : plannedMuscles.slice(0, 4).map((muscle) => `${muscle} · planned`);
  const muscleSource = completedMuscleLoads.length > 0 ? "Latest completed session" : plannedMuscles.length > 0 ? "Active strength plan" : "No strength source";
  viewModel.healthNutrition.runningRecovery = {
    ...viewModel.healthNutrition.runningRecovery,
    contentState: resolveContentStateMeta({
      hasPrimaryValue: Boolean(latestRun || muscleFocusGroups.length),
      itemCount: Number(Boolean(latestRun)) + Number(Boolean(muscleFocusGroups.length)),
    }),
    href: "/health/running",
    subtitle: latestRun ? "Latest completed manual run" : "No completed running session",
    stats: [
      { label: "Distance", value: latestRun ? `${latestRun.distanceKm} km` : "-", delta: latestRun?.sessionDate ?? "Unavailable" },
      { label: "Pace", value: latestRun ? (formatPace(latestRun.distanceKm, latestRun.durationMinutes) ?? "-") : "-", delta: latestRun ? "Derived" : "Unavailable" },
      { label: "Time", value: latestRun ? `${latestRun.durationMinutes} min` : "-", delta: latestRun?.averageHeartRate ? `${latestRun.averageHeartRate} bpm` : "Manual log" },
    ],
    rhythm: {
      title: latestRun ? `Latest run · ${latestRun.sessionDate}` : "Noch keine Laufeinheit",
      detail: latestRun ? `${latestRun.distanceKm} km in ${latestRun.durationMinutes} min` : "Workout-Daten erscheinen nach der ersten lokalen Einheit.",
      progress: latestRun ? 100 : 0,
      statusLabel: latestRun ? "Logged" : "Unavailable",
      accent: latestRun ? "var(--accent-cyan)" : "var(--text-muted)",
    },
    todayGoalLabel: nextRunItem ? `Next: ${nextRunItem.title}` : "Today goal: not set",
    lastSyncLabel: latestRun?.completedAt ? `Logged ${latestRun.completedAt}` : "No health data",
    muscle: {
      ...viewModel.healthNutrition.runningRecovery.muscle,
      workoutId: completedStrengthSession?.id ?? activeStrengthPlan?.id ?? "no-workout",
      title: completedStrengthSession ? `Strength · ${completedStrengthSession.sessionDate}` : activeStrengthPlan?.name ?? "No strength session planned",
      detail: `${muscleSource}. ${completedStrengthLogs.length} real set log(s).`,
      focusGroups: muscleFocusGroups,
      href: "/health/strength",
      nextStep: completedStrengthSession ? "Open strength history" : activeStrengthPlan ? "Start the planned session" : "Create a strength plan",
      statusLabel: completedStrengthSession ? "Done" : activeStrengthPlan ? "Planned" : "Unavailable",
    },
  };

  viewModel.habitTrackers = {
    ...viewModel.habitTrackers,
    href: "/health/habits",
    activeWindow: activeHabitWindow,
    addHabitLabel: "Add habit",
    addHabitMeta: "open management",
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.habits,
      itemCount: activeHabitCount,
    }),
    totalSlotsLabel: `${activeHabitCount}/${dashboardCapacity.habits} · ${activeHabitWindow}`,
    habitsByWindow: dashboardHabits,
  };
  viewModel.activePortfolio = {
    ...viewModel.activePortfolio,
    activeView: activePortfolioView,
    contentState: resolveContentStateMeta({
      capacity: dashboardCapacity.activePortfolio,
      itemCount: Math.min(
        portfolioItems.length,
        dashboardCapacity.activePortfolio,
      ),
    }),
    subtitle:
      portfolioItems.length > 0
        ? "Projects, goals and skills"
        : "No active projects, goals or skills",
    href: "/portfolio",
    items: portfolioItems.slice(0, dashboardCapacity.activePortfolio),
  };
  viewModel.antiRotActions = {
    ...viewModel.antiRotActions,
    contentState: resolveContentStateMeta({
      capacity: 5,
      itemCount: 0,
    }),
    href: "/health/habits",
    donePrompt: "Prepared · Anti-Rot source not implemented",
    actions: [],
  };
  viewModel.challengesRewardFocus = {
    ...viewModel.challengesRewardFocus,
    contentState: resolveContentStateMeta({
      capacity: 3,
      itemCount: 0,
    }),
    href: "/challenges",
    summary: "Prepared · challenge source not implemented",
    measurementLabel: "Unavailable",
    rewardFocus: "Prepared",
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
    clarification: item.clarification,
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
    canonicalAreaId: task.areaId ?? undefined,
    dueAt: task.dueAt ?? undefined,
    calendarBlockIds: [],
    createdAt: task.createdAt,
    date: task.plannedDate ?? scheduledDate,
    description: (task.description ?? "").split("\n\nNächste Aktion:")[0],
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
    generatedFromTemplateId: task.generatedFromTemplateId ?? undefined,
    goalId: task.goalId ?? undefined,
    id: task.id,
    inboxItemIds: task.sourceInboxItemId ? [task.sourceInboxItemId] : [],
    instanceDate: task.instanceDate ?? undefined,
    isGenerated: Boolean(task.generatedFromTemplateId),
    nextStep:
      task.description?.split("Nächste Aktion:")[1]?.trim() ?? task.description ??
      (task.sourceInboxItemId
        ? "Review the task created from Inbox triage."
        : "Review the Supabase task."),
    priority: task.priority,
    projectId: task.projectId ?? undefined,
    resultNote: task.completedAt ? "Completed in Supabase." : undefined,
    reviewNeeded: status === "inbox",
    source: task.generatedFromTemplateId
      ? "Wiederkehrende Vorlage"
      : task.sourceInboxItemId
        ? "Supabase inbox triage"
        : "Supabase task",
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
    updatedAt: task.updatedAt,
  };
}

function realProjectToLifeProject(project: RealDataProject): LifeProject {
  return {
    activity: [
      {
        dateLabel: "DB",
        detail: "Loaded from Supabase projects.",
        label: "Read model",
      },
    ],
    areaId: "review",
    blocker: undefined,
    deadline: project.deadline ?? undefined,
    description: project.description ?? "",
    focusThisWeek: project.status === "active",
    goalId: project.goalId ?? undefined,
    id: project.id,
    milestoneIds: [],
    nextStep: project.nextStep ?? "Nächsten Projektschritt klären.",
    notes: [],
    phase: "DB Target",
    priority: project.priority,
    progress: 0,
    risk: undefined,
    skillIds: [],
    status: project.status,
    taskIds: [],
    title: project.title,
  };
}

function realGoalToLifeGoal(goal: RealDataGoal): LifeGoal {
  return {
    areaId: "review",
    currentValue: "0",
    description: goal.description ?? "",
    horizon: goal.horizon,
    id: goal.id,
    linkedProjectIds: [],
    linkedTaskIds: [],
    measure: goal.measure ?? "Nicht gesetzt",
    milestoneIds: [],
    nextStep: "Nächsten Zielschritt klären.",
    progress: 0,
    remaining: goal.targetValue ?? "Nicht gesetzt",
    reviewNotes: [],
    status: goal.status,
    targetDate: goal.targetDate ?? undefined,
    targetValue: goal.targetValue ?? "Nicht gesetzt",
    title: goal.title,
    why: goal.why ?? goal.description ?? "",
  };
}

function skillAreaFromCategory(category: string | null): EntityArea {
  const normalized = category?.toLowerCase() ?? "";

  if (
    normalized.includes("code") ||
    normalized.includes("coding") ||
    normalized.includes("typescript") ||
    normalized.includes("react")
  ) {
    return "coding";
  }

  if (normalized.includes("work")) return "work";
  if (normalized.includes("health")) return "health";
  if (normalized.includes("nutrition")) return "nutrition";
  if (normalized.includes("personal")) return "personal";

  return "education";
}

function skillStatusToLifeStatus(
  status: RealDataSkill["status"],
): LifeSkill["status"] {
  if (status === "paused" || status === "archived") return "paused";

  return "practicing";
}

function skillEvidenceSourceLabel(
  sourceType: RealDataSkillEvidence["sourceType"],
) {
  if (sourceType === "manual_note") return "Manual note";

  return sourceType;
}

function realSkillToLifeSkill(
  skill: RealDataSkill,
  evidence: readonly RealDataSkillEvidence[],
): LifeSkill {
  const latestEvidence = evidence[0];
  const evidenceCount = evidence.length;

  return {
    areaId: skillAreaFromCategory(skill.category),
    currentLevel: skill.level ?? "Nicht gesetzt",
    description: skill.summary ?? "Manual Skill ohne Summary.",
    evidence: evidence.map(
      (item) =>
        ({
          detail: [item.evidenceDate, item.note].filter(Boolean).join(" · "),
          evidenceDate: item.evidenceDate,
          id: item.id,
          note: item.note ?? undefined,
          sourceId: item.sourceId ?? undefined,
          sourceLabel: skillEvidenceSourceLabel(item.sourceType),
          sourceType: item.sourceType,
          title: item.title,
          weight: item.weight,
        }) as LifeSkill["evidence"][number],
    ),
    id: skill.id,
    lastPracticedAt: latestEvidence?.evidenceDate ?? "not practiced",
    learningPath: [],
    linkedGoalIds: [],
    linkedProjectIds: [],
    linkedTaskIds: [],
    milestoneIds: [],
    nextPractice:
      evidenceCount > 0
        ? "Nächste manuelle Evidence ergänzen."
        : "Erste manuelle Evidence ergänzen.",
    practiceFrequency:
      evidenceCount > 0
        ? `${evidenceCount} evidence records`
        : "No evidence yet",
    progress: Math.min(100, evidenceCount * 20),
    status: skillStatusToLifeStatus(skill.status),
    targetLevel: skill.category ?? "Evidence ausbauen",
    title: skill.name,
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

type ProjectTargetRow = Pick<
  TableRow<"projects">,
  "id" | "priority" | "status" | "title" | "updated_at"
>;

type GoalTargetRow = Pick<
  TableRow<"goals">,
  "horizon" | "id" | "status" | "title" | "updated_at"
>;

type ResourceTargetRow = Pick<
  TableRow<"resources">,
  "id" | "review_needed" | "title" | "type" | "updated_at"
>;

type SkillTargetRow = Pick<
  TableRow<"skills">,
  "category" | "id" | "name" | "status" | "updated_at"
>;

type PortfolioRelationTargetRow = Pick<TableRow<"projects">, "id" | "title">;
type PortfolioRelationGoalRow = Pick<TableRow<"goals">, "id" | "title">;

function targetUpdatedLabel(updatedAt: string) {
  return `updated ${updatedAt.slice(0, 10)}`;
}

function projectTargetFromRow(row: ProjectTargetRow): InboxExistingTarget {
  return {
    accent: "var(--accent-blue)",
    href: `/projects/${row.id}`,
    id: row.id,
    meta: `${row.status} · ${row.priority} · ${targetUpdatedLabel(row.updated_at)}`,
    title: row.title,
    type: "project",
  };
}

function goalTargetFromRow(row: GoalTargetRow): InboxExistingTarget {
  return {
    accent: "var(--accent-green)",
    href: `/goals/${row.id}`,
    id: row.id,
    meta: `${row.status} · ${row.horizon ?? "no horizon"} · ${targetUpdatedLabel(row.updated_at)}`,
    title: row.title,
    type: "goal",
  };
}

function resourceTargetFromRow(row: ResourceTargetRow): InboxExistingTarget {
  return {
    accent: "var(--accent-yellow)",
    href: "/resources",
    id: row.id,
    meta: `${row.type} · ${
      row.review_needed ? "review needed" : "no review flag"
    } · ${targetUpdatedLabel(row.updated_at)}`,
    title: row.title,
    type: "resource",
  };
}

function skillTargetFromRow(row: SkillTargetRow): InboxExistingTarget {
  return {
    accent: "var(--accent-purple)",
    href: `/portfolio?view=skills&selected=${row.id}`,
    id: row.id,
    meta: `${row.status} · ${row.category ?? "no category"} · ${targetUpdatedLabel(row.updated_at)}`,
    title: row.name,
    type: "skill",
  };
}

async function getManualInboxExistingTargets(
  client: SupabaseClientLike,
  userId: string,
): Promise<InboxExistingTargets> {
  const [projectResult, goalResult, resourceResult, skillResult] = await Promise.all([
    (async () =>
      (await client
        .from("projects")
        .select("id,title,status,priority,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(12)) as SupabaseQueryResult<readonly ProjectTargetRow[]>)(),
    (async () =>
      (await client
        .from("goals")
        .select("id,title,status,horizon,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(12)) as SupabaseQueryResult<readonly GoalTargetRow[]>)(),
    (async () =>
      (await client
        .from("resources")
        .select("id,title,type,review_needed,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(12)) as SupabaseQueryResult<readonly ResourceTargetRow[]>)(),
    (async () =>
      (await client
        .from("skills")
        .select("id,name,status,category,updated_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(12)) as SupabaseQueryResult<readonly SkillTargetRow[]>)(),
  ]);

  return {
    goals: goalResult.error
      ? []
      : (goalResult.data ?? []).map(goalTargetFromRow),
    projects: projectResult.error
      ? []
      : (projectResult.data ?? []).map(projectTargetFromRow),
    resources: resourceResult.error
      ? []
      : (resourceResult.data ?? []).map(resourceTargetFromRow),
    skills: skillResult.error ? [] : (skillResult.data ?? []).map(skillTargetFromRow),
  };
}

async function getManualInboxProfileData(): Promise<{
  data: ManualProfileData;
  existingTargets: InboxExistingTargets;
  unavailableReason?: string;
}> {
  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      data: emptyManualProfile(),
      existingTargets: emptyInboxExistingTargets(),
      unavailableReason: manualDbUnavailableReason(
        auth.error,
        "DB-backed Inbox Items zu laden",
      ),
    };
  }

  const repository = createSupabaseInboxRepository(auth.client);
  const result = await repository.getInboxItemsByUser(
    auth.user.id,
    auth.user.id,
  );

  if (!result.ok) {
    return {
      data: emptyManualProfile(),
      existingTargets: emptyInboxExistingTargets(),
      unavailableReason:
        "Inbox Items konnten nicht aus Supabase geladen werden.",
    };
  }

  const existingTargets = await getManualInboxExistingTargets(
    auth.client,
    auth.user.id,
  );

  return {
    data: {
      ...emptyManualProfile(),
      inboxItems: result.data.filter(item => item.status === "raw" || item.status === "clarified").map(realInboxToManualInboxItem),
    },
    existingTargets,
  };
}

async function getManualTasksFromSupabase(
  client: SupabaseClientLike,
  userId: string,
): Promise<{
  tasks: LifeTask[];
  unavailableReason?: string;
}> {
  const repository = createSupabaseTaskRepository(client);
  const result = await repository.getTasksByUser({
    profileId: userId,
    sortBy: "created",
    userId,
  });

  if (!result.ok) {
    return {
      tasks: [],
      unavailableReason: "Tasks konnten nicht aus Supabase geladen werden.",
    };
  }

  try {
    const graph = await readTaskDependencyGraph(client);
    return {
      tasks: result.data
        .map(realTaskToLifeTask)
        .filter((task): task is LifeTask => Boolean(task))
        .map(task => ({
          ...task,
          dependencyAvailability: taskDependencyContext(graph, task.id).availability,
        })),
    };
  } catch {
    return {
      tasks: [],
      unavailableReason: "Task Dependencies konnten nicht geladen werden.",
    };
  }
}

async function getManualTaskProfileData(): Promise<{
  tasks: LifeTask[];
  unavailableReason?: string;
}> {
  if (isSqliteProofRuntime()) {
    const proof = await getProofManualData();
    return {
      tasks: proof.profile.tasks,
      unavailableReason: proof.authAvailable ? undefined : "Proof-Owner nicht authentifiziert.",
    };
  }
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

  return getManualTasksFromSupabase(auth.client, auth.user.id);
}

function uniqueDefined(values: readonly (string | undefined)[]) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function titleMapFromRows(rows: readonly { id: string; title: string }[]) {
  return new Map(rows.map((row) => [row.id, row.title]));
}

function portfolioResourceSourceLabel(resource: RealDataResource) {
  if (resource.source) return resource.source;
  if (resource.url) return "URL";
  return null;
}

async function getManualPortfolioResourceLinks(
  client: SupabaseClientLike,
  userId: string,
): Promise<{
  linksByTarget: ReadonlyMap<string, readonly PortfolioLinkedResource[]>;
  options: readonly PortfolioResourceLinkOption[];
  optionsById: ReadonlyMap<string, PortfolioResourceLinkOption>;
}> {
  const repository = createSupabaseResourceRepository(client);
  const [resourceResult, relationResult] = await Promise.all([
    repository.getResourcesByUser(userId, userId, true),
    repository.getResourceRelationsByUser(userId, userId),
  ]);

  if (!resourceResult.ok || !relationResult.ok) {
    return {
      linksByTarget: new Map(),
      options: [],
      optionsById: new Map(),
    };
  }

  const resourcesById = new Map(
    resourceResult.data.map((resource) => [resource.id, resource]),
  );
  const allOptions = resourceResult.data.map((resource) => ({
    archived: Boolean(resource.archivedAt),
    id: resource.id,
    source: portfolioResourceSourceLabel(resource),
    title: resource.title,
    type: resource.type,
  }));
  const options = allOptions.filter((resource) => !resource.archived).slice(0, 48);
  const optionsById = new Map(allOptions.map((resource) => [resource.id, resource]));
  const linksByTarget = new Map<string, PortfolioLinkedResource[]>();

  for (const relation of relationResult.data) {
    if (relation.targetType !== "project" && relation.targetType !== "goal" && relation.targetType !== "task" && relation.targetType !== "skill") {
      continue;
    }

    const resource = resourcesById.get(relation.resourceId);
    if (!resource) continue;

    const targetKey = `${relation.targetType}:${relation.targetId}`;
    const links = linksByTarget.get(targetKey) ?? [];
    links.push({
      archived: Boolean(resource.archivedAt),
      createdAt: relation.createdAt,
      id: resource.id,
      relationId: relation.id,
      relationType: relation.relationType,
      source: portfolioResourceSourceLabel(resource),
      title: resource.title,
      type: resource.type,
    });
    linksByTarget.set(targetKey, links);
  }

  return {
    linksByTarget,
    options,
    optionsById,
  };
}

async function getManualProjectGoalTargetsFromSupabase(
  client: SupabaseClientLike,
  userId: string,
): Promise<{
  goals: LifeGoal[];
  projects: LifeProject[];
}> {
  const [projectResult, goalResult] = await Promise.all([
    createSupabaseProjectRepository(client).getProjectsByUser(userId, userId),
    createSupabaseGoalRepository(client).getGoalsByUser(userId, userId),
  ]);

  return {
    goals: goalResult.ok ? goalResult.data.map(realGoalToLifeGoal) : [],
    projects: projectResult.ok
      ? projectResult.data.map(realProjectToLifeProject)
      : [],
  };
}

async function getManualSkillsFromSupabase(
  client: SupabaseClientLike,
  userId: string,
): Promise<{
  skills: LifeSkill[];
  taskSkillLinks: RealDataTaskSkillLink[];
}> {
  const repository = createSupabaseSkillRepository(client);
  const [skillResult, evidenceResult, taskSkillLinkResult] = await Promise.all([
    repository.getActiveSkillsByUser(userId),
    repository.getSkillEvidenceByUser(userId),
    repository.getTaskSkillLinksByUser(userId),
  ]);

  if (!skillResult.ok || !evidenceResult.ok) {
    return {
      skills: [],
      taskSkillLinks: [],
    };
  }

  const evidenceBySkillId = new Map<string, RealDataSkillEvidence[]>();

  for (const evidence of evidenceResult.data) {
    const rows = evidenceBySkillId.get(evidence.skillId) ?? [];
    rows.push(evidence);
    evidenceBySkillId.set(evidence.skillId, rows);
  }

  return {
    skills: skillResult.data.map((skill) =>
      realSkillToLifeSkill(skill, evidenceBySkillId.get(skill.id) ?? []),
    ),
    taskSkillLinks: taskSkillLinkResult.ok ? [...taskSkillLinkResult.data] : [],
  };
}

function skillSourceTarget(
  sourceType: PortfolioSkillSourceTarget["sourceType"],
  id: string,
  label: string,
  meta?: string,
): PortfolioSkillSourceTarget {
  return {
    id,
    label,
    meta,
    sourceType,
  };
}

async function getManualSkillSourceTargets(
  client: SupabaseClientLike,
  userId: string,
  input: {
    goals: readonly LifeGoal[];
    projects: readonly LifeProject[];
    tasks: readonly LifeTask[];
  },
): Promise<{
  labels: ReadonlyMap<string, string>;
  targets: readonly PortfolioSkillSourceTarget[];
}> {
  const resourceResult = await createSupabaseResourceRepository(
    client,
  ).getResourcesByUser(userId, userId);

  const taskTargets = input.tasks
    .slice(0, 24)
    .map((task) => skillSourceTarget("task", task.id, task.title, task.status));
  const projectTargets = input.projects
    .slice(0, 24)
    .map((project) =>
      skillSourceTarget("project", project.id, project.title, project.status),
    );
  const goalTargets = input.goals
    .slice(0, 24)
    .map((goal) => skillSourceTarget("goal", goal.id, goal.title, goal.status));
  const resourceTargets = resourceResult.ok
    ? resourceResult.data
        .slice(0, 24)
        .map((resource) =>
          skillSourceTarget(
            "resource",
            resource.id,
            resource.title,
            resource.type,
          ),
        )
    : [];
  const targets = [
    ...projectTargets,
    ...resourceTargets,
    ...goalTargets,
    ...taskTargets,
  ];

  return {
    labels: new Map(
      targets.map((target) => [
        `${target.sourceType}:${target.id}`,
        target.label,
      ]),
    ),
    targets,
  };
}

async function getManualPortfolioRelationLabelLookups(
  client: SupabaseClientLike,
  userId: string,
  tasks: readonly LifeTask[],
  skills: readonly LifeSkill[] = [],
  taskSkillLinks: readonly RealDataTaskSkillLink[] = [],
  skillSourceTargets?: {
    labels: ReadonlyMap<string, string>;
    targets: readonly PortfolioSkillSourceTarget[];
  },
  goalOutcomeSummaries: ReadonlyMap<string, import("@/features/real-data/domain/goal-outcome").GoalOutcomeSummary> = new Map(),
): Promise<PortfolioRelationLabelLookups> {
  const projectIds = uniqueDefined(tasks.map((task) => task.projectId));
  const projectResult = projectIds.length > 0
    ? ((await client
        .from("projects")
        .select("id,title")
        .eq("user_id", userId)
        .is("archived_at", null)
        .in("id", projectIds)) as SupabaseQueryResult<
        readonly PortfolioRelationTargetRow[]
      >)
    : ({
        data: [],
        error: null,
      } as SupabaseQueryResult<readonly PortfolioRelationTargetRow[]>);
  const goalIds = uniqueDefined(tasks.map((task) => task.goalId));
  const goalResult = goalIds.length > 0
    ? ((await client
        .from("goals")
        .select("id,title")
        .eq("user_id", userId)
        .is("archived_at", null)
        .in("id", goalIds)) as SupabaseQueryResult<
        readonly PortfolioRelationGoalRow[]
      >)
    : ({
        data: [],
        error: null,
      } as SupabaseQueryResult<readonly PortfolioRelationGoalRow[]>);
  const resourceLookups = await getManualPortfolioResourceLinks(client, userId);
  const taskSkillLookups = portfolioTaskSkillLinkLookups(
    tasks,
    skills,
    taskSkillLinks,
  );
  const baseLookups: PortfolioRelationLabelLookups = {
    goalOutcomeSummaries,
    goalTitles: goalResult.error
      ? new Map()
      : titleMapFromRows(goalResult.data ?? []),
    projectTitles: projectResult.error
      ? new Map()
      : titleMapFromRows(projectResult.data ?? []),
    resourceLinkOptions: resourceLookups.options,
    resourceLinksByTarget: resourceLookups.linksByTarget,
    resourceOptionsById: resourceLookups.optionsById,
    skillEvidenceBySourceTarget: new Map(),
    skillEvidenceSourceLabels: skillSourceTargets?.labels ?? new Map(),
    skillRelatedResourcesBySkillId: portfolioSkillRelatedResourceLookups(
      skills,
      resourceLookups.linksByTarget,
      resourceLookups.optionsById,
    ),
    skillSourceTargets: skillSourceTargets?.targets ?? [],
    skillTitles: new Map(skills.map((skill) => [skill.id, skill.title])),
    taskSkillLinksBySkillId: taskSkillLookups.bySkillId,
    taskSkillLinksByTaskId: taskSkillLookups.byTaskId,
  };

  return {
    ...baseLookups,
    skillEvidenceBySourceTarget: portfolioSkillEvidenceBySourceTarget(
      skills,
      baseLookups,
    ),
  };
}

async function getManualPortfolioEntityCollection(): Promise<{
  collection: EntityCollection;
  relationLookups?: PortfolioRelationLabelLookups;
}> {
  if (isSqliteProofRuntime()) {
    const proof = await getProofManualData();
    const collection: EntityCollection = {
      tasks: proof.profile.tasks,
      projects: proof.profile.projects,
      goals: proof.profile.goals,
      skills: [],
      milestones: [],
    };
    return { collection, relationLookups: portfolioRelationLabelLookups(collection) };
  }
  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    const profile = await readManualProfile();
    const collection: EntityCollection = {
      tasks: [],
      projects: profile.projects,
      goals: profile.goals,
      skills: [],
      milestones: [],
    };

    return {
      collection,
      relationLookups: portfolioRelationLabelLookups(collection),
    };
  }

  const [profile, manualTasks, manualTargets, manualSkills] = await Promise.all(
    [
      readManualProfile(),
      getManualTasksFromSupabase(auth.client, auth.user.id),
      getManualProjectGoalTargetsFromSupabase(auth.client, auth.user.id),
      getManualSkillsFromSupabase(auth.client, auth.user.id),
    ],
  );
  const goalOutcomeResult = await getGoalOutcomeSummaries(
    auth.client,
    auth.user.id,
    manualTargets.goals.map((goal) => goal.id),
  );
  const goalOutcomeSummaries = goalOutcomeResult.ok
    ? new Map(goalOutcomeResult.data.map((summary) => [summary.goalId, summary]))
    : new Map();
  const skillIdsByTaskId = new Map<string, string[]>();

  for (const link of manualSkills.taskSkillLinks) {
    const skillIds = skillIdsByTaskId.get(link.taskId) ?? [];
    skillIds.push(link.skillId);
    skillIdsByTaskId.set(link.taskId, skillIds);
  }

  const tasks = manualTasks.tasks.map((task) => {
    const skillIds = skillIdsByTaskId.get(task.id);

    return skillIds?.length ? { ...task, skillIds } : task;
  });
  const collection: EntityCollection = {
    tasks,
    projects: [...manualTargets.projects, ...profile.projects],
    goals: [...manualTargets.goals, ...profile.goals],
    skills: manualSkills.skills,
    milestones: [],
  };
  const skillSourceTargets = await getManualSkillSourceTargets(
    auth.client,
    auth.user.id,
    {
      goals: manualTargets.goals,
      projects: manualTargets.projects,
      tasks: manualTasks.tasks,
    },
  );

  return {
    collection,
    relationLookups: await getManualPortfolioRelationLabelLookups(
      auth.client,
      auth.user.id,
      collection.tasks,
      collection.skills,
      manualSkills.taskSkillLinks,
      skillSourceTargets,
      goalOutcomeSummaries,
    ),
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

function dashboardMealType(
  mealType: RealDataMeal["mealType"],
): ManualMealSlot["type"] | null {
  if (mealType === "breakfast") return "Breakfast";
  if (mealType === "lunch") return "Lunch";
  if (mealType === "dinner") return "Dinner";
  return null;
}

function nutritionNumber(
  estimate: RealDataRecipe["nutritionEstimate"],
  key: "calories" | "carbs" | "fat" | "protein",
) {
  const value = estimate?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function realMealToDashboardSlot(
  meal: RealDataMeal,
  recipe: RealDataRecipe | undefined,
): ManualMealSlot | null {
  const type = dashboardMealType(meal.mealType);
  if (!type) return null;
  const estimate = recipe?.nutritionEstimate ?? null;
  const recipeServings = recipe?.servings ?? 1;
  const servingScale = meal.servings / recipeServings;
  const macros = [
    nutritionNumber(estimate, "protein") > 0
      ? `P ${nutritionNumber(estimate, "protein") * servingScale}g`
      : null,
    nutritionNumber(estimate, "carbs") > 0
      ? `C ${nutritionNumber(estimate, "carbs") * servingScale}g`
      : null,
    nutritionNumber(estimate, "fat") > 0
      ? `F ${nutritionNumber(estimate, "fat") * servingScale}g`
      : null,
  ].filter((value): value is string => Boolean(value));
  const calories = nutritionNumber(estimate, "calories") * servingScale;

  return {
    id: meal.id,
    recipeId: recipe?.id,
    kcal: calories > 0 ? `${calories} kcal` : undefined,
    macros,
    name: meal.title,
    state: meal.completedAt ? "logged" : "planned",
    time: meal.plannedAt ? localTimeLabel(new Date(meal.plannedAt)) : "12:00",
    type,
    updatedAt: meal.updatedAt,
  };
}

async function getManualDashboardReadData(): Promise<{
  profile: ManualProfileData;
  sources: DashboardReadSources;
}> {
  if (isSqliteProofRuntime()) {
    const proof = await getProofManualData();
    return {
      profile: proof.profile,
      sources: { ...emptyDashboardReadSources, authAvailable: proof.authAvailable },
    };
  }
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) {
    return {
      profile: emptyManualProfile(),
      sources: emptyDashboardReadSources,
    };
  }

  const userId = auth.user.id;
  const nutritionRepository = createSupabaseNutritionRepository(auth.client);
  const week = reviewWeek(dashboardLocalDate());
  const reviewRepository = createSupabaseReviewRepository(auth.client);
  const healthRepository = createSupabaseHealthRepository(auth.client);
  const habitRepository = createSupabaseHabitRepository(auth.client);
  const trainingRepository = createSupabaseTrainingRepository(auth.client);
  const [
    taskResult,
    inboxResult,
    targets,
    skills,
    mealResult,
    recipeResult,
    dailyReviewResult,
    weeklyReviewResult,
    healthSnapshot,
    habitSnapshot,
    scheduleLinkResult,
    trainingSnapshot,
  ] = await Promise.all([
    getManualTasksFromSupabase(auth.client, userId),
    createSupabaseInboxRepository(auth.client).getInboxItemsByUser(
      userId,
      userId,
    ),
    getManualProjectGoalTargetsFromSupabase(auth.client, userId),
    getManualSkillsFromSupabase(auth.client, userId),
    nutritionRepository.getMealsByUserAndDateRange({
      endDate: dashboardLocalDate(),
      profileId: userId,
      startDate: dashboardLocalDate(),
      userId,
    }),
    nutritionRepository.getActiveRecipesByUser(userId, userId),
    reviewRepository.getReviewByPeriod(
      userId,
      userId,
      "daily",
      dashboardLocalDate(),
    ),
    reviewRepository.getReviewByPeriod(userId, userId, "weekly", week.start),
    healthRepository.getSnapshot(userId, userId),
    habitRepository.getSnapshot(userId, userId, dashboardLocalDate(), dashboardLocalDate()),
    createSupabaseScheduleSourceRepository(auth.client).getLinks(userId),
    trainingRepository.getSnapshot(userId),
  ]);
  const scheduleLinks = scheduleLinkResult.error ? [] : (scheduleLinkResult.data ?? []);
  const scheduleLinkByTask = new Map(scheduleLinks.map((link) => [link.task_id, link]));
  const linkedTasks = taskResult.tasks.map((task) => {
    const link = scheduleLinkByTask.get(task.id);
    return link ? { ...task, scheduleSource: { id: link.source_id, type: link.source_type } } : task;
  });
  const recipes = recipeResult.ok ? recipeResult.data : [];
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const realMeals = mealResult.ok ? mealResult.data : [];
  const meals = realMeals
    .map((meal) =>
      realMealToDashboardSlot(
        meal,
        meal.recipeId ? recipeById.get(meal.recipeId) : undefined,
      ),
    )
    .filter((meal): meal is ManualMealSlot => Boolean(meal));
  const completedMeals = realMeals.filter((meal) => meal.completedAt);
  const dailyReview = dailyReviewResult.ok ? dailyReviewResult.data : null;
  const dailyDecisionResult = dailyReview
    ? await reviewRepository.getTaskDecisions(userId, dailyReview.id)
    : { data: [], ok: true as const };
  const nutrition = completedMeals.reduce<DashboardNutritionTotals>(
    (totals, meal) => {
      const estimate = meal.recipeId
        ? (recipeById.get(meal.recipeId)?.nutritionEstimate ?? null)
        : null;
      const recipeServings = meal.recipeId
        ? (recipeById.get(meal.recipeId)?.servings ?? 1)
        : 1;
      const servingScale = meal.servings / recipeServings;
      totals.calories += nutritionNumber(estimate, "calories") * servingScale;
      totals.protein += nutritionNumber(estimate, "protein") * servingScale;
      totals.carbs += nutritionNumber(estimate, "carbs") * servingScale;
      totals.fat += nutritionNumber(estimate, "fat") * servingScale;
      totals.completedMealCount += 1;
      return totals;
    },
    { calories: 0, carbs: 0, completedMealCount: 0, fat: 0, protein: 0 },
  );
  const goalOutcomeResult = await getGoalOutcomeSummaries(
    auth.client,
    userId,
    targets.goals.map((goal) => goal.id),
  );
  const goalOutcomeSummaries = goalOutcomeResult.ok
    ? new Map(goalOutcomeResult.data.map((summary) => [summary.goalId, summary]))
    : new Map<string, GoalOutcomeSummary>();

  return {
    profile: {
      ...emptyManualProfile(),
      goals: targets.goals,
      inboxItems: inboxResult.ok
        ? inboxResult.data.filter(item => item.status === "raw" || item.status === "clarified").map(realInboxToManualInboxItem)
        : [],
      projects: targets.projects,
      tasks: linkedTasks,
    },
    sources: {
      authAvailable: true,
      dailyDecisions: dailyDecisionResult.ok ? dailyDecisionResult.data : [],
      dailyReview,
      meals,
      nutrition,
      skills: skills.skills,
      weeklyReview: weeklyReviewResult.ok ? weeklyReviewResult.data : null,
      health: healthSnapshot,
      habits: habitSnapshot.ok ? habitSnapshot.data : null,
      scheduleLinks,
      training: trainingSnapshot.ok ? trainingSnapshot.data : null,
      goalOutcomeSummaries,
    },
  };
}

async function getManualPlannerRelationLabelLookups(
  profileId: LifeOsProfileId,
  tasks: readonly LifeTask[],
) {
  if (profileId !== "manual" || tasks.length === 0) return undefined;

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) return undefined;

  const skills = await getManualSkillsFromSupabase(auth.client, auth.user.id);

  return getManualPortfolioRelationLabelLookups(
    auth.client,
    auth.user.id,
    tasks,
    skills.skills,
    skills.taskSkillLinks,
  );
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
    existingTargets?: InboxExistingTargets;
    selectedInboxItemId?: string;
    unavailableReason?: string;
  }> = {},
): InboxViewModel {
  const viewModel = clone(getDemoInboxViewModel());
  const isManual = profileId === "manual";
  const existingTargets =
    options.existingTargets ?? emptyInboxExistingTargets();
  const relatedTargets = [
    ...existingTargets.projects,
    ...existingTargets.goals,
    ...existingTargets.resources,
    ...existingTargets.skills,
  ].slice(0, 5);
  const active =
    profile.inboxItems.find(
      (item) => item.id === options.selectedInboxItemId,
    ) ??
    profile.inboxItems[0] ??
    null;
  const queue = profile.inboxItems.map((item) =>
    manualInboxToQueueItem(item, item.id === active?.id),
  );
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
    relatedContextCount: relatedTargets.length,
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
  viewModel.existingTargets = existingTargets;
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
    clarification: active?.clarification,
    id: active?.id,
    isTaskCapture: activeIsTaskCapture,
    persistedAreaId: active?.sourceAreaId ?? null,
    portfolioHref:
      activeIsTriaged && active?.triagedTaskId
        ? `/portfolio?view=tasks&selected=${active.triagedTaskId}`
        : undefined,
    priority: active?.priority ?? "P2",
    title: active?.title ?? "Kein Eintrag ausgewählt",
    triagedTaskId: active?.triagedTaskId ?? null,
    stage: activeIsTriaged
      ? "Triaged"
      : active
        ? getInboxStageLabel(active.stage)
        : "—",
    type: active ? getInboxCaptureTypeLabel(active.type) : "—",
    originalCapture: active?.clarification ? [active.clarification.originalTitle, active.clarification.originalBody].filter(Boolean).join("\n\n") : active?.note ?? "",
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
        value: active?.clarification?.nextAction ?? "",
      },
      {
        label: "Missing Info",
        value: active?.clarification?.missingInfo ?? "",
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
      description:
        "Wähle einen echten Eintrag aus, bevor Vorschläge entstehen.",
    },
  };
  viewModel.checklist = {
    ...viewModel.checklist,
    progress: `${checklistDoneCount} / 4 ready`,
    items: checklistItems,
  };
  viewModel.relatedContext = {
    ...viewModel.relatedContext,
    items: relatedTargets.map((target) => ({
      accent: target.accent,
      meta: target.meta,
      name: target.title,
      score: "DB",
      typeArea:
        target.type === "project"
          ? "Project"
          : target.type === "goal"
            ? "Goal"
            : "Resource",
    })),
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
    statusLabel: dailyCompanionTaskStatusLabel(task),
    eventType: projectedScheduleSourceType(task),
    eventTypeLabel: task.scheduleSource?.type === "meal" ? "Meal" : task.scheduleSource?.type === "review" ? "Review" : isWorkoutScheduleSource(task) ? "Workout" : "Task",
    title: task.title,
    description: task.description,
    sourceLabel: task.scheduleSource?.type === "meal" ? "Nutrition" : task.scheduleSource?.type === "review" ? "Reviews" : isWorkoutScheduleSource(task) ? "Health" : "Tasks",
    areaLabel: task.scheduleSource?.type === "meal" ? "Nutrition" : isWorkoutScheduleSource(task) ? "Health" : areaLabel(task.areaId),
    linkedEntityType: projectedScheduleSourceType(task),
    linkedEntityId: task.scheduleSource?.id ?? task.id,
    sourceHref: task.scheduleSource?.type === "meal" ? "/nutrition/meal-planner" : task.scheduleSource?.type === "review" ? `/review/${task.title.startsWith("Weekly") ? "weekly" : "daily"}` : isWorkoutScheduleSource(task) ? workoutSourceHref(task) : `/tasks/${task.id}`,
    sourceActionLabel: "Open source",
    accent: areaAccent(task.areaId),
    isGenerated: task.isGenerated,
    taskLifecycle: {
      status:
        task.status === "done"
          ? "completed"
          : task.status === "active"
            ? "current"
            : "planned",
      taskId: task.id,
    },
  };
}

function taskHasPlanningSignals(task: LifeTask) {
  return (
    task.priority !== "none" ||
    Boolean(task.energy) ||
    Boolean(task.durationMinutes) ||
    task.reviewNeeded ||
    Boolean(task.inboxItemIds?.length)
  );
}

function isOpenTask(task: LifeTask) {
  return task.status !== "done" && task.status !== "canceled";
}

function taskCandidateReason(task: LifeTask) {
  if (task.isGenerated) return "Wiederkehrend";

  const signals = [
    task.priority !== "none" ? task.priority : null,
    task.energy ? `${task.energy} energy` : null,
    task.durationMinutes ? `${task.durationMinutes} min` : null,
    task.reviewNeeded ? "review needed" : null,
    task.inboxItemIds?.length ? "from Inbox" : null,
  ].filter((item): item is string => Boolean(item));

  return signals.length > 0 ? signals.join(" · ") : "Planning Signal";
}

function taskEnergyRank(task: LifeTask) {
  if (task.energy === "high") return 0;
  if (task.energy === "medium") return 1;
  if (task.energy === "low") return 2;

  return 3;
}

function sortTodayCandidateTasks(left: LifeTask, right: LifeTask) {
  const priorityCompare =
    taskPriorityOrder[left.priority] - taskPriorityOrder[right.priority];
  if (priorityCompare !== 0) return priorityCompare;

  const energyCompare = taskEnergyRank(left) - taskEnergyRank(right);
  if (energyCompare !== 0) return energyCompare;

  const durationCompare =
    (left.durationMinutes ?? 30) - (right.durationMinutes ?? 30);
  if (durationCompare !== 0) return durationCompare;

  return (right.createdAt ?? right.id).localeCompare(left.createdAt ?? left.id);
}

function taskToTodayPlannerTask(
  task: LifeTask,
  lookups: PortfolioRelationLabelLookups,
): TodayPlannerTaskViewModel {
  return {
    id: task.id,
    title: task.title,
    priority: dashboardPriority(task.priority),
    energy: task.energy,
    durationMinutes: task.durationMinutes ?? 30,
    contextLabel: taskPlannerContextLabel(task, lookups, task.source ?? "Task"),
    candidateReason: taskCandidateReason(task),
    accent: areaAccent(task.areaId),
    isGenerated: task.isGenerated,
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
  relationLookups?: PortfolioRelationLabelLookups,
  options: {
    dailyDecisions?: readonly ReviewTaskDecision[];
    dailyReview?: ReviewRecord | null;
    manualDbAvailable?: boolean;
    recurringTemplates?: readonly RecurringTaskTemplate[];
  } = {},
): TodayViewModel {
  const viewModel = clone(getDemoTodayViewModel());
  const plannerRelationLookups =
    relationLookups ??
    portfolioRelationLabelLookups({
      goals: profile.goals,
      milestones: [],
      projects: profile.projects,
      skills: [],
      tasks: profile.tasks,
    });
  const today = todayDateLabel();
  const dailyTaskProjection = buildDailyCompanionTaskProjection(
    profile.tasks,
    today,
  );
  const todayTasks = [...dailyTaskProjection.planned].sort(compareDashboardTasks);
  const todayCandidateTasks = profile.tasks
    .filter(isOpenTask)
    .filter((task) => !task.date && !task.startTime)
    .filter(taskHasPlanningSignals)
    .sort(sortTodayCandidateTasks)
    .slice(0, 4);
  const plannerTasks = todayCandidateTasks.map((task) =>
    taskToTodayPlannerTask(task, plannerRelationLookups),
  );
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
  const carryForwardItems = options.dailyReview
    ? (options.dailyDecisions ?? []).slice(0, 4).map((decision) => {
        const task = profile.tasks.find((item) => item.id === decision.taskId);
        return {
          accent: task ? areaAccent(task.areaId) : "var(--accent-blue)",
          description: `Moved to ${decision.targetDate}`,
          label: task?.title ?? "Carried task",
        };
      })
    : todayTasks
        .filter((task) => task.status !== "done")
        .slice(0, 4)
        .map((task) => ({
          label: task.title,
          description: task.nextStep,
          accent: areaAccent(task.areaId),
        }));
  const carriedTaskCount = options.dailyReview
    ? (options.dailyDecisions ?? []).length
    : 0;
  const deltaValueCount = 5;
  const hasTodayData =
    events.length > 0 || artifacts.length > 0 || carryForwardItems.length > 0;

  viewModel.profileId = profileId;
  viewModel.contentStates = buildTodayContentStates({
    activityEventCount: events.length,
    carryForwardCount: carryForwardItems.length,
    closingReviewCount: options.dailyReview ? 4 : 0,
    decisionsArtifactsCount: artifacts.length,
    deltaValueCount,
    openingReviewCount: options.dailyReview ? 1 : 0,
    todayPlannerCount: plannerTasks.length,
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
        label: `${dailyTaskProjection.scheduled.length} scheduled`,
        accent: "var(--accent-blue)",
      },
      {
        label: `${dailyTaskProjection.completed.length} done`,
        accent: "var(--accent-orange)",
      },
      {
        label: `${dailyTaskProjection.open.length} open`,
        accent: "var(--accent-green)",
      },
      {
        label: `${carriedTaskCount} carried`,
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
  viewModel.todayPlanner = {
    ...viewModel.todayPlanner,
    tasks: plannerTasks,
    emptyState: {
      title: "Keine offenen Kandidaten für heute.",
      description:
        "Offene Tasks mit Planning Signals erscheinen hier, bevor sie in den heutigen Plan übernommen werden.",
    },
  };
  viewModel.recurringGeneration = {
    enabled: profileId === "manual" && Boolean(options.manualDbAvailable),
    templates: (options.recurringTemplates ?? []).flatMap((template) => {
      const rule = template.recurrenceRule;
      const frequency = rule.frequency;
      if (frequency !== "daily" && frequency !== "weekly") return [];

      return [{
        byWeekday:
          frequency === "weekly" && Array.isArray(rule.byWeekday)
            ? rule.byWeekday.filter(
                (value): value is number =>
                  typeof value === "number" && value >= 1 && value <= 7,
              )
            : [],
        description: template.description,
        durationMinutes: template.durationMinutes,
        endsOn: template.endsOn,
        energy: template.energy,
        frequency,
        id: template.id,
        interval:
          typeof rule.interval === "number" && rule.interval > 0
            ? rule.interval
            : 1,
        isActive: template.isActive,
        nextAction: template.nextAction,
        priority: template.priority,
        startsOn: template.startsOn,
        timezone: template.timezone,
        title: template.title,
      }];
    }),
    today,
  };
  viewModel.openingReview = {
    ...viewModel.openingReview,
    items: options.dailyReview
      ? [
          {
            label: "Daily Review",
            value: options.dailyReview.status,
            detail: options.dailyReview.outcome ?? "Saved without outcome",
            accent:
              options.dailyReview.status === "completed"
                ? "var(--accent-green)"
                : "var(--accent-cyan)",
          },
        ]
      : todayReviewNotSetItems(),
  };
  viewModel.deltaSummary = {
    ...viewModel.deltaSummary,
    metrics: [
      {
        label: "Planned today",
        value: String(todayTasks.length),
        detail: "canonical task occurrences",
        accent: "var(--accent-blue)",
      },
      {
        label: "Time scheduled",
        value: String(dailyTaskProjection.scheduled.length),
        detail: "planned occurrences with a Calendar block",
        accent: "var(--accent-cyan)",
      },
      {
        label: "Done",
        value: String(dailyTaskProjection.completed.length),
        detail: "completed canonical occurrences",
        accent: "var(--accent-green)",
      },
      {
        label: "Open plan",
        value: String(dailyTaskProjection.open.length),
        detail: "planned work not completed yet",
        accent: "var(--accent-orange)",
      },
      {
        label: "Carried forward",
        value: String(carriedTaskCount),
        detail: options.dailyReview
          ? "explicit Daily Review decisions"
          : "decide in Daily Review",
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
    signals: options.dailyReview
      ? [
          {
            label: "Review",
            value: options.dailyReview.status,
            detail: options.dailyReview.outcome ?? "Outcome not set",
            accent: "var(--accent-green)",
          },
          {
            label: "Open Loops",
            value: String(options.dailyReview.openLoops.length),
            detail: "saved in Daily Review",
            accent: "var(--accent-orange)",
          },
          {
            label: "Carry Forward",
            value: String((options.dailyDecisions ?? []).length),
            detail: "explicit task decisions",
            accent: "var(--accent-blue)",
          },
          {
            label: "Tomorrow Hint",
            value: options.dailyReview.nextPeriodFocus ?? "—",
            detail: "saved preparation",
            accent: "var(--accent-cyan)",
          },
        ]
      : todayClosingNotStartedItems(carryForwardItems.length),
    emptyState: {
      title: "Closing Review nicht gestartet",
      description:
        "Der Tagesabschluss bleibt sichtbar, bis ein Review gespeichert wird.",
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

function buildManualCalendarDays(): CalendarDayViewModel[] {
  const firstDate = todayDateLabel();
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
  lookups: PortfolioRelationLabelLookups,
): Omit<
  CalendarTimedBlockViewModel,
  "compact" | "density" | "durationMinutes" | "layout"
> | null {
  const startMinutes = minutesFromTime(task.startTime);
  const endTime = taskEndTime(task);
  const parsedEndMinutes = minutesFromTime(endTime ?? undefined);
  const endMinutes =
    endTime === "00:00" && startMinutes !== null && startMinutes > 0
      ? CALENDAR_DAY_END_MINUTES
      : parsedEndMinutes;

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
    type: task.scheduleSource?.type === "meal" ? "meal" : task.scheduleSource?.type === "review" ? "review" : isWorkoutScheduleSource(task) ? "workout" : "task_block",
    status:
      task.status === "done"
        ? "done"
        : task.status === "active"
          ? "active"
          : task.status === "waiting"
            ? "needs_decision"
            : "planned",
    source: task.scheduleSource?.type === "meal" ? "meal_planner" : task.scheduleSource?.type === "review" ? "review" : isWorkoutScheduleSource(task) ? "health" : "task",
    area: task.scheduleSource?.type === "meal" ? "Nutrition" : task.scheduleSource?.type === "review" ? "Review" : isWorkoutScheduleSource(task) ? "Health" : areaLabel(task.areaId),
    sourceEntity: {
      type: projectedScheduleSourceType(task),
      label: task.scheduleSource?.type === "meal" ? "Meal / Nutrition" : task.scheduleSource?.type === "review" ? "Review / Daily loop" : isWorkoutScheduleSource(task) ? "Workout / Health" : `Task / ${areaLabel(task.areaId)}`,
      href: task.scheduleSource?.type === "meal" ? "/nutrition/meal-planner" : task.scheduleSource?.type === "review" ? `/review/${task.title.startsWith("Weekly") ? "weekly" : "daily"}` : isWorkoutScheduleSource(task) ? workoutSourceHref(task) : `/tasks/${task.id}`,
    },
    accent: areaAccent(task.areaId),
    meta: task.priority,
    linkedEntity: task.title,
    plannedOutcome: task.nextStep,
    timeLabel: `${task.startTime}-${endTime}`,
    priority: dashboardPriority(task.priority),
    project: taskPlannerContextLabel(task, lookups, areaLabel(task.areaId)),
    taskId: task.id,
    goalId: task.goalId,
    startTime: task.startTime,
    endTime: endTime ?? task.startTime,
    startMinutes,
    endMinutes,
  };
}

function taskDeadlineToAllDayBlock(
  task: LifeTask,
  date: string,
  isOverdue: boolean,
): CalendarAllDayBlockViewModel {
  return {
    id: `task-deadline-${task.id}`,
    dayId: dayIdFromDate(date),
    date,
    title: task.title,
    type: "deadline",
    status: task.status === "done" ? "done" : "planned",
    source: "task",
    area: areaLabel(task.areaId),
    sourceEntity: {
      type: "task",
      label: `Task / ${areaLabel(task.areaId)}`,
      href: `/tasks/${task.id}`,
    },
    accent: isOverdue ? "var(--accent-orange)" : areaAccent(task.areaId),
    isOverdue,
    linkedEntity: task.title,
    markerKind: "task_deadline",
    markerLabel: isOverdue ? "Task overdue" : "Task due",
    priority: dashboardPriority(task.priority),
    timeLabel: isOverdue ? "Overdue" : "Task due",
  };
}

function plannedTaskToAllDayBlock(
  task: LifeTask,
  date: string,
  isRecurringOccurrence: boolean,
): CalendarAllDayBlockViewModel {
  return {
    id: `planned-task-${task.id}`,
    dayId: dayIdFromDate(date),
    date,
    title: task.title,
    type: isRecurringOccurrence ? "routine" : "task_block",
    status: task.status === "done" ? "done" : "planned",
    source: isRecurringOccurrence ? "routine" : "task",
    area: areaLabel(task.areaId),
    sourceEntity: {
      type: "task",
      label: isRecurringOccurrence ? "Recurring task" : "Task",
      href: `/tasks/${task.id}`,
    },
    accent: areaAccent(task.areaId),
    markerKind: "planned_task",
    markerLabel: isRecurringOccurrence ? "Recurring task" : "Planned task",
    priority: dashboardPriority(task.priority),
    taskId: task.id,
    timeLabel: isRecurringOccurrence ? "Recurring task" : "Planned task",
  };
}

function projectDeadlineToAllDayBlock(
  project: LifeProject,
  date: string,
): CalendarAllDayBlockViewModel {
  return {
    id: `project-deadline-${project.id}`,
    dayId: dayIdFromDate(date),
    date,
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
    linkedEntity: project.title,
    markerKind: "project_deadline",
    markerLabel: "Project due",
    plannedOutcome: project.nextStep,
    priority: dashboardPriority(project.priority),
    project: project.title,
    timeLabel: "Project due",
  };
}

function goalTargetToAllDayBlock(
  goal: LifeGoal,
  date: string,
): CalendarAllDayBlockViewModel {
  return {
    id: `goal-target-${goal.id}`,
    dayId: dayIdFromDate(date),
    date,
    title: goal.title,
    type: "deadline",
    status: goal.status === "achieved" ? "done" : "planned",
    source: "goal",
    area: areaLabel(goal.areaId),
    sourceEntity: {
      type: "goal",
      label: `Goal / ${areaLabel(goal.areaId)}`,
      href: `/goals/${goal.id}`,
    },
    accent: areaAccent(goal.areaId),
    linkedEntity: goal.title,
    markerKind: "goal_target",
    markerLabel: "Goal target",
    plannedOutcome: goal.nextStep,
    timeLabel: "Goal target",
  };
}

function buildProfileCalendarViewModel(
  profile: ManualProfileData,
  profileId: Exclude<LifeOsProfileId, "demo">,
  relationLookups?: PortfolioRelationLabelLookups,
  reviews: Pick<
    DashboardReadSources,
    "dailyDecisions" | "dailyReview" | "weeklyReview"
  > = emptyDashboardReadSources,
): CalendarViewModel {
  const isManualProfile = profileId === "manual";
  const plannerRelationLookups =
    relationLookups ??
    portfolioRelationLabelLookups({
      goals: profile.goals,
      milestones: [],
      projects: profile.projects,
      skills: [],
      tasks: profile.tasks,
  });
  const days = buildManualCalendarDays();
  const demoModel = getDemoCalendarViewModel();
  const temporalSignals = buildCalendarTemporalSignals({
    goals: profile.goals.map((goal) => ({
      id: goal.id,
      targetDate: goal.targetDate,
      title: goal.title,
    })),
    projects: profile.projects.map((project) => ({
      deadline: project.deadline,
      id: project.id,
      title: project.title,
    })),
    tasks: profile.tasks.map((task) => ({
      dueDate: task.dueAt,
      id: task.id,
      isRecurringOccurrence: task.isGenerated,
      plannedDate: task.date,
      scheduledDate: task.date && task.startTime ? task.date : undefined,
      status: task.status,
      title: task.title,
    })),
    today: todayDateLabel(),
  });
  const tasksById = new Map(profile.tasks.map((task) => [task.id, task]));
  const projectsById = new Map(
    profile.projects.map((project) => [project.id, project]),
  );
  const goalsById = new Map(profile.goals.map((goal) => [goal.id, goal]));
  const rawTimedBlocks = profile.tasks
    .filter((task) => Boolean(task.date && task.startTime))
    .map((task) => taskToCalendarBlock(task, plannerRelationLookups))
    .filter(
      (
        block,
      ): block is Omit<
        CalendarTimedBlockViewModel,
        "compact" | "density" | "durationMinutes" | "layout"
      > => Boolean(block),
    );
  const timedBlocks = buildCalendarTimedBlocks(
    rawTimedBlocks,
    Array.from(
      new Set(rawTimedBlocks.map((block) => block.dayId)),
    ).map((id) => ({ id })),
  );
  const allDayBlocks = temporalSignals.flatMap((signal) => {
    if (signal.kind === "planned_task") {
      const task = tasksById.get(signal.sourceId);
      return task
        ? [
            plannedTaskToAllDayBlock(
              task,
              signal.date,
              Boolean(signal.isRecurringOccurrence),
            ),
          ]
        : [];
    }
    if (signal.kind === "task_deadline") {
      const task = tasksById.get(signal.sourceId);
      return task
        ? [taskDeadlineToAllDayBlock(task, signal.date, signal.isOverdue)]
        : [];
    }
    if (signal.kind === "project_deadline") {
      const project = projectsById.get(signal.sourceId);
      return project ? [projectDeadlineToAllDayBlock(project, signal.date)] : [];
    }
    if (signal.kind === "goal_target") {
      const goal = goalsById.get(signal.sourceId);
      return goal ? [goalTargetToAllDayBlock(goal, signal.date)] : [];
    }
    return [];
  });
  const scheduledTaskBlocks = timedBlocks.filter(
    (block) => Boolean(block.taskId),
  );
  const skillsByTaskId = new Map(
    Array.from(plannerRelationLookups.taskSkillLinksByTaskId.entries()).map(
      ([taskId, links]) => [
        taskId,
        links.map((link) => ({ id: link.skillId, title: link.skillTitle })),
      ],
    ),
  );
  const schedulableTasks: CalendarViewModel["schedulableTasks"] = buildPlannerQueue({
    goals: profile.goals,
    projects: profile.projects,
    skillsByTaskId,
    tasks: profile.tasks,
    today: todayDateLabel(),
    weekEnd: days[6]?.date ?? todayDateLabel(),
    weekStart: days[0]?.date ?? todayDateLabel(),
  })
    .map((task) => {
      const sourceTask = profile.tasks.find((candidate) => candidate.id === task.id);

      return {
        ...task,
        accent: sourceTask ? areaAccent(sourceTask.areaId) : "var(--accent-blue)",
        area: sourceTask ? areaLabel(sourceTask.areaId) : task.area,
      };
    })
    .slice(0, 100);
  const planningQueueTasks = schedulableTasks;

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
      meta: `${task.rankingReason} · ${task.priority}`,
      accent: task.accent ?? "var(--accent-blue)",
    })),
    reviewsOpen: [
      reviews.dailyReview?.status !== "completed"
        ? {
            accent: "var(--accent-cyan)",
            href: "/review/daily",
            meta: reviews.dailyReview ? "draft saved" : "not started",
            title: "Daily Review",
          }
        : null,
      reviews.weeklyReview?.status !== "completed"
        ? {
            accent: "var(--accent-purple)",
            href: "/review/weekly",
            meta: reviews.weeklyReview ? "draft saved" : "not started",
            title: "Weekly Review",
          }
        : null,
    ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
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
      title: "Weekly Review",
      status: reviews.weeklyReview?.status ?? "not started",
      description:
        reviews.weeklyReview?.nextPeriodFocus ??
        "Noch kein Wochenreview im lokalen Profil.",
      placeholder: "Review-Notiz erfassen...",
      actionLabel: "Weekly Review öffnen",
    },
  } satisfies CalendarViewModel["rightPanel"];
  const daysWithContent = days.filter(
    (day) =>
      timedBlocks.some((block) => block.dayId === day.id) ||
      allDayBlocks.some((block) => block.dayId === day.id),
  ).length;
  const headerItemCount =
    timedBlocks.length > 0 || allDayBlocks.length > 0 ? 1 : 0;
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
        ? "Calendar shows local task time blocks, project context and planned tasks without time; free calendar events stay prepared."
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
    scheduledTasks: scheduledTaskBlocks,
    plannerQueueTasks: schedulableTasks,
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

  if (profileId === "manual") {
    return (await getManualPortfolioEntityCollection()).collection;
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

async function getDashboardViewModelUncached(): Promise<DashboardViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoDashboardViewModel();
  }

  if (profileId === "manual") {
    const dashboard = await getManualDashboardReadData();
    return buildProfileDashboardViewModel(
      profileId,
      dashboard.profile,
      dashboard.sources,
    );
  }

  return buildProfileDashboardViewModel(profileId, emptyManualProfile());
}

// AppShell and DashboardGrid consume this same server read model during one
// Dashboard render. React keeps this memoization request-scoped, so neither
// authenticated Manual data nor a profile result can cross request boundaries.
export const getDashboardViewModel = cache(getDashboardViewModelUncached);

export async function getInboxViewModel(
  options: { selectedInboxItemId?: string } = {},
): Promise<InboxViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    const demo = getDemoInboxViewModel();
    const selected = demo.queue.find(item => item.id === options.selectedInboxItemId)
      ?? demo.queue.find(item => item.active) ?? demo.queue[0];
    if (selected) {
      demo.activeItem.id = selected.id;
      if (!selected.active) {
        demo.activeItem.title = selected.title;
        demo.activeItem.originalCapture = selected.note;
        demo.activeItem.fields = [
          { label: "Clean Title", value: selected.title },
          { label: "Description / Context", value: selected.note },
          { label: "Next Action", value: selected.next },
          { label: "Missing Info", value: "" },
        ];
      }
    }
    return demo;
  }

  if (profileId === "manual") {
    const manualInbox = await getManualInboxProfileData();

    const result = buildProfileInboxViewModel(manualInbox.data, profileId, {
      existingTargets: manualInbox.existingTargets,
      selectedInboxItemId: options.selectedInboxItemId,
      unavailableReason: manualInbox.unavailableReason,
    });
    const auth = await createAuthenticatedSupabaseServerClient();
    if (auth.ok) {
      const areas = await auth.client.from("areas").select("id, name").eq("user_id", auth.user.id).is("archived_at", null);
      result.areas = (areas.data ?? []).map(area => ({ id: area.id, title: area.name }));
    }
    return result;
  }

  return buildProfileInboxViewModel(
    await getProfileData(profileId),
    profileId,
    {
      selectedInboxItemId: options.selectedInboxItemId,
    },
  );
}

export async function getTodayViewModel(): Promise<TodayViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoTodayViewModel();
  }

  if (profileId === "manual") {
    if (isSqliteProofRuntime()) {
      const proof = await getProofManualData();
      const base = buildProfileTodayViewModel(proof.profile, "manual", undefined, {
        manualDbAvailable: proof.authAvailable,
      });
      if (!proof.authAvailable) return { ...base, activityUnavailable: true };
      const { getProofOwnerId, readProofSnapshot } = await import("../../../experiments/issue-37/sqlite-proof-runtime");
      const ownerId = await getProofOwnerId();
      if (!ownerId) return { ...base, activityUnavailable: true };
      const snapshot = readProofSnapshot(ownerId);
      return {
        ...base,
        dayLog: projectTodayActivity(
          { ...emptyActivitySources(), tasks: snapshot.tasks },
          "Europe/Berlin",
        ),
      };
    }
    const base = clone(getDemoTodayViewModel());
    base.profileId = "manual";
    const auth = await createAuthenticatedSupabaseServerClient();
    if (!auth.ok) return { ...base, activityUnavailable: true };
    try { return { ...base, dayLog: await readTodayActivity(auth.client, auth.user.id) }; }
    catch { return { ...base, activityUnavailable: true }; }
  }

  const profile = await getProfileDataWithManualTasks(profileId);

  return buildProfileTodayViewModel(profile, profileId);
}

export async function getCalendarViewModel(): Promise<CalendarViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoCalendarViewModel();
  }

  if (profileId === "manual") {
    const dashboard = await getManualDashboardReadData();
    const model = buildProfileCalendarViewModel(
      dashboard.profile,
      profileId,
      isSqliteProofRuntime()
        ? undefined
        : await getManualPlannerRelationLabelLookups(profileId, dashboard.profile.tasks),
      dashboard.sources,
    );
    const label = localTimeLabel(new Date(), dashboard.sources.habits?.settings.timezone ?? appTimeZone);
    const minutes = minutesFromTime(label) ?? 0;
    return { ...model, currentTime: { label, top: Math.max(0, Math.min(100, (minutes - CALENDAR_DAY_START_MINUTES) / (CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES) * 100)) } };
  }

  const profile = await getProfileDataWithManualTasks(profileId);

  return buildProfileCalendarViewModel(
    profile,
    profileId,
    await getManualPlannerRelationLabelLookups(profileId, profile.tasks),
  );
}

export async function getPortfolioViewModel(): Promise<PortfolioViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoPortfolioViewModel();
  }

  if (profileId === "manual") {
    const manualPortfolio = await getManualPortfolioEntityCollection();

    return buildProfilePortfolioViewModel(
      profileId,
      manualPortfolio.collection,
      manualPortfolio.relationLookups,
    );
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
