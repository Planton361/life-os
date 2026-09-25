# DATA_MODEL.md

Stand: 2026-08-22
Status: Active
Zweck: operative Datenmodellregeln.
Quelle der Wahrheit: Diese Datei.
Gilt für: Tabellen, Entities, Relations, Statuswerte.
Nicht gilt für: reine UI-Widgets.

## Durable work-graph / knowledge ownership data decision

Product Target v0.4 is accepted. Life OS / PostgreSQL remains canonical for
operational context: Projects, Goals, Skills, Milestones, Tasks, Dependencies,
Planning and Relations. `Resource` remains the canonical Life-OS reference /
Work-Artifact identity. Obsidian owns long-form Knowledge Content and Notes.
For a bound Note, `life_os_id` is stable identity and a vault-relative path is
only a locator; rename/move never changes identity. No watcher, sync,
write-back or personal Vault access is implied.

Project, Goal and Skill remain separate categories. Their shared planning
shape is Higher-order entity → domain milestones → Tasks → progress, but their
Milestone, Outcome, Evidence and Target semantics stay domain-specific. Only
Task-to-Task Dependencies create V1 execution READY/BLOCKED state. The
following target model is accepted but is not a claim that its future structures
already exist in the current schema.

Future write-back requires its own accepted security/conflict contract and explicit command semantics. Current work status and delivery sequence are not data-model truth; read them from GitHub Project #3/Issues and `ROADMAP.md`.

## Grundsatz

```text
UI zeigt Views.
Datenmodell beschreibt Entitäten und Beziehungen.
```

## Canonical Data Core

Life OS nutzt einen Canonical Data Core als Source-of-Truth-Schicht. Globale Entities besitzen eine kanonische Quelle und können in Dashboard, Today, Calendar, Portfolio oder Area-Unterseiten erscheinen, ohne kopiert zu werden.

Source-of-Truth-Regeln:

- Area-Unterseiten sind Views, keine Datensilos.
- Portfolio speichert Tasks, Projects, Goals und Skills nicht als Kopien.
- Resources ist die zentrale kanonische Resource-Entity.
- Notes, Wiki, Literature, Coding Resources und Work Wiki lesen, filtern oder verlinken zentrale Daten.
- Calendar liest ausführbare Task Occurrences und deren Schedule Blocks. Freie Events erhalten erst nach einer eigenen Modellentscheidung eine separate Quelle.
- Today speichert Review-/Daily-Protocol-Daten, aber keine Kopien von Tasks, Meals, Workouts, Mood oder Sleep.
- Review Records bleiben fachlich erhalten, aber nicht als Sidebar-Navigation.
- Analytics und Reports sind abgeleitet und keine zweite Rohdatenquelle.
- Archive ist Lifecycle-Status oder Soft Archive, keine Kopie.

## Binding Entity Semantics

### Task

Ein Task ist eine dauerhafte, ausführbare Verpflichtung mit genau einem Lifecycle. Er beschreibt, **was** getan werden soll; `planned_date` beschreibt eine Tagesabsicht, Scheduling beschreibt **wann** gearbeitet wird. Ein Task kann optional zu einem Project, direkt zu einem Goal, zu mehreren Skills und zu mehreren Resources in Beziehung stehen.

Task-Arbeitsschritte liegen in `task_steps`: `user_id`, `task_id`, Titel,
Reihenfolge, `completed_at`, `archived_at` und Erstellungs-/Änderungszeitpunkt.
Sie besitzen keine eigene Terminplanung und keinen parallelen Task-Lifecycle.
Fortschritt = erledigte aktive Schritte / alle aktiven Schritte; ohne aktive
Schritte existiert keine Prozentzahl. Entfernen ist Soft Archive. Aktionen
prüfen den aktiven, gleichbenutzereigenen Parent; RLS schützt Lesen und Writes
zusätzlich. Ein Schrittabschluss schließt den Task niemals automatisch ab.

### Project

