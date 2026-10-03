import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test.describe.configure({ mode: "serial" });
const migration = "supabase/migrations/20261003152858_pp2_skill_area_lock.sql";

test("PP2 Area lock: fresh stack and transactional upgrade preserve lock-only authority", async () => {
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  const sql = readFileSync(
    "tests/supabase/pp2-skill-area-lock.sql",
    "utf8",
  ).replace("-- APPLY_FORWARD_MIGRATION", readFileSync(migration, "utf8"));
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      `supabase_db_${process.env.LIFE_OS_E2E_PROJECT_ID}`,
      "psql",
      "-X",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql, stdio: ["pipe", "inherit", "inherit"] },
  );
  execFileSync(
    "node",
    [
      "tests/supabase/pp2-skill-area-concurrency.mjs",
      `supabase_db_${process.env.LIFE_OS_E2E_PROJECT_ID}`,
    ],
    { stdio: "inherit" },
  );
});

test("PP2 Area forward migration applies through the local CLI upgrade path", async () => {
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  const container = `supabase_db_${process.env.LIFE_OS_E2E_PROJECT_ID}`;
  const sql = (query: string) =>
    execFileSync(
      "docker",
      [
        "exec",
        container,
        "psql",
        "-X",
        "-qAt",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        query,
      ],
      { encoding: "utf8" },
    ).trim();
  const before = sql(
    "select relacl::text from pg_class where oid='public.areas'::regclass",
  );
  expect(
    sql(
      "select count(*) from supabase_migrations.schema_migrations where version='20261003152858'",
    ),
  ).toBe("1");
  // Reconstruct the exact pre-repair schema/history in this disposable fixture.
  // The transactional proof above reproduces its failure and tests ACL/policy parity.
  sql(
    "begin;drop policy skill_command_area_lock on public.areas;delete from supabase_migrations.schema_migrations where version='20261003152858';commit;",
  );
  execFileSync(
    "pnpm",
    [
      "exec",
      "supabase",
      "migration",
      "up",
      "--local",
      "--workdir",
      process.env.LIFE_OS_E2E_WORKDIR!,
    ],
    { stdio: "inherit" },
  );
  expect(
    sql(
      "select count(*) from supabase_migrations.schema_migrations where version='20261003152858'",
    ),
  ).toBe("1");
  expect(
    sql(
      "select count(*) from pg_policy where polrelid='public.areas'::regclass and polname='skill_command_area_lock'",
    ),
  ).toBe("1");
  expect(
    sql("select relacl::text from pg_class where oid='public.areas'::regclass"),
  ).toBe(before);
});

