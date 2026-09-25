# Life OS Roadmap

**Status:** Active
**Product mode:** personal-only; hosted single-owner target; current runtime local-first until cutover
**Design truth:** Life OS – Linear Calm Dark Command Center / Dashboard V5
**Detailed status:** `docs/product/capability-registry.md`
**Completed sequence:** C1 → C2 → C3 → K1 → H1/H2 → N1 → A1 → Z1 (technical baseline)
**Current Product Context:** Product Reorientation — Accepted #34 operating target + #39 Goal Journey

**Product Reorientation:** Product Target v0.4, the Target Model Decision Package,
the Issue #34 hosted-single-owner/core-entity target, and the Issue #39 Goal Journey target are accepted. The durable
product sequence is persisted below. Concrete work still starts only from confirmed
GitHub Issues and Project items. Issue #3 / R2-13 remains preserved
pre-reorientation work, not approved next delivery. The accepted plan does not
itself authorize a product `DELIVER` contract; each implementation slice still
requires its own explicit work contract and acceptance gate. This roadmap does
not mirror normal Issue/Project transitions.

## Accepted Product Plan — #34 sequence

The accepted Product Plan turns the target model into one ordered path toward
the primary Project-to-Day outcome while separating runtime proof from product
migration. The sequence is permanent product scope; GitHub Project #3 remains
the operative queue for issue status, priority and work type. Operationalization
does not change capability truth or authorize a product implementation by itself.

Accepted order:

1. a separately authorized synthetic whole-app runtime/security/recovery experiment;
2. complete the existing PP1 product-acceptance gate;
3. Core Task / Project Interaction;
4. PP2 Skill Development Planning;
5. PP3 Higher-Order Context in Weekly Planning;
6. PP4 Project-to-Day Loop Closure;
7. Hosted Runtime Cutover only after whole-app/runtime/security/data gates and a
   separate migration authorization.

The runtime experiment is architecture evidence, not a migration or cutover. It
may proceed before the UX sequence so later architecture work is evidence-based.

### PP1 — Goal Outcome Planning

**Outcome:** Goal becomes one guided completion Journey with domain-specific Goal
Milestones and explicit Outcome Criteria / Definition of Done. The Journey has
exactly one Current Goal Milestone at a time; parallel work stays below it in
Projects/Tasks. Goal Achievement and Milestone completion remain explicit and are
never derived automatically from Task Completion; no artificial generic Goal
percentage is introduced.

**Direct dependency:** Accepted Product Target v0.4 and the accepted Target
Model Decision Package. PP1 establishes the Goal planning semantics required by
the later blocks.

**Acceptance boundary:** Issue #39 USER ACCEPTED the Goal Journey target after the
real-product A-v2 rejection. A separate DELIVER contract must implement the
single-Current-Milestone Journey, read/work-first Goal Detail, explicit planning
mode and Milestone/Goal review behavior. This roadmap does not authorize that
implementation by itself.

### Core Task / Project Interaction

**Outcome:** Task capture becomes title-first and progressively disclosed; Task
Detail becomes read-first. Project Detail keeps the accepted read-first workbench
and makes purpose/outcome, status, deadline, milestones, Tasks, blockers,
progress signals, current milestone, Resources/artifacts and one next executable
action understandable without a management-form wall.

**Direct dependency:** Existing PP1 Goal semantics and the accepted #34 shared
entity grammar. The USER ACCEPTED #39 Goal Journey target is binding; A-v2 is
retained only as implementation/history evidence where #39 supersedes it. Only explicit Task Dependencies create
READY/BLOCKED; Project Milestones remain Project-owned and do not create execution
blocking.

**Acceptance boundary:** A separately authorized delivery contract must define the
bounded Task/Project UX slice and prove the real Manual flow. No generic progress
engine, new universal Milestone model or runtime migration is implied.

### PP2 — Skill Development Planning

**Outcome:** Skill becomes a usable development plan with domain-specific Skill
Milestones, Evidence / Practice / Recency, Targets and explicit Prerequisites /
Related Relations. No inferred graph edges or mastery percentages are used.

**Direct dependency:** PP1's accepted higher-order planning semantics, plus the
existing canonical Skill and Resource / Evidence boundaries.

**Acceptance boundary:** A later contract must define the Skill development
model and its evidence semantics before delivery. Skill-Map visualization and
automatic mastery inference remain outside this plan block.

### PP3 — Higher-Order Context in Weekly Planning

**Outcome:** Existing Planner Queue and Calendar remain user-controlled while
Project / Goal / Skill / Milestone context makes selection more explainable.
Task Dependencies remain the hard execution gate. There is no autonomous
Task selection or automatic weekly planning.

**Direct dependency:** PP1 and PP2 provide the higher-order semantics; the
existing user-controlled Planner Queue, Calendar and dependency model remain
the execution boundary.

**Acceptance boundary:** A later planning-context contract must prove
explainable context and preserve user choice, dependency readiness and current
projection behavior. It does not authorize autonomous planning.

### PP4 — Project-to-Day Loop Closure

**Outcome:** Close the connected flow:

```text
Project / Goal / Skill context → executable Task → dependency-ready selection
→ weekly/day planning → execution/completion → Today + Review
→ higher-order outcome/evidence/progress context
```

Existing accepted Dashboard, Inbox, Today, Calendar and Portfolio flows are
integrated rather than rebuilt. PP4 is the completion gate for the primary
Project-to-Day objective and uses the accepted Project-to-Day Completion
Definition from Issue #13.

**Direct dependency:** PP3, the accepted canonical Task / Project / Goal /
Skill / Milestone semantics, and the existing daily planning, execution and
review projections.

**Regression constraint:** Existing accepted Health / Fitness / Nutrition
Daily-Loop capabilities must not regress. Habits, today's Meals / Calories,
Training and Weight projections must remain functional through Project-to-Day
Closure. This creates no new Health / Fitness / Nutrition feature scope.

