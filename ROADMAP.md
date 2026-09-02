# Life OS Roadmap

**Status:** Active
**Product mode:** personal-only, local-first
**Design truth:** Life OS – Linear Calm Dark Command Center / Dashboard V5
**Detailed status:** `docs/product/capability-registry.md`
**Active sequence:** C1 → C2 → C3 → K1 → H1/H2 → N1 → A1

## 1. Product Contract

```text
Dashboard = control
Area pages = context
Detail pages = depth
Archive = history
```

Life OS is finished when every visible capability uses canonical data, writes are server-authenticated and user-scoped, dependent projections remain consistent after reload and no interface element overclaims functionality.

The existing application is the foundation. This roadmap does not restart the product and does not replace Dashboard V5.

## 2. Current State

- V5 frontend and navigation: broadly present.
- Next.js/Supabase/Auth/RLS architecture: established.
- Inbox, Tasks, Today and Calendar task flows: connected with remaining depth gaps.
- Project/Goal workbenches: connected with remaining depth gaps.
- Resources and Skills: connected with graph/search/management gaps.
- Nutrition: recipes, ingredients, meals, planner edit and grocery draft are connected with remaining advanced gaps.
- Mood, Sleep, Weight, Habits, Running and Strength: connected core loops with remaining depth gaps.
- Coding, Education, Work and Life have connected core workflows with capability-level depth gaps.
- Personal AI Assistant: not started as a production capability.
- Operation: local-first ready; private remote is optional and not active.

Capability-level truth is maintained in `docs/product/capability-registry.md`.

## R0 – Product Rebaseline & Visibility Reset

R0 replaces the former AI1 continuation point. It changes product priority and visibility only: existing feature code, migrations and data remain retained. No product capability is implemented by R0.

Active navigation contract:

```text
PRIMARY
Dashboard · Inbox · Today · Calendar · Portfolio · Resources

ACTIVE AREAS
Health & Fitness · Nutrition · Coding · Education · Work · Life

ACTIVE LIFE DEPTH
Journal · Notes · Inventory · Wishlist

UTILITY
Settings
```

Portfolio owns Task / Project / Goal / Skill management. Resources owns knowledge and evidence. Anti-Rot, Challenges, Shop and Entertainment are deferred and must be hidden from active navigation and Dashboard projections while their routes, code and data are retained. The current `src/config/navigation.ts` still exposes Entertainment, Shop and Challenges and does not expose Wishlist directly; this is documented implementation drift, not a completed visibility change.

### R0 audit findings

| Finding | Evidence | Delivery consequence |
|---|---|---|
| Product drift | former sequence advanced to AI1 and Motivation although the daily-companion core still has relation/planning depth gaps | do not continue AI1; restart delivery at C1 |
| Navigation drift | `src/config/navigation.ts` exposes Entertainment, Shop and Challenges; Dashboard registry still lists Anti-Rot/Challenges surfaces | first C1 task applies the documented visibility boundary without deleting routes |
| Data-model drift | prior `DATA_MODEL.md` grouped already implemented domains as soon/later and did not define Task Occurrence, Schedule Block or Domain Record | binding semantics now live in `DATA_MODEL.md` |
| Route-doc drift | `docs/product/pages-and-routes.md` still describes Entertainment, Shop and Challenges as target navigation and uses an older MVP priority | treat it as follow-up documentation debt; `PRODUCT.md`, this roadmap and the registry take precedence |
| Architecture friction | canonical reads/writes are established, but large projection/view-model files combine mapping, policy, content-state and presentation responsibilities | extract only inside the owning C-block when required; no broad cleanup |
| Core graph friction | Task→Project/Goal and Resource relations exist, while direct Task↔Skill and consistent inherited Goal semantics do not | C1 closes graph integrity using the existing feature-local architecture |
| Oversized modules | `profile-data/view-models.ts` 4,409 lines; `education-workspace-page.tsx` 4,187; `education-overview-page.tsx` 3,648; `area-view-models.ts` 3,287; `work-overview-page.tsx` 2,791; `inbox-page.tsx` 2,743; Portfolio context 2,313; Resources page 2,077 | split only where an active slice must edit the module, preserving behavior and ownership |
| Monolithic browser debt | `tests/e2e/content-state-system.spec.ts` is 10,926 lines, far larger than all focused specs and mixes many domains | each new block adds/uses a focused spec; touched legacy cases may move only with identical proof, never via broad cleanup |

## 3. Pre-R0 Delivery Evidence

The following D1 detail is retained as implemented baseline evidence. It does not define the post-R0 delivery order or reopen completed features; current truth remains in the Capability Registry.

### D1 – Daily Command Center & Reviews

**Outcome:** Dashboard, Inbox, Today, Calendar, Daily Review and Weekly Review form one closed daily operating loop.

### D1.1 – Dashboard Read Model & Navigation Completion

**Baseline note:** Implemented at the time of this roadmap revision. Ongoing capability truth remains in the Capability Registry, code, tests and Git history.

**Outcome:** Every Dashboard panel either reads real canonical data and navigates correctly, or is explicitly marked as unavailable until its source domain is implemented.

Required results:

- central server-side Dashboard Read Model;
- real Tasks Today, Inbox and active Portfolio projections;
- explicit source state for Focus Time, Review Status, Sleep, Nutrition and Weather;
- Quick Thought remains connected;
- Daily Control current task and Up Next policy are deterministic;
- Time Progress uses the current day and planned/scheduled work;
- Dashboard cards navigate to their responsible surfaces;
- no Manual-profile fixture fallback;
- 4K and standard desktop proof.

#### Outcome and boundary

Every visible Dashboard panel either reads real canonical data through a server-side Dashboard Read Model and navigates to the responsible surface, or displays an honest unavailable/prepared state until its source domain is implemented. The existing Dashboard V5 layout remains intact.

D1.1 does not implement every missing source domain. It establishes the read-model contract, connects existing real sources, exposes honest missing-source states and completes deterministic navigation.

Already connected or substantially connected:

- Quick Thought to Inbox;
- Inbox summary;
- task/day projections and Today Agenda task blocks;
- portions of Daily Control;
- active Portfolio data;
- Nutrition and Meal data in their canonical domain.

Visible gaps to classify or connect:

- Focus Time semantics and Review Status;
- Sleep, Mood write/history and Weight Goal;
- exact Nutrient Balance completion semantics;
- Latest Run, Muscle Map and Habit Tracker;
- Anti-Rot, Challenges, Time Progress and Weather;
- deterministic navigation for every Dashboard card.

#### User flows

- On `/dashboard`, summary cards display current user-owned values and open their responsible routes.
- Quick Thought creates an Inbox item, shows success and remains visible after reload.
- Daily Control selects the current task deterministically; Up Next contains explainable ranked tasks; actions navigate or continue without hidden writes.
- Today Agenda shows scheduled task blocks from canonical scheduling fields and never labels planned-only work as a timed block.
- Missing source domains display `Unavailable` or `Prepared` truthfully and never show Demo values in Manual mode.

#### Dashboard Read Model

Create or consolidate a server-side contract following existing repository and view-model conventions, covering:

```ts
type DashboardCommandCenter = {
  stats: {
    tasksToday: DashboardStat;
    focusMinutes: DashboardStat;
    inboxOpen: DashboardStat;
    nutrition: DashboardStat;
    review: DashboardStat;
    sleep: DashboardStat;
  };
  quickThought: DashboardCapabilityState;
  dailyControl: DailyControlProjection;
  timeProgress: TimeProgressProjection;
  mood: MoodProjection;
  weight: WeightGoalProjection;
  mealsToday: MealTodayProjection[];
  habits: HabitDashboardProjection[];
  activePortfolio: ActivePortfolioProjection;
  latestRun: LatestRunProjection | null;
  challenges: ChallengeProjection[];
};
```

#### Canonical sources

| Dashboard capability | Canonical source |
|---|---|
| Tasks Today | tasks |
| Focus Time | scheduled task blocks classified as focus/deep work |
| Inbox / Quick Thought | inbox_items |
| Nutrition | completed meals plus manual recipe estimates |
| Review Status | daily/weekly reviews, once implemented |
| Sleep | sleep entries, once implemented |
| Daily Control | tasks and current-day planning fields |
| Today Agenda | task scheduling fields; later schedule-source read model |
| Mood | mood entries, once implemented |
| Weight | weight entries/goal, once implemented |
| Active Portfolio | projects/goals/skills and explicit pins/ranking |
| Habits | habits/habit logs, once implemented |
| Latest Run | running sessions, once implemented |
| Anti-Rot / Challenges | their future canonical models |

No Dashboard-specific copies of these records may be introduced.

#### Selection and time policies

- Current task uses an explicit policy based on scheduling, active state and user priority, never list position alone.
- Up Next uses persisted and explainable signals such as scheduled/planned time, priority, status/blocker, deadline, relations, duration and energy where supported. No opaque AI ranking is allowed.
- Active Portfolio may use the existing ranking. Explicit pin/favorite management remains separate unless a safe existing field already exists.
- Time Progress represents current-day progression: elapsed local-day time and, if clearly labeled, planned/scheduled load. It must not fabricate productivity or undefined year/month progress.

#### Navigation

Every Dashboard card maps to a responsible existing route. Verify actual route names; do not invent routes silently.

```text
Tasks Today → /today or the existing Portfolio task view
Inbox → /inbox
Nutrition → /nutrition or the existing meal planner
Review Status → the existing Today/Review location
Sleep, Mood, Weight → /health or their responsible existing subpage
Active Portfolio → /portfolio
Latest Run → the existing running surface
Habits → the existing habits surface
```

#### Backend, ownership and UI scope

- Reads run server-side and repositories remain user-scoped.
- No client user id is trusted, no Service Role is used and no remote database action occurs.
- Reuse existing source actions.
- Avoid migrations unless a proven Dashboard-critical source belongs to D1.1; otherwise expose an honest unavailable state and defer its model.
- Allowed UI work is binding real data, completing navigation, replacing fake values with honest states and making small loading/error/empty/accessibility fixes.
- A Dashboard redesign, new card layout, broad Health/Habits models, AI assistant, decorative charts and hidden mutations are out of scope.

#### Acceptance criteria

