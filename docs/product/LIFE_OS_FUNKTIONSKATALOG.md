# Life OS – Funktions- und Fähigkeitskatalog

**Stand:** 2026-06-18  
**Status:** Discovery Draft – noch keine operative Produkt-, Navigations- oder Routenwahrheit  
**Zweck:** Vollständige Erfassung und fachliche Einordnung der erwarteten Life-OS-Funktionen vor einem möglichen IA-/Navigations-Overhaul.  
**Ausgangsbasis:** Nutzeranforderungen sowie `PRODUCT.md`, `DATA_MODEL.md`, `ROADMAP.md` und `pages-and-routes.md`.  
**Nicht Zweck:** Festlegung der finalen Sidebar, exakter Routen, UI-Layouts, Datenbanktabellen oder Implementierungsreihenfolge.

---

## 1. Ausgangslage

Life OS entwickelt sich von einem persönlichen Produktivitäts-Cockpit zu einem umfassenderen persönlichen Steuerungs-, Wissens-, Daten- und Analysesystem.

Das Zielprodukt soll gleichzeitig:

1. aktuelle Arbeit steuern,
2. Gedanken und Informationen zuverlässig aufnehmen,
3. Aufgaben, Projekte, Ziele, Skills und Gewohnheiten strukturieren,
4. Lebensbereiche fachlich abbilden,
5. historische Daten und Erfolge erhalten,
6. Zusammenhänge analysierbar machen,
7. spätere KI-Agenten mit strukturiertem Kontext versorgen.

Diese Erweiterung ist fachlich größer als die derzeitige aktive Navigation. Der Katalog ersetzt die bestehenden Root-Dokumente noch nicht. Er dient als Prüfbasis, bevor `PRODUCT.md`, `DATA_MODEL.md`, `pages-and-routes.md` und die Navigation angepasst werden.

---

## 2. Grundmodell des zukünftigen Life OS

Life OS sollte nicht als Sammlung isolierter Seiten verstanden werden. Es ist ein zusammenhängender Lebenszyklus für Informationen, Entscheidungen und Aktivitäten.

```text
Erfassen
→ Klären
→ Strukturieren
→ Zeitlich planen
→ Ausführen
→ Beobachten und dokumentieren
→ Reflektieren
→ Analysieren
→ Lernen und wiederverwenden
→ Archivieren
```

Zuordnung der wichtigsten Funktionen:

```text
Quick Thought / Inbox
→ Erfassen und klären

Tasks / Projects / Goals / Skills / Habits / Ideas
→ Strukturieren

Calendar
→ Zeitlich planen

Dashboard
→ Jetzt steuern

Today
→ Einen Tag planen, beobachten und als Datensatz abschließen

Review
→ Reflektieren und Erreichtes einordnen

Analytics / Reports
→ Muster und Fortschritt analysieren

Resources / Area-Wikis / Skill Maps
→ Wissen erhalten und wiederverwenden

Archive
→ Vergangenheit zugänglich halten, ohne aktive Steuerung zu überladen
```

### 2.1 Fünf Systemschichten

Der Zielumfang lässt sich in fünf Schichten einteilen:

1. **Command:** Was zählt jetzt?
2. **Planning & Execution:** Was soll erreicht und getan werden?
3. **Memory & Knowledge:** Was wurde gedacht, gelernt oder gesammelt?
4. **Life Data:** Was ist tatsächlich passiert und gemessen worden?
5. **Reflection & Intelligence:** Was bedeutet das, und was sollte daraus folgen?

Diese Schichten sind fachlich stabiler als eine frühe Festlegung auf bestimmte Sidebar-Gruppen.

---

## 3. Begriffe zur Einordnung

Dieser Katalog unterscheidet bewusst verschiedene Produkttypen. Nicht jede Funktion muss später eine eigene Hauptseite oder einen eigenen Navigationseintrag erhalten.

### 3.1 Entry Point

Ein Einstiegspunkt bündelt relevante Informationen und Aktionen, besitzt aber nicht zwingend eigene fachliche Daten.

Beispiel: Dashboard.

### 3.2 Entity

Eine dauerhaft gespeicherte fachliche Einheit mit eigener Identität und eigenem Lebenszyklus.

Beispiele: Task, Project, Goal, Skill, Resource, Inventory Item.

### 3.3 Record

Ein zeitlich oder sachlich abgeschlossener Datensatz, der einen Zustand oder Zeitraum dokumentiert.

Beispiele: Daily Record, Review, Workout Session, Sleep Log.

### 3.4 Workflow

Ein Prozess, der Entities oder Records verändert.

Beispiele: Inbox Processing, Wochenplanung, Projektabschluss, Einkaufsentscheidung.

### 3.5 Projection / View

Eine zusammengesetzte Sicht auf Daten aus mehreren Quellen, ohne diese Daten zu duplizieren.

Beispiele: Calendar, Dashboard, Today-Zusammenfassung, Analytics.

### 3.6 Area / Domain

Ein Lebens- oder Arbeitskontext. Eine Area ist keine alleinige Besitzstruktur aller Daten, sondern eine fachliche Dimension, über die globale Entities gefiltert und verbunden werden können.

Beispiele: Education, Work, Life, Coding.

### 3.7 System Service

Eine Querschnittsfunktion, die von vielen Bereichen genutzt wird.

Beispiele: Suche, Tags, Verlinkungen, Activity Log, AI Assistance, Export.

---

## 4. Verbindliche fachliche Leitplanken für die spätere Struktur

### 4.1 Ein Objekt hat eine kanonische Quelle

Ein Task, Project, Goal, Skill oder Resource darf in vielen Kontexten erscheinen, soll aber nicht als getrennte Kopie pro Area gespeichert werden.

```text
Project „Masterarbeit schreiben"
→ kanonisches Project
→ sichtbar in Education
→ sichtbar in Calendar
→ sichtbar in Goal-Fortschritt
→ sichtbar in Today
→ sichtbar in Review
```

### 4.2 Areas sind Kontext, nicht alleinige Ordner

Eine Area beantwortet:

```text
In welchem Lebens- oder Arbeitskontext ist etwas relevant?
```

Sie beantwortet nicht zwingend:

```text
Wo muss dieses Objekt exklusiv gespeichert werden?
```

Mehrfachzuordnungen können sinnvoll sein. Ein Skill wie „Python“ kann Education, Work und Coding betreffen.

### 4.3 Plandaten, Ist-Daten und Reflexion bleiben unterscheidbar

```text
Plan
→ Was sollte passieren?

Actual
→ Was ist tatsächlich passiert?

Reflection
→ Wie wird das Erlebte eingeordnet?

Derived
→ Welche Kennzahlen oder AI-Zusammenfassungen werden daraus berechnet?
```

Diese Ebenen dürfen in Today oder Review gemeinsam angezeigt werden, sollten aber fachlich nicht vermischt werden.

### 4.4 Analytics ist eine abgeleitete Schicht

Analytics soll möglichst aus kanonischen Entities, Events und Messwerten berechnet werden. Eine Statistik ist normalerweise nicht die Quelle des zugrunde liegenden Ereignisses.

### 4.5 AI schlägt vor, der Nutzer entscheidet

KI-Agenten dürfen später:

- klassifizieren,
- strukturieren,
- Meilensteine vorschlagen,
- Zusammenfassungen erstellen,
- Datenlücken markieren,
- mögliche Zusammenhänge zeigen,
- nächste Schritte empfehlen.

Kritische Änderungen, Health-Interpretationen, automatische Skill-Anerkennung und dauerhafte Umwandlungen benötigen eine nachvollziehbare Bestätigung.

---

# 5. Kernfunktionen

## CAP-001 – Dashboard

**Typ:** Entry Point / Projection  
**Erwartungsstatus:** Bereits vorhanden; Design V5 bleibt locked.

### Zweck

Das Dashboard ist der Einstiegspunkt und das operative Cockpit. Es beantwortet in wenigen Sekunden, was jetzt zählt.

### Kernfragen

- Was ist jetzt wichtig?
- Was ist als Nächstes zu tun?
- Welche Signale benötigen Aufmerksamkeit?
- Welche Projekte, Goals oder Habits bewegen sich?
- Was muss reviewed werden?

### Fachliche Rolle

Das Dashboard soll keine eigene parallele Datenwelt besitzen. Es liest aus Today, Inbox, Tasks, Projects, Goals, Habits, Health, Nutrition und Review.

### Abgrenzung

- kein vollständiges Tagesarchiv,
- keine Projektverwaltung in voller Tiefe,
- keine zentrale BI-Seite,
- keine vollständige Wissensdatenbank,
- keine dauerhafte Ablage von Domain-Daten.

---

## CAP-002 – Today / Daily Record

**Typ:** Dated Record + Projection + Workflow  
**Arbeitstitel:** `Daily Record` beschreibt die fachliche Rolle präziser als ein reiner Today-Hub.

### Zweck

Today soll nicht das Dashboard duplizieren. Es bildet einen konkreten Kalendertag vollständig genug ab, damit er geplant, beobachtet, abgeschlossen und später rekonstruiert werden kann.

Ein früherer Tag soll über Calendar geöffnet werden können und zeigen:

