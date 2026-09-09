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

## Active Product Boundary (Product Consolidation)

Implementation status and product visibility are separate truths: `CONNECTED` code may be deferred and hidden without being deleted or relabeled as unimplemented.

| Surface / domain | Boundary | Current implementation truth | Visibility truth / next action |
|---|---|---|---|
| Dashboard | `ACTIVE` | `CONNECTED`: R2-01 implementation evidence plus explicit USER ACCEPTED on 2026-09-06 | maintain accepted Dashboard |
| Inbox | `ACCEPTED` | `CONNECTED`: R2-02 explicitly USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Today | `ACCEPTED` | `CONNECTED`: R2-03 explicitly USER ACCEPTED on 2026-09-06; daily-memory evidence retained | maintain accepted Today |
| Calendar | `ACCEPTED` | `CONNECTED`: R2-03 explicitly USER ACCEPTED on 2026-09-06; 06:00–00:00 equal-hour and viewport evidence retained | maintain accepted Calendar |
| Portfolio | `ACCEPTED` | `CONNECTED`: R2-04 explicitly USER ACCEPTED on 2026-09-07; list/create/detail, canonical write and visual evidence retained | maintain accepted behavior |
| Resources | `ACCEPTED` | `CONNECTED`: current surface explicitly USER ACCEPTED on 2026-09-07; existing knowledge and R2-04 create/detail evidence retained | maintain accepted surface; separately listed depth gaps remain |
| Health / Fitness | `ACCEPTED` | `CONNECTED`: Mental Health, Habits, Running and Strength explicitly USER ACCEPTED on 2026-09-07 | maintain accepted behavior; R2-05 closed |
| Nutrition | `ACCEPTED` | `CONNECTED`: logging/tracking, canonical weekly planning, recipes and grocery; explicitly USER ACCEPTED on 2026-09-07 with Health & Fitness | R2-05 closed; preserve evidence and accepted behavior |
| Work / Education / Coding | `HIDDEN_RETAINED` / `FOLDED` | A1 canonical Projects, Resources and logs remain; detailed technical statuses below are retained evidence, not suite completion | Areas stay active as context; no independent suite completion |
| Inventory / Wishlist | `EXTERNALIZED` / `RETAINED` | existing CRUD, purchase decisions and conversion retained; no new completion claim | Spreadsheet is Source of Truth for future use; no active navigation or connector |
| Journal | `ACTIVE` | `CONNECTED`: R2-07 chronological workspace, canonical create/edit/archive, search/filter, detail and current responsive/reload proof | R2-07 resumes after R2-09; user acceptance pending; unsupported context/relations/Today sources documented below |
| Skill Map | `ACTIVE_PLANNED` / `REMAINING_DEPTH` | `UI_ONLY`: only a retained Coding demo/empty Manual shell | R2-08 under Portfolio → Skills; no active graph link yet |
| Notes | `FOLDED_INTO_RESOURCES` / `RETAINED` | `CONNECTED`: existing canonical `resources` (`note`), no migration | no separate active Notes app |
| Anti-Rot / Challenges / Shop | `DEFERRED_HIDDEN` | connected feature code/data; direct routes remain intact | C1.1-01 removed Sidebar, Dashboard and normal Daily-Companion entry points |
| Entertainment | `DEFERRED_HIDDEN` | connected collection code/data; direct routes remain intact | C1.1-01 removed Sidebar, Life overview and obvious active cross-links |
| AI1 Personal Assistant | `DEFERRED` | not started / external decisions outstanding | do not continue during C1→A1 |

Visibility labels are product-boundary classifications, not new implementation
statuses. Hiding a capability never means it is complete. Existing technical
statuses/evidence below remain distinguishable from future active scope.

Active navigation: Dashboard, Inbox, Today, Calendar, Portfolio (Tasks/Projects/
Goals/Skills), Resources; Health & Fitness and Nutrition with existing children;
Personal → Journal; Settings. Legacy routes remain directly addressable.

## Active Delivery Sequence

The completed technical sequence C1 → C2 → C3 → K1 → H1/H2 → N1 → A1 → Z1 is
history. R2-01 through R2-04 and Health/Fitness are explicitly accepted.
**R2-05 USER ACCEPTED on 2026-09-07: Health & Fitness and Nutrition accepted in full.**
R2-05 is closed; R2-09 External Resource References is the sole active block,
then R2-07 Journal (USER ACCEPTANCE PENDING) → R2-08 Skill Map → R2-06 Full Active Product Acceptance.
R2-06 retains its original ID; the two new capabilities precede it.

## R2-05 user acceptance and administrative closure — 2026-09-07

The user explicitly records R2-05 = USER ACCEPTED, including Health & Fitness
and Nutrition in full. R2-05 is closed. Existing implementation/browser/visual
proofs below remain historical evidence, including their original pending
wording; this acceptance supersedes those status snapshots. No domain code or
data changes in this closure. R2-07 Journal became active at this historical closure; R2-09 now precedes
its remaining user acceptance. Implementation cannot accept Journal.

## R2-09 Project Milestones + Task Grouping — 2026-09-09

Model audit (canonical persistence): MILESTONE_MODEL_EXISTS = NO;
TASK_GROUPING_EXISTS = NO; REUSABLE_MODEL = NO. Older EntityMilestone and Education
phase/milestone types are Demo fixtures with manual progress and cross-domain
links, not an owned Project stage model. Existing Projects/Tasks, Workbench reads,
forms, auth/actions, Task lifecycle and route revalidation are reused.

Schema decision: one project_milestones table and optional tasks.milestone_id.
Milestones hold title, outcome/description, explicit open/active/done state,
optional target date, deterministic sort order and existing soft-archive
timestamps. Existing Tasks remain unassigned, with no inferred stages or copies.
Composite owner/project FK, null-Project check, immutable milestone identity,
endpoint guards and RLS protect direct API and invoker RPC writes. A partial
unique index enforces one active stage; explicit activation opens the former
active stage. Project locking serializes swaps, order and archival. Order has a
deferred unique constraint; moves swap positions within unfinished/completed
groups. No global entity, sprint or team workflow.

| Capability | Status | Current truth |
|---|---|---|
| Milestone CRUD | `CONNECTED` | Add and manage disclosures: title, outcome, date, state, completion/reopening, order and archive |
| Task grouping | `CONNECTED` | Exactly one optional same-Project stage; unassigned Tasks always visible |
| Task Detail context | `CONNECTED` | Read stage, navigate to Project, change/unassign behind disclosure |
| Progress | `CONNECTED` | Stage done/total Tasks; Project done/total Tasks and done/total nonarchived stages; no stored percentage or auto-completion |
| Stage lifecycle | `CONNECTED` | Completed stages secondary; archive preserves history and atomically unassigns all linked Tasks |
| Ownership | `CONNECTED` | Auth + Zod + invoker RPC + RLS + DB constraints/guards; cross-project/user/null-project/archived-stage rejection |

Project composition retains Header, shared Work/Context, Supporting surfaces.
Milestones are subsections inside left Work, not top-level cards. Existing task
order (created_at descending) is retained inside each stage. Project creation,
artifact roles and Resource relations are unchanged. Task Detail adds only
milestone context; changing Project while assigned requires unassignment first.
Clearing an assignment uses an owned single-row Task update and remains possible
after Project archive; new assignments to archived endpoints remain rejected.
Portfolio/Project Preview, Dashboard Active Portfolio, Today and Calendar remain
canonical Task/Project projections; they do not own stage data or duplicate Tasks.
Existing revalidation refreshes them after writes, without adding milestone labels
to daily/time planning.

Browser proof: real Research/Implementation creation, outcome/date/title edit,
Project assignment, Task Detail unassignment, Task completion and derived counts,
reorder/reload, explicit active replacement and done/reopen, archive/history and
no Task copies. Direct API/RPC tests reject cross-project and cross-user
assignments, null-Project bypass and anonymous writes; concurrent activation
leaves one active milestone. Console/hydration clean. Responsive captures at
1920×1080, 2560×1440 and 390×844 are ignored under
`test-results/r209-artifact-proof/test-results/r209-milestones-final/`.
Existing Project read-first/artifact/relations regression also passes, including
Projects without Milestones. Final schema has a fresh isolated Git-only chain;
DB lint and security advisors report no issues. The final fresh chain and local
Target both match all 48 Git migration versions. Target had the expected 47-version
baseline; the guarded local migration ran only after isolated PASS. Existing
Target Tasks remain unassigned and no stages were inferred or created. No remote DB.

Validation: git diff --check, pnpm typecheck, pnpm lint, 13 focused Milestone/
Artifact/Task-step unit tests, 11 runtime tests, focused Milestone and existing
Project Workbench Playwright, and pnpm build PASS. Heavy checks ran sequentially
in the protected-file-free source copy. Generated public types retain the
pre-existing verified nullable Inbox RPC argument overrides. A stale stage-picker
write is rejected with visible error; reload retains unassigned state.

Remaining Project Depth: Desired Outcome/Definition of Done (Project Description
is general context; no new field), Blockers/Risks, Decisions, Activity/Review.
These are separate future capabilities. Neither Journal nor Skill Map was worked
on in this slice.
R2-09 remains the sole active block; USER ACCEPTANCE STATUS: PENDING.

## R2-09 Project Detail composition refinement — 2026-09-09

Current Project Detail uses three structural surfaces: Header, shared Main
Workbench (Work + Primary/Context rail, roughly 67/33), and Supporting Surface
(Additional Artifacts + References). Matte backgrounds and subtle outer borders
enclose each whole area; internal vertical/horizontal dividers organize content
without nested cards. Metadata is grouped below identity. Mobile stacks the
sections and substitutes horizontal separators. No viewport-height fill, raw
relation copy or permanent management inputs. Artifact/Reference semantics and
all existing controls/writes remain unchanged.

| Capability | Status | Current control truth |
|---|---|---|
| Read-first Project Detail | `CONNECTED` | Values, counts and real detail links; no visible inputs in normal ID deep links |
| Project editing | `CONNECTED` | “Bearbeiten” reveals the existing complete EntityForm and writes |
| Artifact management | `CONNECTED` | Per-artifact disclosure for role/removal; Primary also offers explicit replacement selection |
| Artifact addition | `CONNECTED` | “+ Artifact hinzufügen” reveals existing Resource/role link and external-reference Create navigation |
| Relations | `CONNECTED` | Task/Goal/Skill/Reference read context; “Beziehungen verwalten” reveals existing Task and Reference controls |
| Lifecycle | `CONNECTED` | Archive behind header “⋯” / “Project verwalten”; archived Projects remain readable |

Header editor/overflow and inline rail disclosures expose `aria-expanded`/`aria-controls`, keyboard activation,
Escape and Close with focus return. No modal/focus trap. Normal views hide role,
link/unlink and save controls. The existing explicit Resource-create return
context still opens addition with the same new Resource selected; Create itself
and its routes/actions are unchanged. Task progress uses real linked tasks;
Skills remain context from Tasks/Evidence, not new Project-owned records.

No schema, migration, project_role, Resource/Relation semantics, repository/action,
Portfolio Overview or other accepted surface changes. No new dependency. Existing
backend auth/Zod/ownership/RLS/revalidation is reused by all disclosed forms.
R2-09 remains active; USER ACCEPTANCE STATUS: PENDING.

Current structural-surface proof (2026-09-09): focused Project Playwright PASS
for one Task/Primary, rich (25 Tasks, Primary/Additional/Goal/Skill/Reference), and
near-empty Projects at 1920×1080, 2560×1440 and 390×844. The test checks shared
surface backgrounds/borders, rail containment, 2:1 columns, bounded short task
lists, internal keyboard scroll and complete desktop Supporting Surface.
Default/management screenshots also cover 3840×2160. Existing Edit/save/reload,
Primary replacement without copies, Task link/unlink, Reference addition,
external/detail navigation and disclosure focus return remain green.
Console/hydration clean. Screenshots remain ignored under
`test-results/r209-artifact-proof/test-results/r209-structure-final/`.

Design review A–F: YES — clear three-surface structure; Work/Context inside one
Workbench; ordered Supporting columns; no floating content groups; fewer
containers than the original card dashboard; professional Project Workbench.
V5 Design-Taste PASS: matte surfaces, restrained borders and semantic typography.
No remaining visual violation identified; this assessment is implementation
evidence, not user acceptance. No schema/migration/backend or other surface edit.
Current validation PASS: git diff --check, pnpm typecheck, pnpm lint, focused
Project Playwright, ten Artifact/Workbench unit tests, eleven runtime tests and
pnpm build, run sequentially in the protected-file-free source copy. The owned
disposable runtime is stopped. R2-09 remains active; USER ACCEPTANCE: PENDING.

Prior content-height proof (2026-09-09; visual treatment superseded above): “Fill the information hierarchy, not
the viewport.” Focused proof covers light (one Task/Primary, no References), rich
(25 Tasks, real 4/25 progress, Goal/Skill, Primary/Additional/Reference), and empty
Projects. It rejects stretched short/empty Work cards and checks a second content
row below the main zone. Management remains explicit and preserves existing writes.
Prior implementation evidence: IMPLEMENTATION_PASS. All three states pass at 1920×1080,
2560×1440 and 390×844; default/management screenshots also cover 3840×2160.
Short/empty Work cards remain below 260px. Desktop composition includes the second
row inside the viewport; no horizontal overflow. Keyboard scroll, edit/save/reload,
exclusive header disclosures, Primary replacement without copies, Task link/unlink,
Reference addition/reload and external/detail links pass. Console/hydration clean.
Screenshots: ignored `test-results/r209-artifact-proof/test-results/r209-content-final/`.

