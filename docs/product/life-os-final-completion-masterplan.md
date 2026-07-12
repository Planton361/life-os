# Life OS – Final Completion Masterplan

**Status:** Roadmap-Rework-Vorschlag
**Ziel:** Die bestehende Life-OS-App vollständig als persönliche, local-first Web-App fertigstellen – mit vorhandenem V5-Frontend, echten Datenmodellen, funktionierenden Aktionen, belastbaren Read Models und einem effizienten Codex-Workflow.
**Nicht-Ziel:** Neubau der App, Public SaaS, vorschnelles Cloud-Deployment oder eine zweite parallele Architektur.

---

## 1. Executive Decision

Life OS wird **nicht neu gebaut**. Das vorhandene V5-Frontend, die bestehenden Next.js-/Supabase-Strukturen und alle bereits browserbewiesenen Vertical Slices bleiben Grundlage.

Der Engpass ist nicht mehr das Grunddesign, sondern die **Capability Completion**:

- sichtbare Felder müssen kanonische Daten lesen,
- sichtbare Aktionen müssen echte Mutationen auslösen,
- Dashboard und Bereichsseiten brauchen belastbare serverseitige Read Models,
- Cross-Domain-Flows müssen konsistent sein,
- Analytics und KI dürfen nur auf kanonischen Daten und klaren Tool-Grenzen aufbauen.

Die bisherige Roadmap wird von einer chronologischen Statussammlung zu einem **aktuellen Ausführungsplan** umgebaut.

### Verbindliche Reihenfolge

1. Roadmap und Capability Registry konsolidieren.
2. Daily Core und Reviews als zusammenhängendes System schließen.
3. Scheduling, Routinen und Cross-Domain-Ausführung vervollständigen.
4. Health, Habits, Running und Strength real anbinden.
5. Portfolio, Resources und Area Domains vervollständigen.
6. Motivation, Challenges, Shop und Rewards anbinden.
7. Persönlichen KI-Assistenten kontrolliert integrieren.
8. Analytics, optionale Integrationen und finales Hardening schließen.

---

## 2. Diagnose des aktuellen Roadmap-Problems

Die aktuelle Completion Roadmap enthält wertvolle fachliche Entscheidungen, Proof-Ergebnisse und Closure-Informationen. Sie hat aber drei strukturelle Probleme:

1. **Sie ist zugleich Roadmap, Statuslog, QA-Historie und Architekturdokument.**
2. **Surface-Level-Claims verdecken Capability-Level-Lücken.** Eine Seite kann `local_connected_with_depth_gap` sein, obwohl einzelne sichtbare Panels weiterhin Demo-, Prepared- oder UI-only-Zustände zeigen.
3. **Die Priorisierung folgt zuletzt stark den bereits begonnenen Bereichen**, nicht mehr zwingend dem vollständigen Nutzerziel. Dadurch wurde beispielsweise der Resource-/Skill-Graph höher priorisiert als Mood, Habits, Reviews, Health oder die vollständige Dashboard-Datenprojektion.

### Konsequenz

Die zentrale Roadmap muss nicht fragen: „Welche Seite ist als Nächstes dran?“, sondern:

> Welche zusammenhängende Nutzerfähigkeit fehlt noch, welche kanonischen Daten braucht sie und welche anderen Flächen müssen danach korrekt reagieren?

---

## 3. Kanonische Dokumentstruktur

### 3.1 Neue Quelle der Wahrheit

**`ROADMAP.md` ist der kanonische statische Fertigstellungsplan.**

Sie enthält nur:

- Product Contract,
- grobe Current Baseline,
- permanente Programm- und Blockreihenfolge,
- Outcomes, Scope, Abhängigkeiten und Nicht-Ziele,
- Definition of Done,
- Deferred/Future,
- Links auf Detail- und Proof-Dokumente.

Sie enthält **keine chronologische Langhistorie**.

### 3.2 Unterstützende Dokumente

| Datei | Zweck |
|---|---|
| `PRODUCT.md` | Vision, Zielnutzer, Produktgrenzen |
| `DESIGN.md` | V5 als Designwahrheit |
| `ARCHITECTURE.md` | technische Modul- und Laufzeitarchitektur |
| `DATA_MODEL.md` | kanonische Entities, Relationen, Lifecycle |
| `SECURITY.md` | Auth, RLS, Ownership, Privacy |
| `ACCESSIBILITY.md` | A11y-Gates |
| `AI_WORKFLOW.md` | Codex- und KI-Arbeitsweise |
| `docs/product/capability-registry.md` | detaillierter Capability-Status pro sichtbarer Funktion |
| `ROADMAP.md` | vollständiger statischer Fertigstellungsplan mit permanenter Blockreihenfolge |
| `docs/qa/*.md` | Browser-Proofs und Closure-Nachweise |
| `docs/decisions/*.md` | echte Model-/Security-/Integration-Entscheidungen |
| bestehende Roadmap-, QA- und Closure-Dokumente | historische Nachweise an ihren bisherigen Pfaden |

### 3.3 Umgang mit bestehenden Roadmaps

