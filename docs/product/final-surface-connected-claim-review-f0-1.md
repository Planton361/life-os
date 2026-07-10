# F0.1 Final Surface Connected-Claim Review

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
| Calendar | `local_connected_with_depth_gap` | Schedule, Unschedule, Reschedule, sichtbares Conflict Gate, bewusster Override und Today/Dashboard-Projektion sind lokal bewiesen; F1.0F schliesst den task-based Scheduling Core. | Pointer Drag/Resize, freie Events und Schedule-History/Override-Audit bleiben Future Scope. | F1.0E Focused 72/2/0 plus F1.0F Closure | Temporal Planning Surface ist ruhig und funktional; Button-/Keyboard-Kern bleibt final fuer F1.0. | Schedule-Felder, Conflict Scope und Revalidation lokal bewiesen; keine DB-weite Conflict-Sperre. | F1.1 Project/Goal Workbench Depth als naechster Produktblock; Calendar Comfort-Slices nur separat. |
| Portfolio | `local_connected_with_depth_gap` | Task Lifecycle, Project/Goal/Skill Workbench und Evidence-Flows sind aktuell lokal bewiesen. | Project/Goal Workbench-Tiefe fehlt. | W1.1A Core 86/2/0 plus Extensions 25/0/0 | Steuerungsbereich statt Dashboard-Kopie. | Repositories/Relation Labels lokal user-scoped. | F1.1 Project/Goal Workbench Depth. |
| Projects | `local_connected_with_depth_gap` | Project Create/Linked Task/Lifecycle-Pfade sind ueber Portfolio/Entity-Proofs aktuell belastbar. | Milestones, Logs, Resources und Review-Kontext fehlen. | W1.1A Core 86/2/0 | Detailseite braucht mehr Tiefe. | Project ownership gates fuer bestehende Kernflows vorhanden. | F1.1 Project/Goal Workbench Depth. |
| Goals | `local_connected_with_depth_gap` | Goal Create/Linked Project/Linked Task-Pfade sind aktuell lokal belastbar. | Review Cadence, Milestones, Logs und Zielhistorie fehlen. | W1.1A Core 86/2/0 | Zielarbeit braucht echte Progress-Tiefe. | Goal ownership gates fuer bestehende Kernflows vorhanden. | F1.1 Project/Goal Workbench Depth. |
| Resources | `local_connected_with_depth_gap` | Resource Create, Inspector und Relation Create sind aktuell non-skipped gruen. | Graph-/ReadModel-Tiefe und Pagination/Scope fehlen. | W1.1A Extensions 25/0/0 | Knowledge Workbench, Graph nicht dekorativ. | Relation Labels/Targets lokal user-scoped. | F1.3 Resource/Skill Graph. |
| Nutrition | `local_connected_with_depth_gap` | Recipe/Meal Create, Meal Complete und reload-stabile Projektion sind aktuell gruen. | Grocery, Ingredients, Macros und Planner Edit fehlen. | W1.1A Extensions 25/0/0 | Health-sensitive, keine medizinische Ueberbehauptung. | Nutrition Repositories und Date Scopes lokal bewiesen. | F1.2 Nutrition Deep Features. |
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
- Resource Create und Resource Relation Create.
- Nutrition Recipe/Meal Create und Meal Complete.
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
- Nutrition Grocery/Ingredients/Macros/Planner Edit.
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

Naechster ausfuehrbarer Produktblock:

```text
F1.1 Project/Goal Workbench Depth
```

Begruendung:

- F1.0 hat den lokalen task-based Scheduling Core geschlossen.
- Calendar bleibt `local_connected_with_depth_gap`, aber die offenen Calendar-
  Themen sind klar Future Scope statt Blocker fuer den naechsten Produktblock.
- Project- und Goal-Workbenches tragen die naechste zentrale P1-Depth-Luecke.

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

Weitere Reihenfolge:

1. F1.1 Project/Goal Workbench Depth.
2. F1.2 Nutrition Deep Features.
3. F1.3 Resource/Skill Graph Read Model.
4. F1.4 Route-level Manual/Auth Feedback.
5. F2.0 External AI Provider Governance.
6. F2.1 Recurring Full Management.
7. F2.2 Archive Browser and Undo.

Completion Gate:

```text
PASS_WITH_DEFERRED
```

F0.1 ist als Docs-/Claim-Review abgeschlossen. Product Completion bleibt wegen
den dokumentierten Depth-Gaps bewusst offen.
