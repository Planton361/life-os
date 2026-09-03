# Life OS Capability Registry

**Status:** Active
**Purpose:** capability-level truth for what is connected, partial, UI-only or not started
**Update rule:** update after every material feature block
**Source hierarchy:** code and current browser proofs override historical roadmap claims

## Status Definitions

| Status | Meaning |
|---|---|
| `CONNECTED` | UI, canonical data, write/read path, reload and focused proof are complete |
| `CONNECTED_GAP` | core works, but an important depth, projection or management capability is missing |
| `UI_ONLY` | visible UI exists without a canonical data/backend path |
| `MODEL_ONLY` | schema/backend exists, but the user-facing capability is missing |
| `NOT_STARTED` | no reliable implementation exists |
| `EXTERNAL_GATE` | depends on an external provider, permission or hardware decision |
| `DECISION_REQUIRED` | product/data/security semantics must be decided before implementation |

## Registry Rules

- Do not aggregate an entire page into one optimistic claim.
- Dashboard and area pages are projections; their source capability owns the canonical data.
- `CONNECTED_GAP` must name the missing depth.
- Demo fixtures do not count as connected Manual capability.
- Historical QA is supporting evidence, not current truth if the code changed.

## Active Product Boundary (R0)

Implementation status and product visibility are separate truths: `CONNECTED` code may be deferred and hidden without being deleted or relabeled as unimplemented.

| Surface / domain | Boundary | Current implementation truth | Visibility truth / next action |
|---|---|---|---|
| Dashboard | `ACTIVE` | connected daily-control projection with named gaps below | daily control only; deferred Motivation projections removed in C1.1-01 |
| Inbox | `ACTIVE` | connected capture/triage core | fast capture and triage into the canonical spine |
| Today | `ACTIVE` | connected execution/review core | daily protocol and planned-vs-done depth belongs to C3 |
| Calendar | `ACTIVE` | connected task scheduling with named gaps | week-first planning hub depth belongs to C2 |
| Portfolio | `ACTIVE` | connected Task/Project/Goal/Skill workbenches with graph gaps | canonical management hub; C1 is next |
| Resources | `ACTIVE` | connected knowledge core with relation depth gaps | knowledge base and evidence; K1 follows C3 |
| Health / Fitness | `ACTIVE` | connected core records and projections | domain records link to Task Occurrences; H1/H2 depth later |
| Nutrition | `ACTIVE` | connected recipes/meals with portion gaps | domain records link to Task Occurrences; N1 depth later |
| Work / Education / Coding | `ACTIVE` | A1 Target browser proof covers canonical Projects, Resources and reload-stable logs; named depth gaps remain below | area projections over the canonical spine; no area-local core copies |
| Inventory / Wishlist | `ACTIVE` | A1 Target browser proof covers Manual CRUD, purchase decisions and idempotent conversion after reload | Inventory and explicit Wishlist links remain reachable in active Life navigation |
| Anti-Rot / Challenges / Shop | `DEFERRED_HIDDEN` | connected feature code/data; direct routes remain intact | C1.1-01 removed Sidebar, Dashboard and normal Daily-Companion entry points |
| Entertainment | `DEFERRED_HIDDEN` | connected collection code/data; direct routes remain intact | C1.1-01 removed Sidebar, Life overview and obvious active cross-links |
| AI1 Personal Assistant | `DEFERRED` | not started / external decisions outstanding | do not continue during C1→A1 |

Visibility state after C1.1-01: active navigation exposes Inventory and Wishlist, while Entertainment, Shop and Challenges are absent. Dashboard no longer composes Anti-Rot or Challenge panels. Deferred routes, feature code, migrations and data remain retained and directly addressable.

## Active Delivery Sequence

```text
C1 Core Work Graph
→ C2 Weekly Planning Calendar
→ C3 Daily Companion Loop
→ K1 Knowledge Base
→ H1/H2 Health and Fitness
→ N1 Nutrition
→ A1 Work/Education/Coding/Inventory
→ Z1 Final Local Product Closure & Hardening
```

