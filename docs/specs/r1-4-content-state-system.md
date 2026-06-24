Life OS – R1.4 Content State System & Zero-to-Live Readiness

## Ziel

Implementiere ein app-weites Content-State-System für Life OS.

Jede relevante Page, Section und jedes Widget muss drei gestaltete Inhaltszustände unterstützen:

1. `empty`
2. `partial`
3. `filled`

Diese Zustände müssen sich aus den tatsächlich vorhandenen Daten ergeben und dürfen nicht direkt an das Profil gekoppelt sein.

Profile bestimmen nur die Datenquelle:

- `demo` liefert Design-Fixtures
- `empty` liefert keine Nutzdaten
- `manual` startet leer und wird durch lokale Nutzereingaben gefüllt

Die visuelle V5-Struktur bleibt in allen Zuständen erhalten.

Das Ergebnis soll sich auch bei einem komplett neuen Nutzer vollständig, ruhig und produktionsreif anfühlen. Leere Seiten dürfen nicht wie Beta-, Debug- oder Fehlerzustände aussehen.

## Kritische Produktregel

Profile wechseln Daten.

Content States wechseln den Inhalt innerhalb einer bestehenden Komponente.

Weder Profile noch Content States dürfen die Seitenarchitektur oder das V5-Layout austauschen.

Richtig:

````text
Demo Profile:
V5 Shell + Demo-Daten

Empty Profile:
dieselbe V5 Shell + gestaltete Empty States

Manual Profile ohne Daten:
dieselbe V5 Shell + gestaltete Empty States

Manual Profile mit einigen Daten:
dieselbe V5 Shell + Partial State

Manual Profile mit ausreichenden Daten:
dieselbe V5 Shell + Filled State

Falsch:

Demo -> gestaltete Page
Empty -> generische Boundary Page
Manual -> technische No-data-Karten
Produkt- und Designwahrheit

Lies zuerst:

AGENTS.md
PRODUCT.md
DESIGN.md
ARCHITECTURE.md
DATA_MODEL.md
ACCESSIBILITY.md
ROADMAP.md
docs/data/profile-data-sources.md
docs/design/mock-to-real-design-parity.md
docs/qa/profile-switching-checklist.md
src/features/profile-data/**
bestehende Demo-Fixtures
alle betroffenen Page- und Widget-Komponenten

V5 bleibt visuelle Wahrheit.

Dashboard:

Today Agenda und Daily Control bleiben P0
Command Center, Quick Thought, Mood, Habits und Active Portfolio bleiben P1
Health und Nutrition bleiben P2
Time Progress, Anti-Rot und Challenges bleiben P3
keine Grid-Neukomposition
keine Widget-Größen willkürlich verändern
keine Cards entfernen, nur weil ihre Daten leer sind
Nicht tun
keine Supabase-Anbindung
keine Migrationen
keine Tabellen
keine Auth-Architektur
keine Remote-Kommandos
keine neue Dashboard-Richtung
keine V5-Layoutänderung
keine Demo-Fixtures löschen
keine Demo-Fixtures außerhalb des demo-Profils anzeigen
keine generische Boundary Page als Ersatz für gestaltete Seiten
keine wiederholten No local data-Karten
keine technischen Texte wie Manual local profile als Page-Titel
keine Fakewerte, um eine Card gefüllt erscheinen zu lassen
keine stillen Demo-Fallbacks
keine neue KI-Automation
keine vollständigen Analytics-Engines
keine Calendar-Sync-Integration
Arbeitsmodus

Dieser Auftrag ist ein Epic und muss sequenziell umgesetzt werden.

Reihenfolge:

State-System definieren
Route-/Widget-Matrix erstellen
Shared State-Primitives einführen
Dashboard umsetzen
Core Pages umsetzen
Area Pages umsetzen
Manual-Create-Flows absichern
Empty/Partial/Filled testen
Live-Test-Readiness dokumentieren

Wenn der gesamte Scope nicht in einem Lauf sicher abgeschlossen werden kann:

keine halbfertigen generischen Ersatzseiten einbauen
unveränderte Seiten lieber unangetastet lassen
exakt dokumentieren, welche Routen noch offen sind
keine Route als fertig markieren, bevor Empty, Partial und Filled geprüft wurden
1. Content-State-Modell definieren

Führe einen verbindlichen Content-State-Vertrag ein.

Beispiel:

export type ContentState = "empty" | "partial" | "filled";

export type ContentStateMeta = {
  state: ContentState;
  itemCount: number;
  capacity?: number;
  hasPrimaryValue?: boolean;
  hasHistory?: boolean;
};

Loading und Error sind separate technische Zustände:

export type AsyncState =
  | "idle"
  | "loading"
  | "success"
  | "error";

Loading/Error dürfen nicht mit empty verwechselt werden.

Definition empty
keine fachlichen Nutzdaten für diese Section
Shell und Widget bleiben sichtbar
höchstens ein natürlicher Empty State pro Collection-Section
keine Wiederholung von technischen Placeholder-Cards
klare nächste Aktion, falls die Funktion schon existiert
Definition partial
mindestens ein echter Eintrag
Kapazität oder gewünschte Dichte noch nicht erreicht
vorhandene Einträge nutzen dieselben Cards wie Demo
Add-Tile oder CTA bleibt sichtbar
Counter zeigt z. B. 1/8
Definition filled
vorgesehene Dashboard-Kapazität erreicht
Add-Tile wird ausgeblendet oder deaktiviert
mehr Daten bleiben auf der Area-/Detailseite erreichbar
Dashboard wird nicht durch zusätzliche Items erweitert
Page-Level First Run

Wenn alle primären Sections einer Page empty sind, darf die Page zusätzlich einen dezenten First-Run-Hinweis zeigen.

Der First-Run-Hinweis:

ersetzt nicht die Page-Shell
ersetzt nicht die Sections
nennt maximal 1–3 nächste Aktionen
wirkt nicht wie ein Setup-Wizard, sofern keiner nötig ist
verschwindet, sobald erste relevante Daten existieren
2. State-Pattern-Typen definieren

Nicht jede Section bekommt denselben Empty State.

Ordne jedes Widget einem State Pattern zu.

A. Fixed Slot Pattern

Für semantisch feste Plätze.

Beispiele:

Breakfast / Lunch / Dinner
Habit Tracker mit maximal 8 Plätzen
Active Portfolio mit maximal 4 Plätzen
sichtbare Challenges
Anti-Rot Actions

Verhalten:

Slots bleiben gestalterisch erhalten
leere Slots zeigen eine passende neutrale Variante
keine technischen No data-Texte
Partial State füllt Slots von links nach rechts
Add-Tile wandert an die nächste freie Stelle
Filled State blendet Add-Tile aus
B. Collection Pattern

Für variable Listen.

Beispiele:

Inbox Queue
Resources Library
Activity Stream
Journal Entries
Notes
Sessions

Verhalten:

bei 0 Items genau ein Empty State pro Collection
nicht einen Placeholder pro ehemaligem Demo-Item rendern
Partial/Filled nutzen dieselbe Row-/Card-Komponente wie Demo
sichtbare Items bleiben auf die jeweilige UI-Kapazität begrenzt
Overflow führt auf die Detailansicht
C. Metric / Trend Pattern

Für Einzelwerte und Trends.

Beispiele:

Sleep
Review Status
Nutrition Status
Weight
Running Metrics
Mood Signal

Verhalten:

unbekannter Wert ist nicht automatisch 0
0 nur anzeigen, wenn es fachlich ein echter Nullwert ist
sonst No data, — oder passender neutraler Wert
Partial: Primärwert vorhanden, aber noch kein Trend
Filled: Primärwert plus Verlauf/Trend
D. Timeline / Calendar Pattern

Beispiele:

Today Agenda
Calendar
Today Activity Stream
Health Schedule

Verhalten:

Zeitraster bleibt erhalten
keine Fake-Termine
keine Placeholder-Termine pro Slot
Empty State liegt innerhalb des Kalenders
echte Einträge nutzen exakt dieselben Calendar-Event-Komponenten wie Demo
Datum, Startzeit, Dauer und Area-Farbe werden korrekt abgebildet
E. Chart / Visualization Pattern

Beispiele:

Mood Pattern
Sleep Rhythm
Running Trend
Habit Heatmap

Verhalten:

Chart-Shell darf erhalten bleiben
keine erfundenen Werte
Empty State darf als neutrale Achse/Baseline plus kurze Erklärung erscheinen
keine zehn No local data-Labels in einem Chart
Partial State zeigt vorhandene Datenpunkte und offene Bereiche neutral
Filled State entspricht der Demo-Komposition
F. Inspector / Detail Pattern

Beispiele:

Inbox Active Item
Resource Relation Inspector
Portfolio Selected Entity
AI Assistant Panel

Verhalten:

kein ausgewähltes Item: ein ruhiger Nichts ausgewählt-State
keine Demo-Entity im Empty/Manual-Profil
bei Auswahl: dieselbe Inspector-Komponente wie Demo
3. Route- und Widget-State-Matrix erstellen

Erstelle:

docs/design/content-state-system.md
docs/design/page-widget-state-matrix.md
docs/qa/content-state-live-test-checklist.md

Dokumentiere für jede normale Route:

Route
Page Shell
Section / Widget
State Pattern
Empty Design
Partial Design
Filled Design
Capacity
CTA
Manual Create Flow
Demo Fixture Source
Manual Data Source
Same item component for demo/manual: yes/no
Current status
Required changes

Mindestens prüfen:

Core
/dashboard
/inbox
/today
/calendar
/tasks
/projects
/goals
/portfolio
/review/daily
Resources
/resources
Health
/health
/health/mental
/health/habits
/health/running
/health/strength
Nutrition
/nutrition
/nutrition/meal-planner
/nutrition/recipes
/nutrition/grocery
Coding
/coding
/coding/repositories
/coding/agents
/coding/skill-map
/coding/knowledge
Life
/life
/life/journal
/life/notes
/life/entertainment
/life/entertainment/games
/life/entertainment/books
/life/entertainment/series
/life/entertainment/movies
/life/inventory
Education
/education
/education/scientific-work
/education/literature
/education/learning-log
Work
/work
/work/log
/work/wiki
Other
/shop
/challenges
/settings
4. Gemeinsame State-Primitives einführen

Erstelle nur kleine, designneutrale Primitives.

Mögliche Bausteine:

<SectionEmptyState />
<AddSlotTile />
<EmptyMetricValue />
<EmptyChartFrame />
<PageFirstRunNotice />
<EmptyInspectorState />

Diese Komponenten dürfen keine komplette Page-Komposition erzwingen.

Sie liefern nur wiederverwendbare interne Zustände.

Anforderungen:

V5 Tokens verwenden
matte Flächen
1px Borders
ruhige Microcopy
sichtbarer Fokus
Keyboard-Navigation
ausreichender Kontrast
keine Information nur durch Farbe

Jede relevante Section erhält QA-Attribute:

data-content-state="empty|partial|filled"
data-item-count="0"
data-capacity="8"
data-profile-id="demo|empty|manual"
5. Dashboard-Zustände
5.1 Command Center

Die Ansprache bleibt immer erhalten:

Good morning, Anton
Good afternoon, Anton
Good evening, Anton

Wenn noch kein Anzeigename gesetzt wurde:

Good morning, User

Darunter bleibt:

aktuelles Datum
Work / Study Day oder bestehende Tagesklassifikation

Das aktive Datenprofil gehört in:

Sidebar-Profilbereich
Settings

Nicht als Dashboard-H1:

Manual local profile
Empty profile
Sleep Metric

Empty:

No data
Tracke deinen Schlaf

Partial:

letzter Schlafwert
noch kein ausreichender Trend

Filled:

aktueller Wert
Ziel-/Trendanzeige wie Demo
Review Status

Empty:

No review
Start Capturing

Partial:

Review begonnen / offene Punkte

Filled:

Review abgeschlossen oder klarer Status
Nutrition

Empty:

No plan
Create Plan

Partial:

einige Mahlzeiten geplant/geloggt

Filled:

vollständiger Tagesplan entsprechend der vorgesehenen Slots
5.2 Quick Thought

Quick Thought muss im manual-Profil funktional sein.

Anforderungen:

Textarea beschreibbar
Typ auswählbar: Task / Note / Question / Loop / Agent, soweit aktuell vorgesehen
Capture erzeugt einen echten lokalen Inbox-Eintrag
Erfolgsmeldung
Inbox Count aktualisiert sich
/inbox zeigt den Eintrag
Reload erhält den Eintrag

demo bleibt Design-Referenz und wird nicht mutiert.

empty bleibt der kanonische leere Referenzzustand.

Falls Capture in demo oder empty angeklickt wird:

kein stilles Schreiben
ruhiger Hinweis, zum manual-Profil zu wechseln
5.3 Daily Control

Empty ohne Tasks:

Current Task bleibt als gestaltete Card sichtbar
CTA:
Create task

Partial mit Tasks, aber ohne aktive Task:

Choose task

Filled mit aktiver Task:

gleiche Darstellung wie Demo
Continue/Open Task

Nicht:

Open tasks

als primärer Empty-State-CTA.

5.4 Time Progress

Time Progress ist systembasiert und unabhängig vom Datenprofil.

Anzeigen:

Week
Month
Year

Werte werden aus dem aktuellen Datum berechnet.

Keine Fixture-Zahlen.
Keine profilabhängigen Werte.
Kein Day-Ersatz.

5.5 Mood Check

Der Widget-Hintergrund und Akzent passen sich semantisch an den gewählten Mood an.

Beispiele:

Calm: ruhiger Cyan-/Teal-Ton
Focused: Blau
Content/Happy: Grün oder passender positiver Token
Tired: gedämpfter neutraler Ton
Anxious/Stressed: Orange/Rot
Empty: neutral

Farbe ergänzt weiterhin Text und ist nicht die einzige Zustandsinformation.

5.6 Meals Today

Meals Today behält drei feste Meal-Cards:

Breakfast
Lunch
Dinner

Jeder Meal-Slot hat einen eigenen Zustand:

"unplanned" | "planned" | "logged" | "skipped"
Unplanned
Card bleibt im Mock-Design
neutraler Bild-/Thumbnail-State
Titel:
Keine Mahlzeit
CTA: Planen oder Erfassen
Skipped
klar von unplanned unterscheidbar
z. B. Ausgelassen
kein Bild eines Gerichts
keine falschen Makros
Planned / Logged
exakt dieselbe Meal-Card wie Demo
echte Werte/Recipe/Meal-Daten

Widget State:

0 geplante/geloggte Slots: empty
1–2 Slots: partial
3 Slots entschieden: filled
5.7 Today Agenda

Today Agenda bleibt ein echter Day Calendar.

Anforderungen:

Stundenachse bleibt
Tasks mit Zeit werden im korrekten Slot platziert
Tasks ohne Zeit liegen nicht fälschlich oben im Kalender
Datum, Startzeit und Dauer funktionieren
Task 20:00–20:30 liegt im Slot 20:00–20:30
Area-Zuordnung bestimmt die semantische Event-Farbe
Event-Komponente ist für Demo und Manual identisch
Task öffnet die Task-Detailansicht
Empty State liegt innerhalb des Kalenderrasters
Kalendergröße und Widget-Größe bleiben in Empty/Partial/Filled stabil
5.8 Habit Tracker

Habit Tracker gilt als Referenzmuster.

Kapazität:

maximal 8 sichtbare Habits

Empty:

nur Add-Habit-Tile
Counter 0/8

Partial:

reale Habit-Cards
Add-Habit-Tile an der nächsten freien Position
Counter z. B. 3/8

Filled:

8 Habit-Cards
Counter 8/8
Add-Tile verschwindet

Manual-Habits müssen dieselbe Habit-Card wie Demo verwenden.

5.9 Active Portfolio

Kapazität:

maximal 4 sichtbare Portfolio-Cards

Empty:

Add-Project-Tile
optional Add-Goal über View-Switcher
Counter 0/4

Partial:

echte Project-/Goal-Cards
Add-Tile an nächster freier Position
gleiche Card-Komponenten wie Demo

Filled:

4 Cards
Add-Tile verschwindet
zusätzliche Entities bleiben auf /portfolio
5.10 Anti-Rot Actions

Empty:

Widget-Shell bleibt
kompakte CTA zu /health/habits
kein großer generischer No-data-Block

Partial/Filled:

ausgewählte Anti-Rot-/Reset-Actions aus Habits
gleiche Cards wie Demo

Konfiguration erfolgt auf der Habits-Seite.
Im Dashboard werden nur ausgewählte Actions gezeigt.

5.11 Challenges

Empty:

Widget-Shell bleibt
CTA zu /challenges
keine Fake-Challenges

Auf /challenges:

lokale Challenges anlegen
Rhythmus: daily / weekly / monthly
Challenge-Pool pflegen

Dashboard-Auswahl:

stabil pro Periode
darf nicht bei jedem Reload neu wechseln
falls Auswahlalgorithmus nötig ist: deterministisch anhand Profil + Periodenstart
sichtbare Kapazität aus bestehender Demo-Struktur übernehmen
6. Inbox-Zustände
Linke Spalte / Inbox Queue

Empty:

Spaltenstruktur bleibt
Filter/Tabs bleiben
klarer visueller Empty State:
Inbox ist leer.
Gedanken, Aufgaben und Fragen erscheinen hier nach dem Capture.
Quick Capture bleibt verfügbar

Nicht:

komplett leere Fläche
mehrere Placeholder-Items

Partial/Filled:

echte Inbox Rows
gleiche Row-Komponente wie Demo
Active Item / Mittlere Spalte

Kein ausgewähltes Item:

Kein Inbox-Eintrag ausgewählt.
Wähle links einen Eintrag aus oder erfasse einen neuen Gedanken.

Nicht die gesamte Spalte entfernen.

AI Assistant / Suggested Planning

Shell und Feldstruktur der Demo bleiben erhalten.

Ohne auswählbaren Kontext:

Area: —
Priority: —
Effort: —
Energy: —

Zusatz:

Noch keine Empfehlung möglich.

Keine erfundenen AI-Vorschläge.

Decision Checklist

Demo-Design bleibt.

Empty:

alle Schritte ungefüllt
Counter 0/4
keine Demo-Schritte als erledigt markieren

Mit echtem Inbox Item:

Status ausschließlich aus realem Item-/Workflow-Zustand ableiten
7. Today-Zustände
Page-Level First Run

Wenn noch nichts für den Tag erfasst wurde:

Für heute wurde noch nichts erfasst.
Starte mit einem Task, einem Inbox-Eintrag oder dem Opening Review.

Dieser Hinweis bleibt kompakt und ersetzt nicht die Page.

Opening Review

Demo-Shell bleibt.

Empty:

Mood: Not set
Energy: Not set
Focus: Not set
CTA: Start opening review

Partial/Filled:

echte Werte in denselben Cards
Activity Stream

Empty:

Timeline-/Stream-Shell bleibt
ein zentraler Empty State
keine künstlichen Timeline-Items

Partial/Filled:

echte Tasks, Inbox Items, Calendar Blocks und Logs
gleiche Stream-Card-Komponenten wie Demo
Delta Summary / Decisions / Artifacts

Empty:

Struktur bleibt
echte 0 nur bei echten Zählwerten
keine Demo-Entscheidungen
keine technischen Placeholder-Listen
Closing Review

Empty:

vorhandene Cards bleiben
Not saved oder Not started
CTA: Start daily review

Partial/Filled:

echte Review-Werte
8. Resources-Zustände

Die Resources-Page darf nicht überall wiederholen, dass keine Ressourcen existieren.

Shell bleibt:

Page Header
Summary Metrics
Quick Capture
Search/Filter
Main Library
Relation Inspector
Review Queue
Recent Learnings
Empty

Summary Metrics:

echte 0 oder —
keine No local entry 1..6

Main Library:

Noch keine Ressourcen gespeichert.
Speichere einen Artikel, ein Paper, eine Notiz oder einen Prompt.

Relation Inspector:

Keine Ressource ausgewählt.

Review Queue:

Keine Ressourcen zur Prüfung.

Recent Learnings:

Noch keine Learnings gespeichert.

Quick Capture bleibt funktional, sobald Manual Resource Create im aktuellen Scope existiert.

Partial/Filled
echte Resource Rows nutzen dieselbe Komponente wie Demo
Detail-/Inspector-Daten stammen aus dem ausgewählten echten Item
sichtbare Item-Grenze bleibt erhalten
weitere Einträge über Detailansicht
9. Weitere Area Pages

Übertrage dasselbe System auf alle Routen der State-Matrix.

Regeln:

Page Shell bleibt
Section Header bleiben
Tabs/Filter bleiben, wenn sinnvoll
keine wiederholten Placeholder-Cards
genau ein natürlicher Empty State pro Collection-Section
Fixed Slots dürfen leere Slot-Cards behalten
Charts dürfen neutrale leere Visualisierungen behalten
echte Manual Items verwenden dieselben Komponenten wie Demo Fixtures
keine technische Profil-Copy innerhalb fachlicher Cards

Besonders prüfen:

Health Overview
Mental Health
Habits
Running
Strength
Nutrition Overview
Meal Planner
Recipes
Grocery
Coding Overview
Repositories
Agents
Skill Map
Knowledge
Life Overview
Journal
Notes
Entertainment
Games
Books
Series
Movies
Inventory
Education
Scientific Work
Literature
Learning Log
Work
Work Log
Wiki
Shop
Challenges
10. Funktionale Live-Test-Readiness

Der Manual-Flow startet komplett leer.

Jeder sichtbare aktive Add-/Create-/Capture-Button muss:

eine echte lokale Manual-Mutation ausführen, oder
auf eine existierende funktionale Create-Page führen

Keine toten Buttons.

Mindestens funktional:

Quick Thought -> Inbox
Inbox Quick Capture
Task Create
Task mit Datum/Uhrzeit/Dauer
Task mit Area-Zuordnung
Project Create
Goal Create
Habit Create
Habit für Dashboard auswählen
Meal Slot planen/erfassen
Mood Check setzen
Opening Review starten
Daily Review starten
Challenge Create
Challenge-Rhythmus wählen
Anti-Rot/Habit-Auswahl konfigurieren

Erweitere den lokalen Manual Store nur soweit nötig.

Keine Supabase-Anbindung.

11. State- und Profiltests

Erstelle oder erweitere:

tests/e2e/content-state-system.spec.ts
bestehende Profile-/Dashboard-/Core-Tests

Prüfe mindestens:

Demo
Design-Fixtures sichtbar
filled-State
V5-Komposition unverändert
Empty
keine Demo-Strings
alle Page-/Widget-Shells vorhanden
natürliche Empty States
keine wiederholten No-data-Cards
keine Layout-Kollapse
Manual Reset
entspricht fachlich dem Empty State
ist beschreibbar
Create-Flows funktionieren
Manual Partial

Erzeuge:

1 Task
1 Inbox Item
1 Project
1 Habit
1 Meal Slot

Prüfe:

data-content-state="partial"
Add-Tiles stehen an nächster Position
Item-Komponenten entsprechen Demo
Manual Filled

Erzeuge bis zur jeweiligen UI-Kapazität:

8 Habits
4 Portfolio Items
alle 3 Meal Slots
mehrere Calendar Tasks

Prüfe:

data-content-state="filled"
Add-Tiles verschwinden
Widget wächst nicht unkontrolliert
zusätzliche Daten gehören auf Detailseiten
12. Design- und Screenshot-QA

Erzeuge manuelle QA-Screenshots für:

Demo Filled
Empty
Manual Empty
Manual Partial
Manual Filled

Mindestens für:

Dashboard
Inbox
Today
Resources
Health
Nutrition
Portfolio

Desktop:

2560 × 1440
1440 × 900

Mobile:

vorhandener Projektstandard oder ca. 390 × 844

Keine fragilen Pixel-Golden-Tests.

Strukturell testen:

dieselben Widget-Shells über alle States
dieselben Grid-Bereiche
stabile Min-Heights
keine unerwarteten Layout Shifts
keine Hydration Errors
keine horizontalen Overflows
Focus/Keyboard funktionieren
13. Copy-Regeln

Nicht verwenden:

No local entry 1
No local data
Manual-Profil: Noch keine lokalen Daten
Manual local profile
Profile Boundary
Not wired

innerhalb normaler fachlicher UI, sofern eine gestaltete Fachseite existiert.

Erlaubte kurze Copy:

Noch keine Einträge.
Noch keine Routinen erfasst.
Noch keine Ressourcen gespeichert.
Noch keine Mahlzeit geplant.
Noch kein Review begonnen.
Noch kein aktueller Fokus.

Exakte Dashboard-Copy aus diesem Auftrag hat Vorrang.

14. Dokumentation

Erstelle oder aktualisiere:

docs/design/content-state-system.md
docs/design/page-widget-state-matrix.md
docs/data/profile-data-sources.md
docs/design/mock-to-real-design-parity.md
docs/qa/content-state-live-test-checklist.md
docs/qa/profile-switching-checklist.md

Verbindliche Regel:

Demo fixtures define content examples, not layout.

Empty, partial and filled are first-class product states.

The same Page Shell, Widget Shell and Item Component must be used
for demo and manual data.

A new user starting with zero data must see a deliberate,
complete and actionable product, not a debug or beta state.
15. Validierung

Führe aus:

git status --short --untracked-files=all
git diff --check
pnpm lint
pnpm exec tsc --noEmit --incremental false
pnpm qa:dashboard
pnpm test:e2e
pnpm build

Falls separate Tests ergänzt wurden:

pnpm exec playwright test tests/e2e/content-state-system.spec.ts
pnpm exec playwright test tests/e2e/profile-boundary.spec.ts

Manuell vergleichen:

localhost:3000      -> demo
127.0.0.1:3000      -> manual oder empty

Prüfe, dass nur Inhalte wechseln, nicht die visuelle Architektur.

Akzeptanzkriterien
empty, partial und filled sind app-weit definierte Produktzustände.
Zustände werden aus Daten abgeleitet, nicht aus dem Profilnamen.
Ein neues Manual-Profil startet vollständig leer, wirkt aber produktionsreif.
Widgets werden bei Empty nicht entfernt oder willkürlich verkleinert.
Keine wiederholten technischen No-data-Cards.
Demo und Manual verwenden dieselben Item-Komponenten.
Ein neuer Manual-Eintrag sieht aus wie ein entsprechender Demo-Eintrag.
Quick Thought speichert ins Manual-Inbox-System.
Task-Zeit und Area-Farbe funktionieren in Today Agenda.
Habit Tracker unterstützt 0–8 mit Add-Tile-Logik.
Active Portfolio unterstützt 0–4 mit Add-Tile-Logik.
Meals Today unterstützt Breakfast/Lunch/Dinner inklusive unplanned/skipped.
Time Progress ist systembasiert.
Mood Card passt ihren Hintergrund semantisch an.
Inbox hat natürliche Empty-/Selection-/AI-States.
Today hat Opening-, Stream- und Closing-States.
Resources wiederholt nicht überall denselben Empty-Text.
Jeder sichtbare aktive Create-/Add-/Capture-Button funktioniert.
Demo-Fixtures erscheinen nur im Demo-Profil.
Keine Supabase-/Migration-/Auth-Arbeit.
Keine V5-Grid-Neukomposition.
Keine Hydration Errors.
Dashboard-QA, E2E und Build sind grün.
Abschlussbericht

Bitte am Ende exakt berichten:

Erstellt:
Geändert:
Nicht geändert:
Validierung:
State System:
Route/Widget Matrix:
Dashboard:
Command Center:
Quick Thought:
Daily Control:
Time Progress:
Mood:
Meals:
Today Agenda:
Habit Tracker:
Active Portfolio:
Anti-Rot/Challenges:
Inbox:
Today:
Resources:
Other Area Pages:
Manual Create Flows:
Empty State:
Partial State:
Filled State:
Design Parity:
Screenshot QA:
Live-Test Readiness:
P0-Blocker:
P1-Friktion:
P2/P3 Later:
Offene Punkte:
Risiken:
Empfohlener nächster Schritt:


## Einordnung

Der entscheidende Fortschritt gegenüber den bisherigen Prompts ist:

```text
Nicht mehr:
„Entferne Mockdaten und zeige Empty States.“

Sondern:
„Definiere pro Widget einen stabilen Empty-, Partial- und Filled-State,
bei unveränderter V5-Shell und identischen Item-Komponenten.“
````
