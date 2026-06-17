# Anti-AI-Slop Rules

Stand: 2026-06-17  
Status: Active  
Zweck: Schutz gegen generische, überdekorierte AI-generierte UI.  
Quelle der Wahrheit: `DESIGN.md`.  
Gilt für: alle UI-Vorschläge und Codex-Änderungen.  
Nicht gilt für: legitime kleine UI-Experimente in isolierten Branches.

## Slop-Indikatoren

- generische Gradient-Hero-Flächen
- zufällige Icons ohne Informationswert
- zu viele Schatten und Glow-Effekte
- Cards ohne klaren Zweck
- Charts ohne Frage
- Actions ohne echte Mutation
- uneinheitliche Pill-Farben
- Textwüste in Widgets
- übertriebene Motivationssprache

## Gegenregeln

- Erst Ziel der Komponente nennen.
- Bestehende Card-Typen nutzen.
- Tokens verwenden.
- P0/P1/P2/P3 beachten.
- Jede Farbe semantisch begründen.
- Kein Widget ohne Folgeaktion oder Entscheidungsnutzen.

## Review-Frage

```text
Würde diese UI auch ohne Effekt, Icon und Gradient noch funktionieren?
```
