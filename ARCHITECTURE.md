# ARCHITECTURE.md

Stand: 2026-07-07
Status: Active  
Zweck: operative Architekturregeln für Next.js App.  
Quelle der Wahrheit: Diese Datei; Details in `docs/engineering/*`.  
Gilt für: Repo-Struktur, Komponenten, Datenzugriff.  
Nicht gilt für: Produkt- oder Designdetails.

## Durable work-graph / knowledge ownership architecture

Product Target v0.4 is accepted. Life OS / PostgreSQL owns canonical
operational context truth: Projects, Goals, Skills, Milestones, Tasks,
Dependencies, Planning and Relations. `Resource` remains the Life-OS reference
and Work-Artifact identity; Obsidian owns long-form Knowledge Content and Notes.
Vault-relative paths are locators, not portable identity. A bound note uses
stable `life_os_id`; rename/move does not change identity. No watcher, sync,
write-back or personal Vault access follows from this decision.

Generated projection and Canvas structures are derived presentation/read models, never an alternate domain store. Any future command/write-back path requires an accepted security/conflict contract and must enter through existing Life OS auth, Zod, ownership, repository/RPC and RLS boundaries.

Product sequence and operative work status are read from `ROADMAP.md` and GitHub Project #3/Issues; this architecture file does not mirror operative Issue/Project work status.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui als Basis
- Supabase Auth + Postgres + RLS
- Zod
- React Hook Form
- Recharts sparsam
- Vitest / Playwright

## Struktur

```text
src/app/(app)/...
src/app/(auth)/...
src/components/ui
src/components/layout
src/components/dashboard
src/components/visualization
src/features/*
src/features/real-data/actions
src/features/real-data/schemas
src/features/real-data/supabase/repositories
src/lib/*
src/types/*
```

Hinweis zur aktuellen Server-Boundary:

- Der aktive Code nutzt feature-lokale Boundaries unter `src/features/real-data/actions`, `src/features/real-data/schemas` und `src/features/real-data/supabase/repositories`.
- `src/server/*` ist derzeit keine aktive Strukturvorgabe. Keine neue `src/server`-Struktur nur zur Dokumentationskonformitaet bauen.
- Neue Server Actions sollen im bestehenden Feature-/Real-Data-Pattern umgesetzt werden, bis ein eigener Refactor-Scope bestaetigt ist.

Detailquelle für Dashboard-Datei-Ownership und Safe Refactors:

- `docs/engineering/dashboard-code-structure.md`

## Regeln

- Server Components default.
- Client Components nur für echte Interaktion.
- Feature-Code in `features/*`.
- Server Queries/Actions getrennt halten.
- Keine globale State-Maschine im MVP.
- Tokens statt ad hoc Styling.
- Loading/Error/Empty States einplanen.
- Charts lazy/import-sparsam.
- Dashboard-Code folgt Datei-Ownership und Safe-Refactor-Regeln aus `docs/engineering/dashboard-code-structure.md`.

## External Source of Truth Boundary

Life OS owns canonical work identity, planning, context, relations and memory.
GitHub owns repository artifacts; Sciebo/filesystem owns scientific/Office/PDF/TeX
files; spreadsheets own flexible tabular artifacts. Existing Resources store
references and short context, connected to canonical Projects/Tasks/Goals/Skills.
Obsidian owns long-form Knowledge Content and Notes, while Life OS retains the
Resource identity, operational context and canonical relations. Existing
`type=note` Resources remain valid references; no automatic association or
migration is implied. Journal remains fully Life-OS-owned.
No second repository/project/task/resource architecture or external content copy.
A URL is stored data: syntactic parsing only, no fetch, metadata lookup, embedded
editor, API, OAuth, sync or secrets. Any future synchronization requires its own
explicit integration/security scope. Create and link remain separate explicit
writes using auth/Zod/ownership/RLS paths. Project-context creation returns the
persisted Resource ID to Project Detail for explicit use selection. Work Artifact
is a relation-specific role, never a provider or global Resource flag. The
Project-role Invoker RPC serializes Primary replacement atomically; no second
Resource is created on role changes or retries. External ownership is unchanged.


### Accepted target model boundary

Project, Goal and Skill remain separate domain categories. They share service
and UX principles around Higher-order entity → domain milestones → Tasks →
progress, but do not use one universal polymorphic Milestone table. Goal
Milestones/Outcome Criteria and Skill Milestones/Evidence/Targets/Prerequisites
remain domain-specific target structures. The USER ACCEPTED #39 Goal target
organizes Goal planning as one ordered Journey with exactly one Current
unarchived Goal Milestone in the primary journey at a time. Parallel work stays
below that Milestone through Projects/Tasks. This Current-Milestone rule is Goal
planning/lifecycle structure, not execution dependency. Only Task-to-Task
Dependencies create V1 execution READY/BLOCKED state; no Milestone dependency
engine is introduced.

### Server-side AI read boundary

