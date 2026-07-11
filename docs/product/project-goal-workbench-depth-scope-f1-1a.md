# F1.1A Project / Goal Workbench Depth Scope Lock

Stand: 2026-07-11
Status: Completed docs-only scope lock; no product implementation
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/final-surface-connected-claim-review-f0-1.md`,
`docs/product/final-product-completion-roadmap.md`,
`docs/product/calendar-finalization-closure-f1-0f.md`,
`docs/qa/browser-proof-recovery-w1-1a.md`.
Gilt fuer: F1.1 Project/Goal Workbench Depth, Slice-Reihenfolge,
Connected-/Prepared-/Future-Einordnung, Proof-Erwartung.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src/`, Tests,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB, Deployment oder Secrets.

## 1. Zweck

F1.1A startet den naechsten finalen Produktbereich nach F1.0 Calendar
Finalization: Project/Goal Workbench Depth.

Dieser Scope Lock klaert:

- welche Project- und Goal-Workbench-Flows bereits lokal connected sind
- welche Bereiche nur vorbereitet oder Future Scope sind
- welche Design- und Datenluecken die finale Tiefe blockieren
- wie F1.1 in kleine Vertical Slices geschnitten wird
- welcher Folgeblock als erster ausfuehrbarer Implementierungsblock startet

F1.1A baut keine Features. Der Block ist ein Produkt-/Design-/Proof-
Grenzziehungsdokument.

## 2. Nicht-Ziele

- keine Project- oder Goal-Workbench neu bauen
- keine UI-Aenderung
- keine `src/`-Aenderung
- keine Test-Aenderung
- keine Migration
- keine RLS-/Policy-/Grant-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- kein `supabase link`, `supabase db push` oder `supabase db reset`
- keine Secrets, `.env*`, `.local/**`, `private/**`, Backups oder Exports
  lesen oder dokumentieren
- keine neue Library
- kein Graph-/Skill-Map-Scope
- keine AI-Coach-, Automation- oder Public-SaaS-Entscheidung

## 3. Ausgangslage nach F0.1 / F1.0

F0.1 setzt die aktuellen Claims fuer Portfolio, Projects und Goals auf
`local_connected_with_depth_gap`.

Aktueller lokaler Proof-Stand:

- W1.1A Core: 86 passed, 2 skipped, 0 failed.
- W1.1A Extensions: 25 passed, 0 skipped, 0 failed.
- Project/Goal linked Task/Project Kernpfade sind lokal reload-stabil
  bewiesen.
- Resource Relations zu Project und Goal sind lokal reload-stabil bewiesen.
- Production-, Remote- und Public-SaaS-Claims bleiben ausgeschlossen.

F1.0 schliesst Calendar Finalization:

- `Task Scheduling Core = local_connected`.
- `Calendar = local_connected_with_depth_gap`.
- Pointer Drag/Resize, freie Calendar Events und Schedule-History/
  Override-Audit bleiben Future Scope.

F1.1 ist deshalb der naechste P1-Produktblock, weil Project- und Goal-
Workbenches die naechste zentrale Tiefe-Luecke tragen.

## 4. Project Workbench Current State

Current Claim:

```text
Project Workbench = local_connected_with_depth_gap
```

Lokal connected:

- Project Create ist im Portfolio-Kontext ueber die real-data Project Action
  verbunden.
- Project Workbench zeigt eine echte Project Overview aus dem Portfolio-
  Kontext.
- Linked Tasks werden aus echten Tasks mit `projectId` abgeleitet.
- `Task fuer Project erstellen` erzeugt echte Project-verknuepfte Tasks.
- Task Lifecycle bleibt im Project Workbench nutzbar: Complete, Reopen,
  Archive sowie vorhandene Schedule-/Unschedule-/Reschedule-Pfade.
- Linked Resources werden angezeigt, wenn eine echte Resource Relation auf das
  Project existiert.
- Resource-to-Project Relation Create ist ueber den Resources-Flow bewiesen und
  erscheint nach Reload im Project Workbench.

Prepared:

- Milestones sind sichtbar vorbereitet, aber ohne eigenes persistentes
  Milestone-Modell.
- Project Log ist sichtbar vorbereitet, aber ohne persistente Log-Eintraege.
- Resource Depth ist nur teilweise vorhanden: Relation lesen/anzeigen ist
  connected, Project-lokales Resource Management ist nicht final.

Future oder Depth Gap:

- Project Update, Archive, Complete/Close und Status-Semantik sind nicht als
  finaler Workbench-Lifecycle verbunden.
