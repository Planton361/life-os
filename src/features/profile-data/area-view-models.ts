import "server-only";

import { getChallengesViewModel as getDemoChallengesViewModel } from "@/features/challenges";
import { getCodingOverviewViewModel as getDemoCodingOverviewViewModel } from "@/features/coding";
import { getAgentHubViewModel as getDemoAgentHubViewModel } from "@/features/coding/agents";
import { getRepositoriesViewModel as getDemoRepositoriesViewModel } from "@/features/coding/repositories";
import { getSkillMapViewModel as getDemoSkillMapViewModel } from "@/features/coding/skill-map";
import {
  getEducationOverviewViewModel as getDemoEducationOverviewViewModel,
  getEducationWorkspaceViewModel as getDemoEducationWorkspaceViewModel,
  getLearningLogViewModel as getDemoLearningLogViewModel,
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
import { getGroceryViewModel as getDemoGroceryViewModel } from "@/features/nutrition/grocery";
import { getMealPlannerViewModel as getDemoMealPlannerViewModel } from "@/features/nutrition/meal-planner";
import { getRecipesViewModel as getDemoRecipesViewModel } from "@/features/nutrition/recipes";
import { summarizeRecipes } from "@/features/nutrition/recipes/recipe-utils";
import {
  buildResourcesContentStates,
  getResourcesViewModel as getDemoResourcesViewModel,
} from "@/features/resources";
import { resolveContentStateMeta } from "@/features/content-state";
import { getShopViewModel as getDemoShopViewModel } from "@/features/shop";
import {
  getWorkLogViewModel as getDemoWorkLogViewModel,
  getWorkOverviewViewModel as getDemoWorkOverviewViewModel,
  getWorkWikiViewModel as getDemoWorkWikiViewModel,
} from "@/features/work";
import { readManualProfile } from "./manual-profile-store";
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

async function getProfileAreaViewModel<T>(
  getDemoViewModel: () => T,
  areaLabel: string,
): Promise<T> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

  return sanitizeAreaViewModel(clone(viewModel), profileId, areaLabel);
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
): ReturnType<typeof getDemoHealthOverviewViewModel> {
  const viewModel = clone(getDemoHealthOverviewViewModel());
  const habitCount = profile.habits.length;
  const moodCount = profile.mood ? 1 : 0;
  const pageItemCount = moodCount + habitCount;
  const firstHabit = profile.habits[0] ?? null;

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
    running: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    schedule: resolveContentStateMeta({ capacity: 10, itemCount: 0 }),
    strength: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
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

  viewModel.running = {
    ...viewModel.running,
    loadStatus: "Noch kein Laufkontext",
    metrics: [
      emptyHealthMetric(
        "Weekly distance",
        "Laufdaten erscheinen nach der ersten lokalen Session.",
        "var(--accent-orange)",
      ),
      emptyHealthMetric(
        "Avg pace",
        "Pace bleibt leer, bis echte Laufdaten existieren.",
        "var(--accent-cyan)",
      ),
      emptyHealthMetric(
        "Run history",
        "Noch kein letzter Lauf",
        "var(--accent-green)",
      ),
    ],
    nextRun: {
      ...viewModel.running.nextRun,
      detail:
        "Sobald Laufdaten oder ein lokaler Plan existieren, erscheint hier ein Vorschlag.",
      title: "Noch kein Laufkontext",
    },
    trends: [],
  };

  viewModel.habits = {
    ...viewModel.habits,
    badge: habitCount > 0 ? `${habitCount} Routinen` : "0 Routinen",
    heatmap: {
      ...viewModel.habits.heatmap,
      rows: [],
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
      emptyHealthMetric(
        "Habit logs",
        "Noch keine Habit-Logs",
        "var(--accent-green)",
      ),
      emptyHealthMetric(
        "Next repair",
        "Repair Loops erscheinen nach lokalen Signalen.",
        "var(--accent-purple)",
      ),
    ],
    nextFocus: {
      ...viewModel.habits.nextFocus,
      title: firstHabit
        ? `${firstHabit.label} · noch keine Logs`
        : "Noch keine Habit-Signale",
    },
  };

  viewModel.strength = {
    ...viewModel.strength,
    badge: "0 Sessions",
    metrics: [
      emptyHealthMetric(
        "Sessions",
        "Noch keine Kraftsessions",
        "var(--accent-red)",
      ),
      emptyHealthMetric(
        "Recovery",
        "Recovery bleibt leer ohne lokale Session.",
        "var(--accent-green)",
      ),
      emptyHealthMetric(
        "Session history",
        "Noch keine letzte Session",
        "var(--accent-orange)",
      ),
    ],
    nextSession: {
      ...viewModel.strength.nextSession,
      detail:
        "Sobald eine lokale Kraftsession existiert, erscheint hier Kontext.",
      title: "Noch kein Krafttrainingskontext",
    },
    sessionBalance: {
      ...viewModel.strength.sessionBalance,
      items: [],
    },
    trainingPattern: {
      ...viewModel.strength.trainingPattern,
      days: [],
      note: "Krafteinheiten erscheinen nach der ersten lokalen Session.",
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

function emptyNutritionDay(): NutritionDay {
  return {
    calorie_actual: 0,
    calorie_target: 0,
    carbs_actual: 0,
    carbs_target: 0,
    date: "2026-06-24",
    fat_actual: 0,
    fat_target: 0,
    protein_actual: 0,
    protein_target: 0,
    water_actual: 0,
    water_target: 0,
  };
}

function parseMacroValue(macros: readonly string[], prefix: "P" | "C" | "F") {
  const raw = macros.find((macro) => macro.trim().startsWith(prefix));
  const value = Number(raw?.replace(/[^0-9.]/g, "") ?? 0);

  return Number.isFinite(value) ? value : 0;
}

function parseKcal(value?: string) {
  const parsed = Number(value?.replace(/[^0-9.]/g, "") ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function manualMealTypeToNutritionType(
  type: ManualProfileData["meals"][number]["type"],
) {
  return type.toLowerCase() as MealEntry["meal_type"];
}

function manualMealToNutritionEntry(
  meal: ManualProfileData["meals"][number],
): MealEntry {
  const plannedAt = `2026-06-24T${meal.time || "12:00"}:00.000Z`;
  const isLogged = meal.state === "logged";

  return {
    calories: parseKcal(meal.kcal),
    consumed_at: isLogged ? meal.updatedAt : undefined,
    id: meal.id,
    macros: {
      carbs: parseMacroValue(meal.macros, "C"),
      fat: parseMacroValue(meal.macros, "F"),
      protein: parseMacroValue(meal.macros, "P"),
    },
    meal_type: manualMealTypeToNutritionType(meal.type),
    planned_at: isLogged ? undefined : plannedAt,
    source: "manual",
    title: meal.name,
  };
}

function buildProfileNutritionOverviewViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
  profile: ManualProfileData,
): ReturnType<typeof getDemoNutritionOverviewViewModel> {
  const viewModel = clone(getDemoNutritionOverviewViewModel());
  const meals =
    profileId === "manual"
      ? profile.meals
          .filter((meal) => meal.state === "planned" || meal.state === "logged")
          .map(manualMealToNutritionEntry)
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
    emptyNutritionDay(),
  );
  const primaryItemCount = loggedMeals.length + plannedMeals.length;

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.header = {
    ...viewModel.header,
    dateLabel: "Heute",
    summary:
      primaryItemCount > 0
        ? "Heute · lokale Mahlzeiten ohne Zielprofil"
        : "Heute · Nutrition-Shell ohne Demo-Daten",
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
        ? "Lokale Mahlzeiten werden angezeigt; ein Wochenplan ist noch nicht gesetzt."
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

function buildProfileMealPlannerViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
): ReturnType<typeof getDemoMealPlannerViewModel> {
  const viewModel = clone(getDemoMealPlannerViewModel());

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.header = {
    ...viewModel.header,
    weekLabel: "Aktuelle Woche",
  };
  viewModel.profiles = [];
  viewModel.defaultProfileId = "";
  viewModel.recipes = [];
  viewModel.week = buildEmptyMealPlanWeek(viewModel.week);
  viewModel.contentStates = {
    inspector: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 21, itemCount: 0 }),
    recipeSuggestions: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    targetProfile: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    weekPlan: resolveContentStateMeta({ capacity: 21, itemCount: 0 }),
  };

  return viewModel;
}

function buildProfileRecipesViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
): ReturnType<typeof getDemoRecipesViewModel> {
  const viewModel = clone(getDemoRecipesViewModel());

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
  viewModel.recipes = [];
  viewModel.stats = summarizeRecipes([]);
  viewModel.contentStates = {
    browser: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    selectedRecipe: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    summary: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
  };

  return viewModel;
}

function buildProfileGroceryViewModel(
  profileId: Exclude<LifeOsProfileId, "demo">,
): ReturnType<typeof getDemoGroceryViewModel> {
  const viewModel = clone(getDemoGroceryViewModel());

  viewModel.profileId = profileId;
  viewModel.actionsEnabled = false;
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
    page: resolveContentStateMeta({ capacity: 12, itemCount: 0 }),
    pantry: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
    receipts: resolveContentStateMeta({ capacity: 4, itemCount: 0 }),
    summary: resolveContentStateMeta({ capacity: 5, itemCount: 0 }),
    toBuy: resolveContentStateMeta({ capacity: 8, itemCount: 0 }),
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

export async function getHealthOverviewViewModel(): Promise<
  ReturnType<typeof getDemoHealthOverviewViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoHealthOverviewViewModel();
  }

  return buildProfileHealthOverviewViewModel(profileId, await readManualProfile());
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
    await readManualProfile(),
  );
}

