# Life OS – Product Contract

**Status:** Active
**Product mode:** personal-only, local-first
**Primary user:** Anton
**Primary usage:** browser-based command center on a 4K second monitor
**Design truth:** `DESIGN.md` / Life OS – Linear Calm Dark Command Center / Dashboard V5

## Durable work-graph / knowledge ownership decision

**Product Target v0.4 is accepted.** Life OS / PostgreSQL remains canonical operational truth for operational context, Projects, Goals, Skills, Milestones, Tasks, Dependencies, Planning and their Relations. `Resource` remains the canonical Life OS reference / Work Artifact identity. Obsidian owns long-form Knowledge Content and Notes.

Obsidian is therefore a knowledge-content owner and client boundary, not an operational work store. Existing Life OS exports remain one-way projections. A bound Obsidian Note uses `life_os_id` as its stable identity; a vault-relative path is only a locator. Rename, move, missing metadata or collisions never authorize implicit path-based matching. No watcher, sync, write-back or personal Vault access is implied by this contract.

Free notes, exploratory Canvas edges and personal layout remain outside the Life OS operational model. Any future promotion or write-back requires its own accepted security/conflict contract and must execute through existing Life OS auth, validation, ownership and domain boundaries.

Current delivery sequence and product context belong to `ROADMAP.md`; operative work status belongs to GitHub Project #3 and approved Issues. This product contract does not mirror operative Issue/Project work status. Journal remains fully Life-OS-owned and separate from Knowledge Notes. Skill Map remains a target/reconciliation surface, not a delivered graph.

## Accepted #34 operating and core-entity target

Issue #34 is USER ACCEPTED. The target normal operating model is a private,
single-owner hosted Life OS with one cloud-persistent canonical dataset reachable
from Mac and Linux browsers. Normal use must not require local Docker, a local
Supabase runtime, an IDE or a second operative datastore. The current
Supabase/PostgreSQL stack remains the implementation baseline until a separately
authorized and proven cutover; SQLite is only the preferred candidate for the
next production-like whole-app proof, with PGlite retained as fallback evidence.

Hosted access must still authenticate the single owner server-side before reads
or writes. Zod validation, ownership/relation checks, transactional invariants,
soft-archive semantics, visible errors and canonical-data discipline remain
required. The exact hosted authentication method, remote access boundary,
persistent storage, backup/restore contract and final database choice require
later explicit security/runtime decisions.

Task, Project, Goal and Skill share one interaction grammar: lightweight capture,
read-first orientation, progressive disclosure for editing/relationship
management, and one contextually valid next action. Their domain semantics remain
separate. Goal Milestones/Outcome Criteria, Project Milestones and future Skill
Milestones/Evidence/Targets/Prerequisites are not flattened into a universal
model. Only explicit Task-to-Task Dependencies create execution READY/BLOCKED.
Accepted Goal A-v2 and the Project read-first workbench remain binding.

Calendar, Today, Dashboard and Portfolio are projections over the same canonical
Task/scheduling truth, not parallel planning stores. Obsidian remains the owner of
long-form Knowledge Content; Life OS retains operational IDs, status, planning,
dependencies and relation semantics. Any future Obsidian graph projection is
one-way/non-authoritative unless a separate command/security contract is accepted.

## 1. Product Promise

Life OS is the personal Project-to-Day Context, Planning, Execution and Memory system: a daily companion for turning intent into a realistic week, executing the current day and learning from what was actually done. Its canonical spine is Task / Project / Goal / Skill / Resource. It is not a Notion clone, a public SaaS product, a passive data archive or a collection of unrelated trackers.

Every meaningful piece of work has a Life OS identity and context.
Specialized artifacts and long-form Knowledge Content may live externally, but
remain referenced and connected inside Life OS. Projects and Tasks remain fully
canonical here, including Goals, Skills, status/lifecycle, deadline/horizon,
next step, planning, relations and personal history/evidence. Progress is
domain-specific and evidence-based; historical percentage fields are not a new
truth. Coding, Education and Work use normal Projects, never domain-specific
copies or second task lists.

Core principle:

```text
Dashboard = control
Area pages = context
Detail pages = depth
Archive = history
```

Life OS is complete when the visible interface, database, backend actions and cross-domain projections form one reliable personal system. Every visible action must either work, navigate to a real capability or be explicitly deferred by the user. A technically connected backend path alone is not acceptance of its visible surface.

## 2. Product Goals

Life OS shall:

- make the current day understandable in less than 30 seconds;
- turn thoughts into actionable, classified entities;
- connect tasks, projects, goals, skills, resources and time;
- support daily and weekly planning and review;
- track health, habits, workouts, mood, sleep and weight;
- support recipes, meal planning, groceries and nutrition estimates;
- preserve Coding, Education and Work as Area/context for Tasks, Projects, Goals, Skills and Resources;
- derive useful statistics from canonical data instead of duplicating it;
- keep health, nutrition and fitness records connected to the same planning loop through scheduled task occurrences;
- remain usable without a public cloud or public registration.

