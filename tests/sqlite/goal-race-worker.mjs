import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const [compiled, path, owner] = process.argv.slice(2);
const { configureConnection } = require(`${compiled}/runtime.js`);
const {
  executeGoalCommandInTransaction,
  setGoalCurrentMilestoneInTransaction,
} = require(`${compiled}/commands/goal-commands.js`);
const { goalCommitSnapshot, validateGoalCommit } = require(
  `${compiled}/goal-invariants.js`,
);
const db = new Database(path, { fileMustExist: true });
configureConnection(db);
if (
  db.prepare("SELECT dataset_kind FROM runtime_metadata").get().dataset_kind !==
  "synthetic"
)
  throw new Error("SYNTHETIC_REQUIRED");
let marker = null;
db.function("life_owner", () => owner);
db.function("life_command", () => marker);
process.send({ ready: true });
process.once("message", (request) => {
  marker = `goal.${request.kind}`;
  let response;
  try {
    const result = db
      .transaction(() => {
        const before = goalCommitSnapshot(db, owner);
        const result = request.current
          ? setGoalCurrentMilestoneInTransaction(
              db,
              owner,
              request.payload.goal_id,
              request.payload.milestone_id,
              request.payload.expected_updated_at,
            )
          : executeGoalCommandInTransaction(db, owner, request);
        validateGoalCommit(db, owner, before);
        return result;
      })
      .immediate();
    response = { ok: true, result };
  } catch (error) {
    response = { ok: false, error: error.message };
  }
  db.close();
  process.send(response, () => process.disconnect());
});
