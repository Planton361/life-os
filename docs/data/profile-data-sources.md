# Profile Data Sources

Stand: 2026-06-24
Status: Active
Zweck: Lokale Datenquellen-Schicht fuer R1 vor Supabase.

## Grundsatz

```text
Mockdaten tragen Inhalt, nicht Designstruktur.
Komponenten rendern stabile ViewModels.
Adapter duerfen wechseln; UI-Vertraege bleiben gleich.
```

## Profile

### Demo Profile

- ID: `demo`
- Quelle: vorhandene Design-Fixtures in `src/features/**/mock-*.ts` und bestehenden statischen ViewModels.
- Zweck: akzeptierter V5-Referenzstand.
- Regel: nicht loeschen, nicht als echte Nutzerdaten behandeln, nicht mutieren.

### Empty Profile

- ID: `empty`
- Quelle: lokale Profile-Mapper in `src/features/profile-data/view-models.ts`.
- Zweck: dieselben ViewModel-Vertraege mit neutralen Werten und leeren Arrays.
- Regel: keine Demo-Eintraege anzeigen.

### Manual Local Profile

- ID: `manual`
- Quelle: `.local/life-os/manual-profile.json`.
- Zweck: lokale Eintraege fuer Tasks, Inbox Items, Projects und Goals.
- Regel: Datei bleibt gitignored, resetbar, keine Supabase- oder Auth-Abhaengigkeit.

## Cookie

Die aktive Datenquelle wird ueber ein serverseitiges Cookie gewaehlt:

```text
life_os_profile=demo
life_os_profile=empty
life_os_profile=manual
```

Die Auswahl passiert ueber Server Actions in Settings. Dadurch lesen Server Components und Client-Gates denselben initialen Datenstand und erzeugen keine localStorage-Hydration-Abhaengigkeit.

## ViewModel-Vertraege

Alle Profile liefern dieselben Vertraege fuer die angebundenen Kernbereiche:

- Dashboard: `DashboardViewModel`
- Inbox: `InboxViewModel`
- Today: `TodayViewModel`
- Calendar: `CalendarViewModel`
- Portfolio: `PortfolioViewModel`
- Mental Health: `MentalHealthPageViewModel`
- Tasks/Projects/Goals/Skills: `EntityCollection`

R1 ist absichtlich adapterbasiert. Ein spaeterer Supabase-Adapter darf diese Quellen ersetzen, aber nicht neue Dashboard- oder Bereichskomponenten erzwingen.

## R1.3 App-wide Area Shell Boundary

Nur `demo` darf Design-Fixtures anzeigen. Normale App-Routen muessen zuerst die aktive Profile-Schicht abfragen:

```text
demo   -> bestehende Design-Fixture-ViewModels
empty  -> leere Profile-ViewModels in derselben Page Shell
manual -> lokale Profile-ViewModels oder Empty States in derselben Page Shell
```

Portfolio liest in R1.1 immer ueber `src/features/profile-data`. Die Route `/portfolio?view=tasks|projects|goals|skills` darf `portfolio-mock-data.ts` nicht direkt erreichen. Fuer `empty` liefert Portfolio 0 Tasks, 0 Projects, 0 Goals und 0 Skills. Fuer `manual` werden lokale Tasks, Projects und Goals aus `.local/life-os/manual-profile.json` in Portfolio-Entities projiziert.

Gestaltete Area Pages behalten ihre Shell. `ProfileBoundaryPage` ist kein Ersatz fuer gestaltete Seiten. Wenn eine Demo-Ansicht bereits eine eigene Page-Komposition hat, muessen `empty` und `manual` dieselbe Komposition rendern und nur profilabhaengige Daten oder card-interne Empty States einsetzen.

### R1.4 Empty State Morphology

Leere Profile duerfen keine neutralisierten Demo-Listen simulieren. Content-Arrays fuer Eintraege, Ressourcen, Routinen, Sessions, Notes, Learnings oder Review Items werden in `empty` und ohne lokale Manual-Daten auf `[]` reduziert. Die bestehende Page Shell, Section Headers, Controls, Tabs und Detailbereiche bleiben sichtbar; die betroffene Liste rendert genau einen natuerlichen Empty State innerhalb der vorhandenen Card oder Section.

