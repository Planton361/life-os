# Page Widget State Matrix

Stand: 2026-06-24
Status: R1.4 Matrix mit R1.4a Dashboard-Implementierungsstand

## R1.4a Dashboard Implementation Update

Dashboard ist die Referenzimplementierung fuer Content States.

Aktualisierte Dashboard-Vertraege:

| Widget | R1.4a Status | State / Capacity | Manual Flow |
| --- | --- | --- | --- |
| Command Center Metrics | Implementiert | Metrics tragen `data-content-state`; Sleep/Review/Nutrition zeigen natuerliche Empty-Copy. | Tasks/Inbox/Meals werden aus Manual-Daten gezaehlt. |
| Quick Thought | Implementiert | Capture-Widget bleibt P1 und meldet Profil/State. | `manual` schreibt lokalen Inbox-Eintrag; `demo`/`empty` zeigen Hinweis statt Schreibzugriff. |
| Daily Control | Implementiert | `0-4` aus aktuellen Aufgaben; Empty zeigt `Kein aktueller Fokus` und `Create task`. | Manual Tasks nutzen dieselbe Current-/Queue-Darstellung. |
| Time Progress | Implementiert | Profilunabhaengig, immer `Week`, `Month`, `Year`. | Keine Manual-Datenquelle. |
| Mood Check | Implementiert | Empty neutral, gespeicherter Mood semantisch getoent. | Manual Mood wird lokal persistiert. |
| Today Agenda | Implementiert | Timeline-State mit Kapazitaet `9`; Empty liegt im Raster. | Timed Manual Tasks erscheinen im Zeitraster; untimed Tasks nicht. |
| Meals Today | Implementiert | Fixed Slots `Breakfast`, `Lunch`, `Dinner`, Kapazitaet `3`. | Manual Meal Slots werden lokal gespeichert. |
| Habit Tracker | Implementiert | Capacity Pattern `0/8`, `1/8`, `8/8`; Add-Tile bis Kapazitaet. | Manual Habits werden lokal gespeichert und nutzen dieselbe Card. |
| Active Portfolio | Implementiert | Capacity Pattern `0/4`, `1/4`, `4/4`; Add-Tile bis Kapazitaet. | Manual Projects/Goals nutzen dieselben Portfolio Cards. |
| Anti-Rot / Challenges | Implementiert als Empty-Shell | Challenges haben sichtbare Dashboard-Kapazitaet `3` pro aktiver Cadence; Anti-Rot bleibt `5`. | Keine neue Engine; CTA fuehrt zu bestehenden Seiten. |

Nicht-Dashboard-Zeilen unten bleiben Audit-/Planungsstand fuer spaetere Slices.

## R1.4b Operational Pages Audit Update

Scope: `/inbox`, `/today`, `/calendar`, `/portfolio`, `/resources`.

Status: Audit-, Dokumentations- und Planungsblock. Keine Implementierung, keine
Supabase-/Auth-/Migration-Arbeit, keine Demo-Fixture-Loeschung und keine
V5-Layout-Neukomposition.

Quellen:

- Screenshot-Befund aus dem R1.4b Review-Prompt.
- Code-Audit in `src/features/profile-data/**`,
  `src/features/content-state/**`, `src/components/inbox/inbox-page.tsx`,
  `src/features/today/**`, `src/features/calendar/**`,
  `src/features/portfolio/**` und `src/features/resources/**`.

Globale Befunde:

- Alle fuenf Routen lesen ueber `src/features/profile-data`; die Page-Shells
  bleiben damit grundsaetzlich profilfaehig erhalten.
- `data-content-state`, `data-profile-id`, `data-item-count` und
  `data-capacity` sind bisher nur in Dashboard-Section-Primitives umgesetzt.
  Die operativen Seiten brauchen eigene, widgetnahe Selector-Ergaenzungen.
- Der lokale Manual Store unterstuetzt Tasks, Inbox Items, Projects, Goals,
  Habits, Mood und Meal Slots. Es gibt noch keine lokale Resource-Quelle und
  keine Today Opening-/Closing-Review-Records.
- `/resources` nutzt aktuell den generischen Area-Sanitizer. Das ist als
  Zwischenstand hilfreich, aber zu fragil fuer R1.4b: Summary-Metrics,
  Filter-Counts, Review Queue, Map und Relation Inspector brauchen explizite
  Content-State-Metadaten.
- Calendar-Create und Time-Edit sind client-lokale UI-Mocks. Sie duerfen in
  R1.4b nicht als persistente Manual-Create-Flows dokumentiert werden.
- Screenshot-Risiko: Der Review-Befund meldet Resource-KPI-Demozahlen
  `128`, `12`, `34`, `9`, `21`, `46` in Manual/Empty. Code-Audit zeigt eine
  generische Sanitizer-Strecke, aber keinen expliziten Resource-State-Vertrag;
  deshalb bleibt dies ein P0 Demo-Leak-Risiko bis zur Live-Screenshot-Pruefung
  und expliziten Resource-ViewModel-Korrektur.

### R1.4b Operational Page Matrix