Prior design assessment, subsequently rejected by the user for floating content:
A–F had been marked YES for no giant empty card, dominant Work, clear compact
Primary, readable Context, naturally completed page, no technical relation copy.
V5 Design-Taste: PASS; existing matte tokens and restrained semantic accents,
no remaining visual violation requiring a fix. Blank background is intentional.

Validation PASS: git diff --check, pnpm typecheck, pnpm lint, ten focused
Artifact/Workbench unit tests, eleven runtime tests and pnpm build, sequential in
the protected-file-free source copy. The earlier two Artifact regression tests
also passed; the broad Workbench run was interrupted by task steering and is not
claimed as current evidence. No schema/migration/Target DB action. R2-09 remains
active; USER ACCEPTANCE STATUS: PENDING.

Previous read-first validation (2026-09-08): IMPLEMENTATION_PASS. Focused Project proof
PASS: zero visible inputs in normal view; readable Next Step and actual task
counts; external keyboard opening (intercepted locally), Resource Detail navigation;
Edit → save → close/Escape → reload; direct Primary replacement without copies;
Artifact addition disclosure; Task link/unlink and Lifecycle disclosure. All
management controls are exercised as real UI, not only inspected in markup.

Default, Edit, Artifact Management and Relations screenshots/bounds checked at
1920×1080, 2560×1440, 3840×2160 and 390×844. At 1920 the primary work artifact and
task region are above the fold; the normal project fits the viewport. Mobile
follows document order with no horizontal overflow. Design-Taste PASS: restrained
V5 panels, distinct main/rail priorities, no nested artifact cards or decorative
controls. Open edit mode may naturally scroll; the permanent editor is gone.
Keyboard activation, explicit expanded state, Close/Escape focus return and clean
console/hydration are current browser-proven. Disclosures are enabled after
hydration, following the existing form-readiness pattern.

Both existing R2-09 Artifact tests and all three R2-04 Workbench tests PASS after
adapting Project interactions to explicit disclosure controls. Existing create,
role/ownership/archive semantics and reload proofs remain intact. Screenshot tests
wait for readiness and preserve the caret instead of mutating pre-hydration input
styles; no console suppression was introduced.

`git diff --check`, typecheck, lint, ten focused Workbench/Artifact unit tests,
eleven runtime tests and production build PASS, run sequentially in the isolated
protected-file-free source copy. No migration or Target DB operation in this pass.
The owned disposable runtime is stopped; technical screenshots remain ignored in
`test-results/r209-artifact-proof/test-results/r209-read-final/` (plus the focused
regression output directories). Unrelated user changes remain untouched.
R2-09 USER ACCEPTANCE STATUS: PENDING.

## R2-09 semantic refinement — Project Work Artifacts — 2026-09-08

Current contract: Project is work identity; Work Artifact is the output or work
place; Resources & References support the work. Resource remains the canonical
object, not a global artifact entity. External ownership/API boundary is unchanged.
R2-09 remains the sole Active Work Block; USER ACCEPTANCE STATUS: PENDING.

### Model audit and decision

`projects` retains canonical work identity, tasks, goals, skills and lifecycle.
`resources` already owns title, summary, URL, type and archive state; no new
resource fields or copies are needed. `resource_relations` already owns the
user-scoped polymorphic relationship and `relation_type` (source/context/supports/
evidence/decision/related). Those meanings do not encode work artifacts or a
unique primary. The Workbench reads the same user-scoped records, not a parallel
read store. Existing create/remove actions authenticate and validate; RLS and
same-user checks remain defense in depth.

Pre-change audit: CAN_REPRESENT_WORK_ARTIFACT = NO;
CAN_REPRESENT_PRIMARY_ARTIFACT = NO;
CAN_REPRESENT_SUPPORTING_ARTIFACT = NO (additional output);
CAN_SEPARATE_REFERENCE = YES (existing supporting context).

Option B: `resource_relations.project_role` explicitly persists `reference`,
`additional_artifact`, `primary_artifact`. No `relation_type` is repurposed.
Migration `20260908172459` defaults every existing edge to reference; no URL/name/
type inference or row deletion. Partial unique indexes enforce at most one primary
per Project and one artifact use per Project/Resource. Invoker RPC locks the owned
Project for an atomic primary swap, demotes the previous primary to additional,
reuses an existing edge/Resource, and preserves pre-existing relation types.
The direct-write trigger checks owned active targets and resources. Non-Project
relations cannot carry artifact roles. Workbench groups historical multiple typed
edges by Resource ID, with the explicit artifact role taking precedence.

| Capability | Status | Current behavior |
|---|---|---|
| External resource reference | `CONNECTED` | Existing Resource create/detail/search, URL, type, description and lifecycle |
| Project work artifact | `CONNECTED` | Explicit role on existing relation; high-priority Work Artifacts section |
| Primary artifact | `CONNECTED` | 0 or 1; transactional switch preserves previous resource as additional |
| Additional work artifacts | `CONNECTED` | Multiple outputs, separate from supporting references |
| Supporting references | `CONNECTED` | Existing links stay references; separate Project section |
| Shared Task/Goal/Skill context | `CONNECTED` | Same Resource ID, unchanged normal relation semantics |
| Coding/Education/Work | `CONNECTED` | Normal Areas/Projects/Tasks; external artifacts do not require suites |

### Current control inventory

Project: link existing with explicit role; create external reference; open external
URL/details; change role; remove association. Resource Create returns to the owned
Project with the new Resource selected, but no role inferred or edge created until
explicit confirmation. Resource Detail shows the Project use role and supports
link/removal; Task/Goal/Skill disclosures retain their ordinary semantics. Archived
resources remain history, not active primary; promotion of another resource can
demote the archived prior primary. Removing use does not delete any Resource; removal from Resource Detail also works
when the linked Project has been archived.
Search remains the canonical Resource search.

### Validation and current evidence

IMPLEMENTATION_PASS, not user acceptance. Two focused R2-09 Playwright tests PASS:
Coding, scientific and Work projects with explicit primary, separate supporting
reference, additional artifact, primary replacement, removal, archive/restore,
Resource Detail Project-link/removal and same Resource across Project/Task/Goal/
Skill. External links open via keyboard into locally intercepted test pages; no
provider requests. Six created Resources remain exactly six after all role changes.
Concurrent primary RPCs both succeed with one final primary; direct duplicate
primary and cross-user endpoint/role writes are rejected. A stale archived endpoint
produces visible Server Action feedback. An archived Project's association remains
removable from Resource Detail. All mutations are reloaded and read back through
the authenticated technical user. Demo/Empty/auth-blocked Manual guards PASS.

All three existing R2-04 Workbench tests PASS, including canonical create/edit,
normal relations, progress, lifecycle and deep links. Its Resource-link selector
now targets the internal href (external opening also has the Resource title), and
Project reference controls follow the new section. No application behavior was
suppressed for proof.

Full screenshots of Project, Resource Create and Resource Detail for all three
examples at 1920×1080, 2560×1440, 3840×2160 and 390×844; horizontal bounds PASS.
Visual review: matte V5 panels, primary work context before supporting references,
readable external/details links, no overlaps. Existing mobile document flow and
bounded desktop workbench remain; no cockpit/domain redesign. Console/hydration
assertions are clean. Artifacts: `test-results/r209-artifact-proof/test-results/`.

`git diff --check`, typecheck, lint, 29 focused tests across seven Resource/
relation/workbench/schema suites, 11 runtime tests and production build (57 pages)
PASS. Heavy checks ran sequentially in a protected-file-free source copy, using
existing dependencies and an explicit test-only Turbopack root. A copied Git root
anchors ignored generated files; each browser run uses a fresh compiler directory.
An initial broad locator and combined dev-server memory restart were resolved in
the test harness; final separate browser runs pass without suppression.

Fresh isolated Git-only migration chain: 47 versions, exact match. DB lint and
Security Advisors: no findings. Only after isolated PASS was migration
`20260908172459` applied to the canonical local Target; Target versions == Git
(47), Target DB lint/advisors PASS. No remote DB or personal data proof writes.
Existing records are not inferred/reclassified as artifacts. Generated types update
only the changed relation/RPC contract, retaining established unrelated nullable
type corrections. No separate decision/closure file, new global entity or provider.

R2-09 USER ACCEPTANCE STATUS: PENDING. Journal, Notes reconciliation, Skill Map and
Full Active Product Acceptance remain outside this pass.

### Prior R2-09 baseline evidence (before semantic refinement)

The following records the baseline commit de2ee1a. Its no-migration conclusion
applied to external references only; the relation-role refinement above supersedes
its Project-link flow and artifact semantics.

## R2-09 Product Boundary & External Resource References — 2026-09-08

Life OS is the personal Context/Planning/Memory system. Every meaningful piece
of work has canonical Life OS identity and context. Coding/Education/Work use
normal Projects and Tasks with Goals/Skills/planning/status/relations/history;
GitHub repositories, scientific/Office/PDF/TeX documents and spreadsheets remain
externally owned artifacts referenced by existing Resources. No external API,
sync, secrets, remote database, file copy or parallel entity/model.

### Resource model audit

| Field / capability | Exists | Canonical source | Create | Edit | Reload | Sufficient for external artifact |
|---|---|---|---|---|---|---|
| Title | YES | `resources.title` | existing EntityForm/action/repository | same detail form | R2-09 create/detail reload PASS | YES |
| Description | YES | `resources.summary`, Domain `body` | existing body mapping | same mapping | R2-09 reload PASS | YES |
| Classification | YES | `resources.type`; eight existing types | existing select | existing select | R2-09 reload PASS | YES |
| URL / reference | YES | `resources.url`; non-web location may use description | existing URL field | existing URL field | R2-09 reload PASS | YES |
| Lifecycle/archive | YES | `resources.archived_at`, existing status mapping | captured/default | archive/restore | R2-09 archive/restore reload PASS | YES |
| Task relations | YES | `resource_relations` target `task` | explicit link | unlink/relink | R2-09 reload PASS | YES |
| Project relations | YES | same, target `project` | explicit link after create | unlink/relink | R2-09 reload PASS | YES |
| Goal relations | YES | same, target `goal` | explicit link | unlink/relink | R2-09 reload PASS | YES |
| Skill relations | YES | same, target `skill`, `context` | explicit link, no automatic evidence | unlink/relink | R2-09 reload PASS | YES |

RESOURCE_MODEL_SUFFICIENT = YES. Migration = NONE. Existing auth, Zod,
same-user active-target checks, explicit user-scoped reads/writes, RLS and
workbench route/detail revalidation are reused unchanged. Create and link remain
separate explicit actions: Project → Resource Create → persisted Resource Detail
with owned active Project preselected → confirm Project link. Invalid/foreign/
archived Project query values are not offered as context. Retrying a link acts
on the same Resource ID; no new create request or coupled partial write.

| Capability | Status | Evidence / remaining proof |
|---|---|---|
| External reference create/detail and Project metadata | `CONNECTED` | scientific and Coding Project flows, canonical create/edit/reload and metadata/opening PASS |
| Shared Task/Goal/Skill Resource context | `CONNECTED` | existing canonical relations retained; focused R2-09 regression PASS |
| Discoverability | `CONNECTED` | existing active Resource search covers title, summary, URL and type; no search engine added |
| Coding/Education/Work Area context | `CONNECTED` | canonical Areas and entity selectors retained; no suite required |
| Separate Personal Notes projection | `DECISION_REQUIRED` | later product reconciliation; existing note Resources/data remain intact |

External actions are labelled “Extern öffnen ↗”, with new-tab accessible name,
keyboard focus and HTTP(S)-only opening. Other reference text stays data.
No network request is made by URL parsing or rendering. Project Detail exposes
Resource title/type/description, Resource Detail navigation and external opening.
Existing accepted cockpit/list/domain surfaces and Journal are unchanged.

### Current control inventory and evidence

| Affected control | Direct proof / result |
|---|---|
| Project → Resource/external-reference create | click opens existing `/resources/new?project=<owned-id>`; create produces one persisted ID |
| Resource title, description, type, URL and Create | populated form submit, success toast, ID deep link and reload PASS |
| Project context + explicit Project link | owned active Project preselected after create/reload; submit twice remains one canonical relation |
| Project existing Resource select/link and unlink | unlink → reload absent → select same ID/link → reload present PASS |
| Resource Detail title link | clicked from Project relation, stable `/resources/<id>` PASS |
| External opening | HTTP(S) href, clear new-tab accessible name, focus + Enter opens correct URL; browser route intercepted locally, no provider contacted |
| Task/Goal/Skill relation disclosures/selects/link | same Resource ID linked to all three, each target detail reloaded and read back |
| Resource Edit | description and URL changed, toast, detail reload and Project projection PASS |
| Resource archive/restore | history read-only, existing relations retained, restore editable after reload PASS |
| Link error | Project archived after form load; submit shows error, reload retains the one Resource without creating a copy |
| Resources search | real search input/button finds edited description; both examples also found through deep-linked query; existing unit tests cover title/URL/type and archive exclusion |
| Area selectors | Coding/Education/Work options remain; scientific and Coding Projects created through normal canonical Project UI |

