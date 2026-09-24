# Issue #33 — synthetic local runtime experiment

This experiment compares a file-backed SQLite process (`node:sqlite` on Node
22.22.2) with file-backed PGlite 0.5.8. It does not change Life OS runtime,
schema, authentication, repositories, or personal data. The proof creates only
synthetic databases under `/private/tmp/life-os-33-proof/`.

## Result

**SQLITE_VIABLE** and **PGLITE_VIABLE** for the isolated single-owner database
slice. Both pass the Task/Project/Goal, write, dependency and Today-like-read
proof without Docker and with one Node process. These are candidate viability
findings, not acceptance of a migrated Life OS app or its combined operating
budget. **Recommended runtime target: SQLite**, because it has the lower
steady resource cost, faster representative reads and much smaller on-disk
footprint. Its substantially higher SQL/constraint migration cost must be
accepted and proven before any migration. PGlite is the lower-rewrite fallback
if the complete app cannot safely be ported to SQLite.

## Measured resource table

Host: macOS 27.0, arm64, 48 GiB RAM. Node 22.22.2; SQLite 3.51.2;
PGlite 0.5.8 / PostgreSQL 18.3 WASM. Each row is one fresh measurement process
against its own already seeded, persistent database; each process contains only
the DB proof, no Next server or browser. Read latency is the Today-like query;
write latency is a Task insert. CPU is percent of one core over 30 seconds idle.

| Metric | SQLite | PGlite |
| --- | ---: | ---: |
| Node processes / Docker processes | 1 / 0 | 1 / 0 |
| Startup to first read | 1.5 ms | 150.7 ms |
| RSS after 50 warm reads | 45.5 MiB | 345.8 MiB |
| Separate idle diagnostic, 180 s after 50 warm reads | — | 66.1 MiB |
| Idle CPU | 0.09% | 0.15% |
| 10 min navigation samples | 599 | 596 |
| RSS after 10 min navigation | 52.0 MiB | 102.0 MiB |
| Peak RSS during navigation | 52.0 MiB | 331.8 MiB |
| Today-like read p50 / p95 | 0.73 / 1.231 ms | 4.55 / 5.654 ms |
| Task insert p50 / p95 | 0.218 / 0.579 ms | 0.26 / 1.345 ms |
| Logical DB bytes after 30 inserts | 196,608 | 40,296,543 |
| Allocated disk after clean close | 256 KiB | 39,500 KiB |

The PGlite process fell from roughly 330–346 MiB shortly after warmup to about
100–102 MiB later in the navigation window. In a second fresh process, with
no navigation after 50 warm reads, RSS was 346.0, 337.6, 337.6, 337.6, 286.3,
66.1 and 66.1 MiB at 0, 30, 60, 90, 120, 150 and 180 seconds. The table
deliberately retains both the early idle sample and navigation peak. The cause
of the release was not instrumented; treating it as transient initialization
memory is an inference. Neither candidate's combined
Next.js plus database RSS was measured, so the Issue's server budgets are not
proven for a complete app.

## Scope and method

The baseline is `main` at `c0be522e657b419f3878e4005c41c5aaa2877541`.
The sample contains 10 Goals, 20 Projects, 300 Tasks, and one Task Dependency.
Both engines perform a parameterized Task write and a Today-like Task projection
with Project/Goal titles and dependency blockers. Both reject completion of a
blocked successor, reject a cycle, then permit completion after the predecessor
is completed. The PGlite path loads the actual R2-10 Dependency trigger and
graph-read function from `supabase/migrations/20260909174436_r2_10_task_dependencies.sql`
against a reduced synthetic schema. Its `auth.uid()` is a proof-only fixed owner.
The SQLite path implements corresponding constraints and triggers explicitly.

Each candidate is first seeded and closed. A new Node process then opens the
persisted database. `startupMs` ends after the first Today-like read. After 50
warm reads, idle CPU is sampled for 30 seconds. Navigation repeatedly executes
the Today-like read and Project/Goal detail reads once per second for ten minutes.
RSS is sampled from the Node process; 30 Task inserts then provide write latency.
The DB footprint is measured on disk after clean close. Read/write latency is
per SQL operation, not an HTTP/browser interaction. No IDE, Docker, Next dev
server, Supabase process, user data, or production database is involved.

Reproduce from the repository root with an isolated dependency directory:

