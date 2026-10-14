import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { compileRuntime } from "../sqlite/compile-runtime.mjs";

// Real shared mapper/repository/RPC and profile read, using PostgreSQL's
// authenticated role + auth.uid(), never the administrative role for writes.
export async function proveTaskCreateDeadlinePostgres({ database, sql }) {
  const compiled = compileRuntime([
    "src/features/real-data/supabase/repositories/supabase-task-repository.ts",
    "src/features/real-data/supabase/repositories/supabase-goal-outcome-repository.ts",
    "src/features/real-data/runtime/supabase-adapter.ts",
    "src/features/real-data/domain/task-deadline.ts",
  ]);
  const require = createRequire(import.meta.url);
  const native = (file) =>
    require(
      join(compiled, "dependencies/src/features/real-data", file + ".js"),
    );
  const { taskDeadlineEndOfDay, taskDeadlineLocalDay } = native(
    "domain/task-deadline",
  );
  const { createSupabaseTaskRepository } = native(
    "supabase/repositories/supabase-task-repository",
  );
  const { createGoalContextTask } = native(
    "supabase/repositories/supabase-goal-outcome-repository",
  );
  const { supabaseApplicationReads } = native("runtime/supabase-adapter");
  const owner = randomUUID(),
    other = randomUUID(),
    goal = randomUUID(),
    stage = randomUUID();
  const literal = (v) =>
    v === null
      ? "NULL"
      : typeof v === "number"
        ? String(v)
        : "'" + String(v).replaceAll("'", "''") + "'";
  const identifier = (v) => {
    assert.match(v, /^[a-z_]+$/);
    return '"' + v + '"';
  };
  const actorSql = (statement, actor = owner) =>
    sql(
      database,
      "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub'," +
        literal(actor) +
        ",true); " +
        statement +
        "; COMMIT;",
    )
      .trim()
      .split("\n")
      .at(-1);
  const json = (statement, actor) => JSON.parse(actorSql(statement, actor));
  sql(
    database,
    "INSERT INTO auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES " +
      [owner, other]
        .map(
          (u) =>
            "(" +
            [
              u,
              u,
              "authenticated",
              "authenticated",
              u + "@example.test",
              "{}",
              "{}",
            ]
              .map(literal)
              .join(",") +
            ",now(),now())",
        )
        .join(",") +
      ";" +
      "INSERT INTO public.profiles(id,display_name,timezone) VALUES(" +
      [owner, "158 owner", "Europe/Berlin"].map(literal).join(",") +
      "),(" +
      [other, "158 other", "Europe/Berlin"].map(literal).join(",") +
      ");" +
      "INSERT INTO public.goals(id,user_id,title,status) VALUES(" +
      [goal, owner, "158 goal", "active"].map(literal).join(",") +
      ");" +
      "INSERT INTO public.goal_milestones(id,user_id,goal_id,title,status,sort_order) VALUES(" +
      [stage, owner, goal, "158 stage", "active", 0].map(literal).join(",") +
      ");",
  );
  class Query {
    constructor(table) {
      this.table = identifier(table);
      this.filters = [];
    }
    select() {
      return this;
    }
    eq(key, v) {
      this.filters.push(identifier(key) + "=" + literal(v));
      return this;
    }
    is(key, v) {
      assert.equal(v, null);
      this.filters.push(identifier(key) + " IS NULL");
      return this;
    }
    insert(data) {
      this.data = data;
      return this;
    }
    async execute(single) {
      try {
        const where = this.filters.length ? this.filters.join(" AND ") : "true";
        const statement = this.data
          ? "INSERT INTO public." +
            this.table +
            "(" +
            Object.keys(this.data).map(identifier).join(",") +
            ") VALUES(" +
            Object.values(this.data).map(literal).join(",") +
            ") RETURNING *"
          : "SELECT * FROM public." + this.table + " WHERE " + where;
        const rows = json(
          "WITH rows AS (" +
            statement +
            ") SELECT coalesce(json_agg(rows),'[]'::json) FROM rows",
        );
        if (single === true && rows.length !== 1)
          return {
            data: null,
            error: { code: "PGRST116", message: "Expected one row" },
          };
        return { data: single ? (rows[0] ?? null) : rows, error: null };
      } catch (e) {
        return { data: null, error: { code: "42501", message: String(e) } };
      }
    }
    maybeSingle() {
      return this.execute("maybe");
    }
    single() {
      return this.execute(true);
    }
    then(resolve, reject) {
      return this.execute(false).then(resolve, reject);
    }
  }
  const client = {
    from: (table) => new Query(table),
    rpc: async (name, args) => {
      assert.equal(name, "create_goal_milestone_task");
      try {
        const data = json(
          "SELECT public.create_goal_milestone_task(" +
            literal(args.p_command_id) +
            "::uuid," +
            literal(args.p_request_fingerprint) +
            "," +
            literal(JSON.stringify(args.p_payload)) +
            "::jsonb)",
        );
        return { data, error: null };
      } catch (e) {
        return { data: null, error: { message: String(e) } };
      }
    },
  };
  const repo = createSupabaseTaskRepository(client),
    reads = supabaseApplicationReads(client, owner),
    evidence = [];
  const row = (id, actor = owner) =>
    json(
      "SELECT coalesce((SELECT row_to_json(t) FROM public.tasks t WHERE id=" +
        literal(id) +
        "),'null'::json)",
      actor,
    );
  const cases = [
    ["Europe/Berlin", "2026-10-12"],
    ["Europe/Berlin", "2026-01-31"],
    ["Europe/Berlin", "2026-03-28"],
    ["Europe/Berlin", "2026-03-29"],
    ["Europe/Berlin", "2026-10-24"],
    ["Europe/Berlin", "2026-10-25"],
    ["Europe/Berlin", "2026-12-31"],
    ["America/Los_Angeles", "2026-03-08"],
    ["America/Los_Angeles", "2026-11-01"],
    ["America/Los_Angeles", "2026-12-31"],
    ["Asia/Tokyo", "2027-01-01"],
    ["Pacific/Auckland", "2026-09-27"],
  ];
  for (const [zone, day] of cases) {
    actorSql(
      "UPDATE public.profiles SET timezone=" +
        literal(zone) +
        " WHERE id=auth.uid()",
    );
    const actualZone = await reads.profileTimezone();
    assert.equal(actualZone, zone);
    const dueAt = taskDeadlineEndOfDay(day, actualZone);
    const expected = json(
      "SELECT to_json(extract(epoch from ((" +
        literal(day) +
        "::date+time '23:59:59') AT TIME ZONE " +
        literal(zone) +
        ")))",
    );
    for (const contextual of [false, true]) {
      const input = {
        userId: owner,
        profileId: owner,
        title: "158 " + zone + " " + day + " " + randomUUID(),
        dueAt,
        status: "planned",
      };
      const result = contextual
        ? await createGoalContextTask(client, {
            ...input,
            goalId: goal,
            milestoneId: stage,
            commandId: randomUUID(),
          })
        : await repo.createTask(input);
      assert.equal(result.ok, true, JSON.stringify(result));
      const stored = row(result.data.id);
      assert.equal(Date.parse(stored.due_at) / 1000, Number(expected));
      assert.equal(taskDeadlineLocalDay(stored.due_at, actualZone), day);
      assert.equal(stored.planned_date, null);
      assert.equal(stored.scheduled_start_at, null);
      assert.equal(stored.status, "planned");
      assert.equal(
        row(result.data.id, other),
        null,
        "Real RLS hides another owner's created Task",
      );
      if (contextual)
        assert.equal(
          json(
            "SELECT count(*) FROM public.goal_milestone_task_support WHERE task_id=" +
              literal(result.data.id),
          ),
          1,
        );
      evidence.push({
        path: contextual ? "Goal RPC" : "Task repository",
        zone,
        day,
        actual: stored.due_at,
        expectedEpoch: Number(expected),
        localDay: day,
      });
    }
  }
  const before = json(
    "SELECT json_build_object('tasks',(SELECT count(*) FROM public.tasks WHERE user_id=auth.uid()),'receipts',(SELECT count(*) FROM public.goal_command_receipts WHERE user_id=auth.uid()),'supports',(SELECT count(*) FROM public.goal_milestone_task_support WHERE user_id=auth.uid()))",
  );
  assert.equal(
    (
      await repo.createTask({
        userId: owner,
        profileId: other,
        title: "158 forged scope",
        dueAt: "2026-10-12T21:59:59Z",
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await repo.createTask({
        userId: other,
        profileId: other,
        title: "158 forged owner",
        dueAt: "2026-10-12T21:59:59Z",
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await createGoalContextTask(client, {
        userId: owner,
        goalId: goal,
        milestoneId: randomUUID(),
        title: "158 wrong stage",
        commandId: randomUUID(),
      })
    ).ok,
    false,
  );
  const after = json(
    "SELECT json_build_object('tasks',(SELECT count(*) FROM public.tasks WHERE user_id=auth.uid()),'receipts',(SELECT count(*) FROM public.goal_command_receipts WHERE user_id=auth.uid()),'supports',(SELECT count(*) FROM public.goal_milestone_task_support WHERE user_id=auth.uid()))",
  );
  assert.deepEqual(after, before);
  const noDeadline = await repo.createTask({
    userId: owner,
    profileId: owner,
    title: "158 no deadline",
    status: "planned",
  });
  assert.equal(noDeadline.ok, true);
  assert.equal(row(noDeadline.data.id).due_at, null);
  // PostgreSQL's real RLS with a missing/hidden profile must not invent Berlin.
  const hiddenReads = supabaseApplicationReads(client, other);
  await assert.rejects(
    hiddenReads.profileTimezone(),
    /Profile timezone unavailable/,
  );
  return {
    status: "PASS",
    matrix: evidence,
    guards:
      "authenticated owner/RLS, wrong-owner scope, wrong Goal stage rollback, no deadline, hidden-profile fail-closed",
  };
}
