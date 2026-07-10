# Calendar Finalization Closure F1.0F

Stand: 2026-07-11
Status: Completed docs-only closure
Zweck: Abschluss von F1.0 Calendar Finalization als local-first, task-based
Scheduling Core und explizite Einordnung der verbleibenden Calendar-Tiefe.
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `DATA_MODEL.md`,
`SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`docs/product/calendar-finalization-scope-f1-0a.md`,
`docs/product/calendar-drag-resize-design-lock.md`,
`docs/product/final-product-completion-roadmap.md` und die F1.0B-F1.0E
QA-Dokumente.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, Tests, Migrationen,
RLS-/Policy-Aenderungen, Remote-DB, Deployment, freie Calendar Events,
Pointer Drag/Resize oder Schedule-History-Implementierung.

## 1. Zweck

F1.0F schliesst F1.0 Calendar Finalization als local-first Abschlussdokument.

Entscheidung:

```text
Task Scheduling Core ist lokal connected.
Calendar bleibt local_connected_with_depth_gap.
Pointer Drag/Resize, freie Events und Schedule-History sind Future Scope.
```

Der Abschluss verhindert zwei falsche Claims:

- Der bewiesene Button-/Keyboard-Scheduling-Kern bleibt nicht kuenstlich offen.
- Die noch nicht gebaute Calendar-Tiefe wird nicht als final complete verkauft.

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI- oder Layout-Aenderungen
- keine `src`-Aenderungen
- keine Test-Aenderungen
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets, `.env*`, `.local/**`, `private/**`, Backups oder Exports
  lesen oder dokumentieren
- keine Pointer Drag/Resize-Implementierung
- keine freie Calendar-Event-Persistenz
- keine Schedule-History oder Override-Audit-Implementierung
- keine neue DnD-, Calendar- oder Event-Library

## 3. F1.0 Ergebnis

F1.0 Calendar Finalization wurde in kleinen, beweisbaren Schritten
abgeschlossen:

- F1.0A lockte den Scope, den finalen Button-/Keyboard-Kern und die
  Pointer-Drag-Entscheidung.
- F1.0B klaerte UX, Copy und Prepared/Future States fuer Calendar Create,
  Queue, Timed Blocks, Conflict und Override.
- F1.0C haertete Scheduling-, Move-, Duration-, Unschedule- und
  Conflict-Proofs.
- F1.0D finalisierte sichtbare Conflict-/Override-Semantik ohne DB-weite
  Sperrbehauptung.
- F1.0E pruefte Calendar-Projektionen nach Today und Dashboard.
- F1.0F schliesst die Claim- und Future-Scope-Grenzen.

Completion Gate:

```text
PASS_WITH_DEFERRED
```

Deferred sind bewusst Pointer/Touch Drag-Resize, freie Calendar Events,
DB-weite Conflict-Sperre, Override-Audit/Schedule-History und weitere
Calendar-Depth.

## 4. Local-connected Calendar Core

Der lokale task-based Scheduling Core ist abgeschlossen:

- Planner Queue zeigt Tasks mit Tagesbezug ohne `scheduled_start_at`.
- Scheduling schreibt Task-Zeitfelder ueber bestehende Task Actions.
- Timed Blocks zeigen Tasks mit `planned_date`, `scheduled_start_at` und
  `duration_minutes`.
- `15 min frueher`, `15 min spaeter`, `Dauer -15 min`, `Dauer +15 min`,
  `Unschedule` und `Mark done` bleiben der finale bedienbare Kern.
- Sichtbares Conflict Blocking prueft geladene Calendar ViewModel Blocks.
- `Trotzdem terminieren` ist eine bewusste Override-Aktion ueber denselben
  Task-Reschedule-Pfad.
- Today Activity, Today Planner, Dashboard Today Agenda und Calendar active
  views projizieren denselben Task-Zustand nach Reload.

Dieser Claim gilt lokal fuer Manual/Supabase-backed Task-Flows. Er ist kein
Production-, Remote- oder final-complete-Claim fuer die gesamte Calendar
Surface.

## 5. Proof Summary

Aktuelle F1.0-Proof-Basis:

| Block | Proof | Ergebnis |
| --- | --- | --- |
| F1.0B | Focused Browser Proof `Calendar|Today|Dashboard|Manual` | 71 passed, 2 skipped, 0 failed |
| F1.0C | Gezielter Scheduling-Proof | 3 passed, 0 failed |
| F1.0C | Focused Full-Grep `Calendar|Today|Dashboard|Manual` | 71 passed, 2 skipped, 0 failed |
| F1.0D | Gezielter Conflict-/Override-Proof | 2 passed, 0 failed |
| F1.0D | Focused Full-Grep `Calendar|Today|Dashboard|Manual` | 72 passed, 2 skipped, 0 failed |
| F1.0E | Gezielter Projection-Proof | 6 passed, 0 failed |
| F1.0E | Focused Full-Grep `Calendar|Today|Dashboard|Manual` | 72 passed, 2 skipped, 0 failed |

F1.0F fuehrt keinen neuen Playwright-Proof aus, weil dieser Block docs-only
ist und keine UI, Form, Navigation, Persistenz oder Projektion aendert.

## 6. Pointer/Touch Drag-Resize Future Scope

Pointer Drag/Resize bleibt ein spaeterer Komfort-Slice, nicht der F1.0-Kern.

Gruende:

- Button-/Keyboard-Scheduling ist bereits bedienbar und reload-stabil bewiesen.
- Pointer Drag/Resize koppelt Hit Testing, Layoutstabilitaet, Accessibility,
  Mobile-Verhalten, Conflict UI und Reload-Proof in einem riskanten Scope.
- Personal local-first Nutzung braucht zuerst einen stabilen Kern, keine
  indirekte Drag-Abhaengigkeit.

Future Acceptance fuer einen spaeteren Slice:

- Drag bewegt einen Task in 15-Minuten-Schritten.
- Resize aendert Dauer in 15-Minuten-Schritten und respektiert eine
  Mindestdauer von 15 Minuten.
- Keyboard-/Button-Fallback bleibt gleichwertig.
- Mobile bekommt einen expliziten Fallback; Touch Drag ist nicht automatisch
  impliziert.
- Loading-, Error-, Conflict- und Override-Zustaende sind bedienbar.
- Kein neuer Grid- oder DnD-Library-Import ohne Stop/Review.
- Keine DB-weite Conflict-Sicherheit wird behauptet.
- Playwright-Proof deckt move, resize, conflict, override, reload und
  Keyboard-Fallback ab.

## 7. Free Calendar Events Future Scope

Freie Calendar Events bleiben Future Scope.

Aktueller Claim:

- Calendar Create darf vorbereitet oder lokal previewed sein.
- Persistenz wird nur fuer Task Scheduling behauptet.
- Calendar ist keine zweite kanonische Event-Datenbank.

Ein spaeterer Free-Events-Slice braucht vor Implementierung:

- Datenmodellentscheidung fuer freie Events.
- Ownership-, Auth-, Zod-, Repository- und Revalidation-Pfad.
- UI, die Task Blocks und freie Events klar trennt.
- Reload- und Browser-Proof.
- Security-/Privacy-Gate fuer eventuelle externe Kalenderdaten.

## 8. Schedule-History / Override-Audit Future Scope

Schedule-History und Override-Audit bleiben Future Scope.

Aktueller Zustand:

- Override ist eine bewusste UI-Aktion.
- Der Write nutzt denselben Task-Reschedule-Pfad wie normales Scheduling.
- Es gibt keinen separaten Backend-Override-Contract.
- Es gibt keine Audit-Tabelle, Schedule-History oder DB-weite Conflict-Sperre.

Ein spaeterer Audit-Slice braucht:

- Datenmodell fuer History-/Audit-Eintraege.
- Same-user Ownership fuer Task und History Target.
- klare UI fuer Verlauf, nicht nur Debug-Daten.
- Reload-Proof fuer History-Anzeige.
- keine falsche Sicherheitsbehauptung aus einem reinen UI-Gate.

## 9. What Calendar Now Claims

Calendar darf jetzt behaupten:

- `Task Scheduling Core = local_connected`
- `Calendar = local_connected_with_depth_gap`
- Button-/Keyboard-Scheduling ist der finale lokale Kern fuer F1.0.
- Calendar Queue, Timed Blocks, Today und Dashboard nutzen denselben
  Task-Zustand.
- sichtbare Conflicts und bewusster Override sind lokal proof-stabil.
- F1.0 ist als local-first Calendar-Finalization-Scope geschlossen.

## 10. What Calendar Does Not Claim

Calendar behauptet nicht:

- final complete
- production-ready
- remote-ready
- public SaaS readiness
- externe Calendar-Integration
- DB-weite Conflict-Sperre
- Pointer/Touch Drag-Resize
- freie Calendar-Event-Persistenz
- Schedule-History oder Override-Audit
- vollstaendigen Calendar Inspector Deep-Proof fuer jeden Button
- dass lokale Browser-Proofs Production-/Target-Env-Proofs ersetzen

## 11. Remaining Risks

- Conflict-Scope bleibt ViewModel-/UI-basiert und prueft nur geladene sichtbare
  Blocks.
- Manual-DB-Dichte kann spaetere Selector-, Pagination- oder Capacity-Risiken
  sichtbar machen.
- Dashboard-/Today-Projektionen sind lokal bewiesen, aber nicht als Production-
  Performance- oder Target-Env-Proof.
- Pointer Drag/Resize kann spaeter Accessibility, Touch, Layout und Proof-
  Stabilitaet gleichzeitig belasten.
- Free Events und Audit-History brauchen eigene Datenmodell- und Security-
  Entscheidungen.

## 12. Next Product Block

Naechster Produktblock:

```text
F1.1 Project/Goal Workbench Depth
```

Begruendung:

- Calendar Scheduling ist als local-first Task Core ausreichend geschlossen.
- Die naechste zentrale Depth-Luecke liegt bei Project- und Goal-Workbenches.
- F1.1 muss Prepared-Zonen fuer Milestones, Logs, Resources und Review Cadence
  entweder real persistieren oder ehrlich deferred lassen.

F1.1 bleibt ein separater Vertical Slice mit eigenem Scope, Proof und
Completion Gate.
