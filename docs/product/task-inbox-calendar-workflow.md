# Task, Inbox & Calendar Workflow Lock

Stand: 2026-06-26
Status: Active
Zweck: Produkt-, UX- und Datenfluss-Lock fuer Capture, Inbox Routing, Task-Erstellung, Portfolio-Kontext, Today Planning, Calendar Scheduling und spaetere Recurring Tasks.
Quelle der Wahrheit: `PRODUCT.md`, `DATA_MODEL.md`, `docs/product/inbox-routing-model.md`, `docs/product/pages-and-routes.md`, `docs/product/ux-flows.md`.
Gilt fuer: Folgeaufgaben zu Inbox, Tasks, Portfolio, Today, Calendar, Resources, Planning Signals und AI Assistant.
Nicht gilt fuer: App-Code, Migrationen, RLS/Policies, Remote-Datenbanken, neue Tabellen, Dashboard-Rekomposition oder automatische AI-Ausfuehrung.

## Workflow Lock

- Capture != Task.
- Task != Termin.
- Planning Signal != Scheduling.
- Inbox resolved != nur Route gewaehlt.
- Terminierte Task = Task + `scheduledStartAt`.
- Dauer (`durationMinutes`) ist eine Schaetzung oder Blocklaenge, aber ohne `scheduledStartAt` kein Termin.
- `plannedDate` bedeutet Tagesplanung, nicht Uhrzeit.
- Calendar zeigt Zeitbezug; Inbox klaert Rohmaterial.
- Portfolio verwaltet Bestand und Kontext; es ist kein zweites Inbox-System.
- Today baut den Tagesplan und fuehrt Arbeit aus; es ist kein Project-/Goal-Management.

## End-to-End Flow

```text
Capture
-> Inbox Item
-> Inbox Routing
-> Route auswaehlen
-> Draft pruefen/bearbeiten
-> explizite Aktion bestaetigen
-> Zielobjekt, Relation oder Archive schreiben
-> Portfolio / Resources / Today / Calendar weiter verfeinern
```

Route-Auswahl und Draft-Bearbeitung sind bewusst vorlaeufig. Persistenz passiert erst ueber eine klar benannte Aktion wie `Task erstellen`, `Resource erstellen`, `Task-Beitrag erstellen`, `Project erstellen`, `Goal erstellen`, `Heute planen`, `Heute terminieren` oder `Als erledigt archivieren`.

## Creation Locations

| Ort | Ziel | Darf erstellen | Darf nicht erstellen | Regel |
| --- | --- | --- | --- | --- |
| Dashboard Quick Thought | Schnell erfassen | `InboxItem` | Direkte Task, Project, Goal oder Resource-Entscheidung ohne Review | Quick Thought bleibt neutraler Capture-Einstieg. |
| Inbox | Klaeren, routen, Draft vorbereiten | Task, Resource, Add-to-existing Task-Beitrag, Solved/Archive; spaeter Create-new Drafts | Stille Zielobjekte ohne Draft und Confirm | Route waehlen ist lokal; final wird es erst mit expliziter Aktion. |
| Portfolio | Bestand und Kontext verwalten | Task im Task View, Project im Project View, Goal im Goal View; spaeter Skill im Skill View | Raw Inbox-Klaerung, Calendar-Scheduling als Primaerfluss | Neues Target ist view-abhaengig. |
| Today | Heute ausfuehren und Tagesplan bauen | Aufgabe fuer heute, Tageskandidat, Tagesblock im Zielmodell | Rohes Inbox Routing, Project-/Goal-Management | Today setzt oder nutzt `plannedDate`, nicht zwingend Uhrzeit. |
| Calendar | Zeit blocken und terminieren | Zeitblock, terminierte Task | Rohe Task-Klaerung, Inbox Routing | Calendar setzt oder zeigt `scheduledStartAt` plus Dauer. |
| Resources | Wissen und Material verwalten | Resource, spaeter Resource-Relation | Task-Lifecycle, Project-/Goal-Management | Resource ist kanonische Knowledge-Entity. |

### Portfolio Contextual Create

Portfolio Create folgt dem aktiven Kontext:

| Portfolio View | Create Default | Regel |
| --- | --- | --- |
| Tasks | Task erstellen | Task-Intent ist bereits klar. |
| Projects | Project erstellen | Project wird als Target/Container angelegt. |
| Goals | Goal erstellen | Goal wird als Outcome/Steuerungsziel angelegt. |
| Skills | Skill erstellen | Erst wenn echte Skill-Entity und Persistence existieren. |
| All | Typ waehlen | Kein impliziter Default, weil der Kontext mehrdeutig ist. |

## Inbox Resolve Semantics

Entscheidung: Option C, je Route verschieden.

| Route | Resolve-Regel | Begruendung |
| --- | --- | --- |
| Solved / Archive | `Als erledigt archivieren` resolved sofort. | Es entsteht kein Zielobjekt; der Abschluss selbst ist das Outcome. |
| Standalone Task | `Task erstellen` erstellt Task und resolved das Inbox Item. | Das Zielobjekt ist die Weiterverarbeitung; ein zweiter Abschlussklick waere Reibung und erhoeht Dublettenrisiko. |
| Add to Existing | `Task-Beitrag erstellen` oder spaeter `Link erstellen` resolved nach erfolgreichem Write. | Der User hat Ziel und Beitrag explizit bestaetigt. |
| Resource | `Resource erstellen` erstellt Resource und resolved das Inbox Item. | Die Resource ist das Zielobjekt; spaetere Verfeinerung passiert in Resources. |
| Create New | Noch nicht final entschieden. Project-/Goal-/Resource-Draft kann unresolved bleiben oder nach Zielobjekt-Create resolved werden. | Create-new braucht eigenen Draft- und Zielseitenfluss, bevor Resolve final gelockt wird. |

Lifecycle:

```text
Route waehlen
-> lokaler Draft-State, kein Write

Draft ausfuellen
-> Vorbereitung, kein finaler Write

Create / Link / Save Outcome
-> Zielobjekt oder Relation wird geschrieben

Resolve / Archive
-> Inbox Item verschwindet aus aktiver Inbox
```

Aktueller Lock: Fuer verbundene Task-, Add-to-existing-Task-, Resource- und Archive-Flows ist Create/Link/Archive zugleich Resolve. Die UI muss das nachvollziehbar zeigen. Falls ein Zielobjekt geschrieben wurde, aber Resolve fehlschlaegt, muss die UI spaeter einen Recovery-Zustand zeigen statt stiller Inkonsistenz.

## Planning Signals

Planning Signals sind strukturierte Hinweise fuer spaetere Tages- oder Zeitplanung. Sie sind keine feste Terminierung und duerfen nicht als Calendar-Block wirken, solange kein `scheduledStartAt` geschrieben wurde.

| Signal | Bedeutung | Aktuell persistiert | UI-Hinweis | Spaeter zu haerten |
| --- | --- | --- | --- | --- |
| `priority` | Wichtigkeit | Ja, im Task Draft fuer Task/Create Contribution | Nein | Werte, Defaults und Portfolio-Edit angleichen. |
| `energy` | Erwartete Energie | Ja, im Task Draft fuer Task/Create Contribution | Nein | Today-/Calendar-Nutzung fuer Tagesauswahl definieren. |
| `effort/duration` | Aufwand oder Blocklaenge | Ja, als `durationMinutes` im Task Draft; bei Schedule aktuell Default 30 | Nein | Dauer aus Task beim Scheduling respektieren. |
| `area` | Kontextbereich | Nur wenn echte `areaId` vorhanden ist | Teilweise | Area-Quellen und Picker haerten. |
| `reviewNeeded` | Braucht menschliche Klaerung | Fuer Resource als `review_needed`; fuer Task noch nicht eigenes Feld | Ja | Task-/Inbox-Review-State modellieren. |
| `todayCandidate` | Koennte heute relevant sein | Ja, wenn User im Task Draft `Heute planen` waehlt und `plannedDate` geschrieben wird | Nein | Candidate vs. committed `plannedDate` trennen. |
| `deadlineHint` | Moegliche Frist | Nicht aus Inbox Draft verbunden | Ja | `dueAt`/Deadline-UI und Validation klaeren. |
| `recurrenceHint` | Wiederholungsverdacht | Nicht verbunden | Ja | Recurring-Decision vor Schema-Arbeit. |

