# Calendar UX State Clarity F1.0B

Stand: 2026-07-11
Status: PASS_LOCAL_BROWSER_PROOF
Zweck: QA- und Produktproof fuer F1.0B Calendar UX/Copy/State Clarity.
Quelle der Wahrheit: F1.0A Scope Lock, Calendar UI, Task Actions und
`tests/e2e/content-state-system.spec.ts`.
Nicht gilt fuer: Pointer Drag/Resize, neue Calendar-Event-Persistenz,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB, Deployment oder Secrets.

## Scope

F1.0B klaert bestehende Calendar-Zustaende, ohne neue Features zu bauen.

Geaendert wurden:

- Calendar Create als vorbereiteter lokaler Preview-State.
- Header- und Source-Contract-Copy fuer Task-Scheduling.
- Inspector-State fuer Task-Zeitsteuerung, Projektion und vorbereitete Slots.
- Planner Queue Copy fuer geplante Tasks ohne Uhrzeit.
- Open-Loops-/Review-Kontext als vorbereitet und nicht lokal verbunden.
- Conflict/Override Copy als sichtbares ViewModel-Gate, nicht DB-weite Sperre.
- Month/Year als vorbereitete Uebersichten.
- Scoped E2E-Assertions fuer Prepared Create, Queue-Klarheit und Conflict Scope.

Nicht geaendert wurden:

- Task-Scheduling-Actions.
- Reschedule-, Unschedule-, Complete-/Reopen-Server-Actions.
- Conflict-Algorithmus.
- Datenmodell, Migrationen, RLS oder Policies.
- Pointer Drag/Resize.
- Today- oder Dashboard-Layout.

## Browser Proof

Command:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Calendar|Today|Dashboard|Manual"
```

Result:

```text
71 passed
2 skipped
0 failed
```

Skips:

- `Inbox content states › keeps manual reset empty with visible quick capture`
- `Inbox content states › Manual Inbox Add to Existing empty Project targets stay non-persistent`

Bewertung:

- Die zwei Skips sind nicht Calendar-spezifisch.
- Dedicated Calendar Tests sind gruen:
  - Demo Calendar prepared create state.
  - Empty Calendar without demo blocks.
  - Manual Calendar queue scheduling reload-stable.
  - Manual Calendar unschedule back to Planner Queue.
  - Manual Calendar conflict block without explicit override.

## State Clarity

Calendar Create:

- Sichtbar als `Prepared calendar item`.
- Speichert nur lokale UI-Preview.
- Sagt explizit, dass Task-Scheduling ueber Queue/Inspector aktiv ist.
- Sagt explizit, dass freie Kalendertermine spaeter folgen.

Planner Queue:

- Trennt geplante Tasks ohne Uhrzeit von scheduled Timegrid Blocks.
- `Terminieren` bleibt der echte Manual-Task-Zeitwrite.
- Open Loops und Reviews sind vorbereitete Kontextlisten.

Timegrid:

- Week Timegrid zeigt scheduled Task Blocks.
- Planned Tasks ohne Uhrzeit bleiben in der Planner Queue.
- Month/Year bleiben vorbereitete Uebersichten.

Conflict/Override:

- Normaler Save bleibt bei sichtbarem Konflikt blockiert.
- Override bleibt separat sichtbar.
- Copy sagt, dass der Check nur gegen geladene sichtbare Zeitbloecke gilt und
  nicht DB-weit ist.

## Security / Data

- Keine Migration.
- Keine RLS-/Policy-Aenderung.
- Keine Remote-DB-Aktion.
- Keine Secrets gelesen oder dokumentiert.
- Keine neuen Calendar-owned Event-Records.
- Task-Zeitwrites laufen weiter ueber bestehende Task Actions.

## Completion Decision

```text
PASS_WITH_DEFERRED
```

F1.0B ist lokal proof-gruen. Deferred bleiben Pointer Drag/Resize, freie
Calendar-Event-Persistenz, DB-weite Conflict-Sperre, Override-Audit und
Review/Open-Loop-Persistenz im Calendar.
