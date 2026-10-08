# #125 — B8 Task Detail: Vorher / Original / Nachher

Browser-Proof: **PASS**. V5 Design-Taste: **PASS**. Implementation proof only;
**USER ACCEPTED remains pending**. Scope: `/tasks/[taskId]`, not Task Create.

[Portable gallery](gallery.html) (download/open the folder locally), or use the
PNG links below directly in GitHub. All images contain disposable synthetic data.
No personal SQLite dataset, production process, gateway/auth configuration or
original reference file was changed.

## Reference identity and comparable data

- Original HTML SHA-256: `6aacbf7f4ce6dcd23c884a2d046a5f9496b156ee6a61f0551b12205dd4993ae6`.
- USER-ACCEPTED handoff SHA-256: `0c9efa641a47a813711e0e71a627796c21b6ff354070c3021a1b764266aa2c81`.
- [Fingerprint](https://github.com/Planton361/life-os/issues/125#issuecomment-6063291804), [authorization](https://github.com/Planton361/life-os/issues/125#issuecomment-6063613158).
- Before: main `94b9483cc65dab23eab409366e1ba62d6b328c0d` build, freshly seeded native fixture. After: this PR's Task presentation, same synthetic title/work/context/step states.
- Populated matches the original `Forschungsmethoden vergleichen`, description,
  note, three steps (one done), Project/Milestone/Goal and planned day/deadline.
- Empty has no description/note/steps or relationships; planned day remains.
  Its reference is created through the original prototype form, with only the
  prototype's fictitious Project/Goal/dependency/footer removed in browser memory.
  Original bytes and reference styles remain unchanged. This is a derived Empty
  counterpart, not an original pre-existing screenshot.
- Four identical CSS viewports, DPR 1. Surface crops contain the entire Task;
  complete-App captures are full-page captures at the indicated viewport, so
  Short-Mac/mobile document flow can extend below the viewport. App Shell is
  preserved; prototype navigation/chrome is not a production design target.

## Soll / Ist

| Area | Accepted target / implemented result | Evidence |
|---|---|---|
| Header | Task eyebrow, lifecycle + text-supported readiness badge, purpose, tightened H1 tracking; state-appropriate blue primary, outlined Edit, quiet Calendar, object menu | All pairs below |
| Work | ARBEITSINHALT / Was ist zu tun?, real active-step count at panel head, full-width dividers and original spacing | Empty + Populated, all sizes |
| Note | Object-local Notiz bearbeiten opens the same canonical editor instance as header Edit; no second form or write path | Focus/Trap/Escape and Save/Reload proof |
| Steps | + Schritt bounded create dialog, real native checkbox via existing step.update; row Mehr with bounded edit and confirmed soft archive | Create/toggle/edit/reopen/archive + reload; step progress does not complete Task |
| Context | Compact label/value facts, local assignment/Calendar/predecessor controls; real provenance/conflicts and blockers preserved; absent Context collapses | Populated screenshots; assignment/reload, state inventory and dependency race |
| Responsive | 1360px desktop/4K, 725px short, 366px mobile; Work before Context; no horizontal overflow; dialogs/menus bounded | Measurements and screenshots |

## Measurements (actual / reference, CSS px)

| Viewport / state | Canvas width | Header height | Work height |
|---|---:|---:|---:|
| 1920x1080 / empty | 1360 / 1360 | 185.4 / 185.4 | 430.4 / 430.2 |
| 1920x1080 / populated | 1360 / 1360 | 185.4 / 185.4 | 561.3 / 561.2 |
| 3840x2160 / empty | 1360 / 1360 | 185.4 / 185.4 | 430.4 / 430.2 |
| 3840x2160 / populated | 1360 / 1360 | 185.4 / 185.4 | 561.3 / 561.2 |
| 769x413 / empty | 725 / 725 | 229.8 / 229.8 | 430.4 / 430.2 |
| 769x413 / populated | 725 / 725 | 229.8 / 229.8 | 561.3 / 561.2 |
| 390x844 / empty | 366 / 366 | 330.0 / 322.0 | 424.4 / 402.2 |
| 390x844 / populated | 366 / 366 | 330.0 / 322.0 | 623.5 / 585.9 |

Desktop/4K/Short-Mac header height matches; Work differs by less than 0.3px.
Mobile retains 44px work/menu/header touch targets (prototype: 33–40px), which
explains the greater content height. No forced desktop minimum or bottom filler.

## Remaining deliberate differences

- Primary text stays canonical `Erledigt`, not prototype `✓ Task abschließen`.
- Mobile touch targets remain larger; exact mobile panel heights are therefore
  not asserted as identical to the prototype.
- Real direct/inherited Goal provenance and planning/lifecycle terminology remain
  explicit; simplified/hardcoded prototype relationships are not copied.
- Existing canonical Task editor/relationship forms contain the real validated
  fields and guards; prototype dialogs are illustrative. No parallel forms.
- Task Create remains outside #125, including its single optional group.

## Screenshots

| Viewport / state | Before | Reference | After | Full app |
|---|---|---|---|---|
| 1920x1080 / empty | [Vorher](before-empty-1920x1080-surface.png) | [Original](reference-empty-1920x1080-surface.png) | [Nachher](after-empty-1920x1080-surface.png) | [App komplett](after-empty-1920x1080-viewport.png) |
| 1920x1080 / populated | [Vorher](before-populated-1920x1080-surface.png) | [Original](reference-populated-1920x1080-surface.png) | [Nachher](after-populated-1920x1080-surface.png) | [App komplett](after-populated-1920x1080-viewport.png) |
| 3840x2160 / empty | [Vorher](before-empty-3840x2160-surface.png) | [Original](reference-empty-3840x2160-surface.png) | [Nachher](after-empty-3840x2160-surface.png) | [App komplett](after-empty-3840x2160-viewport.png) |
| 3840x2160 / populated | [Vorher](before-populated-3840x2160-surface.png) | [Original](reference-populated-3840x2160-surface.png) | [Nachher](after-populated-3840x2160-surface.png) | [App komplett](after-populated-3840x2160-viewport.png) |
| 769x413 / empty | [Vorher](before-empty-769x413-surface.png) | [Original](reference-empty-769x413-surface.png) | [Nachher](after-empty-769x413-surface.png) | [App komplett](after-empty-769x413-viewport.png) |
| 769x413 / populated | [Vorher](before-populated-769x413-surface.png) | [Original](reference-populated-769x413-surface.png) | [Nachher](after-populated-769x413-surface.png) | [App komplett](after-populated-769x413-viewport.png) |
| 390x844 / empty | [Vorher](before-empty-390x844-surface.png) | [Original](reference-empty-390x844-surface.png) | [Nachher](after-empty-390x844-surface.png) | [App komplett](after-empty-390x844-viewport.png) |
| 390x844 / populated | [Vorher](before-populated-390x844-surface.png) | [Original](reference-populated-390x844-surface.png) | [Nachher](after-populated-390x844-surface.png) | [App komplett](after-populated-390x844-viewport.png) |

Step dialogs: [Desktop](step-dialog-1920x1080.png),
[4K](step-dialog-3840x2160.png), [Short-Mac](step-dialog-769x413.png),
[Mobile](step-dialog-390x844.png).

## Focused validation

The existing native application fixture/process harness is reused by
`tests/sqlite/issue-125-browser-proof.mjs`; no new runtime/test infrastructure.
One fixture writer is closed before one production Next proof process starts on
an allocated loopback port different from 3000. The proof process is stopped in
`finally`; the personal production process is never stopped or restarted.

- Empty and Populated (2 groups): typography, blue action, dialog bounds/focus/Escape 1920x1080
- Empty and Populated (2 groups): typography, blue action, dialog bounds/focus/Escape 3840x2160
- Empty and Populated (2 groups): typography, blue action, dialog bounds/focus/Escape 769x413
- Empty and Populated (2 groups): typography, blue action, dialog bounds/focus/Escape 390x844
- Validation error retains editor draft; lifecycle/source eligibility; missing Context collapses; milestone Save/Reload; explicit BLOCKED and stale completion rejected; Project navigation
- Canonical note Save/Reload; step create/toggle/edit/reopen/archive/Reload; independent Task completion/reopen; Calendar Week navigation/reload

Console/hydration errors: **0**. Original files are byte-identical.
7 focused native read/parent-archive/step-progress unit checks pass. Diff check,
typecheck, lint and production build pass; required exact-head GitHub quality
is reported on the PR, not inferred from local runs. Existing Task-only browser
selectors were updated for intentionally superseded controls; Docker-backed
Supabase E2Es and broad local regression were not run.

Reproduce with pinned Node 24.21.0 and installed repository dependencies:

```sh
pnpm build
node tests/sqlite/issue-125-browser-proof.mjs --reference=/absolute/path/life-os-b8-consolidated-design.html --output=/tmp/life-os-125-evidence
```

Without `--reference`, the same native interaction/geometry proof can run without
a workstation-local Downloads file. [Machine-readable after evidence](after-proof.json).

V5 review: matte shared surfaces, semantic blue and text-supported readiness,
one dominant allowed action, bounded management and compact Context fit V5.
No material V5 violation remains in this scope. Final real-user surface acceptance
is separate from this synthetic implementation proof and M0 merge.
