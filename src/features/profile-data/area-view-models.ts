import "server-only";

import { getChallengesViewModel as getDemoChallengesViewModel } from "@/features/challenges";
import { createSupabaseChallengeRepository } from "@/features/real-data/supabase/repositories/supabase-challenge-repository";
import { createSupabaseAntiRotRepository } from "@/features/real-data/supabase/repositories/supabase-anti-rot-repository";
import { getCodingOverviewViewModel as getDemoCodingOverviewViewModel } from "@/features/coding";
import { getAgentHubViewModel as getDemoAgentHubViewModel } from "@/features/coding/agents";
import { getRepositoriesViewModel as getDemoRepositoriesViewModel } from "@/features/coding/repositories";
import { getSkillMapViewModel as getDemoSkillMapViewModel } from "@/features/coding/skill-map";
import {
  getEducationOverviewViewModel as getDemoEducationOverviewViewModel,
  getEducationWorkspaceViewModel as getDemoEducationWorkspaceViewModel,
  getLearningLogViewModel as getDemoLearningLogViewModel,
} from "@/features/education";
import type {
  EducationOverviewViewModel,
  EducationProfileId,
  EducationWorkspaceViewModel,
  LearningLogViewModel,
  MasterThesisState,
  WeeklyLearningDay,
} from "@/features/education";
import { getHealthOverviewViewModel as getDemoHealthOverviewViewModel } from "@/features/health";
import { getHabitsAnalyticsViewModel as getDemoHabitsAnalyticsViewModel } from "@/features/health/habits/habits-view-model";
import { getRunningTrackerViewModel as getDemoRunningTrackerViewModel } from "@/features/health/running";
import { getStrengthTrackerViewModel as getDemoStrengthTrackerViewModel } from "@/features/health/strength-tracker";
import {
  getEntertainmentPageViewModel as getDemoEntertainmentPageViewModel,
  getInventoryPageViewModel as getDemoInventoryPageViewModel,
  getJournalPageViewModel as getDemoJournalPageViewModel,
  getLifeOverviewViewModel as getDemoLifeOverviewViewModel,
  getNotesPageViewModel as getDemoNotesPageViewModel,
} from "@/features/life";
import { getNutritionOverviewViewModel as getDemoNutritionOverviewViewModel } from "@/features/nutrition";
import {
  generateGroceryDraft,
  getGroceryViewModel as getDemoGroceryViewModel,
} from "@/features/nutrition/grocery";
import { getMealPlannerViewModel as getDemoMealPlannerViewModel } from "@/features/nutrition/meal-planner";
import { getRecipesViewModel as getDemoRecipesViewModel } from "@/features/nutrition/recipes";
import { summarizeRecipes } from "@/features/nutrition/recipes/recipe-utils";
import type {
  IngredientUnit,
  MealPlanWeek,
  MealType as PlannerMealType,
  Recipe as PlannerRecipe,
  RecipeIngredient as PlannerRecipeIngredient,
} from "@/features/nutrition/meal-planner/meal-planner-types";
import {
  buildResourcesContentStates,
  getResourcesViewModel as getDemoResourcesViewModel,
} from "@/features/resources";
import type {
  ResourceItem,
  ResourceRelationCreateTarget,
  ResourceRelationViewModel,
  ResourceReviewQueueItem,
  ResourcesViewModel,
} from "@/features/resources";
import {
  getResourceRelationCreateTargets,
  resourceRelationToViewModel,
  resolveResourceRelationTargets,
} from "@/features/resources/resource-relations-read-model";
import { buildSemanticConnectedContext } from "@/features/semantic-relations/read-model";
import { resolveContentStateMeta } from "@/features/content-state";
import {
  createSupabaseNutritionRepository,
  createSupabaseHabitRepository,
  createSupabaseCodingRepository,
  createSupabaseEducationRepository,
  createSupabaseWorkRepository,
  createSupabaseWorkKnowledgeRepository,
  createSupabaseWorkMeetingRepository,
  createSupabaseResourceRepository,
  createSupabaseTrainingRepository,
  createSupabaseLifeRepository,
  type SupabaseClientLike,
} from "@/features/real-data/supabase";
import type {
  HabitSnapshot,
  TrainingSnapshot,
  Meal as RealDataMeal,
  Recipe as RealDataRecipe,
  RecipeIngredient as RealDataRecipeIngredient,
  Resource as RealDataResource,
} from "@/features/real-data";
import { localDateInTimeZone } from "@/features/real-data";
import { formatPace, muscleLoad, strengthVolume } from "@/features/real-data";
import { getShopViewModel as getDemoShopViewModel } from "@/features/shop";
import { createSupabaseShopRepository } from "@/features/real-data/supabase/repositories/supabase-shop-repository";
import {
  getWorkLogViewModel as getDemoWorkLogViewModel,
  getWorkOverviewViewModel as getDemoWorkOverviewViewModel,
  getWorkWikiViewModel as getDemoWorkWikiViewModel,
} from "@/features/work";
import type {
  EntityPriority,
  TaskStatus,
} from "@/features/entities/types";
import type {
  WorkLogViewModel,
  WorkOverviewViewModel,
  WorkSection,
  WorkTask,
  WorkTaskStatus,
  WorkWikiViewModel,
} from "@/features/work";
import {
  buildWorkLogContentStates,
  buildWorkOverviewContentStates,
  buildWorkWikiContentStates,
} from "@/features/work/work-content-states";
import { readManualProfile } from "./manual-profile-store";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLifeOsProfileId } from "./profile-cookie";
import type { LifeOsProfileId, ManualHabit, ManualProfileData } from "./types";
import type { MealEntry, NutritionDay } from "@/features/nutrition";

type PathPart = string | number;

const blockedDemoFragments = [
  "Steady",
  "5-minute self-check",
  "10-minute walk after deep work",
  "Mood Pattern",
  "Repair Routines",
  "Today Signal",
  "Today signal",
  "Literature source deadline",
  "Literature source deadline klären",
  "Calendar page implementieren",
  "Life OS App",
  "Masterarbeit",
  "Finanzinformatik",
  "Water",
  "Coffee",
  "Skyr",
  "Protein Bowl",
  "Agent Workflow",
  "Data model notes",
  "Hyperskill",
  "Data access setup question",
  "Article on calm dashboards",
] as const;

const structuralStringKeys = new Set([
  "accent",
  "area",
  "attention",
  "category",
  "color",
  "density",
  "difficulty",
  "energyLabel",
  "fieldId",
  "href",
  "icon",
  "id",
  "importance",
  "intent",
  "kind",
  "mode",
  "pageKind",
  "priority",
  "privacy",
  "privacyLevel",
  "readiness",
  "relevance",
  "relationType",
  "resourceStatus",
  "resourceType",
  "reviewState",
  "source",
  "state",
  "status",
  "thesisPotential",
  "tone",
  "type",
  "variant",
  "view",
  "visibility",
  "workType",
]);

const structuralStringArrayKeys = new Set([
  "filterOptions",
  "filters",
  "mapScopes",
  "scopes",
  "segments",
  "signals",
  "sortOptions",
  "statusOptions",
  "types",
  "viewOptions",
  "views",
]);

const structuralArrayKeys = new Set([
  "captureTypes",
  "filterOptions",
  "goalTypes",
  "mapScopes",
  "optionalInputs",
  "primaryActions",
  "profiles",
  "projectOptions",
  "providerOptions",
  "secondaryActions",
  "slots",
  "statusOptions",
  "summaryStats",
  "typeOptions",
  "viewOptions",
  "views",
  "days",
]);

const contentArrayKeys = new Set([
  "activity",
  "agentSessions",
  "aiSuggestions",
  "bars",
  "boundaries",
  "clusters",
  "connections",
  "context",
  "fields",
  "habits",
  "insights",
  "items",
  "learnings",
  "literature",
  "methodNotes",
  "moodDirections",
  "notes",
  "practiceQueue",
  "questions",
  "recentLearnings",
  "relations",
  "resources",
  "reviewQueue",
  "rows",
  "routines",
  "sessions",
  "signals",
  "skills",
  "tasks",
  "tracks",
  "trends",
  "week",
  "weeks",
]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hasBlockedDemoFragment(value: string) {
  return blockedDemoFragments.some((fragment) => value.includes(fragment));
}

function isInsideArray(path: readonly PathPart[]) {
  return path.some((part) => typeof part === "number");
}

function keyFromPath(path: readonly PathPart[]) {
  const last = path[path.length - 1];
  return typeof last === "string" ? last : "";
}

function parentKeyFromPath(path: readonly PathPart[]) {
  for (let index = path.length - 2; index >= 0; index -= 1) {
    const part = path[index];

    if (typeof part === "string") {
      return part;
    }
  }

  return "";
}

function profileEmptyText(profileId: LifeOsProfileId, areaLabel: string) {
  const area = areaLabel.toLowerCase();

  if (area.includes("resource")) {
    return "Noch keine Ressourcen gespeichert.";
  }

  if (area.includes("health")) {
    return "Noch keine Gesundheitsdaten erfasst.";
  }

  if (area.includes("nutrition")) {
    return "Noch keine Mahlzeiten geplant.";
  }

  if (area.includes("coding")) {
    return "Noch keine Coding-Eintraege erfasst.";
  }

  if (area.includes("education")) {
    return "Noch keine Lerneintraege erfasst.";
  }

  if (area.includes("work")) {
    return "Noch keine Arbeitseintraege erfasst.";
  }

  return "Noch keine Eintraege.";
}

function shouldCollapseArray(
  value: readonly unknown[],
  path: readonly PathPart[],
) {
  if (value.length === 0) {
    return false;
  }

  const key = keyFromPath(path);
  const parentKey = parentKeyFromPath(path);

  if (
    structuralArrayKeys.has(key) ||
    structuralArrayKeys.has(parentKey)
  ) {
    return false;
  }

  if (contentArrayKeys.has(key)) {
    return true;
  }

  return value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      "id" in item &&
      ("title" in item || "name" in item || "label" in item),
  );
}

function neutralString(
  value: string,
  path: readonly PathPart[],
  profileId: LifeOsProfileId,
  areaLabel: string,
) {
  const key = keyFromPath(path);
  const parentKey = parentKeyFromPath(path);

  if (
    value.startsWith("/") ||
    value.startsWith("var(") ||
    value.startsWith("#") ||
    structuralStringKeys.has(key) ||
    structuralStringArrayKeys.has(parentKey) ||
    structuralArrayKeys.has(parentKey) ||
    key.endsWith("Id") ||
    key.endsWith("Kind") ||
    key.endsWith("State") ||
    key.endsWith("Status") ||
    key.endsWith("Type")
  ) {
    return value;
  }

  if (
    key === "date" ||
    key.toLowerCase().endsWith("_at") ||
    key.endsWith("At") ||
    key.endsWith("Date") ||
    key.includes("date")
  ) {
    return "2026-06-24";
  }

  if (key === "time" || key.endsWith("Time") || key.includes("time")) {
    return "00:00";
  }

  if (key === "value" || key.endsWith("Value")) {
    return "0";
  }

  if (key === "count" || key.endsWith("Count")) {
    return "0";
  }

  if (isInsideArray(path)) {
    if (key === "title" || key === "name" || key === "label") {
      return profileEmptyText(profileId, areaLabel);
    }

    return profileEmptyText(profileId, areaLabel);
  }

  if (hasBlockedDemoFragment(value)) {
    if (key === "title" || key === "label" || key === "name") {
      return "Local profile state";
    }

    return profileEmptyText(profileId, areaLabel);
  }

  return value;
}

