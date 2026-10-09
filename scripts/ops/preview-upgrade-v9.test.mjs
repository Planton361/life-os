import test, { before } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  symlinkSync,
  lstatSync,
  cpSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { once } from "node:events";
import {
  V9_SHA,
  V9_COMPATIBILITY,
  compatibilityFingerprintV9,
  validateV9Release,
  validateV9WorkerSource,
} from "./preview-v9-contract.mjs";
import { v9DatabasePreflight, restoreV9Worker } from "./preview-upgrade-v9.mjs";
import { upgradeNativeDependencies } from "./preview-upgrade-native-loader.mjs";
import {
  atomicJson,
  readJson,
  compatibilityFingerprint,
  validateRelease,
  databasePreflight,
  operationalLock,
  pause,
} from "./preview-cd-host.mjs";
import {
  upgradeExistingProtocol,
  recoverExistingProtocol,
} from "./preview-upgrade-core.mjs";
import {
  stoppedOperatorCheckpoint,
  assertOperatorHandoff,
  upgradedOperatorState,
} from "./preview-upgrade-state.mjs";
import { cli, commands } from "./preview-cd.mjs";
import { initialState } from "./preview-cd-core.mjs";
import {
  journalDigest,
  abortedV9Evidence,
  acknowledgeAbortedV9,
  verifyAbortedV9,
  assertUpgradeJournalAdmission,
  assertFreshReattemptPair,
  durableUpgradeJournal,
  verifyRunningV9,
} from "./preview-upgrade-reattempt.mjs";

const source = process.cwd(),
  temp = realpathSync(tmpdir());