**Acceptance boundary:** A later PP4 contract must prove the end-to-end loop,
dependent projections and reload stability while preserving the regression
constraint. It does not authorize new Health / Fitness / Nutrition features.

### Plan-wide boundaries

- The product order after the separate runtime experiment is `PP1 acceptance →
  Core Task / Project Interaction → PP2 → PP3 → PP4`; later blocks do not bypass
  earlier semantic or acceptance gates.
- Issue #3 / R2-13 is `RESHAPE/REUSE PRESERVED WORK + DEFER`; it remains
  blocked/preserved and is not reactivated by this plan.
- Graph / Canvas, Skill-Map visualization, Gap Detection, Templates,
  Journal-depth work, Obsidian write-back / sync, AI and hidden legacy suites
  remain deferred, optional or externally gated as already accepted.
- Historical R2 sequences remain evidence only and are not the operative queue
  or an automatic successor to PP1 → PP4.

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

- Z1 is a completed technical baseline; it is not a valid product-acceptance claim after the real user test.
- V5 frontend and navigation: broadly present, with R2 surface-function and layout gaps now binding.
- Next.js/Supabase/Auth/RLS architecture: established.
- Inbox, Tasks, Today and Calendar task flows: connected with remaining depth gaps.
- Project/Goal workbenches: connected with remaining depth gaps.
- Resources and Skills: connected with graph/search/management gaps.
- Nutrition: recipes, ingredients, meals, weekly planning and grocery are connected; R2-05 fully USER ACCEPTED on 2026-09-07.
- Health & Fitness: Mood, Sleep, Weight, Habits, Running and Strength are connected; R2-05 fully USER ACCEPTED on 2026-09-07.
- Coding, Education and Work suites plus Notes, Inventory and Wishlist are hidden/retained or folded/externalized; Areas remain canonical context.
- R2-09 and R2-10 are USER ACCEPTED on 2026-09-09; R2-11 is USER ACCEPTED with Decision A; R2-12 is USER ACCEPTED. R2-13 has no committed capability on the integration branch; earlier local R2-13 work is separately preserved and not approved. R2-14–R2-17 are historical product ideas from the pre-reorientation Option A planning, not current operative or binding future work. The accepted target keeps Journal Life-OS-owned and defines Skill Graph semantics, while their implementation/depth gaps remain separate.
- The accepted Product Plan is the #34 sequence with the #39 Goal Journey target inside PP1; product implementation remains
  individually authorized by explicit GitHub work contracts, and this roadmap
  does not create a product `DELIVER` contract.
- Personal AI Assistant: not started as a production capability.
- Operation: local-first ready; private remote is optional and not active.

Capability-level truth is maintained in `docs/product/capability-registry.md`.

## R0 – Product Rebaseline & Visibility Reset

R0 replaces the former AI1 continuation point. It changes product priority and visibility only: existing feature code, migrations and data remain retained. No product capability is implemented by R0.

Active navigation contract:

```text
PRIMARY
Dashboard · Inbox · Today · Calendar · Portfolio · Resources

DOMAINS
Health & Fitness · Nutrition

PERSONAL
Journal

UTILITY
Settings
```

Portfolio owns Task / Project / Goal / Skill management. Resources owns knowledge
and references. This navigation contract incorporates the 2026-09-07 product
consolidation: Coding, Education, Work, Notes, Inventory and Wishlist leave active
navigation; routes/code/data remain retained. Anti-Rot, Challenges, Shop and
Entertainment remain hidden. Areas are preserved. Central context, not central
file ownership: GitHub owns repositories, Sciebo/filesystem/LaTeX own document
files and Spreadsheet owns flexible Inventory/Wishlist data. No connectors,
external API, duplicate operational storage or destructive cleanup.

The following R0 audit is historical evidence, not current navigation status.

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

## 4. Historical Product Plan & Delivery Sequence

This section records the completed technical baseline and retained historical
product planning. It does not define the current PP1 → PP4 order; Product
Reorientation superseded it with the accepted Product Plan above. A1 suite
depth is no longer a completion obligation. This is not a live status queue.
Concrete work starts only from a confirmed GitHub Issue; current implementation
truth comes from the Capability Registry, code, tests and Git.

| Order | Block | Outcome | Main scope | Depends on | Non-goals |
|---:|---|---|---|---|---|
| 1 | C1 Core Work Graph | Task / Project / Goal / Skill / Resource form one coherent, editable and inspectable spine | relation integrity, ownership, lifecycle, Task context, graph read models | established canonical entities | redesign; project-management engine; broad refactor |
| 2 | C2 Weekly Planning Calendar | the user turns the core graph into a realistic week | week-first queue, occurrence scheduling, conflicts, routine management | C1 graph semantics | duplicate Calendar entities; drag/drop before accessible controls |
| 3 | C3 Daily Companion Loop | Dashboard, Inbox and Today support capture → execute → planned-vs-done → review | daily protocol, projections, carry-over and review truth | C2 occurrence/schedule contract | AI briefing; gamification |
| 4 | K1 Knowledge Base | Resources become searchable context and evidence across the core graph | typed relations, backlinks, search, archive and evidence workflows | C1 relation semantics | decorative graph; embeddings without decision |
| 5 | H1/H2 Health and Fitness | health facts and fitness plans participate in the daily loop through occurrences | health records, habits, running, strength and linked execution | C2/C3 scheduling and daily protocol | diagnosis; Garmin dependency |
| 6 | N1 Nutrition | meal planning and completion participate in weekly/daily execution | recipes, meals, portions, groceries and occurrence links | C2/C3 scheduling and daily protocol | medical claims; unsupported macro precision |
| 7 | A1 Work/Education/Coding/Inventory (retained baseline) | historical area workflows reuse the core spine | code/data retained; suites now hidden/folded/externalized | C1 and K1 conventions | further suite completion; parallel Tasks/Projects/Resources |

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

## 4.2 Completed Work Block: C1.1 – Work Graph Integrity & Task Context

**Status:** Completed. The next active block is **C2 – Weekly Planning Calendar**.

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

**Completed.**

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

