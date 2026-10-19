import { createHash, randomUUID } from "node:crypto";
import { join, dirname, basename } from "node:path";
import {
  readFileSync,
  existsSync,
  openSync,
  closeSync,
  writeSync,
  fsyncSync,
  renameSync,
  lstatSync,
} from "node:fs";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { LABEL, deny, isSha } from "./preview-cd-core.mjs";
import {
  boundary,
  readJson,
  command,
  cleanEnvironment,
  leaseFree,
  validateRelease,
} from "./preview-cd-host.mjs";
import { processIdentity } from "./preview-cd.mjs";
import {
  validateV9Release,
  validateV9WorkerSource,
} from "./preview-v9-contract.mjs";
import { v9DatabasePreflight } from "./preview-upgrade-v9.mjs";
import { assertOperatorHandoff } from "./preview-upgrade-state.mjs";

export const journalDigest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const digestValid = (s) => /^[a-f0-9]{64}$/.test(s ?? "");
const journalName = "upgrade-v2.json";
const evidenceName = (digest) => `upgrade-v2.aborted-v9.${digest}.json`;
export function assertUpgradeJournalAdmission(
  root,
  { recover = false, abortedDigest } = {},
) {
  if (recover && abortedDigest) deny("UPGRADE_OPERATION_INVALID");
  if (!recover && !abortedDigest && existsSync(join(root, journalName)))
    deny("UPGRADE_ALREADY_PROVISIONED_OR_RECOVERY_REQUIRED");
  if (abortedDigest) abortedV9Evidence(root, abortedDigest);
}
export function assertFreshReattemptPair(pair, previous, sha) {
  const oldPaths = [previous.candidate.path, previous.fallback.path];
  if (
    pair.candidate.path === pair.fallback.path ||
    [pair.candidate, pair.fallback].some(
      (r) => r.sha !== sha || oldPaths.includes(r.path),
    )
  )
    deny("UPGRADE_REATTEMPT_FRESH_PAIR_REQUIRED");
}
function syncDirectory(path) {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function durableFile(path, bytes, mode) {
  const fd = openSync(path, "wx", mode);
  try {
    // Drain partial writes; never overwrite an existing evidence file.
    const buffer = Buffer.from(bytes);
    let offset = 0;
    while (offset < buffer.length) offset += writeSync(fd, buffer, offset);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  syncDirectory(dirname(path));
}
export function durableUpgradeJournal(path, value) {
  boundary(dirname(path), { directory: true });
  if (existsSync(path)) boundary(path);
  const temp = `${path}.${randomUUID()}.tmp`;
  durableFile(temp, `${JSON.stringify(value)}\n`, 0o600);
  renameSync(temp, path);
  syncDirectory(dirname(path));
}

// Read/validate only. Generic upgrade never admits either phase implicitly.
export function abortedV9Evidence(root, digest) {
  if (!digestValid(digest)) deny("UPGRADE_ABORT_ACK_DIGEST_REQUIRED");
  boundary(root, { directory: true });
  const path = join(root, journalName);
  boundary(path);
  const currentBytes = readFileSync(path),
    current = JSON.parse(currentBytes);
  let bytes = currentBytes;
  if (current.phase === "reattempt-v9") {
    if (
      current.version !== 2 ||
      !isSha(current.sha) ||
      current.aborted?.digest !== digest ||
      current.aborted?.archive !== evidenceName(digest) ||
      Object.keys(current).sort().join() !== "aborted,owner,phase,sha,version"
    )
      deny("UPGRADE_ABORT_ACK_MARKER_INVALID");
    const archive = join(root, evidenceName(digest));
    boundary(archive);
    if ((lstatSync(archive).mode & 0o777) !== 0o400)
      deny("UPGRADE_ABORT_EVIDENCE_INVALID");
    bytes = readFileSync(archive);
  }
  if (journalDigest(bytes) !== digest) deny("UPGRADE_ABORT_ACK_CHANGED");
  const original = JSON.parse(bytes),
    cp = original.checkpoint;
  if (
    original.version !== 2 ||
    original.phase !== "aborted-v9" ||
    !isSha(original.sha) ||
    cp?.stopped !== true ||
    !cp.operator ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      cp.instance ?? "",
    ) ||
    !cp.originalConfig ||
    !cp.originalState ||
    typeof cp.originalPlist !== "string" ||
    !original.prepared?.candidate ||
    !original.prepared?.fallback ||
    original.prepared.candidate.sha !== original.sha ||
    original.prepared.fallback.sha !== original.sha ||
    original.prepared.candidate.path === original.prepared.fallback.path
  )
    deny("UPGRADE_ABORT_JOURNAL_INVALID");
  return { original, bytes, current, currentBytes, digest };
}

// Own frozen supervisor + its sole server, not merely "a busy writer lease".
// label/port overrides exist only for owned native test services, never CLI.
export async function verifyRunningV9(
  root,
  config,
  release,
  {
    label = LABEL,
    port = 3000,
    authenticatedHealth = true,
    plist = join(process.env.HOME, "Library/LaunchAgents", `${label}.plist`),
    programArguments = [
      config.node,
      join(config.workerSource, "scripts/ops/preview-cd.mjs"),
      "supervise",
      root,
    ],
  } = {},
) {
  validateV9WorkerSource(config.workerSource);
  validateV9Release(release);
  const env = cleanEnvironment(config.node),
    worker = readJson(join(root, "worker.json"));
  if (worker.identity !== (await processIdentity(worker.pid, config.node)))
    deny("UPGRADE_V9_SERVICE_IDENTITY_INVALID");
  const job = await command(
    "/bin/launchctl",
    ["print", `gui/${process.getuid()}/${label}`],
    { env },
  );
  boundary(plist);
  const args = JSON.parse(
    await command(
      "/usr/bin/plutil",
      ["-extract", "ProgramArguments", "json", "-o", "-", plist],
      { env },
    ),
  );
  if (!isDeepStrictEqual(args, programArguments))
    deny("UPGRADE_V9_LAUNCHER_INVALID");
  const parent = await command(
    "/bin/ps",
    ["-p", String(worker.serverPid), "-o", "ppid="],
    { env },
  );
  const cwd = await command(
    "/usr/sbin/lsof",
    ["-a", "-p", String(worker.serverPid), "-d", "cwd", "-Fn"],
    { env },
  );
  if (
    !job.includes(`pid = ${worker.pid}\n`) ||
    Number(parent) !== worker.pid ||
    !cwd.split("\n").includes(`n${release.path}`)
  )
    deny("UPGRADE_V9_SERVICE_IDENTITY_INVALID");
  const onlyPid = async (args, expected) => {
    const result = await command("/usr/sbin/lsof", ["-t", ...args], { env });
    const pids = [...new Set(result.split(/\s+/).filter(Boolean).map(Number))];
    if (pids.length !== 1 || pids[0] !== expected)
      deny("UPGRADE_V9_SERVICE_OR_WRITER_CONFLICT");
  };
  await onlyPid([join(root, "worker-lease.db")], worker.pid);
  await onlyPid([`${config.database}.writer-lease.db`], worker.serverPid);
  await onlyPid([config.database], worker.serverPid);
  await onlyPid(["-iTCP:" + port, "-sTCP:LISTEN"], worker.serverPid);
  if (leaseFree(config, config.workerSource))
    deny("UPGRADE_V9_WRITER_NOT_RUNNING");
  if (authenticatedHealth) {
    // Imported only after the seven historical worker files have been sealed.
    const frozen = await import(
      pathToFileURL(
        join(config.workerSource, "scripts/ops/preview-cd-host.mjs"),
      )
    );
    await frozen.health(config, release);
  } else {
    const r = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (r.status !== 200 || (await r.text()) !== release.buildId)
      deny("UPGRADE_V9_HEALTH_FAILED");
  }
}

export async function verifyAbortedV9({
  root,
  digest,
  plist,
  authorize,
  provenance,
  serving,
}) {
  await authorize("verify-start");
  const evidence = abortedV9Evidence(root, digest),
    { original, current } = evidence;
  await provenance(original.sha);
  // Journal provenance includes the recorded release manifests/source contract.
  // Validation never admits either old candidate for the new attempt.
  validateRelease(original.prepared.candidate);
  validateRelease(original.prepared.fallback);
  if (current.phase === "reattempt-v9") await provenance(current.sha);
  const config = readJson(join(root, "config.json")),
    state = readJson(join(root, "state.json"));
  const cp = original.checkpoint;
  if (original.abortedEvidence) {
    const prior = original.abortedEvidence;
    if (
      !digestValid(prior.digest) ||
      prior.archive !== evidenceName(prior.digest)
    )
      deny("UPGRADE_ABORT_EVIDENCE_INVALID");
    const archive = join(root, prior.archive);
    boundary(archive);
    if (
      (lstatSync(archive).mode & 0o777) !== 0o400 ||
      journalDigest(readFileSync(archive)) !== prior.digest
    )
      deny("UPGRADE_ABORT_EVIDENCE_INVALID");
  }
  boundary(plist);
  if (
    config.preview ||
    !isDeepStrictEqual(config, cp.originalConfig) ||
    readFileSync(plist, "utf8") !== cp.originalPlist ||
    !isDeepStrictEqual(state.lastGood, cp.originalState.lastGood) ||
    state.commandOffset !== cp.originalState.commandOffset ||
    state.autoEnabled !== cp.originalState.autoEnabled ||
    state.rollbackRequested ||
    state.transition
  )
    deny("UPGRADE_ABORT_ORIGINAL_STATE_CHANGED");
  assertOperatorHandoff(root, cp);
  validateV9WorkerSource(config.workerSource);
  const owner = await v9DatabasePreflight(config, state.lastGood);
  if (
    (Object.hasOwn(original.prepared, "owner") &&
      original.prepared.owner !== owner) ||
    (original.abortedEvidence && original.abortedEvidence.owner !== owner) ||
    (current.phase === "reattempt-v9" && current.owner !== owner)
  )
    deny("UPGRADE_ABORT_OWNER_CHANGED");
  await serving(root, config, state.lastGood);
  await authorize("verify-complete");
  // Reject a command/state/journal change during slow network/native checks.
  const latest = readJson(join(root, "state.json"));
  if (
    latest.commandOffset !== state.commandOffset ||
    latest.autoEnabled !== state.autoEnabled ||
    latest.rollbackRequested ||
    latest.transition ||
    !isDeepStrictEqual(latest.lastGood, state.lastGood) ||
    !readFileSync(join(root, journalName)).equals(evidence.currentBytes)
  )
    deny("UPGRADE_ABORT_STATE_RACED");
  assertOperatorHandoff(root, cp);
  return { ...evidence, owner };
}

// Caller holds the independent operator lock throughout verification + attempt.
export async function acknowledgeAbortedV9(
  options,
  controlSha,
  afterArchive = async () => {},
) {
  if (!isSha(controlSha)) deny("OPERATOR_GATE_REQUIRED");
  const evidence = await verifyAbortedV9(options);
  const archive = join(options.root, evidenceName(options.digest));
  if (!existsSync(archive)) durableFile(archive, evidence.bytes, 0o400);
  boundary(archive);
  if (
    (lstatSync(archive).mode & 0o777) !== 0o400 ||
    !readFileSync(archive).equals(evidence.bytes)
  )
    deny("UPGRADE_ABORT_EVIDENCE_INVALID");
  // Crash here leaves the untouched aborted journal and durable exact evidence.
  await afterArchive();
  if (
    !readFileSync(join(options.root, journalName)).equals(evidence.currentBytes)
  )
    deny("UPGRADE_ABORT_ACK_CHANGED");
  durableUpgradeJournal(join(options.root, journalName), {
    version: 2,
    phase: "reattempt-v9",
    sha: controlSha,
    owner: evidence.owner,
    aborted: { archive: basename(archive), digest: options.digest },
  });
  return {
    archive: basename(archive),
    digest: options.digest,
    owner: evidence.owner,
  };
}