const archiveInputs = [
  ".npmrc",
  ".node-version",
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "src",
  "public",
  "scripts",
];
let historical, modern;
before(() => {
  function archive(sha) {
    const root = mkdtempSync(join(temp, "life-os-142-source-")),
      file = join(root, "source.tar"),
      dir = join(root, "release");
    mkdirSync(dir, { mode: 0o700 });
    execFileSync("git", [
      "archive",
      "--format=tar",
      `--output=${file}`,
      sha,
      ...archiveInputs,
    ]);
    execFileSync("tar", ["-xf", file, "-C", dir]);
    return dir;
  }
  historical = archive(V9_SHA);
  modern = archive("HEAD");
});
function releaseFrom(template, sha, buildId) {
  const dir = mkdtempSync(join(temp, "life-os-142-release-"));
  cpSync(template, dir, { recursive: true });
  symlinkSync(join(source, "node_modules"), join(dir, "node_modules"), "dir");
  mkdirSync(join(dir, ".next"), { mode: 0o700 });
  writeFileSync(join(dir, ".next/BUILD_ID"), buildId);
  const release = {
    path: dir,
    sha,
    buildId,
    compatibility:
      sha === V9_SHA
        ? compatibilityFingerprintV9(dir)
        : compatibilityFingerprint(dir),
  };
  atomicJson(join(dir, "preview-release.json"), release);
  return release;
}
function nativeCommand(op, path, destination) {
  const r = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      resolve("scripts/ops/preview-upgrade-database.mjs"),
      source,
      op,
      ...(path ? [path] : []),
      ...(destination ? [destination] : []),
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
async function fixture() {
  const root = mkdtempSync(join(temp, "life-os-142-v9-fixture-")),
    old = releaseFrom(historical, V9_SHA, "V9_ISOLATED"),
    candidate = releaseFrom(modern, "b".repeat(40), "V10_CANDIDATE"),
    fallback = releaseFrom(modern, "b".repeat(40), "V10_FALLBACK");
  assert.equal(
    existsSync(join(old.path, "scripts/ops/run-preview-production.mjs")),
    false,
  );
  assert.equal(
    existsSync(
      join(old.path, "src/features/real-data/sqlite/preview-reset-plan.ts"),
    ),
    false,
  );
  const path = join(root, "canonical.db"),
    owner = randomUUID();
  const { require, Database } = upgradeNativeDependencies(old.path, {
    legacy: true,
  });
  require(
    join(old.path, "src/features/real-data/sqlite/production-bootstrap.ts"),
  ).bootstrapProductionDatabase(path, {
    ownerId: owner,
    displayName: "Isolated historical v9",
    timezone: "UTC",
  });
  const db = new Database(path);
  require(
    join(old.path, "src/features/real-data/sqlite/runtime.ts"),
  ).configureConnection(db);
  db.function("life_owner", () => owner);
  db.function("life_command", () => "runtime.bootstrap");
  db.prepare(
    "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-10','Historical fixture','Retain all rows',life_now(),life_now())",
  ).run(randomUUID(), owner);
  db.close();
  const stat = lstatSync(path),
    config = {
      node: process.execPath,
      workerSource: old.path,
      database: path,
      databaseDevice: stat.dev,
      databaseInode: stat.ino,
    },
    state = initialState(old),
    plist = join(root, "fixture.plist");
  for (const op of ["rollback", "disable", "enable", "retry"])
    await cli([op, root]);
  commands(root, state);
  state.rollbackRequested = false;
  atomicJson(join(root, "state.json"), state);
  atomicJson(join(root, "config.json"), config);
  writeFileSync(plist, "OWNED_FIXTURE_PLIST", { mode: 0o600 });
  const snapshot = () => {
    const d = new Database(path, { readonly: true, fileMustExist: true });
    require(
      join(old.path, "src/features/real-data/sqlite/runtime.ts"),
    ).registerCodecs(d);
    const tables = d
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name!='runtime_metadata' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all();
    assert.equal(tables.length, 83);
    const rows = tables.map(({ name }) => [
      name,
      d.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
    ]);
    assert.equal(d.pragma("integrity_check", { simple: true }), "ok");
    assert.equal(d.pragma("foreign_key_check").length, 0);
    d.close();
    return createHash("sha256")
      .update(
        JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? String(v) : v)),
      )
      .digest("hex");
  };
  const before = snapshot(),
    helper = join(root, "owned-service.mjs"),
    ready = join(root, "ready.json");
  writeFileSync(
    helper,
    `import fs from 'node:fs';import http from 'node:http';import {upgradeNativeDependencies} from ${JSON.stringify(pathToFileURL(resolve("scripts/ops/preview-upgrade-native-loader.mjs")).href)};import {operationalLock} from ${JSON.stringify(pathToFileURL(resolve("scripts/ops/preview-cd-host.mjs")).href)};const [release,path,root,ready,buildId]=process.argv.slice(2);const unlock=operationalLock(root+'/worker-lease.db',release);const {require}=upgradeNativeDependencies(release,{legacy:true});const app=new (require(release+'/src/features/real-data/sqlite/runtime.ts').SqliteRuntime)(path);const server=http.createServer((_,res)=>res.end(buildId));server.listen(0,'127.0.0.1',()=>{fs.writeFileSync(ready,JSON.stringify({port:server.address().port,pid:process.pid}),{mode:0o600});process.send?.('READY');});process.on('SIGTERM',()=>server.close(()=>{app.close();unlock();process.exit(0);}));`,
    { mode: 0o600 },
  );
  let child,
    exit,
    unlock,
    starts = 0,
    restores = 0;
  const journal = join(root, "upgrade-v2.json");
  async function start(release) {
    child = spawn(
      process.execPath,
      [
        "--conditions=react-server",
        helper,
        release.path,
        path,
        root,
        ready,
        release.buildId,
      ],
      { stdio: ["ignore", "ignore", "pipe", "ipc"] },
    );
    exit = once(child, "exit");
    await Promise.race([
      once(child, "message"),
      exit.then(() => {
        throw Error("FIXTURE_SERVICE_EXIT");
      }),
    ]);
    const info = readJson(ready);
    assert.equal(
      await (await fetch(`http://127.0.0.1:${info.port}`)).text(),
      release.buildId,
    );
    assert.throws(
      () => operationalLock(join(root, "worker-lease.db"), source),
      /ALREADY_RUNNING/,
    );
    starts++;
  }
  async function stop() {
    if (child) {
      child.kill("SIGTERM");
      await exit;
      child = null;
    }
  }
  const early = structuredClone(state);
  const pair = { candidate, fallback };
  const io = {
    authorize: async () => {},
    prepareCompatiblePair: async () => {
      validateV9Release(old);
      await v9DatabasePreflight(config, old);
      await cli(["disable", root]);
      const latest = readJson(join(root, "state.json"));
      commands(root, latest);
      atomicJson(join(root, "state.json"), latest);
      return pair;
    },
    prepareHelpers: async () => {},
    originalCheckpoint: async () => ({
      originalConfig: config,
      originalState: early,
      originalPlist: readFileSync(plist, "utf8"),
      instance: "isolated",
    }),
    stopFrozenWorker: async () => {
      await stop();
      unlock = operationalLock(join(root, "worker-lease.db"), source);
    },
    freeSingleWriter: async () => {
      await stop();
    },
    stoppedCheckpoint: async (cp) => stoppedOperatorCheckpoint(root, cp),
    assertOperatorHandoff: async (cp) => assertOperatorHandoff(root, cp),
    save: async (j) => atomicJson(journal, j),
    backupAndProveRecovery: async () => {
      const backup = join(root, "backup.db"),
        clone = join(root, "clone.db");
      nativeCommand("backup", path, backup);
      const b = lstatSync(backup);
      await v9DatabasePreflight(
        {
          ...config,
          database: backup,
          databaseDevice: b.dev,
          databaseInode: b.ino,
        },
        old,
      );
      nativeCommand("backup", backup, clone);
      nativeCommand("migrate", clone);
      const x = lstatSync(clone);
      for (const r of [candidate, fallback])
        await databasePreflight(
          {
            ...config,
            database: clone,
            databaseDevice: x.dev,
            databaseInode: x.ino,
          },
          r,
        );
      assert.equal(nativeCommand("version", path), "9");
      return { backup, clone };
    },
    armNewWorker: async () => {},
    migrateSameFile: async () => nativeCommand("migrate", path),
    schemaVersion: async () => Number(nativeCommand("version", path)),
    restoreOldWorker: async (checkpoint) => {
      await restoreV9Worker({
        root,
        checkpoint,
        plist,
        releaseWorkerLease: async () => {
          unlock?.();
          unlock = null;
        },
        bootstrap: async () => {
          restores++;
          await start(checkpoint.originalState.lastGood);
        },
      });
    },
    publishCompatiblePair: async (p, cp) =>
      atomicJson(join(root, "state.json"), upgradedOperatorState(root, p, cp)),
    startAndProve: async (r) => {
      unlock?.();
      unlock = null;
      await start(r);
    },
    selectFallback: async () => {},
  };
  return {
    root,
    old,
    candidate,
    fallback,
    config,
    plist,
    path,
    owner,
    pair,
    io,
    journal,
    ready,
    helper,
    snapshot,
    before,
    start,
    stop,
    async killService() {
      child.kill("SIGKILL");
      await exit;
      child = null;
    },
    get restores() {
      return restores;
    },
    get starts() {
      return starts;
    },
    release() {
      unlock?.();
      unlock = null;
    },
    async cleanup() {
      await stop();
      unlock?.();
      unlock = null;
    },
    assertPreserved() {
      assert.equal(snapshot(), before);
      assert.equal(lstatSync(path).ino, stat.ino);
      assert.equal(lstatSync(path).dev, stat.dev);
    },
  };
}

