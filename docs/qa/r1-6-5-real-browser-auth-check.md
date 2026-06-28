# R1.6.5 Real Browser Auth Check

## Env

- Local Supabase runtime only.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No remote DB, `supabase link`, `supabase db push`, migrations, or policy changes.

## Browser Check

1. Open `/settings#supabase-session`.
2. Confirm `Manual Profile` can remain active while `Supabase Session` shows signed out.
3. Sign in with local Supabase email/password.
4. Open `/inbox`.
5. Capture a Manual Inbox item.
6. Choose `Standalone task` in Outcome Route.
7. Edit the `Task Draft` fields and use `Task erstellen`.
8. Open `/portfolio?view=tasks` and confirm the task is visible.
9. Use `Heute planen`.
10. Open `/today` and `/dashboard` and confirm the task is visible for the local day.
11. Use `Heute terminieren`.
12. Open `/calendar` and confirm the task appears in the timed grid.
13. Reload `/inbox`, `/portfolio?view=tasks`, `/today`, `/dashboard`, and `/calendar`.

## Entry Semantics

- Capture ≠ Task.
- Task ≠ Termin.
- Terminierte Task = Task + `scheduledStartAt`.
- Dashboard Quick Thought is generic Inbox capture.
- Inbox is where classification and Task Draft review happen.
- Portfolio owns task inventory and planning.
- Today shows today's execution view.
- Calendar shows scheduled time blocks.

## R1.6.6A Inbox Routing Notes

- Inbox is a routing system for raw captures, not a task-only creation surface.
- Dashboard Quick Thought is generic capture; it must save to Inbox without implying that a Task is created immediately.
- Task creation is only one possible outcome route after Inbox review.
- Planning signals such as priority, energy, effort, area, Today candidate, deadline hint, or recurrence hint are not fixed scheduling.
- Calendar creates or shows time blocks after planning confirmation; it is not the place where raw Inbox clarification happens.

## R1.6.6B Inbox Router UI

- Outcome Routes are visible as the primary router for the selected Inbox item.
- Standalone Task is marked as connected and opens the functional Task Draft.
- Add to Existing, Create New, and Resource are visible routes. Resource is minimally connected in R1.6.7; Create New remains marked as not connected.
- Prepared routes show draft shells and must not expose a persistence submit action.
- Planning Signals are hints for later planning, not scheduling.
- AI Assistant suggests routes and fields, but it does not decide or apply changes.

## R1.6.6C Solved / Archive Route

- Solved / Archive is connected as the first non-task persistent route.
- The route removes an Inbox item from the active Inbox by soft archive.
- It must not hard-delete the row.
- It must not create a Task, Resource, Project, or Goal.
- Archived items are reload-stable outside the active Inbox.
- Archive view does not exist yet.

## R1.6.6D Add to Existing Target Picker

- Add to Existing is connected as a Target Picker, not as a generic auto-link.
- Existing Projects, Goals, and Resources are loaded read-only through the authenticated Supabase client and normal RLS.
- Task contribution is the only persistent Add-to-Existing path in this block.
- Project target writes the created task with `project_id`; Goal target writes the created task with `goal_id`.
- Resource Link is visible as prepared but does not write a Resource relation yet.
- Skill remains Future Scope until a real persisted Skill entity exists.
- Without an existing Project or Goal target, Add to Existing must not expose an enabled persistent submit.
- Route selection alone still writes nothing.

## R1.6.6D2 Inbox Router Visual Check

- Inbox Active Item must render in this order: Original Capture, Clarify Fields, Outcome Route, Draft, Planning Signals.
- `Noch kein Draft ausgewählt` appears only inside the Draft slot and only before a route is selected.
- Each selected route renders exactly one matching draft in the Draft slot.
- Add to Existing shows `Bestehendem Objekt zuordnen` with Target type, Existing target, and Beitragstyp controls.
- Planning Signals sit below the Draft slot and do not overlap Route Cards or Draft content.
- Create New can be selected, but its Draft shell clearly says it does not write persistence yet. Resource opens a connected Draft with explicit submit.
- Add to Existing is partially connected: Task to Project/Goal only; Resource Link is prepared; Note/Decision/Skill are not connected.
- Triaged or archived items show their post-state and must not reopen the active router as the primary work surface.

## R1.6.6D3 Inbox Router Layout Check

- In the 3-column desktop layout, the Active Item card body must scroll internally.
- Add-to-Existing Draft must not be clipped by the card or page container.
- Target type controls, Existing target select, Beitragstyp controls, and lower draft controls must remain reachable.
- Planning Signals may sit below the fold, but must remain reachable through the Active Item scroll area.
- Queue and assistant columns should remain stable while the Active Item body scrolls.

## R1.6.6E Add-to-Existing Persistence Proof

- Existing Project and Goal targets are read from authenticated Supabase queries scoped by `user_id` and `archived_at is null`; no demo targets are injected into Manual profile.
- If no real Project or Goal target exists, the Existing target select stays disabled and `Task-Beitrag erstellen` stays disabled.
- For a real Project target, Add to Existing + Beitragstyp Task submits through the inbox triage RPC with `project_id`.
- For a real Goal target, Add to Existing + Beitragstyp Task submits through the same RPC with `goal_id`.
- The RPC validates the Inbox item and selected target against `auth.uid()` before creating the Task.
- The created Task stores `source_inbox_item_id` and the selected `project_id` or `goal_id`, then marks the Inbox item triaged.
- Portfolio Tasks show the new Task and the context panel renders the selected Project or Goal relation.
- Reloading Inbox and Portfolio must not expose another Add-to-Existing submit for the already triaged Inbox item.

## R1.6.6F Portfolio Relation Labels

