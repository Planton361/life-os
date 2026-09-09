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
Journal = reflection/history; Skill/Goal Graph = optional depth after R2-11 decision.

Der bestehende Journal-Workspace folgt dem unten beschriebenen Vertrag;
R2-07-Weiterarbeit pausiert bis zur R2-11-Entscheidung. Wiederkehrendes Journaling kommt
aus Recurring Task / Calendar, nicht aus Journal-eigener Recurrence. Spätere
Verläufe/Frequency müssen auf echten Einträgen beruhen; keine Gamification.

R2-08 Skill Map ist bis R2-11 pausiert. Portfolio → Skills → Skill Map bleibt
ein nativer IA-Kandidat; R2-17 kann ihn nach expliziter Entscheidung ersetzen.
Die aktuelle Coding-Demo wird nicht als aktive Graph-Funktion umgehängt. Nodes zeigen reale
Evidence; Edges sind explizite Skill-Relationen oder sichtbar als derived
markierte gemeinsame Project/Task/Resource-Beziehungen. Keine Fake-Prozentwerte,
Fake-Edges oder Gap Detection ohne Target-/Prerequisite-Modell.

Nav-Proof: 1920×1080, 2560×1440 und 390×844, echte Klicks/Tastatur, Reload,
keine abgeschnittenen Links oder horizontaler Overflow. Der freie Desktop-Raum
zwischen kurzer Navigation und unten verankerten Settings ist Orientierung,
kein Anlass für neue Widgets. Bestehende Surface Acceptances bleiben erhalten;
Nutrition/R2-05 ist seit 2026-09-07 USER ACCEPTED. R2-09 External Resource References ist aktiv; Journal bleibt bis zur realen User-Abnahme pending.

## Journal Workspace (R2-07)

Journal = persönliche chronologische Reflexion und Verlauf. Deutsche Labels,
ruhiger violetter Accent, bestehende matte V5-Surfaces und klare Borders.
Header mit „Neuer Eintrag“, kompakter Faktenstreifen (Heute, letzte 7 Tage,
Monat), dann dominanter Verlauf links und ausgewählter Eintrag rechts.
Desktop ungefähr 57/43; 1920×1080, 2560×1440 und 3840×2160 verwenden die
verbleibende Viewport-Höhe. Liste und Inhalt scrollen intern. Bei leerem Verlauf
ohne Auswahl bleiben die Panels kompakt in ihrer Inhaltshöhe statt leer bis zum
Viewport-Ende zu wachsen. Mobile stapelt linear und darf vertikal scrollen;
lange Listen/Inhalte sind zusätzlich auf 65dvh begrenzt, damit Auswahl und
Aktionen erreichbar bleiben. Kein horizontaler Overflow.

Create/Edit/Detail verwenden begrenzte native Dialoge mit Fokus, Escape und
sichtbaren Beschriftungen. Kein dauerhaftes Create-Formular. Lange Titel bleiben
in der Liste begrenzt und sind im Detail vollständig lesbar; freier Inhalt
behält Absätze. Keine erfundenen Tags/Relationen, Scores, Streaks oder Charts.
Keine Entwickler-/Datenquellen-Copy in der Primärfläche. Recurrence gehört zu
Task/Calendar; Notes zu Resources, strukturierte Reviews bleiben eigenständig.
R2-07 ist bis zur R2-11-Architekturentscheidung pausiert; USER ACCEPTANCE STATUS:
PENDING. Dieser Vertrag beschreibt die erhaltene Life-OS-Oberfläche, keine bereits
beschlossene Verlagerung von Journal-Text nach Obsidian.

## Project Work Artifacts and References (R2-09)

Project Detail is a composed read-first workbench, not a card dashboard. Identity,
description, state/priority/Area, optional deadline, Edit and lifecycle overflow
share one header; Next Step is a compact work cue directly below identity.
“Structure with surfaces, not card fragmentation.” Project Detail has exactly
three structural surfaces: Header, shared Main Workbench and Supporting Surface.
Each uses an elevated matte background, subtle outer border and consistent radius.
The header groups metadata below identity, retains deadline and separates Next
Step within the same surface. Main Workbench joins Work (roughly 67%) and the
Primary/Context rail (33%) with a full-height vertical divider. Task header/rows
and Primary/Context use horizontal dividers; no nested cards. Supporting Surface
joins Additional Artifacts and References in two columns with a vertical divider.

