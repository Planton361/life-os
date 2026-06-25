# R1.5 Manual Data & Layout Reality Audit

Stand: 2026-06-25
Status: Audit abgeschlossen
Scope: lokale Profile `demo`, `empty`, `manual`; keine Supabase-, Auth-, RLS- oder Migrationsarbeit.

## Kurzfazit

Life OS hat eine belastbare lokale Manual-Schicht fuer den Daily Core: Inbox, Tasks, Today, Calendar, Portfolio, Dashboard-Habits, Dashboard-Mood und Dashboard-Meal-Slots. Diese Daten sind reload-stabil, weil sie in `.local/life-os/manual-profile.json` geschrieben werden.

Die Area-Seiten sind groesstenteils profile-aware und blocken Demo-Leaks in `empty`/`manual`. Viele fachliche Add-Flows in Education, Coding, Work, Life, Recipes/Grocery und Learning Log sind aber nur clientseitige Mock-Saves. Sie sehen interaktiv aus, sind nach Reload nicht stabil und duerfen nicht als echte Persistenz gewertet werden.

Das WQHD-First-Viewport-Verhalten ist fuer Dashboard, Inbox, Today, Calendar, Portfolio, Health, Nutrition und mehrere Life-Seiten ausreichend. Layout-Risiken bestehen bei grossen Workbenches: `/settings`, `/work`, `/coding/agents`, `/coding/skill-map`, `/education`, `/education/learning-log`, `/work/wiki` und teilweise Nutrition/Resources/Coding-Detailseiten. Dort ziehen lange Card-Sammlungen die Page nach unten; wichtige spaete Bloecke sind erst nach Scroll sichtbar und brauchen spaeter bewusstere interne Scrollbereiche.

## Ausgefuehrte Checks

Start-Gate:

```bash
git status --short
git diff --check
pnpm exec tsc --noEmit --incremental false
pnpm lint
```

Ergebnis: sauber fuer tracked Files. Nur `private/` und `supabase/` waren untracked.

Browser-/Smoke-Pruefung:

```bash
pnpm exec playwright test tests/e2e/content-state-system.spec.ts
pnpm exec playwright test tests/e2e/profile-boundary.spec.ts
```

Ergebnis:

- `content-state-system.spec.ts`: 48 passed, 1 failed, 11 did not run.
- `profile-boundary.spec.ts`: 1 passed, 1 failed, 1 did not run.
- Der erste Playwright-Versuch ohne Escalation scheiterte beim `webServer`-Start. Der zweite Versuch mit localhost-Escalation lief.
- Zusaetzlich wurde ein Browser-Metrik-Audit auf WQHD `2560x1440` fuer alle Scope-Routen ausgefuehrt.

## Ergebnis-Matrix

