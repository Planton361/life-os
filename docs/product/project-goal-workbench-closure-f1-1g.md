# F1.1G Project / Goal Workbench Closure & Next Depth Decision

Stand: 2026-07-11
Status: Completed closure / decision block
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/project-goal-workbench-depth-scope-f1-1a.md`,
`docs/qa/project-goal-workbench-state-clarity-f1-1b.md`,
`docs/qa/project-workbench-entity-edit-f1-1c.md`,
`docs/qa/goal-workbench-entity-edit-f1-1d.md`,
`docs/product/project-goal-lifecycle-progress-decision-f1-1e.md`,
`docs/qa/project-goal-resource-evidence-depth-f1-1f.md`,
`docs/product/final-product-completion-roadmap.md` und
`docs/product/final-surface-connected-claim-review-f0-1.md`.
Gilt fuer: F1.1 Project/Goal Workbench Depth Closure, Connected Claims,
Deferred-Work-Grenzen und naechste Produktbereichsentscheidung.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src`, Tests, Migrationen,
RLS-/Policy-Aenderungen, Remote-DB, Deployment oder Secrets.

## 1. Zweck

F1.1G schliesst den Project/Goal-Workbench-Depth-Block nach F1.1F ab.

Der Block dokumentiert:

- was F1.1 erreicht hat
- welche Project- und Goal-Workbench-Flows jetzt connected sind
- welche Browser-Proofs aktuell gruen sind
- welche Deferred Areas bewusst bleiben
- welche Claims Project/Goal jetzt tragen duerfen
- welcher Produktbereich als naechstes bearbeitet wird

Kernentscheidung:

```text
Project/Goal Workbench Core ist local-first proof-stable.
Project/Goal Workbench ist nicht final complete.
Milestones/Logs/Review/Graph/AI bleiben spaetere Slices.
```

## 2. Nicht-Ziele

- keine Produktfeatures bauen
- keine UI-Aenderungen
- keine `src`-Aenderungen
- keine Test-Aenderungen
- keine Migration
- keine RLS-/Policy-/Grant-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets, `.env*`, `.local/**`, `private/**`, Backups oder Exports
  lesen oder dokumentieren
- keine neue Library
- kein Graph, keine AI-Coach-Funktion und keine Milestone-/Log-Persistenz

## 3. F1.1 Ergebnis

F1.1 hat die Project/Goal Workbench von einem verbundenen Kern mit sichtbaren
Depth-Gaps zu einem klar begrenzten, local-first proof-stable Core gebracht.

Erreicht:

- F1.1A hat Scope, Nicht-Ziele, Prepared/Future Areas und Slice-Reihenfolge
  gelockt.
- F1.1B hat Workbench-State, Prepared/Future-Copy und Progress-Sprache
  geschaerft.
- F1.1C hat Project Entity Edit, Statusfeld und Soft Archive verbunden.
- F1.1D hat Goal Entity Edit, Horizon-/Statusfeld und Soft Archive verbunden.
- F1.1E hat Lifecycle- und Progress-Semantik entschieden: Work Signals sind
  erlaubt, finale Progress Engine bleibt future.
- F1.1F hat Workbench-lokales Linken vorhandener Resources und read-only Skill
  Evidence Display verbunden.

Nicht erreicht und nicht behauptet:

- Project/Goal Workbench ist nicht final complete.
- Project/Goal Workbench ist kein Production-, Remote- oder Public-SaaS-Claim.
- Milestones, Logs, Review Cadence, Undo/Restore, Progress Engine, Graph,
  AI Coach und Evidence Create direkt aus der Workbench sind nicht verbunden.
- Entity Detail Routes bleiben nicht als final abgestimmte zweite
  Workbench-Wahrheit behauptet.

## 4. Connected Project Workbench Core

Aktueller Claim:

```text
Project Workbench = local_connected_with_depth_gap
```

Connected:

- Project Create im Portfolio-Kontext.
- Entity Edit fuer Titel, Summary, Next Action und Status.
- Status Edit als Feld-Update, nicht als finaler Lifecycle-Wizard.
- Soft Archive ueber `status = archived` und `archived_at`.
- Linked Task Create mit Project-Kontext.
- Linked Task Lifecycle: Complete, Reopen, Archive sowie vorhandene
  Schedule-/Unschedule-/Reschedule-Pfade.
- Resource Relation Display fuer echte Resource Relations.
- Resource Relation Link aus dem Project Workbench fuer vorhandene Resources.
- Skill Evidence Display read-only fuer Evidence mit Project Source.

Deferred innerhalb Project:

- Milestones.
- Project Log.
- Review-/History-Kontext.
- Undo/Restore.
- finaler Complete-/Close-Flow.
- Progress Engine jenseits task-basierter Work Signals.
- Graph / Relations Map.
- AI Coach.
- Evidence Create direkt aus Project Workbench.

## 5. Connected Goal Workbench Core

Aktueller Claim:

```text
Goal Workbench = local_connected_with_depth_gap
```

Connected:

- Goal Create im Portfolio-Kontext.
- Entity Edit fuer Titel, Summary, Horizon und Status.
- Status Edit als Feld-Update, nicht als finaler Achievement-Wizard.
- Soft Archive ueber `status = archived` und `archived_at`.
- Linked Task Create mit Goal-Kontext.
- Goal linked Project Create.
- Linked Task Lifecycle: Complete, Reopen, Archive sowie vorhandene
  Schedule-/Unschedule-/Reschedule-Pfade.
- Resource Relation Display fuer echte Resource Relations.
- Resource Relation Link aus dem Goal Workbench fuer vorhandene Resources.
- Skill Evidence Display read-only fuer Evidence mit Goal Source.

Deferred innerhalb Goal:

- Milestones.
- Goal Log.
- Review Cadence.
- Review Notes / Zielhistorie.
- Undo/Restore.
- finaler Achieve-/Close-Flow.
- Progress Engine jenseits linked Project-/Task-Work Signals.
- Graph / Relations Map.
- AI Coach.
- Evidence Create direkt aus Goal Workbench.

## 6. Proof Summary

Aktuelle Proof-Basis:

- W1.1A Core: 86 passed, 2 skipped, 0 failed.
- W1.1A Extensions: 25 passed, 0 skipped, 0 failed.
- F1.1B focused Project/Goal Workbench state clarity:
  27 passed, 0 failed.
- F1.1C Project Workbench edit/archive proof:
  69 passed, 6 skipped, 0 failed; F1.1C-relevante Project Workbench Tests
  passed.
- F1.1D Goal Workbench edit/archive proof:
  28 passed, 0 failed.
- F1.1F final Resource/Evidence proof:
  37 passed, 0 failed, 0 skipped.

F1.1G fuehrt keinen neuen Browser-Proof aus, weil dieser Block docs-only ist:
keine UI, keine Server Action, keine Repository-Logik und keine Projektion
wurden geaendert.

Browser-Proof-Entscheidung:

```text
Browser-Proof: NOT_NEEDED
```

Begruendung: F1.1G dokumentiert Closure und Next Product Area. Der aktuellste
relevante user-visible Proof bleibt F1.1F mit 37 passed, 0 failed, 0 skipped.

## 7. Deferred Work

| Area | Warum deferred? | Datenmodell-/Backend-Frage | UI-Gefahr | Noetige Browser-Proofs |
| --- | --- | --- | --- | --- |
| Milestones | Kein entschiedenes Project-/Goal-Milestone-Modell. | Braucht Milestone-Entity oder bewusstes Nichtbauen, User-Scope, Target Ownership, Status, Reihenfolge, Due Dates und Revalidation. | Fake-Milestones oder OKR-artige Listen koennen finale Planung vortaeuschen. | Create, edit, complete/archive, reorder, reload, empty state und same-user target proof. |
| Logs | Kein entschiedenes Log-/History-Modell. | Braucht Log-Entity mit `user_id`, Target Type/ID, Source, Timestamp, optional Edit/Delete-Semantik und Ownership. | Timeline kann wie Audit wirken, obwohl nur Notiz-Copy existiert. | Create, read, edit/archive falls erlaubt, reload, scoped display im richtigen Project/Goal. |
| Review Cadence | Review-Rhythmus ist fachlich unentschieden. | Braucht Cadence-Felder oder Review-Record-Verknuepfung, next-review Berechnung und same-user Ownership. | UI kann Druck oder falsche Faelligkeiten erzeugen. | Cadence setzen, Review-Instanz erzeugen oder anzeigen, next due nach Reload, overdue/empty states. |
| Undo/Restore | Soft Archive ist verbunden, aber History fehlt. | Braucht Restore-Action mit Auth, Zod, Ownership, archived-row Guard und explizitem Zielstatus; echtes Undo braucht Audit/History. | Restore koennte vorherige Statuswerte erfinden oder Archive als reversiblen Client-State tarnen. | Archive, restore to explicit status, reload, relation retention und active-list visibility proof. |
| Progress Engine | F1.1E erlaubt nur Work Signals. | Braucht Entscheidung, ob Fortschritt task-, milestone-, measure- oder key-result-basiert ist; ggf. ReadModel. | Prozentzahlen koennen Completion/Achievement falsch behaupten. | Berechnung aus entschiedener Quelle, label proof, reload, edge cases ohne Tasks/Milestones. |
| Graph / Relations Map | Relation-Semantik ist noch nicht breit genug fuer Graph-Claims. | Braucht ReadModel, Query Scope, Pagination, Relation Types, Labels und Accessibility-Strategie. | Dekorative Node Map ohne Entscheidung, schlechte Tastatur-/Screenreader-Nutzbarkeit. | Relation appears/disappears, scoped graph/list fallback, empty state, keyboard path, reload. |
| AI Coach | AI-Governance und Provider Boundary sind nicht entschieden. | Braucht Privacy, prompt/logging policy, provider fallback, no-auto-write Gate und server-only secrets. | Magische oder autonome Empfehlungen koennen Nutzerkontrolle und Datenschutz brechen. | Suggestion erzeugen, failure state, confirm-only persistence, no auto-write, reload after confirmed write. |
| Evidence Create aus Workbench | Evidence Create ist im Skill Workbench verbunden und fachlich dort kohesiv. | Braucht Skill-Auswahl, Evidence Source, same-user Ownership, Duplicate/Label-Handling und Revalidation im Project/Goal-Kontext. | Doppelte Evidence-Workflows koennen Source-Wahrheit und Skill-Kontext verwischen. | Evidence create for Project/Goal source, source label, reload, appears in Workbench and Skill context. |

