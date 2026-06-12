# SECURITY.md – Life OS App

Stand: 2026-06-12

## Pflicht

Life OS enthält persönliche und sensible Daten. Security ist Pflicht.

## Regeln

```text
[ ] Jede nutzerspezifische Tabelle hat user_id.
[ ] RLS ist für nutzerspezifische Tabellen aktiv.
[ ] User sieht nur eigene Daten.
[ ] Inputs werden serverseitig validiert.
[ ] Keine Secrets im Client.
[ ] Kein Supabase service_role key im Browser.
[ ] Fehler zeigen keine internen Details.
```

## Auth

- Supabase Auth bevorzugt.
- Keine eigene Passwortlogik.
- Session serverseitig prüfen.
- Logout sichtbar.

## RLS

Für Tabellen:

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
- notes
- recipes

## Validierung

- Zod-Schemas pro Mutation.
- Statuswerte kontrollieren.
- Längenlimits.
- IDs prüfen.
- Fremdschlüssel prüfen.

## Privacy

- Keine Analytics im MVP ohne Entscheidung.
- Keine unnötigen sensiblen Daten.
- Health/Mental-Daten besonders bewusst.
- Export/Backup später einplanen.

## KI/Agenten

- AI outputs nie blind übernehmen.
- `reviewNeeded` setzen.
- Quelle speichern.
- Keine sensiblen Daten an externe APIs ohne bewusste Freigabe.