## 4.3 Completed Work Block: C2 – Weekly Planning Calendar

**Historical status:** C2-01 through C2-04 completed. At the time, the next
planned scope was **C3 – Daily Companion Loop**; this historical note does not
define the current product context or an approved delivery block.

**Outcome:** Calendar remains a temporal projection of canonical executable
Tasks. Week View is the primary planning surface; it does not create a second
Task, recurrence or domain-record truth.

### Bounded C2 sequence

#### C2-01 – Week Planning Surface & Canonical Planner Queue

**Completed.** The Manual Week View presents exactly one deterministic queue of
open, unscheduled canonical Task Occurrences. It keeps Project, direct/via
Project Goal, Skill, recurring and typed schedule-source context visible. A
keyboard-accessible selection opens the existing source-aware Task scheduling
boundary; schedule, reschedule, duration and unschedule refresh the Week
projection immediately and remain stable after reload. Free calendar events,
relation filters and pointer drag/resize remain outside this slice.

#### C2-02 – Pointer Drag/Drop + Resize

**Completed.** Queue-to-Week pointer placement, cross-day block movement and
bottom-handle duration resize use only the established authenticated,
source-aware schedule/reschedule actions. The Week grid maps relative pointer
positions to one 15-minute snap contract, presents loaded-block conflicts for
explicit confirmation and leaves cancelled or invalid drops unchanged. The
Inspector remains the complete keyboard/button alternative; reload proofs cover
canonical Task, Meal and Running-source projections.

#### C2-03 – Day/Month Projection + Deadline/Milestone View

**Completed.** Manual Day and Month now read the same canonical task schedule,
task deadline, Project deadline and Goal target signals as Week without
creating a parallel event model. Generated recurring Task Occurrences render
as planned work while templates remain absent. No canonical milestone model
exists, so no fake milestone markers or management surface were introduced.

#### C2-04 – C2 Integrated Proof

**Completed.** The focused C2 proof suite confirms the deterministic Planner
Queue; Week scheduling, rescheduling, resizing and unscheduling; the pointer
comfort layer with visible conflict cancellation; keyboard/Inspector fallback;
Day/Week/Month consistency; separate deadline, Project-date and Goal-target
signals; generated (but never template) recurrence occurrences; reload-stable
Meal, Review, Running and Strength source tasks; and the identical canonical
schedule projection in Today and the Dashboard Agenda. C2 adds no filters,
free events, Project/Goal milestone model or parallel Calendar entities.

## 4.4 Completed Work Block: C3 – Daily Companion Loop

**Status:** Completed. The canonical Target Runtime now proves one reload-stable
daily loop across Dashboard, Inbox, Today, Calendar and Daily Review: capture,
planned/open/done projection, source-aware completion and an explicit atomic
carry-over decision.

**Outcome:** Dashboard, Inbox and Today support capture → execute →
planned-vs-done → review using the established C2 occurrence and schedule
contract. Its stable scope and non-goals are defined by the C3 row in the
Permanent Delivery Sequence; the next prompt selects its bounded slice.

## 4.5 Completed Work Block: K1 – Knowledge Base

**Status:** Completed. The canonical Target Runtime proves Resource capture,
edit, deterministic active search, inspector navigation, Core-Graph context,
separate Skill Evidence and non-destructive archive/restore after reload.

**Outcome:** Resources become searchable context and evidence across the Core
Work Graph, using the K1 stable scope in the Permanent Delivery Sequence.

## 4.6 Completed Work Block: H1/H2 – Health and Fitness

**Status:** Completed. The canonical Target Runtime proves reload-stable Mood,
Sleep, Weight and Habit records, plus source-linked Running and Strength plans
whose Task Occurrences project consistently to Calendar, Today and Dashboard.
Generic Task completion cannot invent a Run, Session or Set Log; a real Run or
Strength Session with a real Set Log owns completion.

**Outcome:** Health facts and fitness plans participate in the daily loop
through canonical occurrences, using the H1/H2 stable scope in the Permanent
Delivery Sequence.

## 4.7 Completed Work Block: N1 – Nutrition

**Status:** Completed. The canonical Target Runtime proves the Nutrition loop:
Recipe Ingredients and persisted Meal servings derive Grocery demand; source-aware
Meal↔Task scheduling projects identically to Calendar, Today and Dashboard; and
canonical Meal completion remains reload-stable with its linked Task.

**Outcome:** Nutrition records and their scheduled Task Occurrences support
honest daily meal planning, completion and grocery derivation using the N1
stable scope in the Permanent Delivery Sequence.

## 4.8 Completed Work Block: A1 – Work, Education, Coding and Inventory

**Status:** Completed with deferred Agent-Session depth. The canonical Target
browser proof covers Coding Projects/Sessions, Education Projects/Literature/
Learning Logs, Work Projects/Logs/Wiki and Inventory/Wishlist/Purchase
Decisions after reload. Manual and Empty Agent Hub routes are an honest
non-interactive Prepared state because `agent_sessions` remains a separately
deferred retained model.

**Outcome:** Work, Education, Coding and Inventory use their existing canonical
entities and shared Task/Project/Skill/Resource context without creating
area-local duplicate truths.

The permanent feature sequence ends with A1. The Post-A1 decision below selects
Z1 for local product closure; AI1 remains explicitly deferred pending its own
separate decision.

## 4.9 Post-A1 Product Closure Decision

**Decision:** The completed C1→A1 sequence is sufficient for the active
personal daily-control product. The remaining mandatory work is predominantly
local reliability, recovery, UI truth and quality hardening; it does not
justify reactivating AI1, integrations, Motivation surfaces or a new domain
feature sequence.

### Remaining Registry Gap Classification

