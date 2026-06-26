# Inbox Routing Model

Stand: 2026-06-26
Status: Active
Zweck: Produkt- und Semantik-Lock fuer Inbox Routing, Entry Points, Outcome Routes, Draft Types und Planungs-Signale.
Quelle der Wahrheit: `PRODUCT.md`, `docs/product/pages-and-routes.md`, `docs/product/ux-flows.md`, `docs/product/feature-spec.md` und R1.6.5 Real-Browser-Erkenntnisse.
Gilt fuer: Inbox-, Capture-, Task-, Portfolio-, Today-, Calendar-, Resource- und AI-Assistant-Folgeaufgaben.
Nicht gilt fuer: App-Code, Migrationen, RLS/Policies, Remote-Datenbanken, neue Tabellen oder automatische AI-Ausfuehrung.

## Semantik-Lock

- Capture != Task.
- Task != Termin.
- Terminierte Task = Task + `scheduledStartAt`.
- Inbox Item != finales Objekt.
- Inbox verarbeitet Rohmaterial in Zielobjekte, Relationen oder abgeschlossene/archivierte Eintraege.
- Dashboard Quick Thought ist ein generischer Capture-Einstieg und darf nicht suggerieren, dass sofort eine Task entsteht.
- Today ist Daily Record / Workflow und entscheidet ueber Tagesausfuehrung.
- Calendar ist zeitliche Projektion / Planning Surface und ersetzt keine Inbox-Klaerung.
- Portfolio ist Entity Overview / Workbench fuer Tasks, Projects, Goals und Skills; es ist kein zweites Inbox-System.
- Resources ist die kanonische Wissens- und Ressourcenquelle, nicht eine Notizkopie der Inbox.

## Routing Lifecycle

```text
Raw Capture
-> Clarify
-> Outcome Route auswaehlen
-> passenden Draft pruefen
-> User bestaetigt
-> Zielobjekt / Relation / Archivzustand schreiben
-> spaetere Verfeinerung in Portfolio, Resources, Today oder Calendar
```

Die Inbox darf Planungsabsichten sammeln. Konkrete Tagesplanung und Zeitplanung werden erst in Today oder Calendar festgelegt.

## Entry Points

| Entry Point | Nutzerintention | Entity entsteht | Direkte Persistence | Review noetig | Naechstes Ziel |
| --- | --- | --- | --- | --- | --- |
| Dashboard Quick Thought | Gedanken schnell festhalten, ohne finalen Typ festzulegen | `InboxItem` als Raw Capture | Ja, generischer Inbox-Eintrag | Ja, in Inbox | `/inbox` zur Route-Entscheidung |
| Inbox Quick Capture | Rohmaterial direkt in der Inbox erfassen | `InboxItem` als Raw Capture | Ja, generischer Inbox-Eintrag | Ja, in Inbox | Active Item + Outcome Route |
| Inbox Outcome Route | Fuer ein Inbox Item entscheiden, was daraus werden soll | Zunaechst Route-Auswahl und Draft-Zustand | Nein, Route-Auswahl allein schreibt kein Zielobjekt | Ja, Draft bestaetigen | Task, bestehendes Ziel, neues Ziel, Resource oder Archive |
| Portfolio Task-Erstellung | Eine bewusst benannte Aufgabe in die Task-Inventur aufnehmen | `Task` oder `Task Draft` nach Bestaetigung | Ja, wenn Task-Create-Flow bestaetigt ist | Minimal, weil Intent bereits Task ist | `/portfolio?view=tasks`, spaeter Today/Calendar |
| Today Aufgabe fuer heute | Tagesausfuehrung planen oder bestehende Task fuer heute markieren | Tagesplanung auf Task, kein neues Raw Capture | Ja, wenn `plannedDate`/Today-Plan bestaetigt wird | Nein fuer Inbox; Ja nur fuer Tagespriorisierung | `/today`, Dashboard Today Agenda |
| Calendar Zeitblock | Bestehende Arbeit zeitlich blocken | Zeitblock / terminierte Task mit `scheduledStartAt` | Ja, wenn Zeitblock bestaetigt wird | Nein fuer Inbox; Ja nur fuer Zeitplanung | `/calendar` als Planning Surface |

## Outcome Routes