- One server-side Dashboard read-model boundary exists or the existing boundary is clearly consolidated.
- Every visible summary card has a source state and navigation target.
- Manual mode has no Dashboard fixture fallback.
- Quick Thought remains reload-stable.
- Tasks Today, Inbox and Active Portfolio use real data.
- Daily Control current task and Up Next follow documented deterministic policies.
- Today Agenda remains consistent with Calendar/Today task scheduling.
- Unsupported Mood/Sleep/Weight/Habit/Run/Challenge capabilities are honest, not fake.
- 4K and standard desktop remain usable.
- Capability Registry is updated.

#### Focused proof plan

1. Summary cards use Manual data and navigate correctly.
2. Quick Thought creates an Inbox item and survives reload.
3. Daily Control current task and Up Next remain stable after reload.
4. Today Agenda matches Calendar scheduling.
5. Unsupported source cards show honest states and no Demo values.
6. Dashboard renders on 4K and standard desktop without broken interaction.

Use scoped regions and unique test data.

#### Risks

- Dashboard can become a second data warehouse.
- A broad read model can create large unbounded queries.
- Existing mock-heavy components may hide capability truth.
- Ranking policies can become opaque or unstable.
- Missing source domains must not be rushed into D1.1 solely to make every card non-empty.

### D1.2 – Daily & Weekly Review

**Outcome:** Daily Review and Weekly Review become canonical, reload-stable records that close the loop between Today, Dashboard and the next planning period without duplicating Tasks, Projects or Goals.

#### User flows

- The user opens the Daily Review from Today or the Dashboard Review Status card.
- The user records wins, blockers, open loops, carry-over decisions and next-day preparation.
- Saving updates the current review state, survives reload and makes Review Status truthful on Dashboard and Today.
- The user opens Weekly Review, sees task/project movement derived from canonical sources and records focus plus next-week decisions.
- Carry-over creates or updates explicit planning decisions; it does not silently duplicate tasks.

#### Canonical data and backend

- Define canonical Daily Review and Weekly Review records with user ownership, local date/week identity and explicit lifecycle.
- Reuse tasks, projects, goals and logs as source projections; reviews store reflection and decisions, not copies of domain entities.
- Every write uses Zod, server-side authentication, user-scoped repositories, same-user ownership checks for linked targets and route/read-model revalidation.
- Use a local migration only if the active schema has no safe review model. No remote database action.
- Coupled review/carry-over writes must be atomic or use a controlled transactional RPC.

#### UI and projections

- Preserve V5 and the existing Today/Review surfaces.
- Dashboard Review Status reads the canonical current review state and navigates to the responsible route.
- Today shows honest Opening/Closing Review states and reload-stable saved content.
- Calendar receives review schedule sources only if an existing canonical scheduling link supports them; otherwise scheduling remains a separate D2.1 capability.
- Demo, Manual, Empty and Auth-blocked states remain distinct.

#### Non-goals

- Mood, Sleep and Weight entries;
- AI-generated reviews;
- autonomous carry-over or task duplication;
- Calendar schedule-source migrations owned by D2.1;
- Dashboard redesign.

#### Acceptance criteria

- Daily and Weekly Review records are canonical, user-scoped and RLS-protected.
- Create/update flows validate input, show success/error/auth-blocked states and survive reload.
- Dashboard Review Status and Today project the same current review truth.
- Carry-over decisions are explicit and cannot partially apply.
- Empty and Manual modes never show Demo review content.
- Focused browser proofs cover save, edit/reload, Dashboard projection and carry-over behavior.
- Capability Registry is updated.

#### Focused proof plan

1. Create and update a unique Daily Review; reload and verify the concrete Review region.
2. Verify Dashboard Review Status changes and navigates to the saved review.
3. Record an explicit carry-over decision and verify Today/task projection after reload.
4. Create/update Weekly Review and verify derived project/task movement remains read-only source data.
5. Prove Empty and Auth-blocked states without Demo leakage or apparently functional writes.

#### Risks

- Review records can accidentally duplicate task/project state.
- Carry-over can create partial or duplicate work without an atomic boundary.
- Local-date and ISO-week identity must remain stable across timezone boundaries.
- Dashboard and Today can drift if they do not share the same review read model.

## 4. Permanent Delivery Sequence

This sequence is the complete product plan, not a live status queue. A Codex prompt names the concrete block ID. Current implementation truth comes from the Capability Registry, code, tests and Git.

