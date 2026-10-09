"use server";

import { withSubmittedDatasetEpoch } from "./submitted-dataset";

import { revalidatePath } from "next/cache";
import { getCodingRepository } from "@/features/real-data/runtime/facade";
import { redirect } from "next/navigation";
import {
  archiveCodingSessionInputSchema,
  createCodingProjectInputSchema,
  createCodingSessionInputSchema,
  updateCodingProjectInputSchema,
  updateCodingSessionInputSchema,
} from "../schemas/coding.schemas";

import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  return value(formData, key) || undefined;
}

function codingUrl(state: string, selected?: string) {
  const params = new URLSearchParams({ codingAction: state });
  if (selected) params.set("selected", selected);
  return `/coding?${params.toString()}`;
}

async function context() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return null;
  const auth = await createAuthenticatedApplicationContext("write");
  return auth.ok ? auth : null;
}

function revalidateCoding(projectId?: string) {
  revalidatePath("/coding");
  revalidatePath("/portfolio");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/goals");
  revalidatePath("/goals/[goalId]", "page");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createCodingProjectFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context();
    if (!auth) redirect(codingUrl("auth_blocked"));
    const parsed = createCodingProjectInputSchema.safeParse({ description: optionalValue(formData, "description"), repositoryUrl: optionalValue(formData, "repositoryUrl"), status: value(formData, "status"), title: value(formData, "title") });
    if (!parsed.success) redirect(codingUrl("project_error"));
    const result = await getCodingRepository(auth.data).createProject(auth.user.id, parsed.data);
    if (!result.ok) redirect(codingUrl("project_error"));
    revalidateCoding(result.data.id);
    redirect(codingUrl("project_created", result.data.id));
  });
}

export async function updateCodingProjectFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const projectId = value(formData, "projectId");
    const auth = await context();
    if (!auth) redirect(codingUrl("auth_blocked", projectId));
    const parsed = updateCodingProjectInputSchema.safeParse({ description: optionalValue(formData, "description"), projectId, repositoryUrl: optionalValue(formData, "repositoryUrl"), status: value(formData, "status"), title: value(formData, "title") });
    if (!parsed.success) redirect(codingUrl("project_error", projectId));
    const result = await getCodingRepository(auth.data).updateProject(auth.user.id, projectId, parsed.data);
    if (!result.ok) redirect(codingUrl("project_error", projectId));
    revalidateCoding(projectId);
    redirect(codingUrl("project_updated", projectId));
  });
}

function sessionInput(formData: FormData) {
  return { activity: value(formData, "activity"), durationMinutes: value(formData, "durationMinutes"), note: optionalValue(formData, "note"), outcome: value(formData, "outcome"), projectId: value(formData, "projectId"), sessionDate: value(formData, "sessionDate"), startTime: optionalValue(formData, "startTime") };
}

export async function createCodingSessionFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const selected = value(formData, "projectId");
    const auth = await context();
    if (!auth) redirect(codingUrl("auth_blocked", selected));
    const parsed = createCodingSessionInputSchema.safeParse(sessionInput(formData));
    if (!parsed.success) redirect(codingUrl("session_error", selected));
    const result = await getCodingRepository(auth.data).createSession(auth.user.id, parsed.data);
    if (!result.ok) redirect(codingUrl("session_error", selected));
    revalidateCoding(selected);
    redirect(codingUrl("session_created", selected));
  });
}

export async function updateCodingSessionFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const selected = value(formData, "projectId");
    const sessionId = value(formData, "sessionId");
    const auth = await context();
    if (!auth) redirect(codingUrl("auth_blocked", selected));
    const parsed = updateCodingSessionInputSchema.safeParse({ ...sessionInput(formData), sessionId });
    if (!parsed.success) redirect(codingUrl("session_error", selected));
    const result = await getCodingRepository(auth.data).updateSession(auth.user.id, sessionId, parsed.data);
    if (!result.ok) redirect(codingUrl("session_error", selected));
    revalidateCoding(selected);
    redirect(codingUrl("session_updated", selected));
  });
}

export async function archiveCodingSessionFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const selected = value(formData, "projectId");
    const parsed = archiveCodingSessionInputSchema.safeParse({ sessionId: value(formData, "sessionId") });
    const auth = await context();
    if (!auth) redirect(codingUrl("auth_blocked", selected));
    if (!parsed.success) redirect(codingUrl("session_error", selected));
    const result = await getCodingRepository(auth.data).archiveSession(auth.user.id, parsed.data.sessionId);
    if (!result.ok) redirect(codingUrl("session_error", selected));
    revalidateCoding(selected);
    redirect(codingUrl("session_archived", selected));
  });
}
