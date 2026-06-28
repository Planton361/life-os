# MVP Core Status

Stand: 2026-06-28
Status: R1.8.4 MVP Core Release Readiness
Zweck: Konsolidierter MVP-Core-Status nach R1.8.4 Release Readiness und Roadmap Reconciliation.
Quelle der Wahrheit: `PRODUCT.md`, `ROADMAP.md`, `docs/product/*` Locks, `docs/product/mvp-core-release-readiness.md` und `docs/qa/r1-6-5-real-browser-auth-check.md`.

## 1. Abgeschlossene Bloecke

- Daily Core: Dashboard Quick Thought, Inbox, Today, Calendar Queue/Blocks und Portfolio Task Lifecycle sind verbunden.
- Inbox Routing: Standalone Task, Add to Existing Task-Beitrag fuer Project/Goal, Create New Project/Goal, Resource Draft und Solved/Archive sind bestaetigungsgebunden.
- Portfolio: Tasks, Projects, Goals und Skills haben echte Manual-DB-Pfade fuer die freigegebenen CRUD-/Lifecycle-Slices.
- Resources: Resource Create und Resource Relations zu Project/Goal sind real angebunden; UUID-Labels werden in Workbenches vermieden.
- Recurring: Templates, explizite Generierung und Today/Dashboard/Calendar-Queue-Projektion sind vorhanden; keine automatische Background-Generation.
- Nutrition: Recipes und Meals sind als Manual-DB-Flow angebunden; Planner-Edit, Grocery und tiefe Nutrition-Features bleiben begrenzt.
- Skills: Skills und Evidence sind real angebunden inklusive Edit, Archive, Delete und Project/Resource Source Linking.
- AI Inbox Suggestions: lokale deterministische Vorschlaege fuellen Drafts, persistieren aber nichts ohne User-Confirm.

## 2. Browserbewiesene Flows

- Core-Grep: `Manual|Inbox|Today|Dashboard|Calendar|Portfolio` mit 86 passed, 2 skipped.
- Extensions-Grep: `Resources|Nutrition|Skill|AI|Recurring` mit 25 passed.
- Bewiesen sind Quick Capture, Inbox Resolve, AI Suggestion Review, Task/Resource/Create-New Confirm, Today Planning, Calendar Scheduling/Unschedule/Conflict-Gate, Portfolio Lifecycle, Resource Relations, Recurring Generation, Nutrition Meal Completion und Skill Evidence Source Linking.
- R1.8.3 ergaenzt Accessibility-/Hardening-Assertions fuer Inbox Task-Draft Labels, Calendar Previous/Next Week Accessible Names und AI No-Persistence Copy.

## 3. Teilweise bewiesene Flows

- Create New Project/Goal aus Inbox beweist Browser-seitig Resolve und wurde lokal gegen DB-Write verifiziert; die Portfolio-Defaultliste ist bei stark gefuellter Manual-DB kein stabiler unmittelbarer Selector.
- AI Resource Suggestion beweist Draft-Uebernahme, Confirm und Resolve; der lokale Resource-Write wurde gegen die DB verifiziert, waehrend die Resource-Library bei vielen Testdaten nicht als globaler Text-Selector stabil ist.
- Nutrition Planner zeigt recipe-linked Meals; Planner-Edit-Persistenz bleibt deferred.
- Calendar Drag/Resize bleibt Interaction-v1/Keyboard-Fallback, kein Pointer-Drag.

## 4. Bekannte Skips

- Core-Grep: 2 datenabhaengige Manual-Empty-Gates bei gefuellter lokaler Manual-DB.
- Keine Environment-Bind- oder Auth-State-Skips im R1.8.1-Lauf.
- Skips sind kein App-Failure fuer die bewiesenen Manual-DB-Flows.

## 4.1 R1.8.2 Proof Stability

- Manual-DB-Hygieneregeln sind in `docs/qa/manual-db-test-data-hygiene.md` dokumentiert.
- Kritische Browser-Proofs verwenden eindeutige `uniqueTitle(prefix)`-Titel mit Zeitstempel und Zufallssuffix.
- Inbox-Proofs selektieren neue Captures ueber Queue Item und Active Item statt globale Textsuche.
- Portfolio-Proofs oeffnen erzeugte Entities ueber Entity-List-Link und pruefen `#selected-entity-heading`.
- Resource-Proofs oeffnen Resources ueber Library-Link und pruefen `#selected-resource-heading`.
- Nutrition- und Skill-Proofs verwenden scoped Assertions in der passenden Page bzw. im Context Panel.
- Keine DB-Reset-Pflicht, keine Cleanup-Aktion und keine Migration in R1.8.2.

## 4.2 R1.8.3 MVP Core Hardening