```text
Was war geplant?
Was ist tatsächlich passiert?
Wie ging es mir?
Was wurde gelernt oder entschieden?
Welche neuen Informationen entstanden?
Was blieb offen?
```

### Vier Datensegmente

#### A. Planned Day

- geplante Events und Zeitblöcke,
- Daily To-dos,
- erwarteter Fortschritt,
- geplante Meals,
- geplante Workouts,
- geplante Habits,
- anfängliche Prioritäten und Entscheidungen,
- geplante Verschiebungen oder bewusste Nicht-Ziele.

#### B. Observed Day

- abgeschlossene und nicht abgeschlossene Tasks,
- tatsächliche Aktivitätszeiten,
- Quick Thoughts und Captures,
- Health-Messwerte,
- gegessene Meals und Nutrients,
- Habit Logs,
- Workout- und Running-Daten,
- Sleep-Daten,
- Mood-Verlauf,
- hinzugefügte Resources oder Notes.

#### C. Reflection

- finaler Tagesrecap,
- was geschafft wurde,
- was gelernt wurde,
- neue Erkenntnisse,
- offene Loops,
- mentale Belastungen oder hilfreiche Gedanken,
- Ursachen und Kontext der Stimmung,
- Vorbereitung für den nächsten Tag.

#### D. Derived Summary

- berechnete Tageskennzahlen,
- Completion und Zeitverteilung,
- Tageszusammenfassung,
- AI-Entwurf für Recap,
- Verweise für Weekly/Monthly/Yearly Reports,
- Data-Quality-Hinweise.

### Enthaltene Datenbereiche

- Sleep: Dauer, Qualität, Traum-Notiz, luzides Träumen, Unterbrechungen,
- Tasks: Plan, Kontext, erwarteter und tatsächlicher Stand,
- Entscheidungen: verschieben, streichen, priorisieren,
- Meals und Nutrients,
- Habits,
- Health-Messwerte,
- Mood und Mental Health,
- Quick-Thought-Aktivität,
- Lernen, Resources und neue Erkenntnisse,
- Tagesabschluss.

### Source-of-Truth-Regel

Today soll nicht alle Domain-Daten als Kopie speichern.

```text
Sleep Log
→ Quelle im Sleep-Modul

Meal / Nutrient Log
→ Quelle im Nutrition-Modul

Workout Session
→ Quelle im Training-Modul

Task Completion
→ Quelle in Tasks

Daily Record
→ verbindet diese Daten, ergänzt tagesbezogene Entscheidungen und Reflexion
```

### Anforderungen für spätere Agenten

Jeder relevante Eintrag sollte langfristig besitzen:

- `occurred_at`,
- `source`,
- `created_by` oder `generated_by`,
- `linked_context`,
- `review_needed`,
- optional `confidence`,
- nachvollziehbare Links zu den kanonischen Objekten.

### Offene Entscheidungen

- Wird ein Tag aktiv „abgeschlossen“ oder bleibt er jederzeit editierbar?
- Werden nachträgliche Korrekturen versioniert?
- Ist die Route `/today?date=YYYY-MM-DD`, `/day/[date]` oder eine andere Form?
- Welche Daten werden als Tages-Snapshot gespeichert und welche stets live berechnet?

---

## CAP-003 – Calendar / Temporal Planning

**Typ:** Projection + Planning Workflow  
**Schwerpunkt:** langfristige zeitliche Einordnung, nicht tägliches Cockpit.

### Zweck

Calendar ordnet relevante Life-OS-Objekte auf einer Zeitachse ein. Er soll sowohl Planung als auch historische Navigation ermöglichen.

### Erwartete Ansichten

- Day,
- Week,
- Month,
- Year,
- optional Agenda/List,
- filterbare Zeitachsen nach Art, Area, Project, Goal, Skill oder Domain.

### Erwartete Inhalte

- Events,
- Tasks mit geplantem Zeitpunkt oder Deadline,
- Project Milestones und Deadlines,
- Goal Milestones und Target Dates,
- Skill-Lerneinheiten,
- Reviews,
- Workouts und Running Sessions,
- Meal Plans,
- Habits oder Routinen, sofern zeitlich relevant,
- historische Messwerte als optionale Layer oder Day Details.

### Source-of-Truth-Regel

Der Calendar ist grundsätzlich eine Projektion und Bearbeitungsoberfläche, nicht die alleinige Quelle aller Termine.

```text
Task
→ `scheduled_at` / `due_at`

Project Milestone
→ eigener Meilenstein mit Datum

Goal
→ Target Date oder Goal Milestone

Workout
→ geplante Session

Meal
→ geplantes Meal

Freier Termin
→ Calendar Event
```

Wenn ein Objekt im Calendar bearbeitet wird, soll die Änderung später an seine kanonische Quelle zurückgeschrieben werden.

### Erstellung aus dem Calendar

Beim Erstellen soll der Nutzer langfristig den fachlichen Typ wählen können:

- Event,
- Task,
- Focus Block,
- Project Milestone,
- Goal Milestone,
- Workout,
- Meal,
- Review Block,
- Learning Session.

### Wochenplanung

Calendar soll einen wiederkehrenden Planungsworkflow unterstützen:

1. ungeplante oder grob geplante Items sammeln,
2. Aufwand und Abhängigkeiten einschätzen,
3. Tasks, Milestones, Skills und Goals zeitlich einordnen,
4. Kapazität und Konflikte prüfen,
5. Vorschlag bestätigen,
6. Änderungen später anhand der tatsächlichen Daten auswerten.

### AI-Potenzial

Ein Agent kann später:

- Goals in mögliche Meilensteine zerlegen,
- Project-Aufwand grob schätzen,
- freie Kapazität erkennen,
- Planungsvarianten vorschlagen,
- Konflikte markieren,
- verschobene Arbeit neu einordnen.

Planänderungen sollen bestätigt werden.

### Historische Nutzung

- Klick auf einen Tag öffnet dessen Daily Record.
- Zeitliche Entwicklungen können über Filter sichtbar werden.
- Einzelne Messwerte wie Gewicht oder Running-Leistung sollten nicht standardmäßig den Kalender überladen, sondern als optionale Layer oder Day Detail erscheinen.

### Spätere Integrationen

- Outlook / Microsoft 365,
- Google Calendar,
- Geräte- oder Fitnessimporte.

Externer Sync ist ein späterer Integrationsblock und nicht Teil des aktuellen MVP.

---

## CAP-004 – Inbox / Capture & Clarification

**Typ:** Entity + Workflow

### Zweck

Inbox ist die schnelle Anlaufstelle für ungeklärte Gedanken, Aufgaben, Fragen, Beobachtungen und Agentenkontext.

Inbox ist kein dauerhafter Endspeicher. Der Kernwert liegt in der Klärung.

### Eingangstypen

- Gedanke,
- Task-Kandidat,
- Projektidee,
- Goal-Idee,
- Skill-Idee,
- Resource,
- Note,
- Frage,
- Journal-Impuls,
- Review-Punkt,
- Kaufidee,
- Agentenkontext.

### Workflow

```text
Raw Capture
→ Bedeutung klären
→ Kontext und Motivation verstehen
→ Zielobjekt wählen
→ verlinken oder umwandeln
→ bei Bedarf zeitlich planen
→ archivieren
```

### Mögliche Ergebnisse

- Task,
- Project,
- Goal,
- Skill,
- Idea,
- Resource,
- Note,
- Journal Entry,
- Review Prompt,
- Wishlist Item,
- verknüpfter Calendar Item.

### AI-Potenzial

- Typ vorschlagen,
- Area und Tags vorschlagen,
- ähnliche bestehende Items finden,
- Duplikate markieren,
- Rückfragen stellen,
- eine erste Struktur oder Next Action vorschlagen,
- Batch-Triage unterstützen.

Die endgültige Konvertierung bleibt reviewpflichtig.

### Activity Log

Quick Thoughts und Inbox-Aktionen sollen nachvollziehbar sein:

- wann erfasst,
- durch wen oder welche Integration,
- was daraus geworden ist,
- ob ein Agent beteiligt war,
- welcher Zusammenhang verlinkt wurde.

---

## CAP-005 – Tasks

**Typ:** Globale Entity + Workbench + Projektion

### Zweck

Tasks bilden kleine, konkrete, ausführbare Arbeit ab.

### Definition

Ein Task ist eine Handlung, die:

- klar genug zum Ausführen ist,
- keine eigene umfangreiche Projektstruktur benötigt,
- einen Status und optional einen Termin besitzt,
- zu Project, Goal, Skill, Area oder keinem größeren Objekt gehören kann.

### Muss ein Task immer gebunden sein?

Nein. Nicht jede Aufgabe rechtfertigt ein Project oder Goal.

Beispiele für eigenständige Tasks:

- Termin vereinbaren,
- Dokument verschicken,
- Rechnung prüfen,
- Einkauf abholen,
- Profil aktualisieren.

### Klarer Use Case einer globalen Task Workbench

Eine globale Tasks-Funktion ist fachlich sinnvoll für:

- vollständige Suche,
- Triage,
- Backlog-Pflege,
- Waiting/Follow-up,
- blockierte Tasks,
- wiederkehrende Tasks,
- Batch-Änderungen,
- Abhängigkeiten,
- Delegated oder External,
- Area- und Project-übergreifende Filter,
- Archiv und Done History.