- Add-to-Existing Tasks must not show raw Project or Goal UUIDs as the primary relation label in Portfolio.
- Project and Goal titles appear in the Portfolio context panel when the selected target still exists and is active.
- Missing or archived targets show `Project nicht gefunden` or `Goal nicht gefunden`.
- Tasks without a relation show `Kein Project verknüpft` and `Kein Goal verknüpft`.
- Manual profile must not fall back to demo Project or Goal titles.

## R1.6.6G Minimal Project/Goal Create

- Manual Portfolio exposes a compact `Neues Target` section for Project and Goal creation.
- Project/Goal create writes authenticated Supabase rows only; no client `user_id` is accepted.
- Created Projects/Goals appear in Portfolio after reload.
- Inbox Add to Existing target picker shows created Projects/Goals as real DB targets.
- Task contributions to created Projects/Goals show readable relation titles in Portfolio.
- Manual profile must not use fake or demo targets when no DB targets exist.

## R1.6.5B Follow-up Checks

1. If `/settings#supabase-session` shows `invalid session`, use `Session zurücksetzen`.
2. Confirm `/inbox`, `/portfolio?view=tasks`, `/today`, `/dashboard`, and `/calendar` stop showing repeated invalid refresh-token noise after reset.
3. Sign in again with local Supabase email/password.
4. Open `/dashboard`, confirm no `Inbox-Typ` dropdown is visible in `Quick Thought`, use `In Inbox speichern`, and confirm `In der Inbox gespeichert.` plus `Inbox öffnen`.
5. Open `/inbox`, confirm the captured thought appears as a generic Inbox capture with Outcome Route visible and without `Task erstellen`.
6. Choose `Standalone task`, confirm `Outcome Route gewählt` becomes done, and confirm `Task Draft` appears.
7. Confirm `Task Draft` fields are editable: title, description/context, next action, area, priority, effort/duration, energy, review-needed, and optional `Heute planen`.
8. Change title, description/context, next action, priority, effort/duration, and energy, then use `Task erstellen`.
9. Confirm exactly one `Task erstellt` state and `Portfolio öffnen` are visible after triage.
10. Confirm the already triaged item no longer shows a large `Task erstellen` button after reload, so no second task can be created from the same inbox item.
11. Confirm the checklist shows `Task Draft vorhanden` for saved task captures and `Outcome Route gewählt` done for a selected standalone-task route.
12. Confirm persisted draft fields in Portfolio: title, description/context including next action, priority, energy, duration, and optional Today planning.
13. Confirm Area persists only when the Inbox item already has a real DB Area; otherwise the UI labels Area as not saved.
14. Confirm the created task is visible through Portfolio, Today, Dashboard, and Calendar planning views after the normal manual DB flow.
15. If Portfolio, Today, Dashboard, or Calendar stay empty, verify that the item was triaged in Inbox and that the task is visible under `/portfolio?view=tasks` before checking planning or scheduling actions.
16. For Add to Existing, open `/inbox`, choose `Add to Existing`, and confirm the Target Picker lists only real DB Projects, Goals, or Resources.
17. Select a Project or Goal, keep Beitragstyp `Task`, edit the draft, and use `Task-Beitrag erstellen`.
18. Confirm the Inbox item reaches `Task erstellt` and the task appears in Portfolio with the selected Project or Goal relation when such a target exists.
19. Select Resource + Resource Link and confirm it is marked prepared without creating a Resource relation.

## R1.6.7 Resource Draft

- Inbox Resource Draft writes a real `resources` row only after `Resource erstellen`.
- The draft stores title, existing resource type enum, summary/content, optional URL, `review_needed`, and source provenance in the existing `source` column.
- The source Inbox item is soft-archived after successful Resource creation; no hard delete and no Task is created.
- `/resources` reads real Manual resources from Supabase and keeps Demo fixtures only in the Demo profile.
- Resource Graph, direct Inbox FK, and Resource relations remain future scope.

## R1.6.8A Task / Calendar Workflow Lock

- Quick Thought erzeugt nur ein Inbox Item.
- Inbox Route + Draft erzeugt erst nach expliziter Aktion ein Zielobjekt.
- Inbox resolved muss nachvollziehbar sein: Route-Auswahl und Draft-Bearbeitung reichen nicht.
- Portfolio erstellt kontextabhaengig: Tasks View -> Task, Projects View -> Project, Goals View -> Goal, All View -> Typwahl.
- Today plant den Tag und setzt oder nutzt `plannedDate`.
- Calendar terminiert Zeitbloecke und zeigt Tasks erst mit `scheduledStartAt` als Time Block.
- Planning Signals sind keine Terminierung; Priority, Energy, Duration, Area, Review Needed, Today Candidate, Deadline Hint und Recurrence Hint bleiben bis Confirm nur Hinweise.
- AI darf Route, Felder, Ziele und Calendar Slots vorschlagen, aber keine Zielobjekte erstellen, Inbox Items resolven oder Calendar Blocks setzen ohne User-Bestaetigung.

## R1.6.8B Inbox Resolve Semantics

- Route waehlen resolved kein Inbox Item.
- Draft bearbeiten resolved kein Inbox Item.
- Confirm/Create/Link/Archive resolved verbundene Routen.
- Resource Create + Inbox Resolve laeuft ueber eine transaktionale lokale RPC und nutzt `resources.source = inbox:<inboxItemId>` als Idempotency-Marker.
- Resource Create darf keine Task erstellen und keinen Portfolio Task Link anzeigen.
- Bestehende lokale Half-State-Altlasten werden nicht breit automatisch bereinigt; der neue Pfad verhindert neue halbe Resource/Inbox-Zustaende.

