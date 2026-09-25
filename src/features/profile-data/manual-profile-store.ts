import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CreateGoalInput,
  CreateHabitInput,
  CreateInboxItemInput,
  CreateProjectInput,
  SaveMealSlotInput,
  SetMoodInput,
  CreateTaskInput,
  ManualHabit,
  ManualInboxItem,
  ManualMealSlot,
  ManualMood,
  ManualProfileData,
} from "./types";
import type {
  EntityArea,
  EntityPriority,
  GoalHorizon,
  GoalStatus,
  LifeGoal,
  LifeProject,
  LifeTask,
  ProjectStatus,
  TaskStatus,
} from "@/features/entities/types";
import type {
  DashboardMealSlotState,
  HabitTrackerWindow,
  MealType,
} from "@/features/dashboard";
import type { InboxCaptureType } from "@/features/inbox";
import { isSqliteProofRuntime } from "../../../experiments/issue-37/proof-gate";

const manualProfilePath = path.join(
  process.cwd(),
  ".local",
  "life-os",
  "manual-profile.json",
);

const defaultManualProfile: ManualProfileData = {
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

const entityAreas: readonly EntityArea[] = [
  "coding",
  "education",
  "work",
  "health",
  "nutrition",
  "review",
  "system",
  "personal",
];

const priorities: readonly EntityPriority[] = ["P0", "P1", "P2", "P3", "none"];
const taskStatuses: readonly TaskStatus[] = [
  "inbox",
  "planned",
  "active",
  "waiting",
  "done",
  "canceled",
  "someday",
];
const projectStatuses: readonly ProjectStatus[] = [
  "idea",
  "active",
  "paused",
  "blocked",
  "completed",
  "archived",
];
const goalStatuses: readonly GoalStatus[] = [
  "draft",
  "active",
  "paused",
  "achieved",
  "archived",
];
const goalHorizons: readonly GoalHorizon[] = [
  "week",
  "month",
  "quarter",
  "year",
  "someday",
];
const inboxTypes: readonly InboxCaptureType[] = [
  "task",
  "note",
  "question",
  "idea",
  "resource",
  "agent",
  "decision",
];
const habitWindows: readonly HabitTrackerWindow[] = [
  "Morning",
  "Midday",
  "Evening",
];
const mealTypes: readonly Exclude<MealType, "Snack">[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
];
const mealStates: readonly DashboardMealSlotState[] = [
  "unplanned",
  "planned",
  "logged",
  "skipped",
];

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return nowIso().slice(0, 10);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
}

function createId(prefix: string, title: string) {
  return `${prefix}-${slugify(title) || "item"}-${Date.now().toString(36)}`;
}

function readString(formValue: unknown, fallback = "") {
  return typeof formValue === "string" ? formValue.trim() : fallback;
}

function readArea(value: unknown, fallback: EntityArea = "review") {
  const candidate = readString(value);

  return entityAreas.includes(candidate as EntityArea)
    ? (candidate as EntityArea)
    : fallback;
}

function readPriority(value: unknown, fallback: EntityPriority = "P2") {
  const candidate = readString(value);

  return priorities.includes(candidate as EntityPriority)
    ? (candidate as EntityPriority)
    : fallback;
}

function readTaskStatus(value: unknown, fallback: TaskStatus = "planned") {
  const candidate = readString(value);

  return taskStatuses.includes(candidate as TaskStatus)
    ? (candidate as TaskStatus)
    : fallback;
}

function readProjectStatus(value: unknown, fallback: ProjectStatus = "active") {
  const candidate = readString(value);

  return projectStatuses.includes(candidate as ProjectStatus)
    ? (candidate as ProjectStatus)
    : fallback;
}

function readGoalStatus(value: unknown, fallback: GoalStatus = "active") {
  const candidate = readString(value);

  return goalStatuses.includes(candidate as GoalStatus)
    ? (candidate as GoalStatus)
    : fallback;
}

function readGoalHorizon(value: unknown, fallback: GoalHorizon = "quarter") {
  const candidate = readString(value);

  return goalHorizons.includes(candidate as GoalHorizon)
    ? (candidate as GoalHorizon)
    : fallback;
}

function readInboxType(value: unknown, fallback: InboxCaptureType = "note") {
  const candidate = readString(value);

  return inboxTypes.includes(candidate as InboxCaptureType)
    ? (candidate as InboxCaptureType)
    : fallback;
}

