# F1.2C Recipe Ingredients End-to-End Vertical Slice

Stand: 2026-07-11
Status: PASS
Quelle der Wahrheit: aktueller Code, lokale Supabase Migration, Typegen,
`docs/product/recipe-ingredients-model-f1-2c.md` und fokussierter Browser-Proof.
Gilt fuer: Manual Recipe Ingredients in `/nutrition/recipes`.
Nicht gilt fuer: Grocery Generation, Ingredient Catalog, Pantry, Macro Engine,
Health Claims, externe Food APIs, AI Meal Suggestions, Meal Planner Edit,
Recipe Detail Route, Remote-DB oder Deployment.

## 1. Zweck

F1.2C macht Recipe Ingredients als echten Vertical Slice nutzbar:

- Datenmodell und lokale Migration.
- Typegen, Domain, Zod, Mapper und Repository.
- Server Actions fuer Create, Update und Delete.
- UI-Binding im bestehenden Selected Recipe Panel.
- Browser-Proof fuer Create/Edit/Delete mit Reload-Stabilitaet.

## 2. Model Decision

Umgesetzt ist eine eigene `public.recipe_ingredients` Tabelle.

Nicht umgesetzt:

- kein Recipe-JSON-Feld
- kein Ingredient Catalog
- keine Grocery Items
- keine Pantry
- keine Makro-/Kalorienengine

## 3. Migration

Migration:

```text
supabase/migrations/20260711184831_recipe_ingredients.sql
```

Die Migration erstellt:

- `public.recipe_ingredients`
- Constraints fuer Name, Quantity, Unit, Note und Position
- Indexe fuer User/Recipe/Position, User/Created und `recipe_id`
- `updated_at` Trigger
- RLS Policies fuer authenticated User
- authenticated Grants

Remote-Aktionen wurden nicht verwendet:

- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- kein Deployment

## 4. Typegen

`src/types/supabase.ts` wurde lokal aus der lokalen Supabase DB neu generiert.

## 5. Domain / Zod

Domain:

- `RecipeIngredient`

Zod:

- `recipeIngredientCreateInputSchema`
- `recipeIngredientUpdateInputSchema`
- `recipeIngredientDeleteInputSchema`

Validierungsregeln:

- `recipeId`/`ingredientId` sind UUIDs.
- `name` ist required und trimmed.
- `quantity` ist optional/nullbar, aber positiv, wenn gesetzt.
- `unit` und `note` sind optional/nullbar und nicht blank, wenn gesetzt.
- `position` ist optional und nicht negativ.

## 6. Mapper

Mapper:

- `mapRecipeIngredientRowToDomain`
- `mapRecipeIngredientCreateInputToInsert`
- `mapRecipeIngredientUpdateInputToPatch`

Snake Case bleibt in Supabase; Camel Case bleibt in Domain/UI.

## 7. Repository

Repository Contract:

- `getRecipeIngredients`
- `createRecipeIngredient`
- `updateRecipeIngredient`
- `deleteRecipeIngredient`

Supabase Repository:

- prueft Manual user/profile scope.
- prueft aktive same-user Recipe Ownership vor Ingredient Insert/Update.
- prueft Ingredient Ownership vor Update/Delete.
- liest Ingredients geordnet nach `position`, dann `created_at`.

## 8. Server Actions

Actions:

- `createRecipeIngredientAction`
- `updateRecipeIngredientAction`
- `deleteRecipeIngredientAction`

Form-State Wrapper:

- `createRecipeIngredientFormStateAction`
- `updateRecipeIngredientFormStateAction`
- `deleteRecipeIngredientFormStateAction`

Actions:

- holen Auth serverseitig.
- erlauben Writes nur im Manual-Profil.
- nutzen Zod `safeParse`.
- setzen `userId` nur aus der Supabase Session.
- revalidieren Nutrition-Routen.
- liefern Success/Error/Blocked-Zustaende.

## 9. UI Binding

Gebunden wurde das bestehende Selected Recipe Panel in `/nutrition/recipes`.

Neue Manual-Controls:

- `Zutat hinzufügen`
- `Zutat speichern`
- `Zutat entfernen`

Die UI zeigt:

- Ingredient Name
- optionale Menge
- optionale Einheit
- optionale Notiz
- Empty State: `Noch keine Zutaten hinterlegt.`

Kein Layout-Redesign, keine neue Route und keine neue Designrichtung.

## 10. Manual / Demo / Empty

Manual:

- Ingredients sind server-backed.
- Recipe Create/Edit/Archive bleibt erhalten.
- Ingredient UI erscheint nur im aktiven Selected Recipe Panel.

Demo:

- bleibt kuratierte Demo.
- keine Server-Writes.

Empty:

- bleibt leer ohne Demo-Leaks.
- keine gefakte Ingredient- oder Grocery-Datenquelle.

## 11. Browser Proof

Focused command:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Recipe|Ingredient"
```

Status:

```text
7 passed
```

Abdeckung des neuen Tests:

- Create Recipe.
- Create Ingredient.
- Reload und Ingredient sichtbar.
- Edit Ingredient.
- Reload und Update sichtbar.
- Delete Ingredient.
- Reload und Ingredient bleibt entfernt.
- Keine Nutrition Demo-Leaks.

## 12. Reload Stability

Reload-Stabilitaet wird gegen Supabase Reads bewiesen:

- Create: Ingredient erscheint nach Reload im Selected Recipe Panel.
- Update: Name/Menge/Einheit/Notiz bleiben nach Reload erhalten.
- Delete: Ingredient bleibt nach Reload entfernt.
- Archive-Kontext bleibt durch F1.2B bewiesen: archivierte Recipes verlassen
  aktive Recipe Results.

## 13. Auth / RLS

RLS:

- `select`: own rows only.
- `insert`: own row plus active same-user Recipe.
- `update`: own row plus active same-user Recipe.
- `delete`: own rows only.

Repository:

- prueft profile/user scope.
- prueft active Recipe Ownership.
- prueft Ingredient Ownership fuer Update/Delete.

Keine Service Role.

## 14. Deferred

- Grocery Generation aus planned Meals und Ingredients.
- Persistierte Grocery Items.
- Ingredient Catalog.
- Unit-Konvertierung.
- Macro-/Calories Engine.
- Meal Planner Edit/Reschedule.
- Recipe Detail Route.

## 15. Risiken

- Unit-Freitext ist bewusst flexibel, aber nicht aggregationssicher.
- Grocery braucht spaeter eigene Review-Semantik und darf nicht direkt aus
  Ingredients eine Einkaufsentscheidung behaupten.
- Nutrition bleibt `local_connected_with_depth_gap`, nicht feature-complete.

## 16. Validation

Commands:

```bash
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase migration up --local
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase gen types --local --schema public > src/types/supabase.ts
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase db lint --local --level warning
git diff --check
pnpm typecheck
pnpm lint
pnpm build
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Recipe|Ingredient"
```

Results:

```text
Migration: local database is up to date.
Typegen: completed against local DB.
Supabase DB lint: No schema errors found.
git diff --check: pass.
pnpm typecheck: pass.
pnpm lint: pass.
pnpm build: pass with host/port sandbox escalation.
Browser proof: 7 passed.
```