- Project Progress ist noch kein finales Modell. Supabase-Project-Readmodels
  tragen aktuell keine echte Milestone-/TaskId-Tiefe; die Workbench leitet
  Arbeitsfortschritt aus verknuepften Tasks ab.
- Project Detail Routes existieren, sind aber nicht die final connected
  Workbench-Tiefe und enthalten weiterhin mock-/static-nahe Aktionen.
- Project Review-Kontext, Ressourcenentscheidungen, History und Audit Trail
  sind nicht finalisiert.

Proof-Basis:

- `Manual Project Workbench creates linked Project task reload-stable`.
- `Manual Project Workbench keeps linked task lifecycle intact`.
- `Manual Resource to Project Relation Create persists through Resources and
  Project Workbench`.

## 5. Goal Workbench Current State

Current Claim:

```text
Goal Workbench = local_connected_with_depth_gap
```

Lokal connected:

- Goal Create ist im Portfolio-Kontext ueber die real-data Goal Action
  verbunden.
- Goal Workbench zeigt eine echte Goal Overview aus dem Portfolio-Kontext.
- Linked Projects werden aus echten Projects mit `goalId` abgeleitet.
- Linked Tasks werden aus echten Tasks mit `goalId` abgeleitet.
- `Task fuer Goal erstellen` erzeugt echte Goal-verknuepfte Tasks.
- `Project fuer Goal erstellen` erzeugt echte Goal-verknuepfte Projects.
- Task Lifecycle bleibt im Goal Workbench nutzbar: Complete, Reopen, Archive
  sowie vorhandene Schedule-/Unschedule-/Reschedule-Pfade.
- Linked Resources werden angezeigt, wenn eine echte Resource Relation auf das
  Goal existiert.
- Resource-to-Goal Relation Create ist ueber den Resources-Flow bewiesen und
  erscheint nach Reload im Goal Workbench.

Prepared:

- Milestones sind sichtbar vorbereitet, aber ohne eigenes persistentes
  Milestone-Modell.
- Review Cadence ist sichtbar vorbereitet, aber ohne persistente Review-
  Cadence-Daten oder Review-Instanzen.
- Goal Log ist sichtbar vorbereitet, aber ohne persistente Log-Eintraege.
- Resource Depth ist nur teilweise vorhanden: Relation lesen/anzeigen ist
  connected, Goal-lokales Resource Management ist nicht final.

Future oder Depth Gap:

- Goal Update, Pause, Achieve, Archive und Status-Semantik sind nicht als
  finaler Workbench-Lifecycle verbunden.
- Goal Progress ist noch kein finales Modell. Supabase-Goal-Readmodels tragen
  aktuell keine echte linkedProjectIds-/linkedTaskIds-Tiefe; die Workbench
  leitet verknuepfte Arbeit aus Project-/Task-Foreign-Keys ab.
- Goal Detail Routes existieren, sind aber nicht die final connected
  Workbench-Tiefe und enthalten weiterhin mock-/static-nahe Aktionen.
- Zielhistorie, Review Notes, Key Results und Audit Trail sind nicht
  finalisiert.

Proof-Basis:

- `Manual Goal Workbench creates linked Goal task reload-stable`.
- `Manual Goal Workbench creates linked Goal project reload-stable`.
- `Manual Goal Workbench keeps linked task lifecycle intact`.
- `Manual Resource to Goal Relation Create persists through Resources and Goal
  Workbench`.

## 6. Final Workbench Target State

Finale F1.1-Richtung:

```text
Portfolio = Kontext und Sammlung
Project Workbench = Project-Tiefe
Goal Workbench = Goal-Tiefe
Dashboard = Steuerung
Today/Calendar = Ausfuehrung und Zeit
```

Project Workbench final:

- zeigt Project-Zustand, verknuepfte Arbeit, Ressourcen und naechste
  Entscheidungen ohne Dashboard-Kopie
- laesst sichtbare Write-Controls entweder persistieren oder markiert sie klar
  als Prepared/Future
- macht Milestones, Logs und Review-Kontext nur dann final, wenn ein echtes
  Datenmodell, Server Action, Ownership Gate und Reload-Proof existieren
- haelt Resource Relation Display wahr und erweitert es nur in einem eigenen
  Depth-Slice

Goal Workbench final:

- zeigt Zielzustand, verknuepfte Projects, verknuepfte Tasks, Review Rhythmus
  und Fortschritt ohne fake Key Results