# 1. Dashboard

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| SR1-04 personal Target runtime | `CONNECTED` | personal transfer, candidate-volume preservation, same-user reauthorization, authenticated read/write proof and persistent default-runtime Target switch passed | maintain Target as canonical local runtime; Source is `LEGACY_FALLBACK_READ_ONLY` |
| Quick Thought → Inbox | `CONNECTED` | Inbox capture action and reload proof | maintain |
| Tasks Today summary | `CONNECTED` | central server-side Dashboard task projection; completed/open count semantics | maintain |
| Focus Time summary | `UI_ONLY` | honest unavailable source state | add canonical focus/deep-work classification before deriving minutes |
| Inbox summary | `CONNECTED` | user-scoped inbox items in Dashboard Read Model | maintain |
| Nutrition summary | `CONNECTED_GAP` | today's meals and completed-meal recipe estimates | portion/target semantics remain separate |
| Review Status summary | `CONNECTED` | canonical current Daily/Weekly Review records and navigation | maintain review projection proofs |
| Sleep summary | `CONNECTED` | canonical latest sleep entry from the shared Health repository; reload/browser proof | maintain |
| Daily Control current task | `CONNECTED` | deterministic state/time/priority/date/recency/id policy | maintain policy tests |
| Daily Control Up Next | `CONNECTED` | same deterministic persisted-signal ranking, bounded to three | maintain policy tests |
| Time Progress | `CONNECTED` | Europe/Berlin local-day elapsed time plus scheduled task load | maintain |
| Weather | `NOT_STARTED` | honest Unavailable state; no API | optional external read gate |
| Mood entry | `CONNECTED` | timestamped user-scoped mood entries from Dashboard with same-day soft undo | maintain labels, semantic color and ownership proof |
| Mood current state | `CONNECTED` | latest local-day Mood entry plus Mental Health history | maintain timezone/reload proof |
| Weight goal | `CONNECTED` | canonical weight entries and single personal goal with honest measured start-to-target progress | maintain |
| Nutrient Balance | `CONNECTED_GAP` | completed meals + manual recipe estimates; unknown remains unknown | add reliable portion and target semantics |
| Meals Today | `CONNECTED_GAP` | user-scoped meals plus canonical linked Task scheduling and atomic completion synchronization | multiple-meal slot depth and portion semantics remain |
| Latest Run | `CONNECTED` | latest completed, non-archived running_session with derived pace on Dashboard and Health | maintain reload and timezone proof |
| Muscle Map | `CONNECTED` | explicit exercise_muscles mappings plus real strength_set_logs; planned fallback is source-labeled | maintain source labels and set-log proof |
| Today Agenda day view | `CONNECTED` | canonical task schedule and lifecycle fields; C3 Target browser proof covers planned, open and done work after reload | maintain task-based core |
| Today Agenda week/month | `CONNECTED_GAP` | Calendar/visual projection | align with canonical Calendar views |
| Urgent time-block create | `UI_ONLY` | visible action | implement schedule/create flow without duplicate data |
| Habit Tracker | `CONNECTED` | canonical Habits/Habit Logs, automatic profile-window projection and authenticated increment/undo reload proof | maintain eight-slot/window and timezone proofs |
| Active Portfolio | `CONNECTED_GAP` | user-scoped projects/goals/skills, bounded existing ranking | explicit pin/favorite model remains |
| Anti-Rot Actions | `UI_ONLY` | retained Dashboard component is no longer composed; the underlying feature is connected elsewhere | deferred/hidden by R0 and C1.1-01 |
| Challenges | `UI_ONLY` | retained Dashboard component is no longer composed; the underlying feature is connected elsewhere | deferred/hidden by R0 and C1.1-01 |

# 2. Inbox

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Quick Capture | `CONNECTED` | inbox items | maintain |
| Active item selection | `CONNECTED` | URL/query selection and reload proof | maintain |
| Clean title/context/next action | `CONNECTED` | inbox item fields/action path | verify all fields persist across all routes |
| Standalone Task route | `CONNECTED` | task action | maintain |
| Create Project route | `CONNECTED` | project action | maintain |
| Create Goal route | `CONNECTED` | goal action | maintain |
| Create Resource route | `CONNECTED` | resource action | maintain |
| Add to existing Project/Goal | `CONNECTED` | task relation actions | maintain |
| Solve/Archive | `CONNECTED` | inbox resolve path | maintain |
| Note route | `CONNECTED_GAP` | capture/note-like data | confirm canonical Note entity and destination |
| Skill route | `CONNECTED_GAP` | skills exist | complete routing if still prepared |
| Planning signals | `CONNECTED_GAP` | supported task fields | expose only persisted fields and clear unsupported hints |
| AI suggestion review | `CONNECTED_GAP` | deterministic local provider | DeepSeek provider remains future; no auto-write |
| Related context search | `CONNECTED_GAP` | local related entities | broaden search only after relation/search model |

