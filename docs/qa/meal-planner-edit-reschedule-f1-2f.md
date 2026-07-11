# F1.2F Meal Planner Edit / Reschedule Depth

Stand: 2026-07-11
Status: PASS

## 1. Zweck

Die Manual-Meal-Planner-Projektion bindet persistierte Meal-Updates im vorhandenen Inspector an. Ein Meal kann bearbeitet sowie auf ein anderes Datum und einen anderen Slot verschoben werden.

## 2. Nicht-Ziele

Kein Drag-and-drop, keine Planner-Neukomposition, keine Portionen, Makros, Grocery-Logik, Calendar-Integration, externe IDs, Migration oder Remote-DB-Aktion.

## 3. Meal Entity Audit

- Available Meal Fields: `recipe_id`, `date`, `meal_type`, `title`, `planned_at`, `completed_at`, `notes` sowie IDs/Timestamps.
- Existing Update Action: `updateMealAction`; F1.2F ergänzt nur `updateMealFormStateAction`.
- Existing Complete Action: `completeMealAction` und Form-State-Wrapper.
- Existing Repository Methods: `createMeal`, `updateMeal`, `completeMeal`, `getMealsByUserAndDateRange`.
- Existing Zod Schemas: Create, Update, Complete und Date Range.
- Current Manual Planner UI: aktuelle ISO-Woche aus Supabase, bisher read-only.
- Current Demo Planner UI: kuratierter lokaler Referenzzustand.
- Missing Binding: kein Manual-Formular im Meal Inspector.
- Safe Edit Scope: Datum, Meal Type, geplante Zeit, Titel, Notes und aktive Recipe-Relation.
- Migration Required: nein.

Der Planner-Tag wird durch `meals.date` bestimmt. Die sichtbare Zeit stammt aus `planned_at`; die Slotposition wird durch `date` plus `meal_type` bestimmt. Backendseitig erlaubt sind `breakfast`, `lunch`, `dinner`, `snack`, `other`; die Wochenmatrix bietet Breakfast/Lunch/Dinner. `recipe_id` ist nullable. Die Manual-Query lädt aktive Recipes und Meals von Wochenbeginn bis +30 Tage, die Projektion zeigt die aktuelle Woche. Historische Meals mit archiviertem Recipe bleiben in der DB, erscheinen in der aktiven Recipe-basierten Planner-Projektion aber nicht. Completed Meals bleiben editierbar.

## 4. Date/Planned-At Semantics

`date` ist der kanonische Planner-Tag. `planned_at` ist optional und liefert die Uhrzeit. Das Formular verschiebt beim Datumswechsel den lokalen Datumsanteil der geplanten Zeit mit; Zod lehnt abweichende Datumsanteile ab.

## 5. Backend Path

Manual Form → `updateMealFormStateAction` → `updateMealAction` → authentifizierter Supabase Client → Nutrition Repository → `public.meals` → Revalidation vorhandener Nutrition-, Dashboard- und Today-Routen.

## 6. Repository und Ownership

Der Patch ändert nur übergebene Felder. Meal und Update sind über `user_id` gescoped; neue Recipe-Relationen werden gegen aktive Same-User-Recipes geprüft. RLS bleibt aktiv. Kein Service Role.

## 7. UI Binding

Im bestehenden Meal Inspector erscheint im Manual-Profil `Meal bearbeiten` mit `Meal speichern`. Labels, sichtbarer Status, `role=status`, `role=alert` und Fokusziel sind vorhanden. V5-Struktur und Layout bleiben erhalten.

## 8. Edit Semantics

Leere Notes, geplante Zeit und Recipe-Auswahl werden zu `null`. Ein leerer Titel ist ungültig. Nicht übergebene Felder bleiben unverändert. `completed_at` ist kein Formfeld.

## 9. Reschedule Semantics

Datum und Meal Type verschieben die Projektion nach dem Write von Slot A nach Slot B. Reload liest dieselbe Position erneut aus Supabase.

## 10. Recipe Relation

Die Auswahl enthält nur aktive Recipes aus dem authentifizierten User-Scope. Demo- und archivierte Recipes werden nicht als neues Target angeboten. Bestehende archivierte Bezüge bleiben historisch erhalten.

## 11. Completed Meal Behavior

Completed Meals sind editierbar. Das Formular zeigt `Status: Abgeschlossen`; Update sendet kein `completed_at`, daher bleibt der Abschluss erhalten.

## 12. Manual/Demo/Empty

Manual nutzt echte Supabase-Daten und Actions. Demo behält lokale kuratierte Controls. Empty bietet keine Writes oder Demo-Meals. Ohne Auth bleibt `actionsEnabled` aus.

## 13. Browser Proof

Der Playwright-Test erstellt zwei Recipes und ein Meal, schließt es ab, ändert Titel/Notes, verschiebt Datum/Slot, wechselt das Recipe und prüft Success, alte/neue Position, Relation und Completion nach Reload.

Finaler Grep `Nutrition|Meal Planner|Meal`: 8 passed, 0 skipped, 0 failed.

## 14. Reload Stability

Nach Update wird neu geladen; der Test prüft persistierte Formularwerte und die neue Plannerposition nochmals nach separatem Reload.

## 15. Deferred Work

Recipe-lose und archivierte historische Meals als Plannerkarten, Snack/Other-Matrixslots, Drag-and-drop, Portionen, Grocery, Metrics und Calendar bleiben außerhalb F1.2F.

## 16. Connected Claim Impact

F1.2F schließt lokal die sichtbare Manual-UI-Lücke für Meal Edit, Reschedule und sicheren Recipe-Wechsel. Production-/Remote-Connected-Claims bleiben unverändert.
