import { createRequire } from "node:module";
import { dirname } from "node:path";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const [compiled, path, owner] = process.argv.slice(2);
if (
  !realpathSync(dirname(path)).startsWith(
    `${realpathSync(tmpdir())}/life-os-116-`,
  )
)
  throw new Error("SYNTHETIC_PATH_REQUIRED");
const Database = require("better-sqlite3");
const { configureConnection } = require(`${compiled}/runtime.js`);
const { completeLinkedTask } = require(
  `${compiled}/commands/source-commands.js`,
);
const { executeProjectDepthInTransaction } = require(
  `${compiled}/commands/project-depth-commands.js`,
);
const { projectCommitSnapshot, validateProjectCommit } = require(
  `${compiled}/project-invariants.js`,
);
const { taskCompletionSnapshot, validateTaskCompletionCommit } = require(
  `${compiled}/task-completion-parent.js`,
);
const db = new Database(path, { fileMustExist: true, timeout: 5000 });
configureConnection(db);
const meta = db
  .prepare("SELECT dataset_kind,owner_id FROM runtime_metadata")
  .get();
if (meta.dataset_kind !== "synthetic" || meta.owner_id !== owner)
  throw new Error("SYNTHETIC_OWNER_REQUIRED");
let marker = null;
db.function("life_owner", () => owner);
db.function("life_command", () => marker);
const finish = (response) => {
  db.close();
  process.send(response, () => process.disconnect());
};
process.send({ ready: true });
process.once("message", (request) => {
  try {
    marker = request.archive ? "project.project.archive" : "source.complete";
    process.send({ entering: true });
    db.exec("BEGIN IMMEDIATE");
    const projectBefore = projectCommitSnapshot(db, owner),
      taskBefore = taskCompletionSnapshot(db, owner);
    if (request.archive)
      executeProjectDepthInTransaction(db, owner, request.archive);
    else if (request.alternative)
      db.prepare(
        "UPDATE tasks SET completed_at=? WHERE user_id=? AND id=?",
      ).run(request.at, owner, request.taskId);
    else completeLinkedTask(db, owner, request.taskId, request.at);
    validateTaskCompletionCommit(db, owner, taskBefore);
    validateProjectCommit(db, owner, projectBefore);
    if (request.hold) {
      process.send({ held: true });
      process.once("message", (message) => {
        if (message !== "commit") throw new Error("INVALID_BARRIER");
        db.exec("COMMIT");
        finish({ ok: true });
      });
    } else {
      db.exec("COMMIT");
      finish({ ok: true });
    }
  } catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    finish({ ok: false, error: error.message });
  }
});
