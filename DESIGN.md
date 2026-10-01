# DESIGN.md

Stand: 2026-06-17  
Status: Active  
Zweck: Operative Designquelle für Life OS.  
Quelle der Wahrheit: Diese Datei + `docs/design/*`.  
Gilt für: UI, Dashboard, Komponenten, visuelle Reviews.  
Nicht gilt für: alte V1–V4-Dashboardvarianten.

## Durable work-graph / knowledge ownership design

Product Target v0.4 is accepted: Life OS / PostgreSQL owns operational context
and planning truth, including Projects, Goals, Skills, Milestones, Tasks,
Dependencies and Relations. `Resource` owns Life-OS reference / Work-Artifact
identity; Obsidian owns long-form Knowledge Content and Notes. A bound note uses
`life_os_id` as stable identity and a vault-relative path only as a locator.
Rename/move does not change identity. No watcher, sync, write-back or personal
Vault access is implied by this design contract.

Project, Goal and Skill remain separate categories. They share a calm
Higher-order entity → domain milestones → Tasks → progress interaction pattern,
but their Milestone, Outcome, Evidence and Target semantics remain distinct.
Only Task Dependencies communicate execution READY/BLOCKED state. Any future
AI control is read-only unless a separately accepted command contract exists.

Current product sequencing and operative status are not design truth; read them from `ROADMAP.md` and GitHub Project #3/Issues. This file owns durable visual/interaction constraints only.

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

Dashboard = Day Control; Inbox = triage; Today = day history;
Calendar = planning; Portfolio = higher-order work context;
Resources = Life-OS reference/artifact context; Health/Nutrition = personal
domain intelligence; Journal = Life-OS reflection/history; Obsidian = Knowledge
Content; Skill/Goal Graph = optional depth on real target-model semantics.

Der bestehende Journal-Workspace folgt dem unten beschriebenen Vertrag;
Journal bleibt vollständig Life-OS-owned. R2-07-Weiterarbeit bleibt für
fehlende Relations-/Today-Tiefe pausiert. Wiederkehrendes Journaling kommt
aus Recurring Task / Calendar, nicht aus Journal-eigener Recurrence. Spätere
Verläufe/Frequency müssen auf echten Einträgen beruhen; keine Gamification.

R2-08 Skill Map bleibt für die spätere Target-Model-Umsetzung pausiert. Portfolio → Skills → Skill Map ist
ein retained IA-Kandidat; R2-17 soll ihn nach expliziter Reconciliation ersetzen statt einen zweiten Graph zu erzeugen.
Die aktuelle Coding-Demo wird nicht als aktive Graph-Funktion umgehängt. Nodes zeigen reale
Evidence; V1 speichert nur explizite Skill-Relationen. Gemeinsame
Project/Task/Resource-Kontexte dürfen höchstens als klar markierte Hinweise,
nicht als Graph-Edges, erscheinen; V1 speichert nur
`prerequisite`- und `related`-Skill-Edges, keine impliziten gemeinsamen
Kontextkanten. Keine Fake-Prozentwerte,
Fake-Edges oder Gap Detection ohne Target-/Prerequisite-Modell.

Nav-Proof: 1920×1080, 2560×1440 und 390×844, echte Klicks/Tastatur, Reload,
keine abgeschnittenen Links oder horizontaler Overflow. Der freie Desktop-Raum
zwischen kurzer Navigation und unten verankerten Settings ist Orientierung,
kein Anlass für neue Widgets. Bestehende Surface Acceptances bleiben erhalten;
Bestehende Surface-Acceptance-Evidenz bleibt erhalten; Journal bleibt bis zur realen User-Abnahme pending. Operative Block-/Issue-Status gehören nicht in diesen Designvertrag.

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
R2-07 bleibt für fehlende Relations-/Today-Tiefe und die abschließende User
Acceptance pausiert; Journal-Ownership ist im akzeptierten Target Life-OS-owned.
Dieser Vertrag beschreibt die erhaltene Life-OS-Oberfläche; eine Verlagerung von
Journal-Text nach Obsidian ist nicht vorgesehen.

## Hybrid Goal Workbench (#48)

Issue #48's accepted target (comment 5860230666) supersedes the visible #44/#46
composition. The #39/#41 domain, dependency and explicit-review semantics remain
binding. #44/#46 remain evidence for user language and progressive planning.

### Goal Identity

A full-width calm header shows Goal/status, title, short outcome, why, horizon,
target date and `Planung bearbeiten`. Use canonical data only. No hero/background
image, illustration, quote or invented motivational content.

### Desktop composition

