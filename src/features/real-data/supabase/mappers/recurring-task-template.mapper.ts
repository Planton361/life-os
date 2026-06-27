import type { RecurringTaskTemplate, RecurrenceRule } from "../../domain";
import type {
  CreateRecurringTaskTemplateInput,
  UpdateRecurringTaskTemplateInput,
} from "../../schemas";
import type {
  RecurringTaskTemplateInsert,
  RecurringTaskTemplateRow,
  RecurringTaskTemplateUpdate,
} from "../row-types";

function isRecurrenceRule(value: unknown): value is RecurrenceRule {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mapRecurrenceRule(value: unknown): RecurrenceRule {
  return isRecurrenceRule(value) ? value : {};
}

function mapRecurrenceRuleToJson(
  value: RecurrenceRule,
): RecurringTaskTemplateInsert["recurrence_rule"] {
  return value as RecurringTaskTemplateInsert["recurrence_rule"];
}

export function mapRecurringTaskTemplateRowToDomain(
  row: RecurringTaskTemplateRow,
): RecurringTaskTemplate {
  return {
    areaId: row.area_id,
    createdAt: row.created_at,
    description: row.description,
    durationMinutes: row.duration_minutes,
    endsOn: row.ends_on,
    energy: row.energy,
    goalId: row.goal_id,
    id: row.id,
    isActive: row.is_active,
    nextAction: row.next_action,
    priority: row.priority,
    profileId: row.user_id,
    projectId: row.project_id,
    recurrenceRule: mapRecurrenceRule(row.recurrence_rule),
    startsOn: row.starts_on,
    timezone: row.timezone,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapCreateRecurringTaskTemplateInputToInsert(
  input: CreateRecurringTaskTemplateInput,
): RecurringTaskTemplateInsert {
  const insert: RecurringTaskTemplateInsert = {
    recurrence_rule: mapRecurrenceRuleToJson(input.recurrenceRule),
    starts_on: input.startsOn,
    timezone: input.timezone,
    title: input.title,
    user_id: input.userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.description !== undefined) insert.description = input.description;
  if (input.durationMinutes !== undefined) {
    insert.duration_minutes = input.durationMinutes;
  }
  if (input.endsOn !== undefined) insert.ends_on = input.endsOn;
  if (input.energy !== undefined) insert.energy = input.energy;
  if (input.goalId !== undefined) insert.goal_id = input.goalId;
  if (input.isActive !== undefined) insert.is_active = input.isActive;
  if (input.nextAction !== undefined) insert.next_action = input.nextAction;
  if (input.priority !== undefined) insert.priority = input.priority;
  if (input.projectId !== undefined) insert.project_id = input.projectId;

  return insert;
}

export function mapUpdateRecurringTaskTemplateInputToPatch(
  input: UpdateRecurringTaskTemplateInput,
): RecurringTaskTemplateUpdate {
  const patch: RecurringTaskTemplateUpdate = {};

  if (input.areaId !== undefined) patch.area_id = input.areaId;
  if (input.description !== undefined) patch.description = input.description;
  if (input.durationMinutes !== undefined) {
    patch.duration_minutes = input.durationMinutes;
  }
  if (input.endsOn !== undefined) patch.ends_on = input.endsOn;
  if (input.energy !== undefined) patch.energy = input.energy;
  if (input.goalId !== undefined) patch.goal_id = input.goalId;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.nextAction !== undefined) patch.next_action = input.nextAction;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.projectId !== undefined) patch.project_id = input.projectId;
  if (input.recurrenceRule !== undefined) {
    patch.recurrence_rule = mapRecurrenceRuleToJson(input.recurrenceRule);
  }
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.title !== undefined) patch.title = input.title;

  return patch;
}
