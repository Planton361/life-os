import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectDoctor,
  renderHuman,
  renderJson,
  sanitizeRemoteIdentity,
} from "./workstation-doctor.mjs";

const HEAD = "a".repeat(40);
const MAIN = "b".repeat(40);
const OTHER = "c".repeat(40);

function scenario(overrides = {}) {
  const state = {
    branch: "codex/14-cross-device-handoff",
    status: "",
    head: HEAD,
    origin: "git@github.com:Planton361/life-os.git",
    upstream: "origin/codex/14-cross-device-handoff",
    remoteMode: "current",
    missingTools: new Set(),
    ...overrides,
  };
  const calls = [];

  const run = async (command, args) => {
    calls.push({ command, args: [...args] });
    if (state.missingTools.has(command))
      return { ok: false, stdout: "", stderr: "", errorCode: "ENOENT" };

    if (command === "pnpm" && args[0] === "--version")
      return { ok: true, stdout: "11.3.0\n", stderr: "" };
    if (command === "gh")
      return { ok: true, stdout: "gh version 2.101.0\n", stderr: "" };
    if (command === "codex")
      return { ok: true, stdout: "codex 1.2.3\n", stderr: "" };
    if (command === "docker")
      return { ok: true, stdout: "Docker version 29.8.1\n", stderr: "" };
    if (command === "supabase")
      return { ok: true, stdout: "2.107.0\n", stderr: "" };

    if (command !== "git")
      return { ok: false, stdout: "", stderr: "", errorCode: "ENOENT" };
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel")
      return { ok: true, stdout: "/workspace/life-os\n", stderr: "" };
    if (args[0] === "branch")
      return { ok: true, stdout: `${state.branch}\n`, stderr: "" };
    if (args[0] === "status")
      return { ok: true, stdout: state.status, stderr: "" };
    if (args[0] === "remote")
      return { ok: true, stdout: `${state.origin}\n`, stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "--verify" && args[2] === "HEAD^{commit}")
      return { ok: true, stdout: `${state.head}\n`, stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "--abbrev-ref")
      return { ok: true, stdout: `${state.upstream}\n`, stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "--verify") {
      const ref = args[2];
      return {
        ok: true,
        stdout: ref.includes("origin/main") ? `${MAIN}\n` : `${HEAD}\n`,
        stderr: "",
      };
    }
    if (args[0] === "rev-list")
      return { ok: true, stdout: "0 0\n", stderr: "" };
    if (args[0] === "ls-remote") {
      const branch = args[3];
      if (state.remoteMode === "unknown")
        return {
          ok: false,
          stdout: "",
          stderr: "fatal: https://user:secret-token@example.invalid/repo.git",
          errorCode: "REMOTE_UNAVAILABLE",
        };
      if (state.remoteMode === "missing" && branch !== "main")
        return { ok: true, stdout: "", stderr: "" };
      const sha = branch === "main" ? MAIN : state.remoteMode === "different" ? OTHER : HEAD;
      return { ok: true, stdout: `${sha}\trefs/heads/${branch}\n`, stderr: "" };
    }
    if (args[0] === "--version")
      return { ok: true, stdout: "git version 2.55.0\n", stderr: "" };
    throw new Error(`Unexpected fake git command: ${args.join(" ")}`);
  };

  return { state, calls, run };
}

async function doctorFor(overrides = {}) {
  const fake = scenario(overrides);
  const report = await collectDoctor({
    run: fake.run,
    cwd: "/workspace/life-os",
    packageManager: "pnpm@11.3.0",
    pnpmVersion: "11.3.0",
    supabasePresent: true,
    supabaseCommand: "supabase",
    supabaseVersion: "2.107.0",
    ...overrides.options,
  });
  return { ...fake, report };
}

function assertNoMutatingCommands(calls) {
  const gitMutations = new Set([
    "fetch",
    "pull",
    "push",
    "commit",
    "checkout",
    "switch",
    "reset",
    "clean",
    "stash",
  ]);
  for (const { command, args } of calls) {
    if (command === "git") assert.ok(!gitMutations.has(args[0]), `unexpected git mutation: ${args.join(" ")}`);
    if (command === "gh") assert.notEqual(args[0], "auth", "doctor must not inspect or mutate gh auth");
    if (command === "docker") assert.ok(!["start", "stop"].includes(args[0]));
    if (command === "supabase") assert.ok(!["start", "stop", "link", "db", "migration"].includes(args[0]));
    if (command === "pnpm") assert.ok(!["install", "add", "remove", "update"].includes(args[0]));
  }
}