## 3. Non-Goals

The following are not current product goals:

- public SaaS launch;
- social features;
- multi-tenant scaling beyond the existing `user_id` and RLS model;
- public sign-up;
- marketplace or collaborative workspace;
- autonomous AI writes without confirmation;
- medical diagnosis, treatment or nutrition advice;
- a native mobile app before the browser product is complete;
- decorative analytics, fake precision or gamification without functional value;
- autonomous weekly planning or task selection;
- AI writes, reprioritization or plan changes without a separately accepted
  command contract;
- provider selection or AI delivery before accepted Privacy, Retention and
  server-side Credential gates for the read-only Morning Briefing;
- any AI capability beyond that briefing requires a separate Command Contract;
  no Writes, Reprioritization or Plan Changes follow from this target.

## 4. Product Architecture Principles

- Canonical entities are the source of truth.
- Dashboard, Today, Calendar and area pages are projections, not data silos.
- Server Components are preferred for read surfaces.
- Client Components are used only for real interaction.
- Every write uses server-side authentication, Zod validation and a user-scoped repository or RPC.
- Relational and polymorphic targets require same-user ownership checks.
- RLS remains defense in depth.
- Cross-domain updates are atomic where possible and otherwise explicitly eventual-consistent.
- Demo, Manual and Empty states must never leak into one another.
- No hidden writes.

## 5. Core Experience

### 5.0 Surface Acceptance Contract

The product is accepted per visible surface, not inferred from migrations, Server
Actions, repositories, historical browser evidence or an `IMPLEMENTATION PASS`.
For every core surface, the current Manual path must make every visible control
discoverable, operable and honest: a control either performs its named
navigation or mutation and shows its result, or it is absent until the user
explicitly defers it. `Prepared` is not an acceptable completion state for a
promised core control without that explicit user decision.

The current surface contracts below are binding for R2. They supersede older
Time Progress, Bottom-Zone and profile-state wording in historical design
references. Dashboard remains control; area pages remain context; detail pages
remain depth.

The active surface contract is:

| Surface | Product responsibility |
|---|---|
| Dashboard | daily control and quick logging: understand now, choose the next action, navigate to real depth |
| Inbox | triage of existing captures into the canonical spine; not a second capture surface |
| Today | daily log: plan-vs-done, completion, review and carry-over |
| Calendar | temporal planning and orientation through real Day / Week / Month controls |
| Portfolio | Task / Project / Goal / Skill information architecture with Portfolio as the sole list surface and dedicated create/detail pages |
| Resources | knowledge/reference and evidence |
| Health / Nutrition / Fitness | personal domain intelligence; records linked to executable scheduled task occurrences |
| Journal | reflection and time-based personal history |
| Skill Map | retained/paused graph surface; its implementation follows a future plan using the accepted R2-17 graph semantics rather than creating a competing graph |

Dashboard, Today and Calendar are projections. Portfolio and Resources expose canonical entities. Domain areas own their records but do not invent parallel tasks or calendar events.

### 5.1 Dashboard Command Center

The Dashboard is the daily control surface. It reads from canonical data and does not own duplicate task, meal, habit or health records.

Required capabilities:

- summary cards for Tasks Today, Focus Time, Inbox, Nutrition, Review Status and Sleep;
- card navigation to the relevant area;
- Quick Thought capture into Inbox;
- Daily Control with the current task and a ranked Up Next queue;
- Time Progress explicitly for the current **month, week and day**, derived from time rather than profile fixtures;
- optional weather context;
- Mood entry and current mood state;
- Weight Goal and progress from health data;
- Meals Today with a real `Planen` path into persistent meal-planner slots, and Nutrient Balance that never overlaps Calendar;
- Latest Run and Muscle/Strength summaries whose views open the responsible real surfaces;
- Today Agenda from scheduled time blocks with real Day, Week and Month views;
- Habit Tracker with morning, midday and evening windows, usable Habit Windows and a real Add Habit path;
- Active Portfolio with usable Project, Goal and Skill views plus create paths that open the entity surface, never Settings;

Dashboard interactions remain limited and intentional. Complex editing belongs to the corresponding area or detail page. Daily Control must take the user to the next executable work, not into an unnecessary creation process. A visible task CTA must either be removed or create a real task for today. Quick Thought success is acknowledged through the app-wide toast standard, not inline-only feedback. Transparent helper copy without a current decision or action is removed. Weight Goal spacing, card bounds and the removal of former Bottom-Zone features must not create overlap or unjustified empty space. Before Dashboard acceptance, every visible Dashboard button is inventoried and browser-proven.

