# MVP Core Release Readiness

Stand: 2026-06-28
Status: R1.8.4 Release Readiness documented
Zweck: Roadmap-Reconciliation und Release-Entscheidung nach R1.8.3 MVP Core Hardening.
Quelle der Wahrheit: `PRODUCT.md`, `ROADMAP.md`, `DATA_MODEL.md`,
`SECURITY.md`, `ACCESSIBILITY.md`, `docs/product/mvp-core-status.md` und
`docs/qa/r1-6-5-real-browser-auth-check.md`.

## 1. Zweck

Dieses Dokument fasst den MVP-Core-Stand nach R1.8.3 zusammen, gleicht die
Roadmap gegen den tatsaechlichen Repo- und QA-Stand ab und legt die naechste
empfohlene Phase fest.

R1.8.4 baut keine neuen Features, aendert keine UI, fuehrt keine Migration aus
und nimmt keine RLS-/Policy-Aenderung vor.

## 2. Stand

Der MVP Core ist lokal und manuell im Browser nutzbar. Die zentralen Capture-,
Routing-, Task-, Portfolio-, Today-, Calendar-, Resource-, Recurring-,
Nutrition-, Skill- und AI-Suggestion-Slices sind fuer die freigegebenen
MVP-Pfade implementiert, lokal browserbewiesen und dokumentiert.

Release-Entscheidung:

```text
MVP Core ist lokal/manual-browser-ready, aber noch nicht production-release-ready.
```

Begruendung:

- Die App laeuft gegen lokale Supabase- und Manual-DB-Proofs.
- Deployment-Hardening ist noch nicht abgeschlossen.
- Ein finaler RLS-Audit steht noch aus.
- Backup/Export und Restore-Strategie fehlen.
- Performance Review fehlt.
- Externer AI Provider fehlt bewusst; AI bleibt lokaler deterministischer Mock.

## 3. Browserbewiesene Flows

Browserbewiesen nach R1.8.3:

- Dashboard Quick Thought zu Inbox.
- Inbox Quick Capture und aktive Inbox-Item-Auswahl.
- Inbox Standalone Task Draft mit bestaetigter Task-Erstellung.
- Add to Existing Task-Beitrag fuer Project und Goal.
- Inbox Create New fuer Project und Goal.
- Inbox Resource Draft mit Resource-Create und Inbox-Resolve.
- Solved / Archive ohne Zielobjekt.
- AI Inbox Suggestions als lokaler Mock mit Draft-Uebernahme und ohne
  Auto-Persistenz.
- Today Planner mit `plannedDate`.
- Dashboard Today Agenda und Daily Control mit echten Manual-Tasks.
- Calendar Planner Queue, Scheduling, Unschedule, Reschedule, Conflict-Gate und
  15-Minuten-Controls.
- Portfolio Task Lifecycle: complete, reopen, unschedule, reschedule, archive.
- Portfolio Contextual Create fuer Task, Project und Goal.
- Project Workbench v1 und Goal Workbench v1 mit Linked Work.
- Resource Relations fuer Project/Goal-Kontexte und Resource Inspector.
- Recurring Template Create und explizite idempotente Task-Generation.
- Nutrition Recipes/Meals inklusive Meal Complete und Planner-Projektion.
- Skills/Evidence inklusive Create, Edit, Archive, Delete und Source Linking.

Aktuelle Proofs:

- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed,
  2 skipped.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed.

## 4. Manuell nutzbare Features

- Capture und Inbox Routing.
- Task-Erstellung, Planung, Terminierung und Lifecycle.
- Project-/Goal-Erstellung und Workbench-Kontext.
- Resource-Erstellung und Resource Relations.
- Recurring Templates mit expliziter Generation.
- Recipe-/Meal-Erstellung und Meal Completion.
- Skill- und Evidence-Verwaltung.
- AI Suggestions als Review-Schicht ohne Autowrites.

## 5. Prepared / Future Scope

