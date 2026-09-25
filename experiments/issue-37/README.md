# Issue #37 — synthetic whole-app SQLite proof

Baseline: `main` `4343ce7b87c086c6e17c4e9e7df3a80b05708434`. This is a guarded experiment for the real Next.js production application and its core Project-to-Day spine. It does not migrate Life OS, read personal data, deploy a host, change the normal Supabase runtime, or select a final production driver/auth method.

## Result

| Gate | Finding |
| --- | --- |
| SQLite whole-app candidate | `SQLITE_WHOLE_APP_VIABLE` for the measured core spine, not the complete feature set or a production architecture acceptance |
| Resource budget | `RESOURCE_BUDGET_PASS` for the 601-second measured run |
| Concurrency | `CONCURRENCY_PASS` for the nine representative synthetic invariants below |
| Recovery | `RECOVERY_PASS` for an abrupt Next process kill, restart, checkpoint, backup, restore and route comparison |
| Hosted owner boundary | `HOSTED_OWNER_BOUNDARY_READY` as a proof seam only; final hosted authentication remains undecided |
| PGlite fallback | `PGLITE_FALLBACK_NOT_TRIGGERED`; SQLite has not hit a defined material blocker in this bounded proof |

## Exact topology

- The measured application is `next build` plus `next start` bound to `127.0.0.1`, with a dedicated Playwright Chromium instance. No dev server, Docker or Supabase process is launched by the experiment.
- The branch adds an experiment-only SQLite schema, fixture, invariant/recovery/measurement harness and a reversible `LIFE_OS_37_PROOF=1` switch. The switch also requires production mode, a `.db` path under `/private/tmp/life-os-37-proof/`, a proof token and a loopback Host. It is off by default.
- The existing Dashboard, Today, Calendar, Portfolio and Entity Workbench UI are used. Guarded server read branches map synthetic SQLite rows through existing domain mappers/projections. Task create/update/complete/reopen uses the existing Server Action and Zod path, with transactional SQLite commands at the repository seam. Project and Goal planning are read through their existing detail UI.
- The SQLite connection runs with `foreign_keys=ON`, `journal_mode=WAL` and `busy_timeout=5000`. The disposable schema version is `PRAGMA user_version=37`. Every command uses the owner derived by the server; form-supplied `userId` is ignored.
- Unsupported proof operations fail closed. All other product runtime behavior remains on the existing Supabase branch. The experiment route `/api/issue-37/crash` is unavailable when the proof switch is off.

## Browser routes and flows

The focused browser harness exercised `/dashboard`, `/today`, `/calendar`, `/portfolio`, one Task detail, one Project detail and one Goal detail. Authorized pages showed synthetic SQLite data; the same seven routes with no proof-owner context showed no synthetic Manual data. It created a Task, updated its title, completed and reopened it, and confirmed both states after reload. It created a Project-linked Task from Project Detail and a direct Goal-linked Task, then read each from its owning detail. Console/page errors: zero. The Goal's *Arbeit* view is the relevant read of direct tasks; its overview intentionally summarizes rather than listing each Task.

## Resource measurements

Host: macOS Darwin 27.0.0, arm64, 48 GiB RAM; Node 22.22.2. The 601.4-second run measures the actual production server and a dedicated browser process tree after seven-route warmup. It completed 119 full navigations. Server RSS includes the embedded database. Browser RSS is a best-effort sum of Chromium's dedicated process tree; macOS RSS sums can double-count shared mappings. Build/test processes are excluded. Native SQLite SQL latencies are measured after the app is stopped and are identified separately from HTTP/UI timings.

