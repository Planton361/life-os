# Manual DB Test Data Hygiene

Stand: 2026-06-28
Status: Active
Scope: R1.8.2 Manual DB Test Data Hygiene / Proof Stability

## 1. Warum lokale Manual-DB akkumuliert

Manual Browser Proofs schreiben echte lokale Supabase-Daten. Diese Proofs laufen bewusst ohne globales `supabase db reset`, damit Auth-State, RLS, Reload-Stabilitaet und reale ReadModels unter lokaler Nutzung beweisbar bleiben. Dadurch sammeln sich Inbox Items, Tasks, Projects, Goals, Resources, Recipes, Meals, Skills, Skill Evidence, Recurring Templates und generierte Task-Instanzen ueber mehrere Laeufe an.

## 2. Kein DB Reset by Default

Ein leerer lokaler DB-Zustand darf nicht Voraussetzung fuer einen Manual Proof sein. `supabase db reset` ist kein Standard-Testschritt und braucht Stop plus explizite Freigabe, weil er lokale Proof-Historie und Auth-/Seed-Annahmen veraendert.

## 3. Eindeutige Testdaten-Prefixes

Persistente Tests muessen fachliche, suchbare Prefixes verwenden, zum Beispiel:

- `Manual Inbox ...`
- `Manual Portfolio ...`
- `Manual Recurring ...`
- `Manual Nutrition ...`
- `R173C Resource ...`
- `AI Inbox ...`

Der Prefix soll den Flow benennen. Er darf nicht wie Demo-Content wirken.

## 4. Timestamp/UUID-Suffixe

Neue persistente Titel brauchen einen eindeutigen Suffix. R1.8.2 nutzt `uniqueTitle(prefix)` fuer kritische Flows. Das kombiniert Zeitstempel und kurzen Zufallssuffix, damit wiederholte oder schnelle lokale Laeufe nicht kollidieren.

## 5. Selection ueber URL oder konkrete Region

Beweise sollen frisch erzeugte Objekte gezielt selektieren:

- Inbox: Queue Item anklicken und Active Item pruefen.
- Portfolio: Entity-Link in `[data-portfolio-section="entity-list"]` oeffnen und `#selected-entity-heading` pruefen.
- Resources: Resource-Link in `[data-resources-section="library"]` oeffnen und `#selected-resource-heading` pruefen.
- Nutrition: Meal/Recipe nur in der passenden Page-Region oder einem konkreten Panel pruefen.
- Skill Evidence: im Portfolio Context Panel pruefen, nicht global.

## 6. Keine Listenpositionen als Beweis

Tests duerfen nicht annehmen, dass ein neuer Datensatz ganz oben steht. Sortierung, Grouping, Limits, Scroll-Container und vorhandene Proof-Daten koennen die sichtbare Reihenfolge veraendern. `.first()` ist nur akzeptabel, wenn vorher auf einen eindeutigen Titel oder eine konkrete Region gefiltert wurde.

## 7. Reload-Stabilitaet

Ein Write-Proof braucht nach Moeglichkeit:

- Create/Confirm-Aktion.
- gezielte Auswahl oder scoped Assertion.
- Reload oder erneutes Oeffnen der Zielseite.
- erneute scoped Assertion.

Wenn das Zielobjekt wegen lokaler DB-Dichte nicht stabil in einer Liste beweisbar ist, muss der Test den stabileren Zustand pruefen, zum Beispiel Inbox-Resolve in Queue und Active Item.

## 8. Umgang mit Skips

Skips bleiben erlaubt, wenn ein Flow eine lokale Supabase Auth Session oder einen bestimmten Empty-State braucht. Skips muessen den Grund konkret nennen:

- Auth-State fehlt.
- Manual-DB ist gefuellt und der Test beweist einen Empty-State.
- Zieltargets fehlen fuer einen Add-to-existing-Flow.

Skips duerfen nicht dazu dienen, echte App-Fehler zu verstecken.

## 9. Wann DB Cleanup erlaubt waere

DB Cleanup waere nur mit eigener Freigabe sinnvoll, wenn ein separater QA-Block eine lokale Testdaten-Retention definiert. Erlaubte Varianten waeren dann eng begrenzt:

- Cleanup nur fuer bekannte Test-Prefixes.
- Kein Loeschen von privaten oder manuell angelegten Daten.
- Kein Remote-Zugriff.
- Kein Service Role Key.
- Kein globales Reset ohne vorherige Bestaetigung.

## 10. Was nie gestaged wird

Nicht stagen:

- `.local/`
- `private/`
- `docs/product/life-os-full-roadmap-checklist.md`
- `next-env.d.ts`
- `supabase/.temp/**`
- `supabase/.branches/**`

## Leitregel

Tests sollen beweisen, dass frisch erzeugte Daten sichtbar und persistiert sind, aber nie voraussetzen, dass die lokale Manual-DB leer ist.
