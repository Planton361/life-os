# Dashboard Code Structure

Stand: 2026-06-18
Status: Active
Zweck: Ownership, Struktur und sichere Refactor-Regeln fuer das akzeptierte V5 Dashboard dokumentieren.
Quelle der Wahrheit: `ARCHITECTURE.md`, `DESIGN.md`, `docs/design/dashboard-v5.md`, `docs/design/dashboard-layout-lock.md`.
Gilt fuer: Dashboard-Komponenten, Dashboard-Feature-Daten, Layout-Token und spaetere mechanische Splits.
Nicht gilt fuer: Produktstrategie, Datenmodellmigrationen oder neue Dashboard-Designrichtungen.

## Grundsatz

Dashboard-Code bleibt nach Verantwortung getrennt:

```text
Layout-Komposition in Layout-/Dashboard-Komponenten.
Domain- und Mockdaten in features/dashboard.
Globale Tokens in globals.css.
Keine generische DashboardWidget-Engine.
```

## Datei-Verantwortlichkeiten

| Datei | Verantwortung | Darf Layoutwerte enthalten? |
|---|---|---:|
| `src/components/dashboard/dashboard-grid.tsx` | Dashboard-Zonen, Hauptspalten, Reihenfolge, Bottom Zone | Ja, locked |
| `src/components/dashboard/dashboard-sections.tsx` | Aktuelle Section-Implementierungen und lokale Section-Primitives | Ja, innerhalb eigener Section |
| `src/components/layout/command-center.tsx` | Top-Zone, Metrics, Quick Thought, Daily Control, Time Progress, Mood | Ja, locked |
| `src/components/layout/sidebar.tsx` | Navigation, Area-Summary, Sidebar-Dichte und Sidebar-Layout | Ja, locked |
| `src/components/layout/app-shell.tsx` | App Shell, Sidebar/Main-Aufteilung, Main-Padding | Ja, locked |
| `src/features/dashboard/*` | Types, Mockdaten, spaetere Mapper/Queries | Nein |
| `src/app/globals.css` | Tokens, globale App-/Dashboard-CSS-Variablen | Ja, nur Tokens/Custom Properties |

## Dateien, die Layout aendern duerfen

Nur mit explizitem `layout` Change Type:

- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/command-center.tsx`
- `src/components/dashboard/dashboard-grid.tsx`
- `src/components/dashboard/dashboard-sections.tsx`
- `src/app/globals.css`

Auch in diesen Dateien sind Layoutwerte locked, solange kein expliziter Layout-Scope vorliegt.

## Dateien ohne Layoutwerte

Diese Dateien duerfen keine Tailwind-/CSS-Layoutwerte enthalten:

- `src/features/dashboard/types.ts`
- `src/features/dashboard/mock-data.ts`
- `src/features/dashboard/index.ts`
- `src/lib/navigation.ts`, ausser Inhalt und semantische Accent-Referenzen
- Dokumentations- und Prompt-Dateien, ausser sie beschreiben Regeln

Feature-Dateien duerfen Prioritaet, Status, Labels, Werte, Accent-Token und Datenstruktur enthalten, aber keine Grid-Spalten, Hoehen, Gaps, Padding, Margin oder Positionierung.

## Widget-Extraktion

Ein Widget wird in eine eigene Datei extrahiert, wenn mindestens eines gilt:

- die Section ist fachlich eigenstaendig
- die Datei wird schwer scanbar
- ein Widget hat eigene Helpers, Primitives oder Varianten
- eine spaetere Datenbindung waere sonst unklar
- ein mechanischer Split reduziert Review-Risiko

Nicht extrahieren, wenn dadurch eine generische Abstraktion entsteht oder P0/P1/P2/P3-Hierarchie unscharf wird.

## Keine generische DashboardWidget-Engine

Eine generische `DashboardWidget`-, Widget-Registry- oder Config-Engine ist im MVP verboten. Das V5 Dashboard lebt von spezifischer Hierarchie:

- P0: Today Agenda, Daily Control
- P1: Quick Thought, Command Center, Sidebar, Mood Check, Habit Tracker, Active Portfolio
- P2: Meals Today, Running / Muscle / Recovery, Nutrient Balance, Weight Loss
- P3: Time Progress, Anti-Rot Actions, Challenges / Reward Focus

Eine generische Engine wuerde diese Gewichtung verwischen und Layout-Regressions wahrscheinlicher machen.

## Empfohlener spaeterer Split

Wenn `dashboard-sections.tsx` mechanisch geteilt wird, dann bevorzugt in:

- `src/components/dashboard/sections/today-agenda.tsx`
- `src/components/dashboard/sections/nutrition-stack.tsx`
- `src/components/dashboard/sections/running-tracker.tsx`
- `src/components/dashboard/sections/habit-trackers.tsx`
- `src/components/dashboard/sections/active-portfolio.tsx`
- `src/components/dashboard/sections/bottom-actions.tsx`

Gemeinsame stabile Primitives duerfen spaeter in eine kleine lokale Datei wandern:

- `Panel`
- `Pill`
- `ProgressBar`
- `styleFor`

Nur extrahieren, wenn Klassen und Verhalten 1:1 erhalten bleiben.

## Safe-Refactor-Regeln

Bei Dashboard-Refactors gilt:

- keine Klassen aendern
- keine Reihenfolge aendern
- keine Daten aendern
- keine Layoutwerte aendern
- keine Farben aendern
- keine Komponentenlogik neu interpretieren
- keine Client Components einfuehren
- keine neue Library einfuehren
- Screenshot vorher/nachher vergleichen, wenn UI betroffen ist

Ein Safe Refactor ist mechanisch. Jede sichtbare Aenderung macht daraus einen anderen Change Type.

## DoD fuer Refactors

- [ ] Change Type ist `refactor`.
- [ ] Betroffene Dateien sind explizit genannt.
- [ ] Keine Dashboard-Komposition wurde veraendert.
- [ ] Keine Tailwind-Klasse wurde absichtlich geaendert.
- [ ] Keine Daten oder Mockdaten wurden geaendert.
- [ ] Keine neue Abstraktion verwischt P0/P1/P2/P3.
- [ ] `pnpm lint` wurde ausgefuehrt.
- [ ] `pnpm exec tsc --noEmit` wurde ausgefuehrt.
- [ ] `git diff --check` wurde ausgefuehrt.
- [ ] Bei UI-Refactor wurde `pnpm qa:dashboard` ausgefuehrt, sofern moeglich.
