#!/usr/bin/env node
import { access, readFile, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const EXPECTED_REPOSITORY = "github.com/Planton361/life-os";
export const SUPPORTED_PLATFORMS = ["linux", "darwin"];
export const CHECK_STATUSES = ["PASS", "WARN", "FAIL"];

const DEFAULT_COMMAND_TIMEOUT_MS = 5_000;
const REMOTE_COMMAND_TIMEOUT_MS = 10_000;

function result(ok, stdout = "", stderr = "", extra = {}) {
  return { ok, stdout, stderr, ...extra };
}

export function runCommand(
  command,
  args,
  { cwd = process.cwd(), timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {},
) {
  return new Promise((resolveResult) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer;
    let child;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult(value);
    };

    try {
      child = spawn(command, args, {
        cwd,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      finish(
        result(false, "", "", {
          errorCode: error?.code ?? "SPAWN_FAILED",
        }),
      );
      return;
    }

    child.stdout?.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-256_000);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-256_000);
    });
    child.once("error", (error) => {
      finish(
        result(false, stdout, "", {
          errorCode: error?.code ?? "SPAWN_FAILED",
        }),
      );
    });
    child.once("close", (code) => {
      finish(result(code === 0, stdout, stderr, { code }));
    });

    timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(result(false, stdout, "", { errorCode: "TIMEOUT", timedOut: true }));
    }, timeoutMs);
    timer.unref?.();
  });
}

function check(status, detail, value) {
  const output = { status };
  if (value !== undefined) output.value = value;
  if (detail) output.detail = detail;
  return output;
}

function normalized(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseVersion(output) {
  const match = normalized(output).match(/(?:^|\s)v?(\d+\.\d+(?:\.\d+)?)(?=$|[\s,;])/);
  return match?.[1] ?? null;
}

function versionMajor(version) {
  const major = Number.parseInt(version?.split(".")[0] ?? "", 10);
  return Number.isInteger(major) ? major : null;
}

function invokingPnpmVersion(userAgent = process.env.npm_config_user_agent) {
  return userAgent?.match(/(?:^|\s)pnpm\/(\d+\.\d+\.\d+)/)?.[1] ?? null;
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeRemoteIdentity(remoteUrl) {
  const raw = normalized(remoteUrl).split(/\r?\n/, 1)[0];
  if (!raw || raw.includes("\0")) return "unknown-origin";

  let host;
  let path;
  try {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      host = parsed.hostname;
      path = parsed.pathname;
    } else {
      const scp = raw.match(/^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/);
      if (!scp) return "unknown-origin";
      host = scp[1];
      path = scp[2];
    }
  } catch {
    return "unknown-origin";
  }

  const safeHost = normalized(host).toLowerCase();
  const safePath = normalized(path)
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "");
  if (!safeHost || !safePath) return "unknown-origin";
  return `${safeHost}/${safePath}`;
}

function comparableRepositoryIdentity(identity) {
  return normalized(identity).replace(/\.git$/i, "").toLowerCase();
}

function parseStatusEntries(stdout) {
  return normalized(stdout)
    ? stdout.split(/\r?\n/).filter(Boolean)
    : [];
}

function containsConflict(entries) {
  return entries.some((entry) => {
    const code = entry.slice(0, 2);
    return (
      code.includes("U") ||
      ["AA", "DD", "AU", "UA", "DU", "UD"].includes(code)
    );
  });
}

function parseRemoteHead(stdout, branch) {
  const expectedRef = `refs/heads/${branch}`;
  for (const line of stdout.split(/\r?\n/)) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (/^[0-9a-f]{40}$/i.test(sha ?? "") && ref === expectedRef)
      return sha.toLowerCase();
  }
  return null;
}

async function readPackageManager(root, override) {
  if (override !== undefined) return override;
  try {
    const packageJson = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    );
    return typeof packageJson.packageManager === "string"
      ? packageJson.packageManager
      : null;
  } catch {
    return null;
  }
}

