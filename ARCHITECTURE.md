# ARCHITECTURE.md – Life OS App

Stand: 2026-06-12

## Zielstack

```text
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Supabase Postgres + Auth + RLS
Zod
React Hook Form
Recharts
Vitest
Playwright
Vercel
```

## Projektstruktur

```text
src/
  app/
    (app)/
      dashboard/
      today/
      inbox/
      week/
      projects/
      goals/
      review/
      education/
      work/
      coding/
      health/
      nutrition/
      personal/
    (auth)/
    api/
    globals.css
    layout.tsx

  components/
    ui/
    layout/
    dashboard/
    forms/
    visualization/
    shared/

  features/
    inbox/
    tasks/
    projects/
    goals/
    review/
    education/
    coding/
    health/
    nutrition/

  lib/
    supabase/
    db/
    validation/
    utils/
    constants/

  server/
    actions/
    queries/

  types/
```

## Regeln

- Server Components als Default.
- Client Components nur bei Interaktion.
- Feature-nahe Logik in `features/*`.
- Wiederverwendbare UI in `components/*`.
- Datenzugriff nicht in UI-Komponenten verstreuen.
- Zod für Mutations.
- Supabase RLS für User-Daten.
- Loading/Error/Empty States pro wichtiger Route.
- Keine schwere Chart-Library im globalen Bundle.

## shadcn/ui

- Basiskomponenten in `components/ui`.
- Komponenten nicht unkontrolliert direkt ändern.
- Life-OS-Stil über Tokens und Wrapper-Komponenten.
- `components.json` konsistent halten.

## Datenzugriff

MVP:

- Supabase Auth
- Supabase Client
- Server-side queries
- RLS

Optional:

- Drizzle für Schema/Migrations

## App Shell

Desktop:

- Sidebar
- Topbar
- Command/Quick Add
- Main content
- optional Context Panel

Mobile:

- Bottom Nav oder compact top navigation
- Quick Add prominent
- Drawer für sekundäre Navigation