- laesst sichtbare Write-Controls entweder persistieren oder markiert sie klar
  als Prepared/Future
- macht Review Cadence, Zielhistorie, Milestones und Logs nur dann final, wenn
  ein echtes Datenmodell, Server Action, Ownership Gate und Reload-Proof
  existieren
- haelt Progress an echter Arbeit und explizit entschiedener Zielmetrik statt
  an dekorativer Prozentzahl

F1.1 ist fertig, wenn Project und Goal Workbench keine irrefuehrenden
Prepared-Zonen mehr enthalten: Jede sichtbare Zone ist connected, eindeutig
Prepared oder bewusst Future.

## 7. Prepared/Future Areas

| Area | Current Classification | F1.1 Decision Need |
| --- | --- | --- |
| Project Milestones | `prepared` | Entweder eigenes Milestone-Modell mit proofbarer Persistenz oder final klar Prepared/Future. |
| Goal Milestones | `prepared` | Wie Project Milestones; kein fake OKR-/KR-Modell ohne Datenentscheidung. |
| Project Log | `prepared` | Persistentes Log/History-Modell nur mit Backend-Slice; sonst final Prepared/Future copy. |
| Goal Log | `prepared` | Persistentes Zieljournal nur mit Backend-Slice; sonst final Prepared/Future copy. |
| Goal Review Cadence | `prepared` | Review-Rhythmus, naechster Review und Review Notes brauchen Datenmodellentscheidung. |
| Project Review Context | `future` | Nur aufnehmen, wenn Project Review fachlich von Logs/Milestones getrennt wird. |
| Resources | `local_connected_with_depth_gap` | Relations lesen/anzeigen ist connected; Workbench-lokales Link/Create/Manage ist Future Depth. |
| Skill Evidence | `local_connected_with_depth_gap` adjacent | Skill Evidence kann Project/Goal-Kontext beruehren, bleibt aber kein F1.1A-Kernfeature. |
| Progress Model | `local_connected_with_depth_gap` | Task-basierte Kennzahlen existieren; finale Project-/Goal-Progress-Semantik fehlt. |
| Project/Goal Archive and Undo | `future` | Task Archive ist connected; Project/Goal Archive/Undo braucht eigenes Gate. |
| Graph / Relations Map | `future` | Kein F1.1-Scope vor gesicherter Relation-Semantik. |
| AI Suggestions / Coach | `future` | Keine autonomen Vorschlaege im Workbench-Depth-Scope. |

## 8. Design Debt

V5-fit:

- Die Workbench ist bereits ruhiger Kontext statt Dashboard-Kopie.
- Linked Tasks, Linked Projects und Resource Display sind funktionale Tiefe,
  keine dekorative Chart-Flaeche.
- Prepared Badges verhindern aktuell falsche Persistenzbehauptungen.
- Textbasierte Kennzahlen passen besser zur `Linear Calm Dark Command Center`
  Richtung als graphische Ueberladung.

Design Debt:

- Copy ist gemischt aus Deutsch und Englisch und muss im ersten UI-Slice
  absichtlich konsistent gemacht werden.
- Prepared/Future Labels sind korrekt, aber noch nicht final genug, um
  Nutzererwartung eindeutig zu steuern.
- Portfolio Workbench und Entity Detail Routes duerfen nicht zwei
  konkurrierende Wahrheiten fuer Project/Goal Tiefe bleiben.
- Progress Copy kann zu final wirken, wenn die Daten nur aus Task-Relationen
  abgeleitet sind.
- Resource Sections zeigen echte Relations, bieten aber im Workbench selbst
  noch keine vollstaendige Relation-Verwaltung.
- Mehr Karten, Graphen oder Charts wuerden die F1.1-Luecke nicht loesen; die
  Tiefe muss aus Verhalten, Daten und klarer Zustandssprache kommen.

## 9. Data/Backend Assessment

Vorhanden und fuer F1.1 wiederverwendbar:

- `projects` und `goals` koennen user-scoped erstellt und gelesen werden.
- `tasks` koennen user-scoped mit `projectId` oder `goalId` erstellt,
  geplant, abgeschlossen, wieder geoeffnet, archiviert und unscheduled/
  rescheduled werden.
- `resources` und `resource_relations` koennen user-scoped Relations zu
  Project und Goal lesen/anzeigen.
- Server Actions nutzen serverseitige Auth, Zod `safeParse`, Repository-
  Grenzen, same-user Ownership fuer relevante Foreign Keys und Revalidation.

Bekannte Backend-Gaps:

- Project Update/Archive/Complete/Close ist nicht als finaler Workbench-Pfad
  verbunden.
- Goal Update/Pause/Achieve/Archive ist nicht als finaler Workbench-Pfad
  verbunden.
- Milestones haben kein entschiedenes Project-/Goal-Datenmodell.
- Project Log, Goal Log, Review Cadence und Zielhistorie haben kein
  entschiedenes Datenmodell.
- Project-/Goal-Progress hat keine finale Formel und kein eigenes persisted
  ReadModel.
- Resource Relations sind vorhanden, aber Workbench-lokales Resource Management
  braucht einen eigenen Slice.

Backend-Regel fuer alle spaeteren F1.1-Implementierungen:

```text
Keine neue Persistenz ohne serverseitige Auth, Zod safeParse, same-user
Ownership, Repository/RPC-Grenze, Revalidation, Reload-Proof und klaren
Prepared-/Error-/Success-Zustand.
```

## 10. F1.1 Vertical Slices

### F1.1B Project / Goal Workbench State Clarity

Ziel: vorhandene connected, prepared und future Workbench-Zonen sichtbar final
klaeren, ohne neues Datenmodell.

Voraussichtlicher Scope:

- Workbench-Copy und State Labels pruefen und schaerfen.
- Connected Linked Work von Prepared Depth eindeutig trennen.
- Project- und Goal-Workbench Empty/Manual/Demo-Zustaende pruefen.
- Existing proof selectors nur anpassen, wenn Copy/State absichtlich
  geaendert wird.

Nicht-Ziele:

- keine neue Project-/Goal-Persistenz
- keine Milestone-/Log-/Review-Cadence-Implementierung
- keine Graph- oder AI-Flows

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Acceptance:

- Jeder Button im Workbench ist persistierend, navigierend oder klar
  Prepared/Future.
- Connected Linked Task/Project/Resource Relation Claims bleiben wahr.
- Project/Goal Workbench bleibt V5-konform und keine Dashboard-Kopie.
- Focused Portfolio/Project/Goal Browser Proof ist aktuell.

F1.1B Implementation Status 2026-07-11:

- Dokumentiert in
  `docs/qa/project-goal-workbench-state-clarity-f1-1b.md`.
- Ergebnis: Workbench-Copy, Prepared/Future-Zustaende, Resource Relation
  Display und Progress-/Metric-Sprache wurden geschaerft.
- Keine neue Project-/Goal-Persistenz, kein neues Datenmodell, keine
  Migration, keine RLS-/Policy-Aenderung und keine Remote-DB-Aktion.
- Project Workbench, Goal Workbench und Portfolio bleiben
  `local_connected_with_depth_gap`.
- F1.1C/F1.1D bleiben die naechsten moeglichen Status-/Semantik-Slices.

### F1.1C Project Workbench Linked Work / Status Semantics

Ziel: Project-spezifische Status- und Linked-Work-Semantik entscheiden und
verbinden oder bewusst deferred halten.

Moeglicher Scope:

- Project Status Copy, next actions und Abschluss-/Archive-Grenzen.
- Linked Task Kennzahlen und Project Progress Copy.
- Entscheidung, ob Project Update/Archive jetzt gebaut oder final deferred
  wird.

Backend Skill erforderlich, sobald Actions oder Repositories betroffen sind:

- `life-os-backend-action-slice`

### F1.1D Goal Workbench Linked Work / Status Semantics

Ziel: Goal-spezifische Status-, Linked Project- und Linked Task-Semantik
entscheiden und verbinden oder bewusst deferred halten.

Moeglicher Scope:

- Goal Status Copy, Pause/Achieve/Archive-Grenzen.
- Linked Projects, Linked Tasks und Goal Progress Copy.
- Entscheidung, ob Goal Update/Achieve/Archive jetzt gebaut oder final
  deferred wird.

Backend Skill erforderlich, sobald Actions oder Repositories betroffen sind:

- `life-os-backend-action-slice`

### F1.1E Project / Goal Progress Model Decision

Ziel: Fortschritt nicht ueberbehaupten.

Moeglicher Scope:

- entscheiden, ob Progress rein task-basiert bleibt
- entscheiden, ob Milestones oder Key Results spaeter Progress treiben
- Copy und ReadModel-Grenzen dokumentieren
- keine Prozentzahl final nennen, wenn die Datenbasis nur partial ist

### F1.1F Workbench Resource / Evidence Depth

Ziel: Resource Relations und Skill Evidence als echte Workbench-Tiefe ordnen,
ohne Graph-Scope zu starten.

