import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
const require = createRequire(import.meta.url), Database = require("better-sqlite3");
const [compiled, path, owner] = process.argv.slice(2);
if (!realpathSync(dirname(path)).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
const { configureConnection } = require(`${compiled}/runtime.js`);
const { completeInboxTriage, saveInboxClarification } = require(`${compiled}/commands/inbox-commands.js`);
const { issueOwnerContext, requireOwnerContext } = require(`${compiled}/owner-context.js`);
const db = new Database(path, { fileMustExist: true });
configureConnection(db);
const meta = db.prepare("SELECT dataset_kind,owner_id FROM runtime_metadata").get();
if (meta.dataset_kind !== "synthetic" || meta.owner_id !== owner) throw new Error("SYNTHETIC_OWNER_REQUIRED");
const context = issueOwnerContext(owner);
let marker = null;
db.function("life_owner", () => requireOwnerContext(context));
db.function("life_command", () => marker);
const finish = response => { db.close(); process.send(response, () => process.disconnect()); };
process.send({ ready: true });
process.once("message", request => {
  try {
    marker = request.operation === "save" ? "inbox.save" : "inbox.complete";
    db.exec("BEGIN IMMEDIATE");
    const result = request.operation === "save"
      ? saveInboxClarification(db, owner, request.input)
      : completeInboxTriage(db, owner, request.input);
    if (request.hold) {
      process.send({ held: true });
      process.once("message", message => {
        try {
          if (message !== "commit") throw new Error("INVALID_BARRIER");
          db.exec("COMMIT"); finish({ ok: true });
        } catch (error) { if (db.inTransaction) db.exec("ROLLBACK"); finish({ ok: false, error: error.message }); }
      });
    } else { db.exec("COMMIT"); finish({ ok: true, result }); }
  } catch (error) { if (db.inTransaction) db.exec("ROLLBACK"); finish({ ok: false, error: error.message }); }
});