Daily-, Weekly- und Calendar-Ansichten bleiben Projektionen derselben Tasks.

### Mögliche Views

- Today,
- Upcoming,
- Unscheduled,
- Waiting,
- Blocked,
- Someday,
- Recurring,
- Done,
- Kanban nach Status,
- Liste nach Zeit,
- Gruppierung nach Project, Goal, Skill oder Area.

### Offene Navigationsfrage

Die Capability ist erforderlich. Ob Tasks dauerhaft ein Hauptnavigationseintrag wird, kann später anhand der Nutzung entschieden werden.

---

## CAP-006 – Review, Achievement Ledger und Reports

**Typ:** Record + Workflow + Projection

### Zweck

Review speichert bewusste Reflexion und ordnet Erreichtes ein. Es soll nicht mit Analytics oder einem reinen Done-Archiv gleichgesetzt werden.

### Drei getrennte fachliche Komponenten

#### A. Review Record

Vom Nutzer verfasste oder bestätigte Reflexion:

- Daily Review,
- Weekly Review,
- Monthly Review,
- Yearly Review,
- Project Review,
- Goal Review,
- Skill Review.

#### B. Achievement Ledger

Automatisch oder halbautomatisch zusammengesetzte Chronik dessen, was abgeschlossen oder nachweisbar erreicht wurde:

- abgeschlossene Tasks,
- abgeschlossene Projects,
- erreichte Goals,
- demonstrierte Skills,
- Milestones,
- Trainings- oder Lernleistungen,
- hinzugefügte wichtige Resources,
- veröffentlichte Portfolio-Artefakte.

#### C. Report

Berechnete und zusammengefasste Auswertung für einen Zeitraum oder Bereich:

- Tagesbericht,
- Wochenbericht,
- Monatsbericht,
- Jahresbericht,
- Area Report,
- Project Report,
- Health Report.

### Filter- und Sortieranforderungen

- Zeitraum,
- Area,
- Entity-Typ,
- Status,
- Achievement-Typ,
- Mood/Energy,
- Project oder Goal,
- manuell vs. AI-generiert,
- reviewed vs. offen.

### AI-Potenzial

- Review-Entwurf aus Daily Records,
- wiederkehrende Blocker erkennen,
- Wins zusammenfassen,
- unbeachtete Erfolge sichtbar machen,
- offene Loops ableiten,
- Vorschlag für nächste Woche,
- Vergleich von Plan und Ist.

### Wichtige Abgrenzung

```text
Task Completion
→ Quelle in Task

Review
→ persönliche Einordnung

Report
→ berechnete Zusammenfassung

Achievement Ledger
→ nachvollziehbare Erfolgschronik
```

---

# 6. Steuerungs- und Entwicklungsobjekte

## CAP-101 – Projects

**Typ:** Globale Entity + Workflow

### Definition

Ein Project ist ein endliches Vorhaben mit einem konkreten Ergebnis, mehreren Schritten und einem erkennbaren Abschluss.

Es ist größer als ein Task, aber konkreter und endlicher als ein langfristiges Goal.

### Beispiele

- Masterarbeit schreiben,
- ein Spiel entwickeln,
- ein Life-OS-Feature implementieren,
- einen Trainingsplan für zwölf Wochen aufsetzen,
- ein Work-Paket abschließen,
- eine Kaufentscheidung systematisch vorbereiten.

### Bestandteile

- klare Zieldefinition,
- erwartetes Ergebnis oder Deliverable,
- Scope und Nicht-Scope,
- Anforderungen,
- Tasks,
- Milestones,
- Phasen,
- Risiken und Blocker,
- Ressourcen,
- benötigte Skills,
- Fortschritt,
- Deadline oder Zielzeitraum,
- Entscheidungen,
- Lessons Learned,
- Abschlusskriterien.

### Empfohlene Phasenlogik

Nicht jedes kleine Project sollte denselben schweren Prozess erzwingen. Sinnvoll sind Templates mit einer gemeinsamen Grundlogik:

```text
Define
→ Plan
→ Execute
→ Validate / Deliver
→ Review / Learn
→ Archive
```

Für Softwareprojekte kann ein detaillierteres Template gelten:

```text
Problem / Ziel
→ Anforderungen
→ Architektur / Planung
→ Umsetzung
→ Test / Abnahme
→ Release
→ Lessons Learned
```

### Project Management Inspiration

Mögliche spätere Ansichten:

- Overview,
- Status/Kanban,
- Timeline/Milestones,
- Task Breakdown,
- Dependencies,
- Risks,
- Resources,
- Skills Readiness,
- Decisions,
- Lessons Learned,
- Activity Log.

### Area-Bezug

Projects können jeder Area zugeordnet sein und bei Bedarf mehrere Kontexte berühren. Der Project-Datensatz bleibt kanonisch global.

### AI-Potenzial

- Project Brief aus einer Idee erstellen,
- Anforderungen vorschlagen,
- Phasen und Milestones entwerfen,
- Task Breakdown erstellen,
- Risiken und fehlende Skills erkennen,
- Status aus Activity und Tasks zusammenfassen,
- Lessons Learned vorbereiten.

---

## CAP-102 – Goals

**Typ:** Globale Entity + Metric-/Milestone-Modell

### Definition

Ein Goal beschreibt einen gewünschten zukünftigen Zustand oder ein messbares Ergebnis. Es kann langfristig sein, mehrere Projects und Habits umfassen und muss ein klares Erfolgskriterium besitzen.

### Beispiele

- 80 kg erreichen,
- Pace X:XX über eine festgelegte Distanz erreichen,
- ein MacBook kaufen,
- einen Abschluss erreichen,
- eine stabile Schlafroutine aufbauen.

### Bestandteile

- gewünschter Zustand,
- Motivation und persönlicher Wert,
- Startwert oder Ausgangslage,
- Erfolgskriterium,
- Zielwert oder qualitative Definition,
- Deadline oder offener Zeitraum,
- Milestones,
- relevante Metrics,
- verknüpfte Projects,
- verknüpfte Tasks,
- verknüpfte Habits,
- Risiken und Hindernisse,
- nächste sinnvolle Actions,
- Status und Review-Rhythmus.

### Quantitative und qualitative Goals

```text
Quantitativ
→ Zielwert, Einheit, Messreihe

Qualitativ
→ beobachtbare Kriterien, Belege oder Review-Entscheidung
```

### AI-Potenzial

- Goal präzisieren,
- Messbarkeit prüfen,
- Milestones vorschlagen,
- notwendige Projects und Habits ableiten,
- Fortschritt aus verschiedenen Domains aggregieren,
- Abweichungen erklären,
- nächste wirksame Actions vorschlagen.

### Vorsicht bei „MacBook kaufen"

Ein Kauf kann je nach Bedeutung unterschiedlich modelliert werden:

```text
Wishlist Item
→ einfacher Wunsch ohne aktiven Plan

Purchase Decision
→ Vergleich und Auswahl

Project
→ Recherche, Finanzierung, Auswahl und Kauf als endliches Vorhaben

Goal
→ sinnvoll, wenn der Kauf ein persönliches, finanzielles oder zeitliches Ziel darstellt
```

---

## CAP-103 – Skills

**Typ:** Globale Entity + Kompetenzmodell + Evidence Graph

### Definition

Ein Skill ist eine Fähigkeit, Wissen in geeigneten Situationen zuverlässig anzuwenden. Kursabschluss oder gelesene Theorie allein beweisen noch keinen Skill.

### Beispiele

- Java,
- Next.js,
- Scientific Writing,
- Literature Review,
- Data Engineering,
- Prompt Engineering,
- Running Technique,
- Strength Programming.

### Bestandteile

- Skill-Definition,
- Skill-Domain oder mehrere Areas,
- Zielniveau,
- aktueller Status,
- Voraussetzungen,
- Teilkompetenzen,
- Lern- und Praxisaktivitäten,
- Resources,
- Courses,
- Tasks und Projects,
- Evidence,
- Portfolio-Artefakte,
- letzte Anwendung,
- Review und Maintenance.

### Empfohlener Kompetenzlebenszyklus

```text
Interested
→ Learning
→ Practicing
→ Applied
→ Demonstrated
→ Maintaining
```

Ein Prozentwert allein reicht nicht. Fortschritt sollte durch konkrete Evidence erklärbar sein.

### Evidence-Beispiele

- erfolgreich implementierte Funktion,
- abgeschlossenes Project,
- Kursmodul,
- Prüfung oder Assessment,
- dokumentierte Übung,
- veröffentlichtes Portfolio-Artefakt,
- Work-Ergebnis,
- reflektiertes Lessons Learned.

### Automatische Skill-Erkennung

Skills sollten nicht ungeprüft als „erlernt“ markiert werden. Ein Agent kann aus Projects, Tasks oder Courses neue Skills und Evidence vorschlagen. Die Bestätigung bleibt manuell.

### Hyperskill

Eine spätere Hyperskill-Integration kann:

- Tracks und Module importieren,
- absolvierte Einheiten als Learning Activity erfassen,
- Skills und Evidence vorschlagen,
- Fortschritt aktualisieren,
- Lücken in einer Skill Map markieren.

