# W1.1B.2 Personal Operational Readiness

Stand: 2026-07-10
Status: Personal scope reconciled; no deployment or remote action executed
Quelle der Wahrheit: `AGENTS.md`, `PRODUCT.md`, `SECURITY.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md`, `docs/product/production-readiness-closure-plan-w1-1b.md`, `docs/ops/target-environment-inventory-w1-1b-1.md` und R1.9.x Readiness-Dokumente.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src`-Aenderungen, Tests, Migrationen, RLS-/Policy-Aenderungen, Remote-DB-Aktionen, Deployment oder Secrets.

## 1. Zweck

W1.1B.2 korrigiert den Zielkontext der bisherigen Production-Readiness-
Planung.

Neue Leitlogik:

```text
Personal Operational Readiness = aktiv
Optional Private Remote Readiness = spaeter optional
Public Production Readiness = Nicht-Ziel
```

Fruehere W1.1B-Dateinamen und historische Readiness-Begriffe bleiben als
Dokumentationspfad bestehen. Inhaltlich werden die Gates ab W1.1B.2 fuer eine
persoenliche Owner-only-App neu interpretiert.

## 2. Neue Nutzerentscheidung

Neue Entscheidung:

```text
Life OS ist eine persoenliche App nur fuer den Eigentuemer.
Keine oeffentliche SaaS.
Keine oeffentliche Registrierung.
Keine Skalierungsplanung.
```

Folgen:

- Local-first ist der kurzfristig empfohlene Zielpfad.
- Private Remote bleibt optional, falls spaeter Zugriff ausserhalb des lokalen
  Rechners gewuenscht ist.
- Public SaaS, Multi-User-Launch, oeffentliche Registrierung und Skalierungs-
  Hardening sind keine aktuellen Ziele.
- Das bestehende `user_id`-/RLS-Modell bleibt trotzdem verbindlich, weil Life
  OS private, sensible und teilweise health-/work-nahe Daten fuehrt.

## 3. Nicht-Ziele

- keine oeffentliche SaaS
- keine oeffentliche Registrierung
- kein Public Launch
- keine Multi-Tenant-Optimierung ueber das vorhandene `user_id`-/RLS-Modell
  hinaus
- keine Skalierungsplanung
- keine Public Production Performance Baseline
- kein Public Accessibility Claim
- kein remote-first Betrieb
- kein Deployment in W1.1B.2
- keine Remote Supabase Aktion in W1.1B.2
- keine Service Role im Client
- keine Secrets im Repo
- keine Produktfeatures, UI-Aenderungen, Tests, Migrationen oder
  RLS-/Policy-Aenderungen

## 4. Personal Operational Readiness

Personal Operational Readiness bedeutet:

- Die App kann vom Eigentuemer verlaesslich lokal betrieben werden.
- Lokale Supabase-, Auth- und Browser-Proof-Basis bleiben nutzbar.
- Datenintegritaet, Backup, Restore und Secret-Hygiene werden ernst genommen.
- Fehler-, Recovery- und Update-Ablauf sind fuer eine einzelne Person
  dokumentiert.
- Es gibt keinen Claim fuer oeffentliche Production, fremde Nutzer,
  Multi-Tenant-Betrieb oder Skalierung.

Weiterhin notwendig:

- Auth bleibt notwendig.
- RLS bleibt notwendig.
- `user_id` Ownership bleibt notwendig.
- Backups bleiben notwendig.
- Restore-Test bleibt notwendig.
- Keine Service Role im Client.
- Keine Secrets im Repo.
- `.env.local`, `.local/**`, `private/**`, Backups und Exporte bleiben
  unversioniert.

## 5. Local-first Zielbild

Bewertung:

```text
A Local-first personal use = kurzfristig empfohlen
```

Zielbild:

- Lokaler Devserver als primaerer Betriebspfad.
- Lokale Supabase Runtime als primaere Datenbasis.
- Lokaler Supabase Auth-State fuer Browser-Proofs und persoenliche Nutzung.
- Lokales Backup-/Restore-Konzept mit dokumentiertem Drill.
- MacBook-Runbook fuer Start, Stop, Update, Validation, Backup, Restore und
  Recovery.

Mindest-Readiness fuer A:

- `pnpm typecheck`, `pnpm lint`, `pnpm build` gruen.
- Supabase local `db lint` und Security Advisors gruen.
- W1.1A lokale Browser-Proofs bleiben gueltige lokale Proof-Basis.
- Local Backup / Restore Drill ist dokumentiert und mindestens einmal mit
  synthetischen oder bewusst freigegebenen lokalen Daten geprueft.
- Runbook klaert, welche Dateien nie committed werden duerfen.

Nicht erforderlich fuer A:

- Remote Supabase Audit.
- Deployment Rehearsal.
- Production Performance Baseline.
- Public Accessibility Claim.
- Public signup hardening.
- Multi-user scaling.

## 6. Optional Private Remote Zielbild

Bewertung:

```text
B Private remote personal use = spaeter optional
```

Zielbild:

- Vercel oder anderer Hoster fuer die Next.js App, wenn Remote-Zugriff
  gewuenscht wird.
- Supabase Cloud oder anderes kontrolliertes Remote-DB/Auth-Ziel.
- Auth nur fuer den Eigentuemer.
- Keine oeffentliche Registrierung.
- Remote-DB startet leer oder wird kontrolliert migriert.
- Remote Secrets bleiben ausserhalb des Repos.
- Remote Setup bekommt eigenen Plan und eigene Freigabe.

Wenn B gewaehlt wird, werden wieder relevant:

- Remote Supabase Readiness Audit.
- Auth Site URL und Redirect-Allow-List.
- Deployment Rehearsal.
- Remote Backup/PITR oder kontrollierter Restore Drill.
- Private Remote Monitoring/Error Logging mit PII-/Secret-Grenzen.

Nicht erlaubt fuer B:

- Public signup.
- Service Role im Client.
- Remote `supabase db push` ohne reviewed Release-Prozess.
- Remote DB Reset.
- Production Claim aus lokalen Checks allein.

## 7. Public SaaS als Nicht-Ziel

Bewertung:

```text
C Public SaaS / multi-user production = deferred / not a goal
```

Nicht-Ziel:

- keine fremden Nutzer
- keine oeffentliche Registrierung
- kein Public Launch
- keine Mandantenverwaltung
- keine Multi-Tenant-Skalierungsoptimierung
- keine SaaS-Monitoring-, Billing-, Support- oder Abuse-Prevention-Planung
- keine Public Accessibility- oder Public Performance-Freigabe

Falls C spaeter doch gewuenscht wird, ist das ein neuer Produkt- und
Security-Scope, nicht eine Fortsetzung von W1.1B.

## 8. Welche Gates kleiner werden

Diese Gates werden fuer den personal-only Zielkontext kleiner oder optional:

- Target Env Verification: fuer Local-first reicht ein lokales Runbook; private
  remote erst nach separater Entscheidung.
- Remote Supabase Audit: nicht naechster Pflichtblock; nur bei Option B.
- Deployment Rehearsal: nicht naechster Pflichtblock; nur bei Option B.
- Production Performance Baseline: ersetzt durch lokale Operational Checks und
  nur bei spaeterem Remote-Ziel wieder relevant.
- Production Accessibility Claim: kein Public Claim; lokale Accessibility wird
  weiter nicht verschlechtert, ein Public Audit ist kein Personal-Readiness-
  Gate.
- Monitoring/Logging: fuer Local-first kleiner als lokale Fehler-/Recovery-
  Dokumentation; private remote braucht spaeter begrenzte Logs.
- Public Launch Gates: entfallen.
- Multi-user Scale Gates: entfallen.

## 9. Welche Gates bestehen bleiben

Diese Gates bleiben auch fuer personal-only verbindlich:

- Auth: Owner muss sich sicher anmelden koennen; keine selbstgebaute
  Passwortlogik.
- RLS: nutzerspezifische Tabellen bleiben user-scoped und RLS-geschuetzt.
- Ownership: `user_id` und relationale Ownership-Gates bleiben verbindlich.
- Zod/serverseitige Validierung fuer Mutations bleibt verbindlich.
- Service Role darf nicht in Client, Browser, Playwright oder Docs landen.
- Secrets duerfen nicht ins Repo, in Logs, Screenshots oder Chat-Ausgaben.
- Backup bleibt notwendig.
- Restore-Test bleibt notwendig.
- Datenintegritaet und Migration-/Update-Hygiene bleiben notwendig.
- Local browser/reload proofs bleiben Grundlage fuer lokale Funktionsclaims.

## 10. Neue Folgebloecke

Neue Reihenfolge fuer den personal-only Zielkontext:

1. W1.1B.3 Local Personal Operations Runbook
2. W1.1B.4 Local Backup / Restore Drill
3. W1.1B.5 Optional Private Remote Decision
4. W1.1C Private Remote Setup Plan, nur wenn der Nutzer Remote will

Nicht mehr als naechstes zu erzwingen:

- Remote Supabase Audit
- Deployment Rehearsal
- Production Performance Baseline
- Public Accessibility Claim

Diese bleiben nur relevant, wenn Option B aktiv gewaehlt wird oder ein neuer
Public-SaaS-Scope entsteht.

## 11. Empfohlener naechster Block

Empfohlen:

```text
W1.1B.3 Local Personal Operations Runbook
```

Warum:

- Er passt zum neuen personal-only Ziel.
- Er benoetigt keine Remote-DB.
- Er benoetigt kein Deployment.
- Er kann Start/Stop, lokale Supabase, Auth-State, Checks, Backup-Pfade,
  Restore-Vorbereitung und Recovery fuer den Eigentuemer klaeren.
- Er bereitet W1.1B.4 Local Backup / Restore Drill vor.

Nicht empfohlen als naechster Pflichtblock:

- Remote Supabase Audit.
- Deployment Rehearsal.
- Production Performance Baseline.
- Public Accessibility Claim.

Abschlussentscheidung:

```text
PERSONAL_OPERATIONAL_READINESS_SCOPE_DEFINED
LOCAL_FIRST_RECOMMENDED
PRIVATE_REMOTE_OPTIONAL
PUBLIC_SAAS_NOT_A_GOAL
NO_REMOTE_DB
NO_DEPLOYMENT
NO_PRODUCTION_RELEASE_CLAIM
```

## 12. W1.1B.3 Status

Stand: 2026-07-10

- Dokumentiert in
  `docs/ops/local-personal-operations-runbook-w1-1b-3.md`.
- Daily Startup, Supabase Local Operations, Env-/Secret-Hygiene,
  Playwright Auth-State Capture, lokale QA-/Browser-Proof-Routine,
  Device Switch, Backup-Transition und Troubleshooting sind fuer den
  personal-only local-first Betrieb dokumentiert.
- Naechster Block bleibt W1.1B.4 Local Backup / Restore Drill.
- Keine Produktfeatures, keine UI-Aenderungen, keine `src`-Aenderungen, keine
  Tests, keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB, kein
  Deployment und kein Production Release Claim.

## 13. W1.1B.4 Status

Stand: 2026-07-10

- Dokumentiert in `docs/ops/local-backup-restore-drill-w1-1b-4.md`.
- Lokale Backup-/Restore-Tooling-Scripts sind vorbereitet:
  `pnpm backup:local:create` und `pnpm backup:local:restore-smoke`.
- Drill-Ergebnis in Codex: `NEEDS_USER_LOCAL_DB_URL`, weil der lokale
  DB-Connection-String nur aus der Shell-Umgebung gelesen werden darf und in
  dieser Session nicht gesetzt war.
- Keine Backup-Artefakte erzeugt oder committed; kein `.env.local` Zugriff,
  kein `db reset`, keine Remote-DB, kein Deployment, keine Migration und keine
  RLS-/Policy-Aenderung.

## 14. W1.1B.4c Status

Stand: 2026-07-10

- Der lokale Backup-/Restore-Drill erreicht mit einem temporaeren Supabase-
  Rollen-Bootstrap den Status `PASS_WITH_COMPATIBILITY_BOOTSTRAP`.
- Der Bootstrap laeuft nur im isolierten Restore-Smoke-Container und nicht in
  der aktiven lokalen Life-OS-DB.
- Damit ist fuer Personal Operational Readiness ein lokaler logischer
  Restore-Smoke bewiesen.
- Das ist kein Claim fuer vollstaendigen Supabase-Runtime-, Cloud-, Remote-
  oder Production-Restore.
- Optional Private Remote Readiness bleibt ein spaeterer separater Block.
  Remote-DB, Deployment, Migration, RLS-/Policy-Aenderung und `db reset`
  wurden nicht genutzt.

## 15. W1.1B.5 Status

Stand: 2026-07-10

- Dokumentiert in
  `docs/product/optional-private-remote-decision-w1-1b-5.md`.
- Entscheidung: `A: Local-first only for now`.
- Bewertung: `local_first_ready` fuer den aktuellen personal-only Betrieb.
- Private Remote bleibt `B: Private Remote later`, nur nach expliziter
  Nutzerentscheidung und separatem W1.1C-Plan.
- Public SaaS bleibt Nicht-Ziel.
- Keine Remote-DB, kein Deployment, keine Migration, keine RLS-/Policy-
  Aenderung, kein `db reset` und keine Secrets wurden genutzt.

## 16. F0.1 Connected-Claim Review Status

Stand: 2026-07-10

- Dokumentiert in
  `docs/product/final-surface-connected-claim-review-f0-1.md`.
- Local-first bleibt der aktuelle personal-only Pfad.
- Mehrere Kernflows sind lokal connected und mehrere Surfaces werden als
  `local_connected_with_depth_gap` eingeordnet.
- Settings/System bleibt `partial`, weil Production/Remote/Target-Env,
  Monitoring, Privacy-/Backup-Systemtiefe und vollstaendige System-UX nicht
  final verbunden sind.
- F0.1 ist kein Production-, Remote-, Public-SaaS- oder final-complete-Claim.
- Naechster Produktblock: F1.0 Calendar Finalization.
