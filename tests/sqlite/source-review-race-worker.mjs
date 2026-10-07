import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
const require = createRequire(import.meta.url),
  Database = require("better-sqlite3");
const [compiled, path, owner] = process.argv.slice(2);
if (
  !realpathSync(dirname(path)).startsWith(
    `${realpathSync(tmpdir())}/life-os-116-`,
  )
)
  throw new Error("SYNTHETIC_PATH_REQUIRED");
const { configureConnection } = require(`${compiled}/runtime.js`);
const { scheduleLinkedSource, completeLinkedTask } = require(
  `${compiled}/commands/source-commands.js`,
);
const { setProjectResourceRole } = require(
  `${compiled}/commands/resource-commands.js`,
);
const { saveReview } = require(`${compiled}/commands/review-commands.js`);
const { issueOwnerContext, requireOwnerContext } = require(
  `${compiled}/owner-context.js`,
);
const db = new Database(path, { fileMustExist: true });
configureConnection(db);
const meta = db
  .prepare("SELECT dataset_kind,owner_id FROM runtime_metadata")
  .get();
if (meta.dataset_kind !== "synthetic" || meta.owner_id !== owner)
  throw new Error("SYNTHETIC_OWNER_REQUIRED");
const context = issueOwnerContext(owner);
let marker = null;
db.function("life_owner", () => requireOwnerContext(context));
db.function("life_command", () => marker);
const finish = (response) => {
  db.close();
  process.send(response, () => process.disconnect());
};
process.send({ ready: true });
process.once("message", (request) => {
  try {
    marker = {
      schedule: "source.schedule",
      complete: "source.complete",
      primary: "resource.artifact",
      review: "review.save",
      raw: "task.update",
      reopen: "task.reopen",
    }[request.operation];
    if (!marker) throw new Error("INVALID_OPERATION");
    db.exec("BEGIN IMMEDIATE");
    const input = request.input;
    if (request.operation === "schedule")
      scheduleLinkedSource(
        db,
        owner,
        input.sourceType,
        input.sourceId,
        input.plannedDate,
        input.scheduledStartAt,
        input.durationMinutes,
      );
    else if (request.operation === "complete")
      completeLinkedTask(db, owner, input.taskId, input.completedAt);
    else if (request.operation === "primary")
      setProjectResourceRole(db, owner, input);
    else if (request.operation === "review") saveReview(db, owner, input);
    else if (request.operation === "reopen")
      db.prepare(
        "UPDATE tasks SET status='planned',completed_at=NULL WHERE user_id=? AND id=?",
      ).run(owner, input.taskId);
    else
      db.prepare(
        "UPDATE tasks SET status='canceled',scheduled_start_at=NULL WHERE user_id=? AND id=?",
      ).run(owner, input.taskId);
    if (request.hold) {
      process.send({ held: true });
      process.once("message", (message) => {
        try {
          if (message !== "commit") throw new Error("INVALID_BARRIER");
          db.exec("COMMIT");
          finish({ ok: true });
        } catch (error) {
          if (db.inTransaction) db.exec("ROLLBACK");
          finish({ ok: false, error: error.message });
        }
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
