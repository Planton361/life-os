import "server-only";
import type Database from "better-sqlite3";
import { coreSchema, coreOwnedTables, ownerGuards } from "./core-schema";
import { sourceSchema, sourceOwnedTables } from "./source-schema";
import { sourceGuards, sourceDependencyGuards } from "./source-guards";
import { habitSchema, habitOwnedTables } from "./habit-schema";
import { healthSchema, healthOwnedTables } from "./health-schema";
import { projectSchema, projectOwnedTables } from "./project-schema";
import { projectGuards } from "./project-guards";
import { goalSchema, goalOwnedTables } from "./goal-schema";
import { goalGuards, goalHistoryScopeGuards } from "./goal-guards";

import { skillSchema, skillOwnedTables } from "./skill-schema";
import { skillGuards } from "./skill-guards";
import { resourceGuards } from "./resource-guards";
import { nutritionTrainingGuards } from "./nutrition-training-guards";
import { retainedSchema, retainedOwnedTables } from "./retained-schema";
import { retainedGuards } from "./retained-guards";
import { taskStepSchema } from "./task-step-schema";

// One schema composition for fresh canonical and disposable synthetic datasets.
export function initializeCanonicalSchema(db: Database.Database) {
  db.exec(coreSchema);
  db.exec(sourceSchema);
  db.exec(habitSchema);
  db.exec(healthSchema);
  db.exec(goalSchema);
  db.exec(projectSchema);
  db.exec(skillSchema);
  db.exec(taskStepSchema);
  db.exec(retainedSchema);
  db.exec(retainedGuards());
  db.exec(skillGuards);
  db.exec(resourceGuards());
  db.exec(projectGuards);
  db.exec(goalGuards + goalHistoryScopeGuards);
  db.exec(sourceGuards + sourceDependencyGuards());
  db.exec(nutritionTrainingGuards());
  db.exec(
    ownerGuards([
      ...coreOwnedTables,
      ...sourceOwnedTables,
      ...habitOwnedTables,
      ...healthOwnedTables,
      ...goalOwnedTables,
      ...projectOwnedTables,
      ...skillOwnedTables,
      ...retainedOwnedTables,
      "task_steps",
    ]),
  );
}
