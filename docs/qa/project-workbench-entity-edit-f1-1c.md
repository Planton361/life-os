# F1.1C Project Workbench Entity Edit / Status Slice

Stand: 2026-07-11
Status: PASS_WITH_LOCAL_CALENDAR_SLOT_SKIPS
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/project-goal-workbench-depth-scope-f1-1a.md`,
`docs/qa/project-goal-workbench-state-clarity-f1-1b.md`.
Gilt fuer: Project Workbench Entity Edit, Project Status Field Update, Project
Soft Archive, focused browser proof.
Nicht gilt fuer: Goal Workbench, Milestones, Logs, Review Cadence, Progress
Engine, Graph, AI Coach, migrations, RLS-/policy changes, remote DB,
deployment, secrets.

## Ziel

F1.1C verbindet den naechsten kleinen Project Workbench Write-Slice, ohne die
Workbench neu zu bauen:

- Project Title bearbeiten
- Project Summary bearbeiten
- Project Next Action bearbeiten
- Project Status bearbeiten
- Project per Soft Archive aus aktiven Portfolio-Listen entfernen

Der Slice nutzt das vorhandene Project-Modell. Er fuehrt kein neues Datenmodell
und keine neue Workbench-Architektur ein.

## Project Entity Audit

Vorhandene Project-Felder:

- `id`
- `user_id`
- `area_id`
- `goal_id`
- `title`
- `description`
- `status`
- `priority`
- `progress`
- `next_step`
- `start_date`
- `target_date`
- `created_at`
- `updated_at`
- `archived_at`

Vorhandene Statuswerte:

- `idea`
- `active`
- `paused`
- `blocked`
- `completed`
- `archived`

Vorhandene Backend-Basis:

- `updateProjectInputSchema` existierte bereits.
- `ProjectRepository.updateProject` existierte im Interface, war aber in der
  Supabase-Repository-Implementierung noch ein Adapter-Failure.
- `projects` hat user-scoped RLS und Update-Grants.
- `areaId` und `goalId` Ownership-Pruefung war fuer Project-Kontext bereits
  vorhanden und wird wiederverwendet.

## Slice Decision

Gebaut:

- Project Entity Edit fuer Title, Summary, Next Action und Status.
- Project Soft Archive ueber Status `archived` plus `archived_at`.
- Workbench-UI-Bindung mit Success-State und Reload-Proof.

Bewusst nicht gebaut:

- Project Complete/Close als eigener Lifecycle.
- Project Undo oder Restore.
- Project History/Audit Trail.
- Milestones.
- Project Log.
- Progress Engine.
- Graph oder AI Coach.

## Backend Action

Neu verbunden:

- `updateProjectAction`
- `updateProjectFormAction`
- `archiveProjectAction`
- `archiveProjectFormAction`
- `mapUpdateProjectInputToPatch`
- Supabase `updateProject`

Backend-Gates:

- serverseitige Supabase Auth
- Manual-Profil-Gate
- Zod `safeParse`
- same-user Scope ueber `profileId === userId`
- Repository-Grenze
- `user_id` und `projectId` Filter
- `archived_at is null` Guard fuer aktive Updates
- Revalidation fuer Portfolio, Inbox, Dashboard, Today und Calendar

## UI Binding

Project Workbench zeigt jetzt:

- `Project bearbeiten`
- `Project speichern`
- `Project archivieren`

Das Edit-Formular schreibt echte Project-Daten. Die Archive-Aktion ist
separat und sichtbar als Soft Archive ausgelegt.

## Browser Proof

Required focused proof:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Project Workbench|Portfolio|Manual"
```

Neue Assertion:

- `Manual Project Workbench edits status and archives Project reload-stable`

Result 2026-07-11:

```text
69 passed, 6 skipped, 0 failed
```

Skip-Einordnung:

- 2 bestehende Manual-/Inbox-empty Skips aus dem bisherigen Grep.
- 4 Calendar-Skips, weil der lokale Manual-DB-Tag fuer die Calendar-
  Slot-Finder voll belegt war und keine freie konfliktfreie Testzone ohne
  Cleanup/DB-Reset verfuegbar war.

F1.1C-relevant:

- `Manual Project Workbench edits status and archives Project reload-stable`
  passed.
- `Manual Project Workbench creates linked Project task reload-stable` passed.
- `Manual Project Workbench keeps linked task lifecycle intact` passed.
- `Manual Resource to Project Relation Create persists through Resources and
  Project Workbench` passed.

Proof deckt ab:

- Project im Manual-DB-Pfad erstellen.
- Project im Workbench bearbeiten.
- Success-State `Project aktualisiert.` sehen.
- Title, Summary, Next Action und Status nach Reload wiedersehen.
- Project per Workbench Soft Archive archivieren.
- Success-State `Project archiviert.` sehen.
- Archiviertes Project nach Reload nicht mehr in der aktiven Project-Liste
  sehen.

## Deferred

- Goal Edit, Pause, Achieve, Archive.
- Project Complete/Close.
- Project Undo/Restore.
- Project Milestones.
- Project Log.
- Review Cadence.
- Finales Progress-Modell.
- Graph / Relation Map.
- AI Coach.
- Workbench-local Resource Management.

## Validation

Ausgefuehrt:

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Project Workbench|Portfolio|Manual"`:
  69 passed, 6 skipped, 0 failed
- `pnpm build`
- `pnpm exec supabase db lint --local --level warning`: No schema errors found
- `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`:
  No issues found

## Claim Impact

Vor F1.1C:

```text
Project Workbench = local_connected_with_depth_gap
Project Update/Archive = future/depth gap
```

Nach F1.1C:

```text
Project Workbench = local_connected_with_depth_gap
Project Entity Edit = local_connected
Project Soft Archive = local_connected
Project Complete/Close/Undo = future/depth gap
```

Keine Production-, Remote-, Public-SaaS- oder final-complete-Claims werden
angehoben.
