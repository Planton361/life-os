import Database from "better-sqlite3";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
const [path, owner, id, action] = process.argv.slice(2);
if (!realpathSync(dirname(path)).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
if (!["reopen", "complete"].includes(action)) throw new Error("PROOF_ACTION_INVALID");
const db = new Database(path, { fileMustExist: true, timeout: 5000 });
db.pragma("foreign_keys=ON"); db.pragma("busy_timeout=5000"); db.pragma("synchronous=FULL");
db.function("life_owner", () => owner); db.function("life_command", () => `task.${action}`);
const meta = db.prepare("SELECT dataset_kind,owner_id FROM runtime_metadata").get();
if (meta.dataset_kind !== "synthetic" || meta.owner_id !== owner) throw new Error("SYNTHETIC_OWNER_REQUIRED");
process.stdout.write("READY\n");
process.stdin.once("data", () => {
  try {
    db.transaction(() => {
      const status = action === "reopen" ? "planned" : "done";
      const completed = action === "reopen" ? null : "2026-10-06T11:00:00.000000Z";
      db.prepare("UPDATE tasks SET status=?,completed_at=? WHERE user_id=? AND id=?").run(status, completed, owner, id);
    }).immediate();
    process.stdout.write("COMMITTED\n");
  } catch (error) {
    if (!error.message.includes("DEPENDENCY_BLOCKED")) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
    else process.stdout.write("BLOCKED\n");
  } finally { db.close(); }
});
