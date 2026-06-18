# ARCHITECTURE.md

Stand: 2026-06-17  
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
src/lib/*
src/server/*
src/types/*
```

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
