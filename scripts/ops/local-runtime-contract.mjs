import { spawn } from "node:child_process";

export const CANONICAL_TARGET_PROJECT = "life-os-sr104b-target";
export const DEFAULT_CLI_PROJECT = "life-os-app";
export const LEGACY_SOURCE_PROJECTS = [
  "life-os-sr104a-source",
  "life-os-sr104a2-source",
];

export function run(command, args, { env = process.env, input, captureStdout = true } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: [input === undefined ? "ignore" : "pipe", captureStdout ? "pipe" : "ignore", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ ok: false, code: null, stdout, stderr: error.message }));
    child.on("close", (code) => resolve({ ok: code === 0, code, stdout, stderr }));

    if (input !== undefined) child.stdin.end(input);
  });
}

function dbContainerName(projectId) {
  return `supabase_db_${projectId}`;
}

function localHostPorts(ports) {
  return (ports?.["5432/tcp"] ?? [])
    .map((binding) => binding.HostPort)
    .filter((port) => typeof port === "string" && port.length > 0);
}

export async function inspectLocalSupabaseProject(projectId) {
  const containerName = dbContainerName(projectId);
  const result = await run("docker", ["inspect", containerName]);
  if (!result.ok) {
    return { exists: false, projectId };
  }

  let inspection;
  try {
    [inspection] = JSON.parse(result.stdout);
  } catch {
    throw new Error("RUNTIME_GUARD_UNREADABLE_DOCKER_METADATA");
  }

  const labels = inspection?.Config?.Labels ?? {};
  return {
    containerName,
    exists: true,
    hostPorts: localHostPorts(inspection?.NetworkSettings?.Ports),
    labels,
    projectId,
    running: inspection?.State?.Running === true,
  };
}

export async function assertCanonicalTargetRuntime() {
  const target = await inspectLocalSupabaseProject(CANONICAL_TARGET_PROJECT);
  if (!target.exists || !target.running) {
    throw new Error("RUNTIME_GUARD_CANONICAL_TARGET_UNAVAILABLE");
  }

  if (
    target.labels["com.docker.compose.project"] !== CANONICAL_TARGET_PROJECT ||
    target.labels["com.supabase.cli.project"] !== CANONICAL_TARGET_PROJECT ||
    target.hostPorts.length === 0
  ) {
    throw new Error("RUNTIME_GUARD_CANONICAL_TARGET_IDENTITY_MISMATCH");
  }

  return target;
}

export async function localRuntimeClassification() {
  const [canonicalTarget, defaultCli, ...legacy] = await Promise.all([
    inspectLocalSupabaseProject(CANONICAL_TARGET_PROJECT),
    inspectLocalSupabaseProject(DEFAULT_CLI_PROJECT),
    ...LEGACY_SOURCE_PROJECTS.map((projectId) => inspectLocalSupabaseProject(projectId)),
  ]);

  return {
    canonicalTarget,
    defaultCli,
    legacySourcePresent: legacy.some((runtime) => runtime.exists),
    legacySourceRunning: legacy.some((runtime) => runtime.running),
  };
}

export function assertOptionalDbUrlTargetsCanonicalTarget(dbUrl, canonicalTarget) {
  if (!dbUrl) return;

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error("RUNTIME_GUARD_INVALID_LOCAL_DB_URL");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("RUNTIME_GUARD_INVALID_LOCAL_DB_URL");
  }

  const host = parsed.hostname.toLowerCase();
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!localHost) {
    throw new Error("RUNTIME_GUARD_REJECTED_NONLOCAL_DB_URL");
  }

  const port = parsed.port || "5432";
  if (!canonicalTarget.hostPorts.includes(port)) {
    throw new Error("RUNTIME_GUARD_REJECTED_DIFFERENT_LOCAL_STACK");
  }
}

export async function assertSuccessful(result, label) {
  if (!result.ok) {
    throw new Error(`${label} failed.`);
  }
  return result;
}

export function parseSupabaseEnv(output) {
  const values = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const quoted = raw.match(/^"(.*)"$/);
    values[key] = quoted ? quoted[1].replaceAll('\\"', '"') : raw;
  }
  return values;
}
