# ROADMAP.md – Life OS App Roadmap

Stand: 2026-06-12

## Ziel

Vom Markdown-Kontext zur echten Life OS App.

## Phase 0 – Kontext und Regeln

Status: aktuell.

Tasks:

- neue app-first `.md` Dateien erstellen
- alte Notion-Regeln entfernen
- ChatGPT-Projektwissen aktualisieren
- Codex-Workspace aktualisieren
- Produktziel finalisieren

Done, wenn:

- ChatGPT und Codex denselben Kontext haben
- Notion nicht mehr primäres Ziel ist
- Stack und Roadmap feststehen

## Phase 1 – Design Direction

Ziel:

```text
Beeindruckende, moderne App-Richtung finden.
```

Tasks:

- vorhandene HTML-Varianten prüfen
- Variante D/E als app-first Version bauen
- App Shell testen
- Dashboard mit Sidebar/Topbar/Command Button testen
- visuelle Richtung wählen
- Mobile prüfen

Artefakte:

- statischer Prototyp
- Screenshot Reviews
- Design Tokens
- Komponentenliste

## Phase 2 – Next.js Static App

Ziel:

```text
Statisches UI mit Mockdaten in echter App-Struktur.
```

Tasks:

- Next.js Projekt erstellen
- Tailwind/shadcn einrichten
- App Shell bauen
- Dashboard als React-Komponenten bauen
- Routen anlegen
- Mockdaten definieren
- Komponenten extrahieren

Keine echte DB in dieser Phase.

## Phase 3 – Datenmodell und Supabase

Ziel:

```text
Datenmodell stabilisieren und erste Persistenz.
```

Tasks:

- Supabase Projekt
- Auth einrichten
- Tabellen für MVP
- RLS Policies
- Seed-Daten
- CRUD für Inbox/Tasks/Projects/DailyLog
- Zod Validierung

## Phase 4 – Operative Nutzung

Ziel:

```text
Eine Woche real nutzen.
```

Tasks:

- Today Flow
- Inbox Processing
- Daily Review
- Active Projects
- Week View
- Basic Goals
- einfache Visualisierung

Erfolg:

- tägliche Nutzung ohne Notion nötig
- Dashboard bleibt scanbar
- Mobile nutzbar

## Phase 5 – Area Dashboards

Ziel:

```text
Life OS breiter machen.
```

Tasks:

- Education
- Work
- Coding & Agents
- Health
- Nutrition
- Personal

Jede Area bekommt:

- Dashboard
- Snapshot
- wichtigste Entities
- maximal 1–2 Visualisierungen
- keine komplette Datenüberladung

## Phase 6 – Visualisierung und Motivation

Ziel:

```text
Fortschritt sichtbar und motivierend machen.
```

Tasks:

- Habit Week
- Project Progress
- Goal Progress
- Energy Trend
- Review Streak
- Skill Progress
- Training Frequency

## Phase 7 – Agentenfähigkeit

Ziel:

```text
Codex/LLM-Agenten sinnvoll integrieren.
```

Tasks:

- Agent Sessions
- Prompt Library
- Codebase Notes
- Agent Context
- Review Needed
- Follow-up Needed
- Agent Summary optional

Keine Autonomie ohne Review.

## Phase 8 – Hardening

Ziel:

```text
Stabil, sicher, nutzbar.
```

Tasks:

- Playwright E2E
- Vitest Tests
- Accessibility Review
- RLS Audit
- Backup/Export
- Performance
- Error States
- Empty States

## Backlog

- Calendar integration
- PWA
- Offline
- AI summaries
- voice capture
- mobile native app
- import/export Notion
- advanced analytics
- public portfolio views

## Reihenfolge-Regel

```text
Erst täglicher Flow.
Dann Bereiche.
Dann Visualisierung.
Dann KI.
Dann Automatisierung.
```


## Quellen und Referenzbasis

Diese Datei basiert auf folgenden Quellen und Best Practices:

- Next.js Docs: https://nextjs.org/docs
- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- shadcn/ui Docs: https://ui.shadcn.com/docs
- shadcn/ui Theming: https://ui.shadcn.com/docs/theming
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Drizzle ORM: https://orm.drizzle.team/
- Prisma Docs: https://www.prisma.io/docs
- TanStack Query: https://tanstack.com/query/latest
- Zod: https://zod.dev/
- React Hook Form: https://react-hook-form.com/
- Recharts: https://recharts.org/
- Playwright: https://playwright.dev/
- Vitest: https://vitest.dev/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- Nielsen Norman Group Dashboards: https://www.nngroup.com/articles/dashboards-preattentive/
- Nielsen Norman Group Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Material Design 3 Cards: https://m3.material.io/components/cards
- Material Design 3 Color Roles: https://m3.material.io/styles/color/roles
- Atlassian Design Tokens / Spacing: https://atlassian.design/foundations/spacing
- IBM Carbon Spacing / Grid: https://carbondesignsystem.com/elements/spacing/overview/
- OpenAI Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- AGENTS.md Standard: https://agents.md/
- GitHub Copilot Custom Instructions: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
- VS Code Prompt Files: https://code.visualstudio.com/docs/copilot/customization/prompt-files
- Google Labs DESIGN.md: https://github.com/google-labs-code/design.md
