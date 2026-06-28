# R1.9.2 Backup / Export / Restore Strategy

Stand: 2026-06-28
Status: Strategy defined; production backup automation deferred
Zweck: Backup-, Export-, Restore- und Datenportabilitaetsstrategie fuer den
MVP Core nach R1.9.1 RLS/Security Hardening.

## 1. Zweck

R1.9.2 definiert, welche Life-OS-Daten exportierbar sein muessen, wie lokale
Exports sicher strukturiert werden sollen und in welcher Reihenfolge ein Restore
fachlich und technisch erfolgen muss.

Dieser Block erzeugt keine echten Dumps und keine echten Nutzerdaten-Exports.
Er legt nur Strategie, Format, lokale Hygieneregeln und ein nicht-ausfuehrendes
Tooling-Skeleton fest.

## 2. Scope

Im Scope:

- MVP-Dateninventar fuer Export und Restore
- Sensitivity Classification pro Tabelle
- JSON-Lines-Zielformat fuer spaetere User-Portability-Exports
- SQL-/Postgres-Dump-Zielformat fuer technische DB-Recovery
- Restore-Reihenfolge und Integrity Checks
- lokale Regeln fuer Export-/Backup-Dateien
- production backup requirements fuer einen spaeteren Block
- Platzhalterstruktur unter `scripts/export/`

Gepruefte Supabase-Referenzen:

- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/database/overview
- https://github.com/supabase/cli/blob/develop/apps/cli-go/docs/supabase/db/dump.md

Lokaler CLI-Kontext:

- Supabase CLI `2.107.0`
- `supabase db dump --help` bestaetigt `--local`, `--data-only`, `--file`,
  `--schema`, `--exclude` und `--use-copy`

## 3. Nicht-Ziele

- keine Remote-DB
- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- kein Service-Role-Key
- keine echten Nutzerdaten exportieren oder committen
- keine Backup-Dateien mit Daten committen
- keine Production-Backup-Automation
- keine Cron Jobs
- keine externe Storage-Integration
- keine neue Library
- keine UI

## 4. Dateninventar

Lokaler Public-Schema-Stand:

| Kategorie | Tabelle | Export Scope | Sensitivity | Dependency / Restore-Hinweis |
| --- | --- | --- | --- | --- |
| Core Identity | `profiles` | included | standard_private | `id` ist `auth.users.id`; Restore braucht vorhandenen Auth User oder Mapping. |
| Core Identity | `areas` | included | standard_private | Nach `profiles`; viele Tabellen referenzieren `areas`. |
| Portfolio | `goals` | included | standard_private | Nach `areas`; optional `area_id`. |
| Portfolio | `projects` | included | standard_private/work_sensitive | Nach `areas` und `goals`; optional `goal_id`. |
| Daily Flow | `inbox_items` | included | standard_private | Nach `areas`; `created_task_id` braucht zweite Restore-Phase oder deferred update. |
| Daily Flow | `daily_logs` | included | standard_private | Nach `profiles`; user-local day context. |
| Recurring | `recurring_task_templates` | included | standard_private | Nach `areas`, `goals`, `projects`; Tasks koennen Templates referenzieren. |
| Daily Flow | `tasks` | included | standard_private/work_sensitive | Nach `areas`, `projects`, `goals`, `inbox_items`, `daily_logs`, `recurring_task_templates`. |
| Daily Flow | `daily_log_tasks` | included | standard_private | Nach `daily_logs` und `tasks`. |
| Resources | `resources` | included | standard_private/work_sensitive | Nach `areas`. |
| Resources | `resource_relations` | included | standard_private/work_sensitive | Nach `resources` und Zieltabellen; `target_id` ist polymorph. |
| Nutrition | `recipes` | included | health_sensitive | Nach `areas`; contains optional nutrition estimates. |
| Nutrition | `meals` | included | health_sensitive | Nach `recipes`; contains meal notes/date context. |
| Skills | `skills` | included | standard_private/work_sensitive | Nach `areas`. |
| Skills | `skill_evidence` | included | standard_private/work_sensitive | Nach `skills` and polymorphic source targets. |

Optional geprueft und aktuell nicht im lokalen Public-Schema vorhanden:

- `habits`
- `habit_logs`
- `weekly_reviews`
- `agent_sessions`
- `workouts`
- weitere Health-/Nutrition-Future-Tabellen

## 5. Sensitivity Classification

`standard_private`:

- `profiles`
- `areas`
- `daily_logs`
- `daily_log_tasks`
- `inbox_items`
- `tasks`
- `goals`
- `projects`
- `resources`
- `resource_relations`
- `recurring_task_templates`
- `skills`
- `skill_evidence`

`health_sensitive`:

- `recipes`
- `meals`
- spaetere Health-, Fitness-, Mental-Health-, Recovery-, Sleep- oder Nutrition-
  Deep-Feature-Tabellen

`work_sensitive`:

- `projects`, `tasks`, `resources`, `resource_relations`, `skills` und
  `skill_evidence`, wenn Inhalte Work-, Kunden-, Arbeitgeber- oder
  vertrauliche Coding-Kontexte enthalten
- spaetere Work Logs, Meetings, Work Wiki, Agent Sessions und Repositories

`ai_sensitive`:

- aktuell keine persistierte externe AI-Tabelle
- spaetere AI Suggestions, AI Summaries, Agent Sessions oder Embedding-/Vector-
  Artefakte nur mit separatem Export-/Privacy-Gate

Konsequenz:

- Exporte sind private Daten.
- Export-Dateien duerfen nie committed werden.
- Health- und Work-Kontexte brauchen spaeter Verschluesselung, Retention und
  Restore-Drill mit besonderer Sorgfalt.

## 6. Export-Format

R1.9.2 entscheidet zwei Zielrichtungen:

1. Technische DB-Recovery:
   - Postgres/Supabase SQL dump fuer schema-/data-nahe Wiederherstellung.
   - Supabase CLI dokumentiert `supabase db dump`, inklusive `--local`,
     `--data-only`, `--file`, `--schema`, `--exclude` und `--use-copy`.
   - Production-Backups/PITR bleiben Supabase-/Plan-/Projektkonfiguration und
     werden nicht in diesem Block aktiviert.

2. Datenportabilitaet:
   - JSON Lines pro Tabelle fuer spaetere User-Exports.
   - Ein `manifest.json` beschreibt Export-Version, Tabellen, Row Counts und
     Checksum-Placeholders.
   - IDs bleiben erhalten, damit Relationen rekonstruierbar sind.
   - Reihenfolge wird im Manifest festgehalten.

Empfohlenes lokales Zielverzeichnis fuer spaetere Exporte:

```text
exports/life-os-export-YYYYMMDD-HHMMSS/
  manifest.json
  profiles.jsonl
  areas.jsonl
  goals.jsonl
  projects.jsonl
  inbox_items.jsonl
  daily_logs.jsonl
  recurring_task_templates.jsonl
  tasks.jsonl
  daily_log_tasks.jsonl
  resources.jsonl
  resource_relations.jsonl
  recipes.jsonl
  meals.jsonl
  skills.jsonl
  skill_evidence.jsonl
```

R1.9.2 erstellt nur ein Beispielmanifest unter `scripts/export/`; keine dieser
Dateien wird mit echten Daten erzeugt.

## 7. Restore-Reihenfolge

Empfohlene Restore-Reihenfolge fuer User-Portability-Importe:

1. `profiles`
2. `areas`
3. `goals`
4. `projects`
5. `inbox_items` ohne finalen `created_task_id`-Backlink, falls Zieltask noch
   nicht existiert
6. `daily_logs`
7. `recurring_task_templates`
8. `tasks`
9. `daily_log_tasks`
10. `resources`
11. `resource_relations`
12. `recipes`
13. `meals`
14. `skills`
15. `skill_evidence`
16. zweiter Update-Pass fuer deferred Backlinks wie `inbox_items.created_task_id`

Integrity Checks:

- Jede Row muss zum selben Export-User oder zu einem explizit gemappten User
  gehoeren.
- Restore darf keine Cross-User-Verknuepfungen erzeugen.
- `resource_relations.target_type` und `target_id` muessen auf vorhandene
  Zielobjekte des Restore-Users zeigen.
- `skill_evidence.source_type` und `source_id` muessen auf vorhandene
  Zielobjekte des Restore-Users zeigen, ausser `manual_note` mit `source_id =
  null`.
- `tasks.generated_from_template_id` und `tasks.instance_date` muessen zusammen
  konsistent bleiben.
- `meals.recipe_id` darf nur auf ein Recipe desselben Users zeigen.

## 8. Local Backup Regeln

Lokale Regeln ab R1.9.2:

- `exports/`, `backups/`, `*.dump`, `*.sql.gz` und `*.backup` bleiben
  unversioniert.
