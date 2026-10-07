import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createGoalInputSchema,
  updateGoalInputSchema,
} from "../../schemas/goal.schemas";
import {
  createProjectInputSchema,
  updateProjectInputSchema,
} from "../../schemas/project.schemas";
import {
  upsertDailyLogInputSchema,
  closeDailyLogInputSchema,
} from "../../schemas/daily-log.schemas";
import { projectMilestoneInputSchema } from "../../schemas/project-milestone.schemas";
import {
  mapCreateGoalInputToInsert,
  mapUpdateGoalInputToPatch,
} from "../../supabase/mappers/goal.mapper";
import {
  mapCreateProjectInputToInsert,
  mapUpdateProjectInputToPatch,
} from "../../supabase/mappers/project.mapper";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import { taskDependencyInputSchema } from "../../schemas/task-dependency.schemas";
import { taskDependencyGraphSchema } from "../../domain/task-dependencies";
import { localDate, timezone } from "../codecs";
import type { SqliteRuntime } from "../runtime";
import {
  row,
  insert,
  patch,
  now,
  validate,
  type StoredRow,
} from "../commands/nutrition-commands";

// Base canonical capture/metadata and retained planning records. Terminal Goal
// and Project truth stays with their previously accepted command boundaries.
export function createSqliteCanonicalBaseRepository(
  store: SqliteRuntime,
  context: OwnerContext,
) {
  const owner = requireOwnerContext(context);
  const scoped = (input: { userId: string; profileId: string }) => {
    if (input.userId !== owner || input.profileId !== owner)
      throw new Error("OWNER_DENIED");
  };
  const active = (
    db: Parameters<Parameters<SqliteRuntime["command"]>[2]>[0],
    table: string,
    id: string,
  ) => {
    const value = row(db, table, owner, id);
    if (value.archived_at !== null) throw new Error("ACTIVE_RECORD_REQUIRED");
    return value;
  };
  const baseRead = (
    user: string,
    table:
      | "areas"
      | "goals"
      | "projects"
      | "daily_logs"
      | "daily_log_tasks"
      | "project_milestones",
  ) => {
    if (user !== owner) throw new Error("OWNER_DENIED");
    table = z
      .enum([
        "areas",
        "goals",
        "projects",
        "daily_logs",
        "daily_log_tasks",
        "project_milestones",
      ])
      .parse(table);
    return store.read(
      context,
      (db) =>
        db
          .prepare(`SELECT * FROM ${table} WHERE user_id=? ORDER BY id`)
          .all(owner) as StoredRow[],
    );
  };
  return {
    read: baseRead,
    dependencies(user: string) {
      if (user !== owner) throw new Error("OWNER_DENIED");
      return store.read(context, (db) =>
        taskDependencyGraphSchema.parse({
          tasks: db
            .prepare(
              "SELECT id,title,project_id,status,completed_at,archived_at FROM tasks WHERE user_id=? ORDER BY id",
            )
            .all(owner),
          dependencies: db
            .prepare(
              "SELECT id,predecessor_task_id,successor_task_id FROM task_dependencies WHERE user_id=? ORDER BY id",
            )
            .all(owner),
        }),
      );
    },
    dependency(user: string, input: unknown) {
      if (user !== owner) throw new Error("OWNER_DENIED");
      const p = validate(taskDependencyInputSchema, input);
      return store.command(context, "task.dependency", (db) => {
        row(db, "tasks", owner, p.taskId);
        if (p.operation === "remove") {
          const edge = row(db, "task_dependencies", owner, p.dependencyId);
          if (edge.successor_task_id !== p.taskId)
            throw new Error("DEPENDENCY_TASK_DENIED");
          db.prepare(
            "DELETE FROM task_dependencies WHERE user_id=? AND id=?",
          ).run(owner, edge.id);
          return edge.id;
        }
        active(db, "tasks", p.taskId);
        const prior = db
          .prepare(
            "SELECT id FROM task_dependencies WHERE user_id=? AND predecessor_task_id=? AND successor_task_id=?",
          )
          .get(owner, p.predecessorId, p.taskId) as { id: string } | undefined;
        if (prior) throw new Error("DEPENDENCY_DUPLICATE");
        return insert(db, "task_dependencies", owner, {
          id: randomUUID(),
          user_id: owner,
          project_id: p.projectId,
          predecessor_task_id: p.predecessorId,
          successor_task_id: p.taskId,
          created_at: now(),
        }).id;
      });
    },
    activeEntities(user: string, table: "goals" | "projects" | "areas") {
      if (user !== owner) throw new Error("OWNER_DENIED");
      return store.read(
        context,
        (db) =>
          db
            .prepare(
              `SELECT * FROM ${table} WHERE user_id=? AND archived_at IS NULL ORDER BY ${table === "areas" ? "sort_order" : "updated_at DESC"},id`,
            )
            .all(owner) as StoredRow[],
      );
    },
    profile(user: string) {
      if (user !== owner) throw new Error("OWNER_DENIED");
      return store.read(context, (db) =>
        db.prepare("SELECT * FROM profiles WHERE id=?").get(owner),
      );
    },
    goal(input: Record<string, unknown>, update = false) {
      const p = validate(
        update ? updateGoalInputSchema : createGoalInputSchema,
        input,
      );
      scoped(p);
      return store.command(context, "goal.metadata", (db) => {
        if (p.areaId) active(db, "areas", p.areaId);
        if ("goalId" in p) {
          active(db, "goals", p.goalId);
          return patch(db, "goals", owner, p.goalId, {
            ...mapUpdateGoalInputToPatch(p),
            updated_at: now(),
          } as StoredRow);
        }
        return insert(db, "goals", owner, {
          id: randomUUID(),
          ...mapCreateGoalInputToInsert(p, owner),
          created_at: now(),
          updated_at: now(),
        } as StoredRow);
      });
    },
    project(input: Record<string, unknown>, update = false) {
      const p = validate(
        update ? updateProjectInputSchema : createProjectInputSchema,
        input,
      );
      scoped(p);
      return store.command(context, "project.capture", (db) => {
        if (p.areaId) active(db, "areas", p.areaId);
        if (p.goalId) active(db, "goals", p.goalId);
        if ("projectId" in p) {
          const project = active(db, "projects", p.projectId);
          if (p.status !== undefined)
            throw new Error("PROJECT_LIFECYCLE_COMMAND_REQUIRED");
          if (
            p.goalId !== undefined &&
            p.goalId !== null &&
            project.goal_id !== p.goalId &&
            db
              .prepare(
                "SELECT 1 FROM tasks WHERE user_id=? AND project_id=? AND archived_at IS NULL AND goal_id IS NOT NULL AND goal_id<>? LIMIT 1",
              )
              .get(owner, p.projectId, p.goalId)
          )
            throw new Error("PROJECT_TASK_GOAL_CONFLICT");
          return patch(db, "projects", owner, p.projectId, {
            ...mapUpdateProjectInputToPatch(p),
            updated_at: now(),
          } as StoredRow);
        }
        return insert(db, "projects", owner, {
          id: randomUUID(),
          ...mapCreateProjectInputToInsert(p, owner),
          created_at: now(),
          updated_at: now(),
        } as StoredRow);
      });
    },
    daily(input: Record<string, unknown>) {
      const p = validate(upsertDailyLogInputSchema, input);
      scoped(p);
      return store.command(context, "daily.save", (db) => {
        const old = db
          .prepare(
            "SELECT * FROM daily_logs WHERE user_id=? AND local_date=? AND archived_at IS NULL",
          )
          .get(owner, p.localDate) as StoredRow | undefined;
        const values: StoredRow = {
          local_date: p.localDate,
          timezone: timezone(p.timezone),
          status: p.status ?? "open",
          opening_note: p.openingNote ?? null,
          closing_note: p.closingNote ?? null,
          carry_forward_note: p.carryForwardNote ?? null,
          energy: p.energy ?? null,
          mood: p.mood ?? null,
          updated_at: now(),
        };
        return old
          ? patch(db, "daily_logs", owner, String(old.id), values)
          : insert(db, "daily_logs", owner, {
              ...values,
              id: randomUUID(),
              user_id: owner,
              created_at: now(),
            });
      });
    },
    closeDaily(input: Record<string, unknown>) {
      const p = validate(closeDailyLogInputSchema, input);
      scoped(p);
      return store.command(context, "daily.close", (db) => {
        active(db, "daily_logs", p.dailyLogId);
        return patch(db, "daily_logs", owner, p.dailyLogId, {
          status: "closed",
          closing_note: p.closingNote ?? null,
          carry_forward_note: p.carryForwardNote ?? null,
          updated_at: now(),
        });
      });
    },
    day(user: string, date: string) {
      if (user !== owner) throw new Error("OWNER_DENIED");
      return store.read(context, (db) =>
        db
          .prepare(
            "SELECT * FROM daily_logs WHERE user_id=? AND local_date=? AND archived_at IS NULL",
          )
          .get(owner, localDate(date)),
      );
    },
    linkDaily(input: unknown) {
      const p = validate(
        z.object({
          userId: z.string().uuid(),
          profileId: z.string().uuid(),
          dailyLogId: z.string().uuid(),
          taskId: z.string().uuid(),
          role: z.enum([
            "planned",
            "completed",
            "carried_forward",
            "skipped",
            "note",
          ]),
          note: z.string().optional(),
        }),
        input,
      );
      scoped(p);
      return store.command(context, "daily.link", (db) => {
        active(db, "daily_logs", p.dailyLogId);
        active(db, "tasks", p.taskId);
        return (
          (db
            .prepare(
              "SELECT * FROM daily_log_tasks WHERE user_id=? AND daily_log_id=? AND task_id=? AND relation_type=?",
            )
            .get(owner, p.dailyLogId, p.taskId, p.role) as
            | StoredRow
            | undefined) ??
          insert(db, "daily_log_tasks", owner, {
            id: randomUUID(),
            user_id: owner,
            daily_log_id: p.dailyLogId,
            task_id: p.taskId,
            relation_type: p.role,
            note: p.note ?? null,
            created_at: now(),
          })
        );
      });
    },
    milestone(user: string, input: unknown) {
      if (user !== owner) throw new Error("OWNER_DENIED");
      const p = validate(projectMilestoneInputSchema, input);
      return store.command(context, "project.milestone", (db) => {
        const project = row(db, "projects", owner, p.projectId);
        if (
          !(p.operation === "assign" && p.milestoneId === null) &&
          project.archived_at !== null
        )
          throw new Error("PROJECT_UNAVAILABLE");
        const milestone = p.milestoneId
          ? active(db, "project_milestones", p.milestoneId)
          : undefined;
        if (milestone && milestone.project_id !== p.projectId)
          throw new Error("MILESTONE_PROJECT_DENIED");
        if (p.operation === "assign") {
          const task = active(db, "tasks", p.taskId!);
          if (task.project_id !== p.projectId)
            throw new Error("TASK_PROJECT_DENIED");
          patch(db, "tasks", owner, p.taskId!, {
            milestone_id: p.milestoneId,
            updated_at: now(),
          });
          return p.milestoneId;
        }
        if (p.operation === "save") {
          if (p.status === "active")
            db.prepare(
              "UPDATE project_milestones SET status='open',updated_at=? WHERE user_id=? AND project_id=? AND archived_at IS NULL AND status='active' AND id IS NOT ?",
            ).run(now(), owner, p.projectId, p.milestoneId);
          const values = {
            title: p.title,
            description: p.description || null,
            status: p.status,
            target_date: p.targetDate,
            updated_at: now(),
          };
          if (milestone)
            return patch(
              db,
              "project_milestones",
              owner,
              String(milestone.id),
              values,
            ).id;
          const order = db
            .prepare(
              "SELECT COALESCE(MAX(sort_order),-1)+1 n FROM project_milestones WHERE user_id=? AND project_id=?",
            )
            .get(owner, p.projectId) as { n: bigint };
          return insert(db, "project_milestones", owner, {
            ...values,
            id: randomUUID(),
            user_id: owner,
            project_id: p.projectId,
            sort_order: order.n,
            created_at: now(),
          }).id;
        }
        if (!milestone) throw new Error("MILESTONE_REQUIRED");
        if (p.operation === "archive") {
          patch(db, "project_milestones", owner, String(milestone.id), {
            archived_at: now(),
            updated_at: now(),
          });
          return milestone.id;
        }
        const other = db
          .prepare(
            `SELECT * FROM project_milestones WHERE user_id=? AND project_id=? AND archived_at IS NULL AND (status='done')=? AND (sort_order,id)${p.operation === "up" ? "<" : ">"}(?,?) ORDER BY sort_order ${p.operation === "up" ? "DESC" : "ASC"},id ${p.operation === "up" ? "DESC" : "ASC"} LIMIT 1`,
          )
          .get(
            owner,
            p.projectId,
            milestone.status === "done" ? 1 : 0,
            milestone.sort_order,
            milestone.id,
          ) as StoredRow | undefined;
        if (other) {
          const spare = (
            db
              .prepare(
                "SELECT MAX(sort_order)+1 n FROM project_milestones WHERE user_id=? AND project_id=?",
              )
              .get(owner, p.projectId) as { n: bigint }
          ).n;
          patch(db, "project_milestones", owner, String(milestone.id), {
            sort_order: spare,
          });
          patch(db, "project_milestones", owner, String(other.id), {
            sort_order: milestone.sort_order,
            updated_at: now(),
          });
          patch(db, "project_milestones", owner, String(milestone.id), {
            sort_order: other.sort_order,
            updated_at: now(),
          });
        }
        return milestone.id;
      });
    },
  };
}
