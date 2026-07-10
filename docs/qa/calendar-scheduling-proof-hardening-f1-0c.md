# Calendar Scheduling Proof Hardening F1.0C

Stand: 2026-07-11
Status: Completed
Scope: Test- und QA-Hardening fuer bestehende Calendar Scheduling Flows.
Quelle der Wahrheit: `docs/product/calendar-finalization-scope-f1-0a.md`,
`docs/qa/calendar-ux-state-clarity-f1-0b.md`,
`docs/product/calendar-drag-resize-design-lock.md`,
`docs/product/task-inbox-calendar-workflow.md` und
`tests/e2e/content-state-system.spec.ts`.

## 1. Zweck

F1.0C haertet den bestehenden Button-/Keyboard-Kern fuer Calendar Scheduling.
Der Slice beweist genauer, dass Manual Tasks aus der Calendar Planner Queue
terminiert, per 15-Minuten-Controls verschoben, in der Dauer angepasst,
entterminiert und danach in Today/Dashboard korrekt projiziert werden.

## 2. Nicht-Ziele

- keine neuen Calendar Features
- kein Pointer Drag/Resize
- kein Touch Drag/Resize
- keine freie Calendar-Event-Persistenz
- keine DB-Struktur, Migration, RLS- oder Policy-Aenderung
- keine UI-Recomposition oder neue Designrichtung
- keine DB-weite Conflict-Sperre
- kein Override-Audit oder Schedule-History
- keine Remote-DB-Aktion, kein Deployment, keine Secrets

## 3. Proof Inventory

| Flow | Einstufung nach F1.0C | Proof-Ort |
| --- | --- | --- |
| Task aus Planner Queue terminieren | `covered_non_skipped` | `Manual Calendar plans DB task through queue and schedules reload-stable` |
| Scheduled Task reload-stabil sichtbar | `covered_non_skipped` | exakte Week-Grid Button-Range nach Reload |
| `15 min frueher` | `covered_non_skipped` | deterministisches freies Zeitfenster, Button enabled, Reload, exakte Range |
| `15 min spaeter` | `covered_non_skipped` | Rueckbewegung auf Originalslot, Button enabled, Reload, exakte Range |
| `Dauer +15 min` | `covered_non_skipped` | Button enabled, Reload, erweiterte exakte Range |
| `Dauer -15 min` | `covered_non_skipped` | Button enabled, Reload, Rueckkehr zur Originaldauer |
| Unschedule zurueck in Planner Queue | `covered_non_skipped` | Grid-Absenz nach Reload und scoped Queue-Assertion |
| Complete/Reopen mit Calendar/Today/Dashboard-Bezug | `covered_non_skipped` fuer Today/Dashboard/Portfolio Lifecycle, Calendar-spezifischer Inspector-Completion-Deep-Proof bleibt `not_in_scope` fuer F1.0C | bestehende Today/Portfolio Lifecycle-Proofs |
| Today/Dashboard Projection nach Scheduling | `covered_non_skipped` | Today Activity scoped, Today Planner Absenz, Dashboard Today Agenda scoped |
| Conflict Block ohne Override | `covered_non_skipped` | Inspector scoped disabled state, Conflict Copy, Reload unveraendert |
| Override bewusst ausfuehren | `not_covered` | deferred nach F1.0D Conflict/Override Finalization |

## 4. Proof Gaps

- Override wird in F1.0C nur sichtbar und getrennt bewiesen, aber nicht
  ausgefuehrt.
- Conflict Detection bleibt ein UI-Gate gegen geladene sichtbare
  Zeitbloecke, keine DB-weite Garantie.
- Calendar Inspector `Mark done` ist nicht der Schwerpunkt von F1.0C; die
  Task-Lifecycle-Projektion bleibt ueber Today/Portfolio/Dashboard bewiesen.
- Pointer/touch Drag und Resize bleiben explizit deferred.
- Freie Calendar Events bleiben prepared/future.

## 5. Scheduling Move/Duration Proofs

F1.0C ersetzt optionale Move-/Duration-Pfade durch harte Assertions:

- Das Testfenster wird in sichtbare Calendar-Zeit gelegt.
- Der Task startet 15 Minuten nach dem freien Fensterbeginn, damit
  `15 min frueher` und `15 min spaeter` beide konfliktfrei pruefbar sind.
