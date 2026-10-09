import { fileURLToPath } from "node:url";
import { join, resolve, dirname } from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import {
  NODE,
  PNPM,
  LABEL,
  deny,
  initialState,
  deploy,
  publicStatus,
  errorCode,
  launchAgent,
} from "./preview-cd-core.mjs";
import {
  boundary,
  readJson,
  atomicJson,
  newDirectory,
  cleanEnvironment,
  command,
  GitHubGate,
  compatibilityFingerprint,
  validateRelease,
  buildRelease,
  operationalLock,
  portOccupied,
  verifyDatabaseIdentity,
  databasePreflight,
  AppService,
  serveConfiguration,
  health,
  appendEvent,
  pause,
  cancelCommands,
} from "./preview-cd-host.mjs";

export async function processIdentity(pid, node) {
  if (!Number.isSafeInteger(pid) || pid <= 1)
    deny("SUPERVISION_IDENTITY_INVALID");
  const env = cleanEnvironment(node);
  const info = await command(
    "/bin/ps",
    ["-p", String(pid), "-o", "lstart=", "-o", "ppid=", "-o", "command="],
    { env },
  );
  const cwd = await command(
    "/usr/sbin/lsof",
    ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
    { env },
  );
  return createHash("sha256").update(info).update(cwd).digest("hex");
}

async function adoptLegacy(config, service) {
  const legacy = config.legacyProcess;
  if (!legacy || !(await portOccupied())) return;
  if (
    (await processIdentity(legacy.launcherPid, config.node)) !==
      legacy.launcherIdentity ||
    (await processIdentity(legacy.serverPid, config.node)) !==
      legacy.serverIdentity
  )
    deny("SUPERVISION_IDENTITY_CHANGED");
  // This is the audited, one-time takeover after USER merge/CI, not a broad kill.
  process.kill(legacy.launcherPid, "SIGTERM");
  for (let n = 0; n < 60; n++) {
    try {
      process.kill(legacy.launcherPid, 0);
    } catch {
      await service.free();
      return;
    }
    await pause(500);
  }
  deny("GRACEFUL_SHUTDOWN_FAILED");
}

function commands(root, state) {
  const file = join(root, "commands.jsonl");
  if (!existsSync(file)) return;
  boundary(file);
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  for (const line of lines.slice(state.commandOffset)) {
    const { command: op } = JSON.parse(line);
    if (op === "disable") state.autoEnabled = false;
    if (op === "enable") state.autoEnabled = true;
    if (op === "retry") {
      state.failures = 0;
      state.retryAfter = 0;
      state.error = null;
    }
    if (op === "rollback") {
      state.rollbackRequested = true;
      state.autoEnabled = false;
    }
    state.commandOffset += 1;
  }
}