- Die Root-`ROADMAP.md` wurde **inhaltlich konsolidiert**, nicht gelöscht.
- `docs/product/final-product-completion-roadmap.md` wird nach expliziter Freigabe in `docs/archive/roadmap-history/` verschoben oder mit `Status: Archived` versehen.
- Closure- und QA-Dokumente bleiben erhalten und werden von der neuen Roadmap verlinkt.
- `docs/product/life-os-full-roadmap-checklist.md` bleibt unangetastet, bis ausdrücklich entschieden wird, ob sie archiviert oder in die Capability Registry überführt wird.

---

## 4. Product Contract: Was „fertig“ bedeutet

Life OS ist fertig, wenn die folgenden Aussagen gleichzeitig wahr sind:

### 4.1 Frontend

- V5 bleibt visuelle Wahrheit.
- Jede sichtbare Aktion ist funktional, navigiert oder ist ehrlich als Future State markiert.
- Dashboard bleibt Steuerung, Bereichsseiten liefern Kontext, Detailseiten liefern Tiefe.
- 4K-Desktop ist primärer Nutzungskontext; kleinere Desktop- und Mobile-Viewports bleiben benutzbar.

### 4.2 Daten und Backend

- Fachinformationen besitzen genau eine kanonische Quelle.
- Dashboard, Today, Calendar und Bereichsseiten sind Projektionen, keine Datensilos.
- Jeder Write läuft über serverseitige Auth, Zod und user-scoped Repository/RPC.
- Relationen werden mit Same-User-Ownership geprüft.
- RLS bleibt Defense-in-Depth.
- Cross-Domain-Mutationen sind atomar oder explizit eventual-consistent.

### 4.3 Funktionsumfang

- Alle in diesem Masterplan aufgeführten Produktfähigkeiten sind `CONNECTED` oder bewusst `EXTERNAL_GATE`.
- `PREPARED` ist am Endzustand nur für ausdrücklich optionale externe Integrationen zulässig.

### 4.4 Proof

- Ein Write-Flow besitzt mindestens einen fokussierten Browser-Proof mit Reload.
- Pure Geschäftslogik besitzt Unit Tests, wenn sie komplex ist: Recurrence, Aggregation, Progress, Scheduling, Rewards.
- Die vollständige Suite wird am Epic-Ende ausgeführt, nicht nach jeder Textänderung.

### 4.5 Betrieb

- Local-first Startup, Auth-State, Backup und Restore sind dokumentiert und ausführbar.
- Keine Cloud-Abhängigkeit ist für den täglichen Betrieb zwingend.

---

## 5. Capability Status Legend

| Status | Bedeutung |
|---|---|
| `CONNECTED` | UI, Daten, Mutation/Read, Reload und Browser-Proof sind vollständig |
| `CONNECTED_GAP` | Kern funktioniert, aber wichtige Tiefe oder Cross-Domain-Reaktion fehlt |
| `UI_ONLY` | UI ist sichtbar, besitzt aber keine belastbare kanonische Datenanbindung |
| `MODEL_ONLY` | Daten/Backend existiert, UI fehlt |
| `NOT_STARTED` | weder UI noch kanonischer Datenpfad vollständig vorhanden |
| `EXTERNAL_GATE` | Funktion hängt von externer Freigabe/API/Hardware ab |
| `DECISION_REQUIRED` | fachliches Modell muss vor Implementierung festgelegt werden |

---

## 6. Aktuelle Capability Matrix

Die Matrix ist bewusst feiner als ein Surface-Claim.

### 6.1 Dashboard

| Capability | Status | Nächster Bedarf |
|---|---|---|
| Tasks Today | `CONNECTED_GAP` | zentraler Dashboard-Read-Model-Contract und finaler Filter |
| Focus Time | `CONNECTED_GAP` | aus geplanten/abgeschlossenen Focus-Blöcken ableiten |
| Inbox Count | `CONNECTED` | Navigation prüfen |
| Nutrition Summary | `CONNECTED_GAP` | Estimate-Provenance, completed meals und Tagesaggregation |
| Review Status | `UI_ONLY` | Daily-/Weekly-Review-Modell |
| Sleep | `UI_ONLY` | Sleep Entries + Dashboard-Projektion |
| Quick Thought | `CONNECTED` | keine Neuentwicklung |
| Daily Control / Up Next | `CONNECTED_GAP` | Priorisierungsregel verbindlich machen |
| Time Progress | `UI_ONLY` | echte Tageszeit-/Schedule-Auslastung berechnen |
| Weather | `NOT_STARTED` | Open-Meteo, Settings-Location, serverseitiges Caching |
| Mood Input | `UI_ONLY` | Mood Entries, Log, farbliche Auswahl, Verlauf |
| Weight Goal | `UI_ONLY` | Weight Entries + Health Goal |
| Nutrient Balance | `CONNECTED_GAP` | nur Estimate, keine Fake-Präzision; Meal Completion koppeln |
| Meals Today | `CONNECTED_GAP` | Calendar-/Task-Link und Meal Completion synchronisieren |
| Running Tracker | `UI_ONLY` | manual sessions zuerst, Garmin später |
| Muscle Map | `UI_ONLY` | Strength Plans/Sessions und Übungs-Muskelbezug |
| Today Agenda | `CONNECTED_GAP` | dringender Block, Review-/Meal-/Workout-Links, später DnD |
| Habit Tracker | `UI_ONLY` | Habits + timestamped logs + time-window switching |
| Active Portfolio | `CONNECTED_GAP` | Pins/Favorites und max. 4 je Kategorie |
| Anti-Rot Actions | `UI_ONLY` | Action Library, Rotation, Logs |
| Challenges | `UI_ONLY` | daily/weekly/monthly challenge model + reward |

