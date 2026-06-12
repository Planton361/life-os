# DATA_MODEL.md – Life OS App Data Model

Stand: 2026-06-12

## Grundsatz

Das Datenmodell muss die App tragen, nicht die UI kopieren.

```text
UI zeigt Views.
Datenmodell beschreibt Entitäten und Beziehungen.
```

## Kern-Entities

### User

```text
id
email
displayName
timezone
createdAt
updatedAt
```

### Area

```text
id
userId
name
slug
color
icon
description
sortOrder
```

Standard-Areas:

- Education
- Work
- Coding
- Health
- Nutrition
- Personal
- Review/System

### Task

```text
id
userId
title
description
status
priority
date
durationMinutes
energy
areaId
projectId
goalId
type
focusMode
resultNote
reviewNeeded
createdAt
updatedAt
completedAt
```

Status:

- inbox
- planned
- active
- waiting
- done
- canceled
- someday

Priority:

- P1
- P2
- P3
- none

### InboxItem

```text
id
userId
title
body
type
status
areaId
source
nextStep
reviewNeeded
convertedTaskId
convertedProjectId
convertedNoteId
createdAt
processedAt
```

Type:

- idea
- task
- note
- question
- review
- project
- agent_context

Status:

- raw
- clarified
- converted
- archived

### Project

```text
id
userId
title
description
status
areaId
goalId
nextStep
progress
deadline
focusThisWeek
risk
blocker
priority
phase
createdAt
updatedAt
completedAt
```

Status:

- idea
- active
- paused
- completed
- archived

### Goal

```text
id
userId
title
description
status
horizon
why
measure
progress
nextStep
areaId
createdAt
updatedAt
```

Horizon:

- week
- month
- quarter
- year
- someday

### DailyLog

```text
id
userId
date
mood
energy
focus
outcome
wins
insight
openLoops
tomorrowHint
createdAt
updatedAt
```

### WeeklyReview

```text
id
userId
weekStart
wins
whatWorked
blockers
openLoops
nextWeekFocus
tasksReview
projectsReview
goalsReview
habitsReview
createdAt
updatedAt
```

### Note

```text
id
userId
title
body
areaId
projectId
source
tags
createdAt
updatedAt
```

## Area-Specific Entities

### Education

```text
ScientificWork
Literature
ResearchTopic
Skill
LearningLog
```

### Work

```text
WorkLog
WorkFollowUp
WorkLearning
```

### Coding & Agents

```text
CodingProject
Repo
AgentSession
AgentResource
Prompt
CodebaseNote
```

### Health

```text
Habit
HabitLog
Workout
Exercise
DailyState
```

### Nutrition

```text
Recipe
MealPlan
GroceryItem
Ingredient
```

## Relations

```text
Task -> Area
Task -> Project
Task -> Goal
Project -> Area
Project -> Goal
Goal -> Area
InboxItem -> Task / Project / Note
DailyLog -> Tasks
DailyLog -> InboxItems
Literature -> ScientificWork
LearningLog -> Skill
WorkLog -> Task / Project
CodingProject -> Repo
AgentSession -> CodingProject / Repo / Prompt
HabitLog -> Habit
Workout -> Exercise
MealPlan -> Recipe
Recipe -> Ingredient
GroceryItem -> Ingredient
```

## MVP-Schema

Für den MVP zuerst:

- profiles
- areas
- tasks
- inbox_items
- projects
- goals
- daily_logs
- weekly_reviews
- habits
- habit_logs
- workouts
- agent_sessions

Nutrition, Literature und WorkLog können zunächst als einfache Notes/Tasks starten und später eigene Tabellen bekommen.

## Datenmodell-Regeln

- Jede Tabelle hat `user_id`.
- Jede nutzerspezifische Tabelle braucht RLS.
- Jede wichtige Entity hat `created_at` und `updated_at`.
- Statuswerte sind kontrollierte Enums oder Check Constraints.
- Soft Archive statt hartes Löschen für zentrale Entities.
- UI-spezifische Sortierung nicht ins Datenmodell mischen, außer `sort_order` bei Areas/Views.
- KI-generierte Inhalte brauchen Quelle und Review-Status.


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
