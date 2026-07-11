# F1.1D Goal Workbench Entity Edit / Status Slice

Stand: 2026-07-11
Status: PASS_TARGETED_LOCAL_BROWSER_PROOF
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/project-goal-workbench-depth-scope-f1-1a.md`,
`docs/qa/project-goal-workbench-state-clarity-f1-1b.md`,
`docs/qa/project-workbench-entity-edit-f1-1c.md`.
Gilt fuer: Goal Workbench Entity Edit, Goal Status/Horizon Field Update, Goal
Soft Archive, focused browser proof.
Nicht gilt fuer: Project Workbench, Key Results, Milestones, Logs, Review
Cadence, Progress Engine, Graph, AI Coach, migrations, RLS-/policy changes,
remote DB, deployment, secrets.

## Ziel

F1.1D verbindet den naechsten kleinen Goal Workbench Write-Slice, ohne die
Workbench neu zu bauen:

- Goal Title bearbeiten
- Goal Summary bearbeiten
- Goal Horizon bearbeiten
- Goal Status bearbeiten
- Goal per Soft Archive aus aktiven Portfolio-Listen entfernen

Der Slice nutzt das vorhandene Goal-Modell. Er fuehrt kein neues Datenmodell,
keine OKR-/Key-Result-Engine und keine neue Workbench-Architektur ein.

## Goal Entity Audit

Vorhandene Goal-Felder:

- `id`
- `user_id`
- `area_id`
- `title`
- `description`
- `status`
- `progress`
- `horizon`
- `why`
- `measure`
- `target_value`
- `target_date`
- `created_at`
- `updated_at`
- `archived_at`

Vorhandene Statuswerte:

- `draft`
- `active`
- `paused`
- `achieved`
- `archived`

Vorhandene Horizon-Werte im Domain-Schema:

- `week`
- `month`
- `quarter`
- `year`
- `someday`

Vorhandene Backend-Basis:

- `updateGoalInputSchema` existierte bereits.
- `GoalRepository.updateGoal` existierte im Interface, war aber in der
  Supabase-Repository-Implementierung noch ein Adapter-Failure.
- `goals` hat user-scoped RLS und Update-Grants.
- `areaId` Ownership-Pruefung war fuer Goal-Kontext bereits vorhanden und wird
  wiederverwendet.

Nicht vorhandene Felder:

- kein `next_step` auf `goals`
- kein `completed_at` oder `achieved_at`
- kein Key-Result-/Milestone-/Review-Cadence-Modell

## Slice Decision

Gebaut:

- Goal Entity Edit fuer Title, Summary, Horizon und Status.
- Goal Soft Archive ueber Status `archived` plus `archived_at`.
- Workbench-UI-Bindung mit Success-State und Reload-Proof.
- Proof, dass linked Projects und linked Tasks beim Goal Archive nicht
  geloescht werden.

Bewusst nicht gebaut:

- Goal Key Results.
- Goal Milestones.
- Goal Log.
- Review Cadence.
- Goal Achieve/Close als eigener Lifecycle.
- Goal Undo oder Restore.
- Goal History/Audit Trail.
- Progress Engine.
- Graph oder AI Coach.

## Backend Action

Neu verbunden:

- `updateGoalAction`
- `updateGoalFormAction`
- `archiveGoalAction`
- `archiveGoalFormAction`
- `mapUpdateGoalInputToPatch`
- Supabase `updateGoal`

Backend-Gates:

- serverseitige Supabase Auth
- Manual-Profil-Gate
- Zod `safeParse`
- same-user Scope ueber `profileId === userId`
- Repository-Grenze
- `user_id` und `goalId` Filter
- `archived_at is null` Guard fuer aktive Updates
- Area Ownership, falls `areaId` in einem spaeteren Formular gesetzt wird
- Revalidation fuer Portfolio, Inbox, Dashboard, Today und Calendar

Soft Archive:

- setzt `status = archived`
- setzt `archived_at`
- loescht keine linked Projects
- loescht keine linked Tasks
- loest keine Kaskaden aus

## UI Binding

Goal Workbench zeigt jetzt:

- `Goal bearbeiten`
- `Goal speichern`
- `Goal archivieren`

Das Edit-Formular schreibt echte Goal-Daten. Die Archive-Aktion ist separat
und sichtbar als Soft Archive ausgelegt.

## Browser Proof

Required focused proof:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Goal Workbench|Portfolio"
```

Result:

- 28 passed, 0 failed.

Neue Assertion:

- `Manual Goal Workbench edits status and archives Goal reload-stable`

Proof deckt ab:

- Goal im Manual-DB-Pfad erstellen.
- Linked Project im Goal Workbench erstellen.
- Linked Task im Goal Workbench erstellen.
- Goal im Workbench bearbeiten.
- Success-State `Goal aktualisiert.` sehen.
- Title, Summary, Status und Horizon nach Reload wiedersehen.
- Goal per Workbench Soft Archive archivieren.
- Success-State `Goal archiviert.` sehen.
- Archiviertes Goal nach Reload nicht mehr in der aktiven Goal-Liste sehen.
- Linked Project und linked Task bleiben nach Goal Archive in aktiven Listen
  sichtbar.

## Deferred

- Goal Key Results.
- Goal Milestones.
- Goal Log.
- Review Cadence.
- Goal Achieve/Close als eigener Lifecycle.
- Goal Undo/Restore.
- Finales Progress-Modell.
- Graph / Relation Map.
- AI Coach.
- Workbench-local Resource Management.

## Validation

Ausgefuehrt:

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- Focused Browser Proof oben: 28 passed, 0 failed

Noch im finalen Abschluss dieses Slices auszufuehren:

- `pnpm build`
- `pnpm exec supabase db lint --local --level warning`
- `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`

## Claim Impact

Vor F1.1D:

```text
Goal Workbench = local_connected_with_depth_gap
Goal Update/Archive = future/depth gap
```

Nach F1.1D:

```text
Goal Workbench = local_connected_with_depth_gap
Goal Entity Edit = local_connected
Goal Soft Archive = local_connected
Goal Key Results/Milestones/Logs/Review/Undo = future/depth gap
```

Keine Production-, Remote-, Public-SaaS- oder final-complete-Claims werden
angehoben.
