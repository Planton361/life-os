import "server-only";
import { randomUUID } from "node:crypto";
import { taskStepCreateSchema, taskStepUpdateSchema, taskStepArchiveSchema } from "../../schemas/task-step.schemas";
import type { OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import { safeNumber, uuid } from "../codecs";

type StepRow = { id: string; task_id: string; title: string; position: bigint; completed_at: string | null; created_at: string; updated_at: string };

// Same validated write contract as the canonical repository. Completion and
// position edits are independent of the Task's lifecycle and retain identity.
export function createSqliteTaskStepRepository(store: SqliteRuntime, context: OwnerContext) {
  return {
    write(operation: "create" | "update" | "archive", input: unknown): boolean {
      const schema = operation === "create" ? taskStepCreateSchema : operation === "update" ? taskStepUpdateSchema : taskStepArchiveSchema;
      const parsed = schema.safeParse(input);
      if (!parsed.success) return false;
      try { return store.command(context, `step.${operation}`, (db, owner) => {
        const data = parsed.data, task = uuid(data.taskId);
        if (!db.prepare("SELECT id FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL").get(owner, task)) throw new Error("STEP_PARENT_UNAVAILABLE");
        if (operation === "create" && "title" in data) {
          db.prepare("INSERT INTO task_steps(id,user_id,task_id,title,position,created_at,updated_at) VALUES(?,?,?,?,?,life_now(),life_now())")
            .run(randomUUID(), owner, task, data.title, data.position);
          return true;
        }
        if (!("stepId" in data)) throw new Error("STEP_INVALID");
        const step = uuid(data.stepId);
        if (operation === "archive") return db.prepare("UPDATE task_steps SET archived_at=life_now(),updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND task_id=? AND id=? AND archived_at IS NULL").run(owner, task, step).changes > 0;
        const update = taskStepUpdateSchema.safeParse(input);
        if (!update.success) throw new Error("STEP_INVALID");
        return db.prepare("UPDATE task_steps SET title=?,position=?,completed_at=CASE WHEN ? THEN coalesce(completed_at,life_now()) ELSE NULL END,updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND task_id=? AND id=? AND archived_at IS NULL")
          .run(update.data.title, update.data.position, Number(update.data.completed), owner, task, step).changes > 0;
      }); } catch { return false; }
    },
    read(taskId: string) {
      return store.read(context, (db, owner) => {
        const rows = db.prepare("SELECT s.* FROM task_steps s JOIN tasks t ON t.id=s.task_id AND t.user_id=s.user_id WHERE s.user_id=? AND s.task_id=? AND s.archived_at IS NULL AND t.archived_at IS NULL ORDER BY s.position,s.created_at,s.id").all(owner, uuid(taskId)) as StepRow[];
        return rows.map(row => ({ ...row, position: safeNumber(row.position) }));
      });
    },
  };
}
