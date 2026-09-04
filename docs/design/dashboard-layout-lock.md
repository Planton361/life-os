# Dashboard Layout Lock

Stand: 2026-06-18
Status: Historische V5-Referenz, teilweise überholt
Zweck: Bewahrt die frühere V5-Dashboard-Komposition als Referenz gegen unbeabsichtigte Regressionen.
Aktive Wahrheit: `PRODUCT.md` und `DESIGN.md` definieren Surface Acceptance, Viewports, Time Progress und Leerflächen. Bei Widerspruch haben sie Vorrang.
Gilt fuer: `/dashboard`, App Shell, Sidebar, Command Center, Dashboard Grid und Dashboard Sections.
Nicht gilt fuer: neue Produktstrategie, neue Dashboard-Designrichtungen oder alte V1-V4-Varianten.

## Kurzfassung

Das Dashboard-Layout war ab diesem Stand locked. Die Referenz schützt weiterhin V5-Hierarchie und begründete Komposition, darf aber keine nötige R2-Surface-Korrektur blockieren. Insbesondere sind die frühere Bottom-Zone, historische Viewportgrößen und frühere Time-Progress-Semantik nicht bindend.

## Canonical Viewports

| Viewport | Status | Bedeutung |
|---|---|---|
| `2560×1440` | Historische V5-WQHD-Referenz | Kann die Komposition erläutern, ist aber nicht der primäre R2-Viewport. |
| `1440×900` | Historischer Desktop-Responsive-Guard | Ergänzende Referenz; aktive Guards stehen in `DESIGN.md`. |
| Mobile | Nutzbar, nicht pixel-locked | Muss lesbar, bedienbar und ohne horizontalen Overflow bleiben; Pixelgleichheit ist aktuell kein Ziel. |

## Locked Layoutbereiche

### App Shell

Locked sind Dashboard-Max-Breite, Sidebar/Main-Aufteilung, Shell-Padding und die Grundstruktur aus Sidebar, Command Center und Main Canvas.

Relevante Dateien:

- `src/components/layout/app-shell.tsx`
- `src/app/globals.css`

### Sidebar

Locked sind Breite, Desktop-Hoehe, Scroll-/Overflow-Verhalten, vertikale Dichte und die Navigations-/Section-Anordnung.

Relevante Dateien:

- `src/components/layout/sidebar.tsx`
- `src/lib/navigation.ts` nur fuer Inhalt, nicht fuer Layoutwerte

### Command Center

Locked sind Top-Zone-Hoehe, vierteilige Desktop-Anordnung, Position von Quick Thought, Daily Control, Metrics, Time Progress und Mood Board.

Relevante Datei:

- `src/components/layout/command-center.tsx`

### Dashboard Grid

Locked sind Hauptspalten, Reihenfolge der Zonen, 2xl-Spaltenbreiten, Gaps und Bottom-Zone-Komposition.

Relevante Datei:

- `src/components/dashboard/dashboard-grid.tsx`

### Today Agenda

Locked sind zentrale Spaltenposition, Desktop-Hoehe, Header-Hoehe, Timeline-Rail, Agenda-Track und aktuelle Zeitmarke.

Relevante Datei:

- `src/components/dashboard/dashboard-sections.tsx`

### Left Stack

Locked sind Position und Kompaktheit von Weight Loss Goal, Nutrient Balance, Meals Today und Running Tracker.

Relevante Dateien:

- `src/components/dashboard/dashboard-grid.tsx`
- `src/components/dashboard/dashboard-sections.tsx`

### Right Stack

Locked sind Position und Hierarchie von Habit Trackers und Active Portfolio.

Relevante Dateien:

- `src/components/dashboard/dashboard-grid.tsx`
- `src/components/dashboard/dashboard-sections.tsx`

### Historische Bottom Zone

Die frühere unterstützende Bottom Zone mit Anti-Rot Actions und Challenges ist nicht mehr aktiv. Sie darf weder reaktiviert noch als Begründung für große Leerfläche verwendet werden.

Relevante Dateien:

- `src/components/dashboard/dashboard-grid.tsx`
- `src/components/dashboard/dashboard-sections.tsx`

## Gesperrte Werteklassen

Diese Werteklassen duerfen nicht ohne explizite Layout-Freigabe geaendert werden:

- `width`
- `height`
- `min-height`
- `max-width`
- `grid-cols`
- `grid-rows`
- `gap`
- `padding`
- `margin`
- `top`
- `left`
- `right`
- `bottom`

Das gilt fuer direkte CSS-Werte, Tailwind-Klassen wie `h-*`, `min-h-*`, `max-w-*`, `grid-cols-*`, `gap-*`, `p-*`, `m-*`, `top-*` sowie fuer CSS Custom Properties wie `--dashboard-max`, `--sidebar-width`, `--top-zone-height`, `--grid-gap` und `--panel-radius`.

## Change Types

| Change Type | Darf Layoutwerte aendern? | Regeln |
|---|---:|---|
| `layout` | Ja, nur mit explizitem Layout-Scope | Muss Problem, Ziel-Viewport, betroffene Dateien, Akzeptanzkriterien und visuelle Validierung nennen. |
| `color` | Nein | Darf nur Tokens, semantische Farbe, Border-/Surface-Toene und Kontrast betreffen. |
| `content` | Nein | Darf Texte, Labels, Mockdaten oder spaetere Datenbindung betreffen, ohne Layoutwerte zu bewegen. |
| `motion` | Nein | Darf nur erlaubte Motion-Eigenschaften nutzen und keine Layout-Shifts erzeugen. |
| `refactor` | Nein | Darf Dateien splitten oder Code ordnen, aber Klassen, Reihenfolge, Daten und Layoutwerte nicht veraendern. |

## Layout-Fix Beauftragen

Ein Layout-Fix muss konkret beauftragt werden:

```text
Change Type: layout
Problem:
Viewport:
Betroffene Zone:
Erlaubte Dateien:
Nicht aendern:
Akzeptanzkriterien:
Validierung:
```

Ohne diese Angaben ist eine Dashboard-Aenderung als `color`, `content`, `motion` oder `refactor` zu behandeln und darf keine Layoutwerte beruehren.

## Definition of Done fuer Layoutaenderungen

- [ ] V5 bleibt aktive Designrichtung.
- [ ] P0 bleibt dominant: Today Agenda und Daily Control.
- [ ] `2560×1440` entspricht weiterhin der akzeptierten WQHD-Komposition.
- [ ] `1440×900` bleibt ohne horizontalen Overflow nutzbar.
- [ ] Mobile bleibt bedienbar und ohne horizontalen Overflow.
- [ ] Keine P2/P3-Zone konkurriert visuell mit P0.
- [ ] Keine alten Dashboard-Varianten wurden reaktiviert.
- [ ] `pnpm lint` wurde ausgefuehrt.
- [ ] `pnpm exec tsc --noEmit` wurde ausgefuehrt, sofern moeglich.
- [ ] `git diff --check` wurde ausgefuehrt.
- [ ] Bei UI-Layoutaenderungen wurde `pnpm qa:dashboard` ausgefuehrt, sofern moeglich.
