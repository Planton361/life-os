#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { developmentEnv } from "./next-memory-budget.mjs";
import { acquireRuntimeLock } from "./runtime-lock.mjs";
import { createProcessScope } from "./managed-process.mjs";
import { tmpdir } from "node:os";
import {
  CANONICAL_TARGET_PROJECT,
  assertCanonicalTargetRuntime,
  assertSuccessful,
  parseSupabaseEnv,
} from "./local-runtime-contract.mjs";

const scope = createProcessScope();
const run = scope.run;

async function canonicalApiPort() {
  const result = await run("docker", [
    "inspect",
    `supabase_kong_${CANONICAL_TARGET_PROJECT}`,
  ]);
  await assertSuccessful(result, "Canonical Target API inspection");
  const [inspection] = JSON.parse(result.stdout);
  const ports = inspection?.NetworkSettings?.Ports?.["8000/tcp"] ?? [];
  const port = ports.find((binding) => binding.HostPort)?.HostPort;
  if (!port) throw new Error("RUNTIME_GUARD_CANONICAL_TARGET_API_UNAVAILABLE");
  return port;
}

async function createStatusWorkdir(apiPort) {
  const root = await mkdtemp(join(tmpdir(), "life-os-target-status-"));
  const supabaseDir = join(root, "supabase");
  await mkdir(supabaseDir, { recursive: true });
  const config = await readFile(
    join(process.cwd(), "supabase", "config.toml"),
    "utf8",
  );
  const targetConfig = config
    .replace(
      /^project_id\s*=.*$/m,
      `project_id = "${CANONICAL_TARGET_PROJECT}"`,
    )
    .replace(/^port\s*=\s*54321$/m, `port = ${apiPort}`);
  await writeFile(join(supabaseDir, "config.toml"), targetConfig, "utf8");
  return root;
}

async function targetPublicRuntimeEnv() {
  const target = await assertCanonicalTargetRuntime(run);
  const apiPort = await canonicalApiPort();
  const statusWorkdir = await createStatusWorkdir(apiPort);
  try {
    const status = await run("pnpm", [
      "exec",
      "supabase",
      "status",
      "--workdir",
      statusWorkdir,
      "--output",
      "env",
    ]);
    await assertSuccessful(status, "Canonical Target status lookup");
    const values = parseSupabaseEnv(status.stdout);
    const publishableKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
    if (!values.API_URL || !publishableKey)
      throw new Error(
        "RUNTIME_GUARD_CANONICAL_TARGET_PUBLIC_CONFIG_UNAVAILABLE",
      );
    return {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY ?? publishableKey,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
      target,
    };
  } finally {
    await rm(statusWorkdir, { force: true, recursive: true });
  }
}

let releaseLock;
async function main() {
  releaseLock = await acquireRuntimeLock("dev");
  const runtimeEnv = await targetPublicRuntimeEnv();
  console.log("CANONICAL_TARGET_DEV_RUNTIME_READY");
  const require = createRequire(import.meta.url);
  const result = await run(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)],
    {
      env: developmentEnv({ ...process.env, ...runtimeEnv }),
      inherit: true,
    },
  );
  process.exitCode = result.code;
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "RUNTIME_GUARD_FAILED",
    );
    process.exitCode =
      scope.interrupted === "SIGINT"
        ? 130
        : scope.interrupted === "SIGTERM"
          ? 143
          : 1;
  })
  .finally(async () => {
    await scope.close();
    await releaseLock?.();
  });