Ein Project ist ein endliches, mehrschrittiges Ergebnis. Es bündelt Tasks, besitzt aber weder deren Completion noch deren Zeitplanung. Ein Project kann höchstens ein primäres Goal voranbringen. Area ist Kontext, nicht Ownership.

### Goal

Ein Goal ist ein gewünschtes Ergebnis mit Horizont und optionalem Zieltermin. Es wird durch Projects, direkte Tasks, Skill-Evidence und Resources unterstützt. Kanonische Zielerreichung benötigt explizite Outcome Criteria/Measures; Task-Completion ist unterstützender Kontext und kein automatischer Achievement-Nachweis. Ohne belastbare Kriterien gibt es keine künstliche Prozentzahl.

Der USER ACCEPTED #39 Target ordnet Goal-Planung als eine einzige Journey:
Outcome Criteria / Definition of Done sind der finale Akzeptanzvertrag; Goal
Milestones sind geordnete Zwischenresultate; Tasks sind die ausführbare Arbeit.
In der primären unarchivierten Goal Journey gibt es genau einen Current/active
Milestone. Future und completed Milestones bleiben geordnet sichtbar, erzeugen
aber keine Execution Dependency. Parallelität liegt innerhalb des Current
Milestone über Projects/Tasks; nur Task Dependencies erzeugen READY/BLOCKED.

Task Completion setzt weder Milestone- noch Goal-Status automatisch. Vollständig
erledigte geplante Arbeit kann einen Milestone review-ready machen; das
Zwischenergebnis wird explizit bestätigt. Nach dem finalen Milestone wird das Goal
explizit gegen seine Outcome Criteria geprüft. Diese Target-Semantik ist eine
bindende Produkt-/Datenmodellentscheidung; ihre DB-/Command-Enforcement-Details
sind erst mit dem separaten Delivery-Contract implementiert.

### Skill

Ein Skill ist eine persönliche Fähigkeit, die entwickelt, angewendet oder nachgewiesen wird. Tasks können mehrere Skills üben oder anwenden. Skill-Fortschritt entsteht aus expliziter Evidence; die bloße Task-Verknüpfung ist Kontext und kein automatischer Kompetenznachweis.

### Resource

Eine Resource ist wiederverwendbares Wissen, Kontext oder Evidence. Sie kann viele Tasks, Projects, Goals, Skills oder andere Resources unterstützen. Resources sind nicht ausführbar und besitzen keine Planungs- oder Completion-Semantik.

Work Artifact is an explicit Project use of a canonical Resource, not a global
Resource classification or a new entity. `resources.title`, `summary` (Domain
`body`), `type`, `url` and `archived_at` remain its identity/reference/lifecycle.

`resource_relations.project_role`: `reference` (default, including every existing
row), `additional_artifact`, `primary_artifact`. Non-Project targets may only use
`reference` here; their existing relation_type retains its context semantics.
`source`, `context`, `supports`, `evidence`, `decision`, `related` keep their
established meanings. None is reinterpreted as Artifact or Primary. Existing
Project repository URL metadata is retained and never automatically promoted.

Partial unique indexes enforce at most one Primary per Project and one artifact
role per Project/Resource pair. Legacy multiple relation_type edges stay intact.
The Project projection groups by Resource ID: an explicit artifact edge takes
precedence over supporting edges, so the same Resource is not displayed twice.
The Invoker RPC `set_project_resource_role` locks the owned Project (active for
assignment; archived Projects also allow explicit removal),
checks/locks the owned Resource, reuses an existing edge and atomically demotes
old Primary to Additional before promotion. Repeating a choice is idempotent.
Remove explicitly removes the Project/Resource association's edges only; Resource
and its other contexts remain. Role `reference` demotes an artifact without
changing its relation_type. Constraints and a trigger guard direct API writes.

