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

### Portfolio and Entity Workbenches (R2-04)

Portfolio is overview, navigation and cross-entity context. Keep the existing V5
summary, filters and active list dominant; the selected entity is a quick preview
with “Details öffnen”. Creation links lead to dedicated pages, including
Resources in its own knowledge area. No full inline entity form remains in the
Portfolio overview.

Portfolio is the sole compact entity list surface. Sidebar subnavigation and
Entity View use the same `type` query. A separate compact “Neu erstellen” card
sits above the independent Selected Entity inspector on desktop; mobile stacks
list, inspector, then create. The desktop workspace fills the remaining viewport
with internal list/inspector scrolling and compact rows.

Create and detail share a bounded
workbench layout and entity-specific fields: identity, context, state/planning,
relations, real work/evidence and lifecycle. Use clear section headings, existing
cyan/amber accents, restrained borders and readable input widths. Detail depth
may scroll vertically; mobile stacks the work and relations linearly. Status and
progress always have text labels and canonical evidence. Task-step percentages
refer only to steps; project task counts and skill evidence are not generic
entity completion percentages.

### Health detail pages (R2-05)

Health overview retains its accepted composition. Mental, Habits, Running and
Strength share the V5 header (domain, title, short description), compact factual
summary, dominant history/workspace and quieter management area. Use existing
surface/border/radius tokens, consistent compact actions and bounded form fields.
Mental uses violet, Habits cyan/violet and training coral as restrained accents.
Desktop default views are one-page workspaces at 1920×1080, 2560×1440 and
3840×2160: auto-height header/navigation/summary followed by a workspace that
fills the remaining main-content height. Use scoped shell height inheritance,
`min-height: 0`, aligned grid rows and restrained gaps. Cards fill their grid
area while content stays top-aligned. Growing lists scroll internally; do not
clip content with overflow hiding or stretch forms to fill space. Opened
edit/history disclosures may enter normal-flow depth; mobile stacks naturally.

Mental uses balanced pairs plus a full-width context row. Habits uses a 44/56
tracker/selected-analytics split with compact management/context below. Running
and Strength use a 62/38 main/rail split; history, trends/muscles, plans and
library fill the available height. The Health overview is not affected.

Mental shows current/latest mood, sleep, mood history and canonical review
context without a score or diagnosis. Habits owns selection, aggregated day,
week and month history plus secondary editing/archive; Dashboard owns creation
and quick Mood/Habit interaction. Running and Strength keep their existing
canonical sessions, plans and Calendar integration. Analytics are derived from
records and never stored as a second source. Health & Fitness is USER ACCEPTED on 2026-09-07; Nutrition is also USER ACCEPTED on 2026-09-07; R2-05 is closed.


### Nutrition workspaces (R2-05)

Nutrition follows the same V5 shell and restrained amber domain accent. At
1920×1080, 2560×1440 and 3840×2160, default workspaces use the remaining main
height, with growing lists and explicit inspectors scrolling internally.
Mobile stacks naturally without horizontal page overflow. Empty states are
compact and top-aligned inside the composed workspace.

Overview: Today Nutrition / Next Meal, Week Balance / Plan Adherence, then
Weight / Hydration / Recent Meals. Grocery is a compact status/link. No empty
priorities card or permanent creation form. Only real period projections may
be offered as tabs.

Meal Planner: compact target context, dominant selected-meal inspector and
secondary recipe selection above a seven-day, three-slot weekly matrix that
fills the remaining height. Slots expose selection, dragging and valid/occupied
drop states; details and temporal planning stay in the inspector. Recipe
assignment uses explicit Save Week / Reset; drag and accessible moves persist
the same Meal directly. Existing multiple Meals in a slot remain visible.

Recipes: browser and selected recipe share the available height. Search,
filters and sorting operate on persisted definitions. New Recipe opens a dialog;
editing and ingredient/lifecycle management open within selected context.
Grocery: generated items and unresolved Meals are two aligned workspace columns.
Aggregation follows the existing name/unit/note contract, with incompatible units
kept separate. No invented category taxonomy, stock or check-off controls.


## Active Navigation and Surface Hierarchy — Product Consolidation

Leitregel: **Central context, not central file ownership.** Bestehende V5-Tokens,
Sidebar-Komponenten und Core-Layouts bleiben maßgeblich. Keine neue Layout-Runde.

| Gruppe | Aktive Navigation |
|---|---|
| Primary | Dashboard, Inbox, Today, Calendar, Portfolio, Resources |
| Domains | Health & Fitness mit bestehenden Unterseiten; Ernährung mit Essensplan, Rezepte, Einkauf |
| Personal | Journal |
| Utility | Settings |

Portfolio behält Tasks / Projects / Goals / Skills. Personal ist eine ruhige
Gruppenüberschrift mit Journal als einzigem Ziel; kein Link zur alten Life-Suite.
Keine leeren Section Header. Coding, Education, Work, Notes, Inventory und
Wishlist sind aus aktiver Navigation entfernt; ihre direkten Legacy-Routen und
Daten bleiben erhalten. Area-Farben und Area-Kontextwerte bleiben verwendbar.

Dashboard = control; Inbox = triage; Today = daily memory;
Calendar = temporal planning; Portfolio = entity context;
Resources = knowledge/reference; Health/Nutrition = personal domain intelligence;
Journal = reflection/history; Skill Map = skill evidence/context graph.

Journal wird in diesem Pass nicht redesigned. Wiederkehrendes Journaling kommt
aus Recurring Task / Calendar, nicht aus Journal-eigener Recurrence. Spätere
Verläufe/Frequency müssen auf echten Einträgen beruhen; keine Gamification.

Skill Map ist das spätere Ziel Portfolio → Skills → Skill Map. Die aktuelle
Coding-Demo wird nicht als aktive Graph-Funktion umgehängt. Nodes zeigen reale
Evidence; Edges sind explizite Skill-Relationen oder sichtbar als derived
markierte gemeinsame Project/Task/Resource-Beziehungen. Keine Fake-Prozentwerte,
Fake-Edges oder Gap Detection ohne Target-/Prerequisite-Modell.

Nav-Proof: 1920×1080, 2560×1440 und 390×844, echte Klicks/Tastatur, Reload,
keine abgeschnittenen Links oder horizontaler Overflow. Der freie Desktop-Raum
zwischen kurzer Navigation und unten verankerten Settings ist Orientierung,
kein Anlass für neue Widgets. Bestehende Surface Acceptances bleiben erhalten;
Nutrition/R2-05 ist seit 2026-09-07 USER ACCEPTED. R2-07 Journal ist aktiv
und bleibt bis zur realen User-Abnahme pending.
