# Life OS Capability Registry

**Status:** Active
**Purpose:** capability-level truth for what is connected, partial, UI-only or not started
**Update rule:** update after every material feature block
**Source hierarchy:** code and current browser proofs override historical roadmap claims

## Status Definitions

| Status | Meaning |
|---|---|
| `CONNECTED` | UI, canonical data, write/read path and reload proof are complete; a visible core path also needs current Surface Acceptance proof before it supports a surface claim |
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
- Backend, repository or historical reload evidence proves that layer only; it
  does not by itself prove that a visible control currently works.

## Active Product Boundary (R0)

Implementation status and product visibility are separate truths: `CONNECTED` code may be deferred and hidden without being deleted or relabeled as unimplemented.

| Surface / domain | Boundary | Current implementation truth | Visibility truth / next action |
|---|---|---|---|
| Dashboard | `ACTIVE` | `CONNECTED`: R2-01 implementation evidence plus explicit USER ACCEPTED on 2026-09-06 | maintain accepted Dashboard |
| Inbox | `ACCEPTED` | `CONNECTED`: R2-02 explicitly USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Today | `ACTIVE` | `CONNECTED`: day-log functionality explicitly accepted by user; no Today changes in Calendar pass | R2-03 remains open for Calendar |
| Calendar | `ACTIVE` | `CONNECTED_GAP`: temporal planning controls are connected and the desktop workspace is viewport-bounded; user acceptance remains pending | R2-03 real temporal surface |
| Portfolio | `ACTIVE` | `CONNECTED_GAP`: entity backend exists; information architecture and surface acceptance pending | R2-04 separate entity surfaces |
| Resources | `ACTIVE` | connected knowledge core with relation depth gaps | knowledge base and evidence; K1 follows C3 |
| Health / Fitness | `ACTIVE` | `CONNECTED_GAP`: core records exist; primary-desktop and role acceptance pending | R2-05 |
| Nutrition | `ACTIVE` | `CONNECTED_GAP`: meal backend exists; selectable persistent planner-slot acceptance pending | R2-05 |
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
→ R2 Product Reality Recovery & Surface Completion
```

# 1. Dashboard

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| SR1-04 personal Target runtime | `CONNECTED` | personal transfer, candidate-volume preservation, same-user reauthorization, authenticated read/write proof and persistent default-runtime Target switch passed | maintain Target as canonical local runtime; Source is `LEGACY_FALLBACK_READ_ONLY` |
| Quick Thought → Inbox | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Tasks Today summary | `CONNECTED` | central server-side Dashboard task projection; completed/open count semantics | maintain |
| Focus Time summary | `UI_ONLY` | honest unavailable source state | add canonical focus/deep-work classification before deriving minutes |
| Inbox summary | `CONNECTED` | user-scoped inbox items in Dashboard Read Model | maintain |
| Nutrition summary | `CONNECTED_GAP` | today's meals and completed-meal recipe estimates | portion/target semantics remain separate |
| Review Status summary | `CONNECTED` | canonical current Daily/Weekly Review records and navigation | maintain review projection proofs |
| Sleep summary | `CONNECTED` | canonical latest sleep entry from the shared Health repository; reload/browser proof | maintain |
| Daily Control current task | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Daily Control Up Next | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Time Progress | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Weather | `NOT_STARTED` | honest Unavailable state; no API | optional external read gate |
| Mood entry | `CONNECTED` | timestamped user-scoped mood entries from Dashboard with same-day soft undo | maintain labels, semantic color and ownership proof |
| Mood current state | `CONNECTED` | latest local-day Mood entry plus Mental Health history | maintain timezone/reload proof |
| Weight goal | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Nutrient Balance | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Meals Today | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Latest Run | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Muscle Map | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Today Agenda day view | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Today Agenda week/month | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Urgent time-block create | `CONNECTED_GAP` | current visible control is an honest non-interactive Prepared state; Inbox creates canonical Tasks while scheduling belongs to Calendar/Portfolio | R2-03 must connect it to a canonical flow or remove it; Prepared is not closure without user deferral |
| Habit Tracker | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Active Portfolio | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Dashboard control inventory and bounds | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Anti-Rot Actions | `UI_ONLY` | retained Dashboard component is no longer composed; the underlying feature is connected elsewhere | deferred/hidden by R0 and C1.1-01 |
| Challenges | `UI_ONLY` | retained Dashboard component is no longer composed; the underlying feature is connected elsewhere | deferred/hidden by R0 and C1.1-01 |

## R2-01 confirmed Dashboard finding corrections — 2026-09-05

**R2-01: USER ACCEPTED on 2026-09-06**, explicitly confirmed by the user.
The following implementation evidence is retained unchanged in scope: browser
proofs used isolated authenticated data; canonical Target acceptance is the
user’s confirmation, not an additional automated Target proof.

- `tests/e2e/r2-01-dashboard-surface.spec.ts`: screenshots and body-scroll,
  horizontal-overflow, card-overlap and inner-content bounds at 2560×1440,
  3840×2160, 1920×1080 and 390×844. Manual screenshots additionally cover
  2560×1440 and 1920×1080 with isolated authenticated data.
- Nutrient Balance retains its bounds without the footnote. Time Progress keeps
  its three rows and bottom padding. Dashboard Mood offers exactly six choices
  in two rows of three; historical Content entries are not deleted.
- Eight Habit slots remain stable across Morning/Midday/Evening. Isolated Manual
  proof creates Habits automatically without slot selection; increments and
  compact undo survive reload, including period preservation after a Mood write.
  Invalid targets stay local to the Add form. Progress dots derive from target
  and increment, with partial final steps capped at the target.
- Portfolio retains four slots in a 2×2 grid. Project/Goal/Skill view switching
  is browser-proven; placeholders link to the respective canonical creation form.
- Agenda Day/Week/Month render inside the Dashboard using the existing Calendar
  read model. Day hour lines and the 24:00 endpoint remain bounded. No separate
  event store or scheduling logic is introduced.
- V5 screenshot review retains the existing central Agenda hierarchy. The compact
  Habit grid removes its empty middle; Meals get larger previews and centered
  planning links. The 1920×1080 meal status/macro rows are no longer clipped.
- `tests/e2e/r2-01-control-inventory.spec.ts` passes against disposable Manual
  data. Its control inventory uses CONTROL / EXPECTED / ACTUAL / RESULT:

| CONTROL | EXPECTED | ACTUAL (isolated Manual browser) | RESULT |
|---|---|---|---|
| Quick Thought | Capture to Inbox | Captured text survives Inbox reload | PASS |
| Global toast | Top-right, about 5 seconds | Top-right geometry and automatic dismissal asserted | PASS |
| Mood Calm / Focused / Tired / Anxious / Stressed / Happy | Real save per option | Each selection survives reload | PASS |
| Time Progress / card links | Three bars, canonical navigation | Today and available Dashboard card links clicked | PASS |
| Habit Morning / Midday / Evening | Stable period and eight slots | Each selected; retained after writes and reload | PASS |
| Habit Add | Automatic free slot; no opening toast | Two creations without slot field; no opening feedback | PASS |
| Habit Increment | Whole card, target cap, real steps | Target 2.5 / increment 1 yields 1, 2, 2.5; three dots; disabled at target | PASS |
| Habit Undo | Revert last actual increment | 2.5 becomes 2 and survives reload | PASS |
| Portfolio Project / Goal / Skill and Add | 2×2 grid; matching creation | Each view and its canonical creation form opened | PASS |
| Meals Breakfast / Lunch / Dinner Planen | Planner with slot context | Each destination preserves its slot | PASS |
| Meals dish link | Linked Recipe or general Recipes | Empty-slot navigation and created Recipe selection after reload | PASS |
| Running / Muscle | Real view switching | Both selected states rendered | PASS |
| Agenda Day / Week / Month | Real in-card views | Day timeline, seven-day Week and 42-cell Month rendered | PASS |
| Canonical Target surface acceptance | User tests authenticated Target Dashboard | User explicitly confirmed R2-01 USER ACCEPTED on 2026-09-06 | PASS |

- Atomic Habit target enforcement: `20260905151418_atomic_habit_target_increment.sql`
  adds one Security-Invoker RPC, `increment_habit_for_local_day`. It derives
  ownership and profile timezone/local date, locks the active owned Habit,
  sums active logs and inserts only `min(increment, remaining target)`.
  `already_at_target` inserts nothing and the action emits no success toast.
  The normal repository path exclusively uses this RPC. No table/data migration.
- `tests/e2e/r2-01-atomic-habit.spec.ts` passes on a fresh disposable runtime built
  from the repository migration chain: authenticated concurrent 5/3 requests
  finish at 5; eight concurrent 1/1 requests create exactly one log; 10/3 gives
  3/6/9/10, including the partial final log. Foreign, archived and unauthenticated
  calls cannot mutate; null targets remain uncapped. A non-default profile
  timezone is checked against each persisted local-day log.
- The focused disposable browser proof covers automatic Habit creation, eight
  slots, whole-card increments, four real progress dots, reload, a stale enabled
  card submitting an already-at-target no-op without success toast, compact Undo,
  and stable Evening selection. No card redesign was needed.
- The migration was applied regularly through the canonical Target guard only
  after disposable proofs passed. Target migration versions equal all 42 Git
  migration files. Target DB lint and Security Advisors return empty findings.
- Final clarification proof: Add Habit is centered horizontally and vertically at
  2560×1440, 1920×1080 and 390×844, with backdrop, bounded mobile height and
  focus returned to the opener after Escape. Global toasts are top-right again.
  Only successful Dashboard Habit creation emits the Habit success toast;
  increments, rewind Undo and already-at-target submissions stay silent.
  Canonical RPC, target cap, reload and selected daypart remain browser-proven.
  Meals Planen now has a minimum 72×36 px target, remains right/vertically centered,
  and all three slot links are browser-proven. Existing viewport/bounds proofs
  pass without new body scroll or card overlap. No migration or card redesign.
- Administrative closure on 2026-09-06: explicit user acceptance recorded;
  existing evidence retained. Current diff check, typecheck, lint, build and
  21 focused Dashboard Vitest tests pass. R2-02 is the sole active block.
  `.idea/` and the unrelated SR1-03 test changes remain excluded.

# 2. Inbox

**Current status: USER ACCEPTED on 2026-09-06. R2-02 closed.**
User acceptance follows `6890cb4`; all preceding evidence is retained below as
history. Historical PENDING/active statements describe their original passes.
R2-03 is the sole active block; Today implementation evidence follows below. Calendar and user acceptance remain pending.

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Inbox Quick Capture removal | `CONNECTED` | Inbox capture UI removed; Quick Thought → `inbox_items` survives reload in current R2-02 proof | Capture backend retained for existing sources |
| Inbox search | `CONNECTED` | Real title/context filtering, clear/no-match, filters and URL selection/reload proof | maintain |
| Active item selection | `CONNECTED` | `item`, `q`, `stage` URL state; dirty/pending queue guard; existing persisted edits survive item switching and reload; unsaved inputs block switching | maintain |
| Title/description/next action/missing information | `CONNECTED` | final completion → server Auth/Zod → owned `complete_inbox_triage` RPC; original capture preserved; stale edit conflict leaves inputs intact | maintain |
| Outcome Route and all triage flows | `CONNECTED` | compact route cards, destination-only selection (no write) → final atomic `complete_inbox_triage`; Task, existing Project/Goal/Skill, new Project/Goal, Resource, Note, Solved/Archive current proof | no second draft editor |
| Note route | `CONNECTED` | canonical `resources.type = note`, correct Resources selection after reload | no separate Note entity invented |
| Skill route | `CONNECTED` | Task context through existing Task↔Skill RPC; shown when owned active Skill targets exist; no Skill Evidence write | maintain |
| Planning signals | `CONNECTED` | seven persisted Inbox signals; final completion and target-specific transfer, current reload proof | Recurrence removed as unsupported Inbox input |
| AI suggestion review | `CONNECTED` | user-triggered local read-only suggestion and dismiss; no provider or automatic field application | external provider remains outside R2-02 |
| Related context | `CONNECTED` | bounded links to actual owned local targets, each visible link directly browser-tested | no relevance scores, semantic search or expansion |
| Inbox surface acceptance | `CONNECTED` | Explicit USER ACCEPTED on 2026-09-06; retained implementation and browser evidence below | R2-02 closed; R2-03 active |

## R2-02 initial implementation evidence — 2026-09-06

Historical evidence for `fa377cf` is retained below. The UX pass recorded after
this section supersedes its separate Save/route UI and layout assessment.

**IMPLEMENTATION_PASS. USER ACCEPTANCE STATUS: PENDING.** This is an
implementation result, not user acceptance or closure of the Inbox surface.
R2-01 remains explicitly accepted and committed as `aea80d0`.

- `tests/e2e/r2-02-inbox-surface.spec.ts`: four focused tests pass on a fresh
  disposable authenticated Supabase runtime. Full realistic flow: Dashboard
  Quick Thought → select Inbox item → edit all four central fields → Save →
  reload → set all seven Planning Signals → Save → reload → route to Task →
  verify canonical Task → open the selected Portfolio Task editor → continue
  title editing → save/reload → original Inbox item absent from the open queue.
- Every offered route is executed; existing Project/Goal/Skill Task context,
  new Project/Goal, Resource/Note and Solved/Archive are checked against actual
  owned records. Target links load and reload the selected canonical surface.
  Existing entity detail pages are read-only, so routing opens the existing
  editable Portfolio/Resources area selection. Portfolio IA is unchanged.
- Search covers titles and description/context; no-match and clear work,
  Raw/Clarified/Open reflect real open states, URL selection survives reload.
  Unsaved or pending edits disable queue/search switching with visible copy;
  source edits survive save, item changes and reload. Browser unload and link
  navigation warn before discarding unsaved changes.
- Auth-blocked, authenticated Empty and Demo remain distinct. Optional fields
  can be cleared persistently. A concurrent update produces a visible conflict
  error and retains local unsaved input without overwriting canonical data.
- Security proof: anonymous/foreign writes rejected, foreign Area and Project
  rejected, no partial Task created for invalid routing, immutable original
  source preserved, stale saves rejected and two simultaneous Project routes
  create exactly one Project. Processed items cannot be edited by the Save RPC.
- `20260905223543_r2_02_inbox_triage_workspace.sql` adds only missing fields to
  `inbox_items`, one source-preservation trigger and two Security-Invoker RPCs.
  Existing Task/Resource transactions are reused; retained Project/Goal action
  entry points delegate to the same atomic saved-item route. No new table.
- Fresh proof uses only migrations exported from Git-index blobs into an
  isolated code snapshot, without protected paths or personal DB data. All 43
  applied migration versions equal that candidate chain. DB lint with warning
  failure enabled and Security Advisors return no findings. Generated Inbox
  row types were verified against this fresh database; nullable RPC arguments
  remain explicit in the TypeScript contract.
- Canonical Target migration was applied through `runtime:target:migrate`
  only after the fresh proof. Target contains the same 43 SQL migration
  versions; Target lint and Security Advisors pass. No remote DB or provider.
- Required checks: `git diff --check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm build`, 11 focused Inbox Vitest assertions and all four focused
  Playwright tests pass; an additional focused core rerun covers toast dismissal
  and selected-route/confirmation screenshots. Browser console errors and hydration are clean in
  the core flow. Node test-runner FORCE_COLOR/NO_COLOR notices are not browser
  console or hydration errors.
- Full-surface screenshots cover 2560×1440, 3840×2160, 1920×1080 and 390×844;
  desktop Body scroll, horizontal overflow, three-column overlap and field
  containment checks pass. Screenshot artifacts live in the isolated
  Playwright report, not Git; the committed test regenerates them.
- V5 Design-Taste: **PASS**. Existing token palette, selection accents and
  three-column hierarchy remain. Active Item is primary; route is compact,
  AI/local context secondary. Queue retains bounded processing capacity;
  Active Item ends with its controls instead of an artificially empty card.
  Mobile stacks the existing shell and panels without horizontal overflow.
  No Dashboard/Today/Calendar/Portfolio/domain UI redesign was performed.
  The shared open-Inbox read projection excludes processed captures so the
  dependent count does not retain already-routed items.

## R2-02 linear triage UX pass — 2026-09-06

**IMPLEMENTATION_PASS. USER ACCEPTANCE STATUS: PENDING.** R2-02 remains the
only active ROADMAP block; this is not surface closure and does not activate R2-03.

- One continuous primary workbench presents **01 Klären → 02 Planungshinweise
  → 03 Ziel wählen → 04 Abschließen**. Cyan, orange, violet and green use V5
  tokens, text labels and a vertical connector. Original Capture stays collapsed
  and secondary. The header identifies the item and Raw/Clarified/unsaved state.
- The intermediate Save and route-confirmation buttons are removed. Route
  selection only previews a destination. **Einordnen & abschließen** is the
  sole final write and remains visible in a separate footer on desktop.
  It is disabled for missing route/target, invalid title/duration or blocked
  authentication. Local validation and persistent error feedback retain inputs.
- The new `complete_inbox_triage` Invoker RPC combines the existing clarification
  and canonical route functions in one transaction. Auth, Zod, owned-open-row
  checks, RLS, version locking, original-capture preservation and revalidation
  remain in place. A foreign/unavailable target rolls back the field save too.
  No new table, column, route type, external provider or entity draft is added.
- Current `tests/e2e/r2-02-inbox-surface.spec.ts`: **4/4 PASS (34.6s)** in the
  isolated authenticated runtime. Quick Thought → edit all four fields → set
  all seven supported signals → select Task → verify source still Raw and
  unchanged → final action/toast → canonical Task and processed source → target
  editing/reload → exact source fields survive reload and Open is empty.
  All other offered routes, real related links, AI show/dismiss, search/clear,
  filters, selection, empty/demo/auth, validation and stale-error states pass.
  Pre-existing clarified rows for search/filter/switch tests are API fixtures;
  they do not imply that a separate UI Save remains available.
- Security proof additionally exercises anonymous/foreign completion rejection,
  rollback of changed title on foreign Project routing, stale version conflicts
  and two concurrent final commits creating exactly one canonical Project.
- The additive migration `20260906103333_r2_02_complete_inbox_triage.sql` was
  proven in a fresh disposable database using only Git-index migration blobs.
  All **44** versions matched. DB lint at warning level and Security Advisors
  were clean. Only then was the canonical local Target migrated through the
  guarded `runtime:target:migrate`; it has the same 44 versions and passes both
  checks. The previous migration chain is unchanged; no remote database used.
- `git diff --check`, `pnpm typecheck`, `pnpm lint`, **12 focused Inbox Vitest
  assertions**, focused Playwright and `pnpm build` pass. Core browser console
  errors/hydration checks are clean. Global toast dismissal is directly tested.
- Full before/after screenshots were reviewed at **3840×2160, 2560×1440,
  1920×1080 and 390×844**. Automated bounds prove no horizontal overflow,
  desktop body scroll, card overlap or out-of-form fields, step order is
  monotonic, and the final action is inside each desktop viewport. The queue
  and tertiary context rail fit their contents. The central surface receives
  most of the width and distributes the steps along its height; native 4K
  uses a readable 1.5 workbench scale rather than oversized textareas. Shorter
  desktop heights use compact spacing; expanded content scrolls internally.
- Artifacts: previous captures are retained outside Git at
  `/tmp/life-os-r2-02-ux-before/inbox-{3840,2560,1920,390}.png`; current captures
  and route inventory are attached to the isolated report at
  `/tmp/life-os-r2-02-runtime-3ig5evyy/playwright-report/index.html`.
  Tests regenerate current screenshots. No private/auth artifacts are staged.
- **V5 Design-Taste review — PASS.** Fits V5: matte existing surfaces, one
  dominant workbench, restrained semantic tints, distinct selected route and
  subordinate content-sized rails. Earlier failures (flat hierarchy, premature
  Save, large empty queue, undersized 4K islands and hidden desktop completion)
  were corrected. No remaining material design violation was found in the
  inspected views. Mobile retains the existing stacked shell.
  **Question:** Does a user understand within seconds that this item is clarified,
  planned, routed and then completed from top to bottom? **YES**: four numbered
  headings, connected sections, a selected-route preview and one final green
  action make the sequence explicit. This review does not replace user acceptance.

## R2-02 final density/polish pass — 2026-09-06

**IMPLEMENTATION_PASS. USER ACCEPTANCE STATUS: PENDING.** R2-02 remains active.
This presentation-only pass preserves the four-step flow and final transaction.

- Destination pills are now equal-height rectangular route cards: four columns
  on desktop, two at intermediate widths and one at 390px. Each has its existing
  title and one short, fully visible explanation. Accessible names remain stable;
  descriptions are associated with `aria-describedby`. V5 destination tints,
  borders and the stronger selected state distinguish the real canonical routes.
- The queue has a compact footer showing the actual visible/open counts and
  filter, plus a short explanation that completed thoughts leave the queue.
  Search, filters, selection and capture behavior are unchanged.
- The AI card is explicitly labelled Optional. Related Context explains its
  empty state using actual local Project/Goal/Skill/Resource availability; no
  fake matches or new context behavior. Both rails still fit their contents.
- **V5 Design-Taste: PASS.** Screenshots at 3840×2160, 2560×1440, 1920×1080 and
  390×844 were visually inspected. Existing column proportions keep the workflow
  dominant; route cards use Step 3 more purposefully without stretching the
  side rails. At 1920×1080 both card rows and the final action fit. No overlapping
  cards, clipped descriptions, horizontal overflow or added desktop body scroll.
  Mobile retains normal vertical page scrolling and one readable card column.
- `tests/e2e/r2-02-inbox-surface.spec.ts`: **4/4 PASS (33.8s)** on the isolated
  authenticated runtime. Current proof adds equal tile-height and untruncated
  one-line explanation assertions at all four viewports, plus queue count and
  context-empty-copy checks. All existing routes, final commit, target/reload,
  search/selection, validation and error regressions remain green. Console and
  hydration checks are clean. Screenshots are attached to the existing isolated
  Playwright report; no generated/private artifacts are committed.
- `git diff --check`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
  No backend changes or new migration. No Dashboard, Today, Calendar or Portfolio
  changes. Known unrelated working-tree changes remain untouched.

## R2-02 route-row and rail-height correction — 2026-09-06

**IMPLEMENTATION_PASS. USER ACCEPTANCE STATUS: PENDING.** R2-02 stays active.
This explicit user correction supersedes the preceding four-column route grid
and content-height side-rail layout; their historical evidence remains above.

- All eight standard destinations now form **one horizontal desktop row** at
  3840×2160, 2560×1440 and 1920×1080. Modules have an equal 88px logical height,
  rectangular borders, title at the top and concise description at the bottom.
  Selected-state semantics and V5 tints remain. The content-driven minimum width
  only wraps cards when necessary; at 390×844 the layout uses two columns.
  The existing conditional Skill destination and all route behavior are retained.
- Desktop queue stretches to the workbench bottom. The right rail is a vertical
  flex column: AI remains compact while its final Related Context card takes
  the remaining height, with content aligned at the top. No dummy content.
  Narrower secondary columns preserve the dominant central workflow and provide
  sufficient width for the single route row even at 1920×1080.
- **V5 Design-Taste / current visual review: PASS.** All four complete screenshots
  were inspected. Side rails form continuous columns; cards are evenly aligned,
  explanations remain untruncated, semantic colors remain intact. No horizontal
  overflow, card overlaps or desktop body scroll. Mobile uses normal vertical
  flow rather than stretched rails. Four-step order and final action are unchanged.
- Focused Inbox Playwright: **4/4 PASS (33.4s)**. New assertions prove all eight
  desktop card tops align and queue/workbench/final-context-card bottoms differ
  by at most 1px at each desktop viewport. Equal heights, text fit, mobile guard,
  final-action visibility, all routes, search, reload and error checks remain
  green. Core console/hydration checks are clean. Current full screenshots are
  attached to the existing isolated Playwright report.
- `git diff --check`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
  Changes are limited to Inbox presentation, its focused proof and this registry.
  No backend change, migration, new feature or other-surface modification.

### Planning Signal audit

| SIGNAL | CANONICAL FIELD | PERSISTED | TARGET SUPPORT | UI RESULT |
|---|---|---|---|---|
| Priority | `inbox_items.priority` | YES | Task `priority`; Project `priority` | central Planning Signals + final completion |
| Energy | `inbox_items.energy` | YES | Task `energy` | central nullable select + final completion |
| Effort / Duration | `inbox_items.duration_minutes` | YES | Task `duration_minutes` | positive minutes; nullable + final completion |
| Area | `inbox_items.area_id` | YES | Task/Project/Goal/Resource `area_id`; owned active Area required | actual local Area select + final completion |
| Review needed | `inbox_items.review_needed` | YES | Resource `review_needed` | checkbox + final completion; no implied Task field |
| Today candidate | `inbox_items.today_candidate` | YES | Task `planned_date`, resolved in profile timezone at routing | checkbox + final completion |
| Deadline hint | `inbox_items.deadline_hint` | YES | Task `due_at` at local end of day; Project/Goal `target_date` | date input + final completion |
| Recurrence hint | no canonical Inbox field | NO | no supported Inbox→Routine transfer | removed; no fake persisted hint |

Cleaned context transfers only into supported description/summary fields.
Project Next Action maps to `next_step`; otherwise it remains labelled target
context (Task uses the existing `Nächste Aktion:` description convention).
Missing Info stays labelled context. Unsupported target signals remain source
history and are not represented as new target fields.

### Surface control inventory

| CONTROL | EXPECTED | ACTUAL | RESULT |
|---|---|---|---|
| Search | filter titles/context | unique context filtering, no-match and URL/reload checked | PASS |
| Clear search | restore queue | clear and no-match recovery clicked | PASS |
| Open / Raw / Clarified | reflect persisted open states | each filter clicked; actual matching rows checked | PASS |
| Queue item | select current capture | selection, dirty guard, saved item switching and reload checked | PASS |
| Original Capture | inspect source without mutation | expanded/collapsed; original survives edit and attempted overwrite | PASS |
| Original Capture | reveal immutable source | expanded, original checked, collapsed in core flow | PASS |
| Clean Title | persistent central edit | completed and reloaded cleaned title | PASS |
| Description / Context | persistent central edit/clear | completed with cleared fields and reloaded | PASS |
| Next Action | persistent central edit | completed/reloaded and carried into Task editor | PASS |
| Missing Info | persistent central edit/clear | completed with cleared fields, reloaded; routed context retained | PASS |
| Einordnen & abschließen | save fields/signals and route once | one atomic final commit, toast, source/target reload, rollback and stale error checked | PASS |
| Priority | persistent selection | P1 completed/reloaded and transferred to Task | PASS |
| Energy | persistent selection | high completed/reloaded and transferred to Task | PASS |
| Effort / Duration | persistent minutes | 45 completed/reloaded and transferred to Task | PASS |
| Area | actual owned selection | local Area completed/reloaded and transferred to Task | PASS |
| Review needed | persistent boolean | checked/completed/reloaded | PASS |
| Today candidate | persistent boolean | checked/completed/reloaded and canonical Task planned date verified | PASS |
| Deadline hint | persistent date | selected/completed/reloaded and canonical Task deadline verified | PASS |
| Standalone Task | canonical Task from saved fields | confirmation, Task values and target editor save/reload checked | PASS |
| Existing Project | Task with selected Project context | selection, confirmation and actual relation checked | PASS |
| Existing Goal | Task with selected Goal context | selection, confirmation and actual relation checked | PASS |
| Existing Skill | Task with selected Skill context | selection, confirmation and `task_skill_links` checked | PASS |
| New Project | create and consume atomically | target and open-queue reload checked; duplicate route protected | PASS |
| New Goal | create and consume atomically | target and open-queue reload checked | PASS |
| Resource | canonical source Resource | type/source and Resources reload checked | PASS |
| Note | canonical note Resource | type/source and Resources reload checked | PASS |
| Solved / Archive | close without target | archival, empty queue and reload checked | PASS |
| Route selection | preview destination without writing | selected state shown; source still Raw and unchanged before final action | PASS |
| Target open / result close | continue at canonical destination / dismiss result | target links and result close clicked | PASS |
| Global toast close | dismiss existing feedback | close controls clicked before subsequent completions; new success toast checked | PASS |
| Local AI suggestion / dismiss | optional read-only proposal | both clicked; persisted title remains unchanged | PASS |
| Related Context links | open actual local targets | every displayed link clicked; destination loaded | PASS |
| Quick Capture / second draft / fake actions | absent from Inbox | removed; capture backend retained | PASS |

# 3. Today and Reviews

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Today daily-log surface | `CONNECTED` | R2-03 source-first server projection and aggregation; user functionally accepts Today | Today unchanged; R2-03 remains active for Calendar acceptance |
| Task creation/schedule/completion projection | `CONNECTED` | distinct canonical timestamps; Today owns no task mutation; Portfolio/Calendar own planning and domain surfaces own completion | current source state, not an immutable lifecycle history |
| Recurring instance projection | `CONNECTED` | generated Tasks appear through ordinary canonical task timestamps | recurrence generation and template management removed only from Today |
| Carry-over/open loops | `CONNECTED` | Daily Review remains canonical; Today reads decisions and explicit original planning snapshots after carry forward | no review or carry-forward mutation on Today |
| Daily / Weekly Review links | `CONNECTED` | real source navigation; current daily outcome, open loops and completion are supporting documentation | review editing stays on Review surfaces |

## R2-03 Today implementation evidence — 2026-09-06

Today is a day memory log. Calendar plans/schedules; Portfolio creates/manages
entities. This pass does not close R2-03 or accept Today. R2-02 acceptance remains
recorded above. Historical C3 Today mutation evidence describes the previous
surface and is superseded by the current read-only control contract.

### Source-first event audit

| EVENT TYPE | CANONICAL SOURCE | TIMESTAMP | CAN RECONSTRUCT RELIABLY | SOURCE LINK | UI RESULT |
|---|---|---|---|---|---|
| Task created | tasks | created_at | YES | Portfolio selected task | TASK CREATED, independent of planning |
| Scheduled task | tasks | scheduled_start_at | YES for current intended slot; NO for historical scheduling action | Portfolio selected task | TASK SCHEDULED explicitly describes intended start |
| Task completed | tasks | completed_at | YES while retained in canonical state | Portfolio selected task | TASK COMPLETED |
| Task reopened | tasks | no distinct action timestamp | NO | — | omitted; updated_at is never inferred |
| Quick Thought / Inbox capture | inbox_items | created_at | YES for capture; NO for exclusive Quick Thought provenance | Inbox item / Inbox after processing | INBOX CAPTURE with original title |
| Inbox processed/archive | inbox_items | processed_at | YES when present | created Task or Inbox | INBOX PROCESSED; no invented archive event without timestamp |
| Mood logged | mood_entries | recorded_at | YES for active record | Health mental | MOOD LOGGED |
| Habit increment | habit_logs + owned habit name | recorded_at | YES for active positive log | Habits | HABIT LOGGED with real name/value |
| Habit undone | habit_logs | no unambiguous undo-action timestamp | NO | — | archived log excluded; no invented undo event |
| Meal completed | meals | completed_at | YES | Meal planner | MEAL COMPLETED |
| Run / strength completed | running_sessions / strength_sessions | completed_at | YES for active records | Running / Strength | compact domain completion event |
| Review created / completed | review_records | created_at / completed_at | YES | Daily / Weekly Review | two distinct review events |
| Every review save | review_records | updated_at ambiguous | NO | Review | omitted |
| Planned date / carried work | tasks + review_task_decisions | date-only plan + explicit original planning snapshot | YES as day state, not timed event | Portfolio / Review | supporting plan-vs-done and Carry Forward |
| Sleep / weight date-only records | existing domain records | local date without reliable action time | NO for timed event | — | no fake midnight event |
| Decisions / artifacts | linked review_task_decisions; no scoped artifact source | canonical review relation | YES for linked decisions; NO for generic artifacts | carried Task | real decisions; compact honest artifact empty state |

Projection reads authenticated, explicitly user-scoped existing tables with RLS.
Paginated reads avoid silent row truncation. Profile timezone and established
local-date/time helpers determine exact day membership and chronological instants.
No event-copy table, schema migration or new write architecture. Health writes now
invalidate Today; other source actions already did. Current-state projections do
not claim immutable history after later edits, reopening or archival.

### Surface control inventory

| CONTROL | EXPECTED | ACTUAL | RESULT |
|---|---|---|---|
| Activity source links | navigate to canonical source | Inbox, Portfolio, Mood and Habit destinations clicked; review links exercised | PASS |
| Planned task link | inspect source, no Today planning | Portfolio selected task | PASS |
| Daily / Weekly Review | open responsible review surface | both links navigate | PASS |
| Closing Review | open existing Daily Review | review completed there, Today reloaded | PASS |
| Carry Forward source | open canonical carried task | selected task navigation and persisted decision projection | PASS |
| Planner / Today-plan / task lifecycle buttons | absent | no form or button in Today content | PASS |
| Recurrence generator / date range / template controls | absent | removed from Today; backend and responsible surfaces retained | PASS |

Proof: `tests/e2e/r2-03-today-log.spec.ts` exercises fresh local Manual data,
actual Dashboard capture, Portfolio creation/planning/completion, Calendar
projection regression, Today reload, chronological events and source navigation.
Additional proof covers Mood/Habit source records, Daily Review/Carry Forward,
foreign-user exclusion and Empty/Demo/Auth-blocked boundaries.
Projection tests cover distinct event semantics, unsupported updated_at inference,
original capture title, supported domain timestamps, carried planning snapshots,
Berlin/Los Angeles midnight and both DST transitions.

Visual evidence: four complete screenshots in the disposable Playwright result
directory at 3840×2160, 2560×1440, 1920×1080 and 390×844. Activity Stream is the
dominant column; supporting context/review cards remain secondary, without
Planner residue, horizontal overflow or overlap. Browser console/hydration checks
are asserted by the focused proof. No Dashboard, Inbox, Calendar or Portfolio
surface implementation changed.

Validation: IMPLEMENTATION_PASS for this Today-only pass. 11 focused Vitest tests
and 2 disposable Playwright proofs pass. Typecheck, lint, build and diff check
pass. The unchanged 44-migration Git candidate chain, DB lint and security
advisors pass in the fresh isolated runtime; no Target migration or remote DB
action. Report: `/tmp/life-os-r2-02-runtime-3ig5evyy/playwright-report/index.html`.
V5 Design-Taste review: PASS for timeline hierarchy, semantic text-supported
accents, compact rows and viewport bounds. R2-03 stays ACTIVE; user acceptance
is PENDING.

Remaining limits: no durable reopen/undo/every-save history, no fabricated generic
artifacts or historical morning snapshot. Opening Context explicitly displays
current day state. Run/Strength/Meal timestamp mapping has focused unit evidence;
this pass does not re-prove each domain's separate completion UI.

## R2-03 Today relevance / aggregation pass — 2026-09-06

Today Activity Stream = meaningful daily events, not raw mutation history.
The existing layout and domain writes remain intact. The following current
policy supersedes per-log Mood/Habit and REVIEW CREATED display above.

| EVENT TYPE | CANONICAL SOURCE | TIMESTAMP | CURRENT CARDINALITY (before → after) | DISPLAY POLICY | RESULT |
|---|---|---|---|---|---|
| TASK CREATED | tasks | created_at | 1/task → unchanged | A. INDIVIDUAL | real creation, independent of plan |
| TASK SCHEDULED | tasks | scheduled_start_at | 1/current task slot → unchanged | A. INDIVIDUAL | current intended start; no resize/edit history |
| TASK COMPLETED | tasks | completed_at | 1/task → unchanged | A. INDIVIDUAL | actual retained completion |
| INBOX CAPTURE | inbox_items | created_at | 1/capture → unchanged | A. INDIVIDUAL | original capture; provenance remains honestly generic |
| INBOX PROCESSED | inbox_items | processed_at | 1/final triage → unchanged | A. INDIVIDUAL | no clarify/save/selection events |
| HABIT LOGGED → HABIT | habit_logs + owned habits | latest effective recorded_at, canonical local_date | N logs/habit/day → at most 1/habit/day | B. AGGREGATED | sum active logs; real daily_target/unit; undo changes same stable day row |
| MOOD LOGGED → MOOD | mood_entries | latest active recorded_at within profile-local day | N entries/day → at most 1/day | C. LATEST-STATE | latest mood replaces earlier display, timestamp/id tie-break |
| MEAL COMPLETED | meals | completed_at | 1/meal → unchanged | A. INDIVIDUAL | no planner or recipe-edit noise |
| RUN COMPLETED | running_sessions | completed_at | 1/session → unchanged | A. INDIVIDUAL | no intermediate session edits |
| STRENGTH COMPLETED | strength_sessions | completed_at | 1/session → unchanged | A. INDIVIDUAL | canonical completion |
| REVIEW CREATED | review_records | created_at | 1/review → 0 | D. SUPPRESSED | initial persistence is not a separate meaningful completion |
| REVIEW COMPLETED | review_records | completed_at | 1/review → unchanged | A. INDIVIDUAL | Daily/Weekly completion on the actual local completion day |
| Metadata, autosave, revalidation, auth, sync, failed/no-op writes | no action-history source | none | 0 → 0 | D. SUPPRESSED | never inferred from updated_at |
| Habit undo / daily Mood history | existing retained/archived records | no new action inferred | 0 separate action rows | D. SUPPRESSED | affects current aggregate/latest state only |
| Task reopened | no reliable dedicated timestamp | none | 0 → 0 | D. SUPPRESSED | no reconstruction claim |
| Sleep / weight | date-based upserted records | sleep_date / measured_on, no precise action time | not projected | D. SUPPRESSED | existing limitation retained; no fake midnight timestamp |
| Project / Goal / Skill | not part of this existing Today source set | creation timestamps exist; no new reads in this pass | not projected | D. SUPPRESSED | no Portfolio expansion; no metadata events |

Zero effective logs means no Habit row, rather than inventing an undo event.
Habits without a target show quantity/unit “heute”; completion is never invented.
The task-based Delta Summary is computed independently of displayed event count.
No rows are deleted or mutated, no new event table/migration and no hard limit.
Timestamp ordering plus stable event IDs makes reload deterministic, including
equal-clock instants and DST. Habit aggregation reads the full canonical local
day and fetches owned name, target and unit with the existing repository.

Focused proof adds actual Dashboard Habit creation/increments (3/5 → 5/5),
Undo (4/5), two Mood selections, two individual Quick Thoughts, canonical
5 retained logs / 4 active logs, Today reload, stable chronology and source links.
The existing core proof retains Task creation → scheduling → completion and
Review/Carry Forward. No planning/creation/recurrence control returns to Today.
Screenshots cover 3840×2160, 2560×1440, 1920×1080 and 390×844.

Validation: IMPLEMENTATION_PASS. 16 focused projection/read-model Vitest tests
and all 3 Today Playwright proofs pass; typecheck, lint, build and diff check
pass. Browser console/hydration is clean. Full screenshots were visually
reviewed at all four sizes: compact semantic rows, no overlap/overflow and
unchanged V5 hierarchy (Design-Taste PASS). Source links and the unchanged
Today navigation/control inventory are exercised by the current proof suite.
No schema or write-model changes; the disposable runner additionally passed
its existing 44-migration chain, DB lint and advisor guards.

Remaining high-volume sources: genuine independent Captures, Tasks (up to three
distinct supported states per task), completed Meals and Training sessions.
These remain visible without arbitrary truncation. This is implementation
evidence only; R2-03 remains ACTIVE, Calendar is pending and USER ACCEPTANCE
STATUS is PENDING.

# 4. Calendar and Scheduling

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Planner Queue | `CONNECTED` | C2-01 server read model contains exactly open, unscheduled canonical Task Occurrences, ranked once by overdue/deadline/recurring/Project/direct-Goal/backlog signals with compact context and reason; C2-04 retains this deterministic path through keyboard scheduling and reload | canonical filters remain a later read-surface depth |
| Schedule task | `CONNECTED` | Week Queue/Inspector runs the authenticated, source-aware Task schedule action; C2-04 confirms keyboard execution, Calendar/Today/Dashboard projection and reload | maintain |
| Move earlier/later | `CONNECTED` | Inspector move controls and C2-02 cross-day pointer movement call the canonical reschedule action and survive reload | maintain |
| Duration change | `CONNECTED` | Inspector duration controls and the C2-02 bottom resize handle use the same canonical duration update and survive reload | maintain |
| Unschedule | `CONNECTED` | Inspector unschedule removes the timed block and returns the Task to the canonical queue immediately and after reload | maintain |
| Visible conflict gate | `CONNECTED_GAP` | Z1 focused disposable proof routes Queue/Inspector schedule and reschedule, Pointer move and resize through one loaded-block overlap rule; each path requires explicit Confirm or Cancel and preserves the prior block after cancellation/reload | no DB-wide conflict or race guarantee; only loaded blocks are checked |
| Conscious override | `CONNECTED_GAP` | Z1 focused disposable proof requires a separate explicit confirmation before the existing canonical Task-time path runs, including Meal source scheduling | no schedule audit/history and no DB-wide conflict guarantee |
| Day/Week views | `CONNECTED_GAP` | Manual Week remains the primary planning surface; historical Day navigation proof remains | R2-03: real visible controls, available-height use and current browser proof |
| Month view | `CONNECTED_GAP` | bounded Month grid projection and historical drill-down proof remain | R2-03: real visible control and current browser proof |
| Calendar viewport bounds | `CONNECTED_GAP` | R2-03 responsive full-range Week grid shows 06:00–22:30 without body or Timegrid vertical scrolling at all three desktop proof sizes | user acceptance pending |
| Deadline / Project / Goal date projection | `CONNECTED` | C2-03/C2-04 keep scheduled time distinct from Task deadline, Project deadline and Goal target; open overdue Tasks are read-time marked while completed Tasks are not | canonical Project/Goal milestones remain separately unmodeled |
| Calendar filters | `NOT_STARTED` | no active Manual filter claim; legacy visual scope controls are not exposed as Calendar planning filters | implement only canonical Project/Goal/Skill/Priority filters when needed |
| Project/Goal/Skill queue context | `CONNECTED` | C2-01 queue reads existing C1 Project, direct/via Project Goal and Task↔Skill relations without copying Task data | add filters only as a separate read-surface depth |
| Recurring/routine scheduling | `CONNECTED` | user-scoped template list/create/edit/pause/reactivate, explicit date/range generation and authenticated reload proof; no background writes | maintain |
| Meal schedule source | `CONNECTED` | canonical Target Runtime keeps the source-aware Meal↔Task schedule/completion boundary; Z1 Direct-Data-API proof atomically rejects authenticated direct schedule/reschedule/unschedule writes while canonical RPCs remain reload-stable | maintain the atomic source boundary |
| Workout schedule source | `CONNECTED` | canonical Target Runtime keeps Task-only scheduling and canonical Running/Strength completion evidence; Z1 Direct-Data-API proof rejects authenticated lifecycle bypasses, while C2-02/C2-04 retain the Calendar reload proofs | retain no-duplicate and completion-sync regressions |
| Review schedule source | `CONNECTED` | canonical Target Runtime keeps Review Task scheduling and review-owned completion; Z1 Direct-Data-API proof rejects direct Task completion of an open Review and the canonical Review flow completes both records | maintain review-owned completion |
| Free calendar events | `NOT_STARTED` | none | separate model decision |
| Drag/drop/resize | `CONNECTED` | C2-02 dependency-free pointer layer maps Queue drop, cross-day move and duration resize to existing source-aware schedule/reschedule actions; loaded conflict confirmation, cancel/invalid-drop rollback, reload and Inspector fallback are focused-browser-proven | no keyboard DnD required because the full Inspector scheduling flow remains equivalent; canonical filters remain separate |
| Schedule history/audit | `NOT_STARTED` | none | later lifecycle/audit model |

## R2-03 Calendar temporal correction — 2026-09-06

Today is functionally accepted by the user and unchanged in this pass. R2-03
stays ACTIVE; Calendar and overall USER ACCEPTANCE STATUS remain PENDING.

Calendar is planning/scheduling/rescheduling, with status display and source
navigation. Completion belongs to Task Detail / responsible execution surfaces;
Today remains the accepted execution history/daily protocol.

| Capability / control | Expected / implementation | Current evidence |
|---|---|---|
| Duration geometry | exact canonical minute proportions in persisted layout, overlap lanes and pointer preview | 15/30/45/60/90-minute unit mapping; no percent/CSS minimum-height inflation |
| Adjacent blocks | consecutive half-hour blocks share full lane without artificial overlap | focused layout regression |
| Week available height | bounded desktop viewport, expanded time axis, internal grid scrolling | 3840/2560/1920 bounds and 390 overflow guard |
| Hour guides | actual 06:00–22:30 range, final half-hour row uses half weight | same temporal denominator as blocks/pointer mapping |
| Short blocks | one-line compact label and full accessible name/tooltip | actual button bounds equal canonical block bounds |
| Time Settings | Reschedule / Unschedule; earlier / later; duration +15 / -15 | six actions in ordered pairs, persistence and reload proof |
| Duration display | derived read-only value; Start/End and duration actions update it | no apparently editable no-op duration field |
| Mark done | removed from Manual, Demo and Empty Calendar paths | no Calendar completion import, form, callback or button; backend untouched |
| Source | Open task navigates to canonical detail/context | browser navigation |
| Planner Queue | selection and schedule retained | unschedule → queue → schedule → reload |
| Day / Month | existing views and navigation retained | view navigation, no completion control; Day proportional geometry |
| Footer | technical Page Type/source-contract and persistence explanation removed | compact event color legend retained without explanatory footer |

Validation: IMPLEMENTATION_PASS for this Calendar-only pass. 20 Calendar unit
tests, the dedicated R2-03 browser proof and retained C2 pointer drag/move/resize/
conflict-cancel proof pass. Direct reschedule, unschedule, ±15 movement, ±15
duration, queue re-scheduling and reload preserve canonical values. Day/Week/
Month and next/previous-period navigation plus Month source link pass.
Typecheck, lint, build and diff check pass. Console/hydration is clean.
The isolated runner also passed its unchanged 44-migration chain, lint and
advisor guards; no migration or remote action was needed.

Visual review: A (30 minutes visibly half of 60) YES; B (useful vertical fill)
YES; C (logical Time Settings pairs) YES; D (planning, no execution action)
YES. 08:00–08:30 and a 60-minute block appear in the same real-data screenshots
at 3840×2160, 2560×1440, 1920×1080 and 390×844. Desktop grid bounds remain inside
the viewport without body scroll; Mobile uses bounded internal horizontal
timegrid navigation without page overflow. V5 Design-Taste PASS: preserved
hierarchy, semantic accents and compact short-block labels. Proof:
`tests/e2e/r2-03-calendar-temporal.spec.ts`; screenshots/report in
`/tmp/life-os-r2-02-runtime-3ig5evyy/playwright-report/index.html`.

No new model, migration, domain action or provider. Calendar-local CSS only;
Today, Dashboard, Inbox and Portfolio implementation remain unchanged. Task
status is displayed, never mutated by Calendar.

### Calendar queue-default rail and viewport pass

R2-03 remains active; Today stays accepted and unchanged. The Calendar right
rail now derives exactly `queue` or `selection { blockId }` from the current
block selection. Reload has no selected URL state and starts in Queue mode.
No history entries are added for transient block selection.

| Control / surface | Expected behavior | Evidence scope |
|---|---|---|
| Normal rail | Planner Queue fills available right-rail height; no Inspector | populated queue, four viewports |
| Block selection | selected block opens complete Inspector context | Week 30-minute block; Day regression |
| Close × | removes Inspector and expands Queue | real button, Queue mode and bounds asserted |
| Escape | closes block selection | browser keyboard proof |
| Free grid | existing slot click deselects the block and returns to Queue | real slot-click proof; no new background interception |
| Queue selection | existing scheduling form inside Queue mode | schedule after unschedule, reload |
| Selection rail | Inspector internally bounded; Queue remains below and usable | rail/card bounds, no body extension |
| Short blocks | 15 min: one compact line; 30 min: title + time; 45–60 min: type/status added; longer: context | canonical duration unchanged; full accessible name and Inspector |
| Viewport | route-level height includes auth notice; Grid and Queue/Inspector scroll internally | document scrollHeight checked in both modes |
| Week opening | once-per-week initial positioning at current time, or first scheduled block / 08:00 | no repeated scroll reset during selection |
| Current time | Manual uses existing profile timezone helper, default app timezone when profile absent | removes inherited Demo 15:42 clock from Manual Calendar |

No schema migration, task lifecycle, recurrence or domain write-model change.
Calendar-only view-model glue supplies the clock; no Today/Dashboard behavior
is changed. Current-time position uses the same canonical visible minute range
as blocks and pointer mapping.

Validation: IMPLEMENTATION_PASS for this scoped pass. 22 Calendar unit tests
(including duration geometry and Rail Mode), the expanded R2-03 Playwright proof,
and the current C2 drag/move/resize/conflict-cancel regression pass. Typecheck,
lint, build and diff check pass. Browser console/hydration is clean. Both
Normal and Selection modes assert document height within viewport tolerance
at 3840×2160, 2560×1440 and 1920×1080; Mobile has no horizontal page overflow.
Twelve real backlog tasks exercise queue scrolling; a 30-minute and 60-minute
block share the grid. Close, Escape, free-slot deselect, Queue expansion,
Day selection/close, Month source navigation and every time action survive
the relevant reload proof. The Month test selects an actually visible marker
rather than assuming a particular Task is among the three preview links.

Eight full screenshots (Normal/Selection × four viewports) are retained at
`/tmp/life-os-r2-03-calendar-rail-proof/`. V5 Design-Taste review: PASS;
dominant normal Queue, temporary bounded Inspector, readable compact blocks,
unchanged semantic colors and no body expansion. The disposable runner's
existing migration/lint/advisor guards passed; no DB changes were needed.
R2-03 remains active. USER ACCEPTANCE STATUS: PENDING.

### Calendar desktop viewport-fit correction — superseded

The following evidence records the rejected intermediate interpretation. It
removed body scrolling by retaining an internally scrolling Timegrid. The
full-range correction below supersedes that behavior and its acceptance claim.

R2-03 remains active; Today and the accepted Calendar design/behavior are
unchanged. The remaining Calendar finding was caused by competing height
contracts: the App Shell used minimum viewport heights while Calendar also
declared its own calculated viewport height, then masked the resulting
overflow at several nested levels.

The Calendar route now follows one explicit height chain on desktop. The outer
shell owns `100dvh`; its frame, content column, main region, route workspace and
Calendar page pass the available height through with `min-height: 0`. Week grid
and right rail consume the remaining flex/grid track. The old calculated
Calendar height and main/page/rail clipping rules are removed. The proportional
1224 px time model is unchanged and scrolls only inside the existing Timegrid;
Queue and Inspector retain their existing internal overflow behavior.

Focused Playwright proof asserts both `document.documentElement.scrollHeight`
and `document.body.scrollHeight` are at most viewport height plus 1 px in Queue
and Selection modes at **3840×2160, 2560×1440 and 1920×1080**. Main, workspace,
Calendar page, Timegrid card and right rail all have positive bounds fully
inside the viewport. The proof scrolls the Timegrid to its real end and restores
the initial position, checks internal overflow, selects/closes a 30-minute
block, exercises direct reschedule, unschedule, ±15-minute movement and duration,
and confirms reload plus Day/Week/Month navigation. Mobile **390×844** retains
normal page flow without horizontal overflow. Eight viewport screenshots were
visually reviewed from the isolated proof; no Calendar clipping, overlap or
design change is present. Console and hydration checks are clean.

Validation: IMPLEMENTATION_PASS for this focused correction. 22 Calendar unit
tests, the dedicated Calendar Playwright proof, typecheck, lint, build and diff
check pass. No backend, schema, migration or domain logic changed. V5
Design-Taste: PASS; the existing planning hierarchy and visual language remain
unchanged. R2-03 stays ACTIVE. USER ACCEPTANCE STATUS: PENDING.

### Calendar full-range responsive Timegrid correction

The user rejected the intermediate internal Timegrid scroll. The canonical Week
range remains linear and unchanged at **06:00–22:30** (990 minutes / 16.5
hours), but its hour height now derives from the available desktop hours track.
The fixed 1224 px desktop minimum no longer forces vertical overflow. Mobile
keeps its existing independent responsive flow.

| Desktop viewport | Grid client / scroll height | Hours height | Hour height | Body / Timegrid scroll | Range bounds |
|---|---:|---:|---:|---|---|
| 3840×2160 | 1840 / 1840 px | 1706.5 px | 103.45 px | NO / NO | 06:00 and 22:30 visible |
| 2560×1440 | 1120 / 1120 px | 986.5 px | 59.82 px | NO / NO | 06:00 and 22:30 visible |
| 1920×1080 | 760 / 760 px | 626.5 px | 38 px | NO / NO | 06:00 and 22:30 visible |

Block positions and heights remain percentages of the same 990-minute range;
15/30/45/60/90-minute geometry, pointer placement and current-time position do
not use viewport pixel constants. At 1920×1080 the browser proof measures the
30-minute block at 18.98 px and the 60-minute block at 37.97 px. Compact text
density keeps title and exact start/end time inside the 30-minute bounds. The
block button is block-level to remove inline baseline overflow, and the existing
resize grip uses a smaller footprint on micro/compact blocks so it does not
cover their selection target.

The focused Playwright proof checks Queue and Selection modes at all three
desktop sizes. It asserts `html` and `body` height, Timegrid
`scrollHeight <= clientHeight + 1`, immutable zero vertical `scrollTop`, visible
06:00/22:30 boundary labels, text bounds, 30:60 ratio, right-rail bounds and the
Current-Time-Line against its percentage-derived expected position. Screenshots
show the full range plus 30- and 60-minute blocks together. Existing Inspector,
Close/Escape/free-slot deselect, Reschedule, Unschedule, movement/duration ±15,
source navigation, Queue scheduling, reload and Day/Week/Month regressions pass.
Mobile 390×844 remains usable without horizontal overflow or overlap.

Validation: IMPLEMENTATION_PASS for this scoped correction. 25 Calendar unit
tests and the focused disposable Playwright proof pass; typecheck, lint, build
and diff check are green. Console/hydration is clean. No backend, schema,
migration or domain behavior changed. V5 Design-Taste: PASS. R2-03 stays ACTIVE.
USER ACCEPTANCE STATUS: PENDING.

# 5. Portfolio, Projects, Goals and Skills

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Portfolio information architecture | `CONNECTED_GAP` | Task/Project/Goal/Skill entity backend and views remain | R2-04: sidebar subpoints plus separate list/create/detail surfaces; Overview not primary creation |
| Task create/edit/lifecycle | `CONNECTED_GAP` | K1.1A Portfolio Task Detail, task actions/repository and historical reload proof remain | R2-04: Task list/create/detail surface acceptance |
| Task relation to Project/Goal | `CONNECTED` | nullable Task→Project/Goal fields, server-authenticated/Zod/user-scoped alignment checks and C1.1 integrated Target reload proof | maintain explicit user choices; no silent relinking |
| Task relation to Skill/Resource | `CONNECTED` | owned n:m `task_skill_links` plus Resource relations, idempotent link/unlink, Task detail projection and Skill backlink without creating Evidence; C1.1 integrated proof PASS | maintain endpoint ownership, reload and no-auto-Evidence proofs |
| Project Goal inheritance in Task context | `CONNECTED` | direct, via-Project, redundant and existing-conflict states are explicit; Task and Project writes reject new contradictions, and C1.1 integrated read models deduplicate matching paths | preserve existing rows; resolve any future reported existing conflicts deliberately |
| Core work graph backlinks | `CONNECTED` | C1.1 integrated Target proof covers Task/Project/Goal/Skill/Resource navigation, reload, ownership boundaries and deterministic direct, via-Project, Context and Evidence provenance | retain bounded explicit relations; graph visualization stays deferred |
| Project create/edit/status/archive | `CONNECTED_GAP` | project actions/repository remain | R2-04: Project list/create/detail surface acceptance |
| Goal create/edit/status/archive | `CONNECTED_GAP` | goal actions/repository remain | R2-04: Goal list/create/detail surface acceptance |
| Skill create/edit/archive | `CONNECTED_GAP` | skill actions/repository remain | R2-04: Skill list/create/detail surface acceptance |
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
| Notes/wiki resources | `CONNECTED` | canonical `resources.type = note` powers Life Notes; Z1 atomically creates Work Wiki Resources with their optional Work-Project context | deeper Wiki behavior remains optional; no parallel knowledge model |
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
| Meal Planner week view | `CONNECTED_GAP` | canonical Target N1 proof reloads a recipe-linked Meal in the weekly planner and schedules it only through the source-aware Meal↔Task boundary | R2-05: selectable persistent planner slots and current browser proof |
| Grocery Draft | `CONNECTED` | canonical Target N1 proof derives open Meal demand from persisted Recipe Ingredients and Meal/Recipe servings with reload-stable fractional scaling | no persistence/check-off/pantry |
| Manual nutrition estimate | `CONNECTED_GAP` | optional recipe JSON estimate | provenance only; no real engine |
| Meals Today | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Nutrient Balance | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
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
| Weight goal | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Journal linkage | `UI_ONLY` | journal/nav exists | canonical journal/notes and privacy |
| Mental Health overview | `CONNECTED_GAP` | canonical Mood history and Sleep entry/history are connected without medical claims | journal linkage and later review associations remain separate |

# 9. Habits

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Habits surface role | `CONNECTED_GAP` | user-scoped canonical habits with create/edit/order/archive UI and RLS remain | R2-05: Habits = statistics/history/management; Dashboard = quick logging |
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
| Health / Fitness primary viewport | `CONNECTED_GAP` | canonical records and flows remain | R2-05: no required Body scroll on primary desktop and current surface proof |

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
| Literature library | `CONNECTED_GAP` | Z1 disposable DB/API and browser proof atomically creates a canonical Resource plus reload-stable Project `source` link; active same-user Education Area and Project ownership are enforced | reading status and bibliographic metadata remain deferred until safely modeled |
| Learning log | `CONNECTED` | A1 Target browser proof creates a user-scoped `education_logs` record and reloads it in the canonical Project context | maintain aggregation and ownership proofs |
| Thesis/project relation | `CONNECTED` | A1.1B1 user-owned `education` Area with canonical Projects, Tasks, Deadlines and literature Resources | maintain same-user relation ownership |
| Writing best practices/resources | `CONNECTED_GAP` | A1.1B1 scoped Resources plus A1.1B2 Writing Logs with signed word deltas | dedicated prompt/template management remains separate depth |
| Education dashboard | `CONNECTED_GAP` | Manual Education workspace projects, task/deadline context, atomically linked literature and A1.1B2 Learning/Writing activity | richer scientific metadata remains deferred |

# 13. Work

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Work projects/tasks | `CONNECTED` | A1 Target browser proof creates a user-owned Work-Area canonical Project and confirms its Core backlink after reload | maintain reload and same-user ownership proofs |
| Work log | `CONNECTED` | A1 Target browser proof creates a user-scoped `work_logs` record and reloads it in the Manual workspace | automatic time tracking and analytics remain out of scope |
| Work wiki | `CONNECTED_GAP` | Z1 disposable DB/API and browser proof atomically creates a canonical Work-Area `note` Resource plus its optional Work-Project `context` relation; active same-user Work Area and Project ownership are enforced | deeper Wiki features remain deferred; no parallel knowledge model |
| Meetings | `CONNECTED` | A1.1C2b user-scoped `work_meetings` with canonical Work-Project ownership, create/edit/soft archive and reload-stable historical Manual workspace | maintain meeting ownership and archive proofs |
| Decisions | `CONNECTED` | A1.1C2a user-scoped `work_decisions` with Work-Project ownership, status, create/edit/archive and reload-stable history | maintain ownership and status proofs |
| Follow-ups | `CONNECTED` | A1.1C2b canonical `tasks` linked by `work_meeting_followups`; Security-Invoker RPC atomically creates the owned Task and Meeting relation, while existing owned Tasks can link/unlink independently | no automatic Task completion or external sync |
| Work dashboard | `CONNECTED_GAP` | Manual Work workspace reads canonical Projects, Tasks/Deadlines, Resources, Logs, atomically created Wiki, Decisions, Meetings and Meeting Follow-ups | deeper Wiki and Work-dashboard depth remain deferred |

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
| Restore smoke | `CONNECTED` | Z1 guarded canonical Target backup restores schema, migration history and aggregate canonical-table data into an isolated disposable container; Target preservation is structurally checked before/after | logical local restore-smoke only; no cloud, remote or production restore claim |
| Private remote | `EXTERNAL_GATE` | intentionally not active | explicit user decision later |
| Public SaaS | `NOT_STARTED` | not a goal | do not plan by default |

## Update Rule

The user/Codex prompt selects a `ROADMAP.md` block ID. Update this registry after each completed material capability so it remains the sole dynamic documentation source for implementation status.
