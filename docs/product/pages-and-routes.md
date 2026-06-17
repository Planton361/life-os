# Pages and Routes

Stand: 2026-06-17  
Status: Active  
Zweck: Routing- und Seitenstruktur.  
Quelle der Wahrheit: `PRODUCT.md` und `ARCHITECTURE.md`.  
Gilt für: Next.js Routes und UX-Navigation.  
Nicht gilt für: konkrete Komponenten pro Page.

## Core Routes

```text
/dashboard
/today
/calendar
/inbox
/tasks
/week
/projects
/projects/[projectId]
/goals
/goals/[goalId]
/review
/review/daily
/review/weekly
```

## Area Routes

```text
/education
/education/master-thesis
/education/literature
/education/skills
/work
/coding
/coding/agent-sessions
/coding/prompts
/health
/nutrition
/personal
```

## System Routes

```text
/settings
/archive
/system-status
/design-system
/agent-context
```

## Route-Regeln

- Dashboard zeigt Steuerung.
- Today zeigt Tagesarbeit.
- Inbox zeigt Klärung.
- Area Pages zeigen Kontext.
- Detailseiten zeigen Tiefe.
- Archive zeigt Vergangenheit, nicht aktive Steuerung.