function sanitizeAreaViewModel<T>(
  value: T,
  profileId: LifeOsProfileId,
  areaLabel: string,
  path: readonly PathPart[] = [],
): T {
  if (Array.isArray(value)) {
    if (shouldCollapseArray(value, path)) {
      return [] as T;
    }

    return value.map((item, index) =>
      sanitizeAreaViewModel(item, profileId, areaLabel, [...path, index]),
    ) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeAreaViewModel(entry, profileId, areaLabel, [...path, key]),
      ]),
    ) as T;
  }

  if (typeof value === "string") {
    return neutralString(value, path, profileId, areaLabel) as T;
  }

  if (typeof value === "number") {
    const key = keyFromPath(path);

    if (key.toLowerCase().includes("target")) {
      return 1 as T;
    }

    return 0 as T;
  }

  return value;
}

function emptyHealthMetric<TAccent extends string = "var(--accent-cyan)">(
  label: string,
  detail: string,
  accent: TAccent = "var(--accent-cyan)" as TAccent,
) {
  return {
    accent,
    detail,
    label,
    value: "—",
  };
}

function habitGroupFromManualHabit(
  habit: ManualHabit,
): "Morning" | "Health" | "Learning" | "Review" | "Evening" {
  if (habit.window === "Morning") return "Morning";
  if (habit.window === "Evening") return "Evening";
  if (habit.areaId === "education") return "Learning";
  if (habit.areaId === "review") return "Review";

  return "Health";
}

function buildProfileHealthOverviewViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  profile: ManualProfileData,
  habitSnapshot?: HabitSnapshot | null,
  trainingSnapshot?: TrainingSnapshot | null,
): ReturnType<typeof getDemoHealthOverviewViewModel> {
  const viewModel = clone(getDemoHealthOverviewViewModel());
  const canonicalHabits = habitSnapshot?.habits.filter((habit) => habit.archivedAt === null) ?? [];
  const habitCount = habitSnapshot ? canonicalHabits.length : 0;
  const moodCount = profile.mood ? 1 : 0;
  const completedRuns = trainingSnapshot?.runningSessions.filter((session) => session.status === "completed" && !session.archivedAt) ?? [];
  const completedStrength = trainingSnapshot?.strengthSessions.filter((session) => session.status === "completed" && !session.archivedAt) ?? [];
  const pageItemCount = moodCount + habitCount + completedRuns.length + completedStrength.length;
  const firstHabit = canonicalHabits[0] ?? null;

  viewModel.profileId = profileId;
  viewModel.contentStates = {
    habits: resolveContentStateMeta({
      capacity: 3,
      itemCount: habitCount > 0 ? 1 : 0,
    }),
    mentalHealth: resolveContentStateMeta({
      capacity: 3,
      itemCount: moodCount,
    }),
    page: resolveContentStateMeta({
      capacity: 5,
      itemCount: pageItemCount,
    }),
    running: resolveContentStateMeta({ capacity: 3, itemCount: completedRuns.length }),
    schedule: resolveContentStateMeta({ capacity: 10, itemCount: 0 }),
    strength: resolveContentStateMeta({ capacity: 3, itemCount: completedStrength.length }),
  };
  viewModel.header.dateRange =
    profileId === "manual"
      ? "Manual · lokale Health-Shell"
      : "Empty · Health-Shell ohne Demo-Daten";

  viewModel.mentalHealth = {
    ...viewModel.mentalHealth,
    badge: profile.mood ? "Local mood" : "Self-check",
    moodDirections: profile.mood
      ? [
          {
            accent: "var(--accent-purple)",
            daysLabel: "1 local signal",
            label: profile.mood.label,
            mark: "●",
            pattern: [true, false, false, false, false, false, false],
          },
        ]
      : [],
    sleep: {
      ...viewModel.mentalHealth.sleep,
      bars: [],
      detail: "Noch keine Schlafdaten",
      value: "—",
    },
    journal: {
      ...viewModel.mentalHealth.journal,
      pattern: [],
      value: "—",
    },
  };

  const latestRun = completedRuns[0];
  const todayTimestamp = new Date(`${localDateInTimeZone(new Date(), "Europe/Berlin")}T12:00:00`).getTime();
  const runsInDays = (days: number) => completedRuns.filter((session) => todayTimestamp - new Date(`${session.sessionDate}T12:00:00`).getTime() <= days * 86400000);
  const sevenDayRuns = runsInDays(7);
  const thirtyDayRuns = runsInDays(30);
  viewModel.running = {
    ...viewModel.running,
    loadStatus: latestRun ? `${sevenDayRuns.length} run(s) · 7 days` : "Noch kein Laufkontext",
    metrics: [
      { label: "Weekly distance", value: `${sevenDayRuns.reduce((sum, run) => sum + run.distanceKm, 0).toFixed(1)} km`, detail: `${sevenDayRuns.length} real session(s)`, accent: "var(--accent-orange)" },
      latestRun ? { label: "Latest pace", value: formatPace(latestRun.distanceKm, latestRun.durationMinutes) ?? "—", detail: "derived from distance and duration", accent: "var(--accent-cyan)" } : emptyHealthMetric("Avg pace", "Pace bleibt leer, bis echte Laufdaten existieren.", "var(--accent-cyan)"),
      latestRun ? { label: "Last run", value: `${latestRun.distanceKm} km`, detail: `${latestRun.sessionDate} · ${latestRun.durationMinutes} min`, accent: "var(--accent-green)" } : emptyHealthMetric("Run history", "Noch kein letzter Lauf", "var(--accent-green)"),
    ],
    nextRun: {
      ...viewModel.running.nextRun,
      detail:
        "Sobald Laufdaten oder ein lokaler Plan existieren, erscheint hier ein Vorschlag.",
      title: trainingSnapshot?.runningPlanItems.find((item) => !item.archivedAt)?.title ?? "Noch kein Laufkontext",
    },
    trends: latestRun ? [
      { title: "7-day trend", statement: `${sevenDayRuns.length} completed run(s)`, values: sevenDayRuns.map((run) => run.distanceKm), accent: "var(--accent-cyan)" },
      { title: "30-day trend", statement: `${thirtyDayRuns.reduce((sum, run) => sum + run.distanceKm, 0).toFixed(1)} km total`, values: thirtyDayRuns.map((run) => run.distanceKm), accent: "var(--accent-orange)" },
    ] : [],
  };

  viewModel.habits = {
    ...viewModel.habits,
    badge: habitCount > 0 ? `${habitCount} Routinen` : "0 Routinen",
    heatmap: {
      ...viewModel.habits.heatmap,
      rows: habitSnapshot
        ? (["Morning", "Midday", "Evening"] as const).map((window) => ({
            label: window,
            values: Array.from({ length: 30 }, (_, index) => {
              const date = new Date();
              date.setUTCDate(date.getUTCDate() - (29 - index));
              const localDate = localDateInTimeZone(date, habitSnapshot.settings.timezone);
              const count = habitSnapshot.logs.filter(
                (log) =>
                  log.localDate === localDate &&
                  canonicalHabits.some(
                    (habit) => habit.id === log.habitId && habit.window === window,
                  ),
              ).length;
              return Math.min(3, count);
            }),
          }))
        : [],
    },
    metrics: [
      {
        accent: "var(--accent-cyan)",
        detail:
          habitCount > 0
            ? "lokal gespeicherte Routinen"
            : "noch keine lokalen Routinen",
        label: "Active routines",
        value: String(habitCount),
      },
      {
        accent: "var(--accent-green)",
        detail: habitSnapshot ? "timestamped in den letzten 30 Tagen" : "Noch keine Habit-Logs",
        label: "Habit logs",
        value: String(habitSnapshot?.logs.length ?? 0),
      },
      emptyHealthMetric(
        "Next repair",
        "Repair Loops erscheinen nach lokalen Signalen.",
        "var(--accent-purple)",
      ),
    ],
    nextFocus: {
      ...viewModel.habits.nextFocus,
      title: firstHabit
        ? `${firstHabit.name} · nächster ruhiger Schritt`
        : "Noch keine Habit-Signale",
    },
  };

  const completedSessionIds = new Set(completedStrength.map((session) => session.id));
  const completedSets = trainingSnapshot?.strengthSetLogs.filter((log) => completedSessionIds.has(log.sessionId)) ?? [];
  const volume = strengthVolume(completedSets);
  const loads = muscleLoad(completedSets, trainingSnapshot?.exercises ?? []);
  const latestStrength = completedStrength[0];
  viewModel.strength = {
    ...viewModel.strength,
    badge: `${completedStrength.length} Sessions`,
    metrics: [
      { label: "Sessions", value: String(completedStrength.length), detail: "completed manual sessions", accent: "var(--accent-red)" },
      { label: "Weighted volume", value: volume.weightedSetCount ? `${volume.weightedVolumeKg.toFixed(1)} kg` : "—", detail: volume.unweightedRepetitions ? `${volume.unweightedRepetitions} unweighted reps separate` : "from weighted set logs only", accent: "var(--accent-green)" },
      latestStrength ? { label: "Last session", value: latestStrength.sessionDate, detail: `${completedSets.filter((log) => log.sessionId === latestStrength.id).length} set log(s)`, accent: "var(--accent-orange)" } : emptyHealthMetric("Session history", "Noch keine letzte Session", "var(--accent-orange)"),
    ],
    nextSession: {
      ...viewModel.strength.nextSession,
      detail:
        "Sobald eine lokale Kraftsession existiert, erscheint hier Kontext.",
      title: trainingSnapshot?.strengthPlans.find((plan) => !plan.archivedAt)?.name ?? "Noch kein Krafttrainingskontext",
    },
    sessionBalance: {
      ...viewModel.strength.sessionBalance,
      items: [],
    },
    trainingPattern: {
      ...viewModel.strength.trainingPattern,
      days: [],
      note: loads.length ? `Muscle source: ${loads.map(([muscle]) => muscle).slice(0, 3).join(", ")}` : "Krafteinheiten erscheinen nach der ersten lokalen Session.",
    },
  };

  viewModel.schedule = {
    ...viewModel.schedule,
    dateLabel: "Heute",
    footerLabel: "Health-Zeitblöcke werden später über Calendar geplant.",
    items: [],
  };

  return viewModel;
}

function buildProfileHabitsAnalyticsViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  profile: ManualProfileData,
): ReturnType<typeof getDemoHabitsAnalyticsViewModel> {
  const viewModel = clone(getDemoHabitsAnalyticsViewModel());
  const habitCount = profile.habits.length;
  const rows = profile.habits.map((habit) => ({
    accent: "var(--accent-cyan)" as const,
    group: habitGroupFromManualHabit(habit),
    habit: habit.label,
    nextAction: "Routine ist lokal gespeichert; Logs fehlen noch.",
    sevenDayDots: [false, false, false, false, false, false, false],
    status: "No logs" as const,
    target: `${habit.targetValue} ${habit.unit ?? "x"} / day`,
    thirtyDayProgress: 0,
  }));
  const firstHabit = profile.habits[0] ?? null;

  viewModel.profileId = profileId;
  viewModel.contentStates = {
    detailFocus: resolveContentStateMeta({
      capacity: 1,
      itemCount: firstHabit ? 1 : 0,
    }),
    header: resolveContentStateMeta({
      capacity: 1,
      itemCount: habitCount > 0 ? 1 : 0,
    }),
    heatmap: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 7, itemCount: habitCount }),
    patternTable: resolveContentStateMeta({
      capacity: 6,
      itemCount: Math.min(habitCount, 6),
    }),
    repairLoops: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    summary: resolveContentStateMeta({
      capacity: 6,
      itemCount: habitCount > 0 ? 1 : 0,
    }),
    todaySchedule: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    weeklyRhythmInsights: resolveContentStateMeta({
      capacity: 4,
      itemCount: 0,
    }),
  };
  viewModel.header = {
    ...viewModel.header,
    meta:
      profileId === "manual"
        ? "Manual · lokale Routinen"
        : "Empty · keine Habit-Signale",
    pills: [
      {
        accent: "var(--accent-cyan)",
        detail: "profile-safe",
        label: "Mode",
        value: "State Proof",
      },
      {
        accent: "var(--accent-green)",
        detail: "neutral copy",
        label: "Boundary",
        value: "No shame",
      },
      {
        accent: "var(--accent-orange)",
        detail: "logs deferred",
        label: "Logs",
        value: "Deferred",
      },
      {
        accent: "var(--accent-purple)",
        detail: "local shell",
        label: "Source",
        value: profileId === "manual" ? "Manual" : "Empty",
      },
    ],
    todaySignal: {
      accent: "var(--accent-cyan)",
      detail:
        habitCount > 0
          ? "Lokale Routinen vorhanden; Habit-Logs fehlen noch."
          : "Habit-Analytics erscheint, sobald Routinen oder Logs existieren.",
      label: "TODAY HABIT SIGNAL",
      progress: 0,
      progressLabel: "keine Logs",
      value:
        habitCount > 0 ? `${habitCount} lokale Routinen` : "Noch keine Habit-Signale",
    },
  };
  viewModel.summary = [
    {
      accent: "var(--accent-cyan)",
      detail:
        habitCount > 0
          ? "lokal gespeicherte Routinen"
          : "noch keine Routinen",
      label: "Routines",
      value: String(habitCount),
    },
    emptyHealthMetric("Habit logs", "noch keine Logs", "var(--accent-green)"),
    emptyHealthMetric("Heatmap", "noch kein Verlauf", "var(--accent-orange)"),
    emptyHealthMetric("Repair loops", "noch keine Signale", "var(--accent-purple)"),
    emptyHealthMetric("Today schedule", "noch kein Zeitplan", "var(--accent-red)"),
    emptyHealthMetric("Detail focus", "keine Auswahl", "var(--accent-yellow)"),
  ];
  viewModel.heatmap = {
    ...viewModel.heatmap,
    patternRead: {
      ...viewModel.heatmap.patternRead,
      copy:
        "Habit-Analytics erscheint, sobald Routinen oder Logs existieren.",
      metrics: [],
    },
    rows: [],
    statement:
      "Habit-Analytics erscheint, sobald Routinen oder Logs existieren.",
  };
  viewModel.patternTable = {
    ...viewModel.patternTable,
    rows,
    statement:
      habitCount > 0
        ? "Lokale Routinen sind sichtbar; Logs und Verlauf fehlen noch."
        : "Die Tabelle bleibt leer, bis lokale Routinen existieren.",
  };
  viewModel.repairLoops = {
    ...viewModel.repairLoops,
    items: [],
  };
  viewModel.todaySchedule = {
    ...viewModel.todaySchedule,
    items: [],
    subtitle: "Habit-Zeitpunkte erscheinen, sobald ein lokaler Zeitplan existiert.",
  };
  viewModel.detailFocus = {
    ...viewModel.detailFocus,
    actionLabel: "Repair später starten",
    frictionNote: firstHabit
      ? "Noch keine Logs oder Reibungsnotizen vorhanden."
      : "Noch kein Habit ausgewählt.",
    habit: firstHabit?.label ?? "Noch kein Habit-Fokus",
    progress: 0,
    subtitle: firstHabit
      ? "Selected habit: local routine"
      : "Keine lokale Routine ausgewählt",
    target: firstHabit
      ? `${firstHabit.targetValue} ${firstHabit.unit ?? "x"} / day`
      : "Kein Ziel hinterlegt",
  };
  viewModel.weeklyRhythmInsights = {
    ...viewModel.weeklyRhythmInsights,
    rows: [],
  };
  viewModel.isEmpty = habitCount === 0;

  return viewModel;
}

function inactiveRunningChips<T extends string>(
  chips: readonly { label: string; value: T; active?: boolean }[],
) {
  return chips.map((chip) => ({ ...chip, active: false }));
}

function buildProfileRunningTrackerViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
): ReturnType<typeof getDemoRunningTrackerViewModel> {
  const viewModel = clone(getDemoRunningTrackerViewModel());

  viewModel.profileId = profileId;
  viewModel.contentStates = {
    boundaries: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
    context: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    distanceTrend: resolveContentStateMeta({ capacity: 10, itemCount: 0 }),
    header: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    loadRecovery: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    planner: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    recentRuns: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    review: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    rhythm: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
    summary: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    todayPlan: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
  };
  viewModel.header = {
    ...viewModel.header,
    pills: [
      { accent: "var(--accent-orange)", label: "Planner Shell" },
      { accent: "var(--accent-cyan)", label: "No local runs" },
      { accent: "var(--accent-green)", label: "Self-tracked later" },
    ],
    decision: {
      ...viewModel.header.decision,
      detail:
        "Sobald Laufdaten oder ein lokaler Plan existieren, erscheint hier ein Vorschlag.",
      duration: "—",
      effort: "Noch kein lokaler Plan",
      progress: 0,
      readiness: "—",
      title: "Noch kein Laufkontext",
    },
  };
  viewModel.summary = [
    emptyHealthMetric("Weekly distance", "Noch keine Laufdaten", "var(--accent-orange)"),
    emptyHealthMetric("Runs this week", "Noch keine Laufdaten", "var(--accent-cyan)"),
    emptyHealthMetric("Beginner load", "Noch kein Laufkontext", "var(--accent-yellow)"),
    emptyHealthMetric("Avg easy pace", "Noch keine Pace-Daten", "var(--accent-blue)"),
    emptyHealthMetric("Recovery signal", "Noch kein Recovery-Signal", "var(--accent-green)"),
    emptyHealthMetric("Next run", "Noch kein Laufplan", "var(--accent-red)"),
  ];
  viewModel.planner = {
    ...viewModel.planner,
    availableTimes: inactiveRunningChips(viewModel.planner.availableTimes),
    beginnerGoals: inactiveRunningChips(viewModel.planner.beginnerGoals),
    effortTargets: inactiveRunningChips(viewModel.planner.effortTargets),
    goalTypes: inactiveRunningChips(viewModel.planner.goalTypes),
    optionalInputs: [
      {
        accent: "var(--accent-cyan)",
        helper: "Sobald Laufdaten existieren, kann ein Ziel erscheinen.",
        label: "Distance target",
        value: "—",
      },
      {
        accent: "var(--accent-blue)",
        helper: "Pace bleibt leer, bis echte Laufdaten existieren.",
        label: "Pace target",
        value: "—",
      },
      {
        accent: "var(--accent-green)",
        helper: "Recovery-Kontext erscheint nach lokalen Signalen.",
        label: "Recovery",
        value: "—",
      },
      {
        accent: "var(--accent-orange)",
        helper: "Kein Run-/Walk-Verhältnis ohne lokalen Plan.",
        label: "Run / walk ratio",
        value: "—",
      },
    ],
    primaryActions: [],
    secondaryActions: [],
    suggestedPlan: {
      detail:
        "Sobald Laufdaten oder ein lokaler Plan existieren, erscheint hier ein Vorschlag.",
      steps: [],
      title: "Noch kein Laufkontext",
    },
  };
  viewModel.todayPlan = {
    ...viewModel.todayPlan,
    actions: [],
    checklist: [],
    details: [],
    plan: "Noch kein Laufplan",
  };
  viewModel.review = {
    ...viewModel.review,
    action: { disabled: true, label: "Review später", variant: "quiet" },
    lastRun: "Noch kein letzter Lauf",
    learnings: [],
    metrics: [],
    nextAdjustment: "Keine Anpassung ohne lokale Laufdaten.",
    signals: [],
  };
  viewModel.rhythm = {
    ...viewModel.rhythm,
    days: [],
    subtitle: "Der Rhythmus bleibt leer, bis lokale Laufdaten existieren.",
  };
  viewModel.loadRecovery = {
    ...viewModel.loadRecovery,
    intensitySplit: [],
    recoverySignal: {
      ...viewModel.loadRecovery.recoverySignal,
      detail: "Noch kein Recovery-Signal",
      progress: 0,
      value: "—",
    },
    weeklyLoad: {
      ...viewModel.loadRecovery.weeklyLoad,
      detail: "Noch keine Laufdaten",
      progress: 0,
      value: "—",
    },
  };
  viewModel.context = {
    ...viewModel.context,
    items: [],
    subtitle: "Kontext erscheint, sobald lokale Laufdaten vorhanden sind.",
  };
  viewModel.distanceTrend = {
    ...viewModel.distanceTrend,
    bars: [],
    statement: "Noch keine Laufdaten",
  };
  viewModel.recentRuns = {
    ...viewModel.recentRuns,
    items: [],
  };

  return viewModel;
}

function inactiveStrengthChips<T extends string>(
  chips: readonly { label: string; value: T; active?: boolean }[],
) {
  return chips.map((chip) => ({ ...chip, active: false }));
}

function buildProfileStrengthTrackerViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
): ReturnType<typeof getDemoStrengthTrackerViewModel> {
  const viewModel = clone(getDemoStrengthTrackerViewModel());

  viewModel.profileId = profileId;
  viewModel.contentStates = {
    boundaries: resolveContentStateMeta({ capacity: 5, itemCount: 5 }),
    header: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    loadRecovery: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    planner: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    progression: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    recentSets: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    review: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    rhythmBalance: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
    summary: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    todayPlan: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    trend: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
  };
  viewModel.header = {
    ...viewModel.header,
    meta:
      profileId === "manual"
        ? "Manual · keine Kraftsessions"
        : "Empty · keine Kraftsessions",
    pills: [
      { accent: "var(--accent-orange)", label: "Planner Shell" },
      { accent: "var(--accent-cyan)", label: "No local sessions" },
      { accent: "var(--accent-green)", label: "Self-tracked later" },
    ],
    decision: {
      ...viewModel.header.decision,
      detail:
        "Sobald eine lokale Kraftsession existiert, erscheint hier Kontext.",
      duration: "—",
      effort: "Noch kein lokaler Plan",
      progress: 0,
      readiness: "—",
      title: "Noch kein Krafttrainingskontext",
    },
  };
  viewModel.summary = [
    emptyHealthMetric("Sessions this week", "Noch keine Kraftsessions", "var(--accent-orange)"),
    emptyHealthMetric("Training load", "Noch keine Lastdaten", "var(--accent-yellow)"),
    emptyHealthMetric("Muscle balance", "Noch keine Balance-Daten", "var(--accent-red)"),
    emptyHealthMetric("Progression", "Noch keine Progression", "var(--accent-green)"),
    emptyHealthMetric("Recovery signal", "Noch kein Recovery-Signal", "var(--accent-cyan)"),
    emptyHealthMetric("Next session", "Noch keine Kraftsession geplant", "var(--accent-orange)"),
  ];
  viewModel.planner = {
    ...viewModel.planner,
    availableTimes: inactiveStrengthChips(viewModel.planner.availableTimes),
    effortTargets: inactiveStrengthChips(viewModel.planner.effortTargets),
    equipment: inactiveStrengthChips(viewModel.planner.equipment),
    movementInputs: [],
    primaryActions: [],
    secondaryActions: [],
    sessionTypes: inactiveStrengthChips(viewModel.planner.sessionTypes),
    suggestedSession: {
      detail:
        "Sobald lokale Sessions existieren, kann hier eine Session geplant werden.",
      steps: [],
      target: "—",
      title: "Noch kein Krafttrainingskontext",
    },
    trainingFocus: inactiveStrengthChips(viewModel.planner.trainingFocus),
  };
  viewModel.todayPlan = {
    ...viewModel.todayPlan,
    actions: [],
    checklist: [],
    details: [],
    plan: "Noch keine Kraftsession geplant",
  };
  viewModel.review = {
    ...viewModel.review,
    action: { disabled: true, label: "Review später", variant: "quiet" },
    adjustment: "Keine Anpassung ohne lokale Session.",
    lastSession: "Noch keine letzte Session",
    learning: "Noch keine Session-Notiz.",
    metrics: [],
    signals: [],
  };
  viewModel.rhythmBalance = {
    ...viewModel.rhythmBalance,
    balance: [],
    days: [],
    statement: "Noch keine Krafttrainingsdaten.",
    subtitle:
      "Rhythmus und Balance bleiben leer, bis lokale Sessions existieren.",
  };
  viewModel.loadRecovery = {
    ...viewModel.loadRecovery,
    recoverySignal: {
      ...viewModel.loadRecovery.recoverySignal,
      detail: "Noch kein Recovery-Signal",
      progress: 0,
      value: "—",
    },
    volumeSplit: [],
    weeklyLoad: {
      ...viewModel.loadRecovery.weeklyLoad,
      detail: "Noch keine Lastdaten",
      progress: 0,
      value: "—",
    },
  };
  viewModel.progression = {
    ...viewModel.progression,
    footer: "Progression erscheint nach lokalen Sessions.",
    rules: [],
    subtitle:
      "Progressionskontext bleibt leer, bis lokale Kraftdaten existieren.",
  };
  viewModel.trend = {
    ...viewModel.trend,
    statement: "Noch keine Krafttrainingsdaten.",
    weeks: [],
  };
  viewModel.recentSets = {
    ...viewModel.recentSets,
    items: [],
    note: "Sets erscheinen nach der ersten lokalen Session.",
  };

  return viewModel;
}