async function readInstalledPackageVersion(root, packageName) {
  try {
    const packageJson = JSON.parse(
      await readFile(join(root, "node_modules", packageName, "package.json"), "utf8"),
    );
    return typeof packageJson.version === "string" ? packageJson.version : null;
  } catch {
    return null;
  }
}

async function findCommand(command) {
  if (command.includes("/") || command.includes("\\"))
    return (await fileExists(command)) ? command : null;

  const pathSeparator = process.platform === "win32" ? ";" : ":";
  for (const directory of (process.env.PATH ?? "").split(pathSeparator)) {
    if (!directory) continue;
    const candidate = join(directory, command);
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

async function readExecutablePackageVersion(command, packageName) {
  const executable = await findCommand(command);
  if (!executable) return { found: false, version: null };

  let directory;
  try {
    directory = dirname(await realpath(executable));
  } catch {
    return { found: true, version: null };
  }

  for (let depth = 0; depth < 5; depth += 1) {
    try {
      const packageJson = JSON.parse(
        await readFile(join(directory, "package.json"), "utf8"),
      );
      if (packageJson.name === packageName && typeof packageJson.version === "string")
        return { found: true, version: packageJson.version };
    } catch {
      // Keep walking from a shim/bin directory to the owning package.
    }
    directory = dirname(directory);
  }
  return { found: true, version: null };
}

async function probeTool(run, root, command, args, missingStatus) {
  const probe = await run(command, args, {
    cwd: root,
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  });
  if (!probe.ok) {
    const detail = probe.timedOut
      ? "version probe timed out"
      : probe.errorCode === "ENOENT"
        ? "not installed"
        : "version probe unavailable";
    return check(missingStatus, detail);
  }

  const version = parseVersion(`${probe.stdout}\n${probe.stderr}`);
  return version
    ? check("PASS", "available", version)
    : check("WARN", "command available but version was not reported");
}

async function readKnownRemoteRef(run, root, ref) {
  const probe = await run("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: root,
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  });
  return probe.ok && /^[0-9a-f]{40}$/i.test(normalized(probe.stdout))
    ? normalized(probe.stdout).toLowerCase()
    : null;
}

async function readKnownRelation(run, root, ref) {
  const probe = await run("git", ["rev-list", "--left-right", "--count", `HEAD...${ref}`], {
    cwd: root,
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  });
  const match = normalized(probe.stdout).match(/^(\d+)\s+(\d+)$/);
  if (!probe.ok || !match) return "unknown";

  const ahead = Number.parseInt(match[1], 10);
  const behind = Number.parseInt(match[2], 10);
  if (ahead === 0 && behind === 0) return "equal";
  if (ahead > 0 && behind === 0) return "ahead";
  if (ahead === 0 && behind > 0) return "behind";
  return "diverged";
}

async function readCurrentRemoteHead(run, root, branch) {
  const probe = await run("git", ["ls-remote", "--heads", "origin", branch], {
    cwd: root,
    timeoutMs: REMOTE_COMMAND_TIMEOUT_MS,
  });
  if (!probe.ok) return { state: "unknown" };

  const sha = parseRemoteHead(probe.stdout, branch);
  return sha ? { state: "present", sha } : { state: "missing" };
}

function relationForRemote(head, remote) {
  if (remote.state === "unknown") return "unknown";
  if (remote.state === "missing") return "missing";
  return head && head === remote.sha ? "synchronized" : "different";
}

function handoffReport({
  branch,
  originMatches,
  clean,
  conflicts,
  head,
  upstreamMatches,
  remote,
  originMain,
}) {
  const hardReasons = [];
  const unknownReasons = [];

  if (branch === "main") unknownReasons.push("main-is-read-only");
  if (!branch) hardReasons.push("detached-or-unknown-branch");
  if (!originMatches) hardReasons.push("origin-is-not-the-approved-repository");
  if (!clean) hardReasons.push("working-tree-is-dirty");
  if (conflicts) hardReasons.push("unresolved-conflicts-present");
  if (!head) hardReasons.push("HEAD-is-unavailable");
  if (!upstreamMatches) hardReasons.push("upstream-is-not-origin-branch");

  if (remote.state === "unknown") unknownReasons.push("remote-freshness-unknown");
  if (remote.state === "missing") hardReasons.push("remote-branch-is-missing");
  if (remote.state === "present" && remote.relation !== "synchronized")
    hardReasons.push("local-HEAD-does-not-match-remote-branch");

  if (originMain.state === "unknown") unknownReasons.push("origin-main-freshness-unknown");
  if (originMain.state === "missing")
    unknownReasons.push("local-origin-main-is-unavailable");
  if (originMain.state === "present" && originMain.localRelation === "different")
    hardReasons.push("local-origin-main-is-stale");

  const safe = hardReasons.length === 0 && unknownReasons.length === 0 && branch !== "main";
  const status = hardReasons.length > 0 ? "FAIL" : unknownReasons.length > 0 ? "WARN" : "PASS";
  return {
    status,
    safe,
    reasons: [...hardReasons, ...unknownReasons],
  };
}

export async function collectDoctor({
  cwd = process.cwd(),
  run = runCommand,
  platform = process.platform,
  arch = process.arch,
  packageManager: packageManagerOverride,
  expectedRepository = EXPECTED_REPOSITORY,
  pnpmVersion: pnpmVersionOverride,
  supabasePresent: supabasePresentOverride,
  supabaseCommand: supabaseCommandOverride,
  supabaseVersion: supabaseVersionOverride,
} = {}) {
  const checks = {};
  const platformSupported = SUPPORTED_PLATFORMS.includes(platform);
  checks.os = check(
    platformSupported ? "PASS" : "FAIL",
    platformSupported ? "supported workstation host" : "unsupported workstation host",
    `${platform}/${arch}`,
  );

  const nodeVersion = process.version.replace(/^v/, "");
  const nodeMajor = versionMajor(nodeVersion);
  checks.node = check(
    nodeMajor === 22 ? "PASS" : "FAIL",
    nodeMajor === 22 ? "expected Node 22.x" : "expected Node 22.x",
    nodeVersion,
  );

  const rootProbe = await run("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  });
  const root = rootProbe.ok ? resolve(normalized(rootProbe.stdout)) : null;
  checks.repository = root
    ? check("PASS", "Git repository root", root)
    : check("FAIL", "repository root unavailable");

  const packageManager = root
    ? await readPackageManager(root, packageManagerOverride)
    : packageManagerOverride ?? null;
  const expectedPnpmVersion = packageManager?.match(/^pnpm@(\d+\.\d+\.\d+)$/)?.[1] ?? null;
  const invokingVersion = invokingPnpmVersion();
  const pnpmInspection = pnpmVersionOverride
    ? { found: true, version: pnpmVersionOverride, source: "test override" }
    : invokingVersion
      ? { found: true, version: invokingVersion, source: "invoking package manager" }
      : {
          ...(await readExecutablePackageVersion("pnpm", "pnpm")),
          source: "installed package metadata",
        };
  const pnpmProbe = pnpmInspection.version
    ? check("PASS", `version read from ${pnpmInspection.source}`, pnpmInspection.version)
    : check(
        pnpmInspection.found ? "WARN" : "FAIL",
        pnpmInspection.found
          ? "pnpm executable found but version metadata was unavailable"
          : "pnpm executable not found",
      );
  const actualPnpmVersion = pnpmProbe.value;
  if (pnpmProbe.status === "PASS" && expectedPnpmVersion && actualPnpmVersion === expectedPnpmVersion) {
    checks.pnpm = check("PASS", `matches packageManager ${packageManager}`, actualPnpmVersion);
  } else if (pnpmProbe.status === "PASS" && expectedPnpmVersion) {
    checks.pnpm = check(
      versionMajor(actualPnpmVersion) === versionMajor(expectedPnpmVersion) ? "WARN" : "FAIL",
      `expected ${packageManager}`,
      actualPnpmVersion,
    );
  } else if (!expectedPnpmVersion) {
    checks.pnpm = check("FAIL", "package.json must declare pnpm@<major>.<minor>.<patch>");
  } else {
    checks.pnpm = pnpmProbe;
  }

  const [gitCheck, ghCheck, codexCheck, dockerCheck] = await Promise.all([
    probeTool(run, root ?? cwd, "git", ["--version"], "FAIL"),
    probeTool(run, root ?? cwd, "gh", ["--version"], "WARN"),
    probeTool(run, root ?? cwd, "codex", ["--version"], "WARN"),
    probeTool(run, root ?? cwd, "docker", ["--version"], "WARN"),
  ]);
  checks.git = gitCheck;
  checks.gh = ghCheck;
  checks.codex = codexCheck;
  checks.docker = dockerCheck;

  let supabaseCommand = supabaseCommandOverride;
  let supabasePresent = supabasePresentOverride;
  if (supabaseCommand === undefined && root) {
    supabaseCommand = join(
      root,
      "node_modules",
      ".bin",
      platform === "win32" ? "supabase.cmd" : "supabase",
    );
  }
  if (supabasePresent === undefined && supabaseCommand)
    supabasePresent = await fileExists(supabaseCommand);
  const supabaseVersion =
    supabaseVersionOverride ??
    (supabasePresent && root
      ? await readInstalledPackageVersion(root, "supabase")
      : null);
  checks.supabase = supabasePresent
    ? supabaseVersion
      ? check("PASS", "project executable and package metadata present", supabaseVersion)
      : check("WARN", "project executable present; CLI not run because version probes may write telemetry")
    : check("WARN", "project Supabase executable is not installed; not run");

  const repository = {
    root,
    branch: null,
    head: null,
    origin: "unknown-origin",
    upstream: null,
    workingTree: "unknown",
    conflicts: false,
    knownRemote: null,
    remote: {
      branch: null,
      freshness: "unknown",
      relation: "unknown",
      head: null,
    },
    originMain: {
      freshness: "unknown",
      localHead: null,
      remoteHead: null,
      localRelation: "unknown",
    },
  };

  if (root) {
    const [branchProbe, statusProbe, headProbe, originProbe, upstreamProbe] = await Promise.all([
      run("git", ["branch", "--show-current"], { cwd: root, timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS }),
      run("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
        cwd: root,
        timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
      }),
      run("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
        cwd: root,
        timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
      }),
      run("git", ["remote", "get-url", "origin"], {
        cwd: root,
        timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
      }),
      run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], {
        cwd: root,
        timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
      }),
    ]);

    repository.branch = normalized(branchProbe.stdout) || null;
    repository.head = /^[0-9a-f]{40}$/i.test(normalized(headProbe.stdout))
      ? normalized(headProbe.stdout).toLowerCase()
      : null;
    repository.origin = originProbe.ok
      ? sanitizeRemoteIdentity(originProbe.stdout)
      : "unknown-origin";
    repository.upstream = normalized(upstreamProbe.stdout) || null;
    const statusEntries = statusProbe.ok ? parseStatusEntries(statusProbe.stdout) : [];
    repository.workingTree = statusProbe.ok
      ? statusEntries.length === 0
        ? "clean"
        : "dirty"
      : "unknown";
    repository.conflicts = containsConflict(statusEntries);

    checks.branch = repository.branch
      ? check("PASS", "attached branch", repository.branch)
      : check("FAIL", "detached HEAD or branch unavailable");
    checks.head = repository.head
      ? check("PASS", "unambiguous revision identity", repository.head)
      : check("FAIL", "HEAD unavailable");
    checks.workingTree =
      repository.workingTree === "clean"
        ? check("PASS", "no tracked or untracked changes", "clean")
        : repository.workingTree === "dirty"
          ? check("FAIL", "changes present; paths intentionally omitted", "dirty")
          : check("FAIL", "working-tree state unavailable");
    checks.conflicts = repository.conflicts
      ? check("FAIL", "unresolved merge conflict markers present")
      : check("PASS", "no unresolved merge conflicts detected");

    const originMatches =
      comparableRepositoryIdentity(repository.origin) ===
      comparableRepositoryIdentity(expectedRepository);
    checks.origin =
      repository.origin === "unknown-origin"
        ? check("FAIL", "origin URL unavailable", repository.origin)
        : originMatches
          ? check("PASS", "approved GitHub repository", repository.origin)
          : check("FAIL", "unexpected repository identity", repository.origin);

    const expectedUpstream = repository.branch
      ? repository.branch === "main"
        ? "origin/main"
        : `origin/${repository.branch}`
      : null;
    const upstreamMatches = Boolean(expectedUpstream && repository.upstream === expectedUpstream);
    checks.upstream = repository.upstream
      ? upstreamMatches
        ? check("PASS", "tracks the same-named remote branch", repository.upstream)
        : check("FAIL", `expected ${expectedUpstream}`, repository.upstream)
      : check("FAIL", `expected ${expectedUpstream ?? "an Issue branch"}`);

    if (repository.branch) {
      const knownRef = `refs/remotes/origin/${repository.branch}`;
      const knownRemoteHead = await readKnownRemoteRef(run, root, knownRef);
      repository.knownRemote = {
        head: knownRemoteHead,
        relation: knownRemoteHead ? await readKnownRelation(run, root, knownRef) : "unknown",
      };
      checks.knownRemote = knownRemoteHead
        ? repository.knownRemote.relation === "equal"
          ? check("PASS", "local HEAD versus last fetched remote-tracking ref", "equal")
          : check(
              "WARN",
              "local HEAD versus last fetched remote-tracking ref",
              repository.knownRemote.relation,
            )
        : check("WARN", "last fetched remote-tracking ref is unavailable");

      const originMatchesForRemote = checks.origin.status === "PASS";
      const [remote, mainRemote] = originMatchesForRemote
        ? await Promise.all([
            readCurrentRemoteHead(run, root, repository.branch),
            repository.branch === "main"
              ? Promise.resolve(null)
              : readCurrentRemoteHead(run, root, "main"),
          ])
        : [{ state: "unknown" }, null];
      const currentRemote = remote;
      repository.remote = {
        branch: repository.branch,
        freshness:
          currentRemote.state === "present"
            ? "current-remote-read"
            : currentRemote.state,
        relation: relationForRemote(repository.head, currentRemote),
        head: currentRemote.sha ?? null,
      };
      checks.remote =
        currentRemote.state === "present"
          ? currentRemote.sha === repository.head
            ? check("PASS", "current remote branch matches local HEAD", "synchronized")
            : check("FAIL", "local HEAD differs from current remote branch", "different")
          : currentRemote.state === "missing"
            ? check("FAIL", "remote Issue branch is missing")
            : check("WARN", "remote freshness unknown; no fetch/pull was attempted");

      const localMainHead = await readKnownRemoteRef(run, root, "refs/remotes/origin/main");
      repository.originMain.localHead = localMainHead;
      if (repository.branch === "main") {
        repository.originMain.remoteHead = currentRemote.sha ?? null;
        repository.originMain.freshness = currentRemote.state;
      } else if (mainRemote) {
        repository.originMain.remoteHead = mainRemote.sha ?? null;
        repository.originMain.freshness = mainRemote.state;
      }
      repository.originMain.localRelation =
        repository.originMain.localHead && repository.originMain.remoteHead
          ? repository.originMain.localHead === repository.originMain.remoteHead
            ? "equal"
            : "different"
          : "unknown";

      checks.originMain =
        repository.originMain.freshness === "present" &&
        repository.originMain.localRelation === "equal"
          ? check("PASS", "local origin/main matches current remote main", "current")
          : repository.originMain.freshness === "missing"
            ? check("FAIL", "remote main branch is missing")
            : repository.originMain.freshness === "unknown"
              ? check("WARN", "origin/main freshness unknown; no fetch/pull was attempted")
              : repository.originMain.localRelation === "unknown"
                ? check("WARN", "local origin/main is unavailable; fetch/prune is required")
                : check("FAIL", "local origin/main differs from current remote main");
    } else {
      checks.knownRemote = check("WARN", "remote-tracking branch not checked without an attached branch");
      checks.remote = check("WARN", "remote branch not checked without an attached branch");
      checks.originMain = check("WARN", "origin/main not checked without an attached branch");
    }

    const remote = {
        state:
          repository.remote.relation === "synchronized" ||
          repository.remote.relation === "different"
            ? "present"
            : repository.remote.relation === "missing"
              ? "missing"
              : "unknown",
      relation: repository.remote.relation,
      sha: repository.remote.head,
    };
    const originMain = {
      state:
        checks.originMain.status === "PASS"
          ? "present"
          : checks.originMain.status === "FAIL" && checks.originMain.detail.includes("missing")
            ? "missing"
            : checks.originMain.status === "FAIL"
              ? "present"
              : "unknown",
      localRelation: repository.originMain.localRelation === "different" ? "different" : "same-or-unknown",
    };
    const handoff = handoffReport({
      branch: repository.branch,
      originMatches: checks.origin.status === "PASS",
      clean: checks.workingTree.status === "PASS",
      conflicts: repository.conflicts,
      head: repository.head,
      upstreamMatches,
      remote,
      originMain,
    });
    checks.handoff = check(
      handoff.status,
      handoff.safe ? "eligible for cross-device handoff" : handoff.reasons.join(", "),
      handoff.safe,
    );
    repository.handoff = handoff;
  } else {
    checks.branch = check("FAIL", "repository state unavailable");
    checks.head = check("FAIL", "repository state unavailable");
    checks.workingTree = check("FAIL", "repository state unavailable");
    checks.conflicts = check("FAIL", "repository state unavailable");
    checks.origin = check("FAIL", "repository state unavailable");
    checks.upstream = check("FAIL", "repository state unavailable");
    checks.knownRemote = check("WARN", "repository state unavailable");
    checks.remote = check("WARN", "remote state unavailable");
    checks.originMain = check("WARN", "origin/main state unavailable");
    checks.handoff = check("FAIL", "repository state unavailable", false);
    repository.handoff = {
      status: "FAIL",
      safe: false,
      reasons: ["repository-state-unavailable"],
    };
  }

  const statuses = Object.values(checks).map((entry) => entry.status);
  const overall = statuses.includes("FAIL")
    ? "FAIL"
    : statuses.includes("WARN")
      ? "WARN"
      : "PASS";

  return {
    schemaVersion: 1,
    result: overall,
    handoffSafe: repository.handoff.safe,
    checks,
    repository,
  };
}

