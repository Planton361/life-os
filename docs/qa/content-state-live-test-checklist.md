# Content State Live Test Checklist

Stand: 2026-06-24
Status: R1.4a Dashboard-Checkliste aktiv, App-weite Route-Sweeps spaetere Slices

## Purpose

Diese Checkliste prueft, ob `empty`, `partial` und `filled` als Produktzustaende funktionieren. Sie ersetzt keine Supabase-, Migrations-, Auth- oder RLS-Pruefung. R1.4 bleibt lokal und profile-basiert.

R1.4a deckt zuerst `/dashboard` ab. Die App-weite Route-Sweep-Liste bleibt
als spaetere Checkliste bestehen und darf nicht als fertig gewertet werden.

## R1.4a Dashboard Acceptance Checks

- Demo Dashboard zeigt die V5-Referenzdaten und dieselbe Shell.
- Empty Dashboard zeigt keine Demo-Strings und keine technischen Profil-Titel.
- Manual Reset entspricht fachlich Empty.
- Quick Thought schreibt im Manual-Profil in die lokale Inbox.
- Manual Task mit `20:00` und `30` Minuten Dauer erscheint in Today Agenda.
- Habit Tracker meldet `0/8`, `1/8`, `8/8`.
- Active Portfolio meldet `0/4`, `1/4`, `4/4`.
- Meals Today rendert immer Breakfast, Lunch und Dinner.
- Time Progress zeigt in allen Profilen `Week`, `Month`, `Year`.
- Mood bleibt textgestuetzt und nutzt semantische Toene.
- Anti-Rot und Challenges zeigen keine Fake-Daten.
- Keine Dashboard-Grid-Neukomposition.

## R1.4a Local QA Attempt - 2026-06-24

Status: `BLOCKED_BY_LOCAL_SOCKET_SANDBOX`

Statisch abgeschlossen:

- Spec-Pfad ist `docs/specs/r1-4-content-state-system.md`.
- `ContentState` ist `empty | partial | filled`.
- `AsyncState` ist separat und enthaelt `idle | loading | success | error`.
- Dashboard-Selector-Vertrag nutzt `data-content-state`, `data-profile-id`,
  `data-item-count` und `data-capacity`.

Browser-/Screenshot-Review:

- Demo Dashboard: ausstehend, weil Playwright den lokalen Server nicht pruefen
  darf (`connect EPERM 127.0.0.1:3000`).
- Empty Dashboard: ausstehend aus demselben Sandbox-Grund.
- Manual Dashboard empty: ausstehend aus demselben Sandbox-Grund.
- Manual Dashboard partial: ausstehend aus demselben Sandbox-Grund.
- Manual Dashboard filled: ausstehend aus demselben Sandbox-Grund.

Artefakte:

- Keine neuen Screenshots erzeugt.
- `pnpm qa:dashboard`, `pnpm test:e2e` und der gezielte
  `content-state-system.spec.ts`-Lauf sind bis zur Webserver-Pruefung
  gekommen und dann am lokalen Socketzugriff gescheitert.

P1-Folgepunkt:

- Duplicate-Key-Warnungen mit Empty-Profile-Texten wie
  `Noch keine Gesundheitsdaten erfasst.` gezielt in den betroffenen
  Area-Sweeps isolieren. R1.4a behebt kleine lokale Key-Faelle; breitere
  Health-/Area-Key-Audits bleiben ein separater Hardening-Slice.

## Preparation

- Worktree pruefen: `git status --short --untracked-files=all`
- Keine Supabase- oder Migration-Dateien anfassen.
- App lokal starten, falls visuelle Live-Pruefung noetig ist.
- Settings oeffnen und `Profile Data Source` sichtbar pruefen.
- Manual-Profil bei Bedarf ueber Settings resetten.

## Global Invariants

- Demo, Empty und Manual nutzen dieselbe Page Shell, Widget Shell und Item-Komponente, sobald eine gestaltete Page existiert.
- `ProfileBoundaryPage` darf keine gestaltete Page ersetzen.
- Route-Skeletons bleiben als Skeleton dokumentiert und werden nicht als fertiger `empty` State gewertet.
- Keine Demo-Fixtures ausserhalb `demo`.
- Kein stiller Demo-Fallback in `empty` oder `manual`.
- Keine fachlichen Cards mit technischen Profil-Titeln.
- Empty States sitzen innerhalb bestehender Cards/Sections.
- Collection Empty rendert genau einen Empty State pro Collection.
- Fixed Slot Empty darf leere Slots behalten.
- Charts und Metrics erfinden keine Werte.
- `0` wird nur angezeigt, wenn es fachlich ein echter Nullwert ist.
- Status ist textgestuetzt und nicht nur Farbe.
- Mobile darf keinen horizontalen Overflow bekommen.

