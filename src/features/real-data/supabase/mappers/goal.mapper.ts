import type { Goal, GoalHorizon } from "../../domain";
import type { CreateGoalInput } from "../../schemas";
import type { GoalInsert, GoalRow } from "../row-types";

export function mapGoalRowToDomain(row: GoalRow): Goal {
  return {
    areaId: row.area_id,
    createdAt: row.created_at,
    description: row.description,
    horizon: (row.horizon ?? "someday") as GoalHorizon,
    id: row.id,
    measure: row.measure,
    profileId: row.user_id,
    status: row.status,
    targetDate: row.target_date,
    targetValue: row.target_value,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
    why: row.why,
  };
}

export function mapCreateGoalInputToInsert(
  input: CreateGoalInput,
  userId: string,
): GoalInsert {
  const insert: GoalInsert = {
    title: input.title,
    user_id: userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.description !== undefined) insert.description = input.description;
  if (input.horizon !== undefined) insert.horizon = input.horizon;
  if (input.measure !== undefined) insert.measure = input.measure;
  if (input.status !== undefined) insert.status = input.status;
  if (input.targetDate !== undefined) insert.target_date = input.targetDate;
  if (input.targetValue !== undefined) insert.target_value = input.targetValue;
  if (input.why !== undefined) insert.why = input.why;

  return insert;
}