“Fill the information hierarchy, not the viewport” still applies: no viewport
height fill. Main surface height follows actual tasks or rail content; long task
lists scroll within a bounded maximum. Short/empty lists remain compact inside
the shared structure. Background begins after Supporting Surface. Mobile stacks
Header, Work, Primary/Context, Additional Artifacts, References; vertical dividers
become horizontal separators. Readable headings, emphasized Primary title and
human-readable Resource types remain; no internal relation/role copy.

Milestones live inside the left Work section, never as top-level cards. Stage
headings show explicit state, optional date and actual done/total task counts;
Task rows retain existing ordering. Open/current stages precede completed stages,
using persistent order within each group. Unassigned Tasks remain visible under
“Ohne Milestone”, including Projects predating Milestones. Add/edit/assign/order/
archive use explicit disclosures and existing forms. Current stage is text-labelled
“Aktuell”; completed stages are visually secondary. Archived stages are readable
history in a disclosure. Task Detail has compact milestone context and an optional
assignment disclosure. Other projections retain their existing focused purpose.

“Bearbeiten” opens the existing editor in a bounded header disclosure; “⋯”
exposes lifecycle actions with the accessible name “Project verwalten”.
Artifact and relation controls open inline only on explicit action, with
expanded state, keyboard operation, Escape/close and focus return. There is no
management footer. Ordinary Project deep links open readable values; the existing
explicit Resource-create return context opens artifact addition with the created
Resource selected. Create flow, roles, schema, relation semantics and Portfolio
Overview remain unchanged.

Artifact entries show existing type, title, short description, “Extern öffnen ↗”
and “Details öffnen”. Role changes are explicit and use bounded existing selects;
Primary is never inferred. Empty state is compact: “Noch kein Arbeitsartefakt
verknüpft.” plus existing-link and new-reference actions. References never appear
in Work Artifacts until explicitly assigned. Archived designations are labelled
history and never presented as active Primary. Resource Detail displays Project
use labels alongside ordinary Task/Skill context.

Use existing matte surfaces/tokens, semantic accents, visible keyboard focus and
new-tab Accessible Names. Mobile stacks with no horizontal overflow. No provider
logos/selectors, login/sync controls, previews or specialized embedded editors.
R2-09 remains active with USER ACCEPTANCE STATUS: PENDING.


## Work Graph und Graph-Client — geplanter Designvertrag

R2-09 bleibt aktiv. R2-10 ergänzt später vorhandene Project-/Task-Workbench-
Regionen um textgestützte Ready-/Blocked-Zustände, konkrete Vorgänger und parallele
Pfade. Kein Canvas in R2-10, keine neue Dashboard-Komposition. Stage-Reihenfolge,
Zugehörigkeit, Dependency, Evidence, Reference und Work Artifact müssen visuell
und sprachlich unterscheidbar bleiben. Echte Counts ersetzen Gesamtprozentwerte.

Ein späterer Graph ist optionaler Deep-Work-Modus. Next Action, Blockierungsgrund
und Project-Wiederaufnahme sind wichtiger als Graph-Größe oder dekorative Cluster.
Listen/Detailwege bleiben vollständig per Tastatur bedienbar; Farbe, Position und
Kanten allein dürfen keine Fachinformation tragen. Bestehende V5-Hierarchie,
4K-/1920×1080-/Mobile-Guards und Surface Acceptance gelten für Life-OS-Flächen.

Die R2-11-Entscheidung bestimmt den Client; dieser Vertrag bestellt keine native
Canvas-Library. Bei Option A trennt R2-13 regenerierbares Project Canvas von
Personal Canvas. Position, Größe, Farbe, Gruppen, Zoom, freie Notizen und
explorative Kanten sind user-owned Presentation State. Regeneration darf diese
nicht überschreiben. Kanonische Kanten sind als solche erkennbar; eine gezeichnete
Kante erzeugt keine Dependency. R2-17 nutzt echte Evidence/Practice und Goal-
Outcome-Kontexte; keine Fake-Edges oder Mastery-Scores. Journal bleibt sichtbar,
seine spätere Text-Ownership ist bis R2-11 offen.
