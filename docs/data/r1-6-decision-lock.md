# R1.6 – Real Data Decision Lock

## Status

Decision Lock for R1.6 implementation.

This file turns the R1.6A discovery report into the binding decisions for the next implementation slice. It is documentation only: no Supabase migrations, tables, RLS policies, Auth work, app code, tests, or UI changes are part of this lock.

## 1. Canonical Store Decision

- Supabase Postgres becomes the canonical store for real Manual data.
- Demo remains a fixture-backed adapter.
- Empty remains a synthetic empty adapter.
- Manual moves step by step from JSON/local/session stores to repository-backed persistence.
- R1.6.1 does not implement Supabase tables, migrations, Auth, or RLS.

## 2. Profile Data Adapter Decision

Final adapter routing:

```text
demo   -> demo fixture adapter
empty  -> empty adapter
manual -> repository adapter
```

Migration routing:

```text
manual -> repository interface -> manual-json adapter -> supabase adapter
```

Rules:

- ViewModels do not read directly from random stores.
- Page Components do not know the data source.
- Profile selection chooses the adapter; layout does not.

## 3. P0 Entities

P0 for R1.6:

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

Not P0, later layers:

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

## 4. Task Scheduling Contract

- `planned_date`: local calendar day for Today and planning.
- `scheduled_start_at`: concrete timestamp for a Calendar block.
- `duration_minutes`: planned block duration.
- `due_at`: deadline, independent from planning and scheduling.
- `completed_at`: completion timestamp.
- `timezone`: profile/user timezone used for local-day calculations.
- Untimed tasks can have `planned_date`, have no `scheduled_start_at`, appear in Today and the Calendar planning queue, and do not appear in the Calendar time grid.
- Productive local-day logic must not use uncontrolled `toISOString().slice(0, 10)`.

## 5. Daily Log Contract

- There is one Daily Log per `user_id + local_date` in the active profile context.
- Daily Log stores day context, Opening Review, Closing Review, and carry-forward notes.
- Tasks remain standalone canonical tasks.
- Daily Log connects to tasks through `daily_log_tasks`.
- Daily Log does not duplicate task contents.
- Daily Log can store snapshots and notes, but it cannot replace canonical task state.

## 6. Inbox Triage Contract

- Inbox Item is capture.
- Triage can create a Task.
- Triage marks the Inbox Item as processed/triaged.
- The default relation is `task.source_inbox_item_id`.
- A join/relation table can be introduced later if one Inbox Item can produce multiple outputs.
- Triage is transactional: create Task, update Inbox Item, then revalidate affected views.

## 7. Carry Forward Contract

- Carry Forward does not create a duplicate Task.
- The open Task receives a new `planned_date`.
- The old Daily Log documents Carry Forward as an event, note, or relation.
- `carried_from_daily_log_id` is optional and can be introduced when useful.
- History remains traceable without splitting one task into several canonical tasks.

## 8. Resource Decision

- Resources are P0.5 / early P1, directly after Daily Core.
- Reason: Resources connect Education, Coding, Work, Life, Projects, and Notes.
- Minimal Resource scope includes:
  - `resources`
  - `resource_relations`
  - relation target type/id
  - source/context
  - `review_needed`

## 9. RLS / Ownership Decision

- Every user-specific table has `user_id`.
- RLS is enabled before real usage.
- Policy intent:
  - `USING (auth.uid() = user_id)`
  - `WITH CHECK (auth.uid() = user_id)`
- Final SQL must use authenticated-only policies and the current Supabase-recommended ownership predicate.
- Service Role Key is never used in the client.
- Zod validates mutations server-side.
- No user can see another user's data.

## 10. R1.6.1 Scope

R1.6.1 implements only:

- Domain Types
- Repository Interfaces
- Adapter Boundary
- Zod Schemas for P0 Actions
- Demo/Empty/Manual Adapter Contract

R1.6.1 explicitly does not implement:

- Supabase migration
- tables
- RLS
- Auth
- UI recomposition

## 11. Explicit Non-Goals

Not in R1.6.1:

- Supabase migrations
- Auth/RLS
- real DB writes
- area-specific persistence
- Apple Health
- GitHub
- Nutrition
- Work Wiki
- Rewards/Challenges
- Settings persistence
- Layout polish

## 12. Decisions Requiring Human Approval

Release before implementation:

1. Supabase as canonical Manual store from R1.6.2 onward.
2. P0 entity list.
3. Task Scheduling Contract.
4. Daily Log / Task connection.
5. Carry Forward without task duplication.
6. Resources as an early follow-up block.
7. R1.6.1 without Supabase.

If these decisions are approved, the next implementation step is:
R1.6.1 – Domain Contract & Repository Interfaces.
