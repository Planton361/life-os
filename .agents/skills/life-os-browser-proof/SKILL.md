---
name: life-os-browser-proof
description: Project-local Life OS browser proof skill. Use when Codex must prove UI, forms, buttons, navigation, prepared states, persistence, reload stability, accessibility-relevant interaction, or user-visible behavior in a local browser or Playwright-compatible flow without requiring MCP installation.
---

# Life OS Browser Proof

Use this skill to prove behavior in the browser instead of only reading code.
The proof should be Playwright-compatible, but this skill does not require MCP
installation.

## Sources

Read the relevant sources:

- `AGENTS.md`
- `ACCESSIBILITY.md`
- `AI_WORKFLOW.md`
- `docs/ai-workflow/life-os-agent-workflow-v2.md`
- route, page, component, action, and repository files for the flow

## Proof Workflow

1. Start the local app or use the existing local web server.
2. Open the exact route for the user flow.
3. Execute the concrete user flow.
4. Click the button or submit the form, not just inspect markup.
5. For writes, reload the page and re-check the result.
6. Assert the result in the concrete region, panel, card, list, or page.
7. Do not use global text search as the only proof.
8. Respect Manual, Demo, and Empty boundaries.
9. Create test data with unique titles when test data is needed.
10. Do not commit auth state, storage state, screenshots with secrets, or private data.

## Proof Quality

Prefer stable selectors, accessible names, visible region checks, and scoped
assertions. Mention the route, action, data title, reload result, and any
blocked interaction.

If the browser cannot run, report:

- attempted command or method
- blocking reason
- remaining risk
- what non-browser validation still passed

## Required Report Notes

State one of:

```text
Browser-Proof: PASS
Browser-Proof: PASS_WITH_DEFERRED
Browser-Proof: BLOCKED
Browser-Proof: NOT_NEEDED
```

Include the reason.
