# Calendar Projection Review F1.0E

Stand: 2026-07-11
Status: Completed
Scope: Calendar -> Today -> Dashboard Projection Review, E2E-Proof-Hardening
und QA-Dokumentation.
Quelle der Wahrheit: `docs/product/calendar-finalization-scope-f1-0a.md`,
`docs/product/task-inbox-calendar-workflow.md`,
`docs/qa/calendar-scheduling-proof-hardening-f1-0c.md`,
`docs/qa/calendar-conflict-override-finalization-f1-0d.md`,
`src/features/profile-data/view-models.ts` und
`tests/e2e/content-state-system.spec.ts`.

## 1. Zweck

F1.0E prueft die bestehende Projection-Semantik zwischen Calendar, Today und
Dashboard, ohne neue Calendar-Funktionen zu bauen.

Der Block haertet die Proofs fuer diese Frage:

```text
Wenn ein Task geplant, terminiert, verschoben, entterminiert, erledigt,
wieder geoeffnet, wiederkehrend generiert oder per Conflict Override terminiert
wird, zeigen Calendar, Today und Dashboard danach denselben fachlichen Zustand.
```

## 2. Nicht-Ziele

- keine neuen Calendar Features
- keine Calendar-, Today- oder Dashboard-Recomposition
- kein Dashboard Layout Scope
- kein Pointer Drag/Resize
- kein Touch Drag
- keine freie Calendar-Event-Persistenz
- keine neue Tabelle
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets oder Auth-State-Inhalte
- keine DB-weite Conflict-Sperre

## 3. Projection Current State

Calendar:

- `taskToCalendarBlock()` rendert Tasks nur als Timed Block, wenn `date` und
  `startTime` vorhanden sind.
- Die Calendar Planner Queue nutzt Tasks mit `date` und ohne `startTime`.
- Queue Tasks mit `done` oder `canceled` werden nicht angezeigt.
- Scheduled Tasks bleiben aus der Planner Queue heraus.
- `Unschedule` entfernt `scheduled_start_at`, behaelt `planned_date` und bringt
  den Task in die Calendar Planner Queue zurueck.
- Conflict Override nutzt denselben Reschedule-Pfad wie normale
  Terminierungs-Controls.

Today:

- Today Activity nutzt Tasks mit heutigem `date` und Status nicht `canceled`.
- Scheduled und planned-only Tasks erscheinen dort als Activity Events.
- Completed Tasks bleiben als completed Activity Event sichtbar und bieten
  `Wieder oeffnen`.
- Today Planner zeigt offene Kandidaten ohne `date` und ohne `startTime`, wenn
  Planning Signals vorhanden sind.
- Geplante oder terminierte Tasks erscheinen nicht mehr als Today Planner
  Candidate.

Dashboard:

- `visibleDashboardTasks()` projiziert offene Tasks mit heutigem `date`.
- Completed und canceled Tasks werden aus Daily Control und Today Agenda
  herausgefiltert.
- Dashboard Today Agenda zeigt scheduled Tasks mit `HH:MM-HH:MM` und planned-
  only Tasks als `Flexible`.
- Focus Minutes entstehen nur aus Tasks mit `startTime` und `durationMinutes`.

Known Proofs:

- Today Planner -> Today Activity -> Dashboard Agenda -> Calendar Queue.
- Calendar Queue Scheduling -> Calendar Timed Block -> Today Activity ->
  Dashboard Agenda.
- Calendar Move/Duration -> exakte Calendar Range und Dashboard scheduled
  Detail.
- Unschedule -> Calendar Queue -> Today Activity -> Dashboard Flexible.
- Complete/Reopen -> Dashboard Removal, Calendar Queue Removal, Reopen back to
  Today/Dashboard/Calendar Queue.
- Recurring Generate -> Today Activity -> Dashboard Flexible -> Calendar Queue.
- Conflict Override -> Calendar overlapping Timed Blocks -> Today Activity ->
  Dashboard scheduled Detail.

Known Gaps:

- DB-weite Conflict Locks bleiben nicht Teil dieser Projection.
- Calendar Inspector `Mark done` fuer einen scheduled Block bleibt nicht als
  eigener Deep-Proof erweitert; die Completion/Reopen-Projektion ist ueber den
  Today Task-Lifecycle-Pfad bewiesen.
- Scheduled completed blocks koennen im Calendar als `done` Timed Block
  dargestellt werden, wenn `scheduled_start_at` bestehen bleibt; diese Anzeige
  ist current behavior, nicht neuer F1.0E-Scope.
- Dashboard Agenda ist kapazitaetsbegrenzt; Proofs nutzen frische eindeutige
  Titel und scoped Assertions.

## 4. Task State Matrix

| State | Calendar | Today Planner | Today Activity | Dashboard Agenda | Expected |
| --- | --- | --- | --- | --- | --- |
| `planned_date` gesetzt, keine `scheduled_start_at` | Planner Queue | nein | ja | ja, `Flexible` | konsistent |
| `scheduled_start_at` + `duration_minutes` gesetzt | Timed Block | nein | ja | ja, `HH:MM-HH:MM` | konsistent |
| scheduled Task verschoben | Timed Block mit neuer Range | nein | ja | ja, neue Zeit | konsistent |
| scheduled Task Dauer geaendert | Timed Block mit neuer Endzeit | nein | ja | ja, neue Dauer | konsistent |
| unscheduled Task | Planner Queue, kein Timed Block | nein | ja | ja, `Flexible` | konsistent |
| completed planned-only Task | keine Queue, kein Timed Block | nein | ja, completed/reopen | nein | konsistent |
| reopened planned-only Task | Planner Queue | nein | ja | ja, `Flexible` | konsistent |
| recurring generated Task | Planner Queue | nein | ja, `Wiederkehrend` | ja, `Flexible` | konsistent |
| conflict override scheduled Task | Timed Block trotz sichtbarer Ueberschneidung | nein | ja | ja, `HH:MM-HH:MM` | konsistent, UI-Override-only |

