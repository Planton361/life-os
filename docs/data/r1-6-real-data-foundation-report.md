# Life OS – R1.6A Real Data Foundation Discovery & Architecture Report

Stand: 2026-06-25
Status: Discovery- und Architekturbericht
Scope: Keine Implementierung, keine Supabase-Dateien, keine Migrationen, keine App-Logik-Aenderung.
Quelle: Repo-Analyse auf Basis von R1.5, Produkt-/Design-/Architektur-/Security-Dokumenten und aktueller Codebasis.

## 0. Scope Guard

Dieser Bericht beschreibt den empfohlenen Weg von der aktuellen lokalen/manual/mock-basierten Datenlage zu einer realen, Supabase-backed Data Foundation. Er aendert keine Laufzeitlogik und legt keine Datenbankdateien an.

Nicht betrachtet oder veraendert:

- `private/`
- `supabase/`
- `next-env.d.ts`
- Auth-, RLS-, Migration- oder Table-Dateien
- Runtime-Code in `src/`

Startcheck wurde vor der Analyse ausgefuehrt:

| Check | Ergebnis |
| --- | --- |
| `git status --short` | Erwartet: nur `?? private/` und `?? supabase/` |
| `git log --oneline -12` | Aktueller Stand bis `0999937 test: add manual data layout audit` |
| `git diff --check` | OK |
| `pnpm exec tsc --noEmit --incremental false` | OK |
| `pnpm lint` | OK |

## 1. Current Persistence Inventory

### 1.1 Aktuelle Persistenzquellen

| Store / Adapter | Pfad | Persistiert | Reload-stabil | Profil-aware | Quelle der Wahrheit heute | Hauptrisiko |
| --- | --- | --- | --- | --- | --- | --- |
| Demo fixtures | `src/features/profile-data/fixtures.ts`, Area-Fixtures | Demo-Entities und Demo-Page-Daten | Ja, statisch | Ja, nur `demo` | Demo-only | Demo-Strukturen koennen echte Contracts verdecken |
| Empty profile | `src/features/profile-data/view-models.ts`, `area-view-models.ts` | Nichts | Ja | Ja, `empty` | Abgeleitete leere ViewModels | Muss demo-frei bleiben |
| Manual profile JSON | `.local/life-os/manual-profile.json` via `manual-profile-store.ts` | Tasks, Projects, Goals, Inbox, Habits, latest Mood, Dashboard Meals | Ja | Ja, `manual` | Aktuell einziger echter lokaler Store | Datei ist kein Multi-User-/Auth-/RLS-Modell |
| Server actions | `src/features/profile-data/actions.ts` | Writes in Manual JSON | Ja fuer unterstuetzte Writes | Ja, manuell gated | Mutation Boundary fuer lokale Profil-Daten | Nur Create-/Set-Aktionen, kaum Updates |
| Client page state | Viele Area Pages und Calendar | Laufzeitzustand im Browser | Nein | Unterschiedlich | Nur UI-Preview / Mock-State | Daten gehen bei Reload/Navi verloren |
| Settings UI state | `src/features/settings/settings-page.tsx` | Nur React state | Nein | Ja als UI-Kontext | Kein echter Settings Store | Kann echte Settings suggerieren |
| Entity projections | `src/features/entities/*` | Keine Writes | Ja, aus Quelle abgeleitet | Ja | Read-only Entity Workbench | Buttons wirken teils aktiv, schreiben aber nicht |

### 1.2 Manual Profile Store

| Entity | Store-Feld | Write-Pfad | Read-/Projektionspfad | Aktuelle Routen | Reload-stabil | Luecke |
| --- | --- | --- | --- | --- | --- | --- |
| Task | `tasks` | `createManualTask`, `createManualTaskAction`, `createDashboardTaskAction` | Dashboard, Today, Calendar, Portfolio, Tasks, Projects, Goals | `/dashboard`, `/today`, `/calendar`, `/portfolio`, `/tasks`, `/projects`, `/goals` | Ja | Kein Update, Complete, Reschedule, Triage, Carry Forward |
| Inbox Item | `inboxItems` | `createManualInboxItem`, `createInboxQuickCaptureAction`, `captureDashboardQuickThoughtAction` | Inbox, Today event projection | `/inbox`, `/today`, `/dashboard` | Ja | Keine Triage, kein Convert-to-task/project/resource |
| Project | `projects` | `createManualProjectAction` | Dashboard, Portfolio, Projects, Goals, Calendar deadlines | `/projects`, `/portfolio`, `/calendar`, `/dashboard` | Ja | Kein Update, Archive, Membership-Management |
| Goal | `goals` | `createManualGoalAction` | Dashboard, Portfolio, Goals, Today artifacts | `/goals`, `/portfolio`, `/dashboard`, `/today` | Ja | Keine Progress-/Review-Records |
| Habit definition | `habits` | `createDashboardHabitAction` | Dashboard, Health Overview, Health Habits | `/dashboard`, `/health`, `/health/habits` | Ja | Keine Habit Logs, keine Streak-Wahrheit |
| Mood snapshot | `mood` | `setDashboardMoodAction` | Dashboard, Health Mental | `/dashboard`, `/health/mental` | Ja | Nur letzter Wert, keine Mood-Historie |
| Meal slots | `meals` | `saveDashboardMealSlotAction` | Dashboard, Nutrition Overview | `/dashboard`, `/nutrition` | Ja | Kein Meal Plan, keine Recipe-/Grocery-Relation |

### 1.3 Client-only / Mock-only Flows

| Bereich | Pfad / Komponente | Local State | Profilverhalten | Persistenzrisiko |
| --- | --- | --- | --- | --- |
| Calendar Create Flow | `src/features/calendar/components/calendar-create-flow.tsx` | Neue Blocks nur in Page State | User sieht lokale Aenderung | Nicht reload-stabil, keine Manual JSON Writes |
| Calendar Right Panel | `src/features/calendar/components/calendar-right-panel.tsx` | Move, duplicate, mark done local | Interaktiv im Client | Keine Task-Quelle aktualisiert |
| Today Review | `src/features/today/today-page.tsx` | Keine echte Mutation | Read-only Projektion | Opening/Closing Review fehlen als Daily Log |
| Resources | `src/features/resources/*` | Preview/read-only | Empty/manual sind leer | P0-Entity fehlt trotz Cross-Page-Relevanz |
| Education | `src/features/education/*` | Research ideas, literature, notes, questions local | Empty/manual disabled | Kein Canonical Store fuer Learning/Research |
| Work | `src/features/work/*` | Work log/wiki/activity local, demo-only enabled | Manual zeigt nur Work Tasks | Work Logs und Wiki fehlen |
| Nutrition | `src/features/nutrition/*` | Recipes, planner, grocery local | Empty/manual disabled | Dashboard Meals sind nicht Meal Planner |
| Coding | `src/features/coding/*` | Sessions, repos, agents, skills local | Nicht reload-stabil | Skill Map fehlt in Manual Store |
| Life | `src/features/life/*` | Journal, notes, media, inventory local | Nicht reload-stabil | Private Notizen/Journals brauchen klares Privacy-Modell |
| Settings | `src/features/settings/settings-page.tsx` | Settings state local | UI-only | Keine Settings-Tabelle, keine Auditierbarkeit |