Nicht erlaubte Debug-/Platzhaltertexte in gestalteten Seiten:

- `No local entry`
- `No local data`
- `Manual-Profil: Noch keine lokalen Daten`
- `Manual profile has no`

Manual-Eintraege muessen durch dieselben Item Cards, Listen und Detailpanels laufen wie Demo-Fixtures. Es werden in R1.4 keine neuen Create Engines gebaut.

`/health/mental` war die R1.2 Referenzroute:

```text
demo   -> Mental-Health-Fixtures
empty  -> Mental-Health-Shell mit neutralen Empty-State-Werten
manual -> Mental-Health-Shell mit neutralen Empty-State-Werten, bis lokale Mental-Health-Daten existieren
```

R1.3 uebertraegt dieses Muster auf die gestalteten Area Pages. Die Page-Kompositionen bleiben bestehen; nur die ViewModel-Daten werden ueber `src/features/profile-data/area-view-models.ts` zwischen Demo-Fixtures und neutralen lokalen Profilwerten umgeschaltet.

### R1.3 Route Shell Audit

| Route | Has designed demo shell | Current empty/manual behavior | Allowed to use ProfileBoundaryPage | Required profile ViewModel | Demo fixture source | Empty state strategy | Manual state strategy | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/resources` | yes | same Resources shell, neutral entries | no | `getResourcesViewModel` | `src/features/resources` | neutral cards/lists | local empty state | P0 |
| `/health` | yes | same Health overview shell | no | `getHealthOverviewViewModel` | `src/features/health` | neutral cards/lists | local empty state | P0 |
| `/health/habits` | yes | same Habits shell | no | `getHabitsAnalyticsViewModel` | `src/features/health/habits` | neutral cards/lists | local empty state | P0 |
| `/health/running` | yes | same Running shell | no | `getRunningTrackerViewModel` | `src/features/health/running` | neutral cards/lists | local empty state | P0 |
| `/health/strength` | yes | same Strength shell | no | `getStrengthTrackerViewModel` | `src/features/health/strength-tracker` | neutral cards/lists | local empty state | P0 |
| `/nutrition` | yes | same Nutrition shell | no | `getNutritionOverviewViewModel` | `src/features/nutrition` | neutral cards/lists | local empty state | P0 |
| `/nutrition/meal-planner` | yes | same Meal Planner shell | no | `getMealPlannerViewModel` | `src/features/nutrition/meal-planner` | neutral cards/lists | local empty state | P0 |
| `/nutrition/recipes` | yes | same Recipes shell | no | `getRecipesViewModel` | `src/features/nutrition/recipes` | neutral cards/lists | local empty state | P0 |
| `/nutrition/grocery` | yes | same Grocery shell | no | `getGroceryViewModel` | `src/features/nutrition/grocery` | neutral cards/lists | local empty state | P0 |
| `/coding` | yes | same Coding overview shell | no | `getCodingOverviewViewModel` | `src/features/coding` | neutral cards/lists | local empty state | P0 |
| `/coding/repositories` | yes | same Repositories shell | no | `getRepositoriesViewModel` | `src/features/coding/repositories` | neutral cards/lists | local empty state | P0 |
| `/coding/agents` | yes | same Agent Hub shell | no | `getAgentHubViewModel` | `src/features/coding/agents` | neutral cards/lists | local empty state | P0 |
| `/coding/skill-map` | yes | same Skill Map shell | no | `getSkillMapViewModel` | `src/features/coding/skill-map` | neutral cards/lists | local empty state | P0 |
| `/coding/knowledge` | skeleton route | route skeleton, no data swap needed | no current need | route skeleton | none | skeleton message | skeleton message | P2 |
| `/life` | yes | same Life overview shell | no | `getLifeOverviewViewModel` | `src/features/life` | neutral cards/lists | local empty state | P0 |
| `/life/journal` | yes | same Journal shell | no | `getJournalPageViewModel` | `src/features/life` | neutral cards/lists | local empty state | P0 |
| `/life/notes` | yes | same Notes shell | no | `getNotesPageViewModel` | `src/features/life` | neutral cards/lists | local empty state | P0 |
| `/life/entertainment` | yes | same Entertainment shell | no | `getEntertainmentPageViewModel` | `src/features/life` | neutral cards/lists | local empty state | P0 |
| `/life/entertainment/games` | skeleton route | route skeleton, no data swap needed | no current need | route skeleton | none | skeleton message | skeleton message | P2 |
| `/life/entertainment/books` | skeleton route | route skeleton, no data swap needed | no current need | route skeleton | none | skeleton message | skeleton message | P2 |
| `/life/entertainment/series` | skeleton route | route skeleton, no data swap needed | no current need | route skeleton | none | skeleton message | skeleton message | P2 |
| `/life/entertainment/movies` | skeleton route | route skeleton, no data swap needed | no current need | route skeleton | none | skeleton message | skeleton message | P2 |
| `/life/inventory` | yes | same Inventory shell | no | `getInventoryPageViewModel` | `src/features/life` | neutral cards/lists | local empty state | P0 |
| `/education` | yes | same Education shell | no | `getEducationOverviewViewModel` | `src/features/education` | neutral cards/lists | local empty state | P0 |
| `/education/scientific-work` | yes | same Education Workspace shell | no | `getEducationWorkspaceViewModel` | `src/features/education` | neutral cards/lists | local empty state | P0 |
| `/education/literature` | yes | same Education Workspace shell | no | `getEducationWorkspaceViewModel` | `src/features/education` | neutral cards/lists | local empty state | P0 |
| `/education/learning-log` | yes | same Learning Log shell | no | `getLearningLogViewModel` | `src/features/education` | neutral cards/lists | local empty state | P0 |
| `/work` | yes | same Work overview shell | no | `getWorkOverviewViewModel` | `src/features/work` | neutral cards/lists | local empty state | P0 |
| `/work/log` | yes | same Work Log shell | no | `getWorkLogViewModel` | `src/features/work` | neutral cards/lists | local empty state | P0 |
| `/work/wiki` | yes | same Work Wiki shell | no | `getWorkWikiViewModel` | `src/features/work` | neutral cards/lists | local empty state | P0 |
| `/shop` | yes | same Shop shell | no | `getShopViewModel` | `src/features/shop` | neutral cards/lists | local empty state | P1 |
| `/challenges` | yes | same Challenges shell | no | `getChallengesViewModel` | `src/features/challenges` | neutral cards/lists | local empty state | P1 |

Aktuell erlaubte `ProfileBoundaryPage`-Zwischenstaende ausserhalb des R1.3-Area-Scope:

- `/review/daily`
- `/timeline`

Diese Routen muessen in spaeteren Arbeiten entweder eine eigene profilfaehige Shell erhalten oder als wirklich unverdrahtete Routen dokumentiert bleiben.

## Design-Fixtures

Die bestehenden Dateien mit `mock` im Namen gelten in R1 als Design-Fixtures. Sie bleiben erhalten, weil der Demo-Stand die V5-Referenz ist. Ein breites Umbenennen wurde bewusst vermieden, damit keine Feature-Bereiche nebenbei refactored werden.

Aktuelle relevante Fixture-Dateien:

- `src/features/dashboard/mock-data.ts`
- `src/features/entities/mock-entity-data.ts`
- `src/features/calendar/calendar-mock-data.ts`
- `src/features/portfolio/portfolio-mock-data.ts`
- weitere Area-Mockdateien unter `src/features/**`

Direkte Fixture-Imports sind in `src/app/**` und `src/components/**` nicht erlaubt. Demo-Fixtures duerfen von Feature-ViewModels fuer den Demo-Stand und von `src/features/profile-data` als zentralem Resolver genutzt werden.

## Nicht in R1

- keine Supabase-Anbindung
- keine Migrationen
- keine Auth-Architektur
- keine RLS-Regeln
- keine Remote-Kommandos
- keine neue Calendar-Komponente
- keine Dashboard-Layoutaenderung
