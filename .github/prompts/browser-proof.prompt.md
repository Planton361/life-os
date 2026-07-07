# Browser Proof Prompt

Use this prompt to prove Life OS UI, flow, prepared-state, or persistence behavior in a local browser or Playwright-compatible flow.

Use Skills:
- life-os-browser-proof
- life-os-completion-gate

```text
Goal:
[One concrete browser proof target.]

Context:
[Route, user flow, expected behavior, data profile, and relevant acceptance criteria.]

Files to Read:
- AGENTS.md
- ACCESSIBILITY.md
- AI_WORKFLOW.md
- docs/ai-workflow/life-os-agent-workflow-v2.md
- docs/ai-workflow/skills.md
- .agents/skills/life-os-browser-proof/SKILL.md
- .agents/skills/life-os-completion-gate/SKILL.md
- [route/page/component/action/repository files for the flow]

Hard Boundaries:
- No product features or UI changes unless explicitly requested.
- No remote DB, `supabase link`, `supabase db push`, or `supabase db reset`.
- Do not stage `.local/`, auth state, screenshots with private data, `.env*`, `private/`, or generated browser artifacts.
- Do not use global text search as the only proof.

Browser Proof Scope:
- Route: [exact local route]
- Profile/Data Boundary: [manual | demo | empty]
- User Flow: [steps to execute]
- Interaction: [button/form/navigation to actually use]
- Test Data: [unique title or fixture; use unique data when creation is needed]
- Region Assertion: [specific card/panel/list/page region to verify]
- Reload Proof: [required if a write or projection is claimed]
- Manual/Demo/Empty: [expected boundary]

Done When:
- The concrete user flow was executed.
- Button or form was actually used.
- Result was checked in the concrete region.
- Writes survived reload, if writes are involved.
- Manual, Demo, and Empty boundaries were respected.
- Result is reported as `PASS`, `PASS_WITH_DEFERRED`, or `BLOCKED` with reason.

Validation:
- Browser or Playwright-compatible proof for the exact flow.
- git diff --check, if files changed.
- pnpm typecheck and pnpm lint, if files changed.

Staging:
- Stage only intentionally changed prompt, test, proof, or app files.
- Do not stage `private/`, `.local/`, auth state, `.env*`, `next-env.d.ts`, screenshots with secrets/private data, or generated browser artifacts.

Report Format:
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Browser-Proof:
Flow:
Reload:
Result:
Nicht gelöst:
Risiken:
```
