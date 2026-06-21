# PRODUCT.md

Stand: 2026-06-21
Status: Active
Zweck: Operative Produktwahrheit für Agents.
Quelle der Wahrheit: Diese Datei; Details in `docs/product/*`.
Gilt für: Scope, Priorisierung, UX-Zweck.
Nicht gilt für: visuelle Details; siehe `DESIGN.md`.

## Kurzfassung

Life OS ist eine eigene Web-App für persönliche Steuerung und kanonische persönliche Daten: Dashboard, Inbox, Today, Calendar, Portfolio, Resources, Health & Fitness, Nutrition, Coding, Life, Education, Work sowie Utility-Bereiche wie Shop, Challenges und Settings. Das Ziel ist operative Klarheit, nicht Datensammlung.

## Leitsatz

```text
Weniger Oberfläche. Mehr Steuerung.
```

## Produktmodell

```text
Dashboard = Steuerung
Bereichsseiten = Kontext
Detailseiten = Tiefe
Archiv = Vergangenheit
```

## Sichtbare Hauptbereiche

- Dashboard
- Inbox
- Today
- Calendar
- Portfolio
- Resources
- Health & Fitness
- Nutrition
- Coding
- Life
- Education
- Work
- Shop
- Challenges
- Settings

## Fachliche Rollen

- Dashboard bleibt das V5-Command-Center. Es steuert den aktuellen Tag und wird nicht neu entworfen.
- Today ist Daily Record und Tagesdatenpunkt. Es ergänzt tagesbezogene Planung, Beobachtung und Abschluss, dupliziert aber nicht das Dashboard.
- Calendar ist zeitliche Projektion und Planungsoberfläche. Er zeigt Zeitbezüge aus kanonischen Entities und trägt später Review-nahe Panels.
- Portfolio bündelt Tasks, Projects, Goals und Skills als Sammel- und Steuerungsbereich. Portfolio bedeutet nicht Coding Showcase.
- Resources ist die zentrale Knowledge- und Resource-Workbench.
- Review ist kein sichtbarer Sidebar-Hauptbereich mehr. Review bleibt fachlich als Calendar-/Today-naher Panel- oder Side-View-Workflow erhalten.
- Areas wie Health & Fitness, Nutrition, Coding, Life, Education und Work geben Kontext. Ihre Unterseiten sind Views auf kanonische Daten, keine Datensilos.

## Bereichsmodell

- Health & Fitness enthält Mental Health, Habits, Running Tracker und Strength Tracker.
- Sleep ist keine sichtbare Sidebar-Seite, bleibt aber spätere Datenquelle für Mental Health, Today, Recovery oder Analytics.
- Nutrition enthält Meal Planner, Recipes und Grocery.
- Coding enthält Repositories, Agents und Skill & Knowledge Map.
- Life enthält Journal, Notes, Entertainment mit Games, Books, Series und Movies sowie Inventory.
- Education enthält Scientific Work, Literature und Learning Log.
- Work enthält sichtbar Work Log und Wiki. Meetings bleibt fachlich erhalten, ist aber kein sichtbarer Work-Sidebar-Punkt.
- Follow-ups sind kein eigener Work-Punkt mehr. Sie gehören später zu Work Log, Tasks oder Meetings.
- Shop und Challenges sind Utility- und Motivationspunkte, aber nicht P0.

## MVP-Kern

- Dashboard V5
- Quick Capture / Inbox
- Today / Daily Record Skeleton
- Calendar Skeleton
- Daily Control
- Portfolio Skeleton
- Tasks / Projects / Goals / Skills als statische oder vorbereitete Workbenches
- Resources Skeleton
- Daily/Weekly Review als Panel- oder Deep-Link-Konzept
- Basic Area Skeletons

## Später

- vollständiges Nutrition-Tracking
- volle Health-, Running-, Strength- und Recovery-Analytics
- umfassende Analytics und Reports
- Agentenfähigkeit jenseits vorbereiteter Coding-/AI-Kontexte
- Shop-, Rewards- und Challenges-Ausbau
- Imports und externe Integrationen
- komplexe Automationen

## Erfolgskriterien

- Anton erkennt morgens in unter 30 Sekunden, was zählt.
- Inbox blockiert mental nicht.
- Projekte bleiben kontrollierbar.
- Review ist leicht ausfüllbar.
- Dashboard bleibt scanbar.
- Mobile ist nutzbar.

## Nicht-Ziele

- Notion-Klon
- Social-App
- vollständige Analytics
- komplexe KI-Automation vor manuellem Flow
- XP-Spiel
- Dashboard als Datenfriedhof
