# Testing Strategy

Stand: 2026-06-17  
Status: Active  
Zweck: Test- und Prüfstrategie.  
Quelle der Wahrheit: `ARCHITECTURE.md`, `ACCESSIBILITY.md`, `SECURITY.md`.  
Gilt für: Features, UI, Accessibility, Security-relevante Flows.  
Nicht gilt für: vollständige QA-Automation im MVP.

## Testarten

- TypeScript Build
- Lint
- Unit Tests mit Vitest
- Komponenten-/Utility-Tests bei komplexer Logik
- Playwright für Kernflows
- Screenshot-/Responsive-Prüfung für Dashboard
- Accessibility Smoke Tests

## Kernflows für E2E

- Quick Capture → Inbox
- Inbox → Task
- Today Agenda anzeigen
- Daily Review speichern
- Project Progress anzeigen
- Auth-geschützte Route

## Mindestprüfung nach UI-Änderungen

- WQHD Screenshot
- Mobile View
- Keyboard Navigation
- Fokus sichtbar
- Dark-Kontrast plausibel