### 6.2 Daily Core

| Capability | Status | Nächster Bedarf |
|---|---|---|
| Inbox Capture/Routing | `CONNECTED_GAP` | Notes/Decisions/Skill routes und schneller Abschluss |
| Today Task Execution | `CONNECTED` | Review und Daily Record Tiefe |
| Calendar Task Scheduling | `CONNECTED_GAP` | freie Events, routines, linked domain blocks, optional DnD |
| Recurring Tasks | `CONNECTED_GAP` | vollständiges Template Management und kontrollierte Automation |
| Daily Review | `NOT_STARTED` oder `UI_ONLY` | kanonische Review-Entity und Abschlussflow |
| Weekly Review/Planning | `NOT_STARTED` oder `UI_ONLY` | Wochenplanung, Carry-over, Capacity und Planänderung |

### 6.3 Portfolio und Wissen

| Capability | Status | Nächster Bedarf |
|---|---|---|
| Tasks/Projects/Goals/Skills CRUD | `CONNECTED_GAP` | Task detail, richer links, undo/restore |
| Project/Goal Workbenches | `CONNECTED_GAP` | milestones, logs, review cadence, route truth |
| Resource Library/Relations | `CONNECTED_GAP` | attachments, categorization, search, graph read model |
| Skill Evidence | `CONNECTED` | graph/read projections und optional Workbench create |

### 6.4 Health & Fitness

| Capability | Status | Nächster Bedarf |
|---|---|---|
| Mood | `UI_ONLY` | model, logging, dashboard, trend |
| Sleep | `UI_ONLY` | model, manual entry, optional external import |
| Weight / Goal | `UI_ONLY` | entries, goals, progress |
| Habits | `UI_ONLY` | habits, units, increments, logs, dashboard |
| Running | `UI_ONLY` | sessions, plans, dashboard latest run, analytics |
| Strength | `UI_ONLY` | exercise library, plans, sessions, sets, muscle map |
| Training Calendar Link | `NOT_STARTED` | routine/task generation from plans |

### 6.5 Nutrition

| Capability | Status | Nächster Bedarf |
|---|---|---|
| Recipes / Ingredients | `CONNECTED` | detail route optional |
| Meals / Planner | `CONNECTED` | multi-meal slot visualization and schedule links |
| Grocery Draft | `CONNECTED_GAP` | persistent list/check-off/pantry optional later |
| Nutrition Estimates | `CONNECTED_GAP` | manual estimate only; no fake engine |
| Pantry / Receipt OCR | `NOT_STARTED` | separate epic, not prerequisite for core nutrition |

### 6.6 Coding, Life, Education, Work

| Area | Status | Nächster Bedarf |
|---|---|---|
| Coding Repositories | `UI_ONLY` | repository entity, GitHub metadata import, logs |
| Coding Agent Sessions | `UI_ONLY` | session/task/log model |
| Skill/Knowledge Map | `CONNECTED_GAP` | read model before visualization |
| Journal/Notes | `UI_ONLY` | canonical notes/journal entities |
| Entertainment | `UI_ONLY` | collection and status model |
| Inventory/Wishlist | `UI_ONLY` | items, valuations, purchase decision |
| Scientific Work | `UI_ONLY` | papers, research projects, writing logs |
| Literature | `UI_ONLY` | source metadata, reading status, relations |
| Learning Log | `UI_ONLY` | entries and evidence links |
| Work Log/Wiki | `UI_ONLY` | work log and wiki entities |

### 6.7 Motivation und AI

| Capability | Status | Nächster Bedarf |
|---|---|---|
| Shop / Currency | `UI_ONLY` | reward ledger and redemption |
| Challenges | `UI_ONLY` | challenge lifecycle and reward relation |
| AI Inbox Suggestion | `CONNECTED_GAP` | local mock connected, provider later |
| Personal Assistant | `NOT_STARTED` | DeepSeek provider, read tools, confirmation-gated write tools |

---

## 7. Zielarchitektur

### 7.1 Canonical Entities

Bestehende Entities bleiben erhalten. Ergänzungen werden domainweise eingeführt.

#### Core und Review

- `daily_reviews`
- `weekly_reviews`
- `activity_events` als append-only Audit-/Analytics-Strom
- `dashboard_preferences`
- `dashboard_pins`
- `user_settings`

#### Health

- `mood_entries`
- `sleep_entries`
- `weight_entries`
- `health_goals`
- `habits`
- `habit_logs`
- `running_sessions`
- `exercise_library`
- `workout_plans`
- `workout_plan_items`
- `workout_sessions`
- `strength_set_logs`

#### Motivation

- `anti_rot_actions`
- `anti_rot_logs`
- `challenges`
- `challenge_logs`
- `rewards`
- `reward_transactions`