Regeln:

- Planning Signals sollen in der Inbox sichtbar sein.
- Sie koennen vor finaler Zielerstellung gesetzt oder bestaetigt werden.
- Sie duerfen spaeter in Portfolio/Task Detail weiter bearbeitet werden.
- Today und Calendar duerfen Signals nutzen, aber erst User-Bestaetigung macht daraus Planung oder Scheduling.

## Task Calendar Flow

Zielmodell:

```text
Task created
-> Backlog / Portfolio
-> Today candidate
-> Today planned
-> Scheduled time block
-> Calendar visible
```

Semantik:

- `Task erstellen` erzeugt noch keinen Termin.
- `Heute planen` setzt `plannedDate`.
- `Heute terminieren` setzt `plannedDate` + `scheduledStartAt` + `durationMinutes`.
- Calendar zeigt Tasks mit `scheduledStartAt` als Time Block.
- Calendar Planner Queue zeigt Tasks mit `plannedDate` ohne `scheduledStartAt`.
- Dashboard und Today duerfen geplante oder terminierte Tasks projizieren, besitzen aber nicht die kanonische Task-Kopie.

### Planner Zielmodell

Calendar Planner Queue:

- zeigt unscheduled Tasks mit `plannedDate` oder starken Planning Signals;
- sortiert spaeter nach Priority, Energy, Duration, Deadline und Kontext;
- erlaubt dem User, einen Slot zu setzen oder per Drag/Picker zu terminieren;
- schreibt erst nach Confirm `scheduledStartAt`.

Today Planner:

- sortiert Tageskandidaten nach Prioritaet, Energie, Dauer und Tageskapazitaet;
- hilft aus Backlog/Portfolio heraus den Tag zu bauen;
- setzt `plannedDate`, aber nicht automatisch Uhrzeit;
- bleibt Daily-Workflow, kein generisches Task-Management.

## Recurring Task Scope

Recurring Tasks bleiben Future Scope. In R1.6.8A wird nur die Begrifflichkeit gelockt.

| Begriff | Bedeutung | Nicht verwechseln mit |
| --- | --- | --- |
| Einmalige Task | Ein konkreter ausfuehrbarer Arbeitsgegenstand | Habit oder Serie |
| Wiederkehrende Task | Ausfuehrbare Aufgabe, die nach Regel erneut faellig wird | Verhaltenstracking |
| Routine | Geordnete Sequenz mehrerer Schritte | Einzelne Task |
| Habit | Tracking/Verhalten mit Wiederholung und Erfolgsspur | Task-Backlog |
| Calendar Series | Wiederholter Zeitblock im Kalender | Task-Erstellung |

Offene Datenmodellfragen fuer R1.6.9:

- Gibt es eine `task_series`-Entity oder werden Wiederholungsregeln an Tasks gespeichert?
- Wann wird die naechste konkrete Task-Instanz erzeugt?
- Wie werden ausgelassene, verschobene oder erledigte Instanzen behandelt?
- Wie unterscheiden sich Habit Logs von Recurring Task Completion?
- Darf eine Calendar Series ohne Task existieren?

## AI Assistant Role

AI darf vorschlagen:

- Outcome Route;
- Task title;
- Next action;
- Priority;
- Energy;
- Effort/Duration;
- Today Candidate;
- Deadline Hint;
- Recurrence Hint;
- Target Project, Goal oder Resource;
- Calendar Slot Suggestions.

AI darf ohne Nutzerbestaetigung nicht:

- Task erstellen;
- Project, Goal oder Resource erstellen;
- Inbox Item resolved markieren;
- Calendar Block setzen;
- Recurring Task anlegen;
- sensible Daten erweitern oder persistieren.

AI bleibt Vorschlags- und Klaerungsschicht. Kritische Writes brauchen klare User-Aktion und serverseitige Validierung.

## Current Implementation Audit

