import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  realpathSync,
  writeFileSync,
  lstatSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { compileRuntime } from "../../tests/sqlite/compile-runtime.mjs";
import { upgradeExistingProtocol } from "./preview-upgrade-core.mjs";
import { leaseFree } from "./preview-cd-host.mjs";

test("native operator backup/isolated recovery/v9→v10 protocol preserves owned rows, inode and lease; no reset", async () => {
  const source = process.cwd(),
    root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-142-operator-")),
    path = join(root, "canonical.db"),
    backup = join(root, "private-v9.db"),
    clone = join(root, "recovery-v10.db");
  const compiled = compileRuntime([
      "src/features/real-data/sqlite/production-bootstrap.ts",
    ]),
    require = createRequire(import.meta.url),
    Database = require("better-sqlite3");
  const native = (name) => require(join(compiled, `${name}.js`)),
    owner = randomUUID();
  writeFileSync(path, "", { mode: 0o600 });
  const db = new Database(path);
  native("runtime").configureConnection(db);
  db.function("life_owner", () => owner);
  db.function("life_command", () => "runtime.bootstrap");
  native("canonical-schema").initializeCanonicalSchema(db, { legacyV9: true });
  db.prepare(
    "INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id,compatibility_ready) VALUES(1,9,'canonical',?,1)",
  ).run(owner);
  db.prepare(
    "INSERT INTO profiles(id,created_at,updated_at) VALUES(?,life_now(),life_now())",
  ).run(owner);
  db.prepare(
    "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','Operator proof','Keep data',life_now(),life_now())",
  ).run(randomUUID(), owner);
  db.pragma("user_version=9");
  db.close();
  const identity = lstatSync(path),
    lease = native("writer-lease").acquireWriterLease(path);
  const config = { database: path, workerSource: source };
  assert.equal(leaseFree(config, source), false);
  lease();
  const helper = resolve("scripts/ops/preview-upgrade-database.mjs");
  function command(op, file, destination) {
    const result = spawnSync(
      process.execPath,
      [
        "--conditions=react-server",
        helper,
        source,
        op,
        ...(file ? [file] : []),
        ...(destination ? [destination] : []),
      ],
      {
        env: { PATH: process.env.PATH, TMPDIR: realpathSync(tmpdir()) },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  const versions = [],
    journal = [],
    gateway = "fixture-gateway-unchanged";
  let stopped = false,
    app;
  const candidate = { schema: 10, compatibility: "v10-private-preview" },
    fallback = { schema: 10, compatibility: "v10-private-preview" };
  const io = {
    authorize: async () => assert.equal(gateway, "fixture-gateway-unchanged"),
    prepareCompatiblePair: async () => ({ candidate, fallback }),
    originalCheckpoint: async () => ({ schema: 9 }),
    prepareHelpers: async () =>
      assert.equal(command("dependencies"), "UPGRADE_DEPENDENCIES_PASS"),
    stoppedCheckpoint: async (checkpoint) => ({ ...checkpoint, stopped: true }),
    assertOperatorHandoff: async () => {},
    save: async (j) => {
      journal.push(j.phase);
    },
    stopFrozenWorker: async () => {
      stopped = true;
    },
    freeSingleWriter: async () => {
      app?.close();
      app = null;
      assert.equal(leaseFree(config, source), true);
    },
    backupAndProveRecovery: async () => {
      assert.equal(stopped, true);
      assert.equal(command("backup", path, backup), "BACKUP_PASS");
      assert.equal(command("version", backup), "9");
      assert.equal(command("backup", backup, clone), "BACKUP_PASS");
      assert.equal(command("migrate", clone), "MIGRATION_PASS");
      for (const release of [candidate, fallback])
        assert.equal(
          native("production-bootstrap").verifyProductionApplicationDatabase(
            clone,
          ).schemaVersion,
          release.schema,
        );
      assert.equal(command("version", path), "9");
      return { schema: 9, backup };
    },
    armNewWorker: async () => assert.equal(command("version", path), "9"),
    migrateSameFile: async () => {
      assert.equal(command("migrate", path), "MIGRATION_PASS");
    },
    schemaVersion: async () => Number(command("version", path)),
    prepareV9Recovery: async () => true,
    restoreOldWorker: async () => {
      assert.equal(command("version", path), "9");
    },
    publishCompatiblePair: async (pair) => {
      assert.equal(pair.candidate.compatibility, pair.fallback.compatibility);
    },
    startAndProve: async (release) => {
      versions.push(release.schema);
      app = new (native("runtime").SqliteRuntime)(path);
      assert.equal(leaseFree(config, source), false);
      assert.deepEqual(
        app.read(native("owner-context").issueOwnerContext(owner), (db) =>
          db.prepare("SELECT body FROM journal_entries").get(),
        ),
        { body: "Keep data" },
      );
    },
    selectFallback: async () => {},
  };
  try {
    assert.deepEqual(await upgradeExistingProtocol(io), {
      upgrade: "PROVISIONED_V2",
      reset: "NOT_PERFORMED",
    });
    assert.deepEqual(versions, [10]);
    assert.equal(lstatSync(path).ino, identity.ino);
    assert.equal(lstatSync(path).dev, identity.dev);
    assert.equal(command("version", backup), "9");
    assert.equal(journal.at(-1), "complete-v10");
  } finally {
    app?.close();
  }
});

test("clean operator source without node_modules uses release dependencies for every native helper before stop", async () => {
  const root = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-142-clean-source-"),
  );
  const source = join(root, "source"),
    scripts = join(source, "scripts/ops"),
    release = process.cwd();
  mkdirSync(scripts, { recursive: true, mode: 0o700 });
  copyFileSync(resolve("package.json"), join(source, "package.json"));
  for (const name of [
    "preview-upgrade-database.mjs",
    "preview-upgrade-owner.mjs",
    "preview-upgrade-native-loader.mjs",
    "preview-cd-host.mjs",
    "preview-cd-core.mjs",
  ])
    copyFileSync(resolve("scripts/ops", name), join(scripts, name));
  assert.equal(existsSync(join(source, "node_modules")), false);
  function child(name, moduleRoot, args) {
    return spawnSync(
      process.execPath,
      ["--conditions=react-server", join(scripts, name), moduleRoot, ...args],
      {
        cwd: source,
        env: { PATH: process.env.PATH, TMPDIR: realpathSync(tmpdir()) },
        encoding: "utf8",
      },
    );
  }
  // Proves that accidental resolution from the clean source really fails.
  assert.notEqual(
    child("preview-upgrade-database.mjs", source, ["dependencies"]).status,
    0,
  );
  for (const op of ["dependencies", "legacy-dependencies"]) {
    const result = child("preview-upgrade-database.mjs", release, [op]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "UPGRADE_DEPENDENCIES_PASS");
  }
  const compiled = compileRuntime([
      "src/features/real-data/sqlite/production-bootstrap.ts",
    ]),
    require = createRequire(import.meta.url);
  const path = join(root, "canonical.db"),
    backup = join(root, "backup.db"),
    owner = randomUUID();
  writeFileSync(path, "", { mode: 0o600 });
  const Database = require("better-sqlite3"),
    db = new Database(path);
  const native = (name) => require(join(compiled, `${name}.js`));
  native("runtime").configureConnection(db);
  db.function("life_owner", () => owner);
  db.function("life_command", () => "runtime.bootstrap");
  native("canonical-schema").initializeCanonicalSchema(db, { legacyV9: true });
  db.prepare(
    "INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id,compatibility_ready) VALUES(1,9,'canonical',?,1)",
  ).run(owner);
  db.prepare(
    "INSERT INTO profiles(id,created_at,updated_at) VALUES(?,life_now(),life_now())",
  ).run(owner);
  db.pragma("user_version=9");
  db.close();
  for (const [op, args, expected] of [
    ["backup", [path, backup], "BACKUP_PASS"],
    ["version", [backup], "9"],
    ["migrate", [backup], "MIGRATION_PASS"],
    ["version", [backup], "10"],
  ]) {
    const result = child("preview-upgrade-database.mjs", release, [
      op,
      ...args,
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), expected);
  }
  const identity = child("preview-upgrade-owner.mjs", release, [backup]);
  assert.equal(identity.status, 0, identity.stderr);
  assert.equal(identity.stdout, owner);
  // A failed dependency admission is part of preparation, never post-stop.
  let stopped = false;
  const io = {
    authorize: async () => {},
    prepareCompatiblePair: async () => ({}),
    prepareHelpers: async () => {
      const result = child("preview-upgrade-database.mjs", source, [
        "dependencies",
      ]);
      if (result.status !== 0) throw new Error("UPGRADE_DEPENDENCIES_INVALID");
    },
    stopFrozenWorker: async () => {
      stopped = true;
    },
  };
  await assert.rejects(
    upgradeExistingProtocol(io),
    /UPGRADE_DEPENDENCIES_INVALID/,
  );
  assert.equal(stopped, false);
});
