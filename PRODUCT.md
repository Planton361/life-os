# Life OS – Product Contract

**Status:** Active
**Product mode:** personal-only, local-first
**Primary user:** Anton
**Primary usage:** browser-based command center on a 4K second monitor
**Design truth:** `DESIGN.md` / Life OS – Linear Calm Dark Command Center / Dashboard V5

## 1. Product Promise

Life OS is a personal daily companion for turning intent into a realistic week, executing the current day and learning from what was actually done. Its canonical spine is Task / Project / Goal / Skill / Resource. It is not a Notion clone, a public SaaS product, a passive data archive or a collection of unrelated trackers.

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
- provide workspaces for coding, education, work and private life;
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
- AI-assistant delivery before the daily-companion core is stable.

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
| Resources | knowledge base and evidence |
| Health / Nutrition / Fitness | domain records linked to executable scheduled task occurrences |

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

Task steps are task-local persisted work, with progress derived from active completed steps. Project task progress reports completed linked tasks separately from project completion. Goals do not display an outcome percentage without a canonical outcome basis. Skills expose explicit evidence and linked practice; links alone never create evidence.

Required capabilities:

- create, edit, filter, archive and inspect entities;
- task details with project, goal, skill and resource relations;
- Project Workbench with purpose, status, next step, linked tasks, resources, notes/logs, milestones and review context;
- Goal Workbench with horizon, status, linked projects, linked tasks, resources/evidence, review cadence and outcome history;
- Skill Workbench with evidence and source links;
- honest progress signals based on real work;
- roadmap-like ordering for sequential or parallel project work where the model supports it.

### 5.6 Resources and Knowledge

Resources are the canonical knowledge hub.

Required capabilities:

- create and classify resources;
- links, files or referenced artifacts where supported;
- relation to tasks, projects, goals, skills and other resources;
- library, inspector and search;
- project learnings, best practices and reusable knowledge;
- semantic relationship read model before any visual graph;
- graph visualization only after relation semantics are proven.

### 5.7 Canonical Spine Semantics

The binding definitions and cardinalities live in `DATA_MODEL.md`. Product shorthand:

- **Task:** durable actionable commitment; it may be planned, scheduled and completed, but is not itself a time slot.
- **Project:** finite multi-action outcome that organizes Tasks and may advance one Goal.
- **Goal:** desired outcome with a horizon; it gives direction without duplicating Project or Task state.
- **Skill:** capability being developed, practiced or demonstrated; progress is evidence-backed, not inferred from labels alone.
- **Resource:** reusable knowledge or evidence related to work; it is not an executable action.
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

### 5.10 Coding and Agents

Coding supports software projects, repositories, learning and agent work.

Required capabilities:

- repositories and coding projects;
- GitHub links and optional later read-only integration;
- courses and learning paths;
- skill and knowledge evidence;
- coding session notes and outcomes;
- AI agent sessions, prompts, tasks, review-needed and follow-up-needed states;
- no autonomous repository mutation outside confirmed Codex workflows.

### 5.11 Education

Education supports scientific work and learning.

Required capabilities:

- scientific work and thesis projects;
- literature and source tracking;
- learning logs;
- deadlines, next steps and evidence;
- writing best practices, prompts and useful resources;
- relation to Projects, Goals, Skills, Tasks and Resources.

### 5.12 Work

Work supports operational memory without overwhelming the user.

Required capabilities:

- work projects and tasks;
- work log;
- personal wiki;
- results, decisions, deadlines and follow-ups;
- sensitive-data boundaries;
- relation to Resources and Skills.

### 5.13 Life

Life contains private context that does not belong to the other operational domains.

Required capabilities:

- journal;
- notes;
- inventory and wishlist;
- purchase evaluation;
- private projects and resources.

Inventory and Wishlist remain active. Entertainment is retained in code and data but is deferred and hidden from active navigation.

### 5.14 Deferred Surfaces

Anti-Rot, Challenges, Shop and Entertainment are outside the active daily-companion boundary. Their existing code, migrations and data remain intact, but they must not appear in active navigation or Dashboard control surfaces. Re-activation requires an explicit future roadmap decision after the canonical spine and daily loop are stable.

### 5.15 Personal AI Assistant

The assistant is deferred. Do not continue AI1 during C1–A1. A future assistant remains informative first and action-capable only through reviewed tools.

Required capabilities:

- morning briefing;
- evening review;
- answer questions from structured Life OS data;
- search Resources and context;
- propose actions;
- selected write tools such as create task, schedule task, log mood, complete meal and append review note;
- explicit confirmation before every write;
- server-only DeepSeek API credentials;
- provider/model configuration that is not coupled to domain logic;
- no direct database access for the LLM.

## 6. Canonical Data Domains

Current or established domains:

- profiles and areas;
- inbox items;
- tasks;
- projects;
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
- richer note/wiki, scientific-work and literature semantics only where canonical Resources/Projects are insufficient;
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

## 8. Priority Order

```text
C1 Core Work Graph
→ C2 Weekly Planning Calendar
→ C3 Daily Companion Loop
→ K1 Knowledge Base
→ H1/H2 Health and Fitness
→ N1 Nutrition
→ A1 Work/Education/Coding/Inventory
```

AI1, integrations, Anti-Rot, Challenges, Shop and Entertainment are not part of this active sequence. They are retained and deferred, not deleted.

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
current R2-05 scope; R2-05 remains active and Nutrition acceptance is pending.
