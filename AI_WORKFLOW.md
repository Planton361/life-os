# Life OS – AI and Codex Workflow

**Status:** Active
**Scope:** repository work with Codex, ChatGPT and optional tooling
**Canonical work rules:** `AGENTS.md`

## 1. Purpose

AI tools accelerate Life OS delivery. They do not replace product truth, security boundaries or user review.

The workflow optimizes for:

- complete user capabilities;
- reuse of the existing V5 frontend;
- real backend and database behavior;
- fewer docs-only micro-blocks;
- short prompts backed by repository context;
- focused tests and reliable commits.

## 2. Active Context

Every implementation task starts from:

```text
Block ID from the user/Codex prompt, or the explicit Active Work Block in `ROADMAP.md`
AGENTS.md
PRODUCT.md
DESIGN.md
ROADMAP.md
docs/product/capability-registry.md
```

Read architecture, data, security and accessibility files only as needed for the active scope.

Historical roadmaps, QA logs and closure documents are evidence. They are not active priority sources.

## 3. Delivery Loop

```text
Block ID from the Codex prompt, or the explicit Active Work Block in `ROADMAP.md`
→ read ROADMAP scope
→ audit Capability Registry and code
→ short plan
→ complete Vertical Slice
→ dependent projections
→ focused validation
→ update Capability Registry
→ review
→ commit
```

A normal feature should be delivered in one coherent block when possible.

Separate model/security decisions only when the risk justifies it.

## 4. Prompt Standard

Prompts should be short because stable rules already live in the repository.

Use this structure:

```text
Goal:
[visible user outcome]

Roadmap Block:
[explicit block ID, or resolve the Active Work Block from ROADMAP.md]

Use Skills:
- [only the smallest matching set of active project-local skills]

Read:
- AGENTS.md
- ROADMAP.md
- docs/product/capability-registry.md
- code, tests and Git history relevant to the named block

Scope:
[capabilities and cross-domain reactions]

Constraints:
- preserve V5
- no parallel architecture
- no fake persistence
- no remote database

Done when:
- UI, backend, database and projections are connected
- reload/browser proof is green
- Capability Registry is updated
- review is complete
- commit exists
```

Do not paste the complete security, staging and design rules into every prompt.

## 5. Skill Mapping

### Complete feature or cross-domain slice

- `life-os-vertical-slice`
- `life-os-backend-action-slice` when writes, repositories or schemas are affected
- `life-os-browser-proof` when UI, navigation or persistence behavior is affected
- `life-os-completion-gate`
- `life-os-design-taste` when UI is involved

### Small backend capability

- `life-os-backend-action-slice`
- `life-os-completion-gate`
- `life-os-browser-proof` if a user flow is affected

### Bug fix

- `life-os-completion-gate`
- `life-os-browser-proof` for behavioral bugs
- relevant backend/design skill only when needed

### UI review only

- `life-os-design-taste`
- `life-os-completion-gate`

### Prompt generation

- `life-os-codex-task-writer`

## 6. Codex Session Pattern

At the start of a new block:

1. open the repository root;
2. use a fresh Codex session;
3. ask Codex to read active sources;
4. ask for a short plan;
5. allow workspace writes with on-request approvals;
6. keep one main writing agent.

Suggested CLI mode:

```bash
codex --sandbox workspace-write --ask-for-approval on-request
```

Model selection remains a local Codex configuration concern and must not be hard-coded into repository instructions.

## 7. Subagents

Use one main agent by default. Do not automatically create subagents.

Only use an additional agent when the user explicitly requests parallel work or
delegation, and the audit is concrete, independent and read-only. The main
agent owns every write, scope decision and final integration. Never let agents
independently modify overlapping feature files.

## 8. Validation Tiers

### Tier 1 – every code change

```bash
git diff --check
pnpm typecheck
pnpm lint
```

### Tier 2 – affected backend/schema

```bash
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none
```

### Tier 3 – affected user flow

Focused Playwright proof with:

- real interaction;
- scoped assertions;
- reload after writes;
- unique test data.

### Tier 4 – major block closure

```bash
pnpm build
```

Plus the focused block regression scope and Codex review.

Avoid full-suite or unrelated broad-grep runs after every small change.

## 9. Documentation Strategy

Maintain as canonical delivery sources:

- `ROADMAP.md` for the permanent plan, sequence, stable block scope and exactly one explicit Active Work Block;
- `docs/product/capability-registry.md` as the dynamic actual-status source;
- decision records for real model/security decisions;
- QA documents only for complex proof cases.

Normal work does not create separate Epic, scope-lock, proof-hardening or closure files. Change `ROADMAP.md` when the permanent plan, order, dependency or material scope changes, or to transition its single Active Work Block without rewriting the permanent plan.

## 10. MCP and External Tools

### Playwright MCP

Use for local browser diagnosis, role/label interaction and screenshot-assisted review. It supplements, not replaces, committed Playwright tests.

### Next DevTools MCP

Use for local App Router, runtime, hydration and Server Action debugging.

### Figma MCP

Use read/review-scoped for V5 fidelity when actual UI work requires design context.

### Supabase MCP

Not required. Supabase CLI, migrations and generated types remain canonical.

### UI generators

v0, Lovable or similar tools may produce isolated design references. Their generated application architecture is not automatically imported into Life OS.

## 11. Runtime AI Assistant

The future DeepSeek assistant is a product capability, not a development agent.

Rules:

- no direct database connection for the LLM;
- server-side provider credentials;
- structured read tools;
- Zod-validated proposed writes;
- user confirmation before mutation;
- existing Server Actions/Repositories execute confirmed writes;
- tool results and review records are auditable;
- provider/model configuration remains swappable.

## 12. Review Questions

Before committing, Codex reviews:

- Did the feature reuse existing UI and architecture?
- Is every visible action real or honestly deferred?
- Is there one canonical data source?
- Are auth, validation, ownership and RLS correct?
- Did all affected projections update?
- Did Manual/Demo/Empty/Auth-blocked remain separated?
- Is the focused reload/browser proof green?
- Was the Capability Registry updated?
- Is the diff limited to the active block scope?

## 13. Handoff

At the end of a substantial block, report:

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Capability Outcome:
Backend/Data:
UI/Projection:
Browser Proof:
Capability Registry:
Deferred:
Commit:
Commit Hash:
Nicht gelöst:
Risiken:
```
