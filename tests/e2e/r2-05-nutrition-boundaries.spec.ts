import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "@/types/supabase";
function client() {
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Disposable only");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
test("Nutrition plan transactions enforce ownership, stale/occupied targets, rollback and source-linked identity", async () => {
  const db = client(),
    other = client(),
    anonymous = client();
  const stamp = Date.now();
  const signup = async (api: ReturnType<typeof client>, suffix: string) => {
    const r = await api.auth.signUp({
      email: `nutrition-boundary-${stamp}-${suffix}@example.test`,
      password: `Nutrition-${stamp}!`,
    });
    expect(r.error).toBeNull();
    const user = r.data.user!.id;
    expect(
      (
        await api
          .from("profiles")
          .upsert({ id: user, timezone: "Europe/Berlin" })
      ).error,
    ).toBeNull();
    return user;
  };
  const user = await signup(db, "owner");
  await signup(other, "other");
  const recipe = await db
    .from("recipes")
    .insert({ user_id: user, title: "Boundary recipe", servings: 1 })
    .select("id")
    .single();
  expect(recipe.error).toBeNull();
  const recipeId = recipe.data!.id;
  const id = crypto.randomUUID();
  const assign = {
    kind: "assign",
    id,
    recipeId,
    date: "2026-09-07",
    mealType: "breakfast",
  };
  expect(
    (await anonymous.rpc("apply_nutrition_plan", { p_operations: [assign] }))
      .error,
  ).not.toBeNull();
  expect(
    (await other.rpc("apply_nutrition_plan", { p_operations: [assign] })).error,
  ).not.toBeNull();
  expect(
    (await db.rpc("apply_nutrition_plan", { p_operations: [assign] })).error,
  ).toBeNull();
  const load = async () => {
    const r = await db.from("meals").select("*").eq("id", id).single();
    expect(r.error).toBeNull();
    return r.data!;
  };
  let meal = await load();
  const move = {
    kind: "move",
    id,
    expectedUpdatedAt: meal.updated_at,
    date: "2026-09-08",
    mealType: "lunch",
  };
  expect(
    (await other.rpc("apply_nutrition_plan", { p_operations: [move] })).error,
  ).not.toBeNull();
  expect(
    (
      await db.rpc("apply_nutrition_plan", {
        p_operations: [{ ...move, expectedUpdatedAt: "2020-01-01T00:00:00Z" }],
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await db.rpc("apply_nutrition_plan", {
        p_operations: [{ ...move, kind: null }],
      })
    ).error,
  ).not.toBeNull();
  const occupied = crypto.randomUUID();
  expect(
    (
      await db.rpc("apply_nutrition_plan", {
        p_operations: [
          { ...assign, id: occupied, date: "2026-09-08", mealType: "lunch" },
        ],
      })
    ).error,
  ).toBeNull();
  expect(
    (await db.rpc("apply_nutrition_plan", { p_operations: [move] })).error
      ?.message,
  ).toContain("occupied slot");
  // All assignments roll back if a later slot is occupied.
  const rollbackId = crypto.randomUUID();
  expect(
    (
      await db.rpc("apply_nutrition_plan", {
        p_operations: [
          { ...assign, id: rollbackId, date: "2026-09-09" },
          { ...assign, id: crypto.randomUUID() },
        ],
      })
    ).error,
  ).not.toBeNull();
  expect(
    (await db.from("meals").select("id").eq("id", rollbackId)).data,
  ).toEqual([]);
  // Simultaneous assignments serialize: only one can occupy an empty slot.
  const results = await Promise.all(
    [1, 2].map(() =>
      db.rpc("apply_nutrition_plan", {
        p_operations: [
          { ...assign, id: crypto.randomUUID(), date: "2026-09-10" },
        ],
      }),
    ),
  );
  expect(results.filter((r) => !r.error)).toHaveLength(1);
  const scheduled = await db.rpc("schedule_linked_source", {
    p_source_type: "meal",
    p_source_id: id,
    p_planned_date: "2026-09-07",
    p_scheduled_start_at: "2026-09-07T06:00:00Z",
    p_duration_minutes: 30,
  });
  expect(scheduled.error).toBeNull();
  meal = await load();
  expect(
    (
      await db.rpc("apply_nutrition_plan", {
        p_operations: [
          {
            ...move,
            expectedUpdatedAt: meal.updated_at,
            date: "2026-10-27",
            mealType: "dinner",
          },
        ],
      })
    ).error,
  ).toBeNull();
  meal = await load();
  expect(meal.id).toBe(id);
  expect(meal.date).toBe("2026-10-27");
  expect(meal.meal_type).toBe("dinner");
  expect(meal.planned_at).toBe("2026-10-27T07:00:00+00:00");
  const links = await db
    .from("schedule_source_links")
    .select("task_id")
    .eq("source_id", id);
  expect(links.data).toHaveLength(1);
  const taskId = links.data![0].task_id;
  const task = await db
    .from("tasks")
    .select("planned_date,scheduled_start_at")
    .eq("id", taskId)
    .single();
  expect(task.data?.planned_date).toBe(meal.date);
  expect(task.data?.scheduled_start_at).toBe(meal.planned_at);
  expect(
    (
      await db.rpc("apply_nutrition_plan", {
        p_operations: [
          { kind: "remove", id, expectedUpdatedAt: meal.updated_at },
        ],
      })
    ).error,
  ).toBeNull();
  expect((await db.from("meals").select("id").eq("id", id)).data).toEqual([]);
  expect(
    (await db.from("tasks").select("status").eq("id", taskId).single()).data
      ?.status,
  ).toBe("archived");
  expect(
    (
      await db
        .from("schedule_source_links")
        .select("task_id")
        .eq("source_id", id)
    ).data,
  ).toEqual([]);
  await db.auth.signOut();
  await other.auth.signOut();
});
test("Nutrition migration chain lint and security advisors", async ({}, info) => {
  test.setTimeout(120000);
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE" || !process.env.TMPDIR)
    throw new Error("Disposable only");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  for (const [name, args] of [
    ["lint", ["--level", "warning"]],
    [
      "advisors",
      ["--type", "security", "--level", "warn", "--fail-on", "none"],
    ],
  ] as const) {
    const r = await exec(
      "pnpm",
      [
        "exec",
        "supabase",
        "db",
        name,
        "--local",
        "--workdir",
        process.env.TMPDIR,
        ...args,
      ],
      { timeout: 60000 },
    );
    await info.attach(`db-${name}`, {
      body: r.stdout + r.stderr,
      contentType: "text/plain",
    });
  }
});