Archived Resources retain historical roles but are excluded from active Primary
presentation. No replacement is inferred. A user may explicitly select a new
Primary; the archived old Resource remains Additional history. Restore does not
promote a Resource whose role has since changed. New promotions require active
owned endpoints. Resource archive does not archive/delete the Project.
Non-web filesystem locations may remain descriptive reference text; only HTTP(S)
URLs are offered as browser-opening links. External contents are never copied.

### Routine Template

Ein Routine Template ist eine versionierte Wiederholungsregel mit Defaults für neue Task Occurrences. Es ist kein Task, kein Calendar Block und wird nie selbst abgeschlossen. Eine Änderung wirkt standardmäßig nur auf zukünftig erzeugte Occurrences; bereits erzeugte Tasks bleiben historische Wahrheit.

### Task Occurrence

Eine Task Occurrence ist die konkrete ausführbare Einheit, die Today, Calendar und Completion verwenden. Im aktuellen Modell ist ein einmaliger Task zugleich seine eine Occurrence. Eine wiederkehrende Occurrence ist als eigener `tasks`-Datensatz mit `generated_from_template_id` und `instance_date` materialisiert. Diese bestehende Repräsentation bleibt für C1 verbindlich; keine parallele Occurrence-Tabelle ohne spätere Modellentscheidung.

### Schedule Block

Ein Schedule Block ist eine Zeitallokation für genau eine ausführbare Task Occurrence. Im aktuellen Core wird er durch `tasks.scheduled_start_at` plus `duration_minutes` repräsentiert. Er besitzt weder eigene Completion noch kopierte Task-/Domain-Felder. Mehrfachblöcke pro Occurrence oder freie Events gehören in C2 und erfordern eine explizite Modellentscheidung.

### Domain Record

Ein Domain Record ist ein fachlicher Health-, Nutrition- oder Fitness-Datensatz, zum Beispiel Meal, Running Plan Item, Strength Plan oder Review. Sein Fachbereich besitzt Inhalt und Fachstatus. Soll er im Tagesablauf ausgeführt werden, verweist `schedule_source_links` idempotent auf eine kanonische Task Occurrence. Scheduling verschiebt nicht die Domain-Ownership; gekoppelte Completion muss atomar oder über ein kontrolliertes RPC synchronisiert werden.

## Binding Relationships and Invariants

| From | Relationship | To | Rule |
|---|---|---|---|
| Task | optional many-to-one | Project | Task bleibt eigenständig ausführbar |
| Project | optional many-to-one | Goal | höchstens ein primäres Goal |
| Task | optional many-to-one | Goal | direkte Ausrichtung; wenn sein Project ein Goal besitzt, darf sie nicht widersprechen |
| Task | many-to-many | Skill | Kontext für Übung/Anwendung; keine automatische Evidence |
| Resource | many-to-many typed relation | Task / Project / Goal / Skill / Resource | gleicher User, expliziter Relationstyp |
| Skill Evidence | many-to-one | Skill | Quelle kann Task, Project, Goal, Resource oder Manual Note sein und muss demselben User gehören |
| Routine Template | one-to-many generation | Task Occurrence | `(template, instance_date)` ist idempotent |
| Task Occurrence | zero-or-one current block | Schedule Block | aktuelle Repräsentation auf dem Task; C2 darf sie nur durch bewusste Migration erweitern |
| Domain Record | zero-or-one executable link per source | Task Occurrence | `schedule_source_links` ist die Brücke, nicht eine Kopie |

User-spezifische Relationsziele müssen serverseitig auf Same-User-Ownership geprüft werden. Archivierte Targets dürfen nicht neu verknüpft werden. Das Archivieren einer Entity löscht keine historische Evidence oder Occurrence.

## Entity-Gruppen

### established

- profiles
- areas
- inbox_items
- tasks
- projects
- goals
- skills
- resources
- daily_logs and daily_log_tasks
- review_records
- recurring_task_templates and generated task instances
- resource_relations and skill_evidence
- mood, sleep, weight, habits and habit logs
- running and strength plans/sessions
- recipes, ingredients and meals
- schedule_source_links
- work/education/life records
- inventory_items, wishlist_items and purchase_decisions

