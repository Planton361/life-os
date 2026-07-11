# F0.1 Final Surface Connected-Claim Review

## F1.2I Nutrition Closure 2026-07-11

F1.2 Nutrition Deep Features ist geschlossen. Nutrition bleibt
`local_connected_with_depth_gap`: Recipe Create/Edit/Archive, Ingredient
Create/Edit/Delete, Meal Create/Edit/Reschedule/Complete, Recipe-Wechsel,
read-only Grocery Draft und manuelle Estimate-Projektion sind lokal verbunden.
Persistente Grocery Review, Pantry, Portionen, Metrics Engine, externe Food
APIs, Health Claims, AI Nutrition Advice, Recipe Detail und Drag-and-drop
bleiben deferred. Nächster Produktbereich ist F1.3 Resource/Skill Graph Read
Model.

## F1.2H Nutrition Update 2026-07-11

Nutrition Metrics sind als `estimate_only` entschieden. Das optionale Recipe-
`nutrition_estimate` ist weder Engine noch gemessener Intake; Tagesziele,
Defizit, Health Claims und automatische Ingredient-Berechnung bleiben future.
Fehlende Manual-Schätzungen erscheinen nicht mehr als exakte Nullwerte. Der
Nutrition-Connected-Claim umfasst weiterhin Recipe/Ingredient/Meal/Planner/
Grocery-Flows, aber keine Metrics Engine.

## F1.2G Nutrition Update 2026-07-11

Grocery Generation ist lokal Manual-connected als serverseitige, read-only
Wochenprojektion aus offenen user-owned Meals, Recipes und persistierten Recipe
Ingredients. Aggregation erfolgt ohne Planner-Matrix, Unit Conversion oder
Serving-Skalierung; unresolved Meals bleiben sichtbar. Der Claim umfasst keine
Grocery-Persistenz, Pantry, Bestellung, Remote DB oder Production.

## F1.2F Nutrition Update 2026-07-11

Meal Planner Edit / Reschedule ist lokal Manual-connected: sichtbares Inspector-Formular, authentifizierte Update Action, user-scoped Repository, Same-User-Recipe-Ownership und Reload-Proof. Demo/Empty bleiben getrennt. Der Claim gilt nicht fuer Production, Remote DB, Drag-and-drop, Grocery, Portionen oder Metrics.

