# Nutrition Recipe / Meal Model Lock

Stand: 2026-06-27
Status: Active
Scope: R1.7.6 Nutrition Recipe / Meal Data Model Lock

## 1. Zweck

Dieses Dokument sperrt die Produkt- und Datenmodellsemantik fuer Nutrition. R1.7.6 fuehrt Nutrition nicht als vollstaendige Ernaehrungsplattform ein, sondern trennt Recipe, Meal, Meal Plan und Nutrition Log so, dass ein spaeteres persistentes MVP ohne Dashboard- oder Daily-Core-Verdrangung gebaut werden kann.

R1.7.6 baut keine Migration, keine Repository-Implementierung, keine Server Actions und keine UI-Neugestaltung.

## 2. Begriffe

- Recipe: Wiederverwendbare Zubereitungsvorlage, zum Beispiel Overnight Oats, Chicken Rice Bowl oder Protein Smoothie.
- Meal: Konkrete Mahlzeit an einem Tag. Sie kann auf einem Recipe basieren, muss aber nicht.
- Meal Plan: Planungsansicht fuer kommende Mahlzeiten. Im MVP keine eigene komplexe Entity, sondern aus Meals mit zukuenftigen Daten ableitbar.
- Nutrition Log: Rueckblick auf gegessene Mahlzeiten und subjektive Hinweise. Im MVP ueber `Meal.completedAt` und `Meal.notes` ausreichend.
- Nutrition Estimate: Optionale grobe Naehrwertschaetzung an einem Recipe. Keine Makro-Datenbank und keine medizinische Bewertung.
- Meal Type: Kontrollierter Wert fuer Tageskontext: `breakfast`, `lunch`, `dinner`, `snack`, `other`.

## 3. Recipe vs Meal vs Meal Plan vs Nutrition Log

Ein Recipe ist eine Vorlage. Es ist wiederverwendbar, hat optionale Anleitung, optionale Portionen, optionale Tags und optionale Naehrwertschaetzung. Ein Recipe ist nicht automatisch eine Mahlzeit im Daily Core.

Ein Meal ist das konkrete Tagesobjekt. Es traegt `date`, `mealType`, `title`, optional `recipeId`, optional `plannedAt`, optional `completedAt` und optional `notes`. Dashboard, Today und Calendar duerfen spaeter nur konkrete Meals oder aus Meals abgeleitete kompakte Signale anzeigen, nicht die gesamte Recipe Library.

Ein Meal Plan ist keine eigene MVP-Tabelle. Planung entsteht aus Meals mit Datum in Gegenwart oder Zukunft. Ein geplant gespeichertes Meal ohne `completedAt` ist ein offener Planpunkt.

Ein Nutrition Log ist keine eigene MVP-Tabelle. Ein gegessenes oder abgeschlossenes Meal mit `completedAt` und optionalen `notes` ist der Log-Eintrag. Detaillierte Logs, Makro-Ziele und Food-Entries sind spaetere Ausbaustufen.

## 4. MVP-Scope

R1.7.6 lockt als naechstes Datenmodellziel:

```text
recipes
meals
```

Das MVP soll:

- Mahlzeiten planbar machen.
- Rezepte als wiederverwendbare Bausteine speichern.
- Meals fuer einen Tag sichtbar machen.
- Nutrition kompakt in Dashboard und Today einordnen.
- Demo, Empty und Manual States ohne Fake-Fallbacks weiter respektieren.

Nicht im MVP:

- `ingredients`
- `recipe_ingredients`
- `nutrition_entries`
- `macro_targets`
- `grocery_lists`
- `meal_plan_templates`

## 5. Nicht-Ziele

R1.7.6 und das direkte MVP sind keine vollstaendige Kalorien-App und keine medizinische Ernaehrungsberatung.

Nicht bauen:

- externe Nutrition- oder Food-API
- Barcode Scanner
- automatische Makroanalyse
- AI Meal Suggestions
- Health-App-Integration
- Receipt-/OCR-Parsing
- vollstaendige Zutaten- oder Produktdatenbank
- Dashboard-Rekomposition
- neue Nutrition-UI
- neue Library

## 6. Entity Model

### recipes

Vorlaeufige Zielskizze fuer einen spaeteren Migrationsblock:

```text
id
user_id
area_id optional
title
summary optional
instructions optional
servings optional
prep_minutes optional
tags jsonb/text[]
nutrition_estimate jsonb optional
source optional
is_archived
created_at
updated_at
```

Regeln:

- `user_id` ist Pflicht.
- `title` ist nicht leer.
- `servings` ist optional, aber wenn gesetzt positiv.
- `prep_minutes` ist optional, aber wenn gesetzt positiv.
- `nutrition_estimate` bleibt grob und optional.
- Archivierte Recipes bleiben fuer alte Meals referenzierbar.

### meals

Vorlaeufige Zielskizze fuer einen spaeteren Migrationsblock:

```text
id
user_id
recipe_id optional
date
meal_type
title
planned_at optional
completed_at optional
notes optional
created_at
updated_at
```

Regeln:

- `user_id` ist Pflicht.
- `date` ist Pflicht und beschreibt das user-lokale Tagesdatum.
- `meal_type` ist kontrolliert: `breakfast`, `lunch`, `dinner`, `snack`, `other`.
- `title` ist Pflicht, auch wenn kein Recipe referenziert wird.
- `recipe_id` ist optional, weil manuelle Meals erlaubt bleiben.
- `planned_at` und `completed_at` sind optional.
- `notes` sind private Health-/Lifestyle-Daten und duerfen nicht fuer externe Auswertung verwendet werden.

## 7. Beziehungen