## R1.6.8C Calendar Planner Queue

- Calendar Planner Queue zeigt Manual-Tasks mit `plannedDate` und ohne `scheduledStartAt`.
- Tasks ohne `plannedDate` bleiben aus Calendar Grid und Planner Queue heraus.
- `Terminieren` in der Queue schreibt nach User-Confirm `scheduledStartAt` und `durationMinutes`; danach verschwindet der Task aus der Queue und erscheint im Time Grid.
- Reload muss Queue/Grid stabil halten; Today und Dashboard muessen denselben geplanten oder terminierten Task weiter anzeigen.
- Empty State der Queue: `Keine geplanten Tasks ohne Uhrzeit.`
- Manual ohne gueltige Supabase-Session zeigt weiter den bestehenden Auth-/DB-Hinweis und darf nicht auf Demo-Tasks zurueckfallen.

## R1.6.8D Today Planner

- Candidate Tasks sind offene Tasks mit Planning Signals, aber noch ohne heutiges `plannedDate`.
- `Heute planen` im Today Planner setzt `plannedDate` fuer den lokalen Tag und setzt kein `scheduledStartAt`.
- Today Agenda zeigt geplante heutige Tasks.
- Dashboard Today Agenda bleibt nach `Heute planen` konsistent.
- Calendar Planner Queue zeigt geplante Tasks ohne Uhrzeit.
- Calendar Time Grid zeigt Tasks erst mit `scheduledStartAt`.
- Empty State: `Keine offenen Kandidaten für heute.`

## R1.6.9 Task Lifecycle

- Task abschließen setzt `completed_at` und `status = done`.
- Task wieder öffnen entfernt `completed_at` und macht die Task wieder aktiv planbar.
- Task entterminieren entfernt `scheduled_start_at`; `planned_date` bleibt erhalten.
- Task umplanen aktualisiert `planned_date`, `scheduled_start_at` und Dauer.
- Task archivieren setzt `archived_at` und entfernt sie aus aktiven Portfolio-/Today-/Dashboard-/Calendar-Views.
- Portfolio Context Panel zeigt nur passende Lifecycle-Aktionen je Task-Zustand.
- Today Activity Stream kann sichtbare Tasks abschließen und completed Tasks wieder öffnen.
- Dashboard Daily Control kann den aktuellen Manual-Task abschließen, ohne Dashboard-Rekomposition.
- Calendar Inspector persistiert Mark done, Move later/Reschedule und Unschedule für task-backed Time Blocks.
- Completed Tasks dürfen nicht mehr in Today Planner Candidate oder Calendar Planner Queue erscheinen.
- Unscheduled Tasks verschwinden aus dem Calendar Time Grid und erscheinen wieder in der Planner Queue, wenn `plannedDate` vorhanden ist.
- Portfolio / Today / Dashboard / Calendar nach jeder Lifecycle-Aktion reload-stabil prüfen.

## R1.6.9B Lifecycle Verification

- `PLAYWRIGHT_HOST=127.0.0.1` mit dem bestehenden Auth-State zeigte, dass der alte Auth-State abgelaufen war.
- Fuer `localhost` wurde ein neuer lokaler Playwright Supabase Auth-State erzeugt; `.local/` bleibt unversioniert.
- Known host workaround: `PLAYWRIGHT_HOST=localhost` mit einem localhost-scoped Auth-State verwenden, wenn die Cookie-Domain nicht zu `127.0.0.1` passt.
- Lifecycle-spezifischer Browser-Proof ist gruen: complete/reopen, unschedule/reschedule, archive.
- Portfolio Context Actions werden per fokussiertem Button aktiviert; der rechte Portfolio-Rail muss scrollbar bleiben, damit Lifecycle Controls erreichbar sind.
- Calendar Timed Blocks muessen ueber Free-Slot-Hit-Targets liegen, damit task-backed Blocks fuer Inspector-Aktionen waehlbar sind.
- Portfolio / Today / Dashboard / Calendar consistency wurde fuer die Lifecycle-spezifischen DB-Flows im Browser geprueft.
- Der breite Legacy-Grep mit `Manual` erreicht jetzt echte DB-Tests, kann aber durch nicht-lifecycle Resource/Inbox-Serial-State stoppen; R1.6.9B bewertet die Lifecycle-spezifischen Tests separat.

## R1.7.0 Portfolio Contextual Create

- Portfolio Create ist view-gebunden: `tasks` zeigt Task Create, `projects` zeigt Project Create, `goals` zeigt Goal Create, `skills` zeigt nur Future Scope, `all` zeigt die bewusste Auswahl Task/Project/Goal.
- Task Create schreibt ueber die bestehende Supabase Task Repository Boundary und nutzt den authentifizierten User/Profile Scope vom Server.
- Project und Goal Create verwenden weiter die bestehenden Portfolio Actions und behalten im All View den Ruecksprung nach `view=all`.
- Skill Create bleibt ohne Persistenz deaktiviert; es wird kein Fake-Skill und kein Skill-DB-Modell erzeugt.
- Manual mit gueltiger lokaler Supabase-Session persistiert Task, Project und Goal reload-stabil.
- Demo und Empty bleiben Profil-States; echte Create-Actions bleiben an Manual/Auth gebunden.
- Add to Existing sieht im Inbox Target Picker die neu erstellten Project- und Goal-Ziele als reale DB-Targets.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.
- Focused Browser Command:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Portfolio|Contextual Create|Task erstellen|Project erstellen|Goal erstellen|Add to Existing|Manual"`
- Der breite Grep wurde gestartet und erreicht wegen `Manual` auch Legacy-Inbox/Resource-Tests; er stoppt vor dem Portfolio-Block am bestehenden Resource-Draft-Serial-State.
- R1.7.0-spezifischer Portfolio-Grep ist gruen: Contextual Create, Task erstellen, Project erstellen, Goal erstellen, Add to Existing Project und Add to Existing Goal.

