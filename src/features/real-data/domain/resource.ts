import type {
  AreaId,
  EntityId,
  ProfileId,
  ResourceId,
  ResourceRelationId,
  UserScopedEntity,
} from "./ids";

export const resourceTypes = [
  "note",
  "learning",
  "prompt",
  "research",
  "link",
  "source",
  "snippet",
  "decision",
] as const;

export const resourceStatuses = [
  "captured",
  "processing",
  "ready",
  "applied",
  "archived",
] as const;

export const privacyClasses = [
  "standard_private",
  "personal_sensitive",
  "health_sensitive",
  "work_restricted",
  "system_restricted",
  "shareable",
] as const;

export const resourceRelationTargetTypes = [
  "inbox_item",
  "task",
  "project",
  "goal",
  "daily_log",
  "resource",
  "area",
] as const;

export const resourceRelationTypes = [
  "source",
  "context",
  "supports",
  "evidence",
  "decision",
  "related",
] as const;

export type ResourceType = (typeof resourceTypes)[number];
export type ResourceStatus = (typeof resourceStatuses)[number];
export type PrivacyClass = (typeof privacyClasses)[number];
export type ResourceRelationTargetType =
  (typeof resourceRelationTargetTypes)[number];
export type ResourceRelationType = (typeof resourceRelationTypes)[number];

export type Resource = UserScopedEntity & {
  id: ResourceId;
  profileId: ProfileId;
  areaId: AreaId | null;
  title: string;
  body: string | null;
  url: string | null;
  type: ResourceType;
  status: ResourceStatus;
  privacyClass: PrivacyClass;
  source: string | null;
  context: string | null;
  reviewNeeded: boolean;
};

export type ResourceRelation = UserScopedEntity & {
  id: ResourceRelationId;
  profileId: ProfileId;
  resourceId: ResourceId;
  targetType: ResourceRelationTargetType;
  targetId: EntityId;
  relationType: ResourceRelationType;
};