### active sequence depth

- canonical Task / Project / Goal / Skill / Resource graph integrity
- week-first schedule and planning semantics
- planned-vs-done daily protocol
- knowledge/evidence depth
- Health/Fitness and Nutrition occurrence linkage depth
- Work/Education/Coding/Inventory projections

### deferred and retained

- grocery_items
- entertainment_items
- literature_items
- reports
- activity_events
- relationship_edges
- challenges
- rewards
- shop_items
- imports
- ai_summaries
- agent_sessions

Diese Gruppen sind fachliche Priorisierung, keine SQL-Spezifikation und keine Migrationsanweisung.

## Pflichtfelder

- `user_id` für jede nutzerspezifische Tabelle
- `created_at`
- `updated_at`
- kontrollierte Statuswerte
- Soft-Archive-Feld bei zentralen Entities
- RLS für alle nutzerspezifischen Tabellen ab Phase 3

## KI-Felder bei generierten Inhalten

- `source`
- `generated_by`
- `review_needed`
- `linked_context`
- `confidence` optional

## Privacy-Klassen

Konzeptionelle Privacy-Level:

- `standard_private`: normale private Life-OS-Daten.
- `personal_sensitive`: Journal, Notes, persönliche Reflexionen und ähnliche sensible Inhalte.
- `health_sensitive`: Mental Health, Sleep, Recovery, Health- und Fitnessdaten.
- `work_restricted`: Work Logs, Meetings, Work Wiki und potenziell vertrauliche Arbeitskontexte.
- `system_restricted`: Auth, Security, Integrationen, Tokens, Audit- und Admin-nahe Daten.
- `shareable`: bewusst freigegebene oder exportierbare Inhalte.

`privacy_level` und eine spätere `ai_access_policy` sind getrennte Konzepte. Ein Datensatz kann privat sein und trotzdem für lokale, bestätigte AI-Zusammenfassungen zulässig sein; ein anderer kann technisch lesbar sein, aber für externe AI oder Automationen gesperrt bleiben.

## Statusgrundsätze

- Tasks: `inbox`, `planned`, `active`, `waiting`, `done`, `canceled`, `someday`, `archived`
- Inbox: `raw`, `clarified`, `converted`, `archived`
- Projects: `idea`, `active`, `paused`, `blocked`, `completed`, `archived`
- Goals: `draft`, `active`, `paused`, `achieved`, `archived`
- Skills (current implementation): `active`, `paused`, `archived`; richer proficiency is Evidence, not Lifecycle
- Resources: `captured`, `processing`, `ready`, `applied`, `archived`
- Review Records: `draft`, `completed`, `archived`
- Priorities: `P0`, `P1`, `P2`, `P3`, `none`

## R2-02 Inbox clarification boundary

The existing `inbox_items` row owns cleaned `title` / `body`, `next_action`,
`missing_info`, Priority, Area, Energy, Duration, Review needed, Today candidate
and a date-only Deadline hint. Recurrence remains outside Inbox. The smallest
forward migration adds missing columns rather than a second draft table.
`original_title` / `original_body` retain pre-migration values and capture-time
values for new rows; a trigger prevents later replacement. They are source
history, never another editable truth.

`save_inbox_clarification` and `route_saved_inbox_item` authenticate with
`auth.uid()`, use Invoker/RLS and lock the owned open row. `updated_at` is an
optimistic concurrency token: stale saves/routes fail without partial writes.
Routing reads saved fields only. Existing Task and Resource RPCs are reused;
Project/Goal creation and Inbox archival occur in the same transaction.
Task routes to existing Projects/Goals/Skills preserve canonical context links.
All processed/triaged/archived rows leave the open Inbox projection.

