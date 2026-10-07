import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import * as schemas from "../../schemas/training.schema";
import { runningStartInstant } from "../../domain/running-time";
import { localDate, timestamp, uuid } from "../codecs";
import { reconcileCompletedSource } from "./source-commands";
import {
  exact,
  insert,
  now,
  patch,
  row,
  validate,
  type StoredRow,
} from "./nutrition-commands";

function active(
  db: Database.Database,
  table: string,
  owner: string,
  id: string,
) {
  const result = row(db, table, owner, id);
  if (result.archived_at !== null) throw new Error("TRAINING_RECORD_INACTIVE");
  return result;
}
function activeRunningItem(db: Database.Database, owner: string, id: string) {
  const item = active(db, "running_plan_items", owner, id);
  active(db, "running_plans", owner, item.plan_id as string);
  return item;
}
export function trainingCommand(
  db: Database.Database,
  owner: string,
  operation: string,
  raw: unknown,
): StoredRow {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const original = raw as Record<string, unknown>,
    at = now();
  // Repository inputs are already domain DTOs: reverse the form schema
  // blank-to-null transform before validating that same canonical contract.
  raw = Object.fromEntries(
    Object.entries(original).map(([key, value]) => [
      key,
      value === null &&
      [
        "planId",
        "planItemId",
        "description",
        "equipment",
        "notes",
        "plannedDistanceKm",
        "plannedDurationMinutes",
        "averageHeartRate",
        "targetWeightKg",
        "weightKg",
      ].includes(key)
        ? ""
        : value,
    ]),
  );
  if (operation === "running.plan" || operation === "strength.plan") {
    const input = validate(
      operation === "running.plan"
        ? schemas.runningPlanInputSchema
        : schemas.strengthPlanInputSchema,
      raw,
    );
    const table =
      operation === "running.plan" ? "running_plans" : "strength_plans";
    const values = { name: input.name, goal: input.goal, updated_at: at };
    return input.planId
      ? patch(db, table, owner, input.planId, values)
      : insert(db, table, owner, {
          id: randomUUID(),
          user_id: owner,
          created_at: at,
          ...values,
        });
  }
  if (operation === "running.item") {
    const input = validate(schemas.runningPlanItemInputSchema, raw);
    active(db, "running_plans", owner, input.planId);
    if (
      input.itemId &&
      active(db, "running_plan_items", owner, input.itemId).plan_id !==
        input.planId
    )
      throw new Error("PLAN_CONTEXT_MISMATCH");
    const values = {
      plan_id: input.planId,
      title: input.title,
      planned_distance_km: exact(original.plannedDistanceKm, 8, 3),
      planned_duration_minutes: input.plannedDurationMinutes,
      sort_order: input.sortOrder,
      updated_at: at,
    };
    return input.itemId
      ? patch(db, "running_plan_items", owner, input.itemId, values)
      : insert(db, "running_plan_items", owner, {
          id: randomUUID(),
          user_id: owner,
          created_at: at,
          ...values,
        });
  }
  if (operation === "running.session") {
    const input = validate(schemas.runningSessionInputSchema, raw);
    if (input.planItemId) activeRunningItem(db, owner, input.planItemId);
    const existing = input.sessionId
      ? active(db, "running_sessions", owner, input.sessionId)
      : null;
    const start = input.startTime
      ? runningStartInstant(input.sessionDate, input.startTime)
      : null;
    if (input.startTime && !start)
      throw new Error("LOCAL_START_DOES_NOT_EXIST");
    const values: StoredRow = {
      plan_item_id: input.planItemId,
      session_date: localDate(input.sessionDate),
      started_at: start ? timestamp(start) : null,
      distance_km: exact(original.distanceKm, 8, 3),
      duration_minutes: input.durationMinutes,
      average_heart_rate: input.averageHeartRate,
      notes: input.notes,
      status: "completed",
      completed_at: existing?.completed_at ?? at,
      updated_at: at,
    };
    const session = existing
      ? patch(db, "running_sessions", owner, input.sessionId!, values)
      : insert(db, "running_sessions", owner, {
          id: randomUUID(),
          user_id: owner,
          created_at: at,
          ...values,
        });
    if (input.planItemId)
      reconcileCompletedSource(
        db,
        owner,
        "running_plan_item",
        input.planItemId,
        session.completed_at as string,
      );
    return session;
  }
  if (operation === "exercise.save") {
    const input = validate(schemas.exerciseInputSchema, raw);
    const values = {
      name: input.name,
      description: input.description,
      equipment: input.equipment,
      updated_at: at,
    };
    const exercise = input.exerciseId
      ? patch(db, "exercises", owner, input.exerciseId, values)
      : insert(db, "exercises", owner, {
          id: randomUUID(),
          user_id: owner,
          created_at: at,
          ...values,
        });
    db.prepare(
      "DELETE FROM exercise_muscles WHERE user_id=? AND exercise_id=?",
    ).run(owner, exercise.id);
    for (const muscle of input.muscles)
      db.prepare(
        "INSERT INTO exercise_muscles(id,user_id,exercise_id,muscle_group,created_at) VALUES(?,?,?,?,?)",
      ).run(randomUUID(), owner, exercise.id, muscle, at);
    return exercise;
  }
  if (operation === "strength.item") {
    const input = validate(schemas.strengthPlanItemInputSchema, raw);
    active(db, "strength_plans", owner, input.planId);
    active(db, "exercises", owner, input.exerciseId);
    if (
      input.itemId &&
      row(db, "strength_plan_items", owner, input.itemId).plan_id !==
        input.planId
    )
      throw new Error("PLAN_CONTEXT_MISMATCH");
    const values = {
      plan_id: input.planId,
      exercise_id: input.exerciseId,
      sort_order: input.sortOrder,
      target_sets: input.targetSets,
      target_reps: input.targetReps,
      target_weight_kg: exact(original.targetWeightKg, 8, 3),
      updated_at: at,
    };
    return input.itemId
      ? patch(db, "strength_plan_items", owner, input.itemId, values)
      : insert(db, "strength_plan_items", owner, {
          id: randomUUID(),
          user_id: owner,
          created_at: at,
          ...values,
        });
  }
  if (operation === "strength.start") {
    const input = validate(schemas.strengthSessionInputSchema, raw);
    if (input.planId) active(db, "strength_plans", owner, input.planId);
    return insert(db, "strength_sessions", owner, {
      id: randomUUID(),
      user_id: owner,
      plan_id: input.planId,
      session_date: localDate(input.sessionDate),
      started_at: at,
      status: "in_progress",
      notes: input.notes,
      created_at: at,
      updated_at: at,
    });
  }
  if (operation === "strength.set") {
    const input = validate(schemas.strengthSetInputSchema, raw);
    active(db, "strength_sessions", owner, input.sessionId);
    row(db, "exercises", owner, input.exerciseId);
    return insert(db, "strength_set_logs", owner, {
      id: randomUUID(),
      user_id: owner,
      session_id: input.sessionId,
      exercise_id: input.exerciseId,
      set_order: input.setOrder,
      repetitions: input.repetitions,
      weight_kg: exact(original.weightKg, 8, 3),
      notes: input.notes,
      recorded_at: at,
    });
  }
  if (operation === "strength.complete" || operation === "running.complete") {
    const input = validate(schemas.trainingIdInputSchema, raw),
      strength = operation === "strength.complete",
      table = strength ? "strength_sessions" : "running_sessions";
    const existing = active(db, table, owner, input.id);
    if (
      strength &&
      !db
        .prepare(
          "SELECT id FROM strength_set_logs WHERE user_id=? AND session_id=?",
        )
        .get(owner, input.id)
    )
      throw new Error("REAL_SET_REQUIRED");
    if (!strength && existing.plan_item_id)
      activeRunningItem(db, owner, existing.plan_item_id as string);
    const session = patch(db, table, owner, input.id, {
      status: "completed",
      completed_at: existing.completed_at ?? at,
      updated_at: existing.status === "completed" ? existing.updated_at : at,
    });
    const source = strength ? session.plan_id : session.plan_item_id;
    if (source)
      reconcileCompletedSource(
        db,
        owner,
        strength ? "strength_plan" : "running_plan_item",
        source as string,
        session.completed_at as string,
      );
    return session;
  }
  if (operation === "archive") {
    const input = validate(schemas.trainingIdInputSchema, raw);
    const table = original.table;
    if (
      typeof table !== "string" ||
      ![
        "running_plans",
        "running_plan_items",
        "running_sessions",
        "exercises",
        "strength_plans",
        "strength_sessions",
      ].includes(table)
    )
      throw new Error("ARCHIVE_TABLE_INVALID");
    active(db, table, owner, uuid(input.id));
    return patch(db, table, owner, input.id, {
      archived_at: at,
      updated_at: at,
    });
  }
  throw new Error("TRAINING_OPERATION_INVALID");
}
