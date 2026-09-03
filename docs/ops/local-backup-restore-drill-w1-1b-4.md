# W1.1B.4 Local Backup / Restore Drill

Stand: 2026-07-10
Status: Z1 canonical Target backup and isolated restore-smoke contract
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, W1.1B.2 Personal
Operational Readiness, W1.1B.3 Local Personal Operations Runbook,
`docs/security/backup-export-restore-strategy-r1-9-2.md`, lokale Supabase CLI
Hilfe und Supabase CLI Doku.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, App-Feature-Code,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB-Aktionen, Deployment oder
Secrets.

## 1. Zweck

W1.1B.4 bereitet den ersten lokalen Backup-/Restore-Drill fuer die
personal-only, local-first Nutzung vor.

Entscheidung:

```text
Backup/Restore ist lokal-personal.
Keine Remote-DB.
Keine Backup-Daten im Repo.
Kein db reset.
```

Primary Goal:

- lokaler logischer DB-Backup-Drill
- Restore-Smoke in isolierter temporaerer Umgebung
- keine Git-Artefakte mit echten Daten
- keine Ausgabe von SQL-Dumps, Connection Strings oder Secrets

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI-Aenderungen
- keine `src`-Aenderungen fuer App-Features
- keine Tests aendern
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB
- kein `supabase link`
- kein `supabase db push`
- kein `db reset`
- kein Deployment
- keine Secrets lesen oder ausgeben
- keine `.env.local`, `.env`, `.local/**`, `private/**`, `backups/**` oder
  `exports/**` Inhalte lesen
- keine SQL-Dumps in Logs oder Docs ausgeben
- keine Backup-/Dump-Dateien stagen

## 3. Sicherheitsgrenzen

Runtime Guard:

- `pnpm backup:local:create` prueft vor jeder Datei-Erzeugung die laufende
  kanonische Target-DB anhand der nicht-sensitiven Docker-Projekt-Labels
  `life-os-sr104b-target`.
- Der Default-CLI-Stack `life-os-app`, ein Legacy-Source-Stack oder ein
  unbekannter Stack werden nicht als Target akzeptiert.
- Ein optional gesetztes `LIFE_OS_LOCAL_DB_URL` wird nur auf lokalen Host und
  den vom Target-Container publizierten DB-Port geprueft; sein Wert wird weder
  aus einer Datei gelesen noch ausgegeben oder gespeichert.

Backup-Artefakte:

- liegen nur unter `backups/local-drills/<timestamp>/`
- sind durch `.gitignore` unversioniert
- koennen echte lokale persoenliche Daten enthalten
- duerfen nicht in Git, Chat, Logs, Screenshots oder Docs kopiert werden

Restore-Smoke:

- nutzt eine isolierte temporaere Docker-Postgres-Umgebung, wenn verfuegbar
- aendert nicht die aktive lokale Supabase-App-DB
- fuehrt kein `db reset` aus
- nutzt keine Remote-DB
- druckt keine SQL-Inhalte

## 4. Tooling / Scripts

Erstellt:

```text
scripts/ops/create-local-db-backup.mjs
scripts/ops/restore-local-db-backup-smoke.mjs
```

Package Scripts:

```bash
pnpm backup:local:create
pnpm backup:local:restore-smoke backups/local-drills/<timestamp>
```

Supabase CLI Flags:

- installierte CLI: `2.107.0`
- `supabase db dump --help` bestaetigt `--db-url`, `--file`,
  `--role-only`, `--data-only`, `--schema`, `--local` und `--use-copy`
- Context7/Supabase CLI Doku bestaetigt dieselben Dump-Flags:
  https://github.com/supabase/cli/blob/develop/apps/cli/docs/go-cli-reference.md

Keine neue Dependency wurde ergaenzt.

## 5. Runtime Guard and optional DB URL

Nicht erlaubt:

- `.env.local` parsen
- `supabase status` offen ausgeben
- Connection String in Docs, Chat oder Logs schreiben
- Connection String in `manifest.json` schreiben
- Service Role Key verwenden oder dokumentieren

Script-Verhalten:

- `scripts/ops/create-local-db-backup.mjs` dumpt nur aus dem guarded Target-
  DB-Container.
- Ein optionaler `LIFE_OS_LOCAL_DB_URL` ist kein Zugriffspfad; er wird vor dem
  Dump nur fail-closed gegen den Target-Port geprueft.
- Wenn Guard oder Dump fehlschlagen, gibt es keinen Erfolg. Ein moegliches
  `BACKUP_FAILED` Manifest bleibt im ignorierten Backup-Ordner.