- Keine echten Dumps oder JSONL-Exports werden in diesem Repo committed.
- Export-Dateien duerfen nur in ignorierten lokalen Verzeichnissen liegen.
- Export-Dateien duerfen keine Secrets, Supabase Tokens, Service Role Keys,
  `.env`-Inhalte oder private Pfade enthalten.
- `private/` bleibt unberuehrt und wird nicht als Export-Ziel dokumentiert.
- Lokale Manual-DB wird nicht per `supabase db reset` fuer Export-Tests
  zurueckgesetzt.

## 9. Production Backup Anforderungen

Vor Production Release muss ein separater Block klaeren und beweisen:

- Supabase Plan/Projekt mit passenden Backups und Restore-Zeitfenstern.
- Point-in-Time Recovery, falls Risiko und Plan es verlangen.
- Offsite-Backup-Strategie fuer Free-/Self-managed-Kontexte.
- Storage Backup, falls spaeter Supabase Storage genutzt wird; Supabase
  DB-Backups decken Storage-Objekte nicht als Portabilitaetsformat ab.
- Verschluesselung at rest fuer exportierte Backup-Artefakte.
- Zugriff nur fuer explizit berechtigte Operatoren.
- Restore Drill in ein isoliertes Zielprojekt oder lokale Restore-Umgebung.
- Dokumentierte RPO/RTO-Ziele.
- Monitoring/Alerting fuer fehlgeschlagene Backup-Jobs, falls Automation
  spaeter eingefuehrt wird.

R1.9.2 aktiviert keine dieser Production-Automationen.

## 10. Encryption / Secret Handling

- Keine Service Role im Client.
- Kein Service Role Key im Repo.
- Keine `.env.local`- oder `.env`-Inhalte in Exporten.
- Spaetere Export-Artefakte muessen vor Offsite-Speicherung verschluesselt
  werden.
- Schluesselverwaltung ist ein eigener Security-Scope und nicht Teil von R1.9.2.
- Checksums dienen Integritaet, nicht Vertraulichkeit.
- Export-Manifeste duerfen keine Secrets enthalten.

## 11. Retention / Deletion

MVP-Regel:

- Lokale Exportdateien sind temporaer.
- Manuelle lokale Exporte muessen nach erfolgreicher Pruefung geloescht oder in
  einen verschluesselten, nicht versionierten Speicher verschoben werden.
- Keine Retention-Automation in R1.9.2.

Production-Anforderungen:

- Retention-Policy nach Datenklasse.
- Delete-/Right-to-export-Verhalten fuer spaetere Multi-User-/Production-
  Szenarien.
- Restore-Drills mindestens vor jedem Production-Release-Gate und danach
  regelmaessig.

## 12. Test Strategy

R1.9.2:

- Dokumente und Skeletons validieren.
- `git diff --check`, TypeScript, ESLint, Supabase local lint und Security
  Advisors laufen.
- Kein echter Export, kein Restore, kein Playwright.

Spaeterer Restore-Test:

- Test-Export mit synthetischen lokalen Daten erzeugen.
- Checksums/Row Counts im Manifest verifizieren.
- Restore in isolierte lokale DB oder dediziertes Testprojekt.
- RLS/Ownership danach erneut pruefen.
- Polymorphe Links und Backlinks gezielt pruefen.
- App-ReadModels gegen restored data smoke-testen.

## 13. Deferred Items

- echtes Export-Script
- echtes Import-/Restore-Script
- Encryption-Implementierung
- Checksum-Erzeugung
- Production Backup Automation
- Offsite Storage
- Supabase Storage Backup, falls Storage spaeter genutzt wird
- pgTAP-/SQL-Negativtests fuer Cross-User-Restore
- Restore Drill

## 14. Release Readiness Impact

```text
BACKUP_EXPORT_RESTORE_STRATEGY_DEFINED
NO_REAL_USER_DATA_EXPORTED
PRODUCTION_BACKUP_AUTOMATION_DEFERRED
NOT_PRODUCTION_RELEASE_READY
```

R1.9.2 reduziert das Product-/Data-Ops-Risiko, ersetzt aber keinen
Production-Backup-Drill. Production Readiness bleibt blockiert, bis echte
Backup-Konfiguration, Restore-Test, Deployment-Rehearsal/Target-Env-
Verifikation, Performance Review und Accessibility Pass abgeschlossen sind.
R1.9.3 definiert die Deployment-Env-Boundary, ersetzt aber keinen echten
Deployment-Test in einer Zielumgebung.