type ManualNutritionData = {
  recipeIngredientsByRecipeId: ReadonlyMap<
    string,
    readonly RealDataRecipeIngredient[]
  >;
  meals: readonly RealDataMeal[];
  recipes: readonly RealDataRecipe[];
  unavailableReason?: string;
};

const plannerMealTypes: readonly PlannerMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
];
const plannerIngredientUnits: readonly IngredientUnit[] = [
  "g",
  "ml",
  "piece",
  "tbsp",
  "tsp",
];

function formatLocalDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function todayDateLabel() {
  return formatLocalDate(new Date());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function startOfIsoWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  return start;
}

function nutritionAuthUnavailableReason(
  error: "auth_error" | "invalid_session" | "missing_env" | "unauthenticated",
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

  return "Melde dich an, um Nutrition-Daten zu laden.";
}

async function getManualNutritionData(range?: {
  endDate: string;
  startDate: string;
}): Promise<ManualNutritionData> {
  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      recipeIngredientsByRecipeId: new Map(),
      meals: [],
      recipes: [],
      unavailableReason: nutritionAuthUnavailableReason(auth.error),
    };
  }

  const repository = createSupabaseNutritionRepository(auth.client);
  const today = new Date();
  const startDate = range?.startDate ?? formatLocalDate(startOfIsoWeek(today));
  const endDate = range?.endDate ?? formatLocalDate(addDays(startOfIsoWeek(today), 30));
  const [recipesResult, mealsResult] = await Promise.all([
    repository.getActiveRecipesByUser(auth.user.id, auth.user.id),
    repository.getMealsByUserAndDateRange({
      endDate,
      profileId: auth.user.id,
      startDate,
      userId: auth.user.id,
    }),
  ]);

  if (!recipesResult.ok || !mealsResult.ok) {
    return {
      recipeIngredientsByRecipeId: new Map(),
      meals: [],
      recipes: [],
      unavailableReason:
        "Nutrition-Daten konnten nicht aus Supabase geladen werden.",
    };
  }

  const ingredientResults = await Promise.all(
    recipesResult.data.map((recipe) =>
      repository.getRecipeIngredients({
        profileId: auth.user.id,
        recipeId: recipe.id,
        userId: auth.user.id,
      }),
    ),
  );

  if (ingredientResults.some((result) => !result.ok)) {
    return {
      recipeIngredientsByRecipeId: new Map(),
      meals: [],
      recipes: [],
      unavailableReason:
        "Nutrition-Zutaten konnten nicht aus Supabase geladen werden.",
    };
  }

  const recipeIngredientsByRecipeId = new Map<
    string,
    readonly RealDataRecipeIngredient[]
  >();

  recipesResult.data.forEach((recipe, index) => {
    const result = ingredientResults[index];
    recipeIngredientsByRecipeId.set(recipe.id, result.ok ? result.data : []);
  });

  return {
    recipeIngredientsByRecipeId,
    meals: mealsResult.data,
    recipes: recipesResult.data,
  };
}

function emptyNutritionDay(date = todayDateLabel()): NutritionDay {
  return {
    calorie_actual: 0,
    calorie_target: 0,
    carbs_actual: 0,
    carbs_target: 0,
    date,
    fat_actual: 0,
    fat_target: 0,
    protein_actual: 0,
    protein_target: 0,
    water_actual: 0,
    water_target: 0,
  };
}