## 6. Backup-Artefakte

Zielstruktur:

```text
backups/local-drills/<timestamp>/
  manifest.json
  roles.sql
  schema.sql
  data.sql
  restore-smoke-result.json
```

`manifest.json` enthaelt:

- `drillVersion`
- `createdAt`
- `artifactNames`
- logische Command-Namen ohne DB URL
- `status`
- `notes`

Dump-Strategie:

- `roles.sql`: `pg_dumpall --roles-only` im guarded Target-DB-Container
- `schema.sql`: schema-only `pg_dump --clean --if-exists` der Schemas
  `public`, `auth` und `supabase_migrations`
- `data.sql`: data-only `pg_dump` derselben Schemas im guarded Target-DB-
  Container

Begruendung:

- `public` enthaelt die Life-OS App-Tabellen.
- `auth` wird im logischen Drill beruecksichtigt, weil `profiles.id` und
  viele User-FKs auf `auth.users` bezogen sind.
- `supabase_migrations` liefert die Migration-History fuer den isolierten
  Kompatibilitaets-Smoketest.
- Auth-Daten sind sensitive lokale Backup-Daten und duerfen deshalb nur in
  ignorierten Backup-Artefakten liegen.

## 7. Restore-Smoke-Strategie

Restore-Smoke Script:

```bash
pnpm backup:local:restore-smoke backups/local-drills/<timestamp>
```

Verhalten:

1. Backup-Ordner inklusive `CANONICAL_TARGET`-Manifest pruefen.
2. `roles.sql`, `schema.sql`, `data.sql` und `manifest.json` auf Existenz und
   Nicht-Leerheit pruefen.
3. Docker daemon pruefen.
4. Lokal vorhandenes Docker Image pruefen.
5. Temporaeren Container starten.
6. Minimalen Supabase-Rollen-Bootstrap nur im temporaeren Container anwenden.
7. Das sensible `roles.sql`-Artefakt pruefen, aber nicht in die temporaere
   Runtime replayen; der feste Bootstrap liefert nur die Supabase-Rollen fuer
   Schema-Grants.
8. `schema.sql` und `data.sql` via `psql` in den Container einspielen.
9. Migration-History, die kanonischen Tabellen `profiles`, `tasks`,
   `projects`, `resources`, `meals` und deren aggregierte Row-Counts gegen das
   Manifest pruefen.
10. `restore-smoke-result.json` schreiben und den Container entfernen.

Default Image:

```text
postgres:17-alpine
```

Override:

```bash
LIFE_OS_RESTORE_SMOKE_IMAGE='<local-postgres-image>' pnpm backup:local:restore-smoke backups/local-drills/<timestamp>
```

Sichere Blocker:

- Wenn Docker nicht verfuegbar ist:
  `BLOCKED_RESTORE_SMOKE_ENVIRONMENT`
- Wenn das Docker Image lokal nicht vorhanden ist:
  `BLOCKED_RESTORE_SMOKE_ENVIRONMENT`
- Wenn Supabase-spezifische Rollen trotz Bootstrap fehlen:
  `BLOCKED_RESTORE_SMOKE_ROLE_COMPATIBILITY`
- Wenn Supabase-Auth-Schema-Objekte nicht sicher wiederherstellbar sind:
  `BLOCKED_RESTORE_SMOKE_AUTH_SCHEMA_COMPATIBILITY`
- Wenn Extensions fehlen oder nicht kompatibel sind:
  `BLOCKED_RESTORE_SMOKE_EXTENSION_COMPATIBILITY`
- Wenn anderer SQL-Restore fehlschlaegt:
  `BLOCKED_RESTORE_SMOKE_SQL_COMPATIBILITY`

Der Blocker ist sicher, weil die aktive lokale App-DB nicht veraendert wird.

## 8. Drill-Ergebnis

Z1 Evidence:

- Canonical Target Guard, Backup-Erstellung und falscher-Default-Stack-
  Rejection wurden ausgefuehrt.
- Ein frisches Backup wurde in einen isolierten temporaeren Container
  restauriert; Migration-History, kanonische Tabellen und aggregierte Daten
  wurden gelesen und mit dem Manifest verglichen.
- Der Result-Status war `PASS_ISOLATED_READABLE_RESTORE`; ein aggregierter
  Target-Preservation-Check vor/nach dem Drill blieb unveraendert.
- Keine SQL-, Auth-, URL- oder persoenliche Row-Inhalte wurden ausgegeben.