Resource Relation Link ist connected. Resource Manage/Edit/Unlink direkt im
Project/Goal Workbench bleibt dennoch deferred, weil es eigene Ownership-,
Duplicate-, Revalidation- und UI-Erwartungen ausloest.

## 8. What Project/Goal Now Claims

Project/Goal duerfen jetzt behaupten:

```text
Project Workbench = local_connected_with_depth_gap
Goal Workbench = local_connected_with_depth_gap
```

Connected Claims:

- Entity Edit.
- Status Edit.
- Soft Archive.
- Linked Task Create/Lifecycle.
- Goal linked Project Create.
- Resource Relation Link.
- Skill Evidence Display read-only.

Zusammenfassung:

```text
Project/Goal Workbench Core ist local-first proof-stable.
```

Diese Claims gelten lokal, user-scoped und fuer die bewiesenen Workbench-Kerne.
Sie sind keine Production-, Remote-, Public-SaaS- oder final-complete-Claims.

## 9. What Project/Goal Does Not Claim

Project/Goal behaupten nicht:

- finale Project-/Goal-Completion.
- finalen Project Complete- oder Goal Achieve-Flow.
- Undo/Restore.
- finale Milestones.
- Logs oder Audit Trail.
- Review Cadence oder Zielhistorie.
- finale Progress Engine.
- Graph / Relations Map.
- AI Coach.
- Evidence Create direkt aus der Project/Goal Workbench.
- Resource Management/Edit/Unlink direkt aus der Project/Goal Workbench.
- Production Ready, Remote Ready oder Public SaaS Ready.

## 10. Next Product Area Decision

Bewertete Optionen:

| Option | Bewertung | Entscheidung |
| --- | --- | --- |
| Option A: F1.2 Nutrition Deep Features | Daily-use-relevant, in der Roadmap bereits als naechster P1-Depth-Bereich vorgesehen, und nach Project/Goal ausreichend unabhaengig schneidbar. | Recommended. |
| Option B: F1.2 Resource / Skill Graph | Wichtig, aber Graph/Skill-Map kann schnell dekorativ oder semantisch zu breit werden. Erst nach klarer Relation-/ReadModel-Entscheidung starten. | Deferred. |
| Option C: F1.2 Milestones / Logs / Review Cadence | Fachlich naheliegend, aber direkt nach F1.1 zu viel Project-Management-Tiefe und datenmodelllastig. F1.1 hat bewusst einen proof-stable Core statt finaler Tiefe geschlossen. | Deferred. |
| Option D: F1.2 Today / Dashboard Final Daily Flow Polish | P0 bleibt wichtig, aber der aktuelle Dashboard/Today-Kern ist proof-stable genug, um den naechsten P1-Daily-Use-Bereich zu vertiefen. | Deferred. |

Entscheidung:

```text
Next Product Area = F1.2 Nutrition Deep Features
```

Begruendung:

- Nutrition ist daily-use-relevant.
- Project/Goal ist fuer den aktuellen Stand ausreichend connected.
- Nutrition hat bereits lokale Recipe-/Meal-Kernproofs, aber klare
  Depth-Gaps bei Grocery, Ingredients, Macros und Planner Edit.
- Graph, Milestones/Logs/Review und AI koennen schnell zu gross werden und
  sollten erst als spaetere, streng geschnittene Vertical Slices folgen.

F1.2 sollte weiterhin nur einen Nutrition-Depth-Aspekt pro Block entscheiden
und beweisen.

## 11. Risks

- Overclaim Risk: `local_connected_with_depth_gap` darf nicht als final
  complete gelesen werden.
- Scope Creep: Milestones, Logs, Review, Graph und AI koennen Project/Goal in
  eine zweite Projektmanagement-App verwandeln.
- Route Truth Risk: Portfolio Workbench und Entity Detail Routes muessen
  spaeter abgestimmt werden, damit keine konkurrierende Project/Goal-Wahrheit
  entsteht.
- Proof Drift: F1.1F ist aktuell gruen; spaetere Copy-, Selector- oder
  relationale Aenderungen brauchen neue focused Proofs.
- Nutrition Scope Risk: F1.2 kann ebenfalls zu breit werden, wenn Grocery,
  Ingredients, Macros und Planner Edit gleichzeitig gebaut werden.

Completion Gate:

```text
PASS_WITH_DEFERRED
```

F1.1G ist abgeschlossen. Die Deferred Areas sind bewusst begrenzt und bleiben
separate spaetere Slices.
