import type { Project } from "../../domain";
import type { CreateProjectInput, UpdateProjectInput } from "../../schemas";
import type { ProjectInsert, ProjectRow, ProjectUpdate } from "../row-types";

export function mapProjectRowToDomain(row: ProjectRow): Project {
  return {
    areaId: row.area_id,
    createdAt: row.created_at,
    deadline: row.target_date,
    description: row.description,
    goalId: row.goal_id,
    id: row.id,
    nextStep: row.next_step,
    priority: row.priority,
    profileId: row.user_id,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapCreateProjectInputToInsert(
  input: CreateProjectInput,
  userId: string,
): ProjectInsert {
  const insert: ProjectInsert = {
    title: input.title,
    user_id: userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.deadline !== undefined) insert.target_date = input.deadline;
  if (input.description !== undefined) insert.description = input.description;
  if (input.goalId !== undefined) insert.goal_id = input.goalId;
  if (input.nextStep !== undefined) insert.next_step = input.nextStep;
  if (input.priority !== undefined) insert.priority = input.priority;
  if (input.status !== undefined) insert.status = input.status;

  return insert;
}

export function mapUpdateProjectInputToPatch(
  input: UpdateProjectInput,
): ProjectUpdate {
  const patch: ProjectUpdate = {};

  if (input.areaId !== undefined) patch.area_id = input.areaId;
  if (input.deadline !== undefined) patch.target_date = input.deadline;
  if (input.description !== undefined) patch.description = input.description;
  if (input.goalId !== undefined) patch.goal_id = input.goalId;
  if (input.nextStep !== undefined) patch.next_step = input.nextStep;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) {
    patch.status = input.status;

    if (input.status === "archived") {
      patch.archived_at = new Date().toISOString();
    }
  }
  if (input.title !== undefined) patch.title = input.title;

  return patch;
}
