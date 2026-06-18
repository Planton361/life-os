# DATA_MODEL.md

Stand: 2026-06-18
Status: Active
Zweck: operative Datenmodellregeln.
Quelle der Wahrheit: Diese Datei.
Gilt für: Tabellen, Entities, Relations, Statuswerte.
Nicht gilt für: reine UI-Widgets.

## Grundsatz

```text
UI zeigt Views.
Datenmodell beschreibt Entitäten und Beziehungen.
```

## Canonical Data Core

Life OS nutzt einen Canonical Data Core als Source-of-Truth-Schicht. Globale Entities besitzen eine kanonische Quelle und können in Dashboard, Today, Calendar, Portfolio oder Area-Unterseiten erscheinen, ohne kopiert zu werden.

Source-of-Truth-Regeln:

- Area-Unterseiten sind Views, keine Datensilos.
- Portfolio speichert Tasks, Projects, Goals und Skills nicht als Kopien.
- Resources ist die zentrale kanonische Resource-Entity.
- Notes, Wiki, Literature, Coding Resources und Work Wiki lesen, filtern oder verlinken zentrale Daten.
- Calendar liest zeitliche Felder aus kanonischen Entities und speichert nur freie Events separat.
- Today speichert Daily-Record-Daten, aber keine Kopien von Tasks, Meals, Workouts, Mood oder Sleep.
- Review Records bleiben fachlich erhalten, aber nicht als Sidebar-Navigation.
- Analytics und Reports sind abgeleitet und keine zweite Rohdatenquelle.
- Archive ist Lifecycle-Status oder Soft Archive, keine Kopie.

## Entity-Gruppen

### now

- profiles
- areas
- inbox_items
- tasks
- projects
- goals
- skills
- resources
- daily_records
- calendar_events
- review_records

### soon

- notes
- wiki_pages
- habits
- habit_logs
- work_logs
- meetings
- journal_entries
- scientific_works
- learning_logs
- repositories
- agent_profiles

### later

- workouts
- running_sessions
- strength_sessions
- meals
- recipes
- grocery_items
- inventory_items
- entertainment_items
- literature_items
- reports
- activity_events
- relationship_edges

### maybe

- challenges
- rewards
- purchase_decisions
- imports
- ai_summaries
- agent_sessions

Diese Gruppen sind fachliche Priorisierung, keine SQL-Spezifikation und keine Migrationsanweisung.

## Pflichtfelder

- `user_id` für jede nutzerspezifische Tabelle
- `created_at`
- `updated_at`
- kontrollierte Statuswerte
- Soft-Archive-Feld bei zentralen Entities
- RLS für alle nutzerspezifischen Tabellen ab Phase 3

## KI-Felder bei generierten Inhalten

- `source`
- `generated_by`
- `review_needed`
- `linked_context`
- `confidence` optional

## Privacy-Klassen

Konzeptionelle Privacy-Level:

- `standard_private`: normale private Life-OS-Daten.
- `personal_sensitive`: Journal, Notes, persönliche Reflexionen und ähnliche sensible Inhalte.
- `health_sensitive`: Mental Health, Sleep, Recovery, Health- und Fitnessdaten.
- `work_restricted`: Work Logs, Meetings, Work Wiki und potenziell vertrauliche Arbeitskontexte.
- `system_restricted`: Auth, Security, Integrationen, Tokens, Audit- und Admin-nahe Daten.
- `shareable`: bewusst freigegebene oder exportierbare Inhalte.

`privacy_level` und eine spätere `ai_access_policy` sind getrennte Konzepte. Ein Datensatz kann privat sein und trotzdem für lokale, bestätigte AI-Zusammenfassungen zulässig sein; ein anderer kann technisch lesbar sein, aber für externe AI oder Automationen gesperrt bleiben.

## Statusgrundsätze

- Tasks: `inbox`, `planned`, `active`, `waiting`, `done`, `canceled`, `someday`
- Inbox: `raw`, `clarified`, `converted`, `archived`
- Projects: `idea`, `active`, `paused`, `completed`, `archived`
- Goals: `draft`, `active`, `paused`, `achieved`, `archived`
- Skills: `interested`, `learning`, `practicing`, `applied`, `demonstrated`, `maintaining`
- Resources: `captured`, `processing`, `ready`, `applied`, `archived`
- Review Records: `draft`, `completed`, `archived`
- Priorities: `P1`, `P2`, `P3`, `none`
