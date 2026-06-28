# R1.8.3 MVP Core Hardening Review

Stand: 2026-06-28
Status: Passed with small hardening fixes
Scope: MVP Core nach `c74c881 fix: stabilize manual database proofs`

## Ziel

R1.8.3 prueft den browserbewiesenen MVP-Core auf Accessibility,
Security/Privacy, Prepared/Future UI und Form/Error-State-Hardening.
Der Block erweitert keine Produktfeatures, fuehrt keine Migration ein und
nutzt keine Remote-DB.

## Startcheck

- `git status --short`: tracked Worktree sauber; nur erlaubte untracked
  Eintraege `docs/product/life-os-full-roadmap-checklist.md` und `private/`.
- `git log --oneline -35`: Startpunkt `c74c881 fix: stabilize manual database proofs`.
- `git diff --check`: sauber.
- `pnpm typecheck`: gruen.
- `pnpm lint`: gruen.
- `pnpm exec supabase db lint --local --level warning`: gruen, keine Schemafehler.

## Accessibility Review

Gepruefte Hauptflows:

- Inbox Routing, Task Draft, Add to Existing, Create New, Resource Draft,
  Solved/Archive und AI Suggestions.
- Today Planner inklusive Recurring Trigger.
- Calendar Scheduling Controls inklusive Previous/Next Week Icon-Buttons.
- Portfolio Task/Project/Goal/Skill Workbenches.
- Resource Inspector und Resource Relations.
- Nutrition Recipe/Meal Forms.

Accessibility Issues:

- Inbox Action Feedback war sichtbar, aber mehrere async Success/Error/Blocked
  Meldungen hatten keine expliziten `status`/`alert` Live-Region-Rollen.
- Portfolio Task Archive hatte keinen sichtbaren Erfolgspfad und konnte beim
  direkten Reload nach Submit stale selected-task UI behalten.

Fixed:

- Inbox Action Messages nutzen jetzt `role="status"` fuer Success und
  `role="alert"` fuer Blocked/Error.
- Inbox Success-Zustaende fuer Create New, Solved/Archive, Resource und Task
  sind als Status textlich wahrnehmbar.
- Portfolio Task Archive redirectet nach erfolgreicher serverseitiger Mutation
  nach `/portfolio?view=tasks&targetCreate=task_archived`.
- Portfolio zeigt `Task archiviert.` als sichtbare Statusmeldung.
- E2E prueft kritische Task-Draft Labels, Calendar Previous/Next Week
  Accessible Names und die AI No-Persistence Copy.

Deferred:

- Kein Pointer-Drag/Resize im Calendar; bestehender Keyboard-/Button-Pfad
  bleibt MVP-Scope.
- Keine neue Dialog-/Focus-Trap-Arbeit ausserhalb der geprueften Flows.

## Security / Privacy Review

Gepruefte Actions:

- `inbox-ai.actions.ts`
- `nutrition.actions.ts`
- `skill.actions.ts`
- `recurring-task-template.actions.ts`
- `recurring-task-generation.actions.ts`
- `resource.actions.ts`
- `portfolio.actions.ts`
- `task.actions.ts`
- `inbox.actions.ts`

Security Issues:

- Keine offenen Security-Issues im geprueften Scope.
- Die Core-Grep-Validierung deckte eine UX-/state-race Schwachstelle beim
  Portfolio Archive Submit auf; kein RLS- oder Ownership-Bypass.

Privacy Issues:

- Keine offenen Privacy-Issues im geprueften Scope.
- Keine externe AI API, kein Service Role Key, keine Secrets, keine sensiblen
  Logs und keine Remote-DB-Nutzung gefunden.

Fixed:

- Portfolio Archive Mutation ist nun nach Erfolg sichtbar und beendet den
  stale selected-task Zustand durch Redirect.

Deferred:

- Keine RLS-/Policy-Aenderung ohne eigenen freigegebenen Block.
- Keine neue AI Provider-, Graph-, Automation- oder External-API-Anbindung.

## Action Boundary Findings

- Actions akzeptieren keinen clientseitigen `userId`; User/Profile-Scope kommt
  aus serverseitiger Supabase Auth.
- Zod validiert Action-Inputs vor Repository-/RPC-Aufrufen.
- Inbox Task Triage RPC ist `security invoker`, nutzt `auth.uid()` und prueft
  Inbox, Area, Project und Goal gegen den aktuellen User.
- Inbox Resource RPC ist `security invoker`, nutzt `auth.uid()` und prueft
  Inbox/Area im User-Scope.
- Resource Relations pruefen Source Resource und polymorphe Targets
  Project/Goal/Task/Resource same-user vor dem Write.
- Skill Evidence prueft Skill Ownership und polymorphe Sources
  Project/Goal/Task/Resource same-user; `manual_note` verlangt keine Source-FK.
