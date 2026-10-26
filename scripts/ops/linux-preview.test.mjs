import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  chmodSync,
  writeFileSync,
  lstatSync,
  linkSync,
  symlinkSync,
  copyFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { upgradeNativeDependencies } from "./preview-upgrade-native-loader.mjs";
import { linuxPreviewOperation } from "./linux-preview-core.mjs";
import {
  databaseIdentity,
  backupAndRestore,
  inspectDatabase,
  verifyRecovery,
} from "./linux-preview-database.mjs";
import { readLinuxConfiguration } from "./linux-preview.mjs";
import { linuxGrant } from "./linux-preview-application.mjs";

for (const operation of ["build", "prove", "provision", "start", "revoke"]) {
  test(`Linux ${operation}: explicit stage ordering; each failed gate prevents later effects`, async () => {
    const expected = {
      build: [
        "authorize",
        "verifySource",
        "assertInactive",
        "build",
        "authorize",
        "verifySource",
        "saveBuild",
      ],
      prove: [
        "authorize",
        "verifySource",
        "verifyRelease",
        "assertInactive",
        "backupAndRestore",
        "proveRestoredApplication",
        "authorize",
        "verifySource",
        "saveProof",
      ],
      provision: [
        "authorize",
        "verifySource",
        "verifyRelease",
        "verifyProof",
        "assertPortAndWriterFree",
        "authorize",
        "verifySource",
        "provision",
      ],
      start: [
        "authorize",
        "verifySource",
        "verifyRelease",
        "verifyProof",
        "assertPortAndWriterFree",
        "authorize",
        "verifySource",
        "verifyGrant",
        "start",
      ],
      revoke: ["authorize", "revoke"],
    }[operation];
    for (let failure = -1; failure < expected.length; failure++) {
      const calls = [];
      const io = new Proxy(
        {},
        {
          get: (_, key) => async () => {
            calls.push(key);
            if (calls.length - 1 === failure) throw new Error("fixture-denied");
            return {};
          },
        },
      );
      if (failure === -1) await linuxPreviewOperation(operation, io);
      else
        await assert.rejects(
          linuxPreviewOperation(operation, io),
          /fixture-denied/,
        );
      assert.deepEqual(
        calls,
        failure === -1 ? expected : expected.slice(0, failure + 1),
      );
    }
  });
}

test("Linux operator defaults OFF, denies unapproved invocation without printing arguments or reaching database/GitHub", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "scripts/ops/linux-preview.mjs",
      "start",
      "/should-never-be-read/private",
      "a".repeat(40),
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "LINUX_EXPLICIT_OPERATOR_GATE_REQUIRED\n");
});

const source = process.cwd();
const { require, Database } = upgradeNativeDependencies(source);
const native = (name) =>
  require(join(source, `src/features/real-data/sqlite/${name}.ts`));
function fixture() {
  const folder = mkdtempSync(join(realpathSync(tmpdir()), "life-os-174-"));
  const path = join(folder, "canonical.db"),
    owner = randomUUID();
  native("production-bootstrap").bootstrapProductionDatabase(path, {
    ownerId: owner,
    displayName: "Disposable Linux Owner",
    timezone: "Europe/Berlin",
  });
  return { folder, path, owner };
}