---

## CAP-104 – Habits und Anti-Rot Actions

**Typ:** Globale Entity + Recurring Workflow + Time Series

### Zweck

Habits modellieren wiederkehrendes Verhalten. Sie können gesund, neutral, unerwünscht oder bewusst als Anti-Rot Action definiert sein.

### Bestandteile

- Verhalten,
- gewünschte Frequenz,
- Trigger oder Kontext,
- Minimum / Standard / Stretch,
- positiver oder unerwünschter Habit,
- Area-Bezug,
- Goal-Bezug,
- Logs,
- Streaks und Konsistenz,
- Ausnahmen,
- Pausen,
- Reflexion.

### Analysen

- Wochenrhythmus,
- Heatmap,
- Streak,
- Konsistenz,
- Tageszeit,
- Zusammenhang mit Mood, Sleep oder Goal-Fortschritt,
- Abbruchmuster,
- realistische Zielhäufigkeit.

### Produktregel

Keine Shame-Mechanik. Ausfälle werden als Daten und Lernsignal behandelt, nicht als Bestrafung.

---

## CAP-105 – Ideas / Incubator

**Typ:** Globale Entity + Maturation Workflow

### Zweck

Ideas sind längerlebige Möglichkeiten, die nicht sofort in einen Task, ein Project oder Goal umgewandelt werden müssen.

### Beispiele

- Spielidee,
- Paper-Thema,
- Forschungsfrage,
- App-Feature,
- persönliches Experiment,
- Coding-Tool,
- potenzielles Hobby,
- Kauf- oder Verbesserungsidee.

### Lebenszyklus

```text
Seed
→ Incubating
→ Candidate
→ Selected / Converted
→ Archived
```

### Bestandteile

- Kernidee,
- Motivation,
- Area,
- mögliche Wirkung,
- Aufwand oder Unsicherheit,
- verknüpfte Resources,
- Notizen,
- offene Fragen,
- nächster Review-Zeitpunkt,
- mögliche Conversion in Project, Goal, Resource oder Wishlist Item.

### Abgrenzung zu Inbox

```text
Inbox
→ ungeklärt und entscheidungsbedürftig

Idea
→ bewusst als Möglichkeit erhalten
```

---

# 7. Wissen, Ressourcen und persönliche Erinnerung

## CAP-201 – Resources als zentrale Wissensquelle

**Typ:** Globale Entity + Searchable Knowledge Base

### Zweck

Resources sind die zentrale Source of Truth für wiederverwendbares Wissen. Areas und Features sollen keine vollständig getrennten Resource-Datenbanken aufbauen, sondern gefilterte oder kuratierte Views derselben Resource-Basis nutzen.

### Resource-Typen

- Link,
- Website,
- Dokument,
- Paper,
- Buch,
- Artikel,
- Video,
- Kurs,
- Prompt,
- Code Snippet,
- Tool,
- Guide,
- Template,
- interne Information,
- Kontakt oder Anlaufstelle,
- Datei oder Attachment.

### Bestandteile

- Titel,
- Typ,
- Quelle/URL/Datei,
- Autor oder Anbieter,
- Zusammenfassung,
- eigene Notizen,
- Tags,
- Areas,
- verknüpfte Projects,
- Goals,
- Skills,
- Ideas,
- Work-/Education-Kontext,
- Status,
- Vertraulichkeit,
- Herkunft,
- Review Needed,
- Volltext oder extrahierter Inhalt, sofern erlaubt.

### Statusvorschlag

```text
Captured
→ Processing
→ Ready
→ Applied
→ Archived
```

### Wissenschaftliche Literatur

Literature ist ein spezialisierter Resource-Typ mit zusätzlichen Metadaten:

- Authors,
- Publication,
- Year,
- DOI,
- Citation,
- Research Topic,
- Evidence/Claim,
- Reading Status,
- Notes,
- verknüpfte Scientific Works.

### Prompts

Prompts können ebenfalls Resource-Typen sein, benötigen aber ggf. zusätzliche Felder:

- Zielmodell,
- Zweck,
- Variablen,
- Version,
- erwartetes Ergebnis,
- Testnotizen,
- Sicherheits-/Datenschutzhinweise.

### Search- und Retrieval-Anforderungen

- Volltextsuche,
- Tag- und Facettenfilter,
- Area-Filter,
- Typfilter,
- Beziehungen und Backlinks,
- gespeicherte Views,
- ähnliche Resources,
- Duplikaterkennung,
- Quellenangabe.

### Area Resource Dumps

Ein Education-, Work- oder Coding-Resource-Dump soll keine zweite Datenbank sein. Er ist eine gefilterte Collection oder View globaler Resources.

### Datenschutz

Work-Wissen kann vertraulich sein. Für Work Resources sind später getrennte Privacy-Regeln, AI-Einschränkungen und mögliche lokale Speicherung zu prüfen.

---

## CAP-202 – Notes, Wiki und interne Wissensseiten

**Typ:** Globale oder kontextgebundene Knowledge Entity

### Zweck

Resources sind nicht identisch mit eigenen Wissensseiten. Ein eigenes Wiki benötigt Notes oder Pages, die Informationen strukturieren und mehrere Resources zusammenführen können.

### Beispiele

- Work-Prozessbeschreibung,
- Framework-Erklärung,
- Forschungsentscheidung,
- Promotionsweg-Dossier,
- Projektentscheidung,
- Spielplan für Factorio,
- persönliche Erkenntnis,
- Trainingsprinzip.

### Beziehung

```text
Resource
→ Quelle oder Material

Note / Wiki Page
→ eigene strukturierte Darstellung

Summary
→ verdichtete Darstellung einer oder mehrerer Quellen
```

### Funktionen

- Markdown/Rich Text,
- Links und Backlinks,
- Attachments,
- Resource-Zitate,
- Versionierung,
- Area- und Entity-Links,
- Full-text Search,
- AI-Zusammenfassung mit Review.

---

## CAP-203 – Journal

**Typ:** Personal Record + Reflection

### Zweck

Journal hält persönliche Gedanken und Erlebnisse fest, die nicht als Task, Resource oder strukturierter Review behandelt werden sollen.

### Mögliche Formen

- freier Eintrag,
- Daily Journal,
- Mental-Health-Reflexion,
- Gratitude,
- Decision Journal,
- Dream Journal,
- Project Journal,
- Learning Journal.

### Beziehung zu Today und Review

- Today kann einen Journal-Ausschnitt oder Link enthalten.
- Review kann Journal-Einträge referenzieren.
- Journal bleibt inhaltlich eigenständig und muss nicht vollständig in strukturierte Felder zerlegt werden.

### Datenschutz

Journal- und Mental-Health-Daten gehören zu den sensibelsten Daten im System. AI-Zugriffe, Export, Backups und Sharing müssen besonders restriktiv behandelt werden.

---

# 8. Areas und fachliche Module

## AREA-001 – Education

**Typ:** Area / Context Layer

### Zweck

Education umfasst wissenschaftliche Arbeit, Forschung, akademische Entwicklung und die dafür benötigten Informationen, Resources und Skills.

### Erwartete Module

#### Scientific Work

- Masterarbeit,
- Paper,
- spätere Dissertation,
- Forschungsberichte,
- Exposés.

Eine Scientific Work kann eine spezialisierte Domain-Entity sein, die mit einem globalen Project verbunden ist:

```text
Project
→ Ausführung, Tasks, Status, Milestones

Scientific Work
→ akademische Metadaten, Kapitel, Methode, Literatur, Submission
```

Der Status darf nicht doppelt unabhängig gepflegt werden.

#### Literature

- wissenschaftliche Quellen,
- Reading Pipeline,
- Zitate,
- Claims/Evidence,
- Literature Notes,
- Verbindung zu Scientific Works.

Literature bleibt fachlich ein spezialisierter Resource-Typ.

#### Research Topics und Decision Dossiers

- Forschungsfragen,
- Themenideen,
- offene Fragen,
- Promotionsweg,
- Voraussetzungen,
- Bewerbungs- und Anmeldeinformationen,
- Pläne,
- Entscheidungsgrundlagen.

#### Education Skills

- wissenschaftliches Schreiben,
- Methodik,
- Statistik,
- Literaturarbeit,
- Präsentation,
- Tool-Skills.

#### Academic Activity / Study Log

- Lernsessions,
- Recherche,
- Schreibfortschritt,
- Meetings,
- Feedback,
- Einreichungen.

### Erwartete Analysen

- Fortschritt Scientific Work,
- Kapitel-/Milestone-Bewegung,
- Literaturstatus,
- Lernzeit,
- Skill Evidence,
- offene Entscheidungen,
- Review- und Feedback-Zyklen.

---

## AREA-002 – Work

**Typ:** Area / Context Layer

### Zweck

Work hält Arbeitsaufgaben, Fortschritt, Wissen, Learnings und berufliche Skills nachvollziehbar fest.

### Erwartete Module

- Work Tasks und Projects,
- Work Log,
- Follow-ups,
- Meeting Notes,
- persönliches Work Wiki,
- Prozesse und Systeme,
- Framework-/Programmiersprachen-Wissen,
- Learnings,
- Skills und Evidence,
- Achievement History,
- offene Fragen und Brain Dump,
- Resources.

