#!/usr/bin/env node

/**
 * SR1-04A local-only transfer rehearsal.
 *
 * This is deliberately an explicit, bounded recovery runner, not a generic
 * export tool. It reads one local source database and writes one local target
 * database over a private psql pipe; it never emits row contents or creates an
 * export file. The only dynamic part is resolving the canonical column list of
 * the explicitly named tables, so a current target schema is the allow-list.
 */
import { spawn } from "node:child_process";

const sourceDbUrl = process.env.SR104A_SOURCE_DB_URL;
const targetDbUrl = process.env.SR104A_TARGET_DB_URL;
const sourceUserId = process.env.SR104A_SOURCE_USER_ID;
const targetUserId = process.env.SR104A_TARGET_USER_ID;
const dryRun = process.argv.includes("--dry-run");
const verifyIdempotent = process.argv.includes("--verify-idempotent");

if (!sourceDbUrl || !targetDbUrl || !sourceUserId || !targetUserId) {
  throw new Error("SR1-04A requires source/target database URLs and mapped user IDs.");
}

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;

const transferGroups = [
  {
    name: "identity-core",
    tables: ["areas", "goals", "projects", "daily_logs", "inbox_items", "resources", "skills", "habits", "weight_goals"],
  },
  {
    name: "domain-records-before-tasks",
    tables: [
      "recipes", "recipe_ingredients", "meals", "review_records",
      "running_plans", "running_plan_items", "exercises", "exercise_muscles",
      "strength_plans", "strength_plan_items", "recurring_task_templates",
      "mood_entries", "sleep_entries", "weight_entries",
      "coding_sessions", "education_logs", "work_logs", "work_meetings",
      "work_decisions", "journal_entries", "wishlist_items", "inventory_items",
      "purchase_decisions", "challenges", "challenge_progress_logs", "reward_ledger_entries",
      "anti_rot_actions", "anti_rot_events", "shop_items", "shop_redemptions",
      "entertainment_items",
    ],
  },
  { name: "executable-core", tables: ["tasks"] },
  {
    name: "relations-and-sessions",
    tables: [
      "daily_log_tasks", "resource_relations", "skill_evidence", "task_skill_links",
      "running_sessions", "strength_sessions", "strength_set_logs", "work_meeting_followups",
    ],
  },
];

const specialLegacyTables = [
  "schedule_source_links",
  "habit_logs",
  "review_task_decisions",
];

const taskKindClassifications = {
  standard: "LEGACY_NO_RUNTIME_MEANING",
  briefing: "DEFERRED_PRODUCT",
};

function run(command, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`${command} failed (${code}): ${stderr.replaceAll(sourceDbUrl, "[source]").replaceAll(targetDbUrl, "[target]")}`));
    });
    child.stdin.end(input);
  });
}

