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
    prepareHelpers: operation("helpers-before-stop"),
    stoppedCheckpoint: async (checkpoint) => ({ ...checkpoint, stopped: true }),
    assertOperatorHandoff: operation("operator-handoff"),
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
    prepareV9Recovery: async () => true,
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
  assert.equal(f.journal.phase, "aborted-v9");
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

for (const fault of ["stop", "free"]) {
  test(`stop-boundary ${fault} failure restores verified v9 without migration`, async () => {
    const f = fixture(fault);
    await assert.rejects(upgradeExistingProtocol(f.io), /ISOLATED_FAULT/);
    assert.equal(f.journal.phase, "aborted-v9");
    assert.equal(f.migrations, 0);
    assert.equal(f.events.filter((e) => e === "old-v9").length, 1);
  });
}
test("failed bootout preserves an already-running verified v9 without duplicate bootstrap", async () => {
  const f = fixture("stop");
  f.io.prepareV9Recovery = async () => false;
  await assert.rejects(upgradeExistingProtocol(f.io));
  assert.equal(f.journal.phase, "release-prepared");
  assert.ok(!f.events.includes("old-v9"));
});
test("unsafe holder or unknown schema keeps incomplete checkpoint; never starts old v9", async () => {
  for (const unknown of [false, true]) {
    const f = fixture("stop");
    if (unknown) f.io.schemaVersion = async () => 8;
    else
      f.io.prepareV9Recovery = async () => {
        throw Error("FOREIGN_LEASE");
      };
    await assert.rejects(upgradeExistingProtocol(f.io));
    assert.equal(f.journal.phase, "release-prepared");
    assert.ok(!f.events.includes("old-v9"));
  }
});
test("recovery stop failures on committed v10 retain v10-only boundary", async () => {
  const f = fixture("lost-commit-response");
  await assert.rejects(upgradeExistingProtocol(f.io));
  f.io.stopFrozenWorker = async () => {
    throw Error("STOP_FAILED");
  };
  await assert.rejects(recoverExistingProtocol(f.io, f.journal));
  assert.equal(f.journal.phase, "recovery-required-v10");
  assert.ok(!f.events.includes("old-v9"));
});

import { SupervisorHandoff } from "./preview-upgrade-stop.mjs";
function syntheticHandoff(timeout = 40) {
  const events = [];
  const h = new SupervisorHandoff({
    root: "/synthetic",
    config: {
      node: process.execPath,
      workerSource: "/synthetic/source",
      database: "/synthetic/canonical.db",
    },
    source: () => "/synthetic/source",
    timeout,
    diagnostic: (e) => events.push(e),
  });
  h.worker = { pid: 12345, serverPid: 12346, identity: "a".repeat(64) };
  h.capture = async () => null;
  h.registered = () => {
    h.observe("job", "removed");
    return null;
  };
  h.sameSupervisor = async () => {
    h.observe("supervisor", "alive");
    return true;
  };
  h.holders = (path) => {
    h.observe(
      path.endsWith("worker-lease.db") ? "workerHandles" : "databaseHandles",
      "none",
    );
    return [];
  };
  h.portBusy = async () => {
    h.observe("port", "free");
    return false;
  };
  h.writerFree = () => {
    h.observe("writerLease", "free");
    return true;
  };
  return { h, events };
}
test("handoff budgets remain bounded, legacy alone gets room for its 30s timer", () => {
  const opts = {
    root: "/synthetic",
    config: { node: process.execPath, workerSource: "/synthetic/source" },
    source: () => "/synthetic",
  };
  assert.equal(new SupervisorHandoff(opts).timeout, 30000);
  assert.equal(
    new SupervisorHandoff({ ...opts, legacyV9: true }).timeout,
    60000,
  );
  for (const timeout of [0, -1, 60001, Infinity, NaN])
    assert.throws(
      () => new SupervisorHandoff({ ...opts, timeout }),
      /HANDOFF_BUDGET_INVALID/,
    );
});
test("stuck supervisor fails with independent last observations and no secret identifiers", async () => {
  const { h, events } = syntheticHandoff();
  await assert.rejects(h.stop(), /SUPERVISOR_HANDOFF_TIMEOUT/);
  const e = events.at(-1);
  assert.equal(e.phase, "failed");
  assert.equal(e.observations.supervisor.state, "alive");
  assert.equal(e.observations.port.state, "free");
  assert.equal(e.observations.writerLease.state, "free");
  assert.equal(e.observations.workerLease.state, "unobserved");
  assert.ok(e.elapsedMs >= 40 && e.elapsedMs < 500);
  assert.doesNotMatch(JSON.stringify(e), /synthetic|12345|12346|a{64}/);
});
test("inspection helpers cannot consume more than the remaining monotonic budget; failures stay unknown", () => {
  for (const name of [
    "job",
    "supervisor",
    "workerHandles",
    "databaseHandles",
    "writerHandles",
  ]) {
    const { h } = syntheticHandoff(25);
    h.begin();
    assert.throws(
      () =>
        h.syncProbe(name, process.execPath, ["-e", "setTimeout(()=>{},10000)"]),
      /HANDOFF_PROBE_FAILED/,
    );
    assert.equal(h.observations[name].state, "unknown");
    assert.ok(h.evidence().elapsedMs < 500);
    assert.throws(() => h.probeTimeout(), /SUPERVISOR_HANDOFF_TIMEOUT/);
  }
});

test("foreign worker holders fail before admission and before migration", async () => {
  const { h } = syntheticHandoff(500);
  h.holders = (path) => (path.endsWith("worker-lease.db") ? [77777] : []);
  await assert.rejects(h.stop(), /FOREIGN_WORKER_LEASE/);
});

test("replacement launchd job and changed captured process identity fail closed", async () => {
  const first = syntheticHandoff(500);
  first.h.registered = () => "pid = 88888\n";
  await assert.rejects(first.h.stop(), /SUPERVISOR_IDENTITY_CHANGED/);
  const second = syntheticHandoff(500);
  second.h.alive = () => true;
  second.h.identity = async () => "b".repeat(64);
  second.h.sameSupervisor = SupervisorHandoff.prototype.sameSupervisor.bind(
    second.h,
  );
  await assert.rejects(second.h.stop(), /SUPERVISOR_IDENTITY_CHANGED/);
  assert.equal(second.events.at(-1).observations.identity.state, "changed");
});
test("unknown launchctl and ps output never means job removed or process exited", () => {
  const { h } = syntheticHandoff(500);
  h.begin();
  h.syncProbe = (name) => {
    h.observe(name, "unknown");
    return { status: 1, stdout: "", stderr: "inspection unavailable" };
  };
  assert.throws(
    () => SupervisorHandoff.prototype.registered.call(h),
    /LAUNCHD_STATE_UNKNOWN/,
  );
  assert.throws(
    () => SupervisorHandoff.prototype.alive.call(h, 12345),
    /SUPERVISOR_STATE_UNKNOWN/,
  );
  assert.equal(h.observations.job.state, "unknown");
  assert.equal(h.observations.supervisor.state, "unknown");
});