| Bereich | Aktuell | Ziel | Gap | Folgeblock |
| --- | --- | --- | --- | --- |
| Dashboard Quick Thought | Speichert generisch in Inbox. | Nur Capture, keine Task-Suggestion. | Semantik muss in Copy/QA stabil bleiben. | R1.6.8B |
| Inbox Outcome Routes | Route Cards sichtbar; Auswahl lokal. | Jede Route hat Draft + Confirm-Semantik. | Resolve-Zustand und Recovery sind noch nicht voll gelockt. | R1.6.8B |
| Inbox Task Draft | Erstellt Task nach Confirm, schreibt Priority/Energy/Duration/optional `plannedDate`. | Task entsteht nur bestaetigt. | `nextAction` nur in Description; Review/Deadline/Recurrence fehlen. | R1.6.8F |
| Planning Signals | Sichtbar unter Draft, Copy trennt Scheduling. | Signals koennen vor Zielerstellung gesetzt und spaeter bearbeitet werden. | Persistenz ist uneinheitlich und Task-zentriert. | R1.6.8F |
| Solved / Archive | Soft-Archiv per Confirm, kein Zielobjekt. | Abschluss ist nachvollziehbar resolved. | Kein Archive-View/Undo/Reason. | R1.6.8B |
| Add to Existing | Target Picker liest Projects/Goals/Resources; Task-Beitrag zu Project/Goal persistiert. | Contribution oder Relation zu bestehendem Ziel. | Resource Link, Note, Decision, Skill bleiben vorbereitet. | R1.6.8B / R1.6.8F |
| Resource Route | Resource Draft erstellt echte Resource und archiviert Inbox Item. | Resource wird bestaetigt erstellt und in Resources verfeinert. | Nicht atomar; keine direkte Inbox-FK, keine Relation. | R1.6.8B |
| Portfolio Create | Minimal Project/Goal Create sichtbar. | Contextual Create je View. | View-spezifische Defaults und All-View-Typwahl fehlen. | R1.6.8C |
| Portfolio Task View | Tasks aus Inbox erscheinen, Planung/Terminierung ueber Context Panel. | Task Inventory und Refinement. | Task Create/Edit/Lifecycle noch nicht vollstaendig. | R1.6.8C |
| Today | Zeigt Tagesprojektion aus geplanten/terminierten Tasks. | Tagesplan und Ausfuehrung bauen. | Planner/Kandidatenliste noch nicht ausgearbeitet. | R1.6.8E |
| Calendar Grid | Zeigt terminierte Tasks als Time Blocks. | Zeitprojektion aus `scheduledStartAt`. | Scheduling ist noch einfacher Heute-Button mit Default-Slot. | R1.6.8D |
| Calendar Planning Queue | Zeigt Tasks mit Datum ohne Uhrzeit als Queue. | Unscheduled Tasks gezielt terminieren. | Kein Drag/Picker/Signal-Sort und kein Write aus Queue. | R1.6.8D |
| AI Assistant Panel | Schlaegt demonstrativ Route/Felder vor, keine Apply-Logik. | Vorschlag mit Confirm-Gates. | Guardrails pro Write fehlen. | R1.6.8F |
| Recurring Tasks | Nur Hint/Future Scope. | Decision + Minimal Model. | Keine Begriffe, Schema-Optionen oder Instanzregeln final. | R1.6.9 |

## Follow-up Plan

### R1.6.8B - Inbox Resolve Semantics

Ziel: Resolve-Zustaende fuer Task, Resource, Add-to-existing, Create-new und Archive eindeutig machen.

Scope: Copy, post-success state, duplicate-prevention, recovery copy fuer Zielobjekt erstellt aber Resolve fehlgeschlagen.

Nicht-Scope: Neue Tabellen, Migrationen, Resource Graph, voller Archive Browser.

Akzeptanzkriterien: Route-Auswahl schreibt nichts; Confirm schreibt genau ein Outcome; resolved Items verschwinden aus aktiver Inbox oder zeigen klaren Post-State; Reload bleibt stabil.

Risiko: Automatisches Resolve nach Create kann bei partiellen Fehlern Inkonsistenzen sichtbar machen.

### R1.6.8C - Portfolio Contextual Create

Ziel: Portfolio Create folgt dem aktiven View-Kontext.

Scope: Tasks/Projects/Goals Create-Semantik, All-View-Typwahl, Copy, QA.

