import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { compileRuntime } from "./compile-runtime.mjs";

export const syntheticOwner = "11600000-0000-4000-8000-000000000001";
export async function createApplicationFixture({
  resourceWorkload = false,
} = {}) {
  const compiled = compileRuntime([
    "src/features/real-data/runtime/sqlite-adapter.ts",
  ]);
  const require = createRequire(import.meta.url);
  const native = (name) => require(join(compiled, `${name}.js`));
  const { initializeSyntheticDatabase } = native("synthetic-database");
  const { SqliteRuntime } = native("runtime");
  const { issueOwnerContext } = native("owner-context");
  const { sealSyntheticApplicationDatabase } = native("synthetic-readiness");
  const { sqliteApplicationRepositories } = require(
    join(
      compiled,
      "dependencies/src/features/real-data/runtime/sqlite-adapter.js",
    ),
  );
  const directory = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-116-application-"),
  );
  const path = join(directory, "synthetic.db");
  initializeSyntheticDatabase(path, syntheticOwner);
  const owner = issueOwnerContext(syntheticOwner),
    store = new SqliteRuntime(path, { syntheticProof: true });
  const repos = sqliteApplicationRepositories(store, owner);
  const result = (r) => {
    assert.equal(r.ok, true, JSON.stringify(r));
    return r.data;
  };
  const scope = { userId: syntheticOwner, profileId: syntheticOwner };
  const day = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
  const ids = {};
  try {
    const { ownedArea } = native("commands/retained-commands");
    store.command(owner, "retained.area", (db) => {
      for (const key of ["life", "coding", "education", "work"])
        ownedArea(db, syntheticOwner, key, true);
    });
    ids.goal = result(
      await repos.goals.createGoal({
        ...scope,
        title: "SQLite synthetic Goal",
        status: "active",
        why: "Runtime proof",
      }),
    ).id;
    ids.project = result(
      await repos.projects.createProject({
        ...scope,
        title: "SQLite synthetic Project",
        status: "active",
        goalId: ids.goal,
        nextStep: "Verify production runtime",
      }),
    ).id;
    ids.task = result(
      await repos.tasks.createTask({
        ...scope,
        title: "SQLite synthetic Task",
        projectId: ids.project,
        goalId: ids.goal,
        plannedDate: day,
      }),
    ).id;
    const { skillDevelopmentCommand } = native(
      "repositories/skill-development-repository",
    );
    ids.skill = skillDevelopmentCommand(store, owner, {
      operation: "skill.create",
      commandId: randomUUID(),
      skillId: null,
      expectedRevision: null,
      payload: { name: "SQLite synthetic Skill" },
    }).skill_id;
    ids.resource = result(
      await repos.resources.createResource({
        ...scope,
        title: "SQLite synthetic Resource",
        type: "note",
        body: "Canonical runtime evidence",
      }),
    ).id;
    ids.inbox = result(
      await repos.inbox.createInboxItem({
        ...scope,
        title: "SQLite synthetic Inbox",
        body: "Route this through the application",
      }),
    ).id;
    ids.habit = result(
      await repos.habits.createHabit(syntheticOwner, syntheticOwner, {
        name: "SQLite synthetic Habit",
        window: "Morning",
        unit: "sessions",
        sortOrder: 1,
        defaultIncrement: 1,
        dailyTarget: 2,
      }),
    ).id;
    ids.recipe = result(
      await repos.nutrition.createRecipe({
        ...scope,
        title: "SQLite synthetic Recipe",
        tags: ["synthetic"],
        servings: 2,
      }),
    ).id;
    ids.meal = result(
      await repos.nutrition.createMeal({
        ...scope,
        requestId: randomUUID(),
        title: "SQLite synthetic Meal",
        date: day,
        mealType: "lunch",
        recipeId: ids.recipe,
        servings: 1,
      }),
    ).id;
    ids.runPlan = result(
      await repos.training.saveRunningPlan(syntheticOwner, {
        name: "SQLite synthetic Running",
        goal: "Runtime",
      }),
    ).id;
    ids.runItem = result(
      await repos.training.addRunningPlanItem(syntheticOwner, {
        planId: ids.runPlan,
        title: "SQLite synthetic Run",
        sortOrder: 0,
        plannedDistanceKm: 5,
        plannedDurationMinutes: 30,
      }),
    ).id;
    ids.exercise = result(
      await repos.training.saveExercise(syntheticOwner, {
        name: "SQLite synthetic Press",
        equipment: "Barbell",
        muscles: ["Chest"],
        description: "Runtime",
      }),
    ).id;
    ids.strengthPlan = result(
      await repos.training.saveStrengthPlan(syntheticOwner, {
        name: "SQLite synthetic Strength",
        goal: "Runtime",
      }),
    ).id;
    result(
      await repos.training.addStrengthPlanItem(syntheticOwner, {
        planId: ids.strengthPlan,
        exerciseId: ids.exercise,
        sortOrder: 0,
        targetSets: 2,
        targetReps: 8,
        targetWeightKg: 20,
      }),
    );
    for (const domain of ["coding", "education", "work"]) {
      ids[domain] = result(
        await repos[domain].createProject(syntheticOwner, {
          title: `SQLite synthetic ${domain} Project`,
          description: "Runtime",
          status: "active",
          repositoryUrl: "https://example.invalid/synthetic",
        }),
      ).id;
    }
    ids.journal = result(
      await repos.life.createJournalEntry(syntheticOwner, {
        entryDate: day,
        title: "SQLite synthetic Journal",
        body: "Runtime journal",
      }),
    ).id;
    ids.challenge = result(
      await repos.challenges.createChallenge(syntheticOwner, {
        title: "SQLite synthetic Challenge",
        description: null,
        periodType: "daily",
        startDate: day,
        endDate: day,
        targetValue: 1,
        unit: "sessions",
        rewardCoins: 10,
      }),
    ).id;
    ids.shop = result(
      await repos.shop.create(syntheticOwner, {
        title: "SQLite synthetic Reward",
        category: "Runtime",
        description: null,
        costCoins: 3,
      }),
    ).id;
    ids.inventory = result(
      await repos.life.createInventoryItem(syntheticOwner, {
        name: "SQLite synthetic Inventory",
        category: "Runtime",
        description: "Synthetic only",
        condition: null,
        location: null,
        acquiredOn: day,
        amount: null,
        currency: null,
        quantity: 1,
        unit: "item",
      }),
    ).id;
    ids.entertainment = result(
      await repos.life.createEntertainmentItem(syntheticOwner, {
        title: "SQLite synthetic Book",
        mediaType: "book",
        status: "planned",
        completedOn: null,
        creatorOrStudio: null,
        notes: "Synthetic only",
        progressCurrent: null,
        progressTotal: null,
        progressUnit: null,
        rating: null,
        releaseYear: null,
        startedOn: null,
      }),
    ).id;
    if (resourceWorkload) {
      const projects = [ids.project];
      for (let i = 1; i < 4; i++) {
        const goal = result(
          await repos.goals.createGoal({
            ...scope,
            title: `SQLite synthetic workload Goal ${i}`,
            status: "active",
          }),
        ).id;
        projects.push(
          result(
            await repos.projects.createProject({
              ...scope,
              title: `SQLite synthetic workload Project ${i}`,
              status: "active",
              goalId: goal,
            }),
          ).id,
        );
      }
      for (let i = 1; i < 80; i++) {
        const date = new Date(`${day}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + (i % 14));
        result(
          await repos.tasks.createTask({
            ...scope,
            title: `SQLite synthetic workload Task ${i}`,
            projectId: projects[i % 4],
            plannedDate: date.toISOString().slice(0, 10),
          }),
        );
      }
    }
    const { createSqliteRetainedRepository } = native(
      "repositories/retained-repository",
    );
    const retained = createSqliteRetainedRepository(store, owner);
    retained.create(syntheticOwner, "antirot.action", {
      title: "SQLite synthetic Anti-Rot",
      description: null,
      category: "movement",
      energy: "low",
      estimatedMinutes: 5,
    });
  } finally {
    store.close();
  }
  sealSyntheticApplicationDatabase(path);
  return {
    directory,
    path,
    compiled,
    ids,
    day,
    ownerId: syntheticOwner,
    disposableDirectories: [],
  };
}

// Called only after all owned application/browser processes have terminated.
// Failure evidence, including the disposable DB, is retained for diagnosis.
export function releaseApplicationFixture(fixture) {
  for (const suffix of [
    "",
    "-wal",
    "-shm",
    ".writer-lease.db",
    ".writer-lease.db-journal",
  ])
    rmSync(fixture.path + suffix, { force: true });
  rmSync(fixture.compiled, { recursive: true, force: true });
  for (const directory of fixture.disposableDirectories)
    rmSync(directory, { recursive: true, force: true });
}
