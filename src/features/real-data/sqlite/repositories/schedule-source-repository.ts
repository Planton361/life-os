import "server-only";
import type { ScheduleSourceInput } from "../../schemas/schedule-source.schema";
import type { ScheduleSourceLinkRow } from "../../supabase/repositories/supabase-schedule-source-repository";
import type { SupabaseQueryResult } from "../../supabase/database.types";
import type { TaskRow, MealRow } from "../../supabase/row-types";
import { safeNumber } from "../codecs";
import type Database from "better-sqlite3";
import type { SqliteRuntime } from "../runtime";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import {
  completeLinkedMeal,
  completeLinkedTask,
  scheduleLinkedSource,
  unscheduleLinkedMeal,
} from "../commands/source-commands";

const taskRow = (row: TaskRow): TaskRow => ({
  ...row,
  duration_minutes:
    typeof row.duration_minutes === "bigint"
      ? safeNumber(row.duration_minutes)
      : row.duration_minutes,
});
const mealRow = (row: MealRow): MealRow => ({
  ...row,
  servings: Number(row.servings),
});

// Same repository result contract as the existing source-aware action boundary.
export function createSqliteScheduleSourceRepository(
  store: SqliteRuntime,
  context: OwnerContext,
) {
  const owner = requireOwnerContext(context);
  function command<T>(
    kind: string,
    operation: (db: Database.Database) => T,
  ): SupabaseQueryResult<T> {
    try {
      return { data: store.command(context, kind, operation), error: null };
    } catch {
      return {
        data: null,
        error: { message: "Source operation denied or unavailable." },
      };
    }
  }
  return {
    async schedule(input: ScheduleSourceInput) {
      return command("source.schedule", (db) =>
        taskRow(
          scheduleLinkedSource(
            db,
            owner,
            input.sourceType,
            input.sourceId,
            input.plannedDate,
            input.scheduledStartAt,
            input.durationMinutes,
          ),
        ),
      );
    },
    async getLinks(
      userId: string,
    ): Promise<SupabaseQueryResult<readonly ScheduleSourceLinkRow[]>> {
      if (userId !== owner)
        return { data: null, error: { message: "Owner scope denied." } };
      try {
        return {
          data: store.read(
            context,
            (db) =>
              db
                .prepare(
                  "SELECT user_id,source_type,source_id,task_id FROM schedule_source_links WHERE user_id=? ORDER BY created_at,id",
                )
                .all(owner) as ScheduleSourceLinkRow[],
          ),
          error: null,
        };
      } catch {
        return { data: null, error: { message: "Owner scope denied." } };
      }
    },
    async completeLinkedTask(taskId: string, completedAt: string) {
      return command("source.complete", (db) =>
        taskRow(completeLinkedTask(db, owner, taskId, completedAt)),
      );
    },
    async completeLinkedMeal(mealId: string, completedAt: string) {
      return command("source.complete", (db) =>
        mealRow(completeLinkedMeal(db, owner, mealId, completedAt)),
      );
    },
    async unscheduleLinkedMeal(
      taskId: string,
      plannedDate?: string,
      durationMinutes?: number,
    ) {
      return command("source.unschedule", (db) =>
        taskRow(
          unscheduleLinkedMeal(db, owner, taskId, plannedDate, durationMinutes),
        ),
      );
    },
  };
}