- Nutrition prueft Recipe/Meal/Area Ownership im Repository.
- Recurring Template Actions pruefen Area/Project/Goal Ownership; Generation
  bleibt explizit user-ausgeloest.

## Prepared / Future UI Review

Prepared/Future UI:

- Skill Map: prepared/future, keine Graph-Library, keine Node Map, keine
  automatische AI Skill Inference.
- Resource Graph: future, Resource Relations sind listen-/inspectorbasiert.
- Recurring Automation: keine Cron Jobs, keine Background Jobs, keine
  automatische Page-Load-Generation.
- Nutrition Deep Features: Ingredients, Grocery-Persistenz, Macro Targets,
  externe Nutrition APIs und medizinische Empfehlungen bleiben future.
- AI Provider: deterministischer lokaler Mock; Vorschlagsschicht ohne externe
  Provider, API Key oder autonome Writes.
- Ingredients/Grocery: Grocery/Ingredients UI bleibt mock/local bzw.
  vorbereitet, keine Supabase-Persistenzbehauptung.
- Calendar Pointer Drag: bewusst nicht implementiert; Scheduling laeuft ueber
  Buttons/Form Controls.
- Routine UI: lokale/prepared Routine-Flows, keine Automation.
- Education/Coding Skill Map: prepared/local Shell, keine kanonische
  Skill-Graph-Persistenz.

Fixed:

- Keine Prepared/Future Copy-Fixes erforderlich.

Deferred:

- Alle Graph-, Automation-, Deep Nutrition-, Routine- und Provider-Themen
  bleiben eigene spaetere Bloecke.

## Forms / Error States

Gepruefte Forms:

- Inbox Quick Capture, Task Draft, Add to Existing, Create New, Resource Draft,
  Solved/Archive und AI Suggestion Review.
- Resource Relation Create.
- Nutrition Recipe Create, Meal Create und Meal Complete.
- Skill Create/Edit/Evidence Create/Delete.
- Recurring Template Create und Generate.
- Calendar Scheduling Controls.

Findings:

- Inputs/Selects in den geprueften Hauptflows haben sichtbare Labels oder
  sinnvolle accessible names.
- Icon-only Calendar Previous/Next Week Buttons haben `aria-label`.
- Disabled States sind textlich erklaert, besonders prepared/non-persistent
  Routen.
- Success/Error/Blocked States sind sichtbar; Inbox und Portfolio Archive
  wurden zusaetzlich gehardet.
- Keine wichtige Information ist nur ueber Farbe erkennbar.

## V5 Design Check

Was passt zu V5:

- Keine Dashboard-Rekomposition, keine Layoutwert-Aenderung, keine neue
  visuelle Richtung.
- Fixes bleiben text-/semantiknah und staerken Bedienbarkeit statt Dekoration.

Was verletzt V5:

- Keine V5-Verletzung gefunden.

Konkrete Fixes:

- Live-Region-Semantik fuer Inbox Feedback.
- Sichtbarer Portfolio Archive Status nach erfolgreicher Mutation.

Acceptance Decision:

- PASS_WITH_FIXES; Fixes wurden umgesetzt und validiert.

## Validierung

- `git diff --check`: gruen.
- `pnpm typecheck`: gruen.
- `pnpm lint`: gruen.
- `pnpm exec supabase db lint --local --level warning`: gruen.
- Einzelner Archive Regression Proof:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Portfolio archives DB task out of active views"`
  Ergebnis: 1 passed.
- E2E Core:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Inbox|Today|Dashboard|Calendar|Portfolio"`
  Ergebnis: 86 passed, 2 skipped.
- E2E Extensions:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resources|Nutrition|Skill|AI|Recurring"`
  Ergebnis: 25 passed.

## Auth / RLS / Migration

- Auth-State: bestehender lokaler `localhost` Playwright Supabase Auth-State
  war nutzbar; kein Refresh noetig.
- RLS: keine Policy geaendert; bestehende local RLS/ownership Proofs bleiben
  Grundlage.
- Migration: keine Migration erstellt oder ausgefuehrt.
- Remote DB: kein `supabase link`, kein `supabase db push`, kein Remote-Zugriff.
- Service Role: nicht genutzt.

## Nicht geloest

- Keine Graph-/Skill-Map-Implementierung.
- Keine Nutrition Deep Features oder Grocery-Persistenz.
- Keine Recurring Automation.
- Kein Calendar Pointer Drag/Resize.
- Keine neue AI Provider-Integration.

## Risiken

- Lokale Manual-DB ist weiter stark gefuellt; die zwei Core-Skips bleiben
  datenabhaengige Manual-Empty-Gates.
- Browser-Proofs erzeugen weitere lokale Testdaten; kein Cleanup/Reset wurde
  durchgefuehrt.
