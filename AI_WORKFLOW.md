# Life OS – AI and Codex Workflow

**Status:** Active
**Scope:** repository work with Codex, ChatGPT and optional tooling
**Canonical work rules:** `AGENTS.md`

## Current architecture decision — R2-11 USER ACCEPTED (2026-09-10)

The user selected **Decision A**: Life OS / PostgreSQL remains canonical
operational truth. Obsidian is the Visual / Knowledge / Graph client.
Obsidian-first is NO-GO for now; native Graph remains fallback. R2-11 is closed;
R2-12 – Obsidian Projection Foundation is USER ACCEPTED. R2-13 – Project Map / Canvas is the sole Active Work Block, with USER ACCEPTANCE PENDING. Prior provisional/conditional
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

After the workflow cutover, every delegated task starts from:

```text
Approved GitHub Issue URL/number
AGENTS.md
Referenced ROADMAP.md block when product scope is involved
Relevant docs/product/capability-registry.md entries
Only the Fach-/architecture/security/design sources needed for the Issue
```

The Life OS GitHub Project (`https://github.com/users/Planton361/projects/3`) is the operative queue and status source. `ROADMAP.md` remains the permanent product plan and block-scope source; the Capability Registry remains capability truth. Neither duplicates GitHub work status.

Before a status-dependent action, read the current Issue/PR revision and evidence. Historical roadmaps, QA logs and closure documents are evidence, not active priority sources.

## 3. Work Types and Standard Loop

Supported work types are `DISCOVER`, `RESEARCH`, `DECIDE/DESIGN`, `EXPERIMENT`, `DELIVER`, `EVALUATE` and read-only `REVIEW`. They are work modes, not mandatory phases for every change.

```text
approved Issue
→ read only relevant active sources and current revision
→ short plan
→ investigate / decide / experiment / deliver / evaluate / review
→ focused evidence and repair inside the same work contract
→ update capability truth only when it changed
→ PR/CI/review when repository changes exist
→ accepted result / M0 integration gate
```

A normal feature is delivered as one coherent Vertical Slice when possible. Research or evaluation may legitimately finish without code. Separate model/security decisions only when the risk justifies it.

## 4. Prompt Standard

Prompts should be short because stable rules already live in the repository.

Use this structure:

```text
Issue:
[approved GitHub Issue URL/number]

Goal:
[observable result or answer]

Work Type:
[DISCOVER | RESEARCH | DECIDE/DESIGN | EXPERIMENT | DELIVER | EVALUATE | REVIEW]

Roadmap Context:
[referenced block if relevant; otherwise not applicable]

Use Skills:
- [only the smallest matching set of active project-local skills]

Read:
- AGENTS.md
- the Issue
- only relevant active contracts, code, tests, Git history and evidence

Scope:
[allowed changes/actions and explicit non-goals]

Constraints:
- preserve V5
- no parallel architecture
- no fake persistence
- no remote database

Done when:
- the Issue's work-type-specific result and acceptance/evidence are satisfied
- required validation for the actual scope is current
- Capability Registry is updated only if capability truth changed
- repository changes, if any, are on the Issue branch/PR
- review is complete and no out-of-scope work was introduced
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

At the start of a new work contract:

1. open the correct repository/worktree and verify the Issue, branch, upstream and base revision;
2. use a fresh Codex session for a new Issue or materially changed contract;
3. read `AGENTS.md`, the Issue and only the relevant active sources;
4. ask for a short plan;
5. allow only the actions granted by that Issue;
6. keep one main writing agent.

Normal repairs and review fixes for the same Issue continue in the same implementation session and PR. A new work contract gets a new session.

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

Maintain distinct authorities:

- GitHub Issue = concrete question/result, acceptance, scope and authorization;
- GitHub Project (`https://github.com/users/Planton361/projects/3`) = operative order/status/priority/work type;
- `ROADMAP.md` = permanent product plan, dependencies, stable block scope and current product context;
- `docs/product/capability-registry.md` = capability implementation truth and evidence;
- PR/CI = proposed repository revision and technical checks;
- decision records = only lasting model/security/privacy/integration decisions.

Normal work does not create separate Epic, scope-lock, proof-hardening or closure files. Change `ROADMAP.md` only when the permanent plan, dependency, material block scope or current product context changes; do not use it as the daily work-status queue.

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

At the end of substantial delegated work, return only the concise state needed by CONTROL and link to persisted evidence:

```text
Status: READY_FOR_REVIEW | PARTIAL | BLOCKED | DECISION_REQUIRED
Result:
References:
Revision:
Checks/Evidence:
Open:
Next action:
```

Do not reproduce a session transcript. Research/Evaluation without repository changes reports the accepted evidence/result instead of inventing a commit or PR.


## 14. Work Graph Planning Handoff and Decision Gates

The 2026-09-09 Work Graph/Obsidian handoff has been reconciled into repository
ROADMAP.md and dependent active contracts. Its Downloads paths and proposed
examples are provenance, not another active source or implementation authority.
Planning-only requests update contracts/status truth without starting code,
migrations, clients or runtime integrations. Report PLAN_READY for the planning
outcome only after applicable Completion Gate checks pass; this is not feature
completion or USER ACCEPTED.

R2-09 and R2-10 are USER ACCEPTED. R2-11 is USER ACCEPTED with Decision A:
Life OS/PostgreSQL remains canonical and Obsidian is a projection/client. R2-12
is USER ACCEPTED. R2-13 Project Map / Canvas is the sole active product block
with USER ACCEPTANCE PENDING; R2-14 and later blocks remain gated. R2-07 remains
paused for Journal reconciliation and R2-08 remains paused/superseded; preserve
existing implementation/data and pending acceptance. R2-06 remains terminal.

Decision A is already selected. The accepted R2-12 projection precedes the
current R2-13 Canvas work; an accepted R2-14 security/conflict contract must
still precede R2-15 commands. The roadmap alone grants no installation, personal
Vault path/access, cloud-sync, external API or remote access. No protected path,
Task lifecycle change or user acceptance is inferred from handoff examples.
Every selected implementation block still needs its canonical Vertical Slice and
focused proof. Decision blocks produce reviewable evidence and explicit
decisions; they do not pretend to deliver a production Vertical Slice.

Prove Dependency Truth, Obsidian Value, Single Truth, Sync Reliability and Daily
Value at the ROADMAP.md gates. The R2-11 synthetic multi-session pilot is
historical decision evidence; any later product-value claim still requires the
explicitly authorized realistic proof defined by its active block. At least three context-reset comparisons are required;
automated retrieval is technical evidence, not a substitute for subjective human
clarity/mental-load ratings or longer-term daily-value evidence.
Compare resumption/next-action time, blocker clarity, sorting/double upkeep and
combined RAM/CPU/swap. Stop or reduce integration when daily value fails.