The Inbox surface now submits one `complete_inbox_triage` call containing the
clarification fields, planning signals and chosen route. This Invoker wrapper
calls the existing save and route functions in one PostgreSQL transaction,
passing the freshly saved concurrency token to routing. A route failure rolls
back the clarification too. Selection alone writes nothing; the original
functions remain available to existing callers. No table or column is added
by this final-commit migration.


Text context transfers into the target's canonical description/summary;
Next Action maps to Project `next_step`, otherwise labelled description text.
Missing Info remains labelled context. Priority transfers to Task/Project;
Energy/Duration/Today to Task; Area to every supported target; Review needed to
Resource; Deadline to Task `due_at` (end of day in profile timezone) or
Project/Goal `target_date`. Unsupported target signals stay in source history,
with no implied target field. Original capture is never silently discarded.


## Project Milestones (R2-09)

Model audit: existing EntityMilestone/Education milestone structures are demo
fixtures, including manually stored progress and cross-domain links. No canonical
milestone table, task grouping or task-to-milestone FK existed. They are not reused
or migrated into personal data. Canonical Projects and Tasks remain unchanged in
identity.

`project_milestones` owns id, user_id, project_id, title, optional description/
target_date, status (open/active/done), sort_order, timestamps and soft archive.
Description is the stage outcome. `tasks.milestone_id` is nullable; all existing
Tasks remain null. Composite (user_id, project_id, milestone_id) FK and a non-null
Project check prevent cross-owner/project assignment and null-Project bypass.
Milestone identity is immutable. Guards reject archived endpoints, even through
direct API writes. Archival atomically clears task assignments, including archived
Tasks, while preserving every Task and the stage record. Hard delete is not exposed.

Unassignment is a single owned Task-row update in the repository and remains
available when its Project is archived; this prevents trapping active Tasks in
historical Project context. Non-null assignments still require active endpoints.

One nonarchived active stage per Project is enforced by a partial unique index.
The invoker RPC locks the owned Project, demotes prior active to open only on
explicit active selection, and performs stage writes/assignment/order/archive.
Order is unique per Project, deferred inside transactions to permit atomic swaps.
Completed stages sort after open/active; moves apply within that group. Task order
is inherited from the existing Project task read model (created_at descending).
No percentage is stored: stage and Project progress are computed from real active
Tasks and stages; stage completion remains explicit.

Project Description is available for general context; no separate Project Desired
Outcome field is introduced. Resources, artifact roles and Task Steps retain their
existing semantics.


## Accepted Product Target v0.4 — target model (not implemented)

This section records the accepted target contract. The **Current** model above
and the implemented R2 sections remain the implementation truth; the target
structures below require later contracts, schema work and evidence before they
can be treated as connected.

### Planning categories and progress

| Category | Current | Accepted target |
|---|---|---|
| Project | Project + Project Milestones + Tasks; milestone and task state are real | retain Project Milestones; derive current state from lifecycle, Task/Milestone state and current stage; no canonical stored overall percentage |
| Goal | Goal lifecycle, links and optional legacy progress field | add domain-specific Goal Milestones and explicit Outcome Criteria/Measures; boolean or numeric criteria require a defined unit, target and direction; achievement remains explicit and is not inferred from Task completion |
| Skill | Skill lifecycle, free level text and Skill Evidence | add domain-specific Skill Milestones, Evidence, Practice, Recency, Targets and Prerequisites; no mastery percentage without an accepted rubric |

All three categories use the planning shape Higher-order entity → domain
milestones → Tasks → progress without a universal polymorphic Milestone table.
Only Tasks possess Completion. Only Task Dependencies create V1 execution
READY/BLOCKED; Milestone membership/order is not a dependency engine. Historical
`projects.progress`, `goals.progress` and free Skill levels are retained for
compatibility but are not promoted as new canonical target truth.

### Accepted Skill Graph semantics

