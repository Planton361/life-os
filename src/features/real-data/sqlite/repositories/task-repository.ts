import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { TaskRepository, TaskListInput } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import type { Task } from "../../domain";
import { hasTaskGoalConflict } from "../../domain";
import type { TaskRow, TaskInsert, TaskUpdate } from "../../supabase/row-types";
import {
  mapTaskRowToDomain, mapCreateTaskInputToInsert, mapUpdateTaskInputToPatch,
  mapScheduleTaskInputToPatch, mapUnscheduleTaskInputToPatch, mapRescheduleTaskInputToPatch,
  mapArchiveTaskInputToPatch, mapCarryTaskForwardInputToPatch,
} from "../../supabase/mappers/task.mapper";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import { SqliteRuntime } from "../runtime";
import { safeNumber, timestamp, localDate, uuid } from "../codecs";
import { createTaskInputSchema, updateTaskInputSchema } from "../../schemas/task.schemas";
import { localDateSchema, z } from "../../schemas/schema-contract";

const generatedInputSchema = updateTaskInputSchema.pick({ userId: true, profileId: true, description: true, areaId: true, projectId: true, goalId: true, energy: true, durationMinutes: true }).extend({
  templateId: z.uuid(), instanceDate: localDateSchema,
  title: createTaskInputSchema.shape.title,
  priority: createTaskInputSchema.shape.priority.nullable(),
});

type Link = { source_type: "meal" | "review" | "running_plan_item" | "strength_plan"; source_id: string; task_id: string };
export type SourceTaskCommands = {
  complete(db: Database.Database, owner: string, taskId: string, completedAt: string): TaskRow;
  scheduleMeal(db: Database.Database, owner: string, link: Link, plannedDate?: string, start?: string, duration?: number): TaskRow;
};

const columns = new Set([
  "title", "description", "status", "priority", "energy", "duration_minutes", "area_id", "project_id", "milestone_id", "goal_id",
  "source_inbox_item_id", "planned_date", "scheduled_start_at", "due_at", "completed_at", "archived_at", "carried_from_daily_log_id", "generated_from_template_id", "instance_date",
]);
function storage(field: string, value: unknown): string | number | null {
  if (value === null) return null;
  if (field.endsWith("_id")) return uuid(String(value));
  if (field.endsWith("_at")) return timestamp(String(value));
  if (field === "planned_date" || field === "instance_date") return localDate(String(value));
  if (typeof value !== "string" && typeof value !== "number") throw new Error("TASK_VALUE_INVALID");
  return value;
}
function rowDomain(row: TaskRow): Task {
  if (typeof row.duration_minutes === "bigint") row = { ...row, duration_minutes: safeNumber(row.duration_minutes) };
  return mapTaskRowToDomain(row);
}
function load(db: Database.Database, owner: string, id: string): TaskRow {
  const row = db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL").get(owner, uuid(id)) as TaskRow | undefined;
  if (!row) throw new Error("TASK_NOT_FOUND");
  return typeof row.duration_minutes === "bigint" ? { ...row, duration_minutes: safeNumber(row.duration_minutes) } : row;
}
function link(db: Database.Database, owner: string, taskId: string): Link | undefined {
  return db.prepare("SELECT source_type,source_id,task_id FROM schedule_source_links WHERE user_id=? AND task_id=?").get(owner, taskId) as Link | undefined;
}
function validateAlignment(db: Database.Database, owner: string, context: TaskInsert | TaskUpdate) {
  if (!context.project_id) return;
  const project = db.prepare("SELECT goal_id FROM projects WHERE user_id=? AND id=? AND archived_at IS NULL").get(owner, context.project_id) as { goal_id: string | null } | undefined;
  if (!project) throw new Error("TASK_PROJECT_NOT_FOUND");
  if (hasTaskGoalConflict(context.goal_id, project.goal_id)) throw new Error("TASK_GOAL_CONFLICT");
}
function validateContext(db: Database.Database, owner: string, context: TaskInsert | TaskUpdate) {
  for (const [column, table] of [["area_id", "areas"], ["project_id", "projects"], ["goal_id", "goals"], ["source_inbox_item_id", "inbox_items"], ["carried_from_daily_log_id", "daily_logs"]] as const) {
    const id = context[column];
    if (id != null && !db.prepare(`SELECT id FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL`).get(owner, uuid(id))) throw new Error("TASK_CONTEXT_NOT_FOUND");
  }
  if (context.milestone_id && (!context.project_id || !db.prepare("SELECT id FROM project_milestones WHERE user_id=? AND id=? AND project_id=? AND archived_at IS NULL").get(owner, context.milestone_id, context.project_id))) throw new Error("TASK_MILESTONE_NOT_FOUND");
}
export function createTaskInTransaction(db: Database.Database, owner: string, data: TaskInsert): TaskRow {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  validateContext(db, owner, data);
  validateAlignment(db, owner, data);
  const entries = Object.entries(data).filter(([key, value]) => key !== "user_id" && value !== undefined);
  if (entries.some(([key]) => !columns.has(key))) throw new Error("TASK_COLUMN_DENIED");
  const id = randomUUID(), now = timestamp(new Date().toISOString());
  db.prepare(`INSERT INTO tasks(id,user_id,created_at,updated_at,${entries.map(([key]) => key).join(",")}) VALUES(?,?,?,?,${entries.map(() => "?").join(",")})`)
    .run(id, owner, now, now, ...entries.map(([key, value]) => storage(key, value)));
  return load(db, owner, id);
}
function update(db: Database.Database, owner: string, id: string, patch: TaskUpdate): TaskRow {
  load(db, owner, id);
  validateContext(db, owner, patch);
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.some(([key]) => !columns.has(key))) throw new Error("TASK_COLUMN_DENIED");
  if (entries.length) db.prepare(`UPDATE tasks SET ${entries.map(([key]) => `${key}=?`).join(",")},updated_at=? WHERE user_id=? AND id=? AND archived_at IS NULL`)
    .run(...entries.map(([key, value]) => storage(key, value)), timestamp(new Date().toISOString()), owner, id);
  return db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=?").get(owner, id) as TaskRow;
}
function failure(error: unknown): RepositoryResult<never> {
  const code = error instanceof Error ? error.message : "TASK_COMMAND_FAILED";
  return { ok: false, error: {
    code: /OWNER_|SCOPE_/.test(code) ? "forbidden" : code.endsWith("NOT_FOUND") ? "not_found" : "conflict",
    // SQL/path/driver details stay server-side. Domain codes are safe feedback.
    message: /^(TASK_|SOURCE_|DEPENDENCY_|OWNER_|SCOPE_)[A-Z_]+$/.test(code) ? code : "Task konnte nicht gespeichert oder geladen werden.",
  } };
}

