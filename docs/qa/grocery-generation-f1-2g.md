# F1.2G Grocery Generation

Stand: 2026-07-11
Status: PASS

## Zweck

Die bestehende Manual-Grocery-Fläche zeigt einen read-only Grocery Draft aus
allen user-owned, nicht abgeschlossenen Meals des ausgewählten Wochenbereichs,
deren Recipes und persistierten Recipe Ingredients.

## Datenpfad

`/nutrition/grocery?week=YYYY-MM-DD` → authentifizierter Supabase Server Client
→ user-scoped Nutrition Repository → Meals/Recipes/Recipe Ingredients → pure
`generateGroceryDraft` Aggregation → bestehende Grocery Route.

Die Projektion nutzt nicht die reduzierte Planner-Matrix. Mehrere Meals mit
demselben Datum und Slot bleiben eigenständige Quellen.

## Aggregationsregeln

- Nur Meals im inklusiven Wochenbereich ohne `completed_at`.
- Name wird nur für den Vergleich getrimmt und case-insensitiv normalisiert.
- Summierung nur bei gleichem Namen, gleicher Unit und gleicher normalisierter
  Note.
- Keine Unit Conversion.
- Keine Skalierung über Recipe `servings`.
- Null-Mengen bleiben unbekannt; es werden keine Mengen erfunden.
- Meal ohne auflösbares Recipe oder Recipe ohne Ingredients erscheint unter
  `Unresolved Meals`.

## UI

Manual zeigt einen serverseitig erzeugten, ausdrücklich als `Draft`,
`read-only` und `nicht geprüft` markierten Bereich. Previous/Current/Next Week
verwenden denselben expliziten Wochenparameter. Grocery-Persistenz, Check-off,
Pantry, Must-have und Receipt-Flows sind im Manual nicht verbunden. Demo bleibt
kuratierte Referenz; Empty bleibt frei von Demo-Daten.

## Browser-Proof

Der fokussierte Test deckt ab:

1. Recipe + Ingredients + Meal nach Reload sichtbar.
2. Zwei Meals im selben Datum/Slot werden beide berücksichtigt.
3. Gleiche Ingredient-/Unit-/Note-Werte werden summiert.
4. Gleicher Name mit `g` und `kg` bleibt getrennt.
5. Meal ohne Recipe und Recipe ohne Ingredients erscheinen unresolved.
6. Completed Meal wird ausgeschlossen.

Command:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Nutrition|Grocery|Ingredient|Meal"
```

Ergebnis: `9 passed, 0 skipped, 0 failed`.

## Migration

Keine Migration. Keine Grocery-Tabelle oder Grocery-Persistenz.

## Deferred

Persistentes Abhaken, manuelle Grocery Items, Pantry, Ingredient Catalog,
Unit Conversion, Ordering/Store/Receipt, Nutrition-/Macro-Engine und externe
APIs.

## Validation

- `git diff --check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm build`: PASS
- Supabase local DB lint: PASS, no schema errors
- Supabase local security advisors: PASS, no issues
- Focused Browser-Proof: PASS, 9 passed