#### Areas

- `notes`
- `journal_entries`
- `entertainment_items`
- `inventory_items`
- `research_items` / `papers`
- `learning_logs`
- `work_logs`
- `wiki_pages`
- `coding_repositories`
- `agent_sessions`

#### AI

- `assistant_threads`
- `assistant_messages`
- `assistant_tool_requests`
- `assistant_tool_results`

### 7.2 Relation Strategy

1. **Starke fachliche Beziehungen bleiben echte Foreign Keys.**
   - Task → Project
   - Project → Goal
   - Meal → Recipe
   - Habit Log → Habit
   - Workout Session → Workout Plan

2. **Semantische oder schwache Beziehungen nutzen kontrollierte Relationstabellen.**
   - Resource Relations
   - Skill Evidence
   - spätere Note-/Knowledge-Relations

3. **Kein universelles Mega-Relation-Modell als Ersatz für klare Domain-FKs.**

4. **Graph ist ein Read Model über reale Relationen**, nicht eine zweite Wahrheit.

### 7.3 Scheduling Strategy

Die bestehende Task-Terminierung bleibt erhalten. Cross-Domain-Scheduling wird inkrementell ergänzt:

- Meals, Workouts und Reviews erzeugen oder verknüpfen ausführbare Task-/Schedule-Instanzen.
- Eine kontrollierte `task_source_links`- oder vergleichbare Relation verbindet Task-Instanz und Domain-Objekt.
- Completion kann über eine transaktionale RPC den Task und das verknüpfte Domain-Objekt aktualisieren.
- Freie Calendar Events erhalten später ein eigenes Modell.
- Calendar Read Model vereinigt Task Blocks und freie Events, ohne Rohdaten zu duplizieren.

### 7.4 Dashboard Read Model

Ein serverseitiges `DashboardReadModel` aggregiert:

- heutige Tasks,
- Focus-Zeit,
- Inbox-Counts,
- Review-Status,
- Sleep,
- Mood,
- Weight Goal,
- Meals/Nutrition Estimate,
- letzten Run,
- Habit-Status,
- Portfolio Pins,
- Anti-Rot und Challenges.

Das Dashboard speichert keine Kopien. Zunächst werden Repository-Reads parallelisiert und in pure Aggregatoren überführt. Erst bei nachgewiesenen Performanceproblemen kommen SQL Views oder Materialized Views zum Einsatz.

### 7.5 Analytics Strategy

- Source Entities bleiben Wahrheit.
- `activity_events` liefert Ereignisse für spätere BI.
- Tages-/Wochenstatistiken werden als serverseitige Read Models berechnet.
- Materialized Views werden erst verwendet, wenn Query-Laufzeiten dies rechtfertigen und leichte Staleness akzeptabel ist.

### 7.6 AI Assistant Strategy

Der DeepSeek-Assistent erhält **keinen direkten Datenbankzugriff**.

Er arbeitet über kleine serverseitige Tools:

#### Read Tools

- `get_today_summary`
- `get_week_plan`
- `get_inbox_summary`
- `get_project_context`
- `get_health_summary`
- `get_nutrition_summary`
- `search_resources`
- `get_review_context`

#### Write Tools – immer bestätigungspflichtig

- `create_task`
- `schedule_task`
- `log_mood`
- `complete_meal`
- `create_review_note`
- `link_resource`

Ablauf:

1. DeepSeek erzeugt Tool Call/JSON.
2. Server validiert mit Zod.
3. UI zeigt Vorschlag.
4. Nutzer bestätigt.
5. Bestehende Server Action/Repository führt Mutation aus.
6. Tool Result wird dokumentiert.

Modellname, Base URL und Provider bleiben konfigurierbar, damit Provider-/Modelwechsel keine Fachlogik ändern.

---

## 8. Final Completion Program

## Program Foundation – Roadmap & Capability Control

**Outcome:** Eine kurze kanonische Root-Roadmap und eine vollständige Capability Registry ersetzen die bisherige Statuschronik.

**DoD:**

- konsolidierte Root-`ROADMAP.md`,
- Capability Registry mit Status pro sichtbarer Funktion,
- historische Roadmap archiviert/markiert,
- permanente Blockreihenfolge; der konkrete Block wird im Codex-Prompt genannt,
- statischer Plan ohne Active-/Current-Block-Rotation.

---

## Epic D1 – Daily Command Center & Reviews

**Outcome:** Dashboard, Inbox, Today, Calendar, Daily Review und Weekly Review bilden einen geschlossenen täglichen Regelkreis.

### Funktionen

- vollständiger Dashboard Read Model,
- Summary Cards aus DB,
- Navigation aller Cards,
- Daily Control Selection Policy,
- Time Progress und Tagesauslastung,
- Mood, Sleep, Weight Goal,
- Meals Today und Nutrient Estimate,
- Daily Review,
- Weekly Review und Wochenplanung,
- Weather.

### DoD

- keine Dashboard-Fixtures im Manual-Profil,
- jede Card besitzt echte Quelle und Navigation,
- Mood/Sleep/Weight/Review writes reload-stabil,
- Daily/Weekly Review erzeugen kanonische Records,
- Dashboard nach Mutation korrekt revalidiert,
- 4K- und Standard-Desktop-Proof.

