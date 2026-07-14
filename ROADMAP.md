# Life OS Roadmap

**Status:** Active
**Product mode:** personal-only, local-first
**Design truth:** Life OS – Linear Calm Dark Command Center / Dashboard V5
**Detailed status:** `docs/product/capability-registry.md`
**Long-term target:** `docs/product/life-os-final-completion-masterplan.md`

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
- Coding and Education have connected core workflows; Work and Life remain largely UI-only or incomplete.
- Personal AI Assistant: not started as a production capability.
- Operation: local-first ready; private remote is optional and not active.

Capability-level truth is maintained in `docs/product/capability-registry.md`.

## Active Work Block

- `K1.1 Portfolio, Resource & Knowledge Depth`: abgeschlossen.
- `A1.1A Coding Projects & Sessions`: abgeschlossen.
- `A1.1B Education Domain Foundation`: abgeschlossen.
- `A1.1B1 Education Projects & Literature Core`: abgeschlossen.
- `A1.1B2 Learning & Writing Logs`: abgeschlossen.
- `A1.1C Work Domain Foundation`: abgeschlossen.
- `A1.1C1 Work Projects & Work Logs`: abgeschlossen.
- `A1.1C2a Work Wiki & Decisions`: abgeschlossen.
- `A1.1C2b Meetings & Follow-ups`: abgeschlossen.
- `A1.1D Life Domain Foundation`: aktiv.
- `A1.1D1 Life Journal & Notes`: abgeschlossen.
- `A1.1D2 Entertainment Collections`: abgeschlossen.
- `A1.1D3 Inventory, Wishlist & Purchase Decisions`: aktiv.

## 3. Delivery Program

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
| 1 | D1.1 Dashboard Read Model & Navigation | Dashboard panels use canonical sources or honest unavailable states and navigate correctly | server read model, deterministic Daily Control, Today/Calendar projection, navigation | existing Tasks, Inbox, Portfolio and Nutrition foundations | Dashboard redesign; missing Health-domain tables |
| 2 | D1.2 Daily & Weekly Review | reviews close the daily and weekly planning loop | review records, carry-over decisions, Dashboard/Today status | D1.1 read-model boundary | AI reviews; silent task duplication |
| 3 | D1.3 Mood, Sleep & Weight | Health summary signals become real and historical | entries, goals, history, Dashboard projection | D1.1 source-state contract; D1.2 review links | diagnosis or medical advice |
| 4 | D2.1 Schedule Source Links | Meals, Workouts and Reviews participate safely in scheduling | source links, completion consistency, revalidation | D1 daily loop; existing Calendar task core | duplicate Calendar-owned domain records |
| 5 | D2.2 Recurring & Routine Management | recurring work is predictable and manageable | list/edit/pause templates, idempotent generation, routines | D2.1 scheduling contract | autonomous background writes |
| 6 | H1.1 Habit Tracking | flexible habits can be defined, incremented and reviewed | definitions, windows, units, targets, timestamped logs, Dashboard | D1.3 Health foundation | shame mechanics or decorative streak pressure |
| 7 | H2.1 Running & Strength Core | training supports a complete manual-first plan-to-session loop | run/session entry, plans, exercises, sets, muscle derivation, Calendar link | D2 scheduling links; Health foundation | Garmin dependency |
| 8 | K1.1 Portfolio, Resource & Knowledge Depth | core work and knowledge gain full relation, search and archive depth | task detail, milestones/logs, attachments, semantic relation read model, archive/restore | established Portfolio/Resource/Skill foundations | decorative graph before semantics |
| 9 | A1.1 Coding, Education, Work & Life Domains | area shells gain canonical entities and complete workflows | first complete CRUD slices, core relations, area projections | K1 relation conventions | area-local duplicate Tasks or Resources |
| 10 | M1.1 Challenges, Anti-Rot, Shop & Rewards | motivation becomes functional, auditable and calm | action library, challenge lifecycle, reward ledger, redemption | Habits/activity events | manipulative gamification or unaudited currency |
| 11 | AI1 Personal Assistant | a controlled assistant can brief, answer and propose confirmed actions | provider boundary, read tools, confirmation-gated writes, morning/evening flows | stable canonical domains and security decisions | direct model DB access or autonomous writes |
| 12 | I1 Integrations & Analytics | optional external context and reports extend proven core flows | weather, Garmin/GitHub gates, events, trends, provenance | relevant canonical source domains; privacy decisions | integrations as core-flow prerequisites |
| 13 | Z1 Final Local Product Closure | Life OS is dependable for sustained personal local-first use | registry closure, full proofs, accessibility, performance, backup/restore, recovery | all non-external-gated product blocks | public SaaS launch or mandatory cloud deployment |

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

### D1 – Daily Command Center & Reviews

- Dashboard Read Model and navigation;
- Daily Control and Up Next policy;
- Daily Review;
- Weekly Review and week planning;
- Mood, Sleep and Weight signals;
- Weather context.

### D2 – Scheduling, Routines & Cross-Domain Execution

- schedule-source links for Tasks, Meals, Workouts and Reviews;
- recurring/routine management;
- Calendar filters and source-aware queues;
- free events;
- accessible drag/drop/resize after the keyboard/button core;
- cross-domain completion consistency.

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

### K1 – Portfolio, Resources & Knowledge Completion

- task detail and relation management;
- project/goal milestones, logs and review cadence;
- archive/restore;
- resource attachments and search;
- semantic relation read model;
- graph visualization only after the read model is proven.

### A1 – Coding, Education, Work & Life

- repositories, coding projects and agent sessions;
- scientific work, literature and learning logs;
- work logs and wiki;
- journal, notes, entertainment, inventory and wishlist.

### M1 – Anti-Rot, Challenges, Shop & Rewards

- Anti-Rot library and rotation;
- daily/weekly/monthly challenge lifecycle;
- reward ledger;
- shop rewards and redemption.

### AI1 – Personal Assistant

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
