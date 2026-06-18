# Codex Dashboard Workflow

Stand: 2026-06-18
Status: Active
Zweck: Sicherer Codex-Ablauf fuer Dashboard-Arbeiten nach akzeptiertem V5-Stand.
Quelle der Wahrheit: `AGENTS.md`, `AI_WORKFLOW.md`, `DESIGN.md`, `docs/design/dashboard-layout-lock.md`, `docs/engineering/dashboard-code-structure.md`.
Gilt fuer: Codex-, Copilot-, Claude- und andere Agentenarbeiten am Dashboard.
Nicht gilt fuer: autonome Produktentscheidungen, Toolinstallationen oder neue Designrichtungen.

## Ablauf

1. Change Type bestimmen: `layout`, `color`, `content`, `motion` oder `refactor`.
2. Worktree vor Aenderung pruefen.
3. Relevante Root-Dateien lesen.
4. Bei Dashboard-Arbeiten zusaetzlich lesen:
   - `docs/design/dashboard-v5.md`
   - `docs/design/dashboard-layout-lock.md`
   - `docs/engineering/dashboard-code-structure.md`
   - `docs/design/effects-and-motion.md`, falls Motion/Effekte betroffen sind
5. Geplante Dateien und Nicht-Ziele nennen, bevor groessere Aenderungen beginnen.
6. Nur kleine, dateigenaue Aenderungen umsetzen.
7. Akzeptierte Layoutentscheidungen nicht ueberschreiben.
8. Validieren.
9. Abschlussbericht im Format aus `AGENTS.md` liefern.

## Root-Dateien

Immer relevante Root-Wahrheiten lesen:

- `AGENTS.md`
- `PRODUCT.md`, falls Produkt-/UX-Scope betroffen ist
- `DESIGN.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`, falls Daten betroffen sind
- `SECURITY.md`, falls Auth, RLS, Mutations oder private Daten betroffen sind
- `ACCESSIBILITY.md`, falls UI betroffen ist
- `ROADMAP.md`
- `AI_WORKFLOW.md`

## Keine breiten UI-Polish-Prompts

Nicht verwenden:

```text
Mach das Dashboard schoener.
Polish die ganze UI.
Refactore alles.
Fuege moderne Effekte hinzu.
```

Stattdessen immer Change Type, erlaubte Dateien, verbotene Dateien und Akzeptanzkriterien nennen.

## Scope-Regeln

- Keine Dashboard-Layoutwerte ohne expliziten `layout` Scope aendern.
- Keine alten Dashboard-Varianten reaktivieren.
- Keine neue Designrichtung einfuehren.
- Keine neue Library ohne begruendeten, bestaetigten Scope.
- Keine Client Components nur fuer Deko.
- Keine breiten Refactors nebenbei.
- Keine Mockdaten oder Feature-Typen aendern, wenn der Change Type nur Layout, Color, Motion oder Refactor ist.
- Keine manuell akzeptierten UI-Entscheidungen ueberschreiben.

## Validierung

Standardchecks:

```bash
pnpm lint
pnpm exec tsc --noEmit
git diff --check
```

Bei sichtbaren UI-Aenderungen, wenn moeglich:

```bash
pnpm qa:dashboard
```

Wenn ein Check nicht moeglich ist, muss der Abschlussbericht sagen warum.

## Verhalten bei blockierter Sandbox

Wenn ein wichtiger Check oder eine notwendige Aktion durch Sandbox, Berechtigungen oder Netzwerk blockiert wird:

- nicht heimlich umgehen
- keine riskanten Alternativen verwenden
- mit kurzer Begruendung Escalation anfragen, wenn der Check fuer den Scope notwendig ist
- wenn Escalation nicht sinnvoll oder nicht erlaubt ist, den Check als nicht ausgefuehrt berichten

Keine MCPs, Browseraktionen, externen Tools oder Installationen ohne expliziten Zweck, Scope, Rechte- und Risiko-Review aktivieren.

## Abschlussbericht

Immer nach `AGENTS.md`:

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

## Beispielprompt: Layout Fix

```text
Ziel:
Behebe [konkretes Layoutproblem] im Dashboard.

Change Type:
layout

Dateien lesen:
- AGENTS.md
- DESIGN.md
- ARCHITECTURE.md
- docs/design/dashboard-v5.md
- docs/design/dashboard-layout-lock.md
- docs/engineering/dashboard-code-structure.md
- [betroffene Datei]

Dateien aendern:
- [exakte Datei]

Dateien nicht aendern:
- src/features/dashboard/*
- Mockdaten
- Tests, ausser explizit genannt

Layout Lock:
Viewport: [2560×1440 / 1440×900 / Mobile]
Betroffene Zone: [Zone]
Erlaubte Werteklassen: [konkret]

Akzeptanzkriterien:
- P0 bleibt dominant.
- Kein horizontaler Overflow.
- Keine Nebenrefactors.

Validierung:
- pnpm lint
- pnpm exec tsc --noEmit
- git diff --check
- pnpm qa:dashboard, wenn moeglich
```

## Beispielprompt: Color Fix

```text
Ziel:
Passe [konkrete Farbe / Token-Nutzung] an V5 an.

Change Type:
color

Dateien lesen:
- DESIGN.md
- docs/design/design-tokens.md
- docs/design/dashboard-layout-lock.md

Dateien aendern:
- [exakte Datei]

Dateien nicht aendern:
- Layoutwerte
- grid-cols, heights, gaps, padding, margin

Layout Lock:
Keine Layoutwerte aendern.

Akzeptanzkriterien:
- Farbe ist semantisch und textgestuetzt.
- Kein Neon-/AI-Slop.
- Kontrast verschlechtert sich nicht.
```

## Beispielprompt: Motion Fix

```text
Ziel:
Fuege [konkrete Microinteraction] fuer [konkretes Element] hinzu.

Change Type:
motion

Dateien lesen:
- DESIGN.md
- ACCESSIBILITY.md
- docs/design/effects-and-motion.md
- docs/design/dashboard-layout-lock.md

Dateien aendern:
- [exakte Datei]

Layout Lock:
Keine width/height/grid/gap/margin/padding/top/left/right/bottom Animationen.

Akzeptanzkriterien:
- prefers-reduced-motion ist beruecksichtigt.
- Keine Layout-Shifts.
- Keine Client Component nur fuer Deko.
- P0/P1 wird unterstuetzt; P2/P3 bleibt leise.
```

## Beispielprompt: Safe Refactor

```text
Ziel:
Extrahiere [konkretes Widget / Primitive] mechanisch.

Change Type:
refactor

Dateien lesen:
- AGENTS.md
- ARCHITECTURE.md
- docs/engineering/dashboard-code-structure.md
- docs/design/dashboard-layout-lock.md
- [betroffene Quelldatei]

Dateien aendern:
- [Quelldatei]
- [neue Zieldatei]

Dateien nicht aendern:
- src/features/dashboard/*
- src/app/globals.css
- Tests
- Mockdaten

Layout Lock:
Keine Klassen, Reihenfolge, Daten, Farben oder Layoutwerte aendern.

Akzeptanzkriterien:
- Export/Import funktioniert.
- Diff ist mechanisch nachvollziehbar.
- pnpm lint, pnpm exec tsc --noEmit und git diff --check laufen durch.
```
