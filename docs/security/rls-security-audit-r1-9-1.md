# R1.9.1 RLS / Security Audit

Stand: 2026-06-28
Status: Local audit complete; production release still blocked
Zweck: Formaler lokaler RLS-, Grants-, Server-Action- und Ownership-Gate-Audit
nach R1.8.4 Release Readiness.

## 1. Scope

Auditiert wurden ausschliesslich lokale Repo- und lokale Supabase-Runtime-Artefakte:

- lokale Migrationen unter `supabase/migrations/`
- lokale Public-Schema-Metadaten via Supabase CLI
- RLS Policies, Rollen-Grants, Security Advisors und Functions
- Server Actions unter `src/features/real-data/actions/`
- Supabase Repositories unter `src/features/real-data/supabase/repositories/`
- Supabase Server Client unter `src/lib/supabase/server.ts`
- Secret-/Service-Role-Suchmuster im versionierten Repo ohne `private/`

Nicht ausgefuehrt:

- keine Remote-DB
- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- kein Service-Role-Key
- kein Zugriff auf `private/`
- keine externen AI- oder Provider-Calls

Supabase-Referenzen fuer die Pruefkriterien:

- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/securing-your-api

## 2. Tabelleninventar

Lokaler Public-Schema-Stand nach angewendeten lokalen Migrationen:

| Tabelle | Owner-Spalte | RLS | Auth DML | Delete | Ownership-Notiz |
| --- | --- | --- | --- | --- | --- |
| `profiles` | `id = auth.users.id` | enabled | select, insert, update | no | Profil ist der Auth-User selbst. |
| `areas` | `user_id` | enabled | select, insert, update | no | Soft-Archive-Tabelle. |
| `daily_logs` | `user_id` | enabled | select, insert, update | no | Soft-Archive-Tabelle. |
| `daily_log_tasks` | `user_id` | enabled | select, insert, update, delete | yes | Join/Detail-Tabelle. |
| `goals` | `user_id` | enabled | select, insert, update | no | `area_id` wird repositoryseitig geprueft. |
| `inbox_items` | `user_id` | enabled | select, insert, update | no | Soft-Archive-Tabelle; `area_id` wird geprueft. |
| `projects` | `user_id` | enabled | select, insert, update | no | `area_id` und `goal_id` werden geprueft. |
| `tasks` | `user_id` | enabled | select, insert, update | no | `area_id`, `project_id`, `goal_id` werden geprueft. |
| `resources` | `user_id` | enabled | select, insert, update | no | `area_id` wird geprueft. |
| `resource_relations` | `user_id` | enabled | select, insert, update, delete | yes | Polymorpher `target_id`; Repository prueft Ziel. |
| `recurring_task_templates` | `user_id` | enabled | select, insert, update, delete | yes | `area_id`, `project_id`, `goal_id` werden geprueft. |
| `recipes` | `user_id` | enabled | select, insert, update, delete | yes | `area_id` wird geprueft. |
| `meals` | `user_id` | enabled | select, insert, update, delete | yes | `recipe_id` wird geprueft. |
| `skills` | `user_id` | enabled | select, insert, update, delete | yes | `area_id` wird geprueft. |
| `skill_evidence` | `user_id` | enabled | select, insert, update, delete | yes | Polymorpher `source_id`; Repository prueft Quelle. |

Nicht im lokalen Public-Schema vorhanden: `habits`, `habit_logs`,
`weekly_reviews`, `workouts`, `agent_sessions`.

## 3. RLS-Status

Alle 15 user-relevanten Public-Tabellen haben RLS enabled.

Policy-Muster:

- Policies sind auf `to authenticated` begrenzt.
- `profiles` scoped ueber `(select auth.uid()) = id`.
- Alle anderen auditierten Tabellen scopen ueber `(select auth.uid()) = user_id`.
- Insert Policies nutzen `with check`.
- Update Policies nutzen `using` und `with check`.
- Delete Policies existieren nur fuer Detail-/Join- oder bewusst hard-delete-faehige
  Tabellen.

Bewertung:

```text
RLS_STATUS=PASS_LOCAL
```

## 4. Grants-Status

Vor dem Hardening:

- kein `anon` Select/Insert/Update/Delete auf auditierten Tabellen
- `authenticated` hatte erwartete DML-Rechte
- `anon` und `authenticated` hatten unnoetige Extra-Privilegien
  `TRUNCATE`, `REFERENCES` und `TRIGGER`
- `public.triage_inbox_item_to_task(...)` hatte noch PUBLIC Execute
- `public.set_updated_at()` wurde vom Supabase Security Advisor wegen mutable
  `search_path` gemeldet

Nach dem Hardening:

- kein `anon` DML auf auditierten Tabellen
- `authenticated` hat nur erwartete DML-Rechte
- kein `anon`/`authenticated` Extra-Grant fuer `TRUNCATE`, `REFERENCES` oder
  `TRIGGER`
- `triage_inbox_item_to_task(...)` ist nur fuer `authenticated` und Owner
  ausfuehrbar
- Security Advisor meldet keine Warnungen

Bewertung:

```text
GRANTS_STATUS=PASS_LOCAL_AFTER_FIX
```

## 5. Server Actions Audit

Auditiert:

- `src/features/real-data/actions/inbox.actions.ts`
- `src/features/real-data/actions/task.actions.ts`
- `src/features/real-data/actions/portfolio.actions.ts`
- `src/features/real-data/actions/resource.actions.ts`
- `src/features/real-data/actions/recurring-task-template.actions.ts`
- `src/features/real-data/actions/recurring-task-generation.actions.ts`
- `src/features/real-data/actions/nutrition.actions.ts`
- `src/features/real-data/actions/skill.actions.ts`
- `src/features/real-data/actions/inbox-ai.actions.ts`

Ergebnis:

- Mutierende Actions nutzen `createAuthenticatedSupabaseServerClient()`.
- `auth.user.id` wird serverseitig gesetzt und in Repository-/RPC-Inputs
  geschrieben.
- Clientseitige `userId`-Formwerte werden nicht als Trust Boundary verwendet.
- Inputs werden vor Mutation mit Zod `safeParse` validiert.
- Actions revalidieren nur bekannte App-Routen.
- Keine Action nutzt Service Role.
- `inbox-ai.actions.ts` bleibt lokaler deterministischer Mock ohne externe AI API
  und ohne Autowrite.

Bewertung:

```text
SERVER_ACTIONS=PASS_LOCAL
```

## 6. Polymorphic Ownership Gates

Gepruefte Gates:

- `resource_relations.target_id`:
  `createSupabaseResourceRepository.linkResource()` prueft Source Resource,
  `target_type`-Whitelist und Zielobjekt fuer Goal, Project, Task oder Resource
  gegen denselben `user_id` und aktive Rows.
- `skill_evidence.source_id`:
  `createSupabaseSkillRepository` prueft Skill Ownership und Source Ownership
  fuer Task, Project, Goal oder Resource. `manual_note` verlangt `sourceId = null`.
- Inbox Task Triage:
  `triage_inbox_item_to_task(...)` laeuft security-invoker mit `auth.uid()` und
  prueft Inbox, Area, Project und Goal gegen denselben User.
- Inbox Resource Create:
  `create_resource_from_inbox(...)` laeuft security-invoker mit `auth.uid()` und
  prueft Inbox und Area gegen denselben User.
- Repository-Kontext-FKs:
  Goals, Projects, Inbox Items, Resources und Tasks pruefen nach diesem Audit
  optionale `area_id`, `goal_id` und `project_id` vor Writes gegen aktive Rows
  im aktuellen User-Scope.
- Nutrition:
  Meals pruefen `recipe_id` gegen eigenes nicht archiviertes Recipe.
- Recurring:
  Templates pruefen `area_id`, `project_id` und `goal_id` gegen eigene aktive
  Rows.

Bewertung:

```text
POLYMORPHIC_GATES=PASS_LOCAL_AFTER_FIX
```

## 7. Secrets / Supabase Client Audit

Geprueft:

- `src/lib/supabase/server.ts`
- versionierte Supabase-Konfiguration
- Repo-Suchmuster fuer `service_role`, `SERVICE_ROLE`, `SUPABASE_SERVICE`,
  `secret`, `SECRET`, `NEXT_PUBLIC_SUPABASE`, `SUPABASE`
