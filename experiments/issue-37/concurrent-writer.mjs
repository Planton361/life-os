import { openDb, owner } from "./fixture.mjs";

const [path, operation, projectId, firstTask, secondTask, holdArg = "0"] = process.argv.slice(2);
const holdMs = Number(holdArg);
if (!path || !["edge", "complete", "reopen"].includes(operation) ||
    !projectId || !firstTask || !secondTask || !Number.isInteger(holdMs) || holdMs < 0) {
  throw new Error("Invalid concurrency worker arguments");
}
const db = openDb(path);
try {
  db.exec("BEGIN IMMEDIATE");
  if (operation === "edge") {
    db.prepare(`INSERT INTO task_dependencies
      (id,user_id,project_id,predecessor_task_id,successor_task_id,created_at)
      VALUES(lower(hex(randomblob(16))),?,?,?,?,?)`).run(owner, projectId, firstTask, secondTask, new Date().toISOString());
  } else if (operation === "complete") {
    db.prepare("UPDATE tasks SET status='done',completed_at=?,updated_at=? WHERE user_id=? AND id=?")
      .run(new Date().toISOString(), new Date().toISOString(), owner, firstTask);
  } else {
    db.prepare("UPDATE tasks SET status='planned',completed_at=NULL,updated_at=? WHERE user_id=? AND id=?")
      .run(new Date().toISOString(), owner, firstTask);
  }
  process.stdout.write("LOCKED\n");
  if (holdMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, holdMs);
  db.exec("COMMIT");
  process.stdout.write("COMMITTED\n");
} catch (error) {
  db.exec("ROLLBACK");
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  db.close();
}
