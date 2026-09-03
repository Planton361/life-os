# Completion Review Prompt

> Non-canonical GitHub/Copilot adapter. Follow `AGENTS.md`, `AI_WORKFLOW.md`
> and the cited canonical sources if this prompt conflicts with them.

Use this prompt after a Codex block to decide whether the work is truly complete, only partial, prepared, or blocked.

Use Skills:
- life-os-completion-gate
- life-os-design-taste, if UI is affected
- life-os-browser-proof, if UI or a user flow is affected

```text
Goal:
Review the completed block against its stated scope and acceptance criteria.

Context:
[Original request, files changed, relevant commit/diff/check output, and claimed result.]

Files to Read:
- AGENTS.md
- PRODUCT.md, if product behavior is affected
- DESIGN.md, if UI is affected
- ARCHITECTURE.md, if code structure is affected
- DATA_MODEL.md, if data is affected
- SECURITY.md, if auth/data/mutations are affected
- ACCESSIBILITY.md, if UI is affected
- AI_WORKFLOW.md
- docs/ai-workflow/life-os-agent-workflow-v2.md
- docs/ai-workflow/review-workflow.md
- docs/ai-workflow/skills.md
- .agents/skills/life-os-completion-gate/SKILL.md
- .agents/skills/life-os-design-taste/SKILL.md, if UI is affected
- .agents/skills/life-os-browser-proof/SKILL.md, if UI or flow is affected
- [changed files and relevant tests/proofs]

Hard Boundaries:
- Review only unless explicit fix scope is provided.
- Do not broaden product scope.
- Do not delete files.
- Do not touch secrets, private data, remote DB, or MCP configuration.

Completion Review Scope:
- Original Scope: [what was requested]
- Acceptance Criteria: [list]
- Changed Files: [list]
- Feature State: [complete | data layer only | prepared state | partial | blocked]
- UI Truth: [usable | prepared/future | not applicable]
- Backend Truth: [connected | data layer only | not applicable]
- Zod/Auth/Ownership: [pass | fail | not applicable]
- Reload Proof: [pass | missing | not applicable]
- Browser-Proof: [pass | missing | blocked | not applicable]
- Docs/QA: [updated | missing | not applicable]

Decision:
- Use `PASS` only when the requested scope is complete and validated.
- Use `PASS_WITH_DEFERRED` when the requested scope is complete but future work remains explicitly out of scope.
- Use `BLOCKED` when required scope, proof, or validation is missing.

Report Format:
Verdict:
Erfüllt:
Fehlt:
Partial/Prepared:
Validation:
Browser-Proof:
Required Fixes:
Risiken:
```
