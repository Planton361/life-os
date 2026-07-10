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
- Benoetigte naechste Aktion: W1.1B.2 als remote-readiness Plan mit explizitem
  Remote-Scope, Operator-Rollen, erlaubten Read-only-Kommandos und
  No-Service-Role-Regel vorbereiten.

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
- Benoetigte naechste Aktion: W1.1B.1 Target Environment Inventory ausfuehren.

### Deployment Rehearsal

Status: `blocked_needs_target`

- Warum offen: Ohne Target Env gibt es keinen sicheren Deployment-Dry-Run.
- Was bewiesen ist: lokale `pnpm build`-Faehigkeit ist in R1.9.3/R1.9.4
  dokumentiert; Deployment-Checklist existiert.
- Was nicht bewiesen ist: Build in Zielplattform, Runtime-Env, deployed Auth,
  deployed routing, deployed Server Actions und deployed Supabase SSR cookies.
- Risiko: lokale Builds koennen Deployment-spezifische Runtime-, Route-,
  Cookie- oder Env-Probleme nicht abdecken.
- Benoetigte naechste Aktion: W1.1B.3 Deployment Rehearsal Dry Run nach
  W1.1B.1/W1.1B.2 planen.

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
- Benoetigte naechste Aktion: W1.1B.4 Backup / Restore Drill Plan erstellen und
  erst danach einen echten Drill in isolierter Umgebung freigeben.

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
- Benoetigte naechste Aktion: W1.1B.5 Production Performance Baseline Plan mit
  Messpunkten und Row-Count-Annahmen definieren.

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
- Benoetigte naechste Aktion: W1.1B.6 Production Accessibility Manual Review Plan
  mit Geraeten, Browsern, Screenreader-Matrix und Abbruchkriterien definieren.

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
- Benoetigte naechste Aktion: separater AI Provider Governance Preflight erst
  nach P0 Production-System-Gates.

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
- Benoetigte naechste Aktion: eigener Export/Import Implementation Slice nach
  Backup/Restore-Drill-Plan, ohne echte Nutzerdaten im Repo.

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
- Benoetigte naechste Aktion: Monitoring/Logging-Preflight nach Target Env
  Inventory und vor Release Claim.

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

### W1.1B.2 Remote Supabase Readiness Audit Plan

Ziel: Remote-Audit als sicheren, explizit freigegebenen Folgeblock planen.

Scope:

- erlaubte Read-only-Pruefungen definieren
- verbotene Kommandos benennen
- Operator-Rolle und No-Service-Role-Regel festlegen
- RLS, Grants, Advisors, Auth-Redirects und Data-API-Exposure als Checkliste
  strukturieren

Nicht erlaubt:

- kein automatischer Remote-Zugriff in diesem Dokument
- kein `supabase db push`
- kein `supabase db reset`

### W1.1B.3 Deployment Rehearsal Dry Run

Ziel: Deployment-Dry-Run ohne Production Release Claim vorbereiten.

Scope:

- Zielplattform-Build ausfuehren
- Env-Werte gegen Inventory pruefen
- Auth- und Server-Action-Smoke in Zielumgebung pruefen
- Browser-Proof nur gegen freigegebene Target URL ausfuehren

Nicht erlaubt:

- kein Production Claim ohne gruenes Gate
- keine produktiven Daten ohne Backup/Restore-Gate

### W1.1B.4 Backup / Restore Drill Plan

Ziel: echten Restore Drill sicher vorbereiten.

Scope:

- RPO/RTO festlegen
- isolierte Restore-Umgebung definieren
- Backup-Quelle, Verschluesselung, Checksums und Row Counts planen
- Restore-Reihenfolge aus R1.9.2 verwenden
- Ownership-/RLS-Smokes nach Restore definieren

Nicht erlaubt:

- keine Backup-Artefakte committen
- keine Secrets dokumentieren
- kein Restore in Production

### W1.1B.5 Production Performance Baseline Plan

Ziel: Production Performance messbar machen.

Scope:

- Routen, Interaktionen und Supabase Queries auswaehlen
- Datenmengen und Row Counts festlegen
- TTFB, route load, interaction latency und hosted Supabase Query-Latenzen
  messen
- Query-/Index-/EXPLAIN-Follow-ups sauber trennen

Nicht erlaubt:

- kein Performance Claim aus lokalen Zahlen allein