function readHabitWindow(
  value: unknown,
  fallback: HabitTrackerWindow = "Morning",
) {
  const candidate = readString(value);

  return habitWindows.includes(candidate as HabitTrackerWindow)
    ? (candidate as HabitTrackerWindow)
    : fallback;
}

function readMealType(
  value: unknown,
  fallback: Exclude<MealType, "Snack"> = "Breakfast",
) {
  const candidate = readString(value);

  return mealTypes.includes(candidate as Exclude<MealType, "Snack">)
    ? (candidate as Exclude<MealType, "Snack">)
    : fallback;
}

function readMealState(
  value: unknown,
  fallback: DashboardMealSlotState = "planned",
) {
  const candidate = readString(value);

  return mealStates.includes(candidate as DashboardMealSlotState)
    ? (candidate as DashboardMealSlotState)
    : fallback;
}

function readDuration(value: unknown) {
  const candidate = Number(readString(value, "30"));

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return 30;
  }

  return Math.min(480, Math.round(candidate));
}

function readPositiveNumber(value: unknown, fallback: number) {
  const candidate = Number(readString(value, String(fallback)));

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return fallback;
  }

  return candidate;
}

function readMacros(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeProfile(
  value: Partial<ManualProfileData>,
): ManualProfileData {
  return {
    version: 1,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    projects: Array.isArray(value.projects) ? value.projects : [],
    goals: Array.isArray(value.goals) ? value.goals : [],
    inboxItems: Array.isArray(value.inboxItems) ? value.inboxItems : [],
    habits: Array.isArray(value.habits) ? value.habits : [],
    mood:
      value.mood &&
      typeof value.mood === "object" &&
      "label" in value.mood &&
      typeof value.mood.label === "string"
        ? (value.mood as ManualMood)
        : null,
    meals: Array.isArray(value.meals) ? value.meals : [],
  };
}

async function ensureManualProfileDir() {
  await mkdir(path.dirname(manualProfilePath), { recursive: true });
}

export async function readManualProfile(): Promise<ManualProfileData> {
  if (isSqliteProofRuntime()) return { ...defaultManualProfile };
  try {
    const content = await readFile(manualProfilePath, "utf8");
    const parsed = JSON.parse(content) as Partial<ManualProfileData>;

    return normalizeProfile(parsed);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { ...defaultManualProfile };
    }

    return { ...defaultManualProfile };
  }
}

export async function writeManualProfile(profile: ManualProfileData) {
  if (isSqliteProofRuntime()) throw new Error("Manual profile file disabled in SQLite proof");
  await ensureManualProfileDir();
  await writeFile(
    manualProfilePath,
    `${JSON.stringify({ ...profile, updatedAt: nowIso() }, null, 2)}\n`,
    "utf8",
  );
}

export async function resetManualProfile() {
  if (isSqliteProofRuntime()) throw new Error("Manual profile reset disabled in SQLite proof");
  await rm(manualProfilePath, { force: true });
}

export async function createManualTask(input: CreateTaskInput) {
  const profile = await readManualProfile();
  const title = readString(input.title, "Manual task");
  const task: LifeTask = {
    id: createId("task", title),
    title,
    description:
      readString(input.description) ||
      "Manual local task. Stored in the local profile JSON file.",
    status: readTaskStatus(input.status),
    priority: readPriority(input.priority),
    date: readString(input.date) || todayIsoDate(),
    startTime: readString(input.startTime) || undefined,
    durationMinutes: readDuration(input.durationMinutes),
    energy: "medium",
    areaId: readArea(input.areaId),
    projectId: readString(input.projectId) || undefined,
    goalId: readString(input.goalId) || undefined,
    type: "task",
    nextStep:
      readString(input.nextStep) || "Clarify and execute the next step.",
    reviewNeeded: false,
    source: "Manual Local Profile",
    timeline: [
      {
        label: "created",
        detail: "Created in the manual local profile.",
        dateLabel: todayIsoDate(),
      },
    ],
    evidence: [],
  };

  await writeManualProfile({
    ...profile,
    tasks: [task, ...profile.tasks],
  });

  return task;
}