- Hardening Review dokumentiert in `docs/qa/mvp-core-hardening-review.md`.
- Accessibility Review der MVP-Hauptflows abgeschlossen: Inbox Routing/AI, Today Planner, Calendar Scheduling, Portfolio Workbenches, Resources, Nutrition und Recurring Trigger.
- Inbox async Feedback nutzt fuer Success `role="status"` und fuer Blocked/Error `role="alert"`.
- Portfolio Task Archive redirectet nach erfolgreicher Server Action zu einem sichtbaren `Task archiviert.` Status und entfernt den stale selected-task Zustand.
- Security/Privacy Review der neuen Actions bestaetigt serverseitige Supabase Auth, Zod-Validierung, Repository-/RPC-User-Scope, keine Service Role, keine Secrets und keine externe AI API.
- Prepared/Future UI bleibt begrenzt: Skill Map, Resource Graph, Recurring Automation, Nutrition Deep Features, AI Provider, Grocery/Ingredients, Calendar Pointer Drag und Routine UI behaupten keine nicht vorhandene Persistenz.
- R1.8.3 Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm exec supabase db lint --local --level warning`, Core-Grep und Extensions-Grep gruen.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB, kein Supabase Link/Push/Reset, keine Service Role, keine neue Library.

## 4.3 R1.8.4 MVP Core Release Readiness

- Release Readiness dokumentiert in `docs/product/mvp-core-release-readiness.md`.
- R1.8.3 ist abgeschlossen; MVP Core Hardening ist abgeschlossen.
- R1.8.4 Roadmap Reconciliation ist abgeschlossen: MVP Core ist lokal/manual-browser-ready, aber noch nicht production-release-ready.
- Completed: Daily Core, Inbox Routing Completion, Task Lifecycle, Project Workbench v1, Goal Workbench v1, Resource Relations v1, Calendar Scheduling Controls, Recurring Tasks v1, Nutrition Recipes/Meals v1, Skills/Evidence v1, AI Inbox Suggestions v1, Manual DB Proof Hygiene und MVP Core Hardening.
- Partially Complete: Calendar Pointer Drag/Resize, Recurring Template Management, Nutrition Deep Features, Skill Map/Graph, Resource Graph, External AI Provider, Full Accessibility Audit und finaler RLS Audit.
- Deferred: Automation, Export/Backup, Performance Review, Deployment Hardening, echte AI Provider Integration und Production Release Claim.
- Naechste empfohlene Phase: R1.9 Production Hardening mit RLS Audit, Export/Backup, Deployment Env Check, Performance und Accessibility Pass.
- R1.8.4 ist ein Produkt-/QA-/Roadmap-Block: keine neuen Features, keine UI-Rekomposition, keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB, keine Service Role, keine neue Library.

## 4.4 Status-Matrix

| Feature | Status | Browser Proof | Deferred |
| --- | --- | --- | --- |
| Daily Core | Complete for MVP Core | Core-Grep 86 passed, 2 skipped | Full Daily/Weekly Review |
| Inbox Routing Completion | Complete for MVP Core | Inbox/Manual Core-Grep | Notes/Decision/Skill route expansion |
| Task Lifecycle | Complete for MVP Core | Portfolio/Today/Dashboard/Calendar | Archive browser and undo |
| Project Workbench | Complete for v1 | Portfolio/Manual | Milestones, logs, reviews |
| Goal Workbench | Complete for v1 | Portfolio/Manual | Milestones, review cadence, reviews |
| Resource Relations | Complete for v1 | Resources/Portfolio | Full Resource Graph |
| Calendar Scheduling Controls | Complete for interaction v1 | Calendar Core-Grep | Pointer drag/resize |
| Recurring Tasks v1 | Complete for explicit generation | Extensions-Grep | Full template management, automation |
| Nutrition Recipes/Meals v1 | Complete for MVP slice | Extensions-Grep | Ingredients, Grocery, Macros |
| Skills/Evidence v1 | Complete for Portfolio slice | Extensions-Grep | Skill Map / Graph |
| AI Inbox Suggestions v1 | Complete as local mock | AI/Inbox proofs | External AI Provider |
| Manual DB Proof Hygiene | Complete | Stabilized selectors/proofs | Cleanup/retention policy |
| MVP Core Hardening | Complete | R1.8.3 validation green | Full production audit |

## 5. Prepared/Future Scope

- Project Workbench: Milestones und Project Log bleiben prepared.
- Goal Workbench: Milestones, Review Cadence und Goal Log bleiben prepared.
- Resource Graph / Skill Map Visualisierung bleibt Future Scope; keine Graph-Library und keine Node Map.
- Skill Map in Coding bleibt lokale/mock Workbench, nicht kanonische Skill-Graph-Persistenz.
- Recurring Automation bleibt Future Scope: keine Cron Jobs, Background Jobs oder automatische Page-Load-Generation.
- Nutrition Deep Features bleiben Future Scope: Ingredients, Grocery-Persistenz, Macro Targets, externe APIs und medizinische Empfehlungen.
- AI bleibt Vorschlags- und Review-Schicht: keine externe AI API, keine autonome Writes, keine Secrets.

## 6. Naechste empfohlene Phase

R1.8.x sollte den MVP-Core nicht verbreitern, sondern Datenhygiene und Bedienbarkeit stabilisieren:

- Manual-DB-Testdaten-Strategie klaeren, damit Listen-Proofs nicht von lokal akkumulierten Daten abhaengen.
- ReadModel-Sortierung/Selected-Redirects fuer frisch erzeugte Project/Goal/Resource-Zielobjekte bleiben ein moeglicher separater App-Selection-Scope.
- Remaining prepared sections nur in separaten, eng freigegebenen Slices anbinden.
- Keine neue Automation, Graph-Visualisierung oder externe AI vor stabilem manuellen Core-Betrieb.
