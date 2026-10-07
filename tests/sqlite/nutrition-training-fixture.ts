import { randomUUID } from "node:crypto";
import { sourceReviewFixture, owner, scope, at } from "./source-review-fixture";
import { createSqliteNutritionRepository } from "../../src/features/real-data/sqlite/repositories/nutrition-repository";
import { createSqliteTrainingRepository } from "../../src/features/real-data/sqlite/repositories/training-repository";
import type { RepositoryResult } from "../../src/features/real-data/repositories/repository-result";
export function result<T>(r: RepositoryResult<T>): T {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data;
}
export const runningInput = {
  planItemId: "",
  sessionDate: "2026-10-06",
  startTime: "23:30",
  distanceKm: 5.123,
  durationMinutes: 30,
  averageHeartRate: 140,
  notes: "Measured run",
};
export const exerciseInput = {
  name: "Press",
  description: "Measured exercise",
  equipment: "Barbell",
  muscles: ["Chest", "Triceps"] as ("Chest" | "Triceps")[],
};
export function nutritionTrainingFixture() {
  const f = sourceReviewFixture();
  return {
    ...f,
    nutrition: createSqliteNutritionRepository(f.store, f.context),
    training: createSqliteTrainingRepository(f.store, f.context),
  };
}
export async function populatedNutritionTrainingFixture() {
  const f = nutritionTrainingFixture();
  const recipe = result(
    await f.nutrition.createRecipe({
      ...scope,
      title: "Rice",
      areaId: f.area,
      servings: 2,
      tags: ["simple", "simple"],
      nutritionEstimate: { calories: 400, protein: 20 },
      instructions: "Cook",
      summary: "Meal",
      prepMinutes: 20,
      source: "Synthetic",
    }),
  );
  for (const [position, name, quantity] of [
    [0, "Rice", 125.5],
    [1, "Water", 250.25],
  ] as const)
    result(
      await f.nutrition.createRecipeIngredient({
        ...scope,
        recipeId: recipe.id,
        name,
        quantity,
        unit: "g",
        position,
      }),
    );
  const exactRecipe = result(
    await f.nutrition.createRecipe({
      ...scope,
      title: "Exact historical quantity",
      tags: [],
    }),
  );
  const exactIngredient = result(
    await f.nutrition.createExactRecipeIngredient({
      ...scope,
      recipeId: exactRecipe.id,
      name: "Exact quantity",
      quantity: "9007199254740993.12345678901234567890123456789",
      position: 0,
    }),
  );
  const meal = result(
    await f.nutrition.createMeal({
      ...scope,
      requestId: randomUUID(),
      title: "Rice lunch",
      date: "2026-10-07",
      mealType: "lunch",
      recipeId: recipe.id,
      servings: 1.25,
    }),
  );
  result(
    await f.nutrition.applyNutritionPlan(owner, [
      {
        kind: "assign",
        id: randomUUID(),
        recipeId: recipe.id,
        date: "2026-10-07",
        mealType: "dinner",
      },
    ]),
  );
  const mealTask = await f.sources.schedule({
    sourceType: "meal",
    sourceId: meal.id,
    plannedDate: meal.date,
    scheduledStartAt: "2026-10-07T11:34:56.123456Z",
    durationMinutes: 30,
  });
  if (mealTask.error) throw new Error("SCHEDULE_FAILED");
  const scheduled = result(
    await f.nutrition.getMealsByUserAndDateRange({
      ...scope,
      startDate: "2026-10-07",
      endDate: "2026-10-07",
    }),
  ).find((m) => m.id === meal.id)!;
  result(
    await f.nutrition.applyNutritionPlan(owner, [
      {
        kind: "move",
        id: meal.id,
        date: "2026-10-26",
        mealType: "breakfast",
        expectedUpdatedAt: scheduled.updatedAt,
      },
    ]),
  );
  result(
    await f.nutrition.completeMeal({
      ...scope,
      mealId: meal.id,
      completedAt: at,
    }),
  );
  const runningPlan = result(
    await f.training.saveRunningPlan(owner, {
      name: "Distance",
      goal: "Practice",
    }),
  );
  const runningItem = result(
    await f.training.addRunningPlanItem(owner, {
      planId: runningPlan.id,
      title: "Run",
      plannedDistanceKm: 5.123,
      plannedDurationMinutes: 30,
      sortOrder: 0,
    }),
  );
  const runningTask = await f.sources.schedule({
    sourceType: "running_plan_item",
    sourceId: runningItem.id,
    plannedDate: "2026-10-06",
    scheduledStartAt: at,
    durationMinutes: 30,
  });
  if (runningTask.error) throw new Error("SCHEDULE_FAILED");
  const run = result(
    await f.training.saveRunningSession(owner, {
      ...runningInput,
      planItemId: runningItem.id,
    }),
  );
  const exercise = result(await f.training.saveExercise(owner, exerciseInput));
  const strengthPlan = result(
    await f.training.saveStrengthPlan(owner, {
      name: "Strength",
      goal: "Practice",
    }),
  );
  result(
    await f.training.addStrengthPlanItem(owner, {
      planId: strengthPlan.id,
      exerciseId: exercise.id,
      sortOrder: 0,
      targetSets: 2,
      targetReps: 8,
      targetWeightKg: 52.125,
    }),
  );
  const strengthTask = await f.sources.schedule({
    sourceType: "strength_plan",
    sourceId: strengthPlan.id,
    plannedDate: "2026-10-06",
    scheduledStartAt: at,
    durationMinutes: 45,
  });
  if (strengthTask.error) throw new Error("SCHEDULE_FAILED");
  const session = result(
    await f.training.startStrengthSession(owner, {
      planId: strengthPlan.id,
      sessionDate: "2026-10-06",
      notes: "Real sets",
    }),
  );
  for (const setOrder of [1, 2])
    result(
      await f.training.addStrengthSet(owner, {
        sessionId: session.id,
        exerciseId: exercise.id,
        setOrder,
        repetitions: 8,
        weightKg: 52.125,
        notes: "Measured",
      }),
    );
  if (!(await f.training.completeStrengthSession(owner, session.id)))
    throw new Error("COMPLETE_FAILED");
  return {
    ...f,
    recipe,
    populatedMeal: meal,
    run,
    session,
    completedExercise: exercise,
    exactRecipe,
    exactIngredient,
  };
}