function displayCheck(name, value) {
  const suffix = value.value !== undefined ? ` ${value.value}` : "";
  const detail = value.detail ? ` — ${value.detail}` : "";
  return `${name}: ${value.status}${suffix}${detail}`;
}

export function renderHuman(report) {
  const lines = [
    `WORKSTATION_DOCTOR result=${report.result} handoff-safe=${report.handoffSafe}`,
  ];
  for (const name of [
    "os",
    "node",
    "pnpm",
    "git",
    "gh",
    "codex",
    "docker",
    "supabase",
    "repository",
    "branch",
    "workingTree",
    "head",
    "origin",
    "upstream",
    "knownRemote",
    "remote",
    "originMain",
    "handoff",
  ]) {
    if (report.checks[name]) lines.push(displayCheck(name, report.checks[name]));
  }
  return `${lines.join("\n")}\n`;
}

export function renderJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export async function main(argv = process.argv.slice(2), options = {}) {
  if (argv.includes("--help")) {
    process.stdout.write(
      "Read-only workstation readiness check. Use --json for deterministic machine-readable output.\n",
    );
    return { result: "PASS" };
  }

  const report = await collectDoctor(options);
  process.stdout.write(argv.includes("--json") ? renderJson(report) : renderHuman(report));
  if (report.result === "FAIL") process.exitCode = 1;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