### 1.4 Datums- und Zeitrisiken

Mehrere aktuelle Stellen nutzen UTC-basierte Tagesberechnung ueber `new Date().toISOString().slice(0, 10)` oder aehnliche UTC-Helfer. Das ist fuer Life OS kritisch, weil Today, Calendar, Daily Logs und Carry Forward am lokalen Profil-Tag haengen.

Betroffene Muster:

- `manual-profile-store.ts`: Default task date und timeline.
- `actions.ts`: lokale Today-Defaults.
- `view-models.ts`: Dashboard/Today/Calendar Projektionen.
- `calendar-page.tsx`: Calendar Week/Day Helpers.
- `entity-selectors.ts`: harter Fixture-Tag `2026-06-22`.
- `area-view-models.ts`: Nutrition nutzt harte geplante Daten.

Architekturentscheidung: Der reale Store darf lokale Tageslogik nicht aus UTC-String-Slices ableiten. Day-boundaries muessen aus Profil-Timezone plus lokalem Datum berechnet werden.

## 2. Mutation Inventory

| Mutation | Heute vorhanden | Persistiert | Transaction Boundary | Betroffene Views | Fehlende reale Semantik |
| --- | --- | --- | --- | --- | --- |
| Profile wechseln | Ja | Cookie/Session-Kontext | Server action | Alle Profile Views | Kein Auth/User Mapping |
| Inbox Quick Capture | Ja | Manual JSON | Eine Dateioperation | Inbox, Dashboard, Today | Keine Triage-Relationen |
| Dashboard Quick Thought | Ja | Manual JSON | Eine Dateioperation | Dashboard, Inbox, Today | Keine Resource/Task-Konversion |
| Task erstellen | Ja | Manual JSON | Eine Dateioperation | Dashboard, Today, Calendar, Portfolio, Tasks | Kein Update, Complete, Assign, Schedule |
| Project erstellen | Ja | Manual JSON | Eine Dateioperation | Dashboard, Portfolio, Projects, Calendar | Keine Relation Syncs |
| Goal erstellen | Ja | Manual JSON | Eine Dateioperation | Dashboard, Portfolio, Goals | Keine Progress Events |
| Habit erstellen | Ja | Manual JSON | Eine Dateioperation | Dashboard, Health | Keine Habit Logs |
| Mood setzen | Ja | Manual JSON | Eine Dateioperation | Dashboard, Health Mental | Keine Historie |
| Meal Slot speichern | Ja | Manual JSON | Eine Dateioperation | Dashboard, Nutrition | Kein Plan/Recipe/Grocery-Modell |
| Calendar Block erstellen | Ja, client | Nein | Browser State | Calendar | Muss Task/Event Persistenz werden |
| Calendar Block bewegen | Ja, client | Nein | Browser State | Calendar | Muss Schedule-Update werden |
| Task complete | UI-Button vorhanden | Nein | Keine | Entity Details, Calendar local | P0 fehlt |
| Task carry forward | Read-only sichtbar | Nein | Keine | Today | P0 fehlt |
| Daily Review close | UI-Form sichtbar | Nein | Keine | Today/Dashboard spaeter | Daily Log fehlt |
| Resource create/link | UI-Preview vorhanden | Nein | Keine | Resources, Coding, Education, Work | P0 fehlt |
| Settings speichern | UI-only | Nein | Browser State | Settings | Settings Domain fehlt |

## 3. Page Data Contracts

### 3.1 Core Routes

| Route | Primaere Query | Heute gelesen aus | Benoetigte Real-Data Contract-Felder | Empty State | Manual State | Demo State |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `getDashboardViewModel` | Demo fixture oder Manual JSON | today tasks, agenda blocks, inbox count, active projects/goals, habits, mood, meal slots | Echte empty content state | Manual projections | Demo fixture |
| `/today` | `getTodayViewModel` | Tasks, projects, goals, inbox | local_day, daily_log, today tasks, carry-forward candidates, agenda, reviews | Empty day shell | Task/inbox projections | Demo story |
| `/calendar` | `getCalendarViewModel` | Tasks with date/startTime, project deadlines | scheduled tasks, all-day deadlines, unscheduled queue, day/week range | Empty calendar | Manual task projections | Demo calendar |
| `/inbox` | `getInboxViewModel` | Inbox items | inbox items, active item, triage actions | Empty queue | Quick capture enabled | Demo queue |
| `/portfolio` | `getPortfolioViewModel` | Entity collection | tasks, projects, goals, skills, milestones | Empty workbench | Manual entities | Demo entities |
| `/tasks` | `getEntityCollection` | Entity collection | tasks with relations/status/schedule | Empty list | Manual tasks | Demo tasks |
| `/projects` | `getEntityCollection` | Entity collection | projects, task refs, goal refs | Empty list | Manual projects | Demo projects |
| `/goals` | `getEntityCollection` | Entity collection | goals, project refs, task refs | Empty list | Manual goals | Demo goals |
| `/resources` | `getResourcesViewModel` | Area fixture/sanitizer | resources, relations, search, clusters | Empty resource center | Empty currently | Demo resources |
| `/settings` | Settings page + profile panel | React state + manual actions | profile source, import/export/debug, settings later | Empty profile controls | Manual profile controls | Demo context |

### 3.2 Cross-Page Contract Rules

Global entities must not be copied into page-specific stores. Pages receive read models derived from canonical rows:

- Dashboard is a command projection, not a table owner.
- Today is local-day projection plus Daily Log.
- Calendar is a schedule projection of tasks/deadlines/events.
- Portfolio is entity overview and relation navigation.
- Area pages may add domain-specific entities later, but they must link to canonical Tasks, Projects, Goals, Resources, Skills and Daily Logs.

## 4. Canonical Entity Model

### 4.1 MVP/P0 Tables