### Work Log

Ein Work Log sollte beantworten:

- Was wurde an welchem Tag gemacht?
- Welche Ergebnisse wurden erzielt?
- Welche Blocker gab es?
- Welche Learnings entstanden?
- Welche Skills wurden angewandt oder entwickelt?
- Welche Follow-ups sind offen?

### Privacy Boundary

Work-Daten können Unternehmensinformationen enthalten. Später zu entscheiden:

- welche Inhalte überhaupt gespeichert werden dürfen,
- welche Daten nicht an externe AI-Dienste gelangen,
- ob bestimmte Collections lokal oder verschlüsselt bleiben,
- wie Export und Löschung funktionieren.

### Abgrenzung zu Coding

Work ist der berufliche Kontext. Coding ist die fachliche/technische Entwicklungs- und Portfolio-Area. Ein Coding Skill oder Resource kann in beiden erscheinen, bleibt aber kanonisch global.

---

## AREA-003 – Life als Area-Familie

**Typ:** Area-Kandidat / Umbrella Domain

### Zweck

Life soll Alltag, Gesundheit, Wohlbefinden, Fitness, Ernährung und Habits zusammenführen.

### Analyse

Der Begriff ist verständlich, aber sehr breit. Er kann als übergeordnete Area-Familie funktionieren. Für die spätere Navigation muss geprüft werden, ob ein einziger Life-Bereich zu viel Tiefe erzeugt oder ob Module wie Nutrition oder Health weiterhin eigenständig sichtbar bleiben.

Der Katalog behandelt Life zunächst als fachliche Familie, ohne die spätere Sidebar festzulegen.

---

### LIFE-301 – Mental Health und Mood

**Typ:** Domain Module + Sensitive Time Series + Journal Links

#### Funktionen

- Mood Meter,
- mehrere Mood Check-ins pro Tag,
- Intensität,
- Kontext und mögliche Auslöser,
- Gedanken und Notizen,
- Stress,
- Energie,
- Coping-/Recovery-Aktivitäten,
- Zusammenhang mit Sleep, Workload, Nutrition, Training oder Social Context,
- Journal-Verknüpfung,
- Trends und Reviews.

#### Analyseprinzip

Das System darf Zusammenhänge und Korrelationen zeigen, aber keine medizinische Kausalität behaupten.

```text
Beobachtung:
„An Tagen mit weniger als 6 Stunden Schlaf war die gemeldete Energie häufig niedriger."

Nicht:
„Wenig Schlaf verursacht deine mentale Belastung."
```

#### Datenschutz

Mental-Health-Daten sind besonders sensibel. AI-Analysen müssen nachvollziehbar, optional und bestätigungsgebunden sein.

---

### LIFE-302 – Sleep

**Typ:** Measurement Log + Narrative Record

#### Funktionen

- Schlafbeginn und Aufstehen,
- Dauer,
- subjektive Qualität,
- Unterbrechungen,
- Erholung,
- Dream Journal,
- luzides Träumen,
- Einflussfaktoren,
- geplante und tatsächliche Schlafzeiten,
- Trends.

#### Beziehungen

- Today,
- Mental Health,
- Training/Recovery,
- Habits,
- Nutrition,
- Calendar.

---

### LIFE-303 – Running

**Typ:** Planning + Session Log + Analytics

#### Funktionen

- Running Goals,
- Trainingsplan,
- geplante Runs,
- Strecke/Route,
- Distanz,
- Zeit,
- Pace,
- Herzfrequenz oder weitere importierte Werte,
- Belastung,
- subjektives Empfinden,
- Wetter/Schuhe optional,
- Personal Bests,
- Fortschrittsanalyse,
- Recovery und Verletzungshinweise,
- Calendar-Integration.

#### Analysen

- Wochenkilometer,
- Pace-Verlauf,
- Trainingshäufigkeit,
- Distanzverteilung,
- Belastung vs. Recovery,
- Goal-Fortschritt,
- Strecken- und Routinenvergleich.

---

### LIFE-304 – Strength / Muscle Training

**Typ:** Exercise Library + Plan + Session Log + Analytics

#### Funktionen

- Exercise Library,
- Muskelgruppen,
- Geräte und Equipment,
- Bewegungsmuster,
- Trainingspläne,
- Sessions,
- Sets, Reps, Gewicht, RPE/RIR,
- Intensität und Volumen,
- Muskelgruppen-Verteilung,
- Präferenzen und Prioritäten,
- Progression,
- Recovery,
- Calendar-Integration.

#### Persönliche Anforderungen

- Brust darf als ästhetischer Schwerpunkt sichtbar sein.
- Beine müssen im Verhältnis zum Running betrachtet werden.
- Muskelgruppen sollen nicht nur visuell, sondern anhand nachvollziehbarer Trainingsdaten bewertet werden.

#### Analysen

- Volumen je Muskelgruppe,
- Intensitätsverteilung,
- Übungsfrequenz,
- Progression,
- vernachlässigte Muskelgruppen,
- Überschneidung mit Running Load.

---

### LIFE-305 – Nutrition

**Typ:** Planning + Domain Database + Inventory + Time Series

#### Funktionen

- Meal Planning,
- Recipes,
- Ingredients,
- tatsächliche Meals,
- Nutrient Tracking,
- Makros und Mikronährstoffe,
- Gewicht und Goal-Bezug,
- Grocery List,
- Pantry/Food Inventory,
- Portions- und Mengenberechnung,
- Rezeptbilder,
- wiederverwendbare Gerichte,
- Wochenplanung,
- Verbrauchsschätzung,
- später Receipt Import/OCR.

#### Bidirektionaler Planungsflow

```text
Meal Plan
→ benötigte Ingredients
→ Grocery List
→ Pantry Update
```

und auch:

```text
Pantry / Einkauf
→ verfügbare Ingredients
→ mögliche Meals
→ Meal Plan
```

#### Datenbeziehungen

- Recipe verbraucht Ingredients,
- Meal referenziert Recipe oder freie Eingabe,
- Grocery Item kann aus Meal Plan entstehen,
- Purchase aktualisiert Pantry,
- Pantry-Bestand sinkt durch geplante oder bestätigte Meals,
- Nutrient Log unterstützt Goals und Analytics.

#### Inventory-Abgrenzung

Food Inventory ist ein spezialisiertes, verbrauchsorientiertes Inventory. Es kann gemeinsame Basiskonzepte mit dem persönlichen Inventory teilen, benötigt aber eigene Felder wie Menge, Einheit, Haltbarkeit und Verbrauch.

---

### LIFE-306 – Habits und Lifestyle

Habits gehören fachlich stark zur Life-Domain, bleiben aber zugleich globale Entities, weil auch Education-, Work- und Coding-Habits existieren.

Life kann gefilterte Habits anzeigen:

- Schlafroutine,
- Bewegung,
- Hydration,
- Meditation,
- Nutrition,
- Anti-Rot Actions,
- unerwünschte Habits,
- Recovery.

---

## AREA-004 – Coding

**Typ:** Area / Context Layer

### Zweck

Coding soll als zentrale Entwicklungs-Area sichtbar machen, was gebaut, gelernt, dokumentiert und bewiesen wurde.

### Erwartete Module

#### Coding Projects

Globale Projects mit Coding-Kontext:

- Repositories,
- Tech Stack,
- Releases,
- Issues/Tasks,
- Architekturentscheidungen,
- Ressourcen,
- Skills,
- Lessons Learned.

#### Coding Resources / Knowledge Base

Gefilterte Resource- und Wiki-Sicht für:

- Frameworks,
- Programmiersprachen,
- Architektur,
- Tools,
- Libraries,
- Snippets,
- Best Practices,
- Dokumentationen,
- Lernmaterialien.

#### Agents

- Agent Profiles oder Custom Agents,
- Agent Sessions,
- Prompts,
- Codebase Context,
- Review Needed,
- Follow-ups,
- Ergebnisse,
- Tool-/MCP-Kontext,
- Sicherheitsgrenzen.

Ob Agents später global in Command oder lokal unter Coding navigiert werden, bleibt eine IA-Entscheidung. Fachlich sind sie eng mit Coding verbunden, können langfristig aber auch Education, Work und Life unterstützen.

#### Portfolio

Portfolio ist eine kuratierte Projektion, keine zweite Project-Datenbank.

- ausgewählte Projects,
- Artefakte,
- Screenshots,
- Repositories,
- Rolle und Beitrag,
- verwendete Skills,
- Ergebnis,
- Lessons Learned,
- Veröffentlichungsstatus.

#### Coding Roadmap / Skill Map

Die Roadmap sollte langfristig kein rein linearer Kursplan sein, sondern ein Graph aus:

- Domains,
- Teilgebieten,
- Skills,
- Voraussetzungen,
- Resources,
- Learning Activities,
- Projects,
- Evidence,
- Stärken,
- Lücken,
- möglichen nächsten Pfaden.

Beispiele für Domains:

- Software Design,
- Frontend,
- Backend,
- Data,
- Cloud,
- DevOps,
- Testing,
- Security,
- Programming Languages,
- AI/Agents,
- Architecture.

### Zentrales Ziel

Nicht „alles programmieren können“, sondern eine nachvollziehbare Karte besitzen:

```text
Was existiert?
Was verstehe ich?
Was habe ich angewandt?
Wo habe ich Evidence?
Welche Lücken sind relevant?
Was wäre ein sinnvoller nächster Pfad?
```

---

## AREA-005 – Library / Media & Collections

**Typ:** Area-Kandidat / Personal Collection Domain

### Benennungskonflikt

Der Begriff `Library` kollidiert mit der zentralen Resource-/Knowledge-Datenbank. Für die spätere IA sollte ein eindeutigerer Name geprüft werden:

- Media,
- Collections,
- Leisure,
- Media & Games,
- Personal Library.

Im Katalog wird vorläufig `Media & Collections` verwendet.

### Zweck

Persönliche Medien, Entertainment und hobbybezogene Informationen sammeln, verfolgen und reflektieren.

### MEDIA-501 – Series und Films

- Backlog/Watchlist,
- aktuell gesehen,
- abgeschlossen,
- abgebrochen,
- Bewertung,
- Notizen,
- nächste interessante Titel,
- Empfehlungen,
- Plattform/Verfügbarkeit,
- Staffeln/Episoden optional,
- Watch History.

### MEDIA-502 – Games

- Backlog und Playing Status,
- Fortschritt,
- Ziele und Pläne pro Spiel,
- eigene Notes/Wiki,
- Builds oder Strategien,
- Factorio-/Satisfactory-Planung,
- CS-Routinen, Matches, Skills und Gedanken,
- Ressourcen,
- Spielzeit,
- Achievements optional.

Ein Game kann einen eigenen kontextuellen Workspace besitzen, ohne automatisch ein globales Project zu sein. Größere Vorhaben innerhalb eines Spiels können jedoch als Project verknüpft werden.

### MEDIA-503 – Books

- Reading List,
- aktuell gelesen,
- abgeschlossen,
- Bewertung,
- Notizen,
- Zitate,
- persönliche Entwicklung,
- verknüpfte Resources und Skills.

Ein Buch kann gleichzeitig Media Item und Resource sein. Die Systeme sollten verlinken statt duplizieren.

---

## AREA-006 – Inventory, Wishlist und Purchase Decisions

**Typ:** Asset Domain + Workflow

### INV-601 – Personal Inventory

#### Zweck

Persönlichen Besitz kategorisiert und auffindbar dokumentieren.

#### Kategorien

- Beauty,
- Technik,
- Gaming/PC,
- Küche,
- Fitness,
- Kleidung,
- Bücher/Medien,
- Möbel,
- Werkzeuge,
- sonstige persönliche Gegenstände.

#### Felder

- Item,
- Kategorie,
- Marke/Modell,
- Menge,
- Zustand,
- Standort,
- Kaufdatum,
- Preis,
- Garantie,
- Wartung,
- Verbrauch/Restmenge,
- Ablaufdatum bei Verbrauchsprodukten,
- Attachments/Belege,
- Notizen,
- Replacement Need,
- Archiv/Disposed.

### INV-602 – Wishlist

- gewünschtes Item,
- Motivation,
- Priorität,
- Preisziel,
- Kategorie,
- Alternativen,
- verknüpftes Goal,
- frühester Kaufzeitpunkt,
- Budgetbezug,
- Status.

### INV-603 – Comparison / Purchase Decision

Zwischen Wunsch und Kauf sollte ein eigener Entscheidungsworkflow möglich sein:

```text
Wishlist
→ Research
→ Kandidaten vergleichen
→ Entscheidung
→ optional Goal oder Project
→ Kauf
→ Inventory
```

Funktionen:

- Kandidaten,
- Kriterien,
- Gewichtung,
- Preis,
- Vorteile/Nachteile,
- Resources und Reviews,
- Entscheidung,
- Entscheidungsbegründung,
- späterer Outcome Review.

---

# 9. System, Motivation und Gamification

## SYS-701 – Profile

**Typ:** Account/Identity Settings

### Zweck

- Name,
- Profilbild,
- Rolle/Kontext,
- Zeitzone,
- Locale,
- optionale Bio,
- persönliche Präferenzen.

Health- und Gewichtsdaten gehören nicht primär ins Profil. Das Profil kann auf relevante Life-/Health-Einstellungen verweisen.

---

## SYS-702 – Settings

**Typ:** System Service / Configuration

### Bereiche

- Account,
- Profile,
- Appearance,
- Navigation Preferences,
- Notifications,
- Integrations,
- Calendar Sync,
- Data Sources,
- AI Settings,
- Privacy,
- Export/Backup,
- Security,
- Units und Locale,
- Archive/Retention.

---

## MOT-703 – Challenges

**Typ:** Motivation Workflow

### Zweck

Challenges bündeln zeitlich begrenzte Verhaltens- oder Leistungsziele.

### Funktionen

- erstellen,
- auswählen,
- Start/Ende,
- Regeln,
- Goal-/Habit-/Task-Verknüpfung,
- Progress,
- Check-ins,
- Abschluss,
- Review,
- optionale Belohnung.

### Abgrenzung

Challenges sind keine System-Einstellung. Sie gehören fachlich zu Motivation/Gamification und müssen später navigativ nicht zwingend unter System liegen.

---

## MOT-704 – Rewards / Shop

**Typ:** Motivation System

### Zweck

Spätere Gamification kann selbst definierte Belohnungen sichtbar und einlösbar machen.

### Funktionen

- Reward Catalog,
- Kosten in einer internen, nachvollziehbaren Einheit,
- Einlösebedingungen,
- Wishlist-Verknüpfung,
- Challenges/Goals als Quellen,
- Einlösehistorie,
- Limits und Regeln.

### Benennung

`Rewards` oder `Reward Store` ist wahrscheinlich klarer als `Shop`, da kein echter Handel gemeint ist.

### Produktregel

- keine Lootbox-Mechanik,
- keine manipulativen Dark Patterns,
- kein Shame Design,
- keine Belohnung, die Health-Ziele oder finanzielle Grenzen untergräbt.

---

# 10. Querschnittsfunktionen

## CROSS-801 – Analytics und Personal BI

**Typ:** Derived Intelligence Layer

### Zweck

Daten sollen nicht nur gespeichert, sondern über Zeit und Bereiche hinweg verständlich werden.

### Vier grundlegende Datentypen

#### Events

Etwas ist passiert:

- Task abgeschlossen,
- Project gestartet,
- Workout durchgeführt,
- Resource hinzugefügt,
- Review abgeschlossen.

#### Measurements

Ein Messwert wurde erhoben:

- Gewicht,
- Schlafdauer,
- Mood,
- Pace,
- Kalorien,
- Protein,
- Trainingsvolumen.

#### States

Ein Objekt befand sich in einem Zustand:

- Project active,
- Goal at risk,
- Skill practicing,
- Wishlist comparing.

#### Plans

Etwas sollte passieren:

- geplanter Task,
- Milestone,
- Meal,
- Workout,
- Learning Session.

Analytics soll Plan, Actual und Outcome unterscheiden können.

### Analyseebenen

#### Lokale Area Analytics

- Running Progress,
- Nutrition Trends,
- Scientific Work Progress,
- Work Activity,
- Coding Skill Evidence.

#### Cross-Area Analytics

- Monats- und Jahresfortschritt,
- Zeitverteilung,
- abgeschlossene Projects,
- erreichte Goals,
- entwickelte Skills,
- Habit Consistency,
- Mood/Sleep/Workload-Zusammenhänge,
- Plan-vs.-Actual,
- Review Trends.

### Berichte

- Daily,
- Weekly,
- Monthly,
- Quarterly,
- Yearly,
- Goal Report,
- Project Report,
- Skill Report,
- Area Report.

### BI-Grundregel für neue Features

Jede spätere Feature-Spezifikation sollte beantworten:

```text
Welche Daten schreibt das Feature?
Welche Daten liest es?
Welche Events entstehen?
Welche Messwerte entstehen?
Welche historischen Zustände müssen erhalten bleiben?
Welche Fragen sollen später analysiert werden können?
Welche Datenqualität und Herkunft liegt vor?
```

### Data Quality

- Missing Data sichtbar machen,
- manuelle vs. importierte Daten unterscheiden,
- Einheiten normalisieren,
- Zeitzone beachten,
- nachträgliche Korrekturen nachvollziehbar machen,
- Confidence bei AI/OCR-Imports speichern.

### Health- und Mental-Health-Regel

Analytics darf Beobachtungen und Korrelationen liefern, aber keine medizinischen Diagnosen oder unbelegten Kausalbehauptungen ableiten.

---

## CROSS-802 – Global Search, Filter und Command Palette

**Typ:** System Service

### Funktionen

- globale Suche über Entities und Inhalte,
- Full-text Search,
- Typfilter,
- Area-Filter,
- Zeitfilter,
- Statusfilter,
- Tags,
- gespeicherte Views,
- Recent Items,
- Quick Open,
- Quick Actions,
- Backlinks und Related Items.

Die Suche ist zentral, weil nicht jede wichtige Unterseite dauerhaft in der Sidebar stehen kann.

---

## CROSS-803 – Relationships und Knowledge Graph

**Typ:** System Service / Data Capability

### Zentrale Beziehungen