# 3. Today and Reviews

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Today task projection | `CONNECTED` | canonical Task occurrence schedule/lifecycle fields; C3 Target proof distinguishes scheduled, open planned and done work after reload | maintain |
| Task planning | `CONNECTED_GAP` | canonical Target Runtime keeps source-aware application planning: normal Tasks remain direct; Meal-linked plan/reschedule/unschedule use canonical atomic Meal↔Task writes; Review/Workout remain Task-time-only; C2-04 verifies the Calendar/Today/Dashboard projection after reload | direct Data API hardening remains separate |
| Task complete/reopen | `CONNECTED_GAP` | canonical Target Runtime: C3 proves normal Task completion/reopen across Today, Dashboard and Calendar; Review/Running/Strength generic completion rejection and Meal UI completion remain source-aware | direct Data API hardening remains separate |
| Recurring instance projection | `CONNECTED` | explicit idempotent generation, DB uniqueness, pure-rule tests and authenticated Today/Dashboard/Calendar reload proof | maintain |
| Carry-over/open loops | `CONNECTED` | canonical Target Runtime C3 proof saves an explicit Daily Review carry-over decision, moves only the selected open Task to the next day and reload-proves Review, Today and Task planning together | maintain atomic exact-set reconciliation and newer-planning protection |
| Daily Review | `CONNECTED` | canonical user-scoped review record, V5 flow and Dashboard/Today projections | maintain |
| Weekly Review | `CONNECTED` | canonical user-scoped review record with derived task/project movement | maintain |
| Next-day preparation | `CONNECTED` | Daily Review focus plus explicit carry-over target date | maintain |
| Review history | `NOT_STARTED` | none | add detail/history after canonical records |

# 4. Calendar and Scheduling

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Planner Queue | `CONNECTED` | C2-01 server read model contains exactly open, unscheduled canonical Task Occurrences, ranked once by overdue/deadline/recurring/Project/direct-Goal/backlog signals with compact context and reason; C2-04 retains this deterministic path through keyboard scheduling and reload | canonical filters remain a later read-surface depth |
| Schedule task | `CONNECTED` | Week Queue/Inspector runs the authenticated, source-aware Task schedule action; C2-04 confirms keyboard execution, Calendar/Today/Dashboard projection and reload | maintain |
| Move earlier/later | `CONNECTED` | Inspector move controls and C2-02 cross-day pointer movement call the canonical reschedule action and survive reload | maintain |
| Duration change | `CONNECTED` | Inspector duration controls and the C2-02 bottom resize handle use the same canonical duration update and survive reload | maintain |
| Unschedule | `CONNECTED` | Inspector unschedule removes the timed block and returns the Task to the canonical queue immediately and after reload | maintain |
| Visible conflict gate | `CONNECTED_GAP` | C2-02 detects an overlap from loaded blocks, exposes an explicit visible conflict state and preserves the prior block after cancellation/reload | no DB-wide guarantee; source-aware conflict model later |
| Conscious override | `CONNECTED_GAP` | same reschedule path | no audit/history yet |
| Day/Week views | `CONNECTED` | Manual Week remains the primary planning surface; C2-03/C2-04 confirm reload-stable Day navigation over the same canonical schedule and all-day temporal signals | canonical filters remain a later read-surface depth |
| Month view | `CONNECTED` | C2-03/C2-04 prove the bounded Month grid projects canonical scheduled Task occurrences, Task deadlines, Project deadlines and Goal targets with keyboard Day drill-down and reload | canonical filters remain a later read-surface depth |
| Deadline / Project / Goal date projection | `CONNECTED` | C2-03/C2-04 keep scheduled time distinct from Task deadline, Project deadline and Goal target; open overdue Tasks are read-time marked while completed Tasks are not | canonical Project/Goal milestones remain separately unmodeled |
| Calendar filters | `NOT_STARTED` | no active Manual filter claim; legacy visual scope controls are not exposed as Calendar planning filters | implement only canonical Project/Goal/Skill/Priority filters when needed |
| Project/Goal/Skill queue context | `CONNECTED` | C2-01 queue reads existing C1 Project, direct/via Project Goal and Task↔Skill relations without copying Task data | add filters only as a separate read-surface depth |
| Recurring/routine scheduling | `CONNECTED` | user-scoped template list/create/edit/pause/reactivate, explicit date/range generation and authenticated reload proof; no background writes | maintain |
| Meal schedule source | `CONNECTED_GAP` | canonical Target Runtime keeps the source-aware Meal↔Task schedule/completion boundary; C2-02 creates and pointer-moves a Meal Task through that boundary with reload proof | direct Data API hardening remains separate |
| Workout schedule source | `CONNECTED_GAP` | canonical Target Runtime keeps Task-only scheduling and generic completion guards for Running Plan Item and Strength Plan Tasks; C2-02 pointer-moves Running and C2-04 reload-proves one Strength Calendar Task | direct Data API hardening remains separate |
| Review schedule source | `CONNECTED_GAP` | canonical Target Runtime keeps Review Task scheduling and generic completion rejection; C2-04 proves exactly one reload-stable Daily Review Calendar Task | direct Data API hardening remains separate |
| Free calendar events | `NOT_STARTED` | none | separate model decision |
| Drag/drop/resize | `CONNECTED` | C2-02 dependency-free pointer layer maps Queue drop, cross-day move and duration resize to existing source-aware schedule/reschedule actions; loaded conflict confirmation, cancel/invalid-drop rollback, reload and Inspector fallback are focused-browser-proven | no keyboard DnD required because the full Inspector scheduling flow remains equivalent; canonical filters remain separate |
| Schedule history/audit | `NOT_STARTED` | none | later lifecycle/audit model |

