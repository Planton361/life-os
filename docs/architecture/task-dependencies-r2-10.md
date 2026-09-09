# R2-10 — Canonical Task Dependency decision

Date: 2026-09-09. Active implementation contract; R2-10 user acceptance pending.
ROADMAP.md remains the priority source. R2-09 is USER ACCEPTED; R2-11 is not active.

## Model audit

- `DEPENDENCY_MODEL_EXISTS = NO`: no Task↔Task dependency relation, DAG or precedence storage existed before this migration. Milestone `sort_order`, Project membership, Task steps and Resource relations are different semantics.
- `REUSABLE = YES`: existing Task identity/lifecycle, authenticated feature-local Actions, repositories, Workbench disclosures, Project Milestones, and source completion RPCs.
- `COMPLETION_BOUNDARIES = complete_linked_task; complete_linked_meal; save_review_record; running session completion; complete_strength_session; direct table writes`. Existing source-linked Task direct-write guards remain binding.
- `SCHEMA_DECISION = bounded task_dependencies`, migration `20260909174436_r2_10_task_dependencies.sql`. No generic edge store or second Task engine.

## Relation and canonical satisfaction

`task_dependencies(id, user_id, project_id, predecessor_task_id, successor_task_id, created_at)` represents **only** same-Project Finish-to-Start edges. The denormalized Project key supports composite ownership/Project foreign keys and serialization. Identity and endpoints are immutable; authenticated clients have SELECT/INSERT/DELETE, no UPDATE. New edges require owned, nonarchived endpoints in an owned, nonarchived Project. Self, duplicate, cross-owner, cross-Project and cycle writes fail atomically. Cycles include retained archived edges, avoiding latent cycles in history.

A predecessor satisfies an edge exactly when `status = done`, `completed_at IS NOT NULL` and `archived_at IS NULL`. Canceled, waiting, someday and archived do not satisfy an edge. Lifecycle values remain `inbox/planned/active/waiting/done/canceled/someday/archived`; no editable blocked status is added.

READY means all incoming edges are satisfied; BLOCKED means at least one is not. Missing endpoints fail closed in the projection. Scheduling fields do not change this dependency availability. V1 introduces no WAITING_FOR_DATE state, earliest-start engine or due-date gate. Calendar scheduling remains possible for blocked work. Ready Now is dependency-ready open work, subject to a consuming surface's existing date/scheduling filters. Counts exclude done, canceled and archived Tasks; counts do not complete Milestones, Projects or Goals.

## Completion, concurrency and source boundaries

Task-table BEFORE triggers reject entry into `done` or a new nonnull completion timestamp while a predecessor is unmet. These run under authenticated direct API writes **and** security-definer canonical RPCs, without a role-based bypass. Source-table completion guards additionally cover Meals, Reviews, Running Sessions and Strength Sessions so a source cannot claim a new completion while its linked Task is blocked. A blocked coupled RPC rolls back the whole source/Task transaction. Existing source-domain requirements (review completion, real workout evidence, etc.) still apply.

Graph insert/delete and project-bound Task lifecycle writes update the owned Project row before checking dependencies. This deliberately refreshes Project `updated_at` through its existing timestamp trigger for graph/lifecycle work; it is not a new monotonic revision counter. The actual row-version write serializes concurrent mutations: READ COMMITTED checks the latest committed graph; REPEATABLE READ/SERIALIZABLE conflicts abort instead of validating stale snapshots. Recursive reachability uses UNION to terminate safely. Contended mixed domain locks may cause a transaction retry; they never admit partial writes or a cycle. No automatic retry or hidden success is claimed.

## Reopen, archive, removal and Project changes

- Reopen changes only the predecessor. Open direct successors become BLOCKED. Completed successors remain done with their completion timestamp and a visible dependency inconsistency; no cascading reopen or history rewrite. Satisfaction is edge-local: an inconsistent but still completed B continues to satisfy B → C until B itself is reopened/archived. No implicit transitive rollback or lock is invented.
- Archive retains edges. An archived predecessor becomes unmet even if it was completed. Archived successors retain historical relationships but leave actionable counts. Archiving a done successor is allowed even if its predecessors have since become unmet.
- Explicit Dependency removal immediately recomputes availability; it is not equivalent to completing the predecessor. Removal remains possible for an archived endpoint or Project.
- A Task with any incoming/outgoing edge cannot change/unassign Project or identity. Remove edges explicitly first. Composite foreign keys additionally prevent dangling or cross-Project edges. Normal authenticated Task deletion remains unsupported.
- New unmet predecessors cannot be attached to already completed successors. Historical inconsistencies arise through later reopen/archive, not silent retroactive introduction of unmet requirements.

## Projections and interaction

`read_task_dependency_graph` returns one authenticated, user-scoped MVCC snapshot of minimal Task records and edges. JSON aggregation avoids PostgREST row pagination truncating blockers. Zod validates the projection; failed reads do not imply READY. Workbench Task rows are read in owned, stably ordered pages so links to older blockers do not disappear behind the first API page. The domain module supplies Task context, same-Project acyclic candidates and Project ready/blocked lists plus `hasReadyTask`.

Project Workbench retains accepted Milestone grouping and progress; rows add short READY/BLOCKED counts and completed inconsistency signals. Task Detail exposes blockers and successors with real links, fulfilled predecessor count, and deliberate management disclosure. The database revalidates every candidate at write time. Dashboard Current/Up Next excludes dependency-blocked Tasks; Today remains a log and Calendar retains scheduling. Dependency, Task and coupled source mutations revalidate affected Task/Project details and existing dependent projections.

## Executable evidence

- Domain: `src/features/real-data/domain/task-dependencies.test.ts`.
- Repository/validation: `src/features/real-data/supabase/repositories/task-dependency-repository.test.ts`.
- Dashboard selection: `src/features/dashboard/dashboard-read-model.test.ts`.
- Database invariants, blocked Meal planning and atomic Meal/Review/Running/Strength source rollback: `tests/supabase/r2-10-task-dependencies.sql` (transaction/rollback).
- Concurrent cycle, completion and reopen: `tests/supabase/r2-10-task-dependency-concurrency.mjs` (explicit disposable-only container guard).
- Real Actions, management, lifecycle, reload, links and responsive screenshots: `tests/e2e/r2-10-task-dependencies.spec.ts`.
- Accepted Milestone regression: `tests/e2e/r2-09-project-milestones.spec.ts`.

No Obsidian, export, Canvas, TaskNotes, React Flow, templates or synchronization is part of this migration.