| Route | Primary Flow | Create/Add Flow vorhanden? | Lokal sichtbar nach Create? | Reload-stabil? | Partial State korrekt? | Filled/Demo-Parity ausreichend? | First-Viewport Layout okay? | Interne Scrollbereiche noetig? | CTA-State korrekt? | Persistenzbedarf | Prioritaet | Empfohlener naechster Slice |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| `/inbox` | Quick Capture -> Queue/Detail | Ja | Ja | Ja | Ja | Ja | Ja | Spaeter bei langer Queue | Ja | Inbox Items | P0 | Inbox persistente Core-Quelle behalten und Triage-Actions als naechstes pruefen |
| `/today` | Task/Inbox Day Projection | Indirekt via Dashboard/Settings | Ja | Ja | Ja | Ja | Ja | Ja, Activity/Carry Forward bei mehr Daten | Ja | Daily Record + Task Projection | P0 | Today Daily Record persistent machen |
| `/calendar` | Timed Task -> Week; untimed -> Queue | Indirekt via Task | Ja | Ja | Ja | Ja | Ja | Ja, Week Grid/Inspector | Ja | Calendar Events + Task time fields | P0 | Freie Calendar Events persistent machen |
| `/portfolio` | Task/Project/Goal Overview | Ja via Settings | Ja | Ja | Ja | Ja | Ja | Ja, Entity List/Context | Ja | Tasks/Projects/Goals/Skills | P0 | Skills in Manual Profile ergaenzen |
| `/resources` | Resource Workbench | Nein | Nein | Nein | Ja, leer | Demo-Parity shell ok | Ja, aber Review Queue tief | Ja, Library/Inspector | Teilweise: Save Resource ist vorbereitet | Resources | P0 | Manual Resource Store + Save Resource |
| `/health/mental` | Mood/Check-in | Dashboard Mood ja; Page Check-in nein | Ja fuer Mood | Ja | Ja | Ausreichend, aber Label-Test drift | Ja | Spaeter Pattern/Actions | Ja: Page Check-in disabled | Mood + Check-ins | P1 | Mental Check-in persistent machen |
| `/health/habits` | Habit/Habit Log | Dashboard Habit ja; Logs nein | Ja fuer Habit | Ja | Ja | Ja | Ja | Ja, Pattern Table bei Logs | Ja | Habit Logs | P1 | Habit Log persistent machen |
| `/health/running` | Run source | Nein | Nein | Nein | Ja, leer | Shell ok | Grenzwertig: viele Bloecke tief | Ja | Ja, keine echte Persistenz behauptet | Running Sessions | P2 | Minimal Run Session Store |
| `/health/strength` | Strength source | Nein | Nein | Nein | Ja, leer | Shell ok | Ja | Ja | Ja | Strength Sessions | P2 | Minimal Strength Session Store |
| `/nutrition` | Meal/Hydration/Weight | Dashboard Meal Slots ja; Hydration/Weight nein | Ja fuer Meals | Ja | Ja | Ja | Ja | Spaeter Recent Meals | Ja | Meals, Hydration, Weight | P1 | Meal Slots aus Dashboard in Nutrition-Quelle ueberfuehren |
| `/nutrition/meal-planner` | Slot/Meal Plan | Nein fuer Page-Plan | Nein | Nein | Ja, leer | Shell ok | Ja, Weekly Plan gross | Ja, Week Grid | Teilweise | Meal Plans | P1 | Meal Plan Slot Store |
| `/nutrition/recipes` | Recipe Browser | Client/mock editor vorhanden | Nur runtime | Nein | Ja, leer | Shell ok | Ja, Browser/Detail sehr hoch | Ja | Riskant: Save lokal wirkt echt, aber nicht reload-stabil | Recipes | P1 | Recipe Store vor Planner/Grocery ausbauen |
| `/nutrition/grocery` | Grocery/Pantry | Client/mock Add/Review vorhanden | Nur runtime | Nein | Ja, leer | Shell ok | Ja, aber Must-have/Receipt unten | Ja | Riskant fuer Add Item/Review receipt | Grocery Items/Pantry | P2 | Grocery Store nach Recipes/Meal Plan |
| `/coding` | Coding Tasks/Projects/Notes | Client/mock Actions vorhanden | Nur runtime | Nein | Ja, leer | Shell ok | Ja | Spaeter | Riskant bei mock Actions | Coding Work Items | P2 | Coding Notes/Tasks an Canonical Tasks/Resources anbinden |
| `/coding/repositories` | Repo source | Client/mock Add Repo vorhanden | Nur runtime | Nein | Ja, leer | Shell ok | Grenzwertig: H1/Metrik-Anordnung wirkt verschoben | Ja | Riskant bei Add Repo | Repositories | P2 | Repository Store oder klarer disabled/deferred CTA |
| `/coding/agents` | Agent Sessions | Client/mock actions vorhanden | Nur runtime | Nein | Partial/empty gemischt ok | Shell ok | Nein: lange Page, spaete Sessions below fold | Ja | Riskant bei run/session CTAs | Agent Sessions | P2 | Agent Session source erst nach Core Daily |
| `/coding/skill-map` | Skill source | Client/mock Add Skill/Evidence | Nur runtime | Nein | Ja | Shell ok | Grenzwertig: Map dominiert; untere Bloecke below fold | Ja | Riskant bei Add Skill | Skills + Evidence | P1 | Manual Skills persistent machen |
| `/life/journal` | Journal Entry | Client/mock draft flow | Nur runtime | Nein | Ja, leer | Shell ok | Ja | Spaeter entries list | Riskant falls Save lokal erscheint | Journal Entries | P2 | Journal Store nur mit Privacy-Klasse |
| `/life/notes` | Loose Note | Client/mock note flow | Nur runtime | Nein | Ja, leer | Shell ok | Ja | Spaeter note history | Riskant | Notes | P2 | Notes Store mit personal_sensitive |
| `/life/entertainment` | Media Flow | Client/mock media flow | Nur runtime | Nein | Ja, leer | Shell ok | Ja | Nein akut | Riskant | Entertainment Items | P3 | Spaeter Media Store |
| `/life/inventory` | Inventory/Wishlist | Client/mock item flow | Nur runtime | Nein | Ja, leer | Shell ok | Ja | Nein akut | Riskant | Inventory Items | P3 | Spaeter Inventory/Wishlist Store |
| `/education` | Research Ideas/Notes/Questions | Ja, aber client-local mock | Ja runtime | Nein | Ja | Demo-Parity ok, aber viel Vertical Stack | Nein: wichtige Bloecke unter fold | Ja | Copy sagt "not persisted or synced"; CTA ok genug | Research Ideas/Notes/Questions | P1 | Education client mocks in Manual store oder explizit deferred |
| `/education/scientific-work` | Thesis/Research Focus | Client/mock workspace | Nur runtime | Nein | Ja, fake thesis entfernt | Shell ok | Ja | Spaeter | Ja | Scientific Works | P2 | Scientific Work Store nach Education core |
| `/education/literature` | Literature Source | Client/mock Add Literature | Nur runtime | Nein | Ja | Shell ok | Ja | Ja, source lists | Ja/teilweise | Literature Items | P1 | Literature Store |
| `/education/learning-log` | Track/Session | Client/mock Log Session | Nur runtime | Nein | Ja | Shell ok | Nein: long page, insights below fold | Ja | Teilweise disabled ohne tracks | Learning Tracks/Sessions | P2 | Learning Session Store |
| `/work` | Work Entry/Wiki/Follow-up | Client/mock Work Drafts | Nur runtime | Nein | Ja | Shell ok | Nein: Work Sections/Privacy below fold | Ja | Riskant bei local draft language | Work Logs/Follow-ups | P1 | Work Log persistent machen |
| `/work/log` | Work Log + Task Context | Client/mock Add Work Log | Nur runtime | Nein | Ja | Shell ok | Ja, knapp | Ja | Riskant | Work Logs | P1 | Work Log Store + task link |
| `/work/wiki` | Wiki/Architecture Notes | Client/mock Add Wiki/Architecture | Nur runtime | Nein | Ja | Shell ok | Grenzwertig: Linked Work Logs below fold | Ja | Copy sagt local mock | Work Wiki Pages | P2 | Work Wiki Store nach Work Log |
| `/shop` | Reward Draft | Nein dauerhaft | Nein | Nein | Ja, leer | Shell ok | Ja | Spaeter shop list | Ja | Rewards | P3 | Deferred; nur CTA-Texte pruefen |
| `/challenges` | Challenge Draft | Nein dauerhaft | Nein | Nein | Ja, leer | Shell ok | Ja | Spaeter board | Ja | Challenges | P3 | Deferred; keine Core-Persistenz |
| `/settings` | UI State + Manual Data Hub | Ja fuer UI mock + Manual entities | UI mock runtime; entities persistent | UI State nein; entities ja | Ja | Shell ok | Nein: Manual Create Hub erst weit below fold | Ja | Fehler: Save changes bleibt disabled nach Compact | Settings UI state optional | P1 | Settings dirty-state Bug fix, danach Persistenzclaim klaeren |