Below the header, use a real two-column workbench: dominant left work region
(roughly 58–64%), quieter right context rail (roughly 36–42%). Keep both
top-aligned inside one shared desktop workbench frame. The frame has a bounded
minimum height derived from the available viewport below the shell and Goal
identity; it grows with real content, stays in normal document flow and never
clips or adds an internal scroll area just to fill height. Anchor the secondary
footer actions to the lower edge of this shared frame in sparse states.

Stretch the shared frame, not its modules: Current Work, the next action, the
roadmap and Goal Review preview remain content-sized. Keep the roadmap top-led;
do not add artificial distance between its current and final review points.

Left: **Aktuelle Arbeit** with a short orientation sentence, `AKTUELL` / current
Zwischenziel and its intended outcome, then `ALS NÄCHSTES` with the one canonical
guidance action. The selected READY Task appears once with `Aufgabe öffnen`.
Exclude it from equivalent secondary Task rows while retaining its planning
association controls. Other current work is secondary; BLOCKED has readable real
Task-dependency reasons and completed work is subdued. Optional Project context
remains quiet. No separate JETZT panel.

Right upper: **Dein Weg zum Ergebnis**. Use a restrained vertical roadmap with
completed/current/future intermediate outcomes and final `Ziel prüfen`. Optional
short outcome/date context is allowed. No Task titles, Task/criterion counts,
READY/BLOCKED summaries or generic percentages. With one intermediate result,
keep an intentional compact card rather than a trivial inline fragment.

Right lower: **Ziel prüfen**. During execution this is a quiet preview explaining
explicit final review, with no competing primary CTA, counts or live success
progress. At final review the active current decision asks `Ist dein Ziel erreicht?` and shows canonical criteria under `Erreicht, wenn …`. Do not duplicate
criteria across equal-weight regions. Reopen stays secondary after achievement.

Secondary depth uses restrained `Verlauf ansehen` and `Weitere Optionen` links.

### V5 tone and hierarchy

Use `--bg-app` for the application, `--surface-1` for identity/context,
`--surface-2` for Current Work and bounded `--surface-3` for its next action.
Use restrained borders/dividers and existing spacing. Cyan is semantic for
Current/focus/the primary CTA. Do not use a black JETZT panel, new palette,
gradient, neon, glow or full cyan frame. Status always has text, not color alone.

### Planning and review

Retain one explicit `Planung bearbeiten` / `Fertig` mode with progressive
questions:

```text
Was willst du erreichen?
→ Woran erkennst du, dass es geschafft ist?
→ Was soll als Nächstes wahr sein?
→ Was kannst du konkret als Nächstes tun?
```

Reuse existing Goal identity, Outcome Criteria, Milestone and Task writes.
Management remains disclosed by question; no persisted wizard state or second
planning surface. Criteria are editing/review depth, not an execution progress lane.

Task completion never completes a Milestone or Goal. Intermediate-result review
explicitly confirms achievement or adds work. Final Goal Review explicitly
achieves the Goal against canonical criteria or continues planning. Preserve
exactly one Current, Task-only READY/BLOCKED and append-only history/evidence.

### Responsive and accessibility

Narrow/mobile order:
`Goal identity → Aktuelle Arbeit → Dein Weg zum Ergebnis → Ziel prüfen → secondary depth`.

At 3840×2160 and 1920×1080, preserve the desktop split and use the bounded shared
frame; at 390×844, disable its minimum and stack naturally without artificial
stretching, horizontal overflow or clipped controls. Keep one obvious primary
action, logical headings/regions, visible keyboard focus, disclosure/dialog
operation and focus return after closing planning or a disclosure.


## Project Work Artifacts and References (R2-09)

Project Detail is a composed read-first workbench, not a card dashboard. Identity,
description, state/priority/Area and optional deadline share one header; secondary
management is grouped behind overflow. The #72 target places compact result/Criteria
after identity, then Project-Fokus as a subordinate orientation cue before Work.
“Structure with surfaces, not card fragmentation.” Project Detail has exactly
three structural surfaces: Header, shared Main Workbench and Supporting Surface.
Each uses an elevated matte background, subtle outer border and consistent radius.
The header groups present metadata below identity and retains deadline. Main
Workbench joins Work (roughly 67%) and the
Primary/Context rail (33%) with a full-height vertical divider. Task header/rows
and Primary/Context use horizontal dividers; no nested cards. Supporting Surface
keeps Additional Artifacts and References as one compact secondary summary under
#72, without two equal-weight empty boxes.

