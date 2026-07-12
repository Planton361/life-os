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
| Latest Run | `UI_ONLY` | honest Unavailable state | implement manual running sessions first |
| Muscle Map | `UI_ONLY` | honest Unavailable state | derive from strength plan/session exercises |
| Today Agenda day view | `CONNECTED` | task scheduling fields | maintain task-based core |
| Today Agenda week/month | `CONNECTED_GAP` | Calendar/visual projection | align with canonical Calendar views |
| Urgent time-block create | `UI_ONLY` | visible action | implement schedule/create flow without duplicate data |
| Habit Tracker | `UI_ONLY` | Demo reference; Manual/Empty Prepared state without fake increment | implement definitions, increments, logs and windows |
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
| Recurring instance projection | `CONNECTED_GAP` | generated task instances | add full template management and routine UX |
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
| Recurring/routine scheduling | `CONNECTED_GAP` | recurring templates/instances | add management and cross-domain routines |
| Meal schedule source | `CONNECTED` | idempotent user-scoped source link to canonical Task scheduling; Calendar/Today/Dashboard projection and atomic bidirectional completion | maintain reload and ownership proofs |
| Workout schedule source | `NOT_STARTED` | workout model absent | implement after H2 foundation |
| Review schedule source | `CONNECTED` | Daily/Weekly Reviews link idempotently to canonical executable Tasks with atomic bidirectional completion | maintain reload and ownership proofs |
| Free calendar events | `NOT_STARTED` | none | separate model decision |
| Drag/drop/resize | `NOT_STARTED` | none | accessible comfort slice after source model |
| Schedule history/audit | `NOT_STARTED` | none | later lifecycle/audit model |

# 5. Portfolio, Projects, Goals and Skills

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Task create/edit/lifecycle | `CONNECTED` | tasks/actions | maintain |
| Task relation to Project/Goal | `CONNECTED` | task relation fields | add richer task detail if needed |
| Task relation to Skill/Resource | `CONNECTED_GAP` | evidence/resource relations | provide complete management UI |
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
| Resource create/read | `CONNECTED` | resources | maintain |
| Resource inspector | `CONNECTED` | resource read model | maintain |
| Resource relations | `CONNECTED` | resource_relations | add edit/unlink/manage |
| Project/Goal workbench display | `CONNECTED` | relation read model | maintain |
| Resource search | `CONNECTED_GAP` | existing search surface | confirm full-text scope and ranking |
| Files/attachments | `NOT_STARTED` | none | storage/privacy decision |
| Notes/wiki resources | `CONNECTED_GAP` | resource/note concepts | canonical Note/Wiki model needed |
| Semantic relation read model | `NOT_STARTED` | raw relations exist | implement before graph |
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
| Habit definition | `UI_ONLY` | Dashboard/page shell | create habits model |
| Flexible unit/increment | `NOT_STARTED` | none | define quantity, unit and default increment |
| Morning/Midday/Evening window | `UI_ONLY` | visual tabs | persist windows and user time boundaries |
| Dashboard increment click | `UI_ONLY` | visible blocks | create timestamped habit_logs |
| Daily completion | `NOT_STARTED` | none | derive from goal/increments |
| Habit history/trends | `UI_ONLY` | analytics shell | derive week/month views |
| Habit archive | `NOT_STARTED` | none | lifecycle slice |

# 10. Running and Strength

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Manual run entry | `UI_ONLY` | running page/dashboard | implement running_sessions |
| Latest run Dashboard | `UI_ONLY` | visual card | derive from sessions |
| Running plan | `UI_ONLY` | page concepts | implement plan and targets |
| Running trends | `UI_ONLY` | visual shell | derive after sessions |
| Garmin import | `EXTERNAL_GATE` | none | partner/API decision; manual path remains complete |
| Exercise library | `UI_ONLY` | strength shell | implement exercises |
| Strength plan | `UI_ONLY` | shell | implement plans/exercises |
| Strength session/sets | `UI_ONLY` | shell | implement sessions and set logs |
| Muscle map | `UI_ONLY` | Dashboard/health visual | derive from exercise mappings |
| Workout schedule source | `NOT_STARTED` | no canonical workout model | implement after strength/running core |

# 11. Coding and Agents

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Repository library | `UI_ONLY` | coding pages | create repository/coding project model |
| GitHub link | `UI_ONLY` | visual/project links | support manual URL first |
| GitHub API | `EXTERNAL_GATE` | none | later read-only decision |
| Coding project log | `UI_ONLY` | page shell | canonical logs/sessions |
| Course/learning path | `UI_ONLY` | skills/education concepts | connect to skills/evidence |
| Agent session tracking | `UI_ONLY` | agents page | create session/tool/result model |
| Prompt library | `UI_ONLY` | page concepts | canonical resources/templates |
| Coding knowledge map | `UI_ONLY` | skill map shell | relation read model first |

# 12. Education

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Scientific work | `UI_ONLY` | route/page shell | create canonical scientific_work model |
| Literature library | `UI_ONLY` | route/page shell | create literature/source model or scoped resources |
| Learning log | `UI_ONLY` | route/page shell | create learning log records |
| Thesis/project relation | `CONNECTED_GAP` | Projects/Goals exist | add education domain context |
| Writing best practices/resources | `CONNECTED_GAP` | Resources | add classifications/search |
| Education dashboard | `UI_ONLY` | area shell | bind canonical entities |

# 13. Work

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Work projects/tasks | `CONNECTED_GAP` | general projects/tasks | add Work context and privacy |
| Work log | `UI_ONLY` | route/page shell | create work_log records |
| Work wiki | `UI_ONLY` | route/page shell | create wiki/notes or scoped resources |
| Decision/follow-up memory | `NOT_STARTED` | none | canonical records and search |
| Work dashboard | `UI_ONLY` | area shell | bind work data |

# 14. Life and Personal

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Journal | `UI_ONLY` | route/page shell | create private journal entries |
| Notes | `UI_ONLY` | route/page shell | create canonical notes |
| Entertainment collection | `UI_ONLY` | route/page shell | collection/item model |
| Inventory | `UI_ONLY` | route/page shell | inventory items and lifecycle |
| Wishlist/purchase evaluation | `UI_ONLY` | route/page shell | wishlist and decision records |
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