Both current Playwright tests in `tests/e2e/r2-09-external-resources.spec.ts`
pass: the Manual flow plus Demo/Empty/auth-blocked Manual guards on Resource
Create/Detail and Project Detail, with no misleading forms or external actions.
Manual proof includes SQL/Data API readback through the authenticated technical user:
exactly one Resource per example and four target relations per Resource. No
service-role client, personal Target write, copied document, repository suite,
new backend mutation or migration. A repeated link reuses the existing relation.

Full screenshots cover Project relations, Resource Create and Resource Detail
for both examples at 1920×1080, 2560×1440 and 390×844. No horizontal overflow;
fields, links and relation actions remain within their composed panels. V5
Design-Taste: PASS — existing matte surfaces, restrained accents and bounded
forms; secondary metadata supports the work context. Mobile uses the existing
vertical flow; detail depth may scroll. No dashboard/list/domain redesign.

Validation: typecheck, lint, 19 focused Resource/schema/repository/search/semantic
relation tests, 11 runtime lifecycle tests and production build (57 generated
pages) PASS. Build runs in a source copy without protected files and with reused
local dependencies; its test-only Turbopack root is explicit to isolate it from
the parent workspace. Original source/runtime configuration is unchanged.
The initial screenshot caret mutation raced hydration; waiting for enabled
forms and preserving the caret corrected the harness. Current browser console
and hydration assertions are clean; no app suppression was added.
Artifacts: `test-results/r209-proof/test-results/` (ignored, synthetic data).
Disposable runner stops its own stack and runtime; no auth state/artifacts are
staged. The unrelated user test diff and `.idea/` remain untouched.

Result: IMPLEMENTATION_PASS for this Resource slice, not renewed acceptance of
Portfolio/Resources or Journal. R2-09 remains the single active review block;
next product work is R2-07 Journal/user acceptance, then R2-08, finally R2-06.
Notes projection remains DECISION_REQUIRED. Journal/Skill Map/Full Acceptance
are not started or accepted by this slice.

## Product-scope consolidation — 2026-09-07

Central context, not central file ownership. No tables, data, routes or functions
are deleted; no migration, connector, external API or operational copy is added.
GitHub owns repositories/code collaboration; Sciebo/filesystem/LaTeX own document
files; Spreadsheet owns flexible Inventory/Wishlist data. Life OS owns context,
links, planning, evidence and relations. Coding, Education and Work remain Areas.

| Capability | Product disposition | Actual state / destination |
|---|---|---|
| Repositories / GitHub URL | RETAINED / EXTERNAL SOURCE OF TRUTH | canonical Projects with existing URL retained; references use Resource `link` + URL; no GitHub API/sync |
| Coding sessions / Agents / Courses | HIDDEN / RETAINED | existing implementation or Prepared gaps unchanged; no suite roadmap obligation |
| Skill Map | ACTIVE PLANNED / REMAINING DEPTH | `/coding/skill-map` and `area-view-models.ts:getSkillMapViewModel` expose demo data or empty Manual arrays; no clean canonical graph route. Target Portfolio → Skills → Skill Map, R2-08 |
| Coding Knowledge / prompts | FOLDED INTO RESOURCES | `/coding/knowledge` is a Prepared route skeleton, not a connected Knowledge database; existing Resources own active knowledge/context |
| Scientific Work | EXTERNAL DOCUMENT SOURCE + LIFE OS CONTEXT | existing Education Projects and links retained; no scientific-document suite |
| Literature | FOLDED INTO RESOURCES | existing canonical Resources and Project source links; no bibliographic manager |
| Learning Log | FOLDED INTO JOURNAL / SKILL EVIDENCE | semantic destination only; `education_logs` retained, no history migration or new projection claimed |
| Work Log | FOLDED INTO JOURNAL / TODAY | semantic destination only; `work_logs` retained, no history migration or new projection claimed |
| Wiki | FOLDED INTO RESOURCES / EXTERNAL DOCUMENTS | existing Work-Area `note` Resources; no second Wiki |
| Meetings / decisions / follow-ups | RETAINED | specialized records stay; canonical Tasks remain active in Portfolio/Today/Calendar |
| Journal | ACTIVE / REMAINING DEPTH | `journal_entries` dated lifecycle exists; reflection/history/frequency and canonical context depth in R2-07. Recurrence stays Task/Calendar-owned |
| Notes | FOLDED / DEFERRED AS SEPARATE SURFACE | already `resources` type `note`; Quick Thought → Inbox → Note → Resource, no data conversion |
| Inventory / Wishlist / purchase decisions | EXTERNALIZED / RETAINED | data/functions/routes preserved; no spreadsheet engine, migration or integration |
| Resources | ACTIVE KNOWLEDGE / REFERENCE | existing `note`, `learning`, `prompt`, `research`, `link`, `source`, `snippet`, `decision`; title/body/URL/source/context/Area and Project/Goal/Task/Resource/Skill relations suffice |

Skill Map contract: real Skill nodes; evidence count/recency, completed Task
relations, Resource relations and practice context only. Edges must be stored
Skill–Skill relations or visibly derived from shared Project/Task/Resource.
No invented percentages/edges; Gap Detection needs an explicit Target/Prerequisite
model and is outside R2-08. Journal recurrence is not a Journal model feature.

### Cross-link audit

| Source | Classification | Result |
|---|---|---|
| `src/config/navigation.ts` suite sections + Life Notes/Inventory/Wishlist | HIDE | no active links; Personal is a static header with Journal; `readyRoutes` remains route availability only |
| Portfolio Demo source links | FOLD / HIDE | Literature/Wiki → Resources; Learning → Journal; Work Log → Today; scientific/work project context → Portfolio Projects; unimplemented Agents link removed |
| Calendar Demo meeting source | FOLD | Today daily-memory destination; no Work-suite entry point |
| Journal Manual header | FOLD | old Life/Notes suite links replaced by Journal/Resources; retained Life/Notes headers keep their internal legacy navigation |
| Health mental/overview and Dashboard profile Journal links | KEEP | real active `/life/journal` reflection path, unchanged |
| Coding/Education/Work internal links and their `area-view-models` | RETAIN LEGACY | reachable only through direct legacy routes; no route deletion/redesign |
| Legacy Life overview, Notes, Inventory and their fixtures | RETAIN LEGACY | internal routes/functions retained; old Life root is absent from active sidebar and Journal |
| Canonical Area labels/filters and entity/resource relations | KEEP | context remains, canonical entity details remain active |

### Validation evidence

**IMPLEMENTATION_PASS. USER ACCEPTANCE STATUS: PENDING.** R2-05/Nutrition
retains its existing pending status; no new USER ACCEPTED claim.

- `git diff --check`, `pnpm typecheck`, `pnpm lint`, eight focused Portfolio URL
  tests and `pnpm build` pass. Heavy checks run sequentially; all 57 generated
  pages and retained legacy routes build.
- Five focused Playwright tests in `tests/e2e/active-product-navigation.spec.ts`
  pass on the isolated production build: every one of the 17 main navigation
  links and four Portfolio children clicked at 1920×1080, 2560×1440 and 390×844;
  keyboard flyout/Escape/focus, mobile content skip link, Journal/Resources
  context links, reload, Demo/Empty and auth-blocked Manual checked.
- Twelve direct legacy URLs each render HTTP 200 with a visible main heading
  in Demo and auth-blocked Manual: Coding, Repositories, Skill Map, Knowledge,
  Education, Literature, Work, Wiki, Life, Notes, Inventory and Wishlist query.
  Active navigation excludes these routes in every mode; no runtime exceptions.