### 5.2 Inbox

Inbox triages existing unstructured thoughts into canonical entities. Quick Capture belongs to Dashboard and is removed from Inbox.

Required capabilities:

- triage of existing captures without a second Quick-Capture control;
- search that filters the actual Inbox collection;
- editable, persistent title, description/context, next action and missing-information fields;
- selectable Outcome Route to Task, Project, Goal, Resource, Note or Archive/Solved;
- add to existing Project or Goal;
- create new Project or Goal;
- editable, persistent planning signals such as priority, energy, duration, area, review need, deadline and recurrence where the target model supports them;
- optional AI suggestions that never persist without confirmation;
- all visible triage flows are real, user-scoped and reload-stable; no long-form execution work lives inside Inbox.

### 5.3 Today and Reviews

Today is the daily log / day memory / documentation surface. It shows what was intended, what actually happened, what was completed or remains open, and the day’s reviews and decisions. It projects source-owned timestamps in the profile’s local timezone; `updated_at` alone is not an action history. Calendar owns planning/scheduling; Portfolio owns entity creation/management. Today contains no creation, planning or recurrence-generation controls. Concrete recurring occurrences may appear as day records.

The Activity Stream shows meaningful daily events, not raw mutation history.
Habits aggregate to one current progress row per habit/local day (last effective
log time, canonical target/unit); Mood shows only the latest active daily entry.
Review completion remains meaningful; field edits, autosaves, undo actions and
technical updates do not become timeline events. Aggregation never changes
domain records or task summary counts and does not impose an arbitrary event cap.

Required capabilities:

- planned and scheduled work;
- a clear separation between planned-for-today, time-scheduled and completed work;
- timestamp-backed task creation/completion events and current scheduled work; reopen history only when reliably recorded;
- concrete recurring occurrences as daily activity, without recurrence-management controls;
- carry-over and open-loop handling;
- planned-vs-done summary derived from task occurrences and linked domain records;
- Daily Review with wins, blockers, open loops, carry-over and next-day preparation;
- Weekly Review with focus, moved work, project movement, habit/health signals and next-week planning;
- consistent projections to Dashboard and Calendar.

### 5.4 Calendar and Scheduling

Calendar owns temporal planning, scheduling and rescheduling. It displays task status but offers no task-completion action; execution belongs to Task Detail or the responsible domain surface, while Today documents execution history and the daily protocol.

Calendar defaults to a dominant Planner Queue rail. A selected block temporarily opens a closable Inspector while retaining the Queue; Close or Escape returns to Queue mode. Desktop Calendar, including notices, stays inside the viewport with internal timegrid and rail scrolling.

Calendar is the temporal planning hub. The default planning question is how the coming week fits together; Day, Week and Month controls support execution and orientation and must change the real projection.

Weekly Planning remains user-decided. The Planner Queue is a deterministic
decision aid, not an autonomous scheduler or selector. Eligibility is limited
to the user's active Tasks that are not completed, cancelled or archived, have
executable/READY Task Dependencies and are not already appropriately planned.
Ranking may use Priority, Deadline, Recurrence, Project Next Work, Goal context
and Planning Date. Display context may include blocker reason, Milestone,
Project, Goal, Skill and Schedule Source. Eligibility is a hard boundary;
ranking is advisory; display context is explanatory.

Required capabilities:

- week view as the primary planning surface, with real day and month views;
- planner queue for unscheduled work;
- schedule, reschedule, duration change and unschedule;
- conflict visibility and conscious override;
- filters by area, type, project, goal, skill and priority;
- recurring tasks and routines;
- planned meals, workouts and reviews as linked schedule sources;
- urgent time-block creation;
- accessible drag, drop and resize as a comfort layer after keyboard/button scheduling is complete;
- no duplicate domain data;
- use the available primary desktop height intentionally, without a large empty Bottom Zone.

### 5.5 Portfolio

Portfolio provides overview, navigation and cross-entity context for the canonical Task / Project / Goal / Skill spine. The root contains summary counts, filters, active work and a quick inspector whose primary action opens the entity details. Full creation and editing belong on dedicated pages, not in the overview or an inline modal.

Portfolio is the only active list surface: `/portfolio` and `?type=tasks|projects|goals|skills`. Sidebar subnavigation and Entity View share this URL filter. Legacy list routes remain technical deep links without active navigation. Each type retains its existing `/new` and stable ID detail routes under `/tasks`, `/projects`, `/goals` or `/skills`. Create and edit share each entity’s field groups. A successful direct create opens its persisted ID detail page. Inbox-routed entities already exist and must never pass through another creation step. Resources retain their own `/resources`, `/resources/new` and `/resources/[resourceId]` knowledge area.