## R1.7.1 Project Workbench v1

- Portfolio Project View oeffnet die Project Workbench im bestehenden Portfolio Context Panel; keine neue Project-Detailroute wurde eingefuehrt.
- Project Overview zeigt Titel, Beschreibung/Summary, Status, Progress, Area und Task Counts.
- Linked Tasks werden aus vorhandenen Portfolio Task Entities ueber `projectId` abgeleitet.
- Task fuer Project erstellen nutzt den bestehenden Portfolio Task Create Pfad, setzt `projectId` automatisch und prueft das Project serverseitig im User-Scope.
- Bestehende Task Lifecycle Controls bleiben fuer Linked Tasks sichtbar und werden nicht neu modelliert.
- Milestones, Resources und Project Log sind als vorbereitet markiert; keine Fake-Milestones, keine Fake-Resources und keine Log-Persistenz.
- Task-Fortschritt ist nur abgeleitet: completed linked tasks / total linked tasks; kein DB-Write.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.
- Focused Browser Command:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Portfolio|Project Workbench|Project erstellen|Linked Tasks|Manual"`
- Ergebnis im aktuellen lokalen Auth-State: 23 passed, 28 skipped. Project Workbench sichtbar/no-fake ist gruen; DB-Persistenz- und Lifecycle-Proofs skippen, weil die lokale Manual-Supabase-Session nicht aktiv verfuegbar ist.

## R1.7.2 Goal Workbench v1

- Portfolio Goal View oeffnet die Goal Workbench im bestehenden Portfolio Context Panel; keine neue Goal-Detailroute wurde eingefuehrt.
- Goal Overview zeigt Titel, Beschreibung/Summary, Status, Progress, Area, Project Counts und Task Counts.
- Linked Projects werden aus vorhandenen Portfolio Project Entities ueber `goalId` abgeleitet.
- Linked Tasks werden aus vorhandenen Portfolio Task Entities ueber `goalId` abgeleitet.
- Task fuer Goal erstellen nutzt den bestehenden Portfolio Task Create Pfad, setzt `goalId` automatisch und prueft das Goal serverseitig im User-Scope.
- Project fuer Goal erstellen nutzt den bestehenden Portfolio Project Create Pfad, setzt `goalId` automatisch und prueft das Goal serverseitig im User-Scope.
- Bestehende Task Lifecycle Controls bleiben fuer Linked Tasks sichtbar und werden nicht neu modelliert.
- Milestones, Review Cadence, Resources und Goal Log sind als vorbereitet markiert; keine Fake-Milestones, keine Fake-Key-Results, keine Fake-Resources und keine Log-Persistenz.
- Task-Fortschritt ist nur abgeleitet: completed linked tasks / total linked tasks; kein DB-Write.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.
- Focused Browser Command:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Portfolio|Goal Workbench|Goal erstellen|Linked Tasks|Linked Projects|Manual"`

## R1.7.2B Project/Goal Workbench Consistency

- Project Workbench und Goal Workbench folgen derselben Reihenfolge: Overview, Metrics/Progress, Create in Context, Linked Work, Prepared Sections und Future Scope Hinweis.
- Create Forms nutzen dieselbe Task-Form-Logik; Workbench-Buttons heissen `Task erstellen` und `Project erstellen`.
- Linked Tasks zeigen konsistent Titel, Status, Priority, Energy, Duration sowie geplante oder terminierte Zeit, falls vorhanden.
- Goal Linked Projects bleiben kompakt und zeigen nur echte verknuepfte Projects aus `goalId`; keine Fake-Projekte.
- Progress-Sprache ist abgeleitet: Project nutzt Task-Fortschritt, Goal nutzt Linked Work Progress. Ohne Linked Work steht `Noch kein Fortschritt berechnet`.
- Prepared Sections bleiben textgestuetzt und markieren Milestones, Review Cadence, Resources und Logs nur als `Vorbereitet`; keine Fake-Milestones, keine Fake-Resources und keine Log-Persistenz.
- Empty States unterscheiden klar `Keine verknüpften Tasks.` und `Keine verknüpften Projects.`.
- Context Panel Scroll wurde fokussiert geprueft: Create Controls und untere Prepared Sections bleiben erreichbar.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.

## R1.7.3B Resource Relations UI Binding

- Resource Inspector liest echte Resource Relations aus `resource_relations`, wenn Manual Auth verfuegbar ist.
- Target Labels werden fuer Project, Goal, Task und Resource aufgeloest; UUIDs duerfen nicht als primaere Labels erscheinen.
- Fehlende Targets zeigen `Nicht mehr verfügbar`.
- Relation Create ist im Resource Inspector als kompakter Manual-Flow angebunden und nutzt serverseitige Auth plus `ResourceRepository.linkResource`.
- Project Workbench und Goal Workbench zeigen echte verknuepfte Resources oder `Keine verknüpften Resources.`.
- Demo bleibt Fixture; Empty und Manual ohne Daten zeigen keine Fake Relations.
- Keine Graph-Library, Node Map, AI-Linking-Automation, Embeddings, Migration, Remote-DB oder RLS-/Policy-Aenderung eingefuehrt.
- Fokussierter lokaler Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resources|Resource Relations|Project Workbench|Goal Workbench|Portfolio|Manual"`
- Ergebnis: 29 passed, 31 skipped. Resource Relations Strukturtests, Project Workbench Resources Empty State und Goal Workbench Resources Empty State sind gruen; breite DB-Persistenztests bleiben auth-/cleanup-gated und skippen.

