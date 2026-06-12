# FEATURE_SPEC.md

Stand: 2026-06-12

## Feature Map

```text
Capture
Tasks
Projects
Goals
Review
Education
Work
Coding & Agents
Health
Nutrition
Personal
System
```

## 1. Capture / Inbox

### Zweck

Alles schnell erfassen und später klären.

### Features

- Quick Add
- Brain Dump
- InboxItem-Typen:
  - Idee
  - Aufgabe
  - Notiz
  - Review
  - Projekt
  - Frage
  - Agent-Kontext
- Status:
  - Roh
  - Geklärt
  - Umgewandelt
  - Archiviert
- Nächster Schritt
- Area
- Quelle
- Review nötig
- Verknüpfung zu Task / Project / Note

### MVP

- InboxItem erstellen
- InboxItem klären
- in Task umwandeln
- archivieren

## 2. Tasks

### Felder

- title
- status
- priority
- date
- durationMinutes
- energy
- area
- project
- type
- focusMode
- resultNote
- recurring optional

### Views

- Today
- This Week
- Focus
- Waiting
- Someday
- Backlog

## 3. Projects

### Felder

- title
- status
- area
- nextStep
- progress
- deadline
- focusThisWeek
- risk
- blocker
- priority
- phase
- linked tasks
- linked goals

### Views

- Active Projects
- Paused Projects
- Roadmap
- Project Detail

## 4. Goals

### Felder

- title
- status
- horizon
- why
- measure
- progress
- nextStep
- area
- linked projects

### Views

- Goal Direction
- Quarterly Goals
- Active Goals
- Goals Review

## 5. Review

### Daily Log

- date
- mood
- energy
- outcome
- wins
- insight
- openLoops
- linkedTasks
- linkedInboxItems

### Weekly Review

- weekStart
- wins
- whatWorked
- blockers
- openLoops
- nextWeekFocus
- tasksReview
- projectsReview
- goalsReview
- habitsReview

## 6. Education

### Enthält

- Masterarbeit
- wissenschaftliche Arbeiten
- Literatur
- Forschungsthemen
- Skills
- Lernlog
- Hyperskill
- LeetCode

### Screens

- Education Dashboard
- Masterarbeit
- Literature
- Skills
- Learning Log

## 7. Work

### Enthält

- Arbeitslog
- Work Tasks
- Learnings
- Blocker
- Follow-ups

## 8. Coding & Agents

### Enthält

- Coding Projects
- GitHub Repos
- Agent Sessions
- Prompt Library
- Codebase Notes
- Agent Resources
- Projektkontext

### AgentSession-Felder

- title
- goal
- repo
- context
- prompt
- result
- followUp
- reviewNeeded
- linkedProject

## 9. Health

### Enthält

- Training
- Workout Plan
- Exercise Library
- Habits
- Sleep
- Energy
- Mental Health
- Tageszustand

## 10. Nutrition

### Enthält

- Meal Plan
- Recipes
- Groceries
- Meal Prep
- Protein Fokus
- bald verbrauchen

## 11. Personal

### Enthält

- private Projekte
- Journal
- Gaming Improvement
- Freizeit
- Watchlist später
- Wishlist später
- Alltag/Admin

## 12. System

### Enthält

- Settings
- Archive
- Data Export
- Import später
- Design System
- Agent Context
- System Status

## Priorisierung

### P0

- Dashboard
- Quick Add
- Inbox
- Today
- Tasks
- Projects
- Daily Review

### P1

- Week
- Goals
- Education Snapshot
- Health Snapshot
- Work/Coding Snapshot
- Weekly Review

### P2

- Nutrition
- Habit Log
- Agent Sessions
- Literature
- Work Log

### P3

- Advanced Charts
- Command Palette
- Calendar Integration
- Automation
- AI summaries


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
