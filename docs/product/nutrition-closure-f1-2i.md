# F1.2I Nutrition Deep Features Closure

Stand: 2026-07-11
Status: PASS_WITH_DEFERRED

## 1. Zweck

Dieser Block schließt F1.2 Nutrition Deep Features fachlich und operativ. Er
fasst die bewiesenen lokalen Manual-Flows aus F1.2A–H zusammen, fixiert die
verbleibenden Grenzen und setzt den nächsten Produktbereich aus der bestehenden
Roadmap.

F1.2I implementiert keine Produktfunktion und ändert weder UI noch Datenmodell.

## 2. Ergebnis

```text
Nutrition = local_connected_with_depth_gap
```

Der tägliche lokale Nutrition-Kern ist verbunden: Recipes, Recipe Ingredients,
Meals, Planner Edit und Grocery Draft arbeiten auf user-scoped Datenpfaden.
Nutrition ist dennoch keine finale Nutrition-, Intake- oder Health Engine.

## 3. Connected Claims

Die folgenden Claims sind lokal verbunden und durch die jeweiligen F1.2-
Proofs gedeckt:

- Recipe Create.
- Recipe Edit persistierter Recipe-Felder.
- Recipe Soft Archive mit Erhalt bestehender Meals.
- Recipe Ingredients Create, Edit und Delete.
- Meal Create.
- Meal Edit.
- Meal Reschedule über Datum und Meal Type.
- Meal Complete über `completed_at`.
- Recipe-Wechsel auf aktive Same-User-Recipes.
- Grocery Draft aus echten offenen Meals, deren Recipes und persistierten
  Recipe Ingredients.
- Optionale manuelle Recipe-`nutrition_estimate`-Projektion mit sichtbarer
  Estimate-Provenance und ehrlichem Unknown-State.

Connected bedeutet hier:

- lokales Manual-Profil;
- serverseitige Auth und user-scoped Repository-/RLS-Pfade für Writes;
- Reload-Proof für persistierte oder projizierte Flows;
- saubere Manual-/Demo-/Empty-Trennung;
- kein Production-, Remote- oder final-complete-Claim.

## 4. Proof Map

| Capability | Primäre Quelle | Proof |
| --- | --- | --- |
| Recipe Create/Edit/Archive und Meal-Erhalt | `docs/qa/recipe-entity-edit-archive-f1-2b.md` | fokussierter Recipe/Meal Reload-Proof |
| Recipe Ingredients Create/Edit/Delete | `docs/qa/recipe-ingredients-vertical-slice-f1-2c.md` | 7 passed |
| Meal Edit/Reschedule/Recipe-Wechsel/Completion-Erhalt | `docs/qa/meal-planner-edit-reschedule-f1-2f.md` | 8 passed |
| Grocery Draft und Aggregationsgrenzen | `docs/qa/grocery-generation-f1-2g.md` | 9 passed |
| Nutrition Estimate Decision und Provenance | `docs/product/nutrition-metrics-decision-f1-2h.md` | Decision Lock plus fokussierte UI-Rechecks |

F1.2I führt keinen neuen Browser-Proof aus. Der Block ändert nur
Dokumentation und stützt sich auf die aktuellen, bereits grünen Proofs.

## 5. Grocery Claim

Grocery ist eine ephemere, serverseitige Read-Projektion:

- read-only;
- aus offenen Meals im ausgewählten Wochenbereich abgeleitet;
- nicht aus der reduzierten Planner-Matrix abgeleitet;
- ohne Unit Conversion oder Serving-Skalierung;
- bei fehlendem Recipe oder fehlenden Ingredients sichtbar unresolved;
- ausdrücklich Draft und nicht geprüft.

Der Grocery Draft ist review-gated: Er darf nicht als persistierte,
abgehakte, bestellte oder bestätigte Einkaufsliste bezeichnet werden.

## 6. Nutrition Estimate Claim

`nutrition_estimate` bleibt ein optionales, manuell geliefertes Recipe-JSON.
Es ist `estimate_only` und keine automatische Berechnung. Verknüpfte Meals
dürfen diese Schätzung nur mit ehrlicher Provenance projizieren.

