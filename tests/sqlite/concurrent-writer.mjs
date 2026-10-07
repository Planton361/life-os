// Independent native connections for synthetic invariant races. Never opens a
// canonical/personal DB; the parent must create a fresh proof directory.
import Database from "better-sqlite3";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
const [path, owner, project, predecessor, successor, id] = process.argv.slice(2);
if (!realpathSync(dirname(path)).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
const db = new Database(path, { fileMustExist: true, timeout: 5000 });
db.pragma("foreign_keys=ON"); db.pragma("busy_timeout=5000"); db.pragma("synchronous=FULL");
db.function("life_owner", () => owner);
db.function("life_command", () => "dependency.add");
process.stdout.write("READY\n");
process.stdin.once("data", () => {
  try {
    db.transaction(() => {
      db.prepare("INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)")
        .run(id, owner, project, predecessor, successor, "2026-10-06T10:00:00.123456Z");
    }).immediate();
    process.stdout.write("COMMITTED\n");
  } catch (error) { process.stdout.write(`REJECTED:${error.message}\n`); }
  finally { db.close(); }
});
