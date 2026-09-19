# GitHub Copilot Adapter – Life OS

Status: Non-canonical adapter

This file is a concise Copilot adapter. It does not create product, workflow or
roadmap truth. For substantial work, start from the approved GitHub Issue and use
Life OS Project #3 for operative status/priority/work type, then follow the ordered
canonical sources in `AGENTS.md`, especially:

- `AGENTS.md`
- `PRODUCT.md`
- `DESIGN.md`
- `ROADMAP.md`
- `docs/product/capability-registry.md`
- `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`
- `AI_WORKFLOW.md`

Rules:

- Do not delete files without explicit confirmation.
- Do not replace Dashboard V5.
- Do not introduce new libraries without justification.
- Use TypeScript and existing architecture.
- Respect Supabase RLS/security rules.
- Respect accessibility rules.
- Use design tokens and V5 dark command-center style.
- Keep Dashboard P0 focused on Today Agenda and Daily Control.

Post-cutover: `.github/prompts/**` and duplicate `.github/skills/**` are not active task sources. Historical workflow documents are evidence only.
