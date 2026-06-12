# ACCESSIBILITY.md – Life OS App

Stand: 2026-06-12

## Ziel

Mindestens WCAG 2.2 AA als Orientierung.

## Pflichtregeln

```text
[ ] Eine H1 pro Seite.
[ ] Logische Heading-Struktur.
[ ] Buttons haben verständliche Namen.
[ ] Icon-only Buttons haben aria-label.
[ ] Inputs haben Labels.
[ ] Focus States sind sichtbar.
[ ] Tastaturbedienung funktioniert.
[ ] Dialoge fokussieren korrekt.
[ ] Escape schließt Dialoge.
[ ] Kontrast ist ausreichend.
[ ] Touch Targets sind groß genug.
[ ] Charts haben Textzusammenfassung.
[ ] Status nicht nur über Farbe.
```

## Design

- Muted Text darf nicht zu hell sein.
- Fokus-Ring nie entfernen.
- Pills mit Textlabel.
- Charts mit Titel und Kernaussage.
- Mobile ohne horizontales Scrollen.

## Testen

- Keyboard-only Navigation.
- Screenreader Labels prüfen.
- Playwright optional mit axe-core.