| Route | Zielsemantik | Ablauf | Aktueller Status | Nicht tun |
| --- | --- | --- | --- | --- |
| Standalone Task | Aus Rohmaterial wird eine eigenstaendige Aufgabe. | Raw Capture -> Task Draft -> Task | Jetzt teilweise moeglich: Inbox item triagiert zu Task mit Titel, Beschreibung, Priority, Energy, Duration und optional Today-Plan. | Keine automatische Task ohne Draft-Bestaetigung. |
| Add to Existing | Rohmaterial wird an ein bestehendes Objekt angehaengt oder in dessen Kontext in eine Task/Note/Relation umgewandelt. | Raw Capture -> Existing Entity auswaehlen -> Beitrag, Task, Note oder Relation erstellen | Target Picker ist verbunden. Persistenter Pfad aktuell nur: Task-Beitrag zu bestehendem Project oder Goal. | Keine Blindverlinkung ohne Target Picker und User-Bestaetigung. Keine Note-/Resource-/Skill-Persistenz ohne eigenen Confirm-Pfad. |
| Create New | Rohmaterial wird Ausgangspunkt fuer ein neues Objekt. | Raw Capture -> Project/Goal/Skill/Resource Draft -> spaetere Verfeinerung | Zielmodell; noch kein Inbox-Create-New-Flow. | Keine neuen Entities aus Rohtext ohne Draft und Folge-Review. |
| Resource | Rohmaterial wird Resource oder Resource-Link. | Raw Capture -> Resource erstellen oder an bestehende Resource haengen -> Resource Graph / Knowledge Network | Resource-Domain existiert konzeptionell/technisch, Inbox-Route ist noch nicht verbunden. | Keine Resource-Graph-Kanten automatisch erzeugen. |
| Solved / Archive | Eintrag ist erledigt, geklaert oder bewusst nicht weiterverfolgt. | Raw Capture -> Close Draft -> done/archive | Erster verbundener Nicht-Task-Pfad; archiviert per Soft Archive und erzeugt kein Zielobjekt. | Nicht still loeschen. Kein Zielobjekt erzwingen. |

### Add to Existing Targets

| Target | Bedeutung | Status |
| --- | --- | --- |
| Project | Capture wird Projektkontext, Projektnotiz, Projektaufgabe oder Projektrelation. | Verbunden fuer Task-Beitrag per bestehender Inbox-Triage-RPC mit `project_id`. Note/Relation bleiben Future Scope. |
| Goal | Capture wird Goal-Kontext, Goal-nahe Aufgabe oder Relation. | Verbunden fuer Task-Beitrag per bestehender Inbox-Triage-RPC mit `goal_id`. Note/Relation bleiben Future Scope. |
| Skill | Nur verwenden, wenn eine reale Skill-Entity und Persistence existieren. | Future Scope, solange Skill nicht als echte persistierte Entity verfuegbar ist. |
| Resource | Capture wird an bestehende Resource gehaengt oder als Resource-Relation modelliert. | Resource Picker liest vorhandene Resources; Resource Link ist vorbereitet, schreibt aber noch keine Relation. |

Add-to-Existing Task-Beitraege erscheinen in Portfolio mit lesbaren Project-/Goal-Kontextrelationen. IDs bleiben technische Details und sind kein primaeres UI-Label.

Add to Existing setzt echte bestehende Targets voraus. Eine minimale Project-/Goal-Erstellung erfolgt im Portfolio, nicht im Inbox-Router.

### Create New Targets

| Target | Bedeutung | Status |
| --- | --- | --- |
| Project Draft | Aus Capture entsteht ein neues Project Draft mit Titel, Kontext und erstem Next Step. | Needs implementation; spaetere Verfeinerung in Portfolio/Projects. |
| Goal Draft | Aus Capture entsteht ein Goal Draft mit Outcome, Horizon und Messsignal. | Needs implementation; spaetere Verfeinerung in Portfolio/Goals. |
| Skill Draft | Aus Capture entsteht ein Skill Draft nur nach realem Skill-Modell. | Future Scope, solange Skill-Persistence nicht eindeutig real ist. |
| Resource Draft | Aus Capture entsteht ein Resource Draft mit Typ, Quelle, Inhalt und Review-Status. | Needs implementation; spaetere Verfeinerung in Resources. |

## Draft Types

