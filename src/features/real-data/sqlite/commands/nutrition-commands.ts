import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as schemas from "../../schemas/nutrition.schema";
import {
  decimal,
  decimalFromNumber,
  compareDecimals,
  numeric,
  localDate,
  timestamp,
  uuid,
} from "../codecs";
import {
  completeLinkedMeal,
  scheduleLinkedSource,
  unscheduleLinkedMeal,
} from "./source-commands";

type Value = string | number | bigint | null;
export type StoredRow = Record<string, Value>;
export function now() {
  return timestamp(new Date().toISOString());
}
export function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("INPUT_INVALID");
  return parsed.data;
}
export function row(
  db: Database.Database,
  table: string,
  owner: string,
  id: string,
): StoredRow {
  const found = db
    .prepare(`SELECT * FROM ${table} WHERE user_id=? AND id=?`)
    .get(owner, uuid(id)) as StoredRow | undefined;
  if (!found) throw new Error("OWNED_RECORD_UNAVAILABLE");
  return found;
}
export function insert(
  db: Database.Database,
  table: string,
  owner: string,
  values: StoredRow,
): StoredRow {
  const keys = Object.keys(values);
  db.prepare(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
  ).run(...Object.values(values));
  return row(db, table, owner, values.id as string);
}
export function patch(
  db: Database.Database,
  table: string,
  owner: string,
  id: string,
  values: StoredRow,
): StoredRow {
  const existing = row(db, table, owner, id);
  if (
    values.updated_at &&
    values.updated_at === existing.updated_at &&
    Object.entries(values).some(
      ([key, value]) => key !== "updated_at" && value !== existing[key],
    )
  )
    values = {
      ...values,
      updated_at: (
        db
          .prepare("SELECT next_timestamp(?,?) at")
          .get(existing.updated_at, values.updated_at) as { at: string }
      ).at,
    };
  if (Object.keys(values).length)
    db.prepare(
      `UPDATE ${table} SET ${Object.keys(values)
        .map((k) => `${k}=?`)
        .join(",")} WHERE user_id=? AND id=?`,
    ).run(...Object.values(values), owner, uuid(id));
  return row(db, table, owner, id);
}
function exactDecimalText(value: string): string {
  const parts =
    /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(
      value.trim(),
    );
  if (!parts) throw new Error("INVALID_DECIMAL");
  const whole = parts[2] ?? "0",
    fraction = parts[3] ?? parts[4] ?? "",
    exponent = Number(parts[5] ?? "0");
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 131072)
    throw new Error("DECIMAL_OVERFLOW");
  const digits = whole + fraction,
    point = whole.length + exponent;
  const expanded =
    point <= 0
      ? `0.${"0".repeat(-point)}${digits}`
      : point >= digits.length
        ? digits + "0".repeat(point - digits.length)
        : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return decimal(parts[1] + expanded);
}
export function exact(
  value: unknown,
  precision?: number,
  scale?: number,
): string | null {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  )
    return null;
  const result =
    typeof value === "string"
      ? exactDecimalText(value)
      : decimalFromNumber(value as number);
  if (
    result.includes("Infinity") ||
    result === "NaN" ||
    compareDecimals(result, "0") <= 0
  )
    throw new Error("POSITIVE_FINITE_DECIMAL_REQUIRED");
  return precision === undefined ? result : numeric(result, precision, scale!);
}
function transaction(db: Database.Database) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
}
function activeRecipe(db: Database.Database, owner: string, id: string) {
  const recipe = row(db, "recipes", owner, id);
  if (recipe.is_archived !== BigInt(0)) throw new Error("RECIPE_INACTIVE");
  return recipe;
}
function area(db: Database.Database, owner: string, id?: string) {
  if (id && row(db, "areas", owner, id).archived_at !== null)
    throw new Error("AREA_INACTIVE");
}
export function nutritionCommand(
  db: Database.Database,
  owner: string,
  operation: string,
  raw: unknown,
): StoredRow | null {
  transaction(db);
  const original = raw as Record<string, unknown>;
  const created = now();
  if (operation === "recipe.create" || operation === "recipe.update") {
    const input = validate(
      operation === "recipe.create"
        ? schemas.recipeCreateInputSchema
        : schemas.recipeUpdateInputSchema,
      raw,
    ) as schemas.RecipeUpdateInput;
    area(db, owner, input.areaId);
    const values: StoredRow = { updated_at: created };
    const fields = {
      areaId: "area_id",
      title: "title",
      summary: "summary",
      instructions: "instructions",
      servings: "servings",
      prepMinutes: "prep_minutes",
      source: "source",
    } as const;
    for (const [key, column] of Object.entries(fields))
      if (input[key as keyof typeof fields] !== undefined)
        values[column] = input[key as keyof typeof fields]!;
    if (input.tags !== undefined) values.tags = JSON.stringify(input.tags);
    if (input.nutritionEstimate !== undefined)
      values.nutrition_estimate = JSON.stringify(input.nutritionEstimate);
    return operation === "recipe.create"
      ? insert(db, "recipes", owner, {
          id: randomUUID(),
          user_id: owner,
          created_at: created,
          ...values,
        })
      : patch(db, "recipes", owner, input.recipeId, values);
  }
  if (operation === "recipe.archive") {
    const input = validate(schemas.recipeArchiveInputSchema, raw);
    return patch(db, "recipes", owner, input.recipeId, {
      is_archived: 1,
      updated_at: created,
    });
  }
  if (operation.startsWith("ingredient.")) {
    const input = validate(
      operation === "ingredient.create"
        ? schemas.recipeIngredientCreateInputSchema
        : operation === "ingredient.update"
          ? schemas.recipeIngredientUpdateInputSchema
          : schemas.recipeIngredientDeleteInputSchema,
      raw,
    ) as schemas.RecipeIngredientUpdateInput;
    const existing =
      operation === "ingredient.create"
        ? null
        : row(db, "recipe_ingredients", owner, input.ingredientId);
    if (existing && input.recipeId && existing.recipe_id !== input.recipeId)
      throw new Error("RECIPE_CONTEXT_MISMATCH");
    if (operation === "ingredient.delete") {
      db.prepare("DELETE FROM recipe_ingredients WHERE user_id=? AND id=?").run(
        owner,
        input.ingredientId,
      );
      return existing;
    }
    const recipeId = (existing?.recipe_id ?? input.recipeId) as string;
    activeRecipe(db, owner, recipeId);
    const values: StoredRow = { updated_at: created };
    for (const key of ["name", "note", "unit", "position"] as const)
      if (input[key] !== undefined) values[key] = input[key]!;
    if (input.quantity !== undefined)
      values.quantity = exact(original.quantity);
    return existing
      ? patch(db, "recipe_ingredients", owner, input.ingredientId, values)
      : insert(db, "recipe_ingredients", owner, {
          id: randomUUID(),
          user_id: owner,
          recipe_id: recipeId,
          created_at: created,
          ...values,
        });
  }
  if (operation === "meal.complete") {
    const input = validate(schemas.mealCompleteInputSchema, raw);
    completeLinkedMeal(db, owner, input.mealId, input.completedAt ?? created);
    return row(db, "meals", owner, input.mealId);
  }
  if (operation === "meal.create" || operation === "meal.update") {
    const input = validate(
      operation === "meal.create"
        ? schemas.mealCreateInputSchema
        : schemas.mealUpdateInputSchema,
      raw,
    ) as schemas.MealUpdateInput & { requestId: string };
    if (input.recipeId) activeRecipe(db, owner, input.recipeId);
    const id = operation === "meal.create" ? input.requestId : input.mealId;
    if (operation === "meal.create") {
      const previous = db
        .prepare("SELECT * FROM meals WHERE user_id=? AND id=?")
        .get(owner, uuid(id)) as StoredRow | undefined;
      if (previous) return previous;
    }
    const values: StoredRow = { updated_at: created };
    for (const [key, column] of Object.entries({
      date: "date",
      mealType: "meal_type",
      title: "title",
      notes: "notes",
      recipeId: "recipe_id",
    }))
      if (input[key as keyof schemas.MealUpdateInput] !== undefined)
        values[column] = input[key as keyof schemas.MealUpdateInput] as Value;
    for (const [key, column] of [
      ["plannedAt", "planned_at"],
      ["completedAt", "completed_at"],
    ] as const)
      if (input[key] !== undefined)
        values[column] = input[key] ? timestamp(input[key]!) : null;
    if (input.date) localDate(input.date);
    if (input.servings !== undefined)
      values.servings = exact(original.servings, 8, 2);
    return operation === "meal.create"
      ? insert(db, "meals", owner, {
          id: uuid(id),
          user_id: owner,
          created_at: created,
          ...values,
        })
      : patch(db, "meals", owner, id, values);
  }
  throw new Error("NUTRITION_OPERATION_INVALID");
}

