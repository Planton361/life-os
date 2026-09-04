# W1.1B.3 Local Personal Operations Runbook

Stand: 2026-07-10
Status: Active local-first operations contract (Z1 runtime update)
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, W1.1B.2 Personal
Operational Readiness, W1.1A Browser-Proof-Recovery, R1.9.1 RLS Audit,
R1.9.2 Backup/Export/Restore Strategy und R1.9.3 Deployment Env Boundary.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src`-Aenderungen, Tests,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB-Aktionen, Deployment oder
Secrets.

## 1. Zweck

Dieses Runbook beschreibt den lokalen persoenlichen Betrieb von Life OS fuer den
Eigentuemer.

Entscheidung:

```text
Dieses Runbook ist fuer persoenliche lokale Nutzung.
Es ersetzt kein Remote Deployment Runbook.
```

Ziel:

- Life OS lokal starten und pruefen.
- Lokale Supabase Runtime, Migrationen und Auth-State sauber bedienen.
- Browser-Proofs lokal und sequenziell ausfuehren.
- Device Switch / MacBook Wechsel ohne Secret- oder Datenverlust vorbereiten.
- Den naechsten Block W1.1B.4 Local Backup / Restore Drill vorbereiten.

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI-Aenderungen
- keine `src`-Aenderungen
- keine Test-Aenderungen
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- kein Deployment
- keine Secrets lesen, ausgeben oder dokumentieren
- keine `.env.local`, `.env`, `.local/**` oder `private/**` Inhalte lesen
- kein Service Role Key
- keine Backup-, Export-, Dump- oder Auth-State-Datei stagen

## 3. Voraussetzungen

Lokale Voraussetzungen:

- Repo lokal vorhanden und auf dem gewuenschten Branch.
- Package Manager laut `package.json`: `pnpm@11.3.0`.
- Erwartete Runtime fuer spaetere Zielumgebungen: Node.js `22.x`.
- Docker/Supabase Local Runtime ist lokal verfuegbar.
- `.env.local` wird lokal manuell aus `.env.example` vorbereitet, ohne echte
  Werte in Git, Chat, Logs oder Docs zu kopieren.
- Die kanonische lokale Target-Runtime hat die Docker-Projekt-ID
  `life-os-sr104b-target`. Sie ist die einzige normale Runtime fuer App,
  Backup und Target-Proofs.
- Der Default-CLI-Stack `life-os-app` ist ein anderer lokaler Stack. Er darf
  nicht als Target angenommen, migriert oder fuer Target-Proofs beschrieben
  werden.
- Legacy-Source-Stacks bleiben ausgeschaltet und read-only fallback. Sie werden
  weder durch den normalen Start noch durch Backup-/Test-Skripte gestartet.
- Lokale App laeuft fuer Auth-State-Capture unter `http://localhost:3000`.
- Lokaler Supabase User existiert oder wird im lokalen Supabase Studio
  angelegt; keine Credentials werden dokumentiert.

Host-Konvention:

```text
localhost bleibt Host-Konvention fuer Playwright Auth-State.
127.0.0.1 ist nicht Storage-/Cookie-Konvention fuer Playwright Auth-State.
```

Hinweis: `supabase/config.toml` enthaelt lokale `127.0.0.1` Auth URLs. Das ist
lokale Supabase-Konfiguration. Fuer Playwright Storage-State und die
Projektkonvention dieses Runbooks bleibt `localhost:3000` massgeblich.

## 4. Daily Local Startup

Tagesroutine:

1. Worktree pruefen.
2. Dependencies nur installieren, wenn `package.json` oder Lockfile geaendert
   wurden oder es ein frischer Checkout ist.
3. Die kanonische Target-Identitaet pruefen.
4. Den guarded Next.js Devserver gegen Target starten.
5. Supabase Session in Settings pruefen.
6. Optional Browser-Proof-Greps sequenziell laufen lassen.

```bash
git status --short
pnpm install
pnpm runtime:target:check
pnpm dev
```

Danach lokal oeffnen:

```text
http://localhost:3000/settings#supabase-session
```

Pruefen:

- Manual Profile ist bewusst gewaehlt, wenn DB-Write-Flows bewiesen werden.
- Supabase Session ist aktiv, wenn Browser-Proofs persistente Writes beweisen
  sollen.
- Fehlende oder abgelaufene Session wird lokal repariert, nicht ueber
  `.env.local`- oder Auth-State-Ausgabe.

Kernablaeufe:

| Ablauf | Befehl | Zweck | Erwartetes Ergebnis | Haeufige Fehler | Nicht committen |
| --- | --- | --- | --- | --- | --- |
| Repo aktualisieren | `git status --short`, optional `git pull` | lokalen Stand kennen und aktualisieren | tracked Worktree bewusst sauber oder bekannte lokale Aenderungen | fremde/unerklaerte Diffs | `private/`, `.local/`, `.env*`, Backup-Artefakte |
| Dependencies installieren | `pnpm install` | Abhaengigkeiten passend zu `package.json`/Lockfile herstellen | install ohne neue Library-Entscheidung | falsche Node/pnpm-Version, lockfile drift | `node_modules/`, `.pnpm-store/` |
| Env vorbereiten | `.env.example` lokal als Vorlage nutzen | Manual Supabase mode konfigurieren | `.env.local` existiert lokal mit echten lokalen Werten | echte Werte in Chat/Diff, fehlende `NEXT_PUBLIC_*` Werte | `.env.local`, `.env`, echte Keys |
| Target pruefen | `pnpm runtime:target:check` | Docker-Labels der kanonischen Target-DB pruefen | `CANONICAL_TARGET_READY`; Default bleibt Different Stack | Target nicht gestartet oder Label passt nicht | keine Runtime-Werte |
| Devserver starten | `pnpm dev` | lokale App bedienen | App erreichbar unter `localhost:3000` | Port belegt, Env fehlt | Build-/Cache-Artefakte |
| Session pruefen | `/settings#supabase-session` | Manual Supabase Auth sichtbar pruefen | aktive Session oder klarer lokaler Fehler | `Missing local Supabase env`, abgelaufene Session | keine Screenshots/Logs mit privaten Daten |
| Auth-State erzeugen | `pnpm auth:playwright:capture` | Playwright Storage-State fuer localhost speichern | `.local/playwright/supabase-auth-state-localhost.json` wird geschrieben | nicht-interaktives Terminal, keine aktive Session | `.local/` |
| Browser-Proofs ausfuehren | zwei Greps aus Abschnitt 8 | lokale DB-Write-/Reload-Proofs bestaetigen | Core/Extensions gruen oder konkrete Skips | parallele Greps, abgelaufener Auth-State, DB-Dichte | `test-results/`, `playwright-report/` |
| Checks vor Commit | Abschnitt 13 | Review-Faehigkeit sichern | Checks gruen | Sandbox-Port/Telemetry-Beschraenkung | generierte lokale Artefakte |

## 5. Supabase Local Operations

`pnpm exec supabase start`, `migration up --local`, `db lint --local` und
`db advisors --local` adressieren aus diesem Repository den Default-CLI-Stack.
Sie sind deshalb keine Target-Operationen. Sie duerfen nur fuer einen bewusst
separaten disposable CLI-Stack verwendet werden; nie still als Target-Proof.

Der normale App-Start ist ausschliesslich:

```bash
pnpm runtime:target:check
pnpm dev
```

`pnpm dev` prueft den Target-Container per nicht-sensitiven Docker-Labels und
bezieht die lokalen Public-Client-Werte intern aus genau diesem Stack. Die
Werte werden weder ausgegeben noch gespeichert. `pnpm dev:raw` ist nur eine
Diagnose-Fluchtklappe und kein Target-Proof.

Eine beabsichtigte Forward-Migration auf das kanonische Target erfolgt nur
ueber den gleich geschuetzten Pfad:

```bash
pnpm runtime:target:migrate
```

Der Befehl prueft die Target-Identitaet vor dem Schreiben, verwendet einen
ephemeren CLI-Kontext fuer genau diesen Docker-Stack, wendet ausschliesslich
die Git-Migrationskette regulär an und prueft danach Migration-List, DB-Lint
und Security-Advisors. Er repariert keine History und startet, resettet oder
veraendert keinen Legacy- oder Default-CLI-Stack.

Optional lokal:

```bash
pnpm exec supabase status
pnpm exec supabase stop
```

Regeln:

- `supabase status` kann lokale Keys oder URLs ausgeben. Ausgabe lokal lesen,
  aber nicht in Chat, Diffs oder Docs kopieren.
- `supabase stop` ist erlaubt, wenn keine lokale Proof-Session laeuft.
- `supabase db reset` ist kein Standardbetrieb und braucht eine explizite
  Entscheidung, weil lokale Daten, Auth-State-Annahmen und Proof-Historie
  betroffen sind.
- Kein `supabase link`, kein `supabase db push`, keine Remote Query und keine
  Remote Migration aus diesem Runbook.
- Supabase lint/advisors sind lokale Readiness Checks, kein Remote Audit.

## 6. Env / Secret Hygiene

Versioniert:

- `.env.example` mit Platzhaltern.
- `supabase/config.toml` mit lokaler Service-Konfiguration.
- Docs, die nur Pfade und Klassen dokumentieren.

Nicht versioniert:

- `.env`
- `.env.local`
- `.env.*.local`
- `.local/**`
- `supabase/.temp/**`
- `supabase/.branches/**`
- `exports/**`
- `backups/**`
- `*.dump`
- `*.sql.gz`
- `*.backup`
- `test-results/**`
- `playwright-report/**`

Regeln:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` sind browser-visible public Werte, keine
  Service Role Secrets.
- `SUPABASE_SERVICE_ROLE_KEY` darf nicht in Client, Playwright, Docs, Chat oder
  Browser-Bundle gelangen.
- Future-only Provider Keys und Export Encryption Keys bleiben ausserhalb des
  aktuellen App-Runtime-Scopes.
- Auth-State-Dateien sind lokale sensitive Testartefakte; Pfade duerfen
  dokumentiert werden, Inhalte nie.

## 7. Playwright Auth-State Capture

Technische Sign-up-Proofs muessen einen disposable Stack nutzen:

```bash
pnpm test:e2e:isolated tests/e2e/n1-nutrition-loop.spec.ts
```

Der Runner startet einen eigenen Supabase-CLI-Stack unter `.local/`, spielt nur
die versionierten Migrationen ein, setzt die Public-Client-Werte nur im
Kindprozess und entfernt den Stack danach. `signUpTechnicalManualUser` bricht
ohne diese Isolation vor dem Write ab. Damit bleiben technische Accounts und
Rows ausserhalb der persoenlichen Target-Runtime.

Command fuer einen bewusst vorhandenen, manuellen Auth-State:

```bash
pnpm auth:playwright:capture
```

Ablauf:

1. Lokale Supabase Runtime starten.
2. Lokale Migrationen anwenden.
3. App mit `pnpm dev` unter `http://localhost:3000` starten.
4. In einem zweiten interaktiven lokalen Terminal
   `pnpm auth:playwright:capture` ausfuehren.
5. Der Helper oeffnet Chromium headed auf
   `http://localhost:3000/settings#supabase-session`.
6. Der User loggt sich manuell mit lokalen Supabase-Credentials ein.
7. Keine Credentials in Chat, Logs, Docs oder Terminalausgaben schreiben.
8. Erst nach sichtbarer aktiver Supabase Session im Terminal Enter druecken.
9. Der Helper schreibt nur
   `.local/playwright/supabase-auth-state-localhost.json`.
10. `.local/` nicht stagen.

Sicherheitsgrenzen:

- Der Helper liest keine `.env.local`.
- Der Helper liest keine bestehende `.local/playwright/*.json`.
- Der Helper gibt keine Cookies, Tokens, LocalStorage-Werte, Supabase Keys,
  User-IDs, E-Mail-Adressen oder Auth-State-Inhalte aus.
- Der Helper braucht ein interaktives Terminal. In einer nicht-interaktiven
  Codex-Session ist `Interactive terminal required` der erwartete Blocker.

Troubleshooting:

- `Missing local Supabase env`: `.env.local` lokal aus `.env.example`
  vorbereiten; keine Werte dokumentieren.
- Keine Supabase Session: `/settings#supabase-session` pruefen, lokal neu
  anmelden oder Session zuruecksetzen.
- Sign up schlaegt fehl: lokale Supabase Runtime pruefen; falls noetig User im
  lokalen Supabase Studio anlegen.
- `localhost` vs `127.0.0.1`: Capture und Browser-Proofs mit `localhost`
  ausfuehren; Storage/Cookies muessen zum Host passen.
- `Interactive terminal required`: Helper lokal in einem echten Terminal
  starten, nicht in einem nicht-interaktiven Agentenprozess.

## 8. Local QA / Browser Proof Routine

Standardchecks:

```bash
git diff --check
pnpm typecheck
pnpm lint
pnpm build
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none
```

Browser-Proofs, wenn UI-/Persistenzverhalten bewiesen werden soll:

Technische Sign-up-Specs verwenden den isolierten Runner, zum Beispiel:

```bash
pnpm test:e2e:isolated tests/e2e/n1-nutrition-loop.spec.ts
```

Ein direkter Aufruf dieser Specs wird vor dem technischen Sign-up abgewiesen.
Die folgenden vorhandenen Auth-State-Greps bleiben ein bewusst manueller
Target-Proof und erstellen keine technischen Accounts:

```bash
PLAYWRIGHT_HOST=localhost \
PLAYWRIGHT_PORT=3000 \
PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json \
pnpm exec playwright test tests/e2e/content-state-system.spec.ts \
--grep "Manual|Inbox|Today|Dashboard|Calendar|Portfolio"
```

```bash
PLAYWRIGHT_HOST=localhost \
PLAYWRIGHT_PORT=3000 \
PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json \
pnpm exec playwright test tests/e2e/content-state-system.spec.ts \
--grep "Resources|Nutrition|Skill|AI|Recurring"
```

Regeln:

- Greps sequenziell ausfuehren.
- Nicht parallel mit gemeinsamen `.local` Fixtures ausfuehren.
- Full E2E ist optional und kein Ersatz fuer gezielte Flow-Proofs.
- Docs-only Blocks brauchen keinen Playwright-Lauf, wenn keine UI, Form,
  Navigation, Persistenz, Prepared State oder Target-Env-URL bedient wird.
- Browser-Proof darf keine globale Textsuche als alleinigen Persistenzbeweis
  verwenden; konkrete Region, Auswahl und Reload-Stabilitaet bevorzugen.

## 9. Device Switch / MacBook Wechsel

Wechsel auf ein anderes Geraet:

```bash
git pull
pnpm install
pnpm runtime:target:check
pnpm dev
pnpm auth:playwright:capture
```

Danach die zwei Browser-Proof-Greps aus Abschnitt 8 sequenziell ausfuehren,
falls lokale DB-Write-Proofs gebraucht werden.

Wichtig:

- Git bringt Code, Migrationen und Doku.
- Git bringt keine lokalen Daten.
- Git bringt keine `.env.local`.
- Git bringt keinen Playwright Auth-State.
- Git bringt keine lokalen Supabase Runtime-Artefakte.
- `.env.local` wird auf dem neuen Geraet manuell und geheim gesetzt.
- Auth-State wird auf dem neuen Geraet neu gecaptured.
- Lokale Supabase Daten sind geraeteabhaengig, bis W1.1B.4 einen konkreten
  lokalen Backup-/Restore-Drill beschreibt.

## 10. Local Data / Backup Transition

Aktueller Stand:

- Lokale Supabase Daten sind geraeteabhaengig.
- Kein `db reset` ohne explizite Entscheidung.
- Backups, Exports, Dumps und Restore-Artefakte duerfen nicht committed werden.
- `pnpm export:local` ist aktuell bewusst nur Platzhalter und exportiert keine
  Daten.
- W1.1B.4 erstellt den konkreten Local Backup / Restore Drill.

Referenz:

```text
docs/security/backup-export-restore-strategy-r1-9-2.md
```

Bis W1.1B.4 gilt:

- Keine echten Nutzerdaten in Docs, Git, Screenshots oder Chat.
- Keine Backup- oder Export-Artefakte unter versionierten Pfaden.
- Keine lokale Manual-DB per Reset bereinigen, nur um Proofs zu erleichtern.
- Testdaten-Dichte wird ueber robuste Proof-Selektoren und eindeutige Titel
  behandelt, nicht ueber globales Loeschen.

## 11. Troubleshooting Matrix

| Fall | Symptom | Wahrscheinliche Ursache | Loesung | Was nicht tun |
| --- | --- | --- | --- | --- |
| Missing local Supabase env | `/settings#supabase-session` zeigt fehlende Env | `.env.local` lokal nicht gesetzt oder public Supabase Werte fehlen | `.env.local` lokal aus `.env.example` vorbereiten | `.env.local` oeffentlich posten, stagen oder in Docs kopieren |
| Supabase laeuft nicht | App kann lokale DB/Auth nicht erreichen | Docker oder lokale Supabase Runtime nicht gestartet | `pnpm exec supabase start` lokal ausfuehren | `supabase link` oder Remote-Projekt nutzen |
| Migrationen fehlen | Tabellen/Spalten/RPCs fehlen lokal | frischer Checkout oder lokale Runtime hinter Migrationen | `pnpm exec supabase migration up --local` | `supabase db push` oder Remote-Migration ausfuehren |
| Auth-State fehlt/abgelaufen | Manual DB Write Controls skippen oder Session ist inaktiv | `.local/playwright/...` fehlt oder JWT/Storage-State ist abgelaufen | `pnpm auth:playwright:capture` lokal interaktiv neu ausfuehren | Auth-State-Inhalte lesen, refresh tokens ausgeben oder `.local/` stagen |
| Playwright Browser nicht interaktiv | `Interactive terminal required` | Capture laeuft in nicht-interaktiver Session | Helper in lokalem Terminal mit headed Browser starten | Credentials in Chat/Logs eingeben |
| `localhost`/`127.0.0.1` mismatch | Cookies/Storage-State werden nicht angewendet | Auth-State wurde fuer anderen Host erzeugt | Capture und Greps mit `PLAYWRIGHT_HOST=localhost` wiederholen | Hosts mischen und daraus App-Fehler ableiten |
| Turbopack build port/process permission in Sandbox | `pnpm build` scheitert mit `binding to a port` / `Operation not permitted` | Sandbox blockiert Turbopack Prozess-/Portzugriff | denselben lokalen Build ausserhalb der Sandbox ausfuehren | als Code- oder CSS-Fehler werten, ohne lokalen Gegenlauf |
| Supabase CLI telemetry write requires local/escalated run | CLI scheitert auf `/home/.../.supabase/telemetry...` mit `EROFS` | Sandbox blockiert CLI-Telemetrie-/Cache-Write | denselben lokalen Supabase-Befehl ausserhalb der Sandbox ausfuehren | Remote DB nutzen oder Telemetriefehler als Schemafehler werten |
| Manual DB ist dicht / Testdaten akkumulieren | frische Objekte stehen nicht sichtbar oben, Empty-Gates skippen | lokale Manual-Proofs schreiben bewusst persistente Daten | eindeutige Titel, scoped Assertions und Reload-Proofs nutzen | globales `supabase db reset` ohne Freigabe |
| Core/Extensions Greps skippen unerwartet | viele Skips statt DB-Write-Proofs | Auth-State fehlt/abgelaufen, Manual Session inaktiv oder Empty-State-Dichte | `/settings#supabase-session` pruefen, Auth-State neu capturen, Greps sequenziell wiederholen | parallele Greps starten oder Skips als connected proof ausgeben |

## 12. Pre-Work Checklist

- [ ] `git status --short` geprueft.
- [ ] Nur erwartete lokale/untracked Artefakte vorhanden.
- [ ] `.env.local`, `.env`, `.local/**` und `private/**` nicht gelesen.
- [ ] Scope enthaelt keine Produktfeatures, UI-Aenderungen, Migrationen oder
      Remote-Aktionen.
- [ ] Lokale Supabase Runtime gestartet, falls DB-Checks oder Browser-Proofs
      gebraucht werden.
- [ ] Lokale Migrationen mit `pnpm exec supabase migration up --local`
      angewendet, falls Runtime frisch ist.
- [ ] Auth-State-Capture nur lokal interaktiv geplant, falls Browser-Proofs
      DB-Writes beweisen sollen.
- [ ] Kein `db reset`, kein `supabase link`, kein `supabase db push`.

## 13. Pre-Commit Checklist

- [ ] `git diff --check`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm exec supabase db lint --local --level warning`
- [ ] `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`
- [ ] Browser-Proof ausgefuehrt oder bei docs-only konkret als nicht noetig
      begruendet.
- [ ] Keine `.env*`, `.local/`, `private/`, Supabase CLI-Artefakte,
      Backups/Exports/Dumps, Screenshots oder Playwright-Reports gestaged.
- [ ] Nur Scope-Dateien gestaged.

## 14. Next Block: Local Backup / Restore Drill

Naechster Block:

```text
W1.1B.4 Local Backup / Restore Drill
```

Ziel fuer W1.1B.4:

- lokalen Backup-/Restore-Pfad konkret definieren.
- Export-/Dump-Ort ausserhalb versionierter Pfade bestaetigen.
- Restore in isolierter lokaler Umgebung oder kontrolliertem lokalen Testpfad
  beweisen.
- Row Counts, Checksums oder vergleichbare Integritaetschecks festlegen.
- RLS-/Ownership-Smoke nach Restore ausfuehren.
- Aufbewahrung und Loeschung lokaler Artefakte dokumentieren.

Weiterhin nicht erlaubt:

- echte Backup-Artefakte committen.
- Restore in Remote/Production.
- Secrets dokumentieren.
- Production- oder Remote-Readiness aus lokalem Runbook allein behaupten.

Status 2026-07-10:

- W1.1B.4 ist dokumentiert in
  `docs/ops/local-backup-restore-drill-w1-1b-4.md`.
- Backup- und Restore-Smoke-Tooling ist vorbereitet:
  `pnpm backup:local:create` und `pnpm backup:local:restore-smoke`.
- Drill-Ausfuehrung bleibt lokal offen mit `NEEDS_USER_LOCAL_DB_URL`, weil der
  lokale DB-Connection-String nur aus der Shell-Umgebung gelesen werden darf.
- Keine Backup-Artefakte wurden committed; kein `db reset`, keine Remote-DB,
  keine Migration, keine RLS-/Policy-Aenderung und kein Deployment.

W1.1B.4b Status 2026-07-10:

- Restore-Smoke-Container-Readiness wurde im Helper stabilisiert.
- `pg_isready` wartet jetzt per TCP auf die Maintenance-DB `postgres` und
  bestaetigt Readiness nach kurzer Stabilitaetswartezeit.
- Restore-Smoke erreicht nun den SQL-Restore-Pfad und blockiert praezise mit
  `BLOCKED_RESTORE_SMOKE_SQL_COMPATIBILITY` bei `restore roles`, weil die
  generische Postgres-Umgebung eine Supabase-Rolle erwartet.
- Aktive lokale Life-OS-DB bleibt unveraendert; keine Backup-Dumps werden
  gestaged oder dokumentiert.

W1.1B.4c Status 2026-07-10:

- Restore-Smoke nutzt jetzt einen minimalen Supabase-Rollen-Bootstrap nur im
  temporaeren Restore-Smoke-Container.
- Der Bootstrap deckt lokale logische Restore-Kompatibilitaet fuer Supabase-
  Rollen ab, darunter `anon`, `authenticated`, `service_role`,
  `authenticator`, `supabase_admin`, `supabase_auth_admin` und
  `dashboard_user`.
- Ergebnis gegen `backups/local-drills/20260710T173943Z`:
  `PASS_WITH_COMPATIBILITY_BOOTSTRAP`.
- Dieser Status beweist einen lokalen logischen Restore-Smoke, aber keinen
  vollstaendigen Supabase-Runtime-, Remote-, Cloud- oder Production-Restore.
- Aktive lokale Life-OS-DB bleibt unveraendert; kein `db reset`, keine
  Remote-DB, keine Migration, keine RLS-/Policy-Aenderung und kein Deployment.
