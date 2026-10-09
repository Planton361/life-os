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
  const script = `import {operationalLock} from ${JSON.stringify(new URL("./preview-cd-host.mjs", import.meta.url).href)};operationalLock(${JSON.stringify(lock)},${JSON.stringify(source)});console.log('LOCKED');setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  await new Promise((r) => child.stdout.once("data", r));
  assert.throws(() => operationalLock(lock, source), /ALREADY_RUNNING/);
  const ended = new Promise((r) => child.once("exit", r));
  child.kill("SIGKILL");
  await ended;
  const recovered = operationalLock(lock, source);
  recovered();
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
    "scripts/ops/run-production.mjs",
    "src/features/real-data/sqlite/core-schema.ts",
  ])
    writeFileSync(join(root, p), "accepted");
  const before = compatibilityFingerprint(root);
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