“Fill the information hierarchy, not the viewport” still applies: no viewport
height fill. Main surface height follows actual tasks or rail content; primary
Project content has no internal-scroll trap. Short/empty lists remain compact
inside the shared structure. Background begins after Supporting Surface. Mobile
follows the #72 semantic reading order with compact context/support rather than
stacking every desktop box; vertical dividers become horizontal separators.
Readable headings, emphasized Primary title when present and
human-readable Resource types remain; no internal relation/role copy.

Milestones live inside the left Work section, never as top-level cards. Stage
headings show explicit state, optional date and quiet actual task counts only when
useful for orientation; count semantics remain unchanged.
Task rows retain existing ordering. Open/current stages precede completed stages,
using persistent order within each group. Unassigned Tasks remain visible under
“Ohne Milestone”, including Projects predating Milestones. Add/edit/assign/order/
archive use bounded secondary dialogs under #72. Current stage is text-labelled
“Aktuell”; completed stages are visually secondary. Archived stages are readable
history in a disclosure. Task Detail has compact milestone context and an optional
assignment disclosure. Other projections retain their existing focused purpose.

“⋯” exposes secondary management/lifecycle actions with the accessible name
“Project verwalten”. Existing edit, Artifact and relation operations use the #72
bounded interaction/canonical route matrix, with keyboard operation, Escape/close
and focus return rather than major inline expansions. There is no
management footer. Ordinary Project deep links open readable values; the existing
explicit Resource-create return context opens artifact addition with the created
Resource selected. Create flow, roles, schema, relation semantics and Portfolio
Overview remain unchanged.

Artifact entries show existing type, title, short description, “Extern öffnen ↗”
and “Details öffnen”. Role changes are explicit and use bounded existing selects;
Primary is never inferred. Empty context collapses under #72, with one quiet
secondary setup/management entry rather than competing add actions. References never appear
in Work Artifacts until explicitly assigned. Archived designations are labelled
history and never presented as active Primary. Resource Detail displays Project
use labels alongside ordinary Task/Skill context.

Use existing matte surfaces/tokens, semantic accents, visible keyboard focus and
new-tab Accessible Names. Mobile stacks with no horizontal overflow. No provider
logos/selectors, login/sync controls, previews or specialized embedded editors.
R2-09 is USER ACCEPTED on 2026-09-09; preserve its macro structure and semantics.
The USER ACCEPTED #72 target below refines presentation and secondary interactions;
it is not implementation evidence for the current surface.


## Accepted Project Depth & Skill Development composition — #65

Issue #65 USER ACCEPTED the Project Depth and Skill PP2 visual/product target on
2026-09-29.

### Project Depth composition

The USER ACCEPTED R2-09 macro structure remains binding:

1. Project identity/header;
2. shared Work + context surface on desktop;
3. Supporting surface for additional artifacts and references.

The refinement enriches that structure rather than replacing it. The #67
USER ACCEPTED data contract deepens this workbench with the result and criteria;
it does not introduce a second Project surface.

Header:
- title/status and present priority/Area/deadline remain; actions follow #72 hierarchy;
- Description stays background context;
- **Gewünschtes Ergebnis** and optional `Fertig, wenn …` sit in the header as
  Project-owned result/acceptance depth;
- Project-Fokus remains visually separate from both result and executable Task
  guidance.

Work/context:
- Project Milestones and Tasks remain the dominant work region;
- existing one-READY / multiple-READY / all-BLOCKED / empty guidance stays
  canonical;
- the right context rail keeps Primary Work Artifact, Goal/Area and derived Skill
  provenance;
- only quiet `Abschluss prüfen` opens the focused Project Review under #72,
  without a permanent preview lane competing with Work;
- criterion scope removal is a visible Archive with a reason followed by a fresh
  Review read, never a hidden exclusion inside the Review;
- successful Project completion does not automatically change Tasks or Project
  Milestones.

Supporting:
- Additional Work Artifacts and Resources/References remain the lower supporting
  surface;
- decisions/open questions use existing Resource/reference semantics rather than a
  new log stack;
- immutable Review history and Reopen remain secondary, separate from current
  Project work.

Empty Project:
- exactly one dominant `Erste Task anlegen` action;
- result/milestones/relations remain optional secondary depth;
- avoid repeated `0/0` and empty-management chrome.

Mobile preserves the order:
Project identity → result/criteria → Project-Fokus → Work → context →
Supporting → Review/History actions. No viewport-fill requirement, horizontal
scroll or primary-content internal-scroll trap. #72 specifies compact mobile
summaries instead of mechanically stacking desktop management blocks.

### Accepted Project Detail Redesign interaction target — #72