| Tabelle | Zweck | Kernfelder | Warum P0 |
| --- | --- | --- | --- |
| `profiles` | Life OS profile/workspace boundary | `id`, `user_id`, `label`, `kind`, `timezone`, `locale`, `created_at`, `updated_at`, `archived_at` | Verhindert, dass user/account und Life-OS-Profil vermischt werden |
| `areas` | Stabile Produktbereiche | `id`, `profile_id`, `slug`, `label`, `sort_order`, `status`, timestamps | Areas sind Views/Filter, keine Datensilos |
| `inbox_items` | Capture und Triage Eingang | `id`, `profile_id`, `area_id`, `title`, `body`, `type`, `stage`, `priority`, `source`, `captured_at`, `triaged_at`, timestamps | Erster echter Input-Kanal |
| `tasks` | Zentrale Arbeitseinheit | `id`, `profile_id`, `area_id`, `project_id`, `goal_id`, `source_inbox_item_id`, `title`, `description`, `status`, `priority`, `planned_date`, `scheduled_start_at`, `duration_minutes`, `due_at`, `completed_at`, timestamps | Traegt Dashboard, Today, Calendar, Portfolio |
| `projects` | Mehrschrittige Outcomes | `id`, `profile_id`, `area_id`, `goal_id`, `title`, `description`, `status`, `priority`, `next_step`, `deadline`, timestamps | Gruppiert Tasks und Portfolio-Fortschritt |
| `goals` | Laengerfristige Richtung | `id`, `profile_id`, `area_id`, `title`, `description`, `status`, `horizon`, `target_date`, timestamps | Verbindet Projects/Tasks mit Intent |
| `daily_logs` | Lokaler Tagesabschluss und Day Context | `id`, `profile_id`, `local_date`, `timezone`, `opening_note`, `closing_note`, `energy`, `mood`, `focus`, `status`, timestamps | Today darf nicht nur Task-Liste sein |
| `daily_log_tasks` | Snapshot/Plan fuer Tagesaufgaben | `id`, `daily_log_id`, `task_id`, `role`, `sort_order`, `planned_state`, timestamps | Macht Today-Plan und Carry Forward nachvollziehbar |
| `resources` | Wiederverwendbares Wissen/Material | `id`, `profile_id`, `area_id`, `title`, `body`, `url`, `type`, `status`, `privacy_class`, timestamps | Resources verbinden Coding, Education, Work, Life |
| `resource_relations` | Links von Resources zu Entities | `id`, `profile_id`, `resource_id`, `target_type`, `target_id`, `relation_type`, timestamps | Erlaubt eine Resource in mehreren Kontexten |

### 4.2 MVP/P1 Health/Nutrition Support

| Tabelle | Zweck | Kernfelder | Einordnung |
| --- | --- | --- | --- |
| `habits` | Habit Definition | `id`, `profile_id`, `area_id`, `title`, `cadence`, `target_count`, `status`, timestamps | Schon im Manual Store vorhanden, aber ohne Logs |
| `habit_logs` | Habit-Ausfuehrung | `id`, `profile_id`, `habit_id`, `local_date`, `completed_at`, `value`, `note`, timestamps | Notwendig fuer echte Streaks und Health Pages |
| `mood_checkins` | Mood-Historie | `id`, `profile_id`, `local_date`, `checked_at`, `mood`, `energy`, `stress`, `note`, timestamps | Ersetzt Single Snapshot |
| `meal_slots` oder `nutrition_entries` | Meal-Plan/Meal-Log Bruecke | `id`, `profile_id`, `local_date`, `slot`, `title`, `status`, `source_recipe_id`, timestamps | Dashboard Meals spaeter realisieren |

### 4.3 Coding/AI Support

| Tabelle | Zweck | Kernfelder | Einordnung |
| --- | --- | --- | --- |
| `agent_sessions` | Codex/AI Work Sessions | `id`, `profile_id`, `area_id`, `project_id`, `task_id`, `title`, `status`, `started_at`, `ended_at`, `summary_resource_id`, timestamps | P1 fuer Coding/Agents, nicht erster Slice |
| `skills` | Faehigkeiten/Kompetenzen | `id`, `profile_id`, `area_id`, `title`, `level`, `status`, timestamps | Portfolio/Coding/Education brauchen spaeter echte Skills |
| `skill_evidence` | Evidence fuer Skills | `id`, `profile_id`, `skill_id`, `resource_id`, `task_id`, `note`, timestamps | P1/P2, nicht fuer erste Real-Data-Slice |

## 5. Task Scheduling Contract

### 5.1 Stored Fields

| Feld | Typ-Idee | Semantik |
| --- | --- | --- |
| `planned_date` | `date` | Lokaler Tag, an dem die Task fuer Today eingeplant ist. Keine Uhrzeit. |
| `scheduled_start_at` | `timestamptz` | Konkreter Startzeitpunkt fuer Calendar-Timeblock. |
| `duration_minutes` | integer | Dauer des geplanten Blocks. |
| `scheduled_end_at` | abgeleitet oder optional gespeichert | Wenn gespeichert, muss es aus Start + Duration konsistent bleiben. Empfehlung: zunaechst ableiten. |
| `due_at` | `timestamptz` oder `date` je nach Produktentscheidung | Deadline, nicht automatisch gleich Schedule. |
| `completed_at` | `timestamptz` | Abschlusszeitpunkt. |
| `status` | enum | `inbox`, `planned`, `active`, `waiting`, `done`, `canceled`, `archived`. |

### 5.2 Local-Day Regeln

- Profile speichern eine `timezone`.
- Today berechnet den lokalen Tag aus `profile.timezone`.
- `planned_date` ist eine lokale Date-only Wahrheit.
- Calendar zeigt `scheduled_start_at` in der Profil-Timezone.
- Untimed Today Tasks haben `planned_date = local_date` und `scheduled_start_at = null`.
- Scheduled Tasks koennen zusaetzlich `planned_date` tragen, muessen aber aus `scheduled_start_at` fuer Calendar ableitbar bleiben.
- Carry Forward schreibt eine neue Day-Plan-Zuordnung oder aktualisiert `planned_date`, je nach Entscheidung in Abschnitt 14.
- `toISOString().slice(0, 10)` ist fuer produktive Today-/Calendar-/Daily-Log-Logik verboten.

### 5.3 Today/Calendar Projektion

| View | Filter | Sortierung | Darstellung |
| --- | --- | --- | --- |
| Today Agenda | `planned_date = local_date` oder `scheduled_start_at` faellt in lokalen Tag | Timeblocks zuerst nach Zeit, untimed nach Priority/Sort | P0 Aufgaben und Tagesplan |
| Calendar Day/Week | `scheduled_start_at` im sichtbaren Range oder Deadlines im Range | Startzeit, dann Dauer | Timed Blocks und All-Day Deadlines |
| Carry Forward | Today Tasks nicht `done/canceled/archived`, deren local day vor oder gleich heute liegt | Priority, created_at | Aktion schreibt neue Planung |
| Dashboard P0 | Today Tasks plus active project/goal context | P0/P1, time-sensitive zuerst | Command Center |

