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

# 1. Dashboard

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
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
| Today Agenda day view | `CONNECTED` | task scheduling fields | maintain task-based core |
| Today Agenda week/month | `CONNECTED_GAP` | Calendar/visual projection | align with canonical Calendar views |
| Urgent time-block create | `UI_ONLY` | visible action | implement schedule/create flow without duplicate data |
| Habit Tracker | `CONNECTED` | canonical Habits/Habit Logs, automatic profile-window projection and authenticated increment/undo reload proof | maintain eight-slot/window and timezone proofs |
| Active Portfolio | `CONNECTED_GAP` | user-scoped projects/goals/skills, bounded existing ranking | explicit pin/favorite model remains |
| Anti-Rot Actions | `UI_ONLY` | honest Prepared state without fake completion | implement library, rotation and completion |
| Challenges | `UI_ONLY` | honest Prepared state without fake completion | implement challenge lifecycle and reward link |

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
| Today task projection | `CONNECTED` | planned/scheduled tasks | maintain |
| Task planning | `CONNECTED` | task planning actions | maintain |
| Task complete/reopen | `CONNECTED` | lifecycle actions | maintain |
| Recurring instance projection | `CONNECTED` | explicit idempotent generation, DB uniqueness, pure-rule tests and authenticated Today/Dashboard/Calendar reload proof | maintain |
| Carry-over/open loops | `CONNECTED` | canonical review records plus atomic user-scoped task decisions | maintain ownership and reload proofs |
| Daily Review | `CONNECTED` | canonical user-scoped review record, V5 flow and Dashboard/Today projections | maintain |
| Weekly Review | `CONNECTED` | canonical user-scoped review record with derived task/project movement | maintain |
| Next-day preparation | `CONNECTED` | Daily Review focus plus explicit carry-over target date | maintain |
| Review history | `NOT_STARTED` | none | add detail/history after canonical records |

# 4. Calendar and Scheduling

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Planner Queue | `CONNECTED` | unscheduled/planned tasks | maintain |
| Schedule task | `CONNECTED` | task schedule fields/actions | maintain |
| Move earlier/later | `CONNECTED` | reschedule action | maintain |
| Duration change | `CONNECTED` | duration field/action | maintain |
| Unschedule | `CONNECTED` | unschedule action | maintain |
| Visible conflict gate | `CONNECTED_GAP` | loaded blocks | no DB-wide guarantee; source-aware conflict model later |
| Conscious override | `CONNECTED_GAP` | same reschedule path | no audit/history yet |
| Day/Week views | `CONNECTED_GAP` | task projections | verify all controls and filters use real data |
| Month view | `UI_ONLY` | prepared view | connect to canonical schedule sources |
| Calendar filters | `UI_ONLY` | visual filters | implement area/type/project/goal/skill filtering |
| Project/Goal queue | `UI_ONLY` | visual concepts | derive tasks and roadmap order from canonical relations |
| Recurring/routine scheduling | `CONNECTED` | user-scoped template list/create/edit/pause/reactivate, explicit date/range generation and authenticated reload proof; no background writes | maintain |
| Meal schedule source | `CONNECTED` | idempotent user-scoped source link to canonical Task scheduling; Calendar/Today/Dashboard projection and atomic bidirectional completion | maintain reload and ownership proofs |
| Workout schedule source | `CONNECTED` | idempotent running_plan_item/strength_plan links to canonical Tasks with transactional session completion sync | maintain Calendar/Today/Dashboard and ownership proofs |
| Review schedule source | `CONNECTED` | Daily/Weekly Reviews link idempotently to canonical executable Tasks with atomic bidirectional completion | maintain reload and ownership proofs |
| Free calendar events | `NOT_STARTED` | none | separate model decision |
| Drag/drop/resize | `NOT_STARTED` | none | accessible comfort slice after source model |
| Schedule history/audit | `NOT_STARTED` | none | later lifecycle/audit model |

