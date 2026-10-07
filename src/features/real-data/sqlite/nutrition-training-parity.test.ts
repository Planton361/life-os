import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  nutritionTrainingFixture,
  populatedNutritionTrainingFixture,
  result,
  runningInput,
  exerciseInput,
} from "../../../../tests/sqlite/nutrition-training-fixture";
import {
  owner,
  scope,
  at,
} from "../../../../tests/sqlite/source-review-fixture";
import {
  nutritionCommand,
  applyNutritionPlan,
  moveMealInstant,
} from "./commands/nutrition-commands";
import { trainingCommand } from "./commands/training-commands";
import { createSqliteNutritionRepository } from "./repositories/nutrition-repository";
import { createSqliteTrainingRepository } from "./repositories/training-repository";
import { issueOwnerContext, type OwnerContext } from "./owner-context";
import { runningStartInstant } from "../domain/running-time";

it("preserves Recipe lifecycle, fields, active Ingredient edits, ordering and historical reads", async () => {
  const f = nutritionTrainingFixture();
  try {
    const recipe = result(
      await f.nutrition.createRecipe({
        ...scope,
        title: "Recipe",
        areaId: f.area,
        tags: ["a", "a"],
        servings: 2,
        nutritionEstimate: { calories: 400 },
      }),
    );
    expect(recipe.tags).toEqual(["a"]);
    expect(
      result(
        await f.nutrition.updateRecipe({
          ...scope,
          recipeId: recipe.id,
          title: "Edited",
          summary: "Full summary",
          instructions: "Cook",
          source: "Book",
          prepMinutes: 30,
        }),
      ),
    ).toMatchObject({
      id: recipe.id,
      title: "Edited",
      summary: "Full summary",
    });
    const a = result(
      await f.nutrition.createRecipeIngredient({
        ...scope,
        recipeId: recipe.id,
        name: "A",
        quantity: 1.25,
        position: 2,
      }),
    );
    const b = result(
      await f.nutrition.createRecipeIngredient({
        ...scope,
        recipeId: recipe.id,
        name: "B",
        position: 0,
      }),
    );
    expect(
      result(
        await f.nutrition.getRecipeIngredients({
          ...scope,
          recipeId: recipe.id,
        }),
      ).map((x) => x.id),
    ).toEqual([b.id, a.id]);
    expect(
      result(
        await f.nutrition.updateRecipeIngredient({
          ...scope,
          ingredientId: a.id,
          recipeId: recipe.id,
          name: "New",
          quantity: null,
        }),
      ).quantity,
    ).toBeNull();
    expect(
      (
        await f.nutrition.updateRecipeIngredient({
          ...scope,
          ingredientId: a.id,
          recipeId: randomUUID(),
          name: "Bad",
        })
      ).ok,
    ).toBe(false);
    result(await f.nutrition.archiveRecipe({ ...scope, recipeId: recipe.id }));
    expect(
      result(await f.nutrition.getActiveRecipesByUser(owner, owner)),
    ).toHaveLength(0);
    expect(
      result(await f.nutrition.getRecipesByUser(owner, owner))[0].isArchived,
    ).toBe(true);
    expect(
      result(
        await f.nutrition.getRecipeIngredients({
          ...scope,
          recipeId: recipe.id,
        }),
      ),
    ).toHaveLength(2);
    expect(
      (
        await f.nutrition.createRecipeIngredient({
          ...scope,
          recipeId: recipe.id,
          name: "Denied",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.nutrition.updateRecipeIngredient({
          ...scope,
          ingredientId: a.id,
          name: "Denied",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.nutrition.deleteRecipeIngredient({
          ...scope,
          ingredientId: a.id,
        })
      ).ok,
    ).toBe(true);
  } finally {
    f.store.close();
  }
});
it("preserves Meal idempotency, exact servings, bounded reads and source-aware move/unschedule/remove", async () => {
  const f = nutritionTrainingFixture();
  try {
    const id = randomUUID(),
      input = {
        ...scope,
        requestId: id,
        title: "Dinner",
        date: "2026-10-07",
        mealType: "dinner" as const,
        servings: 99.99,
      };
    const first = result(await f.nutrition.createMeal(input));
    expect(
      result(await f.nutrition.createMeal({ ...input, title: "Other" })),
    ).toEqual(first);
    expect(
      (
        await f.nutrition.createMeal({
          ...input,
          requestId: randomUUID(),
          servings: 100.01,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.nutrition.getMealsByUserAndDateRange({
          ...scope,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        })
      ).ok,
    ).toBe(false);
    const task = await f.sources.schedule({
      sourceType: "meal",
      sourceId: id,
      plannedDate: input.date,
      scheduledStartAt: "2026-10-07T11:34:56.123456Z",
      durationMinutes: 30,
    });
    expect(task.error).toBeNull();
    expect(
      (
        await f.nutrition.updateMeal({
          ...scope,
          mealId: id,
          date: "2026-10-08",
        })
      ).ok,
    ).toBe(false);
    expect(() =>
      f.store.command(f.context, "raw.update", (db) =>
        db.prepare("UPDATE meals SET planned_at=NULL WHERE id=?").run(id),
      ),
    ).toThrow("SOURCE_COMMAND_REQUIRED");
    const get = () =>
      f.store.read(f.context, (db) =>
        db.prepare("SELECT * FROM meals WHERE id=?").get(id),
      ) as { updated_at: string; planned_at: string; date: string };
    const stale = get().updated_at;
    expect(
      (
        await f.nutrition.applyNutritionPlan(owner, [
          {
            kind: "move",
            id,
            date: "2026-10-26",
            mealType: "breakfast",
            expectedUpdatedAt: stale,
          },
        ])
      ).ok,
    ).toBe(true);
    expect(get()).toMatchObject({
      date: "2026-10-26",
      planned_at: "2026-10-26T12:34:56.123456Z",
    });
    expect(
      (
        await f.nutrition.applyNutritionPlan(owner, [
          { kind: "remove", id, expectedUpdatedAt: stale },
        ])
      ).ok,
    ).toBe(false);
    expect(
      (await f.sources.unscheduleLinkedMeal(task.data!.id, "2026-10-26", 30))
        .error,
    ).toBeNull();
    expect(
      (
        await f.nutrition.applyNutritionPlan(owner, [
          {
            kind: "move",
            id,
            date: "2026-10-27",
            mealType: "lunch",
            expectedUpdatedAt: get().updated_at,
          },
        ])
      ).ok,
    ).toBe(true);
    expect(get().planned_at).toBeNull();
    expect(
      (
        await f.nutrition.applyNutritionPlan(owner, [
          { kind: "remove", id, expectedUpdatedAt: get().updated_at },
        ])
      ).ok,
    ).toBe(true);
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT status FROM tasks WHERE id=?").get(task.data!.id),
      ),
    ).toEqual({ status: "archived" });
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT * FROM schedule_source_links WHERE source_id=?")
          .get(id),
      ),
    ).toBeUndefined();
  } finally {
    f.store.close();
  }
});
it("rolls back an entire planner draft after a late occupied/stale/Recipe failure", async () => {
  const f = nutritionTrainingFixture();
  try {
    const recipe = result(
        await f.nutrition.createRecipe({ ...scope, title: "Recipe", tags: [] }),
      ),
      a = randomUUID(),
      b = randomUUID();
    expect(
      (
        await f.nutrition.applyNutritionPlan(owner, [
          {
            kind: "assign",
            id: a,
            recipeId: recipe.id,
            date: "2026-10-08",
            mealType: "lunch",
          },
          {
            kind: "assign",
            id: b,
            recipeId: recipe.id,
            date: "2026-10-08",
            mealType: "lunch",
          },
        ])
      ).ok,
    ).toBe(false);
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT id FROM meals WHERE id=?").get(a),
      ),
    ).toBeUndefined();
    result(await f.nutrition.archiveRecipe({ ...scope, recipeId: recipe.id }));
    expect(
      (
        await f.nutrition.applyNutritionPlan(owner, [
          {
            kind: "assign",
            id: a,
            recipeId: recipe.id,
            date: "2026-10-08",
            mealType: "lunch",
          },
        ])
      ).ok,
    ).toBe(false);
    for (const value of [null, {}, [], Array(22).fill({})])
      expect((await f.nutrition.applyNutritionPlan(owner, value)).ok).toBe(
        false,
      );
  } finally {
    f.store.close();
  }
});
it("round-trips arbitrary Ingredient precision and all declared Training numeric boundaries without Number persistence", () => {
  const f = nutritionTrainingFixture();
  try {
    const recipe = f.store.command(f.context, "nutrition.write", (db) =>
      nutritionCommand(db, owner, "recipe.create", { title: "Exact" }),
    )!;
    const quantity = "9007199254740993.12345678901234567890123456789";
    const ingredient = f.store.command(f.context, "nutrition.write", (db) =>
      nutritionCommand(db, owner, "ingredient.create", {
        recipeId: recipe.id,
        name: "Exact",
        quantity,
      }),
    );
    expect(ingredient!.quantity).toBe(quantity);
    const item = f.store.command(f.context, "training.write", (db) =>
      trainingCommand(db, owner, "running.item", {
        planId: f.runningPlan,
        title: "Exact",
        plannedDistanceKm: "99999.999",
        plannedDurationMinutes: "",
        sortOrder: 1,
      }),
    );
    expect(item.planned_distance_km).toBe("99999.999");
    const setSession = f.store.command(f.context, "training.write", (db) =>
      trainingCommand(db, owner, "strength.start", {
        planId: f.strengthPlan,
        sessionDate: "2026-10-06",
        notes: "",
      }),
    );
    const set = f.store.command(f.context, "training.write", (db) =>
      trainingCommand(db, owner, "strength.set", {
        sessionId: setSession.id,
        exerciseId: f.exercise,
        setOrder: 1,
        repetitions: 8,
        weightKg: "99999.999",
        notes: "",
      }),
    );
    expect(set.weight_kg).toBe("99999.999");
    expect(() =>
      f.store.command(f.context, "training.write", (db) =>
        trainingCommand(db, owner, "running.item", {
          planId: f.runningPlan,
          title: "Overflow",
          plannedDistanceKm: "99999.9995",
          plannedDurationMinutes: "",
          sortOrder: 2,
        }),
      ),
    ).toThrow("NUMERIC_OVERFLOW");
  } finally {
    f.store.close();
  }
});
it("preserves Running local date/DST and real Session plus linked Task completion", async () => {
  const f = nutritionTrainingFixture();
  try {
    expect(runningStartInstant("2026-03-29", "02:30")).toBeNull();
    expect(runningStartInstant("2026-10-25", "02:30")).toBe(
      "2026-10-25T00:30:00.000Z",
    );
    const task = await f.sources.schedule({
      sourceType: "running_plan_item",
      sourceId: f.runningItem,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    expect(
      (
        await f.training.saveRunningSession(owner, {
          ...runningInput,
          planItemId: f.runningItem,
          sessionDate: "2026-03-29",
          startTime: "02:30",
        })
      ).ok,
    ).toBe(false);
    const session = result(
      await f.training.saveRunningSession(owner, {
        ...runningInput,
        planItemId: f.runningItem,
      }),
    );
    expect(session).toMatchObject({
      sessionDate: "2026-10-06",
      startedAt: "2026-10-06T21:30:00.000000Z",
      distanceKm: 5.123,
      status: "completed",
    });
    expect(
      result(
        await f.training.saveRunningSession(owner, {
          ...runningInput,
          sessionId: session.id,
          planItemId: f.runningItem,
          notes: "Edited",
        }),
      ).completedAt,
    ).toBe(session.completedAt);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT status,completed_at FROM tasks WHERE id=?")
          .get(task.data!.id),
      ),
    ).toEqual({ status: "done", completed_at: session.completedAt });
    expect(
      await f.training.archive(owner, "running_sessions", session.id),
    ).toBe(true);
    expect(
      (
        await f.training.saveRunningSession(owner, {
          ...runningInput,
          sessionId: session.id,
        })
      ).ok,
    ).toBe(false);
  } finally {
    f.store.close();
  }
});
it("atomically replaces Exercise muscles and completes only genuine Strength work with stable completion", async () => {
  const f = nutritionTrainingFixture();
  try {
    const exercise = result(
      await f.training.saveExercise(owner, exerciseInput),
    );
    expect(
      (
        await f.training.saveExercise(owner, {
          ...exerciseInput,
          exerciseId: exercise.id,
          name: "Failure",
          muscles: ["Chest", "Chest"],
        })
      ).ok,
    ).toBe(false);
    expect(
      result(await f.training.getSnapshot(owner)).exercises.find(
        (e) => e.id === exercise.id,
      ),
    ).toMatchObject({
      name: "Press",
      muscles: expect.arrayContaining(["Chest", "Triceps"]),
    });
    const task = await f.sources.schedule({
      sourceType: "strength_plan",
      sourceId: f.strengthPlan,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 45,
    });
    const session = result(
      await f.training.startStrengthSession(owner, {
        planId: f.strengthPlan,
        sessionDate: "2026-10-06",
        notes: "",
      }),
    );
    expect(await f.training.completeStrengthSession(owner, session.id)).toBe(
      false,
    );
    result(
      await f.training.addStrengthSet(owner, {
        sessionId: session.id,
        exerciseId: exercise.id,
        setOrder: 1,
        repetitions: 8,
        weightKg: 52.125,
        notes: "",
      }),
    );
    expect(await f.training.completeStrengthSession(owner, session.id)).toBe(
      true,
    );
    const completed = result(
      await f.training.getSnapshot(owner),
    ).strengthSessions.find((s) => s.id === session.id)!;
    expect(await f.training.completeStrengthSession(owner, session.id)).toBe(
      true,
    );
    expect(
      result(await f.training.getSnapshot(owner)).strengthSessions.find(
        (s) => s.id === session.id,
      ),
    ).toEqual(completed);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT status,completed_at FROM tasks WHERE id=?")
          .get(task.data!.id),
      ),
    ).toEqual({ status: "done", completed_at: completed.completedAt });
  } finally {
    f.store.close();
  }
});
it("denies forged/foreign owners and all foreign parents without partial rows", async () => {
  const f = nutritionTrainingFixture();
  try {
    const foreign = randomUUID();
    expect(() =>
      createSqliteNutritionRepository(f.store, {
        ownerId: owner,
      } as OwnerContext),
    ).toThrow("OWNER_CONTEXT_REQUIRED");
    expect(() =>
      createSqliteTrainingRepository(f.store, {
        ownerId: owner,
      } as OwnerContext),
    ).toThrow("OWNER_CONTEXT_REQUIRED");
    expect(
      (
        await createSqliteNutritionRepository(
          f.store,
          issueOwnerContext(foreign),
        ).getRecipesByUser(foreign, foreign)
      ).ok,
    ).toBe(false);
    expect(
      (await f.training.saveRunningPlan(foreign, { name: "Bad", goal: "Bad" }))
        .ok,
    ).toBe(false);
    expect(
      (
        await f.nutrition.createRecipe({
          ...scope,
          userId: foreign,
          title: "Bad",
          tags: [],
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.nutrition.createMeal({
          ...scope,
          requestId: randomUUID(),
          recipeId: foreign,
          title: "Bad",
          date: "2026-10-06",
          mealType: "lunch",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.training.addRunningPlanItem(owner, {
          planId: foreign,
          title: "Bad",
          plannedDistanceKm: "" as unknown as null,
          plannedDurationMinutes: null,
          sortOrder: 0,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.training.startStrengthSession(owner, {
          planId: foreign,
          sessionDate: "2026-10-06",
          notes: null,
        })
      ).ok,
    ).toBe(false);
  } finally {
    f.store.close();
  }
});
it("reuses the canonical PostgreSQL planner wall-clock choice including DST gaps and microseconds", () => {
  expect(
    moveMealInstant(
      "2026-03-28T01:30:20.123456Z",
      "2026-03-29",
      "Europe/Berlin",
    ),
  ).toBe("2026-03-29T01:30:20.123456Z");
  expect(
    moveMealInstant(
      "2026-10-24T00:30:20.123456Z",
      "2026-10-25",
      "Europe/Berlin",
    ),
  ).toBe("2026-10-25T01:30:20.123456Z");
});
it("populates full native Nutrition and Training source projections", async () => {
  const f = await populatedNutritionTrainingFixture();
  try {
    expect(
      result(
        await f.nutrition.getRecipeIngredients({
          ...scope,
          recipeId: f.recipe.id,
        }),
      ),
    ).toHaveLength(2);
    const snapshot = result(await f.training.getSnapshot(owner));
    expect(snapshot.runningSessions).toContainEqual(f.run);
    expect(snapshot.strengthSetLogs).toHaveLength(2);
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT count(*) n FROM tasks WHERE status='done'").get(),
      ),
    ).toEqual({ n: BigInt(3) });
  } finally {
    f.store.close();
  }
});
for (const kind of ["meal", "running_plan_item", "strength_plan"] as const)
  it(`${kind} completion rolls back source facts on Dependency denial`, async () => {
    const f = nutritionTrainingFixture();
    try {
      const source =
        kind === "meal"
          ? f.meal
          : kind === "running_plan_item"
            ? f.runningItem
            : f.strengthPlan;
      const task = await f.sources.schedule({
        sourceType: kind,
        sourceId: source,
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
        durationMinutes: 30,
      });
      if (!task.data) throw new Error("Fixture");
      const predecessor = result(
        await f.tasks.createTask({
          ...scope,
          title: "Incomplete",
          projectId: f.project,
        }),
      );
      result(
        await f.tasks.updateTask({
          ...scope,
          taskId: task.data.id,
          projectId: f.project,
        }),
      );
      f.store.command(f.context, "dependency.add", (db) =>
        db
          .prepare(
            "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            randomUUID(),
            owner,
            f.project,
            predecessor.id,
            task.data!.id,
            at,
          ),
      );
      const session =
        kind === "strength_plan"
          ? result(
              await f.training.startStrengthSession(owner, {
                planId: f.strengthPlan,
                sessionDate: "2026-10-06",
                notes: "",
              }),
            )
          : null;
      if (session)
        result(
          await f.training.addStrengthSet(owner, {
            sessionId: session.id,
            exerciseId: f.exercise,
            setOrder: 1,
            repetitions: 8,
            weightKg: null,
            notes: null,
          }),
        );
      const complete = async () =>
        kind === "meal"
          ? (
              await f.nutrition.completeMeal({
                ...scope,
                mealId: f.meal,
                completedAt: at,
              })
            ).ok
          : kind === "running_plan_item"
            ? (
                await f.training.saveRunningSession(owner, {
                  ...runningInput,
                  planItemId: f.runningItem,
                })
              ).ok
            : await f.training.completeStrengthSession(owner, session!.id);
      expect(await complete()).toBe(false);
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare("SELECT status,completed_at FROM tasks WHERE id=?")
            .get(task.data!.id),
        ),
      ).toEqual({ status: "planned", completed_at: null });
      if (kind === "meal")
        expect(
          f.store.read(f.context, (db) =>
            db.prepare("SELECT completed_at FROM meals WHERE id=?").get(f.meal),
          ),
        ).toEqual({ completed_at: null });
      if (kind === "running_plan_item")
        expect(
          result(await f.training.getSnapshot(owner)).runningSessions,
        ).toHaveLength(0);
      if (session)
        expect(
          result(await f.training.getSnapshot(owner)).strengthSessions.find(
            (s) => s.id === session.id,
          )?.status,
        ).toBe("in_progress");
      result(
        await f.tasks.completeTask({
          ...scope,
          taskId: predecessor.id,
          completedAt: at,
        }),
      );
      expect(await complete()).toBe(true);
    } finally {
      f.store.close();
    }
  });
it("DB constraints deny foreign Ingredient/Plan/Exercise/Session tuples and invalid muscles", () => {
  const f = nutritionTrainingFixture();
  try {
    for (const [table, columns, values] of [
      ["recipe_ingredients", "recipe_id,name", [randomUUID(), "Bad"]],
      [
        "running_plan_items",
        "plan_id,title,sort_order",
        [randomUUID(), "Bad", 1],
      ],
      [
        "strength_plan_items",
        "plan_id,exercise_id,sort_order,target_sets,target_reps",
        [f.strengthPlan, randomUUID(), 1, 2, 8],
      ],
    ] as const)
      expect(() =>
        f.store.command(f.context, "raw.insert", (db) =>
          db
            .prepare(
              `INSERT INTO ${table}(id,user_id,created_at,updated_at,${columns}) VALUES(?,?,?,?,${values.map(() => "?").join(",")})`,
            )
            .run(randomUUID(), owner, at, at, ...values),
        ),
      ).toThrow();
    expect(() =>
      f.store.command(f.context, "raw.insert", (db) =>
        db
          .prepare(
            "INSERT INTO exercise_muscles(id,user_id,exercise_id,muscle_group,created_at) VALUES(?,?,?,?,?)",
          )
          .run(randomUUID(), owner, f.exercise, "Invented", at),
      ),
    ).toThrow();
    expect(() =>
      f.store.command(f.context, "raw.insert", (db) =>
        db
          .prepare(
            "INSERT INTO strength_set_logs(id,user_id,session_id,exercise_id,set_order,repetitions,recorded_at) VALUES(?,?,?,?,1,8,?)",
          )
          .run(randomUUID(), owner, randomUUID(), f.exercise, at),
      ),
    ).toThrow();
  } finally {
    f.store.close();
  }
});
for (const kind of ["running_plan_item", "strength_plan"] as const)
  it(`${kind} raw completion cannot bypass the source command`, async () => {
    const f = nutritionTrainingFixture();
    try {
      const task = await f.sources.schedule({
        sourceType: kind,
        sourceId: kind === "running_plan_item" ? f.runningItem : f.strengthPlan,
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
        durationMinutes: 30,
      });
      expect(task.error).toBeNull();
      if (kind === "running_plan_item")
        expect(() =>
          f.store.command(f.context, "raw.complete", (db) =>
            db
              .prepare(
                "INSERT INTO running_sessions(id,user_id,plan_item_id,session_date,distance_km,duration_minutes,status,completed_at,created_at,updated_at) VALUES(?,?,?,'2026-10-06','5',30,'completed',?,?,?)",
              )
              .run(randomUUID(), owner, f.runningItem, at, at, at),
          ),
        ).toThrow("SOURCE_COMMAND_REQUIRED");
      else {
        const session = result(
          await f.training.startStrengthSession(owner, {
            planId: f.strengthPlan,
            sessionDate: "2026-10-06",
            notes: "",
          }),
        );
        expect(() =>
          f.store.command(f.context, "raw.complete", (db) =>
            db
              .prepare(
                "UPDATE strength_sessions SET status='completed',completed_at=? WHERE id=?",
              )
              .run(at, session.id),
          ),
        ).toThrow("SOURCE_COMMAND_REQUIRED");
      }
    } finally {
      f.store.close();
    }
  });
it("keeps arbitrary Ingredient quantities readable and editable through validated exact native DTOs", async () => {
  const f = nutritionTrainingFixture();
  try {
    const recipe = result(
      await f.nutrition.createRecipe({
        ...scope,
        title: "Exact Recipe",
        tags: [],
      }),
    );
    const quantity = "9007199254740993.12345678901234567890123456789";
    const created = result(
      await f.nutrition.createExactRecipeIngredient({
        ...scope,
        recipeId: recipe.id,
        name: "Exact",
        quantity,
      }),
    );
    expect(created.quantity).toBe(quantity);
    expect(
      result(
        await f.nutrition.getExactRecipeIngredients({
          ...scope,
          recipeId: recipe.id,
        }),
      )[0],
    ).toEqual(created);
    expect(
      (
        await f.nutrition.getRecipeIngredients({
          ...scope,
          recipeId: recipe.id,
        })
      ).ok,
    ).toBe(false);
    const corrected = "0.12345678901234567890123456789";
    expect(
      result(
        await f.nutrition.updateExactRecipeIngredient({
          ...scope,
          ingredientId: created.id,
          quantity: corrected,
        }),
      ).quantity,
    ).toBe(corrected);
  } finally {
    f.store.close();
  }
});
it("preserves owned Plan and Item lifecycle, order uniqueness, context and exact target weights", async () => {
  const f = nutritionTrainingFixture();
  try {
    const running = result(
      await f.training.saveRunningPlan(owner, {
        name: "Run plan",
        goal: "Intent",
      }),
    );
    expect(
      result(
        await f.training.saveRunningPlan(owner, {
          planId: running.id,
          name: "Edited",
          goal: "New intent",
        }),
      ).id,
    ).toBe(running.id);
    const item = result(
      await f.training.addRunningPlanItem(owner, {
        planId: running.id,
        title: "First",
        sortOrder: 2,
        plannedDistanceKm: 4.125,
        plannedDurationMinutes: 40,
      }),
    );
    expect(
      result(
        await f.training.addRunningPlanItem(owner, {
          itemId: item.id,
          planId: running.id,
          title: "Reordered",
          sortOrder: 1,
          plannedDistanceKm: 6.25,
          plannedDurationMinutes: 50,
        }),
      ),
    ).toMatchObject({ id: item.id, sortOrder: 1, title: "Reordered" });
    expect(
      (
        await f.training.addRunningPlanItem(owner, {
          itemId: item.id,
          planId: f.runningPlan,
          title: "Foreign plan",
          sortOrder: 1,
          plannedDistanceKm: null,
          plannedDurationMinutes: null,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.training.addRunningPlanItem(owner, {
          planId: running.id,
          title: "Duplicate order",
          sortOrder: 1,
          plannedDistanceKm: null,
          plannedDurationMinutes: null,
        })
      ).ok,
    ).toBe(false);
    expect(await f.training.archive(owner, "running_plan_items", item.id)).toBe(
      true,
    );
    expect(
      (
        await f.training.saveRunningSession(owner, {
          ...runningInput,
          planItemId: item.id,
        })
      ).ok,
    ).toBe(false);
    expect(await f.training.archive(owner, "running_plans", running.id)).toBe(
      true,
    );
    expect(
      (
        await f.training.addRunningPlanItem(owner, {
          planId: running.id,
          title: "Archived parent",
          sortOrder: 0,
          plannedDistanceKm: null,
          plannedDurationMinutes: null,
        })
      ).ok,
    ).toBe(false);
    const exercise = result(
      await f.training.saveExercise(owner, exerciseInput),
    );
    const plan = result(
      await f.training.saveStrengthPlan(owner, {
        name: "Strength",
        goal: "Intent",
      }),
    );
    expect(
      result(
        await f.training.saveStrengthPlan(owner, {
          planId: plan.id,
          name: "Edited Strength",
          goal: "New intent",
        }),
      ).id,
    ).toBe(plan.id);
    const strengthItem = result(
      await f.training.addStrengthPlanItem(owner, {
        planId: plan.id,
        exerciseId: exercise.id,
        sortOrder: 0,
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 99999.999,
      }),
    );
    expect(
      result(
        await f.training.addStrengthPlanItem(owner, {
          itemId: strengthItem.id,
          planId: plan.id,
          exerciseId: exercise.id,
          sortOrder: 1,
          targetSets: 2,
          targetReps: 10,
          targetWeightKg: 50.125,
        }),
      ),
    ).toMatchObject({
      id: strengthItem.id,
      targetWeightKg: 50.125,
      sortOrder: 1,
    });
    expect(
      (
        await f.training.addStrengthPlanItem(owner, {
          itemId: strengthItem.id,
          planId: f.strengthPlan,
          exerciseId: exercise.id,
          sortOrder: 2,
          targetSets: 2,
          targetReps: 8,
          targetWeightKg: null,
        })
      ).ok,
    ).toBe(false);
    expect(await f.training.archive(owner, "exercises", exercise.id)).toBe(
      true,
    );
    expect(
      (
        await f.training.addStrengthPlanItem(owner, {
          planId: plan.id,
          exerciseId: exercise.id,
          sortOrder: 2,
          targetSets: 2,
          targetReps: 8,
          targetWeightKg: null,
        })
      ).ok,
    ).toBe(false);
    const session = result(
      await f.training.startStrengthSession(owner, {
        planId: plan.id,
        sessionDate: "2026-10-06",
        notes: null,
      }),
    );
    expect(
      await f.training.archive(owner, "strength_sessions", session.id),
    ).toBe(true);
    expect(
      (
        await f.training.addStrengthSet(owner, {
          sessionId: session.id,
          exerciseId: f.exercise,
          setOrder: 1,
          repetitions: 8,
          weightKg: null,
          notes: null,
        })
      ).ok,
    ).toBe(false);
    expect(await f.training.archive(owner, "strength_plans", plan.id)).toBe(
      true,
    );
    expect(
      (
        await f.training.startStrengthSession(owner, {
          planId: plan.id,
          sessionDate: "2026-10-06",
          notes: null,
        })
      ).ok,
    ).toBe(false);
  } finally {
    f.store.close();
  }
});
it("rounds Running session distance from the exact input rather than its binary Number approximation", () => {
  const f = nutritionTrainingFixture();
  try {
    const session = f.store.command(f.context, "source.complete", (db) =>
      trainingCommand(db, owner, "running.session", {
        ...runningInput,
        distanceKm: "999.99949999999999999999999999999",
      }),
    );
    expect(session.distance_km).toBe("999.999");
  } finally {
    f.store.close();
  }
});
it("advances the exact Meal stale token when the wall clock/version stamp repeats", () => {
  const f = nutritionTrainingFixture();
  try {
    const before = f.store.read(f.context, (db) =>
      db.prepare("SELECT updated_at FROM meals WHERE id=?").get(f.meal),
    ) as { updated_at: string };
    f.store.command(f.context, "nutrition.write", (db) =>
      db
        .prepare("UPDATE meals SET title='Changed',updated_at=? WHERE id=?")
        .run(before.updated_at, f.meal),
    );
    const after = f.store.read(f.context, (db) =>
      db.prepare("SELECT updated_at FROM meals WHERE id=?").get(f.meal),
    ) as { updated_at: string };
    expect(after.updated_at > before.updated_at).toBe(true);
    expect(() =>
      f.store.command(f.context, "nutrition.plan", (db) => {
        applyNutritionPlan(db, owner, [
          {
            kind: "move",
            id: f.meal,
            date: "2026-10-07",
            mealType: "lunch",
            expectedUpdatedAt: before.updated_at,
          },
        ]);
      }),
    ).toThrow("STALE_MEAL");
  } finally {
    f.store.close();
  }
});
