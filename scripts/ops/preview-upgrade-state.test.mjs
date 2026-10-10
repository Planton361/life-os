import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cli, commands } from "./preview-cd.mjs";
import { atomicJson, readJson, operationalLock } from "./preview-cd-host.mjs";
import { initialState } from "./preview-cd-core.mjs";
import {
  stoppedOperatorCheckpoint,
  assertOperatorHandoff,
  assertConfirmedOperatorPrefix,
  upgradedOperatorState,
} from "./preview-upgrade-state.mjs";
import {
  upgradeExistingProtocol,
  recoverExistingProtocol,
} from "./preview-upgrade-core.mjs";

async function fixture({ late, fault } = {}) {
  const root = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-142-commands-"),
  );
  const statePath = join(root, "state.json"),
    journalPath = join(root, "upgrade-v2.json");
  const state = initialState({ path: "v9-last-good" });
  for (const op of ["rollback", "disable", "enable", "retry"])
    await cli([op, root]);
  commands(root, state);
  state.rollbackRequested = false;
  state.lastGood = { path: "v9-completed-rollback" };
  atomicJson(statePath, state);
  const early = structuredClone(state),
    pair = {
      candidate: { path: "v10-candidate" },
      fallback: { path: "v10-compatible-fallback" },
    };
  let version = 9,
    migrations = 0,
    publications = 0,
    unlock,
    stopped = false;
  const io = {
    authorize: async () => {},
    prepareCompatiblePair: async () => {
      if (late) {
        await cli([late, root]);
        const latest = readJson(statePath);
        commands(root, latest);
        atomicJson(statePath, latest);
      }
      return pair;
    },
    prepareHelpers: async () => {},
    originalCheckpoint: async () => ({
      originalState: early,
      instance: "private-fixture-instance",
    }),
    stopFrozenWorker: async () => {
      stopped = true;
      unlock = operationalLock(join(root, "worker-lease.db"), process.cwd());
    },
    freeSingleWriter: async () => assert.equal(stopped, true),
    stoppedCheckpoint: async (checkpoint) =>
      stoppedOperatorCheckpoint(root, checkpoint),
    assertOperatorHandoff: async (checkpoint) =>
      assertOperatorHandoff(root, checkpoint),
    save: async (journal) => {
      atomicJson(journalPath, journal);
    },
    backupAndProveRecovery: async () => ({ backup: "private-fixture-backup" }),
    armNewWorker: async () => {},
    migrateSameFile: async () => {
      migrations++;
      version = 10;
      if (fault === "lost-commit-response") throw new Error("LOST_RESPONSE");
    },
    schemaVersion: async () => version,
    prepareV9Recovery: async () => true,
    restoreOldWorker: async (checkpoint) => {
      assertConfirmedOperatorPrefix(root, checkpoint);
      atomicJson(statePath, checkpoint.originalState);
    },
    publishCompatiblePair: async (prepared, checkpoint) => {
      publications++;
      atomicJson(statePath, upgradedOperatorState(root, prepared, checkpoint));
    },
    startAndProve: async () => {
      assert.throws(
        () => operationalLock(join(root, "worker-lease.db"), process.cwd()),
        /ALREADY_RUNNING/,
      );
    },
    selectFallback: async () => {},
  };
  return {
    root,
    statePath,
    journalPath,
    io,
    pair,
    early,
    get migrations() {
      return migrations;
    },
    get publications() {
      return publications;
    },
    release() {
      unlock?.();
      unlock = null;
    },
  };
}
function noReplay(root, state) {
  const before = structuredClone(state);
  commands(root, state);
  assert.deepEqual(state, before);
  assert.equal(state.rollbackRequested, undefined);
}
test("real consumed rollback/disable/enable/retry plus consumed late pause retain final cursor/state without replay", async () => {
  const f = await fixture({ late: "disable" });
  try {
    await upgradeExistingProtocol(f.io);
    const state = readJson(f.statePath),
      checkpoint = readJson(f.journalPath).checkpoint;
    assert.equal(f.early.commandOffset, 4);
    assert.equal(f.early.autoEnabled, true);
    assert.equal(state.commandOffset, 5);
    assert.equal(state.autoEnabled, false);
    assert.equal(
      checkpoint.originalState.lastGood.path,
      "v9-completed-rollback",
    );
    assert.equal(checkpoint.originalState.commandOffset, 5);
    assert.equal(checkpoint.instance, "private-fixture-instance");
    state.failures = 2;
    state.retryAfter = 123;
    state.error = "NEW_FAILURE_NOT_OLD_RETRY";
    noReplay(f.root, state);
    assert.equal(f.migrations, 1);
    assert.equal(f.publications, 1);
  } finally {
    f.release();
  }
});
test("unconsumed commands at stop or arriving during backup abort v9 before migration and stay queued exactly once", async () => {
  for (const duringBackup of [false, true]) {
    const f = await fixture();
    if (duringBackup)
      f.io.backupAndProveRecovery = async () => {
        await cli(["disable", f.root]);
        return {};
      };
    else await cli(["disable", f.root]);
    try {
      await assert.rejects(
        upgradeExistingProtocol(f.io),
        /UPGRADE_PENDING_OPERATOR_COMMANDS/,
      );
      assert.equal(f.migrations, 0);
      assert.equal(f.publications, 0);
      assert.equal(readJson(f.journalPath).phase, "aborted-v9");
      const restored = readJson(f.statePath);
      assert.equal(restored.commandOffset, 4);
      commands(f.root, restored);
      assert.equal(restored.commandOffset, 5);
      assert.equal(restored.autoEnabled, false);
      assert.equal(restored.rollbackRequested, false); // the consumed rollback is not repeated
    } finally {
      f.release();
    }
  }
});
test("durable in-flight rollback and transition are never silently transplanted to v10", async () => {
  for (const change of [
    { rollbackRequested: true },
    { transition: { phase: "manual-rollback" } },
  ]) {
    const f = await fixture();
    atomicJson(f.statePath, { ...readJson(f.statePath), ...change });
    try {
      await assert.rejects(
        upgradeExistingProtocol(f.io),
        /UPGRADE_PENDING_OPERATOR_COMMANDS/,
      );
      assert.equal(f.migrations, 0);
      assert.deepEqual(readJson(f.statePath), { ...f.early, ...change });
    } finally {
      f.release();
    }
  }
});
test("lost migration response preserves confirmed cursor/pause through v10 recovery; late pending rollback fails closed", async () => {
  for (const pending of [false, true]) {
    const f = await fixture({ late: "disable", fault: "lost-commit-response" });
    try {
      await assert.rejects(upgradeExistingProtocol(f.io), /LOST_RESPONSE/);
    } finally {
      f.release();
    }
    const journal = readJson(f.journalPath);
    if (pending) await cli(["rollback", f.root]);
    try {
      if (pending) {
        await assert.rejects(
          recoverExistingProtocol(f.io, journal),
          /UPGRADE_PENDING_OPERATOR_COMMANDS/,
        );
        assert.equal(f.publications, 0);
        assert.equal(readJson(f.statePath).commandOffset, 5);
      } else {
        await recoverExistingProtocol(f.io, journal);
        const state = readJson(f.statePath);
        assert.equal(state.commandOffset, 5);
        assert.equal(state.autoEnabled, false);
        noReplay(f.root, state);
      }
      assert.equal(f.migrations, 1);
    } finally {
      f.release();
    }
  }
});
test("recovery after a pre-stop crash rereads the actual v9 state instead of restoring the early build snapshot", async () => {
  const f = await fixture();
  await cli(["disable", f.root]);
  const latest = readJson(f.statePath);
  commands(f.root, latest);
  atomicJson(f.statePath, latest);
  const journal = {
    phase: "release-prepared",
    prepared: f.pair,
    checkpoint: { originalState: f.early },
  };
  try {
    await recoverExistingProtocol(f.io, journal);
    const restored = readJson(f.statePath);
    assert.equal(restored.commandOffset, 5);
    assert.equal(restored.autoEnabled, false);
    assert.equal(f.migrations, 0);
  } finally {
    f.release();
  }
});
test("SIGKILL after stopped-checkpoint persistence releases the native lease; v9 recovery preserves latest consumed enable", async () => {
  const f = await fixture({ late: "disable" });
  const script = `import {atomicJson,readJson,operationalLock} from ${JSON.stringify(new URL("./preview-cd-host.mjs", import.meta.url).href)};
import {stoppedOperatorCheckpoint} from ${JSON.stringify(new URL("./preview-upgrade-state.mjs", import.meta.url).href)};
import {cli,commands} from ${JSON.stringify(new URL("./preview-cd.mjs", import.meta.url).href)};
const [root,source]=process.argv.slice(1); const unlock=operationalLock(root+'/worker-lease.db',source);
await cli(['disable',root]); let state=readJson(root+'/state.json');commands(root,state);atomicJson(root+'/state.json',state);
await cli(['enable',root]);state=readJson(root+'/state.json');commands(root,state);atomicJson(root+'/state.json',state);
const checkpoint=stoppedOperatorCheckpoint(root,{originalState:{commandOffset:0,autoEnabled:false}});atomicJson(root+'/crash-checkpoint.json',checkpoint);process.send('CHECKPOINT_SAVED');setInterval(()=>void unlock,1000);`;
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", script, f.root, process.cwd()],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  const message = once(child, "message"),
    exit = once(child, "exit");
  const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
  try {
    await Promise.race([
      message,
      exit.then(() => {
        throw new Error("ISOLATED_CHECKPOINT_CHILD_EXIT");
      }),
    ]);
    assert.throws(
      () => operationalLock(join(f.root, "worker-lease.db"), process.cwd()),
      /ALREADY_RUNNING/,
    );
    child.kill("SIGKILL");
    await exit;
    const checkpoint = readJson(join(f.root, "crash-checkpoint.json"));
    assert.equal(checkpoint.originalState.commandOffset, 6);
    assert.equal(checkpoint.originalState.autoEnabled, true);
    await recoverExistingProtocol(f.io, {
      phase: "stopped-worker",
      prepared: f.pair,
      checkpoint,
    });
    const restored = readJson(f.statePath);
    assert.equal(restored.commandOffset, 6);
    assert.equal(restored.autoEnabled, true);
    const before = structuredClone(restored);
    commands(f.root, restored);
    assert.deepEqual(restored, before);
  } finally {
    clearTimeout(timer);
    child.kill("SIGKILL");
    f.release();
  }
});

