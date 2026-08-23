import type {
  AreaId,
  LocalDateString,
  ProfileId,
  SkillEvidenceId,
  SkillId,
  TaskId,
  TaskSkillLinkId,
  UserScopedEntity,
} from "./ids";

export const skillStatuses = ["active", "paused", "archived"] as const;

export const skillEvidenceSourceTypes = [
  "task",
  "project",
  "goal",
  "resource",
  "manual_note",
] as const;

export type SkillStatus = (typeof skillStatuses)[number];
export type SkillEvidenceSourceType =
  (typeof skillEvidenceSourceTypes)[number];

export type Skill = UserScopedEntity & {
  id: SkillId;
  profileId: ProfileId;
  areaId: AreaId | null;
  name: string;
  summary: string | null;
  category: string | null;
  status: SkillStatus;
  level: string | null;
  archivedAt: string | null;
};

export type SkillEvidence = UserScopedEntity & {
  id: SkillEvidenceId;
  profileId: ProfileId;
  skillId: SkillId;
  sourceType: SkillEvidenceSourceType;
  sourceId: string | null;
  title: string;
  note: string | null;
  evidenceDate: LocalDateString;
  weight: number | null;
};

export type TaskSkillLink = UserScopedEntity & {
  id: TaskSkillLinkId;
  taskId: TaskId;
  skillId: SkillId;
};
