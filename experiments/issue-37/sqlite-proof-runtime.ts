import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { cookies, headers } from "next/headers";
import type { CreateTaskInput, UpdateTaskInput } from "@/features/real-data/schemas";
import type { GoalOutcome } from "@/features/real-data/domain/goal-outcome";
import {
  buildGoalOutcomeSummary,
  deriveGoalNextStep,
} from "@/features/real-data/domain/goal-outcome";
import type { TaskDependencyGraph } from "@/features/real-data/domain/task-dependencies";
import type {
  GoalRow,
  ProjectRow,
  TaskRow,
} from "@/features/real-data/supabase/row-types";
import { mapTaskRowToDomain } from "@/features/real-data/supabase/mappers/task.mapper";
import { isSqliteProofRuntime } from "./proof-gate";
export { isSqliteProofRuntime } from "./proof-gate";

// Deliberately test-only. This is neither a hosted login nor a replacement for
// the existing Supabase runtime. The harness binds Next to loopback.
export const proofOwnerId = "37000000-0000-4000-8000-000000000001";
const safeRoot = "/private/tmp/life-os-37-proof/";
const cookieName = "life_os_37_proof_owner";
let connection: DatabaseSync | null = null;
let connectionPath: string | null = null;

function database() {
  if (!isSqliteProofRuntime()) throw new Error("SQLite proof runtime disabled");
  const path = resolve(process.env.LIFE_OS_37_SQLITE_DB!);
  if (connection && connectionPath === path) return connection;
  if (connection) connection.close();
  connection = new DatabaseSync(path);
  connection.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
  connectionPath = path;
  return connection;
}