Task steps are task-local persisted work, with completion owned by Tasks. The
shared product planning shape is Higher-order entity → domain milestones →
Tasks → evidence-based progress, but Project, Goal and Skill remain separate
categories. Project task/milestone state, Goal outcome criteria and Skill
evidence/practice/target context are different semantics; no universal
polymorphic Milestone entity is introduced. Only Task-to-Task Dependencies
create V1 execution READY/BLOCKED state. Goals do not display an outcome
percentage without a canonical outcome basis, and Skills expose explicit
evidence and linked practice; links alone never create evidence.

Required capabilities:

- create, edit, filter, archive and inspect entities;
- task details with project, goal, skill and resource relations;
- Project Workbench with purpose, status, next step, linked tasks, resources, notes/logs, milestones and review context;
- Goal Workbench with horizon, status, linked projects, linked tasks, resources/evidence, review cadence and outcome history;
- Skill Workbench with evidence and source links;
- honest progress signals based on real work;
- roadmap-like ordering for sequential or parallel project work where the model supports it.

### Project work identity, artifacts and supporting references (R2-09)

**Project** is the work identity / undertaking. **Work Artifact** is the thing
being produced or the primary external place where that Project is worked on.
**Resource / Reference** is knowledge, a source or supporting context. These are
product roles, not three parallel global storage entities.

A Project has zero or one explicitly chosen Primary Work Artifact, zero to many
Additional Work Artifacts and zero to many Resources & References. Artifact use
is stored on its Project–Resource relation. No type, URL domain, filename or sort
order implies Primary. A Primary change retains the old Resource as Additional;
no Resource or Project is copied. Existing links remain References until the user
chooses otherwise. The same Resource may be Primary for Project A, Reference for
Project B and normal Context for a Task or Skill.

Coding: Life OS Project → repository as Primary, features/bugs as Tasks,
TypeScript/Next.js as Skills, Docs/architecture notes as References.
Science: Bachelorarbeit Project → thesis/LaTeX/Sciebo as Primary, dataset/notebook/
presentation as Additional, actual work as Tasks, degree as Goal, LaTeX/writing/
statistics as Skills, papers/books/methods as References.
Work: Kundenprojekt → document/design/spreadsheet/workspace as Primary, ordinary
Tasks and supporting References. These use existing Areas without domain suites.

Project Milestones are meaningful intermediate outcomes within one Project.
Tasks are executable work and may belong to exactly one milestone of the same
Project or remain unassigned. Milestone description answers what must be true
after that stage. Status is explicitly open, active or done; at most one current
(active) stage per Project. Choosing a new current stage reopens the previous
active stage. Task counts never change milestone status automatically.
Progress shows completed Tasks/total Tasks and completed Milestones/total
Milestones, not an invented Project completion percentage. Archived stages remain
history; their Tasks return to the unassigned group atomically. Completed stages
remain readable and can be reopened. Project Description remains general context;
a separate Desired Outcome/Definition of Done is a future product decision.

The accepted Target Model extends this planning shape with domain-specific Goal
Milestones plus Outcome Criteria and domain-specific Skill Milestones plus
Evidence, Targets and Prerequisites. These are accepted target-model
contracts, not currently implemented tables. No Milestone dependency engine is
implied; execution blocking remains a Task Dependency concern.

Project Detail defaults to a read-first workbench: understandable identity/current
state, next step, tasks/progress, primary/additional artifacts and supporting context.
Project editing, artifact roles and relation management appear only after explicit
user actions. Existing writes remain available in accessible disclosures.
The Work header, each unarchived Milestone and the unassigned section can start the
existing Task Create surface. Project and optional Milestone are visibly prefilled
from validated server context. Creation stores one canonical Task and returns to
the Project with a global success toast; a deliberate Project switch returns to
the selected Project. Standalone Task Create keeps its Task-detail navigation.
Milestone membership never creates a Dependency.
Identity and Next Step form the header; real Tasks/Progress dominate the remaining
workspace. A secondary rail groups Primary Artifact and Context; Additional
Artifacts and References share a compact second row. Content drives section
height: fill the information hierarchy, not the viewport. Header, shared
Work/Context workbench and Supporting section form three structural surfaces,
using dividers inside rather than fragmented cards or floating content. Lifecycle belongs to header overflow, not the normal work flow.
Artifact management belongs to Project Detail. Existing Resource Create stores
one canonical object, then returns to the Project for explicit role selection.
Resource Detail shows its uses; Resources Search still finds every such record.
Archived artifacts remain historical and never appear as active Primary. Archive
or unlink never deletes the Project. No API, provider selector or embedded editor.

### 5.6 Resources and Knowledge

Resources remain the canonical Life-OS reference and Work-Artifact identity
hub. Obsidian owns long-form Knowledge Content and Notes. Life OS retains the
Resource identity, short operational context, external locator, privacy/review
metadata and all canonical Project/Goal/Skill/Task relations. A vault-relative
path is a locator only; `life_os_id` is the stable identity for an explicitly
bound Obsidian Note. No watcher, sync or write-back is implied.