## 6. Cross-Page Projection Map

### 6.1 Task Projection

| Canonical Task Feld | Dashboard | Today | Calendar | Portfolio | Area Pages |
| --- | --- | --- | --- | --- | --- |
| `title` | Task label | Agenda/task row | Block title | Entity title | Context row |
| `status` | Active/done state | Carry-forward eligibility | Done/canceled styling | Filter/status chip | Local domain state |
| `priority` | P0/P1 emphasis | Sort and emphasis | Optional block accent | Filter | Area relevance |
| `planned_date` | Today inclusion | Main day filter | Untimed queue/day chips | Filter | Area daily context |
| `scheduled_start_at` | Time-sensitive highlight | Agenda time | Timed block | Timeline field | Area schedule |
| `duration_minutes` | Compact estimate | Agenda duration | Block height | Detail field | Planning |
| `project_id` | Active project context | Artifact/context | Project deadline relation | Project detail | Area project row |
| `goal_id` | Goal context | Artifact/context | Optional | Goal detail | Area goal row |
| `area_id` | Section grouping | Filter/context | Color/category | Area filter | Area ownership |
| `source_inbox_item_id` | Capture provenance | Optional note | Not primary | Detail relation | Triage trace |

### 6.2 Other Entity Projections

| Entity | Dashboard | Today | Calendar | Portfolio | Resources/Areas |
| --- | --- | --- | --- | --- | --- |
| Inbox Item | Quick capture count, latest | Captured events or triage prompt | Not default | Optional source relation | Can become Resource/Task |
| Project | Active focus | Artifact/context | Deadline all-day block | Primary project list | Area project views |
| Goal | Current direction | Artifact/context | Target date optional | Primary goal list | Area strategy |
| Daily Log | Daily Control state | Primary object | Day summary optional | Review trend later | Health/Life later |
| Resource | Context links | Optional support material | Rare | Knowledge asset | Primary Resources Center |
| Habit | Dashboard habit card | Daily checklist via habit log | Optional | Not primary | Health habits |
| Mood Checkin | Dashboard status | Daily context | Not primary | Trends later | Health mental |

### 6.3 Revalidation Contract

| Use Case | Revalidate mindestens |
| --- | --- |
| Capture inbox item | `/inbox`, `/dashboard`, `/today` |
| Triage inbox to task | `/inbox`, `/tasks`, `/today`, `/calendar`, `/dashboard`, `/portfolio` |
| Create/update task | `/tasks`, `/today`, `/calendar`, `/dashboard`, `/portfolio`, related area route |
| Complete task | `/tasks`, `/today`, `/calendar`, `/dashboard`, `/portfolio`, related project/goal routes |
| Create/update project | `/projects`, `/portfolio`, `/dashboard`, `/today`, `/calendar` |
| Create/update goal | `/goals`, `/portfolio`, `/dashboard`, `/today` |
| Upsert daily log | `/today`, `/dashboard` |
| Create/link resource | `/resources`, related area route, related entity detail route |
| Habit/mood writes | `/dashboard`, `/health`, `/health/habits`, `/health/mental` |

## 7. Use Cases und Transactions

### 7.1 `captureInboxItem`

| Feld | Contract |
| --- | --- |
| Input | `profileId`, optional `areaId`, `title`, optional `body`, `type`, `source` |
| Validation | Title required, profile access, type enum, body length |
| DB Writes | Insert `inbox_items` with `stage = raw`, `captured_at = now()` |
| Transaction | Single insert |
| Read Models | Inbox queue, Dashboard capture count, Today captured events |
| Revalidation | `/inbox`, `/dashboard`, `/today` |
| Failure | Validation error or access denied |
| Idempotency Risk | Low. Optional client request id later if repeated submissions become a problem |

### 7.2 `triageInboxItemToTask`

| Feld | Contract |
| --- | --- |
| Input | `inboxItemId`, task fields, optional `projectId`, `goalId`, `plannedDate`, `scheduledStartAt` |
| Validation | Same profile, inbox item not archived, relations same profile |
| DB Writes | Insert `tasks`, update `inbox_items.stage = triaged`, set `triaged_at`, link `source_inbox_item_id` |
| Transaction | Required. Task insert and inbox update succeed/fail together |
| Read Models | Inbox, Tasks, Today, Calendar, Dashboard, Portfolio |
| Revalidation | `/inbox`, `/tasks`, `/today`, `/calendar`, `/dashboard`, `/portfolio` |
| Failure | Rollback and user-visible action error |
| Idempotency Risk | Medium. Prevent duplicate triage by checking item stage/source link |

### 7.3 `createTask`

| Feld | Contract |
| --- | --- |
| Input | `profileId`, title, status, area/project/goal refs, priority, planned/scheduled/due fields |
| Validation | Title, profile access, relation ownership, local date/time consistency |
| DB Writes | Insert `tasks` |
| Transaction | Single insert unless daily plan row is also created |
| Read Models | Dashboard, Today, Calendar, Portfolio, Tasks, related area |
| Revalidation | Task projection routes |
| Failure | Field-level validation |
| Idempotency Risk | Low initially |

### 7.4 `updateTask`

| Feld | Contract |
| --- | --- |
| Input | `taskId`, patch fields |
| Validation | Ownership, allowed status transitions, relation profile match |
| DB Writes | Update `tasks`, `updated_at` |
| Transaction | Single update |
| Read Models | All task projections |
| Revalidation | Task projection routes |
| Failure | Stale/missing task or invalid transition |
| Idempotency Risk | Medium for concurrent edits. Add optimistic version later if needed |

### 7.5 `scheduleTask`

| Feld | Contract |
| --- | --- |
| Input | `taskId`, `plannedDate`, optional `scheduledStartAt`, `durationMinutes` |
| Validation | Date in profile timezone, positive duration, no UTC day slicing |
| DB Writes | Update schedule fields on `tasks` |
| Transaction | Single update |
| Read Models | Today, Calendar, Dashboard, Tasks |
| Revalidation | `/today`, `/calendar`, `/dashboard`, `/tasks` |
| Failure | Invalid date/time or missing access |
| Idempotency Risk | Low. Last write wins initially |

### 7.6 `completeTask`

