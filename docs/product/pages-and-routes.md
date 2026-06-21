# Pages and Routes

Stand: 2026-06-21
Status: Active
Zweck: Operative Routen- und Navigationsdokumentation fuer Life OS.
Quelle der Wahrheit: `PRODUCT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `docs/product/navigation-and-source-of-truth-blueprint.md` und der Discovery-Kontext aus `docs/product/LIFE_OS_FUNKTIONSKATALOG.md`.
Gilt fuer: Zielroutes, sichtbare Navigation, Page-Typen, Deep Links, Source-of-Truth-Regeln und spaetere Migrationshinweise.
Nicht gilt fuer: Implementierung, App-Routen, React-/Next.js-Code, Sidebar-Code, Dashboard, Supabase, Migrationen, Design Tokens oder Tailwind.

## Grundsatz

```text
Dashboard = Steuerung
Today = Daily Record / Workflow
Calendar = zeitliche Projektion / Planning Surface
Portfolio = Sammel- und Steuerungsbereich
Bereichsseiten = Views auf kanonische Daten
Detailseiten = Tiefe
```

Diese Datei dokumentiert Zielstruktur und operative Routenwahrheit. Sie legt keine implementierten App-Routen fest und erzeugt keine Code-Aufgabe.

Area-Unterseiten sind Views auf kanonische Entities. Sie duerfen keine eigenen Datensilos erzeugen. Dashboard V5 bleibt locked.

## Sichtbare Zielnavigation

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

Die Punkte oberhalb von Health & Fitness sind globale operative Einstiege und keiner Kategoriegruppe zugeordnet.

## Navigationsregeln

- `Portfolio` ist der Sammel- und Steuerungsbereich fuer Tasks, Projects, Goals und Skills.
- `Portfolio` bedeutet nicht Coding Showcase.
- `Portfolio` macht per Expand/Hover Tasks, Projects, Goals und Skills sichtbar.
- Portfolio muss zusaetzlich per Klick und Tastatur nutzbar sein, nicht nur per Hover.
- `Resources` ist der zentrale Einstieg in die Wissens- und Ressourcen-Datenbank.
- `Review` ist kein sichtbarer Sidebar-Punkt mehr.
- Review bleibt fachlich erhalten und wird als Calendar-/Today-naher Panel- oder Side-View-Workflow behandelt.
- Bestehende interne Review-Routes koennen als Deep Links erhalten bleiben: `/review/daily` und `/review/weekly`.
- `Calendar` traegt kuenftig zusaetzlich Review-Seitenansicht oder Right Panel fuer Daily Review, Weekly Review, Open Loops und Recent Wins.
- `Sleep Log` ist kein sichtbarer Health-&-Fitness-Punkt.
- Sleep bleibt spaetere Datenquelle innerhalb von Mental Health, Today und Recovery / Analytics.
- `Follow-up` ist kein sichtbarer Work-Punkt.
- `Meetings` ist kein sichtbarer Work-Punkt. Meeting-Kontext bleibt fachlich erhalten und kann intern, ueber Deep Links, Calendar oder Work-Kontext erreichbar bleiben.
- Follow-ups gehoeren spaeter zu Work Log, Tasks oder Meetings.
- `Entertainment` ist ein expandierbarer Life-Unterpunkt mit Games, Books, Series und Movies.
- Area-Unterseiten sind Views auf kanonische Daten, keine eigenen Datensilos.
- Logo und `Life OS · V5 / Linear Calm` stehen im Sidebar/Header nebeneinander.
- Dashboard V5 bleibt locked.

## Zielroutes

### Header / Globale Controls

```text
/search oder Command Overlay
/profile
/settings
```

Search/Command ist ein globaler Control und kein normaler Inhaltsbereich.

### Primary Routes

```text
/dashboard
/inbox
/today
/calendar
/portfolio
/resources
```

### Portfolio Routes

```text
/portfolio
/tasks
/projects
/projects/[projectId]
/goals
/goals/[goalId]
/skills
/skills/[skillId]
```

Tasks, Projects, Goals und Skills bleiben kanonische globale Entity-Routen. Sie sind nicht technisch unter `/portfolio/*` verschachtelt. `/portfolio` ist eine Uebersichts- und Sammelseite.

### Health & Fitness Routes

```text
/health
/health/mental
/health/habits
/health/running
/health/strength
```

Sleep wird nicht als sichtbare Route gefuehrt. Falls spaetere Detailrouten noetig sind, koennen sie intern oder als Detailseite existieren, aber nicht als Sidebar-Punkt.

### Nutrition Routes

```text
/nutrition
/nutrition/meal-planner
/nutrition/recipes
/nutrition/grocery
```

### Coding Routes

```text
/coding
/coding/repositories
/coding/agents
/coding/skill-map
```

`/coding/portfolio` wird durch `/coding/repositories` ersetzt. Falls alte Verweise existieren, ist spaeter ein Redirect zu pruefen. In diesem Block wird kein Redirect implementiert.

### Life Routes

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

### Education Routes

```text
/education
/education/scientific-work
/education/literature
/education/learning-log
```

`/education/master-thesis` wird nicht mehr als Navigationsroute gefuehrt. Masterarbeit ist spaeter ein Scientific-Work-Objekt oder ein Project-/Scientific-Work-Detail.

### Work Routes

```text
/work
/work/log
/work/wiki
```

`/work/meetings` ist keine sichtbare Sidebar-Route. Eine bestehende technische Route kann als interner oder spaeterer Deep Link erhalten bleiben.

`/work/follow-up` wird nicht gefuehrt. Follow-ups gehoeren spaeter in Work Log, Tasks oder Meetings.

### Utility Routes

```text
/shop
/challenges
/settings
```

## Interne und Deep-Link-Routes

Diese Routen koennen spaeter intern, ueber Panels, Detailseiten oder Command/Search erreichbar sein. Sie sind nicht zwingend sichtbare Sidebar-Punkte.

```text
/review/daily
/review/weekly
/day/[date]
/notes/[noteId]
/resources/[resourceId]
/journal/[entryId]
/inventory/[itemId]
/agents/[agentId]
/agent-sessions/[sessionId]
/runs/[runId]
/workouts/[workoutId]
/work/meetings
/recipes/[recipeId]
/meals/[mealId]
```

Review-Deep-Links bleiben Calendar-/Today-nah. Agent Sessions koennen als Detailkontext zu Coding Agents erreichbar bleiben, ohne `/coding/agent-sessions` als sichtbare Sidebar-Route zu behalten.

## Migrations- und Redirect-Hinweise

Diese Hinweise sind reine Planung. Wenn eine Route noch nicht existiert, wird sie hier nur dokumentiert. Keine App-Routen oder Redirects werden in diesem Block angelegt.

```text
/week
→ /calendar?view=week oder Calendar Week View

/review
→ kein sichtbarer Sidebar-Punkt mehr; Review in Calendar/Today Panel

/health
→ bleibt Health & Fitness Overview

/education/master-thesis
→ /education/scientific-work oder spaeter Scientific-Work-Detail

/coding/agent-sessions
→ /coding/agents

/coding/prompts
→ /resources mit Typ Prompt oder spaeter Coding Resource View

/coding/portfolio
→ /coding/repositories oder spaeter Coding Showcase, falls neu entschieden

/personal
→ /life

/work/follow-up
→ /work/log, /tasks oder /work/meetings
```

## Page Types

| Page Type | Bedeutung | Beispiele |
|---|---|---|
| Entry Point | Operativer Einstieg mit aggregierter Steuerung | `/dashboard` |
| Entity Workbench | Arbeitsflaeche fuer kanonische Entities | `/tasks`, `/projects`, `/goals`, `/skills`, `/resources` |
| Area Overview | Bereichsuebersicht mit gefilterten Views | `/health`, `/nutrition`, `/coding`, `/life`, `/education`, `/work` |
| Area Subpage | fachliche Unterseite eines Bereichs | `/health/running`, `/coding/repositories`, `/work/log` |
| Projection | zusammengesetzte Sicht ohne Fachkopien | `/dashboard`, `/calendar`, `/portfolio` |
| Workflow | Ablauf, der Entities oder Records veraendert | `/today`, `/inbox`, `/review/daily` |
| Detail Page | tiefe Ansicht eines kanonischen Objekts | `/projects/[projectId]`, `/resources/[resourceId]` |
| System / Utility | Konfiguration oder Querschnittsfunktion | `/settings`, `/shop`, `/challenges` |

### Route-Typisierung

```text
/dashboard = Entry Point / Projection
/inbox = Workflow / Entity Triage
/today = Daily Record / Workflow
/calendar = Temporal Projection / Planning Surface
/portfolio = Entity Overview / Portfolio Workbench
/resources = Entity Workbench

/tasks = Entity Workbench
/projects = Entity Workbench
/projects/[projectId] = Detail Page
/goals = Entity Workbench
/goals/[goalId] = Detail Page
/skills = Entity Workbench
/skills/[skillId] = Detail Page

/health = Area Overview
/health/mental = Area Subpage / Sensitive Domain View
/health/habits = Area Subpage / Domain Workbench
/health/running = Area Subpage / Domain Workbench
/health/strength = Area Subpage / Domain Workbench

/nutrition = Area Overview
/nutrition/meal-planner = Workflow / Area Subpage
/nutrition/recipes = Entity Workbench / Area Subpage
/nutrition/grocery = Workflow / Area Subpage

/coding = Area Overview
/coding/repositories = Area Subpage / Domain Workbench
/coding/agents = Area Subpage / Workflow
/coding/skill-map = Projection / Area Subpage

/life = Area Overview
/life/journal = Personal Record Workbench
/life/notes = Knowledge Workbench
/life/entertainment = Area Subpage / Collection Overview
/life/inventory = Entity Workbench / Area Subpage

/education = Area Overview
/education/scientific-work = Area Subpage / Domain Workbench
/education/literature = Resource View / Area Subpage
/education/learning-log = Workflow / Area Subpage

/work = Area Overview
/work/log = Workflow / Area Subpage
/work/wiki = Knowledge Workbench / Area Subpage
/work/meetings = Workflow / Area Subpage

/shop = Utility / Motivation
/challenges = Workflow / Motivation
/settings = System
```

## Source-of-Truth-Regeln

- Dashboard speichert keine Fachkopien.
- Today ist Daily Record und keine Dashboard-Kopie.
- Calendar ist eine zeitliche Projektion und nicht die alleinige Quelle aller Termine.
- Portfolio buendelt Tasks, Projects, Goals und Skills, speichert sie aber nicht als Kopie.
- Area-Unterseiten sind Views auf kanonische Entities.
- Resources ist die zentrale kanonische Wissensquelle.
- Work Wiki, Life Notes, Coding Skill Map und Education Literature erzeugen keine separaten Datensilos.
- Review bleibt fachlich vorhanden, aber nicht als Sidebar-Hauptpunkt.
- Analytics, Reports und AI bleiben spaeter und duerfen keine zweite Rohdatenquelle werden.

## MVP-Prioritaet

### now

- `/dashboard`
- `/inbox`
- `/today`
- `/calendar`
- `/portfolio`
- `/tasks`
- `/projects`
- `/resources` als Skeleton
- `/settings` als Skeleton

### soon

- `/goals`
- `/skills`
- `/health`
- `/nutrition`
- `/coding`
- `/life`
- `/education`
- `/work`
- `/review/daily` als interner oder Panel-Flow
- `/review/weekly` als interner oder Panel-Flow

### later

- Health-Unterseiten
- Nutrition-Unterseiten
- Coding-Unterseiten
- Life-Unterseiten
- Education-Unterseiten
- Work-Unterseiten
- Entertainment-Unterseiten
- Shop
- Challenges
- Integrationen und Imports
- Analytics und Reports

### maybe

- Rewards- oder Shop-Erweiterungen
- Coding Showcase, falls spaeter neu entschieden
- weitere Gamification-Funktionen

## Mobile Navigation Mapping

- Bottom Nav oder Quick Bar fuer Dashboard, Inbox, Today, Calendar und Search/Command.
- Portfolio, Resources und Areas sind ueber Drawer/More erreichbar.
- Expandable-Gruppen muessen per Tap zugaenglich sein.
- Keine reine Hover-Navigation auf Touch-Geraeten.
- Review bleibt als Today-/Calendar-naher Flow erreichbar, nicht als eigener Hauptpunkt.

## Accessibility-Regeln fuer Navigation

- Hover-Flyouts brauchen Klick- und Keyboard-Alternative.
- Expandables nutzen spaeter `aria-expanded`.
- Links sind echte Links.
- Expand-Buttons sind echte Buttons.
- Fokus ist sichtbar.
- Keine Information wird nur ueber Farbe vermittelt.
- Sidebar-Gruppen haben verstaendliche Labels.

## Nicht-Ziele dieses Dokuments

- keine App-Routen erstellen
- keine React-/Next.js-Codeaenderungen
- keine Sidebar-Codeaenderung
- keine Dashboard-Aenderung
- keine Supabase-, DB- oder CRUD-Implementierung
- keine Migrationen
- keine Design-, Token- oder Tailwind-Aenderungen
