# Life OS – AI and Codex Workflow

**Status:** Active
**Scope:** repository work with Codex, ChatGPT and optional tooling
**Canonical work rules:** `AGENTS.md`

## Current architecture decision — R2-11 USER ACCEPTED (2026-09-10)

The user selected **Decision A**: Life OS / PostgreSQL remains canonical
operational truth. Obsidian is the Visual / Knowledge / Graph client.
Obsidian-first is NO-GO for now; native Graph remains fallback. R2-11 is closed;
R2-12 – Obsidian Projection Foundation is the sole Active Work Block, with
USER ACCEPTANCE PENDING. R2-13 is not started. Prior provisional/conditional
R2-11 wording below records the earlier planning/lab context and does not
reopen this decision. Existing Lab evidence and its limitations remain intact;
no Lab artifact becomes Product Runtime. Journal/Skill Map reconciliation is
separate; neither data ownership nor user acceptance is inferred for Journal.

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
→ Surface Acceptance when a core surface is touched
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
- `life-os-surface-acceptance` when a core surface is implemented, corrected or closed
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

### Local runtime resource discipline

- Use `pnpm dev` for the canonical Target. Its wrapper owns its Next process
  group, forwards cancellation, detects loss of the invoking parent and refuses
  a second managed dev runtime in the same checkout. Existing user processes
  are never killed to acquire a lock.
- Development uses an explicit 4096 MiB Node old-space budget instead of
  Next 16.2.2's automatic half-of-system-RAM setting per dev server. A deliberate
  `NODE_OPTIONS` old-space override is preserved. This limits V8's old space,
  not total RSS or native compiler/browser memory. Ten-minute navigation with
  reading pauses passed; an accelerated thousands-of-reloads stress probe still
  triggered Next's threshold restart. This budget is not a memory-leak claim.
- `experimental.cpus: 2` limits supported Next build workers. Revalidate the
  experimental configuration when upgrading Next; do not use undocumented env
  switches. Type checking, lint and builds remain enabled.
- `pnpm test:e2e:isolated <focused-spec>` uses one Playwright worker by default,
  a checkout-scoped lock shared with validation and unique compiler/type-config
  outputs. Playwright directly execs the managed wrapper on Linux, so loss of
  its parent cannot be hidden behind a surviving pnpm intermediary. Successful,
  failed and interrupted startup all attempt cleanup of that exact project.
  Browser temporary files use a private directory under the on-disk repository
  cache rather than RAM-backed `/tmp`. Volumes are retained; never use `--all`
  or `--no-backup` for cleanup. A failed cleanup is reported and its workdir
  retained for recovery.
- Use `pnpm validate:local [focused-vitest-files...]` for sequential typecheck,
  lint, runtime lifecycle tests, focused Vitest and build. Do not run heavy
  validations or multiple disposable stacks concurrently across worktrees.
- SIGINT/SIGTERM and invoking-parent loss are handled. SIGKILL/power loss cannot
  execute JavaScript cleanup; inspect an interrupted disposable project's
  identity before any recovery, and never sweep user, Target or legacy processes.
- Memory evidence must distinguish process RSS/PSS, process swap, host available
  memory and Docker's cache-adjusted usage. On this Linux host swap is zram:
  compressed swap occupies RAM and does not disappear just because a test ends.

### Tier 5 – Surface Acceptance

For Dashboard, Inbox, Today, Calendar, Portfolio, Health, Fitness and
Nutrition, an implementation result is not an accepted surface by itself.
Before core-surface closure:

- read the active Surface Contract in `PRODUCT.md` and `DESIGN.md`;
- inventory every visible control and directly exercise each one;
- verify navigation, writes, success/error feedback and reload persistence;
- inspect console and hydration output;
- review card/overlay bounds and unjustified whitespace at the primary 4K CSS
  viewport, `1920×1080` and Mobile guards;
- retain a complete screenshot for the primary viewport and `1920×1080` for
  each core surface;
- complete `life-os-design-taste` review.

`Prepared` cannot close a promised core control without explicit user deferral.
`IMPLEMENTATION PASS` does not close a core surface. The final active-product
closure occurs only after the user explicitly records `USER ACCEPTED`.

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
- Was every visible control inventoried and directly exercised for a core surface?
- Are console/hydration, bounds, overlap, whitespace and complete screenshots reviewed?
- Is `USER ACCEPTED` present when this is final core-surface/product closure?
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


## 14. Work Graph Planning Handoff and Decision Gates

The 2026-09-09 Work Graph/Obsidian handoff has been reconciled into repository
ROADMAP.md and dependent active contracts. Its Downloads paths and proposed
examples are provenance, not another active source or implementation authority.
Planning-only requests update contracts/status truth without starting code,
migrations, clients or runtime integrations. Report PLAN_READY for the planning
outcome only after applicable Completion Gate checks pass; this is not feature
completion or USER ACCEPTED.

R2-09 and R2-10 are explicitly USER ACCEPTED on 2026-09-09. R2-11 is the sole
active block for synthetic feasibility work; canonical Dependencies stay unchanged. R2-11 stops at
Decision Gate A for explicit user architecture selection; do not infer Option A
from the presence of detailed R2-12–R2-17 plans. R2-07 is paused for Journal
reconciliation and R2-08 is paused/superseded pending that decision; preserve
existing implementation/data and pending acceptance. R2-06 remains terminal.

If Option A is selected, projection precedes Canvas, then an accepted R2-14
security/conflict contract precedes R2-15 commands. The roadmap alone grants no
installation, personal Vault/export, cloud-sync, external API or remote access.
No protected path, current Task lifecycle or user acceptance is inferred from
handoff examples. Every selected implementation block still needs its canonical
vertical slice and focused proof. Decision blocks produce reviewable evidence and
explicit decisions; they do not pretend to deliver a production vertical slice.

Prove Dependency Truth, Obsidian Value, Single Truth, Sync Reliability and Daily
Value at the ROADMAP.md gates. Use the current R2-11 synthetic multi-session pilot
before integration selection and an explicitly authorized realistic pilot for
later product proof. At least three context-reset comparisons are required;
automated retrieval is technical evidence, not a substitute for subjective human
clarity/mental-load ratings or longer-term daily-value evidence.
Compare resumption/next-action time, blocker clarity, sorting/double upkeep and
combined RAM/CPU/swap. Stop or reduce integration when daily value fails.