## P0/P1 Findings

### P0

1. Persistent Core ist vorhanden, aber nicht vollstaendig: Resources fehlt als zentrale Source, obwohl `/resources` ein P0-kanonischer Bereich ist.
2. Skills fehlen im reload-stabilen Manual Store, obwohl Portfolio und Skill Map fachlich auf Skills zeigen.
3. Settings-Smoke failed: nach Klick auf `Compact` bleibt `Save changes` disabled. Das ist ein CTA-State-Bug, weil eine lokale UI-State-Aenderung nicht speicherbar wird.

### P1

1. Viele clientseitige "Save locally"-Flows erzeugen nur Runtime-Daten. Das ist als Demo-Interaktion akzeptabel, aber fuer Manual partial nicht reload-stabil.
2. `/settings` ist zu lang fuer den aktuellen Doppelzweck: Settings plus Manual Data Hub. Der Manual Create Hub startet erst unterhalb des ersten Viewports.
3. `/work`, `/coding/agents`, `/education`, `/education/learning-log`, `/work/wiki` und `/coding/skill-map` brauchen spaeter interne Scrollbereiche oder strengere Bloeckung.
4. `/health/mental` Test/UI-Drift: der Test erwartet `Local Signal Pattern`, die aktuelle UI zeigt `Stimmungsverlauf`.
5. `/coding/repositories` wirkt im WQHD-Metrik-Audit ungewoehnlich: der H1 wurde niedriger gemessen als erste Workbench-Bloecke. Das sollte visuell nachgeprueft werden.