export async function createManualInboxItem(input: CreateInboxItemInput) {
  const profile = await readManualProfile();
  const title = readString(input.title, "Manual inbox item");
  const inboxItem: ManualInboxItem = {
    id: createId("inbox", title),
    title,
    stage: "raw",
    type: readInboxType(input.type),
    next: "Clarify outcome and decide where it belongs.",
    age: "Local",
    note: readString(input.note) || "Manual local capture.",
    areaId: readArea(input.areaId),
    createdAt: nowIso(),
  };

  await writeManualProfile({
    ...profile,
    inboxItems: [inboxItem, ...profile.inboxItems],
  });

  return inboxItem;
}

export async function createManualProject(input: CreateProjectInput) {
  const profile = await readManualProfile();
  const title = readString(input.title, "Manual project");
  const project: LifeProject = {
    id: createId("project", title),
    title,
    description:
      readString(input.description) ||
      "Manual local project. Stored only in the local profile file.",
    status: readProjectStatus(input.status),
    areaId: readArea(input.areaId, "coding"),
    nextStep: readString(input.nextStep) || "Define the next concrete task.",
    progress: 0,
    deadline: readString(input.deadline) || undefined,
    focusThisWeek: true,
    priority: readPriority(input.priority, "P1"),
    phase: "Manual",
    taskIds: [],
    milestoneIds: [],
    notes: [],
    activity: [
      {
        label: "created",
        detail: "Created in the manual local profile.",
        dateLabel: todayIsoDate(),
      },
    ],
  };

  await writeManualProfile({
    ...profile,
    projects: [project, ...profile.projects],
  });

  return project;
}

export async function createManualGoal(input: CreateGoalInput) {
  const profile = await readManualProfile();
  const title = readString(input.title, "Manual goal");
  const goal: LifeGoal = {
    id: createId("goal", title),
    title,
    description:
      readString(input.description) ||
      "Manual local goal. Stored only in the local profile file.",
    status: readGoalStatus(input.status),
    horizon: readGoalHorizon(input.horizon),
    why: readString(input.why) || "Keep the direction visible.",
    measure: readString(input.measure) || "Manual progress signal",
    currentValue: "0",
    targetValue: readString(input.targetValue) || "Defined target",
    remaining: "Not reviewed yet",
    progress: 0,
    nextStep:
      readString(input.nextStep) || "Define one linked project or task.",
    areaId: readArea(input.areaId, "personal"),
    linkedProjectIds: [],
    linkedTaskIds: [],
    milestoneIds: [],
    reviewNotes: [],
  };

  await writeManualProfile({
    ...profile,
    goals: [goal, ...profile.goals],
  });

  return goal;
}

export async function createManualHabit(input: CreateHabitInput) {
  const profile = await readManualProfile();
  const label = readString(input.label, "Manual habit");
  const targetValue = readPositiveNumber(input.targetValue, 1);
  const habit: ManualHabit = {
    id: createId("habit", label),
    marker: (label.charAt(0) || "H").toUpperCase(),
    label,
    window: readHabitWindow(input.window),
    currentValue: 0,
    targetValue,
    unit: readString(input.unit) || undefined,
    stepValue: targetValue <= 10 ? 1 : Math.max(1, Math.round(targetValue / 5)),
    total: 5,
    areaId: readArea(input.areaId, "health"),
    createdAt: nowIso(),
  };

  await writeManualProfile({
    ...profile,
    habits: [habit, ...profile.habits],
  });

  return habit;
}

export async function setManualMood(input: SetMoodInput) {
  const profile = await readManualProfile();
  const mood: ManualMood = {
    label: readString(input.label, "Calm"),
    updatedAt: nowIso(),
  };

  await writeManualProfile({
    ...profile,
    mood,
  });

  return mood;
}

export async function saveManualMealSlot(input: SaveMealSlotInput) {
  const profile = await readManualProfile();
  const type = readMealType(input.type);
  const existing = profile.meals.find((meal) => meal.type === type);
  const meal: ManualMealSlot = {
    id: existing?.id ?? `meal-${type.toLowerCase()}`,
    type,
    state: readMealState(input.state),
    name: readString(input.name) || existing?.name || "Keine Mahlzeit",
    time: readString(input.time) || existing?.time || "",
    kcal: readString(input.kcal) || existing?.kcal,
    macros: input.macros ? readMacros(input.macros) : (existing?.macros ?? []),
    updatedAt: nowIso(),
  };

  await writeManualProfile({
    ...profile,
    meals: [meal, ...profile.meals.filter((item) => item.type !== type)],
  });

  return meal;
}
