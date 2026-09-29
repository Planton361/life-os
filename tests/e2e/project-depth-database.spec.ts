import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("P-DATA v4 fresh migration, SQL/security and real concurrency proofs", async () => {
  test.setTimeout(120000);
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  const project = process.env.LIFE_OS_E2E_PROJECT_ID!;
  expect(project).toMatch(/^life-os-z1-e2e-/);
  const container = `supabase_db_${project}`;
  for (const file of ["project-depth.sql", "project-depth-v4.sql", "r2-10-task-dependencies.sql", "sr1-03-source-linked-task-write-boundary.sql"]) {
    execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: readFileSync(`tests/supabase/${file}`), timeout: 30000 });
  }
  execFileSync(process.execPath, ["tests/supabase/project-depth-concurrency.mjs", container], { timeout: 45000 });
  execFileSync(process.execPath, ["tests/supabase/r2-10-task-dependency-concurrency.mjs", container], { timeout: 45000 });
});