---

## Epic D2 – Scheduling, Routines & Cross-Domain Execution

**Outcome:** Calendar ist der ausführbare Zeit-Hub für Tasks, Meals, Workouts, Reviews und Routinen.

### Funktionen

- vollständiges recurring template management,
- routines als kontrollierte recurring templates,
- Meal-/Workout-/Review-Task-Verknüpfung,
- Completion-Synchronisierung,
- Calendar Filters nach Project/Goal/Skill/Area/Type,
- Project-/Goal-Task-Queues,
- week/month views,
- dringender Zeitblock,
- freie Events,
- Drag/Drop/Resize mit Keyboard-Fallback.

### DoD

- keine versteckten Writes,
- Cross-Domain-Completion transaktional,
- Filter nutzen kanonische Labels/Relationen,
- Recurrence idempotent,
- DnD plus Keyboard gleichwertig,
- Browser-Proof für jede Schedule-Quelle.

---

## Epic H1 – Mood, Sleep, Weight & Habits

**Outcome:** Dashboard-Health-Signale sind real, historisierbar und auswertbar.

### Funktionen

- Mood Log,
- Sleep Log,
- Weight Entries und Goal,
- Habit CRUD,
- 8 Slots je Morning/Midday/Evening,
- frei definierbare Units/Increments/Targets,
- timestamped Habit Logs,
- automatische Zeitfensteranzeige,
- Health Overview und Trends.

### DoD

- Dashboard click schreibt Log,
- Undo für Fehleingaben,
- Tagesaggregation korrekt,
- keine medizinischen Claims,
- historischer Verlauf verfügbar.

---

## Epic H2 – Running & Strength

**Outcome:** Training kann geplant, durchgeführt, dokumentiert und im Dashboard ausgewertet werden.

### Funktionen

- Running Sessions manual,
- Running Plan,
- Latest Run Dashboard,
- Trends,
- Exercise Library,
- Strength Plans,
- Sets/Reps/Load,
- Muscle Map aus Übungsbeziehungen,
- Calendar Routine Integration,
- Garmin als späterer External Gate.

### DoD

- manual entry vollständig,
- Plan → Schedule → Session → Stats geschlossen,
- Dashboard zeigt letzten Run/Workout,
- Garmin nicht Voraussetzung.

---

## Epic K1 – Portfolio, Resources & Knowledge Completion

**Outcome:** Aufgaben, Projects, Goals, Skills und Wissen sind vollständig spezifizierbar, verknüpfbar und durchsuchbar.

### Funktionen

- Task Detail mit Labels, Context, Resources, Progress Notes,
- Project Roadmap/Milestones/Logs,
- Goal Review Cadence,
- Resource Attachments/Links,
- Kategorien und Search,
- Graph Read Model,
- Resource/Skill Map,
- Archive Browser und Undo.

### DoD

- Graph nur aus realen Relationen,
- kein Fake-Progress,
- Resources besitzen Quellen und Attachments,
- Search liefert user-scoped Ergebnisse,
- Archive/Restore reload-stabil.

---

## Epic A1 – Coding, Education, Work & Life Domains

**Outcome:** Die vorhandenen Area-UIs erhalten kanonische Entities und echte Workflows.

### Coding

- Repositories,
- GitHub metadata import,
- Coding logs,
- Agent Sessions,
- Skill Evidence.

### Education

- Research Projects,
- Papers/Literature,
- Reading/Writing Status,
- Learning Logs,
- Resources und Evidence.

### Work

- Work Logs,
- Wiki Pages,
- Projects/Tasks/Resources.

### Life

- Journal,
- Notes,
- Entertainment Collection,
- Inventory/Wishlist.

### DoD

- jede Area besitzt echte CRUD-Flows,
- keine separaten Task-Kopien,
- Relation zu Core Entities,
- Dashboard/Today nur über Read Models.

---

## Epic M1 – Anti-Rot, Challenges, Shop & Rewards

**Outcome:** Motivation ist funktional, aber nicht übergamifiziert.

### Funktionen

- Anti-Rot Action Library,
- Rotation/Selection,
- Completion Logs,
- Challenges daily/weekly/monthly,
- Rewards,
- Currency Ledger,
- Shop Redemption.

### DoD

- Currency nur durch nachvollziehbare Events,
- keine negativen oder doppelten Transaktionen,
- Rewards/Challenges user-definiert,
- tägliche Dashboard-Projektion.

---

## Epic AI1 – Personal Assistant with DeepSeek

**Outcome:** Ein informativer, kontrollierter Assistent unterstützt Morning/Evening Reviews und Datenfragen.

### Funktionen

- provider abstraction,
- DeepSeek server-only,
- threads/messages,
- structured read tools,
- confirmation-gated write tools,
- Morning Briefing,
- Evening Review,
- source references,
- error/cost/privacy handling.

### DoD

- keine direkte DB-Berechtigung für das Modell,
- kein Auto-Write,
- Tool Calls strikt validiert,
- Provider-Ausfall degradiert sicher,
- API-Key nie im Client/Log.

---

## Epic I1 – Integrations & Analytics

