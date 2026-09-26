#!/usr/bin/env node
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { developmentEnv } from "../ops/next-memory-budget.mjs";
import { createProcessScope } from "../ops/managed-process.mjs";
import { acquireRuntimeLock } from "../ops/runtime-lock.mjs";
import {
  CANONICAL_TARGET_PROJECT,
  DEFAULT_CLI_PROJECT,
  assertSuccessful,
  parseSupabaseEnv,
} from "../ops/local-runtime-contract.mjs";

const scope = createProcessScope({ graceMs: 15_000 });
const run = scope.run;

function disposablePorts() {
  const offset = (process.pid % 500) * 10;
  return {
    api: 57000 + offset,
    analytics: 57007 + offset,
    db: 57001 + offset,
    inbucket: 57004 + offset,
    pooler: 57009 + offset,
    shadow: 57002 + offset,
    studio: 57003 + offset,
  };
}

function configForDisposableStack(config, projectId, ports, appPort) {
  return config
    .replace(/^project_id\s*=.*$/m, `project_id = "${projectId}"`)
    .replace(/^port\s*=\s*54321$/m, `port = ${ports.api}`)
    .replace(/^port\s*=\s*54322$/m, `port = ${ports.db}`)
    .replace(/^shadow_port\s*=\s*54320$/m, `shadow_port = ${ports.shadow}`)
    .replace(/^port\s*=\s*54329$/m, `port = ${ports.pooler}`)
    .replace(/^port\s*=\s*54323$/m, `port = ${ports.studio}`)
    .replace(/^port\s*=\s*54324$/m, `port = ${ports.inbucket}`)
    .replace(/^port\s*=\s*54327$/m, `port = ${ports.analytics}`)
    .replaceAll("127.0.0.1:3000", `127.0.0.1:${appPort}`);
}

function disposableStartFailureClass(stderr) {
  const detail = (stderr ?? "").toLowerCase();
  if (
    detail.includes("address already in use") ||
    detail.includes("port is already allocated")
  ) {
    return "DISPOSABLE_E2E_PORT_COLLISION";
  }
  if (detail.includes("invalid port")) return "DISPOSABLE_E2E_INVALID_PORT";
  if (detail.includes("cannot connect to the docker daemon"))
    return "DISPOSABLE_E2E_DOCKER_UNAVAILABLE";
  return "DISPOSABLE_E2E_START_FAILED";
}

async function main() {
  const testArgs = process.argv.slice(2);
  if (testArgs.length === 0) {
    throw new Error(
      "Pass one focused Playwright spec to the disposable runner.",
    );
  }

  const releaseLock = await acquireRuntimeLock("heavy");
  const stamp = `${Date.now()}-${process.pid}`;
  const projectId = `life-os-z1-e2e-${stamp}`;
  if ([CANONICAL_TARGET_PROJECT, DEFAULT_CLI_PROJECT].includes(projectId)) {
    throw new Error("Disposable project identity collision.");
  }

  const distDir = `.next-e2e-${stamp}`;
  const appPort = 4300 + (process.pid % 500);
  // /tmp is tmpfs on this workstation. Keep Chromium's temporary backing
  // files on the repository's local disk, not in the machine's RAM budget.
  const cacheRoot = join(
    process.cwd(),
    "node_modules",
    ".cache",
    "life-os-runtime",
  );
  await mkdir(cacheRoot, { recursive: true, mode: 0o700 });
  const root = await mkdtemp(join(cacheRoot, "e2e-"));
  const supabaseDir = join(root, "supabase");
  const ports = disposablePorts();
  let startAttempted = false;

  try {
    await mkdir(supabaseDir, { recursive: true });
    const config = await readFile(
      join(process.cwd(), "supabase", "config.toml"),
      "utf8",
    );
    await writeFile(
      join(supabaseDir, "config.toml"),
      configForDisposableStack(config, projectId, ports, appPort),
      "utf8",
    );
    await symlink(
      resolve(process.cwd(), "supabase", "migrations"),
      join(supabaseDir, "migrations"),
      "dir",
    );

    // Next adds its generated-type paths to the selected tsconfig. Give this
    // run its own supported tsconfigPath so the tracked config stays untouched.
    await writeFile(
      join(process.cwd(), `${distDir}.tsconfig.json`),
      JSON.stringify({ extends: "./tsconfig.json" }),
      { mode: 0o600 },
    );
    startAttempted = true;
    const start = await run("pnpm", [
      "exec",
      "supabase",
      "start",
      "--workdir",
      root,
    ]);
    if (!start.ok) throw new Error(disposableStartFailureClass(start.stderr));
    await assertSuccessful(
      await run("pnpm", [
        "exec",
        "supabase",
        "migration",
        "up",
        "--local",
        "--workdir",
        root,
      ]),
      "Disposable migration apply",
    );
    const status = await run("pnpm", [
      "exec",
      "supabase",
      "status",
      "--workdir",
      root,
      "--output",
      "env",
    ]);
    await assertSuccessful(status, "Disposable Supabase status lookup");
    const values = parseSupabaseEnv(status.stdout);
    const publishableKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
    if (!values.API_URL || !publishableKey)
      throw new Error("Disposable public runtime config unavailable.");

    console.log("DISPOSABLE_E2E_RUNTIME_READY");
    const env = {
      ...developmentEnv(),
      TMPDIR: root,
      LIFE_OS_E2E_DIST_DIR: distDir,
      LIFE_OS_E2E_PROJECT_ID: projectId,
      LIFE_OS_E2E_RUNTIME: "DISPOSABLE",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY ?? publishableKey,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
      PLAYWRIGHT_HOST: "127.0.0.1",
      PLAYWRIGHT_PORT: String(appPort),
    };
    const proof = await run(
      "pnpm",
      ["exec", "playwright", "test", ...testArgs],
      { env, inherit: true },
    );
    if (!proof.ok)
      throw new Error("Focused disposable Playwright proof failed.");
  } finally {
    try {
      if (startAttempted) {
        const stopped = await run(
          "pnpm",
          [
            "exec",
            "supabase",
            "stop",
            "--project-id",
            projectId,
            "--workdir",
            root,
          ],
          { cleanup: true },
        );
        if (stopped.code !== 0)
          throw new Error(
            "DISPOSABLE_E2E_CLEANUP_FAILED: workdir retained for recovery.",
          );
      }
      await rm(join(process.cwd(), `${distDir}.tsconfig.json`), {
        force: true,
      });
      await rm(join(process.cwd(), `${distDir}.tsconfig.tsbuildinfo`), {
        force: true,
      });
      await rm(join(process.cwd(), distDir), { force: true, recursive: true });
      await rm(root, { force: true, recursive: true });
    } finally {
      await releaseLock();
    }
  }

  console.log("DISPOSABLE_E2E_RUNTIME_REMOVED");
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "DISPOSABLE_E2E_FAILED",
    );
    process.exitCode =
      scope.interrupted === "SIGINT"
        ? 130
        : scope.interrupted === "SIGTERM"
          ? 143
          : 1;
  })
  .finally(() => scope.close());
