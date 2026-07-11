# F1.2B Recipe Entity Edit / Archive

Stand: 2026-07-11
Status: PASS
Quelle der Wahrheit: aktueller Code, F1.2A Scope Lock,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md` und fokussierter
Nutrition Browser-Proof.
Gilt fuer: Manual Recipe Update/Archive Binding in `/nutrition/recipes`.
Nicht gilt fuer: Ingredients, Grocery Generation, Meal Planner Edit,
Nutrition Metrics, Recipe Detail Route, Migrationen, Remote-DB oder
Deployment.

## 1. Zweck

F1.2B verbindet vorhandene Recipe-Update- und Recipe-Archive-Pfade mit der
Manual Recipes UI, ohne die Nutrition-Seiten neu zu bauen.

Ergebnis:

- Manual Recipes koennen persistente Recipe-Felder bearbeiten.
- Manual Recipes koennen soft-archiviert werden.
- Archivierte Recipes verlassen die aktive Recipe-Liste nach Reload.
- Bestehende Meals bleiben nach Recipe Archive erhalten.

## 2. Nicht-Ziele

- Keine Ingredients.
- Keine Grocery-Demand-Generierung.
- Kein Meal Planner Edit, Reschedule oder Recipe-Wechsel.
- Keine Macro-/Calorie-Engine.
- Keine Health Claims.
- Keine externe Food API.
- Keine neue Tabelle, Migration, RLS-/Policy-/Grant-Aenderung.
- Keine Remote-DB-Aktion, kein `supabase link`, kein `db push`, kein
  `db reset`.
- Keine Recipe Detail Route.

## 3. Recipe Entity Audit

Persistierte Recipe-Felder aus dem aktuellen Datenmodell:

- `title`
- `summary`
- `instructions`
- `servings`
- `prep_minutes`
- `tags`
- `source`
- `nutrition_estimate`
- `area_id`
- `is_archived`

F1.2B bindet in der UI nur manuell sinnvoll editierbare persistierte Felder:

- Title
- Summary
- Instructions
- Servings
- Prep min
- Tags

Nicht gebunden:

- Ingredients, weil sie nicht persistiert sind.
- Cook time, weil kein DB-Feld existiert.
- Nutrition/Macro totals, weil keine belastbare Engine oder Quelle existiert.
- Area, weil kein Recipe-Area-Auswahlflow Teil dieses Slice ist.

## 4. Backend Path

Verwendete bestehende Pfade:

- `updateRecipeAction`
- `archiveRecipeAction`
- `recipeUpdateInputSchema.safeParse`
- `recipeArchiveInputSchema.safeParse`
- `createSupabaseNutritionRepository`
- `updateRecipe`
- `archiveRecipe`

Ergaenzte Action-Form-State-Bindings:

- `updateRecipeFormStateAction`
- `archiveRecipeFormStateAction`

Auth/Security:

- Server Action liest den aktiven Profile-Kontext.
- Writes sind nur im Manual-Profil erlaubt.
- Supabase Auth wird serverseitig geprueft.
- Repository setzt `userId` aus der Server-Session.
- Repository lehnt profile/user mismatch ab.
- RLS bleibt unveraendert und user-scoped.
- Keine Service Role.

Revalidation:

- `/nutrition`
- `/nutrition/recipes`
- `/nutrition/meal-planner`
- `/dashboard`
- `/today`

## 5. UI Binding

Die bestehende `/nutrition/recipes` Workbench bleibt erhalten.

Gebunden wurde der vorhandene Selected Recipe Panel:

- Demo/Local behaelt lokale Edit/Duplicate/Archive Controls.
- Manual ersetzt diese lokalen Controls durch persistente Edit- und
  Archive-Formulare.
- Empty bleibt ohne persistente Aktionen.

Keine Layout-Rekomposition, keine neue Designrichtung und keine Recipe-Detail-
Route wurden eingefuehrt.

## 6. Edit Semantics

Manual Edit sendet:

- `recipeId`
- `title`
- `summary`
- `instructions`
- `servings`
- `prepMinutes`
- `tags`

Success- und Error-Zustaende werden im Selected Recipe Panel angezeigt.

Nach Reload liest die Workbench aktive Recipes erneut aus Supabase. Der
Browser-Proof bestaetigt aktualisierte Summary und Instructions im Panel.

## 7. Archive Semantics

Manual Archive sendet nur:

- `recipeId`

Das Repository setzt `is_archived = true`.

Aktive Recipe Reads filtern `is_archived = false`. Deshalb verschwindet das
Recipe nach Reload aus der aktiven Recipe-Liste.

Bestehende Meals werden nicht geloescht. Der Browser-Proof erstellt vor dem
Archivieren ein Meal mit Recipe-Referenz und bestaetigt nach Archive + Reload,
dass das Meal in `/nutrition` weiter sichtbar bleibt.

## 8. Manual/Demo/Empty

Manual:

- Recipe Create, Update und Archive sind server-backed.
- Recipe List liest aktive Recipes aus Supabase.
- Meal Create bleibt auf aktive same-user Recipes beschraenkt.

Demo:

- Bleibt kuratierte Referenz mit lokalen Demo-Daten.
- Keine Manual-Server-Writes.

Empty:

- Bleibt leer ohne Demo-Leaks.
- Nicht verbundene Actions bleiben disabled oder prepared.

## 9. Browser Proofs

Command:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Recipe|Meal"
```

Result:

```text
6 passed
```

Abgedeckt:

- Demo Nutrition routes bleiben kuratierte Referenz.
- Empty Nutrition Overview/Planner/Recipes/Grocery ohne Demo-Leaks.
- Manual Recipe Create, Meal Create, Meal Complete reload-stable.
- Manual Recipe Edit reload-stable.
- Manual Recipe Archive entfernt active Recipe nach Reload.
- Existing Meal bleibt nach Recipe Archive und Reload sichtbar.

## 10. Reload Stability

Edit:

- Create Recipe.
- Update persisted fields.
- Assert success state.
- Reload `/nutrition/recipes`.
- Assert Recipe remains active and updated Summary/Instructions render.

Archive:

- Create Recipe.
- Create Meal referencing the Recipe.
- Archive Recipe.
- Assert success state.
- Reload `/nutrition/recipes`.
- Assert Recipe absent from active `Recipe results`.
- Reload `/nutrition`.
- Assert Meal remains visible.

## 11. Remaining Deferred Work

Deferred after F1.2B:

- Recipe Ingredients model lock.
- Recipe Ingredients migration/repository/actions.
- Ingredients UI binding.
- Meal Planner edit/reschedule depth.
- Grocery generation from real planned Meals and Ingredients.
- Nutrition Metrics decision.
- Recipe Detail Route depth.

## 12. Connected Claim Impact

Nutrition remains:

```text
local_connected_with_depth_gap
```

Claim change:

- Recipe Edit/Archive moved from backend-existing-but-unbound to Manual UI
  connected.
- Recipe/Meal base flows are stronger.
- Ingredients, Grocery, Planner Edit and Metrics remain explicitly deferred.

No migration, no remote DB action, no deployment and no secrets were used.