Required capabilities:

- create and classify resources;
- URLs, short notes and references to externally owned artifacts using existing fields;
- relation to tasks, projects, goals, skills and other resources;
- library, inspector and search;
- project learnings, best practices and reusable knowledge;
- semantic relationship read model before any visual graph;
- graph visualization only after relation semantics are proven.

### 5.7 Canonical Spine Semantics

The binding definitions and cardinalities live in `DATA_MODEL.md`. Product shorthand:

- **Task:** durable actionable commitment; it may be planned, scheduled and completed, but is not itself a time slot.
- **Project:** finite multi-action outcome that organizes Tasks and may advance one Goal.
- **Goal:** desired outcome with a horizon; it gives direction without duplicating Project or Task state. Achievement requires explicit Outcome Criteria/Measures; Task completion is supporting context, not automatic Goal achievement.
- **Skill:** capability being developed, practiced or demonstrated; progress is evidence-backed, not inferred from labels alone.
- **Resource:** reusable knowledge or evidence related to work; it is not an executable action.
- **Planning model:** Project Milestones, future Goal Milestones with Outcome Criteria and future Skill Milestones with Evidence/Targets/Prerequisites share service and UX principles without becoming one polymorphic table.
- **Routine Template:** recurrence definition that creates explicit executable Task Occurrences.
- **Task Occurrence:** the concrete executable instance considered by Today and Calendar.
- **Schedule Block:** a time allocation for an occurrence; it does not own completion or domain facts.
- **Domain Record:** Health, Nutrition or Fitness fact/plan owned by its domain and optionally linked to a Task Occurrence for execution.

### 5.8 Health and Fitness

Health and Fitness owns personal health tracking and training context.

Required capabilities:

#### Mental Health

- mood entries with timestamp and context;
- sleep entries;
- journal/review links;
- historical trend views;
- no medical diagnosis.

#### Habits

- habit definition;
- flexible units, increments and goals;
- up to eight dashboard slots for each morning, midday and evening window;
- automatic active-window selection based on configured time boundaries;
- timestamped habit increments;
- daily, weekly and monthly history and visualizations.

The Habits area is the statistics, history and management surface. Dashboard is
the creation and quick-logging surface; deeper management belongs to Habits.

#### Running

- manual run entry as the complete base path;
- plan and progression targets;
- latest run on Dashboard;
- trend visualizations;
- routine/schedule integration;
- Garmin import only as a later external integration gate.

#### Strength

- exercise library;
- training plans;
- sets, repetitions, load and notes;
- session logging;
- muscle map derived from completed/in-progress set logs and explicit exercise-muscle mappings;
- routine/schedule integration.

#### Weight

- weight entries;
- target weight and optional target date;
- progress projection;
- no medical or weight-loss advice.

### 5.9 Nutrition

Nutrition owns recipes, meals, planning and grocery derivation. Binding surface roles:

- `/nutrition`: logging, tracking and current nutrition status; a compact meal-log
  CTA opens the existing creation flow in a dialog, never a permanent full form.
- `/nutrition/meal-planner`: weekly Breakfast/Lunch/Dinner planning. Accessible
  day/type controls accompany optional drag/drop of the same canonical Meal.
  Occupied targets never silently replace another Meal; no implicit swap.
- `/nutrition/recipes`: reusable meal definitions; the library and selected recipe
  dominate, with creation opened explicitly and editing in selected context.
- `/nutrition/grocery`: shopping projection of open Meals and persisted Recipe
  Ingredients, including unresolved sources; no second shopping database.
- Dashboard: quick daily view; Calendar: temporal planning only when a Meal has
  actual time allocation through its canonical source-linked Task.

Overview does not duplicate planning, recipe or grocery management. Weekly counts
are derived from real Meals; missing targets, hydration records or estimates are
shown honestly without fake controls. No medical targets or external food API.

Required capabilities:

- Recipe create, edit, archive and labels;
- instructions, servings, preparation time and optional manual nutrition estimate;
- Recipe Ingredients create, edit and delete;
- Meal Planner for a full week;
- Meal create, edit, reschedule, complete and recipe change;
- planned meal times where supported;
- Meals Today and Nutrient Balance from completed meals;
- Grocery Draft derived from all relevant meals and ingredients;
- later persistent grocery items, pantry and receipt/OCR only through separate model and privacy decisions;
- no automatic macro/calorie claims without reliable ingredient nutrition and portion semantics.

Meal-planner slots are selectable and their chosen meal/planning state is
persisted and reload-stable. A visible Dashboard `Planen` control uses that
same canonical planner flow.

### 5.10 External Sources and Retained Areas

