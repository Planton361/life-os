# MVP Core Status

Stand: 2026-06-28
Status: R1.9.2 backup export restore strategy
Zweck: Konsolidierter MVP-Core-Status nach R1.8.4 Release Readiness, R1.9.1 lokalem RLS-/Security-Audit und R1.9.2 Backup-/Export-/Restore-Strategie.
Quelle der Wahrheit: `PRODUCT.md`, `ROADMAP.md`, `docs/product/*` Locks, `docs/product/mvp-core-release-readiness.md`, `docs/security/rls-security-audit-r1-9-1.md`, `docs/security/backup-export-restore-strategy-r1-9-2.md` und `docs/qa/r1-6-5-real-browser-auth-check.md`.

## 1. Abgeschlossene Bloecke

- Daily Core: Dashboard Quick Thought, Inbox, Today, Calendar Queue/Blocks und Portfolio Task Lifecycle sind verbunden.
- Inbox Routing: Standalone Task, Add to Existing Task-Beitrag fuer Project/Goal, Create New Project/Goal, Resource Draft und Solved/Archive sind bestaetigungsgebunden.
- Portfolio: Tasks, Projects, Goals und Skills haben echte Manual-DB-Pfade fuer die freigegebenen CRUD-/Lifecycle-Slices.
- Resources: Resource Create und Resource Relations zu Project/Goal sind real angebunden; UUID-Labels werden in Workbenches vermieden.
- Recurring: Templates, explizite Generierung und Today/Dashboard/Calendar-Queue-Projektion sind vorhanden; keine automatische Background-Generation.
- Nutrition: Recipes und Meals sind als Manual-DB-Flow angebunden; Planner-Edit, Grocery und tiefe Nutrition-Features bleiben begrenzt.
- Skills: Skills und Evidence sind real angebunden inklusive Edit, Archive, Delete und Project/Resource Source Linking.
- AI Inbox Suggestions: lokale deterministische Vorschlaege fuellen Drafts, persistieren aber nichts ohne User-Confirm.
- RLS/Security Local Audit: alle lokalen Public-User-Tabellen, RLS Policies, Grants, Functions, Server Actions und Ownership Gates sind in R1.9.1 auditiert und gehardent.
- Backup/Export/Restore Strategy: MVP-Dateninventar, Sensitivity-Klassen, JSONL-Exportformat, Restore-Reihenfolge und lokale Export-Hygiene sind in R1.9.2 definiert.

## 2. Browserbewiesene Flows

- Core-Grep: `Manual|Inbox|Today|Dashboard|Calendar|Portfolio` mit 86 passed, 2 skipped.
- Extensions-Grep: `Resources|Nutrition|Skill|AI|Recurring` mit 25 passed.
- Bewiesen sind Quick Capture, Inbox Resolve, AI Suggestion Review, Task/Resource/Create-New Confirm, Today Planning, Calendar Scheduling/Unschedule/Conflict-Gate, Portfolio Lifecycle, Resource Relations, Recurring Generation, Nutrition Meal Completion und Skill Evidence Source Linking.
- R1.8.3 ergaenzt Accessibility-/Hardening-Assertions fuer Inbox Task-Draft Labels, Calendar Previous/Next Week Accessible Names und AI No-Persistence Copy.

## 3. Teilweise bewiesene Flows

- Create New Project/Goal aus Inbox beweist Browser-seitig Resolve und wurde lokal gegen DB-Write verifiziert; die Portfolio-Defaultliste ist bei stark gefuellter Manual-DB kein stabiler unmittelbarer Selector.
- AI Resource Suggestion beweist Draft-Uebernahme, Confirm und Resolve; der lokale Resource-Write wurde gegen die DB verifiziert, waehrend die Resource-Library bei vielen Testdaten nicht als globaler Text-Selector stabil ist.
- Nutrition Planner zeigt recipe-linked Meals; Planner-Edit-Persistenz bleibt deferred.
- Calendar Drag/Resize bleibt Interaction-v1/Keyboard-Fallback, kein Pointer-Drag.

## 4. Bekannte Skips

- Core-Grep: 2 datenabhaengige Manual-Empty-Gates bei gefuellter lokaler Manual-DB.
- Keine Environment-Bind- oder Auth-State-Skips im R1.8.1-Lauf.
- Skips sind kein App-Failure fuer die bewiesenen Manual-DB-Flows.

## 4.1 R1.8.2 Proof Stability