- Jeder Button muss enabled sein.
- Nach jedem Write folgt `networkidle`, Reload und eine exakte scoped
  Week-Grid Assertion auf `Title, HH:MM to HH:MM`.
- `Dauer +15 min` wird gegen die verlaengerte Range geprueft.
- `Dauer -15 min` wird gegen die Rueckkehr zur Originalrange geprueft.

## 6. Unschedule Proof

Der Unschedule-Proof prueft jetzt:

- initiale scheduled Range nach Queue Scheduling
- `15 min spaeter` mit enabled Button, Reload und exakter Range
- `Unschedule` Write, Reload und keine Timed-Block-Button-Instanz mehr im
  Week Grid
- Rueckkehr in die scoped Calendar Planner Queue

## 7. Projection Proof

Nach Scheduling prueft F1.0C:

- Today Activity Stream enthaelt den scheduled Task scoped und reload-stabil.
- Today Planner enthaelt den scheduled Task nicht mehr als Kandidaten.
- Dashboard Today Agenda enthaelt den Task scoped und reload-stabil.

## 8. Conflict/Override Regression

Der Konflikt-Proof bleibt bewusst Regression-Safety:

- zwei adjacent Blocks werden in exakten Ranges terminiert.
- der zweite Block wird ausgewaehlt.
- `15 min frueher` ist im Calendar Inspector disabled.
- Conflict Copy und Override Button sind im Calendar Inspector sichtbar.
- Nach Reload bleibt der zweite Block in seiner unveraenderten Range.

Override-Ausfuehrung bleibt F1.0D, weil dort bewusst entschieden wird, ob
nur UI-Semantik oder ein eigener Backend-/Audit-Contract eingefuehrt wird.

## 9. Fixes

Geaendert in `tests/e2e/content-state-system.spec.ts`:

- Calendar Timed Block Auswahl escaped jetzt dynamische Titel.
- Neuer Helper `expectCalendarTimedBlockRange()` prueft scoped Week-Grid
  Buttons mit exakter Start-/Endzeit und Reload-Retry.
- Neuer Helper `expectNoCalendarTimedBlock()` prueft Timed-Block-Absenz
  scoped ueber Week-Grid Buttons.
- Schedule/Move/Duration Proof nutzt ein deterministisches freies Zeitfenster.
- Unschedule Proof prueft initiale und verschobene Range sowie Grid-Absenz.
- Conflict Proof nutzt scoped Inspector-Assertions und exakte Range-Proofs.

Keine App- oder Backend-Datei wurde geaendert.

## 10. Remaining Deferred Work

- F1.0D: Conflict/Override Finalization.
- F1.0E: Today/Dashboard Projection Review, falls weitere Projektionstiefe
  gewuenscht ist.
- F1.0F: Pointer Drag/Resize Future Plan.
- DB-weite Conflict-Sperre, Override Audit und Schedule History bleiben ohne
  separaten Data-Scope deferred.
- Free Calendar Event Persistence bleibt deferred.

## 11. Connected Claim Impact

F1.0C verbessert den lokalen Proof fuer Calendar als finalen
Button-/Keyboard-Scheduling-Kern.

Claim nach F1.0C:

```text
Calendar bleibt local_connected_with_depth_gap,
aber Schedule/Move/Duration/Unschedule-Proofs sind haerter und scoped.
```

Nicht behauptet:

- kein `final complete`
- kein Production-Ready
- kein Remote-Ready
- keine DB-weite Conflict-Garantie
- kein Pointer Drag/Resize

## Validation

Gezielter Proof der geaenderten Calendar Tests:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Calendar plans DB task|Manual Calendar unschedules|Manual Calendar blocks"

3 passed
0 failed
```

Focused Browser Proof:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Calendar|Today|Dashboard|Manual"

71 passed
2 skipped
0 failed
```

Projektchecks:

```text
git diff --check
git diff --cached --check
pnpm typecheck
pnpm lint
pnpm build
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none
```

Alle genannten Checks waren gruen. `pnpm build` musste ausserhalb der Sandbox
wiederholt werden, weil Turbopack im Sandbox-Kontext kein lokales Port-Binding
fuer den Build-Hilfsprozess ausfuehren durfte.
