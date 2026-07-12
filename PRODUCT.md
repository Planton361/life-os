# Life OS – Product Contract

**Status:** Active
**Product mode:** personal-only, local-first
**Primary user:** Anton
**Primary usage:** browser-based command center on a 4K second monitor
**Design truth:** `DESIGN.md` / Life OS – Linear Calm Dark Command Center / Dashboard V5

## 1. Product Promise

Life OS is a personal operating system for planning, execution, reflection and knowledge. It is not a Notion clone, a public SaaS product or a passive data archive.

Core principle:

```text
Dashboard = control
Area pages = context
Detail pages = depth
Archive = history
```

Life OS is complete when the visible interface, database, backend actions and cross-domain projections form one reliable personal system. Every visible action must either work, navigate to a real capability or be clearly marked as future scope.

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
- support a controlled personal AI assistant that can read context and propose a small number of confirmed actions;
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
- decorative analytics, fake precision or gamification without functional value.

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

### 5.1 Dashboard Command Center

The Dashboard is the daily control surface. It reads from canonical data and does not own duplicate task, meal, habit or health records.

Required capabilities:

- summary cards for Tasks Today, Focus Time, Inbox, Nutrition, Review Status and Sleep;
- card navigation to the relevant area;
- Quick Thought capture into Inbox;
- Daily Control with the current task and a ranked Up Next queue;
- Time Progress for the current day;
- optional weather context;
- Mood entry and current mood state;
- Weight Goal and progress from health data;
- Meals Today and Nutrient Balance derived from completed meals and recipe estimates;
- Latest Run summary;
- Muscle/Strength summary from the current training plan and recent sessions;
- Today Agenda from scheduled time blocks;
- Habit Tracker with morning, midday and evening windows;
- Active Portfolio with up to four pinned or ranked items per entity category;
- Anti-Rot Actions rotation;
- daily, weekly and monthly Challenges.

Dashboard interactions remain limited and intentional. Complex editing belongs to the corresponding area or detail page.

### 5.2 Inbox

Inbox turns unstructured thoughts into canonical entities quickly.

Required capabilities:

- fast capture;
- clean title, context, next action and missing-information fields;
- route to Task, Project, Goal, Resource, Note or Archive/Solved;
- add to existing Project or Goal;
- create new Project or Goal;
- planning signals such as priority, energy, duration, area, review need, deadline and recurrence where the target model supports them;
- optional AI suggestions that never persist without confirmation;
- no long-form execution work inside Inbox.

### 5.3 Today and Reviews

Today is the execution surface for the current day.

Required capabilities:

- planned and scheduled work;
- task completion and reopen;
- recurring instances;
- carry-over and open-loop handling;
- Daily Review with wins, blockers, open loops, carry-over and next-day preparation;
- Weekly Review with focus, moved work, project movement, habit/health signals and next-week planning;
- consistent projections to Dashboard and Calendar.

### 5.4 Calendar and Scheduling

Calendar is the temporal planning hub.

Required capabilities:

- day, week and month views;
- planner queue for unscheduled work;
- schedule, reschedule, duration change and unschedule;
- conflict visibility and conscious override;
- filters by area, type, project, goal, skill and priority;
- recurring tasks and routines;
- planned meals, workouts and reviews as linked schedule sources;
- urgent time-block creation;
- accessible drag, drop and resize as a comfort layer after keyboard/button scheduling is complete;
- no duplicate domain data.

### 5.5 Portfolio

Portfolio is the hub for Tasks, Projects, Goals and Skills.

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

### 5.7 Health and Fitness

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
- muscle map derived from planned and completed exercises;
- routine/schedule integration.

#### Weight

- weight entries;
- target weight and optional target date;
- progress projection;
- no medical or weight-loss advice.

### 5.8 Nutrition

Nutrition owns recipes, meals, planning and grocery derivation.

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

### 5.9 Coding and Agents

Coding supports software projects, repositories, learning and agent work.

Required capabilities:

- repositories and coding projects;
- GitHub links and optional later read-only integration;
- courses and learning paths;
- skill and knowledge evidence;
- coding session notes and outcomes;
- AI agent sessions, prompts, tasks, review-needed and follow-up-needed states;
- no autonomous repository mutation outside confirmed Codex workflows.

### 5.10 Education

Education supports scientific work and learning.

Required capabilities:

- scientific work and thesis projects;
- literature and source tracking;
- learning logs;
- deadlines, next steps and evidence;
- writing best practices, prompts and useful resources;
- relation to Projects, Goals, Skills, Tasks and Resources.

### 5.11 Work

Work supports operational memory without overwhelming the user.

Required capabilities:

- work projects and tasks;
- work log;
- personal wiki;
- results, decisions, deadlines and follow-ups;
- sensitive-data boundaries;
- relation to Resources and Skills.

### 5.12 Life

Life contains private context that does not belong to the other operational domains.

Required capabilities:

- journal;
- notes;
- entertainment collections;
- inventory and wishlist;
- purchase evaluation;
- private projects and resources.

### 5.13 Motivation

Required capabilities:

- Anti-Rot action library and rotation;
- Challenges with daily, weekly and monthly cadence;
- reward currency ledger;
- Shop rewards and redemption;
- calm, limited gamification without manipulative patterns.

### 5.14 Personal AI Assistant

The assistant is informative first and action-capable only through reviewed tools.

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
- recipes;
- recipe ingredients;
- meals.

Planned domains:

- reviews;
- mood, sleep and weight entries;
- habits and habit logs;
- running/strength plans and sessions;
- schedule source links and free calendar events;
- notes, journal and wiki pages;
- scientific work and literature;
- work logs;
- inventory and wishlist;
- challenges, reward ledger and shop items;
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
Daily Core and Reviews
→ Scheduling and Routines
→ Mood, Sleep, Weight and Habits
→ Running and Strength
→ Portfolio and Knowledge depth
→ Coding, Education, Work and Life
→ Motivation and Rewards
→ Personal AI Assistant
→ Integrations and Analytics
→ Final local-first hardening
```
