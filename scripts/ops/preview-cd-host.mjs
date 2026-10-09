import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { createHash, randomUUID } from "node:crypto";
import {
  lstatSync,
  realpathSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  renameSync,
  openSync,
  closeSync,
  appendFileSync,
} from "node:fs";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NODE,
  PNPM,
  REPOSITORY,
  deny,
  isSha,
  qualityRun,
  qualityJob,
  protectedMain,
} from "./preview-cd-core.mjs";

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const runningCommands = new Set();
export function cancelCommands() {
  for (const child of runningCommands) child.kill("SIGTERM");
}
export function boundary(path, { directory = false, privateMode = true } = {}) {
  if (!isAbsolute(path) || resolve(path) !== path)
    deny("PATH_BOUNDARY_INVALID");
  const s = lstatSync(path);
  if (
    s.isSymbolicLink() ||
    realpathSync(path) !== path ||
    (directory ? !s.isDirectory() : !s.isFile() || s.nlink !== 1) ||
    s.uid !== process.getuid() ||
    (privateMode && s.mode & 0o077)
  )
    deny("PATH_BOUNDARY_INVALID");
  return s;
}
export function readJson(path) {
  boundary(path);
  return JSON.parse(readFileSync(path, "utf8"));
}
export function atomicJson(path, data) {
  boundary(dirname(path), { directory: true });
  if (existsSync(path)) boundary(path);
  const temp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temp, `${JSON.stringify(data)}\n`, { mode: 0o600, flag: "wx" });
  renameSync(temp, path);
}
export function newDirectory(path) {
  mkdirSync(path, { mode: 0o700 });
  boundary(path, { directory: true });
}