| Order | Block | Outcome | Main scope | Depends on | Non-goals |
|---:|---|---|---|---|---|
| 1 | C1 Core Work Graph | Task / Project / Goal / Skill / Resource form one coherent, editable and inspectable spine | relation integrity, ownership, lifecycle, Task context, graph read models | established canonical entities | redesign; project-management engine; broad refactor |
| 2 | C2 Weekly Planning Calendar | the user turns the core graph into a realistic week | week-first queue, occurrence scheduling, conflicts, routine management | C1 graph semantics | duplicate Calendar entities; drag/drop before accessible controls |
| 3 | C3 Daily Companion Loop | Dashboard, Inbox and Today support capture → execute → planned-vs-done → review | daily protocol, projections, carry-over and review truth | C2 occurrence/schedule contract | AI briefing; gamification |
| 4 | K1 Knowledge Base | Resources become searchable context and evidence across the core graph | typed relations, backlinks, search, archive and evidence workflows | C1 relation semantics | decorative graph; embeddings without decision |
| 5 | H1/H2 Health and Fitness | health facts and fitness plans participate in the daily loop through occurrences | health records, habits, running, strength and linked execution | C2/C3 scheduling and daily protocol | diagnosis; Garmin dependency |
| 6 | N1 Nutrition | meal planning and completion participate in weekly/daily execution | recipes, meals, portions, groceries and occurrence links | C2/C3 scheduling and daily protocol | medical claims; unsupported macro precision |
| 7 | A1 Work/Education/Coding/Inventory | area views reuse the core spine and Resources for domain context | projections and bounded domain records; Inventory and Wishlist remain active | C1 and K1 conventions | Entertainment; parallel Tasks/Projects/Resources |

## 4.1 Completed Work Block: SR1 – Local Schema Recovery

**Status:** Completed. The verified Target is the canonical local runtime;
the Source is retained only as `LEGACY_FALLBACK_READ_ONLY`. C1.1 continues at
C1.1-04.

### SR1-01A – Canonical Schedule-Source Foundation

**Completed:** Build a fully isolated local Supabase stack solely from the
versioned migration chain and add the smallest forward migration that
canonically secures `schedule_source_links` plus its controlled
`schedule_linked_source` write boundary. This slice excludes all completion,
rescheduling, data-import and cutover work.

**Done when:** the isolated stack has Git-identical migration history,
`task_skill_links` is registered through its versioned migration,
`schedule_source_links` has the explicit four-source canonical foundation, and
source/task ownership, duplicate and direct-mutation bypass attempts are
rejected without changing the old local stack.

### SR1-01B1 – Canonical Meal Schedule & Completion Sync

**Completed:** On the isolated Git-only stack, make the existing Meal
Schedule Source flow atomically synchronize the canonical Meal and its linked
Task Occurrence for scheduling and completion. This is limited to Meals; it
does not advance Review, Running, Strength, import or cutover work.

**Done when:** the Git-only migration chain proves Meal-to-Task and
Task-to-Meal completion plus Meal schedule/reschedule consistency under the
controlled Schedule Source boundary, with ownership and rollback protection
and without changing the old local stack.

### SR1-01B2 – Canonical Review Schedule & Completion Semantics

**Completed:** On the isolated Git-only stack, make Daily and Weekly
Review Records use their canonical Schedule Source Task as their sole planned
occurrence. A completed Review atomically completes that Task; completing an
open Review Task is rejected and cannot fabricate a completed Review.

**Done when:** the Git-only migration chain proves Daily and Weekly
Review-to-Task ownership, Task-only scheduling, Review-to-Task completion,
open-Review Task-completion rejection, archive safety and rollback protection
without changing the old local stack or Review carry-over semantics.

### SR1-01C1 – Canonical Running Schedule & Session Completion

**Completed:** On the isolated Git-only stack, make a Running Plan Item
use its Schedule Source Task as its only calendar occurrence. A fully recorded
Running Session atomically completes that Task; completing an open Running
Task is rejected and cannot fabricate a Session or training data.

**Done when:** the Git-only chain proves active Plan/Plan Item ownership,
Task-only scheduling, real Session-to-Task completion, open-Task rejection,
archive safety and rollback protection while retaining the A/B1/B2 proofs and
leaving the old local stack unchanged.

### SR1-01C2 – Canonical Strength Schedule & Session Completion

**Completed:** On the isolated Git-only stack, make a Strength Plan use
its Schedule Source Task as its only calendar occurrence. A completed Strength
Session with real Set Logs atomically completes that Task; completing an open
Strength Task is rejected and cannot fabricate a Session, Sets or training
evidence.

**Done when:** the Git-only chain proves Strength Plan ownership, Task-only
scheduling, valid Session-to-Task completion, open-Task rejection, archive
safety and rollback protection while retaining the A/B1/B2/C1 proofs and
leaving the old local stack unchanged.

### SR1-02 – Canonical Review Carry-over Reconciliation

**Completed:** On the isolated Git-only stack, make Daily Review
carry-over an atomic, repeatable and reversible decision. After every save,
the active carry-over decisions exactly equal the submitted Task IDs; newly
selected Tasks are carried forward, retained selections are idempotent and
deselected Decisions are removed. An untouched carry-over plan restores its
captured prior planning state, while a newer deliberate Task planning change is
never overwritten.

**Done when:** the Git-only chain proves exact decision-set reconciliation,
minimal original-planning snapshots, safe restore and newer-write protection,
same-user active Task validation, whole-operation rollback, duplicate-input
determinism and no unintended Activity or Weekly Review effect while retaining
the SR1-01A/B1/B2/C1/C2 proofs and leaving the old local stack unchanged.

### SR1-03 – Source-linked Task Write Boundary

