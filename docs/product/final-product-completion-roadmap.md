# Final Product Completion Roadmap

Stand: 2026-07-07
Status: Active
Zweck: Final-Completion-Roadmap fuer Life OS nach W1.0F UI / Function Debt Audit.
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ROADMAP.md`, `AI_WORKFLOW.md`, `docs/ai-workflow/life-os-agent-workflow-v2.md`, `docs/ai-workflow/ui-function-debt-audit-w1-0f.md`.
Gilt fuer: finale Produktreihenfolge, Surface-Zielzustaende, Proof-Strategie und naechste Vertical Slices.
Nicht gilt fuer: Produktfeatures, `src/`, Migrationen, RLS-/Policy-Aenderungen, MCP-Installation oder Remote-DB-Aktionen.

## 1. Zweck

Dieses Dokument uebersetzt den UI-/Function-Debt aus W1.0F in eine
ausfuehrbare Completion-Roadmap fuer die finale Life-OS-Anwendung.

Ziel:

- finale Zielzustaende je Surface definieren
- P0/P1/P2/P3 Debt in Vertical Slices ordnen
- den ersten ausfuehrbaren Folgeblock festlegen
- Proof-, Design-, Backend- und MCP-Strategie fuer die naechste Arbeit
  verbindlich einordnen

Dieses Dokument baut keine Features und aendert keine Produktflaechen.

## 2. Nicht-Ziele

- keine UI-Aenderungen
- keine `src/`-Aenderungen
- keine Migrationen
- keine RLS-/Policy-/Grant-Aenderungen
- keine Remote-DB-Aktionen
- kein `supabase link`, `supabase db push` oder `supabase db reset`
- keine MCP-Installation
- keine User-Home-Konfiguration
- keine neue Library
- keine Secrets, `.env.local`, Auth-State-Dateien oder `private/` lesen

## 3. Final Product Definition

Produktmodell:

```text
Dashboard = Steuerung
Bereichsseiten = Kontext
Detailseiten = Tiefe
Archiv = Vergangenheit
```

Die finale Life-OS-Anwendung ist erreicht, wenn:

- die UI V5-konform, ruhig, funktional dicht und nicht generisch ist
- Dashboard P0 mit Today Agenda und Daily Control dominiert
- Bereichsseiten Kontext liefern, aber keine Dashboard-Kopie werden
- Detailseiten echte Tiefe fuer kanonische Entities liefern
- zentrale Buttons entweder persistieren, navigieren oder ehrlich
  Prepared/Future sind
- Core-Daten real user-scoped persistiert werden
- Reload-Proofs fuer alle Write- und Projection-Flows aktuell sind
- Browser-Proofs aktuell und nicht skip-lastig sind
- Backend-Pfade serverseitige Auth, Zod, same-user Ownership und Revalidation
  nutzen
- Manual, Demo und Empty getrennt bleiben
- Production-Hardening abgeschlossen oder als blockierender Release-Risiko-
  Zustand dokumentiert ist

Finale Completion heisst nicht, dass jede spaetere Idee implementiert ist. Es
heisst, dass sichtbare Produktversprechen, Datenpfade, Proofs und Produktions-
Grenzen wahr sind.

## 4. Surface Target States

| Surface | Current Status | Final Target State | Missing Vertical Slices | Proof Requirement | Design Requirement | Backend Requirement | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | partial | V5-Steuerung mit belastbaren Daily-Control-, Today-Agenda-, Quick-Thought- und Projektion-Claims | Browser-Proof Recovery; ggf. Dashboard final polish | Quick Thought, Agenda, Daily Control und Projektionen non-skip und reload-stabil | V5 locked; P0 bleibt dominant | ReadModels und Actions bleiben user-scoped; keine Fachkopien | P0/P1 |
| Inbox | partial | Raw Capture wird sicher geroutet; alle sichtbaren verbundenen Routen persistieren oder sind klar prepared | Browser-Proof Recovery; remaining routing completion fuer Note/Decision/Skill nach separater Entscheidung | Capture, Task, Project, Goal, Resource, Archive und AI review flow non-skip | Outcome Router bleibt Arbeitssystem, keine generische Queue | Inbox Actions/RPCs mit Auth, Ownership, idempotenten Resolve-Pfaden | P0/P1 |
| Today | partial | Tagesausfuehrung und Daily Record zeigen echte geplante, wiederkehrende und abgeschlossene Arbeit | Browser-Proof Recovery; Review-depth slice | Plan, complete, recurring projection und reload auf Today/Dashboard/Calendar | Today ergaenzt Dashboard, dupliziert es nicht | Task, Recurring und Daily-Record-Pfade user-scoped | P0/P1 |
| Calendar | partial | Zeitliche Projektion mit final entschiedener Interaction: Drag/Resize oder bewusst keyboard/button-first | Calendar Finalization | Schedule, reschedule, unschedule, conflict gate, 15-min controls, ggf. drag/resize proof | Temporal Planning Surface; keine Chart- oder Kalender-Dekoration | Task schedule fields, conflict scope, revalidation | P1 |
| Portfolio | partial | Steuerungsbereich fuer Tasks, Projects, Goals und Skills mit echter Tiefe statt nur Uebersicht | Browser-Proof Recovery; Project/Goal Workbench Depth | Task lifecycle, contextual create, Skill/Evidence und Workbench actions non-skip | Sammel- und Steuerungsbereich, kein Coding Showcase | Task/Project/Goal/Skill repositories und relation labels user-scoped | P1 |
| Projects | partial | Project Detail/Workbench mit Milestones, Logs, Resources und Review-Kontext oder bewusst final deferred | Project/Goal Workbench Depth | Linked task create/lifecycle plus neue Depth-Flows reload-stabil | Detailseite = Tiefe; Prepared-Zonen abbauen oder klar halten | Project ownership gates fuer linked work/resources/logs | P1 |
| Goals | partial | Goal Detail/Workbench mit Review Cadence, Milestones, linked Projects, linked Tasks und Logs | Project/Goal Workbench Depth | Linked project/task flows plus review-depth proof | Zielarbeit mit Progress aus echter Arbeit, keine fake Key Results | Goal ownership gates fuer linked work/reviews/logs | P1 |
| Resources | partial | Knowledge Workbench mit realen Relations und spaeter semantischem Graph-ReadModel | Resource/Skill Graph; relation proof refresh | Resource create/relation non-skip; graph assertions scoped | Graph ist Entscheidungs-/Kontextwerkzeug, keine dekorative Node Map | Resource relation query model, labels, pagination/scope | P1/P2 |
| Nutrition | partial | Nutrition ist health-sensitive, persistiert Recipes/Meals und fuehrt Deep Features nur mit klaren Grenzen | Nutrition Deep Features | Recipe/Meal non-skip; Planner/Grocery/Ingredients/Macros reload proof | Dichte funktional, nicht medizinisch uebergriffig | Nutrition repositories, date scopes, ownership, privacy | P1 |
| Skills | partial | Skills und Evidence bilden echte, reviewbare Kompetenznachweise; Graph bleibt semantisch | Resource/Skill Graph; skill proof refresh | Skill/Evidence CRUD and source linking non-skip | Skill Map kein AI-Behauptungsgraph | Evidence source ownership, labels, query scopes | P1/P2 |
| Recurring | partial | Wiederkehrende Arbeit ist Template + explizite oder bewusst gesteuerte Instanzen | Recurring Full Management | Template create/update/deactivate/generate idempotent and reload-stable | Routine UI ohne Gamification-Druck | Template ownership, generation idempotency, no auto-write surprise | P2 |
| AI Suggestions | partial / prepared honestly | AI bleibt Review-Schicht; externe Provider nur mit Privacy, Logging, Cost und no-auto-write Governance | AI Provider Governance | Suggestions no auto-write; provider failure states; confirm-only persistence | AI UI darf nicht autonom oder magisch wirken | Provider boundary, server-only secrets, prompt/logging policy | P2 |
| Settings/System | partial | Systemflaeche klaert Auth, Session, Env, Backup/Restore, Privacy und Production Claims | Production Readiness Closure | Target-env proof, backup/restore drill, production browser proof | Systemstatus ruhig und konkret, kein alarmistisches Dashboard | Remote audit, backup config, deployment boundaries | P0 |

## 5. P0/P1/P2/P3 Priorisierung

P0 = finale Nutzbarkeit oder Glaubwuerdigkeit blockiert.

- W1.1A Browser Proof Recovery / Non-Skipped DB Write Proofs.
- W1.1B Production Readiness Closure Plan.

P1 = zentrale finale Produktfunktion fehlt oder ist zu flach.

- F1.0 Calendar Finalization.
- F1.1 Project/Goal Workbench Depth.
- F1.2 Nutrition Deep Features.
- F1.3 Resource/Skill Graph Read Model.
- F1.4 Route-level Manual/Auth Feedback.

P2 = wichtige Tiefe oder Erweiterung fuer die volle Anwendung.

- F2.0 External AI Provider Governance.
- F2.1 Recurring Full Management.
- F2.2 Archive Browser and Undo.
- F2.3 Production Performance and Query Scope Hardening.

P3 = spaetere Automatisierung, Optimierung oder Komfort.

- F3.0 Automation and Background Jobs.
- F3.1 Imports/Exports Automation.
- F3.2 Analytics and Reports.
- F3.3 Graph Layout Polish after data semantics are proven.

Reihenfolgeregel:

```text
Erst Proof und Production Claims stabilisieren.
Dann zentrale Interaktionstiefe.
Dann Graph, AI und Automation.
```

## 6. Vertical Slice Roadmap

### W1.1A

Titel: Browser Proof Recovery / Non-Skipped DB Write Proofs

Ziel: aktuelle DB-Write Browser-Proofs mit deutlich weniger Skips
wiederherstellen und Connected Claims wieder belastbar machen.

Surfaces: Dashboard, Inbox, Today, Calendar, Portfolio, Resources, Nutrition,
Skills, Recurring.

Use Skills:

- `life-os-browser-proof`
- `life-os-completion-gate`
- `life-os-vertical-slice`

Files likely touched:

- `tests/e2e/content-state-system.spec.ts`
- `docs/qa/*`
- eventuell Playwright/helper-nahe Testdateien
- keine Produkt-UI, keine `src/`-Featureaenderung ohne separaten Scope

Acceptance Criteria:

- Core-Grep und Extensions-Grep laufen mit deutlich weniger unerwarteten Skips.
- DB-Write-Flows fuer Inbox, Task, Project, Goal, Resource, Nutrition,
  Skill/Evidence, Recurring und Calendar/Today Projection haben aktuelle
  Reload-Proofs.
- Skips sind auf echte, benannte Environment- oder Datenzustandsgruende
  reduziert.
- Kein `supabase db reset` als Standard.

Validation:

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- die zwei bestehenden Playwright-Greps mit lokaler Auth-State-Konvention

Risk:

- Lokale Auth-State-Datei kann ablaufen.
- Gefuellte Manual-DB kann globale Selector- oder Listenannahmen brechen.
- Cleanup darf nicht private oder manuell angelegte Daten loeschen.

W1.1A Live-Status 2026-07-07:

- Dokumentiert in `docs/qa/browser-proof-recovery-w1-1a.md`.
- Ergebnis: `BLOCKED_AUTH_STATE`.
- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 40 passed,
  48 skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 11 passed,
  14 skipped, 0 failed.
- Keine Surface wurde auf `connected` hochgestuft; DB-Write-Claims bleiben
  partial/stale historical, bis der lokale Playwright-Supabase-Auth-State nach
  Projektkonvention erneuert ist.

W1.1A Closure-Status 2026-07-09:

- Dokumentiert in `docs/qa/browser-proof-recovery-w1-1a.md`.
- Ergebnis: `CLOSED_CORE_EXTENSIONS_GREEN`.
- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed,
  2 skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed,
  0 skipped, 0 failed.
- Lokale DB-Write- und Reload-Proofs sind fuer W1.1A wieder aktuell belastbar;
  Production-Readiness und Remote-/Target-Env-Claims bleiben W1.1B.

### W1.1B

Titel: Production Readiness Closure Plan

Ziel: Production-Readiness-Claims in konkrete Abschlusskriterien uebersetzen:
Target Env, Remote Security, Backup/Restore, Production Browser Proof,
Accessibility und Performance.

Surfaces: Settings/System, Supabase boundary, deployment docs, QA docs.

Use Skills:

- `life-os-completion-gate`
- `life-os-browser-proof`, wenn target-env proof geplant oder ausgefuehrt wird

Files likely touched:

- `docs/ops/*`
- `docs/security/*`
- `docs/qa/*`
- `docs/product/final-product-completion-roadmap.md`

Acceptance Criteria:

- Production release blockers sind konkret, owner-faehig und validierbar.
- Remote-DB-Aktionen bleiben verboten, bis ein separater Scope freigegeben ist.
- Backup/Restore Drill, production accessibility and production performance
  haben klare DoD.

Validation:

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- Supabase local lint/advisors, wenn DB-Kontext bewertet wird

Risk:

- Production readiness kann nicht vollstaendig lokal bewiesen werden.
- Remote-/target-env Schritte brauchen spaetere explizite Freigabe.

W1.1B Closure-Plan Status 2026-07-10:

- Dokumentiert in `docs/product/production-readiness-closure-plan-w1-1b.md`.
- Entscheidung: Life OS ist lokal proof-stable, aber noch nicht
  production-ready.
- Production Gates sind inventarisiert: Remote Supabase Audit, Target Env
  Verification, Deployment Rehearsal, Backup/Restore Drill, Production
  Performance, Production Accessibility, External AI Provider Governance,
  Export/Import und Monitoring/Logging.
- Naechster ausfuehrbarer Block: W1.1B.1 Target Environment Inventory.
- Keine Remote-DB-Aktion, kein Deployment, keine Migration, keine RLS-/Policy-
  Aenderung und kein Production Release Claim.

W1.1B.1 Target Environment Inventory Status 2026-07-10:

- Dokumentiert in `docs/ops/target-environment-inventory-w1-1b-1.md`.
- Ergebnis: `blocked_needs_target`, weil Zielhosting, Remote Supabase Projekt,
  Domain, Preview-Strategie, Auth Redirects, Backup/Restore und Monitoring
  noch Nutzerentscheidungen brauchen.
- Kein Deployment, keine Remote-DB-Aktion, keine Secrets, keine Migration,
  keine RLS-/Policy-Aenderung und kein Production Release Claim.

W1.1B.2 Personal Operational Readiness Status 2026-07-10:

- Dokumentiert in `docs/product/personal-operational-readiness-w1-1b-2.md`.
- Neue Zielinterpretation: Life OS ist personal-only, local-first und keine
  oeffentliche SaaS.
- Private Remote bleibt optional; Public SaaS, oeffentliche Registrierung,
  Public Launch und Skalierungsplanung sind Nicht-Ziele.
- Auth, RLS, Backup, Restore, Ownership, Service-Role-Verbot und Secret-Hygiene
  bleiben verbindlich.
- Naechster empfohlener Block: W1.1B.3 Local Personal Operations Runbook.

W1.1B.3 Local Personal Operations Runbook Status 2026-07-10:

- Dokumentiert in `docs/ops/local-personal-operations-runbook-w1-1b-3.md`.
- Lokaler personal-only Betrieb ist als Owner-Runbook dokumentiert: Daily
  Startup, Supabase Local Operations, Env-/Secret-Hygiene, Playwright
  Auth-State Capture, lokale QA-/Browser-Proof-Routine, Device Switch,
  Backup-Transition und Troubleshooting.
- Naechster empfohlener Block: W1.1B.4 Local Backup / Restore Drill.
- Kein Deployment, keine Remote-DB-Aktion, keine Secrets, keine Migration,
  keine RLS-/Policy-Aenderung und kein Production Release Claim.

W1.1B.4 Local Backup / Restore Drill Status 2026-07-10:

- Dokumentiert in `docs/ops/local-backup-restore-drill-w1-1b-4.md`.
- Local-first Backup-/Restore-Tooling ist vorbereitet:
  `pnpm backup:local:create` und `pnpm backup:local:restore-smoke`.
- Drill-Ausfuehrung bleibt lokal offen mit `NEEDS_USER_LOCAL_DB_URL`; der
  Connection String darf nur aus der Shell-Umgebung kommen und wurde nicht aus
  `.env.local` gelesen.
- Keine Backup-Artefakte committed, kein `db reset`, keine Remote-DB-Aktion,
  keine Migration, keine RLS-/Policy-Aenderung, kein Deployment und kein
  Production Release Claim.

W1.1B.5 Optional Private Remote Decision Status 2026-07-10:

- Dokumentiert in
  `docs/product/optional-private-remote-decision-w1-1b-5.md`.
- Entscheidung: Local-first bleibt der aktuelle Pfad; Private Remote ist
  deferred bis zu einer expliziten Nutzerentscheidung.
- Local-first ist fuer den aktuellen personal-only Betrieb als
  `local_first_ready` bewertet.
- Public SaaS bleibt Nicht-Ziel; keine Remote-DB-Aktion, kein Deployment,
  keine Migration, keine RLS-/Policy-Aenderung und kein Secret-Zugriff.
- Naechster empfohlener Produktpfad: optional F0.1 Final Surface
  Connected-Claim Review vor F1.0 Calendar Finalization.

F0.1 Final Surface Connected-Claim Review Status 2026-07-10:

- Dokumentiert in
  `docs/product/final-surface-connected-claim-review-f0-1.md`.
- Ergebnis: `PASS_WITH_DEFERRED`.
- W1.1A Core `86 passed, 2 skipped, 0 failed` und Extensions `25 passed,
  0 skipped, 0 failed` sind in Surface-Claims uebersetzt.
- Dashboard, Inbox, Today, Calendar, Portfolio, Projects, Goals, Resources,
  Nutrition, Skills, Recurring und lokale AI Suggestions sind nicht mehr
  pauschal stale `partial`, sondern `local_connected_with_depth_gap`.
- Settings/System bleibt `partial`, weil Production/Remote/Target-Env,
  Monitoring, Privacy-/Backup-Systemtiefe und vollstaendige System-UX nicht
  final verbunden sind.
- F0.1 behauptet kein `final complete`, kein Production Ready, kein Remote
  Ready und keinen Public-SaaS-Status.
- Naechster ausfuehrbarer Produktblock: F1.0 Calendar Finalization.

F1.0A Calendar Finalization Scope Lock Status 2026-07-10:

- Dokumentiert in
  `docs/product/calendar-finalization-scope-f1-0a.md`.
- Ergebnis: Calendar Finalization ist als Docs-/Scope-Lock gestartet; keine
  Produktfeatures, keine UI-/`src`-Aenderungen, keine Tests, keine Migration,
  keine Remote-DB und kein Deployment.
- Entscheidung: Button-/Keyboard-Scheduling ist der finale Kern; Pointer
  Drag/Resize bleibt ein spaeterer Komfort-Slice.
- F1.0B Calendar UX/Copy/State Clarity wurde am 2026-07-11 umgesetzt; der
  naechste Calendar-Block ist F1.0C Scheduling Proof Hardening oder F1.0D
  Conflict/Override Finalization.

### F1.0

Titel: Calendar Finalization

Ziel: Calendar finalisieren: Pointer Drag/Resize umsetzen oder bewusst als
nicht-finales Ziel ablehnen und die vorhandene 15-Minuten-/Keyboard-Interaktion
als finale Interaction festschreiben.

Surfaces: Calendar, Today, Dashboard.

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- `src/features/calendar/**`
- `src/features/real-data/actions/task.actions.ts`
- `tests/e2e/content-state-system.spec.ts`
- Calendar-/QA-Doku

Acceptance Criteria:

- Schedule, unschedule, reschedule, conflict and final interaction path are
  reload-stable.
- Accessibility path is documented and tested.
- No hidden time-block writes.

Validation:

- project checks plus focused Calendar Playwright proof

Risk:

- Pointer interaction can create accessibility and mobile complexity.

F1.0A Scope Lock Status 2026-07-10:

- F1.0A dokumentiert Current State, finalen Zielzustand, Pointer-Entscheidung,
  Design-/Backend-/Proof-Gaps und die F1.0B-F1.0F Slice-Struktur.
- F1.0A implementiert nichts; die erste Umsetzung ist F1.0B Calendar
  UX/Copy/State Clarity.

F1.0B Calendar UX/Copy/State Clarity Status 2026-07-11:

- Dokumentiert in `docs/qa/calendar-ux-state-clarity-f1-0b.md` und
  `docs/product/calendar-finalization-scope-f1-0a.md`.
- Calendar Create ist als vorbereiteter lokaler Preview-State markiert; freie
  Calendar Events bleiben deferred.
- Queue, Timegrid und Scheduled Task Blocks sind textlich getrennt.
- Manual Task Scheduling bleibt der echte Button-/Keyboard-Kern ueber
  Queue/Inspector und bestehende Task Actions.
- Conflict/Override Copy stellt klar, dass das Gate nur gegen geladene
  sichtbare Zeitbloecke prueft und keine DB-weite Sperre ist.
- Focused Browser Proof `Calendar|Today|Dashboard|Manual`: 71 passed, 2
  skipped, 0 failed.
- Keine Pointer Drag/Resize-Implementierung, keine Migration, keine
  RLS-/Policy-Aenderung, keine Remote-DB-Aktion, kein Deployment und keine
  Secrets.
- Naechster Calendar-Block: F1.0C Calendar Scheduling Proof Hardening oder
  F1.0D Conflict/Override Finalization, falls weitere Tiefe gewuenscht ist.

F1.0C Calendar Scheduling Proof Hardening Status 2026-07-11:

- Dokumentiert in `docs/qa/calendar-scheduling-proof-hardening-f1-0c.md` und
  `docs/product/calendar-finalization-scope-f1-0a.md`.
- Existing Calendar Scheduling Proofs wurden gehaertet, ohne neue Calendar-
  Features, App-Code, Backend-Code oder Layout-Scope.
- Queue Scheduling, exakte scheduled Range, `15 min frueher`,
  `15 min spaeter`, `Dauer +15 min`, `Dauer -15 min`, Unschedule,
  Today Activity, Today Planner Absenz, Dashboard Today Agenda und sichtbares
  Conflict Blocking sind scoped und reload-stabil abgedeckt.
- Gezielter Proof der drei geaenderten Manual Calendar Tests: 3 passed,
  0 failed.
- Focused Full-Grep `Calendar|Today|Dashboard|Manual`: 71 passed, 2 skipped,
  0 failed.
- Override-Ausfuehrung, DB-weite Conflict-Sperre, Override-Audit, Pointer
  Drag/Resize und freie Calendar-Event-Persistenz bleiben deferred.

F1.0D Calendar Conflict / Override Finalization Status 2026-07-11:

- Dokumentiert in `docs/qa/calendar-conflict-override-finalization-f1-0d.md`
  und `docs/product/calendar-finalization-scope-f1-0a.md`.
- Sichtbare Conflict-Semantik ist finalisiert: Conflict Gate prueft nur
  geladene sichtbare Calendar ViewModel Blocks und behauptet keine DB-weite
  Sperre.
- Override ist als bewusste Nutzerentscheidung getrennt: `Trotzdem
  terminieren` nutzt denselben Task-Reschedule-Pfad, ohne neuen
  Backend-Override-Contract.
- Gezielter Conflict-/Override-Proof: 2 passed, 0 failed.
- Focused Full-Grep `Calendar|Today|Dashboard|Manual`: 72 passed,
  2 skipped, 0 failed.
- Projektchecks, Build und lokale Supabase Lint/Security Advisors: passed.
- DB-weite Conflict-Sperre, Override-Audit/Schedule-History, Pointer
  Drag/Resize und freie Calendar-Event-Persistenz bleiben deferred.

F1.0E Calendar Today / Dashboard Projection Review Status 2026-07-11:

- Dokumentiert in `docs/qa/calendar-projection-review-f1-0e.md` und
  `docs/product/calendar-finalization-scope-f1-0a.md`.
- Projection-Semantik ist geprueft: Calendar Queue/Timed Blocks, Today Planner,
  Today Activity und Dashboard Today Agenda folgen weiter den Task-Feldern
  `planned_date`, `scheduled_start_at`, `duration_minutes` und `completed_at`.
- Proofs wurden test-only gehaertet: planned-only zeigt Dashboard `Flexible`,
  scheduled zeigt exakte Zeit-/Dauer-Copy, unscheduled kehrt in Today/
  Dashboard als flexible Tagesaufgabe zurueck, completed verschwindet nach
  Reload aus Dashboard/Calendar active views und reopened erscheint wieder.
- Conflict Override projiziert nach bewusstem Override auch nach Today und
  Dashboard als scheduled Task.
- Gezielter Projection-Proof: 6 passed, 0 failed.
- Focused Full-Grep `Calendar|Today|Dashboard|Manual`: 72 passed,
  2 skipped, 0 failed.
- Projektchecks, Build und lokale Supabase Lint/Security Advisors: passed.
- DB-weite Conflict-Sperre, Override-Audit/Schedule-History, Calendar
  Inspector `Mark done` scheduled-block Deep-Proof, Pointer Drag/Resize und
  freie Calendar-Event-Persistenz bleiben deferred.

### F1.1

Titel: Project/Goal Workbench Depth

Ziel: Project and Goal prepared sections turn into real depth or remain
explicitly deferred with final copy and no fake promise.

Surfaces: Portfolio, Projects, Goals.

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- `src/features/portfolio/**`
- `src/features/entities/**`
- `src/features/real-data/actions/**`
- `src/features/real-data/supabase/repositories/**`
- tests and QA docs

Acceptance Criteria:

- Milestones/logs/resources/review cadence either persist and reload or stay
  explicitly prepared.
- Linked work remains user-scoped.
- Project and Goal detail depth is not a Dashboard copy.

Validation:

- project checks plus focused Portfolio/Project/Goal browser proofs

Risk:

- Scope can sprawl into a second project-management app if not tightly sliced.

### F1.2

Titel: Nutrition Deep Features

Ziel: Nutrition beyond Recipes/Meals decide and implement the next true depth:
Grocery, Ingredients, Macros or Planner Edit, one slice at a time.

Surfaces: Nutrition Overview, Meal Planner, Recipes, Grocery.

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- `src/features/nutrition/**`
- `src/features/real-data/actions/nutrition.actions.ts`
- nutrition schemas/repositories
- tests and QA docs

Acceptance Criteria:

- Health-sensitive data is user-scoped.
- New writes have reload-proof.
- UI avoids medical advice claims and external API assumptions.

Validation:

- project checks plus focused Nutrition browser proofs

Risk:

- Nutrition can become too broad; choose one data model expansion per block.

### F1.3

Titel: Resource/Skill Graph Read Model

Ziel: Graph work starts with relation semantics, query/read model and proof,
not with decorative visualization.

Surfaces: Resources, Skills, Portfolio, Coding Skill Map.

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- `src/features/resources/**`
- `src/features/portfolio/**`
- `src/features/coding/skill-map/**`
- real-data repositories/actions if persistence changes
- tests and QA docs

Acceptance Criteria:

- Graph claims map to real Resource/Skill/Project/Goal/Task relations.
- Missing relations show honest empty states.
- No graph library added without a separate decision.

Validation:

- project checks plus Resource/Skill scoped browser proofs

Risk:

- Visual graph can become decorative before data semantics are correct.

### F1.4

Titel: Route-level Manual/Auth Feedback

Ziel: Every write-capable route clearly states whether Manual/Supabase-backed
writes are currently possible and why actions are disabled.

Surfaces: Inbox, Today, Calendar, Portfolio, Resources, Nutrition, Skills,
Recurring, Settings/System.

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- route shells and feature pages for affected surfaces
- existing auth/manual notice components
- tests and QA docs

Acceptance Criteria:

- Disabled write controls have visible reasons.
- Demo/Empty/Manual boundaries stay clear.
- No product feature is added under the feedback work.

Validation:

- project checks plus focused route feedback browser proof

Risk:

- Feedback copy can become noisy if repeated in every panel instead of route-
  level context.

### F2.0

Titel: External AI Provider Governance

Ziel: Define and implement AI provider boundary only after privacy, logging,
cost, no-auto-write and failure handling are accepted.

Surfaces: Inbox AI, Resources AI Suggestions, future Coding/Agent surfaces.

Use Skills:

- `life-os-vertical-slice`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- AI provider boundary docs
- server-only provider code if separately approved
- tests and QA docs

Acceptance Criteria:

- External provider never writes without user confirmation.
- Secrets remain server-only and are never logged.
- Mock provider remains available for local proof.

Validation:

- project checks plus provider/no-provider browser proof

Risk:

- Privacy and logging risk is high; this must not precede P0/P1 proof work.

### F2.1

Titel: Recurring Full Management

Ziel: Template list, edit, deactivate and future generation controls without
automatic surprise writes.

Surfaces: Today, Calendar, Portfolio, Settings/System.

Use Skills:

- `life-os-vertical-slice`
- `life-os-browser-proof`
- `life-os-completion-gate`

Files likely touched:

- `src/features/today/**`
- recurring real-data actions/repositories
- tests and QA docs

Acceptance Criteria:

- Template lifecycle is manageable.
- Generation stays idempotent.
- Automation remains off unless a later block explicitly enables it.

Validation:

- project checks plus focused Recurring browser proof

Risk:

- Automation pressure can undermine user trust if generation becomes implicit.

## 7. First Executable Block

First block:

```text
W1.1A Browser Proof Recovery / Non-Skipped DB Write Proofs
```

Goal:

- aktuelle DB-Write Browser-Proofs ohne grosse Skip-Last wiederherstellen
- klaeren, ob W1.0F-Skips durch abgelaufenen Auth-State, Test-Harness-Gates,
  Manual-DB-Dichte oder echte Produkt-/Route-Probleme entstehen

Scope:

- Inbox
- Task Create
- Project Create
- Goal Create
- Resource Create
- Nutrition Recipe/Meal
- Skill/Evidence
- Recurring Generate
- Calendar/Today/Dashboard Projection

Nicht-Ziele:

- keine neuen Features
- keine UI-Rekomposition
- keine Migration, ausser zwingend und separat freizugeben
- kein `supabase db reset`
- keine Remote-DB
- kein Lesen oder Ausgeben von Secrets/Auth-State

Codex Task Brief:

```text
Goal:
Recover current non-skipped local Browser-Proofs for Life OS DB-write flows.

Use Skills:
- life-os-browser-proof
- life-os-vertical-slice
- life-os-completion-gate

Context:
W1.0F live greps passed with no failures but skipped many Manual DB write
proofs. Historical QA shows broader non-skipped proof. Determine whether the
current skip load is auth-state, environment, selector, data-density, or app
behavior.

Files to Read:
- AGENTS.md
- AI_WORKFLOW.md
- docs/ai-workflow/life-os-agent-workflow-v2.md
- docs/ai-workflow/ui-function-debt-audit-w1-0f.md
- docs/product/final-product-completion-roadmap.md
- docs/qa/manual-db-test-data-hygiene.md
- docs/qa/r1-6-5-real-browser-auth-check.md
- tests/e2e/content-state-system.spec.ts
- playwright.config.ts

Files to Change:
- tests/e2e/content-state-system.spec.ts
- docs/qa/* only if proof notes change

Files Not to Change:
- src/** unless a separately confirmed product bugfix scope is opened
- supabase/migrations/**
- private/
- docs/product/life-os-full-roadmap-checklist.md
- .env.local
- .local/**

Hard Boundaries:
- no product features
- no UI recomposition
- no remote DB
- no supabase link, db push or db reset
- no secrets or auth-state output
- no MCP installation

Vertical Slice Scope:
This is proof recovery, not feature implementation. A flow may only be called
connected when the existing UI/action/repository path is exercised in browser,
the result survives reload, and the assertion is scoped to the concrete region.

Done When:
- Core and Extension grep results are materially less skip-heavy, or every
  remaining skip has a precise, honest blocker.
- DB-write flows listed in scope have current reload-proof or documented
  blocker.
- No new product behavior is introduced.

Validation:
- git diff --check
- pnpm typecheck
- pnpm lint
- PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Inbox|Today|Dashboard|Calendar|Portfolio"
- PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resources|Nutrition|Skill|AI|Recurring"

Staging:
Stage only test/proof docs changed for W1.1A. Do not stage .local, private,
env files, screenshots, traces, exports, backups or generated Next artifacts.

Report Format:
Erstellt:
Geaendert:
Nicht geaendert:
Validierung:
Browser-Proof:
Remaining Skips:
Nicht geloest:
Risiken:
```

Akzeptanz:

- Core und Extensions Browser-Proofs laufen mit deutlich weniger unerwarteten
  Skips.
- DB-Write-Flows haben aktuelle Reload-Proofs.
- Connected Claims sind wieder belastbarer.
- Persistente lokale Testdaten werden mit eindeutigen Prefixes und scoped
  Assertions behandelt.

## 8. Proof Strategy

Grundsatz:

```text
Kein final connected ohne aktuellen Browser- und Reload-Proof.
```

Proof-Regeln:

- Browser-Proof nutzt vorhandene Playwright-Tests, kein MCP vorausgesetzt.
- Writes muessen Button/Form real bedienen.
- Writes muessen reload-stabil in konkretem Kontext geprueft werden.
- Globale Textsuche ist nicht ausreichend.
- Skips muessen echten Grund nennen: Auth-State, Environment, gefuellte
  Manual-DB, fehlende Targets oder explizit deferred Scope.
- `supabase db reset` ist kein Standard-Proof-Schritt.
- `.local/`, Auth-State, Screenshots, Traces und private Daten werden nie
  gestaged.

W1.1A ist proof-first. Feature-Slices nach W1.1A duerfen nur auf Connected
Claims aufbauen, die aktuell belastbar sind.

## 9. Design Strategy

V5 bleibt Designwahrheit:

```text
Life OS - Linear Calm Dark Command Center
Dashboard Overhaul V5 - Subtle Color Identity Polish
```

Design-Regeln fuer die Roadmap:

- Dashboard bleibt Steuerung, kein Datenlager.
- Bereichsseiten liefern Kontext, keine Dashboard-Kopie.
- Detailseiten liefern Tiefe und muessen echte Entity-Fragen beantworten.
- Graph- und AI-Oberflaechen duerfen nicht dekorativ oder generisch wirken.
- Jede Farbe bleibt semantisch und textgestuetzt.
- P0/P1 bleibt ruhig und dominant; P2/P3 darf nicht lauter werden.
- Prepared/Future UI muss sichtbar ehrlich bleiben, bis sie verbunden ist.

Design-Taste-Entscheid:

```text
PASS_WITH_DEFERRED
```

Die Roadmap respektiert V5, aber mehrere finale Designentscheidungen bleiben in
spaeteren Vertical Slices offen: Calendar Interaction, Project/Goal Depth,
Nutrition Deep und Resource/Skill Graph.

## 10. Backend/Data Strategy

Backend-Regeln:

- Feature-Mutations bleiben unter `src/features/real-data/actions`.
- Zod-Schemas bleiben unter `src/features/real-data/schemas`.
- Supabase Repositories bleiben unter
  `src/features/real-data/supabase/repositories`.
- Keine neue `src/server` Boundary ohne separaten Refactor-Scope.
- Mutations authentifizieren serverseitig.
- Keine clientseitige `userId` als Trust Boundary.
- Same-user Ownership fuer relationale und polymorphe Targets.
- Revalidation fuer alle betroffenen App-Pfade.
- Keine Service Role.
- Keine Remote-DB-Aktion ohne separaten expliziten Scope.

Data-Strategie nach Prioritaet:

1. Bestehende Write-Flows beweisen.
2. Production/System Claims klaeren.
3. Query-/Pagination-/Scope-Risiken fuer wachsende Manual-DB adressieren.
4. Neue Depth-Datenmodelle nur pro Vertical Slice erweitern.
5. AI, Automation und Graph erst nach Proof- und Governance-Gates.

## 11. MCP Strategy

MCP ist nicht Voraussetzung fuer W1.1A.

Einordnung:

- Ohne MCP koennen bestehende Playwright-Tests weiter genutzt werden.
- Playwright MCP kann W1.1A spaeter erleichtern, weil es lokale Browser-Proofs
  und role-/label-basierte Interaktion direkt unterstuetzt.
- Next DevTools MCP ist nach Playwright MCP sinnvoll fuer lokale Runtime-,
  Route-, Hydration- und Server-Action-Diagnose.
- Figma MCP ist erst fuer UI-Redesign-/V5-Fidelity-Bloecke relevant und bleibt
  read/review-scoped, solange keine Figma-Write-Freigabe existiert.
- Supabase MCP kommt erst spaeter local/read-only nach Policy, nie als Remote-
  Write- oder Secret-Werkzeug.

Nicht erlaubt:

- MCP-Installation in W1.0G
- `.mcp.json`
- `.codex/config.toml`
- User-Home-Konfiguration
- Production-Daten oder Secrets im MCP-Kontext

## 12. Risks

- Proof Drift: historische QA ist breiter gruen als W1.0F live reproduzieren
  konnte.
- Auth-State Fragility: lokale Browser-Proofs haengen an gueltiger local
  Supabase Session und Host/Cookie-Domain.
- Manual-DB Density: persistente lokale Proof-Daten koennen globale Selector-
  Annahmen brechen.
- Production Gap: lokale Checks ersetzen kein Remote-/Target-Env-Audit.
- Scope Creep: Nutrition, Graph, AI und Automation koennen zu breit werden,
  wenn sie nicht in kleine Vertical Slices zerlegt werden.
- Design Drift: Bereichsseiten koennen generisch werden, wenn sie nur Cards
  sammeln statt Kontext- und Tiefenfragen zu beantworten.
- Security Risk: AI Provider, Automation, Export und Supabase MCP brauchen
  separate Privacy-/Secret-Gates.

## 13. Update Rules

Diese Roadmap wird aktualisiert, wenn:

- W1.1A non-skipped Proofs wiederherstellt oder neue Blocker beweist
- W1.1B Production Readiness Claims schliesst oder konkret blockiert
- ein F1/F2/F3 Vertical Slice abgeschlossen, deferred oder gestrichen wird
- neue Surface-Zielzustaende beschlossen werden
- Produkt-, Design-, Datenmodell- oder Security-Wahrheiten sich aendern

Update-Regeln:

- keine abgeschlossenen Claims ohne Proof hochstufen
- historische QA-Ergebnisse klar von aktuellen Live-Proofs trennen
- keine historische Local-Ready-Sprache als finalen Zielrahmen verwenden
- keine neuen Feature-Slices ohne Use Skills, Files to Read/Change, Hard
  Boundaries, Acceptance Criteria, Validation und Staging-Regeln
- `docs/product/life-os-full-roadmap-checklist.md` bleibt ausserhalb dieser
  Roadmap und wird nicht automatisch synchronisiert
