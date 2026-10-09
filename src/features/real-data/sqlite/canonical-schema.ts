import "server-only";
import { previewDeleteGuards, resetMetadataSchema } from "./reset-schema";
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
export function initializeCanonicalSchema(
  db: Database.Database,
  options: { legacyV9?: boolean } = {},
) {
  const exec = (sql: string) =>
    db.exec(options.legacyV9 ? sql : previewDeleteGuards(sql));
  exec(coreSchema);
  exec(sourceSchema);
  exec(habitSchema);
  exec(healthSchema);
  exec(goalSchema);
  exec(projectSchema);
  exec(skillSchema);
  exec(taskStepSchema);
  exec(retainedSchema);
  exec(retainedGuards());
  exec(skillGuards);
  exec(resourceGuards());
  exec(projectGuards);
  exec(goalGuards + goalHistoryScopeGuards);
  exec(sourceGuards + sourceDependencyGuards());
  exec(nutritionTrainingGuards());
  exec(
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
  if (!options.legacyV9) db.exec(resetMetadataSchema);
}