**Completed:** On the isolated Git-only stack, make active generic Task
write paths source-aware at the server/repository boundary. Normal Tasks keep
their existing edit, planning and lifecycle behavior. Meal-linked Task
scheduling, rescheduling and unscheduling must keep the Meal projection
atomically consistent; generic completion must use the canonical linked-task
completion path. Review, Running and Strength retain Task-only scheduling and
must reject generic completion until their existing domain evidence is valid.
Source-linked reopen and archive must not silently desynchronize a completed
domain record.

**Done when:** focused SQL and isolated Runtime/Browser proofs show normal Task
behavior, Meal schedule/reschedule/unschedule/completion consistency,
source-dependent Review/Running/Strength completion guards, metadata-only
source-linked edits, ownership/rollback protection and all SR1 regressions,
without changing the old local stack or beginning the runtime cutover.

### SR1-04 – Personal Data Transfer & Runtime Cutover

**Active cutover phase:** Transfer only after a reproducible Git-only target,
a complete synthetic rehearsal and a read-only personal-data preflight prove
the canonical contract. The protected old stack remains the data source and
fallback until a separate runtime cutover is complete.

#### SR1-04A – Personal Data Transfer Contract & Synthetic Rehearsal

**Completed:** The explicit local transfer runner, synthetic legacy fixture,
integrity proof and isolated Manual/Auth runtime smoke prove the canonical
transfer contract. Legacy task context is deterministically transformed,
AI/Briefing metadata stays deferred, and the read-only personal-data preflight
is `READY_WITH_KNOWN_DEFERRED`. No personal data was imported and no runtime
cutover occurred.

#### SR1-04B – Personal Data Transfer

**Completed:** The personal data transfer, candidate preservation and
read-only Target Runtime proof are complete. The old stack remains the writer
and fallback; no runtime cutover occurred.

#### SR1-04C – Runtime Cutover

**Completed:** Target has passed the controlled writer proof and persistent
normal-runtime switch. The Source remains `LEGACY_FALLBACK_READ_ONLY`.

##### SR1-04C1 – Controlled Writer Cutover Proof

**Completed:** The isolated Target Runtime accepted authenticated canonical
personal writes with projection, reload and post-write integrity proofs. The
Source remains unchanged and is no longer used by the proof runtime.

##### SR1-04C2 – Persistent Runtime Switch

**Completed:** The normal local runtime uses the verified Target without
process overrides. The Target identity, transferred data and controlled
writes remain preserved.

## 4.2 Active Work Block: C1.1 – Work Graph Integrity & Task Context

**Outcome:** From capture or Portfolio, the user can place a Task in coherent Project/Goal/Skill/Resource context, inspect that context from the responsible workbenches and trust that every relation is user-owned, non-contradictory and reload-stable.

### User flow

```text
Capture or open Task
→ choose optional Project
→ see inherited Project Goal
→ choose a compatible direct Goal when needed
→ link one or more Skills as practice/application context
→ link Resources as context/evidence
→ save with visible success/error state
→ inspect backlinks from Project, Goal, Skill and Resource
→ reload and see the same graph
```

### Data ownership and invariants

- `tasks`, `projects`, `goals`, `skills` and `resources` remain the canonical sources.
- Existing `tasks.project_id`, `tasks.goal_id`, `projects.goal_id`, `resource_relations` and `skill_evidence` are reused.
- Add only the smallest user-scoped Task↔Skill relation and `resource_relations` Skill target support required by the proven UI; do not create a generic global edge store.
- A Task's direct Goal must be empty or compatible with its Project's Goal. Changing Project/Goal must reject or explicitly resolve a conflict; no silent relinking.
- Task↔Skill means practice/application context. It never creates Skill Evidence automatically.
- Every relation write authenticates server-side, validates with Zod, checks both endpoints for same-user active ownership, respects archive state and revalidates Task, Portfolio, Project, Goal, Skill and Resource projections that changed.
- RLS and grants protect any new user-specific relation table. No Service Role or remote database operation.

### Acceptance criteria

- Deferred surfaces are absent from active navigation and Dashboard controls while their routes/data remain intact; Inventory and Wishlist remain reachable.
- A Manual-mode Task can add, change and remove Project, compatible Goal, Skills and Resources from the existing V5 workbench/detail flow.
- Inherited versus direct Goal context is textually distinguishable and contradictory alignment cannot persist.
- Project, Goal, Skill and Resource views show deterministic Task backlinks without duplicate or cross-user records.
- Archive/restore and relation removal preserve historical Skill Evidence and do not cascade-delete canonical entities.
- Manual, Demo, Empty and Auth-blocked states remain separate; all writes show visible result states.
- Focused Playwright proof uses unique data, scoped regions and reloads after each relation mutation.
- `git diff --check`, `pnpm typecheck`, `pnpm lint`, focused unit/repository tests, local Supabase lint/advisors, focused Playwright and `pnpm build` are green.
- Capability Registry is updated and one coherent C1.1 commit exists.

### Risks

- Existing data may contain Task/Project/Goal combinations that violate the newly explicit invariant; migration must report and resolve deterministically, never discard links.
- A generic graph abstraction would duplicate existing typed relations and obscure ownership.
- Backlink queries can become unbounded or duplicate direct and inherited relationships.
- Editing the oversized Portfolio/Resources components can trigger broad accidental UI churn.
- The monolithic Playwright spec can encourage unrelated test movement and slow diagnosis.