test("historical source/manifest contract is explicit; missing v2 files never weaken current v10 validation", async () => {
  const f = await fixture();
  try {
    validateV9Release(f.old);
    validateV9WorkerSource(f.old.path);
    assert.equal(f.old.legacy, undefined);
    assert.equal(f.old.compatibility, V9_COMPATIBILITY);
    const original = await import(
      pathToFileURL(join(f.old.path, "scripts/ops/preview-cd-host.mjs"))
    );
    assert.equal(
      original.compatibilityFingerprint(f.old.path),
      V9_COMPATIBILITY,
    );
    assert.throws(() => validateRelease(f.old), /ENOENT/);
    validateRelease(f.candidate);
    const cases = [
      (r) => (r.sha = "c".repeat(40)),
      (r) => (r.compatibility = "d".repeat(64)),
      (r) => (r.buildId = "WRONG"),
      (r) =>
        atomicJson(join(r.path, "preview-release.json"), {
          ...r,
          sha: "e".repeat(40),
        }),
      (r) =>
        writeFileSync(
          join(r.path, "src/features/real-data/sqlite/runtime.ts"),
          "TAMPER",
        ),
      (r) =>
        writeFileSync(
          join(r.path, "scripts/ops/run-preview-production.mjs"),
          "MIXED_V2",
        ),
      (r) => {
        r.legacy = true;
        atomicJson(join(r.path, "preview-release.json"), {
          ...r,
          compatibility: "0".repeat(64),
        });
      },
      (r) => writeFileSync(join(r.path, "package.json"), "{}"),
    ];
    for (const change of cases) {
      const r = releaseFrom(historical, V9_SHA, "V9_NEGATIVE");
      change(r);
      assert.throws(() => validateV9Release(r));
    }
    const bad = releaseFrom(historical, V9_SHA, "V9_WORKER");
    writeFileSync(
      join(bad.path, "scripts/ops/preview-cd.mjs"),
      "MODIFIED_WORKER",
    );
    assert.throws(() => validateV9WorkerSource(bad.path), /WORKER_CHANGED/);
    const mixed = {
      ...f.candidate,
      sha: V9_SHA,
      compatibility: V9_COMPATIBILITY,
    };
    assert.throws(() => validateV9Release(mixed));
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});

async function abortedFixture({ actualAbort = false } = {}) {
  const f = await fixture(),
    sha = "b".repeat(40),
    nextSha = "c".repeat(40);
  f.io.originalCheckpoint = async () => ({
    originalConfig: f.config,
    originalState: readJson(join(f.root, "state.json")),
    originalPlist: readFileSync(f.plist, "utf8"),
    instance: randomUUID(),
  });
  f.io.save = async (j) =>
    durableUpgradeJournal(f.journal, { version: 2, sha, ...j });
  if (actualAbort) {
    await f.start(f.old);
    f.io.armNewWorker = async () => {
      throw Error("ISOLATED_PRECOMMIT_ABORT");
    };
    await assert.rejects(
      upgradeExistingProtocol(f.io),
      /ISOLATED_PRECOMMIT_ABORT/,
    );
    assert.equal(f.restores, 1);
  } else {
    const unlock = operationalLock(join(f.root, "worker-lease.db"), source);
    const cp = stoppedOperatorCheckpoint(
      f.root,
      await f.io.originalCheckpoint(),
    );
    durableUpgradeJournal(f.journal, {
      version: 2,
      sha,
      phase: "aborted-v9",
      prepared: f.pair,
      checkpoint: cp,
    });
    unlock();
    await f.start(f.old);
  }
  const original = readFileSync(f.journal),
    digest = journalDigest(original);
  const options = {
    root: f.root,
    digest,
    plist: f.plist,
    authorize: async () => {},
    provenance: async (s) => {
      assert.ok([sha, nextSha].includes(s));
    },
    serving: async () => {
      const info = readJson(f.ready);
      assert.equal(
        await (await fetch(`http://127.0.0.1:${info.port}`)).text(),
        f.old.buildId,
      );
      assert.throws(
        () => operationalLock(join(f.root, "worker-lease.db"), source),
        /ALREADY_RUNNING/,
      );
    },
  };
  return { f, sha, nextSha, original, digest, options };
}

test("explicit aborted-v9 acknowledgement preserves real aborted evidence and upgrades with two fresh independent releases", async () => {
  const { f, nextSha, original, digest, options } = await abortedFixture({
    actualAbort: true,
  });
  try {
    f.assertPreserved();
    assert.throws(
      () => assertUpgradeJournalAdmission(f.root),
      /RECOVERY_REQUIRED/,
    );
    const retained = await acknowledgeAbortedV9(options, nextSha);
    const archive = join(f.root, retained.archive);
    assert.ok(readFileSync(archive).equals(original));
    assert.equal(lstatSync(archive).mode & 0o777, 0o400);
    assert.throws(
      () => assertUpgradeJournalAdmission(f.root),
      /RECOVERY_REQUIRED/,
    );
    assert.throws(
      () => assertFreshReattemptPair(f.pair, f.pair, nextSha),
      /FRESH_PAIR_REQUIRED/,
    );
    assert.deepEqual(await acknowledgeAbortedV9(options, nextSha), retained);
    assert.equal(
      abortedV9Evidence(f.root, digest).original.phase,
      "aborted-v9",
    );
    const fresh = {
      candidate: releaseFrom(modern, nextSha, "FRESH_CANDIDATE"),
      fallback: releaseFrom(modern, nextSha, "FRESH_FALLBACK"),
    };
    assertFreshReattemptPair(fresh, f.pair, nextSha);
    f.io.prepareCompatiblePair = async () => {
      await verifyAbortedV9(options);
      assertFreshReattemptPair(fresh, f.pair, nextSha);
      return fresh;
    };
    f.io.prepareHelpers = async (pair) => {
      for (const r of [pair.candidate, pair.fallback]) validateRelease(r);
    };
    f.io.backupAndProveRecovery = async () => {
      const backup = join(f.root, `fresh-backup-${randomUUID()}.db`),
        clone = join(f.root, `fresh-clone-${randomUUID()}.db`);
      nativeCommand("backup", f.path, backup);
      const b = lstatSync(backup);
      await v9DatabasePreflight(
        {
          ...f.config,
          database: backup,
          databaseDevice: b.dev,
          databaseInode: b.ino,
        },
        f.old,
      );
      nativeCommand("backup", backup, clone);
      nativeCommand("migrate", clone);
      const c = lstatSync(clone);
      for (const r of [fresh.candidate, fresh.fallback])
        await databasePreflight(
          {
            ...f.config,
            database: clone,
            databaseDevice: c.dev,
            databaseInode: c.ino,
          },
          r,
        );
      fresh.owner = f.owner;
      return { backup, clone };
    };
    f.io.save = async (j) =>
      durableUpgradeJournal(f.journal, {
        version: 2,
        sha: nextSha,
        abortedEvidence: retained,
        ...j,
      });
    f.io.armNewWorker = async () => {};
    const start = f.io.startAndProve;
    f.io.startAndProve = async (r) => {
      if (r === fresh.candidate) throw Error("ISOLATED_CANDIDATE_HEALTH");
      await start(r);
    };
    f.io.selectFallback = async (r) => {
      const state = readJson(join(f.root, "state.json"));
      state.lastGood = r;
      atomicJson(join(f.root, "state.json"), state);
    };
    assert.equal(
      (await upgradeExistingProtocol(f.io)).upgrade,
      "PROVISIONED_V2",
    );
    assert.equal(nativeCommand("version", f.path), "10");
    assert.equal(
      readJson(join(f.root, "state.json")).lastGood.path,
      fresh.fallback.path,
    );
    assert.ok(readFileSync(archive).equals(original));
    f.assertPreserved();
    await assert.rejects(acknowledgeAbortedV9(options, nextSha));
  } finally {
    await f.cleanup();
  }
});

test("aborted-v9 gate rejects foreign phase, schema, identity, commands, source and failed authorization before evidence writes", async () => {
  for (const fault of [
    "phase",
    "version",
    "sha",
    "checkpoint",
    "config",
    "inode",
    "schema10",
    "owner",
    "release",
    "worker",
    "candidate",
    "pending",
    "rollback",
    "transition",
    "cursor",
    "auto",
    "ci",
    "provenance",
    "writer",
    "race",
  ]) {
    const { f, options, nextSha } = await abortedFixture();
    try {
      if (["phase", "version", "sha", "checkpoint"].includes(fault)) {
        const j = readJson(f.journal);
        if (fault === "phase") j.phase = "prepared";
        if (fault === "version") j.version = 1;
        if (fault === "sha") j.sha = "d".repeat(40);
        if (fault === "checkpoint") j.checkpoint.instance = "foreign";
        atomicJson(f.journal, j);
        options.digest = journalDigest(readFileSync(f.journal));
      } else if (fault === "config")
        atomicJson(join(f.root, "config.json"), {
          ...f.config,
          databaseInode: -1,
        });
      else if (fault === "inode") {
        renameSync(f.path, `${f.path}.retained`);
        cpSync(`${f.path}.retained`, f.path);
      } else if (fault === "schema10") {
        await f.stop();
        nativeCommand("migrate", f.path);
      } else if (fault === "owner") {
        const { Database } = upgradeNativeDependencies(f.old.path, {
          legacy: true,
        });
        const db = new Database(f.path);
        db.prepare("UPDATE runtime_metadata SET owner_id=?").run(randomUUID());
        db.close();
      } else if (fault === "candidate") {
        writeFileSync(
          join(f.candidate.path, ".next/BUILD_ID"),
          "FOREIGN_BUILD",
        );
      } else if (fault === "release" || fault === "worker") {
        const file =
          fault === "release"
            ? join(
                f.old.path,
                "src/features/real-data/sqlite/canonical-schema.ts",
              )
            : join(f.old.path, "scripts/ops/preview-cd.mjs");
        writeFileSync(file, readFileSync(file, "utf8") + "\n// foreign\n");
      } else if (fault === "pending") await cli(["rollback", f.root]);
      else if (["rollback", "transition", "cursor", "auto"].includes(fault)) {
        const s = readJson(join(f.root, "state.json"));
        if (fault === "rollback") s.rollbackRequested = true;
        if (fault === "transition") s.transition = { phase: "switch" };
        if (fault === "cursor") s.commandOffset--;
        if (fault === "auto") s.autoEnabled = !s.autoEnabled;
        atomicJson(join(f.root, "state.json"), s);
      } else if (fault === "ci")
        options.authorize = async () => {
          throw Error("EXACT_MAIN_QUALITY_FAILED");
        };
      else if (fault === "provenance")
        options.provenance = async () => {
          throw Error("FOREIGN_JOURNAL_SOURCE");
        };
      else if (fault === "writer")
        options.serving = async () => {
          throw Error("COMPETING_WRITER");
        };
      else if (fault === "race")
        options.serving = async () => {
          await cli(["rollback", f.root]);
        };
      const bytes = readFileSync(f.journal),
        config = readFileSync(join(f.root, "config.json")),
        state = readFileSync(join(f.root, "state.json")),
        plist = readFileSync(f.plist);
      await assert.rejects(
        acknowledgeAbortedV9(options, nextSha),
        undefined,
        fault,
      );
      assert.ok(readFileSync(f.journal).equals(bytes), fault);
      assert.ok(
        readFileSync(join(f.root, "config.json")).equals(config),
        fault,
      );
      assert.ok(readFileSync(join(f.root, "state.json")).equals(state), fault);
      assert.ok(readFileSync(f.plist).equals(plist), fault);
      assert.equal(
        existsSync(
          join(f.root, `upgrade-v2.aborted-v9.${options.digest}.json`),
        ),
        false,
        fault,
      );
      if (!["schema10", "inode", "owner"].includes(fault)) f.assertPreserved();
    } finally {
      await f.cleanup();
    }
  }
});

test("fresh re-attempt precommit failure resumes original v9 and requires acknowledgement of its new aborted journal", async () => {
  const { f, options, nextSha, original } = await abortedFixture();
  try {
    const retained = await acknowledgeAbortedV9(options, nextSha);
    const fresh = {
      candidate: releaseFrom(modern, nextSha, "RETRY_CANDIDATE"),
      fallback: releaseFrom(modern, nextSha, "RETRY_FALLBACK"),
    };
    f.io.prepareCompatiblePair = async () => {
      await verifyAbortedV9(options);
      assertFreshReattemptPair(fresh, f.pair, nextSha);
      return fresh;
    };
    f.io.prepareHelpers = async () => {
      validateRelease(fresh.candidate);
      validateRelease(fresh.fallback);
    };
    const backup = f.io.backupAndProveRecovery;
    f.io.backupAndProveRecovery = async () => {
      const proof = await backup(),
        stat = lstatSync(proof.clone);
      for (const r of [fresh.candidate, fresh.fallback])
        await databasePreflight(
          {
            ...f.config,
            database: proof.clone,
            databaseDevice: stat.dev,
            databaseInode: stat.ino,
          },
          r,
        );
      fresh.owner = f.owner;
      return proof;
    };
    f.io.save = async (j) =>
      durableUpgradeJournal(f.journal, {
        version: 2,
        sha: nextSha,
        abortedEvidence: retained,
        ...j,
      });
    f.io.armNewWorker = async () => {
      throw Error("REATTEMPT_PRECOMMIT_FAILURE");
    };
    await assert.rejects(
      upgradeExistingProtocol(f.io),
      /REATTEMPT_PRECOMMIT_FAILURE/,
    );
    assert.equal(f.restores, 1);
    assert.equal(nativeCommand("version", f.path), "9");
    assert.equal(readJson(f.journal).phase, "aborted-v9");
    assert.ok(readFileSync(join(f.root, retained.archive)).equals(original));
    await options.serving();
    f.assertPreserved();
    await assert.rejects(acknowledgeAbortedV9(options, nextSha), /ACK_CHANGED/);
    const newDigest = journalDigest(readFileSync(f.journal));
    assert.notEqual(newDigest, options.digest);
    await acknowledgeAbortedV9({ ...options, digest: newDigest }, nextSha);
    assert.ok(readFileSync(join(f.root, retained.archive)).equals(original));
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});

test("acknowledgement crash boundaries are durable/idempotent; build failure preserves old service and archived evidence", async () => {
  const { f, options, nextSha, original } = await abortedFixture();
  try {
    await assert.rejects(
      acknowledgeAbortedV9(options, nextSha, async () => {
        throw Error("CRASH_AFTER_ARCHIVE");
      }),
      /CRASH_AFTER_ARCHIVE/,
    );
    assert.ok(readFileSync(f.journal).equals(original));
    const evidence = await acknowledgeAbortedV9(options, nextSha);
    const marker = readFileSync(f.journal);
    assert.deepEqual(await acknowledgeAbortedV9(options, nextSha), evidence);
    assert.ok(readFileSync(f.journal).equals(marker));
    f.io.prepareCompatiblePair = async () => {
      throw Error("ISOLATED_BUILD_FAILURE");
    };
    await assert.rejects(
      upgradeExistingProtocol(f.io),
      /ISOLATED_BUILD_FAILURE/,
    );
    assert.ok(readFileSync(f.journal).equals(marker));
    assert.ok(readFileSync(join(f.root, evidence.archive)).equals(original));
    await options.serving();
    f.assertPreserved();
    // Partial/changed archives are never overwritten or silently repaired.
    chmodSync(join(f.root, evidence.archive), 0o600);
    writeFileSync(join(f.root, evidence.archive), "partial");
    chmodSync(join(f.root, evidence.archive), 0o400);
    await assert.rejects(acknowledgeAbortedV9(options, nextSha));
    assert.ok(readFileSync(f.journal).equals(marker));
  } finally {
    await f.cleanup();
  }
});

test("SIGKILL at archive and acknowledgement boundaries releases the independent operator lease without disturbing the v9 writer", async () => {
  const { f, options, nextSha, original } = await abortedFixture();
  let child;
  try {
    const script = join(f.root, "owned-ack-crash.mjs");
    writeFileSync(
      script,
      `import {operationalLock} from ${JSON.stringify(pathToFileURL(resolve("scripts/ops/preview-cd-host.mjs")).href)};import {acknowledgeAbortedV9} from ${JSON.stringify(pathToFileURL(resolve("scripts/ops/preview-upgrade-reattempt.mjs")).href)};const unlock=operationalLock(${JSON.stringify(join(f.root, "operator-upgrade-lease.db"))},${JSON.stringify(f.old.path)});const options=${JSON.stringify({ root: f.root, digest: options.digest, plist: f.plist })};options.authorize=async()=>{};options.provenance=async()=>{};options.serving=async()=>{};const wait=()=>new Promise(()=>{setInterval(()=>{},1000);});await acknowledgeAbortedV9(options,${JSON.stringify(nextSha)},process.argv[2]==='archive'?async()=>{process.send('ARCHIVE');await wait();}:undefined);process.send('MARKER');await wait();`,
      { mode: 0o600 },
    );
    for (const phase of ["archive", "marker"]) {
      child = spawn(
        process.execPath,
        ["--conditions=react-server", script, phase],
        { stdio: ["ignore", "ignore", "pipe", "ipc"] },
      );
      const ended = once(child, "exit");
      await Promise.race([
        once(child, "message"),
        ended.then(() => {
          throw Error("ACK_CHILD_EXIT");
        }),
      ]);
      assert.throws(
        () =>
          operationalLock(
            join(f.root, "operator-upgrade-lease.db"),
            f.old.path,
          ),
        /ALREADY_RUNNING/,
      );
      child.kill("SIGKILL");
      await ended;
      child = null;
      const unlock = operationalLock(
        join(f.root, "operator-upgrade-lease.db"),
        f.old.path,
      );
      unlock();
      if (phase === "archive")
        assert.ok(readFileSync(f.journal).equals(original));
      else assert.equal(readJson(f.journal).phase, "reattempt-v9");
      await options.serving();
      f.assertPreserved();
    }
    await acknowledgeAbortedV9(options, nextSha);
    assert.equal(nativeCommand("version", f.path), "9");
  } finally {
    if (child) {
      const ended = once(child, "exit");
      child.kill("SIGKILL");
      await ended;
    }
    await f.cleanup();
  }
});

test(
  "macOS re-attempt service gate attributes the launchd job, server and leases and rejects an extra database process",
  { skip: process.platform !== "darwin" },
  async () => {
    const { f } = await abortedFixture();
    const label = `dev.life-os.test.v9-reattempt.${randomUUID()}`;
    const agent = join(f.root, "owned-agent.plist"),
      supervisor = join(f.root, "owned-supervisor.mjs"),
      service = join(f.root, "owned-server.mjs");
    let registered = false;
    try {
      await f.stop();
      writeFileSync(
        service,
        readFileSync(f.helper, "utf8").replace(
          "const unlock=operationalLock(root+'/worker-lease.db',release);",
          "const unlock=()=>{};",
        ),
        { mode: 0o600 },
      );
      writeFileSync(
        supervisor,
        `import {spawn} from 'node:child_process';import {once} from 'node:events';import {operationalLock,atomicJson} from ${JSON.stringify(pathToFileURL(resolve("scripts/ops/preview-cd-host.mjs")).href)};import {processIdentity} from ${JSON.stringify(pathToFileURL(resolve("scripts/ops/preview-cd.mjs")).href)};const unlock=operationalLock(${JSON.stringify(join(f.root, "worker-lease.db"))},${JSON.stringify(f.old.path)});const child=spawn(process.execPath,${JSON.stringify(["--conditions=react-server", service, f.old.path, f.path, f.root, f.ready, f.old.buildId])},{cwd:${JSON.stringify(f.old.path)},stdio:['ignore','ignore','ignore','ipc']});await once(child,'message');atomicJson(${JSON.stringify(join(f.root, "worker.json"))},{pid:process.pid,serverPid:child.pid,identity:await processIdentity(process.pid,process.execPath)});process.on('SIGTERM',async()=>{const ended=once(child,'exit');child.kill('SIGTERM');await ended;unlock();process.exit(0);});`,
        { mode: 0o600 },
      );
      const args = [process.execPath, supervisor, "supervise", f.root];
      writeFileSync(
        agent,
        `<?xml version="1.0"?><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args.map((x) => `<string>${x}</string>`).join("")}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><false/><key>AbandonProcessGroup</key><false/></dict></plist>`,
        { mode: 0o600 },
      );
      execFileSync("/bin/launchctl", [
        "bootstrap",
        `gui/${process.getuid()}`,
        agent,
      ]);
      registered = true;
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (existsSync(join(f.root, "worker.json"))) {
          ready = true;
          break;
        }
        await pause(50);
      }
      assert.equal(ready, true);
      const info = readJson(f.ready),
        opts = {
          label,
          port: info.port,
          authenticatedHealth: false,
          plist: agent,
          programArguments: args,
        };
      await verifyRunningV9(f.root, f.config, f.old, opts);
      const { Database } = upgradeNativeDependencies(f.old.path, {
        legacy: true,
      });
      const foreign = new Database(f.path);
      foreign.exec("BEGIN IMMEDIATE");
      try {
        await assert.rejects(
          verifyRunningV9(f.root, f.config, f.old, opts),
          /SERVICE_OR_WRITER_CONFLICT/,
        );
      } finally {
        foreign.exec("ROLLBACK");
        foreign.close();
      }
      await verifyRunningV9(f.root, f.config, f.old, opts);
      f.assertPreserved();
    } finally {
      if (registered)
        execFileSync("/bin/launchctl", [
          "bootout",
          `gui/${process.getuid()}/${label}`,
        ]);
      await f.cleanup();
    }
  },
);

test("real historical backup preflight plus precommit abort restores v1 availability, rows, cursor and single writer", async () => {
  const f = await fixture();
  try {
    await f.start(f.old);
    f.io.armNewWorker = async () => {
      throw Error("ISOLATED_PRECOMMIT_FAILURE");
    };
    await assert.rejects(
      upgradeExistingProtocol(f.io),
      /ISOLATED_PRECOMMIT_FAILURE/,
    );
    assert.equal(readJson(f.journal).phase, "aborted-v9");
    assert.equal(f.restores, 1);
    assert.equal(nativeCommand("version", f.path), "9");
    const state = readJson(join(f.root, "state.json"));
    assert.equal(state.commandOffset, 5);
    assert.equal(state.autoEnabled, false);
    assert.equal(state.lastGood.sha, V9_SHA);
    assert.equal(state.rollbackRequested, false);
    const before = structuredClone(state);
    commands(f.root, state);
    assert.deepEqual(state, before);
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});

test("native commit/lost-response recovery remains v10-only; historical restore cannot bootstrap on schema10", async () => {
  const f = await fixture();
  try {
    await f.start(f.old);
    const migrate = f.io.migrateSameFile;
    f.io.migrateSameFile = async () => {
      await migrate();
      throw Error("LOST_MIGRATION_RESPONSE");
    };
    await assert.rejects(
      upgradeExistingProtocol(f.io),
      /LOST_MIGRATION_RESPONSE/,
    );
    assert.equal(nativeCommand("version", f.path), "10");
    const checkpoint = readJson(f.journal).checkpoint;
    let bootstraps = 0;
    await assert.rejects(
      restoreV9Worker({
        root: f.root,
        checkpoint,
        plist: f.plist,
        releaseWorkerLease: async () => {},
        bootstrap: async () => bootstraps++,
      }),
    );
    assert.equal(bootstraps, 0);
    assert.equal(f.restores, 0);
    f.release();
    await recoverExistingProtocol(f.io, readJson(f.journal));
    assert.equal(readJson(f.journal).phase, "complete-v10");
    assert.equal(f.restores, 0);
    const state = readJson(join(f.root, "state.json"));
    assert.equal(state.commandOffset, 5);
    assert.equal(state.autoEnabled, false);
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});

test(
  "macOS owned LaunchAgent bootstrap boundary restores historical v9 service after abort",
  { skip: process.platform !== "darwin" },
  async () => {
    const f = await fixture(),
      label = "dev.life-os.test.v9-restore." + randomUUID(),
      domain = `gui/${process.getuid()}`,
      job = domain + "/" + label;
    let registered = false;
    const ctl = (...args) =>
      execFileSync("/bin/launchctl", args, { encoding: "utf8" });
    try {
      const args = [
        process.execPath,
        "--conditions=react-server",
        f.helper,
        f.old.path,
        f.path,
        f.root,
        f.ready,
        f.old.buildId,
      ];
      const escape = (x) =>
        x
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args.map((x) => "<string>" + escape(x) + "</string>").join("")}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><false/></dict></plist>`;
      writeFileSync(f.plist, plist, { mode: 0o600 });
      f.io.originalCheckpoint = async () => ({
        originalConfig: f.config,
        originalState: readJson(join(f.root, "state.json")),
        originalPlist: plist,
        instance: "isolated-mac",
      });
      f.io.restoreOldWorker = async (checkpoint) =>
        restoreV9Worker({
          root: f.root,
          checkpoint,
          plist: f.plist,
          releaseWorkerLease: async () => f.release(),
          bootstrap: async (path) => {
            ctl("bootstrap", domain, path);
            registered = true;
          },
        });
      f.io.armNewWorker = async () => {
        throw Error("MAC_PRECOMMIT_ABORT");
      };
      await assert.rejects(
        upgradeExistingProtocol(f.io),
        /MAC_PRECOMMIT_ABORT/,
      );
      let info,
        healthy = false;
      for (let n = 0; n < 100; n++) {
        if (existsSync(f.ready)) {
          info = readJson(f.ready);
          try {
            assert.equal(
              await (await fetch(`http://127.0.0.1:${info.port}`)).text(),
              f.old.buildId,
            );
            healthy = true;
            break;
          } catch {}
        }
        await pause(100);
      }
      assert.ok(info);
      assert.ok(healthy);
      assert.ok(ctl("print", job).includes("state = running"));
      assert.throws(
        () => operationalLock(join(f.root, "worker-lease.db"), source),
        /ALREADY_RUNNING/,
      );
      f.assertPreserved();
      assert.equal(nativeCommand("version", f.path), "9");
    } finally {
      if (registered) ctl("bootout", job);
      await f.cleanup();
    }
  },
);

