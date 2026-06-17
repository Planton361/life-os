# Performance Strategy

Stand: 2026-06-17  
Status: Draft  
Zweck: Performance-Grundregeln für das Dashboard.  
Quelle der Wahrheit: `ARCHITECTURE.md`.  
Gilt für: Dashboard und App Shell.  
Nicht gilt für: tiefes Performance-Tuning späterer Phasen.

## Regeln

- Dashboard schnell laden.
- Server Components default.
- Client Components klein halten.
- Charts lazy/import-sparsam.
- Keine unnötigen Animationen.
- Keine riesigen Mockdaten im Main Bundle.
- Bild-/Asset-Größen prüfen.

## Akzeptanz

- Dashboard bleibt auf Laptop flüssig.
- Mobile keine horizontalen Overflows.
- Keine unnötigen Re-renders in interaktiven Widgets.
