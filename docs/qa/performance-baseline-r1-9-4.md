# R1.9.4 Performance Baseline / Build & Runtime Audit

Stand: 2026-06-29
Status: Local performance baseline documented; production performance still open
Zweck: Build-, Runtime-, Repository-/ReadModel- und UI-Render-Baseline fuer den
MVP Core nach R1.9.3 Deployment Environment Readiness.

## 1. Scope

Gepruefte MVP-Core-Flows:

- Dashboard
- Inbox
- Today
- Calendar
- Portfolio
- Resources
- Nutrition
- Skills
- AI Suggestions
- Recurring Trigger

Gepruefte Risikoachsen:

- Server-render cost
- Client-render cost
- Listenlaengen und lokale Manual-DB-Dichte
- unscoped globale Text-/DOM-Suchen in Tests
- breite Repository Reads
- Demo-Fallbacks ausserhalb Demo-Profil
- grosse Client Components mit lokalem State

Performance Scope:

- Lokale Next.js App-Router-Nutzung mit Manual Supabase Runtime.
- Lokaler Browser-Proof gegen bestehende `.local/playwright` Auth-State-Datei.
- Build-/Bundle-Baseline aus `pnpm build`.
- Kein Production APM, kein Hosted Supabase Timing, kein echtes Deployment.

High-risk Areas:

- Manual-DB-Dichte in Inbox, Portfolio, Resources, Nutrition und Skills.
- Portfolio-/Entity-/Inbox-Views, weil komplette ViewModels an grosse Client
  Components uebergeben und dort gefiltert/sortiert werden.
- `tests/e2e/content-state-system.spec.ts`, weil breite Greps mit `Manual` viele
  persistente DB-Flows erzeugen und globale Texttreffer bei alter Proof-Dichte
  instabil werden koennen.
- Portfolio Resource Links und Skill Evidence, weil mehrere Tabellen fuer
  Relation Labels und Source Targets zusammengefuehrt werden.

Low-risk Areas:

- Dashboard, Today und Calendar nutzen serverseitige ViewModels und begrenzen
  sichtbare Core-Projektionen im UI.
- Today und Calendar lesen Aufgaben fuer Tages-/Wochenkontext mit fachlichem
  Date Scope.
- Nutrition Meals nutzen einen Date-Range-Read mit 31-Tage-Limit.
- Recurring Generation ist explizit user-getriggert und auf maximal 31 Tage
  begrenzt.
- AI Suggestions bleiben lokaler deterministischer Mock ohne Provider-Latenz
  und ohne Autowrites.

Deferred:

- Pagination oder serverseitige Query-Contracts fuer Portfolio, Inbox,
  Resources, Skills und Recipe Library.
- Production Real-Data Performance Baseline mit Zielumgebung, echten Row Counts
  und Hosting-Timings.
- Query-Index-/EXPLAIN-Audit fuer wachsende Supabase Tabellen.
- Bundle-Analyse mit dediziertem Analyzer, falls spaeter freigegeben.

## 2. Nicht-Ziele

- keine neuen Produktfeatures
- keine UI-Rekomposition
- keine Dashboard-Layout-Aenderung
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB
- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- kein Deployment
- keine neue Library
- kein Service Role Key
- keine Secrets gelesen oder dokumentiert

## 3. Build Baseline

Startcheck:

```text
git status --short
git log --oneline -45
git diff --check
pnpm typecheck
pnpm lint
pnpm build
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase db lint --local --level warning
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase db advisors --local --type security --level warn --fail-on none
```

Ergebnis:

- Tracked Worktree war vor Arbeitsbeginn sauber.
- Nur erlaubte untracked Eintraege waren vorhanden:
  `docs/product/life-os-full-roadmap-checklist.md` und `private/`.
- `git diff --check`: gruen.
- `pnpm typecheck`: gruen.
- `pnpm lint`: gruen.
- `pnpm build`: im Sandboxlauf wegen Turbopack `creating new process` /
  `binding to a port` / `Operation not permitted` blockiert; lokal/escalated
  erfolgreich.
- Supabase local `db lint`: gruen, `No schema errors found`.
- Supabase local Security Advisors: gruen, `No issues found`.

Build Baseline:

- Next.js `16.2.2` mit Turbopack.
- `.env.local` wurde von Next als Environment-Datei erkannt, aber Codex hat
  keine Env-Werte gelesen oder dokumentiert.
- Optimized production build erfolgreich.
- Compilation erfolgreich in `1584ms`.
- TypeScript im Build erfolgreich in `6.0s`.
- Static page generation: `54/54`.
- Routenliste wurde ausgegeben; keine Route-Groessen wurden von diesem
  Next/Turbopack-Build angezeigt.
