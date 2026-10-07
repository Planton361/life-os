import "server-only";
import type { TrainingSnapshot, MuscleGroup } from "../../domain/training";
import type { RepositoryResult } from "../../repositories/repository-result";
import type {
  ExerciseInput,
  RunningPlanInput,
  RunningPlanItemInput,
  RunningSessionInput,
  StrengthPlanInput,
  StrengthPlanItemInput,
  StrengthSessionInput,
  StrengthSetInput,
} from "../../schemas/training.schema";
import * as maps from "../../supabase/mappers/training.mapper";
import type { TableRow } from "../../supabase/database.types";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import { trainingCommand } from "../commands/training-commands";
import type { StoredRow } from "../commands/nutrition-commands";
import { numericProjection } from "./nutrition-repository";

const fail = (): RepositoryResult<never> => ({
  ok: false,
  error: {
    code: "adapter_unavailable",
    message: "Training operation rejected in the issued owner scope.",
  },
});
function projected<T>(row: StoredRow): T {
  const output = numericProjection(row);
  // These domain DTOs deliberately use bounded numbers; storage remains exact.
  for (const key of [
    "distance_km",
    "planned_distance_km",
    "target_weight_kg",
    "weight_kg",
  ])
    if (typeof output[key] === "string") output[key] = Number(output[key]);
  return output as T;
}
export function createSqliteTrainingRepository(
  store: SqliteRuntime,
  context: OwnerContext,
) {
  const owner = requireOwnerContext(context);
  function write<T>(
    user: string,
    op: string,
    input: unknown,
    project: (row: StoredRow) => T,
  ): RepositoryResult<T> {
    if (user !== owner) return fail();
    try {
      return store.command(
        context,
        ["running.session", "running.complete", "strength.complete"].includes(
          op,
        )
          ? "source.complete"
          : "training.write",
        (db) => ({
          ok: true as const,
          data: project(trainingCommand(db, owner, op, input)),
        }),
      );
    } catch {
      return fail();
    }
  }
  const runningPlan = (r: StoredRow) =>
    maps.mapRunningPlan(projected<TableRow<"running_plans">>(r));
  const runningItem = (r: StoredRow) =>
    maps.mapRunningPlanItem(projected<TableRow<"running_plan_items">>(r));
  const runningSession = (r: StoredRow) =>
    maps.mapRunningSession(projected<TableRow<"running_sessions">>(r));
  const strengthPlan = (r: StoredRow) =>
    maps.mapStrengthPlan(projected<TableRow<"strength_plans">>(r));
  const strengthItem = (r: StoredRow) =>
    maps.mapStrengthPlanItem(projected<TableRow<"strength_plan_items">>(r));
  const strengthSession = (r: StoredRow) =>
    maps.mapStrengthSession(projected<TableRow<"strength_sessions">>(r));
  const setLog = (r: StoredRow) =>
    maps.mapStrengthSetLog(projected<TableRow<"strength_set_logs">>(r));
  return {
    async saveRunningPlan(user: string, input: RunningPlanInput) {
      return write(user, "running.plan", input, runningPlan);
    },
    async addRunningPlanItem(user: string, input: RunningPlanItemInput) {
      return write(user, "running.item", input, runningItem);
    },
    async saveRunningSession(user: string, input: RunningSessionInput) {
      return write(user, "running.session", input, runningSession);
    },
    async completeRunningSession(user: string, id: string) {
      return write(user, "running.complete", { id }, runningSession);
    },
    async saveExercise(user: string, input: ExerciseInput) {
      return write(user, "exercise.save", input, (r) =>
        maps.mapExercise(projected<TableRow<"exercises">>(r), input.muscles),
      );
    },
    async saveStrengthPlan(user: string, input: StrengthPlanInput) {
      return write(user, "strength.plan", input, strengthPlan);
    },
    async addStrengthPlanItem(user: string, input: StrengthPlanItemInput) {
      return write(user, "strength.item", input, strengthItem);
    },
    async startStrengthSession(user: string, input: StrengthSessionInput) {
      return write(user, "strength.start", input, strengthSession);
    },
    async addStrengthSet(user: string, input: StrengthSetInput) {
      return write(user, "strength.set", input, setLog);
    },
    async completeStrengthSession(user: string, id: string) {
      return write(user, "strength.complete", { id }, strengthSession).ok;
    },
    async archive(
      user: string,
      table:
        | "running_plans"
        | "running_plan_items"
        | "running_sessions"
        | "exercises"
        | "strength_plans"
        | "strength_sessions",
      id: string,
    ) {
      return write(user, "archive", { id, table }, (r) => r).ok;
    },
    async getSnapshot(
      user: string,
    ): Promise<RepositoryResult<TrainingSnapshot>> {
      if (user !== owner) return fail();
      try {
        return store.read(context, (db) => {
          const all = (table: string, order: string) =>
            db
              .prepare(
                `SELECT * FROM ${table} WHERE user_id=? ORDER BY ${order}`,
              )
              .all(owner) as StoredRow[];
          const muscles = db
            .prepare(
              "SELECT exercise_id,muscle_group FROM exercise_muscles WHERE user_id=? ORDER BY created_at,id",
            )
            .all(owner) as { exercise_id: string; muscle_group: MuscleGroup }[];
          return {
            ok: true as const,
            data: {
              runningPlans: all("running_plans", "created_at DESC,id").map(
                runningPlan,
              ),
              runningPlanItems: all("running_plan_items", "sort_order,id").map(
                runningItem,
              ),
              runningSessions: all(
                "running_sessions",
                "session_date DESC,created_at DESC,id",
              ).map(runningSession),
              exercises: all("exercises", "name,id").map((r) =>
                maps.mapExercise(
                  projected<TableRow<"exercises">>(r),
                  muscles
                    .filter((m) => m.exercise_id === r.id)
                    .map((m) => m.muscle_group),
                ),
              ),
              strengthPlans: all("strength_plans", "created_at DESC,id").map(
                strengthPlan,
              ),
              strengthPlanItems: all(
                "strength_plan_items",
                "sort_order,id",
              ).map(strengthItem),
              strengthSessions: all(
                "strength_sessions",
                "session_date DESC,created_at DESC,id",
              ).map(strengthSession),
              strengthSetLogs: all(
                "strength_set_logs",
                "recorded_at DESC,id",
              ).map(setLog),
            },
          };
        });
      } catch {
        return fail();
      }
    },
  };
}
