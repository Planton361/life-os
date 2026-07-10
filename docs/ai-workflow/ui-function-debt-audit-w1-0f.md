# Life OS UI / Function Debt Audit W1.0F

Stand: 2026-07-07
Status: Active
Zweck: Final-Completion-orientierter Audit der bestehenden Life-OS-UI gegen Agent Workflow v2.
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, `docs/ai-workflow/life-os-agent-workflow-v2.md`, `docs/product/mvp-core-status.md`, `docs/product/mvp-core-release-readiness.md`, aktuelle Code- und E2E-Pruefung.

## 1. Zweck

Dieser Audit prueft die sichtbaren Kernflaechen gegen den aktuellen Agent
Workflow v2: Product Intent, V5-Designrichtung, Button-/Form-Wahrheit,
Backend-/Persistenzpfade, Reload-Stabilitaet und Browser-Proof.

Dieser Audit aendert keine Produktflaechen.

Er erzeugt die Entscheidungsbasis fuer die naechsten finalen Vertical-Slice-
Bloecke.

Bewertung ist auf die finale Life-OS-Anwendung ausgerichtet. Historische MVP-
Dokumentation wurde als Statusquelle gelesen, aber nicht als Zielrahmen
uebernommen.

## 2. Nicht-Ziele

- keine Produktfeatures bauen
- keine UI aendern
- keine `src/`-Aenderungen
- keine Migrationen, RLS-/Policy-Aenderungen oder Remote-DB-Aktionen
- keine MCP-Installation oder User-Home-Konfiguration
- keine Secrets, `.env.local`, `private/` oder lokale Session-Inhalte lesen
- keine neue Library

## 3. Methodik / genutzte Skills

Genutzte Skills:

- `life-os-vertical-slice`: Completion Gate je Surface.
- `life-os-design-taste`: V5-, Hierarchie- und Anti-AI-Slop-Pruefung.
- `life-os-backend-action-slice`: Server Actions, Zod, Repositories, Ownership,
  Revalidation und Supabase-Grenzen.
- `life-os-browser-proof`: E2E-, Reload- und Prepared-State-Proof.
- `life-os-completion-gate`: Abschlussbewertung und offene Debt-Klassifikation.

Gepruefte Quellen:

