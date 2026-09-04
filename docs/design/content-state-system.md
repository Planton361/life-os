# Content State System

Stand: 2026-06-24
Status: Historische R1.4a-Referenz, teilweise überholt
Aktive Wahrheit: `PRODUCT.md` und `DESIGN.md` definieren die Surface-Verträge und Acceptance. Diese Datei bewahrt Content-State-Evidence und darf sie nicht überschreiben.

Alle nachfolgenden R1.4a-Audits, Time-Progress-Referenzen,
Bottom-Zone-Annahmen und Slices sind historische Evidence, sofern sie nicht
ausdrücklich auf den aktiven Vertrag verweisen. Sie sind keine Freigabe für
neue Produkt- oder Layoutarbeit.

## Historische R1.4a Dashboard Reference Implementation

Dashboard ist ab diesem Stand die erste Referenzimplementierung fuer
`empty`, `partial` und `filled`.

Umgesetzt:

- Zentraler Vertrag in `src/features/content-state/index.ts`:
  `ContentState`, `AsyncState`, `ContentStateMeta`.
- Dashboard-ViewModels liefern testbare Metadaten:
  `data-content-state`, `data-item-count`, `data-capacity`, `data-profile-id`.
- Profile wechseln weiterhin nur die Datenquelle:
  `demo`, `empty`, `manual`.
- Die frühere Time-Progress-Referenz `Week`, `Month`, `Year` ist überholt.
  Der aktive Vertrag ist in `PRODUCT.md`: Monat, Woche und Tag.
- Quick Thought schreibt nur im `manual`-Profil in die lokale Inbox.
- Daily Control, Today Agenda, Meals Today, Habit Tracker und Active Portfolio
  behalten ihre V5-Shells und leiten State aus echter Datenmenge/Kapazitaet ab.
- Mood wird im `manual`-Profil lokal gespeichert und semantisch getoent.
- Anti-Rot Actions und Challenges bleiben natuerliche Empty-Shells ohne neue
  Feature-Engine.
- Challenges nutzen im Dashboard die sichtbare V5-Kapazitaet `3` pro aktiver
  Cadence; der groessere Demo-Pool gehoert nicht in `data-capacity`.

Nicht umgesetzt in R1.4a:

- Keine Supabase-, Auth-, RLS-, Migrations- oder Tabellenarbeit.
- Keine app-weite Umstellung aller Area Pages.
- Keine Challenge-, Anti-Rot-, Review- oder Nutrition-Engine.
- Keine Dashboard-Grid-Neukomposition.

## Scope

Dieser historische Stand dokumentiert R1.4 weiterhin als app-weites Slice-Modell. R1.4a
setzt davon zuerst das Dashboard um. Nicht-Dashboard-Routen bleiben in diesem
Dokument als Audit, Matrix und Implementierungsplan gefuehrt. Es wurden keine
Supabase-Dateien, keine Migrationen und keine Tabellen geaendert.

Die verbindliche Spezifikation liegt unter `docs/specs/r1-4-content-state-system.md`.

## Product Contract

Profile wechseln nur Datenquellen:

- `demo`: Design-Fixtures und akzeptierter V5-Referenzstand.
- `empty`: gleiche Shells, keine Nutzdaten, keine Demo-Strings.
- `manual`: lokale Daten aus `.local/life-os/manual-profile.json`, sonst gleiche Empty States wie `empty`.

Content States wechseln nur den Inhalt innerhalb bestehender Page-, Section- und Widget-Shells:

- `empty`: keine fachlichen Nutzdaten fuer die Section.
- `partial`: mindestens ein echter Eintrag, aber sichtbare Kapazitaet oder erwartete Dichte noch nicht erreicht.
- `filled`: vorgesehene sichtbare UI-Kapazitaet erreicht; weiteres Material gehoert auf Detailseiten.

Loading und Error bleiben technische Zustaende und duerfen nicht als `empty` modelliert werden.