The first accepted AI target is a read-only Morning Briefing. It receives only a
server-side, user-scoped structured projection: current Tasks, Schedule,
deadlines, Project/Goal/Skill metadata, Milestones, dependency/blocker reasons
and suitable non-sensitive Resource metadata. Journal content, full Obsidian
content and system-restricted data are excluded by default; Health/Fitness/
Nutrition and work-restricted data require explicit privacy opt-in. The model
has no direct database access and cannot write, reprioritize, change plans or
act autonomously. Credentials stay server-side; provider privacy/retention and
no-default prompt/response persistence are gates before a provider is chosen.

### R2-09 Project milestone boundary

Project Workbench reads owned project_milestones alongside canonical Tasks.
Project-context Task Create reuses WorkbenchEditor/EntityForm and the existing
Task action/repository. Optional milestoneId is validated and included in the
single Task insert; existing composite FK/active-row guards remain authoritative.
It does not create a Task followed by a separate milestone assignment write.
Existing authenticated Workbench operations validate through the milestone Zod
schema and an invoker RPC; unassignment uses one authenticated user-scoped Task
update, also allowing release from archived Project context. DB ownership/FKs/guards enforce Task-to-Project
consistency and serialize coupled milestone changes. Existing route revalidation
covers Project/Task detail and Portfolio, Dashboard, Today and Calendar. These
projections retain existing task-derived reads; milestone labels are not spread
into unrelated planning views. No external integration or alternate task store.


## Canonical Work Graph / Future Client Decision Boundary

The accepted target model is the durable ownership boundary. R2-10 provides canonical Task Dependencies independently of any client, inside existing feature-
local domain/actions/schemas/repositories and controlled transactional boundaries.
Database enforcement must cover every completion path, including source-linked
writes; Dashboard/Today/Calendar remain projections over the same records.
No global state machine, generic graph store or parallel src/server architecture.

The bounded `task_dependencies` table uses composite Task ownership/Project FKs
and database cycle/lifecycle/source guards. Actual Project row-version updates
serialize graph writes with completion/reopen. `read_task_dependency_graph` is a
single user-scoped snapshot; the reusable domain projection derives readiness and
blocker/successor context. See the [R2-10 decision](docs/architecture/task-dependencies-r2-10.md).

R2-11 is historical decision evidence. It compared A Life OS canonical + Obsidian client, B Obsidian-first ownership migration, C bounded native graph and D another stack. The accepted Target Model now clarifies operational Life-OS ownership with Obsidian content ownership; the lab never became Product Runtime and does not grant installation, personal-data or provider permissions.

R2-12 is retained here as implemented/historical capability evidence: an
authenticated, user-triggered single-Project export with stable identity,
readable paths and a manifest. Its projection details remain useful architecture
evidence, but R2-12 does not define future delivery order and does not
authorize R2-13 or any later delivery.

Any future Obsidian command or write-back capability requires, independently and
before implementation:

- a separately accepted Security/Conflict Contract; and
- a separately accepted Command/Ownership Scope defining allowed commands,
  field ownership, authentication, validation, conflicts and revalidation.

Such a capability must enter through the existing Life OS auth, Zod,
ownership, repository/RPC and RLS boundaries. No plugin database access is
allowed. The labels R2-14 and R2-15 refer only to preserved historical planning
evidence here; they do not establish a current order or delivery commitment.
The existing manual HTTP(S) Resource-opening path is not broadened by this
contract; “In Obsidian öffnen” remains a separately validated R2-12 capability.

Measure combined client/bridge/Life OS resource load and daily maintenance in the
multi-day pilot; avoid critical RAM/swap conditions. External code/documents/
spreadsheets retain ownership. Journal remains fully Life-OS-owned; missing
Journal relations/Today projection are separate implementation-depth gaps and
do not transfer content ownership to Obsidian.

## R2-12 Project projection boundary

`Project Detail → POST /api/projects/[projectId]/obsidian → existing Manual
profile + server getUser → project-projection-read repository → projectMarkdown
→ bounded ZIP response`. No new auth system or privileged client. The repository
selects allowlisted fields, scopes every read by authenticated user ID and follows
only the selected Project's canonical relations. It does not reuse the global
Workbench collection reader or the all-User graph RPC. The existing R2-10 domain
function derives dependency context from Project-filtered canonical rows.

Two bounded reads must agree before rendering; concurrent changes produce a retry
response. This detects changed snapshots, not a new transactional snapshot-isolation
claim. The package is assembled before a successful response; no partial filesystem
writes, Vault access, background process or revalidation is needed for this read.
No new library: a bounded ZIP32 STORE writer packages Markdown and manifest in memory.
Limits are 2,000 rows per filtered query, 250-row pages, 100-ID batches, 8 MiB source
per read, 10,000 files and 16 MiB package payload. Exceeding limits fails visibly.

R2-12 supersedes the earlier incremental-write/client-opening proposal: delivery
is a user-triggered download, not an Obsidian URI or server Vault writer. Canvas
belongs to R2-13. Merge preservation is a pure tested function with no import path.

Readable-path correction: canonical IDs map to sanitized title paths before rendering.
All links use that ID mapping; filenames are presentation. The pure projection
update matches identities, emits RENAME old/new paths and preserves user content,
without a filesystem caller. README is no longer generated; only domain Markdown
notes and the JSON manifest enter the package.
