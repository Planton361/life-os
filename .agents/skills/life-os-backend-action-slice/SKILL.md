---
name: life-os-backend-action-slice
description: Project-local Life OS backend and Server Action safety skill. Use when Codex creates, edits, or reviews Server Actions, repository calls, Supabase-backed mutations, Zod schemas, ownership checks, revalidation, user-scoped data access, or data-layer-only work under src/features/real-data/*.
---

# Life OS Backend Action Slice

Use this skill for backend, data, and Server Action work. The goal is to keep
mutations inside the Life OS security and data boundary.

## Sources

Read the relevant sources before changing backend code:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `ACCESSIBILITY.md`, if UI states are touched
- `AI_WORKFLOW.md`
- `docs/ai-workflow/life-os-agent-workflow-v2.md`
- feature-specific action, schema, repository, and UI files

## Required Boundary

Use the current feature-local Real-Data boundary:

```text
src/features/real-data/actions
src/features/real-data/schemas
src/features/real-data/supabase/repositories
```

Do not create a new `src/server/*` structure unless a separate refactor scope is
explicitly approved.

## Backend Gate

Every new or changed mutation must:

- authenticate server-side.
- avoid client-provided `userId` as a Trust Boundary.
- validate input with Zod `safeParse`.
- use a repository or RPC with user-scope.
- verify same-user Ownership for `areaId`, `projectId`, `goalId`, `taskId`, `resourceId`, `skillId`, and polymorphic targets.
- avoid Service Role.
- avoid remote DB actions, `supabase link`, `supabase db push`, and `supabase db reset`.
- call relevant `revalidatePath` targets.
- expose visible Success, Error, and Blocked states when UI is touched.
- avoid leaking secrets through errors, logs, or client code.

## Validation

Run or justify:

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm exec supabase db lint --local --level warning`
- Browser-Proof or E2E proof when UI flow is affected

## Required Report Notes

If only repository, schema, or Server Action work is done, the final report must
include this exact sentence:

```text
Data layer only, not feature complete.
```

Also report Auth, Zod, Ownership, revalidation, and UI state handling.
