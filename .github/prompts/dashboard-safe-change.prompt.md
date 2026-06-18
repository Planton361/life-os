# Dashboard Safe Change Prompt

Use this prompt for small, reviewable Life OS Dashboard V5 changes.

```text
Ziel:
[Beschreibe die konkrete Dashboard-Aenderung.]

Change Type:
[layout | color | content | motion | refactor]

Dateien lesen:
- AGENTS.md
- DESIGN.md
- ARCHITECTURE.md
- AI_WORKFLOW.md
- docs/design/dashboard-v5.md
- docs/design/dashboard-layout-lock.md
- docs/engineering/dashboard-code-structure.md
- [weitere relevante Dateien]

Dateien aendern:
- [exakte Datei 1]
- [exakte Datei 2]

Dateien nicht aendern:
- [Dateien/Ordner, die tabu sind]
- src/features/dashboard/*, falls keine Daten-/Typaenderung beauftragt ist
- src/app/globals.css, falls keine Token-/Layoutaenderung beauftragt ist
- Tests, falls nicht explizit Teil des Scopes

Layout Lock:
- V5 bleibt visuelle Wahrheit.
- Dashboard-Layout ist locked.
- Keine Layoutwerte aendern, ausser Change Type ist layout und die Werte sind hier explizit genannt.
- Gesperrte Werteklassen: width, height, min-height, max-width, grid-cols, grid-rows, gap, padding, margin, top, left, right, bottom.
- Canonical Viewports: 2560×1440 primaer, 1440×900 Desktop-Guard, Mobile nutzbar aber nicht pixel-locked.
- Betroffene Zone: [App Shell | Sidebar | Command Center | Dashboard Grid | Today Agenda | Left Stack | Right Stack | Bottom Zone]

Akzeptanzkriterien:
- P0 bleibt dominant: Today Agenda und Daily Control.
- Keine neue Designrichtung.
- Keine alten Dashboard-Varianten.
- Keine Neon-/AI-Slop-Optik.
- Keine unnoetigen Refactors.
- Keine unnoetigen Client Components.
- Accessibility wird nicht verschlechtert.
- Security/Privacy wird nicht beruehrt oder bleibt unveraendert.
- Validierung: pnpm lint, pnpm exec tsc --noEmit, git diff --check.
- Bei sichtbarer UI-Aenderung: pnpm qa:dashboard, wenn moeglich.

Ausgabeformat:
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```
