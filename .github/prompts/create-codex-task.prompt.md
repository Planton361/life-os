# Create Codex Task

Turn a broad Life OS request into a safe Codex task.

Use Skills:
- life-os-codex-task-writer
- life-os-completion-gate

Include:

```text
Goal
Use Skills
Context
Files to Read
Files to Change
Files Not to Change
Hard Boundaries
Vertical Slice Scope
Done When
Validation
Staging
Report Format
```

Rules:
- No deletion.
- Existing files preferred.
- V5 remains source of truth.
- Keep task small and reviewable.
- Use `life-os-vertical-slice`, `life-os-design-taste`, `life-os-backend-action-slice`, `life-os-browser-proof`, and `life-os-completion-gate` only when they fit the task type.
