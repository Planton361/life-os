# Life OS - R1.7.7 Skill Model & Skill Map Lock

Stand: 2026-06-28
Status: Active Model Lock
Scope: Product/Data Model/IA Lock, keine Migration, keine UI-Implementierung

## 1. Zweck

Dieser Lock definiert Skill als eigene Life-OS-Entitaet, trennt Skill von Project, Goal, Resource, Habit und Task, und legt die Semantik fuer Skill Evidence, Skill Practice, Skill Progress und eine spaetere Skill Map fest.

Der Block bereitet eine spaetere Datenmodell- und UI-Umsetzung vor. Er baut keine Skill-Tabelle, keine Graph-UI und keine neue Visualisierung.

## 2. Begriffe

### Skill

Eine Skill ist eine Faehigkeit oder Kompetenz, die ueber Zeit aufgebaut, angewendet und durch konkrete Signale gestuetzt wird.

Beispiele:

- TypeScript
- wissenschaftliches Schreiben
- Lauftechnik
- Datenmodellierung
- Row Level Security
- Research Methodology

Skill ist nicht:

- kein einzelnes Project
- kein Goal
- keine Resource
- kein Habit
- keine Task
- kein frei erfundener Score

### Skill Evidence

Skill Evidence ist ein Nachweis oder Signal, dass eine Faehigkeit angewendet, verbessert oder sichtbar gemacht wurde.

Beispiele:

- abgeschlossene Task
- Project Outcome
- Resource gelesen oder angewendet
- Learning Log
- Work Output
- Review-Notiz
- manuell bestaetigte Praxisnotiz

Evidence ist kein automatischer AI-Claim. Evidence muss user-owned, nachvollziehbar und im MVP explizit oder aus bestehenden user-owned Entities abgeleitet sein.

### Skill Practice

Skill Practice ist eine gezielte Uebung oder wiederholte Anwendung einer Skill. Practice kann spaeter aus Tasks, Habits, Learning Logs, Work Logs oder manuell geplanten Uebungen entstehen.

Practice ist ein Verhalten oder eine Session, nicht die Skill selbst.

### Skill Progress

Skill Progress ist eine abgeleitete Einschaetzung. Im MVP wird Progress primaer ueber Evidence und Practice begruendet. Ein optionaler Status oder Level darf existieren, aber kein willkuerlicher Prozentwert ohne Evidenzgrundlage.

## 3. Skill vs Project vs Goal vs Resource vs Habit

| Konzept | Bedeutung | Nicht verwenden als |
|---|---|---|
| Skill | Aufgebaute Faehigkeit ueber Zeit | einzelnes Ergebnis, Task-Liste, Wissensnotiz |
| Project | Zeitlich begrenzter Outcome mit naechsten Schritten | Kompetenz selbst |
| Goal | Zielzustand, Messlatte oder Richtung | konkrete Kompetenzbibliothek |
| Resource | Wissen, Quelle, Notiz oder Kontextobjekt | Skill-Fortschritt ohne Anwendung |
| Habit | wiederkehrendes Verhalten | Kompetenzmodell |
| Task | konkrete Arbeitseinheit | Skill-Lebenslauf |

Abgrenzung:

- Eine Project kann Skills benoetigen oder Evidence fuer Skills liefern.
- Eine Goal kann Skills motivieren oder Zielkontext geben.
- Eine Resource kann Skill-Kontext oder Evidence stuetzen.
- Eine Habit kann Practice erzeugen, aber ist nicht die Skill.
- Eine Task kann Evidence oder Practice markieren, bleibt aber eine Task.

## 4. MVP-Scope

Empfohlener naechster Implementierungspfad:

```text
skills
skill_evidence
```

MVP kann:

- Skills user-owned speichern.
- Evidence user-owned mit Skill verbinden.
- Evidence auf Task, Project, Goal, Resource oder manuelle Note beziehen.
- Portfolio Skills View mit echten Skills fuellen.
- Coding/Education/Work-Kontexte ueber Evidence lesen.
- Skill Map spaeter aus bestaetigten Beziehungen ableiten.

MVP baut nicht:

- Graph-Engine
- automatische Skill-Erkennung
- Embeddings
- AI Skill Scoring
- grosse Dashboard Skill Map
- automatische Evidence aus sensiblen Bereichen

## 5. Nicht-Ziele

Nicht in R1.7.7:

- keine Migration
- keine Skill UI Implementierung
- keine Skill Graph / Skill Map Visualisierung
- keine Graph-Library
- keine Node Map
- keine AI Skill Inference
- keine Embeddings
- keine automatische Skill-Erkennung aus Resources
- keine Dashboard-Rekomposition
- keine neue Library
- keine Remote-DB-Aktion
- kein Service Role Key

## 6. Entity Model

### Option A - skills only

`skills` als einfache Liste mit `name`, `area`, `status`.

Vorteile:

- einfach
- schnell
- gut fuer Portfolio Skills View

Nachteile:

- keine Evidence
- keine nachvollziehbare Entwicklung
- Skill Map bleibt oberflaechlich

### Option B - skills + skill_evidence

`skills` als Entity plus `skill_evidence` als Verbindung zu Task, Project, Resource, Goal oder manueller Note.

Vorteile:

- nachvollziehbar
- gut fuer Portfolio, Education, Coding und Work
- Skill Map spaeter sinnvoll ableitbar
- Progress kann evidenzbasiert bleiben

Nachteile:

- braucht polymorphe Relation oder kontrollierte Target-Struktur
- Same-user Ownership Checks noetig
- Evidence-Gewichtung muss eng begrenzt werden

### Option C - skills + graph relations + practice sessions

`skills`, `skill_relations`, `skill_evidence`, `practice_sessions`.

Vorteile:

- langfristig stark
- echtes Skill-Netz moeglich
- explizite Practice-Planung

Nachteile:

- zu gross fuer MVP-Sofortschritt
- Graph-Komplexitaet zu frueh
- Risiko fuer AI-Slop-Map und Scheinpraezision

### Entscheidung

Option B ist der naechste empfohlene Implementierungspfad. Option C bleibt Future Scope.

## 7. Beziehungen

Skill kann verbunden sein mit:

- Area
- Project
- Goal
- Task
- Resource
- Education Log / Learning Log spaeter
- Work Output spaeter
- Practice Session spaeter

MVP:

- Skill Evidence verbindet Skill mit konkreten Nachweisen.
- Skill Map wird aus Skills, Evidence und bestaetigten Resource/Project/Goal Links abgeleitet.

Nicht:

- Skill ersetzt Goal nicht.
- Skill ersetzt Project nicht.
- Skill ersetzt Resource nicht.
- Resource Relations bekommen in R1.7.7 keinen Skill Target Type.

## 8. Evidence / Practice / Progress Semantik

### skill_evidence vorlaeufig

Felder:

```text
id
user_id
skill_id
source_type task/project/goal/resource/manual_note
source_id optional
title
note optional
evidence_date
weight optional
created_at
updated_at
```

Regeln:

- `source_id` ist polymorph und muss appseitig same-user geprueft werden.
- `source_type` ist kontrolliert, kein freier String.
- `manual_note` darf ohne `source_id` existieren.
- Evidence darf sensible Health-/Work-Kontexte nicht automatisch uebernehmen.
- AI darf spaeter Evidence vorschlagen, aber nur als reviewpflichtiger Draft.

### skills vorlaeufig

Felder:

```text
id
user_id
area_id optional
name
summary optional
category optional
status active/paused/archived
level optional
created_at
updated_at
archived_at optional
```

Statusentscheidung:

- Produktsemantik aus `DATA_MODEL.md`: `interested`, `learning`, `practicing`, `applied`, `demonstrated`, `maintaining`.
- Persistence-MVP kann zunaechst `active`, `paused`, `archived` verwenden, wenn `level/status` getrennt modelliert wird.
- Vor Migration muss entschieden werden, ob `status` Lifecycle oder Kompetenzzustand bedeutet. Empfehlung: `status` als Lifecycle, `stage` oder `competency_status` fuer Skill-Zustand.

### Progress

MVP:

- Evidence Count
- letzte Evidence
- letzte Practice
- optionaler Level
- optionaler Status

Nicht MVP:

- automatische Prozentberechnung
- AI Confidence als Wahrheit
- globale Skill-Rangliste

## 9. Skill Map Visualisierungsregeln

Skill Map ist spaetere Visualisierung, nicht R1.7.7.

Regeln:

- keine Graph-Library im Model Lock
- keine Node Map jetzt
- keine Force Graph UI
- keine AI-generierten Kanten ohne Review
- Skill Map zeigt nur gepruefte oder explizit angelegte Beziehungen
- Farbe semantisch, nicht dekorativ
- Visualisierung muss Entscheidung oder Review unterstuetzen
- jede Kante braucht eine lesbare Quelle: Evidence, Relation, Project Requirement oder manuell bestaetigte Verbindung
- keine grosse Skill Map auf Dashboard

Dashboard:

- keine grosse Skill Map
- hoechstens kompakte Skill-Signale, wenn fuer Daily Control relevant

Portfolio/Education/Coding:

- Skill Map gehoert eher zu Portfolio, Education oder Coding.
- Skill Map ist Kontext- oder Review-Tool, nicht Daily-Core-Primärflaeche.

## 10. Dashboard/Portfolio/Education Darstellung

### Portfolio

Ist:

- Portfolio kennt `skill` als Entity Type.
- Demo-Mockdaten enthalten Skill-Entities.
- Manual/Empty zeigen keine echten Skills.
- Contextual Create zeigt `Skill Model folgt` und blockiert Skill-Erstellung.

Soll:

- Portfolio Skills View zeigt echte Skills.
- Skill Context zeigt Evidence, Related Projects, Related Resources und naechste Practice.
- Skill-Erstellung erst nach Migration/Repository/Actions.

### Education

Ist:

- Learning Log nutzt `Linked Skill` als freies Feld in Tracks und Practice.
- Mockdaten enthalten Skills wie Java, Academic Writing, Supabase.

Soll:

- Education Skills zeigt Lernkompetenzen und Evidence.
- Learning Log kann spaeter Practice/Evidence fuer Skills erzeugen.

### Coding

Ist:

- Coding Overview hat `Skill Focus` aus Mockdaten.
- Coding Skill Map hat lokale UI-Drafts fuer Skill, Evidence und Practice.
- Skill Map Page Contract sagt explizit: local UI state, mock skills/evidence, keine Analyse.

Soll:

- Coding Skills zeigt technische Faehigkeiten und angewendete Projekte/Repos.
- Repo-/Code-Analyse bleibt Future Scope und reviewpflichtig.

### Work

Ist:

- Work-Bereich hat keine eigene kanonische Skill-Entity.
- Work Output kann spaeter Evidence sein.

Soll:

- Work Logs oder Outputs duerfen Skill Evidence stuetzen, aber nur user-owned und bewusst bestaetigt.

### Resources

Ist:

- Resource Mockdaten kennen `linkedContexts.kind = "skill"`.
- Resource Map Scopes zeigen Skill als Mock-Scope.
- `resource_relations` Real-Data target types sind nur Project, Goal, Task, Resource.

Soll:

- Resources koennen Skill Evidence oder Skill Context stuetzen.
- Real Skill Target in Resource Relations erst nach Skill-Migration und Ownership-Regeln.

## 11. Privacy / AI / Review Regeln

Pflicht:

- `user_id` auf `skills` und `skill_evidence`
- RLS fuer beide Tabellen
- serverseitige Zod-Validierung fuer Mutations
- kein Service Role Key im Client
- Same-user Ownership fuer polymorphe Evidence Targets
- kein automatisches AI Skill Scoring im MVP

AI-Regeln:

- AI darf spaeter Skill- oder Evidence-Vorschlaege machen.
- AI-Vorschlaege sind `review_needed`, nie automatisch kanonisch.
- Keine sensiblen Work-/Health-Daten automatisch als Skill Evidence ohne Bestaetigung.
- Keine Embeddings oder externe Analyse in MVP.

Privacy-Level:

- Default: `standard_private`
- Coding/Work Evidence kann `work_restricted` werden.
- Health-/Fitness-bezogene Skills oder Evidence koennen `health_sensitive` sein.
- Education kann je nach Inhalt `standard_private` oder `personal_sensitive` sein.

## 12. Migration Gate

R1.7.7 baut keine Migration.

Gate-Entscheidung:

```text
A) Schema eindeutig:
   -> spaetere R1.7.7B Migration vorschlagen.

B) Skill/Evidence ownership unklar:
   -> keine Migration, weitere Semantik klaeren.

C) Bestehende Tabellen kollidieren:
   -> keine Migration, Gaps dokumentieren.
```

Audit-Ergebnis fuer diesen Block:

- Es gibt keine bestehende `skills` oder `skill_evidence` Tabelle.
- `src/types/supabase.ts` enthaelt keine Skill-Tabelle.
- `realDataTableNames` enthaelt keine Skills.
- `RealDataRepository` enthaelt kein Skill Repository.
- `resource_relations` kennt keinen Skill Target Type.

Empfehlung:

- R1.7.7B darf eine lokale Migration fuer `skills` + `skill_evidence` vorbereiten, wenn Status-/Level-Semantik vorab final entschieden ist.
- Keine Migration vor Ownership-Checks fuer polymorphe Evidence Targets.

## 13. Spaetere Ausbaustufen

Moegliche Folge-Slices:

1. R1.7.7B: lokale Migration `skills` + `skill_evidence`.
2. R1.7.7C: Domain Types, Zod Schemas, Repository Contract.
3. R1.7.7D: Supabase Repository + Server Actions.
4. R1.7.7E: Portfolio Skills View real binden.
5. R1.7.7F: Education/Coding Evidence Binding.
6. Spaeter: `skill_relations` und Practice Sessions.
7. Spaeter: Skill Map Visualisierung aus bestaetigten Relationen.

## 14. Akzeptanzkriterien

- Skill Ist-Zustand ist auditiert.
- Skill, Project, Goal, Resource und Habit sind eindeutig getrennt.
- MVP-Modell ist dokumentiert.
- Empfohlenes Modell ist `skills + skill_evidence`.
- Skill Evidence ist definiert.
- Skill Practice ist definiert.
- Skill Progress ist evidenzbasiert begrenzt.
- Skill Map ist als spaetere Visualisierung begrenzt.
- Dashboard bleibt frei von grosser Skill Map.
- AI Skill Suggestions sind Future Scope und reviewpflichtig.
- Migration Gate ist dokumentiert.
- Keine Migration in diesem Block.
- Keine UI-Implementierung.
- Keine Graph-Library.
- Kein Service Role Key.

## 15. R1.7.7B Schema/Migration Stand

R1.7.7B setzt den MVP-Persistence-Layer lokal um:

- `public.skills` als user-owned zentrale Skill-Entity.
- `public.skill_evidence` als user-owned Evidence-Tabelle mit kontrolliertem `source_type`.
- `source_id` bleibt polymorph und bekommt bewusst keine Fake-FKs.
- `skills.status` ist Lifecycle: `active`, `paused`, `archived`.
- `skills.level` bleibt nullable text ohne harte Enum-Constraint.
- `skills.archived_at` ist der Soft-Archive-Zeitpunkt.
- Beide Tabellen nutzen `created_at`, `updated_at`, `public.set_updated_at()`, RLS und authenticated Grants.
- Typegen, Row Types, Table Names und Zod-Schemas sind vorbereitet.

Nicht gebaut in R1.7.7B:

- keine UI
- keine Repository-Implementation
- keine Server Actions
- keine Skill Map
- keine Graph-Library
- keine AI Skill Inference
- keine automatische Evidence-Erzeugung

Offene Gate-Regel:

- Same-user Ownership fuer polymorphe Evidence-Targets muss in spaeteren Repository-/Action-Schritten serverseitig geprueft werden.

## 16. R1.7.7C Repository/Actions Stand

R1.7.7C setzt die Skill Data-/Action-Schicht um:

- Skill Domain Types fuer `Skill`, `SkillStatus`, `SkillEvidence` und `SkillEvidenceSourceType`.
- Mapper fuer `skills` und `skill_evidence` Row-to-Domain und Input-to-Insert/Patch.
- Skill Repository Contract fuer Read/Create/Update/Archive und Evidence Read/Create/Update/Delete.
- Supabase Skill Repository mit user-scoped Queries und Mutations.
- Same-user Ownership Checks fuer optionale `areaId`, `skillId` und polymorphe Evidence Sources.
- `manual_note` Evidence verlangt keine `sourceId`; Task/Project/Goal/Resource Evidence verlangt eine user-owned aktive Source.
- Server Actions fuer Skill/Evidence CRUD-lite mit serverseitiger Auth und ohne Client-`userId`.
- Revalidation fuer Portfolio, Education und Coding; Resource-Evidence revalidiert zusaetzlich Resources.

Nicht gebaut in R1.7.7C:

- keine UI
- keine Migration
- keine Skill Page Anbindung
- keine Skill Map
- keine Graph-Library
- keine AI Skill Inference
- keine automatische Evidence-Erzeugung

## Audit: aktueller Skill-Ist-Zustand

### Skill UI Ist

- Portfolio hat Skills als View/Filter und Demo-Entity-Type.
- Portfolio Manual/Empty haben keine echte Skill-Quelle.
- Portfolio Contextual Create blockiert Skill-Erstellung mit `Skill Model folgt`.
- Coding Skill Map ist eine vollstaendige Mock-/Local-State-Seite mit Skill Nodes, Evidence, Practice Drafts und Project Gaps.
- Coding Overview zeigt einen Mock `Skill Focus`.
- Education Learning Log hat freie `Linked Skill` Felder.
- Work hat keine eigene Skill-UI.
- Resources zeigen Skills nur als Mock-linked-context/Map-Scope.

### Skill ViewModels

- `EntityCollection.skills` existiert in `src/features/entities/types.ts`.
- `LifeSkill` existiert als UI/domainnaher Mock-Type mit Level, Progress, Practice, Links und Evidence.
- `skillToPortfolioEntity` projiziert `LifeSkill` in Portfolio.
- `CodingSkill`, `SkillEvidence`, `SkillConnection`, `SkillCluster` existieren nur im Coding Skill Map Feature.
- Profile-Data baut fuer Manual/Empty derzeit `skills: []`.

### Mockdaten

- Portfolio Mockdaten enthalten mehrere Skill-Entities.
- Coding Skill Map Mockdaten enthalten Skills, Connections, Evidence, Requirements und Recommendations.
- Education Mockdaten enthalten `linkedSkill` als freies Textfeld.
- Resources Mockdaten enthalten Skill Contexts, aber keine echte Relation.

### Existing DB Schema

- Keine `skills` Tabelle.
- Keine `skill_evidence` Tabelle.
- Keine Skill Row Types in `src/types/supabase.ts`.
- Keine Skill Table Names in `realDataTableNames`.
- Kein Skill Repository und keine Skill Server Actions.

### Portfolio Integration

- Portfolio ist fachlich vorbereitet, aber echte Skill-Erstellung bleibt bewusst deaktiviert.
- Demo zeigt Skills, Manual/Empty zeigen leere Skill-States.

### Education/Coding/Work Integration

- Education kann Skills textlich referenzieren, aber nicht kanonisch verlinken.
- Coding hat Skill Map Mock-UX und lokale Draft-Flows.
- Work kann spaeter Evidence liefern, hat aber keinen Skill-Anschluss.

### Resource Relation Bezug

- Resource UI kennt Skill als Mock-Kontext.
- Real `resource_relations` unterstuetzt Project, Goal, Task und Resource, aber nicht Skill.
- Skill-Target in Resource Relations ist erst nach Skill-Migration sinnvoll.

### Gaps

- Kein Persistence Model.
- Keine Ownership Checks fuer Skill Evidence.
- Keine eindeutige Entscheidung, ob Status Lifecycle oder Kompetenzzustand ist.
- Keine Practice Session Entity.
- Keine kanonische Skill Map Relation.
- Keine AI-/Review-Pipeline fuer Skill-Vorschlaege.
