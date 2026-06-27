import type { CreateResourceInput, LinkResourceInput } from "../../schemas";
import {
  supportedResourceRelationTargetTypes,
  type Resource,
  type ResourceRelation,
  type SupportedResourceRelationTargetType,
} from "../../domain";
import type {
  ResourceInsert,
  ResourceRelationInsert,
  ResourceRelationRow,
  ResourceRow,
} from "../row-types";

function isSupportedResourceRelationTargetType(
  value: string,
): value is SupportedResourceRelationTargetType {
  return supportedResourceRelationTargetTypes.includes(
    value as SupportedResourceRelationTargetType,
  );
}

export function mapResourceRowToDomain(row: ResourceRow): Resource {
  return {
    archivedAt: row.archived_at,
    areaId: row.area_id,
    body: row.summary,
    context: null,
    createdAt: row.created_at,
    id: row.id,
    privacyClass: "standard_private",
    profileId: row.user_id,
    reviewNeeded: row.review_needed,
    source: row.source,
    status: row.review_needed ? "processing" : "captured",
    title: row.title,
    type: row.type,
    updatedAt: row.updated_at,
    url: row.url,
    userId: row.user_id,
  };
}

export function mapCreateResourceInputToInsert(
  input: CreateResourceInput,
  userId: string,
): ResourceInsert {
  const insert: ResourceInsert = {
    title: input.title,
    type: input.type,
    user_id: userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.body !== undefined || input.context !== undefined) {
    insert.summary = input.body ?? input.context;
  }
  if (input.reviewNeeded !== undefined) {
    insert.review_needed = input.reviewNeeded;
  }
  if (input.source !== undefined) insert.source = input.source;
  if (input.url !== undefined) insert.url = input.url;

  return insert;
}

export function mapResourceRelationRowToDomain(
  row: ResourceRelationRow,
): ResourceRelation {
  if (!isSupportedResourceRelationTargetType(row.target_type)) {
    throw new Error("Unsupported resource relation target type.");
  }

  return {
    archivedAt: null,
    createdAt: row.created_at,
    id: row.id,
    profileId: row.user_id,
    relationType: row.relation_type,
    resourceId: row.resource_id,
    targetId: row.target_id,
    targetType: row.target_type,
    updatedAt: row.created_at,
    userId: row.user_id,
  };
}

export function mapLinkResourceInputToInsert(
  input: LinkResourceInput,
  userId: string,
): ResourceRelationInsert {
  return {
    relation_type: input.relationType,
    resource_id: input.resourceId,
    target_id: input.targetId,
    target_type: input.targetType,
    user_id: userId,
  };
}