| Route | Widget / Section | State Pattern | Empty Design | Partial Design | Filled Design | Capacity | Primary CTA | Manual Create Flow vorhanden | Demo Component | Manual Component | Required Fix | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/inbox` | Header Metrics | Metric / Collection Count | echte 0-Werte, keine Demo-Triage-Counts | lokale Inbox Counts nach Stage | Demo Counts als V5-Referenz | 4 signal cards | Capture / Queue klaeren | Settings-Create ja, Page Quick Capture noch nein | `InboxPageHeader` | gleich via `getInboxViewModel` | `data-content-state`, `data-profile-id`, echte Subcopy statt `manual` | P0 |
| `/inbox` | Inbox Queue | Collection | ein gestalteter Empty State in der linken Queue; keine leere Flaeche | Manual Rows mit gleicher `InboxQueueItemView` | Demo Rows | sichtbare Queue, scrollend | Quick Capture / create inbox item | Settings-Create ja; Page Capture nicht persistent | `InboxQueueItemView` | gleich | EmptyState einfuegen, Quick Capture Flow klaeren, Selectoren | P0 |
| `/inbox` | Active Item Detail | Inspector / Detail | `Kein Inbox-Eintrag ausgewaehlt`; keine Fake-Felder | erstes echtes Manual Item auswaehlbar | Demo active item | 1 selected item | Select item / Capture | indirekt via Settings | `InboxActiveItemPanel` | gleich | `No inbox item selected`, `No manual inbox entries yet` und `Manual Local Profile` ersetzen; EmptyInspectorState | P0 |
| `/inbox` | AI Suggested Planning | Inspector / Detail | Shell bleibt; Area/Priority/Effort/Energy `-`; Apply deaktiviert | Vorschlaege nur aus echtem Item-Kontext | Demo Suggestions | 4 planning signals | Apply suggestion | nein | `AIAssistantPanel` | gleich | leere `planning` rendert aktuell keine explizite Copy; Apply ist aktiv; no remote AI klar trennen | P1 |
| `/inbox` | Decision Checklist | Fixed Checklist | 0/n ohne Fake-Checks | Workflow-Schritte aus echtem Inbox Item | Demo Checklist | Ziel R1.4b: 4 Schritte | Mark clarified | nein | `DecisionChecklist` | gleich | 0/6 und nur zwei Manual-Zeilen auf 0/4 Workflow-Vertrag bringen | P1 |
| `/inbox` | Related Context | Collection / Inspector | Empty State statt leerer Liste oder Demo-Kontext | echte Links spaeter | Demo Related Context | sichtbare Kontextliste | Use / link context | nein | `RelatedContext` | gleich | bei 0 Items expliziten Empty State rendern; keine tote `Use`-Aktion | P1 |
| `/today` | Page First Run / Header | Page First Run | kompakter Hinweis: noch nichts fuer heute erfasst | Tasks/Inbox Counts sichtbar | Demo Header | 1 notice | Start task / capture / opening review | Task/Inbox via Settings | `TodayHeader` | gleich | Header-Copy aktuell noch technisch (`Local profile day`); First-RunNotice fehlt | P0 |
| `/today` | Activity Stream | Timeline / Collection | Timeline-Shell plus ein zentraler Empty State; keine leere OL-Flaeche | Manual Tasks und Inbox Items als Stream Cards | Demo Activity Cards | sichtbarer Stream | Create task / capture | Settings-Create ja | `ActivityStream`, `ActivityEventCard` | gleich | EmptyStream-State; `data-content-state`; grosse leere Flaeche entschraerfen | P0 |
| `/today` | Opening Review | Metric / Fixed Cards | Mood/Energy/Focus/Intent als `Not set` Cards | echte Opening-Werte spaeter | Demo Review Signals | 4-6 cards | Start opening review | nein | `ReviewSignalGrid` | gleich | leeres Grid durch Not-set Cards ersetzen; kein Demo-Fallback | P0 |
| `/today` | Delta Summary | Metric / Trend | echte 0 fuer Tasks/Inbox/Projects; unknown als `-` | lokale Counts | Demo Metrics | 3-6 metrics | Open source workbench | indirekt | `DeltaSummary` | gleich | State-Meta und 0-vs-unknown-Vertrag dokumentieren/implementieren | P1 |
| `/today` | Decisions & Artifacts | Collection | je ein Empty State fuer Decisions und Artifacts | Manual Projects/Goals als Artifacts | Demo Rows | sichtbare Rows | Add decision/artifact spaeter | Project/Goal via Settings teilweise | `DecisionRows`, `ArtifactRows` | gleich | aktuell leere Sektionen ohne Empty Copy | P1 |
| `/today` | Closing Review / Carry Forward | Metric / Collection | Not started / Not saved Cards; Carry Forward leer mit Copy | offene Manual Tasks als Carry Forward | Demo Closing Cards | signals + 4 carry items | Start daily review | nein | `ClosingReview` | gleich | Review-Signals leer; CTA fehlt; Review Records nicht im Manual Store | P0 |
| `/calendar` | Week / Day Timeline | Timeline / Calendar | Raster bleibt; Empty State im Raster: keine Termine/Zeitbloecke | Manual timed Tasks korrekt platziert | Demo Blocks | week/day visible blocks | Create block / task | Task via Settings; Calendar create nur client-local | `CalendarWeekSurface`, `CalendarTimedBlock` | gleich | `data-content-state`; Empty-Copy auf R1.4b-Text; persistente Create-Wahrheit klaeren | P0 |
| `/calendar` | Month / Year Surface | Timeline / Calendar | Month einmaliger Empty State; Year nicht 12x `No markers` dominant | Dated tasks/projects als Marker | Demo Markers | 42 cells / 12 months | Select day/month | nein | `CalendarMonthSurface`, `CalendarYearSurface` | gleich | Year-Empty weniger repetitiv; State-Meta | P1 |
| `/calendar` | Scope / Filters | Control / Collection Filter | Filter sichtbar, keine unabsichtlich offene Overlay-Darstellung | filtert echte Blocks | Demo Scope Row | filter set | Change scope | nein | `CalendarScopeRow` | gleich | Empty-Screenshot auf offen sichtbares Scope-Dropdown pruefen; responsive duplicate scope scopen | P1 |
| `/calendar` | Right Inspector | Inspector / Detail | Selected Day / Empty Slot; kein synthetischer Fake-Block | echter Task/Project Block | Demo selected block | 1 selected context | Create dated task | Task via Settings; UI-create client-local | `CalendarRightPanel` | gleich | `No time block selected`, `Manual profile`, `local mock` durch natuerliche EmptyInspector Copy ersetzen | P1 |
| `/calendar` | Planning Queue | Collection | ein Empty State fuer Tasks/Open loops/Reviews | unscheduled Manual Tasks bleiben in Queue | Demo Queue | 4 visible items | Schedule / create task | Task via Settings | `PlanningQueue` | gleich | leere Queue rendert aktuell keine Empty Copy; Reviews `not wired` vermeiden | P1 |
| `/portfolio` | Summary / Filters / Tabs | Metric / Collection | 0 Counts und Tabs/Filter bleiben | Manual Tasks/Projects/Goals gezaehlt | Demo Stats | 6 stat cards | Filter / view | Task/Project/Goal via Settings | `PortfolioSummaryStrip`, `PortfolioFilterBar` | gleich | `data-content-state`; Skill Manual-Gap ausweisen | P0 |
| `/portfolio` | Active Portfolio List | Collection / Inspector | ein Empty State pro View/Scope; nicht generisch fuer Entity-Typen | Manual Tasks/Projects/Goals mit gleichen Rows | Demo Rows | sichtbare Liste | Open entity / create entity | Task/Project/Goal via Settings | `PortfolioEntityList` | gleich | Empty Copy pro `?view=tasks|projects|goals|skills`; Add/Create CTA zur existierenden Settings-Quelle | P0 |
| `/portfolio` | Context Panel | Inspector / Detail | `No selected entity` Shell bleibt | echtes selected Entity | Demo selected Entity | 1 selected entity | Open source | ja fuer core entities | `PortfolioContextPanel` | gleich | Empty Text nicht nur Filterproblem; Selectoren | P1 |
| `/portfolio` | Query Views | Collection Filter | alle vier Views bleiben ohne Demo-Entities | Manual Tasks/Projects/Goals; Skills leer/deferred | Demo tasks/projects/goals/skills | per view | View switch | Skills nein | `PortfolioPage` | gleich | `?view=tasks`, `projects`, `goals`, `skills` gezielt testen; Dashboard Active Portfolio Konsistenz | P0 |
| `/resources` | KPI / Summary Strip | Metric | 0 oder `-`; keine Demozahlen `128/12/34/9/21/46` | lokale Resource Counts spaeter | Demo KPIs | 6 stats | Save resource | nein | `ResourceSummaryStrip` | generisch sanitisiert, keine Resource-Quelle | explizites Resource VM statt Sanitizer; Demo-Leak P0 pruefen/fixen; Selectoren | P0 |
| `/resources` | Save Resource / Quick Capture | Capture | Shell sichtbar; Save deaktiviert oder klar deferred, solange kein Manual Store existiert | lokale Resource Create spaeter | Demo/static preview | 1 capture form | Save Resource | nein | `SaveResourceCard` | gleich | Readonly-Felder und aktiver Button duerfen keinen echten Save behaupten | P0 |
| `/resources` | Main Library | Collection | genau ein Empty State: `Noch keine Ressourcen gespeichert.` | echte Resource Rows spaeter | Demo Rows | visible library rows | Save resource | nein | Resource row links | same shell, empty data | Content-State selectors; Manual Resource source deferred dokumentieren | P1 |
| `/resources` | Relation Inspector | Inspector / Detail | `Keine Ressource ausgewaehlt` | echter selected Resource | Demo Inspector | 1 resource | Select resource | nein | `ResourceRelationInspector` | same shell | mock-literal empty texts ersetzen; keine Demo-Kontextgruppen in Empty/Manual | P1 |
| `/resources` | Knowledge Map | Chart / Inspector | Map-Shell plus `Noch keine Map-Daten`; keine Fake-Nodes | echte Beziehungen spaeter | Demo map | selected neighborhood | Select resource | nein | `ResourceKnowledgeMap` | same shell | keine dekorative Map ohne Daten; `No direct neighborhood...` Copy naturalisieren | P2 |
| `/resources` | Review Queue / Workbench | Collection / Workflow | `Keine Ressourcen zur Pruefung`; eigene Workbench-Copy | lokale Review Items spaeter | Demo Review Queue | 4 queue items | Inspect / process | nein | `ReviewQueue`, `ResourceReviewWorkbench` | same shell | Review Queue und Workbench duerfen nicht dieselbe Empty Copy nutzen; Buttons deferred | P1 |
| `/resources` | Recent Learnings / AI Hints | Collection | `Noch keine Learnings gespeichert`; Review-Hints leer | lokale Learnings spaeter | Demo Learnings / AI hints | 3-4 learnings | Open resource | nein | `RecentLearnings`, `AISuggestionsPanel` | same shell | keine mehrfach wiederholten `No local entry`/mock Texte; Content-State selectors | P2 |

### R1.4b Implementation Plan In Slices

#### R1.4b.1 - Inbox Content States

Scope:

- Queue Empty State, Active Item Empty Inspector, AI Suggested Planning,
  Decision Checklist, Related Context und Page-level QA attributes.

Dateien:

- Lesen/aendern: `src/features/inbox/inbox-view-model.ts`,
  `src/components/inbox/inbox-page.tsx`,
  `src/features/profile-data/view-models.ts`,
  `src/features/content-state/index.ts`.
- Nicht aendern: Supabase, Auth, Migrationen, Demo-Fixtures, Dashboard Layout.

Risiken:

- Tote Buttons wirken wie echte Workflow-Mutationen.
- Checklist-Vertrag 0/6 vs R1.4b 0/4 muss produktfachlich sauber gesetzt werden.

Akzeptanzkriterien:

- Empty Queue zeigt genau einen Empty State.
- Empty Active Item ist ein Inspector-State, kein Fake-Item.
- AI Apply ist ohne Empfehlung deaktiviert.
- Manual Inbox Item nutzt dieselbe Row-/Detailstruktur wie Demo.
- Relevante Widgets tragen `data-content-state`, `data-item-count`,
  `data-capacity` falls relevant und `data-profile-id`.

Tests:

- `git diff --check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- spaeter gezielter Playwright-Check fuer Demo/Empty/Manual Queue.

