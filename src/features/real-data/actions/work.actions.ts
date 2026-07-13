"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveWorkLogInputSchema,
  createWorkLogInputSchema,
  createWorkProjectInputSchema,
  updateWorkLogInputSchema,
  updateWorkProjectInputSchema,
} from "../schemas/work.schemas";
import { createSupabaseWorkRepository } from "../supabase/repositories/supabase-work-repository";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) { const raw = formData.get(key); return typeof raw === "string" ? raw.trim() : ""; }
function optionalValue(formData: FormData, key: string) { return value(formData, key) || undefined; }
function workUrl(state: string, selected?: string, log?: string) { const params = new URLSearchParams({ workAction: state }); if (selected) params.set("selected", selected); if (log) params.set("log", log); return `/work?${params.toString()}`; }
async function context() { if ((await getCurrentLifeOsProfileId()) !== "manual") return null; const auth = await createAuthenticatedSupabaseServerClient(); return auth.ok ? auth : null; }
function revalidateWork(projectId?: string) { revalidatePath("/work"); revalidatePath("/portfolio"); revalidatePath("/projects"); if (projectId) revalidatePath(`/projects/${projectId}`); }

export async function createWorkProjectFormAction(formData: FormData) { const auth = await context(); if (!auth) redirect(workUrl("auth_blocked")); const parsed = createWorkProjectInputSchema.safeParse({ title: value(formData, "title"), description: optionalValue(formData, "description"), status: value(formData, "status") }); if (!parsed.success) redirect(workUrl("project_error")); const result = await createSupabaseWorkRepository(auth.client).createProject(auth.user.id, parsed.data); if (!result.ok) redirect(workUrl("project_error")); revalidateWork(result.data.id); redirect(workUrl("project_created", result.data.id)); }
export async function updateWorkProjectFormAction(formData: FormData) { const projectId = value(formData, "projectId"); const auth = await context(); if (!auth) redirect(workUrl("auth_blocked", projectId)); const parsed = updateWorkProjectInputSchema.safeParse({ projectId, title: value(formData, "title"), description: optionalValue(formData, "description"), status: value(formData, "status") }); if (!parsed.success) redirect(workUrl("project_error", projectId)); const result = await createSupabaseWorkRepository(auth.client).updateProject(auth.user.id, projectId, parsed.data); if (!result.ok) redirect(workUrl("project_error", projectId)); revalidateWork(projectId); redirect(workUrl("project_updated", projectId)); }
function logInput(formData: FormData) { return { projectId: value(formData, "projectId"), logDate: value(formData, "logDate"), startedAt: optionalValue(formData, "startedAt"), durationMinutes: value(formData, "durationMinutes"), focus: value(formData, "focus"), outcome: value(formData, "outcome"), notes: optionalValue(formData, "notes") }; }
export async function createWorkLogFormAction(formData: FormData) { const selected = value(formData, "projectId"); const auth = await context(); if (!auth) redirect(workUrl("auth_blocked", selected)); const parsed = createWorkLogInputSchema.safeParse(logInput(formData)); if (!parsed.success) redirect(workUrl("log_error", selected)); const result = await createSupabaseWorkRepository(auth.client).createLog(auth.user.id, parsed.data); if (!result.ok) redirect(workUrl("log_error", selected)); revalidateWork(selected); redirect(workUrl("log_created", selected, result.data.id)); }
export async function updateWorkLogFormAction(formData: FormData) { const selected = value(formData, "projectId"); const logId = value(formData, "logId"); const auth = await context(); if (!auth) redirect(workUrl("auth_blocked", selected)); const parsed = updateWorkLogInputSchema.safeParse({ ...logInput(formData), logId }); if (!parsed.success) redirect(workUrl("log_error", selected, logId)); const result = await createSupabaseWorkRepository(auth.client).updateLog(auth.user.id, logId, parsed.data); if (!result.ok) redirect(workUrl("log_error", selected, logId)); revalidateWork(selected); redirect(workUrl("log_updated", selected, logId)); }
export async function archiveWorkLogFormAction(formData: FormData) { const projectId = value(formData, "projectId"); const auth = await context(); if (!auth) redirect(workUrl("auth_blocked", projectId)); const parsed = archiveWorkLogInputSchema.safeParse({ projectId, logId: value(formData, "logId") }); if (!parsed.success) redirect(workUrl("log_error", projectId)); const result = await createSupabaseWorkRepository(auth.client).archiveLog(auth.user.id, parsed.data.projectId, parsed.data.logId); if (!result.ok) redirect(workUrl("log_error", projectId)); revalidateWork(projectId); redirect(workUrl("log_archived", projectId)); }
