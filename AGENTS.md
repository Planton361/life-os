# AGENTS.md – Life OS Repository Rules

## 1. Project Context

Life OS is a personal-only, local-first web application for daily control, scheduling, projects, knowledge, health, nutrition, work, education, coding and private life.

The existing application is the foundation. Do not restart the product, replace Dashboard V5 or introduce a parallel architecture.

Product model:

```text
Dashboard = control
Area pages = context
Detail pages = depth
Archive = history
```

## 2. Active Source Hierarchy

Read active sources in this order:

1. `AGENTS.md` – repository work rules;
2. `PRODUCT.md` – complete product contract;
3. `DESIGN.md` – V5 design truth;
4. `ROADMAP.md` – permanent product plan, stable block scope, dependencies and current product context; it is not the operative work queue;
5. `docs/product/capability-registry.md` – dynamic truth for actual capability status and evidence; it is not issue/work status;
6. `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md` – technical boundaries;
7. `AI_WORKFLOW.md` and project Skills – delivery method;
8. QA, closure, adoption, audit and historical workflow/roadmap files – evidence/history only.

Legacy research, historical roadmaps and closure files must not override the active sources above.

## 2.1 Operational Source of Truth

For normal operation:

- the approved GitHub Issue is the concrete work contract; only an approved GitHub Issue authorizes concrete work;
- the Life OS GitHub Project (`https://github.com/users/Planton361/projects/3`) owns operative queue, status, priority and work type;
- `ROADMAP.md` owns product sequence, dependencies, stable scope information and current product context. The current context may be Product Reorientation; no delivery block is required and it is not a second task-status system;
- the Capability Registry owns capability implementation truth, not issue status;
- the PR plus CI/review owns the proposed revision and technical evidence;
- ChatGPT CONTROL coordinates from those references; chat history is not project truth.

A delegated Issue references the relevant Roadmap block when product work is involved. Research or evaluation may close with an accepted persisted result and no artificial code change. Current product context is read from `ROADMAP.md`; operative task status is read from the GitHub Project and approved Issue.

## 3. Work Mode

For substantial delegated work:

1. read the approved GitHub Issue and identify its work type, acceptance, boundaries and required decision authority;
2. confirm repository, target branch, base revision and unexpected local changes before any write;
3. read the referenced `ROADMAP.md` block when product scope is involved, plus relevant Capability Registry entries and active contracts;
4. inspect only the code, tests, history and evidence needed for that result;
5. output a short execution plan;
6. complete the coherent result for the Issue: research, design/decision, experiment, delivery, evaluation or review;
7. run focused validation proportional to the work type and review the actual diff/evidence;
8. update the Capability Registry only when capability truth changed; update Issue/Project status separately;
9. run the Surface Acceptance Gate when a core surface is touched or closed;
10. commit/push only intended files on the Issue branch and update the same PR when Delivery is in scope.

Normal Delivery uses one writer on a `codex/<issue>-<slug>` branch and one PR. Do not work directly on the integration branch. Research/Evaluation without repository changes does not need a fake branch or PR. Repairs stay in the same Issue/branch/session unless the work contract materially changes.

Prefer one coherent, visible capability over many small layer-only blocks.

### 3.1 Cross-device handoff

GitHub is the only cross-device project-state authority. For one active Delivery
Issue, use one shared remote Issue branch, normally
`codex/<issue>-<slug>`, with one workstation as the active writer at a time.

Before handoff, commit all intended WIP and push that same branch. A valid
checkpoint has a clean worktree, an unambiguous `HEAD`, the approved `origin`,
the same-named upstream, and local `HEAD` matching the pushed remote branch.
A checkpoint commit is WIP evidence, not completion or merge evidence.

On the receiving workstation, fetch/prune the approved `origin`, inspect the
same branch, and fast-forward only. Stop on dirt, divergence, wrong
origin/upstream, a missing remote branch, conflicts, or ambiguous revision
identity. Read-only inspection on `main` is allowed; writes on `main` remain
forbidden. Use `pnpm workstation:doctor` for the read-only readiness and
handoff check; it never fetches, pushes, installs, starts runtimes, or mutates
authentication.

A new Issue or materially changed contract starts a fresh Codex session. A
same-Issue repair may resume on the existing branch/PR. IDE state, old chat
history, local Codex history, caches, local databases, and local secrets are
never required for continuation.

## 4. Vertical Slice Rule

A complete capability normally includes:

