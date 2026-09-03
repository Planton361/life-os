# Backend Action Slice Prompt

> Non-canonical GitHub/Copilot adapter. Follow `AGENTS.md`, `AI_WORKFLOW.md`
> and the cited canonical sources if this prompt conflicts with them.

Use this prompt for Life OS backend, repository, schema, or Server Action work.

Use Skills:
- life-os-backend-action-slice
- life-os-completion-gate
- life-os-browser-proof, if UI or a user-visible flow is affected

```text
Goal:
[One concrete backend, repository, schema, or Server Action task.]

Context:
[Feature, route, data entity, current behavior, and why this backend slice is needed.]

Files to Read:
- AGENTS.md
- ARCHITECTURE.md
- DATA_MODEL.md
- SECURITY.md
- ACCESSIBILITY.md, if UI states are touched
- AI_WORKFLOW.md
- docs/ai-workflow/life-os-agent-workflow-v2.md
- docs/ai-workflow/skills.md
- .agents/skills/life-os-backend-action-slice/SKILL.md
- .agents/skills/life-os-completion-gate/SKILL.md
- .agents/skills/life-os-browser-proof/SKILL.md, if UI is affected
- [feature-specific action/schema/repository/UI files]

Hard Boundaries:
- No product scope outside this backend slice.
- No UI work unless explicitly listed.
- No migration, RLS/policy change, remote DB, `supabase link`, `supabase db push`, or `supabase db reset`.
- No Service Role.
- No secrets, private data, `.env*`, `private/`, `.local/`, or auth state.
- Do not create `src/server/*`; use the current Real-Data boundary.

Backend Action Scope:
- Real-Data Boundary: check `src/features/real-data/actions`, `schemas`, and `supabase/repositories`.
- Trust Boundary: do not trust client-provided `userId`.
- Validation: use Zod `safeParse`.
- Auth: use Supabase Auth server-side.
- Data Access: repository or RPC must be user-scoped.
- Ownership: verify same-user ownership for FKs and polymorphic targets.
- Revalidation: list relevant `revalidatePath` calls.
- Action Response: preserve or introduce a clear success/error/blocked response pattern.
- UI States: if UI is affected, expose visible Success/Error/Blocked states.

Done When:
- Auth, Zod, user-scope, Ownership, and revalidation are implemented or explicitly not relevant.
- No remote DB or Service Role is used.
- Validation commands are green.
- If no UI is connected, the report includes: `Data layer only, not feature complete.`
- If UI is connected, Browser-Proof is green or blocked with reason.

Validation:
- git diff --check
- pnpm typecheck
- pnpm lint
- pnpm exec supabase db lint --local --level warning
- targeted Browser-Proof or E2E proof, if UI or user flow is affected

Staging:
- Stage only the requested backend/action/safe documentation files.
- Do not stage `private/`, `docs/product/life-os-full-roadmap-checklist.md`, `.local/`, `.env*`, `next-env.d.ts`, `supabase/.temp/**`, `supabase/.branches/**`, `exports/**`, or `backups/**`.

Report Format:
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Backend Action:
Data Layer Status:
Browser-Proof:
Offene Punkte:
Risiken:
```