# 5. Portfolio, Projects, Goals and Skills

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Task create/edit/lifecycle | `CONNECTED` | K1.1A Portfolio Task Detail, task actions/repository, reload proof | maintain |
| Task relation to Project/Goal | `CONNECTED` | nullable Task→Project/Goal fields, server-authenticated/Zod/user-scoped alignment checks and C1.1 integrated Target reload proof | maintain explicit user choices; no silent relinking |
| Task relation to Skill/Resource | `CONNECTED` | owned n:m `task_skill_links` plus Resource relations, idempotent link/unlink, Task detail projection and Skill backlink without creating Evidence; C1.1 integrated proof PASS | maintain endpoint ownership, reload and no-auto-Evidence proofs |
| Project Goal inheritance in Task context | `CONNECTED` | direct, via-Project, redundant and existing-conflict states are explicit; Task and Project writes reject new contradictions, and C1.1 integrated read models deduplicate matching paths | preserve existing rows; resolve any future reported existing conflicts deliberately |
| Core work graph backlinks | `CONNECTED` | C1.1 integrated Target proof covers Task/Project/Goal/Skill/Resource navigation, reload, ownership boundaries and deterministic direct, via-Project, Context and Evidence provenance | retain bounded explicit relations; graph visualization stays deferred |
| Project create/edit/status/archive | `CONNECTED` | project actions/repository | add restore/complete semantics later |
| Goal create/edit/status/archive | `CONNECTED` | goal actions/repository | add achieve/restore semantics later |
| Skill create/edit/archive | `CONNECTED` | skill actions/repository | maintain |
| Skill evidence CRUD/source links | `CONNECTED` | skill evidence | maintain |
| Project linked tasks | `CONNECTED` | task project relation | add sequencing/roadmap model |
| Goal linked projects/tasks | `CONNECTED` | goal relations | add outcome/review semantics |
| Project/Goal resource links | `CONNECTED` | resource relations | add unlink/edit/manage |
| Project/Goal evidence display | `CONNECTED_GAP` | skill evidence read projection | create/manage from workbench later |
| Project milestones | `NOT_STARTED` | none | model decision and complete vertical slice |
| Goal milestones/key results | `NOT_STARTED` | none | model decision; avoid fake OKR engine |
| Project/Goal logs | `NOT_STARTED` | none | add canonical log records |
| Review cadence | `NOT_STARTED` | none | connect to reviews after D1.2 |
| Project/Goal restore/undo | `NOT_STARTED` | archive exists | lifecycle slice |
| Progress engine | `DECISION_REQUIRED` | task-based signals and legacy fields | preserve honest work signals until model exists |
| Portfolio pins/favorites | `NOT_STARTED` | none | support Dashboard max-four selection |

