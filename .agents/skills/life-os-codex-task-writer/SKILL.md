---
name: life-os-codex-task-writer
description: Turn an approved Life OS GitHub Issue or bounded question into a concise Codex work contract for research, decision/design, experiment, delivery, evaluation or review without duplicating repository rules.
---

# Life OS Codex Task Writer

Use this skill to produce a directly executable Codex prompt. The GitHub Issue is the concrete delegated contract after workflow cutover; repository sources provide product, architecture and safety context.

## Sources

Always read:
- `AGENTS.md`;
- the approved GitHub Issue.

Then load only what the Issue needs:
- referenced `ROADMAP.md` block and Capability Registry entries for product work;
- `PRODUCT.md` / `DESIGN.md` for product/UI scope;
- `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md` when those boundaries are affected;
- relevant project-local `.agents/skills/*/SKILL.md`;
- relevant code, tests, history and evidence.

Historical workflow documents are evidence only and are not required context for normal tasks.

## Work Types

Use exactly the work type appropriate to the Issue:
- `DISCOVER`: clarify need, value, non-goals and uncertainty;
- `RESEARCH`: answer a bounded question from sources/code;
- `DECIDE/DESIGN`: compare viable options and persist an accepted decision when authorized;
- `EXPERIMENT`: run a bounded, reproducible test with explicit budget/stop conditions;
- `DELIVER`: implement one coherent observable result;
- `EVALUATE`: interpret actual evidence and limits;
- `REVIEW`: read-only focused review of a concrete revision.

Do not force every task through every work type.

## Hard Rules

- Prefer one coherent outcome over layer-only or docs-only microtasks.
- Do not expand the approved Issue scope.
- Do not delete/move files, touch protected paths, use remote DB/deployment/providers or broaden permissions without explicit authorization.
- Preserve V5 and the established feature-local architecture.
- One writer per branch; normal Delivery uses `codex/<issue>-<slug>`.
- Research/Evaluation with no repository changes does not need an artificial branch/PR.
- Same Issue repairs stay in the same session/branch/PR.
- Include only the smallest useful skill set and validation.

## Skill Mapping

```text
UI / cross-domain Delivery:
- life-os-vertical-slice
- life-os-design-taste
- life-os-browser-proof
- life-os-surface-acceptance when a core surface is touched/closed
- life-os-completion-gate

Backend/Data Delivery:
- life-os-backend-action-slice
- life-os-browser-proof if user behavior is affected
- life-os-completion-gate

Review:
- life-os-completion-gate
- life-os-design-taste only for UI review

Research / Decision / Experiment / Evaluation:
- only a project skill that materially helps; otherwise no artificial skill requirement

Docs / Workflow:
- life-os-completion-gate
```

## Prompt Shape

```text
Issue:
Work Type:
Goal:
Roadmap Context:
Use Skills:
Read:
Scope / Non-goals:
Authorization:
Acceptance / Evidence:
Validation:
Return:
```

The return is concise:

```text
Status: READY_FOR_REVIEW | PARTIAL | BLOCKED | DECISION_REQUIRED
Result:
References:
Revision:
Checks/Evidence:
Open:
Next action:
```

Do not request or reproduce a long session history.
