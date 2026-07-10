# W1.1B Production Readiness Closure Plan

Stand: 2026-07-10
Status: Production readiness gates defined; no production action executed
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, `docs/product/final-product-completion-roadmap.md`, R1.9.x Readiness-Dokumente und W1.1A Browser-Proof-Recovery.
Nicht gilt fuer: Produktfeatures, UI-Rekomposition, Migrationen, RLS-/Policy-Aenderungen, Remote-DB-Aktionen, Deployment, echte Backups oder Secrets.

## 1 Zweck

Dieses Dokument schliesst W1.1B als Planungs- und Readiness-Block.

Ziel:

- Production-Readiness-Gates nach W1.1A inventarisieren.
- Offene Remote-, Deployment-, Backup/Restore-, Performance- und
  Accessibility-Gates in ausfuehrbare Folgebloecke schneiden.
- Release-Claim-Regeln so festlegen, dass lokale Proofs nicht als Production
  Readiness missverstanden werden.

Entscheidung:

```text
Life OS ist lokal proof-stable.
Life OS ist noch nicht production-ready.
```

W1.1B.2 Reconciliation 2026-07-10:

```text
Personal Operational Readiness = aktiv
Optional Private Remote Readiness = spaeter optional
Public Production Readiness = Nicht-Ziel
```

Die historischen Production-Readiness-Dateinamen bleiben als Dokumentationspfad
bestehen. Inhaltlich werden die W1.1B-Gates ab W1.1B.2 fuer eine persoenliche
Owner-only-App neu interpretiert: local-first ist der empfohlene Pfad, private
remote ist optional, Public SaaS ist kein Ziel.

## 2 Nicht-Ziele

W1.1B fuehrt nicht aus:

