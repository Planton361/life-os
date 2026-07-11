# F1.1F Project / Goal Resource & Evidence Depth

Stand: 2026-07-11
Status: PASS_TARGETED_LOCAL_BROWSER_PROOF
Quelle der Wahrheit: `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`,
`DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`,
`AI_WORKFLOW.md`, `docs/product/project-goal-workbench-depth-scope-f1-1a.md`,
`docs/product/project-goal-lifecycle-progress-decision-f1-1e.md`.
Gilt fuer: Project/Goal Workbench Resource Relation Create, Project/Goal
Workbench Skill Evidence Display, focused browser proof.
Nicht gilt fuer: Resource Graph, Skill Map, Milestones, Logs, Review Cadence,
Progress Engine, AI Coach, Evidence Create im Project/Goal Workbench,
Migrationen, RLS-/Policy-Aenderungen, Remote-DB, Deployment, Secrets.

## Ziel

F1.1F baut den naechsten kleinen Depth-Slice fuer Project und Goal Workbench:

- echte vorhandene Resources auswaehlen
- Resource Relation direkt im Project/Goal Workbench speichern
- vorhandene Skill Evidence anzeigen, wenn deren Source das ausgewaehlte
  Project oder Goal ist
- keine Fake-Resources, keine Fake-Evidence und keinen Graph starten

## Capability Audit

### Resource Relations

Vorhanden:

- `resource_relations` unterstuetzt `target_type = project` und `goal`.
- Relation Types: `source`, `context`, `supports`, `evidence`, `decision`,
  `related`.
- `linkResourceToTargetInputSchema` validiert `resourceId`, `targetId`,
  `targetType` und `relationType`.
- Supabase Resource Repository prueft same-user Ownership fuer Resource und
  Target.
- Duplicate Relations werden vor dem Insert erkannt.
- Resource Relation RLS ist user-scoped vorhanden.

Entscheidung:

- Workbench-local Resource Relation Create ist sicher genug fuer F1.1F.
- Der Workbench nutzt denselben Backend-Pfad wie der Resources-Flow und nur
  einen anderen Return-Redirect zur Portfolio-Auswahl.

### Skill Evidence

Vorhanden:

- Skill Evidence Source Types enthalten `project` und `goal`.
- Evidence Create prueft fuer Project/Goal/Task/Resource eine echte `sourceId`.
- Supabase Skill Repository prueft same-user Ownership des Source Targets.
- Skill Evidence wird user-scoped gelesen.
- Skill Evidence Labels werden aus echten Source Targets aufgeloest.

Entscheidung:

- Project/Goal Workbench darf vorhandene Skill Evidence anzeigen, deren Source
  das ausgewaehlte Project oder Goal ist.
- Project/Goal Workbench erstellt keine Skill Evidence in F1.1F. Evidence
  Create bleibt im Skill Workbench, weil dort Skill-Auswahl, Source-Auswahl und
  bestehende Ownership-Gates bereits zusammenhaengen.

## Slice Decision

Gebaut:

- Project Workbench Resource Relation Create.
- Goal Workbench Resource Relation Create.
- Portfolio-return Variante der bestehenden Resource Relation Action.
- Project/Goal Workbench Skill Evidence Display.
- Reload-stabile Browser-Proofs fuer Resource Relation Create und Evidence
  Projection.

Bewusst nicht gebaut:

- neues Resource-Datenmodell
- neue Skill-Evidence-Tabelle oder Evidence-Create im Project/Goal Workbench
- Milestones
- Project Log
- Goal Log
- Review Cadence
- Progress Engine
- Graph / Skill Map
- AI Coach
- Undo / Restore

## Backend Action

Neu:

- `linkPortfolioResourceToTargetAction`

Wiederverwendet:

- `linkResourceToTargetInputSchema`
- `createSupabaseResourceRepository`
- Resource Ownership Check
- Target Ownership Check
- duplicate-safe `linkResource`
- Revalidation fuer `/resources` und `/portfolio`

Der bestehende `linkResourceToTargetAction` fuer `/resources` bleibt erhalten.
Die neue Portfolio-Action teilt den internen Create-State und redirectet nur
zurueck nach `/portfolio?view=projects|goals&selected=<targetId>`.

