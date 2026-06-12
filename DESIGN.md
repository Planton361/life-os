# DESIGN.md – Life OS App Design System

Stand: 2026-06-12

## Designziel

Life OS soll wirken wie eine moderne, hochwertige persönliche Produktivitäts-App:

- beeindruckend
- ruhig
- präzise
- produktivitätsorientiert
- visuell klar
- datenbewusst
- mobile-tauglich
- nicht verspielt
- nicht überladen

Referenz-Vibe:

```text
Linear Premium + Vercel Technical + Calm Productivity
```

## Designprinzip

```text
Skelett bleibt stabil.
Vibe ist austauschbar.
```

Skelett:

- Dashboard-Struktur
- Navigation
- Komponenten
- Datenlogik
- Mobile-Reihenfolge
- Accessibility
- Dichte-Regeln

Vibe:

- Farbtemperatur
- Schatten
- Radius
- Hintergrund
- Card-Stil
- Motion
- Typografiegefühl

## Design Tokens

```yaml
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 24px
  6: 32px
  7: 48px
  8: 64px
  9: 96px

layout:
  pageMax: 1240px
  dashboardMax: 1280px
  sidebarWidth: 264px
  topbarHeight: 64px
  mobilePad: 16px
  desktopPad: 32px
  gridGap: 20px
  sectionGap: 40px

radius:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 22px
  2xl: 28px

color:
  bg: "#f6f5f2"
  bgElevated: "#fbfaf8"
  surface: "#ffffff"
  surfaceSubtle: "#f8f7f4"
  border: "#e2ded6"
  borderStrong: "#d2cbc0"
  text: "#1f1f1f"
  textMuted: "#6d6961"
  textSoft: "#979188"
  education: "#2f6fbd"
  work: "#2f7a4f"
  coding: "#d06f2f"
  agent: "#3b6fd8"
  health: "#c65f35"
  nutrition: "#b76a25"
  personal: "#7a5aa6"
  system: "#6f747c"
```

## Komponenten

### AppShell

- Sidebar
- Topbar
- Command trigger
- Main content
- optional Context Panel

### DashboardHero

- ein Fokus
- kurzer Text
- maximal 3 Meta-Items
- optional Mini-Progress

### QuickActions

Maximal 6:

- + Gedanke
- + Aufgabe
- + Tageslog
- + Training
- + Lernlog
- + Agent Session

### DashboardCard

- eine Aufgabe pro Card
- Header mit Titel und optional Count
- Inhalt 3–7 Items
- Footer Link optional

### CompactList

- Haupttext zuerst
- Meta sekundär
- maximal 4 Meta-Infos
- Pills sparsam

### Progress

- Projekt
- Ziel
- Habit
- Skill
- immer mit Textwert

### Visualizations

Erlaubt:

- Progress bars
- Week dots
- sparklines
- kleine line/bar charts
- rings sparsam
- timelines auf Detailseiten

Nicht:

- dekorative Charts
- 3D
- Regenbogenfarben
- mehr als 2 Charts im Dashboard-Topbereich

## Farblogik

- Education = Blau
- Work = Grün
- Coding & Agents = Orange/Blau
- Health = Rot/Orange
- Nutrition = Orange
- Personal = Lila
- Review/System = Grau

Farbe nie allein verwenden. Immer Textlabel.

## Area Vibes

```text
Dashboard: Linear Premium + Calm Productivity
Education: Calm Academic
Work: Linear Premium
Coding & Agents: Vercel Technical
Health: Warm Routine
Nutrition: Warm Simple
Personal: Warm Minimal
Review/System: System Grey
```

## Motion

Erlaubt:

- hover elevation
- dialog/sheet transitions
- command palette animation
- progress loading
- skeleton loading

Nicht erlaubt:

- dauerhafte Hintergrundanimation
- Parallax im Produktivitätsfluss
- Motion, die UI langsamer macht

## Anti-Patterns

- Tabellenwand
- zu viele Cards mit gleicher Dominanz
- lange Motivationszitate
- Wetter/Uhr als Hauptfokus
- Chart-Overload
- generisches SaaS-Blau ohne Semantik
- zu viele Icons
- Icon-only Actions ohne Label
- schwer lesbares Glassmorphism
- starke Verläufe hinter Text
- Dashboard als Datenbank-Ersatz

## Main Dashboard Pflicht

Muss sichtbar machen:

1. Heute
2. Inbox offen
3. Diese Woche
4. Fokus
5. Aktive Projekte
6. Ziele
7. Review
8. Area Snapshots

## Mobile

Mobile ist nicht nur gestapelter Desktop.

Reihenfolge:

1. Quick Actions
2. Heute
3. Inbox
4. Diese Woche
5. Fokus
6. Aktive Projekte
7. Review
8. Health
9. Education
10. Work/Coding
11. Goals
12. Nutrition

## Definition of Done Design

```text
[ ] Primärer Fokus ist klar.
[ ] Today/Inbox/Review sind schnell sichtbar.
[ ] Cards sind konsistent.
[ ] Farben sind semantisch.
[ ] Visualisierung unterstützt Handlung.
[ ] Mobile funktioniert.
[ ] Accessibility ist beachtet.
[ ] App wirkt hochwertig, nicht überladen.
```
