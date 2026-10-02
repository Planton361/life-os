"use server";

import { redirect } from "next/navigation";
import { skillDevelopmentCommand } from "./skill-development.actions";
import type { SkillCommandOperation } from "../schemas/skill-development.schema";

export type SkillActionResult = {
  evidenceId?: string;
  skillId?: string;
  message: string;
  status: "blocked" | "error" | "success";
};

// Compatibility exports require the same caller-held revision and idempotency key.
// They never fetch a newer revision or fall back to direct table writes.
async function command(
  form: FormData,
  operation: SkillCommandOperation,
): Promise<SkillActionResult> {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const payload: Record<string, unknown> = {};
  const fields: Record<string, string> = {
    name: "name",
    summary: "summary",
    category: "category",
    level: "level",
    status: "status",
    areaId: "area_id",
    title: "title",
    note: "note",
    evidenceDate: "evidence_date",
    evidenceId: "evidence_id",
    reason: "reason",
  };
  for (const [input, output] of Object.entries(fields))
    if (form.has(input)) payload[output] = value(input) || null;
  if (operation === "evidence.create" || operation === "evidence.correct") {
    const [sourceType, sourceId] = value("sourceReference").split(":");
    payload.source_type = sourceType || value("sourceType");
    payload.source_id =
      payload.source_type === "manual_note"
        ? null
        : sourceId || value("sourceId") || null;
    if (form.has("weight"))
      payload.weight = value("weight") ? Number(value("weight")) : null;
  }
  const result = await skillDevelopmentCommand({
    operation,
    commandId: value("commandId"),
    skillId: operation === "skill.create" ? null : value("skillId"),
    expectedRevision:
      operation === "skill.create"
        ? null
        : form.has("expectedDevelopmentRevision")
          ? Number(value("expectedDevelopmentRevision"))
          : null,
    payload,
  });
  return {
    status: result.status,
    message: result.message,
    ...(result.status === "success"
      ? {
          skillId: result.result.skill_id,
          evidenceId: result.result.evidence_id,
        }
      : {}),
  };
}
export async function createSkillAction(f: FormData) {
  return command(f, "skill.create");
}
export async function updateSkillAction(f: FormData) {
  return command(f, "skill.edit");
}
export async function archiveSkillAction(f: FormData) {
  return command(f, "skill.archive");
}
export async function createSkillEvidenceAction(f: FormData) {
  return command(f, "evidence.create");
}
export async function updateSkillEvidenceAction(f: FormData) {
  return command(f, "evidence.correct");
}
// Historical API name: this is now explicit withdrawal, with a required reason.
export async function deleteSkillEvidenceAction(f: FormData) {
  return command(f, "evidence.withdraw");
}
async function navigate(result: SkillActionResult) {
  redirect(
    result.status === "success" && result.skillId
      ? `/skills/${result.skillId}`
      : `/portfolio?view=skills&targetCreate=${result.status}`,
  );
}
export async function createSkillFormAction(f: FormData) {
  return navigate(await createSkillAction(f));
}
export async function updateSkillFormAction(f: FormData) {
  return navigate(await updateSkillAction(f));
}
export async function archiveSkillFormAction(f: FormData) {
  return navigate(await archiveSkillAction(f));
}
export async function createSkillEvidenceFormAction(f: FormData) {
  return navigate(await createSkillEvidenceAction(f));
}
export async function deleteSkillEvidenceFormAction(f: FormData) {
  return navigate(await deleteSkillEvidenceAction(f));
}