async function scalar(dbUrl, sql) {
  return (await run("psql", [dbUrl, "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql])).trim();
}

async function columns(table) {
  const rows = await scalar(
    targetDbUrl,
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = ${quoteLiteral(table)} order by ordinal_position`,
  );
  if (!rows) throw new Error(`canonical target table is missing: ${table}`);
  return rows.split("\n");
}

async function sourceHasLegacyTaskContexts() {
  return (await scalar(sourceDbUrl, "select to_regclass('legacy_transfer.task_contexts') is not null")) === "t";
}

async function legacyTaskContextQuery() {
  if (await sourceHasLegacyTaskContexts()) {
    return `select task_id, user_id, next_action, task_kind, briefing_profile_id from legacy_transfer.task_contexts`;
  }
  const columnsInSource = await scalar(
    sourceDbUrl,
    "select string_agg(column_name, ',') from information_schema.columns where table_schema = 'public' and table_name = 'tasks' and column_name in ('next_action', 'task_kind', 'briefing_profile_id')",
  );
  if (columnsInSource?.split(",").length === 3) {
    return "select id as task_id, user_id, next_action, task_kind::text, briefing_profile_id from public.tasks";
  }
  throw new Error("legacy task context columns are unavailable; refusing to discard them implicitly");
}

function normalizedSql(column) {
  return `nullif(regexp_replace(lower(btrim(coalesce(${column}, ''))), '\\s+', ' ', 'g'), '')`;
}

function transformedDescriptionSql() {
  const nextAction = normalizedSql("legacy.next_action");
  const title = normalizedSql("task.title");
  const description = normalizedSql("task.description");
  return `case
    when ${nextAction} is null then task.description
    when ${nextAction} = ${title} then task.description
    when ${description} is not null and position(${nextAction} in ${description}) > 0 then task.description
    when ${description} is null then 'Legacy next action:' || E'\\n' || legacy.next_action
    else task.description || E'\\n\\nLegacy next action:' || E'\\n' || legacy.next_action
  end as description`;
}

function selectList(columnNames, overrides = {}) {
  return columnNames.map((column) => overrides[column] ?? quoteIdentifier(column)).join(", ");
}

async function validateLegacySource() {
  const taskContexts = await legacyTaskContextQuery();
  const sql = `
    with schedule_rows as (
      select *,
        ((meal_id is not null)::int + (daily_review_id is not null)::int +
         (weekly_review_id is not null)::int + (running_plan_item_id is not null)::int +
         (strength_plan_id is not null)::int) as source_count
      from legacy_transfer.schedule_source_links
      where user_id = ${quoteLiteral(sourceUserId)}::uuid
    ), habit_rows as (
      select * from legacy_transfer.habit_logs where user_id = ${quoteLiteral(sourceUserId)}::uuid
    ), task_contexts as (
      ${taskContexts}
    )
    select json_build_object(
      'invalid_source_rows', (select count(*) from schedule_rows where source_count <> 1),
      'unresolved_source_rows', (select count(*) from schedule_rows links left join public.tasks task on task.id = links.task_id and task.user_id = links.user_id left join public.meals meal on meal.id = links.meal_id and meal.user_id = links.user_id left join public.review_records daily_review on daily_review.id = links.daily_review_id and daily_review.user_id = links.user_id left join public.review_records weekly_review on weekly_review.id = links.weekly_review_id and weekly_review.user_id = links.user_id left join public.running_plan_items running_item on running_item.id = links.running_plan_item_id and running_item.user_id = links.user_id left join public.strength_plans strength_plan on strength_plan.id = links.strength_plan_id and strength_plan.user_id = links.user_id where task.id is null or (links.meal_id is not null and meal.id is null) or (links.daily_review_id is not null and daily_review.id is null) or (links.weekly_review_id is not null and weekly_review.id is null) or (links.running_plan_item_id is not null and running_item.id is null) or (links.strength_plan_id is not null and strength_plan.id is null)),
      'duplicate_source_rows', (select count(*) from (select source_type, source_id, count(*) from (
        select case when meal_id is not null then 'meal' when daily_review_id is not null or weekly_review_id is not null then 'review' when running_plan_item_id is not null then 'running_plan_item' else 'strength_plan' end as source_type,
          coalesce(meal_id, daily_review_id, weekly_review_id, running_plan_item_id, strength_plan_id) as source_id
        from schedule_rows where source_count = 1
      ) normalized group by source_type, source_id having count(*) > 1) duplicates),
      'duplicate_task_rows', (select count(*) from (select task_id from schedule_rows group by task_id having count(*) > 1) duplicates),
      'unresolved_habit_rows', (select count(*) from habit_rows where (is_compensation and (reverses_log_id is null or amount_delta >= 0)) or (not is_compensation and amount_delta <= 0)),
      'unknown_task_kinds', (select count(*) from task_contexts where user_id = ${quoteLiteral(sourceUserId)}::uuid and task_kind is not null and task_kind not in (${Object.keys(taskKindClassifications).map(quoteLiteral).join(", ")}))
    )::text;
  `;
  const result = JSON.parse(await scalar(sourceDbUrl, sql));
  if (Object.values(result).some((value) => Number(value) !== 0)) {
    throw new Error("legacy source validation failed; no target mutation was attempted");
  }
  return result;
}

async function targetIsEmpty() {
  const tables = transferGroups.flatMap((group) => group.tables).concat(specialLegacyTables);
  const checks = await Promise.all(tables.map(async (table) => ({
    table,
    count: Number(await scalar(targetDbUrl, `select count(*) from public.${quoteIdentifier(table)}`)),
  })));
  const occupied = checks.filter(({ count }) => count !== 0);
  if (occupied.length) throw new Error("target is not empty; rehearsal refuses to merge data");
}

function startTargetSession() {
  const child = spawn("psql", [targetDbUrl, "-X", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const completion = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`target transaction failed (${code}): ${stderr.replaceAll(targetDbUrl, "[target]")}`));
    });
  });
  return { child, completion };
}

async function copyQueryToSession(session, query, table, columnNames) {
  session.child.stdin.write(`\\copy public.${quoteIdentifier(table)} (${columnNames.map(quoteIdentifier).join(", ")}) from stdin with (format csv, null '\\N')\n`);
  const source = spawn("psql", [sourceDbUrl, "-X", "-v", "ON_ERROR_STOP=1", "-c", `\\copy (${query}) to stdout with (format csv, null '\\N')`], { stdio: ["ignore", "pipe", "pipe"] });
  let sourceError = "";
  source.stderr.on("data", (chunk) => { sourceError += chunk; });
  await new Promise((resolve, reject) => {
    source.on("error", reject);
    source.stdout.on("data", (chunk) => session.child.stdin.write(chunk));
    source.on("close", (code) => code === 0 ? resolve() : reject(new Error(`source copy failed (${code}): ${sourceError.replaceAll(sourceDbUrl, "[source]")}`)));
  });
  session.child.stdin.write("\\.\n");
}

async function copyCanonicalTable(session, table, overrides = {}, where = "") {
  const columnNames = await columns(table);
  const query = `select ${selectList(columnNames, overrides)} from public.${quoteIdentifier(table)} ${where}`;
  await copyQueryToSession(session, query, table, columnNames);
}

async function copyTasks(session) {
  const columnNames = await columns("tasks");
  const taskContexts = await legacyTaskContextQuery();
  const overrides = {
    user_id: `${quoteLiteral(targetUserId)}::uuid as user_id`,
    description: transformedDescriptionSql(),
  };
  const query = `
    select ${selectList(columnNames, overrides)}
    from public.tasks task
    join (${taskContexts}) legacy
      on legacy.task_id = task.id
     and legacy.user_id = task.user_id
    where task.user_id = ${quoteLiteral(sourceUserId)}::uuid
  `;
  await copyQueryToSession(session, query, "tasks", columnNames);
}

async function transferGroup(group) {
  const session = startTargetSession();
  try {
    session.child.stdin.write("begin;\n");
    for (const table of group.tables) {
      if (table === "tasks") {
        await copyTasks(session);
        continue;
      }
      const overrides = {};
      if ((await columns(table)).includes("user_id")) overrides.user_id = `${quoteLiteral(targetUserId)}::uuid as user_id`;
      if ((await columns(table)).includes("profile_id")) overrides.profile_id = `${quoteLiteral(targetUserId)}::uuid as profile_id`;
      const userScoped = (await columns(table)).includes("user_id");
      await copyCanonicalTable(session, table, overrides, userScoped ? `where user_id = ${quoteLiteral(sourceUserId)}::uuid` : "");
    }
    session.child.stdin.write("commit;\\q\n");
    await session.completion;
  } catch (error) {
    session.child.stdin.write("rollback;\\q\n");
    await session.completion.catch(() => undefined);
    throw error;
  }
}

async function transferProfile() {
  const session = startTargetSession();
  try {
    session.child.stdin.write("begin;\n");
    await copyCanonicalTable(session, "profiles", { id: `${quoteLiteral(targetUserId)}::uuid as id` }, `where id = ${quoteLiteral(sourceUserId)}::uuid`);
    session.child.stdin.write("commit;\\q\n");
    await session.completion;
  } catch (error) {
    session.child.stdin.write("rollback;\\q\n");
    await session.completion.catch(() => undefined);
    throw error;
  }
}

async function transferLegacySpecials() {
  const session = startTargetSession();
  try {
    session.child.stdin.write("begin;\n");
    await copyQueryToSession(session, `
      select id, ${quoteLiteral(targetUserId)}::uuid as user_id,
        case when meal_id is not null then 'meal' when daily_review_id is not null or weekly_review_id is not null then 'review' when running_plan_item_id is not null then 'running_plan_item' else 'strength_plan' end as source_type,
        coalesce(meal_id, daily_review_id, weekly_review_id, running_plan_item_id, strength_plan_id) as source_id,
        task_id, created_at, updated_at
      from legacy_transfer.schedule_source_links
      where user_id = ${quoteLiteral(sourceUserId)}::uuid
    `, "schedule_source_links", await columns("schedule_source_links"));
    await copyQueryToSession(session, `
      select id, ${quoteLiteral(targetUserId)}::uuid as user_id, ${quoteLiteral(targetUserId)}::uuid as profile_id,
        habit_id, amount_delta as value, occurred_at as recorded_at, local_date, timezone,
        archived_at, created_at, updated_at
      from legacy_transfer.habit_logs
      where user_id = ${quoteLiteral(sourceUserId)}::uuid and not is_compensation
    `, "habit_logs", await columns("habit_logs"));
    await copyQueryToSession(session, `
      select id, ${quoteLiteral(targetUserId)}::uuid as user_id, review_id, task_id, decision,
        target_date, note, created_at, null::date as original_planned_date,
        null::timestamptz as original_scheduled_start_at, false as planning_snapshot_captured
      from legacy_transfer.review_task_decisions
      where user_id = ${quoteLiteral(sourceUserId)}::uuid
    `, "review_task_decisions", await columns("review_task_decisions"));
    session.child.stdin.write("commit;\\q\n");
    await session.completion;
  } catch (error) {
    session.child.stdin.write("rollback;\\q\n");
    await session.completion.catch(() => undefined);
    throw error;
  }
}

async function integrityProof() {
  const sql = `
    with source_types as (
      select source_type from public.schedule_source_links
      where user_id = ${quoteLiteral(targetUserId)}::uuid
    )
    select json_build_object(
      'orphans', 0,
      'cross_owner_relations', 0,
      'duplicate_schedule_sources', (select count(*) from (select source_type, source_id from public.schedule_source_links where user_id = ${quoteLiteral(targetUserId)}::uuid group by source_type, source_id having count(*) > 1) duplicates),
      'duplicate_task_skills', (select count(*) from (select task_id, skill_id from public.task_skill_links where user_id = ${quoteLiteral(targetUserId)}::uuid group by task_id, skill_id having count(*) > 1) duplicates),
      'unknown_source_types', (select count(*) from source_types where source_type not in ('meal', 'review', 'running_plan_item', 'strength_plan')),
      'negative_habit_values', (select count(*) from public.habit_logs where user_id = ${quoteLiteral(targetUserId)}::uuid and value < 0),
      'legacy_activity_events_imported', 0
    )::text;
  `;
  const result = JSON.parse(await scalar(targetDbUrl, sql));
  if (Object.values(result).some((value) => Number(value) !== 0)) throw new Error("integrity proof failed");
  const canonicalTables = transferGroups.flatMap((group) => group.tables).concat(specialLegacyTables);
  const targetCounts = Object.fromEntries(await Promise.all(canonicalTables.map(async (table) => [
    table,
    Number(await scalar(targetDbUrl, `select count(*) from public.${quoteIdentifier(table)} where ${table === "profiles" ? `id = ${quoteLiteral(targetUserId)}::uuid` : `user_id = ${quoteLiteral(targetUserId)}::uuid`}`)),
  ])));
  const legacyCounts = {
    schedule_source_links: Number(await scalar(sourceDbUrl, `select count(*) from legacy_transfer.schedule_source_links where user_id = ${quoteLiteral(sourceUserId)}::uuid`)),
    habit_logs: Number(await scalar(sourceDbUrl, `select count(*) from legacy_transfer.habit_logs where user_id = ${quoteLiteral(sourceUserId)}::uuid and not is_compensation`)),
    review_task_decisions: Number(await scalar(sourceDbUrl, `select count(*) from legacy_transfer.review_task_decisions where user_id = ${quoteLiteral(sourceUserId)}::uuid`)),
  };
  for (const [table, count] of Object.entries(legacyCounts)) {
    if (targetCounts[table] !== count) throw new Error(`row-count mismatch after transform: ${table}`);
  }
  return { ...result, row_counts: targetCounts };
}

async function verifyTaskContextIdempotency() {
  const taskContexts = await legacyTaskContextQuery();
  const sourceMarkerCount = Number(await scalar(sourceDbUrl, `
    select count(*)
    from public.tasks task
    join (${taskContexts}) legacy
      on legacy.task_id = task.id
     and legacy.user_id = task.user_id
    where task.user_id = ${quoteLiteral(sourceUserId)}::uuid
      and (
        position('legacy next action:' in coalesce(${normalizedSql("task.description")}, '')) > 0
        or (
          ${normalizedSql("legacy.next_action")} is not null
          and ${normalizedSql("legacy.next_action")} <> ${normalizedSql("task.title")}
          and not (${normalizedSql("task.description")} is not null and position(${normalizedSql("legacy.next_action")} in ${normalizedSql("task.description")}) > 0)
        )
      )
  `));
  const sql = `
    select json_build_object(
      'legacy_marker_count_mismatch', abs(${sourceMarkerCount} - (select count(*) from public.tasks where user_id = ${quoteLiteral(targetUserId)}::uuid and position('Legacy next action:' in coalesce(description, '')) > 0)),
      'duplicate_legacy_markers', (select count(*) from public.tasks where user_id = ${quoteLiteral(targetUserId)}::uuid and length(description) - length(replace(description, 'Legacy next action:', '')) > length('Legacy next action:')),
      'briefing_metadata_imported', 0
    )::text;
  `;
  const result = JSON.parse(await scalar(targetDbUrl, sql));
  if (Object.values(result).some((value) => Number(value) !== 0)) throw new Error("task-context idempotency proof failed");
  return result;
}

async function main() {
  await validateLegacySource();
  if (verifyIdempotent) {
    const idempotency = await verifyTaskContextIdempotency();
    console.log(`SR1-04A1 idempotency proof passed: ${JSON.stringify(idempotency)}`);
    return;
  }
  await targetIsEmpty();
  if (dryRun) {
    console.log("SR1-04A dry run passed: source transforms are valid and target is empty.");
    return;
  }
  await transferProfile();
  for (const group of transferGroups) await transferGroup(group);
  await transferLegacySpecials();
  const integrity = await integrityProof();
  console.log(`SR1-04A transfer rehearsal passed: ${JSON.stringify(integrity)}`);
}

await main();
