# Issue #102 — current browser evidence

## Post-merge acceptance repair — visible Lernweg (2026-10-04)

Authorization: [#102 USER ACCEPTANCE finding 5973828224](https://github.com/Planton361/life-os/issues/102#issuecomment-5973828224).
Based on merged main `63b8cbbe6a83ed703992521b2145773d5717d818`, on
`codex/102-skill-learning-path`. This section supersedes the previous Current-only
step presentation; older screenshots below remain historical evidence.

The normal `Aktuelle Entwicklung` now presents every active step of the Current
focus in canonical `sort_order`, with title, optional description and explicit
Abgeschlossen / Aktuell / Geplant state. Current has the strongest border and
surface emphasis. The existing Task/Skill-state Primary precedes the learning
path. No step is auto-selected, auto-completed or advanced.

Control inventory and current proof:

| Control / state | Evidence |
| --- | --- |
| Current focus, no steps | Visible `Noch keine Lernschritte`; on-demand `Lernschritt hinzufügen`; Enter opens, Escape closes and restores summary focus |
| Planned-only / mixed steps | Exact ordered heading assertions; completed/current/planned remain visible without opening management/history; one instance of each Current step |
| Add / select Current / edit / reorder | Real existing commands from the workbench; visible success feedback, explicit Current switch and demotion; description readback and canonical order after reload |
| Review / reopen / archive / restore | Existing preview/commit semantics; archived step disappears from path; restore remains secondary in focus management and returns the step in canonical order after reload |
| Earlier / terminal focus | Earlier step visible in supporting depth, absent from Current path; Current steps absent from focus-depth rows |
| Practice | READY and BLOCKED article text identical before/after step review and Current selection; Primary precedes path; existing state matrix remains Task/Skill-state based |
| Boundaries / layout | Empty/no-target/active/rich/paused/archived, Manual/Demo/Auth-blocked; 3840×2160, 1920×1080 and 390×844; no horizontal overflow or clipped controls; console/hydration clean |

V5 visual review: calm ordered rows, Current emphasized without percentages or
ability claims, management closed by default, no overlaps at desktop/4K/mobile.
Existing shell and 64/36 workbench composition retained. Screenshots contain only
synthetic local Manual test data.

| Lernweg state | 4K | Desktop | Mobile |
| --- | --- | --- | --- |
| Empty | [3840](issue-102-learning-empty-3840.png) | [1920](issue-102-learning-empty-1920.png) | [390](issue-102-learning-empty-390.png) |
| Planned | [3840](issue-102-learning-planned-3840.png) | [1920](issue-102-learning-planned-1920.png) | [390](issue-102-learning-planned-390.png) |
| Mixed | [3840](issue-102-learning-mixed-3840.png) | [1920](issue-102-learning-mixed-1920.png) | [390](issue-102-learning-mixed-390.png) |

Local results: **7/7 focused browser/DB tests**, **7/7 domain tests**,
`git diff --check`, typecheck, lint and production build **PASS**.
Completion gate for this bounded repair: **PASS**; real-user acceptance is separate.

Validation commands for this revision:

```sh
pnpm test:e2e:isolated tests/e2e/pp2-skill-controls.spec.ts tests/e2e/pp2-skill-development.spec.ts tests/e2e/pp2-skill-database.spec.ts tests/e2e/issue-102-skill-loop.spec.ts --grep 'remaining controls|real state matrix|PP2'
pnpm exec vitest run src/features/real-data/domain/skill-development.test.ts
git diff --check
pnpm typecheck
pnpm lint
pnpm build
```

No data model, RPC, grant, security or Task-readiness changes. All writes use the
existing authenticated revision-checked Skill commands. No remote database or
merge action. Final real-user #102 acceptance remains pending; this repair is
implementation and review evidence only. The new PR records the exact-head
`quality` run for its final revision.


Contract: [#102](https://github.com/Planton361/life-os/issues/102), authorized in
[CONTROL comment 5969517164](https://github.com/Planton361/life-os/issues/102#issuecomment-5969517164).
Target: [#101 v1.2](https://github.com/Planton361/life-os/issues/101#issuecomment-5968483362),
[USER ACCEPTED](https://github.com/Planton361/life-os/issues/101#issuecomment-5969455048).
All data and screenshots are synthetic authenticated Manual fixtures in the
repository's disposable local runtime. No remote database or deployment.

## Final Skill inspector wording / gate

**READY_FOR_REVIEW / completion gate PASS for this bounded wording repair.**
[CONTROL review 5402820275](https://github.com/Planton361/life-os/pull/103#pullrequestreview-5402820275)
is resolved: the Skill-linked-task section heading and aria-label are now
`Verknüpfte Aufgaben`. This is the only product change in this repair.

- Canonical `r2-04-portfolio-surface.spec.ts`: **2/2 passed** again, unchanged.
- Directly affected #102 matrix and Portfolio surface regression: **2/2 passed**
  in one fresh disposable run. The Rich inspector verifies the exact section and
  heading; the no-target fixture verifies its real linked Task in that section at
  all three viewports. Both reject `Practice Tasks` in the inspector.
- Six rich/no-target Portfolio screenshots are renewed at 3840×2160, 1920×1080
  and 390×844 and visually checked: `Verknüpfte Aufgaben`, no `Practice Tasks`.
  Console/hydration and bounds checks pass. Browser-Proof **PASS**, V5 **PASS**.
- `git diff --check`, `pnpm typecheck`, `pnpm lint` and final-head `quality`
  results are referenced in PR #103. Build and DB tests were not repeated for this
  pure heading/aria-label change; previous evidence remains below.
- No control inventory change is needed: this heading is not a control and the
  existing navigation inventory still matches. No broader localization or other
  entity-flow changes. Final USER ACCEPTED remains pending; no merge.

```sh
pnpm test:e2e:isolated tests/e2e/r2-04-portfolio-surface.spec.ts
pnpm test:e2e:isolated tests/e2e/issue-102-skill-loop.spec.ts tests/e2e/issue-102-skill-surface.spec.ts --grep 'real state matrix|dependency outage'
```

## Prior terminology repair / evidence

**READY_FOR_REVIEW / completion gate PASS for the authorized repair.**
[CONTROL review 5402653891](https://github.com/Planton361/life-os/pull/103#pullrequestreview-5402653891)
authorizes the same-#102 ordinary-language and Skill regression repair.
The summary now says `24 Beobachtungen`, with its original counting semantics:
no mastery, progress or ability interpretation. Canonical Skill expectations use
accepted capture language, read-only identity readback, the real `Portfolio / Skills`
breadcrumb and `Skill öffnen`.

Current evidence:

- `r2-04-portfolio-surface.spec.ts`: **2/2 passed**, including all five entity
  Create/detail/reload paths, selected inspector readback, every view/scope/sort,
  navigation/history and 3840/2560/1920/390 layout plus real workspace overflow.
- Initial attempts stopped before Skill at stale Task capture/readback/navigation.
  The user explicitly authorized minimal Task/Goal selector updates. Task opens
  optional details and uses current field labels; reload opens the real edit dialog
  and still checks the exact persisted value. Its current `/tasks` breadcrumb is
  checked with the same Task ID, then real Portfolio/Tasks controls retain the
  original filtered-list assertion. Goal form/button/description/breadcrumb names
  match current capture. Project/Resource expectations are unchanged; no assertion
  is skipped or weakened and no Task/Goal product code changed.
- `issue-102-skill-loop.spec.ts` and `issue-102-skill-surface.spec.ts`: **3 distinct
  cases passed** across the combined run and focused matrix rerun. This includes
  actual Skill capture/reload, owned-Area lifecycle, Portfolio controls, dependency
  outage, Task-origin recovery and all three viewports. The combined matrix first
  lost focus after viewport captures; polling the actual focus action until active
  preserves keyboard Enter/Escape/form assertions, and the rerun passes.
- Rich Summary has a scoped `24 Beobachtungen` assertion and the Portfolio region
  rejects `Evidence-Einträge`. Six refreshed rich/no-target Portfolio screenshots
  confirm ordinary-language wording at 3840×2160, 1920×1080 and 390×844.
  Console/hydration and bounds checks pass.
- Browser-Proof **PASS**; V5 wording/composition **PASS**. No new Area/security
  change. Final USER ACCEPTED remains pending; no product closure is claimed.
- Final diff-check/typecheck/lint/build and exact-head required `quality` are
  referenced in PR #103. Existing branch, same PR, no merge or remote DB.

```sh
pnpm test:e2e:isolated tests/e2e/r2-04-portfolio-surface.spec.ts
pnpm test:e2e:isolated tests/e2e/issue-102-skill-loop.spec.ts tests/e2e/issue-102-skill-surface.spec.ts
pnpm test:e2e:isolated tests/e2e/issue-102-skill-loop.spec.ts --grep 'real state matrix'
```

## Prior Area recovery / evidence

**Area recovery PASS on prior head `82221c0a707fc295a71fbc5e29328d55ffd25f85`.**
Merged main `88d44e7417c8dcd4a8c78b696ff44a7f95d63fe8` into the existing #102
branch after [#104](https://github.com/Planton361/life-os/issues/104) / [#105](https://github.com/Planton361/life-os/pull/105).
Authorization: [CONTROL recovery](https://github.com/Planton361/life-os/issues/102#issuecomment-5973164755)
and [PR recovery review](https://github.com/Planton361/life-os/pull/103#pullrequestreview-5402593312).
The Capability Registry retains #104's current lifecycle truth and #102's loop,
Portfolio and Task-origin truth. No historical migration or #102 application code
was changed during recovery.

The real browser now creates a Skill with its owned active Area, switches to a
second owned active Area and resumes paused → active while retaining that Area.
Each path reloads and checks both the visible header and canonical RPC readback.
The previous `SKILL_AREA_UNAVAILABLE` blocker is resolved. The matrix no longer
uses direct SQL to attach a legacy Area fixture.

`pnpm runtime:target:migrate` applied only the new forward migration
`20261003152858_pp2_skill_area_lock.sql` to canonical local Target
`life-os-sr104b-target`; migration readback, local lint and security advisors passed.
A rolled-back synthetic transaction on that Target additionally proved actual
Skill create/switch/resume/edit, own `FOR SHARE`, direct Area UPDATE denial and
foreign/archived/nonexistent/invalid Area denial without leakage. Browser proof
uses the isolated disposable runtime, not personal canonical rows.

The unchanged #104 regression also passes on this branch: upgrade plus fresh
stack, ACL/policy snapshots, RLS active, NOLOGIN/NOBYPASSRLS, no new client write
authority and two real sessions proving update/archive wait until lock release.
No remote database or PR merge. Final #102 USER ACCEPTED remains open; this is
implementation evidence ready for CONTROL review, not final product closure.

## Focused evidence

| Proof | What it exercises |
|---|---|
| `issue-102-skill-loop.spec.ts` — state matrix | Empty, no target, focus without step, focus/step/one practice, mixed READY/BLOCKED, only blocked, rich, paused, archived; one primary, no preselection, no open Empty form/rail; keyboard Enter/Escape/focus; full observation text; depth links; all candidates/history; archive → restore paused without autoCurrent; Goal/Project family comparison |
| Same file — Task origin | server origin guard, explicit title and one Save, cancel without write, happy path/reload, completion without Evidence, opt-out, real archive race between Create and Link, same-ID partial readback/reload/link-only retry with Create count one; committed Create without returned ID and no automatic retry/dedupe; two owners, foreign/forged/empty/multiple/archived/auth-blocked origin and link guards |
| `issue-102-skill-surface.spec.ts` | real dependency RPC outage in disposable database, fail-closed Skill/Portfolio, canonical no-target/Area, visible Portfolio navigation inventory and every view/scope/sort chip at all three viewports |
| `pp2-skill-controls.spec.ts` | retained focus/step create/edit/current/reorder/reopen/archive/restore, resource/task linking and navigation, explicit Evidence/correction/withdraw/restore, invalid-date/source-unavailable feedback, review/version snapshot/amendment, cancellation and stale revision |
| `pp2-skill-development.spec.ts` | retained planning/review/history and Task projection reload, Manual/Demo/Empty/Auth-blocked separation, Dashboard canonical Practice without percentage |
| `issue-80-task-create-origin-parity.spec.ts` | existing generic/Goal/Project/Calendar Task capture and cancel parity |
| `pp2-skill-area-lock.spec.ts` | exact forward policy; SQL owner/noLeak/UPDATE-denial/unchanged ACL proof; two-session update/archive lock; real CLI upgrade; Data API and owned-Area browser lifecycle |
| `pp2-skill-database.spec.ts` | unchanged PP2 upgrade, owner RLS/noLeak, direct-write denial, immutable history/FKs, idempotency and concurrent revision/current locks; local database lint/advisors |
| `skill-guidance.test.ts` + `skill-development.test.ts` | 11 unit cases: priority/matrix, mixed tasks without selection, blocked and missing graph fail-closed, lifecycle precedence, explicit independent Evidence/Practice recency |

Rich data: 18 real Task↔Skill links, 24 explicit observations, three development
focuses, two immutable reviews and an amendment. Four open Task previews and two
observation previews remain bounded; disclosures expose all 17 open candidates,
24 observations and full reviews/version history. Task completion does not
create Evidence. Current dependency state is not inferred from Skill state.

## Control inventory

| Surface | Controls directly exercised | Result |
|---|---|---|
| Skill identity/primary | breadcrumbs/Task links, Skill management and review-depth links; focus capture and cancel; open/select/blocked/unavailable practice disclosures and blocker navigation; paused resume; archived restore | PASS; actual owned-Area Create, switch and Resume survive reload |
| Skill work/depth | all-task/all-observation/full-note disclosures; explicit observation create/correct/withdraw/restore; review preview/commit/amend; all retained focus/step/resource/task management commands and cancellation | PASS with reload, visible success/error and revision checks |
| Task origin/recovery | explicit-title one Save, opt-out, cancel, retained Task navigation, same-ID link-only retry, ambiguous-result task-list navigation and blocked resubmit | PASS; no duplicate Create or automatic Evidence |
| Portfolio | every initially visible main link; every view/scope/sort chip at desktop/mobile; entity selection/Skill detail; canonical create links | PASS; see [exact navigation inventory](portfolio-visible-control-inventory.json) |

## Layout / console / V5 review

Full-page captures use CSS viewports 3840×2160, 1920×1080 and 390×844.
Bounds checks reject horizontal page overflow and clipped actionable controls;
existing mobile Portfolio chip rails intentionally scroll and each chip is
exercised after scrolling into view. Console/page-error and hydration checks are
clean. Screenshots use `caret: initial`: default screenshot caret hiding can
mutate server-rendered hidden inputs before hydration and cause a test-induced
warning. Goal/Project captures wait for their actual headings, not loading UI.

Was passt zu V5: matte navy/token surfaces, shared identity and outer workbench,
approximately 64/36 desktop split, one visible primary, bounded rows and quiet
explicit observations; mobile preserves the same semantic order. No chart,
percentage, fake ability metric, decorative hero or additional page system.

Was verletzt V5: no remaining material visual violation in the proposed Skill
composition. Existing Goal/Project layouts are references, unchanged by #102.

Konkrete Fixes: shared server-safe form styles restore the primary action/field
appearance; full-note disclosure preserves long text; explicit depth-link
handling opens the destination and restores keyboard focus.

Acceptance Decision: **PASS for V5 composition / implementation evidence**.
Browser-Proof: **PASS**. Surface Acceptance: **IMPLEMENTATION PASS**.
Missing real #102 USER ACCEPTED prevents final product closure.

## Screenshots

48 full-page screenshots from the Area recovery runs; all three viewports per state.
The six rich/no-target Portfolio captures below were refreshed after the final Skill inspector wording repair.

- empty: [3840](issue-102-empty-3840.png), [1920](issue-102-empty-1920.png), [390](issue-102-empty-390.png)
- no-target: [3840](issue-102-no-target-3840.png), [1920](issue-102-no-target-1920.png), [390](issue-102-no-target-390.png)
- focus-without-step: [3840](issue-102-focus-without-step-3840.png), [1920](issue-102-focus-without-step-1920.png), [390](issue-102-focus-without-step-390.png)
- focus-step-one-practice: [3840](issue-102-focus-step-one-practice-3840.png), [1920](issue-102-focus-step-one-practice-1920.png), [390](issue-102-focus-step-one-practice-390.png)
- rich: [3840](issue-102-rich-3840.png), [1920](issue-102-rich-1920.png), [390](issue-102-rich-390.png)
- area-switch: [3840](issue-102-area-switch-3840.png), [1920](issue-102-area-switch-1920.png), [390](issue-102-area-switch-390.png)
- area-resumed: [3840](issue-102-area-resumed-3840.png), [1920](issue-102-area-resumed-1920.png), [390](issue-102-area-resumed-390.png)
- paused: [3840](issue-102-paused-3840.png), [1920](issue-102-paused-1920.png), [390](issue-102-paused-390.png)
- archived: [3840](issue-102-archived-3840.png), [1920](issue-102-archived-1920.png), [390](issue-102-archived-390.png)
- dependency-unavailable: [3840](issue-102-dependency-unavailable-3840.png), [1920](issue-102-dependency-unavailable-1920.png), [390](issue-102-dependency-unavailable-390.png)
- portfolio-rich: [3840](issue-102-portfolio-rich-3840.png), [1920](issue-102-portfolio-rich-1920.png), [390](issue-102-portfolio-rich-390.png)
- portfolio-no-target: [3840](issue-102-portfolio-no-target-3840.png), [1920](issue-102-portfolio-no-target-1920.png), [390](issue-102-portfolio-no-target-390.png)
- task-origin: [3840](issue-102-task-origin-3840.png), [1920](issue-102-task-origin-1920.png), [390](issue-102-task-origin-390.png)
- link-failure: [3840](issue-102-link-failure-3840.png), [1920](issue-102-link-failure-1920.png), [390](issue-102-link-failure-390.png)
- family-project: [3840](issue-102-family-project-3840.png), [1920](issue-102-family-project-1920.png), [390](issue-102-family-project-390.png)
- family-goal: [3840](issue-102-family-goal-3840.png), [1920](issue-102-family-goal-1920.png), [390](issue-102-family-goal-390.png)

## Validation summary

- 14 distinct focused Playwright cases passed across the commands below; 11/11 guidance/recency unit cases passed.
- Initial combined regression: 8/10 passed. Matrix stopped at keyboard activation before form visibility; the focused test now explicitly asserts focus and presses Enter on that control, then passes. Remaining-controls stopped when Next restarted at its existing memory threshold; a fresh focused run passes. No runtime memory limit was increased.
- Matrix rerun exited successfully and removed its disposable runtime, but its process watchdog emitted a teardown `kill EPERM` warning. This is a local runner limitation, not a browser console/hydration error; no runtime repair is claimed.
- PP2 database suite and exact Area security suite pass; local lint retains existing Project Depth warnings, no Skill warning; security advisors report no issue.
- `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm build`: final results and exact-head required `quality` are referenced in PR #103.
- Final product USER ACCEPTED remains open.

Recovery commands (first group followed by focused reruns of its two failures):

```sh
pnpm test:e2e:isolated tests/e2e/issue-102-skill-loop.spec.ts tests/e2e/issue-102-skill-surface.spec.ts tests/e2e/pp2-skill-controls.spec.ts tests/e2e/pp2-skill-development.spec.ts tests/e2e/pp2-skill-database.spec.ts tests/e2e/issue-80-task-create-origin-parity.spec.ts
pnpm test:e2e:isolated tests/e2e/issue-102-skill-loop.spec.ts --grep 'real state matrix'
pnpm test:e2e:isolated tests/e2e/pp2-skill-controls.spec.ts tests/e2e/pp2-skill-area-lock.spec.ts
pnpm exec vitest run src/features/entities/workbench/skill-guidance.test.ts src/features/real-data/domain/skill-development.test.ts
pnpm runtime:target:migrate
```
