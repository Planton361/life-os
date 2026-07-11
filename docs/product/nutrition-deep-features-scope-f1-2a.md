# F1.2A Nutrition Deep Features Scope Lock

Stand: 2026-07-11
Status: Completed scope / data-model / vertical-slice planning block
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/nutrition-recipe-meal-model-lock.md`,
`docs/product/project-goal-workbench-closure-f1-1g.md`,
`docs/product/final-product-completion-roadmap.md`,
`docs/product/final-surface-connected-claim-review-f0-1.md`,
`docs/qa/browser-proof-recovery-w1-1a.md` und aktueller Nutrition-Code.
Gilt fuer: F1.2 Nutrition Deep Features Scope, bestehende Connected Claims,
Datenmodellgrenzen, Slice-Reihenfolge und ersten ausfuehrbaren Folgeblock.
Nicht gilt fuer: Produktfeatures, UI-Aenderungen, `src`, Tests, Migrationen,
RLS-/Policy-Aenderungen, Remote-DB, Deployment oder Secrets.

Closure Update 2026-07-11:

- F1.2A–H sind abgeschlossen.
- F1.2I schließt den Block in
  `docs/product/nutrition-closure-f1-2i.md`.
- Finaler Claim: `Nutrition = local_connected_with_depth_gap`.
- Nächster Produktbereich: F1.3 Resource/Skill Graph Read Model.
- Die nachfolgenden Current-State-Abschnitte dokumentieren teilweise die
  historische F1.2A-Ausgangslage; der Closure-Stand hat Vorrang.

## 1. Zweck

F1.2A startet den Produktbereich:

```text
F1.2 - Nutrition Deep Features
```

Dieser Block prueft den Ist-Zustand, trennt die fachlichen Domains und
schneidet die naechsten Vertical Slices. Er baut keine Funktion.

Kernentscheidung:

```text
Bestehende Nutrition-UI und verbundene Recipe-/Meal-Flows bleiben Grundlage.
F1.2 baut nur fehlende funktionale Tiefe.
Keine Nutrition-Neuentwicklung von vorne.
```

## 2. Nicht-Ziele

- keine Nutrition-Seite neu bauen
- keine neue Designrichtung
- keine Layout-Rekomposition
- keine vorhandenen Recipe-/Meal-Flows ersetzen
- keine Ingredients implementieren
- keine Grocery-Funktion implementieren
- keine Macro-/Calorie-Engine implementieren
- keine Health Claims
- keine externe Food API
- keine AI Meal Suggestions
- keine Shopping-/Store-Integration
- keine Migration
- keine RLS-/Policy-/Grant-Aenderung
- keine Remote-DB-Aktion
- kein Deployment
- keine Secrets, `.env*`, `.local/**`, `private/**`, Backups oder Exports
  lesen oder dokumentieren

## 3. Ausgangslage

F1.1G hat Project/Goal Workbench Depth geschlossen und den naechsten
Produktbereich als Nutrition Deep Features festgelegt.

Aktuelle lokale Nutrition-Basis:

- `Nutrition = local_connected_with_depth_gap`.
- Recipe Create ist Supabase-backed im Manual-Profil verbunden.
- Meal Create ist Supabase-backed im Manual-Profil verbunden.
- Meal Complete ist Supabase-backed im Manual-Profil verbunden.
- Meal Planner Projection liest Manual Meals und Recipes.
- Manual/Demo/Empty-Trennung ist vorhanden.
- Aktuellster Proof aus W1.1A Extensions: `25 passed, 0 skipped, 0 failed`.

Nicht aktuell final verbunden:

- Recipe Entity Edit und Archive in der Manual UI wurden durch F1.2B am
  2026-07-11 verbunden.
- Recipe Detail Route als echte Tiefe.
- Ingredients als persistentes Datenmodell.
- Meal Planner Edit / Reschedule / Recipe-Wechsel.
- Grocery Generation aus echten Ingredients.
- Nutrition Metrics aus belastbarer Datenquelle.

## 4. Nutrition Current State

Routes und sichtbare Flaechen:

- `/nutrition`: Overview mit Today Nutrition, Next Meal, Meal Create, Recent
  Meals, Grocery Signal und kompakten Metrics.
- `/nutrition/meal-planner`: Wochenprojektion fuer Breakfast/Lunch/Dinner.
- `/nutrition/recipes`: Recipe Workbench mit Browser, Create Form und
  Selected Recipe Panel.
- `/nutrition/recipes/[recipeId]`: Detail-Stub, keine echte Recipe-Tiefe.
- `/nutrition/grocery`: Grocery Workbench.

Connected Flows:

- Manual Recipe Create ueber `createRecipeFormStateAction`.
- Manual Meal Create ueber `createMealFormStateAction`.
- Manual Meal Complete ueber `completeMealFormStateAction`.
- Active Recipes und 31-Tage-Meal-Range werden fuer Manual aus Supabase
  gelesen.
- Meal Planner projiziert Manual Meals in die aktuelle Woche, wenn sie ein
  aktives Recipe referenzieren.

Partial Flows:

- Recipe Update und Recipe Archive existieren als Server Actions und
  Repository-Methoden; F1.2B bindet sie in der Manual Recipes UI.
- Meal Update existiert als Server Action und Repository-Methode, hat aber
  keine sichtbare Edit-UI.
- Recipe instructions, servings, prep minutes, tags and rough nutrition
  estimate existieren im Datenmodell; Create UI bindet aktuell nur Title,
  Summary, Servings, Prep min, Tags und Source.
- Overview-Metrics koennen grobe Recipe-`nutrition_estimate`-Werte projizieren,
  aber keine echte Metrics Engine oder Zielprofile beweisen.

Prepared/Future Areas:

- Recipe Detail Route ist Stub.
- Recipe Editor Dialog mit Ingredients, Instructions, Macro Totals, Duplicate
  und Archive ist local-only und fuer Manual deaktiviert.
- Meal Planner Save/Reset/Add/Replace/Serving controls sind local-state oder
  disabled; Manual Planner Edit ist deferred.
- Grocery ist Demo/mock-driven; Manual und Empty werden ohne Fake-Demand
  geleert und actions disabled.
- Grocery Signal bleibt leer, wenn keine echten Ingredients existieren.
- Pantry, Must-have Items, Receipt Review und Store/Shopping Integration sind
  future.

Known Proofs:

- W1.1A Extensions: `Resources|Nutrition|Skill|AI|Recurring` mit `25 passed,
  0 skipped, 0 failed`.
- Nutrition focused proof: Manual Recipe Create, Manual Meal Create,
  Meal Complete, reload-stabile Recent Meals und Meal-Planner-Projektion.
- Empty Nutrition proof: Overview, Meal Planner, Recipes und Grocery zeigen
  keine Demo-Leaks und deaktivieren nicht verbundene Actions.

Known Gaps:

- Recipe Edit / Archive Browser-Proof ist durch F1.2B geschlossen.
- Kein persistentes Ingredient-Modell.
- Kein Grocery-ReadModel aus echten geplanten Meals und Ingredients.
- Kein Planner-Edit-Write-Pfad.
- Kein Meal-Serving-/Portion-Feld.
- Keine echte Macro-/Calorie-Datenquelle.
- Keine Nutrition-Zielprofile als persistente Source of Truth.

## 5. Existing Data Model

Recipe Fields:

- `id`
- `user_id`
- `area_id`
- `title`
- `summary`
- `instructions`
- `servings`
- `prep_minutes`
- `tags`
- `nutrition_estimate`
- `source`
- `is_archived`
- `created_at`
- `updated_at`

Meal Fields:

- `id`
- `user_id`
- `recipe_id`
- `date`
- `meal_type`
- `title`
- `planned_at`
- `completed_at`
- `notes`
- `created_at`
- `updated_at`

Recipe -> Meal Relation:

- `meals.recipe_id -> recipes.id`
- FK uses `on delete set null`.
- `recipe_id` is optional.
- Repository verifies active same-user Recipe ownership before Meal create or
  update when `recipeId` is set.
- Existing Meals may keep references to archived Recipes.

Archive Pattern:

- Recipes use `is_archived`.
- Active Recipe reads filter `is_archived = false`.
- Meals have no archive field.

Status Pattern:

- Recipes have no status enum; `is_archived` is the lifecycle marker.
- Meals use `completed_at` for completion/logging.
- Planned Meals are represented by `date` and optional `planned_at` without
  `completed_at`.

Ownership Pattern:

- Both tables have `user_id`.
- RLS policies restrict select/insert/update/delete to `(select auth.uid()) =
  user_id`.
- Server Actions authenticate server-side and pass `context.auth.user.id`.
- Repository rejects `profileId` outside the current user scope.
- Recipe `areaId` is checked against own active Areas.
- Meal `recipeId` is checked against own active Recipes.
- No Service Role is used in app flows.

Repository Methods:

- `createRecipe`
- `updateRecipe`
- `archiveRecipe`
- `getRecipesByUser`
- `getActiveRecipesByUser`
- `createMeal`
- `updateMeal`
- `completeMeal`
- `getMealsByUserAndDateRange`

Server Actions:

- `createRecipeAction`
- `createRecipeFormStateAction`
- `updateRecipeAction`
- `archiveRecipeAction`
- `createMealAction`
- `createMealFormStateAction`
- `updateMealAction`
- `completeMealAction`
- `completeMealFormStateAction`

Field Presence Check:

| Capability | Current state |
| --- | --- |
| ingredients | not in DB; mock/local UI type only |
| instructions | `recipes.instructions` text |
| servings | `recipes.servings` integer |
| prep time | `recipes.prep_minutes` integer |
| cook time | not in DB |
| nutrition values | `recipes.nutrition_estimate` JSON object, rough optional |
| meal slot/type | `meals.meal_type` |
| planned date | `meals.date` and optional `planned_at` |
| completed state | `meals.completed_at` |
| notes | `meals.notes` |
| meal portion/serving | not in DB |

## 6. Final Nutrition Target State

Nutrition final state for this product stage:

- Existing Recipe and Meal flows remain the foundation.
- Recipe Detail becomes useful enough for edit/archive, instructions and later
  ingredients.
- Ingredients become structured, user-scoped, sortable Recipe children.
- Meal Planner edits real Meals instead of local-only planner state.
- Grocery is derived from planned Meals and Recipe Ingredients, then reviewed
  by the user.
- Nutrition Metrics only show real user-entered or explicitly stored estimate
  values.
- No medical advice, no invented macros and no external nutrition API.

Nutrition remains a daily planning/support surface, not a full health-advice or
food-database product.

## 7. Domain Separation

| Domain | Current classification | Reason |
| --- | --- | --- |
| Recipe Detail | partial | Recipe fields, update/archive and Ingredients are bound in Manual Recipes UI; detail route remains a stub. |
| Ingredients | local_connected | F1.2C adds `recipe_ingredients` rows and Manual UI create/edit/delete with reload proof. |
| Meal Planning | local_connected_with_depth_gap | Meal Create/Edit/Reschedule/Complete und aktiver Same-User-Recipe-Wechsel sind verbunden; Portionen und Drag-and-drop bleiben deferred. |
| Grocery | connected_read_projection | Read-only Draft aus echten offenen Meals und Recipe Ingredients; Persistenz, Check-off und Pantry bleiben deferred. |
| Nutrition Metrics | estimate_only | `nutrition_estimate` bleibt optionale manuelle Recipe-Schätzung; keine Intake- oder Metrics Engine. |

Recipe Detail scope:

- connected today: create fields for title, summary, servings, prep minutes and
  tags; read instructions and estimates when present.
- partial today: update/archive actions exist but are not Manual UI-bound.
- future/deferred: full detail route and cook-time field.

Ingredients scope:

- needed fields: ingredient name, quantity, unit, optional note, recipe
  relation and ordering.
- current state: blocked by data model.

Meal Planning scope:

- connected today: date, meal type, optional recipe relation, planned vs
  completed.
- current gap: serving/portion information and planner mutation path.

Grocery scope:

- should be derived from planned Meals and Recipe Ingredients.
- current state after F1.2C: Ingredient rows exist locally and are connected
  in Manual Recipes; Grocery Generation remains deferred.
- user review remains required before treating generated items as a list.

Nutrition Metrics scope:

- only allowed from explicit user-entered estimate values or a later accepted
  real data source.
- no health claims and no invented values.

## 8. Recipe Ingredients Decision Draft

Option A - Recipe JSON Field:

- Pros: fastest schema change; one table only.
- Cons: weak sorting/editing, awkward partial updates, harder Grocery
  aggregation, weaker row-level ownership and future relation semantics.
- Decision: not preferred.

Option B - Own `recipe_ingredients` table:

- Shape:

```text
id
user_id
recipe_id
name
quantity
unit
note
position
created_at
updated_at
```

- Pros: editable, sortable, Grocery-capable, user-scoped, keeps Recipe clean,
  no broad ingredient catalog complexity.
- Cons: needs migration, schema, mapper, repository, actions, UI binding and
  browser proof.
- Decision: preferred for current personal scope.

Option C - Ingredients + Ingredient Catalog:

- Pros: normalized catalog, aliases, cross-recipe reuse and richer analytics.
- Cons: too much complexity for current personal Nutrition depth; catalog
  semantics, dedupe, units and ownership would dominate the next block.
- Decision: future only.

Recommendation:

```text
Choose Option B after F1.2B.
```

F1.2C Status 2026-07-11:

- Option B was implemented as a local end-to-end vertical slice in
  `docs/product/recipe-ingredients-model-f1-2c.md`.
- `public.recipe_ingredients` is a user-scoped table with Recipe ownership,
  RLS, authenticated Grants and local Typegen.
- No Ingredient Catalog, Grocery Items, Pantry, Macro Engine, external food
  source or AI Meal Suggestions were introduced.

## 9. Grocery Dependencies

Grocery can only become real after Recipe Ingredients exist.

Rules:

- Grocery must not use fake missing-ingredient data in Manual.
- Grocery Generation is derived behavior, not the Source of Truth.
- Source of Truth stays with Recipes, Ingredients and planned Meals.
- User review remains required before generated demand becomes an actionable
  checklist.
- Receipt parsing, store integration, barcode flows and AI shopping
  suggestions are out of scope.

Later table decision:

- Ephemeral derivation from Meals/Ingredients is enough for first generation
  proof.
- A later `grocery_items` table is useful only when the user needs checked
  state, manual additions, carried-over items or reusable lists to persist.
- F1.2G should decide whether to start ephemeral-only or add persisted review
  items after Ingredients are proven.

## 10. Design Debt

Was passt zu V5:

- Nutrition already acts as a dense operational area, not a marketing page.
- Overview, Planner, Recipes and Grocery are visually separated by purpose.
- Empty and Manual states avoid demo fallback for Nutrition.
- Grocery Signal text must stay honest until real Grocery Generation exists.
- P2 dashboard Nutrition concepts do not override P0 Today/Daily Control.

Was verletzt V5:

- Recipe Workbench still has local-only editor depth that looks richer than
  the persisted Manual capability.
- Grocery mock depth is visually substantial in Demo but not data-backed in
  Manual.
- Nutrition Metrics can look more final than the data source supports unless
  future slices keep source labels explicit.

Konkrete Fixes:

- First connect Recipe Entity Edit / Archive so the visible Recipe Workbench
  matches backend truth.
- Keep Grocery Manual empty until real Grocery Generation exists.
- Keep Planner Save/Replace/Serving controls disabled or clearly deferred
  until Meal Planner writes are connected.
- Keep Metrics tied to explicit `nutrition_estimate` values only.

Acceptance Decision:

```text
PASS_WITH_FIXES
```

F1.2 can proceed without redesign. The fixes are functional truth fixes, not
visual redesign work.

## 11. F1.2 Vertical Slices

### F1.2B Recipe Entity Edit / Archive

Ziel:

- Bind existing `updateRecipeAction` and `archiveRecipeAction` to the Manual
  Recipes UI.
- Keep current Recipe Workbench layout.

Nicht-Ziele:

- no Ingredients
- no Grocery
- no Meal Planner edit
- no migration
- no Recipe Detail route rebuild

Wahrscheinlich betroffene Dateien:

- `src/features/nutrition/recipes/recipes-view.tsx`
- `src/features/nutrition/recipes/recipe-detail-panel.tsx`
- `src/features/nutrition/recipes/recipe-editor-dialog.tsx` or a smaller
  persisted edit form
- `tests/e2e/content-state-system.spec.ts`
- `docs/qa/*`

Use Skills:

- `life-os-vertical-slice`
- `life-os-backend-action-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Migration noetig: no.

Akzeptanzkriterien:

- Manual user can edit persisted Recipe title/summary/instructions/servings/
  prep minutes/tags where the existing schema supports it.
- Manual user can archive a Recipe.
- Archived Recipe leaves active Recipes list after reload.
- Existing Meals are not broken by archiving.
- Server Action uses Auth, Zod safeParse, same-user scope and revalidation.

Browser-Proof:

- Create Recipe, edit Recipe, reload, archive Recipe, reload, verify active
  list removal and no demo leaks.

Risiko:

- Existing local-only editor includes fields not in DB, especially Ingredients
  and cook time. F1.2B must not pretend those persist.

F1.2B Status 2026-07-11:

- Dokumentiert in `docs/qa/recipe-entity-edit-archive-f1-2b.md`.
- Ergebnis: PASS.
- Manual Recipes UI bindet `updateRecipeAction` und `archiveRecipeAction`
  ueber form-state wrappers im bestehenden Selected Recipe Panel.
- Editierbare Manual-Felder sind auf persistierte Recipe-Felder begrenzt:
  Title, Summary, Instructions, Servings, Prep min und Tags.
- Soft Archive setzt `is_archived = true`; aktive Recipe Reads filtern danach
  das archivierte Recipe nach Reload aus.
- Existing Meals bleiben erhalten; der Browser-Proof erstellt ein Meal vor dem
  Archive und bestaetigt es nach Archive + Reload in `/nutrition`.
- Fokussierter Proof:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Recipe|Meal"`:
  6 passed.
- Keine Ingredients, keine Grocery Generation, kein Meal Planner Edit, keine
  Nutrition Metrics, keine Migration, keine RLS-/Policy-/Grant-Aenderung,
  keine Remote-DB-Aktion und kein Deployment.

### F1.2C Recipe Ingredients Model Lock

Ziel:

- Finalize `recipe_ingredients` fields, ownership, ordering, unit semantics,
  deletion/archive behavior and Grocery dependency.

Nicht-Ziele:

- no migration
- no UI
- no source changes

Wahrscheinlich betroffene Dateien:

- `docs/product/nutrition-deep-features-scope-f1-2a.md` or follow-up product doc
- `docs/product/nutrition-recipe-meal-model-lock.md`

Use Skills:

- `life-os-backend-action-slice`
- `life-os-completion-gate`

Migration noetig: unknown/no in this block.

Akzeptanzkriterien:

- Ingredient table option is fully locked.
- Grocery dependency is explicit.
- No fake metrics or grocery data are introduced.

Browser-Proof: not needed; docs-only.

Risiko:

- Over-modeling into ingredient catalog too early.

F1.2C Status 2026-07-11:

- Dokumentiert in `docs/product/recipe-ingredients-model-f1-2c.md` und
  `docs/qa/recipe-ingredients-vertical-slice-f1-2c.md`.
- Ergebnis: F1.2C wurde als End-to-End Vertical Slice umgesetzt und absorbiert
  den frueher geplanten F1.2D/F1.2E Ingredients-Pfad.
- Lokale Migration `20260711184831_recipe_ingredients.sql` erstellt
  `public.recipe_ingredients` mit Constraints, Indexen, Trigger, RLS und
  authenticated Grants.
- Domain, Zod, Mapper, Repository Contract, Supabase Repository und Server
  Actions fuer Ingredient Create/Update/Delete sind verbunden.
- Manual `/nutrition/recipes` bindet Ingredients im bestehenden Selected
  Recipe Panel.
- Fokussierter Proof:
  `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Recipe|Ingredient"`:
  7 passed.
- Grocery bleibt deferred; F1.2C erzeugt keine Grocery Items, keine Pantry und
  keine Makro-/Kalorienengine.

### F1.2D Recipe Ingredients Schema / Repository / Actions

Status 2026-07-11:

- Absorbiert durch F1.2C Recipe Ingredients End-to-End Vertical Slice.

Ziel:

- Add Recipe Ingredients schema, mapper, repository contract, Supabase
  repository and Server Actions.

Nicht-Ziele:

- no Grocery generation
- no Recipe UI binding except minimal read path if needed
- no catalog

Wahrscheinlich betroffene Dateien:

- `supabase/migrations/*`
- `src/types/supabase.ts`
- `src/features/real-data/domain/nutrition.ts`
- `src/features/real-data/schemas/nutrition.schema.ts`
- `src/features/real-data/repositories/real-data-repository.ts`
- `src/features/real-data/supabase/mappers/nutrition.mapper.ts`
- `src/features/real-data/supabase/repositories/supabase-nutrition-repository.ts`
- `src/features/real-data/actions/nutrition.actions.ts`

Use Skills:

- `life-os-backend-action-slice`
- `life-os-browser-proof`
- `life-os-completion-gate`

Migration noetig: yes.

Akzeptanzkriterien:

- `recipe_ingredients` rows are user-scoped.
- `recipe_id` ownership is enforced server-side and by RLS.
- Create/update/delete or replace semantics are explicit.
- No Service Role, remote DB, link, push or reset.

Browser-Proof:

- Not feature complete if data-layer only; browser proof deferred to F1.2E.

Risiko:

- Deleting/reordering ingredients can create UI and concurrency complexity.

### F1.2E Recipe Ingredients UI Binding / Browser Proof

Status 2026-07-11:

- Absorbiert durch F1.2C Recipe Ingredients End-to-End Vertical Slice.

Ziel:

- Connect Ingredients to Recipe UI and prove reload-stable creation/editing.

Nicht-Ziele:

- no Grocery generation beyond maybe "available ingredients" display.
- no external food data.

Wahrscheinlich betroffene Dateien:

- `src/features/nutrition/recipes/**`
- `src/features/profile-data/area-view-models.ts`
- `tests/e2e/content-state-system.spec.ts`
- `docs/qa/*`

Use Skills:

- `life-os-vertical-slice`
- `life-os-backend-action-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Migration noetig: no, if F1.2D already migrated.

Akzeptanzkriterien:

- Manual Recipe can store ordered Ingredients.
- Ingredients reload in Recipe Workbench/Detail.
- Empty and Demo do not leak into Manual.
- Grocery remains prepared until generation is implemented.

Browser-Proof:

- Create Recipe, add Ingredients, reload, edit one Ingredient, reorder or
  position check if implemented, reload.

Risiko:

- UI can become too modal-heavy if it tries to solve Planner/Grocery at once.

### F1.2F Meal Planner Edit / Reschedule Depth

Status 2026-07-11: Implementiert in `docs/qa/meal-planner-edit-reschedule-f1-2f.md`. Manual Meal Edit, Datum-/Slot-Reschedule, aktiver Same-User-Recipe-Wechsel und unverändertes `completed_at` sind im bestehenden Inspector verbunden; keine Migration.

Ziel:

- Connect planner edits to real Meals: change date, meal type, Recipe and
  planned time.

Nicht-Ziele:

- no Grocery generation
- no macros engine

Wahrscheinlich betroffene Dateien:

- `src/features/nutrition/meal-planner/**`
- `src/features/real-data/actions/nutrition.actions.ts`
- nutrition schemas/repositories if serving/portion is added
- tests and QA docs

Use Skills:

- `life-os-vertical-slice`
- `life-os-backend-action-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Migration noetig: unknown, because serving/portion is not in `meals`.

Akzeptanzkriterien:

- Planner changes persist and reload.
- Recipe replacement validates same-user Recipe ownership.
- Portion/serving either persists with a decided field or remains absent and
  clearly deferred.

Browser-Proof:

- Move planned Meal, change slot/type or Recipe, reload, verify Overview and
  Planner projection.

Risiko:

- Meal Planner can sprawl into a full calendar if date/time scope is not tight.

### F1.2G Grocery Generation Model / UI

Status 2026-07-11: Implementiert als serverseitige, ephemere Manual-Read-
Projektion. Alle offenen Meals im ausgewählten Wochenbereich werden unabhängig
von der Planner-Matrix berücksichtigt. Gleicher Ingredient-Name wird nur bei
gleicher Unit und kompatibler Note ohne Conversion oder Serving-Skalierung
summiert; nicht auflösbare Meals bleiben sichtbar unresolved. Keine Migration
und keine Grocery-Persistenz. Details: `docs/qa/grocery-generation-f1-2g.md`.

Ziel:

- Generate Grocery demand from planned Meals and Recipe Ingredients.

Nicht-Ziele:

- no store integration
- no receipt/OCR
- no fake missing ingredients

Wahrscheinlich betroffene Dateien:

- `src/features/nutrition/grocery/**`
- `src/features/profile-data/area-view-models.ts`
- nutrition repository/read model files
- tests and QA docs

Use Skills:

- `life-os-vertical-slice`
- `life-os-backend-action-slice`
- `life-os-design-taste`
- `life-os-browser-proof`
- `life-os-completion-gate`

Migration noetig: unknown; ephemeral first is possible, persisted
`grocery_items` requires migration.

Akzeptanzkriterien:

- Grocery demand derives from real planned Meals and Ingredients.
- User can distinguish generated demand from reviewed checklist state.
- Manual has no fake grocery demand.

Browser-Proof:

- Create planned Meal with Ingredients, open Grocery, verify derived item,
  reload.

Risiko:

- Generated state can be mistaken for Source of Truth if review semantics are
  unclear.

### F1.2H Nutrition Metrics Decision

Ziel:

- Decide whether metrics remain rough Recipe estimates or need dedicated
  nutrition targets/entries.

Nicht-Ziele:

- no calorie engine
- no health advice
- no external API

Wahrscheinlich betroffene Dateien:

- product/docs first
- later schemas/repositories only if a real source is approved

Use Skills:

- `life-os-backend-action-slice`
- `life-os-design-taste`
- `life-os-completion-gate`

Migration noetig: unknown.

Akzeptanzkriterien:

- Metrics source is explicit.
- No invented values.
- No medical advice or target recommendations.

Browser-Proof:

- Not needed for decision-only; needed when UI/source changes.

Risiko:

- High fake-data risk if metrics are made prominent before source quality is
  solved.

F1.2H Status 2026-07-11:

- Decision Lock: `docs/product/nutrition-metrics-decision-f1-2h.md`.
- `nutrition_estimate` bleibt eine optionale manuelle Recipe-Schätzung.
- Keine automatische Calorie-/Macro-Berechnung, Tagesziel-/Defizitlogik,
  Health Claims, externe Food API oder Portionsannahme.
- Fehlende Manual-Schätzwerte werden nicht mehr als exakte Nullwerte gezeigt.
- Eine echte Metrics Engine bleibt deferred, bis Ingredient-Nährwerte,
  Unit-Semantik, Recipe Yield, Meal Portion und Provenance existieren.
- Nächster Block: F1.2I Nutrition Closure.

### F1.2I Nutrition Closure

Status 2026-07-11: PASS_WITH_DEFERRED.

- Closure-Dokument: `docs/product/nutrition-closure-f1-2i.md`.
- Connected Claims und Deferred Work sind gegen F1.2B–H abgeglichen.
- Nutrition bleibt `local_connected_with_depth_gap`.
- Kein neuer Browser-Proof, da F1.2I ausschließlich Dokumentation ändert.
- Nächster Produktbereich: F1.3 Resource/Skill Graph Read Model.

Ziel:

- Close F1.2 claims after connected slices and document remaining deferred
  Nutrition depth.

Nicht-Ziele:

- no new implementation.

Wahrscheinlich betroffene Dateien:

- `docs/product/final-product-completion-roadmap.md`
- `docs/product/final-surface-connected-claim-review-f0-1.md`
- F1.2 scope/QA docs

Use Skills:

- `life-os-completion-gate`

Migration noetig: no.

Akzeptanzkriterien:

- Claims match browser proofs.
- Deferred Grocery/Metrics/Planner details are honest.

Browser-Proof:

- Not needed if closure-only, but must cite latest focused Nutrition proofs.

Risiko:

- Overclaiming local connected depth as final complete.

## 12. First Executable Block

First executable block:

```text
F1.2B Recipe Entity Edit / Archive
```

Begruendung:

- Existing backend is already present: update/archive schemas, actions and
  repository methods exist.
- Existing UI is prepared but local-only or disabled for Manual.
- No migration is needed.
- Daily utility is high: correcting and retiring Recipes is basic hygiene
  before Ingredients or Grocery.
- Browser-testability is straightforward.
- It avoids fake data and does not require Grocery, Ingredients or Metrics.

Not chosen first:

- Recipe Ingredients is closed by F1.2C.
- Meal Planner Depth likely needs serving/portion decisions.
- Grocery Generation depends on Recipe Ingredients.
- Nutrition Metrics has high fake-data risk.

No long docs-only chain:

- After F1.2B, F1.2C implemented and proved the Ingredients path end to end.
- Next Nutrition depth must stay separate: Meal Planner Edit, Grocery
  Generation or Metrics Decision, one slice at a time.

## 13. Acceptance Criteria

- Nutrition Deep Features Scope is documented.
- Existing Nutrition flows were audited and remain the foundation.
- Recipe and Meal data model was checked against code and migration.
- Ingredients, Recipe Detail, Meal Planning, Grocery and Metrics are separated.
- Ingredients model options are evaluated.
- F1.2 is cut into executable Vertical Slices, with Ingredients now closed by
  F1.2C.
- First functional follow-up block is clear.
- F1.2A itself implemented no product features; later F1.2B/F1.2C status
  blocks document their source, test and migration changes.
- No remote DB, deployment or secret access occurred.

## 14. Risks

- Recipe local editor can overpromise fields that the DB does not have.
- Ingredients can sprawl into catalog semantics too early.
- Grocery can produce fake confidence if generated items are not review-gated.
- Metrics can become health advice if source and copy are not constrained.
- Meal Planner edit can require a serving/portion migration.
- Local connected claims can be overread as final complete or production-ready.

Completion Gate:

```text
PASS_WITH_DEFERRED
```

F1.2A is complete as a docs-only scope lock. Deferred work is explicitly
bounded into F1.2B-F1.2I.

F1.2I Closure Decision:

```text
PASS_WITH_DEFERRED
```

F1.2 Nutrition Deep Features ist fachlich und operativ geschlossen. Spätere
Nutrition-Tiefe bleibt im Closure-Dokument explizit deferred.