| Feld | Contract |
| --- | --- |
| Input | `taskId`, optional completion note |
| Validation | Ownership, task not canceled/archived |
| DB Writes | Update `status = done`, set `completed_at`; optional daily log relation update |
| Transaction | Single update or transaction with daily-log snapshot |
| Read Models | Today, Calendar, Dashboard, Portfolio, project/goal progress |
| Revalidation | Task projection routes |
| Failure | Invalid state transition |
| Idempotency Risk | Low if repeated complete keeps same state |

### 7.7 `carryTaskForward`

| Feld | Contract |
| --- | --- |
| Input | `taskId`, target `plannedDate`, optional keep schedule flag |
| Validation | Task not done/canceled/archived, target date local and allowed |
| DB Writes | Either update `tasks.planned_date` or insert/update `daily_log_tasks` depending on decision |
| Transaction | Required if daily log is upserted |
| Read Models | Today, Dashboard, Calendar if scheduled |
| Revalidation | `/today`, `/dashboard`, `/calendar`, `/tasks` |
| Failure | Invalid target date or task state |
| Idempotency Risk | Medium. Avoid duplicate daily plan rows with unique constraint |

### 7.8 `createProject`

| Feld | Contract |
| --- | --- |
| Input | `profileId`, `areaId`, title, status, priority, deadline, goal link |
| Validation | Title, area/profile match, optional goal profile match |
| DB Writes | Insert `projects` |
| Transaction | Single insert |
| Read Models | Dashboard, Portfolio, Projects, Today, Calendar deadlines |
| Revalidation | `/projects`, `/portfolio`, `/dashboard`, `/today`, `/calendar` |
| Failure | Invalid relation |
| Idempotency Risk | Low |

### 7.9 `createGoal`

| Feld | Contract |
| --- | --- |
| Input | `profileId`, `areaId`, title, horizon, target date |
| Validation | Title, area/profile match |
| DB Writes | Insert `goals` |
| Transaction | Single insert |
| Read Models | Dashboard, Portfolio, Goals, Today |
| Revalidation | `/goals`, `/portfolio`, `/dashboard`, `/today` |
| Failure | Invalid relation |
| Idempotency Risk | Low |

### 7.10 `upsertDailyLog`

| Feld | Contract |
| --- | --- |
| Input | `profileId`, `localDate`, opening/closing fields, mood/energy/focus |
| Validation | Unique local date per profile, timezone from profile, privacy class |
| DB Writes | Insert/update `daily_logs` |
| Transaction | Single upsert |
| Read Models | Today, Dashboard, Health/Life later |
| Revalidation | `/today`, `/dashboard` |
| Failure | Invalid local date or access |
| Idempotency Risk | Low with unique `(profile_id, local_date)` |

### 7.11 `closeDailyLog`

| Feld | Contract |
| --- | --- |
| Input | `dailyLogId`, closing note, completion summary |
| Validation | Ownership, day not archived, allowed status |
| DB Writes | Update `daily_logs.status = closed`, closing fields |
| Transaction | Single update |
| Read Models | Today, Dashboard |
| Revalidation | `/today`, `/dashboard` |
| Failure | Already closed can be no-op or explicit error |
| Idempotency Risk | Low if close is repeat-safe |

### 7.12 `createResource`

| Feld | Contract |
| --- | --- |
| Input | `profileId`, title, type, body/url, area, privacy class |
| Validation | Title or URL/body required, type enum, privacy class allowed |
| DB Writes | Insert `resources` |
| Transaction | Single insert |
| Read Models | Resources, related area pages, Portfolio later |
| Revalidation | `/resources`, related area route |
| Failure | Validation or privacy/access error |
| Idempotency Risk | Medium for URLs. Later unique optional normalized URL per profile |

### 7.13 `linkResource`

| Feld | Contract |
| --- | --- |
| Input | `resourceId`, `targetType`, `targetId`, `relationType` |
| Validation | Same profile for resource and target, target type allowlist |
| DB Writes | Insert `resource_relations` |
| Transaction | Single insert, unique relation key |
| Read Models | Resources, related entity detail, related area page |
| Revalidation | `/resources`, target route |
| Failure | Invalid target or duplicate link |
| Idempotency Risk | Low with unique `(resource_id, target_type, target_id, relation_type)` |

## 8. Data Access Architecture

### 8.1 Zielarchitektur

```text
Server Component / Client Form
  -> Server Action or route-level query
  -> Use Case function
  -> Zod validation and authorization guard
  -> Repository interface
  -> Adapter: demo fixture | empty adapter | local test adapter | Supabase adapter
  -> Query/ViewModel mapper
  -> revalidatePath for affected projections
```

### 8.2 Verantwortlichkeiten

| Layer | Aufgabe | Nicht Aufgabe |
| --- | --- | --- |
| UI Components | Rendern, Form state, pending/error states | DB-Zugriff, Auth-Bypass, globale Datumslogik |
| Server Actions | Eingaben annehmen, Use Case aufrufen, revalidieren | Domainregeln duplizieren |
| Use Cases | Transaktionale Produktaktionen | UI-spezifische Formatierung |
| Repositories | Persistenz-API und Query API | Produktentscheidungen |
| Adapters | Demo/Empty/Local/Supabase Implementierung | Contract veraendern |
| ViewModel Mapper | Page-specific Projektionen | Mutation oder Persistenz |

### 8.3 Adapter-Strategie

| Adapter | Zweck | Lebensdauer |
| --- | --- | --- |
| Demo fixture adapter | Demo-Profil bleibt gezielt demohaft | Dauerhaft fuer Showcase und E2E-Demo |
| Empty adapter | Empty-Profil bleibt sauber leer | Dauerhaft fuer Boundary Tests |
| Local manual adapter | Uebergang und Tests fuer aktuelle manuelle Daten | Degradieren zu Dev/Test Tool nach Supabase |
| Supabase adapter | Canonical real data store | Phase 3 Ziel |
| In-memory test adapter | Unit-/Use-Case-Tests ohne Supabase | Dauerhaft |

### 8.4 Fehler- und Optimistic-Update-Regel

- Initial keine komplexen optimistic updates.
- Client zeigt pending state und serverseitige Validation Errors.
- Reale UI aktualisiert sich ueber revalidated Server Component Daten.
- Optimistic UI nur spaeter fuer risikoarme Aktionen wie quick capture oder checkbox complete.
- Fehlerform: `{ ok: false, fieldErrors?, formError? }` fuer Actions.

## 9. Supabase Schema Proposal

Keine Migration in diesem Report. Der folgende Vorschlag beschreibt nur den Zielzustand.

### 9.1 Enum-Vorschlaege