test("commands arriving after migration or health proof keep v10 incomplete and cannot be reinterpreted on recovery", async () => {
  for (const phase of ["migrateSameFile", "startAndProve"]) {
    const f = await fixture();
    const original = f.io[phase];
    f.io[phase] = async (...args) => {
      await original(...args);
      await cli(["rollback", f.root]);
    };
    try {
      await assert.rejects(
        upgradeExistingProtocol(f.io),
        /UPGRADE_PENDING_OPERATOR_COMMANDS/,
      );
      const journal = readJson(f.journalPath);
      assert.notEqual(journal.phase, "complete-v10");
      assert.equal(f.migrations, 1);
      assert.equal(f.publications, phase === "migrateSameFile" ? 0 : 1);
      f.release();
      await assert.rejects(
        recoverExistingProtocol(f.io, journal),
        /UPGRADE_PENDING_OPERATOR_COMMANDS/,
      );
      assert.equal(readJson(f.statePath).commandOffset, 4);
    } finally {
      f.release();
    }
  }
});

test("truncated logs, rewritten consumed prefixes and impossible cursors fail closed", async () => {
  for (const fault of ["partial", "rewritten", "shrunk", "offset", "pause"]) {
    const f = await fixture();
    try {
      const checkpoint = stoppedOperatorCheckpoint(f.root, {});
      const path = join(f.root, "commands.jsonl"),
        log = readFileSync(path, "utf8");
      if (fault === "partial") writeFileSync(path, log.trimEnd());
      if (fault === "rewritten")
        writeFileSync(path, log.replace('"rollback"', '"enable"'));
      if (fault === "shrunk") writeFileSync(path, "");
      if (fault === "offset") checkpoint.originalState.commandOffset = -1;
      if (fault === "pause") checkpoint.originalState.autoEnabled = "false";
      assert.throws(
        () => assertOperatorHandoff(f.root, checkpoint),
        /UPGRADE_(COMMAND|OPERATOR)/,
      );
    } finally {
      f.release();
    }
  }
});
