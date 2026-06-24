"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createManualHabit,
  createManualGoal,
  createManualInboxItem,
  createManualProject,
  createManualTask,
  resetManualProfile,
  saveManualMealSlot,
  setManualMood,
} from "./manual-profile-store";
import {
  LIFE_OS_PROFILE_COOKIE,
  getCurrentLifeOsProfileId,
  parseLifeOsProfileId,
} from "./profile-cookie";
import type {
  DashboardMealSlotState,
  HabitTrackerWindow,
  QuickCaptureKind,
} from "@/features/dashboard";
import type {
  EntityArea,
  EntityPriority,
  GoalHorizon,
  GoalStatus,
  ProjectStatus,
  TaskStatus,
} from "@/features/entities/types";
import type { InboxCaptureType } from "@/features/inbox";
import type { DashboardActionState } from "./dashboard-action-state";

const profilePaths = [
  "/dashboard",
  "/tasks",
  "/today",
  "/calendar",
  "/inbox",
  "/projects",
  "/goals",
  "/portfolio",
  "/settings",
] as const;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(formData: FormData, key: string) {
  const value = Number(formString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function setProfileCookie(profileId: string) {
  const cookieStore = await cookies();

  cookieStore.set(LIFE_OS_PROFILE_COOKIE, parseLifeOsProfileId(profileId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

function revalidateProfileViews() {
  revalidatePath("/", "layout");
  profilePaths.forEach((path) => revalidatePath(path));
}

function revalidateDashboardViews() {
  revalidateProfileViews();
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/health/habits");
  revalidatePath("/health/mental");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/meal-planner");
}

function redirectToSettings(): never {
  redirect("/settings");
}

export async function selectLifeOsProfileAction(formData: FormData) {
  await setProfileCookie(formString(formData, "profileId"));
  revalidateProfileViews();
  redirectToSettings();
}

export async function createManualTaskAction(formData: FormData) {
  await setProfileCookie("manual");
  await createManualTask({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    date: formString(formData, "date"),
    startTime: formString(formData, "startTime"),
    durationMinutes: optionalNumber(formData, "durationMinutes"),
    areaId: formString(formData, "areaId") as EntityArea,
    priority: formString(formData, "priority") as EntityPriority,
    status: formString(formData, "status") as TaskStatus,
    nextStep: formString(formData, "nextStep"),
  });
  revalidateProfileViews();
  redirectToSettings();
}

export async function createManualInboxItemAction(formData: FormData) {
  await setProfileCookie("manual");
  await createManualInboxItem({
    title: formString(formData, "title"),
    note: formString(formData, "note"),
    type: formString(formData, "type") as InboxCaptureType,
    areaId: formString(formData, "areaId") as EntityArea,
  });
  revalidateProfileViews();
  redirectToSettings();
}

export async function createInboxQuickCaptureAction(formData: FormData) {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    revalidatePath("/inbox");
    redirect("/inbox");
  }

  const title = formString(formData, "title");
  const note = formString(formData, "note");
  const fallbackTitle = note.split(/\s+/).slice(0, 9).join(" ");

  if (!title && !fallbackTitle) {
    revalidatePath("/inbox");
    redirect("/inbox");
  }

  await createManualInboxItem({
    areaId: "review",
    note,
    title: title || fallbackTitle,
    type: formString(formData, "type") as InboxCaptureType,
  });
  revalidateDashboardViews();
  redirect("/inbox");
}

export async function createManualProjectAction(formData: FormData) {
  await setProfileCookie("manual");
  await createManualProject({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    areaId: formString(formData, "areaId") as EntityArea,
    status: formString(formData, "status") as ProjectStatus,
    priority: formString(formData, "priority") as EntityPriority,
    nextStep: formString(formData, "nextStep"),
    deadline: formString(formData, "deadline"),
  });
  revalidateProfileViews();
  redirectToSettings();
}

export async function createManualGoalAction(formData: FormData) {
  await setProfileCookie("manual");
  await createManualGoal({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    areaId: formString(formData, "areaId") as EntityArea,
    status: formString(formData, "status") as GoalStatus,
    horizon: formString(formData, "horizon") as GoalHorizon,
    why: formString(formData, "why"),
    measure: formString(formData, "measure"),
    targetValue: formString(formData, "targetValue"),
    nextStep: formString(formData, "nextStep"),
  });
  revalidateProfileViews();
  redirectToSettings();
}

export async function resetManualProfileAction() {
  await setProfileCookie("manual");
  await resetManualProfile();
  revalidateProfileViews();
  redirectToSettings();
}

function mapQuickCaptureKind(kind: string): InboxCaptureType {
  const normalized = kind as QuickCaptureKind;

  if (normalized === "Task") return "task";
  if (normalized === "Question") return "question";
  if (normalized === "Agent") return "agent";
  if (normalized === "Loop") return "idea";

  return "note";
}

function minutesFromTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  const total = Number(hours) * 60 + Number(minutes);

  return Number.isFinite(total) ? total : null;
}

function durationFromTimes(startTime: string, endTime: string) {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);

  if (start === null || end === null || end <= start) {
    return 30;
  }

  return Math.min(480, end - start);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function assertManualDashboardAction(): Promise<DashboardActionState | null> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      message: "Wechsle ins Manual-Profil, um lokale Dashboard-Daten zu speichern.",
      status: "blocked",
    };
  }

  return null;
}

export async function captureDashboardQuickThoughtAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const blocked = await assertManualDashboardAction();

  if (blocked) return blocked;

  const content = formString(formData, "content");
  const kind = formString(formData, "kind");

  if (!content) {
    return {
      message: "Erfasse zuerst einen Gedanken.",
      status: "error",
    };
  }

  await createManualInboxItem({
    areaId: "review",
    note: content,
    title: content.split(/\s+/).slice(0, 9).join(" "),
    type: mapQuickCaptureKind(kind),
  });
  revalidateDashboardViews();

  return {
    message: "Gespeichert. Der Eintrag liegt in der Inbox.",
    status: "success",
  };
}

export async function createDashboardTaskAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const blocked = await assertManualDashboardAction();

  if (blocked) return blocked;

  const title = formString(formData, "title");
  const startTime = formString(formData, "startTime");
  const endTime = formString(formData, "endTime");

  if (!title) {
    return {
      message: "Gib der Aufgabe einen Titel.",
      status: "error",
    };
  }

  await createManualTask({
    areaId: formString(formData, "area") as EntityArea,
    date: formString(formData, "date") || todayIsoDate(),
    description: formString(formData, "description"),
    durationMinutes: durationFromTimes(startTime, endTime),
    nextStep: formString(formData, "nextStep") || "Open task detail.",
    priority: formString(formData, "priority") as EntityPriority,
    startTime,
    status: "planned",
    title,
  });
  revalidateDashboardViews();

  return {
    message: "Aufgabe gespeichert und in Agenda/Today/Calendar projiziert.",
    status: "success",
  };
}

export async function createDashboardHabitAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const blocked = await assertManualDashboardAction();

  if (blocked) return blocked;

  const label = formString(formData, "name");

  if (!label) {
    return {
      message: "Gib dem Habit einen Namen.",
      status: "error",
    };
  }

  await createManualHabit({
    areaId: "health",
    label,
    targetValue: optionalNumber(formData, "target"),
    unit: formString(formData, "unit"),
    window: formString(formData, "window") as HabitTrackerWindow,
  });
  revalidateDashboardViews();

  return {
    message: "Habit gespeichert.",
    status: "success",
  };
}

export async function setDashboardMoodAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const blocked = await assertManualDashboardAction();

  if (blocked) return blocked;

  const label = formString(formData, "mood");

  await setManualMood({ label });
  revalidateDashboardViews();

  return {
    message: "Mood gespeichert.",
    status: "success",
  };
}

export async function saveDashboardMealSlotAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const blocked = await assertManualDashboardAction();

  if (blocked) return blocked;

  await saveManualMealSlot({
    kcal: formString(formData, "kcal"),
    macros: [
      formString(formData, "protein"),
      formString(formData, "carbs"),
      formString(formData, "fat"),
    ].filter(Boolean),
    name: formString(formData, "name"),
    state: formString(formData, "state") as DashboardMealSlotState,
    time: formString(formData, "time"),
    type: formString(formData, "meal") as "Breakfast" | "Lunch" | "Dinner",
  });
  revalidateDashboardViews();

  return {
    message: "Mahlzeit gespeichert.",
    status: "success",
  };
}