**Outcome:** Externe Daten und BI ergänzen die App, ohne Kernflüsse zu blockieren.

### Integrationen

- Open-Meteo Weather,
- Garmin API nur nach Zugang,
- alternativ Manual/File Import,
- GitHub read integration,
- optional Receipt OCR.

### Analytics

- Habit Trends,
- Mood/Sleep/Weight,
- Running/Strength,
- Project Movement,
- Review Consistency,
- Activity Timeline.

### DoD

- Integration ist optional und fehlertolerant,
- Provenance sichtbar,
- keine Daten werden ohne Einwilligung extern gesendet,
- Analytics aus kanonischen Daten/Events.

---

## Epic Z1 – Final Local Product Closure

**Outcome:** Life OS ist als persönliche, local-first App vollständig nutzbar.

### DoD

- alle Capability-Registry-Einträge `CONNECTED` oder `EXTERNAL_GATE`,
- keine irreführenden UI-only Controls,
- fokussierte und vollständige E2E-Suite grün,
- 4K, Standard-Desktop und Mobile-Smoke,
- Accessibility Pass,
- Performance Pass,
- Backup/Restore Pass,
- lokale Startup-/Recovery-Doku aktuell,
- sieben Tage reale Nutzung ohne kritischen Blocker.

---

## 9. Permanente Fertigstellungsreihenfolge

Diese Reihenfolge ersetzt den bisherigen automatischen Sprung zu F1.3 Graph.

| # | Block | Outcome | DoD-Kern |
|---:|---|---|---|
| 1 | `D1.1 Dashboard Read Model & Navigation` | alle Dashboard-Panels erhalten echte Quellen/Status | server read model + navigation |
| 2 | `D1.2 Daily & Weekly Review` | Review Records und Abschlussflow | create/edit/close/reload |
| 3 | `D1.3 Mood, Sleep & Weight` | Health Summary Cards real | logs + dashboard projection |
| 4 | `D2.1 Schedule Source Links` | Meal/Workout/Review ↔ Task/Calendar | completion sync |
| 5 | `D2.2 Recurring & Routine Management` | templates vollständig verwaltbar | idempotent, no surprise writes |
| 6 | `H1.1 Habit Tracking` | flexible Habits + logs | units/increments/timestamps |
| 7 | `H2.1 Running & Strength Core` | plans/sessions/dashboard | manual-first complete loop |
| 8 | `K1.1 Portfolio, Resource & Knowledge Depth` | reale Relationen, Search und Archive | keine dekorative Graph-Library |
| 9 | `A1.1 Coding, Education, Work & Life Domains` | Area Models und vollständige Workflows | first complete CRUD slice per area |
| 10 | `M1.1 Challenges, Anti-Rot, Shop & Rewards` | nachvollziehbare Motivation und Ledger | keine manipulative Gamification |
| 11 | `AI1 Personal Assistant` | kontrollierte Read-/Confirmed-Write-Tools | kein direkter DB-Zugriff |
| 12 | `I1 Integrations & Analytics` | optionale Integrationen und Trends | Core bleibt provider-unabhängig |
| 13 | `Z1 Final Local Product Closure` | belastbare local-first Produktabnahme | alle nicht extern gegateten Capabilities connected |

---

## 10. Codex Delivery System

## 10.1 Tool-Rollen

| Tool | Rolle |
|---|---|
| Codex CLI | primärer Implementierer im bestehenden Repo |
| Playwright MCP | Browsersteuerung, Labels/Roles, reale Flow-Verifikation |
| Next DevTools MCP | Runtime-, Route-, Server-Action- und Error-Diagnose |
| Figma MCP | read-only V5-Kontext bei echten UI-Änderungen |
| Supabase CLI | Migration, Typegen, Lint, Advisors; bleibt kanonisch |
| Supabase MCP | vorerst nicht nötig; später nur local/read-only |
| DeepSeek API | Laufzeit-Assistent, nicht Coding-Agent oder DB-Client |

## 10.2 Empfohlene MCP-Konfiguration

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

Figma wird später read-only ergänzt. Keine MCP-Konfiguration erhält Secrets.

## 10.3 Codex-Arbeitsmodus pro Epic

1. `/goal` auf das Epic-Outcome setzen.
2. `/plan` verwenden.
3. Maximal drei read-only Subagents:
   - Data/Ownership Audit,
   - UI/Capability Audit,
   - Proof/Regression Audit.
4. Nur der Hauptagent schreibt Code.
5. Eine Block-ID aus dem Codex-Prompt, ein kohärenter Branch/Commit-Block.
6. Fokussierte Tests während der Arbeit.
7. Full Epic Proof erst vor Commit.
8. `/review` vor dem Commit.

Subagents eignen sich für unabhängige Exploration, nicht für parallele unkoordinierte Writes.

## 10.4 Prompt-Format

Prompts werden kürzer. Dauerhafte Regeln stehen in `AGENTS.md` und Skills.

