# F1.2H Nutrition Metrics Decision Lock

Stand: 2026-07-11
Status: PASS_WITH_DEFERRED

## 1. Zweck

Dieser Decision Lock begrenzt die Aussagen von Nutrition Metrics auf die
tatsächlich vorhandenen Daten. Er baut keine Metrics Engine.

Entscheidung:

```text
nutrition_estimate bleibt eine optionale manuelle Recipe-Schätzung.
Es gibt keine automatische Calorie-/Macro-Berechnung, keine Tagesziel- oder
Defizitlogik und keine Health Claims.
```

## 2. Existing Metrics State

| Bereich | Quelle | Klassifikation | Zulässige Aussage |
| --- | --- | --- | --- |
| Recipe/Meal CRUD, Ingredients, Planner Edit, Grocery Draft | Supabase-backed Manual-Daten | `connected` | Entity-, Planungs- und Grocery-Claims ohne Nährwertberechnung |
| `recipes.nutrition_estimate` | optionales Recipe-JSON | `estimate_only` | manuell eingetragene grobe Recipe-Schätzung |
| Manual Nutrition Overview | Recipe-Schätzung wird auf verknüpfte Meals projiziert | `estimate_only` | nur als Schätzung; kein gemessener Intake |
| Demo Nutrition Overview und Meal Planner | kuratierte Mockdaten inklusive Ingredient-Makros und Zielprofilen | `demo` | Design-/Interaktionsreferenz, kein User-Claim |
| Manual Tagesziele, Defizit, Week Balance und Weight Trend | keine persistierte Quelle | `prepared` | leer beziehungsweise nicht gesetzt |
| Ingredient-basierte Nährwertberechnung | keine Ingredient-Nährwerte | `future` | keine aktuelle Aussage |
| Automatische Metrics Engine | keine Portionen, Food Source oder Zielprofile | `future` | keine aktuelle Aussage |
| Fehlende Manual-Schätzung als exakte `0 kcal / 0 g` | UI-Fallback vor F1.2H | `misleading` und korrigiert | jetzt `Keine Nährwertschätzung` beziehungsweise `—` |

## 3. Meaning of `nutrition_estimate`

`public.recipes.nutrition_estimate` ist nullable `jsonb`. Der einzige
DB-Constraint verlangt ein JSON-Objekt. Es gibt:

- kein festes Schema für Calories, Protein, Carbs oder Fat;
- keine Einheit, Bezugsgröße oder Portionssemantik;
- keine Source-, Confidence-, Timestamp- oder Review-Felder;
- keine Konsistenzprüfung gegen Recipe Ingredients;
- keine Berechnung und keine externe Datenquelle.

Der Domain-Typ ist `Record<string, unknown>`. Der Read-Adapter akzeptiert für
die UI numerische Werte beziehungsweise numerisch interpretierbare Strings
unter Aliasen:

- Calories: `calories`, `kcal`, `energy`
- Protein: `protein`
- Carbs: `carbs`, `carbohydrates`
- Fat: `fat`

Fehlende oder unlesbare Keys werden technisch zu `0` normalisiert. Nach
F1.2H darf dieser Fallback nicht als echter Nullwert dargestellt werden.

Create-/Update-Action und Repository können ein Estimate-Objekt transportieren,
aber die aktuelle Manual Recipe UI bietet kein sichtbares Nutrition-Estimate-
Eingabefeld. Damit ist das Feld datenpfadfähig, jedoch kein vollständig
verbundener User-Flow.

## 4. Allowed Product Claims

- Recipes können optional eine manuelle grobe Nährwertschätzung tragen.
- Verknüpfte Meals dürfen diese Recipe-Schätzung als Schätzung anzeigen.
- Fehlende Schätzwerte dürfen als unbekannt oder nicht hinterlegt erscheinen.
- Demo-Werte dürfen als kuratierte Demo-/Designwerte erscheinen.
- Meals, Ingredients, Planner und Grocery dürfen ohne Nutrition Metrics
  vollständig nutzbare Planungsdaten liefern.

## 5. Forbidden Claims

- berechnete, gemessene, verifizierte oder exakte Calories/Macros
- tatsächlicher Tages-Intake allein aus geplanten oder completed Meals
- personalisierte Tagesziele, Defizit, Gewichtsverlust oder Zielerreichung
- Health-, medizinische, diagnostische oder therapeutische Aussagen
- automatische Ingredient-Nährwerte oder Unit Conversion
- Accuracy-, Completeness- oder Food-Database-Claims
- dass Recipe `servings` eine konsumierte Meal-Portion beweist
- dass Demo-Zielprofile Manual-Daten oder Empfehlungen sind

## 6. Missing Data

Für eine echte Engine fehlen mindestens:

- Nährwerte pro Ingredient mit definierter Bezugsmenge und Einheit;
- verlässliche Ingredient-Identität statt freier Namen;
- normalisierte Units und explizite Conversion-Regeln;
- Recipe Yield-/Cooked-Weight-Semantik;
- persistierte Meal-Portion oder konsumierte Servings;
- Quelle, Confidence, Version und Review-Zustand von Nährwertdaten;
- persistierte Nutrition-Zielprofile mit fachlich akzeptierter Herkunft;
- Regeln für fehlende, optionale und „nach Geschmack“-Ingredients.

`recipe_ingredients.quantity` und `unit` reichen nicht aus: Units sind
bewusst Freitext, Mengen dürfen fehlen, und Ingredient-Zeilen enthalten keine
Nährwerte. `recipes.servings` beschreibt höchstens einen Recipe-Yield; Meals
haben kein Portion-/Servings-Feld. Die Planner-UI-Serving-Zahl ist kein
persistierter Manual-Meal-Wert.

## 7. Future Metrics Prerequisites

Vor einer Metrics Engine braucht es einen separaten bestätigten Scope mit:

1. Source-/Trust-Entscheidung für Food-/Ingredient-Nährwerte.
2. Ingredient Identity und Unit-Semantik.
3. Recipe Yield und Meal Portion als persistierte Felder.
4. Berechnungs-, Rundungs- und Missing-Data-Regeln.
5. Health-/Privacy-/Claim-Review.
6. UI-Provenance: `estimated`, `calculated`, `manual` oder `measured`.
7. Reload- und Browser-Proofs für Eingabe, Berechnung und Projektion.

Externe Food APIs, AI Nutrition Advice und medizinische Zielableitungen sind
nicht automatisch Bestandteil eines solchen Scopes.

## 8. UI Label Guidance

- Manual Estimate: `Manuelle Schätzung` oder `Recipe-Schätzung`.
- Missing: `Keine Nährwertschätzung` oder `—`; niemals `0`, sofern Null nicht
  ausdrücklich eingegeben und fachlich definiert wurde.
- Demo: `Demo` beziehungsweise kuratierter Referenzzustand.
- Targets: erst anzeigen, wenn eine persistierte, akzeptierte Quelle existiert.
- Keine „on target“, „remaining“, „deficit“, „balanced“ oder „within target“-
  Sprache im Manual-Profil ohne Ziel- und Portionsquelle.
- Schätzwerte dürfen nicht durch Dezimalpräzision oder Progress-Charts wie
  Messwerte wirken.

F1.2H korrigiert die sichtbar irreführenden Null-Fallbacks in Manual Recipes,
Planner Recipe Surfaces und Meal Details. Bestehende Demo-Berechnungen bleiben
Demo-only.

## 9. Design Review

Was passt zu V5:

- Nutrition bleibt P2-Unterstützung und konkurriert nicht mit Dashboard P0.
- Leere Manual-Ziele und Trends erfinden keine Daten.
- Textgestützte Provenance ist ruhiger und belastbarer als zusätzliche Charts.

Was verletzt V5:

- Exakte Nullwerte ohne Estimate-Quelle wirkten wie gemessene Präzision.
- Demo-Macro-Logik darf nie als Manual-Capability gelesen werden.

Konkrete Fixes:

- Fehlende Manual Estimates als unbekannt darstellen.
- Vorhandene Schätzwerte explizit als Schätzung kennzeichnen.
- Keine neue Visualisierung oder Metrics Card ergänzen.

Acceptance Decision: `PASS_WITH_FIXES`; die kleinen Capability-Truth-Fixes
sind Teil dieses Blocks.

## 10. Risks

- Das freie JSON kann unbekannte Keys, Einheiten oder Bezugsgrößen enthalten.
- Alias-Lesen kann semantisch verschiedene Werte gleich behandeln.
- Ein Recipe Estimate kann fälschlich als Meal Intake gelesen werden.
- Demo-Precision kann ohne klare Profilgrenze Erwartungen an Manual erzeugen.
- Health-sensitive Daten dürfen nicht ungeprüft an externe Systeme gehen.

## 11. Migration

Keine Migration. Das bestehende Feld bleibt unverändert und bewusst schwach
typisiert, bis ein eigener Metrics-Data-Model-Scope bestätigt ist.

## 12. Next Slice

Nächster F1.2-Block:

```text
F1.2I Nutrition Closure
```

F1.2I soll die verbundenen Recipe-, Ingredient-, Meal-, Planner- und Grocery-
Claims schließen und Metrics als `estimate_only`/deferred dokumentieren. Eine
Metrics Engine ist nicht der nächste automatische Slice.

Completion Gate: `PASS_WITH_DEFERRED`.

## 13. Validation

- `git diff --check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm build`: PASS
- Supabase local DB lint: PASS, no schema errors
- Supabase local security advisors: PASS, no issues
- Focused UI/Reload Browser-Proof: PASS, 3 passed
- Final Estimate-Detection Recheck: PASS, 2 passed
