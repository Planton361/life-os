import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync, writeFileSync, lstatSync } from "node:fs";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { NODE, LABEL, deny, launchAgent, isSha } from "./preview-cd-core.mjs";
import {
  boundary,
  readJson,
  atomicJson,
  cleanEnvironment,
  command,
  GitHubGate,
  compatibilityFingerprint,
  buildRelease,
  validateRelease,
  databasePreflight,
  verifyDatabaseIdentity,
  serveConfiguration,
  AppService,
  health,
  operationalLock,
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

import {
  validateV9Release,
  validateV9WorkerSource,
} from "./preview-v9-contract.mjs";
import { SupervisorHandoff } from "./preview-upgrade-stop.mjs";
import { v9DatabasePreflight, restoreV9Worker } from "./preview-upgrade-v9.mjs";
import {
  acknowledgeAbortedV9,
  verifyAbortedV9,
  verifyRunningV9,
  durableUpgradeJournal,
  assertUpgradeJournalAdmission,
  assertFreshReattemptPair,
  abortedV9Evidence,
} from "./preview-upgrade-reattempt.mjs";

// No CI/ruleset cache: full fresh proofs at each mutation boundary. The final
// main read inside gate() already binds those proofs to the requested SHA.
// Read-only checks between boundaries still reread main and all local gates.
export async function authorizeOperatorGitHub(
  github,
  sha,
  stage = "entry",
  reattempt = false,
) {
  if (
    ![
      "entry",
      "verify-start",
      "verify-complete",
      "before-build",
      "after-build",
      "before-commit",
    ].includes(stage)
  )
    deny("OPERATOR_GATE_STAGE_INVALID");
  const readOnly =
    stage === "verify-start" ||
    stage === "before-build" ||
    (stage === "after-build" && reattempt);
  if (readOnly) {
    if ((await github.latest()) !== sha) deny("MAIN_SUPERSEDED");
  } else await github.gate(sha);
}

export async function upgradeExisting({
  root,
  source,
  controlSha,
  recover = false,
  abortedDigest,
}) {
  if (
    process.platform !== "darwin" ||
    process.versions.node !== NODE ||
    !isSha(controlSha)
  )
    deny("OPERATOR_GATE_REQUIRED");
  root = resolve(root);
  source = resolve(source);
  if (dirname(root) !== join(process.env.HOME, "Library/Application Support"))
    deny("UPGRADE_ROOT_BOUNDARY_INVALID");
  boundary(root, { directory: true });
  boundary(source, { directory: true, privateMode: false });
  const config = readJson(join(root, "config.json")),
    state = readJson(join(root, "state.json"));
  assertUpgradeJournalAdmission(root, { recover, abortedDigest });
  if (!recover && config.preview)
    deny("UPGRADE_ALREADY_PROVISIONED_OR_RECOVERY_REQUIRED");
  const env = cleanEnvironment(config.node),
    github = new GitHubGate();
  const plist = join(
    process.env.HOME,
    "Library/LaunchAgents",
    `${LABEL}.plist`,
  );
  boundary(plist);
  const oldPlist = readFileSync(plist, "utf8"),
    oldService = new AppService(config);
  const helper = join(source, "scripts/ops/preview-upgrade-database.mjs");
  const journalPath = join(root, "upgrade-v2.json");
  const existing = recover ? readJson(journalPath) : null;
  let newConfig,
    newService,
    workerUnlock,
    helperRelease,
    operatorUnlock,
    abortedEvidence;
  const handoff = new SupervisorHandoff({
    root,
    config,
    source: () => helperRelease.path,
  });
  const databaseCommand = async (op, path, destination) =>
    command(
      config.node,
      [
        "--conditions=react-server",
        helper,
        helperRelease.path,
        op,
        ...(path ? [path] : []),
        ...(destination ? [destination] : []),
      ],
      { env, timeout: 60_000 },
    );
  async function authorize(stage = "entry") {
    await authorizeOperatorGitHub(github, controlSha, stage, !!abortedDigest);
    if (
      (await command("/usr/bin/git", ["-C", source, "rev-parse", "HEAD"], {
        env,
      })) !== controlSha ||
      (await command(
        "/usr/bin/git",
        ["-C", source, "status", "--porcelain", "--untracked-files=no"],
        { env },
      ))
    )
      deny("UPGRADE_REQUIRES_MERGED_MAIN");
    for (const name of [
      "preview-cd.mjs",
      "preview-cd-host.mjs",
      "preview-cd-core.mjs",
      "preview-cd-build-command.mjs",
      "preview-cd-preflight.mjs",
      "managed-process.mjs",
      "preview-upgrade-host.mjs",
      "preview-upgrade-core.mjs",
      "preview-upgrade-database.mjs",
      "preview-upgrade-owner.mjs",
      "preview-upgrade-native-loader.mjs",
      "preview-upgrade-state.mjs",
      "preview-upgrade-stop.mjs",
      "preview-v9-contract.mjs",
      "preview-upgrade-v9.mjs",
      "preview-upgrade-v9-preflight.mjs",
      "preview-upgrade-reattempt.mjs",
      "run-preview-production.mjs",
      "run-production.mjs",
    ]) {
      const file = `scripts/ops/${name}`,
        local = fileURLToPath(new URL(`./${name}`, import.meta.url));
      if (
        local !== join(source, file) ||
        (await command(
          "/usr/bin/git",
          ["-C", source, "show", `${controlSha}:${file}`],
          { env },
        )) !== readFileSync(local, "utf8").trim()
      )
        deny("UPGRADE_REQUIRES_MERGED_MAIN");
    }
    verifyDatabaseIdentity(config);
    if ((await serveConfiguration(config)) !== config.gatewayFingerprint)
      deny("GATEWAY_CONFIGURATION_CHANGED");
  }
  const retryOptions = {
    root,
    digest: abortedDigest,
    plist,
    authorize,
    provenance: async (sha) => {
      await command(
        "/usr/bin/git",
        ["-C", source, "merge-base", "--is-ancestor", sha, controlSha],
        { env },
      );
    },
    serving: verifyRunningV9,
  };
  async function arm(pair) {
    validateRelease(pair.candidate);
    validateRelease(pair.fallback);
    writeFileSync(
      plist,
      launchAgent(
        config.node,
        join(pair.candidate.path, "scripts/ops/preview-cd.mjs"),
        root,
      ),
      { mode: 0o600 },
    );
    await command("/usr/bin/plutil", ["-lint", plist], { env });
  }
  async function publish(pair, checkpoint) {
    const ready = upgradedOperatorState(root, pair, checkpoint);
    const grantPath = join(root, "preview-grant-v2.json");
    const identity = lstatSync(config.database);
    // Owner is read only from canonical metadata, never CLI/body/request input.
    const grant = {
      version: 2,
      schema: 10,
      instance: readJson(journalPath).checkpoint.instance,
      host: hostname(),
      uid: process.getuid(),
      device: identity.dev,
      inode: identity.ino,
      owner: pair.owner,
      origin: config.origin,
      login: config.ownerLogin,
    };
    atomicJson(grantPath, grant);
    newConfig = {
      ...config,
      workerSource: pair.candidate.path,
      bootstrapRelease: undefined,
      legacyProcess: undefined,
      preview: { version: 2, grantPath },
    };
    atomicJson(join(root, "config.json"), newConfig);
    atomicJson(join(root, "state.json"), ready);
    newService = new AppService(newConfig);
  }
  const io = {
    authorize,
    originalCheckpoint: async () => {
      if (abortedDigest) await verifyAbortedV9(retryOptions);
      return {
        originalConfig: config,
        originalState: state,
        originalPlist: oldPlist,
        instance: randomUUID(),
      };
    },
    stoppedCheckpoint: async (previous) =>
      stoppedOperatorCheckpoint(root, previous),
    assertOperatorHandoff: async (checkpoint) =>
      assertOperatorHandoff(root, checkpoint),
    async prepareHelpers(pair) {
      helperRelease = { path: config.workerSource ?? state.lastGood.path };
      await databaseCommand("legacy-dependencies");
      for (const release of [pair.candidate, pair.fallback]) {
        validateRelease(release);
        helperRelease = release;
        if (
          (await databaseCommand("dependencies")) !==
          "UPGRADE_DEPENDENCIES_PASS"
        )
          deny("UPGRADE_DEPENDENCIES_INVALID");
      }
      helperRelease = pair.candidate;
    },
    async prepareCompatiblePair() {
      validateV9WorkerSource(config.workerSource);
      await v9DatabasePreflight(
        config,
        readJson(join(root, "state.json")).lastGood,
      );
      helperRelease = { path: config.workerSource ?? state.lastGood.path };
      await databaseCommand("legacy-dependencies");
      const buildConfig = {
        ...config,
        // Build lease dependencies come from the installed worker, not a clean
        // source checkout. Later helper/worker leases use the verified v2 release.
        workerSource: config.workerSource ?? state.lastGood.path,
        preview: { version: 2 },
      };
      const newBaseline = {
        ...state.lastGood,
        compatibility: compatibilityFingerprint(source),
      };
      const candidate = await buildRelease(
        root,
        buildConfig,
        controlSha,
        newBaseline,
      );
      const fallback = await buildRelease(
        root,
        buildConfig,
        controlSha,
        newBaseline,
      );
      if (
        candidate.path === fallback.path ||
        candidate.compatibility !== fallback.compatibility
      )
        deny("COMPATIBLE_FALLBACK_REQUIRED");
      if (abortedDigest)
        assertFreshReattemptPair(
          { candidate, fallback },
          abortedV9Evidence(root, abortedDigest).original.prepared,
          controlSha,
        );
      return { candidate, fallback };
    },
    async stopFrozenWorker() {
      if (!recover) {
        // Recheck after the two builds while the old service is still available.
        validateV9Release(readJson(join(root, "state.json")).lastGood);
        validateV9WorkerSource(config.workerSource);
      }
      workerUnlock = await handoff.stop({ allowUnregistered: recover });
    },
    freeSingleWriter: async () => {
      if (newService) await newService.stop();
      await oldService.free();
    },
    async backupAndProveRecovery(pair, checkpoint) {
      const backup = join(root, `pre-upgrade-v9-${randomUUID()}.db`),
        clone = join(root, `recovery-proof-${randomUUID()}.db`);
      await databaseCommand("backup", config.database, backup);
      const identity = lstatSync(backup);
      await v9DatabasePreflight(
        {
          ...config,
          database: backup,
          databaseDevice: identity.dev,
          databaseInode: identity.ino,
        },
        checkpoint.originalState.lastGood,
      );
      await databaseCommand("backup", backup, clone);
      await databaseCommand("migrate", clone);
      const cloneIdentity = lstatSync(clone),
        copyConfig = {
          ...config,
          database: clone,
          databaseDevice: cloneIdentity.dev,
          databaseInode: cloneIdentity.ino,
        };
      await databasePreflight(copyConfig, pair.candidate);
      await databasePreflight(copyConfig, pair.fallback);
      const owner = await command(
        config.node,
        [
          "--conditions=react-server",
          join(source, "scripts/ops/preview-upgrade-owner.mjs"),
          helperRelease.path,
          clone,
        ],
        { env },
      );
      if (!/^[a-f0-9-]{36}$/.test(owner)) deny("UPGRADE_OWNER_INVALID");
      pair.owner = owner;
      return {
        backup,
        clone,
      };
    },
    save: (journal) =>
      durableUpgradeJournal(journalPath, {
        version: 2,
        sha: controlSha,
        ...(abortedEvidence ? { abortedEvidence } : {}),
        ...journal,
      }),
    armNewWorker: arm,
    migrateSameFile: () => databaseCommand("migrate", config.database),
    schemaVersion: async () =>
      Number(await databaseCommand("version", config.database)),
    async prepareV9Recovery(checkpoint) {
      const latest = readJson(join(root, "state.json"));
      // A failed bootout can leave the original service healthy. Preserve it;
      // never rewrite its live state or bootstrap a second supervisor.
      if (handoff.registered()) {
        await v9DatabasePreflight(checkpoint.originalConfig, latest.lastGood);
        await verifyRunningV9(root, checkpoint.originalConfig, latest.lastGood);
        return false;
      }
      workerUnlock ??= await handoff.acquireReleased({ wait: false });
      await handoff.assertReleased();
      validateV9WorkerSource(checkpoint.originalConfig.workerSource);
      await v9DatabasePreflight(checkpoint.originalConfig, latest.lastGood);
      return true;
    },
    async restoreOldWorker(checkpoint) {
      await restoreV9Worker({
        root,
        checkpoint,
        plist,
        env,
        releaseWorkerLease: async () => {
          workerUnlock?.();
          workerUnlock = null;
        },
        bootstrap: (path, childEnv) =>
          command(
            "/bin/launchctl",
            ["bootstrap", `gui/${process.getuid()}`, path],
            { env: childEnv },
          ),
      });
    },
    publishCompatiblePair: publish,
    async startAndProve(release) {
      await newService.start(release);
      await health(newConfig, release);
    },
    async selectFallback(release) {
      const ready = readJson(join(root, "state.json"));
      ready.previousGood = ready.lastGood;
      ready.lastGood = release;
      atomicJson(join(root, "state.json"), ready);
    },
  };
  try {
    await authorize();
    if (abortedDigest) {
      validateV9WorkerSource(config.workerSource);
      validateV9Release(state.lastGood);
    }
    // Independent operator lease serializes upgrade/recovery/re-attempt without
    // interfering with the still-running original worker or SQLite writer.
    operatorUnlock = operationalLock(
      join(root, "operator-upgrade-lease.db"),
      config.workerSource,
    );
    if (abortedDigest)
      abortedEvidence = await acknowledgeAbortedV9(retryOptions, controlSha);
    const result = recover
      ? await recoverExistingProtocol(io, existing)
      : await upgradeExistingProtocol(io);
    if (newService) {
      await newService.stop();
      await newService.free();
      workerUnlock?.();
      workerUnlock = null;
      await command(
        "/bin/launchctl",
        ["bootstrap", `gui/${process.getuid()}`, plist],
        { env },
      );
    }
    return result;
  } finally {
    try {
      if (newService) await newService.stop();
    } finally {
      workerUnlock?.();
      operatorUnlock?.();
    }
  }
}