| Metric | Measured | Target |
| --- | ---: | ---: |
| Server/DB processes; browser processes; Docker processes spawned | 1; 5; 0 | 1; browser; 0 |
| Cold start to usable Dashboard | 377.5 ms | <= 5 s |
| Server RSS after warmup / after 60 s idle | 233.0 / 198.9 MiB | idle <= 350 MiB |
| Server RSS after 10 min navigation / sampled peak | 244.9 / 248.0 MiB | navigation <= 600 MiB; app+DB <= 700 MiB |
| Browser RSS after warmup / after navigation / sampled peak | 502.9 / 490.2 / 512.9 MiB | best-effort attribution |
| Combined sampled peak server + browser RSS | 760.7 MiB | aspirational < 1 GiB |
| Server idle CPU, 60 s | 0.49% of one core | target <= 1%; hard <= 2% |
| Browser idle CPU, 60 s; combined | 0.41%; 0.90% | combined <= 3% of one core |
| Navigation average / sampled peak CPU, server | 1.91% / 4.15% of one core | observe |
| Navigation average / sampled peak CPU, browser | 3.25% / 4.95% of one core | observe |
| Browser navigation p50 / p95 | 39.15 / 52.00 ms | observe |
| HTTP read p50 / p95 | 11.09 / 18.58 ms | observe |
| UI Task create p50 / p95 | 36.32 / 45.28 ms | observe |
| Native SQLite read p50 / p95 | 0.01 / 0.02 ms | observe |
| Native SQLite write p50 / p95 | 0.07 / 0.11 ms | observe |
| DB / WAL / SHM bytes after writes, before clean close | 245,760 / 556,232 / 32,768 | observe |
| DB / WAL / SHM bytes after close | 274,432 / 0 / 0 | observe |

The 60-second idle trace saw 82 requests in its first five seconds and zero in each of the following eleven five-second windows. These were one-time Next link prefetches (most often Nutrition and Portfolio), not a repeating idle polling loop. The initial full measurement attempt was discarded: its harness read a streaming detail placeholder before the server component had rendered. A 140-navigation focused check passed after the harness waited for visible synthetic content. Only the corrected, uninterrupted ten-minute run is used for the final budget result. The browser's five-process RSS delta is attributable to a dedicated Chromium launch, but RSS double counting and shared-memory attribution make the combined 760.7 MiB an estimate rather than private-memory accounting.

## Concurrency and invariant matrix

The harness uses the same SQLite schema and independent OS processes/connections for races. `BEGIN IMMEDIATE` serializes writers, while composite foreign keys and triggers reject invalid persisted states. UI availability is not the enforcement boundary.

| Scenario | Result |
| --- | --- |
| Dependency cycle | Rejected by recursive graph trigger |
| Blocked successor completion | Rejected by completion trigger |
| Completion after predecessor | Accepted, including atomic source + Task completion |
| Concurrent opposing dependency edges | First commits; second rejects cycle after lock release |
| Concurrent predecessor reopen and successor completion | Reopen commits; stale successor completion rejects; both remain planned |
| Owner/Project edge consistency | Wrong owner and cross-Project edges reject |
| Blocked source-linked completion | Source update and Task update in one transaction roll back together |
| PP1 representative Goal path | Criterion evaluation/correction, milestone achievement/amendment, Goal achievement/amendment/reopen and evidence snapshot append as history; old rows cannot update/delete |
| Idempotent retry | Same command ID/fingerprint returns one event, changed fingerprint rejects; concurrent same-ID Goal commands return one canonical event |

The Goal command in this harness is a **synthetic equivalent slice**, not a port of every branch of `execute_goal_command`. It proves the stated append-only/correction/reopen/idempotency cases under SQLite; exhaustive PP1 compatibility remains a later migration gate.

## Crash, WAL, backup and restore

