# Vertical Slice Feature Prompt

Use this prompt for Life OS feature work that touches UI, persistence, server
actions, or user-visible workflows.

```text
Goal:
[One concrete feature or repair.]

Context:
[Product intent, route/page, current behavior, source-of-truth docs.]

Constraints:
- No deletion without explicit confirmation.
- No new design direction; V5 remains source of truth.
- No new library unless explicitly justified and approved.
- No secrets, private data, remote DB, `supabase link`, `supabase db push`, or `supabase db reset`.
- No product scope outside this vertical slice.

Files to read:
- AGENTS.md
- PRODUCT.md
- DESIGN.md
- ARCHITECTURE.md
- DATA_MODEL.md, if data is touched
- SECURITY.md, if auth, data, mutations, AI, or MCP are touched
- ACCESSIBILITY.md, if UI is touched
- AI_WORKFLOW.md
- docs/ai-workflow/life-os-agent-workflow-v2.md
- [feature-specific files]

Files to change:
- [exact files]

Files not to change:
- private/
- docs/product/life-os-full-roadmap-checklist.md
- .env*
- supabase/.temp/**
- supabase/.branches/**
- [explicit out-of-scope files]

Vertical Slice Scope:
- UI: [usable UI or clear Prepared/Future State]
- Server Action: [required action or why none is needed]
- Repository/DB path: [required path if persistence is claimed]
- Zod/Auth/Ownership: [validation and same-user gates]
- Manual/Demo/Empty: [expected behavior in each profile]
- Reload Proof: [what must survive reload]
- Browser Proof: [flow to execute]
- QA/E2E Docs: [test or doc update]

Done When:
- Product intent is satisfied.
- Every button persists, navigates, or is clearly marked Prepared/Future.
- Persisted data is reload-stable.
- Manual does not fall back to Demo.
- UI follows V5 and accessibility basics.
- Server mutations use Zod, Auth, user-scope and Ownership gates.
- Browser proof is green or a skipped proof is justified with risk.

Validation:
- git diff --check
- pnpm typecheck
- pnpm lint
- pnpm exec supabase db lint --local --level warning, if data/backend is touched
- targeted Playwright/browser proof, if UI or user flow is touched

Report Format:
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```