```text
Goal:
[ein klares Nutzer-Outcome]

Use Skills:
- life-os-vertical-slice
- life-os-backend-action-slice
- life-os-browser-proof
- life-os-completion-gate
- life-os-design-taste, wenn UI betroffen

Context:
- Roadmap Block: [ID]
- bestehende UI/Entities/Actions
- relevante Dateien

Scope:
- zu implementierende Capabilities
- betroffene Cross-Domain-Projektionen

Constraints:
- keine Neuentwicklung des Layouts
- keine parallele Architektur
- keine Remote-DB
- keine Fake-Persistenz

Done when:
- UI + Action + Repository + DB + Reload + Browser-Proof
- abhängige Read Models aktualisiert
- fokussierte Tests grün
- Commit erstellt
```

## 10.5 Dokumentationsregel

Keine separate Produkt-, QA- und Closure-Datei für jeden kleinen Fix.

Für normale Arbeitsblöcke genügen:

- die stabile Blockbeschreibung in `ROADMAP.md`,
- ein aktualisierter Abschnitt mit Ergebnis und Proof-Link,
- QA-Datei nur bei komplexem Security-/Migration-/Integrationsthema.

---

## 11. Lean Testing Policy

Der bisherige Testaufwand wird reduziert, ohne Funktionswahrheit aufzugeben.

### Immer

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- fokussierter Browser-Proof bei UI/Write

### Bei Schema-/Backend-Änderung

- Supabase local migration/lint/advisors
- Unit Test für pure Regeln

### Am Epic-Ende

- `pnpm build`
- betroffene Bereichs-Greps
- Core Smoke Suite
- `/review`

### Nicht mehr

- Full E2E nach jeder Copy-Änderung
- Docs-only Closure-Slices zwischen jeder Implementierung
- breite Greps, die unrelated Bereiche unnötig blockieren

---

## 12. Tool- und Integrationsentscheidungen

### 12.1 Calendar Drag & Drop

Bestehendes Calendar-UI nicht ersetzen. Für spätere Pointer-Interaktion ist `dnd-kit` passend, weil es React-/TypeScript-Integration sowie Keyboard-/Accessibility-Unterstützung besitzt. Keyboard- und Button-Fallback bleiben verbindlich.

### 12.2 Weather

Open-Meteo ist für die persönliche, nichtkommerzielle Nutzung attraktiv, da kein API-Key erforderlich ist. User Location kommt aus Settings; Forecast wird serverseitig gecacht. Attribution wird sichtbar oder in Settings/About dokumentiert.

### 12.3 Garmin

Garmin Health/Activity APIs sind cloud-to-cloud und zugangskontrolliert. Die App darf nicht davon abhängen. Zuerst manual entry und optionaler File Import; Garmin erst als `EXTERNAL_GATE` nach erfolgreichem Program Access.

### 12.4 Existing Open-Source Patterns

- Vikunja bestätigt die Trennung von kanonischen Tasks/Projects/Labels und mehreren Views.
- Mealie bestätigt die Domaintrennung Recipe → Meal Plan → Shopping List.
- Grocy zeigt, dass Pantry/Stock ein eigener Bereich ist und nicht still aus Grocery abgeleitet werden sollte.
- wger bestätigt die Trennung von Exercise Catalog, Workout Plans, Sessions, Weight und Nutrition.

Diese Projekte dienen als Domänenreferenz, nicht als Codequelle oder UI-Vorlage.

---

## 13. DeepSeek Assistant Decision

### Provider Boundary

```ts
interface AiProvider {
  createResponse(input: AssistantRequest): Promise<AssistantResponse>
}
```

Konfiguration:

- `DEEPSEEK_API_KEY` server-only
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- Timeout, max tokens, cost/usage logging ohne Prompt-Inhalte

Die DeepSeek-API ist OpenAI-kompatibel und unterstützt JSON Output sowie Tool Calls. Modelnamen müssen konfigurierbar sein, weil sich das Modellangebot ändert.

### Sicherheitsregel

- Systemprompt enthält keine Secrets.
- Health/Journal/Work-Kontext wird nur bei explizitem Nutzerflow gesendet.
- Tool Calls erhalten minimale Argumente.
- Write Tools erfordern UI-Bestätigung.
- Alle Writes laufen durch bestehende Zod-/Repository-Pfade.

### Retrieval

1. Strukturierte Read Tools zuerst.
2. PostgreSQL Full-Text Search für Notes/Resources.
3. Embeddings/pgvector erst nach eigenem Privacy- und Permissions-Decision-Slice.

---

## 14. Roadmap-Migrationsplan

### Schritt 1 – Read-only Audit

- Root-`ROADMAP.md`, Final Completion Roadmap und Closure-Dokumente abgleichen.
- Capability Registry aus Code, Screenshots, Actions und Browser-Proofs erzeugen.

### Schritt 2 – Kanonische Dateien konsolidieren

- statische `ROADMAP.md`
- `docs/product/capability-registry.md`
- vollständiger statischer Plan und permanente Blockreihenfolge in `ROADMAP.md`

### Schritt 3 – Historie entkoppeln

- bisherige Final Completion Roadmap archivieren oder `Archived` markieren.
- wichtige Closure-Links in die neue Roadmap übernehmen.
- keine Dateien löschen.

### Schritt 4 – AGENTS/Skills justieren

- Codex liest `ROADMAP.md` und Capability Registry vor Epics.
- neue Skills nur, wenn wiederholte Lücke besteht:
  - `life-os-read-model-projection`
  - `life-os-external-integration-gate`
  - `life-os-epic-delivery`

