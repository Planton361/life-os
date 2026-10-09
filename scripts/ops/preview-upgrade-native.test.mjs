import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, realpathSync, writeFileSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { compileRuntime } from "../../tests/sqlite/compile-runtime.mjs";
import { upgradeExistingProtocol } from "./preview-upgrade-core.mjs";
import { leaseFree } from "./preview-cd-host.mjs";

test("native operator backup/isolated recovery/v9→v10 protocol preserves owned rows, inode and lease; no reset", async () => {
  const source = process.cwd(), root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-142-operator-")), path = join(root, "canonical.db"), backup = join(root, "private-v9.db"), clone = join(root, "recovery-v10.db");
  const compiled = compileRuntime(["src/features/real-data/sqlite/production-bootstrap.ts"]), require = createRequire(import.meta.url), Database = require("better-sqlite3");
  const native = name => require(join(compiled, `${name}.js`)), owner = randomUUID();
  writeFileSync(path, "", { mode: 0o600 });
  const db = new Database(path); native("runtime").configureConnection(db);
  db.function("life_owner", () => owner); db.function("life_command", () => "runtime.bootstrap");
  native("canonical-schema").initializeCanonicalSchema(db, { legacyV9: true });
  db.prepare("INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id,compatibility_ready) VALUES(1,9,'canonical',?,1)").run(owner);
  db.prepare("INSERT INTO profiles(id,created_at,updated_at) VALUES(?,life_now(),life_now())").run(owner);
  db.prepare("INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','Operator proof','Keep data',life_now(),life_now())").run(randomUUID(), owner);
  db.pragma("user_version=9"); db.close();
  const identity = lstatSync(path), lease = native("writer-lease").acquireWriterLease(path);
  const config = { database: path, workerSource: source };
  assert.equal(leaseFree(config, source), false); lease();
  const helper = resolve("scripts/ops/preview-upgrade-database.mjs");
  function command(op, file, destination) {
    const result = spawnSync(process.execPath, ["--conditions=react-server", helper, source, op, file, ...(destination ? [destination] : [])], { env: { PATH: process.env.PATH, TMPDIR: realpathSync(tmpdir()) }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  }
  const versions = [], journal = [], gateway = "fixture-gateway-unchanged";
  let stopped = false, app;
  const candidate = { schema: 10, compatibility: "v10-private-preview" }, fallback = { schema: 10, compatibility: "v10-private-preview" };
  const io = {
    authorize: async () => assert.equal(gateway, "fixture-gateway-unchanged"),
    prepareCompatiblePair: async () => ({ candidate, fallback }),
    originalCheckpoint: async () => ({ schema: 9 }),
    save: async j => { journal.push(j.phase); },
    stopFrozenWorker: async () => { stopped = true; },
    freeSingleWriter: async () => { app?.close(); app = null; assert.equal(leaseFree(config, source), true); },
    backupAndProveRecovery: async () => {
      assert.equal(stopped, true); assert.equal(command("backup", path, backup), "BACKUP_PASS");
      assert.equal(command("version", backup), "9"); assert.equal(command("backup", backup, clone), "BACKUP_PASS");
      assert.equal(command("migrate", clone), "MIGRATION_PASS");
      for (const release of [candidate, fallback]) assert.equal(native("production-bootstrap").verifyProductionApplicationDatabase(clone).schemaVersion, release.schema);
      assert.equal(command("version", path), "9"); return { schema: 9, backup };
    },
    armNewWorker: async () => assert.equal(command("version", path), "9"),
    migrateSameFile: async () => { assert.equal(command("migrate", path), "MIGRATION_PASS"); },
    schemaVersion: async () => Number(command("version", path)),
    restoreOldWorker: async () => { assert.equal(command("version", path), "9"); },
    publishCompatiblePair: async pair => { assert.equal(pair.candidate.compatibility, pair.fallback.compatibility); },
    startAndProve: async release => {
      versions.push(release.schema); app = new (native("runtime").SqliteRuntime)(path);
      assert.equal(leaseFree(config, source), false);
      assert.deepEqual(app.read(native("owner-context").issueOwnerContext(owner), db => db.prepare("SELECT body FROM journal_entries").get()), { body: "Keep data" });
    },
    selectFallback: async () => {},
  };
  try {
    assert.deepEqual(await upgradeExistingProtocol(io), { upgrade: "PROVISIONED_V2", reset: "NOT_PERFORMED" });
    assert.deepEqual(versions, [10]); assert.equal(lstatSync(path).ino, identity.ino); assert.equal(lstatSync(path).dev, identity.dev);
    assert.equal(command("version", backup), "9"); assert.equal(journal.at(-1), "complete-v10");
  } finally { app?.close(); }
});
