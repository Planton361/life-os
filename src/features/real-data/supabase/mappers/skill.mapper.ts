import {
  skillEvidenceSourceTypes,
  skillStatuses,
  type Skill,
  type SkillEvidence,
  type SkillEvidenceSourceType,
  type SkillStatus,
  type TaskSkillLink,
} from "../../domain";
import type {
  SkillCreateInput,
  SkillEvidenceCreateInput,
  SkillEvidenceUpdateInput,
  SkillUpdateInput,
} from "../../schemas";
import type {
  SkillEvidenceInsert,
  SkillEvidenceRow,
  SkillEvidenceUpdate,
  SkillInsert,
  SkillRow,
  SkillUpdate,
  TaskSkillLinkInsert,
  TaskSkillLinkRow,
} from "../row-types";

function isSkillStatus(value: string): value is SkillStatus {
  return skillStatuses.includes(value as SkillStatus);
}

function isSkillEvidenceSourceType(
  value: string,
): value is SkillEvidenceSourceType {
  return skillEvidenceSourceTypes.includes(value as SkillEvidenceSourceType);
}

function mapSkillStatus(value: string): SkillStatus {
  if (!isSkillStatus(value)) {
    throw new Error("Unsupported skill status.");
  }

  return value;
}

function mapSkillEvidenceSourceType(value: string): SkillEvidenceSourceType {
  if (!isSkillEvidenceSourceType(value)) {
    throw new Error("Unsupported skill evidence source type.");
  }

  return value;
}

export function mapSkillRowToDomain(row: SkillRow): Skill {
  return {
    archivedAt: row.archived_at,
    areaId: row.area_id,
    category: row.category,
    createdAt: row.created_at,
    id: row.id,
    level: row.level,
    name: row.name,
    profileId: row.user_id,
    status: mapSkillStatus(row.status),
    summary: row.summary,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapSkillEvidenceRowToDomain(
  row: SkillEvidenceRow,
): SkillEvidence {
  return {
    archivedAt: null,
    createdAt: row.created_at,
    evidenceDate: row.evidence_date,
    id: row.id,
    note: row.note,
    profileId: row.user_id,
    skillId: row.skill_id,
    sourceId: row.source_id,
    sourceType: mapSkillEvidenceSourceType(row.source_type),
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
    weight: row.weight,
  };
}

export function mapTaskSkillLinkRowToDomain(
  row: TaskSkillLinkRow,
): TaskSkillLink {
  return {
    archivedAt: null,
    createdAt: row.created_at,
    id: row.id,
    skillId: row.skill_id,
    taskId: row.task_id,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapTaskSkillLinkToInsert(
  input: { skillId: string; taskId: string },
  userId: string,
): TaskSkillLinkInsert {
  return {
    skill_id: input.skillId,
    task_id: input.taskId,
    user_id: userId,
  };
}

export function mapSkillCreateInputToInsert(
  input: SkillCreateInput,
  userId: string,
): SkillInsert {
  const insert: SkillInsert = {
    name: input.name,
    user_id: userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.category !== undefined) insert.category = input.category;
  if (input.level !== undefined) insert.level = input.level;
  if (input.status !== undefined) insert.status = input.status;
  if (input.summary !== undefined) insert.summary = input.summary;

  return insert;
}

export function mapSkillUpdateInputToPatch(
  input: SkillUpdateInput,
): SkillUpdate {
  const patch: SkillUpdate = {};

  if (input.areaId !== undefined) patch.area_id = input.areaId;
  if (input.category !== undefined) patch.category = input.category;
  if (input.level !== undefined) patch.level = input.level;
  if (input.name !== undefined) patch.name = input.name;
  if (input.status !== undefined) patch.status = input.status;
  if (input.summary !== undefined) patch.summary = input.summary;

  return patch;
}

export function mapSkillEvidenceCreateInputToInsert(
  input: SkillEvidenceCreateInput,
  userId: string,
): SkillEvidenceInsert {
  const insert: SkillEvidenceInsert = {
    evidence_date: input.evidenceDate,
    skill_id: input.skillId,
    source_type: input.sourceType,
    title: input.title,
    user_id: userId,
  };

  if (input.note !== undefined) insert.note = input.note;
  if (input.sourceId !== undefined) insert.source_id = input.sourceId;
  if (input.weight !== undefined) insert.weight = input.weight;

  return insert;
}

export function mapSkillEvidenceUpdateInputToPatch(
  input: SkillEvidenceUpdateInput,
): SkillEvidenceUpdate {
  const patch: SkillEvidenceUpdate = {};

  if (input.evidenceDate !== undefined) patch.evidence_date = input.evidenceDate;
  if (input.note !== undefined) patch.note = input.note;
  if (input.skillId !== undefined) patch.skill_id = input.skillId;
  if (input.sourceId !== undefined) patch.source_id = input.sourceId;
  if (input.sourceType !== undefined) patch.source_type = input.sourceType;
  if (input.title !== undefined) patch.title = input.title;
  if (input.weight !== undefined) patch.weight = input.weight;

  return patch;
}