test("Linux live WAL online backup + independent restore retain all 83 tables and data without acquiring the original writer", async () => {
  const { folder, path, owner } = fixture();
  const runtime = new (native("runtime").SqliteRuntime)(path);
  const context = native("owner-context").issueOwnerContext(owner);
  runtime.command(context, "task.create", (db) =>
    db
      .prepare(
        "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,?,life_now(),life_now())",
      )
      .run(randomUUID(), owner, `Linux WAL ${randomUUID()}`),
  );
  runtime.command(context, "retained.journal", (db) =>
    db
      .prepare(
        "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-26','Recovery fixture','Retain me',life_now(),life_now())",
      )
      .run(randomUUID(), owner),
  );
  const before = databaseIdentity(path);
  const recovery = join(folder, `recovery-${randomUUID()}`);
  mkdirSync(recovery, { mode: 0o700 });
  try {
    const result = await backupAndRestore(source, path, recovery);
    assert.equal(Object.keys(result.data).length, 83);
    assert.equal(result.data.tasks.count, 1);
    assert.equal(result.data.journal_entries.count, 1);
    assert.deepEqual(databaseIdentity(path), before);
    assert.notDeepEqual(databaseIdentity(result.restore), before);
    assert.equal(lstatSync(result.backup).mode & 0o777, 0o600);
    assert.throws(
      () => new (native("runtime").SqliteRuntime)(path),
      /SQLITE_WRITER_ALREADY_RUNNING/,
    );
    assert.throws(
      () => verifyRecovery(source, path, result),
      /LINUX_RECOVERY_PROOF_INVALID/,
    );
    const proof = { ...result, version: 1, application: "PASS" };
    verifyRecovery(source, path, proof);
    for (const patch of [
      { application: "FAIL" },
      { createdAt: "invalid" },
      { createdAt: new Date(Date.now() - 3_600_001).toISOString() },
      { backupHash: "bad" },
      { source: { ...proof.source, owner: randomUUID() } },
      { restoreIdentity: before },
      { schemaHash: "bad" },
      { data: {} },
    ])
      assert.throws(
        () => verifyRecovery(source, path, { ...proof, ...patch }),
        /LINUX_RECOVERY_PROOF_INVALID/,
      );
    // A later source write is allowed: proof preserves the exact backup, rather
    // than falsely claiming a live source snapshot can never change afterward.
    runtime.command(context, "task.create", (db) =>
      db
        .prepare(
          "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Later source data',life_now(),life_now())",
        )
        .run(randomUUID(), owner),
    );
    verifyRecovery(source, path, proof);
    assert.equal(
      inspectDatabase(source, result.restore, { rows: true }).data.tasks.count,
      1,
    );
    // Restore can independently obtain a writer and survives normal restart.
    const restored = new (native("runtime").SqliteRuntime)(result.restore);
    restored.close();
    verifyRecovery(source, path, proof);
    const read = new Database(path, { readonly: true });
    assert.equal(read.prepare("SELECT count(*) n FROM tasks").get().n, 2);
    read.close();
    // Deliberate backed-up byte corruption must never remain an accepted proof.
    writeFileSync(result.backup, "corrupted", { flag: "a" });
    assert.throws(
      () => verifyRecovery(source, path, proof),
      /LINUX_RECOVERY_PROOF_INVALID/,
    );
  } finally {
    runtime.close();
  }
});

