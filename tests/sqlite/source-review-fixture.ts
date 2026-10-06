import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeSyntheticDatabase } from "../../src/features/real-data/sqlite/synthetic-database";
import { SqliteRuntime } from "../../src/features/real-data/sqlite/runtime";
import { issueOwnerContext } from "../../src/features/real-data/sqlite/owner-context";
import { createSqliteTaskRepository } from "../../src/features/real-data/sqlite/repositories/task-repository";
import {
  createSqliteResourceRepository,
  createSqliteProjectArtifactRepository,
} from "../../src/features/real-data/sqlite/repositories/resource-repository";
import { createSqliteScheduleSourceRepository } from "../../src/features/real-data/sqlite/repositories/schedule-source-repository";
import { createSqliteReviewRepository } from "../../src/features/real-data/sqlite/repositories/review-repository";
import { skillDevelopmentCommand } from "../../src/features/real-data/sqlite/repositories/skill-development-repository";
import { sourceTaskCommands } from "../../src/features/real-data/sqlite/commands/source-commands";
export const owner = "11600000-0000-4000-8000-000000000001",
  at = "2026-10-06T10:00:00.123456Z",
  scope = { userId: owner, profileId: owner };
export const daily = {
  ...scope,
  kind: "daily" as const,
  periodStart: "2026-10-06",
  periodEnd: "2026-10-06",
  timezone: "Europe/Berlin",
  wins: ["Synthetic win"],
  blockers: [],
  openLoops: [],
  carryTaskIds: [],
  status: "draft" as const,
};
export function sourceReviewFixture() {
  const directory = mkdtempSync(
      join(realpathSync(tmpdir()), "life-os-116-source-review-"),
    ),
    path = join(directory, "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner),
    store = new SqliteRuntime(path, { syntheticProof: true });
  const project = randomUUID(),
    goal = randomUUID(),
    meal = randomUUID(),
    runningPlan = randomUUID(),
    runningItem = randomUUID(),
    strengthPlan = randomUUID(),
    exercise = randomUUID(),
    area = randomUUID();
  store.command(context, "synthetic.seed", (db) => {
    db.prepare(
      "INSERT INTO areas(id,user_id,name,key,created_at,updated_at) VALUES(?,?,'Area','resources',?,?)",
    ).run(area, owner, at, at);
    db.prepare(
      "INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Project','active',?,?)",
    ).run(project, owner, at, at);
    db.prepare(
      "INSERT INTO goals(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Goal','active',?,?)",
    ).run(goal, owner, at, at);
    db.prepare(
      "INSERT INTO meals(id,user_id,date,meal_type,title,created_at,updated_at) VALUES(?,?,'2026-10-06','lunch','Meal',?,?)",
    ).run(meal, owner, at, at);
    db.prepare(
      "INSERT INTO running_plans(id,user_id,name,goal,created_at,updated_at) VALUES(?,?,'Running','Measured practice',?,?)",
    ).run(runningPlan, owner, at, at);
    db.prepare(
      "INSERT INTO running_plan_items(id,user_id,plan_id,title,sort_order,created_at,updated_at) VALUES(?,?,?,'Run',0,?,?)",
    ).run(runningItem, owner, runningPlan, at, at);
    db.prepare(
      "INSERT INTO strength_plans(id,user_id,name,goal,created_at,updated_at) VALUES(?,?,'Strength','Measured practice',?,?)",
    ).run(strengthPlan, owner, at, at);
    db.prepare(
      "INSERT INTO exercises(id,user_id,name,created_at,updated_at) VALUES(?,?,'Press',?,?)",
    ).run(exercise, owner, at, at);
  });
  const skill = (
    skillDevelopmentCommand(store, context, {
      operation: "skill.create",
      commandId: randomUUID(),
      skillId: null,
      expectedRevision: null,
      payload: { name: "Source skill" },
    }) as { skill_id: string }
  ).skill_id;
  return {
    directory,
    path,
    store,
    context,
    project,
    goal,
    area,
    meal,
    runningPlan,
    runningItem,
    strengthPlan,
    exercise,
    skill,
    tasks: createSqliteTaskRepository(store, context, sourceTaskCommands),
    resources: createSqliteResourceRepository(store, context),
    artifacts: createSqliteProjectArtifactRepository(store, context),
    sources: createSqliteScheduleSourceRepository(store, context),
    reviews: createSqliteReviewRepository(store, context),
  };
}