### W1.1B.6 Production Accessibility Manual Review Plan

Ziel: Production Accessibility Review reproduzierbar machen.

Scope:

- Zielbrowser, Zielgeraete und Screenreader-Matrix definieren
- Keyboard-only Pass fuer MVP-Core-Hauptflows ausfuehren
- Screenreader-Pass fuer Navigation, Forms, Status und Alerts ausfuehren
- Mobile Touch-/Focus-Checks fuer Zielgeraete dokumentieren

Nicht erlaubt:

- kein Production Accessibility Claim aus Playwright allein

### W1.1B.7 External AI Provider Governance Preflight

Ziel: externe AI erst nach System-Gates bewertbar machen.

Scope:

- Provider-Auswahl, Secrets-Policy, Kostenlimits, Logging/Retention,
  PII-Redaction und Failure-State definieren.
- Mock Provider als lokale Proof-Basis erhalten.

Status: `blocked_needs_secrets_policy`

Scheduling: `deferred_future`, bis P0 Production-System-Gates abgeschlossen
sind.

### W1.1B.8 Export / Import / Monitoring Preflight

Ziel: Portability und Production Operations ohne Datenleck vorbereiten.

Scope:

- Export-/Import-Implementierung, Manifest, Checksums und Verschluesselung
  planen.
- Monitoring-/Logging-Grenzen, PII-Redaction und Alerting-Prinzipien planen.

Status: `deferred_future`

## 8 Empfohlene Reihenfolge

1. W1.1B.1 Target Environment Inventory
2. W1.1B.2 Remote Supabase Readiness Audit Plan
3. W1.1B.3 Deployment Rehearsal Dry Run
4. W1.1B.4 Backup / Restore Drill Plan
5. W1.1B.5 Production Performance Baseline Plan
6. W1.1B.6 Production Accessibility Manual Review Plan
7. W1.1B.8 Export / Import / Monitoring Preflight
8. W1.1B.7 External AI Provider Governance Preflight

Begruendung:

- Target Env muss vor Remote-, Deployment-, Performance- und Accessibility-
  Claims bekannt sein.
- Remote Supabase Audit muss vor produktiven Daten- oder Release-Claims
  stattfinden.
- Backup/Restore muss vor echten produktiven Daten und vor Release Claim
  nachweisbar sein.
- Performance und Accessibility muessen in der Zielumgebung validiert werden.
- Externe AI und Operations-Ausbau duerfen nicht vor P0 Production-System-Gates
  priorisiert werden.

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

Erlaubter Claim nach W1.1B:

```text
Life OS ist lokal proof-stable.
Life OS ist noch nicht production-ready.
```

Nicht erlaubt:

- `production-ready`
- `production-release-ready`
- `remote Supabase audited`
- `deployment verified`
- `backup/restore proven`
- `production accessibility passed`
- `production performance baseline passed`

Ein Production Release Claim ist erst erlaubt, wenn mindestens diese Gates
dokumentiert gruen sind:

- Target Env Verification
- Remote Supabase Audit
- Deployment Rehearsal
- Production Backup / Restore Drill
- Production Performance Baseline
- Production Accessibility Claim
- Monitoring / Logging / Error Handling Preflight

## 12 Naechster ausfuehrbarer Block

Naechster Block:

```text
W1.1B.1 Target Environment Inventory
```

Warum:

- Er benoetigt keine Secrets.
- Er fuehrt keine Remote-DB-Aktion aus.
- Er entscheidet die konkrete Zielumgebung, von der alle spaeteren Production-
  Gates abhaengen.
- Er macht W1.1B.2 bis W1.1B.6 erst sauber ausfuehrbar.

Definition of Done fuer W1.1B.1:

- Zielplattform, Ziel-URL-Typ, Runtime und Node-Version sind dokumentiert.
- Supabase-Zielprojekt ist als Kategorie/Identifier dokumentiert, ohne Secrets.
- Auth Site URL und Redirect-Allow-List sind als Betreiber-Checkpunkte
  erfasst.
- Remote Supabase Audit, Deployment Rehearsal, Backup/Restore, Performance und
  Accessibility haben danach klare Preconditions.
- Keine Remote-DB-Aktion, kein Deployment, keine Secrets und keine
  Production-Claims wurden ausgefuehrt oder dokumentiert.
