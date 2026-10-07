"use server";

import { revalidatePath } from "next/cache";
import { getEducationRepository, getResourceRepository } from "@/features/real-data/runtime/facade";
import { redirect } from "next/navigation";
import {
  createProjectInputSchema,
  createEducationLiteratureInputSchema,
  linkResourceToTargetInputSchema,
  unlinkResourceFromTargetInputSchema,
  updateProjectInputSchema,
  updateResourceInputSchema,
} from "../schemas";
import { archiveEducationLogInputSchema, createEducationLogInputSchema, updateEducationLogInputSchema } from "../schemas/education-log.schemas";

import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";

function field(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value.trim() : ""; }
function optionalField(formData: FormData, key: string) { return field(formData, key) || undefined; }
function destination(state: string, projectId?: string, resourceId?: string) { const params = new URLSearchParams({ educationAction: state }); if (projectId) params.set("selected", projectId); if (resourceId) params.set("resource", resourceId); return `/education?${params}`; }
async function context() { if ((await getCurrentLifeOsProfileId()) !== "manual") return null; const auth = await createAuthenticatedApplicationContext("write"); return auth.ok ? auth : null; }
function revalidateEducation(projectId?: string) { revalidatePath("/education"); revalidatePath("/portfolio"); revalidatePath("/projects"); revalidatePath("/tasks"); revalidatePath("/resources"); revalidatePath("/dashboard"); revalidatePath("/today"); revalidatePath("/calendar"); revalidatePath("/goals"); revalidatePath("/goals/[goalId]", "page"); if (projectId) revalidatePath(`/projects/${projectId}`); }
function logInput(formData: FormData) { return { durationMinutes: field(formData, "durationMinutes"), focus: field(formData, "focus"), logDate: field(formData, "logDate"), logType: field(formData, "logType"), notes: optionalField(formData, "notes"), outcome: field(formData, "outcome"), projectId: field(formData, "projectId"), startTime: optionalField(formData, "startTime"), unitsCompleted: field(formData, "unitsCompleted"), wordCountDelta: field(formData, "wordCountDelta") }; }

export async function createEducationProjectFormAction(formData: FormData) {
  const auth = await context(); if (!auth) redirect(destination("blocked"));
  const repository = getEducationRepository(auth.data);
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
  const result = await getEducationRepository(auth.data).updateProject(auth.user.id, projectId, { description: parsed.data.description ?? undefined, status: parsed.data.status ?? "active", title: parsed.data.title ?? "" });
  if (!result.ok) redirect(destination("project_error", projectId));
  revalidateEducation(projectId); redirect(destination("project_updated", projectId));
}

export async function createEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const education = getEducationRepository(auth.data);
  const areaId = await education.ensureEducationArea(auth.user.id);
  const parsed = createEducationLiteratureInputSchema.safeParse({ areaId, body: optionalField(formData, "body"), profileId: auth.user.id, projectId, reviewNeeded: false, title: field(formData, "title"), type: field(formData, "type"), url: optionalField(formData, "url"), userId: auth.user.id });
  if (!parsed.success) redirect(destination("literature_error", projectId));
  if (!areaId) redirect(destination("literature_error", projectId));
  const created = await education.createLiteratureResource(auth.user.id, { areaId, body: parsed.data.body, projectId, title: parsed.data.title, type: parsed.data.type, url: parsed.data.url });
  if (!created.ok) redirect(destination("literature_error", projectId));
  revalidateEducation(); redirect(destination("literature_created", projectId, created.data.id));
}

export async function linkEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const resourceId = field(formData, "resourceId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  if (!(await getEducationRepository(auth.data).ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const parsed = linkResourceToTargetInputSchema.safeParse({ profileId: auth.user.id, relationType: "source", resourceId, targetId: projectId, targetType: "project" });
  if (!parsed.success) redirect(destination("literature_error", projectId));
  const result = await getResourceRepository(auth.data).linkResource({ ...parsed.data, userId: auth.user.id }); if (!result.ok) redirect(destination("literature_error", projectId));
  revalidateEducation(); redirect(destination("literature_linked", projectId, resourceId));
}

export async function unlinkEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  if (!(await getEducationRepository(auth.data).ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const parsed = unlinkResourceFromTargetInputSchema.safeParse({ profileId: auth.user.id, relationId: field(formData, "relationId") }); if (!parsed.success) redirect(destination("literature_error", projectId));
  const result = await getResourceRepository(auth.data).unlinkResource(auth.user.id, auth.user.id, parsed.data.relationId); if (!result.ok) redirect(destination("literature_error", projectId));
  revalidateEducation(); redirect(destination("literature_unlinked", projectId));
}

export async function updateEducationLiteratureFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const resourceId = field(formData, "resourceId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId, resourceId));
  if (!(await getEducationRepository(auth.data).ownedProject(auth.user.id, projectId))) redirect(destination("literature_error", projectId));
  const parsed = updateResourceInputSchema.safeParse({ body: optionalField(formData, "body") ?? null, profileId: auth.user.id, resourceId, title: field(formData, "title"), type: field(formData, "type"), url: optionalField(formData, "url") ?? null, userId: auth.user.id }); if (!parsed.success) redirect(destination("literature_error", projectId, resourceId));
  const result = await getResourceRepository(auth.data).updateResource(parsed.data); if (!result.ok) redirect(destination("literature_error", projectId, resourceId));
  revalidateEducation(); redirect(destination("literature_updated", projectId, resourceId));
}

export async function createEducationLogFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = createEducationLogInputSchema.safeParse(logInput(formData)); if (!parsed.success) redirect(destination("log_error", projectId));
  const result = await getEducationRepository(auth.data).createLog(auth.user.id, parsed.data); if (!result.ok) redirect(destination("log_error", projectId));
  revalidateEducation(); redirect(destination("log_created", projectId, result.data.id));
}

export async function updateEducationLogFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = updateEducationLogInputSchema.safeParse({ ...logInput(formData), logId: field(formData, "logId") }); if (!parsed.success) redirect(destination("log_error", projectId));
  const result = await getEducationRepository(auth.data).updateLog(auth.user.id, parsed.data.logId, parsed.data); if (!result.ok) redirect(destination("log_error", projectId));
  revalidateEducation(); redirect(destination("log_updated", projectId, parsed.data.logId));
}

export async function archiveEducationLogFormAction(formData: FormData) {
  const projectId = field(formData, "projectId"); const auth = await context(); if (!auth) redirect(destination("blocked", projectId));
  const parsed = archiveEducationLogInputSchema.safeParse({ logId: field(formData, "logId"), projectId }); if (!parsed.success) redirect(destination("log_error", projectId));
  const result = await getEducationRepository(auth.data).archiveLog(auth.user.id, parsed.data.projectId, parsed.data.logId); if (!result.ok) redirect(destination("log_error", projectId));
  revalidateEducation(); redirect(destination("log_archived", projectId));
}