test("historical identity/schema/owner readiness failures stop before restore writes or bootstrap", async () => {
  for (const fault of ["inode", "owner", "ready", "guard", "version"]) {
    const f = await fixture();
    try {
      const cp = stoppedOperatorCheckpoint(f.root, {
        originalConfig: f.config,
        originalPlist: "MUST_NOT_WRITE",
      });
      let bootstraps = 0;
      const configBefore = readFileSync(join(f.root, "config.json"), "utf8"),
        stateBefore = readFileSync(join(f.root, "state.json"), "utf8"),
        plistBefore = readFileSync(f.plist, "utf8");
      if (fault === "inode")
        cp.originalConfig = {
          ...f.config,
          databaseInode: f.config.databaseInode + 1,
        };
      else {
        const { Database } = upgradeNativeDependencies(f.old.path, {
            legacy: true,
          }),
          db = new Database(f.path);
        if (fault === "owner")
          db.prepare("UPDATE runtime_metadata SET owner_id=?").run(
            randomUUID(),
          );
        else if (fault === "guard") {
          const { name } = db
            .prepare(
              "SELECT name FROM sqlite_schema WHERE type='trigger' ORDER BY name LIMIT 1",
            )
            .get();
          db.exec(`DROP TRIGGER "${name}"`);
        } else if (fault === "version") db.pragma("user_version=8");
        else
          db.prepare("UPDATE runtime_metadata SET compatibility_ready=0").run();
        db.close();
      }
      await assert.rejects(
        restoreV9Worker({
          root: f.root,
          checkpoint: cp,
          plist: f.plist,
          releaseWorkerLease: async () => {},
          bootstrap: async () => bootstraps++,
        }),
      );
      assert.equal(bootstraps, 0);
      assert.equal(
        readFileSync(join(f.root, "config.json"), "utf8"),
        configBefore,
      );
      assert.equal(
        readFileSync(join(f.root, "state.json"), "utf8"),
        stateBefore,
      );
      assert.equal(readFileSync(f.plist, "utf8"), plistBefore);
    } finally {
      await f.cleanup();
    }
  }
});

