# Calendar Conflict Override Finalization F1.0D

Stand: 2026-07-11
Status: Completed
Scope: Conflict-/Override-Semantik, minimale Copy-/Accessibility-Schaerfung
und Browser-Proof fuer explizite Override-Ausfuehrung.
Quelle der Wahrheit: `docs/product/calendar-finalization-scope-f1-0a.md`,
`docs/product/calendar-drag-resize-design-lock.md`,
`docs/qa/calendar-scheduling-proof-hardening-f1-0c.md`,
`src/features/calendar/components/calendar-right-panel.tsx` und
`tests/e2e/content-state-system.spec.ts`.

## 1. Zweck

F1.0D finalisiert die bestehende Calendar Conflict-/Override-Semantik fuer den
Button-/Keyboard-Kern.

Der Block beweist, dass ein sichtbarer Konflikt den Standard-Button blockiert,
der separate Override bewusst ausgefuehrt werden kann und der ueberschneidende
Zustand nach Reload stabil sichtbar bleibt.

## 2. Nicht-Ziele

- keine neuen Calendar Features
- kein Pointer Drag/Resize
- kein Touch Drag
- keine freie Calendar-Event-Persistenz
- keine neue Tabelle
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine DB-weite Conflict-Sperre
- kein Override-Audit oder Schedule-History
- keine Calendar-Recomposition oder neue Designrichtung

## 3. Conflict Semantics

Conflict Gate:

```text
Ein sichtbarer Konflikt ist eine Ueberschneidung mit einem anderen geladenen
scheduled Task Block im aktuellen Calendar ViewModel.
```

Aktuelle Regel:

```text
candidateStart < otherEnd && otherStart < candidateEnd
```

Details:

- Direkt angrenzende Blocks gelten nicht als Konflikt.
- Der aktuell bearbeitete Task wird ueber `taskId` ausgeschlossen.
- Nur Blocks mit gleichem `plannedDate`/Calendar-Date werden verglichen.
- Das Gate lebt im Calendar Inspector und blockiert den Standard-Button.
- Das Gate ist ein UI-/ViewModel-Gate, keine serverseitige oder DB-weite
  Sperre.

## 4. Override Semantics

Override bedeutet:

```text
Der User entscheidet bewusst, den sichtbaren Konflikt trotzdem ueber denselben
Task-Zeitpfad zu speichern.
```

Details:

- Der Override Button ist separat vom deaktivierten Standard-Button.
- Der Button nutzt dieselbe `rescheduleTaskFormAction`.
- `manualOverride` bleibt kein eigener Backend-Contract und wird nicht als
  serverseitiges Audit-Feld ausgewertet.
- Auth, Zod, user-scope und Revalidation bleiben im bestehenden
  `rescheduleTaskAction`/Repository-Pfad.
- Die UI sagt nicht, dass unsichtbare oder DB-weite Konflikte verhindert
  werden.

## 5. Proofs Added / Hardened

Geaendert in `tests/e2e/content-state-system.spec.ts`:

- Bestehender Conflict-Block-Proof wurde auf die neue Copy
  `Sichtbarer Konflikt`, `Nur sichtbare Blöcke geprüft` und den neuen
  Override-Accessible-Name angepasst.
- Neuer Proof:
  `Manual Calendar executes explicit conflict override reload-stable`.

Der neue Proof:

1. erstellt Task A und Task B mit eindeutigen Titeln.
2. terminiert Task A in ein sichtbares Zeitfenster.
3. terminiert Task B direkt angrenzend.
4. waehlt Task B im Calendar Week Grid aus.
5. prueft, dass `15 min früher` als Standard-Aktion disabled ist.
6. prueft die scoped Conflict Copy im Calendar Inspector.
7. fokussiert und klickt den expliziten Override Button.
8. reloadet die Calendar-Seite.
9. prueft Task A und Task B als ueberschneidende timed blocks mit exakter
   `HH:MM to HH:MM` Range.

## 6. Reload Stability

Reload-Stabilitaet ist bewiesen durch:

- Write ueber realen Button/Form Submit.
- `networkidle` nach dem Submit.
- expliziten Reload.
- scoped Week-Grid Assertions fuer beide relevanten timed blocks.

Gezielter Proof der geaenderten Conflict-/Override-Tests:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Calendar blocks visible conflicts|Manual Calendar executes explicit conflict override"

2 passed
0 failed
```

## 7. What This Does Not Prove

F1.0D beweist nicht:

- DB-weite Conflict-Sicherheit.
- serverseitiges Conflict Locking.
- dass unsichtbare, nicht geladene oder externe Calendar-Bloecke erkannt
  werden.
- Override-Audit oder Schedule-History.
- freie Calendar Event Persistence.
- Pointer/touch Drag oder Resize.
- Production-, Remote- oder Public-SaaS-Readiness.

## 8. Remaining Deferred Work

- DB-weite Conflict-Sperre nur mit eigenem Data-Scope.
- Override-Audit/Schedule-History nur mit eigener Datenmodellentscheidung.
- F1.0E Today/Dashboard Projection Review, falls weitere Projektionstiefe
  gewuenscht ist.
- F1.0F Pointer Drag/Resize Future Plan.
- Free Calendar Event Persistence bleibt deferred.

## 9. Connected Claim Impact

F1.0D staerkt den lokalen Calendar Claim:

```text
Calendar bleibt local_connected_with_depth_gap.
Conflict Gate und explizite Override-Ausfuehrung sind jetzt scoped,
browserbewiesen und reload-stabil.
```

Nicht hochgestuft:

- kein final complete
- kein production-ready
- kein remote-ready
- keine DB-weite Conflict-Garantie

## Validation

Gezielter Conflict-/Override-Proof:

```text
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Calendar blocks visible conflicts|Manual Calendar executes explicit conflict override"

2 passed
0 failed
```

Fokussierter Browser Proof fuer den verbundenen Slice:

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
