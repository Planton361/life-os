import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  NODE,
  PNPM,
  REPOSITORY,
  errorCode,
  isSha,
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
  buildRelease,
  validateRelease,
  serveConfiguration,
  operationalLock,
  portOccupied,
  leaseFree,
} from "./preview-cd-host.mjs";
import {
  databaseIdentity,
  digest,
  inspectDatabase,
  backupAndRestore,
  verifyRecovery,
} from "./linux-preview-database.mjs";
import {
  linuxGrant,
  proveRestoredApplication,
  runLinuxApplication,
} from "./linux-preview-application.mjs";
import { linuxPreviewOperation } from "./linux-preview-core.mjs";

const absolute = z.string().refine((p) => resolve(p) === p);
const configuration = z
  .object({
    version: z.literal(1),
    source: absolute,
    node: absolute,
    pnpm: absolute,
    tailscale: absolute,
    database: absolute,
    origin: z.string().url(),
    ownerLogin: z
      .string()
      .min(1)
      .regex(/^[^\s,\x00-\x1f]+$/),
  })
  .strict();
const outside = (root, path) => relative(root, path).split("/")[0] === "..";

// Create this boundary before Next runs, only inside a freshly allocated release.
// Never chmod an existing directory or follow an existing .next symlink.
export function prepareLinuxPreviewNext(release) {
  boundary(release, { directory: true });
  const next = join(release, ".next");
  newDirectory(next);
  if ((lstatSync(next).mode & 0o777) !== 0o700)
    throw new Error("PATH_BOUNDARY_INVALID");
}

export function saveLinuxBuild(root, config, sha, built) {
  const releases = join(root, "releases");
  boundary(root, { directory: true });
  boundary(releases, { directory: true });
  if (resolve(built.path) !== built.path || dirname(built.path) !== releases)
    throw new Error("PATH_BOUNDARY_INVALID");
  boundary(built.path, { directory: true });
  const next = join(built.path, ".next");
  const nextStat = boundary(next, { directory: true });
  if ((nextStat.mode & 0o777) !== 0o700)
    throw new Error("PATH_BOUNDARY_INVALID");
  const markerPath = join(next, "life-preview-composition.json");
  const markerStat = boundary(markerPath);
  if ((markerStat.mode & 0o777) !== 0o600)
    throw new Error("PATH_BOUNDARY_INVALID");
  const marker = readJson(markerPath);
  if (marker.version !== 2 || marker.buildId !== built.buildId)
    throw new Error("LINUX_RELEASE_STATE_INVALID");
  atomicJson(markerPath, {
    version: 2,
    buildId: built.buildId,
    sha,
    compatibility: built.compatibility,
  });
  atomicJson(join(root, "linux-state.json"), {
    version: 1,
    sha,
    release: built,
    enabled: false,
    configHash: digest(config),
    identityHash: digest(databaseIdentity(config.database)),
  });
}

function operatorFingerprint(source) {
  return digest(
    [
      "linux-preview.mjs",
      "linux-preview-core.mjs",
      "linux-preview-database.mjs",
      "linux-preview-application.mjs",
      "linux-preview-lifecycle.mjs",
      "linux-preview-restore-port.mjs",
      "linux-preview-parent.mjs",
    ].map((name) => {
      const file = join(source, "scripts/ops", name);
      boundary(file, { privateMode: false });
      return [name, readFileSync(file, "utf8")];
    }),
  );
}
export function readLinuxConfiguration(root) {
  boundary(root, { directory: true });
  if ((lstatSync(root).mode & 0o777) !== 0o700)
    throw new Error("LINUX_PRIVATE_ROOT_REQUIRED");
  const config = configuration.parse(readJson(join(root, "linux-config.json")));
  if ((lstatSync(join(root, "linux-config.json")).mode & 0o777) !== 0o600)
    throw new Error("LINUX_PRIVATE_CONFIG_REQUIRED");
  const url = new URL(config.origin);
  if (
    url.origin !== config.origin ||
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".ts.net") ||
    url.port ||
    url.username ||
    url.password ||
    !outside(config.source, root) ||
    !outside(config.source, config.database) ||
    !outside(root, config.database)
  )
    throw new Error("LINUX_CONFIGURATION_DENIED");
  boundary(config.source, { directory: true, privateMode: false });
  databaseIdentity(config.database);
  return config;
}

// Recheck exact main, latest exact-push quality and active no-bypass ruleset.
// A private receipt or an operator flag never substitutes GitHub authorization.
async function sourceGate(config, sha) {
  const env = cleanEnvironment(config.node);
  const git = (...args) =>
    command("/usr/bin/git", ["-C", config.source, ...args], { env });
  if (
    (await git("rev-parse", "HEAD")) !== sha ||
    (await git("status", "--porcelain", "--untracked-files=normal")) ||
    (await git("remote", "get-url", "origin")) !==
      `https://github.com/${REPOSITORY}.git` ||
    fileURLToPath(import.meta.url) !==
      join(config.source, "scripts/ops/linux-preview.mjs") ||
    (await command(config.node, ["--version"], { env })) !== `v${NODE}` ||
    (await command(config.pnpm, ["--version"], { env })) !== PNPM
  )
    throw new Error("LINUX_REQUIRES_CLEAN_MERGED_SOURCE");
}