- Root-Wahrheiten: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
  `DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
  `AI_WORKFLOW.md`.
- Workflow: `docs/ai-workflow/life-os-agent-workflow-v2.md`,
  `docs/ai-workflow/skills.md`, `docs/ai-workflow/prompting-rules.md`,
  `docs/ai-workflow/review-workflow.md`,
  `docs/ai-workflow/mcp-pilot-readiness-w1-0e.md`,
  `docs/ai-workflow/mcp-tools.md`.
- QA/Product Status:
  `docs/product/mvp-core-release-readiness.md`,
  `docs/product/mvp-core-status.md`,
  `docs/qa/manual-db-test-data-hygiene.md`,
  `docs/qa/accessibility-pass-r1-9-5.md`,
  `docs/qa/performance-baseline-r1-9-4.md`,
  `docs/qa/r1-6-5-real-browser-auth-check.md`.
- Code: App routes, `src/components`, Feature-Flaechen und
  `src/features/real-data`.
- E2E: `tests/e2e/content-state-system.spec.ts` mit den zwei vorgegebenen
  Grep-Gruppen.

## 4. Route-/Surface-Inventar

Statusdefinition:

- `connected`: UI bedienbar, echte Action/Persistenz, reload-stabil und aktuell
  browserbewiesen.
- `partial`: Teile verbunden, aber Completion Gate nicht vollstaendig erfuellt.
- `prepared`: sichtbarer Prepared/Future State ohne Persistenzbehauptung.
- `future`: spaeterer Scope, aktuell nicht relevant.
- `blocked`: sichtbar falsch, irrefuehrend oder nicht nutzbar.

| Surface | Route / Code-Pfad | Klassifikation | Begruendung |
| --- | --- | --- | --- |
| Dashboard | `src/app/(app)/dashboard/page.tsx`, `src/components/dashboard` | partial | V5-Steuerungsflaeche ist stark; Quick Thought/Daily Control sind wired, aber aktuelle W1.0F-DB-Proofs fuer Dashboard-Write-Flows wurden geskippt. |
| Inbox | `src/app/(app)/inbox/page.tsx`, `src/components/inbox/inbox-page.tsx` | partial | Capture, Routing, Task/Project/Goal/Resource/Solved-Pfade haben Actions; Skill/Resource-Link/Note/Decision-Anteile sind bewusst prepared/future. |
| Today | `src/app/(app)/today/page.tsx`, `src/features/today` | partial | Planner, Completion und Recurring Controls sind angebunden; aktueller DB-Reload-Proof ist skip-abhaengig. |
| Calendar | `src/app/(app)/calendar/page.tsx`, `src/features/calendar` | partial | Queue, Scheduling, Unschedule, Reschedule und Conflict-Gate sind v1-wired; Pointer Drag/Resize bleibt deferred. |
| Portfolio | `src/app/(app)/portfolio/page.tsx`, `src/features/portfolio` | partial | Task-/Project-/Goal-/Skill-Workbench ist real angebunden; tiefe Workbench-Abschnitte bleiben prepared. |
| Projects | `src/app/(app)/projects/page.tsx`, `src/features/entities` | partial | Entity Workbench fuer Projects existiert; Milestones, Logs, Ressourcen-Tiefe und Review-Workflows sind nicht final verbunden. |
| Goals | `src/app/(app)/goals/page.tsx`, `src/features/entities` | partial | Entity Workbench fuer Goals existiert; Review Cadence, Milestones, Logs und tiefe Zielhistorie sind prepared. |
| Resources | `src/app/(app)/resources/page.tsx`, `src/features/resources` | partial | Resource-Relationen und Inspector sind vorhanden; voller Resource Graph, direkte Graph-Interaktion und breite Persistenz-Tiefe fehlen. |
| Nutrition | `src/app/(app)/nutrition/**`, `src/features/nutrition` | partial | Recipes/Meals sind mit Actions vorhanden; Grocery, Ingredients, Planner-Edit, Macros und externe Daten bleiben future/prepared. |
| Skills | `src/app/(app)/skills/page.tsx`, `src/features/entities`, `src/features/portfolio` | partial | Skill/Evidence Create/Edit/Archive/Delete ist vorhanden; Skill Map/Graph bleibt future/prepared. |
| Recurring | Today Controls, `src/features/real-data/actions/recurring-*` | partial | Template Create und explizite idempotente Generation existieren; Full Template Management und Automation fehlen. |
| AI Suggestions | Inbox AI, Resource/Coding suggestion surfaces | partial | Inbox AI ist ehrlich als deterministischer Mock ohne Auto-Persistenz markiert; externer Provider und Governance fehlen. |
| Settings/System | `src/app/(app)/settings/page.tsx`, `src/features/auth`, `src/features/profile-data` | partial | Auth/Profile Controls existieren; production-ready System-, Privacy-, Backup-, Remote- und Admin-Controls sind nicht final. |

Keine der geprueften Kernflaechen ist als `blocked` einzustufen. Keine Flaeche
ist fuer die finale Anwendung vollstaendig `connected`, weil aktuelle
Browser-Proofs fuer DB-Write-Flows in dieser Session skip-lastig waren und
mehrere finale Tiefe-/Produktionsslices offen sind.

## 5. UI-/Design-Debt

Generic UI Risks:

- Nicht-Dashboard-Flaechen koennen bei weiterer Expansion in generische
  Workbench-/Card-Muster kippen, wenn neue Slices nur Felder hinzufuegen statt
  je Bereich Kontext, Entscheidung und Tiefe zu klaeren.
- Prepared/Future-Anteile sind ueberwiegend ehrlich markiert, aber ihre
  Verteilung ist hoch. Final-Slices muessen diese Marker abbauen oder sichtbar
  als spaeteren Scope bestaetigen.
- Resources, Nutrition, Skills und Projects/Goals brauchen finalere Domain-
  Hierarchie, bevor Graph-, Planner- oder Deep-Workbench-Arbeit skaliert.

V5 Alignment:

- Dashboard entspricht am staerksten der V5-Richtung: Steuerung, ruhige Dichte,
  P0-Fokus auf Today Agenda und Daily Control.
- Inbox, Today, Calendar und Portfolio folgen dem Command-Center-Prinzip mit
  klaren Arbeitszonen.
- Projects, Goals und Skills nutzen geteilte Entity-Workbench-Strukturen. Das
  ist konsistent, aber noch nicht die finale Tiefe jeder Domain.
- Nutrition und Resources haben funktionsreiche Panels, bleiben aber in Teilen
  noch Mock-/Prepared-gepraegt.

Design Debt:

- Project/Goal Workbench: Milestones, Logs, Ressourcen und Review Cadence sind
  sichtbare Prepared-Zonen.
- Calendar: Keyboard-/15-Minuten-Scheduling ist vorhanden; pointerbasierte
  Drag-/Resize-Interaktion ist offen.
- Nutrition: Overview, Recipes und Meals sind nutzbar; Grocery, Pantry,
  Ingredients, Macro Targets und Planner-Edit brauchen finale Prioritaet und
  UI-Hierarchie.
- Resource/Skill Graph: Der finale Graph darf nicht als dekorative Node-Map
  entstehen; er braucht klare Entscheidungen, Scope und Query-Modell.
- Settings/System: finaler Produktionszustand, Backup/Restore, Remote
  Boundaries und Privacy/Admin-Signale sind noch nicht als fertige Systemflaeche
  abgebildet.

High-priority UI Fixes:

- P0: Kein sichtbarer Fake-CTA gefunden, aber die aktuelle DB-Proof-Situation
  verhindert eine finale `connected`-Behauptung fuer Core Writes.
- P1: Prepared-Zonen in Project/Goal, Resource/Skill Graph, Nutrition Deep und
  Calendar Interaction entweder finalisieren oder als bewusst deferred
  beibehalten.
- P1: Route-level Auth/Manual-DB-Feedback ist bei Core-Routen konsistenter als
  bei einigen Erweiterungsflaechen; final sollte der Nutzer pro Surface klar
  sehen, ob Writes moeglich sind.

Deferred Design Work:

- Graph-Design fuer Resources und Skills.
- Vollstaendige Nutrition-Planung mit Grocery/Ingredients/Macros.
- Calendar Pointer Drag/Resize.
- Production/System Settings.
- External AI Review UI und Provider-Governance.

## 6. Function-/Button-Debt

| Control / Flow | Klassifikation | Debt |
| --- | --- | --- |
| Dashboard Quick Capture / Quick Thought | partial | Codepfad existiert; aktueller W1.0F-DB-Proof wurde geskippt. |
| Inbox Capture | partial | Capture Action vorhanden; aktuelle Live-DB-Proofs skippen, wenn Manual-DB-Control nicht enabled ist. |
| Inbox Routing | partial | Task, Project, Goal, Resource und Solved/Archive sind angebunden; Skill, Resource Link, Note/Decision bleiben prepared/future. |
| Inbox AI Suggestion | prepared honestly | Deterministischer Mock, erzeugt nur Review-Vorschlag; keine Auto-Persistenz. Externer Provider fehlt. |
| Today Planner | partial | Planen/Complete/Recurring-Projektion existiert; aktuelle DB-Reload-Proofs sind skip-abhaengig. |
| Calendar Scheduling Controls | partial | Schedule, Unschedule, Reschedule und Conflict-Gate sind v1-wired; Pointer Drag/Resize fehlt. |
| Portfolio Create/Edit/Archive | partial | Tasks und Skills/Evidence haben Actions; Project/Goal-Tiefe und aktuelle DB-Proofs sind nicht final. |
| Project Workbench Actions | partial | Linked Task Create/Lifecycle existiert; Milestones, Resources, Logs sind prepared. |
| Goal Workbench Actions | partial | Linked Task und Linked Project existieren; Review Cadence, Milestones, Logs sind prepared. |
| Resource Relation Actions | partial | Relation Action existiert; aktuelle Resource-Relation-DB-Proofs wurden geskippt; Graph fehlt. |
| Nutrition Recipe/Meal Actions | partial | Recipe/Meal Create/Update/Complete existieren; live DB-Proof geskippt; Grocery/Planner-Edit/Macros offen. |
| Skill Create/Edit/Archive/Evidence | partial | Actions existieren; aktuelle Skill-DB-Proofs wurden geskippt; Skill Map/Graph fehlt. |
| Recurring Generate | partial | Explizite Generation und Template Create existieren; heutige DB-Proofs geskippt; Automation/Management offen. |
| Settings/Auth/Profile Controls | partial | Auth/Profile Controls vorhanden; production-ready System- und Privacy-Controls fehlen. |

Keine gepruefte zentrale Aktion wird als `fake/unclear` bewertet. Der
wiederkehrende Debt ist `partial`: realer Action-Pfad plus fehlende aktuelle
Live-DB-Proof-Abdeckung oder bewusst prepared/future finale Tiefe.

## 7. Backend-/Data-Debt

Vorhandene Backend-Struktur:

- Server Actions: `src/features/real-data/actions`.
- Zod Schemas: `src/features/real-data/schemas`.
- Supabase Repositories und Mapper:
  `src/features/real-data/supabase/repositories`.
- Revalidation existiert fuer die zentralen Cross-Surface-Pfade wie Inbox,
  Dashboard, Today, Calendar, Portfolio, Resources und Nutrition.

Server Actions wurden fuer folgende Domainpfade gefunden:

- Inbox Capture, Triage, Archive, Resource/Project/Goal from Inbox.
- Inbox AI Suggestion als deterministischer Mock-Provider.
- Task Create, Schedule, Reschedule, Unschedule, Complete, Reopen, Archive.
- Portfolio Project/Goal Create.
- Resource Relation Link.
- Nutrition Recipe/Meal Create, Update, Archive, Complete.
- Skill Create, Update, Archive, Evidence Create/Update/Delete.
- Recurring Template Create/Update/Deactivate und Instance Generation.

Backend/Data Debt:

- UI ohne finale Action: Calendar Pointer Drag/Resize, Resource Graph,
  Skill Map/Graph, Nutrition Grocery/Ingredients/Macros/Planner-Edit,
  Project/Goal Milestones/Logs/Review-Tiefe.
- Action ohne finalen aktuellen Browser-Proof: mehrere Manual-DB-Write-Flows
  wurden in W1.0F wegen nicht enabled Manual-DB-Controls geskippt.
- Repository ohne vollstaendigen finalen Flow: Nutrition- und Graph-nahe
  Datenmodelle sind in Teilen bewusst future/prepared; finaler Flow ist nicht
  behauptet.
- Reload-Proof-Luecke: historische QA dokumentiert breite Reload-Proofs, aber
  W1.0F konnte viele DB-Persistenztests nicht aktuell ausfuehren.
- Production Debt: Remote-DB, Production RLS/Policies, Backup Drill,
  Deployment-Env und production-nahe Performance/Accessibility sind nicht
  durch diesen Audit geloest.
- Query-/Dichte-Risiko: grosse Client-Flaechen wie Inbox, Portfolio Context,
  Resources, Calendar und Today brauchen bei wachsender manueller Datenmenge
  Pagination, Server-Scope oder Query-Hardening.

Supabase CLI Ergebnis in W1.0F:

- `pnpm exec supabase db lint --local --level warning`: gruen.
- `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`: gruen.

Beide Checks benoetigten lokale/escalated Ausfuehrung, weil die Supabase CLI
im Sandbox-Modus in Home-Telemetriepfade schreiben wollte. Es wurden keine
Remote-DB-Aktionen ausgefuehrt.

## 8. Browser-/Proof-Debt

Historische QA-Dokumentation:

- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed,
  2 skipped.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed.
- Dokumentiert browserbewiesen sind u.a. Quick Capture, Inbox Resolve, AI
  Suggestion Review, Task/Resource/Create-New Confirm, Today Planning,
  Calendar Scheduling/Unschedule/Conflict-Gate, Portfolio Lifecycle, Resource
  Relations, Recurring Generation, Nutrition Meal Completion und Skill Evidence
  Source Linking.

W1.0F Live-Refresh am 2026-07-07:

- Sandbox-Run beider Playwright-Greps konnte `config.webServer` nicht starten.
- Lokale/escalated Ausfuehrung war noetig, damit der Dev Server localhost
  binden konnte.
- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 40 passed,
  48 skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 11 passed,
  14 skipped, 0 failed.

Interpretation:

- Keine Regression wurde als Testfehler sichtbar.
- Die aktuelle Session ist nicht ausreichend, um alle DB-Write-Flows final als
  `connected` zu klassifizieren.
- Die Skips sind daten-/auth-abhaengig: Tests pruefen, ob lokale Manual-
  Supabase-Controls nach Auth-State wirklich enabled sind, und skippen sonst.
- Auth-State-Datei existierte, aber die aktuelle Browser-Proof-Umgebung hat
  viele persistente Manual-Flows nicht freigegeben.

Browser-/Proof-Debt:

- P0 fuer finale Behauptung: aktueller, nicht skip-lastiger DB-Write-Proof fuer
  Core und Extensions muss wiederhergestellt oder sauber als Environment-Blocker
  dokumentiert werden.
- P1: Mehr scoped Assertions fuer dichte Nutrition-, Resource-, Skill- und
  Portfolio-Szenarien beibehalten/ausbauen.
- P1: Route-level Proof fuer Auth/Manual-DB-Feedback auf Erweiterungsflaechen
  vereinheitlichen.
- P2: Produktionsbrowser-Proof mit echter Deployment-URL, Production Env,
  Backup/Restore- und Remote-RLS-Grenzen.

W1.1A Recovery-Update 2026-07-07:

- Dokumentiert in `docs/qa/browser-proof-recovery-w1-1a.md`.
- Ergebnis: `BLOCKED_AUTH_STATE`.
- Core-Grep: 40 passed, 48 skipped, 0 failed.
- Extensions-Grep: 11 passed, 14 skipped, 0 failed.
- Die Skips sind aktuell Auth-/Manual-Supabase-Session-gated, nicht durch einen
  neuen App-Fehler belegt. W1.0F-Connected-Risiko bleibt bestehen; keine
  Surface wird durch W1.1A final `connected`.

W1.1A Closure-Update 2026-07-09:

- Dokumentiert in `docs/qa/browser-proof-recovery-w1-1a.md`.
- Ergebnis: `CLOSED_CORE_EXTENSIONS_GREEN`.
- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed,
  2 skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed,
  0 skipped, 0 failed.
- W1.0F Current Browser-Proof Debt ist lokal fuer Core und Extensions
  geschlossen. Production-, Remote-/Target-Env- und finale Completion-Claims
  bleiben separate Folgegates.

W1.1B Production Readiness Update 2026-07-10:

- Dokumentiert in `docs/product/production-readiness-closure-plan-w1-1b.md`.
- Lokale Browser-Proof-Debt bleibt geschlossen, aber Production/System Debt ist
  nicht geloest.
- Offene Gates sind Remote Supabase Audit, Target Env Verification, Deployment
  Rehearsal, Backup/Restore Drill, Production Performance Baseline,
  Production Accessibility Manual Review, External AI Provider Governance,
  Export/Import und Monitoring/Logging.
- Naechster ausfuehrbarer Block ist W1.1B.1 Target Environment Inventory.
- Kein Remote Supabase, kein Deployment, keine Migration, keine RLS-/Policy-
  Aenderung und kein Production Release Claim in W1.1B.

F0.1 Connected-Claim Review Update 2026-07-10:

- Dokumentiert in
  `docs/product/final-surface-connected-claim-review-f0-1.md`.
- W1.0F bleibt als historische Momentaufnahme gueltig, aber die pauschale
  `partial`-/skip-lastig-Einordnung fuer alle Kernflaechen ist nach W1.1A zu
  praezisieren.
- Aktuelle Proof-Basis: Core `86 passed, 2 skipped, 0 failed`; Extensions
  `25 passed, 0 skipped, 0 failed`.
- Dashboard, Inbox, Today, Calendar, Portfolio, Projects, Goals, Resources,
  Nutrition, Skills, Recurring und lokale AI Suggestions sind jetzt
  `local_connected_with_depth_gap`.
- Settings/System bleibt `partial`, weil Production/Remote/Target-Env,
  Monitoring, Privacy-/Backup-Systemtiefe und vollstaendige System-UX offen
  sind.
- F0.1 ist kein final-complete-, Production-, Remote- oder Public-SaaS-Claim.
- Naechster ausfuehrbarer Produktblock ist F1.0 Calendar Finalization.

## 9. Final Product Completion Matrix

| Surface | UI Quality | Functionality | Backend | Reload Proof | Browser Proof | Status | Priority | Next Vertical Slice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P0/P1 | Current DB proof refresh; danach Dashboard final polish. |
| Inbox | hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P0/P1 | Inbox routing completion fuer remaining prepared routes und proof refresh. |
| Today | hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P0/P1 | Today/Recurring current proof and review-depth slice. |
| Calendar | hoch | partial | partial | historisch | partial | partial | P1 | Calendar interaction finalization, Drag/Resize decision. |
| Portfolio | hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P1 | Portfolio/Project/Goal workbench depth. |
| Projects | mittel-hoch | partial | partial | partial | partial | partial | P1 | Project milestones/logs/resources final slice. |
| Goals | mittel-hoch | partial | partial | partial | partial | partial | P1 | Goal review cadence/milestones/logs final slice. |
| Resources | mittel-hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P1/P2 | Resource relation proof refresh, then graph/read-model slice. |
| Nutrition | mittel-hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P1 | Nutrition deep slice: Grocery, Ingredients, Macros, Planner Edit. |
| Skills | mittel-hoch | partial | partial | historisch, aktuell skip-lastig | partial | partial | P1/P2 | Skill evidence proof refresh, then Skill Map/Graph slice. |
| Recurring | mittel | partial | partial | historisch, aktuell skip-lastig | partial | partial | P1/P2 | Recurring management slice before automation. |
| AI Suggestions | mittel-hoch | prepared honestly | prepared/mock | no auto-write by design | partial | partial | P2 | External AI provider/governance slice. |
| Settings/System | mittel | partial | partial | partial | partial | partial | P0 | Production readiness, auth/session, privacy, backup/restore and deployment slice. |

## 10. P0/P1/P2/P3 Priorisierung

P0 Debt:

- Current Browser-Proof Debt: W1.0F live E2E is green but skip-lastig. Finale
  `connected`-Claims brauchen einen aktuellen DB-write-faehigen Proof.
- Production/System Debt: Remote/production security, deployment env,
  backup/restore drill, production browser proof and production accessibility
  are still not final.
- No visible P0 fake-button debt was found.

P1 Debt:

- Calendar Pointer Drag/Resize oder explizite finale Entscheidung fuer
  keyboard-only/15-Minuten-Steuerung.
- Project/Goal Workbench Tiefe: Milestones, Logs, Resources, Review Cadence.
- Nutrition Deep: Grocery, Ingredients, Macro Targets, Planner-Edit.
- Resource Relations final proof and Resource Graph read model.
- Skill/Evidence final proof and Skill Map/Graph.
- Route-level Manual-DB/Auth-Feedback auf Erweiterungsflaechen konsolidieren.

P2 Debt:

- External AI Provider, Privacy/Governance, provider-specific proof.
- Recurring Full Template Management.
- Archive Browser, undo/deeper lifecycle history.
- Production performance baseline under realistic manual data density.

P3 Debt:

- Background automation, cron/jobs and proactive generation.
- Import/export automation beyond documented strategy.
- Advanced analytics and non-core optimization.
- Graph layout/visual polish after data semantics are proven.

## 11. Empfohlene naechste Vertical Slices

1. P0: Current Browser-Proof Recovery Slice.
   Ziel: Core- und Extension-Greps ohne unerwartete Manual-DB-Skips oder mit
   explizit dokumentiertem Environment-Blocker wiederherstellen.

2. P0: Production Readiness Vertical Slice.
   Ziel: Production Env, remote security boundary, backup/restore drill,
   production browser proof and final release claims.

3. P1: Calendar Interaction Finalization.
   Ziel: Drag/Resize umsetzen oder bewusst final ablehnen und die bestehende
   15-Minuten-/Keyboard-Steuerung als finale Interaction dokumentieren.

4. P1: Project/Goal Workbench Depth Slice.
   Ziel: Milestones, Logs, Resources and Review Cadence mit Actions,
   Reload-Proof und Browser-Proof verbinden oder final als deferred markieren.

5. P1: Nutrition Deep Slice.
   Ziel: Grocery, Ingredients, Macros and Planner Edit priorisieren und
   persistente Flows beweisen.

6. P1/P2: Resource/Skill Graph Read-Model Slice.
   Ziel: Graph nicht dekorativ bauen, sondern erst Query/Relation-Semantik,
   Scope, Accessibility und Browser-Proof definieren.

7. P2: AI Provider Governance Slice.
   Ziel: External Provider nur mit Privacy, Review Gate, no-auto-write,
   Error-State, Prompt/Logging-Grenzen und Browser-Proof.

8. P2/P3: Recurring Management and Automation Slice.
   Ziel: Full Template Management vor Cron/Automation; Automation erst nach
   idempotentem Proof und System-Controls.

## 12. MCP-Bezug

W1.0F hat kein MCP installiert und keine Config geaendert.

MCP-Pilot-Empfehlung bleibt:

1. Playwright MCP zuerst, weil W1.0F die groesste Luecke bei lokaler
   Browser-Proof-Stabilitaet und Current DB Proof zeigt.
2. Next DevTools MCP danach fuer Dev-Server, Hydration, Server Action und
   Route-Diagnose.
3. Figma MCP spaeter read/review-scoped fuer V5-Fidelity, nicht als Ersatz fuer
   `DESIGN.md`.
4. Supabase MCP spaeter local/read-only fuer Schema/RLS/Query-Kontext; keine
   Remote-DB, keine Secrets, keine Push/Reset-Aktionen.

## 13. Risiken

- Historical Proof Drift: Produktdocs dokumentieren breitere Green Runs als
  W1.0F live reproduzieren konnte.
- Auth-State Fragility: lokale Manual-DB-Proofs haengen an einer gueltigen,
  enabled Browser-/Supabase-Session.
- False Connected Claim: Ohne aktuellen nicht skip-lastigen DB-Proof duerfen
  zentrale Write-Flows nicht als final connected gelten.
- Data Density: grosse Client-Flaechen koennen bei realer Nutzung Pagination,
  Server-Scope und Performance-Hardening brauchen.
- Production Gap: lokale Supabase lint/advisors ersetzen keine Remote-
  Production-Audits.
- Design Scope Creep: Graph, AI, Nutrition Deep und Automation koennen schnell
  neue UI-/Backend-Komplexitaet erzeugen, wenn sie nicht als Vertical Slices
  mit Completion Gate gefuehrt werden.