function nutritionEstimateNumber(
  estimate: RealDataRecipe["nutritionEstimate"],
  keys: readonly string[],
) {
  if (!estimate) return 0;

  for (const key of keys) {
    const value = estimate[key];
    const numberValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
}

function hasUsableNutritionEstimate(recipe?: RealDataRecipe) {
  const estimate = recipe?.nutritionEstimate;
  if (!estimate) return false;

  return ["calories", "kcal", "energy", "protein", "carbs", "carbohydrates", "fat"].some(
    (key) => {
      const value = estimate[key];
      const numeric =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number(value)
            : Number.NaN;

      return Number.isFinite(numeric);
    },
  );
}

function recipeTotals(recipe?: RealDataRecipe | null) {
  return {
    calories: nutritionEstimateNumber(recipe?.nutritionEstimate ?? null, [
      "calories",
      "kcal",
      "energy",
    ]),
    carbs: nutritionEstimateNumber(recipe?.nutritionEstimate ?? null, [
      "carbs",
      "carbohydrates",
    ]),
    fat: nutritionEstimateNumber(recipe?.nutritionEstimate ?? null, ["fat"]),
    protein: nutritionEstimateNumber(recipe?.nutritionEstimate ?? null, [
      "protein",
    ]),
  };
}

function recipeMealTypes(recipe: RealDataRecipe): PlannerMealType[] {
  const matchingTags = recipe.tags.filter((tag): tag is PlannerMealType =>
    plannerMealTypes.includes(tag as PlannerMealType),
  );

  return matchingTags.length > 0 ? matchingTags : [...plannerMealTypes];
}

function recipeInstructions(recipe: RealDataRecipe) {
  return (recipe.instructions ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${recipe.id}-instruction-${index + 1}`,
      order: index + 1,
      text,
    }));
}

function plannerIngredientUnit(unit: string | null): IngredientUnit {
  const normalized = (unit ?? "").trim().toLowerCase();

  if (normalized === "el") return "tbsp";
  if (normalized === "tl") return "tsp";
  if (normalized === "stueck" || normalized === "stück") return "piece";

  return plannerIngredientUnits.includes(normalized as IngredientUnit)
    ? (normalized as IngredientUnit)
    : "g";
}

function realRecipeIngredientToPlannerIngredient(
  ingredient: RealDataRecipeIngredient,
): PlannerRecipeIngredient {
  return {
    amount: ingredient.quantity ?? 0,
    calories: 0,
    carbs: 0,
    displayUnit: ingredient.unit,
    fat: 0,
    id: ingredient.id,
    name: ingredient.name,
    note: ingredient.note,
    position: ingredient.position,
    protein: 0,
    quantity: ingredient.quantity,
    unit: plannerIngredientUnit(ingredient.unit),
  };
}

function realRecipeToPlannerRecipe(
  recipe: RealDataRecipe,
  ingredients: readonly RealDataRecipeIngredient[] = [],
): PlannerRecipe {
  const totals = recipeTotals(recipe);

  return {
    archived: recipe.isArchived,
    createdAt: recipe.createdAt,
    defaultServings: recipe.servings ?? 1,
    description: recipe.summary ?? undefined,
    id: recipe.id,
    ingredients: ingredients.map(realRecipeIngredientToPlannerIngredient),
    instructions: recipeInstructions(recipe),
    mealTypes: recipeMealTypes(recipe),
    nutritionEstimateAvailable: hasUsableNutritionEstimate(recipe),
    prepMinutes: recipe.prepMinutes ?? undefined,
    tags: [...recipe.tags],
    title: recipe.title,
    totals,
    updatedAt: recipe.updatedAt,
  };
}

function realMealToNutritionEntry(
  meal: RealDataMeal,
  recipesById: ReadonlyMap<string, RealDataRecipe>,
): MealEntry {
  const recipe = meal.recipeId ? recipesById.get(meal.recipeId) : undefined;
  const totals = recipeTotals(recipe);
  const plannedAt =
    meal.completedAt !== null ? undefined : meal.plannedAt ?? `${meal.date}T12:00`;

  return {
    calories: totals.calories,
    consumed_at: meal.completedAt ?? undefined,
    id: meal.id,
    macros: {
      carbs: totals.carbs,
      fat: totals.fat,
      protein: totals.protein,
    },
    meal_type: meal.mealType,
    nutritionEstimateAvailable:
      hasUsableNutritionEstimate(recipe),
    planned_at: plannedAt,
    source: meal.recipeId ? "recipe" : "manual",
    title: meal.title,
  };
}

function buildProfileNutritionOverviewViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  nutritionData?: ManualNutritionData,
): ReturnType<typeof getDemoNutritionOverviewViewModel> {
  const viewModel = clone(getDemoNutritionOverviewViewModel());
  const today = todayDateLabel();
  const recipes = nutritionData?.recipes ?? [];
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const meals =
    profileId === "manual"
      ? (nutritionData?.meals ?? [])
          .filter((meal) => meal.date === today)
          .map((meal) => realMealToNutritionEntry(meal, recipesById))
      : [];
  const loggedMeals = meals.filter((meal) => meal.consumed_at);
  const plannedMeals = meals.filter(
    (meal) => meal.planned_at && !meal.consumed_at,
  );
  const day = loggedMeals.reduce<NutritionDay>(
    (current, meal) => ({
      ...current,
      calorie_actual: current.calorie_actual + meal.calories,
      carbs_actual: current.carbs_actual + meal.macros.carbs,
      fat_actual: current.fat_actual + meal.macros.fat,
      protein_actual: current.protein_actual + meal.macros.protein,
    }),
    emptyNutritionDay(today),
  );
  const primaryItemCount = loggedMeals.length + plannedMeals.length;
  const manualDbAvailable =
    profileId === "manual" && nutritionData?.unavailableReason === undefined;

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = manualDbAvailable;
  viewModel.recipeOptions = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
  }));
  viewModel.header = {
    ...viewModel.header,
    dateLabel: "Heute",
    summary:
      nutritionData?.unavailableReason ??
      (primaryItemCount > 0
        ? "Heute · Manual Meals aus Supabase"
        : "Heute · Nutrition-Shell ohne Demo-Daten"),
  };
  viewModel.pageContract = {
    ...viewModel.pageContract,
    canonicalSource:
      profileId === "manual"
        ? "Supabase recipes and meals scoped to the authenticated Manual user."
        : "Empty nutrition shell without demo data.",
    reads:
      profileId === "manual"
        ? "Manual recipes and meals from Supabase via the nutrition repository."
        : "No nutrition entities for the empty profile.",
    sensitiveData: "health_sensitive",
    writes:
      profileId === "manual"
        ? "Manual recipe and meal server actions."
        : "No writes in the empty profile.",
  };
  viewModel.day = day;
  viewModel.goals = [];
  viewModel.meals = meals;
  viewModel.weekBalance = [
    { day: "Mo", label: "leer", value: 0 },
    { day: "Di", label: "leer", value: 0 },
    {
      day: "Mi",
      label: primaryItemCount > 0 ? "lokal" : "leer",
      value: primaryItemCount > 0 ? 0.18 : 0,
    },
    { day: "Do", label: "leer", value: 0 },
    { day: "Fr", label: "leer", value: 0 },
    { day: "Sa", label: "leer", value: 0 },
    { day: "So", label: "leer", value: 0 },
  ];
  viewModel.weekBalanceStatement =
    primaryItemCount > 0
      ? "Lokale Mahlzeiten sind sichtbar; Wochenverlauf und Ziele fehlen noch."
      : "Noch keine Wochenbalance.";
  viewModel.adherence = {
    eaten: loggedMeals.length,
    open: plannedMeals.length,
    planned: primaryItemCount,
    replaced: 0,
    statement:
      primaryItemCount > 0
        ? "Manual Meals werden aus Supabase angezeigt; Zielprofile bleiben noch leer."
        : "Noch kein Wochenplan gesetzt.",
  };
  viewModel.priorities = [];
  viewModel.weightTrend = {
    axisLabel: "Trends erscheinen nach mehreren lokalen Einträgen.",
    periodLabel: "Lokaler Verlauf",
    statement: "Noch kein Gewichtstrend",
    values: [],
  };
  viewModel.grocerySignal = {
    actionLabel: "View grocery list",
    href: "/nutrition/grocery",
    ingredients: [],
    linkedMealsLabel: "0 linked meals",
    missingCount: 0,
  };
  viewModel.contentStates = {
    adherence: resolveContentStateMeta({ capacity: 21, itemCount: primaryItemCount }),
    grocerySignal: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    hydration: resolveContentStateMeta({
      capacity: 1,
      hasPrimaryValue: day.water_actual > 0,
      itemCount: day.water_actual > 0 ? 1 : 0,
    }),
    nextMeal: resolveContentStateMeta({
      capacity: 1,
      itemCount: plannedMeals.length > 0 ? 1 : 0,
    }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: primaryItemCount }),
    priorities: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    recentMeals: resolveContentStateMeta({
      capacity: 5,
      itemCount: Math.min(loggedMeals.length, 5),
    }),
    todayNutrition: resolveContentStateMeta({
      capacity: 5,
      itemCount: primaryItemCount > 0 ? 1 : 0,
    }),
    weekBalance: resolveContentStateMeta({
      capacity: 7,
      itemCount: primaryItemCount > 0 ? 1 : 0,
    }),
    weightTrend: resolveContentStateMeta({
      capacity: 3,
      hasHistory: false,
      hasPrimaryValue: false,
      itemCount: 0,
    }),
  };

  return viewModel;
}

function buildEmptyMealPlanWeek(
  week: ReturnType<typeof getDemoMealPlannerViewModel>["week"],
) {
  return {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => ({
        date: slot.date,
        mealType: slot.mealType,
      })),
    })),
  };
}

function weekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
  }).format(date);
}

function buildManualMealPlanWeek(
  recipes: readonly RealDataRecipe[],
  meals: readonly RealDataMeal[],
): MealPlanWeek {
  const start = startOfIsoWeek(new Date());
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));

  return {
    id: `manual-${formatLocalDate(start)}`,
    weekStartsOn: formatLocalDate(start),
    days: Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(start, dayIndex);
      const dateLabel = formatLocalDate(date);

      return {
        date: dateLabel,
        label: weekdayLabel(date),
        slots: plannerMealTypes.map((mealType) => {
          const meal = [...meals].reverse().find(
            (candidate) =>
              candidate.date === dateLabel &&
              candidate.mealType === mealType &&
              candidate.recipeId &&
              recipeIds.has(candidate.recipeId),
          );

          return {
            date: dateLabel,
            mealType,
            plannedMeal:
              meal && meal.recipeId
                ? {
                    date: meal.date,
                    id: meal.id,
                    ingredientAdjustments: [],
                    mealType,
                    recipeId: meal.recipeId,
                    title: meal.title,
                    notes: meal.notes,
                    plannedAt: meal.plannedAt,
                    completedAt: meal.completedAt,
                    servings: 1,
                  }
                : undefined,
          };
        }),
      };
    }),
  };
}

function buildProfileMealPlannerViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  nutritionData?: ManualNutritionData,
): ReturnType<typeof getDemoMealPlannerViewModel> {
  const viewModel = clone(getDemoMealPlannerViewModel());
  const recipes =
    profileId === "manual" && nutritionData
      ? nutritionData.recipes.map((recipe) =>
          realRecipeToPlannerRecipe(
            recipe,
            nutritionData.recipeIngredientsByRecipeId.get(recipe.id) ?? [],
          ),
        )
      : [];
  const plannedMealCount =
    profileId === "manual" && nutritionData
      ? nutritionData.meals.filter(
          (meal) =>
            plannerMealTypes.includes(meal.mealType as PlannerMealType) &&
            meal.recipeId,
        ).length
      : 0;

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.mealEditEnabled =
    profileId === "manual" && Boolean(nutritionData) && !nutritionData?.unavailableReason;
  viewModel.header = {
    ...viewModel.header,
    weekLabel: "Aktuelle Woche",
  };
  viewModel.pageContract = {
    ...viewModel.pageContract,
    canonicalSource:
      profileId === "manual"
        ? "Supabase meals projected into the current planner week."
        : "Empty planner shell without demo data.",
    reads:
      profileId === "manual"
        ? "Manual recipes and meals from Supabase."
        : "No meal plan entities for the empty profile.",
    writes:
      profileId === "manual"
        ? "Selected meals can be edited through the authenticated Supabase update path."
        : "No writes in the Empty planner shell.",
  };
  viewModel.profiles = [];
  viewModel.defaultProfileId = "";
  viewModel.recipes = recipes;
  viewModel.week =
    profileId === "manual" && nutritionData
      ? buildManualMealPlanWeek(nutritionData.recipes, nutritionData.meals)
      : buildEmptyMealPlanWeek(viewModel.week);
  viewModel.contentStates = {
    inspector: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 21, itemCount: plannedMealCount }),
    recipeSuggestions: resolveContentStateMeta({
      capacity: 8,
      itemCount: recipes.length,
    }),
    targetProfile: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    weekPlan: resolveContentStateMeta({
      capacity: 21,
      itemCount: plannedMealCount,
    }),
  };

  return viewModel;
}

function buildProfileRecipesViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  nutritionData?: ManualNutritionData,
): ReturnType<typeof getDemoRecipesViewModel> {
  const viewModel = clone(getDemoRecipesViewModel());
  const recipes =
    profileId === "manual" && nutritionData
      ? nutritionData.recipes.map((recipe) =>
          realRecipeToPlannerRecipe(
            recipe,
            nutritionData.recipeIngredientsByRecipeId.get(recipe.id) ?? [],
          ),
        )
      : [];

  viewModel.profileId = profileId;
  viewModel.actionsEnabled =
    profileId === "manual" && nutritionData?.unavailableReason === undefined;
  viewModel.recipes = recipes;
  viewModel.stats = summarizeRecipes(recipes);
  viewModel.pageContract = {
    ...viewModel.pageContract,
    canonicalSource:
      profileId === "manual"
        ? "Supabase recipes scoped to the authenticated Manual user."
        : "Empty recipe shell without demo data.",
    reads:
      profileId === "manual"
        ? "Manual recipes from Supabase via the nutrition repository."
        : "No recipes for the empty profile.",
    writes:
      profileId === "manual"
        ? "Manual recipe create, update and archive server actions."
        : "No writes in the empty profile.",
  };
  viewModel.contentStates = {
    browser: resolveContentStateMeta({ capacity: 8, itemCount: recipes.length }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: recipes.length }),
    selectedRecipe: resolveContentStateMeta({
      capacity: 1,
      itemCount: recipes.length > 0 ? 1 : 0,
    }),
    summary: resolveContentStateMeta({
      capacity: 5,
      itemCount: recipes.length > 0 ? 5 : 0,
    }),
  };

  return viewModel;
}

function buildProfileGroceryViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  nutritionData?: ManualNutritionData,
  rangeStart?: string,
): ReturnType<typeof getDemoGroceryViewModel> {
  const viewModel = clone(getDemoGroceryViewModel());
  const start = rangeStart ? new Date(`${rangeStart}T12:00:00`) : startOfIsoWeek(new Date());
  const startDate = formatLocalDate(start);
  const endDate = formatLocalDate(addDays(start, 6));
  const generatedDraft =
    profileId === "manual" && nutritionData && !nutritionData.unavailableReason
      ? generateGroceryDraft({
          ingredientsByRecipeId: nutritionData.recipeIngredientsByRecipeId,
          meals: nutritionData.meals,
          recipes: nutritionData.recipes,
        })
      : { items: [], mealsConsidered: 0, unresolvedMeals: [] };

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.generatedDraft = generatedDraft;
  viewModel.range = {
    endDate,
    nextStartDate: formatLocalDate(addDays(start, 7)),
    previousStartDate: formatLocalDate(addDays(start, -7)),
    startDate,
  };
  viewModel.unavailableReason = nutritionData?.unavailableReason;
  viewModel.header = {
    ...viewModel.header,
    subline:
      profileId === "manual"
        ? "Serverseitiger Grocery Draft aus offenen Meals und persistierten Recipe Ingredients."
        : viewModel.header.subline,
    weekLabel: `${startDate} – ${endDate}`,
  };
  viewModel.pageContract = {
    ...viewModel.pageContract,
    canonicalSource:
      profileId === "manual"
        ? "Supabase meals, recipes and recipe ingredients scoped to the authenticated Manual user."
        : "Empty Grocery shell without demo data.",
    reads:
      profileId === "manual"
        ? "Server-side Grocery Draft projection for the selected week."
        : "No Grocery source entities for the Empty profile.",
    writes: "No Grocery persistence; generated draft is read-only.",
  };
  viewModel.week = buildEmptyMealPlanWeek(viewModel.week);
  viewModel.recipes = [];
  viewModel.pantryItems = [];
  viewModel.mustHaveItems = [];
  viewModel.receiptUploads = [];
  viewModel.receiptLineItems = [];
  viewModel.initialDemand = [];
  viewModel.summary = {
    fromMealPlan: 0,
    fromMustList: 0,
    inStockItems: 0,
    receiptsPendingReview: 0,
    toBuyItems: 0,
  };
  viewModel.contentStates = {
    mustHave: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    page: resolveContentStateMeta({
      capacity: 12,
      itemCount: generatedDraft.items.length + generatedDraft.unresolvedMeals.length,
    }),
    pantry: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    receipts: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    summary: resolveContentStateMeta({
      capacity: 5,
      itemCount: generatedDraft.mealsConsidered > 0 ? 1 : 0,
    }),
    toBuy: resolveContentStateMeta({ capacity: 8, itemCount: generatedDraft.items.length }),
  };

  return viewModel;
}

export function getProfileEmptyStateText(
  profileId: LifeOsProfileId,
  areaLabel: string,
) {
  return profileEmptyText(profileId, areaLabel);
}

export function getBlockedDemoFragments() {
  return [...blockedDemoFragments];
}

function educationEmptyWeeklyDays(): WeeklyLearningDay[] {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    dayLabel: day as WeeklyLearningDay["dayLabel"],
    id: `empty-${day.toLowerCase()}`,
    minutes: 0,
    status: "rest",
  }));
}

function emptyMasterThesisState(): MasterThesisState {
  return {
    currentPhase: "orientation",
    id: "empty-master-thesis-focus",
    milestoneCount: 0,
    nextAction: "Keine nächste Forschungsaktion",
    noteCount: 0,
    progress: 0,
    sourceCount: 0,
    title: "Noch kein wissenschaftlicher Fokus",
  };
}

function buildProfileEducationOverviewViewModel(
  profileId: Exclude<EducationProfileId, "demo">,
): EducationOverviewViewModel {
  const viewModel = clone(getDemoEducationOverviewViewModel());

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.header = {
    ...viewModel.header,
    summary:
      "Research-Shell ohne Demo-Daten fuer Ideen, Literatur, Felder und Notizen.",
  };
  viewModel.focus = {
    field: null,
    idea: null,
    literatureItems: [],
    literatureProgressLabel: "0 sources · 0 reviewed · 0 to read",
    notes: [],
    openQuestions: [],
    reviewedSourceCount: 0,
    toReadSourceCount: 0,
  };
  viewModel.stats = {
    activeIdeaCount: 0,
    openQuestionCount: 0,
    queuedLiteratureCount: 0,
    reviewNeededNoteCount: 0,
  };
  viewModel.ideas = [];
  viewModel.fields = [];
  viewModel.literature = [];
  viewModel.notes = [];
  viewModel.questions = [];
  viewModel.rhythm = [
    {
      id: "education-empty-ideas",
      label: "Research-Ideen",
      tone: "blue",
      value: "0",
    },
    {
      id: "education-empty-literature",
      label: "Literatur",
      tone: "cyan",
      value: "0",
    },
    {
      id: "education-empty-notes",
      label: "Research-Notizen",
      tone: "orange",
      value: "0",
    },
  ];
  viewModel.methodNotes = [
    "Manual Data Gap: lokale Research-Ideen existieren noch nicht.",
    "Manual Data Gap: lokale Literatur- und Notizquellen existieren noch nicht.",
    "Keine Fake-Literatur, Forschungsfragen oder Thesis-Fortschritte.",
    "Persistente Education-Flows bleiben spaeteren Slices vorbehalten.",
    "Demo-Fixtures bleiben auf das Demo-Profil begrenzt.",
  ];
  viewModel.contentStates = {
    currentResearchFocus: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    filters: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
    literatureQueue: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    recentResearchNotes: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    researchFields: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    researchIdeaPipeline: resolveContentStateMeta({
      capacity: 5,
      itemCount: 0,
    }),
    summary: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
  };

  return viewModel;
}

function buildProfileEducationWorkspaceViewModel(
  profileId: Exclude<EducationProfileId, "demo">,
): EducationWorkspaceViewModel {
  const viewModel = clone(getDemoEducationWorkspaceViewModel());

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.ideas = [];
  viewModel.fields = [];
  viewModel.literature = [];
  viewModel.notes = [];
  viewModel.questions = [];
  viewModel.masterThesis = emptyMasterThesisState();
  viewModel.masterThesisMilestones = [];
  viewModel.contentStates = {
    extractionFocus: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    filters: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
    highRelevanceSources: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    literatureQueue: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    masterThesisFocus: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    recentResearchNotes: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    researchFields: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    researchIdeas: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    researchQuestions: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    scientificWorkPapers: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
    statusSummary: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
  };

  return viewModel;
}

function buildProfileLearningLogViewModel(
  profileId: Exclude<EducationProfileId, "demo">,
): LearningLogViewModel {
  const viewModel = clone(getDemoLearningLogViewModel());

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.tracks = [];
  viewModel.sessions = [];
  viewModel.practiceQueue = [];
  viewModel.insights = [];
  viewModel.week = educationEmptyWeeklyDays();
  viewModel.weeklyGoal =
    "Lege später einen lokalen Lerntrack an, um Sessions, Practice und Nachweise zu verbinden.";
  viewModel.methodNotes = [
    "Manual Data Gap: lokale Learning Tracks existieren noch nicht.",
    "Manual Data Gap: lokale Learning Sessions existieren noch nicht.",
    "Manual Data Gap: lokale Practice Items existieren noch nicht.",
    "Keine Fake-Lernsessions oder Plattformdaten im Empty-/Manual-State.",
    "Persistente Learning-Log-Flows bleiben spaeteren Slices vorbehalten.",
  ];
  viewModel.contentStates = {
    activeTracks: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    currentLearningFocus: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    filters: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    practiceQueue: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    trackSummary: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    weeklyRhythm: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
  };

  return viewModel;
}

export async function getHealthOverviewViewModel(): Promise<
  ReturnType<typeof getDemoHealthOverviewViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoHealthOverviewViewModel();
  }

  if (profileId === "manual") {
    const auth = await createAuthenticatedSupabaseServerClient();
    if (auth.ok) {
      const repository = createSupabaseHabitRepository(auth.client);
      const training = await createSupabaseTrainingRepository(auth.client).getSnapshot(auth.user.id);
      const settings = await repository.getSettings(auth.user.id, auth.user.id);
      if (settings) {
        const today = localDateInTimeZone(new Date(), settings.timezone);
        const start = new Date(`${today}T00:00:00.000Z`);
        start.setUTCDate(start.getUTCDate() - 29);
        const snapshot = await repository.getSnapshot(
          auth.user.id,
          auth.user.id,
          start.toISOString().slice(0, 10),
          today,
        );
        return buildProfileHealthOverviewViewModel(
          profileId,
          await readManualProfile(),
          snapshot.ok ? snapshot.data : null,
          training.ok ? training.data : null,
        );
      }
      return buildProfileHealthOverviewViewModel(
        profileId,
        await readManualProfile(),
        null,
        training.ok ? training.data : null,
      );
    }
  }

  return buildProfileHealthOverviewViewModel(profileId, await readManualProfile(), null);
}

export async function getHabitsAnalyticsViewModel(): Promise<
  ReturnType<typeof getDemoHabitsAnalyticsViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoHabitsAnalyticsViewModel();
  }

  return buildProfileHabitsAnalyticsViewModel(
    profileId,
    await readManualProfile(),
  );
}

export async function getRunningTrackerViewModel(): Promise<
  ReturnType<typeof getDemoRunningTrackerViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoRunningTrackerViewModel();
  }

  return buildProfileRunningTrackerViewModel(profileId);
}

export async function getStrengthTrackerViewModel(): Promise<
  ReturnType<typeof getDemoStrengthTrackerViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoStrengthTrackerViewModel();
  }

  return buildProfileStrengthTrackerViewModel(profileId);
}

export async function getNutritionOverviewViewModel(): Promise<
  ReturnType<typeof getDemoNutritionOverviewViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoNutritionOverviewViewModel();
  }

  return buildProfileNutritionOverviewViewModel(
    profileId,
    profileId === "manual" ? await getManualNutritionData() : undefined,
  );
}

export async function getMealPlannerViewModel(): Promise<
  ReturnType<typeof getDemoMealPlannerViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoMealPlannerViewModel();
  }

  return buildProfileMealPlannerViewModel(
    profileId,
    profileId === "manual" ? await getManualNutritionData() : undefined,
  );
}

export async function getRecipesViewModel(): Promise<
  ReturnType<typeof getDemoRecipesViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoRecipesViewModel();
  }

  return buildProfileRecipesViewModel(
    profileId,
    profileId === "manual" ? await getManualNutritionData() : undefined,
  );
}

export async function getGroceryViewModel(rangeStart?: string): Promise<
  ReturnType<typeof getDemoGroceryViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoGroceryViewModel();
  }

  const parsedStart = rangeStart && /^\d{4}-\d{2}-\d{2}$/.test(rangeStart)
    ? rangeStart
    : formatLocalDate(startOfIsoWeek(new Date()));
  const range = {
    startDate: parsedStart,
    endDate: formatLocalDate(addDays(new Date(`${parsedStart}T12:00:00`), 6)),
  };

  return buildProfileGroceryViewModel(
    profileId,
    profileId === "manual" ? await getManualNutritionData(range) : undefined,
    parsedStart,
  );
}

export async function getCodingOverviewViewModel(): Promise<
  ReturnType<typeof getDemoCodingOverviewViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoCodingOverviewViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  const auth =
    profileId === "manual"
      ? await createAuthenticatedSupabaseServerClient()
      : null;
  const workspace = auth?.ok
    ? await createSupabaseCodingRepository(auth.client).getWorkspace(auth.user.id)
    : null;

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      contextLine: "No local Coding records yet · manual setup only",
      stats: [
        { label: "0 focus", accent: "var(--accent-blue)" },
        { label: "0 repositories", accent: "var(--accent-blue)" },
        { label: "0 reviews", accent: "var(--accent-orange)" },
      ],
    },
    projects: [],
    manualWorkspace: profileId === "manual" ? {
      authAvailable: Boolean(auth?.ok),
      projects: (workspace?.projects ?? []).map((project) => ({
        ...project,
        resources: [...(workspace?.resourcesByProject.get(project.id) ?? [])],
        tasks: [...(workspace?.tasksByProject.get(project.id) ?? [])],
      })),
      sessions: workspace?.sessions ?? [],
    } : undefined,
    repositories: [],
    currentFocus: null,
    activeWork: [],
    agentQueue: [],
    repositoriesAttention: [],
    recentSessions: [],
    skillFocus: null,
    knowledgeUpdates: [],
    codingRhythm: {
      ...viewModel.codingRhythm,
      statement: "No coding sessions logged yet.",
      days: viewModel.codingRhythm.days.map((day) => ({
        ...day,
        label: `${day.day}: no session logged`,
        minutes: 0,
        sessions: 0,
      })),
      insight:
        "Coding rhythm appears after real local sessions are recorded.",
    },
    emptyStates: {
      noRepositories: {
        title: "No repositories recorded",
        description:
          "Repository workbench structure is ready. Add a local repository draft before linking tasks, resources or sessions.",
      },
      noFocus: {
        title: "No active coding focus",
        description:
          "Define one repository or project next action before starting a coding session.",
      },
    },
  };
}

export async function getRepositoriesViewModel(): Promise<
  ReturnType<typeof getDemoRepositoriesViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoRepositoriesViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  const profile = profileId === "manual" ? await readManualProfile() : null;

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      contextLine: "Manual repository workbench · no GitHub sync configured",
      stats: [
        {
          label: "Repositories",
          value: "0",
          detail: "local records",
          accent: "var(--accent-blue)",
        },
        {
          label: "Attention",
          value: "0",
          detail: "no local signals",
          accent: "var(--accent-orange)",
        },
        {
          label: "Reviews",
          value: "0",
          detail: "no agent outputs",
          accent: "var(--accent-orange)",
        },
      ],
    },
    repositories: [],
    tasks: [],
    resources: [],
    agentSessions: [],
    activity: [],
    projectOptions:
      profile?.projects.map((project) => ({
        label: project.title,
        value: project.id,
      })) ?? [],
    emptyStates: {
      noRepositories: {
        title: "No repositories recorded",
        description:
          "The repository workbench is ready for local drafts. No GitHub repository, token or sync job exists yet.",
      },
      noSearchResults: {
        title: "No repositories match this filter",
        description:
          "Adjust filters or add a local repository draft. No demo repositories are used as fallback.",
      },
      noLinkedTasks: {
        title: "No linked tasks",
        description:
          "Linked tasks appear after a real local repository context exists. Demo tasks are not reused here.",
      },
    },
  };
}

export async function getAgentHubViewModel(): Promise<
  ReturnType<typeof getDemoAgentHubViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoAgentHubViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  const profile = profileId === "manual" ? await readManualProfile() : null;

  return {
    ...clone(viewModel),
    profileId,
    workers: viewModel.workers.map((worker) => ({
      ...worker,
      currentTaskId: undefined,
      lastSessionAt: undefined,
      reliabilityNote:
        "Role shell only. No worker is configured, connected or running in this profile.",
      status: "needs_setup" as const,
    })),
    tasks: [],
    sessions: [],
    outputs: [],
    promptTemplates: [],
    contextBundles: [],
    projects:
      profile?.projects.map((project) => ({
        id: project.id,
        title: project.title,
      })) ?? [],
    repositories: [],
    emptyStates: {
      noTasks: {
        title: "No agent tasks queued",
        description:
          "Create a local draft only when a scoped human-reviewed agent handoff exists. No worker starts automatically.",
      },
      noWorkers: {
        title: "No worker profiles configured",
        description:
          "Worker roles are visible as shells, but no provider or automation is connected.",
      },
      noReviewItems: {
        title: "No outputs waiting for review",
        description:
          "Review queue stays empty until real local output exists. Demo outputs are not used as fallback.",
      },
      noPrompts: {
        title: "No prompt templates yet",
        description:
          "Prompt templates can be drafted locally; no prompt library or provider is connected.",
      },
    },
  };
}

export async function getSkillMapViewModel(): Promise<
  ReturnType<typeof getDemoSkillMapViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoSkillMapViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  return {
    ...clone(viewModel),
    profileId,
    skills: [],
    connections: [],
    clusters: [],
    evidence: [],
    projects: [],
    requirements: [],
    recommendations: [],
    insight:
      "Manual skill mapping is empty. Add local skills and evidence before project gaps are evaluated.",
    emptyStates: {
      noSkills: {
        title: "No coding skills mapped",
        description:
          "The skill workbench is ready for local skill drafts. No demo skills, evidence or progress values are used.",
      },
      noRequirements: {
        title: "No project skill gaps",
        description:
          "Project gap cards appear after real skill requirements exist.",
      },
      noEvidence: {
        title: "No evidence attached",
        description:
          "Evidence appears after local proof points are added to a real skill.",
      },
      noSearchResults: {
        title: "No matching skills",
        description:
          "Adjust filters or add a local skill draft. Demo skills are not used as fallback.",
      },
    },
  };
}

export async function getLifeOverviewViewModel(): Promise<
  ReturnType<typeof getDemoLifeOverviewViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoLifeOverviewViewModel();

  if (profileId === "demo") {
    return {
      ...viewModel,
      profileId,
      contentStates: {
        page: resolveContentStateMeta({ capacity: 8, itemCount: 8 }),
        personalCheckIn: resolveContentStateMeta({
          capacity: 1,
          itemCount: viewModel.journalEntries.length > 0 ? 1 : 0,
        }),
        lifeSections: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.sections.length,
        }),
        looseNotes: resolveContentStateMeta({
          capacity: 5,
          itemCount: viewModel.notes.length,
        }),
        inventoryFocus: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.inventory.length,
        }),
        entertainmentShelf: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.entertainment.length,
        }),
        recentActivity: resolveContentStateMeta({
          capacity: 5,
          itemCount: viewModel.recentActivity.length,
        }),
        personalSignals: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.metrics.length,
        }),
      },
    };
  }

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      statusLabel: "Neutral",
      context:
        "Private personal context shell. No demo data, persistence or automation is connected.",
    },
    journalEntries: [],
    notes: [],
    entertainment: [],
    inventory: [],
    sections: viewModel.sections.map((section) => ({
      ...section,
      lastActivity: "Noch keine lokalen Daten",
      openItems: "0",
      purpose:
        section.id === "journal"
          ? "Private Reflexionen und Review-Prompts."
          : section.id === "notes"
            ? "Lose Gedanken, die nicht automatisch zu Tasks werden."
            : section.id === "entertainment"
              ? "Private Medienliste ohne Social- oder Rating-Mechanik."
              : "Besitz, Wünsche und Ersatzbedarf ohne Finanzberatung.",
      nextAction: "Lokale Datenquelle noch offen",
    })),
    metrics: [
      {
        id: "journal-neutral",
        label: "Journal entries",
        value: "0",
        helper: "Noch keine lokalen Reflexionen vorhanden.",
        tone: "purple",
      },
      {
        id: "notes-neutral",
        label: "Loose notes",
        value: "0",
        helper: "Keine automatische Task- oder Resource-Konvertierung.",
        tone: "cyan",
      },
      {
        id: "wishlist-neutral",
        label: "Wishlist decisions",
        value: "0",
        helper: "Budget Fit bleibt ein manuelles Planungssignal.",
        tone: "orange",
      },
      {
        id: "media-neutral",
        label: "Media items",
        value: "0",
        helper: "Keine Social-, Rating- oder Lookup-Integration.",
        tone: "gray",
      },
    ],
    recentActivity: [],
    reviewDots: [],
    contentStates: {
      page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
      personalCheckIn: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
      lifeSections: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
      looseNotes: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      inventoryFocus: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      entertainmentShelf: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      recentActivity: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      personalSignals: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    },
  };
}

export async function getLifeManualWorkspace() {
  if (await getCurrentLifeOsProfileId() !== "manual") return undefined;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  return createSupabaseLifeRepository(auth.client).getWorkspace(auth.user.id);
}

export async function getLifeEntertainmentWorkspace() {
  if (await getCurrentLifeOsProfileId() !== "manual") return undefined;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  return createSupabaseLifeRepository(auth.client).getEntertainmentWorkspace(auth.user.id);
}

export async function getLifeInventoryWorkspace() {
  if (await getCurrentLifeOsProfileId() !== "manual") return undefined;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  return createSupabaseLifeRepository(auth.client).getInventoryWorkspace(auth.user.id);
}

export async function getJournalPageViewModel(): Promise<
  ReturnType<typeof getDemoJournalPageViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoJournalPageViewModel();

  if (profileId === "demo") {
    return {
      ...viewModel,
      profileId,
      contentStates: {
        page: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
        writingFocus: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
        recentEntries: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.entries.length,
        }),
        reflectionPrompts: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.prompts.length,
        }),
        journalPattern: resolveContentStateMeta({ capacity: 3, itemCount: 3 }),
      },
    };
  }

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      context:
        "Private reflexion shell. No demo entries, therapy flow or persistent journal source is connected.",
    },
    entries: [],
    prompts: [],
    contentStates: {
      page: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      writingFocus: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
      recentEntries: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      reflectionPrompts: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      journalPattern: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    },
  };
}

export async function getNotesPageViewModel(): Promise<
  ReturnType<typeof getDemoNotesPageViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoNotesPageViewModel();

  if (profileId === "demo") {
    return {
      ...viewModel,
      profileId,
      contentStates: {
        page: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
        brainDumpHistory: resolveContentStateMeta({
          capacity: 5,
          itemCount: viewModel.notes.length,
        }),
        noteComposer: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
        noteTypes: resolveContentStateMeta({
          capacity: 7,
          itemCount: viewModel.notes.length,
        }),
        captureSources: resolveContentStateMeta({
          capacity: 3,
          itemCount: viewModel.notes.length,
        }),
      },
    };
  }

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      context:
        "Loose note shell. No demo notes or automatic Task/Resource conversion is connected.",
    },
    notes: [],
    contentStates: {
      page: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      brainDumpHistory: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      noteComposer: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
      noteTypes: resolveContentStateMeta({ capacity: 7, itemCount: 0 }),
      captureSources: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    },
  };
}

export async function getEntertainmentPageViewModel(): Promise<
  ReturnType<typeof getDemoEntertainmentPageViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoEntertainmentPageViewModel();

  if (profileId === "demo") {
    const currentItems = viewModel.items.filter((item) =>
      ["watching", "reading", "playing"].includes(item.status),
    );
    const wishlistItems = viewModel.items.filter(
      (item) => item.status === "wishlist",
    );
    const finishedPausedItems = viewModel.items.filter((item) =>
      ["finished", "paused"].includes(item.status),
    );

    return {
      ...viewModel,
      profileId,
      contentStates: {
        page: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
        shelf: resolveContentStateMeta({
          capacity: 6,
          itemCount: viewModel.items.length,
        }),
        currentMedia: resolveContentStateMeta({
          capacity: 5,
          itemCount: currentItems.length,
        }),
        wishlist: resolveContentStateMeta({
          capacity: 5,
          itemCount: wishlistItems.length,
        }),
        finishedPaused: resolveContentStateMeta({
          capacity: 5,
          itemCount: finishedPausedItems.length,
        }),
      },
    };
  }

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      context:
        "Private media shell. No demo media, social rating, watchlist sync or lookup API is connected.",
    },
    items: [],
    contentStates: {
      page: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      shelf: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
      currentMedia: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      wishlist: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      finishedPaused: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    },
  };
}

export async function getInventoryPageViewModel(): Promise<
  ReturnType<typeof getDemoInventoryPageViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoInventoryPageViewModel();

  if (profileId === "demo") {
    const wishlistItems = viewModel.items.filter((item) =>
      ["wishlist", "planned_purchase", "needs_replacement"].includes(
        item.status,
      ),
    );
    const ownedItems = viewModel.items.filter(
      (item) => item.owned || item.status === "owned",
    );

    return {
      ...viewModel,
      profileId,
      contentStates: {
        page: resolveContentStateMeta({ capacity: 4, itemCount: 4 }),
        inventoryWishlist: resolveContentStateMeta({
          capacity: 6,
          itemCount: viewModel.items.length,
        }),
        wishlistDecisions: resolveContentStateMeta({
          capacity: 5,
          itemCount: wishlistItems.length,
        }),
        ownedItems: resolveContentStateMeta({
          capacity: 5,
          itemCount: ownedItems.length,
        }),
        budgetSummary: resolveContentStateMeta({
          capacity: 4,
          itemCount: viewModel.items.length,
        }),
      },
    };
  }

  return {
    ...clone(viewModel),
    profileId,
    header: {
      ...viewModel.header,
      context:
        "Private inventory shell. Budget Fit is only a manual planning signal; no price, shopping or payment logic is connected.",
    },
    items: [],
    contentStates: {
      page: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
      inventoryWishlist: resolveContentStateMeta({ capacity: 6, itemCount: 0 }),
      wishlistDecisions: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      ownedItems: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
      budgetSummary: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    },
  };
}

const profileWorkSections: WorkSection[] = [
  {
    href: "/work/log",
    id: "log",
    lastActivity: "Noch keine lokalen Work-Logs",
    nextAction:
      "Work-Logs erscheinen hier, sobald eine persistente lokale Quelle existiert.",
    openItems: 0,
    purpose: "Tagebuch fuer Arbeit, Ergebnis, Loesungsweg und Follow-ups.",
    title: "Work Log",
  },
  {
    href: "/work/wiki",
    id: "wiki",
    lastActivity: "Noch keine lokalen Wiki-Notizen",
    nextAction:
      "Wiki-Notizen erscheinen hier, sobald eine persistente lokale Quelle existiert.",
    openItems: 0,
    purpose: "Persoenlicher Nachschlageort fuer Begriffe, Prozesse und How-tos.",
    title: "Wiki",
  },
  {
    href: "/work/meetings",
    id: "meetings",
    lastActivity: "Keine Meeting-Kontexte",
    nextAction:
      "Meetings bleiben ein interner Kontext und sind nicht Teil dieses Baseline-Passes.",
    openItems: 0,
    purpose: "Meetingnotizen, Entscheidungen und offene Punkte vorbereiten.",
    title: "Meetings",
  },
];

const profileWorkPrivacyNotes = [
  "Work notes stay private and local.",
  "Do not store secrets or credentials.",
  "Do not paste confidential employer or customer details.",
  "Architecture notes stay personal learning context.",
  "Wiki entries are personal lookup notes, not official documentation.",
] as const;

function workTaskStatusFromTask(status: TaskStatus): WorkTaskStatus {
  if (status === "active") return "in_progress";
  if (status === "waiting") return "blocked";
  if (status === "done") return "done";
  if (status === "canceled") return "archived";
  return "open";
}

function workTaskPriorityFromTask(priority: EntityPriority): WorkTask["priority"] {
  if (priority === "P0" || priority === "P1") return "high";
  if (priority === "P2") return "medium";
  return "low";
}

function manualWorkTasks(profile: ManualProfileData): WorkTask[] {
  return profile.tasks
    .filter((task) => task.areaId === "work")
    .map((task) => ({
      context:
        task.description ||
        "Lokaler Work-Task aus dem Manual-Profil ohne Work-Log-Verknuepfung.",
      id: task.id,
      linkedActivityIds: [],
      linkedWikiEntryIds: [],
      nextAction: task.nextStep,
      priority: workTaskPriorityFromTask(task.priority),
      status: workTaskStatusFromTask(task.status),
      title: task.title,
      updatedAt: task.date ?? "manual",
    }));
}

function buildProfileWorkOverviewViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  profile: ManualProfileData,
): WorkOverviewViewModel {
  const tasks = manualWorkTasks(profile);
  const viewModel = {
    activities: [],
    architectureItems: [],
    followUps: [],
    logs: [],
    meetings: [],
    privacyNotes: profileWorkPrivacyNotes.slice(),
    profileId,
    sections: profileWorkSections,
    tasks,
    wikiEntries: [],
  } satisfies Omit<WorkOverviewViewModel, "contentStates">;

  return {
    ...viewModel,
    contentStates: buildWorkOverviewContentStates(viewModel),
  };
}

function buildProfileWorkLogViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  profile: ManualProfileData,
): WorkLogViewModel {
  const viewModel = {
    activities: [],
    architectureItems: [],
    followUps: [],
    logs: [],
    profileId,
    tasks: manualWorkTasks(profile),
    wikiEntries: [],
  } satisfies Omit<WorkLogViewModel, "contentStates">;

  return {
    ...viewModel,
    contentStates: buildWorkLogContentStates(viewModel),
  };
}

function buildProfileWorkWikiViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  profile: ManualProfileData,
): WorkWikiViewModel {
  const viewModel = {
    architectureItems: [],
    logs: [],
    profileId,
    tasks: manualWorkTasks(profile),
    wikiEntries: [],
  } satisfies Omit<WorkWikiViewModel, "contentStates">;

  return {
    ...viewModel,
    contentStates: buildWorkWikiContentStates(viewModel),
  };
}

export async function getEducationOverviewViewModel(): Promise<EducationOverviewViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoEducationOverviewViewModel();
  }

  const viewModel = buildProfileEducationOverviewViewModel(profileId);
  if (profileId !== "manual") return viewModel;
  const auth = await createAuthenticatedSupabaseServerClient();
  const workspace = auth.ok
    ? await createSupabaseEducationRepository(auth.client).getWorkspace(auth.user.id)
    : { projects: [], resources: [] };
  return {
    ...viewModel,
    actionsEnabled: auth.ok,
    manualWorkspace: {
      authAvailable: auth.ok,
      projects: workspace.projects,
      resources: workspace.resources,
    },
  };
}

export async function getEducationWorkspaceViewModel(): Promise<EducationWorkspaceViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoEducationWorkspaceViewModel();
  }

  return buildProfileEducationWorkspaceViewModel(profileId);
}

export async function getLearningLogViewModel(): Promise<LearningLogViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoLearningLogViewModel();
  }

  return buildProfileLearningLogViewModel(profileId);
}

export async function getWorkOverviewViewModel(): Promise<WorkOverviewViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoWorkOverviewViewModel();
  }

  const viewModel = buildProfileWorkOverviewViewModel(profileId, await readManualProfile());
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return { ...viewModel, manualWorkspace: { authAvailable: false, projects: [], wiki: [], decisions: [], meetings: [] } };
  const [workspace, knowledge, meetings] = await Promise.all([createSupabaseWorkRepository(auth.client).getWorkspace(auth.user.id), createSupabaseWorkKnowledgeRepository(auth.client).getKnowledge(auth.user.id), createSupabaseWorkMeetingRepository(auth.client).getMeetings(auth.user.id)]);
  return { ...viewModel, manualWorkspace: { authAvailable: true, projects: workspace.projects, ...knowledge, meetings } };
}

export async function getWorkLogViewModel(): Promise<WorkLogViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoWorkLogViewModel();
  }

  return buildProfileWorkLogViewModel(profileId, await readManualProfile());
}

export async function getWorkWikiViewModel(): Promise<WorkWikiViewModel> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoWorkWikiViewModel();
  }

  return buildProfileWorkWikiViewModel(profileId, await readManualProfile());
}

function manualResourceSourceLabel(source: string | null, url: string | null) {
  if (source?.startsWith("inbox:")) return "Inbox Capture";
  if (url) return "URL";
  return "Manual";
}

function realResourceToResourceItem(resource: RealDataResource): ResourceItem {
  const source = manualResourceSourceLabel(resource.source, resource.url);
  const summary = resource.body ?? resource.url ?? "Keine Kurzfassung erfasst.";

  return {
    actions: [
      {
        detail: "Review in Resources fortsetzen",
        label: resource.reviewNeeded ? "Review" : "Öffnen",
      },
    ],
    area: "review",
    clusterId: "manual-resources",
    id: resource.id,
    keyLearning: summary,
    lastTouched: "Manual",
    linkedContext: "Noch nicht verknüpft",
    linkedContexts: [],
    nextUse: resource.reviewNeeded
      ? "Resource prüfen und bei Bedarf verknüpfen."
      : "Bei Bedarf in Arbeit oder Lernen wiederverwenden.",
    relatedResources: [],
    reviewState: resource.reviewNeeded ? "needs_extraction" : "ready_to_reuse",
    source,
    status: resource.archivedAt ? "archived" : resource.reviewNeeded ? "review_needed" : "raw",
    summary,
    title: resource.title,
    url: resource.url ?? undefined,
    archivedAt: resource.archivedAt ?? undefined,
    topic: resource.url ? "Link" : "Inbox",
    type: resource.type,
  };
}

function manualResourceReviewQueueItem(
  resource: ResourceItem,
): ResourceReviewQueueItem {
  return {
    accent: "var(--accent-purple)",
    action: "Review",
    linkedContext: resource.linkedContext,
    resourceId: resource.id,
    sourceType: resource.type,
    status: "Review needed",
    suggestedActions: ["Kurzfassung prüfen", "Kontext später verknüpfen"],
    targetType: "Resource",
    title: resource.title,
  };
}

async function getManualResourcesFromSupabase(
  client: SupabaseClientLike,
  userId: string,
): Promise<{
  relationTargets: ResourceRelationCreateTarget[];
  resources: ResourceItem[];
}> {
  const repository = createSupabaseResourceRepository(client);
  const [resourceResult, relationResult, relationTargets] = await Promise.all([
    repository.getResourcesByUser(userId, userId, true),
    repository.getResourceRelationsByUser(userId, userId),
    getResourceRelationCreateTargets(client, userId),
  ]);

  if (!resourceResult.ok) {
    return {
      relationTargets,
      resources: [],
    };
  }

  const resourceItems = resourceResult.data.map(realResourceToResourceItem);

  if (!relationResult.ok || relationResult.data.length === 0) {
    return {
      relationTargets,
      resources: resourceItems.map((resource) => ({
        ...resource,
        connectedContext: buildSemanticConnectedContext([], {
          historical: Boolean(resource.archivedAt),
        }),
        relatedGoals: [],
        relatedProjects: [],
        relatedResourceRelations: [],
        relatedSkills: [],
        relatedTasks: [],
        relations: [],
      })),
    };
  }

  const resolvedTargets = await resolveResourceRelationTargets({
    client,
    relations: relationResult.data,
    userId,
  });
  const relationViewModels = relationResult.data.map((relation) =>
    resourceRelationToViewModel(relation, resolvedTargets),
  );
  const relationsByResource = new Map<string, ResourceRelationViewModel[]>();

  for (const relation of relationViewModels) {
    const resourceRelations = relationsByResource.get(relation.resourceId) ?? [];
    resourceRelations.push(relation);
    relationsByResource.set(relation.resourceId, resourceRelations);
  }

  return {
    relationTargets,
    resources: resourceItems.map((resource) => {
      const resourceRelations = relationsByResource.get(resource.id) ?? [];

      return {
        ...resource,
        connectedContext: buildSemanticConnectedContext(
          resourceRelations
            .filter(
              (relation) =>
                !relation.targetMissing && relation.targetType !== "resource",
            )
            .map((relation) => ({
              archived: false,
              direct: true,
              direction: "outgoing" as const,
              href: `/portfolio?view=${relation.targetType}s&selected=${relation.targetId}` as `/${string}`,
              relationType: relation.relationType,
              source: "resource_relations",
              origins:
                relation.targetType === "skill" ? ["context"] : ["direct"],
              targetId: relation.targetId,
              targetTitle: relation.targetTitle,
              targetType: relation.targetType,
            })),
          { historical: Boolean(resource.archivedAt) },
        ),
        linkedContext:
          resourceRelations.length > 0
            ? `${resourceRelations.length} Beziehungen`
            : resource.linkedContext,
        relatedGoals: resourceRelations.filter(
          (relation) => relation.targetType === "goal",
        ),
        relatedProjects: resourceRelations.filter(
          (relation) => relation.targetType === "project",
        ),
        relatedResourceRelations: resourceRelations.filter(
          (relation) => relation.targetType === "resource",
        ),
        relatedSkills: resourceRelations.filter(
          (relation) => relation.targetType === "skill",
        ),
        relatedTasks: resourceRelations.filter(
          (relation) => relation.targetType === "task",
        ),
        relations: resourceRelations,
      };
    }),
  };
}

export async function getResourcesViewModel(): Promise<
  ReturnType<typeof getDemoResourcesViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoResourcesViewModel(profileId);

  if (profileId === "demo") {
    return viewModel;
  }

  const sanitizedViewModel = sanitizeAreaViewModel(
    clone(viewModel),
    profileId,
    "Resources",
  );

  let manualResources: ResourceItem[] = [];
  let writeEnabled = false;
  let relationTargets: ResourceRelationCreateTarget[] = [];

  if (profileId === "manual") {
    const auth = await createAuthenticatedSupabaseServerClient();

    if (auth.ok) {
      writeEnabled = true;
      const manualResourceData = await getManualResourcesFromSupabase(
        auth.client,
        auth.user.id,
      );
      manualResources = manualResourceData.resources;
      relationTargets = manualResourceData.relationTargets;
    }
  }

  const reviewQueue = manualResources
    .filter((resource) => resource.status === "review_needed")
    .map(manualResourceReviewQueueItem);
  const resourceCount = manualResources.length;
  const resourcesViewModel: ResourcesViewModel = {
    ...sanitizedViewModel,
    profileId,
    writeEnabled,
    aiSuggestions: [],
    clusters: [],
    recentLearnings: [],
    relationTargets,
    relations: [],
    resources: manualResources,
    reviewQueue,
    selectedResource: manualResources[0] ?? null,
    summaryStats: sanitizedViewModel.summaryStats.map((stat) => ({
      ...stat,
      detail: `${resourceCount} local resources`,
      value: String(resourceCount),
    })),
    contentStates: buildResourcesContentStates({
      aiSuggestionCount: 0,
      clusterCount: 0,
      recentLearningCount: 0,
      relationCount: 0,
      resourceCount,
      reviewQueueCount: reviewQueue.length,
    }),
  };

  return resourcesViewModel;
}

export async function getShopViewModel(): Promise<
  ReturnType<typeof getDemoShopViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoShopViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  return {
    ...viewModel,
    currency: {
      ...viewModel.currency,
      balance: 0,
      earnedThisWeek: 0,
      spentThisWeek: 0,
    },
    earningSources: [],
    profileId,
    recommendedRewardIds: [],
    rewards: [],
    rules: [
      "Keine Zufallsbelohnungen",
      "Kein echtes Geld",
      "Cooldowns verhindern Uebernutzung",
      "Manuelle Pruefung vor teuren Rewards",
    ],
    transactions: [],
  };
}

export async function getShopWorkspace() {
  if (await getCurrentLifeOsProfileId() !== "manual") return undefined;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  return createSupabaseShopRepository(auth.client).getWorkspace(auth.user.id);
}

export async function getChallengesViewModel(): Promise<
  ReturnType<typeof getDemoChallengesViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoChallengesViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  return {
    ...viewModel,
    challenges: [],
    profileId,
    rules: [
      "Kein Druck",
      "Keine Strafmechanik",
      "Kleine messbare Aktionen",
      "Review vor Wiederholung",
    ],
    templates: [],
  };
}

export async function getChallengesWorkspace() {
  if (await getCurrentLifeOsProfileId() !== "manual") return undefined;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  return createSupabaseChallengeRepository(auth.client).getWorkspace(auth.user.id);
}

export async function getAntiRotWorkspace() {
  if (await getCurrentLifeOsProfileId() !== "manual") return undefined;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return null;
  return createSupabaseAntiRotRepository(auth.client).getWorkspace(auth.user.id);
}
