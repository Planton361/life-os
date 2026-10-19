import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import {
  REPOSITORY,
  qualityRun,
  qualityJob,
  protectedMain,
  initialState,
  deploy,
  errorCode,
  publicStatus,
  launchAgent,
} from "./preview-cd-core.mjs";
import {
  GitHubGate,
  boundary,
  operationalLock,
  compatibilityFingerprint,
} from "./preview-cd-host.mjs";
import { cli } from "./preview-cd.mjs";
import { authorizeOperatorGitHub } from "./preview-upgrade-host.mjs";
import {
  upgradeExistingProtocol,
  recoverExistingProtocol,
} from "./preview-upgrade-core.mjs";

const a = "a".repeat(40),
  b = "b".repeat(40),
  c = "c".repeat(40);
const temporary = realpathSync(tmpdir());
const green = {
  id: 1,
  run_attempt: 1,
  head_sha: b,
  head_branch: "main",
  event: "push",
  path: ".github/workflows/pr-quality.yml",
  status: "completed",
  conclusion: "success",
  repository: { full_name: REPOSITORY },
  head_repository: { full_name: REPOSITORY },
};
const goodRules = {
  target: "branch",
  enforcement: "active",
  bypass_actors: [],
  conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
  rules: [
    { type: "pull_request" },
    { type: "non_fast_forward" },
    { type: "deletion" },
    {
      type: "required_status_checks",
      parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: [{ context: "quality" }],
      },
    },
  ],
};
const release = (sha) => ({
  sha,
  path: `/private-fixture/${sha}`,
  buildId: `build-${sha[0]}`,
});
function fixture() {
  const state = initialState(release(a)),
    events = [],
    snapshots = [];
  let main = b,
    serving = a,
    writers = 1;
  const io = {
    latest: async () => main,
    gate: async (sha) => {
      assert.equal(sha, main);
      events.push("gate");
    },
    save: async () => {
      snapshots.push(structuredClone(state));
    },
    prepare: async (sha) => {
      assert.equal(writers, 1);
      events.push("build");
      return release(sha);
    },
    commands: async () => {},
    preflight: async () => {
      events.push("preflight");
    },
    stop: async () => {
      events.push("stop");
      writers = 0;
      serving = null;
    },
    free: async () => {
      assert.equal(writers, 0);
      events.push("port+lease-free");
    },
    start: async (r) => {
      assert.equal(writers, 0);
      writers += 1;
      serving = r.sha;
      events.push(`start-${r.sha[0]}`);
    },
    health: async (r) => {
      assert.equal(serving, r.sha);
      assert.equal(writers, 1);
      events.push(`health-${r.sha[0]}`);
    },
  };
  return {
    state,
    io,
    events,
    snapshots,
    main: (sha) => {
      main = sha;
    },
    writers: () => writers,
  };
}

