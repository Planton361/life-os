# Navigation and Source-of-Truth Blueprint

Stand: 2026-06-21
Status: Active
Zweck: Zielbild fuer Sidebar, Navigation, Routes und Datenwahrheiten.
Quelle der Wahrheit: `PRODUCT.md`, `DATA_MODEL.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `DESIGN.md` und `docs/product/pages-and-routes.md`.
Gilt fuer: sichtbare Navigation, Route-Zielbild, fachliche Einordnung von Bereichen.
Nicht gilt fuer: Implementierung, Komponenten, Supabase, Migrationen, Styling oder Dashboard-Layout.

## Grundsatz

```text
Dashboard = Steuerung
Bereichsseiten = Views auf kanonische Daten
Detailseiten = Tiefe
Archiv/Reports = Vergangenheit und Auswertung
```

Area-Unterseiten sind Views auf kanonische Daten. Sie duerfen keine Datensilos erzeugen. Tasks, Projects, Goals, Skills, Notes, Reviews, Work Logs, Health-Daten und Ressourcen behalten ihre fachliche Quelle und werden in Bereichen nur kontextuell angezeigt.

Dashboard V5 bleibt locked. Diese Navigation aktualisiert das Zielbild der App-Struktur, nicht das Dashboard-Layout.

## Sichtbare Sidebar

```text
HEADER
[Logo] Life OS · V5 / Linear Calm
Profile Avatar
Anton
Student · Werkstudent
Search / Command

PRIMARY
Dashboard
Inbox
Today
Calendar
Portfolio
Resources

PORTFOLIO EXPAND / HOVER
Tasks
Projects
Goals
Skills

HEALTH & FITNESS
Mental Health
Habits
Running Tracker
Strength Tracker

NUTRITION
Meal Planner
Recipes
Grocery

CODING
Repositories
Agents
Skill & Knowledge Map

LIFE
Journal
Notes
Entertainment
  - Games
  - Books
  - Series
  - Movies
Inventory

EDUCATION
Scientific Work
Literature
Learning Log

WORK
Work Log
Wiki

UTILITY
Shop
Challenges
Settings
```

Logo und `Life OS · V5 / Linear Calm` stehen im Sidebar/Header nebeneinander, nicht untereinander.

Portfolio und Entertainment sind expandierbare Navigationseintraege. Sie duerfen nicht nur per Hover funktionieren, sondern muessen auch per Klick und Tastatur bedienbar sein.

## Primary Navigation

Primary ist der operative Einstieg:

- Dashboard: zentrale Steuerung und V5-Command-Center.
- Inbox: Klaerung roher Eingaben.
- Today: Tagesarbeit und Tageskontext.
- Calendar: Zeit, Termine und zeitorientierte Planung.
- Portfolio: Sammel- und Steuerungsbereich fuer Tasks, Projects, Goals und Skills.
- Resources: sichtbarer zentraler Einstieg in die Wissens- und Ressourcen-Datenbank.

Resources bleibt sichtbar, weil Wissen, Quellen, Materialien, Referenzen und wiederverwendbare Ressourcen nicht in einer versteckten Sidebar-Gruppe verschwinden sollen.

## Portfolio

Steering wird in Portfolio umbenannt.

Portfolio bedeutet in Life OS nicht Coding Showcase. Portfolio ist der persoenliche Steuerungsbereich fuer:

- Tasks
- Projects
- Goals
- Skills

Portfolio buendelt operative Arbeit, aktive Vorhaben, Zielsteuerung und Skill-Aufbau. Es ist der Sammelbereich fuer das, was aktiv geplant, verfolgt oder verbessert wird.

## Review

Review ist kein sichtbarer Sidebar-Punkt.

Die alte sichtbare Navigation mit Knowledge, Reflection und Review als Sidebar-Gruppe wird nicht fortgefuehrt. Review bleibt fachlich als Capability erhalten, wird aber als Calendar-/Today-naher Panel- oder Side-View-Workflow eingeordnet.

Review umfasst weiterhin:

- Daily Review
- Weekly Review
- Review Records
- spaetere Reports

Bestehende interne Review-Routes koennen weiter als technische oder spaetere Detailpfade erwaehnt werden:

```text
/review/daily
/review/weekly
```

Diese Review-Routes sind nicht Teil der sichtbaren Sidebar.

## Health and Fitness

Sleep Log ist kein sichtbarer Punkt der Health-&-Fitness-Navigation.

Sleep bleibt fachlich als spaetere Datenquelle erhalten, insbesondere fuer:

- Mental Health
- Today
- Recovery
- Analytics

Sichtbar in Health & Fitness sind Mental Health, Habits, Running Tracker und Strength Tracker. Health-Unterseiten zeigen Daten im Kontext, erzeugen aber keine neuen kanonischen Silos.

## Coding

Coding Portfolio wird in Repositories umbenannt.

Repositories meint Code-Repositories und technische Arbeitskontexte. Damit bleibt Portfolio frei fuer Tasks, Projects, Goals und Skills und wird nicht als Coding Showcase missverstanden.

Coding umfasst sichtbar:

- Repositories
- Agents
- Skill & Knowledge Map

## Work

Follow-up ist kein sichtbarer Work-Navigationspunkt.
Meetings ist kein sichtbarer Work-Navigationspunkt. Meeting-Kontext bleibt fachlich erhalten, aber die Sidebar zeigt unter Work nur Work Log und Wiki.

Follow-ups werden fachlich innerhalb von Work Log, Tasks oder Meetings gefuehrt:

- Work Log: Ergebnis, Kontext, offene Schleifen.
- Tasks: konkrete naechste Schritte.
- Meetings: meetingbezogene Zusagen und Rueckmeldungen.

## Life and Entertainment

Entertainment ist ein expandierbarer Life-Unterpunkt.

Entertainment umfasst:

- Games
- Books
- Series
- Movies

Die Life-Navigation bleibt damit scanbar, ohne die Unterbereiche fuer Unterhaltung fachlich zu verlieren.

## Zielroutes

### Primary

```text
/dashboard
/inbox
/today
/calendar
/portfolio
/resources
```

### Portfolio

```text
/tasks
/projects
/goals
/skills
```

### Health & Fitness

```text
/health
/health/mental
/health/habits
/health/running
/health/strength
```

### Nutrition

```text
/nutrition
/nutrition/meal-planner
/nutrition/recipes
/nutrition/grocery
```

### Coding

```text
/coding
/coding/repositories
/coding/agents
/coding/skill-map
```

### Life

```text
/life
/life/journal
/life/notes
/life/entertainment
/life/entertainment/games
/life/entertainment/books
/life/entertainment/series
/life/entertainment/movies
/life/inventory
```

### Education

```text
/education
/education/scientific-work
/education/literature
/education/learning-log
```

### Work

```text
/work
/work/log
/work/wiki
```

### Utility

```text
/shop
/challenges
/settings
```

## Nicht-Ziele dieses Blueprints

- keine App-Routen erstellen
- keine React-/Next.js-Codeaenderungen
- keine Sidebar-Codeaenderung
- keine Dashboard-Aenderung
- keine Supabase-, DB- oder CRUD-Implementierung
- keine Migrationen
- keine Design-, Token- oder Tailwind-Aenderungen
