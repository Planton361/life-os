---
name: life-os-codex-task-writer
description: Active Life OS task-writing skill. Use when Codex needs to turn vague product, design, documentation, agent-workflow, or implementation intent into small, scoped, testable Codex tasks with explicit files to read/change/not change, V5 design constraints, security/accessibility requirements, acceptance criteria, validation, and reporting obligations.
---

# Life OS Codex Task Writer

Use this skill to convert vague intent into safe, reviewable Codex work. The output is a task prompt or implementation brief, not an implementation.

## Sources

Use the smallest relevant source set:

- Always start from `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `ROADMAP.md`, and `AI_WORKFLOW.md` when scope is broad.
- For UI/dashboard tasks, include `docs/design/dashboard-v5.md`, `docs/design/design-tokens.md`, `docs/design/component-system.md`, and `docs/design/visualization-rules.md`.
- For product/routes, include `docs/product/pages-and-routes.md`, `docs/product/ux-flows.md`, and `docs/product/feature-spec.md`.
- For agent/prompt/tooling tasks, include `docs/ai-workflow/prompting-rules.md`, `docs/ai-workflow/review-workflow.md`, and `docs/ai-workflow/tools-and-repos.md`.
- For security, auth, data, or AI-generated content, include `SECURITY.md`, `DATA_MODEL.md`, and `ACCESSIBILITY.md` as relevant.

## Hard Rules

- Split large intent into small, reviewable tasks.
- Require Plan Mode before large, cross-file, security-sensitive, data-model, or design-system changes.
- Do not delete files without explicit confirmation.
- Do not introduce a new design direction.
- Do not override V5 or `DESIGN.md`.
- Do not install external tools automatically.
- Do not touch secrets, `.env`, production data, or private user data.
- Prefer improving existing files/components over duplicating them.
- Include validation commands or explain why validation is not applicable.

## Standard Task Structure

Every produced Codex task must include these sections, even when a section says `Nicht relevant`:

```text
Ziel:
Dateien lesen:
Dateien ändern:
Dateien nicht ändern:
Layout-Anforderungen:
Datenmodell-Anforderungen:
Designregeln:
Security/Accessibility-Regeln:
Akzeptanzkriterien:
Prüfung:
Ausgabeformat:
```

## Writing Method

1. Restate the real goal in one sentence.
2. Identify the smallest safe file scope.
3. Name explicit non-goals and forbidden files.
4. Add V5 and Life OS design constraints when any UI is involved.
5. Add data/security/accessibility constraints when user data, auth, server work, or generated content is involved.
6. Convert fuzzy success into observable acceptance criteria.
7. Add exact validation commands where useful.
8. Require the standard report format.

## Berichtspflicht

Every task must require this final report format:

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

The report must mention skipped checks and residual risk. It must not claim app behavior, security, or design compliance that was not validated.