- Statisch prerendered: `/`, `/_not-found`.
- Alle sichtbaren App-Routen wie `/dashboard`, `/inbox`, `/today`,
  `/calendar`, `/portfolio`, `/resources`, `/nutrition`, `/skills`,
  `/settings` und Area-Routen sind dynamisch server-rendered on demand.

Auffaellige grosse Routen:

- Der Build gab keine kB-Groessen aus, daher keine harte Bundle-Groessenwertung.
- Code-Struktur zeigt grosse Client-Surfaces in Inbox, Resources, Calendar,
  Today und Portfolio Context Panel. Diese sind Runtime-Monitoring-Kandidaten,
  aber lokal im Browser-Grep ausreichend.

## 4. Runtime Baseline

Ausgefuehrt mit:

```text
PLAYWRIGHT_HOST=localhost
PLAYWRIGHT_PORT=3000
PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json
```

Core-Grep:

```text
pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Inbox|Today|Dashboard|Calendar|Portfolio"
```

Ergebnis:

```text
86 passed
2 skipped
```

Extensions-Grep:

```text
pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resources|Nutrition|Skill|AI|Recurring"
```

Ergebnis:

```text
25 passed
```

Zusaetzlicher fokussierter Stabilisierungslauf:

```text
Manual Nutrition creates recipe meal and completes it reload-stable: 1 passed
```

Runtime-Bewertung:

```text
Performance ist lokal ausreichend fuer MVP-Core-Browser-Nutzung.
Production Performance bleibt offen bis Deployment-/Real-Data-Baseline.
```

## 5. Repository / ReadModel Findings

Dashboard / Today / Calendar:

- Dashboard liest Manual Tasks serverseitig und projiziert danach sichtbare
  Agenda-, Daily-Control- und Portfolio-Slices.
- Today baut Activity Stream, Planner Candidates und Review-Shell aus dem
  serverseitigen Manual-Profile-ViewModel.
- Calendar baut Timed Blocks und Planner Queue aus Tasks; Calendar-Layout wird
  lokal berechnet, aber fuer MVP-Listenlaengen ausreichend.
- Calendar Tasks koennen ueber `getCalendarTasks` date-scoped gelesen werden;
  mehrere aktuelle ViewModel-Pfade nutzen jedoch noch breitere Task-Reads fuer
  gemeinsame Projektionen.

Portfolio:

- Portfolio laedt Tasks, Projects, Goals, Skills, Skill Evidence und Resource
  Links fuer ein gemeinsames Workbench-ViewModel.
- Relation Labels werden same-user und serverseitig aufgeloest.
- Risiko: komplette aktive Listen werden an die Client-Workbench uebergeben und
  dort weiter gefiltert/sortiert.
- Keine Pagination oder harte Query-Limits eingefuehrt, weil das ein eigener
  Query-Contract-Scope waere.

Resources:

- Resource Relation Targets werden nach Typ gruppiert und per parallelen
  same-user Queries aufgeloest.
- Create-Target-Picker ist bereits auf `50` Eintraege pro Typ begrenzt.
- Risiko: Resource Library und Relation-Liste lesen weiterhin alle aktiven
  Resources/Relations fuer den User.

Nutrition:

- Meals nutzen `getMealsByUserAndDateRange` mit validiertem 31-Tage-Maximum.
- Recipes lesen alle aktiven oder alle User-Rezepte je View.
- Risiko: Recipe Library und Planner-Suggestions brauchen spaeter Search,
  Scope oder Pagination, wenn echte Recipe-Dichte steigt.

Skills:

- Active Skills und Skill Evidence werden separat gelesen und serverseitig nach
  Skill gruppiert.
- Skill Source Targets werden fuer UI-Auswahl lokal auf 24 Eintraege pro
  Source-Art begrenzt.
- Risiko: Evidence-Historie kann wachsen und braucht spaeter Query Scope je
  Skill oder Zeitraum.

Inbox / AI Suggestions:

- Inbox liest aktive Inbox Items user-scoped und archived-scoped.
- Existing Targets fuer Inbox Add/Create sind auf 12 Projects, 12 Goals und 12
  Resources begrenzt.
- AI Suggestion Action liest aktuell alle aktiven Inbox Items und sucht die
  Ziel-ID lokal; fuer MVP ausreichend, spaeter besser als ID-spezifischer Read.
- AI Suggestions bleiben Mock und haben keine externe Runtime-Latenz.

Recurring:

- Aktive Templates werden user-scoped gelesen.
- Generation ist explizit, idempotent und auf 31 Tage begrenzt.
- Keine automatische Page-Load-Generation, keine Background Jobs.