The [decision package](https://github.com/Planton361/life-os/issues/72#issuecomment-5910226294)
was [USER ACCEPTED](https://github.com/Planton361/life-os/issues/72#issuecomment-5912775840)
on 2026-09-30. This is the replacement Product/UX target for the failed #69
surface acceptance, not acceptance of that implementation. PRODUCT owns the
read-first mental model, state/action hierarchy and normal `/tasks/new` reuse.
The [#77 corrected Task-create target](https://github.com/Planton361/life-os/issues/77#issuecomment-5922104190)
was [USER ACCEPTED](https://github.com/Planton361/life-os/issues/77#issuecomment-5922117427)
on 2026-10-01 and corrects only the Task-create part of #72. All unrelated #72
hierarchy, management, Review/History and V5 decisions remain binding.

The existing global `/tasks/new` is the canonical normal Task-create UX. Keep
`Task erstellen`, `Bewusst erstellen`, `Task zuerst festhalten`, Title-first
capture, `Weitere Angaben (optional)`, and the existing field hierarchy, labels
and inner visual composition. The accepted #82 refinement below changes only the
responsive outer width. Project/Milestone/Goal origin changes only validated
prefills, origin metadata and Save/Cancel destinations. Project, Project Milestone
and Goal remain in the existing fields under `Weitere Angaben (optional)`.
No Project-specific heading, field order, disclosure state, separate Task-create
component or extra top context summary/chip/link/capture block is allowed.
Title-first capture itself remains accepted. PRODUCT retains the required owning
Project, valid Project switching, incompatible Milestone clearing, backlog,
Goal inheritance/conflict and Save/Cancel semantics. The #77 correction is an
accepted target; #80 / PR #81 implemented its origin parity. That implementation
does not establish final #69 surface acceptance or deliver the #82 refinement.

The R2-09 identity → shared Work/context → Supporting macro model stays intact;
management must not dominate reading or execution.

Desktop reading order is identity → desired result → Project-Fokus → next
executable work → Tasks/Milestones → compact context → supporting depth →
Review/History depth. Identity has title/status, restrained present metadata and
one overflow entry; export stays a secondary utility. The result is unboxed or
lightly bounded directly below identity. Project-Fokus is a compact subordinate
line/block, distinct from result and Task guidance. Work remains visually dominant
over result management, context, supporting content, Review and History.

`Gewünschtes Ergebnis` is readable at a glance; `Fertig, wenn …` shows up to three
read-only acceptance statements, then `N weitere` read-only expansion. No
checkbox/progress interpretation or per-Criterion Manage controls. One quiet
result/Criteria entry opens management. Empty result/Criteria collapse to a compact
setup action; result without Criteria keeps quiet `Kriterien ergänzen`.

Work has heading and Task/Milestone structure. Exactly-one READY appears once as
the visually primary actual Task row, without duplicate title guidance above it.
Multiple READY preserves user choice; all BLOCKED shows
blocker context and access to the affected list; empty Work has only dominant
`Erste Task anlegen`. Do not simultaneously emphasize total/done Task and Milestone
fractions, READY/BLOCKED counts and multiple add/manage links. No redundant metric
strip of Task/Milestone/READY/zero-completion signals; one quiet summary may remain
where decision-relevant. Task title/actions dominate technical metadata. Empty
Milestone is one quiet line; Backlog heading appears only when backlog Tasks exist.
No Progress Model change.
Milestone rows keep title, restrained status/date, Tasks and one quiet overflow.
One Work `Task hinzufügen` uses normal `/tasks/new` with optional Milestone context;
an optional Milestone-local `+` may remain only if quiet and free of repeated
button chrome. Milestone management and assignment stay secondary.

Desktop context may use one compact rail for present Goal, Area, derived Skills
and Primary Artifact, with one quiet management entry. Omit absent rows unless
absence is itself decision-relevant. Supporting uses one `Weitere Inhalte`
summary: compact populated counts/first relevant items and an explicit secondary
view/manage entry. Empty supporting is quiet text/summary, not two large boxes.
Existing Artifact roles and canonical Resource navigation remain unchanged.

Without meaningful Goal/Area/derived Skill/Artifact or other accepted context,
collapse the entire Context rail and give Work the released width. A lone
`Beziehungen verwalten` link moves to quiet secondary management rather than
reserving an empty column. Present context uses one compact subordinate rail
without large empty vertical space.

#### USER ACCEPTED #82 Task interaction and create-width refinement

The [revised #82 target is USER ACCEPTED](https://github.com/Planton361/life-os/issues/82#issuecomment-5934881871)
on 2026-10-01 and **not yet implemented** on the current baseline. These density,
interaction and outer-width refinements preserve V5, accepted inner Task-create
composition and existing domain/security semantics. Review remains quiet and
separated below Work; no Review redesign is introduced.

For an eligible active Project Task row, `Erledigt` is the execution action,
`Bearbeiten` is secondary modal edit, and `Details` is tertiary depth navigation.
Task title stays visually strongest. This specifies hierarchy, not literal button
styling. Existing lifecycle restrictions determine action availability; completion
is never embedded inside Edit. On mobile, actions wrap/stack without overflow.

Project Detail and Task Detail share one focused, bounded `Task bearbeiten`
dialog using the canonical editable fields/hierarchy. No normal inline or
page-expanding edit and no bespoke Project Task editor. Move focus inside and trap
it, keep background non-interactive, provide explicit close/cancel and Escape,
write nothing on dismissal, and return focus to the trigger. Save success closes,
revalidates and shows feedback; server/validation errors remain visible and
preserve input where supported. Bounded internal scrolling may handle tall
content while title/actions stay usable. Mobile uses safe margins and has no
horizontal overflow.

Canonical `/tasks/new` keeps its Title-first headings, labels, field ordering,
disclosure behavior, prefills, validation and Save/Cancel semantics. Its outer
width follows available viewport/aspect ratio and readable vertical focus, not a
fixed viewport percentage:

- ordinary desktop is materially wider than baseline `main 1f61f9d7`, with an
  approximate maximum content width of 1280–1440px;
- near a 1440px viewport, use normal approximately 32–48px page gutters where
  available;
- at 1920px, remain centered and bounded, wider than baseline but not fullscreen;
- ultrawide caps instead of stretching indefinitely; portrait/tall layouts
  preserve vertical reading focus;
- optional details remain two columns while each field is comfortably readable;
- mobile stays single-column with approximately 16px safe gutters, unchanged
  field order and no horizontal overflow.

Exact CSS primitives remain an implementation detail. Create stays a dedicated
page; Task Detail stays depth navigation and its Edit entry opens the same modal.

#### Bounded interaction matrix

| Operation | Accepted placement and trigger |
|---|---|
| Result + Criterion create/edit/reorder/archive | One bounded dialog from quiet result/Criteria entry; result, list and management together, not one modal per Criterion |
| Project metadata/status | Existing edit/manage interaction behind one secondary entry; no expanding inline status block |
| Milestone create/edit/reorder/archive | Bounded dialog from Work; never push Task content down through inline form expansion |
| Task assignment to Milestone | Same Work-management dialog or focused secondary dialog; no permanent form |
| Task edit from Project Detail or Task Detail | Same canonical focused `Task bearbeiten` modal; lifecycle controls stay separate |
| Relations/context | Bounded dialog or existing canonical management route; read surface displays current compact context |
| Resource/Artifact add/manage | Existing canonical route/dialog where available; quiet entry from read summary, no duplicate custom editor |
| Project Review | Dedicated focused desktop dialog; full-screen/near-full-screen dialog on mobile |
| Immutable History | Explicit secondary History dialog/drawer on desktop; full-screen secondary view/dialog on mobile, retaining canonical pagination |

Result/Criteria dialog: approximately 640–760px maximum width on desktop and
80–85dvh maximum height; internal scroll is for management content only. Mobile
uses near-full-width bounded dialog/sheet with safe scrolling below viewport
height. Save executes the explicit operation; Cancel writes nothing; Escape
cancels non-destructive interaction and returns focus. Criterion Archive requires
its explicit reason in the same dialog and clearly signals irreversible meaning.
Secondary edits must not materially reshape the Project reading surface.

#### Review and History presentation

Normal active Project shows only quiet `Abschluss prüfen`, near the result/context
boundary or end of Work. Opening Review temporarily focuses that interaction;
the background Project remains context. Dialog order:

1. desired result snapshot;
2. continue / complete decision;
3. Criteria assessment;
4. current-cycle archived scope acknowledgement when applicable;
5. open Task/Milestone context and required acknowledgement/disposition;
6. optional Resource evidence;
7. rationale;
8. Save / Cancel.

All P-DATA preconditions remain unchanged. Preview/Cancel writes nothing;
stale/conflict/error keeps the draft visible and requires conscious reload and
reconfirmation. Escape returns focus to `Abschluss prüfen`. Successful Save
closes Review and refreshes Project; `continue` returns to the normal current
work surface without permanently expanding History.

Completed Project shows compact `Abgeschlossen`, canonical Review date and short
rationale/result summary. `Abschluss-Review ansehen` has moderate informational
emphasis and opens secondary History directly at the canonical current completion
Review, even beyond the first pagination window. `Verlauf ansehen` opens newest
History. Reviews, lifecycle events, amendments and Resource snapshots remain
immutable and paginated; full History is not permanently rendered on the main
page. Amendments start inside History. Reopen is explicit and secondary in the
completed summary. After Reopen, current work dominates and prior completion is
secondary History. Legacy completed shows `Abgeschlossen ohne gespeicherten
Review`, with Reopen and no fabricated Review/date. Archived is read-only with
History/context navigation and no write CTA hierarchy.

#### Responsive and accessible interaction

- Required viewports: 3840×2160, 1920×1080 and 390×844. Content drives height;
  no viewport fill, horizontal overflow, clipping/overlap or primary-content
  internal-scroll trap.
- Mobile order: identity → desired result + Criteria summary → Project-Fokus →
  next executable work → Tasks/Milestones → context summary → supporting depth →
  Review/History actions. No side rail or mechanical desktop-management stacking;
  one primary CTA at a time. Long secondary content may scroll inside its bounded
  dialog, never inside the primary Project work region.
- Reuse established accessible dialog primitives, labelled title and description
  (`aria-describedby` when present). Move focus into dialogs, trap it while modal,
  support keyboard operation and Escape for non-destructive interactions, provide
  explicit Cancel and return focus to the originating control on close.
- Keep visible field labels, visible focus, logical headings and named Work
  region. Status/readiness is readable without color; overflow has an explicit
  accessible name. No hover-only controls.
- Announce success/pending/errors through visible text and status/alert semantics;
  pending disables duplicate submit. Validation/error/stale state retains entered
  data. Destructive confirmation remains explicit where required by existing
  lifecycle/Archive rules.
- Keep matte V5 navy, existing tokens/components and restrained semantic accents;
  no neon/gradient/glow, fake percent or progress ring.

#### Patterns to remove in the bounded DELIVER repair

- Inline expanding Result Editor and Criterion create/edit management.
- Per-Criterion `Kriterium verwalten` in normal read mode.
- Inline expanding Status Manager.
- Permanent large Review lane and permanently fully rendered immutable History.
- Large equal-weight empty Additional Artifact / Resource-Reference blocks with
  aggressive independent add links.
- Unnecessary repeated zero counts and simultaneous redundant Work counts.
- Equal-weight `+ Task`, `+ Milestone`, `Tasks zuordnen` clusters.
- Aggressive repeated per-Milestone Task-add controls.
- Project-origin-only visual/capture divergence from standalone `/tasks/new`,
  including extra origin-specific top context/capture presentation; canonical
  Title-first capture remains accepted.

#### Browser-observable acceptance for the later DELIVER repair

1. Empty Project has exactly one dominant `Erste Task anlegen`; result/Criteria
   setup is compact and management never expands the main layout. No per-Criterion
   Manage control appears in read mode, including read-only `N weitere` expansion.
2. Standalone and Project-origin `/tasks/new` have the same headings, page
   structure, labels, field order and disclosure behavior. Only validated prefills,
   origin metadata and Save/Cancel destinations differ. Project/Milestone/Goal
   remain in the canonical optional-details fields; no extra Project-specific top
   context/capture block appears. Project stays required/non-empty for Project-origin;
   valid owned active Project switching clears incompatible Milestone, while
   backlog/no-Milestone remains valid. Save returns to the actually selected owning
   Project and correct Milestone/backlog; Cancel writes nothing and returns to the
   originating Project even after edits. Standalone Save still opens Task Detail.
3. One READY / multiple READY / all BLOCKED each has one clear, user-controlled
   guidance/action hierarchy. With Milestones, structure stays inside dominant
   Work; add/manage controls and counts remain subordinate.
4. Present context/support stays compact; absent values collapse without repeated
   large empty blocks, dashes or zero chrome at every required viewport.
5. Review opens as the focused accessible interaction; Preview/Cancel writes
   nothing. Success returns to the normal view; stale preserves the draft and
   requires conscious refresh/reconfirmation. Prove continue and complete states.
6. Completed has compact summary. `Abschluss-Review ansehen` directly opens the
   canonical completion Review beyond the first History page. Full immutable
   History is secondary and paginated; amendments are reached inside it.
7. Reopen preserves prior History and restores current work as primary. Legacy
   completed has truthful no-Review copy; archived remains read-only. Cover mobile
   versions of these core states without desktop-management stacking.
8. Directly exercise affected controls and prove success/error feedback and
   reload-stable writes; verify focus-in, keyboard, Escape, focus return, labels
   and announcements. Inspect console/hydration, full-surface screenshots, bounds
   and whitespace at all required viewports; no overflow or primary scroll trap.
9. Preserve existing P-DATA, Review/History/revision/cycle, Security/RLS/command,
   Task Dependencies, Project Milestones, Goal/Skill/Project↔Skill boundaries,
   Progress Model and R2-09/R2-10/R2-12 invariants. R2-13 and Skill PP2/PP3/PP4
   remain outside this repair; final surface acceptance still requires USER ACCEPTED.

### Skill Development composition

Skill Detail uses the same calm V5 interaction grammar but remains
domain-specific.

Header:
- Skill identity/status/Area/why;
- one visible **Aktueller Entwicklungsfokus** when present;
- no mastery ring, score or global completion claim.

Primary development surface:
- `Practice & Lernschritte`;
- exactly one contextually useful next action;
- current Skill Milestone/Lernschritt when present;
- explicit linked Practice Tasks with their real lifecycle and dependency
  readiness;
- reviewed/historical learning steps remain secondary readable depth.

Evidence/recency rail:
- explicit Evidence with date, observation and provenance;
- separate read signals for latest linked completed Task and latest Evidence;
- Development history remains review/history depth, not an analytics dashboard.

Supporting:
- `Anwendung & Grundlagen` shows derived Project/Goal context through canonical
  Task/Evidence paths and explicit prerequisite/related Skill orientation;
- `Lernmaterial & References` shows ordinary Resource context;
- Resource context and Evidence remain visibly distinct.

Empty Skill:
- one dominant `Entwicklungsfokus festlegen` action;
- Practice/Evidence/Resources stay optional and do not create an empty dashboard.

Mobile stacks identity → current target → next action → Practice/Lernschritte →
Evidence/Recency → application/prerequisites → Resources.

### Interaction and persistence boundaries

- Project completion review never substitutes Goal Review.
- Skill review never changes Task READY/BLOCKED or Goal achievement.
- No direct Project↔Skill relation is introduced; provenance is derived from
  Tasks/`task_skill_links` and explicit Evidence.
- #67 P-DATA is USER ACCEPTED for Project result, criteria, review and history;
  Issue #69 implements these capabilities in the existing Project Detail.
- No UI may imply accepted storage for Skill Target/Milestone/prerequisite
  history until the corresponding later S-* contract is explicitly accepted.

## Accepted Task read-first & Project-to-Day interaction — #56

Issue #56 USER ACCEPTED the Task / Project interaction target on 2026-09-28.

### Task Detail — layered read-first Variant B

Task Detail is not a split workbench. It uses a layered reading order:

1. Task identity, lifecycle and restrained priority/status context;
2. one dominant `Dein nächster Schritt` guidance surface;
3. one compact context line/region for Project, Project Milestone and Goal;
4. purpose/description, Arbeitsnotiz/Vorgehen and Arbeitsschritte;
5. Dependency and planning depth;
6. secondary Edit / Manage / Lifecycle controls.

READY/BLOCKED is visually and semantically separate from Task lifecycle. Concrete
predecessors remain readable and navigable. A completed predecessor may explain
why the current Task is READY without becoming a competing primary action.

Planning presents `planned_date` as day intent, scheduled start/duration as the
Calendar time block and deadline separately. When a scheduled Task is the current
guidance, the primary action opens that Calendar context. When a READY Task lacks
a confirmed time block, guidance may offer Calendar planning. The user still
chooses/edits time in Calendar.

Mobile keeps the same semantic order in one column. The primary guidance remains
early in the viewport; context and management never require horizontal scrolling.

#### USER ACCEPTED #60 surface grouping

Real post-merge review of #58 rejected the visible Task composition as too
dispersed even though the Variant B semantic order was present. Issue #60 USER
ACCEPTED a bounded surface correction without returning to Variant A:

1. compact unboxed Task identity;
2. one dominant `Dein nächster Schritt` surface;
3. one compact linked context strip;
4. one shared primary **Work** surface containing `Worum geht es?`,
   `Arbeitsnotiz` and `Arbeitsschritte`;
5. one shared secondary **Supporting Depth** surface containing
   `Voraussetzung`, `Planung`, `Zurück zum Zusammenhang` and quiet secondary
   management.

On desktop the three supporting topics may use internally divided columns inside
that one shared surface. On mobile they stack inside the same shared surface with
quiet internal separators. Supporting topics must not float as independent regions
on application background. This is still layered read-first Variant B, not a
parallel split workbench.

### Bounded Project refinement over R2-09

The R2-09 three-surface structure and information hierarchy remain binding.
#56 changes guidance, not Project composition:

- label the stored Project-owned Next Step as `Project-Fokus` where needed to
  distinguish it from executable Task guidance;
- an exactly-one READY Task may be emphasized as the next executable Task;
- multiple READY Tasks remain a user choice with no inferred winner;
- BLOCKED rows name/link the concrete predecessor when available;
- an all-blocked Project guides into blocker context without mutating Project
  status;
- an empty Project uses `Erste Task anlegen` as the primary work entry through
  the canonical Title-first `/tasks/new` composition corrected in #77; Milestone
  management stays secondary.

Existing Milestone ordering/grouping, task and milestone counts, Work Artifacts,
References and Goal context retain their semantics. #72 refines read hierarchy,
count emphasis and secondary edit/lifecycle placement over R2-09.

### Project → Task → Day interaction

Use the existing canonical loop:

```text
Project
→ identify current work
→ open or capture Task
→ resolve explicit Task Dependency when needed
→ plan/confirm time in Calendar
→ execute and explicitly complete Task
→ return through canonical Project/Goal context
```

Task-aware Calendar query/navigation state preserves the selected Task and day
across navigation/reload, but it is presentation/navigation state only. Issue #60
USER ACCEPTED **Week view for both planning and replanning**:

- READY unscheduled work opens the week containing the intended day, with the Task
  selected and the existing scheduling inspector visible;
- scheduled work opens the week containing its existing block, with the Task/block
  selected for review or replanning;
- navigation uses Task + date + `view=week` (or an equivalent compatible state)
  and reload restores the same week and selection;
- the user may deliberately switch views after arrival, but there is no automatic
  Day-view exception.

Calendar continues to own explicit time-block confirmation/editing; merely opening
the handoff route never writes scheduling state. Today remains the day projection.
No Calendar or Today redesign is implied.

No new persisted workflow state, universal Milestone model, Project-Milestone
dependency semantics, generic progress engine or automatic completion is allowed
by this contract.


## Work Graph und späterer Graph-Client — Designvertrag

Die historische R2-11-Evaluation verglich die bestehenden Project-/Task-Workbench-
Regionen mit textgestützten Ready-/Blocked-Zuständen, konkreten Vorgängern und parallelen
Pfaden und führte zu Decision A. Kein Canvas in R2-10, keine neue Dashboard-Komposition. Stage-Reihenfolge,
Zugehörigkeit, Dependency, Evidence, Reference und Work Artifact müssen visuell
und sprachlich unterscheidbar bleiben. Echte Counts ersetzen Gesamtprozentwerte.

Ein späterer Graph ist optionaler Deep-Work-Modus. Next Action, Blockierungsgrund
und Project-Wiederaufnahme sind wichtiger als Graph-Größe oder dekorative Cluster.
Listen/Detailwege bleiben vollständig per Tastatur bedienbar; Farbe, Position und
Kanten allein dürfen keine Fachinformation tragen. Bestehende V5-Hierarchie,
4K-/1920×1080-/Mobile-Guards und Surface Acceptance gelten für Life-OS-Flächen.

Der akzeptierte Target-Model-Vertrag bestellt keine native Canvas-Library.
Der Project-Canvas-Vertrag trennt regenerierbares Project Canvas von
Personal Canvas. Position, Größe, Farbe, Gruppen, Zoom, freie Notizen und
explorative Kanten sind user-owned Presentation State. Regeneration darf diese
nicht überschreiben. Kanonische Kanten sind als solche erkennbar; eine gezeichnete
Kante erzeugt keine Dependency. R2-17 nutzt echte Evidence/Practice und Goal-
Outcome-Kontexte; keine Fake-Edges oder Mastery-Scores. Journal bleibt sichtbar
und Life-OS-owned; seine fehlende Relations-/Today-Tiefe bleibt ein späteres
Modellthema.

R2-10 ergänzt Project-Task-Zeilen um kurze READY-/BLOCKED-Signale und
Ready-/Blocked-Counts neben den bestehenden Progress-Zahlen. Blockergründe und
Nachfolger stehen mit Links im Task Detail; Hinzufügen/Entfernen bleibt hinter
bewusster Disclosure. Abgeschlossene inkonsistente Tasks behalten ihren Lifecycle
und erhalten einen ehrlichen Hinweis. Dependencies erklären Arbeit; sie dominieren
die akzeptierte Milestone-Struktur nicht.

### R2-12 secondary Project export action

“Für Obsidian exportieren” remains a quiet secondary header utility under #72,
using current text, focus and spacing tokens. Pending state disables duplicate
clicks; the app-wide toast announces success or persistent error. Project Detail
retains its accepted three surfaces, read-first work and responsive hierarchy.
No Sync, Project Map, new card, provider selector or layout redesign is introduced.

Obsidian projection navigation uses readable title filenames and Core Graph labels.
UUID filenames fail the human navigation contract. Collision suffixes appear only
when necessary; ordinary links need no alias. README must not pollute the graph.
