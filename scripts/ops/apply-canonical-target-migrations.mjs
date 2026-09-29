#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  CANONICAL_TARGET_PROJECT,
  assertCanonicalTargetRuntime,
  assertSuccessful,
  run,
} from "./local-runtime-contract.mjs";

async function createTargetMigrationWorkdir(target) {
  const dbPort = target.hostPorts[0];
  if (!dbPort) throw new Error("RUNTIME_GUARD_CANONICAL_TARGET_DB_UNAVAILABLE");

  const root = await mkdtemp(join(tmpdir(), "life-os-target-migrate-"));
  const supabaseDir = join(root, "supabase");
  await mkdir(supabaseDir, { recursive: true });

  const config = await readFile(join(process.cwd(), "supabase", "config.toml"), "utf8");
  const targetConfig = config
    .replace(/^project_id\s*=.*$/m, `project_id = "${CANONICAL_TARGET_PROJECT}"`)
    .replace(/^port\s*=\s*54322$/m, `port = ${dbPort}`);
  await writeFile(join(supabaseDir, "config.toml"), targetConfig, "utf8");
  await symlink(resolve(process.cwd(), "supabase", "migrations"), join(supabaseDir, "migrations"), "dir");
  return root;
}

async function main() {
  const target = await assertCanonicalTargetRuntime();
  const workdir = await createTargetMigrationWorkdir(target);
  const revokeTemporaryGrants = async () => assertSuccessful(
    await run("docker", ["exec", target.containerName, "psql", "-U", "supabase_admin",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c",
      "revoke create on schema public from life_os_project_command, postgres; revoke life_os_project_command from postgres;" ]),
    "Canonical Target Project command-role final grants",
  );
  let temporaryGrantsApplied = false;

  try {
    await assertSuccessful(
      await run("docker", [
        "exec", target.containerName, "psql", "-U", "supabase_admin",
        "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c",
        `do $$begin if not exists (select 1 from pg_roles where rolname='life_os_project_command') then create role life_os_project_command nologin nobypassrls; end if; end$$; grant usage on schema auth to life_os_project_command; grant execute on function auth.uid() to life_os_project_command; grant usage, create on schema public to postgres; grant usage, create on schema public to life_os_project_command; grant life_os_project_command to postgres;`,
      ]),
      "Canonical Target Project command-role grants",
    );
    temporaryGrantsApplied = true;
    await assertSuccessful(
      await run("pnpm", ["exec", "supabase", "migration", "up", "--local", "--workdir", workdir]),
      "Canonical Target migration apply",
    );
    await assertSuccessful(
      await run("pnpm", ["exec", "supabase", "migration", "list", "--local", "--workdir", workdir]),
      "Canonical Target migration list",
    );
    await revokeTemporaryGrants();
    temporaryGrantsApplied = false;
    await assertSuccessful(
      await run("pnpm", ["exec", "supabase", "db", "lint", "--local", "--level", "warning", "--workdir", workdir]),
      "Canonical Target DB lint",
    );
    await assertSuccessful(
      await run("pnpm", ["exec", "supabase", "db", "advisors", "--local", "--type", "security", "--level", "warn", "--fail-on", "none", "--workdir", workdir]),
      "Canonical Target DB security advisors",
    );
  } finally {
    try {
      if (temporaryGrantsApplied) await revokeTemporaryGrants();
    } finally {
      await rm(workdir, { force: true, recursive: true });
    }
  }

  console.log("CANONICAL_TARGET_MIGRATIONS_APPLIED");
  console.log("CANONICAL_TARGET_MIGRATION_LIST_AVAILABLE");
  console.log("CANONICAL_TARGET_DB_LINT_PASS");
  console.log("CANONICAL_TARGET_DB_ADVISORS_PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RUNTIME_GUARD_MIGRATION_FAILED");
  process.exitCode = 1;
});