| Enum | Werte |
| --- | --- |
| `profile_kind` | `manual`, `personal`, `work`, `demo`, `test` |
| `entity_status` | `planned`, `active`, `waiting`, `done`, `canceled`, `archived` |
| `inbox_stage` | `raw`, `clarified`, `triaged`, `converted`, `archived` |
| `priority_level` | `p0`, `p1`, `p2`, `p3` |
| `resource_type` | `note`, `learning`, `prompt`, `research`, `link`, `source`, `snippet`, `decision` |
| `resource_status` | `raw`, `review_needed`, `processed`, `reusable`, `linked`, `archived` |
| `privacy_class` | `standard_private`, `personal_sensitive`, `health_sensitive`, `work_restricted`, `system_restricted`, `shareable` |
| `daily_log_status` | `open`, `closed`, `archived` |

### 9.2 Foreign Keys

| Von | Nach | Regel |
| --- | --- | --- |
| `profiles.user_id` | auth user | Owner boundary |
| `areas.profile_id` | `profiles.id` | Cascade nur nach bewusster Produktentscheidung |
| `tasks.profile_id` | `profiles.id` | Jede Query scoped |
| `tasks.area_id` | `areas.id` | Same profile required |
| `tasks.project_id` | `projects.id` | Same profile required |
| `tasks.goal_id` | `goals.id` | Same profile required |
| `tasks.source_inbox_item_id` | `inbox_items.id` | Triage trace |
| `projects.goal_id` | `goals.id` | Optional |
| `daily_log_tasks.daily_log_id` | `daily_logs.id` | Unique plan rows |
| `daily_log_tasks.task_id` | `tasks.id` | Task day relation |
| `resource_relations.resource_id` | `resources.id` | Same profile required |

### 9.3 Unique Constraints und Indexes

| Tabelle | Constraint / Index | Zweck |
| --- | --- | --- |
| `profiles` | unique `(user_id, kind, label)` oder produktdefinierter Name | Keine doppelten Profile |
| `areas` | unique `(profile_id, slug)` | Stabile Area-Slugs |
| `daily_logs` | unique `(profile_id, local_date)` | Ein Daily Log pro lokalem Tag |
| `daily_log_tasks` | unique `(daily_log_id, task_id, role)` | Keine Carry-Forward-Duplikate |
| `resource_relations` | unique `(resource_id, target_type, target_id, relation_type)` | Idempotentes Linking |
| `tasks` | index `(profile_id, planned_date, status)` | Today/Dashboard |
| `tasks` | index `(profile_id, scheduled_start_at)` | Calendar |
| `tasks` | index `(profile_id, project_id)` und `(profile_id, goal_id)` | Portfolio/Relations |
| `inbox_items` | index `(profile_id, stage, captured_at desc)` | Inbox Queue |
| `resources` | index `(profile_id, type, status)` | Resource Center |
| `habit_logs` | unique `(profile_id, habit_id, local_date)` | Habit idempotency |

### 9.4 Soft Archive

Alle user-owned Tabellen erhalten:

- `created_at`
- `updated_at`
- optional `archived_at`
- controlled `status`, wenn semantisch sinnvoll

Hard delete ist nicht erster Pfad. Reset-/Test-Flows muessen explizit getrennt werden.

### 9.5 Security/RLS Principles

- Alle user-owned Tabellen haben `user_id` direkt oder erreichbar ueber `profiles.user_id`.
- RLS ist fuer reale Supabase-Tabellen verpflichtend.
- Policies werden auf `authenticated` beschraenkt.
- Select/insert/update/delete muessen Profil-Ownership erzwingen.
- Update Policies brauchen `USING` und `WITH CHECK`.
- Keine Client-Nutzung von Service Role oder Secrets.
- Keine Auth-Entscheidungen aus mutable user metadata.
- Views fuer exposed schemas muessen RLS respektieren. Falls Views genutzt werden, muessen sie explizit als sicher modelliert werden.
- `privacy_class` ist keine RLS-Ersatzregel, sondern zusaetzliche Produkt-/UI- und Query-Semantik.

## 10. Migration Strategy

### 10.1 Grundsatz

Die aktuelle Manual JSON-Datei ist eine Dev-/Transition-Quelle, nicht das Zielmodell. Migration muss getrennt werden von der Einfuehrung der Domain-/Repository-Schicht.

### 10.2 Reihenfolge

| Schritt | Ziel | Dateien/Scope | Ergebnis |
| --- | --- | --- | --- |
| 1 | Domain Contracts definieren | Neue Domain-/Data-Vertragsdateien | App kennt echte Entity-Contracts ohne DB |
| 2 | Repository Interfaces einfuehren | Data access layer | ViewModels haengen an Interface statt Manual JSON direkt |
| 3 | Manual Adapter an Interface haengen | Bestehende Manual JSON lesbar halten | Kein Produktverhalten verloren |
| 4 | Supabase Adapter bauen | Nach Migration-/RLS-Freigabe | Echte Datenquelle |
| 5 | Use Cases an Repository binden | Actions werden echte Produktaktionen | Transaktionen und Revalidation zentral |
| 6 | Import/Reset entscheiden | Optional Manual JSON Import | Kein stiller Datenverlust |
| 7 | Old adapters herabstufen | Demo/Empty/Test bleiben | Kein altes Manual als Produkt-Wahrheit |

### 10.3 Migration von aktuellen Daten

| Aktuelle Daten | Migrierbar | Ziel |
| --- | --- | --- |
| Manual Tasks | Ja | `tasks`, optional `daily_log_tasks` |
| Manual Inbox Items | Ja | `inbox_items` |
| Manual Projects | Ja | `projects` |
| Manual Goals | Ja | `goals` |
| Manual Habits | Ja | `habits` |
| Manual Mood Snapshot | Teilweise | erster `mood_checkins` oder latest profile state, Entscheidung noetig |
| Manual Meals | Teilweise | `meal_slots`/`nutrition_entries`, Entscheidung noetig |
| Client-only Calendar edits | Nein, nicht verlaesslich | Nur nach Nutzeraktion neu speichern |
| Client-only Resources/Skills/Work/Education/Life drafts | Nein, nicht reload-stabil | Nicht automatisch migrierbar |

## 11. Real-Use Scenarios

### Scenario A: Inbox Capture to Today Task

1. User captured einen Gedanken in `/dashboard` oder `/inbox`.
2. `captureInboxItem` schreibt `inbox_items`.
3. `/inbox` zeigt den raw item.
4. User triagiert zu Task fuer heute.
5. `triageInboxItemToTask` schreibt `tasks` und aktualisiert `inbox_items`.
6. `/today`, `/dashboard`, `/tasks`, `/calendar` zeigen dieselbe Task-Projektion.

Acceptance:

- Reload verliert nichts.
- Inbox Item ist nicht dupliziert.
- Task zeigt Source/Trace.
- Today nutzt lokalen Profil-Tag.

