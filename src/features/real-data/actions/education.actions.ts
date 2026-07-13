"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectInputSchema,
  createResourceInputSchema,
  linkResourceToTargetInputSchema,
  unlinkResourceFromTargetInputSchema,
  updateProjectInputSchema,
  updateResourceInputSchema,
} from "../schemas";
import { archiveEducationLogInputSchema, createEducationLogInputSchema, updateEducationLogInputSchema } from "../schemas/education-log.schemas";
import {
  createSupabaseEducationRepository,
  createSupabaseResourceRepository,
} from "../supabase/repositories";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function field(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value.trim() : ""; }
function optionalField(formData: FormData, key: string) { return field(formData, key) || undefined; }
function destination(state: string, projectId?: string, resourceId?: string) { const params = new URLSearchParams({ educationAction: state }); if (projectId) params.set("selected", projectId); if (resourceId) params.set("resource", resourceId); return `/education?${params}`; }
async function context() { if ((await getCurrentLifeOsProfileId()) !== "manual") return null; const auth = await createAuthenticatedSupabaseServerClient(); return auth.ok ? auth : null; }
function revalidateEducation() { revalidatePath("/education"); revalidatePath("/portfolio"); revalidatePath("/projects"); revalidatePath("/tasks"); revalidatePath("/resources"); }
function logInput(formData: FormData) { return { durationMinutes: field(formData, "durationMinutes"), focus: field(formData, "focus"), logDate: field(formData, "logDate"), logType: field(formData, "logType"), notes: optionalField(formData, "notes"), outcome: field(formData, "outcome"), projectId: field(formData, "projectId"), startTime: optionalField(formData, "startTime"), unitsCompleted: field(formData, "unitsCompleted"), wordCountDelta: field(formData, "wordCountDelta") }; }

export async function createEducationProjectFormAction(formData: FormData) {
  const auth = await context(); if (!auth) redirect(destination("blocked"));
  const repository = createSupabaseEducationRepository(auth.client);
  const areaId = await repository.ensureEducationArea(auth.user.id);
  const parsed = createProjectInputSchema.safeParse({ areaId, description: optionalField(formData, "description"), profileId: auth.user.id, status: field(formData, "status"), title: field(formData, "title"), userId: auth.user.id });
  if (!parsed.success) redirect(destination("project_error"));
  const result = await repository.createProject(auth.user.id, { description: parsed.data.description, status: parsed.data.status ?? "active", title: parsed.data.title });
  if (!result.ok) redirect(destination("project_error"));
  revalidateEducation(); redirect(destination("project_created", result.data.id));
}

export async function updateEducationProjectFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = updateProjectInputSchema.safeParse({ description: optionalField(formData, "description"), profileId: auth.user.id, projectId, status: field(formData, "status"), title: field(formData, "title"), userId: auth.user.id });
  if (!parsed.success) redirect(destination("project_error", projectId));
  const result = await createSupabaseEducationRepository(auth.client).updateProject(auth.user.id, projectId, { description: parsed.data.description, status: parsed.data.status ?? "active", title: parsed.data.title ?? "" });
  if (!result.ok) redirect(destination("project_error", projectId));
  revalidateEducation(); redirect(destination("project_updated", projectId));
}

export async function createEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const education = createSupabaseEducationRepository(auth.client); if (!(await education.ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const areaId = await education.ensureEducationArea(auth.user.id);
  const parsed = createResourceInputSchema.safeParse({ areaId, body: optionalField(formData, "body"), profileId: auth.user.id, reviewNeeded: false, title: field(formData, "title"), type: field(formData, "type"), url: optionalField(formData, "url"), userId: auth.user.id });
  if (!parsed.success) redirect(destination("literature_error", projectId));
  const resources = createSupabaseResourceRepository(auth.client); const created = await resources.createResource(parsed.data); if (!created.ok) redirect(destination("literature_error", projectId));
  const linked = await resources.linkResource({ profileId: auth.user.id, relationType: "source", resourceId: created.data.id, targetId: projectId, targetType: "project", userId: auth.user.id });
  if (!linked.ok) redirect(destination("literature_error", projectId, created.data.id));
  revalidateEducation(); redirect(destination("literature_created", projectId, created.data.id));
}

export async function linkEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const resourceId = field(formData, "resourceId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  if (!(await createSupabaseEducationRepository(auth.client).ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const parsed = linkResourceToTargetInputSchema.safeParse({ profileId: auth.user.id, relationType: "source", resourceId, targetId: projectId, targetType: "project" });
  if (!parsed.success) redirect(destination("literature_error", projectId));
  const result = await createSupabaseResourceRepository(auth.client).linkResource({ ...parsed.data, userId: auth.user.id }); if (!result.ok) redirect(destination("literature_error", projectId));
  revalidateEducation(); redirect(destination("literature_linked", projectId, resourceId));
}

export async function unlinkEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  if (!(await createSupabaseEducationRepository(auth.client).ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const parsed = unlinkResourceFromTargetInputSchema.safeParse({ profileId: auth.user.id, relationId: field(formData, "relationId") }); if (!parsed.success) redirect(destination("literature_error", projectId));
  const result = await createSupabaseResourceRepository(auth.client).unlinkResource(auth.user.id, auth.user.id, parsed.data.relationId); if (!result.ok) redirect(destination("literature_error", projectId));
  revalidateEducation(); redirect(destination("literature_unlinked", projectId));
}

export async function updateEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const resourceId = field(formData, "resourceId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId, resourceId));
  if (!(await createSupabaseEducationRepository(auth.client).ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const parsed = updateResourceInputSchema.safeParse({ body: optionalField(formData, "body") ?? null, profileId: auth.user.id, resourceId, title: field(formData, "title"), type: field(formData, "type"), url: optionalField(formData, "url") ?? null, userId: auth.user.id }); if (!parsed.success) redirect(destination("literature_error", projectId, resourceId));
  const result = await createSupabaseResourceRepository(auth.client).updateResource(parsed.data); if (!result.ok) redirect(destination("literature_error", projectId, resourceId));
  revalidateEducation(); redirect(destination("literature_updated", projectId, resourceId));
}

export async function createEducationLogFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = createEducationLogInputSchema.safeParse(logInput(formData)); if (!parsed.success) redirect(destination("log_error", projectId));
  const result = await createSupabaseEducationRepository(auth.client).createLog(auth.user.id, parsed.data); if (!result.ok) redirect(destination("log_error", projectId));
  revalidateEducation(); redirect(destination("log_created", projectId, result.data.id));
}

export async function updateEducationLogFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = updateEducationLogInputSchema.safeParse({ ...logInput(formData), logId: field(formData, "logId") }); if (!parsed.success) redirect(destination("log_error", projectId));
  const result = await createSupabaseEducationRepository(auth.client).updateLog(auth.user.id, parsed.data.logId, parsed.data); if (!result.ok) redirect(destination("log_error", projectId));
  revalidateEducation(); redirect(destination("log_updated", projectId, parsed.data.logId));
}

export async function archiveEducationLogFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = archiveEducationLogInputSchema.safeParse({ logId: field(formData, "logId"), projectId }); if (!parsed.success) redirect(destination("log_error", projectId));
  const result = await createSupabaseEducationRepository(auth.client).archiveLog(auth.user.id, parsed.data.projectId, parsed.data.logId); if (!result.ok) redirect(destination("log_error", projectId));
  revalidateEducation(); redirect(destination("log_archived", projectId));
}