## 9. Blocker, falls vorhanden

Mögliche sichere Blocker:

- `RUNTIME_GUARD_CANONICAL_TARGET_UNAVAILABLE` oder
  `RUNTIME_GUARD_CANONICAL_TARGET_IDENTITY_MISMATCH`: nicht auf den
  Default-CLI-Stack ausweichen; zuerst die dokumentierte Target-Runtime
  wiederherstellen.
- `RUNTIME_GUARD_REJECTED_DIFFERENT_LOCAL_STACK`: einen optionalen lokalen
  Connection-String nicht weiterverwenden, wenn er auf den Different Stack
  zeigt.
- `BLOCKED_RESTORE_SMOKE_*`: nur den isolierten Restore-Container untersuchen;
  Target und Legacy bleiben unangetastet.

Sichere Fortsetzung lokal:

```bash
pnpm runtime:target:check
pnpm backup:local:create
pnpm backup:local:restore-smoke backups/local-drills/<timestamp>
git status --short
```

Erwartung:

- `backups/` erscheint nicht im Git-Status, weil der Pfad ignoriert ist.
- `restore-smoke-result.json` bleibt im ignorierten Backup-Ordner.
- Kein Backup-Artefakt wird gestaged.

## 10. Was nie committed werden darf

Nie stagen:

- `backups/**`
- `exports/**`
- `*.dump`
- `*.backup`
- `*.sql.gz`
- `roles.sql`
- `schema.sql`
- `data.sql`
- `restore-smoke-result.json`
- `.local/**`
- `.env`
- `.env.local`
- `.env.*.local`
- `private/**`
- `supabase/.temp/**`
- `supabase/.branches/**`

Hinweis:

- Die generierten SQL-Dateien koennen echte lokale persoenliche Daten,
  Auth-Daten, E-Mail-Adressen oder Hashes enthalten.
- Sie duerfen nicht in Code Review, Logs, Chat oder Dokumentation kopiert
  werden.

## 11. Wiederholungsintervall

Empfohlen fuer local-first personal use:

- vor einem Device Switch / MacBook Wechsel
- vor groesseren lokalen Supabase-, Migration- oder Toolchain-Aenderungen
- nach einem erfolgreichen lokalen Restore-Smoke mindestens einmal pro Monat,
  solange Life OS aktiv lokal genutzt wird
- vor jeder spaeteren Private-Remote-Entscheidung, wenn echte lokale Daten
  migriert oder gesichert werden sollen

Retention:

- lokale Backup-Artefakte temporaer halten
- nach erfolgreichem Smoke entweder loeschen oder in einen verschluesselten,
  nicht versionierten Speicher verschieben
- keine Retention-Automation in W1.1B.4

## 12. Next Steps

1. Owner prueft `pnpm runtime:target:check` und startet niemals den
   Default-CLI-Stack als Ersatz.
2. Owner fuehrt `pnpm backup:local:create` aus.
3. Owner fuehrt mit dem erzeugten Ordner
   `pnpm backup:local:restore-smoke backups/local-drills/<timestamp>` aus.
4. Owner prueft `git status --short`; `backups/` darf nicht auftauchen.
5. Falls Restore-Smoke `PASS_ISOLATED_READABLE_RESTORE` meldet, ist der
   lokale logische Restore-Smoke fuer diesen Stand erledigt.
6. Das ist kein vollstaendiger Supabase-Runtime-, Cloud- oder Production-
   Restore-Claim.
7. Falls Restore-Smoke einen `BLOCKED_RESTORE_SMOKE_*` Status meldet, wird der
   genaue technische Blocker in `restore-smoke-result.json` lokal gehalten und
   nicht committed.
8. Nach lokal ausgefuehrtem Drill kann W1.1B.5 Optional Private Remote Decision
   vorbereitet werden.

## 13. W1.1B.4b Restore-Smoke Container Readiness Fix

Stand: 2026-07-10

Ausgangsfehler:

```text
BLOCKED_RESTORE_SMOKE_ENVIRONMENT
phase: restore roles
detail: database system is shutting down
```

Root Cause:

- Der Helper pruefte `pg_isready` gegen die Ziel-DB ueber Default-Socket und
  startete den Rollen-Restore unmittelbar danach.
- Der erste `psql`-Aufruf konnte dadurch noch in eine instabile Container-
  Readiness-Phase laufen.
- Das Ergebnis wurde pauschal als Environment-Blocker klassifiziert, obwohl
  spaetere Restore-Fehler auch SQL-Kompatibilitaet sein koennen.