Prepared oder Future Scope bleibt klar getrennt:

- Full Template Management fuer Recurring Tasks.
- Nutrition Deep Features: Ingredients, Grocery, Macros, externe Food APIs.
- Skill Map / Graph Visualisierung.
- Resource Graph Visualisierung.
- Externer AI Provider.
- Calendar Pointer Drag/Resize.
- Automation, Background Jobs, Cron Jobs.
- Export/Backup und Restore.
- Performance Review.
- Full Accessibility Audit.
- Finaler RLS Audit.

## 6. Bekannte Skips

- Zwei Core-Grep-Skips sind datenabhaengige Manual-Empty-Gates bei gefuellter
  lokaler Manual-DB.
- Die Skips gelten nicht als App-Failure fuer die browserbewiesenen
  Manual-DB-Flows.
- Kein DB Reset ist Standard-Testschritt.
- Playwright wurde in R1.8.4 nicht erneut ausgefuehrt, weil dieser Block nur
  Produkt-/QA-Dokumentation aendert und keine UI-/Code-Aenderung enthaelt.

## 7. Lokale Auth- und DB-Hinweise

- Lokale Supabase Runtime bleibt Grundlage der Manual Browser Proofs.
- Verwendeter Auth-State in R1.8.3:
  `.local/playwright/supabase-auth-state-localhost.json`.
- `.local/` bleibt unversioniert.
- `private/` bleibt unversioniert und wurde nicht angefasst.
- Die lokale Manual-DB akkumuliert Proof-Daten bewusst; Cleanup oder Reset
  brauchen einen eigenen freigegebenen QA-Block.

## 8. Security / Privacy Status

- Server Actions nutzen serverseitige Supabase Auth.
- Actions akzeptieren keine clientseitige `userId` als Trust Boundary.
- Zod validiert Mutation Inputs.
- Repositories und RPCs pruefen User-/Ownership-Scope fuer die verbundenen
  Targets.
- Keine externe AI API.
- Kein Client API Key.
- Kein Service Role Key.
- Keine Secrets wurden erzeugt, gelesen oder committed.
- Keine Remote-DB-Aktion, kein `supabase link`, kein `supabase db push`.

Noch offen fuer Production Readiness:

- Finaler RLS Audit.
- Deployment Env Check.
- Backup/Export und Restore-Plan.
- Security Review fuer echte AI Provider, falls spaeter freigegeben.

## 9. Accessibility Status

- R1.8.3 pruefte die MVP-Hauptflows auf Accessibility- und Error-State-Risiken.
- Inbox Feedback nutzt Status-/Alert-Semantik.
- Calendar Previous/Next Week Accessible Names werden per E2E geprueft.
- Task Draft Labels werden per E2E geprueft.
- AI No-Persistence Copy wird per E2E geprueft.

Noch offen fuer Production Readiness:

- Vollstaendiger WCAG-orientierter Audit.
- Mobile/Keyboard-Pass ueber alle spaeteren Deep Features.
- Kontrast-/Focus-Pass fuer neue Future-Scope-Oberflaechen.

## 10. Nicht-Ziele fuer diesen Release

- Keine neuen Features.
- Keine UI-Rekomposition.
- Keine Dashboard-Layout-Aenderung.
- Keine Migration.
- Keine RLS-/Policy-Aenderung.
- Keine Remote-DB.
- Keine neue Library.
- Keine externe AI Provider Integration.
- Keine Automation.
- Kein Export/Backup.
- Kein Production Deployment Claim.

## 11. Roadmap Audit

### Completed