## R1.7.3C Resource Relations Real Browser Proof

- Lokaler `localhost` Playwright Supabase Auth-State ist vorhanden; Cookie-Domain ist `localhost`.
- Resource Relation DB Proofs nutzen denselben Manual/Auth-Gate wie fruehere Manual-DB-Browsertests.
- Resource -> Project Relation Create, Reload, Resource Inspector, Project Workbench Resources und Duplicate Handling sind als fokussierter Browser-Pfad abgedeckt, wurden im aktuellen Lauf aber geskippt.
- Resource -> Goal Relation Create, Reload, Resource Inspector und Goal Workbench Resources sind als fokussierter Browser-Pfad abgedeckt, wurden im aktuellen Lauf aber geskippt.
- Skip-Grund: Manual Supabase auth state unavailable; Resource relation DB proof skipped.
- Im Browser ist die Manual Quick Capture trotz geladener Auth-State-Datei deaktiviert; damit steht keine aktive lokale Manual-DB-Session fuer Relation-Create-Proofs zur Verfuegung.
- Fokussierter lokaler Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resource Relations|Resource.*Project|Resource.*Goal|Manual"`
- Ergebnis: 20 passed, 33 skipped. Resource Relations Inspector-Struktur, No-Fake-Relations und Manual/Empty-State-Guards sind gruen; Resource -> Project und Resource -> Goal DB-Proofs skippen sauber am Manual-DB-Gate.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.

## R1.7.3D Manual DB Browser Session Repair

- Root Cause des Manual-DB-Gates: `.local/playwright/supabase-auth-state-localhost.json` war host-richtig, aber das gespeicherte Supabase JWT war abgelaufen.
- Auth-State-Datei: `.local/playwright/supabase-auth-state-localhost.json`; Cookie-Domain: `localhost`; Host: `localhost:3000`.
- Lokale Session-Recovery wurde ueber den vorhandenen Refresh Token gegen die lokale Supabase-URL aus `.env.local` ausgefuehrt; Tokens wurden nicht ausgegeben und `.local/` bleibt unversioniert.
- Auth Smoke Proof: Manual Quick Capture ist nach Refresh wieder aktiv; Manual-DB-Tests laufen statt am Auth-Gate zu skippen.
- Test-Harness wurde fuer persistente lokale DB-Dichte stabilisiert: neue Inbox-Captures werden nach Reload als Active Item geprueft, breite Textzaehlungen wurden auf Headings/Formfelder begrenzt, und Resource-/Task-Auswahl nutzt stabile Hrefs oder Feldnamen.
- Resource -> Project Relation Create Proof ist gruen inklusive Resource Inspector, Reload, Duplicate Handling und Project Workbench Resources.
- Resource -> Goal Relation Create Proof ist gruen inklusive Resource Inspector, Reload und Goal Workbench Resources.
- Fokussierter Resource-Proof:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resource.*Project|Resource.*Goal|Resource Relations"`
- Ergebnis: 3 passed.
- Breiter Manual/Auth-Grep erreicht echte DB-Flows, stoppt aber weiterhin ausserhalb des Resource-Relation-Scopes an `Manual Today Planner plans DB task into Today, Dashboard and Calendar queue`: 21 passed, 2 skipped, dann ist ein geplantes Test-Task bei gefuellter lokaler DB nicht in der sichtbaren Dashboard Today Agenda.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.

## R1.7.3E Daily Core Manual DB Visibility Repair

- Root Cause des Daily-Core-Visibility-Fehlers: Dashboard Today Agenda, Today Planner und Calendar Planner Queue schnitten ihre sichtbaren Listen bei gefuellter lokaler DB, bevor frisch geplante oder terminierte Manual-Tasks sicher in der sichtbaren Auswahl landeten.
- Dashboard Today Agenda nutzt fuer Manual-DB-Projektionen jetzt eine eigene Agenda-Relevanz: aktive Tasks zuerst, dann frisch aktualisierte/geplante Tasks, danach Priority und Zeitlogik. Daily Control bleibt unveraendert.
- Today Planner nutzt bei gleichen Planning-Signalen frischere Kandidaten zuerst, damit neu erzeugte Manual-Kandidaten nicht hinter alten lokalen Testdaten verschwinden.
- Calendar Planner Queue sortiert pro Datum frisch aktualisierte Tasks vor aelteren Kandidaten; Calendar-Tests pruefen nicht mehr auf eine leere lokale Week Grid DB.
- Calendar Scheduling Proof wurde gegen Revalidation und dichte Time-Grid-Ueberlappung stabilisiert: nach Terminierung wird reload-stabil der interaktive Calendar-Block geprueft.
- Goal-Workbench-Regression im breiten Manual-Grep wurde harnessseitig stabilisiert, indem nach Project-Create das urspruengliche Goal erneut geoeffnet wird, bevor der Linked-Project-Eintrag im Context Panel geprueft wird.
- Fokussierter Daily-Core-Test:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Today Planner plans DB task into Today, Dashboard and Calendar queue"`
- Ergebnis: 1 passed.
- Breiter Manual/Auth-Grep:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Today|Dashboard|Calendar|Resource Relations"`
- Ergebnis: 58 passed, 2 skipped.
- Resource Relation Browser Proofs bleiben im breiten Lauf gruen.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.

## R1.7.4 Calendar Drag/Resize Design Lock

