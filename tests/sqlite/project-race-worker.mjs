import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  Database = require("better-sqlite3");
const [compiled, path, owner] = process.argv.slice(2);
const { configureConnection } = require(`${compiled}/runtime.js`);
const { issueOwnerContext, requireOwnerContext } = require(
  `${compiled}/owner-context.js`,
);
const { executeProjectDepthInTransaction } = require(
  `${compiled}/commands/project-depth-commands.js`,
);
const { projectCommitSnapshot, validateProjectCommit } = require(
  `${compiled}/project-invariants.js`,
);
const db = new Database(path, { fileMustExist: true });
configureConnection(db);
if (
  db.prepare("SELECT dataset_kind FROM runtime_metadata").get().dataset_kind !==
  "synthetic"
)
  throw new Error("SYNTHETIC_REQUIRED");
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
    marker = request.mutation
      ? "resource.edit"
      : `project.${request.command.operation}`;
    db.exec("BEGIN IMMEDIATE");
    const before = projectCommitSnapshot(db, owner);
    let result;
    if (request.mutation) {
      const { kind, id } = request.mutation;
      if (kind === "edit")
        db.prepare(
          "UPDATE resources SET title='Edited during Review' WHERE user_id=? AND id=?",
        ).run(owner, id);
      else if (kind === "unlink")
        db.prepare(
          "DELETE FROM resource_relations WHERE user_id=? AND id=?",
        ).run(owner, id);
      else if (kind === "archive")
        db.prepare(
          "UPDATE resources SET archived_at=life_now() WHERE user_id=? AND id=?",
        ).run(owner, id);
      else throw new Error("INVALID_MUTATION");
      result = { mutation: kind };
    } else
      result = executeProjectDepthInTransaction(db, owner, request.command);
    validateProjectCommit(db, owner, before);
    if (request.hold) {
      process.send({ held: true, result });
      process.once("message", (message) => {
        try {
          if (message !== "commit") throw new Error("INVALID_BARRIER");
          db.exec("COMMIT");
          finish({ ok: true, result });
        } catch (error) {
          if (db.inTransaction) db.exec("ROLLBACK");
          finish({ ok: false, error: error.message });
        }
      });
    } else {
      db.exec("COMMIT");
      finish({ ok: true, result });
    }
  } catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    finish({ ok: false, error: error.message });
  }
});
