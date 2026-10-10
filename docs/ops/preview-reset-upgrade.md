# Personal Preview reset and v2 operator upgrade — #142

This runbook describes the reviewed code candidate for the USER-accepted
[#141 A1/D1/D2/D3 target](https://github.com/Planton361/life-os/issues/141#issuecomment-6087673972).
**NOT ACTIVE.** Authoring/testing this procedure does not authorize executing it
against the installed worker or personal database. The feature is deliberately
unavailable to standard production/Hosted/Supabase builds.

## Required deployment gate

1. CONTROL code/security review of #142; USER owns the final M0 merge.
2. Verify current protected `main`, its exact SHA push `quality` success and
   strict Ruleset/PR protection. PR CI alone does not authorize provisioning.
3. Obtain a separate explicit CONTROL operator checkpoint for that exact SHA,
   existing private instance, downtime, forward migration and recovery evidence.
   Recheck live main/CI/one writer immediately before the operation. No live
   provisioning, backup, migration or reset was performed for this PR.
4. An operator may then explicitly invoke the merged script with pinned Node
   24.21.0, `node scripts/ops/preview-cd.mjs upgrade-existing
<existing-private-root> <clean-merged-main-source> <exact-main-SHA>`.
   This is a future procedure, not an instruction to run it during code review.
   It requires macOS, the existing fixed launchd identity and private 0700 root.
   Do not patch config, change gateway headers, or bypass a frozen-worker conflict.

`upgrade-existing` verifies merged-source provenance, exact main push Quality,
Ruleset, gateway fingerprint and database device/inode. It builds two independent
schema-v10 Preview releases from the same verified source **before stopping** the
old service. The fallback is independently built and preflighted; it is not the
old v9 binary. A durable `release-prepared` checkpoint retains the old worker
configuration, state and plist before stopping its owned service. A worker lease
and free-service proof exclude overlapping cooperating writers.

All native helper subprocesses resolve TypeScript, the SQLite driver and runtime
modules from verified built releases, never from the clean source checkout.
The installed v9 release is dependency-probed before building; both independent
v10 releases are probed (including loading the native driver in memory) before
stopping the old preview. Recovery repeats these probes before stopping.

After `launchctl bootout`, the operator separately waits for the attributed
supervisor process to exit, its launchd job to disappear, its exclusive Worker
lease to be released, and the app port/canonical writer to be free. The wait has
a 30-second deadline with bounded OS identity/holder probes. During shutdown the
job can remain visible after bootout returns; it is never assumed to have exited.
The operator verifies the recorded process identity and refuses a replacement
supervisor, foreign lease holder or canonical DB handle. Only then does it take
the Worker lease and recheck the released topology. No PID is killed and no lease
file is removed by this handoff.

Stop, port/free and lease failures are inside the schema-aware recovery boundary.
On confirmed v9, a still-registered, strictly verified healthy original service is
preserved without rewriting its live state or bootstrapping again. If it has fully
stopped and the operator can prove/hold the free Worker lease, the latest confirmed
cursor/pending prefix is captured before saving `aborted-v9` and restoring v1.
A lingering supervisor, timeout, foreign writer or ambiguous OS/schema state
retains the incomplete checkpoint and fails closed; no unsafe bootstrap or
automatic second operator attempt occurs. On confirmed v10, failure retains a
v10-only recovery checkpoint and never restores v9. The same handoff applies to
normal upgrade, explicit re-attempt and separately authorized existing recovery.

After stopping and acquiring the worker lease, the operator rereads the final
worker state. It persists the actual confirmed `commandOffset`, `autoEnabled`
and a digest of the consumed command-log prefix before backup or migration.
This includes commands processed during either build. Backup checkpoints merge
with this snapshot; publication and v10 recovery preserve its cursor and pause
state. Consumed rollback/disable/enable/retry commands are never queued again.

Pending log entries or unresolved rollback/transition intent deny the handoff.
The log must be complete, valid and retain the confirmed prefix. Before schema
commit, failure restores the latest v9 state and leaves pending commands for
the old worker to consume once. Handoff guards run before migration, publication
and completion. After v10 commit, pending or changed intent keeps recovery fail
closed: do not reinterpret an old pending rollback against the new release pair,
truncate the log or advance the cursor manually. Reconciling such intent requires
an explicit CONTROL operator decision. Commands appended after the final handoff
check are future v2 commands. This is an operator cutover boundary, not permission
for concurrent command submission during upgrade.

The v9 handoff is explicitly bound to the approved historical release
`6705607afa033e555b800901366837d6bbef73a2`. The frozen v1 fingerprint recipe,
expected fingerprint and shipped source inventory are sealed in
`scripts/ops/preview-v9-contract.mjs`; original worker/launcher/helper bytes are
also checked against that history. Its real manifest and BUILD_ID must match,
including for a caller-supplied `legacy` flag. This path does not infer v9 from
missing files, suppress ENOENT, import an unverified old validator, or relax the
current v10 fingerprint. Other historical SHAs/bootstrap releases or changed/mixed
source require an explicitly reviewed contract; they are refused before build/
stop, and the current lastGood is rechecked after builds before stopping.

Only v9 admission, backup and precommit restore call the dedicated historical
preflight, which requires the original schema v9, owner/profile/readiness,
integrity/FKs, aggregates, exact historical table/index/trigger definitions and
configured DB device/inode. Restore verifies source,
command-log prefix, database and released canonical writer lease before writing the saved configuration/plist or
releasing the worker lease and re-registering the old service. On schema v10 the
v9 verifier denies bootstrap; committed recovery retains full v10 validation.

A private, lease-protected SQLite backup preserves v9. Its old-release preflight
must pass. A second disposable clone is forward-migrated and checked against both
v10 releases. No active backup is restored and no data is reset. After persisting
the backup/recovery checkpoint, the new worker plist is armed but cannot supervise
while an upgrade journal is incomplete. The exact main gate is checked again.
Only then does the synchronous v9→v10 migration update the **same** database file.
It checks the exact 83-table/schema definition, owner/readiness, all unchanged row
values, 46 guard definitions, indexes, integrity/FKs and aggregates. Startup never
migrates automatically. Device/inode, owner and gateway remain unchanged.

The operator publishes the separately versioned grant and compatible last-good
pair, proves candidate health with one supervised writer, and selects the
compatible fallback if candidate health fails. Only a completed journal permits
normal v2 supervision. Future ordinary releases still pass exact-main CI and the
expanded compatibility fingerprint; another schema/security contract change
blocks deployment rather than implicitly migrating. Existing pause/retry,
login/wake, shutdown and app-only rollback policies remain in force.

## Recovery boundaries

### Explicit re-attempt after restored v9

An existing `aborted-v9` journal still blocks generic `upgrade-existing`.
Do not delete, rename, truncate or patch that journal manually. After a separate
exact-main post-merge CONTROL operator authorization, the operator can explicitly
invoke `node scripts/ops/preview-cd.mjs reattempt-existing <private-root>
<clean-merged-main-source> <exact-main-SHA> <original-journal-SHA256>`.
The last argument acknowledges the exact original journal bytes, not a reset or
general recovery permission. The verified checkout must contain the journal
revision's Git ancestry; unavailable history fails closed. This PR authorizes
only isolated code tests, not this invocation against the personal installation.

Admission requires journal version 2/`aborted-v9`, a complete stopped checkpoint,
v4 instance identity, recorded compatible-pair metadata/source, original v1
worker and pinned v9 release, byte-identical original config/plist, unchanged
confirmed cursor/prefix/autoEnabled and no pending commands, rollback or transition.
The journal SHA must be an ancestor of current approved main. Native read-only
verification requires schema v9, historical guards/indexes, owner/profile/readiness,
integrity/FKs and unchanged device/inode. Any recorded owner must match; the
canonical verified owner is also pinned in the new acknowledgement for subsequent
crash/re-attempt checks. The original launchd supervisor, its sole child server,
localhost listener, canonical writer and worker leases must be attributed to the
same original service; authenticated Tailscale/build health and gateway are checked.
A foreign process with the DB open, schema v10, unknown release, changed checkpoint
or failed current main/Quality/Ruleset gate prevents acknowledgement and stop.

### Public GitHub request budget

The operator uses the unchanged unauthenticated REST GitHubGate; it never caches
CI, job or ruleset responses. With one active branch ruleset, the explicit
re-attempt makes **24 requests before schema commit**, previously 48:

| Authorization point                                         | Requests | Fresh evidence                                                     |
| ----------------------------------------------------------- | -------: | ------------------------------------------------------------------ |
| Host entry, before operator lease                           |        5 | push Quality, latest-attempt job, ruleset list/details, exact main |
| Aborted-journal verification start                          |        1 | exact main plus local gates                                        |
| Verification completion, before acknowledgement             |        5 | full gate plus local gates                                         |
| Before both builds                                          |        1 | exact main plus local gates                                        |
| After both builds, before read-only checkpoint verification |        1 | exact main plus local gates                                        |
| Original-checkpoint verification start                      |        1 | exact main plus local gates                                        |
| Verification completion, before `release-prepared`          |        5 | full gate plus local gates                                         |
| Immediately before schema commit                            |        5 | full gate plus local gates                                         |

The complete post-build gate occurs at the **end** of the original-checkpoint
verification, before its first journal write/stop. A re-attempt cannot skip that
verifier. Ordinary upgrades instead run the complete gate immediately after
builds. The redundant leading main request is removed only from complete gates:
GitHubGate already rereads and validates exact main after fetching all proofs.
All eight authorizations still verify local source bytes/SHA, DB identity and
gateway. Unrecognized authorization stages fail closed.

Each additional active branch ruleset costs four more requests across these
four complete gates. A separately authorized existing recovery needs two complete
fresh gates (**10** requests with one ruleset); normal new-worker CI checks and
other same-IP traffic need additional reserve. These are counts, not a promise
of sufficient shared quota or an automatic retry. Check actual remaining/reset
read-only before any separately authorized personal operation. GitHub 403/429
fails immediately with no polling, credentials or bypass. Review/M0, exact-main
push Quality and a **new** explicit CONTROL operator authorization remain
mandatory; this code repair does not authorize a personal re-attempt.

All operator upgrade/recovery commands hold an independent kernel operator lease.
After these checks, the original bytes are retained under the private root as
`upgrade-v2.aborted-v9.<SHA256>.json`, mode 0400, single-link/canonical/owned,
exclusive-create, exact digest, file and directory `fsync`. Code never overwrites
an existing evidence archive. A durable version-2 `reattempt-v9` marker references
it and pins the native owner. This is immutable within the operator protocol;
same-UID administrators remain the documented trust boundary. No canonical DB,
WAL, writer lease, old release or backup is replaced/deleted by acknowledgement.

Crash after archive but before marker leaves the original aborted journal usable
by the same explicitly repeated command; crash after marker admits only the same
digest through this explicit gate, rechecking all live conditions. A changed or
partial archive fails closed, never silently repaired. Generic upgrade/recovery
does not consume this marker. Other existing phases are not re-attemptable.

The command then uses the normal fresh upgrade protocol: two independent newly
built v10 releases from current gated main, new backup/clone proofs, and the v9
restoration/v10 committed-recovery boundaries below. Old candidates are checked
only as journal provenance, never reused. Original v9 state is rechecked after
builds while still serving, before the new stopped checkpoint is written. Every
new journal retains its predecessor evidence reference. Build/gate failure keeps
the original v9 service running; precommit failure resumes v9 and creates a new
`aborted-v9` journal requiring its own digest acknowledgement. After a new
`release-prepared`/later checkpoint, use separately authorized schema-aware
recovery, not a forced re-attempt. No automatic retry or reset occurs.

Isolated regressions use the real archived v1/v9 source and a realistically
aborted private operator root. They cover generic refusal, strict negatives,
fresh independent fallback and native schema10 migration without data loss,
SIGKILL at both acknowledgement boundaries/operator-lease release, idempotent
explicit resume, and pre-build failure with old HTTP/native writer preserved.
The macOS process-attribution test uses a unique owned LaunchAgent, fixture
supervisor and ephemeral listener around the frozen native v9 runtime; it does
not run the installed original fixed-label/port3000 supervisor.

### Schema-aware existing recovery

- Failure before migration commit: verify actual schema v9, then restore the
  latest stopped worker/config/state; v9 recovery rereads it after stopping again.
  The database is not restored or reset.
- Lost migration response or committed schema v10: **never start a v9 release**.
  Keep the incomplete journal fail closed. After a new explicit operator gate,
  `recover-existing` verifies the actual schema and uses the preflighted v10
  fallback. It does not rerun reset or replace the database from backup.
- Crash during stop, arming, publishing or health proof leaves a durable recovery
  checkpoint. Incomplete journals block ordinary supervision. Unknown schema,
  changed gateway/main/provenance/identity or unavailable compatible fallback
  requires investigation and a new CONTROL decision; there is no forced restore.
- The v9 backup is retained privately for recovery investigation. Restoring it
  over the live database would discard later writes and needs its own explicit
  scope; this procedure never does that.

## Reset security and data boundary

A separate compile-time Preview composition plus dedicated server-only launcher
are necessary. A runtime environment flag, `sqlite-hosted`, Tailscale hostname,
profile cookie or copied grant alone cannot enable a standard build. The current
private grant binds worker/schema version 2/10, instance UUID, host/UID, DB
device/inode, metadata-derived owner and exact origin/login. Grant and database
files require 0600 inside 0700 directories, outside the repository, canonical
paths and no symlink/hardlink. The launcher binds its own PID/release/BUILD_ID.
Admission is an opaque in-process identity, never a client table/SQL/owner input.

Every Prepare/Execute/Receipt request independently verifies Manual mode,
current gateway authentication, fixed owner, Origin/Host/forwarded-host/site and
live grant. Execute input is strict Zod. Revocation is checked again before the
transaction commits. No grant, owner UUID, DB path or secret is sent to the UI.
The OS account/operator and stripped authenticated Tailscale headers are trusted
boundaries: these gates do not defend against an OS administrator or arbitrary
same-UID code able to rewrite the DB/worker/grant. A foreign cooperating writer
cannot obtain the kernel lease or forge a private reset admission. Direct hostile
file modification by the trusted filesystem owner is outside the web capability.

The fixed inventory is `previewResetTables` in
`src/features/real-data/sqlite/preview-reset-plan.ts`: exactly 82 of the canonical
83 business tables, with `profiles` unchanged. `areas` is included. Child-first
and fixed self-reference leaf deletion handle history, amendments, receipts,
RESTRICT and reciprocal FKs. FK enforcement stays ON; deferred FKs are checked
before commit. The single existing connection opens one immediate transaction.
Only its private synchronous reset window enables the 46 DELETE exceptions.
Owner DELETE, INSERT/UPDATE/history semantics remain enforced. Reset never drops
triggers/tables, executes client SQL, opens another writer, swaps the DB or
removes WAL/SHM/lease files. Schema changes occur only in the operator migration.

All table emptiness, profile/schema equality, integrity/FK and aggregate checks
must pass before the technical epoch/revision/receipt update commits. Any failure
rolls back both data and metadata. This is logical deletion, not secure erasure;
external files, backups, exports, demo fixtures and repository files are retained.

## Epoch, confirmation and replay

The rendered document captures `dataset_epoch` across client navigation. Preview
Server Action requests carry it in a same-origin header; all 203 FormData action
entries also strip and bind the technical hidden field before domain validation.
Missing, conflicting or old epochs fail closed at authentication and again inside
the writer transaction, including Create/Capture/Source/Retained commands. Native
forms without JavaScript transport are denied safely. Every normal committed
command increments `data_revision`. Stale submissions/poll/focus produce an
honest refresh notice; a full reload captures the new epoch. The notice cookie
is nonsecret presentation state and grants no write permission.

Prepare binds an opaque, single-use challenge (≤120 seconds) to owner/instance,
HttpOnly Secure SameSite Strict browser session, epoch and revision. Exact
`ZURÜCKSETZEN` is required. New writes invalidate an outstanding confirmation.
The persisted technical last receipt acknowledges the same command/session/
instance after lost responses, restart or fresh writes without another DELETE.
Older receipts superseded by a subsequent reset cannot execute without a new
valid challenge. The UI offers Cancel, pending lock, error, receipt check,
new preparation, success and explicit reload. Only the USER consciously performs
a real reset with this confirmed button after later provisioning.

## Evidence and repeatable validation

All tests use invented data in private disposable temp directories. The active
personal SQLite path, installed updater and private backup directories are never
read or targeted. Hosted/browser fixtures own ephemeral loopback ports; their
process-only test adapter never sends a request to personal port 3000. Its GET
mapping models the synthetic gateway's internal Next redirect, not real Tailscale
provisioning. CI executes both standard and Preview compositions at exact PR head.

- `pnpm exec vitest run --config tests/sqlite/application-vitest.config.mjs`:
  all-domain recovery plus completely filled 83/83 fixture (82 reset targets),
  every DELETE guard family, fixed self-reference history, matching counts/rows,
  schema/profile/inode preservation, faults after 1/15/30/45/all82 targets,
  schema/profile/receipt/revocation faults, epoch/revision/expiry/session and
  competing-reset denial, default-off/copied grant and mismatched private binding, symlink/hardlink
  permissions, synthetic dataset and foreign-process binding. Direct Action
  admission tests independently cover mode, gateway/Origin/site and strict input.
- `pnpm test:preview:cd`: existing worker policy/macOS isolated launchd fixtures,
  upgrade protocol faults, actual native v9 backup→clone→migration→compatible
  recovery proof, late/consumed/pending command-log handoffs and SIGKILL recovery,
  dependency probes plus backup/migration/owner helpers from a clean source
  without `node_modules`, single writer and SIGKILL during DELETE rollback.
  Historical-source regressions archive the real v1 SHA (including its absent
  newer Reset files), exercise the real backup/restore preflight helpers, a
  precommit failure with resumed ephemeral v9 HTTP/native writer, an owned unique
  macOS LaunchAgent bootstrap, schema10 refusal and committed v10 recovery.
  These owned fixtures do not start the fixed personal label or port 3000.
- Standard `pnpm build`, retired-runtime, framework shutdown, application and
  hosted smoke: generic Hosted auth/read/write and shutdown remain functional;
  standard composition has no Preview reset permission. The additional
  `issue-142-browser-proof.mjs --standard-negative` proof runs the compiled
  standard server with a copied grant/marker/runtime flag and denies UI plus
  all three direct real Reset Actions without changing fixture rows.
- `LIFE_OS_BUILD_COMPOSITION=personal-preview-v2 pnpm build`, followed by
  `node tests/sqlite/issue-142-browser-proof.mjs` **without inheriting that flag**:
  real Settings actions, strict confirmation, Cancel/Escape/focus/pending,
  3840×2160/1920×1080/1440×800/390×844 bounds, two browsers, stale Task/Notes/
  Journal/Health/Capture, fresh writes/reload, lost response plus receipt with new
  data retained, all-domain empty routes/deleted detail, Demo/Empty/no login/
  revoked grant and restart. Screenshots/proof are disposable test artifacts.

This is implementation/disposable validation evidence, not live installation,
personal-data acceptance, public-hosted readiness or final closure of the existing
core surfaces. CONTROL reviews the PR before USER M0; live upgrade remains gated.