export async function getMealPlannerViewModel(): Promise<
  ReturnType<typeof getDemoMealPlannerViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoMealPlannerViewModel();
  }

  return buildProfileMealPlannerViewModel(profileId);
}

export async function getRecipesViewModel(): Promise<
  ReturnType<typeof getDemoRecipesViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoRecipesViewModel();
  }

  return buildProfileRecipesViewModel(profileId);
}

export async function getGroceryViewModel(): Promise<
  ReturnType<typeof getDemoGroceryViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId === "demo") {
    return getDemoGroceryViewModel();
  }

  return buildProfileGroceryViewModel(profileId);
}

export async function getCodingOverviewViewModel(): Promise<
  ReturnType<typeof getDemoCodingOverviewViewModel>
> {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = getDemoCodingOverviewViewModel();

  if (profileId === "demo") {
    return viewModel;
  }

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
  return getProfileAreaViewModel(getDemoLifeOverviewViewModel, "Life");
}

export async function getJournalPageViewModel(): Promise<
  ReturnType<typeof getDemoJournalPageViewModel>
> {
  return getProfileAreaViewModel(getDemoJournalPageViewModel, "Life");
}

export async function getNotesPageViewModel(): Promise<
  ReturnType<typeof getDemoNotesPageViewModel>