Moeglicher Scope:

- Project/Goal Resource Relation Display finalisieren
- Workbench-lokales Link/Create/Manage bewusst bauen oder deferred halten
- Skill Evidence nur als adjacent Project/Goal Kontext aufnehmen, wenn der
  Proof- und Ownership-Pfad klar ist

### F1.1G Milestones / Logs / Review Cadence Decision

Ziel: Prepared Depth final entscheiden.

Moeglicher Scope:

- Project Milestones
- Goal Milestones
- Project Log
- Goal Log
- Goal Review Cadence
- Review Notes / Zielhistorie

Regel:

- Wenn Persistenz gebaut wird, ist dies ein Backend Action Slice mit Migration,
  Security Review und Reload-Proof.
- Wenn Persistenz nicht gebaut wird, bleibt die UI final ehrlich Prepared oder
  Future und darf keine falsche Schreibbarkeit andeuten.

### F1.1H Entity Route Alignment / Closure

Ziel: klaeren, wie `/projects`, `/projects/[projectId]`, `/goals` und
`/goals/[goalId]` zur Portfolio Workbench stehen.

Moeglicher Scope:

- Detailseite als Tiefe erhalten und mit connected Workbench-Wahrheit
  abstimmen
- oder Route bewusst als prepared/contextual kennzeichnen
- keine zweite konkurrierende Project-/Goal-Produktlogik erzeugen

## 11. First Executable Block

Erster ausfuehrbarer Folgeblock:

```text
F1.1B Project / Goal Workbench State Clarity
```

Begruendung:

- Project und Goal Workbench teilen Komponenten, Viewmodel-Logik, Proofs und
  Copy-Patterns.
- Der erste Block kann die sichtbare Wahrheit schaerfen, ohne direkt neue
  Tabellen, Actions oder Migrationsentscheidungen zu erzwingen.
- Danach lassen sich Project-only und Goal-only Backend-/Depth-Slices sauberer
  schneiden.
- Ein Project-only Start waere moeglich, wuerde aber die gemeinsame
  Prepared-/Future-Sprache in derselben Workbench-Familie doppelt bearbeiten.

Startauftrag fuer F1.1B:

- Current connected flows nicht ersetzen.
- Prepared/Future Labels und Workbench Copy final klaeren.
- Linked Tasks, Linked Projects und Resource Relation Display erhalten.
- Kein neues Datenmodell im ersten Block.
- Browser-Proof fuer die bedienten Workbench-Flows liefern.

## 12. Acceptance Criteria

F1.1A ist abgeschlossen, wenn:

- `docs/product/project-goal-workbench-depth-scope-f1-1a.md` existiert.
- Project Workbench Current State dokumentiert ist.
- Goal Workbench Current State dokumentiert ist.
- Connected Flows, Prepared/Future Areas, Design Debt und Data/Backend
  Assessment dokumentiert sind.
- F1.1 Vertical Slices definiert sind.
- Der erste ausfuehrbare Folgeblock festgelegt ist.
- `docs/product/final-product-completion-roadmap.md` auf F1.1A verweist.
- `docs/product/final-surface-connected-claim-review-f0-1.md` auf F1.1A
  verweist.
- Keine Produkt-, UI-, Test-, Migration-, RLS-, Remote-, Deployment- oder
  Secret-Aenderung erfolgt ist.

## 13. Risks

- Scope Creep: Project/Goal Workbench kann zu einer zweiten
  Projektmanagement-App anwachsen.
- Data-before-UX Risk: Neue Milestone-/Log-Tabellen ohne vorher geklaerte
  Nutzerhandlung wuerden Komplexitaet statt Tiefe erzeugen.
- UX-overclaim Risk: Progress, Review Cadence oder Prepared Sections koennen
  finaler wirken als die Datenbasis ist.
- Duplication Risk: Portfolio Workbench und Entity Detail Routes koennen
  konkurrierende Wahrheiten erzeugen.
- Proof Risk: Bestehende W1.1A Proofs bleiben nur claim-stabil, solange
  spaetere Copy-/Selector-Aenderungen fokussiert nachgezogen werden.
- Security Risk: Jede neue relationale Tiefe braucht same-user Ownership fuer
  Project, Goal, Task, Resource und spaetere Milestone-/Log-Targets.
- Product Risk: Graph, AI Coach, Automation und full Archive/Undo sind
  attraktiv, aber nicht Teil des ersten F1.1-Depth-Pfads.
