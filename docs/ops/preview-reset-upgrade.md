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

- Failure before migration commit: verify actual schema v9, then restore the
  checkpointed old worker/config/state. The database is not restored or reset.
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
  recovery proof, single writer and SIGKILL during DELETE rollback.
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