```sh
mkdir -p /private/tmp/life-os-33-proof
pnpm --dir /private/tmp/life-os-33-proof add @electric-sql/pglite@0.5.8
cp experiments/issue-33/proof.mjs /private/tmp/life-os-33-proof/proof.mjs
node /private/tmp/life-os-33-proof/proof.mjs setup sqlite /private/tmp/life-os-33-proof/sqlite-NEW.db
node /private/tmp/life-os-33-proof/proof.mjs measure sqlite /private/tmp/life-os-33-proof/sqlite-NEW.db 600
node /private/tmp/life-os-33-proof/proof.mjs setup pglite /private/tmp/life-os-33-proof/pglite-NEW
node /private/tmp/life-os-33-proof/proof.mjs measure pglite /private/tmp/life-os-33-proof/pglite-NEW 600
node /private/tmp/life-os-33-proof/proof.mjs idle pglite /private/tmp/life-os-33-proof/pglite-NEW 180
```

Use fresh path names; the script never removes an existing database. `node:sqlite`
is still experimental in the measured Node version.

## Current coupling and compatibility

| Boundary | SQLite | PGlite |
| --- | --- | --- |
| Supabase Auth / `getUser()` | Replace with a fixed, server-side local owner and local-only access boundary. | Same replacement. |
| Supabase PostgREST query client | Rewrite repository implementations as parameterized native SQL. | Rewrite repository implementations as parameterized PGlite SQL. |
| PostgreSQL RPCs | Re-express as transactional application commands and/or SQLite triggers. | PL/pgSQL can be retained selectively, but calls must use SQL rather than `client.rpc`; auth/role assumptions need adaptation. |
| RLS / `auth.uid()` | No native PostgreSQL RLS; preserve explicit owner predicates, FK/trigger guards, single-owner file permissions, and tests. | PostgreSQL RLS syntax is available, but Supabase identity/roles are absent; prove a safe fixed-owner or explicit predicate model before adoption. |
| Triggers / constraints | Rebuild in SQLite dialect; recursive graph, coupled completion, lifecycle, partial indexes and FK behavior need focused proofs. | Representative R2-10 trigger/function code ran after a synthetic auth shim and removal of Supabase grants/RLS statements; full schema compatibility is unproven. |
| PostgreSQL DDL | Port enums, UUID/timestamptz, JSONB, PL/pgSQL, roles, `auth.users`, grants, and deferrable behavior; map with semantic tests. | Most PostgreSQL constructs are candidates for reuse; extensions, Supabase-owned schemas/roles, all 53 migrations and concurrency semantics still need an audit. |
| Domain / Zod / UI | Preserve domain semantics, Zod schemas, route composition and most server-action orchestration. | Same. |

The real R2-10 `read_task_dependency_graph()` loaded into PGlite returned 330
synthetic Tasks and the expected Dependency after measured writes. A separate
disposable PGlite instance successfully created `pgcrypto`. No full Supabase
migration was replayed; neither result proves that the complete schema or its
role/security model is portable unchanged.

The current source has 53 migration files and 41 Supabase repository files.
Across migration history there are 77 PostgreSQL function declarations, 57
trigger declarations, 165 policy declarations and 277 `auth.uid()` references;
these are source occurrences, not distinct live database objects. Repository
call sites reference at least 25 RPC names. The Task action's auth/context and
repository factory imports are bound to Supabase, while its Zod validation,
visibility of errors and route revalidation are reusable. The pure
`task-dependencies.ts` projection is reusable; DB enforcement remains essential
under races and source-linked completion.

## Reusable layers

- The feature-local domain types and pure projections, including
  `src/features/real-data/domain/task-dependencies.ts`, keep their semantics.
- The 40 Zod schema files can largely continue validating commands. Fixed local
  identity and profile assumptions need targeted changes, not a replacement of
  validation as a whole.
- Server Components, UI flows, route revalidation and most action-level command
  orchestration remain useful. The 24 action files need an auth/context audit;
  imports of Supabase clients/factories and direct `.from()` calls change.
- The 21 mapper files can inform row-to-domain mapping. DB row types and
  generated Supabase types need regeneration or replacement per chosen driver.

## Required rewrites and validation impact

1. Replace `src/lib/supabase/server.ts`, sign-in/out actions and Manual-profile
   auth gating with a strictly local owner boundary. Retain server-side command
   validation, visible errors and separation of Manual/Demo/Empty states.
2. Implement native SQL repositories behind existing feature-local interfaces;
   audit all 41 Supabase repository files and direct query sites in actions/read
   models. PGlite does not implement the current `.from()`/`.rpc()` client API.
