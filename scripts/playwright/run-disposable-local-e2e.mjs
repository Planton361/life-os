#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  CANONICAL_TARGET_PROJECT,
  DEFAULT_CLI_PROJECT,
  assertSuccessful,
  parseSupabaseEnv,
  run,
} from "../ops/local-runtime-contract.mjs";

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

function runInherited(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, stdio: "inherit" });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function disposableStartFailureClass(stderr) {
  const detail = (stderr ?? "").toLowerCase();
  if (detail.includes("address already in use") || detail.includes("port is already allocated")) {
    return "DISPOSABLE_E2E_PORT_COLLISION";
  }
  if (detail.includes("invalid port")) return "DISPOSABLE_E2E_INVALID_PORT";
  if (detail.includes("cannot connect to the docker daemon")) return "DISPOSABLE_E2E_DOCKER_UNAVAILABLE";
  return "DISPOSABLE_E2E_START_FAILED";
}

async function main() {
  const testArgs = process.argv.slice(2);
  if (testArgs.length === 0) {
    throw new Error("Pass one focused Playwright spec to the disposable runner.");
  }

  const stamp = `${Date.now()}-${process.pid}`;
  const projectId = `life-os-z1-e2e-${stamp}`;
  if ([CANONICAL_TARGET_PROJECT, DEFAULT_CLI_PROJECT].includes(projectId)) {
    throw new Error("Disposable project identity collision.");
  }

  const appPort = 4300 + (process.pid % 500);
  await mkdir(join(process.cwd(), ".local"), { recursive: true });
  const root = await mkdtemp(join(process.cwd(), ".local", "z1-e2e-"));
  const supabaseDir = join(root, "supabase");
  const ports = disposablePorts();
  let started = false;

  try {
    await mkdir(supabaseDir, { recursive: true });
    const config = await readFile(join(process.cwd(), "supabase", "config.toml"), "utf8");
    await writeFile(join(supabaseDir, "config.toml"), configForDisposableStack(config, projectId, ports, appPort), "utf8");
    await symlink(resolve(process.cwd(), "supabase", "migrations"), join(supabaseDir, "migrations"), "dir");

    const start = await run("pnpm", ["exec", "supabase", "start", "--workdir", root]);
    if (!start.ok) throw new Error(disposableStartFailureClass(start.stderr));
    started = true;
    await assertSuccessful(
      await run("pnpm", ["exec", "supabase", "migration", "up", "--local", "--workdir", root]),
      "Disposable migration apply",
    );
    const status = await run("pnpm", ["exec", "supabase", "status", "--workdir", root, "--output", "env"]);
    await assertSuccessful(status, "Disposable Supabase status lookup");
    const values = parseSupabaseEnv(status.stdout);
    const publishableKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
    if (!values.API_URL || !publishableKey) throw new Error("Disposable public runtime config unavailable.");

    console.log("DISPOSABLE_E2E_RUNTIME_READY");
    const env = {
      ...process.env,
      LIFE_OS_E2E_RUNTIME: "DISPOSABLE",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY ?? publishableKey,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
      PLAYWRIGHT_HOST: "127.0.0.1",
      PLAYWRIGHT_PORT: String(appPort),
    };
    const code = await runInherited("pnpm", ["exec", "playwright", "test", ...testArgs], env);
    if (code !== 0) throw new Error("Focused disposable Playwright proof failed.");
  } finally {
    if (started) await run("pnpm", ["exec", "supabase", "stop", "--workdir", root]);
    await rm(root, { force: true, recursive: true });
  }

  console.log("DISPOSABLE_E2E_RUNTIME_REMOVED");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "DISPOSABLE_E2E_FAILED");
  process.exitCode = 1;
});