| Classification | Remaining Registry entries and verified operating findings | Product decision |
|---|---|---|
| `CORE_COMPLETION` | Inbox Note route; Inbox Skill route; Inbox planning-signal truth; Urgent time-block control | The active capture/triage surface must either reach its existing canonical target or show a non-interactive, explicit Prepared state. No new entity model belongs here. |
| `LOCAL_HARDENING` | Task planning and completion Direct Data API boundary; Meal/Workout/Review schedule-source boundaries; visible Calendar conflict gate; Literature library; Education dashboard; Work Wiki; Work dashboard; Restore smoke; canonical Target versus default CLI stack; technical test-data isolation; active-profile `UI_ONLY` controls; Accessibility; 4K/Desktop/Mobile smoke; local performance and focused E2E harness reliability | Required for trustworthy local operation. Z1 hardens existing canonical paths, recovery and proof infrastructure without expanding the product model. |
| `OPTIONAL_ENHANCEMENT` | Focus Time; Dashboard nutrition target/depth; Today Agenda week/month; Active Portfolio pins; related-context search; Review history; Calendar filters, override audit and schedule history; Project/Goal evidence display, restore/undo, review cadence and pins; Notes/Wiki depth; Manual nutrition estimate; persistent grocery/pantry; Recipe detail; Journal linkage; Mental Health overview depth; Course/Learning path; Coding knowledge map; Scientific metadata; Writing resources; Personal dashboard | Useful depth, but the current personal daily-control loop remains usable without it. Do not add to Z1. |
| `DEFERRED_PRODUCT` | Anti-Rot and Challenges surfaces; Inbox AI suggestion review; Resource/Skill graph visualization; embeddings/semantic search; Coding Agent Sessions and Prompt Library; all Personal AI Assistant capabilities and its Resource-search exposure; Public SaaS | Retained or prepared only. They remain outside active product closure and must not receive hidden feature work in Z1. |
| `EXTERNAL_GATE` | Weather; Receipt OCR; Garmin import; GitHub API; DeepSeek provider; private remote | Requires a separately approved provider, access or privacy/security scope. Local manual alternatives remain the complete active path. |
| `DECISION_REQUIRED` | Free Calendar events; Project milestones; Goal key results/milestones; Project/Goal logs; Progress engine; Files/attachments; Unit conversion; Macro/calorie engine | These need explicit product, data or privacy semantics before implementation. They are not Z1 work. |

Known literature and Work-Wiki create-and-link flows are classified as
`LOCAL_HARDENING` because the canonical Resource remains valid, but the user
must never be left with an unexplained partial relation. Their richer metadata
is an `OPTIONAL_ENHANCEMENT`.

### AI1 Decision Boundary

AI1 remains deferred. A future AI1 decision/security stage must first define a
provider, secret handling, tool-permission model, per-write confirmation,
prompt/conversation persistence and retention, auditability, and an explicit
failure/degraded mode. An LLM never receives direct database access. None of
these decisions or implementations are part of Z1.

## 4.10 Completed Work Block: Z1 – Final Local Product Closure & Hardening

**Status:** Completed. The closure audit confirms that the scoped
`CORE_COMPLETION` and `LOCAL_HARDENING` findings have focused current proof.

**Outcome:** Life OS is operable as a reliable personal-only, local-first
product: active controls are truthful, canonical Target operation and recovery
are reproducible, source-linked invariants resist direct-write bypasses, and
the active surfaces have current usability and focused-proof evidence.

### Z1 Scope

- connect or honestly prepare the remaining Inbox Note/Skill/planning and
  urgent-time-block controls using existing canonical entities only;
- harden source-linked Task schedule/completion boundaries against direct Data
  API bypass and prove owned, atomic behavior;
- make Education Literature and Work Wiki create-and-link atomic or provide a
  visible, reload-stable recovery outcome without duplicate truths;
- document and prove the non-sensitive canonical Target startup/migration
  identity, never treating the default CLI stack as Target by assumption;
- prove a data-preserving local backup→restore path for the canonical local
  runtime, including owned-data/RLS integrity checks, without remote use;
- isolate technical E2E data from personal Target data and make focused test
  commands deterministic without broad `content-state-system.spec.ts` work;
- audit active Manual/Empty controls for client-only pseudo-writes and convert
  unsupported controls to clearly non-interactive Prepared states;
- run current active-surface keyboard/label/status, 4K/desktop/mobile and
  bounded local performance smoke proofs, fixing only demonstrated blockers.

### Z1 Non-Goals

- no AI1, provider, external API, private remote or public SaaS work;
- no Anti-Rot, Challenges, Rewards, Shop or Entertainment reactivation;
- no graph visualization, embeddings, semantic search, Calendar free-event or
  milestone/progress-engine model;
- no grocery-commerce, pantry, persistent grocery, OCR or macro engine;
- no broad component, migration or legacy-test refactor.

### Z1 Completion

Z1 closes only after every scoped hardening path has a focused proof on the
canonical local Target, no active profile exposes a misleading write control,
backup/restore and runtime identity are reproducible without secret output,
and the required local quality checks pass. Optional, deferred, external and
decision-gated items remain explicitly classified rather than being marked
complete.

## 4.11 Completed Decision: Post-Z1 Product Decision

**Status:** Completed by the explicit user decision that opens R2.

**Decision:** Z1 remains completed as a technical baseline: canonical paths,
security/recovery work and its historical focused evidence remain valuable.
The real product acceptance failed because current visible surfaces contain
non-working controls, layout collisions and unjustified empty space. Z1 must
not be represented as valid product acceptance, and historical implementation
or backend evidence cannot alone restore a `CONNECTED` surface claim.

## 4.12 R2 – Product Reality Recovery & Surface Completion

**Status:** R2-00 completed (contract rebaseline). **Product Context at this
historical R2 boundary:** Product Reorientation — Target Model Accepted; the
accepted PP1 → PP4 Product Plan now supersedes the historical R2 delivery
sequence. No new R2 delivery slice is implied.

**R2-01 status:** Completed; explicitly USER ACCEPTED on 2026-09-06.
Existing control, browser, layout and migration evidence is retained in the
Capability Registry and focused R2-01 tests.

**R2-02 status:** Completed; explicitly USER ACCEPTED on 2026-09-06.
Existing implementation, control and browser evidence is retained in the Registry.

