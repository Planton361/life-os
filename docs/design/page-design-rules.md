# Page Design Rules

Stand: 2026-06-19
Status: Active
Zweck: Operative Designgrundlage fuer neue Life-OS-Seiten in Figma und spaeter in Code.
Quelle der Wahrheit: `DESIGN.md`, `PRODUCT.md`, `DATA_MODEL.md`, `ROADMAP.md`, `docs/design/*`, `docs/product/pages-and-routes.md` und `docs/product/navigation-and-source-of-truth-blueprint.md`.
Gilt fuer: neue Seiten, Page-Skeletons, Figma-Entwuerfe, Page Contracts, Designreviews und spaetere UI-Umsetzung.
Nicht gilt fuer: Dashboard-Redesigns, App-Routen, React-/Next.js-Code, Sidebar-Code, Supabase, CRUD, Migrationen, Tailwind, globale CSS-Dateien oder Design-Token-Aenderungen.

## Kurzfassung

Neue Life-OS-Seiten uebernehmen die V5-Haltung, nicht das Dashboard-Grid.

```text
Life OS - Linear Calm Dark Command Center
Dashboard Overhaul V5 - Subtle Color Identity Polish
```

Das Produktmodell bleibt:

```text
Dashboard = Steuerung
Bereichsseiten = Kontext
Detailseiten = Tiefe
Archiv = Vergangenheit
```

Neue Seiten muessen eindeutig wie Life OS wirken: dunkel, ruhig, matt, praezise, scanbar und semantisch gefuehrt. Sie duerfen aber nicht wie kopierte Dashboard-Widgets aussehen. Dashboard V5 bleibt die visuelle Wahrheit und wird nicht neu gestaltet.

## Quellenhierarchie

