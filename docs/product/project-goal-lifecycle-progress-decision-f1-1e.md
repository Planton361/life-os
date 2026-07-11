# F1.1E Project / Goal Lifecycle & Progress Model Decision

Stand: 2026-07-11
Status: Completed decision lock
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/project-goal-workbench-depth-scope-f1-1a.md`,
`docs/qa/project-workbench-entity-edit-f1-1c.md`,
`docs/qa/goal-workbench-entity-edit-f1-1d.md`.
Gilt fuer: Project-/Goal-Lifecycle-Semantik, Progress-/Metric-Grenzen,
Archive/Complete/Achieve/Pause-Trennung, Undo-/Restore-Folge-Scope.
Nicht gilt fuer: UI-Aenderungen, `src/`, Tests, Migrationen,
RLS-/Policy-Aenderungen, Remote-DB, Deployment, Secrets, Milestones, Logs,
Review Cadence, Key Results, Graph oder AI Coach.

## Ziel

F1.1E sperrt die fachliche Semantik nach F1.1C/F1.1D, bevor weitere
Workbench-Tiefe gebaut wird:

- Project/Goal Lifecycle-Begriffe werden getrennt.
- Progress wird nicht ueberbehauptet.
- Archive, Complete, Achieve und Pause bekommen getrennte Bedeutungen.
- Undo/Restore wird als Folge-Scope eingeordnet.
- Bestehende UI und bestehende Server Actions bleiben unveraendert.

## Source Audit

Bestehende Project-Statuswerte:

- `idea`
- `active`
- `paused`
- `blocked`
- `completed`
- `archived`

Bestehende Goal-Statuswerte:

- `draft`
- `active`
- `paused`
- `achieved`
- `archived`

Bestehende Progress-Felder:

- `projects.progress integer not null default 0`
- `goals.progress integer not null default 0`
- beide Felder sind per Check Constraint auf `0..100` begrenzt

Aktueller Real-Data-Adapter:

- Real-Data Projects werden fuer Portfolio aktuell mit `progress: 0`
  abgebildet.
- Real-Data Goals werden fuer Portfolio aktuell mit `progress: 0`
  abgebildet.
- Workbench-Metriken kommen aus verknuepften Tasks, linked Projects und
  Terminierungsdaten, nicht aus einem finalen Progress-ReadModel.

Aktuell verbundene Lifecycle-Pfade:

- Project Entity Edit inklusive Statusfeld.
- Project Soft Archive ueber `status = archived` plus `archived_at`.
- Goal Entity Edit inklusive Status- und Horizon-Feld.
- Goal Soft Archive ueber `status = archived` plus `archived_at`.
- Task Complete/Reopen/Archive fuer linked Tasks.

Nicht vorhanden:

- kein Project `completed_at`
- kein Goal `achieved_at`
- kein Project-/Goal-History- oder Audit-Log
- kein Milestone-Modell
- kein Key-Result-Modell
- kein Review-Cadence-Modell
- kein persisted Progress-ReadModel

## Lifecycle Decision

### Project

| Status | Bedeutung | Finalitaet in F1.1E |
| --- | --- | --- |
| `idea` | Project-Kandidat oder noch nicht zugesagter Arbeitsrahmen. | Feldzustand verbunden, keine Abschlusslogik. |
| `active` | Project wird aktuell bearbeitet. | Feldzustand verbunden. |
| `paused` | Bewusst geparkt, aber weiterhin fachlich vorhanden. | Feldzustand verbunden; keine Archive- oder Done-Semantik. |
| `blocked` | Project braucht Entscheidung, externe Abhaengigkeit oder Klaerung. | Feldzustand verbunden; nicht gleich Pause und nicht gleich Archive. |
| `completed` | Outcome ist fachlich erledigt oder abgeschlossen. | Nur Statusfeld verbunden; finaler Close-Flow mit Datum/Audit ist Future Scope. |
| `archived` | Aus aktiven Listen ausgeblendet und als Soft Archive markiert. | Soft Archive verbunden; kein Outcome-Claim. |

### Goal

| Status | Bedeutung | Finalitaet in F1.1E |
| --- | --- | --- |
| `draft` | Ziel ist noch in Klaerung. | Feldzustand verbunden. |
| `active` | Ziel wird verfolgt. | Feldzustand verbunden. |
| `paused` | Ziel ist bewusst geparkt, aber nicht verworfen. | Feldzustand verbunden; keine Archive- oder Achieved-Semantik. |
| `achieved` | Ziel wurde fachlich erreicht. | Nur Statusfeld verbunden; finaler Achievement-Flow mit Messlogik/Audit ist Future Scope. |
| `archived` | Aus aktiven Listen ausgeblendet und als Soft Archive markiert. | Soft Archive verbunden; kein Outcome-Claim. |

## Archive / Complete / Achieve / Pause

Locked Decision:

- Archive ist Sichtbarkeit und Ablage, kein Erfolg und kein Misserfolg.
- Project Complete ist Outcome, nicht Archive.
- Goal Achieve ist Outcome, nicht Archive.
- Pause ist ein reversibler Wartezustand, nicht Archive.
- Project Blocked ist ein Klaerungszustand, nicht Pause und nicht Archive.
- Statusfeld-Edit ist verbunden, aber kein finaler Lifecycle-Wizard.
- Complete/Achieve duerfen nicht automatisch aus Task-Zaehlern,
  `progress = 100` oder leerer Restarbeit abgeleitet werden.
- Archive loescht keine linked Tasks, Projects, Resources oder Relations.

Praktische Folge:

```text
Soft Archive = status archived + archived_at gesetzt + aktive Listen blenden aus
Complete/Achieve = fachlicher Outcome-Status, aber noch ohne finalen Close-Flow
Pause = sichtbar geparkt, spaeter wieder aktivierbar
Undo/Restore = Future Scope
```

## Progress Model Decision

F1.1E entscheidet gegen Fake-Progress.

Current connected truth:

- Project Workbench darf linked Task Counts als Arbeits-Signal zeigen.
- Goal Workbench darf linked Project Counts und linked Task Counts als
  Arbeits-Signal zeigen.
- Diese Signale sind keine finale Prozentzahl und kein Outcome-Nachweis.

Project Work Signal:

```text
totalLinkedTasks = Tasks mit projectId
completedLinkedTasks = linked Tasks mit status done
openLinkedTasks = linked Tasks ohne status done
scheduledLinkedTasks = linked Tasks mit scheduledTime
```

Goal Work Signal:

```text
totalLinkedProjects = Projects mit goalId
activeLinkedProjects = linked Projects, deren Portfolio-Status nicht done ist
totalLinkedTasks = Tasks mit goalId
completedLinkedTasks = linked Tasks mit status done
openLinkedTasks = linked Tasks ohne status done
scheduledLinkedTasks = linked Tasks mit scheduledTime
```

Nicht erlaubt als finaler Claim:

- `Project ist 100% fertig`, nur weil alle linked Tasks erledigt sind.
- `Goal ist erreicht`, nur weil alle linked Tasks erledigt sind.
- `Goal ist X% erreicht`, solange Measure/Target/Key Results nicht als
  echtes Modell entschieden und bewiesen sind.
- Fortschrittsringe, Donuts oder dekorative Charts ohne echte Entscheidung.

Persisted Progress-Felder:

- `projects.progress` und `goals.progress` bleiben bestehende DB-Felder.
- F1.1E macht sie nicht zur finalen Produktwahrheit.
- Workbench darf diese Felder nicht als finale Completion- oder Achievement-
  Wahrheit ausgeben, solange kein Progress-Engine-Slice existiert.
- Spaetere Nutzung muss klar labeln, ob ein Wert manuell, task-basiert,
  milestone-basiert oder key-result-basiert ist.

## Future Progress Options

Option A: Derived Task Work Signal

- keine neue Tabelle zwingend noetig
- liest linked Tasks und berechnet Counts
- beantwortet: "Wie viel Arbeit ist erledigt?"
- beantwortet nicht: "Ist das Project fachlich abgeschlossen?" oder
  "Ist das Goal erreicht?"

Option B: Milestone-driven Project Progress

- braucht Milestone-Datenmodell oder bewusstes Nichtbauen
- braucht Ownership fuer Project/Milestone
- kann spaeter Project-Fortschritt fachlich besser tragen als reine Tasks

Option C: Key-Result-/Measure-driven Goal Progress

- braucht entschiedenes Goal-Metric-/Key-Result-Modell
- muss `measure`, `target_value`, `current_value` und Review-Kontext klaeren
- ist nicht Teil von F1.1E

Locked Follow-up:

- F1.1G entscheidet Milestones, Logs und Review Cadence.
- Ein Progress-Engine-Slice darf erst danach final implementieren, wenn die
  Datenbasis entschieden ist.

## Undo / Restore Decision

Undo/Restore bleibt Future Scope.

Minimaler Restore-Scope fuer Soft Archive waere:

- Server Action mit serverseitiger Auth.
- Zod `safeParse`.
- same-user Ownership fuer Project oder Goal.
- Repository-Grenze.
- Row-Guard: `archived_at is not null`.
- Explizites Ziel fuer den wiederhergestellten Status, statt vorherigen
  Status ohne History zu raten.
- Revalidation.
- Reload-Proof und Browser-Proof.

Nicht akzeptabel:

- Restore, das vorherige Statuswerte erfindet.
- Undo, das ohne Audit- oder History-Konzept einen finalen Lifecycle behauptet.
- Undo/Restore als generischer Client-State ohne DB-Wahrheit.

## Backend / Security Decision

F1.1E aendert keinen Backend-Code.

Fuer spaetere Lifecycle-Actions gilt:

- Complete/Achieve/Restore duerfen nicht nur als UI-Konvention entstehen.
- Wenn sie als finale Actions gebaut werden, brauchen sie eigene Server
  Actions oder bewusst gesicherte Status-Actions.
- Jede relationale Zielzeile braucht same-user Ownership.
- Keine Service Role.
- Keine Remote-DB-Aktion.
- Keine Migration ohne eigenen Migrations-/RLS-/Proof-Scope.

## Design Taste Review

Was passt zu V5:

- Textbasierte Work Signals passen zur ruhigen Command-Center-Richtung.
- Counts fuer linked Tasks/Projects geben Entscheidungskontext ohne Chart-
  Overload.
- Prepared/Future-Sprache verhindert falsche Persistenz- und Progress-Claims.

Was verletzt V5:

- Eine finale Prozentzahl ohne echte Datenbasis wuerde AI-Slop und Chart-
  Overclaim erzeugen.
- Donuts, Rings oder dekorative Graphen wuerden P0/P1-Hierarchie schwaechen.

Konkrete Fixes:

- Keine UI-Aenderung in F1.1E.
- Spaetere UI-Slices muessen Progress text-backed, semantisch gelabelt und
  ohne rein dekorative Visualisierung halten.

Acceptance Decision:

- `PASS`: Der Decision Lock respektiert V5, weil er Progress als
  Entscheidungssignal statt Dekoration behandelt.

## Claim Impact

Vor F1.1E:

```text
Project/Goal Soft Archive = local_connected
Project/Goal Status Field Edit = local_connected
Project/Goal final Lifecycle = future/depth gap
Project/Goal Progress Model = unresolved depth gap
```

Nach F1.1E:

```text
Project/Goal Soft Archive = local_connected
Project/Goal Status Field Edit = local_connected
Project Complete / Goal Achieve final flow = future/depth gap
Project/Goal Undo/Restore = future/depth gap
Project/Goal Work Signal = local_connected read signal
Project/Goal Progress Engine = future/depth gap
```

Keine Production-, Remote-, Public-SaaS- oder final-complete-Claims werden
angehoben.

## Validation

Startcheck ausgefuehrt:

- `git status --short`: nur pre-existing `docs/product/life-os-full-roadmap-checklist.md`
  und `private/` untracked.
- `git log --oneline -10`: HEAD `678b974 feat: add goal workbench editing`.
- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm exec supabase db lint --local --level warning`: No schema errors found.
- `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`:
  No issues found.

F1.1E ist docs-only. Browser-Proof ist nicht erforderlich, weil keine UI,
keine Server Action, keine Repository-Logik und keine Projektion geaendert
wurde.

## Completion Decision

`PASS_WITH_DEFERRED`

Der Decision-Lock ist abgeschlossen. Defer bleibt bewusst fuer:

- Complete-/Achieve-Finalisierung.
- Undo/Restore.
- Milestones.
- Logs.
- Review Cadence.
- Progress Engine.
- Graph / Relation Map.
- AI Coach.