# 5. Portfolio, Projects, Goals and Skills

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Task create/edit/lifecycle | `CONNECTED` | K1.1A Portfolio Task Detail, task actions/repository, reload proof | maintain |
| Task relation to Project/Goal | `CONNECTED` | K1.1A Task Detail with nullable task relation fields and ownership checks | maintain |
| Task relation to Skill/Resource | `CONNECTED_GAP` | K1.1A Resource link/unlink via `resource_relations`; Skill evidence only | dedicated Task↔Skill relation remains deferred until safely modeled |
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
| Resource create/read | `CONNECTED` | K1.1B canonical Resource create/edit read model with reload proof | maintain |
| Resource inspector | `CONNECTED` | K1.1B editable metadata, archive status and real relation sections | maintain |
| Resource archive/restore | `CONNECTED` | K1.1B soft archive via `archived_at` and restore lifecycle | maintain |
| Resource relations | `CONNECTED` | K1.1B Resource inspector link/unlink plus K1.1A task and existing Project/Goal flows | relation-type editing remains separate future depth |
| Project/Goal workbench display | `CONNECTED` | relation read model | maintain |
| Resource search | `CONNECTED` | K1.1B user-scoped Manual read model filter across title, description, URL and type | tags/full-text ranking remain deferred |
| Files/attachments | `NOT_STARTED` | none | storage/privacy decision |
| Notes/wiki resources | `CONNECTED_GAP` | resource/note concepts | canonical Note/Wiki model needed |
| Semantic relation read model | `CONNECTED` | K1.1C server-side projection of `tasks.project_id`, `tasks.goal_id`, `projects.goal_id` and `resource_relations`; deterministic direct-over-via dedupe, stable grouping, source/direction labels, navigation and reload proof | Skill relations remain deferred until a safe canonical relation exists |
| Resource/Skill graph | `NOT_STARTED` | no proven graph read model | no visual library before semantics |
| Embeddings/semantic search | `DECISION_REQUIRED` | none | privacy and permission decision |

# 7. Nutrition

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Recipe create/edit/archive | `CONNECTED` | recipes/actions | maintain |
| Recipe ingredients CRUD | `CONNECTED` | recipe_ingredients | maintain |
| Meal create/edit/reschedule/complete | `CONNECTED` | meals/actions | maintain |
| Recipe switch | `CONNECTED` | meal update ownership | maintain |
| Meal Planner week view | `CONNECTED_GAP` | meals read projection | multiple meals per slot and additional slots need depth |
| Grocery Draft | `CONNECTED_GAP` | derived open meals + ingredients | no persistence/check-off/pantry |
| Manual nutrition estimate | `CONNECTED_GAP` | optional recipe JSON estimate | provenance only; no real engine |
| Meals Today | `CONNECTED_GAP` | meals plus canonical schedule-source and completion synchronization | multiple meals per slot and portion semantics remain |
| Nutrient Balance | `CONNECTED_GAP` | completed meals + estimates | no fake totals; portion semantics missing |
| Persistent grocery items | `NOT_STARTED` | none | model later |
| Pantry/inventory | `NOT_STARTED` | none | model and receipt workflow later |
| Receipt OCR | `EXTERNAL_GATE` | none | privacy/provider decision |
| Unit conversion | `DECISION_REQUIRED` | free-text units | normalization/catalog decision |
| Portion/serving model | `NOT_STARTED` | none | required before real intake calculation |
| Macro/calorie engine | `NOT_STARTED` | no reliable nutrition source | external data/model decision |
| Recipe detail route | `UI_ONLY` | selected panel exists | build only if it adds real depth |

# 8. Mental Health, Mood, Sleep and Weight

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Mood entry | `CONNECTED` | mood_entries, Dashboard action, auth/Zod/RLS and reload proof | maintain |
| Mood trend | `CONNECTED` | timestamped labeled/color-paired Mental Health history | richer aggregation remains optional, without diagnosis |
| Sleep entry | `CONNECTED` | date-keyed editable sleep_entries with duration, optional quality/note | maintain |
| Sleep trend | `CONNECTED` | reload-stable Mental Health history and Dashboard latest-night projection | maintain |
| Weight entry | `CONNECTED` | date-keyed editable weight_entries and Health history | maintain |
| Weight goal | `CONNECTED` | single user-scoped weight_goals row, optional target date and honest progress | maintain |
| Journal linkage | `UI_ONLY` | journal/nav exists | canonical journal/notes and privacy |
| Mental Health overview | `CONNECTED_GAP` | canonical Mood history and Sleep entry/history are connected without medical claims | journal linkage and later review associations remain separate |

