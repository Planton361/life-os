import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
const { configureConnection } = require(join(compiled, "runtime.js"));
const { issueOwnerContext } = require(join(compiled, "owner-context.js"));
const { createSqliteTaskRepository } = require(
  join(compiled, "repositories/task-repository.js"),
);
const { sourceTaskCommands } = require(
  join(compiled, "commands/source-commands.js"),
);
const Database = require("better-sqlite3");
const db = new Database(path, { fileMustExist: true, timeout: 5000 });
configureConnection(db);
const { taskCompletionSnapshot, validateTaskCompletionCommit } = require(
  join(compiled, "task-completion-parent.js"),
);
const { projectCommitSnapshot, validateProjectCommit } = require(
  join(compiled, "project-invariants.js"),
);
let marker = null;
db.function("life_owner", () => owner);
db.function("life_command", () => marker);
// Application instances retain the single-writer lease. As in the existing
// independent-process concurrency fixtures, raw connections exercise the real
// repository body under the same SQLite transaction and pre-commit guards.
const store = {
  read: (_ctx, body) => body(db, owner),
  command: (_ctx, kind, body) => {
    marker = kind;
    try {
      db.exec("BEGIN IMMEDIATE");
      const tasks = taskCompletionSnapshot(db, owner),
        projects = projectCommitSnapshot(db, owner);
      const result = body(db, owner);
      validateTaskCompletionCommit(db, owner, tasks);
      validateProjectCommit(db, owner, projects);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      if (db.inTransaction) db.exec("ROLLBACK");
      throw error;
    }
  },
  close: () => db.close(),
};
const context = issueOwnerContext(owner);
store.read(context, (db) => {
  const metadata = db
    .prepare("SELECT dataset_kind,owner_id FROM runtime_metadata")
    .get();
  if (metadata.dataset_kind !== "synthetic" || metadata.owner_id !== owner)
    throw new Error("SYNTHETIC_OWNER_REQUIRED");
});
process.send({ ready: true });
process.once("message", async (request) => {
  const command = store.command.bind(store);
  // Hold the real repository's admitted BEGIN IMMEDIATE transaction. Another
  // process must wait and then revalidate the original CAS token.
  if (request.hold)
    store.command = (ctx, kind, body) =>
      command(ctx, kind, (db, id) => {
        process.send({ held: true });
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
        return body(db, id);
      });
  process.send({ entering: true });
  const repository = createSqliteTaskRepository(
    store,
    context,
    sourceTaskCommands,
  );
  const input = {
    userId: owner,
    profileId: owner,
    taskId: request.taskId,
    expectedUpdatedAt: request.expectedUpdatedAt,
  };
  const result = request.release
    ? await repository.releaseInboxTask(input)
    : await repository.updateTask({
        ...input,
        title: "Concurrent metadata",
        status: "inbox",
      });
  store.close();
  process.send(
    { ok: result.ok, ...(result.ok ? {} : { error: result.error.message }) },
    () => process.disconnect(),
  );
});