test("only exact main push Quality and latest attempt are admitted", () => {
  assert.equal(qualityRun(b, [green]).id, 1);
  for (const change of [
    { head_sha: a },
    { head_branch: "codex/139" },
    { event: "pull_request" },
    { path: ".github/workflows/other.yml" },
    { status: "in_progress" },
    { status: "queued" },
    { conclusion: "failure" },
    { conclusion: "cancelled" },
    { conclusion: "skipped" },
    { head_repository: { full_name: "fork/life-os" } },
  ]) {
    assert.throws(
      () => qualityRun(b, [{ ...green, ...change }]),
      /QUALITY_NOT_SUCCESSFUL/,
    );
  }
  assert.throws(
    () => qualityRun(b, [green, { ...green, id: 2, conclusion: "failure" }]),
    /QUALITY_NOT_SUCCESSFUL/,
  );
  assert.throws(() => qualityRun("main", [green]), /INVALID_MAIN_SHA/);
});
test("quality job and active strict ruleset are independent gates", () => {
  const job = {
    name: "quality",
    head_sha: b,
    status: "completed",
    conclusion: "success",
  };
  qualityJob(b, [job]);
  protectedMain([goodRules]);
  for (const jobs of [
    [],
    [{ ...job, head_sha: a }],
    [{ ...job, conclusion: "failure" }],
    [job, job],
  ])
    assert.throws(() => qualityJob(b, jobs), /QUALITY_JOB_NOT_SUCCESSFUL/);
  for (const rules of [
    [],
    [{ ...goodRules, enforcement: "disabled" }],
    [{ ...goodRules, bypass_actors: [{}] }],
    [
      {
        ...goodRules,
        rules: goodRules.rules.filter((r) => r.type !== "pull_request"),
      },
    ],
  ])
    assert.throws(() => protectedMain(rules), /MAIN_RULESET_CHANGED/);
});
test("GitHub transport is outbound public-only, denies offline and verifies exact run attempt", async () => {
  const requests = [];
  const gate = new GitHubGate(async (url, options) => {
    requests.push({ url, options });
    const data = url.includes("git/ref")
      ? { ref: "refs/heads/main", object: { type: "commit", sha: b } }
      : url.includes("/runs?")
        ? { workflow_runs: [green] }
        : url.includes("/jobs?")
          ? {
              jobs: [
                {
                  name: "quality",
                  head_sha: b,
                  status: "completed",
                  conclusion: "success",
                },
              ],
            }
          : url.endsWith("rulesets")
            ? [{ id: 1, target: "branch", enforcement: "active" }]
            : goodRules;
    return { ok: true, json: async () => data };
  });
  await gate.gate(b);
  assert(requests.some((r) => r.url.includes("/attempts/1/jobs")));
  assert(
    requests.every(
      (r) =>
        !r.options.headers.Authorization &&
        r.options.redirect === "error" &&
        r.url.startsWith(`https://api.github.com/repos/${REPOSITORY}/`),
    ),
  );
  await assert.rejects(
    new GitHubGate(async () => {
      throw new Error("private token/path");
    }).latest(),
    /GITHUB_OFFLINE/,
  );
});