export async function runLinuxPreview(operation, root, sha, approved) {
  if (
    process.platform !== "linux" ||
    process.versions.node !== NODE ||
    !approved ||
    !isSha(sha)
  )
    throw new Error("LINUX_EXPLICIT_OPERATOR_GATE_REQUIRED");
  root = resolve(root);
  const config = readLinuxConfiguration(root),
    github = new GitHubGate();
  // Do not create even the operational lock until live authorization passes.
  if (operation !== "revoke") {
    await github.gate(sha);
    await sourceGate(config, sha);
  }
  const unlock = operationalLock(
    join(root, "linux-operator-lease.db"),
    config.source,
  );
  let released = false;
  const releaseLock = () => {
    if (!released) {
      released = true;
      unlock();
    }
  };
  const statePath = join(root, "linux-state.json"),
    proofPath = join(root, "linux-recovery.json"),
    grantPath = join(root, "linux-grant.json");
  let state = existsSync(statePath) ? readJson(statePath) : null;
  let release, proof;
  let entryAuthorization = true;
  const verifyRelease = () => {
    state = readJson(statePath);
    release = state.release;
    if (
      state.version !== 1 ||
      state.sha !== sha ||
      state.configHash !== digest(config) ||
      state.identityHash !== digest(databaseIdentity(config.database)) ||
      !release ||
      release.sha !== sha ||
      !outside(config.source, release.path) ||
      !release.path.startsWith(`${root}/releases/`)
    )
      throw new Error("LINUX_RELEASE_STATE_INVALID");
    validateRelease(release);
    if (
      operatorFingerprint(release.path) !== operatorFingerprint(config.source)
    )
      throw new Error("LINUX_OPERATOR_RELEASE_CHANGED");
    const marker = readJson(
      join(release.path, ".next/life-preview-composition.json"),
    );
    if (
      marker.version !== 2 ||
      marker.buildId !== release.buildId ||
      marker.sha !== sha ||
      marker.compatibility !== release.compatibility
    )
      throw new Error("LINUX_RELEASE_STATE_INVALID");
  };
  const verifyProof = async () => {
    proof = readJson(proofPath);
    if (
      proof.configHash !== digest(config) ||
      digest(proof.release) !== digest(release) ||
      proof.gateway !== (await serveConfiguration(config)) ||
      !proof.backup?.startsWith(`${root}/recovery-`) ||
      dirname(proof.backup) !== dirname(proof.restore)
    )
      throw new Error("LINUX_RECOVERY_PROOF_INVALID");
    verifyRecovery(release.path, config.database, proof);
  };
  const assertInactive = async () => {
    if (state?.enabled) throw new Error("LINUX_REVOKE_BEFORE_REPROVISION");
  };
  try {
    return await linuxPreviewOperation(operation, {
      authorize: async () => {
        if (entryAuthorization) {
          entryAuthorization = false;
          return;
        }
        if (operation !== "revoke") await github.gate(sha);
      },
      verifySource: () => sourceGate(config, sha),
      assertInactive,
      build: async () => {
        if (!existsSync(join(root, "releases")))
          newDirectory(join(root, "releases"));
        return buildRelease(
          root,
          { ...config, workerSource: config.source, preview: { version: 2 } },
          sha,
          { compatibility: compatibilityFingerprint(config.source) },
          { prepareBuild: prepareLinuxPreviewNext },
        );
      },
      saveBuild: (built) => saveLinuxBuild(root, config, sha, built),
      verifyRelease,
      backupAndRestore: async () => {
        const folder = join(root, `recovery-${randomUUID()}`);
        newDirectory(folder);
        const gateway = await serveConfiguration(config);
        const result = await backupAndRestore(
          release.path,
          config.database,
          folder,
        );
        return {
          ...result,
          version: 1,
          release,
          configHash: digest(config),
          gateway,
        };
      },
      proveRestoredApplication: (result) =>
        proveRestoredApplication(config, release, result),
      saveProof: (result) => {
        verifyRecovery(release.path, config.database, result);
        atomicJson(proofPath, result);
      },
      verifyProof,
      assertPortAndWriterFree: async () => {
        if ((await portOccupied(3000)) || !leaseFree(config, release.path))
          throw new Error("LINUX_STOP_ORIGINAL_RUNTIME_REQUIRED");
      },
      provision: async () => {
        await assertInactive();
        const grant = linuxGrant(config, release, proof.source.owner);
        atomicJson(grantPath, grant);
        atomicJson(statePath, {
          ...state,
          enabled: true,
          grantHash: digest(grant),
          proofHash: digest(proof),
        });
      },
      verifyGrant: () => {
        const grant = readJson(grantPath);
        if (
          !state.enabled ||
          state.proofHash !== digest(proof) ||
          digest(grant) !== state.grantHash ||
          digest(grant) !==
            digest(
              linuxGrant(config, release, proof.source.owner, grant.instance),
            )
        )
          throw new Error("LINUX_GRANT_REVOKED_OR_CHANGED");
        // Source admission remains read-only; runtime obtains the only writer.
        inspectDatabase(release.path, config.database);
      },
      start: async () => {
        // Foreground owner, one normal-conditions Next child. Next retains
        // request draining, checkpoint/close and the sole writer lease.
        releaseLock();
        await runLinuxApplication(config, release, grantPath, root);
      },
      revoke: () => {
        // Existing admissions re-read this file on prepare/execute/receipt.
        // Preserve it for audit; invalid content revokes without deleting files.
        atomicJson(grantPath, { revoked: true });
        if (state) atomicJson(statePath, { ...state, enabled: false });
      },
    });
  } finally {
    releaseLock();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const [operation, root, sha, flag, ...extra] = process.argv.slice(2);
    if (extra.length || flag !== "--operator-approved")
      throw new Error("LINUX_EXPLICIT_OPERATOR_GATE_REQUIRED");
    await runLinuxPreview(operation, root, sha, true);
    if (operation !== "start")
      process.stdout.write("LINUX_PREVIEW_OPERATOR_PASS\n");
  } catch (error) {
    // Never print native exceptions, config, paths, owner identities or rows.
    process.stderr.write(`${errorCode(error)}\n`);
    process.exitCode = 1;
  }
}