Fix:

- Restore-Smoke wartet jetzt bis zu 60 Sekunden auf Postgres-Readiness.
- `pg_isready` nutzt TCP gegen `127.0.0.1:5432`, User `postgres` und die
  Maintenance-DB `postgres`.
- Nach erstem `pg_isready` PASS folgt eine kurze Stabilitaetswartezeit plus
  zweiter Readiness-Check.
- `roles.sql` wird gegen `postgres` angewendet; `schema.sql` und `data.sql`
  gegen die isolierte Drill-DB.
- Ergebnisstatus unterscheidet jetzt:
  `PASS`, `BLOCKED_RESTORE_SMOKE_ENVIRONMENT`,
  `BLOCKED_RESTORE_SMOKE_SQL_COMPATIBILITY`,
  `BLOCKED_RESTORE_SMOKE_ARTIFACTS` und `FAILED_RESTORE_SMOKE_UNKNOWN`.

Restore-Smoke Result:

```text
BLOCKED_RESTORE_SMOKE_SQL_COMPATIBILITY
phase: restore roles
reason: Restore-smoke SQL was not compatible with the isolated Postgres container.
detail: role "anon" does not exist
```

Bewertung:

- Container-Readiness ist repariert; der Smoke erreicht jetzt den
  SQL-Restore-Pfad.
- Der verbleibende Blocker ist Supabase-spezifische Rollen-/SQL-
  Kompatibilitaet im generischen `postgres:17-alpine` Container.
- Aktive lokale Life-OS-DB wurde nicht veraendert.
- Kein `db reset`, keine Remote-DB, keine Migration, keine RLS-/Policy-
  Aenderung und kein Deployment.
- SQL-Dump-Inhalte, DB-URL und Secrets wurden nicht ausgegeben.

## 14. W1.1B.4c Supabase-compatible Restore-Smoke Strategy

Stand: 2026-07-10

Compatibility Cause:

- Der bestehende Restore-Smoke gegen `postgres:17-alpine` scheiterte nach der
  Container-Readiness-Reparatur bei Supabase-Rollen.
- Initial fehlte `anon` beim Rollen-Restore.
- Nach minimalem Rollen-Bootstrap erreichte der Smoke den Schema-Restore und
  zeigte als naechste fehlende Rolle `supabase_auth_admin`.
- Ursache ist `ROLE_AND_AUTH_SCHEMA_COMPATIBILITY`: der Backup-Scope enthaelt
  `public,auth`, und Supabase-Dumps erwarten Supabase-Standardrollen, die ein
  generischer Postgres-Container nicht mitbringt.

Strategy:

- Gewaehlt wurde Option A: Minimal Supabase Compatibility Bootstrap.
- Option B, eine echte disposable Supabase Restore Runtime, bleibt spaeterer
  eigener Drill, weil sie Ports, Container, Config und Runtime-Verhalten
  deutlich staerker koppelt.

Bootstrap-Grenzen:

- Der Bootstrap laeuft nur im temporaeren Restore-Smoke-Container.
- Er legt Rollen ohne Passwortwerte an:
  `anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin`,
  `supabase_auth_admin` und `dashboard_user`.
- Er baut keine eigene `auth.uid()`-/`auth.jwt()`-Semantik.
- Er aendert keine aktive lokale Life-OS-DB.
- Er nutzt keine Remote-DB und fuehrt kein `db reset` aus.

Restore-Smoke Result:

```text
PASS_WITH_COMPATIBILITY_BOOTSTRAP
phase: restore complete
```

Proof Level:

- Bewiesen ist ein lokaler logischer Restore-Smoke von Rollen, Schema und Daten
  in einem isolierten Postgres-Container mit minimaler Supabase-
  Rollenkompatibilitaet.
- Nicht bewiesen ist ein vollstaendiger Supabase-Runtime-, Supabase-Cloud-,
  Remote- oder Production-Restore.
- Nicht bewiesen sind App-ReadModels, Browser-Flows, RLS-Negativtests,
  Point-in-Time-Recovery, Monitoring oder Offsite-Retention.

Sicherheit:

- SQL-Dump-Inhalte, DB-URL, `.env.local`-Werte und Secrets wurden nicht
  ausgegeben oder committed.
- Backup-Artefakte bleiben unter `backups/` ignoriert und werden nicht
  gestaged.
- Keine Migration, keine RLS-/Policy-Aenderung, kein Deployment.