test("reports a synchronized clean Issue branch as handoff-safe", async () => {
  const { calls, report } = await doctorFor();

  assert.equal(report.result, "PASS");
  assert.equal(report.handoffSafe, true);
  assert.equal(report.checks.remote.status, "PASS");
  assert.equal(report.checks.originMain.status, "PASS");
  assertNoMutatingCommands(calls);
});

test("reports missing optional workstation tools without pretending they are ready", async () => {
  const { report } = await doctorFor({
    missingTools: new Set(["gh", "codex", "docker"]),
    options: { supabasePresent: false },
  });

  assert.equal(report.result, "WARN");
  assert.equal(report.checks.gh.status, "WARN");
  assert.equal(report.checks.codex.status, "WARN");
  assert.equal(report.checks.docker.status, "WARN");
  assert.equal(report.checks.supabase.status, "WARN");
  assert.equal(report.handoffSafe, true);
});

test("fails when the repository-critical git tool is missing", async () => {
  const { report } = await doctorFor({ missingTools: new Set(["git"]) });

  assert.equal(report.result, "FAIL");
  assert.equal(report.checks.git.status, "FAIL");
  assert.equal(report.handoffSafe, false);
});

test("fails dirty, wrong-origin and wrong-upstream handoff state without printing paths or credentials", async () => {
  const { report } = await doctorFor({
    status: " M private-note.txt\n?? secret.env\n",
    origin: "https://user:secret-token@evil.example/not-life-os.git?access_token=another-secret",
    upstream: "origin/main",
    remoteMode: "unknown",
  });

  const output = renderHuman(report);
  assert.equal(report.result, "FAIL");
  assert.equal(report.handoffSafe, false);
  assert.equal(report.checks.workingTree.status, "FAIL");
  assert.equal(report.checks.origin.status, "FAIL");
  assert.equal(report.checks.upstream.status, "FAIL");
  assert.doesNotMatch(output, /private-note|secret\.env|secret-token|another-secret/);
  assert.match(output, /evil\.example\/not-life-os/);
});

test("warns and blocks handoff when remote freshness is unknown", async () => {
  const { calls, report } = await doctorFor({ remoteMode: "unknown" });

  assert.equal(report.result, "WARN");
  assert.equal(report.checks.remote.status, "WARN");
  assert.equal(report.checks.originMain.status, "WARN");
  assert.equal(report.handoffSafe, false);
  assert.match(report.checks.handoff.detail, /remote-freshness-unknown/);
  assertNoMutatingCommands(calls);
  assert.doesNotMatch(renderJson(report), /secret-token|example\.invalid/);
});

test("fails when the current remote branch differs from local HEAD", async () => {
  const { report } = await doctorFor({ remoteMode: "different" });

  assert.equal(report.result, "FAIL");
  assert.equal(report.checks.remote.status, "FAIL");
  assert.equal(report.handoffSafe, false);
  assert.match(report.checks.handoff.detail, /local-HEAD-does-not-match-remote-branch/);
});

test("fails when the remote Issue branch is missing", async () => {
  const { report } = await doctorFor({ remoteMode: "missing" });

  assert.equal(report.result, "FAIL");
  assert.equal(report.checks.remote.status, "FAIL");
  assert.match(report.checks.handoff.detail, /remote-branch-is-missing/);
});

test("sanitizes HTTPS and SSH origins", () => {
  assert.equal(
    sanitizeRemoteIdentity(
      "https://user:secret-token@github.com/Planton361/life-os.git?access_token=another-secret",
    ),
    "github.com/Planton361/life-os",
  );
  assert.equal(
    sanitizeRemoteIdentity("git@github.com:Planton361/life-os.git"),
    "github.com/Planton361/life-os",
  );
});

test("human and JSON renderers expose stable smoke-testable output", async () => {
  const { report } = await doctorFor();
  const human = renderHuman(report);
  const json = renderJson(report);

  assert.match(human, /^WORKSTATION_DOCTOR result=PASS handoff-safe=true/m);
  assert.match(human, /origin: PASS github\.com\/Planton361\/life-os/);
  assert.deepEqual(JSON.parse(json), report);
});