1. Root-Wahrheiten: `PRODUCT.md`, `DESIGN.md`, `DATA_MODEL.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `AI_WORKFLOW.md`.
2. Design-Detailquellen: `docs/design/dashboard-v5.md`, `docs/design/dashboard-layout-lock.md`, `docs/design/design-tokens.md`, `docs/design/component-system.md`, `docs/design/visualization-rules.md`, `docs/design/effects-and-motion.md`, `docs/design/anti-ai-slop.md`, `docs/design/figma-handoff.md`.
3. Produkt- und Navigationsquellen: `docs/product/pages-and-routes.md`, `docs/product/navigation-and-source-of-truth-blueprint.md`, `docs/product/ux-flows.md`, `docs/product/feature-spec.md`.
4. Discovery-Kontext: `docs/product/LIFE_OS_FUNKTIONSKATALOG.md` bleibt Pruefbasis, aber keine hoehere operative Wahrheit als die aktiven Root- und Produktdokumente.

Bei Widerspruch gilt: aktive Root-Wahrheit vor Detaildokument, Detaildokument vor Discovery-Draft, Dashboard V5 vor externem Designimpuls.

## Grundprinzip

Eine neue Seite braucht zuerst einen Page Contract:

```text
Page Type:
Primary Purpose:
Writes:
Reads:
Canonical Source:
Sensitive Data:
Primary Decision:
Main Zone:
Empty State:
Mobile Order:
```

Ohne Page Contract wird nicht in Figma ueberpoliert. Die Seite muss klaeren, welche kanonischen Daten sie erzeugt oder veraendert, welche Daten sie nur projiziert und welche Entscheidung oder Handlung sie unterstuetzt.

## Zentrale Designregeln

- Dashboard V5 bleibt visuelle Wahrheit.
- Dashboard wird nicht neu gestaltet und nicht als Standardraster kopiert.
- Neue Seiten nutzen Shell, Sidebar-Kontext, dunkle matte Flaechen, praezise Borders, ruhige Cards und semantische Farbe.
- Farbe ist semantisch, nicht dekorativ.
- Jede wichtige Farbinformation braucht ein Textlabel.
- Visualisierung ist nur erlaubt, wenn sie Entscheidung, Verhalten oder Orientierung verbessert.
- Cards haben eine klare Aufgabe, einen erkennbaren Header und begrenzte Mikrotexte.
- Typografie ist scanbar und hierarchisch.
- Microcopy ist knapp, ruhig und handlungsorientiert.
- Jede Seite hat genau eine H1.
- Eine Seite hat maximal eine dominante Hauptzone.
- Empty States erklaeren den spaeteren Workflow und helfen beim naechsten Schritt.
- Fokus, Keyboard-Navigation und Touch-Bedienung werden von Anfang an mitgedacht.
- Mobile Reihenfolge wird bewusst festgelegt, nicht aus Desktop erraten.
- Area-Unterseiten sind Views oder Workflows auf kanonischen Daten, keine Datensilos.
- Analytics, Reports und Previews sind abgeleitet und keine zweite Rohdatenquelle.

## Harte Verbote

- Keine Neon-Gradients.
- Keine Glass-Lawine.
- Keine generische Tailwind-SaaS-Optik.
- Keine generische AI-Slop-Optik.
- Keine Chart-Flut.
- Keine Tabellenwand als Standard.
- Keine uebertriebene Gamification.
- Keine zufaelligen neuen Farben.
- Keine unbeschrifteten Charts.
- Keine grossen Donut-Waende.
- Keine unklaren Icon-only Actions.
- Keine Dashboard-Duplikate.
- Keine Fake-Daten ohne spaetere Datenquelle.
- Keine Figma-Uebergestaltung vor Page Contract.

## Page-Typen

### 1. Entry Point / Control Page

Beispiele:

- Dashboard
- Today
- Calendar

Zweck:

- aktuellen Zustand zeigen
- naechsten Schritt sichtbar machen
- schnelle Steuerung ermoeglichen

Regeln:

- hohe Scanbarkeit
- klare Prioritaeten
- keine tiefe Datenverwaltung
- P0-Informationen dominieren
- sekundare Signale bleiben leise

Dashboard ist der Sonderfall dieses Typs und bleibt locked. Today und Calendar duerfen den Daily Flow erweitern, aber das Dashboard nicht duplizieren.

### 2. Portfolio / Entity Workbench

Beispiele:

- Portfolio
- Tasks
- Projects
- Goals
- Skills
- Resources

Zweck:

- kanonische Entities verwalten
- Status, Filter, Fortschritt, Beziehungen und Links sichtbar machen
- uebergreifende Triage und Pflege ermoeglichen

Regeln:

- Uebersicht zuerst
- Filter leise und zweckgebunden
- Details ueber Cards, Listen, Drawers oder Detailseiten
- keine Super-Table als Standard
- kein Area-Klon der gleichen Daten
- Progress sparsam und mit Textbegruendung

Eine Workbench darf dichter sein als eine Area Overview, muss aber weiterhin ruhig, scanbar und handlungsorientiert bleiben.

### 3. Area Overview

Beispiele:

- Health & Fitness
- Nutrition
- Coding
- Life
- Education
- Work

Zweck:

- Kontext einer Lebens- oder Arbeitsarea geben
- gefilterte Views auf zentrale Daten zeigen
- Area-spezifische Signale, offene Punkte und naechste Schritte buendeln

Regeln:

- Area-Status oben
- 2 bis 4 Hauptsignale
- lokale Unterseiten sichtbar machen
- kanonische Daten nicht kopieren
- Analytics nur als Preview, nicht als Hauptlast
- sensible Daten bewusst kennzeichnen und ruhig behandeln

Area Overview ist Kontext, nicht Steuerzentrale. Die Seite darf lokale Schwerpunkte setzen, aber nicht das Dashboard nachbauen.

### 4. Area Subpage / Domain Page

Beispiele:

- Health Running
- Nutrition Recipes
- Coding Repositories
- Education Literature
- Work Wiki

Zweck:

- fokussierter Arbeitsbereich innerhalb einer Area
- lokaler Workflow, gefilterte Entity-Sicht oder Domain-spezifische Sammlung

Regeln:

- klarer lokaler Zweck
- erkennbare Verbindung zur kanonischen Quelle
- lokale Navigation statt zweiter Sidebar-Wand
- Empty State erklaert den spaeteren Workflow
- keine verdeckte Kopie von Resources, Tasks, Projects oder Skills

Domain Pages duerfen fachlich tiefer werden als Area Overviews. Sie brauchen trotzdem einen kurzen Zweck, eine H1 und klare Grenzen.

### 5. Detail Page

Beispiele:

- Project Detail
- Goal Detail
- Skill Detail
- Resource Detail
- Journal Entry
- Inventory Item

Zweck:

- Tiefe eines kanonischen Objekts zeigen
- Beziehungen, Historie, Quellen, Entscheidungen, Aktivitaet und Notizen zusammenfuehren

Regeln:

- Objektkopf mit Name, Typ, Status und kurzem Zweck
- Metadaten ruhig und scanbar
- Beziehungen sichtbar, aber nicht dominant
- Activity, Notes, Resources und Decisions als getrennte Sektionen
- keine Dashboard-Dichte
- keine Kennzahlen ohne Herkunft oder Aussage

Detailseiten duerfen scrollen. Der erste Screen muss trotzdem Objekt, Status und naechste sinnvolle Handlung klaeren.

### 6. Analytics / Insight Section

Beispiele:

- Health Analytics
- Nutrition Analytics
- Portfolio Roadmap
- Review Reports

Zweck:

- Muster erkennen
- Fortschritt verstehen
- Entscheidungen ableiten
- Plan, Actual und Outcome unterscheidbar machen

Regeln:

- Charts nur mit Aussage
- kleine, klare Visualisierungen
- Textzusammenfassung neben oder ueber dem Chart
- keine BI-Wand
- keine Korrelation als Kausalitaet darstellen
- Datenherkunft und Zeitraum sichtbar machen
- Health- und Mental-Health-Insights nicht als Diagnose formulieren

Analytics bleibt eine abgeleitete Schicht. Sie darf Rohdaten nicht ersetzen und Area Overviews nicht verdraengen.

### 7. System / Utility Page

Beispiele:

- Settings
- Shop
- Challenges
- Archive spaeter

Zweck:

- Konfiguration, Motivation, Archiv oder Systemstatus sichtbar machen

Regeln:

- ruhig und eindeutig
- nicht produktivitaetsdominant
- keine Gamification-Ueberladung
- keine manipulativ wirkenden Belohnungsmechaniken
- Security- und Privacy-Kontexte klar beschriften

Utility Pages duerfen funktional und dichter sein. Sie muessen aber weiterhin V5-kompatibel, fokussiert und zugaenglich bleiben.

## Standard-Seitenaufbau

Dieses Muster ist eine Leitplanke, kein starres Grid:

```text
Page Header
-> kleine Kategoriezeile
-> eine H1
-> kurzer Zwecktext
-> optional Status / Scope / Last updated

