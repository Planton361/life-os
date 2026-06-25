# R1.6.2 – Supabase Core Schema Lock

## Status

Status: Decision lock for R1.6.2 Supabase Core Schema planning.

This document is binding input for the next migration-planning block. It does not create migrations, tables, RLS policies, Auth code, Server Actions, UI wiring, tests, dependencies, or Supabase files.

## 1. Zod Dependency Decision

Decision:

- `zod` must be added as a direct app dependency before real Server Actions are implemented.
- Do not install `zod` in this schema-lock block.
- Add it in a separate implementation block before Server Action validation is wired.

Reason:

- `ARCHITECTURE.md` and `SECURITY.md` require Zod for server-side mutations.
- R1.6.1 schema contracts are useful as temporary contracts, but they are custom validation code.
- Direct `zod` avoids relying on a transitive tooling dependency and reduces validation drift.
- Zod gives consistent `safeParse` behavior, typed inputs, field errors, and reusable Server Action error shapes.

Current dependency state:

- `zod` is not a direct dependency in `package.json`.
- Any current `zod` presence is transitive through tooling and must not be imported by app code as product dependency.

## 2. Schema Scope

R1.6.2 includes only the P0 Core tables:

- `profiles`
- `areas`
- `inbox_items`
- `tasks`
- `projects`
- `goals`
- `daily_logs`
- `daily_log_tasks`
- `resources`
- `resource_relations`

Not in R1.6.2:

- `habits`
- `habit_logs`
- `mood_checkins`
- `workouts`
- `recipes`
- `grocery_items`
- `agent_sessions`
- `skills`
- `work_logs`
- `journal_entries`
- `rewards`
- `challenges`
- settings persistence

## 3. Global Conventions

Default conventions:

- Primary keys: `uuid primary key default gen_random_uuid()`.
- Exception: `profiles.id` equals `auth.users.id` and does not use `gen_random_uuid()`.
- User ownership column: `user_id uuid not null references auth.users(id) on delete cascade`.
- `profiles` does not duplicate `user_id`; `profiles.id` is the user id.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.
- `archived_at timestamptz null` on central entities.
- Central entities use soft archive by setting `archived_at`.
- Join rows may be hard-deleted.
- Database columns use `snake_case`.
- TypeScript domain types use `camelCase`.
- Adapters map between DB `snake_case` and TypeScript `camelCase`.
- Default reads exclude rows where `archived_at is not null`, unless an explicit archive view is requested.

Implementation note:

- `updated_at` should be maintained by a trigger or repository write policy in the migration block. This lock only defines the column contract.

## 4. Enums

### `area_key`

Values:

```text
dashboard
inbox
today
calendar
portfolio
resources
health
nutrition
coding
life
education
work
shop
challenges
settings
review
system
personal
```

Decision:

- Areas are per-user rows, not global static rows.
- Default areas are seedable for each user.
- Existing `personal` remains available as compatibility/context key.
- `life` is the canonical visible product area key for Life pages.

### `inbox_item_status`

Values:

```text
raw
clarified
triaged
processed
archived
```

Decision:

- The new lifecycle names win for database storage.
- Existing UI labels/stages are adapter-level mapping only:
  - old `raw` maps to `raw`
  - old `clarify` maps to `clarified`
  - old `review` maps to `processed`
  - old `ready` maps to `processed`
- `triaged` means an output action created or linked a canonical entity, initially a Task.

### `inbox_item_type`

Values:

```text
task
note
question
idea
resource
agent
decision
```

### `task_status`

Values:

```text
inbox
planned
active
waiting
done
canceled
someday
archived
```

### `task_priority`

Values:

```text
P0
P1
P2
P3
none
```

### `task_energy`

Values:

```text
low
medium
high
```

### `project_status`

Values:

```text
idea
active
paused
blocked
completed
archived
```

### `goal_status`

Values:

```text
draft
active
paused
achieved
archived
```

### `daily_log_status`

Values:

```text
open
closed
archived
```

### `daily_log_task_relation_type`

Values:

```text
planned
completed
carried_forward
skipped
note
```

### `resource_type`

Values:

```text
note
learning
prompt
research
link
source
snippet
decision
```

### `resource_relation_target_type`

Values:

```text
inbox_item
task
project
goal
daily_log
resource
area
```

### `resource_relation_type`

Values:

```text
source
context
supports
evidence
decision
related
```

## 5. Tables

### `profiles`

Decision:

- `profiles.id` equals `auth.users.id`.
- R1.6.2 supports one canonical Life OS profile row per authenticated user.
- Future multi-profile support would require a new profile/workspace model and is not in R1.6.2.

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | none | primary key | `auth.users(id) on delete cascade` | User profile id equals auth user id. |
| `display_name` | `text` | yes | none | none | none | Human-readable local profile label. |
| `timezone` | `text` | no | none | check not empty | none | Required for Today, Calendar, Daily Log local-day logic. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |

### `areas`

Decision:

- Areas are per-user rows.
- Default rows are seedable per user after signup/profile creation.

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable area row id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `key` | `area_key` | no | none | not null | none | Stable area identity. |
| `name` | `text` | no | none | check not empty | none | Display label. |
| `color` | `text` | yes | none | none | none | Optional semantic UI token/key. |
| `sort_order` | `integer` | no | `0` | none | none | Stable ordering. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `inbox_items`

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable capture id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `area_id` | `uuid` | yes | none | same-user validated in repository | `areas(id)` | Optional context area. |
| `type` | `inbox_item_type` | no | `note` | not null | none | Capture type. |
| `status` | `inbox_item_status` | no | `raw` | not null | none | Capture lifecycle. |
| `priority` | `task_priority` | no | `P2` | not null | none | Triage/planning priority. |
| `title` | `text` | no | none | check not empty | none | Queue title. |
| `body` | `text` | yes | none | none | none | Original capture body. |
| `source` | `text` | yes | none | none | none | Capture source/context. |
| `captured_at` | `timestamptz` | no | `now()` | none | none | Capture timestamp. |
| `processed_at` | `timestamptz` | yes | none | none | none | Processing/triage timestamp. |
| `created_task_id` | `uuid` | yes | none | same-user validated in repository | `tasks(id)` | Task created by triage. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `tasks`

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable task id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `title` | `text` | no | none | check not empty | none | Primary task label. |
| `description` | `text` | yes | none | none | none | Task details. |
| `status` | `task_status` | no | `planned` | not null | none | Task lifecycle. |
| `priority` | `task_priority` | no | `P2` | not null | none | P0-P3 planning hierarchy. |
| `energy` | `task_energy` | yes | none | none | none | Energy fit for planning. |
| `area_id` | `uuid` | yes | none | same-user validated in repository | `areas(id)` | Optional area context. |
| `project_id` | `uuid` | yes | none | same-user validated in repository | `projects(id)` | Optional project relation. |
| `goal_id` | `uuid` | yes | none | same-user validated in repository | `goals(id)` | Optional goal relation. |
| `source_inbox_item_id` | `uuid` | yes | none | same-user validated in repository | `inbox_items(id)` | Triage provenance. |
| `planned_date` | `date` | yes | none | none | none | Local planning day. |
| `scheduled_start_at` | `timestamptz` | yes | none | none | none | Calendar time-grid start. |
| `duration_minutes` | `integer` | yes | none | check positive when present | none | Calendar block duration. |
| `due_at` | `timestamptz` | yes | none | none | none | Deadline, separate from planning. |
| `completed_at` | `timestamptz` | yes | none | none | none | Completion timestamp. |
| `carried_from_daily_log_id` | `uuid` | yes | none | same-user validated in repository | `daily_logs(id)` | Optional carry-forward provenance. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `projects`

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable project id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `area_id` | `uuid` | yes | none | same-user validated in repository | `areas(id)` | Optional area context. |
| `goal_id` | `uuid` | yes | none | same-user validated in repository | `goals(id)` | Optional goal relation. |
| `title` | `text` | no | none | check not empty | none | Project title. |
| `description` | `text` | yes | none | none | none | Project detail. |
| `status` | `project_status` | no | `idea` | not null | none | Project lifecycle. |
| `priority` | `task_priority` | no | `P2` | not null | none | Shared planning priority. |
| `progress` | `integer` | no | `0` | check between 0 and 100 | none | Portfolio progress. |
| `next_step` | `text` | yes | none | none | none | Current project action. |
| `start_date` | `date` | yes | none | none | none | Optional start date. |
| `target_date` | `date` | yes | none | none | none | Deadline/target date; maps from current domain `deadline`. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `goals`

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable goal id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `area_id` | `uuid` | yes | none | same-user validated in repository | `areas(id)` | Optional area context. |
| `title` | `text` | no | none | check not empty | none | Goal title. |
| `description` | `text` | yes | none | none | none | Goal detail. |
| `status` | `goal_status` | no | `draft` | not null | none | Goal lifecycle. |
| `progress` | `integer` | no | `0` | check between 0 and 100 | none | Portfolio progress. |
| `horizon` | `text` | yes | none | none | none | Current domain field; enum deferred. |
| `why` | `text` | yes | none | none | none | Goal rationale. |
| `measure` | `text` | yes | none | none | none | Success measure. |
| `target_value` | `text` | yes | none | none | none | Target metric/value. |
| `target_date` | `date` | yes | none | none | none | Optional goal date. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `daily_logs`

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable day record id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `local_date` | `date` | no | none | not null | none | User-local day. |
| `timezone` | `text` | no | none | check not empty | none | Timezone used for the local day. |
| `status` | `daily_log_status` | no | `open` | not null | none | Day record lifecycle. |
| `opening_note` | `text` | yes | none | none | none | Opening Review. |
| `closing_note` | `text` | yes | none | none | none | Closing Review. |
| `carry_forward_note` | `text` | yes | none | none | none | Carry-forward context. |
| `energy` | `task_energy` | yes | none | none | none | Day energy context. |
| `mood` | `text` | yes | none | none | none | Day mood label. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `daily_log_tasks`