**R2-03 status:** Completed; explicitly USER ACCEPTED on 2026-09-06.
Today and Calendar evidence remains in the Registry and focused tests, including
the 06:00–00:00 equal-hour, full-viewport Calendar proof.

**R2-04 status:** Completed; explicitly USER ACCEPTED on 2026-09-07.
The user accepts Dashboard, Inbox, Today, Calendar, Portfolio and Resources.
Existing implementation, control, browser and visual evidence is retained.

**R2-05 status:** Completed; explicitly USER ACCEPTED on 2026-09-07.
The user accepts Health & Fitness and Nutrition in full. Existing implementation,
control, projection, reload and responsive evidence remains in the Capability
Registry and focused tests. This is administrative closure after user acceptance.

**R2-09 status:** Completed; explicitly USER ACCEPTED on 2026-09-09.
The user accepts the current Project/Milestone/Artifact direction and the
historical Work Graph planning direction. Existing implementation, control,
reload and visual evidence is retained in the Capability Registry; no redesign
in closure and no future delivery approval is implied.

**R2-10 status:** Completed; explicitly USER ACCEPTED on 2026-09-09.
Canonical Work Graph & Task Dependencies:
IMPLEMENTATION_PASS on 2026-09-09. Same-Project Task dependencies, derived
availability and database-enforced completion are delivered. Current evidence is
in the Capability Registry; exact lifecycle semantics are in the
[Task Dependency decision](docs/architecture/task-dependencies-r2-10.md).
Implementation commit: `ec3c62f`. Existing evidence is preserved; no functionality
changes belong to this administrative closure.

**R2-11 status:** Closed; explicitly USER ACCEPTED on 2026-09-10.
**Accepted target ownership:** Life OS / PostgreSQL remains canonical for
operational context and Resource identity; Obsidian owns long-form Knowledge
Content and Notes. Retained synthetic Lab evidence is historical evidence,
never Product Runtime. The explicit user decision closes the gate; it does not
fabricate missing human pilot measurements.

**R2-12 status:** Closed; explicitly USER ACCEPTED on 2026-09-10.
Readable projection implementation `e821a23` and existing evidence are retained.

**R2-13 status:** Preserved pre-reorientation planning and implementation context;
no committed capability exists on the integration branch and no delivery is
approved. The historical scope is a selected Project export with one plugin-free
Canvas: canonical dependency workflow, ordered Milestone groups, Backlog and
secondary context. Preserve user layout/cards/edges through an explicit
presentation-only update; no sync, watcher or write-back.

The bounded Project-context Task Create correction is delivered in `6298406`.
The historical feasibility evaluation used that improved Life-OS baseline: Project
Work, Milestone and Backlog creation reuse the canonical form and validated
context. Compare identical synthetic data, emphasizing dependency paths,
parallelism, reentry and Skill/Resource understanding rather than Create UX.
Prepare the human comparison without treating technical navigation as user
acceptance. Obsidian requires a clear additional understanding benefit and
acceptable maintenance. That historical comparison predates the later explicit R2-11/R2-12 acceptance decisions and remains evidence only.

**R2-07 status:** Journal ownership is resolved in the accepted target: Journal
remains fully Life-OS-owned. The chronological workspace and current
control/browser evidence remain implementation evidence; missing relations,
Today projection and final user acceptance are separate depth gates.
The canonical chronological workspace implementation and current control/browser
evidence are recorded in the Capability Registry; implementation is not closure.

**Outcome:** Recover the actual user-facing product contract without replacing
V5 or the established architecture. A surface is complete only after all of
its visible controls, layout bounds and Manual behavior pass current Surface
Acceptance; technical Z1 evidence is retained but is not product acceptance.

### R2-00 – Product Reality Rebaseline & Surface Acceptance Contract

**Status:** Completed.

**Scope:** Reclassify Z1, record the binding product/design contracts, reset
contradicted Registry claims honestly, establish the Surface Acceptance Gate
and mark historical dashboard/content-state references as non-authoritative
where they conflict. No product code, layout implementation, migration or
dependency belongs in this slice.

### Historical R2 delivery order — pre-reorientation

The following order is retained as historical product planning. It is not the
current PP1 → PP4 delivery sequence; Product Reorientation superseded it with
the accepted Product Plan above. Historical R2 work still requires a confirmed
GitHub work contract if it is ever reconsidered.

1. **R2-01 – Global Feedback + Dashboard Surface Completion** — app-wide
   success toast; Dashboard control inventory and real interaction proof;
   Quick Thought, Daily Control, Month/Week/Day Time Progress, Meals, fitness,
   Agenda, habits and portfolio paths; remove or connect the task CTA, remove
   unjustified helper copy, correct Weight Goal spacing and prove no Nutrient
   Balance/Calendar overlap or reclaimed-Bottom-Zone whitespace.
2. **R2-02 – Inbox Surface Completion** — real search, remove Inbox Quick
   Capture, editable/persistent triage fields, selectable Outcome Route,
   persistent Planning Signals and every triage path.
3. **R2-03 – Today / Calendar Role Correction** — Today as source-first local
   day log/documentation without creation, planning or recurrence management;
   Calendar owns scheduling, Portfolio owns entity creation/management.
   Calendar Day/Week/Month controls and full-height
   useful planning surface without an empty Bottom Zone.
4. **R2-04 – Portfolio IA & Entity Depth** — Tasks/Projects/Goals/
   Skills sidebar sub-navigation and one Portfolio list filtered by entity type,
   plus dedicated create and ID-detail surfaces, shared entity-specific fields,
   canonical relation management,
   evidence and honest progress; Overview is not primary inline creation.
   Resources retain their own create/detail routes and knowledge ownership.
5. **R2-05 – Health / Fitness / Nutrition Surface Completion** — full
   primary desktop overview viewport and one-page Health detail defaults; growing
   detail lists scroll internally and explicit deep interactions may expand. Shared
   Health detail composition, Habits statistics/history/management and
   Dashboard creation/quick logging; selectable,
   persistent Nutrition meal-planner slots, safe canonical drag/drop and accessible
   moves; tracking/logging Overview, weekly Meal Planner, Recipes library and
   derived Grocery workspace with desktop one-page defaults.
