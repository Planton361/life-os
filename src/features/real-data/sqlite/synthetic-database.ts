import "server-only";
import Database from "better-sqlite3";
import { chmodSync, lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { tmpdir } from "node:os";
import { coreSchema, coreOwnedTables, ownerGuards } from "./core-schema";
import { configureConnection, schemaVersion } from "./runtime";
import { uuid, timestamp } from "./codecs";
import { reserveFreshDatabase } from "./file-boundary";
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
import { taskStepSchema } from "./task-step-schema";

function reserveSyntheticTarget(path: string) {
  // The caller first creates a fresh mkdtemp directory. No canonical/profile
  // location and no existing DB is accepted by initialization/restore tooling.
  const root = realpathSync(tmpdir());
  const directory = dirname(path);
  if (!isAbsolute(path) || resolve(path) !== path || !directory.startsWith(`${root}/life-os-116-`) || realpathSync(directory) !== directory)
    throw new Error("FRESH_SYNTHETIC_PATH_REQUIRED");
  if (!lstatSync(directory).isDirectory()) throw new Error("SYNTHETIC_DIRECTORY_REQUIRED");
  chmodSync(directory, 0o700);
  reserveFreshDatabase(path);
}

export function initializeSyntheticDatabase(path: string, ownerId: string) {
  ownerId = uuid(ownerId);
  reserveSyntheticTarget(path);
  const db = new Database(path);
  db.function("life_owner", () => ownerId);
  db.function("life_command", () => "synthetic.initialize");
  try {
    configureConnection(db);
    db.transaction(() => {
      db.exec(coreSchema);
      db.exec(sourceSchema);
      db.exec(habitSchema);
      db.exec(healthSchema);
      db.exec(goalSchema);
      db.exec(projectSchema);
      db.exec(skillSchema);
      db.exec(taskStepSchema);
      db.exec(skillGuards);
      db.exec(projectGuards);
      db.exec(goalGuards + goalHistoryScopeGuards);
      db.exec(sourceGuards + sourceDependencyGuards());
      db.exec(ownerGuards([...coreOwnedTables, ...sourceOwnedTables, ...habitOwnedTables, ...healthOwnedTables, ...goalOwnedTables, ...projectOwnedTables, ...skillOwnedTables, "task_steps"]));
      db.prepare("INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id) VALUES(1,?,'synthetic',?)").run(schemaVersion, ownerId);
      const now = timestamp(new Date().toISOString());
      db.prepare("INSERT INTO profiles(id,display_name,timezone,created_at,updated_at) VALUES(?,'Synthetic owner','Europe/Berlin',?,?)").run(ownerId, now, now);
      db.pragma(`user_version=${schemaVersion}`);
    }).immediate();
    if (db.pragma("integrity_check", { simple: true }) !== "ok" || (db.pragma("foreign_key_check") as unknown[]).length)
      throw new Error("SYNTHETIC_INITIALIZATION_FAILED");
    db.pragma("wal_checkpoint(TRUNCATE)");
  } finally { db.close(); }
}