export async function getProofOwnerId(): Promise<string | null> {
  if (!isSqliteProofRuntime()) return null;
  const host = (await headers()).get("host") ?? "";
  if (!/^127\.0\.0\.1:\d+$/.test(host)) return null;
  const actual = (await cookies()).get(cookieName)?.value ?? "";
  const expected = process.env.LIFE_OS_37_OWNER_TOKEN ?? "";
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (!a.length || a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return proofOwnerId;
}

export type ProofSnapshot = {
  tasks: TaskRow[];
  projects: ProjectRow[];
  goals: GoalRow[];
  milestones: Array<Record<string, unknown>>;
  goalMilestones: Array<Record<string, unknown>>;
  scheduleSources: Array<{ task_id: string; source_type: "meal" | "review" | "running_plan_item" | "strength_plan"; source_id: string }>;
  dependencyGraph: TaskDependencyGraph;
};

export function readProofSnapshot(ownerId: string): ProofSnapshot {
  if (ownerId !== proofOwnerId) throw new Error("Proof owner mismatch");
  const db = database();
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id=? AND archived_at IS NULL ORDER BY created_at DESC,id").all(ownerId) as unknown as TaskRow[];
  const projects = db.prepare("SELECT * FROM projects WHERE user_id=? AND archived_at IS NULL ORDER BY created_at DESC,id").all(ownerId) as unknown as ProjectRow[];
  const goals = db.prepare("SELECT * FROM goals WHERE user_id=? AND archived_at IS NULL ORDER BY created_at DESC,id").all(ownerId) as unknown as GoalRow[];
  const milestones = db.prepare("SELECT * FROM project_milestones WHERE user_id=? AND archived_at IS NULL ORDER BY sort_order,id").all(ownerId) as Array<Record<string, unknown>>;
  const goalMilestones = db.prepare("SELECT * FROM goal_milestones WHERE user_id=? AND archived_at IS NULL ORDER BY sort_order,id").all(ownerId) as Array<Record<string, unknown>>;
  const scheduleSources = db.prepare("SELECT task_id,source_type,source_id FROM schedule_source_links WHERE user_id=?").all(ownerId) as ProofSnapshot["scheduleSources"];
  const edges = db.prepare("SELECT id,predecessor_task_id,successor_task_id FROM task_dependencies WHERE user_id=?").all(ownerId) as TaskDependencyGraph["dependencies"];
  return {
    tasks, projects, goals, milestones, goalMilestones, scheduleSources,
    dependencyGraph: {
      tasks: tasks.map((task) => ({
        id: task.id, title: task.title, project_id: task.project_id,
        status: task.status, completed_at: task.completed_at,
        archived_at: task.archived_at,
      })),
      dependencies: edges,
    },
  };
}

function transaction<T>(body: (db: DatabaseSync) => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = body(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

type ProofTaskResult =
  | { ok: true; data: ReturnType<typeof mapTaskRowToDomain> }
  | { ok: false; error: { code: "forbidden" | "not_found" | "conflict"; message: string } };

function failure(error: unknown): ProofTaskResult {
  const message = error instanceof Error ? error.message : "Proof write failed";
  return {
    ok: false,
    error: {
      code: message.includes("NOT_FOUND") ? "not_found" : "conflict",
      message,
    },
  };
}

function ownedTask(db: DatabaseSync, ownerId: string, taskId: string) {
  const row = db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL").get(ownerId, taskId) as TaskRow | undefined;
  if (!row) throw new Error("TASK_NOT_FOUND");
  return row;
}

export function proofContextExists(ownerId: string, kind: "project" | "goal", id: string) {
  if (ownerId !== proofOwnerId) return false;
  const table = kind === "project" ? "projects" : "goals";
  return Boolean(database().prepare(`SELECT 1 FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL`).get(ownerId, id));
}

export function createProofTask(ownerId: string, input: CreateTaskInput): ProofTaskResult {
  if (ownerId !== proofOwnerId || input.userId !== ownerId || input.profileId !== ownerId)
    return { ok: false, error: { code: "forbidden", message: "Owner scope mismatch" } };
  try {
    const row = transaction((db) => {
      const now = new Date().toISOString();
      const taskId = randomUUID();
      db.prepare(`INSERT INTO tasks(id,user_id,title,description,status,priority,energy,duration_minutes,
        planned_date,scheduled_start_at,due_at,area_id,project_id,milestone_id,goal_id,
        created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        taskId, ownerId, input.title, input.description ?? null, input.status ?? "planned",
        input.priority ?? "none", input.energy ?? null, input.durationMinutes ?? null,
        input.plannedDate ?? null, input.scheduledStartAt ?? null, input.dueAt ?? null,
        input.areaId ?? null, input.projectId ?? null, input.milestoneId ?? null,
        input.goalId ?? null, now, now,
      );
      return ownedTask(db, ownerId, taskId);
    });
    return { ok: true, data: mapTaskRowToDomain(row) };
  } catch (error) { return failure(error); }
}

export function updateProofTask(ownerId: string, input: UpdateTaskInput): ProofTaskResult {
  if (ownerId !== proofOwnerId || input.userId !== ownerId || input.profileId !== ownerId)
    return { ok: false, error: { code: "forbidden", message: "Owner scope mismatch" } };
  try {
    const row = transaction((db) => {
      ownedTask(db, ownerId, input.taskId);
      const values: Array<[string, string | number | null]> = [];
      for (const [field, column] of [
        ["title", "title"], ["description", "description"], ["status", "status"],
        ["priority", "priority"], ["energy", "energy"], ["durationMinutes", "duration_minutes"],
        ["plannedDate", "planned_date"], ["scheduledStartAt", "scheduled_start_at"],
        ["dueAt", "due_at"], ["areaId", "area_id"], ["projectId", "project_id"],
        ["goalId", "goal_id"],
      ] as const) {
        const value = input[field];
        if (value !== undefined) values.push([column, value]);
      }
      values.push(["updated_at", new Date().toISOString()]);
      db.prepare(`UPDATE tasks SET ${values.map(([column]) => `${column}=?`).join(",")}
        WHERE user_id=? AND id=?`).run(...values.map(([, value]) => value), ownerId, input.taskId);
      return ownedTask(db, ownerId, input.taskId);
    });
    return { ok: true, data: mapTaskRowToDomain(row) };
  } catch (error) { return failure(error); }
}

export function setProofTaskCompleted(ownerId: string, taskId: string, completedAt: string | null): ProofTaskResult {
  if (ownerId !== proofOwnerId) return { ok: false, error: { code: "forbidden", message: "Owner scope mismatch" } };
  try {
    const row = transaction((db) => {
      ownedTask(db, ownerId, taskId);
      const source = db.prepare("SELECT 1 FROM schedule_source_links WHERE user_id=? AND task_id=?").get(ownerId, taskId);
      if (source) throw new Error("SOURCE_FLOW_REQUIRED");
      db.prepare("UPDATE tasks SET status=?,completed_at=?,updated_at=? WHERE user_id=? AND id=?")
        .run(completedAt ? "done" : "planned", completedAt, new Date().toISOString(), ownerId, taskId);
      return ownedTask(db, ownerId, taskId);
    });
    return { ok: true, data: mapTaskRowToDomain(row) };
  } catch (error) { return failure(error); }
}

export function readProofGoalOutcome(ownerId: string, goalId: string, snapshot: ProofSnapshot): GoalOutcome | null {
  if (ownerId !== proofOwnerId) return null;
  const goal = snapshot.goals.find((entry) => entry.id === goalId);
  if (!goal) return null;
  const projects = snapshot.projects.filter((entry) => entry.goal_id === goalId);
  const projectIds = new Set(projects.map((entry) => entry.id));
  const tasks = snapshot.tasks.filter((entry) => entry.goal_id === goalId || (entry.project_id && projectIds.has(entry.project_id)));
  const outcomeTasks = tasks.map((entry) => ({
    id: entry.id, title: entry.title, status: entry.status, projectId: entry.project_id,
    plannedDate: entry.planned_date, dueAt: entry.due_at, archivedAt: entry.archived_at,
  }));
  const outcomeProjects = projects.map((entry) => ({
    id: entry.id, title: entry.title, status: entry.status, nextStep: entry.next_step,
    targetDate: entry.target_date, archivedAt: entry.archived_at,
  }));
  const summary = buildGoalOutcomeSummary({
    goalId, goalStatus: goal.status, achievedAt: goal.achieved_at,
    milestones: [], criteria: [],
  });
  return {
    goalId, goalTitle: goal.title, goalDescription: goal.description, goalWhy: goal.why,
    goalHorizon: goal.horizon, targetDate: goal.target_date, updatedAt: goal.updated_at,
    goalStatus: goal.status, achievedAt: goal.achieved_at,
    achievementNote: goal.achievement_note, milestones: [], criteria: [],
    projectSupport: [], taskSupport: [], projects: outcomeProjects, tasks: outcomeTasks,
    nextStep: deriveGoalNextStep({
      goalId, goalStatus: goal.status, dependencyGraph: snapshot.dependencyGraph,
      tasks: outcomeTasks, projects: outcomeProjects,
    }),
    milestoneHistory: [], achievementHistory: [], summary,
  } as GoalOutcome;
}

export function holdProofWriteForCrash(ownerId: string) {
  if (ownerId !== proofOwnerId) throw new Error("Proof owner mismatch");
  const marker = process.env.LIFE_OS_37_CRASH_MARKER;
  if (!marker || !resolve(marker).startsWith(safeRoot) || !marker.endsWith(".json"))
    throw new Error("Crash marker must be a fresh synthetic path");
  const db = database();
  const taskId = randomUUID();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO tasks(id,user_id,title,status,priority,created_at,updated_at)
      VALUES(?,?,'Synthetic uncommitted crash write','planned','P2',?,?)`)
      .run(taskId, ownerId, now, now);
    writeFileSync(marker, JSON.stringify({ taskId, pid: process.pid }), { flag: "wx", mode: 0o600 });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000);
    db.exec("COMMIT");
    return taskId;
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw error;
  }
}