test("PP2 Area command Data API: create, switch, resume, DENY and noLeak", async () => {
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(new URL(url).hostname).toBe("127.0.0.1");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  async function owner() {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const id = crypto.randomUUID();
    const signed = await client.auth.signUp({
      email: `area-${id}@example.test`,
      password: `Proof-${id}`,
    });
    expect(signed.error).toBeNull();
    return { client, user: signed.data.user!.id };
  }
  const a = await owner(),
    b = await owner();
  async function area(o: typeof a, areaKey: string, archived = false) {
    const result = await o.client
      .from("areas")
      .insert({
        user_id: o.user,
        key: areaKey,
        name: `Area ${crypto.randomUUID()}`,
        archived_at: archived ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    expect(result.error).toBeNull();
    return result.data!.id;
  }
  const own = await area(a, "coding"),
    other = await area(a, "education"),
    archived = await area(a, "work", true),
    foreign = await area(b, "coding");
  const command = (
    skill: string | null,
    revision: number | null,
    operation: string,
    payload: Record<string, string>,
  ) =>
    a.client.rpc("skill_development_command", {
      p_skill_id: skill,
      p_command_id: crypto.randomUUID(),
      p_operation: operation,
      p_expected_revision: revision,
      p_payload: payload,
    });
  const created = await command(null, null, "skill.create", {
    name: "RPC Area proof",
    area_id: own,
  });
  expect(created.error).toBeNull();
  const skill = created.data.skill_id;
  expect(
    (
      await command(skill, 0, "skill.edit", {
        area_id: other,
        status: "paused",
      })
    ).error,
  ).toBeNull();
  expect(
    (await command(skill, 1, "skill.edit", { status: "active" })).error,
  ).toBeNull();
  expect(
    (await command(skill, 2, "skill.edit", { summary: "Retained Area" })).error,
  ).toBeNull();
  const before = await a.client.rpc("skill_development_read", {
    p_skill_id: skill,
  });
  expect(before.error).toBeNull();
  expect(before.data.skill).toMatchObject({
    area_id: other,
    status: "active",
    development_revision: 3,
  });
  for (const bad of [foreign, archived, crypto.randomUUID(), "invalid-area"]) {
    for (const operation of ["skill.create", "skill.edit"]) {
      const denied = await command(
        operation === "skill.create" ? null : skill,
        operation === "skill.create" ? null : 3,
        operation,
        { name: "Denied", area_id: bad },
      );
      expect(denied.error?.code).toBe(
        bad === "invalid-area" ? "22P02" : "42501",
      );
      if (bad !== "invalid-area")
        expect(denied.error?.message).toBe("SKILL_AREA_UNAVAILABLE");
    }
  }
  const after = await a.client.rpc("skill_development_read", {
    p_skill_id: skill,
  });
  expect(after.error).toBeNull();
  expect({ ...after.data, as_of: before.data.as_of }).toEqual(before.data);
  expect(
    (await b.client.rpc("skill_development_read", { p_skill_id: skill })).data,
  ).toBeNull();
  expect(
    (await b.client.from("skills").select("id").eq("id", skill)).data,
  ).toEqual([]);
  expect(
    (await a.client.from("areas").select("id").eq("id", foreign)).data,
  ).toEqual([]);
  expect(
    (await a.client.from("skills").update({ name: "Bypass" }).eq("id", skill))
      .error?.code,
  ).toBe("42501");
  const anon = createClient(url, key, { auth: { persistSession: false } });
  expect(
    (await anon.rpc("skill_development_read", { p_skill_id: skill })).error
      ?.code,
  ).toBe("42501");
});

test("PP2 existing Skill Area controls create, switch, pause/resume and reload", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "pp2-area", stamp);
  // Only synthetic Area fixtures; every Skill write below uses the real UI/command.
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
    `insert into public.areas(user_id,key,name) select id,'coding','Area A ${stamp}' from auth.users where email='pp2-area-${stamp}@example.local';
     insert into public.areas(user_id,key,name) select id,'education','Area B ${stamp}' from auth.users where email='pp2-area-${stamp}@example.local';`,
  ]);
  await page.goto("/skills/new");
  const create = page.getByRole("form", {
    name: "Skill erstellen",
    exact: true,
  });
  const name = `PP2 Area ${stamp}`;
  await create.getByLabel("Name", { exact: true }).fill(name);
  await create
    .getByLabel("Area", { exact: true })
    .selectOption({ label: `Area A ${stamp}` });
  await create
    .getByRole("button", { name: "Skill erstellen", exact: true })
    .click();
  const work = page.locator("[data-skill-development]");
  await expect(work.getByRole("heading", { level: 1 })).toHaveText(name);
  await page.reload();
  await expect(work.locator("header").first()).toContainText(
    `Aktiv · Area A ${stamp}`,
  );
  async function edit(area: string, status: string) {
    const management = work
      .locator("details")
      .filter({ has: page.locator('summary:text-is("Skill verwalten")') });
    await management.locator("summary").click();
    const form = management.getByRole("form", {
      name: "Skill speichern",
      exact: true,
    });
    await form
      .getByLabel("Area", { exact: true })
      .selectOption({ label: area });
    await form.getByLabel("Status", { exact: true }).selectOption(status);
    await form
      .getByRole("button", { name: "Skill speichern", exact: true })
      .click();
    await expect(form.getByRole("status")).toHaveText("Skill gespeichert.");
    await page.reload();
    await expect(work.locator("header").first()).toContainText(
      `${status === "paused" ? "Pausiert" : "Aktiv"} · ${area}`,
    );
    await management.locator("summary").click();
    await expect(
      management.getByLabel("Area", { exact: true }).locator("option:checked"),
    ).toHaveText(area);
    await management.locator("summary").click();
  }
  await edit(`Area B ${stamp}`, "paused");
  await edit(`Area B ${stamp}`, "active");
  expect(errors).toEqual([]);
});