Future explicit Skill-to-Skill relations are limited in V1 to `prerequisite`
(directed, same-user, acyclic) and `related` (symmetric). Shared Task, Project
or Resource context never creates an edge. The Current Graph is existing Skills,
explicit edges and Evidence; the Target Graph is an explicitly user-selected
target with explicit Prerequisites. External roadmaps are initially
Resource/Reference material without automatic import. Gap Detection requires
reliable Target/Prerequisite/Evidence semantics.

### Resource ↔ Obsidian binding

Resource remains the Life-OS reference/artifact identity and keeps operational
relations to Projects, Goals, Skills and Tasks. Obsidian owns long-form content.
A future binding may include a logical vault identifier plus `life_os_id`; the
vault-relative path is a locator, never identity, and absolute personal paths
are not portable domain data. Rename/move does not change identity. Without an
explicit refresh, rebind or later sync contract, Life OS does not learn locator
changes. Missing or colliding IDs never match by filename/path. Existing
`type=note` Resources are preserved without automatic migration, deletion or
association. This contract authorizes no watcher, sync or write-back.

### Journal and AI read model

Journal remains fully Life-OS-owned personal/mental daily reflection, separate
from Knowledge Content and planning. Existing `journal_entries` stay canonical;
no Journal-to-Obsidian migration is implied. A future read-only Morning Briefing
is a read model, not new domain truth: its server-side user-scoped projection
may include current Tasks, Schedule, deadlines, Project/Goal/Skill metadata,
Milestones, dependency/blocker reasons and suitable non-sensitive Resource
metadata. Journal content, full Obsidian content and system-restricted data are
excluded by default; Health/Fitness/Nutrition and work-restricted data require
explicit opt-in. No direct model DB access, write, plan change or autonomous
action; provider and retention remain a later gate.

## Canonical Work Graph Semantics — R2-10 onward

R2-10 adds `task_dependencies` with owned same-Project composite Task foreign keys,
self/duplicate constraints, recursive cycle and completion triggers, RLS and a
single-snapshot graph read RPC. Exact concurrency/lifecycle decisions and proofs:
[Task Dependency contract](docs/architecture/task-dependencies-r2-10.md).
Existing Project Milestones, Artifact roles and Task lifecycle remain the baseline.
Revision, sync and template schemas are still future scope.

| Relation class | Meaning | Execution effect |
|---|---|---|
| Membership / containment | Project owns Milestones; a Task optionally belongs to one same-Project stage | No inferred sequence or dependency |
| Dependency | Directed Task predecessor → successor, Finish-to-Start | Only this relation class creates dependency blocking |
| Contribution / evidence | Project/Task supports Goal; explicit evidence supports Skill | No automatic Goal achievement or Skill mastery |
| Context / reference | Existing typed Resource and Task/Skill context | No completion effect or automatic evidence |
| Work Artifact | Project-specific Primary/Additional Resource role | Existing role semantics; no duplicate artifact entity |

R2-10 V1 permits multiple predecessors/successors only within the same owned
Project. Reject self-edges, duplicate pairs, cycles, cross-user/cross-Project edges
and invalid archived endpoints. Preserve this invariant during Project changes
and unassignment as well as edge creation. Existing edges prohibit Project changes;
explicit removal is required first. Owned Project row-version writes serialize graph
and Task lifecycle mutations; no generic global edge store or parallel task engine.

Task lifecycle values listed above stay unchanged. READY/BLOCKED are derived
availability, not editable status fields. V1 has no WAITING_FOR_DATE or start-date
gate: Calendar scheduling stays independent; consumers apply their existing date
filters to dependency-ready work. Satisfaction requires `done`, nonnull
`completed_at` and null `archived_at`.
Only satisfied predecessors release a dependency. Cancellation, archive or removal
never count as completion by default. Reopening a predecessor blocks open
successors; completed successors retain history with a visible inconsistency.
Never silently reopen or auto-correct them. Dependency removal is an explicit
validated command, distinct from deleting/archiving the predecessor.