## 5. Proof Inventory

| Flow | Einstufung | Proof-Ort |
| --- | --- | --- |
| `Manual Calendar plans DB task through queue and schedules reload-stable` | `covered_non_skipped` | Calendar queue, exact timed range, move, duration, Today Activity, Today Planner Absenz, Dashboard scheduled detail |
| `Manual Calendar unschedules DB task back into planner queue` | `covered_non_skipped` | Calendar timed-block absence, Calendar queue return, Today Activity, Today Planner Absenz, Dashboard Flexible detail |
| `Manual Today Planner plans DB task into Today, Dashboard and Calendar queue` | `covered_non_skipped` | Today Planner removal, Today Activity, Dashboard Flexible detail, Calendar queue, week-grid absence |
| `Manual Today completes DB task and removes it from Dashboard agenda` | `covered_non_skipped` | Today complete/reopen form, Dashboard removal after reload, Calendar queue/grid absence, reopened Dashboard/Calendar return |
| `Manual Recurring generates task into Today, Dashboard and Calendar queue` | `covered_non_skipped` | Today generated event, reload, Dashboard Flexible detail, Calendar queue, idempotent second generate |
| `Manual Calendar executes explicit conflict override reload-stable` | `covered_non_skipped` | Calendar overlapping ranges, Today Activity, Today Planner Absenz, Dashboard scheduled detail |

## 6. Projection Gaps

Closed in F1.0E:

- Planned-only Dashboard projection now asserts `Flexible`.
- Scheduled Calendar projection now asserts Dashboard scheduled time detail.
- Unschedule now proves Today/Dashboard planned-without-time projection.
- Completion now proves Dashboard removal after reload and Calendar active
  absence.
- Reopen now proves Today, Dashboard and Calendar queue projection.
- Conflict Override now proves Today/Dashboard scheduled projection after the
  overlapping Calendar write.

Remaining:

- DB-wide conflict safety.
- Override audit or schedule history.
- Calendar Inspector `Mark done` as a separate scheduled-block deep proof.
- Pointer/touch drag and resize.
- Free Calendar Event persistence.

## 7. Fixes

Geaendert in `tests/e2e/content-state-system.spec.ts`:

- Neuer Helper `expectDashboardTodayAgendaItemDetail()` prueft Dashboard Today
  Agenda scoped ueber den Agenda-Link und konkrete Detail-Copy.
- Today Planner Proof prueft Dashboard `Flexible · 15 min`.
- Recurring Generate Proof prueft Dashboard `Flexible · 15 min`.
- Completion Proof prueft Dashboard-Absenz nach Reload, Calendar Queue/Grid
  Absenz, Reopen und Calendar Queue Rueckkehr.
- Calendar Scheduling Proof prueft Dashboard scheduled Detail mit exakter
  Start-/Endzeit und Dauer.
- Unschedule Proof prueft Today Activity, Today Planner Absenz und Dashboard
  `Flexible · 30 min`.
- Conflict Override Proof prueft Today Activity, Today Planner Absenz und
  Dashboard scheduled Detail fuer den bewusst ueberlappenden Task.

Keine App-, Backend-, Schema-, Repository-, Layout- oder Migrationsdatei wurde
geaendert.

## 8. Reload Stability

Reload-Stabilitaet bleibt Bestandteil der geaenderten Proofs:

- Schedule, Move, Duration und Override pruefen Calendar-Ranges nach Reload.
- Today Planning prueft Today Activity nach Reload.
- Recurring Generation prueft die erzeugte Instanz nach Reload.
- Completion prueft Dashboard-Absenz nach Reload.
- Reopen prueft Today-Lifecycle nach Reload und danach Dashboard/Calendar
  Projection.
- Unschedule nutzt Calendar reload und anschliessende scoped Projektionen.

Gezielter Proof vor Abschluss der Doku:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Today Planner plans|Manual Recurring generates|Manual Today completes|Manual Calendar plans DB task|Manual Calendar unschedules|Manual Calendar executes explicit conflict override"

6 passed
0 failed
```

Post-Reopen-Assertion Einzelproof:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Today completes DB task and removes it from Dashboard agenda"

1 passed
0 failed
```

## 9. Remaining Deferred Work

- DB-weite Conflict-Sperre nur mit eigenem Data-Scope.
- Override-Audit/Schedule-History nur mit eigener Datenmodellentscheidung.
- Calendar Inspector `Mark done` scheduled-block Deep-Proof, falls noetig.
- F1.0F Pointer Drag/Resize Future Plan.
- Free Calendar Event Persistence bleibt deferred.
- Today Review-/Daily-Record-Tiefe bleibt ausserhalb von F1.0E.

## 10. Connected Claim Impact

F1.0E staerkt den lokalen Calendar/Today/Dashboard Projection Claim:

```text
Calendar bleibt local_connected_with_depth_gap.
Die Calendar-Schreibpfade und Today/Dashboard-Projektionen sind als
Button-/Keyboard-Kern scoped, browserbewiesen und reload-stabil gehaertet.
```

Nicht hochgestuft:

- kein final complete
- kein production-ready
- kein remote-ready
- keine DB-weite Conflict-Garantie
- keine Pointer Drag/Resize-Readiness

## Validation

Fokussierter Browser Proof:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Calendar|Today|Dashboard|Manual"

72 passed
2 skipped
0 failed
```

Projekt- und lokale DB-Checks:

```text
git diff --check
git diff --cached --check
pnpm typecheck
pnpm lint
pnpm build
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none

all passed
```