# 9. Habits

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Habit definition | `CONNECTED` | user-scoped canonical habits with create/edit/order/archive UI and RLS | maintain |
| Flexible unit/increment | `CONNECTED` | optional unit/target plus positive default increment; no-target state proven | maintain |
| Morning/Midday/Evening window | `CONNECTED` | ordered profile boundaries, full-day resolution and per-window DB slot constraint | maintain timezone and boundary tests |
| Dashboard increment click | `CONNECTED` | each click appends an owned timestamped habit_log; visible status and reload proof | maintain |
| Daily completion | `CONNECTED` | local-date log aggregation with honest overachievement and no invented percentage | maintain |
| Habit history/trends | `CONNECTED` | real log-derived seven-day cards and 30-day signals on Habits/Health | maintain |
| Habit archive | `CONNECTED` | soft archive removes active Dashboard slot while retaining historical log projection | restore remains a separate future lifecycle capability |

# 10. Running and Strength

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Manual run entry | `CONNECTED` | user-scoped running_sessions with create/edit/soft archive, positive distance/duration and optional time/HR/notes | maintain reload and RLS proofs |
| Latest run Dashboard | `CONNECTED` | latest completed running_session; pace deterministically derived from distance and duration | maintain |
| Running plan | `CONNECTED` | archived running_plans plus ordered editable running_plan_items and executable schedule links | maintain idempotent scheduling proof |
| Running trends | `CONNECTED` | real completed-session Today/7-day/30-day totals and history on Running/Health | maintain timezone boundary proof |
| Garmin import | `EXTERNAL_GATE` | none | partner/API decision; manual path remains complete |
| Exercise library | `CONNECTED` | user-scoped exercises with transactional controlled muscle mappings, edit and soft archive | maintain historical readability |
| Strength plan | `CONNECTED` | editable strength_plans and ordered strength_plan_items with sets/reps/optional load | maintain ownership and ordering proofs |
| Strength session/sets | `CONNECTED` | reload-stable strength_sessions and real strength_set_logs with transactional task completion sync | maintain weighted/unweighted semantics |
| Muscle map | `CONNECTED` | explicit exercise-muscle relations and log-derived set intensity/weighted volume with textual source labels | maintain |
| Workout schedule source | `CONNECTED` | D2.1 schedule_source_links extended idempotently for running units and strength plans | maintain no-duplicate and completion-sync proofs |

# 11. Coding and Agents

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Repository library | `CONNECTED` | A1.1A Coding-Area projection of canonical Projects with editable metadata and manual repository URL | automated repository sync remains external-gated |
| GitHub link | `CONNECTED_GAP` | A1.1A optional manual Project repository URL | no GitHub API or automatic sync |
| GitHub API | `EXTERNAL_GATE` | none | later read-only decision |
| Coding project log | `CONNECTED` | A1.1A user-scoped `coding_sessions` create/edit/soft-archive history with canonical Project ownership and reload proof | automatic time tracking remains out of scope |
| Course/learning path | `UI_ONLY` | skills/education concepts | connect to skills/evidence |
| Agent session tracking | `UI_ONLY` | agents page | create session/tool/result model |
| Prompt library | `UI_ONLY` | page concepts | canonical resources/templates |
| Coding knowledge map | `UI_ONLY` | skill map shell | relation read model first |

# 12. Education

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Scientific work | `CONNECTED_GAP` | A1.1B1 Education-Area projection of canonical Projects with Tasks, Deadlines, Resources and A1.1B2 logs | dedicated scientific-work metadata remains intentionally deferred; no parallel model |
| Literature library | `CONNECTED_GAP` | A1.1B1 canonical Resources create/edit and reload-stable Project link/unlink through `resource_relations` | create-and-link is sequential rather than atomic, so a link failure can leave a standalone Resource; reading status and bibliographic metadata remain deferred until safely modeled |
| Learning log | `CONNECTED` | A1.1B2 user-scoped `education_logs` with create/edit/archive, reload-stable history and 7-/30-day log-derived signals | maintain aggregation and ownership proofs |
| Thesis/project relation | `CONNECTED` | A1.1B1 user-owned `education` Area with canonical Projects, Tasks, Deadlines and literature Resources | maintain same-user relation ownership |
| Writing best practices/resources | `CONNECTED_GAP` | A1.1B1 scoped Resources plus A1.1B2 Writing Logs with signed word deltas | dedicated prompt/template management remains separate depth |
| Education dashboard | `CONNECTED_GAP` | Manual Education workspace projects, task/deadline context, literature and A1.1B2 Learning/Writing activity | Literature create-and-link remains non-atomic; richer scientific metadata remains deferred |

