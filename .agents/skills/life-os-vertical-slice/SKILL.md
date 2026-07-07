---
name: life-os-vertical-slice
description: Project-local Life OS workflow skill for building or reviewing a complete user-facing feature slice. Use when Codex works on a feature that touches UI, navigation, persistence, server actions, repositories, prepared states, reload stability, browser proof, QA documentation, or any user-visible workflow that must be complete end to end instead of layer-only work.
---

# Life OS Vertical Slice

Use this skill to keep feature work end-to-end. Do not build isolated UI,
isolated backend, or claimed completion unless the slice has a truthful user
flow.

## Sources

Read the smallest relevant source set:

- `AGENTS.md`
- `PRODUCT.md`
- `DESIGN.md`, if UI is touched
- `ARCHITECTURE.md`
- `DATA_MODEL.md`, if data is touched
- `SECURITY.md`, if auth, data, mutations, AI, or MCP are touched
- `ACCESSIBILITY.md`, if UI is touched
- `AI_WORKFLOW.md`
- `docs/ai-workflow/life-os-agent-workflow-v2.md`
- `docs/ai-workflow/skills.md`
- feature-specific files

## Workflow

1. Clarify Product Intent and non-goals.
2. Identify the affected route, page, component, action, repository, and data path.
3. Check existing design patterns and V5 before changing UI.
4. Check the data model, repository, and action boundary before claiming persistence.
5. Build UI only when it has real functionality or an honest Prepared/Future State.
6. Add Server Action, repository, Zod, Auth, and Ownership gates when persistence is needed.
7. Verify reload stability when data is written or projected.
8. Provide Browser-Proof when UI or a user flow is touched, or justify why it is not needed.
9. Update QA, E2E, or proof documentation when the slice changes behavior.

## Hard Rules

- No button without persistence, real navigation, or a clearly marked Prepared/Future State.
- No persistence claim without Server Action or repository path.
- No feature-complete claim without reload proof when writes are involved.
- No feature-complete claim without Browser-Proof when UI is touched.
- Keep Manual, Demo, and Empty boundaries separate.
- Do not expand product scope outside the confirmed slice.

## Required Report Notes

When using this skill, the final report must state:

- the route/page/component affected
- whether UI is usable or Prepared/Future
- whether persistence exists
- how reload stability was checked
- how Browser-Proof was handled
- what remains deferred