Nicht behauptet werden:

- gemessener oder berechneter Intake;
- exakte Calories oder Macros;
- Tagesziele, Defizite oder Zielerreichung;
- medizinische, diagnostische oder therapeutische Aussagen.

## 7. Deferred Work

Bewusst außerhalb des abgeschlossenen F1.2-Blocks bleiben:

- persistente Grocery Items und persistentes Check-off;
- Pantry;
- Ingredient Catalog, Aliase und Dedupe-Semantik;
- Unit Conversion;
- persistiertes Portions-/Serving-Modell für Meals;
- echte Calories-/Macro-Engine;
- externe Food APIs;
- Health-/Medical Claims;
- AI Nutrition Advice;
- echte Recipe Detail Route;
- Drag-and-drop Meal Planner.

Diese Punkte sind eigenständige spätere Slices. Sie schwächen nicht die
verbundenen Planungs-/CRUD-Kernflows, verhindern aber einen final-complete-
oder Intake-Engine-Claim.

## 8. Data-, Security- und Privacy-Grenze

- Recipes, Ingredients und Meals bleiben user-scoped.
- Mutations authentifizieren serverseitig und akzeptieren keine clientseitige
  `userId` als Trust Boundary.
- Relation Targets werden auf Same-User-Ownership geprüft.
- Keine Service Role im App-Flow.
- Grocery bleibt abgeleitet und erzeugt keine zweite Source of Truth.
- Nutrition bleibt `health_sensitive`; externe Verarbeitung braucht einen
  separaten Privacy-/Security-Scope.

## 9. Design Review

Was passt zu V5:

- Nutrition bleibt ein funktionaler P2-Kontext und konkurriert nicht mit
  Today Agenda oder Daily Control.
- Manual, Demo und Empty sind getrennt.
- Grocery Draft und Estimate-Provenance sind textgestützt und ehrlich.
- Keine neue Chart-, Card- oder Health-Advice-Fläche wurde eingeführt.

Was verletzt V5:

- Im Closure-Scope nichts Neues. Verbleibende Demo-Tiefe darf weiterhin nicht
  als Manual- oder Engine-Capability gelesen werden.

Konkrete Fixes:

- Keine UI-Fixes in F1.2I; Claim- und Deferred-Grenzen bleiben verbindlich.

Acceptance Decision: `PASS` für den docs-only Closure-Scope.

## 10. Nicht-Claims

F1.2I behauptet nicht:

- Nutrition final complete;
- Production- oder Remote-Readiness;
- persistierte Grocery Review;
- Pantry-/Bestellfähigkeit;
- vollständige Recipe Detail-Tiefe;
- Nutrition- oder Intake-Engine;
- gemessene oder berechnete Gesundheitswerte;
- Health-, Medical- oder AI-Advice.

## 11. Nächster Produktbereich

Die bestehende Roadmap setzt nach F1.2:

```text
F1.3 Resource/Skill Graph Read Model
```

F1.3 beginnt mit Relation Semantics, user-scoped Read Model und Proofs. Eine
dekorative Graph-Visualisierung ohne belastbare Datenbeziehungen ist nicht der
Startpunkt.

## 12. Migration und Browser-Proof

- Migration: keine.
- RLS-/Policy-/Grant-Änderung: keine.
- Remote DB: keine.
- Deployment: keines.
- Browser-Proof: nicht nötig, weil F1.2I ausschließlich Dokumentation ändert.

## 13. Completion Gate

```text
PASS_WITH_DEFERRED
```

Der angeforderte F1.2-Closure-Scope ist abgeschlossen. Die in Abschnitt 7
genannten Produktfähigkeiten bleiben bewusst deferred.

## 14. Validation

- `git diff --check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm build`: PASS
- Supabase local DB lint: PASS, no schema errors
- Supabase local security advisors: PASS, no issues
- Playwright: nicht nötig; docs-only, keine UI-/Verhaltensänderung