- Calendar Drag/Resize ist als Design Lock dokumentiert; Pointer-Drag und echte Resize-Handles bleiben bewusst ausserhalb von R1.7.4.
- Interaction v1 nutzt bestehende Task-Server-Actions fuer persistente 15-Minuten-Steuerung terminierter Manual-Tasks.
- Calendar Inspector bietet fuer scheduled Manual-Tasks `15 min frueher`, `15 min spaeter`, `Dauer -15 min` und `Dauer +15 min`.
- Das Conflict-Gate prueft nur geladene sichtbare scheduled Task Blocks im Calendar ViewModel; es ist keine DB-weite Sperre.
- Bei sichtbarem Konflikt bleibt der normale Save deaktiviert und ein expliziter `Trotz Konflikt speichern` Override wird angeboten.
- Unschedule, Complete und bestehende Calendar Queue Scheduling-Pfade bleiben auf den vorhandenen Task-Actions.
- Fokussierter Calendar-Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Calendar|Calendar content states"`
- Ergebnis: 5 passed.
- Breiter Manual/Calendar/Today/Dashboard/Resource-Relations-Grep:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Calendar|Today|Dashboard|Resource Relations"`
- Ergebnis: 39 passed, 22 skipped. Die fokussierten Calendar-Interaction-Proofs sind im eigenen Lauf gruen; breite Serial-DB-Flows bleiben durch lokalen Manual-DB/Auth-State und vorhandene Daten-Dichte skip-gated.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB-Aktion und kein Service-Role-Zugriff.

## R1.7.5 Recurring Task / Routine Model Lock

- Task vs Recurring Task vs Routine vs Habit wurde auditiert und getrennt.
- Generate-vs-Reference Entscheidung ist dokumentiert: Recurring Tasks werden als Template + generated Task Instances modelliert.
- Daily Core Auswirkungen sind dokumentiert: Today und Dashboard zeigen konkrete Instanzen, keine Templates.
- Calendar Auswirkungen sind dokumentiert: Nur generated instances mit `scheduledStartAt` werden Time Blocks; geplante Instanzen ohne Uhrzeit bleiben Queue-Objekte.
- Review Auswirkungen sind dokumentiert: Completion, Skip, Missed und Carry Forward beziehen sich auf Instanzen oder Daily-Log-Bezuege, nicht auf Templates.
- Migration Gate ist dokumentiert; R1.7.5 baut keine Migration.
- Keine Implementierung, keine Source-Types, keine Generation Engine, keine Remote-DB-Aktion, keine RLS-/Policy-Aenderung und kein Service-Role-Zugriff in diesem Block.

## R1.7.5B Recurring Task Schema / Local Migration

- Lokale Migration erstellt und angewendet: `recurring_task_templates`.
- `tasks` um `generated_from_template_id` und `instance_date` erweitert.
- Idempotenz ist ueber `user_id + generated_from_template_id + instance_date` abgesichert; completed oder archivierte Instanzen werden dadurch nicht still neu erzeugt.
- `recurring_task_templates` nutzt `user_id`, RLS, authenticated Grants und das bestehende `updated_at`-Trigger-Pattern.
- Typegen wurde lokal aktualisiert; Row Types, Table Names und ein vorbereitetes Zod-Input-Schema wurden ergaenzt.
- Keine Generation Engine, keine UI, keine Actions, keine Repository-Implementation, keine Background Jobs, keine Cron Jobs.
- Keine Remote-DB, kein `supabase link`, kein `supabase db push`, kein Service-Role-Zugriff.
- Kein Playwright-Lauf erforderlich, weil dieser Block keine UI oder Actions aendert.

## R1.7.5C Recurring Template Repository + Actions

- Repository Contract fuer Recurring Task Templates ergaenzt.
- Supabase Repository implementiert: alle Templates lesen, aktive Templates lesen, erstellen, aktualisieren und deaktivieren.
- Mapper fuer `recurring_task_templates` Row <-> Domain ergaenzt.
- Same-user Ownership fuer `areaId`, `projectId` und `goalId` wird vor Create/Update geprueft.
- Server Actions fuer Create, Update und Deactivate vorbereitet; `userId` kommt serverseitig aus Supabase Auth, nicht vom Client.
- Zod validiert Template-Input inklusive Title, Duration Range, Recurrence Object, Dates, Timezone und optionaler UUID-Kontexte.
- Keine Generation Engine, keine UI, keine Migration, keine Auto-Generation, keine Background Jobs, keine Cron Jobs.
- Keine Remote-DB, kein `supabase link`, kein `supabase db push`, kein Service-Role-Zugriff.
- Kein Playwright-Lauf erforderlich, weil dieser Block keine UI aendert.

## R1.7.5D Recurring Task Instance Generation

- RecurrenceRuleV1 definiert: `daily` und `weekly` mit optionalem `interval`, `weekly.byWeekday` nutzt ISO-Wochentage 1 bis 7.
- Explizite Generation fuer ein Datum oder einen Zeitraum bis maximal 31 Tage ergaenzt.
- Nur aktive Templates innerhalb `startsOn`/`endsOn` werden bewertet.
- Generated Task Instances setzen `generated_from_template_id`, `instance_date` und `planned_date = instance_date`.
- `scheduled_start_at` wird nicht automatisch gesetzt; Calendar Scheduling bleibt ein bewusster spaeterer Schritt.
- Idempotenz gibt bestehende Instanzen zurueck und erzeugt keine Duplikate.
- Unsupported Rules werden als `unsupported_recurrence_rule` uebersprungen, nicht still interpretiert.
- Keine UI, keine Migration, keine Background Jobs, keine Cron Jobs, keine automatische Today-/Calendar-/Dashboard-Integration.
- Kein Playwright-Lauf erforderlich, weil dieser Block keine UI aendert.

## R1.7.5E Recurring Task Today/Calendar Integration

