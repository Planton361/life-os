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
const {
  createKnowledgeResource,
  convertWishlist,
  meetingFollowup,
  retainedCommand,
} = require(`${compiled}/commands/retained-commands.js`);
const {
  completeChallenge,
  redeemShop,
  rotateAntiRot,
  resolveAntiRot,
  setShopPaused,
} = require(`${compiled}/commands/reward-commands.js`);
const { validateRewardCommit } = require(`${compiled}/reward-invariants.js`);
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
      knowledge: "retained.knowledge",
      convert: "retained.convert",
      followup: "retained.followup",
      complete: "reward.complete",
      redeem: "reward.redeem",
      rotate: "reward.antirot",
      resolve: "reward.antirot",
      pause: "reward.item",
      archive: "retained.write",
    }[request.operation];
    if (!marker) throw new Error("INVALID_OPERATION");
    db.exec("BEGIN IMMEDIATE");
    const input = request.input;
    let result;
    if (request.operation === "knowledge")
      result = createKnowledgeResource(db, owner, request.domain, input).id;
    else if (request.operation === "convert")
      result = convertWishlist(db, owner, input).id;
    else if (request.operation === "followup")
      result = meetingFollowup(db, owner, request.kind, input).task_id;
    else if (request.operation === "complete")
      result = completeChallenge(db, owner, input);
    else if (request.operation === "redeem")
      result = redeemShop(db, owner, input);
    else if (request.operation === "rotate") result = rotateAntiRot(db, owner);
    else if (request.operation === "resolve")
      result = resolveAntiRot(db, owner, input);
    else if (request.operation === "pause")
      result = setShopPaused(db, owner, input).id;
    else if (request.operation === "archive")
      result = retainedCommand(db, owner, "shop", "archive", input).id;
    validateRewardCommit(db, owner);
    if (request.hold) {
      process.send({ held: true });
      process.once("message", (message) => {
        try {
          if (message !== "commit") throw new Error("INVALID_BARRIER");
          validateRewardCommit(db, owner);
          db.exec("COMMIT");
          finish({ ok: true, result });
        } catch (error) {
          if (db.inTransaction) db.exec("ROLLBACK");
          finish({ ok: false, error: error.message });
        }
      });
    } else {
      validateRewardCommit(db, owner);
      db.exec("COMMIT");
      finish({ ok: true, result });
    }
  } catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    finish({ ok: false, error: error.message });
  }
});