> {
  return getProfileAreaViewModel(getDemoNotesPageViewModel, "Life");
}

export async function getEntertainmentPageViewModel(): Promise<
  ReturnType<typeof getDemoEntertainmentPageViewModel>
> {
  return getProfileAreaViewModel(getDemoEntertainmentPageViewModel, "Life");
}

export async function getInventoryPageViewModel(): Promise<
  ReturnType<typeof getDemoInventoryPageViewModel>
> {
  return getProfileAreaViewModel(getDemoInventoryPageViewModel, "Life");
}

export async function getEducationOverviewViewModel(): Promise<
  ReturnType<typeof getDemoEducationOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoEducationOverviewViewModel, "Education");
}

export async function getEducationWorkspaceViewModel(): Promise<
  ReturnType<typeof getDemoEducationWorkspaceViewModel>
> {
  return getProfileAreaViewModel(
    getDemoEducationWorkspaceViewModel,
    "Education",
  );
}

export async function getLearningLogViewModel(): Promise<
  ReturnType<typeof getDemoLearningLogViewModel>
> {
  return getProfileAreaViewModel(getDemoLearningLogViewModel, "Education");
}

export async function getWorkOverviewViewModel(): Promise<
  ReturnType<typeof getDemoWorkOverviewViewModel>
> {
  return getProfileAreaViewModel(getDemoWorkOverviewViewModel, "Work");
}

export async function getWorkLogViewModel(): Promise<
  ReturnType<typeof getDemoWorkLogViewModel>
> {
  return getProfileAreaViewModel(getDemoWorkLogViewModel, "Work");
}

export async function getWorkWikiViewModel(): Promise<
  ReturnType<typeof getDemoWorkWikiViewModel>
> {
  return getProfileAreaViewModel(getDemoWorkWikiViewModel, "Work");
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

  return {
    ...sanitizedViewModel,
    profileId,
    selectedResource: null,
    summaryStats: sanitizedViewModel.summaryStats.map((stat) => ({
      ...stat,
      detail: "0 local resources",
      value: "0",
    })),
    contentStates: buildResourcesContentStates({
      aiSuggestionCount: sanitizedViewModel.aiSuggestions.length,
      clusterCount: sanitizedViewModel.clusters.length,
      recentLearningCount: sanitizedViewModel.recentLearnings.length,
      relationCount: sanitizedViewModel.relations.length,
      resourceCount: sanitizedViewModel.resources.length,
      reviewQueueCount: sanitizedViewModel.reviewQueue.length,
    }),
  };
}

export async function getShopViewModel(): Promise<
  ReturnType<typeof getDemoShopViewModel>
> {
  return getProfileAreaViewModel(getDemoShopViewModel, "Shop");
}

export async function getChallengesViewModel(): Promise<
  ReturnType<typeof getDemoChallengesViewModel>
> {
  return getProfileAreaViewModel(getDemoChallengesViewModel, "Challenges");
}