| Draft Type | Benoetigte Felder | Aktuelle Modellfelder | Fehlende Felder / Gaps | Spaetere Verfeinerung | Status |
| --- | --- | --- | --- | --- | --- |
| Task Draft | `title`, `description`, `nextAction`, `area`, `priority`, `energy`, `effort/duration`, `todayCandidate`, `reviewNeeded`, optionale `deadlineHint` | Inbox-Triage kann `title`, `description` + eingebettete naechste Aktion, `areaId`, `priority`, `energy`, `durationMinutes`, `plannedDate` schreiben. | `nextAction` ist noch kein eigenes Task-Feld; `reviewNeeded`, `deadlineHint` und `recurrenceHint` sind nicht als eigener Draft-State persistiert. | Portfolio Tasks, Today, Calendar | Jetzt moeglich, aber bewusst begrenzt. |
| Resource Draft | `title`, `body/url`, `type`, `area`, `source`, `privacy`, `status`, `reviewNeeded`, optionale Relation | Resource-Schemas und Use-Cases existieren; Inbox-Route schreibt noch keine Resource. | Inbox Resource Draft UI, Action, Picker und Resource-Graph-Anbindung fehlen. | Resources, Resource Graph / Knowledge Network | Needs migration only falls bestehendes Modell Felder nicht abdeckt; sonst Implementierungsblock. |
| Existing Link Draft | `targetType`, `targetId`, `relationType`, `note/context`, optional `taskDraft` | Resource-Relation-Konzepte existieren fuer Resource Targets; allgemeiner Inbox-Link-Flow fehlt. | Target Picker, erlaubte Relationstypen pro Entity, Confirm Action und Audit Copy fehlen. | Zielseite des bestehenden Objekts | Needs existing entity + Implementation. |
| Project Draft | `title`, `description`, `area`, `status`, `priority`, `nextAction`, optional `deadlineHint` | Project-Domain/Schemas existieren; Inbox-Create-New ist nicht verbunden. | Draft UI, Create Action aus Inbox, Review-State und Projekt-Detail-Weiterleitung fehlen. | Portfolio Projects | Needs implementation; keine neue Tabelle aus diesem Dokument. |
| Goal Draft | `title`, `why`, `measure`, `horizon`, `area`, `priority`, `nextAction` | Goal-Domain/Schemas existieren; Inbox-Create-New ist nicht verbunden. | Draft UI, Create Action, Mess-/Horizon-Felder und Review-State fehlen. | Portfolio Goals | Needs implementation; ggf. spaeter Modellhaertung. |
| Skill Draft | `title`, `domain`, `level`, `evidence`, `nextPractice`, `relatedResources` | Skill ist im Portfolio-Zielmodell sichtbar, aber nicht als realer Inbox-Persistence-Pfad gesichert. | Reale Skill-Entity, Persistence, Picker, Draft UI und Zielroute muessen vorher geklaert werden. | Portfolio Skills / Coding Skill Map | Future Scope. |
| Close Draft | `reason`, `resolution`, `archiveNote`, optional `followUpDate` | Inbox Items haben Status/Stage-Konzepte; dedizierter Close Flow ist nicht sichtbar verbunden. | Close/Archive Action, Undo/History und Copy fehlen. | Inbox Archive / Review-nahe Ansicht | Needs implementation. |

## Planning Signals

| Signal | Bedeutung in Inbox | Konkreter Owner | Aktuelle Persistence | Regel |
| --- | --- | --- | --- | --- |
| `priority` | Wichtigkeit des moeglichen Zielobjekts | Portfolio/Today | Task Draft kann Priority an Task schreiben. | Signal ist kein Zeitplan. |
| `energy` | Erwartete Energie fuer Bearbeitung | Today/Calendar | Task Draft kann Energy an Task schreiben. | Signal hilft Tagesauswahl. |
| `effort/duration` | Grobe Aufwandsschaetzung | Calendar | Task Draft kann `durationMinutes` an Task schreiben. | Dauer ist kein gebuchter Zeitblock. |
| `area` | Kontext- oder Lebensbereich | Portfolio/Resources | Task Draft kann reale `areaId` schreiben, wenn vorhanden. | Kein Freitext-Area-Fake. |
| `reviewNeeded` | Braucht spaetere menschliche Klaerung | Inbox/Portfolio | Nicht als eigener Draft-State persistiert. | Review darf Zielobjekt nicht ersetzen. |
| `todayCandidate` | Koennte heute relevant sein | Today | Optionales `plannedDate` fuer Task bei User-Auswahl. | Today entscheidet Tagesplan, nicht die Inbox allein. |
| `deadlineHint` | Moegliche Frist aus Capture | Portfolio/Calendar | Task-Modell hat Due-Date-Konzepte, Inbox Draft nutzt sie noch nicht. | Hinweis bleibt Hint bis User bestaetigt. |
| `recurrenceHint` | Wiederholungsverdacht | Future Planning | Kein aktueller Inbox-Pfad. | Future Scope; keine implizite Serie erzeugen. |