Ein Recipe kann viele Meals vorbereiten:

```text
recipes.id -> meals.recipe_id
```

Ein Meal gehoert genau einem User. Wenn `recipe_id` gesetzt ist, muss das Recipe demselben User gehoeren. Diese Ownership-Pruefung gehoert in Repository/Server Actions und zusaetzlich unter RLS.

`area_id` auf Recipes ist optional. Nutrition kann als Bereich ueber `area_key = nutrition` existieren, aber Recipes muessen nicht an ein Area-Objekt gebunden sein, solange die Area-Ownership nicht klar gebraucht wird.

Ingredients, Grocery und Macro Targets bleiben bewusst getrennt. Sie duerfen spaeter auf Recipes oder Meals referenzieren, sind aber nicht Teil des MVP-Kerns.

## 8. Daily Core Darstellung

Daily Core bleibt task- und entscheidungszentriert. Meals sind Tageskontext, kein Task-Ersatz.

Today darf spaeter zeigen:

- geplante Meals fuer heute
- abgeschlossenes Meal als kompakter Log-Hinweis
- offene Meal-Planung als Kontextsignal

Today darf nicht zeigen:

- komplette Recipe Library
- Makro-Dashboards mit hohem visuellen Gewicht
- automatische Tasks aus Meals ohne ausdrueckliche User-Entscheidung

Eine geplante Mahlzeit kann spaeter optional eine Task erzeugen, aber nicht automatisch durch dieses Datenmodell.

## 9. Dashboard Darstellung

Dashboard bleibt kompakt. Die bestehende Richtung `Meals Today`, `Nutrient Balance` und `Weight Loss Goal` darf spaeter aus echten Meals gespeist werden, aber nur als P1/P2-Snapshot.

Dashboard darf:

- aktuelle Tages-Meals kompakt anzeigen
- offene Slots zeigen
- einen Link in Nutrition oder Meal Planner anbieten
- grobe Naehrwertsignale zusammenfassen

Dashboard darf nicht:

- die Recipe Library als Hauptbereich anzeigen
- eine volle Kalorien-App nachbauen
- Today Agenda oder Daily Control visuell verdraengen
- neue Widgets fuer diesen Model Lock einfuehren

## 10. Privacy / Health Data Sensitivity

Nutrition kann Gesundheits-, Koerper- und Lifestyle-Daten beruehren. Persistente Nutrition-Daten sind als `health_sensitive` zu behandeln. Der aktuelle Overview-Contract nutzt noch `standard_private`; das ist ein dokumentierter Konsistenz-Gap fuer einen spaeteren Source-Fix.

Pflicht fuer eine spaetere Umsetzung:

- `user_id` auf jeder nutzerspezifischen Tabelle
- RLS fuer `authenticated` User mit `auth.uid() = user_id`
- keine Service Role in App-Flows
- keine Third-Party Analytics fuer Nutrition-Daten
- keine externen Nutrition APIs im MVP
- keine medizinischen Empfehlungen
- serverseitige Zod-Validierung fuer alle Mutationen
- Inputs mit Labels
- keine Information nur ueber Farbe

## 11. Migration Gate

R1.7.6 baut keine Migration.

Ein spaeterer R1.7.6B- oder R1.7.7-Scope darf eine lokale Migration nur bauen, wenn diese Punkte explizit freigegeben sind:

- `recipes` und `meals` bleiben der einzige MVP-Persistenzkern.
- Meal Plan bleibt aus Meals ableitbar.
- Nutrition Log bleibt aus `completed_at` und `notes` ableitbar.
- RLS-Policies sind fuer beide Tabellen definiert.
- Repository Interface und Supabase Repository sind geplant.
- Server Actions holen `user_id` aus Supabase Auth.
- Same-user Ownership fuer `recipe_id` wird geprueft.
- Typegen und Zod-Schemas werden aktualisiert.
- Keine Remote-DB, kein `supabase link`, kein `supabase db push`, kein `db reset`.

Aktuelle Feasibility: Das lokale Schema hat `area_key = nutrition`, aber keine Tabellen fuer `recipes`, `meals`, `ingredients`, `grocery` oder Nutrition Logs. Das bestehende Real-Data-Layer-Pattern ist verwendbar, aber Nutrition braucht einen eigenen lokalen Migrationsblock mit RLS und Repository.

## 12. Spaetere Ausbaustufen

Nach einem stabilen `recipes + meals` MVP koennen separat folgen:

- Ingredients
- Recipe Ingredients
- Nutrition Entries
- Macro Targets
- Grocery Lists
- Meal Plan Templates
- Receipt-/OCR-Flows
- Barcode Scanner
- externe Food-Datenbanken
- Health-App-Integration
- AI Meal Suggestions

Diese Ausbaustufen duerfen den Daily Core nicht dominieren und brauchen jeweils eigene Privacy-, RLS- und UX-Gates.

## 13. Akzeptanzkriterien

- Recipe, Meal, Meal Plan und Nutrition Log sind eindeutig getrennt.
- MVP-Entscheidung ist `recipes + meals`.
- Ingredients, Macro Targets, Grocery Lists und Meal Plan Templates sind nicht im MVP.
- Dashboard bleibt kompakt.
- Today bleibt Daily-Core-fuehrend.
- Persistente Nutrition-Daten gelten als `health_sensitive`.
- `user_id`, RLS und serverseitige Zod-Validierung sind fuer spaetere Mutationen Pflicht.
- Keine externe Nutrition API im MVP.
- Keine medizinischen Empfehlungen.
- Keine Migration in R1.7.6.
- Keine UI- oder Source-Code-Aenderung in R1.7.6.
