# Issue #102 — current browser evidence

Contract: [#102](https://github.com/Planton361/life-os/issues/102), authorized in
[CONTROL comment 5969517164](https://github.com/Planton361/life-os/issues/102#issuecomment-5969517164).
Target: [#101 v1.2](https://github.com/Planton361/life-os/issues/101#issuecomment-5968483362),
[USER ACCEPTED](https://github.com/Planton361/life-os/issues/101#issuecomment-5969455048).
All data and screenshots are synthetic authenticated Manual fixtures in the
repository's disposable local runtime. No remote database or deployment.

## Current limitation / closure

**PARTIAL / completion gate BLOCKED:** the proposed Skill loop, Task-origin and
Portfolio work is implemented and validated, but full #102 control acceptance is
blocked by an existing PP2 Area-command defect. Creating, editing or resuming a Skill with
an owned active Area returns `SKILL_AREA_UNAVAILABLE`. The unchanged
`skill_development_command` in `20261002191215_pp2_skill_development.sql` uses
`FOR SHARE` for Areas (lines 185/198), with a SELECT policy and UPDATE grant for
`life_os_skill_command` but no UPDATE policy. PostgreSQL applies UPDATE policies to `SELECT FOR SHARE`
([official CREATE POLICY reference](https://www.postgresql.org/docs/15/sql-createpolicy.html)). The local browser reproduces the
visible failure and proves no mutation. The proposed revision changes no
migration, RPC, grant or RLS policy; #102 expressly excludes that repair.

The existing canonical Area read is independently proved with a disposable
legacy-row fixture: Portfolio shows the real owned Area name; null Area shows
`Ohne Area`. Fixture SQL changes only the disposable row, then clears it before
lifecycle commands. It is not an application write path or security bypass.

No final #102 USER ACCEPTED or product/core-surface closure is claimed. A bounded
CONTROL decision on the existing Area command is required before full closure.

## Focused evidence

| Proof | What it exercises |
|---|---|
| `issue-102-skill-loop.spec.ts` — state matrix | Empty, no target, focus without step, focus/step/one practice, mixed READY/BLOCKED, only blocked, rich, paused, archived; one primary, no preselection, no open Empty form/rail; keyboard Enter/Escape/focus; full observation text; depth links; all candidates/history; archive → restore paused without autoCurrent; Goal/Project family comparison |
| Same file — Task origin | server origin guard, explicit title and one Save, cancel without write, happy path/reload, completion without Evidence, opt-out, real archive race between Create and Link, same-ID partial readback/reload/link-only retry with Create count one; committed Create without returned ID and no automatic retry/dedupe; two owners, foreign/forged/empty/multiple/archived/auth-blocked origin and link guards |
| `issue-102-skill-surface.spec.ts` | real dependency RPC outage in disposable database, fail-closed Skill/Portfolio, canonical no-target/Area, visible Portfolio navigation inventory and every view/scope/sort chip at all three viewports |
| `pp2-skill-controls.spec.ts` | retained focus/step create/edit/current/reorder/reopen/archive/restore, resource/task linking and navigation, explicit Evidence/correction/withdraw/restore, invalid-date/source-unavailable feedback, review/version snapshot/amendment, cancellation and stale revision |
| `pp2-skill-development.spec.ts` | retained planning/review/history and Task projection reload, Manual/Demo/Empty/Auth-blocked separation, Dashboard canonical Practice without percentage |
| `issue-80-task-create-origin-parity.spec.ts` | existing generic/Goal/Project/Calendar Task capture and cancel parity |
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
| Skill identity/primary | breadcrumbs/Task links, Skill management and review-depth links; focus capture and cancel; open/select/blocked/unavailable practice disclosures and blocker navigation; paused resume; archived restore | PASS; owned Area save fails visibly as the existing limitation above |
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
The Area control defect and missing real #102 USER ACCEPTED prevent full closure.

## Screenshots

- empty: [3840](issue-102-empty-3840.png), [1920](issue-102-empty-1920.png), [390](issue-102-empty-390.png)
- no-target: [3840](issue-102-no-target-3840.png), [1920](issue-102-no-target-1920.png), [390](issue-102-no-target-390.png)
- focus-without-step: [3840](issue-102-focus-without-step-3840.png), [1920](issue-102-focus-without-step-1920.png), [390](issue-102-focus-without-step-390.png)
- focus-step-one-practice: [3840](issue-102-focus-step-one-practice-3840.png), [1920](issue-102-focus-step-one-practice-1920.png), [390](issue-102-focus-step-one-practice-390.png)
- rich: [3840](issue-102-rich-3840.png), [1920](issue-102-rich-1920.png), [390](issue-102-rich-390.png)
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

- Combined focused browser regression: 8/8 passed. The expanded final matrix/Task-origin: 2/2 passed; final surface outage/Area/control proof passed separately.
- Unchanged PP2 database suite: 2/2 passed, including local DB lint/security advisors. Existing Project Depth lint warnings remain; no Skill warning or security-advisor issue.
- Guidance/recency unit tests: 11/11 passed.
- `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm build`: passed.
- Required final-head GitHub `quality` run and revision are referenced in the PR; this document does not substitute an older green CI head.
- Final product acceptance and a bounded repair decision for the existing Area command remain open.