- Manual Today zeigt einen expliziten Trigger: `Wiederkehrende Aufgaben fuer heute erzeugen`.
- Der Trigger ist nur fuer Manual mit aktiver lokaler Supabase Session sichtbar.
- Ein kompakter Manual-QA-Pfad kann eine `Wiederkehrende Vorlage` erstellen; es gibt keinen Template-Listenmanager, keine Edit-UI und keine Routine UI.
- Generated Task Instances erscheinen wie normale geplante Tasks in Today.
- Generated Task Instances erscheinen in Dashboard Today Agenda / Daily Core.
- Generated Task Instances erscheinen in Calendar Planner Queue, solange `scheduled_start_at` leer bleibt.
- Generated Task Instances werden dezent als `Wiederkehrend` markiert.
- Idempotenz ist im Browser-Proof abgedeckt: erneutes Generate erzeugt keine Duplikate und meldet `Keine neuen wiederkehrenden Aufgaben faellig.`
- Weekly Rule Proof nutzt ISO-Wochentage: heutiger Wochentag erzeugt, anderer Wochentag erzeugt nicht.
- Lokaler Playwright Auth-State wurde fuer den Browser-Proof gegen die lokale Supabase Auth Runtime refreshed; `.local/` bleibt unversioniert.
- Fokussierter Recurring-Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Recurring"`
- Ergebnis: 2 passed.
- Breiter Manual/Today/Dashboard/Calendar-Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Recurring|Manual|Today|Dashboard|Calendar"`
- Ergebnis: 60 passed, 2 skipped.
- Keine Background Jobs, keine Cron Jobs und keine automatische Page-Load-Generation.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB und kein Service-Role-Zugriff.

## R1.7.6 Nutrition Recipe / Meal Data Model Lock

- Nutrition Ist-Zustand auditiert: Overview, Meal Planner, Recipes und Grocery laufen ueber ViewModels, Mockdaten und lokalen Client-State.
- Recipe vs Meal vs Meal Plan vs Nutrition Log getrennt.
- MVP-Entscheidung dokumentiert: `recipes + meals`.
- Nicht im MVP: Ingredients, Recipe Ingredients, Nutrition Entries, Macro Targets, Grocery Lists und Meal Plan Templates.
- Migration Gate dokumentiert; keine Migration in R1.7.6.
- Privacy/Security geprueft: Nutrition-Persistenz ist `health_sensitive`, braucht `user_id`, RLS, serverseitige Zod-Validierung, keine Service Role und keine externen APIs.
- Keine UI-, Source-Code- oder Migration-Aenderung in diesem Block.
- Kein Playwright-Lauf erforderlich, weil nur Product-/QA-Dokumentation geaendert wurde.

## R1.7.6B Nutrition Recipe / Meal Schema Migration

- Lokale Supabase-Migration fuer `recipes` und `meals` erstellt und lokal angewendet.
- `recipes` enthaelt `user_id`, optionale `area_id`, Titel, Summary, Instructions, Servings, Prep Minutes, Tags, optionale `nutrition_estimate`, Source, `is_archived`, `created_at` und `updated_at`.
- `meals` enthaelt `user_id`, optionale `recipe_id`, user-lokales `date`, kontrollierten `meal_type`, Titel, optionale Plan-/Completion-Zeitpunkte, Notes, `created_at` und `updated_at`.
- RLS fuer beide Tabellen aktiviert; Policies nutzen `to authenticated` plus `(select auth.uid()) = user_id`.
- Authenticated Grants fuer Select, Insert, Update und Delete gesetzt.
- `public.set_updated_at()` Trigger fuer beide Tabellen gesetzt.
- Typegen aktualisiert; Row Types und zentrale Table Names fuer `recipes` und `meals` ergaenzt.
- Zod-Schemas vorbereitet: Recipe Create/Update und Meal Create/Update ohne clientseitige `userId`.
- Keine UI, keine Repository-Implementation, keine Server Actions, keine externe Nutrition API, kein Remote-DB-Zugriff.
- Kein Playwright-Lauf erforderlich, weil dieser Block nur Schema/Data-Foundation und Docs aendert.

## R1.7.6C Nutrition Repository + Actions

- Nutrition Domain Types fuer Recipe und Meal ergaenzt.
- Recipe/Meal Mapper ergaenzt: snake_case zu camelCase, sichere Tags, optionales Nutrition Estimate und Meal-Type-Guard.
- Nutrition Repository Contract ergaenzt.
- Supabase Nutrition Repository implementiert: Recipes lesen, aktive Recipes lesen, Meals im maximal 31-Tage-Date-Range lesen, Recipe erstellen/aktualisieren/archivieren, Meal erstellen/aktualisieren/abschliessen.
- Same-user Ownership wird vor Writes geprueft: `areaId` muss eigene aktive Area sein; `recipeId` muss eigenes nicht archiviertes Recipe sein.
- Server Actions fuer Recipe/Meal CRUD-lite ergaenzt; `userId` kommt serverseitig aus Supabase Auth, nicht vom Client.
- Actions revalidieren `/nutrition`, `/dashboard` und `/today`; diese Revalidation ist vorbereitet, auch wenn UI-ReadModels noch nicht auf echte Nutrition-Daten umgestellt sind.
- Keine UI, keine Migration, keine Repository-UI-Anbindung, keine externe Nutrition API, keine Barcode-/Grocery-/Ingredient-Logik.
- Kein Playwright-Lauf erforderlich, weil dieser Block keine UI aendert.

## Inbox Routing Completion / Daily Flow Repair