Nicht-Scope: Skills ohne echte Entity, Calendar Scheduling, Inbox Create-new Drafts.

Akzeptanzkriterien: Tasks View erstellt Task, Projects View erstellt Project, Goals View erstellt Goal, All View verlangt Typwahl; Add-to-existing sieht neue Targets.

Risiko: Portfolio kann zu einem zweiten Inbox-Capture werden, wenn Create zu generisch bleibt.

### R1.6.8D - Calendar Planner Queue

Ziel: Unscheduled Tages-Tasks in Calendar gezielt terminieren.

Scope: Queue-Semantik, Slot-Auswahl/Picker-Zielmodell, `scheduledStartAt` Confirm, Nutzung von Duration.

Nicht-Scope: Recurring Series, Drag-and-drop-Pflicht, neue Calendar-Event-Engine.

Akzeptanzkriterien: Tasks mit `plannedDate` und ohne `scheduledStartAt` erscheinen in Queue; Terminieren schreibt Uhrzeit und Dauer; Calendar Grid zeigt danach Time Block.

Risiko: Calendar koennte wieder rohe Task-Klaerung uebernehmen, statt nur Zeit zu blocken.

### R1.6.8E - Today Planner / Task Candidate List

Ziel: Today als Tagesplan-Builder mit Kandidaten statt reiner Projektion schaerfen.

Scope: Today Candidate Liste, Priority/Energy/Duration-Sort, `plannedDate` Confirm, Dashboard-Projektion.

Nicht-Scope: Calendar-Uhrzeit, Project-/Goal-Management, Recurrence.

Akzeptanzkriterien: Kandidaten koennen fuer heute uebernommen werden; `plannedDate` ist sichtbar; ohne Uhrzeit bleiben sie nicht Calendar-Time-Blocks.

Risiko: Today kann zu einer zweiten Portfolio-Liste werden, wenn Tagesfokus fehlt.

### R1.6.8F - Planning Signals Persistence Hardening

Ziel: Planning Signals pro Zielobjekt und Owner sauber persistieren oder klar als Hint markieren.

Scope: Priority, Energy, Duration, Area, Review Needed, Today Candidate, Deadline Hint, Recurrence Hint; Copy und Validation.

Nicht-Scope: Voller Recurrence-Engine, AI-Autowrites, neue Policy-Arbeit.

Akzeptanzkriterien: UI sagt fuer jedes Signal, ob es gespeichert wird; gespeicherte Werte erscheinen in Portfolio/Today/Calendar konsistent; nicht persistierte Hints bleiben als Hints markiert.

Risiko: Zu viele Signals koennen User glauben lassen, die Planung sei schon erledigt.

### R1.6.9 - Recurring Task Decision + Minimal Model

Ziel: Recurring Tasks, Habits, Routines und Calendar Series fachlich und technisch trennen.

Scope: Decision-Dokument, Minimalmodell, Instanzregeln, QA-Akzeptanz.

Nicht-Scope: Voller Wiederholungseditor, Habit-Analytics, externe Kalenderintegration.

Akzeptanzkriterien: Begriffe sind eindeutig; ein minimaler Datenmodellpfad ist entschieden; keine automatische Serienerstellung ohne Confirm.

Risiko: Recurrence kann Datenmodell und UI stark verkomplizieren, wenn Habits und Tasks vermischt werden.

## Manual QA Leitplanken

- Quick Thought erzeugt nur ein Inbox Item.
- Inbox Route + Draft erzeugt erst nach Confirm ein Zielobjekt.
- Inbox resolved muss visuell oder durch aktive Queue nachvollziehbar sein.
- Portfolio erstellt kontextabhaengig.
- Today plant den Tag.
- Calendar terminiert Zeitbloecke.
- Planning Signals sind keine Terminierung.
- AI bleibt Vorschlag; User bestaetigt Writes.

## Nicht-Ziele

- Keine App-Code-Implementierung.
- Keine Migrationen.
- Keine neuen Tabellen.
- Keine RLS-/Policy-Aenderungen.
- Keine Remote-DB.
- Kein `supabase link`.
- Kein `supabase db push`.
- Keine Service Role.
- Keine Dashboard-Rekomposition.
