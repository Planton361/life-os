# Effects and Motion

Stand: 2026-06-18
Status: Active
Zweck: Regeln fuer ruhige, funktionale Microinteractions im Life OS V5 Dashboard.
Quelle der Wahrheit: `DESIGN.md`, `docs/design/dashboard-v5.md`, `docs/design/anti-ai-slop.md`, `docs/engineering/performance-strategy.md`.
Gilt fuer: Dashboard-Effekte, Hover-/Focus-Zustaende, spaetere Microinteractions und Motion-Reviews.
Nicht gilt fuer: neue visuelle Richtungen, dekorative Experimente oder grosse Animation-Systeme.

## Ziel

Motion soll Steuerung unterstuetzen, nicht Aufmerksamkeit erzwingen. Erlaubt sind kurze, leise Microinteractions, die Orientierung, Fokus, Feedback oder Bedienbarkeit verbessern.

## Erlaubte Eigenschaften

Diese Eigenschaften duerfen fuer subtile Effekte genutzt werden:

- `opacity`
- `transform`
- `border-color`
- `background-color`
- `color`
- sehr subtile `box-shadow`-Aenderungen

`transform` darf nur fuer kleine, nicht layoutveraendernde Bewegungen genutzt werden. Hover- und Focus-Zustaende muessen ruhig bleiben und duerfen keine Widget-Hierarchie verschieben.

## Verbotene Muster

Nicht erlaubt:

- `width`-/`height`-Animationen
- `grid`-/`gap`-Animationen
- `margin`-/`padding`-Animationen
- `top`-/`left`-/`right`-/`bottom`-Animationen
- Neon-/Glow-Show
- Parallax
- Particle Effects
- animierte Gradients ohne konkreten Nutzen
- permanente Pulsing-Loops
- Effekte, die P2/P3 lauter als P0/P1 machen
- Animationen, die Layout-Shifts, Textspruenge oder Scroll-Jumps erzeugen

## Pflichtregeln

- `prefers-reduced-motion` muss respektiert werden.
- Es darf keine Layout-Shifts geben.
- Keine Client Components nur fuer Deko.
- Effekte muessen P0/P1 unterstuetzen.
- P2/P3 bleiben leise.
- Status darf nie nur ueber Farbe oder Bewegung vermittelt werden.
- Focus States muessen sichtbar bleiben.

## P0/P1-Hierarchie

Effekte duerfen Today Agenda, Daily Control, Quick Thought, Command Center, Sidebar, Mood Check, Habit Tracker und Active Portfolio beim Scannen oder Bedienen unterstuetzen. Sie duerfen keine Konkurrenz zu Today Agenda oder Daily Control erzeugen.

P2/P3-Effekte sind nur erlaubt, wenn sie passives Feedback geben und visuell untergeordnet bleiben.

## Performance-Regeln

- Server Components bleiben Default.
- Client Components nur fuer echte Interaktion, Eingabe oder lokalen UI-State.
- Keine dauerhaften Animation-Loops auf grossen Flaechen.
- Keine teuren Blur-/Backdrop-Stacks.
- Keine Animationen auf sehr vielen Listenelementen gleichzeitig.
- Transition-Dauern kurz halten und keine Main-Thread-lastigen Eigenschaften animieren.
- Dashboard muss auf Laptop fluessig bleiben.
- Mobile darf keine horizontalen Overflows oder Scroll-Jumps erzeugen.

## Accessibility-Regeln

- `prefers-reduced-motion: reduce` muss Bewegungen abschalten oder deutlich reduzieren.
- Hover-Effekte brauchen gleichwertige Focus-Zustaende.
- Icon-only Controls brauchen `aria-label`, falls spaeter echte Buttons entstehen.
- Kontrast darf durch Hover-/Motion-Zustaende nicht schlechter werden.
- Bewegte oder blinkende Elemente duerfen keine Pflichtinformation transportieren.
- Keine permanente Bewegung im Blickzentrum.

## DoD fuer Motion

- [ ] Effekt hat einen konkreten Bedienungs- oder Orientierungszweck.
- [ ] Effekt nutzt nur erlaubte Eigenschaften.
- [ ] Keine Layoutwerte wurden animiert.
- [ ] `prefers-reduced-motion` ist beruecksichtigt.
- [ ] P0/P1-Hierarchie bleibt erhalten.
- [ ] P2/P3 bleiben ruhig.
- [ ] Keine neue Neon-/AI-Slop-Optik.
- [ ] Keine unnoetige Client Component wurde eingefuehrt.
- [ ] `pnpm lint` wurde ausgefuehrt.
- [ ] Bei sichtbarer UI-Aenderung wurde `pnpm qa:dashboard` ausgefuehrt, sofern moeglich.