Every completion boundary, including direct API/RPC and domain-source coupled
writes, must enforce Dependencies alongside existing domain guards. Reject the
whole coupled transaction if completion is blocked. Concurrent edge/completion/
reopen changes must not bypass guards or cycle prevention. Counts and read models
are derived from canonical records, never a stored overall progress score.
Milestone status remains explicit; Goal progress uses outcomes/criteria and Skill
progress explicit evidence/practice, not Task totals.

### Projection identity and future sync gate (accepted target; R2-12–R2-15)

Generated notes use life_os_id, life_os_type (project/milestone/task/goal/skill/
resource), life_os_revision and projection_version where the projection contract
supports them. Filename/path is not identity;
Work Artifacts reuse Resource identity. These are planned projection fields, not
claims of current database revision columns. An export manifest tracks generated
ownership/version and incremental writes; personal content remains outside it.

Canonical relations have Life OS domain semantics. Exploratory links and Canvas
layout have none until explicitly promoted through a validated domain command.
Future sync requires expected revision/optimistic concurrency, idempotency keys,
visible conflict state, retry, offline queue/replay, delete semantics and projection
versioning. No blanket last-write-wins; exact field ownership and conflict policy
are a R2-14 decision before write-back.

R2-16 templates may define Projects, Milestones, Tasks, Dependencies and supported
Resource/Skill/Goal relations. Preview and instantiation must validate existing
cardinalities/ownership; creation is atomic/idempotent and records template version.
Template edits never automatically replace running Projects. R2-17 adds no Goal
dependency engine or Skill Target/Prerequisite model by implication.

Journal ownership is resolved by the accepted target: preserve `journal_entries`
as the Life-OS source of truth. Existing note-Resources remain intact; neither
external Journal ownership nor new Journal context/relation fields are
implemented here. Missing Journal relations/Today projection remain model gaps.

## R2-12 projection metadata (implemented contract)

No Obsidian entity, migration or revision column. Life OS PostgreSQL remains the
only operational model for operational context and Resource identity; Obsidian
content remains outside this database contract. Exactly one selected Project includes its Milestones and
Tasks (including explicitly labelled archive history), internal Dependencies,
direct Project/Task Goals, Task/Skill and scoped explicit Skill Evidence, and
Resources linked to those Project/Task/Goal/Skill IDs. No recursive global graph,
Health/Nutrition/Journal/Inbox/Calendar event export or inferred name matching.
Work Artifacts retain Resource identity and explicit Project-relation roles.

Paths: Projects/, Milestones/, Tasks/, Goals/, Skills/, Resources/ followed by
a safe readable title.md. Canonical identity is life_os_id, never the path.
Case/NFC collisions receive a deterministic short SHA-256 ID suffix; unique titles
have no suffix. Wikilinks resolve IDs through this mapping, with aliases only for
changed/collision display names. Properties:
life_os_id, life_os_type, life_os_projection_version=1, existing updated_at,
archived_at and supported canonical state/context fields. The manifest
.life-os-projection.json records projectionVersion, generatedAt, projectId and
files {lifeOsId, lifeOsType, path, contentHash}; hashes are SHA-256 of full note
bytes. Notes have no generation timestamp. Rename changes the path and content, never identity. The pure update model matches
lifeOsType/lifeOsId and records changes {operation, oldPath, newPath} in its manifest.
It emits one file per retained identity and preserves User bytes across renames,
including old UUID paths. Removed identities are separately retained; conflicting
retained paths fail safely. No filesystem update/sync is introduced.

YAML Properties remain at the file start, bounded by YAML comment ownership
markers. Body uses LIFE_OS_GENERATED_START/END; a separate LIFE_OS_USER_START/END
region starts empty. Pure replacement preserves all bytes after generated content,
rejects ambiguous markers/unowned Properties/identity changes and has no runtime
filesystem caller. A future sync phase must decide tombstone/delete/archive policy;
source removal never grants permission to delete personal files. Export snapshots
contain current retained source records only; no automatic Goal or Skill scores.
