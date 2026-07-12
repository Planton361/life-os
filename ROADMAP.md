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
- Mood, Sleep, Weight, Habits, Running and Strength: largely UI-only or incomplete.
- Coding, Education, Work and Life domains: largely UI-only or incomplete.
- Personal AI Assistant: not started as a production capability.
- Operation: local-first ready; private remote is optional and not active.

Capability-level truth is maintained in `docs/product/capability-registry.md`.

## 3. Active Work Block

# D1 – Daily Command Center & Reviews

**Outcome:** Dashboard, Inbox, Today, Calendar, Daily Review and Weekly Review form one closed daily operating loop.

### 3.1 Current Block

### D1.1 – Dashboard Read Model & Navigation Completion

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

## 4. Next Up

| Order | Block | Outcome |
|---:|---|---|
| 1 | D1.1 Dashboard Read Model & Navigation | Dashboard panels use real sources and correct navigation |
| 2 | D1.2 Daily & Weekly Review | canonical review records, carry-over and week planning |
| 3 | D1.3 Mood, Sleep & Weight | real entries, Dashboard writes and historical views |
| 4 | D2.1 Schedule Source Links | Meals, Workouts and Reviews link safely to schedule blocks |
| 5 | D2.2 Recurring & Routine Management | templates can be listed, edited, paused and generated predictably |
| 6 | H1.1 Habit Tracking | definitions, flexible increments, timestamped logs and Dashboard interaction |
| 7 | H2.1 Running & Strength Core | manual sessions, plans, exercise library and Calendar link |
| 8 | K1.1 Resource/Skill Relation Read Model | semantic relation model before graph visualization |
| 9 | A1.1 Area Domain Foundation | Coding, Education, Work and Life gain canonical entities and writes |
| 10 | M1.1 Challenges, Anti-Rot & Rewards | real challenge lifecycle and reward ledger |

## 5. Completed Major Work

The following major capabilities are already established and must not be rebuilt:

- Dashboard V5 foundation;
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

## 6. Program Epics

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

- One active work block at a time.
- Prefer larger complete Vertical Slices over many docs-only micro-blocks.
- Model locks are separate only when data, security or external integration risk requires them.
- Stable rules belong in `AGENTS.md` and Skills, not repeated in every prompt.
- Historical roadmap entries never determine current priority.
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

Deferred until their prerequisite Epic:

- public deployment and public registration;
- Garmin API;
- external food APIs and medical nutrition claims;
- pantry/receipt OCR;
- autonomous background jobs;
- semantic embeddings;
- public SaaS scaling;
- native mobile app.

Deferred does not mean removed. It means the prerequisite model, privacy or integration gate is not yet complete.

## 11. Update Rule

After each completed work block or material Capability change:

1. update `docs/product/capability-registry.md`;
2. update this file only if Active/Next-Up priorities changed;
3. replace or update the complete `Active Work Block` when priority advances;
4. keep detailed proof output in tests or `docs/qa/`, not in this roadmap.