## UI Binding

Project und Goal Workbench zeigen jetzt:

- vorhandene Resource Relations
- ein Manual-only Formular `Resource verknuepfen`
- vorhandene Skill Evidence mit Skill-Kontext
- ehrliche Empty States, wenn keine Resource oder Evidence existiert

Nicht angezeigt wird:

- Graph
- Resource Management
- Evidence Create im Project/Goal Workbench

## Browser Proof

Required focused proof:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Project Workbench|Goal Workbench|Resource|Evidence|Portfolio"
```

Proof deckt ab:

- Workbench Resource Relation Create fuer Project.
- Workbench Resource Relation Create fuer Goal.
- Resource Relation bleibt nach Reload sichtbar.
- Skill Evidence mit Project Source erscheint im Project Workbench.
- Skill Evidence mit Goal Source erscheint im Goal Workbench.
- Skill Evidence bleibt nach Reload sichtbar.
- Keine UUID-Label-Claims statt echter Titles.

Aktueller Proof-Stand:

- Erster Lauf: 31 passed, 1 failed, 5 did not run.
- Fehlerursache: ein bestehender Resource-Workbench-Assert traf nach F1.1F
  zuerst ein verborgenes `<option>` im neuen Resource-Select statt die
  sichtbare Resource Card.
- Fix: Resource-Assertions wurden auf sichtbare Workbench-Resource-Cards
  gescoped.
- F1.1F.1 Einzeltest: 1 passed, 0 failed.
- Finaler F1.1F Grep: 37 passed, 0 failed, 0 skipped.

## F1.1F.1 Resource Relation Form Label / Selector Fix

Failure:

```text
form[aria-label="Project Resource verknuepfen"]
  .getByLabel("Resource", { exact: true })
→ element not found
```

Classification:

```text
ACCESSIBLE_LABEL_BUG
```

Root Cause:

- Die Workbench Resource Relation Form war sichtbar.
- Der Context Panel war auf dem richtigen Project.
- Eine echte Resource existierte.
- Der Resource Select war vorhanden, aber als verschachtelter Control in einem
  Wrapper-Label gerendert. Dadurch war die exakte Accessible-Label-Aufloesung
  fuer `Resource` nicht stabil.

Fix:

- Resource-Select und Relation-Select nutzen jetzt explizite `id`/`htmlFor`
  Bindings.
- Label und Select sind im bestehenden Grid siblings, damit Option-Text nicht
  in den Labelnamen einfliesst.
- Der Test bleibt auf das sichtbare Workbench-Formular gescoped und prueft den
  echten Labelnamen weiter mit `getByLabel("Resource", { exact: true })`.

Einzeltest:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual Project and Goal Workbench Resource Relation Create persists reload-stable"
```

Result:

- 1 passed, 0 failed.

Finaler F1.1F Grep:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Project Workbench|Goal Workbench|Resource|Evidence|Portfolio"
```

Result:

- 37 passed, 0 failed, 0 skipped.

## Deferred

- Evidence Create direkt aus Project/Goal Workbench.
- Resource Manage/Edit/Unlink direkt im Project/Goal Workbench.
- Resource Graph oder Skill Map.
- Project/Goal Milestones.
- Project/Goal Logs.
- Review Cadence.
- Undo/Restore.
- Progress Engine.

## Validation

Startcheck vor Implementation:

- `git status --short`
- `git log --oneline -10`
- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm exec supabase db lint --local --level warning`
- `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`

Final ausgefuehrt:

- `git diff --check`
- `git diff --cached --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm exec supabase db lint --local --level warning`
- `pnpm exec supabase db advisors --local --type security --level warn --fail-on none`
- Focused Browser Proof oben

## Claim Impact

Vor F1.1F:

```text
Project Resource Relation Display = local_connected
Goal Resource Relation Display = local_connected
Project/Goal Workbench-local Resource Relation Create = depth gap
Project/Goal Skill Evidence Display = depth gap
```

Nach F1.1F:

```text
Project Resource Relation Create = local_connected
Goal Resource Relation Create = local_connected
Project/Goal Skill Evidence Display = local_connected_read
Project/Goal Skill Evidence Create = deferred
Resource Graph / Skill Map = future
```