- keine Remote Supabase Aktion
- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset` gegen Remote oder Zielumgebung
- kein Deployment
- kein Lesen, Erzeugen oder Dokumentieren von Production Secrets
- keine Service-Role-Nutzung
- keine Produktfeatures
- keine UI-Aenderung
- keine Migration
- keine RLS-/Policy-Aenderung
- keine neue Library
- keine MCP-Installation
- kein Export, Backup, Restore oder Dump echter Nutzerdaten

## 3 Ausgangslage nach W1.1A

W1.1A ist lokal abgeschlossen:

- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed,
  2 skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed,
  0 skipped, 0 failed.
- Core- und Extensions-DB-Write-/Reload-Proofs sind lokal wieder aktuell
  belastbar.

R1.9.x Readiness-Stand:

- R1.9.1: lokaler RLS-/Grants-/Ownership-Audit ist abgeschlossen.
- R1.9.2: Backup-/Export-/Restore-Strategie und lokale Export-Hygiene sind
  definiert.
- R1.9.3: Deployment-Env-Boundary und lokale/Production-Supabase-Grenzen sind
  dokumentiert.
- R1.9.4: lokale Performance-Baseline ist dokumentiert.
- R1.9.5: lokaler Accessibility-Pass fuer MVP-Core-Hauptflows ist dokumentiert.

Nicht bewiesen:

- keine Remote-/Production-Supabase-Realitaet
- keine Target-Env-Verifikation
- kein Deployment-Rehearsal
- keine Production-Backup-Konfiguration
- kein Restore-Drill
- keine Production-Performance-Baseline
- kein Production-Accessibility-Claim
- keine externe AI-Provider-Governance
- keine Export-/Import-Implementierung
- kein Production-Monitoring-/Logging-Claim

## 4 Production-Gates

### Remote Supabase Audit

Status: `blocked_needs_remote_access`

- Warum offen: W1.1B darf keine Remote-DB lesen, linken, pushen oder resetten.
- Was bewiesen ist: lokaler RLS-/Grants-/Ownership-Stand ist nach R1.9.1
  auditiert; lokale Supabase lint/advisors waren in den R1.9.x-/W1.1A-Checks
  gruen.
- Was nicht bewiesen ist: hosted Supabase Projekt, Auth-Redirects,
  Data-API-Exposure, Grants, Advisors, Policies und Migrationstand in einer
  Zielumgebung.
- Risiko: lokaler PASS kann von Remote-Konfiguration, Auth-Settings, Grants
  oder Projekt-Policies abweichen.
- Einordnung nach W1.1B.2: nicht naechster Pflichtblock; nur bei Option B
  Private Remote als W1.1C-Teil mit explizitem Remote-Scope, Operator-Rollen,
  erlaubten Read-only-Kommandos und No-Service-Role-Regel vorbereiten.

### Target Env Verification

Status: `blocked_needs_target`

- Warum offen: Es gibt keine freigegebene Ziel-URL, Runtime, Env-Matrix oder
  Supabase-Projektzuordnung fuer Production/Staging.
- Was bewiesen ist: R1.9.3 dokumentiert Client-/Server-/Test-Env-Klassen,
  Node-22-Ziel und lokale-vs-Production-Boundary.
- Was nicht bewiesen ist: echte Deployment-Plattform, Domain, Redirect-Allow-
  List, public Supabase URL/Key fuer die Zielumgebung und Runtime-Node-Version.
- Risiko: falsche Env-Werte koennen Auth, Browser-Bundles, Redirects oder
  Manual-Supabase-Flows brechen.
- Einordnung nach W1.1B.2: W1.1B.1 ist erledigt; Target-Env-Entscheidung wird
  erst wieder relevant, wenn Option B Private Remote aktiv gewaehlt wird.

### Deployment Rehearsal

Status: `blocked_needs_target`

- Warum offen: Ohne Target Env gibt es keinen sicheren Deployment-Dry-Run.
- Was bewiesen ist: lokale `pnpm build`-Faehigkeit ist in R1.9.3/R1.9.4
  dokumentiert; Deployment-Checklist existiert.
- Was nicht bewiesen ist: Build in Zielplattform, Runtime-Env, deployed Auth,
  deployed routing, deployed Server Actions und deployed Supabase SSR cookies.
- Risiko: lokale Builds koennen Deployment-spezifische Runtime-, Route-,
  Cookie- oder Env-Probleme nicht abdecken.
- Einordnung nach W1.1B.2: nicht naechster Pflichtblock; Deployment-Rehearsal
  nur bei Option B Private Remote im separaten W1.1C-Plan vorbereiten.

### Production Backup / Restore Drill

Status: `blocked_needs_target`

- Warum offen: Backup-Plan, Zielprojekt, RPO/RTO, Verschluesselung,
  Operator-Zugriff und isolierte Restore-Umgebung sind noch nicht bestaetigt.
- Was bewiesen ist: R1.9.2 definiert Dateninventar, Sensitivity-Klassen,
  Exportformat, Restore-Reihenfolge und lokale Export-Hygiene.
- Was nicht bewiesen ist: echte Backup-Konfiguration, Restore-Faehigkeit,
  Checksum-/Row-Count-Abgleich, Encryption-Key-Management und Cross-User-
  Ownership nach Restore.
- Risiko: produktive Daten koennten ohne geprueften Restore-Pfad nicht
  verlaesslich wiederherstellbar sein.
- Einordnung nach W1.1B.2: lokaler Backup-/Restore-Drill bleibt Pflicht und
  wird als W1.1B.4 Local Backup / Restore Drill geplant.

### Production Performance Baseline

Status: `blocked_needs_target`

- Warum offen: Es gibt keine deployed Route, keine Target-Env-Metriken und
  keine realistische Produktionsdaten-Dichte.
- Was bewiesen ist: R1.9.4 dokumentiert lokale Build-/Runtime-Baseline,
  Repository-/ReadModel-Findings und Manual-DB-Dichte-Risiken.
- Was nicht bewiesen ist: TTFB, route load, interaction latency, hosted
  Supabase Query-Latenzen, Index-/EXPLAIN-Bewertung und Zielgeraete-Performance.
- Risiko: lokale Performance kann Zielplattform, Netzwerk, Supabase-Region,
  Datenvolumen oder Browsergeraete nicht abbilden.
- Einordnung nach W1.1B.2: keine Public Production Performance Baseline fuer
  Local-first; private remote Performance-Fragen nur bei Option B.

### Production Accessibility Claim

Status: `blocked_needs_manual_review`

- Warum offen: Production Accessibility braucht Zielbrowser, Zielgeraete,
  echte Zielumgebung und manuellen Screenreader-/Keyboard-Pass.
- Was bewiesen ist: R1.9.5 erweitert lokale Labels, Button-Namen,
  Fokus-, Status- und Alert-Proofs fuer MVP-Core-Hauptflows.
- Was nicht bewiesen ist: Screenreader-Verhalten in Zielbrowsern,
  mobile Touch-/Focus-Verhalten, Kontrast mit echten Daten, Dialog-/Focus-Traps
  spaeterer Deep Features und deployed Runtime.
- Risiko: lokale Playwright-/DOM-Proofs ersetzen keinen manuellen
  Accessibility-Review in Zielumgebung.
- Einordnung nach W1.1B.2: kein Public Accessibility Claim fuer Local-first;
  Accessibility darf lokal nicht verschlechtert werden, Private-Remote-Review
  nur bei Option B.

### External AI Provider Governance

Status: `blocked_needs_secrets_policy`

- Warum offen: Aktuell ist AI lokal/mock und ohne externe API, Secrets oder
  autonome Writes.
- Was bewiesen ist: lokale AI Suggestions schreiben nicht automatisch und
  nutzen keine externe AI API.
- Was nicht bewiesen ist: Provider-Auswahl, Secrets-Policy, Kostenlimit,
  Logging/Retention, PII-Redaction, Failure-State, Rate-Limit und
  Provider-spezifischer Browser-Proof.
- Risiko: ein externer Provider kann Privacy-, Kosten-, Logging- und
  Compliance-Risiken einfuehren.
- Einordnung nach W1.1B.2: weiterhin spaeterer Governance-Scope; externe AI
  ist nicht Teil von Personal Operational Readiness.

### Export / Import Implementation

Status: `deferred_future`

- Warum offen: `export:local` ist bewusst noch kein echter Export; R1.9.2 ist
  Strategie, nicht Implementierung.
- Was bewiesen ist: Dateninventar, Formatabsicht, Restore-Reihenfolge und
  lokale Artefakt-Hygiene sind dokumentiert.
- Was nicht bewiesen ist: echtes Export-Script, Import-/Restore-Script,
  Checksums, Manifest-Erzeugung, Verschluesselung und Negative Tests fuer
  Cross-User-Restore.
- Risiko: Portabilitaet oder Restore darf nicht behauptet werden, bevor ein
  echter Implementierungs- und Drill-Pfad existiert.
- Einordnung nach W1.1B.2: Export/Import bleibt spaeter; lokaler
  Backup-/Restore-Drill kommt zuerst und ohne echte Nutzerdaten im Repo.

### Monitoring / Logging / Error Handling

Status: `blocked_needs_target`

- Warum offen: Es gibt noch keine Zielplattform, kein Log-Retention-Modell,
  keine Alert-Ziele und keine Production-Error-Boundary-Policy.
- Was bewiesen ist: lokale Success-, Error- und Blocked-Zustaende sind in
  zentralen Flows sichtbarer geworden; Secrets werden nicht in Docs oder
  Client-Env aufgenommen.
- Was nicht bewiesen ist: Production-Logging, PII-Redaction, Error-Sampling,
  Alerting, Runtime-Failures, Deployment-Logs und Backup-Job-Monitoring.
- Risiko: Production-Probleme koennten unbemerkt bleiben oder Logs koennten
  sensible Daten enthalten, wenn Logging nicht vorher begrenzt wird.
- Einordnung nach W1.1B.2: Local-first braucht zunaechst lokale Fehler- und
  Recovery-Dokumentation; Remote Monitoring/Logging nur bei Option B.

## 5 Gate-Statuswerte

Erlaubte Statuswerte:

- `ready_local`: lokal belegt, aber ohne Production-Claim.
- `ready_for_rehearsal`: ausreichend vorbereitet, um mit expliziter Freigabe
  einen begrenzten Rehearsal-/Dry-Run-Block auszufuehren.
- `blocked_needs_target`: blockiert, bis Zielumgebung, Ziel-URL,
  Deployment-Runtime oder Supabase-Projekt eindeutig ist.
- `blocked_needs_secrets_policy`: blockiert, bis Secret-Handling, Operator-
  Rollen und Logging-/Retention-Grenzen geklaert sind.
- `blocked_needs_remote_access`: blockiert, bis ein explizit erlaubter
  Remote-Readiness-Scope existiert.
- `blocked_needs_manual_review`: blockiert, bis ein Mensch Zielbrowser,
  Zielgeraete oder manuelle Review-Schritte ausfuehrt.
- `deferred_future`: bewusst ausserhalb dieses Release-Gates; darf keine
  aktuelle Release-Behauptung tragen.

## 6 Offene Risiken

- Remote Supabase kann von lokalem Schema-/Policy-/Advisor-Stand abweichen.
- Target Env ist unbekannt; Deployment-, Auth- und Runtime-Claims sind deshalb
  nicht belastbar.
- Backup/Restore ist Strategie, aber kein gepruefter Recovery-Pfad.
- Production Performance ist ohne Zielplattform und realistische Datenmenge
  offen.
- Production Accessibility ist ohne Zielbrowser, Zielgeraete und manuellen
  Review offen.
- Externe AI Provider bleiben Privacy-, Kosten-, Logging- und Failure-State-
  Risiko.
- Export/Import und Monitoring/Logging sind noch keine produktionsfaehigen
  Implementierungen.

## 7 Folgebloecke

### W1.1B.1 Target Environment Inventory

Ziel: Zielumgebung ohne Secrets inventarisieren.

Scope:

- Zielplattform, Runtime, Domain und Node-Version dokumentieren.
- Supabase-Projektklasse benennen, ohne Tokens oder Secrets zu dokumentieren.
- Auth Site URL und Redirect-Allow-List als Checkpunkte erfassen.
- Deployment-Rehearsal- und Remote-Audit-Prerequisites festlegen.

Nicht erlaubt:

- kein Deployment
- kein Remote Supabase Link
- kein Secret-Read

Status 2026-07-10:

- Ausgefuehrt in `docs/ops/target-environment-inventory-w1-1b-1.md`.
- Ergebnis: `blocked_needs_target`.
- Known local environment, Zielumgebungsoptionen, Env-/Secret-Inventar,
  Supabase Local-vs-Remote Boundary, Auth-/Redirect-/Domain-Anforderungen,
  Deployment Preflight und Nutzerfragen sind dokumentiert.
- W1.1B.1 waehlt keine Production-Umgebung, fuehrt kein Deployment aus und
  beruehrt keine Remote-DB.

### W1.1B.2 Personal Use Scope Reconciliation

Ziel: bisherigen Production-Readiness-Begriff auf Personal Operational
Readiness korrigieren.

Status 2026-07-10:

- Ausgefuehrt in `docs/product/personal-operational-readiness-w1-1b-2.md`.
- Ergebnis: `PERSONAL_OPERATIONAL_READINESS_SCOPE_DEFINED`.
- Local-first ist kurzfristig empfohlen.
- Private Remote bleibt optional.
- Public SaaS, oeffentliche Registrierung, Public Launch und
  Skalierungsplanung sind Nicht-Ziele.
- Auth, RLS, Backup, Restore, Ownership, Service-Role-Verbot und Secret-Hygiene
  bleiben verbindlich.

### W1.1B.3 Local Personal Operations Runbook

Ziel: lokalen persoenlichen Betrieb als Owner-Runbook dokumentieren.

Scope:

- Start/Stop der App und lokalen Supabase Runtime.
- Lokale Auth-/Manual-Supabase-Grenzen.
- Welche Checks vor Nutzung oder Updates laufen.
- Umgang mit `.env.local`, `.local/**`, Backups, Exports und Playwright-
  Artefakten.
- Recovery- und Troubleshooting-Schritte fuer den Eigentuemer.

Nicht erlaubt:

- kein Deployment
- keine Remote-DB
- keine Secrets dokumentieren

### W1.1B.4 Local Backup / Restore Drill

Ziel: lokalen Backup-/Restore-Pfad fuer persoenliche Daten beweisen.

Scope:

- lokales Backup-Format und Speicherort ohne Repo-Staging
- Restore in isolierte lokale Umgebung oder kontrollierten lokalen Testpfad
- Checksums/Row Counts, falls passend
- RLS-/Ownership-Smoke nach Restore
- Dokumentierte Loesch-/Aufbewahrungsregel fuer lokale Artefakte

Nicht erlaubt:

- keine echten Backup-Artefakte committen
- kein Restore in Remote/Production
- keine Secrets dokumentieren

### W1.1B.5 Optional Private Remote Decision

Ziel: bewusst entscheiden, ob private Remote ueberhaupt gewuenscht ist.

Scope:

- Local-first bleibt ausreichend oder private remote wird gewuenscht.
- Falls remote: Hoster, Supabase Cloud, Domain, Auth nur fuer Eigentuemer,
  keine oeffentliche Registrierung und Datenpolicy entscheiden.
- Falls nicht remote: Remote-Gates bleiben deferred.

Nicht erlaubt:

- kein Deployment
- kein Remote Supabase Zugriff
- kein Public SaaS Scope

Status 2026-07-10:

- Ausgefuehrt in
  `docs/product/optional-private-remote-decision-w1-1b-5.md`.
- Entscheidung: `A: Local-first only for now`.
- Private Remote bleibt als `B: Private Remote later` optional, aber nur nach
  expliziter Nutzerentscheidung und separatem W1.1C-Scope.
- Local-first ist fuer den aktuellen personal-only Betrieb
  `local_first_ready`.
- Kein Deployment, kein Remote Supabase Zugriff, keine Remote-DB, keine
  Secrets, keine Migration, keine RLS-/Policy-Aenderung und kein Public-SaaS-
  Scope.

### W1.1C Private Remote Setup Plan

Ziel: nur bei aktiver Nutzerentscheidung fuer private remote einen separaten
Setup-Plan erstellen.

Scope:

- Remote Supabase Readiness Audit Plan.
- Deployment Rehearsal fuer private Owner-only App.
- Auth Site URL und Redirect-Allow-List.
- Remote Backup/Restore und Monitoring nur im privaten Zielkontext.

Nicht erlaubt:

- keine oeffentliche Registrierung
- kein Public Launch
- keine Remote-Aktion ohne eigenen expliziten Scope

### W1.1B.6 External AI Provider Governance Preflight

Ziel: externe AI erst nach System-Gates bewertbar machen.

Scope:

- Provider-Auswahl, Secrets-Policy, Kostenlimits, Logging/Retention,
  PII-Redaction und Failure-State definieren.
- Mock Provider als lokale Proof-Basis erhalten.

Status: `blocked_needs_secrets_policy`

Scheduling: `deferred_future`, bis P0 Production-System-Gates abgeschlossen
sind.

### W1.1B.7 Export / Import / Monitoring Preflight

Ziel: Portability und Production Operations ohne Datenleck vorbereiten.

Scope:

- Export-/Import-Implementierung, Manifest, Checksums und Verschluesselung
  planen.
- Monitoring-/Logging-Grenzen, PII-Redaction und Alerting-Prinzipien planen.

Status: `deferred_future`

## 8 Empfohlene Reihenfolge

1. W1.1B.2 Personal Use Scope Reconciliation
2. W1.1B.3 Local Personal Operations Runbook
3. W1.1B.4 Local Backup / Restore Drill
4. W1.1B.5 Optional Private Remote Decision
5. F0.1 Final Surface Connected-Claim Review oder F1.0 Calendar Finalization,
   solange Local-first bleibt
6. W1.1C Private Remote Setup Plan, nur wenn der Nutzer Remote will
7. W1.1B.7 Export / Import / Monitoring Preflight, lokal zuerst
8. W1.1B.6 External AI Provider Governance Preflight, spaeter

Begruendung:

- Personal-only ist der neue Zielkontext.
- Local-first braucht zuerst ein Runbook und lokalen Restore Drill.
- Private Remote ist optional und bleibt nach W1.1B.5 deferred, bis der Nutzer
  sie aktiv entscheidet.
- Remote Supabase Audit, Deployment Rehearsal, Production Performance Baseline
  und Public Accessibility Claim sind nicht mehr als naechste Pflichtbloecke zu
  erzwingen.
- Auth, RLS, Backup/Restore, Ownership und Secret-Hygiene bleiben trotz
  kleinerem Scope verbindlich.

## 9 Welche Zugaenge spaeter benoetigt werden

Spaeter benoetigt, aber nicht in W1.1B:

- Zielplattform-Name und Deployment-URL.
- Runtime-/Node-Version der Zielplattform.
- Public Supabase URL und Publishable/Anon Key fuer die Zielumgebung.
- Supabase Projektidentitaet, ohne Service Role in Codex-Kontext.
- Operator-Zugang fuer Read-only Remote-Audit.
- Auth Site URL und Redirect-Allow-List.
- Backup-/Restore-Konfiguration oder Betreiberbestaetigung.
- Geraete-/Browser-/Screenreader-Matrix fuer Accessibility Review.

Geheimnisse duerfen nicht in Dokumente, Chat-Ausgaben, Git-Diffs oder
Playwright-Artefakte geschrieben werden.

## 10 Was nie automatisiert werden darf

- Remote `supabase db reset`.
- Remote `supabase db push` ohne reviewed Migration-/Release-Prozess.
- Lesen oder Ausgeben von `.env.local`, Auth-State-Dateien oder Production
  Secrets.
- Service-Role-Key im Client, in Playwright, in Docs oder in Codex-Kontext.
- Backup-/Export-Artefakte mit echten Nutzerdaten committen.
- Deployment oder Remote-DB-Aktion aus einem docs-only Planungsblock heraus.
- Production Release Claim aus lokalen Checks allein.
- Externe AI Provider ohne Privacy-, Cost-, Logging- und Failure-State-Gate.

## 11 Release-Claim-Regel

Erlaubter Claim nach W1.1B.2:

```text
Life OS ist lokal proof-stable.
Personal Operational Readiness ist der aktive Zielkontext.
Private Remote ist optional.
Public SaaS ist kein Ziel.
```

Nicht erlaubt:

- `public production-ready`
- `public production-release-ready`
- `remote Supabase audited`
- `deployment verified`
- `backup/restore proven`
- `public accessibility passed`
- `public performance baseline passed`
- `public SaaS ready`

Ein privater Remote-Claim ist erst erlaubt, wenn Option B aktiv gewaehlt und
mindestens diese Gates dokumentiert gruen sind:

- Remote Supabase Audit
- Deployment Rehearsal
- Production Backup / Restore Drill
- Private Remote Auth-/Redirect-Pruefung
- Private Remote Backup/Restore- und Monitoring-Grenzen

## 12 Naechster ausfuehrbarer Block

Naechster Block:

```text
F0.1 Final Surface Connected-Claim Review
```

Warum:

- W1.1B.5 bestaetigt Local-first als aktuellen Pfad.
- Vor neuen F1-Slices sollte die lokale Connected-/Partial-/Prepared-
  Claim-Lage nach W1.1A und W1.1B knapp reconciled werden.
- Der Block benoetigt keine Remote-DB, kein Deployment und keine Secrets.
- Danach bleibt F1.0 Calendar Finalization der naechste zentrale Produktblock.

Definition of Done fuer F0.1:

- Surface-Claims sind nach aktuellem Proof-Stand als connected, partial oder
  prepared/deferred klassifiziert.
- Kein neuer Produktumfang, keine UI-Aenderung, keine Remote-DB-Aktion, kein
  Deployment und keine Secrets.