Nicht-Ziele:

- Keine AI-Engine, keine Conversion-Engine, keine Supabase-Persistenz.

#### R1.4b.2 - Today Content States

Scope:

- PageFirstRunNotice, Opening Review Not-set Cards, Activity Stream Empty
  State, Delta Summary State-Meta, Decisions/Artifacts Empty States,
  Closing Review Not-started State und Carry Forward.

Dateien:

- Lesen/aendern: `src/features/today/today-view-model.ts`,
  `src/features/today/today-page.tsx`,
  `src/features/profile-data/view-models.ts`,
  `src/features/content-state/index.ts`.

Risiken:

- Today darf keine Dashboard-Kopie werden.
- Review-Records existieren noch nicht im Manual Store.

Akzeptanzkriterien:

- Empty Today bleibt als Day Memory Log strukturiert sichtbar.
- Activity Stream hat einen zentralen Empty State.
- Opening/Closing Review zeigen Not-set/Not-started, keine Demo-Leaks.
- Manual Tasks und Inbox Items erscheinen konsistent zum Dashboard/Calendar.

Tests:

- Standardchecks plus spaeter Playwright fuer Manual Reset und Manual Partial.

Nicht-Ziele:

- Keine Daily-Review-Engine, keine neuen Records, keine Dashboard-Layoutarbeit.

#### R1.4b.3 - Calendar Content States

Scope:

- Week/Day/Month/Year Empty States, Inspector Empty/Slot States, Planning Queue
  Empty State, Scope/Filter Review und QA attributes.

Dateien:

- Lesen/aendern: `src/features/calendar/calendar-page.tsx`,
  `src/features/calendar/calendar-view-model.ts`,
  `src/features/calendar/components/calendar-right-panel.tsx`,
  `src/features/calendar/components/calendar-scope-row.tsx`,
  `src/features/profile-data/view-models.ts`.

Risiken:

- Client-local Calendar create darf nicht als persistente Manual-Mutation
  erscheinen.
- Tasks ohne Uhrzeit duerfen nicht in Fake-Slots landen.

Akzeptanzkriterien:

- Empty Raster bleibt stabil.
- Manual timed Task liegt im richtigen Slot.
- Untimed Tasks bleiben in Planning Queue.
- Inspector zeigt Selected Day / Empty Slot ohne synthetischen Fake-Block.

Tests:

- Standardchecks plus gezielter Manual Task mit Datum, Startzeit und Dauer.

Nicht-Ziele:

- Keine Calendar-Sync-Integration, keine neue Calendar-Komponente.

#### R1.4b.4 - Portfolio Content States

Scope:

- Summary/Filters, Active Portfolio List, Context Panel,
  `?view=tasks|projects|goals|skills`, Manual core entity alignment.

Dateien:

- Lesen/aendern: `src/features/portfolio/**`,
  `src/features/profile-data/view-models.ts`,
  `src/components/dashboard/sections/active-portfolio-section.tsx`.

Risiken:

- Skills haben noch keine Manual-Quelle.
- Empty Copy darf nicht nur Filter-Problem sein, wenn Profil leer ist.

