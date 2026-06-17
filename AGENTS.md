# AGENTS.md

Stand: 2026-06-17  
Status: Active  
Zweck: Operative Arbeitsregeln für Codex, Claude, Cursor, Copilot und andere Coding Agents.  
Quelle der Wahrheit: Diese Datei für Agentenverhalten.  
Gilt für: alle Agentenarbeiten im Repo.  
Nicht gilt für: Produktstrategie im Detail; siehe `PRODUCT.md`.

## Kurzfassung

Arbeite erst prüfend, dann ändernd. Nichts löschen ohne ausdrückliche Bestätigung. Bestehende Dateien und Komponenten bevorzugt verbessern statt duplizieren. V5 ist die finale Dashboard-Designrichtung.

## Immer zuerst lesen

- `PRODUCT.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `ACCESSIBILITY.md`
- `ROADMAP.md`
- `AI_WORKFLOW.md`

Bei UI-/Dashboard-Aufgaben zusätzlich:

- `docs/design/dashboard-v5.md`
- `docs/design/design-tokens.md`
- `docs/design/component-system.md`
- `docs/design/visualization-rules.md`

Bei Produkt-/Route-Aufgaben zusätzlich:

- `docs/product/pages-and-routes.md`
- `docs/product/ux-flows.md`
- `docs/product/feature-spec.md`

Bei Agenten-/Prompt-Aufgaben zusätzlich:

- `docs/ai-workflow/prompting-rules.md`
- `docs/ai-workflow/review-workflow.md`
- `docs/ai-workflow/tools-and-repos.md`

## Codex Capability Layer

Aktive eigene Skills:

- `$life-os-design-taste`: nutzen, wenn UI-, Dashboard-, Komponenten-, Layout- oder visuelle Vorschläge gegen V5 geprüft werden.
- `$life-os-codex-task-writer`: nutzen, wenn vage Anforderungen in kleine, sichere, prüfbare Codex-Aufträge übersetzt werden.

Regeln:

- Skills ergänzen die Arbeit, ersetzen aber nicht `DESIGN.md`, `AI_WORKFLOW.md`, `ROADMAP.md` oder andere Root-Wahrheiten.
- `$life-os-design-taste` ersetzt V5 nicht. V5 bleibt die verbindliche Designwahrheit.
- Skills treffen keine autonomen Produktentscheidungen.
- Externe Skills, MCPs und Agententools werden erst nach Review von Zweck, Scope, Rechten und Risiko genutzt.
- Externe Tools werden nicht automatisch installiert oder aktiviert.
- Große Aufgaben zuerst im Plan Mode klären, dann erst im bestätigten Scope umsetzen.

## Arbeitsregeln

- Vor größeren Änderungen Plan ausgeben.
- Keine Dateien löschen.
- Keine alten Dashboard-Varianten reaktivieren.
- Keine neue Library ohne Begründung.
- Keine Secrets anfassen oder erzeugen.
- Keine RLS/Security-Regeln umgehen.
- Keine umfangreichen Refactors nebenbei.
- Kleine, reviewbare Änderungen bevorzugen.
- Nach Änderungen relevante Checks ausführen oder begründen, warum nicht möglich.

## Design-Hard-Limits

- Aktive Designrichtung: `Life OS – Linear Calm Dark Command Center`.
- Figma-Basis: `Dashboard Overhaul V5 – Subtle Color Identity Polish`.
- Keine Neon-Gradients.
- Keine Glass-Lawine.
- Keine Chart-Flut.
- Keine generische AI-Slop-Optik.
- Keine übertriebene Gamification.
- P0 dominiert: Today Agenda und Daily Control.

## Ausgabeformat

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

## Definition of Done

- [ ] Aufgabe erfüllt.
- [ ] Designsystem respektiert.
- [ ] Mobile-Verhalten bedacht.
- [ ] Accessibility nicht verschlechtert.
- [ ] Security/Privacy nicht verletzt.
- [ ] Keine unnötigen Duplikate erzeugt.
- [ ] Keine alte Wahrheit aktiv gehalten.