| Feature | Status | Browser Proof | Deferred |
| --- | --- | --- | --- |
| Daily Core | Complete for MVP Core | 86 passed, 2 skipped Core-Grep | Full Daily/Weekly Review |
| Inbox Routing Completion | Complete for MVP Core | Inbox/Manual flows in Core-Grep | Notes/Decision/Skill route expansion |
| Task Lifecycle | Complete for MVP Core | Portfolio/Today/Dashboard/Calendar proofs | Full archive browser and undo |
| Project Workbench | Complete for v1 | Portfolio/Manual proofs | Milestones, logs, project reviews |
| Goal Workbench | Complete for v1 | Portfolio/Manual proofs | Milestones, review cadence, goal reviews |
| Resource Relations | Complete for v1 | Resource/Portfolio proofs | Full Resource Graph |
| Calendar Scheduling Controls | Complete for interaction v1 | Calendar proofs in Core-Grep | Pointer drag/resize |
| Recurring Tasks v1 | Complete for explicit generation | Extensions-Grep | Full template management, automation |
| Nutrition Recipes/Meals v1 | Complete for recipes/meals slice | Extensions-Grep | Ingredients, Grocery, Macros |
| Skills/Evidence v1 | Complete for Portfolio Skills slice | Extensions-Grep | Skill Map / Graph |
| AI Inbox Suggestions v1 | Complete as local mock | AI/Inbox proofs | External provider |
| Manual DB Proof Hygiene | Complete | Stabilized Core/Extensions proofs | Cleanup/retention policy |
| MVP Core Hardening | Complete | R1.8.3 validation green | Full production audit |

### Partially Complete

- Calendar Drag/Resize: design lock and 15-minute controls exist; pointer
  drag/resize remains deferred.
- Recurring Tasks: template create and explicit generation exist; full template
  management and automatic generation remain deferred.
- Nutrition: Recipe/Meal MVP exists; ingredients, grocery and macro targets are
  deferred.
- Skills: Skills/Evidence MVP exists; Skill Map/Graph is deferred.
- Resources: Relation workbench exists; Resource Graph is deferred.
- AI: Local deterministic suggestions exist; external provider is deferred.
- Accessibility: MVP-flow hardening is done; full audit is deferred.
- RLS/Security: local lint and action-boundary review are done; final formal
  RLS audit is deferred.

### Deferred

- Full Template Management fuer Recurring Tasks.
- Nutrition Deep Features: Ingredients, Grocery, Macros.
- Skill Map / Graph.
- Resource Graph.
- External AI Provider.
- Calendar Pointer Drag/Resize.
- Automation.
- Export/Backup.
- Performance.
- Full Accessibility Audit.
- Final RLS Audit.

### Risks

- Lokale Manual-DB ist stark gefuellt; einzelne Empty-State-Proofs bleiben
  bewusst skip-gated.
- Production Readiness ist ohne RLS Audit, Backup/Export, Deployment-Hardening
  und Performance Review nicht gegeben.
- Externer AI Provider braucht vor Integration einen separaten Privacy-,
  Cost-, Logging- und Failure-State-Block.

## 12. Naechste empfohlene Phase

Empfehlung:

```text
Zuerst R1.9 - Production Hardening.
```

Scope:

- RLS Audit.
- Export/Backup und Restore-Plan.
- Deployment Env Check.
- Performance Review.
- Accessibility Pass.

Warum:

Der MVP-Core ist funktional weit und lokal browserbewiesen, aber noch nicht
production-hardened. Graph-, AI-Provider- und Deep-Domain-Arbeiten wuerden die
Oberflaeche verbreitern, bevor die aktuelle Core-Schicht ausreichend
produktionsfest ist.

Zurueckgestellt nach R1.9:

- R2.0 Knowledge Graph / Skill Map Design.
- R2.0 AI Provider Integration.

## 13. Release-Readiness-Entscheidung

```text
LOCAL_MANUAL_BROWSER_READY
NOT_PRODUCTION_RELEASE_READY
```

Freigegeben fuer:

- lokale manuelle Nutzung
- weitere lokale QA
- R1.9 Production Hardening

Nicht freigegeben fuer:

- Production Release Claim
- Remote DB Push
- Deployment ohne Hardening Gate
- externe AI Provider Integration
- produktive Daten ohne Backup/Export-Plan
