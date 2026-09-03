# Accessibility Review

> Non-canonical GitHub/Copilot adapter. Follow `AGENTS.md`, `AI_WORKFLOW.md`
> and the cited canonical sources if this prompt conflicts with them.

Review the current UI or diff for accessibility.

Use Skills:
- life-os-completion-gate
- life-os-browser-proof, if interactive behavior must be proven

Read:
- `ACCESSIBILITY.md`
- `.github/instructions/security-accessibility.instructions.md`

Check:
- H1 and headings
- focus states
- keyboard navigation
- labels
- aria labels
- contrast
- color-only information
- modal behavior
- mobile touch targets
- chart text summaries

Output:
Pass / Fail / Issues / Required fixes / Suggested tests.