// PostgreSQL AT TIME ZONE picks the standard offset for gaps/repeated hours.
// Preserve the complete local clock (including seconds/microseconds), unlike
// Running's deliberate rejection of nonexistent local start times.
export function moveMealInstant(
  value: string,
  date: string,
  zone: string,
): string {
  localDate(date);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const clock = formatter.format(new Date(value)).split(" ")[1];
  const wall = Date.parse(`${date}T${clock}Z`),
    candidates: number[] = [],
    offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const sample = wall + delta;
    const offset =
      Date.parse(formatter.format(new Date(sample)).replace(" ", "T") + "Z") -
      sample;
    offsets.add(offset);
    const instant = wall - offset;
    if (formatter.format(new Date(instant)) === `${date} ${clock}`)
      candidates.push(instant);
  }
  const instant = candidates.length
    ? Math.max(...candidates)
    : wall - Math.min(...offsets);
  return timestamp(new Date(instant).toISOString()).replace(
    /\.\d{6}Z$/,
    timestamp(value).slice(19),
  );
}
export function applyNutritionPlan(
  db: Database.Database,
  owner: string,
  raw: unknown,
): void {
  transaction(db);
  const operations = validate(schemas.nutritionPlanInputSchema, raw),
    created = now();
  const profile = db
    .prepare("SELECT timezone FROM profiles WHERE id=?")
    .get(owner) as { timezone: string | null };
  for (const op of operations) {
    let meal: StoredRow | undefined;
    if (op.kind !== "assign") {
      meal = row(db, "meals", owner, op.id);
      if (meal.completed_at !== null) throw new Error("MEAL_COMPLETED");
      if (timestamp(op.expectedUpdatedAt) !== meal.updated_at)
        throw new Error("STALE_MEAL");
    }
    const link = db
      .prepare(
        "SELECT t.* FROM tasks t JOIN schedule_source_links l ON l.task_id=t.id AND l.user_id=t.user_id WHERE l.user_id=? AND l.source_type='meal' AND l.source_id=?",
      )
      .get(owner, op.id) as StoredRow | undefined;
    if (op.kind === "remove") {
      if (link) {
        // Remove tuple first within the same transaction; generic Task guards
        // remain closed and a later failure rolls back the complete removal.
        db.prepare(
          "DELETE FROM schedule_source_links WHERE user_id=? AND source_type='meal' AND source_id=?",
        ).run(owner, op.id);
        patch(db, "tasks", owner, link.id as string, {
          status: "archived",
          archived_at: created,
          updated_at: created,
        });
      }
      db.prepare("DELETE FROM meals WHERE user_id=? AND id=?").run(
        owner,
        op.id,
      );
      continue;
    }
    if (
      db
        .prepare(
          "SELECT id FROM meals WHERE user_id=? AND date=? AND meal_type=? AND id<>?",
        )
        .get(owner, op.date, op.mealType, op.id)
    )
      throw new Error("OCCUPIED_SLOT");
    if (op.kind === "assign") {
      const recipe = activeRecipe(db, owner, op.recipeId);
      insert(db, "meals", owner, {
        id: op.id,
        user_id: owner,
        recipe_id: op.recipeId,
        title: recipe.title,
        date: op.date,
        meal_type: op.mealType,
        servings: "1",
        created_at: created,
        updated_at: created,
      });
    } else {
      const instant = meal!.planned_at
        ? moveMealInstant(
            meal!.planned_at as string,
            op.date,
            profile.timezone ?? "Europe/Berlin",
          )
        : null;
      if (link) {
        if (link.scheduled_start_at !== null)
          scheduleLinkedSource(
            db,
            owner,
            "meal",
            op.id,
            op.date,
            instant!,
            Number(link.duration_minutes),
          );
        else
          unscheduleLinkedMeal(
            db,
            owner,
            link.id as string,
            op.date,
            Number(link.duration_minutes),
          );
      }
      patch(db, "meals", owner, op.id, {
        date: op.date,
        meal_type: op.mealType,
        planned_at: instant,
        updated_at: created,
      });
    }
  }
}
