# MVP Core Release Readiness

Stand: 2026-06-29
Status: R1.9.4 performance baseline documented
Zweck: Roadmap-Reconciliation und Release-Entscheidung nach R1.8.3 MVP Core Hardening.
Quelle der Wahrheit: `PRODUCT.md`, `ROADMAP.md`, `DATA_MODEL.md`,
`SECURITY.md`, `ACCESSIBILITY.md`, `docs/product/mvp-core-status.md` und
`docs/qa/r1-6-5-real-browser-auth-check.md`,
`docs/security/rls-security-audit-r1-9-1.md`,
`docs/security/backup-export-restore-strategy-r1-9-2.md` und
`docs/ops/deployment-env-readiness-r1-9-3.md` und
`docs/qa/performance-baseline-r1-9-4.md`.

## 1. Zweck

Dieses Dokument fasst den MVP-Core-Stand nach R1.8.3 zusammen, gleicht die
Roadmap gegen den tatsaechlichen Repo- und QA-Stand ab und legt die naechste
empfohlene Phase fest. R1.9.1 ergaenzt den lokalen RLS-/Security-Audit-Stand.
R1.9.2 ergaenzt die Backup-/Export-/Restore-Strategie.

R1.8.4 baut keine neuen Features, aendert keine UI, fuehrt keine Migration aus
und nimmt keine RLS-/Policy-Aenderung vor.

R1.9.1 baut keine neuen Produktfeatures und aendert keine UI. R1.9.1 fuehrt
lokales Security-Hardening fuer Grants, Function Search Path und
Repository-Ownership-Gates aus.

R1.9.2 baut keine neuen Produktfeatures und aendert keine UI. R1.9.2 definiert
Backup-/Export-/Restore-Anforderungen, Dateninventar, Exportformat,
Restore-Reihenfolge und lokale Export-Hygiene, ohne echte Nutzerdaten zu
exportieren.

R1.9.3 baut keine neuen Produktfeatures und aendert keine UI. R1.9.3 definiert
Deployment-Env-Grenzen, Client-/Server-Env-Klassen, Supabase Local-vs-
Production-Boundaries und Secrets-Hygiene, ohne echte Secrets zu
dokumentieren, ohne Remote-Supabase-Aktion und ohne Deployment.

R1.9.4 baut keine neuen Produktfeatures und aendert keine UI. R1.9.4
dokumentiert Build-/Runtime-/Repository-/ReadModel- und UI-Render-Baseline,
stabilisiert einen dichtebedingten Nutrition-E2E-Selector und macht keine
Production-Performance-Freigabe.

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
- Deployment-Env-Grenzen sind dokumentiert; echter Deployment-Rehearsal und
  Target-Env-Verifikation fehlen.
- Der lokale RLS-/Security-Audit ist abgeschlossen; Remote-/Production-DB und
  Target-Env sind noch nicht auditiert.
- Backup-/Export-/Restore-Strategie ist definiert; echte Production-Backups,
  Restore-Drill und Automation fehlen.
- Deployment-Env-Boundary ist definiert; echte Deployment-Konfiguration wurde
  nicht in einer Zielumgebung verifiziert.
- Performance Baseline ist lokal dokumentiert; Production Performance bleibt
  bis Deployment-/Real-Data-Baseline offen.
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
- R1.9.4 Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86
  passed, 2 skipped.
- R1.9.4 Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed.

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
- Production Backup Automation und Restore Drill.
- Production Performance Baseline nach Deployment-/Real-Data-Rehearsal.
- Full Accessibility Audit.
- Remote-/Production-Security-Audit.

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
- R1.9.1 hat lokal alle 15 Public-User-Tabellen auditiert; RLS ist enabled,
  Policies sind authenticated-scoped und Grants sind nach Hardening
  least-privilege fuer den lokalen Stand.
- R1.9.1 hat unnoetige `TRUNCATE`-, `REFERENCES`- und `TRIGGER`-Grants fuer
  `anon`/`authenticated` entfernt.
- R1.9.1 hat `public.set_updated_at()` mit fixiertem `search_path` versehen.
- R1.9.1 hat PUBLIC/anon Execute fuer `triage_inbox_item_to_task(...)`
  entfernt.