```text
UI / interaction
→ Server Action
→ Zod validation
→ server-side authentication
→ user-scoped repository or RPC
→ PostgreSQL / RLS
→ route/read-model revalidation
→ reload proof
→ browser proof
```

If a layer is intentionally deferred, report the feature as partial. Never describe a data-only layer as feature complete.

## 5. Existing Architecture

Use the established feature-local structure:

```text
src/features/real-data/actions
src/features/real-data/schemas
src/features/real-data/domain
src/features/real-data/supabase/mappers
src/features/real-data/supabase/repositories
src/features/<domain>
src/features/profile-data
```

Rules:

- Server Components are the default for reads.
- Client Components are used only for genuine interaction.
- Do not create a parallel `src/server` architecture.
- Reuse existing actions, schemas and repositories before adding new ones.
- Do not add a global state machine unless an explicit architecture decision approves it.
- Do not add a library when the current stack can solve the problem safely.

## 6. Backend and Data Rules

Every user-specific write must:

- authenticate server-side;
- derive `userId` from authenticated context, never trust a client-supplied user id;
- validate with Zod `safeParse` or the existing equivalent;
- use a user-scoped repository or controlled RPC;
- verify same-user ownership for linked and polymorphic targets;
- respect soft archive and active-row semantics;
- avoid Service Role in normal application flows;
- revalidate every affected route/read model;
- return visible success and error states when UI is involved.

Every user-specific table must have RLS and appropriate grants. RLS is defense in depth, not a replacement for explicit user-scoped queries.

No remote database actions without explicit scope and approval:

```text
no supabase link
no supabase db push
no remote reset
no production mutation
```

Local migrations are allowed only when required by the approved Issue and, for product work, its referenced `ROADMAP.md` block.

## 7. Cross-Domain Consistency

Dashboard, Today, Calendar and area pages are projections. They do not own duplicate domain data.

When a mutation affects another surface, update and prove the dependent projection.

Examples:

- task scheduling affects Calendar, Today and Dashboard;
- meal completion affects Meals Today, Nutrition summary and reviews;
- habit increments affect Dashboard and Habit analytics;
- project/goal changes affect Portfolio and related queues;
- mood/sleep/weight entries affect Dashboard and Health trends.

Use atomic updates or transactional RPCs for coupled writes where partial success would create an invalid state.

## 8. Design Rules

`DESIGN.md` and Dashboard V5 are binding.

- Preserve Life OS – Linear Calm Dark Command Center.
- Do not introduce a new design direction.
- Do not rebuild existing pages when a focused capability addition is sufficient.
- Avoid generic SaaS card walls, neon gradients, decorative analytics and AI-slop patterns.
- Keep semantic colors text-supported.
- Dashboard remains a cockpit, not a data warehouse.
- Prepared/Future states must be calm and honest.
- No visual control may imply a write that does not exist.
- Use existing tokens and components before adding new styles.

Primary usage is a 4K second monitor. Standard desktop and mobile must remain usable.

## 8.1 Surface Acceptance Gate

`IMPLEMENTATION PASS` is implementation evidence, not closure of a core
surface. Before closing Dashboard, Inbox, Today, Calendar, Portfolio, Health,
Fitness or Nutrition, read the active Surface Contract in `PRODUCT.md` and
`DESIGN.md`, then:

- inventory every visible control in the affected surface;
- directly click every control and prove its navigation or mutation;
- for writes, prove success/error feedback and reload-stable result;
- inspect card/overlay bounds, overlap and unjustified whitespace at the
  primary 4K CSS viewport and `1920×1080`, with Mobile guards;
- check browser console and hydration warnings/errors;
- capture a complete screenshot for each core surface at the primary viewport
  and `1920×1080`;
- run a V5 Design-Taste review.

Every promised core control must work, navigate to a real capability, or be
removed. `Prepared` is not an acceptable closure state without an explicit user
deferral. Final product/surface closure additionally requires `USER ACCEPTED`;
historical backend or browser evidence cannot substitute it.

## 9. Manual / Demo / Empty / Auth-Blocked

These modes must remain separate:

- **Manual:** real authenticated Supabase data and real writes;
- **Demo:** curated reference data, no real persistence claims;
- **Empty:** no demo leakage and no fake metrics;
- **Auth-blocked:** visible reason, no apparently functional writes.

Do not use Demo fixtures as fallback for Manual reads.

## 10. Testing and Validation

Use the smallest meaningful validation for the change.

### Always