## 6. UI Render Findings

- `src/components/inbox/inbox-page.tsx` ist eine grosse Client Component
  (`2743` Zeilen) mit mehreren lokalen Draft-/Action-State-Flows. Sie ist
  funktionsreich, aber bei stark wachsender Inbox ein Kandidat fuer spaetere
  Teilung nach Draft-Surface.
- `src/features/portfolio/components/portfolio-page.tsx` filtert und sortiert
  `viewModel.entities` clientseitig mit `useMemo`. Das ist fuer aktuelle
  Manual-Dichte ausreichend, aber ab groesseren aktiven Entity-Mengen sollte
  serverseitiger Scope oder Pagination folgen.
- `src/features/portfolio/components/portfolio-context-panel.tsx` ist gross
  (`1797` Zeilen) und rendert viele Entity-spezifische Panels. Kein akuter
  Performance-Fix ohne Komponenten-Scope.
- `src/features/resources/components/resources-page.tsx`, Calendar und Today
  sind grosse Client-/Page-Surfaces, aber sie erhalten bereits geformte
  ViewModels.
- Keine Layout-, Design- oder Motion-Werte wurden geaendert.

## 7. Manual DB Density Impact

Bewertung:

- Die lokale Manual-DB akkumuliert Proof-Daten bewusst.
- Das ist fuer Real-Browser-Proofs wertvoll, erzeugt aber Such-/Selector- und
  Listenrisiken.
- Der R1.9.4 Runtime-Lauf fand einen konkreten Teststabilisierungsbedarf in
  Nutrition: globale `page.getByText(...).first()`-Treffer konnten versteckte
  oder alte Recipe-Treffer vor dem stabilen sichtbaren Ziel finden.
- Die Loesung war keine DB-Cleanup-Aktion und kein Reset, sondern scoped
  Assertions gegen Recipe Results und den stabilen Completed-Meal-Status.

Konsequenz:

- Manual-DB-Dichte ist ein Performance- und QA-Risiko, aber kein aktueller
  Blocker fuer lokale MVP-Core-Nutzung.
- Breite Listen bleiben akzeptabel fuer MVP-Core lokal; sie duerfen nicht als
  Production-Performance-Freigabe gelesen werden.

## 8. Fixes

Geaendert:

- `tests/e2e/content-state-system.spec.ts`

Fix:

- Nutrition Recipe Assertions wurden von globaler Textsuche auf scoped Recipe
  Results umgestellt.
- Der abschliessende Nutrition-Proof prueft nach Meal Completion nicht mehr,
  dass die erledigte Mahlzeit als offener Planner-Slot sichtbar bleibt.
  Stattdessen bleibt der stabile Proof: Completed Meal in Recent Meals plus
  Recipe in der Recipe Library.

Nicht geaendert:

- Keine App-Features.
- Keine UI-Rekomposition.
- Keine Repository-Contracts.
- Keine Migration.
- Keine RLS-/Policy-/Grant-Regeln.
- Keine Remote-DB.
- Kein Deployment.

## 9. Deferred Performance Work

- Serverseitige Query-Scopes fuer Portfolio Views, Inbox Active/Queue, Resources
  Library und Skills/Evidence.
- Pagination oder cursor-basierte Listen fuer stark wachsende Manual-DB.
- ID-spezifischer Inbox-Read fuer AI Suggestion Action statt lokaler Suche in
  aktiven Inbox Items.
- Production-basierte Route-/TTFB-/Interaction-Messung nach Deployment
  Rehearsal.
- Supabase Query-Index-/EXPLAIN-Audit fuer `user_id`, `archived_at`,
  `planned_date`, `scheduled_start_at`, `updated_at`, relation target fields
  und Nutrition date ranges.
- Optionaler Bundle Analyzer erst nach separater Freigabe.

## 10. Production Readiness Impact

```text
R1.9.4_PERFORMANCE_BASELINE_DOCUMENTED
BUILD_BASELINE_GREEN_LOCAL_ESCALATED
RUNTIME_GREPS_GREEN
MANUAL_DB_DENSITY_RISK_DOCUMENTED
NO_PRODUCTION_PERFORMANCE_CLAIM
NOT_PRODUCTION_RELEASE_READY
```

R1.9.4 reduziert lokale Performance- und Runtime-Unklarheit. Der MVP Core ist
lokal ausreichend performant fuer Browser-Nutzung mit vorhandener Manual-DB.

R1.9.4 ersetzt nicht:

- Deployment Rehearsal
- Target-Env-Verifikation
- Production Supabase Performance-/Security-Audit
- Production Backup Drill
- Full Accessibility Audit
