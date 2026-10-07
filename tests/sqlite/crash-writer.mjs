import { createRequire } from "node:module";
import { compileRuntime } from "./compile-runtime.mjs";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
const [path, owner, committed, uncommitted] = process.argv.slice(2);
if (!realpathSync(dirname(path)).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
const require = createRequire(import.meta.url), compiled = compileRuntime();
const { SqliteRuntime } = require(join(compiled, "runtime.js"));
const { issueOwnerContext } = require(join(compiled, "owner-context.js"));
const store = new SqliteRuntime(path, { syntheticProof: true }), context = issueOwnerContext(owner);
const now = "2026-10-06T10:00:00.123456Z";
const insert = (id, title) => store.command(context, "task.create", db => {
  db.prepare("INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)").run(id, owner, title, now, now);
});
insert(committed, "Committed before crash");
store.command(context, "task.create", db => {
  db.prepare("INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)").run(uncommitted, owner, "Must not survive SIGKILL", now, now);
  process.stdout.write("UNCOMMITTED\n");
  // Hold the actual runtime command and kernel writer lease at a controlled
  // barrier. No commit is reachable, including if the proof parent fails.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20_000);
  throw new Error("CRASH_PROOF_PARENT_DID_NOT_KILL");
});
