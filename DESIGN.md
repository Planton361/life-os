# DESIGN.md

Stand: 2026-06-17  
Status: Active  
Zweck: Operative Designquelle für Life OS.  
Quelle der Wahrheit: Diese Datei + `docs/design/*`.  
Gilt für: UI, Dashboard, Komponenten, visuelle Reviews.  
Nicht gilt für: alte V1–V4-Dashboardvarianten.

## Kurzfassung

Aktive Richtung ist **Life OS – Linear Calm Dark Command Center**. Das Dashboard ist ein dunkles, ruhiges, präzises Command Center. Es wirkt hochwertig durch Hierarchie, Dichtekontrolle, matte Flächen, präzise Borders, semantische Farbe und reduzierte Mikrotexte.

## Aktive Figma-Basis

```text
Dashboard Overhaul V5 – Subtle Color Identity Polish
```

## Prioritäten

### P0

- Today Agenda
- Daily Control

### P1

- Quick Thought
- Command Center
- Sidebar
- Mood Check
- Habit Tracker
- Active Portfolio

### P2

- Meals Today
- Running / Muscle / Recovery
- Nutrient Balance
- Weight Loss

### P3

- Time Progress
- Anti-Rot Actions
- Challenges / Reward Focus

## Designregeln

- Dashboard ist Cockpit, kein Datenlager.
- Ein Screen hat genau einen Hauptfokus.
- Farbe ist semantisch und textgestützt.
- Visualisierung muss Entscheidung oder Verhalten unterstützen.
- `docs/design/dashboard-layout-lock.md` und `docs/design/content-state-system.md` bleiben als historische, teilweise überholte Referenzen erhalten. Sie dürfen die aktiven Surface- und Viewport-Verträge dieser Datei sowie `PRODUCT.md` nicht überschreiben.
- `docs/design/effects-and-motion.md` regelt spätere Motion-/Effect-Arbeiten ohne Layout-Shifts.
- Liquid Glass nur subtil und gezielt.
- Cards haben klare Aufgabe, Header, Datenhierarchie und begrenzte Mikrotexte.
- Hohe Informationsdichte ist erlaubt, aber nur mit P0–P3-Hierarchie.

## App-weiter Feedback-Standard

Jede erfolgreiche oder fehlgeschlagene sichtbare Mutation gibt verständliches,
zugängliches, app-weites Feedback. Erfolg erscheint als Toast oben rechts und
bleibt ungefähr fünf Sekunden sichtbar; Fehler bleibt lesbar, bis er verstanden
oder ersetzt wird. Der Toast ergänzt lokale Formfehler und ersetzt keine
persistente Ergebnisdarstellung nach Reload. Er darf weder Content noch
Controls verdecken und muss per Tastatur/Screenreader als Status erreichbar
sein.

## Surface Acceptance und Layout-Bounds

Ein Kernsurface ist nur akzeptiert, wenn seine sichtbaren Controls in der
aktuellen Manual-Ansicht einen echten, nachvollziehbaren Weg haben. `Prepared`,
dekorative CTA, unverbundene View-Umschalter oder Feedback ohne echte Aktion
sind für zugesagte Core-Controls nicht zulässig, außer der User hat genau
diesen Control ausdrücklich deferred.

- **No overlap:** Cards, Popover, Menüs, Dialoge, Toasts und feste Regionen
  dürfen sich nicht unbegründet überdecken; z-index ist keine Lösung für einen
  fehlerhaften Flow oder falsche Bounds. Besonders darf Nutrient Balance die
  Calendar-Region nicht überlagern.
- **No unjustified whitespace:** Freie Fläche braucht eine erkennbare
  Layout-, Lesbarkeits- oder Interaktionsfunktion. Entfernte Widgets und
  Bottom-Zone-Features dürfen keinen großen Restbereich hinterlassen.
- **Full-viewport cockpit:** Der primäre Desktop-Cockpit-View nutzt die
  tatsächlich verfügbare CSS-Viewport-Höhe des 4K-Arbeitsplatzes sinnvoll.
  Primäre Desktop-Flows dürfen keinen erforderlichen Body-Scroll erzeugen;
  interne, klar begrenzte Scrollregionen sind erlaubt. Health/Fitness folgt
  diesem Vertrag ebenfalls.
- **Viewport guards:** Zusätzlich zum primären 4K-CSS-Viewport müssen
  `1920×1080` und Mobile ohne horizontalen Overflow, abgeschnittene Controls,
  unbedienbare Touch-/Tastaturwege oder verdecktes Feedback funktionieren.
- **Anti-Slop acceptance:** Jede Card hat einen konkreten Job, jede sichtbare
  Action hat einen echten Folgeweg, P0 bleibt dominant und keine dekorative
  Dichte, Leerfläche, Chart oder Mikrocopy simuliert Produktfortschritt.

Die Surface Acceptance prüft Navigation, Mutation und Reload ebenso wie
Bounds, Leerflächen, Konsole/Hydration und V5-Design-Taste. Technische
Backend-Evidence ist notwendig, aber kein Ersatz dafür.

## Nicht erlaubt

- Neon-Gradient-Ästhetik
- Glassmorphism überall
- generische Tailwind-SaaS-Optik
- AI-Slop-Komponenten ohne Produktlogik
- Chart-Overload
- unlesbare Kontraste
- Gamification-Druck

## Detailquellen

- `docs/design/dashboard-v5.md`
- `docs/design/dashboard-layout-lock.md`
- `docs/design/design-tokens.md`
- `docs/design/component-system.md`
- `docs/design/visualization-rules.md`
- `docs/design/effects-and-motion.md`
- `docs/design/anti-ai-slop.md`
- `docs/design/figma-handoff.md`

Historische Detailquellen dürfen V5-Formensprache und belegte Referenzwerte
liefern. Ihre frühere WQHD-/Bottom-Zone- oder Time-Progress-Semantik ist keine
aktive Freigabe, wenn sie diesem Dokument oder `PRODUCT.md` widerspricht.

## Today role correction (R2-03)

Today is daily log / protocol / documentation. The chronological Activity Stream
is primary (roughly 60–65% desktop width), with local times, compact event rows,
quiet semantic accents and real source links. Opening Context, Delta Summary,
Decisions/Artifacts and Closing Review are supporting day records. No planner,
creation CTA, recurrence generator or edit form belongs in this surface.
Calendar owns planning/scheduling; Portfolio owns entity creation/management.
Empty Today says no activity has been recorded, without asking users to create
work. Current planned times must be distinguishable from recorded actions;
unknown historical timestamps must never be simulated.