- Manual-DB-Hygieneregeln sind in `docs/qa/manual-db-test-data-hygiene.md` dokumentiert.
- Kritische Browser-Proofs verwenden eindeutige `uniqueTitle(prefix)`-Titel mit Zeitstempel und Zufallssuffix.
- Inbox-Proofs selektieren neue Captures ueber Queue Item und Active Item statt globale Textsuche.
- Portfolio-Proofs oeffnen erzeugte Entities ueber Entity-List-Link und pruefen `#selected-entity-heading`.
- Resource-Proofs oeffnen Resources ueber Library-Link und pruefen `#selected-resource-heading`.
- Nutrition- und Skill-Proofs verwenden scoped Assertions in der passenden Page bzw. im Context Panel.
- Keine DB-Reset-Pflicht, keine Cleanup-Aktion und keine Migration in R1.8.2.

## 4.2 R1.8.3 MVP Core Hardening

- Hardening Review dokumentiert in `docs/qa/mvp-core-hardening-review.md`.
- Accessibility Review der MVP-Hauptflows abgeschlossen: Inbox Routing/AI, Today Planner, Calendar Scheduling, Portfolio Workbenches, Resources, Nutrition und Recurring Trigger.
- Inbox async Feedback nutzt fuer Success `role="status"` und fuer Blocked/Error `role="alert"`.
- Portfolio Task Archive redirectet nach erfolgreicher Server Action zu einem sichtbaren `Task archiviert.` Status und entfernt den stale selected-task Zustand.
- Security/Privacy Review der neuen Actions bestaetigt serverseitige Supabase Auth, Zod-Validierung, Repository-/RPC-User-Scope, keine Service Role, keine Secrets und keine externe AI API.
- Prepared/Future UI bleibt begrenzt: Skill Map, Resource Graph, Recurring Automation, Nutrition Deep Features, AI Provider, Grocery/Ingredients, Calendar Pointer Drag und Routine UI behaupten keine nicht vorhandene Persistenz.
- R1.8.3 Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm exec supabase db lint --local --level warning`, Core-Grep und Extensions-Grep gruen.
- Keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB, kein Supabase Link/Push/Reset, keine Service Role, keine neue Library.

## 4.3 R1.8.4 MVP Core Release Readiness

- Release Readiness dokumentiert in `docs/product/mvp-core-release-readiness.md`.
- R1.8.3 ist abgeschlossen; MVP Core Hardening ist abgeschlossen.
- R1.8.4 Roadmap Reconciliation ist abgeschlossen: MVP Core ist lokal/manual-browser-ready, aber noch nicht production-release-ready.
- Completed: Daily Core, Inbox Routing Completion, Task Lifecycle, Project Workbench v1, Goal Workbench v1, Resource Relations v1, Calendar Scheduling Controls, Recurring Tasks v1, Nutrition Recipes/Meals v1, Skills/Evidence v1, AI Inbox Suggestions v1, Manual DB Proof Hygiene und MVP Core Hardening.
- Partially Complete: Calendar Pointer Drag/Resize, Recurring Template Management, Nutrition Deep Features, Skill Map/Graph, Resource Graph, External AI Provider, Full Accessibility Audit und Remote-/Production-Security-Audit.
- Deferred: Automation, Production Backup Drill, Performance Review, Deployment Hardening, echte AI Provider Integration, Remote-/Production-DB-Audit und Production Release Claim.
- Naechste empfohlene Phase: R1.9 Production Hardening fortsetzen mit Remote-/Production-Security-Audit, Production Backup Drill, Deployment Env Check, Performance und Accessibility Pass.
- R1.8.4 ist ein Produkt-/QA-/Roadmap-Block: keine neuen Features, keine UI-Rekomposition, keine Migration, keine RLS-/Policy-Aenderung, keine Remote-DB, keine Service Role, keine neue Library.

## 4.4 R1.9.1 RLS / Security Audit

- Audit dokumentiert in `docs/security/rls-security-audit-r1-9-1.md`.
- Local RLS Status: alle 15 user-relevanten Public-Tabellen haben RLS enabled.
- Grants Status: kein `anon` DML, keine unnoetigen `TRUNCATE`-/`REFERENCES`-/`TRIGGER`-Grants fuer `public`, `anon` oder `authenticated`.
- Function Status: Supabase Security Advisor meldet nach Fix keine Warnungen; `set_updated_at()` hat `search_path = public`; `triage_inbox_item_to_task(...)` ist nur fuer `authenticated` explizit freigegeben.
- Server Actions: serverseitige Supabase Auth, Zod `safeParse`, serverseitiges `auth.user.id`, keine Service Role und keine externe AI API.
- Repository Gates: Goals, Projects, Inbox Items, Resources und Tasks pruefen relationale Kontext-FKs gegen aktive same-user Rows; polymorphe Resource- und Skill-Gates bleiben bestaetigt.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, Supabase local `db lint` und Security Advisors gruen.
- Status: `LOCAL_RLS_SECURITY_AUDIT_PASS_AFTER_FIX`, aber weiterhin `NOT_PRODUCTION_RELEASE_READY`.

## 4.5 R1.9.2 Backup / Export / Restore Strategy

- Strategie dokumentiert in `docs/security/backup-export-restore-strategy-r1-9-2.md`.
- Export Scope: 15 MVP-Tabellen fuer Core Identity, Daily Flow, Portfolio, Resources, Recurring, Nutrition und Skills.
- Sensitivity: Nutrition ist `health_sensitive`; Work-/Coding-nahe Inhalte koennen `work_sensitive` sein; spaetere AI-Artefakte bleiben `ai_sensitive`.
- Export Format: spaeter JSON Lines pro Tabelle plus `manifest.json`; technischer DB-Recovery-Pfad bleibt SQL/Postgres/Supabase-Dump.
- Restore Order: `profiles`, `areas`, `goals`, `projects`, `inbox_items`, `daily_logs`, `recurring_task_templates`, `tasks`, `daily_log_tasks`, `resources`, `resource_relations`, `recipes`, `meals`, `skills`, `skill_evidence`.
- Tooling: `scripts/export/` enthaelt nur README und synthetisches Manifest-Beispiel; `export:local` ist ein Placeholder und exportiert keine Daten.
- Git Hygiene: `exports/`, `backups/`, `*.dump`, `*.sql.gz` und `*.backup` sind ignoriert.
- Status: `BACKUP_EXPORT_RESTORE_STRATEGY_DEFINED`, aber weiterhin `NOT_PRODUCTION_RELEASE_READY`.

## 4.6 Status-Matrix

| Feature | Status | Browser Proof | Deferred |
| --- | --- | --- | --- |
| Daily Core | Complete for MVP Core | Core-Grep 86 passed, 2 skipped | Full Daily/Weekly Review |
| Inbox Routing Completion | Complete for MVP Core | Inbox/Manual Core-Grep | Notes/Decision/Skill route expansion |
| Task Lifecycle | Complete for MVP Core | Portfolio/Today/Dashboard/Calendar | Archive browser and undo |
| Project Workbench | Complete for v1 | Portfolio/Manual | Milestones, logs, reviews |
| Goal Workbench | Complete for v1 | Portfolio/Manual | Milestones, review cadence, reviews |
| Resource Relations | Complete for v1 | Resources/Portfolio | Full Resource Graph |
| Calendar Scheduling Controls | Complete for interaction v1 | Calendar Core-Grep | Pointer drag/resize |
| Recurring Tasks v1 | Complete for explicit generation | Extensions-Grep | Full template management, automation |
| Nutrition Recipes/Meals v1 | Complete for MVP slice | Extensions-Grep | Ingredients, Grocery, Macros |
| Skills/Evidence v1 | Complete for Portfolio slice | Extensions-Grep | Skill Map / Graph |
| AI Inbox Suggestions v1 | Complete as local mock | AI/Inbox proofs | External AI Provider |
| Manual DB Proof Hygiene | Complete | Stabilized selectors/proofs | Cleanup/retention policy |
| MVP Core Hardening | Complete | R1.8.3 validation green | Full production audit |
| RLS/Security Local Audit | Complete locally | R1.9.1 CLI/advisor/source audit | Remote production audit |
| Backup/Export/Restore Strategy | Complete as strategy | R1.9.2 docs/tooling hygiene | Production backup drill |

## 5. Prepared/Future Scope

- Project Workbench: Milestones und Project Log bleiben prepared.
- Goal Workbench: Milestones, Review Cadence und Goal Log bleiben prepared.
- Resource Graph / Skill Map Visualisierung bleibt Future Scope; keine Graph-Library und keine Node Map.
- Skill Map in Coding bleibt lokale/mock Workbench, nicht kanonische Skill-Graph-Persistenz.
- Recurring Automation bleibt Future Scope: keine Cron Jobs, Background Jobs oder automatische Page-Load-Generation.
- Nutrition Deep Features bleiben Future Scope: Ingredients, Grocery-Persistenz, Macro Targets, externe APIs und medizinische Empfehlungen.
- AI bleibt Vorschlags- und Review-Schicht: keine externe AI API, keine autonome Writes, keine Secrets.

## 6. Naechste empfohlene Phase

R1.9 sollte Production Hardening fortsetzen:

- Remote-/Production-Security-Audit und Deployment Env Check.
- Production Backup Drill.
- Performance Review.
- Vollstaendiger Accessibility Pass.
- Keine neue Automation, Graph-Visualisierung oder externe AI vor abgeschlossenem Production-Hardening.
