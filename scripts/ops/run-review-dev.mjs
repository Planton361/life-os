#!/usr/bin/env node
// Local review mode: `next dev` on localhost against the git-ignored review DB.
// `--reset` explicitly recreates the empty review DB and exits; starting never resets.
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { createProcessScope } from "./managed-process.mjs";
import { acquireRuntimeLock } from "./runtime-lock.mjs";
import { developmentEnv } from "./next-memory-budget.mjs";
import { reviewDatabaseModule } from "./sqlite-server-modules.mjs";

const PORT = /^\d{2,5}$/.test(process.env.PORT ?? "") ? process.env.PORT : "3000";
const ORIGIN = `http://localhost:${PORT}`;
const path = join(process.cwd(), ".local", "review", "life-os-review.db");
const { ensureReviewDatabase, resetReviewDatabase } = reviewDatabaseModule();

mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
chmodSync(dirname(path), 0o700);

if (process.argv.includes("--reset")) {
  try {
    resetReviewDatabase(path);
    console.log(`REVIEW_DATABASE_RESET ${path}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "REVIEW_RESET_FAILED");
    process.exitCode = 1;
  }
} else {
  const scope = createProcessScope();
  let release;
  try {
    release = await acquireRuntimeLock("dev");
    ensureReviewDatabase(path);
    console.log(`LIFE_OS_REVIEW_READY ${ORIGIN} database=${path}`);
    const env = developmentEnv({
      ...process.env,
      LIFE_OS_APPLICATION_RUNTIME: "sqlite-review",
      LIFE_OS_REVIEW_SQLITE_PATH: path,
      LIFE_OS_REVIEW_ORIGIN: ORIGIN,
    });
    const result = await scope.run(
      process.execPath,
      [
        createRequire(import.meta.url).resolve("next/dist/bin/next"),
        "dev",
        "--hostname",
        "localhost",
        "--port",
        PORT,
      ],
      { env, inherit: true },
    );
    process.exitCode = result.code;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "REVIEW_START_FAILED");
    process.exitCode = 1;
  } finally {
    await scope.close();
    await release?.();
  }
}
