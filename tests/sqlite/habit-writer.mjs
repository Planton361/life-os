// This independent process executes the compiled feature command, not a second
// implementation of its target arithmetic. Only fresh synthetic DBs are allowed.
import Database from "better-sqlite3";
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
const [path, owner, habit] = process.argv.slice(2);
const directory = realpathSync(dirname(path));
if (!directory.startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
const require = createRequire(import.meta.url);
const { incrementHabit } = require(join(directory, "habit-command.cjs"));
const { compareDecimals } = require(join(directory, "codecs.cjs"));
const db = new Database(path, { fileMustExist: true, timeout: 5000 });
db.pragma("foreign_keys=ON"); db.pragma("busy_timeout=5000"); db.pragma("synchronous=FULL");
db.function("life_owner", () => owner);
db.function("life_command", () => "habit.increment");
db.function("decimal_compare", { deterministic: true }, (a, b) => a === null || b === null ? null : compareDecimals(String(a), String(b)));
const metadata = db.prepare("SELECT dataset_kind,owner_id FROM runtime_metadata WHERE singleton=1").get();
if (metadata.dataset_kind !== "synthetic" || metadata.owner_id !== owner) throw new Error("SYNTHETIC_OWNER_REQUIRED");
process.stdout.write("READY\n");
process.stdin.once("data", () => {
  try {
    const status = db.transaction(() => incrementHabit(db, owner, habit, "2026-10-06T10:00:00.123456Z")).immediate();
    process.stdout.write(`${status}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
  finally { db.close(); }
});