```text
Task → Project / Goal / Skill / Area / Calendar
Project → Goal / Skill / Resource / Area / Milestone
Goal → Metric / Project / Habit / Skill / Area
Skill → Resource / Project / Evidence / Course / Area
Resource → Note / Project / Goal / Skill / Area
Idea → Resource / Project / Goal / Area
Daily Record → alle Ereignisse und Messwerte des Tages
Review → Daily Records / Achievements / Open Loops
Inventory Item → Wishlist / Purchase Decision / Resource
```

### Anforderungen

- viele-zu-viele Beziehungen,
- Links und Backlinks,
- kanonische Entity-IDs,
- keine inhaltlichen Kopien pro Area,
- nachvollziehbare Herkunft.

---

## CROSS-804 – Activity Log, History und Provenance

**Typ:** System Service

### Zweck

Nachvollziehen, wann etwas erstellt, geändert, geplant, abgeschlossen, konvertiert oder von AI beeinflusst wurde.

### Mögliche Events

- created,
- updated,
- linked,
- scheduled,
- rescheduled,
- completed,
- reopened,
- converted,
- archived,
- AI suggested,
- AI generated,
- user confirmed,
- imported.

### Nutzen

- Today Recap,
- Review,
- Reports,
- AI Context,
- Audit,
- Wiederherstellung,
- Skill Evidence,
- Achievement Ledger.

---

## CROSS-805 – AI und Agent Assistance

**Typ:** Cross-cutting Service

### Mögliche Rollen

- Inbox Triage,
- Resource Extraction,
- Summaries,
- Project Breakdown,
- Goal Planning,
- Calendar Suggestions,
- Skill Inference,
- Daily/Weekly Reports,
- Research Assistance,
- Coding Agents,
- Data Quality Checks,
- Related-Item Discovery.

### Pflichtfelder und Governance

- source,
- generated_by,
- linked_context,
- review_needed,
- confidence,
- prompt/version optional,
- bestätigter Outcome.

### Grenzen

- keine autonome dauerhafte Änderung kritischer Daten ohne Review,
- keine ungeprüften Mental-Health- oder medizinischen Aussagen,
- keine unkontrollierte Work-Datenweitergabe,
- keine automatische Skill-Anerkennung ohne Evidence und Bestätigung,
- keine Calendar-Massenänderung ohne Vorschau.

---

## CROSS-806 – Integrations und Imports

**Typ:** System Service / Later Capability

### Erwartete Integrationen

- Outlook / Microsoft 365 Calendar,
- Google Calendar optional,
- Hyperskill,
- Fitness-/Health-Daten,
- Running Apps,
- Receipt OCR,
- GitHub/Repos,
- Browser Bookmarks,
- Files/Cloud Storage.

### Importregeln

- Quelle speichern,
- Duplikate erkennen,
- Zeitstempel erhalten,
- Confidence speichern,
- Vorschau vor dauerhafter Übernahme,
- Mapping transparent machen,
- Import rückgängig oder korrigierbar machen.

---

## CROSS-807 – Security, Privacy, Export und Backup

**Typ:** System Service

### Anforderungen

- nutzerspezifische Datenisolation,
- RLS in Phase 3,
- besonders restriktive Behandlung von Journal-, Mental-Health- und Work-Daten,
- keine Secrets im Client,
- Exportfähigkeit,
- Backup-Konzept,
- Soft Archive,
- Lösch- und Aufbewahrungsregeln,
- nachvollziehbare AI-Nutzung,
- optionale Integrationsberechtigungen.

---

# 11. Klare Abgrenzung: Task, Project, Goal, Skill, Habit und Challenge

| Objekt | Kernfrage | Abschlusskriterium | Typischer Inhalt | Beispiel |
|---|---|---|---|---|
| Task | Was ist die nächste konkrete Handlung? | Handlung erledigt | ein Schritt | „Kapiteloutline an Betreuer senden“ |
| Project | Welches endliche Ergebnis soll geliefert werden? | Deliverable/Outcome fertig | Tasks, Milestones, Phasen | „Masterarbeit schreiben“ |
| Goal | Welcher gewünschte Zustand soll erreicht werden? | Zielwert oder qualitative Kriterien erfüllt | Metrics, Milestones, Projects, Habits | „80 kg erreichen“ |
| Skill | Was soll zuverlässig angewendet werden können? | durch Evidence demonstriert | Lernen, Praxis, Resources, Projects | „Next.js sicher anwenden“ |
| Habit | Welches Verhalten soll regelmäßig stattfinden? | kein endgültiges Ende; Konsistenz | wiederkehrende Logs | „3× pro Woche laufen“ |
| Challenge | Welche zeitlich begrenzte Anforderung wird bewusst angenommen? | Regeln im Zeitraum erfüllt | Tasks/Habits/Goals | „30 Tage Daily Review“ |

### Beispielketten

```text
Goal: Pace X:XX erreichen
→ Project: 12-Wochen-10K-Trainingsblock
→ Habit: 3 Running Sessions pro Woche
→ Tasks/Workouts: Intervalltraining am Dienstag
→ Skill: Pacing und Running Technique
```

```text
Goal: Abschluss erreichen
→ Project: Masterarbeit schreiben
→ Milestones: Anmeldung, Methodik, Draft, Abgabe
→ Tasks: Literaturmatrix aktualisieren
→ Skills: Scientific Writing, Research Methodology
→ Resources: Papers, Guidelines, Templates
```

```text
Idea: Eigenes Spiel entwickeln
→ Project: Spiel-Prototyp bauen
→ Skills: Game Development, Architecture, UI
→ Resources: Engine Docs, Tutorials
→ Portfolio Item: veröffentlichter Prototyp
```

---

# 12. Source-of-Truth-Matrix

| Capability | Kanonische Daten | Was nur projiziert/aggregiert wird |
|---|---|---|
| Dashboard | keine eigene Fach-Entity | aktuelle Signale aus allen Modulen |
| Today | Daily Record für tagesbezogene Entscheidungen und Reflexion | Tasks, Sleep, Meals, Workouts, Mood, Activity |
| Calendar | freie Calendar Events und Zeitattribute an Entities | Tasks, Milestones, Workouts, Meals, Reviews |
| Inbox | Inbox Items | mögliche Zielobjekte und Vorschläge |
| Tasks | Tasks | Today-, Calendar-, Project- und Area-Views |
| Projects | Projects, Milestones, Project Decisions | Goal-, Area-, Portfolio- und Calendar-Views |
| Goals | Goals, Goal Metrics, Goal Milestones | Project-, Habit- und Analytics-Fortschritt |
| Skills | Skills, Evidence, Learning Activities | Project-, Course-, Work- und Portfolio-Belege |
| Resources | Resources und Resource Links | Area Resource Dumps, Skill-/Project-Collections |
| Review | Review Records | Achievements, Activity, Metrics und Reports |
| Analytics | optional gespeicherte Reports/Aggregate | Rohdaten aus allen kanonischen Quellen |
| Areas | Area-Definitionen und Zuordnungen | gefilterte Entity-Views |
| Inventory | Inventory Items | Wishlist, Vergleich und Area-Views |
| Portfolio | kuratierte Auswahl/Präsentationsmetadaten | bestehende Projects, Skills und Evidence |

---

# 13. Kritische Begriffs- und Strukturkonflikte

## 13.1 Resources vs. Library

Aktuell werden zwei verschiedene Bedeutungen gewünscht:

```text
Resources
→ zentrale Wissensdatenbank

Library
→ Serien, Filme, Games und Bücher
```

Diese Begriffe dürfen in der finalen IA nicht verwechselt werden. Empfehlung für die spätere Prüfung:

```text
Resources / Knowledge Base
und
Media & Collections
```

## 13.2 Life als sehr breite Area

Life bündelt Mental Health, Sleep, Running, Strength, Nutrition und Habits. Fachlich hängen diese Bereiche zusammen, besitzen aber sehr unterschiedliche Workflows und Datenmodelle.

Spätere Optionen:

1. Life als Oberbereich mit klaren Modulen,
2. Life als Navigationsgruppe mit eigenständigen Unterbereichen,
3. Health & Performance, Nutrition und Personal weiterhin getrennt,
4. hybride Lösung mit gemeinsamem Life Overview.

Der Katalog trifft diese Navigationsentscheidung noch nicht.

## 13.3 Review vs. Analytics vs. Reports

- Review ist menschliche Reflexion.
- Analytics ist berechnete Analyse.
- Report ist eine zeitbezogene Zusammenfassung.
- Achievement Ledger ist die nachvollziehbare Erfolgschronik.

Sie können in einer gemeinsamen Oberfläche zusammenkommen, sollten aber im Datenmodell getrennt bleiben.

## 13.4 Agents global oder unter Coding

Agents sind aktuell eng mit Coding verbunden, können später aber auch Education, Calendar, Inbox, Review und Life unterstützen. Fachlich ist daher ein globaler Service mit Coding-Schwerpunkt plausibel. Die Navigationsposition bleibt offen.

## 13.5 Tasks als Hauptnavigation oder sekundäre Workbench

Tasks sind fachlich unverzichtbar. Ob sie ein prominenter Hauptpunkt bleiben, hängt davon ab, wie oft globale Triage, Waiting, Backlog und Batch-Management genutzt werden.