**Central context, not central file ownership.** Life OS centralizes control,
planning, context, relations, history, personal evidence and discoverability.
It is not a universal storage system. Specialized external tools may remain
Source of Truth; Life OS keeps a reference/URL, short insight or description,
context and canonical Project / Goal / Task / Skill relations as needed.
There is no second operative copy of an external system.

| Source of Truth | Responsibility | Life OS responsibility |
|---|---|---|
| GitHub | repositories and code collaboration | Resource `link` with repository URL and project context; no repository manager, API or sync |
| Sciebo / filesystem / LaTeX | actual document files and scientific writing | Projects, Tasks, Goals, Skills, Resource links and short evidence; no file ownership, uploads or connector |
| Obsidian | long-form Knowledge Content and Notes | stable Resource identity, operational context and explicit Project/Goal/Skill/Task relations; no watcher, sync or write-back |
| Spreadsheet | Inventory, Wishlist and flexible tabular data | existing Resource reference and optional Project/context; no spreadsheet engine or integration |
| Life OS | operational context, links, planning, evidence, relations and Journal | canonical operational spine, Resource identity and personal history |

Coding, Education and Work retain their Area identities and remain usable in
canonical entity context and existing filters. Their suites are hidden and
retained, not completion obligations. Existing repository metadata, coding
sessions, education logs, work logs, meetings, decisions, Inventory, Wishlist,
tables, functions and direct routes remain intact. No data migration or deletion
is implied by a navigation change.

### 5.11 Resources Consolidation

Resources is the central knowledge/reference surface. Coding Knowledge and
prompts, Literature, Work Wiki, external documents and Notes fold into this
existing surface. Scientific Work lives in external documents with Life OS
Project/Task/Resource/Goal/Skill context; it is not a literature or LaTeX app.
Learning Log belongs conceptually to Journal and/or explicit Skill Evidence;
Work Log to Journal reflection or Today daily memory, according to semantics.
Existing specialized logs stay in their canonical tables; folding does not
claim their history has been migrated or projected into Journal/Today.

Quick Thought → Inbox → Outcome = Note → canonical Resource context.
Existing `resources` with type `note` remain Life-OS references and are not
automatically migrated, deleted or associated with Obsidian content. Future
long-form Knowledge Content belongs in Obsidian; any explicit association or
migration requires its own contract. The retained route is not a second active
Notes app and no Notes data is removed. Existing types remain `note`, `learning`, `prompt`,
`research`, `link`, `source`, `snippet`, `decision`. Use existing title, body,
URL, source, context, Area and supported relations. Literature/Paper/Website/
External Document/GitHub Repository are concepts expressed with these existing
classifications, not new types. No parallel knowledge database or file storage.

### 5.12 Journal

Journal is the sole active Personal surface: time-based personal documentation,
reflection and history, with future personal tracking/BI views from real entries.
Journal is fully Life-OS-owned. It is not general Knowledge Content, an
Obsidian surface or a second planning system.
Its existing Life OS workspace exposes today, recent entries and week/month
history; further scope may include frequency, tags/context and relations where
canonical. Mood and reviews remain
separate domain records. No gamification or fabricated activity.

Recurring Task / Calendar → Journal Entry. Recurrence belongs to the established
task/planning model, never to the Journal model itself. The canonical dated
`journal_entries` lifecycle remains. The historical R2-07 ownership question is
resolved by the accepted target: Journal stays in Life OS; the existing
chronological surface remains available with user acceptance and model-depth
gaps still tracked separately. No Journal-to-Obsidian migration is approved.

`/life/journal` is a German one-page workspace: header/create CTA, factual
Today/last-seven-days/current-month counts, searchable dated history and a
selected-entry reader. Default order is entry date, creation timestamp and stable
ID descending; editing never changes chronology by `updated_at`. Period counts
exclude archived and future-dated entries; all-history can show future dates.
Search covers title/body; period and active/archive filters are real URL state.

Creation/editing open compact dialogs. Existing `selected=<id>` query routing
provides stable selection; `panel=detail|edit` provides deep-linkable full reading
and editing without another entity model. Date and body remain required; title
is optional. Archive preserves full read-only history, with explicit confirmation.
Errors preserve the draft; successful writes use the app toast and reload-stable
canonical results. Demo is read-only; Empty has no demo leakage; failed/auth-
blocked reads never appear as a successful empty journal.

Canonical Journal currently has no Tags, Area/context fields, Project/Goal/
Resource/Skill relations, or Review foreign key. Existing Resource relations do
not support Journal entries, so those controls are absent and this remains a
model gap rather than a new polymorphic engine. Today currently has no Journal
source in its meaningful-event projection; R2-07 does not fabricate one or
project text edits as activity. Journal is neither Notes/Resources nor a Daily
Review replacement. Recurrence stays in Task/Calendar.

### 5.13 Skill Map