for (const signal of ["SIGINT", "SIGTERM", "SIGKILL"]) {
  test(`Linux owned child drains and releases its real kernel lease after operator ${signal}; restart remains possible`, async () => {
    const f = fixture(),
      release = join(f.folder, "release");
    mkdirSync(join(release, "scripts/ops"), { recursive: true, mode: 0o700 });
    copyFileSync(
      join(source, "scripts/ops/linux-preview-parent.mjs"),
      join(release, "scripts/ops/linux-preview-parent.mjs"),
    );
    const pidFile = join(f.folder, "child.json"),
      closed = join(f.folder, "closed.json");
    // Disposable serving-process fixture holds the same SQLite EXCLUSIVE lease
    // primitive as the real runtime; it handles SIGTERM exactly once and closes.
    writeFileSync(
      join(release, "scripts/ops/run-preview-production.mjs"),
      `
      import { createRequire } from 'node:module';
      import { writeFileSync } from 'node:fs';
      const require = createRequire(${JSON.stringify(join(source, "package.json"))});
      const Database = require('better-sqlite3');
      const path = process.env.LIFE_OS_HOSTED_SQLITE_PATH + '.writer-lease.db';
      writeFileSync(path, '', { mode: 0o600, flag: 'wx' });
      const lease = new Database(path); lease.exec('BEGIN EXCLUSIVE');
      process.once('SIGTERM', () => {
        lease.exec('ROLLBACK'); lease.close();
        writeFileSync(${JSON.stringify(closed)}, JSON.stringify({drained:true}), {mode:0o600});
        process.exit(143);
      });
      writeFileSync(${JSON.stringify(pidFile)}, JSON.stringify({pid:process.pid,args:process.execArgv}), {mode:0o600});
      setInterval(() => {}, 1000);
    `,
      { mode: 0o600 },
    );
    const config = {
      node: process.execPath,
      database: f.path,
      origin: "https://fixture.owner-tailnet.ts.net",
      ownerLogin: "fixture@example.test",
    };
    const entry = `import { runLinuxApplication } from ${JSON.stringify(pathToFileURL(join(source, "scripts/ops/linux-preview-application.mjs")).href)};
      await runLinuxApplication(${JSON.stringify(config)}, ${JSON.stringify({ path: release })}, ${JSON.stringify(join(f.folder, "unused-grant.json"))});`;
    const parent = spawn(
      process.execPath,
      ["--conditions=react-server", "--input-type=module", "--eval", entry],
      { stdio: "ignore" },
    );
    const exited = new Promise((resolve) => parent.once("exit", resolve));
    const waitFor = async (file) => {
      for (let n = 0; n < 250; n++) {
        if (existsSync(file)) return;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error("Disposable child fixture timeout");
    };
    try {
      await waitFor(pidFile);
      const child = JSON.parse(readFileSync(pidFile));
      assert.ok(
        !child.args.some((arg) => arg.includes("conditions=react-server")),
      );
      assert.throws(
        () => native("writer-lease").acquireWriterLease(f.path),
        /SQLITE_WRITER_ALREADY_RUNNING/,
      );
      parent.kill(signal);
      await exited;
      await waitFor(closed);
      assert.deepEqual(JSON.parse(readFileSync(closed)), { drained: true });
      const restarted = new (native("runtime").SqliteRuntime)(f.path);
      restarted.close();
    } finally {
      if (parent.exitCode === null && parent.signalCode === null)
        parent.kill("SIGTERM");
    }
  });
}

test("Linux database identity rejects hardlinks, symlinks, broad file/directory modes; schema/kind/owner/readiness fail closed", () => {
  const { folder, path } = fixture();
  chmodSync(path, 0o644);
  assert.throws(() => databaseIdentity(path));
  chmodSync(path, 0o600);
  chmodSync(folder, 0o755);
  assert.throws(() => databaseIdentity(path));
  chmodSync(folder, 0o700);
  const linked = join(folder, "hard.db");
  linkSync(path, linked);
  assert.throws(() => databaseIdentity(path));
  assert.throws(() => databaseIdentity(linked));
  const next = fixture(),
    symbolic = join(next.folder, "symlink.db");
  symlinkSync(next.path, symbolic);
  assert.throws(() => databaseIdentity(symbolic));
  for (const sql of [
    "PRAGMA user_version=9",
    "UPDATE runtime_metadata SET compatibility_ready=0",
    "UPDATE runtime_metadata SET dataset_kind='synthetic'",
    "UPDATE runtime_metadata SET owner_id='00000000-0000-4000-8000-000000000000'",
  ]) {
    const f = fixture(),
      db = new Database(f.path);
    db.exec(sql);
    db.close();
    assert.throws(() => inspectDatabase(source, f.path));
  }
});

test("Linux configuration remains private, external and explicit; grant freezes exact release, host/uid and existing inode", () => {
  const { folder, path, owner } = fixture(),
    root = join(folder, "operator");
  mkdirSync(root, { mode: 0o700 });
  const config = {
    version: 1,
    source,
    database: path,
    origin: "https://disposable.owner-tailnet.ts.net",
    ownerLogin: "owner@example.test",
    tailscale: "/usr/bin/tailscale",
    node: process.execPath,
    pnpm: "/usr/bin/pnpm",
  };
  const file = join(root, "linux-config.json");
  writeFileSync(file, JSON.stringify(config), { mode: 0o600 });
  assert.deepEqual(readLinuxConfiguration(root), config);
  const release = {
    path: "/private/disposable/release",
    sha: "a".repeat(40),
    buildId: "build-fixture",
    compatibility: "b".repeat(64),
  };
  const grant = linuxGrant(config, release, owner);
  assert.deepEqual(grant.release, release);
  assert.equal(grant.inode, lstatSync(path).ino);
  assert.equal(grant.uid, process.getuid());
  for (const patch of [
    { origin: "https://public.example.test" },
    { origin: config.origin + "/path" },
    { unexpected: true },
    { database: join(root, "canonical.db") },
    { source: folder },
  ]) {
    writeFileSync(file, JSON.stringify({ ...config, ...patch }), {
      mode: 0o600,
    });
    assert.throws(() => readLinuxConfiguration(root));
  }
});
