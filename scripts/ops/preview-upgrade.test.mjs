import test from "node:test";
import assert from "node:assert/strict";
import {
  upgradeExistingProtocol,
  recoverExistingProtocol,
} from "./preview-upgrade-core.mjs";
function fixture(fault = "") {
  const events = [];
  let version = 9,
    journal,
    migrations = 0;
  const candidate = {
      sha: "a".repeat(40),
      schema: 10,
      path: "disposable-candidate",
    },
    fallback = { sha: "a".repeat(40), schema: 10, path: "disposable-fallback" };
  const operation = (name) => async () => {
    events.push(name);
    if (fault === name) throw new Error("ISOLATED_FAULT");
  };
  const io = {
    authorize: operation("gate"),
    originalCheckpoint: async () => ({ originalSchema: 9 }),
    prepareCompatiblePair: async () => {
      events.push("pair");
      return { candidate, fallback };
    },
    stopFrozenWorker: operation("stop"),
    freeSingleWriter: operation("free"),
    backupAndProveRecovery: async () => {
      events.push("backup-and-migrated-clone-preflight");
      return { originalSchema: 9, privateBackup: "isolated-v9" };
    },
    save: async (value) => {
      journal = structuredClone(value);
      events.push(`save:${value.phase}`);
    },
    armNewWorker: operation("arm-blocked-worker"),
    migrateSameFile: async () => {
      events.push("migrate");
      migrations++;
      if (fault === "precommit") throw new Error("ROLLBACK");
      version = 10;
      if (fault === "lost-commit-response") throw new Error("LOST_RESPONSE");
    },
    schemaVersion: async () => version,
    restoreOldWorker: async () => {
      assert.equal(version, 9);
      events.push("old-v9");
    },
    publishCompatiblePair: operation("publish-v10"),
    startAndProve: async (release) => {
      assert.equal(version, release.schema);
      events.push(`start:${release.path}`);
      if (fault === "candidate" && release === candidate)
        throw new Error("CANDIDATE_HEALTH");
    },
    selectFallback: operation("select-compatible-fallback"),
  };
  return {
    io,
    events,
    get journal() {
      return journal;
    },
    get migrations() {
      return migrations;
    },
  };
}
test("operator upgrade gates, backup/clone/fallback before same-file migration, never reset", async () => {
  const f = fixture();
  assert.deepEqual(await upgradeExistingProtocol(f.io), {
    upgrade: "PROVISIONED_V2",
    reset: "NOT_PERFORMED",
  });
  assert.ok(
    f.events.indexOf("backup-and-migrated-clone-preflight") <
      f.events.indexOf("migrate"),
  );
  assert.ok(f.events.indexOf("save:prepared") < f.events.indexOf("migrate"));
  assert.equal(f.journal.phase, "complete-v10");
  assert.equal(f.migrations, 1);
});
test("a failed CI/control gate cannot stop/migrate", async () => {
  const f = fixture("gate");
  await assert.rejects(upgradeExistingProtocol(f.io));
  assert.deepEqual(f.events, ["gate"]);
  assert.equal(f.migrations, 0);
});
test("precommit failure restores only old v9; lost commit response requires schema-aware recovery", async () => {
  const before = fixture("precommit");
  await assert.rejects(upgradeExistingProtocol(before.io));
  assert.equal(before.journal.phase, "aborted-v9");
  assert.ok(before.events.includes("old-v9"));
  const after = fixture("lost-commit-response");
  await assert.rejects(upgradeExistingProtocol(after.io));
  assert.equal(after.journal.phase, "recovery-required-v10");
  assert.ok(!after.events.includes("old-v9"));
  await recoverExistingProtocol(after.io, after.journal);
  assert.equal(after.journal.phase, "complete-v10");
  assert.equal(after.migrations, 1);
});
test("failed candidate uses schema-compatible fallback, never v9", async () => {
  const f = fixture("candidate");
  await upgradeExistingProtocol(f.io);
  assert.ok(f.events.includes("start:disposable-fallback"));
  assert.ok(!f.events.includes("old-v9"));
});

test("crash boundary before stop keeps recovery checkpoint; schema-v9 recovery does not migrate", async () => {
  const f = fixture("stop");
  await assert.rejects(upgradeExistingProtocol(f.io));
  assert.equal(f.journal.phase, "release-prepared");
  assert.equal(f.migrations, 0);
  f.io.stopFrozenWorker = async () => {};
  await recoverExistingProtocol(f.io, f.journal);
  assert.equal(f.journal.phase, "aborted-v9");
  assert.equal(f.migrations, 0);
  assert.ok(f.events.includes("old-v9"));
});
test("arming or final main-gate failure restores v9; publication failure never starts v9 on v10", async () => {
  const armed = fixture("arm-blocked-worker");
  await assert.rejects(upgradeExistingProtocol(armed.io));
  assert.equal(armed.journal.phase, "aborted-v9");
  assert.equal(armed.migrations, 0);
  const gate = fixture();
  let calls = 0;
  gate.io.authorize = async () => {
    if (++calls === 3) throw new Error("MAIN_SUPERSEDED");
  };
  await assert.rejects(upgradeExistingProtocol(gate.io));
  assert.equal(gate.journal.phase, "aborted-v9");
  assert.equal(gate.migrations, 0);
  const published = fixture("publish-v10");
  await assert.rejects(upgradeExistingProtocol(published.io));
  assert.equal(published.journal.phase, "prepared");
  assert.equal(published.migrations, 1);
  assert.ok(!published.events.includes("old-v9"));
  published.io.publishCompatiblePair = async () => {};
  await recoverExistingProtocol(published.io, published.journal);
  assert.equal(published.journal.phase, "complete-v10");
  assert.equal(published.migrations, 1);
});
