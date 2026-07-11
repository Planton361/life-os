# F1.2C Recipe Ingredients Model Lock

Stand: 2026-07-11
Status: PASS
Quelle der Wahrheit: aktuelle lokale Migration, generierte Supabase Types,
Real-Data Domain/Repository/Actions und `/nutrition/recipes`.
Gilt fuer: `recipe_ingredients` als user-scoped Recipe-Zutatenmodell.
Nicht gilt fuer: Ingredient Catalog, Grocery Generation, Pantry, Macro Engine,
externe Food APIs, AI Meal Suggestions, Recipe Detail Route oder Remote-DB.

## 1. Entscheidung

F1.2C waehlt eine eigene Tabelle:

```text
public.recipe_ingredients
```

Nicht gewaehlt:

- kein JSON-Feld auf `recipes`
- kein globaler Ingredient Catalog
- keine Pantry-/Grocery-Items
- keine automatische Makro- oder Kalorienberechnung

Begruendung:

- Zutaten brauchen eigene Create/Edit/Delete-Semantik.
- Reihenfolge und Reload-Stabilitaet sind einfacher als mit Recipe JSON.
- Same-user Ownership kann pro Zeile und ueber `recipe_id` geprueft werden.
- Grocery kann spaeter aus geplanten Meals und Recipe Ingredients ableiten,
  ohne diese Tabelle selbst zur Einkaufsliste zu machen.

## 2. Tabellenform

```text
id uuid primary key
user_id uuid not null references auth.users(id)
recipe_id uuid not null references public.recipes(id)
name text not null
quantity numeric null
unit text null
note text null
position integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `name` darf nicht leer sein.
- `quantity` ist optional; wenn gesetzt, muss sie positiv sein.
- `position` ist nicht negativ.
- `unit` und `note` duerfen `null`, aber nicht blank sein.

## 3. Semantik

- `quantity = null` bedeutet: bewusst keine Menge, z. B. "Salz nach Geschmack".
- `unit` ist Freitext: `g`, `ml`, `EL`, `TL`, `Stueck` oder andere lokale
  Einheiten sind erlaubt.
- Es gibt keine automatische Unit-Konvertierung.
- `position` ist eine manuelle Sortierspalte innerhalb eines Recipes.
- Ingredient-Namen sind keine normalisierten Katalogeintraege.

## 4. Ownership

Jede Ingredient-Zeile traegt `user_id`.

Repository- und RLS-Regeln:

- Reads sind auf `(auth.uid() = user_id)` begrenzt.
- Insert/Update pruefen, dass `recipe_id` zu demselben User gehoert.
- Insert/Update sind nur gegen aktive, nicht archivierte Recipes erlaubt.
- Delete ist fuer eigene Ingredient-Zeilen erlaubt.
- Keine Service Role und keine clientseitige `userId` als Trust Boundary.

## 5. Archive / Delete

- Recipe Archive loescht Ingredients nicht direkt.
- Aktive Ingredient-Reads laufen nur ueber aktive Recipes.
- `recipe_id on delete cascade` schuetzt lokale Datenkonsistenz, falls ein
  Recipe spaeter hart geloescht wuerde.
- Ingredient Delete entfernt nur die Ingredient-Zeile, nicht das Recipe.

## 6. UI-Vertrag

F1.2C bindet Ingredients im bestehenden Selected Recipe Panel von
`/nutrition/recipes`.

Manual:

- create Ingredient
- edit Ingredient
- delete Ingredient
- reload-stabile Anzeige im Selected Recipe Panel

Demo:

- bleibt kuratierte Demo-Referenz.
- keine Manual-Server-Writes.

Empty:

- bleibt leer ohne Demo-Leaks.
- keine Ingredient-UI ohne aktives Manual Recipe.

## 7. Grocery Dependency

Grocery Generation bleibt deferred.

Nach F1.2C darf Grocery spaeter aus echten `recipe_ingredients` und geplanten
Meals ableiten. F1.2C erzeugt aber keine `grocery_items`, keine Checklisten,
keine Pantry-Items und keine Einkaufsentscheidungen.

## 8. Deferred

- Ingredient Catalog und Alias-/Dedupe-Regeln.
- Unit-Konvertierung.
- Nutrition/Macro Engine.
- Grocery Demand Generation.
- Pantry/Stock.
- Meal Planner Edit/Reschedule.
- Recipe Detail Route.