export async function supervise(root) {
  if (process.platform !== "darwin" || process.versions.node !== NODE)
    deny("TOOLCHAIN_PLATFORM_INVALID");
  boundary(root, { directory: true });
  const config = readJson(join(root, "config.json"));
  const unlock = operationalLock(
    join(root, "worker-lease.db"),
    config.workerSource,
  );
  const state = readJson(join(root, "state.json")),
    service = new AppService(config),
    github = new GitHubGate();
  let stopping = false;
  const onStop = () => {
    stopping = true;
    cancelCommands();
    void service.stop().catch(() => {});
  };
  process.once("SIGTERM", onStop);
  process.once("SIGINT", onStop);
  const save = async () => {
    atomicJson(join(root, "state.json"), state);
    appendEvent(root, state);
    atomicJson(join(root, "worker.json"), {
      pid: process.pid,
      serverPid: service.alive() ? service.child.pid : null,
      identity: await processIdentity(process.pid, config.node),
      checkedAt: Date.now(),
    });
  };
  const io = {
    latest: () => github.latest(),
    gate: (sha) => github.gate(sha),
    save,
    prepare: (sha, base) => {
      if (config.bootstrapRelease?.sha === sha) {
        validateRelease(config.bootstrapRelease);
        return config.bootstrapRelease;
      }
      return buildRelease(root, config, sha, base);
    },
    preflight: async (r) => {
      if (stopping) deny("SUPERVISOR_STOPPING");
      await databasePreflight(config, r);
      if ((await serveConfiguration(config)) !== config.gatewayFingerprint)
        deny("GATEWAY_CONFIGURATION_CHANGED");
    },
    stop: () => service.stop(),
    free: () => service.free(),
    start: (r) => {
      if (stopping) deny("SUPERVISOR_STOPPING");
      return service.start(r);
    },
    health: (r) => health(config, r),
    commands: async () => commands(root, state),
  };
  try {
    await adoptLegacy(config, service);
    // launchd removes the old job's entire process group on crash. If something
    // still holds port/lease, free() blocks rather than guessing at a PID.
    await service.free();
    await service.start(state.lastGood);
    await health(config, state.lastGood);
    state.transition = null;
    await save();
    while (!stopping) {
      try {
        commands(root, state);
        if (!service.alive()) {
          await service.free();
          await service.start(state.lastGood);
          await health(config, state.lastGood);
        }
        if (state.transition) {
          await service.stop();
          await service.free();
          await service.start(state.lastGood);
          await health(config, state.lastGood);
          state.transition = null;
        }
        if (state.rollbackRequested) {
          if (!state.previousGood) deny("ROLLBACK_RELEASE_UNAVAILABLE");
          const target = state.previousGood;
          await databasePreflight(config, target);
          state.transition = { phase: "manual-rollback", candidate: target };
          await save();
          await service.stop();
          await service.free();
          await service.start(target);
          await health(config, target);
          state.previousGood = state.lastGood;
          state.lastGood = target;
          state.transition = null;
          state.rollbackRequested = false;
          state.status = "succeeded";
          state.error = null;
          state.failures = 0;
          state.retryAfter = 0;
          await save();
        }
        await deploy(state, io);
      } catch (e) {
        if (state.transition && !stopping) {
          try {
            await service.stop();
            await service.free();
            await service.start(state.lastGood);
            await health(config, state.lastGood);
            state.transition = null;
          } catch {
            state.error = "ROLLBACK_NOT_SAFE";
          }
        }
        state.status = "blocked";
        state.error ??= errorCode(e);
        state.failures = 3;
        await save();
      }
      // Five-minute polling catches up after login/wake. Check operator commands
      // each second, without querying GitHub or restarting the app on disable.
      for (let seconds = 0; seconds < 300 && !stopping; seconds++) {
        const offset = state.commandOffset;
        commands(root, state);
        if (state.commandOffset !== offset) {
          await save();
          break;
        }
        await pause(1000);
      }
    }
  } catch (e) {
    state.status = "blocked";
    state.error = errorCode(e);
    await save();
  } finally {
    try {
      await service.stop();
      await service.free();
    } finally {
      unlock();
    }
  }
}

export async function install({ source, root, baselinePath, pnpm, tailscale }) {
  if (process.platform !== "darwin" || process.versions.node !== NODE)
    deny("TOOLCHAIN_PLATFORM_INVALID");
  source = resolve(source);
  root = resolve(root);
  baselinePath = resolve(baselinePath);
  const support = join(process.env.HOME, "Library/Application Support");
  if (dirname(root) !== support || existsSync(root))
    deny("INSTALL_ROOT_BOUNDARY_INVALID");
  boundary(source, { directory: true, privateMode: false });
  boundary(baselinePath, { directory: true });
  const baseConfig = readJson(join(baselinePath, "local-instance-config.json"));
  const running = readJson(join(baselinePath, "running-instance.json"));
  const env = cleanEnvironment(baseConfig.node),
    github = new GitHubGate(),
    sha = await github.latest();
  if (
    (await command("/usr/bin/git", ["-C", source, "rev-parse", "HEAD"], {
      env,
    })) !== sha ||
    (await command(
      "/usr/bin/git",
      ["-C", source, "status", "--porcelain", "--untracked-files=no"],
      { env },
    ))
  )
    deny("INSTALL_REQUIRES_MERGED_MAIN");
  // Checking HEAD alone would admit untracked pre-merge installer code on top
  // of old main. Every executing worker module must exist in the merged tree.
  for (const name of [
    "preview-cd.mjs",
    "preview-cd-host.mjs",
    "preview-cd-core.mjs",
    "preview-cd-preflight.mjs",
    "preview-cd-build-command.mjs",
    "managed-process.mjs",
  ]) {
    const file = `scripts/ops/${name}`,
      local = fileURLToPath(new URL(`./${name}`, import.meta.url));
    if (
      local !== join(source, file) ||
      (await command("/usr/bin/git", ["-C", source, "show", `${sha}:${file}`], {
        env,
      })) !== readFileSync(local, "utf8").trim()
    )
      deny("INSTALL_REQUIRES_MERGED_MAIN");
  }
  await github.gate(sha);
  if (
    (await command(baseConfig.node, ["--version"], { env })) !== `v${NODE}` ||
    (await command(pnpm, ["--version"], { env })) !== PNPM
  )
    deny("TOOLCHAIN_CHANGED");
  boundary(pnpm, { privateMode: false });
  boundary(baseConfig.node, { privateMode: false });
  const origin = new URL(baseConfig.origin);
  if (
    origin.protocol !== "https:" ||
    !origin.hostname.endsWith(".ts.net") ||
    origin.pathname !== "/" ||
    origin.port ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  )
    deny("GATEWAY_CONFIGURATION_CHANGED");
  const config = { ...baseConfig, pnpm, tailscale, workerSource: baselinePath };
  verifyDatabaseIdentity(config);
  config.gatewayFingerprint = await serveConfiguration(config);
  const baseline = {
    path: baselinePath,
    sha: running.revision,
    buildId: running.buildId,
    compatibility: compatibilityFingerprint(baselinePath),
    legacy: true,
  };
  await command(
    "/usr/bin/git",
    ["-C", source, "merge-base", "--is-ancestor", baseline.sha, sha],
    { env },
  );
  validateRelease(baseline);
  await databasePreflight(config, baseline);
  await health(config, baseline);
  config.legacyProcess = {
    launcherPid: running.supervisorPid,
    serverPid: running.pid,
    launcherIdentity: await processIdentity(running.supervisorPid, config.node),
    serverIdentity: await processIdentity(running.pid, config.node),
  };
  const plistPath = join(
    process.env.HOME,
    "Library/LaunchAgents",
    `${LABEL}.plist`,
  );
  if (existsSync(plistPath)) deny("EXISTING_SUPERVISION_CONFLICT");
  try {
    await command(
      "/bin/launchctl",
      ["print", `gui/${process.getuid()}/${LABEL}`],
      { env },
    );
    deny("EXISTING_SUPERVISION_CONFLICT");
  } catch (e) {
    if (e.message !== "COMMAND_FAILED") throw e;
  }
  // Still no service interruption: prepare merged release and frozen worker.
  newDirectory(root);
  newDirectory(join(root, "releases"));
  const prepared = initialState(baseline);
  prepared.status = "updating";
  atomicJson(join(root, "config.json"), config);
  atomicJson(join(root, "state.json"), prepared);
  let release;
  try {
    release = await buildRelease(root, config, sha, baseline);
    await databasePreflight(config, release);
    await github.gate(sha);
  } catch (error) {
    prepared.status = "failed";
    prepared.error = errorCode(error);
    atomicJson(join(root, "state.json"), prepared);
    throw error;
  }
  config.workerSource = release.path;
  config.bootstrapRelease = release;
  atomicJson(join(root, "config.json"), config);
  atomicJson(join(root, "state.json"), initialState(baseline));
  writeFileSync(
    plistPath,
    launchAgent(
      config.node,
      join(release.path, "scripts/ops/preview-cd.mjs"),
      root,
    ),
    { mode: 0o600, flag: "wx" },
  );
  await command("/usr/bin/plutil", ["-lint", plistPath], { env });
  // Only this explicit post-merge install command registers the one supervisor.
  await command(
    "/bin/launchctl",
    ["bootstrap", `gui/${process.getuid()}`, plistPath],
    { env },
  );
  return {
    installation: "REGISTERED",
    activation: "await status and health",
    sha,
  };
}