# 6. Resources and Knowledge

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Resource create/read | `CONNECTED` | canonical Target Runtime K1 proof creates, edits and reloads Resource metadata | maintain |
| Resource inspector | `CONNECTED` | canonical Target Runtime K1 proof opens the selected Resource from Library search and shows real Task/Project/Goal/Skill context | maintain |
| Resource archive/restore | `CONNECTED` | soft `archived_at` lifecycle: K1 Target proof preserves existing relations/Evidence, removes the Resource from active Library/search, then restores it reload-stably | maintain |
| Resource relations | `CONNECTED` | Resource inspector link/unlink plus owned Task, Project, Goal and Skill Context links; C1/K1 Target proofs preserve separate Evidence semantics and reload-stable backlinks | relation-type editing remains separate future depth |
| Project/Goal workbench display | `CONNECTED` | relation read model | maintain |
| Resource search | `CONNECTED` | user-scoped deterministic active-Library filter across canonical title, description, URL and type; K1 Target proof covers result-to-inspector navigation and archived exclusion | tags/full-text ranking remain deferred |
| Files/attachments | `NOT_STARTED` | none | storage/privacy decision |
| Notes/wiki resources | `CONNECTED_GAP` | resource/note concepts | canonical Note/Wiki model needed |
| Semantic relation read model | `CONNECTED` | server-side projection of `tasks.project_id`, `tasks.goal_id`, `projects.goal_id`, `resource_relations`, Skill Evidence and `task_skill_links`; C1/K1 Target proofs verify deterministic direct, via-Project, Context and Evidence dedupe | wider knowledge provenance remains a later bounded scope |
| Resource/Skill graph | `NOT_STARTED` | no proven graph read model | no visual library before semantics |
| Embeddings/semantic search | `DECISION_REQUIRED` | none | privacy and permission decision |

# 7. Nutrition

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Recipe create/edit/archive | `CONNECTED` | recipes/actions | maintain |
| Recipe ingredients CRUD | `CONNECTED` | recipe_ingredients | maintain |
| Meal create/edit/reschedule/complete | `CONNECTED` | meals/actions | maintain |
| Recipe switch | `CONNECTED` | meal update ownership | maintain |
| Meal Planner week view | `CONNECTED` | canonical Target N1 proof reloads a recipe-linked Meal in the weekly planner and schedules it only through the source-aware Meal↔Task boundary | multiple meals per slot and additional slots are separate future depth |
| Grocery Draft | `CONNECTED` | canonical Target N1 proof derives open Meal demand from persisted Recipe Ingredients and Meal/Recipe servings with reload-stable fractional scaling | no persistence/check-off/pantry |
| Manual nutrition estimate | `CONNECTED_GAP` | optional recipe JSON estimate | provenance only; no real engine |
| Meals Today | `CONNECTED` | canonical Target N1 proof projects the scheduled Meal and canonical completion across Nutrition, Today, Calendar and Dashboard after reload | multiple meals per slot remains separate future depth |
| Nutrient Balance | `CONNECTED` | completed Meals and persisted Recipe estimates scale deterministically by Meal servings; the Target N1 proof keeps missing estimates explicitly unavailable | no fake totals; absent Recipe estimates remain unknown |
| Persistent grocery items | `NOT_STARTED` | none | model later |
| Pantry/inventory | `NOT_STARTED` | none | model and receipt workflow later |
| Receipt OCR | `EXTERNAL_GATE` | none | privacy/provider decision |
| Unit conversion | `DECISION_REQUIRED` | free-text units | normalization/catalog decision |
| Portion/serving model | `CONNECTED` | versioned N1 `meals.servings` is validated, user-scoped and reload-proven on the canonical Target; it scales Recipe-serving-based Grocery demand plus recipe-scoped estimates deterministically | no nutrition value is inferred when its Recipe estimate is absent |
| Macro/calorie engine | `NOT_STARTED` | no reliable nutrition source | external data/model decision |
| Recipe detail route | `UI_ONLY` | selected panel exists | build only if it adds real depth |

