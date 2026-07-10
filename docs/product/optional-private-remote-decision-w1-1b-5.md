# W1.1B.5 Optional Private Remote Decision

Stand: 2026-07-10
Status: Local-first confirmed; private remote deferred until explicit user decision
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, W1.1B.2 Personal
Operational Readiness, W1.1B.3 Local Personal Operations Runbook, W1.1B.4
Local Backup / Restore Drill, W1.1A Browser-Proof-Recovery und R1.9.x
Readiness-Dokumente.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src`-Aenderungen, Tests,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB-Aktionen, Deployment oder
Secrets.

## 1. Zweck

W1.1B.5 entscheidet, ob Life OS nach dem local-first Operations- und
Backup-/Restore-Block jetzt eine private Remote-Instanz braucht.

Entscheidung:

```text
A: Local-first only for now
```

Private Remote bleibt als spaetere Option erhalten, wird aber in W1.1B.5 nicht
aktiviert, nicht geplant bis zur Ausfuehrung vorbereitet und nicht ausgefuehrt.

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI-Aenderungen
- keine `src`-Aenderungen
- keine Tests aendern
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB
- kein `supabase link`
- kein `supabase db push`
- kein `db reset`
- kein Deployment
- keine Production Secrets lesen oder ausgeben
- keine `.env.local`, `.env`, `.local/**`, `private/**`, `backups/**` oder
  `exports/**` Inhalte lesen
- keine Backup-/Dump-Dateien stagen
- kein Public-SaaS-Scope

## 3. Aktueller Local-first Stand

Bewertung:

```text
local_first_ready
```

Abgesichert fuer den aktuellen personal-only, local-first Betrieb:

- App Build: `pnpm build` gruen.
- Supabase Local: lokale lint/advisors gruen.
- Migrationen: lokaler Migrationspfad ist im Runbook dokumentiert.
- Auth-State Capture: `pnpm auth:playwright:capture` ist als secret-sicherer
  interaktiver lokaler Helper dokumentiert.
- Browser-Proofs: W1.1A ist `CLOSED_CORE_EXTENSIONS_GREEN`; Core 86 passed /
  2 skipped / 0 failed, Extensions 25 passed / 0 skipped / 0 failed.
- Backup Create: lokales Backup-Create-Tooling ist vorhanden und liest den
  DB-Connection-String nur aus `LIFE_OS_LOCAL_DB_URL`.
- Restore-Smoke: bestehender lokaler Backup-Ordner erreicht
  `PASS_WITH_COMPATIBILITY_BOOTSTRAP`.
- Secret-Hygiene: `.env*`, `.local/`, `private/`, `backups/`, `exports/`,
  Dumps und Supabase temp/branches bleiben unversioniert.
- Device Switch Runbook: W1.1B.3 dokumentiert Start, Supabase Local,
  Migrationen, Auth-State Capture, Checks und Backup-/Restore-Grenzen.

Nicht bewiesen:

- keine Remote Supabase Realitaet
- kein Deployment-Rehearsal
- kein vollstaendiger Supabase-Cloud-/Production-Restore
- keine private Remote Auth-/Redirect-Pruefung
- keine remote Backups/PITR
- kein Production Monitoring

## 4. Entscheidungsoptionen

### A: Local-first only for now

Vorteile:

- passt zum personal-only Ziel
- kein Remote-Datenrisiko
- kein Deployment-, Domain-, Redirect- oder Secret-Aufwand
- vorhandene lokale Proof-, Runbook- und Backup-/Restore-Basis reicht fuer den
  naechsten Produktfortschritt

Nachteile:

- Nutzung bleibt an lokalen Rechner und lokalen Devserver gebunden
- Datenverfuegbarkeit unterwegs bleibt manuell ueber lokale Backups/Device-
  Switch-Prozess
- keine Remote-Verfuegbarkeit ohne spaetere Entscheidung

### B: Private Remote later

Vorteile:

- bleibt moeglich, wenn mehrere Geraete, Zugriff unterwegs oder weniger lokaler
  Betriebsaufwand wichtig werden
- kann mit eigenem Setup-Plan, Remote-Audit und Backup-Drill sauber vorbereitet
  werden

Nachteile:

- erhoeht Datenschutz-, Secret-, Auth-, Backup-, Monitoring- und Kostenrisiko
- braucht explizite Freigabe vor jeder Remote-Aktion
- darf lokale Datenmigration nicht erzwingen

### C: Private Remote now

Vorteile:

- wuerde Remote-Zugriff und private Verfuegbarkeit frueher ermoeglichen

Nachteile:

- kein klarer Nutzerentscheid fuer jetzt
- wuerde Remote Supabase, Hosting, Auth Redirects, Backups, Monitoring und
  Secrets sofort in den kritischen Pfad ziehen
- wuerde Produktfortschritt vor zentralen F1-Slices verlangsamen

## 5. Bewertung

Kriterien:

| Kriterium | Bewertung |
| --- | --- |
| Nutzung auf mehreren Geraeten | spaeter relevant, aktuell kein harter Bedarf |
| Nutzung ohne lokalen Devserver | Komfortgewinn, aber nicht zwingend |
| Datenverfuegbarkeit unterwegs | Vorteil fuer Remote, aktuell nicht beauftragt |
| Backup-Komfort | Remote hilft nur mit eigenem Remote-Backup-Drill |
| Wartungsaufwand | Local-first deutlich niedriger |
| Datenschutzrisiko | Local-first niedriger |
| Kosten | Local-first niedriger |
| Komplexitaet | Local-first niedriger |

Ergebnis:

```text
PRIVATE_REMOTE_NEED=not_now
```

## 6. Empfehlung

Empfohlen:

```text
A: Local-first only for now
```

Private Remote bleibt:

```text
B: Private Remote later, only after explicit user decision
```

Nicht empfohlen:

```text
C: Private Remote now
```

Begruendung:

- Der local-first Pfad ist fuer den aktuellen personal-only Betrieb ausreichend
  dokumentiert und validiert.
- Die naechsten wertvolleren Arbeiten liegen in Produkt- und Connected-Claim-
  Klarheit, nicht in Remote-Infrastruktur.
- Private Remote wuerde neue Security-, Backup-, Auth- und Deployment-Gates
  eroeffnen, ohne aktuellen Zwang.

## 7. Falls Local-first: naechste Produktbloecke

Naechster empfohlener Produktpfad:

```text
F0.1 Final Surface Connected-Claim Review
```

Danach:

```text
F1.0 Calendar Finalization
```

F0.1 ist sinnvoll, weil W1.1A und W1.1B die lokale Proof- und Operations-Basis
stabilisiert haben. Vor neuen F1-Slices sollte einmal kompakt geklaert werden,
welche Surface-Claims nach W1.1A/W1.1B lokal connected, partial oder bewusst
prepared bleiben.

## 8. Falls Private Remote spaeter: Voraussetzungen

Minimaler Private-Remote-Scope fuer spaeter:

- Hosting: Vercel oder vergleichbare Next.js-faehige Plattform.
- DB/Auth: separates Supabase Cloud Projekt.
- Auth: owner-only.
- Remote DB: leer starten, keine automatische lokale Datenmigration.
- Public Sign-up: deaktiviert oder strikt kontrolliert.
- Domain: optional spaeter.
- Backups: eigener Remote-Backup-/Restore-Drill.
- Monitoring: Plattformlogs zuerst, mit PII-/Secret-Grenzen.

Pflicht vor jeder Remote-Aktion:

- ausdrueckliche Nutzerentscheidung fuer Private Remote
- W1.1C Private Remote Setup Plan
- Remote Supabase Readiness Audit Plan
- Deployment Rehearsal Plan
- Auth Site URL und Redirect-Allow-List
- Remote Backup/Restore und Monitoring-Grenzen
- Secret-Handling ohne Service-Role im Client, Browser, Playwright oder Docs

## 9. Falls Private Remote jetzt: notwendige Folgebloecke

Nicht gewaehlt in W1.1B.5.

Falls spaeter doch "jetzt" entschieden wird, muessen vor Ausfuehrung eigene
Bloecke entstehen:

1. W1.1C.1 Remote Supabase Project Plan
2. W1.1C.2 Private Hosting / Deployment Rehearsal Plan
3. W1.1C.3 Owner-only Auth / Redirect Audit
4. W1.1C.4 Remote Backup / Restore Drill Plan
5. W1.1C.5 Private Remote Monitoring / Logging Boundary

Keiner dieser Bloecke ist durch W1.1B.5 freigegeben.

## 10. Sicherheitsgrenzen

- Private Remote ist nicht Public SaaS.
- Private Remote darf keine lokale Datenmigration erzwingen.
- Public Sign-up bleibt Nicht-Ziel.
- Keine Remote-Aktion ohne separate explizite Nutzerfreigabe.
- Kein Deployment aus einem Entscheidungsblock.
- Kein `supabase link`, kein `supabase db push`, kein Remote `db reset`.
- Keine Production Secrets, Service Role Keys, `.env.local`, `.local/**`,
  `private/**`, Backup- oder Dump-Inhalte in Codex-Kontext, Docs, Chat oder
  Git-Diffs.
- Lokale Checks duerfen keinen Remote-/Production-Claim tragen.

## 11. Naechste Entscheidung

Naechste Entscheidung:

```text
Proceed with local-first product completion work.
```

Empfohlene Reihenfolge:

1. F0.1 Final Surface Connected-Claim Review.
2. F1.0 Calendar Finalization.
3. W1.1C Private Remote Setup Plan nur, wenn der Nutzer private Remote aktiv
   will.

Abschlussstatus:

```text
OPTIONAL_PRIVATE_REMOTE_DECISION_DONE
LOCAL_FIRST_CONFIRMED
PRIVATE_REMOTE_DEFERRED_UNTIL_EXPLICIT_DECISION
PUBLIC_SAAS_NOT_A_GOAL
NO_REMOTE_ACTION
NO_DEPLOYMENT
NO_SECRET_READ
```