export async function cli(args) {
  const [op, rootArg, ...rest] = args,
    root = rootArg && resolve(rootArg);
  if (op === "install") {
    if (rest.length !== 4)
      deny("USAGE_INSTALL_ROOT_SOURCE_BASELINE_PNPM_TAILSCALE");
    return install({
      root,
      source: rest[0],
      baselinePath: rest[1],
      pnpm: rest[2],
      tailscale: rest[3],
    });
  }
  if (
    !root ||
    !["supervise", "status", "disable", "enable", "retry", "rollback"].includes(
      op,
    )
  )
    deny("USAGE_PREVIEW_CD_COMMAND_ROOT");
  if (op === "status" && !existsSync(root)) return publicStatus(null);
  boundary(root, { directory: true });
  if (op === "supervise") return supervise(root);
  if (op === "status") {
    let alive = false;
    try {
      const worker = readJson(join(root, "worker.json")),
        config = readJson(join(root, "config.json"));
      alive =
        worker.identity === (await processIdentity(worker.pid, config.node));
    } catch {
      /* no live worker */
    }
    const state = readJson(join(root, "state.json")),
      status = publicStatus(state, alive);
    status.serving = null;
    try {
      const r = await fetch("http://127.0.0.1:3000/settings", {
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      });
      const html = await r.text();
      for (const release of [
        state.lastGood,
        state.transition?.candidate,
      ].filter(Boolean))
        if (r.status === 200 && html.includes(release.buildId))
          status.serving = { sha: release.sha, buildId: release.buildId };
    } catch {
      /* offline app, still report durable operator state */
    }
    return status;
  }
  const requests = join(root, "commands.jsonl");
  if (existsSync(requests)) boundary(requests);
  appendFileSync(requests, `${JSON.stringify({ command: op })}\n`, {
    mode: 0o600,
  });
  return { queued: op };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.umask(0o077);
  cli(process.argv.slice(2))
    .then((result) => {
      if (result) console.log(JSON.stringify(result));
    })
    .catch((e) => {
      console.error(errorCode(e));
      process.exitCode = 1;
    });
}