3. Port database invariants. For SQLite this includes all used PostgreSQL
   functions and relevant triggers, types, grants/RLS assumptions, composite
   ownership FKs, soft archive guards, source-linked atomic writes and Goal
   command history. For PGlite, retain proven PostgreSQL functions/triggers
   where possible, but replace Supabase `auth.users`, roles, grants, auth and
   transport assumptions.
4. Rebuild the DB integration harness: the 13 files under `tests/supabase/`
   include dependency concurrency, Goal ledger and coupled source-completion
   proofs. Pure domain tests should remain; affected browser setup and reload
   tests need a new local fixture path. Do not infer full correctness from this
   small proof.

## Risks and unknowns

- The experiment does not run the full Next.js production server or a real
  browser. App startup, full Dashboard/Today navigation, Next worker/process
  behavior and the combined 350/600/700 MiB operating budgets remain unproven.
- The proof has one writer and one connection. It does not prove race safety,
  crash recovery, concurrent requests, SQLite WAL checkpoint behavior or
  PGlite's single-connection latency under real UI load. PGlite's Next.js
  bundling also needs a separate build check; its documentation calls for
  `transpilePackages` configuration.
- SQLite foreign-key enforcement must be enabled on each connection; the
  proof does this. Its WAL permits readers alongside one writer, which is not
  a substitute for the missing coupled-write/concurrency proofs.
- A fixed local owner removes interactive login only if the server binds to
  loopback, database files have restrictive OS permissions, and untrusted local
  or remote callers cannot issue writes. No production security contract is
  changed here.
- `node:sqlite` is experimental in Node 22.22.2. A production SQLite driver
  and pinned Node runtime require separate evaluation.
- The existing active contracts explicitly bind PostgreSQL, Supabase Auth and
  RLS. Any adoption needs a separately accepted architecture, data and
  security revision before code or personal data is migrated.

PGlite officially supports filesystem persistence and PL/pgSQL, but only one
exclusive connection per instance. The measured `node:sqlite` driver provides
a synchronous API. These properties need an app-level concurrency check before
a production choice. References: [PGlite FS](https://pglite.dev/docs/filesystems),
[PGlite PL/pgSQL](https://pglite.dev/examples),
[PGlite connection model](https://pglite.dev/docs/),
[PGlite bundler guidance](https://pglite.dev/docs/bundler-support),
[Node SQLite API](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html),
[SQLite foreign keys](https://www.sqlite.org/foreignkeys.html),
[SQLite WAL](https://www.sqlite.org/wal.html).

## Migration strategy and data preservation

1. Leave the canonical Supabase database and Docker volumes untouched. Define a
   versioned target schema and prove every invariant with synthetic cases first.
2. After explicit migration authorization, take a user-controlled consistent
   read-only export/backup. Record counts, stable IDs, checksums and the schema
   version; preserve source bytes and a rollback path.
3. Import into a new local database in dependency order while preserving IDs,
   `user_id`, timestamps, soft archive and history. Validate foreign links,
   Task graph cycles/blocked completion, Goal outcome history, source-linked
   writes, and representative Today/Dashboard read models.
4. Run the new app against the imported copy and compare scoped projections.
   Switch only after user acceptance; retain the untouched original until
   recovery and repeated normal-use proof pass.

No step above is executed by this experiment.

## Checks and evidence

- Both setup runs: 10 Goals, 20 Projects, 300 Tasks, one Dependency; blocked
  completion, cycle rejection and completion after predecessor all passed.
- SQLite and PGlite: separate ten-minute navigation runs completed, followed
  by 30 measured Task writes. PGlite also completed the 180-second idle probe.
- Independent OS `ps` samples confirmed one Node process per run and the same
  order of RSS as the in-process measurements.
- PGlite's retained R2-10 graph function returned 330 Tasks and one Dependency;
  a separate synthetic PGlite instance loaded `pgcrypto`.
- `node --check experiments/issue-33/proof.mjs`, `git diff --check`, staged
  diff check, `pnpm typecheck` and `pnpm lint` passed. Build, browser and
  Supabase tests were not run: no product runtime, UI, production schema or
  authenticated flow changed, and this proof deliberately has no full app.

## Next action

Review the recommendation and authorize a separate architecture/security and
data-preservation contract for a production-like SQLite spike before any real
repository migration or user-data transfer. That spike must measure the whole
Next.js app, prove the 350/600/700 MiB budgets and all current graph, Goal
history and source-linked invariants, and keep the original data untouched.
