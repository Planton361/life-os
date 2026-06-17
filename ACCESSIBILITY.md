# ACCESSIBILITY.md

Stand: 2026-06-17  
Status: Active  
Zweck: operative Accessibility-Regeln.  
Quelle der Wahrheit: Diese Datei.  
Gilt für: alle UI-Arbeiten.  
Nicht gilt für: reine Datenmodellarbeit ohne UI.

## Ziel

Mindestens WCAG 2.2 AA als Orientierung.

## Regeln

- Eine H1 pro Seite.
- Logische Heading-Struktur.
- Sichtbarer Focus State.
- Tastaturbedienung für Navigation, Buttons, Forms, Dialoge.
- Inputs haben Labels.
- Icon-only Buttons haben `aria-label`.
- Dialoge fokussieren korrekt und schließen mit Escape.
- Keine Information nur über Farbe.
- Dark-UI-Kontrast prüfen.
- Charts haben Titel und textliche Kernaussage.
- Mobile Touch Targets ausreichend groß.

## DoD

- [ ] Keyboard nutzbar.
- [ ] Fokus sichtbar.
- [ ] Kontrast ausreichend.
- [ ] Touch Targets ausreichend.
- [ ] Screenreader-Namen vorhanden.
- [ ] Keine horizontalen Mobile-Overflows.
