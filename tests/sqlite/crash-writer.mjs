import Database from "better-sqlite3";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
const [path, owner, committed, uncommitted] = process.argv.slice(2);
if (!realpathSync(dirname(path)).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
const db = new Database(path, { fileMustExist: true });
db.pragma("foreign_keys=ON"); db.pragma("journal_mode=WAL"); db.pragma("synchronous=FULL");
db.function("life_owner", () => owner); db.function("life_command", () => "task.create");
const insert = db.prepare("INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,?, ?,?)");
const now = "2026-10-06T10:00:00.123456Z";
db.transaction(() => insert.run(committed, owner, "Committed before crash", now, now)).immediate();
db.exec("BEGIN IMMEDIATE");
insert.run(uncommitted, owner, "Must not survive SIGKILL", now, now);
process.stdout.write("UNCOMMITTED\n");
// No commit is reachable. The proof parent kills this process at the barrier.
process.stdin.resume();
