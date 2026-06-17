# Component System

Stand: 2026-06-17  
Status: Active  
Zweck: Komponentenregeln für Dashboard und App.  
Quelle der Wahrheit: `DESIGN.md` und `docs/design/dashboard-v5.md`.  
Gilt für: App Shell, Cards, Lists, Progress, Forms.  
Nicht gilt für: vollständige Komponenten-API.

## Komponentenklassen

### AppShell

Enthält Sidebar, Dashboard Canvas, optional Top-/Command-Zonen. Keine zu tiefen Sidebars.

### DashboardCard

- ein klarer Zweck
- Header mit Label und optionalem Count
- 3–7 Items maximal
- Meta sparsam
- Footer nur bei echter Aktion oder Detail-Link

### DailyControl

- aktueller Task
- nächster Schritt
- Queue maximal 3 Items sichtbar
- Action Buttons klar und knapp

### TodayAgenda

- Zeitachse als zentraler Anker
- aktive Zeile sichtbar
- Energie/Priorität als Pill mit Text
- keine Projekt-Detailflut

### QuickThought

- schneller Capture-Input
- Typ-Auswahl: Task, Note, Question, Agent
- Default: Inbox

### ProgressVisualization

- Prozent oder Wert als Text
- Progress Bar vor Ring
- keine reine Farbinformation

## Do / Don't

| Do | Don't |
|---|---|
| vorhandene Komponenten erweitern | ähnliche Cards duplizieren |
| Tokens nutzen | ad hoc Hex-Codes streuen |
| Card-Aufgaben begrenzen | Dashboard zur Widget-Sammlung machen |
| Labels für Status nutzen | Bedeutung nur über Farbe zeigen |