```bash
git diff --check
pnpm typecheck
pnpm lint
```

For workstation doctor changes, also run the focused deterministic test and
both human/JSON CLI smoke forms:

```bash
pnpm test:workstation:doctor
pnpm workstation:doctor
pnpm --silent workstation:doctor -- --json
```

### When build/runtime or a major block closes

```bash
pnpm build
```

### When schema/backend changes

```bash
pnpm exec supabase db lint --local --level warning
pnpm exec supabase db advisors --local --type security --level warn --fail-on none
```

### When UI or a write flow changes

Run focused Playwright tests that:

- interact with the real control;
- use unique test data;
- assert within a concrete region;
- reload after writes;
- prove the result remains;
- avoid global text search as the sole proof.

Do not run broad unrelated greps for every small change. Run the focused regression scope for the approved Issue and its referenced block when applicable, plus a broader smoke at major block closure.

## 11. Capability Registry

When material feature work changes capability truth, update:

```text
docs/product/capability-registry.md
```

Use only these statuses:

- `CONNECTED`
- `CONNECTED_GAP`
- `UI_ONLY`
- `MODEL_ONLY`
- `NOT_STARTED`
- `EXTERNAL_GATE`
- `DECISION_REQUIRED`

Do not claim an entire surface as complete when visible capabilities remain UI-only.

## 12. Documentation Rule

Normal feature work should not create multiple scope/closure documents.

Do not create separate Epic, scope-lock or closure files for normal work. The approved Issue supplies the concrete work contract, `ROADMAP.md` supplies stable product scope/dependencies where applicable, and the Capability Registry records capability truth. GitHub Project status is the operative work status.

Create a dedicated document only when one of these applies:

- a new data model or migration needs a decision record;
- a security/privacy/external integration decision is required;
- a complex model, security or integration decision needs a persistent decision record;
- browser-proof details cannot be expressed by tests and the Capability Registry alone.

Roadmap history and QA documents are evidence, not active prioritization sources.

`ROADMAP.md` changes when the product plan, permanent order, dependency, material functional scope or current product context changes. Its current context may explicitly be Product Reorientation; an approved delivery block is optional and follows accepted product direction. Do not mirror normal Issue/Project status transitions into `ROADMAP.md` and do not turn the roadmap into a proof log.

## 13. Protected Paths

Do not read, modify, stage or print unless the user explicitly authorizes it:

```text
.env
.env.local
.env.*.local
.local/**
private/**
backups/**
exports/**
docs/product/life-os-full-roadmap-checklist.md
```

Do not stage generated or sensitive artifacts:

```text
next-env.d.ts
supabase/.temp/**
supabase/.branches/**
*.dump
*.backup
*.sql.gz
```

Do not delete or move files without explicit confirmation.

## 14. External Tools and Providers

- Playwright MCP: allowed later for local browser diagnosis under a scoped config.
- Next DevTools MCP: allowed later for local runtime diagnosis.
- Figma MCP: read/review-scoped unless write access is explicitly approved.
- Supabase MCP: not required; CLI and migrations remain canonical.
- DeepSeek or another runtime provider: server-only, confirmed tools, no direct database access.
- Garmin, Weather, GitHub and other external APIs require their own decision/security scope.

## 15. Completion Gate

Before calling delegated work complete, confirm:

- the approved Issue outcome or work-type-specific result is met;
- visible controls work or are honestly deferred;
- backend/auth/validation/ownership are correct;
- dependent read models are updated;
- Manual/Demo/Empty/Auth-blocked are correct;
- write flows survive reload;
- focused browser proof is green;
- every visible control was inventoried and current browser-proven where a
  core surface is in scope;
- console/hydration is clean and full-surface screenshots plus bounds/
  whitespace review meet the Surface Acceptance Gate where applicable;
- `USER ACCEPTED` exists for final core-surface/product closure;
- required checks are green;
- Capability Registry is updated;
- the diff contains only the approved Issue scope;
- a coherent commit was created.

Output one of:

```text
PASS
PASS_WITH_DEFERRED
BLOCKED
```

`PASS_WITH_DEFERRED` is acceptable only when the delivered capability is complete and the deferred items are separate future capabilities.

## 16. Standard Report

Keep handoff concise and reference the persisted Issue/PR evidence instead of repeating session history:

```text
Status: READY_FOR_REVIEW | PARTIAL | BLOCKED | DECISION_REQUIRED
Result:
References:
Revision:
Checks/Evidence:
Open:
Next action:
```