## 13.6 Shop und Challenges unter System

Beide Funktionen gehören fachlich eher zu Motivation/Gamification als zu technischen Settings. Sie sollten im Katalog erhalten bleiben, aber später nicht automatisch unter System einsortiert werden.

---

# 14. Zusätzliche fachliche Empfehlungen

## 14.1 Jede Funktion braucht Schreib- und Leseregeln

Bei jeder späteren Page- oder Feature-Spezifikation sollte dokumentiert werden:

```text
Writes:
Welche kanonischen Daten werden erzeugt oder verändert?

Reads:
Welche Daten werden nur angezeigt?

Events:
Welche Aktivität wird protokolliert?

Metrics:
Welche Messwerte entstehen?

Relationships:
Welche Objekte können verknüpft werden?

AI:
Was darf vorgeschlagen, erzeugt oder zusammengefasst werden?

Privacy:
Wie sensibel sind die Daten?
```

## 14.2 Historie nicht durch aktuelle Werte überschreiben

Für BI und Recaps sind Zeitreihen und Statushistorien notwendig. Beispiele:

- Gewicht als Messreihe, nicht nur aktuelles Gewicht,
- Project-Statuswechsel als Events,
- Skill Evidence mit Datum,
- Goal-Fortschritt über Zeit,
- Inventory-Bewegungen,
- Planned vs. Actual bei Calendar und Today.

## 14.3 Evidence statt beliebiger Progress-Prozente

Projects können durch Milestones und Tasks Fortschritt ableiten. Goals nutzen Metrics oder Kriterien. Skills nutzen Evidence. Ein pauschaler Prozentwert ohne Begründung sollte vermieden werden.

## 14.4 Area-Seiten sollen keine Datensilos erzeugen

Education, Work, Life und Coding dürfen eigene Views, Workflows und Domain-Entities besitzen. Globale Entities wie Projects, Goals, Skills, Resources und Habits bleiben jedoch gemeinsam nutzbar.

## 14.5 Analytics lokal und übergreifend

Jede Area darf eigene Analytics enthalten. Zusätzlich benötigt das Zielprodukt eine cross-domain Auswertung für Monats-/Jahresberichte, Achievement History und Zusammenhänge.

## 14.6 Mental Health nicht als Diagnoseprodukt behandeln

Mood-, Sleep- und Journal-Daten können Muster sichtbar machen. Das Produkt sollte keine medizinische Bewertung vortäuschen und kritische AI-Ausgaben klar als Hinweise behandeln.

## 14.7 Portfolio ist kuratierte Evidence

Portfolio sollte nicht nur eine Liste von Coding Projects sein. Es verbindet ausgewählte Projects mit Skills, Artefakten, Outcomes und Lessons Learned.

## 14.8 Roadmaps als Graph statt starre Liste

Insbesondere Coding- und Skill-Roadmaps sollten später Voraussetzungen, alternative Pfade, Resources und Evidence abbilden. Ein strikt linearer Pfad wäre für den gewünschten Umfang zu grob.

---

# 15. Vorläufiger vollständiger Capability-Katalog

## Command und Zeit

- Dashboard
- Today / Daily Record
- Calendar
- Quick Thought
- Inbox
- Tasks
- Daily Planning
- Weekly Planning
- Activity Log

## Steering und Entwicklung

- Projects
- Project Milestones
- Project Phases
- Project Decisions
- Project Lessons Learned
- Goals
- Goal Metrics
- Goal Milestones
- Skills
- Skill Evidence
- Skill Maps / Roadmaps
- Habits
- Ideas / Incubator
- Challenges

## Wissen und Erinnerung

- Resources
- Literature
- Prompts
- Notes
- Wiki Pages
- Summaries
- Journal
- Decision Journal
- Dream Journal
- Search
- Tags
- Backlinks
- Collections

## Review und Intelligence

- Daily Review
- Weekly Review
- Monthly Review
- Yearly Review
- Project Review
- Goal Review
- Achievement Ledger
- Reports
- Area Analytics
- Cross-Area Analytics
- Plan-vs.-Actual
- AI Summaries
- Data Quality

## Education

- Scientific Works
- Masterarbeit
- Paper
- Dissertation später
- Literature Pipeline
- Research Topics
- Academic Decision Dossiers
- Study/Research Activity Log
- Academic Skills
- Education Resources

## Work

- Work Tasks und Projects
- Work Log
- Follow-ups
- Work Wiki
- Meeting Notes
- Work Resources
- Learnings
- Work Skills/Evidence
- Work Achievements

## Life / Wellbeing

- Mood
- Mental Health Notes
- Sleep
- Dream Tracking
- Running Plans
- Running Sessions
- Running Analytics
- Exercise Library
- Muscle Groups
- Strength Plans
- Strength Sessions
- Strength Analytics
- Recovery
- Health Metrics
- Habits / Anti-Rot Actions

## Nutrition

- Meal Plan
- Recipes
- Ingredients
- Meals
- Nutrient Logs
- Grocery List
- Food Inventory / Pantry
- Consumption Estimation
- Weight Relationship
- Receipt Import später

## Coding

- Coding Projects
- Repositories
- Coding Resources
- Codebase Notes
- Agents
- Agent Sessions
- Prompt Library
- Review Needed
- Portfolio
- Coding Skill Map
- Coding Resource Map
- Coding Roadmap
- Skill Evidence

## Media & Collections

- Series Tracker
- Film Tracker
- Watchlist
- Games Library
- Game Workspaces/Notes
- Matches/Routines bei geeigneten Games
- Books Tracker
- Reading Notes
- Personal Development Notes

## Inventory und Konsum

- Personal Inventory
- Categories
- Condition/Location
- Warranty/Maintenance
- Consumables
- Wishlist
- Product Comparisons
- Purchase Decisions
- Purchased-to-Inventory Flow

## System und Motivation

- Profile
- Settings
- Privacy
- Integrations
- Export/Backup
- Archive
- Challenges
- Rewards / Reward Store

---

# 16. Offene Entscheidungen für die spätere IA-Phase

1. Bleibt `Life` eine einzige sichtbare Area oder eine Obergruppe mehrerer Domains?
2. Wird Nutrition innerhalb von Life oder eigenständig navigiert?
3. Wie wird `Media & Collections` final benannt?
4. Bleibt Tasks ein Hauptnavigationseintrag?
5. Liegen Agents global, unter Coding oder an beiden Stellen als kanonische Route plus Kontextlink?
6. Wo werden Review, Analytics und Reports navigativ gruppiert?
7. Wird Resources als globale Hauptseite sichtbar oder primär über Suche und Area-Views erreicht?
8. Ist Ideas ein globaler Steering-Punkt oder eine sekundäre Funktion?
9. Wird Journal global oder innerhalb von Life/Personal sichtbar?
10. Wie wird der Calendar für interne Entities und externen Sync zum konsistenten Bearbeitungsort?
11. Welche Today-Daten werden gespeichert und welche live aggregiert?
12. Wie wird ein abgeschlossener Daily Record nachträglich korrigiert?
13. Welche Project Templates sind erforderlich und welche optional?
14. Wie werden qualitative Goals gemessen?
15. Wie wird Skill-Fortschritt aus Evidence berechnet?
16. Wie werden Work-Daten von externen AI-Services abgegrenzt?
17. Welche Health- und Mental-Health-Daten dürfen AI-Analysen verwenden?
18. Sind Challenges und Rewards eine eigene Motivationsschicht oder nur kontextuelle Features?
19. Welche Integrationen sind nach Phase 3 zuerst relevant?
20. Welche Funktionen müssen mobil vollständig nutzbar sein und welche dürfen desktop-first bleiben?

---

# 17. Empfohlener nächster Dokumentationsschritt

Dieser Katalog sollte vor einer Routen- oder Sidebar-Entscheidung geprüft und ergänzt werden.

Danach folgen getrennte Arbeitsschritte:

```text
1. Capability-Katalog freigeben
2. Begriffe und Entity-Grenzen festlegen
3. Areas und Domain-Module entscheiden
4. Source-of-Truth-Regeln finalisieren
5. Ziel-IA und Navigation entwerfen
6. Routenmodell erstellen
7. DATA_MODEL.md aktualisieren
8. PRODUCT.md und ROADMAP.md nachziehen
9. erst danach weitere statische Seiten implementieren
```

### Akzeptanzkriterien für diesen Katalog

- Alle erwarteten Funktionen sind erfasst.
- Doppeldeutigkeiten sind sichtbar markiert.
- Today, Calendar, Inbox und Review besitzen klare fachliche Rollen.
- Tasks, Projects, Goals, Skills und Habits sind unterscheidbar.
- Resources sind als zentrale Wissensquelle erfasst.
- Areas erzeugen keine unnötigen Datensilos.
- Analytics/BI ist als Querschnittsschicht berücksichtigt.
- AI-Agenten können später auf nachvollziehbare, verlinkte Daten zugreifen.
- Mental Health und Work Privacy sind ausdrücklich berücksichtigt.
- Inventory, Wishlist, Media, Challenges und Rewards gehen nicht verloren.
- Der Katalog legt noch keine voreilige Sidebar oder Routenstruktur fest.