Die Inbox kann Planungs-Signale aufnehmen. Today und Calendar wandeln sie in konkrete Tages- oder Zeitplanung um. Calendar darf keine rohe Inbox-Klaerung ersetzen.

## AI Assistant Role

AI darf vorschlagen:

- passende Outcome Route
- besseren Titel
- naechste Aktion
- Area
- Priority
- Energy
- Effort/Duration
- moegliche Ziel-Entity
- Resource Cluster

AI darf nicht automatisch:

- Tasks, Projects oder Goals final erstellen
- finale Resource-Links oder Graph-Relationen schreiben
- sensitive Daten uebernehmen, ausweiten oder ohne User-Review persistieren
- Inbox Items loeschen oder archivieren

Kritische Outcomes brauchen User-Bestaetigung. AI bleibt Vorschlags- und Klaerungsschicht, nicht autonomer Actor.

## Current Implementation Audit

| Bereich | Aktuell | Ziel | Gap | empfohlener Folgeblock |
| --- | --- | --- | --- | --- |
| Dashboard Quick Thought | Speichert generischen Inbox-Eintrag. | Klarer Capture-Einstieg ohne Task-Suggestion. | Copy/QA muss Semantik stabil halten. | R1.6.6B |
| Inbox Quick Capture | Speichert Raw Capture in Inbox. | Einheitlicher Capture-Einstieg mit neutraler Route-Entscheidung. | Route-Sprache und Status koennen weiter normalisiert werden. | R1.6.6B |
| Outcome Route Cards | Standalone Task aktiv; andere Routen sichtbar, aber `Noch nicht verbunden`. | Jede Route hat klare Draft- und Confirm-Semantik. | Add/Create/Resource/Archive fehlen als echte Flows. | R1.6.6B |
| Task Draft | Editierbar und schreibt bestaetigten Task. | Task Draft ist ein Review-Zwischenschritt, kein stiller Auto-Task. | Next Action ist in Description eingebettet; Review/Deadline/Recurrence fehlen. | R1.6.6F |
| Task erstellen | Bestaetigter Inbox-Triage-Pfad erstellt Task. | Nur User-Bestaetigung schreibt Task. | Weitere Validierung und Lifecycle-Haertung folgen. | R1.6.7 |
| Add to Existing | Target Picker liest bestehende Projects, Goals und Resources. Task-Beitrag zu Project/Goal ist verbunden; Resource Link/Note/Decision/Skill sind sichtbar begrenzt. | Target Picker + Relation/Task/Note-Entscheidung. | Relation Action, Note/Decision-Persistence, Resource Graph Confirm und Skill-Persistence fehlen. | R1.6.6E |
| Create New | Route sichtbar, nicht verbunden. | Project/Goal/Resource Drafts, Skill nur bei realer Persistence. | Draft UIs und Actions fehlen. | R1.6.6E |
| Resource | Route sichtbar, nicht verbunden. | Resource Draft oder Attach to existing Resource. | Resource Draft UI, Resource Picker und Graph Entry fehlen. | R1.6.6D |
| Portfolio Task Projection | Tasks aus Inbox-Triage werden in Portfolio sichtbar. | Portfolio bleibt Task-Inventur und Refinement Surface. | Detail-Edit/Lifecycle noch nicht vollstaendig. | R1.6.7 |
| Today Planning | `plannedDate` kann Task in Today/Dashboard bringen. | Today macht Tagesauswahl und Execution sichtbar. | Today ist noch kein voller Planungsdialog. | R1.6.6F |
| Calendar Scheduling | Terminierung erzeugt zeitliche Projektion aus Task. | Calendar blockt Zeit, ohne Inbox-Klaerung zu ersetzen. | Scheduling-UX und Lifecycle koennen stabilisiert werden. | R1.6.7 |
| AI Assistant Panel | Vorschlaege sichtbar/demonstrativ, nicht autonom. | AI empfiehlt Route, Felder und Ziele mit Confirm-Gate. | Keine Apply-Logik und keine Guardrails pro Outcome. | R1.6.6B |

## Follow-up Plan

### R1.6.6B - Inbox Router UI Normalization

Ziel: Alle Outcome-Routen konsistent als Routing-System darstellen.

Scope: Route-Copy, disabled/enabled states, Draft-Gates, AI-Suggestion-Copy, Checklist-Semantik.

Nicht-Scope: Neue DB-Felder, Migrationen, Add-to-Existing-Persistence, Resource Graph.