## Blocked Strings

In `empty` und `manual` duerfen normale App-Seiten diese Strings nicht anzeigen:

- `Life OS App`
- `Masterarbeit`
- `Finanzinformatik`
- `Literature source deadline`
- `Calendar page implementieren`
- `Portfolio page in Figma finalisieren`
- `Weekly review vorbereiten`
- `Hyperskill`
- `Data access setup question`
- `Article on calm dashboards`
- `Water`
- `Coffee`
- `Study`
- `Skyr`
- `Skyr with oats and berries`
- `Protein Bowl`
- `Steady`
- `5-minute self-check`
- `10-minute walk after deep work`
- `Mood Pattern`
- `Repair Routines`
- `Today Signal`
- `Agent Workflow`
- `Data model notes`
- `No local entry`
- `No local data`
- `Manual-Profil: Noch keine lokalen Daten`
- `Manual profile has no`
- `Manual local profile`
- `Empty profile`
- `Profile boundary`
- `Not wired`

Ausnahme: Profil-/Debug-Copy ist in Settings erlaubt, sofern sie klar als Systemsteuerung sichtbar ist.

## Required Attributes

Nach Implementierung muessen relevante Widgets diese Attribute tragen:

- `data-content-state="empty|partial|filled"`
- `data-item-count`
- `data-capacity`, wenn die Section eine sichtbare Kapazitaet hat
- `data-profile-id="demo|empty|manual"`

## Demo Profile

- Profil `Demo Profile` in Settings auswaehlen.
- `/dashboard` oeffnen.
- V5-Komposition bleibt unveraendert.
- Today Agenda und Daily Control bleiben P0-dominant.
- Demo-Fixtures sind sichtbar.
- Dashboard-Widgets melden `filled`, sofern ihre Demo-Kapazitaet gefuellt ist.
- `/inbox`, `/today`, `/calendar`, `/portfolio`, `/tasks`, `/projects`, `/goals`, `/skills`, `/resources` zeigen Demo-Daten.
- Area Pages zeigen gestaltete Demo-Shells mit Demo-Daten.
- Keine Manual-Datei ist fuer Demo erforderlich.

## Empty Profile

- Profil `Empty Profile` in Settings auswaehlen.
- `/dashboard` pruefen:
  - Command Center zeigt keine technischen Profilnamen in fachlichen Cards.
  - Time Progress zeigt Week, Month und Year aus aktuellem Datum.
  - Daily Control zeigt Current Task Shell plus `Create task`.
  - Today Agenda zeigt Empty State innerhalb des Rasters.
  - Meals Today zeigt Breakfast, Lunch und Dinner als unplanned Slots.
  - Habit Tracker zeigt 0/8 und Add-Habit-Tile.
  - Active Portfolio zeigt 0/4 und Add-Project/Add-Goal-Weg.
  - Anti-Rot und Challenges bleiben kompakt.
- `/inbox` pruefen:
  - Queue zeigt einen Empty State.
  - Active Item zeigt `Kein Inbox-Eintrag ausgewaehlt` oder gleichwertig.
  - AI Planning zeigt `-`/keine Empfehlung statt Demo-Vorschlaegen.
  - Checklist zeigt 0 erledigte Schritte.
- `/today` pruefen:
  - First-Run-Hinweis ist kompakt.
  - Opening Review zeigt Not set.
  - Activity Stream zeigt einen zentralen Empty State.
  - Decisions, Artifacts, Closing Review und Carry Forward bleiben sichtbar.
- `/calendar` pruefen:
  - Zeitraster bleibt sichtbar.
  - Keine Fake-Termine.
  - Empty State liegt im Kalender, nicht als Seitenersatz.
- `/tasks`, `/projects`, `/goals`, `/skills`, `/portfolio` pruefen:
  - Listen sind leer.
  - Inspector/Preview bleibt als Empty State sichtbar.
  - Keine Demo-Entity im Detailkontext.
- Area Pages pruefen:
  - gestaltete Shell bleibt.
  - genau ein Empty State pro Collection.
  - keine wiederholten Placeholder-Karten.
  - keine technischen Profiltexte.

## Manual Reset State

- Profil `Manual Profile` auswaehlen.
- `Reset manual local profile` in Settings ausfuehren.
- Danach muss Manual fachlich dem Empty State entsprechen.
- Demo-Fixtures bleiben ausgeblendet.
- `.local/life-os/manual-profile.json` darf geloescht oder leer neu erzeugbar sein.
- Dashboard, Inbox, Today, Calendar und Portfolio bleiben beschreibbar.

## Manual Partial State

In Settings anlegen:

- 1 Task mit Datum, Startzeit, Dauer, Area und Priority.
- 1 Inbox Item.
- 1 Project.
- 1 Goal.

Pruefen:

- `/tasks` zeigt den Task in derselben EntityCard wie Demo.
- `/tasks/[taskId]` zeigt die bestehende Detailseite.
- `/calendar` zeigt den Task im richtigen Zeitblock.
- `/today` zeigt Task und Inbox Item im Activity Stream.
- `/dashboard` zeigt Task in Today Agenda und Daily Control.
- `/inbox` zeigt das Inbox Item in der Queue.
- `/portfolio` zeigt Task, Project und Goal in denselben Portfolio Rows wie Demo.
- Dashboard Active Portfolio zeigt Project/Goal und bleibt unter Kapazitaet.
- Widgets melden `partial`, wenn Item Count > 0 und Capacity noch nicht erreicht ist.
- Add-Tiles/CTAs bleiben sichtbar, solange Capacity nicht erreicht ist.

## Manual Filled State

Nach spaeterer Implementierung erzeugen:

- 8 Habits.
- 4 Dashboard Portfolio Items.
- Breakfast, Lunch und Dinner entschieden.
- mehrere Calendar Tasks mit Datum, Startzeit und Dauer.
- Challenges bis zur sichtbaren Dashboard-Kapazitaet.

Pruefen:

- Widgets melden `filled`.
- Add-Tiles verschwinden oder sind deaktiviert.
- Dashboard-Widgets wachsen nicht unkontrolliert.
- Weitere Daten bleiben auf Detail-/Area-Seiten erreichbar.
- P0 bleibt dominant.

## Route Sweep

Core:

- `/dashboard`
- `/inbox`
- `/today`
- `/calendar`
- `/tasks`
- `/projects`
- `/goals`
- `/skills`
- `/portfolio`
- `/review/daily`
- `/timeline`

Resources:

- `/resources`

Health:

- `/health`
- `/health/mental`
- `/health/habits`
- `/health/running`
- `/health/strength`

Nutrition:

- `/nutrition`
- `/nutrition/meal-planner`
- `/nutrition/recipes`
- `/nutrition/grocery`

Coding:

- `/coding`
- `/coding/repositories`
- `/coding/agents`
- `/coding/skill-map`
- `/coding/knowledge`

Life:

- `/life`
- `/life/journal`
- `/life/notes`
- `/life/entertainment`
- `/life/entertainment/games`
- `/life/entertainment/books`
- `/life/entertainment/series`
- `/life/entertainment/movies`
- `/life/inventory`

Education:

- `/education`
- `/education/scientific-work`
- `/education/literature`
- `/education/learning-log`

Work:

- `/work`
- `/work/log`
- `/work/wiki`
- `/work/meetings`

Other:

- `/shop`
- `/challenges`
- `/settings`

## Skeleton And Boundary Checks

- `/coding/knowledge` remains a skeleton and must not claim R1.4 completion.
- `/life/entertainment/games`, `/books`, `/series`, `/movies` remain skeletons and must not show Demo lists.
- `/work/meetings` remains a skeleton unless a later scope implements it.
- `/review/daily` currently needs a fix: it must not use `ProfileBoundaryPage` for `empty`/`manual` after R1.4 implementation.
- `/timeline` currently needs a fix or explicit skeleton decision.

## Manual Create Flow Checks

Minimum live-ready flows:

- Quick Thought -> Manual Inbox.
- Inbox Quick Capture -> Manual Inbox.
- Task Create with date, time, duration and area.
- Project Create.
- Goal Create.
- Habit Create.
- Habit selected for Dashboard.
- Meal Slot planned or logged.
- Mood Check set.
- Opening Review started.
- Daily Review started.
- Challenge Create with daily/weekly/monthly rhythm.
- Anti-Rot/Habit selection configured.

Any visible active Create/Add/Capture button must either:

- perform a real local Manual mutation, or
- lead to an existing functional Create page/form, or
- be visibly disabled/deferred with non-technical copy.

## Viewport Checks

Desktop:

- `2560x1440`
- `1440x900`

Mobile:

- project standard mobile viewport or approximately `390x844`

Checks:

- no horizontal overflow
- no layout collapse
- no card overlap
- text fits controls
- focus states visible
- touch targets adequate
- same shell across Demo, Empty and Manual

## Validation Commands

Required for this audit/docs scope:

```bash
git diff --check
pnpm lint
pnpm exec tsc --noEmit --incremental false
```

Required after UI implementation slices, if available:

```bash
pnpm qa:dashboard
pnpm test:e2e
```

Targeted future E2E:

```bash
pnpm exec playwright test tests/e2e/content-state-system.spec.ts
pnpm exec playwright test tests/e2e/profile-boundary.spec.ts
```