test("unknown historical source is refused before stopping the otherwise available v9 fixture", async () => {
  const f = await fixture();
  try {
    await f.start(f.old);
    writeFileSync(
      join(f.old.path, "scripts/ops/run-preview-production.mjs"),
      "MIXED_SOURCE",
    );
    await assert.rejects(upgradeExistingProtocol(f.io), /V9_IDENTITY_CHANGED/);
    assert.equal(f.restores, 0);
    const info = readJson(f.ready);
    assert.equal(
      await (await fetch(`http://127.0.0.1:${info.port}`)).text(),
      f.old.buildId,
    );
    assert.equal(nativeCommand("version", f.path), "9");
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});

test("native historical crash releases both leases; v9 recovery starts the old dataset without replay", async () => {
  const f = await fixture();
  try {
    await f.start(f.old);
    await f.killService();
    const checkpoint = stoppedOperatorCheckpoint(f.root, {
      originalConfig: f.config,
      originalPlist: readFileSync(f.plist, "utf8"),
      instance: "crash",
    });
    await recoverExistingProtocol(f.io, {
      phase: "stopped-worker",
      prepared: f.pair,
      checkpoint,
    });
    assert.equal(nativeCommand("version", f.path), "9");
    assert.equal(f.restores, 1);
    const state = readJson(join(f.root, "state.json")),
      before = structuredClone(state);
    commands(f.root, state);
    assert.deepEqual(state, before);
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});

test("restore refuses an existing canonical writer before any checkpoint write or bootstrap", async () => {
  const f = await fixture();
  try {
    await f.start(f.old);
    const cp = stoppedOperatorCheckpoint(f.root, {
      originalConfig: f.config,
      originalPlist: "NO_WRITE",
      instance: "competing-writer",
    });
    const config = readFileSync(join(f.root, "config.json"), "utf8"),
      state = readFileSync(join(f.root, "state.json"), "utf8"),
      plist = readFileSync(f.plist, "utf8");
    let bootstrap = 0;
    await assert.rejects(
      restoreV9Worker({
        root: f.root,
        checkpoint: cp,
        plist: f.plist,
        releaseWorkerLease: async () => {},
        bootstrap: async () => bootstrap++,
      }),
      /UPGRADE_V9_WRITER_NOT_FREE/,
    );
    assert.equal(bootstrap, 0);
    assert.equal(readFileSync(join(f.root, "config.json"), "utf8"), config);
    assert.equal(readFileSync(join(f.root, "state.json"), "utf8"), state);
    assert.equal(readFileSync(f.plist, "utf8"), plist);
    f.assertPreserved();
  } finally {
    await f.cleanup();
  }
});