- Suchlauf ohne `private/`, `.local/`, `node_modules/`,
  `supabase/.temp/`, `supabase/.branches/`

Ergebnis:

- Server Client nutzt nur `NEXT_PUBLIC_SUPABASE_URL` und
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` beziehungsweise
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Keine Service-Role-Verwendung im App-Code gefunden.
- Keine Secret-Werte committed.
- `private/` wurde nicht gelesen oder veraendert.
- `.local/` bleibt unversioniert.

Bewertung:

```text
SECRETS_STATUS=PASS_REPO_LOCAL
```

## 8. Findings

### F1 Mutable Function Search Path

`public.set_updated_at()` hatte keinen fixierten `search_path`. Der lokale
Supabase Security Advisor meldete `function_search_path_mutable`.

Status: fixed.

### F2 PUBLIC Execute auf Triage RPC

`public.triage_inbox_item_to_task(...)` hatte PUBLIC Execute. Die Function
pruefte bereits `auth.uid()`, aber die Execute-Oberflaeche war breiter als
noetig.

Status: fixed.

### F3 Unnoetige Tabellen-Extra-Privilegien

`anon` und `authenticated` hatten `TRUNCATE`, `REFERENCES` und `TRIGGER` auf
Public-Tabellen. Es gab kein `anon` DML, aber die Extra-Privilegien waren nicht
least-privilege.

Status: fixed.

### F4 Repository-Level Same-User FK Gates unvollstaendig

Einige relationale FK-Felder wurden bereits durch Actions oder RPCs geprueft,
aber nicht in allen einfachen Repositories selbst.

Betroffene Felder:

- `goals.area_id`
- `projects.area_id`
- `projects.goal_id`
- `inbox_items.area_id`
- `resources.area_id`
- `tasks.area_id`
- `tasks.project_id`
- `tasks.goal_id`

Status: fixed.

## 9. Fixes

Migration:

- `supabase/migrations/20260628200709_r1_9_1_rls_security_hardening.sql`

Migration-Inhalt:

- `public.set_updated_at()` bekommt `search_path = public`
- PUBLIC/anon Execute fuer `triage_inbox_item_to_task(...)` wird revoked
- authenticated Execute fuer `triage_inbox_item_to_task(...)` bleibt explizit
- `TRUNCATE`, `REFERENCES`, `TRIGGER` werden fuer `public`, `anon` und
  `authenticated` auf Public-Tabellen revoked
- Default Privileges fuer zukuenftige Public-Tabellen werden entsprechend
  eingeschraenkt

Code-Hardening:

- `supabase-goal-repository.ts`: `areaId` ownership check vor Create
- `supabase-project-repository.ts`: `areaId`/`goalId` ownership check vor Create
- `supabase-resource-repository.ts`: `areaId` ownership check vor Create
- `supabase-inbox-repository.ts`: `areaId` ownership check vor Create
- `supabase-task-repository.ts`: `areaId`/`projectId`/`goalId` ownership check
  vor Create, Update und generated Task Instance Create

## 10. Deferred Risks

- Remote-/Production-DB wurde nicht auditiert; lokaler PASS ist kein Production
  Release Claim.
- Deploy-Environment-Secrets koennen durch Repo-Suche nicht bewiesen werden.
- Polymorphe Felder bleiben bewusst ohne DB-FK; die App erzwingt Ownership in
  Repository/RPC Gates. Ein spaeterer Trigger- oder Constraint-Ansatz waere ein
  eigener Scope.
- Es gibt noch keinen pgTAP-/SQL-Test-Harness fuer negative Cross-User-RLS-Cases.
- Backup/Export, Restore, Deployment Env Check und Performance Review bleiben
  R1.9-Blocker.

## 11. Production Readiness Status

```text
LOCAL_RLS_SECURITY_AUDIT_PASS_AFTER_FIX
NOT_PRODUCTION_RELEASE_READY
```

R1.9.1 schliesst den lokalen RLS-/Grants-/Ownership-Gate-Audit fuer den MVP
Core ab. Production Readiness bleibt geblockt, bis Remote Env, Backup/Restore,
Deployment Hardening und Performance abgeschlossen sind.