# 13. Work

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Work projects/tasks | `CONNECTED` | A1.1C1 user-owned `work` Area with canonical Projects, Project edit, Tasks/Deadlines and Resources in the Manual Work workspace | maintain reload and same-user ownership proofs |
| Work log | `CONNECTED` | A1.1C1 user-scoped `work_logs` with create/edit/soft archive, historical readability and reload-stable Manual workspace | automatic time tracking and analytics remain out of scope |
| Work wiki | `CONNECTED_GAP` | A1.1C2a canonical Work-Area `resources` (`note`) with optional Project relation, create/edit/archive and reload-stable history | create-and-link is sequential, so a relation failure can leave a standalone Work Resource; no refactor in this slice |
| Meetings | `CONNECTED` | A1.1C2b user-scoped `work_meetings` with canonical Work-Project ownership, create/edit/soft archive and reload-stable historical Manual workspace | maintain meeting ownership and archive proofs |
| Decisions | `CONNECTED` | A1.1C2a user-scoped `work_decisions` with Work-Project ownership, status, create/edit/archive and reload-stable history | maintain ownership and status proofs |
| Follow-ups | `CONNECTED` | A1.1C2b canonical `tasks` linked by `work_meeting_followups`; Security-Invoker RPC atomically creates the owned Task and Meeting relation, while existing owned Tasks can link/unlink independently | no automatic Task completion or external sync |
| Work dashboard | `CONNECTED_GAP` | Manual Work workspace reads canonical Projects, Tasks/Deadlines, Resources, Logs, Wiki, Decisions, Meetings and Meeting Follow-ups | Work Wiki create-and-link remains sequential and non-atomic |

# 14. Life and Personal

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Journal | `CONNECTED` | A1.1D1 user-scoped `journal_entries` with date, optional title, body, create/edit/soft archive, chronological active/history views and reload proof | Mood, Health and Daily/Weekly Reviews remain separate canonical domains |
| Notes | `CONNECTED` | A1.1D1 canonical Life-Area `resources` (`note`) with create/edit/archive/restore, reload-stable active/history views and visible existing Project/Goal/Task relations or honest empty state | relation creation remains on the established Resource surfaces; no parallel Notes platform |
| Entertainment collection | `CONNECTED` | A1.1D2 canonical user-scoped `entertainment_items`; Books, Movies, Series and Games are type-filtered projections with controlled status, progress and 1–10 rating plus create/edit/soft archive/restore and reload proof | external media metadata, cover search and provider APIs remain unimplemented external integrations |
| Inventory | `CONNECTED` | A1.1D3 user-scoped `inventory_items` with create/edit/archive/restore, controlled condition, quantity/value documentation, reload proof and visible Wishlist origin | external merchants, guarantees, insurance and accounting remain unimplemented |
| Wishlist | `CONNECTED` | A1.1D3 user-scoped `wishlist_items` with controlled priority/status, price documentation, create/edit/archive/restore and reload proof | external price tracking, ordering and product APIs remain external gates |
| Purchase Decisions | `CONNECTED` | A1.1D3 historical `purchase_decisions` plus explicit atomic and idempotent Wishlist→Inventory RPC; acquired status, Inventory relation and no-duplicate proof are connected | no payment, merchant integration or automated purchase action |
| Personal dashboard | `UI_ONLY` | area shell | bind canonical data |

# 15. Challenges, Anti-Rot and Shop

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Anti-Rot action library | `UI_ONLY` | Dashboard visual | create action definitions |
| Anti-Rot rotation | `NOT_STARTED` | none | deterministic rotation/read model |
| Challenge create/edit | `UI_ONLY` | challenge shell | create challenge model |
| Daily/weekly/monthly progress | `UI_ONLY` | visual state | logs/events and reset semantics |
| Reward currency ledger | `NOT_STARTED` | none | ledger model and rules |
| Shop rewards | `UI_ONLY` | shop shell | create reward items and redemption |

# 16. Personal AI Assistant

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Morning briefing | `NOT_STARTED` | none | D1/review read tools first |
| Evening review conversation | `NOT_STARTED` | none | review model first |
| Database questions | `NOT_STARTED` | none | structured read tools, no direct DB |
| Resource search | `CONNECTED_GAP` | resource search exists | expose safe tool after search model |
| Confirmed write tools | `NOT_STARTED` | existing actions exist | provider/tool boundary and confirmation UI |
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
