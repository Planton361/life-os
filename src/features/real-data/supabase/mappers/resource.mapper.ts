import type { CreateResourceInput } from "../../schemas";
import type { Resource } from "../../domain";
import type { ResourceInsert, ResourceRow } from "../row-types";

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