6. **R2-09 – Product Boundary & External Resource References** — Life OS owns
   work identity, context, planning and memory; specialized artifacts stay externally
   owned and use existing Resources/relations. Audit fields; prove Project create,
   link/unlink, external opening, Task/Goal/Skill regression, search and responsive
   reload. Project Detail defaults to a read-first workbench with explicit edit/
   management disclosures. Explicit Project-specific Primary/Additional Work Artifact roles are
   separate from supporting References; a minimal relation-role migration is
   permitted after audit, with isolated proof before local Target application.
   Project depth within R2-09 now includes canonical Project Milestones (open,
   active, done), optional same-project Task assignment, explicit ordering and
   task/milestone-derived counts. A minimal audited schema slice is permitted,
   with fresh Git-only/RLS/browser proof before local Target migration. No sprint,
   team workflow or automatic completion. R2-09 is USER ACCEPTED on 2026-09-09.
   No new global entity, API, sync, secrets or document copy. Depends
   on R2-04/R2-05. Accepted Project scope; no Journal acceptance.
7. **R2-10 – Canonical Work Graph & Task Dependencies** — same-Project
   Finish-to-Start dependencies, canonical guards and useful Ready/Blocked views.
   Depends on R2-09 USER ACCEPTED; independent of Obsidian.
8. **R2-11 – Obsidian Feasibility Lab** — synthetic comparison and Decision Gate A;
   depends on accepted R2-10. No automatic continuation into integration.
9. **Historical Option A delivery sequence — pre-reorientation (preserved, not approved future work): R2-12 → R2-13 → R2-14 → R2-15 → R2-16 → R2-17** —
   projection, Project Map, security/conflict contract, controlled commands,
   templates, then Skill/Goal graph. These historical ideas retain their original
   scope and acceptance notes, but no block is current or authorized. Any future
   use requires a newly accepted product direction and work contract; this history
   is not implementation permission or permission to use personal data.
10. **R2-07 – Journal Reconciliation** — paused pending an explicit reconciled scope; Decision A is already selected. Reconcile and schedule its remaining scope explicitly. Preserve the
    existing chronological workspace and pending acceptance. Decide between full
    Life OS Journal ownership and Obsidian long-form text with Life OS date,
    context, relations and tracking. No migration, deletion or ownership change
    is implied. Recurrence remains Task/Calendar-owned; no fabricated context.
11. **R2-08 – Skill Map** — PAUSED / SUPERSEDED under selected Decision A. Keep the
    ID and retained Coding shell. Explicitly reconcile its delivery obligation with R2-17 rather than building a competing graph;
    do not build both. Canonical Skills/Evidence remain active.
12. **R2-06 – Full Active Product Acceptance** — terminal block, retaining its ID.
    Depends on the accepted R2-09/R2-10 outcomes, completed architecture decisions,
    every selected branch capability and reconciled R2-07/R2-08 obligations.
    Inventory the entire active contract; prove live controls, navigation/writes,
    reload, bounds/whitespace, console/hydration, screenshots, Design-Taste and
    explicit USER ACCEPTED. Hidden legacy suites remain outside completion.

R2-01 through R2-05, R2-09 and R2-10 remain accepted. R2-11 is USER ACCEPTED;
the accepted target separates Life-OS operational truth from Obsidian
knowledge-content ownership. R2-12 is USER ACCEPTED. R2-13 has no committed
capability on the integration branch; earlier local work is separately preserved
and not approved. R2-14–R2-17 are historical pre-reorientation ideas, not
current operative or binding future work. Product Reorientation is the current
product context and the accepted PP1 → PP4 Product Plan is the current product
sequence. Operative task status lives in GitHub Project #3 and approved Issues.
Pausing R2-07/R2-08 changes future delivery,
not existing navigation, implementation evidence or data. R2-06 cannot silently
skip unresolved decisions; exclusions require explicit user deferral.

### R2-10 – Canonical Work Graph & Task Dependencies

**Outcome:** executable next work, blockers and parallel paths are understandable
and enforced by the same canonical Life OS logic on every write path.

**Scope:** directed Finish-to-Start edges with multiple predecessors/successors,
same-user and same-Project endpoints, no self-edge, duplicate or cycle. Keep
Task lifecycle separate from derived availability (READY/BLOCKED; V1 adds no
date-waiting state and preserves existing planning/date filters). Membership,
context, evidence and artifact edges never become execution dependencies.

Use Project Workbench and Task Detail to add/remove dependencies, explain blockers
and show Ready/Blocked counts and active Projects without an executable next Task.
Revalidate dependent Dashboard/Calendar/Today read models where affected, retaining
Dashboard control, Calendar temporal planning and Today daily-memory roles. No
Calendar completion CTA or Today planner is introduced.

Server/database guards must prevent blocked completion through every alternate
Task, direct API/RPC and coupled domain-source path. Concurrency must not admit
cycles or bypass completion rules. Reopening a predecessor blocks open successors;
already completed successors remain completed with a visible inconsistency.
Archived/removed predecessors never silently satisfy a dependency. Project moves,
unassignment and lifecycle changes must not break same-Project edge integrity.
Only the minimal audited local model/migration is in scope once R2-10 is active.

**Non-goals:** Obsidian, Canvas, Skill Graph, Templates, Goal dependency engine,
cross-Project dependencies V1, automatic rescheduling or invented progress scores.

**Acceptance:** serial and parallel paths, multi-predecessor blocking, cycle and
ownership rejection, completion-bypass and concurrent-write proof, reopen/archive
behavior, visible feedback and reasons, reload-stable projections, profile
separation, focused browser/Surface Acceptance and explicit USER ACCEPTED.

### R2-11 – Obsidian Feasibility Lab / Decision Gate A