The recovery harness starts the real Next production process on a fresh synthetic DB, commits a controlled Task write, begins another transaction through the guarded proof route, then sends `SIGKILL` after an insert but before commit. On restart the committed Task remained, the interrupted Task was absent, `integrity_check` was `ok`, `foreign_key_check` was empty and Dashboard/Today/Portfolio/Task/Project/Goal routes served. It ran `wal_checkpoint(TRUNCATE)` with `busy=0`, took a consistent backup with Node's SQLite backup API, copied that backup to a separate disposable restore location, and compared schema hash/version, row counts, stable IDs and representative projection hashes. The original and restored databases both served the six checked routes. Counts after the crash: one Owner, four Goals, four Projects, 81 Tasks, one Dependency and one linked source. Schema SHA-256: `4b575aa077a0a393c21faad089331fb690e346d773ade704842f57d983119f7d`; projection SHA-256: `4cd368ebe5e0a2b420d9daeb5459307bdfbcad46709afc6b8bd0ede5ee2a4f74` in both locations.

The DB is explicitly WAL-backed. The tested route holds the SQLite transaction inside the real Next process. The backup is made from an opened SQLite connection, not by copying a live `.db` file.

## Owner and security boundary

`getProofOwnerId()` validates a proof-only, HttpOnly cookie against an environment token on a loopback request, then returns the sole synthetic owner ID. No browser-supplied owner ID reaches the commands: a forged `userId` field in a real Task form still produced a row owned by the server-derived Owner. Unauthenticated Manual reads return empty/auth-blocked states and writes return blocked results; the anonymous Task-create form is absent. Project/Goal relation checks are server-side; DB foreign keys/triggers enforce owner and Project consistency; Zod remains in the Task action path; no Service Role or browser DB credential is introduced. The DB path was absent from the seven HTML responses and a direct file-path request returned 404. With the switch off, the default Dashboard served without synthetic data and the crash route returned 404.

This is **not production authentication**. The final hosted choice must decide owner login, session revocation, remote network boundary, CSRF and secret storage. The proof token and fixed owner must never be deployed as a hosted access model.

## Compatibility and rewrites

The reusable layers are the Task/Project/Goal domain mappers and projections, Server Components, Task Zod schemas, Server Action orchestration and the existing route/UI composition. Native SQLite requires an alternate repository/command implementation for Supabase PostgREST and RPCs, PostgreSQL trigger/function/DDL translation, ownership predicates and equivalent constraints instead of RLS, plus recovery/backup operations. The proof preserves these boundaries for only the measured core spine. Other Manual domains and many Goal/Project writes remain unsupported under the switch; the default Supabase runtime still owns them. `node:sqlite` on Node 22.22.2 is experimental and is not accepted as the final production driver.

PGlite was not rerun because SQLite met the defined blocking dimensions in this bounded experiment. Issue #33 remains the isolated fallback evidence. Neither candidate has a final hosted persistence, auth or personal-data migration approval.

## Reproduction

Use fresh names every run; the scripts reject an existing DB and never reset, delete or read a canonical database. From the repository root:

```sh
pnpm typecheck
pnpm lint
pnpm build
node experiments/issue-37/invariants.mjs /private/tmp/life-os-37-proof/invariants-NEW.db
node experiments/issue-37/recovery.mjs /private/tmp/life-os-37-proof/recovery-NEW.db /private/tmp/life-os-37-proof/backup-NEW.db /private/tmp/life-os-37-proof/restore-NEW.db /private/tmp/life-os-37-proof/crash-NEW.json
node experiments/issue-37/measure.mjs /private/tmp/life-os-37-proof/measure-NEW.db 600
```

For the focused browser flow, seed another disposable DB with `fixture.mjs setup`, start `next start` bound to loopback with the three `LIFE_OS_37_*` proof environment variables, then run `browser-proof.mjs` with the matching `LIFE_OS_37_OWNER_TOKEN`. No `.env` or personal profile file is part of the proof.

## Decision boundary

The bounded experiment recommends SQLite as the preferred candidate for a **separate** architecture/security/data decision, not a cutover. That later decision must choose a supported driver, exact hosted auth and session/network policy, durable volume and backup/recovery objectives, full feature/PP1 compatibility scope, user-data comparison and rollback contract. No personal data, Docker volume, remote service, production migration or deployment was touched here.
