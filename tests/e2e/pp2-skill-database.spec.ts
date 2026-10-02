import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
test("PP2 lifecycle, history, ownership, grants and two-session concurrency", async () => {
  test.setTimeout(90_000);
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  const container = `supabase_db_${process.env.LIFE_OS_E2E_PROJECT_ID}`;
  const sql = readFileSync("tests/supabase/pp2-skill-development.sql");
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql },
  );
  execFileSync(
    "node",
    ["tests/supabase/pp2-skill-concurrency.mjs", container],
    { stdio: "inherit" },
  );
  execFileSync(
    "pnpm",
    [
      "exec",
      "supabase",
      "db",
      "lint",
      "--local",
      "--level",
      "warning",
      "--workdir",
      process.env.LIFE_OS_E2E_WORKDIR!,
    ],
    { stdio: "inherit" },
  );
  execFileSync(
    "pnpm",
    [
      "exec",
      "supabase",
      "db",
      "advisors",
      "--local",
      "--type",
      "security",
      "--level",
      "warn",
      "--fail-on",
      "none",
      "--workdir",
      process.env.LIFE_OS_E2E_WORKDIR!,
    ],
    { stdio: "inherit" },
  );
});

test("PP2 local Data API: direct writes denied, two-owner reads and source captures scoped", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(new URL(url).hostname).toBe("127.0.0.1");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  async function owner() {
    const c = createClient(url, key, { auth: { persistSession: false } });
    const id = crypto.randomUUID();
    const r = await c.auth.signUp({
      email: `pp2-api-${id}@example.test`,
      password: `Proof-${id}`,
    });
    expect(r.error).toBeNull();
    return { c, u: r.data.user!.id };
  }
  const a = await owner(),
    b = await owner();
  const created = await a.c.rpc("skill_development_command", {
    p_skill_id: null,
    p_command_id: crypto.randomUUID(),
    p_operation: "skill.create",
    p_expected_revision: null,
    p_payload: { name: "API proof" },
  });
  expect(created.error).toBeNull();
  const s = created.data.skill_id;
  expect(
    (await b.c.rpc("skill_development_read", { p_skill_id: s })).data,
  ).toBeNull();
  expect(
    (
      await b.c.rpc("skill_development_command", {
        p_skill_id: s,
        p_command_id: crypto.randomUUID(),
        p_operation: "skill.archive",
        p_expected_revision: 0,
        p_payload: {},
      })
    ).error,
  ).not.toBeNull();
  for (const table of [
    "skills",
    "skill_evidence",
    "skill_development_targets",
    "skill_milestones",
    "skill_development_reviews",
    "skill_evidence_revisions",
    "skill_development_review_evidence",
    "skill_development_review_amendments",
    "skill_command_receipts",
  ]) {
    expect((await a.c.from(table).insert({ user_id: a.u })).error?.code).toBe(
      "42501",
    );
    expect(
      (await a.c.from(table).update({ user_id: a.u }).eq("user_id", a.u)).error
        ?.code,
    ).toBe("42501");
    expect(
      (await a.c.from(table).delete().eq("user_id", a.u)).error?.code,
    ).toBe("42501");
  }
  const foreign = await b.c
    .from("tasks")
    .insert({ user_id: b.u, title: "Foreign source", status: "planned" })
    .select("id")
    .single();
  expect(foreign.error).toBeNull();
  expect(
    (
      await a.c.rpc("skill_development_command", {
        p_skill_id: s,
        p_command_id: crypto.randomUUID(),
        p_operation: "evidence.create",
        p_expected_revision: 0,
        p_payload: {
          title: "Foreign",
          source_type: "task",
          source_id: foreign.data!.id,
          evidence_date: "2026-09-01",
        },
      })
    ).error,
  ).not.toBeNull();
  const container = `supabase_db_${process.env.LIFE_OS_E2E_PROJECT_ID}`;
  execFileSync("docker", [
    "exec",
    container,
    "psql",
    "-X",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `delete from auth.users where id in ('${a.u}','${b.u}');`,
  ]);
});
