# DATA_MODEL.md

Stand: 2026-06-17  
Status: Active  
Zweck: operative Datenmodellregeln.  
Quelle der Wahrheit: Diese Datei.  
Gilt für: Tabellen, Entities, Relations, Statuswerte.  
Nicht gilt für: reine UI-Widgets.

## Grundsatz

```text
UI zeigt Views. Datenmodell beschreibt Entitäten.
```

## MVP-Tabellen

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

## Pflichtfelder

- `user_id` für jede nutzerspezifische Tabelle
- `created_at`
- `updated_at`
- kontrollierte Statuswerte
- Soft-Archive-Feld bei zentralen Entities

## KI-Felder bei generierten Inhalten

- `source`
- `generated_by`
- `review_needed`
- `linked_context`
- `confidence` optional

## Statusgrundsätze

- Tasks: `inbox`, `planned`, `active`, `waiting`, `done`, `canceled`, `someday`
- Inbox: `raw`, `clarified`, `converted`, `archived`
- Projects: `idea`, `active`, `paused`, `completed`, `archived`
- Priorities: `P1`, `P2`, `P3`, `none`