## First-Viewport Layout Audit

Gut:

- `/dashboard`: alle V5-Hauptwidgets auf WQHD erkennbar; kein horizontaler Overflow.
- `/inbox`, `/today`, `/calendar`, `/portfolio`: Core-Workflow sichtbar; feste Hoehen verhindern Kollaps.
- `/health/mental`, `/health/habits`, `/nutrition`, `/life/*`, `/shop`, `/challenges`: Empty/Manual-Shells wirken bewusst statt kollabiert.

Risikozonen:

- `/settings`: Scrollhoehe ca. 3683 px; Manual Create Panels erst nach System/Danger Zone.
- `/work`: Scrollhoehe ca. 2588 px; Work Sections und Privacy Notes liegen below fold.
- `/coding/agents`: Scrollhoehe ca. 2329 px; Recent Sessions/Prompt Library/Context Bundles below fold.
- `/education`: Scrollhoehe ca. 1957 px; Method Notes below fold, Hauptlisten starten spaet.
- `/education/learning-log`: Scrollhoehe ca. 2046 px; Insights und Method Notes below fold.
- `/work/wiki`: Scrollhoehe ca. 1743 px; Linked Work Logs below fold.
- `/coding/skill-map`: Map/Inspector dominieren; untere Bloecke below fold.
- `/nutrition/recipes`, `/nutrition/grocery`, `/resources`: Hauptlisten/Inspector sind sehr hoch; bei Filled States sind interne Scrollgrenzen wichtig.

## Manual Flow Audit

Reload-stabil bestaetigt durch Codepfad und Smokes:

- Dashboard Quick Thought -> Manual Inbox.
- Inbox Quick Capture -> Manual Inbox.
- Manual Task -> Dashboard, Today, Calendar, Portfolio, Tasks.
- Manual Project -> Portfolio, Projects, Dashboard Active Portfolio.
- Manual Goal -> Portfolio, Goals, Dashboard Active Portfolio.
- Dashboard Habit -> Dashboard Habit Trackers und Health/Habits-Projektion.
- Dashboard Mood -> Dashboard Mood und Mental Health/Health-Projektion.
- Dashboard Meal Slot -> Dashboard Meals und Nutrition Overview/Meal Planner-Signale.

Nicht reload-stabil, nur client/runtime:

- Education Ideas, Literature, Notes, Questions.
- Learning Log Tracks/Sessions.
- Coding Repositories, Agent Tasks/Sessions, Skill/Evidence/Practice.
- Work Log, Work Wiki, Architecture Notes, Follow-ups.
- Life Journal, Notes, Entertainment, Inventory.
- Recipes, Grocery/Pantry/Receipt Review.
- Settings UI state save is mock/runtime and aktuell teilweise broken.

## Persistenzentscheidung

Empfohlene Reihenfolge fuer R1.6:

1. P0: Resources Manual Store + Save Resource, weil Resources zentrale kanonische Knowledge-Entity ist und aktuell nur empty/deferred bleibt.
2. P0: Skills in Manual Profile ergaenzen, damit Portfolio/Skill Map nicht nur Tasks/Projects/Goals koennen.
3. P0/P1: Today Daily Record persistent machen, inklusive Review/Carry Forward, ohne Dashboard neu zu komponieren.
4. P1: Calendar freie Events persistent machen; Tasks bleiben weiter kanonische Quelle fuer Timed/Untimed Projection.
5. P1: Habit Logs und Mental Check-ins persistent machen; Mood/Habit Skeleton ist schon vorbereitet.
6. P1: Recipe + Meal Plan Store, danach Grocery/Pantry, weil Grocery ohne Recipes/Meal Plan nur isoliert waere.
7. P1: Work Log Store mit Task Context; Wiki danach.
8. P1/P2: Education Research/Literature Store; Learning Log danach.
9. P2/P3: Coding Repositories/Agents, Journal/Notes, Running/Strength, Inventory/Entertainment, Shop/Challenges.

## R1.6 Slice-Vorschlag

### Slice 1: Resources Manual Source

- Ziel: `/resources` bekommt einen reload-stabilen Manual Resource Create Flow.
- Aendern: `src/features/profile-data/types.ts`, `manual-profile-store.ts`, `area-view-models.ts`, Resources UI Action.
- Nicht aendern: Supabase, Auth, RLS, Dashboard Layout.
- Akzeptanz: Resource nach Create sichtbar in `/resources`; Reload stabil; keine Demo-Leaks in `manual`.

### Slice 2: Manual Skills

- Ziel: Skill Map und Portfolio lesen reload-stabile Manual Skills.
- Aendern: Manual Store + Portfolio/Skill Map Mapper.
- Akzeptanz: Skill nach Create sichtbar in `/skills`, `/portfolio?view=skills`, `/coding/skill-map`; Reload stabil.

### Slice 3: Settings CTA Bug

- Ziel: lokale Appearance/Preference-Aenderung setzt Dirty State zuverlaessig.
- Aendern: `src/features/settings/settings-page.tsx`.
- Akzeptanz: Klick auf `Compact` aktiviert `Save changes` und `Reset local changes`; Smoke-Test gruen.

### Slice 4: Layout Risk Inventory

- Ziel: ohne V5-Neukomposition nur dokumentieren oder gezielt eine Route beauftragen.
- Kandidaten: `/settings`, `/work`, `/coding/agents`, `/education`, `/education/learning-log`.
- Akzeptanz: expliziter `Change Type: layout` pro Route, keine beilaufigen Layoutwerte.

## Life OS Design Taste Review

Was passt zu V5:

- Empty/Manual-Shells bleiben in den meisten Routen strukturell nah an Demo.
- Demo-Leaks sind in Core- und Area-Routen weitgehend geblockt.
- P0 Daily Core bleibt sichtbar und nicht von Area-Dashboards uebersteuert.

Was verletzt V5:

- Einige Workbenches wirken in Empty/Manual eher wie lange Card-Sammlungen als fokussierte Steuerungsoberflaechen.
- Mock-Save-Actions koennen wie echte Persistenz wirken, wenn die Copy nicht direkt sichtbar ist.
- Settings mischt Systemeinstellungen und Manual Data Hub in einer sehr langen Page.

Konkrete Fixes:

- Persistenz zuerst fuer kanonische Sources, nicht fuer alle Mock-Dialoge gleichzeitig.
- Lange Listen/Workbenches nur route-spezifisch mit explizitem Layout-Scope bearbeiten.
- CTA-Copy bei nicht reload-stabilen Flows konsequent als `local mock` oder `not persisted` zeigen.

Acceptance Decision: `PASS_WITH_FIXES`

## Offene Punkte

- Playwright-Smokes sind nicht vollstaendig gruen.
- Keine neue E2E-Matrix gebaut.
- Keine Screenshot-Infrastruktur gebaut.
- Keine Supabase- oder Schema-Arbeit gemacht.
- Keine Private- oder Supabase-Dateien geprueft oder geaendert.
