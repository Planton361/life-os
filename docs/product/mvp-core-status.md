# MVP Core Status

Stand: 2026-06-28
Status: R1.8.2 Manual DB Proof Stability
Zweck: Konsolidierter MVP-Core-Status nach R1.8.2 Manual DB Test Data Hygiene.
Quelle der Wahrheit: `PRODUCT.md`, `ROADMAP.md`, `docs/product/*` Locks und `docs/qa/r1-6-5-real-browser-auth-check.md`.

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