# 8. Mental Health, Mood, Sleep and Weight

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Mood entry | `CONNECTED` | mood_entries, Dashboard action, auth/Zod/RLS and H1/H2 Target-Runtime reload proof | maintain |
| Mood trend | `CONNECTED` | timestamped labeled/color-paired Mental Health history | richer aggregation remains optional, without diagnosis |
| Sleep entry | `CONNECTED` | date-keyed editable sleep_entries with duration, optional quality/note; H1/H2 Target-Runtime reload proof | maintain |
| Sleep trend | `CONNECTED` | reload-stable Mental Health history and Dashboard latest-night projection | maintain |
| Weight entry | `CONNECTED` | date-keyed editable weight_entries and Health history; H1/H2 Target-Runtime reload proof | maintain |
| Weight goal | `CONNECTED` | single user-scoped weight_goals row, optional target date and honest progress | maintain |
| Journal linkage | `UI_ONLY` | journal/nav exists | canonical journal/notes and privacy |
| Mental Health overview | `CONNECTED_GAP` | canonical Mood history and Sleep entry/history are connected without medical claims | journal linkage and later review associations remain separate |

# 9. Habits

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Habit definition | `CONNECTED` | user-scoped canonical habits with create/edit/order/archive UI and RLS | maintain |
| Flexible unit/increment | `CONNECTED` | optional unit/target plus positive default increment; no-target state proven | maintain |
| Morning/Midday/Evening window | `CONNECTED` | ordered profile boundaries, full-day resolution and per-window DB slot constraint | maintain timezone and boundary tests |
| Dashboard increment click | `CONNECTED` | each click appends an owned timestamped habit_log; H1/H2 Target-Runtime dashboard/history reload proof | maintain |
| Daily completion | `CONNECTED` | local-date log aggregation with honest overachievement and no invented percentage | maintain |
| Habit history/trends | `CONNECTED` | real log-derived seven-day cards and 30-day signals on Habits/Health | maintain |
| Habit archive | `CONNECTED` | soft archive removes active Dashboard slot while retaining historical log projection | restore remains a separate future lifecycle capability |

# 10. Running and Strength

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Manual run entry | `CONNECTED` | user-scoped running_sessions with create/edit/soft archive, positive distance/duration and optional time/HR/notes | maintain reload and RLS proofs |
| Latest run Dashboard | `CONNECTED` | latest completed running_session; pace deterministically derived from distance and duration, H1/H2 Target-Runtime reload proof | maintain |
| Running plan | `CONNECTED` | archived running_plans plus ordered editable running_plan_items and executable schedule links; H1/H2 Target proof keeps a plan task visible across Calendar, Today and Dashboard until a real run completes it | maintain idempotent scheduling proof |
| Running trends | `CONNECTED` | real completed-session Today/7-day/30-day totals and history on Running/Health | maintain timezone boundary proof |
| Garmin import | `EXTERNAL_GATE` | none | partner/API decision; manual path remains complete |
| Exercise library | `CONNECTED` | user-scoped exercises with transactional controlled muscle mappings, edit and soft archive | maintain historical readability |
| Strength plan | `CONNECTED` | editable strength_plans and ordered strength_plan_items with sets/reps/optional load | maintain ownership and ordering proofs |
| Strength session/sets | `CONNECTED` | reload-stable strength_sessions and real strength_set_logs with transactional task completion sync; H1/H2 Target proof requires a real set before task completion | maintain weighted/unweighted semantics |
| Muscle map | `CONNECTED` | explicit exercise-muscle relations and log-derived set intensity/weighted volume with textual source labels; H1/H2 Target-Runtime Dashboard reload proof | maintain |
| Workout schedule source | `CONNECTED` | H1/H2 Target-Runtime proof schedules one canonical Running Plan Item and Strength Plan Task, projects each to Calendar/Today/Dashboard, rejects generic Task completion, then completes only from the real Run or Strength Session with set log | retain no-duplicate and completion-sync regressions |

# 11. Coding and Agents

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Repository library | `CONNECTED` | A1 Target browser proof creates a Coding-Area canonical Project with manual repository URL, Core backlink and reload | automated repository sync remains external-gated |
| GitHub link | `CONNECTED` | A1 Target browser proof persists and reloads the optional manual Project repository URL | GitHub API or automatic sync remains a separate external gate |
| GitHub API | `EXTERNAL_GATE` | none | later read-only decision |
| Coding project log | `CONNECTED` | A1 Target browser proof creates a user-scoped `coding_sessions` record with canonical Project ownership and reload | automatic time tracking remains out of scope |
| Course/learning path | `UI_ONLY` | skills/education concepts | connect to skills/evidence |
| Agent session tracking | `NOT_STARTED` | no canonical `agent_sessions` model; Manual and Empty render an honest non-interactive Prepared state | deferred retained model; do not start AI1/provider work without a separate decision |
| Prompt library | `UI_ONLY` | page concepts | canonical resources/templates |
| Coding knowledge map | `UI_ONLY` | skill map shell | relation read model first |