### Scenario B: Schedule Task on Calendar

1. User erstellt oder waehlt Task.
2. User setzt Datum, Startzeit und Dauer im Calendar.
3. `scheduleTask` aktualisiert `planned_date`, `scheduled_start_at`, `duration_minutes`.
4. Calendar zeigt Timeblock.
5. Today zeigt denselben Task am lokalen Tag.

Acceptance:

- Kein UTC-Off-by-one um Mitternacht.
- Calendar und Today widersprechen sich nicht.
- Reload ist stabil.

### Scenario C: Complete Task and Close Day

1. User markiert Today Task als done.
2. `completeTask` setzt `status = done`, `completed_at`.
3. User schliesst Daily Log.
4. `closeDailyLog` speichert closing note/status.
5. Dashboard zeigt Tagesfortschritt, Today zeigt geschlossenen Tag.

Acceptance:

- Done Task verschwindet nicht unerklaert.
- Daily Log bleibt historisch lesbar.
- Carry-forward ignoriert done/canceled tasks.

### Scenario D: Save Resource and Link to Project

1. User speichert Research/Prompt/Decision als Resource.
2. `createResource` schreibt `resources`.
3. User linkt Resource an Project oder Task.
4. `linkResource` schreibt `resource_relations`.
5. `/resources` und Ziel-Entity zeigen dieselbe Relation.

Acceptance:

- Resource existiert nur einmal.
- Relation ist idempotent.
- Privacy Class bleibt erhalten.

## 12. Implementation Plan Slices

### R1.6.1 - Domain Contract & Repository Interfaces

| Feld | Inhalt |
| --- | --- |
| Scope | Domain types fuer Profiles, Areas, Inbox, Tasks, Projects, Goals, Daily Logs, Resources; Repository Interfaces; local date helper contract |
| Dateien | Neue Dateien unter `src/features/data-foundation/` oder passend zur bestehenden Struktur |
| Schema | Keine DB-Dateien |
| Actions | Keine neuen Produktaktionen, nur Typen/Interfaces |
| Queries | Keine runtime Umstellung ohne Tests |
| Risiken | Zu grosse Abstraktion. Muss eng an bestehende ViewModels bleiben |
| Tests | Type checks, gezielte unit tests fuer date helper und mappers |
| Acceptance | Bestehende App bleibt unveraendert, Interfaces koennen Manual Adapter abbilden |
| Non-goals | Supabase, RLS, echte Migration |

### R1.6.2 - Manual Adapter behind Repository

| Feld | Inhalt |
| --- | --- |
| Scope | Bestehenden Manual JSON Store hinter Repository Interface setzen |
| Dateien | `profile-data` Adapter/Mapper, Tests |
| Schema | Keine DB-Dateien |
| Actions | Bestehende Actions nutzen Repository statt Store direkt |
| Queries | Dashboard/Today/Calendar/Portfolio weiter identisch |
| Risiken | Regression bei Empty/Demo/Manual Boundary |
| Tests | Bestehende profile-boundary und content-state Tests |
| Acceptance | Keine sichtbare Verhaltensaenderung |
| Non-goals | Neue Features |

### R1.6.3 - Inbox Persistence & Triage Use Case

| Feld | Inhalt |
| --- | --- |
| Scope | Erster echter Real-Use-Slice: capture, triage-to-task, source link |
| Dateien | Use Cases, Actions, Inbox UI wiring, repository methods |
| Schema | Nach Freigabe: `inbox_items`, `tasks` minimal |
| Actions | `captureInboxItem`, `triageInboxItemToTask` |
| Queries | Inbox, Today, Dashboard, Tasks |
| Risiken | Duplicate triage, revalidation gaps |
| Tests | Unit use-case tests, E2E capture-to-task reload |
| Acceptance | User kann Item erfassen, triagieren und nach Reload in Today/Tasks sehen |
| Non-goals | Full Calendar scheduling, Resources |

### R1.6.4 - Task Schedule & Complete

| Feld | Inhalt |
| --- | --- |
| Scope | `scheduleTask`, `completeTask`, Calendar write path |
| Dateien | Calendar components/actions, task use cases, date helper tests |
| Schema | Task schedule fields |
| Actions | Schedule, complete, reschedule |
| Queries | Calendar/Today/Dashboard |
| Risiken | Local timezone bugs |
| Tests | Midnight boundary tests, Calendar reload E2E |
| Acceptance | Calendar blocks persist and Today matches local date |
| Non-goals | External calendar sync |

### R1.6.5 - Daily Log & Carry Forward

| Feld | Inhalt |
| --- | --- |
| Scope | `daily_logs`, `daily_log_tasks`, close day, carry forward |
| Dateien | Today page/actions/use cases |
| Schema | Daily Log tables |
| Actions | Upsert daily log, close daily log, carry forward |
| Queries | Today/Dashboard |
| Risiken | Deciding whether carry forward mutates task or day plan |
| Tests | Carry-forward idempotency, closed-day read model |
| Acceptance | Today becomes a real daily control surface |
| Non-goals | Long-term analytics |

### R1.6.6 - Projects and Goals Relations

| Feld | Inhalt |
| --- | --- |
| Scope | Project/Goal update flows, relation consistency |
| Dateien | Entity pages/actions/repositories |
| Schema | Project/Goal FKs and indexes |
| Actions | Create/update/archive/link |
| Queries | Portfolio/Dashboard/Today |
| Risiken | Relation drift |
| Tests | Project/goal relation E2E |
| Acceptance | Portfolio reflects canonical project/goal state |
| Non-goals | Advanced roadmap planning |

### R1.6.7 - Resources Foundation

| Feld | Inhalt |
| --- | --- |
| Scope | Create Resource, Link Resource, Resource Center real data |
| Dateien | Resources use cases, UI wiring, relation mapper |
| Schema | `resources`, `resource_relations` |
| Actions | `createResource`, `linkResource` |
| Queries | Resources and related entity routes |
| Risiken | Privacy class leakage, polymorphic relation validation |
| Tests | Resource link idempotency, no demo leak |
| Acceptance | Resource can be saved once and shown in linked contexts |
| Non-goals | Full-text search/vector search |

### R1.6.8 - Habits and Mood Logs

| Feld | Inhalt |
| --- | --- |
| Scope | Habit definitions, habit logs, mood checkins |
| Dateien | Dashboard, Health Habits, Health Mental actions/repositories |
| Schema | `habits`, `habit_logs`, `mood_checkins` |
| Actions | Create habit, log habit, create mood checkin |
| Queries | Dashboard/Health |
| Risiken | Health-sensitive privacy class |
| Tests | Reload-stable logs, privacy labels |
| Acceptance | Health pages show real history, not only snapshot |
| Non-goals | Medical analytics |