function operatorGitHubFixture({
  driftAt = -1,
  fault = "",
  rulesets = 1,
  rateAt = Infinity,
  legacy = false,
} = {}) {
  const requests = [];
  let stage = 0;
  const gate = new GitHubGate(async (url, options) => {
    assert.equal(
      Object.keys(options.headers).some(
        (k) => k.toLowerCase() === "authorization",
      ),
      false,
    );
    requests.push({ stage, url });
    if (requests.length >= rateAt) return { ok: false, status: 403 };
    const changed = stage === driftAt;
    if (changed && ["403", "429"].includes(fault))
      return { ok: false, status: Number(fault) };
    const data = url.includes("git/ref")
      ? {
          ref: "refs/heads/main",
          object: { type: "commit", sha: changed && fault === "main" ? c : b },
        }
      : url.includes("/runs?")
        ? {
            workflow_runs: [
              {
                ...green,
                run_attempt: changed && fault === "attempt" ? 2 : 1,
                conclusion:
                  changed && fault === "quality" ? "failure" : "success",
              },
            ],
          }
        : url.includes("/jobs?")
          ? {
              jobs: [
                {
                  name: "quality",
                  head_sha: b,
                  status: "completed",
                  conclusion:
                    changed &&
                    (fault === "job" ||
                      (fault === "attempt" && url.includes("/attempts/2/")))
                      ? "failure"
                      : "success",
                },
              ],
            }
          : url.endsWith("rulesets")
            ? Array.from({ length: rulesets }, (_, i) => ({
                id: i + 1,
                target: "branch",
                enforcement: "active",
              }))
            : {
                ...goodRules,
                bypass_actors: changed && fault === "ruleset" ? [{}] : [],
              };
    return { ok: true, json: async () => structuredClone(data) };
  });
  return {
    requests,
    commitBudget: legacy ? 48 + 8 * (rulesets - 1) : 24 + 4 * (rulesets - 1),
    authorize: async (name = "entry") => {
      stage++;
      if (legacy) {
        assert.equal(await gate.latest(), b);
        await gate.gate(b);
      } else await authorizeOperatorGitHub(gate, b, name, true);
    },
  };
}
async function scriptedReattempt(remote, failAfterCommit = false) {
  const writes = [];
  let schema = 9;
  const io = {
    authorize: remote.authorize,
    prepareCompatiblePair: async () => {
      writes.push("build-candidate", "build-fallback");
      return { candidate: {}, fallback: {} };
    },
    prepareHelpers: async () => {},
    originalCheckpoint: async () => {
      await remote.authorize("verify-start");
      await remote.authorize("verify-complete");
      return {};
    },
    save: async (j) => writes.push(j.phase),
    stopFrozenWorker: async () => writes.push("stop"),
    freeSingleWriter: async () => {},
    stoppedCheckpoint: async (cp) => cp,
    assertOperatorHandoff: async () => {},
    backupAndProveRecovery: async () => ({}),
    armNewWorker: async () => writes.push("arm"),
    migrateSameFile: async () => {
      assert.equal(remote.requests.length, remote.commitBudget);
      schema = 10;
      writes.push("commit");
      if (failAfterCommit) throw Error("LOST_COMMIT_RESPONSE");
    },
    schemaVersion: async () => schema,
    prepareV9Recovery: async () => true,
    restoreOldWorker: async () => writes.push("restore-v9"),
    publishCompatiblePair: async () => {},
    startAndProve: async () => {},
    selectFallback: async () => {},
  };
  try {
    await remote.authorize(); // outer host: before operator lease
    await remote.authorize("verify-start");
    await remote.authorize("verify-complete"); // actual verifier repeats this before archive
    writes.push("acknowledgement");
    await upgradeExistingProtocol(io);
  } catch (error) {
    return { error, writes, io };
  }
  return { writes, io };
}
test("approved previous authorization ordering costs 48 REST requests with the identical GitHubGate", async () => {
  const remote = operatorGitHubFixture({ legacy: true });
  const result = await scriptedReattempt(remote);
  assert.equal(result.error, undefined);
  assert.equal(remote.requests.length, 48);
  assert.equal(
    remote.requests.filter((r) => r.url.includes("/runs?")).length,
    8,
  );
});
test("re-attempt has 24 public REST requests through commit; full fresh gates at all four essential boundaries", async () => {
  const remote = operatorGitHubFixture();
  const result = await scriptedReattempt(remote);
  assert.equal(result.error, undefined);
  assert.deepEqual(
    Array.from(
      { length: 8 },
      (_, i) => remote.requests.filter((r) => r.stage === i + 1).length,
    ),
    [5, 1, 5, 1, 1, 1, 5, 5],
  );
  assert.ok(result.writes.includes("complete-v10"));
  for (const event of [
    "acknowledgement",
    "build-candidate",
    "build-fallback",
    "release-prepared",
    "commit",
  ])
    assert.equal(result.writes.filter((v) => v === event).length, 1);
  assert.equal(
    remote.requests.filter((r) => r.url.includes("/runs?")).length,
    4,
  );
  assert.equal(
    remote.requests.filter((r) => r.url.endsWith("rulesets")).length,
    4,
  );
});
for (const fault of [
  "main",
  "quality",
  "attempt",
  "job",
  "ruleset",
  "403",
  "429",
]) {
  for (const stage of fault === "main" || ["403", "429"].includes(fault)
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [1, 3, 7, 8]) {
    test(`re-attempt denies ${fault} drift at authorization ${stage} before protected writes`, async () => {
      const remote = operatorGitHubFixture({ driftAt: stage, fault });
      const result = await scriptedReattempt(remote);
      assert.ok(result.error);
      assert.equal(result.writes.includes("commit"), false);
      if (stage <= 3)
        assert.equal(result.writes.includes("acknowledgement"), false);
      if (stage <= 7) assert.equal(result.writes.includes("stop"), false);
      if (stage === 8) assert.ok(result.writes.includes("restore-v9"));
      if (["403", "429"].includes(fault)) {
        assert.match(result.error.message, /GITHUB_RATE_LIMIT/);
        assert.equal(
          remote.requests.filter((r) => r.stage === stage).length,
          1,
        ); // no retry
      }
    });
  }
}
test("additional active rulesets are freshly fetched at each essential gate and counted", async () => {
  const remote = operatorGitHubFixture({ rulesets: 2 });
  const result = await scriptedReattempt(remote);
  assert.equal(result.error, undefined);
  assert.equal(remote.requests.length, 28);
  assert.equal(
    remote.requests.filter((r) => r.url.endsWith("rulesets/2")).length,
    4,
  );
});
test("quota exhaustion partway through final gate restores v9 without commit or transport retry", async () => {
  for (const rateAt of [21, 22, 23, 24]) {
    const remote = operatorGitHubFixture({ rateAt });
    const result = await scriptedReattempt(remote);
    assert.match(result.error.message, /GITHUB_RATE_LIMIT/);
    assert.equal(remote.requests.length, rateAt);
    assert.equal(result.writes.includes("commit"), false);
    assert.ok(result.writes.includes("restore-v9"));
  }
});
test("committed recovery takes ten additional fresh requests and never restores v9", async () => {
  const remote = operatorGitHubFixture();
  const result = await scriptedReattempt(remote, true);
  assert.match(result.error.message, /LOST_COMMIT_RESPONSE/);
  assert.ok(result.writes.includes("recovery-required-v10"));
  assert.equal(result.writes.includes("restore-v9"), false);
  await remote.authorize(); // separately authorized recovery host entry
  await recoverExistingProtocol(result.io, {
    prepared: { fallback: {} },
    checkpoint: {},
    phase: "recovery-required-v10",
  });
  assert.equal(remote.requests.length, 34);
  assert.equal(result.writes.includes("restore-v9"), false);
});
test("operator gates fail closed on unknown stages; ordinary post-build gate is full, not re-attempt-only", async () => {
  let calls = 0;
  const github = {
    latest: async () => {
      calls++;
      return b;
    },
    gate: async () => {
      calls += 5;
    },
  };
  await assert.rejects(
    authorizeOperatorGitHub(github, b, "unknown"),
    /OPERATOR_GATE_STAGE_INVALID/,
  );
  assert.equal(calls, 0);
  await authorizeOperatorGitHub(github, b, "after-build", false);
  assert.equal(calls, 5);
});