- R1.9.1 hat Repository-Level Ownership-Gates fuer relationale Kontext-FKs in
  Goal, Project, Inbox, Resource und Task hardening-ergaenzt.
- R1.9.2 hat Backup-/Export-/Restore-Strategie, Dateninventar,
  Sensitivity-Klassen, JSONL-Exportformat, Restore-Reihenfolge und lokale
  Dump-/Export-Git-Hygiene dokumentiert.
- R1.9.3 hat Env-Inventar, Client-/Server-Env-Grenzen,
  Supabase-Local-vs-Production-Boundary, `.env.example`-Placeholder und
  Secrets-Hygiene dokumentiert.
- R1.9.4 hat Build-/Runtime-Baseline, Repository-/ReadModel-Findings,
  UI-Render-Findings und Manual-DB-Dichte als lokales Performance-Risiko
  dokumentiert.
- Keine externe AI API.
- Kein Client API Key.
- Kein Service Role Key.
- Keine Secrets wurden erzeugt, gelesen oder committed.
- Keine Remote-DB-Aktion, kein `supabase link`, kein `supabase db push`.

Noch offen fuer Production Readiness:

- Remote-/Production-DB Audit.
- Deployment-Rehearsal und Zielumgebungs-Env-Verifikation.
- Production Backup Konfiguration.
- Restore Drill.
- Production Performance Baseline mit echten Zielumgebungsdaten.
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
- R1.8.4 hatte keine Migration und keine RLS-/Policy-Aenderung; R1.9.1 enthaelt
  eine lokale Security-Hardening-Migration.
- Keine Remote-DB.
- Keine neue Library.
- Keine externe AI Provider Integration.
- Keine Automation.
- Kein echter Export und kein echter Backup-Dump in R1.9.2.
- Kein echtes Deployment und keine Remote-Env-Verifikation in R1.9.3.
- Kein Production Performance Claim in R1.9.4.
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
| RLS/Security Local Audit | Complete locally | R1.9.1 CLI/advisor/source audit | Remote production audit |
| Backup/Export/Restore Strategy | Complete as strategy | R1.9.2 docs/tooling hygiene | Production backup drill |
| Deployment Env Boundary | Complete as boundary definition | R1.9.3 env/docs/build audit | Deployment rehearsal, target env verification |
| Performance Baseline | Complete locally | R1.9.4 build/runtime greps | Production performance baseline |

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
- RLS/Security: local formal audit and hardening are done; remote production
  audit is deferred.
- Backup/Export/Restore: strategy and local hygiene are done; production backup
  configuration, automation and restore drill are deferred.
- Deployment Env: client/server boundaries and local-vs-production assumptions
  are defined; target deployment verification is deferred.
- Performance: local baseline is documented; production performance baseline is
  deferred.

### Deferred

- Full Template Management fuer Recurring Tasks.
- Nutrition Deep Features: Ingredients, Grocery, Macros.
- Skill Map / Graph.
- Resource Graph.
- External AI Provider.
- Calendar Pointer Drag/Resize.
- Automation.
- Production Backup Automation.
- Restore Drill.
- Production Performance Baseline.
- Full Accessibility Audit.
- Remote Production RLS/Env Audit.
- Deployment rehearsal / target environment verification.

### Risks

- Lokale Manual-DB ist stark gefuellt; einzelne Empty-State-Proofs bleiben
  bewusst skip-gated.
- Production Readiness ist ohne Remote-DB-Audit, Target-Env-Verifikation,
  Production Backup Drill, Deployment-Rehearsal und Production Performance
  Baseline nicht gegeben.
- Externer AI Provider braucht vor Integration einen separaten Privacy-,
  Cost-, Logging- und Failure-State-Block.

## 12. Naechste empfohlene Phase

Empfehlung:

```text
Weiter mit R1.9 - Production Hardening.
```

Scope:

- Remote-/Production-Security-Audit.
- Production Backup Konfiguration und Restore Drill.
- Deployment Rehearsal und Target-Env-Verifikation.
- Production Performance Baseline.
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
- produktive Daten ohne Production Backup/Restore Drill
