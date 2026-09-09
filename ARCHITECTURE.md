# ARCHITECTURE.md

Stand: 2026-07-07
Status: Active  
Zweck: operative Architekturregeln für Next.js App.  
Quelle der Wahrheit: Diese Datei; Details in `docs/engineering/*`.  
Gilt für: Repo-Struktur, Komponenten, Datenzugriff.  
Nicht gilt für: Produkt- oder Designdetails.

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
Existing authenticated Workbench operations validate through the milestone Zod
schema and an invoker RPC; unassignment uses one authenticated user-scoped Task
update, also allowing release from archived Project context. DB ownership/FKs/guards enforce Task-to-Project
consistency and serialize coupled milestone changes. Existing route revalidation
covers Project/Task detail and Portfolio, Dashboard, Today and Calendar. These
projections retain existing task-derived reads; milestone labels are not spread
into unrelated planning views. No external integration or alternate task store.