test("build-before-stop, durable good release, one writer and idempotent no-op", async () => {
  const f = fixture();
  await deploy(f.state, f.io);
  assert.deepEqual(f.events, [
    "gate",
    "build",
    "gate",
    "preflight",
    "stop",
    "port+lease-free",
    "start-b",
    "health-b",
  ]);
  assert.equal(f.state.lastGood.sha, b);
  assert.equal(f.state.previousGood.sha, a);
  assert.equal(f.state.status, "succeeded");
  assert.equal(f.writers(), 1);
  assert.equal(
    f.snapshots.find((s) => s.transition?.phase === "starting").lastGood.sha,
    a,
  );
  f.events.length = 0;
  await deploy(f.state, f.io);
  assert.deepEqual(f.events, []);
});
test("two green merges and preflight race never switch a superseded release", async () => {
  for (const point of ["prepare", "preflight"]) {
    const f = fixture(),
      original = f.io[point];
    f.io[point] = async (...args) => {
      const r = await original(...args);
      f.main(c);
      return r;
    };
    f.io.gate = async () => {};
    await deploy(f.state, f.io);
    assert(!f.events.includes("stop"));
    assert.equal(f.state.lastGood.sha, a);
    f.io[point] = original;
    await deploy(f.state, f.io);
    assert.equal(f.state.lastGood.sha, c);
  }
});
test("failed build leaves app untouched; 3 bounded attempts require retry", async () => {
  const f = fixture();
  f.io.prepare = async () => {
    throw new Error("BUILD_FAILED");
  };
  for (let n = 0; n < 3; n++)
    await deploy(f.state, f.io, { now: n * 10_000_000 });
  assert.equal(f.state.status, "blocked");
  assert.equal(f.state.failures, 3);
  assert(!f.events.includes("stop"));
  assert.equal(f.writers(), 1);
  const count = f.events.length;
  await deploy(f.state, f.io, { now: 99_000_000 });
  assert.equal(f.events.length, count);
});
test("pending CI and offline resume after sleep without manual retry", async () => {
  const f = fixture();
  f.io.gate = async () => {
    throw new Error("QUALITY_NOT_SUCCESSFUL");
  };
  for (let n = 0; n < 8; n++)
    await deploy(f.state, f.io, { now: n * 1_000_000 });
  assert.equal(f.state.failures, 0);
  assert(!f.events.includes("stop"));
  f.io.gate = async () => {};
  await deploy(f.state, f.io, { now: 20_000_000 });
  assert.equal(f.state.lastGood.sha, b);
});
test("schema/security boundaries and pause during build fail before stop", async () => {
  const f = fixture();
  f.io.preflight = async () => {
    throw new Error("SCHEMA_RUNTIME_COMPATIBILITY_CHANGED");
  };
  await deploy(f.state, f.io);
  assert.equal(f.state.status, "blocked");
  assert(!f.events.includes("stop"));
  const paused = fixture();
  paused.io.commands = async (s) => {
    s.autoEnabled = false;
  };
  await deploy(paused.state, paused.io);
  assert(!paused.events.includes("stop"));
  const latePause = fixture();
  let queued = false;
  latePause.io.preflight = async () => {
    queued = true;
  };
  latePause.io.commands = async (s) => {
    if (queued) s.autoEnabled = false;
  };
  await deploy(latePause.state, latePause.io);
  assert(!latePause.events.includes("stop"));
  assert.equal(latePause.writers(), 1);
});
test("startup, crash and health failure restore last good with no overlap", async () => {
  for (const point of ["start", "health"]) {
    const f = fixture(),
      original = f.io[point];
    f.io[point] = async (r) => {
      if (r.sha === b) throw new Error("CANDIDATE_FAILED");
      return original(r);
    };
    await deploy(f.state, f.io);
    assert.equal(f.state.lastGood.sha, a);
    assert.equal(f.state.status, "failed");
    assert.equal(f.state.transition, null);
    assert.equal(f.writers(), 1);
    assert(f.events.includes("start-a"));
  }
});
test("lease/shutdown refusal and unsafe rollback never start another writer", async () => {
  const f = fixture();
  f.io.stop = async () => {
    throw new Error("GRACEFUL_SHUTDOWN_FAILED");
  };
  await deploy(f.state, f.io);
  assert(!f.events.some((e) => e.startsWith("start-")));
  assert.equal(f.writers(), 1);
  const broken = fixture();
  broken.io.free = async () => {
    throw new Error("LEASE_BUSY");
  };
  await deploy(broken.state, broken.io);
  assert.equal(broken.state.error, "ROLLBACK_NOT_SAFE");
  assert(!broken.events.some((e) => e.startsWith("start-")));
});
test("paths/logs/status are private, redacted and symlink-safe", async () => {
  const root = mkdtempSync(join(temporary, "life-os-139-"));
  const file = join(root, "private.json");
  writeFileSync(file, "{}", { mode: 0o600 });
  boundary(file);
  symlinkSync(file, join(root, "link"));
  assert.throws(() => boundary(join(root, "link")), /BOUNDARY/);
  assert.equal(
    errorCode(new Error("/private/database owner@invalid token=value")),
    "PREVIEW_OPERATION_FAILED",
  );
  assert(
    !JSON.stringify(publicStatus(initialState(release(a)))).includes(
      "private-fixture",
    ),
  );
  assert.equal(
    (await cli(["status", join(root, "absent")])).installation,
    "NOT_ACTIVE",
  );
});
test("native updater lease serializes workers and recovers after process crash", async () => {
  const root = mkdtempSync(join(temporary, "life-os-139-lock-")),
    lock = join(root, "lock.db"),
    source = process.cwd();
  const unlock = operationalLock(lock, source);
  assert.throws(() => operationalLock(lock, source), /ALREADY_RUNNING/);
  unlock();
  const script = `import {operationalLock} from ${JSON.stringify(new URL("./preview-cd-host.mjs", import.meta.url).href)};const unlock=operationalLock(${JSON.stringify(lock)},${JSON.stringify(source)});process.on('SIGTERM',()=>{unlock();process.exit(0)});console.log('LOCKED');setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  const ended = new Promise((r) => child.once("exit", r));
  try {
    await Promise.race([
      new Promise((r) => child.stdout.once("data", r)),
      ended.then(() => {
        throw Error("FIXTURE_LOCK_PROCESS_EXITED");
      }),
    ]);
    assert.throws(() => operationalLock(lock, source), /ALREADY_RUNNING/);
    child.kill("SIGKILL");
    await ended;
    const recovered = operationalLock(lock, source);
    recovered();
  } finally {
    // A failed assertion must never strand the exclusively owned fixture child.
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await ended;
    }
  }
});
test("launchd fixture contains one supervisor, no app secrets/listener and valid plist", () => {
  const xml = launchAgent(
    "/fixture/node",
    "/fixture/a & b.mjs",
    "/fixture/private",
  );
  assert(xml.includes("AbandonProcessGroup</key><false/>"));
  assert(xml.includes("KeepAlive</key><true/>"));
  assert(
    !xml.includes("EnvironmentVariables") &&
      !xml.includes("Sockets") &&
      !xml.includes("HOSTED"),
  );
  assert(xml.includes("a &amp; b.mjs"));
  if (process.platform === "darwin") {
    const dir = mkdtempSync(join(temporary, "life-os-139-plist-")),
      file = join(dir, "fixture.plist");
    writeFileSync(file, xml);
    assert.match(
      execFileSync("/usr/bin/plutil", ["-lint", file], { encoding: "utf8" }),
      /OK/,
    );
  }
});
test("source fingerprint ignores UI but detects schema/runtime/auth changes", () => {
  const root = mkdtempSync(join(temporary, "life-os-139-fingerprint-"));
  for (const p of [
    "src/features/real-data/sqlite",
    "src/features/real-data/runtime",
    "src/features/real-data/actions",
    "src/features/real-data/preview-reset",
    "src/app/api/preview/epoch",
    "scripts/ops",
  ])
    mkdirSync(join(root, p), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      engines: { node: "24.21.0" },
      packageManager: "pnpm@11.3.0",
      dependencies: { "better-sqlite3": "13.0.3", next: "16.2.2" },
    }),
  );
  for (const p of [
    "src/instrumentation.ts",
    "src/features/real-data/runtime/application-context.ts",
    "src/features/real-data/runtime/configuration.ts",
    "src/features/real-data/runtime/submitted-dataset-epoch.ts",
    "src/features/real-data/actions/submitted-dataset.ts",
    "scripts/ops/run-production.mjs",
    "scripts/ops/run-preview-production.mjs",
    "src/features/real-data/actions/preview-reset.actions.ts",
    "src/features/real-data/preview-reset/epoch-transport.tsx",
    "src/app/api/preview/epoch/route.ts",
    "src/features/real-data/sqlite/core-schema.ts",
    "src/features/real-data/sqlite/goal-guards.ts",
    "src/features/real-data/sqlite/preview-grant.ts",
  ])
    writeFileSync(join(root, p), "accepted");
  const before = compatibilityFingerprint(root);
  for (const path of [
    "src/features/real-data/sqlite/goal-guards.ts",
    "src/features/real-data/sqlite/preview-grant.ts",
    "src/features/real-data/actions/preview-reset.actions.ts",
  ]) {
    writeFileSync(join(root, path), "security boundary changed");
    assert.notEqual(compatibilityFingerprint(root), before);
    writeFileSync(join(root, path), "accepted");
  }
  writeFileSync(join(root, "src/ui.tsx"), "new view");
  assert.equal(compatibilityFingerprint(root), before);
  writeFileSync(join(root, "next.config.ts"), "changed host boundary");
  assert.notEqual(compatibilityFingerprint(root), before);
  writeFileSync(
    join(root, "src/features/real-data/sqlite/core-schema.ts"),
    "new schema",
  );
  assert.notEqual(compatibilityFingerprint(root), before);
});