## Required Meta

Die Dashboard-Referenzimplementierung definiert den Vertrag zentral:

```ts
export type ContentState = "empty" | "partial" | "filled";

export type ContentStateMeta = {
  state: ContentState;
  itemCount: number;
  capacity?: number;
  hasPrimaryValue?: boolean;
  hasHistory?: boolean;
};
```

Dashboard-Sections sind strukturell pruefbar:

```text
data-content-state="empty|partial|filled"
data-item-count="0"
data-capacity="8"
data-profile-id="demo|empty|manual"
```

## State Patterns

| Pattern | Einsatz | Empty | Partial | Filled |
| --- | --- | --- | --- | --- |
| Fixed Slot | Meals, Habits, Active Portfolio, Challenges, Anti-Rot | Slots bleiben sichtbar, naechster Add-Slot bleibt erreichbar | echte Items plus Add-Slot an naechster freier Stelle | sichtbare Kapazitaet erreicht, Add-Slot weg oder deaktiviert |
| Collection | Inbox, Resources, Journal, Notes, Sessions, Rows | ein Empty State pro Collection, keine Placeholder-Serie | echte Rows/Cards, sichtbare Menge begrenzt | sichtbare Menge gefuellt, Overflow fuehrt zur Detailseite |
| Metric / Trend | Sleep, Weight, Nutrition, Running, Mood | unbekannt ist nicht `0`, ausser fachlich echter Nullwert | Primaerwert ohne ausreichenden Trend | Primaerwert plus Verlauf/Trend |
| Timeline / Calendar | Today Agenda, Calendar, Today Stream | Raster bleibt, keine Fake-Termine | echte Blocks im bestehenden Raster | vorgesehene sichtbare Dichte erreicht |
| Chart / Visualization | Heatmaps, rhythm charts, progress visuals | neutrale Achse oder kompakte Empty-Erklaerung | vorhandene Punkte plus neutrale Luecken | Demo-Komposition mit echten Daten |
| Inspector / Detail | Inbox Active Item, Resource Inspector, Portfolio Context | ruhiger `nothing selected` State | ausgewaehltes echtes Item | volle Detaildaten fuer echtes Item |

## V5 Review

Was passt zu V5:

- Die bestehenden Shells sind ueberwiegend matte, dichte V5-Flachen mit klarer Card-Aufgabe.
- `src/features/profile-data` verhindert fuer viele Routen bereits Demo-Fixtures ausserhalb `demo`.
- Gestaltete Area Pages bleiben fuer `empty` und `manual` groesstenteils erhalten.
- Mehrere Seiten haben bereits natuerliche Empty States innerhalb bestehender Cards.

Was verletzt V5:

- Einige Empty States sind noch technische Profil-Copy, z. B. `Manual local profile`, `Empty profile`, `Profile boundary` oder `Not wired`.
- Dashboard Empty/Manual ersetzt Time Progress durch Profil-/Task-/Inbox-Werte, statt Week/Month/Year systembasiert zu lassen.
- Dashboard Meals ist aktuell eine leere Collection, nicht das geforderte Breakfast/Lunch/Dinner Fixed-Slot-Muster.
- Inbox Queue, Today Teilbereiche und mehrere Area-Collections rendern bei 0 Items teils einfach leer oder wiederholen generische `No ... yet` Copy.
- Manual-Create-Flows existieren nur fuer Task, Inbox Item, Project und Goal. Viele aktive Add-/Change-Buttons sind client-only und nicht reload-stabil.

Konkrete Fixes:

- Zentralen `ContentStateMeta`-Resolver einfuehren und alle relevanten Widgets mit QA-Attributen ausstatten.
- Profilnamen aus fachlichen Dashboard-/Page-Karten entfernen; Profilstatus bleibt Settings/Sidebar.
- Dashboard P0/P1 zuerst korrigieren: Daily Control CTA, Time Progress, Today Agenda, Quick Thought, Habits, Active Portfolio.
- Danach Core Pages und Area Pages auf echte Empty/Partial/Filled-Kontrakte bringen.
- Manual Store nur soweit erweitern, wie R1.4 Create-Flows verlangt; keine Supabase-Arbeit.