export function createSqliteTaskRepository(store: SqliteRuntime, context: OwnerContext, sources: SourceTaskCommands): TaskRepository {
  const scope = (userId: string, profileId: string) => {
    const owner = requireOwnerContext(context);
    if (userId !== owner || profileId !== owner) throw new Error("SCOPE_DENIED");
  };
  const command = <T>(input: { userId: string; profileId: string }, kind: string, body: (db: Database.Database, owner: string) => T): RepositoryResult<T> => {
    try { scope(input.userId, input.profileId); return { ok: true, data: store.command(context, kind, body) }; }
    catch (error) { return failure(error); }
  };
  const read = (input: { userId: string; profileId: string }, where: string, values: (string | number)[], order: string): RepositoryResult<Task[]> => {
    try {
      scope(input.userId, input.profileId);
      const rows = store.read(context, (db, owner) => db.prepare(`SELECT * FROM tasks WHERE user_id=? AND archived_at IS NULL ${where} ORDER BY ${order},id`).all(owner, ...values) as TaskRow[]);
      return { ok: true, data: rows.map(rowDomain) };
    } catch (error) { return failure(error); }
  };
  const patchUnlinked = (input: { userId: string; profileId: string; taskId: string }, kind: string, patch: TaskUpdate) => command(input, kind, (db, owner) => {
    if (link(db, owner, input.taskId)) throw new Error("SOURCE_FLOW_REQUIRED");
    return rowDomain(update(db, owner, input.taskId, patch));
  });
  const schedule = (input: { userId: string; profileId: string; taskId: string }, patch: TaskUpdate) => command(input, "source.schedule", (db, owner) => {
    const source = link(db, owner, input.taskId);
    if (source?.source_type === "meal") return rowDomain(sources.scheduleMeal(db, owner, source, patch.planned_date ?? undefined, patch.scheduled_start_at ?? undefined, patch.duration_minutes ?? undefined));
    return rowDomain(update(db, owner, input.taskId, patch));
  });
  return {
    async createTask(input) { return command(input, "task.create", (db, owner) => rowDomain(createTaskInTransaction(db, owner, mapCreateTaskInputToInsert(input, owner)))); },
    async createGeneratedTaskInstance(input) { return command(input, "task.generate", (db, owner) => {
      const parsed = generatedInputSchema.safeParse(input);
      if (!parsed.success) throw new Error("TASK_GENERATION_INVALID");
      input = parsed.data;
      const data: TaskInsert = { user_id: owner, title: input.title, generated_from_template_id: input.templateId, instance_date: input.instanceDate, planned_date: input.instanceDate };
      for (const [field, column] of [["areaId", "area_id"], ["projectId", "project_id"], ["goalId", "goal_id"], ["description", "description"], ["durationMinutes", "duration_minutes"], ["energy", "energy"], ["priority", "priority"]] as const) {
        const value = input[field]; if (value != null) Object.assign(data, { [column]: value });
      }
      validateContext(db, owner, data);
      validateAlignment(db, owner, data);
      const existing = db.prepare("SELECT * FROM tasks WHERE user_id=? AND generated_from_template_id=? AND instance_date=?").get(owner, uuid(input.templateId), localDate(input.instanceDate)) as TaskRow | undefined;
      if (existing) return { existing: true, task: rowDomain(existing) };
      return { existing: false, task: rowDomain(createTaskInTransaction(db, owner, data)) };
    }); },
    async archiveTask(input) { return patchUnlinked(input, "task.archive", mapArchiveTaskInputToPatch(input)); },
    async carryTaskForward(input) { return patchUnlinked(input, "task.carry", mapCarryTaskForwardInputToPatch(input)); },
    async reopenTask(input) { return patchUnlinked(input, "task.reopen", { completed_at: null, status: "planned" }); },
    async completeTask(input) { return command(input, "source.complete", (db, owner) => {
      const completedAt = timestamp(input.completedAt ?? new Date().toISOString());
      if (link(db, owner, input.taskId)) return rowDomain(sources.complete(db, owner, input.taskId, completedAt));
      return rowDomain(update(db, owner, input.taskId, { status: "done", completed_at: completedAt }));
    }); },
    async scheduleTask(input) { return schedule(input, mapScheduleTaskInputToPatch(input)); },
    async rescheduleTask(input) { return schedule(input, mapRescheduleTaskInputToPatch(input)); },
    async unscheduleTask(input) { return schedule(input, mapUnscheduleTaskInputToPatch()); },
    async updateTask(input) { return command(input, input.status === "done" ? "source.complete" : "task.update", (db, owner) => {
      const old = load(db, owner, input.taskId); const patch = mapUpdateTaskInputToPatch(input);
      validateAlignment(db, owner, { ...old, ...patch });
      if (link(db, owner, input.taskId)) {
        for (const field of ["planned_date", "scheduled_start_at", "duration_minutes"] as const)
          if (patch[field] !== undefined && patch[field] !== old[field]) throw new Error("SOURCE_FLOW_REQUIRED");
        if (patch.status !== undefined && patch.status !== old.status) {
          if (patch.status !== "done") throw new Error("SOURCE_FLOW_REQUIRED");
          const metadata = Object.entries(patch).filter(([field]) => !["planned_date", "scheduled_start_at", "duration_minutes", "status"].includes(field));
          if (metadata.some(([field, value]) => value !== old[field as keyof TaskRow])) throw new Error("SOURCE_METADATA_COMPLETION_CONFLICT");
          return rowDomain(sources.complete(db, owner, input.taskId, timestamp(new Date().toISOString())));
        }
      }
      return rowDomain(update(db, owner, input.taskId, patch));
    }); },
    async getTasksByUser(input: TaskListInput) {
      const column = input.sortBy === "planned" ? "planned_date" : input.sortBy === "scheduled" ? "scheduled_start_at" : "created_at";
      const direction = input.ascending ? "ASC NULLS LAST" : "DESC NULLS FIRST";
      return read(input, "", [], `${column} ${direction}${column !== "created_at" ? ",created_at DESC" : ""}`);
    },
    async getTasksForToday(userId, profileId, date) { return read({ userId, profileId }, "AND planned_date=?", [localDate(date)], "scheduled_start_at ASC NULLS LAST,created_at ASC"); },
    async getCalendarTasks(input) { return read(input, "AND planned_date>=? AND planned_date<=?", [localDate(input.fromDate), localDate(input.toDate)], "planned_date ASC,scheduled_start_at ASC NULLS LAST,created_at ASC"); },
    async getPortfolioTasks(userId, profileId) { return read({ userId, profileId }, "", [], "updated_at DESC"); },
  };
}
