# W1.1B.4 Local Backup / Restore Drill

Stand: 2026-07-10
Status: Local restore-smoke passes with temporary Supabase compatibility bootstrap
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

DB-Connection-String:

- `LIFE_OS_LOCAL_DB_URL` wird nur aus der aktuellen Shell-Umgebung gelesen.
- Der Wert wird nie ausgegeben, nie in Manifest-Dateien geschrieben und nie aus
  `.env.local` gelesen.
- Wenn die Variable fehlt, stoppt das Backup-Script mit:

```text
Set LIFE_OS_LOCAL_DB_URL in your local shell. Do not commit or print it.
```

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

## 5. LIFE_OS_LOCAL_DB_URL Handling

Erlaubt:

```bash
LIFE_OS_LOCAL_DB_URL='<local-postgres-connection-string>' pnpm backup:local:create
```

Nicht erlaubt:

- `.env.local` parsen
- `supabase status` offen ausgeben
- Connection String in Docs, Chat oder Logs schreiben
- Connection String in `manifest.json` schreiben
- Service Role Key verwenden oder dokumentieren

Script-Verhalten:

- `scripts/ops/create-local-db-backup.mjs` liest
  `process.env.LIFE_OS_LOCAL_DB_URL`.
- Wenn die Variable fehlt, wird kein Backup-Ordner erzeugt.
- Wenn ein Dump fehlschlaegt, schreibt das Script hoechstens ein
  `BACKUP_FAILED` Manifest in den ignorierten Backup-Ordner und redigiert den
  DB-URL-Wert aus Fehlermeldungen.

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

- `roles.sql`: `supabase db dump --role-only`
- `schema.sql`: `supabase db dump --schema public,auth`
- `data.sql`: `supabase db dump --schema public,auth --data-only --use-copy`

Begruendung:

- `public` enthaelt die Life-OS App-Tabellen.
- `auth` wird im logischen Drill beruecksichtigt, weil `profiles.id` und
  viele User-FKs auf `auth.users` bezogen sind.
- Auth-Daten sind sensitive lokale Backup-Daten und duerfen deshalb nur in
  ignorierten Backup-Artefakten liegen.

## 7. Restore-Smoke-Strategie

Restore-Smoke Script:

```bash
pnpm backup:local:restore-smoke backups/local-drills/<timestamp>
```

Verhalten:

1. Backup-Ordner als Argument pruefen.
2. `roles.sql`, `schema.sql`, `data.sql` und `manifest.json` auf Existenz und
   Nicht-Leerheit pruefen.
3. Docker daemon pruefen.
4. Lokal vorhandenes Docker Image pruefen.
5. Temporaeren Container starten.
6. Minimalen Supabase-Rollen-Bootstrap nur im temporaeren Container anwenden.
7. `roles.sql`, `schema.sql` und `data.sql` via `psql` in den Container
   einspielen.
8. `restore-smoke-result.json` in den Backup-Ordner schreiben.
9. Container stoppen.

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

Tooling Environment:

```text
Supabase CLI available: yes, 2.107.0
Docker available: yes, CLI 29.6.1 and daemon 29.6.1
psql available: yes, PostgreSQL 18.4
pg_dump available: yes, PostgreSQL 18.4
Restore Drill feasible: tooling feasible; execution pending local DB URL
Blocker: NEEDS_USER_LOCAL_DB_URL
```

Ausgefuehrt:

- Startcheck: gruen.
- Tooling erstellt.
- Node Syntax Checks fuer beide Scripts: gruen.
- Kein Backup erzeugt, weil `LIFE_OS_LOCAL_DB_URL` in der Codex-Shell nicht
  gesetzt ist.
- Kein Restore-Smoke ausgefuehrt, weil kein Backup-Ordner erzeugt wurde.

Status:

```text
NEEDS_USER_LOCAL_DB_URL
```

## 9. Blocker, falls vorhanden

Aktueller Blocker:

```text
NEEDS_USER_LOCAL_DB_URL
```

Warum:

- Der lokale DB-Connection-String darf nicht aus `.env.local` gelesen werden.
- `supabase status` darf nicht offen ausgegeben werden, weil es lokale Keys
  enthalten kann.
- Die Codex-Shell enthaelt `LIFE_OS_LOCAL_DB_URL` nicht.

Sichere Fortsetzung lokal:

```bash
LIFE_OS_LOCAL_DB_URL='<local-postgres-connection-string>' pnpm backup:local:create
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

1. Owner setzt `LIFE_OS_LOCAL_DB_URL` lokal in der Shell, ohne den Wert zu
   committen oder zu posten.
2. Owner fuehrt `pnpm backup:local:create` aus.
3. Owner fuehrt mit dem erzeugten Ordner
   `pnpm backup:local:restore-smoke backups/local-drills/<timestamp>` aus.
4. Owner prueft `git status --short`; `backups/` darf nicht auftauchen.
5. Falls Restore-Smoke `PASS_WITH_COMPATIBILITY_BOOTSTRAP` meldet, ist der
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