Akzeptanzkriterien:

- Empty/Manual Reset zeigt keine Demo-Entity und keine Demo-Detailauswahl.
- Manual Tasks/Projects/Goals verwenden dieselben Rows wie Demo.
- Query Views sind separat pruefbar.
- Dashboard Active Portfolio und `/portfolio` widersprechen sich nicht.

Tests:

- Standardchecks plus Manual Task/Project/Goal und vier Query Views.

Nicht-Ziele:

- Keine neue Portfolio-Datenquelle, keine Skill-Create-Engine.

#### R1.4b.5 - Resources Content States

Scope:

- Explizite Resource Content-State-Metadaten fuer KPI Strip, Save Resource,
  Library, Inspector, Map, Review Queue/Workbench, Recent Learnings und AI
  Hints.

Dateien:

- Lesen/aendern: `src/features/resources/resources-view-model.ts`,
  `src/features/resources/components/resources-page.tsx`,
  `src/features/profile-data/area-view-models.ts`,
  `src/features/profile-data/types.ts` nur falls Manual Resource Source im
  bestaetigten Scope liegt.

Risiken:

- Bekannter Demo-Leak-Risikopunkt: KPI-Demozahlen in Empty/Manual.
- Generic Sanitizer kann Demo-Copy verdecken, aber nicht fachlich korrekt
  modellieren.

Akzeptanzkriterien:

- Empty/Manual zeigen keine Resource-Demozahlen und keine Demo-Ressourcen.
- Save Resource ist ehrlich disabled/deferred oder persistiert bewusst im
  Manual Store, falls spaeter freigegeben.
- Jede Collection hat genau einen eigenen Empty State.
- Relation-Empty-Copy ist fachlich, nicht mock-literal.

Tests:

- Standardchecks plus blocked-string scan und Screenshot-Review fuer
  Empty/Manual.

Nicht-Ziele:

- Keine Resource-CRUD-Engine, keine Supabase, keine AI-Linking-Automation.

#### R1.4b.6 - QA, E2E, Screenshot Review

Scope:

- Profile Boundary, selectors, Manual Reset/Partial, Demo-Leak Checks,
  Empty-State Checks, responsive duplicate handling und
  Dashboard/Calendar/Today consistency.

Dateien:

- Lesen/aendern: `tests/e2e/content-state-system.spec.ts`,
  `tests/e2e/profile-boundary.spec.ts` falls vorhanden oder im Slice erzeugt,
  `docs/qa/content-state-live-test-checklist.md`.

Risiken:

- Lokale Browser-/Socket-Sandbox kann Screenshot/E2E blockieren.
- Voller App-Sweep ist ausserhalb R1.4b; Tests muessen auf die fuenf Routen
  gescoped bleiben.

Akzeptanzkriterien:

- Demo bleibt V5-Referenz.
- Empty/Manual Reset zeigen keine Demo-Fixtures.
- Manual Partial ist fuer vorhandene lokale Flows sichtbar.
- Selektoren sind stabil scoping-faehig.
- Mobile/desktop Screenshots zeigen keine Layout-Kollapse.

Tests:

- `git diff --check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- spaeter gezielt: `pnpm exec playwright test tests/e2e/content-state-system.spec.ts`

Nicht-Ziele:

- Kein Full-E2E-Sweep, solange nur Dokumentation oder ein einzelner Slice
  umgesetzt wird.

## Legend

- `OK`: Pattern funktioniert fachlich bereits weitgehend.
- `Partial`: Shell/Empty existiert, aber State-Kontrakt, Capacity, QA-Attribute oder Manual-Flow fehlen.
- `Fix`: R1.4-relevante Luecke.
- `Skeleton`: Route ist bewusst nur ein Route-Skeleton und nicht als normale gestaltete Page fertig.
- `Boundary`: Route nutzt fuer `empty`/`manual` noch `ProfileBoundaryPage`.
- `Redirect`: Route ist kein eigenes Content-State-Ziel.

## Matrix

| Route | Widget | State Pattern | Empty Design | Partial Design | Filled Design | Capacity | Primary CTA | Manual Create Flow vorhanden | Demo Component | Manual Component | Required Fix | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | Command Center Metrics | Metric / Trend | Partial: neutrale Werte vorhanden, aber Profilnamen und technische Details sichtbar | Manual Tasks/Inbox werden gezaehlt | Demo Metrics voll | 6 metric cards | fachliche Links | teilweise: Task/Inbox/Project/Goal via Settings | `CommandCenter` / `MetricCard` | gleich, via `getDashboardViewModel` | Profil-Copy aus fachlichen Cards entfernen; Sleep/Nutrition/Review nach Metric-Regel modellieren; QA-Attribute | P0 |
| `/dashboard` | Quick Thought | Collection / Capture | Fix: statische Darstellung, kein echtes Empty/Manual-Verhalten | nicht implementiert | Demo Copy sichtbar | 1 capture input | Capture | nein, Dashboard-Capture schreibt nicht in Manual Store | `QuickThought` | gleich, aber nicht persistent | Textarea/Typauswahl aktivieren; manual -> Inbox schreiben; demo/empty ruhig blocken | P0 |
| `/dashboard` | Daily Control | Fixed Slot / Inspector | Partial: Current Task Card bleibt, CTA ist aktuell `Open tasks` statt `Create task` | Manual Tasks erscheinen, aber active vs queued State nicht formalisiert | Demo Current Task + Queue | current task + 3 queue items | Create task / Choose task / Open task | ja via Settings Task, nicht direkt im Widget | `DailyControl` | gleich | CTA, state meta, queue empty state und QA-Attribute korrigieren | P0 |
| `/dashboard` | Time Progress | System Metric | Fix: Empty/Manual ersetzt Week/Month/Year durch Profile/Tasks/Inbox | nicht relevant | Demo zeigt Zeitfortschritt | Week, Month, Year | Year timeline | n/a | `TimeProgress` | gleich | immer aus aktuellem Datum berechnen; nicht profilabhaengig | P0 |
| `/dashboard` | Mood Check | Metric / Trend | Partial: neutraler Mood vorhanden, aber keine persistente Manual-Mutation | client-only Mood-Auswahl | Demo Mood | 1 current mood + options | Mental health | nein | `MoodBoard` | gleich | Mood aus Daten ableiten; Manual Mood speichern; neutraler Empty-State | P1 |
| `/dashboard` | Today Agenda | Timeline / Calendar | Partial: Empty State im Raster vorhanden | Manual timed Tasks werden projiziert | Demo Events | sichtbare Agenda-Events, derzeit 9 slots | Add task | client-only im Widget; Settings Task ist persistent | `TodayAgenda` / `AgendaEventCard` | gleich | Add Task an Manual Store anschliessen; Startzeit/Dauer-Position pruefen; `data-content-state` | P0 |
| `/dashboard` | Weight Loss Goal | Metric / Trend | Partial: `- kg` und Status leer, aber kein `EmptyMetricValue` | nicht implementiert | Demo Metric | 1 metric | Health | nein | `WeightLossGoal` | gleich | Unknown vs echte 0 klaeren; `empty/partial/filled` Meta | P2 |
| `/dashboard` | Nutrient Balance | Metric / Trend | Fix: zeigt `0 / 0 g` und `Under`; fachlich fraglich | nicht implementiert | Demo macros | 3 nutrients | Meal planner | nein | `NutrientBalance` | gleich | unbekannte Targets nicht als under-target werten; Partial bei einzelnen Meals | P2 |
| `/dashboard` | Meals Today | Fixed Slot | Fix: eine Collection-Empty-Card statt Breakfast/Lunch/Dinner Slots | nicht persistent | Demo Meals | 3 meal slots | Plan or capture meal | client-only Change, keine Manual-Meal-Mutation | `MealsToday` | gleich | Fixed-Slot-Muster mit unplanned/planned/logged/skipped; Manual Store erweitern | P1 |
| `/dashboard` | Running / Muscle / Recovery | Metric / Trend | Partial: neutrale Running-Werte, aber `0 km` kann Fake-Null sein | nicht implementiert | Demo Running/Strength | 3 stats + rhythm/muscle panel | Running / Strength | nein | `RunningTracker` | gleich | Unknown-Werte als `-`/No data; Manual Workout spaeter oder CTA ruhig | P2 |
| `/dashboard` | Habit Tracker | Fixed Slot | Partial: Add-Habit-Tile sichtbar | client-only Habits, nicht persistent; max aktuell effektiv 7 neue | Demo Habits | Soll 8 visible habits | Add habit | nein, client-only | `HabitTrackers` | gleich | 0-8 Capacity; Add-Tile an naechster Position; Manual Habit Store | P1 |
| `/dashboard` | Active Portfolio | Fixed Slot | Partial: eine Empty Card, keine Add-Tile | Manual Projects/Goals sichtbar | Demo Portfolio | Soll 4 visible items | Add project / goal | ja via Settings Project/Goal | `ActivePortfolio` / Portfolio row | gleich | 0/4 Add-Tile; Filled hide Add; Skills manual gap klaeren | P1 |
| `/dashboard` | Anti-Rot Actions | Fixed Slot | Partial: kompakte Empty Card vorhanden | nicht implementiert | Demo Actions | bestehende Demo-Kapazitaet | Open habits | nein | `AntiRotActions` | gleich | Auswahl aus Habits konfigurieren; keine client-only Action als live flow markieren | P3 |
| `/dashboard` | Challenges | Fixed Slot / Collection | Partial: Empty pro Cadence vorhanden | client-only completed state | Demo Challenges | 3 sichtbare Challenges pro aktiver Cadence | Open challenges | nein, Page client-only | `Challenges` dashboard section | gleich | stabile periodische Auswahl; Manual Challenge Store; Empty CTA zu `/challenges` | P3 |
| `/inbox` | Inbox Queue | Collection | Fix: bei 0 Items rendert Liste leer, kein einzelner Empty State | Manual Rows durch gleiche Row-Komponente | Demo Rows | sichtbare Queue, scrollend | Quick Capture / create inbox item | ja via Settings, nicht Page Capture | `InboxQueueItemView` | gleich | Queue Empty State, Quick Capture Flow, `data-content-state` | P0 |
| `/inbox` | Active Item | Inspector / Detail | Partial: synthetisches `No inbox item selected` in Feldern | erstes Manual Item wird aktiv | Demo active item | 1 active item | Select item / Capture | ja via Settings | `InboxActiveItemPanel` | gleich | echten EmptyInspectorState statt Fake-Item-Felder; Area/Priority `-` | P0 |
| `/inbox` | AI Assistant / Suggested Planning | Inspector / Detail | Partial: planning/outcomes leer, aber Button bleibt aktiv | nicht implementiert | Demo suggestions | 4 planning signals | Apply | nein | `AIAssistantPanel` | gleich | Ohne Kontext `-`-Felder und "Noch keine Empfehlung"; tote Apply-Buttons deaktivieren | P1 |
| `/inbox` | Decision Checklist | Fixed Checklist | Partial: 0/6 oder 1/6 statt Spec 0/4 | Manual active item setzt 1/6 | Demo checklist | soll 4 steps | Mark clarified | nein | `DecisionChecklist` | gleich | Checklist-Vertrag auf echte Workflow-Schritte bringen | P1 |
| `/today` | Page First Run / Header | Page First Run | Partial: Summary sagt leer, aber kein kompakter First-Run-Hinweis | Manual counts in Header | Demo Header | 1 notice | Start task / inbox / opening review | Task/Inbox via Settings | `TodayHeader` | gleich | PageFirstRunNotice, verschwindet bei ersten Daten | P0 |
| `/today` | Opening Review | Metric / Fixed Cards | Fix: bei leeren Items rendert Grid leer | nicht implementiert | Demo signals | Mood/Energy/Focus cards | Start opening review | nein | `ReviewSignalGrid` | gleich | sichtbare Not set Cards; Manual review start | P0 |
| `/today` | Activity Stream | Timeline / Collection | Fix: bei 0 Events leere Timeline ohne zentralen Empty State | Manual Tasks/Inbox erscheinen | Demo Stream Cards | visible stream | Create task / inbox | ja via Settings | `ActivityStream` / `ActivityEventCard` | gleich | zentralen Empty State in Stream; keine leere OL | P0 |
| `/today` | Delta Summary | Metric / Trend | Partial: zeigt echte 0 Counts fuer Manual core, aber keine State-Meta | Manual counts | Demo metrics | 3 metrics | Open related workbench | ja indirekt | `DeltaSummary` | gleich | echte 0 vs unknown klaeren; QA-Attribute | P1 |
| `/today` | Decisions & Artifacts | Collection | Fix: bei 0 Decisions/Artifacts rendern leere Sektionen | Manual Projects/Goals als artifacts | Demo rows | visible rows | Add decision/artifact spaeter | teilweise Project/Goal via Settings | `DecisionsArtifacts` | gleich | je ein Empty State fuer Decisions und Artifacts | P1 |
| `/today` | Closing Review / Carry Forward | Metric / Collection | Fix: leere signals/items koennen leer wirken | Manual open Tasks als carry-forward | Demo review cards | signals + 4 carry items | Start daily review | nein | `ClosingReview` | gleich | Not started Cards; Manual review start | P0 |
| `/calendar` | Week/Day Timeline | Timeline / Calendar | OK: Raster bleibt, EmptyCalendarState vorhanden | Manual timed Tasks werden gleiche Blocks | Demo Blocks | week/day visible blocks | Create block / task | Task via Settings; calendar create client-only | `CalendarWeekSurface`, `CalendarTimedBlock` | gleich | `data-content-state`; client create persistenz klaeren | P0 |
| `/calendar` | Month/Year Surfaces | Timeline / Calendar | Partial: Month empty state vorhanden, Year zeigt `No markers` je Monat | Manual tasks/projects | Demo blocks | 42 cells / 12 months | Select day/month | nein | `CalendarMonthSurface`, `CalendarYearSurface` | gleich | Year Empty nicht 12-fach repetitiv machen; state meta | P1 |
| `/calendar` | Right Panel / Selected Block | Inspector / Detail | Partial: synthetischer `No time block selected` Block | echte Auswahl | Demo selected block | 1 selected context | Create dated task | Task via Settings | `CalendarRightPanel` | gleich | EmptyInspectorState statt Fake block source | P1 |
| `/tasks` | Task Workbench List | Collection | OK: Section EmptyState vorhanden | Manual Tasks gleiche EntityCard | Demo Tasks | list | Create task | ja via Settings | `EntityCard` | gleich | Add primary CTA zur existierenden Create-Form dokumentieren; QA-Attribute | P0 |
| `/tasks` | Task Preview / Detail | Inspector / Detail | OK: Nothing selected / not found States | Manual Task detail | Demo Task detail | 1 selected | Open detail | ja via Settings | `PreviewPanel`, detail shell | gleich | Detail Empty Copy weniger mock-literal | P1 |
| `/projects` | Project Workbench List | Collection | OK: EmptyState vorhanden | Manual Projects gleiche EntityCard | Demo Projects | list | Create project | ja via Settings | `EntityCard` | gleich | QA-Attribute; Add CTA | P0 |
| `/goals` | Goal Workbench List | Collection | OK: EmptyState vorhanden | Manual Goals gleiche EntityCard | Demo Goals | list | Create goal | ja via Settings | `EntityCard` | gleich | QA-Attribute; Add CTA | P0 |
| `/skills` | Skill Workbench List | Collection | Partial: EmptyState vorhanden, aber Manual Store hat keine Skills | keine Manual Skills | Demo Skills | list | Create skill spaeter | nein | `EntityCard` | same component, empty data | Manual Skill source oder explizit deferred; QA-Attribute | P1 |
| `/portfolio` | Summary / Filters | Metric / Collection | OK: 0 entity stats possible | Manual core entities counted | Demo stats | summary strip | Filter / view | Task/Project/Goal via Settings | `PortfolioSummaryStrip`, `PortfolioFilterBar` | gleich | `data-content-state` pro collection | P0 |
| `/portfolio` | Active Portfolio List | Collection / Inspector | OK: one EmptyState when no groups | Manual Tasks/Projects/Goals same rows | Demo Portfolio rows | scroll list | Open entity | ja via Settings core | `PortfolioEntityList` | gleich | Add manual Create CTA; Partial/Filled thresholds | P0 |
| `/portfolio` | Context Panel | Inspector / Detail | OK: No selected entity state | Manual selected entity | Demo selected entity | 1 selected | Open source | ja via Settings core | `PortfolioContextPanel` | gleich | Empty text less filter-only when profile empty | P1 |
| `/review/daily` | Daily Review Page | Boundary | Fix: `empty`/`manual` use ProfileBoundaryPage | none | Demo review shell | page shell | Start daily review | nein | route-local `SectionPanel` composition | Boundary for non-demo | Replace Boundary with same review shell and natural empty states | P0 |
| `/resources` | Summary Metrics / Header | Metric | Fix: Screenshot-Review meldet Demo-KPI-Zahlen `128/12/34/9/21/46`; Codepfad ist nur generisch sanitisiert und ohne Content-State-Vertrag | no real Manual resources | Demo metrics | summary cards | Save resource | nein | `ResourcesPage` | same shell via generic sanitized VM | Explizites Resource ViewModel mit 0/unknown-Werten, State-Meta und Demo-Leak-Test | P0 |
| `/resources` | Main Library | Collection | OK/Partial: `Noch keine Ressourcen` exists | no real Manual resources | Demo resource rows | visible library rows | Save resource | nein | resource row components | same, empty data | Manual Resource create deferred or implement; QA attributes | P1 |
| `/resources` | Relation Inspector | Inspector / Detail | OK/Partial: no selected resource state exists | no real Manual resource | Demo inspector | 1 resource | Select resource | nein | inspector components | same | Relation empty texts are still mock-literal; natural copy | P1 |
| `/resources` | Review Queue / Recent Learnings / Map | Collection / Chart | Partial: Empty states exist | no real Manual resources | Demo queues/learnings | section caps | Open resource | nein | resources sections | same | Avoid repeated `No edge modeled`; state meta per section | P2 |
| `/health` | Today Health Schedule | Timeline / Collection | Partial: EmptyState in schedule | no real Manual health | Demo health schedule | visible items | Open Today/Health | nein | `HealthOverviewPage`, `HealthDaySchedule` | sanitized same shell | explicit state meta; create flow deferred | P1 |
| `/health` | Mental / Habits / Running / Strength panels | Metric / Chart | Partial: natural EmptyStates in panels | no real Manual health | Demo panels | section-specific | Open subpage | nein | `MentalHealthPanel`, `HabitsPanel`, `RunningPanel`, `StrengthPanel` | same | Replace sanitizer-only model with explicit section meta | P1 |
| `/health/mental` | Check-In | Metric / Fixed Cards | OK/Partial: visible mental empty states | no real Manual mental data | Demo check-in cards | fixed signals | Open check-in | nein | `MentalHealthActionLandingPage` | explicit profile VM | Manual check-in not implemented; add state attrs | P1 |
| `/health/mental` | Mood Pattern / Current Signal / Sleep | Chart / Metric | OK/Partial: chart/card empty states visible | no real Manual mental data | Demo charts | 7-day trend/cards | Journal / check-in | nein | same page sections | explicit profile VM | Unknown vs 0 and partial trend contract | P2 |
| `/health/mental` | Repair Routines / Actions | Fixed Slot / Collection | OK/Partial: support/action EmptyStates | no real Manual actions | Demo routines | visible routines/actions | Open Today/Journal | nein | same page sections | explicit profile VM | Manual routines/actions source missing | P2 |
| `/health/habits` | Analytics Summary / Heatmap | Chart / Visualization | Partial: `No habit analytics yet` exists | no real Manual habits | Demo analytics | heatmap rows | Add habit | nein | `HabitsAnalyticsPage` | sanitized same shell | Manual habits; 0-8 dashboard relation; data attrs | P1 |
| `/health/habits` | Today Habit Schedule / Detail Focus | Fixed Slot / Inspector | Partial: schedule/detail still sanitized | no real Manual habits | Demo schedule/detail | schedule items | Add habit | nein | `TodayHabitSchedule`, `HabitDetailFocus` | same | Empty detail focus; Manual selected habit | P1 |
| `/health/running` | Running Plan / Sessions / Trend | Metric / Collection / Chart | Partial: sanitized no-data values | no real Manual runs | Demo running page | page sections | Add run later | nein | `RunningTrackerPage` | same | Unknown vs 0, one Empty per collection, manual run deferred | P2 |
| `/health/strength` | Strength Plan / Sessions / Balance | Metric / Collection / Chart | Partial: natural empty labels in panels | no real Manual strength | Demo strength page | page sections | Add workout later | nein | `StrengthTrackerPage` | same | Manual workout source; state attrs | P2 |
| `/health/strength-tracker` | Alias | Redirect | n/a | n/a | redirects to `/health/strength` | n/a | n/a | n/a | redirect | redirect | no matrix work; keep documented as redirect | P3 |
| `/nutrition` | Nutrition Overview Status | Metric / Trend | Partial: sanitized nutrition values | no real Manual nutrition | Demo overview | status cards | Meal planner | nein | `NutritionOverviewPage` | same | Unknown vs 0; explicit state meta | P1 |
| `/nutrition` | Next Meal / Hydration / Grocery Signal | Fixed Slot / Metric | Partial: shell preserved, no real manual source | no real Manual meals | Demo panels | overview sections | Plan meal | nein | overview components | same | Connect to meal slots and grocery data or defer CTA | P1 |
| `/nutrition/meal-planner` | Week Planner Grid | Fixed Slot | Partial: page has emptyState contract, but Manual source is sanitized | no real Manual meals | Demo week slots | 7 days x meals | Plan meal | nein | `MealPlannerView`, `WeekPlannerGrid`, `MealSlotCard` | same | Manual meal slots; Empty/Partial/Filled per day and widget | P1 |
| `/nutrition/meal-planner` | Recipe Suggestions / Inspector / Targets | Collection / Inspector / Metric | Partial | no real Manual recipes | Demo suggestions | visible lists | Select recipe | nein | planner components | same | one Empty per list; unknown target handling | P2 |
| `/nutrition/recipes` | Recipe Browser | Collection | Partial: `No active recipes match` exists | no real Manual recipes | Demo recipe cards | visible recipe cards | Create recipe | client editor only? no durable Manual store | `RecipeBrowser`, `RecipeCard` | same | persistent Manual recipe flow or mark deferred; state attrs | P2 |
| `/nutrition/recipes` | Recipe Detail / Editor | Inspector / Detail | Partial: editor has empty ingredients/instructions | no real Manual recipes | Demo detail | 1 selected recipe | Edit recipe | client-only | `RecipeDetailPanel`, `RecipeEditorDialog` | same | avoid dead save claims; Manual recipe persistence | P2 |
| `/nutrition/grocery` | Grocery Workbench | Collection / Metric | Partial: `No active shopping items` exists | no real Manual grocery | Demo grocery rows | visible lists | Add item | no durable Manual store | `GroceryView`, `GroceryWorkbenchView` | same | Manual grocery source; one Empty per list | P2 |
| `/coding` | Coding Focus / Repository Snapshot | Metric / Collection | Partial: emptyStates exist | no real Manual coding data | Demo coding cards | overview caps | Open repos | nein | `CodingOverviewPage` | same | State attrs; Manual repository source deferred | P2 |
| `/coding` | Agent Sessions / Knowledge | Collection | Partial: emptyStates exist | no real Manual agent sessions | Demo rows | visible rows | Open agents/resources | nein | coding overview sections | same | one Empty per section; avoid sanitized repeated labels | P2 |
| `/coding/repositories` | Repository List / Filters | Collection | Partial: emptyStates exist | no real Manual repos | Demo repository rows | visible list | Add/link repo later | nein | `RepositoriesPage` | same | Manual repository source; QA attrs | P2 |
| `/coding/repositories` | Linked Tasks / Inspector | Inspector / Collection | Partial: `No linked tasks yet` exists | no real Manual repos | Demo inspector | selected repo | Open task/project | Task via Settings only | repository components | same | Cross-link manual tasks to repos deferred | P2 |
| `/coding/agents` | Agent Tasks / Workers | Collection / Inspector | Partial: emptyStates exist | no real Manual agents | Demo hub | visible tasks/workers | Create assignment | client-local draft only | `AgentHubPage` | same | Disable or persist live CTAs; no fake agent automation | P2 |
| `/coding/agents` | Review Queue / Prompts | Collection | Partial: emptyStates exist | no real Manual prompts | Demo prompt/review rows | visible rows | Open prompt | no | agent hub sections | same | Manual prompt/resource source or deferred status | P3 |
| `/coding/skill-map` | Skill Map / Evidence | Chart / Collection | Partial: emptyStates exist | no real Manual skill evidence | Demo map | map cards/evidence | Add skill/evidence later | no | `SkillMapPage` | same | Manual skills/evidence source; no chart fake values | P2 |
| `/coding/knowledge` | Route Skeleton | Skeleton | Skeleton EmptyState | n/a | n/a | n/a | n/a | n/a | `RouteSkeletonPage` | same | Keep as skeleton, do not count as R1.4 complete | P3 |
| `/life` | Journal / Notes / Entertainment / Inventory overview | Collection | Partial: natural EmptyStates exist | no real Manual Life data | Demo cards | overview caps | Add local item | client-local in pages, not profile store | `LifeOverviewPage` | same | Define Manual Life store or mark deferred; state attrs | P2 |
| `/life/journal` | Journal Entries | Collection | Partial: EmptyState exists | no profile-backed entries | Demo/local page state | visible entries | New journal entry | client-local, not profile store | `JournalPage` | same | Privacy-sensitive Manual persistence policy; QA attrs | P2 |
| `/life/notes` | Notes List / Detail | Collection / Inspector | Partial: EmptyState exists | no profile-backed notes | Demo/local notes | visible notes | New note | client-local, not profile store | `NotesPage` | same | Manual notes source; avoid dead save claims | P2 |
| `/life/entertainment` | Media Lists / Detail | Collection / Inspector | Partial: EmptyStates exist | no profile-backed media | Demo/local media | current/wishlist/archive | Add media | client-local, not profile store | `EntertainmentPage` | same | Manual entertainment source or deferred | P3 |
| `/life/entertainment/games` | Route Skeleton | Skeleton | Skeleton EmptyState | n/a | n/a | n/a | n/a | n/a | `RouteSkeletonPage` | same | Keep as skeleton; no generic boundary | P3 |
| `/life/entertainment/books` | Route Skeleton | Skeleton | Skeleton EmptyState | n/a | n/a | n/a | n/a | n/a | `RouteSkeletonPage` | same | Keep as skeleton; no generic boundary | P3 |
| `/life/entertainment/series` | Route Skeleton | Skeleton | Skeleton EmptyState | n/a | n/a | n/a | n/a | n/a | `RouteSkeletonPage` | same | Keep as skeleton; no generic boundary | P3 |
| `/life/entertainment/movies` | Route Skeleton | Skeleton | Skeleton EmptyState | n/a | n/a | n/a | n/a | n/a | `RouteSkeletonPage` | same | Keep as skeleton; no generic boundary | P3 |
| `/life/inventory` | Inventory List / Wishlist / Detail | Collection / Inspector | Partial: EmptyStates exist | no profile-backed inventory | Demo/local items | owned/wishlist lists | Add item | client-local, not profile store | `InventoryPage` | same | Manual inventory source or deferred; CTA truthfulness | P3 |
| `/education` | Ideas / Literature / Fields / Notes overview | Collection / Inspector | Partial: many EmptyStates exist | no real Manual education data | Demo/local education | overview lists | Add idea/source | client-local, not profile store | `EducationOverviewPage` | same | Profile-backed source or deferred; reduce repeated No-copy | P2 |
| `/education/scientific-work` | Research Ideas / Questions / Fields | Collection / Inspector | Partial: EmptyStates exist | no profile-backed scientific work | Demo/local workspace | lists | Add idea/field/question | client-local, not profile store | `EducationWorkspacePage` | same | Manual education store or deferred; state attrs | P2 |
| `/education/literature` | Literature / Notes / Thesis Context | Collection / Inspector | Partial: EmptyStates exist | no profile-backed literature | Demo/local workspace | lists | Add literature | client-local, not profile store | `EducationWorkspacePage` | same | Central Resources relation and Manual source | P2 |
| `/education/learning-log` | Tracks / Practice / Sessions / Insights | Collection / Timeline | Partial: EmptyStates exist | no profile-backed learning log | Demo/local state | visible tracks/sessions | Add session/track | client-local, not profile store | `LearningLogPage` | same | Manual learning store or deferred; one Empty per collection | P2 |
| `/education/master-thesis` | Alias | Redirect | n/a | n/a | redirects to `/education/scientific-work` | n/a | n/a | n/a | redirect | redirect | no content-state work | P3 |
| `/education/research-fields` | Alias | Redirect | n/a | n/a | redirects to `/education/scientific-work` | n/a | n/a | n/a | redirect | redirect | no content-state work | P3 |
| `/education/research-ideas` | Alias | Redirect | n/a | n/a | redirects to `/education/scientific-work` | n/a | n/a | n/a | redirect | redirect | no content-state work | P3 |
| `/education/research-notes` | Alias | Redirect | n/a | n/a | redirects to `/education/scientific-work` | n/a | n/a | n/a | redirect | redirect | no content-state work | P3 |
| `/work` | Work Logs / Architecture / Wiki / Follow-ups overview | Collection / Inspector | Partial: EmptyStates exist | no profile-backed work data | Demo/local state | overview lists | Add work log/wiki/follow-up | client-local, not profile store | `WorkOverviewPage` | same | Manual work store or deferred; state attrs | P2 |
| `/work/log` | Work Logs / Tasks / Activities / Follow-ups | Collection / Timeline | Partial: EmptyStates exist | no profile-backed work log | Demo/local state | lists | Add work log/activity/task | client-local, not profile store | `WorkLogPage` | same | Manual work store; link to canonical Tasks | P2 |
| `/work/wiki` | Wiki Entries / Architecture / Linked Logs | Collection / Inspector | Partial: EmptyStates exist | no profile-backed wiki | Demo/local state | lists | Add wiki entry | client-local, not profile store | `WorkWikiPage` | same | Manual wiki source or central Resources relation | P2 |
| `/work/meetings` | Route Skeleton | Skeleton | Skeleton EmptyState | n/a | n/a | n/a | n/a | n/a | `RouteSkeletonPage` | same | Keep as internal skeleton; not visible main route | P3 |
| `/shop` | Reward List / Inspector | Collection / Inspector | Partial: `No rewards yet` exists | local UI only, not profile-backed | Demo rewards | visible rewards | Add reward | client-local only | `ShopPage` | same | Manual persistence or mark as local simulation; state attrs | P3 |
| `/shop` | Credits / Purchase Simulation | Metric / Workflow | Partial: local UI signal only | client-local | Demo simulation | budget/rewards | Redeem | client-local only | `ShopPage` | same | Avoid implying wallet/account; keep no payments | P3 |
| `/challenges` | Active Challenge / Cadence Lists | Fixed Slot / Collection | Partial: no active challenge and cadence EmptyStates exist | client-local created challenges only | Demo templates/challenges | cadence lists | Create challenge | client-local only | `ChallengesPage` | same | Persist Manual challenges; deterministic dashboard selection | P3 |
| `/challenges` | Templates / Progress | Collection / Metric | Partial | client-local only | Demo templates/progress | visible templates | Start challenge | client-local only | `ChallengesPage` | same | Rhythm, pool and history source; state attrs | P3 |
| `/settings` | Profile Data Source Panel | System / Forms | OK: active profile and counts visible | Manual create forms work for core entities | Demo profile selectable | Task/Inbox/Project/Goal forms | Create core entity / reset | ja for Task, Inbox, Project, Goal | `SettingsPage`, `ProfileDataSettingsPanel` | same | Profile copy allowed here; expand only if later slices require | P0 |
| `/timeline` | Year Timeline | Boundary | Fix: `empty`/`manual` use ProfileBoundaryPage | none | Demo static milestones | page shell | n/a | nein | route-local timeline list | Boundary for non-demo | Either convert to skeleton or profile-aware milestone shell | P3 |

## Route Exceptions

| Route | Current behavior | R1.4 treatment |
| --- | --- | --- |
| `/health/strength-tracker` | redirects to `/health/strength` | no separate widget matrix |
| `/education/master-thesis` | redirects to `/education/scientific-work` | no separate widget matrix |
| `/education/research-fields` | redirects to `/education/scientific-work` | no separate widget matrix |
| `/education/research-ideas` | redirects to `/education/scientific-work` | no separate widget matrix |
| `/education/research-notes` | redirects to `/education/scientific-work` | no separate widget matrix |
| `/work/meetings` | skeleton route, not visible main Work route | keep as skeleton until product scope changes |

## Cross-Cutting Required Fixes

| Area | Required Fix | Priority |
| --- | --- | --- |
| State contract | Add central `ContentState` and `ContentStateMeta` helpers. | P0 |
| QA selectors | Add `data-content-state`, `data-item-count`, `data-capacity`, `data-profile-id`. | P0 |
| Copy | Remove technical profile copy from normal fachliche UI. | P0 |
| Manual store | Extend only for required R1.4 flows after dashboard/core slices. | P0 |
| Dashboard | Fix Time Progress, Daily Control CTA, Meals slots, Quick Thought persistence. | P0 |
| Core pages | Add true Empty states for Inbox Queue and Today empty sections. | P0 |
| Area pages | Replace sanitizer-only status with explicit state meta per section. | P1 |
| Skeletons | Keep skeletons documented separately; do not count as finished `empty`. | P2 |
