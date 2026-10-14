import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { compileRuntime } from "../sqlite/compile-runtime.mjs";

// Execute the real shared deadline mapper and Supabase repository against the
// runner's fully migrated PostgreSQL. The SQL transport models PostgREST's
// query interface, without a privileged client or a remote API/database.
export async function proveTaskDeadlinePostgres({ database, sql }) {
  const compiled = compileRuntime([
    "src/features/real-data/supabase/repositories/supabase-task-repository.ts",
    "src/features/real-data/domain/task-deadline.ts",
  ]);
  const require = createRequire(import.meta.url);
  const { taskDeadlinePatch, taskDeadlineLocalDay } = require(
    join(
      compiled,
      "dependencies/src/features/real-data/domain/task-deadline.js",
    ),
  );
  const { createSupabaseTaskRepository } = require(
    join(
      compiled,
      "dependencies/src/features/real-data/supabase/repositories/supabase-task-repository.js",
    ),
  );
  const owner = randomUUID(),
    other = randomUUID(),
    id = randomUUID(),
    foreign = randomUUID();
  const literal = (value) =>
    value === null
      ? "NULL"
      : typeof value === "number"
        ? String(value)
        : "'" + String(value).replaceAll("'", "''") + "'";
  const identifier = (value) => {
    assert.match(value, /^[a-z_]+$/);
    return `"${value}"`;
  };
  const actorSql = (statement, actor = owner) =>
    sql(
      database,
      `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',${literal(actor)},true); ${statement}; COMMIT;`,
    )
      .trim()
      .split("\n")
      .at(-1);
  sql(
    database,
    `INSERT INTO auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES ${[owner, other].map((u) => `(${literal(u)},${literal(u)},'authenticated','authenticated',${literal(u + "@example.test")},'{}','{}',now(),now())`).join(",")};
    INSERT INTO public.profiles(id,display_name,timezone) VALUES(${literal(owner)},'155 owner','Europe/Berlin'),(${literal(other)},'155 other','Europe/Berlin');
    INSERT INTO public.tasks(id,user_id,title,status,due_at,planned_date,scheduled_start_at,duration_minutes) VALUES(${literal(id)},${literal(owner)},'155 historical','planned','2026-10-12T23:59:59.123456Z','2026-10-10','2026-10-10T10:00:00.654321Z',17),(${literal(foreign)},${literal(other)},'155 foreign','planned',null,null,null,null);`,
  );
  const captured = [],
    evidence = [];
  let race;
  class Query {
    constructor(table) {
      this.table = identifier(table);
      this.filters = [];
    }
    select() {
      return this;
    }
    eq(key, value) {
      this.filters.push(`${identifier(key)}=${literal(value)}`);
      return this;
    }
    is(key, value) {
      assert.equal(value, null);
      this.filters.push(`${identifier(key)} IS NULL`);
      return this;
    }
    update(patch) {
      this.patch = patch;
      captured.push(patch);
      return this;
    }
    async execute(single) {
      try {
        const where = this.filters.length ? this.filters.join(" AND ") : "true";
        let statement = `SELECT * FROM public.${this.table} WHERE ${where}`;
        if (this.patch) {
          if (race) {
            const inject = race;
            race = undefined;
            inject();
          }
          statement = `UPDATE public.${this.table} SET ${Object.entries(
            this.patch,
          )
            .map(([k, v]) => `${identifier(k)}=${literal(v)}`)
            .join(",")} WHERE ${where} RETURNING *`;
        }
        const rows = JSON.parse(
          actorSql(
            `WITH rows AS (${statement}) SELECT coalesce(json_agg(rows),'[]'::json) FROM rows`,
          ),
        );
        return single === true && rows.length !== 1
          ? {
              data: null,
              error: { code: "PGRST116", message: "Expected one row" },
            }
          : { data: single ? (rows[0] ?? null) : rows, error: null };
      } catch (error) {
        return { data: null, error: { code: "42501", message: String(error) } };
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
  const repo = createSupabaseTaskRepository({
    from: (table) => new Query(table),
  });
  const row = (target) =>
    JSON.parse(
      actorSql(
        `SELECT row_to_json(t) FROM public.tasks t WHERE id=${literal(target)}`,
      ),
    );
  const zone = () =>
    JSON.parse(
      actorSql(
        "SELECT to_json(timezone) FROM public.profiles WHERE id=auth.uid()",
      ),
    );
  async function edit(target, submitted, title = "155 title edit") {
    const current = row(target);
    const patch = taskDeadlinePatch(submitted, current.due_at, zone());
    return repo.updateTask({
      userId: owner,
      profileId: owner,
      taskId: target,
      expectedUpdatedAt: current.updated_at,
      title,
      ...patch,
    });
  }
  const original = row(id);
  assert.equal((await edit(id, "2026-10-13")).ok, true);
  assert.equal(row(id).due_at, original.due_at);
  assert.ok(!Object.hasOwn(captured.at(-1), "due_at"));
  for (const key of [
    "planned_date",
    "scheduled_start_at",
    "duration_minutes",
    "status",
    "project_id",
    "goal_id",
  ])
    assert.equal(row(id)[key], original[key]);
  assert.equal((await edit(id, undefined)).ok, true);
  assert.equal(row(id).due_at, original.due_at);
  assert.equal((await edit(id, "")).ok, true);
  assert.equal(row(id).due_at, null);
  const cases = [
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
  for (const [profileZone, day] of cases) {
    actorSql(
      `UPDATE public.profiles SET timezone=${literal(profileZone)} WHERE id=auth.uid()`,
    );
    // An old instant may land on this day after a profile-zone change. That is
    // correctly a no-op; each end-of-day oracle case therefore adds from null.
    assert.equal((await edit(id, "", "155 matrix explicit clear")).ok, true);
    assert.equal((await edit(id, day, `155 ${profileZone} ${day}`)).ok, true);
    const current = row(id);
    assert.equal(taskDeadlineLocalDay(current.due_at, profileZone), day);
    assert.equal(
      actorSql(
        `SELECT (due_at=(${literal(day)}::date+time '23:59:59') AT TIME ZONE ${literal(profileZone)})::text FROM public.tasks WHERE id=${literal(id)}`,
      ),
      "true",
      JSON.stringify({ profileZone, day, dueAt: current.due_at }),
    );
    assert.equal((await edit(id, day)).ok, true);
    assert.ok(!Object.hasOwn(captured.at(-1), "due_at"));
    assert.equal(row(id).due_at, current.due_at);
    evidence.push({
      profileZone,
      day,
      status: "PASS_JS_REPOSITORY_AND_POSTGRES_ORACLE",
    });
  }
  const prior = row(id);
  assert.equal(
    (
      await repo.updateTask({
        userId: owner,
        profileId: owner,
        taskId: id,
        title: "stale",
        expectedUpdatedAt: original.updated_at,
        dueAt: null,
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await repo.updateTask({
        userId: owner,
        profileId: owner,
        taskId: foreign,
        title: "foreign",
        dueAt: null,
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await repo.updateTask({
        userId: owner,
        profileId: other,
        taskId: id,
        title: "bad profile",
        dueAt: null,
      })
    ).ok,
    false,
  );
  assert.deepEqual(row(id), prior);
  // Source-owned metadata no-op retains due_at; its final UPDATE keeps CAS too.
  const meal = randomUUID(),
    source = randomUUID();
  sql(
    database,
    `INSERT INTO public.meals(id,user_id,date,meal_type,title) VALUES(${literal(meal)},${literal(owner)},'2026-10-12','lunch','155 source'); INSERT INTO public.tasks(id,user_id,title,status,due_at) VALUES(${literal(source)},${literal(owner)},'155 source task','planned','2026-10-12T23:59:59.123456Z'); INSERT INTO public.schedule_source_links(user_id,task_id,source_type,source_id) VALUES(${literal(owner)},${literal(source)},'meal',${literal(meal)});`,
  );
  assert.equal((await edit(source, undefined)).ok, true);
  const sourceBefore = row(source);
  race = () =>
    actorSql(
      `UPDATE public.tasks SET title='155 competing source edit' WHERE id=${literal(source)}`,
    );
  const staleSource = await repo.updateTask({
    userId: owner,
    profileId: owner,
    taskId: source,
    title: "155 stale source metadata",
    expectedUpdatedAt: sourceBefore.updated_at,
  });
  assert.equal(staleSource.ok, false);
  assert.equal(row(source).title, "155 competing source edit");
  assert.equal(row(source).due_at, sourceBefore.due_at);
  assert.equal(
    (
      await repo.updateTask({
        userId: owner,
        profileId: owner,
        taskId: source,
        plannedDate: "2026-10-13",
      })
    ).ok,
    false,
  );
  evidence.push({
    name: "microseconds / omitted-key / clear / foreign RLS / profile / stale / source CAS and scheduling guards",
    status: "PASS",
  });
  // Same data remains visible after opening a new psql connection on every read.
  assert.equal(row(id).due_at, prior.due_at);
  console.log(
    "PASS #155 actual Supabase repository → authenticated PostgreSQL + timezone oracle",
  );
  return evidence;
}