### R1.6.9 - Area Drafts Triage

| Feld | Inhalt |
| --- | --- |
| Scope | Decide which client-only area drafts become canonical entities |
| Dateien | Education/Work/Coding/Life/Nutrition page flows |
| Schema | Only after per-area decision |
| Actions | Convert drafts to Resource/Task/Project/Log as appropriate |
| Queries | Area-specific read models |
| Risiken | Over-modeling too early |
| Tests | Area no-demo-leak and reload-stability tests |
| Acceptance | No UI implies persistence unless it has a real write path |
| Non-goals | Rebuilding every area page at once |

## 13. Database Proposal

Die kleinste sinnvolle Datenbankbasis fuer Real Data ist:

1. `profiles`
2. `areas`
3. `inbox_items`
4. `tasks`
5. `projects`
6. `goals`
7. `daily_logs`
8. `daily_log_tasks`
9. `resources`
10. `resource_relations`

Danach:

11. `habits`
12. `habit_logs`
13. `mood_checkins`
14. Nutrition-spezifische Tabellen nach Produktentscheidung
15. `agent_sessions`, `skills`, `skill_evidence` nach Coding/Education-Entscheidung

Supabase ist fuer Phase 3 die richtige canonical store Richtung, weil Life OS echte Auth-, Multi-Session-, Reload-, RLS- und relationale Cross-Page-Vertraege braucht. Es ist aber erst nach expliziter Schema-/RLS-Freigabe umzusetzen.

## 14. Entscheidungen vor Implementierung

| Entscheidung | Empfehlung | Warum |
| --- | --- | --- |
| Supabase als canonical real store | Ja, ab Phase 3 | Manual JSON skaliert nicht fuer Auth/RLS/Relationen |
| First implementation slice | R1.6.1 Domain Contract & Repository Interfaces | Minimiert Risiko und schafft testbare Boundary |
| Smallest real-use slice | R1.6.3 Inbox Persistence & Triage | Liefert echten Nutzen ohne alle Areas umzubauen |
| First five actions | `captureInboxItem`, `triageInboxItemToTask`, `createTask`, `scheduleTask`, `completeTask` | Deckt Capture, Today, Calendar und Task Lifecycle ab |
| Carry-forward Modell | Entscheidung offen: Task `planned_date` update vs `daily_log_tasks` plan row | Produktsemantik unterschiedlich |
| `scheduled_end_at` speichern | Zunaechst ableiten aus start + duration | Verhindert Inkonsistenzen |
| Resources P0 | Ja, aber nach Inbox/Task | Verbindet viele Area-Flows |
| Manual JSON Import | Optional explizit, nicht automatisch | Verhindert unbemerkte Testdaten-Migration |
| Demo Profil | Separater fixture adapter | Demo darf nicht echte Userdaten imitieren |
| Empty Profil | Separater empty adapter | Boundary Tests bleiben klar |
| Timezone | Pflichtfeld auf `profiles` | Today/Calendar/Daily Log haengen daran |
| RLS Pattern | Profile ownership via authenticated user | Security-Grundlage |

## 15. Abschlussurteil

### Ist Supabase jetzt die richtige canonical store Richtung?

Ja. Fuer Phase 3 ist Supabase als canonical store fachlich richtig. Life OS braucht echte relationale Daten, Auth-Boundaries, RLS, Reload-Stabilitaet und Cross-Page-Projektionen. In diesem R1.6A-Block darf Supabase aber noch nicht implementiert werden.

### Sind bestehende Stores migrierbar?

Teilweise. Manual Tasks, Inbox Items, Projects, Goals und Habit Definitions sind gut migrierbar. Mood und Meals sind nur eingeschraenkt migrierbar, weil aktuell Snapshot-/Slot-Modelle fehlen. Client-only Drafts aus Calendar, Resources, Coding, Education, Work, Life und Nutrition sind nicht verlaesslich migrierbar, weil sie nicht reload-stabil sind.

### Was sind die P0-Entities?

P0 sind Profiles, Areas, Inbox Items, Tasks, Projects, Goals, Daily Logs, Daily Log Tasks, Resources und Resource Relations. Habits, Habit Logs und Mood Checkins sind sehr nahe am MVP, sollten aber erst nach dem Task/Today/Calendar-Fundament folgen, sofern Scope eng bleiben soll.

### Welche Relationen sind zwingend?

Zwingend sind Profile Ownership, Area Scoping, Task zu Project, Task zu Goal, Project zu Goal, Task zu Source Inbox Item, Daily Log zu Task via Daily Log Tasks, Resource zu Entity via Resource Relations und alle Relationen mit Same-Profile-Pruefung.

### Was wird gespeichert und was wird derived?

Gespeichert werden canonical Entities, Relationen, Status, lokale Tagesdaten, Zeitfelder, Privacy Class und Audit Timestamps. Derived bleiben Dashboard Cards, Today Agenda, Calendar Blocks, Portfolio Gruppierungen, Content States, Counts, Progress Labels und sortierte/filterte Area-ViewModels.

### Was ist der erste echte Real-Use-Slice?

Der kleinste echte Real-Use-Slice ist Inbox Capture plus Triage-to-Task, sichtbar in Inbox, Today, Dashboard und Tasks nach Reload. Technisch sollte davor R1.6.1 als Domain-/Repository-Schnitt eingefuehrt werden, damit die Implementierung nicht direkt UI und Supabase koppelt.

## 16. Risiken

| Risiko | Wirkung | Gegenmassnahme |
| --- | --- | --- |
| UTC-Off-by-one bei Today/Calendar | Falsche Tageszuordnung | Profil-Timezone und lokale Date Helper vor Scheduling |
| Alte Manual JSON Wahrheit bleibt aktiv | Zwei Quellen der Wahrheit | Adapter-Schicht und klare Deprecation |
| Client-only UI wirkt persistent | Vertrauensverlust | UI nur aktivieren, wenn realer Write Path existiert |
| Zu grosser erster Supabase-Slice | Viele Regressions | R1.6.1/R1.6.2/R1.6.3 trennen |
| RLS spaet nachziehen | Security-Risiko | RLS mit erster echten Tabelle planen |
| Resource polymorphic links unsauber | Broken relations | Allowlist plus Same-Profile Validation |
| Carry-forward falsch modelliert | Today History wird unklar | Entscheidung vor Daily Log Implementierung |
| Demo/Empty leaks | Produktvertrauen sinkt | Bestehende Boundary Tests erhalten und erweitern |