R2-08 Skill Map is retained/paused and must be reconciled with R2-17 Skill /
Goal Graph rather than creating a second graph. Skills are nodes; only real
evidence may supply signals: evidence count/recency, completed Task relations,
Resource relations and practice context. Never invent mastery percentages.

V1 Skill Graph relations are explicit `prerequisite` and `related` edges.
`prerequisite` is directed, same-user and acyclic; `related` is a symmetric
fachliche relationship. Do not infer edges from a shared Task, Project or
Resource. The Current Graph is existing Skills plus explicit edges and
Evidence; the Target Graph is an explicitly user-selected target with explicit
Prerequisites. External roadmaps begin as Resource/Reference material, not
automatic imports. Gap Detection requires this target/prerequisite/evidence
semantics and is not implemented.

Audit: `/coding/skill-map` is a retained Coding demo/empty Manual shell, not a
canonical graph. No clean Portfolio Skill Map route currently exists. Document
the retained IA candidate; do not build a competing native graph before the R2-08/R2-17 disposition is explicitly reconciled. Canonical
Skills and Skill Evidence stay active through Portfolio and Skill Detail.

### 5.14 Deferred Surfaces

Anti-Rot, Challenges, Shop and Entertainment are outside the active daily-companion boundary. Their existing code, migrations and data remain intact, but they must not appear in active navigation or Dashboard control surfaces. Re-activation requires an explicit future roadmap decision after the canonical spine and daily loop are stable.

### 5.15 Personal AI Assistant

The assistant is deferred. The first productive AI capability is a read-only
Morning Briefing built from a server-side, user-scoped structured projection.
Its standard allowlist is current Tasks, Schedule/appointments, deadlines,
Project/Goal/Skill metadata, Milestones, dependency/blocker reasons and
appropriate non-sensitive operational Resource metadata. Journal content,
full Obsidian content and system-restricted data are excluded by default;
Health/Fitness/Nutrition and work-restricted data require explicit privacy
opt-in. There is no direct model-to-database access, write, reprioritization,
plan change or autonomous action. Credentials remain server-side; provider
privacy/retention compliance and the absence of durable Life-OS prompt/response
storage are gates before delivery, and no provider is selected by this
contract.

Later conversational, proposal and confirmed-write capabilities require separate
contracts. They must not be inferred from the read-only Morning Briefing target.

## 6. Canonical Data Domains

Current or established domains:

- profiles and areas;
- inbox items;
- tasks;
- projects;
- canonical Task Dependencies with derived READY/BLOCKED (R2-10, USER ACCEPTED);
- goals;
- skills and skill evidence;
- resources and resource relations;
- daily logs/records;
- recurring task templates and generated instances;
- reviews;
- mood, sleep and weight entries;
- habits and habit logs;
- running/strength plans and sessions;
- schedule source links;
- recipes;
- recipe ingredients;
- meals;
- journal and note-like Resources;
- education and work logs/records;
- inventory, wishlist and purchase decisions;
- entertainment, challenges, reward ledger and shop items (retained but deferred/hidden).

Planned or depth domains:

- direct Task↔Skill context and complete core-graph backlinks;
- free calendar events and richer Schedule Blocks, subject to C2 model decisions;
- selected Obsidian projection capabilities; command-sync, templates and Skill/Goal graph remain gated by their own future contracts;
- Journal relation/Today depth and Skill Map implementation remain separately scoped; no new Notes/Wiki/scientific-work suites;
- activity events and analytics projections;
- AI conversations, tool proposals and confirmed tool results.

## 7. Completion Rule

A capability is complete only when:

1. the user-facing flow is usable;
2. data has a canonical source;
3. reads and writes use the established backend boundary;
4. auth, validation, ownership and RLS are correct;
5. dependent projections update after mutation;
6. Manual, Demo, Empty and Auth-blocked states are honest;
7. the result survives reload;
8. a focused browser proof is green;
9. the Capability Registry is updated;
10. no visible control overclaims functionality.

## 8. Priority Order and Active Navigation

This file owns durable product responsibilities and active navigation, not the operative work queue. `ROADMAP.md` owns product sequence/context; GitHub Project #3 and approved Issues own current work status, priority and work type.

```text
PRIMARY: Dashboard · Inbox · Today · Calendar · Portfolio · Resources
DOMAINS: Health & Fitness · Nutrition
PERSONAL: Journal
UTILITY: Settings
```

Portfolio retains Tasks / Projects / Goals / Skills subnavigation. Coding,
Education, Work, Notes, Inventory and Wishlist have no active main navigation.
Anti-Rot, Challenges, Shop, Entertainment, AI1 and optional integrations remain
outside active completion. Retained routes do not expand the product promise.

### R2-05 Health & Fitness role clarification

