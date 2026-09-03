# Life OS Workflow Adoption Report — M-000R

**Status:** Historical adoption evidence. Not an active authority.
**Baseline source commit:** `e7d95c1` (`feat(calendar): add day and month projections`)
**Adoption commit:** recorded by the M-000R Git commit that introduces this report
**Draft PR:** pending user review and explicit publication
**Merge commit:** pending user acceptance

## Purpose

M-000R reconciles the repository workflow after the R0, SR1, C1 and C2-01
through C2-03 deliveries. It preserves the existing V5 frontend, feature-local
Next.js architecture, local-first Target Supabase runtime, authenticated
Server-Action/repository/RLS boundary, and focused Playwright proofs. C2-04
remains the next regular active milestone.

## Resolved Workflow Decisions

- The checked-out local baseline at the start of M-000R is the technical
  baseline. Connected GitHub history is behind it; publication is a separate,
  user-approved step.
- `ROADMAP.md` owns both the permanent programme sequence and exactly one
  explicit Active Work Block. Normal status transitions may update that block
  without rewriting the permanent plan.
- `AGENTS.md` and `AI_WORKFLOW.md` are canonical for Codex work. GitHub and
  Copilot instructions are non-canonical, tool-specific adapters.
- Only existing project-local skills in `.agents/skills` form the active skill
  set; active workflow prompts name only verified skills.
- One main writing agent is the default. Additional agents require an explicit
  user request and a bounded, independent read-only audit.
- Normal work uses the Roadmap, Capability Registry, code, tests and Git
  history; it does not require maximal documentation ceremony.

## Runtime and Product Baseline

- The local Target Supabase stack is canonical. The former local stack is
  `LEGACY_FALLBACK_READ_ONLY`.
- Dashboard V5, Server Components for reads, Server Actions for writes, Zod,
  user-scoped repositories/RPCs, Supabase Auth/Postgres/RLS, protected local
  data paths and focused browser proofs remain unchanged.
- Entertainment, Shop, Challenges and Anti-Rot remain deferred and hidden from
  active navigation. The production personal AI assistant remains deferred.

## Deferred Improvements

- Opportunistic: split oversized feature/view-model modules only when touched;
  continue focused Playwright-spec extraction; optional CI and Draft-PR checks.
- Cosmetic: historical branch naming, legacy QA/agent cleanup and documentation
  directory normalization.

## Source of Truth

1. `AGENTS.md`
2. `PRODUCT.md`
3. `DESIGN.md`
4. `ROADMAP.md`
5. `docs/product/capability-registry.md`
6. `ARCHITECTURE.md`
7. `DATA_MODEL.md`
8. `SECURITY.md`
9. `ACCESSIBILITY.md`
10. `AI_WORKFLOW.md`

Code, tests, migrations and runtime configuration remain technical evidence of
actual implementation. This report records the adoption only and cannot
override the sources above.
