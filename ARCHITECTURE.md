# ARCHITECTURE.md

Stand: 2026-07-07
Status: Active  
Zweck: operative Architekturregeln für Next.js App.  
Quelle der Wahrheit: Diese Datei; Details in `docs/engineering/*`.  
Gilt für: Repo-Struktur, Komponenten, Datenzugriff.  
Nicht gilt für: Produkt- oder Designdetails.

## Current architecture decision — R2-11 USER ACCEPTED (2026-09-10)

The user selected **Decision A**: Life OS / PostgreSQL remains canonical
operational truth. Obsidian is the Visual / Knowledge / Graph client.
Obsidian-first is NO-GO for now; native Graph remains fallback. R2-11 is closed;
R2-12 – Obsidian Projection Foundation is the sole Active Work Block, with
USER ACCEPTANCE PENDING. R2-13 is not started. Prior provisional/conditional
R2-11 wording below records the earlier planning/lab context and does not
reopen this decision. Existing Lab evidence and its limitations remain intact;
no Lab artifact becomes Product Runtime. Journal/Skill Map reconciliation is
separate; neither data ownership nor user acceptance is inferred for Journal.

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
No second repository/project/task/resource architecture or external content copy.
A URL is stored data: syntactic parsing only, no fetch, metadata lookup, embedded
editor, API, OAuth, sync or secrets. Any future synchronization requires its own
explicit integration/security scope. Create and link remain separate explicit
writes using auth/Zod/ownership/RLS paths. Project-context creation returns the
persisted Resource ID to Project Detail for explicit use selection. Work Artifact
is a relation-specific role, never a provider or global Resource flag. The
Project-role Invoker RPC serializes Primary replacement atomically; no second
Resource is created on role changes or retries. External ownership is unchanged.


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

R2-09 and R2-10 are USER ACCEPTED; R2-11 is the active synthetic lab. R2-10 provides
canonical Task Dependencies independently of any client, inside existing feature-
local domain/actions/schemas/repositories and controlled transactional boundaries.
Database enforcement must cover every completion path, including source-linked
writes; Dashboard/Today/Calendar remain projections over the same records.
No global state machine, generic graph store or parallel src/server architecture.

The bounded `task_dependencies` table uses composite Task ownership/Project FKs
and database cycle/lifecycle/source guards. Actual Project row-version updates
serialize graph writes with completion/reopen. `read_task_dependency_graph` is a
single user-scoped snapshot; the reusable domain projection derives readiness and
blocker/successor context. See the [R2-10 decision](docs/architecture/task-dependencies-r2-10.md).

R2-11 compares four architectural choices: A Life OS canonical + Obsidian client;
B Obsidian-first only as an explicit ownership migration; C bounded native graph;
D another stack, including Notion-first only by conscious local-first/security
reconciliation. No choice or library installation follows automatically from this
plan. The lab compares Core/Canvas and TaskNotes/Canvas Bases against current
Life OS, with a native prototype only if needed. Use synthetic data only.

If A wins, PostgreSQL → Life OS domain logic → regenerable Obsidian projection
is the first stage (R2-12). Proposed Vault regions are Projects/, Milestones/,
Tasks/, Goals/, Skills/, Resources/, Generated Views/ and Personal/. Stable IDs,
revisions, projection version and a manifest govern incremental atomic generation;
filenames never identify entities. Generated Wikilinks reflect canonical context,
including Project stages/Goal/Skills/Artifacts and Task blockers/Resources.
Personal notes/Canvas/layout are never overwritten. Generated Project Canvas is a
separate regenerable view (R2-13), not an alternate domain model.

After an accepted R2-14 contract, selected R2-15 commands may flow Obsidian → local
authenticated command bridge → existing Life OS domain actions/RPC boundaries →
PostgreSQL. No plugin database access. Auth/Zod/ownership/RLS, dependency guards
and route/read-model revalidation remain mandatory. One-way projection precedes
controlled commands; unrestricted bidirectional sync requires a further explicit
security/conflict scope. SECURITY.md owns pairing, permissions and trust requirements;
DATA_MODEL.md owns stable identity, revisions, conflicts and replay semantics.
The existing manual HTTP(S) Resource-opening path is not broadened by this plan;
“In Obsidian öffnen” is a separately validated R2-12 client-opening capability.

Measure combined client/bridge/Life OS resource load and daily maintenance in the
multi-day pilot; avoid critical RAM/swap conditions. External code/documents/
spreadsheets retain ownership. Journal long-form placement is unresolved until
R2-11/R2-07 reconciliation, without changing current journal_entries ownership.

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