Stand: 2026-07-10
Status: Completed docs/product/QA review; no product implementation
Quelle der Wahrheit: W1.1A Browser-Proof Recovery, W1.1B personal/local-first
readiness docs, W1.0F UI/Function Debt Audit, Final Product Completion Roadmap.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src/`, Tests,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB, Deployment oder Secrets.

## 1. Zweck

F0.1 uebersetzt die aktuellen W1.1A/W1.1B-Ergebnisse in praezise
Surface-Claims.

Entscheidung:

```text
Life OS ist local-first proof-stable.
Mehrere Kernflows sind lokal connected.
Die Anwendung ist noch nicht final vollstaendig, weil finale Tiefenfunktionen
fehlen.
```

Dieser Review verhindert zwei falsche Extreme:

- bewiesene lokale Kernflows bleiben nicht unnoetig als stale `partial`
  markiert.
- fehlende finale Tiefe wird nicht als final complete verkauft.

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI-Aenderungen
- keine `src`-Aenderungen
- keine Test-Aenderungen
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB
- kein `supabase link`
- kein `supabase db push`
- kein `db reset`
- kein Deployment
- keine Secrets, `.env.local`, `.local/**`, `private/**`, Backups oder Exports
  lesen oder dokumentieren
- keine neue Library
- kein MCP installieren

## 3. Claim-Stufen

| Claim Stage | Definition |
| --- | --- |
| `local_connected` | UI ist lokal bedienbar, echte Action/Persistenz ist vorhanden, Reload-Proof ist aktuell, Browser-Proof ist aktuell, Manual/Demo/Empty sind sauber getrennt. |
| `local_connected_with_depth_gap` | Der bestehende Kernflow ist lokal connected, aber finale Surface-Tiefe fehlt noch. |
| `partial` | Wichtige Kernteile sind noch nicht verbunden oder der aktuelle Proof fehlt. |
| `prepared` | Ehrlicher vorbereiteter Zustand ohne falsche Persistenzbehauptung. |
| `future` | Bewusster spaeterer Scope. |
| `blocked` | Sichtbar falsch, irrefuehrend oder nicht nutzbar. |

Grenze:

```text
local_connected ist kein Production-Claim.
local_connected ist kein Remote-Claim.
local_connected ist kein final-complete-Claim.
```

## 4. Ausgangslage

Aktueller lokaler Stand:

- Life OS ist personal-only und local-first.
- Private Remote ist `not_now`.
- Public SaaS ist Nicht-Ziel.
- W1.1A schliesst die stale Browser-Proof-Luecke lokal.
- W1.1B schliesst Production Readiness nicht; es praezisiert, dass
  Production/Remote/Target-Env separate spaetere Gates sind.

Startcheck F0.1:

- Tracked Worktree war sauber.
- Erlaubte untracked Eintraege: `docs/product/life-os-full-roadmap-checklist.md`
  und `private/`.
- `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
  Supabase local `db lint` und Supabase local Security Advisors waren gruen.

## 5. Proof Sources

| Source | Status | Claim Impact |
| --- | --- | --- |
| `docs/qa/browser-proof-recovery-w1-1a.md` | `CLOSED_CORE_EXTENSIONS_GREEN` | Lokale DB-Write- und Reload-Proofs sind aktuell belastbar. |
| W1.1A Core grep | 86 passed, 2 skipped, 0 failed | Core-Surfaces duerfen nicht mehr pauschal als stale skip-lastig gelten. |
| W1.1A Extensions grep | 25 passed, 0 skipped, 0 failed | Resources, Nutrition, Skill/Evidence, AI Suggestion und Recurring Extension-Flows sind aktuell gruen. |
| `docs/qa/manual-db-test-data-hygiene.md` | Active | Proofs duerfen lokale Manual-DB-Dichte nicht durch Reset verstecken. |
| `docs/qa/performance-baseline-r1-9-4.md` | Local baseline documented | Lokale Nutzung ist ausreichend, Production Performance bleibt offen. |
| `docs/qa/accessibility-pass-r1-9-5.md` | Local MVP-Core pass completed | Lokale Accessibility-Basis ist verbessert, vollstaendiger Production-/Screenreader-Pass bleibt offen. |
| `docs/ops/local-personal-operations-runbook-w1-1b-3.md` | Local personal operations documented | Local-first Owner-Betrieb ist dokumentiert. |
| `docs/ops/local-backup-restore-drill-w1-1b-4.md` | `PASS_WITH_COMPATIBILITY_BOOTSTRAP` fuer lokalen Restore-Smoke | Logischer lokaler Restore-Smoke ist bewiesen; kein Cloud-/Production-Restore-Claim. |
| `docs/product/optional-private-remote-decision-w1-1b-5.md` | Local-first only for now | Private Remote bleibt spaeterer expliziter Scope. |

## 6. Surface Claim Matrix

| Surface | Current Claim | Evidence | Missing Final Depth | Proof Source | Design Status | Backend Status | Next Slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `local_connected_with_depth_gap` | Quick Thought, Daily Control, Today Agenda und Projektionen sind im Core-Proof aktuell gruen. | Finaler Dashboard-Polish und tiefere Daily-Record-/Review-Zustaende bleiben getrennt. | W1.1A Core 86/2/0 | V5 bleibt passend; P0 dominiert. | User-scoped ReadModels/Actions, kein Production-Claim. | Nach F1.x ggf. Dashboard final polish. |
| Inbox | `local_connected_with_depth_gap` | Capture, Routing zu Task/Project/Goal/Resource, Archive/Solve und AI Review Flow sind aktuell proof-stable. | Note/Decision/Skill/Resource-Link Routing bleibt prepared/future oder separater Scope. | W1.1A Core 86/2/0 | Outcome Router bleibt funktional dicht. | Actions/RPCs sind lokal user-scoped bewiesen. | Route-level feedback / remaining routing completion. |
| Today | `local_connected_with_depth_gap` | Planner, Completion und Recurring-Projektion sind lokal reload-stabil bewiesen. | Daily Record und Review-Tiefe fehlen. | W1.1A Core 86/2/0 | Today ergaenzt Dashboard, keine Kopie. | Task-/Recurring-Pfade lokal connected. | Review-depth slice. |
| Calendar | `local_connected_with_depth_gap` | Schedule, Unschedule, Reschedule, sichtbares Conflict Gate, bewusster Override und Today/Dashboard-Projektion sind lokal bewiesen; F1.0F schliesst den task-based Scheduling Core. | Pointer Drag/Resize, freie Events und Schedule-History/Override-Audit bleiben Future Scope. | F1.0E Focused 72/2/0 plus F1.0F Closure | Temporal Planning Surface ist ruhig und funktional; Button-/Keyboard-Kern bleibt final fuer F1.0. | Schedule-Felder, Conflict Scope und Revalidation lokal bewiesen; keine DB-weite Conflict-Sperre. | Calendar Comfort-Slices nur separat; aktueller naechster Produktblock ist F1.2 Nutrition. |
| Portfolio | `local_connected_with_depth_gap` | Task Lifecycle, Project/Goal Entity Edit, Soft Archive, Resource Relation Link, Skill Evidence Display und Skill Workbench Evidence-Flows sind aktuell lokal bewiesen. | Milestones, Logs, Review Cadence, Undo/Restore, Progress Engine, Graph, AI Coach und Evidence Create aus der Workbench bleiben deferred. | W1.1A Core 86/2/0 plus Extensions 25/0/0, F1.1F 37/0/0, F1.1G Closure | Steuerungsbereich statt Dashboard-Kopie. | Repositories/Relation Labels lokal user-scoped; Resource/Evidence Ownership lokal bewiesen. | F1.2 Nutrition; Project/Goal Deep-Slices spaeter. |
| Projects | `local_connected_with_depth_gap` | Project Create, Linked Task Create/Lifecycle, Entity Edit, Status Edit, Soft Archive, Resource Relation Link und Skill Evidence Display read-only sind lokal belastbar. | Milestones, Project Log, Review-/History-Kontext, Undo/Restore, finaler Close-Flow, Progress Engine, Graph, AI Coach und Evidence Create fehlen. | F1.1C 69/6/0, F1.1F 37/0/0, F1.1G Closure | Detailseite braucht mehr Tiefe, aber Workbench-Core ist proof-stable. | Project ownership gates fuer bestehende Kernflows, Resource Relations und Evidence Sources vorhanden. | F1.2 Nutrition; Project Milestones/Logs spaeter. |
| Goals | `local_connected_with_depth_gap` | Goal Create, Linked Project Create, Linked Task Create/Lifecycle, Entity Edit, Status/Horizon Edit, Soft Archive, Resource Relation Link und Skill Evidence Display read-only sind lokal belastbar. | Review Cadence, Milestones, Goal Log, Zielhistorie, Undo/Restore, finaler Achieve-Flow, Progress Engine, Graph, AI Coach und Evidence Create fehlen. | F1.1D 28/0/0, F1.1F 37/0/0, F1.1G Closure | Zielarbeit braucht echte Progress-Tiefe, aber Workbench-Core ist proof-stable. | Goal ownership gates fuer bestehende Kernflows, Resource Relations und Evidence Sources vorhanden. | F1.2 Nutrition; Goal Review/Milestones/Logs spaeter. |
| Resources | `local_connected_with_depth_gap` | Resource Create, Inspector und Relation Create sind aktuell non-skipped gruen. | Graph-/ReadModel-Tiefe und Pagination/Scope fehlen. | W1.1A Extensions 25/0/0 | Knowledge Workbench, Graph nicht dekorativ. | Relation Labels/Targets lokal user-scoped. | F1.3 Resource/Skill Graph. |
| Nutrition | `local_connected_with_depth_gap` | Recipe Create/Edit/Archive, Ingredient Create/Edit/Delete, Meal Create/Edit/Reschedule/Complete, Recipe-Wechsel, read-only Grocery Draft und manuelle Estimate-Projektion sind lokal verbunden. | Persistente Grocery Review, Pantry, Unit Conversion, Portionen, Metrics Engine, Recipe Detail und Drag-and-drop bleiben deferred. | F1.2B–F1.2G focused proofs, F1.2H Decision Lock, F1.2I Closure | Health-sensitive; Grocery ist Draft und Nährwerte sind Schätzung oder unbekannt. | User-scoped Nutrition Reads/Writes und Date Scopes lokal bewiesen; keine Nutrition-/Intake-Engine. | F1.3 Resource/Skill Graph Read Model. |
| Skills | `local_connected_with_depth_gap` | Skill Create/Edit/Archive und Evidence/Source-Linking sind aktuell gruen. | Skill Map/Graph und Evidence-Historie-Tiefe fehlen. | W1.1A Extensions 25/0/0 | Kompetenznachweise, kein AI-Behauptungsgraph. | Evidence Source Ownership lokal bewiesen. | F1.3 Resource/Skill Graph. |
| Recurring | `local_connected_with_depth_gap` | Template Create und explizite idempotente Generate-Flows sind aktuell gruen. | Full Template Management und Automation fehlen. | W1.1A Extensions 25/0/0 | Routine UI ohne Gamification-Druck. | Idempotente Generation lokal bewiesen, keine Auto-Write-Ueberraschung. | F2.1 Recurring Full Management. |
| AI Suggestions | `local_connected_with_depth_gap` | Lokaler deterministischer Review/Confirm-Flow ist aktuell gruen und schreibt nur nach User-Bestaetigung. | External Provider, Privacy, Logging, Cost und Failure Governance fehlen. | W1.1A Core 86/2/0 plus Extensions 25/0/0 | AI bleibt Review-Schicht, nicht autonom. | Mock/Review-Grenze lokal connected; Provider Boundary future. | F2.0 External AI Provider Governance. |
| Settings/System | `partial` | Auth/Profile/System-Status und local ops docs existieren. | Finales System-, Privacy-, Backup-/Restore-, Target-Env-, Monitoring- und Remote-UI/Runbook-Set fehlt. | W1.1B docs, local lint/advisors | Ruhiger Statusbereich, aber nicht final. | Local-first ops/restore-smoke dokumentiert; Production/Remote offen. | Route-level Manual/Auth Feedback; spaeter W1.1C nur bei Remote-Entscheidung. |

## 7. Local Connected Claims

Diese Claims gelten fuer einzelne Kernflows, nicht fuer vollstaendige finale
Surfaces:

- Dashboard Quick Thought / Daily Control / Today Agenda projection.
- Inbox Capture, Task/Project/Goal/Resource routing, Archive/Solve und lokaler
  AI Review/Confirm.
- Today Planner, Completion und Recurring Projection.
- Calendar Schedule/Unschedule/Conflict Gate ueber vorhandene Controls.
- Portfolio Task Lifecycle, Skill CRUD und Evidence Source Linking.
- Project/Goal linked Task/Project Kernpfade.
- Project/Goal Entity Edit, Status Edit und Soft Archive.
- Project/Goal Resource Relation Link fuer vorhandene Resources.
- Project/Goal Skill Evidence Display read-only.
- Resource Create und Resource Relation Create.
- Nutrition Recipe Create/Edit/Archive, Ingredient Create/Edit/Delete, Meal
  Create/Edit/Reschedule/Complete, Recipe-Wechsel, read-only Grocery Draft und
  manuelle Estimate-Projektion mit Provenance.
- Recurring Template Create und explizite Generate-Aktion.

## 8. Local Connected with Depth Gap

Diese Surfaces duerfen nach W1.1A nicht mehr pauschal als stale
`partial` gelten, sind aber nicht final complete:

- Dashboard
- Inbox
- Today
- Calendar
- Portfolio
- Projects
- Goals
- Resources
- Nutrition
- Skills
- Recurring
- AI Suggestions

Grund: aktuelle lokale Browser-Proofs belegen echte Actions/Persistenz/Reload
fuer Kernflows. Finale Depth-Gaps bleiben sichtbar und werden als Vertical
Slices gefuehrt.

## 9. Partial / Prepared / Future Surfaces

`partial`:

- Settings/System bleibt `partial`, weil Production/Remote/Target-Env,
  Monitoring, Privacy-/Backup-Systemtiefe und vollstaendige System-UX nicht
  final verbunden sind.

`prepared`:

- Inbox Note/Decision/Skill/Resource-Link Routing, soweit keine final
  beweisbare Persistenz behauptet wird.
- Project/Goal Milestones, Logs, Review Cadence und Resource Depth.
- Resource/Skill Graph Visualisierung vor gesicherter Semantik.
- Nutrition Pantry, persistente Grocery Review, Portionen, Metrics Engine,
  Recipe Detail und Drag-and-drop.
- Route-level Manual/Auth Feedback auf noch nicht finalisierten Flaechen.

`future`:

- Private Remote.
- External AI Provider.
- Background Automation/Cron.
- Archive Browser/Undo.
- Import/Export Automation.
- Public SaaS bleibt Nicht-Ziel, nicht nur future.

`blocked`:

- Keine Surface ist in F0.1 als `blocked` eingestuft.

## 10. Remaining Skips

W1.1A Core bleibt mit zwei Skips:

```text
Core: 86 passed, 2 skipped, 0 failed
Extensions: 25 passed, 0 skipped, 0 failed
```

Bewertung:

- Die zwei Core-Skips sind erwartete daten-/state-abhaengige
  Empty-Target-/Manual-Reset-Proofs.
- Sie sind nicht claim-relevant fuer die hier hochgestuften lokalen
  DB-Write-Kernflows.
- Sie duerfen nicht als Production-Freigabe gelesen werden.
- Sie bleiben relevante QA-Hinweise fuer spaetere Empty-State-/Reset-nahe
  Proofs.

## 11. What This Does Not Claim

F0.1 behauptet nicht:

- final complete
- production-ready
- remote-ready
- public SaaS readiness
- vollstaendige Supabase Cloud Security
- vollstaendigen Supabase Runtime Restore
- vollstaendige Production Performance
- vollstaendigen manuellen Screenreader-/Keyboard-Pass
- externe AI Provider Readiness
- automatische Backups, Monitoring oder Offsite Retention
- dass alle prepared/future Buttons schon persistieren

## 12. Next Vertical Slices

Naechster ausfuehrbarer Produktblock nach F1.2I:

```text
F1.3 Resource/Skill Graph Read Model
```

Begruendung:

- F1.2 hat den verbundenen Nutrition-Kern geschlossen und verbleibende
  Grocery-, Portion-, Metrics-, Detail- und Planner-Tiefe klar deferred.
- Die Roadmap setzt als nächsten P1-Block F1.3.
- F1.3 startet mit Relation Semantics und Read Model, nicht mit dekorativer
  Graph-UI.

F1.0A Status 2026-07-10:

- F1.0 Calendar Finalization ist mit
  `docs/product/calendar-finalization-scope-f1-0a.md` als Scope-Lock gestartet.
- F1.0A implementiert nichts und aendert keine Produktflaechen.
- Entscheidung: Button-/Keyboard-Scheduling ist der finale Kern; Pointer
  Drag/Resize bleibt ein spaeterer Komfort-Slice.

F1.0F Closure Status 2026-07-11:

- Dokumentiert in `docs/product/calendar-finalization-closure-f1-0f.md`.
- `Task Scheduling Core = local_connected`.
- `Calendar = local_connected_with_depth_gap`.
- Latest Focused Calendar Proof `Calendar|Today|Dashboard|Manual`: 72 passed,
  2 skipped, 0 failed.
- Pointer Drag/Resize, freie Calendar Events und Schedule-History/Override-
  Audit bleiben Future Scope.
- Kein final-complete-, Production-, Remote- oder Public-SaaS-Claim.

F1.1A Project / Goal Workbench Depth Scope Lock Status 2026-07-11:

- Dokumentiert in
  `docs/product/project-goal-workbench-depth-scope-f1-1a.md`.
- F1.1A aendert keine Surface Claims und implementiert keine Features.
- Portfolio, Projects und Goals bleiben `local_connected_with_depth_gap`.
- Connected bleiben Project/Goal Create, linked Task/Project Kernpfade und
  Resource Relation Display; Milestones, Logs, Review Cadence und finale
  Progress-/Archive-Semantik bleiben Depth-Gaps.
- Naechster ausfuehrbarer Block: F1.1B Project / Goal Workbench State Clarity.

F1.1G Project / Goal Workbench Closure Status 2026-07-11:

- Dokumentiert in
  `docs/product/project-goal-workbench-closure-f1-1g.md`.
- Project Workbench und Goal Workbench bleiben
  `local_connected_with_depth_gap`.
- Connected Claims sind Entity Edit, Status Edit, Soft Archive, Linked Task
  Create/Lifecycle, Goal linked Project Create, Resource Relation Link und
  Skill Evidence Display read-only.
- Project/Goal Workbench Core ist local-first proof-stable, aber nicht final
  complete.
- Milestones, Logs, Review Cadence, Undo/Restore, Progress Engine, Graph,
  AI Coach und Evidence Create direkt aus der Workbench bleiben deferred.
- Naechster Produktbereich: F1.2 Nutrition Deep Features.

F1.2A Nutrition Deep Features Scope Lock Status 2026-07-11:

- Dokumentiert in
  `docs/product/nutrition-deep-features-scope-f1-2a.md`.
- Nutrition bleibt `local_connected_with_depth_gap`.
- Verbunden bleiben Recipe Create, Meal Create, Meal Complete und
  Meal-Planner-Projektion.
- Nicht verbunden bleiben Recipe Edit/Archive in der Manual UI, echte Recipe
  Detail-Tiefe, Ingredients, Grocery Generation, Planner Edit und belastbare
  Metrics.
- Erster ausfuehrbarer Folgeblock: F1.2B Recipe Entity Edit / Archive.

F1.2I Nutrition Closure Status 2026-07-11:

- Dokumentiert in `docs/product/nutrition-closure-f1-2i.md`.
- Nutrition bleibt `local_connected_with_depth_gap`.
- Connected Claims und Deferred Work entsprechen F1.2B–H und den aktuellen
  Browser-Proofs.
- F1.2I ist docs-only; kein neuer Browser-Proof nötig.
- Nächster Produktbereich: F1.3 Resource/Skill Graph Read Model.

Weitere Reihenfolge:

1. F1.3 Resource/Skill Graph Read Model.
2. Spaeterer Project/Goal Slice: Milestones, Logs, Review Cadence oder Archive/Undo.
3. F1.4 Route-level Manual/Auth Feedback.
4. F2.0 External AI Provider Governance.
5. F2.1 Recurring Full Management.
6. F2.2 Archive Browser and Undo.

Completion Gate:

```text
PASS_WITH_DEFERRED
```

F0.1 ist als Docs-/Claim-Review abgeschlossen. Product Completion bleibt wegen
den dokumentierten Depth-Gaps bewusst offen.
