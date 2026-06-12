# Life OS App – Codex Workspace

Stand: 2026-06-12

## Zweck

Dieser Ordner enthält die operativen Markdown-Dateien für Codex / VS Code.

Kopiere den Inhalt dieses Ordners in das Root deiner App:

```text
life-os-app/
```

## Wichtigste Dateien

- `AGENTS.md` – Arbeitsregeln für Codex
- `DESIGN.md` – visuelles Designsystem
- `PRODUCT.md` – Produktziel und Scope
- `ARCHITECTURE.md` – technische Architektur
- `DATA_MODEL.md` – Datenmodell
- `SECURITY.md` – Security/Privacy
- `ACCESSIBILITY.md` – Accessibility
- `ROADMAP.md` – Umsetzungsplan

## Struktur

```text
life-os-app/
├─ AGENTS.md
├─ DESIGN.md
├─ PRODUCT.md
├─ ARCHITECTURE.md
├─ DATA_MODEL.md
├─ SECURITY.md
├─ ACCESSIBILITY.md
├─ ROADMAP.md
├─ docs/
└─ .github/
```

## Arbeitsregel

Codex soll immer zuerst relevante `.md` Dateien lesen, dann gezielt ändern, dann prüfen und eine kurze Änderungsübersicht ausgeben.

## Primärer Stack

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

## App-Status

Aktueller Stand:

```text
Phase 2: Static App mit Mockdaten
```

Gebaut sind:

- Next.js App Router mit `src/` Directory
- TypeScript
- Tailwind CSS
- shadcn/ui Grundsetup mit CSS-Variablen
- App Shell mit Sidebar, Topbar und Mobile Sheet Navigation
- statisches Dashboard unter `/dashboard`
- Platzhalterseiten für die wichtigsten Life-OS-Bereiche
- Mockdaten in `src/features/dashboard/mock-data.ts`

Noch nicht gebaut:

- Supabase-Verbindung
- Auth
- echte Datenbank
- CRUD-Logik
- KI-/Agentenautomatisierung
- Production-Deploy-Konfiguration

## Installation

```bash
npm install
```

## Entwicklung starten

```bash
npm run dev
```

Danach ist die App lokal typischerweise unter `http://localhost:3000` erreichbar.
Die Root-Route `/` leitet auf `/dashboard` weiter.

## Wichtige Routen

```text
/dashboard
/today
/inbox
/week
/projects
/goals
/review
/education
/work
/coding
/health
/nutrition
/personal
```

## Prüfung

```bash
npm run lint
npm run build
```

## Nächste Phase

Phase 3 ist Datenmodell + Supabase später:

- Supabase Projekt
- Auth
- MVP-Tabellen
- RLS Policies
- erste persistente CRUD-Flows