### Schritt 5 – Umsetzung starten

Erster Implementierungsblock nach Roadmap-Rework:

`D1.1 Dashboard Read Model & Navigation Completion`

---

## 15. Offene Entscheidungen

Diese Entscheidungen müssen im jeweiligen Epic getroffen werden, nicht global vorab:

1. Task-/Domain-Link-Modell für Meals, Workouts und Reviews.
2. Free Calendar Event Model.
3. Project/Goal Milestone- und Log-Modell.
4. Pantry und Receipt-OCR-Tiefe.
5. GitHub Integration: API read-only oder manuelle Repository-Einträge.
6. Journal-/Notes-Privacy und AI-Kontext.
7. Reward Currency Regeln.
8. Garmin Access.
9. Semantic Search/Embeddings.
10. Private Remote später oder dauerhaft local-only.

---

# Referenzstruktur für `ROADMAP.md`

```markdown
# Life OS Roadmap

Status: Active
Product mode: personal-only, local-first
Design truth: Life OS – Linear Calm Dark Command Center / Dashboard V5

## Product Contract

Dashboard = Steuerung.
Bereichsseiten = Kontext.
Detailseiten = Tiefe.
Archiv = Vergangenheit.

Life OS ist fertig, wenn jede sichtbare Capability echte kanonische Daten nutzt,
Writes serverseitig validiert und user-scoped sind, abhängige Projektionen nach
Reload stimmen und keine UI mehr Funktion vortäuscht.

## Current State

- UI/V5: weitgehend vorhanden
- Daily Core: connected with gaps
- Calendar task scheduling: connected with gaps
- Project/Goal Workbench: connected with gaps
- Nutrition: connected with gaps
- Health/Habits/Running/Strength: überwiegend UI-only
- Coding/Education/Work/Life: überwiegend UI-only
- AI Assistant: not started
- Operation: local-first ready; remote not required

Detaillierte Wahrheit: `docs/product/capability-registry.md`

## Delivery Program

### D1 – Daily Command Center & Reviews

Outcome:
Dashboard, Inbox, Today, Calendar, Daily Review und Weekly Review bilden einen
geschlossenen täglichen Regelkreis.

Der konkrete Block wird im Nutzer-/Codex-Prompt per ID gewählt. Statuswahrheit:
`docs/product/capability-registry.md`, Code, Tests und Git.

Done when:
- alle Dashboard Panels besitzen echte Quellen oder ehrliche Empty States
- Cards navigieren korrekt
- Mood/Sleep/Weight/Review sind persistiert
- Daily Control und Up Next folgen einer dokumentierten Policy
- Browser-Proofs mit Reload sind grün

## Permanent Sequence

1. D1.1 Dashboard Read Model & Navigation Completion
2. D1.2 Daily/Weekly Review
3. D1.3 Mood/Sleep/Weight
4. D2.1 Schedule Source Links
5. D2.2 Recurring/Routines Management
6. H1.1 Habit Tracking
7. H2.1 Running & Strength Core
8. K1.1 Resource/Skill Graph Read Model
9. A1.1 Area Domain Foundation
10. M1.1 Anti-Rot/Challenges/Rewards
11. AI1 Personal Assistant
12. I1 Integrations & Analytics
13. Z1 Final Local Product Closure

## Later Included Work

- AI1 Personal Assistant with DeepSeek
- I1 Weather/Garmin/GitHub integrations
- Analytics and reports
- Free Calendar Events and accessible Drag/Resize
- Pantry/Receipt OCR
- Archive Browser and Undo

## External Gates

- Garmin API access
- DeepSeek provider/security decision
- any Remote DB or Deployment
- embeddings/semantic search provider

## Definition of Done for Every Block

- existing UI reused unless a design gap is explicit
- canonical data model identified
- server action + Zod + user-scoped repository
- RLS/ownership verified
- dependent Read Models updated
- success/error/empty/auth states
- reload-stable browser proof
- focused checks green
- `/review` completed
- one commit

## Completed Milestones

- W1 Workflow and proof recovery
- Local personal operations and backup/restore smoke
- F1.0 Calendar task scheduling core
- F1.1 Project/Goal Workbench depth
- F1.2 Nutrition deep features

Historical details: `docs/archive/roadmap-history/`

## Roadmap Rules

- no chronological implementation log in this file
- no scope lock unless schema/security/external integration truly needs a decision
- no docs-only closure between ordinary feature slices
- one active milestone at a time
- no new visible control without a real action or explicit future state
- remote/cloud work requires explicit approval
```

---

## Sources consulted

- OpenAI Codex best practices, AGENTS.md, Skills, MCP, Subagents, Workflows
- Next.js App Router, Server Actions, Data Security and Next DevTools MCP
- Supabase RLS, query optimization, views/materialized views, Cron and Webhooks
- Playwright MCP, locators, accessibility snapshots and test practices
- Figma MCP server
- DeepSeek API, JSON Output, Tool Calls and Context Caching
- Garmin Connect Developer Program
- Open-Meteo
- dnd-kit
- Vikunja, Mealie, Grocy and wger