Acceptance Decision:

`PASS_WITH_FIXES`

## Current Audit Summary

Sauber oder nah dran:

- `/portfolio`, `/tasks`, `/projects`, `/goals`, `/skills`: gleiche Entity-Card-Komponenten fuer Demo und Manual, Workbench-/Preview-Empty-States vorhanden.
- `/calendar`: gleiche Calendar-Block-Komponenten fuer Demo und Manual Tasks, Empty-Raster bleibt sichtbar.
- `/health/mental`: referenznahes Empty-Verhalten mit gleicher Mental-Health-Shell.
- Viele Area-Routen sind ueber `src/features/profile-data/area-view-models.ts` profilfaehig angeschlossen.

Teilweise:

- `/dashboard`: Shell bleibt erhalten, aber mehrere Widgets sind nicht R1.4-konform.
- `/inbox`: Manual Item laeuft durch dieselbe Row-Optik, aber Queue-Empty, Active-Item-Empty und AI-Empty sind noch nicht sauber getrennt.
- `/today`: Manual Tasks/Inbox erscheinen im Stream, aber Opening/Closing/Decisions/Artifacts brauchen sichtbare Empty States.
- `/resources`: mehrere gute Empty States, aber einige Relation-Empty-Texte sind noch zu mock-/technical-literal.
- Area Pages: Sanitizer reduziert Demo-Arrays, aber leitet keine `partial/filled` States aus echten Manual-Daten ab.

Nicht R1.4-ready:

- `/review/daily` und `/timeline` nutzen fuer `empty`/`manual` noch `ProfileBoundaryPage`.
- `/coding/knowledge`, `/life/entertainment/games`, `/life/entertainment/books`, `/life/entertainment/series`, `/life/entertainment/movies`, `/work/meetings` sind Skeleton-Routen ohne echte Content-State-Matrix.
- Manual Store fehlen Habits, Meals, Mood, Reviews, Challenges, Anti-Rot-Konfiguration, Resources und viele Area-Daten.

## Implementation Plan In Slices

### Slice 0 - Contract And Test Selectors

Ziel: App-weiten Content-State-Vertrag ohne sichtbare Layout-Aenderung einfuehren.

Dateien lesen:

- `AGENTS.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `docs/specs/r1-4-content-state-system.md`
- `src/features/profile-data/**`
- `src/features/dashboard/**`
- `src/components/dashboard/**`

Dateien aendern:

- kleines neues Type/Helper-Modul fuer `ContentState` und `ContentStateMeta`
- nur betroffene ViewModel-Mapper und Komponenten, die QA-Attribute bekommen

Nicht aendern:

- Supabase, Migrationen, Tabellen, Auth, Demo-Fixtures, Dashboard-Layoutwerte

Akzeptanz:

- State wird aus Datenmenge/Kapazitaet abgeleitet, nicht aus Profilnamen.
- Erste Widgets liefern `data-content-state`, `data-item-count`, `data-capacity`, `data-profile-id`.

Pruefung:

- `git diff --check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`

### Slice 1 - Shared State Primitives

Ziel: Kleine designneutrale Primitives fuer card-interne Zustaende einfuehren.

Primitives:

- `SectionEmptyState`
- `AddSlotTile`
- `EmptyMetricValue`
- `EmptyChartFrame`
- `PageFirstRunNotice`
- `EmptyInspectorState`

Akzeptanz:

- Keine Page-Komposition wird ersetzt.
- Primitives nutzen V5 Tokens, 1px Borders, matte Flaechen und sichtbaren Fokus.
- Keine generische Boundary Page fuer gestaltete Pages.

### Slice 2 - Dashboard P0/P1

Ziel: Dashboard als kritischsten Entry Point R1.4-ready machen.

Reihenfolge:

1. Command Center Copy bereinigen und Profilnamen aus fachlichen Karten entfernen.
2. Time Progress wieder Week/Month/Year systembasiert machen.
3. Daily Control Empty/Partial/Filled mit `Create task`, `Choose task`, `Open task`.
4. Today Agenda mit echtem Timeline-State und Manual Task-Zeitplatzierung absichern.
5. Quick Thought an Manual Inbox-Mutation anschliessen.
6. Habit Tracker 0-8 plus Add-Tile-Kontrakt.
7. Active Portfolio 0-4 plus Add-Tile-Kontrakt.
8. Meals Today als drei feste Slots modellieren.

Akzeptanz:

- Keine V5-Grid-, Height-, Gap-, Padding- oder Reihenfolge-Aenderung.
- P0 bleibt dominant.
- Alle sichtbaren aktiven CTAs sind funktional oder fuehren zu einer existierenden Create-Page.

### Slice 3 - Core Pages

Ziel: Inbox, Today, Calendar, Entity Workbenches und Portfolio konsistent machen.

Reihenfolge:

1. Inbox Queue Empty State, Active Item Empty Inspector, AI Empty Planning und Checklist 0/4.
2. Today First-Run, Opening Review, Activity Stream, Delta, Decisions/Artifacts, Closing Review.
3. Calendar Empty innerhalb Raster, selected block Empty Inspector, schedulable task Empty.
4. Entity Workbenches um `ContentStateMeta` und Create-CTA-Dokumentation erweitern.
5. Portfolio List/Context um `empty/partial/filled` und 0/4 Dashboard-Kapazitaet angleichen.

### Slice 4 - Area Pages

Ziel: Sanitizer-Zwischenstand durch explizite Section-State-Metadaten ersetzen.

Reihenfolge:

1. Resources, Health, Nutrition und Portfolio-nahe Areas zuerst.
2. Coding, Life, Education, Work danach.
3. Shop und Challenges als P1 Utility zuletzt.
4. Skeleton-Routen separat als `skeleton`, nicht als R1.4 `empty`.

Akzeptanz:

- Genau ein Empty State pro Collection-Section.
- Fixed Slots duerfen leere Slot-Cards behalten.
- Charts zeigen keine erfundenen Werte.
- Manual Items verwenden dieselben Cards wie Demo.

### Slice 5 - Manual Create Readiness

Ziel: Manual Store minimal erweitern, damit aktive R1.4-CTAs reload-stabil sind.

Reihenfolge:

1. Quick Thought -> Inbox.
2. Task mit Datum, Uhrzeit, Dauer, Area.
3. Habit Create und Dashboard-Auswahl.
4. Meal Slot planen/erfassen.
5. Mood Check setzen.
6. Opening/Closing Review starten.
7. Challenge Create mit Rhythmus.
8. Anti-Rot/Habit-Auswahl konfigurieren.

Nicht-Ziele:

- keine Supabase-Anbindung
- keine Tabellen
- keine Auth-Architektur
- keine externe Sync-Integration

### Slice 6 - QA And Live Test Readiness

Ziel: R1.4 strukturell und manuell pruefbar machen.

Pruefung:

- `git diff --check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- spaeter, wenn UI umgesetzt ist: `pnpm qa:dashboard`
- spaeter, wenn E2E ergaenzt ist: `pnpm test:e2e`

Akzeptanz:

- Demo zeigt Demo-Fixtures.
- Empty zeigt keine Demo-Strings.
- Manual Reset entspricht Empty.
- Manual Partial und Filled erreichen die dokumentierten Kapazitaeten.
- Keine Layout-Kollapse, keine horizontalen Mobile-Overflows, keine Hydration Errors.