# 12. Education

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Scientific work | `CONNECTED_GAP` | A1 Target browser proof creates an Education-Area canonical Project with Core backlink, literature Resource and learning log after reload | dedicated scientific-work metadata remains intentionally deferred; no parallel model |
| Literature library | `CONNECTED_GAP` | A1 Target browser proof creates a canonical Resource and reload-stable Project link through `resource_relations` | create-and-link is sequential rather than atomic, so a link failure can leave a standalone Resource; reading status and bibliographic metadata remain deferred until safely modeled |
| Learning log | `CONNECTED` | A1 Target browser proof creates a user-scoped `education_logs` record and reloads it in the canonical Project context | maintain aggregation and ownership proofs |
| Thesis/project relation | `CONNECTED` | A1.1B1 user-owned `education` Area with canonical Projects, Tasks, Deadlines and literature Resources | maintain same-user relation ownership |
| Writing best practices/resources | `CONNECTED_GAP` | A1.1B1 scoped Resources plus A1.1B2 Writing Logs with signed word deltas | dedicated prompt/template management remains separate depth |
| Education dashboard | `CONNECTED_GAP` | Manual Education workspace projects, task/deadline context, literature and A1.1B2 Learning/Writing activity | Literature create-and-link remains non-atomic; richer scientific metadata remains deferred |

# 13. Work

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Work projects/tasks | `CONNECTED` | A1 Target browser proof creates a user-owned Work-Area canonical Project and confirms its Core backlink after reload | maintain reload and same-user ownership proofs |
| Work log | `CONNECTED` | A1 Target browser proof creates a user-scoped `work_logs` record and reloads it in the Manual workspace | automatic time tracking and analytics remain out of scope |
| Work wiki | `CONNECTED_GAP` | A1 Target browser proof creates a canonical Work-Area Resource (`note`) with its Project context and reloads it | create-and-link is sequential, so a relation failure can leave a standalone Work Resource; no refactor in this slice |
| Meetings | `CONNECTED` | A1.1C2b user-scoped `work_meetings` with canonical Work-Project ownership, create/edit/soft archive and reload-stable historical Manual workspace | maintain meeting ownership and archive proofs |
| Decisions | `CONNECTED` | A1.1C2a user-scoped `work_decisions` with Work-Project ownership, status, create/edit/archive and reload-stable history | maintain ownership and status proofs |
| Follow-ups | `CONNECTED` | A1.1C2b canonical `tasks` linked by `work_meeting_followups`; Security-Invoker RPC atomically creates the owned Task and Meeting relation, while existing owned Tasks can link/unlink independently | no automatic Task completion or external sync |
| Work dashboard | `CONNECTED_GAP` | Manual Work workspace reads canonical Projects, Tasks/Deadlines, Resources, Logs, Wiki, Decisions, Meetings and Meeting Follow-ups | Work Wiki create-and-link remains sequential and non-atomic |

# 14. Life and Personal

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Journal | `CONNECTED` | A1.1D1 user-scoped `journal_entries` with date, optional title, body, create/edit/soft archive, chronological active/history views and reload proof | Mood, Health and Daily/Weekly Reviews remain separate canonical domains |
| Notes | `CONNECTED` | A1.1D1 canonical Life-Area `resources` (`note`) with create/edit/archive/restore, reload-stable active/history views and visible existing Project/Goal/Task relations or honest empty state | relation creation remains on the established Resource surfaces; no parallel Notes platform |
| Entertainment collection | `CONNECTED` | A1.1D2 canonical user-scoped `entertainment_items`; direct routes and complete lifecycle remain retained | `DEFERRED_HIDDEN` boundary is applied to Sidebar, Life overview and active cross-links by C1.1-01 |
| Inventory | `CONNECTED` | A1 Target browser proof creates and edits user-scoped `inventory_items`, then reloads the active item | external merchants, guarantees, insurance and accounting remain unimplemented |
| Wishlist | `CONNECTED` | A1 Target browser proof creates a user-scoped `wishlist_items` record and reloads its acquired lifecycle state | external price tracking, ordering and product APIs remain external gates |
| Purchase Decisions | `CONNECTED` | A1 Target browser proof creates a historical `purchase_decisions` record, then proves the atomic idempotent Wishlist→Inventory RPC by its single Inventory projection after reload | no payment, merchant integration or automated purchase action |
| Personal dashboard | `UI_ONLY` | area shell | bind canonical data |

