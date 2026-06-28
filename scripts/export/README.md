# Life OS Export Skeleton

Status: placeholder only.

This directory documents the future local export shape for R1.9.2. It must not
contain real user exports, database dumps, secrets, tokens, `.env` values, or
private paths.

Current state:

- No export script is implemented.
- `export-manifest.example.json` is synthetic metadata only.
- Real output directories such as `exports/` and `backups/` are ignored by Git.

Future target:

- JSON Lines per MVP table for user data portability.
- `manifest.json` with export version, generated timestamp, table order, row
  counts, and checksums.
- Separate SQL/Postgres dump path for technical DB recovery.

See:

- `docs/security/backup-export-restore-strategy-r1-9-2.md`

Safety:

- Do not write actual export outputs under `scripts/export/`.
- Do not commit `*.jsonl`, `*.dump`, `*.sql.gz`, or `*.backup` files.
- Do not use a service role key in local export tooling without a separate
  reviewed security scope.
