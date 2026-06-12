# VISUALIZATION_RULES.md

Stand: 2026-06-12

## Zweck

Visualisierungen sollen Fortschritt sichtbar machen und Motivation unterstützen, ohne die App zu überladen.

## Grundregel

```text
Visualisierung muss eine Entscheidung erleichtern oder Verhalten verstärken.
```

## Geeignete Visualisierungen

### 1. Progress Bars

Für:

- Projekte
- Ziele
- Skills
- Masterarbeit
- Wochenfortschritt

Regeln:

- Prozentwert als Text anzeigen
- Fortschritt dezent halten
- nicht jede Card braucht Progress

### 2. Weekly Rhythm

Für:

- Habits
- Training
- Lernlog
- Review-Streak
- Coding Sessions

Darstellung:

- 7 kleine Dots
- Week strip
- Mini heatmap
- keine große GitHub-Heatmap im Main Dashboard

### 3. Sparklines

Für:

- Energie
- Stimmung
- Trainingsfrequenz
- Lernzeit
- Review-Konstanz

Regeln:

- nur Trends, keine Detailanalyse
- Achsen nur wenn nötig
- Tooltip später optional

### 4. Rings

Für:

- Wochenkapazität
- Zielprogress
- Habit Completion

Regeln:

- sparsam
- nicht mehr als 1–2 auf einem Screen
- immer mit Textlabel

### 5. Timeline

Für:

- Woche
- Deadlines
- Trainingsplan
- Reviews
- Masterarbeit-Meilensteine

Regeln:

- nicht als dominanter Block auf dem Main Dashboard
- gut für Detailseiten

### 6. Kanban / Board

Für:

- Projektstatus
- Literaturstatus
- Coding Roadmap
- Inbox Processing

Nicht für:

- Today als Standardansicht

## Dashboard Visualisierungen

Maximal 2 visuelle Progress-Elemente im ersten Screen:

- Hero: Tagesstatus oder Fokus
- Projekte: Progress Bars
- optional Health: Week dots

## Detailseiten Visualisierungen

Hier darf mehr passieren:

### Education

- Masterarbeit-Fortschritt
- Literature Pipeline
- Skill-Level
- Lernlog-Trend

### Health

- Habit-Woche
- Trainingsfrequenz
- Energy Trend
- Tageszustand-Verlauf

### Coding

- Projektfortschritt
- Agent Sessions
- Repo-Aktivität manuell
- Prompt Library Status

### Review

- Review-Streak
- offene Loops Trend
- Wins pro Woche
- Fokus nächste Woche

## Seriöse Gamification

Erlaubt:

- Wins
- Streaks
- Fortschritt
- Wochenrhythmus
- Review-Abschluss
- Milestones
- Consistency Score

Vermeiden:

- harte XP-Spielerei
- Level-System ohne Bedeutung
- Lootbox-artige Elemente
- zu viele Badges
- Produktivitätsdruck
- Shame-Design

## Motivierende Sprache

Gut:

- `2 Trainings geplant`
- `Review offen`
- `3 Tage konsistent`
- `Nächster Schritt gesetzt`
- `Woche fast geklärt`

Schlecht:

- `Du hast versagt`
- `0 XP`
- `Streak verloren`
- `Du bist zurückgefallen`

## Chart-Bibliothek

Empfohlen für App-Phase:

```text
Recharts
```

Warum:

- React-nah
- Komponentenmodell
- geeignet für einfache Dashboards
- ausreichend für MVP-Visualisierungen

Nicht im MVP nötig:

- D3 Custom Charts
- Nivo
- Apache ECharts
- Complex BI dashboards

## Visualisierungs-DoD

Eine Visualisierung bleibt nur, wenn:

- sie verständlich ist
- sie mit Textlabel funktioniert
- sie nicht farbabhängig ist
- sie nicht lauter als Today/Inbox wird
- sie auf Mobile funktioniert
- sie eine Handlung unterstützt


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