### No-gos

- no Dashboard V5 redesign or parallel navigation architecture;
- no replacement of canonical entity tables or generic `relationship_edges` platform;
- no milestones, OKR engine, progress percentages, multi-block Calendar model or AI ranking;
- no automatic Skill Evidence from Task linkage;
- no deletion of deferred feature code, routes, migrations or data;
- no broad module cleanup or broad Playwright split;
- no AI1, external API or remote database work.

### Bounded Codex tasks

#### C1.1-01 – Active Navigation Visibility Reset

**Goal:** Apply the R0 active navigation boundary without deleting routes or feature data.

**Use Skills:** `life-os-design-taste`, `life-os-browser-proof`, `life-os-completion-gate`.

**Context:** V5 remains unchanged; Anti-Rot, Challenges, Shop and Entertainment become hidden from global, route-local and Dashboard entry points, while Inventory, Wishlist and Settings remain reachable.

**Files to Read:** `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, this block, Capability Registry, `src/config/navigation.ts`, layout/navigation tests, Dashboard composition and Life route-local navigation.

**Files to Change:** existing navigation configuration/components, Dashboard composition only to remove deferred sections, route-local context navigation, the smallest focused navigation test, Capability Registry.

**Files Not to Change:** deferred feature implementations, migrations, Dashboard layout, protected paths.

**Hard Boundaries:** hide entry points/sections only; no route deletion, redirect, data mutation or visual redesign. Add a Wishlist entry only by routing to the existing Inventory/Wishlist surface.

**Vertical Slice Scope:** Navigation-only user-visible slice: desktop and mobile/keyboard access, active/deferred truth and Inventory/Wishlist reachability.

**Done When:** deferred entries are absent from navigation, route-local context links, command surfaces and Dashboard composition; active entries remain usable, direct deferred URLs still preserve data/code, and focused browser proof is green.

**Validation:** `git diff --check`; `pnpm typecheck`; `pnpm lint`; focused navigation Playwright; `pnpm build` at C1.1 closure.

**Staging:** stage only navigation, focused proof and registry changes; exclude `.idea`, generated, protected and deferred feature files.

**Report Format:** `Erstellt:`, `Geändert:`, `Nicht geändert:`, `Validierung:`, `Offene Punkte:`, `Risiken:`.

#### C1.1-02 – Task↔Skill Context Vertical Slice

**Goal:** Let the user link/unlink multiple owned active Skills from Task detail without implying Evidence.

**Use Skills:** `life-os-vertical-slice`, `life-os-backend-action-slice`, `life-os-design-taste`, `life-os-browser-proof`, `life-os-completion-gate`.

**Context:** Reuse Task Detail, Skills and feature-local real-data boundaries; introduce only the minimal typed relation and local migration if the audit confirms none exists.

**Files to Read:** core migrations/types, Task/Skill domain/schema/action/repository code, Task detail and Skill workbench, security/accessibility rules.

**Files to Change:** minimal local migration/generated types, feature-local Task/Skill domain-schema-action-repository files, existing Task/Skill UI, focused tests and Registry.

**Files Not to Change:** `src/server`, unrelated domains, deferred features, remote Supabase, protected paths.

**Hard Boundaries:** same-user active endpoints, idempotent link, explicit unlink, no automatic `skill_evidence`, no generic edge table.

**Vertical Slice Scope:** UI → Zod → server auth → user-scoped repository → RLS → Task/Skill revalidation → reload/browser proof.

**Done When:** multiple Skills can be linked/unlinked, Skill backlinks are deterministic, cross-user/archived targets fail safely and reload preserves the result.

**Validation:** required always checks; focused unit/repository tests; local Supabase lint/advisors; focused Task↔Skill Playwright.

**Staging:** stage only this relation slice, generated types when migration requires them, tests and Registry; exclude local/generated-sensitive artifacts.

**Report Format:** `Erstellt:`, `Geändert:`, `Nicht geändert:`, `Validierung:`, `Offene Punkte:`, `Risiken:`.

#### C1.1-03 – Project/Goal Alignment Integrity

**Completed.**

**Goal:** Make direct and inherited Goal context understandable and prevent contradictory Task alignment.

**Use Skills:** `life-os-vertical-slice`, `life-os-backend-action-slice`, `life-os-design-taste`, `life-os-browser-proof`, `life-os-completion-gate`.

**Context:** Keep existing nullable Task→Project/Goal and Project→Goal fields; audit existing rows before deciding whether a constraint or controlled RPC is safe.

**Files to Read:** Task/Project/Goal schemas, actions, repositories, Portfolio detail/workbench, core migration, existing relation tests.

**Files to Change:** smallest existing backend/UI boundaries, a local corrective migration or RPC only if required, focused tests and Registry.

**Files Not to Change:** Calendar scheduling, progress/milestone models, unrelated area pages, deferred features.

**Hard Boundaries:** no silent data loss or silent relinking; direct/inherited labels must be text-backed; existing conflicts require a deterministic reported resolution path.

**Vertical Slice Scope:** Task context edit through ownership validation, conflict-safe persistence, dependent Project/Goal projections and reload proof.

**Done When:** compatible relations save, incompatible relations fail or request explicit resolution, Project/Goal backlinks agree after reload and existing data is preserved.

**Validation:** required always checks; focused domain/repository tests; local Supabase checks if schema changes; focused Project/Goal alignment Playwright.

**Staging:** stage only alignment logic, required migration, focused tests and Registry; no opportunistic Portfolio refactor.

**Report Format:** `Erstellt:`, `Geändert:`, `Nicht geändert:`, `Validierung:`, `Offene Punkte:`, `Risiken:`.

#### C1.1-04 – Resource↔Skill Context and Backlink Projection

**Completed.**

**Goal:** Let Resources provide typed Skill context and show one deterministic, bounded work-context projection across Task, Project, Goal, Skill and Resource surfaces.

**Use Skills:** `life-os-vertical-slice`, `life-os-backend-action-slice`, `life-os-design-taste`, `life-os-browser-proof`, `life-os-completion-gate`.

**Context:** Extend the existing semantic relation read model; direct relations outrank inherited paths and duplicates disclose provenance once.

**Files to Read:** semantic-relations read model/tests, Resource inspector/view model, Portfolio/Task/Skill detail components and repositories.

**Files to Change:** existing bounded read-model and responsible UI sections, focused tests and Registry.

**Files Not to Change:** graph visualization libraries, global state, unrelated area projections, deferred features.

**Hard Boundaries:** reuse `resource_relations` with an owned active Skill target; server-side user-scoped writes/reads, bounded query/result sizes, stable ordering, text labels for direct/inherited/evidence context.

**Vertical Slice Scope:** Resource inspector link/unlink → Zod/auth/ownership/RLS → canonical relation reads → deduped projection → responsible V5 inspectors → navigation/reload proof.

**Done When:** all five spine entities expose correct backlinks with no cross-user leak, duplicate or fabricated progress and links open the responsible existing route.

**Validation:** required always checks; semantic read-model unit tests; focused backlink/navigation Playwright.

**Staging:** stage only the read-model/UI projection, focused tests and Registry; do not split oversized files beyond the touched responsibility.

**Report Format:** `Erstellt:`, `Geändert:`, `Nicht geändert:`, `Validierung:`, `Offene Punkte:`, `Risiken:`.

#### C1.1-05 – C1.1 Proof and Registry Closure

**Current slice.**

**Goal:** Prove the complete C1.1 flow and record honest implementation truth without broad test cleanup.

**Use Skills:** `life-os-browser-proof`, `life-os-completion-gate`.

**Context:** Consolidate focused proofs for navigation, Task context, alignment, backlinks, ownership, Empty/Auth-blocked and reload behavior.

**Files to Read:** all C1.1 diffs, focused specs, relevant cases in `content-state-system.spec.ts`, Capability Registry.

**Files to Change:** one focused C1 work-graph spec (or existing focused specs), Registry and only necessary touched test helpers.

**Files Not to Change:** unrelated legacy E2E cases, product code unless a proven C1.1 defect requires a scoped fix, protected paths.

**Hard Boundaries:** do not claim full-suite or cross-domain completion; do not move unrelated tests merely to reduce line count.

**Vertical Slice Scope:** Not a new feature; closure proof for the preceding C1.1 slices.

**Done When:** all C1.1 acceptance criteria have scoped reload proofs, required checks are green, Registry is precise and the Completion Gate returns `PASS`.

**Validation:** `git diff --check`; `pnpm typecheck`; `pnpm lint`; focused unit/repository tests; local Supabase lint/advisors; focused Playwright; `pnpm build`; final diff review.

**Staging:** stage only the coherent C1.1 diff; exclude `.idea`, generated sensitive artifacts and every unrelated user change.

**Report Format:** `Erstellt:`, `Geändert:`, `Nicht geändert:`, `Validierung:`, `Offene Punkte:`, `Risiken:`.

## 5. Completed Major Work

The following major capabilities are already established and must not be rebuilt:

- Dashboard V5 foundation;
- Dashboard D1.1 server-side read model, deterministic Daily Control, source truth and navigation;
- Inbox capture and routing core;
- task lifecycle and planning;
- Calendar task scheduling, reschedule, unschedule and visible conflict override;
- Project and Goal edit/status/archive;
- linked task/project flows;
- Resource Relations;
- Skill Evidence;
- recurring template and explicit instance generation foundation;
- Recipe create/edit/archive;
- Recipe Ingredient create/edit/delete;
- Meal create/edit/reschedule/complete;
- read-only Grocery Draft;
- local browser-proof recovery;
- local operation and backup/restore smoke tooling.

Historical details remain in QA, closure and archived roadmap documents.

## 6. Program Scope by Domain

These headings describe stable domain scope, not delivery order. The binding order is the sequence in section 4.

### C1 – Core Work Graph

- canonical Task / Project / Goal / Skill / Resource relation integrity;
- explicit inherited/direct Goal semantics;
- Task↔Skill context separate from Skill Evidence;
- typed Resource relations and backlinks;
- lifecycle and archive safety;
- visibility reset for deferred surfaces without route or data deletion.

### C2 – Weekly Planning Calendar

- week-first planning and source-aware queues;
- Routine Templates and explicit Task Occurrences;
- Schedule Block semantics and conflict handling;
- Calendar filters over core graph relations;
- accessible controls before drag/drop/resize comfort.

### C3 – Daily Companion Loop

- Dashboard daily control;
- Inbox capture and triage;
- Today daily protocol and planned-vs-done analysis;
- carry-over, Daily Review and Weekly Review;
- shared projections over canonical occurrences.

### H1 – Mood, Sleep, Weight & Habits

- mood entries;
- sleep entries;
- weight entries and goal;
- habit definitions, windows, increments and logs;
- Dashboard interaction and historical projections.

### H2 – Running & Strength

- running plans and sessions;
- latest-run Dashboard projection;
- exercise library;
- strength plans, sessions and sets;
- muscle-map derivation;
- optional Garmin integration only through a separate external gate.

### K1 – Knowledge Base

- Resource inspector, archive/restore and search;
- knowledge/evidence workflows over the C1 graph;
- semantic relation read model;
- graph visualization only after the read model is proven.

### N1 – Nutrition

- recipes, ingredients and meals;
- weekly meal planning and daily completion;
- honest portion/nutrition semantics;
- grocery derivation;
- scheduled Task Occurrence links.

### A1 – Work, Education, Coding and Inventory

- repositories, coding projects and agent sessions;
- scientific work, literature and learning logs;
- work logs and wiki;
- inventory, wishlist and purchase decisions;
- no area-local duplicate Tasks, Projects, Skills or Resources.

### AI1 – Personal Assistant

- deferred; do not continue during the active C1→A1 sequence;
- Morning Briefing;
- Evening Review;
- structured read tools;
- confirmed write tools;
- DeepSeek provider boundary;
- no direct LLM database access.

### I1 – Integrations & Analytics

- optional weather, Garmin and GitHub integrations;
- activity events;
- reports and trends;
- semantic search only after a privacy and permissions decision.

### Z1 – Final Local Product Closure

- all Capability Registry entries are `CONNECTED` or justified `EXTERNAL_GATE`;
- no misleading visible controls or Demo leakage in Manual/Empty modes;
- focused and full product proofs are green;
- 4K, standard desktop and mobile smoke coverage;
- accessibility and performance passes;
- local backup, restore, startup and recovery proof;
- sustained personal-use period without a critical blocker.

## 7. Definition of Done

A feature block is complete only when:

1. existing UI was reused or a design gap was explicitly proven;
2. canonical entities and relations are defined;
3. migration/type generation exists if required;
4. Server Actions use server-side auth and Zod;
5. repositories are user-scoped;
6. relation ownership and RLS are correct;
7. dependent read models and routes are updated;
8. Success, Error, Empty, Demo and Auth-blocked states are honest;
9. writes survive reload;
10. a focused browser proof is green;
11. the Capability Registry is updated;
12. review is complete and a single coherent commit exists.

A data layer without its required user flow is not a completed feature.

## 8. Delivery Rules

- The user/Codex prompt selects one block ID from the permanent sequence.
- Audit the Capability Registry, code, tests and Git before deciding the concrete gap inside that block.
- Prefer larger complete Vertical Slices over many docs-only micro-blocks.
- Do not create separate Epic, scope-lock or closure files for normal work. Decision records are reserved for material data, security, privacy or external-integration decisions.
- Stable rules belong in `AGENTS.md` and Skills, not repeated in every prompt.
- Historical roadmap entries never determine implementation status or prompt scope.
- No remote database, deployment, provider or external API work without an explicit decision/security scope.
- No files are deleted without explicit approval.

## 9. Operations

Active operating mode:

```text
personal-only
local-first
private remote: not now
public SaaS: not a goal
```

Still required throughout delivery:

- auth and RLS;
- secret hygiene;
- local backups and restore drills;
- accessible interaction;
- responsive behavior;
- focused performance checks.

Operations and product completion are tracked separately.

## 10. Deferred and External Gates

Deferred until their prerequisite block and explicit gate:

- Anti-Rot, Challenges and Shop (implemented and retained, hidden from active navigation);
- Entertainment (implemented and retained, hidden; Inventory and Wishlist stay active);
- AI1 Personal Assistant; do not continue it before an explicit post-A1 decision;
- public deployment and public registration;
- Garmin API;
- external food APIs and medical nutrition claims;
- pantry/receipt OCR;
- autonomous background jobs;
- semantic embeddings;
- public SaaS scaling;
- native mobile app.

Deferred does not mean removed. It means the prerequisite model, privacy or integration gate is not yet complete.

## 11. Roadmap Maintenance Rule

This file is a static product-completion plan, not an implementation log.

- Normal feature work updates `docs/product/capability-registry.md`, code, tests and Git history.
- Change this roadmap only when the product plan, permanent sequence, block outcome, dependency or material functional scope changes.
- Do not move blocks through active/current/completed sections.
- Keep detailed proof output in tests or, when genuinely necessary, focused QA/decision documents.

## 12. Final Closure Target

Life OS reaches product closure when the Z1 outcome is met: every non-external-gated visible capability is connected end to end, projections remain consistent after reload, local operation is recoverable, accessibility and performance gates pass and the application supports sustained real personal use without a critical blocker.