- `/health`: existing Health & Fitness overview, context and daily schedule.
- `/health/mental`: latest state, Mood/Sleep history, reflection and review context;
  no medical interpretation and no duplicate Dashboard Mood logger.
- `/health/habits`: Habit tracker, day/week/month values, history and secondary
  edit/archive. Creation and daily increment/undo remain in Dashboard.
- `/health/running`: completed runs, derived pace/distance history and plans.
- `/health/strength`: exercise library with explicit muscle mapping, plans,
  manual plan/free sessions, set logs, completion and factual muscle load.

Calendar remains the temporal planner. Domain records feed Health, Dashboard
and Today; these projections do not duplicate data. The overview is preserved;
real history may require scrolling on detail pages. Health & Fitness (Mental,
Habits, Running and Strength) is USER ACCEPTED on 2026-09-07. Nutrition is the
also USER ACCEPTED on 2026-09-07; R2-05 is closed; R2-09 precedes remaining Journal acceptance.


## 9. Work Graph Strategy — Canonical Dependencies and Future Clients (2026-09-09)

R2-09's Project identity, Artifact roles and Milestones remain the implemented
foundation, USER ACCEPTED on 2026-09-09, alongside R2-10 Dependencies.
The accepted target separates ownership: Life OS remains canonical for
operational context and planning, while Obsidian owns long-form Knowledge
Content and Notes. Controlled write-back and later sync remain separately
gated. Life OS should explain what
work matters, why it is blocked, which paths can run in parallel and how to resume
a Project after a pause.

Relationship classes stay distinct: membership/containment (Project → Milestone
→ optional Task assignment), Dependency (Task blocks Task), contribution/evidence
(Goal support or explicit Skill evidence), context/reference (Resources), and
Work Artifact (Project-specific Primary/Additional use). Only Dependency edges
create dependency-based execution locks; membership, stage order and free Canvas
connections never do. Existing source-domain completion guards still apply.

R2-10 provides same-Project Finish-to-Start dependencies, multiple predecessors
and successors, cycle/self/duplicate/ownership protection and server/database
completion enforcement. Availability is derived separately from the existing
Task lifecycle; BLOCKED is not freely editable. Reopen blocks open successors
again but preserves completed successors with a visible inconsistency. Archived
or removed predecessors never silently release work. DATA_MODEL.md owns the
precise model boundary. V1 READY/BLOCKED is dependency-only availability; existing
scheduling/date filters remain separate and no WAITING_FOR_DATE state is introduced.
The [R2-10 contract](docs/architecture/task-dependencies-r2-10.md) records exact
completion, concurrency, reopen and archive semantics.

Useful views are Ready Now, Blocked with concrete reasons, active Projects without
an executable next action, Project Map and Skill Context. Counts may show 3/5
Tasks, 2/5 Milestones, four blocked and six ready Tasks. Counts never automatically
complete Milestones/Projects/Goals or imply mastery. Goals remain outcome/criteria-
based; Skills remain evidence/practice-based.

R2-11 is retained as historical decision evidence: it compared the Life OS baseline, Obsidian approaches and a bounded native graph candidate. The accepted target now separates Life-OS operational truth from Obsidian knowledge-content ownership; no parallel operational writers are introduced. Graph remains optional depth, never required for the daily cockpit. Daily value, upkeep and local resource use
are acceptance criteria; stop/reduce integration if it adds no practical value.

Under the accepted target: Life OS owns operational work state and Resource
identity, while Obsidian owns long-form knowledge content. Existing R2-12
export is implemented/historical capability evidence and does not define future
delivery order. Any future command or write-back capability requires separately
accepted Security/Conflict and Command/Ownership scopes; no R2-14/R2-15 sequence
is implied.
Free notes, exploratory edges and personal layout stay user-owned. Later templates
require preview, versioned atomic/idempotent creation and no automatic changes to
running Projects. R2-17 shows Skill practice/evidence and Goal outcome context;
no fake percentages or Gap Detection without a Target/Prerequisite model.
Existing Note-Resources are preserved; there is no separate active Life-OS Notes
surface. A future return to a separate Notes app would be a new product
decision, not an open gate in this target.

### R2-12 Project export

Project Detail offers the secondary action **Für Obsidian exportieren** in
Manual mode after authentication. It downloads one Project's Markdown graph and
manifest as a ZIP, including Milestones, Tasks, Dependencies, Goal/Skill/Resource
context and explicit Work Artifacts. Success announces the started download;
errors remain visible and allow retry. Open the extracted folder in Obsidian Core;
no plugin is required. Life OS remains canonical; editing exported state does not
synchronize it. This is export, with no Canvas, write-back or personal Vault access.

File Explorer and Core Graph must show readable domain names, not UUID filenames.
Identity remains in Properties/manifest. Rename and collision mapping preserve
identity; generated README/metadata must not add non-domain graph nodes.