// No shell, inherited GitHub credentials, app secrets or arbitrary command strings.
export function cleanEnvironment(node) {
  return {
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    LANG: "en_US.UTF-8",
    PATH: `${dirname(node)}:/usr/bin:/bin:/usr/sbin:/sbin`,
    NEXT_TELEMETRY_DISABLED: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
  };
}
export async function command(
  file,
  args,
  { cwd, env, timeout = 60_000, input, detached = false } = {},
) {
  return await new Promise((resolveResult, reject) => {
    const child = spawn(file, args, {
      cwd,
      env,
      detached,
      stdio: ["pipe", "pipe", "ignore"],
    });
    runningCommands.add(child);
    let output = "",
      expired = false;
    const timer = setTimeout(() => {
      expired = true;
      child.kill("SIGTERM");
    }, timeout);
    child.stdout.on("data", (d) => {
      if (output.length < 4_000_000) output += d.toString();
    });
    child.once("error", () => {
      runningCommands.delete(child);
      clearTimeout(timer);
      reject(new Error("COMMAND_UNAVAILABLE"));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      runningCommands.delete(child);
      if (code !== 0 || expired)
        reject(new Error(expired ? "COMMAND_TIMEOUT" : "COMMAND_FAILED"));
      else resolveResult(output.trim());
    });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

export class GitHubGate {
  constructor(fetcher = fetch) {
    this.fetcher = fetcher;
  }
  async api(path) {
    let response;
    try {
      response = await this.fetcher(
        `https://api.github.com/repos/${REPOSITORY}/${path}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
        },
      );
    } catch {
      deny("GITHUB_OFFLINE");
    }
    if (!response.ok)
      deny(
        response.status === 403 || response.status === 429
          ? "GITHUB_RATE_LIMIT"
          : "GITHUB_UNAVAILABLE",
      );
    return response.json();
  }
  async latest() {
    const data = await this.api("git/ref/heads/main");
    if (
      data.ref !== "refs/heads/main" ||
      data.object.type !== "commit" ||
      !isSha(data.object.sha)
    )
      deny("INVALID_MAIN_SHA");
    return data.object.sha;
  }
  async gate(sha) {
    const list = await this.api(
      `actions/workflows/pr-quality.yml/runs?branch=main&event=push&head_sha=${sha}&per_page=100`,
    );
    const run = qualityRun(sha, list.workflow_runs ?? []);
    if (!Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt))
      deny("QUALITY_NOT_SUCCESSFUL");
    const jobs = await this.api(
      `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
    );
    qualityJob(sha, jobs.jobs ?? []);
    const rules = await this.api("rulesets");
    const detailed = [];
    for (const r of rules)
      if (r.enforcement === "active" && r.target === "branch")
        detailed.push(await this.api(`rulesets/${r.id}`));
    protectedMain(detailed);
    if ((await this.latest()) !== sha) deny("MAIN_SUPERSEDED");
    return { runId: run.id, attempt: run.run_attempt };
  }
}

export function compatibilityFingerprint(release) {
  const pkg = JSON.parse(readFileSync(join(release, "package.json"), "utf8"));
  if (pkg.engines.node !== NODE || pkg.packageManager !== `pnpm@${PNPM}`)
    deny("TOOLCHAIN_CHANGED");
  const paths = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isSymbolicLink()) deny("SOURCE_BOUNDARY_INVALID");
      if (entry.isDirectory()) walk(file);
      else if (
        !entry.name.endsWith(".test.ts") &&
        /schema|catalog|runtime\.ts$|bootstrap|writer-lease|file-boundary|codecs|request-boundary|gateway|hosted/.test(
          entry.name,
        )
      )
        paths.push(file);
    }
  }
  walk(join(release, "src/features/real-data/sqlite"));
  paths.push(
    join(release, "src/instrumentation.ts"),
    join(release, "src/features/real-data/runtime/application-context.ts"),
    join(release, "src/features/real-data/runtime/configuration.ts"),
    join(release, "scripts/ops/run-production.mjs"),
  );
  const hash = createHash("sha256").update(
    JSON.stringify({
      node: pkg.engines.node,
      pnpm: pkg.packageManager,
      driver: pkg.dependencies["better-sqlite3"],
      next: pkg.dependencies.next,
    }),
  );
  for (const name of ["next.config.ts", ".npmrc", "pnpm-workspace.yaml"]) {
    const file = join(release, name);
    hash.update(name).update(existsSync(file) ? readFileSync(file) : "ABSENT");
  }
  for (const path of paths.sort())
    hash.update(path.slice(release.length)).update(readFileSync(path));
  return hash.digest("hex");
}

export function validateRelease(release) {
  boundary(release.path, { directory: true });
  if (!isSha(release.sha) || !/^[A-Za-z0-9_-]{1,100}$/.test(release.buildId))
    deny("RELEASE_IDENTITY_INVALID");
  if (
    readFileSync(join(release.path, ".next/BUILD_ID"), "utf8").trim() !==
      release.buildId ||
    compatibilityFingerprint(release.path) !== release.compatibility
  )
    deny("RELEASE_IDENTITY_CHANGED");
  if (!release.legacy) {
    const manifest = readJson(join(release.path, "preview-release.json"));
    if (
      manifest.sha !== release.sha ||
      manifest.buildId !== release.buildId ||
      manifest.compatibility !== release.compatibility
    )
      deny("RELEASE_IDENTITY_CHANGED");
  }
}

export async function buildRelease(root, config, sha, baseline) {
  if (!isSha(sha)) deny("INVALID_MAIN_SHA");
  const env = cleanEnvironment(config.node),
    mirror = join(root, "source.git");
  const git = (...args) =>
    command("/usr/bin/git", args, { cwd: root, env, timeout: 120_000 });
  if (!existsSync(mirror)) {
    await git("init", "--bare", mirror);
    await git(
      "--git-dir",
      mirror,
      "remote",
      "add",
      "origin",
      `https://github.com/${REPOSITORY}.git`,
    );
  }
  if (
    (await git("--git-dir", mirror, "remote", "get-url", "origin")) !==
    `https://github.com/${REPOSITORY}.git`
  )
    deny("SOURCE_BOUNDARY_INVALID");
  await git(
    "--git-dir",
    mirror,
    "fetch",
    "--no-tags",
    "origin",
    "refs/heads/main",
  );
  if ((await git("--git-dir", mirror, "rev-parse", "FETCH_HEAD")) !== sha)
    deny("MAIN_SUPERSEDED");
  const folder = join(root, "releases", `${sha}-${randomUUID()}`);
  newDirectory(folder);
  // Archive only runtime/build inputs; exclude private and historical documents.
  const archive = join(root, `${randomUUID()}.tar`);
  await git(
    "--git-dir",
    mirror,
    "archive",
    "--format=tar",
    `--output=${archive}`,
    sha,
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
  );
  await command("/usr/bin/tar", ["-xf", archive, "-C", folder], { env });
  // No cleanup: failed builds, source archives and previous releases are retained.
  if (
    existsSync(join(folder, ".next")) ||
    existsSync(join(folder, "node_modules"))
  )
    deny("SOURCE_BOUNDARY_INVALID");
  const compatibility = compatibilityFingerprint(folder);
  if (compatibility !== baseline.compatibility)
    deny("SCHEMA_RUNTIME_COMPATIBILITY_CHANGED");
  if (
    (await command(config.node, ["--version"], { env })) !== `v${NODE}` ||
    (await command(config.pnpm, ["--version"], { env })) !== PNPM
  )
    deny("TOOLCHAIN_CHANGED");
  const runner = fileURLToPath(
    new URL("./preview-cd-build-command.mjs", import.meta.url),
  );
  for (const operation of ["install", "build"]) {
    await command(
      config.node,
      [
        runner,
        config.pnpm,
        operation,
        root,
        config.workerSource ?? baseline.path,
      ],
      {
        cwd: folder,
        env,
        timeout: 15 * 60_000,
        detached: true,
      },
    );
  }
  const release = {
    path: folder,
    sha,
    compatibility,
    buildId: readFileSync(join(folder, ".next/BUILD_ID"), "utf8").trim(),
  };
  atomicJson(join(folder, "preview-release.json"), release);
  validateRelease(release);
  return release;
}

export function operationalLock(path, source) {
  boundary(dirname(path), { directory: true });
  try {
    closeSync(openSync(path, "wx", 0o600));
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  boundary(path);
  const Database = createRequire(join(source, "package.json"))(
    "better-sqlite3",
  );
  const db = new Database(path, { fileMustExist: true, timeout: 0 });
  try {
    db.exec("BEGIN EXCLUSIVE");
  } catch {
    db.close();
    deny("UPDATER_ALREADY_RUNNING");
  }
  return () => {
    db.exec("ROLLBACK");
    db.close();
  };
}

export async function portOccupied(port = 3000) {
  return new Promise((r) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    const finish = (value) => {
      socket.destroy();
      r(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(true));
  });
}

export function verifyDatabaseIdentity(config) {
  const s = boundary(config.database);
  boundary(dirname(config.database), { directory: true });
  if (s.dev !== config.databaseDevice || s.ino !== config.databaseInode)
    deny("DATABASE_IDENTITY_CHANGED");
}
export function leaseFree(config, source) {
  const lease = `${config.database}.writer-lease.db`;
  boundary(lease);
  const Database = createRequire(join(source, "package.json"))(
    "better-sqlite3",
  );
  const db = new Database(lease, { fileMustExist: true, timeout: 0 });
  try {
    db.exec("BEGIN EXCLUSIVE");
    db.exec("ROLLBACK");
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

export async function databasePreflight(config, release) {
  validateRelease(release);
  verifyDatabaseIdentity(config);
  const env = {
    ...cleanEnvironment(config.node),
    LIFE_OS_HOSTED_SQLITE_PATH: config.database,
  };
  // Source already audited for compatibility; use its actual read-only startup
  // verifier with real react-server conditions. Never acquire an app writer here.
  const helper = fileURLToPath(
    new URL("./preview-cd-preflight.mjs", import.meta.url),
  );
  const result = await command(
    config.node,
    ["--conditions=react-server", helper, release.path],
    { env, timeout: 60_000 },
  );
  if (result !== "DATABASE_PREFLIGHT_PASS")
    deny("DATABASE_COMPATIBILITY_FAILED");
}

export function appEnvironment(config) {
  return {
    ...cleanEnvironment(config.node),
    NODE_ENV: "production",
    LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
    LIFE_OS_HOSTED_SQLITE_PATH: config.database,
    LIFE_OS_HOSTED_ORIGIN: config.origin,
    LIFE_OS_HOSTED_OWNER_LOGIN: config.ownerLogin,
  };
}

export class AppService {
  constructor(config) {
    this.config = config;
    this.child = null;
  }
  async free() {
    for (let n = 0; n < 60; n++) {
      if (
        !(await portOccupied()) &&
        leaseFree(this.config, this.config.workerSource)
      )
        return;
      await pause(500);
    }
    deny("PORT_OR_WRITER_LEASE_NOT_RELEASED");
  }
  alive() {
    return (
      this.child &&
      this.child.exitCode === null &&
      this.child.signalCode === null
    );
  }
  async stop() {
    if (!this.alive()) {
      this.child = null;
      return;
    }
    const child = this.child;
    const ended = new Promise((r) => child.once("exit", r));
    child.kill("SIGTERM");
    await Promise.race([ended, pause(30_000)]);
    if (this.alive()) deny("GRACEFUL_SHUTDOWN_FAILED");
    this.child = null;
  }
  async start(release) {
    if (this.alive()) deny("SUPERVISION_CONFLICT");
    await databasePreflight(this.config, release);
    await this.free();
    this.child = spawn(this.config.node, ["scripts/ops/run-production.mjs"], {
      cwd: release.path,
      env: appEnvironment(this.config),
      stdio: "ignore",
    });
    this.child.on("error", () => {});
  }
}

export async function serveConfiguration(config) {
  const env = cleanEnvironment(config.node);
  const data = JSON.parse(
    await command(config.tailscale, ["serve", "status", "--json"], { env }),
  );
  const host = new URL(config.origin).host;
  const proxy = data.Web?.[`${host}:443`]?.Handlers?.["/"]?.Proxy;
  if (
    !data.TCP?.["443"]?.HTTPS ||
    proxy !== "http://127.0.0.1:3000" ||
    Object.keys(data.TCP).length !== 1 ||
    Object.keys(data.Web ?? {}).length !== 1 ||
    Object.values(data.AllowFunnel ?? {}).some(Boolean)
  )
    deny("GATEWAY_CONFIGURATION_CHANGED");
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export async function health(config, release) {
  validateRelease(release);
  verifyDatabaseIdentity(config);
  if ((await serveConfiguration(config)) !== config.gatewayFingerprint)
    deny("GATEWAY_CONFIGURATION_CHANGED");
  for (let n = 0; n < 30; n++) {
    try {
      const get = async (url, manual = false) => {
        const r = await fetch(url, {
          headers: manual ? { Cookie: "life_os_profile=manual" } : {},
          redirect: "error",
          signal: AbortSignal.timeout(5000),
        });
        if (r.status !== 200) deny("HEALTH_HTTP_FAILED");
        return r.text();
      };
      const local = await get("http://127.0.0.1:3000/settings");
      const settings = await get(`${config.origin}/settings`, true);
      const create = await get(`${config.origin}/tasks/new`, true);
      const projects = await get(
        `${config.origin}/portfolio?view=projects`,
        true,
      );
      if (
        ![local, settings, create, projects].every((s) =>
          s.includes(release.buildId),
        ) ||
        !settings.includes("Gateway-Anmeldung aktiv") ||
        !create.includes('data-task-create-variant="B8"') ||
        !["Arbeitsinhalt", "Planung", "Zuordnung"].every((s) =>
          create.includes(s),
        ) ||
        !projects.includes("Portfolio")
      )
        deny("HEALTH_AUTH_BUILD_FAILED");
      return;
    } catch {
      if (n === 29) deny("HEALTH_AUTH_BUILD_FAILED");
      await pause(1000);
    }
  }
}

export function appendEvent(root, state) {
  const path = join(root, "events.jsonl");
  if (existsSync(path)) {
    const s = boundary(path);
    if (s.size > 1_000_000)
      renameSync(path, join(root, `events-${randomUUID()}.jsonl`));
  }
  appendFileSync(
    path,
    JSON.stringify({
      at: new Date().toISOString(),
      status: state.status,
      targetSha: state.targetSha,
      deployedSha: state.lastGood.sha,
      buildId: state.lastGood.buildId,
      error: state.error,
    }) + "\n",
    { mode: 0o600 },
  );
}