- Browser console/pageerror/hydration assertions pass. Navigation has no
  clipped horizontal bounds, internal scrolling or empty section header at all
  three sizes; page horizontal overflow is absent. Main navigation is reduced
  from 33 to 17 links (Portfolio's four flyout links retained).
- Full-page and sidebar screenshots for all three sizes were visually reviewed.
  V5 Design-Taste PASS: existing tokens/density/semantic accents remain;
  Personal is a quiet heading; Settings stays anchored at desktop bottom.
  Mobile retains the existing stacked shell and content skip link. No material
  V5 violation or layout fix was needed for this bounded nav change.
- Validation uses an isolated source copy excluding protected paths and the
  unrelated user test diff, no env files/auth state/DB/provider. pnpm automatic
  dependency installation is disabled via `pnpm_config_verify_deps_before_run=false`;
  dependencies are reused locally. Initial symlink-based build isolation was
  rejected by Turbopack; a same-filesystem dependency tree passed the unchanged
  build. No repository dependency/config change was needed.
- Local proof artifacts and temporary production-server Playwright config are
  under `/home/anton/.cache/life-os-consolidation-nhj8gkgm/`; screenshots in
  `test-results/consolidation/`. No artifacts or private/auth data are committed.
  Production server/browser are stopped after proof. No data migration/deletion.

This is navigation/product-boundary work, not renewed acceptance of all existing
core controls or proof of retained authenticated writes. Existing Search/Command
remains a noninteractive Prepared hint; it was not added or accepted here.
Journal depth, Skill Map and final active acceptance remain the planned work.

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
R2-03 was subsequently accepted; R2-04 is now the sole active block. The following evidence retains its historical pass status.

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
| Calendar viewport bounds | `CONNECTED` | R2-03 responsive Week grid shows 18 equal hour intervals from 06:00 to the 00:00 boundary without body or Timegrid vertical scrolling at all three desktop proof sizes; R2-03 USER ACCEPTED | maintain |
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
| Week available height | bounded desktop viewport with the complete responsive 06:00–00:00 axis and no body/Timegrid scrolling | 3840/2560/1920 bounds and 390 overflow guard |
| Hour guides | actual 06:00–00:00 range, 18 equal full-hour rows plus non-layout half-hour guides | same 1080-minute denominator as blocks/pointer mapping |
| Short blocks | adaptive title/time density plus full accessible name/tooltip | actual button bounds equal canonical block bounds |
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

The user rejected the intermediate internal Timegrid scroll and then corrected
the remaining half-hour endpoint. The canonical Week range is now linear at
**06:00–00:00** (1080 minutes / 18 equal full-hour intervals), with hour height
derived from the available desktop hours track. The 00:00 label marks the lower
boundary of 23:00–00:00 and creates no extra row or bottom zone. Mobile keeps
its existing independent responsive flow.

| Desktop viewport | Grid client / scroll height | Hours height | Hour height | Body / Timegrid scroll | Range bounds |
|---|---:|---:|---:|---|---|
| 3840×2160 | 1840 / 1840 px | 1706.5 px | 94.81 px | NO / NO | 06:00, 23:00 and 00:00 visible |
| 2560×1440 | 1120 / 1120 px | 986.5 px | 54.81 px | NO / NO | 06:00, 23:00 and 00:00 visible |
| 1920×1080 | 760 / 760 px | 626.5 px | 34.81 px | NO / NO | 06:00, 23:00 and 00:00 visible |

Block positions and heights remain percentages of the same 1080-minute range;
15/30/45/60/90-minute geometry, pointer placement and current-time position do
not use viewport pixel constants. Late-night proof covers 23:00–23:30,
23:30–00:00 and 23:00–00:00 without crossing the bottom boundary. The Manual
Calendar projection treats `00:00` as minute 1440 when it closes a late block,
rather than as the next day's minute zero. Compact text density keeps title and
exact start/end time inside short blocks.

The focused Playwright proof checks Queue and Selection modes at all three
desktop sizes. It asserts `html` and `body` height, Timegrid
`scrollHeight <= clientHeight + 1`, immutable zero vertical `scrollTop`, visible
06:00/23:00/00:00 labels, all 18 adjacent full-hour gaps within 0.1 px, text
bounds, 30:60 ratio, right-rail bounds and the Current-Time-Line against its
percentage-derived expected position. Screenshots show the full range plus
late-night boundary fixtures and 30- and 60-minute blocks together. Existing Inspector,
Close/Escape/free-slot deselect, Reschedule, Unschedule, movement/duration ±15,
source navigation, Queue scheduling, reload and Day/Week/Month regressions pass.
Mobile 390×844 remains usable without horizontal overflow or overlap.

Validation: IMPLEMENTATION_PASS for this scoped correction. 37 Calendar unit
tests and the focused disposable Playwright proof pass; typecheck, lint, build
and diff check are green. Console/hydration is clean. No backend, schema,
migration or domain behavior changed. V5 Design-Taste: PASS. R2-03 stays ACTIVE.
USER ACCEPTANCE STATUS: PENDING.

### R2-03 user acceptance and closure

**R2-03 USER ACCEPTED on 2026-09-06.** The user accepted the complete
Today / Calendar block. The preceding implementation reports and screenshots
remain historical evidence; their PENDING statements describe those earlier
proof stages. Today daily-memory aggregation and Calendar planning, rail modes,
18 equal hours (06:00–00:00), no desktop body/Timegrid scrolling and midnight
boundary evidence are retained. Final implementation commit: `095633f`.
R2-03 is closed. R2-04 – Portfolio IA & Entity Depth is now the only active block
and its USER ACCEPTANCE STATUS is PENDING.

# 5. Portfolio, Projects, Goals and Skills

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Portfolio information architecture | `CONNECTED` | one Portfolio list with shared URL entity filters, five dedicated create/detail workbenches and independent quick inspector; R2-04 IA correction proof below | accepted 2026-09-07; maintain |
| Task create/edit/lifecycle | `CONNECTED` | canonical ID create/edit/reload, complete/reopen/archive and source-owned lifecycle boundary; R2-04 proof | accepted 2026-09-07; maintain |
| Task relation to Project/Goal | `CONNECTED` | nullable Task→Project/Goal fields, server-authenticated/Zod/user-scoped alignment checks and C1.1 integrated Target reload proof | maintain explicit user choices; no silent relinking |
| Task relation to Skill/Resource | `CONNECTED` | owned n:m `task_skill_links` plus Resource relations, idempotent link/unlink, Task detail projection and Skill backlink without creating Evidence; C1.1 integrated proof PASS | maintain endpoint ownership, reload and no-auto-Evidence proofs |
| Project Goal inheritance in Task context | `CONNECTED` | direct, via-Project, redundant and existing-conflict states are explicit; Task and Project writes reject new contradictions, and C1.1 integrated read models deduplicate matching paths | preserve existing rows; resolve any future reported existing conflicts deliberately |
| Core work graph backlinks | `CONNECTED` | C1.1 integrated Target proof covers Task/Project/Goal/Skill/Resource navigation, reload, ownership boundaries and deterministic direct, via-Project, Context and Evidence provenance | retain bounded explicit relations; graph visualization stays deferred |
| Project create/edit/status/archive | `CONNECTED` | canonical list/create/detail, fields, linked work and archive readback; R2-04 proof | accepted 2026-09-07; maintain |
| Goal create/edit/status/archive | `CONNECTED` | canonical list/create/detail, fields, related work and archive readback; R2-04 proof | accepted 2026-09-07; maintain |
| Skill create/edit/archive | `CONNECTED` | canonical list/create/detail, evidence and archive readback; R2-04 proof | accepted 2026-09-07; maintain |
| Skill evidence CRUD/source links | `CONNECTED` | explicit source-backed evidence create/remove and source navigation; R2-04 reload proof | maintain |
| Task steps and derived progress | `CONNECTED` | owned ordered task_steps; add/edit/complete/reopen/soft archive; real active-step ratio; R2-04 browser/API proof | independent of Task completion |
| Project linked tasks | `CONNECTED` | task project relation | add sequencing/roadmap model |
| Goal linked projects/tasks | `CONNECTED` | goal relations | add outcome/review semantics |
| Project/Goal resource links | `CONNECTED` | same-user Resource link/unlink from both detail directions, reload-proven in R2-04 | accepted 2026-09-07; maintain |
| Project/Goal evidence display | `CONNECTED_GAP` | skill evidence read projection | create/manage from workbench later |
| Project milestones | `NOT_STARTED` | none | model decision and complete vertical slice |
| Goal milestones/key results | `NOT_STARTED` | none | model decision; avoid fake OKR engine |
| Project/Goal logs | `NOT_STARTED` | none | add canonical log records |
| Review cadence | `NOT_STARTED` | none | connect to reviews after D1.2 |
| Project/Goal restore/undo | `NOT_STARTED` | archive exists | lifecycle slice |
| Progress engine | `DECISION_REQUIRED` | task-based signals and legacy fields | preserve honest work signals until model exists |
| Portfolio pins/favorites | `NOT_STARTED` | none | support Dashboard max-four selection |

## R2-04 – User acceptance and administrative closure (2026-09-07)

**R2-04: USER ACCEPTED. Closed by explicit user decision.** Dashboard,
Inbox, Today, Calendar, Portfolio and Resources are currently accepted by the
user. Existing implementation, control inventories, browser/reload proofs,
visual evidence and runtime-hardening evidence below are retained unchanged
as historical evidence; their PENDING/ACTIVE wording describes those passes,
not current status. No product code changed for this administrative closure.

**R2-05 is the sole Active Work Block. USER ACCEPTANCE STATUS: PENDING.**
Health & Fitness = USER ACCEPTED on 2026-09-07 (Mental, Habits, Running, Strength).
The current pass covers Nutrition only; R2-05 remains active and Nutrition acceptance is pending.
Historical first-pass scope: Nutrition remained unchanged and
is not started in this pass. R2-05 remains active after this pass.

## R2-04 – unified Portfolio list IA and surface correction (2026-09-07)

R2-04 remains ACTIVE. USER ACCEPTANCE STATUS: PENDING. This pass changes IA
and surface composition only; the historical four-list decision below is
superseded. Portfolio is the sole active list entry for Task / Project / Goal /
Skill. `/portfolio?type=tasks|projects|goals|skills` and the root share one URL
state reader between Sidebar and Entity View. Existing `view` links remain
compatible. Type/scope transitions clear selection; selection never falls back
to an unrelated first row. Sort preserves an existing visible selection.

Sidebar children, workbench breadcrumbs and legacy entity return/list CTAs now
point to Portfolio filters. Redundant right-rail “Tasks/Projects/Goals/Skills
öffnen” controls are removed. Legacy route implementations remain for technical
deep links (including historical archive queries), with no entry from Portfolio
or its Sidebar/create/detail navigation. Route bases for IDs, create paths and
revalidation remain intact. Resources retain their independent knowledge area.

Create is a compact independent card with five canonical `/new` launchers.
The inspector uses existing description, next action, planning, relationship
context (including inherited Goal context), linked Resources and Skill evidence;
it offers one canonical “Details öffnen” action and no editing/creation inputs.
Unset task duration is explicit; no fallback duration or generic completion
percentage is presented as recorded work. Empty selection keeps a calm card.

Desktop uses the available shell width and remaining viewport height. Compact
rows remain compact within a full-height list; create is auto-height and the
inspector fills the right rail. Both content areas support internal scrolling.
Mobile stacks list → inspector → create. The existing Sidebar flyout is clamped
to the viewport and keyboard-operable. Active route markers wait until client
hydration to avoid a previous-route server/client mismatch on rapid navigation.
Entity / Scope / Sort remain distinct object-type / subset / ordering controls.

Current control inventory (individual actions and URLs are also attached as
`control-inventory` by `tests/e2e/r2-04-portfolio-surface.spec.ts`):

| CONTROL | EXPECTED | ACTUAL | RESULT |
|---|---|---|---|
| Portfolio Root | unified list and calm empty inspector | authenticated empty and populated states exercised | PASS |
| Sidebar Portfolio | `/portfolio` | root opens | PASS |
| Sidebar Tasks | `?type=tasks` | only Task rows; Tasks tab active after reload | PASS |
| Sidebar Projects | `?type=projects` | only Project rows; Projects tab active after reload | PASS |
| Sidebar Goals | `?type=goals` | only Goal rows; Goals tab active after reload | PASS |
| Sidebar Skills | `?type=skills` | only Skill rows; Skills tab active after reload | PASS |
| Entity View All | unified list | all four created entity types visible | PASS |
| Entity View Tasks | task subset | URL and one Task row agree | PASS |
| Entity View Projects | project subset | URL and one Project row agree | PASS |
| Entity View Goals | goal subset | URL and one Goal row agree | PASS |
| Entity View Skills | skill subset | URL and one Skill row agree | PASS |
| Scope, all 11 choices | independent subset | every scope clicked; active state reload-stable; All resets scope | PASS |
| Sort, all 3 choices | independent ordering | every sort clicked; active state reload-stable; Priority resets sort | PASS |
| Entity selection, all 4 types | quick inspector | title/context and selection survive reload | PASS |
| Details öffnen, all 4 types | stable ID route | actual canonical detail opened | PASS |
| Create Task | Task create → persisted ID | form submitted, detail reloaded, Portfolio readback | PASS |
| Create Project | Project create → persisted ID | form submitted, detail reloaded, Portfolio readback | PASS |
| Create Goal | Goal create → persisted ID | form submitted, detail reloaded, Portfolio readback | PASS |
| Create Skill | Skill create → persisted ID | form submitted, detail reloaded, Portfolio readback | PASS |
| Create Resource | canonical Knowledge create → ID | form submitted, detail reloaded | PASS |
| Create/detail breadcrumbs | corresponding Portfolio filter | all four return links clicked | PASS |
| Back / Forward | restore entity filter | Tasks ↔ Projects URL, tab and list restored | PASS |
| Reload | preserve URL filters and selection | each entity and each scope/sort exercised | PASS |
| Incompatible selection | clear quick inspector | type change removes selected query and shows empty state | PASS |
| Mobile Sidebar / keyboard | bounded accessible filter navigation | ArrowRight opens menu; Skills click updates Entity View | PASS |
| Overflowing list | internal scrolling, fixed Body height | real Demo rows scrolled and selected at 1280×720 | PASS |
| Removed list CTAs | no redundant visible controls | absence asserted at every screenshot state | PASS |

Browser-Proof: PASS. Focused manual proof uses unique UI-created entities in
an isolated disposable local runtime, including required-field validation,
canonical detail/reload and Portfolio readback. The existing six Portfolio
routing / R2-04 workbench tests also pass: create/edit, relations, Task Steps,
Evidence, lifecycle, ownership, Empty/Auth boundaries and Inbox → existing
Entity → ID detail. No normal database, action, schema or migration changed.

Visual proof: 16 full-page Portfolio screenshots cover All / Tasks / Projects /
selected at 3840×2160, 2560×1440, 1920×1080 and 390×844. Desktop measurements
assert Body height ≤ viewport, surfaces end within 24 px of the bottom, list
and inspector bottoms align within 2 px, create/inspector gap ≥ 12 px and no
overlap or horizontal overflow. Mobile order and overflow are asserted. The
existing workbench regression additionally captured its 44 route screenshots.
Artifacts stay in ignored `test-results/`; no screenshots or auth state staged.

V5 Design-Taste: PASS. Was passt zu V5: existing surfaces, borders and semantic
entity colors; dominant compact list, clear inspector and quieter launcher.
Was verletzt V5: the prior fused rail, duplicate list navigation and uncomposed
bottom background were corrected. Konkrete Fixes: separate cards and full-height
workspace, stable empty inspector, no dummy content or enlarged rows.
Acceptance Decision: implementation only; USER ACCEPTANCE remains PENDING.

Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, eight Portfolio
routing unit tests, focused Portfolio browser proof and `pnpm build` PASS.
No schema checks are applicable because no backend/schema code changed.
The initial proof caught a Sidebar hydration race (fixed) and test synchronization
issues (fixed); the final proof checks console/hydration without suppressions.
No functional deferral was introduced by this pass. Final user review is still
required; R2-05 is not started.

## R2-04 – Portfolio IA & Entity Depth (2026-09-06)

R2-04 remains the sole Active Work Block. USER ACCEPTANCE STATUS: PENDING.
The overview retains counts, scoped filters, sort, selection and a quick preview;
creation and full editing use the existing canonical entity route families.
Resources retain their own knowledge area. No Today, Calendar, Dashboard or Inbox
surface changes are part of this slice. Inbox integration uses the existing
“Ziel öffnen” selection link, then “Details öffnen” to the already persisted ID;
there is no second create step.

### Historical route audit (superseded by the 2026-09-07 IA decision below)

| Entity | Previous list | Previous create | Previous detail | Target / action |
|---|---|---|---|---|
| Task | `/tasks` | Portfolio inline | `/tasks/[taskId]` read projection | retain list/detail; add `/tasks/new`, connect edit and relations |
| Project | `/projects` | Portfolio inline | `/projects/[projectId]` read projection | retain list/detail; add `/projects/new`, connect workbench |
| Goal | `/goals` | Portfolio inline | `/goals/[goalId]` read projection | retain list/detail; add `/goals/new`, connect workbench |
| Skill | `/skills` | Portfolio inline | `/skills/[skillId]` read projection | retain list/detail; add `/skills/new`, connect practice/evidence |
| Resource | `/resources` | library inline | library quick selection | retain knowledge library; add `/resources/new` and `/resources/[resourceId]` |

The shared workbench is a layout and form composition over these five existing
models, not a universal entity table. Create and edit share field groups. Manual
reads authenticate and explicitly scope every table to the user. Auth-blocked
and non-Manual pages contain no apparently usable writes. Loading, error,
not-found and archived states are explicit. Create links load on demand to avoid
incomplete prefetched form navigation; ID pages and dependent projections are
revalidated after writes.

### Relation audit

| Relation | Current storage | Create / remove / readback | Ownership / UI |
|---|---|---|---|
| Task → Project | `tasks.project_id` | canonical Task update, nullable unlink | active same-user target, goal alignment; form + Project task list |
| Task → Goal | `tasks.goal_id` | canonical Task update, nullable unlink | active same-user target, explicit direct/via-Project context |
| Project → Goal | `projects.goal_id` | canonical Project update, nullable unlink | active same-user target, no contradiction with direct Task goals |
| Task ↔ Skill | `task_skill_links` | existing idempotent link/unlink, both detail directions | owned endpoints; no automatic evidence |
| Resource ↔ Task / Project / Goal / Skill | `resource_relations` | existing link/unlink, both detail directions | same-user resource and typed target; context relation |
| Resource → Resource | `resource_relations` | existing link/unlink and source navigation | same-user target; self-link excluded from choices |
| Skill → Evidence | `skill_evidence` | explicit add/remove, reload and source link | existing source validation for Task/Project/Goal/Resource/Manual Note |
| Task → Steps | `task_steps` | create/edit/reorder/complete/reopen/soft archive | auth + Zod + active owned Task lookup + RLS; derived active-step count |

Archived context remains visible rather than silently disappearing from select
values. New links require active owned targets under the existing canonical
rules. Resource restore remains available; no unsupported restore lifecycle is
invented for Task, Project, Goal or Skill.

### Progress truth

- Task steps are the only new model: ordered task-local work, with completion
  independent of Task completion. Archived steps do not enter the denominator.
  Empty steps have no percentage. The existing labelled Next Action suffix is
  preserved, including a deliberately cleared context.
- Project “Task progress” counts linked active tasks; it is not Project completion.
- Goal states explicitly that no outcome-based progress is defined. Direct task
  and project activity is shown separately. No KR/milestone/log model is added.
- Skill shows real evidence and linked completed work. Portfolio no longer shows
  generic entity percentages, manufactured confidence or inferred planned
  practice-session counts. Resources remain knowledge/context.

### Current control inventory

| Control | Expected | Actual proof | Result |
|---|---|---|---|
| Portfolio entity views / scope / sort | filter actual overview, stable URL | focused test clicks each rendered href | PASS |
| Portfolio selected entity / Details | preview, then canonical ID page | list selection and real detail navigation | PASS |
| Five create links | dedicated form, no inline editor | all links from Portfolio, canonical creates and ID redirects | PASS |
| Four lists | search/clear, lifecycle, sort, ID navigation | scoped list checks, reload and history | PASS |
| Create/edit fields | validate, persist, toast, reload | all five types; optional context clearing and Task planning fields | PASS |
| Relation controls | real link/unlink, source navigation | Task/Project/Goal/Skill/Resource readback chains | PASS |
| Task steps | real work and derived progress | add, complete, reopen, remove and reload | PASS |
| Skill evidence | explicit source-backed evidence | create/remove, source navigation and reload | PASS |
| Lifecycle | archive/read-only history; supported restore | all five archives, Resource restore; Task complete/reopen | PASS |
| Validation/auth/not-found | no false write, no cross-user read | conflicting Goal, empty input, Empty/auth boundary and foreign Task | PASS |

Implementation evidence: **IMPLEMENTATION_PASS; USER ACCEPTANCE PENDING**.
`tests/e2e/r2-04-entity-workbench.spec.ts` passes all three focused production-runtime
proofs with authenticated canonical writes: five complete entity flows, relation
link/unlink, steps, source-backed evidence, lifecycle, validation/retry, foreign
ownership rejection, Empty/auth, history and Inbox → existing Task/Project IDs.
Forty-four complete screenshots cover Portfolio plus five create and five detail
pages at 3840×2160, 2560×1440, 1920×1080 and 390×844. Bounds assertions exclude
horizontal overflow and primary/rail overlap. Console/hydration checks pass.
Screenshots are local artifacts under `/tmp/life-os-r204-evidence`; the committed
test regenerates them. V5 Design-Taste review: PASS — shared restrained field
groups, readable main/relations hierarchy, bounded desktop text width, linear
mobile stacking. Existing global mobile navigation is retained; detail pages
use normal document scrolling. No artificial progress percentages are shown.

Validation: diff check, typecheck, lint, build and 15 focused Vitest tests pass
(Task steps/text, Skill schema, Task/Goal alignment). Browser tests run sequentially
with one worker against a production build to limit recovery-time RAM pressure.
The fresh Git-tree migration source includes only the required
`20260906184256_r2_04_task_steps.sql` extension to the existing migration chain.
Fresh disposable DB/API proof, DB lint and Security Advisors pass. Only after the
complete isolated proof was the canonical local Target migrated. Its 45 migration
versions equal Git; Target DB lint and Security Advisors pass. No remote DB.
Generated types preserve verified RPC nullability overrides and add only the
fresh-generated `task_steps` shape. RAM exhaustion remains an unresolved separate
operational follow-up below, not a completed capability or an additional active block.

# 6. Resources and Knowledge

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Resource create/read | `CONNECTED` | R2-04 dedicated /resources/new → /resources/[resourceId], canonical create/edit/reload, relations and archive/restore proof | Resources remains the knowledge area; accepted 2026-09-07 |
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
| Meal Planner week view / assignment | `CONNECTED` | R2-05: real week reads, 21 selectable slots, recipe filters/sort, draft reset and atomic Save Week using canonical meals | user acceptance pending |
| Meal Planner move / DnD | `CONNECTED` | same Meal id, date/type persistence, occupied blocking, cancellation, keyboard move, linked-task/DST synchronization and reload proof | no overwrite or implicit swap; existing multi-meal slots remain visible |
| Nutrition tracking / logging | `CONNECTED` | dialog logging/completion, today known estimates, weekly counts/adherence, recent details, Health weight projection and compact derived grocery signal | no fake period tabs or targets |
| Hydration logging | `NOT_STARTED` | no persisted N1 hydration entity/action exists; overview truthfully shows unavailable capture and no write control | separate model capability; no session-only Manual water buttons |
| Grocery Draft | `CONNECTED` | canonical Target N1 proof derives open Meal demand from persisted Recipe Ingredients and Meal/Recipe servings with reload-stable fractional scaling | no persistence/check-off/pantry |
| Manual nutrition estimate | `CONNECTED` | optional recipe JSON estimates editable in create/edit; only provided macros are shown, scaled by canonical servings | manually supplied estimate, not a nutrition engine |
| Meals Today | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Nutrient Balance | `CONNECTED` | R2-01 current evidence below and explicit USER ACCEPTED on 2026-09-06 | maintain accepted behavior |
| Persistent grocery items | `NOT_STARTED` | none | model later |
| Pantry/inventory | `NOT_STARTED` | none | model and receipt workflow later |
| Receipt OCR | `EXTERNAL_GATE` | none | privacy/provider decision |
| Unit conversion | `DECISION_REQUIRED` | free-text units | normalization/catalog decision |
| Portion/serving model | `CONNECTED` | versioned N1 `meals.servings` is validated, user-scoped and reload-proven on the canonical Target; it scales Recipe-serving-based Grocery demand plus recipe-scoped estimates deterministically | no nutrition value is inferred when its Recipe estimate is absent |
| Macro/calorie engine | `NOT_STARTED` | no reliable nutrition source | external data/model decision |
| Recipe detail route | `CONNECTED` | existing owned `/nutrition/recipes/[recipeId]` selects the canonical library record and allows persisted editing | reuse the library; no second editor |

## R2-05 – Nutrition Surface Completion (2026-09-07)

**Current scope:** Nutrition only. Health & Fitness (Mental Health, Habits,
Running, Strength) is USER ACCEPTED. Nutrition acceptance and final R2-05
acceptance remain PENDING. No R2-06, deployment or change to accepted surfaces.

### Pre-change interaction audit

Audited the Manual implementation at `68d1e03`, actions, repositories, migrations
and browser behavior before replacing the planner interaction layer.
`MEAL_PLANNER_DRAG_DROP = ABSENT` at baseline; visible planner controls were not
proof of canonical behavior.

| CONTROL | CURRENT IMPLEMENTATION at baseline | CANONICAL WRITE | RELOAD | RESULT |
|---|---|---|---|---|
| Previous / current / next week | session-local week shift over loaded fixtures | none | no selected-week read | gap |
| Day / Breakfast / Lunch / Dinner | Manual empty slots disabled; recipe-linked rows only | none | existing records only | partial |
| Recipe assignment | Manual suggestions disabled | none | absent | gap |
| Meal inspector | existing recipe/portions/note edit | authenticated meal update | existing N1 proof | preserve |
| Save Week / Reset | Demo/session draft controls | none in Manual | draft not persisted | gap |
| Suggestions search/filter | local list, no Manual assignment | none | canonical recipes loaded | partial |
| Grocery signal | real destination / derived open meals | read only | existing N1 projection | preserve |
| Scheduling/rescheduling | source-aware Meal↔Task repository/RPC | canonical source transaction | existing N1 proof | preserve |
| Drag / drop | no drag handlers, transfer identity or move action | none | absent | ABSENT |

The N1 model permits multiple Meals for the same day/type. There is no unique
slot constraint or existing swap contract. The new grid displays every existing
Meal. New assignments and moves reject occupied targets; they never erase or
swap an entity. Explicit removal requires a confirmation control and protects
completed Meals. Existing source-linked Tasks are archived atomically with
explicit removal of an open Meal.

### Current control inventory

The expected behavior is directly exercised by the focused tests below;
read-only status text and absent controls are identified explicitly.

| CONTROL | EXPECTED | ACTUAL | RESULT |
|---|---|---|---|
| Overview Today / Week / Month | real period projections only | fake tabs removed; today and actual week are simultaneously visible | PASS |
| Overview planner / grocery links | real owner surfaces | selected weekly planner / generated grocery | PASS |
| Log Meal / fields / save | compact dialog, canonical log | existing create action; completed-at capture by default; visible success and reload | PASS |
| Next Meal / Gegessen / Plan öffnen | complete today or navigate to selected slot | canonical completion plus exact day/type context | PASS |
| Recent Meals / close / Escape | inspect logged entry, restore focus | dialog with known estimates, canonical date, keyboard close | PASS |
| Weight / Health link | existing Health records / owner navigation | read-only existing weight history; no second weight store | PASS |
| Hydration | real data or honest absence | no N1 capture model; no fake water increment control | no write claimed |
| Planner previous / current / next week | server-loaded date range | actual week navigation; dirty draft blocks departure with feedback | PASS |
| All day/type slots | selectable 7×3 matrix | all 21 slots clicked; multiple existing Meals visible | PASS |
| Recipe search / filter / sort / assign | real library selection | name/tag/ingredient query, meal-type filter, name/recent/prep sort, selected-slot draft | PASS |
| Save Week / Reset | atomic assignments / discard without write | one bounded RPC transaction; reset remains local | PASS |
| Drag / drop | same entity moved and persisted | Monday breakfast → Tuesday lunch, DB id/count and reload | PASS |
| Occupied / cancelled / invalid drag | no overwrite or accidental mutation | occupied feedback, cancellation/Escape, external drag ignored, server rejection | PASS |
| Accessible move | keyboard/form alternative | day/type form uses the identical canonical move action | PASS |
| Inspector edit / schedule / remove / recipe | owned detail controls | title/recipe/portions/notes, real Calendar block, confirmed remove, existing detail route | PASS |
| Suggestions / grocery empty links | useful next step | library and generated grocery owner navigation | PASS |
| Recipes search / meal/tag/readiness filters / sort | functional browser | persisted definitions; no inferred recommendations | PASS |
| New Recipe / close / Escape | explicit creation, focus restoration | native dialog with existing authenticated create | PASS |
| Recipe title/summary/servings/prep/tags/instructions/macros | persist supplied values only | canonical recipe create/edit; absent estimates remain unknown | PASS |
| Ingredients add/edit/remove / archive | owned lifecycle, reload | existing ingredient CRUD and recipe archive actions | PASS |
| Grocery week navigation / planner / library links | canonical source resolution | previous/current/next week and real owner links | PASS |
| Grocery items / unresolved sources | read-only derived demand | name/unit/note aggregation, serving scaling, explicit missing-recipe/ingredient context | PASS |

### Backend and cross-surface truth

`20260907170000_r2_05_nutrition_planner_operations.sql` adds only the controlled
`apply_nutrition_plan` RPC. No table, planner copy, category taxonomy, external API
or new domain fields. Server Actions authenticate and Zod-validate; the RPC
independently verifies ownership, active recipes, operation bounds, stale source
versions and occupied targets. Per-user planner serialization plus the existing
source lock protects coupled writes. Errors roll back the entire week draft.
Normal clients use authenticated access; existing table RLS/grants remain intact.

Moves preserve Meal identity, recipe, portions and notes. Date-only Meals stay
date-only. Actual timed Meals retain their local wall time across DST and use the
established source-linked scheduling boundary to update the same Task. Browser
and database assertions cover Meal Plan → Overview → Dashboard → Grocery;
completion/logging → Overview → Dashboard/Today; Recipe Ingredients → planner
selection and Grocery. Recipe estimates are clearly labeled, partial values stay
unknown, and completed Meals no longer contribute to grocery demand.

### Composition and design review

Four scopes share V5 tokens, restrained amber accents and German surface labels.
Overview owns tracking/logging, planner owns weekly planning, recipes owns the
library, grocery owns derived shopping demand. No permanent Overview/Recipe
create form. Planner target context is capped; the weekly matrix takes the
remaining height. Recipe browser/detail and grocery draft/unresolved columns
fill the workspace. Growing lists scroll internally; mobile stacks normally.
Empty states stay compact at the top without demo leakage or invented metrics.

Design answers: **A YES** tracking/logging; **B YES** weekly planning;
**C YES** safe persistent DnD and accessible move; **D YES** recipe library;
**E YES** derived grocery; **F YES** no unmotivated naked bottom gaps at
1920×1080; **G YES** shared Life OS V5 composition. This is implementation review,
not user acceptance.

Proof sources: `tests/e2e/r2-05-nutrition-surface.spec.ts`,
`tests/e2e/r2-05-nutrition-layout.spec.ts`,
`tests/e2e/r2-05-nutrition-boundaries.spec.ts`,
`tests/e2e/n1-nutrition-loop.spec.ts`, and the retained Demo grocery regression.
The viewport matrix captures all four pages empty/populated at 1920×1080,
2560×1440, 3840×2160 and 390×844 plus selected-planner and create/log dialog screenshots (42 captures). Bounds tests
check body overflow, full workspace height, card overlap and modal viewport bounds. Console/hydration
checks collect actual browser errors and warnings without suppressions.

**Validation / implementation decision: IMPLEMENTATION_PASS.** Focused Nutrition
unit validation: 4 files / 6 tests green (including the existing assertion suites).
Focused Playwright: all 9 cases green across the latest scoped runs (3 current
surface controls/flows, 1 viewport matrix, 2 RPC/security, 1 N1 source-linked
Calendar loop, 2 retained Demo regressions). Earlier failures were corrected:
native-dialog focus restoration, Empty Grocery composition, and test synchronization
for completed ingredient writes/hydration before raw pointer coordinates. No
console/hydration errors remain in the checked Nutrition flows.

`git diff --check`, `pnpm typecheck`, `pnpm lint`, 11 runtime-hardening tests and
`pnpm build` pass via sequential `pnpm validate:local`. The complete fresh
migration chain plus local DB lint/security advisors pass in the disposable
runtime. The sole pending migration was then applied to canonical local Target
`life-os-sr104b-target`; Target migration list, DB lint and advisors pass. Effective
RPC privileges were checked: authenticated execute enabled, anon disabled,
SECURITY DEFINER with `search_path=pg_catalog`. No remote database action.

Full-surface, selected-inspector and dialog screenshots are retained in the ignored local
proof cache `node_modules/.cache/nutrition-proof/layout-final/`; tests regenerate
them with uniquely seeded disposable data. No screenshots, generated types from
Next, runtime files or unrelated existing work are part of the commit.
R2-05 USER ACCEPTANCE STATUS: PENDING.

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
| Mental Health overview | `CONNECTED` | R2-05: latest Mood, Sleep entry/history, seven-day context and owned Daily/Weekly Review history; current reload/projection proof | Journal remains owner navigation, no inferred associations |

# 9. Habits

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Habits surface role | `CONNECTED` | R2-05: selectable tracker, day/week/month values, compact edit/archive; no Create or slot surface | Dashboard retains creation/increment/undo |
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
| Strength session/sets | `CONNECTED` | R2-05 current plan/free-session path, exercise selection, real sets, completion rejection without sets, history and muscle projection after reload; existing transactional task sync retained | maintain weighted/unweighted semantics |
| Muscle map | `CONNECTED` | explicit exercise-muscle relations and log-derived set intensity/weighted volume with textual source labels; H1/H2 Target-Runtime Dashboard reload proof | maintain |
| Workout schedule source | `CONNECTED` | H1/H2 Target-Runtime proof schedules one canonical Running Plan Item and Strength Plan Task, projects each to Calendar/Today/Dashboard, rejects generic Task completion, then completes only from the real Run or Strength Session with set log | retain no-duplicate and completion-sync regressions |
| Health / Fitness primary viewport | `CONNECTED` | R2-05 composition pass: viewport-filling desktop defaults, internally scrolling growing lists, explicit depth disclosures; current 3840/2560/1920/390 proof below | Health & Fitness USER ACCEPTED on 2026-09-07; R2-05 remains active for Nutrition |

## R2-05 – One-page Health detail composition (2026-09-07)

**Acceptance update:** Health & Fitness is now USER ACCEPTED (2026-09-07).
The following pass report is historical implementation evidence. Its then-pending
Health acceptance and not-started Nutrition statements are superseded by the
current acceptance and Nutrition sections; R2-05 as a whole remains pending.

Current composition pass for `/health/mental`, `/health/habits`,
`/health/running`, `/health/strength` only. The user considers the existing
functions and shared design direction acceptable in principle; this is not
final surface acceptance. **R2-05 remains active. USER ACCEPTANCE STATUS:
PENDING. Nutrition is unchanged and has not been started.** Earlier evidence
below remains historical evidence; the desktop default layout now follows
this one-page contract.

- Scoped Health CSS uses the Calendar height-chain pattern as a reference:
  shell `100dvh` → frame/content `100%` → main with `min-height: 0` → flex
  Health page. Header, navigation and summary retain their natural height;
  the workspace fills the remainder. Selectors require the Health-detail
  marker; no Calendar, shared shell, Dashboard or Health overview code changes.
- Desktop page/grid gaps are 12px; summary cards share a minimum height. Text
  and forms keep readable maximum widths. Cards occupy their grid areas while
  content remains top-aligned, including empty messages. There is no body
  overflow hiding, dummy content or artificial textarea expansion.
- Mental: balanced 50/50 current/sleep and mood/reflection rows; seven compact
  Mood dates; a full-width horizontal context row fills the lower area.
- Habits: 44/56 list/selected analytics, compact management and window context
  in the bottom row. The list scrolls internally; day/week/month navigation
  remains visible and 30-day cells are compact. Mobile orders list, selected
  analytics, management, windows. No creation or slot control was added.
- Running: 62/38 history/trend and form/plans workspace. The two-column form
  remains immediately usable. Growing run and plan records scroll within
  their cards; the history and rail both reach the workspace bottom.
- Strength: 62/38 sessions/muscles and plans/library workspace. Growing
  sessions and library records scroll internally; muscles retain explicit
  mapped-set semantics. Existing creation and management disclosures remain.
- An explicitly opened edit/history disclosure enters normal-flow depth so
  its content stays reachable. Closing it restores the default workspace.
  Mobile uses natural vertical flow with no desktop height constraints.

**Browser proof.** `r2-05-health-composition.spec.ts` covers authenticated Manual
empty data at 1920×1080, 2560×1440, 3840×2160 and 390×844. It creates 8 Habits,
12 runs, 12 exercises and 8 sessions through existing UI controls, reloads,
scrolls the actual lists to their last records and asserts accessibility in
those regions. `support/health-workspace-proof.ts` measures body size, primary
bounds, pairwise card overlap and the workspace/card bottom edges. The same
assertions run on the populated viewport matrix in the existing R2-05
control/write/reload/projection test. No backend or fixture-only data path was
introduced for this composition pass.

Desktop results for all four pages: **BODY_SCROLL = NO;
PRIMARY_CONTENT_VISIBLE = YES; NO_OVERLAP = YES;
NO_HORIZONTAL_OVERFLOW = YES; NO_UNCOMPOSED_BOTTOM_VOID = YES.**
Growing lists use internal scroll; expanded editors are the documented depth
exception. Mobile has no horizontal overflow. The existing Health overview
navigation, full screenshots and no-overlap proof run unchanged.
The overview's full-page screenshot heights are unchanged from the before
evidence: 1489px at 1920, 1666px at 2560, 2386px at 3840 and 5070px on mobile.
Its existing lower Weight section remains in normal flow; no new overview
body-scroll regression is introduced. All detail desktop screenshots equal
their viewport height; Running at 1920 improves from 1181px to 1080px.

Before screenshots from commit `62907b7` are retained locally in ignored
`node_modules/.cache/r205-composition-before/`. After evidence is in
`node_modules/.cache/r205-composition-after/layout/`, `full-flow/` and `db/`, including
Playwright reports; current run output also lives in `test-results/`. No
screenshots, auth state or generated reports are staged.

Design review: **A YES** deliberate full-viewport use; **B YES** to the criterion
of no large uncomposed gaps (the question whether such gaps occur: NO);
**C YES** primary function dominates; **D YES** defaults fit 1920×1080 without
body scroll; **E YES** shared Life OS V5 language. Existing data semantics,
actions, repositories, schemas and muscle mappings are unchanged.

Validation uses separate sequential disposable browser runtimes for the large
layout-pressure proof and the existing full control proof, followed by the
runtime-hardened typecheck/lint/build gate. A combined preliminary run reached
the existing Next dev-memory restart threshold; splitting the proofs avoids
that accumulated runtime pressure without changing runtime configuration.
No migration or new backend validation requirement arises from this pass.
Final checks: `git diff --check`, `pnpm typecheck`, `pnpm lint`, 36 focused
Health/Habit/training tests, 11 runtime-hardening tests and `pnpm build` pass.
The layout-pressure test, full control/write/reload/projection test and
Manual/Empty/Auth-blocked/Demo boundary test pass. Browser console warnings,
errors and hydration checks are clean. The existing fresh-chain DB lint and
Security Advisor test also passes in a separate disposable runtime; an
earlier Advisor subprocess exit was resolved by that fresh run. No database
or runtime configuration changes were needed. This is **IMPLEMENTATION_PASS**
for the composition pass, not final R2-05 acceptance.

## R2-05 – Health & Fitness implementation evidence (2026-09-07)

Historical pass report; superseded for status by explicit Health & Fitness
USER ACCEPTED on 2026-09-07 and the current Nutrition work below.

Health & Fitness implementation pass; **R2-05 remains the sole Active Work
Block. USER ACCEPTANCE STATUS: PENDING.** Nutrition has not been started or
changed in this pass. R2-04 acceptance and all earlier evidence remain intact.

**Product and layout.** The four detail pages share V5 header, compact factual
summary, history workspace, secondary management, token-based borders/radius
and compact actions. User-facing copy on these Manual/Empty/Auth-blocked detail
surfaces is German, retaining established domain names. Mental contains latest
state, Sleep, Mood history, reflection and recent context; no duplicate Mood
logger, medical diagnosis or score. Existing Health overview panels, order and
daily schedule are retained. Canonical Mood/Sleep/reviews and training pattern
now populate those same panels; Mental heading navigates to its detail page.
Overview zero-value bars stay zero; its minimum-height container grows when
necessary so the existing Weight section cannot overlap the bottom panels.

**Metric definitions and limits.**

- Active Habits: non-archived habits. Today completed: active habits with a
  non-null current daily target whose active local-date log sum meets it; the
  denominator includes only target-bearing active habits.
- Active days (7 days): distinct log dates from today minus six through today.
  Month logs: active log records in the current calendar month, including logs
  of subsequently archived habits. The query reads 31 days so month-end is
  complete; the tracker displays the trailing 30 days.
- Selected Habit day/week/month means 1/7/30 local calendar dates. Values sum
  non-archived logs for that habit, retain its unit, and separate activity from
  current-target comparison. Target-less habits never claim completion. Days
  before creation are marked; historical targets/window versions do not exist.
  Accordingly no historical completion percentage is shown. Window summaries
  use current assignment and distinct active dates, never mixed-unit totals.
- Last logged is explicitly bounded to the displayed 30-day period. Archived
  habits remain selectable for history. Moving a habit chooses a free Dashboard
  slot server-side; the client cannot manage placement. The Dashboard Create
  action remains intact.
- Running uses active completed sessions. Today/7/30-day windows include today
  and exclude future dates; four consecutive seven-day distance bars show real
  distance, session count and duration. Pace is duration/distance, never stored.
  Manual time uses Europe/Berlin including DST; nonexistent wall times reject.
- Strength volume is repetitions × weight for weighted sets, with unweighted
  repetitions separate. Muscle counts/volume use only explicit mappings and
  sets in active in-progress/completed sessions. A mapped set can count toward
  multiple muscles; these group values must not be added. No activation or
  physiological intensity is inferred. Overview history counts completed
  sessions; plan/free classification uses the canonical nullable plan ID.
- Mental's day view uses the latest check-in per date from the existing bounded
  30-entry Mood read. Missing entries imply no health judgment. Sleep retains
  canonical date/duration/optional self-assessment/note. Overview average uses
  recorded nights within the last seven dates, with no invented missing nights.
  Reflection displays actual owned daily/weekly review records over 30 days;
  Journal is a navigation link, never a guessed association.

**Backend boundary.** Existing actions, authentication, Zod, scoped repositories,
RLS and transactional RPCs are reused. The existing nullable strength plan FK
supports free sessions; no schema or migration was needed. Habit selection is
preserved after mutation. Health writes expose shared inline/toast feedback;
Mental redirects carry a version for repeated saves. Review writes invalidate
Mental and Health alongside
existing projections. No new analytics table, schedule engine, API or provider.

**Control inventory / browser evidence.**
`tests/e2e/r2-05-health-fitness-surface.spec.ts` directly operates controls and
attaches `CONTROL / EXPECTED / ACTUAL / RESULT` JSON. Coverage includes:

| Controls | Expected / actual evidence | Result |
|---|---|---|
| Mental Mood, history, Sleep form, Review/Journal and shared navigation | Dashboard Mood → current/trend; Sleep save/history; canonical Review expansion; all owner links; reload | PASS |
| Habit selection, day/week/month, edit/archive | URL selection, log sums/units, occupied-window placement, retained archived history; Create/slot absent | PASS |
| Dashboard Habit increment/undo | Tracker and Health/Today projections change and survive reload | PASS |
| Running log/edit/archive, plan/unit CRUD, Calendar scheduling, planned completion | Saved actual runs, derived summary/history, source navigation and dependent projections | PASS |
| Strength library/multiple mapping, plan/structure CRUD, scheduling, plan/free sessions, sets/complete | Weighted/unweighted sets, visible error without sets, history/map and reload; archives preserve history | PASS |
| Shared detail/overview links and form disclosures | Real destination or expanded usable form; no dead prepared action | PASS |

Full screenshots cover `/health`, `/health/mental`, `/health/habits`,
`/health/running`, `/health/strength` at 3840×2160, 2560×1440, 1920×1080 and
390×844. Mobile also captures expanded forms and Empty/Auth-blocked guards.
Artifacts remain in ignored `test-results/` and the Playwright report, never
staged with user/auth data. No horizontal page overflow; real history may
scroll. Console/hydration checks are part of the flow. The existing global
mobile sidebar and the overview's Weight section remain unchanged.

V5 Design Review: A same application **YES**; B primary function clear **YES**;
C compact empty states **YES**; D no oversized forms/empty areas **YES**;
E Habits is tracker/analytics **YES**. Final acceptance remains the user's.

Validation: 3 focused isolated Playwright tests (flows, local DB, profile
boundaries); DB lint and security advisors both report no findings. Sequential
runtime-hardened local gate runs typecheck, lint, process-harness tests, focused
Habit/Running/Training/Overview unit tests (36 passing tests in seven files),
11 process-harness tests and production build, all green. `git diff --check`
is clean. No remote DB
operation and no migration added. Nutrition and final R2-05 acceptance remain
outside this delivered pass.

# 11. Coding and Agents (hidden / retained)

The technical evidence and gaps below describe retained implementations. They do
not schedule further suite development; active destinations are defined by the
consolidation disposition table above. Canonical Area/entity context stays active.

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Repository library | `CONNECTED` | A1 Target browser proof creates a Coding-Area canonical Project with manual repository URL, Core backlink and reload | RETAINED; GitHub owns repositories; no sync planned |
| GitHub link | `CONNECTED` | A1 Target browser proof persists and reloads the optional manual Project repository URL | RETAINED; existing URL stays; new links may use Resources |
| GitHub API | `EXTERNAL_GATE` | none | outside active scope; no API/sync planned by consolidation |
| Coding project log | `CONNECTED` | A1 Target browser proof creates a user-scoped `coding_sessions` record with canonical Project ownership and reload | automatic time tracking remains out of scope |
| Course/learning path | `UI_ONLY` | skills/education concepts | connect to skills/evidence |
| Agent session tracking | `NOT_STARTED` | no canonical `agent_sessions` model; Manual and Empty render an honest non-interactive Prepared state | deferred retained model; do not start AI1/provider work without a separate decision |
| Prompt library | `UI_ONLY` | page concepts | canonical resources/templates |
| Coding Knowledge | `UI_ONLY` | retained `/coding/knowledge` Prepared route skeleton | FOLDED INTO RESOURCES; no separate knowledge suite |
| Skill Map | `UI_ONLY` | retained Coding demo/empty Manual shell | ACTIVE PLANNED: R2-08 canonical graph under Portfolio → Skills |

# 12. Education (suite hidden / context retained)

The technical evidence and gaps below describe retained implementations. They do
not schedule further suite development; active destinations are defined by the
consolidation disposition table above. Canonical Area/entity context stays active.

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Scientific work | `CONNECTED_GAP` | A1 Target browser proof creates an Education-Area canonical Project with Core backlink, literature Resource and learning log after reload | dedicated scientific-work metadata remains intentionally deferred; no parallel model |
| Literature library | `CONNECTED_GAP` | Z1 disposable DB/API and browser proof atomically creates a canonical Resource plus reload-stable Project `source` link; active same-user Education Area and Project ownership are enforced | reading status and bibliographic metadata remain deferred until safely modeled |
| Learning log | `CONNECTED` | A1 Target browser proof creates a user-scoped `education_logs` record and reloads it in the canonical Project context | maintain aggregation and ownership proofs |
| Thesis/project relation | `CONNECTED` | A1.1B1 user-owned `education` Area with canonical Projects, Tasks, Deadlines and literature Resources | maintain same-user relation ownership |
| Writing best practices/resources | `CONNECTED_GAP` | A1.1B1 scoped Resources plus A1.1B2 Writing Logs with signed word deltas | dedicated prompt/template management remains separate depth |
| Education dashboard | `CONNECTED_GAP` | Manual Education workspace projects, task/deadline context, atomically linked literature and A1.1B2 Learning/Writing activity | richer scientific metadata remains deferred |

# 13. Work (suite hidden / context retained)

The technical evidence and gaps below describe retained implementations. They do
not schedule further suite development; active destinations are defined by the
consolidation disposition table above. Canonical Area/entity context stays active.

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Work projects/tasks | `CONNECTED` | A1 Target browser proof creates a user-owned Work-Area canonical Project and confirms its Core backlink after reload | maintain reload and same-user ownership proofs |
| Work log | `CONNECTED` | A1 Target browser proof creates a user-scoped `work_logs` record and reloads it in the Manual workspace | automatic time tracking and analytics remain out of scope |
| Work wiki | `CONNECTED_GAP` | Z1 disposable DB/API and browser proof atomically creates a canonical Work-Area `note` Resource plus its optional Work-Project `context` relation; active same-user Work Area and Project ownership are enforced | deeper Wiki features remain deferred; no parallel knowledge model |
| Meetings | `CONNECTED` | A1.1C2b user-scoped `work_meetings` with canonical Work-Project ownership, create/edit/soft archive and reload-stable historical Manual workspace | maintain meeting ownership and archive proofs |
| Decisions | `CONNECTED` | A1.1C2a user-scoped `work_decisions` with Work-Project ownership, status, create/edit/archive and reload-stable history | maintain ownership and status proofs |
| Follow-ups | `CONNECTED` | A1.1C2b canonical `tasks` linked by `work_meeting_followups`; Security-Invoker RPC atomically creates the owned Task and Meeting relation, while existing owned Tasks can link/unlink independently | no automatic Task completion or external sync |
| Work dashboard | `CONNECTED_GAP` | Manual Work workspace reads canonical Projects, Tasks/Deadlines, Resources, Logs, atomically created Wiki, Decisions, Meetings and Meeting Follow-ups | deeper Wiki and Work-dashboard depth remain deferred |

## R2-07 Journal audit and surface implementation — 2026-09-07

Historical R2-07 implementation snapshot; R2-09 now precedes remaining Journal acceptance. USER ACCEPTANCE STATUS: PENDING. R2-05 remains
explicitly accepted and closed. Journal means personal chronological reflection
and history; Notes belong to Resources, recurrence to Task/Calendar, structured
Daily/Weekly Reviews to their existing records. No new schema or relation engine.

| Capability | Current data source | Write | Reload / previous UI | Action in R2-07 |
|---|---|---|---|---|
| Entries | `journal_entries`, owned by `user_id` | existing create/update | persisted; old permanent form and separate active/archive cards | reuse entity; chronological list + selected reader |
| Date / timestamps | `entry_date`, `created_at`, `updated_at` | date editable; timestamps server-owned | date/creation order exists | stable date/creation/ID order; edits do not create history events |
| Title / body | nullable title, required body | existing Zod and repository | create/edit/soft archive connected | German compact dialogs, draft-preserving errors, global toast |
| Lifecycle | `archived_at` | existing soft archive, no UI restore/hard delete | historical archive read | explicit confirmation; read-only archive filter and deep links |
| Search / filter | title/body/date/archive | read only | absent in canonical Journal | URL `q`, `period`, `view`; reset; no fake classification |
| Detail | existing actions return `selected=<id>` | same entity | selection previously unused by canonical UI | stable `selected` + `panel=detail|edit`; full text and edit |
| Tags / Area / context | no canonical Journal fields; old Demo-only tags are fixtures | unsupported | no canonical reload path | absent controls; no new taxonomy |
| Project/Goal/Resource/Skill relations | no Journal FK or relation target in existing Core/Resource model | link/unlink unsupported | no readback or target ownership path | documented model gap; do not misuse resource IDs or invent relations |
| Today | `readTodayActivity` / `ActivitySources` has no Journal source | not applicable | no reliable current Journal event projection | no fake event; existing Today projection unchanged |
| Review linkage | no Journal/Review FK | unsupported | structured reviews remain independent | no duplicated Review fields or redesigned workflow |
| Counts | active `entry_date` values | derived only | no complete canonical overview | today, rolling seven calendar days, current month and distinct days; no future/archive count leakage |
| Read failure / pagination | user-scoped Journal query | no writes on read | old Life workspace also ensured an Area and swallowed read errors | focused paginated Journal reader; explicit load/auth failure instead of false empty state |

Relation audit: Project, Goal, Resource and Skill each have no Journal storage,
link/unlink/readback/ownership contract. Their absence is deliberately documented,
not reported as delivered. A future model decision is needed before these controls
can appear. Today Journal integration likewise remains outside this conditional
slice; no autosave/edit events are invented. Existing canonical Journal has no
recurrence, tags, mood/sentiment score or file ownership.

### R2-07 control inventory

| Control | Expected / actual implementation | Proof |
|---|---|---|
| Neuer Eintrag (header / zero state) | date/body and optional title dialog; existing canonical create | PASS |
| Search + Anwenden + Zurücksetzen | title/body filter with real URL/reset state | PASS |
| Zeitraum / Ansicht | all/today/last 7 days/month; active/archive | PASS |
| Entry select | stable owned `selected` query; preview updates | PASS |
| Details öffnen / Schließen / Escape | full reader, deep-link reload, modal focus | PASS |
| Bearbeiten / Speichern / Abbrechen / Schließen | same entity update; no lost draft on validation/error | PASS |
| Archivieren / confirmation / cancel | soft archive only; retained text and ID | PASS |
| Back / Forward / Reload | URL search/filter/selection/panel restored | PASS |
| Tags/context/relations | no unsupported controls rendered | model gap audited |
| Demo/Empty Settings / auth-blocked Settings | read-only examples or honest unavailable state | PASS |
| Load-error retry | refresh the same read; no empty-data claim | PASS |

Current browser evidence: `tests/e2e/r2-07-journal-surface.spec.ts` passes both
focused flows against a fresh disposable local migration chain with technical
users. Canonical create/edit/archive and optional title, toast/error feedback,
reload/deep links, search, all period/archive filters, selection, Back/Forward,
modal close/cancel/Escape, profile Settings links and read-error retry are proven.
A second owner cannot read or update the entry, including a tampered form ID.
Journal reads do not create a Life Area. No browser console/hydration warnings
or runtime exceptions were observed. Local DB lint and Security Advisors report
no schema errors or security findings. No new migration or remote action.

Responsive proof captures full empty, editor and populated screenshots at
1920×1080, 2560×1440, 3840×2160 and 390×844. Desktop has no body overflow or
panel overlap; populated history and reader fill the remaining viewport with
internal scrolling. Empty/no-selection panels retain compact content height.
Mobile is stacked, without horizontal overflow; long lists/readers are bounded
at 65dvh so detail/actions stay reachable. Large-list proof uses 46 real entries.
Screenshots/traces remain local generated test artifacts, not committed data.

The combined Journal/navigation run passed all seven tests; after the focused
layout/Escape refinements the two Journal flows passed again. The five active
navigation proofs include retained Coding/Education/Work/Inventory routes.
Journal/Today unit validation: 20 tests passed across two files; title/body search,
date/month/week boundaries, archive/future exclusions, sort stability and the
existing Today projection are covered. Today remains unchanged and no fabricated
Journal event is shown.

V5 Design-Taste review:

- Was passt zu V5: calm matte surfaces, existing tokens/native dialog, restrained
  purple selection, dominant chronology, real counts and German primary copy.
- Was verletzt V5: initial oversized empty panels and excessive mobile list
  length were corrected before the final proof; no remaining material violation.
- Konkrete Fixes: compact empty panels, bounded mobile scroll, explicit textarea
  label and Journal-scoped cancel handling until the URL transition commits.
- Acceptance Decision: PASS for the implementation design; no user acceptance.

Final checks: `git diff --check`, `pnpm typecheck`, and `pnpm build` PASS
(57 generated pages). `pnpm lint --ignore-pattern 'playwright-report/**'` PASS;
the generated Playwright HTML/trace bundle is excluded because plain `eslint .`
otherwise lints its bundled third-party JavaScript. No application source is
excluded. Required heavy checks ran sequentially in an isolated source copy
without protected environment files or the unrelated unstaged test changes.
Completion Gate: PASS for the delivered canonical scope, reported as
IMPLEMENTATION_PASS. Unsupported model capabilities above are not implemented
or represented as connected; no user acceptance is inferred.
R2-07 remains pending user acceptance and resumes after R2-09.

# 14. Life and Personal

| Capability | Status | Canonical source / current evidence | Gap / next action |
|---|---|---|---|
| Journal | `CONNECTED` | R2-07 user-scoped `journal_entries`; complete existing lifecycle, German history/reader/dialog workspace, URL search/filter/detail, real counts and current browser/reload proof | USER ACCEPTANCE PENDING; canonical tags/context/relations and Today source absent; Mood, Health and Reviews remain separate |
| Notes | `CONNECTED` | A1.1D1 canonical Life-Area `resources` (`note`) with create/edit/archive/restore, reload-stable active/history views and visible existing Project/Goal/Task relations or honest empty state | relation creation remains on the established Resource surfaces; no parallel Notes platform |
| Entertainment collection | `CONNECTED` | A1.1D2 canonical user-scoped `entertainment_items`; direct routes and complete lifecycle remain retained | `DEFERRED_HIDDEN` boundary is applied to Sidebar, Life overview and active cross-links by C1.1-01 |
| Inventory | `CONNECTED` | A1 Target browser proof creates and edits user-scoped `inventory_items`, then reloads the active item | external merchants, guarantees, insurance and accounting remain unimplemented |
| Wishlist | `CONNECTED` | A1 Target browser proof creates a user-scoped `wishlist_items` record and reloads its acquired lifecycle state | external price tracking, ordering and product APIs remain external gates |
| Purchase Decisions | `CONNECTED` | A1 Target browser proof creates a historical `purchase_decisions` record, then proves the atomic idempotent Wishlist→Inventory RPC by its single Inventory projection after reload | no payment, merchant integration or automated purchase action |
| Personal dashboard | `UI_ONLY` | retained legacy area shell | HIDDEN; no active suite completion obligation |

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
| Local runtime memory budget | `CONNECTED_GAP` | Measured build-worker reduction, scoped process cleanup, direct Playwright wrapper, disk-backed test temp files, completed Idle baseline and ten-minute normal navigation; validation evidence below | Artificial rapid-navigation stress can still reach Next's configured heap threshold; system `updatedb` pressure remains outside repository fixes. R2-04 stays ACTIVE/PENDING |
| Local backup create | `CONNECTED` | ops script | maintain |
| Restore smoke | `CONNECTED` | Z1 guarded canonical Target backup restores schema, migration history and aggregate canonical-table data into an isolated disposable container; Target preservation is structurally checked before/after | logical local restore-smoke only; no cloud, remote or production restore claim |
| Private remote | `EXTERNAL_GATE` | intentionally not active | explicit user decision later |
| Public SaaS | `NOT_STARTED` | not a goal | do not plan by default |


## Local runtime memory hardening evidence — 2026-09-07

This is a bounded operational pass, not a new product block. R2-04 remains
ACTIVE with USER ACCEPTANCE PENDING. No domain UI, schema or migration changes.

- The kernel recorded a real global OOM at 2026-09-06 21:19:35 local time.
  Two Next processes held about 11.9 GiB combined resident + swapped memory;
  the killed server belonged to WebStorm's process tree. Swap was effectively
  exhausted (136 KiB free). This proves pressure, not a domain-data memory leak.
- At initial observation the user-owned Next process held 3.82 GiB RSS and
  0.49 GiB swap. The two pre-existing Supabase projects were Target and
  `life-os-app`, with approximately 600.2 and 509.7 MiB cache-adjusted container
  usage respectively. Their purposes are distinct; neither was classified as
  an orphan or stopped. Legacy was present but not running.
- Linux `/proc/swaps` identifies `/dev/zram0`, not disk swap. A later observed
  29.4 GiB of logical swap occupied about 9.6 GiB physical RAM. Existing IDE and
  user-browser working sets remain material background contributors and were
  observed without signalling them.
- The old Dev wrapper survives only as its children after parent-directed
  SIGTERM: the test server remains reachable. The old disposable runner leaves
  13 owned Node/browser processes and 12 disposable containers after SIGTERM,
  including a roughly 4.7 GiB RSS Next server. These exact test-owned orphans
  were then safely stopped; no volume was deleted.
- Next 16.2.2's installed `cli/next-dev.js` assigns 50% of system memory as V8
  old-space unless an explicit value exists. On this workstation that permits
  almost 16 GiB per server. The shared Node budget and process ownership address
  this multiplier; they do not claim to eliminate all native/compiler allocation.
- An initial 2048 MiB candidate was rejected: accelerated navigation triggered
  Next's memory-threshold restart and a navigation timeout. An unbounded Webpack
  comparison completed ten minutes but still held a large working set; no
  bundler switch is shipped. The 4096 MiB candidate also restarted once in a
  607.34 s accelerated run (282 rounds / 3,666 full navigations and reloads).
  That run proves scoped SIGTERM cleanup, not uninterrupted endurance. A
  separate equal-duration before/after run uses five-second reading pauses;
  diagnostic forced GC is excluded from acceptance measurements.
- Chromium failed after 352.82 s of accelerated navigation with font-data
  temporary-file `ENOSPC`. `/tmp` is a 16 GiB tmpfs. A subsequent owned Chromium
  process held 5.6 GiB of open temporary backing files; placing those files in
  the private on-disk test cache allowed the 607.34 s run to finish. This avoids
  RAM-backed file pressure; it does not claim to fix Chromium's file growth.
  Browser closure releases its descriptors. User browser profiles are untouched.
- Two other host-visible Next servers (PIDs 3513 and 3850) were matched by
  `docker top` to the existing Target/app Studio containers. These are expected
  services, not duplicate Life-OS development servers.
- Controlled build A/B/A/B uses identical source/dependencies, warm compilation
  cache and default versus `experimental.cpus: 2`. Peak process-tree RSS was
  2.864/2.863 GiB with 15 workers versus 1.902/1.923 GiB with two; durations were
  11.09/11.74 s versus 11.46/11.43 s. All 57 routes build correctly. Live process
  maxima fall from 18 to 5. The supported experimental option is retained.

Measurements sample owned process trees and host memory at 200 ms intervals;
per-process high-water observations are sampled peaks, not kernel accounting of
an instantaneous maximum. PSS/swap observations supplement RSS. Local raw data
and the measurement harness are under `/tmp/life-os-memory-proof`. No environment
values or authentication state are part of committed evidence. Host-wide swap
changes are not attributed solely to the measured command because protected user
processes continue running.

After the user stopped the pre-existing Dev server, four Idle samples over 15
seconds measured 30.996 GiB total RAM, 11.004–11.067 GiB available,
19.929–19.991 GiB used and 13.971–13.994 GiB system swap. Life-OS Dev/Next
processes, owned test browsers and disposable containers were all zero. One
WebStorm JavaScript-service Node process and four Codex-tooling Node processes
remained in the repository working directory; none was an application runtime.
The two host-visible Next processes remained the already classified Supabase
Studio containers. Target was healthy with 11 containers and 405.564 MiB RAM;
the separately existing `life-os-app` stack had 11 containers and 475.432 MiB.
Legacy remained present and stopped. No `updatedb` process was present during
the Idle samples.

Controlled normal-navigation baseline: 628.60 s, peak owned process-tree RSS
2.739 GiB, 13 simultaneous processes. Next RSS + process swap medians in
minutes 3–10 stayed in the 1.533–1.597 GiB band; the first-minute maximum was
1.678 GiB. The old wrapper still left its server reachable after SIGTERM;
the external measurement harness cleaned only that explicitly owned group.
The canonical Target remained running. These no-auth navigation probes cover
Demo/read/auth-blocked routes; real authenticated writes are separately proven
in the disposable browser lifecycle test.

Normal-navigation after-run: 627.53 s, 2.802 GiB peak owned RSS, 12 simultaneous
processes, no Next restart or request failure. Next RSS + swap medians for
minutes 5–10 were 1.633/1.637/1.660/1.688/1.634/1.635 GiB: observed
GROWS THEN PLATEAUS, not monotonic growth over the measured window. SIGINT left
no live owned processes and the server was no longer reachable. A duplicate
managed dev start was refused with `LIFE_OS_DEV_ALREADY_RUNNING`. No normal-dev
RAM reduction is claimed: RSS is sensitive to ongoing background swapping.

The first new E2E-abort candidate exposed a surviving pnpm WebServer group
(five owned Node processes, including 2.1 GiB RSS Next), despite browser and
Docker cleanup. It was rejected and its verified PID/start-time group stopped.
Playwright now execs the managed wrapper directly. The repeated real SIGTERM
proof exited 143 after 79.54 s with zero owned process/browser/container
orphans; peak Node/browser RSS was 3.337 GiB and separately sampled disposable
Docker usage peaked at 1,837.528 MiB. No volumes were deleted.

A separate root-owned `updatedb` process (PID 226506, PPID 1) appeared during
later measurements. One snapshot recorded 2,049,256 KiB RSS plus 8,705,236 KiB
swap. Zram physical allocation reached 14,800,949,248 bytes. After that foreign
process ended by itself, available RAM rose from roughly 5 to 11.4 GiB and
logical swap fell by about 9 GiB. This is strong evidence of additional system
indexing pressure; it is not a Life-OS code saving and its underlying cause was
not changed in this repository pass. It is not present in the inspected
historical OOM excerpt, so no historical attribution to updatedb is claimed.

Measured comparison (GiB, sampled RSS sum of the owned command/browser tree;
Docker reported separately; swap cells are whole-host start → end observations):

| Scenario | Before RSS peak | After RSS peak | Before host swap | After host swap | Peak processes before → after | Seconds before → after | Result |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| Pristine Idle: no Next/test browser | no valid pre-fix sample | 19.958 system used; 0 app-runtime RSS | no valid pre-fix sample | 13.984 mean | unavailable → 0 app/test processes | 15 s after stabilization | PASS; 11.038 GiB mean available |
| Dev warmup, first 70 s | 2.739 | 2.802 | 23.547 → 19.994 | 21.031 → 21.764 | 13 → 12 | 70 → 70 | No RAM saving claimed; normal flow works |
| Repeated navigation, seconds 70–620 | 2.182 | 2.726 | 19.994 → 22.536 | 21.764 → 21.728 | 13 → 12 | 550 → 550 | No restart; RSS + swap settles in observed band |
| Warm build A/B | 2.864 | 1.901 | 22.781 → 22.661 | 22.617 → 22.648 | 18 → 5 | 11.09 → 11.46 | About 33% lower process RSS peak; repeat A/B confirms |
| Focused E2E, cold compiler cache | 3.360 | 3.195 | 20.869 → 23.757 | 26.397 → 29.362 | 15 → 15 | 58.16 → 67.25 | Real create/reload and console clean; own cleanup clean |
| Sequential validation | 2.737 | 2.145 | 29.297 → 30.945 | 21.390 → 20.830 | 19 → 7 | 31.51 → 32.52 | Both pass; after adds 11 runtime tests |

The final focused E2E separately sampled disposable container usage at
1,834.811 MiB peak versus 1,917.359 MiB before. These are separate sampled
peaks, not a synchronized process-plus-Docker total. Docker includes migration
startup. The final main-repository E2E leaves no processes, containers, compiler
outputs or temporary type-config files; tracked tsconfig and lockfile remain
unchanged. A rejected abort candidate had regenerated output after cleanup;
that verified own residue was removed after stopping its exact orphan group.
ESLint ignores generated E2E output like ordinary `.next`, not application code.

The sequence comparison overlaps the end of updatedb; whole-host swap changes
cannot be attributed to runtime scripts. Per-step times, available memory,
swap and process samples are in the raw JSON. The controlled build A/B/A/B,
which predates that background indexer, is the evidence for worker savings.
Its 15 page-data workers sampled 114.7–171.3 MiB RSS individually; the two-worker
comparison sampled 164.2 MiB each. The roughly 1 GiB TypeScript worker belongs
to a separate build phase and is not counted as a page-data worker.

Final validation: `git diff --check`, `pnpm validate:local` (typecheck, lint,
11 Node runtime tests, 15 focused Vitest tests and `pnpm build`) PASS. The build
produces all 57 routes with two workers. Final real Playwright normal and
SIGTERM-abort flows PASS their intended assertions; abort returns 143 by design.
`pnpm runtime:target:check` PASS. All measured PID/start-time identities are
gone; no new kernel OOM was found in the accessible Sept-7 journal. Target and
app retain their original 11-container groups; final cache-adjusted observations
were 352.715 and 444.347 MiB. No Target writes/migrations, new migration files,
volume deletions or foreign-process termination were performed. Existing Git
migrations ran only inside the required disposable test stacks.

The realistic 627.53-second navigation run completed ten rounds across twelve
R2 surfaces plus reloads without restart or request failure and plateaued in
the measured window. The rejected 607.34-second stress case performed 282
rounds, or 3,666 full navigations/reloads, and alone reached Next's configured
threshold. It is classified as an artificial stress limit and retained as a
remaining risk, not evidence of instability under measured normal usage.

Overall runtime-hardening gate: IMPLEMENTATION_PASS. Idle, normal use, build,
normal/aborted Playwright, sequential validation, Target health and orphan
cleanup are measured. Product R2-04 acceptance/status is unchanged.

Runtime tests cover success/failure, SIGINT/SIGTERM descendants, duplicate locks,
loss of invoking parent, canonical identity checks, owned on-disk temp cleanup,
partial startup and visible cleanup failure with retained recovery workdir.
The focused Playwright spec is `tests/e2e/runtime-lifecycle.spec.ts`, with real disposable create/reload
and a deliberately interruptible mode for the external lifecycle probe.

Supported mechanisms were verified against installed Next 16.2.2 types/source,
[Next's versioned configuration source](https://github.com/vercel/next.js/blob/v16.2.2/packages/next/src/server/config-shared.ts),
[Node IPC documentation](https://nodejs.org/docs/latest-v22.x/api/net.html#ipc-support),
[Playwright configuration](https://playwright.dev/docs/api/class-testconfig) and
the installed Supabase CLI `stop --help`. Locks use Linux abstract Unix sockets,
which disappear with their owner instead of leaving stale lock files.

## Update Rule

The user/Codex prompt selects a `ROADMAP.md` block ID. Update this registry after each completed material capability so it remains the sole dynamic documentation source for implementation status.
