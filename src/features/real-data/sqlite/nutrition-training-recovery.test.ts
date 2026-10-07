import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  populatedNutritionTrainingFixture,
  result,
} from "../../../../tests/sqlite/nutrition-training-fixture";
import {
  owner,
  scope,
  daily,
  at,
} from "../../../../tests/sqlite/source-review-fixture";
import { SqliteRuntime } from "./runtime";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "./recovery";
import { createSqliteNutritionRepository } from "./repositories/nutrition-repository";
import { createSqliteTrainingRepository } from "./repositories/training-repository";
import { createSqliteReviewRepository } from "./repositories/review-repository";
import {
  createSqliteResourceRepository,
  createSqliteProjectArtifactRepository,
} from "./repositories/resource-repository";
import { createSqliteScheduleSourceRepository } from "./repositories/schedule-source-repository";
import { runningTotals, strengthVolume } from "../domain/training";
import { generateGroceryDraft } from "../../nutrition/grocery/grocery-generation";

it("retains complete populated Nutrition/Training facts, exact decimals and native projections across restart/online backup/isolated restore", async () => {
  const f = await populatedNutritionTrainingFixture();
  const carry = result(
    await f.tasks.createTask({
      ...scope,
      title: "Carry",
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
    }),
  );
  const review = result(
    await f.reviews.saveReview({
      ...daily,
      carryTaskIds: [carry.id],
      status: "completed",
      outcome: "Historical outcome",
    }),
  );
  result(
    await f.reviews.saveReview({
      ...daily,
      kind: "weekly",
      periodStart: "2026-10-05",
      periodEnd: "2026-10-11",
      nextPeriodFocus: "Stable focus",
    }),
  );
  const resource = result(
    await f.resources.createResource({
      ...scope,
      title: "Artifact",
      type: "note",
    }),
  );
  expect(
    await f.artifacts.setProjectResourceRole({
      ...scope,
      projectId: f.project,
      resourceId: resource.id,
      role: "primary_artifact",
    }),
  ).toBe(true);
  const before = inspectSyntheticDatabase(f.path);
  f.store.close();
  async function projection(store: SqliteRuntime) {
    const nutrition = createSqliteNutritionRepository(store, f.context),
      training = createSqliteTrainingRepository(store, f.context),
      reviews = createSqliteReviewRepository(store, f.context);
    const recipes = result(await nutrition.getRecipesByUser(owner, owner));
    const ingredients = result(
      await nutrition.getRecipeIngredients({ ...scope, recipeId: f.recipe.id }),
    );
    const meals = result(
      await nutrition.getMealsByUserAndDateRange({
        ...scope,
        startDate: "2026-10-06",
        endDate: "2026-11-05",
      }),
    );
    const snapshot = result(await training.getSnapshot(owner));
    const grocery = generateGroceryDraft({
      ingredientsByRecipeId: new Map([[f.recipe.id, ingredients]]),
      meals,
      recipes,
    });
    expect(grocery.items.map((i) => i.quantity)).toEqual([62.75, 125.125]);
    expect(runningTotals(snapshot.runningSessions)).toEqual({
      distanceKm: 5.123,
      durationMinutes: 30,
      sessionCount: 1,
    });
    expect(strengthVolume(snapshot.strengthSetLogs)).toMatchObject({
      weightedSetCount: 2,
      weightedVolumeKg: 834,
    });
    expect(
      snapshot.exercises
        .find((e) => e.id === f.completedExercise.id)
        ?.muscles.slice()
        .sort(),
    ).toEqual(["Chest", "Triceps"]);
    const exact = store.read(f.context, (db) => ({
      meals: db
        .prepare(
          "SELECT id,servings,planned_at,completed_at FROM meals ORDER BY id",
        )
        .all(),
      ingredients: db
        .prepare(
          "SELECT id,quantity,position FROM recipe_ingredients ORDER BY id",
        )
        .all(),
      runs: db
        .prepare(
          "SELECT id,distance_km,session_date,started_at,completed_at FROM running_sessions ORDER BY id",
        )
        .all(),
      sets: db
        .prepare(
          "SELECT id,weight_kg,set_order,repetitions FROM strength_set_logs ORDER BY id",
        )
        .all(),
      links: db
        .prepare(
          "SELECT l.*,t.status,t.completed_at FROM schedule_source_links l JOIN tasks t ON t.user_id=l.user_id AND t.id=l.task_id ORDER BY l.id",
        )
        .all(),
      decisions: db
        .prepare("SELECT * FROM review_task_decisions ORDER BY id")
        .all(),
      ready: db
        .prepare("SELECT compatibility_ready FROM runtime_metadata")
        .get(),
    }));
    expect(exact.ready).toEqual({ compatibility_ready: BigInt(0) });
    expect(exact.links).toHaveLength(3);
    for (const link of exact.links)
      expect(link).toMatchObject({
        status: "done",
        completed_at: expect.any(String),
      });
    expect(exact.decisions).toContainEqual(
      expect.objectContaining({
        task_id: carry.id,
        original_planned_date: "2026-10-06",
        original_scheduled_start_at: at,
        planning_snapshot_captured: BigInt(1),
      }),
    );
    expect(
      recipes.find((recipe) => recipe.id === f.exactRecipe.id)
        ?.nutritionEstimate,
    ).toBeNull();
    const exactIngredients = result(
      await nutrition.getExactRecipeIngredients({
        ...scope,
        recipeId: f.exactRecipe.id,
      }),
    );
    expect(exactIngredients).toEqual([f.exactIngredient]);
    return {
      exactIngredients,
      recipes,
      ingredients,
      meals,
      snapshot,
      grocery,
      exact,
      review: await reviews.getReviewByPeriod(
        owner,
        owner,
        "daily",
        daily.periodStart,
      ),
      decisions: await reviews.getTaskDecisions(owner, review.id),
      resources: await createSqliteResourceRepository(
        store,
        f.context,
      ).getResourcesByUser(owner, owner),
      artifacts: createSqliteProjectArtifactRepository(
        store,
        f.context,
      ).readProjectResourceUses(f.project),
      links: await createSqliteScheduleSourceRepository(
        store,
        f.context,
      ).getLinks(owner),
    };
  }
  const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const original = await projection(restarted);
    expect(inspectSyntheticDatabase(f.path)).toEqual(before);
    const backup = join(f.directory, "nutrition-training-online.db"),
      restored = join(f.directory, "nutrition-training-restored.db");
    await restarted.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(before);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(before);
    const candidate = new SqliteRuntime(restored, { syntheticProof: true });
    try {
      expect(await projection(candidate)).toEqual(original);
    } finally {
      candidate.close();
    }
    expect(before.counts).toMatchObject({
      recipes: 2,
      recipe_ingredients: 3,
      running_sessions: 1,
      strength_sessions: 1,
      strength_set_logs: 2,
      exercise_muscles: 2,
      review_records: 2,
      review_task_decisions: 1,
      schedule_source_links: 3,
    });
  } finally {
    restarted.close();
  }
});
