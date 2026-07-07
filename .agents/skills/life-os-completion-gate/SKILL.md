---
name: life-os-completion-gate
description: Project-local Life OS completion review skill. Use before Codex finishes a task, feature, workflow block, review, docs migration, backend slice, UI change, or vertical slice to decide whether the work is truly complete, deferred, or blocked and whether the final report is honest.
---

# Life OS Completion Gate

Use this skill before final reporting. The goal is to prevent false completion
claims.

## Completion Gate

Check every applicable item:

1. Product Intent fulfilled?
2. UI usable when UI is in scope?
3. Backend or persistence connected, or Prepared State clearly marked?
4. Zod, Auth, and Ownership checked for mutations?
5. Manual, Demo, and Empty boundaries clean?
6. Reload stable when writes or projections are claimed?
7. Browser-Proof green, not needed, or explicitly blocked with reason?
8. Tests and required checks green?
9. QA, E2E, or workflow docs updated when behavior changed?
10. Final report complete and honest?

## Decision

Use exactly one decision:

- `PASS`: scope is complete and validated.
- `PASS_WITH_DEFERRED`: requested scope is complete, but explicitly listed future work remains outside this block.
- `BLOCKED`: required scope cannot be completed without user input, missing access, broken environment, or a failed required validation.

## Report Requirements

The final report must not claim:

- feature completion without UI truth or Prepared State truth.
- persistence without Server Action, repository, and reload proof.
- UI completion without Browser-Proof or a concrete exception.
- security completion without Auth, Zod, and Ownership checks when mutations exist.

Mention skipped checks, why they were skipped, and residual risk.