Akzeptanzkriterien: Quick Capture bleibt neutral; Standalone Task ist klar als ein Outcome markiert; nicht verbundene Routen wirken nicht klickbar-produktiv; AI bleibt Vorschlag.

Risiko: UI kann zu stark nach Feature-Versprechen aussehen, obwohl Persistence fehlt.

### R1.6.6C - Add to Existing: Project/Goal Target Picker

Ziel: Bestehende Project-/Goal-Ziele sicher auswaehlen und Capture daran routen.

Scope: Target Picker, erlaubte Zieltypen, Confirm Step, Relation- oder Task-Draft-Entscheidung.

Nicht-Scope: Skill-Persistence, Resource Graph, automatische AI-Verlinkung.

Akzeptanzkriterien: User waehlt ein reales Ziel; ohne Ziel keine Persistence; Zielseite kann den neuen Kontext nachvollziehen.

Risiko: Relationstypen werden zu frueh generisch und verlieren fachliche Bedeutung.

### R1.6.6D - Resource Draft & Resource Graph Entry

Ziel: Resource Outcome als eigenen Draft und spaeteren Graph-Einstieg verfuegbar machen.

Scope: Resource Draft UI, Resource Type, Source/URL/Body, Review-State, optional Attach-to-existing Resource.

Nicht-Scope: Voller Knowledge Graph, automatische Clusterbildung, Skill-Map-Automation.

Akzeptanzkriterien: Resource wird erst nach Confirm geschrieben; existing Resource Attach braucht Picker; Graph-Relationen sind explizit.

Risiko: Resources koennen zu Notizablage werden, wenn Typ und Review fehlen.

### R1.6.6E - Create New Project/Goal/Resource Drafts

Ziel: Neue Zielobjekte aus Inbox nur ueber klare Drafts erzeugen.

Scope: Project Draft, Goal Draft, Resource Draft, Zielseiten-Weiterleitung, Review Copy.

Nicht-Scope: Skill Draft ohne echte Skill-Persistence, neue Tabellen, automatische AI-Erstellung.

Akzeptanzkriterien: Jeder Draft zeigt benoetigte Pflichtfelder; Confirm schreibt genau ein Zielobjekt; Inbox Item wird nachvollziehbar verarbeitet.

Risiko: Zu viele Draft-Varianten koennen die Inbox ueberladen.

### R1.6.6F - Task Planning Signals Persistence Hardening

Ziel: Task Draft Signale sauber zwischen Inbox, Portfolio, Today und Calendar trennen.

Scope: Priority, Energy, Duration, Area, Today Candidate, optional Deadline Hint; Copy und Validierung.

Nicht-Scope: Recurrence-System, Kalender-Engine, neue AI-Automatismen.

Akzeptanzkriterien: Signalwerte persistieren nur, wenn Modell und User-Bestaetigung passen; Today Candidate bleibt Tagesplanung; Duration bleibt kein Zeitblock.

Risiko: Nutzer koennen Planning Signals als fertige Terminierung missverstehen.

### R1.6.7 - Task Lifecycle & Daily Flow Stabilization

Ziel: Task-Lifecycle von Inbox ueber Portfolio, Today und Calendar stabilisieren.

Scope: Task-Status, Edit/Complete/Archive, Tagesplanung, Terminierung, Rueckprojektion in Dashboard.

Nicht-Scope: Neue Outcome-Routen, Resource Graph, Remote-DB-Arbeiten.

Akzeptanzkriterien: Eine Task kann erstellt, geplant, terminiert, erledigt und nachvollziehbar angezeigt werden; keine doppelte Task aus demselben Inbox Item.

Risiko: Lifecycle-Logik kann zu breit werden, wenn sie gleichzeitig Project/Goal/Resource-Flows mitloest.

## Manual QA Leitplanken

- Inbox ist Routing-System.
- Dashboard ist generischer Capture-Einstieg.
- Task-Erstellung ist nur ein moeglicher Outcome.
- Planning Signals sind keine feste Terminierung.
- Calendar ist Zeitblock- und Projection-Surface, nicht Inbox-Klaerung.
- Nicht verbundene Routen duerfen keine Persistence suggerieren.
- AI-Vorschlaege brauchen Confirm-Gates.

## Nicht-Ziele

- Keine Remote-DB.
- Kein `supabase link`.
- Kein `supabase db push`.
- Keine Migrationen.
- Keine neuen Tabellen.
- Keine RLS-/Policy-Aenderungen.
- Keine Service Role im Client.
- Keine automatische AI-Persistence.