- Nutrition-Follow-up bleibt pausiert, bis der Inbox Completion Gate gruen ist.
- Completion Gate: P0/Daily Flow ist erst feature-complete, wenn Inbox UI funktioniert, real persistiert, nach Reload stabil bleibt und der Browser-Proof gruen ist.
- Outcome Routes: Standalone Task, Knowledge Resource und Solved / Archive bleiben verbunden; Add to Existing und Create New sind teilweise verbunden.
- Create New persistiert Project und Goal aus dem Inbox-Draft und archiviert danach den Inbox-Eintrag.
- Resource bleibt ueber die eigene Knowledge-Resource-Route verbunden; Skill bleibt Future Scope.
- Planning Signals bleiben im Task-Draft editierbar und werden nur gespeichert, wenn die Ziel-Action sie unterstuetzt.
- Inbox Queue Items sind direkt auswaehlbar; der aktive Eintrag ist ueber `/inbox?item=...` reload-stabil.
- Lokaler Playwright Auth-State wurde ueber den vorhandenen Refresh Token gegen die lokale Supabase Auth Runtime erneuert; `.local/` bleibt unversioniert.
- Fokussierter Inbox/Daily-Flow-Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Inbox|Manual|Standalone Task|Create New|Solved|Archive|Planning Signals"`
- Ergebnis: 64 passed, 2 skipped. Die Skips sind datenabhaengige Empty-State-Gates bei gefuellter lokaler Manual-DB.
- Regression Manual/Today/Dashboard/Calendar/Portfolio:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Today|Dashboard|Calendar|Portfolio"`
- Ergebnis: 68 passed, 2 skipped.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB und kein Service-Role-Zugriff.

## R1.7.6D Nutrition UI Binding / Manual Browser Proof

- Nutrition Overview liest Manual Recipes und Meals aus Supabase ueber das bestehende Nutrition Repository.
- Recipes zeigt echte Manual Recipes und erstellt neue Recipes ueber die bestehende Server Action.
- Nutrition Overview erstellt Manual Meals ueber die bestehende Server Action; optionale Recipe-Verknuepfung bleibt user-scoped.
- Offene Meals erscheinen im Next-Meal-Panel; weitere offene Meals werden kompakt in derselben Card sichtbar.
- Meal Complete nutzt die bestehende Server Action und ist nach Reload in Recent Meals sichtbar.
- Meal Planner projiziert recipe-linked Manual Meals in die aktuelle Woche; Planner-Edit-Persistenz bleibt deferred.
- Demo und Empty bleiben ohne Manual-Fallback; Manual entfernt Nutrition-Demo-Copy wie `Paprika` und `3 missing ingredients`.
- Fokussierter Nutrition/Manual-Regression-Lauf:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Recipe|Meal|Manual"`
- Ergebnis: 58 passed, 2 skipped. Die Skips sind bestehende datenabhaengige Manual-DB/Empty-Gates.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB, keine Service Role, keine externe Nutrition API.

## R1.7.7 Skill Model & Skill Map Lock

- Skill Ist-Zustand auditiert: Portfolio, Coding Skill Map, Coding Overview, Education Learning Log, Resources und Profile-Data.
- Skill vs Project/Goal/Resource/Habit/Task getrennt.
- MVP-Modell entschieden: `skills + skill_evidence`.
- Skill Evidence Semantik dokumentiert: expliziter oder nachvollziehbarer Nachweis, keine automatische AI-Behauptung.
- Skill Practice und Skill Progress Semantik dokumentiert; Progress bleibt evidenzbasiert begrenzt.
- Skill Map Regeln dokumentiert: keine Graph-Library, keine Node Map, keine AI-generierten Kanten ohne Review.
- Migration Gate dokumentiert; R1.7.7 baut keine Migration.
- Keine UI-Implementierung, keine Source-Code-Aenderung, keine Remote-DB, keine RLS-/Policy-Aenderung und kein Service-Role-Zugriff.

## R1.7.7B Skill Schema Migration

- Lokale Supabase-Migration fuer `skills` und `skill_evidence` erstellt und lokal angewendet.
- `skills` enthaelt `user_id`, optionale `area_id`, Name, Summary, Category, Lifecycle-`status`, optionales `level`, `archived_at`, `created_at` und `updated_at`.
- `skill_evidence` enthaelt `user_id`, `skill_id`, kontrollierten `source_type`, polymorphes optionales `source_id`, Titel, Note, Evidence-Date, optionales Weight, `created_at` und `updated_at`.
- `source_type` ist auf `task`, `project`, `goal`, `resource` und `manual_note` begrenzt.
- `source_id` bleibt bewusst polymorph ohne DB-FKs; same-user Ownership fuer Zielobjekte muss spaeter in Repository/Actions geprueft werden.
- RLS fuer beide Tabellen aktiviert; Policies nutzen `to authenticated` plus `(select auth.uid()) = user_id`.
- Authenticated Grants fuer Select, Insert, Update und Delete gesetzt.
- `public.set_updated_at()` Trigger fuer beide Tabellen gesetzt.
- Typegen aktualisiert; Row Types und zentrale Table Names fuer `skills` und `skill_evidence` ergaenzt.
- Zod-Schemas vorbereitet: Skill Create/Update und Skill Evidence Create/Update ohne clientseitige `userId`.
- Keine UI, keine Repository-Implementation, keine Server Actions, keine Skill Map, keine Graph-Library, keine AI Skill Inference und keine automatische Evidence-Erzeugung.
- Kein Playwright-Lauf erforderlich, weil dieser Block nur Schema/Data-Foundation und Docs aendert.

## Known Boundaries

- Browser auth is email/password only.
- Sign-up may require local Supabase email confirmation depending on Auth config.
- Project, Goal, Resource, Daily Log, complete/edit/archive flows are out of R1.6.5 scope.
- Session reset clears Supabase auth cookies only; it does not change database rows, RLS, policies, or migrations.