**Outcome:** the user can decide whether a graph client reduces daily mental load
and maintenance compared with current Life OS. This is a bounded lab, not a
production integration. Use only synthetic data: at least one Project, four
Milestones, 20–30 Tasks with serial/parallel dependencies, one Goal, three Skills,
six Resources, one Primary and multiple Additional Work Artifacts.

Compare Life OS + Obsidian Core/Canvas, TaskNotes + Canvas Bases, and current
Life OS; use a small native React-Flow prototype only if necessary within the lab
scope. Verify then-current tool capabilities and plugin trust before lab use.
Evaluate return-to-Project orientation, current Milestone, next ready work,
blocker explanation/change, parallelism, Resource/Artifact and Skill context,
manual upkeep, RAM/CPU/swap, plugin dependency and maintainability. The current
pilot scope requires at least three separated sessions with Project/context reset,
the same questions in Life OS and Obsidian, practical answer timings and subjective
clarity/mental-load/maintenance ratings. Agent retrieval timings do not establish
human comprehension or subjective user ratings. Retain the longer-term daily-value
question rather than treating rapid repeated navigation as a usage pilot.

Within this lab only, prototype generated/user Note separation and a controlled
Core-Canvas merge: preserve existing node positions, free cards and exploratory
edges when adding a synthetic Task. Generated dependencies remain typed,
directed presentation of canonical truth; exploratory edges have no operational
effect. These bounded synthetic experiments do not start R2-12 or authorize
product code, personal data, synchronization or write-back.

**Decision Gate A:** stop for an explicit user architecture decision:

- **A:** Life OS canonical + Obsidian projection/command client; existing domain
  logic stays authoritative, with bridge/auth/conflict/maintenance costs.
- **B:** Obsidian-first, including TaskNotes/Canvas Bases as candidates; only as
  an explicitly scoped product migration with one writer/owner per field.
- **C:** bounded native Life OS graph; no sync layer, but owned graph UX costs.
- **D:** another stack, including Notion-first only as a deliberate alternative;
  never a third writer or an implicit exception to local-first/privacy rules.

No demonstrated Obsidian value means stop that integration. Options B/C/D require
an updated architecture, security and roadmap scope before implementation; the
historical Option A sequence below does not automatically apply to them.

### Historical Option A planning branch — pre-reorientation (preserved, not approved future work)

The following table is retained as historical product planning only. It does not
define an approved successor, current delivery order or automatic continuation.

| Block | Outcome and stable scope | Boundary / acceptance |
|---|---|---|
| R2-12 – Obsidian Projection Foundation | User-triggered “Für Obsidian exportieren” from one Project Detail; authenticated bounded canonical graph → stable life_os_id identity with collision-safe readable Markdown paths, rename/user-content mapping, Properties, Wikilinks, generated/user sections, content hashes and manifest → local ZIP download | No server Vault path/access, installation, external fetch, migration/revision field, write-back, plugin, watcher or Canvas. Deterministic repeat export, rename/dependency/archive truth, deduplication, merge preservation, ownership, performance, download and isolated synthetic Core smoke remain the accepted evidence boundary. USER ACCEPTED 2026-09-10. |
| R2-13 – Project Map / Canvas | Generated Project Canvas with Milestone groups, dependency edges, parallel paths, optional Primary Artifact/Resources, stable node IDs and inclusion in the existing Life OS export package | Work flow first: READY/BLOCKED/DONE compact nodes, sort_order groups, Backlog, directed dependencies with serial/parallel paths; context separate. Prove a readable 24-Task Canvas and three manually moved nodes, free card, exploratory edge, new node and updated canonical state survive an explicit Canvas/manifest presentation merge. No sync, bridge, watcher, plugin or write-back. Product acceptance remains pending; operative status is tracked in Project #3 / Issue #3. |
| R2-14 – Obsidian Sync Security & Conflict Contract | Decision record for local pairing/auth, scoped permissions/revocation, endpoint boundary, expected revision, idempotency, conflicts, retries, offline queue/replay, delete semantics, secrets and community-plugin trust | Explicit user acceptance is mandatory before any write-back implementation; no DB credentials in plugin/Vault and no blanket last-write-wins. |
| R2-15 – Controlled Bidirectional Work Sync | Selected commands only: Task create/edit, dependency add/remove, milestone assignment, complete/reopen through the authenticated local bridge and existing domain boundaries | Prove one truth, canonical guards, no lost updates/duplicates, visible conflicts, safe retries/offline replay and preserved layout. Unrestricted automatic two-way sync remains outside V1 and needs another explicit security/conflict scope. |
| R2-16 – Project Templates & Automation | Versioned modular Project templates with Milestones, Tasks, Dependencies and supported Resource/Skill/Goal relations; preview, atomic instantiation and idempotency | Save template version; failure leaves no partial Project; retry creates no duplicate; never automatically overwrite running Projects. No autonomous background automation. |
| R2-17 – Skill / Goal Graph | Chosen client's evidence/practice graph: Skills with Tasks/Projects/Resources; Goals with Projects/Milestones/Tasks and outcome/evidence context | Canonical or labeled derived relations only; real source navigation, ownership, reload and usability proof. No fake mastery percentages, automatic Goal achievement from Task counts or Gap Detection without Target/Prerequisite model. Reconcile R2-08 explicitly. |

### Work Graph product gates

1. **Dependency Truth:** no blocked completion bypasses canonical guards (R2-10).
2. **Obsidian Value:** user confirms daily value from the pilot (R2-11); otherwise
   stop integration.
3. **Single Truth:** every editable field has exactly one canonical owner.
4. **Sync Reliability:** no silent conflicts, lost updates, duplicates or destroyed
   personal layouts; prove before accepting R2-15.
5. **Daily Value:** faster Project resumption and next-action discovery, clearer
   blockers, less sorting and no disruptive double maintenance. Reduce or discard
   the integration if the multi-day pilot fails this gate.

Later selected-branch proof spans Capture → Project → Milestone → Task →
Dependency → Ready/Blocked → Calendar → Dashboard → Completion → successor Ready
→ Today → Project Map → Resource/Artifact context → Review. A graph is optional
Deep Work depth; daily flows remain usable without it. Combined Life OS/client/
bridge load must not recreate critical RAM/swap conditions.

