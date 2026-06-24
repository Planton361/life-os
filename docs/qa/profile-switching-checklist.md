# Profile Switching Checklist

Stand: 2026-06-24
Status: Active
Zweck: QA fuer R1 Profile Data Source.

## R1.4a Dashboard Reference

Dashboard ist ab R1.4a die Referenz fuer `empty`, `partial` und `filled`.

Zusatzchecks:

- Alle Dashboard-Profile nutzen dieselbe V5-Shell.
- `data-profile-id`, `data-content-state`, `data-item-count` und
  `data-capacity` sind auf relevanten Dashboard-Widgets vorhanden.
- Empty und Manual Reset zeigen keine Demo-Fixtures.
- Quick Thought schreibt nur im Manual-Profil in die lokale Inbox.
- Manual Task mit Startzeit/Dauer wird in Today Agenda korrekt platziert.
- Habit Tracker folgt `0/8`, `1/8`, `8/8`.
- Active Portfolio folgt `0/4`, `1/4`, `4/4`.
- Meals Today zeigt immer Breakfast, Lunch und Dinner.
- Time Progress ist in `demo`, `empty` und `manual` gleich strukturiert:
  `Week`, `Month`, `Year`.

## Vorbereitung

- `git status --short --untracked-files=all`
- Settings oeffnen.
- Profile Data Source Panel pruefen.

## Demo Profile

- Profil `Demo Profile` auswaehlen.
- `/dashboard` oeffnen.
- Today Agenda, Daily Control, Habit Tracker, Active Portfolio, Meals und Running bleiben im akzeptierten V5-Mock-Stand.
- `/portfolio`, `/tasks`, `/projects`, `/goals`, `/inbox`, `/today`, `/calendar` zeigen Demo-Fixtures.
- `/health/mental` zeigt die voll gestaltete Mental-Health-Seite mit Demo-Signalen.
- Keine Manual-Datei wird fuer Demo gebraucht.

## Empty Profile

- Profil `Empty Profile` auswaehlen.
- `/dashboard` oeffnen.
- V5-Komposition bleibt erhalten.
- Today Agenda zeigt einen Empty State in der Card.
- Active Portfolio, Meals, Anti-Rot und Challenges zeigen card-interne Empty States.
- Keine Demo-Aufgaben, Demo-Projekte, Demo-Ziele oder Demo-Inbox-Eintraege sichtbar.
- `/tasks`, `/projects`, `/goals` zeigen leere Workbench-Zustaende.
- `/portfolio?view=tasks`, `/portfolio?view=projects`, `/portfolio?view=goals` und `/portfolio?view=skills` zeigen 0 Entities und keinen Demo-Detailkontext.
- `/health/mental` zeigt dieselben Mental-Health-Sections wie Demo, aber neutrale Empty-State-Werte.
- `/health/mental` zeigt weder `Profile Data Source` noch `Profile boundary`.
- Gestaltete Area-Routen zeigen ihre bestehende Shell, keine generische `ProfileBoundaryPage`.
- Empty States erscheinen in bestehenden Cards und Sections.
- Listen mit 0 Eintraegen zeigen genau einen natuerlichen Empty State pro Section, keine wiederholten Platzhalterkarten.
- `/resources`, `/health`, `/nutrition`, `/coding`, `/life`, `/education`, `/work`, `/shop` und `/challenges` zeigen keine Demo-Eintraege.

## Manual Profile

In Settings anlegen:

- Task mit Datum, `20:00` Startzeit und `30` Minuten Dauer.
- Inbox Item.
- Project.
- Goal.

Pruefen:

- `/tasks` zeigt den Task.
- `/tasks/[taskId]` zeigt den Task in der bestehenden Detailseite.
- `/today` zeigt Task und Inbox Item im Activity Stream.
- `/calendar` zeigt den Task als Zeitblock.
- `/dashboard` zeigt den Task in Today Agenda und die Counts im Command Center.
- `/portfolio?view=tasks` zeigt den Task.
- `/inbox` zeigt das Inbox Item.
- `/projects` zeigt das Project.
- `/goals` zeigt das Goal.
- Dashboard Active Portfolio zeigt Project und Goal.
- `/health/mental` zeigt dieselben Mental-Health-Sections wie Demo, aber keine Demo-Signale.
- Gestaltete Area-Routen zeigen dieselbe Shell wie Demo und lokale Manual-Daten, falls diese Quelle existiert.
- Falls keine Manual-Daten existieren, erscheinen Empty States innerhalb der bestehenden Shell.
- Falls keine Manual-Daten existieren, erscheinen keine technischen Texte wie `No local entry`, `No local data`, `Manual-Profil: Noch keine lokalen Daten` oder `Manual profile has no`.
- Gestaltete Area-Routen duerfen nicht auf eine generische Boundary-Seite fallen.

## Area Page Shells

- `ProfileBoundaryPage` ist kein Ersatz fuer gestaltete Seiten.
- Wenn eine Demo-Route eine voll gestaltete Page-Komposition besitzt, muessen `empty` und `manual` dieselbe Shell rendern.
- Empty States gehoeren in bestehende Cards und Sections.
- Empty States ersetzen leere Item-Listen als ein einzelner Abschnittszustand; sie duplizieren keine leeren Cards pro ehemaligem Demo-Item.
- R1.2 Referenzroute: `/health/mental`.
- R1.3 Area-Shell-Routen: `/resources`, `/health`, `/health/habits`, `/health/running`, `/health/strength`, `/nutrition`, `/nutrition/meal-planner`, `/nutrition/recipes`, `/nutrition/grocery`, `/coding`, `/coding/repositories`, `/coding/agents`, `/coding/skill-map`, `/life`, `/life/journal`, `/life/notes`, `/life/entertainment`, `/life/inventory`, `/education`, `/education/scientific-work`, `/education/literature`, `/education/learning-log`, `/work`, `/work/log`, `/work/wiki`, `/shop`, `/challenges`.
- Route-Skeletons im R1.3-Scope: `/coding/knowledge`, `/life/entertainment/games`, `/life/entertainment/books`, `/life/entertainment/series`, `/life/entertainment/movies`.
- Erlaubte `ProfileBoundaryPage`-Zwischenstaende ausserhalb R1.3: `/review/daily`, `/timeline`.

## Reset

- In Settings `Reset manual local profile` ausloesen.
- Profil bleibt `manual`.
- `.local/life-os/manual-profile.json` ist geloescht oder leer neu erzeugbar.
- Demo Profile bleibt unveraendert.
- `/portfolio` und `/dashboard` zeigen nach Reset keine manuellen Entities und keine Demo-Entities im Manual-Profil.

## Blocked Strings

In `empty` und `manual` duerfen folgende Strings auf normalen App-Seiten nicht sichtbar sein:

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
- `Literature source deadline klären`
- `Agent Workflow`
- `Data model notes`
- `No local entry`
- `No local data`
- `Manual-Profil: Noch keine lokalen Daten`
- `Manual profile has no`

## Checks

- `git diff --check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm qa:dashboard`
- `pnpm build`
- `pnpm test:e2e`, falls stabil
