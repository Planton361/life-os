"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createManualGoal,
  createManualInboxItem,
  createManualProject,
  createManualTask,
  resetManualProfile,
} from "./manual-profile-store";
import { LIFE_OS_PROFILE_COOKIE, parseLifeOsProfileId } from "./profile-cookie";
import type {
  EntityArea,
  EntityPriority,
  GoalHorizon,
  GoalStatus,
  ProjectStatus,
  TaskStatus,
} from "@/features/entities/types";
import type { InboxCaptureType } from "@/features/inbox";

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