Primary Zone
-> wichtigste Arbeitsflaeche oder Hauptsignal

Support Grid
-> 2 bis 4 unterstuetzende Cards

Context / Links
-> lokale Unterseiten, verwandte Entities, naechste Schritte

Empty / Skeleton State
-> hilfreicher Hinweis, was spaeter hier passiert

Optional Deep / Analytics Section
-> nur wenn es Entscheidungsnutzen hat
```

Nicht jede Seite braucht alle Abschnitte. Wenn ein Abschnitt keinen echten Zweck hat, wird er weggelassen.

## Unterschiede der Seitentypen

| Typ | Hauptfrage | Dominante Zone | Dichte | Visualisierung |
|---|---|---|---|---|
| Overview | Was ist hier gerade relevant? | Status oder Hauptsignal | mittel | Preview |
| Workbench | Was muss gepflegt, gefiltert oder entschieden werden? | Liste, Card-Stack oder Arbeitsflaeche | mittel bis hoch | sparsam |
| Area | Was bedeutet der globale Zustand in diesem Kontext? | Area-Status und Hauptsignale | mittel | leise |
| Detail | Was ist die Tiefe dieses Objekts? | Objektkopf und zentrale Sektion | variabel | nur mit Herkunft |
| Analytics | Welches Muster hilft bei einer Entscheidung? | Insight mit Textaussage | mittel | fokussiert |
| Empty State | Was passiert hier spaeter? | hilfreiche Erklaerung und naechster Schritt | niedrig | keine Deko |

## Figma-Regeln

- Neue Seiten zuerst als Low-Fidelity-Layout im V5-Stil anlegen.
- Keine komplett neue Designrichtung pro Seite.
- Bestehende Dashboard-Shell als Kontext verwenden.
- Sidebar bleibt sichtbar, wird aber nicht neu entworfen.
- Desktop/WQHD zuerst denken.
- Danach mobile Reihenfolge notieren.
- Jede Page bekommt einen klaren Page Type.
- Jede Page bekommt maximal eine dominante Hauptzone.
- Lokale Navigation als Tabs, Chips, Cards oder Subnav darstellen, nicht als zweite Sidebar-Wand.
- Placeholder muessen echten spaeteren Zweck erklaeren.
- Keine Fake-Daten ohne spaetere Datenquelle.
- Keine dekorativen Charts.
- Kein Figma-Overdesign vor Page Contract.
- Figma ist Referenz und Arbeitsmittel, nicht automatische Code-Struktur.

## Layout-Leitplanken

- WQHD Desktop ist der primaere Arbeitsmodus.
- Sidebar und App Shell bleiben stabil.
- Content darf scrollen, aber der Hauptzweck muss im ersten Screen erkennbar sein.
- Hauptbereich nicht zu breit ohne Struktur.
- Cards verwenden konsistente Dichte.
- Keine unkontrollierte Masonry-Wand.
- Dashboard-Grid nicht blind auf jede Seite kopieren.
- Overview-Seiten duerfen 1 bis 2 groessere Panels und mehrere kleinere Cards haben.
- Workbench-Seiten duerfen Listen nutzen, aber keine Tabellenwand.
- Detailseiten duerfen tiefer scrollen.
- Mobile darf keine horizontalen Overflows erzeugen.
- Mobile Reihenfolge folgt Produktprioritaet, nicht Desktop-Spaltenreihenfolge.

## Komponenten-Patterns

Erlaubte Patterns:

- Page Header
- Section Header
- Matte Card
- Status Pill
- Progress Bar
- Compact List
- Timeline
- Relationship Card
- Empty State Card
- Source / Provenance Hint
- Local Navigation Tabs
- Filter Chips
- Quiet Analytics Preview
- Action Row

Verbotene Patterns:

- Neon Glow Cards
- Glass ueberall
- ueberladene Tabellen
- unbeschriftete Charts
- grosse Donut-Flut
- bunte XP-/Game-UI
- unklare Icon-only Actions
- zufaellige neue Farben
- Dashboard-Duplikate

## Pattern-Regeln

### Page Header

- enthaelt Kategorie, H1, Zwecktext und optional Status
- keine Marketing-Hero-Flaeche
- keine grossen dekorativen Gradients
- keine zweite Navigation im Header erzwingen

### Matte Card

- eine Aufgabe pro Card
- Header mit Label, optional Count oder Status
- Inhalt begrenzt und scanbar
- Footer nur bei echter Aktion oder Detail-Link

### Status Pill

- Status immer als Text
- Farbe nur als Unterstuetzung
- Statuswerte aus Produkt- oder Datenmodell ableiten
- keine dekorativen Pill-Sammlungen

### Progress Bar

- Progress Bar vor Ring
- Wert oder Bedeutung als Text
- Fortschritt nur zeigen, wenn Quelle oder Logik nachvollziehbar ist
- Skills brauchen Evidence, nicht nur Prozent

### Compact List

- geeignet fuer Workbench, Related Items, Recent Activity und Links
- klare Item-Hierarchie: Titel, Meta, Status, Aktion
- keine Liste ohne Filter- oder Entscheidungsnutzen

### Timeline

- geeignet fuer Today, Calendar, Activity, Milestones und History
- trennt Plan, Actual und Reflection
- nicht fuer dekorative Verlaufserzaehlung verwenden

### Empty State Card

- erklaert, warum die Seite leer ist
- nennt, was spaeter hier entsteht
- bietet einen echten naechsten Schritt oder verweist auf die kanonische Quelle
- keine austauschbare Motivationsfloskel

### Quiet Analytics Preview

- zeigt maximal wenige Hauptsignale
- hat eine klare Textaussage
- fuehrt bei Bedarf zu einer tieferen Analytics-Ansicht
- verdraengt keine Overview- oder Workbench-Aufgabe

## Page-spezifische Startregeln

### Portfolio

- zentrale Steuerung fuer Tasks, Projects, Goals und Skills
- kein Coding Showcase
- Roadmap Preview ist moeglich
- Active, Planned und Completed trennen
- Progress und Milestones sparsam visualisieren
- Details ueber Entity-Routen oder Cards, nicht als Dashboard-Kopie

### Resources

- zentrale Knowledge- und Resource-Workbench
- Source of Truth fuer Ressourcen
- Area Views duerfen Resources nur filtern oder verlinken
- Literature, Work Wiki, Coding Knowledge und Notes nicht doppelt speichern
- Quellen, Status und Provenance sichtbar machen

### Calendar

- zeitliche Projektion und Planning Surface
- Day, Week, Month und Year spaeter einplanen
- Review als rechter Panel- oder Side-View-Workflow
- keine Kalender-Sync-Komplexitaet im MVP
- Plan und Actual langfristig unterscheidbar halten

### Health & Fitness

- Mental Health, Habits, Running und Strength sichtbar machen
- Sleep nur als Datenquelle innerhalb Mental Health, Today, Recovery oder Analytics, keine sichtbare Hauptseite
- Health-Daten sensibel behandeln
- keine medizinischen Diagnosen oder Kausalversprechen
- Analytics als ruhige Preview statt Hauptlast

### Nutrition

- Meal Planner, Recipes und Grocery sichtbar machen
- keine volle Rezept- oder Naehrwertdatenbank im MVP erzwingen
- Plan und Actual spaeter trennen
- Grocery und Pantry als spaetere Flows beruecksichtigen
- Makros und Naehrwerte textlich erklaeren

### Coding

- Repositories, Agents, Skill Map und Knowledge sichtbar machen
- Agents nicht zu frueh ueberautomatisieren
- Skill Map und Knowledge verbinden Resources, Projects und Evidence
- Coding Portfolio nicht mit globalem Portfolio verwechseln
- Tool- und Agentenkontext mit Security-Grenzen behandeln

### Life

- Journal, Notes, Entertainment und Inventory sichtbar machen
- persoenliche Daten sensibel behandeln
- Entertainment als Collection, nicht als Produktivitaetsdruck
- Inventory, Wishlist und Purchase Decisions verlinken statt vermischen
- Journal und Mental-Health-Inhalte besonders ruhig darstellen

### Education

- Scientific Work, Literature und Learning Log sichtbar machen
- Masterarbeit ist Scientific Work, kein eigener Hauptnav-Punkt
- Literature ist Resource-Projection
- Research Topics, Resources und Skills verlinken
- wissenschaftliche Entscheidungen und Quellen nachvollziehbar machen

### Work

- Work Log, Wiki und Meetings sichtbar machen
- Work-Daten mit Privacy-Grenzen behandeln
- Follow-ups laufen ueber Work Log, Tasks oder Meetings
- Work Wiki ist View oder eigene Wissensseite mit klaren Resource-Links
- keine vertraulichen Inhalte in Fake-Daten oder externen Tools

## Scroll- und Overview-zu-Analytics-Pattern

Spaeter kann eine Area Overview aus zwei vertikalen Hauptabschnitten bestehen:

```text
1. Overview / Current State
2. Analytics / Trends
```

Regeln:

- Uebergang darf wie ein ruhiger Page-Switch wirken.
- Keine aggressive Animation.
- Muss ohne Motion verstaendlich bleiben.
- `prefers-reduced-motion` spaeter beachten.
- Analytics bleibt sekundaer und darf die Overview nicht verdraengen.
- Overview und Analytics brauchen getrennte inhaltliche Rollen.

## Accessibility-Regeln

- Eine H1 pro Seite.
- Logische Heading-Struktur.
- Sichtbarer Fokus.
- Links sind Links.
- Buttons sind Buttons.
- Keine `div`-onClick-Controls.
- Keine Information nur ueber Farbe.
- Charts mit Titel und Textaussage.
- Form Controls mit Label.
- Icon-only Buttons mit `aria-label`.
- Empty States mit hilfreichem Text.
- Touch Targets ausreichend gross.
- Hover-only Interaktion vermeiden oder immer Klick-/Tastatur-Alternative anbieten.
- Dark-UI-Kontrast pruefen.
- Keine horizontalen Mobile-Overflows.

## Security- und Privacy-Regeln

- Keine Secrets in Design, Mockdaten oder Dokumentation.
- Work-, Journal-, Mental-Health- und Health-Daten als sensibel behandeln.
- Health-Insights nicht als Diagnose formulieren.
- Work-Inhalte nicht ungeprueft an externe Tools oder AI geben.
- AI-generierte kritische Daten brauchen Review.
- Page Contracts muessen `Sensitive Data` benennen, wenn die Seite sensible Daten anzeigen kann.
- Spaetere Supabase-, RLS-, Auth- oder CRUD-Fragen gehoeren nicht in Figma-Polish, sondern in Phase-3-Scope.

## Review-Kriterien fuer neue Figma-Seiten

- Erkenne ich in 5 Sekunden den Zweck der Seite?
- Ist klar, was hier spaeter gespeichert oder nur angezeigt wird?
- Ist die Seite V5-kompatibel?
- Ist die Seite ruhiger als ein Analytics-Dashboard?
- Gibt es eine klare H1?
- Gibt es genau eine dominante Hauptzone?
- Gibt es keine Tabellenwand?
- Gibt es keine unnoetige Chart-Flut?
- Sind Empty States hilfreich?
- Bleiben Datenquellen und Views getrennt?
- Sind sensible Daten bewusst behandelt?
- Ist Mobile-Reihenfolge notiert?
- Ist Farbe semantisch und textgestuetzt?
- Sind Actions echte Handlungen oder klare Links?
- Wuerde die Seite auch ohne Effekt, Icon und Gradient funktionieren?

## Akzeptanzkriterien fuer neue Seiten

- Page Type ist benannt.
- Page Contract ist ausgefuellt.
- V5-Designrichtung ist erkennbar.
- Dashboard wurde nicht kopiert.
- Dashboard-Layout-Lock wurde nicht beruehrt.
- Kanonische Datenquelle ist klar.
- Overview, Workbench, Area, Detail, Analytics oder Empty State sind sauber unterschieden.
- Hauptzweck ist im ersten Screen erkennbar.
- Eine H1 ist vorhanden.
- Keine wichtige Information wird nur ueber Farbe vermittelt.
- Visualisierungen haben Aussage und Text.
- Empty State erklaert den spaeteren Workflow.
- Mobile-Reihenfolge ist dokumentiert.
- Sensitive Daten sind markiert und ruhig behandelt.
- Keine neue Library, kein neues Token-System und keine neue Designrichtung wurden eingefuehrt.

## Erste empfohlene Figma-Seite

Als erste neue Seite nach diesen Regeln sollte `Portfolio` entworfen werden.

Begruendung:

- `ROADMAP.md` nennt nach dem IA-/Source-of-Truth-Gate Route Skeletons und Area Skeletons.
- `PRODUCT.md` und `pages-and-routes.md` definieren Portfolio als Sammel- und Steuerungsbereich fuer Tasks, Projects, Goals und Skills.
- Portfolio prueft frueh, ob Workbench-Regeln, kanonische Entity-Grenzen, Progress, Filter und V5-Ruhe zusammen funktionieren.
- Portfolio ist wichtig genug fuer den Daily Flow, ohne das Dashboard selbst anzufassen.