This plan does not authorize installing Obsidian/community plugins, using a
personal Vault, exporting personal data, cloud sync, Notion/external APIs, remote
DB access, direct plugin DB writes, Service Role use or deletion of existing
surfaces. These require their applicable explicit scope/approval; direct DB
credentials in Obsidian remain prohibited. The handoff is planning provenance,
not a second active roadmap; repository sources supersede its Downloads paths.

### R2 boundary

- No new product domain, migration, dependency, remote provider or parallel
  architecture is introduced merely to satisfy Surface Acceptance.
- Every visible control in R2 scope works, navigates to real depth, or is
  removed. `Prepared` requires an explicit user deferral and is not closure
  for a promised core control.
- Dashboard’s removed Bottom-Zone features remain removed; they cannot return
  through historical layout references.
- The historical R2 order is preserved as planning evidence, not as the current
  PP1 → PP4 sequence. R2-01 through R2-05 are accepted and closed; R2-09 and
  R2-10 are accepted. Product Reorientation and the accepted Product Plan are
  the current product context; R2-07 retains USER ACCEPTANCE STATUS: PENDING.

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

These headings describe stable domain scope, not delivery order. The sequence in
section 4 is historical planning evidence, not a current binding order.

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
- accessible controls before drag/drop/resize comfort.

Canonical Calendar filters remain a later, separately scoped read-surface
depth; they were deliberately not part of C2 closure.

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

### A1 – Retained Work, Education, Coding and Inventory Baseline

- No further independent suites; retain code, routes, tables and historical data.
- Coding/Education/Work remain Areas for canonical context and filters.
- Knowledge, Literature, Wiki and Notes fold into Resources.
- Learning/Work reflection belongs to Journal/Skill Evidence/Today by semantics;
  existing specialized logs are retained, not silently migrated.
- Repository/file/spreadsheet ownership stays external per PRODUCT.md.
- No area-local duplicate Tasks, Projects, Skills or Resources.

### AI1 – Personal Assistant

- target context accepted, but implementation remains deferred;
- first capability target: server-side, user-scoped read-only Morning Briefing;
- standard read allowlist and privacy exclusions are defined in the active
  contracts; no direct LLM database access;
- provider privacy/retention and credentials remain a gate before delivery;
- Evening Review, structured proposals and confirmed write tools require later
  contracts and do not create a current delivery sequence.

### I1 – Integrations & Analytics

- optional weather and Garmin only through their external gates; GitHub remains a manual Resource URL, with no planned API/sync;
- activity events;
- reports and trends;
- semantic search only after a privacy and permissions decision.

### Z1 – Technical Local Baseline

- active-surface `CORE_COMPLETION` and `LOCAL_HARDENING` findings from the
  Post-A1 decision only;
- no misleading active-profile controls or Demo leakage in Manual/Empty;
- reproducible canonical Target startup, migration identity and recovery;
- source-linked direct-write and partial-link integrity proof;
- focused active-surface 4K, desktop, mobile, accessibility and performance
  smoke coverage;
- technical test-data isolation and deterministic focused test harnesses;
- sustained personal-use period without a critical blocker.

Z1 evidence remains a technical baseline only. It is not a product-acceptance
claim after the Post-Z1 decision.

### R2 – Product Reality Recovery & Surface Completion

- app-wide feedback, control truth and no-overlap/no-unjustified-whitespace
  recovery across Dashboard, Inbox, Today, Calendar, Portfolio, Health,
  Fitness and Nutrition;
- full-viewport desktop guards plus `1920×1080` and Mobile usability guards;
- current control inventory and current browser proof, including mutation,
  navigation, reload, console/hydration and screenshots;
- Design-Taste review and explicit user acceptance of the active core product.

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

For a core-surface closure, this additionally requires a complete current
control inventory, direct browser interaction with every visible control,
navigation/write/reload proof where applicable, console/hydration review,
primary-viewport and `1920×1080` screenshots, a Design-Taste review and
explicit `USER ACCEPTED`. An `IMPLEMENTATION PASS` or historical technical
evidence does not close a core surface. `Prepared` cannot close a promised
core control without an explicit user deferral.

A data layer without its required user flow is not a completed feature.

## 8. Delivery Rules

- After workflow cutover, the approved GitHub Issue selects the concrete work. Product Issues reference the applicable block ID from this permanent sequence.
- Audit the Capability Registry, code, tests and Git before deciding the concrete gap inside that Issue/block.
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
- Entertainment (implemented and retained, hidden);
- Coding/Education/Work suites and Notes (hidden/retained, context folded into active canonical surfaces);
- Inventory/Wishlist (externalized to Spreadsheet responsibility; existing code/data/routes retained);
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

This file owns the permanent product-completion plan, accepted dependencies and
current product context. The current context is the accepted PP1 → PP4 Product
Plan; this file is neither the operative queue nor an implementation log. The
accepted plan does not itself authorize a product `DELIVER` contract, and an
approved delivery block remains subject to its explicit GitHub work contract
and acceptance gate.

- Normal feature work updates code/tests, the Capability Registry when capability truth changed, and its GitHub Issue/PR/Project status.
- Change the permanent plan only when its sequence, block outcome, dependency or material functional scope changes.
- Update current product context when it advances or is deliberately changed. An approved delivery block is optional and follows an accepted product direction; do not mirror normal Issue status transitions here.
- Keep detailed proof output in tests or, when genuinely necessary, focused QA/decision documents.

## 12. Final Closure Target

Life OS reaches product closure only when the R2 outcome is met: every active
visible capability required by the current product contract is connected end to
end, projections remain consistent after reload, local operation is
recoverable, accessibility and performance gates pass, every core surface has
passed Surface Acceptance and the user has explicitly recorded `USER ACCEPTED`.
Optional and explicitly deferred surfaces may remain unavailable, but must not
imply a functioning write or silently re-enter the active product scope.