# 15. Challenges, Anti-Rot and Shop (`DEFERRED_HIDDEN`)

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Anti-Rot action library | `CONNECTED` | M1.1B1 user-scoped `anti_rot_actions` with create/edit, pause/reactivate, soft archive/restore and reload-stable Manual library on `/challenges` | Dashboard Anti-Rot projection remains a separate prepared surface |
| Anti-Rot rotation | `CONNECTED` | M1.1B1 explicit deterministic least-recently-used selection over active actions; user-serialized atomic RPC preserves the recommendation across reload and avoids an immediately skipped action when alternatives exist | no automatic recommendation, notification or AI selection |
| Anti-Rot completion / skip history | `CONNECTED` | M1.1B1 append-only `anti_rot_events`; atomic and idempotent Completion/Skip RPCs resolve each recommendation at most once with reload-stable provenance | no Anti-Rot coin reward; Shop and Redemption remain open |
| Challenge Management | `CONNECTED` | M1.1A user-scoped `challenges` with create/edit/abandon/archive, explicit eligible-only completion and reload-stable active/history views | no automatic generation; Dashboard recomposition remains separate |
| Challenge Progress | `CONNECTED` | M1.1A append-style `challenge_progress_logs` with positive increments, latest-log correction/archive, active-log aggregation and overachievement proof | no Habit or recurring-task duplication |
| Reward Ledger | `CONNECTED` | M1.1A/M1.1B2 append-only `reward_ledger_entries`; balance is derived by sum, Challenge completion credits positive rewards and Shop Redemption atomically records exact negative spending | no freely editable balance, refunds or Real-Money conversion; Anti-Rot completion intentionally creates no coins |
| Shop Item Management | `CONNECTED` | M1.1B2 user-scoped `shop_items` with create/edit, pause/reactivate, soft archive/restore and reload-stable Manual catalog on `/shop` | no merchant, ordering, payment or external product integration |
| Shop Redemption | `CONNECTED` | M1.1B2 explicit `redeem_shop_item` RPC serializes per user, checks current server-side balance and item availability, and atomically creates one `shop_redemptions` row plus its negative ledger entry | no automatic redemption or refund |
| Reward Ledger Spending | `CONNECTED` | M1.1B2 idempotent request keys prevent duplicate redemption/debit; immutable title and cost snapshots preserve historical truth after Shop Item edits | no Real-Money value, exchange rate or payment semantics |

# 16. Personal AI Assistant (`DEFERRED`)

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Morning briefing | `NOT_STARTED` | none | do not continue during C1→A1 |
| Evening review conversation | `NOT_STARTED` | none | do not continue during C1→A1 |
| Database questions | `NOT_STARTED` | none | deferred; future structured reads only, no direct DB |
| Resource search | `CONNECTED_GAP` | resource search exists | product search remains active; AI tool exposure is deferred |
| Confirmed write tools | `NOT_STARTED` | existing actions exist | deferred provider/tool boundary and confirmation UI |
| DeepSeek provider | `EXTERNAL_GATE` | none | server-only API/security/cost decision |
| AI conversation/history | `DECISION_REQUIRED` | none | privacy, retention and review decision |

# 17. Settings and Operations

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Local Supabase auth/session | `CONNECTED` | settings/auth path | maintain |
| Manual/Demo/Empty profile switch | `CONNECTED` | profile mode | maintain |
| Playwright auth-state capture | `CONNECTED` | local script | maintain |
| Local startup runbook | `CONNECTED` | ops docs | maintain |
| Local backup create | `CONNECTED` | ops script | maintain |
| Restore smoke | `CONNECTED_GAP` | compatibility-bootstrap smoke | no full Supabase runtime restore claim |
| Private remote | `EXTERNAL_GATE` | intentionally not active | explicit user decision later |
| Public SaaS | `NOT_STARTED` | not a goal | do not plan by default |

## Update Rule

The user/Codex prompt selects a `ROADMAP.md` block ID. Update this registry after each completed material capability so it remains the sole dynamic documentation source for implementation status.
