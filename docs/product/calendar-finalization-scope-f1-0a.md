# Calendar Finalization Scope F1.0A

Stand: 2026-07-10
Status: Scope lock / docs-only
Zweck: Fachlicher, technischer und proof-bezogener Scope fuer F1.0 Calendar
Finalization nach F0.1.
Quelle der Wahrheit: `PRODUCT.md`, `DATA_MODEL.md`,
`docs/product/final-surface-connected-claim-review-f0-1.md`,
`docs/product/final-product-completion-roadmap.md`,
`docs/product/calendar-drag-resize-design-lock.md`,
`docs/product/task-inbox-calendar-workflow.md`, Calendar-Code und relevante
E2E-Proofs.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src`-Aenderungen, Tests,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB, Deployment oder Secrets.

## 1. Zweck

F1.0A startet den ersten finalen Produkt-Vertical-Slice nach F0.1 als
Scope-/Design-/Technical-Planning-Block.

Klare Entscheidung:

```text
Dieser Block implementiert nichts.
Er definiert den finalen Calendar-Scope.
```

Ziele:

- aktuellen Calendar-Zustand fachlich und technisch auditieren
- finalen Calendar-Zielzustand festlegen
- Pointer Drag/Resize gegen Button-/Keyboard-Scheduling entscheiden
- F1.0 Calendar Finalization in ausfuehrbare Vertical Slices schneiden
- ersten Implementierungsblock festlegen

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI-Aenderungen
- keine `src`-Aenderungen
- keine Test-Aenderungen
- keine Migration
- keine RLS-, Policy- oder Grant-Aenderung
- keine Remote-DB
- kein `supabase link`, `supabase db push`, `db reset` oder Deployment
- keine Secrets, `.env.local`, `.local/**`, `private/**`, Backups oder Exports
  lesen oder dokumentieren
- keine neue Library
- kein MCP installieren
- keine Aenderung an `docs/product/life-os-full-roadmap-checklist.md`

## 3. Ausgangslage nach F0.1

F0.1 bewertet Calendar als:

```text
local_connected_with_depth_gap
```

Begruendung:

- Schedule, Unschedule, reschedule-nahe Controls und Conflict Gate sind lokal
  proof-stable.
- Calendar ist eine zentrale P1-Planungsflaeche.
- Finale Interaktionstiefe ist offen: entweder Pointer Drag/Resize jetzt bauen
  oder die bestehende Button-/Keyboard-Steuerung als finalen Kern festschreiben.
- F0.1 ist kein `final complete`, kein Production-, Remote- oder
  Public-SaaS-Claim.

## 4. Calendar Current State

### Connected Flows

- Calendar-Route: `/calendar` rendert `CalendarPlanningPage` aus
  `src/features/calendar` und liest ueber `getCalendarViewModel()` aus
  `src/features/profile-data/view-models.ts`.
- Manual Calendar liest echte Supabase-backed Tasks ueber
  `getManualTaskProfileData()` und `createSupabaseTaskRepository()`.
- Planner Queue zeigt Tasks mit `plannedDate`/lokalem `date`, aber ohne
  `scheduledStartAt`/`startTime`.
- Queue-Scheduling schreibt ueber `scheduleTaskForTodayFormAction` mit
  `mode=schedule`, `plannedDate`, `scheduledTime` und `durationMinutes`.
- Timed Task Blocks entstehen aus `plannedDate`, `scheduledStartAt` und
  `durationMinutes`.
- Selected Task Blocks koennen ueber Buttons um 15 Minuten frueher/spaeter
  verschoben werden.
- Dauer kann ueber `Dauer -15 min` und `Dauer +15 min` geaendert werden.
- `Unschedule` entfernt `scheduled_start_at`, behaelt aber `planned_date`; der
  Task geht in die Calendar Planner Queue zurueck.
- `Mark done` nutzt die bestehende Task-Completion-Action und projiziert den
  erledigten Status.
- Today plant Tasks ueber `Heute planen` als `plannedDate`.
- Portfolio kann Tasks planen, terminieren, umplanen, entterminieren,
  abschliessen, wieder oeffnen und archivieren.
- Dashboard zeigt geplante/terminierte Tasks als Today Agenda und Daily Control
  Signale.

### Scheduling Controls

Vorhanden:

- Calendar Planner Queue: Uhrzeit-Input, Dauer-Select, `Terminieren`.
- Calendar Inspector fuer persistierte Task Blocks:
  - `Reschedule`
  - `15 min frueher`
  - `15 min spaeter`
  - `Dauer -15 min`
  - `Dauer +15 min`
  - `Unschedule`
  - `Mark done`
- Portfolio Context Panel:
  - `Heute planen`
  - `Heute terminieren`
  - `Umplanen`
  - `Entterminieren`
- Week/Day Grid Slots koennen ausgewaehlt werden, aber nicht per Pointer
  gezogen oder resized werden.

Nicht vorhanden:

- echter Pointer Drag
- echter Pointer Resize
- Touch-Drag
- serverseitige DB-weite Conflict-Sperre
- Schedule-History oder Audit-Trail fuer Overrides

### Planner Queue

Planner Queue Semantik:

- Calendar Queue = geplante Tasks ohne Uhrzeit.
- Today Planner = Tageskandidaten mit Planning Signals, bevor ein Datum gesetzt
  wird.
- Scheduled Task = Task mit Datum, Uhrzeit und Dauer.
- Calendar ist kein Roh-Inbox- oder Task-Klaerungsort.

Aktuelle Sortierung:

- Today-Bezug zuerst
- Datum
- Aktualitaet
- Prioritaet
- Energie
- Dauer
- stabile ID als letzter Tie-Breaker

### Scheduled Task Display

Scheduled Tasks werden in `taskToCalendarBlock()` als `task_block` gerendert.
Das ViewModel setzt:

- `date`
- `startTime`
- `endTime`
- `durationMinutes`
- `source: "task"`
- `taskId`
- `sourceEntity.href` zu `/tasks/{taskId}`
- Status aus Task-Status
- Prioritaet und Kontextlabels aus Task/Project/Goal-Relationen

### Today-/Dashboard-Projektionen

Today:

- zeigt Tasks mit heutigem `date` als Activity Stream.
- zeigt offene Kandidaten ohne `date` und ohne `startTime` im Today Planner.
- kann Tasks abschliessen oder wieder oeffnen.
- erzeugt recurring Instanzen explizit; keine automatische Hintergrundplanung.

Dashboard:

- `visibleDashboardTasks()` und `visibleDashboardAgendaTasks()` projizieren
  Task-Daten in Daily Control und Today Agenda.
- Scheduled Tasks tragen `startTime`, berechnetes Ende und Dauer in die Agenda.
- Focus-Minutes werden aus Tasks mit `startTime` und `durationMinutes`
  berechnet.

### Conflict Checks

Aktueller Conflict Check:

- liegt im Calendar Right Panel.
- prueft nur gegen geladene sichtbare scheduled Task Blocks im aktuellen
  ViewModel.
- verwendet die Regel:

```text
candidateStart < otherEnd && otherStart < candidateEnd
```

- direkt angrenzende Blocks gelten nicht als Konflikt.
- normale Buttons sind bei sichtbarem Konflikt deaktiviert.

Grenze:

```text
Das ist ein UI-Gate, keine DB-weite Sperre.
```

### Override Controls

Vorhanden:

- Bei sichtbarem Konflikt erscheint `Trotz Konflikt speichern`.
- Der Override nutzt denselben Reschedule-Action-Pfad.

Grenzen:

- `manualOverride` ist kein eigenes serverseitig ausgewertetes Contract-Feld.
- Es gibt kein Audit- oder History-Feld fuer bewusste Overrides.
- Keine DB-weite Konfliktpruefung verhindert parallele oder unsichtbare
  Konflikte.

### Known Proofs

Aktuelle lokale Proof-Basis nach W1.1A/F0.1:

- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed, 2
  skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed, 0
  skipped, 0 failed.

Calendar-relevante E2E-Coverage in `tests/e2e/content-state-system.spec.ts`:

- Demo Calendar bleibt gefuellte Planungsreferenz.
- Empty Calendar rendert ohne Demo-Blocks.
- Manual Calendar plant DB Task ueber Queue und terminiert reload-stabil.
- Manual Calendar verschiebt per 15-Minuten-Button reload-stabil.
- Manual Calendar aendert Dauer per Button reload-stabil.
- Manual Calendar unscheduled DB Task zurueck in die Planner Queue.
- Manual Calendar blockiert sichtbare Konflikte ohne stilles Speichern.
- Today und Dashboard zeigen den geplanten/terminierten Task nach Reload.

### Prepared/Future Areas

- Pointer Drag/Resize.
- Touch-Drag.
- Free Calendar Event Persistence.
- Calendar Create Dialog fuer Task Preview/Free Item Preview bleibt
  vorbereitet und lokale UI-Preview.
- Review/Open-Loops Panels sind noch keine final verbundenen Review-Flows.
- Week/Day/Month/Year Tiefe ist sichtbar, aber nicht alle Views haben gleiche
  Daten- und Proof-Tiefe.
- Recurring visibility ist vorhanden, aber Full Template Management bleibt
  separater F2.1-Scope.
- Schedule History und Override Audit fehlen.

### Known Gaps (F1.0A Audit)

- Vor F1.0B enthielt die UI prototype-nahe lokale
  Calendar-Create-Funktionen.
- Vor F1.0B nutzten einige Right-Panel Labels noch generische oder englische
  Copy (`local mock`, `Schedule something`, `Save to mock calendar`).
- F1.0B hat Calendar Create, Inspector-State, Queue-Copy und Conflict-Copy
  geschaerft; siehe Abschnitt 13.
- Conflict Gate ist nur client-/ViewModel-basiert.
- Override ist bewusst sichtbar, aber nicht serverseitig differenziert.
- No fake Drag/Drop: aktuell gibt es keine Drag-Versprechen, aber die finale
  Entscheidung muss dokumentiert bleiben.
- Calendar darf nicht zum Datenlager fuer freie Events, Reviews, Meals oder
  Health Blocks werden, solange deren Source-of-Truth nicht finalisiert ist.

## 5. Final Calendar Target State

Finaler Calendar-Zielzustand:

```text
Calendar ist die Zeitblock- und Terminierungsflaeche fuer Tasks.
Today ist Tagesausfuehrung.
Dashboard zeigt Tagessteuerung.
Calendar darf kein Datenlager werden.
```

Finale Mindestfaehigkeiten:

- Task aus Queue in Calendar terminieren.
- Scheduled Task verschieben.
- Scheduled Task Dauer aendern.
- Scheduled Task unschedulen.
- Sichtbare Konflikte erkennen.
- Bewusster Override bleibt moeglich und ist klar getrennt.
- Today/Dashboard-Projektionen bleiben korrekt.
- Reload-Stabilitaet bleibt beweisbar.
- Keyboard-/Button-Bedienung ist verlaesslich.
- V5-konforme ruhige Planungsflaeche.
- Keine Fake Drag/Drop-Versprechen.

Explizite Nicht-Ziele des finalen Kerns:

- Calendar speichert keine zweite Task-Kopie.
- Calendar wird kein generischer Event-Datensilo.
- Calendar uebernimmt kein Inbox Routing.
- Calendar ersetzt nicht Today als Tagesausfuehrung.
- Calendar ersetzt nicht Dashboard als Steuerung.

Optionale Tiefe:

- Pointer Drag/Resize.
- Recurring visibility vertiefen.
- Week/Day Switch haerten.
- Time Density Controls.
- Schedule History.

## 6. Pointer Drag/Resize Decision

Bewertete Optionen:

| Option | Bewertung |
| --- | --- |
| A: Button-/Keyboard-Scheduling finalisieren | Niedrigstes Risiko, beste Accessibility, gut testbar, nah am bestehenden proof-stable Pfad. |
| B: Pointer Drag/Resize jetzt implementieren | Hoher Scope: Hit Testing, Snap, Konfliktverhalten, Mobile-Fallback, Keyboard-Paritaet, Loading/Error States und Proofs muessen gleichzeitig gebaut werden. |
| C: Hybrid: Button-/Keyboard final, Pointer Drag/Resize spaeter | Erhaelt den bewiesenen Kern und verschiebt Pointer-Komfort in einen eigenen, klar pruefbaren Slice. |

Entscheidung:

```text
Option C:
Button-/Keyboard-Scheduling als finaler Kern,
Pointer Drag/Resize als spaeterer Komfort-Slice.
```

Begruendung:

- Komplexitaet: Option C minimiert F1.0-Risiko und verhindert einen breiten
  Pointer-/Layout-Scope.
- Accessibility: Button-/Keyboard-Pfad ist bereits erreichbar und proofbar.
- Testbarkeit: bestehende E2E-Coverage beweist Forms, Buttons, Focus und Reload.
- Risiko fuer bestehende Proofs: Pointer-Interaktion wuerde Hit-Testing,
  Layout, Mobile und Konfliktverhalten gleichzeitig beruehren.
- V5-Fit: ruhige, praezise Inspector-Controls passen besser zum Linear Calm
  Command Center als ein noch unreifer Drag-Mechanismus.
- Nutzen fuer persoenliche Nutzung: verlaessliche Terminierung, Verschiebung,
  Daueranpassung und Unschedule sind wichtiger als Pointer-Komfort.

Pointer Drag/Resize bleibt erlaubt, aber nur als spaeterer eigener Slice mit:

- 15-Minuten-Snap
- Keyboard-Paritaet
- Mobile-Fallback
- sichtbarem Loading/Error-Verhalten
- Conflict Gate und Override-Verhalten
- Playwright Proof fuer Move, Resize, Conflict und Reload
- keiner neuen DnD-Library ohne Stop/Review

## 7. Design Debt

Design-Taste Review:

```text
Was passt zu V5:
- Calendar ist eine ruhige, dichte Planungsflaeche.
- Week Surface, Inspector und Planner Queue sind als Arbeitszonen erkennbar.
- Farbe ist textgestuetzt und nicht alleinige Statusquelle.
- P1-Planungsfokus dominiert, ohne Dashboard P0 zu kopieren.
- Manual/Demo/Empty Grenzen sind weitgehend sichtbar.

Was verletzt V5 (F1.0A Audit vor F1.0B):
- Calendar Create Dialog und einige Inspector-Labels wirken noch prototype-
  und mock-nahe.
- `Planning Assistant`, Reviews und Open Loops sind sichtbare Tiefe, aber nicht
  final verbunden.
- Das lokale New-Item/Existing-Task Mock Scheduling kann final zu stark wirken,
  obwohl es nicht persistiert.
- English/German-Mischcopy reduziert finale Produktschaerfe.

Konkrete Fixes:
- F1.0B hat Copy, States und Prepared/Future-Markierungen finalisiert.
- Mock-only Calendar Create ist klar als prepared/local preview markiert.
- Inspector-Controls sind auf persistente Task-Steuerung fokussiert.
- Conflict/Override Copy ist fachlich geschaerft.
- Review/Open-Loop/Planning-Assistant Bereiche als future/prepared oder eigene
  spaetere Slices markieren.

Acceptance Decision:
PASS_WITH_FIXES fuer F1.0; keine UI-Aenderung in F1.0A.
```

## 8. Data/Backend Assessment

### Calendar-relevante Task-Felder

| Feld | Status | Bewertung |
| --- | --- | --- |
| `planned_date` / `plannedDate` | vorhanden | Steuert Tagesplanung und Planner Queue. |
| `scheduled_start_at` / `scheduledStartAt` | vorhanden | Steuert Calendar Time Blocks und scheduled Task Anzeige. |
| `duration_minutes` / `durationMinutes` | vorhanden | Steuert Dauer und Endzeit; Default 30 Minuten. |
| `due_at` / `dueAt` | vorhanden im Schema/Mapper | Nicht final als Calendar Deadline-Flow ausgebaut. |
| `completed_at` / `completedAt` | vorhanden | Steuert Done/Reopen-Projektion. |
| `project_id` / `projectId` | vorhanden | Ownership wird bei Create/Update validiert; Labels werden fuer Planner/Portfolio geladen. |
| `goal_id` / `goalId` | vorhanden | Ownership wird bei Create/Update validiert; Labels werden fuer Planner/Portfolio geladen. |
| `generated_from_template_id` | vorhanden | Recurring Instanzen bleiben sichtbar, Full Management spaeter. |
| `instance_date` | vorhanden | Recurring Instanzdatum wird geladen/projiziert. |

### Actions

| Action | Existiert? | Bewertung |
| --- | --- | --- |
| Task planen | Ja: `scheduleTaskForTodayAction` mit `mode=plan` | Finaler Kern vorhanden. |
| Task schedulen | Ja: `scheduleTaskForTodayAction` mit `mode=schedule` | Finaler Kern vorhanden. |
| Task unschedulen | Ja: `unscheduleTaskAction` | Finaler Kern vorhanden. |
| Task verschieben | Ja: `rescheduleTaskAction` | Button-/Keyboard-Pfad vorhanden. |
| Dauer aendern | Ja: `rescheduleTaskAction` mit `durationMinutes` | Button-/Keyboard-Pfad vorhanden. |
| Complete/Reopen | Ja | Today/Portfolio/Calendar Completion vorhanden. |
| Conflict Override | UI ja, eigener Backend-Contract nein | Reicht fuer UI-Gate; nicht als DB-weite Konfliktsicherheit behaupten. |

### Backend Gate

Vorhanden:

- serverseitige Auth ueber `createAuthenticatedSupabaseServerClient()`
- Manual-Profil-Gate
- Zod `safeParse`
- Repository-Updates mit `eq("user_id", userId)` und `eq("id", taskId)`
- Profile/User Scope Check
- Project-/Goal-/Area-Ownership bei Task Create/Update
- Revalidation fuer `/portfolio`, `/today`, `/dashboard`, `/calendar`
- kein Service Role Key

Fehlt oder bleibt bewusst deferred:

- DB-weite Conflict-Sperre.
- serverseitig ausgewertetes `manualOverride` Feld.
- Schedule-History oder Override-Audit.
- Calendar-owned free event persistence.
- Review/Open-Loop persistence im Calendar.

Bewertung:

```text
Task Scheduling Backend ist final genug fuer F1.0-Kern.
Conflict/Override ist final genug als UI-Gate, aber nicht als DB-weite Garantie.
Pointer Drag/Resize braucht keinen neuen Datenpfad, solange es denselben
Reschedule-Action-Pfad nutzt.
```

## 9. F1.0 Vertical Slices

### F1.0B Calendar UX/Copy/State Clarity

Ziel:

- Calendar als finale Task-Zeitblockflaeche klaeren.
- Mock-/prepared-/future-Bereiche sichtbar trennen.
- Labels und Buttontexte auf den finalen Button-/Keyboard-Kern ausrichten.

Nicht-Ziele:

- keine Pointer Drag/Resize Implementierung
- keine Migration
- keine neue Library
- keine DB-weite Conflict-Sperre

Betroffene Dateien:

- `src/features/calendar/**`
- ggf. Calendar-/QA-Doku

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Akzeptanzkriterien:

- Keine Mock-Aktion wirkt wie persistente final Calendar-Funktion.
- Manual/Demo/Empty Grenzen bleiben klar.
- Calendar Create Dialog ist entweder klar prepared oder aus finalem Kern
  entfernt/depriorisiert.
- Keine Layoutwerte werden ohne expliziten Layout-Scope veraendert.

Browser-Proof:

- `/calendar` in Demo, Empty und Manual pruefen.
- Persistente Task Scheduling Controls bedienen oder explizit als unveraendert
  gegen bestehende E2E-Coverage referenzieren.

Risiko:

- Copy-Fixes koennen versehentlich Produktversprechen erhoehen.

### F1.0C Calendar Scheduling Proof Hardening

Ziel:

- bestehenden Button-/Keyboard-Kern als finalen Schedule/Move/Resize/Unschedule
  Pfad beweisen.

Nicht-Ziele:

- keine Pointer Drag/Resize
- keine UI-Recomposition
- keine Remote-DB

Betroffene Dateien:

- `tests/e2e/content-state-system.spec.ts`
- ggf. `docs/qa/*`
- nur bei bewiesenem Bug: eng begrenzte Calendar/Task-Datei

Use Skills:

- `life-os-browser-proof`
- `life-os-vertical-slice`
- `life-os-completion-gate`
- `life-os-backend-action-slice`, falls Action-/Repository-Bug bewiesen ist

Akzeptanzkriterien:

- Queue Scheduling reload-stabil.
- 15-Minuten-Move reload-stabil.
- Dauer +/- 15 Minuten reload-stabil.
- Unschedule zurueck in Planner Queue reload-stabil.
- Today/Dashboard-Projektion nach Scheduling weiterhin sichtbar.
- Assertions bleiben scoped; keine globale Textsuche als alleiniger Beweis.

Browser-Proof:

- Focused Calendar grep oder konkrete Playwright-Tests sequenziell.

Risiko:

- lokale Manual-DB-Dichte kann freie Slot-Findung beeinflussen.

### F1.0D Calendar Conflict/Override Finalization

Ziel:

- sichtbare Konflikt- und Override-Semantik finalisieren.

Nicht-Ziele:

- keine DB-weite Conflict-Sperre, ausser separater Data-Scope freigegeben wird
- kein Audit-Log ohne explizite Datenmodellentscheidung

Betroffene Dateien:

- `src/features/calendar/components/calendar-right-panel.tsx`
- `src/features/real-data/actions/task.actions.ts`, nur falls ein Backend-
  Contract explizit beschlossen wird
- `tests/e2e/content-state-system.spec.ts`
- Doku/QA

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-backend-action-slice`, wenn Backend-Contract geaendert wird
- `life-os-completion-gate`

Akzeptanzkriterien:

- normaler Save bleibt bei sichtbarem Konflikt blockiert.
- Override ist separat, bewusst und textlich eindeutig.
- Keine DB-weite Sicherheit wird behauptet.
- Falls Backend-Override-Contract eingefuehrt wird, ist er validiert,
  user-scoped und proofbar.

Browser-Proof:

- zwei Blocks erzeugen, zweiten Block in Konflikt bewegen, normalen Button
  blockiert sehen, Override sichtbar sehen, Reload unveraendert oder bewusst
  overriden pruefen.

Risiko:

- UI-Override kann als harte Sicherheit missverstanden werden.

### F1.0E Calendar Today/Dashboard Projection Review

Ziel:

- Calendar-Schreibpfade gegen Today und Dashboard Projektionen final pruefen.

Nicht-Ziele:

- kein Dashboard Layout Scope
- keine Dashboard V5-Recomposition
- keine Today Review-Tiefe

Betroffene Dateien:

- `src/features/profile-data/view-models.ts`
- `src/features/today/**`
- `src/components/dashboard/**`
- `tests/e2e/content-state-system.spec.ts`
- QA-Doku

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`
- `life-os-backend-action-slice`, falls Projection-Data-Bug bewiesen ist

Akzeptanzkriterien:

- geplante Tasks erscheinen in Today Planner/Calendar Queue korrekt.
- scheduled Tasks erscheinen nicht mehr als unscheduled Planner-Kandidaten.
- scheduled Tasks erscheinen in Today Activity und Dashboard Today Agenda.
- completed/reopened Status bleibt nach Reload korrekt.
- Dashboard P0/P1-Hierarchie bleibt unveraendert.

Browser-Proof:

- Task erzeugen, Today planen, Calendar terminieren, Today pruefen, Dashboard
  pruefen, Reload auf Zielregionen.

Risiko:

- Dashboard-Layout-Lock darf durch Projection-Fixes nicht verletzt werden.

### F1.0F Pointer Drag/Resize Future Plan

Ziel:

- Pointer Drag/Resize als optionalen Komfort-Slice spezifizieren, ohne ihn in
  F1.0-Kern zu erzwingen.

Nicht-Ziele:

- keine Implementierung, wenn F1.0B-E nicht abgeschlossen sind
- keine neue DnD-Library ohne Stop/Review

Betroffene Dateien:

- Design-/QA-Doku
- spaeter ggf. `src/features/calendar/**`
- spaeter ggf. E2E

Use Skills:

- `life-os-vertical-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`
- `life-os-backend-action-slice`, falls Datenpfad geaendert wird

Akzeptanzkriterien:

- Hit Testing, Snap, Keyboard-Paritaet, Mobile-Fallback, Loading/Error und
  Conflict/Override-Regeln sind beschrieben.
- Implementierungsentscheidung ist getrennt von finalem Button-/Keyboard-Kern.

Browser-Proof:

- erst bei Umsetzung: drag move, resize, conflict, override, reload, keyboard
  fallback.

Risiko:

- Pointer Scope kann Layout, Accessibility und Proof-Stabilitaet gleichzeitig
  destabilisieren.

## 10. First Executable Block

Naechster ausfuehrbarer Block:

```text
F1.0B Calendar UX/Copy/State Clarity
```

Begruendung:

- F1.0A entscheidet Option C.
- Bevor Proof-Hardening oder Conflict-Finalisierung startet, muss die UI
  eindeutig zwischen finaler persistenter Task-Zeitsteuerung und prepared/mock
  Calendar-Create-Bereichen unterscheiden.
- Das reduziert False-Connected-Risiko, ohne Datenmodell oder Layout
  anzufassen.

## 11. Acceptance Criteria

F1.0A gilt als abgeschlossen, wenn:

- Calendar Current State dokumentiert ist.
- finale Calendar-Zieldefinition dokumentiert ist.
- Pointer Drag/Resize Entscheidung getroffen ist.
- Design-/Backend-/Proof-Gaps dokumentiert sind.
- F1.0 in ausfuehrbare Vertical Slices geschnitten ist.
- erster Implementierungsblock klar ist.
- keine Produktfeatures implementiert wurden.
- keine `src`-Aenderungen vorgenommen wurden.
- keine Tests geaendert wurden.
- keine Migration erstellt wurde.
- keine Remote-DB, kein Deployment und keine Secrets betroffen waren.
- Validierung gruen ist oder blockierende Umgebung konkret berichtet wird.

## 12. Risks

- Pointer Drag/Resize kann F1.0 sprengen, wenn es vor UX/Proof/Conflict-
  Finalisierung gebaut wird.
- Mock-only Calendar Create kann Nutzervertrauen schwaechen, wenn es finaler
  wirkt als der Persistenzpfad.
- Conflict Gate kann als DB-weite Garantie missverstanden werden.
- Local Manual-DB-Dichte kann Proofs beeinflussen; Tests muessen scoped bleiben.
- Dashboard/Today Projection Fixes duerfen keine Dashboard-Layoutwerte aendern.
- Free Events, Reviews, Open Loops und Planning Assistant brauchen spaetere
  Source-of-Truth-Entscheidungen.

Completion Gate:

```text
PASS_WITH_DEFERRED
```

F1.0A ist ein Scope-Lock. Die erste Umsetzung liegt in F1.0B; weitere
Feature-Tiefe bleibt bewusst in F1.0C-F1.0F deferred.

## 13. F1.0B Implementation Status

Stand: 2026-07-11
Status: Completed UX/Copy/State Clarity
QA: `docs/qa/calendar-ux-state-clarity-f1-0b.md`

F1.0B hat den ersten Implementierungsblock nach dem Scope Lock umgesetzt.

Geaendert:

- Calendar Create ist jetzt klar als vorbereiteter lokaler Preview-State
  markiert.
- Header und Source Contract unterscheiden echte Manual-Task-Zeitwrites von
  lokaler UI-Navigation und Prepared Create.
- Calendar Inspector trennt `Task-Zeitsteuerung`, Projektion und vorbereitete
  Slot-Kontexte.
- Planner Queue sagt explizit, dass Tasks ohne Uhrzeit dort terminiert werden
  und `Terminieren` im Manual-Profil Task-Zeitfelder schreibt.
- Open Loops und Reviews sind als vorbereitete Kontextlisten markiert, nicht
  als lokal verbundene Calendar-Quellen.
- Conflict/Override Copy stellt klar, dass das Gate nur gegen geladene
  sichtbare Zeitbloecke laeuft und keine DB-weite Sperre ist.
- Month/Year Views sind als vorbereitete Uebersichten beschrieben.
- Scoped E2E-Assertions pruefen Prepared Create, Queue-Klarheit und Conflict
  Scope.

Nicht geaendert:

- kein Pointer Drag/Resize
- keine neue Calendar-Event-Persistenz
- keine Scheduling-Action- oder Repository-Aenderung
- keine Conflict-Algorithmus-Aenderung
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets

Browser-Proof:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Calendar|Today|Dashboard|Manual"

71 passed
2 skipped
0 failed
```

Completion Gate:

```text
PASS_WITH_DEFERRED
```

Deferred bleiben Pointer Drag/Resize, freie Calendar-Event-Persistenz,
DB-weite Conflict-Sperre, Override-Audit und Calendar-owned Review/Open-Loop
Persistenz.

## 14. F1.0C Scheduling Proof Hardening Status

Stand: 2026-07-11
Status: Completed
QA: `docs/qa/calendar-scheduling-proof-hardening-f1-0c.md`

F1.0C hat den bestehenden Calendar Scheduling Proof gehaertet, ohne neue
Calendar-Funktionen oder App-Code zu bauen.

Geaendert:

- Calendar Timed Block Assertions pruefen jetzt scoped Week-Grid Buttons mit
  exakter `HH:MM to HH:MM` Range.
- Der Schedule-Proof nutzt ein deterministisches sichtbares Zeitfenster und
  beweist `15 min frueher`, `15 min spaeter`, `Dauer +15 min` und
  `Dauer -15 min` jeweils mit enabled Button, Reload und exakter Range.
- Der Unschedule-Proof prueft initiale Range, verschobene Range, Grid-Absenz
  nach Reload und Rueckkehr in die Planner Queue.
- Der Projection-Proof nutzt Today Activity Stream, Today Planner Absenz und
  Dashboard Today Agenda scoped.
- Der Conflict-Proof ist auf Calendar Inspector und exakte Timed-Block-Ranges
  gescoped.

Nicht geaendert:

- kein Pointer Drag/Resize
- keine freie Calendar-Event-Persistenz
- keine App-/Backend-Datei
- keine DB-Struktur, Migration, RLS- oder Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets

Gezielter Browser-Proof der geaenderten Calendar Tests:

```text
Manual Calendar plans DB task through queue and schedules reload-stable
Manual Calendar unschedules DB task back into planner queue
Manual Calendar blocks visible conflicts without explicit override

3 passed
0 failed
```

Der focused Full-Grep `Calendar|Today|Dashboard|Manual` wird als finale
F1.0C-Validation ausgefuehrt:

```text
71 passed
2 skipped
0 failed
```

Completion Gate:

```text
PASS_WITH_DEFERRED
```

Deferred bleiben Override-Ausfuehrung/F1.0D, DB-weite Conflict-Sperre,
Override-Audit, Pointer Drag/Resize und freie Calendar-Event-Persistenz.

## 15. F1.0D Conflict / Override Finalization Status

Stand: 2026-07-11
Status: Completed
QA: `docs/qa/calendar-conflict-override-finalization-f1-0d.md`

F1.0D finalisiert die bestehende Conflict-/Override-Semantik des
Button-/Keyboard-Kerns.

Geaendert:

- Conflict Copy sagt jetzt explizit `Sichtbarer Konflikt`.
- Override Button sagt `Trotzdem terminieren` und hat einen eindeutigen
  `aria-label` fuer den sichtbaren Konflikt und die Zielrange.
- Conflict Copy sagt `Nur sichtbare Blöcke geprüft; nicht DB-weit`.
- Ein neuer Browser-Proof fuehrt den Override bewusst aus und prueft nach
  Reload beide ueberlappenden timed blocks mit exakter Range.

Nicht geaendert:

- keine DB-weite Conflict-Sperre
- kein Backend-Override-Contract
- kein Override-Audit
- kein Pointer Drag/Resize
- keine freie Calendar-Event-Persistenz
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets

Gezielter Browser-Proof der Conflict-/Override-Tests:

```text
Manual Calendar blocks visible conflicts without explicit override
Manual Calendar executes explicit conflict override reload-stable

2 passed
0 failed
```

Focused Full-Grep Validation:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Calendar|Today|Dashboard|Manual"

72 passed
2 skipped
0 failed
```

Projektchecks:

```text
git diff --check
git diff --cached --check
pnpm typecheck
pnpm lint
pnpm build
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none

all passed
```

Completion Gate:

```text
PASS_WITH_DEFERRED
```

Deferred bleiben DB-weite Conflict-Sperre, Override-Audit/Schedule-History,
Pointer Drag/Resize und freie Calendar-Event-Persistenz.

## 16. F1.0E Today / Dashboard Projection Review Status

Stand: 2026-07-11
Status: Completed
QA: `docs/qa/calendar-projection-review-f1-0e.md`

F1.0E prueft und haertet die bestehende Calendar -> Today -> Dashboard
Projection-Semantik, ohne neue Calendar-Funktionen oder App-Code zu bauen.

Geaendert:

- Dashboard Today Agenda Assertions pruefen jetzt geplante Tasks als
  `Flexible` und scheduled Tasks mit exakter Zeit-/Dauer-Copy.
- Today Planner Proof prueft Today Activity, Dashboard `Flexible` und Calendar
  Queue/Week-Grid-Absenz scoped.
- Calendar Scheduling Proof prueft nach Schedule/Move/Duration die Dashboard
  scheduled Detail-Copy.
- Unschedule Proof prueft Calendar Queue, Today Activity, Today Planner Absenz
  und Dashboard `Flexible`.
- Complete/Reopen Proof prueft Dashboard-Absenz nach Reload, Calendar aktive
  Absenz, Reopen und Rueckkehr in Dashboard/Calendar Queue.
- Conflict Override Proof prueft nach bewusstem Override auch Today Activity,
  Today Planner Absenz und Dashboard scheduled Detail.

Nicht geaendert:

- keine Calendar-, Today- oder Dashboard-Recomposition
- keine App-/Backend-/Schema-/Repository-Aenderung
- keine DB-weite Conflict-Sperre
- kein Override-Audit
- kein Pointer Drag/Resize
- keine freie Calendar-Event-Persistenz
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets

Gezielter Projection-Proof:

```text
Manual Today Planner plans DB task into Today, Dashboard and Calendar queue
Manual Recurring generates task into Today, Dashboard and Calendar queue
Manual Today completes DB task and removes it from Dashboard agenda
Manual Calendar plans DB task through queue and schedules reload-stable
Manual Calendar unschedules DB task back into planner queue
Manual Calendar executes explicit conflict override reload-stable

6 passed
0 failed
```

Focused Full-Grep Validation:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Calendar|Today|Dashboard|Manual"

72 passed
2 skipped
0 failed
```

Projektchecks:

```text
git diff --check
git diff --cached --check
pnpm typecheck
pnpm lint
pnpm build
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none

all passed
```

Completion Gate:

```text
PASS_WITH_DEFERRED
```

Deferred bleiben DB-weite Conflict-Sperre, Override-Audit/Schedule-History,
Calendar Inspector `Mark done` scheduled-block Deep-Proof, Pointer Drag/Resize
und freie Calendar-Event-Persistenz.

## 17. F1.0F Calendar Finalization Closure Status

Stand: 2026-07-11
Status: Completed docs-only closure

F1.0F schliesst Calendar Finalization als local-first, task-based Scheduling
Core, ohne neue Calendar-Funktionen zu bauen.

Dokumentiert in:

- `docs/product/calendar-finalization-closure-f1-0f.md`
- `docs/product/calendar-finalization-scope-f1-0a.md`

Ergebnis:

- `Task Scheduling Core = local_connected`
- `Calendar = local_connected_with_depth_gap`
- Button-/Keyboard-Scheduling bleibt der finale F1.0-Kern.
- Pointer Drag/Resize bleibt ein spaeterer Komfort-Slice.
- freie Calendar Events bleiben Future Scope.
- Schedule-History/Override-Audit bleibt Future Scope.

Proof-Basis:

- F1.0E Projection-Proof: 6 passed, 0 failed.
- Latest Focused Full-Grep `Calendar|Today|Dashboard|Manual`: 72 passed,
  2 skipped, 0 failed.
- F1.0F fuehrt keinen neuen Playwright-Proof aus, weil der Block docs-only ist
  und keine UI, Form, Navigation, Persistenz oder Projektion aendert.

Nicht geloest:

- keine DB-weite Conflict-Sperre
- kein Override-Audit oder Schedule-History
- kein Pointer/Touch Drag-Resize
- keine freie Calendar-Event-Persistenz
- kein Production-, Remote- oder final-complete-Claim

Completion Gate:

```text
PASS_WITH_DEFERRED
```

Naechster Produktblock:

```text
F1.1 Project/Goal Workbench Depth
```
