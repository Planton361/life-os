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


## Geplante Work-Graph-Sichten (ab R2-10)

Ready/Blocked, Vorgänger und Blockierungsgründe brauchen lesbare Textwerte und
reale Detailnavigation. Zugehörigkeit, Dependency, Evidence und explorative Kanten
sind nicht nur durch Farbe oder Position unterscheidbar. Dependency-Verwaltung
muss ohne Drag/Drop und Graph-Canvas per Tastatur/Formular vollständig bedienbar
bleiben; Fehler und Konflikte sind zugänglich, Fokus bleibt nachvollziehbar.

Ein nach R2-11 gewählter Graph ist optionale Tiefe. Gleichwertige Listen-/Detail-
wege erhalten Daily Flows, Quellenzugriff und Blocker-Erklärung auch ohne räumliche
Graph-Bedienung. Neue Client-Öffnungsaktionen benennen ihr Ziel. R2-11 bewertet
auch diese Bedienbarkeit; spätere Life-OS-Flächen behalten 4K-, Desktop- und
Mobile-Guards. Dies ist ein geplanter Vertrag, keine aktuelle Graph-Abnahme.