Decision:

- Join rows may be hard-deleted.
- No `archived_at` is required in R1.6.2.

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable join row id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `daily_log_id` | `uuid` | no | none | not null | `daily_logs(id) on delete cascade` | Day relation. |
| `task_id` | `uuid` | no | none | not null | `tasks(id) on delete cascade` | Task relation. |
| `relation_type` | `daily_log_task_relation_type` | no | `planned` | not null | none | Planned/completed/carry-forward role. |
| `note` | `text` | yes | none | none | none | Snapshot note or carry-forward note. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |

### `resources`

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable resource id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `area_id` | `uuid` | yes | none | same-user validated in repository | `areas(id)` | Optional area context. |
| `type` | `resource_type` | no | `note` | not null | none | Resource category. |
| `title` | `text` | no | none | check not empty | none | Resource title. |
| `summary` | `text` | yes | none | none | none | Short body/summary; maps from current domain `body`. |
| `url` | `text` | yes | none | none | none | Optional external link. |
| `source` | `text` | yes | none | none | none | Capture/source context. |
| `review_needed` | `boolean` | no | `true` | not null | none | Resource triage flag. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |
| `archived_at` | `timestamptz` | yes | none | none | none | Soft archive. |

### `resource_relations`

Decision:

- Join rows may be hard-deleted.
- No `archived_at` is required in R1.6.2.
- `target_id` is intentionally polymorphic and has no database FK.

| Column | Postgres Type | Nullable | Default | Constraint | Foreign Key | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | primary key | none | Stable relation id. |
| `user_id` | `uuid` | no | none | not null | `auth.users(id) on delete cascade` | Ownership and RLS. |
| `resource_id` | `uuid` | no | none | not null | `resources(id) on delete cascade` | Source resource. |
| `target_type` | `resource_relation_target_type` | no | none | not null | none | Target entity type. |
| `target_id` | `uuid` | no | none | not null | none | Polymorphic target id. |
| `relation_type` | `resource_relation_type` | no | `related` | not null | none | Relation meaning. |
| `created_at` | `timestamptz` | no | `now()` | none | none | Audit timestamp. |

## 6. Foreign Keys

Required foreign keys:

- `profiles.id` -> `auth.users(id) on delete cascade`
- all `user_id` columns -> `auth.users(id) on delete cascade`
- `tasks.area_id` -> `areas.id`, nullable
- `tasks.project_id` -> `projects.id`, nullable
- `tasks.goal_id` -> `goals.id`, nullable
- `tasks.source_inbox_item_id` -> `inbox_items.id`, nullable
- `tasks.carried_from_daily_log_id` -> `daily_logs.id`, nullable
- `projects.area_id` -> `areas.id`, nullable
- `projects.goal_id` -> `goals.id`, nullable
- `goals.area_id` -> `areas.id`, nullable
- `inbox_items.created_task_id` -> `tasks.id`, nullable
- `daily_log_tasks.daily_log_id` -> `daily_logs.id`, not nullable
- `daily_log_tasks.task_id` -> `tasks.id`, not nullable
- `resources.area_id` -> `areas.id`, nullable
- `resource_relations.resource_id` -> `resources.id`, not nullable

Important constraints:

- FKs must not replace same-user ownership checks.
- Repository/Action code must validate that nullable relation targets belong to the same `user_id`.
- `resource_relations.target_id` has no polymorphic FK.
- Resource target ownership is enforced by Zod input validation plus repository ownership checks before insert.

Migration-order note:

- `tasks.source_inbox_item_id`, `tasks.carried_from_daily_log_id`, and `inbox_items.created_task_id` create cross-table dependencies. Migration should create tables first and add those nullable FKs after dependent tables exist.

## 7. Unique Constraints

Required constraints or partial unique indexes:

| Table | Constraint / Index | Decision |
| --- | --- | --- |
| `profiles` | primary key / unique `id` | `id` equals auth user id. |
| `areas` | unique `(user_id, key)` where `archived_at is null` | One active row per area key per user. |
| `daily_logs` | unique `(user_id, local_date)` where `archived_at is null` | One active Daily Log per user-local day. |
| `daily_log_tasks` | unique `(daily_log_id, task_id, relation_type)` | Prevent duplicate task relation rows for a day. |
| `resource_relations` | unique `(resource_id, target_type, target_id, relation_type)` | Idempotent resource linking. |

Decision:

- `daily_logs` uniqueness does not include `profile_id`, because R1.6.2 uses `profiles.id = auth.users.id` and no separate multi-profile id.

## 8. Indexes

Required indexes:

| Table | Index |
| --- | --- |
| `areas` | `(user_id)` |
| `inbox_items` | `(user_id)` |
| `inbox_items` | `(user_id, status, captured_at desc)` |
| `tasks` | `(user_id)` |
| `tasks` | `(user_id, status)` |
| `tasks` | `(user_id, planned_date)` |
| `tasks` | `(user_id, scheduled_start_at)` |
| `tasks` | `(user_id, project_id)` |
| `tasks` | `(user_id, goal_id)` |
| `tasks` | `(user_id, area_id)` |
| `projects` | `(user_id)` |
| `projects` | `(user_id, status)` |
| `projects` | `(user_id, area_id)` |
| `projects` | `(user_id, goal_id)` |
| `goals` | `(user_id)` |
| `goals` | `(user_id, status)` |
| `goals` | `(user_id, area_id)` |
| `daily_logs` | `(user_id)` |
| `daily_logs` | `(user_id, local_date)` |
| `daily_log_tasks` | `(user_id)` |
| `daily_log_tasks` | `(daily_log_id)` |
| `daily_log_tasks` | `(task_id)` |
| `resources` | `(user_id)` |
| `resources` | `(user_id, type)` |
| `resources` | `(user_id, review_needed)` |
| `resources` | `(user_id, area_id)` |
| `resource_relations` | `(user_id)` |
| `resource_relations` | `(resource_id)` |
| `resource_relations` | `(user_id, target_type, target_id)` |

All default read queries should combine these indexes with `archived_at is null` filters for central entities.

## 9. Soft Archive Rules

Central entities:

- `areas`
- `inbox_items`
- `tasks`
- `projects`
- `goals`
- `daily_logs`
- `resources`

Rules:

- Central entities use `archived_at`.
- Standard queries filter `archived_at is null`.
- App-level delete actions for central entities should become soft archive updates.
- Hard delete is not the default user-facing behavior.

Join rows:

- `daily_log_tasks`
- `resource_relations`

Decision:

- Join rows may be hard-deleted.
- Join rows do not require `archived_at` in R1.6.2.
- Delete RLS policy is allowed for join rows.

## 10. RLS Policy Pattern

Pattern for every user-owned table:

```sql
alter table <table> enable row level security;

create policy "Users can select own <table>"
on <table> for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own <table>"
on <table> for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own <table>"
on <table> for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Delete policy decision:

- For join rows, define delete policies:

```sql
create policy "Users can delete own <table>"
on <table> for delete
to authenticated
using ((select auth.uid()) = user_id);
```

- For central entities, do not expose app-level hard delete in R1.6.2.
- Central entity hard-delete policies may be omitted initially to force soft archive.
- If hard-delete policies are added for maintenance, app code still must use soft archive.

Special case `profiles`:

- Because `profiles.id = auth.users.id`, profile policies use `id` instead of `user_id`:

```sql
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id)
```

Security rules:

- Use `to authenticated`; do not use `auth.role()` checks.
- Update policies need both `using` and `with check`.
- Service Role Key is never used in client code.
- RLS does not replace repository ownership validation for polymorphic targets or same-user FK relationships.

## 11. Local Date / Timezone Contract

Rules:

- `profiles.timezone` is required.
- `tasks.planned_date` is a local date.
- `daily_logs.local_date` is a local date.
- `tasks.scheduled_start_at` is `timestamptz`.
- `tasks.due_at` is independent from planning and scheduling.
- Today calculation uses the user's profile timezone.
- Calendar time-grid placement uses `scheduled_start_at` rendered in profile timezone.
- Untimed tasks may have `planned_date` and no `scheduled_start_at`.
- Untimed tasks appear in Today and the Calendar planning queue, not in the time grid.
- App logic must not use uncontrolled `toISOString().slice(0, 10)` for local-day decisions.

## 12. Resource Relation Ownership

Rules:

- `resource_relations.user_id` must equal `resources.user_id`.
- Repository/Action code must validate that the target entity belongs to the same `user_id`.
- The database cannot enforce a polymorphic FK for `target_id`.
- RLS prevents access to other users' relation rows, but it does not automatically prevent wrong same-user or cross-table target mappings.
- Zod validation plus repository ownership checks are required before inserting `resource_relations`.

Validation matrix:

| `target_type` | Required repository check |
| --- | --- |
| `inbox_item` | Target row exists in `inbox_items` for same `user_id`. |
| `task` | Target row exists in `tasks` for same `user_id`. |
| `project` | Target row exists in `projects` for same `user_id`. |
| `goal` | Target row exists in `goals` for same `user_id`. |
| `daily_log` | Target row exists in `daily_logs` for same `user_id`. |
| `resource` | Target row exists in `resources` for same `user_id`. |
| `area` | Target row exists in `areas` for same `user_id`. |

## 13. Manual JSON Migration Contract

Rules:

- Existing Manual JSON remains the transition source until adapter migration.
- Migration must be optional and explicit.
- No automatic deletion of Manual JSON.
- Demo and Empty profiles are not migrated.
- New DB rows are canonical after import.
- JSON is only an import source after Supabase adapter activation.
- Conflicts prefer existing DB rows unless an explicit overwrite mode is approved.

Initial mapping:

| Manual JSON source | DB target |
| --- | --- |
| `tasks` | `tasks` |
| `projects` | `projects` |
| `goals` | `goals` |
| `inboxItems` | `inbox_items` |
| Dashboard habit/mood/meals | Not in R1.6.2 scope |

## 14. Explicit Non-Goals

Not in R1.6.2:

- UI connected to DB.
- Server Actions.
- Real-use E2E.
- Area-specific persistence.
- Settings persistence.
- Importing existing Manual JSON.
- Resource target ownership enforcement implementation.
- File uploads.
- Export/backup.
- Habit/mood/workout/nutrition/agent/work/journal/reward/challenge tables.
- Multi-profile/workspace schema beyond `profiles.id = auth.users.id`.

## 15. Implementation Order

Recommended order:

1. Add `zod` as direct dependency and convert schema contracts to runtime Zod schemas.
2. Create the R1.6.2 migration in the Supabase migration area.
3. Create enum types.
4. Create tables in dependency-safe order.
5. Add delayed nullable FKs with circular dependencies.
6. Add unique constraints and indexes.
7. Enable RLS and add policies.
8. Define seed/default areas.
9. Generate or update DB types if the project uses generated Supabase types.
10. Run local migration checks and RLS verification.
11. Prepare Supabase repository adapter.
12. Do not wire UI yet.

Dependency-safe table order:

1. `profiles`
2. `areas`
3. `goals`
4. `projects`
5. `daily_logs`
6. `inbox_items`
7. `tasks`
8. `daily_log_tasks`
9. `resources`
10. `resource_relations`
11. delayed nullable FKs between `tasks`, `inbox_items`, and `daily_logs`

## 16. Human Approval

Required approval before R1.6.2 migration work:

1. Add `zod` as direct app dependency?
2. Use `profiles.id = auth.users.id` for R1.6.2?
3. Use `daily_logs` unique `(user_id, local_date)` without `profile_id`?
4. Use hard delete for join rows and soft archive for central entities?
5. Use the enum naming and values in this lock?
6. Seed default `areas` per user instead of global shared rows?
7. Allow R1.6.2 to create migration files under `supabase/` after approval?

If approved, the next implementation slice is:

```text
R1.6.2B – Zod Direct Dependency & Runtime Schema Conversion
```

Then:

```text
R1.6.2C – Supabase Core Schema Migration
```
